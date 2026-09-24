'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { loadArchitectureRegistry } = require('../architecture/architecture-registry');
const { digest, sha256File } = require('../storefront-render/contracts');
const { assertDesignEvaluationResult, assertDesignHumanReview } = require('../design-evaluation/contracts');

const POLICY_FILE = 'config/storefront-bounded-repair-planning.json';
const POLICY_SCHEMA = 'schemas/calinium-bounded-repair-planning-policy.schema.json';
const PLAN_SCHEMA = 'schemas/calinium-bounded-repair-plan.schema.json';
const PLAN_FILE = 'plans/core-2-phase-d3a-current-mobile-homepage-overflow.json';
const POLICY_VERSION = 'bounded-repair-planning-policy-v1';
const PLAN_VERSION = 'bounded-repair-plan-v1';

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function contractError(label, errors) {
  const error = new Error(`${label} validation failed: ${[...new Set(errors)].join('; ')}`);
  error.name = 'BoundedRepairPlanningContractError';
  error.validation = { valid: false, errors: [...new Set(errors)] };
  return error;
}

function resolveBoundReference(root, reference) {
  if (!reference || path.isAbsolute(reference)) throw new Error('Repair evidence reference must be a repository-relative path.');
  const absolute = path.resolve(root, reference);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Repair evidence reference escapes the repository: ${reference}`);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) throw new Error(`Repair evidence is unavailable: ${reference}`);
  return absolute;
}

function loadRepairPlanningPolicy(root) {
  const policy = readJson(path.join(root, POLICY_FILE));
  const errors = createSchemaValidator(root).validateFile(policy, POLICY_SCHEMA, 'bounded_repair_planning_policy');
  if (policy.policy_version !== POLICY_VERSION) errors.push('Bounded repair-planning policy version is unsupported.');
  if (policy.required_reliability.status !== 'repair_planning_eligible'
    || policy.required_reliability.repair_planning_consumption_allowed !== true) errors.push('Repair planning requires D2.7 repair-planning eligibility.');
  if (policy.safety.human_review_required !== true
    || policy.safety.automatic_repair_allowed !== false
    || policy.safety.mutation_allowed_in_d3a !== false
    || policy.safety.repair_execution_capability_allowed_in_d3a !== false) errors.push('Repair-planning policy violates the D3A no-mutation boundary.');
  if (errors.length) throw contractError('Bounded Repair-planning Policy', errors);
  return policy;
}

function baseForPlanId(plan) {
  const base = JSON.parse(JSON.stringify(plan));
  delete base.repair_plan_id;
  delete base.repair_plan_checksum;
  return base;
}

function expectedRepairPlanId(plan) {
  return `repair-plan-${digest(baseForPlanId(plan)).slice(0, 20)}`;
}

function expectedRepairPlanChecksum(plan) {
  const base = JSON.parse(JSON.stringify(plan));
  delete base.repair_plan_checksum;
  return digest(base);
}

function finalizeRepairPlan(draft) {
  const base = baseForPlanId(draft);
  const withId = { ...base, repair_plan_id: `repair-plan-${digest(base).slice(0, 20)}` };
  return { ...withId, repair_plan_checksum: digest(withId) };
}

function findDecision(review, findingId) {
  return review?.finding_decisions?.find((item) => item.finding_id === findingId) || null;
}

function assertFindingRepairEligible({ evaluation, review, findingId, classification = null, root }) {
  if (!review) throw new Error('Repair planning rejects an unreviewed finding.');
  assertDesignEvaluationResult(evaluation, root);
  assertDesignHumanReview(review, evaluation, root);
  const finding = evaluation.findings.find((item) => item.finding_id === findingId);
  if (!finding) throw new Error(`Repair planning target ${findingId} is absent from the bound evaluation.`);
  const decision = findDecision(review, findingId);
  if (!decision) throw new Error(`Repair planning target ${findingId} has no explicit human decision.`);
  if (decision.decision !== 'needs_fix') throw new Error(`Repair planning rejects human decision ${decision.decision}.`);
  if (classification) {
    if (classification.relationship?.mode === 'symptom_of' || classification.independent_repair_candidate !== true) {
      throw new Error('A downstream symptom cannot independently authorize repair planning.');
    }
    if (!['root_finding', 'independent'].includes(classification.relationship?.mode)) throw new Error('Repair target lacks an eligible root/independent classification.');
  }
  return { finding, decision };
}

function assertReliabilityEligibility(reliability) {
  if (reliability?.status !== 'repair_planning_eligible'
    || reliability?.repair_planning_consumption_allowed !== true
    || reliability?.automatic_repair_allowed !== false
    || reliability?.human_review_required !== true) throw new Error('D2.7 reliability is not eligible for human-reviewed repair planning.');
  return reliability;
}

function findClassification(artifact, classificationId) {
  return (artifact.runs || []).flatMap((run) => run.classifications || []).find((item) => item.classification_id === classificationId) || null;
}

function assertEvidenceBinding(plan, root, errors) {
  const target = plan.target;
  const evidence = plan.evidence;
  let render;
  try {
    render = readJson(resolveBoundReference(root, evidence.render.result_reference));
    if (digest(render) !== evidence.render.result_checksum) errors.push('Render Result checksum is stale.');
    if (render.render_id !== evidence.render.render_id || render.request_id !== evidence.render.request_id) errors.push('Render Result identity mismatch.');
    if (render.architecture?.profile_id !== target.architecture_profile_id
      || render.route?.id !== target.route_id
      || render.viewport?.id !== target.viewport_id
      || render.viewport?.width !== target.browser_viewport.width
      || render.viewport?.height !== target.browser_viewport.height) errors.push('Render Result profile/route/viewport mismatch.');
    if (render.objective_observations?.geometry?.document_scroll_width !== plan.acceptance.before.document_width_css_px
      || render.objective_observations?.geometry?.viewport_width !== plan.acceptance.before.viewport_width_css_px) errors.push('Render Result geometry does not match the bounded before-state.');
  } catch (error) { errors.push(error.message); }

  try {
    const screenshotPath = resolveBoundReference(root, evidence.screenshot.reference);
    if (sha256File(screenshotPath) !== evidence.screenshot.sha256) errors.push('Authoritative screenshot checksum is stale.');
    if (render?.screenshot?.sha256 !== evidence.screenshot.sha256
      || render?.screenshot?.width !== evidence.screenshot.width
      || render?.screenshot?.height !== evidence.screenshot.height) errors.push('Screenshot metadata does not match the Render Result.');
  } catch (error) { errors.push(error.message); }

  let d1;
  try {
    d1 = readJson(resolveBoundReference(root, evidence.d1.result_reference));
    if (digest(d1) !== evidence.d1.result_checksum || d1.evaluation_id !== evidence.d1.evaluation_id) errors.push('D1 evaluation binding is stale.');
    const finding = d1.findings?.find((item) => item.finding_id === evidence.d1.finding_id);
    if (!finding || finding.rule_id !== target.rule_id || finding.severity !== target.severity) errors.push('D1 root finding is missing or mismatched.');
    if (finding && (finding.route_id !== target.route_id || finding.viewport_id !== target.viewport_id
      || finding.architecture_profile_id !== target.architecture_profile_id
      || finding.measured?.viewport_width !== plan.acceptance.before.viewport_width_css_px
      || finding.measured?.document_scroll_width !== plan.acceptance.before.document_width_css_px
      || finding.measured?.horizontal_overflow_px !== plan.acceptance.before.horizontal_overflow_css_px)) errors.push('D1 finding geometry/scope mismatch.');
    if (sha256File(resolveBoundReference(root, evidence.d1.calibration_reference)) !== evidence.d1.calibration_sha256) errors.push('D1 calibration checksum is stale.');
    if (sha256File(resolveBoundReference(root, evidence.d1.human_review_reference)) !== evidence.d1.human_review_sha256) errors.push('D1 human-review fixture checksum is stale.');
  } catch (error) { errors.push(error.message); }

  let evaluation;
  let review;
  try {
    evaluation = readJson(resolveBoundReference(root, evidence.d2.evaluation_reference));
    review = readJson(resolveBoundReference(root, evidence.d2.human_review_reference));
    if (digest(evaluation) !== evidence.d2.evaluation_checksum || evaluation.evaluation_id !== evidence.d2.evaluation_id) errors.push('D2 evaluation binding is stale.');
    if (digest(review) !== evidence.d2.human_review_checksum || review.review_id !== evidence.d2.human_review_id) errors.push('D2 human-review binding is stale.');
    assertFindingRepairEligible({ evaluation, review, findingId: target.authoritative_finding_id, root });
    const symptomDecision = findDecision(review, plan.downstream_symptom.finding_id);
    if (symptomDecision?.decision !== 'false_positive') errors.push('Downstream product-row symptom is not bound to its false-positive independent decision.');
  } catch (error) { errors.push(error.message); }

  try {
    const d26 = readJson(resolveBoundReference(root, evidence.d2_6.reference));
    if (digest(d26) !== evidence.d2_6.checksum) errors.push('D2.6 evidence checksum is stale.');
    const rootClassification = findClassification(d26, evidence.d2_6.root_classification_id);
    const symptomClassification = findClassification(d26, evidence.d2_6.symptom_classification_id);
    if (!rootClassification) errors.push('D2.6 root classification is missing.');
    else {
      try { assertFindingRepairEligible({ evaluation, review, findingId: target.authoritative_finding_id, classification: rootClassification, root }); }
      catch (error) { errors.push(error.message); }
      if (rootClassification.responsibility !== plan.responsibility.classification
        || !rootClassification.architecture_context?.family_ids?.includes(plan.ownership.architecture_family_id)) errors.push('D2.6 responsibility or family ownership mismatch.');
    }
    if (!symptomClassification || symptomClassification.relationship?.mode !== 'symptom_of'
      || symptomClassification.relationship?.target_observation_id !== evidence.d2_6.root_observation_id
      || symptomClassification.independent_repair_candidate !== false) errors.push('D2.6 downstream symptom relationship mismatch.');
  } catch (error) { errors.push(error.message); }

  try {
    const d27 = readJson(resolveBoundReference(root, evidence.d2_7.reference));
    if (digest(d27) !== evidence.d2_7.checksum) errors.push('D2.7 evidence checksum is stale.');
    if (d27.report?.report_id !== evidence.d2_7.report_id || digest(d27.report) !== evidence.d2_7.report_checksum) errors.push('D2.7 report identity/checksum mismatch.');
    assertReliabilityEligibility(d27.report?.reliability);
    const roots = (d27.runs || []).flatMap((run) => run.observations || []).filter((item) => item.relationship?.mode === 'root_finding'
      && item.objective_facts?.some((fact) => fact.finding_id === evidence.d1.calibration_finding_id));
    if (roots.length !== 2 || roots.some((item) => !evidence.d2_7.root_observation_ids.includes(item.observation_id)
      || item.profile_id !== target.architecture_profile_id || item.route_id !== target.route_id
      || item.viewport_id !== target.viewport_id || item.screenshot_sha256 !== evidence.screenshot.sha256)) errors.push('D2.7 repeated root observation binding mismatch.');
  } catch (error) { errors.push(error.message); }

  try {
    const registry = loadArchitectureRegistry(root);
    const profile = registry.profileById.get(target.architecture_profile_id);
    if (!profile || profile.family_selections.responsive_behavior !== plan.ownership.architecture_family_id) errors.push('Architecture profile/family provenance mismatch.');
    for (const binding of evidence.architecture.registry_bindings) {
      if (sha256File(resolveBoundReference(root, binding.reference)) !== binding.sha256) errors.push(`Architecture registry binding is stale: ${binding.reference}`);
    }
  } catch (error) { errors.push(error.message); }

  for (const file of plan.modification_scope.allowed_files || []) {
    try { if (sha256File(resolveBoundReference(root, file.path)) !== file.before_sha256) errors.push(`Allowed file changed since planning: ${file.path}`); }
    catch (error) { errors.push(error.message); }
  }
}

function assertBoundedRepairPlan(plan, root, { verifyEvidence = true } = {}) {
  const errors = createSchemaValidator(root).validateFile(plan, PLAN_SCHEMA, 'bounded_repair_plan');
  let policy;
  try { policy = loadRepairPlanningPolicy(root); } catch (error) { errors.push(error.message); }
  if (plan.contract_version !== PLAN_VERSION) errors.push('Bounded repair-plan contract version is unsupported.');
  if (plan.repair_plan_id !== expectedRepairPlanId(plan)) errors.push('Repair Plan ID does not match canonical contents.');
  if (plan.repair_plan_checksum !== expectedRepairPlanChecksum(plan)) errors.push('Repair Plan checksum does not match canonical contents.');
  if (policy && (plan.policy.policy_id !== policy.policy_id || plan.policy.policy_version !== policy.policy_version
    || plan.policy.policy_revision !== policy.policy_revision)) errors.push('Repair Plan policy binding is stale.');
  if (plan.status !== 'proposed' || plan.safety.human_approval_required !== true
    || plan.safety.mutation_allowed !== false || plan.safety.automatic_repair_allowed !== false
    || plan.safety.repair_execution_available !== false || plan.safety.d3b_started !== false) errors.push('Repair Plan violates the proposed human-gated D3A state.');
  if ((plan.modification_scope.allowed_files || []).length < 1
    || plan.modification_scope.allowed_files.length > plan.modification_scope.maximum_file_count) errors.push('Repair Plan requires a bounded file-scope allowlist.');
  if (new Set(plan.modification_scope.allowed_files.map((item) => item.path)).size !== plan.modification_scope.allowed_files.length) errors.push('Repair Plan file allowlist contains duplicates.');
  if ((plan.forbidden_scope || []).length < (policy?.required_forbidden_scope || []).length
    || policy?.required_forbidden_scope.some((item) => !plan.forbidden_scope.includes(item))) errors.push('Repair Plan does not represent every required forbidden scope.');
  if (plan.rollback.checkpoint_tag !== 'core-2-phase-d2-7-complete'
    || plan.rollback.checkpoint_commit !== '1000000000000000000000000000000000000009') errors.push('Repair Plan rollback checkpoint is missing or incorrect.');
  if (plan.acceptance.before.document_width_css_px - plan.acceptance.before.viewport_width_css_px !== plan.acceptance.before.horizontal_overflow_css_px
    || plan.acceptance.after.maximum_document_width_css_px !== plan.acceptance.before.viewport_width_css_px
    || plan.acceptance.after.root_horizontal_overflow_finding_allowed !== false) errors.push('Repair Plan before/after geometry contract is inconsistent.');
  if ((plan.verification.regression_matrix || []).length !== 16
    || plan.verification.human_review_required !== true
    || plan.verification.automatic_approval_allowed !== false
    || !(plan.verification.required_checks || []).includes('d1_objective_evaluation')
    || !(plan.verification.required_checks || []).includes('stabilized_d2_7_observation_evaluation')) errors.push('Repair Plan verification contract is incomplete.');
  if (plan.intervention.global_overflow_suppression_allowed !== false
    || /html\s*,?\s*body|overflow-x\s*:\s*hidden/i.test(plan.intervention.proposed_change)) errors.push('Repair Plan may not hide the root defect with global overflow suppression.');
  if (verifyEvidence) assertEvidenceBinding(plan, root, errors);
  if (errors.length) throw contractError('Bounded Repair Plan', errors);
  return plan;
}

function loadBoundedRepairPlan(root, reference = PLAN_FILE) {
  const plan = readJson(resolveBoundReference(root, reference));
  return assertBoundedRepairPlan(plan, root);
}

function assertNoD3AExecutionCapability(root) {
  const files = ['ai/repair-planning/contracts.js', 'ai/repair-planning/index.js'];
  const source = files.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  const forbiddenPatterns = [
    ['write', 'File'].join(''),
    ['append', 'File'].join(''),
    ['rename', 'Sync'].join(''),
    ['unlink', 'Sync'].join(''),
    ['rm', 'Sync'].join(''),
    ['theme', '\\s+(?:push|publish)'].join(''),
    ['write', '_themes'].join(''),
    ['admin', '\\.graphql'].join(''),
    ['fetch', '\\s*\\('].join('')
  ];
  if (forbiddenPatterns.some((pattern) => new RegExp(pattern, 'i').test(source))) throw new Error('D3A repair-planning source contains repair execution or external-write capability.');
  return true;
}

module.exports = {
  POLICY_FILE,
  POLICY_SCHEMA,
  PLAN_SCHEMA,
  PLAN_FILE,
  POLICY_VERSION,
  PLAN_VERSION,
  loadRepairPlanningPolicy,
  expectedRepairPlanId,
  expectedRepairPlanChecksum,
  finalizeRepairPlan,
  assertFindingRepairEligible,
  assertReliabilityEligibility,
  assertBoundedRepairPlan,
  loadBoundedRepairPlan,
  assertNoD3AExecutionCapability
};
