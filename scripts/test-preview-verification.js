#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { validatePreviewVerification, verifyPreview } = require('../ai/preview-verification/verify-preview');
const { verifyFiles } = require('../ai/preview-verification/verify-files');
const { verifyThemeIdentity } = require('../ai/preview-verification/verify-theme');
const { listVerificationHistory, validateVerificationHistory } = require('../ai/preview-verification/verify-history');
const { transition } = require('../ai/preview-verification/utils');
const { deployableFiles } = require('../ai/deployment/utils');
const { directoryFingerprint } = require('../ai/review-engine/utils');
const { sourceSnapshot, sameSnapshot } = require('../ai/theme-generator/utils');

const root = path.resolve(__dirname, '..');
const errors = [];
function fail(message) { errors.push(message); }
function latestDeployment() {
  execFileSync(process.execPath, ['scripts/test-deployment-adapter.js'], { cwd: root, stdio: 'pipe' });
  const directory = path.join(root, 'output/deployments');
  return fs.readdirSync(directory).filter((name) => /^deployment-test-/.test(name)).map((name) => ({ path: path.join(directory, name), modified: fs.statSync(path.join(directory, name)).mtimeMs })).sort((left, right) => right.modified - left.modified)[0].path;
}
function copyConfiguration(source, destination) {
  for (const file of deployableFiles(source)) {
    const target = path.join(destination, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(source, file.path), target);
  }
}

const deploymentPath = latestDeployment();
const packageData = JSON.parse(fs.readFileSync(path.join(deploymentPath, 'manifests/deployment-package.json'), 'utf8'));
const deploymentRecord = JSON.parse(fs.readFileSync(path.join(deploymentPath, 'reports/deployment-report.json'), 'utf8'));
const generatedWorkspace = path.resolve(root, packageData.generated_workspace);
const generatedBefore = directoryFingerprint(generatedWorkspace);
const runtimeBefore = sourceSnapshot(root);
const localId = `preview-verification-test-${process.pid}`;
const remoteId = `preview-verification-remote-test-${process.pid}`;
try {
  const validation = validatePreviewVerification({ root, deploymentPath });
  if (!validation.valid) fail(`Valid deployment did not pass read-only preview validation: ${validation.errors.join('; ')}`);
  const local = verifyPreview({ root, deploymentPath, verificationId: localId, verificationAt: '2026-07-20T03:00:00.000Z' });
  if (local.report.status !== 'verified' || local.report.verification_source !== 'deployment_snapshot') fail('Snapshot verification did not produce a verified report.');
  if (!fs.existsSync(path.join(local.verificationPath, 'reports/preview-verification.json'))) fail('Verification JSON report was not created.');
  if (!fs.existsSync(path.join(local.verificationPath, 'reports/preview-verification.md'))) fail('Verification Markdown report was not created.');
  if (!listVerificationHistory(root).some((entry) => entry.verification_id === localId)) fail('Append-only verification history is missing the report.');
  if (!validateVerificationHistory(root).valid) fail('Verification history schema integrity failed after appending a report.');
  try {
    verifyPreview({ root, deploymentPath, verificationId: localId, verificationAt: '2026-07-20T03:01:00.000Z' });
    fail('Verification engine overwrote an existing verification ID.');
  } catch (error) {
    if (!/already exists/.test(error.message)) fail(`Duplicate verification was rejected for an unexpected reason: ${error.message}`);
  }
  const remoteService = {
    selectDevelopmentTheme(_auth, { themeId }) { return { id: themeId, name: deploymentRecord.target.theme_name, role: deploymentRecord.target.role, preview_url: deploymentRecord.preview.url }; },
    pullConfiguration(_auth, { destination }) { copyConfiguration(path.join(deploymentPath, 'verification/uploaded-configuration'), destination); }
  };
  const remote = verifyPreview({ root, deploymentPath, verificationId: remoteId, verificationAt: '2026-07-20T03:02:00.000Z', store: deploymentRecord.target.store, themeService: remoteService });
  if (remote.report.status !== 'verified' || remote.report.verification_source !== 'fresh_remote_pull') fail('Read-only fresh remote verification did not produce a verified report.');
  if (!remote.report.verified_theme.some((item) => item.id === 'theme:remote-identity' && item.result === 'passed')) fail('Read-only remote theme identity was not verified.');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-preview-verification-'));
  copyConfiguration(path.join(deploymentPath, 'verification/uploaded-configuration'), temporary);
  fs.appendFileSync(path.join(temporary, packageData.files[0].path), '\n');
  const mismatch = verifyFiles({ packageData, snapshotDirectory: temporary, origin: local.analysis.deployment.origin });
  if (mismatch.valid || !mismatch.results.some((item) => item.result === 'failed' && /Re-upload/.test(item.remediation))) fail('Checksum mismatch did not produce an actionable file verification failure.');
  const missingDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-preview-verification-missing-'));
  for (const file of deployableFiles(path.join(deploymentPath, 'verification/uploaded-configuration')).slice(1)) {
    const target = path.join(missingDirectory, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(deploymentPath, 'verification/uploaded-configuration', file.path), target);
  }
  const missing = verifyFiles({ packageData, snapshotDirectory: missingDirectory, origin: local.analysis.deployment.origin });
  if (missing.valid || !missing.results.some((item) => item.actual === null)) fail('Missing approved file was not detected.');
  const unexpectedDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-preview-verification-unexpected-'));
  copyConfiguration(path.join(deploymentPath, 'verification/uploaded-configuration'), unexpectedDirectory);
  fs.mkdirSync(path.join(unexpectedDirectory, 'templates'), { recursive: true });
  fs.writeFileSync(path.join(unexpectedDirectory, 'templates/unexpected.json'), '{}\n');
  const unexpected = verifyFiles({ packageData, snapshotDirectory: unexpectedDirectory, origin: local.analysis.deployment.origin });
  if (unexpected.valid || !unexpected.results.some((item) => item.id === 'file:allowlist' && item.result === 'failed')) fail('Unexpected configuration file was not detected.');
  const unsafeTheme = verifyThemeIdentity({ deploymentRecord: { ...deploymentRecord, target: { ...deploymentRecord.target, role: 'main' } }, previewReport: local.analysis.deployment.previewReport, origin: local.analysis.deployment.origin });
  if (unsafeTheme.valid) fail('Published theme identity was accepted for preview verification.');
  try {
    transition('pending', 'verified');
    fail('Illegal preview verification state transition was accepted.');
  } catch (error) {
    if (!/Illegal/.test(error.message)) fail(`Illegal transition was rejected for an unexpected reason: ${error.message}`);
  }
  if (directoryFingerprint(generatedWorkspace) !== generatedBefore) fail('Preview verification modified the generated workspace.');
  if (!sameSnapshot(runtimeBefore, sourceSnapshot(root))) fail('Preview verification modified Shopify runtime files.');
} catch (error) {
  fail(`Preview verification test failed: ${error.message}`);
}
if (errors.length) { console.error(`Preview Verification tests failed:\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`Preview Verification tests passed: deployment integrity, preview/theme identity, configuration checksums, templates, settings, sections, state machine, append-only history, and source preservation (${localId}, ${remoteId}).`);
