# Cross-sell Products

## Purpose

Cross-sell Products is a static, merchant-curated product list for an explicit campaign or merchandising plan. It uses shared Product Card presentation but is never algorithmic, Shopify-recommended, personalized, complementary by implication, recently viewed, or a bundle.

**Currently implemented:** `cross-sell-products` renders up to eight selected `product` blocks directly from Shopify section settings.

## Customer Goals

Customers should see a calm, clearly curated selection of real products, understand each item through normal Product Card information, and choose a product without being told an unverified relationship exists. The list must work before JavaScript.

## Merchant Goals

Merchants should intentionally select and order products for a verified campaign or approved merchandising relationship, choose grid or compact card presentation, and exclude the current product where appropriate. They do not configure an algorithm, customer history, recommendation endpoint, compatibility model, discount, or multi-item cart action.

## Shopify Context

The stable runtime ID is `cross-sell-products`. The audited schema has no `enabled_on` restriction, a maximum of eight `product` blocks, and no direct JSON-template assignment. Canonically it may support a Product Page after `main-product`, a campaign Homepage, or a strategically justified Standard Page.

It is not currently assigned to Cart; Cart’s own merchant-selected recommendation controls are a separate architecture. It is prohibited on Search, Contact, Blog, Article, 404, account, checkout, and global shell surfaces. It must not replace a Collection Page grid, Product Page main system, or Search results.

## Responsibilities

**Renderer contract:** owns local heading, static Product Card grid/compact-row layout, authoring empty state, responsive presentation, and no-JavaScript output.

**Source-behaviour contract:** owns only explicit merchant block selection and source order. It does not infer why products relate to each other or the current product.

## Boundaries

It does not own Shopify recommendations, complementary intent, browsing history, ranking, personalization, current-product data, compatibility, inventory relationships, discounting, bundle logic, product form, collection membership, or cart architecture. `card_style: compact` is a CSS presentation of Product Card, not a second renderer or recommendation source.

Do not call selected products “recommended,” “frequently bought together,” “compatible,” “complete the set,” or “bundle” unless separate verified content permits that exact claim.

## Section Structure

```text
Cross-sell Products
├── Optional Section Heading (H2 or lower)
└── Merchant-selected product blocks
    └── De-duplicated Product Card list → normal product link / optional safe Quick Add
```

The section has no endpoint, storage, loading state, request controller, or dynamic product query. Output is server-rendered.

## Required Blocks

The only implemented block type is `product`, capped at eight, with stable `product` picker. A valid customer-facing block requires a real selected Shopify product. On a Product Page, `exclude_current_product` defaults to true and suppresses a block whose handle matches the current product.

## Optional Blocks

No optional block type is implemented. Blank `product` blocks show a placeholder only in design mode and are omitted on the storefront. AI must omit rather than preserve an incomplete block.

## Block Composition

Blocks are repeatable, reorderable, and capped at eight. Source order becomes output order after handle de-duplication and, when enabled, current-product exclusion. The first selection wins; duplicate handles are omitted. Current-product inclusion is technically possible if `exclude_current_product` is false, but canonical Product Page usage retains the default unless an explicit approved campaign requires otherwise.

Use one cross-sell instance per page and normally two to eight distinct products. Place it after primary product understanding or campaign orientation, never before `main-product`. Do not place adjacent product rails with indistinguishable headings or repeat the same products in Product Carousel, Complementary Products, Recently Viewed, Shop the Look, or Bundle Showcase.

## Component Dependencies

- **Documented component dependencies:** `Section Heading`, `Product Card`, `Price`, `Responsive Image`, `Button`, `Icon System`, and `section-spacing`.
- **Runtime-only dependencies:** optional Product Form, quantity-input styles, and Cart Drawer refresh event.
- **Behaviour/controller dependency:** none; this section is static.
- **Missing canonical dependency contract:** approved merchant-curation relationship model.

Quick Add remains shared Product Card behavior only. Available single-variant products can use the existing form; multi-variant products link to the Product Page; sold-out products do not become addable. There is no dynamic checkout, grouped add, or product-form duplication.

## Content Rules

Every selected product and local heading must be merchant-approved and truthful. Product title, image, price, compare-at price, availability, URL, and current market display remain Shopify truth. Supporting copy may say that the selection is curated only when that is accurate; it must not infer a relationship from tags, visual similarity, collection membership, or product descriptions.

## Asset Requirements

Product Cards use Shopify product media with responsive lazy loading. Stable presentation settings include `image_ratio`, `show_vendor`, `show_badges`, and `show_secondary_image`; there are no section-owned images or block overrides. Missing/deleted product media must not be replaced with stock or generated content.

## Supported Variants

- **Grid cards:** **Currently implemented** through `card_style: grid`.
- **Compact rows:** **Currently implemented** through `card_style: compact`; it reflows the same Product Card CSS.
- **One/two mobile and two-to-four desktop columns:** **Currently implemented** through column settings.
- **Current-product exclusion:** **Currently implemented** and defaulted on.
- **Optional safe Quick Add:** **Currently implemented** through Product Card.

There is no recommendation API, carousel, fallback source, automatic relation, personalized, bundle, or discount variant.

## Supported States

- **Fully configured:** unique valid selected products render in source order.
- **Duplicate selection:** later duplicate handles are omitted.
- **Current product:** omitted when `exclude_current_product` is true; may render when false.
- **Empty/blank/deleted selection:** storefront omits it; design mode shows a placeholder/empty guidance.
- **Unavailable/sold out:** Product Card presents Shopify-derived state without a local substitute.
- **No JavaScript:** all selected products and links remain server-rendered; optional Quick Add uses its shared progressive path.
- **Request/storage failure:** not applicable; this section makes neither a request nor storage access.

## Theme Editor Settings

**Currently implemented stable section IDs:** `eyebrow`, `heading`, `description`, `heading_size`, `text_alignment`, `columns_desktop`, `columns_mobile`, `card_style`, `image_ratio`, `show_vendor`, `show_badges`, `show_secondary_image`, `enable_quick_add`, `exclude_current_product`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

The stable `product` block ID is `product`; maximum eight. Blocks are addable, removable, duplicable, and reorderable. There is no section-specific controller, request, block-selection handler, app-block support, or observer. Product Form lifecycle applies only when Quick Add is enabled.

## Responsive Behaviour

The static grid is mobile-first, with one/two mobile and two-to-four desktop columns; compact mode remains one column and uses a smaller media/detail arrangement. It must support 320 px, 200%/400% zoom, long localized names/headings, price and badge wrapping, touch-safe controls, RTL, landscape mobile, and no page-level horizontal overflow. Responsive Product Card media is lazy and ratio-bound.

Full RTL and high-zoom regression evidence is **Unknown**.

## Accessibility

The target is WCAG 2.2 AA. **Currently implemented:** H2-or-lower local heading, semantic list, normal product links, Product Card image alternatives/price states, and shared Quick Add focus and feedback. Static rendering avoids dynamic insertion and automatic focus movement.

Do not use visual grouping or card style as the only source meaning. Verify long product names, compact layout focus order, quick-add error feedback, RTL, and zoom manually.

## SEO and Structured Data

The section contributes real product links only. It owns no page H1, metadata, canonical URL, Product, Offer, Review, ItemList, recommendation, personalization, or bundle schema. Its heading must not overstate the merchant curation, and hidden/empty blocks must not be used for search manipulation.

## Performance Rules

The source is server-rendered, with no fetch, storage parsing, controller, polling, observer, or local request lifecycle. Product Card images are lazy/responsive and optional Quick Add loads only when enabled. Bound output to eight blocks, avoid repeated rails, and keep the section below primary product content so it does not compete for LCP.

## Motion Rules

No local animation, autoplay, carousel, loading motion, or automatic focus move is implemented. Compact versus grid is responsive CSS presentation, not animated transformation. Shared Product Card/Form motion must honor reduced motion.

## AI Guidelines

AI may populate Cross-sell Products only from an explicit approved merchandising plan, merchant-approved product relationships, or approved campaign composition. It must use distinct real products, preserve merchant order, keep `exclude_current_product` enabled on Product Pages unless explicitly authorized, and choose one bounded renderer variant.

AI must not infer relationships from tags, titles, images, or similarity; call selection algorithmic/recommended/complementary; fabricate products, prices, discounts, availability, inventory, variants, or bundle claims; or use the section to replace Main Product, cart, Search, or a collection grid.

## Implementation Audit

**Source briefs inspected:** `cross-sell-products.md`, `premium-product.md`, `commerce-merchandising-pack.md`, plus product-carousel, highlights, Shop-the-Look, Cart, and other recommendation/curation briefs.

**Runtime inspected:** `cross-sell-products.liquid` schema/preset and static block logic; Product Card/Form/cart refresh; commerce CSS; global Theme Editor lifecycle; mappings/capability catalog; and Page contracts.

**Currently implemented:** static explicit blocks, max-eight limit, handle de-duplication, optional current exclusion, grid/compact presentation, responsive cards, design-mode placeholders, and optional safe Quick Add. **Partially implemented:** no authoring warning for a duplicate/current-product block and no cross-section product dedupe. **Not implemented:** endpoint, fallback, controller, cart-template assignment, relation validation, dynamic error state, or personalization. **Unknown:** full RTL, zoom, and assistive manual QA.

## Quality Checklist

- [x] Source meaning remains manual merchant curation.
- [x] Renderer/source ownership and no-algorithm boundary are explicit.
- [x] Documents exact block/settings model, ordering, duplicate/current exclusion, and static states.
- [x] Preserves Product Card and safe Quick Add without bundle/cart claims.
- [x] Requires deterministic approved-product selection and omission of incomplete blocks.

## Future Compatibility

Preserve `cross-sell-products`, `product.product`, all listed setting IDs, source order, handle de-duplication, current-exclusion default, Product Card interface, and static no-JavaScript output. Future work may add authoring validation, verified Cart integration, and cross-section duplication review without changing curated relationships or recasting them as Shopify recommendations.

Future Product Card, Product Form, Cart Drawer, market pricing, localization, block, preset, app-block, and generator changes must remain backward compatible and must not introduce inference, personalization, or transactional bundle behavior.
