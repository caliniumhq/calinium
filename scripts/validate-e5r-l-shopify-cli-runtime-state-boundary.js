#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { SHOPIFY_CLI_RUNTIME_STATE_REVISION } = require('../ai/storefront-render/shopify-cli-runtime-state');

const root = path.resolve(__dirname, '..');
const errors = [];
const required = [
  'ai/storefront-render/shopify-cli-runtime-state.js',
  'ai/storefront-render/shopify-cli-runtime.js',
  'ai/storefront-render/shopify-development-runtime.js',
  'fixtures/e5r-l-shopify-cli-runtime-state-boundary.json',
  'scripts/test-e5r-l-shopify-cli-runtime-state-boundary.js',
  'scripts/test-e5r-l-shopify-cli-runtime-state-image.js',
  'scripts/validate-e5r-l-shopify-cli-runtime-state-boundary.js',
  'docs/architecture/calinium-core-2-phase-e5r-l-shopify-cli-runtime-state-boundary.md'
];

function fail(message) { errors.push(message); }
function source(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function json(file) { return JSON.parse(source(file)); }

for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
for (const file of ['fixtures/e5r-l-shopify-cli-runtime-state-boundary.json', 'package.json', 'package-lock.json']) {
  try { json(file); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); }
}

try {
  execFileSync(process.execPath, ['scripts/test-e5r-l-shopify-cli-runtime-state-boundary.js'], { cwd: root, stdio: 'pipe' });
} catch (error) { fail(`E5R-L behavioral tests failed: ${String(error.stderr || error.message).trim()}`); }

const state = source('ai/storefront-render/shopify-cli-runtime-state.js');
for (const value of [
  SHOPIFY_CLI_RUNTIME_STATE_REVISION,
  'XDG_CONFIG_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME', 'XDG_DATA_HOME', 'TMPDIR',
  'autoUpgradeEnabled', 'shopify_cli_runtime_state_unwritable',
  'ensureBoundedStateRoot', 'realpathSync',
  'shopify_cli_runtime_state_autoupgrade_enabled',
  'shopify_cli_runtime_state_credential_persistence_detected',
  'job_shop_scoped', 'reconstructable_ephemeral'
]) if (!state.includes(value)) fail(`runtime-state contract omits ${value}`);
if (/^\s*HOME\s*:/m.test(state)) fail('runtime-state contract rewrites HOME without demonstrated need');

const runtime = source('ai/storefront-render/shopify-cli-runtime.js');
const development = source('ai/storefront-render/shopify-development-runtime.js');
for (const value of ['attestRuntimeStateReadiness', 'initializeShopifyCliRuntimeState', 'shopify_cli_runtime_immutability_failed']) {
  if (!runtime.includes(value)) fail(`Shopify CLI runtime omits ${value}`);
}
for (const value of ['runtimeStateFactory', 'commandEnvironment', 'attestRuntimeStateReadiness', 'package_immutable', 'runtimeState.attest()']) {
  if (!development.includes(value)) fail(`pre-render runtime omits ${value}`);
}
if (!development.includes('runtimeState.cleanup()')
  && !(development.includes('finalizeStorefrontRuntimeResources') && development.includes('runtimeState?.cleanup()'))) {
  fail('pre-render runtime omits direct or lifecycle-guarded runtime-state cleanup');
}
for (const forbidden of ['shell: true', 'execSync(', 'npm install --global', '@shopify/cli@latest']) {
  if (state.includes(forbidden) || runtime.includes(forbidden) || development.includes(forbidden)) fail(`runtime-state implementation permits ${forbidden}`);
}

const configuration = source('apps/dashboard/server/services/merchant-flow-controlled-runtime-configuration.cjs');
const readiness = source('apps/dashboard/server/services/merchant-flow-controlled-readiness.cjs');
const services = source('apps/dashboard/server/dashboard-services.cjs');
const diagnostics = source('apps/dashboard/src/components/creative-director/OperatorReadinessDiagnostics.jsx');
for (const content of [configuration, readiness, services, diagnostics]) {
  if (!content.includes('shopify_cli_runtime_state')) fail('protected readiness does not project Shopify CLI runtime state consistently');
}

const docker = source('Dockerfile.staging');
const fly = source('fly.staging.toml.example');
for (const content of [docker, fly]) {
  if (!content.includes(SHOPIFY_CLI_RUNTIME_STATE_REVISION)) fail('staging build/runtime configuration omits the E5R-L state revision');
  if (!content.includes('shopify-cli-runtime-state')) fail('staging build/runtime configuration omits the bounded state root');
}
if (!docker.includes('attest-shopify-cli-build.js --harden') || !docker.includes('attest-shopify-cli-build.js --verify-immutable')) {
  fail('E5R-K package/config hardening gates were not preserved');
}
if (!docker.includes('test-e5r-l-shopify-cli-runtime-state-image.js')) fail('staging image omits the runtime-user permission gate');

try {
  const fixture = json('fixtures/e5r-l-shopify-cli-runtime-state-boundary.json');
  if (fixture.release_6_blocker.attempted_path !== '/home/node/.config/shopify-cli-theme-conf-nodejs') fail('exact release-6 EACCES path is not retained');
  if (fixture.approved_cli_version !== '4.6.0') fail('approved CLI version is not retained');
  if (fixture.preserved_identity.render_job_id !== 'merchant-flow-job-00000000000000000001'
    || fixture.preserved_identity.render_job_state !== 'retryable') fail('existing retryable render identity is not retained');
} catch (error) { fail(`E5R-L fixture validation failed: ${error.message}`); }

try {
  const forbiddenChanges = execFileSync('git', ['diff', '--name-only', 'HEAD', '--',
    'apps/theme', 'ai/architecture', 'ai/design-dna', 'ai/merchant-intent'], { cwd: root, encoding: 'utf8' }).trim();
  if (forbiddenChanges) fail(`protected storefront/architecture scope changed: ${forbiddenChanges.replace(/\n/g, ', ')}`);
} catch (error) { fail(`could not inspect protected source scope: ${error.message}`); }

if (fs.existsSync(path.join(root, required.at(-1)))) {
  const documentation = source(required.at(-1));
  for (const phrase of [
    'EACCES', '/home/node/.config/shopify-cli-theme-conf-nodejs', SHOPIFY_CLI_RUNTIME_STATE_REVISION,
    '4.6.0', 'Auto-upgrade remains off', 'credential persistence', 'deployment pending',
    'merchant-flow-job-00000000000000000001', 'OpenAI/model calls: 0', 'Shopify calls: 0'
  ]) if (!documentation.toLowerCase().includes(phrase.toLowerCase())) fail(`E5R-L documentation omits ${phrase}`);
}

for (const file of required.filter((file) => fs.existsSync(path.join(root, file)))) {
  const content = source(file);
  if (/shpat_[a-z0-9]|shpua_[a-z0-9]|sk-[a-z0-9]{20}|client_secret\s*[=:]\s*[^<\s]|theme_access_password\s*[=:]\s*[^<\s]/i.test(content)) {
    fail(`${file} contains a credential-like literal`);
  }
}

if (errors.length) {
  console.error(`E5R-L validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`E5R-L validation passed: ${required.length} required artifacts, ${SHOPIFY_CLI_RUNTIME_STATE_REVISION}, exact EACCES regression, bounded XDG state, preserved E5R-J/K contracts, protected readiness, and zero credential literals.`);
