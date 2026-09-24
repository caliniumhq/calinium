#!/usr/bin/env node

/*
 * Development-only guardrails for the additive Commerce & Merchandising Pack.
 * Shopify schemas cannot validate cross-file architecture, so keep this check
 * alongside the theme rather than shipping it as storefront JavaScript.
 */
const fs = require('fs');
const path = require('path');
const { repositoryPaths } = require('./lib/repository-paths');

const root = path.resolve(__dirname, '..');
const paths = repositoryPaths(root);
const sectionDirectory = path.join(paths.themeRoot, 'sections');
const schemaLocale = JSON.parse(fs.readFileSync(path.join(paths.themeRoot, 'locales', 'en.default.schema.json'), 'utf8'));
const iconRenderer = fs.readFileSync(path.join(paths.themeRoot, 'snippets', 'icon.liquid'), 'utf8');
const canonicalIcons = new Set([...iconRenderer.matchAll(/when '([^']+)'/g)].map((match) => match[1]));

const sections = [
  'product-carousel',
  'collection-carousel',
  'collection-tabs',
  'featured-categories',
  'shop-the-look',
  'product-comparison',
  'product-highlights',
  'product-bundle-showcase',
  'recently-viewed-products',
  'product-recommendations',
  'cross-sell-products',
  'complementary-products'
];
const productSections = new Set([
  'product-carousel', 'collection-tabs', 'shop-the-look', 'product-comparison',
  'product-highlights', 'product-bundle-showcase', 'recently-viewed-products',
  'product-recommendations', 'cross-sell-products', 'complementary-products'
]);
const interactiveSections = new Set([
  'product-carousel', 'collection-carousel', 'collection-tabs', 'shop-the-look',
  'recently-viewed-products', 'product-recommendations', 'complementary-products'
]);

function fail(message) {
  throw new Error(`Commerce pack validation failed: ${message}`);
}

function read(file) {
  return fs.readFileSync(path.join(sectionDirectory, `${file}.liquid`), 'utf8');
}

function schemaFor(file) {
  const source = read(file);
  const match = source.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  if (!match) fail(`sections/${file}.liquid has no schema`);
  return JSON.parse(match[1]);
}

function localeValue(key) {
  return key.replace(/^t:/, '').split('.').reduce((value, part) => value && value[part], schemaLocale);
}

function everyTranslation(value, sourceName) {
  if (typeof value === 'string' && value.startsWith('t:') && typeof localeValue(value) !== 'string') {
    fail(`${sourceName} is missing schema locale ${value}`);
  }
  if (Array.isArray(value)) value.forEach((item) => everyTranslation(item, sourceName));
  if (value && typeof value === 'object') Object.values(value).forEach((item) => everyTranslation(item, sourceName));
}

function inspectSettings(settings, sourceName) {
  for (const setting of settings || []) {
    if (setting.type === 'select') {
      const values = (setting.options || []).map((option) => option.value);
      if (!values.includes(setting.default)) fail(`${sourceName}.${setting.id} default is not an option`);
      if (values.length !== new Set(values).size) fail(`${sourceName}.${setting.id} has duplicate option values`);
    }
    if (typeof setting.label === 'string' && setting.label.startsWith('t:') && typeof localeValue(setting.label) !== 'string') {
      fail(`${sourceName}.${setting.id} is missing schema locale ${setting.label}`);
    }
  }
}

for (const file of sections) {
  const source = read(file);
  const schema = schemaFor(file);
  if (!schema.presets?.length) fail(`sections/${file}.liquid has no Add section preset`);
  if (typeof localeValue(schema.name) !== 'string') fail(`sections/${file}.liquid is missing its section name locale`);
  everyTranslation(schema, file);
  inspectSettings(schema.settings, file);
  for (const block of schema.blocks || []) {
    inspectSettings(block.settings, `${file}:${block.type}`);
    if (block.limit && block.limit > 12) fail(`${file}:${block.type} has an unreasonable block limit`);
  }
  if (schema.max_blocks && schema.max_blocks > 16) fail(`${file} has an unreasonable block limit`);
  for (const setting of [...(schema.settings || []), ...(schema.blocks || []).flatMap((block) => block.settings || [])]) {
    if (setting.id?.includes('products_to_show') && setting.max > 12) fail(`${file}.${setting.id} renders too many products`);
    if (setting.id?.includes('icon')) {
      for (const option of setting.options || []) {
        if (option.value !== 'none' && !canonicalIcons.has(option.value)) fail(`${file}.${setting.id} exposes unsupported icon ${option.value}`);
      }
    }
  }
  if (productSections.has(file) && !source.includes("render 'product-card'")) fail(`${file} must render the canonical product-card`);
  if (source.includes('cart/add.js') || source.includes('routes.cart_add_url')) fail(`${file} introduces a parallel cart endpoint`);
  if (source.includes('<form') || source.includes('<product-form')) fail(`${file} appears to introduce a second Quick Add form`);
  if (/co-product-card__(media|details|title|quick-add)/.test(source)) fail(`${file} appears to copy product-card markup`);
  if (schema.blocks?.length && !source.includes('block.shopify_attributes')) fail(`${file} has blocks but does not emit Shopify block attributes`);
  if (interactiveSections.has(file) && !source.includes('data-co-section-behavior')) fail(`${file} lacks the Calinium lifecycle hook`);
  if (/\sid="[^"]*"/.test(source) && [...source.matchAll(/\sid="([^"]*)"/g)].some((match) => !match[1].includes('section.id'))) fail(`${file} has a fixed HTML id`);
  for (const asset of source.matchAll(/'([^']+)'\s*\|\s*asset_url/g)) {
    if (!fs.existsSync(path.join(paths.themeRoot, 'assets', asset[1]))) fail(`${file} references missing asset ${asset[1]}`);
  }
  for (const snippet of source.matchAll(/render\s+'([^']+)'/g)) {
    if (!fs.existsSync(path.join(paths.themeRoot, 'snippets', `${snippet[1]}.liquid`))) fail(`${file} references missing snippet ${snippet[1]}`);
  }
}

const commerceCss = path.join(paths.themeRoot, 'assets', 'section-commerce-pack.css');
if (!fs.existsSync(commerceCss)) fail('missing assets/section-commerce-pack.css');
const lifecycle = fs.readFileSync(path.join(paths.themeRoot, 'assets', 'calinium-sections.js'), 'utf8');
for (const controller of ['CommerceTabsController', 'ShopTheLookController', 'RecentlyViewedController', 'CommerceRecommendationController']) {
  if (!lifecycle.includes(`class ${controller}`)) fail(`missing ${controller} lifecycle controller`);
}
for (const lifecycleEvent of ['shopify:section:load', 'shopify:section:unload', 'shopify:block:select']) {
  if (!lifecycle.includes(lifecycleEvent)) fail(`missing ${lifecycleEvent} lifecycle handling`);
}
if (!lifecycle.includes("calinium:content:replace")) fail('dynamic product-card replacement is not reinitialized');
const recentlyViewed = read('recently-viewed-products');
if (!recentlyViewed.includes('calinium:recently-viewed:v1') && !lifecycle.includes('calinium:recently-viewed:v1')) fail('recently viewed storage key is not namespaced');
for (const file of ['product-recommendations', 'complementary-products']) {
  if (!read(file).includes('routes.product_recommendations_url')) fail(`${file} does not use Shopify recommendations routing`);
}

console.log(`Commerce pack validation passed: ${sections.length} sections, ${productSections.size} canonical product-card consumers.`);
