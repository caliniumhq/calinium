'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest, createMerchantIntent, createStoreIntelligenceContract, assertMerchantIntent, assertStoreIntelligenceContract } = require('./contracts');
const { loadArchitectureRegistry } = require('./architecture-registry');
const { assertArchitectureCompatibility, solveArchitectureCompatibility } = require('./compatibility-solver');
const {
  evaluateAutomaticArchitectureSelection,
  loadArchitectureSelectionPolicy,
  assertArchitectureSelectionInputBindings
} = require('./selection-policy');

const SELECTION_ENGINE_VERSION = 'architecture-selection-v1';
const AUTOMATIC_SELECTION_ENGINE_VERSION = 'architecture-selection-v2';
const ELIGIBILITY_EVALUATOR_VERSION = 'architecture-eligibility-v1';
const FIT_EVALUATOR_VERSION = 'architecture-fit-v1';
const FAMILY_ORDER = Object.freeze(['header_navigation', 'product_card', 'collection_merchandising', 'product_detail', 'cart', 'responsive_behavior']);

function hasSignalValue(value) {
  return value !== null && value !== undefined && value !== false && value !== '' && (!Array.isArray(value) || value.length > 0);
}

function availableSignals(merchantIntent, storeIntelligence) {
  const signals = new Set();
  for (const item of [
    ...(storeIntelligence?.facts || []),
    ...(merchantIntent?.inferred_shopify_facts || []),
    ...(merchantIntent?.merchant_provided_answers || []),
    ...(merchantIntent?.explicit_preferences || [])
  ]) if (hasSignalValue(item.value)) signals.add(item.path);
  for (const [key, value] of Object.entries(storeIntelligence?.capability_signals || {})) {
    if (value === true) signals.add(`capability_signals.${key}`);
  }
  return signals;
}

function evaluateArchitectureEligibility(profile, merchantIntent, storeIntelligence) {
  const requiredSignals = [...profile.eligibility.required_signals].sort();
  const available = availableSignals(merchantIntent, storeIntelligence);
  const missingSignals = requiredSignals.filter((signal) => !available.has(signal));
  return {
    eligible: missingSignals.length === 0,
    evaluator_version: ELIGIBILITY_EVALUATOR_VERSION,
    required_signals: requiredSignals,
    missing_signals: missingSignals
  };
}

function fitResult(profileId, explicit) {
  const reasonCode = profileId === 'profile.current_calinium.v1'
    ? 'only_registered_eligible_profile'
    : explicit
      ? 'explicit_registered_profile_selected'
      : 'only_registered_eligible_profile';
  return {
    evaluator_version: FIT_EVALUATOR_VERSION,
    candidate_count: 1,
    rank: 1,
    score: 1,
    reason_codes: [reasonCode]
  };
}

function schemaAssert(selection, root) {
  const errors = createSchemaValidator(root).validateFile(selection, 'schemas/calinium-architecture-selection.schema.json', 'frozen architecture selection');
  if (errors.length) {
    const error = new Error(`Frozen architecture selection validation failed: ${errors.join('; ')}`);
    error.name = 'ArchitectureSelectionValidationError';
    error.validation = { valid: false, errors, warnings: [] };
    throw error;
  }
  return selection;
}

function familySelectionsFor(profile, registry) {
  return FAMILY_ORDER.map((familyType) => {
    const family = registry.familyById.get(profile.family_selections[familyType]);
    return { family: familyType, family_id: family.id, family_version: family.version, presenters: [...family.presenters] };
  });
}

function automaticSelection({ decision, registry, storeContract, intentContract, materialClarification = null, root }) {
  const profile = registry.profileById.get(decision.selected_candidate.candidate_id);
  const candidate = decision.selected_candidate;
  const fallback = decision.fallback_reason ? { applied: true, reason: decision.fallback_reason, profile_id: profile.id } : null;
  const fitReasonCodes = candidate.explanation.leading_reason_codes.length ? candidate.explanation.leading_reason_codes : ['automatic_policy_fit'];
  const reasonCodes = materialClarification ? ['merchant_clarification', ...fitReasonCodes] : fitReasonCodes;
  const base = {
    schema_version: '1.0',
    selection_engine_version: AUTOMATIC_SELECTION_ENGINE_VERSION,
    frozen: true,
    profile_id: profile.id,
    profile_schema_version: profile.profile_schema_version,
    profile_version: profile.version,
    family_selections: familySelectionsFor(profile, registry),
    selection_source: fallback ? 'conservative_fallback' : 'automatic_policy',
    selection_reason: {
      codes: fallback ? [decision.fallback_reason, ...reasonCodes] : ['automatic_policy_fit', ...reasonCodes],
      summary: fallback
        ? `The bounded beta policy used ${profile.name} as the conservative fallback because ${decision.fallback_reason}.`
        : materialClarification
          ? 'The versioned policy resolved one material storefront-shopping ambiguity using an explicit checksum-bound merchant preference.'
          : `${profile.name} has the strongest eligible, compatible fit under the versioned automatic architecture policy.`
    },
    eligibility_result: {
      eligible: true,
      evaluator_version: decision.policy.eligibility_evaluator_version,
      required_signals: [...candidate.eligibility.required_signals],
      missing_signals: [...candidate.eligibility.missing_signals]
    },
    fit_result: {
      evaluator_version: decision.policy.fit_evaluator_version,
      candidate_count: decision.candidate_results.length,
      rank: 1,
      score: candidate.score,
      confidence: decision.selection_confidence,
      reason_codes: [...reasonCodes]
    },
    material_question: null,
    store_intelligence_revision: storeContract.revision_id,
    merchant_intent_revision: intentContract.revision_id,
    compatibility_result: clone(candidate.compatibility_result),
    fallback,
    lifecycle: { resolved_before: ['design_dna', 'composition'], paid_retries_use_pinned_revision: true },
    automatic_policy: {
      policy_revision: decision.policy.policy_revision,
      selection_mode: decision.policy.mode,
      signal_derivation_revision: decision.policy.signal_derivation_revision,
      selection_confidence: decision.selection_confidence,
      candidate_results: clone(decision.candidate_results),
      ambiguity_result: clone(decision.ambiguity_result),
      input_bindings: clone(decision.input_bindings),
      observed_signal_paths: clone(decision.observed_signal_paths),
      safety: clone(decision.policy.safety)
    },
    ...(materialClarification ? { material_clarification: clone(materialClarification) } : {})
  };
  const selection = { ...base, revision_id: `architecture-selection-${digest(base).slice(0, 20)}` };
  assertArchitectureSelectionInputBindings(selection, intentContract, storeContract);
  return schemaAssert(selection, root);
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function selectArchitecture({ profileId = null, profileVersion = null, merchantIntent = null, storeIntelligence = null, merchantProfile = null, selectionMode = 'legacy_default', allowMaterialQuestion = true, materialClarification = null, root = path.resolve(__dirname, '../..') } = {}) {
  const registry = loadArchitectureRegistry(root);
  const storeContract = storeIntelligence ? assertStoreIntelligenceContract(storeIntelligence, root) : createStoreIntelligenceContract({ root });
  const intentContract = merchantIntent ? assertMerchantIntent(merchantIntent, root) : createMerchantIntent({ merchantProfile, storeIntelligence: storeContract, root });
  if (selectionMode === 'automatic_beta') {
    if (profileId || profileVersion) {
      const error = new Error('Automatic architecture selection cannot be combined with explicit profile metadata.');
      error.name = 'ArchitectureSelectionError';
      throw error;
    }
    const decision = evaluateAutomaticArchitectureSelection({ merchantIntent: intentContract, storeIntelligence: storeContract, allowMaterialQuestion, root });
    if (decision.status === 'material_question_required') return decision;
    return automaticSelection({ decision, registry, storeContract, intentContract, materialClarification, root });
  }
  if (materialClarification) throw new Error('Material clarification provenance is supported only by automatic architecture selection.');
  if (selectionMode !== 'legacy_default') throw new Error(`Unknown architecture selection mode ${selectionMode}.`);
  const explicit = Boolean(profileId);
  const selectedProfileId = profileId || registry.profiles.default_profile_id;
  const profile = registry.profileById.get(selectedProfileId);
  if (!profile) {
    const error = new Error(`Unknown architecture profile ${selectedProfileId}. Explicit invalid profiles do not fall back.`);
    error.name = 'ArchitectureSelectionError';
    throw error;
  }
  const eligibility = evaluateArchitectureEligibility(profile, intentContract, storeContract);
  if (!eligibility.eligible) {
    const error = new Error(`Architecture profile ${profile.id} is ineligible: missing ${eligibility.missing_signals.join(', ')}.`);
    error.name = 'ArchitectureEligibilityError';
    error.eligibility = eligibility;
    throw error;
  }
  const compatibility = assertArchitectureCompatibility({ profileId: selectedProfileId, profileVersion, registry, root });
  const familySelections = familySelectionsFor(profile, registry);
  const fallback = explicit ? null : { applied: true, reason: 'profile_unspecified', profile_id: selectedProfileId };
  const base = {
    schema_version: '1.0',
    selection_engine_version: SELECTION_ENGINE_VERSION,
    frozen: true,
    profile_id: profile.id,
    profile_schema_version: profile.profile_schema_version,
    profile_version: profile.version,
    family_selections: familySelections,
    selection_source: explicit ? 'explicit_profile' : 'default_fallback',
    selection_reason: {
      codes: explicit ? ['explicit_profile_selected'] : ['current_calinium_default', 'profile_unspecified'],
      summary: explicit ? 'The requested registered architecture profile is eligible and compatible.' : 'No Core 2.0 profile was supplied, so generation preserves the current Calinium storefront architecture.'
    },
    eligibility_result: eligibility,
    fit_result: fitResult(profile.id, explicit),
    material_question: null,
    store_intelligence_revision: storeContract.revision_id,
    merchant_intent_revision: intentContract.revision_id,
    compatibility_result: compatibility,
    fallback,
    lifecycle: { resolved_before: ['design_dna', 'composition'] }
  };
  const selection = { ...base, revision_id: `architecture-selection-${digest(base).slice(0, 20)}` };
  return schemaAssert(selection, root);
}

function assertFrozenArchitectureSelection(selection, root = path.resolve(__dirname, '../..')) {
  schemaAssert(selection, root);
  const registry = loadArchitectureRegistry(root);
  const profile = registry.profileById.get(selection.profile_id);
  if (!profile) throw new Error(`Frozen architecture selection uses unknown profile ${selection.profile_id}.`);
  if (selection.profile_version !== profile.version || selection.profile_schema_version !== profile.profile_schema_version) throw new Error(`Frozen architecture selection uses an invalid version of ${selection.profile_id}.`);
  if (selection.selection_engine_version === AUTOMATIC_SELECTION_ENGINE_VERSION) {
    const policy = loadArchitectureSelectionPolicy(root);
    const trace = selection.automatic_policy;
    if (!trace || trace.policy_revision !== policy.policy_revision || trace.selection_mode !== policy.mode || trace.signal_derivation_revision !== policy.signal_derivation_revision) throw new Error('Frozen automatic architecture selection has an invalid policy binding.');
    if (trace.safety.automatic_repair_allowed !== false || trace.safety.merchant_ui_activation !== false || trace.safety.live_theme_mutation_allowed !== false) throw new Error('Frozen automatic architecture selection violates the beta safety boundary.');
    if (trace.candidate_results.length !== 2) throw new Error('Frozen automatic architecture selection must retain both approved candidate results.');
    const candidateIds = new Set(trace.candidate_results.map((candidate) => candidate.candidate_id));
    if (candidateIds.size !== policy.supported_profiles.length || policy.supported_profiles.some((profileId) => !candidateIds.has(profileId))) throw new Error('Frozen automatic architecture selection does not retain the exact bounded candidate set.');
    const chosen = trace.candidate_results.find((candidate) => candidate.candidate_id === selection.profile_id);
    const conservativeFallback = selection.selection_source === 'conservative_fallback';
    if (!chosen?.eligibility.eligible || (!conservativeFallback && chosen.rank !== 1) || chosen.score !== selection.fit_result.score) throw new Error('Frozen automatic architecture selection does not match its winning candidate result.');
    if (conservativeFallback && (selection.profile_id !== policy.conservative_fallback_profile_id || !selection.fallback?.applied || !policy.fallback.allowed_reasons.includes(selection.fallback.reason))) throw new Error('Frozen automatic architecture selection has an invalid conservative fallback.');
    if (selection.material_clarification) {
      const clarificationErrors = createSchemaValidator(root).validateFile(selection.material_clarification, 'schemas/calinium-architecture-material-clarification.schema.json', 'architecture material clarification');
      if (clarificationErrors.length) throw new Error(`Frozen automatic architecture material clarification is invalid: ${clarificationErrors.join('; ')}`);
      if (
        selection.material_clarification.store_intelligence_revision !== selection.store_intelligence_revision
        || selection.material_clarification.store_intelligence_checksum !== selection.automatic_policy.input_bindings.store_intelligence_checksum
        || selection.material_clarification.merchant_intent_parent_revision === selection.merchant_intent_revision
        || !selection.selection_reason.codes.includes('merchant_clarification')
      ) throw new Error('Frozen automatic architecture selection has an invalid material-clarification binding.');
    }
    if (selection.fit_result.evaluator_version !== policy.fit_evaluator_version || selection.eligibility_result.evaluator_version !== policy.eligibility_evaluator_version) throw new Error('Frozen automatic architecture selection evaluator binding is stale.');
    if (!['automatic_policy', 'conservative_fallback'].includes(selection.selection_source)) throw new Error('Frozen automatic architecture selection has an invalid selection source.');
  } else {
    const expectedEligibility = evaluateArchitectureEligibility(profile, null, null);
    if (profile.eligibility.required_signals.length === 0 && JSON.stringify(selection.eligibility_result) !== JSON.stringify(expectedEligibility)) {
      throw new Error(`Frozen architecture selection has an invalid eligibility result for ${profile.id}.`);
    }
    const expectedFit = fitResult(profile.id, selection.selection_source === 'explicit_profile');
    if (JSON.stringify(selection.fit_result) !== JSON.stringify(expectedFit)) {
      throw new Error(`Frozen architecture selection has an invalid fit result for ${profile.id}.`);
    }
    if (selection.automatic_policy !== undefined) throw new Error('Legacy architecture selection cannot contain automatic policy evidence.');
  }
  if (selection.material_question !== null) throw new Error('Architecture selections cannot contain a merchant-visible material question.');
  for (const familySelection of selection.family_selections) {
    const family = registry.familyById.get(familySelection.family_id);
    if (!family || familySelection.family_version !== family.version) throw new Error(`Frozen architecture selection uses an invalid family version for ${familySelection.family_id}.`);
    if (JSON.stringify(familySelection.presenters) !== JSON.stringify(family.presenters)) throw new Error(`Frozen architecture selection presenters do not match ${familySelection.family_id}.`);
  }
  const selected = Object.fromEntries(selection.family_selections.map((family) => [family.family, family.family_id]));
  const validation = solveArchitectureCompatibility({ profileId: selection.profile_id, profileVersion: selection.profile_version, familySelections: selected, registry, root });
  if (!validation.valid) {
    const error = new Error(`Frozen architecture selection is incompatible: ${validation.errors.join(' ')}`);
    error.name = 'ArchitectureCompatibilityError';
    error.validation = validation;
    throw error;
  }
  if (FAMILY_ORDER.some((familyType) => selected[familyType] !== profile.family_selections[familyType])) throw new Error(`Frozen architecture selection does not match registered profile ${profile.id}.`);
  const base = { ...selection };
  delete base.revision_id;
  const expectedRevision = `architecture-selection-${digest(base).slice(0, 20)}`;
  if (selection.revision_id !== expectedRevision) throw new Error('Frozen architecture selection revision does not match its canonical contents.');
  return selection;
}

function architectureProvenance(selection, root = path.resolve(__dirname, '../..')) {
  const frozen = assertFrozenArchitectureSelection(selection, root);
  return {
    selection_revision_id: frozen.revision_id,
    profile_id: frozen.profile_id,
    profile_schema_version: frozen.profile_schema_version,
    profile_version: frozen.profile_version,
    selected_families: frozen.family_selections.map((family) => ({ family: family.family, family_id: family.family_id, family_version: family.family_version })),
    selection_source: frozen.selection_source,
    selection_reason: { ...frozen.selection_reason, codes: [...frozen.selection_reason.codes] },
    eligibility_result: { ...frozen.eligibility_result, required_signals: [...frozen.eligibility_result.required_signals], missing_signals: [...frozen.eligibility_result.missing_signals] },
    fit_result: { ...frozen.fit_result, reason_codes: [...frozen.fit_result.reason_codes] },
    material_question: frozen.material_question,
    store_intelligence_revision: frozen.store_intelligence_revision,
    merchant_intent_revision: frozen.merchant_intent_revision,
    compatibility_result: { ...frozen.compatibility_result, checked_capabilities: [...frozen.compatibility_result.checked_capabilities], errors: [...frozen.compatibility_result.errors] },
    fallback: frozen.fallback ? { ...frozen.fallback } : null,
    ...(frozen.automatic_policy ? { automatic_policy: clone(frozen.automatic_policy) } : {}),
    ...(frozen.material_clarification ? { material_clarification: clone(frozen.material_clarification) } : {})
  };
}

module.exports = {
  SELECTION_ENGINE_VERSION,
  AUTOMATIC_SELECTION_ENGINE_VERSION,
  ELIGIBILITY_EVALUATOR_VERSION,
  FIT_EVALUATOR_VERSION,
  FAMILY_ORDER,
  fitResult,
  evaluateArchitectureEligibility,
  selectArchitecture,
  assertFrozenArchitectureSelection,
  architectureProvenance
};
