# Product Bundle Showcase

## Purpose

Product Bundle Showcase is a merchant-curated presentation of a small group of real products. It may show an available-item subtotal, but it is explicitly not a Shopify bundle, atomic multi-item purchase, bundle discount, coordinated variant selector, or one-click set add.

**Currently implemented:** `product-bundle-showcase` renders up to five selected products and sums the price of each selected product’s `selected_or_first_available_variant` only when that variant is available.

## Customer Goals

Customers should be able to explore a considered group, understand that each product remains an individual purchase decision, see truthful individual prices/statuses, and follow normal product links or safe individual Quick Add. They must not be misled into expecting savings, a combined inventory promise, or a multi-item checkout action.

## Merchant Goals

Merchants should deliberately select and order a small product group, add truthful narrative and an optional verified destination, and omit the showcase when grouping is not meaningful. They do not configure an actual bundle product, a combined discount, stock reservation, component inventory, fulfillment, or automatic cart action.

## Shopify Context

The stable runtime ID is `product-bundle-showcase`. Its schema has no `enabled_on` restriction and allows up to five `product` blocks; no direct JSON-template assignment was found. Canonical contexts are Homepage, a campaign Standard Page, a coherent collection landing context, or a Product Page after `main-product` when the merchant explicitly approves the group.

It is prohibited on Search, Contact, Blog, Article, 404, account, checkout, and global shell surfaces. It must not replace Main Product, a Collection grid, cart architecture, real Shopify bundle functionality, recommendations, or Search.

## Responsibilities

**Renderer contract:** owns local heading/description, an ordered Product Card group, localized available-item subtotal, optional verified destination link, responsive layout, and editor empty guidance.

**Source-behaviour contract:** owns only explicit merchant `product` block selection and grouping. It does not create a Shopify bundle relationship or assert that selected products are bought together.

## Boundaries

It does not own atomic add-to-cart, bundle inventory, component quantities, combined variants, bundle discount, compare-at bundle price, savings, reservation, shipping/tax calculation, fulfillment, Shopify Bundles integration, frequently-bought-together meaning, recommendation ranking, or a product form. An optional `bundle_link` is a normal verified URL, not a transactional group action.

Never use “bundle and save,” “set discount,” “special bundle price,” “one-click bundle,” “complete bundle,” or “frequently bought together” unless a separate real bundle implementation and merchant evidence support the statement.

## Section Structure

```text
Product Bundle Showcase
├── Optional Section Heading (H2 or lower)
├── Merchant-selected product blocks → de-duplicated Product Card group
├── Available-item subtotal
└── Optional normal destination link
```

The subtotal is server-rendered as a money value. It is a display calculation, not an interactive cart total.

## Required Blocks

The only implemented block type is `product`, with stable `product` picker and maximum five. The runtime can render one valid product, but canonical showcase use requires two to five distinct merchant-approved products. Product blocks may include the current product; no automatic current-product exclusion is implemented because the group may intentionally include it.

## Optional Blocks

No optional block type is implemented. `bundle_link` and `bundle_link_label` are paired section settings, not CTA blocks. Blank/deleted product blocks are omitted from storefront output and shown as placeholders only in Theme Editor.

## Block Composition

Product blocks are repeatable, reorderable, and capped at five. Source order becomes output order after handle deduplication; the first selection wins. The same deduplicated group is used for subtotal calculation. Use one instance per page, after primary product or campaign orientation, and avoid adjacent rails that present the same products without a distinct decision purpose.

Do not repeat the group in Product Carousel, Cross-sell, Complementary, Recommendations, Recently Viewed, or Shop the Look. The section has no current-product exclusion, so AI must make that choice explicitly according to the approved group rather than infer it.

## Component Dependencies

- **Documented component dependencies:** `Section Heading`, `Product Card`, `Price`, `Responsive Image`, `Button`, `Icon System`, money formatting, and `section-spacing`.
- **Runtime-only dependencies:** optional Product Form, quantity-input styles, and Cart Drawer refresh event.
- **Behaviour/controller dependency:** none; grouping and subtotal are Liquid-rendered.
- **Missing canonical dependency contract:** actual Shopify bundle/inventory/discount integration, which this section intentionally does not provide.

Quick Add is individual Product Card behavior only. An available single-variant product can add individually; a multivariant product links to product selection; an unavailable product is not addable. No action adds all selected products or synchronizes variants.

## Content Rules

Select only real merchant-approved products and truthful group narrative. Product title, URL, media, price, compare-at price, availability, and current market formatting remain Shopify/Product Card truth. The section description may explain a considered group but cannot state that it is discounted, complete, compatible, guaranteed, or a native bundle without evidence.

The optional link must have both `bundle_link` and `bundle_link_label` and point to a verified destination. It must not pretend to add the group to cart or represent a bundle checkout path.

## Asset Requirements

Selected products supply Shopify media through Product Card. `image_ratio`, `show_vendor`, and `show_secondary_image` are stable presentation settings; sale and sold-out badges are currently passed to Product Card without a separate section badge setting. There are no group hero, block image, bundle logo, or fabricated fallback assets.

## Supported Variants

- **Two to five selected product group:** **Currently implemented** as repeatable merchant blocks; two is the canonical minimum.
- **Two to four desktop / one or two mobile columns:** **Currently implemented** through column settings.
- **Available-item subtotal:** **Currently implemented** as a server-rendered display calculation.
- **Optional normal destination link:** **Currently implemented** when both paired link settings exist.
- **Optional individual safe Quick Add:** **Currently implemented** through Product Card.

There is no transactional bundle, merged product form, discount, automatic set purchase, dynamic subtotal, carousel, recommendation, or inventory-coordination variant.

## Supported States

- **Fully configured:** two to five distinct selected products, subtotal, and optional verified link render.
- **One selected product:** runtime renders it, but canonical generation omits this incomplete showcase.
- **Duplicate selection:** later duplicate handle is omitted from cards and subtotal.
- **Blank/deleted selection:** omitted on storefront; editor placeholder remains.
- **Unavailable product:** Product Card shows its actual state; it remains in the product group but does not contribute to subtotal if its selected/first available variant is unavailable or absent.
- **No selected products:** editor empty guidance; storefront is quiet.
- **No JavaScript:** cards, subtotal, and normal link remain server-rendered; optional Quick Add uses shared progressive enhancement.
- **Request/storage failure:** not applicable; this section makes neither request nor storage access.

## Theme Editor Settings

**Currently implemented stable section IDs:** `eyebrow`, `heading`, `description`, `heading_size`, `text_alignment`, `columns_desktop`, `columns_mobile`, `image_ratio`, `show_vendor`, `show_secondary_image`, `enable_quick_add`, `bundle_link`, `bundle_link_label`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

The stable `product` block ID is `product`; maximum five. Blocks are addable, removable, duplicable, and reorderable. There is no section controller, request, observer, block-select handler, app-block support, dynamic subtotal update, or automatic integrity validation. Product Form lifecycle applies only when individual Quick Add is enabled.

## Responsive Behaviour

The group is a mobile-first grid with one/two mobile and two-to-four desktop columns; the subtotal flexes/wraps as a separate summary row. It must retain source order, stable card media, readable subtotal/link wrapping, touch-safe controls, 320 px support, 200%/400% zoom, long translations, RTL, and no horizontal page overflow.

Full RTL, high-zoom, and multi-currency manual QA is **Unknown**.

## Accessibility

The target is WCAG 2.2 AA. **Currently implemented:** H2-or-lower local heading, role/listitem product group, Product Card link/price/availability semantics, visible subtotal text, normal optional link, and shared Quick Add focus/error behavior. The subtotal label must clearly indicate that it is a display of available individual items, not a checkout total.

Do not convey set meaning, savings, or availability by layout/color alone. Verify subtotal wording, unavailable items, link purpose, price wrapping, zoom, RTL, and Product Form feedback manually.

## SEO and Structured Data

The section adds real product links and truthful visible group content only. It owns no H1, metadata, canonical URL, Product, Offer, Review, ItemList, bundle, discount, or combined-price schema. It must not emit bundle schema merely because a subtotal or word “bundle” appears. Page-level schema remains centrally owned.

## Performance Rules

The section is server-rendered with no endpoint, storage parsing, controller, polling, or request lifecycle. Product Card images are lazy/responsive; subtotal calculation is bounded to five unique products; optional Product Form loads only for Quick Add. Avoid duplicate groups, eager lower-page images, or a link/action that suggests expensive transactional behavior.

The Product Page primary content remains ahead of this region. Any future real bundle integration needs separate performance, inventory, cart, and variant contracts.

## Motion Rules

No local motion, carousel, loading animation, automatic focus move, or group transition is implemented. The subtotal does not animate or respond dynamically. Shared Product Card/Form behavior must respect reduced motion.

## AI Guidelines

AI may select Product Bundle Showcase only from an explicit approved merchant product group on a permitted page. It must select two to five distinct real products, preserve merchant order, use the available-item subtotal accurately, validate optional link destination, and leave individual purchase actions independent.

AI must not infer a group from tags, images, titles, or recommendations; create bundle products, discounts, savings, compatibility, inventory, combined variants, taxes, shipping, or a multi-item add; call the subtotal a bundle price; or emit bundle schema. It must omit the section when a truthful curated group is unavailable.

## Implementation Audit

**Source briefs inspected:** `product-bundle-showcase.md`, `premium-product.md`, `commerce-merchandising-pack.md`, `premium-cart.md`, and Batch 4/product-discovery boundary briefs.

**Runtime inspected:** `product-bundle-showcase.liquid` schema/preset/static Liquid, Product Card/Form/cart integration, commerce CSS, theme lifecycle, templates, mappings/capabilities, and commerce-pack validation.

**Currently implemented:** max-five explicit product blocks, handle de-duplication, static Product Card group, optional normal link, available selected/first-variant subtotal, unavailable-variant exclusion from subtotal, responsive layout, design-mode placeholders, and individual safe Quick Add. The current schema default heading is “Complete the set”; it must be reviewed so a curated group is not mistaken for a transactional bundle. **Partially implemented:** runtime allows one product and has no authoring warning for duplicate, deleted, unavailable, or current-product selections. **Not implemented:** real bundle integration, group cart add, discounts, compare-at subtotal, selected-variant subtotal, dynamic update, current-product exclusion, cart-template assignment, or validation controller. **Unknown:** market pricing semantics of the money filter, full RTL/zoom/accessibility QA, and direct JSON-template assignment.

## Quality Checklist

- [x] Source meaning remains merchant-curated non-transactional group.
- [x] Separates renderer, group selection, subtotal display, and real bundle ownership.
- [x] Documents exact block/settings model, dedupe, unavailable subtotal rule, and current-product limit.
- [x] Prohibits savings, atomic add, inventory, discount, and bundle-schema claims.
- [x] Preserves Product Card/Quick Add safety and deterministic omission rules.

## Future Compatibility

Preserve `product-bundle-showcase`, `product.product`, all listed setting IDs, block order, handle dedupe, subtotal calculation semantics, normal link behavior, Product Card interface, and static no-JavaScript rendering. Future work may add authoring validation, explicit current-product policy, clear subtotal accessibility wording, market/RTL QA, and generator/preset controls without silently changing a merchant group.

A real Shopify bundle, discount, inventory, multi-item cart, app-block, or variant-coordination capability requires its own approved architecture and must not be smuggled into this showcase. Future Product Form, Cart Drawer, localization, market, and generator changes must retain backward-compatible defaults.
