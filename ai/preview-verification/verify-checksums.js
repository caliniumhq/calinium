'use strict';

const fs = require('fs');
const path = require('path');
const { fileHash, deployableFiles, configurationFingerprint } = require('../deployment/utils');
const { result } = require('./utils');

function verifyChecksums({ root, packageData, generated, snapshotDirectory, origin }) {
  const generatedTheme = path.join(generated.workspace, 'theme');
  const generatedFiles = deployableFiles(generatedTheme);
  const snapshotFiles = deployableFiles(snapshotDirectory);
  const generatedByPath = new Map(generatedFiles.map((file) => [file.path, file]));
  const snapshotByPath = new Map(snapshotFiles.map((file) => [file.path, file]));
  const results = [
    result({ id: 'checksum:workspace-fingerprint', category: 'checksum', method: 'immutable_workspace_fingerprint', expected: packageData.workspace_fingerprint, actual: generated.fingerprint, passed: generated.fingerprint === packageData.workspace_fingerprint, remediation: 'The generated workspace changed after approval. Stop verification and create a new approved deployment package.', origin }),
    result({ id: 'checksum:generated-manifest', category: 'checksum', method: 'sha256_generated_manifest', expected: packageData.generated_theme_manifest_hash, actual: fileHash(path.join(root, packageData.generated_theme_manifest)), passed: fileHash(path.join(root, packageData.generated_theme_manifest)) === packageData.generated_theme_manifest_hash, remediation: 'Restore the approved generated manifest or create a new deployment package.', origin }),
    result({ id: 'checksum:approval-manifest', category: 'checksum', method: 'sha256_approval_manifest', expected: packageData.approval_manifest_hash, actual: fileHash(path.join(root, packageData.approval_manifest)), passed: fileHash(path.join(root, packageData.approval_manifest)) === packageData.approval_manifest_hash, remediation: 'Restore the approved approval manifest or create a new review session.', origin }),
    result({ id: 'checksum:review-session', category: 'checksum', method: 'sha256_review_session', expected: packageData.review_session_hash, actual: fileHash(path.join(root, packageData.review_session, 'session.json')), passed: fileHash(path.join(root, packageData.review_session, 'session.json')) === packageData.review_session_hash, remediation: 'Restore the immutable review session and its audit chain before deployment verification.', origin }),
    result({ id: 'checksum:generated-configuration-fingerprint', category: 'checksum', method: 'approved_generated_configuration_fingerprint', expected: configurationFingerprint(packageData.files), actual: configurationFingerprint(generatedFiles), passed: configurationFingerprint(packageData.files) === configurationFingerprint(generatedFiles), remediation: 'Generated configuration no longer matches the approved package. Create a new approved package.', origin }),
    result({ id: 'checksum:uploaded-configuration-fingerprint', category: 'checksum', method: 'post_upload_configuration_fingerprint', expected: configurationFingerprint(packageData.files), actual: configurationFingerprint(snapshotFiles), passed: configurationFingerprint(packageData.files) === configurationFingerprint(snapshotFiles), remediation: 'Uploaded configuration does not match the approved package. Re-upload before preview verification.', origin })
  ];
  for (const expected of packageData.files) {
    const actual = snapshotByPath.get(expected.path);
    const generatedFile = generatedByPath.get(expected.path);
    results.push(result({
      id: `checksum:${expected.path.replace(/[/.]/g, ':')}`,
      category: 'checksum', method: 'approved_generated_uploaded_sha256_chain', expected: { package: expected.checksum, generated: generatedFile?.checksum }, actual: actual?.checksum || null,
      passed: generatedFile?.checksum === expected.checksum && actual?.checksum === expected.checksum,
      remediation: `Restore ${expected.path} from the approved generated workspace and deploy it again.`, origin: { ...origin, generated_file: `theme/${expected.path}` }
    }));
  }
  return { results, valid: results.every((item) => item.result === 'passed') };
}

module.exports = { verifyChecksums };
