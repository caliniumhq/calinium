#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const required = [
  'fixtures/f1-i-analysis-first-projection-invalidation.json',
  'apps/dashboard/src/tests/f1-i-analysis-first-projection-invalidation.test.jsx',
  'scripts/test-f1-i-analysis-first-projection-invalidation.js',
  'scripts/validate-f1-i-analysis-first-projection-invalidation.js',
  'docs/architecture/calinium-core-2-phase-f1-i-analysis-first-projection-invalidation-after-operator-mutations.md'
];

for (const file of required) assert(fs.existsSync(path.join(root, file)), `Missing F1-I file: ${file}`);
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(packageJson.scripts['test:f1-i'], 'node scripts/test-f1-i-analysis-first-projection-invalidation.js && npm --prefix apps/dashboard test -- --run src/tests/f1-i-analysis-first-projection-invalidation.test.jsx tests/f1-h-operator-error-preservation.test.jsx src/tests/f1-f-protected-operator-controls.test.jsx');
assert.equal(packageJson.scripts['validate:f1-i'], 'node scripts/validate-f1-i-analysis-first-projection-invalidation.js');

for (const scope of ['apps/theme', 'apps/dashboard/server', 'ai', 'pipeline', 'config']) {
  const diff = execFileSync('git', ['diff', '--', scope], { cwd: root, encoding: 'utf8' });
  assert.equal(diff.trim(), '', `F1-I contains a forbidden ${scope} mutation.`);
}

const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (/OPENAI|SHOPIFY.*(?:TOKEN|SECRET|PASSWORD)|THEME_KIT|FLY_(?:API|ACCESS)_TOKEN/i.test(key)) delete env[key];
}
const result = spawnSync('npm', ['run', 'test:f1-i'], { cwd: root, env, encoding: 'utf8', timeout: 180000 });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'F1-I validation tests failed.');
assert.match(result.stdout, /16\/16 F1-I projection invalidation contract checks passed\./);
assert.match(result.stdout, /Test Files\s+3 passed \(3\)/);

process.stdout.write(result.stdout);
process.stdout.write('F1-I server-authoritative refresh, stale-response protection, diagnostic no-churn, and frozen-scope boundaries validate.\n');
