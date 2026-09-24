#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'ai/deployment/utils.js', 'ai/deployment/shopify-auth.js', 'ai/deployment/theme-service.js', 'ai/deployment/deployment-service.js', 'ai/deployment/preview-service.js',
  'ai/deployment/rollback-service.js', 'ai/deployment/deployment-history.js', 'ai/deployment/deployment-validator.js', 'ai/deployment/deployment-report.js', 'deploy-theme.js',
  'schemas/calinium-deployment-package.schema.json', 'schemas/calinium-deployment-record.schema.json', 'schemas/calinium-preview-report.schema.json', 'schemas/calinium-rollback-metadata.schema.json', 'scripts/test-deployment-adapter.js'
];
const errors = required.filter((file) => !fs.existsSync(path.join(root, file))).map((file) => `Missing required Deployment Adapter file ${file}.`);
for (const file of required.filter((file) => file.startsWith('schemas/'))) {
  try { JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); } catch (error) { errors.push(`${file} is invalid JSON: ${error.message}`); }
}
for (const file of required.filter((file) => file.endsWith('.js'))) {
  const content = fs.readFileSync(path.join(root, file), 'utf8').replace(/^#![^\n]*\n/, '');
  try { new Function(content); } catch (error) { errors.push(`${file} has invalid JavaScript syntax: ${error.message}`); }
  if (file !== 'scripts/test-deployment-adapter.js' && /\{%-?|\{\{\s*|theme\s+publish|--allow-live|cart\/add\.js/.test(content)) errors.push(`${file} contains prohibited storefront or live-theme behavior.`);
}
if (errors.length) { console.error(`Deployment Adapter validation failed:\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log('Deployment Adapter static validation passed: isolated modules, schemas, CLI, JavaScript syntax, and live-theme/runtime prohibition audit.');
