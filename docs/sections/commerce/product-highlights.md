# Product Highlights

## Purpose

Product Highlights is a selected-product narrative region that pairs one real Product Card with a concise, merchant-authored list of factual benefits. It helps customers understand a product without duplicating `main-product`, the product gallery, product description architecture, or purchase form.

**Currently implemented:** `product-highlights` renders one selected product through Product Card, a truncated Shopify product description, and up to six `highlight` blocks.

## Customer Goals

Customers should be able to understand a few clear, relevant product details, recognize the real product and its price path, and continue to the product through normal Product Card behavior. The section should remain calm, scannable, useful without JavaScript, and truthful when a benefit is unavailable.

## Merchant Goals

Merchants should select one real product, state verified highlights in their intended order, optionally choose an approved icon, and select a quiet layout. They do not use this region to rebuild a product page, invent specifications, manage variants, or create a second authoritative purchase experience.

## Shopify Context

The runtime section ID is `product-highlights`. Its schema has one product setting and a maximum of six `highlight` blocks. Canonical contexts are Homepage after the primary lead, Product Page after the required `main-product` only when it adds non-duplicative context, and a purposeful Standard Page. Collection Page use is limited to a directly relevant featured product and should not interrupt mandatory browsing.

It is prohibited as a replacement for `main-product`, Search, Cart, Contact, Blog index, Article, 404, account, checkout, and global shell surfaces. On a Product Page, use the page’s actual product by default; selecting a different product is technically possible but requires an explicit, documented merchandising purpose.

## Responsibilities

Product Highlights owns a local heading group, one selected product representation, a concise product-description excerpt supplied by Shopify, a bounded ordered list of merchant-authored benefits, optional decorative icons, split media/content composition, and local empty authoring feedback.

## Boundaries

It does not own the Product Page H1, gallery, variants, inventory, SKU, purchase controls, product-form validation, product recommendations, comparison tables, material truth, craftsmanship narrative, collection membership, or a free-standing CTA. Product Card retains product link, price, availability, and optional safe Quick Add behavior.

The section description setting is section-intro copy; it does not replace the selected product’s excerpt. Do not use highlights to repeat the entire product description, translate subjective copy into factual performance claims, or manufacture a feature list from images alone.

## Section Structure

```text
Product Highlights
├── Optional Section Heading (H2 or lower)
└── Selected Product layout
    ├── Product Card → real product route / optional safe Quick Add
    └── Product description excerpt
        └── Repeatable highlight block → optional decorative icon, H3, text
```

**Currently implemented:** the excerpt is `strip_html` and truncated to 280 characters. The section has no standalone CTA; the Product Card provides the actual product destination.

## Required Blocks

The only implemented block type is `highlight`, capped at six. Its fields are `highlight_icon`, `heading`, and `text`. A valid canonical highlight has a verified concise heading and supporting text; `highlight_icon` is optional and decorative. The section also requires the selected `product` setting for customer-facing output.

## Optional Blocks

No optional block type is implemented. An empty or incomplete `highlight` block is editable in Theme Editor but should be omitted by deterministic generation rather than rendered as an empty list item.

## Block Composition

`highlight` blocks are repeatable, reorderable, and capped at six; their source order is reading order. Use two to six meaningful highlights. Use one instance per page by default, after product or brand orientation and before deeper evidence or a closing CTA. Do not repeat the same benefit list in Product Highlights, Product Comparison, Materials, Craftsmanship, or a main product description.

## Component Dependencies

The audited runtime composes `Section Heading`, `Product Card`, `Responsive Image`, `Price`, `Icon System`, `Button`, and `section-spacing`. With `enable_quick_add`, it loads `product-form.js` and quantity-input styles; the shared Product Form controller remains the owner of Cart API, loading, error, and cart-drawer behavior.

There is no dedicated Product Highlights JavaScript controller. The static block list is progressive enhancement.

## Content Rules

Use only the selected Shopify product and verified merchant-authored benefit copy. A benefit must be accurate for that exact product, not merely the brand or a different variant. Name factual properties plainly, distinguish subjective editorial language from facts, and omit unverified durability, sustainability, medical, origin, certification, availability, or performance claims.

The current excerpt derives from the product description. AI must preserve it rather than rewrite or strengthen it. Icons must not be the only communication. There is no runtime field for a standalone CTA, comparison link, or custom product quote; do not invent one.

## Asset Requirements

The selected product’s Shopify media is rendered by Product Card with responsive lazy loading. `image_ratio` supports `square`, `portrait`, and `landscape`; `show_secondary_image` is optional. No block image field is implemented, and icons are limited to the audited system values `none`, `sparkle`, `verified`, `leaf`, `package`, and `shield-check`.

Do not substitute a campaign image for real product media or use an icon as evidence of an unsupported claim. Missing product media is a Product Card fallback state, not permission to fabricate imagery.

## Supported Variants

- **Media left / media right:** **Currently implemented** through `media_position`; choose for intentional desktop rhythm while preserving meaningful source order.
- **Contained / full-width:** **Currently implemented** through `layout`; choose from page composition, not decoration alone.
- **Square / portrait / landscape Product Card:** **Currently implemented** through `image_ratio`.
- **Text-led benefit list:** **Currently implemented** with `highlight_icon: none`; preferred when no icon adds meaning.
- **Icon-supported benefit list:** **Currently implemented** when a decorative audited icon supports a verified benefit.

There is no implemented image-supported block, standalone CTA, product-form replacement, comparison, carousel, or dynamic variant-driven highlight variant.

## Supported States

- **Fully configured:** a selected product and meaningful highlights render Product Card, excerpt, and list.
- **Product selected, no blocks:** the Product Card and excerpt remain valid; no benefit list appears.
- **Incomplete block:** current runtime may output an empty list item; canonical generation must omit it.
- **No product:** a localized message appears only in Theme Editor; storefront output is quiet.
- **Sold out or unavailable:** Product Card renders Shopify-derived state; highlights must not claim availability.
- **No JavaScript:** all section content and normal product link remain available; optional Quick Add is delegated to its existing progressive path.
- **Reduced motion:** this section introduces no independent motion.

## Theme Editor Settings

**Currently implemented stable section IDs:** `product`, `eyebrow`, `heading`, `description`, `heading_size`, `media_position`, `layout`, `image_ratio`, `show_vendor`, `show_secondary_image`, `enable_quick_add`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

**Currently implemented stable `highlight` IDs:** `highlight_icon`, `heading`, and `text`; the section is capped at six blocks. Blocks can be added, removed, duplicated, and reordered in Shopify. There is no section-specific controller; Product Form initialization and cleanup apply only when Quick Add is enabled. The audited schema has no app-block support.

## Responsive Behaviour

The current layout is one column below 48rem and a two-column media/content layout from 48rem. `media_position` changes visual placement on larger screens; the contract requires logical DOM order, no horizontal overflow from 320 px, readable benefit text at zoom, touch-safe Product Card controls, and stack-safe long translated text. Responsive product media uses audited mobile/desktop sizes.

RTL, 400% zoom, and very long product-title QA are **Target behavior**; no dedicated regression evidence was audited.

## Accessibility

The target is WCAG 2.2 AA. **Currently implemented:** section labelling when a heading exists, a list role/listitem relationship, H3 benefit headings, decorative icon rendering, normal Product Card links, and shared Button/Product Form focus behavior. The local heading is H2 or lower; it cannot claim the page H1.

Do not communicate a benefit only through an icon, render an empty list item, or use Quick Add to bypass product decisions. **Target behavior:** verify Product Card’s form feedback, line length at zoom, RTL reading order, and product-media alternatives manually.

## SEO and Structured Data

The section may add factual, indexable product context and a truthful internal product link. It does not own the page H1, page metadata, canonical URL, Product, Offer, Review, ItemList, Organization, or WebPage schema. Do not duplicate product structured data or keyword-stuff highlights.

## Performance Rules

Product media is lazy and responsive through Product Card; the static highlight list needs no controller. Use no more than six concise blocks, avoid redundant product sections, and do not load Quick Add unless it supports a real customer action. Section layout must reserve media space and avoid CLS. Any Product Form controller lifecycle remains scoped to the shared implementation.

## Motion Rules

No local motion, carousel, timer, or autoplay is implemented. Changes in Product Card state must be supplied by its shared behavior. Do not add animated benefit reveals, pulsing icons, or motion that obscures the product link; respect reduced motion through shared primitives.

## AI Guidelines

AI may select Product Highlights only when a Page Specification permits it, one approved product is relevant to the page, its Shopify data is available, and two or more verified benefits add information not already covered by Main Product or a nearby section. It must use the stable `highlight` block and documented settings, keep an exact product association, and omit incomplete blocks.

AI must not fabricate product features, material facts, origin, certifications, performance, prices, variants, inventory, CTA routes, or icon meanings. It must not create a second main product system, convert generic copy into factual claims, or select a different product on a Product Page without a verified merchandising rationale.

## Implementation Audit

**Source evidence inspected:** `product-highlights.md`, `premium-product.md`, `commerce-merchandising-pack.md`, and related product merchandising behavior briefs.

**Runtime evidence inspected:** `apps/theme/sections/product-highlights.liquid` schema/preset; Product Card, Product Form, image, price, icon, and button dependencies; `section-commerce-pack.css`; global theme asset loading; strategy/capability mappings; and relevant Page Specifications.

**Currently implemented:** selected-product Product Card, Shopify description excerpt, six `highlight` blocks, layout choices, icon choices, and optional shared Quick Add. **Partially implemented:** empty highlight blocks are not filtered before list-item output. **Not implemented:** a standalone CTA, block images, dynamic variant synchronization, or a Product Highlights controller. **Unknown:** complete RTL, zoom, and assistive-technology QA. No direct audited JSON-template assignment was found.

## Quality Checklist

- [x] Owns one selected-product narrative and bounded benefit list only.
- [x] Separates Main Product, gallery, form, comparison, recommendations, and product-data ownership.
- [x] Records the implemented `highlight` block, stable settings, source truth, empty behavior, and ordering.
- [x] Preserves static no-JavaScript usefulness, responsive layout, Product Card boundaries, and limited Quick Add.
- [x] Requires deterministic, product-specific, merchant-truthful generation.

## Future Compatibility

Preserve the `product-highlights` runtime ID, the `highlight` block and its IDs, selected product semantics, section setting IDs, Product Card interface, and optional shared Quick Add path. Future work may filter incomplete blocks, add an evidence-backed CTA or media contract, and validate mobile/RTL/zoom behavior without duplicating Main Product or changing existing merchant content.
