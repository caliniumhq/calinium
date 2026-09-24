#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github/workflows/public-validation.yml');

function trackedAndUntrackedFiles(patterns) {
  const output = execFileSync('git', [
    'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...patterns
  ], { cwd: root });
  return output.toString('utf8').split('\0').filter(Boolean).sort();
}

function validateJson(files) {
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const normalized = file === 'apps/theme/config/settings_data.json'
      ? source.replace(/^\/\*[\s\S]*?\*\/\s*/, '')
      : source;
    try { JSON.parse(normalized); }
    catch (error) { throw new Error(`${file} failed JSON validation: ${error.message}`); }
  }
}

function validateJavaScript(files) {
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], {
      cwd: root,
      encoding: 'utf8',
      env: process.env
    });
    if (result.status !== 0) {
      throw new Error(`${file} failed JavaScript syntax validation: ${(result.stderr || result.stdout).trim()}`);
    }
  }
}

function validateWorkflowBoundary() {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  for (const required of [
    'pull_request:',
    'push:',
    'branches: [main]',
    'contents: read',
    'node-version: 20',
    'npm ci --ignore-scripts',
    'npm --prefix apps/dashboard ci --ignore-scripts',
    'npm run validate:public'
  ]) assert.ok(workflow.includes(required), `Public workflow is missing ${required}.`);
  for (const forbidden of [
    'pull_request_target',
    'secrets.',
    'permissions: write',
    'contents: write',
    'deploy',
    'shopify auth',
    'flyctl',
    'OPENAI_API_KEY'
  ]) assert.equal(workflow.includes(forbidden), false, `Public workflow contains forbidden capability ${forbidden}.`);
}

function validatePackageBoundary() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['validate:public-source'], 'node scripts/validate-public-source.js');
  const command = packageJson.scripts['validate:public'];
  for (const required of [
    'test:core-2-architecture',
    'validate:core-2-architecture',
    'test:merchant-generation-flow',
    'validate:merchant-generation-flow',
    'test:f1-a',
    'test:storefront-render',
    'validate:storefront-render',
    'test:beta-dashboard',
    'apps/dashboard run build'
  ]) assert.ok(command.includes(required), `validate:public is missing ${required}.`);
  for (const forbidden of ['capture:', 'deploy', 'accept:', 'evaluate:', 'shopify', 'fly']) {
    assert.equal(command.includes(forbidden), false, `validate:public contains operational command ${forbidden}.`);
  }
}

function run() {
  const jsonFiles = trackedAndUntrackedFiles(['*.json', '**/*.json']);
  const javascriptFiles = trackedAndUntrackedFiles(['*.js', '*.cjs', '*.mjs', '**/*.js', '**/*.cjs', '**/*.mjs']);
  assert.ok(jsonFiles.length > 0, 'Public source validation found no JSON files.');
  assert.ok(javascriptFiles.length > 0, 'Public source validation found no JavaScript files.');
  validateJson(jsonFiles);
  validateJavaScript(javascriptFiles);
  validateWorkflowBoundary();
  validatePackageBoundary();
  process.stdout.write(`Public source validation passed: JSON=${jsonFiles.length}; JavaScript syntax=${javascriptFiles.length}; workflow=credential-free; operational commands=0.\n`);
}

if (require.main === module) run();

module.exports = { trackedAndUntrackedFiles, validateJson, validateJavaScript, validateWorkflowBoundary, validatePackageBoundary, run };
