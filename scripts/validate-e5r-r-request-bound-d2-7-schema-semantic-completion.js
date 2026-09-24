#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const errors = [];
const required = [
  'ai/compiler/schema-validator.js',
  'ai/design-evaluation/index.js',
  'ai/design-evaluation/request-bound-observation-schema.js',
  'ai/design-evaluation/strict-observation-live-provider.js',
  'ai/design-evaluation/merchant-flow-d2-7.js',
  'ai/design-evaluation/merchant-flow-d2-7-failure.js',
  'ai/design-evaluation/merchant-flow-d2-7-terminal-recovery.js',
  'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
  'apps/dashboard/server/storage/dashboard-store.cjs',
  'schemas/calinium-live-concrete-observation-output.schema.json',
  'schemas/calinium-request-bound-concrete-observation-schema-provenance.schema.json',
  'schemas/calinium-merchant-flow-d2-7-failure.schema.json',
  'schemas/calinium-merchant-flow-d2-7-terminal-recovery.schema.json',
  'fixtures/e5r-r-request-bound-d2-7-schema-semantic-completion.json',
  'scripts/test-e5r-r-request-bound-d2-7-schema-semantic-completion.js',
  'scripts/validate-e5r-r-request-bound-d2-7-schema-semantic-completion.js',
  'docs/architecture/calinium-core-2-phase-e5r-r-request-bound-d2-7-schema-semantic-completion.md',
  'package.json'
];
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(source(file));
const fail = (message) => errors.push(message);

for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
for (const file of required.filter((file) => file.endsWith('.json'))) {
  if (!fs.existsSync(path.join(root, file))) continue;
  try { json(file); } catch (error) { fail(`${file} is invalid JSON: ${error.message}`); }
}

try {
  const fixture = json('fixtures/e5r-r-request-bound-d2-7-schema-semantic-completion.json');
  assert.equal(fixture.fixture_version, 'e5r-r-request-bound-d2-7-schema-semantic-completion-v1');
  assert.equal(fixture.historical_attempt.logical_attempt, 7);
  assert.equal(fixture.historical_attempt.status, 'terminal');
  assert.equal(fixture.historical_attempt.failure_category, 'd2_7_semantic_validation_failed');
  assert.equal(fixture.historical_attempt.failure_id, 'merchant-flow-d2-7-failure-6801a9404c396d1bc610');
  assert.equal(fixture.historical_attempt.failure_checksum, 'bc3828498d09ae1a8533e238c305cfc0f7f1d9284bca201999f128c10ba68370');
  assert.equal(fixture.historical_attempt.mutated_by_e5r_r, false);
  assert.equal(fixture.request_bound_contract.contract_version, 'request-bound-concrete-observation-schema-v1');
  assert.equal(fixture.request_bound_contract.merchant_cell_count, 6);
  assert.equal(fixture.request_bound_contract.historical_calibration_cell_count, 12);
  assert.equal(fixture.request_bound_contract.alternate_cell_count, 4);
  assert.equal(fixture.request_bound_contract.maximum_semantic_attempts, 2);
  assert.equal(fixture.retained_evidence.render_capture_count, 8);
  assert.equal(fixture.retained_evidence.d1_status, 'passed');
  assert.equal(fixture.retained_evidence.d1_finding_count, 0);
  for (const [name, value] of Object.entries(fixture.safety)) {
    if (typeof value === 'number') assert.equal(value, 0, `safety ${name}`);
    else assert.equal(value, false, `safety ${name}`);
  }
} catch (error) { fail(`E5R-R fixture contract failed: ${error.message}`); }

if (required.every((file) => fs.existsSync(path.join(root, file)))) {
  const builder = source('ai/design-evaluation/request-bound-observation-schema.js');
  const strict = source('ai/design-evaluation/strict-observation-live-provider.js');
  const merchant = source('ai/design-evaluation/merchant-flow-d2-7.js');
  const failure = source('ai/design-evaluation/merchant-flow-d2-7-failure.js');
  const failureSchema = source('schemas/calinium-merchant-flow-d2-7-failure.schema.json');
  const recovery = source('ai/design-evaluation/merchant-flow-d2-7-terminal-recovery.js');
  const recoverySchema = source('schemas/calinium-merchant-flow-d2-7-terminal-recovery.schema.json');
  const service = source('apps/dashboard/server/services/merchant-generation-flow-service.cjs');
  const store = source('apps/dashboard/server/storage/dashboard-store.cjs');
  const baseSchema = json('schemas/calinium-live-concrete-observation-output.schema.json');
  const docs = source('docs/architecture/calinium-core-2-phase-e5r-r-request-bound-d2-7-schema-semantic-completion.md');
  assert.equal(baseSchema.properties.cell_inspections.minItems, 12, 'historical base schema remains unchanged');
  assert.equal(baseSchema.properties.cell_inspections.maxItems, 12, 'historical base schema remains unchanged');
  for (const token of [
    'request-bound-concrete-observation-schema-v1',
    'request.cells',
    'ordered_cell_ids',
    'generated_schema_checksum',
    'inspections.minItems',
    'inspections.maxItems',
    'd2_7_schema_semantic_contract_mismatch'
  ]) if (!builder.includes(token)) fail(`request-bound schema builder omits ${token}`);
  for (const token of [
    'exactly the supplied request cells',
    'boundedCompletenessContext',
    'completenessRetryBody',
    'complete full replacement',
    'STRICT_OBSERVATION_SEMANTIC_MAX_ATTEMPTS = 2',
    'responseReceived: true',
    'schema_provenance'
  ]) if (!strict.includes(token)) fail(`strict provider omits ${token}`);
  for (const token of ['schemaContractBuilder', 'processingAttemptEvidence', 'semanticAttemptEvidence', 'completenessRetryBody']) {
    if (!merchant.includes(token)) fail(`merchant D2.7 provider omits ${token}`);
  }
  for (const token of ['schema_semantic_contract_mismatch', 'semantic_attempts', 'response_received']) {
    if (!failure.includes(token) || !failureSchema.includes(token)) fail(`future failure evidence omits ${token}`);
  }
  if (!failure.includes('sanitizedSemanticAttempts')) fail('future failure evidence omits sanitizedSemanticAttempts');
  if (!recovery.includes('sourceRemediableSemanticTerminalFailure')) fail('attempt-8 semantic terminal recovery omits its source-remediation predicate');
  if (!recovery.includes('D2_7_SEMANTIC_VALIDATION_SOURCE_REMEDIATED')
    || !recoverySchema.includes('D2_7_SEMANTIC_VALIDATION_SOURCE_REMEDIATED')) {
    fail('attempt-8 semantic terminal recovery omits its bounded diagnosis');
  }
  if (!service.includes('findLatestMerchantFlowLegacyD27LineageBinding')
    || !store.includes('findLatestMerchantFlowLegacyD27LineageBinding')) {
    fail('attempt-8 recovery cannot locate the retained authoritative lineage binding');
  }
  for (const token of [
    'merchant-flow-d2-7-failure-6801a9404c396d1bc610',
    'request-bound-concrete-observation-schema-v1',
    'Attempt 8 is not created',
    'retained prior lineage binding',
    'Deployment remains pending'
  ]) if (!docs.includes(token)) fail(`E5R-R documentation omits ${token}`);

  const productionFiles = [
    'ai/design-evaluation/request-bound-observation-schema.js',
    'ai/design-evaluation/strict-observation-live-provider.js',
    'ai/design-evaluation/merchant-flow-d2-7.js',
    'ai/design-evaluation/merchant-flow-d2-7-failure.js',
    'ai/design-evaluation/merchant-flow-d2-7-terminal-recovery.js',
    'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
    'apps/dashboard/server/storage/dashboard-store.cjs'
  ];
  const identities = [
    'prj_public-fixture-0001',
    'merchant-flow-00000000000000000001',
    'merchant-flow-job-00000000000000000001',
    'theme-artifact-00000000000000000001',
    'merchant-flow-d1-evaluation-00000000000000000001',
    'merchant-flow-d2-7-request-00000000000000000001'
  ];
  for (const file of productionFiles) for (const identity of identities) {
    if (source(file).includes(identity)) fail(`${file} hard-codes staging identity ${identity}`);
  }
}

try {
  const scripts = json('package.json').scripts || {};
  assert.ok(scripts['test:e5r-r']?.includes('test-e5r-r-request-bound-d2-7-schema-semantic-completion.js'));
  assert.equal(scripts['validate:e5r-r'], 'node scripts/validate-e5r-r-request-bound-d2-7-schema-semantic-completion.js');
} catch (error) { fail(`E5R-R package commands are invalid: ${error.message}`); }

try {
  execFileSync(process.execPath, ['scripts/test-e5r-r-request-bound-d2-7-schema-semantic-completion.js'], {
    cwd: root,
    env: { ...process.env, OPENAI_API_KEY: '', OPENAI_ORG_ID: '', OPENAI_PROJECT_ID: '', SHOPIFY_CLI_THEME_TOKEN: '', SHOPIFY_CLI_THEME_PASSWORD: '', SHOPIFY_FLAG_STORE_PASSWORD: '', NODE_NO_WARNINGS: '1' },
    stdio: 'pipe',
    timeout: 120000
  });
} catch (error) { fail(`E5R-R focused behavior failed: ${String(error.stderr || error.stdout || error.message).trim()}`); }

for (const file of required.filter((entry) => /\.(?:cjs|js)$/.test(entry))) {
  if (!fs.existsSync(path.join(root, file))) continue;
  try { execFileSync(process.execPath, ['--check', file], { cwd: root, stdio: 'pipe' }); }
  catch (error) { fail(`${file} failed JavaScript syntax validation: ${String(error.stderr || error.message).trim()}`); }
}

try {
  const changed = [...new Set([
    ...execFileSync('git', ['diff', '--name-only', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim().split('\n'),
    ...execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n')
  ].filter(Boolean))];
  const forbidden = [/^apps\/theme\//, /^ai\/architecture\//, /^ai\/design-dna\//, /^ai\/theme-generator\//, /^deployment\//, /^shopify\.app(?:\.|$)/, /^fly\./];
  const violations = changed.filter((file) => forbidden.some((pattern) => pattern.test(file)));
  if (violations.length) fail(`forbidden E5R-R scope changed: ${violations.join(', ')}`);
} catch (error) { fail(`could not inspect protected source scope: ${error.message}`); }

try { execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'pipe' }); }
catch (error) { fail(`git diff --check failed: ${String(error.stderr || error.stdout || error.message).trim()}`); }

if (errors.length) {
  process.stderr.write(`E5R-R validation failed:\n- ${errors.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('E5R-R validation passed: request-bound 6/12/4-cell strict schemas; exact allowed IDs; unchanged semantic authority; zero-call contract preflight; bounded two-attempt completion context; truthful sanitized future failure evidence; immutable attempt 7; attempt 8 absent; external API/model calls=0; Shopify calls=0; theme mutations=0.\n');
}
