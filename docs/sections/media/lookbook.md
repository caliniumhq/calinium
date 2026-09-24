# Lookbook

## Purpose

Lookbook is Calinium’s reusable image-led editorial presentation for a short ordered set of approved campaign or visual-story frames. It may link a frame to a real destination, but it does not identify products in an image, expose product markers, or become a product-card, cart, or recommendation experience.

**Current implementation:** `apps/theme/sections/lookbook.liquid` renders the `lookbook` Shopify section with up to six `item` blocks. It is a static server-rendered grid with no section-specific controller.

## Customer Goals

Customers should be able to browse an understandable visual sequence, read approved optional titles and text, and open a real destination through one ordinary link. They must not need drag, hover, autoplay, markers, or JavaScript to understand a frame or continue.

## Merchant Goals

Merchants should be able to assemble a concise approved visual story, choose a bounded editorial layout, use optional mobile media and frame numbering, and connect each frame to an approved custom route, product, or collection. They do not create product associations, variants, availability claims, hotspot behavior, bundles, or Quick Add.

## Shopify Context

The runtime section ID is `lookbook`; its implementation is `apps/theme/sections/lookbook.liquid`. It has one `item` block type, `max_blocks: 6`, and the localized preset `t:sections.lookbook.preset`.

No current canonical Homepage, Standard Page, Blog, Article, or Collection JSON template directly assigns Lookbook. It appears in the `editorial_discovery` homepage layout recipe and strategy mapping, and is represented in the capability, safe-default, and content-classification catalogs.

Canonical contexts are Homepage after primary orientation, a purposeful Standard Page, a collection landing-style page where it does not replace the collection system, or an editorial Article after its authored content. It is not an ordinary Blog-index, Product, Cart, Search, Contact, 404, account, checkout, or global-shell region. Product Page use is prohibited unless a future page contract and runtime implementation specifically authorize a supporting editorial context.

## Responsibilities

Lookbook owns ordered image-led editorial frames, local heading hierarchy, per-frame responsive media, caption text, optional numbering, normal destination resolution, and the bounded editorial/feature-first composition. It owns a visual narrative path, not the data or commerce system behind a selected destination.

## Boundaries

Lookbook remains distinct from:

```text
Shop the Look = commerce-led image with explicit selected products, markers, Product Cards, and a product-list fallback
Lookbook = image-led editorial frames with at most a normal selected destination link
```

It does not own product markers, inferred product associations, Product Cards, Quick Add, cart behavior, bundles, recommendations, product availability, variants, merchandising claims, Image Mosaic’s composition-first role, or Editorial Grid’s mixed-resource discovery role.

## Section Structure

```text
Lookbook
├── Optional Section Heading (H2 by the shared primitive)
└── role=list editorial grid
    └── item block → article role=listitem
        └── optional single link → responsive image / design-mode placeholder
            └── optional number, H3 title, and text
```

**Current implementation:** the first item receives the feature treatment for the selected desktop layout. An item without a resolved URL remains static. In Theme Editor design mode, a blank `image` renders the `lifestyle-1` placeholder; an entirely empty section renders the localized `sections.lookbook.empty` message. The customer storefront has no empty-section message.

## Required Blocks

The only implemented block type is `item`, with no separate per-type limit and a section maximum of six blocks. A valid canonical item requires approved `image` and should have an approved `title` or another accessible media name. `mobile_image`, `media_ratio`, `text`, `product`, `collection`, and `link` are optional.

The runtime permits incomplete blocks; canonical generation must omit an item without approved image or meaningful accessible context. A link is optional, but when present it must resolve to a real destination.

## Optional Blocks

No optional block type is implemented. All per-frame media, text, and destination settings belong to `item`; there are no product-marker, CTA, slide, video, gallery, or product-card blocks.

## Block Composition

`item` blocks are repeatable, reorderable, and capped at six. Source order controls reading order, numbering, and which item becomes the feature-first tile. Use two to six coherent, complete frames. Use one Lookbook per page by default; a second instance must represent a genuinely separate editorial chapter and not repeat the same imagery or destinations.

Place it after orientation and before a distinct commerce or continuation region. Do not place it directly beside Image Mosaic, Behind the Scenes, or an identical image grid without a different customer purpose. The `editorial_discovery` layout recipe places Lookbook after a hero and before Story Banner and primary collection discovery; that recipe is composition evidence, not universal ordering authority.

## Component Dependencies

**Currently implemented:** `Section Heading`, `Responsive Image`, `section-spacing`, `component-image.css`, native anchors, and shared editorial-pack CSS. It does not render Product Card, Price, Button, Icon System, ShopTheLookController, carousel controller, video facade, request, observer, or cart integration.

## Content Rules

Use only approved campaign or editorial media, titles, text, and destinations. The exact destination precedence is: a nonblank `link` first; otherwise the selected `product.url`; otherwise the selected `collection.url`; otherwise no link. A selected product or collection only supplies its URL. Current Liquid does not render product name, media, price, markers, inventory, variants, or a product association claim.

`title` and `text` are merchant-authored frame content; `show_numbers` only exposes the source-order number. There is no CTA-label setting, image attribution field, campaign-name field, or source-link field. AI must not infer product visibility, product relationships, campaign name, season, location, model, styling details, caption, or editorial meaning from an image.

## Asset Requirements

`item.image` is the desktop source; `item.mobile_image` supplies the mobile `<picture>` source below 48rem. `item.media_ratio` supports `portrait` (default) or `landscape`; each frame controls its own ratio. The renderer lazy-loads widths `240, 360, 535, 750, 1000, 1500`.

Every image must be approved, rights-cleared, and have meaningful alternative text when informative. A linked frame without a title relies on the image alternative for its accessible name; do not create that state when the image alternative is absent or insufficient. The schema contains no video, autoplay, poster, hotspot, or media-attribution setting.

## Supported Variants

- **Editorial layout:** **Currently implemented** through `layout: editorial`; from 48rem it uses three columns and the first item spans two columns and rows.
- **Feature-first layout:** **Currently implemented** through `layout: feature-first`; from 48rem it uses four columns and the first item spans two columns.
- **Numbered or quiet frames:** **Currently implemented** through `show_numbers`.
- **Portrait or landscape frames:** **Currently implemented** per `item.media_ratio`.

No static rail, slideshow, autoplay, drag, swipe, pagination, arrows, full-width-frame setting, or video presentation is implemented. Do not claim those behaviors from the word “lookbook.”

## Supported States

**Currently implemented:** populated frames; optional mobile sources, text, title, number, and normal link; static nonlinked frames; Theme Editor image placeholder and empty message; responsive layout variants; and no-JavaScript operation.

**Implementation gap:** the section does not validate asset completeness, duplicate frames, destination truth, accessible link names, or customer-facing empty state. It has no product-state, loading, video, carousel, animation, RTL, zoom, or long-copy controller state.

## Theme Editor Settings

All current stable section setting IDs are listed below. There are no schema `visible_if` conditions.

| ID | Type and verified default | Meaning |
| --- | --- | --- |
| `eyebrow` | `text`; blank | Optional heading-group label. |
| `heading` | `inline_richtext`; `Editorial story` | Optional Section Heading title. |
| `description` | `richtext`; blank | Optional Section Heading description. |
| `heading_size` | `select`; `standard` | `small`, `standard`, or `large`. |
| `text_alignment` | `select`; `left` | `left` or `center` heading alignment. |
| `layout` | `select`; `editorial` | `editorial` or `feature-first`. |
| `show_numbers` | `checkbox`; `false` | Shows source-order frame numbers. |
| `color_scheme` | `color_scheme`; `scheme-1` | Approved local color scheme. |
| `padding_top`, `padding_bottom` | `range`; `80`; 0–160px in steps of 4 | Desktop spacing. |
| `mobile_padding_top`, `mobile_padding_bottom` | `range`; `48`; 0–120px in steps of 4 | Mobile spacing. |

`item` block settings are `image` (`image_picker`), `mobile_image` (`image_picker`), `media_ratio` (`select`, `portrait` or `landscape`, default `portrait`), `title` (`text`, default `Editorial detail`), `text` (`textarea`), `product` (`product`), `collection` (`collection`), and `link` (`url`). The preset is `t:sections.lookbook.preset`; destination dependencies follow the exact precedence in Content Rules.

The Theme Editor supports add, delete, duplicate, and reorder operations. `block.shopify_attributes` supports block selection. No Lookbook JavaScript initializes on section load, so there are no controllers, listeners, timers, observers, or media sessions to clean up on load, unload, select, or deselect. Design-mode placeholders are current editor-specific behavior.

## Responsive Behaviour

The current implementation starts with two grid columns and changes to the selected editorial or feature-first layout at 48rem. `mobile_image` supplies responsive mobile media, while `min-inline-size: 0` and normal source order support stacking and constrained inline size. The layout has no rail overflow, mobile drag, or mobile ordering setting.

At 320px, high zoom, long translations, and RTL, image frames and captions must remain readable and source order remains authoritative. CSS uses logical sizing but does not contain an audited Lookbook-specific RTL, zoom, or long-caption test. Real images and translated copy require manual review before publication.

## Accessibility

Lookbook renders a `role="list"` of article `role="listitem"` frames, an optional shared H2 heading, H3 titles, and one normal anchor when there is a destination. The anchor receives an `aria-label` from `title` only when title exists; otherwise an image alternative must provide an adequate name.

Do not use item number, visual sequence, crop, color, or image alone to communicate required context. Verify keyboard navigation, visible focus, touch targets, alternative text, headings, contrast, 200%/400% zoom, long text, and RTL. There is no carousel semantics, live region, automatic movement, keyboard controller, or motion dependency.

## SEO and Structured Data

Lookbook can offer truthful internal links and visible merchant-authored frame text, but owns no title metadata, meta description, canonical URL, primary H1, Product, Article, Organization, Review, AggregateRating, or image structured data. It must not turn imagery or image alternatives into SEO claims, infer a product connection, or duplicate linked-resource metadata.

The linked product or collection retains its page data and structured-data ownership. The relevant Page Specification owns page-level SEO.

## Performance Rules

The current section bounds frames to six, uses lazy Responsive Image loading, reserves ratio geometry, and has no section JavaScript, hidden slides, controller, or video payload. It is not an LCP lead by default; do not preload all frames or use it above the page’s required primary lead without a separate performance justification.

Avoid repeated large lifestyle assets, adjacent image grids, and desktop-only crop choices that force excessive mobile payload. Verify real images, feature-first geometry, and duplicate-instance cost before use.

## Motion Rules

No Lookbook animation, carousel, autoplay, drag, swipe, or scripted transition exists. `show_numbers` changes visible sequence labeling only. The section remains fully useful with JavaScript unavailable and under reduced-motion preferences.

## AI Guidelines

AI may select Lookbook only when a permitted page has two or more approved, coherent visual frames and every selected destination is real. It may set only current supported layout, image ratio, frame order, number visibility, and approved links. It must omit incomplete, repeated, inaccessible, weakly related, or unsupported product/collection references.

AI must not identify products from images, infer product association, create campaign names, seasons, locations, models, styling details, captions, quotes, availability, or calls to action. It must not use Lookbook as Shop the Look, Image Mosaic, a product rail, a slideshow, or a Hero.

## Implementation Audit

- **Source brief inspected:** `docs/sections/lookbook.md`.
- **Current implementation:** `apps/theme/sections/lookbook.liquid`; one `item` block type, maximum six blocks, source precedence, preset, and stable IDs documented above.
- **Dependencies inspected:** `responsive-image.liquid`, `section-heading.liquid`, `section-spacing.liquid`, `component-image.css`, and `section-editorial-pack.css`.
- **JavaScript and lifecycle:** no Lookbook controller or matching listener is present in the shared section JavaScript; it is static server-rendered markup.
- **Page/template and mapping evidence:** no direct canonical JSON-template assignment; `editorial_discovery` layout recipe and strategy-section mapping include `lookbook`; capability, safe-default, and content-classification catalogs contain its field evidence.
- **Test evidence:** `scripts/validate-editorial-hero-pack.js` checks schema, translations, IDs, preset, assets, and snippets. No focused test covers URL precedence, link names, duplicate destinations, or responsive crop quality.
- **Implementation gaps:** no runtime validation for card completeness or source duplication; no customer empty state, product fallback, link confirmation, carousel, video, or explicit RTL/zoom accessibility test.

## Quality Checklist

- One `lookbook` owner at `media/lookbook.md`, distinct from Shop the Look and Image Mosaic.
- All 13 section IDs and all eight `item` IDs are recorded; no more than six frames are used.
- Each frame has approved image media, an accessible name, truthful text, and a real destination when linked.
- Product and collection fields are used only as explicit destination sources, never as image inference or product association.
- No markers, Product Cards, Quick Add, inventory claim, video, slideshow, or invented campaign content is introduced.
- Mobile, zoom, RTL, keyboard, focus, contrast, lazy loading, and layout stability are reviewed with real assets.

## Future Compatibility

Future work may add destination validation, asset provenance, caption attribution, duplicate checks, richer responsive crop guidance, and automated focus/RTL/zoom tests. Any change must preserve `lookbook`, `item`, current IDs, source precedence, existing merchant instances, and static fallback. It must not absorb Shop the Look commerce behavior or Image Mosaic composition ownership.
