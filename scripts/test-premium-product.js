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
const sectionPath = path.join(themeRoot, 'sections', 'main-product.liquid');
const section = fs.readFileSync(sectionPath, 'utf8');
const schema = JSON.parse(section.match(/\{% schema %\}\s*([\s\S]*?)\s*\{% endschema %\}/)[1]);

function setting(id) {
  return schema.settings.find((item) => item.id === id);
}

function planned(settingId, reference, value) {
  return {
    scope: 'section',
    status: 'proposed',
    setting_id: settingId,
    setting_ref: reference,
    value,
    explanation: {
      source_mapping: 'scripts/test-premium-product.js',
      compiler_decision: 'premium-product-regression',
      confidence: 'high',
      reasoning: 'Focused canonical product mapping regression.'
    }
  };
}

function main() {
  const productTemplate = JSON.parse(fs.readFileSync(path.join(themeRoot, 'templates', 'product.json'), 'utf8'));
  const main = productTemplate.sections[productTemplate.order[0]];
  assert.equal(main.type, 'main-product', 'The canonical product template must lead with main-product.');
  assert.deepEqual(productTemplate.order, ['main', 'recommendations', 'recently_viewed'], 'The canonical product template must retain product recommendations and recently viewed discovery.');
  assert.equal(productTemplate.sections.recommendations.type, 'product-recommendations', 'Related-product recommendations must use the existing recommendation primitive.');
  assert.equal(productTemplate.sections.recently_viewed.type, 'recently-viewed-products', 'Recently viewed products must use the existing safe primitive.');

  for (const file of [
    'sections/main-product.liquid',
    'snippets/product-media.liquid',
    'snippets/product-form.liquid',
    'snippets/product-form-controls.liquid',
    'snippets/product-highlight.liquid',
    'snippets/variant-picker.liquid',
    'assets/product-gallery.js',
    'assets/product-form.js',
    'assets/variant-picker.js',
    'assets/premium-product.js',
    'assets/section-main-product.css'
  ]) assert.ok(fs.existsSync(path.join(themeRoot, file)), `Canonical Premium Product source must include ${file}.`);

  const stableIds = ['show_vendor', 'show_sku', 'show_inventory', 'low_inventory_threshold', 'low_inventory_message', 'variant_picker_type', 'gallery_layout', 'content_width', 'color_scheme'];
  for (const id of stableIds) assert.ok(setting(id), `Stable product setting ${id} must remain available.`);
  for (const id of ['thumbnail_position', 'mobile_gallery_layout', 'enable_image_zoom', 'enable_fullscreen', 'show_barcode', 'show_product_type', 'show_dynamic_checkout', 'enable_sticky_add_to_cart_mobile', 'enable_sticky_add_to_cart_desktop']) assert.ok(setting(id), `Premium product setting ${id} must exist.`);
  assert.equal(setting('enable_image_zoom').default, true, 'Image zoom should be available by default.');
  assert.equal(setting('enable_fullscreen').default, true, 'Fullscreen viewer should be available by default.');
  assert.equal(setting('enable_sticky_add_to_cart_mobile').default, true, 'Mobile sticky Add to Cart should be enabled by default.');

  for (const block of ['information_row', 'trust_block', 'highlight', '@app']) assert.ok(schema.blocks.some((item) => item.type === block), `Product system must preserve ${block} block compatibility.`);
  for (const token of ['data-premium-product', 'data-product-gallery', 'data-product-media-list', 'data-product-thumbnail', 'data-premium-gallery-fullscreen', 'data-premium-gallery-zoom', 'data-premium-gallery-dialog', 'data-premium-sticky-add', 'data-premium-purchase-area', "render 'product-media'", "render 'product-form'", "render 'product-highlight'"]) assert.ok(section.includes(token), `Product section must contain ${token}.`);
  assert.ok(section.includes("'product-1' | placeholder_svg_tag"), 'Empty product preview must retain a safe placeholder.');
  assert.ok(section.includes('shop.name | escape'), 'Empty product fallback must use the real shop name rather than invented marketing copy.');

  const media = fs.readFileSync(path.join(themeRoot, 'snippets', 'product-media.liquid'), 'utf8');
  for (const token of ["when 'image'", "when 'video'", "when 'external_video'", "when 'model'", "render 'responsive-image'", 'data-media-preview-url']) assert.ok(media.includes(token), `Product media must support ${token}.`);
  const variant = fs.readFileSync(path.join(themeRoot, 'snippets', 'variant-picker.liquid'), 'utf8');
  for (const token of ['data-variant-display-price', 'data-variant-title', 'data-variant-media-id', 'option_value.swatch', 'data-variant-option-input']) assert.ok(variant.includes(token), `Variant picker must carry ${token}.`);
  const form = fs.readFileSync(path.join(themeRoot, 'assets', 'product-form.js'), 'utf8');
  for (const token of ['updateVariantUrl()', 'data-product-price-template', 'data-product-sku-template', 'data-product-barcode-template', 'data-product-inventory-template', 'cart/add.js']) assert.ok(form.includes(token), `Product form must support ${token}.`);
  const gallery = fs.readFileSync(path.join(themeRoot, 'assets', 'product-gallery.js'), 'utf8');
  for (const token of ['handleThumbnailKeydown', 'scrollIntoView', 'calinium:product-media-change', 'shopify:section:unload']) assert.ok(gallery.includes(token), `Gallery behavior must include ${token}.`);
  const controller = fs.readFileSync(path.join(themeRoot, 'assets', 'premium-product.js'), 'utf8');
  for (const token of ['IntersectionObserver', 'requestSubmit', 'showModal', 'handleDialogKeydown', 'shopify:section:load', 'shopify:section:unload', 'shopify:section:select', 'shopify:section:deselect', 'shopify:block:select', 'shopify:block:deselect', 'controllerMap', 'destroy()']) assert.ok(controller.includes(token), `Premium product controller must include ${token}.`);
  assert.ok(!controller.includes('setInterval('), 'Premium product controller must not introduce repeated interval timers.');
  const styles = fs.readFileSync(path.join(themeRoot, 'assets', 'section-main-product.css'), 'utf8');
  for (const token of ['co-main-product--mobile-gallery-swipe', 'co-main-product__sticky-add', 'co-main-product__media-dialog', 'data-zoomed', '@media (prefers-reduced-motion: reduce)', 'scroll-snap-type']) assert.ok(styles.includes(token), `Product styles must cover ${token}.`);
  const structured = fs.readFileSync(path.join(themeRoot, 'layout', 'theme.liquid'), 'utf8');
  assert.ok(structured.includes("render 'structured-data-product'"), 'Product structured data must remain enabled in the canonical layout.');

  const mappings = loadGeneratorMappings(root);
  const generated = generateSectionInstances({
    root,
    templatePath: 'theme/templates/product.json',
    sourceTemplatePath: 'templates/product.json',
    pagePlan: {
      sections: [{
        instance_id: 'product-main-premium',
        section_id: 'main-product',
        position: 1,
        validation_status: 'valid',
        mapped_settings: [
          planned('gallery_layout', 'product.gallery.layout', 'carousel'),
          planned('thumbnail_position', 'product.gallery.thumbnails', 'left'),
          planned('enable_sticky_add_to_cart_mobile', 'product.purchase.mobile_sticky', true),
          planned('show_dynamic_checkout', 'product.purchase.dynamic_checkout', true)
        ],
        explanation: { source_mapping: 'test', compiler_decision: 'premium-product', reasoning: 'Canonical product mapping test.', confidence: 'high' }
      }]
    },
    approval: {
      approval_reference: 'premium-product-approved-inputs',
      merchant_references: {},
      completed_confirmations: []
    },
    mappings
  });
  assert.equal(generated.template.sections.main.settings.gallery_layout, 'carousel', 'Approved gallery presentation must merge into the preserved canonical product section.');
  assert.equal(generated.template.sections.main.settings.thumbnail_position, 'left', 'Approved thumbnail position must merge into the canonical product section.');
  assert.equal(generated.template.sections.main.settings.enable_sticky_add_to_cart_mobile, true, 'Approved mobile purchase settings must survive deterministic generation.');
  assert.equal(generated.template.sections.main.settings.show_dynamic_checkout, true, 'Approved accelerated checkout setting must survive deterministic generation.');

  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-premium-product-'));
  try {
    fs.cpSync(themeRoot, packageRoot, { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'templates', 'product.json'), `${JSON.stringify(generated.template, null, 2)}\n`);
    const packaged = JSON.parse(fs.readFileSync(path.join(packageRoot, 'templates', 'product.json'), 'utf8'));
    assert.equal(packaged.sections.main.type, 'main-product', 'Generated package must retain the canonical product section.');
    for (const file of ['sections/main-product.liquid', 'snippets/product-highlight.liquid', 'assets/premium-product.js', 'assets/section-main-product.css']) assert.ok(fs.existsSync(path.join(packageRoot, file)), `Generated package must retain ${file}.`);
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }

  const productSource = [section, media, variant, form, gallery, controller].join('\n');
  assert.ok(!/write_themes|theme\s+(?:push|publish|deploy)|appPurchase/i.test(productSource), 'Product system must not add Shopify write, upload, or publish behavior.');
  process.stdout.write('Premium Product tests passed: canonical template, gallery/media, variants, progressive purchase controls, sticky add-to-cart, fullscreen and zoom lifecycle, trust content, recommendations, structured data, reduced motion, generator merge, package preservation, and read-only boundary.\n');
}

try { main(); } catch (error) { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; }
