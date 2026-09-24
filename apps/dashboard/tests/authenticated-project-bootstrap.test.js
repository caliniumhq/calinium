import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardServices } = require('../server/dashboard-services.cjs');
const { DeterministicShopifyAdapter } = require('../server/shopify/deterministic-shopify-adapter.cjs');
const { DISCOVERY_SCOPES } = require('../server/shopify/constants.cjs');
const { createId } = require('../server/lib/ids.cjs');

const root = path.resolve(process.cwd(), '../..');
const encryptionKey = Buffer.alloc(32, 29).toString('base64url');

function database() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-project-bootstrap-')), 'dashboard.sqlite'); }
function environment(file, allowedShop = '') {
  return {
    CALINIUM_SQLITE_PATH: file,
    APP_URL: 'https://dashboard.example',
    SHOPIFY_API_KEY: 'test-shopify-client',
    SHOPIFY_API_SECRET: 'test-shopify-session-secret',
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: encryptionKey,
    CALINIUM_DASHBOARD_SESSION_SECRET: 'test-dashboard-session-secret-that-is-long-enough',
    ...(allowedShop ? { CALINIUM_ALLOWED_SHOP_DOMAINS: allowedShop } : {})
  };
}
function shopifyAdapter({ shopDomain = 'fixture.myshopify.com', primaryDomain = 'www.fixture.example', name = 'Fixture Store' } = {}) {
  return new DeterministicShopifyAdapter({
    shop: { id: `gid://shopify/Shop/${shopDomain}`, name, myshopify_domain: shopDomain, primary_domain: primaryDomain, storefront_url: `https://${primaryDomain}` },
    scopes: DISCOVERY_SCOPES
  });
}
async function authenticate(services, { shopDomain = 'fixture.myshopify.com', userId = 'gid://shopify/User/owner', sessionToken = 'embedded-session' } = {}) {
  return services.embeddedAuth.bootstrap({ embeddedSession: { shop_domain: shopDomain, user_id: userId }, sessionToken });
}
async function bootstrapProject(services, authenticated, requestedProjectId = null) {
  return services.projects.bootstrapShopifyProject({
    userId: authenticated.user.id,
    organizationId: authenticated.connection.organization_id,
    connectionId: authenticated.connection.id,
    shopDomain: authenticated.connection.shop_domain,
    shopDisplayName: authenticated.connection.display_name,
    requestedProjectId
  });
}
async function createProject(services, userId, name) {
  return (await services.projects.createProject({ userId, input: { name, business_name: name, country: 'GB' } })).project;
}
function connectionRecord({ id, organizationId, userId, shopDomain, at = '2026-08-08T00:00:00.000Z' }) {
  return {
    id,
    organization_id: organizationId,
    shop_domain: shopDomain,
    shop_gid: `gid://shopify/Shop/${id}`,
    display_name: shopDomain,
    storefront_url: `https://${shopDomain}`,
    primary_market: null,
    granted_scopes: DISCOVERY_SCOPES,
    connection_status: 'ready',
    credential_status: 'active',
    health: { status: 'healthy' },
    last_synced_at: at,
    connected_by_user_id: userId,
    connected_at: at,
    disconnected_at: null,
    created_at: at,
    updated_at: at
  };
}

describe('Authenticated shop-bound project bootstrap', () => {
  it('creates and binds exactly one durable project across concurrent first-launch retries without commercial side effects', async () => {
    const adapter = shopifyAdapter();
    const services = await createDashboardServices({ root, env: environment(database()), shopifyAdapter: adapter });
    const actor = await authenticate(services);
    const results = await Promise.all(Array.from({ length: 6 }, () => bootstrapProject(services, actor)));
    const projectIds = new Set(results.map((result) => result.project.id));
    expect(projectIds.size).toBe(1);
    expect(results.map((result) => result.project_status)).toEqual(expect.arrayContaining(['created', 'resumed']));
    const project = results[0].project;
    expect(project.shopify_store_url).toBe('https://fixture.myshopify.com/');
    expect((await services.store.listProjects(actor.connection.organization_id))).toHaveLength(1);
    expect((await services.store.findProjectShopifyConnection(project.id, actor.connection.organization_id, actor.connection.id)).connection.shop_domain).toBe('fixture.myshopify.com');
    expect((await services.store.findShopifyProjectBootstrapBinding(actor.connection.id, actor.connection.organization_id)).project_id).toBe(project.id);
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_orders')).toMatchObject({ count: 0 });
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM creative_director_sessions')).toMatchObject({ count: 0 });
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM approved_preset_revisions')).toMatchObject({ count: 0 });
    expect(adapter.calls.map((call) => call.method)).toEqual(['exchangeSessionToken', 'inspectConnection']);
    await services.close();
  });

  it('adopts one historical project, resumes its canonical Creative Director state, and survives service/session renewal', async () => {
    const file = database();
    const env = environment(file);
    const services = await createDashboardServices({ root, env, shopifyAdapter: shopifyAdapter() });
    const actor = await authenticate(services);
    const historical = await createProject(services, actor.user.id, 'Historical project');
    await services.creativeDirector.start({ userId: actor.user.id, projectId: historical.id });
    const first = await bootstrapProject(services, actor);
    expect(first).toMatchObject({ project: { id: historical.id }, project_status: 'resumed', resume_state: { experience: 'creative_director', stage: 'conversation' } });
    expect((await services.store.findProjectShopifyConnection(historical.id, historical.organization_id, actor.connection.id)).connection.id).toBe(actor.connection.id);
    await services.store.driver.exec('DROP TABLE shopify_project_bootstrap_bindings');
    await services.store.driver.run('DELETE FROM schema_migrations WHERE version = $1', [16]);
    await services.close();

    const reopened = await createDashboardServices({ root, env, shopifyAdapter: shopifyAdapter() });
    const renewedActor = await authenticate(reopened, { sessionToken: 'renewed-session' });
    const resumed = await bootstrapProject(reopened, renewedActor);
    expect(resumed).toMatchObject({ project: { id: historical.id }, project_status: 'resumed', resume_state: { stage: 'conversation' } });
    expect((await reopened.store.listProjects(renewedActor.connection.organization_id))).toHaveLength(1);
    await reopened.close();
  });

  it('requires an explicit authorized selection when several projects are plausible and then persists that selection', async () => {
    const services = await createDashboardServices({ root, env: environment(database()), shopifyAdapter: shopifyAdapter() });
    const actor = await authenticate(services);
    const first = await createProject(services, actor.user.id, 'First project');
    const second = await createProject(services, actor.user.id, 'Second project');
    const ambiguous = await bootstrapProject(services, actor);
    expect(ambiguous.project_status).toBe('selection_required');
    expect(ambiguous.available_projects.map((project) => project.id).sort()).toEqual([first.id, second.id].sort());
    expect(await services.store.findShopifyProjectBootstrapBinding(actor.connection.id, actor.connection.organization_id)).toBeNull();

    const selected = await bootstrapProject(services, actor, second.id);
    expect(selected.project.id).toBe(second.id);
    expect((await services.store.findProjectShopifyConnection(second.id, second.organization_id, actor.connection.id)).connection.id).toBe(actor.connection.id);
    expect((await bootstrapProject(services, actor)).project.id).toBe(second.id);
    expect((await services.store.listProjects(actor.connection.organization_id))).toHaveLength(2);
    await services.close();
  });

  it('enforces canonical connection, organization, and project isolation for every embedded project route context', async () => {
    const services = await createDashboardServices({ root, env: environment(database()), shopifyAdapter: shopifyAdapter() });
    const actor = await authenticate(services);
    const canonical = await bootstrapProject(services, actor);
    const other = await createProject(services, actor.user.id, 'Other shop project');
    const otherConnection = await services.store.createShopifyConnection(connectionRecord({ id: createId('shc'), organizationId: actor.connection.organization_id, userId: actor.user.id, shopDomain: 'other-store.myshopify.com' }));
    await services.store.assignShopifyConnectionToProject({ id: createId('psc'), project_id: other.id, connection_id: otherConnection.id, assigned_by_user_id: actor.user.id, assignment_status: 'assigned', created_at: '2026-08-08T00:00:00.000Z', updated_at: '2026-08-08T00:00:00.000Z' });
    await expect(services.projects.authorizeShopifyProjectContext({ userId: actor.user.id, projectId: other.id, organizationId: actor.connection.organization_id, connectionId: actor.connection.id })).rejects.toMatchObject({ code: 'shopify_project_access_denied' });

    const outsider = await services.auth.register({ email: 'outsider-bootstrap@example.com', password: 'correct-horse-battery-staple', fullName: 'Outsider', organizationName: 'Other Organization', ipAddress: '127.0.0.8' });
    const outsiderProject = await createProject(services, outsider.user.id, 'Outsider project');
    await expect(services.projects.authorizeShopifyProjectContext({ userId: actor.user.id, projectId: outsiderProject.id, organizationId: actor.connection.organization_id, connectionId: actor.connection.id })).rejects.toMatchObject({ code: 'shopify_project_access_denied' });
    await expect(bootstrapProject(services, actor, outsiderProject.id)).rejects.toMatchObject({ code: 'shopify_project_access_denied' });

    const overview = await services.projects.embeddedDashboardOverview({ userId: actor.user.id, organizationId: actor.connection.organization_id, connectionId: actor.connection.id });
    expect(overview.projects.map((project) => project.id)).toEqual([canonical.project.id]);
    expect(JSON.stringify(overview)).not.toContain(other.id);
    expect(JSON.stringify(overview)).not.toContain(outsiderProject.id);
    await services.close();
  });

  it('uses LEGACY_EXAMPLE canonical signed identity even when the historical project and storefront domain use aliases', async () => {
    const canonicalShop = 'calinium-legacyexample.myshopify.com';
    const services = await createDashboardServices({
      root,
      env: environment(database(), canonicalShop),
      shopifyAdapter: shopifyAdapter({ shopDomain: canonicalShop, primaryDomain: 'www.legacyexample.co', name: 'LEGACY_EXAMPLE' })
    });
    const actor = await authenticate(services, { shopDomain: canonicalShop, userId: 'gid://shopify/User/legacyexample' });
    const historical = (await services.projects.createProject({ userId: actor.user.id, input: { name: 'LEGACY_EXAMPLE', business_name: 'LEGACY_EXAMPLE', country: 'MA', shopify_store_url: 'https://calinium-legacy-admin-example.myshopify.com' } })).project;
    const result = await bootstrapProject(services, actor);
    expect(result.project.id).toBe(historical.id);
    expect(actor.connection.shop_domain).toBe(canonicalShop);
    expect((await services.store.findProjectShopifyConnection(historical.id, historical.organization_id, actor.connection.id)).connection.shop_domain).toBe(canonicalShop);
    await expect(services.projects.bootstrapShopifyProject({ userId: actor.user.id, organizationId: actor.connection.organization_id, connectionId: actor.connection.id, shopDomain: 'calinium-legacy-admin-example.myshopify.com', shopDisplayName: 'LEGACY_EXAMPLE' })).rejects.toMatchObject({ code: 'shopify_project_scope_invalid' });
    await services.close();
  });
});
