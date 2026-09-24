#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  digest, selectArchitecture, assertArchitectureSelectionInputBindings
} = require('../ai/architecture');
const {
  prepareArchitectureMaterialQuestion, recordArchitectureMaterialAnswer, resolveArchitectureMaterialQuestion
} = require('../ai/conversation');
const {
  FLOW_VERSION, STATES, REPAIR_CLASSES, assertMerchantGenerationFlow, createMerchantGenerationFlow,
  bindStoreIntelligence, retryStoreIntelligence, bindMerchantIntent, startArchitectureSelection, pauseForMaterialAnswer,
  recordUnresolvedMaterialAnswer, freezeArchitecture, bindDesignDna, bindComposition, bindPaidIdentity,
  startGeneration, markGenerationInterrupted, resumeInterruptedGeneration, retryGeneration,
  bindArtifact, startRenderQa, retryRenderQa, completeRenderQa,
  recordQaReview, recordRepairResolution, authorizeMerchantAction, completeThemeOperation,
  failFlow, resumeMerchantGenerationFlow, publicFlowStatus, flowProvenanceSummary
} = require('../ai/merchant-flow');
const { contractsForCase } = require('./test-automatic-architecture-selection');
const { createMerchantFlowD27Failure, createLegacyUnknownMerchantFlowD27Failure } = require('../ai/design-evaluation/merchant-flow-d2-7-failure');
const { resolveControlledBetaD27LegacyLineage } = require('../ai/design-evaluation/merchant-flow-d2-7-legacy-lineage-resolution');

const root = path.resolve(__dirname, '..');
const selectionFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/automatic-architecture-selection.json'), 'utf8'));
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/merchant-generation-flow.json'), 'utf8'));
const tests = [];
function test(name, run) { tests.push({ name, run }); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function entry(id) { return selectionFixture.cases.find((item) => item.id === id); }
function time(index) { return fixture.timestamps[index]; }

function initialized(caseId) {
  const contracts = contractsForCase(entry(caseId));
  let flow = createMerchantGenerationFlow({ projectId: fixture.identity.project_id, organizationId: fixture.identity.organization_id, conversationRevision: fixture.identity.conversation_revision, storeContext: fixture.identity.store_context, paidGenerationRequired: true, createdAt: time(0), root });
  flow = bindStoreIntelligence(flow, contracts.storeIntelligence, time(1), root);
  flow = bindMerchantIntent(flow, contracts.merchantIntent, time(2), root);
  flow = startArchitectureSelection(flow, time(3), root);
  return { ...contracts, flow };
}
function selected(caseId) {
  const cycle = initialized(caseId);
  const result = selectArchitecture({ merchantIntent: cycle.merchantIntent, storeIntelligence: cycle.storeIntelligence, selectionMode: 'automatic_beta', root });
  assert.equal(result.frozen, true);
  return { ...cycle, result, flow: freezeArchitecture(cycle.flow, result, time(4), {}, root) };
}
function ambiguous() {
  const cycle = initialized(fixture.controlled_cases.ambiguous);
  const result = selectArchitecture({ merchantIntent: cycle.merchantIntent, storeIntelligence: cycle.storeIntelligence, selectionMode: 'automatic_beta', root });
  const prepared = prepareArchitectureMaterialQuestion({ architectureResult: result, merchantIntent: cycle.merchantIntent, storeIntelligence: cycle.storeIntelligence, conversationRevision: fixture.identity.conversation_revision, merchantContext: fixture.identity.store_context, createdAt: time(4), root });
  return { ...cycle, result, question: prepared.question_request, flow: pauseForMaterialAnswer(cycle.flow, result, prepared.question_request, time(5), root) };
}
async function resolvedAmbiguous(normalizedValue) {
  const cycle = ambiguous();
  const recorded = await recordArchitectureMaterialAnswer({ questionRequest: cycle.question, normalizedValue, questionId: cycle.question.question_id, originatingSelectionOutcomeId: cycle.result.outcome_id, intentPath: cycle.question.intent_path, conversationRevision: fixture.identity.conversation_revision, merchantContext: fixture.identity.store_context, answeredAt: time(6), root });
  const resolution = resolveArchitectureMaterialQuestion({ selectionOutcome: cycle.result, questionRequest: cycle.question, answer: recorded.answer, merchantIntent: cycle.merchantIntent, storeIntelligence: cycle.storeIntelligence, root });
  const flow = freezeArchitecture(cycle.flow, resolution.architecture_selection, time(7), { answer: recorded.answer, merchantIntent: resolution.merchant_intent }, root);
  return { ...cycle, recorded, resolution, flow };
}
function compositionReady(flow) {
  let next = bindDesignDna(flow, fixture.design_dna, time(8), root);
  next = bindComposition(next, fixture.composition, time(9), root);
  return next;
}
function generationRunning(flow) {
  let next = compositionReady(flow);
  next = bindPaidIdentity(next, fixture.paid_identity_pending, time(10), root);
  next = bindPaidIdentity(next, fixture.paid_identity_frozen, time(11), root);
  return startGeneration(next, fixture.generation_id, time(12), root);
}
function artifactReady(flow) { return bindArtifact(generationRunning(flow), fixture.artifact, time(13), root); }
function previewReady(flow) { return completeRenderQa(startRenderQa(artifactReady(flow), time(14), root), fixture.qa_passed, time(15), root); }
function withCanonicalChecksum(flow) { const base = clone(flow); delete base.checksum; return { ...base, checksum: digest(base) }; }
function d27FailureFor(flow, error) {
  const options = {
    root,
    occurredAt: time(15),
    requestBinding: { request_id: 'merchant-flow-d2-7-request-77777777777777777777', request_checksum: '7'.repeat(64) },
    provider: {
      interface_version: 'merchant-flow-d2-7-provider-v1', provider_id: 'test-live-provider', provider_version: '1.0.0',
      provider_kind: 'live_multimodal', provider_revision: 'test-provider-revision-v1', model_id: 'gpt-5.6-sol', model_configuration_revision: null
    },
    binding: {
      flow_id: flow.flow_id, project_id: flow.project_id, organization_id: flow.organization_id,
      job_id: 'merchant-flow-job-test-d2-7', job_attempt: 5,
      artifact_id: flow.artifact.artifact_id, artifact_checksum: flow.artifact.checksum,
      evidence_directory_reference: 'output/test-merchant-flow-d2-7',
      render_request_id: 'merchant-render-request-test-d2-7', render_request_checksum: '8'.repeat(64),
      render_checksum: fixture.qa_passed.render_checksum, render_result_ids: fixture.qa_passed.render_result_ids,
      route_ids: ['homepage'], viewport_ids: ['desktop-v1', 'mobile-v1'],
      d1_evidence_id: fixture.qa_passed.d1.evidence_id, d1_evidence_checksum: fixture.qa_passed.d1.evidence_checksum,
      d1_policy_revision: 'storefront-visual-evaluation-policy-v1',
      runtime_configuration_revision: 'merchant-flow-controlled-beta-runtime-v1',
      render_target_configuration_revision: 'merchant-flow-controlled-render-targets-v1',
      development_shop: flow.store_context.shop, development_theme_id: '100000000006', deployed_source_revision: null
    },
    attemptSequence: 1
  };
  return error
    ? createMerchantFlowD27Failure({ ...options, error })
    : createLegacyUnknownMerchantFlowD27Failure({ ...options, persistedJobStatus: 'retryable', persistedFailureCategory: 'shopify_render_failed' });
}

test('flow contract is versioned and contains explicit lifecycle states', () => {
  const flow = initialized(fixture.controlled_cases.direct_current).flow;
  assert.equal(flow.contract_version, FLOW_VERSION);
  assert.equal(flow.store_context.connection_id, fixture.identity.store_context.connection_id);
  assert.equal(flow.store_context.shop, fixture.identity.store_context.shop);
  assert.ok(['awaiting_material_answer', 'architecture_frozen', 'preview_ready', 'merchant_action_required'].every((state) => STATES.includes(state)));
  assert.equal(assertMerchantGenerationFlow(flow, root), flow);
});
test('valid transitions retain ordered event history', () => {
  const cycle = selected(fixture.controlled_cases.direct_current);
  assert.deepEqual(cycle.flow.history.map((item) => item.event), ['flow_created', 'store_intelligence_bound', 'merchant_intent_bound', 'architecture_selection_started', 'architecture_frozen']);
});
test('retryable Store Intelligence failure can recover without replacing flow identity', () => {
  const contracts = contractsForCase(entry(fixture.controlled_cases.direct_current)); let flow = createMerchantGenerationFlow({ projectId: fixture.identity.project_id, organizationId: fixture.identity.organization_id, conversationRevision: fixture.identity.conversation_revision, storeContext: fixture.identity.store_context, createdAt: time(0), root }); const flowId = flow.flow_id; flow = failFlow(flow, 'store_intelligence_unavailable', 'Controlled unavailable intake.', true, time(1), root); flow = retryStoreIntelligence(flow, contracts.storeIntelligence, time(2), root); assert.equal(flow.state, 'store_intelligence_ready'); assert.equal(flow.flow_id, flowId); assert.equal(flow.context.store_intelligence.revision_id, contracts.storeIntelligence.revision_id);
});
test('invalid state transition is rejected', () => {
  assert.throws(() => bindDesignDna(initialized(fixture.controlled_cases.direct_current).flow, fixture.design_dna, time(4), root), /not allowed/);
});
test('direct Current lifecycle freezes Current with zero material question', () => {
  const cycle = selected(fixture.controlled_cases.direct_current); assert.equal(cycle.flow.context.architecture_selection.profile_id, 'profile.current_calinium.v1'); assert.equal(cycle.flow.context.question_request, null);
});
test('direct Editorial lifecycle freezes Editorial with zero material question', () => {
  const cycle = selected(fixture.controlled_cases.direct_editorial); assert.equal(cycle.flow.context.architecture_selection.profile_id, 'profile.editorial_discovery.v1'); assert.equal(cycle.flow.context.question_request, null);
});
test('direct Current controlled lifecycle reaches preview_ready', () => {
  const flow = previewReady(selected(fixture.controlled_cases.direct_current).flow); assert.equal(flow.state, 'preview_ready'); assert.equal(flow.context.architecture_selection.profile_id, 'profile.current_calinium.v1'); assert.equal(flow.context.question_request, null);
});
test('direct Editorial controlled lifecycle reaches preview_ready', () => {
  const flow = previewReady(selected(fixture.controlled_cases.direct_editorial).flow); assert.equal(flow.state, 'preview_ready'); assert.equal(flow.context.architecture_selection.profile_id, 'profile.editorial_discovery.v1'); assert.equal(flow.context.question_request, null);
});
test('material ambiguity pauses before Design DNA', () => {
  const cycle = ambiguous(); assert.equal(cycle.flow.state, 'awaiting_material_answer'); assert.equal(cycle.flow.design_dna, null); assert.equal(cycle.flow.context.architecture_selection, null);
});
test('information-led answer resumes to Current', async () => {
  const cycle = await resolvedAmbiguous('information_led'); assert.equal(cycle.flow.context.architecture_selection.profile_id, 'profile.current_calinium.v1'); assert.equal(cycle.resolution.rerun_count, 1);
});
test('image-led answer resumes to Editorial', async () => {
  const cycle = await resolvedAmbiguous('image_led'); assert.equal(cycle.flow.context.architecture_selection.profile_id, 'profile.editorial_discovery.v1'); assert.equal(cycle.resolution.rerun_count, 1);
});
test('ambiguous information-led controlled lifecycle reaches Current preview_ready', async () => {
  const flow = previewReady((await resolvedAmbiguous('information_led')).flow); assert.equal(flow.state, 'preview_ready'); assert.equal(flow.context.architecture_selection.profile_id, 'profile.current_calinium.v1'); assert.equal(flow.context.question_request.allowance.question_number, 1);
});
test('ambiguous image-led controlled lifecycle reaches Editorial preview_ready', async () => {
  const flow = previewReady((await resolvedAmbiguous('image_led')).flow); assert.equal(flow.state, 'preview_ready'); assert.equal(flow.context.architecture_selection.profile_id, 'profile.editorial_discovery.v1'); assert.equal(flow.context.question_request.allowance.question_number, 1);
});
test('one material question consumes the allowance permanently', () => {
  const cycle = ambiguous(); assert.deepEqual(cycle.question.allowance, { maximum_questions: 1, question_number: 1, consumed: true }); assert.throws(() => pauseForMaterialAnswer(cycle.flow, cycle.result, cycle.question, time(6), root), /not allowed/);
});
test('Store Intelligence remains checksum-identical across pause and answer', async () => {
  const cycle = await resolvedAmbiguous('image_led'); assert.equal(digest(cycle.flow.context.store_intelligence), digest(cycle.storeIntelligence)); assert.equal(cycle.flow.context.architecture_selection.automatic_policy.input_bindings.store_intelligence_checksum, digest(cycle.storeIntelligence));
});
test('clarification creates a provenance-bound child Merchant Intent', async () => {
  const cycle = await resolvedAmbiguous('image_led'); assert.equal(cycle.flow.context.merchant_intent.parent_revision_id, cycle.merchantIntent.revision_id); assert.equal(cycle.flow.context.merchant_intent.material_question_resolution.question_id, cycle.question.question_id);
});
test('architecture freeze is prerequisite for Design DNA', () => {
  assert.throws(() => bindDesignDna(ambiguous().flow, fixture.design_dna, time(8), root), /not allowed/);
});
test('Design DNA binds only after architecture freeze', () => {
  const flow = bindDesignDna(selected(fixture.controlled_cases.direct_current).flow, fixture.design_dna, time(8), root); assert.equal(flow.state, 'design_dna_ready'); assert.equal(flow.design_dna.revision_id, fixture.design_dna.revision_id);
});
test('generation cannot start before composition', () => {
  const flow = bindDesignDna(selected(fixture.controlled_cases.direct_current).flow, fixture.design_dna, time(8), root); assert.throws(() => startGeneration(flow, fixture.generation_id, time(10), root), /paid identity/);
});
test('paid generation cannot start without one bound paid identity', () => {
  const flow = compositionReady(selected(fixture.controlled_cases.direct_current).flow); assert.throws(() => startGeneration(flow, fixture.generation_id, time(10), root), /paid identity/);
});
test('paid identity can be enriched but never replaced', () => {
  let flow = compositionReady(selected(fixture.controlled_cases.direct_current).flow); flow = bindPaidIdentity(flow, fixture.paid_identity_pending, time(10), root); flow = bindPaidIdentity(flow, fixture.paid_identity_frozen, time(11), root); assert.equal(flow.paid_identity.snapshot_id, fixture.paid_identity_frozen.snapshot_id); assert.throws(() => bindPaidIdentity(flow, { ...fixture.paid_identity_frozen, order_id: 'different-order' }, time(12), root), /different paid-generation identity/);
});
test('serialized retry restores the exact flow identity and checksum', () => {
  const flow = generationRunning(selected(fixture.controlled_cases.direct_current).flow); assert.deepEqual(resumeMerchantGenerationFlow(JSON.stringify(flow), root), flow);
});
test('resuming awaiting answer does not duplicate the question', () => {
  const flow = ambiguous().flow; const resumed = resumeMerchantGenerationFlow(flow, root); assert.equal(resumed.context.question_request.question_id, flow.context.question_request.question_id); assert.equal(resumed.history.length, flow.history.length);
});
test('resuming after architecture freeze does not reselect', () => {
  const flow = selected(fixture.controlled_cases.direct_editorial).flow; const resumed = resumeMerchantGenerationFlow(flow, root); assert.equal(resumed.context.architecture_selection.revision_id, flow.context.architecture_selection.revision_id); assert.equal(resumed.sequence, flow.sequence);
});
test('artifact binds the exact generation identity', () => {
  const flow = artifactReady(selected(fixture.controlled_cases.direct_current).flow); assert.equal(flow.artifact.generation_id, fixture.generation_id); assert.equal(flow.artifact.checksum, fixture.artifact.checksum);
});
test('render and D1/D2.7 QA execute only after artifact readiness', () => {
  let flow = artifactReady(selected(fixture.controlled_cases.direct_current).flow); flow = startRenderQa(flow, time(14), root); flow = completeRenderQa(flow, fixture.qa_passed, time(15), root); assert.equal(flow.state, 'preview_ready'); assert.equal(flow.render_qa.d1.status, 'passed'); assert.equal(flow.render_qa.d2_7.status, 'passed');
});
test('QA review finding pauses instead of approving preview', () => {
  let flow = startRenderQa(artifactReady(selected(fixture.controlled_cases.direct_current).flow), time(14), root); flow = completeRenderQa(flow, fixture.qa_review_required, time(15), root); assert.equal(flow.state, 'qa_review_required'); assert.equal(flow.failure.category, 'review_required');
});
test('QA pause never activates automatic repair', () => {
  let flow = startRenderQa(artifactReady(selected(fixture.controlled_cases.direct_current).flow), time(14), root); flow = completeRenderQa(flow, fixture.qa_review_required, time(15), root); assert.equal(flow.safety.automatic_repair_allowed, false); assert.equal(flow.repair, null);
});
test('machine repair recommendation still waits for human repair classification', () => {
  let flow = startRenderQa(artifactReady(selected(fixture.controlled_cases.direct_current).flow), time(14), root); flow = completeRenderQa(flow, { ...clone(fixture.qa_review_required), status: 'repair_required' }, time(15), root); assert.equal(flow.state, 'qa_review_required'); assert.equal(flow.repair, null); assert.equal(flow.safety.automatic_repair_allowed, false);
});
test('human-reviewed repair completion can resume to preview', () => {
  let flow = startRenderQa(artifactReady(selected(fixture.controlled_cases.direct_current).flow), time(14), root); flow = completeRenderQa(flow, fixture.qa_review_required, time(15), root); flow = recordQaReview(flow, fixture.qa_human_review_needs_fix, '2026-08-17T12:00:16.000Z', root); assert.equal(flow.state, 'repair_review_required'); flow = recordRepairResolution(flow, fixture.approved_repair_resolution, '2026-08-17T12:00:17.000Z', root); assert.equal(flow.state, 'preview_ready');
});
test('preview_ready requires artifact plus passed QA', () => {
  const flow = previewReady(selected(fixture.controlled_cases.direct_current).flow); assert.equal(flow.state, 'preview_ready'); assert.ok(flow.artifact); assert.equal(flow.render_qa.status, 'passed');
});
test('merchant action remains separate from preview readiness', () => {
  const flow = previewReady(selected(fixture.controlled_cases.direct_current).flow); assert.equal(flow.merchant_action.authorized, false); assert.equal(publicFlowStatus(flow, root).merchant_action_authorized, false);
});
test('automatic publishing and live mutation remain forbidden', () => {
  const flow = previewReady(selected(fixture.controlled_cases.direct_current).flow); assert.equal(flow.safety.automatic_publish_allowed, false); assert.equal(flow.safety.live_theme_mutation_allowed, false); assert.equal(flow.merchant_action.operation_completed, false);
});
test('explicit merchant authorization is required before operation completion', () => {
  const flow = previewReady(selected(fixture.controlled_cases.direct_current).flow); assert.throws(() => completeThemeOperation(flow, 'theme-operation-e3', '2026-08-17T12:00:17.000Z', root), /prior explicit merchant authorization/); const authorized = authorizeMerchantAction(flow, { authorized: true }, '2026-08-17T12:00:17.000Z', root); const complete = completeThemeOperation(authorized, 'theme-operation-e3', '2026-08-17T12:00:18.000Z', root); assert.equal(complete.state, 'completed');
});
test('tampered serialization fails checksum validation', () => {
  const flow = selected(fixture.controlled_cases.direct_current).flow; const changed = clone(flow); changed.project_id = 'another-project'; assert.throws(() => resumeMerchantGenerationFlow(changed, root), /checksum is stale/);
});
test('public status exposes no profile names, families, or scores', () => {
  const status = JSON.stringify(publicFlowStatus(selected(fixture.controlled_cases.direct_editorial).flow, root)); assert.doesNotMatch(status, /profile\.|Editorial Discovery|Current Calinium|candidate_results|score|family/i);
});
test('internal provenance summary answers every audit identity', async () => {
  const flow = previewReady((await resolvedAmbiguous('image_led')).flow); const summary = flowProvenanceSummary(flow, root); assert.ok(summary.store_intelligence.revision_id); assert.ok(summary.merchant_intent.parent_revision_id); assert.ok(summary.material_clarification.answer_revision); assert.ok(summary.architecture.reason_codes.length); assert.ok(summary.design_dna.revision_id); assert.ok(summary.artifact.artifact_id); assert.equal(summary.render_qa.status, 'passed'); assert.equal(summary.merchant_action.authorized, false);
});
test('unresolved answer preserves the same question and never guesses', () => {
  const cycle = ambiguous(); const flow = recordUnresolvedMaterialAnswer(cycle.flow, 'Unclear answer', time(6), root); assert.equal(flow.state, 'awaiting_material_answer'); assert.equal(flow.context.question_request.question_id, cycle.question.question_id); assert.equal(flow.context.architecture_selection, null); assert.equal(flow.failure.category, 'unresolved_merchant_answer');
});
test('generation interruption resumes without changing generation identity', () => {
  const running = generationRunning(selected(fixture.controlled_cases.direct_current).flow); const interrupted = markGenerationInterrupted(running, time(13), root); const restored = resumeMerchantGenerationFlow(interrupted, root); const resumed = resumeInterruptedGeneration(restored, time(14), root); assert.equal(resumed.generation.generation_id, running.generation.generation_id); assert.equal(resumed.generation.status, 'running'); assert.equal(resumed.context.architecture_selection.revision_id, running.context.architecture_selection.revision_id);
});
test('failed generation retry preserves paid and architecture identities', () => {
  const running = generationRunning(selected(fixture.controlled_cases.direct_current).flow); const failed = failFlow(running, 'generation_failed', 'Controlled failure.', true, time(13), root); const retried = retryGeneration(failed, `${fixture.generation_id}-retry-2`, time(14), root); assert.equal(retried.state, 'generation_running'); assert.equal(retried.paid_identity.order_id, running.paid_identity.order_id); assert.equal(retried.paid_identity.snapshot_checksum, running.paid_identity.snapshot_checksum); assert.equal(retried.context.architecture_selection.revision_id, running.context.architecture_selection.revision_id); assert.equal(retried.generation.generation_id, `${fixture.generation_id}-retry-2`);
});
test('failed render retry reuses the generated artifact', () => {
  let flow = startRenderQa(artifactReady(selected(fixture.controlled_cases.direct_current).flow), time(14), root); const failedResult = { ...clone(fixture.qa_passed), status: 'failed', d1: { status: 'failed', evidence_id: null, evidence_checksum: null }, d2_7: { status: 'not_required', evidence_id: null, evidence_checksum: null }, human_review_required: false }; flow = completeRenderQa(flow, failedResult, time(15), root); const artifactChecksum = flow.artifact.checksum; flow = retryRenderQa(flow, '2026-08-17T12:00:16.000Z', root); flow = completeRenderQa(flow, fixture.qa_passed, '2026-08-17T12:00:17.000Z', root); assert.equal(flow.state, 'preview_ready'); assert.equal(flow.artifact.checksum, artifactChecksum);
});
test('D2.7 retryability controls terminal state while retaining the accepted render and D1 graph', () => {
  const prepared = () => {
    let flow = startRenderQa(artifactReady(selected(fixture.controlled_cases.direct_current).flow), time(14), root);
    flow.store_context.shop = 'controlled-example.myshopify.com';
    flow.store_context_checksum = digest(flow.store_context);
    return withCanonicalChecksum(flow);
  };
  const timeoutFlow = prepared();
  const timeoutFailure = d27FailureFor(timeoutFlow, Object.assign(new Error('timeout'), { code: 'live_design_timeout', attempts: 3 }));
  let retryable = completeRenderQa(timeoutFlow, {
    ...clone(fixture.qa_passed), status: 'failed',
    d2_7: { status: 'failed', evidence_id: timeoutFailure.failure_id, evidence_checksum: timeoutFailure.checksum },
    d2_7_failure: timeoutFailure, human_review_required: false
  }, time(15), root);
  assert.equal(retryable.state, 'failed_retryable');
  assert.equal(retryable.failure.category, 'd2_7_provider_timeout');
  retryable = retryRenderQa(retryable, '2026-08-17T12:00:16.000Z', root);
  assert.equal(retryable.render_qa.render_checksum, fixture.qa_passed.render_checksum);
  assert.equal(retryable.render_qa.d1.evidence_checksum, fixture.qa_passed.d1.evidence_checksum);

  const authFlow = prepared();
  const authFailure = d27FailureFor(authFlow, Object.assign(new Error('auth'), { code: 'live_design_authentication_failed', status: 401 }));
  const terminal = completeRenderQa(authFlow, {
    ...clone(fixture.qa_passed), status: 'failed',
    d2_7: { status: 'failed', evidence_id: authFailure.failure_id, evidence_checksum: authFailure.checksum },
    d2_7_failure: authFailure, human_review_required: false
  }, time(15), root);
  assert.equal(terminal.state, 'failed_terminal');
  assert.equal(terminal.failure.category, 'd2_7_provider_authentication_failed');
  assert.equal(terminal.failure.retryable, false);

  let legacyFlow = prepared();
  legacyFlow = completeRenderQa(legacyFlow, {
    ...clone(fixture.qa_passed), status: 'failed',
    d1: { status: 'failed', evidence_id: null, evidence_checksum: null },
    d2_7: { status: 'not_required', evidence_id: null, evidence_checksum: null },
    human_review_required: false
  }, time(15), root);
  const historical = d27FailureFor(legacyFlow, null);
  const legacyResolution = resolveControlledBetaD27LegacyLineage({
    scope: {
      organization_id: legacyFlow.organization_id, project_id: legacyFlow.project_id, flow_id: legacyFlow.flow_id,
      current_flow_sequence: legacyFlow.sequence, current_flow_checksum: legacyFlow.checksum,
      job_id: historical.binding.job_id, logical_attempt: historical.binding.job_attempt,
      artifact_id: legacyFlow.artifact.artifact_id, artifact_checksum: legacyFlow.artifact.checksum,
      development_shop: historical.binding.development_shop, development_theme_id: historical.binding.development_theme_id,
      runtime_configuration_revision: historical.binding.runtime_configuration_revision,
      render_target_configuration_revision: historical.binding.render_target_configuration_revision,
      deployed_source_revision: null,
      route_ids: [...historical.binding.route_ids],
      viewport_ids: [...historical.binding.viewport_ids]
    },
    candidates: [{
      evidence_directory_reference: historical.binding.evidence_directory_reference,
      compatibility: 'reusable', incompatibility_codes: [],
      render: {
        request_id: historical.binding.render_request_id, request_checksum: historical.binding.render_request_checksum,
        render_checksum: historical.binding.render_checksum, render_revision: fixture.qa_passed.render_revision,
        render_result_ids: historical.binding.render_result_ids, route_ids: historical.binding.route_ids,
        viewport_ids: historical.binding.viewport_ids
      },
      d1: {
        evidence_id: historical.binding.d1_evidence_id, evidence_checksum: historical.binding.d1_evidence_checksum,
        status: 'passed', policy_revision: historical.binding.d1_policy_revision,
        render_request_id: historical.binding.render_request_id, render_request_checksum: historical.binding.render_request_checksum
      },
      d2_7_parent: {
        request_id: historical.request.request_id, request_checksum: historical.request.request_checksum,
        source_render_request_id: historical.binding.render_request_id, source_render_checksum: historical.binding.render_checksum,
        source_d1_evidence_id: historical.binding.d1_evidence_id, source_d1_evidence_checksum: historical.binding.d1_evidence_checksum
      },
      provenance: {
        organization_id: legacyFlow.organization_id, project_id: legacyFlow.project_id, flow_id: legacyFlow.flow_id,
        flow_sequence: legacyFlow.sequence - 1, flow_checksum: '6'.repeat(64),
        artifact_id: legacyFlow.artifact.artifact_id, artifact_checksum: legacyFlow.artifact.checksum,
        development_shop: historical.binding.development_shop, development_theme_id: historical.binding.development_theme_id,
        runtime_configuration_revision: historical.binding.runtime_configuration_revision,
        render_target_configuration_revision: historical.binding.render_target_configuration_revision,
        deployed_source_revision: null
      },
      explicit_association: { job_id: null, logical_attempt: null }
    }]
  }, root);
  const recovered = {
    ...clone(fixture.qa_passed), status: 'failed',
    d2_7: { status: 'failed', evidence_id: historical.failure_id, evidence_checksum: historical.checksum },
    d2_7_failure: historical, legacy_lineage_resolution: legacyResolution, human_review_required: false
  };
  const legacyRetry = retryRenderQa(legacyFlow, '2026-08-17T12:00:16.000Z', root, { recoveredRenderQa: recovered });
  assert.equal(legacyRetry.state, 'render_qa_running');
  assert.equal(legacyRetry.render_qa.d2_7_failure.classification.failure_class, 'historical_detail_unavailable');
  assert.equal(legacyRetry.render_qa.render_checksum, fixture.qa_passed.render_checksum);
});
test('only two frozen beta repair classes are admitted', () => {
  assert.deepEqual(REPAIR_CLASSES, ['responsive_layout', 'generated_content_eligibility']); const flow = selected(fixture.controlled_cases.direct_current).flow; assert.deepEqual(flow.safety.repair_classes, REPAIR_CLASSES);
});
test('frozen selection remains bound to Merchant Intent and Store Intelligence', async () => {
  const flow = (await resolvedAmbiguous('information_led')).flow; assert.equal(assertArchitectureSelectionInputBindings(flow.context.architecture_selection, flow.context.merchant_intent, flow.context.store_intelligence), flow.context.architecture_selection);
});
test('public question is natural and does not expose architecture internals', () => {
  const status = publicFlowStatus(ambiguous().flow, root); assert.equal(status.question.prompt, 'When customers shop, should the experience feel more visual and story-led, or more direct and efficient?'); assert.doesNotMatch(JSON.stringify(status.question), /profile\.|score|weight|family/i);
});
test('server integration remains registered and storefront source remains untouched', () => {
  const services = fs.readFileSync(path.join(root, 'apps/dashboard/server/dashboard-services.cjs'), 'utf8'); const api = fs.readFileSync(path.join(root, 'apps/dashboard/server/dashboard-api.cjs'), 'utf8'); assert.match(services, /MerchantGenerationFlowService/); assert.match(api, /merchant-generation-flow/); const changed = fs.existsSync(path.join(root, '.git')) ? require('child_process').execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }) : ''; assert.doesNotMatch(changed, /apps\/theme\//);
});

async function run() {
  for (const item of tests) { await item.run(); process.stdout.write(`✓ ${item.name}\n`); }
  process.stdout.write(`\n${tests.length}/${tests.length} merchant generation-flow tests passed.\n`);
}
if (require.main === module) run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { run };
