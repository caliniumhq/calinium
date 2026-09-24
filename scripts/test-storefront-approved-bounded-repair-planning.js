#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  APPROVED_PLAN_FILE,
  ALLOWED_FILE,
  REJECTED_PLAN_FILE,
  CANDIDATE_ID,
  CANDIDATE_CHECKSUM,
  D3A_COMMIT,
  D3A_TAG,
  D3A1_TAG,
  expectedApprovedPlanId,
  expectedApprovedPlanChecksum,
  expectedApprovalId,
  expectedApprovalChecksum,
  finalizeApprovedRepairPlan,
  assertApprovedBoundedRepairPlan,
  loadApprovedBoundedRepairPlan,
  assertNoD3A2ExecutionCapability,
  assertBoundedRepairPlan
} = require('../ai/repair-planning');

const root = path.resolve(__dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));
const tests = [];
const test = (name, run) => tests.push({ name, run });
const plan = read(APPROVED_PLAN_FILE);

function finalized(changed) { return finalizeApprovedRepairPlan(changed); }

test('tracked final plan loads with canonical ID and checksum', () => {
  const loaded = loadApprovedBoundedRepairPlan(root);
  assert.equal(loaded.repair_plan_id, 'repair-plan-14559b4e96bcc7f1c602');
  assert.equal(loaded.repair_plan_checksum, 'c10cf167b9b00dd3c7e4fc731273723ef2d2cc3155da8de12655a2625f7802d0');
  assert.equal(loaded.repair_plan_id, expectedApprovedPlanId(loaded));
  assert.equal(loaded.repair_plan_checksum, expectedApprovedPlanChecksum(loaded));
});

test('human approval is canonical and binds the reviewed candidate', () => {
  assert.equal(plan.human_approval.approval_id, expectedApprovalId(plan.human_approval));
  assert.equal(plan.human_approval.approval_checksum, expectedApprovalChecksum(plan.human_approval));
  assert.equal(plan.human_approval.approved_candidate_id, CANDIDATE_ID);
  assert.equal(plan.human_approval.approved_candidate_checksum, CANDIDATE_CHECKSUM);
  assert.equal(plan.human_approval.decision, 'approved_for_bounded_execution');
});

test('unapproved candidate cannot substitute for the tracked final plan', () => {
  const candidate = read(plan.evidence.d3a_1_candidate.reference);
  assert.equal(candidate.status, 'proposed_unapproved');
  assert.equal(candidate.approval.approved, false);
  assert.throws(() => assertApprovedBoundedRepairPlan(candidate, root), /validation failed/);
});

test('reviewed needs_fix and D1 root geometry remain authoritative', () => {
  assert.equal(plan.target.human_decision, 'needs_fix');
  assert.equal(plan.target.authoritative_finding_id, 'design-finding-f4d218150f4162a33544');
  assert.deepEqual(plan.acceptance.before, {
    viewport_width_css_px: 390,
    document_width_css_px: 657,
    horizontal_overflow_css_px: 267,
    d1_rule_id: 'root_horizontal_overflow'
  });
});

test('rejected first plan remains valid, immutable, and historically rejected', () => {
  const rejected = read(REJECTED_PLAN_FILE);
  assert.doesNotThrow(() => assertBoundedRepairPlan(rejected, root));
  assert.equal(plan.supersession.rejected_plan.repair_plan_id, rejected.repair_plan_id);
  assert.equal(plan.supersession.rejected_plan.repair_plan_checksum, rejected.repair_plan_checksum);
  assert.equal(plan.supersession.rejected_plan.immutable, true);
  assert.equal(plan.supersession.rejected_plan.status, 'rejected_after_diagnostic');
});

test('confirmed cause is the absolute accessible-label containing-block relationship', () => {
  assert.equal(plan.confirmed_root_cause.status, 'confirmed');
  assert.equal(plan.confirmed_root_cause.confidence, 'high');
  assert.equal(plan.confirmed_root_cause.containing_block_before, 'body');
  assert.equal(plan.confirmed_root_cause.geometry.right_css_px, 657.375);
  assert.match(plan.confirmed_root_cause.runtime_selector, /co-visually-hidden/);
});

test('decisive neutralizations and negative controls are both retained', () => {
  assert.equal(plan.confirmed_root_cause.decisive_neutralizations.length, 4);
  assert.equal(plan.confirmed_root_cause.negative_controls.length, 7);
  assert(plan.confirmed_root_cause.decisive_neutralizations.includes('grid_position_relative:657_to_390'));
  assert(plan.confirmed_root_cause.negative_controls.includes('grid_max_inline_size:657'));
});

test('approved intervention is exactly one selector-local declaration', () => {
  assert.equal(plan.intervention.primary_selector, '.co-featured-collection--mobile-swipe .co-featured-collection__grid');
  assert.equal(plan.intervention.declaration, 'position: relative');
  assert.equal(plan.intervention.minimum_diff_only, true);
  assert.equal(plan.intervention.stop_if_insufficient, true);
});

test('additional containment is not pre-authorized', () => {
  const changed = clone(plan);
  changed.intervention.additional_containment_allowed = true;
  assert.throws(() => assertApprovedBoundedRepairPlan(finalized(changed), root, { verifyEvidence: false }), /intervention|false/);
});

test('global overflow suppression remains forbidden', () => {
  assert.equal(plan.intervention.global_overflow_suppression_allowed, false);
  assert(plan.forbidden_scope.includes('global_overflow_suppression'));
});

test('file allowlist is exactly one Current CSS asset', () => {
  assert.equal(plan.modification_scope.maximum_file_count, 1);
  assert.deepEqual(plan.modification_scope.allowed_files.map((file) => file.path), [ALLOWED_FILE]);
});

test('an additional source file is rejected', () => {
  const changed = clone(plan);
  changed.modification_scope.allowed_files.push({ ...changed.modification_scope.allowed_files[0], path: 'apps/theme/assets/base.css' });
  assert.throws(() => assertApprovedBoundedRepairPlan(finalized(changed), root, { verifyEvidence: false }), /too many items|one-file allowlist/);
});

test('changing the allowed file is rejected', () => {
  const changed = clone(plan);
  changed.modification_scope.allowed_files[0].path = 'apps/theme/assets/base.css';
  assert.throws(() => assertApprovedBoundedRepairPlan(finalized(changed), root, { verifyEvidence: false }), /must equal|one-file allowlist/);
});

test('accessible price label and utility are immutable invariants', () => {
  assert(plan.accessibility_invariants.includes('visually_hidden_price_label_present'));
  assert(plan.accessibility_invariants.includes('accessible_price_semantics_preserved'));
  assert(plan.forbidden_scope.includes('visually_hidden_utility'));
  assert(plan.forbidden_scope.includes('accessible_price_label'));
});

test('removing an accessibility invariant is rejected', () => {
  const changed = clone(plan);
  changed.accessibility_invariants = changed.accessibility_invariants.filter((item) => item !== 'visually_hidden_price_label_present');
  assert.throws(() => assertApprovedBoundedRepairPlan(finalized(changed), root, { verifyEvidence: false }), /accessibility invariant|too few items/);
});

test('stale human approval checksum is rejected', () => {
  const changed = clone(plan);
  changed.human_approval.approved_intervention = 'contain: layout';
  assert.throws(() => assertApprovedBoundedRepairPlan(finalized(changed), root, { verifyEvidence: false }), /Human approval|Explicit human approval|must equal position: relative/);
});

test('stale diagnostic file binding is rejected', () => {
  const changed = clone(plan);
  changed.evidence.descendant_isolation.sha256 = '0'.repeat(64);
  assert.throws(() => assertApprovedBoundedRepairPlan(finalized(changed), root), /file checksum is stale/);
});

test('candidate identity drift is rejected', () => {
  const changed = clone(plan);
  changed.evidence.d3a_1_candidate.repair_plan_checksum = '0'.repeat(64);
  assert.throws(() => assertApprovedBoundedRepairPlan(finalized(changed), root), /candidate identity|candidate state/);
});

test('source checksum drift is rejected', () => {
  const changed = clone(plan);
  changed.modification_scope.allowed_files[0].before_sha256 = '0'.repeat(64);
  assert.throws(() => assertApprovedBoundedRepairPlan(finalized(changed), root), /source file changed/);
});

test('rollback binds D3A and the future D3A.1 pre-execution tag', () => {
  assert.equal(plan.rollback.approved_baseline_commit, D3A_COMMIT);
  assert.equal(plan.rollback.approved_baseline_tag, D3A_TAG);
  assert.equal(plan.rollback.pre_execution_checkpoint_tag, D3A1_TAG);
});

test('rollback drift is rejected', () => {
  const changed = clone(plan);
  changed.rollback.approved_baseline_commit = '0'.repeat(40);
  assert.throws(() => assertApprovedBoundedRepairPlan(finalized(changed), root, { verifyEvidence: false }), /must equal|rollback/);
});

test('verification retains the exact 16-cell matrix and human final review', () => {
  assert.equal(plan.verification.regression_matrix.length, 16);
  assert.equal(plan.verification.full_16_cell_render_required, true);
  assert.equal(plan.verification.full_16_cell_d1_required, true);
  assert.equal(plan.verification.stabilized_d2_7_after_deterministic_pass, true);
  assert.equal(plan.verification.human_final_review_required, true);
});

test('automatic execution and repair remain disabled', () => {
  assert.equal(plan.safety.bounded_execution_human_approved, true);
  assert.equal(plan.safety.automatic_repair_allowed, false);
  assert.equal(plan.safety.source_mutation_in_d3a_2_allowed, false);
  assert.equal(plan.safety.repair_executed, false);
  assert.equal(plan.safety.d3b_started, false);
});

test('approved-plan contract contains no repair or external-write capability', () => {
  assert.equal(assertNoD3A2ExecutionCapability(root), true);
});

(async () => {
  let passed = 0;
  for (const item of tests) {
    try { await item.run(); passed += 1; process.stdout.write(`✓ ${item.name}\n`); }
    catch (error) { process.stderr.write(`✗ ${item.name}\n${error.stack}\n`); process.exitCode = 1; }
  }
  process.stdout.write(`\n${passed}/${tests.length} approved bounded repair-planning tests passed.\n`);
})().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
