#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { deploymentPlan, deployApprovedPackage } = require('../ai/deployment/deployment-service');
const { listDeploymentHistory } = require('../ai/deployment/deployment-history');
const { deployableFiles, configurationFingerprint } = require('../ai/deployment/utils');
const { directoryFingerprint } = require('../ai/review-engine/utils');
const { ThemeService } = require('../ai/deployment/theme-service');
const { repositoryPaths } = require('./lib/repository-paths');

const root = path.resolve(__dirname, '..');
const paths = repositoryPaths(root);
const errors = [];
function fail(message) { errors.push(message); }
function latestSession() {
  execFileSync(process.execPath, ['scripts/test-review-session-engine.js'], { cwd: root, stdio: 'pipe' });
  const parent = path.join(root, 'output/review-sessions');
  return fs.readdirSync(parent).filter((name) => /^review-session-test-/.test(name)).map((name) => ({ path: path.join(parent, name), modified: fs.statSync(path.join(parent, name)).mtimeMs })).sort((left, right) => right.modified - left.modified)[0].path;
}
function copyConfiguration(source, destination) {
  for (const file of deployableFiles(source)) {
    const target = path.join(destination, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(source, file.path), target);
  }
}
class FakeThemeService {
  constructor() { this.remoteSource = null; this.calls = []; }
  ensureDevelopmentTheme(_auth, _options) { this.calls.push('ensure'); return { created: false, theme: { id: 'development-100', name: 'Calinium Development Test', role: 'development', preview_url: 'https://development.example/?preview_theme_id=development-100', updated_at: '2026-07-20T00:00:00.000Z' } }; }
  pullConfiguration(_auth, { destination }) { this.calls.push('pull'); if (this.remoteSource) copyConfiguration(this.remoteSource, destination); else fs.mkdirSync(destination, { recursive: true }); }
  uploadConfiguration(_auth, { theme, source }) { this.calls.push('upload'); this.remoteSource = source; return { theme, raw: { theme } }; }
}

const sessionPath = latestSession();
const session = JSON.parse(fs.readFileSync(path.join(sessionPath, 'session.json'), 'utf8'));
const generatedWorkspace = path.resolve(root, session.generated_workspace);
const before = directoryFingerprint(generatedWorkspace);
const deploymentId = `deployment-test-${process.pid}`;
try {
  const creationCalls = [];
  const creationService = new ThemeService({ root, runner: (_command, args) => {
    creationCalls.push(args);
    if (args[1] === 'list') return { status: 0, stdout: '[]', stderr: '' };
    return { status: 0, stdout: JSON.stringify({ theme: { id: 'development-created-100', name: 'Calinium Development Theme', role: 'unpublished', preview_url: 'https://development.example/?preview_theme_id=development-created-100' } }), stderr: '' };
  } });
  const provisioned = creationService.ensureDevelopmentTheme({ store: 'development.example', environment: null }, { allowCreate: true, baselineThemePath: paths.themeRoot });
  if (!provisioned.created || provisioned.theme.role !== 'unpublished') fail('Adapter did not safely create an unpublished development target when none existed.');
  if (!creationCalls.flat().includes('--unpublished') || creationCalls.flat().includes('--allow-live')) fail('Development-theme creation used an unsafe Shopify CLI flag.');
  let tokenWasScoped = false;
  const tokenService = new ThemeService({ root, runner: (_command, _args, options) => {
    tokenWasScoped = options.env.SHOPIFY_CLI_THEME_TOKEN === 'test-theme-token';
    return { status: 0, stdout: '[]', stderr: '' };
  } });
  tokenService.listThemes({ store: 'development.example', environment: null, token: 'test-theme-token' });
  if (!tokenWasScoped) fail('Theme access token was not scoped to the Shopify CLI child environment.');
  const publishedService = new ThemeService({ root, runner: () => ({ status: 0, stdout: JSON.stringify([{ id: '1001', name: 'Live', role: 'main' }]), stderr: '' }) });
  try {
    publishedService.selectDevelopmentTheme({ store: 'development.example', environment: null }, { themeId: '1001' });
    fail('Published theme was accepted as a deployment target.');
  } catch (error) {
    if (!/unpublished or development/.test(error.message)) fail(`Published target was rejected for an unexpected reason: ${error.message}`);
  }
  const plan = deploymentPlan({ root, sessionPath });
  if (!plan.valid) fail(`Approved deployment plan is invalid: ${plan.errors.join('; ')}`);
  try {
    deployApprovedPackage({ root, sessionPath, deploymentId: `deployment-no-execute-${process.pid}`, deployedAt: '2026-07-20T02:00:00.000Z', reason: 'Safety-gate test', store: 'development.example', execute: false, themeService: new FakeThemeService() });
    fail('Deployment ran without explicit execute permission.');
  } catch (error) {
    if (!/--execute/.test(error.message)) fail(`No-execute deployment was rejected for an unexpected reason: ${error.message}`);
  }
  const service = new FakeThemeService();
  const result = deployApprovedPackage({ root, sessionPath, deploymentId, deployedAt: '2026-07-20T02:10:00.000Z', reason: 'Approved package deployment adapter integration test.', store: 'development.example', execute: true, themeService: service });
  if (!result.validation.valid || result.record.status !== 'deployed_to_development_theme') fail('Deployment result is not valid.');
  if (result.record.target.role !== 'development') fail('Deployment did not target a development theme.');
  if (service.calls.includes('publish')) fail('Deployment service attempted to publish a theme.');
  if (!fs.existsSync(path.join(result.deploymentPath, 'reports/preview-report.json'))) fail('Preview report was not created.');
  if (!fs.existsSync(path.join(result.deploymentPath, 'reports/rollback-metadata.json'))) fail('Rollback metadata was not created.');
  if (!fs.existsSync(path.join(result.deploymentPath, 'backups/source-repository-backup.tar.gz'))) fail('Pre-deployment repository backup was not created.');
  const uploaded = deployableFiles(path.join(result.deploymentPath, 'verification/uploaded-configuration'));
  if (JSON.stringify(uploaded) !== JSON.stringify(result.package.files)) fail('Upload verification checksums do not match the approved package.');
  if (uploaded.some((file) => !/^(templates\/.+\.json|config\/settings_data\.json)$/.test(file.path))) fail('Deployment uploaded a prohibited runtime file.');
  if (!service.remoteSource.startsWith(path.join(result.deploymentPath, 'staging'))) fail('Configuration upload did not use an isolated staging workspace.');
  if (!fs.existsSync(path.join(service.remoteSource, 'layout'))) fail('Staging workspace did not retain the immutable runtime shape required by Shopify CLI.');
  const history = listDeploymentHistory(root);
  if (!history.some((entry) => entry.deployment_id === deploymentId)) fail('Append-only deployment history is missing the deployment record.');
  const rollback = JSON.parse(fs.readFileSync(path.join(result.deploymentPath, 'reports/rollback-metadata.json'), 'utf8'));
  if (rollback.rollback_implemented !== false) fail('Rollback was implemented instead of merely prepared.');
  if (directoryFingerprint(generatedWorkspace) !== before) fail('Deployment adapter modified the generated workspace.');
  try {
    deployApprovedPackage({ root, sessionPath, deploymentId, deployedAt: '2026-07-20T02:20:00.000Z', reason: 'Duplicate ID test', store: 'development.example', execute: true, themeService: new FakeThemeService() });
    fail('Deployment adapter overwrote an existing deployment record.');
  } catch (error) {
    if (!/already exists/.test(error.message)) fail(`Duplicate deployment was rejected for an unexpected reason: ${error.message}`);
  }
} catch (error) {
  fail(`Deployment adapter test failed: ${error.message}`);
}
if (errors.length) { console.error(`Deployment Adapter tests failed:\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`Deployment Adapter tests passed: approved-package gate, development-theme targeting, configuration-only upload, checksum verification, preview report, append-only history, rollback preparation, and generated-workspace preservation (${deploymentId}).`);
