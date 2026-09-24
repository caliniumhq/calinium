'use strict';

const { createSchemaValidator } = require('../compiler/schema-validator');

function buildDeploymentRecord({ root, deploymentId, deployedAt, reason, packageData, target, created, files, validation, preview }) {
  const record = {
    version: 1,
    adapter_version: '1.0.0',
    deployment_id: deploymentId,
    deployment_timestamp: deployedAt,
    deployment_reason: reason,
    package: { package_id: packageData.package_id, workspace_fingerprint: packageData.workspace_fingerprint, approval_manifest_hash: packageData.approval_manifest_hash },
    target: { store: target.store, theme_id: target.id, theme_name: target.name, role: target.role, created },
    uploaded_files: files,
    validation,
    preview: { url: preview.preview_url, report_path: 'reports/preview-report.json' },
    traceability: packageData.traceability,
    status: validation.valid ? 'deployed_to_development_theme' : 'validation_failed'
  };
  const errors = createSchemaValidator(root).validateFile(record, 'schemas/calinium-deployment-record.schema.json', 'deployment_record');
  if (errors.length) throw new Error(`Deployment report is invalid: ${errors.join(' ')}`);
  return record;
}

function deploymentMarkdown(record) {
  return `# Calinium development-theme deployment\n\n- Deployment: \`${record.deployment_id}\`\n- Target: \`${record.target.theme_name}\` (\`${record.target.theme_id}\`)\n- Role: \`${record.target.role}\`\n- Package: \`${record.package.package_id}\`\n- Uploaded files: ${record.uploaded_files.length}\n- Preview: ${record.preview.url}\n- Status: \`${record.status}\`\n\nThis record documents an unpublished/development-theme deployment only. No publish action was performed.\n`;
}

module.exports = { buildDeploymentRecord, deploymentMarkdown };
