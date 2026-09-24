# Editorial Grid

## Purpose

Editorial Grid is Calinium’s reusable content-discovery region for a paced set of approved article, page, collection, or custom-link destinations. It turns a small, ordered group of real editorial resources into calm linked cards without becoming a Blog page, a collection grid, a product rail, or a generic image gallery.

**Current implementation:** `apps/theme/sections/editorial-grid.liquid` renders the `editorial-grid` Shopify section with up to eight `story` blocks. It is a server-rendered grid with no section-specific JavaScript.

## Customer Goals

Customers should be able to understand each card’s destination, open one useful approved resource, and browse in a logical source order without needing hover, a carousel, or JavaScript. Images, titles, excerpts, and labels should clarify a real destination rather than simulate editorial content.

## Merchant Goals

Merchants should be able to curate a concise mixed set of real articles, Pages, collections, or verified custom routes; choose the card order and local density; and retain a restrained presentation without configuring a second Blog, product grid, recommendation engine, or content-management system.

## Shopify Context

The runtime section ID is `editorial-grid`; its implementation is `apps/theme/sections/editorial-grid.liquid`. It has one `story` block type and `max_blocks: 8`, with a localized preset `t:sections.editorial_grid.preset`.

The current `index.json`, `page.json`, `blog.json`, `article.json`, and `collection.json` templates contain no direct `editorial-grid` assignment. The section is schema-available for merchant composition; that technical availability is not automatic page approval. Strategy mappings and the capability, safe-default, and content-classification catalogs contain the runtime ID and source fields.

Valid canonical contexts are Homepage after primary discovery, an intentional Standard Page, a Blog as a supporting cross-link region after the main listing, or an Article after the body. It is not an ordinary Collection Page replacement, and is prohibited as a Product lead, Cart, Search, Contact, 404, account, checkout, or global-shell region.

## Responsibilities

Editorial Grid owns local heading hierarchy, mixed editorial-card composition, card source resolution, ordered discovery, local image presentation, and one optional normal link per card. It owns neither the resources’ metadata nor the pages, articles, collections, or routes to which it links.

## Boundaries

It does not own Product Card commerce behavior, product merchandising, Shop the Look markers, image-only composition, Lookbook campaign sequencing, Blog or Article page architecture, search results, collection filtering, pagination, recommendation logic, or generated editorial content.

Image Mosaic owns visual media composition; Lookbook owns image-led campaign frames; Shop the Look owns selected-product associations. Editorial Grid owns source-flexible content discovery only.

## Section Structure

```text
Editorial Grid
├── Optional Section Heading (H2 by the shared primitive)
└── role=list grid
    └── story block → article role=listitem
        └── optional single destination link → optional image, eyebrow, H3, excerpt
```

**Current implementation:** the wrapper receives `aria-labelledby` only when `heading` is nonblank. `section-heading` renders its heading at its default H2 level; a card title renders as H3. A card is wrapped in one anchor only when a resolved URL exists. Without a URL, the card is static.

With no blocks, the customer storefront renders no grid. In Theme Editor design mode it renders the localized `sections.editorial_grid.empty` message. Canonical generation must omit the section when it has no valid cards rather than expose a blank customer-facing region.

## Required Blocks

The only implemented block type is `story`. The section permits at most eight blocks; the block schema has no separate per-type limit.

A valid canonical `story` block requires one verified, meaningful destination: `article`, `collection`, `page`, or `link`. It should also resolve to a useful visible name. An image, eyebrow, and excerpt are optional, but an incomplete block without a destination or meaningful card label must be omitted by generation even though current Liquid can render a static partial card.

## Optional Blocks

No optional block type is implemented. `image`, `eyebrow`, `heading`, `excerpt`, `article`, `page`, `collection`, and `link` are settings of `story`; they are not separate image, CTA, product, collection, or text blocks.

## Block Composition

`story` blocks are repeatable and reorderable; their source order is the visual and reading order. Use two to eight complete cards for an intentional grid. One card is technically renderable but should normally be expressed as a more focused link or content region unless there is a clear discovery reason.

Use one Editorial Grid instance per page by default. A second instance needs a distinct audience or resource set and must not repeat the same destination. Place it after the page’s orientation and primary commerce or reading task; on an Article it follows the authored body. Do not place it directly beside Lookbook, Image Mosaic, or another mixed-destination grid without a distinct purpose.

## Component Dependencies

**Currently implemented:** `Section Heading`, `Responsive Image`, `section-spacing`, `component-image.css`, native anchor semantics, and the shared editorial-pack CSS. `description` is passed to the Section Heading primitive as rich text.

It does not render Product Card, Button, a carousel, a media controller, or a dedicated card controller. Link and list behavior are native HTML; no undocumented helper should be treated as a dependency.

## Content Rules

The supported source model and runtime precedence are exact:

1. The block initially uses manually supplied `link`, `heading`, `eyebrow`, `excerpt`, and `image`.
2. When `article` is selected, it takes source precedence: its URL replaces `link`; blank title, eyebrow, excerpt, and image fields fall back respectively to the article title, blog title, truncated `excerpt_or_content`, and article image.
3. Otherwise, when `collection` is selected, its URL replaces `link`; a blank title falls back to the collection title and a blank image to its featured image.
4. Otherwise, when `page` is selected, its URL replaces `link`; a blank title falls back to the page title and a blank excerpt to truncated page content.
5. With no selected Shopify resource, only the verified custom `link` may create a destination.

The Liquid branch order is article, then collection, then page; multiple selected resource settings must therefore never be used as a merchant-facing way to choose precedence. A manual image, title, eyebrow, or excerpt may provide an approved override only where the runtime does not replace it. AI must not fabricate article summaries, page descriptions, collection descriptions, labels, images, or custom-route context.

## Asset Requirements

`story.image` is the only block-level image setting. The current schema has no mobile-image override. The implementation uses Responsive Image with lazy loading, `portrait`, `square`, or `landscape` media ratio, and widths `240, 360, 535, 750, 1000`.

Images must be approved and have meaningful asset alternative text when informative. A decorative image may be used only when the visible card title already communicates the destination. Do not link an image-only card unless it has an accessible name from the image or another card label. Repeated assets are allowed only when they represent intentionally distinct resources; they must not create decorative duplication.

## Supported Variants

- **Two-, three-, or four-column discovery grid:** **Currently implemented** through `desktop_columns` (`2`, `3`, `4`); mobile begins as two columns.
- **Featured-first grid:** **Currently implemented** through `featured_first_card`; from 48rem the first item spans two columns.
- **Bordered or quiet cards:** **Currently implemented** through `show_borders`.
- **Source-led or manually linked cards:** **Currently implemented** through the source-resolution model above.

Choose columns from card count, text length, and available media. Use featured-first only when the first card is genuinely primary. These are functional composition choices, not a reason to create a second editorial grid.

## Supported States

**Currently implemented:** populated cards; a static card with no resolved URL; cards with or without image or text; Theme Editor empty messaging; responsive two-column and desktop variants; and no-JavaScript operation.

**Implementation gap:** Liquid does not suppress empty or duplicate blocks, verify a custom URL, detect repeated destinations, or provide a customer-facing empty state. It has no special loading, unavailable-source, filter, pagination, RTL, or large-text controller state. Generator and merchant review must prevent invalid content.

## Theme Editor Settings

All current stable section setting IDs are listed below. No `visible_if` dependency is present in the schema.

| ID | Type and verified default | Meaning |
| --- | --- | --- |
| `eyebrow` | `text`; blank | Optional heading-group label. |
| `heading` | `inline_richtext`; `Editorial grid` | Optional Section Heading title. |
| `description` | `richtext`; blank | Optional Section Heading description. |
| `heading_size` | `select`; `standard` | `small`, `standard`, or `large`. |
| `text_alignment` | `select`; `left` | `left` or `center` heading alignment. |
| `desktop_columns` | `select`; `3` | `2`, `3`, or `4` desktop grid columns. |
| `media_ratio` | `select`; `portrait` | `square`, `portrait`, or `landscape` image reservation. |
| `featured_first_card` | `checkbox`; `true` | Makes the first desktop card span two columns. |
| `show_borders` | `checkbox`; `false` | Adds the bounded card border treatment. |
| `color_scheme` | `color_scheme`; `scheme-1` | Approved local color scheme. |
| `padding_top`, `padding_bottom` | `range`; `80`; 0–160px in steps of 4 | Desktop section spacing. |
| `mobile_padding_top`, `mobile_padding_bottom` | `range`; `48`; 0–120px in steps of 4 | Mobile section spacing. |

`story` block settings are `image` (`image_picker`), `eyebrow` (`text`), `heading` (`text`, default `Editorial story`), `excerpt` (`textarea`), `article` (`article`), `page` (`page`), `collection` (`collection`), and `link` (`url`). The resource branch order described in Content Rules is the effective dependency. The preset is `t:sections.editorial_grid.preset`.

The Theme Editor may add, delete, duplicate, and reorder blocks. `block.shopify_attributes` supports editor selection. Because no section-specific controller exists, no timers, observers, or listeners require cleanup on section load, unload, select, or deselect; Shopify re-renders static markup. Empty block placeholders are design-mode only.

## Responsive Behaviour

The current CSS starts with a two-column grid, uses logical sizing, and switches to configured three or four columns at 48rem. Feature-first spans only at that desktop breakpoint. Images reserve the selected ratio through Responsive Image; cards use `min-inline-size: 0` to avoid intrinsic overflow.

At 320px, browser zoom, long translated titles, and RTL, source order remains the reading order and cards must remain usable without clipped labels or horizontal scrolling. The audited CSS uses logical sizing but does not include a section-specific RTL or long-content test. Those scenarios remain manual QA obligations; reduce density or choose a different section when titles or excerpts become unreadable.

## Accessibility

The rendered grid uses `role="list"`, `article` items with `role="listitem"`, one normal anchor where a destination exists, H2 section heading, and H3 card titles. Visible titles and excerpts should make every link’s purpose clear; focus styling is governed by shared theme rules.

Do not use color, the featured position, or an image alone to communicate destination meaning. Provide informative image alternative text through the approved asset, preserve a logical heading sequence, maintain touch-friendly linked-card targets, and verify keyboard navigation, 200%/400% zoom, RTL, and contrast in the selected color scheme. There is no live region, keyboard-only controller, or motion dependency. A linked card with no accessible name is invalid authoring.

## SEO and Structured Data

Editorial Grid can contribute truthful visible internal links but owns no page title, meta description, canonical URL, primary page H1, Product, Article, Collection, Organization, Review, or AggregateRating schema. It must not duplicate the linked resource’s metadata, synthesize excerpts for keyword coverage, or use image alternative text as keyword stuffing.

The relevant Page Specification owns page-level SEO. The linked article, page, or collection owns its own structured data where a centralized runtime rule supports it.

## Performance Rules

Current cards use lazy Responsive Image loading and a bounded maximum of eight blocks. The grid is server-rendered and has no per-section JavaScript, network request, carousel, or hidden-card loading policy. Intrinsic image ratios reduce layout shift; the selected ratio must match the approved visual intent.

Do not use this section as above-the-fold LCP media, preload all card images, or repeat the same high-cost media in adjacent grids. Validate long grids, large source images, and duplicate instances manually. The global editorial-pack stylesheet is already loaded by the theme layout.

## Motion Rules

No Editorial Grid animation, autoplay, drag, swipe, or scripted transition is implemented. It must remain useful without motion. Hover and focus styling remain shared-theme behavior and must not hide the destination or become the only affordance.

## AI Guidelines

AI may select Editorial Grid only when the page contract permits a content-discovery region and each displayed card has an approved source or verified custom destination. It must select the smallest useful set, preserve source order, use exact real resources, respect article/collection/page precedence, and omit empty, duplicate, unlabelled, or inaccessible blocks.

AI must not create articles, Pages, collections, custom routes, titles, excerpts, images, labels, product relationships, recommendations, or calls to action. It must not use Editorial Grid to replace a Blog index, collection architecture, search results, or a product rail.

## Implementation Audit

- **Source brief inspected:** `docs/sections/editorial-grid.md`.
- **Current implementation:** `apps/theme/sections/editorial-grid.liquid`; one `story` block type, maximum eight blocks, direct source-resolution logic, design-mode empty message, preset, and stable IDs listed above.
- **Dependencies inspected:** `responsive-image.liquid`, `section-heading.liquid`, `section-spacing.liquid`, `component-image.css`, and `section-editorial-pack.css`.
- **JavaScript and lifecycle:** no matching controller or section listener is present in `calinium-sections.js`; static server rendering is the current behavior.
- **Page/template evidence:** no direct assignment in the canonical Homepage, Standard Page, Blog, Article, or Collection JSON templates; strategy mapping and capability/safe-default/content catalogs reference the section.
- **Test evidence:** `scripts/validate-editorial-hero-pack.js` verifies the section schema, translation keys, unique IDs, preset, asset, and snippet references. No focused behavioral test covers source precedence, duplicate destinations, or assistive-technology names.
- **Implementation gaps:** no validation for source exclusivity, duplicate routes, card completeness, or customer-facing empty state; no explicit section-specific RTL, zoom, or long-content test.

## Quality Checklist

- One `editorial-grid` owner at `content/editorial-grid.md`.
- One H2 section heading and H3 cards; no page H1 ownership.
- All 14 section IDs and all eight `story` IDs are recorded.
- No more than eight blocks; order, source precedence, and empty-block omission are understood.
- Every displayed card has a real purpose, verified destination, accessible name, and approved asset where media appears.
- No Product Card, filtering, recommendation, generated editorial content, or hidden duplicate destination is introduced.
- Mobile, zoom, RTL, keyboard, contrast, no-JavaScript, lazy-loading, and layout-stability review are completed before merchant use.

## Future Compatibility

Future work may add source-exclusivity checks, duplicate-destination warnings, stronger custom-link validation, explicit mobile-image support, card provenance, and automated accessibility tests. Any extension must preserve `editorial-grid`, `story`, current setting IDs, existing JSON instances, and source precedence until a documented migration exists. It must remain a content-discovery section rather than absorbing Lookbook, Image Mosaic, Blog, or commerce responsibilities.
