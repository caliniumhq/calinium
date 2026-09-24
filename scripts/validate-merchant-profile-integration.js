#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { runtimeInventory } = require('./lib/theme-runtime-integrity');
const { repositoryPaths } = require('./lib/repository-paths');
const { resolveThemeRuntimeBaseline } = require('./lib/preservation-backup');

const root = path.resolve(__dirname, '..');
const required = [
  'schemas/merchant-profile.schema.json',
  'pipeline/approval-gate.js', 'pipeline/create-merchant-profile.js', 'pipeline/map-merchant-profile.js', 'pipeline/resolve-approved-draft.js',
  'pipeline/generate-storefront.js', 'pipeline/generate-storefront-cli.js', 'pipeline/preview-package.js',
  'scripts/test-merchant-profile-integration.js', 'docs/architecture/theme-generation-pipeline.md', 'docs/architecture/merchant-profile.md', 'docs/guides/theme-generation.md'
];
const errors = [];
for (const file of required) if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required integration file ${file}.`);
for (const file of ['schemas/merchant-profile.schema.json', 'package.json']) {
  try { JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); } catch (error) { errors.push(`${file} is invalid JSON: ${error.message}`); }
}
for (const file of required.filter((file) => file.endsWith('.js'))) {
  try { new Function(fs.readFileSync(path.join(root, file), 'utf8').replace(/^#![^\n]*\n/, '')); } catch (error) { errors.push(`${file} has invalid JavaScript syntax: ${error.message}`); }
}
const source = fs.readFileSync(path.join(root, 'pipeline/generate-storefront.js'), 'utf8');
for (const fragment of ['createMerchantProfile', 'mapMerchantProfile', 'compileStorefrontStrategy', 'buildDraftConfiguration', 'generateTheme']) {
  if (!source.includes(fragment)) errors.push(`pipeline/generate-storefront.js does not compose ${fragment}.`);
}
if (/Creative Director v1 ends with a reviewable Store Strategy/.test(source)) errors.push('The retired generation stub remains active.');
const validator = createSchemaValidator(root);
try {
  const schema = JSON.parse(fs.readFileSync(path.join(root, 'schemas/merchant-profile.schema.json'), 'utf8'));
  if (!schema.properties?.generation || !schema.properties?.traceability) errors.push('Canonical Merchant Profile schema lacks required generation or traceability contracts.');
} catch { /* JSON parse error is already reported. */ }
const paths = repositoryPaths(root);
const inventory = runtimeInventory(paths.themeRoot);
const runtimeBaseline = resolveThemeRuntimeBaseline(root);
if (!runtimeBaseline) errors.push('No approved Shopify runtime baseline is available.');
else if (inventory.file_count !== runtimeBaseline.runtime.file_count || inventory.byte_count !== runtimeBaseline.runtime.byte_count || inventory.checksum !== runtimeBaseline.runtime.checksum) errors.push(`Shopify runtime integrity differs from the approved ${runtimeBaseline.id} baseline.`);
if (errors.length) { process.stderr.write(`Merchant Profile integration validation failed:\n- ${errors.join('\n- ')}\n`); process.exitCode = 1; }
else process.stdout.write('Merchant Profile integration validation passed: schema, pipeline composition, syntax, documentation, and Shopify runtime preservation.\n');
