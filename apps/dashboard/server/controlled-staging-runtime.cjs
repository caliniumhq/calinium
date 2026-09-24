'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { DashboardError, assert } = require('./lib/errors.cjs');
const { allowedShopDomains, dashboardSessionSecret, shopifyRuntimeConfiguration } = require('./shopify/runtime-configuration.cjs');
const { DISCOVERY_SCOPES } = require('./shopify/constants.cjs');
const {
  SHOPIFY_CLI_RUNTIME_REVISION,
  PINNED_SHOPIFY_CLI_VERSION,
  createShopifyCliRuntime
} = require('../../../ai/storefront-render/shopify-cli-runtime');
const { SHOPIFY_CLI_RUNTIME_STATE_REVISION, resolveShopifyCliRuntimeStateRoot } = require('../../../ai/storefront-render/shopify-cli-runtime-state');
const { withoutShopifyStorefrontPassword } = require('../../../ai/storefront-render/shopify-storefront-password-binding');

const STAGING_VALIDATION_PAYMENT_PROVIDER = 'staging_validation_no_charge';

function text(env, key) { return String(env?.[key] || '').trim(); }
function configured(value) {
  const normalized = String(value || '').trim();
  return normalized && !/^(replace|change|example|placeholder|secret)/i.test(normalized);
}
function inside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
function encryptionKeyBytes(value) {
  const source = String(value || '').trim();
  if (/^[a-f0-9]{64}$/i.test(source)) return Buffer.from(source, 'hex').length;
  try { return Buffer.from(source, 'base64url').length; } catch { return 0; }
}
function executableAvailable(command) {
  const executable = path.basename(command);
  const result = spawnSync(command, executable === 'zip' || executable === 'unzip' ? ['-v'] : ['--version'], {
    encoding: 'utf8',
    timeout: 15000,
    env: { ...withoutShopifyStorefrontPassword(process.env), CI: '1' }
  });
  return !result.error && result.status === 0;
}
function requireWritableDirectory(directory, label) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o750 });
  try { fs.accessSync(directory, fs.constants.R_OK | fs.constants.W_OK); }
  catch { throw new DashboardError('staging_persistence_unavailable', `${label} is not readable and writable.`, 503); }
}
function controlledStagingConfiguration(env = process.env) {
  const applicationUrl = text(env, 'CALINIUM_APPLICATION_URL').replace(/\/$/, '');
  const clientId = text(env, 'CALINIUM_STAGING_APP_CLIENT_ID');
  const canonicalShopDomain = text(env, 'CALINIUM_STAGING_CANONICAL_SHOP_DOMAIN').toLowerCase();
  return Object.freeze({
    appName: text(env, 'CALINIUM_STAGING_APP_NAME'),
    clientId,
    shopDomain: text(env, 'CALINIUM_STAGING_SHOP_DOMAIN').toLowerCase(),
    canonicalShopDomain,
    allowedShopDomains: Object.freeze(canonicalShopDomain ? [canonicalShopDomain] : []),
    applicationUrl,
    oauthRedirectUri: applicationUrl ? `${applicationUrl}/api/shopify/oauth/callback` : '',
    paymentProvider: STAGING_VALIDATION_PAYMENT_PROVIDER
  });
}

function stagingBillingBypassEnabled(env = process.env) {
  if (text(env, 'CALINIUM_STAGING_BILLING_BYPASS_ENABLED') !== 'true') return false;
  if (text(env, 'CALINIUM_ENVIRONMENT') !== 'staging' || text(env, 'NODE_ENV') !== 'production') return false;
  const configuration = controlledStagingConfiguration(env);
  let allowed;
  try { allowed = allowedShopDomains(env); }
  catch { return false; }
  return configured(configuration.appName)
    && /^[a-f0-9]{32}$/i.test(configuration.clientId)
    && text(env, 'CALINIUM_SHOPIFY_CLIENT_ID') === configuration.clientId
    && text(env, 'CALINIUM_PAYMENT_PROVIDER') === configuration.paymentProvider
    && allowed.length === 1
    && allowed[0] === configuration.canonicalShopDomain;
}

function validateControlledStagingRuntime({ env = process.env, root = path.resolve(__dirname, '../../..'), checkFilesystem = false, checkBuild = false, checkExecutables = false } = {}) {
  const configuration = controlledStagingConfiguration(env);
  assert(env.NODE_ENV === 'production', 'staging_node_environment_invalid', 'Controlled staging must run with NODE_ENV=production.', 503);
  assert(env.CALINIUM_ENVIRONMENT === 'staging', 'staging_environment_invalid', 'Controlled staging must use the staging Calinium environment.', 503);
  assert(!env.SHOPIFY_API_KEY && !env.SHOPIFY_API_SECRET && !env.APP_URL && !env.HOST, 'staging_shopify_cli_environment_forbidden', 'Controlled staging cannot use Shopify CLI development credentials or tunnel URLs.', 503);
  assert(configured(configuration.appName), 'staging_app_name_missing', 'The controlled staging application identity is unavailable.', 503);
  assert(/^[a-f0-9]{32}$/i.test(configuration.clientId), 'staging_shopify_client_invalid', 'The controlled staging Shopify client identity is invalid.', 503);
  assert(/^https:\/\/[a-z0-9-]+\.fly\.dev$/i.test(configuration.applicationUrl), 'staging_application_url_invalid', 'Controlled staging requires a stable dedicated Fly application URL.', 503);
  assert(/^([a-z0-9][a-z0-9-]{0,61}[a-z0-9])\.myshopify\.com$/.test(configuration.shopDomain), 'staging_shop_domain_invalid', 'The controlled staging administrative shop identity is invalid.', 503);
  assert(/^([a-z0-9][a-z0-9-]{0,61}[a-z0-9])\.myshopify\.com$/.test(configuration.canonicalShopDomain), 'staging_canonical_shop_domain_invalid', 'The controlled staging canonical shop identity is invalid.', 503);

  const shopify = shopifyRuntimeConfiguration(env, { requireCredentials: true });
  assert(shopify.clientId === configuration.clientId, 'staging_shopify_client_mismatch', 'Controlled staging is linked to the wrong Shopify application.', 503);
  assert(shopify.applicationUrl === configuration.applicationUrl, 'staging_application_url_mismatch', 'Controlled staging must use its dedicated HTTPS application URL.', 503);
  assert(shopify.redirectUri === configuration.oauthRedirectUri, 'staging_oauth_redirect_mismatch', 'Controlled staging has an invalid Shopify OAuth callback URL.', 503);
  assert(shopify.managedInstallation, 'staging_managed_installation_required', 'Controlled staging requires Shopify-managed installation scopes.', 503);
  assert(shopify.scopes.join(',') === DISCOVERY_SCOPES.join(',') && !shopify.scopes.includes('write_themes'), 'staging_shopify_scope_invalid', 'Controlled staging must remain read-only.', 503);
  assert(configured(env.CALINIUM_SHOPIFY_CLIENT_SECRET) && String(env.CALINIUM_SHOPIFY_CLIENT_SECRET).length >= 24, 'staging_shopify_secret_missing', 'The staging Shopify client secret is unavailable.', 503);

  const sessionSecret = dashboardSessionSecret(env, { required: true });
  const encryptionKey = text(env, 'CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY');
  assert(encryptionKeyBytes(encryptionKey) === 32, 'staging_encryption_key_invalid', 'The staging token encryption key must contain exactly 32 bytes.', 503);
  assert(configured(env.CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY_ID) && !/(development|local|test)/i.test(env.CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY_ID), 'staging_encryption_key_id_invalid', 'The staging token encryption key ID is not configured safely.', 503);
  assert(sessionSecret !== env.CALINIUM_SHOPIFY_CLIENT_SECRET && sessionSecret !== encryptionKey && env.CALINIUM_SHOPIFY_CLIENT_SECRET !== encryptionKey, 'staging_secret_reuse_forbidden', 'Staging authentication and encryption secrets must be separate.', 503);

  assert(env.CALINIUM_EMBEDDED_APP === 'true', 'staging_embedded_app_required', 'Controlled staging must run as an embedded Shopify app.', 503);
  const allowed = allowedShopDomains(env);
  assert(allowed.length === 1 && allowed[0] === configuration.canonicalShopDomain, 'staging_shop_allowlist_invalid', 'Controlled staging must allow exactly its canonical Shopify shop.', 503);
  assert(env.CALINIUM_PAYMENT_PROVIDER === configuration.paymentProvider && stagingBillingBypassEnabled(env), 'staging_payment_provider_invalid', 'Controlled staging requires the restricted no-charge validation provider.', 503);
  assert(text(env, 'CALINIUM_SHOPIFY_CLI_RUNTIME_REVISION') === SHOPIFY_CLI_RUNTIME_REVISION, 'shopify_cli_runtime_revision_invalid', 'Controlled staging has an invalid Shopify CLI runtime contract.', 503);
  assert(text(env, 'CALINIUM_SHOPIFY_CLI_EXPECTED_VERSION') === PINNED_SHOPIFY_CLI_VERSION, 'shopify_cli_version_mismatch', 'Controlled staging has an invalid Shopify CLI version contract.', 503);
  assert(text(env, 'CALINIUM_SHOPIFY_CLI_AUTOUPGRADE_POLICY') === 'disabled', 'shopify_cli_autoupgrade_policy_invalid', 'Controlled staging must disable Shopify CLI automatic upgrades.', 503);
  assert(text(env, 'CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_REVISION') === SHOPIFY_CLI_RUNTIME_STATE_REVISION, 'shopify_cli_runtime_state_revision_invalid', 'Controlled staging has an invalid Shopify CLI runtime-state contract.', 503);
  assert(/^\d+$/.test(text(env, 'CALINIUM_SHOPIFY_MAIN_THEME_ID')), 'shopify_cli_main_theme_authority_invalid', 'Controlled staging requires an explicit numeric Shopify MAIN-theme authority.', 503);

  assert((env.CALINIUM_STORAGE_DRIVER || 'sqlite') === 'sqlite', 'staging_storage_driver_invalid', 'Controlled staging currently requires its dedicated SQLite database.', 503);
  const persistentRoot = path.resolve(text(env, 'CALINIUM_PERSISTENT_ROOT'));
  const databaseFile = path.resolve(text(env, 'CALINIUM_SQLITE_PATH'));
  const assetRoot = path.resolve(text(env, 'CALINIUM_ASSET_STORAGE_PATH'));
  let cliRuntimeStateRoot = null;
  try { cliRuntimeStateRoot = resolveShopifyCliRuntimeStateRoot({ root, env }).state_root; }
  catch { assert(false, 'shopify_cli_runtime_state_root_invalid', 'Controlled staging requires a bounded Shopify CLI runtime-state directory.', 503); }
  const expectedOutputRoot = path.resolve(root, 'output');
  assert(path.isAbsolute(text(env, 'CALINIUM_PERSISTENT_ROOT')) && persistentRoot === expectedOutputRoot, 'staging_persistent_root_invalid', 'The staging persistent disk must be mounted at the generation output root.', 503);
  assert(path.isAbsolute(text(env, 'CALINIUM_SQLITE_PATH')) && inside(persistentRoot, databaseFile), 'staging_database_path_invalid', 'The staging database must be stored on its persistent disk.', 503);
  assert(path.isAbsolute(text(env, 'CALINIUM_ASSET_STORAGE_PATH')) && inside(persistentRoot, assetRoot), 'staging_asset_path_invalid', 'Staging assets must be stored on its persistent disk.', 503);
  assert(cliRuntimeStateRoot && inside(persistentRoot, cliRuntimeStateRoot) && cliRuntimeStateRoot !== persistentRoot, 'shopify_cli_runtime_state_root_invalid', 'Controlled staging requires a dedicated Shopify CLI runtime-state directory.', 503);

  if (checkFilesystem) {
    requireWritableDirectory(persistentRoot, 'The staging persistent disk');
    requireWritableDirectory(path.dirname(databaseFile), 'The staging database directory');
    requireWritableDirectory(assetRoot, 'The staging asset directory');
  }
  if (checkBuild) assert(fs.existsSync(path.join(root, 'apps', 'dashboard', 'dist', 'index.html')), 'staging_dashboard_build_missing', 'The hosted dashboard build is unavailable.', 503);
  if (checkExecutables) {
    for (const command of ['zip', 'unzip']) {
      assert(executableAvailable(command), 'staging_runtime_dependency_missing', `Required staging runtime executable ${path.basename(command)} is unavailable.`, 503);
    }
    try { createShopifyCliRuntime({ root, env }).attestReadiness(); }
    catch (error) {
      assert(false, error.code || 'shopify_cli_version_mismatch', 'Controlled staging Shopify CLI version attestation failed.', 503);
    }
  }
  return {
    environment: 'staging',
    app_name: configuration.appName,
    application_url: configuration.applicationUrl,
    oauth_redirect_uri: configuration.oauthRedirectUri,
    allowed_shop_domains: allowed,
    storage_driver: 'sqlite',
    persistent_root: persistentRoot,
    payment_mode: 'staging_no_charge',
    shopify_cli_runtime_revision: SHOPIFY_CLI_RUNTIME_REVISION,
    shopify_cli_runtime_state_revision: SHOPIFY_CLI_RUNTIME_STATE_REVISION,
    shopify_cli_expected_version: PINNED_SHOPIFY_CLI_VERSION,
    read_only_theme_generation: true
  };
}

module.exports = {
  STAGING_VALIDATION_PAYMENT_PROVIDER,
  controlledStagingConfiguration,
  stagingBillingBypassEnabled,
  executableAvailable,
  validateControlledStagingRuntime
};
