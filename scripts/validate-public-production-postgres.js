#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { migrations } = require('../apps/dashboard/server/storage/migrations.cjs');
const { postgresConfiguration } = require('../apps/dashboard/server/storage/create-store.cjs');

assert.equal(migrations.length, 28);
assert.deepEqual(migrations.map((migration) => migration.version), Array.from({ length: 28 }, (_, index) => index + 1));
assert.deepEqual(postgresConfiguration({
  DATABASE_URL: 'postgresql://database.internal/calinium_public', DATABASE_SSL: 'true',
  CALINIUM_DATABASE_POOL_MAX: '10', CALINIUM_DATABASE_CONNECTION_TIMEOUT_MS: '5000',
  CALINIUM_DATABASE_IDLE_TIMEOUT_MS: '300000', CALINIUM_DATABASE_MAX_LIFETIME_SECONDS: '600',
  CALINIUM_DATABASE_STATEMENT_TIMEOUT_MS: '30000'
}, 'production'), {
  connectionString: 'postgresql://database.internal/calinium_public',
  ssl: { rejectUnauthorized: true },
  max: 10,
  idleTimeoutMillis: 300000,
  maxLifetimeSeconds: 600,
  connectionTimeoutMillis: 5000,
  statementTimeoutMillis: 30000,
  applicationName: 'calinium-public'
});
assert.throws(() => postgresConfiguration({ DATABASE_URL: 'postgresql://database.internal/calinium_public' }, 'production'), /DATABASE_SSL=true/);
assert.throws(() => postgresConfiguration({ DATABASE_URL: 'postgresql://database.internal/calinium_public?sslmode=require', DATABASE_SSL: 'true' }, 'production'), /verify-full/);
for (const file of [
  'scripts/accept-public-production-postgres-local.js',
  'schemas/calinium-public-postgres-acceptance.schema.json',
  'docs/launch/calinium-public-production-postgres-authority.md',
  'docs/launch/calinium-public-production-backup-restore-runbook.md'
]) assert.equal(fs.existsSync(path.join(root, file)), true, `${file} must exist`);
const digest = 'a'.repeat(64);
const acceptance = {
  contract_version: 'calinium-public-postgres-acceptance-v1', acceptance_revision: 'local-postgres-clean-bootstrap-restore-v1',
  status: 'READY', provider: 'local_postgres', postgres_major_version: 16, migration_count: 28,
  clean_bootstrap_verified: true, repeat_migration_verified: true, transaction_rollback_verified: true,
  restart_readback_verified: true, backup_format: 'pg_dump-custom', backup_checksum_sha256: digest,
  restore_verified: true, source_fixture_checksum: digest, restored_fixture_checksum: digest,
  restored_counts: { users: 1, organizations: 1, projects: 1, auth_sessions: 1, merchant_flow_jobs: 1, privacy_lifecycle_operations: 1, durable_object_references: 1 },
  privacy_verified: true, tenancy_isolation_verified: true, durable_reference_verified: true,
  session_state_verified: true, production_resource_created: false, acceptance_checksum: digest
};
assert.deepEqual(createSchemaValidator(root).validateFile(acceptance, 'schemas/calinium-public-postgres-acceptance.schema.json', 'local Postgres acceptance'), []);
process.stdout.write('Public PostgreSQL source authority validation passed.\n');
