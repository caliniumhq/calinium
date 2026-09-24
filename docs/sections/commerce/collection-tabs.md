# Collection Tabs

## Purpose

Collection Tabs is a reusable, compact multi-collection discovery section. It lets customers switch between a small set of real collection product previews while preserving normal collection links and the primary browsing architecture elsewhere.

**Currently implemented:** `apps/theme/sections/collection-tabs.liquid` renders up to six selected collections, server-rendered product previews, an accessible enhanced tablist, and collection-level View all links.

## Customer Goals

Customers should be able to recognize the offered collections, switch panels with pointer or keyboard, see a bounded preview of real products, open a truthful collection route, and retain useful collection links with JavaScript unavailable.

## Merchant Goals

Merchants should be able to select and order two to six real collections, write a truthful tab label when needed, choose a modest product count/card treatment, and omit the section when one collection, a complete Collection Page, or a different discovery region serves customers better.

## Shopify Context

The section ID is `collection-tabs`; its schema permits a maximum of six `collection` blocks and its preset contains three empty blocks. It has no audited `enabled_on` restriction. Canonical contexts are Homepage, Collection Page after its primary grid, and landing-style Standard Page. It is prohibited on Product, Search, Collection List, Cart, Contact, Blog, Article, 404, account, checkout, and global shell surfaces.

Collection Tabs never replaces the current Collection Page’s `collection-banner` plus `main-collection-product-grid`, Shopify filters/sort/pagination, or Search results. It previews collection products; it does not own product catalog architecture.

## Responsibilities

Collection Tabs owns the local heading, collection tab labels, active panel state, a bounded server-rendered preview of each selected collection’s products, tab keyboard behavior, normal fallback collection links, panel View all continuation, and editor block-selection activation.

## Boundaries

Collection Tabs does not own collection filtering, search, Hero behavior, main collection/product grids, product-card behavior, recommendation source logic, variants, cart mutation, or Shopify product/collection truth. Product Card owns each preview tile; `CommerceTabsController` owns enhanced tabs. It must not infer product selection, preload a customer’s choice, or manufacture collections, products, prices, badges, inventory, ratings, or routes.

## Section Structure

```text
Collection Tabs
├── Optional Section Heading (H2 or lower)
├── No-JavaScript fallback collection-link list
├── Enhanced tablist
│   └── Collection block → one tab button
└── Collection panels
    ├── Bounded Product Card preview grid
    └── Optional View all collection link
```

**Currently implemented:** the first valid selected collection is the initial panel even when an earlier editor block is empty. All valid panels are rendered server-side; CSS displays the initial `data-tab-active` panel and, after enhancement, hides fallback links and exposes the tablist.

## Required Blocks

The only implemented block is `collection`, with a Shopify `collection` selector and optional `label`. A rendered tab requires a selected collection. The label defaults to the collection title; it must remain an accurate human-readable navigation label.

The schema does not require a block. Canonically, use at least two valid selected collections; one collection should use a Collection Carousel, Featured Collection, or a direct collection continuation instead.

## Optional Blocks

No optional block types are implemented. Product previews, View all controls, tab labels, card features, and local copy are settings or Shopify record data, not additional blocks.

## Block Composition

Collection blocks are repeatable, reorderable, and capped at six. Source order determines fallback-link order, tab order, panel order, and keyboard sequence. Each selected collection becomes one tab and one panel. The first valid collection is active on initial render.

Use one instance per page by default and place it after primary orientation/discovery. On a Collection Page it must follow the required product grid and must not present itself as the authoritative result set. Avoid adjacent tabs, carousels, categories, or product rails that expose the same set with no distinct navigational purpose.

## Component Dependencies

The audited runtime uses `Section Heading`, canonical `Product Card`, `Price`, `Button`, `Icon System`, `component-quantity-input` and `product-form.js` only when `enable_quick_add` is selected, shared section-spacing/tokens, and `CommerceTabsController` in `calinium-sections.js`.

`CommerceTabsController` is an implemented runtime helper, not a separate Component Specification. Product Card retains tile, price, badge, media, and safe Quick Add ownership; this section owns only panel composition.

## Content Rules

Use selected Shopify collections and their actual products. The `label` may clarify a real collection but must not create a false category, price promise, sale claim, inventory status, or recommendation. Product title, images, availability, prices, sale/sold-out badges, and optional vendor come from Product Card’s Shopify-backed contract.

`products_to_show` is a preview limit, not a statement about collection size. The View all action must keep its implemented real collection URL. Do not use tabs to hide products, mimic filters, pretend all products are present, or place a commerce promotion inside an unverified tab label.

## Asset Requirements

The section has no image block. Product Card consumes real Shopify product media with current lazy responsive rendering, chosen `image_ratio`, and safe product-card placeholders when the record has no media. Tab labels need no decorative asset.

AI must not provide custom product imagery or substitute a product record. Merchants should select an image ratio that preserves real product visibility. Secondary product image, vendor, badges, and Quick Add remain optional current Product Card settings, not extra proof or merchandising claims.

## Supported Variants

- **Two to six tabbed collection previews:** **Currently implemented**; select only when multiple collections need compact comparison.
- **One or two mobile columns / two to four desktop columns:** **Currently implemented** through `columns_mobile` and `columns_desktop`; choose density from preview count and readable product media.
- **Adaptive, square, portrait, or landscape product media:** **Currently implemented** through `image_ratio`; use an honest crop that does not hide material product information.
- **Vendor, badges, secondary image, and safe Quick Add:** **Currently implemented as optional Product Card treatments**; enable only when underlying Shopify data and Product Card conditions support them.
- **Fallback link navigation:** **Currently implemented**; it is the no-JavaScript baseline, not a visual variant.

There is no implemented filter, sort, persistence, responsive select-menu, recommendation, or asynchronous panel-loading variant.

## Supported States

- **Fully configured:** two or more real collection blocks create tabs, panels, previews, and View all links.
- **Partially configured:** label is optional; products can be fewer than the configured limit without error.
- **Empty collection:** current design mode displays a localized panel message; outside design mode a selected empty collection has no product grid but may still expose its View all route.
- **Unselected block:** design mode shows a select-collection panel; outside design mode it creates no tab/link but leaves a non-interactive editor panel path. Canonical generation must omit it.
- **No blocks:** an editor-only localized empty message renders; customer-facing output is absent.
- **No JavaScript:** all valid collection links remain in the fallback navigation and the first valid panel remains visible.
- **Enhanced:** tab buttons control one visible panel and inactive panels are hidden.

The active tab is not persisted across page navigation, refresh, or browser history; current implementation keeps it only in the live DOM.

## Theme Editor Settings

**Currently implemented section settings:** `eyebrow`, `heading`, `description`, `heading_size`, `text_alignment`, `products_to_show`, `columns_desktop`, `columns_mobile`, `image_ratio`, `show_vendor`, `show_badges`, `show_secondary_image`, `enable_quick_add`, `show_view_all`, `view_all_label`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

**Currently implemented block settings:** `collection` and `label`. Merchants may add, remove, duplicate, and reorder blocks up to six. `CommerceTabsController` initializes on section load, is destroyed on unload, and activates the matching panel on Shopify block select. No audited block-deselect, section-select, or browser-history persistence behavior exists.

## Responsive Behaviour

The current tablist is horizontally scrollable after JavaScript enhancement; without JavaScript, fallback links are horizontally scrollable. Product grids use configured one/two mobile columns and two/four desktop columns at the `48rem` CSS breakpoint. Images use current responsive sizes for 50vw mobile and 25vw desktop.

The section does not collapse into a select control. It must remain touch-scrollable, preserve logical source order, avoid clipped labels, and keep product cards usable from 320 px upward. RTL, long localized tab labels, and 400% zoom require manual QA; no dedicated audited regression proves them.

## Accessibility

The target is WCAG 2.2 AA. The enhanced implementation uses `role="tablist"`, `role="tab"`, `role="tabpanel"`, unique section/block-derived IDs, `aria-controls`, `aria-labelledby`, `aria-selected`, and roving `tabindex`. Left/Right/Home/End activate and focus tabs; pointer activation moves focus to the selected tab. Inactive panels receive `hidden`, which keeps their product links out of the focus order.

Fallback links preserve real navigation before enhancement. The section heading must remain H2 or lower; Product Cards stay semantically responsible for their links and product information. Ensure visible shared focus styles, touch-safe tab targets, non-color-only active treatment, correct RTL arrow-key expectations, and no automatic focus movement on initial load.

## SEO and Structured Data

Collection Tabs contributes truthful collection and product links plus subordinate H2/H3 hierarchy. It does not own page metadata, canonical URL, CollectionPage/Product/ItemList schema, collection membership, pricing data, or product structured data. Hidden enhanced panels must not be used to manipulate search visibility; no tab label or preview should be keyword-stuffed.

## Performance Rules

The initial response server-renders all selected panels and limits products per panel to two through eight. Product images are lazy and responsive, but all panel markup still has DOM and server cost; keep the number of tabs and preview size modest. The controller only adds listeners when at least two tabs and panels exist and removes them on unload.

Do not add panel fetches, duplicate product-card initialization, preloading, timers, or a framework. Quick Add conditionally loads existing product-form assets; enable it only where that known product-card path is warranted. The fallback link list and first panel must remain useful when the controller fails.

## Motion Rules

Current tab switching changes panel visibility without section-specific animation. There is no autoplay, timer, swipe controller, or animated active-state requirement. Any future transition must respect reduced motion, preserve immediate content access, and never move focus or hide a selected panel solely for decoration.

## AI Guidelines

AI may select Collection Tabs only when the Page Specification permits it, two to six approved collections have distinct discovery roles, their real preview products are useful, and panel density remains performance-safe. It must use existing `collection` blocks and Shopify references, preserve source order, and configure only supported Product Card options.

AI must not fabricate collections/products/labels, use tabs as filters or Search, duplicate a Collection Page grid, claim product recommendations, add persistence behavior, or enable Quick Add where existing Product Card safety requirements are unmet. Omit the section when one collection or a conventional grid is clearer.

## Implementation Audit

**Source briefs inspected:** `collection-tabs.md`, `premium-collection.md`, and `commerce-merchandising-pack.md`.

**Runtime inspected:** `collection-tabs.liquid` schema/preset, `product-card.liquid`, product-card/price/quantity assets, `section-commerce-pack.css`, `calinium-sections.js` (`CommerceTabsController` and lifecycle), global `theme.liquid` asset loading, templates, strategy mapping, capability catalog, classification, and relevant Homepage/Collection/Collection List/Search page contracts.

**Currently implemented:** server-rendered fallback links, first-valid-panel selection, ARIA tab roles, keyboard navigation, panel hiding, block-select activation, lifecycle teardown, product limit, responsive grids, and optional safe Quick Add path. **Partially implemented:** all panels are rendered before enhancement; current active state has no persistence. **Unknown:** full screen-reader, RTL, zoom, and network-cost manual QA. No direct assignment was found in audited JSON templates.

## Quality Checklist

- [x] Owns bounded multi-collection preview tabs only.
- [x] Keeps Collection Page grid/filter/search and Product Card ownership separate.
- [x] Defines exact block, settings, no-JavaScript, lifecycle, page, and ordering rules.
- [x] Documents ARIA/keyboard behavior, responsive density, performance cost, and truth boundaries.
- [x] Requires deterministic selection from approved Shopify collections.

## Future Compatibility

Preserve `collection-tabs`, its `collection` block, all current setting IDs, preset, generated mappings, Product Card interface, and section/block-derived ARIA IDs. Any future schema/controller migration must retain normal collection-link fallback, first-valid initialization, no duplicate listeners, and safe existing Quick Add integration.

Future work may add validated persistence, mobile presentation alternatives, and broader RTL/accessibility coverage only after explicit page-architecture and performance review. It must not evolve into filtering, search, recommendation logic, or an alternative Collection Page.
