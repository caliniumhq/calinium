'use strict';

const { DashboardError } = require('../lib/errors.cjs');

const REQUIRED_PRIVACY_TOPICS = Object.freeze(['customers/data_request', 'customers/redact', 'shop/redact']);
const FORBIDDEN_MARKERS = Object.freeze(['staging', 'legacyexample', 'localhost', '127.0.0.1', 'example.', 'replace_with', 'placeholder']);
const SUPPORTED_DATABASE_PROVIDERS = Object.freeze(['fly_mpg', 'neon', 'supabase']);

function value(env, key) { return String(env[key] || '').trim(); }
function present(env, key) { return value(env, key).length > 0; }
function issue(code, field, category = 'missing') { return { code, field, category }; }
function containsForbiddenMarker(input) {
  const normalized = String(input || '').toLowerCase();
  return FORBIDDEN_MARKERS.some((marker) => normalized.includes(marker));
}
function publicCaliniumUrl(input) {
  try {
    const url = new URL(input);
    return url.protocol === 'https:' && (url.hostname === 'calinium.com' || url.hostname.endsWith('.calinium.com')) && !containsForbiddenMarker(url.href);
  } catch { return false; }
}
function securePostgresUrl(input) {
  try {
    const url = new URL(input);
    const sslMode = String(url.searchParams.get('sslmode') || '').toLowerCase();
    return ['postgres:', 'postgresql:'].includes(url.protocol)
      && !url.searchParams.has('ssl')
      && (!sslMode || sslMode === 'verify-full');
  } catch { return false; }
}
function privacyTopics(input) {
  return [...new Set(String(input || '').split(',').map((topic) => topic.trim()).filter(Boolean))].sort();
}

function validatePublicProductionConfiguration(env = process.env, { capabilities = {}, allowProviderHealthPending = false } = {}) {
  const issues = [];
  const requireExact = (key, expected, code) => {
    if (value(env, key) !== expected) issues.push(issue(code, key, present(env, key) ? 'invalid' : 'missing'));
  };
  const requirePresent = (key, code) => {
    if (!present(env, key)) issues.push(issue(code, key));
  };

  requireExact('CALINIUM_ENVIRONMENT', 'production', 'public_environment_identity_invalid');
  requireExact('CALINIUM_DEPLOYMENT_IDENTITY', 'calinium-public-production', 'public_deployment_identity_invalid');
  requireExact('CALINIUM_SHOPIFY_APP_IDENTITY', 'calinium-public', 'public_shopify_app_identity_invalid');
  requireExact('CALINIUM_DATABASE_IDENTITY', 'calinium-public-production', 'public_database_identity_invalid');
  requireExact('CALINIUM_OBJECT_STORAGE_IDENTITY', 'calinium-public-production', 'public_object_storage_identity_invalid');
  requireExact('CALINIUM_SECRET_STORE_IDENTITY', 'calinium-public-production', 'public_secret_store_identity_invalid');
  requireExact('CALINIUM_LOG_ENVIRONMENT', 'public-production', 'public_log_identity_invalid');

  const applicationUrl = value(env, 'CALINIUM_APPLICATION_URL');
  const callbackUrl = value(env, 'CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI');
  if (!publicCaliniumUrl(applicationUrl)) issues.push(issue('public_application_url_invalid', 'CALINIUM_APPLICATION_URL', applicationUrl ? 'invalid' : 'missing'));
  if (!publicCaliniumUrl(callbackUrl)) issues.push(issue('public_oauth_callback_invalid', 'CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI', callbackUrl ? 'invalid' : 'missing'));
  if (publicCaliniumUrl(applicationUrl) && publicCaliniumUrl(callbackUrl)) {
    const app = new URL(applicationUrl); const callback = new URL(callbackUrl);
    if (app.origin !== callback.origin || callback.pathname !== '/api/shopify/oauth/callback') issues.push(issue('public_oauth_callback_boundary_invalid', 'CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI', 'invalid'));
  }

  for (const key of ['CALINIUM_SHOPIFY_CLIENT_ID', 'CALINIUM_SHOPIFY_CLIENT_SECRET', 'CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY']) requirePresent(key, 'public_shopify_credentials_missing');
  if (present(env, 'CALINIUM_STAGING_SHOPIFY_CLIENT_ID') && value(env, 'CALINIUM_SHOPIFY_CLIENT_ID') === value(env, 'CALINIUM_STAGING_SHOPIFY_CLIENT_ID')) {
    issues.push(issue('public_staging_shopify_credentials_forbidden', 'CALINIUM_SHOPIFY_CLIENT_ID', 'staging_inheritance'));
  }
  if (value(env, 'CALINIUM_DASHBOARD_SESSION_SECRET').length < 32) issues.push(issue('public_session_secret_invalid', 'CALINIUM_DASHBOARD_SESSION_SECRET', present(env, 'CALINIUM_DASHBOARD_SESSION_SECRET') ? 'invalid' : 'missing'));

  requireExact('CALINIUM_STORAGE_DRIVER', 'postgres', 'public_database_driver_invalid');
  const databaseUrl = value(env, 'DATABASE_URL');
  if (!securePostgresUrl(databaseUrl) || containsForbiddenMarker(databaseUrl)) issues.push(issue('public_database_url_invalid', 'DATABASE_URL', databaseUrl ? 'invalid' : 'missing'));
  const databaseProvider = value(env, 'CALINIUM_DATABASE_PROVIDER');
  if (!SUPPORTED_DATABASE_PROVIDERS.includes(databaseProvider)) issues.push(issue('public_database_provider_invalid', 'CALINIUM_DATABASE_PROVIDER', databaseProvider ? 'invalid' : 'missing'));
  requireExact('DATABASE_SSL', 'true', 'public_database_tls_required');
  requirePresent('CALINIUM_DATABASE_BACKUP_CONFIGURATION_ID', 'public_database_backup_configuration_missing');
  requirePresent('CALINIUM_DATABASE_RESTORE_CONFIGURATION_ID', 'public_database_restore_configuration_missing');
  const databaseConfigured = value(env, 'CALINIUM_STORAGE_DRIVER') === 'postgres'
    && securePostgresUrl(databaseUrl) && !containsForbiddenMarker(databaseUrl)
    && SUPPORTED_DATABASE_PROVIDERS.includes(databaseProvider)
    && value(env, 'DATABASE_SSL') === 'true'
    && ['CALINIUM_DATABASE_BACKUP_CONFIGURATION_ID', 'CALINIUM_DATABASE_RESTORE_CONFIGURATION_ID']
      .every((key) => present(env, key) && !containsForbiddenMarker(value(env, key)));
  const databaseAcceptance = capabilities.production_database_acceptance || {};
  const databaseAccepted = databaseConfigured
    && databaseAcceptance.contract_version === 'calinium-public-postgres-acceptance-v1'
    && databaseAcceptance.acceptance_revision === 'public-postgres-backup-restore-v1'
    && databaseAcceptance.status === 'READY'
    && databaseAcceptance.provider === databaseProvider
    && databaseAcceptance.clean_bootstrap_verified === true
    && databaseAcceptance.migrations_verified === true
    && databaseAcceptance.transaction_verified === true
    && databaseAcceptance.backup_verified === true
    && databaseAcceptance.restore_verified === true
    && databaseAcceptance.readback_verified === true
    && databaseAcceptance.isolation_verified === true
    && databaseAcceptance.privacy_verified === true
    && /^[a-f0-9]{64}$/.test(String(databaseAcceptance.acceptance_checksum || ''));
  if (!databaseConfigured) issues.push(issue('public_database_provider_not_configured', 'runtime.database', 'missing'));
  else if (!databaseAccepted) issues.push(issue('public_database_provider_not_accepted', 'runtime.database', 'invalid'));

  requireExact('CALINIUM_ASSET_STORAGE_DRIVER', 'object', 'public_asset_storage_driver_invalid');
  requireExact('CALINIUM_ARTIFACT_STORAGE_DRIVER', 'object', 'public_artifact_storage_driver_invalid');
  requireExact('CALINIUM_OBJECT_STORAGE_PROVIDER', 'tigris', 'public_object_storage_provider_invalid');
  requireExact('CALINIUM_OBJECT_STORAGE_ENDPOINT', 'https://t3.storage.dev', 'public_object_storage_endpoint_invalid');
  requireExact('CALINIUM_OBJECT_STORAGE_REGION', 'auto', 'public_object_storage_region_invalid');
  for (const key of [
    'CALINIUM_OBJECT_STORAGE_BUCKET', 'CALINIUM_OBJECT_STORAGE_PREFIX',
    'CALINIUM_OBJECT_STORAGE_BACKUP_CONFIGURATION_ID', 'CALINIUM_OBJECT_STORAGE_LIFECYCLE_POLICY_ID',
    'CALINIUM_OBJECT_STORAGE_RESTORE_POLICY_ID'
  ]) {
    const configured = value(env, key);
    if (!configured || containsForbiddenMarker(configured)) issues.push(issue('public_object_storage_configuration_invalid', key, configured ? 'invalid' : 'missing'));
  }
  for (const key of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']) requirePresent(key, 'public_object_storage_credentials_missing');
  const providerConfigured = value(env, 'CALINIUM_ARTIFACT_STORAGE_DRIVER') === 'object'
    && value(env, 'CALINIUM_OBJECT_STORAGE_PROVIDER') === 'tigris'
    && value(env, 'CALINIUM_OBJECT_STORAGE_ENDPOINT') === 'https://t3.storage.dev'
    && value(env, 'CALINIUM_OBJECT_STORAGE_REGION') === 'auto'
    && ['CALINIUM_OBJECT_STORAGE_BUCKET', 'CALINIUM_OBJECT_STORAGE_PREFIX', 'CALINIUM_OBJECT_STORAGE_BACKUP_CONFIGURATION_ID',
      'CALINIUM_OBJECT_STORAGE_LIFECYCLE_POLICY_ID', 'CALINIUM_OBJECT_STORAGE_RESTORE_POLICY_ID', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
      .every((key) => present(env, key) && !containsForbiddenMarker(value(env, key)));
  const acceptance = capabilities.durable_artifact_storage_acceptance || {};
  const providerHealthy = acceptance.status === 'READY'
    && acceptance.provider === 'tigris'
    && acceptance.acceptance_revision === 'tigris-real-io-restore-v1'
    && acceptance.health_verified === true
    && acceptance.io_verified === true
    && acceptance.restore_verified === true
    && acceptance.lifecycle_verified === true
    && acceptance.immutability_verified === true
    && acceptance.cleanup_verified === true
    && /^[a-f0-9]{64}$/.test(String(acceptance.acceptance_checksum || ''));
  if (!providerConfigured) issues.push(issue('public_artifact_storage_provider_not_configured', 'runtime.artifact_storage', 'missing'));
  else if (!providerHealthy && !allowProviderHealthPending) issues.push(issue('public_artifact_storage_provider_health_unverified', 'runtime.artifact_storage', 'invalid'));

  if (value(env, 'CALINIUM_ALLOWED_SHOP_DOMAINS')) issues.push(issue('public_shop_allowlist_forbidden', 'CALINIUM_ALLOWED_SHOP_DOMAINS', 'staging_inheritance'));
  if (value(env, 'CALINIUM_MERCHANT_FLOW_BETA_ENABLED') !== 'false') issues.push(issue('public_controlled_beta_must_be_disabled', 'CALINIUM_MERCHANT_FLOW_BETA_ENABLED', 'invalid'));
  if (value(env, 'CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_JSON')) issues.push(issue('public_staging_render_targets_forbidden', 'CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_JSON', 'staging_inheritance'));
  requirePresent('CALINIUM_PUBLIC_OPERATOR_USER_IDS', 'public_operator_allowlist_missing');
  requireExact('CALINIUM_PRIVACY_WEBHOOKS_ENABLED', 'true', 'public_privacy_webhooks_disabled');
  if (JSON.stringify(privacyTopics(value(env, 'CALINIUM_PRIVACY_WEBHOOK_TOPICS'))) !== JSON.stringify([...REQUIRED_PRIVACY_TOPICS].sort())) {
    issues.push(issue('public_privacy_webhook_topics_invalid', 'CALINIUM_PRIVACY_WEBHOOK_TOPICS', 'invalid'));
  }

  for (const [key, code] of [
    ['CALINIUM_PRIVACY_POLICY_URL', 'public_privacy_policy_url_invalid'],
    ['CALINIUM_TERMS_URL', 'public_terms_url_invalid'],
    ['CALINIUM_SUPPORT_URL', 'public_support_url_invalid']
  ]) {
    const configured = value(env, key);
    if (!publicCaliniumUrl(configured)) issues.push(issue(code, key, configured ? 'invalid' : 'missing'));
  }

  requireExact('CALINIUM_LOG_DESTINATION', 'structured-stdout', 'public_log_destination_invalid');
  requirePresent('CALINIUM_INCIDENT_CONFIGURATION_ID', 'public_incident_configuration_missing');

  const inspected = Object.entries(env)
    .filter(([key]) => /^(CALINIUM_|DATABASE_URL$|SHOPIFY_API_KEY$)/.test(key))
    .filter(([key]) => !/(SECRET|TOKEN|PASSWORD|KEY$|DATABASE_URL)/.test(key));
  if (inspected.some(([, configured]) => containsForbiddenMarker(configured))) issues.push(issue('public_staging_identity_detected', 'environment', 'staging_inheritance'));

  const themeDelivery = { status: 'CLARIFICATION_REQUIRED', validated: false };
  const founderDecisions = [{ code: 'FOUNDER_DECISION_REQUIRED', subject: 'merchant_data_retention_duration' }];
  const wholeApplicationReady = issues.length === 0
    && themeDelivery.status === 'READY'
    && founderDecisions.length === 0;

  return {
    contract_version: 'calinium-public-production-readiness-v1',
    status: wholeApplicationReady ? 'READY' : 'NOT_READY',
    issues,
    database: {
      implementation_status: 'DATABASE_IMPLEMENTATION_READY',
      provider_status: !databaseConfigured
        ? 'DATABASE_PROVIDER_NOT_CONFIGURED'
        : databaseAccepted ? 'DATABASE_ACCEPTED' : 'DATABASE_CONFIGURED_NOT_ACCEPTED',
      configured: databaseConfigured,
      runtime_capability: databaseAccepted,
      provider: databaseConfigured ? databaseProvider : null,
      acceptance_revision: databaseAccepted ? databaseAcceptance.acceptance_revision : null,
      clean_bootstrap_verified: databaseAccepted,
      migrations_verified: databaseAccepted,
      backup_verified: databaseAccepted,
      restore_verified: databaseAccepted,
      isolation_verified: databaseAccepted
    },
    artifact_storage: {
      implementation_status: 'IMPLEMENTATION_READY',
      provider_status: !providerConfigured ? 'PROVIDER_NOT_CONFIGURED' : providerHealthy ? 'READY' : 'CONFIGURED_UNVERIFIED',
      configured: providerConfigured,
      runtime_capability: providerHealthy,
      acceptance_revision: providerHealthy ? acceptance.acceptance_revision : null,
      health_verified: providerHealthy,
      restore_verified: providerHealthy,
      lifecycle_verified: providerHealthy
    },
    privacy_webhooks: { required_topics: [...REQUIRED_PRIVACY_TOPICS], configured: issues.every((item) => item.code !== 'public_privacy_webhook_topics_invalid' && item.code !== 'public_privacy_webhooks_disabled') },
    theme_delivery: themeDelivery,
    founder_decisions: founderDecisions
  };
}

function assertPublicProductionConfiguration(env = process.env, options = {}) {
  const report = validatePublicProductionConfiguration(env, options);
  if (report.status !== 'READY') throw new DashboardError('public_production_not_ready', 'Public production configuration is incomplete or unsafe.', 503, { issues: report.issues, theme_delivery: report.theme_delivery, founder_decisions: report.founder_decisions });
  return report;
}

module.exports = { REQUIRED_PRIVACY_TOPICS, SUPPORTED_DATABASE_PROVIDERS, validatePublicProductionConfiguration, assertPublicProductionConfiguration, publicCaliniumUrl };
