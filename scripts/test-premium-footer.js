#!/usr/bin/env node

'use strict';

/* Focused contract coverage for Calinium One's canonical global footer. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { repositoryPaths } = require('./lib/repository-paths');
const { loadGeneratorMappings } = require('../ai/theme-generator/load-mappings');

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

function settingsById(items) {
  return new Map((items || []).filter((setting) => setting.id).map((setting) => [setting.id, setting]));
}

function blockByType(section, type) {
  const block = section.value.blocks.find((candidate) => candidate.type === type);
  assert.ok(block, `Footer must provide the ${type} block.`);
  return block;
}

function main() {
  const footer = schema('sections/footer.liquid');
  const footerSettings = settingsById(footer.value.settings);
  const footerGroup = JSON.parse(read('sections/footer-group.json'));
  const social = read('snippets/footer-social-links.liquid');
  const paymentIcons = read('snippets/footer-payment-icons.liquid');
  const policyLinks = read('snippets/footer-policy-links.liquid');
  const styles = read('assets/section-footer.css');
  const controller = read('assets/premium-footer.js');
  const locale = JSON.parse(read('locales/en.default.json'));

  assert.ok(footer.source.includes('<footer'), 'Canonical footer must retain a footer landmark.');
  assert.equal(footerGroup.type, 'footer', 'Footer group must remain Shopify’s canonical footer group.');
  assert.deepEqual(footerGroup.order, ['footer'], 'Footer group must retain one canonical footer implementation.');

  ['color_scheme', 'show_newsletter', 'newsletter_heading', 'newsletter_description', 'show_localization'].forEach((id) => {
    assert.ok(footerSettings.has(id), `Stable footer setting ${id} must remain available.`);
  });
  ['layout_style', 'layout_width', 'show_top_divider', 'show_bottom_divider', 'padding_top', 'padding_bottom', 'mobile_padding_top', 'mobile_padding_bottom', 'show_brand', 'show_policy_links', 'contact_page', 'contact_label', 'copyright_text', 'show_back_to_top'].forEach((id) => {
    assert.ok(footerSettings.has(id), `Premium footer setting ${id} must exist.`);
  });
  assert.equal(footerSettings.get('layout_style').default, 'multi_column', 'Multi-column must be the calm default footer layout.');
  assert.equal(footerSettings.get('layout_width').default, 'contained', 'Footer content must remain contained by default.');
  assert.equal(footerSettings.get('show_top_divider').default, true, 'The original top divider remains the default boundary.');
  assert.equal(footerSettings.get('show_back_to_top').default, false, 'Back-to-top must remain opt-in.');

  ['menu', 'rich_text', 'brand_description', 'newsletter', 'social_links', 'contact_information', 'store_information', 'payment_icons', 'trust_badge', 'custom_liquid', 'image', 'logo'].forEach((type) => blockByType(footer, type));
  assert.equal(blockByType(footer, 'newsletter').limit, 1, 'Only one footer newsletter form may render at a time.');
  assert.ok(footer.source.includes("{% form 'customer'"), 'Footer newsletter must use Shopify’s native customer form.');
  assert.ok(footer.source.includes('form.posted_successfully?') && footer.source.includes('form.errors'), 'Footer newsletter must expose native success and validation states.');
  assert.ok(footer.source.includes('aria-describedby') && footer.source.includes('FooterNewsletterErrors-'), 'Footer newsletter errors must identify their matching email field.');
  assert.ok(footer.source.includes("has_newsletter_block == false"), 'Legacy newsletter settings must fall back only when no newsletter block exists.');

  ['instagram_url', 'facebook_url', 'tiktok_url', 'pinterest_url', 'x_url', 'youtube_url', 'linkedin_url'].forEach((id) => {
    assert.ok(settingsById(blockByType(footer, 'social_links').settings).has(id), `Social block must expose ${id}.`);
    assert.ok(social.includes(id), `Social renderer must consume ${id}.`);
  });
  assert.ok(social.includes('footer_social_has_links') && social.includes('{% if footer_social_has_links %}'), 'Empty social blocks must remain hidden.');
  assert.ok(social.includes('noopener noreferrer') && social.includes('co-visually-hidden'), 'Social links must protect external navigation and have accessible names.');

  assert.ok(paymentIcons.includes('shop.enabled_payment_types') && paymentIcons.includes('payment_type_svg_tag'), 'Payment icons must come from Shopify’s native enabled payment types.');
  assert.ok(footer.source.includes("render 'footer-payment-icons'"), 'Footer must use the shared payment-icon primitive.');
  ['shop.privacy_policy', 'shop.terms_of_service', 'shop.refund_policy', 'shop.shipping_policy', 'contact_page'].forEach((token) => assert.ok(policyLinks.includes(token), `Policy utility must safely support ${token}.`));
  assert.ok(footer.source.includes("render 'footer-policy-links'"), 'Footer must render policy links through the shared policy utility.');

  assert.ok(footer.source.includes("{% form 'localization'"), 'Footer must retain Shopify’s native localization form.');
  assert.ok(footer.source.includes('localization.available_countries') && footer.source.includes('localization.available_languages'), 'Country and language availability must drive localization rendering.');
  assert.ok(footer.source.includes('has_multiple_countries') && footer.source.includes('has_multiple_languages'), 'Unavailable localization selectors must remain hidden.');
  assert.ok(footer.source.includes("assign current_year = 'now' | date: '%Y'"), 'Copyright must use Shopify’s dynamic current year.');
  assert.ok(footer.source.includes("replace: '[shop]', shop.name"), 'Custom copyright may safely use the actual store name.');
  assert.equal(locale.footer.back_to_top, 'Back to top', 'The storefront locale must provide the back-to-top control label.');

  assert.ok(footer.source.includes('data-footer-back-to-top'), 'Footer must expose a progressive back-to-top control.');
  for (const token of ['prefers-reduced-motion: reduce', 'scrollTo', 'shopify:section:load', 'shopify:section:unload', 'WeakMap', 'destroy()', 'window[lifecycleKey]']) {
    assert.ok(`${styles}\n${controller}`.includes(token), `Footer runtime must include ${token}.`);
  }
  assert.ok(!controller.includes('setInterval('), 'Footer runtime must not create uncontrolled timers.');
  assert.ok(!/https?:\/\//.test(controller), 'Footer runtime must not load an external library.');
  ['co-footer--layout-compact', 'co-footer--layout-editorial', 'co-footer--layout-multi_column', 'co-footer--layout-minimal', 'co-footer--layout-large', 'co-footer__inner--full', '@media (min-width: 48rem)', 'min-block-size: 2.75rem'].forEach((token) => {
    assert.ok(styles.includes(token), `Footer styles must include ${token}.`);
  });

  const mappings = loadGeneratorMappings(root);
  const footerCapability = mappings.index.sections.get('footer');
  assert.ok(footerCapability, 'Generated mapping catalog must retain the canonical footer.');
  ['layout_style', 'layout_width', 'show_back_to_top'].forEach((id) => assert.ok(footerCapability.available_settings.some((setting) => setting.setting_id === id), `Footer mapping catalog must include ${id}.`));
  ['newsletter', 'social_links', 'payment_icons', 'trust_badge'].forEach((type) => assert.ok(footerCapability.blocks.some((block) => block.block_type === type), `Footer mapping catalog must include ${type}.`));
  const socialUrl = footerCapability.blocks.find((block) => block.block_type === 'social_links').settings.find((setting) => setting.setting_id === 'instagram_url');
  assert.equal(socialUrl.merchant_review_required, true, 'Social destinations must stay merchant-confirmed inputs.');
  const customLiquid = footerCapability.blocks.find((block) => block.block_type === 'custom_liquid').settings[0];
  assert.equal(customLiquid.merchant_only, true, 'Custom Liquid must remain merchant-only.');

  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-premium-footer-'));
  try {
    fs.cpSync(themeRoot, packageRoot, { recursive: true });
    for (const file of ['sections/footer.liquid', 'sections/footer-group.json', 'snippets/footer-social-links.liquid', 'snippets/footer-payment-icons.liquid', 'snippets/footer-policy-links.liquid', 'assets/section-footer.css', 'assets/premium-footer.js']) {
      assert.ok(fs.existsSync(path.join(packageRoot, file)), `Generated package must retain ${file}.`);
    }
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }

  const source = [footer.source, social, paymentIcons, policyLinks, controller].join('\n');
  assert.ok(!/write_themes|theme\s+(?:push|publish|deploy)|appPurchase|admin\/api/i.test(source), 'Footer system must not introduce Shopify writes, upload, billing, or publishing behavior.');
  assert.ok(!/gid:\/\/shopify|\.myshopify\.com/i.test(`${footer.source}\n${JSON.stringify(footerGroup)}`), 'Canonical footer configuration must not contain store-specific resource identifiers.');

  process.stdout.write('Premium Footer tests passed: canonical landmark, legacy-safe newsletter, dynamic social/payment/policies/localization, merchant-owned trust, responsive layouts, lifecycle cleanup, mapping catalogs, package preservation, and read-only boundary.\n');
}

try { main(); } catch (error) { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; }
