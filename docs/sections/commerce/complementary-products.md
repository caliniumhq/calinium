# Complementary Products

## Purpose

Complementary Products renders Shopify’s **complementary** recommendation intent for the current product, with explicit merchant-selected fallback products where the current runtime supports them. It is neither related recommendations nor inferred accessory compatibility.

**Currently implemented:** `complementary-products` requests `intent=complementary`, renders fallback blocks while results are unperformed or empty, and replaces fallback content with Shopify results when the response is non-empty.

## Customer Goals

Customers should encounter a small, clearly bounded continuation of the current product decision, see real available/sold-out product states, and retain normal product links. They must not be told an item is required, compatible, discounted, or a bundle without independent verified evidence.

## Merchant Goals

Merchants may control heading/card presentation and define up to eight explicit fallback products. They do not control Shopify complementary results or transform fallback selection into a claim that Shopify chose those products.

## Shopify Context

The stable runtime ID is `complementary-products`; the schema is enabled only on product templates, has a maximum of eight `fallback_product` blocks, and no direct assignment was found in the canonical `product.json`. It is an optional Product Page section after `main-product` and before closing proof/content when it adds a distinct customer decision.

It is prohibited as an ordinary Homepage, Collection, Standard Page, Search, Cart, Contact, Blog, Article, 404, account, checkout, or global-shell section. Cart has a separate documented recommendation architecture; this product-context section cannot be moved there automatically.

## Responsibilities

**Renderer contract:** owns heading, Product Card grid, fallback display, labelled loading state when neither source has a result, responsive layout, empty omission, and HTML replacement.

**Source-behaviour contract:** owns the current-product complementary request and explicit fallback source. Shopify owns complementary relevance; merchant blocks own only fallback selection and order.

## Boundaries

It does not own related recommendations, manual cross-sell, recently viewed history, recommendation ranking, inferred compatibility, variant compatibility, bundle logic, savings, inventory, discounts, or a purchase form. A fallback block is not an algorithmic result, and an API result is not merchant curation.

Do not use headings or text that imply “required accessory,” “works with,” “complete the set,” “commonly bought together,” compatibility, or a bundle price unless merchant-approved evidence separately supports the wording.

## Section Structure

```text
Complementary Products
├── Optional Section Heading (H2 or lower)
└── Content source
    ├── Non-empty Shopify complementary response → Product Card list
    ├── Explicit fallback_product blocks → de-duplicated Product Card list
    ├── Neither source while client request is pending → labelled spinner
    └── No result/failure → omitted outside design mode
```

The verified URL is `routes.product_recommendations_url?section_id=<section.id>&product_id=<product.id>&limit=<products_to_show>&intent=complementary`.

## Required Blocks

No block is required when Shopify returns complementary products. The implemented optional `fallback_product` block has one `product` picker and is capped at eight. For canonical fallback use, every selected product must be real, distinct, explicitly approved, and different from the current product.

## Optional Blocks

`fallback_product` is the only optional block type. It is displayed when Shopify results are unperformed or empty; it is not appended to a non-empty Shopify response. Blank/deleted blocks are omitted in storefront output and shown as authoring guidance only in design mode.

## Block Composition

Fallback blocks are repeatable, reorderable, and capped at eight. Their source order becomes the fallback display order after current-product exclusion and handle deduplication. `products_to_show` limits the Shopify request, but current fallback rendering can show all eight valid fallback blocks; it is not locally limited by that setting.

Use one instance per Product Page. Keep it after primary product understanding and avoid adjacent related, cross-sell, recently viewed, carousel, bundle, or Shop-the-Look rails that repeat the same products. The renderer does not de-duplicate Shopify results against fallback blocks because the two paths do not render together.

## Component Dependencies

- **Documented component dependencies:** `Section Heading`, `Product Card`, `Price`, `Responsive Image`, `Button`, `Icon System`, `Loading Spinner`, and `section-spacing`.
- **Behaviour/controller dependency:** `CommerceRecommendationController`.
- **Runtime-only dependencies:** optional Product Form, quantity input, Cart Drawer refresh, and content-replace Product Form initialization.
- **Missing canonical dependency contract:** complementary source and fallback arbitration controller.

Quick Add remains only the shared Product Card/Product Form path for an available single-variant product. Multi-variant products use their product page, sold-out products have no active add control, and no multi-product add, dynamic checkout, or bundle action is introduced.

## Content Rules

Use Shopify data for API results and explicit approved merchant product selections for fallback blocks. Product title, URL, media, availability, price, compare-at price, and market rendering remain Shopify truth. Fallback headings must remain source-accurate and must not present fallback products as Shopify’s response.

No fallback is permission to infer compatibility from titles, tags, collections, images, or descriptions. Omit unsupported relationship language rather than making an accessory or set claim.

## Asset Requirements

All product imagery comes from selected Shopify products through Product Card. `image_ratio`, `show_vendor`, `show_badges`, and `show_secondary_image` are presentation controls. There are no section-owned assets or fallback images; unavailable/deleted selections must not be visually replaced with invented media.

## Supported Variants

- **Shopify complementary response:** **Currently implemented** through `intent=complementary`.
- **Explicit fallback list:** **Currently implemented** through up to eight `fallback_product` blocks; it is shown before an unperformed response and retained for an empty response.
- **Two to five desktop / one or two mobile columns:** **Currently implemented** through section settings.
- **Product Card treatments and optional safe Quick Add:** **Currently implemented**.

There is no related-recommendation, cross-sell, merged API-plus-fallback, compatibility-verification, carousel, or bundle variant.

## Supported States

- **Shopify result:** non-empty response replaces any fallback list.
- **Fallback available:** valid blocks render before a client response and after an empty response.
- **Initial no-source state:** a labelled spinner renders only when current product exists and no fallback exists.
- **Empty response and no fallback:** section hides outside design mode; localized editor guidance remains.
- **Request failure:** current controller hides the whole section outside design mode, including an initially rendered fallback list; preserving fallback on failure is target behavior.
- **Aborted request:** unload aborts the request without an error state.
- **Current/duplicate fallback:** Liquid excludes fallback product handles matching the current product and de-duplicates fallback handles.
- **API current/duplicate result:** no local source filtering is implemented; platform behavior is unknown.
- **Unavailable/deleted product:** Product Card or blank Shopify object determines presentation; no special local removal occurs.
- **No JavaScript:** fallback list is server-rendered when configured; without fallback and without a performed response, current markup leaves a labelled loading shell.

## Theme Editor Settings

**Currently implemented stable section IDs:** `eyebrow`, `heading`, `description`, `heading_size`, `text_alignment`, `products_to_show`, `columns_desktop`, `columns_mobile`, `image_ratio`, `show_vendor`, `show_badges`, `show_secondary_image`, `enable_quick_add`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

**Currently implemented block:** `fallback_product` with stable `product` ID; maximum eight. Blocks are addable, removable, duplicable, and reorderable. The global lifecycle creates one recommendation controller per root on section load and aborts it on unload; it has no block-select behavior. Design mode avoids automatic hide but does not create API data. No app-block support is audited.

## Responsive Behaviour

The current renderer is a mobile-first Product Card grid with one/two mobile and two-to-five desktop columns. It must retain source order for fallback blocks, stable loading space, readable price/badge/CTA wrapping, 320 px and zoom safety, touch-safe controls, long localized headings, and RTL QA without horizontal page overflow.

RTL, 400% zoom, and network-failure fallback rendering have no dedicated audit evidence and remain **Target behavior**.

## Accessibility

The target is WCAG 2.2 AA. **Currently implemented:** H2-or-lower section heading, semantic product list, labelled spinner, normal Product Card links, and shared Product Form states. The source-meaning heading must never imply compatibility or a bundle merely because complementarity is the requested Shopify intent.

**Implementation gaps:** dynamic replacement has no audited concise result announcement; network failure silently hides even explicit fallback. Do not use color, order, badges, or Quick Add as the only indication of relationship or availability. Verify inserted cards, error recovery, zoom, RTL, and keyboard traversal manually.

## SEO and Structured Data

The section adds real product links only. It owns no H1, metadata, canonical URL, Product, Offer, Review, ItemList, recommendation, compatibility, bundle, or personalization schema. Do not emit schema because a complementary response or fallback block exists, and do not keyword-stuff relationship text.

## Performance Rules

One controller fetches HTML per initialized section root, defers while hidden, and aborts on unload. Fallback Product Cards are server-rendered; dynamic cards are lazy/responsive and reinitialize optional Product Forms through `calinium:content:replace`. No polling, retry, global request dedupe, or response-version guard exists.

Avoid duplicated product rails, excessive fallback blocks, eager media, and Quick Add on products requiring selection. **Target behavior:** retain valid fallback UI after endpoint failure and provide clean no-JavaScript omission when neither source is server-rendered.

## Motion Rules

No carousel, autoplay, forced focus move, or motion that implies complementarity is implemented. Loading spinner motion is shared and must respect reduced motion. Replacement must remain comprehensible without an insertion animation.

## AI Guidelines

AI may select Complementary Products only for a real Product Page current-product context, with Shopify complementary behavior available and no nearby source-conflating rail. It may populate fallback blocks only from explicit approved merchant relationships, must exclude the current product, de-duplicate selected fallbacks, preserve source order, and use source-accurate wording.

AI must not infer compatibility, preselect Shopify results, merge fallbacks into results, call fallback products Shopify recommendations, invent prices/savings/bundle terms, or add unsafe Quick Add. It must omit the section when neither API meaning nor explicit fallback can be presented truthfully.

## Implementation Audit

**Source briefs inspected:** `complementary-products.md`, `premium-product.md`, `commerce-merchandising-pack.md`, and boundary briefs for product rails, cart, related recommendations, cross-sell, recently viewed, and bundles.

**Runtime inspected:** `complementary-products.liquid` schema/preset/product enablement and fallback logic; Product Card/Form and cart refresh; `CommerceRecommendationController`; commerce CSS; global lifecycle; product template; mappings/capabilities and focused tests.

**Currently implemented:** complementary endpoint parameters, eight fallback blocks, fallback dedupe/current exclusion, response-overrides-fallback order, responsive cards, optional safe Quick Add, visibility deferral, abort cleanup, and content-replace initialization. The current schema default heading is “Complete the set”; merchants must review it because that wording can overstate an unverified relationship. **Partially implemented:** no local filter for API current/duplicate results and no dynamic announcement. **Not implemented:** fallback retention on failed request, clean no-JavaScript no-source omission, cross-instance dedupe, merged sources, compatibility verification, or visible retry/error state. **Unknown:** Shopify’s API relevance/ranking/filtering, cache behavior, market/RTL manual QA.

## Quality Checklist

- [x] Source meaning remains Shopify complementary intent plus explicit fallback.
- [x] Separates renderer, API source, and merchant fallback ownership.
- [x] Records exact block/settings model, fallback ordering, current-product exclusion, and dedupe limits.
- [x] Prohibits inferred compatibility, bundle, algorithmic, and discount claims.
- [x] Records dynamic/no-JavaScript failure and lifecycle limitations for future hardening.

## Future Compatibility

Preserve `complementary-products`, `fallback_product.product`, all listed setting IDs, product-template enablement, `intent=complementary`, response-overrides-fallback order, fallback source order, Product Card interface, and shared Product Form/Cart Drawer path. Future changes may add local API dedupe/exclusion, fallback-on-error, request versioning, accessible announcement, and verified no-JavaScript behavior without silently changing existing fallback selections.

Shopify recommendation/API changes, Section Rendering output, market pricing, localization, storage/privacy governance, future block contracts, presets, and generator mappings must retain backward-compatible defaults and never recast fallback curation as Shopify recommendation relevance.
