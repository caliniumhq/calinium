#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const { Client } = require(path.join(root, 'apps/dashboard/node_modules/pg'));
const { createDashboardStore } = require('../apps/dashboard/server/storage/create-store.cjs');
const { migrations } = require('../apps/dashboard/server/storage/migrations.cjs');

const CONTRACT_VERSION = 'calinium-public-postgres-acceptance-v1';
const ACCEPTANCE_REVISION = 'local-postgres-clean-bootstrap-restore-v1';
const FIXTURE = Object.freeze({
  user: 'usr_database_acceptance',
  organization: 'org_database_acceptance',
  workspace: 'wsp_database_acceptance',
  membership: 'mem_database_acceptance',
  project: 'prj_database_acceptance',
  connection: 'shp_database_acceptance',
  session: 'ses_database_acceptance',
  flow: 'merchant-flow-database-acceptance',
  job: 'merchant-flow-job-database-acceptance',
  preview: 'preview-database-acceptance',
  webhook: 'webhook-database-acceptance',
  delivery: 'delivery-database-acceptance',
  privacy: 'privacy-database-acceptance',
  object: 'obj_database_acceptance',
  shop: 'database-acceptance.myshopify.com',
  timestamp: '2026-09-22T00:00:00.000Z'
});

function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function withDatabase(url, name) { const parsed = new URL(url); parsed.pathname = `/${name}`; return parsed.href; }
function quoteIdentifier(value) { assert.match(value, /^[a-z][a-z0-9_]+$/); return `"${value}"`; }

function localAdminUrl() {
  const configured = String(process.env.CALINIUM_POSTGRES_ACCEPTANCE_ADMIN_URL || '').trim();
  assert(configured, 'CALINIUM_POSTGRES_ACCEPTANCE_ADMIN_URL is required.');
  const parsed = new URL(configured);
  assert(['postgres:', 'postgresql:'].includes(parsed.protocol), 'The acceptance admin URL must use PostgreSQL.');
  assert(['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname), 'The source-only acceptance may target local PostgreSQL only.');
  return parsed.href;
}

function postgresBinary(name) {
  const configured = String(process.env.CALINIUM_POSTGRES_BIN_DIRECTORY || '').trim();
  const directories = [configured, '/usr/local/opt/postgresql@16/bin', '/opt/homebrew/opt/postgresql@16/bin'].filter(Boolean);
  const resolved = directories.map((directory) => path.join(directory, name)).find((candidate) => fs.existsSync(candidate));
  assert(resolved, `${name} from PostgreSQL 16 is required for local backup/restore acceptance.`);
  return resolved;
}

function postgresEnvironment(url) {
  const parsed = new URL(url);
  return {
    ...process.env,
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || '5432',
    PGUSER: decodeURIComponent(parsed.username || ''),
    PGPASSWORD: decodeURIComponent(parsed.password || ''),
    PGSSLMODE: 'disable'
  };
}

function runPostgresCli(binary, args, url) {
  const result = spawnSync(binary, args, { env: postgresEnvironment(url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) {
    const error = new Error(`${path.basename(binary)} failed during isolated local acceptance.`);
    error.code = 'local_postgres_acceptance_cli_failed';
    throw error;
  }
}

function storeEnv(url) {
  return {
    NODE_ENV: 'test',
    CALINIUM_ENVIRONMENT: 'test',
    CALINIUM_STORAGE_DRIVER: 'postgres',
    DATABASE_URL: url,
    DATABASE_SSL: 'false',
    CALINIUM_DATABASE_POOL_MAX: '4',
    CALINIUM_DATABASE_CONNECTION_TIMEOUT_MS: '5000',
    CALINIUM_DATABASE_IDLE_TIMEOUT_MS: '5000',
    CALINIUM_DATABASE_MAX_LIFETIME_SECONDS: '600',
    CALINIUM_DATABASE_STATEMENT_TIMEOUT_MS: '30000'
  };
}

async function counts(store) {
  const tables = ['users', 'organizations', 'projects', 'auth_sessions', 'merchant_flow_jobs', 'privacy_lifecycle_operations', 'durable_object_references'];
  const result = {};
  for (const table of tables) result[table] = Number((await store.driver.get(`SELECT COUNT(*) AS count FROM ${table}`)).count);
  return result;
}

async function seedFixture(store) {
  const at = FIXTURE.timestamp;
  await store.transaction(async (transaction) => {
    await transaction.createUser({ id: FIXTURE.user, email: 'database-acceptance@example.invalid', full_name: 'Database Acceptance', password_hash: 'not-a-real-password-hash', status: 'active', created_at: at, updated_at: at });
    await transaction.createOrganization({ id: FIXTURE.organization, name: 'Database Acceptance', slug: 'database-acceptance', created_by_user_id: FIXTURE.user, created_at: at, updated_at: at });
    await transaction.createWorkspace({ id: FIXTURE.workspace, organization_id: FIXTURE.organization, name: 'Database Acceptance', created_at: at, updated_at: at });
    await transaction.createMembership({ id: FIXTURE.membership, organization_id: FIXTURE.organization, user_id: FIXTURE.user, role: 'owner', status: 'active', created_at: at });
    await transaction.createProject({ id: FIXTURE.project, organization_id: FIXTURE.organization, workspace_id: FIXTURE.workspace, name: 'Database Acceptance', business_name: 'Database Acceptance', country: 'MA', website_url: null, shopify_store_url: `https://${FIXTURE.shop}`, icon: null, status: 'active', created_by_user_id: FIXTURE.user, created_at: at, updated_at: at });
    await transaction.createAuthSession({ id: FIXTURE.session, user_id: FIXTURE.user, token_hash: sha256('database-acceptance-session'), created_at: at, expires_at: '2026-09-23T00:00:00.000Z', last_seen_at: at });
    await transaction.createShopifyConnection({ id: FIXTURE.connection, organization_id: FIXTURE.organization, shop_domain: FIXTURE.shop, shop_gid: 'gid://shopify/Shop/1', display_name: 'Database Acceptance', storefront_url: `https://${FIXTURE.shop}`, primary_market: {}, granted_scopes: [], connection_status: 'revoked', credential_status: 'revoked', health: {}, last_synced_at: null, connected_by_user_id: FIXTURE.user, connected_at: at, disconnected_at: at, created_at: at, updated_at: at });
    await transaction.assignShopifyConnectionToProject({ id: 'psc_database_acceptance', project_id: FIXTURE.project, connection_id: FIXTURE.connection, assigned_by_user_id: FIXTURE.user, assignment_status: 'disconnected', created_at: at, updated_at: at });
    await transaction.createCreativeDirector({ id: FIXTURE.flow, project_id: FIXTURE.project, stage: 'preview', conversation_state: {}, transcript: [], creative_brief: {}, store_strategy: {}, review: {}, merchant_profile: {}, resource_plan: {}, generation_context: {}, generation_state: { status: 'completed' }, preview_state: { status: 'ready' }, content_plan: {}, preset_selection: null, created_at: at, updated_at: at });
    await transaction.upsertShopifyPreviewTarget({ id: FIXTURE.preview, project_id: FIXTURE.project, connection_id: FIXTURE.connection, remote_theme_gid: 'gid://shopify/OnlineStoreTheme/1', remote_theme_id: '1', theme_name: 'Database Acceptance', theme_role: 'development', preview_url: 'https://example.invalid/preview', status: 'ready', generated_build_id: 'build_database_acceptance', created_at: at, updated_at: at });
    await transaction.createMerchantFlowJob({ id: FIXTURE.job, flow_id: FIXTURE.flow, project_id: FIXTURE.project, organization_id: FIXTURE.organization, job_kind: 'render_qa', identity_checksum: sha256('database-acceptance-job'), status: 'retryable', attempt: 2, lease_epoch: 3, payload: { artifact_id: 'theme-artifact-database-acceptance' }, result: { accepted: false }, lease_token: null, lease_expires_at: null, failure_category: 'acceptance_fixture', failure_message: 'synthetic fixture', cancellation_requested_at: null, cancelled_at: null, created_at: at, updated_at: at, completed_at: null });
    await transaction.createShopifyWebhookDelivery({ id: FIXTURE.delivery, connection_id: FIXTURE.connection, webhook_id: FIXTURE.webhook, topic: 'shop/redact', shop_domain: FIXTURE.shop, payload_checksum: sha256('database-acceptance-webhook'), processing_status: 'processed', received_at: at, processed_at: at, error_code: null });
    await transaction.createPrivacyLifecycleOperation({ id: FIXTURE.privacy, webhook_delivery_id: FIXTURE.delivery, connection_id: FIXTURE.connection, organization_id: FIXTURE.organization, canonical_shop: FIXTURE.shop, topic: 'shop/redact', subject_reference_digest: sha256(FIXTURE.shop), request_checksum: sha256('database-acceptance-privacy'), operation_status: 'retention_pending', disposition_code: 'founder_decision_required', result: { retention: 'FOUNDER_DECISION_REQUIRED' }, created_at: at, updated_at: at, completed_at: null });
    await transaction.upsertShopDataLifecycleState({ canonical_shop: FIXTURE.shop, connection_id: FIXTURE.connection, organization_id: FIXTURE.organization, lifecycle_state: 'redaction_requested', retention_policy_revision: 'FOUNDER_DECISION_REQUIRED', uninstall_at: null, redaction_requested_at: at, purge_after: null, purged_at: null, reinstall_count: 0, created_at: at, updated_at: at });
    await transaction.createDurableObjectReference({ id: FIXTURE.object, reference_version: 'calinium-durable-object-reference-v1', organization_id: FIXTURE.organization, project_id: FIXTURE.project, connection_id: FIXTURE.connection, canonical_shop: FIXTURE.shop, storage_provider_kind: 'object', object_key: 'public/organizations/database-acceptance/evidence.json', sha256: sha256('database-acceptance-object'), bytes: 26, content_type: 'application/json', object_class: 'operator_evidence', evidence_kind: 'database_restore_acceptance', evidence_identity: 'database-restore-acceptance', lineage_identity: FIXTURE.flow, local_reference: null, retention_classification: 'FOUNDER_DECISION_REQUIRED', immutable: true, lifecycle_state: 'active', created_at: at, deleted_at: null });
  });
}

async function fixtureSnapshot(store) {
  const [project, job, preview, lifecycle, privacy, object, activeSession, revokedSession] = await Promise.all([
    store.findProjectForOrganization(FIXTURE.project, FIXTURE.organization),
    store.findMerchantFlowJob(FIXTURE.job, FIXTURE.project, FIXTURE.organization),
    store.findShopifyPreviewTarget(FIXTURE.project, FIXTURE.connection),
    store.findShopDataLifecycleState(FIXTURE.shop),
    store.findPrivacyLifecycleOperationByDelivery(FIXTURE.delivery),
    store.findDurableObjectReference(FIXTURE.object, FIXTURE.project, FIXTURE.organization),
    store.driver.get('SELECT id, user_id, token_hash FROM auth_sessions WHERE id = $1', [FIXTURE.session]),
    store.driver.get('SELECT id FROM auth_sessions WHERE token_hash = $1', [sha256('revoked-database-acceptance-session')])
  ]);
  assert(project && job && preview && lifecycle && privacy && object && activeSession);
  assert.equal(revokedSession, null);
  assert.equal(await store.findProjectForOrganization(FIXTURE.project, 'org_other'), null);
  assert.equal(await store.findMerchantFlowJob(FIXTURE.job, FIXTURE.project, 'org_other'), null);
  assert.equal(await store.findDurableObjectReference(FIXTURE.object, FIXTURE.project, 'org_other'), null);
  assert.equal(await store.findShopifyConnectionForOrganization(FIXTURE.connection, 'org_other'), null);
  const canonical = {
    project: { id: project.id, organization_id: project.organization_id, status: project.status },
    job: { id: job.id, flow_id: job.flow_id, status: job.status, attempt: job.attempt, lease_epoch: job.lease_epoch, identity_checksum: job.identity_checksum },
    preview: { id: preview.id, remote_theme_id: preview.remote_theme_id, status: preview.status },
    lifecycle: { canonical_shop: lifecycle.canonical_shop, lifecycle_state: lifecycle.lifecycle_state, retention_policy_revision: lifecycle.retention_policy_revision, purge_after: lifecycle.purge_after },
    privacy: { id: privacy.id, operation_status: privacy.operation_status, disposition_code: privacy.disposition_code, request_checksum: privacy.request_checksum },
    object: { id: object.id, object_key: object.object_key, checksum_sha256: object.checksum_sha256, lifecycle_state: object.lifecycle_state, immutable: object.immutable },
    session: { id: activeSession.id, user_id: activeSession.user_id, token_hash: activeSession.token_hash },
    revoked_session_present: Boolean(revokedSession)
  };
  return { canonical, checksum: sha256(JSON.stringify(canonical)) };
}

async function main() {
  const adminUrl = localAdminUrl();
  const suffix = crypto.randomBytes(6).toString('hex');
  const sourceName = `calinium_acceptance_source_${suffix}`;
  const restoreName = `calinium_acceptance_restore_${suffix}`;
  const sourceUrl = withDatabase(adminUrl, sourceName);
  const restoreUrl = withDatabase(adminUrl, restoreName);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-postgres-acceptance-'));
  const backupPath = path.join(temporary, 'database.dump');
  const admin = new Client({ connectionString: adminUrl, ssl: false, application_name: 'calinium-postgres-acceptance-admin' });
  let adminConnected = false;
  let source;
  let restored;
  try {
    await admin.connect(); adminConnected = true;
    await admin.query(`CREATE DATABASE ${quoteIdentifier(sourceName)}`);
    await admin.query(`CREATE DATABASE ${quoteIdentifier(restoreName)}`);

    source = await createDashboardStore({ root, env: storeEnv(sourceUrl) });
    assert.deepEqual(await counts(source), { users: 0, organizations: 0, projects: 0, auth_sessions: 0, merchant_flow_jobs: 0, privacy_lifecycle_operations: 0, durable_object_references: 0 });
    assert.equal(Number((await source.driver.get('SELECT COUNT(*) AS count FROM schema_migrations')).count), migrations.length);
    await source.migrate(FIXTURE.timestamp);
    assert.equal(Number((await source.driver.get('SELECT COUNT(*) AS count FROM schema_migrations')).count), migrations.length);

    await assert.rejects(source.transaction(async (transaction) => {
      await transaction.createUser({ id: 'usr_transaction_rollback', email: 'rollback@example.invalid', full_name: null, password_hash: 'not-real', status: 'active', created_at: FIXTURE.timestamp, updated_at: FIXTURE.timestamp });
      throw new Error('intentional acceptance rollback');
    }), /intentional acceptance rollback/);
    assert.equal(await source.findUserById('usr_transaction_rollback'), null);

    await seedFixture(source);
    const sourceSnapshot = await fixtureSnapshot(source);
    await source.driver.close(); source = null;

    source = await createDashboardStore({ root, env: storeEnv(sourceUrl) });
    const restartSnapshot = await fixtureSnapshot(source);
    assert.equal(restartSnapshot.checksum, sourceSnapshot.checksum);
    await source.driver.close(); source = null;

    runPostgresCli(postgresBinary('pg_dump'), ['--format=custom', '--no-owner', '--no-privileges', '--file', backupPath, sourceName], adminUrl);
    const backupChecksum = sha256(fs.readFileSync(backupPath));
    runPostgresCli(postgresBinary('pg_restore'), ['--no-owner', '--no-privileges', '--exit-on-error', '--dbname', restoreName, backupPath], adminUrl);

    restored = await createDashboardStore({ root, env: storeEnv(restoreUrl) });
    const restoredSnapshot = await fixtureSnapshot(restored);
    assert.equal(restoredSnapshot.checksum, sourceSnapshot.checksum);
    assert.equal(Number((await restored.driver.get('SELECT COUNT(*) AS count FROM schema_migrations')).count), migrations.length);
    const restoredCounts = await counts(restored);
    await restored.driver.close(); restored = null;

    restored = await createDashboardStore({ root, env: storeEnv(restoreUrl) });
    assert.equal((await fixtureSnapshot(restored)).checksum, sourceSnapshot.checksum);

    const report = {
      contract_version: CONTRACT_VERSION,
      acceptance_revision: ACCEPTANCE_REVISION,
      status: 'READY',
      provider: 'local_postgres',
      postgres_major_version: Number((await restored.driver.get("SELECT current_setting('server_version_num')::integer / 10000 AS major")).major),
      migration_count: migrations.length,
      clean_bootstrap_verified: true,
      repeat_migration_verified: true,
      transaction_rollback_verified: true,
      restart_readback_verified: true,
      backup_format: 'pg_dump-custom',
      backup_checksum_sha256: backupChecksum,
      restore_verified: true,
      source_fixture_checksum: sourceSnapshot.checksum,
      restored_fixture_checksum: restoredSnapshot.checksum,
      restored_counts: restoredCounts,
      privacy_verified: true,
      tenancy_isolation_verified: true,
      durable_reference_verified: true,
      session_state_verified: true,
      production_resource_created: false
    };
    report.acceptance_checksum = sha256(JSON.stringify(report));
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    if (source) await source.driver.close().catch(() => {});
    if (restored) await restored.driver.close().catch(() => {});
    if (adminConnected) {
      for (const name of [sourceName, restoreName]) {
        await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [name]).catch(() => {});
        await admin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(name)}`).catch(() => {});
      }
      await admin.end().catch(() => {}); adminConnected = false;
    }
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ status: 'NOT_READY', code: error?.code || 'local_postgres_acceptance_failed' })}\n`);
  process.exitCode = 1;
});
