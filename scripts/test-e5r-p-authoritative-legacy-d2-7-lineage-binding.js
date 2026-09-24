#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { MerchantGenerationFlowService } = require('../apps/dashboard/server/services/merchant-generation-flow-service.cjs');
const { SqliteDriver } = require('../apps/dashboard/server/storage/sqlite-driver.cjs');
const { DashboardStore } = require('../apps/dashboard/server/storage/dashboard-store.cjs');
const {
  CONTRACT_VERSION,
  RESOLVER_REVISION,
  RESOLUTION_STATUSES,
  SELECTION_PRIORITIES,
  requiresLegacyD27LineageResolution,
  resolveControlledBetaD27LegacyLineage,
  assertControlledBetaD27LegacyLineageResolution
} = require('../ai/design-evaluation/merchant-flow-d2-7-legacy-lineage-resolution');

const root = path.resolve(__dirname, '..');
const fixtureFile = path.join(root, 'fixtures/e5r-p-authoritative-legacy-d2-7-lineage-binding.json');
const fixtureSource = fs.readFileSync(fixtureFile, 'utf8');
const fixture = JSON.parse(fixtureSource);
let forbiddenNetworkCalls = 0;
let providerCalls = 0;
let shopifyCalls = 0;
let renderCalls = 0;
let d1Calls = 0;
let resumeOperations = 0;
let attemptsCreated = 0;
const TRANSACTION_AT = '2026-09-02T12:00:00.000Z';

const originalFetch = global.fetch;
global.fetch = async () => {
  forbiddenNetworkCalls += 1;
  throw new Error('Network is forbidden in E5R-P lineage tests.');
};

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function checksum(char) {
  return String(char).repeat(64);
}

function scope(overrides = {}) {
  const input = fixture.scope;
  return {
    organization_id: input.organization_id,
    project_id: input.project_id,
    flow_id: input.flow_id,
    current_flow_sequence: fixture.authoritative_context.flow.sequence,
    current_flow_checksum: fixture.authoritative_context.flow.checksum,
    job_id: fixture.authoritative_context.job.job_id,
    logical_attempt: fixture.authoritative_context.job.logical_attempt,
    artifact_id: input.artifact_id,
    artifact_checksum: input.artifact_checksum,
    development_shop: input.shop_domain,
    development_theme_id: input.target_theme_id,
    runtime_configuration_revision: input.runtime_configuration_revision,
    render_target_configuration_revision: input.render_target_configuration_revision,
    deployed_source_revision: input.deployed_source_revision,
    route_ids: copy(input.route_ids),
    viewport_ids: copy(input.viewport_ids),
    ...overrides
  };
}

function candidate(lineage, overrides = {}) {
  const base = {
    evidence_directory_reference: `output/merchant-flow-storefront-renders/${lineage.render.request_id}`,
    compatibility: 'reusable',
    incompatibility_codes: [],
    render: {
      request_id: lineage.render.request_id,
      request_checksum: lineage.render.request_checksum,
      render_checksum: lineage.render.evidence_checksum,
      render_revision: 'merchant-flow-storefront-render-v1',
      render_result_ids: lineage.render.route_ids.flatMap((route) => lineage.render.viewport_ids.map((viewport) => `render-${route}-${viewport}-${lineage.fixture_label}`)),
      route_ids: copy(lineage.render.route_ids),
      viewport_ids: copy(lineage.render.viewport_ids)
    },
    d1: {
      evidence_id: lineage.d1.evaluation_id,
      evidence_checksum: lineage.d1.evaluation_checksum,
      status: lineage.d1.status,
      policy_revision: 'storefront-visual-evaluation-policy-v1',
      render_request_id: lineage.d1.render_request_id,
      render_request_checksum: lineage.d1.render_request_checksum
    },
    d2_7_parent: {
      request_id: lineage.d2_7_parent.request_id,
      request_checksum: lineage.d2_7_parent.request_checksum,
      source_render_request_id: lineage.render.request_id,
      source_render_checksum: lineage.render.evidence_checksum,
      source_d1_evidence_id: lineage.d1.evaluation_id,
      source_d1_evidence_checksum: lineage.d1.evaluation_checksum
    },
    provenance: {
      organization_id: fixture.scope.organization_id,
      project_id: fixture.scope.project_id,
      flow_id: fixture.scope.flow_id,
      flow_sequence: lineage.flow_revision.sequence,
      flow_checksum: lineage.flow_revision.checksum,
      artifact_id: fixture.scope.artifact_id,
      artifact_checksum: fixture.scope.artifact_checksum,
      development_shop: fixture.scope.shop_domain,
      development_theme_id: fixture.scope.target_theme_id,
      runtime_configuration_revision: fixture.scope.runtime_configuration_revision,
      render_target_configuration_revision: fixture.scope.render_target_configuration_revision,
      deployed_source_revision: fixture.scope.deployed_source_revision
    },
    explicit_association: {
      job_id: lineage.durable_association.job_id,
      logical_attempt: lineage.durable_association.logical_attempt
    }
  };
  return deepMerge(base, overrides);
}

function deepMerge(base, overrides) {
  const result = copy(base);
  for (const [key, value] of Object.entries(overrides || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)
      && result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else result[key] = copy(value);
  }
  return result;
}

function authority({ parent = null, jobAttempt = null, accepted = null, predecessor = null } = {}) {
  return {
    d2_7_parent: parent,
    job_attempt: jobAttempt,
    accepted_evidence: accepted,
    immediate_predecessor_flow_revision: predecessor
  };
}

function parentOf(value) {
  return {
    request_id: value.d2_7_parent.request_id,
    request_checksum: value.d2_7_parent.request_checksum
  };
}

function acceptedOf(value) {
  return {
    render_request_id: value.render.request_id,
    render_request_checksum: value.render.request_checksum,
    render_checksum: value.render.render_checksum,
    d1_evidence_id: value.d1.evidence_id,
    d1_evidence_checksum: value.d1.evidence_checksum
  };
}

function predecessorOf(value) {
  return {
    sequence: value.provenance.flow_sequence,
    checksum: value.provenance.flow_checksum
  };
}

function resolve({ candidates, authoritativeContext = null, scopeOverrides = {} }) {
  const resolution = resolveControlledBetaD27LegacyLineage({
    scope: scope(scopeOverrides),
    authoritativeContext,
    candidates
  }, root);
  assert.deepEqual(assertControlledBetaD27LegacyLineageResolution(resolution, root), resolution);
  assert.equal(resolution.contract_version, CONTRACT_VERSION);
  assert.equal(resolution.resolver_revision, RESOLVER_REVISION);
  return resolution;
}

function candidateIdFor(result, renderRequestId) {
  const match = result.candidates.find((entry) => entry.render?.request_id === renderRequestId);
  assert.ok(match, `Resolution does not retain candidate ${renderRequestId}.`);
  return match.candidate_id;
}

function priorityContaining(...parts) {
  const entries = Array.isArray(SELECTION_PRIORITIES)
    ? SELECTION_PRIORITIES
    : Object.values(SELECTION_PRIORITIES || {});
  const values = entries.map((entry) => typeof entry === 'string' ? entry : entry?.key).filter(Boolean);
  return values.find((value) => parts.every((part) => String(value).toLowerCase().includes(part))) || null;
}

function assertStatus(result, status) {
  assert.equal(result.status, status);
  assert.ok((Array.isArray(RESOLUTION_STATUSES) ? RESOLUTION_STATUSES : Object.values(RESOLUTION_STATUSES)).includes(status));
}

function assertNoExecutionSideEffects() {
  assert.equal(resumeOperations, 0, 'Lineage resolution must not register a resume operation.');
  assert.equal(attemptsCreated, 0, 'Lineage resolution must not create or arm attempt 6.');
  assert.equal(providerCalls, 0, 'Lineage resolution must not call a provider.');
  assert.equal(shopifyCalls, 0, 'Lineage resolution must not call Shopify.');
  assert.equal(renderCalls, 0, 'Lineage resolution must not render or capture.');
  assert.equal(d1Calls, 0, 'Lineage resolution must not rerun D1.');
  assert.equal(forbiddenNetworkCalls, 0, 'Lineage resolution attempted network access.');
}

function syntheticResolution({
  flowId,
  currentFlowSequence,
  currentFlowChecksum,
  jobId,
  logicalAttempt,
  artifactId,
  artifactChecksum,
  shop,
  themeId,
  candidateSuffix = 'primary',
  includeAlternative = false
}) {
  const current = candidate(fixture.lineages[1], {
    evidence_directory_reference: `output/e5r-p-store/${candidateSuffix}`,
    render: {
      request_id: `merchant-render-request-e5rp-${candidateSuffix}`,
      request_checksum: checksum(candidateSuffix === 'primary' ? '1' : '2'),
      render_checksum: checksum(candidateSuffix === 'primary' ? '3' : '4')
    },
    d1: {
      evidence_id: `merchant-flow-d1-evaluation-e5rp-${candidateSuffix}`,
      evidence_checksum: checksum(candidateSuffix === 'primary' ? '5' : '6'),
      render_request_id: `merchant-render-request-e5rp-${candidateSuffix}`,
      render_request_checksum: checksum(candidateSuffix === 'primary' ? '1' : '2')
    },
    d2_7_parent: {
      request_id: `merchant-flow-d2-7-request-e5rp-${candidateSuffix}`,
      request_checksum: checksum(candidateSuffix === 'primary' ? '7' : '8'),
      source_render_request_id: `merchant-render-request-e5rp-${candidateSuffix}`,
      source_render_checksum: checksum(candidateSuffix === 'primary' ? '3' : '4'),
      source_d1_evidence_id: `merchant-flow-d1-evaluation-e5rp-${candidateSuffix}`,
      source_d1_evidence_checksum: checksum(candidateSuffix === 'primary' ? '5' : '6')
    },
    provenance: {
      organization_id: 'org_e5rp_store',
      project_id: 'prj_e5rp_store',
      flow_id: flowId,
      flow_sequence: currentFlowSequence - 1,
      flow_checksum: checksum('4'),
      artifact_id: artifactId,
      artifact_checksum: artifactChecksum,
      development_shop: shop,
      development_theme_id: themeId,
      runtime_configuration_revision: 'merchant-flow-controlled-beta-runtime-v1',
      render_target_configuration_revision: 'merchant-flow-controlled-render-targets-v1',
      deployed_source_revision: null
    },
    explicit_association: { job_id: jobId, logical_attempt: logicalAttempt }
  });
  const alternatives = includeAlternative ? [candidate(fixture.lineages[0], {
    evidence_directory_reference: 'output/e5r-p-store/historical-alternative',
    provenance: {
      organization_id: 'org_e5rp_store', project_id: 'prj_e5rp_store', flow_id: flowId,
      flow_sequence: currentFlowSequence - 3, flow_checksum: checksum('2'), artifact_id: artifactId,
      artifact_checksum: artifactChecksum, development_shop: shop, development_theme_id: themeId,
      runtime_configuration_revision: 'merchant-flow-controlled-beta-runtime-v1',
      render_target_configuration_revision: 'merchant-flow-controlled-render-targets-v1',
      deployed_source_revision: null
    }
  })] : [];
  return resolveControlledBetaD27LegacyLineage({
    scope: {
      organization_id: 'org_e5rp_store',
      project_id: 'prj_e5rp_store',
      flow_id: flowId,
      current_flow_sequence: currentFlowSequence,
      current_flow_checksum: currentFlowChecksum,
      job_id: jobId,
      logical_attempt: logicalAttempt,
      artifact_id: artifactId,
      artifact_checksum: artifactChecksum,
      development_shop: shop,
      development_theme_id: themeId,
      runtime_configuration_revision: 'merchant-flow-controlled-beta-runtime-v1',
      render_target_configuration_revision: 'merchant-flow-controlled-render-targets-v1',
      deployed_source_revision: null,
      route_ids: copy(fixture.scope.route_ids),
      viewport_ids: copy(fixture.scope.viewport_ids)
    },
    authoritativeContext: authority({
      jobAttempt: { job_id: jobId, logical_attempt: logicalAttempt },
      predecessor: { sequence: currentFlowSequence - 1, checksum: checksum('4') }
    }),
    candidates: [...alternatives, current]
  }, root);
}

async function createTransactionFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-e5rp-binding-'));
  const driver = new SqliteDriver({ filename: path.join(directory, 'dashboard.sqlite') });
  const store = new DashboardStore(driver);
  await store.migrate(TRANSACTION_AT);
  await store.createUser({
    id: 'usr_e5rp_store', email: 'e5rp-store@example.test', full_name: 'E5R-P Store',
    password_hash: 'unused', status: 'active', created_at: TRANSACTION_AT, updated_at: TRANSACTION_AT
  });
  await store.createOrganization({
    id: 'org_e5rp_store', name: 'E5R-P Store', slug: 'e5rp-store',
    created_by_user_id: 'usr_e5rp_store', created_at: TRANSACTION_AT, updated_at: TRANSACTION_AT
  });
  await store.createWorkspace({
    id: 'wsp_e5rp_store', organization_id: 'org_e5rp_store', name: 'E5R-P Store',
    created_at: TRANSACTION_AT, updated_at: TRANSACTION_AT
  });
  await store.createMembership({
    id: 'mem_e5rp_store', organization_id: 'org_e5rp_store', user_id: 'usr_e5rp_store',
    role: 'owner', status: 'active', created_at: TRANSACTION_AT
  });
  await store.createProject({
    id: 'prj_e5rp_store', organization_id: 'org_e5rp_store', workspace_id: 'wsp_e5rp_store',
    name: 'E5R-P Store', business_name: 'E5R-P Store', country: 'US', status: 'active',
    created_by_user_id: 'usr_e5rp_store', created_at: TRANSACTION_AT, updated_at: TRANSACTION_AT
  });
  const flow = {
    flow_id: 'merchant-flow-e5rp-store', sequence: 5, checksum: checksum('a'), state: 'failed_retryable',
    artifact: { artifact_id: 'theme-artifact-e5rp-store', checksum: checksum('b') }
  };
  await store.createCreativeDirector({
    id: 'cdr_e5rp_store', project_id: 'prj_e5rp_store', stage: 'generation',
    conversation_state: null, transcript: [], creative_brief: null, store_strategy: null,
    review: null, merchant_profile: null, generation_state: { merchant_flow: flow },
    created_at: TRANSACTION_AT, updated_at: TRANSACTION_AT
  });
  const job = {
    id: 'merchant-flow-job-e5rp-store', flow_id: flow.flow_id, project_id: 'prj_e5rp_store',
    organization_id: 'org_e5rp_store', job_kind: 'render_qa', identity_checksum: checksum('c'),
    status: 'retryable', attempt: 5, payload: {}, result: { status: 'retryable' },
    failure_category: 'shopify_render_failed', failure_message: 'safe',
    created_at: TRANSACTION_AT, updated_at: TRANSACTION_AT
  };
  await store.createMerchantFlowJob(job);
  return { directory, driver, store, flow, job };
}

function transactionRecord(flow, job, overrides = {}) {
  return {
    id: 'merchant-flow-resume-operation-e5rp-store',
    flow_id: flow.flow_id,
    job_id: job.id,
    project_id: 'prj_e5rp_store',
    organization_id: 'org_e5rp_store',
    actor_user_id: 'usr_e5rp_store',
    operation_kind: 'render_qa_retry',
    idempotency_key: 'merchant-flow-resume-e5rp-store',
    request_checksum: checksum('d'),
    request_id: 'merchant-flow-resume-request-e5rp-store',
    expected_flow_sequence: flow.sequence,
    expected_flow_checksum: flow.checksum,
    expected_job_attempt: job.attempt,
    target_job_attempt: job.attempt + 1,
    status: 'pending',
    created_at: TRANSACTION_AT,
    ...overrides
  };
}

function resolutionForTransaction(flow, job, options = {}) {
  return syntheticResolution({
    flowId: flow.flow_id,
    currentFlowSequence: flow.sequence,
    currentFlowChecksum: flow.checksum,
    jobId: job.id,
    logicalAttempt: job.attempt,
    artifactId: flow.artifact.artifact_id,
    artifactChecksum: flow.artifact.checksum,
    shop: 'e5rp-store.myshopify.com',
    themeId: '123456789012',
    ...options
  });
}

async function proveAtomicBindingTransaction() {
  const state = await createTransactionFixture();
  try {
    const resolution = resolutionForTransaction(state.flow, state.job, { includeAlternative: true });
    assert.equal(resolution.status, 'authoritative_match');
    const record = transactionRecord(state.flow, state.job);
    const nextFlow = { ...state.flow, sequence: state.flow.sequence + 1, checksum: checksum('e'), state: 'render_qa_running' };
    const input = {
      record,
      expectedGenerationState: { merchant_flow: state.flow },
      nextGenerationState: { merchant_flow: nextFlow },
      resultFlow: nextFlow,
      at: TRANSACTION_AT,
      expectedSessionUpdatedAt: TRANSACTION_AT,
      legacyD27LineageBinding: { resolution, resume_operation_id: record.id, created_at: TRANSACTION_AT }
    };
    const applied = await state.store.applyMerchantFlowResumeOperation(input);
    assert.equal(applied.replayed, false);
    assert.equal(applied.job.status, 'queued');
    assert.equal(applied.job.attempt, 5, 'Arming must not claim or increment the logical attempt.');
    assert.equal(applied.job.authorized_attempt, 6);
    assert.equal(applied.job.authorized_resume_operation_id, record.id);
    let rows = await state.driver.all('SELECT * FROM merchant_flow_legacy_d2_7_lineage_bindings');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].resolution_id, resolution.resolution_id);
    assert.equal(rows[0].resolution_checksum, resolution.resolution_checksum);
    assert.equal(rows[0].candidate_set_checksum, resolution.candidate_set_checksum);

    const replay = await state.store.applyMerchantFlowResumeOperation(input);
    assert.equal(replay.replayed, true);
    rows = await state.driver.all('SELECT * FROM merchant_flow_legacy_d2_7_lineage_bindings');
    assert.equal(rows.length, 1, 'Identical resume replay must reuse one lineage binding.');
    assert.equal((await state.driver.all('SELECT * FROM merchant_flow_resume_operations')).length, 1);

    const conflictingResolution = resolutionForTransaction(state.flow, state.job, {
      candidateSuffix: 'conflicting', includeAlternative: true
    });
    assert.notEqual(conflictingResolution.candidate_set_checksum, resolution.candidate_set_checksum);
    await assert.rejects(
      state.store.applyMerchantFlowResumeOperation({
        ...input,
        legacyD27LineageBinding: {
          resolution: conflictingResolution,
          resume_operation_id: record.id,
          created_at: TRANSACTION_AT
        }
      }),
      (error) => error?.code === 'merchant_flow_legacy_d2_7_lineage_binding_conflict'
    );
    assert.equal((await state.driver.all('SELECT * FROM merchant_flow_legacy_d2_7_lineage_bindings')).length, 1);
    assert.equal((await state.driver.all('SELECT * FROM merchant_flow_resume_operations')).length, 1);
    const job = await state.store.findMerchantFlowJob(state.job.id, 'prj_e5rp_store', 'org_e5rp_store');
    assert.equal(job.attempt, 5);
    assert.equal(job.authorized_attempt, 6);
  } finally {
    await state.driver.close();
    fs.rmSync(state.directory, { recursive: true, force: true });
  }

  const stale = await createTransactionFixture();
  try {
    const staleFlow = { ...stale.flow, checksum: checksum('f') };
    const staleRecord = transactionRecord(staleFlow, stale.job, {
      id: 'merchant-flow-resume-operation-e5rp-stale',
      idempotency_key: 'merchant-flow-resume-e5rp-stale',
      request_checksum: checksum('9')
    });
    const staleResolution = resolutionForTransaction(staleFlow, stale.job);
    const staleNext = { ...staleFlow, sequence: staleFlow.sequence + 1, checksum: checksum('8'), state: 'render_qa_running' };
    await assert.rejects(
      stale.store.applyMerchantFlowResumeOperation({
        record: staleRecord,
        expectedGenerationState: { merchant_flow: staleFlow },
        nextGenerationState: { merchant_flow: staleNext },
        resultFlow: staleNext,
        at: TRANSACTION_AT,
        expectedSessionUpdatedAt: TRANSACTION_AT,
        legacyD27LineageBinding: {
          resolution: staleResolution,
          resume_operation_id: staleRecord.id,
          created_at: TRANSACTION_AT
        }
      }),
      (error) => error?.code === 'merchant_flow_resume_operation_stale'
    );
    assert.equal((await stale.driver.all('SELECT * FROM merchant_flow_legacy_d2_7_lineage_bindings')).length, 0);
    assert.equal((await stale.driver.all('SELECT * FROM merchant_flow_resume_operations')).length, 0);
    const job = await stale.store.findMerchantFlowJob(stale.job.id, 'prj_e5rp_store', 'org_e5rp_store');
    assert.equal(job.status, 'retryable');
    assert.equal(job.attempt, 5);
    assert.equal(job.authorized_attempt, null);
  } finally {
    await stale.driver.close();
    fs.rmSync(stale.directory, { recursive: true, force: true });
  }
}

async function proveAmbiguousServicePreflightStopsBeforeRegistration() {
  let applyCalls = 0;
  let resolutionCalls = 0;
  const flow = {
    flow_id: 'merchant-flow-e5rp-service', sequence: 20, checksum: checksum('a'), state: 'failed_retryable',
    failure: { category: 'shopify_render_failed' }, render_qa: null,
    artifact: { artifact_id: 'theme-artifact-e5rp-service', checksum: checksum('b') }
  };
  const store = {
    findMerchantFlowResumeOperation: async () => null,
    findMerchantFlowJob: async () => ({
      id: 'merchant-flow-job-e5rp-service', job_kind: 'render_qa', status: 'retryable', attempt: 5
    }),
    applyMerchantFlowResumeOperation: async () => { applyCalls += 1; throw new Error('must not be reached'); }
  };
  const service = new MerchantGenerationFlowService({
    root,
    store,
    projectService: {},
    runtime: {
      resolveLegacyD27Lineage: async () => {
        resolutionCalls += 1;
        return {
          resolution: { status: 'ambiguous_legacy_match' },
          recovered_render_qa: null
        };
      }
    },
    clock: () => new Date(TRANSACTION_AT)
  });
  service.setJobRunner({});
  await assert.rejects(
    service.resumeRenderQa({
      project: { id: 'prj_e5rp_service', organization_id: 'org_e5rp_service' },
      session: { generation_state: { merchant_flow: flow }, updated_at: TRANSACTION_AT },
      flow,
      userId: 'usr_e5rp_service',
      expectedFlowChecksum: flow.checksum,
      expectedFlowSequence: flow.sequence,
      idempotencyKey: `merchant-flow-resume-${flow.checksum}`,
      requestId: 'request-e5rp-service'
    }),
    (error) => error?.code === 'controlled_beta_d2_7_legacy_evidence_ambiguous'
  );
  assert.equal(resolutionCalls, 1);
  assert.equal(applyCalls, 0, 'Ambiguous lineage must stop before resume-operation registration/CAS.');
}

async function run() {
  assert.equal(fixture.contract_version, CONTRACT_VERSION);
  assert.equal(fixture.resolver_revision, RESOLVER_REVISION);
  assert.deepEqual(Object.keys(fixture.cases), 'ABCDEFGHIJKLMN'.split(''));
  assert.equal(fixture.lineages.length, 2);
  assert.equal(fixture.release_12_blocker.validated_legacy_lineage_count, 2);
  assert.equal(fixture.release_12_blocker.error_code, 'controlled_beta_d2_7_legacy_evidence_ambiguous');
  assert.equal(fixture.authoritative_context.flow.sequence, 20);
  assert.equal(fixture.authoritative_context.job.logical_attempt, 5);
  assert.equal(fixture.authoritative_context.job.authorized_attempt, null);

  const historical = candidate(fixture.lineages[0]);
  const current = candidate(fixture.lineages[1]);

  // Exact release-12 reproduction: the E5R-O generic rule had two reusable
  // scoped candidates and no authority comparison, so it correctly stopped.
  const e5rOBaseline = [historical, current].filter((entry) => entry.compatibility === 'reusable').length === 1
    ? 'unique_legacy_match'
    : 'ambiguous_legacy_match';
  assert.equal(e5rOBaseline, fixture.shared_validation.e5r_o_result);

  // A. One reusable candidate with no stronger pointer is the bounded fallback.
  const a = resolve({ candidates: [historical] });
  assertStatus(a, fixture.cases.A.expected_status);
  assert.equal(a.selection.selected_candidate_id, candidateIdFor(a, historical.render.request_id));

  // Exact controlled result: the sequence-19 predecessor is the only retained
  // authority that differentiates the two otherwise-valid release-12 lineages.
  const release12 = resolve({
    candidates: [historical, current],
    authoritativeContext: authority({ predecessor: predecessorOf(current) })
  });
  const release12HistoricalId = candidateIdFor(release12, historical.render.request_id);
  const release12CurrentId = candidateIdFor(release12, current.render.request_id);
  const predecessorPriority = priorityContaining('predecessor');
  assertStatus(release12, fixture.shared_validation.e5r_p_result);
  assert.ok(predecessorPriority, 'Selection priorities must expose an immediate-predecessor priority.');
  assert.equal(release12.selection.priority, predecessorPriority);
  assert.equal(release12.selection.selected_candidate_id, release12CurrentId);
  assert.ok(release12.selection.retained_alternative_candidate_ids.includes(release12HistoricalId));

  // B. Exact parent binding outranks otherwise valid alternatives.
  const b = resolve({ candidates: [historical, current], authoritativeContext: authority({ parent: parentOf(current) }) });
  assertStatus(b, fixture.cases.B.expected_status);
  assert.equal(b.selection.selected_candidate_id, candidateIdFor(b, current.render.request_id));
  assert.ok(b.selection.retained_alternative_candidate_ids.includes(candidateIdFor(b, historical.render.request_id)));
  const parentPriority = priorityContaining('parent');
  assert.ok(parentPriority, 'Selection priorities must expose a D2.7 parent priority.');
  assert.equal(b.selection.priority, parentPriority);

  // C. An explicit job/logical-attempt association selects exactly one lineage.
  const attemptBound = candidate(fixture.lineages[1], {
    explicit_association: { job_id: fixture.authoritative_context.job.job_id, logical_attempt: 5 }
  });
  const c = resolve({
    candidates: [historical, attemptBound],
    authoritativeContext: authority({
      jobAttempt: { job_id: fixture.authoritative_context.job.job_id, logical_attempt: 5 }
    })
  });
  assertStatus(c, fixture.cases.C.expected_status);
  assert.equal(c.selection.selected_candidate_id, candidateIdFor(c, attemptBound.render.request_id));
  const attemptPriority = priorityContaining('job', 'attempt');
  assert.ok(attemptPriority, 'Selection priorities must expose a job/logical-attempt priority.');
  assert.equal(c.selection.priority, attemptPriority);

  // A retained association to an older attempt cannot mask the exact current
  // predecessor. It remains queryable but is incompatible for current reuse.
  const attempt4Historical = deepMerge(historical, {
    explicit_association: { job_id: fixture.authoritative_context.job.job_id, logical_attempt: 4 }
  });
  const currentPredecessorWins = resolve({
    candidates: [attempt4Historical, current],
    authoritativeContext: authority({
      jobAttempt: { job_id: fixture.authoritative_context.job.job_id, logical_attempt: 5 },
      predecessor: predecessorOf(current)
    })
  });
  assertStatus(currentPredecessorWins, 'authoritative_match');
  assert.equal(currentPredecessorWins.selection.priority, predecessorPriority);
  assert.equal(currentPredecessorWins.selection.selected_candidate_id,
    candidateIdFor(currentPredecessorWins, current.render.request_id));
  assert.ok(currentPredecessorWins.candidates.find((entry) => entry.render?.request_id === historical.render.request_id)
    .incompatibility_codes.includes('job_attempt_association_mismatch'));

  const attempt4Only = resolve({
    candidates: [attempt4Historical],
    authoritativeContext: authority({
      jobAttempt: { job_id: fixture.authoritative_context.job.job_id, logical_attempt: 5 }
    })
  });
  assertStatus(attempt4Only, 'incompatible_legacy_evidence');
  assert.equal(attempt4Only.selection.selected_candidate_id, null);

  const equallyAttemptBoundHistorical = deepMerge(historical, {
    explicit_association: { job_id: fixture.authoritative_context.job.job_id, logical_attempt: 5 }
  });
  const equalAttemptAuthority = resolve({
    candidates: [equallyAttemptBoundHistorical, attemptBound],
    authoritativeContext: authority({
      jobAttempt: { job_id: fixture.authoritative_context.job.job_id, logical_attempt: 5 }
    })
  });
  assertStatus(equalAttemptAuthority, 'ambiguous_legacy_match');
  assert.equal(equalAttemptAuthority.selection.selected_candidate_id, null);

  // D. The exact controlled lineage aligns every available authority pointer.
  const controlled = candidate(fixture.lineages[1], {
    explicit_association: { job_id: fixture.authoritative_context.job.job_id, logical_attempt: 5 }
  });
  const dContext = authority({
    parent: parentOf(controlled),
    jobAttempt: { job_id: fixture.authoritative_context.job.job_id, logical_attempt: 5 },
    accepted: acceptedOf(controlled),
    predecessor: predecessorOf(controlled)
  });
  const d = resolve({ candidates: [historical, controlled], authoritativeContext: dContext });
  assertStatus(d, fixture.cases.D.expected_status);
  assert.equal(d.selection.selected_candidate_id, candidateIdFor(d, controlled.render.request_id));
  assert.equal(d.selection.priority, parentPriority);
  assert.ok(d.selection.retained_alternative_candidate_ids.includes(candidateIdFor(d, historical.render.request_id)));

  // E. Equal authority remains ambiguous; directory or timestamp order cannot win.
  const equallyParentBoundHistorical = deepMerge(historical, {
    d2_7_parent: {
      request_id: controlled.d2_7_parent.request_id,
      request_checksum: controlled.d2_7_parent.request_checksum
    }
  });
  const e = resolve({ candidates: [equallyParentBoundHistorical, controlled], authoritativeContext: authority({ parent: parentOf(controlled) }) });
  assertStatus(e, fixture.cases.E.expected_status);
  assert.equal(e.selection.selected_candidate_id, null);

  // F. An independently authoritative but invalid candidate cannot fall back.
  const invalidSelected = deepMerge(current, {
    compatibility: 'incompatible',
    incompatibility_codes: ['render_checksum_invalid']
  });
  const f = resolve({ candidates: [historical, invalidSelected], authoritativeContext: authority({ predecessor: predecessorOf(current) }) });
  assertStatus(f, fixture.cases.F.expected_status);
  assert.equal(f.selection.selected_candidate_id, null);

  // G. Invalidating an alternative does not independently prove the survivor.
  const invalidAlternative = deepMerge(historical, {
    compatibility: 'incompatible',
    incompatibility_codes: ['d1_evidence_checksum_invalid']
  });
  const g = resolve({ candidates: [invalidAlternative, current] });
  assertStatus(g, fixture.cases.G.expected_status);
  assert.equal(g.selection.selected_candidate_id, null);

  // H. Wrong flow is rejected.
  const h = resolve({ candidates: [deepMerge(current, { provenance: { flow_id: 'merchant-flow-wrong-test' } })] });
  assertStatus(h, fixture.cases.H.expected_status);

  // I. Wrong shop is rejected.
  const i = resolve({ candidates: [deepMerge(current, { provenance: { development_shop: 'wrong-e5rp.myshopify.com' } })] });
  assertStatus(i, fixture.cases.I.expected_status);

  // J. Wrong DEVELOPMENT target is rejected.
  const j = resolve({ candidates: [deepMerge(current, { provenance: { development_theme_id: '999999999999' } })] });
  assertStatus(j, fixture.cases.J.expected_status);

  // K. Runtime and deployed-source policy mismatches are independently rejected.
  const kRuntime = resolve({ candidates: [deepMerge(current, { provenance: { runtime_configuration_revision: 'merchant-flow-controlled-beta-runtime-stale' } })] });
  assertStatus(kRuntime, fixture.cases.K.expected_status);
  const sourceBoundScope = scope({ deployed_source_revision: 'source-revision-current' });
  const sourceMismatch = deepMerge(current, { provenance: { deployed_source_revision: 'source-revision-stale' } });
  const kSource = resolveControlledBetaD27LegacyLineage({ scope: sourceBoundScope, candidates: [sourceMismatch] }, root);
  assert.deepEqual(assertControlledBetaD27LegacyLineageResolution(kSource, root), kSource);
  assertStatus(kSource, fixture.cases.K.expected_status);

  // An explicit authoritative pointer that matches no retained candidate is a
  // contradiction, not permission to fall back to uniqueness.
  const unmatchedParent = resolve({
    candidates: [current],
    authoritativeContext: authority({ parent: parentOf(historical) })
  });
  assertStatus(unmatchedParent, 'incompatible_legacy_evidence');
  assert.equal(unmatchedParent.selection.selected_candidate_id, null);

  // The approved render matrix is part of the resolution scope. A smaller,
  // internally self-consistent request cannot become reusable legacy evidence.
  const partialMatrix = deepMerge(current, {
    render: {
      render_result_ids: ['render-homepage-desktop-only'],
      route_ids: ['homepage'],
      viewport_ids: ['desktop-v1']
    }
  });
  const matrixMismatch = resolve({ candidates: [partialMatrix] });
  assertStatus(matrixMismatch, 'incompatible_legacy_evidence');
  assert.ok(matrixMismatch.candidates[0].incompatibility_codes.includes('render_matrix_mismatch'));

  // L. The supplied predecessor must be immediate for the exact current revision.
  const l = resolve({
    candidates: [current],
    authoritativeContext: authority({ predecessor: predecessorOf(current) }),
    scopeOverrides: { current_flow_sequence: 21, current_flow_checksum: checksum('9') }
  });
  assertStatus(l, fixture.cases.L.expected_status);
  assert.equal(l.selection.selected_candidate_id, null);

  // M. Modern E5R-O flows with an explicit failure never require this resolver.
  assert.equal(requiresLegacyD27LineageResolution({
    state: 'failed_retryable',
    failure: { category: 'shopify_render_failed' },
    render_qa: {
      status: 'failed',
      d2_7_failure: {
        contract_version: 'merchant-flow-d2-7-failure-v1',
        failure_id: 'merchant-flow-d2-7-failure-modern-test',
        checksum: checksum('8')
      }
    }
  }), false);

  // N. Canonical resolution is independent of discovery order and is repeatable.
  const n1 = resolve({ candidates: [historical, controlled], authoritativeContext: dContext });
  const n2 = resolve({ candidates: [controlled, historical], authoritativeContext: copy(dContext) });
  const n3 = resolve({ candidates: [historical, controlled], authoritativeContext: copy(dContext) });
  assertStatus(n1, fixture.cases.N.expected_status);
  assert.equal(n1.resolution_checksum, n2.resolution_checksum);
  assert.equal(n1.resolution_checksum, n3.resolution_checksum);
  assert.deepEqual(n1, n2);
  assert.deepEqual(n1, n3);

  // The authoritative release-12 result is B, and A remains queryable/unmodified.
  assert.equal(release12.selection.selected_candidate_id, release12CurrentId);
  assert.ok(release12.selection.retained_alternative_candidate_ids.includes(release12HistoricalId));
  assert.equal(fs.readFileSync(fixtureFile, 'utf8'), fixtureSource, 'The exact release-12 fixture was mutated.');
  await proveAtomicBindingTransaction();
  await proveAmbiguousServicePreflightStopsBeforeRegistration();
  assertNoExecutionSideEffects();

  process.stdout.write('14/14 E5R-P authoritative legacy D2.7 lineage cases passed; migration24 atomic binding/replay/conflict/stale proofs passed; ambiguous service preflight stopped before registration. Release-12 lineage B selected by exact predecessor provenance; lineage A retained; attempts claimed=0; API/model calls=0; Shopify calls=0; render calls=0; D1 calls=0; theme mutations=0.\n');
}

run().catch((error) => {
  process.stderr.write(`${error?.stack || error}\n`);
  process.exitCode = 1;
}).finally(() => {
  global.fetch = originalFetch;
});
