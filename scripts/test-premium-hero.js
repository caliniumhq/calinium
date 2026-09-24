#!/usr/bin/env node

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { repositoryPaths } = require('./lib/repository-paths');
const { validateHomepageBootstrap } = require('./lib/homepage-bootstrap');
const { loadGeneratorMappings } = require('../ai/theme-generator/load-mappings');
const { generateSectionInstances } = require('../ai/theme-generator/generate-section-instances');

const root = path.resolve(__dirname, '..');
const { themeRoot } = repositoryPaths(root);
const heroFile = path.join(themeRoot, 'sections', 'full-screen-hero.liquid');
const hero = fs.readFileSync(heroFile, 'utf8');
const contentPrimitive = fs.readFileSync(path.join(themeRoot, 'snippets', 'premium-hero-content.liquid'), 'utf8');
const schemaMatch = hero.match(/\{% schema %\}\s*([\s\S]*?)\s*\{% endschema %\}/);
const schema = JSON.parse(schemaMatch[1]);

function setting(id) {
  return schema.settings.find((item) => item.id === id);
}

function planned(settingId, ref, value) {
  return {
    scope: 'section',
    status: 'proposed',
    setting_id: settingId,
    setting_ref: ref,
    value,
    explanation: {
      source_mapping: 'scripts/test-premium-hero.js',
      compiler_decision: 'hero-mode',
      confidence: 'high',
      reasoning: 'Focused canonical Premium Hero regression.'
    }
  };
}

function main() {
  assert.ok(fs.existsSync(heroFile), 'The canonical full-screen-hero section must exist.');
  assert.ok(fs.existsSync(path.join(themeRoot, 'snippets', 'premium-hero-content.liquid')), 'The shared Premium Hero content primitive must exist.');
  assert.ok(fs.existsSync(path.join(themeRoot, 'assets', 'section-premium-hero.css')), 'The Premium Hero stylesheet must exist.');
  assert.ok(fs.existsSync(path.join(themeRoot, 'assets', 'premium-hero.js')), 'The Premium Hero controller must exist.');

  const homepage = JSON.parse(fs.readFileSync(path.join(themeRoot, 'templates', 'index.json'), 'utf8'));
  const first = homepage.sections[homepage.order[0]];
  assert.equal(first.type, 'full-screen-hero', 'Homepage bootstrap must start with the canonical Premium Hero.');
  assert.notEqual(first.disabled, true, 'Homepage bootstrap hero must be active.');
  assert.ok(!JSON.stringify(homepage).match(/gid:\/\/shopify\//), 'Canonical homepage must not contain store-specific resource IDs.');
  const headerGroup = fs.readFileSync(path.join(themeRoot, 'sections', 'header-group.json'), 'utf8');
  assert.ok(!headerGroup.match(/gid:\/\/shopify\//), 'Canonical header group must not contain store-specific resource IDs.');
  const recipes = JSON.parse(fs.readFileSync(path.join(root, 'config', 'layout-recipes.json'), 'utf8'));
  for (const recipe of recipes.items || []) assert.equal(recipe.section_sequence?.[0], 'full-screen-hero', `${recipe.id} must lead newly generated homepages with the canonical Premium Hero.`);

  const stableIds = [
    'media_type', 'image', 'mobile_image', 'video', 'autoplay', 'loop', 'muted', 'controls', 'eyebrow', 'heading', 'heading_tag', 'text',
    'button_label', 'button_link', 'secondary_button_label', 'secondary_button_link', 'text_alignment', 'content_position', 'overlay_opacity', 'show_scroll_cue',
    'gradient_direction', 'header_offset', 'enable_animation', 'heading_size', 'color_scheme', 'padding_top', 'padding_bottom', 'mobile_padding_top', 'mobile_padding_bottom'
  ];
  const settingIds = schema.settings.map((item) => item.id).filter(Boolean);
  assert.deepEqual(stableIds.filter((id) => !settingIds.includes(id)), [], 'Stable legacy hero setting IDs must remain available.');
  for (const id of ['hero_mode', 'hero_height', 'mobile_height', 'image', 'mobile_image', 'product', 'collection', 'slideshow_autoplay', 'mobile_text_alignment']) assert.ok(setting(id), `Premium Hero setting ${id} must exist.`);
  assert.equal(setting('slideshow_autoplay').default, false, 'Slideshow autoplay must be opt-in.');
  assert.equal(schema.max_blocks, 6, 'Premium Hero must cap slides at six blocks.');

  assert.ok(hero.includes('assign full_screen_heading = shop.name'), 'No-resource fallback must use the real shop name.');
  assert.ok(!hero.includes('Explore the collection'), 'No invented fallback CTA may remain in the canonical hero.');
  assert.ok(!hero.includes('A defining moment'), 'No invented fallback marketing claim may remain in the canonical hero.');
  assert.ok(hero.includes("request.page_type == 'index' and section.index == 1"), 'H1 eligibility must be constrained to the first homepage hero.');
  assert.ok(hero.includes("assign full_screen_slide_heading_level = 'h2'"), 'Slides must default to a subordinate heading level.');
  assert.ok(hero.includes('hidden inert'), 'No-JavaScript slideshow fallback must expose only the first valid slide.');
  assert.ok(hero.includes("render 'responsive-image'"), 'Premium Hero must use the canonical responsive-image primitive.');
  assert.ok(contentPrimitive.includes("render 'price'"), 'Product-led mode must reuse the canonical price primitive.');
  assert.ok(hero.includes("section.settings.product"), 'Product-led mode must use a real selected product.');
  assert.ok(hero.includes("section.settings.collection"), 'Collection-led mode must use a real selected collection.');
  assert.ok(hero.includes("request.design_mode"), 'Empty resource states must remain editable in Theme Editor.');

  const controller = fs.readFileSync(path.join(themeRoot, 'assets', 'premium-hero.js'), 'utf8');
  for (const token of ['prefers-reduced-motion: reduce', 'shopify:section:load', 'shopify:section:unload', 'shopify:section:select', 'shopify:section:deselect', 'shopify:block:select', 'shopify:block:deselect', 'destroy()', 'window[lifecycleKey]', 'visibilitychange']) assert.ok(controller.includes(token), `Premium Hero lifecycle contract is missing ${token}.`);
  assert.ok(controller.includes('video.pause()'), 'Video must pause when the document or its slide is inactive.');
  const styles = fs.readFileSync(path.join(themeRoot, 'assets', 'section-premium-hero.css'), 'utf8');
  assert.ok(styles.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced-motion presentation must exist.');
  assert.ok(styles.includes('.co-premium-hero--layout-split'), 'Split mode layout must exist.');
  assert.ok(styles.includes('.co-premium-hero--mobile-height-custom'), 'Responsive custom-height support must exist.');
  assert.ok(styles.includes('.co-premium-hero--text-shadow'), 'The restrained text-shadow treatment must remain available when explicitly selected.');
  assert.ok(hero.includes('aria-roledescription="slide"'), 'Slideshow slides must expose an accessible slide role.');
  assert.ok(contentPrimitive.indexOf("if text != blank") < contentPrimitive.indexOf('collection.description'), 'Collection-led merchant text must take precedence over a collection description.');

  const mappings = loadGeneratorMappings(root);
  const generated = generateSectionInstances({
    root,
    templatePath: 'theme/templates/index.json',
    sourceTemplatePath: 'templates/index.json',
    pagePlan: {
      sections: [{
        instance_id: 'homepage-01-full-screen-hero',
        section_id: 'full-screen-hero',
        position: 1,
        validation_status: 'valid',
        mapped_settings: [
          planned('hero_mode', 'homepage.hero.mode', 'product'),
          planned('product', 'homepage.hero.product', null),
          planned('mobile_image', 'homepage.hero.mobile_image', null),
          planned('heading', 'homepage.hero.heading', 'Approved Nova edit')
        ],
        explanation: { source_mapping: 'test', compiler_decision: 'hero', reasoning: 'Premium Hero mapping test.', confidence: 'high' }
      }]
    },
    approval: {
      approval_reference: 'premium-hero-approved-inputs',
      merchant_references: {
        'homepage.hero.product': 'gid://shopify/Product/9001',
        'homepage.hero.mobile_image': 'shopify://shop_images/nova-mobile.jpg'
      },
      completed_confirmations: ['field:homepage.hero.product', 'field:homepage.hero.mobile_image']
    },
    mappings
  });
  const merged = generated.template.sections.bootstrap_hero.settings;
  assert.equal(merged.hero_mode, 'product', 'Approved Premium Hero settings must merge into the canonical bootstrap hero.');
  assert.equal(merged.product, 'gid://shopify/Product/9001', 'Approved product selection must survive generation.');
  assert.equal(merged.mobile_image, 'shopify://shop_images/nova-mobile.jpg', 'Approved mobile image selection must survive generation.');
  assert.equal(merged.heading, 'Approved Nova edit', 'Approved hero text must survive generation.');

  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-premium-hero-'));
  try {
    fs.cpSync(themeRoot, packageRoot, { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'templates', 'index.json'), `${JSON.stringify(generated.template, null, 2)}\n`);
    const validation = validateHomepageBootstrap({ themeRoot: packageRoot });
    assert.deepEqual(validation.errors, [], `Generated Premium Hero homepage must validate: ${validation.errors.join(' ')}`);
    for (const required of ['sections/full-screen-hero.liquid', 'snippets/premium-hero-content.liquid', 'assets/section-premium-hero.css', 'assets/premium-hero.js']) assert.ok(fs.existsSync(path.join(packageRoot, required)), `Generated package must retain ${required}.`);
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }

  process.stdout.write('Premium Hero tests passed: canonical bootstrap, stable IDs, responsive modes, safe fallback, semantic heading guard, slideshow progressive enhancement, lifecycle cleanup, real product/collection binding, approved-setting merge, and generated-package preservation.\n');
}

try { main(); } catch (error) { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; }
