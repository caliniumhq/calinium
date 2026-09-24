'use strict';

const fs = require('fs');
const path = require('path');
const { verifyDeployment } = require('./verify-deployment');
const { verifyDeploymentHistory, appendVerificationHistory, validateVerificationHistory } = require('./verify-history');
const { verifyThemeIdentity, collectReadOnlyThemeSnapshot } = require('./verify-theme');
const { verifyFiles } = require('./verify-files');
const { verifyChecksums } = require('./verify-checksums');
const { verifyTemplates } = require('./verify-templates');
const { verifySections } = require('./verify-sections');
const { verifySettings } = require('./verify-settings');
const { buildVerificationReport, verificationMarkdown } = require('./generate-verification-report');
const { assertVerificationPath, verificationHistoryDirectory, result, relative, writeNewJson, writeNewText } = require('./utils');

function unavailableResult({ id, category, message, remediation, origin }) {
  return result({ id, category, method: 'dependent_evidence_availability', expected: 'available validated evidence', actual: message, passed: false, remediation, origin });
}

function analyzePreview({ root, deploymentPath, snapshotDirectory = null, remoteTheme = null, verificationSource = 'deployment_snapshot' }) {
  const deployment = verifyDeployment({ root, deploymentPath });
  if (!deployment.ready) return { ready: false, errors: deployment.errors, warnings: deployment.warnings, deployment };
  const history = verifyDeploymentHistory({ root, deploymentPath: deployment.deploymentPath, packageData: deployment.packageData, deploymentRecord: deployment.deploymentRecord, origin: deployment.origin });
  const theme = verifyThemeIdentity({ deploymentRecord: deployment.deploymentRecord, previewReport: deployment.previewReport, origin: deployment.origin, remoteTheme, verificationSource });
  const source = snapshotDirectory || deployment.snapshotDirectory;
  const deploymentResults = [...deployment.results, ...history.results];
  if (!deployment.approved.valid || !deployment.approved.generated) {
    const dependency = unavailableResult({ id: 'deployment:generated-evidence', category: 'deployment', message: deployment.approved.errors.join(' '), remediation: 'Resolve approval-chain integrity before verifying configuration, templates, or settings.', origin: deployment.origin });
    return {
      ready: true,
      deployment,
      packageData: deployment.packageData,
      deploymentRecord: deployment.deploymentRecord,
      previewReport: deployment.previewReport,
      artifactReferences: deployment.artifactReferences,
      history,
      deploymentResults: [...deploymentResults, dependency],
      themeResults: theme.results,
      checksumResults: [],
      fileResults: [],
      settingsResults: [],
      templateResults: [],
      sectionResults: [],
      results: [...deploymentResults, dependency, ...theme.results],
      snapshotDirectory: source,
      verificationSource
    };
  }
  const files = verifyFiles({ packageData: deployment.packageData, snapshotDirectory: source, origin: deployment.origin });
  const checksums = verifyChecksums({ root, packageData: deployment.packageData, generated: deployment.approved.generated, snapshotDirectory: source, origin: deployment.origin });
  const templates = verifyTemplates({ packageData: deployment.packageData, generated: deployment.approved.generated, snapshotDirectory: source, origin: deployment.origin });
  const settings = verifySettings({ generated: deployment.approved.generated, snapshotDirectory: source, origin: deployment.origin });
  const sections = verifySections({ generated: deployment.approved.generated, templates: templates.templates, origin: deployment.origin });
  return {
    ready: true,
    deployment,
    packageData: deployment.packageData,
    deploymentRecord: deployment.deploymentRecord,
    previewReport: deployment.previewReport,
    artifactReferences: deployment.artifactReferences,
    history,
    deploymentResults,
    themeResults: theme.results,
    checksumResults: checksums.results,
    fileResults: files.results,
    settingsResults: settings.results,
    templateResults: templates.results,
    sectionResults: sections.results,
    results: [...deploymentResults, ...theme.results, ...checksums.results, ...files.results, ...settings.results, ...templates.results, ...sections.results],
    snapshotDirectory: source,
    verificationSource
  };
}

function validatePreviewVerification({ root, deploymentPath }) {
  const analysis = analyzePreview({ root, deploymentPath });
  if (!analysis.ready) return { valid: false, errors: analysis.errors, warnings: analysis.warnings || [], analysis };
  const failures = analysis.results.filter((item) => item.result === 'failed');
  const warnings = analysis.results.filter((item) => item.result === 'warning').map((item) => item.actual);
  return { valid: failures.length === 0, errors: failures.map((item) => `${item.id}: ${typeof item.actual === 'string' ? item.actual : JSON.stringify(item.actual)}`), warnings, analysis };
}

function verifyPreview({ root, deploymentPath, verificationId, verificationAt, store = null, environment = null, token = null, themeService = null }) {
  if (!verificationAt) throw new Error('Preview verification requires an explicit verification timestamp.');
  const verificationPath = assertVerificationPath(root, verificationId);
  const historyFile = path.join(verificationHistoryDirectory(root), `${verificationId}.json`);
  if (fs.existsSync(verificationPath) || fs.existsSync(historyFile)) throw new Error(`Verification ${verificationId} already exists; verification reports and history are append-only.`);
  const historyValidation = validateVerificationHistory(root);
  if (!historyValidation.valid) throw new Error(`Verification history integrity failed: ${historyValidation.errors.join(' ')}`);
  let deployment = verifyDeployment({ root, deploymentPath });
  if (!deployment.ready) throw new Error(`Deployment cannot be verified: ${deployment.errors.join(' ')}`);
  let snapshotDirectory = null;
  let remoteTheme = null;
  let verificationSource = 'deployment_snapshot';
  const remoteFailure = [];
  if (store) {
    try {
      const remote = collectReadOnlyThemeSnapshot({ root, verificationPath, deploymentRecord: deployment.deploymentRecord, store, environment, token, themeService });
      snapshotDirectory = remote.snapshotDirectory;
      remoteTheme = remote.remoteTheme;
      verificationSource = remote.source;
    } catch (error) {
      remoteFailure.push(unavailableResult({ id: 'theme:remote-read', category: 'theme_identity', message: error.message, remediation: 'Confirm Shopify CLI authentication and that the recorded unpublished/development target still exists, then run verification again.', origin: deployment.origin }));
    }
  }
  const analysis = analyzePreview({ root, deploymentPath, snapshotDirectory, remoteTheme, verificationSource });
  if (!analysis.ready) throw new Error(`Deployment cannot be verified: ${analysis.errors.join(' ')}`);
  if (remoteFailure.length) {
    analysis.themeResults.push(...remoteFailure);
    analysis.results.push(...remoteFailure);
  }
  const report = buildVerificationReport({ root, verificationId, verificationAt, source: verificationSource, analysis, historyPath: relative(root, historyFile) });
  writeNewJson(path.join(verificationPath, 'reports/preview-verification.json'), report);
  writeNewText(path.join(verificationPath, 'reports/preview-verification.md'), verificationMarkdown(report));
  const history = appendVerificationHistory({ root, report });
  return { verificationPath, report, history, analysis };
}

module.exports = { unavailableResult, analyzePreview, validatePreviewVerification, verifyPreview };
