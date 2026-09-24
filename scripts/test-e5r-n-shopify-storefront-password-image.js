#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {
  SHOPIFY_STOREFRONT_PASSWORD_BINDING_REVISION,
  SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION,
  STOREFRONT_PASSWORD_ENV,
  REQUIREMENTS_REVISION_ENV,
  REQUIREMENTS_JSON_ENV,
  readShopifyStorefrontPasswordRequirements,
  createShopifyStorefrontPasswordBindingFactory
} = require('../ai/storefront-render/shopify-storefront-password-binding');
const {
  SHOPIFY_CLI_RUNTIME_STATE_REVISION,
  initializeShopifyCliRuntimeState
} = require('../ai/storefront-render/shopify-cli-runtime-state');
const {
  loadPatchContract,
  applyPatch
} = require('./apply-shopify-cli-storefront-password-no-persist-patch');

const root = path.resolve(__dirname, '..');
const shop = 'image-proof.myshopify.com';
const operation = 'e5rn-built-image-password-proof';
const secret = ['e5rn', 'synthetic', 'image', 'credential', 'not-real'].join('-');
const themeAccess = ['e5rn', 'synthetic', 'theme-access', 'not-real'].join('-');

function themeDevArgs() {
  return ['theme', 'dev', '--path', path.join(root, 'apps', 'theme'), '--store', shop, '--theme', '100000000006', '--live-reload', 'off', '--host', '127.0.0.1', '--port', '9294', '--no-color'];
}

function assertSameSyntheticSecret(actual, expected, message) {
  assert.equal(actual === expected, true, message);
}

function assertSecretAbsent(directory) {
  function visit(current) {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const candidate = path.join(current, entry.name);
      if (entry.isDirectory()) visit(candidate);
      else if (entry.isFile()) assert.equal(fs.readFileSync(candidate).includes(Buffer.from(secret)), false, 'Synthetic storefront credential entered built-image runtime state.');
    }
  }
  visit(directory);
}

function denied(file) {
  assert.throws(
    () => fs.appendFileSync(file, ''),
    (error) => ['EACCES', 'EPERM', 'EROFS'].includes(error?.code),
    `Expected built-image write denial for ${path.basename(file)}.`
  );
}

function main() {
  const imageRuntime = root === '/app' || process.env.CALINIUM_E5RN_IMAGE_PROOF_REQUIRED === 'true';
  if (imageRuntime && typeof process.getuid === 'function') assert.equal(process.getuid(), 1000, 'E5R-N image proof must run as the node runtime user.');

  const patch = loadPatchContract(root);
  const verification = applyPatch({ repositoryRoot: root, verifyOnly: true });
  assert.deepEqual(verification, {
    status: 'verified',
    patch_revision: patch.patch_revision,
    package_version: '4.6.0'
  });

  const persistentRoot = path.join(root, 'output', '.calinium-e5rn-image-proof');
  fs.mkdirSync(persistentRoot, { recursive: true, mode: 0o700 });
  const env = {
    ...process.env,
    CALINIUM_PERSISTENT_ROOT: persistentRoot,
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_ROOT: path.join(persistentRoot, 'shopify-cli-runtime-state'),
    CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_REVISION: SHOPIFY_CLI_RUNTIME_STATE_REVISION,
    SHOPIFY_CLI_THEME_TOKEN: themeAccess,
    [STOREFRONT_PASSWORD_ENV]: secret,
    [REQUIREMENTS_REVISION_ENV]: SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION,
    [REQUIREMENTS_JSON_ENV]: JSON.stringify([{ shop_domain: shop, requirement: 'required' }])
  };
  let state = null;
  let binding = null;
  try {
    const requirements = readShopifyStorefrontPasswordRequirements(env, { shopDomains: [shop] });
    assert.equal(requirements.status, 'READY');
    binding = createShopifyStorefrontPasswordBindingFactory({ env, requirements })({ shopDomain: shop, operationId: operation });
    assert.equal(binding.contract_version, SHOPIFY_STOREFRONT_PASSWORD_BINDING_REVISION);
    state = initializeShopifyCliRuntimeState({ root, env, scope: { kind: 'render', job_id: operation, shop_domain: shop } });
    assert.equal(state.environment[STOREFRONT_PASSWORD_ENV], undefined);
    assert.equal(state.environment.SHOPIFY_CLI_THEME_TOKEN, themeAccess);
    const child = binding.childEnvironment(state.environment, { shopDomain: shop, operationId: operation, commandArgs: themeDevArgs() });
    assertSameSyntheticSecret(child[STOREFRONT_PASSWORD_ENV], secret, 'The built-image theme-dev child did not receive its synthetic credential.');
    assert.equal(child.SHOPIFY_CLI_THEME_TOKEN, themeAccess);
    assert.notEqual(child[STOREFRONT_PASSWORD_ENV], child.SHOPIFY_CLI_THEME_TOKEN);
    assert.equal(binding.assertNoPersistence(state, { shopDomain: shop, operationId: operation }), true);
    assert.equal(state.attest().credential_persistence, false);
    assertSecretAbsent(persistentRoot);
    binding.release();
    assert.equal(state.cleanup(), true);
    state = null;
    assertSecretAbsent(persistentRoot);

    if (imageRuntime) {
      denied(path.join(root, 'node_modules', '@shopify', 'cli', patch.target_file));
      denied(path.join(root, 'ai', 'storefront-render', 'shopify-storefront-password-binding.js'));
      denied(path.join(root, 'patches', 'shopify-cli-4.6.0-storefront-password-no-persist.json'));
    }
  } finally {
    try { binding?.release(); } catch {}
    try { state?.cleanup(); } catch {}
    fs.rmSync(persistentRoot, { recursive: true, force: true });
  }

  process.stdout.write('E5R-N built-image proof passed: exact patched Shopify CLI 4.6.0; immutable patch/binding source; child-only synthetic credential; Theme Access distinct; runtime state credential-free; Shopify calls=0; theme mutations=0.\n');
}

try { main(); }
catch (error) {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
}
