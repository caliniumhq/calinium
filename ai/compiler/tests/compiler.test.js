'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { compileStorefrontStrategy, validateProfile, ProfileValidationError } = require('../compile-strategy');

const root = path.resolve(__dirname, '../../..');
const validDirectory = path.join(root, 'ai/compiler/fixtures/valid');
const invalidDirectory = path.join(root, 'ai/compiler/fixtures/invalid');
function fixture(directory, file) { return JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')); }

const expectedRecipes = {
  'luxury-leather-bags.json': 'luxury_story',
  'beauty.json': 'beauty_discovery',
  'electronics.json': 'technology_clarity',
  'jewelry.json': 'luxury_story',
  'furniture.json': 'editorial_discovery',
  'food.json': 'food_story',
  'hospitality.json': 'hospitality_escape',
  'digital-products.json': 'service_trust'
};

for (const [file, recipe] of Object.entries(expectedRecipes)) {
  const profile = fixture(validDirectory, file);
  const first = compileStorefrontStrategy(profile, { root });
  const second = compileStorefrontStrategy(profile, { root });
  assert.deepStrictEqual(first, second, `${file} must compile deterministically`);
  assert.strictEqual(first.validation_report.valid, true, `${file} should produce a valid strategy`);
  assert.strictEqual(first.homepage_recipe, recipe, `${file} should select ${recipe}`);
  assert.ok(first.ordered_sections.length > 0, `${file} should select sections`);
  assert.ok(first.explanations.every((item) => item.reasoning && Array.isArray(item.sources)), `${file} should have explainable decisions`);
}

const luxury = compileStorefrontStrategy(fixture(validDirectory, 'luxury-leather-bags.json'), { root });
assert.ok(luxury.merchant_verification.required.length > 0, 'Founder/craft strategy should surface verification requirements');
assert.ok(!luxury.merchant_assets.missing.some((item) => item.asset === 'founder_portrait'), 'Declared founder portrait should not be missing');

const missingAsset = compileStorefrontStrategy(fixture(invalidDirectory, 'missing-required-asset.json'), { root });
assert.ok(missingAsset.merchant_assets.missing.some((item) => item.asset === 'founder_portrait'), 'Missing founder portrait must be detected');
assert.strictEqual(missingAsset.content_safety.status, 'blocked_pending_merchant_input', 'Missing asset should block publication planning');

const unresolved = compileStorefrontStrategy(fixture(validDirectory, 'unresolved-input.json'), { root });
assert.strictEqual(unresolved.resolutions.industry, null, 'Missing industry must remain unresolved');
assert.strictEqual(unresolved.decisions.industry.confidence, 'unresolved', 'Unresolved industry must retain unresolved confidence');
assert.strictEqual(unresolved.content_safety.status, 'unresolved', 'Core missing inputs must be visible as unresolved rather than invented');

for (const file of ['unknown-industry.json', 'conflicting-personalities.json', 'missing-required-fields.json']) {
  const profile = fixture(invalidDirectory, file);
  const validation = validateProfile(profile, { root });
  assert.strictEqual(validation.valid, false, `${file} should fail profile validation`);
  assert.throws(() => compileStorefrontStrategy(profile, { root }), ProfileValidationError, `${file} should not compile`);
}

const cliOutput = execFileSync(process.execPath, ['compile-storefront-strategy.js', 'explain', '--input', 'ai/compiler/fixtures/valid/electronics.json', '--pretty', '--stdout'], { cwd: root, encoding: 'utf8' });
const explanations = JSON.parse(cliOutput);
assert.ok(Array.isArray(explanations) && explanations.length === 13, 'CLI explain should emit all resolution-stage explanations');

const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-compiler-'));
const outputFile = path.join(outputDirectory, 'strategy.json');
execFileSync(process.execPath, ['compile-storefront-strategy.js', 'compile', '--input', 'ai/compiler/fixtures/valid/electronics.json', '--output', outputFile, '--pretty'], { cwd: root, encoding: 'utf8' });
assert.strictEqual(JSON.parse(fs.readFileSync(outputFile, 'utf8')).homepage_recipe, 'technology_clarity', 'CLI should support explicit non-storefront file output');
const protectedOutput = path.join(root, 'config', 'compiler-output-do-not-write.json');
assert.throws(() => execFileSync(process.execPath, ['compile-storefront-strategy.js', 'compile', '--input', 'ai/compiler/fixtures/valid/electronics.json', '--output', protectedOutput], { cwd: root, encoding: 'utf8', stdio: 'pipe' }), 'CLI must reject Shopify runtime output paths');
assert.ok(!fs.existsSync(protectedOutput), 'CLI must not create a file in config');

console.log(`AI strategy compiler tests passed: ${Object.keys(expectedRecipes).length} valid scenarios, 3 invalid profiles, asset detection, explainability, safe CLI output, and determinism.`);
