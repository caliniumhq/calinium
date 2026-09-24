#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  SHOPIFY_CLI_BUILD_ATTESTATION_REVISION,
  APPROVED_SHOPIFY_CLI_VERSION,
  APPROVED_SHOPIFY_CLI_RUNTIME_REVISION
} = require('../ai/storefront-render/shopify-cli-build-attestation');

const root = path.resolve(__dirname, '..');
const errors = [];
const required = [
  'ai/storefront-render/shopify-cli-build-attestation.js',
  'scripts/attest-shopify-cli-build.js',
  'fixtures/e5r-k-shopify-cli-build-attestation.json',
  'scripts/test-e5r-k-shopify-cli-build-attestation.js',
  'scripts/validate-e5r-k-shopify-cli-build-attestation.js',
  'docs/architecture/calinium-core-2-phase-e5r-k-shopify-cli-docker-build-attestation.md'
];
function fail(message) { errors.push(message); }
function source(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }

for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
for (const file of ['fixtures/e5r-k-shopify-cli-build-attestation.json', 'package.json', 'package-lock.json']) {
  try { JSON.parse(source(file)); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); }
}

try {
  execFileSync(process.execPath, ['scripts/test-e5r-k-shopify-cli-build-attestation.js'], { cwd: root, stdio: 'pipe' });
} catch (error) { fail(`E5R-K behavioral tests failed: ${String(error.stderr || error.message).trim()}`); }

const packageJson = JSON.parse(source('package.json'));
const packageLock = JSON.parse(source('package-lock.json'));
if (packageJson.dependencies?.['@shopify/cli'] !== APPROVED_SHOPIFY_CLI_VERSION) fail('package.json Shopify CLI dependency is not exactly 4.6.0');
if (packageLock.packages?.['node_modules/@shopify/cli']?.version !== APPROVED_SHOPIFY_CLI_VERSION) fail('package-lock Shopify CLI dependency is not exactly 4.6.0');

const attestation = source('ai/storefront-render/shopify-cli-build-attestation.js');
for (const value of [
  SHOPIFY_CLI_BUILD_ATTESTATION_REVISION,
  'shopify_cli_package_version_mismatch',
  'shopify_cli_binary_resolution_failed',
  'shopify_cli_version_attestation_failed',
  'shopify_cli_autoupgrade_configuration_failed',
  'shopify_cli_autoupgrade_verification_failed',
  'shopify_cli_runtime_revision_mismatch',
  'shopify_cli_runtime_immutability_failed'
]) if (!attestation.includes(value)) fail(`build attestation omits ${value}`);
if (/shell\s*:\s*true|execSync\s*\(/.test(attestation)) fail('build attestation permits shell-interpolated execution');

const docker = source('Dockerfile.staging');
for (const value of [
  'node /app/scripts/attest-shopify-cli-build.js',
  'node /app/scripts/attest-shopify-cli-build.js --harden',
  'node /app/scripts/attest-shopify-cli-build.js --verify-immutable'
]) if (!docker.includes(value)) fail(`Docker build omits observable attestation boundary ${value}`);
if (/test\s+"\$\([^\n]*shopify --version/.test(docker)) fail('Docker build retains full presentation-text comparison');
if (/npm install --global @shopify\/cli|@shopify\/cli@latest/.test(docker)) fail('Docker build retains an independently varying Shopify CLI');

const runtime = source('ai/storefront-render/shopify-cli-runtime.js');
if (!runtime.includes("execute(['version'])")) fail('runtime does not use the diagnosed Shopify CLI version command');
for (const value of ['shopify-cli-runtime-v1', 'shopify-cli-json-output-v1', 'shopify_cli_runtime_drift']) {
  if (!runtime.includes(value)) fail(`E5R-J runtime protection omits ${value}`);
}
if (!attestation.includes(APPROVED_SHOPIFY_CLI_RUNTIME_REVISION)) fail('build attestation omits the approved runtime revision');

try {
  const protectedChanges = execFileSync('git', ['diff', '--name-only', 'HEAD', '--',
    'apps/theme', 'ai/architecture', 'ai/design-dna', 'ai/merchant-intent'], { cwd: root, encoding: 'utf8' }).trim();
  if (protectedChanges) fail(`protected storefront/architecture scope changed: ${protectedChanges.replace(/\n/g, ', ')}`);
} catch (error) { fail(`could not inspect protected source scope: ${error.message}`); }

const doc = required.at(-1);
if (fs.existsSync(path.join(root, doc))) {
  const documentation = source(doc);
  for (const phrase of [
    'Auto-upgrade off', '@shopify/cli/4.6.0', 'shopify version', SHOPIFY_CLI_BUILD_ATTESTATION_REVISION,
    'deployment pending', 'merchant-flow-job-00000000000000000001', 'OpenAI/model calls: 0', 'Shopify calls: 0'
  ]) if (!documentation.toLowerCase().includes(phrase.toLowerCase())) fail(`E5R-K documentation omits ${phrase}`);
}

for (const file of required.filter((file) => fs.existsSync(path.join(root, file)))) {
  const content = source(file);
  if (/shpat_[a-z0-9]|shpua_[a-z0-9]|sk-[a-z0-9]{20}|client_secret\s*[=:]\s*[^<\s]|theme_access_password\s*[=:]\s*[^<\s]/i.test(content)) {
    fail(`${file} contains a credential-like literal`);
  }
}

if (errors.length) {
  console.error(`E5R-K validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`E5R-K validation passed: ${required.length} required artifacts, ${SHOPIFY_CLI_BUILD_ATTESTATION_REVISION}, exact ${APPROVED_SHOPIFY_CLI_VERSION}, observable Docker gates, protected runtime scope, and zero credential literals.`);
