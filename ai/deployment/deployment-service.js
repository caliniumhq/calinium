'use strict';

const fs = require('fs');
const path = require('path');
const { ThemeService } = require('./theme-service');
const { resolveShopifyAuth } = require('./shopify-auth');
const { validateApprovedDeploymentPackage, validatePackageFiles } = require('./deployment-validator');
const { buildPreviewReport, previewMarkdown } = require('./preview-service');
const { prepareRollbackMetadata } = require('./rollback-service');
const { appendDeploymentHistory } = require('./deployment-history');
const { buildDeploymentRecord, deploymentMarkdown } = require('./deployment-report');
const { assertDeploymentPath, createRepositoryBackup, writeNewJson, writeNewText, deployableFiles } = require('./utils');
const { sourceSnapshot, sameSnapshot } = require('../theme-generator/utils');
const { repositoryPaths } = require('../../scripts/lib/repository-paths');

const RUNTIME_DIRECTORIES = ['assets', 'blocks', 'layout', 'locales', 'sections', 'snippets'];

function prepareUploadStaging({ root, deploymentPath, generatedThemeDirectory, files }) {
  const stagingDirectory = path.join(deploymentPath, 'staging/theme');
  const { themeRoot } = repositoryPaths(root);
  // Shopify CLI validates a theme directory before it applies --only. This isolated
  // transport copy supplies the immutable runtime shape; the upload allowlist below
  // still limits the remote mutation to approved JSON configuration files.
  for (const directory of RUNTIME_DIRECTORIES) {
    const source = path.join(themeRoot, directory);
    if (fs.existsSync(source)) fs.cpSync(source, path.join(stagingDirectory, directory), { recursive: true, force: false });
  }
  const settingsSchema = path.join(themeRoot, 'config/settings_schema.json');
  if (fs.existsSync(settingsSchema)) {
    const target = path.join(stagingDirectory, 'config/settings_schema.json');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(settingsSchema, target, fs.constants.COPYFILE_EXCL);
  }
  for (const file of files) {
    const source = path.join(generatedThemeDirectory, file.path);
    const target = path.join(stagingDirectory, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  }
  return stagingDirectory;
}

function deploymentPlan({ root, sessionPath }) {
  return validateApprovedDeploymentPackage({ root, sessionPath });
}

function deployApprovedPackage({ root, sessionPath, deploymentId, deployedAt, reason, store, environment = null, token = null, themeId = null, allowCreate = false, baselineThemePath = null, execute = false, themeService = null }) {
  const packageValidation = deploymentPlan({ root, sessionPath });
  if (!packageValidation.valid) throw new Error(`Deployment package validation failed: ${packageValidation.errors.join(' ')}`);
  if (!execute) throw new Error('Deployment is intentionally disabled until --execute is explicitly supplied.');
  if (!deployedAt || !reason) throw new Error('Deployment requires explicit deployed_at and deployment_reason values.');
  const deploymentPath = assertDeploymentPath(root, deploymentId);
  if (fs.existsSync(deploymentPath)) throw new Error(`Deployment ${deploymentId} already exists; deployment history is append-only.`);
  const runtimeBefore = sourceSnapshot(root);
  createRepositoryBackup(root, deploymentPath);
  const auth = resolveShopifyAuth({ store, environment, token });
  const service = themeService || new ThemeService({ root });
  const targetResult = service.ensureDevelopmentTheme(auth, { themeId, allowCreate, baselineThemePath });
  const target = { ...targetResult.theme, store: auth.store };
  const previousDirectory = path.join(deploymentPath, 'rollback/previous-configuration');
  service.pullConfiguration(auth, { theme: target, destination: previousDirectory });
  const previousFiles = deployableFiles(previousDirectory);
  const source = prepareUploadStaging({
    root,
    deploymentPath,
    generatedThemeDirectory: path.join(packageValidation.generated.workspace, 'theme'),
    files: packageValidation.package.files
  });
  const uploaded = service.uploadConfiguration(auth, { theme: target, source });
  const verificationDirectory = path.join(deploymentPath, 'verification/uploaded-configuration');
  service.pullConfiguration(auth, { theme: uploaded.theme, destination: verificationDirectory });
  const uploadValidation = validatePackageFiles(packageValidation.package, verificationDirectory);
  if (!uploadValidation.valid) throw new Error(`Uploaded configuration validation failed: ${uploadValidation.errors.join(' ')}`);
  const validation = { valid: true, errors: [], warnings: [...packageValidation.warnings, ...uploadValidation.warnings] };
  const preview = buildPreviewReport({ root, deploymentId, target: uploaded.theme, store: auth.store, deployedAt, files: packageValidation.package.files, validation });
  const record = buildDeploymentRecord({ root, deploymentId, deployedAt, reason, packageData: packageValidation.package, target: { ...uploaded.theme, store: auth.store }, created: targetResult.created, files: packageValidation.package.files, validation, preview });
  const history = appendDeploymentHistory({ root, record });
  const rollback = prepareRollbackMetadata({ root, deploymentId, target: uploaded.theme, packageData: packageValidation.package, historyId: history.history_id, previousFiles });
  writeNewJson(path.join(deploymentPath, 'manifests/deployment-package.json'), packageValidation.package);
  writeNewJson(path.join(deploymentPath, 'reports/deployment-report.json'), record);
  writeNewJson(path.join(deploymentPath, 'reports/deployment-history.json'), record);
  writeNewJson(path.join(deploymentPath, 'reports/preview-report.json'), preview);
  writeNewText(path.join(deploymentPath, 'reports/preview.md'), previewMarkdown(preview, uploaded.theme));
  writeNewText(path.join(deploymentPath, 'reports/deployment.md'), deploymentMarkdown(record));
  writeNewJson(path.join(deploymentPath, 'reports/rollback-metadata.json'), rollback);
  if (!sameSnapshot(runtimeBefore, sourceSnapshot(root))) throw new Error('Source theme integrity check failed during deployment.');
  return { deploymentPath, package: packageValidation.package, record, preview, rollback, history, validation, target: uploaded.theme };
}

module.exports = { deploymentPlan, prepareUploadStaging, deployApprovedPackage };
