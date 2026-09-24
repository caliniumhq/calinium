'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { loadArchitectureRegistry } = require('../architecture/architecture-registry');
const { digest, sha256File } = require('../storefront-render/contracts');
const {
  POLICY_VERSION,
  loadRepairPlanningPolicy,
  assertBoundedRepairPlan
} = require('./contracts');

const APPROVED_PLAN_FILE = 'plans/core-2-phase-d3a-1-current-mobile-homepage-overflow-approved.json';
const APPROVED_PLAN_SCHEMA = 'schemas/calinium-approved-bounded-repair-plan.schema.json';
const APPROVED_PLAN_VERSION = 'approved-bounded-repair-plan-v1';
const APPROVED_STATUS = 'approved_for_bounded_execution';
const ALLOWED_FILE = 'apps/theme/assets/calinium-sections.css';
const REJECTED_PLAN_FILE = 'plans/core-2-phase-d3a-current-mobile-homepage-overflow.json';
const REJECTED_PLAN_ID = 'repair-plan-51818ae4d0b268572081';
const REJECTED_PLAN_CHECKSUM = '347949a1448ce135f70ad2309f52fdeec29764fb84d00fa2f94df6b332320eea';
const CANDIDATE_ID = 'repair-plan-candidate-6a3df91a1ad95f706b50';
const CANDIDATE_CHECKSUM = '1ff98e1b02a42821cefb59732562f69d759259753ea2f6874ad9c69338205d88';
const D3A_COMMIT = '1000000000000000000000000000000000000003';
const D3A_TAG = 'core-2-phase-d3a-complete';
const D3A1_TAG = 'core-2-phase-d3a-1-complete';

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function contractError(errors) {
  const unique = [...new Set(errors)];
  const error = new Error(`Approved Bounded Repair Plan validation failed: ${unique.join('; ')}`);
  error.name = 'ApprovedBoundedRepairPlanContractError';
  error.validation = { valid: false, errors: unique };
  return error;
}

function resolveBoundReference(root, reference) {
  if (!reference || path.isAbsolute(reference)) throw new Error('Approved repair-plan reference must be repository-relative.');
  const absolute = path.resolve(root, reference);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Approved repair-plan reference escapes the repository: ${reference}`);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) throw new Error(`Approved repair-plan evidence is unavailable: ${reference}`);
  return absolute;
}

function baseForApprovalId(approval) {
  const base = JSON.parse(JSON.stringify(approval));
  delete base.approval_id;
  delete base.approval_checksum;
  return base;
}

function expectedApprovalId(approval) {
  return `repair-plan-approval-${digest(baseForApprovalId(approval)).slice(0, 20)}`;
}

function expectedApprovalChecksum(approval) {
  const base = JSON.parse(JSON.stringify(approval));
  delete base.approval_checksum;
  return digest(base);
}

function finalizeHumanApproval(draft) {
  const base = baseForApprovalId(draft);
  const withId = { ...base, approval_id: `repair-plan-approval-${digest(base).slice(0, 20)}` };
  return { ...withId, approval_checksum: digest(withId) };
}

function baseForApprovedPlanId(plan) {
  const base = JSON.parse(JSON.stringify(plan));
  delete base.repair_plan_id;
  delete base.repair_plan_checksum;
  return base;
}

function expectedApprovedPlanId(plan) {
  return `repair-plan-${digest(baseForApprovedPlanId(plan)).slice(0, 20)}`;
}

function expectedApprovedPlanChecksum(plan) {
  const base = JSON.parse(JSON.stringify(plan));
  delete base.repair_plan_checksum;
  return digest(base);
}

function finalizeApprovedRepairPlan(draft) {
  const base = baseForApprovedPlanId(draft);
  const withId = { ...base, repair_plan_id: `repair-plan-${digest(base).slice(0, 20)}` };
  return { ...withId, repair_plan_checksum: digest(withId) };
}

function verifyCanonicalArtifact({ root, binding, idField, checksumField, errors, label }) {
  try {
    const absolute = resolveBoundReference(root, binding.reference);
    if (sha256File(absolute) !== binding.sha256) errors.push(`${label} file checksum is stale.`);
    const artifact = readJson(absolute);
    if (artifact[idField] !== binding[idField] || artifact[checksumField] !== binding[checksumField]) errors.push(`${label} identity/checksum binding is stale.`);
    const canonical = JSON.parse(JSON.stringify(artifact));
    const checksum = canonical[checksumField];
    delete canonical[checksumField];
    if (digest(canonical) !== checksum) errors.push(`${label} canonical checksum is invalid.`);
    return artifact;
  } catch (error) { errors.push(error.message); return null; }
}

function verifyEvidence(plan, root, errors) {
  let rejected;
  try {
    const binding = plan.supersession.rejected_plan;
    const absolute = resolveBoundReference(root, binding.reference);
    if (sha256File(absolute) !== binding.file_sha256) errors.push('Rejected first-plan file checksum changed.');
    rejected = readJson(absolute);
    assertBoundedRepairPlan(rejected, root);
    if (rejected.repair_plan_id !== REJECTED_PLAN_ID || rejected.repair_plan_checksum !== REJECTED_PLAN_CHECKSUM
      || binding.repair_plan_id !== REJECTED_PLAN_ID || binding.repair_plan_checksum !== REJECTED_PLAN_CHECKSUM
      || binding.status !== 'rejected_after_diagnostic' || binding.immutable !== true) errors.push('Rejected first-plan historical relationship is invalid.');
  } catch (error) { errors.push(error.message); }

  const candidate = verifyCanonicalArtifact({
    root,
    binding: plan.evidence.d3a_1_candidate,
    idField: 'repair_plan_id',
    checksumField: 'repair_plan_checksum',
    errors,
    label: 'D3A.1 candidate'
  });
  if (candidate && (candidate.repair_plan_id !== CANDIDATE_ID || candidate.repair_plan_checksum !== CANDIDATE_CHECKSUM
    || candidate.status !== 'proposed_unapproved' || candidate.approval?.approved !== false
    || candidate.approval?.execution_allowed !== false)) errors.push('D3A.1 candidate state is not the reviewed unapproved proposal.');

  const section = verifyCanonicalArtifact({
    root,
    binding: plan.evidence.section_isolation,
    idField: 'isolation_id',
    checksumField: 'isolation_checksum',
    errors,
    label: 'D3A.1 section isolation'
  });
  if (section && (section.reproduction?.geometry?.viewport_width !== 390
    || section.reproduction?.geometry?.document_scroll_width !== 657
    || section.reproduction?.authoritative_root_overflow !== 267)) errors.push('D3A.1 section isolation no longer reproduces authoritative geometry.');

  const descendant = verifyCanonicalArtifact({
    root,
    binding: plan.evidence.descendant_isolation,
    idField: 'isolation_id',
    checksumField: 'isolation_checksum',
    errors,
    label: 'D3A.1 descendant isolation'
  });
  if (descendant) {
    const tests = new Map((descendant.tests || []).map((item) => [item.id, item]));
    const decisive = ['third_card_price_label_display_none', 'grid_price_visually_hidden_display_none', 'grid_position_relative', 'grid_contain_layout'];
    const negative = ['third_card_image_display_none', 'third_card_visible_price_only_display_none', 'grid_max_inline_size', 'grid_zero_min_inline_size', 'grid_contain_inline_size', 'grid_overflow_hidden', 'grid_pseudos_disabled'];
    if (descendant.diagnosis?.status !== 'ROOT_CAUSE_ISOLATED'
      || descendant.diagnosis?.confidence !== 'high'
      || descendant.diagnosis?.culprit_selector !== plan.confirmed_root_cause.runtime_selector) errors.push('D3A.1 descendant diagnosis does not match the approved root cause.');
    if (decisive.some((id) => tests.get(id)?.before?.document_scroll_width !== 657 || tests.get(id)?.after?.document_scroll_width !== 390)) errors.push('D3A.1 decisive neutralization binding is incomplete.');
    if (negative.some((id) => tests.get(id)?.after?.document_scroll_width !== 657)) errors.push('D3A.1 negative-control binding is incomplete.');
    const positionRelative = tests.get('grid_position_relative');
    if (positionRelative?.track_after?.client_width !== 390 || positionRelative?.track_after?.scroll_width !== 977
      || positionRelative?.track_after?.overflow_x !== 'auto' || Math.abs(positionRelative?.track_after?.first_card_width - 304.1875) > 0.01) errors.push('Approved intervention did not preserve the local rail in D3A.1 evidence.');
  }

  try {
    if (sha256File(resolveBoundReference(root, plan.evidence.d1.result_reference)) !== plan.evidence.d1.file_sha256) errors.push('D1 result file checksum is stale.');
    const d1 = readJson(resolveBoundReference(root, plan.evidence.d1.result_reference));
    const finding = d1.findings?.find((item) => item.finding_id === plan.evidence.d1.finding_id);
    if (!finding || finding.rule_id !== 'root_horizontal_overflow' || finding.severity !== 'high'
      || finding.measured?.viewport_width !== 390 || finding.measured?.document_scroll_width !== 657
      || finding.measured?.horizontal_overflow_px !== 267) errors.push('D1 needs-fix geometry binding is invalid.');
  } catch (error) { errors.push(error.message); }

  try {
    const review = readJson(resolveBoundReference(root, plan.evidence.human_design_review.reference));
    if (sha256File(resolveBoundReference(root, plan.evidence.human_design_review.reference)) !== plan.evidence.human_design_review.file_sha256
      || digest(review) !== plan.evidence.human_design_review.checksum || review.review_id !== plan.evidence.human_design_review.review_id) errors.push('Human design-review binding is stale.');
    const decision = review.finding_decisions?.find((item) => item.finding_id === plan.target.authoritative_finding_id);
    if (decision?.decision !== 'needs_fix') errors.push('Approved plan target lacks the reviewed needs_fix decision.');
  } catch (error) { errors.push(error.message); }

  try {
    const registry = loadArchitectureRegistry(root);
    const profile = registry.profileById.get(plan.target.architecture_profile_id);
    if (!profile || profile.family_selections.responsive_behavior !== plan.ownership.primary_architecture_family_id
      || profile.family_selections.product_card !== plan.ownership.supporting_architecture_family_id) errors.push('Approved plan architecture-family provenance mismatch.');
  } catch (error) { errors.push(error.message); }

  try {
    if (sha256File(resolveBoundReference(root, ALLOWED_FILE)) !== plan.modification_scope.allowed_files[0].before_sha256) errors.push('Approved source file changed since plan promotion.');
  } catch (error) { errors.push(error.message); }
}

function assertApprovedBoundedRepairPlan(plan, root, { verifyEvidence: shouldVerifyEvidence = true } = {}) {
  const errors = createSchemaValidator(root).validateFile(plan, APPROVED_PLAN_SCHEMA, 'approved_bounded_repair_plan');
  if (errors.length) throw contractError(errors);
  let policy;
  try { policy = loadRepairPlanningPolicy(root); } catch (error) { errors.push(error.message); }
  if (plan.contract_version !== APPROVED_PLAN_VERSION) errors.push('Approved repair-plan contract version is unsupported.');
  if (plan.repair_plan_id !== expectedApprovedPlanId(plan)) errors.push('Approved Repair Plan ID does not match canonical contents.');
  if (plan.repair_plan_checksum !== expectedApprovedPlanChecksum(plan)) errors.push('Approved Repair Plan checksum does not match canonical contents.');
  if (!plan.human_approval || plan.human_approval.approval_id !== expectedApprovalId(plan.human_approval)
    || plan.human_approval.approval_checksum !== expectedApprovalChecksum(plan.human_approval)) errors.push('Human approval ID/checksum is not canonical.');
  if (policy && (plan.policy.policy_id !== policy.policy_id || plan.policy.policy_version !== POLICY_VERSION
    || plan.policy.policy_revision !== policy.policy_revision)) errors.push('Approved Repair Plan policy binding is stale.');
  if (plan.status !== APPROVED_STATUS || !plan.human_approval || plan.human_approval.decision !== APPROVED_STATUS
    || plan.human_approval.approved_candidate_id !== CANDIDATE_ID
    || plan.human_approval.approved_candidate_checksum !== CANDIDATE_CHECKSUM
    || plan.human_approval.approved_intervention !== 'position: relative'
    || plan.human_approval.approved_file !== ALLOWED_FILE) errors.push('Explicit human approval binding is incomplete.');
  if (plan.target.human_decision !== 'needs_fix' || plan.target.architecture_profile_id !== 'profile.current_calinium.v1'
    || plan.target.route_id !== 'homepage' || plan.target.viewport_id !== 'mobile-v1'
    || plan.target.browser_viewport.width !== 390 || plan.target.browser_viewport.height !== 844) errors.push('Approved target scope is invalid.');
  const allowed = plan.modification_scope.allowed_files || [];
  if (plan.modification_scope.maximum_file_count !== 1 || allowed.length !== 1 || allowed[0].path !== ALLOWED_FILE) errors.push('Approved plan must retain the exact one-file allowlist.');
  if (plan.intervention.primary_selector !== '.co-featured-collection--mobile-swipe .co-featured-collection__grid'
    || plan.intervention.declaration !== 'position: relative'
    || plan.intervention.minimum_diff_only !== true || plan.intervention.additional_containment_allowed !== false) errors.push('Approved intervention differs from the human-reviewed minimum diff.');
  const requiredInvariants = ['visually_hidden_price_label_present', 'accessible_price_semantics_preserved', 'global_accessibility_utility_unchanged'];
  if (requiredInvariants.some((item) => !plan.accessibility_invariants.includes(item))) errors.push('Approved plan does not preserve every accessibility invariant.');
  if ((plan.forbidden_scope || []).some((item) => typeof item !== 'string')
    || (policy?.required_forbidden_scope || []).some((item) => !plan.forbidden_scope.includes(item))
    || !plan.forbidden_scope.includes('visually_hidden_utility') || !plan.forbidden_scope.includes('accessible_price_label')) errors.push('Approved plan forbidden scope is incomplete.');
  if (plan.acceptance.before.viewport_width_css_px !== 390 || plan.acceptance.before.document_width_css_px !== 657
    || plan.acceptance.before.horizontal_overflow_css_px !== 267 || plan.acceptance.after.maximum_document_width_css_px !== 390
    || plan.acceptance.after.rounding_tolerance_css_px !== 1 || plan.acceptance.after.root_horizontal_overflow_finding_allowed !== false) errors.push('Approved before/after geometry contract is invalid.');
  if ((plan.verification.regression_matrix || []).length !== 16 || plan.verification.d1_target_required !== true
    || plan.verification.functional_rail_required !== true || plan.verification.accessible_price_label_required !== true
    || plan.verification.stabilized_d2_7_after_deterministic_pass !== true || plan.verification.human_final_review_required !== true
    || plan.verification.automatic_approval_allowed !== false) errors.push('Approved verification contract is incomplete.');
  if (plan.rollback.approved_baseline_tag !== D3A_TAG || plan.rollback.approved_baseline_commit !== D3A_COMMIT
    || plan.rollback.pre_execution_checkpoint_tag !== D3A1_TAG) errors.push('Approved rollback/pre-execution checkpoint binding is invalid.');
  if (plan.safety.automatic_repair_allowed !== false || plan.safety.human_final_review_required !== true
    || plan.safety.source_mutation_in_d3a_2_allowed !== false || plan.safety.repair_executed !== false
    || plan.safety.d3b_started !== false || plan.safety.openai_api_calls_required !== false) errors.push('Approved plan violates the D3A.2 no-execution boundary.');
  if (shouldVerifyEvidence) verifyEvidence(plan, root, errors);
  if (errors.length) throw contractError(errors);
  return plan;
}

function loadApprovedBoundedRepairPlan(root, reference = APPROVED_PLAN_FILE) {
  const plan = readJson(resolveBoundReference(root, reference));
  return assertApprovedBoundedRepairPlan(plan, root);
}

function assertNoD3A2ExecutionCapability(root) {
  const source = fs.readFileSync(path.join(root, 'ai/repair-planning/approved-plan.js'), 'utf8');
  const contractSource = source.slice(0, source.indexOf(`function ${assertNoD3A2ExecutionCapability.name}`));
  const forbidden = [/writeFile/i, /appendFile/i, /renameSync/i, /unlinkSync/i, /rmSync/i, /theme\s+(?:push|publish)/i, /write_themes/i, /fetch\s*\(/i];
  if (forbidden.some((pattern) => pattern.test(contractSource))) throw new Error('D3A.2 approved-plan contract contains execution or external-write capability.');
  return true;
}

module.exports = {
  APPROVED_PLAN_FILE,
  APPROVED_PLAN_SCHEMA,
  APPROVED_PLAN_VERSION,
  APPROVED_STATUS,
  ALLOWED_FILE,
  REJECTED_PLAN_FILE,
  REJECTED_PLAN_ID,
  REJECTED_PLAN_CHECKSUM,
  CANDIDATE_ID,
  CANDIDATE_CHECKSUM,
  D3A_COMMIT,
  D3A_TAG,
  D3A1_TAG,
  expectedApprovalId,
  expectedApprovalChecksum,
  finalizeHumanApproval,
  expectedApprovedPlanId,
  expectedApprovedPlanChecksum,
  finalizeApprovedRepairPlan,
  assertApprovedBoundedRepairPlan,
  loadApprovedBoundedRepairPlan,
  assertNoD3A2ExecutionCapability
};
