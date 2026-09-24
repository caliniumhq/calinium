'use strict';

const { createSchemaValidator } = require('../compiler/schema-validator');

function previewUrl(target, store) {
  return target.preview_url || `https://${store}/?preview_theme_id=${target.id}`;
}

function buildPreviewReport({ root, deploymentId, target, store, deployedAt, files, validation, warnings = [] }) {
  const report = { version: 1, deployment_id: deploymentId, development_theme_id: target.id, preview_url: previewUrl(target, store), deployment_timestamp: deployedAt, uploaded_files: files, validation, warnings };
  const errors = createSchemaValidator(root).validateFile(report, 'schemas/calinium-preview-report.schema.json', 'preview_report');
  if (errors.length) throw new Error(`Preview report is invalid: ${errors.join(' ')}`);
  return report;
}

function previewMarkdown(report, target) {
  return `# Calinium development-theme preview\n\n- Deployment: \`${report.deployment_id}\`\n- Development theme: \`${target.name}\` (\`${target.id}\`)\n- Preview: ${report.preview_url}\n- Uploaded configuration files: ${report.uploaded_files.length}\n- Validation: ${report.validation.valid ? 'valid' : 'invalid'}\n\nThis preview is an unpublished/development-theme review target. It is not the merchant’s live storefront.\n`;
}

module.exports = { previewUrl, buildPreviewReport, previewMarkdown };
