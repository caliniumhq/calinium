'use strict';

const { DashboardError } = require('../lib/errors.cjs');
const {
  CONTROLLED_BETA_RUNTIME_REVISION,
  CONTROLLED_BETA_READINESS_REVISION,
  readControlledBetaRuntimeConfiguration
} = require('./merchant-flow-controlled-runtime-configuration.cjs');

const COMPONENTS = Object.freeze([
  'configuration',
  'source_attestation',
  'beta_allowlist',
  'database',
  'artifact_storage',
  'durable_job_storage',
  'generation_worker',
  'render_qa_worker',
  'shopify_cli_runtime',
  'shopify_cli_runtime_state',
  'shopify_runtime_credentials',
  'shopify_storefront_password',
  'controlled_shopify_target',
  'd1',
  'd2_7_provider',
  'operator_authorization',
  'telemetry'
]);

const PROBE_REASON_CODES = Object.freeze({
  source_attestation: 'controlled_beta_source_revision_unverified',
  database: 'controlled_beta_database_unavailable',
  artifact_storage: 'controlled_beta_artifact_storage_unavailable',
  durable_job_storage: 'controlled_beta_durable_job_storage_unavailable',
  generation_worker: 'controlled_beta_generation_worker_unavailable',
  render_qa_worker: 'controlled_beta_render_qa_worker_unavailable',
  shopify_cli_runtime: 'shopify_cli_version_mismatch',
  shopify_cli_runtime_state: 'shopify_cli_runtime_state_unavailable',
  controlled_shopify_target: 'controlled_beta_shopify_target_unverified',
  d1: 'controlled_beta_d1_unavailable',
  d2_7_provider: 'controlled_beta_d2_7_provider_unavailable',
  operator_authorization: 'controlled_beta_operator_authorization_unavailable',
  telemetry: 'controlled_beta_telemetry_unavailable'
});

function component(ready, reasonCode = null) {
  return { ready: ready === true, reason_code: ready === true ? null : reasonCode };
}

function storefrontPasswordComponent(configuration) {
  const storefrontPassword = configuration?.shopify_runtime?.storefront_password || {};
  const status = ['READY', 'NOT_READY', 'NOT_REQUIRED'].includes(storefrontPassword.status)
    ? storefrontPassword.status
    : 'NOT_READY';
  const ready = status === 'READY' || status === 'NOT_REQUIRED';
  return {
    ready,
    reason_code: ready ? null : storefrontPassword.reason_code || 'shopify_storefront_password_requirement_unknown',
    status
  };
}

function assertNotAborted(signal) {
  if (signal?.aborted) throw Object.assign(new Error('Controlled readiness deep attestation was cancelled.'), { code: 'controlled_beta_deep_attestation_aborted' });
}

async function runProbe(probe, reasonCode, signal = null) {
  assertNotAborted(signal);
  if (typeof probe !== 'function' && typeof probe !== 'boolean' && (!probe || typeof probe !== 'object')) return component(false, reasonCode);
  try {
    const result = typeof probe === 'function' ? await probe({ signal }) : probe;
    assertNotAborted(signal);
    const ready = result === true || result?.ready === true;
    return component(ready, ready ? null : reasonCode);
  } catch (error) {
    assertNotAborted(signal);
    return component(false, reasonCode);
  }
}

async function runSourceAttestationProbe(probe, expectedRevision, signal = null) {
  assertNotAborted(signal);
  try {
    const result = typeof probe === 'function' ? await probe({ signal }) : probe;
    assertNotAborted(signal);
    const revision = typeof result === 'string' ? result : result?.revision;
    const ready = result?.ready !== false && typeof revision === 'string' && revision === expectedRevision;
    return component(ready, PROBE_REASON_CODES.source_attestation);
  } catch (error) {
    assertNotAborted(signal);
    return component(false, PROBE_REASON_CODES.source_attestation);
  }
}

function configurationComponents(configuration) {
  const valid = configuration.enabled === true && configuration.validation.valid === true;
  const allowlistValid = valid
    && configuration.controlled_shop_domains.length > 0
    && configuration.render_targets.length === configuration.controlled_shop_domains.length;
  const shopifyCredentialsReady = valid && configuration.shopify_runtime.credential_configured === true;
  return {
    configuration: component(valid, configuration.enabled ? 'controlled_beta_configuration_invalid' : 'controlled_beta_disabled'),
    beta_allowlist: component(allowlistValid, 'controlled_beta_allowlist_invalid'),
    shopify_runtime_credentials: component(shopifyCredentialsReady, 'controlled_beta_shopify_runtime_credentials_missing'),
    shopify_storefront_password: storefrontPasswordComponent(configuration)
  };
}

async function controlledBetaReadiness({ env = process.env, probes = {}, clock = () => new Date(), signal = null } = {}) {
  assertNotAborted(signal);
  const configuration = readControlledBetaRuntimeConfiguration(env, { strict: false });
  const components = configurationComponents(configuration);
  const canProbe = configuration.enabled === true && configuration.validation.valid === true;
  components.source_attestation = canProbe
    ? await runSourceAttestationProbe(probes.source_attestation, configuration.deployment_source_revision, signal)
    : component(false, configuration.deployment_source_revision ? PROBE_REASON_CODES.source_attestation : 'controlled_beta_source_revision_invalid');

  for (const name of ['database', 'artifact_storage', 'durable_job_storage', 'generation_worker', 'render_qa_worker', 'shopify_cli_runtime', 'shopify_cli_runtime_state', 'controlled_shopify_target', 'd1', 'operator_authorization', 'telemetry']) {
    assertNotAborted(signal);
    components[name] = canProbe
      ? await runProbe(probes[name], PROBE_REASON_CODES[name], signal)
      : component(false, PROBE_REASON_CODES[name]);
  }

  components.d2_7_provider = !configuration.d2_7.required
    ? component(true)
    : canProbe && configuration.d2_7.credential_configured
      ? await runProbe(probes.d2_7_provider, PROBE_REASON_CODES.d2_7_provider, signal)
      : component(false, configuration.d2_7.credential_configured ? PROBE_REASON_CODES.d2_7_provider : 'controlled_beta_d2_7_credential_missing');

  const orderedComponents = Object.fromEntries(COMPONENTS.map((name) => [name, components[name]]));
  const reasonCodes = [
    ...configuration.validation.reason_codes,
    ...Object.values(orderedComponents).filter((entry) => !entry.ready && entry.reason_code).map((entry) => entry.reason_code)
  ];
  const ready = configuration.enabled === true
    && configuration.validation.valid === true
    && Object.values(orderedComponents).every((entry) => entry.ready === true);
  const checkedAt = clock();
  return {
    schema_version: '1.0',
    readiness_revision: CONTROLLED_BETA_READINESS_REVISION,
    beta_source_version: configuration.deployment_source_revision || null,
    runtime_configuration_revision: CONTROLLED_BETA_RUNTIME_REVISION,
    beta_feature_flag_status: configuration.enabled ? 'enabled' : 'disabled',
    status: ready ? 'READY' : 'NOT_READY',
    components: orderedComponents,
    reason_codes: [...new Set(reasonCodes)].sort(),
    checked_at: checkedAt instanceof Date ? checkedAt.toISOString() : new Date(checkedAt).toISOString()
  };
}

function assertControlledBetaReady(readiness) {
  if (readiness?.status !== 'READY') {
    throw new DashboardError(
      'controlled_beta_runtime_not_ready',
      'The controlled beta runtime is not ready.',
      503,
      { reason_codes: Array.isArray(readiness?.reason_codes) ? [...new Set(readiness.reason_codes)].sort() : ['controlled_beta_readiness_missing'] }
    );
  }
  return readiness;
}

module.exports = {
  COMPONENTS,
  PROBE_REASON_CODES,
  storefrontPasswordComponent,
  controlledBetaReadiness,
  assertControlledBetaReady
};
