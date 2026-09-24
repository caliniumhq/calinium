#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { deployApprovedPackage } = require('../ai/deployment/deployment-service');
const { deployableFiles, configurationFingerprint } = require('../ai/deployment/utils');
const { verifyPreview } = require('../ai/preview-verification/verify-preview');
const { createReleaseCandidate, releasePlan } = require('../ai/release-manager/release-manager');
const { performRollback, rollbackPlan } = require('../ai/release-manager/rollback-manager');
const { validateReleaseHistory, validateRollbackHistory, listReleaseHistory, listRollbackHistory } = require('../ai/release-manager/release-history');
const { directoryFingerprint } = require('../ai/review-engine/utils');
const { sourceSnapshot, sameSnapshot } = require('../ai/theme-generator/utils');

const root = path.resolve(__dirname, '..');
const errors = [];
function fail(message) { errors.push(message); }
function latestSession() {
  execFileSync(process.execPath, ['scripts/test-review-session-engine.js'], { cwd: root, stdio: 'pipe' });
  const directory = path.join(root, 'output/review-sessions');
  return fs.readdirSync(directory).filter((name) => /^review-session-test-/.test(name)).map((name) => ({ path: path.join(directory, name), modified: fs.statSync(path.join(directory, name)).mtimeMs })).sort((left, right) => right.modified - left.modified)[0].path;
}
function copyConfiguration(source, destination) {
  for (const file of deployableFiles(source)) {
    const target = path.join(destination, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(source, file.path), target);
  }
}
class FakeDevelopmentThemeService {
  constructor(theme) { this.theme = theme; this.remoteSource = null; this.calls = []; }
  ensureDevelopmentTheme() { this.calls.push('ensure'); return { created: false, theme: this.theme }; }
  selectDevelopmentTheme(_auth, { themeId }) { this.calls.push('select'); if (String(themeId) !== String(this.theme.id)) return null; return this.theme; }
  pullConfiguration(_auth, { destination }) { this.calls.push('pull'); if (this.remoteSource) copyConfiguration(this.remoteSource, destination); else fs.mkdirSync(destination, { recursive: true }); }
  uploadConfiguration(_auth, { theme, source }) { this.calls.push('upload'); this.remoteSource = source; return { theme, raw: { theme } }; }
}

const sessionPath = latestSession();
const session = JSON.parse(fs.readFileSync(path.join(sessionPath, 'session.json'), 'utf8'));
const generatedWorkspace = path.resolve(root, session.generated_workspace);
const generatedBefore = directoryFingerprint(generatedWorkspace);
const runtimeBefore = sourceSnapshot(root);
const suffix = String(process.pid);
const theme = { id: `release-development-${suffix}`, name: `Calinium Release Test ${suffix}`, role: 'development', preview_url: `https://development.example/?preview_theme_id=release-development-${suffix}`, updated_at: '2026-07-20T00:00:00.000Z' };
const service = new FakeDevelopmentThemeService(theme);
const firstDeploymentId = `deployment-release-first-${suffix}`;
const secondDeploymentId = `deployment-release-second-${suffix}`;
const firstVerificationId = `preview-verification-release-first-${suffix}`;
const secondVerificationId = `preview-verification-release-second-${suffix}`;
const releaseId = `release-test-${suffix}`;
const rollbackId = `rollback-test-${suffix}`;
try {
  const first = deployApprovedPackage({ root, sessionPath, deploymentId: firstDeploymentId, deployedAt: '2026-07-20T04:00:00.000Z', reason: 'First verified development deployment.', store: 'development.example', execute: true, themeService: service });
  const firstVerification = verifyPreview({ root, deploymentPath: first.deploymentPath, verificationId: firstVerificationId, verificationAt: '2026-07-20T04:01:00.000Z' });
  if (firstVerification.report.status !== 'verified') fail('First deployment preview verification did not pass.');
  const second = deployApprovedPackage({ root, sessionPath, deploymentId: secondDeploymentId, deployedAt: '2026-07-20T04:02:00.000Z', reason: 'Second verified development deployment.', store: 'development.example', execute: true, themeService: service });
  const secondVerification = verifyPreview({ root, deploymentPath: second.deploymentPath, verificationId: secondVerificationId, verificationAt: '2026-07-20T04:03:00.000Z' });
  if (secondVerification.report.status !== 'verified') fail('Second deployment preview verification did not pass.');
  const releaseEligibility = releasePlan({ root, verificationPath: secondVerification.verificationPath });
  if (!releaseEligibility.valid) fail(`Verified deployment was not release eligible: ${releaseEligibility.errors.join('; ')}`);
  try {
    createReleaseCandidate({ root, verificationPath: secondVerification.verificationPath, releaseId: `release-no-execute-${suffix}`, releasedAt: '2026-07-20T04:04:00.000Z', releaseNotes: 'Safety gate test.', execute: false });
    fail('Release candidate was created without explicit execute permission.');
  } catch (error) {
    if (!/--execute/.test(error.message)) fail(`Release no-execute gate returned an unexpected error: ${error.message}`);
  }
  const release = createReleaseCandidate({ root, verificationPath: secondVerification.verificationPath, releaseId, releasedAt: '2026-07-20T04:05:00.000Z', releaseNotes: 'Verified development release candidate.', execute: true });
  if (release.manifest.release_status !== 'release_candidate') fail('Release candidate manifest did not have release_candidate status.');
  if (!fs.existsSync(path.join(release.releasePath, 'backups/source-repository-backup.tar.gz'))) fail('Release candidate backup was not created.');
  if (!validateReleaseHistory(root).valid || !listReleaseHistory(root).some((record) => record.release_id === releaseId)) fail('Append-only release history was not written or validated.');
  const rollbackEligibility = rollbackPlan({ root, releasePath: release.releasePath });
  if (!rollbackEligibility.valid) fail(`Release candidate was not rollback eligible: ${rollbackEligibility.errors.join('; ')}`);
  if (rollbackEligibility.restored.record.deployment_id !== firstDeploymentId) fail('Rollback did not resolve the exact previous verified deployment.');
  try {
    performRollback({ root, releasePath: release.releasePath, rollbackId: `rollback-no-execute-${suffix}`, rolledBackAt: '2026-07-20T04:06:00.000Z', rollbackReason: 'Safety gate test.', store: 'development.example', execute: false, themeService: service });
    fail('Rollback executed without explicit execute permission.');
  } catch (error) {
    if (!/--execute/.test(error.message)) fail(`Rollback no-execute gate returned an unexpected error: ${error.message}`);
  }
  const rollback = performRollback({ root, releasePath: release.releasePath, rollbackId, rolledBackAt: '2026-07-20T04:07:00.000Z', rollbackReason: 'Restore the previously verified development configuration.', store: 'development.example', execute: true, themeService: service });
  if (rollback.record.status !== 'rolled_back_to_verified_development_configuration' || !rollback.uploadValidation.valid) fail('Rollback did not restore a verified configuration.');
  if (configurationFingerprint(deployableFiles(service.remoteSource)) !== configurationFingerprint(first.package.files)) fail('Rollback remote configuration does not match the previous verified deployment package.');
  if (!fs.existsSync(path.join(rollback.rollbackPath, 'backups/source-repository-backup.tar.gz'))) fail('Rollback backup was not created.');
  if (!validateRollbackHistory(root).valid || !listRollbackHistory(root).some((record) => record.rollback_id === rollbackId)) fail('Append-only rollback history was not written or validated.');
  try {
    performRollback({ root, releasePath: release.releasePath, rollbackId, rolledBackAt: '2026-07-20T04:08:00.000Z', rollbackReason: 'Duplicate ID test.', store: 'development.example', execute: true, themeService: service });
    fail('Rollback overwrote an existing rollback record.');
  } catch (error) {
    if (!/already exists/.test(error.message)) fail(`Duplicate rollback was rejected for an unexpected reason: ${error.message}`);
  }
  if (service.calls.includes('publish')) fail('Release and rollback manager attempted to publish a theme.');
  if (directoryFingerprint(generatedWorkspace) !== generatedBefore) fail('Release and rollback manager modified the generated workspace.');
  if (!sameSnapshot(runtimeBefore, sourceSnapshot(root))) fail('Release and rollback manager modified Shopify runtime files.');
} catch (error) {
  fail(`Release Manager test failed: ${error.message}`);
}
if (errors.length) { console.error(`Release Manager tests failed:\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`Release Manager tests passed: verified release eligibility, candidate manifest/history, rollback eligibility, configuration restoration, checksums, append-only records, execute gates, and source preservation (${releaseId}, ${rollbackId}).`);
