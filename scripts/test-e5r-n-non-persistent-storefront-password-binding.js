#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const { EventEmitter } = require('events');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawnSync } = require('child_process');
const {
  SHOPIFY_STOREFRONT_PASSWORD_BINDING_REVISION,
  SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION,
  STOREFRONT_PASSWORD_ENV,
  REQUIREMENTS_REVISION_ENV,
  REQUIREMENTS_JSON_ENV,
  withoutShopifyStorefrontPassword,
  readShopifyStorefrontPasswordRequirements,
  createShopifyStorefrontPasswordBindingFactory
} = require('../ai/storefront-render/shopify-storefront-password-binding');
const {
  SHOPIFY_CLI_RUNTIME_STATE_REVISION,
  initializeShopifyCliRuntimeState,
  stateFiles
} = require('../ai/storefront-render/shopify-cli-runtime-state');
const {
  PINNED_SHOPIFY_CLI_VERSION,
  createShopifyCliRuntime
} = require('../ai/storefront-render/shopify-cli-runtime');
const {
  startShopifyDevelopmentRuntime,
  stopChildProcess,
  deferStorefrontRuntimeResourceFinalization,
  preferStorefrontRuntimeFailure
} = require('../ai/storefront-render/shopify-development-runtime');
const {
  merchantRenderCancellationError,
  createMerchantRenderCancellationMonitor,
  preferFatalError
} = require('../ai/storefront-render/merchant-flow-capture');
const {
  sha256,
  loadPatchContract,
  verifyPackageBinding,
  assertPatchedSource,
  applyPatch
} = require('./apply-shopify-cli-storefront-password-no-persist-patch');
const {
  runControlledReadinessDeepAttestationWorker
} = require('../apps/dashboard/server/workers/controlled-readiness-deep-attestation-worker.cjs');
const {
  readinessBinding,
  initialSnapshot
} = require('../apps/dashboard/server/services/merchant-flow-controlled-readiness-snapshot.cjs');
const { validateSchema } = require('../ai/shared/schema');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/e5r-n-non-persistent-storefront-password-binding.json'), 'utf8'));
const SHOP = fixture.release_9_blocker.shop_domain;
const OTHER_SHOP = 'other-e5rn.myshopify.com';
const OPERATION = 'merchant-flow-job-00000000000000000001';

function temporary(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function fakeSecret(label) {
  return ['e5rn', 'synthetic', label, 'credential', 'not-real'].join('-');
}

function result(status, stdout, stderr = '') {
  return { status, stdout, stderr, signal: null, error: null };
}

function fails(code, operation, expectedRetryable = null) {
  assert.throws(operation, (error) => error?.code === code
    && (expectedRetryable === null || error.retryable === expectedRetryable), `Expected bounded E5R-N failure ${code}.`);
}

async function rejects(code, operation, expectedRetryable = null) {
  await assert.rejects(operation, (error) => error?.code === code
    && (expectedRetryable === null || error.retryable === expectedRetryable), `Expected bounded E5R-N rejection ${code}.`);
}

function environmentFor(persistentRoot, {
  password = null,
  requirements = [{ shop_domain: SHOP, requirement: 'required' }],
  extra = {}
} = {}) {
  const env = {
    ...process.env,
    CALINIUM_PERSISTENT_ROOT: persistentRoot,
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_ROOT: path.join(persistentRoot, 'shopify-cli-runtime-state'),
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_REVISION: SHOPIFY_CLI_RUNTIME_STATE_REVISION,
    CALINIUM_SHOPIFY_CLI_RUNTIME_REVISION: 'shopify-cli-runtime-v1',
    CALINIUM_SHOPIFY_CLI_EXPECTED_VERSION: PINNED_SHOPIFY_CLI_VERSION,
    CALINIUM_SHOPIFY_CLI_AUTOUPGRADE_POLICY: 'disabled',
    CALINIUM_SHOPIFY_MAIN_THEME_ID: fixture.release_9_blocker.main_theme_id,
    SHOPIFY_CLI_THEME_TOKEN: fakeSecret('theme-access'),
    [REQUIREMENTS_REVISION_ENV]: SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION,
    [REQUIREMENTS_JSON_ENV]: JSON.stringify(requirements),
    ...extra
  };
  if (password !== null) env[STOREFRONT_PASSWORD_ENV] = password;
  else delete env[STOREFRONT_PASSWORD_ENV];
  return env;
}

function requirementsFor(env, shops = [SHOP]) {
  return readShopifyStorefrontPasswordRequirements(env, { shopDomains: shops });
}

function bindingFor(env, operationId = OPERATION, shopDomain = SHOP) {
  const requirements = requirementsFor(env, [shopDomain]);
  return createShopifyStorefrontPasswordBindingFactory({ env, requirements })({
    shopDomain,
    operationId
  });
}

function themeDevArgs(shopDomain = SHOP) {
  return [
    'theme', 'dev',
    '--path', path.join(root, 'apps', 'theme'),
    '--store', shopDomain,
    '--theme', fixture.release_9_blocker.development_theme_id,
    '--live-reload', 'off',
    '--host', '127.0.0.1',
    '--port', '9294',
    '--no-color'
  ];
}

function childScope(operationId = OPERATION, shopDomain = SHOP) {
  return { shopDomain, operationId, commandArgs: themeDevArgs(shopDomain) };
}

function assertSameSyntheticSecret(actual, expected, message) {
  assert.equal(actual === expected, true, message);
}

function allFiles(directory) {
  const files = [];
  function visit(current) {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const candidate = path.join(current, entry.name);
      if (entry.isDirectory()) visit(candidate);
      else if (entry.isFile()) files.push(candidate);
    }
  }
  visit(directory);
  return files;
}

function assertSecretAbsentFromFiles(directory, secret) {
  for (const file of allFiles(directory)) {
    assert.equal(fs.readFileSync(file).includes(Buffer.from(secret)), false, `Synthetic credential entered ${path.basename(file)}.`);
  }
}

function reconstructSources() {
  const contract = loadPatchContract(root);
  const target = path.join(root, 'node_modules', '@shopify', 'cli', contract.target_file);
  const installed = fs.readFileSync(target, 'utf8');
  let upstream;
  if (sha256(installed) === contract.upstream_sha256) upstream = installed;
  else if (sha256(installed) === contract.patched_sha256) {
    const index = installed.indexOf(contract.exact_substitution.after);
    assert.ok(index >= 0, 'The patched source cannot be deterministically reversed for the upstream regression proof.');
    upstream = `${installed.slice(0, index)}${contract.exact_substitution.before}${installed.slice(index + contract.exact_substitution.after.length)}`;
  } else throw new Error('Installed Shopify CLI source matches neither the approved upstream nor patched checksum.');
  assert.equal(Buffer.byteLength(upstream), fixture.patch.upstream_bytes);
  assert.equal(sha256(upstream), contract.upstream_sha256);
  assert.equal(upstream.indexOf(contract.exact_substitution.before), fixture.patch.substitution_offset);
  const patched = upstream.replace(contract.exact_substitution.before, contract.exact_substitution.after);
  assert.equal(Buffer.byteLength(patched), fixture.patch.patched_bytes);
  assert.equal(sha256(patched), contract.patched_sha256);
  assertPatchedSource(patched, contract);
  return { contract, installed, upstream, patched };
}

async function evaluatePasswordResolver(source, secret) {
  const directory = temporary('calinium-e5rn-resolver-');
  try {
    fs.writeFileSync(path.join(directory, 'package.json'), '{"type":"module"}\n');
    fs.writeFileSync(path.join(directory, 'chunk-STJ3LWFL.js'), 'export const c = () => "https://example.invalid";\n');
    fs.writeFileSync(path.join(directory, 'chunk-IKYZ5L3F.js'), 'export const d = async () => { globalThis.__e5rn_validations += 1; return true; };\n');
    fs.writeFileSync(path.join(directory, 'chunk-Z5DDPQ26.js'), [
      'export const f = () => "controlled.myshopify.com";',
      'export const m = () => null;',
      'export const n = (value) => { globalThis.__e5rn_store_attempts.push(value); };',
      'export const o = () => {};',
      'export const r = () => {};'
    ].join('\n'));
    fs.writeFileSync(path.join(directory, 'chunk-6YCGMS7X.js'), 'export const F = async () => { throw new Error("interactive prompt forbidden"); };\n');
    fs.writeFileSync(path.join(directory, 'chunk-VKWPEFWQ.js'), 'export const g = () => {};\n');
    const target = path.join(directory, 'resolver.js');
    fs.writeFileSync(target, source);
    global.__e5rn_validations = 0;
    global.__e5rn_store_attempts = [];
    const module = await import(`${pathToFileURL(target).href}?proof=${Date.now()}-${Math.random()}`);
    const returned = await module.a(secret, SHOP, Object.freeze({}));
    return {
      returned,
      validations: global.__e5rn_validations,
      storeAttempts: [...global.__e5rn_store_attempts]
    };
  } finally {
    delete global.__e5rn_validations;
    delete global.__e5rn_store_attempts;
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function proveLegacyConfWrite(secret) {
  const directory = temporary('calinium-e5rn-legacy-store-');
  const script = `
    import fs from 'node:fs';
    import path from 'node:path';
    import { pathToFileURL } from 'node:url';
    Object.defineProperty(process, 'platform', { value: 'linux' });
    const root = process.env.E5RN_REPOSITORY_ROOT;
    const module = await import(pathToFileURL(path.join(root, 'node_modules/@shopify/cli/dist/chunk-Z5DDPQ26.js')).href);
    module.n(process.env.SHOPIFY_FLAG_STORE_PASSWORD, { get(key) { return key === 'themeStore' ? process.env.E5RN_SHOP : undefined; } });
    await new Promise((resolve) => setTimeout(resolve, 100));
    process.stdout.write(JSON.stringify({ completed: true }));
  `;
  try {
    const env = {
      ...withoutShopifyStorefrontPassword(process.env),
      E5RN_REPOSITORY_ROOT: root,
      E5RN_SHOP: SHOP,
      XDG_CONFIG_HOME: path.join(directory, 'config'),
      XDG_CACHE_HOME: path.join(directory, 'cache'),
      XDG_STATE_HOME: path.join(directory, 'state'),
      XDG_DATA_HOME: path.join(directory, 'data'),
      [STOREFRONT_PASSWORD_ENV]: secret
    };
    const execution = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
      cwd: root,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15000,
      shell: false
    });
    assert.equal(execution.status, 0, execution.stderr);
    assert.doesNotMatch(`${execution.stdout}\n${execution.stderr}`, new RegExp(secret));
    const file = path.join(directory, 'config', 'shopify-cli-theme-store-password-nodejs', 'config.json');
    assert.ok(fs.existsSync(file), 'The exact Shopify CLI 4.6.0 password-store file was not produced by the legacy setter.');
    assert.equal(fs.readFileSync(file).includes(Buffer.from(secret)), true, 'Legacy Shopify CLI password storage did not reproduce with the synthetic credential.');
    return path.relative(directory, file);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function controlledChild({ exitOn = 'SIGINT' } = {}) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  child.pid = 4242;
  child.signals = [];
  child.kill = (signal) => {
    child.signals.push(signal);
    if (signal === exitOn) {
      child.signalCode = signal;
      queueMicrotask(() => child.emit('exit', null, signal));
    }
    return true;
  };
  return child;
}

const tests = [];
function test(name, operation) { tests.push({ name, operation }); }

test('fixture and exact binding/patch identities remain authoritative', () => {
  assert.equal(SHOPIFY_STOREFRONT_PASSWORD_BINDING_REVISION, fixture.binding_revision);
  assert.equal(SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION, fixture.requirements_revision);
  assert.equal(PINNED_SHOPIFY_CLI_VERSION, fixture.patch.package_version);
  assert.deepEqual(Object.keys(fixture.cases), 'ABCDEFGHIJKLMNOP'.split(''));
  assert.deepEqual(fixture.preserved_identity, {
    project_id: 'prj_public-fixture-0001',
    merchant_flow_id: 'merchant-flow-00000000000000000001',
    generation_job_id: 'merchant-flow-job-00000000000000000002',
    artifact_id: 'theme-artifact-00000000000000000001',
    artifact_checksum: 'c2e5dd71a4b06b173f266cc3c5e7cf60aff4c3c9f269b73b372bcf3f66e95b09',
    render_job_id: 'merchant-flow-job-00000000000000000001',
    render_job_state: 'retryable',
    architecture_profile_id: 'profile.editorial_discovery.v1',
    architecture_revision_id: 'architecture-selection-7b835c017232aa922918',
    design_dna_id: 'adna_0989b341020b3def5aac2c7eda0b1b93b9af1aae'
  });
});

test('A/B — requirement status distinguishes NOT_REQUIRED, missing required, and configured required', () => {
  const directory = temporary('calinium-e5rn-requirements-');
  const secret = fakeSecret('storefront');
  try {
    const optionalEnv = environmentFor(directory, { password: secret, requirements: [{ shop_domain: SHOP, requirement: 'not_required' }] });
    const optional = requirementsFor(optionalEnv);
    assert.equal(optional.status, 'NOT_REQUIRED');
    assert.equal(optional.configured, true);
    assert.doesNotMatch(JSON.stringify(optional), new RegExp(secret));
    const optionalBinding = bindingFor(optionalEnv);
    assert.equal(optionalBinding.status, 'NOT_REQUIRED');
    assert.equal(Object.prototype.hasOwnProperty.call(optionalBinding.childEnvironment(optionalEnv, childScope()), STOREFRONT_PASSWORD_ENV), false);
    optionalBinding.release();

    const missingEnv = environmentFor(directory);
    const missing = requirementsFor(missingEnv);
    assert.equal(missing.status, 'NOT_READY');
    assert.equal(missing.reason_code, 'shopify_storefront_password_required');
    fails('shopify_storefront_password_required', () => bindingFor(missingEnv), true);

    const smuggled = environmentFor(directory, {
      requirements: [{ shop_domain: SHOP, requirement: 'required', password: secret }]
    });
    const rejectedRegistry = requirementsFor(smuggled);
    assert.equal(rejectedRegistry.status, 'NOT_READY');
    assert.equal(rejectedRegistry.reason_code, 'shopify_storefront_password_requirement_invalid');
    assert.doesNotMatch(JSON.stringify(rejectedRegistry), new RegExp(secret));

    const configured = requirementsFor(environmentFor(directory, { password: secret }));
    assert.equal(configured.status, 'READY');
    assert.doesNotMatch(JSON.stringify(configured), new RegExp(secret));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('A/B/F — missing requirement configuration remains a schema-valid sanitized NOT_READY snapshot', () => {
  const missing = readShopifyStorefrontPasswordRequirements({}, { shopDomains: [SHOP] });
  assert.equal(missing.status, 'NOT_READY');
  const configuration = {
    enabled: true,
    deployment_source_revision: fixture.active_source_revision,
    configuration_revision: 'merchant-flow-controlled-beta-runtime-v1',
    render_target_configuration_revision: 'merchant-flow-controlled-render-targets-v1',
    controlled_shop_domains: [SHOP],
    render_targets: [{
      shop_domain: SHOP,
      theme_id: fixture.release_9_blocker.development_theme_id,
      expected_theme_role: 'development'
    }],
    capabilities: { d1: true, operator_authorization: true },
    d2_7: { required: true },
    shopify_runtime: {
      runtime_revision: 'shopify-cli-runtime-v1',
      expected_version: '4.6.0',
      runtime_state_revision: 'shopify-cli-runtime-state-v1',
      autoupgrade_policy: 'disabled',
      storefront_password: missing
    },
    operator_roles: [],
    operator_user_ids: [],
    safety: {},
    validation: { valid: true, reason_codes: [] }
  };
  const binding = readinessBinding({
    env: {
      CALINIUM_CONTROLLED_BETA_SOURCE_REVISION: fixture.active_source_revision,
      CALINIUM_BUILD_SOURCE_REVISION: fixture.active_source_revision,
      CALINIUM_SHOPIFY_MAIN_THEME_ID: fixture.release_9_blocker.main_theme_id
    },
    configuration,
    processGenerationId: 'readiness-process-e5rn-missing'
  });
  const snapshot = initialSnapshot({ binding, at: '2026-08-31T00:00:00.000Z' });
  assert.deepEqual(validateSchema(snapshot, 'schemas/calinium-controlled-beta-readiness-snapshot.schema.json', { root }), []);
  assert.equal(snapshot.binding.shopify_storefront_password_status, 'NOT_READY');
  assert.equal(snapshot.binding.shopify_storefront_password_requirements_revision, '');
  assert.deepEqual(snapshot.binding.shopify_storefront_password_requirements, []);
  const schema = JSON.parse(fs.readFileSync(path.join(root, 'schemas/calinium-controlled-beta-readiness-snapshot.schema.json'), 'utf8'));
  assert.equal(schema.$defs.binding.allOf[0].then.properties.shopify_storefront_password_requirements.minItems, 1);
});

test('B — exact controlled pre-render rejects a missing required secret before state, inventory, or child startup', async () => {
  const directory = temporary('calinium-e5rn-prerender-missing-');
  try {
    const env = environmentFor(directory);
    const requirements = requirementsFor(env);
    const factory = createShopifyStorefrontPasswordBindingFactory({ env, requirements });
    let stateCalls = 0;
    let inventoryCalls = 0;
    let spawnCalls = 0;
    await rejects('shopify_storefront_password_required', () => startShopifyDevelopmentRuntime({
      root,
      request: {
        request_id: OPERATION,
        target: {
          runtime_mode: 'shopify_development_theme',
          shop_domain: SHOP,
          theme_id: fixture.release_9_blocker.development_theme_id,
          expected_theme_role: 'development'
        }
      },
      themeDirectory: path.join(root, 'apps', 'theme'),
      exactDevelopmentTarget: true,
      env,
      storefrontPasswordBindingFactory: factory,
      runtimeStateFactory() { stateCalls += 1; throw new Error('runtime state must not start'); },
      shopifyCliRuntime: {
        listThemes() { inventoryCalls += 1; throw new Error('inventory must not run'); },
        spawn() { spawnCalls += 1; throw new Error('child must not start'); }
      }
    }), true);
    assert.deepEqual({ stateCalls, inventoryCalls, spawnCalls }, { stateCalls: 0, inventoryCalls: 0, spawnCalls: 0 });
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('C/D/G/I — exact controlled pre-render forwards only to the authorized theme-dev child', async () => {
  const directory = temporary('calinium-e5rn-prerender-success-');
  const secret = fakeSecret('storefront-prerender');
  const server = http.createServer((_request, response) => { response.writeHead(200); response.end('ok'); });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const port = server.address().port;
    const env = environmentFor(directory, { password: secret });
    const requirements = requirementsFor(env);
    const factory = createShopifyStorefrontPasswordBindingFactory({ env, requirements });
    const child = controlledChild({ exitOn: 'SIGINT' });
    const spawnEvidence = [];
    const themes = [
      { id: fixture.release_9_blocker.main_theme_id, name: 'Main', role: 'main' },
      { id: fixture.release_9_blocker.development_theme_id, name: 'Development', role: 'development' }
    ];
    const cli = {
      attestRuntimeStateReadiness() {
        return { ready: true, package_immutable: true, runtime_state_writable: true, auto_upgrade_state: 'off', actual_version: '4.6.0' };
      },
      listThemes(_shop, options = {}) {
        assert.equal(options.commandEnv[STOREFRONT_PASSWORD_ENV], undefined);
        return { data: themes };
      },
      assertDevelopmentTarget(records, themeId) {
        assert.equal(String(themeId), fixture.release_9_blocker.development_theme_id);
        return records.find((record) => String(record.id) === String(themeId));
      },
      spawn(args, options) {
        spawnEvidence.push({ args: [...args], env: options.commandEnv, allow: options.allowStorefrontPassword });
        setTimeout(() => child.stdout.emit('data', [
          `http://127.0.0.1:${port}`,
          `https://${SHOP}/?preview_theme_id=${fixture.release_9_blocker.development_theme_id}`
        ].join('\n')), 0);
        return child;
      },
      assertStable(version) { assert.equal(version, '4.6.0'); return true; }
    };
    const runtime = await startShopifyDevelopmentRuntime({
      root,
      request: {
        request_id: OPERATION,
        target: {
          runtime_mode: 'shopify_development_theme',
          shop_domain: SHOP,
          theme_id: fixture.release_9_blocker.development_theme_id,
          expected_theme_role: 'development'
        }
      },
      themeDirectory: path.join(root, 'apps', 'theme'),
      port,
      startupTimeoutMs: 5000,
      exactDevelopmentTarget: true,
      env,
      shopifyCliRuntime: cli,
      storefrontPasswordBindingFactory: factory,
      shutdownTimings: { interrupt_ms: 0, terminate_ms: 0, kill_ms: 5 }
    });
    assert.equal(spawnEvidence.length, 1);
    assert.equal(spawnEvidence[0].allow, true);
    assertSameSyntheticSecret(spawnEvidence[0].env[STOREFRONT_PASSWORD_ENV], secret, 'Exact controlled pre-render did not bind the synthetic credential to its child.');
    assert.equal(spawnEvidence[0].env.SHOPIFY_CLI_THEME_TOKEN, env.SHOPIFY_CLI_THEME_TOKEN);
    assert.equal(spawnEvidence[0].args.includes('--store-password'), false);
    assert.doesNotMatch(JSON.stringify(spawnEvidence[0].args), new RegExp(secret));
    assert.equal(await runtime.stop(), true);
    assertSecretAbsentFromFiles(directory, secret);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('C/D/I — only the theme-dev child receives a distinct environment credential and argv stays secret-free', () => {
  const directory = temporary('calinium-e5rn-child-env-');
  const secret = fakeSecret('storefront');
  try {
    const env = environmentFor(directory, { password: secret });
    const binding = bindingFor(env);
    const descriptor = JSON.stringify(binding);
    assert.doesNotMatch(descriptor, new RegExp(secret));
    assert.equal(binding.requirement, 'required');
    assert.deepEqual(binding.describe(), binding.descriptor);
    assert.deepEqual(binding.toJSON(), binding.descriptor);
    for (const forbidden of ['password', 'secret', 'length', 'hash', 'prefix', 'fingerprint']) assert.equal(Object.keys(binding).includes(forbidden), false);
    const generic = withoutShopifyStorefrontPassword(env);
    assert.equal(generic[STOREFRONT_PASSWORD_ENV], undefined);
    assert.equal(generic.SHOPIFY_CLI_THEME_TOKEN, env.SHOPIFY_CLI_THEME_TOKEN);
    const child = binding.childEnvironment(generic, childScope());
    assertSameSyntheticSecret(child[STOREFRONT_PASSWORD_ENV], secret, 'The bounded theme-dev child did not receive its synthetic credential.');
    assert.equal(child.SHOPIFY_CLI_THEME_TOKEN, env.SHOPIFY_CLI_THEME_TOKEN);
    assert.notEqual(child[STOREFRONT_PASSWORD_ENV], child.SHOPIFY_CLI_THEME_TOKEN);
    const args = themeDevArgs();
    assert.equal(args.includes('--store-password'), false);
    assert.doesNotMatch(JSON.stringify(args), new RegExp(secret));
    binding.release();
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('E/F — sanitized status, worker transport, render contracts, and diagnostics contain no storefront credential', async () => {
  const directory = temporary('calinium-e5rn-channels-');
  const secret = fakeSecret('storefront');
  try {
    const env = environmentFor(directory, { password: secret });
    let workerEnvironment = null;
    class FailedWorker extends EventEmitter {
      terminate() { return Promise.resolve(1); }
    }
    await rejects('controlled_beta_deep_attestation_worker_failed', () => runControlledReadinessDeepAttestationWorker({
      root,
      env,
      timeoutMs: 100,
      workerFactory(_filename, options) {
        workerEnvironment = options.env;
        const worker = new FailedWorker();
        queueMicrotask(() => worker.emit('error', new Error('bounded synthetic worker failure')));
        return worker;
      }
    }));
    assert.ok(workerEnvironment, 'The controlled readiness worker did not expose its sanitized test environment.');
    assert.equal(workerEnvironment[STOREFRONT_PASSWORD_ENV], undefined);
    assert.equal(workerEnvironment.SHOPIFY_CLI_THEME_TOKEN, env.SHOPIFY_CLI_THEME_TOKEN);
    const safeBinding = bindingFor(env);
    const safeChannels = {
      requirement: requirementsFor(env),
      binding: JSON.parse(JSON.stringify(safeBinding)),
      fixture_safety: fixture.safety
    };
    assert.doesNotMatch(JSON.stringify(safeChannels), new RegExp(secret));
    safeBinding.release();
    for (const relative of [
      'schemas/calinium-storefront-render-request.schema.json',
      'schemas/calinium-storefront-render-result.schema.json',
      'schemas/calinium-merchant-flow-storefront-render-request.schema.json',
      'schemas/calinium-merchant-flow-storefront-render-result.schema.json',
      'ai/storefront-render/merchant-flow-contracts.js'
    ]) {
      const source = fs.readFileSync(path.join(root, relative), 'utf8');
      assert.equal(source.includes(STOREFRONT_PASSWORD_ENV), false, `${relative} gained a durable storefront-password channel.`);
    }
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('G — generic runtime state stays password-free while retaining Theme Access and a binding-aware guard', () => {
  const directory = temporary('calinium-e5rn-state-');
  const secret = fakeSecret('storefront');
  try {
    const env = environmentFor(directory, { password: secret });
    const state = initializeShopifyCliRuntimeState({
      root,
      env,
      scope: { kind: 'render', job_id: OPERATION, shop_domain: SHOP }
    });
    assert.equal(state.environment[STOREFRONT_PASSWORD_ENV], undefined);
    assert.equal(state.environment.SHOPIFY_CLI_THEME_TOKEN, env.SHOPIFY_CLI_THEME_TOKEN);
    assert.equal(typeof state.assertCredentialAbsent, 'function');
    const binding = bindingFor(env);
    assert.equal(binding.assertNoPersistence(state, { shopDomain: SHOP, operationId: OPERATION }), true);
    assert.equal(state.attest().credential_persistence, false);
    assertSecretAbsentFromFiles(directory, secret);
    binding.release();
    assert.equal(state.cleanup(), true);
    assertSecretAbsentFromFiles(directory, secret);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('H/P — exact upstream writes, exact patched resolver validates without invoking storage, and version drift fails', async () => {
  const secret = fakeSecret('storefront');
  const sources = reconstructSources();
  assert.equal(proveLegacyConfWrite(secret), fixture.patch.legacy_password_store.replace('XDG_CONFIG_HOME/', 'config/'));
  const legacy = await evaluatePasswordResolver(sources.upstream, secret);
  assertSameSyntheticSecret(legacy.returned, secret, 'The legacy resolver did not return the validated synthetic credential.');
  assert.equal(legacy.validations, 1);
  assert.equal(legacy.storeAttempts.length, 1);
  assertSameSyntheticSecret(legacy.storeAttempts[0], secret, 'The legacy resolver did not invoke its password-store setter.');
  const corrected = await evaluatePasswordResolver(sources.patched, secret);
  assertSameSyntheticSecret(corrected.returned, secret, 'The corrected resolver did not return the validated synthetic credential.');
  assert.equal(corrected.validations, 1);
  assert.deepEqual(corrected.storeAttempts, []);
  fails('shopify_storefront_password_patch_package_mismatch', () => verifyPackageBinding(root, { ...sources.contract, package_version: '4.7.0' }));
  if (sha256(sources.installed) === sources.contract.patched_sha256) {
    assert.equal(applyPatch({ repositoryRoot: root, verifyOnly: true }).status, 'verified');
  } else {
    fails('shopify_storefront_password_patch_missing', () => applyPatch({ repositoryRoot: root, verifyOnly: true }));
  }
});

test('J/K — wrong-shop and cross-operation use fail closed; a fresh operation reacquires from process state', () => {
  const directory = temporary('calinium-e5rn-scope-');
  const secret = fakeSecret('storefront');
  try {
    const env = environmentFor(directory, { password: secret });
    const requirements = requirementsFor(env);
    const factory = createShopifyStorefrontPasswordBindingFactory({ env, requirements });
    const first = factory({ shopDomain: SHOP, operationId: OPERATION });
    fails('controlled_beta_storefront_password_binding_scope_mismatch', () => first.childEnvironment(env, childScope(OPERATION, OTHER_SHOP)), false);
    fails('controlled_beta_storefront_password_binding_scope_mismatch', () => first.childEnvironment(env, childScope(`${OPERATION}-other`)), false);
    const secondOperation = `${OPERATION}-restart`;
    const second = factory({ shopDomain: SHOP, operationId: secondOperation });
    assertSameSyntheticSecret(
      second.childEnvironment(env, childScope(secondOperation))[STOREFRONT_PASSWORD_ENV],
      secret,
      'A fresh bounded operation did not reacquire its synthetic credential.'
    );
    first.release();
    second.release();
    fails('controlled_beta_storefront_password_binding_scope_invalid', () => factory({ shopDomain: OTHER_SHOP, operationId: OPERATION }), false);

    const multiple = environmentFor(directory, {
      password: secret,
      requirements: [
        { shop_domain: SHOP, requirement: 'required' },
        { shop_domain: OTHER_SHOP, requirement: 'required' }
      ]
    });
    assert.equal(requirementsFor(multiple, [SHOP, OTHER_SHOP]).reason_code, 'shopify_storefront_password_multiple_required_shops_unsupported');
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('generic CLI commands are scrubbed and only an explicitly allowed theme-dev spawn receives the binding', () => {
  const directory = temporary('calinium-e5rn-cli-');
  const secret = fakeSecret('storefront');
  try {
    const env = environmentFor(directory, { password: secret });
    const executionEnvironments = [];
    const spawned = [];
    let buildEnvironment = null;
    const themes = JSON.stringify([
      { id: fixture.release_9_blocker.main_theme_id, name: 'Main', role: 'main' },
      { id: fixture.release_9_blocker.development_theme_id, name: 'Development', role: 'development' }
    ]);
    const runtime = createShopifyCliRuntime({
      root,
      env,
      command: '/controlled/shopify',
      runner(_command, args, options) {
        executionEnvironments.push(options.env);
        return args[0] === 'version' ? result(0, '4.6.0\n') : result(0, themes);
      },
      spawnProcess(_command, args, options) {
        spawned.push({ args: [...args], env: options.env });
        return controlledChild();
      },
      buildAttestor({ env: attestationEnvironment }) {
        buildEnvironment = attestationEnvironment;
        return { runtime_filesystem: 'read_only' };
      }
    });
    assert.equal(runtime.attestRuntimeStateReadiness().ready, true);
    assert.equal(runtime.listThemes(SHOP).data.length, 2);
    assert.ok(executionEnvironments.length > 0);
    for (const commandEnv of executionEnvironments) {
      assert.equal(commandEnv[STOREFRONT_PASSWORD_ENV], undefined);
      assert.equal(commandEnv.SHOPIFY_CLI_THEME_TOKEN, env.SHOPIFY_CLI_THEME_TOKEN);
    }
    assert.equal(buildEnvironment[STOREFRONT_PASSWORD_ENV], undefined);

    const state = initializeShopifyCliRuntimeState({ root, env, scope: { kind: 'render', job_id: OPERATION, shop_domain: SHOP } });
    const binding = bindingFor(env);
    const args = themeDevArgs();
    const childEnvironment = binding.childEnvironment(state.environment, childScope());
    runtime.spawn(args, { commandEnv: childEnvironment, allowStorefrontPassword: true });
    fails(
      'controlled_beta_storefront_password_binding_child_command_invalid',
      () => runtime.spawn(['version'], { commandEnv: childEnvironment, allowStorefrontPassword: true }),
      false
    );
    assert.equal(spawned.length, 1);
    assertSameSyntheticSecret(spawned[0].env[STOREFRONT_PASSWORD_ENV], secret, 'Only the explicit bounded theme-dev spawn must receive the synthetic credential.');
    assert.equal(spawned[0].args.includes('--store-password'), false);
    assert.doesNotMatch(JSON.stringify(spawned[0].args), new RegExp(secret));
    binding.assertNoPersistence(state, { shopDomain: SHOP, operationId: OPERATION });
    binding.release();
    state.cleanup();
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('L/M/N — startup failure, timeout escalation, and normal shutdown all release without state', async () => {
  const scenarios = [
    { name: 'startup_failure', child: null, expectedSignals: [] },
    { name: 'timeout', child: controlledChild({ exitOn: 'SIGKILL' }), expectedSignals: ['SIGINT', 'SIGTERM', 'SIGKILL'] },
    { name: 'normal_shutdown', child: controlledChild({ exitOn: 'SIGINT' }), expectedSignals: ['SIGINT'] }
  ];
  for (const scenario of scenarios) {
    const directory = temporary(`calinium-e5rn-${scenario.name}-`);
    const secret = fakeSecret(`storefront-${scenario.name}`);
    try {
      const env = environmentFor(directory, { password: secret });
      const state = initializeShopifyCliRuntimeState({ root, env, scope: { kind: 'render', job_id: `${OPERATION}-${scenario.name}`, shop_domain: SHOP } });
      const requirements = requirementsFor(env);
      const binding = createShopifyStorefrontPasswordBindingFactory({ env, requirements })({ shopDomain: SHOP, operationId: `${OPERATION}-${scenario.name}` });
      binding.childEnvironment(state.environment, childScope(`${OPERATION}-${scenario.name}`));
      binding.assertNoPersistence(state, { shopDomain: SHOP, operationId: `${OPERATION}-${scenario.name}` });
      if (scenario.child) {
        assert.equal(await stopChildProcess(scenario.child, { interrupt_ms: 0, terminate_ms: 0, kill_ms: 5 }), true);
        assert.deepEqual(scenario.child.signals, scenario.expectedSignals);
      }
      binding.assertNoPersistence(state, { shopDomain: SHOP, operationId: `${OPERATION}-${scenario.name}` });
      binding.release();
      fails('controlled_beta_storefront_password_binding_released', () => binding.childEnvironment(state.environment, childScope(`${OPERATION}-${scenario.name}`)), false);
      assert.equal(state.cleanup(), true);
      assertSecretAbsentFromFiles(directory, secret);
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
  }
});

test('L/M/N — cancellation signals reach the active lifecycle and terminal shutdown failures take precedence', async () => {
  const signalSource = new EventEmitter();
  const processMonitor = createMerchantRenderCancellationMonitor({
    abortRequested: () => false,
    signalSource,
    pollIntervalMs: 5
  });
  processMonitor.start();
  signalSource.emit('SIGTERM');
  fails('merchant_flow_job_cancelled', () => processMonitor.throwIfAborted(), false);
  processMonitor.stop();

  const durableMonitor = createMerchantRenderCancellationMonitor({
    abortRequested: async () => true,
    signalSource: new EventEmitter(),
    pollIntervalMs: 5
  });
  durableMonitor.start();
  await rejects('merchant_flow_job_cancelled', () => durableMonitor.checkNow(), false);
  durableMonitor.stop();

  const captureFailure = Object.assign(new Error('capture failed'), { code: 'shopify_render_failed', retryable: true });
  const shutdownFailure = Object.assign(new Error('shutdown failed'), {
    code: 'controlled_beta_storefront_password_binding_shutdown_failed',
    retryable: false
  });
  assert.equal(preferFatalError(captureFailure, shutdownFailure), shutdownFailure);
  assert.equal(preferFatalError(shutdownFailure, captureFailure), shutdownFailure);
  assert.equal(preferStorefrontRuntimeFailure(captureFailure, shutdownFailure), shutdownFailure);
  assert.equal(preferStorefrontRuntimeFailure(shutdownFailure, captureFailure), shutdownFailure);
});

test('L/M/N — active cancellation stops the credential-bearing startup child before releasing state', async () => {
  const directory = temporary('calinium-e5rn-active-cancel-');
  const secret = fakeSecret('storefront-active-cancel');
  const controller = new AbortController();
  const child = controlledChild({ exitOn: 'SIGINT' });
  let capturedBinding = null;
  try {
    const env = environmentFor(directory, { password: secret });
    const requirements = requirementsFor(env);
    const factory = createShopifyStorefrontPasswordBindingFactory({ env, requirements });
    const capturingFactory = (scope) => {
      capturedBinding = factory(scope);
      return capturedBinding;
    };
    const themes = [
      { id: fixture.release_9_blocker.main_theme_id, name: 'Main', role: 'main' },
      { id: fixture.release_9_blocker.development_theme_id, name: 'Development', role: 'development' }
    ];
    const cli = {
      attestRuntimeStateReadiness() {
        return { ready: true, package_immutable: true, runtime_state_writable: true, auto_upgrade_state: 'off', actual_version: '4.6.0' };
      },
      listThemes() { return { data: themes }; },
      assertDevelopmentTarget(_themes, themeId) {
        return { id: String(themeId), name: 'Development', role: 'development' };
      },
      spawn(_args, options) {
        assertSameSyntheticSecret(options.commandEnv[STOREFRONT_PASSWORD_ENV], secret, 'The active child did not receive the bounded synthetic credential.');
        queueMicrotask(() => controller.abort(merchantRenderCancellationError()));
        return child;
      }
    };
    await rejects('merchant_flow_job_cancelled', () => startShopifyDevelopmentRuntime({
      root,
      request: {
        request_id: OPERATION,
        target: {
          runtime_mode: 'shopify_development_theme',
          shop_domain: SHOP,
          theme_id: fixture.release_9_blocker.development_theme_id,
          expected_theme_role: 'development'
        }
      },
      themeDirectory: path.join(root, 'apps', 'theme'),
      exactDevelopmentTarget: true,
      env,
      shopifyCliRuntime: cli,
      storefrontPasswordBindingFactory: capturingFactory,
      abortSignal: controller.signal,
      startupTimeoutMs: 500,
      shutdownTimings: { interrupt_ms: 0, terminate_ms: 0, kill_ms: 5 }
    }), false);
    assert.deepEqual(child.signals, ['SIGINT']);
    fails('controlled_beta_storefront_password_binding_released', () => capturedBinding.childEnvironment(env, childScope()), false);
    assertSecretAbsentFromFiles(directory, secret);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('L/M/N — an unkillable child defers credential and state release until its actual exit', async () => {
  const directory = temporary('calinium-e5rn-deferred-exit-');
  const secret = fakeSecret('storefront-deferred-exit');
  const operationId = `${OPERATION}-deferred-exit`;
  try {
    const env = environmentFor(directory, { password: secret });
    const state = initializeShopifyCliRuntimeState({ root, env, scope: { kind: 'render', job_id: operationId, shop_domain: SHOP } });
    const requirements = requirementsFor(env);
    const binding = createShopifyStorefrontPasswordBindingFactory({ env, requirements })({ shopDomain: SHOP, operationId });
    const scope = childScope(operationId);
    assertSameSyntheticSecret(binding.childEnvironment(state.environment, scope)[STOREFRONT_PASSWORD_ENV], secret, 'The deferred-exit child did not receive the synthetic credential.');
    const child = controlledChild({ exitOn: 'never' });
    assert.equal(await stopChildProcess(child, { interrupt_ms: 0, terminate_ms: 0, kill_ms: 0 }), false);
    assert.deepEqual(child.signals, ['SIGINT', 'SIGTERM', 'SIGKILL']);
    const integrityIncidents = [];
    const deferred = deferStorefrontRuntimeResourceFinalization({
      child,
      runtimeState: state,
      storefrontPasswordBinding: binding,
      verifyLifecycle: () => binding.assertNoPersistence(state, { shopDomain: SHOP, operationId }),
      reportIntegrityFailure: (incident) => integrityIncidents.push(incident)
    });
    assert.equal(deferred.pending, true);
    assertSameSyntheticSecret(binding.childEnvironment(state.environment, scope)[STOREFRONT_PASSWORD_ENV], secret, 'Credential lifecycle ended before the child exited.');
    fs.writeFileSync(path.join(state.environment.XDG_STATE_HOME, 'late-integrity-proof'), secret);
    child.exitCode = 1;
    child.emit('exit', 1, null);
    assert.deepEqual(await deferred.completion, {
      status: 'failed',
      reason_code: 'controlled_beta_storefront_password_binding_persistence_detected'
    });
    assert.deepEqual(integrityIncidents, [{ code: 'controlled_beta_storefront_password_binding_persistence_detected', retryable: false }]);
    fails('controlled_beta_storefront_password_binding_released', () => binding.childEnvironment(state.environment, scope), false);
    assertSecretAbsentFromFiles(directory, secret);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('O — restart creates a new process-only binding without changing durable render identity', () => {
  const directory = temporary('calinium-e5rn-restart-');
  const secret = fakeSecret('storefront-restart');
  try {
    const env = environmentFor(directory, { password: secret });
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const requirements = requirementsFor(env);
      const binding = createShopifyStorefrontPasswordBindingFactory({ env, requirements })({ shopDomain: SHOP, operationId: OPERATION });
      const state = initializeShopifyCliRuntimeState({ root, env, scope: { kind: 'render', job_id: OPERATION, shop_domain: SHOP } });
      assertSameSyntheticSecret(
        binding.childEnvironment(state.environment, childScope())[STOREFRONT_PASSWORD_ENV],
        secret,
        'Restart did not reacquire the synthetic credential for the preserved render identity.'
      );
      binding.assertNoPersistence(state, { shopDomain: SHOP, operationId: OPERATION });
      binding.release();
      state.cleanup();
      assertSecretAbsentFromFiles(directory, secret);
    }
    assert.equal(fixture.preserved_identity.render_job_id, OPERATION);
    assert.equal(fixture.preserved_identity.render_job_state, 'retryable');
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('production pre-render source retains binding, persistence, patch, and no-argv gates', () => {
  const source = fs.readFileSync(path.join(root, 'ai/storefront-render/shopify-development-runtime.js'), 'utf8');
  for (const expected of [
    'storefrontPasswordBindingFactory',
    'preflightStorefrontPasswordBinding',
    'childEnvironment',
    'assertNoPersistence',
    'allowStorefrontPassword',
    'abortSignal',
    'deferFinalization',
    'controlled_beta_storefront_password_binding_shutdown_failed',
    'release()'
  ]) assert.ok(source.includes(expected), `Pre-render integration is missing ${expected}.`);
  assert.ok(source.includes("FORBIDDEN_THEME_DEV_FLAGS = new Set(['--allow-live', '--live', '--publish', '--theme-editor-sync', '--store-password'])"));
  assert.equal(/args\.(?:push|unshift|splice)\([^\n]*--store-password/.test(source), false);
  const dashboard = fs.readFileSync(path.join(root, 'apps/dashboard/server/dashboard-services.cjs'), 'utf8');
  for (const expected of ['createShopifyStorefrontPasswordBindingFactory', 'storefrontPasswordBindingFactory']) {
    assert.ok(dashboard.includes(expected), `Dashboard pre-render plumbing is missing ${expected}.`);
  }
  const capture = fs.readFileSync(path.join(root, 'ai/storefront-render/merchant-flow-capture.js'), 'utf8');
  for (const expected of ['createMerchantRenderCancellationMonitor', 'processSignalSource', 'abortSignal: cancellation.signal', 'preferFatalError']) {
    assert.ok(capture.includes(expected), `Merchant capture lifecycle is missing ${expected}.`);
  }
  const driver = fs.readFileSync(path.join(root, 'ai/storefront-render/playwright-capture-driver.js'), 'utf8');
  assert.ok(driver.includes("addEventListener?.('abort', closeForAbort"), 'Browser capture does not close its active context on cancellation.');
  const patchSource = fs.readFileSync(path.join(root, 'scripts/apply-shopify-cli-storefront-password-no-persist-patch.js'), 'utf8');
  assert.ok(patchSource.includes('verifyOnly'));
  assert.ok(patchSource.includes('package_lock_integrity'));
});

async function main() {
  let passed = 0;
  for (const item of tests) {
    try {
      await item.operation();
      passed += 1;
      process.stdout.write(`PASS ${item.name}\n`);
    } catch (error) {
      process.stderr.write(`FAIL ${item.name}\n${error.stack || error.message}\n`);
      process.exitCode = 1;
      break;
    }
  }
  process.stdout.write(`${passed}/${tests.length} E5R-N non-persistent storefront-password tests passed. Synthetic credentials only; API/model calls=0; Shopify calls=0; Shopify writes=0; theme mutations=0.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
