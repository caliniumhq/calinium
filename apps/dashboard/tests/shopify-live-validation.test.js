import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardServices } = require('../server/dashboard-services.cjs');
const { DeterministicShopifyAdapter } = require('../server/shopify/deterministic-shopify-adapter.cjs');
const { ShopifyAdminApiAdapter, RESOURCE_QUERIES, tokenCredential } = require('../server/shopify/admin-api-adapter.cjs');
const { CredentialEnvelope } = require('../server/shopify/credential-envelope.cjs');
const { verifyWebhookHmac } = require('../server/shopify/webhook-service.cjs');
const { shopifyRuntimeConfiguration } = require('../server/shopify/runtime-configuration.cjs');
const { DISCOVERY_SCOPES } = require('../server/shopify/constants.cjs');
const { normalizeResourceNodes } = require('../server/shopify/resource-normalizer.cjs');

const root = path.resolve(process.cwd(), '../..');
const secret = 'test-shopify-oauth-secret';
const encryptionKey = Buffer.alloc(32, 9).toString('base64url');
function database() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-shopify-live-')), 'dashboard.sqlite'); }
function env(file) { return { CALINIUM_SQLITE_PATH: file, CALINIUM_SHOPIFY_CLIENT_ID: 'test-client', CALINIUM_SHOPIFY_CLIENT_SECRET: secret, CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI: 'https://dashboard.example/api/shopify/oauth/callback', CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: encryptionKey, CALINIUM_APPLICATION_URL: 'https://dashboard.example' }; }
function adapter() { return new DeterministicShopifyAdapter({ scopes: DISCOVERY_SCOPES, resources: { theme: [{ id: 'gid://shopify/OnlineStoreTheme/7', name: 'Preview', role: 'DEVELOPMENT', previewUrl: 'https://fixture.myshopify.com/?preview_theme_id=7', processing: false, processingFailed: false }], product: [], collection: [], menu: [], file: [], market: [] } }); }
async function setup() {
  const file = database(); const services = await createDashboardServices({ root, env: env(file), shopifyAdapter: adapter() });
  const registered = await services.auth.register({ email: `merchant-${crypto.randomUUID()}@example.com`, password: 'correct-horse-battery-staple', fullName: 'Merchant', organizationName: 'Studio', ipAddress: '127.0.0.1' });
  const created = await services.projects.createProject({ userId: registered.user.id, input: { name: 'Project', business_name: 'Project', country: 'GB' } });
  return { services, registered, project: created.project };
}
function signedWebhook(body, topic, id = crypto.randomUUID()) {
  const rawBody = Buffer.from(JSON.stringify(body));
  return { rawBody, headers: { 'x-shopify-hmac-sha256': crypto.createHmac('sha256', secret).update(rawBody).digest('base64'), 'x-shopify-topic': topic, 'x-shopify-webhook-id': id, 'x-shopify-shop-domain': 'fixture.myshopify.com' } };
}
async function connect(services, registered, project) {
  const started = await services.shopify.startConnection({ userId: registered.user.id, projectId: project.id, shopDomain: 'fixture.myshopify.com' });
  const parameters = new URLSearchParams({ shop: 'fixture.myshopify.com', code: 'valid-code', state: new URL(started.authorization_url).searchParams.get('state'), timestamp: String(Math.floor(Date.now() / 1000)) });
  const canonical = [...parameters.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&');
  parameters.set('hmac', crypto.createHmac('sha256', secret).update(canonical).digest('hex'));
  return services.shopify.completeOAuthCallback({ query: parameters });
}

describe('Milestone 14 deterministic Shopify security and lifecycle', () => {
  it('requires secure runtime configuration and preserves a legacy token envelope only for migration', () => {
    expect(() => shopifyRuntimeConfiguration({}, { requireCredentials: true })).toThrow(/configured/i);
    const envelope = new CredentialEnvelope({ key: encryptionKey });
    expect(envelope.decryptCredential(envelope.encrypt('legacy-token'))).toMatchObject({ version: 0, access_token: 'legacy-token' });
    const modern = envelope.decryptCredential(envelope.encryptCredential({ access_token: 'offline-token', refresh_token: 'refresh-token', expires_at: '2026-08-01T00:00:00.000Z' }));
    expect(modern).toMatchObject({ version: 1, access_token: 'offline-token', refresh_token: 'refresh-token' });
    expect(tokenCredential({ access_token: 'token', refresh_token: 'refresh', expires_in: 60 }, 0).expires_at).toBe('1970-01-01T00:01:00.000Z');
  });

  it('refreshes an expiring offline token through the connected shop, not a global endpoint', async () => {
    const requests = [];
    const api = new ShopifyAdminApiAdapter({ fetchImpl: async (url, options) => { requests.push({ url, options }); return new Response(JSON.stringify({ access_token: 'next-token', refresh_token: 'next-refresh', expires_in: 3600, refresh_token_expires_in: 7776000 }), { status: 200 }); } });
    const credential = await api.refreshOfflineToken({ shopDomain: 'fixture.myshopify.com', refreshToken: 'old-refresh', clientId: 'client', clientSecret: 'secret' });
    expect(requests[0].url).toBe('https://fixture.myshopify.com/admin/oauth/access_token');
    expect(requests[0].options.body).toContain('grant_type=refresh_token');
    expect(credential.access_token).toBe('next-token');
  });

  it('uses the current Admin GraphQL product and theme fields without fabricating a preview URL', () => {
    expect(RESOURCE_QUERIES.product).toContain('price }');
    expect(RESOURCE_QUERIES.product).not.toContain('price { amount currencyCode }');
    expect(RESOURCE_QUERIES.theme).not.toContain('previewUrl');
    expect(RESOURCE_QUERIES.file).not.toContain('filename');
  });

  it('does not make a main theme eligible for project approval or a future preview', () => {
    const [theme] = normalizeResourceNodes('connection-1', 'theme', [{ id: 'gid://shopify/OnlineStoreTheme/1', name: 'Live', role: 'MAIN', processing: false, processingFailed: false }]);
    expect(theme.approval_eligible).toBe(false);
    expect(theme.metadata.preview_eligibility).toBe('ineligible-main-theme');
  });

  it('normalizes Shopify Files to merchant-facing labels instead of GraphQL IDs', () => {
    const [file] = normalizeResourceNodes('connection-1', 'file', [{
      id: 'gid://shopify/MediaImage/1', filename: 'aureum-lifestyle.jpg', alt: null,
      createdAt: '2026-07-23T00:00:00Z', updatedAt: '2026-07-23T00:00:00Z',
      preview: { image: { url: 'https://cdn.example/lifestyle.jpg' } }
    }]);
    expect(file.display_title).toBe('aureum-lifestyle.jpg');
    expect(file.metadata.filename).toBe('aureum-lifestyle.jpg');
    expect(file.display_title).not.toContain('gid://');
  });

  it('uses a safe generic label when Shopify omits file naming metadata', () => {
    const [file] = normalizeResourceNodes('connection-1', 'file', [{
      id: 'gid://shopify/MediaImage/2', alt: null,
      createdAt: '2026-07-23T00:00:00Z', updatedAt: '2026-07-23T00:00:00Z',
      preview: { image: { url: 'https://cdn.example/unnamed.jpg', altText: null } }
    }]);
    expect(file.display_title).toBe('Shopify media');
    expect(file.display_title).not.toContain('gid://');
  });

  it('does not expose a Shopify GID when it is returned as malformed file alt text', () => {
    const [file] = normalizeResourceNodes('connection-1', 'file', [{
      id: 'gid://shopify/MediaImage/3', alt: 'gid://shopify/MediaImage/3',
      createdAt: '2026-07-23T00:00:00Z', updatedAt: '2026-07-23T00:00:00Z',
      preview: { image: { url: 'https://cdn.example/malformed.jpg', altText: null } }
    }]);
    expect(file.display_title).toBe('Shopify media');
  });

  it('verifies raw webhook authenticity, accepts a delivery once, and invalidates an uninstalled connection', async () => {
    const { services, registered, project } = await setup();
    const connected = await connect(services, registered, project);
    await services.shopify.synchronize({ userId: registered.user.id, projectId: project.id, connectionId: connected.connection.id });
    const theme = (await services.shopify.listResources({ userId: registered.user.id, projectId: project.id, resourceType: 'theme' })).resources[0].resource;
    await services.shopify.decideResource({ userId: registered.user.id, projectId: project.id, resourceId: theme.id, status: 'approved' });
    const delivery = signedWebhook({}, 'app/uninstalled', 'delivery-uninstall');
    expect(await services.shopify.processWebhook(delivery)).toMatchObject({ accepted: true, duplicate: false });
    expect(await services.shopify.processWebhook(delivery)).toMatchObject({ accepted: true, duplicate: true });
    expect(await services.store.findShopifyCredentialEnvelope(connected.connection.id)).toBeNull();
    expect((await services.store.findShopifyResourceApproval(project.id, theme.id)).approval_status).toBe('unavailable');
    await expect(services.shopify.processWebhook({ ...delivery, headers: { ...delivery.headers, 'x-shopify-webhook-id': 'tampered', 'x-shopify-hmac-sha256': 'invalid' } })).rejects.toMatchObject({ code: 'shopify_webhook_invalid' });
    await services.close();
  });

  it('marks scope changes and deleted themes for review without exposing internal Shopify IDs', async () => {
    const { services, registered, project } = await setup();
    const connected = await connect(services, registered, project);
    await services.shopify.synchronize({ userId: registered.user.id, projectId: project.id, connectionId: connected.connection.id });
    const theme = (await services.shopify.listResources({ userId: registered.user.id, projectId: project.id, resourceType: 'theme' })).resources[0].resource;
    await services.shopify.decideResource({ userId: registered.user.id, projectId: project.id, resourceId: theme.id, status: 'approved' });
    await services.shopify.processWebhook(signedWebhook({ current: ['read_products'] }, 'app/scopes_update', 'delivery-scopes'));
    const state = await services.shopify.projectConnection({ userId: registered.user.id, projectId: project.id });
    expect(state.connection.connection_status).toBe('reauthorization_required');
    expect(JSON.stringify(state)).not.toContain('gid://shopify');
    await services.shopify.processWebhook(signedWebhook({ id: 7 }, 'themes/delete', 'delivery-theme-delete'));
    expect((await services.store.findShopifyResourceApproval(project.id, theme.id)).approval_status).toBe('unavailable');
    await services.close();
  });

  it('reports read-only preview eligibility and never sends a mutation through the deterministic adapter', async () => {
    const { services, registered, project } = await setup();
    const connected = await connect(services, registered, project);
    await services.shopify.synchronize({ userId: registered.user.id, projectId: project.id, connectionId: connected.connection.id });
    const theme = (await services.shopify.listResources({ userId: registered.user.id, projectId: project.id, resourceType: 'theme' })).resources[0].resource;
    expect(await services.shopify.previewEligibility({ userId: registered.user.id, projectId: project.id, resourceId: theme.id })).toMatchObject({ status: 'eligible', read_only: true });
    await services.close();
  });
});

const liveConfigured = Boolean(process.env.CALINIUM_SHOPIFY_INTEGRATION_SHOP_DOMAIN && process.env.CALINIUM_SHOPIFY_INTEGRATION_ACCESS_TOKEN && process.env.CALINIUM_SHOPIFY_INTEGRATION_ALLOW_READ_ONLY === 'true');
describe.skipIf(!liveConfigured)('explicit development-store read-only integration', () => {
  it('reads the authenticated app installation without creating, updating, or publishing Shopify data', async () => {
    const shopDomain = String(process.env.CALINIUM_SHOPIFY_INTEGRATION_SHOP_DOMAIN);
    expect(shopDomain).toMatch(/\.myshopify\.com$/);
    const api = new ShopifyAdminApiAdapter();
    const inspected = await api.inspectConnection({ shopDomain, accessToken: process.env.CALINIUM_SHOPIFY_INTEGRATION_ACCESS_TOKEN });
    expect(inspected.shop.id).toMatch(/^gid:\/\/shopify\/Shop\//);
  });
});
