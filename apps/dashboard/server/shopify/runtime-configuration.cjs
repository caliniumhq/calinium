'use strict';

const { DashboardError, assert } = require('../lib/errors.cjs');
const { API_VERSION, WEBHOOK_API_VERSION, DISCOVERY_SCOPES } = require('./constants.cjs');

const ENVIRONMENTS = new Set(['development', 'staging', 'production', 'test']);

function nonEmpty(env, key) { return String(env[key] || '').trim(); }
function cliApplicationUrl(env) {
  return [nonEmpty(env, 'APP_URL'), nonEmpty(env, 'HOST')].find((value) => /^https:\/\//i.test(value)) || '';
}

function parseUrl(value, code, message) {
  try { return new URL(value); }
  catch { throw new DashboardError(code, message, 503); }
}

function environmentName(env = process.env) {
  const name = nonEmpty(env, 'CALINIUM_ENVIRONMENT') || (env.NODE_ENV === 'production' ? 'production' : 'development');
  assert(ENVIRONMENTS.has(name), 'calinium_environment_invalid', 'The Calinium environment is not configured safely.', 503);
  return name;
}

function allowedShopDomains(env = process.env) {
  const domains = nonEmpty(env, 'CALINIUM_ALLOWED_SHOP_DOMAINS')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  for (const domain of domains) {
    assert(/^([a-z0-9][a-z0-9-]{0,61}[a-z0-9])\.myshopify\.com$/.test(domain), 'shopify_allowed_shop_invalid', 'The Shopify shop allow-list is not configured safely.', 503);
  }
  return [...new Set(domains)];
}

function assertShopAllowed(shopDomain, env = process.env) {
  const domain = String(shopDomain || '').trim().toLowerCase();
  const allowed = allowedShopDomains(env);
  if (allowed.length) assert(allowed.includes(domain), 'shopify_shop_not_allowed', 'This Shopify store is not authorized for this Calinium environment.', 403);
  return domain;
}

function shopifyRuntimeConfiguration(env = process.env, { requireCredentials = false } = {}) {
  const environment = environmentName(env);
  const cliManaged = Boolean(nonEmpty(env, 'SHOPIFY_API_KEY'));
  const clientId = cliManaged ? nonEmpty(env, 'SHOPIFY_API_KEY') : (nonEmpty(env, 'CALINIUM_SHOPIFY_CLIENT_ID') || nonEmpty(env, 'SHOPIFY_API_KEY'));
  const clientSecret = cliManaged ? nonEmpty(env, 'SHOPIFY_API_SECRET') : (nonEmpty(env, 'CALINIUM_SHOPIFY_CLIENT_SECRET') || nonEmpty(env, 'SHOPIFY_API_SECRET'));
  const cliUrl = cliApplicationUrl(env);
  const applicationUrl = cliManaged ? (cliUrl || nonEmpty(env, 'CALINIUM_APPLICATION_URL')) : (nonEmpty(env, 'CALINIUM_APPLICATION_URL') || cliUrl);
  const redirectUri = cliManaged && applicationUrl ? `${applicationUrl.replace(/\/$/, '')}/api/shopify/oauth/callback` : (nonEmpty(env, 'CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI') || (applicationUrl ? `${applicationUrl.replace(/\/$/, '')}/api/shopify/oauth/callback` : ''));
  const apiVersion = nonEmpty(env, 'CALINIUM_SHOPIFY_ADMIN_API_VERSION') || API_VERSION;
  const webhookApiVersion = nonEmpty(env, 'CALINIUM_SHOPIFY_WEBHOOK_API_VERSION') || WEBHOOK_API_VERSION;
  const missing = [
    !clientId && 'CALINIUM_SHOPIFY_CLIENT_ID',
    !clientSecret && 'CALINIUM_SHOPIFY_CLIENT_SECRET',
    !redirectUri && 'CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI',
    !applicationUrl && 'CALINIUM_APPLICATION_URL',
    !nonEmpty(env, 'CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY') && 'CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY'
  ].filter(Boolean);
  if (requireCredentials && missing.length) throw new DashboardError('shopify_oauth_unavailable', 'Shopify connection is not configured in this environment yet.', 503);
  if (redirectUri) {
    const redirect = parseUrl(redirectUri, 'shopify_oauth_unavailable', 'Shopify connection is not configured in this environment yet.');
    assert(redirect.protocol === 'https:' || (environment !== 'production' && redirect.hostname === 'localhost'), 'shopify_oauth_unavailable', 'Shopify connection is not configured in this environment yet.', 503);
  }
  if (applicationUrl) {
    const appUrl = parseUrl(applicationUrl, 'calinium_application_url_invalid', 'The application URL is not configured safely.');
    assert(appUrl.protocol === 'https:' || (environment !== 'production' && appUrl.hostname === 'localhost'), 'calinium_application_url_invalid', 'The application URL is not configured safely.', 503);
  }
  assert(/^20\d{2}-(01|04|07|10)$/.test(apiVersion), 'shopify_api_version_invalid', 'The Shopify API version is not configured safely.', 503);
  assert(/^20\d{2}-(01|04|07|10)$/.test(webhookApiVersion), 'shopify_webhook_version_invalid', 'The Shopify webhook version is not configured safely.', 503);
  return {
    environment,
    clientId: clientId || null,
    clientSecret: clientSecret || null,
    redirectUri: redirectUri || null,
    applicationUrl: applicationUrl || null,
    apiVersion,
    webhookApiVersion,
    scopes: [...DISCOVERY_SCOPES],
    managedInstallation: env.CALINIUM_SHOPIFY_MANAGED_INSTALLATION !== 'false',
    configured: missing.length === 0,
    missing
  };
}

function dashboardSessionSecret(env = process.env, { required = false } = {}) {
  const secret = nonEmpty(env, 'CALINIUM_DASHBOARD_SESSION_SECRET');
  if (required) assert(secret.length >= 32, 'dashboard_session_secret_missing', 'The dashboard session security configuration is unavailable.', 503);
  return secret || null;
}

module.exports = { ENVIRONMENTS, environmentName, allowedShopDomains, assertShopAllowed, shopifyRuntimeConfiguration, dashboardSessionSecret };
