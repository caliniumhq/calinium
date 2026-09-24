#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const errors = [];
const required = [
  'ai/storefront-render/shopify-storefront-password-binding.js',
  'ai/storefront-render/shopify-cli-runtime-state.js',
  'ai/storefront-render/shopify-cli-runtime.js',
  'ai/storefront-render/shopify-development-runtime.js',
  'patches/shopify-cli-4.6.0-storefront-password-no-persist.json',
  'scripts/apply-shopify-cli-storefront-password-no-persist-patch.js',
  'fixtures/e5r-n-non-persistent-storefront-password-binding.json',
  'scripts/test-e5r-n-non-persistent-storefront-password-binding.js',
  'scripts/test-e5r-n-shopify-storefront-password-image.js',
  'scripts/validate-e5r-n-non-persistent-storefront-password-binding.js',
  'docs/architecture/calinium-core-2-phase-e5r-n-non-persistent-storefront-password-binding.md'
];

function fail(message) { errors.push(message); }
function source(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function json(file) { return JSON.parse(source(file)); }

for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
for (const file of [
  'patches/shopify-cli-4.6.0-storefront-password-no-persist.json',
  'fixtures/e5r-n-non-persistent-storefront-password-binding.json',
  'package.json',
  'package-lock.json'
]) {
  try { json(file); }
  catch (error) { fail(`${file} is not valid JSON: ${error.message}`); }
}

try {
  execFileSync(process.execPath, ['scripts/test-e5r-n-non-persistent-storefront-password-binding.js'], {
    cwd: root,
    env: {
      ...process.env,
      OPENAI_API_KEY: '',
      SHOPIFY_CLI_THEME_TOKEN: '',
      SHOPIFY_FLAG_STORE_PASSWORD: '',
      CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_REVISION: '',
      CALINIUM_SHOPIFY_STOREFRONT_PASSWORD_REQUIREMENTS_JSON: ''
    },
    stdio: 'pipe',
    timeout: 45000
  });
} catch (error) {
  fail(`E5R-N behavioral tests failed: ${String(error.stderr || error.stdout || error.message).trim()}`);
}

for (const file of required.filter((entry) => entry.endsWith('.js') && fs.existsSync(path.join(root, entry)))) {
  try { execFileSync(process.execPath, ['--check', path.join(root, file)], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] }); }
  catch (error) { fail(`${file} has invalid JavaScript syntax: ${String(error.stderr || error.message).trim()}`); }
}

let fixture = null;
let patch = null;
try {
  fixture = json('fixtures/e5r-n-non-persistent-storefront-password-binding.json');
  assert.equal(fixture.schema_version, '1.0');
  assert.equal(fixture.phase, 'E5R-N');
  assert.equal(fixture.binding_revision, 'shopify-storefront-password-binding-v1');
  assert.equal(fixture.requirements_revision, 'shopify-storefront-password-requirements-v1');
  assert.equal(fixture.active_source_revision, '1000000000000000000000000000000000000001');
  assert.equal(fixture.active_release, 9);
  assert.equal(fixture.patch.upstream_bytes, 569);
  assert.equal(fixture.patch.substitution_offset, 485);
  assert.equal(fixture.patch.patched_bytes, 564);
  assert.deepEqual(Object.keys(fixture.cases), 'ABCDEFGHIJKLMNOP'.split(''));
  assert.equal(fixture.preserved_identity.render_job_id, 'merchant-flow-job-00000000000000000001');
  assert.equal(fixture.preserved_identity.render_job_state, 'retryable');
  for (const key of ['deployment_allowed', 'real_password_allowed', 'automatic_repair_allowed', 'public_app_changes_allowed', 'merchant_invitation_allowed']) {
    assert.equal(fixture.safety[key], false);
  }
  for (const key of ['shopify_calls', 'shopify_writes', 'theme_mutations', 'openai_calls']) assert.equal(fixture.safety[key], 0);
} catch (error) { fail(`E5R-N fixture contract failed: ${error.message}`); }

try {
  patch = json('patches/shopify-cli-4.6.0-storefront-password-no-persist.json');
  assert.deepEqual({
    revision: patch.patch_revision,
    package: patch.package_name,
    version: patch.package_version,
    target: patch.target_file,
    upstream: patch.upstream_sha256,
    patched: patch.patched_sha256,
    before: patch.exact_substitution.before,
    after: patch.exact_substitution.after,
    occurrences: patch.exact_substitution.occurrences
  }, {
    revision: 'shopify-cli-storefront-password-no-persist-v1',
    package: '@shopify/cli',
    version: '4.6.0',
    target: 'dist/chunk-6Q5VRSRN.js',
    upstream: 'c95281778d2c0e0838ca76973f4b37652e71386239faeb6fdd824d4134bf6aed',
    patched: 'c3474371fa0dc3d23589f4048847e454eb2ca738a9dbd08170eff0e2305e0f67',
    before: 'return w(e),e}',
    after: 'return e}',
    occurrences: 1
  });
  const lock = json('package-lock.json').packages?.['node_modules/@shopify/cli'];
  assert.equal(lock?.version, '4.6.0');
  assert.equal(lock?.integrity, patch.package_lock_integrity);
} catch (error) { fail(`E5R-N patch contract failed: ${error.message}`); }

if (required.slice(0, 4).every((file) => fs.existsSync(path.join(root, file)))) {
  const binding = source('ai/storefront-render/shopify-storefront-password-binding.js');
  const state = source('ai/storefront-render/shopify-cli-runtime-state.js');
  const runtime = source('ai/storefront-render/shopify-cli-runtime.js');
  const development = source('ai/storefront-render/shopify-development-runtime.js');

  for (const value of [
    'shopify-storefront-password-binding-v1',
    'shopify-storefront-password-requirements-v1',
    'SHOPIFY_FLAG_STORE_PASSWORD',
    'required', 'not_required', 'READY', 'NOT_READY', 'NOT_REQUIRED',
    'shopify_storefront_password_required',
    'controlled_beta_storefront_password_binding_scope_mismatch',
    'childEnvironment', 'assertNoPersistence', 'release'
  ]) if (!binding.includes(value)) fail(`binding contract omits ${value}`);
  for (const value of ['withoutShopifyStorefrontPassword', 'assertCredentialAbsent', 'shopify-cli-runtime-state-v1']) {
    if (!state.includes(value)) fail(`runtime-state integration omits ${value}`);
  }
  for (const value of ['withoutShopifyStorefrontPassword', 'allowStorefrontPassword', 'shopify-cli-runtime-v1', '4.6.0']) {
    if (!runtime.includes(value)) fail(`Shopify CLI runtime integration omits ${value}`);
  }
  for (const value of [
    'storefrontPasswordBindingFactory',
    'preflightStorefrontPasswordBinding',
    'childEnvironment', 'assertNoPersistence', 'allowStorefrontPassword', 'abortSignal',
    'ensureChildStop', 'deferFinalization', 'recordDeferredStorefrontRuntimeIntegrityIncident',
    'controlled_beta_storefront_password_binding_shutdown_failed', 'release()'
  ]) if (!development.includes(value)) fail(`pre-render storefront-password integration omits ${value}`);
  if (!development.includes("FORBIDDEN_THEME_DEV_FLAGS = new Set(['--allow-live', '--live', '--publish', '--theme-editor-sync', '--store-password'])")) {
    fail('production theme-dev runtime does not fail closed on --store-password argv transport');
  }
  if (/args\.(?:push|unshift|splice)\([^\n]*--store-password/.test(development)) fail('production theme-dev runtime assembles the storefront password into argv');
  if (/console\.(?:log|info|warn|error)\s*\(/.test(binding)) fail('binding module contains a logging channel');
}

if (fs.existsSync(path.join(root, 'ai/storefront-render/merchant-flow-capture.js'))) {
  const capture = source('ai/storefront-render/merchant-flow-capture.js');
  for (const value of ['createMerchantRenderCancellationMonitor', 'processSignalSource', 'abortSignal: cancellation.signal', 'preferFatalError']) {
    if (!capture.includes(value)) fail(`merchant render lifecycle integration omits ${value}`);
  }
}

if (fs.existsSync(path.join(root, 'scripts/apply-shopify-cli-storefront-password-no-persist-patch.js'))) {
  const apply = source('scripts/apply-shopify-cli-storefront-password-no-persist-patch.js');
  for (const value of ['verifyOnly', 'package_lock_integrity', 'upstream_sha256', 'patched_sha256', 'exact_substitution', 'shopify_storefront_password_patch_source_mismatch']) {
    if (!apply.includes(value)) fail(`reproducible patch application omits ${value}`);
  }
  if (apply.includes('npm install') || apply.includes('npm update')) fail('patch application can mutate dependency resolution');
}

if (fs.existsSync(path.join(root, 'Dockerfile.staging'))) {
  const docker = source('Dockerfile.staging');
  const installAt = docker.indexOf('npm ci --include=dev');
  const applyAt = docker.indexOf('apply-shopify-cli-storefront-password-no-persist-patch.js');
  const hardenAt = docker.indexOf('attest-shopify-cli-build.js --harden');
  if (installAt < 0 || applyAt <= installAt || hardenAt <= applyAt) fail('staging image does not apply the exact patch after npm ci and before hardening');
  if (!docker.includes('apply-shopify-cli-storefront-password-no-persist-patch.js --verify')) fail('staging image omits post-application patch verification');
  if (!docker.includes('test-e5r-n-shopify-storefront-password-image.js')) fail('staging image omits E5R-N runtime-user proof');
}

try {
  const scripts = json('package.json').scripts || {};
  assert.equal(scripts.postinstall, 'node scripts/apply-shopify-cli-storefront-password-no-persist-patch.js');
  assert.equal(scripts['test:e5r-n'], 'node scripts/test-e5r-n-non-persistent-storefront-password-binding.js');
  assert.equal(scripts['validate:e5r-n'], 'node scripts/validate-e5r-n-non-persistent-storefront-password-binding.js');
} catch (error) { fail(`E5R-N package commands are invalid: ${error.message}`); }

for (const file of [
  'apps/dashboard/server/services/merchant-flow-controlled-runtime-configuration.cjs',
  'apps/dashboard/server/services/merchant-flow-controlled-readiness.cjs',
  'apps/dashboard/server/services/merchant-flow-controlled-readiness-snapshot.cjs',
  'apps/dashboard/server/workers/controlled-readiness-deep-attestation-worker.cjs',
  'schemas/calinium-controlled-beta-readiness-snapshot.schema.json'
]) {
  if (!fs.existsSync(path.join(root, file))) { fail(`missing readiness integration ${file}`); continue; }
  const content = source(file);
  if (!content.includes('shopify_storefront_password')
    && !content.includes('shopify-storefront-password')
    && !content.includes('withoutShopifyStorefrontPassword')
    && !content.includes('SHOPIFY_FLAG_STORE_PASSWORD')) {
    fail(`readiness integration omits sanitized storefront-password state in ${file}`);
  }
  if (content.includes('storefront_password_value') || content.includes('storefront_password_hash') || content.includes('storefront_password_length')) {
    fail(`readiness integration exposes forbidden storefront-password metadata in ${file}`);
  }
}

const genericProcessBoundaries = [
  'ai/deployment/utils.js',
  'ai/review-engine/load-generated-workspace.js',
  'ai/storefront-render/architecture-comparison.js',
  'ai/storefront-render/contracts.js',
  'ai/storefront-render/materialize-controlled-artifact.js',
  'ai/storefront-render/playwright-capture-driver.js',
  'ai/storefront-render/shopify-cli-build-attestation.js',
  'ai/theme-generator/generate-read-only-theme-package.js',
  'ai/theme-generator/utils.js',
  'ai/theme-generator/validate-read-only-theme-package.js',
  'apps/dashboard/server/controlled-staging-runtime.cjs',
  'apps/dashboard/server/legacyexample-staging-runtime.cjs',
  'apps/dashboard/server/custom-themes/custom-theme-service.cjs',
  'apps/dashboard/server/custom-themes/generation-worker-runner.cjs',
  'scripts/export-shopify-theme.js',
  'scripts/generate-preset-demos.js',
  'scripts/lib/preservation-backup.js'
];
for (const file of genericProcessBoundaries) {
  if (!fs.existsSync(path.join(root, file))) { fail(`missing generic process boundary ${file}`); continue; }
  if (!source(file).includes('withoutShopifyStorefrontPassword')) {
    fail(`generic process boundary does not explicitly scrub the storefront credential: ${file}`);
  }
}

for (const file of [
  'schemas/calinium-storefront-render-request.schema.json',
  'schemas/calinium-storefront-render-result.schema.json',
  'schemas/calinium-merchant-flow-storefront-render-request.schema.json',
  'schemas/calinium-merchant-flow-storefront-render-result.schema.json',
  'ai/storefront-render/merchant-flow-contracts.js'
]) {
  if (fs.existsSync(path.join(root, file)) && source(file).includes('SHOPIFY_FLAG_STORE_PASSWORD')) {
    fail(`${file} persists the process-only storefront credential`);
  }
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
    /^shopify\.app(?:\.|$)/,
    /^fly\.(?!staging\.toml$)/
  ];
  const narrowlyAuthorizedSecurityScrubs = new Set([
    'ai/theme-generator/generate-read-only-theme-package.js',
    'ai/theme-generator/utils.js',
    'ai/theme-generator/validate-read-only-theme-package.js',
    'apps/dashboard/server/custom-themes/custom-theme-service.cjs',
    'apps/dashboard/server/custom-themes/generation-worker-runner.cjs'
  ]);
  const protectedPatterns = [
    ...forbidden,
    /^ai\/theme-generator\//,
    /^apps\/dashboard\/server\/custom-themes\//
  ];
  const violations = changed.filter((file) => protectedPatterns.some((pattern) => pattern.test(file))
    && !narrowlyAuthorizedSecurityScrubs.has(file));
  if (violations.length) fail(`forbidden E5R-N scope changed: ${violations.join(', ')}`);
} catch (error) { fail(`could not inspect E5R-N protected source scope: ${error.message}`); }

const documentationPath = 'docs/architecture/calinium-core-2-phase-e5r-n-non-persistent-storefront-password-binding.md';
if (fs.existsSync(path.join(root, documentationPath))) {
  const documentation = source(documentationPath).toLowerCase();
  for (const phrase of [
    'release-9 symptom',
    'shopify cli 4.6.0',
    'shopify-cli-theme-store-password',
    'no supported no-store mode',
    'shopify-storefront-password-binding-v1',
    'child environment',
    'argv',
    'password-store write is prevented',
    'job/shop isolation',
    'failure and shutdown',
    'ready / not_ready / not_required',
    'deployment remains pending',
    'openai/model calls: 0',
    'shopify calls: 0'
  ]) if (!documentation.includes(phrase)) fail(`E5R-N documentation omits ${phrase}`);
}

const credentialPattern = /(?:sk-[A-Za-z0-9_-]{20,}|shpat_[A-Za-z0-9]{16,}|shpua_[A-Za-z0-9]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|client_secret\s*[=:]\s*['"][^<'"\s]{12,})/i;
for (const file of required.filter((entry) => fs.existsSync(path.join(root, entry)))) {
  if (credentialPattern.test(source(file))) fail(`${file} contains a credential-like literal`);
}

if (errors.length) {
  process.stderr.write(`E5R-N validation failed:\n- ${errors.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`E5R-N validation passed: ${required.length} required artifacts; exact Shopify CLI 4.6.0 upstream/patched checksums; child-only binding; no argv/log/state/readiness/durable channel; cases A-P; preserved render identity; API/model calls=0; Shopify calls/writes=0; theme mutations=0.\n`);
}
