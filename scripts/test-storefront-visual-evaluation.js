#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const {
  loadEvaluationPolicy,
  assertVisualEvaluationRequest,
  assertVisualEvaluationResult,
  assertVisualFinding,
  createVisualHumanReview,
  assertVisualHumanReview
} = require('../ai/visual-evaluation/contracts');
const { digest } = require('../ai/storefront-render/contracts');
const { evaluateRenderResult } = require('../ai/visual-evaluation/evaluate-render-result');
const { reviewedQualityGate } = require('../ai/visual-evaluation/quality-gate');

const root = path.resolve(__dirname, '..');
const hashes = { zero: '0'.repeat(64), one: '1'.repeat(64), two: '2'.repeat(64) };

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function families(profile = 'profile.current_calinium.v1') {
  const suffix = profile === 'profile.current_calinium.v1' ? 'current_calinium' : 'editorial_discovery';
  return ['header_navigation', 'product_card', 'collection_merchandising', 'product_detail', 'cart', 'responsive_behavior'].map((family) => {
    const selectedSuffix = family === 'cart' ? 'current_calinium' : suffix;
    return {
      family,
      family_id: `family.${family}.${selectedSuffix}.v1`,
      family_version: '1.0.0',
      presenters: [`presenter.${family}.${selectedSuffix}.v1`]
    };
  });
}

function objectiveObservations({ routeId = 'homepage', viewportWidth = 390 } = {}) {
  const landmarks = ['header', 'main', '#MainContent', 'footer'].map((selector) => ({ selector, count: 1, visible_count: 1 }));
  if (routeId === 'product') landmarks.push({ selector: '[data-main-product]', count: 1, visible_count: 1 });
  if (routeId === 'collection') landmarks.push({ selector: '[data-main-collection]', count: 1, visible_count: 1 });
  if (routeId === 'cart') landmarks.push({ selector: '[data-main-cart]', count: 1, visible_count: 1 });
  return {
    observation_revision: 'storefront-objective-observation-v1',
    geometry: { viewport_width: viewportWidth, viewport_height: 844, document_scroll_width: viewportWidth, document_scroll_height: 2200, body_scroll_width: viewportWidth, body_scroll_height: 2200 },
    landmarks,
    offscreen_candidates: [],
    clipping_candidates: [],
    collision_candidates: [],
    broken_media: [],
    touch_target_risks: [],
    purchase_interaction: {
      applicable: routeId === 'product', product_form_count: routeId === 'product' ? 1 : 0, cart_add_form_count: routeId === 'product' ? 1 : 0,
      primary_control_count: routeId === 'product' ? 1 : 0, visible_primary_control_count: routeId === 'product' ? 1 : 0,
      variant_control_count: routeId === 'product' ? 1 : 0, controls_connected: true
    },
    navigation_interaction: {
      applicable: true, trigger_present: true, trigger_visible: true, opened: true, expanded_state_updated: true,
      controlled_panel_visible: true, closed: true, focus_remained_reachable: true
    }
  };
}

function scenario({ routeId = 'homepage', profile = 'profile.current_calinium.v1', viewportWidth = 390, objective = true } = {}) {
  const profileVersion = '1.0.0';
  const selectionRevision = profile === 'profile.current_calinium.v1'
    ? 'architecture-selection-ccbcab2a5f566e2b1b6f'
    : 'architecture-selection-38682d97f82a04943a4f';
  const runtimeRevision = profile === 'profile.current_calinium.v1'
    ? 'architecture-runtime-2057a469ae690cc40489'
    : 'architecture-runtime-97dd7b9b24aab67177a8';
  const route = {
    id: routeId,
    path: routeId === 'homepage' ? '/' : routeId === 'product' ? '/products/test-product' : routeId === 'collection' ? '/collections/test-collection' : '/cart',
    expected_landmarks: ['#MainContent', ...(routeId === 'product' ? ['[data-main-product]'] : routeId === 'collection' ? ['[data-main-collection]'] : routeId === 'cart' ? ['[data-main-cart]'] : [])],
    safe_capture_state: routeId === 'cart' ? 'fresh_empty_context_no_mutation' : 'read_only',
    entity: routeId === 'product' ? { kind: 'product', resource_id: 'product-test', remote_gid: 'gid://shopify/Product/1', handle: 'test-product', source_revision: hashes.one, resolution_source: 'controlled_render_fixture' }
      : routeId === 'collection' ? { kind: 'collection', resource_id: 'collection-test', remote_gid: 'gid://shopify/Collection/1', handle: 'test-collection', source_revision: hashes.two, resolution_source: 'controlled_render_fixture' } : null
  };
  const viewport = { id: viewportWidth === 390 ? 'mobile-v1' : 'desktop-v1', label: viewportWidth === 390 ? 'Mobile' : 'Desktop', width: viewportWidth, height: viewportWidth === 390 ? 844 : 900, device_scale_factor: 1, is_mobile: viewportWidth === 390, has_touch: viewportWidth === 390 };
  const generation = {
    generation_id: 'generation-test',
    generation_revision: 'generation-revision-11111111111111111111',
    artifact: {
      artifact_id: 'theme-artifact-11111111111111111111', source_kind: 'theme_zip', source_reference: 'output/test.zip', sha256: hashes.one,
      manifest_reference: 'output/manifest.json', source_artifact_reference: 'output/source.zip', source_artifact_sha256: hashes.two, resource_binding_revision: null
    }
  };
  const architecture = { profile_id: profile, profile_version: profileVersion, selection_revision_id: selectionRevision };
  const renderRequest = {
    architecture,
    generation,
    provenance: { source_artifact_manifest_reference: 'output/manifest.json' }
  };
  const renderResult = {
    render_id: 'render-aaaaaaaaaaaaaaaaaaaa',
    render_revision: 'storefront-render-v1',
    architecture,
    generation,
    route,
    viewport,
    screenshot: { artifact_reference: `screenshots/${profile}/${routeId}/${viewport.id}.png`, sha256: hashes.zero, width: viewportWidth, height: 2200 },
    architecture_evidence: {
      valid: true, profile_id: profile, profile_version: profileVersion, selection_revision_id: selectionRevision,
      selected_families: families(profile).map(({ presenters, ...family }) => ({ ...family, presenter_ids: presenters })),
      assertions: families(profile).map((family) => ({ presenter_id: family.presenters[0], matched_count: 1, passed: true }))
    },
    browser_observations: { console_errors: [], page_errors: [], failed_resources: [], http_failures: [] },
    ...(objective ? { objective_observations: objectiveObservations({ routeId, viewportWidth }) } : {})
  };
  const requestBase = {
    schema_version: '1.0', contract_version: 'visual-evaluation-request-v1',
    policy: { policy_revision: 'storefront-visual-evaluation-policy-v1', evaluator_version: 'storefront-visual-evaluator-v1', observation_revision: 'storefront-objective-observation-v1' },
    render: { request_id: 'render-request-11111111111111111111', render_id: renderResult.render_id, render_revision: 'storefront-render-v1', render_result_checksum: hashes.zero, screenshot_sha256: hashes.zero, screenshot_reference: renderResult.screenshot.artifact_reference },
    generation,
    architecture: { ...architecture, runtime_application_revision_id: runtimeRevision },
    route,
    viewport,
    provenance: { comparison_fixture_revision: 'comparison-fixture-0c881e4699c1cd3e33b0', capture_policy_revision: 'storefront-capture-policy-v1', artifact_sha256: hashes.one, source_manifest_reference: 'output/manifest.json' }
  };
  const evaluationRequest = { ...requestBase, evaluation_request_id: `visual-evaluation-request-${digest(requestBase).slice(0, 20)}` };
  const architectureRuntime = { profile_id: profile, profile_version: profileVersion, selection_revision_id: selectionRevision, application_revision_id: runtimeRevision, selected_families: families(profile) };
  return { evaluationRequest, renderRequest, renderResult, architectureRuntime };
}

function evaluate(input = {}) {
  const state = scenario(input);
  assertVisualEvaluationRequest(state.evaluationRequest, root);
  const result = evaluateRenderResult({ root, ...state });
  assertVisualEvaluationResult(result, root);
  return { ...state, result };
}

function hasRule(result, ruleId) { return result.findings.some((finding) => finding.rule_id === ruleId); }

const tests = [];
function test(name, run) { tests.push({ name, run }); }

test('policy is versioned and contains the exact Phase D1 taxonomy', () => {
  const policy = loadEvaluationPolicy(root);
  assert.equal(policy.rules.length, 13);
  assert.equal(policy.policy_revision, 'storefront-visual-evaluation-policy-v1');
});

test('valid request and result contracts pass', () => assert.equal(evaluate().result.status, 'evaluated'));
test('tampered result identity fails closed', () => {
  const result = clone(evaluate().result); result.summary.total = 4;
  assert.throws(() => assertVisualEvaluationResult(result, root), /ID does not match/);
});
test('tampered request identity fails closed', () => {
  const { evaluationRequest } = scenario(); evaluationRequest.route.path = '/changed';
  assert.throws(() => assertVisualEvaluationRequest(evaluationRequest, root), /ID does not match/);
});
test('Current mobile homepage root overflow is detected', () => {
  const state = scenario(); state.renderResult.objective_observations.geometry.document_scroll_width = 657;
  const result = evaluateRenderResult({ root, ...state });
  const finding = result.findings.find((item) => item.rule_id === 'root_horizontal_overflow');
  assert.equal(finding.measured.horizontal_overflow_px, 267);
  assert.equal(result.quality_gate.status, 'fail_review_required');
});
test('Editorial mobile homepage containment passes root rule', () => assert.equal(hasRule(evaluate({ profile: 'profile.editorial_discovery.v1' }).result, 'root_horizontal_overflow'), false));
test('intentional horizontal scroll tracks are suppressed', () => {
  const state = scenario(); state.renderResult.objective_observations.offscreen_candidates.push({ selector: '.carousel-track', rect: { x: 0, y: 0, width: 800, height: 200, top: 0, right: 800, bottom: 200, left: 0 }, overflow_left: 0, overflow_right: 410, intentional_scroll_context: true });
  assert.equal(hasRule(evaluateRenderResult({ root, ...state }), 'element_outside_viewport'), false);
});
test('non-intentional offscreen element produces containment evidence', () => {
  const state = scenario(); state.renderResult.objective_observations.offscreen_candidates.push({ selector: 'section.wide', rect: { x: 0, y: 0, width: 657, height: 200, top: 0, right: 657, bottom: 200, left: 0 }, overflow_left: 0, overflow_right: 267, intentional_scroll_context: false });
  const result = evaluateRenderResult({ root, ...state });
  assert.ok(hasRule(result, 'element_outside_viewport')); assert.ok(hasRule(result, 'major_structure_exceeds_viewport'));
});
test('intentional hero layering does not report collision', () => {
  const state = scenario(); state.renderResult.objective_observations.collision_candidates.push({ first_selector: '.hero-heading', second_selector: '.hero-media', first_rect: { x: 0, y: 0, width: 200, height: 100, top: 0, right: 200, bottom: 100, left: 0 }, second_rect: { x: 0, y: 0, width: 300, height: 200, top: 0, right: 300, bottom: 200, left: 0 }, overlap_ratio: 1, intentional_layer_context: true });
  assert.equal(hasRule(evaluateRenderResult({ root, ...state }), 'important_elements_collide'), false);
});
test('non-intentional collision is reported', () => {
  const state = scenario(); state.renderResult.objective_observations.collision_candidates.push({ first_selector: 'button.a', second_selector: 'button.b', first_rect: { x: 0, y: 0, width: 100, height: 40, top: 0, right: 100, bottom: 40, left: 0 }, second_rect: { x: 25, y: 0, width: 100, height: 40, top: 0, right: 125, bottom: 40, left: 25 }, overlap_ratio: 0.75, intentional_layer_context: false });
  assert.ok(hasRule(evaluateRenderResult({ root, ...state }), 'important_elements_collide'));
});
test('intentional crop suppresses clipping', () => {
  const state = scenario(); state.renderResult.objective_observations.clipping_candidates.push({ selector: '.hero-media', rect: { x: 0, y: 0, width: 390, height: 200, top: 0, right: 390, bottom: 200, left: 0 }, client_width: 390, client_height: 200, scroll_width: 500, scroll_height: 200, overflow_x: 'hidden', overflow_y: 'hidden', intentional_clip_context: true });
  assert.equal(hasRule(evaluateRenderResult({ root, ...state }), 'important_content_clipped'), false);
});
test('critical broken media is reported', () => {
  const state = scenario(); state.renderResult.objective_observations.broken_media.push({ selector: 'img.product', kind: 'image', critical: true, complete: false, natural_width: 0, natural_height: 0, visible: true });
  assert.ok(hasRule(evaluateRenderResult({ root, ...state }), 'critical_media_broken'));
});
test('touch target spacing exception suppresses false positive', () => {
  const state = scenario(); state.renderResult.objective_observations.touch_target_risks.push({ selector: 'button.icon', tag: 'button', role: null, rect: { x: 0, y: 0, width: 20, height: 20, top: 0, right: 20, bottom: 20, left: 0 }, inline_text_exception: false, spacing_exception: true, disabled: false });
  assert.equal(hasRule(evaluateRenderResult({ root, ...state }), 'touch_target_size_risk'), false);
});
test('touch target without exception is reported', () => {
  const state = scenario(); state.renderResult.objective_observations.touch_target_risks.push({ selector: 'button.icon', tag: 'button', role: null, rect: { x: 0, y: 0, width: 20, height: 20, top: 0, right: 20, bottom: 20, left: 0 }, inline_text_exception: false, spacing_exception: false, disabled: false });
  assert.ok(hasRule(evaluateRenderResult({ root, ...state }), 'touch_target_size_risk'));
});
test('missing route landmark is a blocker', () => {
  const state = scenario(); state.renderResult.objective_observations.landmarks.find((item) => item.selector === '#MainContent').visible_count = 0;
  assert.ok(hasRule(evaluateRenderResult({ root, ...state }), 'important_landmark_missing'));
});
test('PDP missing purchase control is a blocker', () => {
  const state = scenario({ routeId: 'product' }); state.renderResult.objective_observations.purchase_interaction.visible_primary_control_count = 0;
  assert.ok(hasRule(evaluateRenderResult({ root, ...state }), 'product_purchase_interaction_missing'));
});
test('mobile navigation interaction failure is high severity', () => {
  const state = scenario(); state.renderResult.objective_observations.navigation_interaction.opened = false;
  assert.ok(hasRule(evaluateRenderResult({ root, ...state }), 'navigation_interaction_failed'));
});
test('architecture evidence must match trusted runtime provenance', () => {
  const state = scenario(); state.architectureRuntime.selected_families[0].presenters = ['presenter.untrusted'];
  assert.ok(hasRule(evaluateRenderResult({ root, ...state }), 'architecture_presenter_mismatch'));
});
test('known Shopify preview diagnostics are allowlisted narrowly', () => {
  const state = scenario(); state.renderResult.browser_observations.console_errors.push({ message: "Service worker is disabled because the context is sandboxed and lacks the 'allow-same-origin' flag" });
  assert.equal(hasRule(evaluateRenderResult({ root, ...state }), 'fatal_runtime_or_resource_issue'), false);
});
test('unallowlisted fatal diagnostics fail the gate', () => {
  const state = scenario(); state.renderResult.browser_observations.page_errors.push({ message: 'ReferenceError: storefrontController is not defined' });
  assert.ok(hasRule(evaluateRenderResult({ root, ...state }), 'fatal_runtime_or_resource_issue'));
});
test('legacy Render Result falls back safely and records evidence limitation', () => assert.ok(hasRule(evaluate({ objective: false }).result, 'detailed_observation_unavailable')));
test('repeat evaluation of immutable evidence is deterministic', () => {
  const state = scenario();
  const first = evaluateRenderResult({ root, ...state }); const second = evaluateRenderResult({ root, ...clone(state), architectureRuntime: clone(state.architectureRuntime) });
  assert.deepEqual(second, first);
});
test('human review accepts known issue without automatic repair', () => {
  const state = scenario(); state.renderResult.objective_observations.geometry.document_scroll_width = 657;
  const evaluation = evaluateRenderResult({ root, ...state });
  const overflow = evaluation.findings.find((finding) => finding.rule_id === 'root_horizontal_overflow');
  const review = createVisualHumanReview({
    evaluation, decision: 'accepted_with_known_issue', reviewerReference: 'phase-d1-approved-baseline', reviewedAt: '2026-08-14T00:00:00.000Z', root,
    notes: 'Preserved Current mobile homepage baseline overflow; no repair in Phase D1.',
    findingDecisions: [{ finding_id: overflow.finding_id, decision: 'accepted_with_known_issue', notes: 'Known approved baseline observation.' }]
  });
  assertVisualHumanReview(review, evaluation, root);
  const gate = reviewedQualityGate(evaluation, review, root);
  assert.equal(gate.status, 'pass_with_review'); assert.equal(gate.automatic_repair_allowed, false);
});
test('stale human review is rejected', () => {
  const { result } = evaluate();
  const review = createVisualHumanReview({ evaluation: result, decision: 'accepted', reviewerReference: 'test-reviewer', reviewedAt: '2026-08-14T00:00:00.000Z', root });
  review.evaluation_checksum = hashes.two;
  assert.throws(() => assertVisualHumanReview(review, result, root), /stale|ID does not match/);
});
test('finding contract rejects unsupported severity', () => {
  const state = scenario(); state.renderResult.objective_observations.geometry.document_scroll_width = 657;
  const result = evaluateRenderResult({ root, ...state }); const finding = clone(result.findings[0]); finding.severity = 'critical';
  assert.throws(() => assertVisualFinding(finding, root), /invalid enum/);
});
test('authoritative screenshots are never annotated or modified', () => {
  const { result } = evaluate();
  assert.equal(result.annotation.authoritative_screenshot_modified, false); assert.equal(result.annotation.required, false);
});

let passed = 0;
for (const item of tests) {
  try { item.run(); passed += 1; process.stdout.write(`✓ ${item.name}\n`); }
  catch (error) { process.stderr.write(`✗ ${item.name}\n${error.stack}\n`); process.exitCode = 1; }
}
process.stdout.write(`\n${passed}/${tests.length} storefront visual-evaluation tests passed.\n`);
