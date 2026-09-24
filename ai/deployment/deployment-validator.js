'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { validateReviewSession } = require('../review-engine/validate-review-session');
const { loadGeneratedWorkspace } = require('../review-engine/load-generated-workspace');
const { fileHash, readJson, deployableFiles, DEPLOYABLE_PATH } = require('./utils');

function approvalManifestPath(sessionPath) { return path.join(sessionPath, 'manifests/approval-manifest.json'); }

function validateApprovedDeploymentPackage({ root, sessionPath }) {
  const errors = [];
  const sessionValidation = validateReviewSession({ root, sessionPath });
  if (!sessionValidation.valid) errors.push(...sessionValidation.errors);
  if (sessionValidation.state !== 'approved' || !sessionValidation.deployment_eligibility?.eligible) errors.push('Review session is not approved and deployment eligible.');
  const approvalPath = approvalManifestPath(sessionPath);
  let approval;
  try { approval = readJson(approvalPath); } catch (error) { errors.push(`Approval manifest is missing or invalid: ${error.message}`); }
  if (approval) {
    errors.push(...createSchemaValidator(root).validateFile(approval, 'schemas/calinium-approval-manifest.schema.json', 'approval_manifest'));
    if (!approval.deployment_eligibility.eligible) errors.push('Approval manifest is not deployment eligible.');
    if (approval.session_id !== sessionValidation.session?.session_id) errors.push('Approval manifest does not belong to the review session.');
    if (approval.generation_id !== sessionValidation.session?.generated_theme?.generation_id) errors.push('Approval manifest generation does not match the review session.');
    const head = sessionValidation.events?.at(-1)?.event;
    if (!head || approval.audit_head.event_hash !== head.event_hash) errors.push('Approval manifest does not match the current immutable audit head.');
  }
  let generated;
  if (!errors.length) {
    try { generated = loadGeneratedWorkspace({ root, workspace: path.resolve(root, sessionValidation.session.generated_workspace) }); } catch (error) { errors.push(error.message); }
  }
  if (generated && generated.fingerprint !== sessionValidation.session.workspace_fingerprint) errors.push('Generated workspace fingerprint differs from the approved review session.');
  if (generated && fileHash(generated.manifestPath) !== sessionValidation.session.generated_theme.manifest_hash) errors.push('Generated theme manifest checksum differs from the approved review session.');
  const reportPaths = generated ? ['reports/change-manifest.json', 'reports/theme-diff.json', 'reports/preview.md'] : [];
  for (const relative of reportPaths) if (!fs.existsSync(path.join(generated.workspace, relative))) errors.push(`Deployment package is missing ${relative}.`);
  const files = generated ? deployableFiles(path.join(generated.workspace, 'theme')) : [];
  if (!files.length) errors.push('Deployment package has no approved configuration files.');
  if (files.some((file) => !DEPLOYABLE_PATH.test(file.path))) errors.push('Deployment package includes a prohibited runtime file.');
  if (errors.length) return { valid: false, errors, warnings: [], sessionValidation, approval, generated, files };
  const packageId = `deployment-package-${generated.manifest.generation_id.replace(/^generation-run-/, '')}`;
  const packageData = {
    version: 1,
    package_id: packageId,
    generated_workspace: path.relative(root, generated.workspace),
    workspace_fingerprint: generated.fingerprint,
    generated_theme_manifest: path.relative(root, generated.manifestPath),
    generated_theme_manifest_hash: fileHash(generated.manifestPath),
    review_session: path.relative(root, sessionPath),
    review_session_hash: fileHash(path.join(sessionPath, 'session.json')),
    approval_manifest: path.relative(root, approvalPath),
    approval_manifest_hash: fileHash(approvalPath),
    change_manifest: path.relative(root, path.join(generated.workspace, 'reports/change-manifest.json')),
    theme_diff: path.relative(root, path.join(generated.workspace, 'reports/theme-diff.json')),
    preview_report: path.relative(root, path.join(generated.workspace, 'reports/preview.md')),
    files,
    traceability: sessionValidation.session.traceability,
    validation: { valid: true, errors: [], warnings: [] }
  };
  const schemaErrors = createSchemaValidator(root).validateFile(packageData, 'schemas/calinium-deployment-package.schema.json', 'deployment_package');
  if (schemaErrors.length) return { valid: false, errors: schemaErrors, warnings: [], sessionValidation, approval, generated, files };
  return { valid: true, errors: [], warnings: [], sessionValidation, approval, generated, files, package: packageData };
}

function validatePackageFiles(packageData, themeDirectory) {
  const actual = deployableFiles(themeDirectory);
  const errors = [];
  if (actual.length !== packageData.files.length) errors.push('Uploaded configuration file count differs from the approved package.');
  for (const file of packageData.files) {
    const corresponding = actual.find((item) => item.path === file.path);
    if (!corresponding) errors.push(`Uploaded configuration is missing ${file.path}.`);
    else if (corresponding.checksum !== file.checksum) errors.push(`Uploaded configuration checksum differs for ${file.path}.`);
  }
  return { valid: errors.length === 0, errors, warnings: [] };
}

module.exports = { approvalManifestPath, validateApprovedDeploymentPackage, validatePackageFiles };
