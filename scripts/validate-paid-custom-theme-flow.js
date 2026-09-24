#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'schemas/calinium-custom-theme-input-snapshot.schema.json',
  'schemas/calinium-custom-theme-order.schema.json',
  'apps/dashboard/server/custom-themes/payment-provider.cjs',
  'apps/dashboard/server/custom-themes/development-payment-provider.cjs',
  'apps/dashboard/server/custom-themes/eligibility-evaluator.cjs',
  'apps/dashboard/server/custom-themes/custom-theme-service.cjs',
  'apps/dashboard/src/components/creative-director/CustomThemeOfferScreen.jsx',
  'apps/dashboard/src/components/creative-director/ThemeDeliveryScreen.jsx',
  'apps/dashboard/tests/custom-theme-service.test.js',
  'docs/dashboard/custom-theme-purchase.md',
  'docs/dashboard/custom-theme-delivery.md'
];
const errors = [];
for (const file of required) if (!fs.existsSync(path.join(root, file))) errors.push(`Missing ${file}.`);
for (const file of required.filter((item) => item.endsWith('.json'))) {
  try { JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
  catch (error) { errors.push(`${file} is not valid JSON: ${error.message}`); }
}
for (const file of required.filter((item) => item.endsWith('.cjs'))) {
  try { new Function(fs.readFileSync(path.join(root, file), 'utf8')); }
  catch (error) { errors.push(`${file} has invalid JavaScript syntax: ${error.message}`); }
}
const service = fs.existsSync(path.join(root, 'apps/dashboard/server/custom-themes/custom-theme-service.cjs'))
  ? fs.readFileSync(path.join(root, 'apps/dashboard/server/custom-themes/custom-theme-service.cjs'), 'utf8') : '';
for (const pattern of [/write_themes/i, /shopify\s+theme\s+(?:push|publish|deploy)/i, /createTheme\s*\(/, /uploadTheme\s*\(/, /publishTheme\s*\(/]) {
  if (pattern.test(service)) errors.push(`Paid custom-theme service contains prohibited Shopify theme write behavior (${pattern}).`);
}
for (const requiredPattern of [/payment_status === 'paid'/, /sourceThemeChanged/, /relativeOutputPath/, /readArtifact/, /idempotency/i]) {
  if (!requiredPattern.test(service)) errors.push(`Paid custom-theme service is missing required safeguard ${requiredPattern}.`);
}
const api = fs.existsSync(path.join(root, 'apps/dashboard/server/dashboard-api.cjs'))
  ? fs.readFileSync(path.join(root, 'apps/dashboard/server/dashboard-api.cjs'), 'utf8') : '';
for (const endpoint of ['custom-theme', 'eligibility|offer', 'orders', 'themeArtifact']) {
  if (!api.includes(endpoint)) errors.push(`Dashboard API is missing paid custom-theme route support for ${endpoint}.`);
}
if (errors.length) {
  process.stderr.write(`Paid custom-theme validation failed:\n- ${errors.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Paid custom-theme validation passed: schemas, order boundary, immutable snapshot safeguards, secure artifact routes, and no Shopify theme-write behavior.\n');
}
