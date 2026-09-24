'use strict';

const { createSchemaValidator } = require('../compiler/schema-validator');
const { MANAGER_VERSION, configurationFingerprint } = require('./utils');

function buildReleaseManifest({ root, releaseId, releasedAt, releaseNotes, eligibility }) {
  const packageData = eligibility.deployment.packageData;
  const record = eligibility.deployment.deploymentRecord;
  const manifest = {
    version: 1,
    manager_version: MANAGER_VERSION,
    release_id: releaseId,
    deployment_id: record.deployment_id,
    review_session: { path: packageData.review_session, checksum: packageData.review_session_hash },
    approval_manifest: { path: packageData.approval_manifest, checksum: packageData.approval_manifest_hash },
    preview_verification: { path: eligibility.references.verification, checksum: eligibility.references.verificationHash },
    release_timestamp: releasedAt,
    release_status: 'release_candidate',
    released_files: packageData.files,
    released_theme: { store: record.target.store, theme_id: record.target.theme_id, theme_name: record.target.theme_name, role: record.target.role },
    release_notes: releaseNotes,
    checksums: {
      deployment_package: eligibility.references.deploymentPackageHash,
      preview_verification: eligibility.references.verificationHash,
      configuration: configurationFingerprint(packageData.files)
    },
    validation: { valid: true, errors: [], warnings: eligibility.warnings },
    traceability: packageData.traceability
  };
  const errors = createSchemaValidator(root).validateFile(manifest, 'schemas/calinium-release-manifest.schema.json', 'release_manifest');
  if (errors.length) throw new Error(`Release manifest is invalid: ${errors.join(' ')}`);
  return manifest;
}

module.exports = { buildReleaseManifest };
