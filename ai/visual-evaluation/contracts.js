'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest, sha256File, assertOutputArtifact, assertRenderRequest, assertRenderResult } = require('../storefront-render/contracts');

const POLICY_FILE = 'config/storefront-visual-evaluation-policy.json';
const POLICY_SCHEMA = 'schemas/calinium-storefront-visual-evaluation-policy.schema.json';
const REQUEST_SCHEMA = 'schemas/calinium-visual-evaluation-request.schema.json';
const RESULT_SCHEMA = 'schemas/calinium-visual-evaluation-result.schema.json';
const FINDING_SCHEMA = 'schemas/calinium-visual-finding.schema.json';
const HUMAN_REVIEW_SCHEMA = 'schemas/calinium-visual-human-review.schema.json';
const REQUEST_VERSION = 'visual-evaluation-request-v1';
const RESULT_VERSION = 'visual-evaluation-result-v1';
const FINDING_VERSION = 'visual-finding-v1';
const HUMAN_REVIEW_VERSION = 'visual-human-review-v1';
const REQUIRED_RULE_IDS = Object.freeze([
  'root_horizontal_overflow',
  'element_outside_viewport',
  'important_content_clipped',
  'important_elements_collide',
  'critical_media_broken',
  'touch_target_size_risk',
  'major_structure_exceeds_viewport',
  'important_landmark_missing',
  'product_purchase_interaction_missing',
  'navigation_interaction_failed',
  'architecture_presenter_mismatch',
  'fatal_runtime_or_resource_issue',
  'detailed_observation_unavailable'
]);

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function contractError(label, errors) {
  const error = new Error(`${label} validation failed: ${errors.join('; ')}`);
  error.name = 'VisualEvaluationContractError';
  error.validation = { valid: false, errors: [...errors] };
  return error;
}

function loadEvaluationPolicy(root) {
  const policy = readJson(path.join(root, POLICY_FILE));
  const errors = createSchemaValidator(root).validateFile(policy, POLICY_SCHEMA, 'storefront_visual_evaluation_policy');
  const ruleIds = new Set();
  for (const rule of policy.rules || []) {
    if (ruleIds.has(rule.id)) errors.push(`Visual-evaluation rule ${rule.id} is duplicated.`);
    ruleIds.add(rule.id);
  }
  for (const id of REQUIRED_RULE_IDS) if (!ruleIds.has(id)) errors.push(`Visual-evaluation policy is missing required rule ${id}.`);
  if ((policy.rules || []).length !== REQUIRED_RULE_IDS.length) errors.push('Visual-evaluation policy must contain exactly the versioned Phase D1 rules.');
  if (new Set(policy.severity_order || []).size !== 5) errors.push('Visual-evaluation severity order must contain five unique levels.');
  if (errors.length) throw contractError('Storefront visual-evaluation policy', [...new Set(errors)]);
  return { ...policy, ruleById: new Map(policy.rules.map((rule) => [rule.id, rule])) };
}

function resolveArchitectureRuntimeProvenance({ root, renderRequest, architectureRuntime = null }) {
  let runtime = architectureRuntime;
  if (!runtime) {
    const reference = renderRequest.provenance.source_artifact_manifest_reference;
    const manifestPath = assertOutputArtifact(root, reference);
    const manifest = readJson(manifestPath);
    runtime = manifest.architecture_runtime;
    if (!runtime) throw new Error('Trusted source manifest lacks architecture runtime provenance.');
    const sourceArchivePath = assertOutputArtifact(root, renderRequest.generation.artifact.source_artifact_reference);
    if (sha256File(sourceArchivePath) !== renderRequest.generation.artifact.source_artifact_sha256) {
      throw new Error('Trusted source architecture artifact checksum changed before visual evaluation.');
    }
  }
  const architecture = renderRequest.architecture;
  if (runtime.profile_id !== architecture.profile_id
    || runtime.profile_version !== architecture.profile_version
    || runtime.selection_revision_id !== architecture.selection_revision_id
    || !/^architecture-runtime-[a-f0-9]{20}$/.test(runtime.application_revision_id || '')) {
    throw new Error('Architecture runtime provenance does not match the Render Request.');
  }
  return JSON.parse(JSON.stringify(runtime));
}

function expectedEvaluationRequestId(request) {
  const base = { ...request };
  delete base.evaluation_request_id;
  return `visual-evaluation-request-${digest(base).slice(0, 20)}`;
}

function assertVisualEvaluationRequest(request, root) {
  const errors = createSchemaValidator(root).validateFile(request, REQUEST_SCHEMA, 'visual_evaluation_request');
  if (request?.evaluation_request_id && request.evaluation_request_id !== expectedEvaluationRequestId(request)) errors.push('Visual Evaluation Request ID does not match its canonical contents.');
  try {
    const policy = loadEvaluationPolicy(root);
    if (request?.policy?.policy_revision !== policy.policy_revision
      || request?.policy?.evaluator_version !== policy.evaluator_version
      || request?.policy?.observation_revision !== policy.observation_revision) errors.push('Visual Evaluation Request policy is stale.');
  } catch (error) { errors.push(error.message); }
  if (errors.length) throw contractError('Visual Evaluation Request', [...new Set(errors)]);
  return request;
}

function createVisualEvaluationRequest({ root, renderRequest, renderResult, architectureRuntime = null }) {
  assertRenderRequest(renderRequest, root);
  assertRenderResult(renderResult, renderRequest, root);
  if (renderResult.status !== 'passed') throw new Error('Objective visual evaluation requires a passed storefront Render Result.');
  const policy = loadEvaluationPolicy(root);
  const runtime = resolveArchitectureRuntimeProvenance({ root, renderRequest, architectureRuntime });
  const base = {
    schema_version: '1.0',
    contract_version: REQUEST_VERSION,
    policy: {
      policy_revision: policy.policy_revision,
      evaluator_version: policy.evaluator_version,
      observation_revision: policy.observation_revision
    },
    render: {
      request_id: renderRequest.request_id,
      render_id: renderResult.render_id,
      render_revision: renderResult.render_revision,
      render_result_checksum: digest(renderResult),
      screenshot_sha256: renderResult.screenshot?.sha256 || null,
      screenshot_reference: renderResult.screenshot?.artifact_reference || null
    },
    generation: JSON.parse(JSON.stringify(renderRequest.generation)),
    architecture: {
      profile_id: renderRequest.architecture.profile_id,
      profile_version: renderRequest.architecture.profile_version,
      selection_revision_id: renderRequest.architecture.selection_revision_id,
      runtime_application_revision_id: runtime.application_revision_id
    },
    route: JSON.parse(JSON.stringify(renderResult.route)),
    viewport: JSON.parse(JSON.stringify(renderResult.viewport)),
    provenance: {
      comparison_fixture_revision: renderRequest.provenance.comparison_fixture_revision,
      capture_policy_revision: renderRequest.provenance.capture_policy_revision,
      artifact_sha256: renderRequest.generation.artifact.sha256,
      source_manifest_reference: renderRequest.provenance.source_artifact_manifest_reference
    }
  };
  const request = { ...base, evaluation_request_id: `visual-evaluation-request-${digest(base).slice(0, 20)}` };
  return assertVisualEvaluationRequest(request, root);
}

function assertVisualFinding(finding, root) {
  const errors = createSchemaValidator(root).validateFile(finding, FINDING_SCHEMA, 'visual_finding');
  try {
    const rule = loadEvaluationPolicy(root).ruleById.get(finding?.rule_id);
    if (!rule) errors.push(`Visual Finding references unknown rule ${finding?.rule_id || '<missing>'}.`);
    else if (rule.version !== finding.rule_version || rule.category !== finding.category || rule.severity !== finding.severity) errors.push(`Visual Finding does not match versioned policy rule ${rule.id}.`);
  } catch (error) { errors.push(error.message); }
  const expectedId = finding?.finding_id && `visual-finding-${digest({ ...finding, finding_id: undefined, human_review_status: 'unreviewed' }).slice(0, 20)}`;
  if (finding?.finding_id && finding.finding_id !== expectedId) errors.push('Visual Finding ID does not match its canonical evidence.');
  if (errors.length) throw contractError('Visual Finding', [...new Set(errors)]);
  return finding;
}

function evaluationChecksum(result) { return digest(result); }

function expectedEvaluationId(result) {
  const base = { ...result };
  delete base.evaluation_id;
  return `visual-evaluation-${digest(base).slice(0, 20)}`;
}

function assertVisualEvaluationResult(result, root) {
  const errors = createSchemaValidator(root).validateFile(result, RESULT_SCHEMA, 'visual_evaluation_result');
  if (result?.evaluation_id && result.evaluation_id !== expectedEvaluationId(result)) errors.push('Visual Evaluation Result ID does not match its canonical contents.');
  const findingIds = new Set();
  for (const finding of result?.findings || []) {
    try { assertVisualFinding(finding, root); } catch (error) { errors.push(error.message); }
    if (finding.evaluation_request_id !== result.evaluation_request_id) errors.push(`Finding ${finding.finding_id} belongs to a different evaluation request.`);
    if (findingIds.has(finding.finding_id)) errors.push(`Visual Evaluation Result contains duplicate finding ${finding.finding_id}.`);
    findingIds.add(finding.finding_id);
  }
  if (result?.request?.evaluation_request_id !== result?.evaluation_request_id) errors.push('Visual Evaluation Result embeds a different request.');
  const findings = result?.findings || [];
  const expectedSummary = { total: findings.length, blocker: 0, high: 0, medium: 0, low: 0, info: 0, unreviewed: 0 };
  for (const finding of findings) {
    if (Object.hasOwn(expectedSummary, finding.severity)) expectedSummary[finding.severity] += 1;
    if (finding.human_review_status === 'unreviewed') expectedSummary.unreviewed += 1;
  }
  if (JSON.stringify(result?.summary) !== JSON.stringify(expectedSummary)) errors.push('Visual Evaluation Result summary does not match its findings.');
  if (result?.status === 'evaluated' && result?.error !== null) errors.push('Evaluated Visual Evaluation Result must not contain an error.');
  if (result?.status === 'failed' && !result?.error) errors.push('Failed Visual Evaluation Result must contain a safe error.');
  const material = findings.filter((finding) => ['blocker', 'high', 'medium'].includes(finding.severity));
  const low = findings.filter((finding) => finding.severity === 'low');
  const expectedGate = {
    status: material.length ? 'fail_review_required' : low.length ? 'pass_with_review' : 'pass',
    policy_revision: result?.request?.policy?.policy_revision,
    automatic_repair_allowed: false,
    human_review_required: material.length > 0 || low.length > 0,
    reason_codes: [...new Set((material.length ? material : low).map((finding) => finding.rule_id))].sort()
  };
  if (result?.status === 'evaluated' && JSON.stringify(result?.quality_gate) !== JSON.stringify(expectedGate)) errors.push('Visual Evaluation Result quality gate does not match its findings.');
  if (errors.length) throw contractError('Visual Evaluation Result', [...new Set(errors)]);
  return result;
}

function expectedReviewDecisionId(review) {
  const base = { ...review };
  delete base.review_decision_id;
  return `visual-review-${digest(base).slice(0, 20)}`;
}

function assertVisualHumanReview(review, evaluation, root) {
  const errors = createSchemaValidator(root).validateFile(review, HUMAN_REVIEW_SCHEMA, 'visual_human_review');
  if (review?.review_decision_id && review.review_decision_id !== expectedReviewDecisionId(review)) errors.push('Visual Human Review ID does not match its canonical contents.');
  if (review?.evaluation_id !== evaluation?.evaluation_id) errors.push('Visual Human Review belongs to a different evaluation.');
  if (review?.evaluation_checksum !== evaluationChecksum(evaluation)) errors.push('Visual Human Review is stale for the evaluated evidence.');
  const findingIds = new Set((evaluation?.findings || []).map((finding) => finding.finding_id));
  const decided = new Set();
  for (const decision of review?.finding_decisions || []) {
    if (!findingIds.has(decision.finding_id)) errors.push(`Visual Human Review references unknown finding ${decision.finding_id}.`);
    if (decided.has(decision.finding_id)) errors.push(`Visual Human Review decides finding ${decision.finding_id} more than once.`);
    decided.add(decision.finding_id);
  }
  if (errors.length) throw contractError('Visual Human Review', [...new Set(errors)]);
  return review;
}

function createVisualHumanReview({ evaluation, decision, findingDecisions = [], reviewerReference, notes = null, reviewedAt, root }) {
  const base = {
    schema_version: '1.0',
    contract_version: HUMAN_REVIEW_VERSION,
    evaluation_id: evaluation.evaluation_id,
    evaluation_checksum: evaluationChecksum(evaluation),
    review_revision: `visual-review-revision-${digest({ evaluation_id: evaluation.evaluation_id, decision, finding_decisions: findingDecisions, reviewer: reviewerReference, reviewed_at: reviewedAt }).slice(0, 20)}`,
    reviewed_at: reviewedAt,
    reviewer: { type: 'human', reference: reviewerReference },
    decision,
    notes,
    finding_decisions: findingDecisions.map((item) => ({ finding_id: item.finding_id, decision: item.decision, notes: item.notes || null }))
  };
  const review = { ...base, review_decision_id: `visual-review-${digest(base).slice(0, 20)}` };
  return assertVisualHumanReview(review, evaluation, root);
}

module.exports = {
  POLICY_FILE,
  POLICY_SCHEMA,
  REQUEST_SCHEMA,
  RESULT_SCHEMA,
  FINDING_SCHEMA,
  HUMAN_REVIEW_SCHEMA,
  REQUEST_VERSION,
  RESULT_VERSION,
  FINDING_VERSION,
  HUMAN_REVIEW_VERSION,
  REQUIRED_RULE_IDS,
  loadEvaluationPolicy,
  resolveArchitectureRuntimeProvenance,
  createVisualEvaluationRequest,
  assertVisualEvaluationRequest,
  assertVisualFinding,
  evaluationChecksum,
  assertVisualEvaluationResult,
  createVisualHumanReview,
  assertVisualHumanReview
};
