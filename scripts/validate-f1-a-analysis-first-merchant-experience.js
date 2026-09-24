#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { loadCapability } = require('../ai/merchant-experience');

const root = path.resolve(__dirname, '..');
const baseline = 'core-2-phase-e5-controlled-staging-go';
const requiredFiles = [
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
  'scripts/validate-f1-a-analysis-first-merchant-experience.js',
  'docs/architecture/calinium-core-2-phase-f1-a-analysis-first-merchant-journey-visual-briefing-contract.md'
];

const allowedPaths = new Set([...requiredFiles, 'package.json']);
const frozenPaths = [
  'apps/dashboard',
  'apps/theme',
  'ai/architecture',
  'ai/conversation',
  'ai/design-dna',
  'ai/design-evaluation',
  'ai/merchant-flow',
  'ai/storefront-render',
  'ai/visual-evaluation',
  'pipeline',
  'config/calinium-architecture-families.json',
  'config/calinium-architecture-profiles.json',
  'config/calinium-architecture-selection-policy.json',
  'config/storefront-bounded-repair-planning.json',
  'schemas/calinium-architecture-selection.schema.json',
  'schemas/calinium-architecture-selection-outcome.schema.json',
  'schemas/calinium-merchant-generation-flow.schema.json',
  'docs/architecture/calinium-core-2-phase-e5-controlled-staging-acceptance.md'
];

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function statusPaths() {
  return execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, ''));
}

function assertUnchanged(relativePath) {
  const result = spawnSync('git', ['diff', '--quiet', baseline, '--', relativePath], { cwd: root });
  assert.equal(result.status, 0, `Frozen Core 2.0 path changed: ${relativePath}`);
}

function sanitizedEnvironment() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/OPENAI|SHOPIFY.*(?:TOKEN|SECRET|PASSWORD)|THEME_KIT|FLY_(?:API|ACCESS)_TOKEN/i.test(key)) delete env[key];
  }
  return env;
}

function run() {
  assert.equal(git('rev-parse', baseline), '2000000000000000000000000000000000000004', 'Controlled-staging GO tag moved.');
  assert.equal(git('rev-parse', 'HEAD'), '2000000000000000000000000000000000000004', 'F1-A must remain an uncheckpointed candidate on the GO baseline.');
  assert.equal(git('branch', '--show-current'), 'main');

  for (const file of requiredFiles) assert.ok(fs.existsSync(path.join(root, file)), `Missing F1-A file ${file}`);
  const changed = statusPaths();
  assert.ok(changed.length >= requiredFiles.length, 'Expected the complete local F1-A candidate.');
  for (const file of changed) assert.ok(allowedPaths.has(file), `Out-of-scope F1-A change: ${file}`);
  for (const relativePath of frozenPaths) assertUnchanged(relativePath);

  const schemaFiles = requiredFiles.filter((file) => file.startsWith('schemas/'));
  for (const file of schemaFiles) JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/analysis-first-merchant-journey.json'), 'utf8'));
  const validator = createSchemaValidator(root);
  assert.deepEqual(validator.validateFile(fixture, 'schemas/calinium-analysis-first-merchant-journey-fixture.schema.json', 'F1-A fixture'), []);
  const capability = loadCapability(root);
  assert.equal(capability.analysis_first_merchant_experience_enabled, false);

  const runtimeSources = requiredFiles.filter((file) => file.startsWith('ai/merchant-experience/'));
  const runtimeText = runtimeSources.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  assert.doesNotMatch(runtimeText, /\bfetch\s*\(|require\(['"](?:https|http|child_process|openai)['"]\)|from ['"](?:https|http|child_process|openai)['"]|@shopify\/|\bnew\s+OpenAI\b/i, 'F1-A runtime contract must not perform network/provider/Shopify operations.');

  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['test:f1-a'], 'node scripts/test-f1-a-analysis-first-merchant-experience.js');
  assert.equal(packageJson.scripts['validate:f1-a'], 'node scripts/validate-f1-a-analysis-first-merchant-experience.js');

  const test = spawnSync(process.execPath, ['scripts/test-f1-a-analysis-first-merchant-experience.js'], {
    cwd: root,
    env: sanitizedEnvironment(),
    encoding: 'utf8',
    timeout: 30000
  });
  if (test.status !== 0) throw new Error(test.stderr || test.stdout || 'F1-A tests failed.');
  assert.match(test.stdout, /39\/39 F1-A analysis-first merchant-experience tests passed\./);

  const result = {
    valid: true,
    baseline: { commit: git('rev-parse', baseline), tag: baseline },
    capability: { revision: capability.capability_revision, enabled: false, activation_scope: 'disabled' },
    contracts: {
      journey: 'analysis-first-merchant-journey-v1',
      merchant_projection: 'analysis-first-merchant-projection-v1',
      visual_briefing: 'merchant-visual-briefing-v1',
      direction_choice: 'analysis-first-direction-choice-v1',
      telemetry: 'analysis-first-merchant-telemetry-v1'
    },
    visible_stages: capability.visible_stages,
    fixtures: `${fixture.cases.length}/${fixture.cases.length}`,
    focused_tests: '39/39',
    schemas: `${schemaFiles.length}/${schemaFiles.length}`,
    core_2_frozen_paths: `${frozenPaths.length}/${frozenPaths.length}`,
    provider_calls: 0,
    shopify_calls: 0,
    shopify_writes: 0,
    theme_mutations: 0,
    deployment_started: false,
    public_activation_started: false
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (require.main === module) {
  try { run(); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { run };
