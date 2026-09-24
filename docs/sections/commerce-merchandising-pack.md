# Commerce & Merchandising Pack

This additive pack supplies twelve product and category sections without changing any template, saved section, product, collection, cart setting, or homepage composition. All product presentation uses the canonical [`product-card`](../../README.md#canonical-product-card) snippet; it never forks card media, pricing, badges, links, or Quick Add.

## Shared architecture

- `assets/section-commerce-pack.css` contains only section-scoped layout styles and uses Calinium tokens.
- Existing `ScrollCarousel` enhancement powers both carousels with native scrolling, buttons, pagination, keyboard arrows, touch scrolling, reduced-motion support, and Shopify section lifecycle cleanup.
- `CommerceTabsController`, `ShopTheLookController`, `RecentlyViewedController`, and `CommerceRecommendationController` extend the existing `calinium-sections.js` lifecycle rather than installing a framework or per-card listener.
- Dynamic recommendations and recently viewed responses emit `calinium:content:replace`, so the existing `product-form.js` initializes the canonical single-variant Quick Add form after replacement.

## Product and cart safety

Product cards use the established behavior: an available single-variant product can use the existing native/Ajax form; a multi-variant product gets a product-page choice link; sold-out products have no active add action. No section posts to a cart endpoint directly. Bundle Showcase intentionally has individual safe actions only and does not claim or implement a discount, native bundle inventory, or multi-item cart action.

## Section index

- [Product carousel](product-carousel.md)
- [Collection carousel](collection-carousel.md)
- [Collection tabs](collection-tabs.md)
- [Featured categories](featured-categories.md)
- [Shop the look](shop-the-look.md)
- [Product comparison](product-comparison.md)
- [Product highlights](product-highlights.md)
- [Product bundle showcase](product-bundle-showcase.md)
- [Recently viewed products](recently-viewed-products.md)
- [Product recommendations](product-recommendations.md)
- [Cross-sell products](cross-sell-products.md)
- [Complementary products](complementary-products.md)

## Development validation

Run `node scripts/validate-commerce-merchandising-pack.js` after changing these sections. It checks the required files, preset and schema validity, default select values, schema-locale references, canonical product-card use, absence of copied card/cart code, lifecycle hooks, the namespaced recently-viewed key, and supported recommendation routing.
