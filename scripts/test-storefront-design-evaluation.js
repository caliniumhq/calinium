#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  buildDesignEvaluationRequest,
  createApprovedFixtureProvider,
  createProviderAdapter,
  invokeProvider,
  evaluateDesign,
  measureRepeatConsistency,
  withCanonicalId,
  assertDesignEvaluationRequest,
  assertDesignEvaluationResult,
  assertDesignHumanReview,
  reviewedDesignGate,
  loadDesignEvaluationPolicy
} = require('../ai/design-evaluation');

const root = path.resolve(__dirname, '..');
const clone = (value) => JSON.parse(JSON.stringify(value));
const tests = [];
function test(name, run) { tests.push({ name, run }); }

let request;
let provider;
let evaluation;

test('policy has the exact bounded 12-dimension taxonomy and forbids mutation/scoring', () => {
  const policy = loadDesignEvaluationPolicy(root);
  assert.equal(policy.dimensions.length, 12);
  assert.equal(policy.automatic_repair_allowed, false);
  assert.equal(policy.single_numeric_score_allowed, false);
});

test('exact approved comparison builds a 16-cell provenance-bound request', () => {
  request = buildDesignEvaluationRequest({ root });
  assert.equal(request.cells.length, 16);
  assert.equal(request.context.architecture_profiles.length, 2);
  assert.equal(request.context.design_dna.status, 'not_available');
  assert.equal(request.context.design_dna.reason_code, 'approved_design_dna_payload_absent_from_comparison_provenance');
  assert.equal(request.cells.reduce((count, cell) => count + cell.objective_evaluation.findings.length, 0), 1);
  assert.ok(request.cells.every((cell) => fs.existsSync(path.join(root, cell.screenshot.artifact_reference))));
});

test('approved multimodal calibration consumes and binds all actual screenshots', async () => {
  provider = createApprovedFixtureProvider({ root });
  const response = await invokeProvider({ root, request, provider, runSequence: 1 });
  assert.equal(response.screenshot_evidence.length, 16);
  assert.equal(response.dimension_assessments.length, 22);
  assert.equal(response.findings.length, 6);
});

test('subjective evaluation runs twice and remains review-required automatically', async () => {
  evaluation = await evaluateDesign({ root, request, provider });
  assert.equal(evaluation.status, 'evaluated');
  assert.equal(evaluation.provider_runs.length, 2);
  assert.equal(evaluation.repeat_consistency.runs, 2);
  assert.equal(evaluation.repeat_consistency.dimension_categorical_agreement, 1);
  assert.equal(evaluation.repeat_consistency.high_impact_finding_agreement, 1);
  assert.equal(evaluation.repeat_consistency.responsibility_agreement, 1);
  assert.equal(evaluation.subjective_gate.status, 'review_required');
  assert.equal(evaluation.subjective_gate.automatic_repair_allowed, false);
  assertDesignEvaluationResult(evaluation, root);
});

test('D1 objective overflow remains separate and is referenced only for design impact', () => {
  assert.equal(evaluation.objective_quality_summary.objective_finding_count, 1);
  const finding = evaluation.findings.find((item) => item.objective_relation.mode === 'design_impact_of_objective');
  assert.deepEqual(finding.objective_relation.objective_finding_ids, ['visual-finding-2093852270c8474f3079']);
  assert.equal(evaluation.combined_quality_summary.systems_merged_into_score, false);
});

test('changed screenshot hash fails closed before evaluation', async () => {
  const changed = clone(request);
  changed.cells[0].screenshot.sha256 = '0'.repeat(64);
  await assert.rejects(() => invokeProvider({ root, request: changed, provider, runSequence: 1 }), /screenshot integrity failed/);
});

test('architecture mismatch is rejected by the request contract', () => {
  const changed = clone(request);
  const cell = { ...changed.cells[0], profile_id: 'profile.unbound.v1' };
  changed.cells[0] = withCanonicalId('design-cell', cell, 'cell_id');
  const normalized = withCanonicalId('design-evaluation-request', changed, 'request_id');
  assert.throws(() => assertDesignEvaluationRequest(normalized, root), /no bound architecture profile/);
});

test('available context checksum mismatch is rejected', () => {
  const changed = clone(request);
  changed.context.preset.checksum = '0'.repeat(64);
  const normalized = withCanonicalId('design-evaluation-request', changed, 'request_id');
  assert.throws(() => assertDesignEvaluationRequest(normalized, root), /preset context checksum is stale/);
});

test('provider failure returns a safe failed evaluation without mutation', async () => {
  const failing = createProviderAdapter({
    metadata: { interface_version: 'storefront-design-provider-v1', provider_id: 'failing-test', provider_version: '1.0.0', provider_kind: 'mock', model: null },
    evaluate: async () => { throw new Error('private provider detail'); }
  });
  const result = await evaluateDesign({ root, request, provider: failing });
  assert.equal(result.status, 'failed');
  assert.equal(result.error.code, 'design_evaluation_unavailable');
  assert.doesNotMatch(result.error.message, /private provider detail/);
  assert.equal(result.safety.automatic_mutation_allowed, false);
});

test('malformed provider response fails safely', async () => {
  const malformed = createProviderAdapter({
    metadata: { interface_version: 'storefront-design-provider-v1', provider_id: 'malformed-test', provider_version: '1.0.0', provider_kind: 'mock', model: null },
    evaluate: async () => ({})
  });
  const result = await evaluateDesign({ root, request, provider: malformed });
  assert.equal(result.status, 'failed');
  assert.equal(result.subjective_gate.status, 'review_required');
});

test('repeat disagreement is recorded rather than hidden', async () => {
  const first = await invokeProvider({ root, request, provider, runSequence: 1 });
  const second = clone(await invokeProvider({ root, request, provider, runSequence: 2 }));
  second.dimension_assessments[0].judgment = second.dimension_assessments[0].judgment === 'strong' ? 'acceptable' : 'strong';
  const consistency = measureRepeatConsistency([first, second]);
  assert.ok(consistency.dimension_categorical_agreement < 1);
  assert.ok(consistency.unstable_items.some((item) => item.startsWith('assessment:')));
  assert.equal(consistency.identical_prose_required, false);
});

test('human review is exact-checksum bound and derives repair-required gate', () => {
  const review = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/storefront-design-human-review-phase-d2.json'), 'utf8'));
  assertDesignHumanReview(review, evaluation, root);
  const gate = reviewedDesignGate(evaluation, review, root);
  assert.equal(gate.status, 'repair_required');
  assert.equal(gate.automatic_repair_allowed, false);
  const stale = clone(review); stale.evaluation_checksum = '1'.repeat(64);
  assert.throws(() => assertDesignHumanReview(stale, evaluation, root), /stale|ID does not match/);
});

test('source contains no automatic storefront mutation capability', () => {
  const source = fs.readdirSync(path.join(root, 'ai/design-evaluation')).filter((file) => file.endsWith('.js'))
    .map((file) => fs.readFileSync(path.join(root, 'ai/design-evaluation', file), 'utf8')).join('\n');
  assert.doesNotMatch(source, /write_themes|theme\s+push|theme\s+publish|shopifyAdminMutation|admin\.graphql\s*\(/i);
  assert.doesNotMatch(source, /apps\/theme|assets\/.*\.css|sections\/.*\.liquid/);
});

(async () => {
  let passed = 0;
  for (const item of tests) {
    try { await item.run(); passed += 1; process.stdout.write(`✓ ${item.name}\n`); }
    catch (error) { process.stderr.write(`✗ ${item.name}\n${error.stack}\n`); process.exitCode = 1; }
  }
  process.stdout.write(`\n${passed}/${tests.length} storefront design-evaluation tests passed.\n`);
})().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
