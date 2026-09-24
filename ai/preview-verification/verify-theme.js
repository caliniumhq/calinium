'use strict';

const path = require('path');
const { ThemeService } = require('../deployment/theme-service');
const { resolveShopifyAuth } = require('../deployment/shopify-auth');
const { result } = require('./utils');

function previewMetadata(url, target) {
  try {
    const parsed = new URL(url);
    return {
      valid: parsed.protocol === 'https:' && parsed.hostname === target.store && String(parsed.searchParams.get('preview_theme_id')) === String(target.theme_id),
      actual: { protocol: parsed.protocol, hostname: parsed.hostname, preview_theme_id: parsed.searchParams.get('preview_theme_id') }
    };
  } catch (error) {
    return { valid: false, actual: error.message };
  }
}

function verifyThemeIdentity({ deploymentRecord, previewReport, origin, remoteTheme = null, verificationSource = 'deployment_snapshot' }) {
  const target = deploymentRecord.target;
  const results = [
    result({ id: 'theme:role', category: 'theme_identity', method: 'development_role_allowlist', expected: ['development', 'unpublished'], actual: target.role, passed: ['development', 'unpublished'].includes(target.role), remediation: 'Do not verify or use a published theme. Deploy the approved package to an unpublished/development target.', origin }),
    result({ id: 'theme:id', category: 'theme_identity', method: 'deployment_theme_identifier', expected: target.theme_id, actual: previewReport.development_theme_id, passed: String(target.theme_id) === String(previewReport.development_theme_id), remediation: 'The preview report must reference the exact development theme recorded by deployment.', origin }),
    result({ id: 'theme:preview-url', category: 'preview', method: 'https_preview_theme_id_validation', expected: { host: target.store, preview_theme_id: String(target.theme_id) }, actual: previewMetadata(previewReport.preview_url, target).actual, passed: previewMetadata(previewReport.preview_url, target).valid, remediation: 'Regenerate the development-theme preview metadata with an HTTPS URL containing the recorded preview_theme_id.', origin })
  ];
  if (remoteTheme) {
    results.push(result({ id: 'theme:remote-identity', category: 'theme_identity', method: 'read_only_shopify_theme_list', expected: { id: target.theme_id, name: target.theme_name, role: target.role }, actual: { id: remoteTheme.id, name: remoteTheme.name, role: remoteTheme.role }, passed: String(remoteTheme.id) === String(target.theme_id) && remoteTheme.name === target.theme_name && remoteTheme.role === target.role, remediation: 'The current Shopify target differs from the recorded development theme. Stop verification and investigate the deployment target.', origin }));
  }
  if (verificationSource === 'deployment_snapshot') {
    results.push(result({ id: 'theme:snapshot-scope', category: 'theme_identity', method: 'immutable_post_upload_snapshot', expected: 'fresh remote pull for current target identity', actual: 'deployment adapter post-upload snapshot', passed: true, warning: true, remediation: 'Supply --store to perform an additional read-only Shopify theme identity and configuration pull.', origin }));
  }
  return { results, valid: results.every((item) => item.result !== 'failed') };
}

function collectReadOnlyThemeSnapshot({ root, verificationPath, deploymentRecord, store, environment = null, token = null, themeService = null }) {
  const auth = resolveShopifyAuth({ store, environment, token });
  const service = themeService || new ThemeService({ root });
  const remoteTheme = service.selectDevelopmentTheme(auth, { themeId: deploymentRecord.target.theme_id });
  const destination = path.join(verificationPath, 'snapshot/current-configuration');
  service.pullConfiguration(auth, { theme: remoteTheme, destination });
  return { source: 'fresh_remote_pull', snapshotDirectory: destination, remoteTheme };
}

module.exports = { previewMetadata, verifyThemeIdentity, collectReadOnlyThemeSnapshot };
