#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  digest,
  createMerchantIntent,
  selectArchitecture
} = require('../ai/architecture');
const {
  prepareArchitectureMaterialQuestion,
  recordArchitectureMaterialAnswer,
  resolveArchitectureMaterialQuestion
} = require('../ai/conversation');
const { questionById } = require('../ai/conversation/question-planner');
const { STATES } = require('../ai/merchant-flow');
const {
  VISIBLE_STAGES,
  DIRECTION_OPTIONS,
  ACCESSIBILITY_CONTRACT,
  TELEMETRY_EVENTS,
  PRODUCT_METRICS,
  loadCapability,
  createMerchantVisualBriefing,
  createDirectionChoiceRequest,
  submitDirectionChoice,
  createAnalysisFirstJourney,
  projectMerchantJourney,
  assertMerchantProjectionSafe,
  createTelemetryEvent,
  FLOW_STAGE,
  LEGACY_STAGE,
  visibleStageFor
} = require('../ai/merchant-experience');
const { contractsForCase } = require('./test-automatic-architecture-selection');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/analysis-first-merchant-journey.json'), 'utf8'));
const selectionFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/automatic-architecture-selection.json'), 'utf8'));
const tests = [];
function test(name, run) { tests.push({ name, run }); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function selectionCase(id) { return selectionFixture.cases.find((entry) => entry.id === id); }

function architectureInputs(entry) {
  if (!entry.source_case) return { storeIntelligence: null, merchantIntent: null, selection: null, questionRequest: null };
  const sourceEntry = selectionCase(entry.source_case);
  const initial = contractsForCase(sourceEntry);
  const merchantIntent = entry.explicit_direction
    ? createMerchantIntent({
      storeIntelligence: initial.storeIntelligence,
      architecturePreferences: { ...sourceEntry.intent, architecture_direction: entry.explicit_direction },
      architecturePreferenceRevision: `merchant-preference-${entry.id}`,
      root
    })
    : entry.inference_only
      ? createMerchantIntent({ storeIntelligence: initial.storeIntelligence, root })
      : initial.merchantIntent;
  let selection = selectArchitecture({ storeIntelligence: initial.storeIntelligence, merchantIntent, selectionMode: 'automatic_beta', root });
  let questionRequest = null;
  if (entry.material_question) {
    const prepared = prepareArchitectureMaterialQuestion({
      architectureResult: selection,
      merchantIntent,
      storeIntelligence: initial.storeIntelligence,
      conversationRevision: fixture.session_revision,
      merchantContext: fixture.merchant_context,
      createdAt: '2026-09-05T16:00:00.000Z',
      root
    });
    questionRequest = prepared.question_request;
  }
  if (entry.hard_ineligible_direction) {
    const modified = clone(selection);
    const profileId = entry.hard_ineligible_direction === 'visual_story_led'
      ? 'profile.editorial_discovery.v1'
      : 'profile.current_calinium.v1';
    const candidate = modified.candidate_results.find((item) => item.candidate_id === profileId);
    candidate.eligibility.eligible = false;
    candidate.eligibility.hard_constraints[0].passed = false;
    candidate.eligibility.hard_constraints[0].reason = 'Fixture-controlled hard incompatibility.';
    candidate.rank = null;
    modified.candidate_results.filter((item) => item.candidate_id !== profileId).forEach((item) => { item.rank = 1; });
    delete modified.outcome_id;
    modified.outcome_id = `architecture-selection-outcome-${digest(modified).slice(0, 20)}`;
    selection = modified;
  }
  return { storeIntelligence: initial.storeIntelligence, merchantIntent, selection, questionRequest };
}

function flowFor(entry) {
  if (!entry.flow_state) return null;
  return {
    state: entry.flow_state,
    sequence: entry.flow_sequence,
    flow_checksum: digest({ fixture: entry.id, sequence: entry.flow_sequence }),
    previous_state: entry.previous_flow_state || null,
    failure: entry.failure_category ? { category: entry.failure_category, retryable: entry.failure_retryable, message: 'INTERNAL STACK TRACE MUST NEVER REACH THE MERCHANT' } : null
  };
}

function projectCase(entry) {
  const inputs = architectureInputs(entry);
  const flow = flowFor(entry);
  const essential = entry.essential_question ? questionById(entry.essential_question) : null;
  const briefing = createMerchantVisualBriefing({
    projectBinding: fixture.project_binding,
    storeIntelligence: inputs.storeIntelligence,
    merchantIntent: inputs.merchantIntent,
    selection: inputs.selection,
    questionRequest: inputs.questionRequest,
    flow,
    essentialDetail: essential ? { question_id: essential.id, prompt: essential.prompt } : null,
    selectionBlocked: entry.selection_blocked === true,
    root
  });
  const journey = createAnalysisFirstJourney({
    projectBinding: fixture.project_binding,
    session: { stage: entry.session_stage, revision: fixture.session_revision },
    flow,
    briefing,
    buildEligibility: fixture.build_eligibility,
    commercial: fixture.commercial,
    preview: { ready: entry.flow_state === 'preview_ready' || entry.flow_state === 'completed' },
    capabilities: {
      approve_design: true,
      request_changes: true,
      compare_current_store: true,
      adjust_direction: false
    },
    themeAction: { available: entry.flow_state === 'merchant_action_required', authorized: entry.flow_state === 'merchant_action_required' || entry.flow_state === 'completed', completed: entry.flow_state === 'completed' },
    root
  });
  return { ...inputs, flow, briefing, journey, projection: projectMerchantJourney(journey, briefing, root) };
}

test('F1-A capability is versioned, disabled by default, and non-mutating', () => {
  const capability = loadCapability(root);
  assert.equal(capability.capability_revision, 'analysis-first-merchant-experience-capability-v1');
  assert.equal(capability.analysis_first_merchant_experience_enabled, false);
  assert.equal(capability.activation_scope, 'disabled');
  assert.equal(capability.automatic_generation_allowed, false);
  assert.equal(capability.automatic_paid_action_allowed, false);
  assert.equal(capability.automatic_theme_action_allowed, false);
  assert.equal(capability.automatic_repair_allowed, false);
});

test('exactly three primary merchant-visible stages are defined in order', () => {
  assert.deepEqual(VISIBLE_STAGES.map((stage) => stage.label), ['Analyzing your store', 'Building your storefront', 'Review your preview']);
  assert.equal(VISIBLE_STAGES.length, 3);
});

for (const entry of fixture.cases) {
  test(`fixture ${entry.id} projects deterministically`, () => {
    const first = projectCase(entry);
    const second = projectCase(entry);
    assert.deepEqual(first.briefing, second.briefing);
    assert.deepEqual(first.journey, second.journey);
    assert.deepEqual(first.projection, second.projection);
    assert.equal(first.journey.visible_stage, entry.expected_stage);
    assert.equal(first.briefing.state, entry.expected_briefing);
    assert.equal(first.journey.required_action?.kind || null, entry.expected_primary);
    assert.equal(first.projection.stages.length, 3);
    if (entry.expected_direction) assert.equal(first.briefing.direction.selected_direction || first.briefing.direction.recommended_direction, entry.expected_direction);
    if (entry.expected_option_count !== undefined) assert.equal(first.briefing.direction.options.length, entry.expected_option_count);
    if (entry.expected_headline) assert.equal(first.projection.status.headline, entry.expected_headline);
  });
}

test('all Core 2 merchant-flow states map into one visible stage without a second state machine', () => {
  const mapped = Object.keys(FLOW_STAGE);
  assert.deepEqual(mapped.sort(), STATES.filter((state) => !['failed_retryable', 'failed_terminal', 'cancelled'].includes(state)).sort());
  for (const state of mapped) assert.ok(VISIBLE_STAGES.some((stage) => stage.id === FLOW_STAGE[state]));
  assert.equal(visibleStageFor({ flow: { state: 'failed_retryable', previous_state: 'generation_running', failure: { category: 'generation_failed' } }, session: null, briefing: { state: 'recommendation_ready' } }), 'building_storefront');
  assert.equal(visibleStageFor({ flow: { state: 'failed_terminal', failure: { category: 'architecture_selection_failed' } }, session: null, briefing: { state: 'blocked' } }), 'analyzing_store');
});

test('every legacy Creative Director stage maps deterministically without destructive migration', () => {
  assert.deepEqual(Object.keys(LEGACY_STAGE).sort(), ['blueprint', 'content-plan', 'conversation', 'delivery', 'finish', 'generation', 'landing', 'offer', 'preset', 'preview', 'resources', 'strategy', 'understanding']);
  assert.ok(Object.values(LEGACY_STAGE).every((stage) => VISIBLE_STAGES.some((item) => item.id === stage)));
});

test('confident recommendations do not force a two-card choice', () => {
  for (const id of ['a_confident_visual_story_led', 'b_confident_direct_efficient']) {
    const result = projectCase(fixture.cases.find((entry) => entry.id === id));
    assert.equal(result.briefing.direction.mode, 'recommendation');
    assert.equal(result.projection.direction.choice_required, false);
    assert.equal(result.projection.primary_action.label, 'Build my preview');
  }
});

test('material ambiguity exposes exactly two approved plain-language options', () => {
  const result = projectCase(fixture.cases.find((entry) => entry.id === 'c_material_ambiguity'));
  assert.equal(result.projection.direction.choice_required, true);
  assert.deepEqual(result.projection.direction.options.map((item) => item.title), ['Visual & story-led', 'Direct & efficient']);
  assert.deepEqual(result.projection.direction.options.map((item) => item.description), [DIRECTION_OPTIONS.visual_story_led.description, DIRECTION_OPTIONS.direct_efficient.description]);
});

test('one hard-ineligible direction is not offered as an adjustment or forced choice', () => {
  const result = projectCase(fixture.cases.find((entry) => entry.id === 'f_visual_direction_hard_ineligible'));
  assert.deepEqual(result.projection.direction.options.map((item) => item.id), ['direct_efficient']);
  assert.equal(result.projection.direction.choice_required, false);
  assert.equal(result.projection.secondary_actions.some((item) => item.id === 'adjust_direction'), false);
});

test('existing explicit merchant intent is retained without reasking', () => {
  const visual = projectCase(fixture.cases.find((entry) => entry.id === 'd_existing_explicit_visual'));
  const direct = projectCase(fixture.cases.find((entry) => entry.id === 'e_existing_explicit_direct'));
  assert.equal(visual.briefing.state, 'accepted');
  assert.equal(direct.briefing.state, 'accepted');
  assert.equal(visual.projection.direction.choice_required, false);
  assert.equal(direct.projection.direction.choice_required, false);
  assert.match(visual.projection.direction.reasons[0], /explicitly chose|reflects the visual preference/i);
});

test('recommendation explanations use only allowlisted deterministic evidence and never invent missing facts', () => {
  const visual = projectCase(fixture.cases.find((entry) => entry.id === 'a_confident_visual_story_led'));
  assert.ok(visual.briefing.reasons.length <= 3);
  assert.ok(visual.briefing.reasons.some((reason) => reason.reason_code === 'strong_product_media'));
  const analyzing = projectCase(fixture.cases.find((entry) => entry.id === 'g_store_intelligence_analyzing'));
  assert.deepEqual(analyzing.briefing.reasons, []);
  assert.equal(analyzing.projection.direction, null);
});

test('the essential-detail exception reuses one existing critical deterministic question', () => {
  const result = projectCase(fixture.cases.find((entry) => entry.id === 'h_mandatory_fact_unavailable'));
  assert.equal(result.briefing.essential_detail.question_id, 'products');
  assert.equal(result.projection.direction.essential_detail.prompt, 'What do you sell?');
  assert.equal(result.projection.primary_action.id, 'provide_essential_detail');
});

test('direction choice adapts to E2, creates one child Merchant Intent, reruns once, and freezes through existing policy', async () => {
  const result = projectCase(fixture.cases.find((entry) => entry.id === 'c_material_ambiguity'));
  const request = createDirectionChoiceRequest({ briefing: result.briefing, questionRequest: result.questionRequest, root });
  const submission = submitDirectionChoice({ request, currentBriefing: result.briefing, directionId: 'visual_story_led', merchantContext: fixture.merchant_context, root });
  const duplicate = submitDirectionChoice({ request, currentBriefing: result.briefing, directionId: 'visual_story_led', merchantContext: fixture.merchant_context, existingSubmission: submission, root });
  assert.deepEqual(duplicate, submission);
  const recorded = await recordArchitectureMaterialAnswer({
    questionRequest: result.questionRequest,
    questionId: submission.material_answer_input.question_id,
    originatingSelectionOutcomeId: submission.material_answer_input.originating_selection_outcome_id,
    intentPath: submission.material_answer_input.intent_path,
    conversationRevision: submission.material_answer_input.conversation_revision,
    normalizedValue: submission.material_answer_input.normalized_value,
    merchantContext: fixture.merchant_context,
    answeredAt: '2026-09-05T16:01:00.000Z',
    root
  });
  const resolution = resolveArchitectureMaterialQuestion({
    selectionOutcome: result.selection,
    questionRequest: result.questionRequest,
    answer: recorded.answer,
    merchantIntent: result.merchantIntent,
    storeIntelligence: result.storeIntelligence,
    root
  });
  assert.equal(resolution.rerun_count, 1);
  assert.equal(resolution.second_question_allowed, false);
  assert.equal(resolution.merchant_intent.parent_revision_id, result.merchantIntent.revision_id);
  assert.equal(resolution.architecture_selection.frozen, true);
  assert.equal(resolution.architecture_selection.profile_id, 'profile.editorial_discovery.v1');
});

test('stale and conflicting direction choices fail closed', () => {
  const result = projectCase(fixture.cases.find((entry) => entry.id === 'c_material_ambiguity'));
  const request = createDirectionChoiceRequest({ briefing: result.briefing, questionRequest: result.questionRequest, root });
  const stale = createMerchantVisualBriefing({
    projectBinding: fixture.project_binding,
    storeIntelligence: result.storeIntelligence,
    merchantIntent: result.merchantIntent,
    selection: result.selection,
    questionRequest: result.questionRequest,
    flow: { state: 'awaiting_material_answer', sequence: 4, flow_checksum: 'a'.repeat(64) },
    root
  });
  assert.throws(() => submitDirectionChoice({ request, currentBriefing: stale, directionId: 'visual_story_led', merchantContext: fixture.merchant_context, root }), /current direction/);
  const first = submitDirectionChoice({ request, currentBriefing: result.briefing, directionId: 'visual_story_led', merchantContext: fixture.merchant_context, root });
  assert.throws(() => submitDirectionChoice({ request, currentBriefing: result.briefing, directionId: 'direct_efficient', merchantContext: fixture.merchant_context, existingSubmission: first, root }), /different bound submission/);
});

test('Build my preview is explicit, idempotent, and cannot automatically begin paid work', () => {
  const result = projectCase(fixture.cases.find((entry) => entry.id === 'b_confident_direct_efficient'));
  assert.equal(result.journey.required_action.available, true);
  assert.equal(result.journey.required_action.requires_explicit_action, true);
  assert.equal(result.journey.required_action.backend_contract, 'existing_e3_e4_merchant_flow');
  assert.match(result.journey.required_action.idempotency_key, /^analysis-first-build-/);
  assert.equal(result.journey.safety.automatic_generation_allowed, false);
  assert.equal(result.journey.safety.automatic_paid_action_allowed, false);
  assert.equal(result.flow, null);
});

test('commercial uncertainty disables build without changing billing semantics', () => {
  const base = projectCase(fixture.cases.find((entry) => entry.id === 'b_confident_direct_efficient'));
  const journey = createAnalysisFirstJourney({
    projectBinding: fixture.project_binding,
    session: { stage: 'offer', revision: fixture.session_revision },
    briefing: base.briefing,
    buildEligibility: fixture.build_eligibility,
    commercial: { status: 'unavailable', paid_generation_required: true, revision: null },
    root
  });
  assert.equal(journey.required_action.available, false);
  assert.ok(journey.required_action.blocker_codes.includes('commercial_boundary_known'));
});

test('internal review is projected as Completing final checks without operator terminology', () => {
  const result = projectCase(fixture.cases.find((entry) => entry.id === 'm_internal_founder_review'));
  assert.equal(result.projection.status.headline, 'Completing final checks');
  assert.doesNotMatch(JSON.stringify(result.projection), /founder|operator|human review/i);
});

test('preview actions exist only when authoritative preview readiness exists', () => {
  const ready = projectCase(fixture.cases.find((entry) => entry.id === 'n_preview_ready'));
  assert.equal(ready.projection.primary_action.label, 'Approve design');
  assert.ok(ready.projection.secondary_actions.some((item) => item.label === 'Request changes'));
  assert.ok(ready.projection.secondary_actions.some((item) => item.label === 'Compare with current store'));
  const legacy = projectCase(fixture.cases.find((entry) => entry.id === 'o_legacy_advanced_project'));
  assert.equal(legacy.projection.primary_action, null);
});

test('reload/resume is byte-stable and exposes no fake percentage or time remaining', () => {
  const entry = fixture.cases.find((item) => item.id === 'j_build_in_progress');
  const first = projectCase(entry).projection;
  const second = projectCase(entry).projection;
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual(first.status.progress, { kind: 'indeterminate', percent: null, time_remaining: null });
});

test('failure projection uses safe copy and never exposes raw backend errors', () => {
  const retryable = projectCase(fixture.cases.find((entry) => entry.id === 'k_retryable_build_failure'));
  assert.equal(retryable.projection.primary_action.label, 'Try again');
  assert.doesNotMatch(JSON.stringify(retryable.projection), /INTERNAL STACK TRACE|generation_failed|d2_7/i);
  const terminal = projectCase(fixture.cases.find((entry) => entry.id === 'l_terminal_failure'));
  assert.ok(terminal.projection.secondary_actions.some((item) => item.label === 'Contact support'));
  assert.equal(terminal.projection.primary_action, null);
});

test('sanitized merchant projections reject internal identities, scores, and checksum-like values', () => {
  for (const entry of fixture.cases) assertMerchantProjectionSafe(projectCase(entry).projection);
  assert.throws(() => assertMerchantProjectionSafe({ message: 'profile.current_calinium.v1 score 88' }), /forbidden internal terminology/);
  assert.throws(() => assertMerchantProjectionSafe({ message: 'a'.repeat(64) }), /checksum-like/);
});

test('Advanced remains available, chat is optional, and progress is retained', () => {
  for (const entry of fixture.cases) assert.equal(projectCase(entry).projection.advanced_mode_available, true);
  const analyzing = projectCase(fixture.cases.find((entry) => entry.id === 'a_confident_visual_story_led'));
  assert.equal(analyzing.projection.chat_refinement_available, false);
  const preview = projectCase(fixture.cases.find((entry) => entry.id === 'n_preview_ready'));
  assert.equal(preview.projection.chat_refinement_available, true);
});

test('accessibility contract preserves keyboard, focus, target-size, narrow-width, and reduced-motion requirements', () => {
  assert.equal(ACCESSIBILITY_CONTRACT.keyboard_accessible_actions, true);
  assert.equal(ACCESSIBILITY_CONTRACT.visible_focus_required, true);
  assert.equal(ACCESSIBILITY_CONTRACT.direction_cards_keyboard_selectable, true);
  assert.equal(ACCESSIBILITY_CONTRACT.minimum_target_height_px, 40);
  assert.equal(ACCESSIBILITY_CONTRACT.required_horizontal_scrolling, false);
  assert.equal(ACCESSIBILITY_CONTRACT.reduced_motion_supported, true);
});

test('safe telemetry is allowlisted, bounded, and redacted', () => {
  assert.equal(TELEMETRY_EVENTS.length, 16);
  assert.ok(PRODUCT_METRICS.includes('installation_to_analysis_ms'));
  assert.ok(PRODUCT_METRICS.includes('founder_intervention_count'));
  const event = createTelemetryEvent({
    eventName: 'build_preview_selected',
    occurredAt: '2026-09-05T16:02:00.000Z',
    projectId: fixture.project_binding.project_id,
    journeyStage: 'analyzing_store',
    merchantActionCount: 1
  });
  assert.equal(event.dimensions.merchant_action_count, 1);
  assert.ok(Object.values(event.redaction).every((value) => value === false));
  assert.doesNotMatch(JSON.stringify(event), /shopify|conversation text|screenshot data/i);
  assert.throws(() => createTelemetryEvent({ eventName: 'provider_payload_saved', occurredAt: '2026-09-05T16:02:00.000Z', projectId: 'project-safe', journeyStage: 'analyzing_store' }), /not allowlisted/);
  assert.throws(() => createTelemetryEvent({ eventName: 'preview_ready', occurredAt: '2026-09-05T16:02:00.000Z', projectId: 'project-safe', journeyStage: 'review_preview', rawConversation: 'private' }), /non-allowlisted field/);
});

test('merchant copy contains no unsupported performance promises', () => {
  const copy = JSON.stringify({ VISIBLE_STAGES, DIRECTION_OPTIONS });
  assert.doesNotMatch(copy, /guaranteed conversion|higher sales|best-performing|perfect design/i);
});

async function run() {
  for (const { name, run: execute } of tests) {
    await execute();
    process.stdout.write(`✓ ${name}\n`);
  }
  process.stdout.write(`\n${tests.length}/${tests.length} F1-A analysis-first merchant-experience tests passed.\n`);
}

if (require.main === module) {
  run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = { run, projectCase };
