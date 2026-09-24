'use strict';

const path = require('path');
const { DashboardError } = require('../lib/errors.cjs');
const {
  SHOPIFY_CLI_RUNTIME_REVISION,
  PINNED_SHOPIFY_CLI_VERSION
} = require('../../../../ai/storefront-render/shopify-cli-runtime');
const { SHOPIFY_CLI_RUNTIME_STATE_REVISION } = require('../../../../ai/storefront-render/shopify-cli-runtime-state');
const {
  readShopifyStorefrontPasswordRequirements
} = require('../../../../ai/storefront-render/shopify-storefront-password-binding');

const CONTROLLED_BETA_RUNTIME_REVISION = 'merchant-flow-controlled-beta-runtime-v1';
const CONTROLLED_RENDER_TARGETS_REVISION = 'merchant-flow-controlled-render-targets-v1';
const CONTROLLED_BETA_READINESS_REVISION = 'merchant-flow-controlled-beta-readiness-v1';
const APPROVED_D2_7_PROVIDER_REVISION = 'openai-live-design-evaluation-gpt-5-6-sol-v1';
const APPROVED_D2_7_MODEL_ID = 'gpt-5.6-sol';
const NON_LIVE_THEME_ROLES = new Set(['development']);
const OPERATOR_ROLES = new Set(['owner', 'administrator']);
const SHOP_DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/;

const CAPABILITY_FLAGS = Object.freeze({
  persistent_database: 'CALINIUM_CONTROLLED_BETA_PERSISTENT_DATABASE_ENABLED',
  artifact_storage: 'CALINIUM_CONTROLLED_BETA_ARTIFACT_STORAGE_ENABLED',
  durable_job_runner: 'CALINIUM_CONTROLLED_BETA_DURABLE_JOB_RUNNER_ENABLED',
  generation_worker: 'CALINIUM_CONTROLLED_BETA_GENERATION_WORKER_ENABLED',
  render_qa_worker: 'CALINIUM_CONTROLLED_BETA_RENDER_QA_WORKER_ENABLED',
  d1: 'CALINIUM_CONTROLLED_BETA_D1_ENABLED',
  operator_authorization: 'CALINIUM_CONTROLLED_BETA_OPERATOR_AUTH_ENABLED',
  telemetry: 'CALINIUM_CONTROLLED_BETA_TELEMETRY_ENABLED'
});

function text(env, key) { return typeof env?.[key] === 'string' ? env[key].trim() : ''; }
function addIssue(issues, code) { if (!issues.includes(code)) issues.push(code); }

function booleanValue(env, key, issues, { defaultValue = false } = {}) {
  const raw = text(env, key).toLowerCase();
  if (!raw) return defaultValue;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  addIssue(issues, `${key.toLowerCase()}_invalid`);
  return defaultValue;
}

function normalizeShopDomain(value) {
  const domain = String(value || '').trim().toLowerCase();
  return SHOP_DOMAIN_PATTERN.test(domain) ? domain : null;
}

function validSourceRevision(value) {
  return /^[a-f0-9]{40}$/.test(String(value || '')) && !/^0{40}$/.test(String(value));
}

function domainList(value, issues, { emptyCode, invalidCode, duplicateCode }) {
  const domains = [];
  const seen = new Set();
  const values = String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (!values.length) addIssue(issues, emptyCode);
  for (const value of values) {
    const domain = normalizeShopDomain(value);
    if (!domain) { addIssue(issues, invalidCode); continue; }
    if (seen.has(domain)) { addIssue(issues, duplicateCode); continue; }
    seen.add(domain);
    domains.push(domain);
  }
  return domains.sort();
}

function canonicalThemeId(value) {
  const raw = String(value || '').trim();
  const match = /^(?:gid:\/\/shopify\/OnlineStoreTheme\/)?([1-9]\d*)$/.exec(raw);
  return match ? match[1] : null;
}

function renderTargets(value, issues) {
  let parsed;
  try { parsed = JSON.parse(String(value || '')); }
  catch { addIssue(issues, 'controlled_beta_render_targets_json_invalid'); return []; }
  if (!Array.isArray(parsed)) { addIssue(issues, 'controlled_beta_render_targets_json_invalid'); return []; }
  const targets = [];
  const seen = new Set();
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) { addIssue(issues, 'controlled_beta_render_target_invalid'); continue; }
    const shopDomain = normalizeShopDomain(entry.shop_domain);
    const themeId = canonicalThemeId(entry.theme_id);
    const expectedRole = String(entry.expected_theme_role || '').trim().toLowerCase();
    if (!shopDomain || !themeId || !NON_LIVE_THEME_ROLES.has(expectedRole)) {
      addIssue(issues, 'controlled_beta_render_target_invalid');
      continue;
    }
    if (seen.has(shopDomain)) { addIssue(issues, 'controlled_beta_render_target_duplicate'); continue; }
    seen.add(shopDomain);
    targets.push({
      shop_domain: shopDomain,
      theme_id: themeId,
      theme_gid: `gid://shopify/OnlineStoreTheme/${themeId}`,
      expected_theme_role: expectedRole
    });
  }
  return targets.sort((left, right) => left.shop_domain.localeCompare(right.shop_domain));
}

function operatorRoles(value, issues) {
  const roles = [];
  const seen = new Set();
  for (const raw of String(value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)) {
    if (!OPERATOR_ROLES.has(raw)) { addIssue(issues, 'controlled_beta_operator_role_invalid'); continue; }
    if (seen.has(raw)) { addIssue(issues, 'controlled_beta_operator_role_duplicate'); continue; }
    seen.add(raw); roles.push(raw);
  }
  if (!roles.length) addIssue(issues, 'controlled_beta_operator_roles_missing');
  return roles.sort();
}

function operatorUserIds(value, issues) {
  const userIds = [];
  const seen = new Set();
  for (const raw of String(value || '').split(',').map((item) => item.trim()).filter(Boolean)) {
    if (!/^usr[_-].+$/.test(raw)) { addIssue(issues, 'controlled_beta_operator_user_id_invalid'); continue; }
    if (seen.has(raw)) { addIssue(issues, 'controlled_beta_operator_user_id_duplicate'); continue; }
    seen.add(raw); userIds.push(raw);
  }
  if (!userIds.length) addIssue(issues, 'controlled_beta_operator_user_ids_missing');
  return userIds.sort();
}

function configurationError(reasonCodes) {
  return new DashboardError(
    'controlled_beta_runtime_configuration_invalid',
    'The controlled beta runtime is not configured safely.',
    503,
    { reason_codes: [...new Set(reasonCodes)].sort() }
  );
}

function readControlledBetaRuntimeConfiguration(env = process.env, { strict = true } = {}) {
  const issues = [];
  const activationRaw = text(env, 'CALINIUM_MERCHANT_FLOW_BETA_ENABLED').toLowerCase();
  if (activationRaw && !['true', 'false'].includes(activationRaw)) addIssue(issues, 'controlled_beta_feature_flag_invalid');
  const enabled = activationRaw === 'true';

  if (!enabled) {
    const configuration = {
      schema_version: '1.0',
      configuration_revision: text(env, 'CALINIUM_CONTROLLED_BETA_RUNTIME_REVISION') || null,
      readiness_revision: CONTROLLED_BETA_READINESS_REVISION,
      deployment_source_revision: null,
      enabled: false,
      controlled_shop_domains: [],
      render_target_configuration_revision: null,
      render_targets: [],
      capabilities: {},
      d2_7: { required: false, provider_revision: null, model_id: null, credential_configured: false },
      shopify_runtime: {
        authentication_mode: null,
        credential_configured: false,
        runtime_state_revision: null,
        runtime_state_configured: false,
        storefront_password: readShopifyStorefrontPasswordRequirements(env, { shopDomains: [] })
      },
      operator_roles: [],
      operator_user_ids: [],
      safety: {
        fixture_fallback_allowed: false,
        approved_replay_allowed: false,
        automatic_repair_allowed: false,
        shopify_write_allowed: false,
        live_theme_mutation_allowed: false
      },
      validation: { valid: issues.length === 0, reason_codes: issues.sort() }
    };
    if (strict && issues.length) throw configurationError(issues);
    return configuration;
  }

  if (text(env, 'CALINIUM_CONTROLLED_BETA_RUNTIME_REVISION') !== CONTROLLED_BETA_RUNTIME_REVISION) addIssue(issues, 'controlled_beta_runtime_revision_invalid');
  const deploymentSourceRevision = text(env, 'CALINIUM_CONTROLLED_BETA_SOURCE_REVISION').toLowerCase();
  const buildSourceRevision = text(env, 'CALINIUM_BUILD_SOURCE_REVISION').toLowerCase();
  if (!validSourceRevision(deploymentSourceRevision)) addIssue(issues, 'controlled_beta_source_revision_invalid');
  if (!validSourceRevision(buildSourceRevision)) addIssue(issues, 'controlled_beta_build_source_revision_invalid');
  if (validSourceRevision(deploymentSourceRevision) && validSourceRevision(buildSourceRevision) && deploymentSourceRevision !== buildSourceRevision) addIssue(issues, 'controlled_beta_source_revision_mismatch');
  if (text(env, 'CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_REVISION') !== CONTROLLED_RENDER_TARGETS_REVISION) addIssue(issues, 'controlled_beta_render_targets_revision_invalid');

  const environmentDomains = domainList(text(env, 'CALINIUM_ALLOWED_SHOP_DOMAINS'), issues, {
    emptyCode: 'environment_shop_allowlist_missing',
    invalidCode: 'environment_shop_allowlist_invalid',
    duplicateCode: 'environment_shop_allowlist_duplicate'
  });
  const controlledDomains = domainList(text(env, 'CALINIUM_CONTROLLED_BETA_SHOP_DOMAINS'), issues, {
    emptyCode: 'controlled_beta_shop_allowlist_missing',
    invalidCode: 'controlled_beta_shop_allowlist_invalid',
    duplicateCode: 'controlled_beta_shop_allowlist_duplicate'
  });
  const environmentDomainSet = new Set(environmentDomains);
  if (controlledDomains.some((domain) => !environmentDomainSet.has(domain))) addIssue(issues, 'controlled_beta_shop_allowlist_not_subset');

  const targets = renderTargets(text(env, 'CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_JSON'), issues);
  const controlledDomainSet = new Set(controlledDomains);
  if (targets.some((target) => !controlledDomainSet.has(target.shop_domain))) addIssue(issues, 'controlled_beta_render_target_outside_allowlist');
  if (controlledDomains.some((domain) => !targets.some((target) => target.shop_domain === domain))) addIssue(issues, 'controlled_beta_render_target_missing');
  const storefrontPassword = readShopifyStorefrontPasswordRequirements(env, { shopDomains: controlledDomains });

  const capabilities = {};
  for (const [name, key] of Object.entries(CAPABILITY_FLAGS)) {
    capabilities[name] = booleanValue(env, key, issues);
    if (!capabilities[name]) addIssue(issues, `${name}_not_enabled`);
  }

  const d27Required = booleanValue(env, 'CALINIUM_CONTROLLED_BETA_D2_7_REQUIRED', issues);
  const d27ProviderRevision = text(env, 'CALINIUM_CONTROLLED_BETA_D2_7_PROVIDER_REVISION') || null;
  const d27ModelId = text(env, 'CALINIUM_CONTROLLED_BETA_D2_7_MODEL_ID') || null;
  const d27CredentialConfigured = Boolean(text(env, 'OPENAI_API_KEY'));
  if (d27Required && d27ProviderRevision !== APPROVED_D2_7_PROVIDER_REVISION) addIssue(issues, 'controlled_beta_d2_7_provider_revision_invalid');
  if (d27Required && d27ModelId !== APPROVED_D2_7_MODEL_ID) addIssue(issues, 'controlled_beta_d2_7_model_invalid');
  if (d27Required && !d27CredentialConfigured) addIssue(issues, 'controlled_beta_d2_7_credential_missing');

  const productionProcess = text(env, 'NODE_ENV').toLowerCase() === 'production';
  const hasThemeToken = Boolean(text(env, 'SHOPIFY_CLI_THEME_TOKEN'));
  const cliSessionEnabled = booleanValue(env, 'CALINIUM_CONTROLLED_BETA_SHOPIFY_CLI_SESSION_ENABLED', issues);
  if (productionProcess && cliSessionEnabled && !hasThemeToken) addIssue(issues, 'controlled_beta_shopify_interactive_session_forbidden');
  if (!hasThemeToken && !(cliSessionEnabled && !productionProcess)) addIssue(issues, 'controlled_beta_shopify_runtime_credentials_missing');
  const cliRuntimeRevision = text(env, 'CALINIUM_SHOPIFY_CLI_RUNTIME_REVISION') || SHOPIFY_CLI_RUNTIME_REVISION;
  const cliExpectedVersion = text(env, 'CALINIUM_SHOPIFY_CLI_EXPECTED_VERSION') || PINNED_SHOPIFY_CLI_VERSION;
  const cliAutoupgradePolicy = text(env, 'CALINIUM_SHOPIFY_CLI_AUTOUPGRADE_POLICY') || 'disabled';
  const cliRuntimeStateRevision = text(env, 'CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_REVISION');
  const cliRuntimeStateRoot = text(env, 'CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_ROOT');
  if (cliRuntimeRevision !== SHOPIFY_CLI_RUNTIME_REVISION) addIssue(issues, 'shopify_cli_runtime_revision_invalid');
  if (cliExpectedVersion !== PINNED_SHOPIFY_CLI_VERSION) addIssue(issues, 'shopify_cli_expected_version_invalid');
  if (cliAutoupgradePolicy !== 'disabled') addIssue(issues, 'shopify_cli_autoupgrade_policy_invalid');
  if (cliRuntimeStateRevision !== SHOPIFY_CLI_RUNTIME_STATE_REVISION) addIssue(issues, 'shopify_cli_runtime_state_revision_invalid');
  const persistentRoot = text(env, 'CALINIUM_PERSISTENT_ROOT');
  const relativeStateRoot = persistentRoot && cliRuntimeStateRoot && path.isAbsolute(persistentRoot) && path.isAbsolute(cliRuntimeStateRoot)
    ? path.relative(path.resolve(persistentRoot), path.resolve(cliRuntimeStateRoot))
    : null;
  const runtimeStateRootValid = Boolean(relativeStateRoot && !relativeStateRoot.startsWith('..') && !path.isAbsolute(relativeStateRoot));
  if (!runtimeStateRootValid) addIssue(issues, 'shopify_cli_runtime_state_root_invalid');

  const roles = operatorRoles(text(env, 'CALINIUM_CONTROLLED_BETA_OPERATOR_ROLES'), issues);
  const userIds = operatorUserIds(text(env, 'CALINIUM_CONTROLLED_BETA_OPERATOR_USER_IDS'), issues);
  const configuration = {
    schema_version: '1.0',
    configuration_revision: CONTROLLED_BETA_RUNTIME_REVISION,
    readiness_revision: CONTROLLED_BETA_READINESS_REVISION,
    deployment_source_revision: validSourceRevision(deploymentSourceRevision) ? deploymentSourceRevision : null,
    enabled: true,
    controlled_shop_domains: controlledDomains,
    render_target_configuration_revision: CONTROLLED_RENDER_TARGETS_REVISION,
    render_targets: targets,
    capabilities,
    d2_7: {
      required: d27Required,
      provider_revision: d27ProviderRevision,
      model_id: d27ModelId,
      credential_configured: d27CredentialConfigured
    },
    shopify_runtime: {
      authentication_mode: hasThemeToken ? 'theme_access_token' : cliSessionEnabled && !productionProcess ? 'cli_session' : null,
      credential_configured: hasThemeToken || (cliSessionEnabled && !productionProcess),
      runtime_revision: cliRuntimeRevision,
      expected_version: cliExpectedVersion,
      autoupgrade_policy: cliAutoupgradePolicy,
      runtime_state_revision: cliRuntimeStateRevision || null,
      runtime_state_configured: runtimeStateRootValid,
      storefront_password: storefrontPassword
    },
    operator_roles: roles,
    operator_user_ids: userIds,
    safety: {
      fixture_fallback_allowed: false,
      approved_replay_allowed: false,
      automatic_repair_allowed: false,
      shopify_write_allowed: false,
      live_theme_mutation_allowed: false
    },
    validation: { valid: issues.length === 0, reason_codes: issues.sort() }
  };
  if (strict && issues.length) throw configurationError(issues);
  return configuration;
}

function assertControlledBetaRuntimeConfiguration(configuration) {
  const valid = configuration?.enabled === true
    && configuration?.configuration_revision === CONTROLLED_BETA_RUNTIME_REVISION
    && configuration?.render_target_configuration_revision === CONTROLLED_RENDER_TARGETS_REVISION
    && configuration?.validation?.valid === true
    && configuration?.safety?.fixture_fallback_allowed === false
    && configuration?.safety?.approved_replay_allowed === false
    && configuration?.safety?.automatic_repair_allowed === false
    && configuration?.safety?.shopify_write_allowed === false
    && configuration?.safety?.live_theme_mutation_allowed === false;
  if (!valid) throw configurationError(configuration?.validation?.reason_codes || ['controlled_beta_runtime_configuration_invalid']);
  return configuration;
}

module.exports = {
  CONTROLLED_BETA_RUNTIME_REVISION,
  CONTROLLED_RENDER_TARGETS_REVISION,
  CONTROLLED_BETA_READINESS_REVISION,
  APPROVED_D2_7_PROVIDER_REVISION,
  APPROVED_D2_7_MODEL_ID,
  NON_LIVE_THEME_ROLES,
  CAPABILITY_FLAGS,
  normalizeShopDomain,
  validSourceRevision,
  canonicalThemeId,
  readControlledBetaRuntimeConfiguration,
  assertControlledBetaRuntimeConfiguration
};
