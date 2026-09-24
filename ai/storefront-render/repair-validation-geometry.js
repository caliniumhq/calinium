'use strict';

const FEATURED_COLLECTION_SELECTORS_BY_PROFILE = Object.freeze({
  'profile.current_calinium.v1': Object.freeze({
    section: '.co-featured-collection',
    grid: '.co-featured-collection__grid',
    item: ':scope > .co-featured-collection__item',
    card: '.co-product-card',
    mobileSwipeClass: 'co-featured-collection--mobile-swipe'
  }),
  'profile.editorial_discovery.v1': Object.freeze({
    section: '[data-editorial-discovery-featured-collection][data-calinium-presenter="section.featured_collection.editorial_discovery"]',
    grid: '.co-ed-featured-collection__grid',
    item: ':scope > .co-ed-featured-collection__item',
    card: '[data-editorial-discovery-product-card][data-calinium-presenter="snippet.product_card.editorial_discovery"]',
    mobileSwipeClass: 'co-ed-featured-collection--mobile-swipe'
  })
});

function featuredCollectionSelectorsForProfile(profileId) {
  const selectors = FEATURED_COLLECTION_SELECTORS_BY_PROFILE[profileId];
  if (!selectors) {
    throw new Error(`No repair-validation Featured Collection selector mapping exists for architecture profile ${profileId}.`);
  }
  return selectors;
}

function evaluateFeaturedCollectionGeometry({ selectors, tolerance = 1 }) {
  const round = (value) => Math.round(Number(value) * 100) / 100;
  const root = document.documentElement;
  const body = document.body;
  const section = document.querySelector(selectors.section);
  const grid = section?.querySelector(selectors.grid) || null;
  const itemElements = grid ? [...grid.querySelectorAll(selectors.item)] : [];
  const sectionRect = section?.getBoundingClientRect() || null;
  const gridRect = grid?.getBoundingClientRect() || null;
  const bodyRect = body?.getBoundingClientRect() || null;
  const viewportWidth = window.innerWidth;

  const items = itemElements.map((item, index) => {
    const itemRect = item.getBoundingClientRect();
    const card = item.querySelector(selectors.card);
    const cardRect = card?.getBoundingClientRect() || null;
    const contained = Boolean(cardRect && gridRect
      && cardRect.left >= gridRect.left - tolerance
      && cardRect.right <= gridRect.right + tolerance);
    return {
      index,
      item: {
        left: round(itemRect.left),
        right: round(itemRect.right),
        width: round(itemRect.width),
        left_relative_to_grid: gridRect ? round(itemRect.left - gridRect.left) : null,
        right_relative_to_grid: gridRect ? round(itemRect.right - gridRect.left) : null
      },
      card_present: Boolean(card),
      card: cardRect ? {
        left: round(cardRect.left),
        right: round(cardRect.right),
        width: round(cardRect.width),
        left_relative_to_grid: gridRect ? round(cardRect.left - gridRect.left) : null,
        right_relative_to_grid: gridRect ? round(cardRect.right - gridRect.left) : null,
        contained_within_grid: contained
      } : null
    };
  });

  const expectedCardCount = itemElements.length;
  const detectedCardCount = items.filter((item) => item.card_present).length;
  const partialCardCount = items.filter((item) => item.card_present && !item.card.contained_within_grid).length;
  const documentClientWidth = root.clientWidth;
  const documentScrollWidth = root.scrollWidth;
  const bodyClientWidth = body?.clientWidth ?? null;
  const bodyScrollWidth = body?.scrollWidth ?? null;
  const gridClientWidth = grid?.clientWidth ?? null;
  const gridScrollWidth = grid?.scrollWidth ?? null;

  const pageContained = documentScrollWidth <= documentClientWidth + tolerance
    && bodyClientWidth !== null
    && bodyScrollWidth !== null
    && bodyClientWidth <= viewportWidth + tolerance
    && bodyScrollWidth <= viewportWidth + tolerance
    && (!bodyRect || bodyRect.right <= viewportWidth + tolerance);
  const sectionContained = Boolean(grid
    && gridScrollWidth <= gridClientWidth + tolerance
    && partialCardCount === 0);
  const allExpectedCardsDetected = expectedCardCount > 0 && detectedCardCount === expectedCardCount;

  return {
    selectors,
    tolerance_px: tolerance,
    viewport_width: viewportWidth,
    document_client_width: documentClientWidth,
    document_scroll_width: documentScrollWidth,
    body_client_width: bodyClientWidth,
    body_scroll_width: bodyScrollWidth,
    body_bounding_width: bodyRect ? round(bodyRect.width) : null,
    root_horizontal_overflow_px: Math.max(0, documentScrollWidth - documentClientWidth),
    body_horizontal_overflow_px: bodyScrollWidth === null ? null : Math.max(0, bodyScrollWidth - viewportWidth),
    featured_collection_present: Boolean(section),
    mobile_swipe_class_present: Boolean(section?.classList.contains(selectors.mobileSwipeClass)),
    section_bounds: sectionRect ? {
      left: round(sectionRect.left),
      right: round(sectionRect.right),
      width: round(sectionRect.width)
    } : null,
    grid_bounds: gridRect ? {
      left: round(gridRect.left),
      right: round(gridRect.right),
      width: round(gridRect.width)
    } : null,
    grid_client_width: gridClientWidth,
    grid_scroll_width: gridScrollWidth,
    grid_horizontal_overflow_px: grid ? Math.max(0, gridScrollWidth - gridClientWidth) : null,
    expected_product_card_count: expectedCardCount,
    detected_product_card_count: detectedCardCount,
    partial_product_card_count: partialCardCount,
    all_expected_cards_detected: allExpectedCardsDetected,
    product_cards: items,
    page_level_contained: pageContained,
    section_level_contained: sectionContained,
    acceptance_passed: Boolean(section && grid && pageContained && sectionContained && allExpectedCardsDetected)
  };
}

async function collectFeaturedCollectionGeometry(page, { profileId, tolerance = 1 }) {
  const selectors = featuredCollectionSelectorsForProfile(profileId);
  return page.evaluate(evaluateFeaturedCollectionGeometry, { selectors, tolerance });
}

module.exports = {
  FEATURED_COLLECTION_SELECTORS_BY_PROFILE,
  collectFeaturedCollectionGeometry,
  evaluateFeaturedCollectionGeometry,
  featuredCollectionSelectorsForProfile
};
