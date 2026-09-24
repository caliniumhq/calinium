# Image Mosaic

## Purpose

Image Mosaic is Calinium’s reusable media-composition region for a small, ordered set of approved images. It creates structured visual rhythm through bounded layouts, image ratios, mobile alternatives, and focal positioning without becoming a product association tool, a free-form canvas, an editorial destination grid, or a Hero.

**Current implementation:** `apps/theme/sections/image-mosaic.liquid` renders the `image-mosaic` Shopify section with up to six `image` blocks. It is server-rendered and has no section-specific JavaScript.

## Customer Goals

Customers should be able to view approved media in a stable, readable composition, understand an optional caption or destination, and use a linked tile normally on touch, keyboard, and small screens. The mosaic must remain visual support, never a puzzle that hides essential information inside imagery.

## Merchant Goals

Merchants should be able to arrange a bounded set of approved desktop and mobile images, choose a purposeful layout and crop ratio, retain focal subjects, and optionally expose concise captions or verified links. They do not receive a free-form grid editor, product tagging, image interpretation, or a substitute for a campaign Lookbook.

## Shopify Context

The runtime section ID is `image-mosaic`; its implementation is `apps/theme/sections/image-mosaic.liquid`. It contains one `image` block type, `max_blocks: 6`, and the localized preset `t:sections.image_mosaic.preset`.

The current canonical Homepage, Standard Page, Blog, Article, and Collection templates have no direct `image-mosaic` assignment. Capability, safe-default, and content-classification catalogs record its settings and block fields; it has no current strategy-section-mapping entry. Schema availability is not a composition recommendation.

Canonical contexts are Homepage after orientation, an intentional Standard Page, or an Article where the media is relevant and factual. It is not an ordinary Product, Collection, Blog-index, Cart, Search, Contact, 404, account, checkout, or global-shell region. It must not displace primary product discovery or a page’s authored body.

## Responsibilities

Image Mosaic owns local heading hierarchy, ordered image-tile composition, responsive sources, crop and focal-position treatment, optional captions, optional normal links, and its bounded layout selection. It does not own the factual context of an image beyond approved merchant-provided content.

## Boundaries

It does not own product association, Shop the Look markers, Product Cards, mixed editorial destination cards, Lookbook campaign sequencing, Brand Timeline, Behind the Scenes’ consent and observational-evidence model, Hero lead behavior, media generation, or inferred image meaning.

Use Image Mosaic for composition-first media. Use Lookbook for image-led editorial frames; use Behind the Scenes for verified production observations; use Shop the Look only for explicitly selected product associations.

## Section Structure

```text
Image Mosaic
├── Optional Section Heading (H2 by the shared primitive)
└── role=list mosaic grid
    └── image block → article role=listitem
        └── optional single link → responsive image / design-mode placeholder / optional caption
```

**Current implementation:** each tile receives a focal-position class. A customer storefront renders no image placeholder for a blank image; Theme Editor design mode renders Shopify’s `lifestyle-1` placeholder for that block. When the section has no blocks, design mode renders `sections.image_mosaic.empty`; the storefront has no customer-facing empty message.

## Required Blocks

The only implemented block type is `image`, with no per-type block limit and a section maximum of six blocks. A valid canonical block requires approved `image`. `mobile_image`, `link`, `caption`, and `focal_position` are optional.

The current schema permits blank blocks and the current renderer can show a caption or empty wrapper without customer media. Canonical generation must omit incomplete image blocks and omit the section when no valid images remain.

## Optional Blocks

No optional block type is implemented. Desktop image, mobile image, link, caption, and focal position are fields of the `image` block, not independent caption, button, product, video, or feature-tile blocks.

## Block Composition

`image` blocks are repeatable, reorderable, and capped at six by the section. Their source order defines reading order and which image becomes the first feature tile in the applicable desktop layout. Use two to six complete assets for an intentional mosaic; a one-image configuration is technically possible but normally belongs in another media region.

Use one instance per page by default. Do not place it immediately next to Lookbook, Behind the Scenes, or another image-heavy grid unless each has a different customer task. Place it after orientation or explanatory content and before a restrained continuation; do not make it the sole page lead or the only explanation for a material, claim, or product.

## Component Dependencies

**Currently implemented:** `Section Heading`, `Responsive Image`, `section-spacing`, `component-image.css`, native links, and shared editorial-pack CSS. No Button, Product Card, carousel, video facade, gallery controller, observer, or request lifecycle is rendered.

## Content Rules

Use only merchant-approved media, captions, and destinations. A caption may identify a verified subject or relationship, but must not infer people, products, locations, events, materials, production methods, dates, or claims from an image. `link` is a normal verified URL; it has no separate CTA label setting.

The runtime renders a link around the entire tile when `link` is nonblank. It supplies `aria-label` from `caption` only when a caption is present; otherwise the linked image must itself have an accessible asset alternative. Do not repeat one destination or asset merely to fill a pattern, and do not use a visual position as a factual assertion.

## Asset Requirements

`image` is the approved desktop source; `mobile_image` can replace it below 48rem through the shared Responsive Image `<picture>` behavior. `focal_position` supports `top-left`, `top-center`, `top-right`, `center-left`, `center`, `center-right`, `bottom-left`, `bottom-center`, and `bottom-right`; CSS maps it to `object-position`. `media_ratio` applies one shared `square`, `portrait`, or `landscape` reservation to all images.

The renderer lazy-loads widths `240, 360, 535, 750, 1000, 1500`. The asset must have correct rights and alternative text where informative. An image can be decorative only when the nearby visible caption or heading supplies the needed meaning. There is no per-tile size, span, video, or crop-editor setting; layout is curated rather than free-form.

## Supported Variants

- **Balanced:** **Currently implemented**; three desktop columns from 48rem.
- **Feature-left:** **Currently implemented**; first tile spans two columns and rows from 48rem.
- **Feature-right:** **Currently implemented**; first tile spans the right-side feature position from 48rem.
- **Triptych:** **Currently implemented**; three desktop columns from 48rem.
- **Square, portrait, or landscape media:** **Currently implemented** through `media_ratio`.
- **Captioned or quiet mosaic:** **Currently implemented** through `show_captions`.

Selection must depend on image count, focal-subject safety, crop resilience, and page role. No small/medium/large tile, per-block span, manual mobile ordering, slideshow, rail, or free-form drag-and-drop variant is implemented.

## Supported States

**Currently implemented:** populated image tiles; optional mobile sources, links, and captions; design-mode blank-image placeholder; design-mode empty-section message; responsive layout variants; and no-JavaScript rendering.

**Implementation gap:** the runtime does not hide blank blocks, detect duplicate assets or links, verify a link, expose a customer-facing empty state, or provide a special loading, RTL, zoom, or long-caption controller state. Focal positioning is CSS-only and has no visual safe-area validation.

## Theme Editor Settings

All current stable section IDs are listed below. The schema has no `visible_if` setting dependencies.

| ID | Type and verified default | Meaning |
| --- | --- | --- |
| `eyebrow` | `text`; blank | Optional heading-group label. |
| `heading` | `inline_richtext`; `Image mosaic` | Optional Section Heading title. |
| `description` | `richtext`; blank | Optional Section Heading description. |
| `heading_size` | `select`; `standard` | `small`, `standard`, or `large`. |
| `text_alignment` | `select`; `left` | `left` or `center` heading alignment. |
| `layout` | `select`; `balanced` | `balanced`, `feature-left`, `feature-right`, or `triptych`. |
| `media_ratio` | `select`; `portrait` | Shared `square`, `portrait`, or `landscape` image ratio. |
| `show_captions` | `checkbox`; `true` | Shows nonblank block captions. |
| `color_scheme` | `color_scheme`; `scheme-1` | Approved local color scheme. |
| `padding_top`, `padding_bottom` | `range`; `80`; 0–160px in steps of 4 | Desktop spacing. |
| `mobile_padding_top`, `mobile_padding_bottom` | `range`; `48`; 0–120px in steps of 4 | Mobile spacing. |

`image` block settings are `image` (`image_picker`), `mobile_image` (`image_picker`), `link` (`url`), `caption` (`text`), and `focal_position` (`select`, default `center`, with the nine positions listed in Asset Requirements). The preset is `t:sections.image_mosaic.preset`.

The Theme Editor may add, delete, duplicate, and reorder tiles. `block.shopify_attributes` supports block selection. No scoped JavaScript is initialized, so no listeners, timers, observers, or media playback require lifecycle cleanup on section load, unload, select, or deselect. Design-mode placeholders are the only editor-specific behavior.

## Responsive Behaviour

The current CSS begins at two columns, uses `min-inline-size: 0`, and applies the selected curated layout at 48rem. `mobile_image` becomes the `<picture>` source under 48rem; the selected ratio reserves geometry and CSS applies the focal class to the actual media. There is no implemented mobile reorder control or horizontal rail.

At 320px, zoom, long translated captions, and RTL, the DOM block order remains reading order. The implementation uses logical sizing but has no audited section-specific RTL, large-text, or crop-safe-area test. Verify each layout with real assets; choose a less dense section if focal subjects, captions, or links cannot remain clear.

## Accessibility

The mosaic uses a `role="list"` with article `role="listitem"` tiles, an optional H2 shared heading, and normal anchors only for configured links. Captions are visible text but are not associated through a `figure`/`figcaption` relationship in the current implementation. Responsive Image supplies the selected asset’s alternative text.

Authors must provide meaningful alternative text for informative images, avoid turning a blank-name tile into a link, preserve contrast for captions, and maintain keyboard and touch access to linked tiles. Test focus visibility, 200%/400% zoom, RTL, long captions, and the selected color scheme. No live announcements, keyboard controller, autoplay, or motion-dependent interaction exists.

## SEO and Structured Data

Image Mosaic can contribute approved visible content and normal links but owns no page title, meta description, canonical URL, page H1, Product, Article, Organization, Review, or image-specific structured data. Captions and alternatives must describe real media, not supply keyword stuffing. Page-level SEO remains with the relevant Page Specification.

## Performance Rules

The implementation uses lazy Responsive Image loading, bounded six-block composition, ratio reservation, and no section-specific JavaScript. The first visible image should not be promoted to LCP priority merely because it appears first in this optional region. Do not preload every tile, use oversized source media, or repeat expensive images in adjacent media sections.

The section has no video or hidden-slide behavior. Confirm crop quality, image payload, duplicate-instance cost, and layout stability with real merchant assets before use.

## Motion Rules

No mosaic animation, autoplay, slideshow, swipe, drag, or controller is implemented. Reduced-motion preferences do not need a local override because no local motion is introduced. Shared hover/focus treatment must never conceal a link or image context.

## AI Guidelines

AI may select Image Mosaic only when the page permits a composition-first media region and two or more approved, rights-cleared images can form a stable meaningful sequence. It may choose only supported layouts, ratios, focal positions, captions, and verified destinations. It must omit blank, duplicate, inaccessible, or weakly related assets.

AI must not infer captions, people, locations, products, materials, events, seasons, claims, or product associations from imagery. It must not generate media, create a free-form grid, make a Hero, or substitute this section for Lookbook, Shop the Look, Behind the Scenes, or an evidence-led section.

## Implementation Audit

- **Source brief inspected:** `docs/sections/image-mosaic.md`.
- **Current implementation:** `apps/theme/sections/image-mosaic.liquid`; one `image` block type, maximum six blocks, preset, and exact schema IDs above.
- **Dependencies inspected:** `responsive-image.liquid`, `section-heading.liquid`, `section-spacing.liquid`, `component-image.css`, and `section-editorial-pack.css`.
- **JavaScript and lifecycle:** no Image Mosaic controller or matching lifecycle listener is present; rendering is static and Shopify re-renders editor markup.
- **Page/template evidence:** no direct canonical JSON-template assignment. Capability, safe-default, and content-classification catalogs contain runtime evidence; the strategy-section mapping has no entry.
- **Test evidence:** `scripts/validate-editorial-hero-pack.js` validates schema, translations, IDs, preset, asset, and snippet references. No focused runtime test validates focal crops, link names, repeated assets, or mobile crop outcomes.
- **Implementation gaps:** no customer empty state, duplicate/link validation, blank-block suppression, per-tile size controls, video support, or explicit RTL/zoom test.

## Quality Checklist

- One `image-mosaic` owner at `media/image-mosaic.md`.
- All 13 section IDs and all five `image` IDs are recorded; no more than six blocks are used.
- Each displayed tile has an approved desktop image, sensible crop/focal position, and an appropriate mobile source when needed.
- Captions, alternative text, and links are factual and accessible; blank image blocks are omitted.
- No product association, product marker, generated interpretation, campaign sequence, or free-form layout claim is introduced.
- Mobile, 320px, zoom, RTL, keyboard, touch, contrast, lazy loading, and layout-stability review is completed with real assets.

## Future Compatibility

Future work may add stronger asset/link validation, caption provenance, mobile crop guidance, duplicate detection, bounded per-tile composition options, and automated RTL/zoom/focus tests. Any extension must preserve `image-mosaic`, `image`, existing stable IDs, present layout values, and existing merchant instances. It must remain a media-composition owner and not absorb Lookbook, Shop the Look, Hero, or Behind the Scenes responsibilities.
