import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardServices } = require('../server/dashboard-services.cjs');
const { createDashboardApiHandler } = require('../server/dashboard-api.cjs');
const { DeterministicShopifyAdapter } = require('../server/shopify/deterministic-shopify-adapter.cjs');
const root = path.resolve(process.cwd(), '../..');
const active = [];

function cookieValue(value) { return value.split(';', 1)[0]; }
function signedEmbeddedSession({ shop = 'fixture.myshopify.com', userId = 'gid://shopify/User/1', expiresAt = Math.floor(Date.now() / 1000) + 60, env }) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ aud: env.SHOPIFY_API_KEY, dest: `https://${shop}`, exp: expiresAt, iss: `https://${shop}/admin`, sub: userId })).toString('base64url');
  const signature = crypto.createHmac('sha256', env.SHOPIFY_API_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}
async function startApi({ env = {}, shopifyAdapter } = {}) {
  const database = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-dashboard-api-')), 'dashboard.sqlite');
  const services = await createDashboardServices({ root, env: { CALINIUM_SQLITE_PATH: database, ...env }, shopifyAdapter });
  const resource = { services, api: createDashboardApiHandler({ services }), base: 'http://dashboard.test' };
  active.push(resource);
  return resource;
}

afterEach(async () => {
  await Promise.all(active.splice(0).map(async ({ services }) => services.close()));
});

async function invoke(api, { method = 'GET', url, headers = {}, body = undefined }) {
  const request = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  Object.assign(request, { method, url, headers, socket: { remoteAddress: '127.0.0.1' } });
  const response = {
    status: null,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    writeHead(status, headers) { this.status = status; this.headers = { ...this.headers, ...(headers || {}) }; },
    end(value = '') { this.body += value; }
  };
  await api(request, response);
  return { status: response.status, headers: response.headers || {}, payload: JSON.parse(response.body) };
}

describe('Dashboard authenticated API', () => {
  it('requires CSRF, creates an account, authenticates it, and creates an organization-scoped project', async () => {
    const { api, base } = await startApi();
    const csrfResponse = await invoke(api, { url: '/api/auth/csrf', headers: { host: 'dashboard.test' } });
    const csrfPayload = csrfResponse.payload;
    const csrfCookie = cookieValue(csrfResponse.headers['set-cookie'][0]);
    const headers = { origin: base, cookie: csrfCookie, 'x-csrf-token': csrfPayload.result.csrf_token, 'content-type': 'application/json' };
    const rejected = await invoke(api, { method: 'POST', url: '/api/auth/sign-up', headers: { host: 'dashboard.test', 'content-type': 'application/json' }, body: {} });
    expect(rejected.status).toBe(403);
    const registered = await invoke(api, { method: 'POST', url: '/api/auth/sign-up', headers: { ...headers, host: 'dashboard.test' }, body: { email: 'api@example.com', password: 'correct-horse-battery-staple', full_name: 'API Merchant', organization_name: 'API Studio' } });
    expect(registered.status).toBe(200);
    const sessionCookie = cookieValue(registered.headers['set-cookie'][0]);
    const sessionHeaders = { ...headers, cookie: `${csrfCookie}; ${sessionCookie}` };
    const me = await invoke(api, { url: '/api/auth/me', headers: { host: 'dashboard.test', cookie: sessionHeaders.cookie } });
    expect(me.payload.result.user.email).toBe('api@example.com');
    const csrfRejectedProject = await invoke(api, {
      method: 'POST', url: '/api/projects',
      headers: { host: 'dashboard.test', origin: base, cookie: sessionHeaders.cookie, 'content-type': 'application/json' },
      body: { name: 'Blocked API Brand', business_name: 'Blocked API Brand Ltd', country: 'US' }
    });
    expect(csrfRejectedProject.status).toBe(403);
    expect(csrfRejectedProject.payload.error.code).toBe('csrf_invalid');
    const project = await invoke(api, { method: 'POST', url: '/api/projects', headers: { ...sessionHeaders, host: 'dashboard.test' }, body: { name: 'API Brand', business_name: 'API Brand Ltd', country: 'US' } });
    expect(project.payload.result.project.name).toBe('API Brand');
    const signOut = await invoke(api, { method: 'POST', url: '/api/auth/sign-out', headers: { ...sessionHeaders, host: 'dashboard.test' }, body: {} });
    expect(signOut.payload.result.signed_out).toBe(true);
    const afterSignOut = await invoke(api, { url: '/api/auth/me', headers: { host: 'dashboard.test', cookie: sessionHeaders.cookie } });
    expect(afterSignOut.status).toBe(401);
  });

  it('keeps Shopify OAuth server-side, requires CSRF, and exposes only a safe authorization URL', async () => {
    const { api, base } = await startApi({
      env: {
        CALINIUM_SHOPIFY_CLIENT_ID: 'test-client-id', CALINIUM_SHOPIFY_CLIENT_SECRET: 'test-client-secret', CALINIUM_APPLICATION_URL: 'https://dashboard.test', CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI: 'https://dashboard.test/api/shopify/oauth/callback', CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString('base64url')
      },
      shopifyAdapter: new DeterministicShopifyAdapter({ scopes: [] })
    });
    const csrf = await invoke(api, { url: '/api/auth/csrf', headers: { host: 'dashboard.test' } });
    const csrfCookie = cookieValue(csrf.headers['set-cookie'][0]);
    const headers = { origin: base, cookie: csrfCookie, 'x-csrf-token': csrf.payload.result.csrf_token, 'content-type': 'application/json', host: 'dashboard.test' };
    const registered = await invoke(api, { method: 'POST', url: '/api/auth/sign-up', headers, body: { email: 'shopify-api@example.com', password: 'correct-horse-battery-staple', full_name: 'Shopify API Merchant', organization_name: 'Shopify API Studio' } });
    const sessionCookie = cookieValue(registered.headers['set-cookie'][0]);
    const sessionHeaders = { ...headers, cookie: `${csrfCookie}; ${sessionCookie}` };
    const project = await invoke(api, { method: 'POST', url: '/api/projects', headers: sessionHeaders, body: { name: 'Shopify project', business_name: 'Shopify project', country: 'US' } });
    const projectId = project.payload.result.project.id;
    const denied = await invoke(api, { method: 'POST', url: `/api/projects/${projectId}/shopify/connections/start`, headers: { host: 'dashboard.test', cookie: sessionHeaders.cookie, 'content-type': 'application/json' }, body: { shop_domain: 'fixture.myshopify.com' } });
    expect(denied.status).toBe(403);
    const started = await invoke(api, { method: 'POST', url: `/api/projects/${projectId}/shopify/connections/start`, headers: sessionHeaders, body: { shop_domain: 'fixture.myshopify.com' } });
    expect(started.status).toBe(200);
    expect(started.payload.result.authorization_url).toContain('fixture.myshopify.com/admin/oauth/authorize');
    expect(JSON.stringify(started.payload)).not.toContain('test-client-secret');
    expect(JSON.stringify(started.payload)).not.toContain('access_token');
  });

  it('signs an embedded Shopify administrator into its shop workspace without exposing credentials or showing password authentication', async () => {
    const runtime = {
      SHOPIFY_API_KEY: 'test-shopify-client', SHOPIFY_API_SECRET: 'test-shopify-secret', APP_URL: 'https://dashboard.test',
      CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 12).toString('base64url'), CALINIUM_DASHBOARD_SESSION_SECRET: 'test-dashboard-session-secret-that-is-long-enough'
    };
    const { api, base } = await startApi({ env: runtime, shopifyAdapter: new DeterministicShopifyAdapter({ scopes: ['read_products', 'read_content', 'read_online_store_navigation', 'read_files', 'read_markets', 'read_themes'] }) });
    const token = signedEmbeddedSession({ env: runtime });
    const embedded = await invoke(api, { method: 'POST', url: '/api/auth/embedded', headers: { host: 'dashboard.test', authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: {} });
    expect(embedded.status).toBe(200);
    expect(embedded.payload.result.embedded).toBe(true);
    expect(embedded.payload.result).toMatchObject({ project_status: 'created', entry_mode: 'start', resume_state: { experience: 'creative_director', stage: 'not_started' } });
    expect(embedded.payload.result.entry_path).toBe(`/projects/${embedded.payload.result.project.id}/design`);
    expect(embedded.payload.result.project.shopify_store_url).toBe('https://fixture.myshopify.com/');
    expect(embedded.payload.result.connection).toBeUndefined();
    expect(embedded.payload.result.user.email).toMatch(/@embedded\.calinium\.invalid$/);
    expect(JSON.stringify(embedded.payload)).not.toContain(token);
    expect(embedded.headers['set-cookie'][0]).toContain('SameSite=None');
    expect(embedded.headers['set-cookie'][0]).toContain('Partitioned');
    const sessionCookie = cookieValue(embedded.headers['set-cookie'][0]);
    const me = await invoke(api, { url: '/api/auth/me', headers: { host: 'dashboard.test', cookie: sessionCookie, authorization: `Bearer ${token}` } });
    expect(me.status).toBe(200);
    const meWithoutCookie = await invoke(api, { url: '/api/auth/me', headers: { host: 'dashboard.test', authorization: `Bearer ${token}` } });
    expect(meWithoutCookie.status).toBe(200);
    const resumed = await invoke(api, { method: 'POST', url: '/api/auth/embedded?shop=forged-store.myshopify.com', headers: { host: 'dashboard.test', authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: {} });
    expect(resumed.payload.result).toMatchObject({ project: { id: embedded.payload.result.project.id }, project_status: 'resumed', shop: { shop_domain: 'fixture.myshopify.com' } });
    const forgedProject = await invoke(api, { url: '/api/projects/prj_forged-project', headers: { host: 'dashboard.test', authorization: `Bearer ${token}` } });
    expect(forgedProject.status).toBe(403);
    expect(forgedProject.payload.error.code).toBe('shopify_project_access_denied');
    const projectWithoutCookieOrCsrf = await invoke(api, {
      method: 'POST',
      url: '/api/projects',
      headers: { host: 'dashboard.test', authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: { name: 'Embedded project', business_name: 'Embedded project', country: 'US', shopify_store_url: 'https://forged-store.myshopify.com' }
    });
    expect(projectWithoutCookieOrCsrf.status).toBe(200);
    expect(projectWithoutCookieOrCsrf.payload.result.project.name).toBe('Embedded project');
    expect(projectWithoutCookieOrCsrf.payload.result.project.shopify_store_url).toBe('https://fixture.myshopify.com/');
    const blockedPassword = await invoke(api, { method: 'POST', url: '/api/auth/sign-in', headers: { host: 'dashboard.test', authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: { email: 'ignored@example.com', password: 'correct-horse-battery-staple' } });
    expect(blockedPassword.status).toBe(409);
    expect(blockedPassword.payload.error.code).toBe('shopify_embedded_login_not_available');
    const otherShopToken = signedEmbeddedSession({ shop: 'other-store.myshopify.com', env: runtime });
    const denied = await invoke(api, { url: '/api/auth/me', headers: { host: 'dashboard.test', cookie: sessionCookie, authorization: `Bearer ${otherShopToken}` } });
    expect(denied.status).toBe(403);
  });

  it('atomically resolves one project when concurrent embedded launch requests arrive after authentication', async () => {
    const runtime = {
      SHOPIFY_API_KEY: 'test-shopify-client', SHOPIFY_API_SECRET: 'test-shopify-secret', APP_URL: 'https://dashboard.test',
      CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 15).toString('base64url'), CALINIUM_DASHBOARD_SESSION_SECRET: 'test-dashboard-session-secret-that-is-long-enough'
    };
    const { api, services } = await startApi({ env: runtime, shopifyAdapter: new DeterministicShopifyAdapter({ scopes: ['read_products', 'read_content', 'read_online_store_navigation', 'read_files', 'read_markets', 'read_themes'] }) });
    const token = signedEmbeddedSession({ env: runtime, userId: 'gid://shopify/User/concurrent' });
    await services.embeddedAuth.bootstrap({ embeddedSession: { shop_domain: 'fixture.myshopify.com', user_id: 'gid://shopify/User/concurrent' }, sessionToken: token });
    const responses = await Promise.all(Array.from({ length: 4 }, () => invoke(api, { method: 'POST', url: '/api/auth/embedded', headers: { host: 'dashboard.test', authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: {} })));
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(new Set(responses.map((response) => response.payload.result.project.id)).size).toBe(1);
    const organizationId = responses[0].payload.result.project.organization_id;
    expect(await services.store.listProjects(organizationId)).toHaveLength(1);
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_orders')).toMatchObject({ count: 0 });
  });

  it('rejects missing, forged, expired, and cross-shop embedded credentials without falling back to a Calinium cookie', async () => {
    const runtime = {
      SHOPIFY_API_KEY: 'test-shopify-client', SHOPIFY_API_SECRET: 'test-shopify-secret', APP_URL: 'https://dashboard.test',
      CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 13).toString('base64url'), CALINIUM_DASHBOARD_SESSION_SECRET: 'test-dashboard-session-secret-that-is-long-enough'
    };
    const { api } = await startApi({ env: runtime, shopifyAdapter: new DeterministicShopifyAdapter({ scopes: ['read_products', 'read_content', 'read_online_store_navigation', 'read_files', 'read_markets', 'read_themes'] }) });
    const token = signedEmbeddedSession({ env: runtime });
    const bootstrap = await invoke(api, { method: 'POST', url: '/api/auth/embedded', headers: { host: 'dashboard.test', authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: {} });
    expect(bootstrap.status).toBe(200);
    const project = await invoke(api, {
      method: 'POST', url: '/api/projects', headers: { host: 'dashboard.test', authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: { name: 'JWT isolation project', business_name: 'JWT isolation project', country: 'US' }
    });
    expect(project.status).toBe(200);

    const missing = await invoke(api, { url: `/api/projects/${project.payload.result.project.id}`, headers: { host: 'dashboard.test' } });
    expect(missing.status).toBe(401);
    expect(missing.payload.error.code).toBe('authentication_required');

    const forged = `${token.slice(0, -1)}${token.at(-1) === 'a' ? 'b' : 'a'}`;
    const invalid = await invoke(api, { url: `/api/projects/${project.payload.result.project.id}`, headers: { host: 'dashboard.test', authorization: `Bearer ${forged}` } });
    expect(invalid.status).toBe(401);
    expect(invalid.payload.error.code).toBe('shopify_embedded_session_invalid');
    expect(invalid.headers['x-shopify-retry-invalid-session-request']).toBeUndefined();

    const expiredToken = signedEmbeddedSession({ env: runtime, expiresAt: Math.floor(Date.now() / 1000) - 61 });
    const expired = await invoke(api, { url: `/api/projects/${project.payload.result.project.id}`, headers: { host: 'dashboard.test', authorization: `Bearer ${expiredToken}` } });
    expect(expired.status).toBe(401);
    expect(expired.payload.error.code).toBe('shopify_embedded_session_expired');
    expect(expired.headers['x-shopify-retry-invalid-session-request']).toBe('1');

    const crossShop = signedEmbeddedSession({ env: runtime, shop: 'other-store.myshopify.com' });
    const crossShopDenied = await invoke(api, { url: `/api/projects/${project.payload.result.project.id}`, headers: { host: 'dashboard.test', authorization: `Bearer ${crossShop}` } });
    expect(crossShopDenied.status).toBe(403);
    expect(crossShopDenied.payload.error.code).toBe('shopify_embedded_identity_invalid');
  });
});
