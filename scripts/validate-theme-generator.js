#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { loadGeneratorMappings } = require('../ai/theme-generator/load-mappings');

const root = path.resolve(__dirname, '..');
const required = [
  'ai/theme-generator/generate-theme.js', 'ai/theme-generator/generate-homepage.js', 'ai/theme-generator/generate-pages.js', 'ai/theme-generator/generate-settings.js',
  'ai/theme-generator/generate-section-instances.js', 'ai/theme-generator/resolve-resource-references.js', 'ai/theme-generator/validate-generated-theme.js',
  'ai/theme-generator/section-content-eligibility.js',
  'ai/theme-generator/materialize-section-blocks.js',
  'pipeline/resolve-approved-block-plan-transport.js',
  'ai/theme-generator/generate-change-manifest.js', 'ai/theme-generator/generate-diff.js', 'ai/theme-generator/generate-preview-report.js', 'ai/theme-generator/utils.js',
  'generate-theme.js', 'schemas/calinium-generated-theme.schema.json', 'schemas/calinium-generation-approval.schema.json',
  'schemas/theme-block-materialization-policy.schema.json', 'schemas/calinium-approved-block-plan-revision.schema.json', 'schemas/calinium-approved-resource-snapshot.schema.json', 'config/theme-block-materialization-policy.json',
  'fixtures/theme-generator-content-eligibility.json', 'scripts/test-theme-generator.js', 'scripts/test-theme-generator-content-eligibility.js'
];
const errors = required.filter((file) => !fs.existsSync(path.join(root, file))).map((file) => `Missing required Theme Generator file ${file}.`);
const validator = createSchemaValidator(root);
for (const schema of ['schemas/calinium-generated-theme.schema.json', 'schemas/calinium-generation-approval.schema.json', 'schemas/theme-block-materialization-policy.schema.json', 'schemas/calinium-approved-block-plan-revision.schema.json', 'schemas/calinium-approved-resource-snapshot.schema.json', 'config/theme-block-materialization-policy.json']) {
  try { JSON.parse(fs.readFileSync(path.join(root, schema), 'utf8')); } catch (error) { errors.push(`${schema} is invalid JSON: ${error.message}`); }
}
try {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/theme-generator-content-eligibility.json'), 'utf8'));
  if (fixture.fixture_revision !== 'theme-generator-content-eligibility-fixture-v1'
    || fixture.policy_revision !== 'theme-section-content-eligibility-v1'
    || fixture.comparison_cases?.length !== 5
    || fixture.faq_cases?.length !== 6
    || fixture.mixed_scenarios?.length !== 4) errors.push('Content-eligibility fixture has an unexpected revision or case matrix.');
} catch (error) { errors.push(`fixtures/theme-generator-content-eligibility.json is invalid: ${error.message}`); }
try { loadGeneratorMappings(root); } catch (error) { errors.push(`Mapping catalog load failed: ${error.message}`); }
for (const file of required.filter((item) => item.endsWith('.js'))) {
  try { new Function(fs.readFileSync(path.join(root, file), 'utf8').replace(/^#![^\n]*\n/, '')); } catch (error) { errors.push(`${file} has invalid JavaScript syntax: ${error.message}`); }
}
const forbidden = [/\bfetch\s*\(/, /https?:\/\//, /shopify\s+theme\s+push/i, /\.liquid['"]\s*,?\s*['"]/];
for (const file of required.filter((item) => item.endsWith('.js'))) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  for (const pattern of forbidden) if (pattern.test(content)) errors.push(`${file} contains prohibited runtime, network, or deployment behavior (${pattern}).`);
}
if (errors.length) { console.error(`Theme Generator validation failed:\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log('Theme Generator static validation passed: required modules, schemas, mapping integration, JavaScript syntax, and isolation audit.');
