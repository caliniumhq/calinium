import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardServices } = require('../server/dashboard-services.cjs');
const { DeterministicShopifyAdapter } = require('../server/shopify/deterministic-shopify-adapter.cjs');
const { ShopifyAdminApiAdapter } = require('../server/shopify/admin-api-adapter.cjs');
const { DISCOVERY_SCOPES } = require('../server/shopify/constants.cjs');
const { embeddedAdminAppUrl } = require('../server/shopify/oauth.cjs');

const root = path.resolve(process.cwd(), '../..');
const password = 'correct-horse-battery-staple';
const oauthSecret = 'test-shopify-oauth-secret';
const encryptionKey = Buffer.alloc(32, 7).toString('base64url');

function testDatabase() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-shopify-')), 'dashboard.sqlite'); }
function clockFactory() { let second = 0; return () => new Date(`2026-07-21T15:20:${String(second++).padStart(2, '0')}.000Z`); }
function environment(database) {
  return {
    CALINIUM_SQLITE_PATH: database,
    CALINIUM_SHOPIFY_CLIENT_ID: 'test-client-id',
    CALINIUM_SHOPIFY_CLIENT_SECRET: oauthSecret,
    CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI: 'https://dashboard.example/api/shopify/oauth/callback',
    CALINIUM_APPLICATION_URL: 'https://dashboard.example',
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: encryptionKey,
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY_ID: 'test-key-v1'
  };
}
function fixtureResources() {
  return {
    product: [{ id: 'gid://shopify/Product/1', title: 'Travel Bag', handle: 'travel-bag', status: 'ACTIVE', updatedAt: '2026-07-20T00:00:00Z', featuredMedia: { preview: { image: { url: 'https://cdn.example/bag.jpg' } } }, variants: { nodes: [{ id: 'gid://shopify/ProductVariant/1', title: 'Default Title', sku: 'BAG-1', availableForSale: true, updatedAt: '2026-07-20T00:00:00Z', price: { amount: '320.00', currencyCode: 'USD' } }] }, media: { nodes: [{ id: 'gid://shopify/MediaImage/1', alt: 'Travel bag', mediaContentType: 'IMAGE', preview: { image: { url: 'https://cdn.example/bag.jpg' } } }] } }],
    collection: [{ id: 'gid://shopify/Collection/1', title: 'Travel', handle: 'travel', updatedAt: '2026-07-20T00:00:00Z', image: { url: 'https://cdn.example/collection.jpg' } }],
    menu: [{ id: 'gid://shopify/Menu/1', title: 'Main menu', handle: 'main-menu', items: [{ id: 'item-1', title: 'Travel', type: 'COLLECTION', url: '/collections/travel', resourceId: 'gid://shopify/Collection/1' }] }],
    file: [{ id: 'gid://shopify/MediaImage/2', alt: 'Campaign', createdAt: '2026-07-20T00:00:00Z', updatedAt: '2026-07-20T00:00:00Z', preview: { image: { url: 'https://cdn.example/campaign.jpg' } } }],
    market: [{ id: 'gid://shopify/Market/1', name: 'International', enabled: true, webPresences: { nodes: [] } }],
    theme: [{ id: 'gid://shopify/OnlineStoreTheme/7', name: 'Calinium review', role: 'DEVELOPMENT', previewUrl: 'https://fixture.myshopify.com/?preview_theme_id=7', updatedAt: '2026-07-20T00:00:00Z' }]
  };
}
function adapter(options = {}) {
  return new DeterministicShopifyAdapter({
    shop: { id: 'gid://shopify/Shop/1', name: 'Fixture Store', myshopify_domain: 'fixture.myshopify.com', primary_domain: 'fixture.myshopify.com', storefront_url: 'https://fixture.myshopify.com' },
    scopes: DISCOVERY_SCOPES,
    resources: fixtureResources(),
    preview: { status: 'ready', remote_theme_gid: 'gid://shopify/OnlineStoreTheme/7', remote_theme_id: '7', theme_name: 'Calinium review', theme_role: 'development', preview_url: 'https://fixture.myshopify.com/?preview_theme_id=7' },
    ...options
  });
}
async function servicesFor(database, shopifyAdapter = adapter()) { return createDashboardServices({ root, env: environment(database), clock: clockFactory(), shopifyAdapter }); }
async function createProject(services, email = 'shopify@example.com') {
  const registered = await services.auth.register({ email, password, fullName: 'Shopify Merchant', organizationName: 'Shopify Studio', ipAddress: '127.0.0.1' });
  const created = await services.projects.createProject({ userId: registered.user.id, input: { name: 'Travel bags', business_name: 'Northline Atelier', country: 'GB' } });
  return { registered, project: created.project };
}
function callbackQuery({ authorizationUrl, code = 'valid-code', shop = 'fixture.myshopify.com', timestamp = '1784647200', host = null }) {
  const state = new URL(authorizationUrl).searchParams.get('state');
  const parameters = new URLSearchParams({ code, shop, state, timestamp });
  if (host) parameters.set('host', host);
  const message = [...parameters.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join('&');
  parameters.set('hmac', crypto.createHmac('sha256', oauthSecret).update(message).digest('hex'));
  return parameters;
}
async function connect(services, actor, project, { purpose = 'discovery' } = {}) {
  const started = await services.shopify.startConnection({ userId: actor.user.id, projectId: project.id, shopDomain: 'fixture.myshopify.com', purpose });
  return services.shopify.completeOAuthCallback({ query: callbackQuery({ authorizationUrl: started.authorization_url }) });
}

describe('Shopify connection and project approval service', () => {
  it('returns an OAuth callback to the validated Shopify Admin app home with project context', () => {
    const host = Buffer.from('admin.shopify.com/store/fixture', 'utf8').toString('base64url');
    expect(embeddedAdminAppUrl({ host, clientId: 'test-client-id', shopDomain: 'fixture.myshopify.com', projectId: 'prj_123' }))
      .toBe('https://admin.shopify.com/store/fixture/apps/test-client-id/?project=prj_123&shopify=connected');
    expect(embeddedAdminAppUrl({ host: Buffer.from('admin.shopify.com/store/other', 'utf8').toString('base64url'), clientId: 'test-client-id', shopDomain: 'fixture.myshopify.com', projectId: 'prj_123' })).toBeNull();
    expect(embeddedAdminAppUrl({ host: 'not-a-valid-host', clientId: 'test-client-id', shopDomain: 'fixture.myshopify.com', projectId: 'prj_123' })).toBeNull();
  });

  it('persists the validated embedded host and returns to Shopify Admin when OAuth omits it', async () => {
    const services = await servicesFor(testDatabase());
    const { registered, project } = await createProject(services, 'embedded-return@example.com');
    const host = Buffer.from('admin.shopify.com/store/fixture', 'utf8').toString('base64url');
    const started = await services.shopify.startConnection({ userId: registered.user.id, projectId: project.id, shopDomain: 'fixture.myshopify.com', embeddedHost: host });
    const callback = await services.shopify.completeOAuthCallback({ query: callbackQuery({ authorizationUrl: started.authorization_url }) });
    expect(callback.redirect_path).toBe(`https://admin.shopify.com/store/fixture/apps/test-client-id/?project=${project.id}&shopify=connected`);
    await services.close();
  });

  it('validates OAuth state, encrypts credentials, and never returns a token to the merchant-facing response', async () => {
    const services = await servicesFor(testDatabase());
    const { registered, project } = await createProject(services);
    const callback = await connect(services, registered, project);
    expect(callback.connection.connection_status).toBe('sync_required');
    expect(JSON.stringify(callback)).not.toContain('deterministic-test-token');
    const envelope = await services.store.findShopifyCredentialEnvelope(callback.connection.id);
    expect(JSON.stringify(envelope)).not.toContain('deterministic-test-token');
    expect(envelope.ciphertext).toBeTruthy();
    await expect(services.shopify.completeOAuthCallback({ query: callbackQuery({ authorizationUrl: 'https://fixture.myshopify.com/admin/oauth/authorize?state=wrong.state' }) })).rejects.toMatchObject({ code: 'shopify_oauth_state_invalid' });
    await expect(services.shopify.startConnection({ userId: registered.user.id, projectId: project.id, shopDomain: 'not-a-shop.example' })).rejects.toMatchObject({ code: 'shop_domain_invalid' });
    await services.close();
  });

  it('synchronizes normalized paginated resources, marks changed approval stale, and preserves idempotency', async () => {
    const resources = fixtureResources();
    const paged = adapter({ pages: { product: [[resources.product[0]], [{ ...resources.product[0], id: 'gid://shopify/Product/2', title: 'Weekender', handle: 'weekender', variants: { nodes: [] }, media: { nodes: [] } }]] }, resources });
    const services = await servicesFor(testDatabase(), paged);
    const { registered, project } = await createProject(services);
    const { connection } = await connect(services, registered, project);
    const first = await services.shopify.synchronize({ userId: registered.user.id, projectId: project.id, connectionId: connection.id });
    expect(first.connection.connection_status).toBe('ready');
    expect(first.resource_counts.product).toBe(2);
    const listed = await services.shopify.listResources({ userId: registered.user.id, projectId: project.id });
    expect(JSON.stringify(listed)).not.toContain('gid://shopify');
    const bag = listed.resources.find(({ resource: item }) => item.display_title === 'Travel Bag').resource;
    await services.shopify.decideResource({ userId: registered.user.id, projectId: project.id, resourceId: bag.id, status: 'approved' });
    await expect(services.shopify.resolveApprovedResource({ projectId: project.id, organizationId: project.organization_id, resourceId: bag.id, allowedTypes: ['collection'] })).rejects.toMatchObject({ code: 'shopify_resource_approval_required' });
    const approved = await services.shopify.resolveApprovedResource({ projectId: project.id, organizationId: project.organization_id, resourceId: bag.id, allowedTypes: ['product'] });
    expect(approved.resource.display_title).toBe('Travel Bag');
    paged.pages.product = [[{ ...resources.product[0], title: 'Travel Bag, revised', variants: { nodes: [] }, media: { nodes: [] } }]];
    await services.shopify.synchronize({ userId: registered.user.id, projectId: project.id, connectionId: connection.id });
    const changed = await services.shopify.listResources({ userId: registered.user.id, projectId: project.id });
    expect(changed.resources.find(({ resource: item }) => item.id === bag.id).approval.approval_status).toBe('stale');
    await services.shopify.synchronize({ userId: registered.user.id, projectId: project.id, connectionId: connection.id });
    const stable = await services.shopify.listResources({ userId: registered.user.id, projectId: project.id });
    expect(stable.resources.filter(({ resource: item }) => item.resource_type === 'product' && item.availability_status === 'available')).toHaveLength(1);
    expect((await services.store.findShopifyResourceByRemote(connection.id, 'product', 'gid://shopify/Product/2')).availability_status).toBe('deleted');
    await services.close();
  });

  it('enforces project and organization isolation, revokes approvals on disconnect, and never fabricates an unavailable preview', async () => {
    const services = await servicesFor(testDatabase());
    const owner = await createProject(services, 'owner-shopify@example.com');
    const connected = await connect(services, owner.registered, owner.project);
    await services.shopify.synchronize({ userId: owner.registered.user.id, projectId: owner.project.id, connectionId: connected.connection.id });
    const resource = (await services.shopify.listResources({ userId: owner.registered.user.id, projectId: owner.project.id, resourceType: 'product' })).resources[0].resource;
    await services.shopify.decideResource({ userId: owner.registered.user.id, projectId: owner.project.id, resourceId: resource.id, status: 'approved' });
    const sameOrganizationProject = await services.projects.createProject({ userId: owner.registered.user.id, input: { name: 'Another brand', business_name: 'Another brand', country: 'GB' } });
    await expect(services.shopify.decideResource({ userId: owner.registered.user.id, projectId: sameOrganizationProject.project.id, resourceId: resource.id, status: 'approved' })).rejects.toMatchObject({ code: 'shopify_connection_missing' });
    const outsider = await createProject(services, 'outsider-shopify@example.com');
    await expect(services.shopify.listResources({ userId: outsider.registered.user.id, projectId: owner.project.id })).rejects.toMatchObject({ code: 'permission_denied' });
    await expect(services.shopify.preparePreview({ userId: owner.registered.user.id, projectId: owner.project.id, generatedBuildId: 'generation-1' })).rejects.toMatchObject({ code: 'shopify_preview_target_unapproved' });
    const theme = (await services.shopify.listResources({ userId: owner.registered.user.id, projectId: owner.project.id, resourceType: 'theme' })).resources[0].resource;
    await services.shopify.decideResource({ userId: owner.registered.user.id, projectId: owner.project.id, resourceId: theme.id, status: 'approved' });
    const preview = await services.shopify.preparePreview({ userId: owner.registered.user.id, projectId: owner.project.id, generatedBuildId: 'generation-1' });
    expect(preview.preview.preview_url).toBe('https://fixture.myshopify.com/?preview_theme_id=7');
    await services.shopify.disconnect({ userId: owner.registered.user.id, projectId: owner.project.id, connectionId: connected.connection.id });
    expect(await services.store.findShopifyCredentialEnvelope(connected.connection.id)).toBeNull();
    expect((await services.store.findShopifyResourceApproval(owner.project.id, resource.id)).approval_status).toBe('revoked');
    await services.close();
  });

  it('records partial errors safely and retries one Admin API rate-limited request', async () => {
    const broken = adapter();
    const original = broken.listResourcePage.bind(broken);
    broken.listResourcePage = async (input) => { if (input.resourceType === 'collection') throw new Error('forbidden in fixture'); return original(input); };
    const services = await servicesFor(testDatabase(), broken);
    const { registered, project } = await createProject(services, 'partial-shopify@example.com');
    const { connection } = await connect(services, registered, project);
    const sync = await services.shopify.synchronize({ userId: registered.user.id, projectId: project.id, connectionId: connection.id });
    expect(sync.sync_run.status).toBe('partial');
    expect(sync.sync_run.errors).toEqual(expect.arrayContaining([expect.objectContaining({ resource_type: 'collection' })]));
    let calls = 0;
    const api = new ShopifyAdminApiAdapter({ fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return new Response('', { status: 429, headers: { 'retry-after': '0' } });
      return new Response(JSON.stringify({ data: { shop: { id: 'gid://shopify/Shop/1', name: 'Fixture Store', myshopifyDomain: 'fixture.myshopify.com', primaryDomain: { host: 'www.fixture.example', url: 'https://www.fixture.example' } }, appInstallation: { accessScopes: [] } } }), { status: 200, headers: { 'content-type': 'application/json' } });
    } });
    await api.inspectConnection({ shopDomain: 'fixture.myshopify.com', accessToken: 'not-written-to-a-record' });
    expect(calls).toBe(2);
    await services.close();
  });

  it('marks revoked or incomplete-scope connections for reauthorization without exposing credentials', async () => {
    const controlled = adapter();
    const services = await servicesFor(testDatabase(), controlled);
    const { registered, project } = await createProject(services, 'reauthorize-shopify@example.com');
    const { connection } = await connect(services, registered, project);
    controlled.token = 'revoked-by-shopify';
    const health = await services.shopify.checkHealth({ userId: registered.user.id, projectId: project.id, connectionId: connection.id });
    expect(health.connection.connection_status).toBe('reauthorization_required');
    expect(JSON.stringify(health)).not.toContain('deterministic-test-token');
    await services.close();

    const incomplete = await servicesFor(testDatabase(), adapter({ scopes: [] }));
    const second = await createProject(incomplete, 'missing-scope-shopify@example.com');
    const result = await connect(incomplete, second.registered, second.project);
    expect(result.connection.connection_status).toBe('reauthorization_required');
    await incomplete.close();
  });
});
