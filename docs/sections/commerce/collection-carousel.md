# Collection Carousel

## Purpose

Collection Carousel is a reusable curated rail for a small, verified set of Shopify collections. It gives customers a calm horizontal path into categories without becoming a Collection Page, a general product grid, or recommendation behavior.

**Currently implemented:** `apps/theme/sections/collection-carousel.liquid` renders up to twelve collection-card blocks, native horizontal scrolling, optional enhanced controls, and an optional truthful route to `routes.collections_url`.

## Customer Goals

Customers should be able to scan a purposeful set of real collections, recognize their images and titles, understand optional concise context, and open a collection through a normal link. The rail must remain useful at 320 px, with touch, keyboard, reduced motion, zoom, RTL, and no JavaScript.

## Merchant Goals

Merchants should be able to select two or more real collections, order them intentionally, supply an approved image/title/description override only when accurate, choose card density and image treatment, and omit the rail when it repeats the primary discovery route.

Merchants do not configure product membership, a product grid, filtering, ranking, recommendations, search, or raw carousel code here.

## Shopify Context

The section ID is `collection-carousel`; the schema permits a maximum of twelve `collection` blocks and its preset contains three empty collection blocks. It has no audited `enabled_on` restriction, so technical Theme Editor availability is not canonical page permission.

Canonical contexts are Homepage, Collection Page after the primary collection orientation/grid, and an intentional landing-style Standard Page. It is prohibited as an ordinary region on Product, Search, Collection List, Cart, Contact, Blog, Article, 404, account, checkout, and global shell surfaces. It must never replace the Collection Page’s authoritative grid, filters, sort controls, or pagination.

## Responsibilities

Collection Carousel owns a local heading group, a curated order of collection-card links, card media/title/optional description/count/link-label presentation, native horizontal rail behavior, optional next/previous and pagination controls, responsive rail/grid choice, and a local empty authoring state.

## Boundaries

Collection Carousel does not own the Collection Page, Collection Banner, collection grid, product cards, product recommendations, Shopify collection membership, filtering, sort state, pagination, search, Hero behavior, or a global carousel system. `collection-card` owns individual card rendering; `ScrollCarousel` owns optional scrolling enhancement.

It must not manufacture collections, category names, product counts, images, descriptions, routes, inventory, popularity, or a “View all” destination other than the implemented collection-list route.

## Section Structure

```text
Collection Carousel
├── Optional Section Heading (H2 or lower)
├── Native horizontal collection rail
│   └── Collection block → Collection Card → one collection link
├── Optional enhanced previous/next controls
├── Optional enhanced pagination dots
└── Optional View all collections link
```

**Currently implemented:** the rail is a `ul` with list items; card headings are passed as H3. Controls appear in markup only when more than one block exists and become visible only after JavaScript enhancement. With mobile swipe disabled, the current CSS changes the mobile rail to a two-column grid.

## Required Blocks

The only implemented block is `collection`, with `collection`, `image`, `title`, `description`, and `link_label` settings. A customer-facing block requires a real selected collection. The collection object supplies the destination, fallback title, featured image, and product count; block overrides may refine presentation but must not misrepresent that collection.

There is no minimum block count in the schema. Canonically, use at least two valid collection blocks for a carousel; use another appropriate discovery section when only one collection is meaningful.

## Optional Blocks

No optional block type is currently implemented. Image, title, description, and link-label overrides are fields on the `collection` block, not standalone media, CTA, product, recommendation, or promotional blocks.

## Block Composition

Collection blocks are repeatable, reorderable, and capped at twelve. Their source order is customer reading and native scroll order. Each valid block renders one Collection Card and one real collection link; image/title overrides take precedence inside the existing card primitive, while the collection URL remains authoritative.

Use one instance per page by default. It belongs after the primary lead and before later editorial or closing content. On a Collection Page it must follow—not duplicate—the primary result grid. Do not place adjacent Collection Carousel, Collection Tabs, Featured Categories, Collection List, or another rail that presents the same discovery path without a distinct customer purpose.

## Component Dependencies

The audited runtime composes `Section Heading`, `Collection Card`, `Responsive Image`, `Button`, `Icon System`, `section-spacing`, and the shared `ScrollCarousel` in `apps/theme/assets/calinium-sections.js`. Collection Card in turn receives real collection data and uses Responsive Image.

`ScrollCarousel` is an implemented runtime helper but not a standalone completed Component Specification. This document records its use without redefining its controller contract.

## Content Rules

Choose real collections that improve discovery and use a title, image, description, and link label only when they are truthful for that collection. The optional product count is Shopify-derived, not a merchant claim. Keep heading and description concise; the rail is navigation, not a replacement for collection education or a campaign hero.

The View all label may be merchant-authored, but its current destination is always the real `routes.collections_url`. Do not make a collection override look like a product promotion, use an inaccurate image, invent category taxonomy, or use custom description copy to make unsupported availability, sustainability, price, or urgency claims.

## Asset Requirements

A block may use its collection featured image or an approved custom image. Media is currently lazy loaded with responsive widths, portrait/square/landscape ratio selection, and a card-level alternative text fallback based on image alt then collection title. The override must be rights-cleared and genuinely represent the destination.

The current card may render without media when none exists. This is a valid text-led state, not permission to substitute stock or generated imagery. Confirm crop, contrast for overlay text, and title readability before using `text_position: overlay`.

## Supported Variants

- **Native mobile rail:** **Currently implemented** when `enable_swipe_mobile` is true; use when a compact, touch-scrollable collection set improves discovery.
- **Mobile two-column grid:** **Currently implemented** when `enable_swipe_mobile` is false; use when visible comparison is more useful than horizontal continuation.
- **Below-image card text:** **Currently implemented** through `text_position: below`; use as the default for calm, reliable readability.
- **Overlay card text:** **Currently implemented** through `text_position: overlay`; use only with tested image contrast and concise text.
- **Two to five desktop visible cards:** **Currently implemented** through `columns_desktop`; choose density from the number of valid collections and image/detail readability.
- **View-all continuation:** **Currently implemented** through `show_view_all`; use only when the collection-list destination is a useful broader path.

There is no implemented autoplay, product-preview, filtering, recommendation, or Hero variant.

## Supported States

- **Fully configured:** valid collection blocks render real collection cards and links.
- **Partially configured:** optional image/title/description/link-label overrides may be absent; collection data supplies safe fallbacks.
- **No collection selected:** a design-mode placeholder is rendered; outside design mode the list item is empty. Canonical generation must omit such a block.
- **No blocks:** an editor-only localized empty message renders; customer-facing output has no rail.
- **One valid collection:** native link/card remains valid; carousel controls are not a useful canonical choice.
- **No JavaScript:** native horizontal scroll or mobile grid remains usable; controls and dots remain hidden.
- **Reduced motion:** controller scrolls with `auto` behavior instead of smooth scrolling.

## Theme Editor Settings

**Currently implemented section settings:** `eyebrow`, `heading`, `description`, `heading_size`, `text_alignment`, `columns_desktop`, `image_ratio`, `text_position`, `show_product_count`, `enable_swipe_mobile`, `enable_arrows`, `enable_pagination`, `show_view_all`, `view_all_label`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

**Currently implemented block settings:** `collection`, `image`, `title`, `description`, and `link_label`. Merchants may add, remove, duplicate, and reorder blocks through Shopify up to twelve. `calinium-sections.js` initializes on section load, destroys on unload, and scrolls the matching card into view on block selection.

**Implementation gap:** controls are conditioned on total blocks rather than the count of valid selected collections. A Theme Editor review should avoid unconfigured blocks before relying on controls or pagination.

## Responsive Behaviour

The current rail uses native horizontal scroll with a 78vw mobile card width, desktop track columns from `columns_desktop`, scroll snapping, and a two-column mobile grid when swipe is disabled. Responsive images use audited `sizes` values for mobile and desktop. It must preserve logical source order, readable H3 titles, touch-safe controls, and no horizontal page overflow from 320 px through wide screens.

RTL scroll behavior and long translated link labels are target QA requirements; no dedicated audited RTL regression exists. The use of logical CSS properties supports, but does not prove, complete RTL behavior.

## Accessibility

The target is WCAG 2.2 AA. The current runtime provides semantic list markup, one normal link per valid card, H3 card headings below the local section H2, labelled previous/next/dot controls, `aria-current` on the current dot, keyboard Left/Right handling while focus is within the section, and reduced-motion scrolling.

Controls must remain keyboard reachable with visible shared Button focus styles and touch-safe dimensions. Native scroll preserves touch browsing without JavaScript. Do not use color or motion alone to identify a card, and do not use an overlay treatment without tested text contrast. **Target behavior:** manually validate RTL keyboard direction, screen-reader current-position context, and 400% zoom against real collection names.

## SEO and Structured Data

The section contributes truthful internal collection links and optional indexable collection titles/descriptions. It does not own a page H1, metadata, canonical URL, CollectionPage schema, ItemList schema, Product schema, or Breadcrumb schema. Collection Card headings are subordinate H3s; do not use card text or hidden rail items for keyword stuffing.

## Performance Rules

Collection images are lazy and responsive; cards reserve selected ratio through the shared image primitive. The controller is progressive enhancement: native scrolling works first, and its event listeners, animation frame, interval, and optional observer are removed on section unload.

Do not select an excessive rail, preload every card, create duplicate rails, or enable a controller only for decoration. The current section supplies no auto-rotate data, so `ScrollCarousel` auto-rotation is not activated here. Validate source image quality and no-JavaScript scroll usefulness rather than adding a heavy carousel library.

## Motion Rules

Current motion is user-led native scrolling; enhanced previous/next uses smooth scroll only when reduced motion is not requested. The section configures no autoplay and no timer. Dots reflect scroll position rather than animate content. Do not add continuous movement, forced focus movement, or decorative rail transitions.

## AI Guidelines

AI may select Collection Carousel only when the Page Specification permits it, at least two approved collections and their real destinations exist, collection imagery or a valid text-led card state exists, and the rail improves discovery without repeating a primary grid or another discovery region.

AI must use the current `collection` block, approved collection references, documented settings, and a bounded number of cards. It must omit invalid blocks, fabricated titles/images/descriptions, duplicate rails, recommendations disguised as curation, and unsupported carousel behavior. It must not replace Collection Page architecture, Search, Collection List, filtering, or pagination.

## Implementation Audit

**Source briefs inspected:** `collection-carousel.md`, `premium-collection.md`, and `commerce-merchandising-pack.md`.

**Runtime inspected:** `collection-carousel.liquid` schema/preset, `collection-card.liquid`, `component-collection-card.css`, `section-commerce-pack.css`, `calinium-sections.js` (`ScrollCarousel` and lifecycle), global `theme.liquid` asset loading, templates, strategy mapping, capability catalog, Homepage/Collection/Collection List/Search page specifications, and Collection Merchandising classification.

**Currently implemented:** full schema, collection-card rendering, native scroll, optional progressive controls, mobile grid fallback, reduced-motion scroll behavior, block-select handling, and lifecycle teardown. **Partially implemented:** category rail accessibility lacks an explicit position announcement beyond current dot state. **Unknown:** full RTL, high-zoom, and assistive-technology manual QA. No direct assignment was found in audited JSON templates; the section is a reusable Theme Editor region, not a current required template region.

## Quality Checklist

- [x] Owns curated collection rail discovery only.
- [x] Uses real collection blocks and Collection Card rather than product-card or recommendation logic.
- [x] Separates Collection Page grid/filter/search ownership.
- [x] Defines valid pages, ordering, instance limits, empty states, no-JavaScript behavior, and stable current settings.
- [x] Records responsive media, keyboard, reduced-motion, lifecycle, SEO boundaries, and performance constraints.
- [x] Requires deterministic, merchant-truthful AI selection.

## Future Compatibility

Preserve the `collection-carousel` runtime ID, `collection` block, current setting IDs, preset, collection-card interface, template compatibility, and existing Shopify block IDs. Any future controller or schema change must retain native-scroll fallback, clean lifecycle behavior, stable collection destinations, and no duplicate card system.

Future work may validate valid-block control counts, RTL semantics, position announcements, and generator mappings, but must not turn this discovery rail into main collection architecture, product recommendations, or an unbounded carousel platform.
