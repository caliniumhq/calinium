'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest, deriveStoreSelectionSignals } = require('./contracts');
const { loadArchitectureRegistry } = require('./architecture-registry');
const { solveArchitectureCompatibility } = require('./compatibility-solver');

const POLICY_PATH = 'config/calinium-architecture-selection-policy.json';
const POLICY_SCHEMA = 'schemas/calinium-architecture-selection-policy.schema.json';
const OUTCOME_SCHEMA = 'schemas/calinium-architecture-selection-outcome.schema.json';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function present(value) { return value !== null && value !== undefined && value !== ''; }
function clamp(value, bounds) { return Math.max(bounds.minimum, Math.min(bounds.maximum, value)); }

function loadArchitectureSelectionPolicy(root = path.resolve(__dirname, '../..')) {
  const policy = JSON.parse(fs.readFileSync(path.resolve(root, POLICY_PATH), 'utf8'));
  const errors = createSchemaValidator(root).validateFile(policy, POLICY_SCHEMA, 'automatic architecture-selection policy');
  const registry = loadArchitectureRegistry(root);
  const supported = new Set(policy.supported_profiles);
  if (supported.size !== 2 || !supported.has('profile.current_calinium.v1') || !supported.has('profile.editorial_discovery.v1')) errors.push('Automatic selection must remain bounded to the two approved Core 2.0 profiles.');
  for (const profileId of supported) if (!registry.profileById.has(profileId)) errors.push(`Automatic selection policy references unknown profile ${profileId}.`);
  for (const rule of [...policy.store_signal_rules, ...policy.intent_signal_rules]) {
    for (const profileId of supported) if (!Object.hasOwn(rule.weights, profileId)) errors.push(`Automatic selection rule ${rule.id} has no weight for ${profileId}.`);
  }
  if (policy.safety.automatic_repair_allowed !== false || policy.safety.merchant_ui_activation !== false || policy.safety.live_theme_mutation_allowed !== false) errors.push('Automatic selection policy violates the frozen beta safety boundary.');
  if (errors.length) {
    const error = new Error(`Architecture selection policy validation failed: ${[...new Set(errors)].join('; ')}`);
    error.name = 'ArchitectureSelectionPolicyError';
    error.validation = { valid: false, errors: [...new Set(errors)] };
    throw error;
  }
  return policy;
}

function storeSignals(storeIntelligence) {
  const derived = storeIntelligence?.derived_signals?.length
    ? storeIntelligence.derived_signals
    : deriveStoreSelectionSignals({
      facts: storeIntelligence?.facts || [],
      revisionId: storeIntelligence?.revision_id || null,
      normalizationVersion: storeIntelligence?.normalization_version || null,
      status: storeIntelligence?.status || 'not_available'
    });
  return new Map(derived.filter((entry) => entry.confidence !== 'Unknown' && present(entry.value)).map((entry) => [entry.path, entry]));
}

function intentSignals(merchantIntent, policy) {
  const allowedValues = new Map();
  for (const rule of policy.intent_signal_rules) {
    if (!allowedValues.has(rule.path)) allowedValues.set(rule.path, new Set());
    allowedValues.get(rule.path).add(rule.value);
  }
  const byPath = new Map();
  const entries = [...(merchantIntent?.merchant_provided_answers || []), ...(merchantIntent?.explicit_preferences || [])];
  for (const entry of entries) {
    if (!allowedValues.has(entry.path) || entry.confidence === 'Unknown' || !present(entry.value)) continue;
    if (!allowedValues.get(entry.path).has(entry.value)) {
      const error = new Error(`Merchant Intent contains unsupported architecture value ${entry.path}=${entry.value}.`);
      error.name = 'ArchitectureIntentSignalError';
      throw error;
    }
    if (byPath.has(entry.path) && byPath.get(entry.path).value !== entry.value) {
      const error = new Error(`Merchant Intent contains conflicting trusted architecture values for ${entry.path}.`);
      error.name = 'ArchitectureIntentSignalError';
      throw error;
    }
    byPath.set(entry.path, entry);
  }
  return byPath;
}

function signalEvidence({ rule, signal, source, profileId }) {
  const weight = rule.weights[profileId];
  return {
    signal_id: rule.id,
    signal_path: rule.path,
    observed_value: rule.value,
    source,
    source_revision: source === 'store_intelligence' ? signal.provenance?.source_revision || null : signal.source_revision || null,
    derivation_revision: source === 'store_intelligence' ? signal.derivation_revision : 'merchant-intent-explicit-projection-v1',
    confidence: signal.confidence,
    impact: rule.impact,
    weight,
    reason_code: rule.id
  };
}

function availableSignalPaths(storeIntelligence, merchantIntent) {
  const paths = new Set();
  for (const entry of [
    ...(storeIntelligence?.facts || []),
    ...(storeIntelligence?.derived_signals || []),
    ...(merchantIntent?.inferred_shopify_facts || []),
    ...(merchantIntent?.merchant_provided_answers || []),
    ...(merchantIntent?.explicit_preferences || [])
  ]) if (present(entry.value) && entry.confidence !== 'Unknown') paths.add(entry.path);
  for (const [key, value] of Object.entries(storeIntelligence?.capability_signals || {})) if (value === true) paths.add(`capability_signals.${key}`);
  return paths;
}

function candidateEligibility({ profile, registry, storeIntelligence, merchantIntent, policy, root }) {
  const available = availableSignalPaths(storeIntelligence, merchantIntent);
  const requiredSignals = [...profile.eligibility.required_signals].sort();
  const missingSignals = requiredSignals.filter((signal) => !available.has(signal));
  const compatibility = solveArchitectureCompatibility({ profileId: profile.id, profileVersion: profile.version, registry, root });
  const constraints = [
    { id: 'policy_supported_profile', passed: policy.supported_profiles.includes(profile.id), reason: 'Profile is registered in the bounded E1 policy.' },
    { id: 'profile_active', passed: profile.status === 'active', reason: `Profile status is ${profile.status}.` },
    { id: 'required_signals_available', passed: missingSignals.length === 0, reason: missingSignals.length ? `Missing ${missingSignals.join(', ')}.` : 'All registered hard-required signals are available.' },
    { id: 'architecture_compatibility', passed: compatibility.valid, reason: compatibility.valid ? 'Registered families and capabilities are compatible.' : compatibility.errors.join(' ') }
  ];
  return {
    eligible: constraints.every((constraint) => constraint.passed),
    evaluator_version: policy.eligibility_evaluator_version,
    required_signals: requiredSignals,
    missing_signals: missingSignals,
    hard_constraints: constraints,
    compatibility_result: compatibility
  };
}

function candidateExplanation(profileId, positive, negative) {
  const strongest = [...positive, ...negative].sort((left, right) => Math.abs(right.weight) - Math.abs(left.weight) || left.signal_id.localeCompare(right.signal_id)).slice(0, 4);
  return {
    summary: strongest.length
      ? `${profileId} fit is determined by ${strongest.map((entry) => entry.reason_code).join(', ')}.`
      : `${profileId} has no trusted soft-fit evidence beyond the policy baseline.`,
    leading_reason_codes: strongest.map((entry) => entry.reason_code)
  };
}

function scoreCandidates({ registry, storeIntelligence, merchantIntent, policy, root }) {
  const stores = storeSignals(storeIntelligence);
  const intents = intentSignals(merchantIntent, policy);
  const candidates = policy.supported_profiles.map((profileId) => {
    const profile = registry.profileById.get(profileId);
    const eligibility = candidateEligibility({ profile, registry, storeIntelligence, merchantIntent, policy, root });
    const evidence = [];
    for (const rule of policy.store_signal_rules) {
      const signal = stores.get(rule.path);
      if (signal?.value === rule.value && rule.weights[profileId] !== 0) evidence.push(signalEvidence({ rule, signal, source: 'store_intelligence', profileId }));
    }
    for (const rule of policy.intent_signal_rules) {
      const signal = intents.get(rule.path);
      if (signal?.value === rule.value && rule.weights[profileId] !== 0) evidence.push(signalEvidence({ rule, signal, source: 'merchant_intent', profileId }));
    }
    const positive = evidence.filter((entry) => entry.weight > 0);
    const negative = evidence.filter((entry) => entry.weight < 0);
    const score = eligibility.eligible ? clamp(policy.base_score + evidence.reduce((sum, entry) => sum + entry.weight, 0), policy.score_bounds) : policy.score_bounds.minimum;
    return {
      candidate_id: profileId,
      eligibility: {
        eligible: eligibility.eligible,
        evaluator_version: eligibility.evaluator_version,
        required_signals: eligibility.required_signals,
        missing_signals: eligibility.missing_signals,
        hard_constraints: eligibility.hard_constraints
      },
      compatibility_result: eligibility.compatibility_result,
      positive_signals: positive,
      negative_signals: negative,
      score,
      rank: null,
      confidence: evidence.some((entry) => entry.impact === 'high' && entry.confidence === 'High') ? 'high' : evidence.length >= 2 ? 'medium' : 'low',
      explanation: candidateExplanation(profileId, positive, negative)
    };
  });
  const ranked = candidates.filter((candidate) => candidate.eligibility.eligible)
    .sort((left, right) => right.score - left.score
      || (left.candidate_id === policy.conservative_fallback_profile_id ? -1 : 1)
      || left.candidate_id.localeCompare(right.candidate_id));
  ranked.forEach((candidate, index) => { candidate.rank = index + 1; });
  return { candidates, ranked, storeSignals: stores, intentSignals: intents };
}

function simulatedWinner(candidates, policy, question, answer) {
  const rule = policy.intent_signal_rules.find((item) => item.path === question.intent_path && item.value === answer);
  if (!rule) return null;
  return [...candidates].filter((candidate) => candidate.eligibility.eligible)
    .map((candidate) => ({ id: candidate.candidate_id, score: clamp(candidate.score + rule.weights[candidate.candidate_id], policy.score_bounds) }))
    .sort((left, right) => right.score - left.score
      || (left.id === policy.conservative_fallback_profile_id ? -1 : 1)
      || left.id.localeCompare(right.id))[0]?.id || null;
}

function ambiguityFor({ candidates, ranked, intents, policy }) {
  const margin = ranked.length > 1 ? Number(Math.abs(ranked[0].score - ranked[1].score).toFixed(4)) : null;
  const unknowns = policy.ambiguity.high_impact_intent_paths.filter((pathname) => !intents.has(pathname));
  let materialQuestion = null;
  if (ranked.length > 1 && margin <= policy.ambiguity.maximum_score_margin) {
    for (const question of policy.ambiguity.material_questions) {
      if (!unknowns.includes(question.intent_path)) continue;
      const winners = new Set(question.answer_values.map((answer) => simulatedWinner(candidates, policy, question, answer)).filter(Boolean));
      if (winners.size > 1) { materialQuestion = question; break; }
    }
  }
  return {
    result: {
      evaluator_version: policy.ambiguity_evaluator_version,
      material: Boolean(materialQuestion),
      score_margin: margin,
      threshold: policy.ambiguity.maximum_score_margin,
      high_impact_unknowns: unknowns,
      changeable_by_one_answer: Boolean(materialQuestion),
      reason_codes: materialQuestion ? ['candidates_close', 'high_impact_intent_unknown', 'one_answer_can_change_winner'] : margin === null ? ['single_eligible_candidate'] : ['winner_outside_material_ambiguity']
    },
    materialQuestion
  };
}

function inputBindings(storeIntelligence, merchantIntent) {
  return {
    store_intelligence_revision: storeIntelligence.revision_id,
    store_intelligence_checksum: digest(storeIntelligence),
    merchant_intent_revision: merchantIntent.revision_id,
    merchant_intent_checksum: digest(merchantIntent)
  };
}

function questionOutcome({ policy, candidates, ambiguity, materialQuestion, storeIntelligence, merchantIntent, root }) {
  const base = {
    schema_version: '1.0',
    selection_engine_version: policy.selection_engine_version,
    selection_policy_revision: policy.policy_revision,
    status: 'material_question_required',
    selection_mode: policy.mode,
    frozen: false,
    candidate_results: candidates,
    ambiguity_result: ambiguity,
    material_question: {
      topic: materialQuestion.topic,
      intent_path: materialQuestion.intent_path,
      why_it_matters: materialQuestion.why_it_matters,
      profiles_affected: [...materialQuestion.profiles_affected],
      decision_to_resolve: materialQuestion.decision_to_resolve
    },
    input_bindings: inputBindings(storeIntelligence, merchantIntent),
    safety: clone(policy.safety)
  };
  const outcome = { ...base, outcome_id: `architecture-selection-outcome-${digest(base).slice(0, 20)}` };
  const errors = createSchemaValidator(root).validateFile(outcome, OUTCOME_SCHEMA, 'material architecture question outcome');
  if (errors.length) throw new Error(`Material architecture question outcome validation failed: ${errors.join('; ')}`);
  return outcome;
}

function evaluateAutomaticArchitectureSelection({ merchantIntent, storeIntelligence, allowMaterialQuestion = true, root = path.resolve(__dirname, '../..') }) {
  const policy = loadArchitectureSelectionPolicy(root);
  const registry = loadArchitectureRegistry(root);
  const scored = scoreCandidates({ registry, storeIntelligence, merchantIntent, policy, root });
  if (!scored.ranked.length) {
    const error = new Error('No approved architecture profile satisfies the hard eligibility and compatibility constraints.');
    error.name = 'ArchitectureEligibilityError';
    error.candidates = scored.candidates;
    throw error;
  }
  const ambiguity = ambiguityFor({ candidates: scored.candidates, ranked: scored.ranked, intents: scored.intentSignals, policy });
  if (ambiguity.materialQuestion && allowMaterialQuestion) return questionOutcome({ policy, candidates: scored.candidates, ambiguity: ambiguity.result, materialQuestion: ambiguity.materialQuestion, storeIntelligence, merchantIntent, root });
  const exactTie = scored.ranked.length > 1 && scored.ranked[0].score === scored.ranked[1].score;
  const fallbackReason = ambiguity.materialQuestion && !allowMaterialQuestion ? 'question_unavailable' : exactTie ? 'exact_tie_after_known_intent' : null;
  const selected = fallbackReason
    ? scored.ranked.find((candidate) => candidate.candidate_id === policy.conservative_fallback_profile_id) || scored.ranked[0]
    : scored.ranked[0];
  const margin = ambiguity.result.score_margin;
  const confidence = fallbackReason ? 'low' : margin !== null && margin >= 20 ? 'high' : margin !== null && margin > policy.ambiguity.maximum_score_margin ? 'medium' : selected.confidence;
  return {
    status: 'selected',
    policy,
    selected_candidate: selected,
    candidate_results: scored.candidates,
    ambiguity_result: ambiguity.result,
    input_bindings: inputBindings(storeIntelligence, merchantIntent),
    selection_confidence: confidence,
    fallback_reason: fallbackReason,
    observed_signal_paths: {
      store_intelligence: [...scored.storeSignals.keys()].sort(),
      merchant_intent: [...scored.intentSignals.keys()].sort()
    }
  };
}

function assertArchitectureSelectionInputBindings(selection, merchantIntent, storeIntelligence) {
  if (selection.selection_engine_version !== 'architecture-selection-v2') return selection;
  const expected = selection.automatic_policy?.input_bindings;
  if (!expected
    || expected.store_intelligence_revision !== storeIntelligence?.revision_id
    || expected.merchant_intent_revision !== merchantIntent?.revision_id
    || expected.store_intelligence_checksum !== digest(storeIntelligence)
    || expected.merchant_intent_checksum !== digest(merchantIntent)) {
    const error = new Error('Frozen automatic architecture selection does not match its pinned Store Intelligence and Merchant Intent inputs.');
    error.name = 'ArchitectureSelectionInputBindingError';
    throw error;
  }
  return selection;
}

module.exports = {
  POLICY_PATH,
  POLICY_SCHEMA,
  OUTCOME_SCHEMA,
  loadArchitectureSelectionPolicy,
  storeSignals,
  intentSignals,
  scoreCandidates,
  ambiguityFor,
  evaluateAutomaticArchitectureSelection,
  assertArchitectureSelectionInputBindings
};
