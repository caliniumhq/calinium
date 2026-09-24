#!/usr/bin/env node
'use strict';

// Static, dependency-free guardrail for Milestone 17. Runtime tests exercise
// behavior; this check prevents accidental removal of the paid-only boundary
// or an expansion into Shopify theme write behavior.
const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { validateCatalog, activePrice } = require('../apps/dashboard/server/custom-themes/price-catalog.cjs');
const { runtimeInventory } = require('./lib/theme-runtime-integrity');
const { repositoryPaths } = require('./lib/repository-paths');

const root = path.resolve(__dirname, '..');
const required = [
  'config/custom-theme-price-catalog.json',
  'schemas/calinium-custom-theme-price-catalog.schema.json',
  'schemas/calinium-custom-theme-order.schema.json',
  'schemas/calinium-shopify-billing-purchase.schema.json',
  'apps/dashboard/server/custom-themes/price-catalog.cjs',
  'apps/dashboard/server/custom-themes/payment-provider.cjs',
  'apps/dashboard/server/custom-themes/development-payment-provider.cjs',
  'apps/dashboard/server/custom-themes/shopify-one-time-billing-provider.cjs',
  'apps/dashboard/server/custom-themes/custom-theme-service.cjs',
  'apps/dashboard/server/shopify/admin-api-adapter.cjs',
  'apps/dashboard/tests/custom-theme-service.test.js',
  'apps/dashboard/tests/shopify-one-time-billing-provider.test.js',
  'docs/dashboard/custom-theme-purchase.md',
  'docs/dashboard/shopify-billing.md'
];
const errors = [];
for (const relative of required) if (!fs.existsSync(path.join(root, relative))) errors.push(`Missing ${relative}.`);

for (const relative of required.filter((item) => item.endsWith('.json'))) {
  try { JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
  catch (error) { errors.push(`${relative} is not valid JSON: ${error.message}`); }
}

try {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'config/custom-theme-price-catalog.json'), 'utf8'));
  const validator = createSchemaValidator(root);
  errors.push(...validator.validateFile(catalog, 'schemas/calinium-custom-theme-price-catalog.schema.json', 'custom_theme_price_catalog'));
  validateCatalog(catalog);
  const developmentPrice = activePrice({ root, env: { CALINIUM_ENVIRONMENT: 'development' } });
  if (!developmentPrice) errors.push('No active development custom-theme price is configured.');
  const productionPrice = activePrice({ root, env: { CALINIUM_ENVIRONMENT: 'production' } });
  if (productionPrice) errors.push('The repository must not ship an active production custom-theme price. Configure it through the production release process.');
} catch (error) { errors.push(error?.message || 'Custom-theme pricing could not be validated.'); }

const source = (relative) => fs.existsSync(path.join(root, relative)) ? fs.readFileSync(path.join(root, relative), 'utf8') : '';
const service = source('apps/dashboard/server/custom-themes/custom-theme-service.cjs');
const provider = source('apps/dashboard/server/custom-themes/shopify-one-time-billing-provider.cjs');
const adapter = source('apps/dashboard/server/shopify/admin-api-adapter.cjs');
const appConfig = `${source('shopify.app.toml')}\n${source('shopify.app.development.toml')}`;

for (const pattern of [/payment_status === 'paid'/, /purchaseIntent/, /snapshot\(/, /claimCustomThemeGeneration/, /sourceThemeChanged/, /recordVerifiedRefund/]) {
  if (!pattern.test(service)) errors.push(`Paid-order service is missing safeguard ${pattern}.`);
}
for (const pattern of [/appPurchaseOneTimeCreate/, /getOneTimePurchase/, /confirmation_url/, /testMode\(\)/]) {
  if (!pattern.test(`${provider}\n${adapter}`)) errors.push(`Shopify one-time billing integration is missing ${pattern}.`);
}
for (const pattern of [/write_themes/i, /theme\s+(?:push|publish|deploy)/i, /createTheme\s*\(/, /uploadTheme\s*\(/, /publishTheme\s*\(/]) {
  if (pattern.test(`${service}\n${provider}\n${adapter}`)) errors.push(`Billing implementation contains prohibited Shopify theme-write behavior (${pattern}).`);
  if (pattern.test(appConfig)) errors.push(`Shopify app configuration requests or implies prohibited theme-write behavior (${pattern}).`);
}

const inventory = runtimeInventory(repositoryPaths(root).themeRoot);
if (!inventory.file_count || !inventory.checksum) errors.push('The Calinium One source theme inventory could not be calculated.');

if (errors.length) {
  process.stderr.write(`Shopify billing validation failed:\n- ${errors.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Shopify billing validation passed: price catalog, schemas, paid-only snapshot boundary, billing provider, no-write invariant, and source-theme inventory (${inventory.file_count} files, ${inventory.checksum}).\n`);
}
