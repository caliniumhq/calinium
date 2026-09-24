'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest, sha256File, assertOutputArtifact } = require('../storefront-render/contracts');
const { readJson, contractError, withCanonicalId, expectedId, assertDesignEvaluationResult } = require('./contracts');

const STABILIZATION_POLICY_FILE = 'config/storefront-visual-judgment-stabilization.json';
const STABILIZATION_POLICY_SCHEMA = 'schemas/calinium-visual-judgment-stabilization-policy.schema.json';
const OBSERVATION_SCHEMA = 'schemas/calinium-visual-observation.schema.json';
const CLASSIFICATION_SCHEMA = 'schemas/calinium-design-classification.schema.json';
const STABILIZATION_REQUEST_SCHEMA = 'schemas/calinium-visual-judgment-stabilization-request.schema.json';
const RELIABILITY_REPORT_SCHEMA = 'schemas/calinium-visual-judgment-reliability-report.schema.json';
const OBSERVATION_VERSION = 'visual-observation-v1';
const CLASSIFICATION_VERSION = 'design-classification-v1';
const STABILIZATION_REQUEST_VERSION = 'visual-judgment-stabilization-request-v1';
const RELIABILITY_REPORT_VERSION = 'visual-judgment-reliability-report-v1';
const REPAIR_INSTRUCTION = /\b(should|must|needs? to|recommend(?:ed)?|fix|repair|implement|modify)\b|\b(increase|decrease|adjust|remove|suppress|change)\s+(the|this|a|an)\s+(width|height|spacing|size|layout|module|token|breakpoint|code|css|liquid)\b/i;

function loadStabilizationPolicy(root) {
  const policy = readJson(path.join(root, STABILIZATION_POLICY_FILE));
  const errors = createSchemaValidator(root).validateFile(policy, STABILIZATION_POLICY_SCHEMA, 'visual_judgment_stabilization_policy');
  const unique = (items) => new Set(items).size === items.length;
  const designPolicy = readJson(path.join(root, 'config/storefront-design-evaluation-policy.json'));
  if (policy.source_design_policy_revision !== designPolicy.policy_revision) errors.push('Stabilization policy source design-policy binding is stale.');
  if (!unique(policy.observation_kinds.map((item) => item.id))) errors.push('Observation kinds must be unique.');
  if (!unique(policy.responsibility_ontology.map((item) => item.id))) errors.push('Responsibility categories must be unique.');
  if (!unique(policy.dimension_rules.map((item) => item.id))) errors.push('Dimension rules must be unique.');
  if (!unique(policy.recommendation_taxonomy.map((item) => item.id))) errors.push('Recommendation categories must be unique.');
  if (policy.dimension_rules.some((item) => !designPolicy.dimensions.some((dimension) => dimension.id === item.id))) errors.push('Stabilization policy contains an unknown design dimension.');
  if (policy.responsibility_ontology.some((item) => !designPolicy.responsibilities.includes(item.id))) errors.push('Stabilization policy contains an unknown responsibility.');
  const live = policy.limited_live_validation;
  if (live.model !== 'gpt-5.6-sol' || live.reasoning_effort !== 'medium' || live.screenshot_cells !== 12
    || live.accepted_repeats !== 2 || live.maximum_accepted_calls !== 2 || live.fixture_fallback_allowed !== false
    || live.automatic_repair_allowed !== false || live.automatic_mutation_allowed !== false || live.shopify_write_allowed !== false) {
    errors.push('Limited live validation violates its approved model, scope, cost, or safety boundary.');
  }
  if (policy.reliability.automatic_repair_allowed !== false || policy.reliability.human_review_required !== true) errors.push('Reliability policy must keep human review required and automatic repair disabled.');
  if (errors.length) throw contractError('Visual Judgment Stabilization Policy', [...new Set(errors)]);
  return {
    ...policy,
    observationKindById: new Map(policy.observation_kinds.map((item) => [item.id, item])),
    dimensionRuleById: new Map(policy.dimension_rules.map((item) => [item.id, item])),
    responsibilityById: new Map(policy.responsibility_ontology.map((item) => [item.id, item])),
    recommendationById: new Map(policy.recommendation_taxonomy.map((item) => [item.id, item]))
  };
}

function assertCanonical(value, field, prefix, errors, label) {
  if (value?.[field] !== expectedId(prefix, value, field)) errors.push(`${label} ID does not match canonical contents.`);
}

function assertStabilizationRequest(request, root) {
  const errors = createSchemaValidator(root).validateFile(request, STABILIZATION_REQUEST_SCHEMA, 'visual_judgment_stabilization_request');
  assertCanonical(request, 'request_id', 'visual-judgment-request', errors, 'Visual Judgment Stabilization Request');
  const policy = loadStabilizationPolicy(root);
  if (request?.policy_revision !== policy.policy_revision) errors.push('Stabilization Request policy binding is stale.');
  const expected = new Set();
  const routes = request?.mode === 'offline_reclassification' ? ['homepage', 'collection', 'product', 'cart'] : policy.limited_live_validation.routes;
  for (const profile of policy.limited_live_validation.profiles) {
    for (const route of routes) {
      for (const viewport of policy.limited_live_validation.viewports) expected.add(`${profile}:${route}:${viewport}`);
    }
  }
  const actual = new Set((request?.cells || []).map((cell) => `${cell.profile_id}:${cell.route_id}:${cell.viewport_id}`));
  if (actual.size !== expected.size || [...expected].some((key) => !actual.has(key)) || request?.cells?.length !== expected.size) errors.push(`Stabilization Request must contain the exact approved ${expected.size}-cell matrix for its mode.`);
  for (const cell of request?.cells || []) {
    try {
      const file = assertOutputArtifact(root, cell.screenshot.artifact_reference);
      if (sha256File(file) !== cell.screenshot.sha256) errors.push(`Stabilization Request screenshot checksum is stale for ${cell.cell_id}.`);
    } catch (error) { errors.push(`Stabilization Request screenshot is unavailable for ${cell.cell_id}.`); }
  }
  if (request?.safety?.fixture_fallback_allowed !== false || request?.safety?.automatic_mutation_allowed !== false
    || request?.safety?.automatic_repair_allowed !== false || request?.safety?.shopify_write_allowed !== false
    || request?.safety?.human_review_required !== true) errors.push('Stabilization Request violates the no-fallback/no-mutation/human-review boundary.');
  if (errors.length) throw contractError('Visual Judgment Stabilization Request', [...new Set(errors)]);
  return request;
}

function buildStabilizationRequest({ root, sourceEvaluation, mode = 'limited_live_validation' }) {
  assertDesignEvaluationResult(sourceEvaluation, root);
  if (sourceEvaluation.status !== 'evaluated' || sourceEvaluation.provider_runs.length !== 3
    || !sourceEvaluation.provider_runs.every((run) => run.provider?.provider_kind === 'live_multimodal')) {
    throw new Error('Phase D2.6 requires the completed three-run D2.5 live evaluation as source evidence.');
  }
  const policy = loadStabilizationPolicy(root);
  if (!['offline_reclassification', 'limited_live_validation'].includes(mode)) throw new Error('Unsupported stabilization request mode.');
  const allowedRoutes = new Set(mode === 'offline_reclassification' ? ['homepage', 'collection', 'product', 'cart'] : policy.limited_live_validation.routes);
  const cells = sourceEvaluation.request.cells.filter((cell) => allowedRoutes.has(cell.route_id)).map((cell) => ({
    cell_id: cell.cell_id,
    profile_id: cell.profile_id,
    route_id: cell.route_id,
    viewport_id: cell.viewport_id,
    screenshot: { ...cell.screenshot },
    objective_evaluation: JSON.parse(JSON.stringify(cell.objective_evaluation))
  }));
  const objectiveFacts = cells.flatMap((cell) => cell.objective_evaluation.findings.map((finding) => ({
    ...finding,
    cell_id: cell.cell_id,
    profile_id: cell.profile_id,
    route_id: cell.route_id,
    viewport_id: cell.viewport_id,
    authority: 'phase_d1_authoritative'
  })));
  const base = {
    schema_version: '1.0',
    contract_version: STABILIZATION_REQUEST_VERSION,
    mode,
    policy_revision: policy.policy_revision,
    source_evaluation: { evaluation_id: sourceEvaluation.evaluation_id, evaluation_checksum: digest(sourceEvaluation) },
    cells,
    architecture_profiles: sourceEvaluation.request.context.architecture_profiles.map((profile) => ({
      profile_id: profile.profile_id,
      profile_version: profile.profile_version,
      intent: profile.intent,
      family_selections: { ...profile.family_selections }
    })),
    objective_facts: objectiveFacts,
    safety: { fixture_fallback_allowed: false, automatic_mutation_allowed: false, automatic_repair_allowed: false, shopify_write_allowed: false, human_review_required: true }
  };
  return assertStabilizationRequest(withCanonicalId('visual-judgment-request', base, 'request_id'), root);
}

function assertVisualObservation(observation, request, root) {
  const errors = createSchemaValidator(root).validateFile(observation, OBSERVATION_SCHEMA, 'visual_observation');
  assertCanonical(observation, 'observation_id', 'visual-observation', errors, 'Visual Observation');
  const policy = loadStabilizationPolicy(root);
  if (!policy.observationKindById.has(observation?.phenomenon)) errors.push('Visual Observation phenomenon is unsupported.');
  if (observation?.evaluation_request_id !== request?.request_id) errors.push('Visual Observation belongs to another request.');
  const cells = new Map(request?.cells?.map((cell) => [cell.cell_id, cell]));
  const text = [observation?.evidence_summary, observation?.visible_region, ...(observation?.evidence || []).map((item) => item.visible_evidence)].join(' ');
  if (REPAIR_INSTRUCTION.test(text)) errors.push('Stage-1 Visual Observation contains a repair or recommendation instruction.');
  for (const evidence of observation?.evidence || []) {
    const cell = cells.get(evidence.cell_id);
    if (!cell) errors.push(`Visual Observation references unknown cell ${evidence.cell_id}.`);
    else {
      if (cell.screenshot.sha256 !== evidence.screenshot_sha256) errors.push(`Visual Observation screenshot checksum mismatch for ${evidence.cell_id}.`);
      if (cell.route_id !== observation.route_id || !observation.profile_ids.includes(cell.profile_id) || !observation.viewport_ids.includes(cell.viewport_id)) errors.push(`Visual Observation evidence is outside its frozen scope for ${evidence.cell_id}.`);
    }
  }
  const objective = new Map(request?.objective_facts?.map((fact) => [fact.finding_id, fact]));
  for (const fact of observation?.objective_facts || []) {
    if (!objective.has(fact.finding_id) || objective.get(fact.finding_id).rule_id !== fact.rule_id) errors.push(`Visual Observation references unknown D1 fact ${fact.finding_id}.`);
  }
  if (errors.length) throw contractError('Visual Observation', [...new Set(errors)]);
  return observation;
}

function createVisualObservation(value, request, root) {
  const base = { schema_version: '1.0', contract_version: OBSERVATION_VERSION, ...value, evaluation_request_id: request.request_id, frozen: true };
  return assertVisualObservation(withCanonicalId('visual-observation', base, 'observation_id'), request, root);
}

function assertDesignClassification(classification, observation, root) {
  const errors = createSchemaValidator(root).validateFile(classification, CLASSIFICATION_SCHEMA, 'design_classification');
  assertCanonical(classification, 'classification_id', 'design-classification', errors, 'Design Classification');
  const policy = loadStabilizationPolicy(root);
  if (classification?.observation_id !== observation?.observation_id || classification?.observation_checksum !== digest(observation)) errors.push('Design Classification does not consume the exact frozen observation.');
  if (!policy.dimensionRuleById.has(classification?.primary_dimension)) errors.push('Design Classification primary dimension is unsupported.');
  if (!policy.responsibilityById.has(classification?.responsibility)) errors.push('Design Classification responsibility is unsupported.');
  const recommendation = policy.recommendationById.get(classification?.recommendation_category);
  if (!recommendation || recommendation.legacy_category !== classification?.legacy_recommendation_category) errors.push('Design Classification recommendation binding is unsupported.');
  if (classification?.relationship?.mode === 'symptom_of' && !classification.relationship.target_observation_id) errors.push('Symptom classification requires a root observation target.');
  if (classification?.relationship?.mode !== 'symptom_of' && classification?.relationship?.target_observation_id) errors.push('Only a symptom classification may target another observation.');
  if (classification?.relationship?.mode === 'symptom_of' && classification?.independent_repair_candidate !== false) errors.push('A downstream symptom cannot be an independent repair candidate.');
  if (classification?.human_review_required !== true || classification?.automatic_repair_allowed !== false) errors.push('Design Classification violates the human-review/no-repair boundary.');
  if (errors.length) throw contractError('Design Classification', [...new Set(errors)]);
  return classification;
}

function assertReliabilityReport(report, root) {
  const errors = createSchemaValidator(root).validateFile(report, RELIABILITY_REPORT_SCHEMA, 'visual_judgment_reliability_report');
  assertCanonical(report, 'report_id', 'visual-judgment-report', errors, 'Visual Judgment Reliability Report');
  if (report?.reliability?.repair_planning_consumption_allowed !== false || report?.reliability?.automatic_repair_allowed !== false
    || report?.reliability?.human_review_required !== true) errors.push('Reliability Report must not authorize repair planning consumption or automatic repair in Phase D2.6.');
  if (errors.length) throw contractError('Visual Judgment Reliability Report', [...new Set(errors)]);
  return report;
}

module.exports = {
  STABILIZATION_POLICY_FILE,
  STABILIZATION_POLICY_SCHEMA,
  OBSERVATION_SCHEMA,
  CLASSIFICATION_SCHEMA,
  STABILIZATION_REQUEST_SCHEMA,
  RELIABILITY_REPORT_SCHEMA,
  OBSERVATION_VERSION,
  CLASSIFICATION_VERSION,
  STABILIZATION_REQUEST_VERSION,
  RELIABILITY_REPORT_VERSION,
  REPAIR_INSTRUCTION,
  loadStabilizationPolicy,
  assertStabilizationRequest,
  buildStabilizationRequest,
  assertVisualObservation,
  createVisualObservation,
  assertDesignClassification,
  assertReliabilityReport
};
