#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  withCanonicalId,
  digest,
  loadLiveDesignConfiguration,
  buildStabilizationRequest,
  loadObservationStabilizationPolicy,
  assertConcreteObservation,
  createConcreteObservation,
  presenterContext,
  normalizeDrafts,
  matchingPhenomenon,
  observationMatchingPhenomenon,
  strictObservationKey,
  normalizeLegacyObservationRun,
  synthesizeControlledComparisons,
  supportForRuns,
  classifyConcreteRun,
  measureRuns,
  observationReliabilityDecision,
  createObservationStabilizationReport,
  offlineGoNoGo,
  runOfflineObservationReprocessing,
  strictStageOneInstructions,
  buildStrictObservationResponsesRequest,
  normalizeStrictObservationOutput,
  createStrictObservationProvider,
  runObservationLiveValidation
} = require('../ai/design-evaluation');

const root = path.resolve(__dirname, '..');
const sourceEvaluation = JSON.parse(fs.readFileSync(path.join(root, 'output/storefront-design-evaluations/phase-d2-5-live-calibration/live-design-evaluation-result.json'), 'utf8'));
const d26Live = JSON.parse(fs.readFileSync(path.join(root, 'output/storefront-design-evaluations/phase-d2-6-visual-judgment-stabilization/limited-live-validation.json'), 'utf8'));
const request = buildStabilizationRequest({ root, sourceEvaluation, mode: 'limited_live_validation' });
const policy = loadObservationStabilizationPolicy(root);
const clone = (value) => JSON.parse(JSON.stringify(value));
const tests = [];
function test(name, run) { tests.push({ name, run }); }

function syntheticObservation({
  runSequence = 1,
  profile = 'profile.current_calinium.v1',
  route = 'homepage',
  viewport = 'mobile-v1',
  phenomenon = 'element_crowding',
  component = 'header_identity_controls',
  evidence = 'The search icon is immediately adjacent to the visible wordmark.',
  confidence = 'high',
  objectiveFacts = [],
  relationship = { mode: 'independent', root_evidence_key: null }
} = {}) {
  const cell = request.cells.find((item) => item.profile_id === profile && item.route_id === route && item.viewport_id === viewport);
  return createConcreteObservation({
    run_sequence: runSequence,
    profile_id: profile,
    route_id: route,
    viewport_id: viewport,
    cell_id: cell.cell_id,
    screenshot_sha256: cell.screenshot.sha256,
    phenomenon,
    phenomenon_kind: policy.phenomenonById.get(phenomenon).kind,
    component,
    visible_region: 'Bound visible region',
    region_reference: { kind: 'presenter_landmark', landmark_id: component, bounds: null },
    evidence_summary: evidence,
    confidence,
    objective_facts: objectiveFacts,
    source_observation_ids: [],
    relationship,
    architecture_presenter: presenterContext({ component, cell, request, root })
  }, request, root);
}

function rawLiveOutput() {
  const rootFacts = request.objective_facts.filter((fact) => fact.rule_id === 'root_horizontal_overflow');
  return {
    schema_version: '1.0',
    cell_inspections: request.cells.map((cell) => ({ cell_id: cell.cell_id, status: rootFacts.some((fact) => fact.cell_id === cell.cell_id) ? 'concrete_observations_recorded' : 'no_concrete_condition_observed' })),
    observations: rootFacts.map((fact, index) => ({
      local_key: `d1_overflow_${index}`,
      cell_id: fact.cell_id,
      phenomenon: 'horizontal_overflow',
      component: 'page_root',
      visible_region: 'Full mobile page width',
      region_reference: { kind: 'presenter_landmark', landmark_id: 'page_root', bounds: null },
      evidence_summary: 'Visible page content extends beyond the right edge of the mobile viewport.',
      confidence: 'high',
      objective_finding_ids: [fact.finding_id]
    })),
    objective_fact_acknowledgements: request.objective_facts.map((fact) => ({ finding_id: fact.finding_id, status: 'acknowledged' }))
  };
}

function apiPayload(output, id = 'resp_d2_7_mock') {
  return {
    id, object: 'response', status: 'completed', model: 'gpt-5.6-sol',
    output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(output) }] }],
    usage: { input_tokens: 900, output_tokens: 220, total_tokens: 1120, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 80 } }
  };
}
function jsonResponse(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } }); }

test('strict Stage-1 policy has bounded concrete ontology and exact cost scope', () => {
  assert.ok(policy.phenomena.length >= 15);
  assert.ok(policy.phenomenonById.has('horizontal_overflow'));
  assert.ok(policy.phenomenonById.has('uniform_grid_structure'));
  assert.equal(policy.limited_live_validation.screenshot_cells, 12);
  assert.equal(policy.limited_live_validation.accepted_repeats, 2);
});

test('concrete observation binds one screenshot, region, checksum, and presenter provenance', () => {
  const observation = syntheticObservation();
  assert.equal(assertConcreteObservation(observation, request, root), observation);
  assert.equal(observation.frozen, true);
  assert.equal(observation.architecture_presenter.system_scope, 'architecture_family');
});

test('abstract interpretation is rejected from Stage 1', () => {
  const changed = clone(syntheticObservation());
  changed.evidence_summary = 'This is a worse and less polished header.';
  assert.throws(() => assertConcreteObservation(withCanonicalId('concrete-visual-observation', changed, 'observation_id'), request, root), /abstract quality or comparison judgment/);
});

test('responsibility and causal attribution are rejected from Stage 1', () => {
  const changed = clone(syntheticObservation());
  changed.evidence_summary = 'The architecture level is responsible for the visible spacing.';
  assert.throws(() => assertConcreteObservation(withCanonicalId('concrete-visual-observation', changed, 'observation_id'), request, root), /responsibility or causal attribution/);
});

test('recommendation and repair instructions are rejected from Stage 1', () => {
  const changed = clone(syntheticObservation());
  changed.evidence_summary = 'Increase the width token to fix the header.';
  assert.throws(() => assertConcreteObservation(withCanonicalId('concrete-visual-observation', changed, 'observation_id'), request, root), /recommendation or repair instruction/);
});

test('unnamed unbounded regions are rejected', () => {
  const observation = syntheticObservation({ component: 'other_named_region' });
  const changed = clone(observation);
  changed.region_reference.landmark_id = null;
  assert.throws(() => assertConcreteObservation(withCanonicalId('concrete-visual-observation', changed, 'observation_id'), request, root), /require a landmark or bounded-region/);
});

test('per-screenshot observation cannot aggregate profile or viewport scope', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(root, 'schemas/calinium-concrete-visual-observation.schema.json'), 'utf8'));
  assert.ok(schema.required.includes('profile_id'));
  assert.equal(Object.prototype.hasOwnProperty.call(schema.properties, 'profile_ids'), false);
  assert.ok(schema.required.includes('viewport_id'));
});

test('cross-profile comparison uses two frozen structural source observations', () => {
  const current = syntheticObservation({ profile: 'profile.current_calinium.v1', viewport: 'desktop-v1', phenomenon: 'uniform_grid_structure', component: 'product_grid', evidence: 'Visible cards use equal sizes and aligned rows.' });
  const editorial = syntheticObservation({ profile: 'profile.editorial_discovery.v1', viewport: 'desktop-v1', phenomenon: 'featured_first_grid_structure', component: 'product_grid', evidence: 'One visible product surface is larger before smaller cards.' });
  const comparisons = synthesizeControlledComparisons({ observations: [current, editorial], root });
  assert.equal(comparisons.length, 1);
  assert.equal(comparisons[0].comparison_type, 'cross_profile');
});

test('cross-viewport comparison remains separate from screenshot observation', () => {
  const desktop = syntheticObservation({ viewport: 'desktop-v1', phenomenon: 'uniform_grid_structure', component: 'product_grid', evidence: 'Visible cards form equal columns.' });
  const mobile = syntheticObservation({ viewport: 'mobile-v1', phenomenon: 'sequential_content_order', component: 'product_grid', evidence: 'Visible cards appear in a linear sequence.' });
  const comparisons = synthesizeControlledComparisons({ observations: [desktop, mobile], root });
  assert.equal(comparisons.length, 1);
  assert.equal(comparisons[0].comparison_type, 'cross_viewport');
});

test('normalization matches safe prose-independent phenomenon families', () => {
  assert.equal(matchingPhenomenon('word_break', 'footer_identity'), matchingPhenomenon('isolated_line_wrap', 'footer_identity'));
  assert.equal(matchingPhenomenon('element_crowding', 'header_identity_controls'), matchingPhenomenon('dense_local_grouping', 'header_identity_controls'));
  assert.notEqual(matchingPhenomenon('word_break', 'footer_identity'), matchingPhenomenon('element_crowding', 'footer_identity'));
  assert.equal(
    observationMatchingPhenomenon({ phenomenon: 'stacked_grouping', component: 'product_grid', evidence_summary: 'Two cards occupy the first row and one occupies a second row.' }),
    observationMatchingPhenomenon({ phenomenon: 'uniform_grid_structure', component: 'product_grid', evidence_summary: 'Equal-width cards use two columns, with a third card beginning the next row.' })
  );
});

test('cross-run key requires matching component and exact screenshot scope', () => {
  const left = syntheticObservation({ phenomenon: 'word_break', component: 'footer_identity', viewport: 'desktop-v1' });
  const proseVariant = syntheticObservation({ runSequence: 2, phenomenon: 'isolated_line_wrap', component: 'footer_identity', viewport: 'desktop-v1' });
  const otherRoute = syntheticObservation({ runSequence: 2, phenomenon: 'isolated_line_wrap', component: 'footer_identity', route: 'collection', viewport: 'desktop-v1' });
  assert.equal(strictObservationKey(left), strictObservationKey(proseVariant));
  assert.notEqual(strictObservationKey(left), strictObservationKey(otherRoute));
});

test('duplicate suppression merges only same phenomenon family, component, and cell', () => {
  const cell = request.cells[0];
  const base = { phenomenon: 'element_crowding', component: 'header_identity_controls', cell, sourceObservationIds: [], confidence: 'high', objectiveFacts: [] };
  const result = normalizeDrafts([base, { ...base, phenomenon: 'dense_local_grouping' }, { ...base, component: 'navigation' }]);
  assert.equal(result.drafts.length, 2);
  assert.equal(result.duplicateRecordsSuppressed, 1);
});

test('root and child visibility loss remain linked without independent authority', () => {
  const fact = request.objective_facts.find((item) => item.rule_id === 'root_horizontal_overflow');
  const trusted = { finding_id: fact.finding_id, rule_id: fact.rule_id, severity: fact.severity, authority: 'phase_d1_authoritative' };
  const rootObservation = syntheticObservation({ phenomenon: 'horizontal_overflow', component: 'page_root', objectiveFacts: [trusted], relationship: { mode: 'root_finding', root_evidence_key: null }, evidence: 'Visible page content extends beyond the viewport.' });
  const symptom = syntheticObservation({ phenomenon: 'truncated_visible_content', component: 'product_row', relationship: { mode: 'symptom_of', root_evidence_key: `${rootObservation.cell_id}|horizontal_overflow|page_root` }, evidence: 'Only part of the next card is visible at the right edge.' });
  assert.equal(rootObservation.relationship.mode, 'root_finding');
  assert.equal(symptom.relationship.mode, 'symptom_of');
});

test('support status distinguishes repeated, D1-supported, review-only, and unsupported', () => {
  const repeated1 = syntheticObservation({ runSequence: 1 });
  const repeated2 = syntheticObservation({ runSequence: 2 });
  const single = syntheticObservation({ runSequence: 1, phenomenon: 'word_break', component: 'footer_identity', viewport: 'desktop-v1' });
  const statuses = supportForRuns([{ run_sequence: 1, observations: [repeated1, single] }, { run_sequence: 2, observations: [repeated2] }]);
  assert.ok(statuses.some((item) => item.status === 'repeated_across_runs'));
  assert.ok(statuses.some((item) => item.status === 'single_run_requires_review'));
});

test('single-run D1-supported observation is not counted as unsupported', () => {
  const fact = request.objective_facts.find((item) => item.rule_id === 'root_horizontal_overflow');
  const trusted = { finding_id: fact.finding_id, rule_id: fact.rule_id, severity: fact.severity, authority: 'phase_d1_authoritative' };
  const observation = syntheticObservation({ runSequence: 1, phenomenon: 'horizontal_overflow', component: 'page_root', objectiveFacts: [trusted], relationship: { mode: 'root_finding', root_evidence_key: null } });
  const support = supportForRuns([{ run_sequence: 1, observations: [observation] }, { run_sequence: 2, observations: [] }]);
  assert.equal(support[0].status, 'single_run_supported_by_d1');
  assert.equal(support[0].authoritative, true);
});

test('offline reprocessing removes Stage-1 interpretations and reduces duplicates', () => {
  const offline = runOfflineObservationReprocessing({ root, sourceEvaluation, d26Live });
  assert.equal(offline.paid_api_calls, 0);
  assert.ok(offline.report.rejected_interpretations.every((item) => item.phenomenon === 'architecture_difference'));
  assert.ok(offline.report.duplicate_reduction.duplicate_records_suppressed > 0);
  assert.ok(offline.report.duplicate_reduction.root_symptom_observations_linked > 0);
});

test('offline reprocessing materially improves and permits bounded live execution', () => {
  const offline = runOfflineObservationReprocessing({ root, sourceEvaluation, d26Live });
  assert.equal(offline.report.metrics.observation_agreement, 0.9677);
  assert.equal(offline.report.metrics.unsupported_observation_rate, 0.0323);
  assert.equal(offline.live_call_gate.passed, true);
});

test('D2.6 classification stability remains intact after concrete normalization', () => {
  const offline = runOfflineObservationReprocessing({ root, sourceEvaluation, d26Live });
  assert.equal(offline.report.metrics.primary_dimension_agreement, 1);
  assert.equal(offline.report.metrics.importance_agreement, 1);
  assert.equal(offline.report.metrics.responsibility_agreement, 1);
  assert.equal(offline.report.metrics.recommendation_agreement, 1);
  assert.equal(offline.report.metrics.root_symptom_agreement, 1);
});

test('reliability gate exposes each criterion and keeps automatic repair false', () => {
  const offline = runOfflineObservationReprocessing({ root, sourceEvaluation, d26Live });
  assert.equal(offline.report.reliability.status, 'repair_planning_eligible');
  assert.equal(offline.report.reliability.automatic_repair_allowed, false);
  assert.equal(offline.report.reliability.human_review_required, true);
  assert.ok(Object.values(offline.report.reliability.criteria).every(Boolean));
});

test('strict live prompt is per-image, medium-reasoning, image-bound, and non-interpretive', () => {
  const configuration = loadLiveDesignConfiguration(root, { env: {}, requireCredentials: false }).configuration;
  const body = buildStrictObservationResponsesRequest({ root, request, configuration });
  assert.equal(body.model, 'gpt-5.6-sol');
  assert.equal(body.reasoning.effort, 'medium');
  assert.equal(body.input[1].content.filter((item) => item.type === 'input_image').length, 12);
  assert.match(strictStageOneInstructions(), /Do not compare profiles or viewports/);
  assert.match(strictStageOneInstructions(), /Prefer fewer high-confidence observations/);
});

test('strict live normalization rejects interpretation but preserves concrete D1 observation', () => {
  const output = rawLiveOutput();
  output.observations.push({ local_key: 'bad_quality', cell_id: request.cells[0].cell_id, phenomenon: 'element_crowding', component: 'header_identity_controls', visible_region: 'Header', region_reference: { kind: 'presenter_landmark', landmark_id: 'header_identity_controls', bounds: null }, evidence_summary: 'This is a worse and less polished architecture.', confidence: 'medium', objective_finding_ids: [] });
  const normalized = normalizeStrictObservationOutput({ output, request, root, runSequence: 1 });
  assert.equal(normalized.rejected_interpretations.length, 1);
  assert.ok(normalized.observations.some((item) => item.phenomenon === 'horizontal_overflow'));
});

test('mock live validation accepts exactly two paid-success calls and no fixture fallback', async () => {
  const configuration = loadLiveDesignConfiguration(root, { env: {}, requireCredentials: false }).configuration;
  const offline = runOfflineObservationReprocessing({ root, sourceEvaluation, d26Live });
  let calls = 0;
  const result = await runObservationLiveValidation({
    root, sourceEvaluation, configuration, offlineGate: offline.live_call_gate,
    env: { OPENAI_API_KEY: 'mock-key' }, sleep: async () => {}, clock: (() => { let value = 0; return () => (value += 10); })(),
    fetchImpl: async () => { calls += 1; return jsonResponse(apiPayload(rawLiveOutput(), `resp_d2_7_${calls}`)); }
  });
  assert.equal(calls, 2);
  assert.equal(result.runs.length, 2);
  assert.equal(result.report.metrics.observation_agreement, 1);
  assert.equal(result.fixture_fallback_used, false);
  assert.equal(result.automatic_repair_allowed, false);
});

test('offline gate blocks live provider construction when improvement is absent', async () => {
  const configuration = loadLiveDesignConfiguration(root, { env: {}, requireCredentials: false }).configuration;
  let calls = 0;
  await assert.rejects(() => runObservationLiveValidation({ root, sourceEvaluation, configuration, offlineGate: { passed: false }, env: { OPENAI_API_KEY: 'mock-key' }, fetchImpl: async () => { calls += 1; } }), /offline reliability gate/);
  assert.equal(calls, 0);
});

test('D2.7 source contains no repair, storefront mutation, or Shopify-write capability', () => {
  const files = ['observation-stabilization-contracts.js', 'observation-normalizer.js', 'observation-comparison.js', 'observation-reliability.js', 'offline-observation-reprocessing.js', 'strict-observation-live-provider.js', 'observation-live-validation.js'];
  const source = files.map((file) => fs.readFileSync(path.join(root, 'ai/design-evaluation', file), 'utf8')).join('\n');
  assert.doesNotMatch(source, /write_themes|theme\s+push|theme\s+publish|admin\.graphql\s*\(|\.liquid|\.css/i);
  assert.match(source, /automatic_repair_allowed:\s*false/);
});

(async () => {
  let passed = 0;
  for (const item of tests) {
    try { await item.run(); passed += 1; process.stdout.write(`✓ ${item.name}\n`); }
    catch (error) { process.stderr.write(`✗ ${item.name}\n${error.stack}\n`); process.exitCode = 1; }
  }
  process.stdout.write(`\n${passed}/${tests.length} visual observation stabilization tests passed.\n`);
})().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
