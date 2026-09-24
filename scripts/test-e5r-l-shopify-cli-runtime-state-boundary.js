#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawnSync } = require('child_process');
const {
  SHOPIFY_CLI_RUNTIME_STATE_REVISION,
  initializeShopifyCliRuntimeState
} = require('../ai/storefront-render/shopify-cli-runtime-state');
const { createShopifyCliRuntime } = require('../ai/storefront-render/shopify-cli-runtime');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/e5r-l-shopify-cli-runtime-state-boundary.json'), 'utf8'));
const confChunk = pathToFileURL(path.join(root, 'node_modules/@shopify/cli/dist/chunk-V65P572N.js')).href;

function temporary(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }
function result(status, stdout, stderr = '') { return { status, stdout, stderr, signal: null, error: null }; }
function fails(code, operation) {
  assert.throws(operation, (error) => error?.code === code, `Expected bounded runtime-state failure ${code}.`);
}
function environmentFor(persistentRoot, extra = {}) {
  return {
    ...process.env,
    CALINIUM_PERSISTENT_ROOT: persistentRoot,
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_ROOT: path.join(persistentRoot, 'shopify-cli-runtime-state'),
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_REVISION: SHOPIFY_CLI_RUNTIME_STATE_REVISION,
    CALINIUM_SHOPIFY_CLI_RUNTIME_REVISION: 'shopify-cli-runtime-v1',
    CALINIUM_SHOPIFY_CLI_EXPECTED_VERSION: '4.6.0',
    CALINIUM_SHOPIFY_CLI_AUTOUPGRADE_POLICY: 'disabled',
    CALINIUM_BUILD_SOURCE_REVISION: '9'.repeat(40),
    ...extra
  };
}
function runThemeConf(environment) {
  const script = `
    Object.defineProperty(process, 'platform', { value: 'linux' });
    const module = await import(${JSON.stringify(confChunk)});
    try {
      const store = new module.b({ projectName: 'shopify-cli-theme-conf' });
      store.get('themeStore');
      process.stdout.write(JSON.stringify({ status: 'initialized' }));
    } catch (error) {
      process.stderr.write(JSON.stringify({ code: error?.cause?.code || error?.code || null, message: String(error?.message || '') }));
      process.exit(23);
    }
  `;
  return spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: root,
    env: environment,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 15000
  });
}

assert.equal(SHOPIFY_CLI_RUNTIME_STATE_REVISION, fixture.runtime_state_revision);
assert.equal(fixture.approved_cli_version, '4.6.0');

// Exact release-6 regression: the real Shopify CLI 4.6.0 Conf dependency tries
// to create shopify-cli-theme-conf-nodejs under the default immutable config.
const legacyRoot = temporary('calinium-e5rl-legacy-');
try {
  const legacyHome = path.join(legacyRoot, 'home', 'node');
  const legacyConfig = path.join(legacyHome, '.config');
  fs.mkdirSync(legacyConfig, { recursive: true });
  fs.chmodSync(legacyConfig, 0o500);
  const legacyEnv = { ...process.env, HOME: legacyHome };
  delete legacyEnv.XDG_CONFIG_HOME;
  delete legacyEnv.XDG_CACHE_HOME;
  delete legacyEnv.XDG_STATE_HOME;
  delete legacyEnv.XDG_DATA_HOME;
  const legacy = runThemeConf(legacyEnv);
  assert.equal(legacy.status, 23);
  assert.match(legacy.stderr, /EACCES|permission/i);
  assert.match(legacy.stderr, /shopify-cli-theme-conf-nodejs/);
} finally {
  fs.chmodSync(path.join(legacyRoot, 'home', 'node', '.config'), 0o700);
  fs.rmSync(legacyRoot, { recursive: true, force: true });
}

// CASE A/B/E: missing state is created under explicit XDG locations and the
// actual Shopify CLI Conf dependency initializes without reaching Shopify.
const successRoot = temporary('calinium-e5rl-success-');
try {
  const immutableHome = path.join(successRoot, 'immutable-home');
  const immutableDefaultConfig = path.join(immutableHome, '.config');
  fs.mkdirSync(immutableDefaultConfig, { recursive: true });
  fs.chmodSync(immutableDefaultConfig, 0o500);
  const env = environmentFor(successRoot, { HOME: immutableHome, SHOPIFY_CLI_THEME_TOKEN: 'test-theme-access-secret-not-real' });
  const state = initializeShopifyCliRuntimeState({
    root,
    env,
    scope: { kind: 'inventory', job_id: 'job-case-a', shop_domain: 'case-a.myshopify.com' }
  });
  assert.equal(state.attest().auto_upgrade_state, 'off');
  assert.equal(state.environment.HOME, env.HOME);
  for (const key of ['XDG_CONFIG_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME', 'XDG_DATA_HOME', 'TMPDIR']) {
    assert.ok(state.environment[key].startsWith(env.CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_ROOT));
  }
  const initialized = runThemeConf(state.environment);
  assert.equal(initialized.status, 0, initialized.stderr);
  assert.ok(fs.existsSync(path.join(state.environment.XDG_CONFIG_HOME, 'shopify-cli-theme-conf-nodejs')));
  assert.equal(fs.existsSync(path.join(immutableDefaultConfig, 'shopify-cli-theme-conf-nodejs')), false);
  assert.equal(state.attest().credential_persistence, false);
  assert.equal(state.cleanup(), true);
  fs.chmodSync(immutableDefaultConfig, 0o700);
} finally {
  const immutableDefaultConfig = path.join(successRoot, 'immutable-home', '.config');
  if (fs.existsSync(immutableDefaultConfig)) fs.chmodSync(immutableDefaultConfig, 0o700);
  fs.rmSync(successRoot, { recursive: true, force: true });
}

// CASE C: an unavailable bounded parent fails before a Shopify operation.
const unavailableRoot = temporary('calinium-e5rl-unavailable-');
try {
  const persistent = path.join(unavailableRoot, 'persistent');
  fs.mkdirSync(persistent, { mode: 0o500 });
  fs.chmodSync(persistent, 0o500);
  fails('shopify_cli_runtime_state_unwritable', () => initializeShopifyCliRuntimeState({
    root,
    env: environmentFor(persistent),
    scope: { kind: 'inventory', job_id: 'job-case-c', shop_domain: 'case-c.myshopify.com' }
  }));
  fs.chmodSync(persistent, 0o700);
} finally { fs.rmSync(unavailableRoot, { recursive: true, force: true }); }

// A lexical child that traverses a pre-existing symbolic link fails closed.
const symlinkRoot = temporary('calinium-e5rl-symlink-');
try {
  const persistent = path.join(symlinkRoot, 'persistent');
  const escaped = path.join(symlinkRoot, 'escaped');
  fs.mkdirSync(persistent);
  fs.mkdirSync(escaped);
  fs.symlinkSync(escaped, path.join(persistent, 'shopify-cli-runtime-state'));
  fails('shopify_cli_runtime_state_path_unsafe', () => initializeShopifyCliRuntimeState({
    root,
    env: environmentFor(persistent),
    scope: { kind: 'inventory', job_id: 'job-symlink', shop_domain: 'symlink.myshopify.com' }
  }));
} finally { fs.rmSync(symlinkRoot, { recursive: true, force: true }); }

// CASE D: runtime readiness fails if the package boundary is writable.
const mutablePackageRoot = temporary('calinium-e5rl-mutable-package-');
try {
  const env = environmentFor(mutablePackageRoot);
  const runtime = createShopifyCliRuntime({
    root,
    env,
    command: '/controlled/shopify',
    runner: () => result(0, '4.6.0\n'),
    buildAttestor: () => ({ runtime_filesystem: 'build_writable' })
  });
  fails('shopify_cli_runtime_immutability_failed', () => runtime.attestRuntimeStateReadiness());
} finally { fs.rmSync(mutablePackageRoot, { recursive: true, force: true }); }

// CASE F/H: auto-upgrade ON and credential persistence both fail closed.
const policyRoot = temporary('calinium-e5rl-policy-');
try {
  const token = 'test-theme-access-secret-for-scan';
  const env = environmentFor(policyRoot, { SHOPIFY_CLI_THEME_TOKEN: token });
  const state = initializeShopifyCliRuntimeState({
    root,
    env,
    scope: { kind: 'render', job_id: 'job-case-f', shop_domain: 'case-f.myshopify.com' }
  });
  const policyFile = path.join(state.environment.XDG_CONFIG_HOME, 'shopify-cli-nodejs', 'config.json');
  fs.writeFileSync(policyFile, `${JSON.stringify({ autoUpgradeEnabled: true })}\n`);
  fails('shopify_cli_runtime_state_autoupgrade_enabled', () => state.attest());
  fs.writeFileSync(policyFile, `${JSON.stringify({ autoUpgradeEnabled: false })}\n`);
  fs.writeFileSync(path.join(state.environment.XDG_STATE_HOME, 'unsafe.json'), JSON.stringify({ value: token }));
  fails('shopify_cli_runtime_state_credential_persistence_detected', () => state.attest());
  state.cleanup();
} finally { fs.rmSync(policyRoot, { recursive: true, force: true }); }

// CASE G: CLI remains exactly 4.6.0 before and after bounded inventory state.
const stableRoot = temporary('calinium-e5rl-stable-');
try {
  const env = environmentFor(stableRoot);
  const themes = JSON.stringify([{ id: 1, name: 'MAIN', role: 'main' }, { id: 2, name: 'Development', role: 'development' }]);
  let versions = 0;
  const commandEnvironments = [];
  const runtime = createShopifyCliRuntime({
    root,
    env,
    command: '/controlled/shopify',
    runner(_command, args, options) {
      commandEnvironments.push(options.env);
      if (args[0] === 'version') { versions += 1; return result(0, '4.6.0\n'); }
      return result(0, themes);
    }
  });
  runtime.attestReadiness();
  assert.equal(runtime.listThemes('stable.myshopify.com').data.length, 2);
  assert.ok(versions >= 3);
  const inventoryEnvironment = commandEnvironments.find((entry) => entry.XDG_CONFIG_HOME);
  assert.ok(inventoryEnvironment.XDG_CONFIG_HOME.startsWith(env.CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_ROOT));
  assert.equal(inventoryEnvironment.HOME, env.HOME);
} finally { fs.rmSync(stableRoot, { recursive: true, force: true }); }

// CASE I/J: scopes do not cross shops/jobs and a restart reconstructs the same
// deterministic scope without relying on retained mutable state.
const isolationRoot = temporary('calinium-e5rl-isolation-');
try {
  const env = environmentFor(isolationRoot);
  const first = initializeShopifyCliRuntimeState({ root, env, scope: { kind: 'render', job_id: 'job-one', shop_domain: 'one.myshopify.com' } });
  const second = initializeShopifyCliRuntimeState({ root, env, scope: { kind: 'render', job_id: 'job-two', shop_domain: 'two.myshopify.com' } });
  assert.notEqual(first.scope_id, second.scope_id);
  assert.notEqual(first.environment.XDG_CONFIG_HOME, second.environment.XDG_CONFIG_HOME);
  const restartScopeId = first.scope_id;
  assert.equal(first.cleanup(), true);
  const restarted = initializeShopifyCliRuntimeState({ root, env, scope: { kind: 'render', job_id: 'job-one', shop_domain: 'one.myshopify.com' } });
  assert.equal(restarted.scope_id, restartScopeId);
  assert.equal(restarted.attest().auto_upgrade_state, 'off');
  restarted.cleanup();
  second.cleanup();
} finally { fs.rmSync(isolationRoot, { recursive: true, force: true }); }

assert.deepStrictEqual(fixture.preserved_identity, {
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

process.stdout.write('E5R-L Shopify CLI runtime-state tests passed: exact EACCES regression plus cases A-J, actual Conf initialization, XDG isolation, policy, credential, restart, and preserved render identity.\n');
