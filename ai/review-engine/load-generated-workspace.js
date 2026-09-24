'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadGeneratorMappings } = require('../theme-generator/load-mappings');
const { validateGeneratedWorkspace } = require('../theme-generator/validate-generated-theme');
const { readJson, assertGeneratedWorkspacePath, directoryFingerprint, sha256 } = require('./utils');
const { withoutShopifyStorefrontPassword } = require('../storefront-render/shopify-storefront-password-binding');

function loadGeneratedWorkspace({ root, workspace }) {
  const generatedWorkspace = assertGeneratedWorkspacePath(root, workspace);
  const manifestPath = path.join(generatedWorkspace, 'manifests/generated-theme.json');
  const backupPath = path.join(generatedWorkspace, 'manifests/source-runtime-backup.tar.gz');
  const required = [manifestPath, backupPath, path.join(generatedWorkspace, 'reports/change-manifest.json'), path.join(generatedWorkspace, 'reports/theme-diff.json'), path.join(generatedWorkspace, 'reports/preview.md')];
  const errors = required.filter((file) => !fs.existsSync(file)).map((file) => `Generated workspace is missing ${path.relative(generatedWorkspace, file)}.`);
  let manifest = null;
  if (!errors.length) {
    try { manifest = readJson(manifestPath); } catch (error) { errors.push(`Generated manifest is invalid JSON: ${error.message}`); }
    try {
      execFileSync('tar', ['-tzf', backupPath], {
        stdio: 'pipe',
        env: withoutShopifyStorefrontPassword(process.env)
      });
    } catch (error) { errors.push('Generated source-runtime backup archive is invalid.'); }
  }
  let validation = { valid: false, errors: [], warnings: [] };
  if (!errors.length) validation = validateGeneratedWorkspace({ root, workspace: generatedWorkspace, mappings: loadGeneratorMappings(root) });
  errors.push(...validation.errors);
  if (errors.length) {
    const error = new Error(`Generated workspace is not reviewable: ${errors.join(' ')}`);
    error.validation = { valid: false, errors, warnings: validation.warnings || [] };
    throw error;
  }
  return {
    workspace: generatedWorkspace,
    manifest,
    manifestPath,
    manifestHash: sha256(fs.readFileSync(manifestPath)),
    fingerprint: directoryFingerprint(generatedWorkspace),
    validation
  };
}

module.exports = { loadGeneratedWorkspace };
