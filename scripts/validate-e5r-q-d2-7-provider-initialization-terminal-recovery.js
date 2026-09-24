#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const errors = [];
let fixture = null;
const required = [
  'ai/design-evaluation/index.js',
  'ai/design-evaluation/merchant-flow-d2-7.js',
  'ai/design-evaluation/merchant-flow-d2-7-failure.js',
  'ai/design-evaluation/merchant-flow-d2-7-terminal-recovery.js',
  'ai/design-evaluation/merchant-flow-production-qa-adapter.js',
  'ai/merchant-flow/merchant-generation-flow.js',
  'ai/merchant-flow/merchant-flow-beta-operations.js',
  'apps/dashboard/server/dashboard-services.cjs',
  'apps/dashboard/server/services/merchant-flow-controlled-runtime.cjs',
  'apps/dashboard/server/services/merchant-flow-staging-runtime.cjs',
  'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
  'apps/dashboard/server/services/merchant-flow-job-runner.cjs',
  'apps/dashboard/server/storage/dashboard-store.cjs',
  'schemas/calinium-merchant-flow-d2-7-failure.schema.json',
  'schemas/calinium-merchant-flow-d2-7-terminal-recovery.schema.json',
  'schemas/calinium-merchant-generation-flow.schema.json',
  'fixtures/e5r-q-d2-7-provider-initialization-terminal-recovery.json',
  'scripts/test-e5r-q-d2-7-provider-initialization-terminal-recovery.js',
  'scripts/validate-e5r-q-d2-7-provider-initialization-terminal-recovery.js',
  'scripts/test-merchant-flow-production-qa-adapter.js',
  'docs/architecture/calinium-core-2-phase-e5r-q-d2-7-provider-initialization-terminal-recovery.md',
  'package.json'
];
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(source(file));
const fail = (message) => errors.push(message);

for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
for (const file of required.filter((entry) => entry.endsWith('.json')).concat('package.json')) {
  if (!fs.existsSync(path.join(root, file))) continue;
  try { json(file); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); }
}

try {
  fixture = json('fixtures/e5r-q-d2-7-provider-initialization-terminal-recovery.json');
  assert.equal(fixture.fixture_version, 'e5r-q-d2-7-provider-initialization-terminal-recovery-v1');
  assert.equal(fixture.historical_attempt_6.logical_attempt, 6);
  assert.equal(fixture.historical_attempt_6.status, 'terminal');
  assert.equal(fixture.historical_attempt_6.recorded_category, 'd2_7_unknown_provider_failure');
  assert.equal(fixture.historical_attempt_6.diagnosed_category, 'D2_7_PROVIDER_CLIENT_INITIALIZATION_FAILED');
  assert.equal(fixture.historical_attempt_6.provider_transport_started, false);
  assert.equal(fixture.historical_attempt_6.transport_attempts, 0);
  assert.equal(fixture.historical_attempt_6.mutated_by_e5r_q, false);
  assert.equal(fixture.future_recovery.source_attempt, 6);
  assert.equal(fixture.future_recovery.target_attempt, 7);
  assert.equal(fixture.future_recovery.render_calls_before_provider, 0);
  assert.equal(fixture.future_recovery.d1_calls_before_provider, 0);
  assert.equal(fixture.future_recovery.attempt_8_from_same_action_allowed, false);
  assert.equal(fixture.authoritative_evidence.d2_7_parent_request_id, 'merchant-flow-d2-7-request-00000000000000000001');
  for (const [key, value] of Object.entries(fixture.safety)) {
    if (typeof value === 'number') assert.equal(value, 0, `safety ${key}`);
    else assert.equal(value, false, `safety ${key}`);
  }
} catch (error) { fail(`E5R-Q fixture contract failed: ${error.message}`); }

if (required.every((file) => fs.existsSync(path.join(root, file)))) {
  const provider = source('ai/design-evaluation/merchant-flow-d2-7.js');
  const failure = source('ai/design-evaluation/merchant-flow-d2-7-failure.js');
  const recovery = source('ai/design-evaluation/merchant-flow-d2-7-terminal-recovery.js');
  const adapter = source('ai/design-evaluation/merchant-flow-production-qa-adapter.js');
  const flow = source('ai/merchant-flow/merchant-generation-flow.js');
  const service = source('apps/dashboard/server/services/merchant-generation-flow-service.cjs');
  const staging = source('apps/dashboard/server/services/merchant-flow-staging-runtime.cjs');
  const controlled = source('apps/dashboard/server/services/merchant-flow-controlled-runtime.cjs');
  const store = source('apps/dashboard/server/storage/dashboard-store.cjs');
  const factoryTest = source('scripts/test-merchant-flow-production-qa-adapter.js');

  if (!provider.includes('provider_revision: providerRevision')) fail('provider factory does not use the supplied providerRevision');
  if (provider.includes('provider_revision: provider_revision')) fail('provider factory retains the defective undefined identifier');
  for (const value of ['provider_initialization', 'd2_7_provider_client_initialization_failed', 'provider_client_initialization_failed', 'source_remediation_required']) {
    if (!failure.includes(value)) fail(`failure taxonomy omits ${value}`);
  }
  for (const value of ['preTransportTerminalFailure', 'isTerminalD27RecoveryCandidate', 'createMerchantFlowD27TerminalRecovery', 'historical_attempt_mutated: false', 'render_execution_allowed_before_provider: false', 'd1_execution_allowed_before_provider: false']) {
    if (!recovery.includes(value)) fail(`terminal recovery contract omits ${value}`);
  }
  for (const value of ['providerInitialized', "['live_design_credentials_missing', 'live_design_network_unavailable']", "'provider_initialization'", 'loadReusableD27Evidence', 'validateTerminalD27Recovery', 'terminalRecoveryExecution']) {
    if (!adapter.includes(value)) fail(`production QA adapter omits ${value}`);
  }
  const factoryAt = adapter.indexOf('d27ProviderFactory({');
  const evaluateAt = adapter.indexOf('d27Evaluator({', factoryAt);
  if (factoryAt < 0 || evaluateAt <= factoryAt) fail('provider initialization is not ordered before evaluation/transport');
  for (const value of ["terminal_d2_7_recovered: 'render_qa_running'", 'recoverTerminalD27', 'terminal_recovery']) {
    if (!flow.includes(value)) fail(`merchant flow omits ${value}`);
  }
  for (const value of ['terminalRecoveryRequested', 'findMerchantFlowLegacyD27LineageBinding', 'validateTerminalD27Recovery', 'recoverTerminalD27', 'expectedJobStatus']) {
    if (!service.includes(value)) fail(`authenticated resume service omits ${value}`);
  }
  const preflightAt = service.indexOf('this.runtime.validateTerminalD27Recovery');
  const transitionAt = service.indexOf('recoverTerminalD27(', preflightAt);
  const transactionAt = service.indexOf('applyMerchantFlowResumeOperation', transitionAt);
  if (preflightAt < 0 || transitionAt <= preflightAt || transactionAt <= transitionAt) fail('terminal preflight must precede transition and atomic resume registration');
  for (const value of ['terminalManualRecovery', 'resumeD27']) if (!staging.includes(value)) fail(`staging runtime omits ${value}`);
  for (const value of ['validateTerminalD27Recovery', 'controlled_runtime: context']) if (!controlled.includes(value)) fail(`controlled runtime omits ${value}`);
  for (const value of ["expectedStatus = 'retryable'", "['retryable', 'terminal']", 'authorized_attempt', 'target_job_attempt']) if (!store.includes(value)) fail(`durable resume store omits ${value}`);
  for (const value of ['createMerchantFlowD27Provider', 'synthetic-non-live-construction-key', 'constructionTransportCalls', 'body.store, false', 'provider_initialization', 'invalid D1 evidence must fail before attempt-7 provider execution', 'invalid retained render evidence must fail before attempt-7 provider execution']) {
    if (!factoryTest.includes(value)) fail(`production regression omits ${value}`);
  }

  const productionIdentityFiles = [
    'ai/design-evaluation/merchant-flow-d2-7-terminal-recovery.js',
    'ai/design-evaluation/merchant-flow-production-qa-adapter.js',
    'ai/merchant-flow/merchant-generation-flow.js',
    'apps/dashboard/server/services/merchant-generation-flow-service.cjs',
    'apps/dashboard/server/storage/dashboard-store.cjs'
  ];
  for (const file of productionIdentityFiles) {
    const content = source(file);
    for (const id of [fixture.historical_attempt_6.flow_id, fixture.historical_attempt_6.job_id, fixture.authoritative_evidence.project_id, fixture.authoritative_evidence.artifact_id, fixture.authoritative_evidence.d1_evaluation_id, fixture.authoritative_evidence.d2_7_parent_request_id]) {
      if (content.includes(id)) fail(`${file} hard-codes controlled staging identity ${id}`);
    }
  }
}

try {
  const scripts = json('package.json').scripts || {};
  assert.ok(scripts['test:e5r-q']?.includes('test-e5r-q-d2-7-provider-initialization-terminal-recovery.js'));
  assert.equal(scripts['validate:e5r-q'], 'node scripts/validate-e5r-q-d2-7-provider-initialization-terminal-recovery.js');
} catch (error) { fail(`E5R-Q package commands are invalid: ${error.message}`); }

try {
  execFileSync('npm', ['run', 'test:e5r-q'], {
    cwd: root,
    env: { ...process.env, OPENAI_API_KEY: '', OPENAI_ORG_ID: '', OPENAI_PROJECT_ID: '', SHOPIFY_CLI_THEME_TOKEN: '', SHOPIFY_CLI_THEME_PASSWORD: '', SHOPIFY_FLAG_STORE_PASSWORD: '', NODE_NO_WARNINGS: '1' },
    stdio: 'pipe', timeout: 180000
  });
} catch (error) { fail(`E5R-Q behavioral regressions failed: ${String(error.stderr || error.stdout || error.message).trim()}`); }

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
  if (violations.length) fail(`forbidden E5R-Q scope changed: ${violations.join(', ')}`);
} catch (error) { fail(`could not inspect protected source scope: ${error.message}`); }

try { execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'pipe' }); }
catch (error) { fail(`git diff --check failed: ${String(error.stderr || error.stdout || error.message).trim()}`); }

if (errors.length) {
  process.stderr.write(`E5R-Q validation failed:\n- ${errors.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('E5R-Q validation passed: real provider factory; zero-transport construction; truthful pre-provider taxonomy; immutable attempt 6; bounded terminal 6→7 recovery; exact lineage/render/D1/parent reuse; CAS/idempotency/lease fencing; no API, Shopify, render, D1, or theme mutation.\n');
}
