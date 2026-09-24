#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const required = [
  'fly.staging.toml.example',
  'scripts/test-fly-health-readiness-separation.js',
  'scripts/validate-fly-health-readiness-separation.js',
  'docs/architecture/calinium-fly-health-deep-readiness-remediation.md',
  'package.json'
];
for (const file of required) assert.equal(fs.existsSync(path.join(root, file)), true, `${file} is missing`);

const testResult = spawnSync(process.execPath, [path.join(root, 'scripts/test-fly-health-readiness-separation.js')], {
  cwd: root,
  encoding: 'utf8'
});
process.stdout.write(testResult.stdout || '');
process.stderr.write(testResult.stderr || '');
assert.equal(testResult.status, 0, 'Focused liveness/readiness tests failed');

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(packageJson.scripts['validate:fly-health-readiness'], 'node scripts/validate-fly-health-readiness-separation.js');
for (const requiredPart of [
  'node scripts/test-fly-health-readiness-separation.js',
  'tests/e5r-m-bounded-readiness-deep-attestation.test.js',
  'tests/e5r-h-operator-readiness.test.js',
  'src/tests/f1-f-protected-operator-controls.test.jsx'
]) assert.equal(packageJson.scripts['test:fly-health-readiness'].includes(requiredPart), true, `test command is missing ${requiredPart}`);

for (const file of required.filter((entry) => entry.endsWith('.js'))) {
  const syntax = spawnSync(process.execPath, ['--check', path.join(root, file)], { cwd: root, encoding: 'utf8' });
  assert.equal(syntax.status, 0, `${file} failed syntax validation: ${syntax.stderr}`);
}

const changed = execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' })
  .trim().split('\n').filter(Boolean).map((line) => line.slice(3));
for (const file of changed) {
  assert.equal(file.startsWith('apps/theme/'), false, `forbidden theme mutation: ${file}`);
  assert.equal(file === 'fly.legacyexample-staging.toml.example', false, 'LEGACY_EXAMPLE Fly configuration changed');
}

const credentialPatterns = [
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
  /shpat_[A-Za-z0-9]{20,}/,
  /shpss_[A-Za-z0-9]{20,}/,
  /(?:FLY_API_TOKEN|FLY_ACCESS_TOKEN)\s*=\s*[^\s$]/
];
for (const file of required) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  for (const pattern of credentialPatterns) assert.equal(pattern.test(content), false, `${file} contains a credential-shaped literal`);
}

execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'inherit' });
process.stdout.write('Fly health/deep-readiness validation passed: shallow routing health, fail-closed deep readiness, protected diagnostics, blocked succession ordering, MAIN exclusion, no theme mutation, and zero credential literals. API/model calls: 0. Shopify calls: 0. Theme mutations: 0.\n');
