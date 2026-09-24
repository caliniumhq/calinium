#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'ai/release-manager/utils.js', 'ai/release-manager/release-manager.js', 'ai/release-manager/release-validator.js',
  'ai/release-manager/rollback-manager.js', 'ai/release-manager/rollback-validator.js', 'ai/release-manager/release-history.js',
  'ai/release-manager/release-manifest.js', 'ai/release-manager/release-report.js', 'ai/release-manager/rollback-report.js',
  'release-theme.js', 'schemas/calinium-release-manifest.schema.json', 'schemas/calinium-rollback-record.schema.json',
  'scripts/test-release-manager.js'
];
const errors = required.filter((file) => !fs.existsSync(path.join(root, file))).map((file) => `Missing required Release Manager file ${file}.`);

for (const file of required.filter((file) => file.startsWith('schemas/'))) {
  try { JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); } catch (error) { errors.push(`${file} is invalid JSON: ${error.message}`); }
}

for (const file of required.filter((file) => file.endsWith('.js'))) {
  const content = fs.readFileSync(path.join(root, file), 'utf8').replace(/^#![^\n]*\n/, '');
  try { new Function(content); } catch (error) { errors.push(`${file} has invalid JavaScript syntax: ${error.message}`); }
  if (/theme\s+publish|--allow-live|cart\/add\.js|\{%-?|\{\{\s*/.test(content)) errors.push(`${file} contains prohibited storefront mutation or live-theme publication behavior.`);
}

const orchestration = {
  'ai/release-manager/release-manager.js': ['validateReleaseEligibility', 'buildReleaseManifest', 'appendReleaseHistory', 'createRepositoryBackup'],
  'ai/release-manager/rollback-manager.js': ['validateRollbackEligibility', 'prepareUploadStaging', 'validatePackageFiles', 'appendRollbackHistory', 'selectDevelopmentTheme'],
  'ai/release-manager/release-validator.js': ['validatePreviewVerification', 'verifyDeployment', 'validateVerificationHistory'],
  'ai/release-manager/rollback-validator.js': ['validateReleaseEligibility', 'validatePackageFiles', 'validateVerificationHistory', 'listDeploymentHistory']
};
for (const [file, dependencies] of Object.entries(orchestration)) {
  const content = fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
  for (const dependency of dependencies) if (!content.includes(dependency)) errors.push(`${file} does not reuse required canonical dependency ${dependency}.`);
}

if (errors.length) { console.error(`Release Manager validation failed:\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log('Release Manager static validation passed: isolated modules, release/rollback schemas, JavaScript syntax, canonical dependency reuse, and no-publish/runtime-mutation audit.');
