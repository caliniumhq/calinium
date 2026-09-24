#!/usr/bin/env node

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { repositoryPaths } = require('./lib/repository-paths');
const { loadGeneratorMappings } = require('../ai/theme-generator/load-mappings');
const { generateSectionInstances } = require('../ai/theme-generator/generate-section-instances');

const root = path.resolve(__dirname, '..');
const { themeRoot } = repositoryPaths(root);

function read(relative) {
  return fs.readFileSync(path.join(themeRoot, relative), 'utf8');
}

function schema(relative) {
  const source = read(relative);
  const match = source.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  assert.ok(match, `${relative} must contain a section schema.`);
  return { source, value: JSON.parse(match[1]) };
}

function planned(settingId, reference, value) {
  return {
    scope: 'section',
    status: 'proposed',
    setting_id: settingId,
    setting_ref: reference,
    value,
    explanation: { source_mapping: 'scripts/test-premium-collection.js', compiler_decision: 'premium-collection-regression', confidence: 'high', reasoning: 'Focused canonical collection mapping regression.' }
  };
}

function main() {
  const collectionTemplate = JSON.parse(read('templates/collection.json'));
  const searchTemplate = JSON.parse(read('templates/search.json'));
  assert.deepEqual(collectionTemplate.order, ['banner', 'main'], 'Collection template must retain the canonical banner and grid order.');
  assert.equal(collectionTemplate.sections.banner.type, 'collection-banner', 'Collection hero must use the canonical collection-banner section.');
  assert.equal(collectionTemplate.sections.main.type, 'main-collection-product-grid', 'Collection template must use the canonical product grid section.');
  assert.equal(searchTemplate.sections.main.type, 'main-search', 'Search template must use the canonical search section.');

  const banner = schema('sections/collection-banner.liquid');
  const mainCollection = schema('sections/main-collection-product-grid.liquid');
  const mainSearch = schema('sections/main-search.liquid');
  const settingIds = new Set(mainCollection.value.settings.filter((setting) => setting.id).map((setting) => setting.id));
  const stableIds = ['products_per_page', 'mobile_columns', 'desktop_columns', 'image_ratio', 'show_availability', 'show_vendor', 'show_rating', 'show_compare_at_price', 'show_sale_badge', 'show_secondary_image', 'show_inventory', 'enable_quick_add', 'card_alignment', 'show_description', 'color_scheme'];
  stableIds.forEach((id) => assert.ok(settingIds.has(id), `Stable collection setting ${id} must remain available.`));
  ['filter_layout', 'enable_sticky_filters', 'enable_mobile_filter_drawer', 'pagination_mode', 'show_swatches', 'show_new_badge', 'new_badge_tag', 'show_limited_badge', 'limited_badge_tag'].forEach((id) => assert.ok(settingIds.has(id), `Premium collection setting ${id} must exist.`));
  assert.equal(mainCollection.value.settings.find((setting) => setting.id === 'pagination_mode').default, 'pagination', 'Native pages must remain the default pagination mode.');
  assert.equal(mainCollection.value.settings.find((setting) => setting.id === 'enable_mobile_filter_drawer').default, true, 'Mobile filter drawer must be available by default.');
  assert.ok(mainCollection.value.settings.find((setting) => setting.id === 'desktop_columns').options.some((option) => option.value === '5'), 'Premium grid must support five desktop columns.');

  ['show_image', 'show_description', 'image_ratio', 'content_alignment', 'color_scheme', 'image', 'mobile_image', 'editorial_text', 'button_label', 'button_link', 'enable_overlay'].forEach((id) => assert.ok(banner.value.settings.some((setting) => setting.id === id), `Collection hero setting ${id} must exist.`));
  ['mobile_columns', 'desktop_columns', 'show_swatches', 'enable_predictive_search'].forEach((id) => assert.ok(mainSearch.value.settings.some((setting) => setting.id === id), `Search setting ${id} must exist.`));

  for (const token of ["render 'product-card'", "render 'facets'", "render 'sort-select'", "render 'active-filters'", "render 'pagination'", 'data-collection-filter-panel', 'data-collection-filter-dialog', 'data-collection-pagination', 'data-collection-grid']) assert.ok(mainCollection.source.includes(token), `Collection grid must include ${token}.`);
  for (const token of ['collection.image', 'section.settings.image', 'section.settings.mobile_image', 'section.settings.editorial_text', 'section.settings.enable_overlay']) assert.ok(banner.source.includes(token), `Collection hero must safely support ${token}.`);
  for (const token of ['data-predictive-search', "render 'product-card'", "render 'search-result-card'", "render 'facets'", "render 'sort-select'", 'search.filters']) assert.ok(mainSearch.source.includes(token), `Search must include ${token}.`);

  const card = read('snippets/product-card.liquid');
  for (const token of ['option_value.swatch', 'co-product-card__swatches', 'data-quick-view-product-url', 'data-wishlist-product-handle', 'new_badge_tag', 'limited_badge_tag']) assert.ok(card.includes(token), `Canonical product card must support ${token}.`);
  const controller = read('assets/premium-collection.js');
  for (const token of ['showModal', 'IntersectionObserver', 'fetch(nextUrl', 'shopify:section:load', 'shopify:section:unload', 'controllers', 'destroy()', 'prefers-reduced-motion']) assert.ok(controller.includes(token), `Collection enhancement must include ${token}.`);
  assert.ok(!controller.includes('setInterval('), 'Collection enhancement must not create uncontrolled interval timers.');
  const styles = read('assets/section-main-collection.css');
  for (const token of ['co-main-collection--desktop-columns-5', 'co-main-collection__filter-dialog', '[data-progressive-pagination]', 'prefers-reduced-motion']) assert.ok(styles.includes(token), `Collection styles must include ${token}.`);
  assert.ok(styles.includes("[data-collection-enhanced='true']"), 'Progressive styles must only hide native controls after enhancement.');

  const mappings = loadGeneratorMappings(root);
  const generated = generateSectionInstances({
    root,
    templatePath: 'theme/templates/collection.json',
    sourceTemplatePath: 'templates/collection.json',
    pagePlan: {
      sections: [{
        instance_id: 'collection-main-premium',
        section_id: 'main-collection-product-grid',
        position: 2,
        validation_status: 'valid',
        mapped_settings: [
          planned('desktop_columns', 'collection.grid.desktop_columns', '5'),
          planned('filter_layout', 'collection.filters.layout', 'sidebar'),
          planned('pagination_mode', 'collection.pagination.mode', 'load_more'),
          planned('show_swatches', 'collection.product_cards.swatches', true)
        ],
        explanation: { source_mapping: 'test', compiler_decision: 'premium-collection', reasoning: 'Canonical collection mapping test.', confidence: 'high' }
      }]
    },
    approval: { approval_reference: 'premium-collection-approved-inputs', merchant_references: {}, completed_confirmations: [] },
    mappings
  });
  assert.equal(generated.template.sections.main.settings.desktop_columns, '5', 'Approved collection grid settings must survive deterministic generation.');
  assert.equal(generated.template.sections.main.settings.filter_layout, 'sidebar', 'Approved filter layout must survive deterministic generation.');
  assert.equal(generated.template.sections.main.settings.pagination_mode, 'load_more', 'Approved pagination choice must survive deterministic generation.');
  assert.equal(generated.template.sections.main.settings.show_swatches, true, 'Approved card settings must survive deterministic generation.');

  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-premium-collection-'));
  try {
    fs.cpSync(themeRoot, packageRoot, { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'templates', 'collection.json'), `${JSON.stringify(generated.template, null, 2)}\n`);
    for (const file of ['sections/collection-banner.liquid', 'sections/main-collection-product-grid.liquid', 'sections/main-search.liquid', 'snippets/product-card.liquid', 'assets/premium-collection.js', 'assets/section-main-collection.css']) assert.ok(fs.existsSync(path.join(packageRoot, file)), `Generated package must retain ${file}.`);
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }

  const source = [banner.source, mainCollection.source, mainSearch.source, card, controller].join('\n');
  assert.ok(!/write_themes|theme\s+(?:push|publish|deploy)|appPurchase/i.test(source), 'Collection and search system must not add Shopify write, upload, or publish behavior.');
  process.stdout.write('Premium Collection tests passed: canonical templates, shared cards, filters, sorting, progressive pagination, search, responsive grids, generator mapping, package preservation, reduced motion, and read-only boundary.\n');
}

try { main(); } catch (error) { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; }
