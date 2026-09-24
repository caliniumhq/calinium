#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'ai/preview-verification/utils.js', 'ai/preview-verification/verify-preview.js', 'ai/preview-verification/verify-deployment.js', 'ai/preview-verification/verify-theme.js',
  'ai/preview-verification/verify-templates.js', 'ai/preview-verification/verify-settings.js', 'ai/preview-verification/verify-sections.js', 'ai/preview-verification/verify-files.js',
  'ai/preview-verification/verify-checksums.js', 'ai/preview-verification/verify-history.js', 'ai/preview-verification/generate-verification-report.js',
  'verify-preview.js', 'schemas/calinium-preview-verification.schema.json', 'scripts/test-preview-verification.js'
];
const errors = required.filter((file) => !fs.existsSync(path.join(root, file))).map((file) => `Missing required Preview Verification file ${file}.`);
for (const file of required.filter((file) => file.startsWith('schemas/'))) {
  try { JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); } catch (error) { errors.push(`${file} is invalid JSON: ${error.message}`); }
}
for (const file of required.filter((file) => file.endsWith('.js'))) {
  const content = fs.readFileSync(path.join(root, file), 'utf8').replace(/^#![^\n]*\n/, '');
  try { new Function(content); } catch (error) { errors.push(`${file} has invalid JavaScript syntax: ${error.message}`); }
  if (/theme\s+(push|publish)|--allow-live|cart\/add\.js|\{%-?|\{\{\s*/.test(content)) errors.push(`${file} contains prohibited storefront mutation or live-theme behavior.`);
}
const engine = fs.existsSync(path.join(root, 'ai/preview-verification/verify-preview.js')) ? fs.readFileSync(path.join(root, 'ai/preview-verification/verify-preview.js'), 'utf8') : '';
for (const dependency of ['verifyDeployment', 'verifyThemeIdentity', 'verifyFiles', 'verifyChecksums', 'verifyTemplates', 'verifySettings', 'verifySections', 'appendVerificationHistory', 'validateVerificationHistory']) if (!engine.includes(dependency)) errors.push(`Preview verification orchestration does not use ${dependency}.`);
if (errors.length) { console.error(`Preview Verification validation failed:\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log('Preview Verification static validation passed: isolated modules, schema, state-machine use, JavaScript syntax, and read-only/live-theme prohibition audit.');
