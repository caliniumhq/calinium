import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { appBridgeTags, dashboardSecurityHeaders, isLaunchPreviewRequest, renderDashboardShell, viteDashboardIndexTransform } = require('../server/embedded-shell.cjs');
const { cookie } = require('../server/dashboard-api.cjs');
const { verifyEmbeddedSessionToken } = require('../server/shopify/embedded-session.cjs');
const { shopifyRuntimeConfiguration } = require('../server/shopify/runtime-configuration.cjs');

const runtimeEnv = {
  APP_URL: 'https://calinium-dev.example',
  SHOPIFY_API_KEY: 'shopify-client-id',
  SHOPIFY_API_SECRET: 'shopify-session-secret',
  NODE_ENV: 'development'
};

function signedSessionToken(payload, secret = runtimeEnv.SHOPIFY_API_SECRET) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

describe('embedded Shopify dashboard runtime', () => {
  it('uses Shopify CLI credentials and its secure URL without requiring token-encryption configuration', () => {
    const configuration = shopifyRuntimeConfiguration(runtimeEnv, { requireCredentials: false });
    expect(configuration).toMatchObject({
      clientId: 'shopify-client-id',
      clientSecret: 'shopify-session-secret',
      applicationUrl: 'https://calinium-dev.example',
      redirectUri: 'https://calinium-dev.example/api/shopify/oauth/callback'
    });
    expect(configuration.configured).toBe(false);
    expect(configuration.missing).toContain('CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY');
  });

  it('renders only the public App Bridge configuration and frame-safe headers', () => {
    const tags = appBridgeTags(runtimeEnv);
    const document = renderDashboardShell('<head><!-- CALINIUM_APP_BRIDGE --></head><body><div id="root"></div></body>', runtimeEnv);
    expect(tags).toContain('name="shopify-api-key"');
    expect(tags).toContain('https://cdn.shopify.com/shopifycloud/app-bridge.js');
    expect(document).toContain('<div id="root"></div>');
    expect(document).not.toContain(runtimeEnv.SHOPIFY_API_SECRET);
    expect(dashboardSecurityHeaders()['content-security-policy']).toContain('frame-ancestors https://admin.shopify.com https://*.myshopify.com');
  });

  it('keeps the injection marker in a credential-free build for the runtime server', () => {
    const shell = '<head><!-- CALINIUM_APP_BRIDGE --><title>Calinium Dashboard</title></head>';
    expect(renderDashboardShell(shell, {})).toBe(shell);
  });

  it('serves the exact launch-preview route without App Bridge while preserving embedded routes', () => {
    const shell = '<head><!-- CALINIUM_APP_BRIDGE --></head>';
    expect(isLaunchPreviewRequest('/launch-preview')).toBe(true);
    expect(isLaunchPreviewRequest('/launch-preview/?source=local')).toBe(true);
    expect(isLaunchPreviewRequest('/projects/prj_example/design')).toBe(false);
    const publicShell = renderDashboardShell(shell, runtimeEnv, { includeAppBridge: false });
    expect(publicShell).not.toContain('shopify-api-key');
    expect(publicShell).not.toContain('app-bridge.js');
    expect(publicShell).not.toContain('CALINIUM_APP_BRIDGE');
    expect(publicShell).toContain('<title>Calinium — Storefront direction, shaped around your business</title>');
    expect(publicShell).toContain('<meta name="description"');
    expect(renderDashboardShell(shell, runtimeEnv)).toContain('app-bridge.js');
    const prebuiltEmbeddedShell = `<head>${appBridgeTags(runtimeEnv)}<title>Calinium Dashboard</title></head>`;
    const sanitizedPrebuiltShell = renderDashboardShell(prebuiltEmbeddedShell, runtimeEnv, { includeAppBridge: false });
    expect(sanitizedPrebuiltShell).not.toContain('shopify-api-key');
    expect(sanitizedPrebuiltShell).not.toContain('app-bridge.js');
    expect(sanitizedPrebuiltShell).toContain('<meta name="description"');
  });

  it('applies the same App Bridge injection when Vite serves the embedded development shell', () => {
    const transform = viteDashboardIndexTransform(runtimeEnv);
    const transformed = transform('<head><!-- CALINIUM_APP_BRIDGE --></head>', { path: '/projects/prj_example/design' });
    expect(transformed).toContain('shopify-api-key');
    expect(transformed).toContain('app-bridge.js');
    expect(transformed).not.toContain(runtimeEnv.SHOPIFY_API_SECRET);
    const launchPreview = transform('<head><!-- CALINIUM_APP_BRIDGE --></head>', { path: '/launch-preview' });
    expect(launchPreview).not.toContain('shopify-api-key');
    expect(launchPreview).not.toContain('app-bridge.js');
  });

  it('accepts a valid App Bridge session token without retaining it and rejects a forged token', () => {
    const now = 1_800_000_000_000;
    const payload = {
      aud: runtimeEnv.SHOPIFY_API_KEY,
      dest: 'https://fixture.myshopify.com',
      exp: Math.floor(now / 1000) + 60,
      iss: 'https://fixture.myshopify.com/admin',
      sub: 'gid://shopify/User/1'
    };
    const token = signedSessionToken(payload);
    expect(verifyEmbeddedSessionToken(token, { env: runtimeEnv, now: () => now })).toEqual({
      shop_domain: 'fixture.myshopify.com',
      user_id: 'gid://shopify/User/1',
      expires_at: payload.exp
    });
    expect(() => verifyEmbeddedSessionToken(signedSessionToken(payload, 'forged-secret'), { env: runtimeEnv, now: () => now })).toThrow(/session/i);
  });

  it('validates bounded lifetime, audience, issuer, destination, and signature claims without exposing token data', () => {
    const now = 1_800_000_000_000;
    const seconds = Math.floor(now / 1000);
    const base = {
      aud: runtimeEnv.SHOPIFY_API_KEY,
      dest: 'https://fixture.myshopify.com',
      exp: seconds + 60,
      iat: seconds,
      iss: 'https://fixture.myshopify.com/admin',
      nbf: seconds - 1,
      sub: 'gid://shopify/User/1'
    };
    const accepted = verifyEmbeddedSessionToken(signedSessionToken(base), { env: runtimeEnv, now: () => now });
    expect(accepted).toMatchObject({ shop_domain: 'fixture.myshopify.com', expires_at: seconds + 60 });
    expect(accepted).not.toHaveProperty('token');
    expect(() => verifyEmbeddedSessionToken(signedSessionToken({ ...base, aud: 'other-app' }), { env: runtimeEnv, now: () => now }))
      .toThrowError(expect.objectContaining({ code: 'shopify_embedded_session_invalid' }));
    expect(() => verifyEmbeddedSessionToken(signedSessionToken({ ...base, iss: 'https://other.myshopify.com/admin' }), { env: runtimeEnv, now: () => now }))
      .toThrowError(expect.objectContaining({ code: 'shopify_embedded_session_invalid' }));
    expect(() => verifyEmbeddedSessionToken(signedSessionToken({ ...base, nbf: seconds + 11 }), { env: runtimeEnv, now: () => now }))
      .toThrowError(expect.objectContaining({ code: 'shopify_embedded_session_invalid' }));
    expect(() => verifyEmbeddedSessionToken(signedSessionToken({ ...base, exp: seconds - 11 }), { env: runtimeEnv, now: () => now }))
      .toThrowError(expect.objectContaining({ code: 'shopify_embedded_session_expired' }));
    expect(() => verifyEmbeddedSessionToken(signedSessionToken(base, 'wrong-app-secret'), { env: runtimeEnv, now: () => now }))
      .toThrowError(expect.objectContaining({ code: 'shopify_embedded_session_invalid' }));
  });

  it('uses partitioned secure cookies only for an embedded CLI application', () => {
    const embedded = cookie('session', 'value', { httpOnly: true, env: runtimeEnv });
    const standalone = cookie('session', 'value', { httpOnly: true, env: { NODE_ENV: 'development' } });
    expect(embedded).toContain('SameSite=None');
    expect(embedded).toContain('Secure');
    expect(embedded).toContain('Partitioned');
    expect(standalone).toContain('SameSite=Lax');
    expect(standalone).not.toContain('Partitioned');
  });
});
