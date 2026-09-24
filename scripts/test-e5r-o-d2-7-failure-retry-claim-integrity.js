#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  normalizeMerchantFlowD27Failure,
  createMerchantFlowD27Failure,
  createLegacyUnknownMerchantFlowD27Failure,
  assertMerchantFlowD27Failure
} = require('../ai/design-evaluation/merchant-flow-d2-7-failure');
const { requestOpenAiResponse } = require('../ai/design-evaluation/openai-responses-client');
const { MerchantFlowJobRunner, safeFailure } = require('../apps/dashboard/server/services/merchant-flow-job-runner.cjs');
const { SqliteDriver } = require('../apps/dashboard/server/storage/sqlite-driver.cjs');
const { DashboardStore } = require('../apps/dashboard/server/storage/dashboard-store.cjs');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/e5r-o-d2-7-failure-retry-claim-integrity.json'), 'utf8'));
const tests = [];
const at = '2026-09-01T14:00:00.000Z';
function test(name, run) { tests.push({ name, run }); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function checksum(char) { return String(char).repeat(64); }

function providerError(entry) {
  const error = new Error('SENSITIVE_CANARY_PROVIDER_MESSAGE');
  Object.assign(error, clone(entry.error), {
    headers: { authorization: 'SENSITIVE_CANARY_AUTHORIZATION' },
    rawBody: 'SENSITIVE_CANARY_RAW_BODY',
    prompt: 'SENSITIVE_CANARY_PROMPT',
    stack: 'SENSITIVE_CANARY_STACK',
    retries: Array.from({ length: entry.error.retryCount || 0 }, () => ({ body: 'SENSITIVE_CANARY_RETRY_BODY' }))
  });
  if (entry.error.name) error.name = entry.error.name;
  return error;
}

function assertNoSensitiveData(value) {
  const serialized = JSON.stringify(value);
  for (const marker of [
    'SENSITIVE_CANARY_PROVIDER_MESSAGE', 'SENSITIVE_CANARY_AUTHORIZATION', 'SENSITIVE_CANARY_RAW_BODY',
    'SENSITIVE_CANARY_PROMPT', 'SENSITIVE_CANARY_STACK', 'SENSITIVE_CANARY_RETRY_BODY'
  ]) assert.equal(serialized.includes(marker), false, `${marker} must not persist`);
}

test('provider failures normalize into the conservative sanitized taxonomy', () => {
  for (const entry of fixture.provider_cases) {
    const error = providerError(entry);
    const normalized = normalizeMerchantFlowD27Failure(error);
    assert.equal(normalized.stage, entry.expected.stage, entry.id);
    assert.equal(normalized.classification.category, entry.expected.category, entry.id);
    assert.equal(normalized.classification.failure_class, entry.expected.failure_class, entry.id);
    assert.equal(normalized.classification.retryable, entry.expected.retryable, entry.id);
    assert.equal(normalized.transport.http_status, entry.expected.http_status, entry.id);
    assert.equal(normalized.transport.provider_error_code, entry.expected.provider_error_code || null, entry.id);
    const failure = createMerchantFlowD27Failure({
      root,
      error,
      occurredAt: fixture.historical_attempt_5.failed_at,
      requestBinding: fixture.request_binding,
      provider: fixture.provider,
      binding: fixture.evidence_binding,
      attemptSequence: fixture.historical_attempt_5.job_attempt
    });
    assert.equal(failure.classification.category, entry.expected.category, entry.id);
    assert.equal(failure.operation.attempt_sequence, 5, entry.id);
    assert.equal(assertMerchantFlowD27Failure(failure, root), failure, entry.id);
    assertNoSensitiveData(failure);
  }
});

test('HTTP 429 never proves quota or rate without a dedicated structured code', () => {
  const ambiguous = normalizeMerchantFlowD27Failure(Object.assign(new Error('unavailable'), {
    code: 'live_design_rate_limited', status: 429, providerCode: 'billing-ish-but-unproven'
  }));
  assert.equal(ambiguous.classification.category, 'd2_7_provider_rate_or_quota_limited');
  assert.equal(ambiguous.classification.retryable, false);
  const unsafeAtom = normalizeMerchantFlowD27Failure(Object.assign(new Error('unavailable'), {
    code: 'live_design_rate_limited', status: 429, providerCode: 'token=SENSITIVE_CANARY'
  }));
  assert.equal(unsafeAtom.transport.provider_error_code, null);
  assert.equal(unsafeAtom.classification.category, 'd2_7_provider_rate_or_quota_limited');
});

test('Responses client stops immediately on proven quota and retains only safe structured metadata', async () => {
  let requests = 0;
  let sleeps = 0;
  const configuration = {
    api: {
      endpoint: 'https://example.invalid/v1/responses',
      timeout_ms: 100,
      max_attempts: 3,
      maximum_retry_delay_ms: 10,
      retry_statuses: [429, 500, 502, 503, 504]
    }
  };
  const fetchImpl = async () => {
    requests += 1;
    return {
      ok: false,
      status: 429,
      headers: { get: () => null },
      json: async () => ({
        error: {
          code: 'insufficient_quota',
          type: 'insufficient_quota',
          message: 'SENSITIVE_CANARY_PROVIDER_MESSAGE',
          raw: 'SENSITIVE_CANARY_RAW_BODY'
        }
      })
    };
  };
  let failure = null;
  try {
    await requestOpenAiResponse({
      configuration,
      credentials: { apiKey: 'test-only-placeholder' },
      body: { model: 'test-only' },
      fetchImpl,
      sleep: async () => { sleeps += 1; },
      clock: () => 0
    });
  } catch (error) { failure = error; }
  assert.ok(failure);
  assert.equal(failure.code, 'live_design_quota_failed');
  assert.equal(failure.retryable, false);
  assert.equal(failure.status, 429);
  assert.equal(failure.attempts, 1);
  assert.equal(failure.retries.length, 0);
  assert.equal(failure.providerCode, 'insufficient_quota');
  assert.equal(failure.providerType, 'insufficient_quota');
  assert.equal(requests, 1, 'proven quota must not consume another paid request');
  assert.equal(sleeps, 0, 'proven quota must not enter transport backoff');
  const normalized = normalizeMerchantFlowD27Failure(failure);
  assert.equal(normalized.classification.category, 'd2_7_provider_quota_failed');
  assert.equal(normalized.classification.retryable, false);
  assertNoSensitiveData(normalized);
});

test('Responses client projects malformed body, timeout, and network failures without live transport', async () => {
  const configuration = {
    api: {
      endpoint: 'https://example.invalid/v1/responses',
      timeout_ms: 100,
      max_attempts: 1,
      maximum_retry_delay_ms: 10,
      retry_statuses: [429, 500, 502, 503, 504]
    }
  };
  const invoke = async (fetchImpl) => {
    try {
      await requestOpenAiResponse({
        configuration,
        credentials: { apiKey: 'test-only-placeholder' },
        body: { model: 'test-only' },
        fetchImpl,
        sleep: async () => { throw new Error('single-attempt cases must not sleep'); },
        clock: () => 0
      });
    } catch (error) { return error; }
    throw new Error('expected a provider failure');
  };
  const malformed = await invoke(async () => ({ ok: true, status: 200, json: async () => { throw new Error('SENSITIVE_CANARY_RAW_BODY'); } }));
  assert.equal(malformed.code, 'live_design_malformed_http_response');
  assert.equal(malformed.responseReceived, true);
  assert.equal(malformed.parseFailure, true);
  assert.equal(normalizeMerchantFlowD27Failure(malformed).classification.category, 'd2_7_response_invalid');
  const timeout = await invoke(async () => { const error = new Error('SENSITIVE_CANARY_PROVIDER_MESSAGE'); error.name = 'AbortError'; throw error; });
  assert.equal(timeout.code, 'live_design_timeout');
  assert.equal(timeout.timeout, true);
  assert.equal(timeout.responseReceived, false);
  assert.equal(normalizeMerchantFlowD27Failure(timeout).classification.category, 'd2_7_provider_timeout');
  const network = await invoke(async () => { throw new Error('SENSITIVE_CANARY_PROVIDER_MESSAGE'); });
  assert.equal(network.code, 'live_design_network_failure');
  assert.equal(network.timeout, false);
  assert.equal(network.responseReceived, false);
  assert.equal(normalizeMerchantFlowD27Failure(network).classification.category, 'd2_7_provider_network_failed');
  assertNoSensitiveData({
    malformed: normalizeMerchantFlowD27Failure(malformed),
    timeout: normalizeMerchantFlowD27Failure(timeout),
    network: normalizeMerchantFlowD27Failure(network)
  });
});

test('attempt 5 remains an explicit historical unknown without invented provider detail', () => {
  const historical = createLegacyUnknownMerchantFlowD27Failure({
    root,
    occurredAt: fixture.historical_attempt_5.failed_at,
    requestBinding: fixture.request_binding,
    provider: fixture.provider,
    binding: fixture.evidence_binding,
    persistedJobStatus: fixture.historical_attempt_5.persisted_job_status,
    persistedFailureCategory: fixture.historical_attempt_5.persisted_failure_category,
    attemptSequence: fixture.historical_attempt_5.job_attempt
  });
  assert.equal(historical.binding.job_id, fixture.historical_attempt_5.job_id);
  assert.equal(historical.binding.job_attempt, 5);
  assert.equal(historical.stage, 'historical_unknown');
  assert.equal(historical.classification.failure_class, 'historical_detail_unavailable');
  assert.equal(historical.classification.retryable, null);
  assert.equal(historical.transport.http_status, null);
  assert.equal(historical.transport.provider_error_code, null);
  assert.equal(historical.historical_projection.source_attempt, 5);
  assert.equal(historical.historical_projection.provider_detail_availability, 'not_retained');
  assertMerchantFlowD27Failure(historical, root);
});

test('failure evidence is checksum-bound, closed to raw fields, and output-relative', () => {
  const value = createMerchantFlowD27Failure({
    root,
    error: Object.assign(new Error('safe'), { code: 'live_design_timeout', attempts: 3, retryCount: 2 }),
    occurredAt: fixture.historical_attempt_5.failed_at,
    requestBinding: fixture.request_binding,
    provider: fixture.provider,
    binding: fixture.evidence_binding,
    attemptSequence: 6
  });
  const raw = clone(value);
  raw.raw_provider_body = 'forbidden';
  assert.throws(() => assertMerchantFlowD27Failure(raw, root), /additional|validation/i);
  const tampered = clone(value);
  tampered.transport.http_status = 418;
  assert.throws(() => assertMerchantFlowD27Failure(tampered, root), /checksum/i);
  const escaped = clone(value);
  escaped.binding.evidence_directory_reference = 'output/../private/evidence';
  assert.throws(() => assertMerchantFlowD27Failure(escaped, root), /safe output-relative|pattern|checksum/i);
});

async function createStoreFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-e5r-o-'));
  const filename = path.join(directory, 'dashboard.sqlite');
  const firstDriver = new SqliteDriver({ filename });
  const firstStore = new DashboardStore(firstDriver);
  await firstStore.migrate(at);
  await firstStore.createUser({ id: 'usr_e5r_o', email: 'e5r-o@example.test', full_name: 'E5R-O', password_hash: 'unused', status: 'active', created_at: at, updated_at: at });
  await firstStore.createOrganization({ id: 'org_e5r_o', name: 'E5R-O', slug: 'e5r-o', created_by_user_id: 'usr_e5r_o', created_at: at, updated_at: at });
  await firstStore.createWorkspace({ id: 'wsp_e5r_o', organization_id: 'org_e5r_o', name: 'E5R-O', created_at: at, updated_at: at });
  await firstStore.createMembership({ id: 'mem_e5r_o', organization_id: 'org_e5r_o', user_id: 'usr_e5r_o', role: 'owner', status: 'active', created_at: at });
  await firstStore.createProject({ id: 'prj_e5r_o', organization_id: 'org_e5r_o', workspace_id: 'wsp_e5r_o', name: 'E5R-O', business_name: 'E5R-O', country: 'US', status: 'active', created_by_user_id: 'usr_e5r_o', created_at: at, updated_at: at });
  const flow = { flow_id: 'merchant-flow-e5r-o', sequence: 5, checksum: checksum('a'), state: 'failed_retryable' };
  await firstStore.createCreativeDirector({
    id: 'cdr_e5r_o', project_id: 'prj_e5r_o', stage: 'generation', conversation_state: null, transcript: [],
    creative_brief: null, store_strategy: null, review: null, merchant_profile: null,
    generation_state: { merchant_flow: flow }, created_at: at, updated_at: at
  });
  await firstStore.createMerchantFlowJob({
    id: 'merchant-flow-job-e5r-o', flow_id: flow.flow_id, project_id: 'prj_e5r_o', organization_id: 'org_e5r_o',
    job_kind: 'render_qa', identity_checksum: checksum('9'), status: 'retryable', attempt: 5,
    payload: { render_request_id: 'merchant-render-e5r-o' }, result: { status: 'retryable' },
    failure_category: 'd2_7_provider_timeout', failure_message: 'safe', created_at: at, updated_at: at
  });
  const secondDriver = new SqliteDriver({ filename });
  const secondStore = new DashboardStore(secondDriver);
  return { directory, firstDriver, secondDriver, firstStore, secondStore, flow };
}

function resumeRecord(flow, overrides = {}) {
  return {
    id: 'merchant-flow-resume-operation-e5r-o-0001',
    flow_id: flow.flow_id,
    job_id: 'merchant-flow-job-e5r-o',
    project_id: 'prj_e5r_o',
    organization_id: 'org_e5r_o',
    actor_user_id: 'usr_e5r_o',
    operation_kind: 'render_qa_retry',
    idempotency_key: 'merchant-resume-e5r-o-0001',
    request_checksum: checksum('b'),
    request_id: 'merchant-flow-resume-request-e5r-o-0001',
    expected_flow_sequence: flow.sequence,
    expected_flow_checksum: flow.checksum,
    expected_job_attempt: 5,
    target_job_attempt: 6,
    status: 'pending',
    created_at: at,
    ...overrides
  };
}

test('one durable resume intent authorizes one claim across two workers and delayed replay', async () => {
  const state = await createStoreFixture();
  try {
    const nextFlow = { ...state.flow, sequence: 6, checksum: checksum('c'), state: 'render_qa_running' };
    const record = resumeRecord(state.flow);
    const firstRunner = new MerchantFlowJobRunner({ store: state.firstStore, autoRun: false, clock: () => new Date(at) });
    const secondRunner = new MerchantFlowJobRunner({ store: state.secondStore, autoRun: false, clock: () => new Date(at) });
    let claims = 0;
    const failing = async (_job, control) => {
      claims += 1;
      assert.equal(control.execution.attempt, 6);
      assert.equal(control.execution.resume_operation_id, record.id);
      const error = Object.assign(new Error('SENSITIVE_CANARY_PROVIDER_MESSAGE'), {
        code: 'd2_7_provider_timeout', retryable: true,
        safe_evidence: {
          failure_stage: 'provider_transport', failure_id: 'merchant-flow-d2-7-failure-e5r-o',
          provider_http_status: 504, provider_error_code: 'timeout', d2_7_request_id: fixture.request_binding.request_id,
          failure_evidence_id: 'merchant-flow-d2-7-failure-e5r-o', failure_evidence_checksum: checksum('d'),
          raw_provider_body: 'SENSITIVE_CANARY_RAW_BODY'
        }
      });
      throw error;
    };
    firstRunner.register('render_qa', failing);
    secondRunner.register('render_qa', failing);
    const authorized = await firstRunner.authorizeResume({
      record,
      expectedGenerationState: { merchant_flow: state.flow },
      nextGenerationState: { merchant_flow: nextFlow },
      resultFlow: nextFlow,
      expectedSessionUpdatedAt: at,
      sequence: nextFlow.sequence
    });
    assert.equal(authorized.replayed, false);
    assert.equal(authorized.job.status, 'queued');
    assert.equal(authorized.job.authorized_resume_operation_id, record.id);
    assert.equal(authorized.job.authorized_attempt, 6);
    const replay = await secondRunner.authorizeResume({
      record,
      expectedGenerationState: { merchant_flow: state.flow },
      nextGenerationState: { merchant_flow: nextFlow },
      resultFlow: nextFlow,
      expectedSessionUpdatedAt: at,
      sequence: nextFlow.sequence
    });
    assert.equal(replay.replayed, true);
    assert.equal(replay.operation.id, record.id);

    await Promise.all([firstRunner.run(authorized.job), secondRunner.run(authorized.job)]);
    let job = await state.firstStore.findMerchantFlowJob(record.job_id, record.project_id, record.organization_id);
    assert.equal(claims, 1);
    assert.equal(job.status, 'retryable');
    assert.equal(job.attempt, 6);
    assert.equal(job.authorized_resume_operation_id, record.id);
    assert.equal(job.result.failure_category, 'd2_7_provider_timeout');
    assert.equal(job.result.failure_stage, 'provider_transport');
    assert.equal(job.result.failure_evidence_checksum, checksum('d'));
    assertNoSensitiveData(job);

    await secondRunner.run(authorized.job);
    await secondRunner.run(job);
    assert.equal(claims, 1, 'delayed duplicate scheduling and bare retryable rows must not claim attempt 7');
    job = await state.firstStore.findMerchantFlowJob(record.job_id, record.project_id, record.organization_id);
    assert.equal(job.attempt, 6);

    const operations = await state.firstDriver.all('SELECT * FROM merchant_flow_resume_operations WHERE flow_id = $1', [state.flow.flow_id]);
    assert.equal(operations.length, 1);
    const events = await state.firstStore.listMerchantFlowOperationalEvents(state.flow.flow_id, record.project_id, record.organization_id);
    assert.equal(events.filter((event) => event.event_type === 'resume_authorized').length, 1);
    assert.equal(events.filter((event) => event.event_type === 'retry').length, 1);
    assert.equal(events.filter((event) => event.event_type === 'failure').length, 1);
    assert.equal(events.find((event) => event.event_type === 'retry').details.logical_attempt, '6');
  } finally {
    await state.secondDriver.close();
    await state.firstDriver.close();
    fs.rmSync(state.directory, { recursive: true, force: true });
  }
});

test('retry operation conflicts and stale revisions fail before another claim', async () => {
  const state = await createStoreFixture();
  try {
    const nextFlow = { ...state.flow, sequence: 6, checksum: checksum('c'), state: 'render_qa_running' };
    const record = resumeRecord(state.flow);
    const runner = new MerchantFlowJobRunner({ store: state.firstStore, autoRun: false, clock: () => new Date(at) });
    await runner.authorizeResume({ record, expectedGenerationState: { merchant_flow: state.flow }, nextGenerationState: { merchant_flow: nextFlow }, resultFlow: nextFlow, expectedSessionUpdatedAt: at });
    const conflict = { ...record, id: 'merchant-flow-resume-operation-e5r-o-conflict', request_checksum: checksum('e') };
    await assert.rejects(
      runner.authorizeResume({ record: conflict, expectedGenerationState: { merchant_flow: state.flow }, nextGenerationState: { merchant_flow: nextFlow }, resultFlow: nextFlow, expectedSessionUpdatedAt: at }),
      (error) => error.code === 'merchant_flow_resume_operation_idempotency_conflict'
    );
    const stale = { ...record, id: 'merchant-flow-resume-operation-e5r-o-stale', idempotency_key: 'merchant-resume-e5r-o-stale', expected_job_attempt: 4, target_job_attempt: 5 };
    await assert.rejects(
      runner.authorizeResume({ record: stale, expectedGenerationState: { merchant_flow: state.flow }, nextGenerationState: { merchant_flow: nextFlow }, resultFlow: nextFlow, expectedSessionUpdatedAt: at }),
      (error) => ['merchant_flow_resume_operation_job_stale', 'merchant_flow_resume_operation_binding_invalid'].includes(error.code)
    );
    const job = await state.firstStore.findMerchantFlowJob(record.job_id, record.project_id, record.organization_id);
    assert.equal(job.status, 'queued');
    assert.equal(job.attempt, 5);
  } finally {
    await state.secondDriver.close();
    await state.firstDriver.close();
    fs.rmSync(state.directory, { recursive: true, force: true });
  }
});

test('expired lease recovery keeps the logical attempt and fences the old worker', async () => {
  const state = await createStoreFixture();
  try {
    const jobId = 'merchant-flow-job-e5r-o-recovery';
    await state.firstStore.createMerchantFlowJob({
      id: jobId, flow_id: 'merchant-flow-e5r-o-recovery', project_id: 'prj_e5r_o', organization_id: 'org_e5r_o',
      job_kind: 'render_qa', identity_checksum: checksum('8'), status: 'running', attempt: 4, lease_epoch: 2,
      payload: {}, result: null, lease_token: 'old-worker-lease', lease_expires_at: '2026-09-01T13:59:00.000Z',
      created_at: at, updated_at: at
    });
    let execution = null;
    const runner = new MerchantFlowJobRunner({ store: state.secondStore, autoRun: false, clock: () => new Date(at), leaseMilliseconds: 120000 });
    runner.register('render_qa', async (_job, control) => { execution = { ...control.execution }; return { status: 'passed' }; });
    const snapshot = await state.firstStore.findMerchantFlowJob(jobId, 'prj_e5r_o', 'org_e5r_o');
    const recovered = await runner.run(snapshot);
    assert.equal(recovered.status, 'completed');
    assert.equal(execution.attempt, 4);
    assert.equal(execution.lease_epoch, 3);
    assert.notEqual(execution.lease_token, 'old-worker-lease');
    const oldCompletion = await state.firstStore.completeMerchantFlowJob(jobId, 'prj_e5r_o', 'org_e5r_o', 'old-worker-lease', { status: 'stale' }, at, { attempt: 4, leaseEpoch: 2 });
    assert.equal(oldCompletion, null);
  } finally {
    await state.secondDriver.close();
    await state.firstDriver.close();
    fs.rmSync(state.directory, { recursive: true, force: true });
  }
});

test('runner failure projection retains only allowlisted operational evidence', () => {
  const error = Object.assign(new Error('SENSITIVE_CANARY_PROVIDER_MESSAGE'), {
    code: 'd2_7_provider_unavailable', retryable: true,
    details: {
      failure_stage: 'provider_http', failure_id: 'merchant-flow-d2-7-failure-test', provider_http_status: 503,
      provider_error_code: 'server_error', d2_7_request_id: fixture.request_binding.request_id,
      failure_evidence_id: 'merchant-flow-d2-7-failure-test', failure_evidence_checksum: checksum('f'),
      authorization: 'SENSITIVE_CANARY_AUTHORIZATION', raw_body: 'SENSITIVE_CANARY_RAW_BODY'
    }
  });
  const projected = safeFailure(error);
  assert.equal(projected.category, 'd2_7_provider_unavailable');
  assert.equal(projected.retryable, true);
  assert.equal(projected.evidence.provider_http_status, '503');
  assert.equal(projected.evidence.provider_error_code, 'server_error');
  assertNoSensitiveData(projected);
});

async function run() {
  const originalFetch = global.fetch;
  let forbiddenNetworkCalls = 0;
  global.fetch = async () => { forbiddenNetworkCalls += 1; throw new Error('Network is forbidden in E5R-O tests.'); };
  try {
    for (const item of tests) {
      await item.run();
      process.stdout.write(`✓ ${item.name}\n`);
    }
    assert.equal(forbiddenNetworkCalls, 0);
    assert.equal(fixture.safety.openai_calls, 0);
    assert.equal(fixture.safety.shopify_calls, 0);
    assert.equal(fixture.safety.render_calls, 0);
    process.stdout.write(`\n${tests.length}/${tests.length} E5R-O failure/retry/claim tests passed. API/model calls: 0. Shopify calls: 0. Render calls: 0. Theme mutations: 0.\n`);
  } finally {
    global.fetch = originalFetch;
  }
}

if (require.main === module) run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { run };
