'use strict';

const crypto = require('crypto');
const { createOpaqueToken, hashToken } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { shopifyRuntimeConfiguration } = require('./runtime-configuration.cjs');

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function normalizeShopDomain(value) {
  let candidate = String(value || '').trim().toLowerCase();
  if (!candidate) throw new DashboardError('shop_domain_required', 'Enter your Shopify store address to continue.', 422);
  if (!/^https?:\/\//.test(candidate)) candidate = `https://${candidate}`;
  let parsed;
  try { parsed = new URL(candidate); } catch { throw new DashboardError('shop_domain_invalid', 'Enter a valid Shopify store address.', 422); }
  const host = parsed.hostname.toLowerCase();
  assert(parsed.username === '' && parsed.password === '' && parsed.port === '' && /^([a-z0-9][a-z0-9-]{0,61}[a-z0-9])\.myshopify\.com$/.test(host), 'shop_domain_invalid', 'Enter the secure myshopify.com address for this Shopify store.', 422);
  return host;
}

function oauthConfiguration(env = process.env) {
  const config = shopifyRuntimeConfiguration(env, { requireCredentials: true });
  return { clientId: config.clientId, clientSecret: config.clientSecret, redirectUri: config.redirectUri, managedInstallation: config.managedInstallation };
}

function createOAuthState() {
  const nonce = createOpaqueToken(24);
  const state = `${createOpaqueToken(32)}.${nonce}`;
  return { state, nonce, state_hash: hashToken(state), nonce_hash: hashToken(nonce) };
}

function verifyStateNonce(state, record) {
  const [opaque, nonce, ...rest] = String(state || '').split('.');
  const valid = opaque && nonce && rest.length === 0 && hashToken(state) === record.state_hash && hashToken(nonce) === record.nonce_hash;
  if (!valid) throw new DashboardError('shopify_oauth_state_invalid', 'This Shopify connection link is no longer valid. Start again from your project.', 403);
}

function oauthAuthorizationUrl({ shopDomain, clientId, redirectUri, scopes, state, managedInstallation = true }) {
  const url = new URL(`https://${shopDomain}/admin/oauth/authorize`);
  url.searchParams.set('client_id', clientId);
  // Shopify-managed installation owns the declared app scopes. The legacy
  // per-request scope parameter remains available only for explicitly legacy
  // app configurations, never for Calinium's shipped configuration.
  if (!managedInstallation) url.searchParams.set('scope', scopes.join(','));
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

function embeddedAdminAppUrl({ host, clientId, shopDomain, projectId }) {
  const encodedHost = String(host || '').trim();
  if (!encodedHost || !/^[A-Za-z0-9_-]+$/.test(encodedHost)) return null;
  let decodedHost;
  try { decodedHost = Buffer.from(encodedHost, 'base64url').toString('utf8'); }
  catch { return null; }

  let adminUrl;
  try { adminUrl = new URL(`https://${decodedHost}`); }
  catch { return null; }

  const storeHandle = String(shopDomain || '').replace(/\.myshopify\.com$/i, '');
  const expectedPath = `/store/${storeHandle}`;
  if (adminUrl.hostname !== 'admin.shopify.com' || adminUrl.pathname.replace(/\/$/, '') !== expectedPath) return null;

  const appUrl = new URL(`${adminUrl.origin}${expectedPath}/apps/${encodeURIComponent(String(clientId || ''))}/`);
  appUrl.searchParams.set('project', String(projectId));
  appUrl.searchParams.set('shopify', 'connected');
  return appUrl.toString();
}

// Billing confirmations leave Shopify's approval screen at the app's public
// return URL. Redirecting that request back into Shopify Admin is the only
// safe way to restore App Bridge and obtain a fresh embedded session token.
// These values are all server-derived from an existing order and connection;
// no browser-provided host is used to construct the destination.
function embeddedAdminBillingReturnUrl({ clientId, shopDomain, projectId, orderId }) {
  const storeHandle = String(shopDomain || '').replace(/\.myshopify\.com$/i, '');
  if (!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i.test(storeHandle)) return null;
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(String(clientId || ''))) return null;
  if (!/^prj_[A-Za-z0-9-]+$/.test(String(projectId || ''))) return null;
  if (!/^cto_[A-Za-z0-9-]+$/.test(String(orderId || ''))) return null;
  const appUrl = new URL(`https://admin.shopify.com/store/${encodeURIComponent(storeHandle)}/apps/${encodeURIComponent(String(clientId))}/`);
  appUrl.searchParams.set('project', String(projectId));
  appUrl.searchParams.set('calinium_order', String(orderId));
  appUrl.searchParams.set('calinium_billing', 'return');
  return appUrl.toString();
}

function canonicalCallbackQuery(parameters) {
  return [...parameters.entries()]
    .filter(([key]) => key !== 'hmac' && key !== 'signature')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function verifyShopifyHmac(parameters, clientSecret) {
  const received = String(parameters.get('hmac') || '');
  if (!/^[a-f0-9]{64}$/i.test(received)) throw new DashboardError('shopify_oauth_hmac_invalid', 'Shopify could not verify this connection request. Start again from your project.', 403);
  const expected = crypto.createHmac('sha256', clientSecret).update(canonicalCallbackQuery(parameters)).digest('hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) throw new DashboardError('shopify_oauth_hmac_invalid', 'Shopify could not verify this connection request. Start again from your project.', 403);
}

function validateCallbackTimestamp(value, now = Date.now()) {
  const seconds = Number(value);
  const timestamp = Number.isFinite(seconds) ? seconds * 1000 : NaN;
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > OAUTH_STATE_TTL_MS) throw new DashboardError('shopify_oauth_expired', 'This Shopify connection request has expired. Start again from your project.', 403);
}

module.exports = { OAUTH_STATE_TTL_MS, normalizeShopDomain, oauthConfiguration, createOAuthState, verifyStateNonce, oauthAuthorizationUrl, embeddedAdminAppUrl, embeddedAdminBillingReturnUrl, canonicalCallbackQuery, verifyShopifyHmac, validateCallbackTimestamp };
