#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');
const {
  SHOPIFY_CLI_RUNTIME_STATE_REVISION,
  initializeShopifyCliRuntimeState
} = require('../ai/storefront-render/shopify-cli-runtime-state');
const {
  parseShopifyCliVersionOutput,
  readAutoUpgradeConfig
} = require('../ai/storefront-render/shopify-cli-build-attestation');

const root = path.resolve(__dirname, '..');
const command = path.join(root, 'node_modules', '.bin', 'shopify');
const environment = {
  ...process.env,
  CALINIUM_PERSISTENT_ROOT: path.join(root, 'output'),
  CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_ROOT: path.join(root, 'output', '.calinium-example-staging', 'shopify-cli-runtime-state'),
  CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_REVISION: SHOPIFY_CLI_RUNTIME_STATE_REVISION,
  SHOPIFY_CLI_THEME_TOKEN: 'e5rl-build-validation-placeholder'
};

function version(env) {
  const result = spawnSync(command, ['version'], { cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr.trim(), '');
  return parseShopifyCliVersionOutput(result.stdout);
}

function denied(file, operation) {
  assert.throws(operation, (error) => ['EACCES', 'EPERM', 'EROFS'].includes(error?.code), `Expected runtime write denial for ${path.basename(file)}.`);
}

async function main() {
  assert.equal(process.getuid?.(), 1000, 'Built-image validation must run as the node runtime user.');
  assert.equal(version(environment), '4.6.0');

  const state = initializeShopifyCliRuntimeState({
    root,
    env: environment,
    scope: { kind: 'render', job_id: 'built-image-permission-proof', shop_domain: 'build-only.myshopify.com' }
  });
  assert.equal(state.attest().runtime_state_writable, true);

  for (const key of ['XDG_CONFIG_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME', 'XDG_DATA_HOME', 'TMPDIR', 'SHOPIFY_CLI_NO_ANALYTICS', 'OPT_OUT_INSTRUMENTATION']) {
    process.env[key] = state.environment[key];
  }
  const confModule = await import(pathToFileURL(path.join(root, 'node_modules/@shopify/cli/dist/chunk-V65P572N.js')).href);
  const themeConf = new confModule.b({ projectName: 'shopify-cli-theme-conf' });
  assert.equal(themeConf.get('themeStore'), undefined);
  assert.ok(fs.existsSync(path.join(state.environment.XDG_CONFIG_HOME, 'shopify-cli-theme-conf-nodejs')));
  assert.equal(state.attest().credential_persistence, false);
  assert.equal(version(state.environment), '4.6.0');

  const packageFile = path.join(root, 'node_modules', '@shopify', 'cli', 'package.json');
  const executable = fs.realpathSync(command);
  const sourceFile = path.join(root, 'ai', 'storefront-render', 'shopify-cli-runtime.js');
  const lockfile = path.join(root, 'package-lock.json');
  const buildPolicy = readAutoUpgradeConfig(environment.HOME).file;
  for (const file of [packageFile, executable, sourceFile, lockfile, buildPolicy]) {
    assert.ok(fs.existsSync(file), `Expected protected built-image entry ${path.basename(file)}.`);
    denied(file, () => fs.appendFileSync(file, ''));
  }
  const sourceProbe = path.join(root, '.e5rl-source-write-probe');
  denied(sourceProbe, () => fs.writeFileSync(sourceProbe, 'forbidden'));

  assert.equal(state.cleanup(), true);
  assert.equal(version(environment), '4.6.0');
  process.stdout.write('E5R-L built-image runtime-user permissions passed: bounded state writable; package, executable, source, lockfile, and build policy denied; CLI 4.6.0 stable; credentials absent.\n');
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || error}\n`);
  process.exit(1);
});
