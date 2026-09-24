#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { digest, selectArchitecture } = require('../ai/architecture');
const {
  FLOW_VERSION, LEGACY_FLOW_VERSION, createMerchantGenerationFlow, resumeMerchantGenerationFlow,
  bindStoreIntelligence, bindMerchantIntent, startArchitectureSelection, freezeArchitecture,
  bindDesignDna, bindComposition, bindPaidIdentity, startGeneration, bindArtifact, startRenderQa, completeRenderQa,
  recordQaReview, recordRepairResolution, cancelMerchantGenerationFlow, publicFlowStatus,
  assertOperatorAuthorizationPolicy, assertOperatorOperationRequest, createOperatorOperationRecord,
  assertOperatorOperationReplay
} = require('../ai/merchant-flow');
const { MerchantFlowOperatorAuthorizationService } = require('../apps/dashboard/server/services/merchant-flow-operator-authorization-service.cjs');
const { MerchantFlowJobRunner } = require('../apps/dashboard/server/services/merchant-flow-job-runner.cjs');
const { SqliteDriver } = require('../apps/dashboard/server/storage/sqlite-driver.cjs');
const { DashboardStore } = require('../apps/dashboard/server/storage/dashboard-store.cjs');
const { contractsForCase } = require('./test-automatic-architecture-selection');

const root = path.resolve(__dirname, '..');
const selectionFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/automatic-architecture-selection.json'), 'utf8'));
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/merchant-generation-flow.json'), 'utf8'));
const at = '2026-08-18T12:00:00.000Z';
const tests = [];
function test(name, run) { tests.push({ name, run }); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function directCurrentQaReviewFlow() {
  const entry = selectionFixture.cases.find((item) => item.id === fixture.controlled_cases.direct_current);
  const contracts = contractsForCase(entry);
  let flow = createMerchantGenerationFlow({ projectId: fixture.identity.project_id, organizationId: fixture.identity.organization_id, conversationRevision: fixture.identity.conversation_revision, storeContext: fixture.identity.store_context, createdAt: fixture.timestamps[0], root });
  flow = bindStoreIntelligence(flow, contracts.storeIntelligence, fixture.timestamps[1], root);
  flow = bindMerchantIntent(flow, contracts.merchantIntent, fixture.timestamps[2], root);
  flow = startArchitectureSelection(flow, fixture.timestamps[3], root);
  flow = freezeArchitecture(flow, selectArchitecture({ merchantIntent: contracts.merchantIntent, storeIntelligence: contracts.storeIntelligence, selectionMode: 'automatic_beta', root }), fixture.timestamps[4], {}, root);
  flow = bindDesignDna(flow, fixture.design_dna, fixture.timestamps[8], root);
  flow = bindComposition(flow, fixture.composition, fixture.timestamps[9], root);
  flow = bindPaidIdentity(flow, fixture.paid_identity_pending, fixture.timestamps[10], root);
  flow = bindPaidIdentity(flow, fixture.paid_identity_frozen, fixture.timestamps[11], root);
  flow = startGeneration(flow, fixture.generation_id, fixture.timestamps[12], root);
  flow = bindArtifact(flow, fixture.artifact, fixture.timestamps[13], root);
  flow = startRenderQa(flow, fixture.timestamps[14], root);
  return completeRenderQa(flow, fixture.qa_review_required, fixture.timestamps[15], root);
}
function operationRequest(flow, overrides = {}) {
  return {
    contract_version: 'merchant-flow-operator-operation-v1', operation_kind: 'cancel', idempotency_key: 'operator-request-0001',
    expected_flow_sequence: flow.sequence, expected_flow_checksum: flow.checksum,
    evidence: { reason_code: 'operator_requested' }, decision: null, ...overrides
  };
}

test('legacy v1 resumes through a checksum-preserving v2 upgrade', () => {
  const current = createMerchantGenerationFlow({ projectId: 'prj_upgrade', organizationId: 'org_upgrade', conversationRevision: 'conversation-upgrade', createdAt: at, root });
  const legacy = clone(current); delete legacy.operator_provenance; delete legacy.cancellation; delete legacy.checksum; legacy.contract_version = LEGACY_FLOW_VERSION; legacy.checksum = digest(legacy);
  const upgraded = resumeMerchantGenerationFlow(legacy, root);
  assert.equal(upgraded.contract_version, FLOW_VERSION);
  assert.deepEqual(upgraded.operator_provenance, { qa_review: null, repair_resolution: null });
  assert.equal(upgraded.cancellation, null);
});

test('cancellation is terminal, evidence-bound, and idempotent', () => {
  const flow = createMerchantGenerationFlow({ projectId: 'prj_cancel', organizationId: 'org_cancel', conversationRevision: 'conversation-cancel', createdAt: at, root });
  const request = { operation_id: 'merchant-flow-operation-cancel', actor_user_id: 'usr_operator', reason_code: 'operator_requested' };
  const cancelled = cancelMerchantGenerationFlow(flow, request, '2026-08-18T12:00:01.000Z', root);
  assert.equal(cancelled.state, 'cancelled');
  assert.equal(publicFlowStatus(cancelled, root).cancelled, true);
  assert.equal(cancelMerchantGenerationFlow(cancelled, request, '2026-08-18T12:00:02.000Z', root).checksum, cancelled.checksum);
  assert.throws(() => cancelMerchantGenerationFlow(cancelled, { ...request, operation_id: 'different-operation' }, '2026-08-18T12:00:02.000Z', root), (error) => error.code === 'merchant_flow_cancellation_conflict');
});

test('QA operator evidence must bind the exact current D2.7 evaluation', () => {
  const flow = directCurrentQaReviewFlow();
  const request = operationRequest(flow, {
    operation_kind: 'qa_review', idempotency_key: 'qa-review-request-0001', decision: 'accepted',
    evidence: {
      evaluation: { id: flow.render_qa.d2_7.evidence_id, checksum: flow.render_qa.d2_7.evidence_checksum, reference: 'output/operator-test/evaluation.json' },
      review: { id: 'design-review-operator', checksum: 'a'.repeat(64), reference: 'output/operator-test/review.json' }
    }
  });
  const record = createOperatorOperationRecord({ request, flow, projectId: flow.project_id, organizationId: flow.organization_id, actorUserId: 'usr_operator', createdAt: at, root });
  const reviewed = recordQaReview(flow, {
    review_id: request.evidence.review.id, checksum: request.evidence.review.checksum, decision: 'accepted',
    provenance: { operation_id: record.id, actor_user_id: record.actor_user_id, evaluation: request.evidence.evaluation }
  }, '2026-08-18T12:00:01.000Z', root);
  assert.deepEqual(reviewed.operator_provenance.qa_review.evaluation, { id: request.evidence.evaluation.id, checksum: request.evidence.evaluation.checksum });
  const stale = clone(request); stale.evidence.evaluation.checksum = 'b'.repeat(64);
  assert.throws(() => createOperatorOperationRecord({ request: stale, flow, projectId: flow.project_id, organizationId: flow.organization_id, actorUserId: 'usr_operator', createdAt: at, root }), (error) => error.code === 'merchant_flow_qa_evaluation_mismatch');
});

test('repair resolution preserves a complete graph and never enables automatic execution', () => {
  let flow = directCurrentQaReviewFlow();
  flow = recordQaReview(flow, fixture.qa_human_review_needs_fix, '2026-08-18T12:00:01.000Z', root);
  const evidence = {
    repair_class: flow.repair.repair_class,
    repair_plan: { id: 'repair-plan-operator', checksum: '1'.repeat(64), reference: 'plans/operator-test-plan.json' },
    plan_approval: { id: 'repair-plan-approval-operator', checksum: '2'.repeat(64), reference: 'output/operator-test/plan-approval.json' },
    repair_execution: { id: 'repair-execution-operator', checksum: '3'.repeat(64), reference: 'output/operator-test/execution.json' },
    post_repair_qa: { id: 'post-repair-qa-operator', checksum: '4'.repeat(64), reference: 'output/operator-test/post-qa.json' },
    final_human_review: { id: 'repair-human-review-operator', checksum: '5'.repeat(64), reference: 'output/operator-test/final-review.json' },
    final_state: { id: 'repair-final-state-operator', checksum: '6'.repeat(64), reference: 'output/operator-test/final-state.json' }
  };
  const request = operationRequest(flow, { operation_kind: 'repair_resolution', idempotency_key: 'repair-resolution-0001', evidence, decision: 'human_approved' });
  const record = createOperatorOperationRecord({ request, flow, projectId: flow.project_id, organizationId: flow.organization_id, actorUserId: 'usr_operator', createdAt: at, root });
  const resolution = { ...fixture.approved_repair_resolution, provenance: { operation_id: record.id, actor_user_id: record.actor_user_id, ...evidence } };
  const reviewed = recordRepairResolution(flow, resolution, '2026-08-18T12:00:02.000Z', root);
  assert.equal(reviewed.operator_provenance.repair_resolution.final_state.id, evidence.final_state.id);
  assert.equal(reviewed.repair.automatic_execution, false);
  assert.equal(reviewed.safety.automatic_repair_allowed, false);
});

test('authorization requires both an explicit user and an active owner/admin role', async () => {
  const policy = assertOperatorAuthorizationPolicy({ schema_version: '1.0', contract_version: 'merchant-flow-operator-authorization-v1', allowed_roles: ['owner', 'administrator'], operator_user_ids: ['usr_operator', 'usr_editor'] }, root);
  const memberships = { usr_operator: { status: 'active', role: 'owner' }, usr_editor: { status: 'active', role: 'editor' }, usr_admin: { status: 'active', role: 'administrator' } };
  const store = { findProjectById: async () => ({ id: 'prj_auth', organization_id: 'org_auth', status: 'active' }), findMembership: async (_org, user) => memberships[user] || null, findProjectShopifyConnection: async () => null };
  const authorization = new MerchantFlowOperatorAuthorizationService({ store, policy, root });
  assert.equal((await authorization.authorize({ userId: 'usr_operator', projectId: 'prj_auth' })).operator.explicitly_allowlisted, true);
  await assert.rejects(() => authorization.authorize({ userId: 'usr_editor', projectId: 'prj_auth' }), (error) => error.code === 'merchant_flow_operator_forbidden');
  await assert.rejects(() => authorization.authorize({ userId: 'usr_admin', projectId: 'prj_auth' }), (error) => error.code === 'merchant_flow_operator_forbidden');
});

test('migration, operation idempotency/CAS, and mid-run cancellation are durable', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-operator-core-'));
  const driver = new SqliteDriver({ filename: path.join(directory, 'dashboard.sqlite') });
  try {
    const store = new DashboardStore(driver);
    await store.migrate(at);
    await store.createUser({ id: 'usr_operator', email: 'operator@example.test', full_name: 'Operator', password_hash: 'not-used', status: 'active', created_at: at, updated_at: at });
    await store.createOrganization({ id: 'org_operator', name: 'Operator Org', slug: 'operator-org', created_by_user_id: 'usr_operator', created_at: at, updated_at: at });
    await store.createWorkspace({ id: 'wsp_operator', organization_id: 'org_operator', name: 'Operator Workspace', created_at: at, updated_at: at });
    await store.createMembership({ id: 'mem_operator', organization_id: 'org_operator', user_id: 'usr_operator', role: 'owner', status: 'active', created_at: at });
    await store.createProject({ id: 'prj_operator', organization_id: 'org_operator', workspace_id: 'wsp_operator', name: 'Operator Project', business_name: 'Operator', country: 'US', status: 'active', created_by_user_id: 'usr_operator', created_at: at, updated_at: at });
    const flow = createMerchantGenerationFlow({ projectId: 'prj_operator', organizationId: 'org_operator', conversationRevision: 'conversation-operator', createdAt: at, root });
    await store.createCreativeDirector({ id: 'cdr_operator', project_id: 'prj_operator', stage: 'generation', conversation_state: null, transcript: [], creative_brief: null, store_strategy: null, review: null, merchant_profile: null, generation_state: { merchant_flow: flow }, created_at: at, updated_at: at });
    const request = operationRequest(flow);
    const record = createOperatorOperationRecord({ request, flow, projectId: 'prj_operator', organizationId: 'org_operator', actorUserId: 'usr_operator', createdAt: at, root });
    const cancelledFlow = cancelMerchantGenerationFlow(flow, { operation_id: record.id, actor_user_id: 'usr_operator', reason_code: request.evidence.reason_code }, '2026-08-18T12:00:01.000Z', root);
    await store.createMerchantFlowJob({ id: 'merchant-flow-job-atomic-cancel', flow_id: flow.flow_id, project_id: 'prj_operator', organization_id: 'org_operator', job_kind: 'generation', identity_checksum: '9'.repeat(64), status: 'queued', attempt: 0, payload: {}, result: null, created_at: at, updated_at: at });
    const applied = await store.applyMerchantFlowOperatorOperation({ record, expectedGenerationState: { merchant_flow: flow }, nextGenerationState: { merchant_flow: cancelledFlow }, resultFlow: cancelledFlow, at: '2026-08-18T12:00:01.000Z' });
    assert.equal(applied.operation.status, 'applied');
    assert.equal((await store.findMerchantFlowJob('merchant-flow-job-atomic-cancel', 'prj_operator', 'org_operator')).status, 'cancelled');
    assert.equal((await store.applyMerchantFlowOperatorOperation({ record, expectedGenerationState: { merchant_flow: flow }, nextGenerationState: { merchant_flow: cancelledFlow }, resultFlow: cancelledFlow, at: '2026-08-18T12:00:02.000Z' })).replayed, true);
    const conflictRequest = operationRequest(flow, { evidence: { reason_code: 'support_abort' } });
    const conflictRecord = createOperatorOperationRecord({ request: conflictRequest, flow, projectId: 'prj_operator', organizationId: 'org_operator', actorUserId: 'usr_operator', createdAt: at, root });
    assert.throws(() => assertOperatorOperationReplay(applied.operation, conflictRecord), (error) => error.code === 'merchant_flow_operator_operation_idempotency_conflict');

    const identity = { job_id: 'merchant-flow-job-cancellable', identity_checksum: 'a'.repeat(64), binding: { flow_id: 'flow-job-cancellable', kind: 'generation' } };
    const runner = new MerchantFlowJobRunner({ store, autoRun: false, clock: () => new Date('2026-08-18T12:05:00.000Z') });
    let release; let started;
    const startedPromise = new Promise((resolve) => { started = resolve; });
    const releasePromise = new Promise((resolve) => { release = resolve; });
    runner.register('generation', async (_job, control) => { started(); await releasePromise; await control.checkpoint(); return { status: 'ready' }; });
    const queued = await runner.enqueue({ identity, projectId: 'prj_operator', organizationId: 'org_operator' });
    const running = runner.run(queued.job); await startedPromise;
    await runner.requestCancellation({ flowId: identity.binding.flow_id, projectId: 'prj_operator', organizationId: 'org_operator' });
    release();
    assert.equal((await running).status, 'cancelled');
    assert.equal((await store.findMerchantFlowJob(identity.job_id, 'prj_operator', 'org_operator')).result, null);

    const heartbeatIdentity = { job_id: 'merchant-flow-job-heartbeat', identity_checksum: 'b'.repeat(64), binding: { flow_id: 'flow-job-heartbeat', kind: 'generation' } };
    let releaseHeartbeat; let heartbeatStarted;
    const heartbeatStartedPromise = new Promise((resolve) => { heartbeatStarted = resolve; });
    const releaseHeartbeatPromise = new Promise((resolve) => { releaseHeartbeat = resolve; });
    const heartbeatRunner = new MerchantFlowJobRunner({ store, autoRun: false, leaseMilliseconds: 120, clock: () => new Date() });
    heartbeatRunner.register('generation', async () => { heartbeatStarted(); await releaseHeartbeatPromise; return { status: 'ready' }; });
    const heartbeatQueued = await heartbeatRunner.enqueue({ identity: heartbeatIdentity, projectId: 'prj_operator', organizationId: 'org_operator' });
    const heartbeatRunning = heartbeatRunner.run(heartbeatQueued.job); await heartbeatStartedPromise;
    await new Promise((resolve) => setTimeout(resolve, 180));
    const intruderAt = new Date().toISOString();
    const stolen = await store.claimMerchantFlowJob(heartbeatIdentity.job_id, 'prj_operator', 'org_operator', {
      leaseToken: 'intruder-lease', leaseExpiresAt: new Date(Date.now() + 120).toISOString(), updatedAt: intruderAt
    });
    assert.equal(stolen, null);
    releaseHeartbeat();
    assert.equal((await heartbeatRunning).status, 'completed');
  } finally {
    await driver.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('operator contracts reject raw or unsupported payload fields', () => {
  const flow = createMerchantGenerationFlow({ projectId: 'prj_payload', organizationId: 'org_payload', conversationRevision: 'conversation-payload', createdAt: at, root });
  assert.throws(() => assertOperatorOperationRequest({ ...operationRequest(flow), merchant_text: 'must not persist' }, root), (error) => error.code === 'merchant_flow_operator_operation_invalid');
});

async function run() {
  for (const item of tests) { await item.run(); process.stdout.write(`✓ ${item.name}\n`); }
  process.stdout.write(`\n${tests.length}/${tests.length} merchant-flow operator-operation tests passed. API calls: 0. Theme changes: 0.\n`);
}

if (require.main === module) run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { run };
