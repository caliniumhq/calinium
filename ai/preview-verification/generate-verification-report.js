'use strict';

const { createSchemaValidator } = require('../compiler/schema-validator');
const { ENGINE_VERSION, transition, relative } = require('./utils');

function terminalState(results) { return results.some((item) => item.result === 'failed') ? 'failed' : 'verified'; }

function buildVerificationReport({ root, verificationId, verificationAt, source, analysis, historyPath }) {
  const allResults = analysis.results;
  const status = terminalState(allResults);
  const stateHistory = [
    { from: 'pending', to: transition('pending', 'running'), method: 'verification_run_started' },
    { from: 'running', to: transition('running', status), method: status === 'verified' ? 'all_verification_checks_passed' : 'one_or_more_verification_checks_failed' }
  ];
  const failures = allResults.filter((item) => item.result === 'failed');
  const warnings = allResults.filter((item) => item.result === 'warning');
  const report = {
    version: 1,
    engine_version: ENGINE_VERSION,
    verification_id: verificationId,
    verification_timestamp: verificationAt,
    status,
    state_history: stateHistory,
    verification_source: source,
    deployment: {
      deployment_id: analysis.deploymentRecord.deployment_id,
      record_path: analysis.artifactReferences.deploymentReport,
      history_path: historyPath,
      target_theme_id: analysis.deploymentRecord.target.theme_id,
      target_theme_name: analysis.deploymentRecord.target.theme_name,
      target_role: analysis.deploymentRecord.target.role,
      preview_url: analysis.previewReport.preview_url,
      deployment_timestamp: analysis.deploymentRecord.deployment_timestamp
    },
    review_session: { path: analysis.packageData.review_session, checksum: analysis.packageData.review_session_hash },
    approval_manifest: { path: analysis.packageData.approval_manifest, checksum: analysis.packageData.approval_manifest_hash },
    traceability: analysis.packageData.traceability,
    verified_deployment: analysis.deploymentResults,
    verified_theme: analysis.themeResults,
    verified_checksums: analysis.checksumResults,
    verified_files: analysis.fileResults,
    verified_settings: analysis.settingsResults,
    verified_templates: analysis.templateResults,
    verified_sections: analysis.sectionResults,
    warnings,
    failures,
    verification_summary: {
      total_checks: allResults.length,
      passed_checks: allResults.filter((item) => item.result === 'passed').length,
      failed_checks: failures.length,
      warning_checks: warnings.length,
      status,
      method: source === 'fresh_remote_pull' ? 'approved_package_to_read_only_current_shopify_configuration_comparison' : 'approved_package_to_immutable_post_upload_snapshot_comparison'
    }
  };
  const errors = createSchemaValidator(root).validateFile(report, 'schemas/calinium-preview-verification.schema.json', 'preview_verification');
  if (errors.length) throw new Error(`Preview verification report is invalid: ${errors.join(' ')}`);
  return report;
}

function verificationMarkdown(report) {
  return `# Calinium preview verification\n\n- Verification: \`${report.verification_id}\`\n- Status: \`${report.status}\`\n- Deployment: \`${report.deployment.deployment_id}\`\n- Development theme: \`${report.deployment.target_theme_name}\` (\`${report.deployment.target_theme_id}\`)\n- Preview: ${report.deployment.preview_url}\n- Source: \`${report.verification_source}\`\n- Checks: ${report.verification_summary.passed_checks} passed, ${report.verification_summary.failed_checks} failed, ${report.verification_summary.warning_checks} warnings\n\nThis is a read-only verification report. It did not publish or modify Shopify, the deployment record, or the generated workspace.\n`;
}

module.exports = { terminalState, buildVerificationReport, verificationMarkdown };
