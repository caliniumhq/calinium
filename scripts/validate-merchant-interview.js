#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { loadMerchantInterview, buildMerchantProfile } = require('../ai/merchant-interview/merchant-interview-engine');

const root = path.resolve(__dirname, '..');
const errors = [];
const modules = ['merchant-interview-engine', 'question-catalog', 'interview-schema', 'branching-engine', 'answer-validator', 'merchant-profile-builder', 'interview-session', 'summary-generator', 'utils'];
const requiredDocs = ['docs/merchant-interview/README.md', 'docs/merchant-interview/architecture.md', 'docs/merchant-interview/question-catalog.md', 'docs/merchant-interview/merchant-profile.md', 'docs/merchant-interview/branching.md'];
const requiredTypes = ['text', 'textarea', 'number', 'currency', 'boolean', 'multiple_choice', 'single_choice', 'tags', 'url', 'url_or_domain', 'email', 'upload_placeholder', 'color', 'image_placeholder', 'asset_reference', 'color_palette', 'reference_list'];
function fail(message) { errors.push(message); }

for (const module of modules) {
  const file = path.join(root, 'ai/merchant-interview', `${module}.js`);
  if (!fs.existsSync(file)) { fail(`Missing Merchant Interview module ${module}.`); continue; }
  const source = fs.readFileSync(file, 'utf8');
  try { new Function(source); } catch (error) { fail(`${module} has invalid JavaScript syntax: ${error.message}`); }
  if (/\{%-?|\{\{\s*|shopify:\w+|fetch\s*\(|writeFileSync|appendFileSync|unlinkSync|rmSync|theme\s+(push|publish)|cart\/add\.js/.test(source)) fail(`${module} contains a prohibited runtime, network, storefront, or write dependency.`);
}
for (const file of ['schemas/calinium-merchant-interview.schema.json', 'schemas/calinium-interview-session.schema.json', 'schemas/calinium-merchant-profile.schema.json', 'schemas/calinium-project-asset.schema.json', 'scripts/test-merchant-interview.js', ...requiredDocs]) {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing Merchant Interview artifact ${file}.`);
}
for (const file of ['schemas/calinium-merchant-interview.schema.json', 'schemas/calinium-interview-session.schema.json', 'schemas/calinium-merchant-profile.schema.json', 'schemas/calinium-project-asset.schema.json']) {
  try { JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); } catch (error) { fail(`${file} is invalid JSON: ${error.message}`); }
}
try {
  const profileSchema = JSON.parse(fs.readFileSync(path.join(root, 'schemas/calinium-merchant-profile.schema.json'), 'utf8'));
  const requiredProfileFields = ['version', 'business', 'industry', 'subcategory', 'catalog', 'audience', 'goals', 'assets', 'preferences', 'brand_personality'];
  if (profileSchema.title !== 'Calinium merchant profile' || profileSchema.additionalProperties !== false || requiredProfileFields.some((field) => !profileSchema.required?.includes(field))) fail('Existing canonical merchant-profile schema does not retain its expected compiler contract.');
} catch (error) { fail(`Could not read the existing canonical merchant-profile schema: ${error.message}`); }
try {
  const { catalog, validation } = loadMerchantInterview({ root });
  if (!validation.valid) fail(`Interview catalog is invalid: ${validation.errors.join('; ')}`);
  const categories = ['discovery', 'business', 'brand', 'audience', 'products', 'design', 'brand_references', 'features', 'content', 'goals'];
  for (const category of categories) if (!catalog.categories.some((item) => item.id === category)) fail(`Interview category ${category} is missing.`);
  if (catalog.categories[0]?.id !== 'discovery') fail('Discovery must be the first interview category.');
  const types = new Set(catalog.questions.map((question) => question.answer_type));
  for (const type of requiredTypes) if (!types.has(type)) fail(`Interview catalog does not exercise required answer type ${type}.`);
  if (new Set(catalog.questions.map((question) => question.id)).size !== catalog.questions.length) fail('Interview catalog contains duplicate question IDs.');
  if (catalog.questions.some((question) => !Object.prototype.hasOwnProperty.call(question, 'mapping_destination'))) fail('Interview catalog has a question without a mapping destination declaration.');
  const profile = buildMerchantProfile({ root, catalog, answers: {
    discovery_business_stage: 'established_business', discovery_has_existing_website: 'no_existing_website', discovery_has_shopify_store: false, discovery_desired_outcomes: ['improve_brand_positioning'], discovery_creative_freedom: 'refine_existing_identity',
    business_brand_name: 'Validator Brand', business_model: 'direct_to_consumer', business_industry: 'luxury_fashion', business_product_category: 'bags', business_stage: 'operating', business_store_status: 'existing_store',
    brand_personality_primary: 'luxury', brand_personality_secondary: ['sophisticated'], audience_customer_type: 'Luxury shoppers', audience_needs: ['material detail'], audience_market_model: 'b2c', audience_price_positioning: 'premium',
    product_types: ['bags'], product_sku_count: 1, product_delivery: ['physical'], product_has_variants: true,
    design_preferred_style: ['luxury'], design_content_density: 'low', design_page_type: 'homepage', content_logo_status: 'no_logo', content_color_source: 'let_calinium_suggest', content_typography_preference: 'no_preference', goals_primary: ['luxury']
  } });
  if (!profile.validation.valid) fail(`Interview builder produced an invalid merchant profile: ${profile.validation.errors.join('; ')}`);
} catch (error) { fail(`Merchant Interview catalog/profile integration failed: ${error.message}`); }

if (errors.length) { console.error(`Merchant Interview validation failed:\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`Merchant Interview validation passed: ${modules.length} isolated modules, version-compatible enriched profile schema, ten categories, answer types, mapping, asset metadata, and documentation artifacts.`);
