# Premium Collection & Search System

Calinium One has one canonical browsing system: `collection-banner` provides the collection hero; `main-collection-product-grid` provides the collection grid, filtering, sorting, and pagination; and `main-search` provides search results. All product contexts use the same `product-card` snippet, including collection, search, predictive search, recommendations, and recently viewed products.

## Architecture and compatibility

The existing collection and search section IDs remain stable. Existing collection settings are retained, including `products_per_page`, grid columns, image ratio, availability, card details, quick add, alignment, description, and color scheme. New additive collection settings are `filter_layout`, `enable_sticky_filters`, `enable_mobile_filter_drawer`, `pagination_mode`, `show_swatches`, tag-bound `show_new_badge`/`new_badge_tag`, tag-bound `show_limited_badge`/`limited_badge_tag`, and optional integration hooks.

`collection-banner` retains `show_image`, `show_description`, `image_ratio`, `content_alignment`, and `color_scheme`. Its optional `image` and `mobile_image` overrides take precedence over the collection image; editorial copy and a CTA render only when a merchant supplies both CTA label and URL.

No section invents a product, collection, badge, swatch, promotion, or CTA. New and limited badges require both an enabled setting and an existing matching product tag. Swatches render only from Shopify’s actual swatch data.

## Browsing behavior

Collection filters are Shopify Search & Discovery-compatible server-rendered GET controls. Desktop can use a sidebar or an in-flow panel. On supported mobile browsers, the same controls move into an accessible dialog; without JavaScript they remain in the page and can still be submitted. Sorting always uses Shopify-provided sort options.

Pagination defaults to native server navigation. `Load more` and `Infinite scroll` are progressive enhancements over the same links. Reduced-motion preferences keep the manual load-more control. A failed enhancement leaves native pagination usable.

Search preserves normal query submission and predictive-search compatibility. Product, article, and page results retain their real types. When Shopify exposes search filters and sort options, `main-search` renders the same native facets and active-filter controls as collection pages.

## Accessibility and performance

- Native links, forms, and pagination remain the no-JavaScript baseline.
- The mobile filter dialog uses native dialog focus behavior, an explicit close control, and restores focus to its opener.
- Controls use visible focus through the existing design system; counts and progressive load state are announced with live regions.
- Product media uses the existing responsive-image primitive. Cards load lazily and reserve their chosen ratio.
- The enhancement is dependency-free, has no interval timers, only initializes once per section, and cleans up listeners, observers, and moved filter content on Theme Editor unload.
- Reduced motion prevents automatic infinite scrolling; hover-image transitions use the existing reduced-motion rule.

## Generator mapping

The existing section capability catalog discovers all additive schema settings. `generateSectionInstances` merges approved bounded settings into the preserved canonical `collection.json` and `search.json` templates. It does not inject merchant-specific product IDs, collection IDs, or external app configuration. Immutable paid snapshots continue to use the same read-only package path.

## Manual QA matrix

Use an authorized unpublished theme to check:

1. Collection with no image, collection image, override image, and mobile override.
2. Two through five desktop columns and one/two mobile columns at 320 px, tablet, desktop, and wide desktop.
3. Collection description, optional editorial text, and CTA only when merchant-supplied.
4. Primary/hover image, price, compare-at price, sale/sold-out, real swatches, tag-bound new/limited badges, and quick add.
5. Sidebar and toolbar filters, active chips, clear-all, sorting, and Shopify Search & Discovery filter counts.
6. Mobile filter drawer keyboard open/close and focus return.
7. Native pagination with JavaScript disabled; load-more and infinite modes with JavaScript enabled.
8. Reduced-motion behavior, including manual progression in infinite mode.
9. Search query, predictive suggestions, product/page/article results, filtering/sorting where Shopify exposes them, and empty search.
10. Theme Editor section reloads and repeated edits without duplicated dialogs, observers, or listeners.

Run `node scripts/test-premium-collection.js` after changing this system.
