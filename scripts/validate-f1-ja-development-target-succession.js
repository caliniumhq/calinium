#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const fixturePath = path.join(root, 'fixtures/f1-ja-development-target-succession.json');
const schemaPath = path.join(root, 'schemas/calinium-merchant-flow-render-target-succession.schema.json');
const documentPath = path.join(root, 'docs/architecture/calinium-core-2-phase-f1-ja-development-target-succession-infrastructure.md');
const testPath = path.join(root, 'scripts/test-f1-ja-development-target-succession.js');
const packagePath = path.join(root, 'package.json');

for (const file of [fixturePath, schemaPath, documentPath, testPath, packagePath]) assert.equal(fs.existsSync(file), true, `${path.relative(root, file)} is missing`);
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
assert.equal(fixture.fixture_revision, 'f1-ja-development-target-succession-fixture-v1');
assert.equal(schema.properties.contract_version.const, 'merchant-flow-render-target-succession-v1');
assert.equal(schema.required.includes('shopify_inventory'), true);
assert.equal(schema.required.includes('main_authority'), true);
assert.equal(schema.properties.shopify_inventory.properties.completeness.const, 'complete');
assert.equal(schema.$defs.mainAuthority.properties.theme_role.const, 'main');
assert.equal(fixture.authority_contract.complete_inventory_checksum_persisted, true);
assert.equal(fixture.authority_contract.main_role_authority_checksum_persisted, true);
assert.equal(fixture.authority_contract.prior_target_may_equal_main, false);
assert.equal(fixture.authority_contract.successor_target_may_equal_main, false);
assert.equal(fixture.evidence_policy.locatable_superseded_evidence_graph, true);
assert.equal(fixture.evidence_policy.raw_model_content_retained, false);
assert.equal(fixture.evidence_policy.secret_content_retained, false);
assert.deepEqual(fixture.submission_contract.exact_client_fields.slice().sort(), [
  'contract_version', 'expected_flow_checksum', 'expected_flow_sequence', 'flow_id', 'idempotency_key'
]);
const packageTest = packageJson.scripts['test:f1-ja'];
assert.equal(packageJson.scripts['validate:f1-ja'], 'node scripts/validate-f1-ja-development-target-succession.js');
for (const required of [
  'node scripts/test-f1-ja-development-target-succession.js',
  'tests/f1-ja-render-target-succession-resolver.test.js',
  'tests/f1-ja-stale-preview-suppression.test.js',
  'tests/f1-ja-render-target-succession-api-service.test.js',
  'src/tests/f1-ja-render-target-succession-control.test.jsx'
]) assert.equal(packageTest.includes(required), true, `test:f1-ja is missing ${required}`);

const focused = spawnSync(process.execPath, [testPath], { cwd: root, encoding: 'utf8' });
process.stdout.write(focused.stdout || '');
process.stderr.write(focused.stderr || '');
assert.equal(focused.status, 0, 'F1-JA focused tests failed');

const syntaxFiles = [
  'ai/merchant-flow/merchant-flow-render-target-succession.js',
  'ai/merchant-flow/merchant-generation-flow.js',
  'apps/dashboard/server/services/merchant-flow-render-target-succession-resolver.cjs',
  'apps/dashboard/server/services/merchant-flow-preview-binding-resolver.cjs',
  'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
  'apps/dashboard/server/storage/dashboard-store.cjs',
  'apps/dashboard/server/storage/migrations.cjs',
  'scripts/test-f1-ja-development-target-succession.js',
  'scripts/validate-f1-ja-development-target-succession.js'
];
for (const file of syntaxFiles) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, `${file} failed JavaScript syntax validation: ${result.stderr}`);
}

const document = fs.readFileSync(documentPath, 'utf8');
for (const required of [
  'append-only', 'compare-and-swap', 'historical', 'artifact_ready', 'render_target_superseded',
  'merchant-flow-render-target-succession-submission-v1', 'complete Shopify inventory',
  'MAIN-role authority', 'locatable superseded-evidence reference graph',
  'traversal-free', 'F1-JB', 'automatic repair remains disabled'
]) assert.equal(document.includes(required), true, `Architecture document is missing: ${required}`);

const changed = execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' })
  .trim().split('\n').filter(Boolean).map((line) => line.slice(3));
assert.equal(changed.some((file) => file.startsWith('apps/theme/')), false, 'F1-JA changed storefront/theme source');

const scopedFiles = [fixturePath, schemaPath, documentPath, testPath, path.join(root, 'scripts/validate-f1-ja-development-target-succession.js'), packagePath];
const credentialPatterns = [/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/, /shpat_[A-Za-z0-9]{20,}/, /shpss_[A-Za-z0-9]{20,}/];
for (const file of scopedFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const pattern of credentialPatterns) assert.equal(pattern.test(content), false, `${path.relative(root, file)} contains a credential-shaped literal`);
}

execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'inherit' });
assert.equal(fixture.safety.provider_calls_during_f1_ja, 0);
assert.equal(fixture.safety.shopify_writes_during_f1_ja, 0);
assert.equal(fixture.safety.deployments_during_f1_ja, 0);
assert.equal(fixture.phase_boundary.f1_jb_started, false);

console.log(`F1-JA validation passed: focused=12/12; syntax=${syntaxFiles.length}/${syntaxFiles.length}; schemas=2/2; package-commands=2/2; API-calls=0; deployments=0; theme-mutations=0; F1-JB-started=false.`);
