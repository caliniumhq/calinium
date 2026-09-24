#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const required = [
  'ai/merchant-flow/merchant-flow-preview-provenance-recovery.js',
  'apps/dashboard/server/services/merchant-flow-preview-binding-resolver.cjs',
  'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
  'apps/dashboard/server/storage/migrations.cjs',
  'apps/dashboard/server/storage/dashboard-store.cjs',
  'apps/dashboard/server/dashboard-api.cjs',
  'apps/dashboard/src/components/creative-director/OperatorReadinessDiagnostics.jsx',
  'fixtures/merchant-flow-preview-binding.json',
  'schemas/calinium-merchant-flow-preview-provenance-recovery.schema.json',
  'scripts/test-f1-e-legacy-preview-source-provenance-recovery.js',
  'docs/architecture/calinium-core-2-phase-f1-e-legacy-preview-source-provenance-recovery.md'
];
for (const file of required) assert.ok(fs.existsSync(path.join(root, file)), `Missing ${file}`);

const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const contract = source('ai/merchant-flow/merchant-flow-preview-provenance-recovery.js');
for (const token of [
  'merchant-flow-preview-provenance-recovery-v1',
  'merchant-flow-preview-provenance-recovery-resolver-v1',
  'historical_render_source_revision_status',
  'unavailable_legacy',
  'binding_source_revision',
  'recovery_source_revision',
  'assertMerchantFlowPreviewProvenanceRecoveryForFlow',
  'source_revision_conflict'
]) assert.ok(contract.includes(token), `Missing contract token ${token}`);

const binding = source('ai/merchant-flow/merchant-flow-preview-binding.js');
assert.match(binding, /source revision of the runtime that performed[\s\S]*accepted render/);
assert.match(binding, /validSourceRevision\(binding\?\.provenance\?\.source_revision\)/);
const resolver = source('apps/dashboard/server/services/merchant-flow-preview-binding-resolver.cjs');
for (const token of ['legacySourceRevisions', 'defaultLegacyEvidenceLoader', 'prepareRecovery', 'createRecovery', 'legacy_provenance_recovery']) assert.ok(resolver.includes(token), `Missing resolver token ${token}`);
assert.doesNotMatch(resolver, /2000000000000000000000000000000000000006/);

const api = source('apps/dashboard/server/dashboard-api.cjs');
assert.match(api, /recover-preview-provenance/);
assert.match(api, /embeddedRequest\(request, \{ required: true \}\)/);
assert.match(api, /historical_render_source_revision/);
const migration = source('apps/dashboard/server/storage/migrations.cjs');
assert.match(migration, /version:\s*25/);
assert.match(migration, /merchant_flow_preview_provenance_recoveries/);
assert.match(migration, /UNIQUE\(flow_id, artifact_id, render_request_id\)/);

const config = JSON.parse(source('config/calinium-analysis-first-merchant-experience.json'));
assert.equal(config.analysis_first_merchant_experience_enabled, false);
assert.equal(config.activation_scope, 'disabled');
assert.equal(config.automatic_repair_allowed, false);
assert.equal(config.automatic_theme_action_allowed, false);

const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/OPENAI|SHOPIFY.*(?:TOKEN|SECRET|PASSWORD)|FLY_(?:API|ACCESS)_TOKEN/i.test(key)));
const focused = spawnSync(process.execPath, ['scripts/test-f1-e-legacy-preview-source-provenance-recovery.js'], { cwd: root, encoding: 'utf8', timeout: 60000, env: cleanEnv });
if (focused.status !== 0) throw new Error(focused.stderr || focused.stdout || 'F1-E focused tests failed.');
assert.match(focused.stdout, /13\/13 F1-E/);

const dashboard = spawnSync('npm', ['--prefix', 'apps/dashboard', 'test', '--', '--run',
  'tests/f1-e-preview-provenance-recovery-control.test.jsx',
  'tests/f1-e-preview-provenance-recovery-api.test.js',
  'tests/f1-e-shared-preview-projection.test.js',
  'tests/f1-d-authoritative-preview-binding.test.js',
  'src/tests/f1-d-preview-availability.test.jsx'
], { cwd: root, encoding: 'utf8', timeout: 90000, env: cleanEnv });
if (dashboard.status !== 0) throw new Error(dashboard.stderr || dashboard.stdout || 'F1-E dashboard tests failed.');
assert.match(dashboard.stdout, /Test Files\s+5 passed \(5\)/);

process.stdout.write('F1-E legacy preview source-provenance recovery validation passed.\n');
process.stdout.write('Audit classification: D. HISTORICAL_RENDER_SOURCE_REVISION_NOT_PROVABLE\n');
process.stdout.write('Provider calls: 0; Shopify calls/writes: 0; theme mutations: 0.\n');
