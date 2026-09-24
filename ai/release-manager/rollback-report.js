'use strict';

const { createSchemaValidator } = require('../compiler/schema-validator');
const { MANAGER_VERSION, relative, fileHash, configurationFingerprint } = require('./utils');

function buildRollbackRecord({ root, rollbackId, rolledBackAt, rollbackReason, eligibility, restoredTheme, restoredFiles, validationErrors = [] }) {
  const expected = configurationFingerprint(eligibility.restored.packageData.files);
  const actual = configurationFingerprint(restoredFiles);
  const record = {
    version: 1,
    manager_version: MANAGER_VERSION,
    rollback_id: rollbackId,
    rollback_timestamp: rolledBackAt,
    rollback_reason: rollbackReason,
    source_release: {
      release_id: eligibility.release.manifest.release_id,
      path: relative(root, eligibility.release.manifestPath),
      checksum: fileHash(eligibility.release.manifestPath)
    },
    source_deployment: eligibility.sourceDeployment.deploymentRecord.deployment_id,
    restored_deployment: eligibility.restored.record.deployment_id,
    rollback_metadata: { path: relative(root, eligibility.rollbackMetadataPath), checksum: fileHash(eligibility.rollbackMetadataPath) },
    restored_checksums: { expected_configuration: expected, actual_configuration: actual, restored_files: restoredFiles },
    restored_theme: { store: restoredTheme.store, theme_id: restoredTheme.id, theme_name: restoredTheme.name, role: restoredTheme.role },
    previous_preview_verification: { path: eligibility.previousVerification.path, checksum: fileHash(eligibility.previousVerification.file) },
    validation: { valid: expected === actual && validationErrors.length === 0, errors: [...validationErrors, ...(expected === actual ? [] : ['Restored configuration checksum does not match the verified previous deployment.'])], warnings: eligibility.warnings },
    traceability: eligibility.restored.packageData.traceability,
    status: expected === actual && validationErrors.length === 0 ? 'rolled_back_to_verified_development_configuration' : 'rollback_failed'
  };
  const errors = createSchemaValidator(root).validateFile(record, 'schemas/calinium-rollback-record.schema.json', 'rollback_record');
  if (errors.length) throw new Error(`Rollback record is invalid: ${errors.join(' ')}`);
  return record;
}

function rollbackMarkdown(record) {
  return `# Calinium controlled rollback\n\n- Rollback: \`${record.rollback_id}\`\n- Source release: \`${record.source_release.release_id}\`\n- Source deployment: \`${record.source_deployment}\`\n- Restored deployment: \`${record.restored_deployment}\`\n- Target: \`${record.restored_theme.theme_name}\` (\`${record.restored_theme.theme_id}\`)\n- Role: \`${record.restored_theme.role}\`\n- Restored files: ${record.restored_checksums.restored_files.length}\n- Status: \`${record.status}\`\n\nThis rollback restored only approved JSON configuration to an unpublished/development theme. No live theme was published or changed.\n`;
}

module.exports = { buildRollbackRecord, rollbackMarkdown };
