import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardServices } = require('../server/dashboard-services.cjs');
const { DeterministicShopifyAdapter } = require('../server/shopify/deterministic-shopify-adapter.cjs');
const { DISCOVERY_SCOPES } = require('../server/shopify/constants.cjs');

const root = path.resolve(process.cwd(), '../..');
const key = Buffer.alloc(32, 13).toString('base64url');
function database() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-embedded-auth-')), 'dashboard.sqlite'); }
function env(file) {
  return {
    CALINIUM_SQLITE_PATH: file,
    APP_URL: 'https://dashboard.example',
    SHOPIFY_API_KEY: 'test-shopify-client',
    SHOPIFY_API_SECRET: 'test-shopify-session-secret',
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: key,
    CALINIUM_DASHBOARD_SESSION_SECRET: 'test-dashboard-session-secret-that-is-long-enough'
  };
}
function adapter() { return new DeterministicShopifyAdapter({ scopes: DISCOVERY_SCOPES }); }

describe('Shopify embedded dashboard authentication', () => {
  it('verifies the immutable myshopify domain while preserving a custom storefront primary domain', async () => {
    const fixture = new DeterministicShopifyAdapter({
      shop: {
        id: 'gid://shopify/Shop/1',
        name: 'Fixture Store',
        myshopify_domain: 'fixture.myshopify.com',
        primary_domain: 'www.fixture.example',
        storefront_url: 'https://www.fixture.example'
      },
      scopes: DISCOVERY_SCOPES
    });
    const services = await createDashboardServices({ root, env: env(database()), shopifyAdapter: fixture });
    await expect(services.embeddedAuth.bootstrap({ embeddedSession: { shop_domain: 'fixture.myshopify.com', user_id: 'gid://shopify/User/identity' }, sessionToken: 'identity-session' })).resolves.toMatchObject({ shop: { shop_domain: 'fixture.myshopify.com' } });
    await services.close();

    const mismatch = new DeterministicShopifyAdapter({
      shop: { id: 'gid://shopify/Shop/2', name: 'Other Store', myshopify_domain: 'other.myshopify.com', primary_domain: 'www.fixture.example', storefront_url: 'https://www.fixture.example' },
      scopes: DISCOVERY_SCOPES
    });
    const rejected = await createDashboardServices({ root, env: env(database()), shopifyAdapter: mismatch });
    await expect(rejected.embeddedAuth.bootstrap({ embeddedSession: { shop_domain: 'fixture.myshopify.com', user_id: 'gid://shopify/User/mismatch' }, sessionToken: 'identity-session' })).rejects.toMatchObject({ code: 'shopify_embedded_identity_unverified' });
    await rejected.close();
  });

  it('provisions a shop-scoped workspace once, encrypts the offline credential, and reuses it on the next app load', async () => {
    const storeFile = database(); const fixture = adapter();
    const services = await createDashboardServices({ root, env: env(storeFile), shopifyAdapter: fixture });
    const first = await services.embeddedAuth.bootstrap({ embeddedSession: { shop_domain: 'fixture.myshopify.com', user_id: 'gid://shopify/User/101' }, sessionToken: 'first-embedded-session' });
    expect(first.embedded).toBe(true);
    expect(first.organizations).toHaveLength(1);
    expect(first.user.email).toMatch(/@embedded\.calinium\.invalid$/);
    expect(first.user.email).not.toContain('gid://');
    const connection = await services.store.findShopifyConnectionByDomain('fixture.myshopify.com');
    const envelope = await services.store.findShopifyCredentialEnvelope(connection.id);
    expect(envelope.ciphertext).not.toContain('deterministic-test-token');
    expect(await services.auth.authenticate(first.session.token)).toMatchObject({ user: { id: first.user.id } });
    const second = await services.embeddedAuth.bootstrap({ embeddedSession: { shop_domain: 'fixture.myshopify.com', user_id: 'gid://shopify/User/101' }, sessionToken: 'second-embedded-session' });
    expect(second.user.id).toBe(first.user.id);
    expect(fixture.calls.filter((call) => call.method === 'exchangeSessionToken')).toHaveLength(1);
    await services.close();
  });

  it('collapses concurrent first-load authentication onto one canonical shop workspace and staff identity', async () => {
    const services = await createDashboardServices({ root, env: env(database()), shopifyAdapter: adapter() });
    const results = await Promise.all(Array.from({ length: 4 }, (_, index) => services.embeddedAuth.bootstrap({
      embeddedSession: { shop_domain: 'fixture.myshopify.com', user_id: 'gid://shopify/User/concurrent-owner' },
      sessionToken: `concurrent-session-${index}`
    })));
    expect(new Set(results.map((result) => result.user.id)).size).toBe(1);
    expect(new Set(results.map((result) => result.connection.id)).size).toBe(1);
    expect(new Set(results.map((result) => result.connection.organization_id)).size).toBe(1);
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM shopify_connections')).toMatchObject({ count: 1 });
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM shopify_embedded_identities')).toMatchObject({ count: 1 });
    await services.close();
  });

  it('isolates Shopify staff identities by shop and assigns new staff the editable non-owner role', async () => {
    const services = await createDashboardServices({ root, env: env(database()), shopifyAdapter: adapter() });
    const owner = await services.embeddedAuth.bootstrap({ embeddedSession: { shop_domain: 'fixture.myshopify.com', user_id: 'gid://shopify/User/owner' }, sessionToken: 'owner-session' });
    const member = await services.embeddedAuth.bootstrap({ embeddedSession: { shop_domain: 'fixture.myshopify.com', user_id: 'gid://shopify/User/member' }, sessionToken: 'member-session' });
    const organizationId = owner.organizations[0].organization.id;
    expect((await services.store.findMembership(organizationId, owner.user.id)).role).toBe('owner');
    expect((await services.store.findMembership(organizationId, member.user.id)).role).toBe('editor');
    await expect(services.embeddedAuth.authorizeActor({ userId: owner.user.id, shopDomain: 'other-store.myshopify.com', shopifyUserId: 'gid://shopify/User/owner' })).rejects.toMatchObject({ code: 'shopify_embedded_identity_invalid' });
    await expect(services.embeddedAuth.authorizeActor({ userId: owner.user.id, shopDomain: 'fixture.myshopify.com', shopifyUserId: 'gid://shopify/User/owner' })).resolves.toMatchObject({ connection: { shop_domain: 'fixture.myshopify.com' } });
    await services.close();
  });

  it('fails closed when encrypted offline credential storage is unavailable', async () => {
    const insecure = { ...env(database()) };
    delete insecure.CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY;
    const services = await createDashboardServices({ root, env: insecure, shopifyAdapter: adapter() });
    await expect(services.embeddedAuth.bootstrap({ embeddedSession: { shop_domain: 'fixture.myshopify.com', user_id: 'gid://shopify/User/101' }, sessionToken: 'embedded-session' })).rejects.toMatchObject({ code: 'shopify_oauth_unavailable' });
    expect(await services.store.findShopifyConnectionByDomain('fixture.myshopify.com')).toBeNull();
    await services.close();
  });
});
