# Product Recommendations

## Purpose

Product Recommendations renders Shopify-provided **related** products for the current Product Page. Its shared Product Card renderer is deliberately separate from the source-behaviour contract: Shopify determines whether related results exist; this section does not determine relevance, ranking, personalization, or curation.

**Currently implemented:** the `product-recommendations` section requests Shopify’s recommendation route with `intent=related` when the `recommendations` object has not already been performed.

## Customer Goals

Customers should see a small, truthful continuation of product discovery when Shopify returns results, open normal product links, and encounter no fabricated products or explanation of why a result appeared. An empty result must leave the Product Page usable.

## Merchant Goals

Merchants can control the local heading, presentation, card density, and optional shared Quick Add—not the returned products, algorithm, ranking, or relationship. They can omit the section when related discovery is not useful.

## Shopify Context

The stable runtime ID is `product-recommendations`. Its schema is enabled only on the `product` template, has no blocks, and the canonical product template includes one `recommendations` instance after `main-product` and before `recently_viewed`.

It is not the Cart recommendation region, Homepage merchandising, Collection grid, Search result set, complementary behavior, cross-sell curation, recently viewed history, or a bundle. It is prohibited on Homepage, Collection, Standard Page, Cart, Contact, Blog, Article, 404, account, checkout, and global surfaces under the current schema and Page contracts.

## Responsibilities

**Renderer contract:** owns the heading, Product Card list, labelled loading shell, empty-result omission, responsive grid, local accessibility, and lifecycle-bound HTML replacement.

**Source-behaviour contract:** owns one request to the verified Shopify related-recommendation source for the current product. It does not own Shopify’s relevance decision.

## Boundaries

It does not own Shopify’s algorithm, recommendation explanation, manual selection, product ranking, best-seller status, personalization, complementary intent, customer history, inventory, discounts, variants, product form, bundle logic, or product schema. Do not describe any returned product as personalized, complementary, popular, frequently bought together, or chosen for a reason Shopify has not exposed.

The renderer is shared with other product rails, but neither the data source nor the commerce meaning is shared. A Product Card does not turn Shopify related products into merchant curation.

## Section Structure

```text
Product Recommendations
├── Optional Section Heading (H2 or lower)
└── Recommendation content
    ├── Performed Shopify result → Product Card list
    ├── Initial client request → labelled loading spinner
    └── No result or request failure → section omitted outside design mode
```

The request URL is built only when a current `product` exists: `routes.product_recommendations_url?section_id=<section.id>&product_id=<product.id>&limit=<products_to_show>&intent=related`. The controller requests HTML with `Accept: text/html` and replaces only `[data-commerce-recommendation-content]`.

## Required Blocks

No blocks are implemented. The required source dependency is a real current product plus a Shopify related-recommendation response. `products_to_show` bounds the rendered result to the configured amount; no merchant product selection is available.

## Optional Blocks

No optional blocks are implemented. Heading and card treatment are section settings, not authored product, fallback, CTA, or recommendation blocks.

## Block Composition

Not applicable. The source response controls result order. Use one Product Recommendations instance per Product Page; it belongs after primary product understanding and should not sit beside another indistinguishable Product Card rail. The current product template provides one instance.

AI and merchants must prevent overlap with Complementary Products, Cross-sell Products, Recently Viewed Products, Product Carousel, Shop the Look, and bundle presentation. The section cannot guarantee a different product from other regions because the runtime has no cross-section deduplication.

## Component Dependencies

- **Documented component dependencies:** `Section Heading`, `Product Card`, `Price`, `Responsive Image`, `Button`, `Icon System`, `Loading Spinner`, and `section-spacing`.
- **Behaviour/controller dependency:** `CommerceRecommendationController` in `calinium-sections.js`.
- **Runtime-only dependencies:** optional `product-form.js`, quantity-input styles, `Cart Drawer` refresh event, and `calinium:content:replace` reinitialization.
- **Missing canonical dependency contract:** recommendation-source/controller lifecycle.

When Quick Add is enabled, Product Card retains the existing rule: an available single-variant product can use the shared Product Form; products requiring a meaningful variant choice use the normal product-page link; sold-out products have no active add action. Dynamic checkout, multi-product add, and a new form are prohibited.

## Content Rules

The heading may accurately describe related discovery but must not assert why Shopify chose results. Product title, URL, media, price, compare-at price, availability, and market-aware money rendering remain Shopify/Product Card truth. Do not author returned products into settings, make recommendation promises, or state a relationship Shopify has not verified.

The default heading is “You may also like”; it is not evidence of personalization. Omit the section rather than provide manual or invented fallback products.

## Asset Requirements

Returned products use their Shopify media through Product Card. `image_ratio`, `show_vendor`, `show_badges`, and `show_secondary_image` affect presentation only. Images are responsive and lazy through the existing primitive; no section-owned image, logo, or generated fallback is implemented.

## Supported Variants

- **Related Shopify response:** **Currently implemented** with `intent=related`.
- **Two to five desktop columns / one or two mobile columns:** **Currently implemented** through `columns_desktop` and `columns_mobile`.
- **Card presentation:** **Currently implemented** through `image_ratio`, vendor, badges, secondary image, and optional safe Quick Add settings.
- **Server-performed result:** **Currently implemented** when Shopify has already populated `recommendations`.
- **Client-rendered result:** **Currently implemented** through the scoped controller.

There is no merchant-curated, complementary, carousel, fallback-product, personalized, or explanation variant.

## Supported States

- **Server result:** Shopify has performed a non-empty result; cards render directly.
- **Initial request:** current product exists and recommendations are not performed; a labelled spinner renders.
- **Fewer results:** Shopify’s smaller response is rendered without filler.
- **Empty response:** the replaced section hides outside design mode; design mode shows localized guidance.
- **Request or malformed-response failure:** controller hides the section outside design mode; no customer-visible retry/error state is implemented.
- **Aborted request:** unload aborts the fetch; no failure UI is shown.
- **No current product:** no request URL exists; only design-mode preview may appear.
- **Unavailable/deleted/current/duplicate returned product:** Product Card or Shopify response governs; the section has no explicit local filter for any of these cases.
- **No JavaScript:** if server recommendations are already performed, cards work; otherwise current markup leaves a labelled loading shell. Clean omission is target behavior, not currently implemented.

## Theme Editor Settings

**Currently implemented stable IDs:** `eyebrow`, `heading`, `description`, `heading_size`, `text_alignment`, `products_to_show`, `columns_desktop`, `columns_mobile`, `image_ratio`, `show_vendor`, `show_badges`, `show_secondary_image`, `enable_quick_add`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

There are no blocks or app blocks. On `shopify:section:load`, the global lifecycle initializes one controller per root; `data-recommendation-requested` avoids a second request on that same root. On unload it aborts the active request and removes the visibility listener. Duplicate section instances can still make separate requests; block selection does not apply. Design mode suppresses automatic hiding but does not create recommendation data.

## Responsive Behaviour

The renderer is a mobile-first Product Card grid: one or two columns on mobile and two to five on desktop. It must preserve logical source order, 320 px usability, price/badge/CTA wrapping, 200% and 400% zoom, touch-safe controls, long translated headings, RTL QA, stable loading geometry, and no page-level overflow.

No dedicated RTL, high-zoom, or dynamic-insertion regression was found. These remain **Target behavior**.

## Accessibility

The target is WCAG 2.2 AA. **Currently implemented:** a local H2-or-lower heading, semantic list for results, labelled Loading Spinner, normal Product Card links, shared Quick Add focus/error behavior, and no automatic focus move when cards are inserted. The heading must accurately communicate related discovery rather than a stronger source meaning.

**Partially implemented:** dynamic result replacement dispatches `calinium:content:replace` for Product Form initialization, but no audited concise live announcement tells a screen-reader user that related products appeared. Failure silently hides the region. Verify focus order, inserted-card announcement, RTL, zoom, and touch target behavior manually.

## SEO and Structured Data

The section adds truthful product links only when Shopify returns them. It owns no page H1, metadata, canonical URL, Product, Offer, Review, ItemList, recommendation, personalization, or other structured data. It must not expose hidden result payload for search manipulation or claim a customer identity. Page-level Product schema remains with the Product Page runtime.

## Performance Rules

The request is one HTML fetch per initialized section root, deferred while the document is hidden and cancelled on unload. It has no retry, polling, observer, or global request deduplication. Dynamic cards are lazy/responsive and Product Form reinitializes through the content-replace event. Do not add preloads, repeated rails, eager secondary media, or unnecessary Quick Add forms.

**Implementation gap:** abort-on-unload exists, but there is no response sequence token or cross-instance stale-response/deduplication strategy. Below-fold use and a no-JavaScript result strategy require hardening before relying on the region universally.

## Motion Rules

No carousel, autoplay, forced smooth scroll, automatic focus movement, or motion used to imply relevance is implemented. Loading Spinner motion is shared and must respect reduced motion. Card insertion has no required transition; the section must remain understandable if JavaScript or motion is unavailable.

## AI Guidelines

AI may select Product Recommendations only on a Product Page with a real current product, Shopify related behavior available, adequate performance budget, and no nearby rail with the same source meaning. It must preserve stable settings, accept Shopify’s response without preselection or explanation, and omit the region when results cannot be safely shown.

AI must not create fallback products, fabricate recommendation results or relevance, call products personalized/complementary/best-selling, include the current product deliberately, promise product count, duplicate Main Product, or create Product schema. It must prefer omission over fabricated merchandising.

## Implementation Audit

**Source briefs inspected:** `product-recommendations.md`, `premium-product.md`, `commerce-merchandising-pack.md`, plus boundary briefs for carousel, highlights, Shop the Look, Cart, complementary, cross-sell, recently viewed, and bundle behavior.

**Runtime inspected:** `product-recommendations.liquid` schema/preset and product-only enablement; `product.json`; Product Card/Form and cart-refresh integration; `CommerceRecommendationController`; commerce CSS; global lifecycle; mappings/capability catalog; focused commerce and premium-product tests.

**Currently implemented:** verified related endpoint parameters, server/client HTML rendering, loading shell, responsive cards, optional safe Quick Add, visibility deferral, abort-on-unload, and Product Form initialization after replacement. **Partially implemented:** no explicit local current-product or duplicate exclusion and no announced dynamic result. **Not implemented:** merchant fallback, visible failure/retry state, clean no-JavaScript omission before server results, cross-instance request dedupe, or relevance explanation. **Unknown:** Shopify’s returned ranking, cache behavior, full RTL/assistive QA, and current-product exclusion at the platform layer.

## Quality Checklist

- [x] Source meaning remains Shopify related recommendations.
- [x] Renderer and source-behaviour ownership are separate.
- [x] Uses no blocks, no manual fallback, and only real Shopify result data.
- [x] Documents current-product/duplicate limits, unavailable/deleted response limits, failure, abort, and no-JavaScript gaps.
- [x] Preserves Product Card, safe Quick Add, dynamic replacement, source-accurate heading, SEO boundaries, and AI omission rules.

## Future Compatibility

Preserve `product-recommendations`, all listed setting IDs, product-template enablement, `intent=related`, `section_id`/`product_id`/`limit` request semantics, Product Card interface, and safe Product Form/Cart Drawer integration. Future work may add verified server/no-JavaScript omission, local exclusion/deduplication, visible recoverable failure feedback, and controller request-versioning without reclassifying results as curation or personalization.

Shopify recommendation API, Section Rendering output, market pricing, localization, Product Card, future block contracts, preset composition, and generator mappings may evolve only with backward-compatible defaults and preserved merchant instances.
