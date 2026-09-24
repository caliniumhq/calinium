'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { DashboardError, assert } = require('./lib/errors.cjs');
const { allowedShopDomains, dashboardSessionSecret, shopifyRuntimeConfiguration } = require('./shopify/runtime-configuration.cjs');
const { DISCOVERY_SCOPES } = require('./shopify/constants.cjs');
const { withoutShopifyStorefrontPassword } = require('../../../ai/storefront-render/shopify-storefront-password-binding');

const STAGING_VALIDATION_PAYMENT_PROVIDER = 'staging_validation_no_charge';

function text(env, key) { return String(env?.[key] || '').trim(); }
function legacyStagingConfiguration(env = process.env) {
  const applicationUrl = text(env, 'CALINIUM_APPLICATION_URL').replace(/\/$/, '');
  const canonicalShopDomain = text(env, 'CALINIUM_STAGING_CANONICAL_SHOP_DOMAIN').toLowerCase();
  return Object.freeze({
    clientId: text(env, 'CALINIUM_STAGING_APP_CLIENT_ID'),
    shopDomain: text(env, 'CALINIUM_STAGING_SHOP_DOMAIN').toLowerCase(),
    canonicalShopDomain,
    allowedShopDomains: Object.freeze(canonicalShopDomain ? [canonicalShopDomain] : []),
    applicationUrl,
    oauthRedirectUri: applicationUrl ? `${applicationUrl}/api/shopify/oauth/callback` : '',
    paymentProvider: STAGING_VALIDATION_PAYMENT_PROVIDER
  });
}

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

function stagingBillingBypassEnabled(env = process.env) {
  if (String(env.CALINIUM_STAGING_BILLING_BYPASS_ENABLED || '') !== 'true') return false;
  if (String(env.CALINIUM_ENVIRONMENT || '') !== 'staging' || String(env.NODE_ENV || '') !== 'production') return false;
  const clientId = String(env.CALINIUM_SHOPIFY_CLIENT_ID || '').trim();
  const configuration = legacyStagingConfiguration(env);
  let allowed;
  try { allowed = allowedShopDomains(env); }
  catch { return false; }
  return configured(configuration.clientId)
    && clientId === configuration.clientId
    && env.CALINIUM_PAYMENT_PROVIDER === configuration.paymentProvider
    && allowed.length > 0;
}

function validateLegacyExampleStagingRuntime({ env = process.env, root = path.resolve(__dirname, '../../..'), checkFilesystem = false, checkBuild = false, checkExecutables = false } = {}) {
  assert(env.NODE_ENV === 'production', 'staging_node_environment_invalid', 'LEGACY_EXAMPLE staging must run with NODE_ENV=production.', 503);
  assert(env.CALINIUM_ENVIRONMENT === 'staging', 'staging_environment_invalid', 'LEGACY_EXAMPLE staging must use the staging Calinium environment.', 503);
  assert(!env.SHOPIFY_API_KEY && !env.SHOPIFY_API_SECRET && !env.APP_URL && !env.HOST, 'staging_shopify_cli_environment_forbidden', 'LEGACY_EXAMPLE staging cannot use Shopify CLI development credentials or tunnel URLs.', 503);

  const configuration = legacyStagingConfiguration(env);
  assert(configured(configuration.clientId), 'staging_shopify_client_invalid', 'LEGACY_EXAMPLE staging requires an explicit Shopify application identity.', 503);
  assert(/^https:\/\/[a-z0-9-]+\.fly\.dev$/i.test(configuration.applicationUrl), 'staging_application_url_invalid', 'LEGACY_EXAMPLE staging requires an explicit HTTPS application URL.', 503);
  assert(/^([a-z0-9][a-z0-9-]{0,61}[a-z0-9])\.myshopify\.com$/.test(configuration.shopDomain), 'staging_shop_domain_invalid', 'LEGACY_EXAMPLE staging requires an explicit administrative shop identity.', 503);
  assert(/^([a-z0-9][a-z0-9-]{0,61}[a-z0-9])\.myshopify\.com$/.test(configuration.canonicalShopDomain), 'staging_canonical_shop_domain_invalid', 'LEGACY_EXAMPLE staging requires an explicit canonical shop identity.', 503);

  const shopify = shopifyRuntimeConfiguration(env, { requireCredentials: true });
  assert(shopify.clientId === configuration.clientId, 'staging_shopify_client_mismatch', 'LEGACY_EXAMPLE staging is linked to the wrong Shopify application.', 503);
  assert(shopify.applicationUrl === configuration.applicationUrl, 'staging_application_url_mismatch', 'LEGACY_EXAMPLE staging must use its stable HTTPS application URL.', 503);
  assert(shopify.redirectUri === configuration.oauthRedirectUri, 'staging_oauth_redirect_mismatch', 'LEGACY_EXAMPLE staging has an invalid Shopify OAuth callback URL.', 503);
  assert(shopify.managedInstallation, 'staging_managed_installation_required', 'LEGACY_EXAMPLE staging requires Shopify-managed installation scopes.', 503);
  assert(shopify.scopes.join(',') === DISCOVERY_SCOPES.join(',') && !shopify.scopes.includes('write_themes'), 'staging_shopify_scope_invalid', 'LEGACY_EXAMPLE staging must remain read-only.', 503);
  assert(configured(env.CALINIUM_SHOPIFY_CLIENT_SECRET) && String(env.CALINIUM_SHOPIFY_CLIENT_SECRET).length >= 24, 'staging_shopify_secret_missing', 'The staging Shopify client secret is unavailable.', 503);

  const sessionSecret = dashboardSessionSecret(env, { required: true });
  const encryptionKey = String(env.CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY || '').trim();
  assert(encryptionKeyBytes(encryptionKey) === 32, 'staging_encryption_key_invalid', 'The staging token encryption key must contain exactly 32 bytes.', 503);
  assert(configured(env.CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY_ID) && !/(development|local|test)/i.test(env.CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY_ID), 'staging_encryption_key_id_invalid', 'The staging token encryption key ID is not configured safely.', 503);
  assert(sessionSecret !== env.CALINIUM_SHOPIFY_CLIENT_SECRET && sessionSecret !== encryptionKey && env.CALINIUM_SHOPIFY_CLIENT_SECRET !== encryptionKey, 'staging_secret_reuse_forbidden', 'Staging authentication and encryption secrets must be separate.', 503);

  assert(env.CALINIUM_EMBEDDED_APP === 'true', 'staging_embedded_app_required', 'LEGACY_EXAMPLE staging must run as an embedded Shopify app.', 503);
  const allowed = allowedShopDomains(env);
  assert(allowed.length > 0, 'staging_shop_allowlist_invalid', 'Controlled staging requires at least one approved Shopify shop identity.', 503);
  assert(env.CALINIUM_PAYMENT_PROVIDER === configuration.paymentProvider && stagingBillingBypassEnabled(env), 'staging_payment_provider_invalid', 'LEGACY_EXAMPLE staging requires the restricted no-charge validation provider.', 503);

  assert((env.CALINIUM_STORAGE_DRIVER || 'sqlite') === 'sqlite', 'staging_storage_driver_invalid', 'LEGACY_EXAMPLE staging currently requires its dedicated SQLite database.', 503);
  const persistentRoot = path.resolve(String(env.CALINIUM_PERSISTENT_ROOT || ''));
  const databaseFile = path.resolve(String(env.CALINIUM_SQLITE_PATH || ''));
  const assetRoot = path.resolve(String(env.CALINIUM_ASSET_STORAGE_PATH || ''));
  const expectedOutputRoot = path.resolve(root, 'output');
  assert(path.isAbsolute(String(env.CALINIUM_PERSISTENT_ROOT || '')) && persistentRoot === expectedOutputRoot, 'staging_persistent_root_invalid', 'The staging persistent disk must be mounted at the generation output root.', 503);
  assert(path.isAbsolute(String(env.CALINIUM_SQLITE_PATH || '')) && inside(persistentRoot, databaseFile), 'staging_database_path_invalid', 'The staging database must be stored on its persistent disk.', 503);
  assert(path.isAbsolute(String(env.CALINIUM_ASSET_STORAGE_PATH || '')) && inside(persistentRoot, assetRoot), 'staging_asset_path_invalid', 'Staging assets must be stored on its persistent disk.', 503);

  if (checkFilesystem) {
    requireWritableDirectory(persistentRoot, 'The staging persistent disk');
    requireWritableDirectory(path.dirname(databaseFile), 'The staging database directory');
    requireWritableDirectory(assetRoot, 'The staging asset directory');
  }
  if (checkBuild) assert(fs.existsSync(path.join(root, 'apps', 'dashboard', 'dist', 'index.html')), 'staging_dashboard_build_missing', 'The hosted dashboard build is unavailable.', 503);
  if (checkExecutables) {
    for (const command of [env.CALINIUM_SHOPIFY_CLI || 'shopify', 'zip', 'unzip']) {
      assert(executableAvailable(command), 'staging_runtime_dependency_missing', `Required staging runtime executable ${path.basename(command)} is unavailable.`, 503);
    }
  }
  return {
    environment: 'staging',
    application_url: configuration.applicationUrl,
    oauth_redirect_uri: configuration.oauthRedirectUri,
    allowed_shop_domains: allowed,
    storage_driver: 'sqlite',
    persistent_root: persistentRoot,
    payment_mode: 'staging_no_charge',
    read_only_theme_generation: true
  };
}

module.exports = { STAGING_VALIDATION_PAYMENT_PROVIDER, legacyStagingConfiguration, stagingBillingBypassEnabled, validateLegacyExampleStagingRuntime };
