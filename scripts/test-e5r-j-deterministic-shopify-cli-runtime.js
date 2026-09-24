#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  SHOPIFY_CLI_RUNTIME_REVISION,
  SHOPIFY_CLI_JSON_OUTPUT_REVISION,
  PINNED_SHOPIFY_CLI_VERSION,
  extractShopifyCliJson,
  parseShopifyCliJsonResult,
  validateThemeListPayload,
  assertDevelopmentTarget,
  createShopifyCliRuntime
} = require('../ai/storefront-render/shopify-cli-runtime');
const { ThemeService, parseJson } = require('../ai/deployment/theme-service');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/e5r-j-release-5-shopify-cli-runtime.json'), 'utf8'));
const json = JSON.stringify(fixture.theme_list_json, null, 2);
const chatter = fixture.recognized_upgrade_chatter;

function fails(code, operation) {
  assert.throws(operation, (error) => error?.code === code, `Expected bounded failure ${code}.`);
}

// A-C: ordinary, whitespace, and BOM-delimited payloads.
assert.deepStrictEqual(extractShopifyCliJson(json).data, fixture.theme_list_json);
assert.deepStrictEqual(extractShopifyCliJson(`${json}\n\t`).data, fixture.theme_list_json);
assert.deepStrictEqual(extractShopifyCliJson(`\uFEFF${json}`).data, fixture.theme_list_json);

// D-E: the exact release-5 suffix and the same explicitly recognized prefix.
const release5 = extractShopifyCliJson(`${json}\n${chatter}`);
assert.equal(release5.chatter_classification, fixture.expected_classification);
assert.deepStrictEqual(validateThemeListPayload(release5.data).map(({ id, role }) => ({ id, role })), [
  { id: fixture.main_theme_id, role: 'main' },
  { id: fixture.development_theme_id, role: 'development' },
  { id: '100000000008', role: 'unpublished' },
  { id: '100000000009', role: 'unpublished' }
]);
assert.equal(extractShopifyCliJson(`${chatter}${json}`).chatter_classification, 'shopify_cli_update_chatter');
assert.throws(() => JSON.parse(`${json}\n${chatter}`), SyntaxError, 'Legacy full-stdout JSON.parse must reproduce the release-5 failure class.');

// F-H: unknown text, two documents, and truncation fail closed.
fails('shopify_cli_machine_output_invalid', () => extractShopifyCliJson(`${json}\nunrecognized diagnostic`));
fails('shopify_cli_machine_output_invalid', () => extractShopifyCliJson(`${json}\n{"second":true}`));
fails('shopify_cli_machine_output_invalid', () => extractShopifyCliJson('[{"id":1}'));

// I-J: the structural scanner understands brackets/braces and escaped quotes in strings.
assert.deepStrictEqual(extractShopifyCliJson('{"message":"literal } and ] and {","nested":[{"quote":"say \\\"hello\\\""}]}').data,
  { message: 'literal } and ] and {', nested: [{ quote: 'say "hello"' }] });

// K-M: schema, process status, and empty stdout retain bounded failure semantics.
fails('shopify_theme_inventory_invalid', () => validateThemeListPayload([{ id: 1, name: '', role: 'development' }]));
fails('shopify_theme_inventory_invalid', () => validateThemeListPayload([{ id: 1, name: 'Duplicate', role: 'development' }, { id: 1, name: 'Duplicate', role: 'live' }]));
fails('shopify_cli_execution_failed', () => parseShopifyCliJsonResult({ status: 2, stdout: json, stderr: '' }));
fails('shopify_cli_execution_failed', () => parseShopifyCliJsonResult({ status: null, signal: 'SIGTERM', stdout: json, stderr: '' }));
fails('shopify_cli_machine_output_invalid', () => parseShopifyCliJsonResult({ status: 0, stdout: '', stderr: '' }));
fails('shopify_cli_machine_output_invalid', () => parseShopifyCliJsonResult({ status: 0, stdout: json, stderr: 'unknown warning' }));
fails('shopify_cli_execution_failed', () => parseShopifyCliJsonResult({ status: 0, stdout: json, stderr: 'Error: controlled fatal diagnostic' }));
assert.equal(parseShopifyCliJsonResult({ status: 0, stdout: json, stderr: chatter }).chatter_classification, 'shopify_cli_update_chatter');
const deploymentInventory = new ThemeService({ root, runner: () => ({ status: 0, stdout: `${json}\n${chatter}`, stderr: '' }) })
  .listThemes({ store: fixture.shop_domain, environment: null });
assert.equal(deploymentInventory.find((theme) => theme.role === 'main').id, fixture.main_theme_id);
assert.equal(parseJson({ status: 0, stdout: `${JSON.stringify({ theme: { id: fixture.development_theme_id, name: 'Development', role: 'development' } })}\n${chatter}`, stderr: '' }, 'Shopify push').theme.id,
  fixture.development_theme_id);

const themes = validateThemeListPayload(fixture.theme_list_json);
assert.equal(assertDevelopmentTarget(themes, fixture.development_theme_id).id, fixture.development_theme_id);
fails('shopify_development_target_not_found', () => assertDevelopmentTarget(themes, '999999999999'));
fails('shopify_development_target_role_invalid', () => assertDevelopmentTarget(themes, fixture.main_theme_id));
fails('shopify_development_target_role_invalid', () => assertDevelopmentTarget(themes.filter((theme) => theme.role !== 'main'), fixture.development_theme_id));

function result(status, stdout, stderr = '') { return { status, stdout, stderr, signal: null, error: null }; }
const stableCalls = [];
const stableExecutionOptions = [];
const stableRuntime = createShopifyCliRuntime({
  root,
  command: '/controlled/shopify',
  expectedMainThemeId: fixture.main_theme_id,
  runner(_command, args, options) {
    stableCalls.push([...args]);
    stableExecutionOptions.push(options);
    return args[0] === 'version' ? result(0, `${PINNED_SHOPIFY_CLI_VERSION}\n`) : result(0, `${json}\n${chatter}`);
  }
});
assert.equal(stableRuntime.runtime_revision, SHOPIFY_CLI_RUNTIME_REVISION);
assert.equal(stableRuntime.json_output_revision, SHOPIFY_CLI_JSON_OUTPUT_REVISION);
assert.equal(stableRuntime.attestReadiness().actual_version, PINNED_SHOPIFY_CLI_VERSION);
const inventory = stableRuntime.listThemes(fixture.shop_domain);
assert.equal(inventory.chatter_classification, 'shopify_cli_update_chatter');
assert.equal(stableRuntime.assertDevelopmentTarget(inventory.data, fixture.development_theme_id).role, 'development');
assert.ok(stableCalls.every((args) => !args.includes('config') && !args.includes('autoupgrade') && !args.includes('install') && !args.includes('update')),
  'A request/job must never invoke CLI/package-manager self-update commands.');
assert.ok(stableExecutionOptions.every((options) => options.shell === false && options.timeout === 30000
  && options.env.CI === '1' && options.env.NO_COLOR === '1' && options.env.FORCE_COLOR === '0'),
  'Machine commands must remain non-shell, bounded, non-interactive, and color-free.');

const mismatchRuntime = createShopifyCliRuntime({ root, command: '/controlled/shopify', runner: () => result(0, '4.7.0\n') });
fails('shopify_cli_version_mismatch', () => mismatchRuntime.attestReadiness());
const timeoutRuntime = createShopifyCliRuntime({ root, command: '/controlled/shopify', runner: () => ({ status: null, stdout: '', stderr: '', error: Object.assign(new Error('timed out at /private/path'), { code: 'ETIMEDOUT' }) }) });
fails('shopify_cli_execution_failed', () => timeoutRuntime.attestReadiness());
try { extractShopifyCliJson(`${json}\nunknown private-value-that-must-not-escape`); }
catch (error) { assert.doesNotMatch(error.message, /private-value-that-must-not-escape|\/private\/path/); }
const wrongMainRuntime = createShopifyCliRuntime({ root, command: '/controlled/shopify', expectedMainThemeId: '999999999999', runner: () => result(0, '4.6.0\n') });
fails('shopify_development_target_role_invalid', () => wrongMainRuntime.assertDevelopmentTarget(themes, fixture.development_theme_id));

let versionRead = 0;
const driftRuntime = createShopifyCliRuntime({
  root,
  command: '/controlled/shopify',
  runner(_command, args) {
    if (args[0] !== 'version') return result(0, json);
    versionRead += 1;
    return result(0, versionRead === 1 ? '4.6.0\n' : '4.7.0\n');
  }
});
driftRuntime.attestReadiness();
fails('shopify_cli_runtime_drift', () => driftRuntime.assertRenderReady());

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
assert.equal(packageJson.dependencies['@shopify/cli'], PINNED_SHOPIFY_CLI_VERSION);
assert.equal(packageLock.packages['node_modules/@shopify/cli'].version, PINNED_SHOPIFY_CLI_VERSION);
const docker = fs.readFileSync(path.join(root, 'Dockerfile.staging'), 'utf8');
const fly = fs.readFileSync(path.join(root, 'fly.staging.toml.example'), 'utf8');
assert.match(docker, /attest-shopify-cli-build\.js/);
assert.match(docker, /attest-shopify-cli-build\.js --harden/);
assert.match(docker, /attest-shopify-cli-build\.js --verify-immutable/);
assert.doesNotMatch(docker, /npm install --global @shopify\/cli|@shopify\/cli@latest/);
assert.match(fly, /CALINIUM_SHOPIFY_CLI_EXPECTED_VERSION = "4\.6\.0"/);
assert.match(fly, /CALINIUM_SHOPIFY_CLI_AUTOUPGRADE_POLICY = "disabled"/);
assert.match(fly, /CALINIUM_SHOPIFY_MAIN_THEME_ID = "100000000001"/);

assert.deepStrictEqual(fixture.preserved_identity, {
  project_id: 'prj_public-fixture-0001',
  merchant_flow_id: 'merchant-flow-00000000000000000001',
  generation_job_id: 'merchant-flow-job-00000000000000000002',
  artifact_id: 'theme-artifact-00000000000000000001',
  artifact_checksum: 'c2e5dd71a4b06b173f266cc3c5e7cf60aff4c3c9f269b73b372bcf3f66e95b09',
  render_job_id: 'merchant-flow-job-00000000000000000001',
  architecture_profile_id: 'profile.editorial_discovery.v1',
  architecture_revision_id: 'architecture-selection-7b835c017232aa922918',
  design_dna_id: 'adna_0989b341020b3def5aac2c7eda0b1b93b9af1aae'
});
assert.equal(fixture.expected_retry_state, 'retryable');

process.stdout.write('E5R-J deterministic Shopify CLI tests passed: release-5 reproduction, parser A-M, exact 4.6.0 attestation, update isolation, drift rejection, MAIN/DEVELOPMENT authority, and preserved retry identity.\n');
