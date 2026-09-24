#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { loadCapability } = require('../ai/merchant-experience');

const root = path.resolve(__dirname, '..');
const parentTag = 'core-2-phase-f1-a-complete';
const parentCommit = '1000000000000000000000000000000000000008';
const f1AFiles = [
  'ai/merchant-experience/contracts.js',
  'ai/merchant-experience/copy-contract.js',
  'ai/merchant-experience/direction-choice-adapter.js',
  'ai/merchant-experience/index.js',
  'ai/merchant-experience/journey-projector.js',
  'ai/merchant-experience/telemetry.js',
  'ai/merchant-experience/visual-briefing.js',
  'config/calinium-analysis-first-merchant-experience.json',
  'fixtures/analysis-first-merchant-journey.json',
  'schemas/calinium-analysis-first-direction-choice.schema.json',
  'schemas/calinium-analysis-first-merchant-experience.schema.json',
  'schemas/calinium-analysis-first-merchant-journey-fixture.schema.json',
  'schemas/calinium-analysis-first-merchant-journey.schema.json',
  'schemas/calinium-analysis-first-merchant-projection.schema.json',
  'schemas/calinium-analysis-first-telemetry-event.schema.json',
  'schemas/calinium-merchant-visual-briefing.schema.json',
  'scripts/test-f1-a-analysis-first-merchant-experience.js',
  'scripts/validate-f1-a-analysis-first-merchant-experience.js'
];
const requiredFiles = [
  'apps/dashboard/server/dashboard-api.cjs',
  'apps/dashboard/server/dashboard-services.cjs',
  'apps/dashboard/server/services/analysis-first-merchant-experience-service.cjs',
  'apps/dashboard/server/services/creative-director-service.cjs',
  'apps/dashboard/src/adapters/dashboard-api-client.js',
  'apps/dashboard/src/app/CreativeDirectorApp.jsx',
  'apps/dashboard/src/components/analysis-first/AnalysisFirstMerchantExperienceHarness.jsx',
  'apps/dashboard/src/components/analysis-first/AnalysisFirstMerchantJourney.jsx',
  'apps/dashboard/src/fixtures/analysis-first-experience-fixtures.js',
  'apps/dashboard/src/hooks/use-analysis-first-merchant-experience.js',
  'apps/dashboard/src/services/creative-director-service.js',
  'apps/dashboard/src/styles/dashboard.css',
  'apps/dashboard/src/tests/analysis-first-merchant-experience.test.jsx',
  'apps/dashboard/tests/analysis-first-merchant-experience-api.test.js',
  'apps/dashboard/tests/analysis-first-merchant-experience-service.test.js',
  'schemas/calinium-analysis-first-merchant-experience-response.schema.json',
  'scripts/test-f1-b-embedded-three-stage-merchant-experience.js',
  'scripts/validate-f1-b-embedded-three-stage-merchant-experience.js',
  'docs/architecture/calinium-core-2-phase-f1-b-embedded-three-stage-merchant-experience.md',
  'package.json'
];
const allowedFiles = new Set(requiredFiles);
const frozenPaths = [
  'apps/theme',
  'ai/architecture',
  'ai/conversation',
  'ai/design-dna',
  'ai/design-evaluation',
  'ai/merchant-flow',
  'ai/storefront-render',
  'ai/theme-generator',
  'ai/visual-evaluation',
  'pipeline',
  'config/calinium-architecture-families.json',
  'config/calinium-architecture-profiles.json',
  'config/calinium-architecture-selection-policy.json'
];

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function lines(value) { return value.split('\n').map((item) => item.trim()).filter(Boolean); }

function candidatePaths() {
  const tracked = lines(git('diff', '--name-only', parentTag, '--'));
  const untracked = lines(git('ls-files', '--others', '--exclude-standard'));
  return [...new Set([...tracked, ...untracked])].sort();
}

function assertUnchanged(relativePath) {
  const result = spawnSync('git', ['diff', '--quiet', parentTag, '--', relativePath], { cwd: root });
  assert.equal(result.status, 0, `Frozen Core 2.0 path changed: ${relativePath}`);
}

function sanitizedEnvironment() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/OPENAI|SHOPIFY.*(?:TOKEN|SECRET|PASSWORD)|THEME_KIT|FLY_(?:API|ACCESS)_TOKEN/i.test(key)) delete env[key];
  }
  return env;
}

function runCommand(command, args, timeout = 90000) {
  const result = spawnSync(command, args, { cwd: root, env: sanitizedEnvironment(), encoding: 'utf8', timeout });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} ${args.join(' ')} failed.`);
  return result.stdout;
}

function run() {
  assert.equal(git('rev-parse', parentTag), parentCommit, 'F1-A parent tag moved.');
  assert.equal(git('merge-base', 'HEAD', parentTag), parentCommit, 'F1-B must descend from the approved F1-A checkpoint.');
  assert.equal(git('branch', '--show-current'), 'main', 'F1-B must remain on main.');

  for (const file of requiredFiles) assert.ok(fs.existsSync(path.join(root, file)), `Missing F1-B file ${file}`);
  for (const file of f1AFiles) {
    assert.ok(fs.existsSync(path.join(root, file)), `Missing F1-A parent contract ${file}`);
    assert.equal(spawnSync('git', ['diff', '--quiet', parentTag, '--', file], { cwd: root }).status, 0, `F1-A contract changed during F1-B: ${file}`);
  }
  for (const file of candidatePaths()) assert.ok(allowedFiles.has(file), `Out-of-scope F1-B change: ${file}`);
  for (const relativePath of frozenPaths) assertUnchanged(relativePath);

  const capability = loadCapability(root);
  assert.equal(capability.analysis_first_merchant_experience_enabled, false);
  assert.equal(capability.activation_scope, 'disabled');
  assert.equal(capability.automatic_generation_allowed, false);
  assert.equal(capability.automatic_paid_action_allowed, false);
  assert.equal(capability.automatic_theme_action_allowed, false);
  assert.equal(capability.automatic_repair_allowed, false);

  const responseSchemaPath = path.join(root, 'schemas/calinium-analysis-first-merchant-experience-response.schema.json');
  JSON.parse(fs.readFileSync(responseSchemaPath, 'utf8'));
  const validator = createSchemaValidator(root);
  assert.deepEqual(validator.validateFile({
    contract_version: 'analysis-first-merchant-experience-response-v1',
    eligible: false,
    fallback: 'existing_interface',
    projection: null,
    projection_key: null,
    action_bindings: {},
    preview_link: null
  }, 'schemas/calinium-analysis-first-merchant-experience-response.schema.json', 'F1-B disabled response'), []);

  const server = fs.readFileSync(path.join(root, 'apps/dashboard/server/services/analysis-first-merchant-experience-service.cjs'), 'utf8');
  assert.match(server, /createMerchantVisualBriefing/);
  assert.match(server, /createAnalysisFirstJourney/);
  assert.match(server, /projectMerchantJourney/);
  assert.match(server, /submitDirectionChoice/);
  assert.doesNotMatch(server, /\bfetch\s*\(|\bnew\s+OpenAI\b|@shopify\//i, 'F1-B projection service must not contact providers or Shopify.');

  const dashboardServices = fs.readFileSync(path.join(root, 'apps/dashboard/server/dashboard-services.cjs'), 'utf8');
  assert.match(dashboardServices, /CALINIUM_ANALYSIS_FIRST_MERCHANT_EXPERIENCE_ENABLED\s*===\s*'true'/);
  const dashboardApi = fs.readFileSync(path.join(root, 'apps/dashboard/server/dashboard-api.cjs'), 'utf8');
  const routeSource = dashboardApi.slice(dashboardApi.indexOf('const analysisFirstExperienceMatch'), dashboardApi.indexOf('const customThemeOrderMatch'));
  assert.match(routeSource, /embeddedRequest\(request, \{ required: true \}\)/, 'F1-B routes must require a verified App Bridge session.');
  const fixtureSource = fs.readFileSync(path.join(root, 'apps/dashboard/src/fixtures/analysis-first-experience-fixtures.js'), 'utf8');
  assert.equal((fixtureSource.match(/\bfixture\('/g) || []).length, 16, 'Expected exactly 16 F1-B fixture states.');

  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['test:f1-b'], 'node scripts/test-f1-b-embedded-three-stage-merchant-experience.js');
  assert.equal(packageJson.scripts['validate:f1-b'], 'node scripts/validate-f1-b-embedded-three-stage-merchant-experience.js');

  const testOutput = runCommand(process.execPath, ['scripts/test-f1-b-embedded-three-stage-merchant-experience.js']);
  assert.match(testOutput, /40\/40 F1-B embedded three-stage merchant-experience tests passed\./);
  runCommand('npm', ['--prefix', 'apps/dashboard', 'run', 'build'], 120000);
  for (const file of [
    'apps/dashboard/server/services/analysis-first-merchant-experience-service.cjs',
    'apps/dashboard/server/dashboard-api.cjs',
    'apps/dashboard/server/dashboard-services.cjs',
    'apps/dashboard/server/services/creative-director-service.cjs'
  ]) runCommand(process.execPath, ['--check', file]);

  const result = {
    valid: true,
    parent: { commit: parentCommit, tag: parentTag },
    capability: { enabled: false, activation_scope: 'disabled' },
    server_projection: 'analysis-first-merchant-experience-response-v1',
    visible_stages: ['Analyzing your store', 'Building your storefront', 'Review your preview'],
    fixtures: '16/16',
    focused_tests: '40/40',
    production_build: 'passed',
    f1_a_contracts_unchanged: `${f1AFiles.length}/${f1AFiles.length}`,
    core_2_frozen_paths: `${frozenPaths.length}/${frozenPaths.length}`,
    provider_calls: 0,
    shopify_calls: 0,
    shopify_writes: 0,
    theme_mutations: 0,
    deployment_started: false,
    activation_started: false
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (require.main === module) {
  try { run(); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { run };
