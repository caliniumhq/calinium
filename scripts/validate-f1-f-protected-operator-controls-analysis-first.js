#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const required = [
  'fixtures/f1-f-protected-operator-controls-analysis-first.json',
  'apps/dashboard/src/components/creative-director/ProtectedOperatorDiagnosticsHost.jsx',
  'apps/dashboard/src/tests/f1-f-protected-operator-controls.test.jsx',
  'scripts/test-f1-f-protected-operator-controls-analysis-first.js',
  'scripts/validate-f1-f-protected-operator-controls-analysis-first.js',
  'docs/architecture/calinium-core-2-phase-f1-f-protected-operator-controls-analysis-first-experience.md'
];

for (const file of required) assert(fs.existsSync(path.join(root, file)), `Missing F1-F file: ${file}`);
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(packageJson.scripts['test:f1-f'], 'node scripts/test-f1-f-protected-operator-controls-analysis-first.js && npm --prefix apps/dashboard test -- --run src/tests/f1-f-protected-operator-controls.test.jsx tests/e5r-h-operator-readiness.test.js src/tests/dashboard-api-client.test.js');
assert.equal(packageJson.scripts['validate:f1-f'], 'node scripts/validate-f1-f-protected-operator-controls-analysis-first.js');

const forbiddenScopes = ['apps/theme', 'apps/dashboard/server', 'ai', 'pipeline'];
for (const scope of forbiddenScopes) {
  const diff = execFileSync('git', ['diff', '--', scope], { cwd: root, encoding: 'utf8' });
  assert.equal(diff.trim(), '', `F1-F contains a forbidden ${scope} mutation.`);
}

const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (/OPENAI|SHOPIFY.*(?:TOKEN|SECRET|PASSWORD)|THEME_KIT|FLY_(?:API|ACCESS)_TOKEN/i.test(key)) delete env[key];
}
const result = spawnSync('npm', ['run', 'test:f1-f'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'F1-F validation tests failed.');
assert.match(result.stdout, /16\/16 F1-F protected operator-host contract checks passed\./);
assert.match(result.stdout, /Test Files\s+3 passed \(3\)/);

process.stdout.write(result.stdout);
process.stdout.write('F1-F shared authorized operator reachability, merchant exclusion, auth reuse, responsive containment, and frozen-scope boundaries validate.\n');
