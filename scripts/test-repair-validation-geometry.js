#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  evaluateFeaturedCollectionGeometry,
  featuredCollectionSelectorsForProfile
} = require('../ai/storefront-render/repair-validation-geometry');

const root = path.resolve(__dirname, '..');

function element({ rect, clientWidth = 0, scrollWidth = 0, classes = [], query = new Map(), queryAll = new Map() }) {
  return {
    clientWidth,
    scrollWidth,
    classList: { contains: (name) => classes.includes(name) },
    getBoundingClientRect: () => ({ ...rect, width: rect.right - rect.left }),
    querySelector: (selector) => query.get(selector) || null,
    querySelectorAll: (selector) => queryAll.get(selector) || []
  };
}

function withBrowserGlobals(callback) {
  const selectors = featuredCollectionSelectorsForProfile('profile.editorial_discovery.v1');
  const cardRects = [
    { left: 16, right: 187 },
    { left: 203, right: 374 },
    { left: 16, right: 187 }
  ];
  const items = cardRects.map((rect) => {
    const card = element({ rect });
    return element({ rect, query: new Map([[selectors.card, card]]) });
  });
  const grid = element({
    rect: { left: 16, right: 374 },
    clientWidth: 358,
    scrollWidth: 358,
    queryAll: new Map([[selectors.item, items]])
  });
  const section = element({
    rect: { left: 0, right: 390 },
    clientWidth: 390,
    scrollWidth: 390,
    query: new Map([[selectors.grid, grid]])
  });
  const originalDocument = global.document;
  const originalWindow = global.window;
  global.window = { innerWidth: 390 };
  global.document = {
    documentElement: { clientWidth: 390, scrollWidth: 390 },
    body: element({ rect: { left: 0, right: 390 }, clientWidth: 390, scrollWidth: 390 }),
    querySelector: (selector) => {
      if (selector === selectors.section) return section;
      if (selector.includes('.co-featured-collection')) throw new Error('Current-family selector fallback was attempted.');
      return null;
    }
  };
  try {
    return callback(selectors);
  } finally {
    global.document = originalDocument;
    global.window = originalWindow;
  }
}

function main() {
  const presenter = fs.readFileSync(path.join(root, 'ai/architecture/presenters/editorial-discovery/sections/featured-collection.liquid'), 'utf8');
  const productCard = fs.readFileSync(path.join(root, 'ai/architecture/presenters/editorial-discovery/snippets/product-card.liquid'), 'utf8');
  const selectors = featuredCollectionSelectorsForProfile('profile.editorial_discovery.v1');

  assert.match(presenter, /data-editorial-discovery-featured-collection/);
  assert.match(presenter, /data-calinium-presenter="section\.featured_collection\.editorial_discovery"/);
  assert.match(presenter, /co-ed-featured-collection__grid/);
  assert.match(presenter, /co-ed-featured-collection__item/);
  assert.match(productCard, /data-editorial-discovery-product-card/);
  assert.match(productCard, /data-calinium-presenter="snippet\.product_card\.editorial_discovery"/);
  assert.ok(selectors.section.includes('data-editorial-discovery-featured-collection'));
  assert.equal(selectors.grid, '.co-ed-featured-collection__grid');
  assert.equal(selectors.item, ':scope > .co-ed-featured-collection__item');
  assert.ok(selectors.card.includes('data-editorial-discovery-product-card'));
  assert.throws(
    () => featuredCollectionSelectorsForProfile('profile.unknown.v1'),
    /No repair-validation Featured Collection selector mapping/,
    'An unknown profile must fail closed instead of falling back to Current selectors.'
  );

  const geometry = withBrowserGlobals((editorialSelectors) => evaluateFeaturedCollectionGeometry({ selectors: editorialSelectors, tolerance: 1 }));
  assert.equal(geometry.featured_collection_present, true);
  assert.equal(geometry.document_client_width, 390);
  assert.equal(geometry.document_scroll_width, 390);
  assert.equal(geometry.body_client_width, 390);
  assert.equal(geometry.body_scroll_width, 390);
  assert.equal(geometry.grid_client_width, 358);
  assert.equal(geometry.grid_scroll_width, 358);
  assert.equal(geometry.expected_product_card_count, 3);
  assert.equal(geometry.detected_product_card_count, 3);
  assert.equal(geometry.partial_product_card_count, 0);
  assert.equal(geometry.all_expected_cards_detected, true);
  assert.equal(geometry.page_level_contained, true);
  assert.equal(geometry.section_level_contained, true);
  assert.equal(geometry.acceptance_passed, true);
  assert.deepEqual(geometry.product_cards.map((item) => item.card.right_relative_to_grid), [171, 358, 171]);

  console.log('Repair-validation geometry test passed: Editorial Discovery semantic selectors, three complete cards, page/section containment, and unknown-profile fail-closed behavior verified without Current-family fallback.');
}

main();
