#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
function fail(message) { errors.push(message); }
const required = [
  'schemas/calinium-project-asset.schema.json', 'apps/dashboard/server/assets/storage-provider.cjs', 'apps/dashboard/server/assets/local-filesystem-provider.cjs',
  'apps/dashboard/server/assets/file-validation.cjs', 'apps/dashboard/server/assets/palette-extractor.cjs', 'apps/dashboard/server/assets/asset-service.cjs',
  'apps/dashboard/src/components/interview/AssetUploader.jsx', 'apps/dashboard/src/components/interview/ColorPaletteEditor.jsx', 'apps/dashboard/src/components/interview/ReferenceListEditor.jsx',
  'apps/dashboard/src/components/dashboard/AssetLibraryScreen.jsx', 'apps/dashboard/src/components/dashboard/MerchantProfileScreen.jsx', 'scripts/test-merchant-discovery.js',
  'docs/dashboard/discovery.md', 'docs/dashboard/assets.md', 'docs/dashboard/colors.md', 'docs/dashboard/references.md'
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
for (const file of ['schemas/calinium-project-asset.schema.json', 'schemas/calinium-merchant-profile.schema.json', 'apps/dashboard/src/locales/en.json']) {
  try { JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); } catch (error) { fail(`${file} is invalid JSON: ${error.message}`); }
}
for (const file of required.filter((file) => file.endsWith('.cjs') || file.endsWith('.js'))) {
  try { new Function(fs.readFileSync(path.join(root, file), 'utf8').replace(/^#![^\n]*\n/, '')); } catch (error) { fail(`${file} has invalid syntax: ${error.message}`); }
}
const catalog = require('../ai/merchant-interview/merchant-interview-engine').loadMerchantInterview({ root }).catalog;
if (catalog.categories[0]?.id !== 'discovery') fail('Discovery is not the first catalog category.');
for (const id of ['discovery_business_stage', 'discovery_has_existing_website', 'discovery_has_shopify_store', 'discovery_desired_outcomes', 'discovery_creative_freedom', 'content_logo_asset', 'content_manual_color_palette', 'references_inspiration_entries', 'references_competitor_entries']) if (!catalog.questions.some((question) => question.id === id)) fail(`missing discovery question ${id}`);
const profileSchema = JSON.parse(fs.readFileSync(path.join(root, 'schemas/calinium-merchant-profile.schema.json'), 'utf8'));
if (!profileSchema.properties?.enrichment || profileSchema.required.includes('enrichment')) fail('Enriched Merchant Profile must be optional for completed-profile compatibility.');
const assetSource = fs.readFileSync(path.join(root, 'apps/dashboard/server/assets/asset-service.cjs'), 'utf8');
if (!assetSource.includes('requireMembership') || !assetSource.includes('validateUpload') || !assetSource.includes('extractPalette')) fail('Asset service lacks mandatory authorization, validation, or palette boundaries.');
if (errors.length) { console.error(`Merchant Discovery validation failed:\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log('Merchant Discovery validation passed: catalog, optional enriched profile extension, secured asset architecture, dashboard components, localization, and documentation artifacts are present.');
