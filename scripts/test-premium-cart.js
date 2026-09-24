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
    explanation: {
      source_mapping: 'scripts/test-premium-cart.js',
      compiler_decision: 'premium-cart-regression',
      confidence: 'high',
      reasoning: 'Focused canonical cart mapping regression.'
    }
  };
}

function main() {
  const cartTemplate = JSON.parse(read('templates/cart.json'));
  assert.deepEqual(cartTemplate.order, ['main'], 'Cart template must retain one canonical main cart section.');
  assert.equal(cartTemplate.sections.main.type, 'main-cart', 'Cart template must use canonical main-cart.');

  const mainCart = schema('sections/main-cart.liquid');
  const cartDrawer = schema('sections/cart-drawer.liquid');
  const mainSettings = new Map(mainCart.value.settings.filter((setting) => setting.id).map((setting) => [setting.id, setting]));
  const drawerSettings = new Map(cartDrawer.value.settings.filter((setting) => setting.id).map((setting) => [setting.id, setting]));

  ['show_cart_note', 'color_scheme'].forEach((id) => assert.ok(mainSettings.has(id), `Stable main-cart setting ${id} must remain available.`));
  ['enable_sticky_summary', 'show_dynamic_checkout', 'show_secure_checkout', 'show_payment_icons', 'free_shipping_threshold', 'enable_recommendations', 'recommendation_source', 'recommendation_products', 'recommendation_intent', 'empty_products'].forEach((id) => assert.ok(mainSettings.has(id), `Premium main-cart setting ${id} must exist.`));
  assert.equal(mainSettings.get('enable_sticky_summary').default, true, 'Desktop sticky summary should be enabled by default.');
  assert.equal(mainSettings.get('enable_recommendations').default, false, 'Recommendations must remain opt-in until a merchant chooses them.');
  assert.equal(mainSettings.get('free_shipping_threshold').default, 0, 'No shipping threshold may be fabricated by default.');
  ['enable_cart_drawer', 'color_scheme'].forEach((id) => assert.ok(drawerSettings.has(id), `Stable cart-drawer setting ${id} must remain available.`));
  ['drawer_position', 'show_cart_note', 'show_dynamic_checkout', 'show_secure_checkout', 'show_payment_icons', 'free_shipping_threshold'].forEach((id) => assert.ok(drawerSettings.has(id), `Premium cart-drawer setting ${id} must exist.`));
  assert.equal(drawerSettings.get('drawer_position').default, 'right', 'Drawer must preserve the familiar right-side default.');

  for (const token of ["render 'cart-item'", "render 'cart-summary'", "render 'cart-empty-state'", 'data-cart-recommendations', 'recommendation_products', 'routes.product_recommendations_url', 'empty_products']) assert.ok(mainCart.source.includes(token), `Main cart must include ${token}.`);
  for (const token of ['data-cart-drawer', 'data-cart-drawer-overlay', 'drawer_position', 'show_secure_checkout', "render 'cart-summary'"]) assert.ok(cartDrawer.source.includes(token), `Cart drawer must include ${token}.`);

  const lineItem = read('snippets/cart-item.liquid');
  const summary = read('snippets/cart-summary.liquid');
  const quantity = read('snippets/quantity-input.liquid');
  for (const token of ["render 'quantity-input'", 'cart_line_key', 'data-cart-line-item', 'data-cart-remove', 'selling_plan_allocation', 'line_level_discount_allocations']) assert.ok(lineItem.includes(token), `Canonical line item must include ${token}.`);
  for (const token of ['data-cart-quantity-input', 'data-cart-quantity-action', 'visually_hidden_label']) assert.ok(quantity.includes(token), `Shared quantity primitive must include ${token}.`);
  for (const token of ['cart_level_discount_applications', 'content_for_additional_checkout_buttons', 'shop.enabled_payment_types', 'shipping_threshold', 'cart_summary_show_secure_checkout', 'cart_summary_note_id']) assert.ok(summary.includes(token), `Cart summary must include ${token}.`);
  assert.ok(!summary.includes('id="CartNote"'), 'Cart notes must accept a caller-specific ID to avoid duplicate IDs when the drawer is enabled.');

  const cartController = read('assets/cart.js');
  const drawerController = read('assets/cart-drawer.js');
  const drawerStyles = read('assets/component-cart-drawer.css');
  const cartStyles = read('assets/section-main-cart.css');
  for (const token of ['cart/change.js', 'AbortController', 'data-cart-quantity-action', 'data-cart-remove', 'replaceRenderedSections', 'calinium:cart:content-replaced', 'loadRecommendations', 'shopify:section:load', 'shopify:section:unload']) assert.ok(cartController.includes(token), `Cart controller must include ${token}.`);
  for (const token of ['Escape', 'focusableSelector', 'lastFocusedElement', 'inert', 'cartDrawerOpen', 'shopify:section:unload', 'clearTimeout']) assert.ok(drawerController.includes(token), `Cart drawer controller must include ${token}.`);
  assert.ok(!drawerController.includes('setInterval('), 'Cart drawer must not create uncontrolled timers.');
  for (const token of ['co-cart-drawer--left', 'co-cart-drawer--right', '[data-cart-drawer-enhanced', 'prefers-reduced-motion']) assert.ok(drawerStyles.includes(token), `Drawer styles must include ${token}.`);
  for (const token of ['co-main-cart--sticky-summary', 'co-main-cart__recommendations-grid', 'co-cart-summary__shipping', 'co-cart-summary__payment-icons', 'prefers-reduced-motion']) assert.ok(cartStyles.includes(token), `Cart page styles must include ${token}.`);

  const mappings = loadGeneratorMappings(root);
  const cartCapability = mappings.index.sections.get('main-cart');
  const productListSetting = cartCapability?.available_settings.find((setting) => setting.setting_id === 'recommendation_products');
  assert.equal(productListSetting?.merchant_only, true, 'Merchant-selected cart products must remain resource-confirmation gated.');
  const generated = generateSectionInstances({
    root,
    templatePath: 'theme/templates/cart.json',
    sourceTemplatePath: 'templates/cart.json',
    pagePlan: {
      sections: [{
        instance_id: 'cart-main-premium',
        section_id: 'main-cart',
        position: 1,
        validation_status: 'valid',
        mapped_settings: [
          planned('enable_sticky_summary', 'cart.summary.sticky', true),
          planned('show_secure_checkout', 'cart.summary.secure_message', true),
          planned('free_shipping_threshold', 'cart.shipping.threshold', 50),
          planned('enable_recommendations', 'cart.recommendations.enabled', true),
          planned('recommendation_source', 'cart.recommendations.source', 'shopify'),
          planned('recommendation_intent', 'cart.recommendations.intent', 'complementary')
        ],
        explanation: { source_mapping: 'test', compiler_decision: 'premium-cart', reasoning: 'Canonical cart mapping test.', confidence: 'high' }
      }]
    },
    approval: { approval_reference: 'premium-cart-approved-inputs', merchant_references: {}, completed_confirmations: [] },
    mappings
  });
  assert.equal(generated.template.sections.main.settings.enable_sticky_summary, true, 'Approved sticky cart summary must survive deterministic generation.');
  assert.equal(generated.template.sections.main.settings.free_shipping_threshold, 50, 'Approved shipping threshold must survive deterministic generation.');
  assert.equal(generated.template.sections.main.settings.recommendation_source, 'shopify', 'Approved recommendation source must survive deterministic generation.');
  assert.equal(generated.template.sections.main.settings.recommendation_intent, 'complementary', 'Approved recommendation intent must survive deterministic generation.');

  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-premium-cart-'));
  try {
    fs.cpSync(themeRoot, packageRoot, { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'templates', 'cart.json'), `${JSON.stringify(generated.template, null, 2)}\n`);
    for (const file of ['sections/main-cart.liquid', 'sections/cart-drawer.liquid', 'snippets/cart-item.liquid', 'snippets/cart-summary.liquid', 'snippets/quantity-input.liquid', 'assets/cart.js', 'assets/cart-drawer.js', 'assets/component-cart-drawer.css', 'assets/section-main-cart.css']) assert.ok(fs.existsSync(path.join(packageRoot, file)), `Generated package must retain ${file}.`);
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }

  const source = [mainCart.source, cartDrawer.source, lineItem, summary, quantity, cartController, drawerController].join('\n');
  assert.ok(!/write_themes|theme\s+(?:push|publish|deploy)|appPurchase|admin\/api/i.test(source), 'Cart system must not add Shopify write, upload, or publish behavior.');
  process.stdout.write('Premium Cart tests passed: canonical drawer and page, native fallbacks, focus lifecycle, quantity and remove updates, summary, shipping progress, recommendations, generator mapping, package preservation, reduced motion, and read-only boundary.\n');
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
}
