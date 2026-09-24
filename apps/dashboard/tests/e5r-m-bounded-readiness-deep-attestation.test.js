import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardApiHandler } = require('../server/dashboard-api.cjs');
const { ShopifyAdminApiAdapter } = require('../server/shopify/admin-api-adapter.cjs');
const { verifyConfiguredControlledTargets } = require('../server/dashboard-services.cjs');
const { MerchantFlowJobRunner } = require('../server/services/merchant-flow-job-runner.cjs');
const {
  CONTROLLED_BETA_RUNTIME_REVISION,
  CONTROLLED_RENDER_TARGETS_REVISION,
  APPROVED_D2_7_PROVIDER_REVISION,
  APPROVED_D2_7_MODEL_ID
} = require('../server/services/merchant-flow-controlled-runtime-configuration.cjs');
const { COMPONENTS } = require('../server/services/merchant-flow-controlled-readiness.cjs');
const {
  checksumValid,
  initialSnapshot,
  readinessBinding,
  createControlledBetaReadinessCoordinator
} = require('../server/services/merchant-flow-controlled-readiness-snapshot.cjs');
const { createControlledBetaDeepAttestation } = require('../server/services/merchant-flow-controlled-deep-attestation.cjs');
const {
  runControlledReadinessDeepAttestationWorker
} = require('../server/workers/controlled-readiness-deep-attestation-worker.cjs');
const { readControlledBetaRuntimeConfiguration } = require('../server/services/merchant-flow-controlled-runtime-configuration.cjs');

const SOURCE = 'f'.repeat(40);
const SHOP = 'e5rm-controlled.myshopify.com';
const PROJECT_ID = 'prj_e5rm_operator';
const ORGANIZATION_ID = 'org_e5rm_operator';
const CONNECTION_ID = 'shc_e5rm_operator';
const USER_ID = 'usr_e5rm_founder';

function enabledEnvironment(overrides = {}) {
  return {
    NODE_ENV: 'production',
    CALINIUM_MERCHANT_FLOW_BETA_ENABLED: 'true',
    CALINIUM_CONTROLLED_BETA_RUNTIME_REVISION: CONTROLLED_BETA_RUNTIME_REVISION,
    CALINIUM_CONTROLLED_BETA_SOURCE_REVISION: SOURCE,
    CALINIUM_BUILD_SOURCE_REVISION: SOURCE,
    CALINIUM_ALLOWED_SHOP_DOMAINS: SHOP,
    CALINIUM_CONTROLLED_BETA_SHOP_DOMAINS: SHOP,
    CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_REVISION: CONTROLLED_RENDER_TARGETS_REVISION,
    CALINIUM_CONTROLLED_BETA_RENDER_TARGETS_JSON: JSON.stringify([
      { shop_domain: SHOP, theme_id: '2002', expected_theme_role: 'development' }
    ]),
    CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION: 'shopify-storefront-password-requirements-v1',
    CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_JSON: JSON.stringify([{ shop_domain: SHOP, requirement: 'not_required' }]),
    CALINIUM_SHOPIFY_MAIN_THEME_ID: '1001',
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
    CALINIUM_CONTROLLED_BETA_OPERATOR_USER_IDS: USER_ID,
    SHOPIFY_CLI_THEME_TOKEN: 'configured-test-theme-token',
    CALINIUM_SHOPIFY_CLI_EXPECTED_VERSION: '4.6.0',
    CALINIUM_SHOPIFY_CLI_RUNTIME_REVISION: 'shopify-cli-runtime-v1',
    CALINIUM_PERSISTENT_ROOT: '/tmp/calinium-e5rm',
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_REVISION: 'shopify-cli-runtime-state-v1',
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_ROOT: '/tmp/calinium-e5rm/shopify-cli-runtime-state',
    CALINIUM_SHOPIFY_CLI_AUTOUPGRADE_POLICY: 'disabled',
    OPENAI_API_KEY: 'configured-test-provider-credential',
    SHOPIFY_API_KEY: 'e5rm-shopify-client',
    SHOPIFY_API_SECRET: 'e5rm-shopify-secret',
    ...overrides
  };
}

function componentMap(ready = true, reasonCode = null) {
  return Object.fromEntries(COMPONENTS.map((name) => [name, { ready, reason_code: ready ? null : reasonCode }]));
}

function readiness({ status = 'READY', checkedAt = '2026-08-28T12:00:00.000Z', reasonCode = 'controlled_beta_database_unavailable' } = {}) {
  const ready = status === 'READY';
  return {
    schema_version: '1.0',
    readiness_revision: 'merchant-flow-controlled-beta-readiness-v1',
    status,
    checked_at: checkedAt,
    components: componentMap(ready, reasonCode),
    reason_codes: ready ? [] : [reasonCode]
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}

function coordinator({ env = enabledEnvironment(), now = Date.parse('2026-08-28T12:00:00.000Z'), deepAttestation = async () => readiness(), ...options } = {}) {
  let currentTime = now;
  const value = createControlledBetaReadinessCoordinator({
    env,
    deepAttestation,
    clock: () => new Date(currentTime),
    processGenerationId: options.processGenerationId || 'readiness-process-e5rm-test',
    snapshotTtlMs: options.snapshotTtlMs || 300_000,
    refreshIntervalMs: options.refreshIntervalMs || 120_000,
    deepAttestationTimeoutMs: options.deepAttestationTimeoutMs || 60_000,
    maxAutomaticFailures: options.maxAutomaticFailures || 3,
    beforeReady: options.beforeReady || null,
    setIntervalFn: options.setIntervalFn || (() => ({ unref() {} })),
    clearIntervalFn: options.clearIntervalFn || (() => {})
  });
  return { value, setNow(next) { currentTime = next; } };
}

async function invoke(api, { method = 'GET', url, token = null, body } = {}) {
  const request = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  Object.assign(request, {
    method,
    url,
    headers: {
      host: 'dashboard.test',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' })
    },
    socket: { remoteAddress: '127.0.0.1' }
  });
  const response = {
    status: null,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    writeHead(status, headers) { this.status = status; this.headers = { ...this.headers, ...(headers || {}) }; },
    end(value = '') { this.body += value; }
  };
  await api(request, response);
  return { status: response.status, payload: JSON.parse(response.body) };
}

function signedSession(env, { userId = USER_ID, shopDomain = SHOP } = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ aud: env.SHOPIFY_API_KEY, dest: `https://${shopDomain}`, exp: Math.floor(Date.now() / 1000) + 60, iss: `https://${shopDomain}/admin`, sub: userId })).toString('base64url');
  const signature = crypto.createHmac('sha256', env.SHOPIFY_API_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

describe('E5R-M readiness snapshot contract and coordinator', () => {
  it('starts checksum-bound and fast NOT_READY without launching a deep probe', () => {
    const env = enabledEnvironment();
    const configuration = readControlledBetaRuntimeConfiguration(env);
    const binding = readinessBinding({ env, configuration, processGenerationId: 'readiness-process-e5rm-contract' });
    const stored = initialSnapshot({ binding, at: '2026-08-28T12:00:00.000Z' });
    expect(checksumValid(stored)).toBe(true);
    expect(stored).toMatchObject({ snapshot_revision: 'controlled-beta-readiness-snapshot-v1', deep_attestation_revision: 'controlled-beta-deep-attestation-v1', status: 'INITIALIZING' });
    expect(JSON.stringify(stored)).not.toContain('configured-test-theme-token');
    expect(JSON.stringify(stored)).not.toContain('configured-test-provider-credential');

    const deep = vi.fn();
    const { value } = coordinator({ env, deepAttestation: deep });
    expect(value.current()).toMatchObject({ status: 'NOT_READY', snapshot_status: 'INITIALIZING' });
    expect(deep).not.toHaveBeenCalled();
  });

  it('atomically commits success or failure and keeps concurrent callers single-flight', async () => {
    const gate = deferred();
    const deep = vi.fn(() => gate.promise);
    const beforeReady = vi.fn(async () => true);
    const { value } = coordinator({ deepAttestation: deep, beforeReady });
    const first = value.requestRefresh({ trigger: 'startup' });
    const joined = value.requestRefresh({ trigger: 'operator' });
    expect(joined).toMatchObject({ operation_id: first.operation_id, reused: true });
    expect(value.current()).toMatchObject({ status: 'NOT_READY', snapshot_status: 'INITIALIZING', refresh: { status: 'running', operation_id: first.operation_id } });
    await Promise.resolve();
    expect(deep).toHaveBeenCalledTimes(1);
    gate.resolve(readiness());
    await value.waitForCurrentRefresh();
    expect(beforeReady).toHaveBeenCalledTimes(1);
    expect(value.current()).toMatchObject({ status: 'READY', snapshot_status: 'READY', reason_codes: [] });

    const failed = coordinator({ deepAttestation: async () => readiness({ status: 'NOT_READY' }) }).value;
    failed.requestRefresh({ trigger: 'operator' });
    await failed.waitForCurrentRefresh();
    expect(failed.current()).toMatchObject({ status: 'NOT_READY', snapshot_status: 'NOT_READY' });
    expect(failed.current().reason_codes).toEqual(['controlled_beta_database_unavailable']);

    const incomplete = coordinator({ deepAttestation: async () => ({ status: 'READY', readiness_revision: 'merchant-flow-controlled-beta-readiness-v1', reason_codes: [] }) }).value;
    incomplete.requestRefresh({ trigger: 'operator' });
    await incomplete.waitForCurrentRefresh();
    expect(incomplete.current()).toMatchObject({ status: 'NOT_READY', snapshot_status: 'NOT_READY' });
    expect(incomplete.current().reason_codes).toEqual(['controlled_beta_deep_attestation_incomplete']);
  });

  it('fails closed for stale, source/runtime mismatch, and a restarted process generation', async () => {
    const env = enabledEnvironment();
    const start = Date.parse('2026-08-28T12:00:00.000Z');
    const active = coordinator({ env, now: start, snapshotTtlMs: 1_000 });
    active.value.requestRefresh({ trigger: 'startup' });
    await active.value.waitForCurrentRefresh();
    expect(active.value.current().status).toBe('READY');

    active.setNow(start + 1_001);
    expect(active.value.current()).toMatchObject({ status: 'NOT_READY', snapshot_status: 'STALE' });
    expect(active.value.current().reason_codes).toContain('controlled_beta_readiness_snapshot_stale');

    const sourceBound = coordinator({ env });
    sourceBound.value.requestRefresh({ trigger: 'startup' });
    await sourceBound.value.waitForCurrentRefresh();
    env.CALINIUM_CONTROLLED_BETA_SOURCE_REVISION = 'e'.repeat(40);
    expect(sourceBound.value.current()).toMatchObject({ status: 'NOT_READY', snapshot_status: 'MISMATCH' });

    const restarted = coordinator({ env: enabledEnvironment(), processGenerationId: 'readiness-process-e5rm-restarted' }).value;
    expect(restarted.current()).toMatchObject({ status: 'NOT_READY', snapshot_status: 'INITIALIZING' });
  });

  it('invalidates READY when any sanitized controlled-runtime policy changes', async () => {
    const env = enabledEnvironment();
    const { value } = coordinator({ env });
    value.requestRefresh({ trigger: 'startup' });
    await value.waitForCurrentRefresh();
    expect(value.current().status).toBe('READY');
    env.CALINIUM_CONTROLLED_BETA_OPERATOR_USER_IDS = 'usr_e5rm_second_operator';
    expect(value.current()).toMatchObject({ status: 'NOT_READY', snapshot_status: 'MISMATCH' });
  });

  it('bounds recovery, never commits late READY, and skips recovery after a binding change', async () => {
    const recovery = deferred();
    const beforeReady = vi.fn(() => recovery.promise);
    const timed = coordinator({ deepAttestation: async () => readiness(), beforeReady, deepAttestationTimeoutMs: 5 }).value;
    timed.requestRefresh({ trigger: 'startup' });
    await timed.waitForCurrentRefresh();
    expect(timed.current()).toMatchObject({ status: 'NOT_READY', snapshot_status: 'NOT_READY' });
    expect(timed.current().reason_codes).toContain('controlled_beta_deep_attestation_timeout');
    recovery.resolve(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(timed.current().status).toBe('NOT_READY');

    const env = enabledEnvironment();
    const gate = deferred();
    const mismatchedRecovery = vi.fn(async () => true);
    const changed = coordinator({ env, deepAttestation: () => gate.promise, beforeReady: mismatchedRecovery }).value;
    changed.requestRefresh({ trigger: 'startup' });
    env.CALINIUM_SHOPIFY_MAIN_THEME_ID = '1002';
    gate.resolve(readiness());
    await changed.waitForCurrentRefresh();
    expect(mismatchedRecovery).not.toHaveBeenCalled();
    expect(changed.current()).toMatchObject({ status: 'NOT_READY', snapshot_status: 'MISMATCH' });
  });

  it('keeps readiness projection responsive while a 5,827 ms-equivalent deep operation is unresolved', async () => {
    const slow = deferred();
    const deep = vi.fn(() => slow.promise);
    const { value } = coordinator({ deepAttestation: deep });
    value.start();
    const services = {
      env: {},
      readiness: async () => {
        const snapshot = value.current();
        if (snapshot.status !== 'READY') {
          const error = Object.assign(new Error('not ready'), { code: 'dashboard_not_ready', status: 503 });
          const { DashboardError } = require('../server/lib/errors.cjs');
          throw new DashboardError(error.code, error.message, error.status, { snapshot_status: snapshot.snapshot_status, reason_codes: snapshot.reason_codes });
        }
        return { controlled_beta: 'ready' };
      }
    };
    const api = createDashboardApiHandler({ services });
    const healthStarted = performance.now();
    expect((await invoke(api, { url: '/api/health' })).status).toBe(200);
    expect(performance.now() - healthStarted).toBeLessThan(250);
    const readyStarted = performance.now();
    expect((await invoke(api, { url: '/api/ready' }))).toMatchObject({ status: 503, payload: { error: { code: 'dashboard_not_ready' } } });
    expect(performance.now() - readyStarted).toBeLessThan(500);
    expect(deep).toHaveBeenCalledTimes(1);
    slow.resolve(readiness());
    await value.waitForCurrentRefresh();
    await value.close();
  });

  it('runs background refresh with bounded automatic retries while allowing an operator retry', async () => {
    let scheduled;
    const deep = vi.fn(async () => readiness({ status: 'NOT_READY' }));
    const { value } = coordinator({
      deepAttestation: deep,
      maxAutomaticFailures: 2,
      setIntervalFn: (callback) => { scheduled = callback; return { unref() {} }; }
    });
    value.start();
    await value.waitForCurrentRefresh();
    scheduled();
    await value.waitForCurrentRefresh();
    expect(value.current().automatic_refresh_suspended).toBe(true);
    scheduled();
    expect(deep).toHaveBeenCalledTimes(2);
    const operator = value.requestRefresh({ trigger: 'operator' });
    expect(operator.status).toBe('running');
    await value.waitForCurrentRefresh();
    expect(deep).toHaveBeenCalledTimes(3);
    await value.close();
  });
});

describe('E5R-M deep attestation and worker boundary', () => {
  it('uses one shared CLI/runtime-state result for both readiness components', async () => {
    const cli = vi.fn(async () => ({
      ready: true,
      runtime_revision: 'shopify-cli-runtime-v1',
      expected_version: '4.6.0',
      actual_version: '4.6.0',
      runtime_state_revision: 'shopify-cli-runtime-state-v1',
      runtime_state_writable: true,
      package_immutable: true,
      auto_upgrade_state: 'off',
      runtime_dependencies_ready: true
    }));
    const source = { ready: true, revision: SOURCE };
    const probes = Object.fromEntries(COMPONENTS.filter((name) => !['configuration', 'source_attestation', 'beta_allowlist', 'shopify_cli_runtime', 'shopify_cli_runtime_state', 'shopify_runtime_credentials'].includes(name)).map((name) => [name, true]));
    const run = createControlledBetaDeepAttestation({
      env: enabledEnvironment(),
      cliDeepAttestation: cli,
      probes: { ...probes, source_attestation: source }
    });
    const result = await run();
    expect(result.reason_codes, JSON.stringify(result.components)).toEqual([]);
    expect(result.status).toBe('READY');
    expect(result.components.shopify_cli_runtime.ready).toBe(true);
    expect(result.components.shopify_cli_runtime_state.ready).toBe(true);
    expect(cli).toHaveBeenCalledTimes(1);
  });

  it('rejects a self-consistent but unpinned CLI version', async () => {
    const probes = Object.fromEntries(COMPONENTS.filter((name) => !['configuration', 'source_attestation', 'beta_allowlist', 'shopify_cli_runtime', 'shopify_cli_runtime_state', 'shopify_runtime_credentials'].includes(name)).map((name) => [name, true]));
    const run = createControlledBetaDeepAttestation({
      env: enabledEnvironment(),
      cliDeepAttestation: async () => ({
        ready: true,
        runtime_revision: 'shopify-cli-runtime-v1',
        expected_version: '9.9.9',
        actual_version: '9.9.9',
        runtime_state_revision: 'shopify-cli-runtime-state-v1',
        runtime_state_writable: true,
        package_immutable: true,
        auto_upgrade_state: 'off',
        runtime_dependencies_ready: true
      }),
      probes: { ...probes, source_attestation: { ready: true, revision: SOURCE } }
    });
    const result = await run();
    expect(result.status).toBe('NOT_READY');
    expect(result.components.shopify_cli_runtime).toEqual({ ready: false, reason_code: 'shopify_cli_version_mismatch' });
  });

  it('composes caller cancellation into Shopify authority and verifies MAIN exclusion', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn((_url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    const adapter = new ShopifyAdminApiAdapter({ fetchImpl });
    const pending = adapter.graphql({ shopDomain: SHOP, accessToken: 'test-token', query: 'query Test { shop { id } }', signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'shopify_network_unavailable' });

    const configuration = readControlledBetaRuntimeConfiguration(enabledEnvironment());
    const store = {
      findShopifyConnectionByDomain: vi.fn(async () => ({ connection_status: 'ready', credential_status: 'active' }))
    };
    const shopify = {
      connectionAccess: vi.fn(async () => 'test-token'),
      adapter: {
        listResourcePage: vi.fn(async () => ({
          nodes: [
            { id: 'gid://shopify/OnlineStoreTheme/1001', role: 'MAIN' },
            { id: 'gid://shopify/OnlineStoreTheme/2002', role: 'DEVELOPMENT', processing: false, processingFailed: false }
          ]
        }))
      }
    };
    expect(await verifyConfiguredControlledTargets({ configuration, store, shopify, expectedMainThemeId: '1001' })).toBe(true);
    expect(await verifyConfiguredControlledTargets({ configuration, store, shopify, expectedMainThemeId: '9999' })).toBe(false);
  });

  it('does not schedule recovered jobs after the readiness operation is aborted', async () => {
    const jobs = deferred();
    const runner = new MerchantFlowJobRunner({
      store: { listRecoverableMerchantFlowJobs: vi.fn(() => jobs.promise) },
      autoRun: false
    });
    const schedule = vi.spyOn(runner, 'schedule');
    const controller = new AbortController();
    const pending = runner.recoverAll(100, { signal: controller.signal });
    controller.abort();
    jobs.resolve([{ id: 'merchant-flow-job-e5rm', status: 'queued' }]);
    await pending;
    expect(schedule).not.toHaveBeenCalled();
  });

  it('sanitizes a worker crash and bounds a worker timeout', async () => {
    class CrashedWorker extends EventEmitter {
      terminate() { return Promise.resolve(1); }
      constructor() { super(); queueMicrotask(() => this.emit('error', new Error('private worker failure'))); }
    }
    await expect(runControlledReadinessDeepAttestationWorker({
      root: process.cwd(),
      env: {},
      workerFactory: () => new CrashedWorker(),
      timeoutMs: 100
    })).rejects.toMatchObject({ code: 'controlled_beta_deep_attestation_worker_failed' });

    class SilentWorker extends EventEmitter {
      terminate() { return Promise.resolve(1); }
    }
    await expect(runControlledReadinessDeepAttestationWorker({
      root: process.cwd(),
      env: {},
      workerFactory: () => new SilentWorker(),
      timeoutMs: 5
    })).rejects.toMatchObject({ code: 'controlled_beta_deep_attestation_timeout' });
  });
});

describe('E5R-M protected operator refresh', () => {
  it('requires a fresh embedded identity, project scope, and operator authorization, then returns 202', async () => {
    const env = enabledEnvironment();
    const refresh = vi.fn(() => ({
      status: 'running',
      operation_id: 'controlled-readiness-refresh-1234567890abcdef1234',
      trigger: 'operator',
      started_at: '2026-08-28T12:00:00.000Z',
      reused: false
    }));
    const operatorReadinessRefresh = vi.fn(async ({ userId, refresh: requestRefresh }) => {
      expect(userId).toBe(USER_ID);
      const operation = requestRefresh({ trigger: 'operator' });
      return { schema_version: '1.0', refresh_revision: 'controlled-beta-readiness-refresh-v1', ...operation, status: 'ACCEPTED' };
    });
    const operatorReadiness = vi.fn(async ({ userId, readinessLoader }) => {
      expect(userId).toBe(USER_ID);
      return readinessLoader();
    });
    const services = {
      env,
      auth: { authenticate: vi.fn(async () => null) },
      embeddedAuth: { resolveActor: vi.fn(async () => ({ user: { id: USER_ID }, identity: { organization_id: ORGANIZATION_ID }, connection: { id: CONNECTION_ID } })) },
      projects: { authorizeShopifyProjectContext: vi.fn(async () => true) },
      merchantFlow: { operatorReadiness, operatorReadinessRefresh },
      controlledBetaReadiness: () => ({ status: 'READY', snapshot_status: 'READY', snapshot_revision: 'controlled-beta-readiness-snapshot-v1' }),
      requestControlledBetaReadinessRefresh: refresh
    };
    const api = createDashboardApiHandler({ services, env });
    const snapshotPath = `/api/projects/${PROJECT_ID}/merchant-generation-flow/operator/readiness`;
    const path = `/api/projects/${PROJECT_ID}/merchant-generation-flow/operator/readiness/refresh`;
    const snapshotStarted = performance.now();
    const snapshot = await invoke(api, { url: snapshotPath, token: signedSession(env) });
    expect(performance.now() - snapshotStarted).toBeLessThan(1_000);
    expect(snapshot).toMatchObject({ status: 200, payload: { result: { status: 'READY', snapshot_status: 'READY' } } });
    expect(operatorReadiness).toHaveBeenCalledTimes(1);
    expect(await invoke(api, { method: 'POST', url: path, body: {} })).toMatchObject({ status: 403, payload: { error: { code: 'csrf_invalid' } } });
    const accepted = await invoke(api, { method: 'POST', url: path, token: signedSession(env), body: {} });
    expect(accepted).toMatchObject({ status: 202, payload: { result: { status: 'ACCEPTED', operation_id: 'controlled-readiness-refresh-1234567890abcdef1234' } } });
    expect(services.projects.authorizeShopifyProjectContext).toHaveBeenCalledWith({ userId: USER_ID, projectId: PROJECT_ID, organizationId: ORGANIZATION_ID, connectionId: CONNECTION_ID });
    expect(operatorReadinessRefresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
