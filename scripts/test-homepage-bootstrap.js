#!/usr/bin/env node

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { repositoryPaths } = require('./lib/repository-paths');
const { DEFAULT_HOMEPAGE_SECTION_TYPES, validateHomepageBootstrap } = require('./lib/homepage-bootstrap');
const { loadGeneratorMappings } = require('../ai/theme-generator/load-mappings');
const { generateSectionInstances } = require('../ai/theme-generator/generate-section-instances');

const root = path.resolve(__dirname, '..');
const { themeRoot } = repositoryPaths(root);

function json(relative) {
  return JSON.parse(fs.readFileSync(path.join(themeRoot, relative), 'utf8'));
}

function validateSectionGroup(relative, expectedType) {
  const group = json(relative);
  assert.equal(group.type, expectedType, `${relative} must remain a ${expectedType} section group.`);
  assert.ok(group.sections && typeof group.sections === 'object', `${relative} must contain sections.`);
  assert.ok(Array.isArray(group.order), `${relative} must contain an order.`);
  assert.equal(new Set(group.order).size, group.order.length, `${relative} cannot duplicate ordered section IDs.`);
  for (const id of group.order) assert.ok(group.sections[id], `${relative} orders missing section ${id}.`);
  return group;
}

function plan(sectionId, position, settingId, settingRef) {
  return {
    instance_id: `homepage-${position}-${sectionId}`,
    section_id: sectionId,
    position,
    validation_status: 'valid',
    mapped_settings: settingId ? [{ scope: 'section', status: 'proposed', setting_id: settingId, setting_ref: settingRef, value: null }] : [],
    explanation: { source_mapping: 'test', compiler_decision: 'test', reasoning: 'Focused homepage bootstrap regression.', confidence: 'high' }
  };
}

function main() {
  const canonical = validateHomepageBootstrap({ themeRoot });
  assert.deepEqual(canonical.errors, [], `Canonical homepage bootstrap is invalid: ${canonical.errors.join(' ')}`);
  assert.deepEqual(canonical.section_types, DEFAULT_HOMEPAGE_SECTION_TYPES, 'Canonical homepage composition must stay restrained and ordered.');

  const headerGroup = validateSectionGroup('sections/header-group.json', 'header');
  const footerGroup = validateSectionGroup('sections/footer-group.json', 'footer');
  assert.deepEqual(headerGroup.order, ['header'], 'The header group must not carry a store-specific homepage hero.');
  assert.ok(footerGroup.sections.footer, 'The footer group must retain its canonical footer.');

  const notFound = json('templates/404.json');
  assert.equal(notFound.order.length, 1, 'The standalone 404 template must remain present.');
  assert.equal(notFound.sections[notFound.order[0]].type, 'main-404', 'The standalone 404 template must retain main-404.');

  const fullScreenHero = fs.readFileSync(path.join(themeRoot, 'sections/full-screen-hero.liquid'), 'utf8');
  assert.ok(fullScreenHero.includes('assign full_screen_heading = shop.name'), 'The bootstrap hero must fall back to the real shop name.');
  assert.ok(fullScreenHero.includes('co-full-screen-hero--fallback'), 'The bootstrap hero must have a safe no-media state.');
  const imageWithText = fs.readFileSync(path.join(themeRoot, 'sections/image-with-text.liquid'), 'utf8');
  assert.ok(imageWithText.includes('co-image-with-text__placeholder'), 'Image-with-text must retain its no-image placeholder.');
  const featuredCollection = fs.readFileSync(path.join(themeRoot, 'sections/featured-collection.liquid'), 'utf8');
  assert.ok(featuredCollection.includes('co-featured-collection__placeholder-grid'), 'Featured collection must retain its no-collection placeholder.');
  const newsletter = fs.readFileSync(path.join(themeRoot, 'sections/newsletter.liquid'), 'utf8');
  assert.ok(newsletter.includes("{% form 'customer'"), 'Newsletter must retain the Shopify customer form.');

  const mappings = loadGeneratorMappings(root);
  const empty = generateSectionInstances({
    root,
    templatePath: 'theme/templates/index.json',
    sourceTemplatePath: 'templates/index.json',
    pagePlan: { sections: [] },
    approval: { approval_reference: 'homepage-bootstrap-empty', merchant_references: {}, completed_confirmations: [] },
    mappings
  });
  assert.deepEqual(empty.template.order, canonical.section_ids, 'Zero products or collections must preserve the canonical safe homepage.');

  const selected = generateSectionInstances({
    root,
    templatePath: 'theme/templates/index.json',
    sourceTemplatePath: 'templates/index.json',
    pagePlan: {
      sections: [
        plan('featured-collection', 1, 'collection', 'homepage.bootstrap_featured_collection.collection'),
        plan('featured-product', 2, 'product', 'homepage.featured_product.product')
      ]
    },
    approval: {
      approval_reference: 'homepage-bootstrap-approved-resources',
      merchant_references: {
        'homepage.bootstrap_featured_collection.collection': 'gid://shopify/Collection/101',
        'homepage.featured_product.product': 'gid://shopify/Product/202'
      },
      completed_confirmations: [
        'field:homepage.bootstrap_featured_collection.collection',
        'field:homepage.featured_product.product'
      ]
    },
    mappings
  });
  assert.equal(selected.template.sections.bootstrap_featured_collection.settings.collection, 'gid://shopify/Collection/101', 'Approved collection selection must merge into the bootstrap section.');
  const selectedProduct = Object.values(selected.template.sections).find((section) => section.type === 'featured-product');
  assert.equal(selectedProduct?.settings?.product, 'gid://shopify/Product/202', 'Approved product selection must remain available to a generated homepage section.');
  assert.throws(() => generateSectionInstances({
    root,
    templatePath: 'theme/templates/index.json',
    sourceTemplatePath: 'templates/index.json',
    pagePlan: { sections: [{ ...plan('featured-collection', 1), validation_status: 'invalid' }] },
    approval: { approval_reference: 'invalid-homepage', merchant_references: {}, completed_confirmations: [] },
    mappings
  }), /not valid for generation/, 'Malformed homepage input must be rejected before packaging.');

  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-homepage-bootstrap-'));
  try {
    fs.cpSync(themeRoot, packageRoot, { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'templates', 'index.json'), `${JSON.stringify(selected.template, null, 2)}\n`);
    const packaged = validateHomepageBootstrap({ themeRoot: packageRoot });
    assert.deepEqual(packaged.errors, [], `Generated package homepage bootstrap is invalid: ${packaged.errors.join(' ')}`);
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }

  process.stdout.write('Homepage bootstrap tests passed: canonical composition, safe empty state, approved resource merge, invalid-plan rejection, section groups, package preservation, and standalone 404.\n');
}

try { main(); } catch (error) { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; }
