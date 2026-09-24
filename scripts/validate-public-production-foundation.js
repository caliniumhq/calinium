#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { validatePublicProductionConfiguration, REQUIRED_PRIVACY_TOPICS } = require('../apps/dashboard/server/production/public-production-configuration.cjs');

const root = path.resolve(__dirname, '..');
const productionConfig = fs.readFileSync(path.join(root, 'shopify.app.production.toml.example'), 'utf8');
for (const topic of REQUIRED_PRIVACY_TOPICS) assert(productionConfig.includes(`"${topic}"`), `Production app config is missing ${topic}.`);
assert(productionConfig.includes('compliance_topics'), 'Production app config must use the compliance_topics subscription contract.');

const valid = {
  CALINIUM_ENVIRONMENT: 'production', CALINIUM_DEPLOYMENT_IDENTITY: 'calinium-public-production', CALINIUM_SHOPIFY_APP_IDENTITY: 'calinium-public',
  CALINIUM_DATABASE_IDENTITY: 'calinium-public-production', CALINIUM_OBJECT_STORAGE_IDENTITY: 'calinium-public-production', CALINIUM_SECRET_STORE_IDENTITY: 'calinium-public-production',
  CALINIUM_LOG_ENVIRONMENT: 'public-production', CALINIUM_APPLICATION_URL: 'https://app.calinium.com', CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI: 'https://app.calinium.com/api/shopify/oauth/callback',
  CALINIUM_SHOPIFY_CLIENT_ID: 'configured', CALINIUM_SHOPIFY_CLIENT_SECRET: 'configured', CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: 'configured', CALINIUM_DASHBOARD_SESSION_SECRET: 'x'.repeat(40),
  CALINIUM_STORAGE_DRIVER: 'postgres', CALINIUM_DATABASE_PROVIDER: 'fly_mpg', DATABASE_URL: 'postgresql://db.internal/calinium_public', DATABASE_SSL: 'true', CALINIUM_DATABASE_BACKUP_CONFIGURATION_ID: 'backup-v1', CALINIUM_DATABASE_RESTORE_CONFIGURATION_ID: 'restore-v1',
  CALINIUM_ASSET_STORAGE_DRIVER: 'object', CALINIUM_ARTIFACT_STORAGE_DRIVER: 'object', CALINIUM_OBJECT_STORAGE_BUCKET: 'calinium-public', CALINIUM_OBJECT_STORAGE_PREFIX: 'public',
  CALINIUM_OBJECT_STORAGE_PROVIDER: 'tigris', CALINIUM_OBJECT_STORAGE_ENDPOINT: 'https://t3.storage.dev', CALINIUM_OBJECT_STORAGE_REGION: 'auto',
  CALINIUM_OBJECT_STORAGE_BACKUP_CONFIGURATION_ID: 'object-backup-v1', CALINIUM_OBJECT_STORAGE_LIFECYCLE_POLICY_ID: 'authoritative-no-expiry-v1',
  CALINIUM_OBJECT_STORAGE_RESTORE_POLICY_ID: 'provider-restore-acceptance-v1', AWS_ACCESS_KEY_ID: 'access-key', AWS_SECRET_ACCESS_KEY: 'secret-key',
  CALINIUM_MERCHANT_FLOW_BETA_ENABLED: 'false', CALINIUM_PUBLIC_OPERATOR_USER_IDS: 'usr_operator', CALINIUM_PRIVACY_WEBHOOKS_ENABLED: 'true',
  CALINIUM_PRIVACY_WEBHOOK_TOPICS: REQUIRED_PRIVACY_TOPICS.join(','), CALINIUM_PRIVACY_POLICY_URL: 'https://calinium.com/privacy',
  CALINIUM_TERMS_URL: 'https://calinium.com/terms', CALINIUM_SUPPORT_URL: 'https://calinium.com/support', CALINIUM_LOG_DESTINATION: 'structured-stdout',
  CALINIUM_INCIDENT_CONFIGURATION_ID: 'incident-v1'
};
const runtimeBlocked = validatePublicProductionConfiguration(valid);
assert.equal(runtimeBlocked.status, 'NOT_READY');
assert(runtimeBlocked.issues.some((entry) => entry.code === 'public_artifact_storage_provider_health_unverified'));
assert(runtimeBlocked.issues.some((entry) => entry.code === 'public_database_provider_not_accepted'));
assert.equal(runtimeBlocked.database.implementation_status, 'DATABASE_IMPLEMENTATION_READY');
assert.equal(runtimeBlocked.database.provider_status, 'DATABASE_CONFIGURED_NOT_ACCEPTED');
assert.equal(runtimeBlocked.artifact_storage.implementation_status, 'IMPLEMENTATION_READY');
assert.equal(runtimeBlocked.artifact_storage.provider_status, 'CONFIGURED_UNVERIFIED');
const shallowHealthMustFail = validatePublicProductionConfiguration(valid, { capabilities: { durable_artifact_storage: true, durable_artifact_storage_provider_healthy: true } });
assert.equal(shallowHealthMustFail.status, 'NOT_READY');
assert.equal(shallowHealthMustFail.artifact_storage.provider_status, 'CONFIGURED_UNVERIFIED');
const ready = validatePublicProductionConfiguration(valid, { capabilities: { production_database_acceptance: {
  contract_version: 'calinium-public-postgres-acceptance-v1', acceptance_revision: 'public-postgres-backup-restore-v1',
  status: 'READY', provider: 'fly_mpg', clean_bootstrap_verified: true, migrations_verified: true,
  transaction_verified: true, backup_verified: true, restore_verified: true, readback_verified: true,
  isolation_verified: true, privacy_verified: true, acceptance_checksum: 'b'.repeat(64)
}, durable_artifact_storage_acceptance: {
  status: 'READY', provider: 'tigris', acceptance_revision: 'tigris-real-io-restore-v1', health_verified: true,
  io_verified: true, restore_verified: true, lifecycle_verified: true, immutability_verified: true, cleanup_verified: true,
  acceptance_checksum: 'a'.repeat(64)
} } });
assert.equal(ready.status, 'NOT_READY');
assert.equal(ready.database.provider_status, 'DATABASE_ACCEPTED');
assert.equal(ready.artifact_storage.provider_status, 'READY');
assert.equal(ready.theme_delivery.status, 'CLARIFICATION_REQUIRED');
assert(ready.founder_decisions.some((decision) => decision.code === 'FOUNDER_DECISION_REQUIRED'));

const contaminated = validatePublicProductionConfiguration({ ...valid, CALINIUM_DEPLOYMENT_IDENTITY: 'legacyexample-staging', CALINIUM_ALLOWED_SHOP_DOMAINS: 'fixture.myshopify.com' });
assert.equal(contaminated.status, 'NOT_READY');
assert(contaminated.issues.some((entry) => entry.code === 'public_shop_allowlist_forbidden'));
assert(contaminated.issues.some((entry) => entry.code === 'public_staging_identity_detected'));
const credentialCollision = validatePublicProductionConfiguration({ ...valid, CALINIUM_STAGING_SHOPIFY_CLIENT_ID: valid.CALINIUM_SHOPIFY_CLIENT_ID });
assert(credentialCollision.issues.some((entry) => entry.code === 'public_staging_shopify_credentials_forbidden'));

const migration = fs.readFileSync(path.join(root, 'apps/dashboard/server/storage/migrations.cjs'), 'utf8');
for (const table of ['privacy_lifecycle_operations', 'shop_data_lifecycle_states']) assert(migration.includes(table), `Missing ${table} migration.`);
const webhook = fs.readFileSync(path.join(root, 'apps/dashboard/server/shopify/webhook-service.cjs'), 'utf8');
assert(webhook.includes('ShopifyPrivacyLifecycleService'));
assert(webhook.includes('revokeShopifyConnectionRuntimeAuthority'));
const themeChanges = require('child_process').execFileSync('git', ['diff', '--name-only', '--', 'apps/theme'], { cwd: root, encoding: 'utf8' }).trim();
assert.equal(themeChanges, '', 'Public production foundation must not modify apps/theme.');

process.stdout.write('Public production isolation/privacy foundation validation passed: fail-closed Postgres and object-storage boundaries, mandatory privacy topics, lifecycle state, and staging rejection are present.\n');
