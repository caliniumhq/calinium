import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { digest } = require('../../../ai/architecture');
const {
  CONTROLLED_BETA_RUNTIME_REVISION,
  CONTROLLED_RENDER_TARGETS_REVISION,
  APPROVED_D2_7_PROVIDER_REVISION,
  APPROVED_D2_7_MODEL_ID,
  readControlledBetaRuntimeConfiguration
} = require('../server/services/merchant-flow-controlled-runtime-configuration.cjs');
const {
  CONTROLLED_RUNTIME_SAFETY,
  createControlledRenderArtifactBinding,
  createControlledRenderTargetResolver,
  createControlledMerchantFlowRuntime
} = require('../server/services/merchant-flow-controlled-runtime.cjs');
const { MerchantFlowOperatorAuthorizationService } = require('../server/services/merchant-flow-operator-authorization-service.cjs');

const NOW = new Date('2026-08-18T12:00:00.000Z');
const CHECKSUM_A = 'a'.repeat(64);
const CHECKSUM_B = 'b'.repeat(64);

function environment(overrides = {}) {
  return {
    NODE_ENV: 'production',
    CALINIUM_MERCHANT_FLOW_BETA_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_RUNTIME_REVISION: CONTROLLED_BETA_RUNTIME_REVISION,
    CALINIUM_CONTROLLED_BETA_SOURCE_REVISION: '1000000000000000000000000000000000000004',
    CALINIUM_BUILD_SOURCE_REVISION: '1000000000000000000000000000000000000004',
    CALINIUM_ALLOWED_SHOP_DOMAINS: 'controlled-beta.myshopify.com',
    CALINIUM_CONTROLLED_BETA_SHOP_DOMAINS: 'controlled-beta.myshopify.com',
    CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_REVISION: CONTROLLED_RENDER_TARGETS_REVISION,
    CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_JSON: JSON.stringify([{ shop_domain: 'controlled-beta.myshopify.com', theme_id: '42001', expected_theme_role: 'development' }]),
    CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION: 'shopify-storefront-password-requirements-v1',
    CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_JSON: JSON.stringify([{ shop_domain: 'controlled-beta.myshopify.com', requirement: 'not_required' }]),
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
    CALINIUM_CONTROLLED_BETA_OPERATOR_USER_IDS: 'usr_founder_1',
    SHOPIFY_CLI_THEME_TOKEN: 'configured-test-theme-token',
    CALINIUM_SHOPIFY_CLI_EXPECTED_VERSION: '4.6.0',
    CALINIUM_SHOPIFY_CLI_RUNTIME_REVISION: 'shopify-cli-runtime-v1',
    CALINIUM_SHOPIFY_CLI_AUTOUPGRADE_POLICY: 'disabled',
    CALINIUM_PERSISTENT_ROOT: '/tmp/calinium-controlled-runtime',
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_REVISION: 'shopify-cli-runtime-state-v1',
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_ROOT: '/tmp/calinium-controlled-runtime/shopify-cli-runtime-state',
    OPENAI_API_KEY: 'configured-test-provider-credential',
    ...overrides
  };
}

function configuration(overrides = {}) { return readControlledBetaRuntimeConfiguration(environment(overrides)); }
function flow(overrides = {}) {
  return {
    flow_id: 'flow-controlled-runtime',
    project_id: 'project-controlled-runtime',
    organization_id: 'organization-controlled-runtime',
    store_context: { connection_id: 'connection-controlled-runtime', shop: 'controlled-beta.myshopify.com' },
    ...overrides
  };
}
function artifact(overrides = {}, selectedConfiguration = configuration(), selectedFlow = flow()) {
  const bound = createControlledRenderArtifactBinding({ configuration: selectedConfiguration, flow: selectedFlow, artifact: {
    artifact_id: 'artifact-controlled-runtime',
    checksum: 'c'.repeat(64)
  } });
  return { ...bound, ...overrides };
}
function authoritativeInspection(overrides = {}) {
  return {
    authoritative_source: 'shopify_admin_api',
    fresh: true,
    verified_at: NOW.toISOString(),
    shop_domain: 'controlled-beta.myshopify.com',
    connection_id: 'connection-controlled-runtime',
    theme: { id: 'gid://shopify/OnlineStoreTheme/42001', role: 'DEVELOPMENT', processing: false, processingFailed: false },
    ...overrides
  };
}
function inspectingService(inspection = authoritativeInspection()) {
  return { async inspectControlledRenderTarget() { return inspection; } };
}

describe('Controlled Shopify render target resolver', () => {
  it('binds an exact configured target to a fresh authoritative Shopify response', async () => {
    const calls = [];
    const resolver = createControlledRenderTargetResolver({
      configuration: configuration(),
      shopifyService: { async inspectControlledRenderTarget(input) { calls.push(input); return authoritativeInspection(); } },
      clock: () => NOW
    });
    const boundArtifact = artifact();
    const checksumBase = { ...boundArtifact.controlled_runtime_binding };
    delete checksumBase.binding_checksum;
    expect(boundArtifact.controlled_runtime_binding.binding_checksum).toBe(digest(checksumBase));
    await expect(resolver({ flow: flow(), artifact: boundArtifact })).resolves.toEqual({
      shop: 'controlled-beta.myshopify.com', theme_id: '42001', theme_role: 'development', is_live: false
    });
    expect(calls).toEqual([{
      projectId: 'project-controlled-runtime',
      organizationId: 'organization-controlled-runtime',
      connectionId: 'connection-controlled-runtime',
      shopDomain: 'controlled-beta.myshopify.com',
      themeId: '42001',
      themeGid: 'gid://shopify/OnlineStoreTheme/42001'
    }]);
  });

  it('can verify the target through the existing Shopify service store/adapter path', async () => {
    const calls = [];
    const shopifyService = {
      store: { async findProjectShopifyConnection() { return { connection: { id: 'connection-controlled-runtime', shop_domain: 'controlled-beta.myshopify.com', connection_status: 'ready', credential_status: 'active' } }; } },
      async connectionAccess() { calls.push('credential'); return 'test-access-token-not-returned'; },
      adapter: { async listResourcePage(input) { calls.push({ shop: input.shopDomain, type: input.resourceType, first: input.first }); return { nodes: [{ id: 'gid://shopify/OnlineStoreTheme/42001', role: 'DEVELOPMENT', processing: false, processingFailed: false }] }; } }
    };
    const resolver = createControlledRenderTargetResolver({ configuration: configuration(), shopifyService, clock: () => NOW });
    const target = await resolver({ flow: flow(), artifact: artifact() });
    expect(target.theme_id).toBe('42001');
    expect(calls).toEqual(['credential', { shop: 'controlled-beta.myshopify.com', type: 'theme', first: 100 }]);
    expect(JSON.stringify(target)).not.toContain('test-access-token-not-returned');
  });

  it('rejects stale configuration, arbitrary theme IDs, and non-live-role drift', async () => {
    const resolver = createControlledRenderTargetResolver({ configuration: configuration(), shopifyService: inspectingService(), clock: () => NOW });
    const currentArtifact = artifact();
    await expect(resolver({ flow: flow(), artifact: { ...currentArtifact, controlled_runtime_binding: { ...currentArtifact.controlled_runtime_binding, render_target_configuration_revision: 'obsolete-targets-v0' } } }))
      .rejects.toMatchObject({ code: 'controlled_beta_render_target_revision_stale' });
    await expect(resolver({ flow: flow(), artifact: artifact({ target_theme_id: '99999' }) }))
      .rejects.toMatchObject({ code: 'controlled_beta_shopify_theme_mismatch' });
    const liveResolver = createControlledRenderTargetResolver({
      configuration: configuration(),
      shopifyService: inspectingService(authoritativeInspection({ theme: { id: 'gid://shopify/OnlineStoreTheme/42001', role: 'MAIN' } })),
      clock: () => NOW
    });
    await expect(liveResolver({ flow: flow(), artifact: artifact() })).rejects.toMatchObject({ code: 'controlled_beta_live_theme_target_forbidden' });

    const unpublishedResolver = createControlledRenderTargetResolver({
      configuration: configuration(),
      shopifyService: inspectingService(authoritativeInspection({ theme: { id: 'gid://shopify/OnlineStoreTheme/42001', role: 'UNPUBLISHED' } })),
      clock: () => NOW
    });
    await expect(unpublishedResolver({ flow: flow(), artifact: artifact() })).rejects.toMatchObject({ code: 'controlled_beta_live_theme_target_forbidden' });
  });

  it('rejects non-allowlisted flow shops before calling Shopify', async () => {
    let calls = 0;
    const resolver = createControlledRenderTargetResolver({
      configuration: configuration(),
      shopifyService: { async inspectControlledRenderTarget() { calls += 1; return authoritativeInspection(); } },
      clock: () => NOW
    });
    await expect(resolver({ flow: flow({ store_context: { connection_id: 'connection-controlled-runtime', shop: 'outside-beta.myshopify.com' } }), artifact: artifact() }))
      .rejects.toMatchObject({ code: 'controlled_beta_shop_not_allowed' });
    expect(calls).toBe(0);
  });
});

describe('Controlled operator readiness', () => {
  const policy = {
    schema_version: '1.0',
    contract_version: 'merchant-flow-operator-authorization-v1',
    allowed_roles: ['owner', 'administrator'],
    operator_user_ids: ['usr_founder_1']
  };

  function operatorStore(overrides = {}) {
    return {
      async findUserById() { return { id: 'usr_founder_1', status: 'active' }; },
      async listOrganizationsForUser() { return [{ organization: { id: 'organization-controlled-runtime' }, role: 'owner' }]; },
      async listProjects() { return [{ id: 'project-controlled-runtime', organization_id: 'organization-controlled-runtime', status: 'active' }]; },
      async findProjectById() { return { id: 'project-controlled-runtime', organization_id: 'organization-controlled-runtime', status: 'active' }; },
      async findMembership() { return { status: 'active', role: 'owner' }; },
      async findProjectShopifyConnection() { return null; },
      ...overrides
    };
  }

  it('requires at least one configured active owner/admin who can authorize an active project', async () => {
    const eligible = new MerchantFlowOperatorAuthorizationService({ store: operatorStore(), policy });
    await expect(eligible.hasEligibleOperator()).resolves.toBe(true);

    const inactive = new MerchantFlowOperatorAuthorizationService({
      store: operatorStore({ async findUserById() { return { id: 'usr_founder_1', status: 'disabled' }; } }),
      policy
    });
    await expect(inactive.hasEligibleOperator()).resolves.toBe(false);

    const editor = new MerchantFlowOperatorAuthorizationService({
      store: operatorStore({ async listOrganizationsForUser() { return [{ organization: { id: 'organization-controlled-runtime' }, role: 'editor' }]; } }),
      policy
    });
    await expect(editor.hasEligibleOperator()).resolves.toBe(false);
  });
});

describe('Production-controlled merchant-flow runtime', () => {
  it('runs real-pipeline adapters in target, render, D1, D2.7 order with immutable safety', async () => {
    const events = [];
    const runtime = createControlledMerchantFlowRuntime({
      configuration: configuration(),
      shopifyService: { async inspectControlledRenderTarget() { events.push('target'); return authoritativeInspection(); } },
      async renderArtifact(input) {
        events.push('render');
        expect(input.controlled_runtime.safety).toEqual(CONTROLLED_RUNTIME_SAFETY);
        return { render_revision: 'controlled-render-v1', render_result_ids: ['render-result-1'], render_checksum: CHECKSUM_A, source_theme_unchanged: true, temporary_workspace_cleaned: true, runtime_stopped: true };
      },
      async evaluateD1(input) {
        events.push('d1');
        expect(input.render.render_checksum).toBe(CHECKSUM_A);
        return { status: 'passed', evidence_id: 'd1-evidence-1', evidence_checksum: CHECKSUM_A };
      },
      async evaluateD27(input) {
        events.push('d2.7');
        expect(input.d1.evidence_id).toBe('d1-evidence-1');
        return { status: 'passed', evidence_id: 'd2-7-evidence-1', evidence_checksum: CHECKSUM_B };
      },
      clock: () => NOW
    });
    const result = await runtime.runRenderQa({ flow: flow(), artifact: artifact() });
    expect(events).toEqual(['target', 'render', 'd1', 'd2.7']);
    expect(result).toMatchObject({ status: 'passed', human_review_required: false, d1: { evidence_id: 'd1-evidence-1' }, d2_7: { evidence_id: 'd2-7-evidence-1' } });
    expect(runtime).toMatchObject({
      runtime_kind: 'production_controlled_shopify_render_qa',
      runtime_revision: CONTROLLED_BETA_RUNTIME_REVISION,
      render_target_configuration_revision: CONTROLLED_RENDER_TARGETS_REVISION,
      safety: CONTROLLED_RUNTIME_SAFETY
    });
  });

  it('keeps D1 authoritative while completing policy-required D2.7 when D1 requires review', async () => {
    const events = [];
    const runtime = createControlledMerchantFlowRuntime({
      configuration: configuration(), shopifyService: inspectingService(), clock: () => NOW,
      async renderArtifact() { events.push('render'); return { render_revision: 'controlled-render-v1', render_result_ids: ['render-result-1'], render_checksum: CHECKSUM_A, source_theme_unchanged: true, temporary_workspace_cleaned: true, runtime_stopped: true }; },
      async evaluateD1() { events.push('d1'); return { status: 'review_required', evidence_id: 'd1-evidence-1', evidence_checksum: CHECKSUM_A }; },
      async evaluateD27() { events.push('d2.7'); return { status: 'passed', evidence_id: 'd2-7-evidence-1', evidence_checksum: CHECKSUM_B }; }
    });
    const result = await runtime.runRenderQa({ flow: flow(), artifact: artifact() });
    expect(events).toEqual(['render', 'd1', 'd2.7']);
    expect(result).toMatchObject({ status: 'review_required', human_review_required: true, d2_7: { status: 'passed' } });
  });

  it('resumes a bound D2.7 failure without invoking render or D1 again', async () => {
    const events = [];
    const acceptedRenderQa = {
      status: 'failed', render_revision: 'controlled-render-v1', render_result_ids: ['render-result-1'], render_checksum: CHECKSUM_A,
      source_theme_unchanged: true, temporary_workspace_cleaned: true, runtime_stopped: true,
      d1: { status: 'passed', evidence_id: 'd1-evidence-1', evidence_checksum: CHECKSUM_A },
      d2_7: { status: 'failed', evidence_id: 'd2-7-failure-1', evidence_checksum: CHECKSUM_B },
      d2_7_failure: { classification: { retryable: true, failure_class: 'timeout', category: 'd2_7_provider_timeout' } },
      human_review_required: false
    };
    const runtime = createControlledMerchantFlowRuntime({
      configuration: configuration(),
      shopifyService: { async inspectControlledRenderTarget() { events.push('target'); return authoritativeInspection(); } },
      async renderArtifact() { throw new Error('render must not run during D2.7-only resume'); },
      async evaluateD1() { throw new Error('D1 must not run during D2.7-only resume'); },
      async evaluateD27() { throw new Error('fresh D2.7 must not replace the resume boundary'); },
      async resumeD27(input) {
        events.push('resume-d2.7');
        expect(input.acceptedRenderQa.render_checksum).toBe(CHECKSUM_A);
        expect(input.controlled_runtime.safety).toEqual(CONTROLLED_RUNTIME_SAFETY);
        return { status: 'passed', evidence_id: 'd2-7-evidence-resumed', evidence_checksum: CHECKSUM_B };
      },
      clock: () => NOW
    });
    const control = { execution: { resume_operation_id: 'merchant-flow-resume-operation-test' }, checkpoint: async () => {} };
    const result = await runtime.runRenderQa({ flow: flow({ render_qa: acceptedRenderQa }), artifact: artifact(), control });
    expect(events).toEqual(['target', 'resume-d2.7']);
    expect(result).toMatchObject({ status: 'passed', render_checksum: CHECKSUM_A, d1: { status: 'passed' }, d2_7: { evidence_id: 'd2-7-evidence-resumed' } });
    expect(result.d2_7_failure).toBeUndefined();
  });

  it('fails construction when policy-required D2.7 is absent and rejects unbound evidence', async () => {
    const base = { configuration: configuration(), shopifyService: inspectingService(), renderArtifact: async () => ({}), evaluateD1: async () => ({}) };
    expect(() => createControlledMerchantFlowRuntime(base)).toThrowError(expect.objectContaining({ code: 'controlled_beta_d2_7_provider_unavailable' }));

    const runtime = createControlledMerchantFlowRuntime({
      ...base,
      async renderArtifact() { return { render_revision: 'controlled-render-v1', render_result_ids: ['render-result-1'], render_checksum: CHECKSUM_A, source_theme_unchanged: true, temporary_workspace_cleaned: true, runtime_stopped: true }; },
      async evaluateD27() { return { status: 'passed', evidence_id: 'd2-7-evidence-1', evidence_checksum: CHECKSUM_B }; },
      clock: () => NOW
    });
    await expect(runtime.runRenderQa({ flow: flow(), artifact: artifact() })).rejects.toMatchObject({ code: 'controlled_beta_d1_evidence_invalid' });
  });
});
