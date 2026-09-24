'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { validatePreviewVerification } = require('../preview-verification/verify-preview');
const { validateVerificationHistory, listVerificationHistory } = require('../preview-verification/verify-history');
const { verifyDeployment } = require('../preview-verification/verify-deployment');
const { assertDeploymentPath } = require('../preview-verification/utils');
const { assertVerificationPath, readRequiredJson, same, relative, fileHash } = require('./utils');

function loadVerifiedPreview({ root, verificationPath }) {
  const resolved = assertVerificationPath(root, verificationPath);
  const reportPath = path.join(resolved, 'reports/preview-verification.json');
  const errors = [];
  let report = null;
  try { report = readRequiredJson(reportPath, 'Preview verification report'); } catch (error) { return { valid: false, errors: [error.message], warnings: [] }; }
  errors.push(...createSchemaValidator(root).validateFile(report, 'schemas/calinium-preview-verification.schema.json', 'preview_verification'));
  const historyValidation = validateVerificationHistory(root);
  errors.push(...historyValidation.errors);
  const history = listVerificationHistory(root).find((item) => item.verification_id === report.verification_id);
  if (!history) errors.push('Preview verification has no append-only history event.');
  else if (!same(report, history)) errors.push('Preview verification report does not match its append-only history event.');
  if (report.status !== 'verified' || report.failures.length !== 0 || report.verification_summary.failed_checks !== 0) errors.push('Preview verification is not terminally verified without failures.');
  const blockingWarnings = report.warnings.filter((warning) => warning.blocking === true);
  if (blockingWarnings.length) errors.push('Preview verification contains unresolved blocking warnings.');
  return { valid: errors.length === 0, errors, warnings: report.warnings.map((warning) => warning.actual), report, reportPath, history };
}

function validateReleaseEligibility({ root, verificationPath }) {
  const verifiedPreview = loadVerifiedPreview({ root, verificationPath });
  if (!verifiedPreview.valid) return { valid: false, errors: verifiedPreview.errors, warnings: verifiedPreview.warnings, verifiedPreview };
  const errors = [];
  let deploymentPath;
  try { deploymentPath = assertDeploymentPath(root, verifiedPreview.report.deployment.record_path.replace(/\/reports\/deployment-report\.json$/, '')); } catch (error) { errors.push(`Preview verification deployment reference is invalid: ${error.message}`); }
  const deployment = deploymentPath ? verifyDeployment({ root, deploymentPath }) : null;
  if (!deployment?.ready) errors.push(...(deployment?.errors || ['Deployment evidence is unreadable.']));
  const previewValidation = deploymentPath ? validatePreviewVerification({ root, deploymentPath }) : { valid: false, errors: ['Deployment path is unavailable.'] };
  if (!previewValidation.valid) errors.push(...previewValidation.errors.map((error) => `Preview revalidation failed: ${error}`));
  let rollbackMetadata = null;
  let rollbackMetadataPath = null;
  if (deploymentPath) {
    rollbackMetadataPath = path.join(deploymentPath, 'reports/rollback-metadata.json');
    try {
      rollbackMetadata = readRequiredJson(rollbackMetadataPath, 'Rollback preparation metadata');
      errors.push(...createSchemaValidator(root).validateFile(rollbackMetadata, 'schemas/calinium-rollback-metadata.schema.json', 'rollback_metadata'));
      if (rollbackMetadata.deployment_id !== deployment.deploymentRecord.deployment_id) errors.push('Rollback preparation metadata does not match the deployment record.');
    } catch (error) { errors.push(error.message); }
  }
  if (deployment?.ready) {
    const packageData = deployment.packageData;
    if (verifiedPreview.report.deployment.deployment_id !== deployment.deploymentRecord.deployment_id) errors.push('Preview verification deployment ID does not match deployment evidence.');
    if (verifiedPreview.report.review_session.path !== packageData.review_session || verifiedPreview.report.review_session.checksum !== packageData.review_session_hash) errors.push('Preview verification review-session reference does not match deployment package.');
    if (verifiedPreview.report.approval_manifest.path !== packageData.approval_manifest || verifiedPreview.report.approval_manifest.checksum !== packageData.approval_manifest_hash) errors.push('Preview verification approval-manifest reference does not match deployment package.');
    if (deployment.deploymentRecord.status !== 'deployed_to_development_theme') errors.push('Deployment was not successful.');
    if (!['development', 'unpublished'].includes(deployment.deploymentRecord.target.role)) errors.push('Release candidate target is not an unpublished/development theme.');
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings: verifiedPreview.warnings,
    verifiedPreview,
    deployment,
    deploymentPath,
    rollbackMetadata,
    rollbackMetadataPath,
    references: deployment?.ready ? {
      verification: relative(root, verifiedPreview.reportPath),
      verificationHash: fileHash(verifiedPreview.reportPath),
      deploymentPackage: relative(root, path.join(deploymentPath, 'manifests/deployment-package.json')),
      deploymentPackageHash: fileHash(path.join(deploymentPath, 'manifests/deployment-package.json'))
    } : null
  };
}

module.exports = { loadVerifiedPreview, validateReleaseEligibility };
