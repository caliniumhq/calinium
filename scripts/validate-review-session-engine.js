#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');

const root = path.resolve(__dirname, '..');
const required = [
  'ai/review-engine/utils.js', 'ai/review-engine/load-generated-workspace.js', 'ai/review-engine/build-traceability.js', 'ai/review-engine/append-audit-log.js',
  'ai/review-engine/state-machine.js', 'ai/review-engine/calculate-deployment-eligibility.js', 'ai/review-engine/validate-review-session.js', 'ai/review-engine/create-review-session.js',
  'ai/review-engine/record-decision.js', 'ai/review-engine/transition-session.js', 'ai/review-engine/explain-session.js', 'review-theme.js',
  'schemas/calinium-review-session.schema.json', 'schemas/calinium-review-audit-event.schema.json', 'schemas/calinium-approval-manifest.schema.json', 'scripts/test-review-session-engine.js'
];
const errors = required.filter((file) => !fs.existsSync(path.join(root, file))).map((file) => `Missing required Review Session Engine file ${file}.`);
const validator = createSchemaValidator(root);
for (const schema of required.filter((file) => file.startsWith('schemas/'))) {
  try { JSON.parse(fs.readFileSync(path.join(root, schema), 'utf8')); } catch (error) { errors.push(`${schema} is invalid JSON: ${error.message}`); }
}
for (const file of required.filter((file) => file.endsWith('.js'))) {
  const content = fs.readFileSync(path.join(root, file), 'utf8').replace(/^#![^\n]*\n/, '');
  try { new Function(content); } catch (error) { errors.push(`${file} has invalid JavaScript syntax: ${error.message}`); }
  if (/\{%-?|\{\{\s*|shopify\s+theme\s+(push|publish)|\bfetch\s*\(|cart\/add\.js/.test(content)) errors.push(`${file} contains prohibited Shopify runtime, deployment, network, or storefront behavior.`);
}
if (errors.length) { console.error(`Review Session Engine validation failed:\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log('Review Session Engine static validation passed: isolated modules, schemas, CLI, JavaScript syntax, and prohibited-runtime audit.');
