#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { loadCapability } = require('../ai/merchant-experience');
const { createMerchantFlowPreviewBinding } = require('../ai/merchant-flow');

const root = path.resolve(__dirname, '..');
const parentTag = 'core-2-phase-f1-b-complete';
const parentCommit = '1000000000000000000000000000000000000006';
const requiredFiles = [
  'ai/design-evaluation/merchant-flow-production-qa-adapter.js',
  'ai/merchant-flow/index.js',
  'ai/merchant-flow/merchant-flow-preview-binding.js',
  'ai/merchant-flow/merchant-generation-flow.js',
  'apps/dashboard/server/dashboard-services.cjs',
  'apps/dashboard/server/services/analysis-first-merchant-experience-service.cjs',
  'apps/dashboard/server/services/creative-director-service.cjs',
  'apps/dashboard/server/services/merchant-flow-preview-binding-resolver.cjs',
  'apps/dashboard/src/components/analysis-first/AnalysisFirstMerchantJourney.jsx',
  'apps/dashboard/src/tests/f1-d-preview-availability.test.jsx',
  'apps/dashboard/tests/f1-d-authoritative-preview-binding.test.js',
  'fixtures/merchant-flow-preview-binding.json',
  'schemas/calinium-analysis-first-merchant-experience-response.schema.json',
  'schemas/calinium-merchant-flow-preview-binding.schema.json',
  'schemas/calinium-merchant-generation-flow.schema.json',
  'scripts/test-f1-d-authoritative-preview-binding.js',
  'scripts/validate-f1-d-authoritative-preview-binding.js',
  'docs/architecture/calinium-core-2-phase-f1-d-authoritative-preview-binding-legacy-recovery.md',
  'package.json'
];
const allowedFiles = new Set(requiredFiles);
const frozenPaths = [
  'apps/theme',
  'apps/dashboard/server/billing',
  'apps/dashboard/server/shopify',
  'apps/dashboard/server/storage',
  'ai/architecture',
  'ai/conversation',
  'ai/design-dna',
  'ai/storefront-render',
  'ai/theme-generator',
  'ai/visual-evaluation',
  'config/calinium-analysis-first-merchant-experience.json',
  'config/calinium-architecture-families.json',
  'config/calinium-architecture-profiles.json',
  'config/calinium-architecture-selection-policy.json',
  'deployment',
  'fly.toml',
  'shopify.app.toml'
];

function git(...args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); }
function source(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function lines(value) { return value.split('\n').map((item) => item.trim()).filter(Boolean); }
function candidatePaths() {
  return [...new Set([
    ...lines(git('diff', '--name-only', parentTag, '--')),
    ...lines(git('ls-files', '--others', '--exclude-standard'))
  ])].sort();
}
function assertUnchanged(relativePath) {
  assert.equal(spawnSync('git', ['diff', '--quiet', parentTag, '--', relativePath], { cwd: root }).status, 0, `Frozen F1-D scope changed: ${relativePath}`);
}
function sanitizedEnvironment() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/OPENAI|SHOPIFY.*(?:TOKEN|SECRET|PASSWORD)|THEME_KIT|FLY_(?:API|ACCESS)_TOKEN/i.test(key)) delete env[key];
  return env;
}
function runCommand(command, args, timeout = 120000) {
  const result = spawnSync(command, args, { cwd: root, env: sanitizedEnvironment(), encoding: 'utf8', timeout });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} ${args.join(' ')} failed.`);
  return result.stdout;
}

function run() {
  assert.equal(git('rev-parse', parentTag), parentCommit, 'F1-B parent tag moved.');
  assert.equal(git('rev-parse', 'HEAD'), parentCommit, 'F1-D must remain an uncheckpointed candidate on the F1-B parent.');
  assert.equal(git('branch', '--show-current'), 'main', 'F1-D must remain on main.');
  for (const file of requiredFiles) assert.ok(fs.existsSync(path.join(root, file)), `Missing F1-D file ${file}`);
  const changed = candidatePaths();
  for (const file of changed) assert.ok(allowedFiles.has(file), `Out-of-scope F1-D change: ${file}`);
  for (const relativePath of frozenPaths) assertUnchanged(relativePath);

  const capability = loadCapability(root);
  assert.equal(capability.analysis_first_merchant_experience_enabled, false);
  assert.equal(capability.activation_scope, 'disabled');
  assert.equal(capability.automatic_theme_action_allowed, false);
  assert.equal(capability.automatic_repair_allowed, false);

  const contract = source('ai/merchant-flow/merchant-flow-preview-binding.js');
  for (const token of [
    'merchant-flow-preview-binding-v1', 'merchant-flow-preview-binding-resolver-v1',
    'main_theme_id_at_verification', 'main_theme_excluded', 'stable_while_target_exists',
    'legacy_read_only', 'legacy_binding_ambiguous', 'explicit_binding_invalid',
    'preview_theme_id', 'SENSITIVE_QUERY_NAME', 'requireAcceptedQa'
  ]) assert.ok(contract.includes(token), `Preview-binding contract omits ${token}`);
  const resolver = source('apps/dashboard/server/services/merchant-flow-preview-binding-resolver.cjs');
  for (const token of [
    'loadExistingMerchantRender', 'acceptedGateEvidenceMatches', 'legacySourceRevision',
    'renderEvidenceChecksum', 'createMerchantFlowPreviewBindingFromRenderEvidence',
    'merchantSafePreview'
  ]) assert.ok(resolver.includes(token), `Legacy resolver omits ${token}`);
  assert.doesNotMatch(resolver, /\bfetch\s*\(|preparePreview\s*\(|upsert|INSERT\s+INTO|UPDATE\s+/i, 'Legacy projection resolution must remain read-only and offline.');

  const adapter = source('ai/design-evaluation/merchant-flow-production-qa-adapter.js');
  assert.match(adapter, /createMerchantFlowPreviewBindingFromRenderEvidence/);
  assert.match(adapter, /preview_binding:\s*previewBinding/);
  assert.match(adapter, /mainThemeId/);
  const flow = source('ai/merchant-flow/merchant-generation-flow.js');
  for (const token of ['requireReadyPreviewBinding', "renderQa.status === 'passed'", "review.decision === 'accepted'", "resolution.status === 'human_approved'"]) {
    assert.ok(flow.includes(token), `Future preview-ready invariant omits ${token}`);
  }
  const f1 = source('apps/dashboard/server/services/analysis-first-merchant-experience-service.cjs');
  const advanced = source('apps/dashboard/server/services/creative-director-service.cjs');
  assert.match(f1, /this\.previewBindingResolver\.resolve/);
  assert.match(advanced, /this\.previewBindingResolver\.resolve/);
  assert.doesNotMatch(f1, /\bfetch\s*\(|preparePreview\s*\(/i);
  assert.doesNotMatch(advanced, /merchant-flow-preview-binding-[a-f0-9]|preview_binding_checksum/i);
  const ui = source('apps/dashboard/src/components/analysis-first/AnalysisFirstMerchantJourney.jsx');
  assert.doesNotMatch(ui, /Your preview link is being prepared\./);
  assert.match(ui, /Something needs attention/);
  assert.match(ui, /previewAvailability\?\.status === 'preparing'/);

  const fixture = JSON.parse(source('fixtures/merchant-flow-preview-binding.json')).controlled_legacy_shape;
  const binding = createMerchantFlowPreviewBinding({
    organizationId: fixture.organization_id,
    projectId: fixture.project_id,
    connectionId: fixture.connection_id,
    canonicalShop: fixture.canonical_shop,
    flowId: fixture.flow_id,
    flowSequence: fixture.render_flow_sequence,
    flowChecksum: fixture.render_flow_checksum,
    artifactId: fixture.artifact_id,
    artifactChecksum: fixture.artifact_checksum,
    renderRequestId: fixture.render_request_id,
    renderRequestChecksum: fixture.render_request_checksum,
    renderEvidenceId: fixture.render_evidence_id,
    renderEvidenceChecksum: fixture.render_evidence_checksum,
    renderRevision: fixture.render_revision,
    renderResultIds: fixture.render_result_ids,
    renderChecksum: fixture.render_checksum,
    developmentThemeId: fixture.development_theme_id,
    mainThemeId: fixture.main_theme_id,
    runtimeConfigurationRevision: fixture.runtime_configuration_revision,
    renderTargetConfigurationRevision: fixture.render_target_configuration_revision,
    sourceRevision: fixture.source_revision,
    previewUrl: fixture.preview_url,
    createdAt: fixture.created_at,
    recovery: { kind: 'legacy_read_only', reason: 'legacy_flow_missing_preview_binding', resolver_revision: 'merchant-flow-preview-binding-resolver-v1' },
    root
  });
  const schemaValidator = createSchemaValidator(root);
  assert.deepEqual(schemaValidator.validateFile(binding, 'schemas/calinium-merchant-flow-preview-binding.schema.json', 'F1-D binding'), []);
  for (const file of requiredFiles.filter((entry) => /(?:\.json|package\.json)$/.test(entry))) JSON.parse(source(file));

  const productionSources = requiredFiles.filter((file) => /^(?:ai|apps)\//.test(file) && /\.(?:js|cjs|jsx)$/.test(file));
  for (const file of productionSources) for (const identity of [
    'prj_public-fixture-0001',
    'merchant-flow-00000000000000000001',
    'theme-artifact-00000000000000000001',
    '100000000006', '100000000001'
  ]) assert.equal(source(file).includes(identity), false, `${file} hard-codes controlled identity ${identity}`);

  const packageJson = JSON.parse(source('package.json'));
  assert.equal(packageJson.scripts['test:f1-d'], 'node scripts/test-f1-d-authoritative-preview-binding.js');
  assert.equal(packageJson.scripts['validate:f1-d'], 'node scripts/validate-f1-d-authoritative-preview-binding.js');
  const focused = runCommand(process.execPath, ['scripts/test-f1-d-authoritative-preview-binding.js']);
  assert.match(focused, /16\/16 F1-D authoritative preview-binding tests passed\./);
  assert.match(runCommand(process.execPath, ['scripts/test-f1-b-embedded-three-stage-merchant-experience.js']), /40\/40 F1-B embedded three-stage merchant-experience tests passed\./);
  assert.match(runCommand(process.execPath, ['scripts/test-f1-a-analysis-first-merchant-experience.js']), /39\/39 F1-A analysis-first merchant-experience tests passed\./);
  runCommand('npm', ['--prefix', 'apps/dashboard', 'run', 'build']);

  for (const file of productionSources.filter((entry) => !entry.endsWith('.jsx'))) runCommand(process.execPath, ['--check', file]);
  const credentialLiteral = /(?:sk-[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|shpat_[A-Za-z0-9]{16,})/;
  for (const file of changed.filter((entry) => fs.statSync(path.join(root, entry)).isFile())) {
    const text = source(file);
    assert.equal(credentialLiteral.test(text), false, `Credential literal detected in ${file}`);
  }
  runCommand('git', ['diff', '--check']);

  const result = {
    valid: true,
    parent: { commit: parentCommit, tag: parentTag },
    contract: 'merchant-flow-preview-binding-v1',
    resolver: 'merchant-flow-preview-binding-resolver-v1',
    focused_tests: '16/16',
    f1_b: '40/40',
    f1_a: '39/39',
    production_build: 'passed',
    capability: { enabled: false, activation_scope: 'disabled' },
    changed_files: `${changed.length}/${changed.length} allowlisted`,
    frozen_paths: `${frozenPaths.length}/${frozenPaths.length}`,
    credential_literal_scan: `${changed.length}/${changed.length}`,
    provider_calls: 0,
    shopify_calls: 0,
    shopify_writes: 0,
    theme_mutations: 0,
    deployment_started: false
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (require.main === module) {
  try { run(); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { run };
