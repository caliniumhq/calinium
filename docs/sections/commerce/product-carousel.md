# Product Carousel

## Purpose

Product Carousel is a reusable, curated horizontal rail of real Shopify products from one selected collection. It supports calm product discovery without becoming Main Product architecture, a Collection Page grid, Shopify recommendations, or a cross-sell engine.

**Currently implemented:** `product-carousel` renders products from `collection.products`, with native scrolling and optional enhanced controls.

## Customer Goals

Customers should be able to scan a purposeful group of available products, understand each product through a consistent Product Card, open a normal product link, and use a suitable purchase path when the shared Product Card safely offers one. The rail must remain useful with touch, keyboard, zoom, reduced motion, RTL, and no JavaScript.

## Merchant Goals

Merchants should choose one real collection, set a truthful local heading, choose density and card presentation, and decide whether the collection destination is useful. This section does not let a merchant create product membership, ranking, recommendations, variant data, or a bespoke product form.

## Shopify Context

The runtime section ID is `product-carousel`; its schema has section settings only and no blocks. Product membership and order are Shopify collection data. Canonical contexts are Homepage after orientation or category discovery, Product Page after `main-product` when it supports further browsing, Collection Page after its required grid, and an intentional landing-style Standard Page.

It is prohibited as the primary region on Search, Cart, Contact, Blog, Article, 404, account, checkout, and global shell surfaces. It must not replace the primary collection grid, filtering, sort control, pagination, Search results, or `main-product`.

## Responsibilities

Product Carousel owns its local heading, one selected source collection, a bounded product rail, Product Card presentation options, optional truthful link to that collection, optional controls, responsive rail/grid treatment, and a local authoring empty state.

## Boundaries

It does not own the Product Page, purchase-form architecture, product gallery, product information, variants, Shopify recommendations, complementary products, recently viewed products, curated cross-sell, bundle transactions, collection membership, filters, sort, pagination, or search. Product Card owns individual product rendering; the shared `ScrollCarousel` enhancement owns optional rail controls.

Do not use a collection merely to simulate a manually curated recommendation list. Use the documented recommendation, complementary, cross-sell, or bundle behavior only when its distinct data source and customer purpose are actually required.

## Section Structure

```text
Product Carousel
├── Optional Section Heading (H2 or lower)
├── Selected Collection
│   └── Paginated product rail → Product Card → product link or safe Quick Add
├── Optional enhanced previous/next controls
├── Optional enhanced pagination dots
└── Optional View all link → selected collection URL
```

**Currently implemented:** the section paginates the selected collection by `products_to_show`, renders each product through `product-card`, and emits controls only when the collection has more than one product. Native scrolling is present before JavaScript.

## Required Blocks

No block type is implemented. The required customer-facing data dependency is the selected `collection` setting and at least one real product in that collection. Canonically, use two or more suitable products for a carousel; select a different region when one product is the entire message.

## Optional Blocks

No optional blocks are implemented. Product Card details, such as vendor, badges, secondary image, and Quick Add, are section-controlled presentation settings, not editable product or CTA blocks.

## Block Composition

Not applicable: this section has no Shopify blocks. Product order follows the selected collection’s Shopify order and is not locally reorderable. Use one instance per page by default. It belongs after the primary lead and before supporting proof or closing content; do not place adjacent product rails unless the second has a materially different discovery task.

## Component Dependencies

The audited runtime uses `Section Heading`, `Product Card`, `Responsive Image`, `Price`, `Button`, `Icon System`, `section-spacing`, and `ScrollCarousel` in `calinium-sections.js`. When `enable_quick_add` is true it also loads the existing `product-form.js` and quantity-input styles; that shared controller owns Cart API interaction and cart-drawer refresh behavior.

`ScrollCarousel` and the Product Form controller are implemented helpers, not new component contracts in this specification.

## Content Rules

Use only a real selected collection and the product objects Shopify returns. Headings, eyebrow, description, and View all label must describe the rail accurately. Product names, images, prices, availability, variants, badges, and destinations remain Product Card and Shopify data; do not replace them with invented copy.

Quick Add is optional and must keep the shared safe behavior: it is not permission to invent a variant selection or duplicate a full product form. Do not claim that the rail is personalized, recommended, exclusive, discounted, or low-stock unless the relevant verified data and a documented behavior supply that fact.

## Asset Requirements

Product media comes from real Shopify product media through Product Card. The current rail requests responsive lazy images and allows `adapt`, `square`, `portrait`, or `landscape` ratios. Do not assign a separate campaign image to a product card, substitute stock imagery, or hide a missing product image with fabricated media.

The rail needs no independent assets. Product Card’s image alternatives and price content remain authoritative; contrast and crop must be manually checked for the chosen ratio.

## Supported Variants

- **Native mobile rail:** **Currently implemented** when `enable_swipe_mobile` is true; use for a compact horizontal browse path.
- **Mobile two-column grid:** **Currently implemented** when `enable_swipe_mobile` is false; use when immediate comparison is more useful than horizontal continuation.
- **Two to five desktop columns:** **Currently implemented** through `columns_desktop`; choose from the number of products and readable card density.
- **Product-card treatments:** **Currently implemented** through `image_ratio`, `show_vendor`, `show_badges`, `show_secondary_image`, and `enable_quick_add`.
- **Collection continuation:** **Currently implemented** through `show_view_all` and `view_all_label`; use only when the selected collection URL is a useful next action.

There is no implemented manual-product, recommendation, autoplay, or product-detail variant.

## Supported States

- **Fully configured:** a selected collection with products renders truthful Product Cards.
- **Partially configured:** optional heading, description, vendor, badges, secondary image, Quick Add, or View all link may be absent.
- **Empty collection or no collection:** a localized empty message is rendered only in Theme Editor; the storefront is quiet. AI must omit the section rather than expose an empty rail.
- **One product:** the Product Card remains valid but a carousel is not the canonical choice.
- **Unavailable or sold-out product:** Product Card presents Shopify-derived state; this section must not override it.
- **No JavaScript:** native scroll or mobile grid and normal product links remain useful; enhanced controls remain hidden.
- **Reduced motion:** the shared controller uses non-smooth scrolling.

## Theme Editor Settings

**Currently implemented stable section IDs:** `collection`, `eyebrow`, `heading`, `description`, `heading_size`, `text_alignment`, `products_to_show`, `columns_desktop`, `enable_swipe_mobile`, `enable_arrows`, `enable_pagination`, `image_ratio`, `show_vendor`, `show_badges`, `show_secondary_image`, `enable_quick_add`, `show_view_all`, `view_all_label`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

`products_to_show` is bounded from 2 to 12; `columns_desktop` is bounded from 2 to 5. The audited schema has no blocks and no app-block support. On section load the shared controller initializes only this section; on unload it removes listeners, timers, frames, and observers. There is no block-selection behavior because no blocks exist.

**Implementation gap:** controls are conditioned by collection size and pagination rather than an explicitly audited count of valid rendered cards. Theme Editor review should confirm the real collection before relying on controls or dots.

## Responsive Behaviour

The audited CSS uses a 78vw mobile rail, a desktop grid determined by `columns_desktop`, scroll snap, and a two-column mobile fallback when swipe is disabled. Product Card receives mobile and desktop `sizes` values. The contract requires logical source order, no page-level horizontal overflow from 320 px upward, readable cards at 200% and 400% zoom, touch-safe controls, long translated text resilience, and RTL QA.

Full RTL behavior is **Unknown** without dedicated regression evidence; logical CSS support is not a substitute for QA.

## Accessibility

The target is WCAG 2.2 AA. **Currently implemented:** normal Product Card links, labelled arrow and pagination controls, keyboard Left/Right handling within the enhanced rail, `aria-current` on current pagination, and reduced-motion scrolling. Product Card and shared Button own individual labels and focus styling.

Controls must remain reachable, visibly focused, and at least touch-safe. Do not rely on movement, color, badge, or hover media alone. **Target behavior:** verify screen-reader position context, RTL key behavior, 400% zoom, and Quick Add error/live feedback against the shared Product Form implementation.

## SEO and Structured Data

The rail contributes truthful internal product links and subordinate card headings. It does not own a page H1, title metadata, meta description, canonical URL, Product schema, ItemList schema, Offer schema, Breadcrumb schema, or recommendation markup. Do not use hidden cards or card text for keyword stuffing.

## Performance Rules

Product Card media is lazy and responsive; ratio treatment should reserve layout. The rail works through native scrolling before the small shared controller adds controls. Do not preload every product, add an auto-rotator, select a large rail merely for visual density, or place duplicate rails on the same page. Lifecycle cleanup on section unload prevents duplicate listeners after Theme Editor reload.

Lower-page rails must not compete with the actual page LCP. Validate image weights, card count, no-JavaScript usefulness, and Quick Add loading cost before expanding the region.

## Motion Rules

Movement is customer-led. The audited section provides no autoplay or timer. Enhanced next/previous scrolling is smooth only when reduced motion is not requested. Do not add forced focus movement, continuous scrolling, animated product claims, or decorative card transitions.

## AI Guidelines

AI may select Product Carousel only when the Page Specification permits it, an approved real collection is available, enough suitable products exist, and the rail improves discovery without duplicating the primary grid or another merchandising rail. It must configure only the documented stable settings, preserve Shopify collection order, and use Quick Add only when the shared Product Card path is appropriate.

AI must not fabricate products, titles, prices, availability, badges, images, variants, destinations, personalized recommendations, or discounts. It must not replace Main Product, collection architecture, Search, cart architecture, recommendations, complementary behavior, cross-sell, recently viewed, or bundles.

## Implementation Audit

**Source evidence inspected:** `docs/sections/product-carousel.md`, `premium-product.md`, `commerce-merchandising-pack.md`, and the related recommendation, complementary, cross-sell, recently-viewed, bundle, and lookbook briefs.

**Runtime evidence inspected:** `apps/theme/sections/product-carousel.liquid` schema and preset; `product-card` and Product Form dependencies; `section-commerce-pack.css`; `calinium-sections.js` (`ScrollCarousel` and lifecycle); `theme.liquid` global asset loading; strategy/capability mappings; compatibility recipes; and relevant Homepage, Product, Collection, Standard Page, and Cart specifications.

**Currently implemented:** collection-source rail, responsive Product Cards, safe optional Quick Add dependency, native fallback, controls, reduced-motion scroll, and lifecycle cleanup. **Partially implemented:** control eligibility does not explicitly model valid rendered-card count. **Unknown:** full RTL, high-zoom, and assistive-technology QA. No direct assignment was found in audited JSON templates; it is reusable rather than a required template region.

## Quality Checklist

- [x] Owns only a curated source-collection product rail.
- [x] Separates Main Product, grids, Search, recommendations, cross-sell, bundles, and cart ownership.
- [x] Records no-block schema, stable settings, source truth, states, ordering, and page constraints.
- [x] Preserves native browsing, responsive media, reduced motion, lifecycle cleanup, and Product Form boundaries.
- [x] Requires deterministic, truthful AI selection and bounded product density.

## Future Compatibility

Preserve the `product-carousel` runtime ID, all listed setting IDs, selected collection semantics, Product Card interface, View all collection destination, preset, and native-scroll fallback. Future changes must retain cart-safe Quick Add boundaries, lifecycle cleanup, stable template compatibility, and no duplicate product-card system.

Future hardening may validate rendered-card control counts, RTL and zoom behavior, generator mapping, and meaningful manual curation. It must not silently turn the rail into recommendations, a manually ranked feed, or Main Product architecture.
