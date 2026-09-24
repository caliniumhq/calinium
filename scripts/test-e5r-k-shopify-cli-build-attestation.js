#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  SHOPIFY_CLI_BUILD_ATTESTATION_REVISION,
  APPROVED_SHOPIFY_CLI_VERSION,
  APPROVED_SHOPIFY_CLI_RUNTIME_REVISION,
  parseShopifyCliVersionOutput,
  classifyAutoUpgradeOffOutput,
  assertAutoUpgradeCommand,
  assertAutoUpgradeState,
  assertExactVersion,
  resolveProjectLocalShopifyCli,
  attestShopifyCliBuild
} = require('../ai/storefront-render/shopify-cli-build-attestation');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/e5r-k-shopify-cli-build-attestation.json'), 'utf8'));
const observed = fixture.observed_cli_4_6_0;

function fails(code, operation) {
  assert.throws(operation, (error) => error?.code === code, `Expected bounded build-attestation failure ${code}.`);
}

assert.equal(SHOPIFY_CLI_BUILD_ATTESTATION_REVISION, 'shopify-cli-build-attestation-v1');
assert.equal(APPROVED_SHOPIFY_CLI_VERSION, fixture.approved_cli_version);
assert.equal(APPROVED_SHOPIFY_CLI_RUNTIME_REVISION, 'shopify-cli-runtime-v1');

// Exact E5R-J build regression: the CLI flag output was valid but was not equal to bare presentation text.
assert.notEqual(observed.version_flag_output, fixture.failed_e5r_j_build.legacy_expected_text);
assert.equal(fixture.failed_e5r_j_build.combined_exit_status, 1);
assert.equal(fixture.failed_e5r_j_build.failing_assertion, 'exact_full_text_comparison_of_version_flag_output');

// CASE A: exact package/binary/config evidence passes.
assert.equal(parseShopifyCliVersionOutput(observed.version_command_output), '4.6.0');
assert.equal(assertExactVersion(observed.package_version, '4.6.0', 'shopify_cli_package_version_mismatch'), '4.6.0');
assert.equal(assertAutoUpgradeState(observed.autoupgrade_off.effective_config), 'off');

// CASE B: a 4.7.0 package cannot satisfy an approved 4.6.0 contract.
fails('shopify_cli_package_version_mismatch', () => assertExactVersion('4.7.0', '4.6.0', 'shopify_cli_package_version_mismatch'));

// CASE C: a 4.7.0 executable cannot satisfy the same contract.
fails('shopify_cli_version_attestation_failed', () => assertExactVersion('4.7.0', '4.6.0'));

// CASE D: accepted formatting yields one exact semantic version.
assert.equal(parseShopifyCliVersionOutput('Shopify CLI version 4.6.0'), '4.6.0');

// CASE E: multiple semantic versions fail closed even if one is the approved value.
fails('shopify_cli_version_attestation_failed', () => parseShopifyCliVersionOutput('expected 4.6.0 but actual 4.7.0'));
fails('shopify_cli_version_attestation_failed', () => parseShopifyCliVersionOutput(observed.version_flag_output));

// CASE F: genuine command failure remains failure.
fails('shopify_cli_autoupgrade_configuration_failed', () => assertAutoUpgradeCommand({
  status: 1,
  stdout: '',
  stderr: observed.autoupgrade_off.stderr
}));

// CASE G: real CLI 4.6.0 behavior is exit 0, a bounded info diagnostic, and config OFF.
assert.equal(classifyAutoUpgradeOffOutput(observed.autoupgrade_off.stdout, observed.autoupgrade_off.stderr),
  'shopify_cli_autoupgrade_off_confirmation');
assert.equal(assertAutoUpgradeCommand({
  status: observed.autoupgrade_off.exit_status,
  stdout: observed.autoupgrade_off.stdout,
  stderr: observed.autoupgrade_off.stderr
}).status, 0);
assert.equal(assertAutoUpgradeState(observed.autoupgrade_off.effective_config), 'off');

// CASE H: output cannot substitute for an effective OFF configuration.
fails('shopify_cli_autoupgrade_verification_failed', () => assertAutoUpgradeState({ autoUpgradeEnabled: true }));

// CASE H2: the exact CLI 4.6.0 ON status is a policy verification failure, not
// an unrecognized-output or authentication failure.
const autoUpgradeOn = 'Auto-upgrade on. Shopify CLI will update automatically after each command.';
fails('shopify_cli_autoupgrade_verification_failed', () => classifyAutoUpgradeOffOutput('', autoUpgradeOn));
fails('shopify_cli_autoupgrade_verification_failed', () => assertAutoUpgradeCommand({ status: 0, stdout: '', stderr: autoUpgradeOn }));

// CASE H3: unknown output and non-zero execution remain configuration failures,
// and raw diagnostics never enter the bounded public error message.
let sanitizedFailure = null;
try { classifyAutoUpgradeOffOutput('', `${autoUpgradeOn}\nunrecognized-sensitive-diagnostic`); }
catch (error) { sanitizedFailure = error; }
assert.equal(sanitizedFailure?.code, 'shopify_cli_autoupgrade_configuration_failed');
assert.doesNotMatch(sanitizedFailure?.message || '', /unrecognized-sensitive-diagnostic/);

// CASE I: a missing local binary fails before any command executes.
const missingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-e5rk-missing-'));
try {
  fails('shopify_cli_package_version_mismatch', () => resolveProjectLocalShopifyCli({ root: missingRoot }));
} finally { fs.rmSync(missingRoot, { recursive: true, force: true }); }

// CASE J: an existing global/non-project executable cannot replace the local package binary.
fails('shopify_cli_binary_resolution_failed', () => resolveProjectLocalShopifyCli({ root, command: process.execPath }));

// CASE K: execute the real project-local CLI 4.6.0 against an isolated temporary HOME.
const isolatedHome = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-e5rk-home-'));
try {
  const result = attestShopifyCliBuild({
    root,
    env: {
      ...process.env,
      HOME: isolatedHome,
      CALINIUM_BUILD_SOURCE_REVISION: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      CALINIUM_SHOPIFY_CLI_RUNTIME_REVISION: APPROVED_SHOPIFY_CLI_RUNTIME_REVISION
    },
    configureAutoUpgrade: true
  });
  assert.deepStrictEqual(result, {
    status: 'passed',
    contract_version: SHOPIFY_CLI_BUILD_ATTESTATION_REVISION,
    runtime_revision: APPROVED_SHOPIFY_CLI_RUNTIME_REVISION,
    expected_version: '4.6.0',
    package_version: '4.6.0',
    executable_version: '4.6.0',
    binary_resolution: 'project_local',
    version_command: 'shopify version',
    auto_upgrade_action: 'configured_and_verified',
    auto_upgrade_state: 'off',
    runtime_filesystem: 'build_writable',
    source_revision: 'valid'
  });
} finally { fs.rmSync(isolatedHome, { recursive: true, force: true }); }

assert.deepStrictEqual(fixture.preserved_identity, {
  project_id: 'prj_public-fixture-0001',
  merchant_flow_id: 'merchant-flow-00000000000000000001',
  generation_job_id: 'merchant-flow-job-00000000000000000002',
  artifact_id: 'theme-artifact-00000000000000000001',
  artifact_checksum: 'c2e5dd71a4b06b173f266cc3c5e7cf60aff4c3c9f269b73b372bcf3f66e95b09',
  render_job_id: 'merchant-flow-job-00000000000000000001',
  architecture_profile_id: 'profile.editorial_discovery.v1',
  design_dna_id: 'adna_0989b341020b3def5aac2c7eda0b1b93b9af1aae'
});

const attestationSource = fs.readFileSync(path.join(root, 'ai/storefront-render/shopify-cli-build-attestation.js'), 'utf8');
assert.doesNotMatch(attestationSource, /theme\s+dev|['"]theme['"]\s*,\s*['"]dev['"]/);

process.stdout.write('E5R-K Shopify CLI build-attestation tests passed: exact regression plus bounded OFF/ON/unknown classification, real CLI 4.6.0 config/version behavior, project-local resolution, zero synchronization commands, and preserved render identity.\n');
