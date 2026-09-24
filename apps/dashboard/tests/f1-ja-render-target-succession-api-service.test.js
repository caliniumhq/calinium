import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { selectArchitecture } = require('../../../ai/architecture');
const {
  applyRenderTargetSuccession,
  bindArtifact,
  bindComposition,
  bindDesignDna,
  bindMerchantIntent,
  bindPaidIdentity,
  bindStoreIntelligence,
  completeRenderQa,
  createRenderTargetSuccessionRecord,
  createMerchantGenerationFlow,
  failFlow,
  freezeArchitecture,
  jobIdentity,
  startArchitectureSelection,
  startGeneration,
  startRenderQa
} = require('../../../ai/merchant-flow');
const {
  createMerchantFlowD27Failure,
  createMerchantFlowD27TerminalRecovery,
  resolveControlledBetaD27LegacyLineage
} = require('../../../ai/design-evaluation');
const { createMerchantFlowPreviewBinding } = require('../../../ai/merchant-flow/merchant-flow-preview-binding');
const { contractsForCase } = require('../../../scripts/test-automatic-architecture-selection');
const { createDashboardApiHandler } = require('../server/dashboard-api.cjs');
const { DashboardError } = require('../server/lib/errors.cjs');
const { MerchantGenerationFlowService } = require('../server/services/merchant-generation-flow-service.cjs');
const {
  APPROVED_D2_7_MODEL_ID,
  APPROVED_D2_7_PROVIDER_REVISION,
  CONTROLLED_BETA_RUNTIME_REVISION,
  CONTROLLED_RENDER_TARGETS_REVISION,
  readControlledBetaRuntimeConfiguration
} = require('../server/services/merchant-flow-controlled-runtime-configuration.cjs');
const { createControlledRenderArtifactBinding } = require('../server/services/merchant-flow-controlled-runtime.cjs');
const { createMerchantFlowRenderTargetSuccessionResolver } = require('../server/services/merchant-flow-render-target-succession-resolver.cjs');

const root = path.resolve(process.cwd(), '../..');
const selectionFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/automatic-architecture-selection.json'), 'utf8'));
const flowFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/merchant-generation-flow.json'), 'utf8'));
const now = new Date('2026-09-09T18:00:00.000Z');
const apiEnv = { NODE_ENV: 'test', SHOPIFY_API_KEY: 'f1ja-client', SHOPIFY_API_SECRET: 'f1ja-secret' };
const ids = Object.freeze({
  founder: 'usr_f1ja_founder',
  merchant: 'usr_f1ja_merchant',
  organization: 'org_f1ja',
  project: 'prj_f1ja',
  connection: 'shc_f1ja',
  shop: 'controlled-f1ja.myshopify.com',
  mainTheme: '42000',
  priorTheme: '42001',
  successorTheme: '42002'
});

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function signedSession(userId = ids.founder) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    aud: apiEnv.SHOPIFY_API_KEY,
    dest: `https://${ids.shop}`,
    exp: Math.floor(Date.now() / 1000) + 60,
    iss: `https://${ids.shop}/admin`,
    sub: userId
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', apiEnv.SHOPIFY_API_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function invoke(api, { method = 'POST', token = null, body = {} } = {}) {
  const request = Readable.from(method === 'GET' ? [] : [Buffer.from(JSON.stringify(body))]);
  Object.assign(request, {
    method,
    url: `/api/projects/${ids.project}/merchant-generation-flow/operator/succeed-render-target`,
    headers: {
      host: 'dashboard.test',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(method === 'GET' ? {} : { 'content-type': 'application/json' })
    },
    socket: { remoteAddress: '127.0.0.1' }
  });
  const response = {
    status: null,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    writeHead(status, headers) { this.status = status; this.headers = { ...this.headers, ...(headers || {}) }; },
    end(value = '') { this.body += value; }
  };
  await api(request, response);
  return { status: response.status, payload: JSON.parse(response.body) };
}

function preparedSubmission() {
  return {
    contract_version: 'merchant-flow-render-target-succession-submission-v1',
    flow_id: `merchant-flow-${'a'.repeat(20)}`,
    expected_flow_sequence: 27,
    expected_flow_checksum: 'b'.repeat(64),
    idempotency_key: `merchant-flow-render-target-succession-${'c'.repeat(32)}`
  };
}

function apiServices() {
  const succeedRenderTarget = vi.fn(async ({ userId, request }) => {
    if (userId !== ids.founder) throw new DashboardError('merchant_flow_operator_forbidden', 'This operator action is not authorized.', 403);
    return { operation: { operation_id: 'render-target-operation-f1ja', status: 'applied' }, request, replayed: false };
  });
  return {
    env: apiEnv,
    auth: { authenticate: vi.fn(async () => null) },
    embeddedAuth: {
      resolveActor: vi.fn(async ({ shopDomain, shopifyUserId }) => {
        if (shopDomain !== ids.shop) throw new DashboardError('shopify_embedded_identity_invalid', 'This Shopify session is not authorized.', 403);
        return {
          user: { id: shopifyUserId },
          identity: { organization_id: ids.organization },
          connection: { id: ids.connection }
        };
      })
    },
    projects: { authorizeShopifyProjectContext: vi.fn(async () => true) },
    merchantFlow: { succeedRenderTarget }
  };
}

function runtimeEnvironment(themeId) {
  return {
    NODE_ENV: 'production',
    CALINIUM_MERCHANT_FLOW_BETA_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_RUNTIME_REVISION: CONTROLLED_BETA_RUNTIME_REVISION,
    CALINIUM_CONTROLLED_BETA_SOURCE_REVISION: '1'.repeat(40),
    CALINIUM_BUILD_SOURCE_REVISION: '1'.repeat(40),
    CALINIUM_ALLOWED_SHOP_DOMAINS: ids.shop,
    CALINIUM_CONTROLLED_BETA_SHOP_DOMAINS: ids.shop,
    CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_REVISION: CONTROLLED_RENDER_TARGETS_REVISION,
    CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_JSON: JSON.stringify([{ shop_domain: ids.shop, theme_id: themeId, expected_theme_role: 'development' }]),
    CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION: 'shopify-storefront-password-requirements-v1',
    CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_JSON: JSON.stringify([{ shop_domain: ids.shop, requirement: 'not_required' }]),
    CALINIUM_CONTROLLED_BETA_PERSISTENT_DATABASE_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_ARTIFACT_STORAGE_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_DURABLE_JOB_RUNNER_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_GENERATION_WORKER_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_RENDER_QA_WORKER_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_D1_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_OPERATOR_AUTH_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_TELEMETRY_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_D2_7_REQUIRED: 'true',
    CALINIUM_CONTROLLED_BETA_D2_7_PROVIDER_REVISION: APPROVED_D2_7_PROVIDER_REVISION,
    CALINIUM_CONTROLLED_BETA_D2_7_MODEL_ID: APPROVED_D2_7_MODEL_ID,
    CALINIUM_CONTROLLED_BETA_OPERATOR_ROLES: 'owner,administrator',
    CALINIUM_CONTROLLED_BETA_OPERATOR_USER_IDS: ids.founder,
    SHOPIFY_CLI_THEME_TOKEN: 'configured-test-theme-token',
    CALINIUM_SHOPIFY_CLI_EXPECTED_VERSION: '4.6.0',
    CALINIUM_SHOPIFY_CLI_RUNTIME_REVISION: 'shopify-cli-runtime-v1',
    CALINIUM_SHOPIFY_CLI_AUTOUPGRADE_POLICY: 'disabled',
    CALINIUM_PERSISTENT_ROOT: '/tmp/calinium-f1ja-test',
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_REVISION: 'shopify-cli-runtime-state-v1',
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_ROOT: '/tmp/calinium-f1ja-test/runtime',
    OPENAI_API_KEY: 'configured-test-provider-credential'
  };
}

function configuration(themeId) {
  return readControlledBetaRuntimeConfiguration(runtimeEnvironment(themeId));
}

function previewReadyFlow(priorConfiguration) {
  const selected = selectionFixture.cases.find((entry) => entry.id === 'commerce_dense_store');
  const contracts = contractsForCase(selected);
  let flow = createMerchantGenerationFlow({
    projectId: ids.project,
    organizationId: ids.organization,
    conversationRevision: 'conversation-f1ja',
    storeContext: { connection_id: ids.connection, shop: ids.shop },
    createdAt: flowFixture.timestamps[0],
    root
  });
  flow = bindStoreIntelligence(flow, contracts.storeIntelligence, flowFixture.timestamps[1], root);
  flow = bindMerchantIntent(flow, contracts.merchantIntent, flowFixture.timestamps[2], root);
  flow = startArchitectureSelection(flow, flowFixture.timestamps[3], root);
  flow = freezeArchitecture(flow, selectArchitecture({
    merchantIntent: contracts.merchantIntent,
    storeIntelligence: contracts.storeIntelligence,
    selectionMode: 'automatic_beta',
    root
  }), flowFixture.timestamps[4], {}, root);
  flow = bindDesignDna(flow, flowFixture.design_dna, flowFixture.timestamps[8], root);
  flow = bindComposition(flow, flowFixture.composition, flowFixture.timestamps[9], root);
  flow = bindPaidIdentity(flow, flowFixture.paid_identity_pending, flowFixture.timestamps[10], root);
  flow = bindPaidIdentity(flow, flowFixture.paid_identity_frozen, flowFixture.timestamps[11], root);
  flow = startGeneration(flow, flowFixture.generation_id, flowFixture.timestamps[12], root);
  const artifact = createControlledRenderArtifactBinding({
    configuration: priorConfiguration,
    flow,
    artifact: {
      artifact_id: `theme-artifact-${'a'.repeat(20)}`,
      reference: 'output/f1-ja/theme.zip',
      checksum: 'a'.repeat(64),
      generation_id: flowFixture.generation_id
    }
  });
  flow = bindArtifact(flow, artifact, flowFixture.timestamps[13], root);
  flow = startRenderQa(flow, flowFixture.timestamps[14], root);
  const renderQa = {
    status: 'passed',
    render_revision: 'merchant-flow-storefront-render-v1',
    render_result_ids: [`merchant-render-${'b'.repeat(20)}`, `merchant-render-${'c'.repeat(20)}`],
    render_checksum: 'd'.repeat(64),
    d1: { status: 'passed', evidence_id: 'merchant-flow-d1-f1ja', evidence_checksum: 'e'.repeat(64) },
    d2_7: { status: 'passed', evidence_id: 'merchant-flow-d2-7-f1ja', evidence_checksum: 'f'.repeat(64) },
    human_review_required: false
  };
  const previewBinding = createMerchantFlowPreviewBinding({
    organizationId: flow.organization_id,
    projectId: flow.project_id,
    connectionId: flow.store_context.connection_id,
    canonicalShop: ids.shop,
    flowId: flow.flow_id,
    flowSequence: flow.sequence,
    flowChecksum: flow.checksum,
    artifactId: flow.artifact.artifact_id,
    artifactChecksum: flow.artifact.checksum,
    renderRequestId: `merchant-render-request-${'1'.repeat(20)}`,
    renderRequestChecksum: '1'.repeat(64),
    renderEvidenceId: `merchant-render-manifest-${'2'.repeat(20)}`,
    renderEvidenceChecksum: '2'.repeat(64),
    renderRevision: renderQa.render_revision,
    renderResultIds: renderQa.render_result_ids,
    renderChecksum: renderQa.render_checksum,
    developmentThemeId: ids.priorTheme,
    mainThemeId: ids.mainTheme,
    runtimeConfigurationRevision: priorConfiguration.configuration_revision,
    renderTargetConfigurationRevision: priorConfiguration.render_target_configuration_revision,
    sourceRevision: '1'.repeat(40),
    previewUrl: `https://${ids.shop}/?preview_theme_id=${ids.priorTheme}`,
    createdAt: flowFixture.timestamps[15],
    root
  });
  return completeRenderQa(flow, { ...renderQa, preview_binding: previewBinding }, flowFixture.timestamps[15], root);
}

function readiness() {
  return {
    status: 'READY',
    snapshot_id: `controlled-readiness-snapshot-${'3'.repeat(20)}`,
    snapshot_checksum: '3'.repeat(64),
    binding_checksum: '4'.repeat(64),
    checked_at: now.toISOString(),
    valid_until: new Date(now.getTime() + 5 * 60 * 1000).toISOString()
  };
}

async function successorFlowGraph() {
  const initialFlow = previewReadyFlow(configuration(ids.priorTheme));
  const successorConfiguration = configuration(ids.successorTheme);
  const ready = readiness();
  const resolver = createMerchantFlowRenderTargetSuccessionResolver({
    root,
    configuration: successorConfiguration,
    shopifyService: {
      inspectControlledThemeInventory: async () => ({
        authoritative_source: 'shopify_admin_api',
        fresh: true,
        complete: true,
        verified_at: now.toISOString(),
        shop_domain: ids.shop,
        connection_id: ids.connection,
        themes: [
          { id: `gid://shopify/OnlineStoreTheme/${ids.mainTheme}`, role: 'MAIN', processing: false, processingFailed: false },
          { id: `gid://shopify/OnlineStoreTheme/${ids.successorTheme}`, role: 'DEVELOPMENT', processing: false, processingFailed: false }
        ]
      })
    },
    mainThemeId: ids.mainTheme,
    sourceRevision: '5'.repeat(40),
    clock: () => now
  });
  const verified = await resolver.verify({ flow: initialFlow, readiness: ready });
  const record = createRenderTargetSuccessionRecord({
    flow: initialFlow,
    successorBinding: verified.successor_binding,
    priorAuthority: verified.verification.prior_authority,
    successorAuthority: verified.verification.successor_authority,
    shopifyInventory: verified.verification.shopify_inventory,
    mainAuthority: verified.verification.main_authority,
    mainThemeId: verified.verification.main_target.theme_id,
    source: verified.source,
    readiness: verified.readiness,
    operator: { user_id: ids.founder, role: 'owner', explicitly_allowlisted: true },
    submission: verified.prepared.request,
    createdAt: now.toISOString(),
    root
  });
  return {
    initialFlow,
    record,
    flow: applyRenderTargetSuccession(initialFlow, record, new Date(now.getTime() + 1000).toISOString(), root)
  };
}

function successorResumeHarness({ flow, status, attempt, runtime = {}, lineageBinding = null, authorizedResumeOperationId = null }) {
  let job = null;
  let session = {
    id: 'creative-director-f1ja-resume',
    project_id: ids.project,
    updated_at: '2026-09-09T18:10:00.000Z',
    generation_state: { retained_marker: { value: 'preserve' }, merchant_flow: clone(flow) }
  };
  const store = {
    findMerchantFlowResumeOperation: vi.fn(async () => null),
    findMerchantFlowJob: vi.fn(async (jobId) => jobId === job?.id ? clone(job) : null),
    findMerchantFlowLegacyD27LineageBinding: vi.fn(async () => clone(lineageBinding)),
    findLatestMerchantFlowLegacyD27LineageBinding: vi.fn(async () => null),
    applyMerchantFlowResumeOperation: vi.fn(async (input) => {
      session = {
        ...session,
        updated_at: input.at,
        generation_state: clone(input.nextGenerationState)
      };
      const armedJob = {
        ...job,
        status: 'queued',
        attempt: input.record.target_job_attempt,
        authorized_resume_operation_id: input.record.id,
        authorized_attempt: input.record.target_job_attempt,
        updated_at: input.at
      };
      job = armedJob;
      return {
        replayed: false,
        operation: { ...clone(input.record), status: 'applied', applied_at: input.at },
        session: clone(session),
        job: clone(armedJob)
      };
    })
  };
  const jobRunner = { schedule: vi.fn(), event: vi.fn(async () => true) };
  const service = new MerchantGenerationFlowService({
    root,
    store,
    projectService: {},
    runtime,
    clock: () => new Date('2026-09-09T18:11:00.000Z')
  });
  service.setJobRunner(jobRunner);
  const identity = service.renderQaIdentity(flow);
  job = {
    id: identity.job_id,
    flow_id: flow.flow_id,
    project_id: flow.project_id,
    organization_id: flow.organization_id,
    job_kind: 'render_qa',
    identity_checksum: identity.identity_checksum,
    status,
    attempt,
    authorized_resume_operation_id: authorizedResumeOperationId,
    authorized_attempt: authorizedResumeOperationId ? attempt : null,
    payload: {
      flow_id: flow.flow_id,
      project_id: flow.project_id,
      organization_id: flow.organization_id,
      artifact_id: flow.artifact.artifact_id,
      render_request_id: identity.render_request_id,
      qa_id: identity.qa_id,
      operation_id: flow.target_succession.succession_id
    }
  };
  return { service, store, jobRunner, identity, session: () => clone(session), job: () => clone(job) };
}

async function terminalSuccessorFlowGraph() {
  const graph = await successorFlowGraph();
  const identityService = new MerchantGenerationFlowService({ root, store: {}, projectService: {} });
  const identity = identityService.renderQaIdentity(graph.flow);
  const binding = {
    flow_id: graph.flow.flow_id,
    project_id: graph.flow.project_id,
    organization_id: graph.flow.organization_id,
    job_id: identity.job_id,
    job_attempt: 2,
    artifact_id: graph.flow.artifact.artifact_id,
    artifact_checksum: graph.flow.artifact.checksum,
    evidence_directory_reference: 'output/f1-ja-successor-terminal-recovery',
    render_request_id: identity.render_request_id,
    render_request_checksum: '7'.repeat(64),
    render_checksum: '8'.repeat(64),
    render_result_ids: ['render-f1ja-successor-home-desktop', 'render-f1ja-successor-home-mobile'],
    route_ids: ['homepage'],
    viewport_ids: ['desktop-v1', 'mobile-v1'],
    d1_evidence_id: 'merchant-flow-d1-f1ja-successor',
    d1_evidence_checksum: '9'.repeat(64),
    d1_policy_revision: 'storefront-visual-evaluation-policy-v1',
    runtime_configuration_revision: graph.flow.artifact.controlled_runtime_binding.runtime_configuration_revision,
    render_target_configuration_revision: graph.flow.artifact.controlled_runtime_binding.render_target_configuration_revision,
    development_shop: ids.shop,
    development_theme_id: ids.successorTheme,
    deployed_source_revision: '5'.repeat(40)
  };
  const requestBinding = {
    request_id: `merchant-flow-d2-7-request-${'a'.repeat(20)}`,
    request_checksum: 'a'.repeat(64)
  };
  const failure = createMerchantFlowD27Failure({
    root,
    error: new ReferenceError('provider_revision is not defined'),
    stage: 'unknown',
    occurredAt: '2026-09-09T18:04:00.000Z',
    requestBinding,
    provider: {
      interface_version: 'merchant-flow-d2-7-provider-v1',
      provider_id: 'calinium-openai-responses-merchant-concrete-observation',
      provider_version: '1.0.0',
      provider_kind: 'live_multimodal',
      provider_revision: 'provider-revision-f1ja',
      model_id: 'gpt-5.6-sol',
      model_configuration_revision: 'gpt-5-6-sol-merchant-concrete-observation-v1'
    },
    binding,
    attemptSequence: 1
  });
  const running = startRenderQa(graph.flow, '2026-09-09T18:02:00.000Z', root);
  const terminalFlow = completeRenderQa(running, {
    status: 'failed',
    render_revision: 'merchant-flow-storefront-render-v1',
    render_result_ids: binding.render_result_ids,
    render_checksum: binding.render_checksum,
    d1: { status: 'passed', evidence_id: binding.d1_evidence_id, evidence_checksum: binding.d1_evidence_checksum },
    d2_7: { status: 'failed', evidence_id: failure.failure_id, evidence_checksum: failure.checksum },
    d2_7_failure: failure,
    human_review_required: false
  }, '2026-09-09T18:04:00.000Z', root);
  const predecessor = { sequence: terminalFlow.sequence - 1, checksum: 'b'.repeat(64) };
  const rawCandidate = {
    evidence_directory_reference: binding.evidence_directory_reference,
    compatibility: 'reusable',
    incompatibility_codes: [],
    render: {
      request_id: binding.render_request_id,
      request_checksum: binding.render_request_checksum,
      render_checksum: binding.render_checksum,
      render_revision: 'merchant-flow-storefront-render-v1',
      render_result_ids: binding.render_result_ids,
      route_ids: binding.route_ids,
      viewport_ids: binding.viewport_ids
    },
    d1: {
      evidence_id: binding.d1_evidence_id,
      evidence_checksum: binding.d1_evidence_checksum,
      status: 'passed',
      policy_revision: binding.d1_policy_revision,
      render_request_id: binding.render_request_id,
      render_request_checksum: binding.render_request_checksum
    },
    d2_7_parent: {
      request_id: requestBinding.request_id,
      request_checksum: requestBinding.request_checksum,
      source_render_request_id: binding.render_request_id,
      source_render_checksum: binding.render_checksum,
      source_d1_evidence_id: binding.d1_evidence_id,
      source_d1_evidence_checksum: binding.d1_evidence_checksum
    },
    provenance: {
      organization_id: binding.organization_id,
      project_id: binding.project_id,
      flow_id: binding.flow_id,
      flow_sequence: predecessor.sequence,
      flow_checksum: predecessor.checksum,
      artifact_id: binding.artifact_id,
      artifact_checksum: binding.artifact_checksum,
      development_shop: binding.development_shop,
      development_theme_id: binding.development_theme_id,
      runtime_configuration_revision: binding.runtime_configuration_revision,
      render_target_configuration_revision: binding.render_target_configuration_revision,
      deployed_source_revision: binding.deployed_source_revision
    },
    explicit_association: { job_id: identity.job_id, logical_attempt: 1 }
  };
  const scope = {
    organization_id: binding.organization_id,
    project_id: binding.project_id,
    flow_id: binding.flow_id,
    current_flow_sequence: terminalFlow.sequence,
    current_flow_checksum: terminalFlow.checksum,
    job_id: identity.job_id,
    logical_attempt: 1,
    artifact_id: binding.artifact_id,
    artifact_checksum: binding.artifact_checksum,
    development_shop: binding.development_shop,
    development_theme_id: binding.development_theme_id,
    runtime_configuration_revision: binding.runtime_configuration_revision,
    render_target_configuration_revision: binding.render_target_configuration_revision,
    deployed_source_revision: binding.deployed_source_revision,
    route_ids: binding.route_ids,
    viewport_ids: binding.viewport_ids
  };
  const resolution = resolveControlledBetaD27LegacyLineage({
    scope,
    authoritativeContext: {
      d2_7_parent: requestBinding,
      job_attempt: { job_id: identity.job_id, logical_attempt: 1 },
      accepted_evidence: {
        render_request_id: binding.render_request_id,
        render_request_checksum: binding.render_request_checksum,
        render_checksum: binding.render_checksum,
        d1_evidence_id: binding.d1_evidence_id,
        d1_evidence_checksum: binding.d1_evidence_checksum
      },
      immediate_predecessor_flow_revision: predecessor
    },
    candidates: [rawCandidate]
  }, root);
  const lineageBinding = {
    ...scope,
    status: resolution.status,
    resolution_id: resolution.resolution_id,
    resolution_checksum: resolution.resolution_checksum,
    candidate_set_checksum: resolution.candidate_set_checksum,
    selected_candidate_id: resolution.selection.selected_candidate_id,
    resolution,
    resume_operation_id: 'merchant-flow-resume-operation-f1ja-successor-attempt-2'
  };
  const selectedCandidate = resolution.candidates.find((candidate) => candidate.candidate_id === lineageBinding.selected_candidate_id);
  return { ...graph, identity, binding, failure, terminalFlow, resolution, lineageBinding, selectedCandidate };
}

describe('F1-JA render-target succession API boundary', () => {
  it('requires an embedded POST and reaches the operator service through the verified Shopify actor', async () => {
    const services = apiServices();
    const api = createDashboardApiHandler({ services, env: apiEnv });
    const submission = preparedSubmission();

    expect(await invoke(api, { body: submission })).toMatchObject({ status: 403, payload: { error: { code: 'csrf_invalid' } } });
    expect(await invoke(api, { method: 'GET', token: signedSession() })).toMatchObject({ status: 405, payload: { error: { code: 'method_not_allowed' } } });
    expect(await invoke(api, { token: signedSession(ids.merchant), body: submission })).toMatchObject({ status: 403, payload: { error: { code: 'merchant_flow_operator_forbidden' } } });

    const accepted = await invoke(api, { token: signedSession(), body: submission });
    expect(accepted).toMatchObject({ status: 200, payload: { result: { operation: { status: 'applied' }, replayed: false } } });
    expect(services.projects.authorizeShopifyProjectContext).toHaveBeenLastCalledWith({
      userId: ids.founder,
      projectId: ids.project,
      organizationId: ids.organization,
      connectionId: ids.connection
    });
    expect(services.merchantFlow.succeedRenderTarget).toHaveBeenLastCalledWith({
      projectId: ids.project,
      userId: ids.founder,
      request: submission
    });
  });

  it.each([
    ['target identity', { successor_theme_id: ids.successorTheme }],
    ['source identity', { source_revision: '5'.repeat(40) }],
    ['readiness evidence', { readiness: { status: 'READY' } }],
    ['configuration identity', { configuration_checksum: '6'.repeat(64) }]
  ])('rejects client-supplied %s before the operator service', async (_label, injected) => {
    const services = apiServices();
    const api = createDashboardApiHandler({ services, env: apiEnv });
    const response = await invoke(api, { token: signedSession(), body: { ...preparedSubmission(), ...injected } });

    expect(response).toMatchObject({
      status: 422,
      payload: { error: { code: 'merchant_flow_render_target_succession_submission_invalid' } }
    });
    expect(services.merchantFlow.succeedRenderTarget).not.toHaveBeenCalled();
  });
});

describe('F1-JA render-target succession service boundary', () => {
  it('authorizes, verifies, atomically applies one exact CAS and successor job, then replays idempotently', async () => {
    const priorConfiguration = configuration(ids.priorTheme);
    const successorConfiguration = configuration(ids.successorTheme);
    const initialFlow = previewReadyFlow(priorConfiguration);
    const ready = readiness();
    const inventory = vi.fn(async () => ({
      authoritative_source: 'shopify_admin_api',
      fresh: true,
      complete: true,
      verified_at: now.toISOString(),
      shop_domain: ids.shop,
      connection_id: ids.connection,
      themes: [
        { id: `gid://shopify/OnlineStoreTheme/${ids.mainTheme}`, role: 'MAIN', processing: false, processingFailed: false },
        { id: `gid://shopify/OnlineStoreTheme/${ids.successorTheme}`, role: 'DEVELOPMENT', processing: false, processingFailed: false }
      ]
    }));
    const authoritativeResolver = createMerchantFlowRenderTargetSuccessionResolver({
      root,
      configuration: successorConfiguration,
      shopifyService: { inspectControlledThemeInventory: inventory },
      mainThemeId: ids.mainTheme,
      sourceRevision: '5'.repeat(40),
      clock: () => now
    });
    const resolver = {
      prepare: authoritativeResolver.prepare,
      verify: vi.fn((input) => authoritativeResolver.verify(input))
    };
    const submission = resolver.prepare({ flow: initialFlow, readiness: ready }).request;
    const project = { id: ids.project, organization_id: ids.organization };
    const initialGenerationState = { retained_marker: { value: 'preserve' }, merchant_flow: initialFlow };
    let session = {
      id: 'creative-director-f1ja',
      project_id: ids.project,
      updated_at: '2026-09-09T17:59:00.000Z',
      generation_state: clone(initialGenerationState)
    };
    const preTransactionSession = clone(session);
    let retainedOperation = null;
    let successorJob = null;
    const applyAtomic = vi.fn(async (input) => {
      session = {
        ...session,
        generation_state: clone(input.nextGenerationState),
        updated_at: input.at
      };
      retainedOperation = {
        record: clone(input.record),
        status: 'applied',
        result_flow_sequence: input.resultFlow.sequence,
        result_flow_checksum: input.resultFlow.checksum,
        result_flow_state: input.resultFlow.state,
        applied_at: input.at
      };
      successorJob = clone(input.job);
      return { replayed: false, operation: retainedOperation, session: clone(session), job: clone(successorJob) };
    });
    const store = {
      findCreativeDirectorForProject: vi.fn(async () => clone(session)),
      findProjectShopifyConnection: vi.fn(async () => ({ connection: { id: ids.connection, shop_domain: ids.shop } })),
      findMerchantFlowRenderTargetSuccession: vi.fn(async () => clone(retainedOperation)),
      findMerchantFlowJob: vi.fn(async (jobId) => jobId === successorJob?.id ? clone(successorJob) : null),
      applyMerchantFlowRenderTargetSuccession: applyAtomic
    };
    const authorization = {
      authorize: vi.fn(async ({ userId }) => {
        if (userId !== ids.founder) throw new DashboardError('merchant_flow_operator_forbidden', 'This operator action is not authorized.', 403);
        return { project, operator: { user_id: userId, role: 'owner', explicitly_allowlisted: true } };
      })
    };
    const jobRunner = { schedule: vi.fn(), event: vi.fn(async () => true) };
    const service = new MerchantGenerationFlowService({
      root,
      store,
      projectService: {},
      controlledRuntimeConfiguration: successorConfiguration,
      operatorAuthorization: authorization,
      renderTargetSuccessionResolver: resolver,
      betaReadiness: vi.fn(async () => clone(ready)),
      clock: () => now
    });
    service.setJobRunner(jobRunner);

    const first = await service.succeedRenderTarget({ projectId: ids.project, userId: ids.founder, request: submission });
    expect(first).toMatchObject({ replayed: false, operation: { status: 'applied' }, flow: { state: 'artifact_ready' } });
    expect(authorization.authorize).toHaveBeenCalledWith({ userId: ids.founder, projectId: ids.project, flow: initialFlow });
    expect(authorization.authorize.mock.invocationCallOrder[0]).toBeLessThan(resolver.verify.mock.invocationCallOrder[0]);
    expect(inventory).toHaveBeenCalledTimes(1);
    expect(applyAtomic).toHaveBeenCalledTimes(1);

    const atomic = applyAtomic.mock.calls[0][0];
    expect(atomic.expectedGenerationState).toEqual(initialGenerationState);
    expect(atomic.expectedSessionUpdatedAt).toBe('2026-09-09T17:59:00.000Z');
    expect(atomic.record.flow).toMatchObject({
      flow_id: initialFlow.flow_id,
      expected_state: 'preview_ready',
      expected_sequence: initialFlow.sequence,
      expected_checksum: initialFlow.checksum
    });
    expect(atomic.nextGenerationState.retained_marker).toEqual({ value: 'preserve' });
    expect(atomic.resultFlow).toEqual(atomic.nextGenerationState.merchant_flow);
    expect(atomic.resultFlow).toMatchObject({
      state: 'artifact_ready',
      sequence: initialFlow.sequence + 1,
      render_qa: null,
      artifact: { controlled_runtime_binding: { theme_id: ids.successorTheme } },
      target_succession: {
        succession_id: atomic.record.succession_id,
        successor_job_id: atomic.record.successor_job.job_id
      }
    });
    expect(atomic.job).toMatchObject({
      id: atomic.record.successor_job.job_id,
      identity_checksum: atomic.record.successor_job.identity_checksum,
      job_kind: 'render_qa',
      status: 'queued',
      attempt: 0,
      payload: {
        flow_id: initialFlow.flow_id,
        project_id: ids.project,
        organization_id: ids.organization,
        artifact_id: initialFlow.artifact.artifact_id,
        operation_id: atomic.record.succession_id
      }
    });
    expect(atomic.job.id).not.toBe('merchant-flow-job-00000000000000000001');
    expect(jobRunner.schedule).toHaveBeenCalledWith(expect.objectContaining({ id: atomic.job.id, status: 'queued' }));

    store.findCreativeDirectorForProject.mockResolvedValueOnce(preTransactionSession);
    const replay = await service.succeedRenderTarget({ projectId: ids.project, userId: ids.founder, request: submission });
    expect(replay).toMatchObject({
      replayed: true,
      operation: { operation_id: first.operation.operation_id, operation_checksum: first.operation.operation_checksum, status: 'applied' },
      flow: { state: 'artifact_ready' }
    });
    expect(applyAtomic).toHaveBeenCalledTimes(1);
    expect(resolver.verify).toHaveBeenCalledTimes(1);
    expect(inventory).toHaveBeenCalledTimes(1);
    expect(store.findMerchantFlowJob).toHaveBeenCalledWith(atomic.job.id, ids.project, ids.organization);

    session = {
      ...session,
      updated_at: '2026-09-09T18:01:00.000Z',
      generation_state: {
        ...session.generation_state,
        merchant_flow: startRenderQa(session.generation_state.merchant_flow, '2026-09-09T18:01:00.000Z', root)
      }
    };
    await expect(service.succeedRenderTarget({ projectId: ids.project, userId: ids.founder, request: submission })).rejects.toMatchObject({
      code: 'merchant_flow_render_target_succession_replay_stale',
      status: 409
    });
  });

  it('rejects a stale historical render worker before early return or execution while preserving its legacy identity', async () => {
    const graph = await successorFlowGraph();
    let activeFlow = graph.initialFlow;
    const store = {
      findProjectById: vi.fn(async () => ({ id: ids.project, organization_id: ids.organization })),
      findCreativeDirectorForProject: vi.fn(async () => ({
        id: 'creative-director-f1ja-worker',
        project_id: ids.project,
        updated_at: '2026-09-09T18:05:00.000Z',
        generation_state: { merchant_flow: clone(activeFlow) }
      }))
    };
    const runtime = { runRenderQa: vi.fn(async () => { throw new Error('stale worker must not execute'); }) };
    const service = new MerchantGenerationFlowService({ root, store, projectService: {}, runtime });
    const legacyIdentity = service.renderQaIdentity(graph.initialFlow);
    const historicalJob = {
      id: legacyIdentity.job_id,
      flow_id: graph.initialFlow.flow_id,
      project_id: ids.project,
      organization_id: ids.organization,
      job_kind: 'render_qa',
      identity_checksum: legacyIdentity.identity_checksum,
      status: 'running',
      attempt: 1,
      payload: {
        flow_id: graph.initialFlow.flow_id,
        project_id: ids.project,
        organization_id: ids.organization,
        artifact_id: graph.initialFlow.artifact.artifact_id,
        render_request_id: legacyIdentity.render_request_id,
        qa_id: legacyIdentity.qa_id
      }
    };

    await expect(service.executeRenderQaJob(historicalJob)).resolves.toMatchObject({
      flow_id: graph.initialFlow.flow_id,
      status: 'preview_ready',
      job_id: legacyIdentity.job_id,
      qa_id: legacyIdentity.qa_id
    });

    activeFlow = graph.flow;
    await expect(service.executeRenderQaJob(historicalJob)).rejects.toMatchObject({
      code: 'stale_provenance',
      retryable: false
    });
    expect(runtime.runRenderQa).not.toHaveBeenCalled();
  });

  it('resumes a retryable successor through its target-bound job and stable request identities', async () => {
    const graph = await successorFlowGraph();
    const running = startRenderQa(graph.flow, '2026-09-09T18:02:00.000Z', root);
    const failed = failFlow(running, 'qa_failed', 'Sanitized retryable QA failure.', true, '2026-09-09T18:03:00.000Z', root);
    const harness = successorResumeHarness({ flow: failed, status: 'retryable', attempt: 1 });
    const legacy = jobIdentity({
      flowId: graph.initialFlow.flow_id,
      kind: 'render_qa',
      artifactId: graph.initialFlow.artifact.artifact_id,
      renderRequestId: `render-request-${graph.initialFlow.artifact.checksum.slice(0, 20)}`,
      qaId: `qa-${graph.initialFlow.artifact.checksum.slice(0, 20)}`
    });

    expect(harness.identity).toMatchObject({
      job_id: graph.record.successor_job.job_id,
      identity_checksum: graph.record.successor_job.identity_checksum,
      render_request_id: `render-target-succession-${graph.record.succession_id.slice(-20)}`,
      qa_id: `qa-target-succession-${graph.record.succession_id.slice(-20)}`
    });
    expect(harness.service.renderQaIdentity(failed)).toEqual(harness.identity);
    expect(harness.service.renderQaIdentity(graph.initialFlow)).toMatchObject({
      job_id: legacy.job_id,
      identity_checksum: legacy.identity_checksum,
      render_request_id: legacy.binding.render_request_id,
      qa_id: legacy.binding.qa_id
    });

    const result = await harness.service.resumeRenderQa({
      project: { id: ids.project, organization_id: ids.organization },
      session: harness.session(),
      flow: failed,
      userId: ids.founder,
      expectedFlowChecksum: failed.checksum,
      expectedFlowSequence: failed.sequence,
      idempotencyKey: `merchant-flow-resume-${failed.checksum}`,
      requestId: 'f1ja-successor-retryable-resume'
    });

    expect(result).toMatchObject({ resumed: true, flow: { state: 'render_qa_running' } });
    expect(harness.store.findMerchantFlowJob).toHaveBeenCalledWith(
      graph.record.successor_job.job_id,
      ids.project,
      ids.organization
    );
    const applied = harness.store.applyMerchantFlowResumeOperation.mock.calls[0][0];
    expect(applied).toMatchObject({
      expectedJobStatus: 'retryable',
      record: {
        job_id: graph.record.successor_job.job_id,
        expected_job_attempt: 1,
        target_job_attempt: 2
      }
    });
    expect(harness.job()).toMatchObject({
      id: graph.record.successor_job.job_id,
      status: 'queued',
      attempt: 2,
      payload: {
        render_request_id: harness.identity.render_request_id,
        qa_id: harness.identity.qa_id,
        operation_id: graph.record.succession_id
      }
    });
    expect(harness.jobRunner.schedule).toHaveBeenCalledWith(expect.objectContaining({
      id: graph.record.successor_job.job_id,
      status: 'queued',
      attempt: 2
    }));
  });

  it('recovers a terminal D2.7 successor through the same target-bound identity and arms one next attempt', async () => {
    const graph = await terminalSuccessorFlowGraph();
    const validateTerminalD27Recovery = vi.fn(async (input) => createMerchantFlowD27TerminalRecovery({
      authorizedAt: input.authorized_at,
      flow: input.flow,
      job: input.job,
      failure: input.flow.render_qa.d2_7_failure,
      currentSourceRevision: '6'.repeat(40),
      resumeOperationId: input.resume_operation_id,
      actorUserId: input.actor_user_id,
      idempotencyKey: input.idempotency_key,
      lineageBinding: input.lineage_binding,
      selectedCandidate: graph.selectedCandidate
    }, root));
    const harness = successorResumeHarness({
      flow: graph.terminalFlow,
      status: 'terminal',
      attempt: 2,
      runtime: { validateTerminalD27Recovery },
      lineageBinding: graph.lineageBinding,
      authorizedResumeOperationId: graph.lineageBinding.resume_operation_id
    });

    const result = await harness.service.resumeRenderQa({
      project: { id: ids.project, organization_id: ids.organization },
      session: harness.session(),
      flow: graph.terminalFlow,
      userId: ids.founder,
      expectedFlowChecksum: graph.terminalFlow.checksum,
      expectedFlowSequence: graph.terminalFlow.sequence,
      idempotencyKey: `merchant-flow-resume-${graph.terminalFlow.checksum}`,
      requestId: 'f1ja-successor-terminal-resume'
    });

    expect(result).toMatchObject({ resumed: true, flow: { state: 'render_qa_running' } });
    expect(harness.store.findMerchantFlowJob).toHaveBeenCalledWith(
      graph.record.successor_job.job_id,
      ids.project,
      ids.organization
    );
    expect(harness.store.findMerchantFlowLegacyD27LineageBinding).toHaveBeenCalledWith(
      graph.terminalFlow.flow_id,
      graph.record.successor_job.job_id,
      1,
      ids.project,
      ids.organization
    );
    expect(validateTerminalD27Recovery).toHaveBeenCalledWith(expect.objectContaining({
      flow: expect.objectContaining({
        flow_id: graph.terminalFlow.flow_id,
        target_succession: expect.objectContaining({ successor_job_id: graph.record.successor_job.job_id })
      }),
      job: expect.objectContaining({
        id: graph.record.successor_job.job_id,
        identity_checksum: graph.record.successor_job.identity_checksum,
        attempt: 2
      }),
      lineage_binding: expect.objectContaining({ job_id: graph.record.successor_job.job_id, logical_attempt: 1 })
    }));
    const applied = harness.store.applyMerchantFlowResumeOperation.mock.calls[0][0];
    expect(applied).toMatchObject({
      expectedJobStatus: 'terminal',
      record: {
        job_id: graph.record.successor_job.job_id,
        expected_job_attempt: 2,
        target_job_attempt: 3
      },
      resultFlow: {
        state: 'render_qa_running',
        target_succession: { successor_job_id: graph.record.successor_job.job_id },
        terminal_recovery: {
          job: {
            job_id: graph.record.successor_job.job_id,
            source_attempt: 2,
            target_attempt: 3
          }
        }
      }
    });
    expect(harness.job()).toMatchObject({
      id: graph.record.successor_job.job_id,
      status: 'queued',
      attempt: 3,
      payload: {
        render_request_id: graph.identity.render_request_id,
        qa_id: graph.identity.qa_id,
        operation_id: graph.record.succession_id
      }
    });
    expect(harness.jobRunner.schedule).toHaveBeenCalledWith(expect.objectContaining({
      id: graph.record.successor_job.job_id,
      status: 'queued',
      attempt: 3
    }));
  });
});
