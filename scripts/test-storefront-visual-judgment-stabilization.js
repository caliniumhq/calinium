#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  withCanonicalId,
  loadLiveDesignConfiguration,
  loadStabilizationPolicy,
  buildStabilizationRequest,
  assertVisualObservation,
  createVisualObservation,
  assertDesignClassification,
  architectureContextForObservation,
  classifyFrozenObservations,
  independentClassifications,
  runOfflineReclassification,
  reliabilityDecision,
  buildObservationResponsesRequest,
  normalizeObservationOutput,
  createStabilizedObservationProvider,
  runLimitedLiveValidation
} = require('../ai/design-evaluation');

const root = path.resolve(__dirname, '..');
const sourceEvaluation = JSON.parse(fs.readFileSync(path.join(root, 'output/storefront-design-evaluations/phase-d2-5-live-calibration/live-design-evaluation-result.json'), 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));
const tests = [];
function test(name, run) { tests.push({ name, run }); }

const offlineRequest = buildStabilizationRequest({ root, sourceEvaluation, mode: 'offline_reclassification' });
const liveRequest = buildStabilizationRequest({ root, sourceEvaluation, mode: 'limited_live_validation' });
const currentMobile = liveRequest.cells.find((cell) => cell.profile_id === 'profile.current_calinium.v1' && cell.route_id === 'homepage' && cell.viewport_id === 'mobile-v1');
const objective = liveRequest.objective_facts[0];

function syntheticObservation({ phenomenon, component, route = 'homepage', profile = 'profile.current_calinium.v1', viewport = 'mobile-v1', summary = 'The supplied screenshot visibly contains the stated condition.', objectiveFacts = [] }) {
  const cell = liveRequest.cells.find((item) => item.profile_id === profile && item.route_id === route && item.viewport_id === viewport);
  return createVisualObservation({
    run_sequence: 1,
    phenomenon,
    valence: phenomenon === 'architecture_difference' ? 'positive' : 'issue',
    profile_ids: [profile],
    route_id: route,
    viewport_ids: [viewport],
    component,
    visible_region: 'Bound visible region',
    evidence_summary: summary,
    confidence: 'high',
    evidence: [{ cell_id: cell.cell_id, screenshot_sha256: cell.screenshot.sha256, region: 'Bound visible region', visible_evidence: summary }],
    objective_facts: objectiveFacts,
    source_finding_ids: []
  }, liveRequest, root);
}

function rawLiveOutput() {
  return {
    schema_version: '1.0',
    summary: 'Atomic visual observations across the supplied matrix.',
    cell_inspections: liveRequest.cells.map((cell) => ({ cell_id: cell.cell_id, status: 'observations_recorded', summary: 'The screenshot was inspected for visible conditions.' })),
    observations: [
      {
        local_key: 'current_homepage_mobile_overflow', phenomenon: 'page_overflow', valence: 'issue',
        profile_ids: ['profile.current_calinium.v1'], route_id: 'homepage', viewport_ids: ['mobile-v1'], component: 'page',
        visible_region: 'Full mobile page', evidence_summary: 'The captured page extends beyond the supplied mobile viewport and content is cut off at the right edge.', confidence: 'high',
        evidence: [{ cell_id: currentMobile.cell_id, region: 'Full mobile page', visible_evidence: 'The page extends beyond the viewport and the right edge is cut off.' }],
        objective_finding_ids: [objective.finding_id]
      }
    ],
    objective_fact_acknowledgements: [{ finding_id: objective.finding_id, status: 'acknowledged', visible_impact: 'The authoritative overflow is visibly associated with right-edge containment loss.' }]
  };
}

function apiPayload(output, id = 'resp_d2_6_mock') {
  return {
    id, object: 'response', status: 'completed', model: 'gpt-5.6-sol',
    output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(output) }] }],
    usage: { input_tokens: 1000, output_tokens: 400, total_tokens: 1400, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 100 } }
  };
}
function jsonResponse(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } }); }

test('stabilization policy defines deterministic boundaries and no-repair safety', () => {
  const policy = loadStabilizationPolicy(root);
  assert.equal(policy.dimension_rules.length, 12);
  assert.equal(policy.responsibility_ontology.length, 6);
  assert.equal(policy.limited_live_validation.screenshot_cells, 12);
  assert.equal(policy.limited_live_validation.accepted_repeats, 2);
  assert.equal(policy.reliability.automatic_repair_allowed, false);
});

test('Stage-1 frozen observation contract binds screenshot provenance', () => {
  const observation = syntheticObservation({ phenomenon: 'control_crowding', component: 'header' });
  assert.equal(assertVisualObservation(observation, liveRequest, root), observation);
  assert.equal(observation.frozen, true);
  assert.ok(observation.evidence[0].screenshot_sha256);
});

test('Stage-1 observation cannot contain repair instructions', () => {
  const observation = syntheticObservation({ phenomenon: 'control_crowding', component: 'header' });
  const changed = clone(observation);
  changed.evidence_summary = 'Increase the width token to fix the header.';
  const recanonical = withCanonicalId('visual-observation', changed, 'observation_id');
  assert.throws(() => assertVisualObservation(recanonical, liveRequest, root), /repair or recommendation instruction/);
});

test('Stage-2 classification consumes the exact frozen observation checksum', () => {
  const observation = syntheticObservation({ phenomenon: 'control_crowding', component: 'header' });
  const classification = classifyFrozenObservations({ observations: [observation], request: liveRequest, root })[0];
  const changed = withCanonicalId('design-classification', { ...classification, observation_checksum: '0'.repeat(64) }, 'classification_id');
  assert.throws(() => assertDesignClassification(changed, observation, root), /exact frozen observation/);
});

test('architecture context binds only relevant family and presenter provenance', () => {
  const observation = syntheticObservation({ phenomenon: 'control_crowding', component: 'header', profile: 'profile.editorial_discovery.v1' });
  const context = architectureContextForObservation({ observation, request: liveRequest, root });
  assert.deepEqual(context.family_types, ['header_navigation', 'responsive_behavior']);
  assert.ok(context.presenter_ids.includes('section.header.editorial_discovery'));
  assert.equal(Object.prototype.hasOwnProperty.call(context, 'runtime_files'), false);
});

test('architecture versus composition responsibility is deterministic', () => {
  const header = syntheticObservation({ phenomenon: 'control_crowding', component: 'header', profile: 'profile.editorial_discovery.v1' });
  const empty = syntheticObservation({ phenomenon: 'empty_module_visible', component: 'collection_discovery', route: 'collection', viewport: 'desktop-v1' });
  assert.equal(classifyFrozenObservations({ observations: [header], request: liveRequest, root })[0].responsibility, 'architecture_level');
  assert.equal(classifyFrozenObservations({ observations: [empty], request: liveRequest, root })[0].responsibility, 'composition_level');
});

test('design-token classification owns typographic containment', () => {
  const observation = syntheticObservation({ phenomenon: 'typographic_word_break', component: 'footer', viewport: 'desktop-v1' });
  const classification = classifyFrozenObservations({ observations: [observation], request: liveRequest, root })[0];
  assert.equal(classification.primary_dimension, 'typographic_hierarchy');
  assert.equal(classification.responsibility, 'design_token_level');
  assert.equal(classification.recommendation_category, 'typographic_containment');
});

test('merchant-content absence remains distinct from Calinium empty-module fallback', () => {
  const policy = loadStabilizationPolicy(root);
  const merchant = policy.responsibilityById.get('merchant_content_level');
  assert.match(merchant.do_not_use_when, /empty dependent module/i);
  const empty = syntheticObservation({ phenomenon: 'empty_module_visible', component: 'product_supporting_content', route: 'product', viewport: 'desktop-v1' });
  assert.equal(classifyFrozenObservations({ observations: [empty], request: liveRequest, root })[0].responsibility, 'composition_level');
});

test('uncertain ownership is preferred when trusted context is insufficient', () => {
  const observation = syntheticObservation({ phenomenon: 'other_visible_condition', component: 'other' });
  const classification = classifyFrozenObservations({ observations: [observation], request: liveRequest, root })[0];
  assert.equal(classification.responsibility, 'uncertain');
  assert.equal(classification.recommendation_category, 'uncertain_requires_review');
});

test('root overflow and child truncation are linked without duplicate repair authority', () => {
  const fact = { finding_id: objective.finding_id, rule_id: objective.rule_id, severity: objective.severity, authority: 'phase_d1_authoritative' };
  const rootObservation = syntheticObservation({ phenomenon: 'page_overflow', component: 'page', summary: 'The page extends beyond the mobile viewport.', objectiveFacts: [fact] });
  const symptom = syntheticObservation({ phenomenon: 'content_truncation', component: 'product_row', summary: 'A child product row is cut off at the right edge.', objectiveFacts: [fact] });
  const classifications = classifyFrozenObservations({ observations: [rootObservation, symptom], request: liveRequest, root });
  assert.equal(classifications[0].relationship.mode, 'root_finding');
  assert.equal(classifications[1].relationship.mode, 'symptom_of');
  assert.equal(classifications[1].relationship.target_observation_id, rootObservation.observation_id);
  assert.equal(classifications[1].independent_repair_candidate, false);
  assert.equal(independentClassifications(classifications).length, 1);
});

test('primary dimension is stable across prose variation', () => {
  const left = syntheticObservation({ phenomenon: 'empty_module_visible', component: 'collection_discovery', route: 'collection', viewport: 'desktop-v1', summary: 'A titled module has no visible supporting cards.' });
  const right = syntheticObservation({ phenomenon: 'empty_module_visible', component: 'collection_discovery', route: 'collection', viewport: 'mobile-v1', summary: 'Visible headings are followed by blank space.' });
  const classified = classifyFrozenObservations({ observations: [left, right], request: liveRequest, root });
  assert.ok(classified.every((item) => item.primary_dimension === 'product_discovery'));
  assert.ok(classified.every((item) => item.recommendation_category === 'suppress_empty_module'));
});

test('D1 root fact remains authoritative during classification', () => {
  const fact = { finding_id: objective.finding_id, rule_id: objective.rule_id, severity: objective.severity, authority: 'phase_d1_authoritative' };
  const observation = syntheticObservation({ phenomenon: 'page_overflow', component: 'page', objectiveFacts: [fact] });
  const classification = classifyFrozenObservations({ observations: [observation], request: liveRequest, root })[0];
  assert.equal(classification.relationship.mode, 'root_finding');
  assert.deepEqual(classification.relationship.objective_finding_ids, [objective.finding_id]);
});

test('offline reclassification uses all three saved runs and zero API calls', () => {
  const offline = runOfflineReclassification({ root, sourceEvaluation });
  assert.equal(offline.request.cells.length, 16);
  assert.equal(offline.runBundles.length, 3);
  assert.equal(offline.report.metrics.d1_contradiction_count, 0);
  assert.equal(offline.materialImprovement.passed, true);
});

test('offline classification agreement materially improves without claiming observation stability', () => {
  const offline = runOfflineReclassification({ root, sourceEvaluation });
  assert.equal(offline.report.metrics.primary_dimension_agreement, 1);
  assert.equal(offline.report.metrics.responsibility_agreement, 1);
  assert.equal(offline.report.metrics.recommendation_agreement, 1);
  assert.ok(offline.report.metrics.observation_agreement < 0.75);
  assert.ok(offline.report.unsupported_observation_keys.length > 0);
});

test('reliability gate exposes every criterion and never enables Phase D2.6 repair consumption', () => {
  const policy = loadStabilizationPolicy(root);
  const metrics = { observation_agreement: 1, high_impact_finding_agreement: 1, primary_dimension_agreement: 1, responsibility_agreement: 1, recommendation_agreement: 1, root_symptom_agreement: 1, d1_contradiction_count: 0, unsupported_finding_rate: 0 };
  const decision = reliabilityDecision(metrics, policy);
  assert.equal(decision.status, 'repair_planning_eligible');
  assert.equal(decision.repair_planning_consumption_allowed, false);
  assert.equal(decision.human_review_required, true);
});

test('limited live request contains exactly the approved 12 non-cart screenshot cells', () => {
  assert.equal(liveRequest.cells.length, 12);
  assert.equal(liveRequest.cells.some((cell) => cell.route_id === 'cart'), false);
  assert.equal(new Set(liveRequest.cells.map((cell) => `${cell.profile_id}:${cell.route_id}:${cell.viewport_id}`)).size, 12);
});

test('Responses request is observation-only, medium-reasoning, and image-bound', () => {
  const configuration = loadLiveDesignConfiguration(root, { env: {}, requireCredentials: false }).configuration;
  const body = buildObservationResponsesRequest({ root, request: liveRequest, configuration });
  assert.equal(body.model, 'gpt-5.6-sol');
  assert.equal(body.reasoning.effort, 'medium');
  assert.equal(body.input[1].content.filter((item) => item.type === 'input_image').length, 12);
  assert.match(body.input[0].content[0].text, /Do not assign a design dimension/);
  assert.doesNotMatch(body.input[0].content[0].text, /change width from/i);
});

test('live Stage-1 output normalizes before local Stage-2 classification', () => {
  const observations = normalizeObservationOutput({ output: rawLiveOutput(), request: liveRequest, root, runSequence: 1 });
  assert.equal(observations.length, 1);
  const classified = classifyFrozenObservations({ observations, request: liveRequest, root });
  assert.equal(classified[0].primary_dimension, 'mobile_adaptation_quality');
  assert.equal(classified[0].responsibility, 'architecture_level');
});

test('duplicate live observations are coalesced before freezing', () => {
  const output = rawLiveOutput();
  output.observations.push({
    ...clone(output.observations[0]),
    local_key: 'duplicate_overflow_evidence',
    visible_region: 'Right page edge',
    evidence_summary: 'The right page edge lies beyond the supplied mobile viewport.'
  });
  const observations = normalizeObservationOutput({ output, request: liveRequest, root, runSequence: 1 });
  assert.equal(observations.length, 1);
  assert.match(observations[0].visible_region, /Full mobile page; Right page edge/);
});

test('bounded semantic completeness retries only a missing observation inspection', async () => {
  const configuration = loadLiveDesignConfiguration(root, { env: {}, requireCredentials: false }).configuration;
  let calls = 0;
  const incomplete = rawLiveOutput(); incomplete.cell_inspections.pop();
  const provider = createStabilizedObservationProvider({
    root, configuration, env: { OPENAI_API_KEY: 'mock-key' }, sleep: async () => {}, clock: (() => { let value = 0; return () => (value += 10); })(),
    fetchImpl: async () => { calls += 1; return jsonResponse(apiPayload(calls === 1 ? incomplete : rawLiveOutput(), `resp_${calls}`)); }
  });
  const run = await provider.evaluate({ request: liveRequest, runSequence: 1 });
  assert.equal(calls, 2);
  assert.equal(run.operation.request_count, 2);
  assert.equal(run.diagnostics.rejected_attempts.length, 1);
});

test('mock limited live orchestration accepts exactly two calls and remains human-reviewed', async () => {
  const configuration = loadLiveDesignConfiguration(root, { env: {}, requireCredentials: false }).configuration;
  let calls = 0;
  const result = await runLimitedLiveValidation({
    root, sourceEvaluation, configuration, env: { OPENAI_API_KEY: 'mock-key' }, sleep: async () => {}, clock: (() => { let value = 0; return () => (value += 10); })(),
    fetchImpl: async () => { calls += 1; return jsonResponse(apiPayload(rawLiveOutput(), `resp_repeat_${calls}`)); }
  });
  assert.equal(calls, 2);
  assert.equal(result.runs.length, 2);
  assert.equal(result.report.metrics.observation_agreement, 1);
  assert.equal(result.report.reliability.human_review_required, true);
  assert.equal(result.automatic_repair_allowed, false);
});

test('D2.6 source has no repair, theme mutation, or Shopify-write capability', () => {
  const files = ['stabilization-contracts.js', 'architecture-context.js', 'observation-classifier.js', 'stabilization-reliability.js', 'offline-reclassification.js', 'stabilized-live-provider.js', 'limited-live-validation.js'];
  const source = files.map((file) => fs.readFileSync(path.join(root, 'ai/design-evaluation', file), 'utf8')).join('\n');
  assert.doesNotMatch(source, /write_themes|theme\s+push|theme\s+publish|admin\.graphql\s*\(|apps\/theme|\.liquid|\.css/i);
  assert.match(source, /automatic_repair_allowed:\s*false/);
});

(async () => {
  let passed = 0;
  for (const item of tests) {
    try { await item.run(); passed += 1; process.stdout.write(`✓ ${item.name}\n`); }
    catch (error) { process.stderr.write(`✗ ${item.name}\n${error.stack}\n`); process.exitCode = 1; }
  }
  process.stdout.write(`\n${passed}/${tests.length} visual judgment stabilization tests passed.\n`);
})().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
