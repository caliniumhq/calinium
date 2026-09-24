#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const required = [
  'apps/dashboard/server/services/merchant-flow-controlled-readiness.cjs',
  'apps/dashboard/server/services/merchant-flow-controlled-readiness-snapshot.cjs',
  'apps/dashboard/server/services/merchant-flow-controlled-deep-attestation.cjs',
  'apps/dashboard/server/workers/controlled-readiness-deep-attestation-worker.cjs',
  'fixtures/e5r-m-bounded-readiness-deep-attestation.json',
  'schemas/calinium-controlled-beta-readiness-snapshot.schema.json',
  'scripts/test-e5r-m-bounded-readiness-deep-attestation.js',
  'scripts/validate-e5r-m-bounded-readiness-deep-attestation.js',
  'docs/architecture/calinium-core-2-phase-e5r-m-bounded-readiness-deep-attestation.md'
];
const errors = [];
function fail(message) { errors.push(message); }
function source(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function json(file) { return JSON.parse(source(file)); }

for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
for (const file of ['fixtures/e5r-m-bounded-readiness-deep-attestation.json', 'schemas/calinium-controlled-beta-readiness-snapshot.schema.json', 'package.json']) {
  try { json(file); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); }
}

try {
  execFileSync(process.execPath, ['scripts/test-e5r-m-bounded-readiness-deep-attestation.js'], {
    cwd: root,
    env: { ...process.env, OPENAI_API_KEY: '', SHOPIFY_CLI_THEME_TOKEN: '' },
    stdio: 'pipe',
    timeout: 30000
  });
} catch (error) {
  fail(`E5R-M behavioral tests failed: ${String(error.stderr || error.stdout || error.message).trim()}`);
}

let fixture = null;
let schema = null;
try {
  fixture = json('fixtures/e5r-m-bounded-readiness-deep-attestation.json');
  const durations = fixture.release_7_regression.commands.map((entry) => entry.duration_ms);
  assert.deepEqual(durations, [2179, 1874, 1774]);
  assert.equal(durations.reduce((sum, value) => sum + value, 0), 5827);
  assert.equal(fixture.release_7_regression.subtotal_ms, 5827);
  assert.equal(fixture.release_7_regression.fly_timeout_ms, 5000);
  assert.equal(fixture.release_7_regression.legacy_endpoint, '/api/ready');
  assert.equal(fixture.fly_health_model.after, '/api/ready');
  assert.equal(fixture.fly_health_model.timeout_increased, false);
  assert.equal(fixture.safety.openai_calls, 0);
  assert.equal(fixture.safety.shopify_calls, 0);
  assert.equal(fixture.safety.shopify_write_allowed, false);
  assert.equal(fixture.safety.live_theme_mutation_allowed, false);
  assert.equal(fixture.preserved_identity.render_job_id, 'merchant-flow-job-00000000000000000001');
  assert.equal(fixture.preserved_identity.render_job_state, 'retryable');
} catch (error) { fail(`E5R-M fixture contract failed: ${error.message}`); }

try {
  schema = json('schemas/calinium-controlled-beta-readiness-snapshot.schema.json');
  assert.equal(schema.properties.snapshot_revision.const, 'controlled-beta-readiness-snapshot-v1');
  assert.equal(schema.properties.deep_attestation_revision.const, 'controlled-beta-deep-attestation-v1');
  assert.deepEqual(schema.properties.status.enum, ['INITIALIZING', 'READY', 'NOT_READY']);
  assert.equal(schema.properties.binding.$ref, '#/$defs/binding');
  assert.equal(schema.$defs.binding.properties.shopify_cli_expected_version.const, '4.6.0');
  assert.equal(schema.$defs.binding.properties.shopify_cli_auto_upgrade_policy.const, 'disabled');
  assert.equal(schema.$defs.binding.properties.development_targets.items.properties.expected_theme_role.const, 'development');
  assert.equal(schema.additionalProperties, false);
} catch (error) { fail(`Readiness snapshot schema contract failed: ${error.message}`); }

if (fs.existsSync(path.join(root, 'fly.staging.toml.example'))) {
  const fly = source('fly.staging.toml.example');
  const checkStart = fly.indexOf('[[http_service.checks]]');
  const nextTable = checkStart < 0 ? -1 : fly.indexOf('\n[[', checkStart + '[[http_service.checks]]'.length);
  const check = checkStart < 0 ? '' : fly.slice(checkStart, nextTable < 0 ? undefined : nextTable);
  if (!/path\s*=\s*"\/api\/ready"/.test(check)) fail('Dedicated staging Fly health check no longer targets /api/ready.');
  if (!/timeout\s*=\s*"5s"/.test(check)) fail('Dedicated staging Fly readiness timeout is no longer exactly 5s.');
  if (!/interval\s*=\s*"15s"/.test(check)) fail('Dedicated staging Fly readiness interval is no longer exactly 15s.');
  if (!/grace_period\s*=\s*"30s"/.test(check)) fail('Dedicated staging Fly readiness grace period is no longer exactly 30s.');
  try {
    const flyDiff = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'fly.staging.toml.example'], { cwd: root, encoding: 'utf8' }).trim();
    if (flyDiff) fail('E5R-M changed dedicated Fly configuration instead of retaining the approved /api/ready 5s model.');
  } catch (error) { fail(`Could not verify dedicated Fly configuration scope: ${error.message}`); }
}

if (required.slice(0, 4).every((file) => fs.existsSync(path.join(root, file)))) {
  const snapshot = source('apps/dashboard/server/services/merchant-flow-controlled-readiness-snapshot.cjs');
  const deep = source('apps/dashboard/server/services/merchant-flow-controlled-deep-attestation.cjs');
  const worker = source('apps/dashboard/server/workers/controlled-readiness-deep-attestation-worker.cjs');
  const readiness = source('apps/dashboard/server/services/merchant-flow-controlled-readiness.cjs');
  for (const value of [
    'controlled-beta-readiness-snapshot-v1', 'DEFAULT_SNAPSHOT_TTL_MS', 'binding_checksum',
    'process_generation_id', 'controlled_beta_readiness_snapshot_mismatch',
    'controlled_beta_readiness_snapshot_stale', 'requestRefresh', 'inFlight'
  ]) if (!snapshot.includes(value)) fail(`Snapshot orchestration omits ${value}`);
  for (const value of ['controlled-beta-deep-attestation-v1', 'sharedCliPromise', 'workerRunner', 'shopify_cli_runtime_state']) {
    if (!deep.includes(value)) fail(`Deep-attestation orchestration omits ${value}`);
  }
  for (const value of ['worker_threads', 'new Worker', 'if (!isMainThread)', 'runtime.attestRuntimeStateReadiness()', 'sanitizeAttestation']) {
    if (!worker.includes(value)) fail(`Off-main-thread CLI attestation omits ${value}`);
  }
  if (/spawnSync\s*\(/.test(snapshot) || /spawnSync\s*\(/.test(deep)) fail('Snapshot/deep coordinator directly performs a blocking CLI process.');
  if (!readiness.includes('signal = null') || !readiness.includes('assertNotAborted')) fail('Controlled readiness probes are not bounded by cancellation.');
}

for (const file of [
  'apps/dashboard/server/dashboard-api.cjs',
  'apps/dashboard/server/dashboard-services.cjs',
  'apps/dashboard/server/server.cjs',
  'ai/storefront-render/shopify-development-runtime.js',
  'ai/storefront-render/shopify-cli-runtime.js'
]) {
  if (!fs.existsSync(path.join(root, file))) fail(`missing integration source ${file}`);
}

if (fs.existsSync(path.join(root, 'apps/dashboard/server/dashboard-api.cjs'))) {
  const api = source('apps/dashboard/server/dashboard-api.cjs');
  const healthBody = api.slice(api.indexOf("pathname === '/api/health'"), api.indexOf("pathname === '/api/shopify/oauth/callback'"));
  if (!healthBody.includes("status: 'ok'")) fail('/api/health no longer retains liveness-only status.');
  for (const forbidden of ['attestReadiness', 'attestRuntimeStateReadiness', 'listResourcePage', 'OPENAI']) {
    if (healthBody.includes(forbidden)) fail(`Health/readiness route directly invokes forbidden deep work: ${forbidden}`);
  }
  if (!api.includes('readiness/refresh') || !api.includes('status: 202')) fail('Protected operator refresh is not an explicit asynchronous 202 operation.');
}

if (fs.existsSync(path.join(root, 'apps/dashboard/server/dashboard-services.cjs'))) {
  const services = source('apps/dashboard/server/dashboard-services.cjs');
  const readinessBody = services.slice(services.indexOf('async readiness()'), services.indexOf('async close()'));
  const betaReadinessBody = readinessBody.slice(readinessBody.indexOf('const beta = await checkControlledBetaReadiness()'));
  if (!readinessBody.includes('checkControlledBetaReadiness')) fail('Public readiness does not project the controlled snapshot.');
  if (!readinessBody.includes("if (!merchantFlowBetaEnabled) return { ...(await baseReadiness()), controlled_beta: 'disabled' };")) {
    fail('Public readiness no longer isolates legacy base readiness to the beta-disabled fallback.');
  }
  for (const forbidden of ['attestReadiness', 'attestRuntimeStateReadiness', 'verifyConfiguredControlledTargets', 'baseReadiness()']) {
    if (betaReadinessBody.includes(forbidden)) fail(`Controlled-beta public readiness still performs synchronous/deep work: ${forbidden}`);
  }
  if (!services.includes('createControlledBetaReadinessCoordinator') || !services.includes('createControlledBetaDeepAttestation')) fail('Dashboard services do not compose snapshot and deep-attestation orchestration.');
}

if (fs.existsSync(path.join(root, 'apps/dashboard/server/server.cjs'))) {
  const server = source('apps/dashboard/server/server.cjs');
  if (!server.includes("process.env.CALINIUM_MERCHANT_FLOW_BETA_ENABLED === 'true'") || !server.includes('checkExecutables: !deferExecutableChecks')) {
    fail('HTTP startup does not defer executable attestation only for the controlled-beta worker path.');
  }
  if (server.indexOf('services.startControlledReadiness?.()') < server.indexOf('server.listen(port, host)')) fail('Deep startup attestation begins before the HTTP server listens.');
}

if (fs.existsSync(path.join(root, 'ai/storefront-render/shopify-development-runtime.js'))) {
  const development = source('ai/storefront-render/shopify-development-runtime.js');
  for (const value of [
    'cli.attestRuntimeStateReadiness()',
    'preverifiedTarget = cli.assertDevelopmentTarget(listThemes',
    'themes = listThemes(',
    'runtimeState.attest()',
    'cli.assertStable(versionBefore)'
  ]) if (!development.includes(value)) fail(`Pre-render strictness omits ${value}`);
}

if (fs.existsSync(path.join(root, 'ai/storefront-render/shopify-cli-runtime.js'))) {
  const runtime = source('ai/storefront-render/shopify-cli-runtime.js');
  for (const value of ['shopify-cli-runtime-v1', 'shopify-cli-json-output-v1', '4.6.0', 'shopify_cli_runtime_drift', 'assertDevelopmentTarget']) {
    if (!runtime.includes(value)) fail(`E5R-J/K/L runtime protection omits ${value}`);
  }
}

const documentationPath = 'docs/architecture/calinium-core-2-phase-e5r-m-bounded-readiness-deep-attestation.md';
if (fs.existsSync(path.join(root, documentationPath))) {
  const documentation = source(documentationPath).toLowerCase();
  for (const phrase of [
    'release-7 symptom', '5,827 ms', '5,000 ms', '/api/ready',
    'controlled-beta-readiness-snapshot-v1', 'controlled-beta-deep-attestation-v1',
    'worker thread', 'single-flight', 'freshness and invalidation', 'pre-render strictness',
    'deployment remains pending', 'openai/model calls: 0', 'shopify calls: 0'
  ]) if (!documentation.includes(phrase.toLowerCase())) fail(`E5R-M documentation omits ${phrase}`);
}

try {
  const changed = [
    ...execFileSync('git', ['diff', '--name-only', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim().split('\n'),
    ...execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n')
  ].filter(Boolean);
  const forbidden = [
    /^apps\/theme\//,
    /^ai\/architecture\//,
    /^ai\/design-dna\//,
    /^ai\/merchant-intent\//,
    /^apps\/dashboard\/server\/custom-themes\//,
    /^deployment\//,
    /^shopify\.app(?:\.|$)/,
    /^fly\.(?!staging\.toml$)/
  ];
  const laterStorefrontCredentialScrubs = new Set([
    'apps/dashboard/server/custom-themes/custom-theme-service.cjs',
    'apps/dashboard/server/custom-themes/generation-worker-runner.cjs'
  ]);
  const violations = changed.filter((file) => forbidden.some((pattern) => pattern.test(file))
    && !(laterStorefrontCredentialScrubs.has(file)
      && fs.existsSync(path.join(root, file))
      && source(file).includes('withoutShopifyStorefrontPassword')));
  if (violations.length) fail(`forbidden E5R-M scope changed: ${violations.join(', ')}`);
} catch (error) { fail(`Could not inspect E5R-M source scope: ${error.message}`); }

const credentialPattern = /(?:sk-[A-Za-z0-9_-]{20,}|shpat_[A-Za-z0-9]{16,}|shpua_[A-Za-z0-9]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|client_secret\s*[=:]\s*['"][^<'"\s]{12,})/i;
for (const file of required.filter((item) => fs.existsSync(path.join(root, item)))) {
  if (credentialPattern.test(source(file))) fail(`${file} contains a credential-like literal`);
}

if (fixture) {
  for (const value of Object.values(fixture.endpoint_budgets_ms || {})) {
    if (!Number.isInteger(value) || value <= 0 || value >= fixture.release_7_regression.fly_timeout_ms) fail('Endpoint budgets do not retain clear margin below Fly timeout.');
  }
}

if (errors.length) {
  process.stderr.write(`E5R-M validation failed:\n- ${errors.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`E5R-M validation passed: ${required.length} required artifacts, exact virtual 5,827ms regression, snapshot/deep-worker contracts, /api/ready 5s Fly gate, preserved pre-render protections, forbidden-scope guard, and zero credential literals. API/model calls: 0. Shopify calls: 0. Theme mutations: 0.\n`);
}
