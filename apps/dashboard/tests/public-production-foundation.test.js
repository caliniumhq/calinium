import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardServices } = require('../server/dashboard-services.cjs');
const { createDashboardStore } = require('../server/storage/create-store.cjs');
const { DeterministicShopifyAdapter } = require('../server/shopify/deterministic-shopify-adapter.cjs');
const { ObjectStorageProvider } = require('../server/assets/object-storage-provider.cjs');
const { validatePublicProductionConfiguration } = require('../server/production/public-production-configuration.cjs');
const { DISCOVERY_SCOPES } = require('../server/shopify/constants.cjs');

const root = path.resolve(process.cwd(), '../..');
const shop = 'fixture.myshopify.com';
const webhookSecret = 'public-foundation-webhook-secret';
const encryptionKey = Buffer.alloc(32, 41).toString('base64url');

function directory() { return fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-public-foundation-')); }
function testEnv(target = directory()) {
  return {
    NODE_ENV: 'test', CALINIUM_ENVIRONMENT: 'test', CALINIUM_STORAGE_DRIVER: 'sqlite',
    CALINIUM_SQLITE_PATH: path.join(target, 'dashboard.sqlite'), CALINIUM_ASSET_STORAGE_PATH: path.join(target, 'assets'),
    APP_URL: 'https://dashboard.example', SHOPIFY_API_KEY: 'public-foundation-client', SHOPIFY_API_SECRET: webhookSecret,
    CALINIUM_SHOPIFY_CLIENT_SECRET: webhookSecret, CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: encryptionKey,
    CALINIUM_DASHBOARD_SESSION_SECRET: 'public-foundation-dashboard-session-secret-long', CALINIUM_ALLOWED_SHOP_DOMAINS: shop
  };
}
function adapter() {
  return new DeterministicShopifyAdapter({
    shop: { id: 'gid://shopify/Shop/1234', name: 'Fixture', myshopify_domain: shop, primary_domain: shop, storefront_url: `https://${shop}` },
    scopes: DISCOVERY_SCOPES
  });
}
function signedWebhook(payload, topic, id = crypto.randomUUID(), headerShop = shop) {
  const rawBody = Buffer.from(JSON.stringify(payload));
  return {
    rawBody,
    headers: {
      'x-shopify-hmac-sha256': crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('base64'),
      'x-shopify-topic': topic,
      'x-shopify-webhook-id': id,
      'x-shopify-shop-domain': headerShop
    }
  };
}
async function embeddedWorkspace() {
  const services = await createDashboardServices({ root, env: testEnv(), shopifyAdapter: adapter() });
  const first = await services.embeddedAuth.bootstrap({ embeddedSession: { shop_domain: shop, user_id: 'gid://shopify/User/owner' }, sessionToken: 'signed-session-token' });
  const bootstrapped = await services.projects.bootstrapShopifyProject({
    userId: first.user.id, organizationId: first.connection.organization_id, connectionId: first.connection.id,
    shopDomain: shop, shopDisplayName: 'Fixture', requestedProjectId: null
  });
  return { services, first, project: bootstrapped.project };
}

function validProductionEnv() {
  return {
    CALINIUM_ENVIRONMENT: 'production', CALINIUM_DEPLOYMENT_IDENTITY: 'calinium-public-production',
    CALINIUM_SHOPIFY_APP_IDENTITY: 'calinium-public', CALINIUM_DATABASE_IDENTITY: 'calinium-public-production',
    CALINIUM_OBJECT_STORAGE_IDENTITY: 'calinium-public-production', CALINIUM_SECRET_STORE_IDENTITY: 'calinium-public-production',
    CALINIUM_LOG_ENVIRONMENT: 'public-production', CALINIUM_APPLICATION_URL: 'https://app.calinium.com',
    CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI: 'https://app.calinium.com/api/shopify/oauth/callback',
    CALINIUM_SHOPIFY_CLIENT_ID: 'public-client-id', CALINIUM_SHOPIFY_CLIENT_SECRET: 'secret',
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: 'encrypted-envelope-key', CALINIUM_DASHBOARD_SESSION_SECRET: 'a'.repeat(40),
    CALINIUM_STORAGE_DRIVER: 'postgres', CALINIUM_DATABASE_PROVIDER: 'fly_mpg', DATABASE_URL: 'postgresql://database.internal/calinium_public', DATABASE_SSL: 'true',
    CALINIUM_DATABASE_BACKUP_CONFIGURATION_ID: 'managed-backup-policy-v1', CALINIUM_DATABASE_RESTORE_CONFIGURATION_ID: 'restore-runbook-v1',
    CALINIUM_ASSET_STORAGE_DRIVER: 'object', CALINIUM_ARTIFACT_STORAGE_DRIVER: 'object',
    CALINIUM_OBJECT_STORAGE_BUCKET: 'calinium-public-objects', CALINIUM_OBJECT_STORAGE_PREFIX: 'public',
    CALINIUM_OBJECT_STORAGE_PROVIDER: 'tigris', CALINIUM_OBJECT_STORAGE_ENDPOINT: 'https://t3.storage.dev', CALINIUM_OBJECT_STORAGE_REGION: 'auto',
    CALINIUM_OBJECT_STORAGE_BACKUP_CONFIGURATION_ID: 'object-versioning-v1', CALINIUM_OBJECT_STORAGE_LIFECYCLE_POLICY_ID: 'authoritative-no-expiry-v1',
    CALINIUM_OBJECT_STORAGE_RESTORE_POLICY_ID: 'provider-restore-acceptance-v1', AWS_ACCESS_KEY_ID: 'public-access-key', AWS_SECRET_ACCESS_KEY: 'public-secret-key',
    CALINIUM_MERCHANT_FLOW_BETA_ENABLED: 'false',
    CALINIUM_PUBLIC_OPERATOR_USER_IDS: 'usr_operator', CALINIUM_PRIVACY_WEBHOOKS_ENABLED: 'true',
    CALINIUM_PRIVACY_WEBHOOK_TOPICS: 'customers/data_request,customers/redact,shop/redact',
    CALINIUM_PRIVACY_POLICY_URL: 'https://calinium.com/privacy', CALINIUM_TERMS_URL: 'https://calinium.com/terms',
    CALINIUM_SUPPORT_URL: 'https://calinium.com/support', CALINIUM_LOG_DESTINATION: 'structured-stdout',
    CALINIUM_INCIDENT_CONFIGURATION_ID: 'incident-contract-v1'
  };
}

function acceptedDatabaseCapability() {
  return {
    contract_version: 'calinium-public-postgres-acceptance-v1', acceptance_revision: 'public-postgres-backup-restore-v1',
    status: 'READY', provider: 'fly_mpg', clean_bootstrap_verified: true, migrations_verified: true,
    transaction_verified: true, backup_verified: true, restore_verified: true, readback_verified: true,
    isolation_verified: true, privacy_verified: true, acceptance_checksum: 'b'.repeat(64)
  };
}

function acceptedStorageCapability() {
  return {
    status: 'READY', provider: 'tigris', acceptance_revision: 'tigris-real-io-restore-v1',
    health_verified: true, io_verified: true, restore_verified: true, lifecycle_verified: true,
    immutability_verified: true, cleanup_verified: true, acceptance_checksum: 'a'.repeat(64)
  };
}

describe('Public production isolation and privacy lifecycle foundation', () => {
  it('bootstraps the privacy schema on a completely clean database', async () => {
    const target = directory();
    const store = await createDashboardStore({ root, env: testEnv(target) });
    expect(await store.driver.get('SELECT version FROM schema_migrations WHERE version = $1', [27])).toMatchObject({ version: 27 });
    expect(await store.driver.get('SELECT COUNT(*) AS count FROM privacy_lifecycle_operations')).toMatchObject({ count: 0 });
    await store.driver.close();
  });

  it('fails closed instead of falling back to SQLite in production', async () => {
    await expect(createDashboardStore({ root, env: { CALINIUM_ENVIRONMENT: 'production' } })).rejects.toThrow(/postgres/i);
    await expect(createDashboardStore({ root, env: { CALINIUM_ENVIRONMENT: 'production', CALINIUM_STORAGE_DRIVER: 'sqlite' } })).rejects.toThrow(/PostgreSQL/i);
  });

  it('validates an isolated public contract and rejects staging inheritance without exposing secrets', () => {
    const ready = validatePublicProductionConfiguration(validProductionEnv(), { capabilities: {
      production_database_acceptance: acceptedDatabaseCapability(),
      durable_artifact_storage_acceptance: acceptedStorageCapability()
    } });
    expect(ready).toMatchObject({
      status: 'NOT_READY',
      database: { provider_status: 'DATABASE_ACCEPTED' },
      artifact_storage: { provider_status: 'READY' },
      theme_delivery: { status: 'CLARIFICATION_REQUIRED' },
      founder_decisions: [expect.objectContaining({ subject: 'merchant_data_retention_duration' })]
    });
    expect(validatePublicProductionConfiguration(validProductionEnv())).toMatchObject({
      status: 'NOT_READY',
      issues: expect.arrayContaining([
        expect.objectContaining({ code: 'public_database_provider_not_accepted' }),
        expect.objectContaining({ code: 'public_artifact_storage_provider_health_unverified' })
      ]),
      database: { implementation_status: 'DATABASE_IMPLEMENTATION_READY', provider_status: 'DATABASE_CONFIGURED_NOT_ACCEPTED', configured: true, runtime_capability: false },
      artifact_storage: { implementation_status: 'IMPLEMENTATION_READY', provider_status: 'CONFIGURED_UNVERIFIED', configured: true, runtime_capability: false }
    });
    expect(validatePublicProductionConfiguration({ ...validProductionEnv(), CALINIUM_DATABASE_PROVIDER: '' })).toMatchObject({
      status: 'NOT_READY', database: { provider_status: 'DATABASE_PROVIDER_NOT_CONFIGURED', configured: false, runtime_capability: false }
    });
    expect(validatePublicProductionConfiguration(validProductionEnv(), { capabilities: {
      production_database_acceptance: { ...acceptedDatabaseCapability(), restore_verified: false },
      durable_artifact_storage_acceptance: acceptedStorageCapability()
    } })).toMatchObject({ status: 'NOT_READY', database: { provider_status: 'DATABASE_CONFIGURED_NOT_ACCEPTED' } });
    expect(validatePublicProductionConfiguration({ ...validProductionEnv(), DATABASE_URL: 'postgresql://database.internal/calinium_public?sslmode=disable' })).toMatchObject({
      status: 'NOT_READY', issues: expect.arrayContaining([expect.objectContaining({ code: 'public_database_url_invalid' })])
    });
    expect(ready.database).toMatchObject({ provider_status: 'DATABASE_ACCEPTED', provider: 'fly_mpg', restore_verified: true });
    expect(validatePublicProductionConfiguration(validProductionEnv(), {
      capabilities: { durable_artifact_storage: true, durable_artifact_storage_provider_healthy: true }
    })).toMatchObject({ status: 'NOT_READY', artifact_storage: { provider_status: 'CONFIGURED_UNVERIFIED' } });
    expect(validatePublicProductionConfiguration(validProductionEnv(), {
      capabilities: { durable_artifact_storage_acceptance: { status: 'READY', provider: 'tigris', health_verified: true } }
    })).toMatchObject({ status: 'NOT_READY', artifact_storage: { provider_status: 'CONFIGURED_UNVERIFIED' } });
    const invalid = validatePublicProductionConfiguration({ ...validProductionEnv(), CALINIUM_DEPLOYMENT_IDENTITY: 'calinium-example-staging', CALINIUM_ALLOWED_SHOP_DOMAINS: 'legacyexample.myshopify.com' });
    expect(invalid.status).toBe('NOT_READY');
    expect(invalid.issues.map((item) => item.code)).toEqual(expect.arrayContaining(['public_deployment_identity_invalid', 'public_shop_allowlist_forbidden', 'public_staging_identity_detected']));
    expect(JSON.stringify(invalid)).not.toContain(validProductionEnv().CALINIUM_SHOPIFY_CLIENT_SECRET);
    const credentialCollision = validatePublicProductionConfiguration({ ...validProductionEnv(), CALINIUM_STAGING_SHOPIFY_CLIENT_ID: 'public-client-id' });
    expect(credentialCollision.issues.map((item) => item.code)).toContain('public_staging_shopify_credentials_forbidden');
  });

  it('uses immutable checksum-bound provider-neutral object storage without dependency installation', async () => {
    const objects = new Map();
    const client = {
      async putObject(input) { if (objects.has(input.key)) return { created: false }; objects.set(input.key, { body: Buffer.from(input.body), metadata: input.metadata }); return { created: true }; },
      async getObject({ key }) { const item = objects.get(key); return { body: item.body, metadata: item.metadata }; },
      async deleteObject({ key }) { objects.delete(key); },
      async headObject({ key }) { const item = objects.get(key); return item ? { exists: true, sizeBytes: item.body.length, metadata: item.metadata } : { exists: false }; },
      async healthCheck() { return { ready: true }; }
    };
    const provider = new ObjectStorageProvider({ client, bucket: 'calinium-public-objects', prefix: 'public' });
    const buffer = Buffer.from('merchant asset');
    const digest = crypto.createHash('sha256').update(buffer).digest('hex');
    const key = 'organizations/org_1/projects/prj_1/ast_1/ast-1.pdf';
    await expect(provider.put({ key, buffer, checksumSha256: digest, contentType: 'application/pdf' })).resolves.toMatchObject({ immutable: true, checksum_sha256: digest });
    await expect(provider.put({ key, buffer, checksumSha256: digest })).resolves.toMatchObject({ created: false, immutable: true });
    await expect(provider.read({ key, checksumSha256: digest })).resolves.toEqual(buffer);
    await expect(provider.healthCheck()).resolves.toMatchObject({ durable: true });
  });

  it('authenticates, isolates, and idempotently completes customer privacy requests as no-data operations', async () => {
    const { services } = await embeddedWorkspace();
    const request = signedWebhook({ shop_id: 1234, shop_domain: shop, customer: { id: 88, email: 'not-retained@example.com' }, data_request: { id: 99 } }, 'customers/data_request', 'privacy-data-request');
    const first = await services.shopify.processWebhook(request);
    expect(first).toMatchObject({ accepted: true, duplicate: false, privacy_status: 'completed', disposition_code: 'no_customer_data_stored' });
    expect(await services.shopify.processWebhook(request)).toMatchObject({ accepted: true, duplicate: true });
    const operations = await services.store.listPrivacyLifecycleOperations(shop);
    expect(operations).toHaveLength(1);
    expect(operations[0].result).toEqual({ customer_data_classes: [], export_required: false });
    expect(JSON.stringify(operations[0])).not.toContain('not-retained@example.com');

    const redaction = signedWebhook({ shop_id: 1234, shop_domain: shop, customer: { id: 88 }, orders_to_redact: [] }, 'customers/redact', 'privacy-customer-redact');
    expect(await services.shopify.processWebhook(redaction)).toMatchObject({ privacy_status: 'completed', disposition_code: 'no_customer_data_stored' });
    await services.close();
  });

  it('rejects invalid signatures and cross-shop privacy payloads with bounded errors', async () => {
    const { services } = await embeddedWorkspace();
    const valid = signedWebhook({ shop_id: 1234, shop_domain: shop, customer: { id: 88 }, data_request: { id: 99 } }, 'customers/data_request', 'privacy-invalid');
    await expect(services.shopify.processWebhook({ ...valid, headers: { ...valid.headers, 'x-shopify-hmac-sha256': 'invalid' } })).rejects.toMatchObject({ code: 'shopify_webhook_invalid', status: 401 });
    const mismatched = signedWebhook({ shop_id: 5678, shop_domain: 'other.myshopify.com', customer: { id: 88 }, data_request: { id: 99 } }, 'customers/data_request', 'privacy-cross-shop');
    await expect(services.shopify.processWebhook(mismatched)).rejects.toMatchObject({ code: 'shopify_privacy_shop_mismatch', status: 403 });
    await expect(services.shopify.processWebhook(mismatched)).rejects.toMatchObject({ code: 'shopify_privacy_shop_mismatch', status: 403 });
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM privacy_lifecycle_operations')).toMatchObject({ count: 0 });
    await services.close();
  });

  it('revokes the current organization session immediately on app uninstall', async () => {
    const { services, first } = await embeddedWorkspace();
    expect(await services.auth.authenticate(first.session.token)).toMatchObject({ user: { id: first.user.id } });
    expect(await services.shopify.processWebhook(signedWebhook({}, 'app/uninstalled', 'public-foundation-uninstall'))).toMatchObject({ accepted: true, duplicate: false });
    expect(await services.auth.authenticate(first.session.token)).toBeNull();
    expect(await services.store.findShopifyCredentialEnvelope(first.connection.id)).toBeNull();
    expect(await services.store.findShopDataLifecycleState(shop)).toMatchObject({ lifecycle_state: 'uninstalled' });
    await services.close();
  });

  it('revokes sessions, credentials, and queued work on shop redaction, then requires a fresh signed reinstall session', async () => {
    const { services, first, project } = await embeddedWorkspace();
    await services.authoritativeObjects.persistBuffer({
      scope: {
        organization_id: project.organization_id,
        project_id: project.id,
        connection_id: first.connection.id,
        canonical_shop: shop
      },
      buffer: Buffer.from('{"accepted":true}\n'),
      contentType: 'application/json; charset=utf-8',
      objectClass: 'qa_evidence',
      evidenceKind: 'privacy_inventory_fixture',
      evidenceIdentity: 'privacy-inventory-fixture',
      lineageIdentity: 'privacy-inventory-lineage',
      retentionClassification: 'immutable_audit'
    });
    await services.store.createMerchantFlowJob({
      id: 'merchant-flow-job-privacy', flow_id: 'merchant-flow-privacy', project_id: project.id,
      organization_id: project.organization_id, job_kind: 'generation', identity_checksum: 'a'.repeat(64), status: 'queued',
      attempt: 0, payload: {}, created_at: '2026-09-21T12:00:00.000Z', updated_at: '2026-09-21T12:00:00.000Z'
    });
    await services.store.createMerchantFlowJob({
      id: 'merchant-flow-job-running', flow_id: 'merchant-flow-running', project_id: project.id,
      organization_id: project.organization_id, job_kind: 'render_qa', identity_checksum: 'b'.repeat(64), status: 'running',
      attempt: 1, lease_epoch: 1, lease_token: 'active-lease', lease_expires_at: '2026-09-21T13:00:00.000Z', payload: {},
      created_at: '2026-09-21T12:00:00.000Z', updated_at: '2026-09-21T12:00:00.000Z'
    });
    expect(await services.auth.authenticate(first.session.token)).toMatchObject({ user: { id: first.user.id } });
    const redaction = signedWebhook({ shop_id: 1234, shop_domain: shop }, 'shop/redact', 'privacy-shop-redact');
    expect(await services.shopify.processWebhook(redaction)).toMatchObject({ privacy_status: 'retention_pending', disposition_code: 'founder_decision_required' });
    expect(await services.auth.authenticate(first.session.token)).toBeNull();
    expect(await services.store.findShopifyCredentialEnvelope(first.connection.id)).toBeNull();
    expect((await services.store.findMerchantFlowJob('merchant-flow-job-privacy', project.id, project.organization_id)).status).toBe('cancelled');
    expect((await services.store.findMerchantFlowJob('merchant-flow-job-running', project.id, project.organization_id)).status).toBe('cancellation_requested');
    await expect(services.embeddedAuth.resolveActor({ shopDomain: shop, shopifyUserId: 'gid://shopify/User/owner' })).rejects.toMatchObject({ code: 'shopify_embedded_connection_unavailable' });
    expect(await services.store.findShopDataLifecycleState(shop)).toMatchObject({ lifecycle_state: 'redaction_requested', retention_policy_revision: 'founder-decision-required-v1', purge_after: null });
    const privacyOperation = (await services.store.listPrivacyLifecycleOperations(shop)).find((operation) => operation.topic === 'shop/redact');
    expect(privacyOperation.result).toMatchObject({
      durable_object_count: 1,
      durable_object_classes: ['qa_evidence'],
      durable_object_disposition: 'FOUNDER_DECISION_REQUIRED'
    });

    const reinstalled = await services.embeddedAuth.bootstrap({ embeddedSession: { shop_domain: shop, user_id: 'gid://shopify/User/owner' }, sessionToken: 'fresh-reinstall-session' });
    expect(reinstalled.user.id).toBe(first.user.id);
    expect(reinstalled.session.token).not.toBe(first.session.token);
    expect(await services.auth.authenticate(first.session.token)).toBeNull();
    expect(await services.auth.authenticate(reinstalled.session.token)).toMatchObject({ user: { id: first.user.id } });
    expect(await services.store.findShopDataLifecycleState(shop)).toMatchObject({ lifecycle_state: 'reinstalled', reinstall_count: 1 });
    await services.close();
  });
});
