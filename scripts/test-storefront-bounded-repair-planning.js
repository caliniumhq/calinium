#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  PLAN_FILE,
  loadRepairPlanningPolicy,
  loadBoundedRepairPlan,
  finalizeRepairPlan,
  assertFindingRepairEligible,
  assertReliabilityEligibility,
  assertBoundedRepairPlan,
  assertNoD3AExecutionCapability
} = require('../ai/repair-planning');

const root = path.resolve(__dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));
const tests = [];
const test = (name, run) => tests.push({ name, run });

const plan = read(PLAN_FILE);
const evaluation = read(plan.evidence.d2.evaluation_reference);
const review = read(plan.evidence.d2.human_review_reference);
const d26 = read(plan.evidence.d2_6.reference);
const classifications = d26.runs.flatMap((run) => run.classifications || []);
const rootClassification = classifications.find((item) => item.classification_id === plan.evidence.d2_6.root_classification_id);
const symptomClassification = classifications.find((item) => item.classification_id === plan.evidence.d2_6.symptom_classification_id);

test('proposed plan binds the exact reviewed root finding and authoritative evidence', () => {
  const loaded = loadBoundedRepairPlan(root);
  assert.equal(loaded.target.authoritative_finding_id, 'design-finding-f4d218150f4162a33544');
  assert.equal(loaded.evidence.d2.human_review_id, 'design-review-bfc82d288460e1faa29c');
  assert.equal(loaded.evidence.screenshot.sha256, '578512decdd90eb4d7bd5f53e015b2ebb09b1a0d9e20ca18351065da275eae30');
});

test('unreviewed finding is rejected', () => {
  assert.throws(() => assertFindingRepairEligible({ evaluation, review: null, findingId: plan.target.authoritative_finding_id, root }), /unreviewed/);
});

test('false-positive finding is rejected for independent repair planning', () => {
  assert.throws(() => assertFindingRepairEligible({ evaluation, review, findingId: plan.downstream_symptom.finding_id, root }), /false_positive/);
});

test('preference-only finding is rejected for repair planning', () => {
  assert.throws(() => assertFindingRepairEligible({ evaluation, review, findingId: 'design-finding-303fe04909ab1c0f8b4d', root }), /preference_only/);
});

test('downstream symptom cannot authorize repair even with a needs-fix root decision', () => {
  assert.throws(() => assertFindingRepairEligible({ evaluation, review, findingId: plan.target.authoritative_finding_id, classification: symptomClassification, root }), /downstream symptom/);
});

test('stale checksum-bound human review is rejected', () => {
  const stale = clone(review);
  stale.evaluation_checksum = '0'.repeat(64);
  assert.throws(() => assertFindingRepairEligible({ evaluation, review: stale, findingId: plan.target.authoritative_finding_id, root }), /stale/);
});

test('architecture provenance mismatch is rejected', () => {
  const changed = clone(plan);
  changed.target.architecture_profile_id = 'profile.editorial_discovery.v1';
  assert.throws(() => assertBoundedRepairPlan(finalizeRepairPlan(changed), root), /profile\/route\/viewport mismatch|provenance mismatch/);
});

test('route and viewport mismatch is rejected', () => {
  const changed = clone(plan);
  changed.target.route_id = 'collection';
  changed.target.viewport_id = 'desktop-v1';
  changed.target.browser_viewport = { width: 1440, height: 1100 };
  assert.throws(() => assertBoundedRepairPlan(finalizeRepairPlan(changed), root), /profile\/route\/viewport mismatch|geometry\/scope mismatch/);
});

test('file-scope allowlist is mandatory and bounded', () => {
  const changed = clone(plan);
  changed.modification_scope.allowed_files = [];
  assert.throws(() => assertBoundedRepairPlan(finalizeRepairPlan(changed), root, { verifyEvidence: false }), /allowlist|too few items/);
});

test('every required forbidden scope is represented', () => {
  const changed = clone(plan);
  changed.forbidden_scope = changed.forbidden_scope.filter((item) => item !== 'editorial_discovery');
  assert.throws(() => assertBoundedRepairPlan(finalizeRepairPlan(changed), root, { verifyEvidence: false }), /forbidden scope/);
});

test('rollback checkpoint is mandatory and exact', () => {
  const changed = clone(plan);
  changed.rollback.checkpoint_tag = 'wrong-checkpoint';
  assert.throws(() => assertBoundedRepairPlan(finalizeRepairPlan(changed), root, { verifyEvidence: false }), /rollback checkpoint/);
});

test('verification plan requires D1, stabilized D2.7, 16 cells, and human review', () => {
  const changed = clone(plan);
  changed.verification.required_checks = changed.verification.required_checks.filter((item) => item !== 'd1_objective_evaluation');
  assert.throws(() => assertBoundedRepairPlan(finalizeRepairPlan(changed), root, { verifyEvidence: false }), /verification contract/);
});

test('D3A contains no repair execution or external-write capability', () => {
  assert.equal(assertNoD3AExecutionCapability(root), true);
  assert.equal(plan.safety.repair_execution_available, false);
});

test('D2.7 must remain repair-planning eligible', () => {
  assert.throws(() => assertReliabilityEligibility({ status: 'human_review_only', repair_planning_consumption_allowed: false, automatic_repair_allowed: false, human_review_required: true }), /not eligible/);
  assert.equal(assertReliabilityEligibility({ status: 'repair_planning_eligible', repair_planning_consumption_allowed: true, automatic_repair_allowed: false, human_review_required: true }).status, 'repair_planning_eligible');
});

test('automatic repair and D3A mutation remain false', () => {
  const policy = loadRepairPlanningPolicy(root);
  assert.equal(policy.safety.automatic_repair_allowed, false);
  assert.equal(policy.safety.mutation_allowed_in_d3a, false);
  assert.equal(plan.safety.automatic_repair_allowed, false);
  assert.equal(plan.safety.mutation_allowed, false);
});

test('root classification authorizes one Current-only CSS boundary and symptom remains separate', () => {
  const eligible = assertFindingRepairEligible({ evaluation, review, findingId: plan.target.authoritative_finding_id, classification: rootClassification, root });
  assert.equal(eligible.decision.decision, 'needs_fix');
  assert.equal(plan.modification_scope.allowed_files.length, 1);
  assert.equal(plan.modification_scope.allowed_files[0].path, 'apps/theme/assets/calinium-sections.css');
  assert.equal(plan.downstream_symptom.independent_repair_target, false);
});

(async () => {
  let passed = 0;
  for (const item of tests) {
    try { await item.run(); passed += 1; process.stdout.write(`✓ ${item.name}\n`); }
    catch (error) { process.stderr.write(`✗ ${item.name}\n${error.stack}\n`); process.exitCode = 1; }
  }
  process.stdout.write(`\n${passed}/${tests.length} bounded repair-planning tests passed.\n`);
})().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
