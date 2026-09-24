#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

function sanitizedEnvironment() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/OPENAI|SHOPIFY.*(?:TOKEN|SECRET|PASSWORD)|THEME_KIT|FLY_(?:API|ACCESS)_TOKEN/i.test(key)) delete env[key];
  }
  return env;
}

function run() {
  const result = spawnSync('npm', [
    '--prefix', 'apps/dashboard', 'test', '--', '--run',
    'tests/analysis-first-merchant-experience-service.test.js',
    'tests/analysis-first-merchant-experience-api.test.js',
    'src/tests/analysis-first-merchant-experience.test.jsx'
  ], {
    cwd: root,
    env: sanitizedEnvironment(),
    encoding: 'utf8',
    timeout: 60000
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'F1-B focused tests failed.');
  assert.match(result.stdout, /Test Files\s+3 passed \(3\)/, 'Expected all three F1-B focused test files to pass.');
  assert.match(result.stdout, /Tests\s+40 passed \(40\)/, 'Expected all 40 F1-B focused tests to pass.');
  process.stdout.write(result.stdout);
  process.stdout.write('40/40 F1-B embedded three-stage merchant-experience tests passed.\n');
  return { valid: true, focused_tests: '40/40', external_calls: 0, shopify_writes: 0 };
}

if (require.main === module) {
  try { run(); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { run };
