'use strict';

const crypto = require('crypto');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { assertShopAllowed, shopifyRuntimeConfiguration } = require('./runtime-configuration.cjs');
const { normalizeShopDomain } = require('./oauth.cjs');

const CLOCK_SKEW_SECONDS = 10;

function decodeBase64Url(value) {
  try { return Buffer.from(String(value), 'base64url').toString('utf8'); }
  catch { throw new DashboardError('shopify_embedded_session_invalid', 'Your Shopify session could not be verified. Refresh the app and try again.', 401); }
}

function parseJson(value) {
  try { return JSON.parse(decodeBase64Url(value)); }
  catch (error) {
    if (error instanceof DashboardError) throw error;
    throw new DashboardError('shopify_embedded_session_invalid', 'Your Shopify session could not be verified. Refresh the app and try again.', 401);
  }
}

function authorizationToken(headers = {}) {
  const value = headers.authorization || headers.Authorization;
  const match = typeof value === 'string' ? value.match(/^Bearer\s+(.+)$/i) : null;
  return match ? match[1].trim() : null;
}

function timingSafeMatch(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyEmbeddedSessionToken(token, { env = process.env, now = () => Date.now() } = {}) {
  const parts = String(token || '').split('.');
  assert(parts.length === 3 && parts.every(Boolean), 'shopify_embedded_session_invalid', 'Your Shopify session could not be verified. Refresh the app and try again.', 401);
  const [encodedHeader, encodedPayload, signature] = parts;
  const header = parseJson(encodedHeader);
  const payload = parseJson(encodedPayload);
  assert(header?.alg === 'HS256', 'shopify_embedded_session_invalid', 'Your Shopify session could not be verified. Refresh the app and try again.', 401);
  // An embedded session proves the Shopify app context. It needs only the
  // client credentials supplied by Shopify CLI; token encryption and OAuth
  // callback settings remain mandatory only when a merchant connects a store.
  const config = shopifyRuntimeConfiguration(env, { requireCredentials: false });
  assert(config.clientId && config.clientSecret, 'shopify_embedded_session_unavailable', 'Your Shopify session could not be verified in this environment. Refresh the app and try again.', 503);
  const expected = crypto.createHmac('sha256', config.clientSecret).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');
  assert(timingSafeMatch(signature, expected), 'shopify_embedded_session_invalid', 'Your Shopify session could not be verified. Refresh the app and try again.', 401);
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  assert(audience.includes(config.clientId), 'shopify_embedded_session_invalid', 'Your Shopify session could not be verified. Refresh the app and try again.', 401);
  const nowSeconds = Math.floor(now() / 1000);
  assert(Number.isFinite(payload.exp) && payload.exp > nowSeconds - CLOCK_SKEW_SECONDS, 'shopify_embedded_session_expired', 'Your Shopify session expired. Refresh the app and try again.', 401);
  assert(!payload.nbf || (Number.isFinite(payload.nbf) && payload.nbf <= nowSeconds + CLOCK_SKEW_SECONDS), 'shopify_embedded_session_invalid', 'Your Shopify session could not be verified. Refresh the app and try again.', 401);
  let destination;
  try { destination = new URL(payload.dest); }
  catch { throw new DashboardError('shopify_embedded_session_invalid', 'Your Shopify session could not be verified. Refresh the app and try again.', 401); }
  const shopDomain = normalizeShopDomain(destination.hostname);
  assertShopAllowed(shopDomain, env);
  assert(destination.protocol === 'https:' && payload.iss === `https://${shopDomain}/admin`, 'shopify_embedded_session_invalid', 'Your Shopify session could not be verified. Refresh the app and try again.', 401);
  return { shop_domain: shopDomain, user_id: typeof payload.sub === 'string' ? payload.sub : null, expires_at: payload.exp };
}

function verifyOptionalEmbeddedSession(request, options = {}) {
  const token = authorizationToken(request.headers || {});
  return token ? verifyEmbeddedSessionToken(token, options) : null;
}

module.exports = { authorizationToken, verifyEmbeddedSessionToken, verifyOptionalEmbeddedSession };
