#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const required = [
  'ai/design-evaluation/index.js',
  'ai/design-evaluation/merchant-flow-d2-7-failure.js',
  'ai/design-evaluation/merchant-flow-production-qa-adapter.js',
  'ai/design-evaluation/openai-responses-client.js',
  'ai/merchant-flow/merchant-flow-beta-operations.js',
  'ai/merchant-flow/merchant-generation-flow.js',
  'schemas/calinium-merchant-flow-d2-7-failure.schema.json',
  'schemas/calinium-merchant-generation-flow.schema.json',
  'fixtures/e5r-o-d2-7-failure-retry-claim-integrity.json',
  'scripts/test-e5r-o-d2-7-failure-retry-claim-integrity.js',
  'scripts/validate-e5r-o-d2-7-failure-retry-claim-integrity.js',
  'scripts/test-architecture-material-question.js',
  'scripts/test-merchant-flow-production-qa-adapter.js',
  'scripts/test-merchant-generation-flow.js',
  'scripts/test-merchant-beta-operations.js',
  'apps/dashboard/server/dashboard-api.cjs',
  'apps/dashboard/server/dashboard-services.cjs',
  'apps/dashboard/server/services/merchant-flow-controlled-runtime.cjs',
  'apps/dashboard/server/services/merchant-flow-job-runner.cjs',
  'apps/dashboard/server/services/merchant-flow-staging-runtime.cjs',
  'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
  'apps/dashboard/server/storage/dashboard-store.cjs',
  'apps/dashboard/server/storage/migrations.cjs',
  'apps/dashboard/src/adapters/dashboard-api-client.js',
  'apps/dashboard/src/components/creative-director/MerchantFlowStatus.jsx',
  'apps/dashboard/src/hooks/use-creative-director.js',
  'apps/dashboard/src/services/creative-director-service.js',
  'apps/dashboard/src/tests/dashboard-api-client.test.js',
  'apps/dashboard/src/tests/merchant-flow-status.test.jsx',
  'apps/dashboard/tests/merchant-flow-controlled-runtime.test.js',
  'docs/architecture/calinium-core-2-phase-e5r-o-d2-7-failure-evidence-retry-claim-integrity.md',
  'package.json'
];
const errors = [];
function fail(message) { errors.push(message); }
function source(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function json(file) { return JSON.parse(source(file)); }

for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
for (const file of [
  'schemas/calinium-merchant-flow-d2-7-failure.schema.json',
  'fixtures/e5r-o-d2-7-failure-retry-claim-integrity.json',
  'package.json'
]) {
  try { json(file); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); }
}

try {
  const fixture = json('fixtures/e5r-o-d2-7-failure-retry-claim-integrity.json');
  assert.equal(fixture.fixture_version, 'e5r-o-d2-7-failure-retry-claim-integrity-v1');
  assert.equal(fixture.historical_attempt_5.flow_id, 'merchant-flow-00000000000000000001');
  assert.equal(fixture.historical_attempt_5.job_id, 'merchant-flow-job-00000000000000000001');
  assert.equal(fixture.historical_attempt_5.job_attempt, 5);
  assert.equal(fixture.historical_attempt_5.request_id, 'merchant-flow-d2-7-request-00000000000000000001');
  assert.equal(fixture.historical_attempt_5.started_at, '2026-09-01T13:13:40.400Z');
  assert.equal(fixture.historical_attempt_5.failed_at, '2026-09-01T13:14:28.498Z');
  assert.equal(fixture.historical_attempt_5.render_capture_cells_passed, 8);
  assert.equal(fixture.historical_attempt_5.render_capture_cells_total, 8);
  assert.equal(fixture.historical_attempt_5.d1_status, 'passed');
  assert.equal(fixture.historical_attempt_5.d1_finding_count, 0);
  assert.equal(fixture.historical_attempt_5.d2_7_evaluation_artifact_exists, false);
  assert.equal(fixture.historical_attempt_5.provider_detail_availability, 'not_retained');
  assert.equal(fixture.historical_attempt_5.causal_conclusion, 'historical_detail_unavailable');
  assert.equal(fixture.evidence_binding.development_theme_id, '100000000006');
  assert.deepEqual(
    fixture.provider_cases.map((entry) => entry.id),
    [
      'authentication_401', 'access_403', 'ambiguous_429', 'proven_rate_limit_429', 'proven_quota_429',
      'provider_500', 'provider_503', 'timeout', 'network', 'malformed_response', 'schema_mismatch', 'unknown'
    ]
  );
  assert.deepEqual(fixture.evidence_reuse_expectations.d2_7_only_resume, { capture_calls: 0, d1_calls: 0, provider_calls: 1 });
  assert.equal(fixture.retry_claim_expectations.historical_attempt, 5);
  assert.equal(fixture.retry_claim_expectations.authorized_attempt, 6);
  assert.equal(fixture.retry_claim_expectations.lease_recovery_increments_attempt, false);
  assert.equal(fixture.safety.openai_calls, 0);
  assert.equal(fixture.safety.shopify_calls, 0);
  assert.equal(fixture.safety.render_calls, 0);
  assert.equal(fixture.safety.theme_mutations, 0);
  assert.equal(fixture.safety.automatic_retry_allowed, false);
  assert.equal(fixture.safety.automatic_repair_allowed, false);
} catch (error) { fail(`E5R-O fixture contract failed: ${error.message}`); }

try {
  const schema = json('schemas/calinium-merchant-flow-d2-7-failure.schema.json');
  assert.equal(schema.properties.contract_version.const, 'merchant-flow-d2-7-failure-v1');
  assert.equal(schema.properties.status.const, 'failed');
  assert.equal(schema.properties.safety.additionalProperties, false);
  assert.equal(schema.properties.binding.additionalProperties, false);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.safety.properties.automatic_retry_allowed.const, false);
  assert.equal(schema.properties.safety.properties.automatic_repair_allowed.const, false);
} catch (error) { fail(`E5R-O failure schema contract failed: ${error.message}`); }

try {
  const scripts = json('package.json').scripts || {};
  assert.equal(
    scripts['test:e5r-o'],
    'node scripts/test-e5r-o-d2-7-failure-retry-claim-integrity.js && node scripts/test-merchant-flow-production-qa-adapter.js && node scripts/test-merchant-generation-flow.js && node scripts/test-merchant-beta-operations.js && node scripts/test-merchant-flow-operator-operations.js && npm --prefix apps/dashboard test -- --run src/tests/merchant-flow-status.test.jsx src/tests/dashboard-api-client.test.js tests/merchant-generation-flow-service.test.js tests/controlled-staging-runtime.test.js tests/merchant-flow-controlled-runtime.test.js'
  );
  assert.equal(scripts['validate:e5r-o'], 'node scripts/validate-e5r-o-d2-7-failure-retry-claim-integrity.js');
} catch (error) { fail(`E5R-O package commands are invalid: ${error.message}`); }

if (required.every((file) => fs.existsSync(path.join(root, file)))) {
  const failureContract = source('ai/design-evaluation/merchant-flow-d2-7-failure.js');
  const runner = source('apps/dashboard/server/services/merchant-flow-job-runner.cjs');
  const store = source('apps/dashboard/server/storage/dashboard-store.cjs');
  const migrations = source('apps/dashboard/server/storage/migrations.cjs');
  const responsesClient = source('ai/design-evaluation/openai-responses-client.js');
  const adapter = source('ai/design-evaluation/merchant-flow-production-qa-adapter.js');
  const flow = source('ai/merchant-flow/merchant-generation-flow.js');
  const flowSchema = source('schemas/calinium-merchant-generation-flow.schema.json');
  const service = source('apps/dashboard/server/services/merchant-generation-flow-service.cjs');
  const stagingRuntime = source('apps/dashboard/server/services/merchant-flow-staging-runtime.cjs');
  const apiClient = source('apps/dashboard/src/adapters/dashboard-api-client.js');
  const statusControl = source('apps/dashboard/src/components/creative-director/MerchantFlowStatus.jsx');
  const productionQaTest = source('scripts/test-merchant-flow-production-qa-adapter.js');
  for (const value of [
    'd2_7_provider_authentication_failed', 'd2_7_provider_access_failed', 'd2_7_provider_rate_or_quota_limited',
    'd2_7_provider_rate_limited', 'd2_7_provider_quota_failed', 'd2_7_provider_timeout',
    'd2_7_provider_network_failed', 'd2_7_provider_unavailable', 'd2_7_response_invalid',
    'd2_7_schema_validation_failed', 'd2_7_unknown_provider_failure', 'historical_detail_unavailable'
  ]) if (!failureContract.includes(value)) fail(`failure taxonomy omits ${value}`);
  for (const value of ['authorizeResume', "['queued', 'running'].includes(job.status)", "['completed', 'terminal', 'cancelled', 'retryable'].includes(initial.status)", 'lease_epoch', 'resume_operation_id']) {
    if (!runner.includes(value)) fail(`job-runner claim integrity omits ${value}`);
  }
  for (const value of ['applyMerchantFlowResumeOperation', 'armMerchantFlowJobResume', 'merchant_flow_resume_operation_idempotency_conflict', 'merchant_flow_resume_operation_job_stale', 'authorized_resume_operation_id', 'authorized_attempt']) {
    if (!store.includes(value)) fail(`durable resume storage omits ${value}`);
  }
  for (const value of ['merchant_flow_resume_operations_and_claim_fencing', 'merchant_flow_resume_operations', 'UNIQUE(job_id, target_job_attempt)', 'lease_epoch']) {
    if (!migrations.includes(value)) fail(`durable resume migration omits ${value}`);
  }
  for (const value of ['providerErrorMetadata', 'insufficient_quota', 'providerCode', 'responseReceived']) {
    if (!responsesClient.includes(value)) fail(`provider projection omits ${value}`);
  }
  for (const value of ['resumeD27', 'recoverLegacyD27Failure', 'historical_detail_unavailable', 'invalidScopedCandidateCount', 'writeD27Failure']) {
    if (!adapter.includes(value)) fail(`production QA recovery omits ${value}`);
  }
  for (const value of ['assertMerchantFlowD27Failure', 'recoveredRenderQa', 'failed_terminal', 'd2_7_failure']) {
    if (!flow.includes(value)) fail(`merchant flow D2.7 graph omits ${value}`);
  }
  if (!flowSchema.includes('calinium-merchant-flow-d2-7-failure.schema.json')) fail('merchant flow schema does not reference the D2.7 failure contract');
  for (const value of ['applyMerchantFlowResumeOperation', 'recoverLegacyD27Failure', 'merchant-flow-resume-', 'expected_flow_sequence', "'resume_authorized'", "'merchant_resume'"]) {
    if (!service.includes(value)) fail(`merchant resume service omits ${value}`);
  }
  for (const value of ['resumeD27', 'historicalManualResume', 'acceptedRenderQa', 'd2_7_failure']) {
    if (!stagingRuntime.includes(value)) fail(`D2.7-only staging runtime omits ${value}`);
  }
  for (const value of ['merchant-flow-resume-', 'expected_flow_sequence', 'idempotency-key']) {
    if (!apiClient.includes(value)) fail(`resume API client omits ${value}`);
  }
  for (const value of ['useRef', 'resumeInFlight', 'type="button"']) {
    if (!statusControl.includes(value)) fail(`merchant retry control omits ${value}`);
  }
  for (const value of ['D2.7-only resume must reuse the exact recovered render evidence', 'D2.7-only resume must reuse the exact recovered D1 evidence', 'ambiguous scoped legacy evidence must fail before another provider call']) {
    if (!productionQaTest.includes(value)) fail(`production QA reuse regression omits ${value}`);
  }
}

try {
  execFileSync('npm', ['run', 'test:e5r-o'], {
    cwd: root,
    env: {
      ...process.env,
      OPENAI_API_KEY: '', SHOPIFY_CLI_THEME_TOKEN: '', SHOPIFY_CLI_THEME_PASSWORD: '',
      SHOPIFY_FLAG_STORE_PASSWORD: '', NODE_NO_WARNINGS: '1'
    },
    stdio: 'pipe',
    timeout: 60000
  });
} catch (error) {
  fail(`E5R-O behavioral regressions failed: ${String(error.stderr || error.stdout || error.message).trim()}`);
}

for (const file of required.filter((entry) => /\.(?:cjs|js)$/.test(entry))) {
  if (!fs.existsSync(path.join(root, file))) continue;
  try { execFileSync(process.execPath, ['--check', file], { cwd: root, stdio: 'pipe' }); }
  catch (error) { fail(`${file} failed JavaScript syntax validation: ${String(error.stderr || error.message).trim()}`); }
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
    /^ai\/theme-generator\//,
    /^apps\/dashboard\/server\/custom-themes\//,
    /^deployment\//,
    /^shopify\.app(?:\.|$)/,
    /^fly\./
  ];
  const violations = changed.filter((file) => forbidden.some((pattern) => pattern.test(file)));
  if (violations.length) fail(`forbidden E5R-O scope changed: ${violations.join(', ')}`);
} catch (error) { fail(`could not inspect E5R-O protected source scope: ${error.message}`); }

const credentialPattern = /(?:sk-[A-Za-z0-9_-]{20,}|shpat_[A-Za-z0-9]{16,}|shpua_[A-Za-z0-9]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|client_secret\s*[=:]\s*['"][^<'"\s]{12,})/i;
for (const file of required.filter((entry) => fs.existsSync(path.join(root, entry)))) {
  if (credentialPattern.test(source(file))) fail(`${file} contains a credential-like literal`);
}

try { execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'pipe' }); }
catch (error) { fail(`git diff --check failed: ${String(error.stderr || error.stdout || error.message).trim()}`); }

if (errors.length) {
  process.stderr.write(`E5R-O validation failed:\n- ${errors.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('E5R-O validation passed: conservative provider taxonomy; attempt-5 historical unknown; checksum-bound sanitized failure evidence; durable idempotent resume; two-worker claim fencing; lease recovery fencing; render/D1 reuse; API/model calls=0; Shopify calls=0; render calls=0; theme mutations=0.\n');
}
