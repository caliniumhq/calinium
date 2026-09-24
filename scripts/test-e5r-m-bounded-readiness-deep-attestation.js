#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const {
  CONTROLLED_BETA_RUNTIME_REVISION,
  CONTROLLED_RENDER_TARGETS_REVISION,
  CONTROLLED_BETA_READINESS_REVISION,
  APPROVED_D2_7_PROVIDER_REVISION,
  APPROVED_D2_7_MODEL_ID,
  readControlledBetaRuntimeConfiguration
} = require('../apps/dashboard/server/services/merchant-flow-controlled-runtime-configuration.cjs');
const { COMPONENTS } = require('../apps/dashboard/server/services/merchant-flow-controlled-readiness.cjs');
const {
  CONTROLLED_BETA_DEEP_ATTESTATION_REVISION,
  createControlledBetaDeepAttestation
} = require('../apps/dashboard/server/services/merchant-flow-controlled-deep-attestation.cjs');
const {
  CONTROLLED_BETA_READINESS_SNAPSHOT_REVISION,
  checksumValid,
  readinessBinding,
  initialSnapshot,
  completedSnapshot,
  projectSnapshot,
  createControlledBetaReadinessCoordinator
} = require('../apps/dashboard/server/services/merchant-flow-controlled-readiness-snapshot.cjs');
const {
  sanitizeAttestation
} = require('../apps/dashboard/server/workers/controlled-readiness-deep-attestation-worker.cjs');
const { createShopifyCliRuntime } = require('../ai/storefront-render/shopify-cli-runtime');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/e5r-m-bounded-readiness-deep-attestation.json'), 'utf8'));
const validator = createSchemaValidator(root);
const SOURCE_REVISION = '2000000000000000000000000000000000000007';
const SHOP = 'calinium-example.myshopify.com';
const MAIN_THEME = '100000000001';
const DEVELOPMENT_THEME = '100000000006';
const START = Date.parse('2026-08-28T12:00:00.000Z');

function environment(overrides = {}) {
  return {
    NODE_ENV: 'production',
    CALINIUM_MERCHANT_FLOW_BETA_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_RUNTIME_REVISION: CONTROLLED_BETA_RUNTIME_REVISION,
    CALINIUM_CONTROLLED_BETA_SOURCE_REVISION: SOURCE_REVISION,
    CALINIUM_BUILD_SOURCE_REVISION: SOURCE_REVISION,
    CALINIUM_ALLOWED_SHOP_DOMAINS: SHOP,
    CALINIUM_CONTROLLED_BETA_SHOP_DOMAINS: SHOP,
    CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_REVISION: CONTROLLED_RENDER_TARGETS_REVISION,
    CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_JSON: JSON.stringify([
      { shop_domain: SHOP, theme_id: DEVELOPMENT_THEME, expected_theme_role: 'development' }
    ]),
    CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION: 'shopify-storefront-password-requirements-v1',
    CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_JSON: JSON.stringify([{ shop_domain: SHOP, requirement: 'not_required' }]),
    CALINIUM_CONTROLLED_BETA_PERSISTENT_DATABASE_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_ARTIFACT_STORAGE_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_DURABLE_JOB_RUNNER_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_GENERATION_WORKER_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_RENDER_QA_WORKER_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_D1_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_OPERATOR_AUTH_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_TELEMETRY_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_D2_7_REQUIRED: 'true',
    CALINIUM_CONTROLLED_BETA_D2_7_PROVIDER_REVISION: APPROVED_D2_7_PROVIDER_REVISION,
    CALINIUM_CONTROLLED_BETA_D2_7_MODEL_ID: APPROVED_D2_7_MODEL_ID,
    CALINIUM_CONTROLLED_BETA_OPERATOR_ROLES: 'owner,administrator',
    CALINIUM_CONTROLLED_BETA_OPERATOR_USER_IDS: 'usr_founder_fixture',
    SHOPIFY_CLI_THEME_TOKEN: 'configured-test-theme-access-not-real',
    CALINIUM_SHOPIFY_CLI_EXPECTED_VERSION: '4.6.0',
    CALINIUM_SHOPIFY_CLI_RUNTIME_REVISION: 'shopify-cli-runtime-v1',
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_REVISION: 'shopify-cli-runtime-state-v1',
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_ROOT: '/tmp/calinium-e5r-m/shopify-cli-runtime-state',
    CALINIUM_SHOPIFY_CLI_AUTOUPGRADE_POLICY: 'disabled',
    CALINIUM_SHOPIFY_MAIN_THEME_ID: MAIN_THEME,
    CALINIUM_PERSISTENT_ROOT: '/tmp/calinium-e5r-m',
    OPENAI_API_KEY: 'configured-test-provider-not-real',
    ...overrides
  };
}

function allComponents(ready, reasonCode = 'controlled_beta_deep_attestation_failed') {
  return Object.fromEntries(COMPONENTS.map((name) => [name, {
    ready,
    reason_code: ready ? null : reasonCode
  }]));
}

function readiness({ ready = true, at = START, reasonCode = 'controlled_beta_deep_attestation_failed', components = null } = {}) {
  return {
    schema_version: '1.0',
    readiness_revision: CONTROLLED_BETA_READINESS_REVISION,
    beta_source_version: SOURCE_REVISION,
    runtime_configuration_revision: CONTROLLED_BETA_RUNTIME_REVISION,
    beta_feature_flag_status: 'enabled',
    status: ready ? 'READY' : 'NOT_READY',
    components: components || allComponents(ready, reasonCode),
    reason_codes: ready ? [] : [reasonCode],
    checked_at: new Date(at).toISOString()
  };
}

function operation({ id = '1'.repeat(20), trigger = 'startup', at = START } = {}) {
  return {
    operation_id: `controlled-readiness-refresh-${id}`,
    trigger,
    started_at: new Date(at).toISOString()
  };
}

function configurationFor(env) {
  const configuration = readControlledBetaRuntimeConfiguration(env, { strict: true });
  assert.equal(configuration.validation.valid, true);
  return configuration;
}

function bindingFor(env, processGenerationId = 'readiness-process-primary') {
  return readinessBinding({ env, configuration: configurationFor(env), processGenerationId });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function inertIntervals() {
  let callback = null;
  let cleared = false;
  return {
    setIntervalFn(fn) {
      callback = fn;
      return { unref() {} };
    },
    clearIntervalFn() { cleared = true; },
    fire() { callback?.(); },
    get cleared() { return cleared; }
  };
}

function coordinator({ env, deepAttestation, clock, processGenerationId = 'readiness-process-coordinator', snapshotTtlMs = 300000 } = {}) {
  const intervals = inertIntervals();
  const instance = createControlledBetaReadinessCoordinator({
    env,
    deepAttestation,
    clock,
    configurationLoader: () => configurationFor(env),
    processGenerationId,
    snapshotTtlMs,
    refreshIntervalMs: 120000,
    deepAttestationTimeoutMs: 60000,
    setIntervalFn: intervals.setIntervalFn,
    clearIntervalFn: intervals.clearIntervalFn
  });
  return { instance, intervals };
}

function readyCliResult(overrides = {}) {
  return {
    ready: true,
    runtime_revision: 'shopify-cli-runtime-v1',
    expected_version: '4.6.0',
    actual_version: '4.6.0',
    runtime_state_revision: 'shopify-cli-runtime-state-v1',
    runtime_state_writable: true,
    package_immutable: true,
    auto_upgrade_state: 'off',
    runtime_dependencies_ready: true,
    ...overrides
  };
}

function readyDeepProbes(overrides = {}) {
  return {
    source_attestation: { ready: true, revision: SOURCE_REVISION },
    database: true,
    artifact_storage: true,
    durable_job_storage: true,
    generation_worker: true,
    render_qa_worker: true,
    controlled_shopify_target: true,
    d1: true,
    d2_7_provider: true,
    operator_authorization: true,
    telemetry: true,
    ...overrides
  };
}

const tests = [];
function test(name, run) { tests.push({ name, run }); }

test('exact release-7 5,827 ms regression is retained without wall-clock sleep', () => {
  let virtualElapsed = 0;
  const observed = fixture.release_7_regression.commands.map((command) => {
    virtualElapsed += command.duration_ms;
    return { operation: command.operation, completed_at_ms: virtualElapsed };
  });
  assert.deepEqual(fixture.release_7_regression.commands.map((entry) => entry.duration_ms), [2179, 1874, 1774]);
  assert.equal(virtualElapsed, 5827);
  assert.equal(virtualElapsed, fixture.release_7_regression.subtotal_ms);
  assert.equal(virtualElapsed - fixture.release_7_regression.fly_timeout_ms, 827);
  assert.equal(observed.at(-1).completed_at_ms > fixture.release_7_regression.fly_timeout_ms, true);
  assert.equal(fixture.release_7_regression.legacy_result, 'fly_health_timeout');
  for (const budget of Object.values(fixture.endpoint_budgets_ms)) assert.ok(budget < fixture.release_7_regression.fly_timeout_ms);
});

test('deep attestation reuses one sanitized CLI result for runtime and runtime state', async () => {
  const env = environment();
  let cliCalls = 0;
  const deep = createControlledBetaDeepAttestation({
    root,
    env,
    clock: () => new Date(START),
    probes: readyDeepProbes(),
    cliDeepAttestation: async () => { cliCalls += 1; return readyCliResult(); }
  });
  const result = await deep();
  assert.equal(result.status, 'READY');
  assert.equal(result.deep_attestation_revision, CONTROLLED_BETA_DEEP_ATTESTATION_REVISION);
  assert.equal(result.components.shopify_cli_runtime.ready, true);
  assert.equal(result.components.shopify_cli_runtime_state.ready, true);
  assert.equal(cliCalls, 1);
});

test('A — a missing snapshot projects fast NOT_READY', () => {
  const binding = bindingFor(environment());
  const projected = projectSnapshot({ snapshot: null, binding, now: START });
  assert.equal(projected.status, 'NOT_READY');
  assert.equal(projected.snapshot_status, 'MISSING');
  assert.deepEqual(projected.reason_codes, ['controlled_beta_readiness_snapshot_missing']);
});

test('B — an initializing snapshot projects NOT_READY without a deep call', () => {
  const binding = bindingFor(environment());
  const snapshot = initialSnapshot({ binding, at: new Date(START).toISOString() });
  assert.equal(checksumValid(snapshot), true);
  const projected = projectSnapshot({ snapshot, binding, now: START });
  assert.equal(projected.status, 'NOT_READY');
  assert.equal(projected.snapshot_status, 'INITIALIZING');
});

test('C — a fresh checksum-bound READY snapshot projects READY and validates against the schema', () => {
  const binding = bindingFor(environment());
  const snapshot = completedSnapshot({
    binding,
    readiness: readiness(),
    operation: operation(),
    completedAt: new Date(START).toISOString(),
    ttlMs: 300000
  });
  assert.equal(checksumValid(snapshot), true);
  assert.deepEqual(validator.validateFile(snapshot, 'schemas/calinium-controlled-beta-readiness-snapshot.schema.json', 'ready snapshot'), []);
  const projected = projectSnapshot({ snapshot, binding, now: START + 1 });
  assert.equal(projected.status, 'READY');
  assert.equal(projected.snapshot_status, 'READY');
});

test('D — a failed deep result atomically projects NOT_READY with a safe reason', () => {
  const binding = bindingFor(environment());
  const snapshot = completedSnapshot({
    binding,
    readiness: readiness({ ready: false, reasonCode: 'controlled_beta_database_unavailable' }),
    operation: operation(),
    completedAt: new Date(START).toISOString(),
    ttlMs: 300000
  });
  const projected = projectSnapshot({ snapshot, binding, now: START + 1 });
  assert.equal(projected.status, 'NOT_READY');
  assert.equal(projected.snapshot_status, 'NOT_READY');
  assert.deepEqual(projected.reason_codes, ['controlled_beta_database_unavailable']);
});

test('E — an expired READY snapshot fails closed as STALE at the exact TTL boundary', () => {
  const binding = bindingFor(environment());
  const snapshot = completedSnapshot({
    binding,
    readiness: readiness(),
    operation: operation(),
    completedAt: new Date(START).toISOString(),
    ttlMs: 300000
  });
  const projected = projectSnapshot({ snapshot, binding, now: START + 300000 });
  assert.equal(projected.status, 'NOT_READY');
  assert.equal(projected.snapshot_status, 'STALE');
  assert.ok(projected.reason_codes.includes('controlled_beta_readiness_snapshot_stale'));
});

test('F — source/build changes invalidate the prior READY snapshot', () => {
  const originalEnv = environment();
  const originalBinding = bindingFor(originalEnv);
  const snapshot = completedSnapshot({ binding: originalBinding, readiness: readiness(), operation: operation(), completedAt: new Date(START).toISOString(), ttlMs: 300000 });
  const changed = '1'.repeat(40);
  const changedEnv = environment({ CALINIUM_CONTROLLED_BETA_SOURCE_REVISION: changed, CALINIUM_BUILD_SOURCE_REVISION: changed });
  const projected = projectSnapshot({ snapshot, binding: bindingFor(changedEnv), now: START + 1 });
  assert.equal(projected.status, 'NOT_READY');
  assert.equal(projected.snapshot_status, 'MISMATCH');
});

test('G — runtime and runtime-state identity changes invalidate the snapshot', () => {
  const env = environment();
  const binding = bindingFor(env);
  const snapshot = completedSnapshot({ binding, readiness: readiness(), operation: operation(), completedAt: new Date(START).toISOString(), ttlMs: 300000 });
  const mismatched = JSON.parse(JSON.stringify(binding));
  mismatched.shopify_cli_runtime_state_revision = 'shopify-cli-runtime-state-v2';
  mismatched.binding_checksum = require('../apps/dashboard/server/services/merchant-flow-controlled-readiness-snapshot.cjs').digest({
    ...mismatched,
    binding_checksum: undefined
  });
  const projected = projectSnapshot({ snapshot, binding: mismatched, now: START + 1 });
  assert.equal(projected.status, 'NOT_READY');
  assert.equal(projected.snapshot_status, 'MISMATCH');
});

test('H/I/J — deferred slow work is single-flight and snapshot reads launch zero duplicate probes', async () => {
  const env = environment();
  let now = START;
  let calls = 0;
  const gate = deferred();
  const { instance } = coordinator({
    env,
    clock: () => new Date(now),
    deepAttestation: ({ signal }) => {
      calls += 1;
      assert.equal(signal.aborted, false);
      return gate.promise;
    }
  });
  const first = instance.requestRefresh({ trigger: 'operator' });
  const second = instance.requestRefresh({ trigger: 'operator' });
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(second.operation_id, first.operation_id);
  assert.equal(second.reused, true);
  for (let index = 0; index < 25; index += 1) {
    const projected = instance.current();
    assert.equal(projected.status, 'NOT_READY');
    assert.equal(projected.snapshot_status, 'INITIALIZING');
  }
  assert.equal(calls, 1);
  assert.equal(fixture.release_7_regression.subtotal_ms > fixture.release_7_regression.fly_timeout_ms, true);
  now += fixture.release_7_regression.subtotal_ms;
  gate.resolve(readiness({ at: now }));
  const final = await instance.waitForCurrentRefresh();
  assert.equal(final.status, 'READY');
  assert.equal(calls, 1);
  await instance.close();
});

test('K — successful deep completion replaces INITIALIZING only after the complete result', async () => {
  const env = environment();
  let now = START;
  const gate = deferred();
  const { instance } = coordinator({ env, clock: () => new Date(now), deepAttestation: () => gate.promise });
  instance.requestRefresh({ trigger: 'startup' });
  assert.equal(instance.current().snapshot_status, 'INITIALIZING');
  now += 20;
  gate.resolve(readiness({ at: now }));
  assert.equal((await instance.waitForCurrentRefresh()).snapshot_status, 'READY');
  await instance.close();
});

test('L — failed completion is atomic and redacts raw error text, paths, and invalid codes', async () => {
  const env = environment();
  const privateText = 'private-value-at-/sensitive/runtime/path';
  const { instance } = coordinator({
    env,
    clock: () => new Date(START),
    deepAttestation: async () => { throw Object.assign(new Error(privateText), { code: `invalid ${privateText}` }); }
  });
  instance.requestRefresh({ trigger: 'startup' });
  const projected = await instance.waitForCurrentRefresh();
  const serialized = JSON.stringify(projected);
  assert.equal(projected.status, 'NOT_READY');
  assert.equal(projected.snapshot_status, 'NOT_READY');
  assert.deepEqual(projected.reason_codes, ['controlled_beta_deep_attestation_failed']);
  assert.doesNotMatch(serialized, /private-value|sensitive\/runtime/);
  await instance.close();
});

test('M — a worker/process restart cannot reuse a prior generation snapshot', () => {
  const env = environment();
  const oldBinding = bindingFor(env, 'readiness-process-old');
  const snapshot = completedSnapshot({ binding: oldBinding, readiness: readiness(), operation: operation(), completedAt: new Date(START).toISOString(), ttlMs: 300000 });
  const newBinding = bindingFor(env, 'readiness-process-new');
  const projected = projectSnapshot({ snapshot, binding: newBinding, now: START + 1 });
  assert.equal(projected.status, 'NOT_READY');
  assert.equal(projected.snapshot_status, 'MISMATCH');
});

test('N/O — pre-render exact target/runtime checks and CLI drift rejection remain authoritative', () => {
  const development = fs.readFileSync(path.join(root, 'ai/storefront-render/shopify-development-runtime.js'), 'utf8');
  for (const expected of [
    'cli.attestRuntimeStateReadiness()',
    'preverifiedTarget = cli.assertDevelopmentTarget(listThemes',
    'themes = listThemes(',
    'runtimeState.attest()',
    'cli.assertStable(versionBefore)'
  ]) assert.ok(development.includes(expected), `Pre-render protection is missing ${expected}`);

  let versions = 0;
  const runtime = createShopifyCliRuntime({
    root,
    command: '/controlled/shopify',
    runner(_command, args) {
      assert.deepEqual(args, ['version']);
      versions += 1;
      return { status: 0, stdout: `${versions === 1 ? '4.6.0' : '4.7.0'}\n`, stderr: '', signal: null, error: null };
    }
  });
  assert.equal(runtime.attestReadiness().actual_version, '4.6.0');
  assert.throws(() => runtime.assertStable('4.6.0'), (error) => error?.code === 'shopify_cli_runtime_drift');
});

test('P — an invalid runtime-state result keeps the deep snapshot NOT_READY', async () => {
  const env = environment();
  const deep = createControlledBetaDeepAttestation({
    root,
    env,
    clock: () => new Date(START),
    probes: readyDeepProbes(),
    cliDeepAttestation: async () => readyCliResult({ runtime_state_writable: false })
  });
  const result = await deep();
  assert.equal(result.status, 'NOT_READY');
  assert.equal(result.components.shopify_cli_runtime.ready, true);
  assert.equal(result.components.shopify_cli_runtime_state.ready, false);
  assert.ok(result.reason_codes.includes('shopify_cli_runtime_state_unavailable'));
});

test('Q — stale/unverified Shopify target authority fails closed', async () => {
  const env = environment();
  const deep = createControlledBetaDeepAttestation({
    root,
    env,
    clock: () => new Date(START),
    probes: readyDeepProbes({ controlled_shopify_target: false }),
    cliDeepAttestation: async () => readyCliResult()
  });
  const result = await deep();
  assert.equal(result.status, 'NOT_READY');
  assert.equal(result.components.controlled_shopify_target.ready, false);
  assert.ok(result.reason_codes.includes('controlled_beta_shopify_target_unverified'));
});

test('checksum tampering never projects the last READY state', () => {
  const binding = bindingFor(environment());
  const snapshot = completedSnapshot({ binding, readiness: readiness(), operation: operation(), completedAt: new Date(START).toISOString(), ttlMs: 300000 });
  snapshot.components.database.ready = false;
  assert.equal(checksumValid(snapshot), false);
  const projected = projectSnapshot({ snapshot, binding, now: START + 1 });
  assert.equal(projected.status, 'NOT_READY');
  assert.equal(projected.snapshot_status, 'MISSING');
});

test('worker result projection is allowlisted and cannot retain raw extra fields', () => {
  const safe = sanitizeAttestation({ ...readyCliResult(), credential: 'must-not-survive', raw_output: '/private/path' });
  assert.deepEqual(Object.keys(safe).sort(), [
    'actual_version', 'auto_upgrade_state', 'expected_version', 'package_immutable', 'ready',
    'runtime_dependencies_ready', 'runtime_revision', 'runtime_state_revision', 'runtime_state_writable'
  ].sort());
  assert.doesNotMatch(JSON.stringify(safe), /must-not-survive|private\/path/);
});

test('authoritative fixture preserves all durable identities and safety boundaries', () => {
  assert.deepEqual(fixture.preserved_identity, {
    project_id: 'prj_public-fixture-0001',
    merchant_flow_id: 'merchant-flow-00000000000000000001',
    generation_job_id: 'merchant-flow-job-00000000000000000002',
    artifact_id: 'theme-artifact-00000000000000000001',
    artifact_checksum: 'c2e5dd71a4b06b173f266cc3c5e7cf60aff4c3c9f269b73b372bcf3f66e95b09',
    render_job_id: 'merchant-flow-job-00000000000000000001',
    render_job_state: 'retryable',
    architecture_profile_id: 'profile.editorial_discovery.v1',
    design_dna_id: 'adna_0989b341020b3def5aac2c7eda0b1b93b9af1aae'
  });
  assert.deepEqual(fixture.safety, {
    automatic_repair_allowed: false,
    shopify_write_allowed: false,
    live_theme_mutation_allowed: false,
    deployment_allowed: false,
    openai_calls: 0,
    shopify_calls: 0
  });
});

async function main() {
  assert.equal(CONTROLLED_BETA_READINESS_SNAPSHOT_REVISION, fixture.snapshot_revision);
  assert.equal(CONTROLLED_BETA_DEEP_ATTESTATION_REVISION, fixture.deep_attestation_revision);
  let passed = 0;
  for (const item of tests) {
    try {
      await item.run();
      passed += 1;
      process.stdout.write(`PASS ${item.name}\n`);
    } catch (error) {
      process.stderr.write(`FAIL ${item.name}\n${error.stack || error.message}\n`);
      process.exitCode = 1;
      break;
    }
  }
  process.stdout.write(`${passed}/${tests.length} E5R-M bounded-readiness tests passed. Exact latency=5,827ms virtual; wall-clock sleeps=0; API/model calls=0; Shopify calls=0; theme mutations=0.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
