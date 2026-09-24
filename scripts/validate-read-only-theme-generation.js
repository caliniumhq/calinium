#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'ai/theme-generator/create-theme-specification.js',
  'ai/theme-generator/generate-read-only-theme-package.js',
  'ai/theme-generator/validate-read-only-theme-package.js',
  'schemas/calinium-theme-specification.schema.json',
  'schemas/calinium-read-only-theme-package.schema.json',
  'pipeline/generate-storefront.js',
  'generate-theme.js',
  'scripts/test-merchant-profile-integration.js'
];
const errors = [];
function fail(message) { errors.push(message); }

for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`Missing required read-only generation file ${file}.`);
for (const schema of required.filter((file) => file.endsWith('.json'))) {
  try { JSON.parse(fs.readFileSync(path.join(root, schema), 'utf8')); }
  catch (error) { fail(`${schema} is not valid JSON: ${error.message}`); }
}
for (const file of required.filter((item) => item.endsWith('.js'))) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  try { new Function(source.replace(/^#![^\n]*\n/, '')); } catch (error) { fail(`${file} has invalid JavaScript syntax: ${error.message}`); }
}
const source = [
  'ai/theme-generator/create-theme-specification.js',
  'ai/theme-generator/generate-read-only-theme-package.js',
  'ai/theme-generator/validate-read-only-theme-package.js'
].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
for (const pattern of [/\bfetch\s*\(/, /write_themes/, /shopify\s+theme\s+(?:push|publish|deploy)/i, /admin-api-adapter/i, /shopify-connection-service/i]) {
  if (pattern.test(source)) fail(`Read-only generation engine contains prohibited Shopify network or write behavior (${pattern}).`);
}
if (!/createThemeSpecification/.test(fs.readFileSync(path.join(root, 'pipeline/generate-storefront.js'), 'utf8'))) fail('The storefront pipeline does not create the canonical Theme Specification.');
if (!/generateReadOnlyThemePackage/.test(fs.readFileSync(path.join(root, 'pipeline/generate-storefront.js'), 'utf8'))) fail('The storefront pipeline does not assemble the read-only Calinium One package.');
if (errors.length) {
  process.stderr.write(`Read-only theme generation validation failed:\n- ${errors.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Read-only Theme Generation validation passed: schemas, deterministic package modules, pipeline integration, syntax, and Shopify read-only boundary.\n');
}
