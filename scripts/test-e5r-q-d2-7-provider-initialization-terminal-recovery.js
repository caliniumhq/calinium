#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  createMerchantFlowD27Provider,
  normalizeMerchantFlowD27Failure,
  createMerchantFlowD27Failure,
  resolveControlledBetaD27LegacyLineage,
  createMerchantFlowD27TerminalRecovery,
  assertMerchantFlowD27TerminalRecovery,
  isTerminalD27RecoveryCandidate
} = require('../ai/design-evaluation');
const { MerchantFlowJobRunner } = require('../apps/dashboard/server/services/merchant-flow-job-runner.cjs');
const { SqliteDriver } = require('../apps/dashboard/server/storage/sqlite-driver.cjs');
const { DashboardStore } = require('../apps/dashboard/server/storage/dashboard-store.cjs');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/e5r-q-d2-7-provider-initialization-terminal-recovery.json'), 'utf8'));
const liveConfiguration = require('../config/storefront-live-design-evaluation.json');
const oldSource = '2000000000000000000000000000000000000005';
const newSource = '1111111111111111111111111111111111111111';
const at = '2026-09-03T12:00:00.000Z';
const checksum = (char) => String(char).repeat(64);
const clone = (value) => JSON.parse(JSON.stringify(value));
let networkCalls = 0;

function failureGraph() {
  const binding = {
    flow_id: fixture.historical_attempt_6.flow_id,
    project_id: fixture.authoritative_evidence.project_id,
    organization_id: 'org_e5r_q',
    job_id: fixture.historical_attempt_6.job_id,
    job_attempt: 6,
    artifact_id: fixture.authoritative_evidence.artifact_id,
    artifact_checksum: checksum('2'),
    evidence_directory_reference: 'output/e5r-q-terminal-recovery',
    render_request_id: 'merchant-render-request-e5r-q',
    render_request_checksum: checksum('3'),
    render_checksum: checksum('4'),
    render_result_ids: ['render-home-desktop', 'render-home-mobile'],
    route_ids: ['homepage'], viewport_ids: ['desktop-v1', 'mobile-v1'],
    d1_evidence_id: fixture.authoritative_evidence.d1_evaluation_id,
    d1_evidence_checksum: checksum('5'), d1_policy_revision: 'storefront-visual-evaluation-policy-v1',
    runtime_configuration_revision: 'merchant-flow-controlled-beta-runtime-v1',
    render_target_configuration_revision: 'merchant-flow-controlled-render-targets-v1',
    development_shop: 'calinium-example.myshopify.com', development_theme_id: '100000000006',
    deployed_source_revision: oldSource
  };
  const request = { request_id: fixture.authoritative_evidence.d2_7_parent_request_id, request_checksum: checksum('6') };
  const historicalFailure = createMerchantFlowD27Failure({
    root, error: new ReferenceError('provider_revision is not defined'), stage: 'unknown', occurredAt: at,
    requestBinding: request,
    provider: { interface_version: 'merchant-flow-d2-7-provider-v1', provider_id: 'calinium-openai-responses-merchant-concrete-observation', provider_version: '1.0.0', provider_kind: 'live_multimodal', provider_revision: 'provider-revision-e5r-q', model_id: 'gpt-5.6-sol', model_configuration_revision: 'gpt-5-6-sol-merchant-concrete-observation-v1' },
    binding, attemptSequence: 1
  });
  const flow = {
    flow_id: binding.flow_id, project_id: binding.project_id, organization_id: binding.organization_id,
    state: 'failed_terminal', sequence: 22, checksum: checksum('7'), artifact: { artifact_id: binding.artifact_id, checksum: binding.artifact_checksum },
    render_qa: {
      status: 'failed', render_revision: 'merchant-flow-storefront-render-v1', render_result_ids: binding.render_result_ids,
      render_checksum: binding.render_checksum,
      d1: { status: 'passed', evidence_id: binding.d1_evidence_id, evidence_checksum: binding.d1_evidence_checksum },
      d2_7: { status: 'failed', evidence_id: historicalFailure.failure_id, evidence_checksum: historicalFailure.checksum },
      d2_7_failure: historicalFailure, human_review_required: false
    },
    failure: { category: historicalFailure.classification.category, retryable: false, message: 'The policy-required visual evaluation did not complete.' }
  };
  const rawCandidate = {
    evidence_directory_reference: binding.evidence_directory_reference,
    compatibility: 'reusable', incompatibility_codes: [],
    render: { request_id: binding.render_request_id, request_checksum: binding.render_request_checksum, render_checksum: binding.render_checksum, render_revision: 'merchant-flow-storefront-render-v1', render_result_ids: binding.render_result_ids, route_ids: binding.route_ids, viewport_ids: binding.viewport_ids },
    d1: { evidence_id: binding.d1_evidence_id, evidence_checksum: binding.d1_evidence_checksum, status: 'passed', policy_revision: binding.d1_policy_revision, render_request_id: binding.render_request_id, render_request_checksum: binding.render_request_checksum },
    d2_7_parent: { request_id: request.request_id, request_checksum: request.request_checksum, source_render_request_id: binding.render_request_id, source_render_checksum: binding.render_checksum, source_d1_evidence_id: binding.d1_evidence_id, source_d1_evidence_checksum: binding.d1_evidence_checksum },
    provenance: { organization_id: binding.organization_id, project_id: binding.project_id, flow_id: binding.flow_id, flow_sequence: 19, flow_checksum: checksum('8'), artifact_id: binding.artifact_id, artifact_checksum: binding.artifact_checksum, development_shop: binding.development_shop, development_theme_id: binding.development_theme_id, runtime_configuration_revision: binding.runtime_configuration_revision, render_target_configuration_revision: binding.render_target_configuration_revision, deployed_source_revision: oldSource },
    explicit_association: { job_id: binding.job_id, logical_attempt: 5 }
  };
  const scope = {
    organization_id: binding.organization_id, project_id: binding.project_id, flow_id: binding.flow_id,
    current_flow_sequence: 20, current_flow_checksum: checksum('9'), job_id: binding.job_id, logical_attempt: 5,
    artifact_id: binding.artifact_id, artifact_checksum: binding.artifact_checksum,
    development_shop: binding.development_shop, development_theme_id: binding.development_theme_id,
    runtime_configuration_revision: binding.runtime_configuration_revision,
    render_target_configuration_revision: binding.render_target_configuration_revision,
    deployed_source_revision: oldSource, route_ids: binding.route_ids, viewport_ids: binding.viewport_ids
  };
  const resolution = resolveControlledBetaD27LegacyLineage({
    scope,
    authoritativeContext: {
      d2_7_parent: { request_id: request.request_id, request_checksum: request.request_checksum },
      job_attempt: { job_id: binding.job_id, logical_attempt: 5 },
      accepted_evidence: { render_request_id: binding.render_request_id, render_request_checksum: binding.render_request_checksum, render_checksum: binding.render_checksum, d1_evidence_id: binding.d1_evidence_id, d1_evidence_checksum: binding.d1_evidence_checksum },
      immediate_predecessor_flow_revision: { sequence: 19, checksum: checksum('8') }
    },
    candidates: [rawCandidate]
  }, root);
  const lineageBinding = {
    ...scope,
    status: resolution.status, resolution_id: resolution.resolution_id, resolution_checksum: resolution.resolution_checksum,
    candidate_set_checksum: resolution.candidate_set_checksum, selected_candidate_id: resolution.selection.selected_candidate_id,
    resolution, resume_operation_id: 'merchant-flow-resume-operation-attempt-6'
  };
  const job = { id: binding.job_id, flow_id: binding.flow_id, job_kind: 'render_qa', status: 'terminal', attempt: 6, authorized_resume_operation_id: lineageBinding.resume_operation_id };
  return { binding, historicalFailure, flow, resolution, lineageBinding, job };
}

async function testFactoryAndTaxonomy() {
  const providerRevision = 'openai-live-design-evaluation-gpt-5-6-sol-v1';
  const provider = createMerchantFlowD27Provider({
    root, configuration: liveConfiguration, providerRevision,
    env: { OPENAI_API_KEY: 'synthetic-non-live-e5r-q-key' },
    fetchImpl: async () => { networkCalls += 1; throw new Error('forbidden network'); }
  });
  assert.equal(provider.metadata.provider_revision, providerRevision);
  assert.equal(provider.metadata.model.id, 'gpt-5.6-sol');
  assert.equal(networkCalls, 0);
  const normalized = normalizeMerchantFlowD27Failure(new ReferenceError('provider_revision is not defined'), { stage: 'provider_initialization' });
  assert.equal(normalized.stage, 'provider_initialization');
  assert.equal(normalized.classification.category, 'd2_7_provider_client_initialization_failed');
  assert.equal(normalized.classification.failure_class, 'provider_client_initialization_failed');
  assert.equal(normalized.classification.retryable, false);
  assert.equal(normalized.transport.response_received, false);
  assert.equal(normalized.operation.attempts, 0);
}

function testRecoveryContract() {
  const graph = failureGraph();
  assert.equal(graph.historicalFailure.stage, 'unknown', 'attempt 6 remains historically recorded as unknown');
  assert.equal(graph.historicalFailure.classification.category, 'd2_7_unknown_provider_failure');
  assert.equal(isTerminalD27RecoveryCandidate(graph.flow, root), true);
  const selected = graph.resolution.candidates.find((candidate) => candidate.candidate_id === graph.lineageBinding.selected_candidate_id);
  const recovery = createMerchantFlowD27TerminalRecovery({
    authorizedAt: at, flow: graph.flow, job: graph.job, failure: graph.historicalFailure,
    currentSourceRevision: newSource, resumeOperationId: 'merchant-flow-resume-operation-attempt-7',
    actorUserId: 'usr_e5r_q', idempotencyKey: `merchant-flow-resume-${graph.flow.checksum}`,
    lineageBinding: graph.lineageBinding, selectedCandidate: selected
  }, root);
  assert.equal(assertMerchantFlowD27TerminalRecovery(recovery, root), recovery);
  assert.equal(recovery.job.source_attempt, 6);
  assert.equal(recovery.job.target_attempt, 7);
  assert.equal(recovery.render.render_checksum, graph.binding.render_checksum);
  assert.equal(recovery.d1.evidence_id, graph.binding.d1_evidence_id);
  assert.equal(recovery.d2_7_parent.request_id, graph.historicalFailure.request.request_id);
  assert.equal(recovery.safety.historical_attempt_mutated, false);
  assert.throws(() => createMerchantFlowD27TerminalRecovery({
    authorizedAt: at, flow: graph.flow, job: graph.job, failure: graph.historicalFailure,
    currentSourceRevision: newSource, resumeOperationId: 'merchant-flow-resume-operation-attempt-7',
    actorUserId: 'usr_e5r_q', idempotencyKey: `merchant-flow-resume-${graph.flow.checksum}`,
    lineageBinding: { ...graph.lineageBinding, candidate_set_checksum: checksum('0') }, selectedCandidate: selected
  }, root), /lineage/i);
  assert.throws(() => createMerchantFlowD27TerminalRecovery({
    authorizedAt: at, flow: graph.flow, job: graph.job, failure: graph.historicalFailure,
    currentSourceRevision: oldSource, resumeOperationId: 'merchant-flow-resume-operation-attempt-7',
    actorUserId: 'usr_e5r_q', idempotencyKey: `merchant-flow-resume-${graph.flow.checksum}`,
    lineageBinding: graph.lineageBinding, selectedCandidate: selected
  }, root), /eligible|changed/i);
}

async function createStoreFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-e5r-q-'));
  const filename = path.join(directory, 'dashboard.sqlite');
  const firstDriver = new SqliteDriver({ filename });
  const firstStore = new DashboardStore(firstDriver);
  await firstStore.migrate(at);
  await firstStore.createUser({ id: 'usr_e5r_q', email: 'e5r-q@example.test', full_name: 'E5R-Q', password_hash: 'unused', status: 'active', created_at: at, updated_at: at });
  await firstStore.createOrganization({ id: 'org_e5r_q', name: 'E5R-Q', slug: 'e5r-q', created_by_user_id: 'usr_e5r_q', created_at: at, updated_at: at });
  await firstStore.createWorkspace({ id: 'wsp_e5r_q', organization_id: 'org_e5r_q', name: 'E5R-Q', created_at: at, updated_at: at });
  await firstStore.createMembership({ id: 'mem_e5r_q', organization_id: 'org_e5r_q', user_id: 'usr_e5r_q', role: 'owner', status: 'active', created_at: at });
  await firstStore.createProject({ id: 'prj_e5r_q', organization_id: 'org_e5r_q', workspace_id: 'wsp_e5r_q', name: 'E5R-Q', business_name: 'E5R-Q', country: 'US', status: 'active', created_by_user_id: 'usr_e5r_q', created_at: at, updated_at: at });
  const flow = { flow_id: 'merchant-flow-e5r-q', sequence: 22, checksum: checksum('a'), state: 'failed_terminal', artifact: { artifact_id: 'artifact-e5r-q', checksum: checksum('b') } };
  await firstStore.createCreativeDirector({ id: 'cdr_e5r_q', project_id: 'prj_e5r_q', stage: 'generation', conversation_state: null, transcript: [], creative_brief: null, store_strategy: null, review: null, merchant_profile: null, generation_state: { merchant_flow: flow }, created_at: at, updated_at: at });
  await firstStore.createMerchantFlowJob({ id: 'merchant-flow-job-e5r-q', flow_id: flow.flow_id, project_id: 'prj_e5r_q', organization_id: 'org_e5r_q', job_kind: 'render_qa', identity_checksum: checksum('c'), status: 'terminal', attempt: 6, lease_epoch: 1, authorized_resume_operation_id: 'merchant-flow-resume-operation-attempt-6', authorized_attempt: 6, payload: {}, result: {}, failure_category: 'd2_7_unknown_provider_failure', failure_message: 'safe', created_at: at, updated_at: at });
  return { directory, firstDriver, firstStore, flow };
}

async function testDurableTerminalRecovery() {
  const state = await createStoreFixture();
  try {
    const nextFlow = { ...state.flow, sequence: 23, checksum: checksum('d'), state: 'render_qa_running' };
    const record = { id: 'merchant-flow-resume-operation-e5r-q', flow_id: state.flow.flow_id, job_id: 'merchant-flow-job-e5r-q', project_id: 'prj_e5r_q', organization_id: 'org_e5r_q', actor_user_id: 'usr_e5r_q', operation_kind: 'render_qa_retry', idempotency_key: `merchant-flow-resume-${state.flow.checksum}`, request_checksum: checksum('e'), request_id: 'request-e5r-q', expected_flow_sequence: 22, expected_flow_checksum: state.flow.checksum, expected_job_attempt: 6, target_job_attempt: 7, status: 'pending', created_at: at };
    const input = { record, expectedGenerationState: { merchant_flow: state.flow }, nextGenerationState: { merchant_flow: nextFlow }, resultFlow: nextFlow, at, expectedSessionUpdatedAt: at, expectedJobStatus: 'terminal' };
    const ordinaryResume = await state.firstStore.armMerchantFlowJobResume(record.job_id, record.project_id, record.organization_id, {
      expectedAttempt: 6, resumeOperationId: record.id, targetAttempt: 7, at
    });
    assert.equal(ordinaryResume, null, 'a terminal attempt cannot use the ordinary retryable-job resume path');
    await assert.rejects(
      state.firstStore.applyMerchantFlowResumeOperation({
        ...input,
        record: { ...record, expected_flow_checksum: checksum('f') }
      }),
      /invalid|bind/i,
      'a stale flow checksum must reject before the terminal job is armed'
    );
    const first = await state.firstStore.applyMerchantFlowResumeOperation(input);
    assert.equal(first.replayed, false);
    assert.equal(first.job.status, 'queued');
    assert.equal(first.job.attempt, 6, 'arming must not rewrite terminal attempt 6');
    assert.equal(first.job.authorized_attempt, 7);
    const replay = await state.firstStore.applyMerchantFlowResumeOperation(input);
    assert.equal(replay.replayed, true);
    let claims = 0;
    const runner = new MerchantFlowJobRunner({ store: state.firstStore, autoRun: false, clock: () => new Date(at) });
    runner.register('render_qa', async (_job, control) => { claims += 1; assert.equal(control.execution.attempt, 7); return { status: 'passed' }; });
    await Promise.all([runner.run(first.job), runner.run(first.job)]);
    const completed = await state.firstStore.findMerchantFlowJob(record.job_id, record.project_id, record.organization_id);
    assert.equal(claims, 1);
    assert.equal(completed.attempt, 7);
    assert.equal(completed.status, 'completed');
    await runner.run(first.job);
    assert.equal(claims, 1, 'the same action cannot create or claim attempt 8');
  } finally {
    await state.firstDriver.close();
    fs.rmSync(state.directory, { recursive: true, force: true });
  }
}

async function run() {
  const originalFetch = global.fetch;
  global.fetch = async () => { networkCalls += 1; throw new Error('network forbidden'); };
  try {
    await testFactoryAndTaxonomy();
    process.stdout.write('✓ real provider factory constructs with revision/model provenance and zero transport\n');
    testRecoveryContract();
    process.stdout.write('✓ terminal recovery contract preserves attempt 6 and binds exact lineage/render/D1/parent evidence\n');
    await testDurableTerminalRecovery();
    process.stdout.write('✓ one authenticated-style durable recovery operation arms and claims attempt 7 exactly once\n');
    assert.equal(networkCalls, 0);
    assert.equal(fixture.safety.openai_calls, 0);
    assert.equal(fixture.safety.shopify_calls, 0);
    assert.equal(fixture.safety.attempt_7_created, false);
    process.stdout.write('\n3/3 E5R-Q focused test groups passed. API/model calls: 0. Shopify calls: 0. Theme mutations: 0.\n');
  } finally { global.fetch = originalFetch; }
}

if (require.main === module) run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { run };
