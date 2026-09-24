'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest } = require('../storefront-render/contracts');
const { readJson, contractError, withCanonicalId, expectedId } = require('./contracts');
const { REPAIR_INSTRUCTION } = require('./stabilization-contracts');

const OBSERVATION_STABILIZATION_POLICY_FILE = 'config/storefront-observation-stabilization.json';
const OBSERVATION_STABILIZATION_POLICY_SCHEMA = 'schemas/calinium-observation-stabilization-policy.schema.json';
const CONCRETE_OBSERVATION_SCHEMA = 'schemas/calinium-concrete-visual-observation.schema.json';
const CONTROLLED_COMPARISON_SCHEMA = 'schemas/calinium-controlled-visual-comparison.schema.json';
const OBSERVATION_STABILIZATION_REPORT_SCHEMA = 'schemas/calinium-observation-stabilization-report.schema.json';
const CONCRETE_OBSERVATION_VERSION = 'concrete-visual-observation-v1';
const CONTROLLED_COMPARISON_VERSION = 'controlled-visual-comparison-v1';
const OBSERVATION_STABILIZATION_REPORT_VERSION = 'observation-stabilization-report-v1';

const RESPONSIBILITY_OR_CAUSE = /\b(architecture[_ -]?level|composition[_ -]?level|design[_ -]?token[_ -]?level|merchant[_ -]?content[_ -]?level|data[_ -]?quality[_ -]?level|responsib(?:ility|le)|owned by|ownership|caused by|due to)\b/i;
const RECOMMENDATION_OR_REPAIR = /\b(recommend(?:ed)? (?:changing|adjusting|removing|adding)|recommended intervention|repair plan|code change)\b/i;

function escaped(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function loadObservationStabilizationPolicy(root) {
  const policy = readJson(path.join(root, OBSERVATION_STABILIZATION_POLICY_FILE));
  const errors = createSchemaValidator(root).validateFile(policy, OBSERVATION_STABILIZATION_POLICY_SCHEMA, 'observation_stabilization_policy');
  const d26 = readJson(path.join(root, 'config/storefront-visual-judgment-stabilization.json'));
  if (policy.source_stabilization_policy_revision !== d26.policy_revision) errors.push('D2.7 observation policy is not bound to the checkpointed D2.6 policy.');
  const unique = (items) => new Set(items).size === items.length;
  if (!unique(policy.phenomena.map((item) => item.id))) errors.push('Concrete observation phenomena must be unique.');
  if (!unique(policy.components)) errors.push('Concrete observation components must be unique.');
  if (!unique(policy.support_statuses)) errors.push('Observation support statuses must be unique.');
  const live = policy.limited_live_validation;
  if (live.model !== 'gpt-5.6-sol' || live.reasoning_effort !== 'medium' || live.screenshot_cells !== 12
    || live.accepted_repeats !== 2 || live.maximum_accepted_calls !== 2 || live.fixture_fallback_allowed !== false
    || live.automatic_repair_allowed !== false || live.automatic_mutation_allowed !== false || live.shopify_write_allowed !== false) {
    errors.push('D2.7 live configuration violates the approved model, scope, cost, or safety boundary.');
  }
  if (policy.reliability.human_review_required !== true || policy.reliability.automatic_repair_allowed !== false) errors.push('D2.7 must require human review and forbid automatic repair.');
  if (errors.length) throw contractError('Observation Stabilization Policy', [...new Set(errors)]);
  return {
    ...policy,
    phenomenonById: new Map(policy.phenomena.map((item) => [item.id, item])),
    componentSet: new Set(policy.components),
    interpretationPattern: new RegExp(`\\b(?:${policy.rejected_interpretation_terms.map(escaped).join('|')})\\b`, 'i')
  };
}

function assertCanonical(value, field, prefix, errors, label) {
  if (value?.[field] !== expectedId(prefix, value, field)) errors.push(`${label} ID does not match canonical contents.`);
}

function requestCell(request, observation) {
  return request?.cells?.find((cell) => cell.cell_id === observation?.cell_id);
}

function assertConcreteObservation(observation, request, root) {
  const errors = createSchemaValidator(root).validateFile(observation, CONCRETE_OBSERVATION_SCHEMA, 'concrete_visual_observation');
  assertCanonical(observation, 'observation_id', 'concrete-visual-observation', errors, 'Concrete Visual Observation');
  const policy = loadObservationStabilizationPolicy(root);
  const phenomenon = policy.phenomenonById.get(observation?.phenomenon);
  if (!phenomenon || phenomenon.kind !== observation?.phenomenon_kind) errors.push('Concrete Visual Observation phenomenon binding is invalid.');
  if (!policy.componentSet.has(observation?.component)) errors.push('Concrete Visual Observation component is unsupported.');
  if (observation?.evaluation_request_id !== request?.request_id) errors.push('Concrete Visual Observation belongs to another request.');
  const cell = requestCell(request, observation);
  if (!cell) errors.push('Concrete Visual Observation references an unknown screenshot cell.');
  else if (cell.profile_id !== observation.profile_id || cell.route_id !== observation.route_id || cell.viewport_id !== observation.viewport_id
    || cell.screenshot.sha256 !== observation.screenshot_sha256) errors.push('Concrete Visual Observation scope or screenshot checksum is stale.');
  const text = `${observation?.visible_region || ''} ${observation?.evidence_summary || ''}`;
  if (policy.interpretationPattern.test(text)) errors.push('Stage-1 observation contains an abstract quality or comparison judgment.');
  if (RESPONSIBILITY_OR_CAUSE.test(text)) errors.push('Stage-1 observation contains responsibility or causal attribution.');
  if (REPAIR_INSTRUCTION.test(text) || RECOMMENDATION_OR_REPAIR.test(text)) errors.push('Stage-1 observation contains a recommendation or repair instruction.');
  if (observation?.component === 'other_named_region' && !observation?.region_reference?.landmark_id && !observation?.region_reference?.bounds) errors.push('Other named regions require a landmark or bounded-region reference.');
  const objectiveById = new Map((request?.objective_facts || []).map((fact) => [fact.finding_id, fact]));
  for (const fact of observation?.objective_facts || []) {
    const trusted = objectiveById.get(fact.finding_id);
    if (!trusted || trusted.rule_id !== fact.rule_id || trusted.cell_id !== observation.cell_id) errors.push(`Concrete Visual Observation references an unrelated D1 fact ${fact.finding_id}.`);
  }
  if (observation?.relationship?.mode === 'symptom_of' && !observation.relationship.root_evidence_key) errors.push('Symptom observation requires a root evidence key.');
  if (observation?.relationship?.mode !== 'symptom_of' && observation?.relationship?.root_evidence_key) errors.push('Only a symptom observation may reference root evidence.');
  if (errors.length) throw contractError('Concrete Visual Observation', [...new Set(errors)]);
  return observation;
}

function createConcreteObservation(value, request, root) {
  const base = {
    schema_version: '1.0',
    contract_version: CONCRETE_OBSERVATION_VERSION,
    ...value,
    evaluation_request_id: request.request_id,
    frozen: true
  };
  return assertConcreteObservation(withCanonicalId('concrete-visual-observation', base, 'observation_id'), request, root);
}

function assertControlledComparison(comparison, observations, root) {
  const errors = createSchemaValidator(root).validateFile(comparison, CONTROLLED_COMPARISON_SCHEMA, 'controlled_visual_comparison');
  assertCanonical(comparison, 'comparison_id', 'controlled-visual-comparison', errors, 'Controlled Visual Comparison');
  const policy = loadObservationStabilizationPolicy(root);
  if (!policy.comparison_types.includes(comparison?.comparison_type)) errors.push('Controlled comparison type is unsupported.');
  if (!policy.comparison_conclusions.includes(comparison?.conclusion)) errors.push('Controlled comparison conclusion is unsupported.');
  const byId = new Map(observations.map((item) => [item.observation_id, item]));
  for (let index = 0; index < (comparison?.source_observation_ids || []).length; index += 1) {
    const observation = byId.get(comparison.source_observation_ids[index]);
    if (!observation || digest(observation) !== comparison.source_observation_checksums[index]) errors.push('Controlled comparison source observation binding is invalid.');
  }
  if (new Set(comparison?.source_observation_ids || []).size < 2) errors.push('Controlled comparison requires two distinct frozen observations.');
  if (comparison?.human_review_required !== true) errors.push('Controlled comparison must remain human reviewed.');
  if (errors.length) throw contractError('Controlled Visual Comparison', [...new Set(errors)]);
  return comparison;
}

function createControlledComparison(value, observations, root) {
  const base = { schema_version: '1.0', contract_version: CONTROLLED_COMPARISON_VERSION, ...value, human_review_required: true };
  return assertControlledComparison(withCanonicalId('controlled-visual-comparison', base, 'comparison_id'), observations, root);
}

function assertObservationStabilizationReport(report, root) {
  const errors = createSchemaValidator(root).validateFile(report, OBSERVATION_STABILIZATION_REPORT_SCHEMA, 'observation_stabilization_report');
  assertCanonical(report, 'report_id', 'observation-stabilization-report', errors, 'Observation Stabilization Report');
  if (report?.reliability?.human_review_required !== true || report?.reliability?.automatic_repair_allowed !== false) errors.push('D2.7 report violates mandatory human review or no-repair safety.');
  if (report?.reliability?.repair_planning_consumption_allowed === true && report?.reliability?.status !== 'repair_planning_eligible') errors.push('Repair-planning consumption may be eligible only when every reliability condition passes.');
  if (report?.safety?.fixture_fallback_used !== false || report?.safety?.automatic_mutation_allowed !== false
    || report?.safety?.automatic_repair_allowed !== false || report?.safety?.shopify_write_allowed !== false) errors.push('D2.7 report violates no-fallback/no-mutation safety.');
  if (errors.length) throw contractError('Observation Stabilization Report', [...new Set(errors)]);
  return report;
}

module.exports = {
  OBSERVATION_STABILIZATION_POLICY_FILE,
  OBSERVATION_STABILIZATION_POLICY_SCHEMA,
  CONCRETE_OBSERVATION_SCHEMA,
  CONTROLLED_COMPARISON_SCHEMA,
  OBSERVATION_STABILIZATION_REPORT_SCHEMA,
  CONCRETE_OBSERVATION_VERSION,
  CONTROLLED_COMPARISON_VERSION,
  OBSERVATION_STABILIZATION_REPORT_VERSION,
  RESPONSIBILITY_OR_CAUSE,
  RECOMMENDATION_OR_REPAIR,
  loadObservationStabilizationPolicy,
  assertConcreteObservation,
  createConcreteObservation,
  assertControlledComparison,
  createControlledComparison,
  assertObservationStabilizationReport
};
