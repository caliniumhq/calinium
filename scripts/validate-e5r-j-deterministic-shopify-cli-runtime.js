#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  SHOPIFY_CLI_RUNTIME_REVISION,
  SHOPIFY_CLI_JSON_OUTPUT_REVISION,
  PINNED_SHOPIFY_CLI_VERSION,
  validateThemeListPayload
} = require('../ai/storefront-render/shopify-cli-runtime');

const root = path.resolve(__dirname, '..');
const errors = [];
function fail(message) { errors.push(message); }
function source(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function json(file) { return JSON.parse(source(file)); }

const required = [
  'ai/storefront-render/shopify-cli-runtime.js',
  'ai/storefront-render/shopify-development-runtime.js',
  'fixtures/e5r-j-release-5-shopify-cli-runtime.json',
  'scripts/test-e5r-j-deterministic-shopify-cli-runtime.js',
  'scripts/validate-e5r-j-deterministic-shopify-cli-runtime.js',
  'docs/architecture/calinium-core-2-phase-e5r-j-deterministic-shopify-cli-runtime-machine-output.md'
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);

for (const file of ['fixtures/e5r-j-release-5-shopify-cli-runtime.json', 'package.json', 'package-lock.json']) {
  try { json(file); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); }
}

try {
  execFileSync(process.execPath, ['scripts/test-e5r-j-deterministic-shopify-cli-runtime.js'], { cwd: root, stdio: 'pipe' });
} catch (error) { fail(`E5R-J behavioral tests failed: ${String(error.stderr || error.message).trim()}`); }

try {
  const fixture = json('fixtures/e5r-j-release-5-shopify-cli-runtime.json');
  const themes = validateThemeListPayload(fixture.theme_list_json);
  if (themes.find((theme) => theme.role === 'main')?.id !== '100000000001') fail('release-5 MAIN authority is not retained');
  if (themes.find((theme) => theme.role === 'development')?.id !== '100000000006') fail('release-5 DEVELOPMENT authority is not retained');
  if (fixture.preserved_identity.render_job_id !== 'merchant-flow-job-00000000000000000001' || fixture.expected_retry_state !== 'retryable') fail('release-5 retry identity is not retained');
} catch (error) { fail(`release-5 fixture validation failed: ${error.message}`); }

const runtime = source('ai/storefront-render/shopify-cli-runtime.js');
for (const value of [SHOPIFY_CLI_RUNTIME_REVISION, SHOPIFY_CLI_JSON_OUTPUT_REVISION, PINNED_SHOPIFY_CLI_VERSION,
  'shopify_cli_version_mismatch', 'shopify_cli_execution_failed', 'shopify_cli_machine_output_invalid',
  'shopify_theme_inventory_invalid', 'shopify_development_target_not_found', 'shopify_development_target_role_invalid',
  'shopify_cli_runtime_drift']) {
  if (!runtime.includes(value)) fail(`runtime contract omits ${value}`);
}
if (/execSync\s*\(|shell\s*:\s*true/.test(runtime)) fail('runtime permits shell-interpolated execution');

const docker = source('Dockerfile.staging');
if (!docker.includes('attest-shopify-cli-build.js') || !docker.includes('--harden') || !docker.includes('--verify-immutable')) {
  fail('staging image does not explicitly configure, harden, and verify the pinned CLI runtime');
}
if (/npm install --global @shopify\/cli|@shopify\/cli@latest/.test(docker)) fail('staging image retains an independently varying/global CLI install');
const packageJson = json('package.json');
const packageLock = json('package-lock.json');
if (packageJson.dependencies?.['@shopify/cli'] !== PINNED_SHOPIFY_CLI_VERSION) fail('package.json CLI dependency is not exact');
if (packageLock.packages?.['node_modules/@shopify/cli']?.version !== PINNED_SHOPIFY_CLI_VERSION) fail('package-lock CLI dependency is not exact');

const fly = source('fly.staging.toml.example');
for (const value of [
  `CALINIUM_SHOPIFY_CLI_EXPECTED_VERSION = "${PINNED_SHOPIFY_CLI_VERSION}"`,
  `CALINIUM_SHOPIFY_CLI_RUNTIME_REVISION = "${SHOPIFY_CLI_RUNTIME_REVISION}"`,
  'CALINIUM_SHOPIFY_CLI_AUTOUPGRADE_POLICY = "disabled"',
  'CALINIUM_SHOPIFY_MAIN_THEME_ID = "100000000001"'
]) if (!fly.includes(value)) fail(`Fly runtime contract omits ${value}`);

try {
  const changedTheme = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'apps/theme'], { cwd: root, encoding: 'utf8' }).trim();
  if (changedTheme) fail(`forbidden storefront/theme files changed: ${changedTheme.replace(/\n/g, ', ')}`);
} catch (error) { fail(`could not inspect protected theme scope: ${error.message}`); }

const doc = source(required.at(-1));
for (const phrase of [
  '0/8', '4.6.0', '4.7.0', SHOPIFY_CLI_RUNTIME_REVISION, SHOPIFY_CLI_JSON_OUTPUT_REVISION,
  'automatic upgrades', 'MAIN', 'DEVELOPMENT', 'merchant-flow-job-00000000000000000001',
  'deployment pending', 'OpenAI/model calls: 0', 'Shopify calls: 0', 'Shopify writes: 0'
]) if (!doc.toLowerCase().includes(phrase.toLowerCase())) fail(`E5R-J documentation omits ${phrase}`);

for (const file of required) {
  const content = source(file);
  if (/shpat_[a-z0-9]|shpua_[a-z0-9]|sk-[a-z0-9]{20}|client_secret\s*[=:]\s*[^<\s]|theme_access_password\s*[=:]\s*[^<\s]/i.test(content)) fail(`${file} contains a credential-like literal`);
}

if (errors.length) {
  console.error(`E5R-J validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`E5R-J validation passed: ${required.length} required artifacts, ${SHOPIFY_CLI_RUNTIME_REVISION}, ${SHOPIFY_CLI_JSON_OUTPUT_REVISION}, pinned ${PINNED_SHOPIFY_CLI_VERSION}, release-5 authority/retry identity, protected theme scope, and zero credential literals.`);
