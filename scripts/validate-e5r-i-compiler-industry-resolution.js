#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { resolveCompilerIndustry, supportedProfileIds, CONTRACT_VERSION, GENERIC_PROFILE_ID } = require('../ai/compiler/compiler-industry-resolver');
const { validateSchema } = require('../ai/shared/schema');

const root = path.resolve(__dirname, '..');
const errors = [];
function fail(message) { errors.push(message); }
function source(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function json(file) { return JSON.parse(source(file)); }

const required = [
  'ai/compiler/compiler-industry-resolver.js',
  'ai/compiler/compile-valid-strategy.js',
  'schemas/compiler-supported-industry-resolution.schema.json',
  'fixtures/e5r-i-snowboard-store-strategy.json',
  'scripts/test-e5r-i-compiler-industry-resolution.js',
  'apps/dashboard/tests/e5r-i-compiler-industry-resolution.test.js',
  'docs/architecture/calinium-core-2-phase-e5r-i-compiler-industry-resolution-valid-strategy-fallback.md'
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);

for (const file of ['schemas/compiler-supported-industry-resolution.schema.json', 'schemas/store-strategy.schema.json', 'schemas/merchant-profile.schema.json', 'fixtures/e5r-i-snowboard-store-strategy.json', 'package.json']) {
  try { json(file); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); }
}

try {
  const resolution = resolveCompilerIndustry({ merchantUnderstanding: { productsOrServices: ['Snowboards and snowboard wax.'] } }, { root });
  const schemaErrors = validateSchema(resolution, 'schemas/compiler-supported-industry-resolution.schema.json', { root, location: 'E5R-I resolution' });
  if (schemaErrors.length) fail(`resolution schema failed: ${schemaErrors.join('; ')}`);
  if (resolution.contract_version !== CONTRACT_VERSION || resolution.compiler_profile_id !== 'sports' || resolution.status !== 'supported_profile') fail('snowboard resolution does not bind the approved v1 sports outcome');
  if (!supportedProfileIds(root).includes(GENERIC_PROFILE_ID)) fail('general_retail is not available as the registered generic execution profile');
} catch (error) { fail(`resolver validation failed: ${error.message}`); }

for (const file of ['ai/compiler/compiler-industry-resolver.js', 'ai/compiler/compile-valid-strategy.js']) {
  const text = source(file);
  if (/openai|responses api|gpt-|fetch\s*\(|shopify/i.test(text)) fail(`${file} contains a network, model, or Shopify dependency`);
  if (/writeFileSync|appendFileSync|unlinkSync|rmSync/.test(text)) fail(`${file} mutates files`);
}

try {
  const changed = execFileSync('git', ['diff', '--name-only', '--', 'apps/theme', 'ai/architecture', 'ai/design-dna'], { cwd: root, encoding: 'utf8' }).trim();
  if (changed) fail(`forbidden runtime/architecture files changed: ${changed.replace(/\n/g, ', ')}`);
} catch (error) { fail(`could not inspect protected source scope: ${error.message}`); }

try {
  const scripts = json('package.json').scripts || {};
  if (!scripts['test:e5r-i'] || !scripts['validate:e5r-i']) fail('E5R-I package commands are missing');
} catch {}

if (fs.existsSync(path.join(root, required.at(-1)))) {
  const doc = source(required.at(-1));
  for (const phrase of ['release 4', 'Snowboards and snowboard wax', CONTRACT_VERSION, 'general_retail', 'hero-slideshow', 'editorial-hero', 'deployment pending', 'OpenAI/model calls: 0', 'Shopify writes: 0']) if (!doc.toLowerCase().includes(phrase.toLowerCase())) fail(`E5R-I documentation omits ${phrase}`);
}

const fixtureText = source('fixtures/e5r-i-snowboard-store-strategy.json');
if (/shpat_|shpua_|sk-[a-z0-9]|client_secret|access_token|theme_access_password/i.test(fixtureText)) fail('E5R-I fixture contains a credential-like literal');

if (errors.length) {
  console.error(`E5R-I validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`E5R-I validation passed: ${required.length} required artifacts, ${supportedProfileIds(root).length} compiler profiles, versioned resolver, bounded generic fallback, protected source scope, schemas, and zero credential literals.`);
