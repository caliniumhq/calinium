'use strict';

const fs = require('fs');
const path = require('path');
const { ThemeService } = require('../deployment/theme-service');
const { resolveShopifyAuth } = require('../deployment/shopify-auth');
const { prepareUploadStaging } = require('../deployment/deployment-service');
const { validatePackageFiles } = require('../deployment/deployment-validator');
const { validateRollbackEligibility } = require('./rollback-validator');
const { buildRollbackRecord, rollbackMarkdown } = require('./rollback-report');
const { appendRollbackHistory, validateRollbackHistory } = require('./release-history');
const { assertRollbackPath, createRepositoryBackup, writeNewJson, writeNewText, deployableFiles } = require('./utils');
const { sourceSnapshot, sameSnapshot } = require('../theme-generator/utils');

function rollbackPlan({ root, releasePath }) { return validateRollbackEligibility({ root, releasePath }); }

function performRollback({ root, releasePath, rollbackId, rolledBackAt, rollbackReason, store, environment = null, token = null, execute = false, themeService = null }) {
  const eligibility = rollbackPlan({ root, releasePath });
  if (!eligibility.valid) throw new Error(`Rollback eligibility validation failed: ${eligibility.errors.join(' ')}`);
  if (!execute) throw new Error('Rollback is intentionally disabled until --execute is explicitly supplied.');
  if (!rolledBackAt || !rollbackReason) throw new Error('Rollback requires explicit rollback_timestamp and rollback_reason values.');
  const rollbackPath = assertRollbackPath(root, rollbackId);
  const historyPath = path.join(root, 'output/rollback-history/events', `${rollbackId}.json`);
  if (fs.existsSync(rollbackPath) || fs.existsSync(historyPath)) throw new Error(`Rollback ${rollbackId} already exists; rollback records and history are append-only.`);
  const historyValidation = validateRollbackHistory(root);
  if (!historyValidation.valid) throw new Error(`Rollback history integrity failed: ${historyValidation.errors.join(' ')}`);
  const runtimeBefore = sourceSnapshot(root);
  createRepositoryBackup(root, rollbackPath);
  const auth = resolveShopifyAuth({ store, environment, token });
  const service = themeService || new ThemeService({ root });
  const target = service.selectDevelopmentTheme(auth, { themeId: eligibility.sourceDeployment.deploymentRecord.target.theme_id });
  if (!target || target.name !== eligibility.sourceDeployment.deploymentRecord.target.theme_name || target.role !== eligibility.sourceDeployment.deploymentRecord.target.role) throw new Error('Current Shopify target does not match the verified source deployment development theme.');
  const scopedTarget = { ...target, store: auth.store };
  const beforeDirectory = path.join(rollbackPath, 'pre-rollback/current-configuration');
  service.pullConfiguration(auth, { theme: scopedTarget, destination: beforeDirectory });
  const staging = prepareUploadStaging({ root, deploymentPath: rollbackPath, generatedThemeDirectory: eligibility.snapshotDirectory, files: eligibility.restored.packageData.files });
  const uploaded = service.uploadConfiguration(auth, { theme: scopedTarget, source: staging });
  const verificationDirectory = path.join(rollbackPath, 'verification/restored-configuration');
  service.pullConfiguration(auth, { theme: uploaded.theme, destination: verificationDirectory });
  const uploadValidation = validatePackageFiles(eligibility.restored.packageData, verificationDirectory);
  const restoredFiles = deployableFiles(verificationDirectory);
  const record = buildRollbackRecord({
    root,
    rollbackId,
    rolledBackAt,
    rollbackReason,
    eligibility,
    restoredTheme: { ...uploaded.theme, store: auth.store },
    restoredFiles,
    validationErrors: uploadValidation.errors
  });
  writeNewJson(path.join(rollbackPath, 'manifests/rollback-record.json'), record);
  writeNewJson(path.join(rollbackPath, 'reports/rollback-metadata.json'), record);
  writeNewJson(path.join(rollbackPath, 'reports/rollback-report.json'), record);
  writeNewText(path.join(rollbackPath, 'reports/rollback.md'), rollbackMarkdown(record));
  const history = appendRollbackHistory({ root, record });
  if (!sameSnapshot(runtimeBefore, sourceSnapshot(root))) throw new Error('Source theme integrity check failed during rollback.');
  return { rollbackPath, record, history, eligibility, uploadValidation };
}

module.exports = { rollbackPlan, performRollback };
