'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { verifyDeployment } = require('../preview-verification/verify-deployment');
const { assertDeploymentPath } = require('../preview-verification/utils');
const { loadVerifiedPreview, validateReleaseEligibility } = require('./release-validator');
const { validateReleaseHistory, listReleaseHistory } = require('./release-history');
const { listDeploymentHistory } = require('../deployment/deployment-history');
const { validatePackageFiles } = require('../deployment/deployment-validator');
const { validateVerificationHistory, listVerificationHistory } = require('../preview-verification/verify-history');
const { assertReleasePath, assertVerificationPath, readRequiredJson, same, relative, fileHash, deployableFiles, configurationFingerprint } = require('./utils');

function loadRelease({ root, releasePath }) {
  const resolved = assertReleasePath(root, releasePath);
  const manifestPath = path.join(resolved, 'manifests/release-manifest.json');
  const errors = [];
  let manifest = null;
  try { manifest = readRequiredJson(manifestPath, 'Release manifest'); } catch (error) { return { valid: false, errors: [error.message], warnings: [] }; }
  errors.push(...createSchemaValidator(root).validateFile(manifest, 'schemas/calinium-release-manifest.schema.json', 'release_manifest'));
  const historyValidation = validateReleaseHistory(root);
  errors.push(...historyValidation.errors);
  const history = listReleaseHistory(root).find((item) => item.release_id === manifest.release_id);
  if (!history) errors.push('Release manifest has no append-only release-history event.');
  else if (!same(manifest, history)) errors.push('Release manifest does not match its append-only release-history event.');
  if (manifest.release_status !== 'release_candidate' || !manifest.validation.valid) errors.push('Release is not a valid release candidate.');
  return { valid: errors.length === 0, errors, warnings: manifest.validation?.warnings || [], manifest, manifestPath, releasePath: resolved, history };
}

function packageForDeployment(root, deploymentId) {
  const deploymentPath = assertDeploymentPath(root, path.join('output/deployments', deploymentId));
  const packagePath = path.join(deploymentPath, 'manifests/deployment-package.json');
  const packageData = readRequiredJson(packagePath, 'Previous deployment package');
  const errors = createSchemaValidator(root).validateFile(packageData, 'schemas/calinium-deployment-package.schema.json', 'previous_deployment_package');
  if (errors.length) throw new Error(`Previous deployment package is invalid: ${errors.join(' ')}`);
  return { deploymentPath, packagePath, packageData };
}

function validateRollbackEligibility({ root, releasePath }) {
  const release = loadRelease({ root, releasePath });
  if (!release.valid) return { valid: false, errors: release.errors, warnings: release.warnings, release };
  const errors = [];
  let verificationPath;
  try {
    verificationPath = assertVerificationPath(root, path.dirname(path.dirname(release.manifest.preview_verification.path)));
  } catch (error) { errors.push(`Release preview verification reference is invalid: ${error.message}`); }
  const releaseEligibility = verificationPath ? validateReleaseEligibility({ root, verificationPath }) : { valid: false, errors: ['Release preview verification is unavailable.'] };
  if (!releaseEligibility.valid) errors.push(...releaseEligibility.errors.map((error) => `Release eligibility revalidation failed: ${error}`));
  let sourceDeployment = null;
  if (releaseEligibility.deployment?.ready) sourceDeployment = releaseEligibility.deployment;
  else {
    try { sourceDeployment = verifyDeployment({ root, deploymentPath: path.join('output/deployments', release.manifest.deployment_id) }); } catch (error) { errors.push(error.message); }
  }
  if (!sourceDeployment?.ready) errors.push(...(sourceDeployment?.errors || ['Source deployment is unreadable.']));
  if (sourceDeployment?.ready && sourceDeployment.deploymentRecord.deployment_id !== release.manifest.deployment_id) errors.push('Release manifest deployment ID does not match source deployment.');
  let rollbackMetadata = null;
  let rollbackMetadataPath = null;
  let snapshotDirectory = null;
  let snapshotFiles = [];
  if (sourceDeployment?.ready) {
    rollbackMetadataPath = path.join(sourceDeployment.deploymentPath, 'reports/rollback-metadata.json');
    snapshotDirectory = path.join(sourceDeployment.deploymentPath, 'rollback/previous-configuration');
    try {
      rollbackMetadata = readRequiredJson(rollbackMetadataPath, 'Rollback preparation metadata');
      errors.push(...createSchemaValidator(root).validateFile(rollbackMetadata, 'schemas/calinium-rollback-metadata.schema.json', 'rollback_metadata'));
      snapshotFiles = deployableFiles(snapshotDirectory);
      const snapshotChecksum = configurationFingerprint(snapshotFiles);
      if (snapshotChecksum !== rollbackMetadata.previous_configuration_checksum) errors.push('Rollback configuration snapshot checksum does not match immutable rollback metadata.');
      if (String(rollbackMetadata.development_theme_id) !== String(sourceDeployment.deploymentRecord.target.theme_id)) errors.push('Rollback metadata development theme does not match source deployment target.');
      if (!snapshotFiles.length) errors.push('Rollback configuration snapshot is empty.');
    } catch (error) { errors.push(error.message); }
  }
  let restored = null;
  let previousVerification = null;
  if (sourceDeployment?.ready && rollbackMetadata && snapshotFiles.length) {
    const matches = [];
    for (const record of listDeploymentHistory(root)) {
      if (record.deployment_id === sourceDeployment.deploymentRecord.deployment_id || String(record.target?.theme_id) !== String(sourceDeployment.deploymentRecord.target.theme_id)) continue;
      try {
        const candidate = packageForDeployment(root, record.deployment_id);
        if (configurationFingerprint(candidate.packageData.files) === rollbackMetadata.previous_configuration_checksum) matches.push({ record, ...candidate });
      } catch (error) { errors.push(`Previous deployment ${record.deployment_id} cannot be evaluated: ${error.message}`); }
    }
    if (matches.length !== 1) errors.push(matches.length === 0 ? 'No previous deployment matches the rollback snapshot checksum.' : 'Rollback snapshot matches multiple previous deployments; rollback target is ambiguous.');
    else {
      restored = matches[0];
      const fileValidation = validatePackageFiles(restored.packageData, snapshotDirectory);
      if (!fileValidation.valid) errors.push(...fileValidation.errors.map((error) => `Rollback snapshot integrity failed: ${error}`));
      const verificationHistory = validateVerificationHistory(root);
      errors.push(...verificationHistory.errors);
      const record = listVerificationHistory(root).find((item) => item.status === 'verified' && item.deployment.deployment_id === restored.record.deployment_id);
      if (!record) errors.push('Previous deployment has no terminal verified preview report.');
      else {
        const pathToVerification = path.join('output/preview-verifications', record.verification_id);
        const verified = loadVerifiedPreview({ root, verificationPath: pathToVerification });
        if (!verified.valid) errors.push(...verified.errors.map((error) => `Previous preview verification is invalid: ${error}`));
        else previousVerification = { report: record, path: pathToVerification, file: path.join(root, pathToVerification, 'reports/preview-verification.json') };
      }
      if (String(restored.record.target.theme_id) !== String(sourceDeployment.deploymentRecord.target.theme_id)) errors.push('Previous deployment target does not match the source development theme.');
    }
  }
  if (sourceDeployment?.ready && !['development', 'unpublished'].includes(sourceDeployment.deploymentRecord.target.role)) errors.push('Rollback target is not an unpublished/development theme.');
  return {
    valid: errors.length === 0,
    errors,
    warnings: release.warnings,
    release,
    sourceDeployment,
    rollbackMetadata,
    rollbackMetadataPath,
    snapshotDirectory,
    snapshotFiles,
    restored,
    previousVerification
  };
}

module.exports = { loadRelease, packageForDeployment, validateRollbackEligibility };
