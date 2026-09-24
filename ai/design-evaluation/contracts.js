'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest, sha256File, assertOutputArtifact } = require('../storefront-render/contracts');
const { APPROVED_FIXTURE_REVISION, APPROVED_COMPARISON_KEY } = require('../storefront-render/architecture-comparison');

const POLICY_FILE = 'config/storefront-design-evaluation-policy.json';
const POLICY_SCHEMA = 'schemas/calinium-storefront-design-evaluation-policy.schema.json';
const REQUEST_SCHEMA = 'schemas/calinium-design-evaluation-request.schema.json';
const RESULT_SCHEMA = 'schemas/calinium-design-evaluation-result.schema.json';
const ASSESSMENT_SCHEMA = 'schemas/calinium-design-dimension-assessment.schema.json';
const FINDING_SCHEMA = 'schemas/calinium-design-finding.schema.json';
const PROVIDER_RESPONSE_SCHEMA = 'schemas/calinium-design-provider-response.schema.json';
const HUMAN_REVIEW_SCHEMA = 'schemas/calinium-design-human-review.schema.json';
const REQUEST_VERSION = 'design-evaluation-request-v1';
const RESULT_VERSION = 'design-evaluation-result-v1';
const ASSESSMENT_VERSION = 'design-dimension-assessment-v1';
const FINDING_VERSION = 'design-finding-v1';
const PROVIDER_RESPONSE_VERSION = 'design-provider-response-v1';
const HUMAN_REVIEW_VERSION = 'design-human-review-v1';

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function contractError(label, errors) {
  const error = new Error(`${label} validation failed: ${errors.join('; ')}`);
  error.name = 'DesignEvaluationContractError';
  error.validation = { valid: false, errors: [...errors] };
  return error;
}

function loadDesignEvaluationPolicy(root) {
  const policy = readJson(path.join(root, POLICY_FILE));
  const errors = createSchemaValidator(root).validateFile(policy, POLICY_SCHEMA, 'storefront_design_evaluation_policy');
  const dimensions = new Set(policy.dimensions?.map((item) => item.id));
  if (dimensions.size !== 12) errors.push('Design evaluation policy must contain exactly 12 unique dimensions.');
  for (const field of ['judgments', 'importance', 'confidence', 'responsibilities', 'recommendation_categories', 'review_decisions', 'gate_statuses']) {
    if (new Set(policy[field] || []).size !== (policy[field] || []).length) errors.push(`Design evaluation policy ${field} values must be unique.`);
  }
  if (policy.automatic_repair_allowed !== false || policy.single_numeric_score_allowed !== false) errors.push('Design evaluation policy must prohibit automatic repair and a single numeric score.');
  if (errors.length) throw contractError('Storefront Design Evaluation Policy', [...new Set(errors)]);
  return { ...policy, dimensionById: new Map(policy.dimensions.map((item) => [item.id, item])) };
}

function withCanonicalId(prefix, value, idField) {
  const base = { ...value };
  delete base[idField];
  return { ...base, [idField]: `${prefix}-${digest(base).slice(0, 20)}` };
}

function expectedId(prefix, value, idField) {
  const base = { ...value };
  delete base[idField];
  return `${prefix}-${digest(base).slice(0, 20)}`;
}

function assertCanonicalId(value, field, prefix, errors, label) {
  if (value?.[field] && value[field] !== expectedId(prefix, value, field)) errors.push(`${label} ID does not match canonical contents.`);
}

function assertDesignEvaluationRequest(request, root) {
  const errors = createSchemaValidator(root).validateFile(request, REQUEST_SCHEMA, 'design_evaluation_request');
  assertCanonicalId(request, 'request_id', 'design-evaluation-request', errors, 'Design Evaluation Request');
  try {
    const policy = loadDesignEvaluationPolicy(root);
    if (request?.policy?.policy_revision !== policy.policy_revision
      || request?.policy?.evaluator_version !== policy.evaluator_version
      || request?.policy?.provider_interface_version !== policy.provider_interface_version
      || request?.policy?.required_repeat_runs !== policy.required_repeat_runs) errors.push('Design Evaluation Request policy binding is stale.');
  } catch (error) { errors.push(error.message); }
  const cells = request?.cells || [];
  const keys = new Set(cells.map((cell) => `${cell.profile_id}:${cell.route_id}:${cell.viewport_id}`));
  if (keys.size !== 16) errors.push('Design Evaluation Request must contain 16 unique profile/route/viewport cells.');
  if (request?.comparison?.fixture_revision !== APPROVED_FIXTURE_REVISION || request?.comparison?.comparison_key !== APPROVED_COMPARISON_KEY) errors.push('Design Evaluation Request does not bind the approved Phase C comparison.');
  try {
    const objectivePath = path.resolve(root, request?.comparison?.objective_calibration_reference || '');
    if (sha256File(objectivePath) !== request?.comparison?.objective_calibration_sha256) errors.push('Design Evaluation Request objective calibration checksum is stale.');
  } catch (error) { errors.push('Design Evaluation Request objective calibration is unavailable.'); }
  const profiles = new Map((request?.context?.architecture_profiles || []).map((profile) => [profile.profile_id, profile]));
  for (const cell of cells) {
    const profile = profiles.get(cell.profile_id);
    if (!profile) errors.push(`Design Evaluation Request cell ${cell.cell_id} has no bound architecture profile.`);
    else if (profile.profile_version !== cell.profile_version) errors.push(`Design Evaluation Request cell ${cell.cell_id} architecture version is stale.`);
  }
  for (const name of ['preset', 'design_dna', 'merchant_intent', 'store_intelligence']) {
    const binding = request?.context?.[name];
    if (binding?.status === 'available') {
      try {
        if (sha256File(assertOutputArtifact(root, binding.reference)) !== binding.checksum) errors.push(`Design Evaluation Request ${name} context checksum is stale.`);
      } catch (error) { errors.push(`Design Evaluation Request ${name} context is unavailable.`); }
    }
  }
  if (request?.safety?.automatic_mutation_allowed !== false || request?.safety?.automatic_repair_allowed !== false
    || request?.safety?.shopify_write_allowed !== false || request?.safety?.benchmark_reference_allowed !== false) errors.push('Design Evaluation Request violates the no-mutation/no-benchmark boundary.');
  if (errors.length) throw contractError('Design Evaluation Request', [...new Set(errors)]);
  return request;
}

function assertDimensionAssessment(assessment, request, root) {
  const errors = createSchemaValidator(root).validateFile(assessment, ASSESSMENT_SCHEMA, 'design_dimension_assessment');
  assertCanonicalId(assessment, 'assessment_id', 'design-assessment', errors, 'Design Dimension Assessment');
  if (assessment?.evaluation_request_id !== request?.request_id) errors.push('Design Dimension Assessment belongs to another request.');
  const cellIds = new Set(request?.cells?.map((cell) => cell.cell_id));
  for (const id of assessment?.evidence_cell_ids || []) if (!cellIds.has(id)) errors.push(`Design Dimension Assessment references unknown cell ${id}.`);
  try {
    const dimension = loadDesignEvaluationPolicy(root).dimensionById.get(assessment?.dimension);
    if (!dimension || dimension.version !== assessment.dimension_version) errors.push(`Design Dimension Assessment references unknown or stale dimension ${assessment?.dimension}.`);
  } catch (error) { errors.push(error.message); }
  if (errors.length) throw contractError('Design Dimension Assessment', [...new Set(errors)]);
  return assessment;
}

function assertDesignFinding(finding, request, root) {
  const errors = createSchemaValidator(root).validateFile(finding, FINDING_SCHEMA, 'design_finding');
  assertCanonicalId(finding, 'finding_id', 'design-finding', errors, 'Design Finding');
  if (finding?.evaluation_request_id !== request?.request_id) errors.push('Design Finding belongs to another request.');
  const cells = new Map(request?.cells?.map((cell) => [cell.cell_id, cell]));
  for (const evidence of finding?.evidence || []) {
    const cell = cells.get(evidence.cell_id);
    if (!cell) errors.push(`Design Finding references unknown cell ${evidence.cell_id}.`);
    else if (cell.screenshot.sha256 !== evidence.screenshot_sha256) errors.push(`Design Finding screenshot hash does not match cell ${evidence.cell_id}.`);
  }
  try {
    const policy = loadDesignEvaluationPolicy(root);
    if (!policy.dimensionById.has(finding?.dimension)) errors.push(`Design Finding references unknown dimension ${finding?.dimension}.`);
    if (!policy.responsibilities.includes(finding?.responsibility)) errors.push(`Design Finding responsibility ${finding?.responsibility} is unsupported.`);
    if (!policy.recommendation_categories.includes(finding?.recommendation_category)) errors.push(`Design Finding recommendation ${finding?.recommendation_category} is unsupported.`);
  } catch (error) { errors.push(error.message); }
  if (finding?.objective_relation?.mode === 'design_impact_of_objective' && !finding.objective_relation.objective_finding_ids.length) errors.push('Objective design-impact finding must reference an objective D1 finding.');
  if (finding?.objective_relation?.mode === 'design_impact_of_objective') {
    const objectiveIds = new Set((request?.cells || []).flatMap((cell) => cell.objective_evaluation.findings.map((item) => item.finding_id)));
    for (const id of finding.objective_relation.objective_finding_ids) if (!objectiveIds.has(id)) errors.push(`Design Finding references unknown objective D1 finding ${id}.`);
  }
  if (errors.length) throw contractError('Design Finding', [...new Set(errors)]);
  return finding;
}

function assertDesignProviderResponse(response, request, root) {
  const errors = createSchemaValidator(root).validateFile(response, PROVIDER_RESPONSE_SCHEMA, 'design_provider_response');
  assertCanonicalId(response, 'response_id', 'design-provider-response', errors, 'Design Provider Response');
  if (response?.evaluation_request_id !== request?.request_id) errors.push('Design Provider Response belongs to another request.');
  if (response?.provider?.interface_version !== request?.policy?.provider_interface_version) errors.push('Design Provider Response interface version is stale.');
  if (response?.provider?.provider_kind === 'live_multimodal') {
    if (!response.provider.model) errors.push('Live Design Provider Response requires model metadata.');
    if (!response.operation) errors.push('Live Design Provider Response requires operation metadata.');
    if (!response.diagnostics) errors.push('Live Design Provider Response requires safety diagnostics.');
  }
  const expectedEvidence = new Map(request?.cells?.map((cell) => [cell.cell_id, cell.screenshot.sha256]));
  const seen = new Set();
  for (const evidence of response?.screenshot_evidence || []) {
    if (seen.has(evidence.cell_id)) errors.push(`Design Provider Response duplicates screenshot cell ${evidence.cell_id}.`);
    seen.add(evidence.cell_id);
    if (expectedEvidence.get(evidence.cell_id) !== evidence.sha256) errors.push(`Design Provider Response screenshot evidence mismatch for ${evidence.cell_id}.`);
  }
  if (seen.size !== expectedEvidence.size) errors.push('Design Provider Response does not bind every screenshot cell.');
  for (const assessment of response?.dimension_assessments || []) {
    try { assertDimensionAssessment(assessment, request, root); } catch (error) { errors.push(error.message); }
  }
  for (const finding of response?.findings || []) {
    try { assertDesignFinding(finding, request, root); } catch (error) { errors.push(error.message); }
  }
  if (response?.status === 'evaluated' && response?.error !== null) errors.push('Evaluated Design Provider Response must not contain an error.');
  if (response?.status === 'failed' && !response?.error) errors.push('Failed Design Provider Response requires a safe error.');
  if (errors.length) throw contractError('Design Provider Response', [...new Set(errors)]);
  return response;
}

function evaluationChecksum(result) { return digest(result); }

function assertDesignEvaluationResult(result, root) {
  const errors = createSchemaValidator(root).validateFile(result, RESULT_SCHEMA, 'design_evaluation_result');
  assertCanonicalId(result, 'evaluation_id', 'design-evaluation', errors, 'Design Evaluation Result');
  try { assertDesignEvaluationRequest(result?.request, root); } catch (error) { errors.push(error.message); }
  if (result?.evaluation_request_id !== result?.request?.request_id) errors.push('Design Evaluation Result embeds another request.');
  for (const assessment of result?.dimension_assessments || []) {
    try { assertDimensionAssessment(assessment, result.request, root); } catch (error) { errors.push(error.message); }
  }
  for (const finding of result?.findings || []) {
    try { assertDesignFinding(finding, result.request, root); } catch (error) { errors.push(error.message); }
  }
  if (result?.subjective_gate?.automatic_repair_allowed !== false || result?.safety?.automatic_mutation_allowed !== false
    || result?.safety?.automatic_repair_allowed !== false || result?.safety?.single_numeric_score_present !== false) errors.push('Design Evaluation Result violates mutation or scoring safety.');
  if (result?.status === 'evaluated' && result?.error !== null) errors.push('Evaluated Design Evaluation Result must not contain an error.');
  if (result?.status === 'failed' && !result?.error) errors.push('Failed Design Evaluation Result requires a safe error.');
  if (errors.length) throw contractError('Design Evaluation Result', [...new Set(errors)]);
  return result;
}

function assertDesignHumanReview(review, evaluation, root) {
  const errors = createSchemaValidator(root).validateFile(review, HUMAN_REVIEW_SCHEMA, 'design_human_review');
  assertCanonicalId(review, 'review_id', 'design-review', errors, 'Design Human Review');
  if (review?.evaluation_id !== evaluation?.evaluation_id) errors.push('Design Human Review belongs to another evaluation.');
  if (review?.evaluation_checksum !== evaluationChecksum(evaluation)) errors.push('Design Human Review is stale for the evaluated evidence.');
  const findingIds = new Set(evaluation?.findings?.map((finding) => finding.finding_id));
  const decided = new Set();
  for (const decision of review?.finding_decisions || []) {
    if (!findingIds.has(decision.finding_id)) errors.push(`Design Human Review references unknown finding ${decision.finding_id}.`);
    if (decided.has(decision.finding_id)) errors.push(`Design Human Review decides ${decision.finding_id} more than once.`);
    decided.add(decision.finding_id);
  }
  if (decided.size !== findingIds.size) errors.push('Design Human Review must decide every subjective finding.');
  if (errors.length) throw contractError('Design Human Review', [...new Set(errors)]);
  return review;
}

function createDesignHumanReview({ evaluation, reviewerReference, reviewedAt, decision, notes = null, findingDecisions, root }) {
  const base = {
    schema_version: '1.0', contract_version: HUMAN_REVIEW_VERSION,
    evaluation_id: evaluation.evaluation_id, evaluation_checksum: evaluationChecksum(evaluation),
    review_revision: `design-review-revision-${digest({ evaluation_id: evaluation.evaluation_id, decision, finding_decisions: findingDecisions, reviewer: reviewerReference, reviewed_at: reviewedAt }).slice(0, 20)}`,
    reviewed_at: reviewedAt, reviewer: { type: 'human', reference: reviewerReference }, decision, notes,
    finding_decisions: findingDecisions.map((item) => ({ finding_id: item.finding_id, decision: item.decision, notes: item.notes || null }))
  };
  return assertDesignHumanReview(withCanonicalId('design-review', base, 'review_id'), evaluation, root);
}

module.exports = {
  POLICY_FILE, POLICY_SCHEMA, REQUEST_SCHEMA, RESULT_SCHEMA, ASSESSMENT_SCHEMA, FINDING_SCHEMA, PROVIDER_RESPONSE_SCHEMA, HUMAN_REVIEW_SCHEMA,
  REQUEST_VERSION, RESULT_VERSION, ASSESSMENT_VERSION, FINDING_VERSION, PROVIDER_RESPONSE_VERSION, HUMAN_REVIEW_VERSION,
  readJson, contractError, loadDesignEvaluationPolicy, withCanonicalId, expectedId,
  assertDesignEvaluationRequest, assertDimensionAssessment, assertDesignFinding, assertDesignProviderResponse,
  evaluationChecksum, assertDesignEvaluationResult, assertDesignHumanReview, createDesignHumanReview
};
