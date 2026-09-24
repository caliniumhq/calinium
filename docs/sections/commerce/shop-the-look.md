# Shop the Look

## Purpose

Shop the Look is a product-led editorial region that connects one approved lifestyle image to up to six real Shopify products. Optional visual markers progressively reveal the associated Product Card while a normal product list remains the usable customer fallback.

**Currently implemented:** `shop-the-look` renders responsive lifestyle media, repeatable `product` blocks, numbered marker buttons, Product Cards, and the scoped `ShopTheLookController` enhancement.

## Customer Goals

Customers should be able to understand a look or setting, identify real linked products, open normal product links, and use an available shared Quick Add path without needing markers, hover, or JavaScript. The image must never be the sole way to discover a product.

## Merchant Goals

Merchants should select one approved, rights-cleared lifestyle image, an optional mobile image, up to six real products, and honest image-relative marker positions. They can choose restrained local copy and Product Card presentation, but do not create a lookbook CMS, product recommendations, variant configuration, inventory system, or bespoke cart flow.

## Shopify Context

The runtime section ID is `shop-the-look`, with section media/content settings and a maximum of six `product` blocks. Canonical contexts are Homepage, an intentional collection or campaign landing context, and a purposeful Standard Page. Product Page use is limited to a directly relevant editorial context and must not replace `main-product`.

It is prohibited as an ordinary Cart, Search, Contact, Blog index, Article, 404, account, checkout, or global-shell region. It must not replace collection architecture, a product grid, product recommendations, product discovery navigation, or the Main Product purchase path.

## Responsibilities

Shop the Look owns one editorial media scene, optional mobile media, a local heading group, selected product associations, numeric marker placement, active-product reveal behavior, a full product-list fallback, and responsive editorial/product-card layout.

## Boundaries

It does not own lifestyle storytelling beyond the current scene, a general Lookbook, product recommendations, collection filtering, variants, Main Product, product gallery, hotspot authoring outside the six blocks, product inventory, cart drawer, checkout, or image-recognition logic. Product Card retains product details, links, prices, availability, and optional shared Quick Add.

Markers identify merchant-configured associations; they do not prove that a product is visible, available, worn, or included in a photograph. Do not use a marker to make a product claim that the merchant cannot verify.

## Section Structure

```text
Shop the Look
├── Optional Section Heading (H2 or lower)
└── Editorial layout
    ├── Lifestyle image / optional mobile image
    │   └── Product marker button for each valid product block
    └── Product block list → Product Card → real product route / optional safe Quick Add
```

**Currently implemented:** markers use `x_position` and `y_position` percentages. Without JavaScript, the product panel list remains visible and normal product links work; enhanced state shows the active product panel selected by a marker.

## Required Blocks

The only implemented block type is `product`, capped at six. Its settings are `product`, `x_position`, and `y_position`. A valid customer-facing block requires a real selected Shopify product; positions are bounded from 0 to 100 and are interpreted against the selected lifestyle image.

Canonically, use one to six distinct selected products and a scene that meaningfully relates to them. The runtime permits empty blocks and duplicate products; deterministic generation must omit the former and avoid the latter.

## Optional Blocks

No optional block type is implemented. The section’s image, mobile image, heading, and descriptive copy are section settings, not media, CTA, text, or promotional blocks. There is no implemented caption, gallery slide, variant, or custom marker-label block.

## Block Composition

`product` blocks are repeatable, reorderable, and capped at six. Their source order determines the marker number, Product Card order, controller association, and no-JavaScript fallback reading order. Use one instance per page by default; place it after primary orientation and before later proof or closing content. Do not place it beside a generic Lookbook, another identical marker scene, or a product rail that repeats the same products without a distinct task.

## Component Dependencies

The audited runtime uses `Section Heading`, `Responsive Image`, `Product Card`, `Price`, `Button`, `Icon System`, `section-spacing`, and `ShopTheLookController` in `calinium-sections.js`. With `enable_quick_add`, it loads the shared `product-form.js` and quantity-input styles; the shared Product Form controller owns cart updates and feedback.

`ShopTheLookController` is a scoped enhancement rather than a completed standalone Component Specification. It must not be reimplemented by product blocks.

## Content Rules

Use approved merchant media and only real selected Shopify products. Heading, eyebrow, and description must truthfully contextualize the image; each marker must correspond to a deliberate merchant association. Do not invent product names, item availability, a product’s position in the scene, a complete outfit, a discount, social proof, or styling advice that the merchant has not supplied.

Marker positions are editorial navigation, not evidence. Product Card content remains Shopify data. There is no standalone CTA setting, no product-specific marker copy, and no variant-selection control in this section.

## Asset Requirements

`image` is the desktop/lifestyle image; `mobile_image` may override it. If desktop image is blank, runtime uses `mobile_image` as the primary image and avoids duplicating it as a mobile source. `image_ratio` supports `square`, `portrait`, and `landscape`; the responsive image is currently lazy with audited mobile/desktop widths.

Use media that can safely carry markers after crop at each breakpoint. Confirm asset rights, image alternative text, contrast, and that marker coordinates remain meaningful on mobile. There are no block-specific images. Do not substitute stock, generated, or unrelated product imagery when lifestyle media is missing.

## Supported Variants

- **Desktop image with mobile override:** **Currently implemented** through `image` and `mobile_image`; use the mobile asset only when it preserves product associations.
- **Image ratios:** **Currently implemented** through `image_ratio`.
- **Marker-enhanced product reveal:** **Currently implemented** when the controller initializes with markers and product panels.
- **Static product-list fallback:** **Currently implemented** without JavaScript and remains the required baseline.
- **Vendor display / optional safe Quick Add:** **Currently implemented** through Product Card settings.

There is no implemented video scene, carousel, free-form hotspot, marker-label, product-recommendation, or automatic image-recognition variant.

## Supported States

- **Fully configured:** approved scene media and valid distinct product blocks render image, markers, and Product Cards.
- **Partially configured:** missing mobile image falls back to desktop; optional heading/description/vendor/Quick Add may be absent.
- **No lifestyle image:** Theme Editor shows a placeholder; storefront can still render Product Cards, but canonical generation must omit the section until approved scene media exists.
- **No product selected:** Theme Editor identifies the block; storefront omits product content. AI must omit the block.
- **No blocks:** image and heading may render but do not meet the canonical section purpose; omit the section.
- **No JavaScript:** all Product Cards remain visible; markers remain hidden and no product is inaccessible.
- **Reduced motion:** controller performs no autoplay or decorative motion.

## Theme Editor Settings

**Currently implemented stable section IDs:** `image`, `mobile_image`, `eyebrow`, `heading`, `description`, `heading_size`, `text_alignment`, `image_ratio`, `show_vendor`, `enable_quick_add`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

**Currently implemented stable `product` block IDs:** `product`, `x_position`, and `y_position`. Blocks can be added, removed, duplicated, and reordered up to six. `ShopTheLookController` initializes on `shopify:section:load`, destroys marker listeners on `shopify:section:unload`, and activates the relevant panel on `shopify:block:select`. There is no audited block-deselect path, app-block support, duplicate-product check, or mobile coordinate override.

## Responsive Behaviour

The current layout stacks media and products below 48rem and becomes a wide-media/narrow-product layout at larger widths. Marker positions use the same percentage coordinates for desktop and mobile assets. The contract requires no horizontal page overflow from 320 px, a readable product-list fallback, markers that remain touch-safe and unobscured, long-text resilience, zoom resilience, safe area around edges, and manual RTL validation.

Because responsive cropping can move a depicted product, a mobile image must be checked with the same coordinates before use. Separate mobile marker coordinates are **Not implemented**.

## Accessibility

The target is WCAG 2.2 AA. **Currently implemented:** numbered marker buttons have product-specific accessible labels and `aria-pressed`; Product Cards remain normal links without JavaScript; controller-activated panels hide inactive content; explicit marker activation can move focus into the active panel; shared controls provide focus styling. The local heading is H2 or lower.

**Implementation gaps:** marker buttons do not expose an audited `aria-controls` relationship to product panels, and active changes have no audited concise status announcement. The fallback product list is mandatory. Do not rely on marker location, number, color, imagery, or motion as the sole product identification. Validate keyboard sequence, focus restoration expectations, 320 px/400% zoom, RTL, and screen-reader behavior manually.

## SEO and Structured Data

The section may contribute truthful editorial text and real product links. It does not own page H1, metadata, canonical URL, Product, Offer, ImageObject, ItemList, CollectionPage, Organization, or WebPage schema. An image and markers alone must not generate product schema or keyword-stuffed alternative text.

## Performance Rules

The current lifestyle and product images are responsive and lazy; image ratio reserves layout. The enhancement is scoped, listener-based, and destroyed on section unload. Do not preload lower-page lifestyle media, add an external hotspot library, add autoplay, load hidden product images unnecessarily, or duplicate scenes. Keep at most six blocks and validate mobile crop/marker accuracy before use.

The customer-visible product list must remain useful before JavaScript and after controller failure. Lower-page media must not compete with the true LCP.

## Motion Rules

No autoplay, timer, carousel, or decorative motion is implemented. Marker activation changes the visible product panel and may focus it after explicit customer action. Do not animate markers continuously, move focus automatically, use pulsing hotspots, or require motion to understand the scene. Respect reduced motion through static behavior.

## AI Guidelines

AI may select Shop the Look only when a permitted page has an approved lifestyle image, real approved product references, meaningful verified associations, and a useful static product-list fallback. It must use the stable `product` block, select no more than six distinct products, provide bounded coordinates, preserve block order, and verify the mobile crop before assigning `mobile_image`.

AI must not fabricate looks, product placement, marker labels, variants, prices, availability, discounts, product relationships, image assets, or routes. It must not select the section without scene media, use it as recommendations, replace Main Product or collection navigation, or assume a marker is accessible without the product list.

## Implementation Audit

**Source evidence inspected:** `shop-the-look.md`, `premium-product.md`, `commerce-merchandising-pack.md`, `lookbook.md`, and related recommendation/cross-sell/bundle briefs.

**Runtime evidence inspected:** `apps/theme/sections/shop-the-look.liquid` schema/preset; Responsive Image, Product Card, Product Form, price, button, and icon dependencies; `section-commerce-pack.css`; `calinium-sections.js` (`ShopTheLookController`, lifecycle, and block select); global asset loading; strategy/capability mappings; and relevant Page Specifications.

**Currently implemented:** image/mobile-image treatment, six product blocks, percentage markers, accessible-label/pressed state, Product Card list fallback, scoped initialization/teardown, section/block select handling, and optional shared Quick Add. **Partially implemented:** marker/panel programmatic association and mobile crop assurance. **Not implemented:** duplicate-product validation, custom marker labels, mobile coordinates, video, carousel, and block-deselect handling. **Unknown:** complete RTL, zoom, and assistive-technology QA. No direct audited JSON-template assignment was found.

## Quality Checklist

- [x] Owns one editorial image-to-product association region only.
- [x] Separates Main Product, Lookbook, recommendations, collection discovery, and cart ownership.
- [x] Documents the real `product` block, coordinates, stable settings, bounded instances, and required fallback.
- [x] Preserves responsive media, native Product Card links, scoped lifecycle, and reduced-motion-safe interaction.
- [x] Requires deterministic, approved-media, verified-association AI selection.

## Future Compatibility

Preserve the `shop-the-look` runtime ID, `product` block, `product`/`x_position`/`y_position` IDs, current section setting IDs, Product Card interface, no-JavaScript list fallback, marker order, and controller teardown. Future hardening may add explicit marker/panel relationships, validation for distinct products and usable media, mobile coordinate support, and editor lifecycle coverage without changing existing merchant associations silently.

It must not become an unbounded hotspot platform, a recommendation engine, a stock-image feature, a product-gallery replacement, or a separate cart system.
