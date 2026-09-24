import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  CONTROLLED_BETA_RUNTIME_REVISION,
  CONTROLLED_RENDER_TARGETS_REVISION,
  APPROVED_D2_7_PROVIDER_REVISION,
  APPROVED_D2_7_MODEL_ID,
  readControlledBetaRuntimeConfiguration
} = require('../server/services/merchant-flow-controlled-runtime-configuration.cjs');
const { controlledBetaReadiness, assertControlledBetaReady } = require('../server/services/merchant-flow-controlled-readiness.cjs');

function enabledEnvironment(overrides = {}) {
  return {
    NODE_ENV: 'production',
    CALINIUM_MERCHANT_FLOW_BETA_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_RUNTIME_REVISION: CONTROLLED_BETA_RUNTIME_REVISION,
    CALINIUM_CONTROLLED_BETA_SOURCE_REVISION: '1000000000000000000000000000000000000004',
    CALINIUM_BUILD_SOURCE_REVISION: '1000000000000000000000000000000000000004',
    CALINIUM_ALLOWED_SHOP_DOMAINS: 'first-beta.myshopify.com,second-beta.myshopify.com',
    CALINIUM_CONTROLLED_BETA_SHOP_DOMAINS: 'FIRST-BETA.MYSHOPIFY.COM, second-beta.myshopify.com',
    CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_REVISION: CONTROLLED_RENDER_TARGETS_REVISION,
    CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_JSON: JSON.stringify([
      { shop_domain: 'first-beta.myshopify.com', theme_id: '1001', expected_theme_role: 'development' },
      { shop_domain: 'second-beta.myshopify.com', theme_id: '1002', expected_theme_role: 'development' }
    ]),
    CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION: 'shopify-storefront-password-requirements-v1',
    CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_JSON: JSON.stringify([
      { shop_domain: 'first-beta.myshopify.com', requirement: 'not_required' },
      { shop_domain: 'second-beta.myshopify.com', requirement: 'not_required' }
    ]),
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
    CALINIUM_CONTROLLED_BETA_OPERATOR_USER_IDS: 'usr_founder_1,usr-operator-2',
    SHOPIFY_CLI_THEME_TOKEN: 'configured-test-theme-token',
    CALINIUM_SHOPIFY_CLI_EXPECTED_VERSION: '4.6.0',
    CALINIUM_SHOPIFY_CLI_RUNTIME_REVISION: 'shopify-cli-runtime-v1',
    CALINIUM_PERSISTENT_ROOT: '/tmp/calinium-controlled-beta',
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_REVISION: 'shopify-cli-runtime-state-v1',
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_ROOT: '/tmp/calinium-controlled-beta/shopify-cli-runtime-state',
    CALINIUM_SHOPIFY_CLI_AUTOUPGRADE_POLICY: 'disabled',
    OPENAI_API_KEY: 'configured-test-provider-credential',
    ...overrides
  };
}

function readyProbes(overrides = {}) {
  return {
    source_attestation: { ready: true, revision: '1000000000000000000000000000000000000004' },
    database: true,
    artifact_storage: true,
    durable_job_storage: true,
    generation_worker: true,
    render_qa_worker: true,
    shopify_cli_runtime: true,
    shopify_cli_runtime_state: true,
    controlled_shopify_target: true,
    d1: true,
    d2_7_provider: true,
    operator_authorization: true,
    telemetry: true,
    ...overrides
  };
}

describe('Controlled beta runtime configuration', () => {
  it('keeps the controlled beta disabled without evaluating optional runtime configuration', () => {
    const configuration = readControlledBetaRuntimeConfiguration({ CALINIUM_MERCHANT_FLOW_BETA_ENABLED: 'false' });
    expect(configuration.enabled).toBe(false);
    expect(configuration.controlled_shop_domains).toEqual([]);
    expect(configuration.safety).toMatchObject({ fixture_fallback_allowed: false, automatic_repair_allowed: false, shopify_write_allowed: false });
  });

  it('normalizes the controlled allowlist and builds an exact versioned target mapping', () => {
    const configuration = readControlledBetaRuntimeConfiguration(enabledEnvironment());
    expect(configuration.validation).toEqual({ valid: true, reason_codes: [] });
    expect(configuration.controlled_shop_domains).toEqual(['first-beta.myshopify.com', 'second-beta.myshopify.com']);
    expect(configuration.render_targets).toEqual([
      { shop_domain: 'first-beta.myshopify.com', theme_id: '1001', theme_gid: 'gid://shopify/OnlineStoreTheme/1001', expected_theme_role: 'development' },
      { shop_domain: 'second-beta.myshopify.com', theme_id: '1002', theme_gid: 'gid://shopify/OnlineStoreTheme/1002', expected_theme_role: 'development' }
    ]);
    expect(configuration.d2_7).toMatchObject({ required: true, provider_revision: APPROVED_D2_7_PROVIDER_REVISION, model_id: APPROVED_D2_7_MODEL_ID, credential_configured: true });
    expect(configuration.operator_roles).toEqual(['administrator', 'owner']);
    expect(configuration.operator_user_ids).toEqual(['usr-operator-2', 'usr_founder_1']);
    expect(JSON.stringify(configuration)).not.toContain('configured-test-provider-credential');
    expect(JSON.stringify(configuration)).not.toContain('configured-test-theme-token');
  });

  it('rejects an empty, duplicate, or non-subset controlled shop allowlist', () => {
    for (const controlledDomains of ['', 'first-beta.myshopify.com,FIRST-BETA.MYSHOPIFY.COM', 'outside-beta.myshopify.com']) {
      expect(() => readControlledBetaRuntimeConfiguration(enabledEnvironment({ CALINIUM_CONTROLLED_BETA_SHOP_DOMAINS: controlledDomains })))
        .toThrowError(expect.objectContaining({ code: 'controlled_beta_runtime_configuration_invalid' }));
    }
  });

  it('rejects any target mapping that is not development or is missing a controlled shop', () => {
    for (const role of ['main', 'unpublished']) {
      const invalid = JSON.stringify([{ shop_domain: 'first-beta.myshopify.com', theme_id: '1001', expected_theme_role: role }]);
      expect(() => readControlledBetaRuntimeConfiguration(enabledEnvironment({ CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_JSON: invalid })))
        .toThrowError(expect.objectContaining({ code: 'controlled_beta_runtime_configuration_invalid' }));
    }
  });

  it('requires explicit operator users and a deployable Theme Access token in production', () => {
    expect(() => readControlledBetaRuntimeConfiguration(enabledEnvironment({ CALINIUM_CONTROLLED_BETA_OPERATOR_USER_IDS: '' })))
      .toThrowError(expect.objectContaining({ code: 'controlled_beta_runtime_configuration_invalid' }));
    expect(() => readControlledBetaRuntimeConfiguration(enabledEnvironment({ SHOPIFY_CLI_THEME_TOKEN: '', CALINIUM_CONTROLLED_BETA_SHOPIFY_CLI_SESSION_ENABLED: 'true' })))
      .toThrowError(expect.objectContaining({ code: 'controlled_beta_runtime_configuration_invalid' }));
    const local = readControlledBetaRuntimeConfiguration(enabledEnvironment({ NODE_ENV: 'test', SHOPIFY_CLI_THEME_TOKEN: '', CALINIUM_CONTROLLED_BETA_SHOPIFY_CLI_SESSION_ENABLED: 'true' }));
    expect(local.shopify_runtime).toEqual({
      authentication_mode: 'cli_session', credential_configured: true,
      runtime_revision: 'shopify-cli-runtime-v1', expected_version: '4.6.0', autoupgrade_policy: 'disabled',
      runtime_state_revision: 'shopify-cli-runtime-state-v1', runtime_state_configured: true,
      storefront_password: {
        binding_revision: 'shopify-storefront-password-binding-v1',
        requirements_revision: 'shopify-storefront-password-requirements-v1', configured: true,
        status: 'NOT_REQUIRED', reason_code: null,
        requirements: [
          { shop_domain: 'first-beta.myshopify.com', requirement: 'not_required' },
          { shop_domain: 'second-beta.myshopify.com', requirement: 'not_required' }
        ]
      }
    });
    expect(() => readControlledBetaRuntimeConfiguration(enabledEnvironment({ CALINIUM_CONTROLLED_BETA_OPERATOR_USER_IDS: 'user-not-schema-compatible' })))
      .toThrowError(expect.objectContaining({ code: 'controlled_beta_runtime_configuration_invalid' }));
  });

  it('requires a sanitized deployed source revision attestation', async () => {
    const readiness = await controlledBetaReadiness({ env: enabledEnvironment({ CALINIUM_CONTROLLED_BETA_SOURCE_REVISION: 'not-a-revision' }), probes: readyProbes() });
    expect(readiness.status).toBe('NOT_READY');
    expect(readiness.components.source_attestation).toEqual({ ready: false, reason_code: 'controlled_beta_source_revision_invalid' });
    expect(readiness.beta_source_version).toBeNull();
    const mismatched = await controlledBetaReadiness({ env: enabledEnvironment(), probes: readyProbes({ source_attestation: { ready: true, revision: '1111111111111111111111111111111111111111' } }) });
    expect(mismatched.status).toBe('NOT_READY');
    expect(mismatched.components.source_attestation.reason_code).toBe('controlled_beta_source_revision_unverified');
    for (const override of [
      { CALINIUM_BUILD_SOURCE_REVISION: '' },
      { CALINIUM_BUILD_SOURCE_REVISION: '1111111111111111111111111111111111111111' },
      { CALINIUM_BUILD_SOURCE_REVISION: '0000000000000000000000000000000000000000', CALINIUM_CONTROLLED_BETA_SOURCE_REVISION: '0000000000000000000000000000000000000000' }
    ]) {
      const failed = await controlledBetaReadiness({ env: enabledEnvironment(override), probes: readyProbes() });
      expect(failed.status).toBe('NOT_READY');
      expect(failed.components.source_attestation.ready).toBe(false);
    }
  });
});

describe('Controlled beta readiness', () => {
  it('reports READY only when every mandatory dependency succeeds', async () => {
    const readiness = await controlledBetaReadiness({ env: enabledEnvironment(), probes: readyProbes(), clock: () => new Date('2026-08-18T12:00:00.000Z') });
    expect(readiness).toMatchObject({
      beta_feature_flag_status: 'enabled',
      beta_source_version: '1000000000000000000000000000000000000004',
      status: 'READY',
      reason_codes: [],
      checked_at: '2026-08-18T12:00:00.000Z'
    });
    expect(Object.values(readiness.components).every((entry) => entry.ready)).toBe(true);
    expect(readiness.components.shopify_storefront_password).toEqual({ ready: true, reason_code: null, status: 'NOT_REQUIRED' });
    expect(assertControlledBetaReady(readiness)).toBe(readiness);
  });

  it('projects only sanitized storefront-password readiness and fails closed when requirements are absent', async () => {
    const missing = await controlledBetaReadiness({
      env: enabledEnvironment({
        CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION: '',
        CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_JSON: ''
      }),
      probes: readyProbes()
    });
    expect(missing.status).toBe('NOT_READY');
    expect(missing.components.shopify_storefront_password).toEqual({
      ready: false,
      reason_code: 'shopify_storefront_password_requirements_missing',
      status: 'NOT_READY'
    });
  });

  it('fails closed when the render runtime is unavailable', async () => {
    const readiness = await controlledBetaReadiness({ env: enabledEnvironment(), probes: readyProbes({ render_qa_worker: false }) });
    expect(readiness.status).toBe('NOT_READY');
    expect(readiness.components.render_qa_worker).toEqual({ ready: false, reason_code: 'controlled_beta_render_qa_worker_unavailable' });
    expect(() => assertControlledBetaReady(readiness)).toThrowError(expect.objectContaining({ code: 'controlled_beta_runtime_not_ready' }));
  });

  it('fails closed when Shopify CLI version attestation is unavailable', async () => {
    const readiness = await controlledBetaReadiness({ env: enabledEnvironment(), probes: readyProbes({ shopify_cli_runtime: false }) });
    expect(readiness.status).toBe('NOT_READY');
    expect(readiness.components.shopify_cli_runtime).toEqual({ ready: false, reason_code: 'shopify_cli_version_mismatch' });
  });

  it('fails closed when Shopify CLI runtime state is unavailable', async () => {
    const readiness = await controlledBetaReadiness({ env: enabledEnvironment(), probes: readyProbes({ shopify_cli_runtime_state: false }) });
    expect(readiness.status).toBe('NOT_READY');
    expect(readiness.components.shopify_cli_runtime_state).toEqual({ ready: false, reason_code: 'shopify_cli_runtime_state_unavailable' });
  });

  it('fails closed when policy-required OpenAI credentials are absent', async () => {
    const readiness = await controlledBetaReadiness({ env: enabledEnvironment({ OPENAI_API_KEY: '' }), probes: readyProbes() });
    expect(readiness.status).toBe('NOT_READY');
    expect(readiness.reason_codes).toContain('controlled_beta_d2_7_credential_missing');
    expect(readiness.components.d2_7_provider.ready).toBe(false);
  });

  it('never returns probe errors or credential values', async () => {
    const secretLikeValue = 'private-value-that-must-not-escape';
    const readiness = await controlledBetaReadiness({
      env: enabledEnvironment({ OPENAI_API_KEY: secretLikeValue, SHOPIFY_CLI_THEME_TOKEN: `${secretLikeValue}-shopify` }),
      probes: readyProbes({ database: () => { throw new Error(`${secretLikeValue} at /private/runtime/path`); } })
    });
    const serialized = JSON.stringify(readiness);
    expect(readiness.status).toBe('NOT_READY');
    expect(readiness.components.database.reason_code).toBe('controlled_beta_database_unavailable');
    expect(serialized).not.toContain(secretLikeValue);
    expect(serialized).not.toContain('/private/runtime/path');
  });
});
