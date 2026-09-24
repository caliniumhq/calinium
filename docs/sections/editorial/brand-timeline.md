# Brand Timeline

## Purpose

Brand Timeline is a factual editorial chronology of merchant-approved milestones. It presents dated, ordered events without inventing company history, biographies, awards, manufacturing stages, or causal stories between events.

**Currently implemented:** `brand-timeline` renders an ordered list of up to twelve `timeline_item` blocks in vertical or progressively enhanced horizontal presentation.

## Customer Goals

Customers should be able to understand a small, truthful chronological sequence, distinguish dates from narrative, browse approved supporting media, and retain the whole sequence without JavaScript. The timeline must not turn unverified heritage or aspiration into historical fact.

## Merchant Goals

Merchants should supply verified dates, milestone titles, descriptions, optional images, and optional decorative icons in chronological order. They may choose vertical or horizontal composition but do not configure a biography, award system, manufacturing explanation, or inferred event data.

## Shopify Context

The stable runtime ID is `brand-timeline`. Its schema allows twelve `timeline_item` blocks, includes a preset, and has no audited `enabled_on` or app-block support. The brand-storytelling manifest recommends it for Homepage and Standard/About Page middle content, with one instance per template.

Canonical contexts are Standard Page brand-history content and Homepage after orientation or Founder Story when verified chronology supports trust. Article use is conditional only for a factual historical article and must remain subordinate to the Article body/H1. Product and Collection use is exceptional and must directly clarify the product/category. It is prohibited as ordinary composition on Cart, Search, Collection List, Contact, Blog listing, 404, account, checkout, and global shell surfaces.

## Responsibilities

Brand Timeline owns dated milestone ordering, local heading/intro, optional milestone media, ordered-list presentation, vertical/horizontal composition, optional decorative milestone marker, and section-local carousel controls in horizontal mode. It owns chronology presentation, not historical research or proof.

## Boundaries

It does not own founder biography, Team profiles, Brand Manifesto philosophy, awards, sustainability, materials, manufacturing process, product claims, company legal history, or automated historical data. Founder Story owns a single person’s verified narrative; Team owns current people; Brand Timeline owns only verified dated events.

It must not infer dates, fill chronological gaps, convert an icon into a factual achievement, or merge process steps with company milestones.

## Section Structure

```text
Brand Timeline
├── Optional Section Heading (H2)
└── Ordered milestone list
    └── timeline_item block
        ├── Date / chronological label
        ├── H3 milestone title
        ├── Approved detail text
        ├── Optional approved image
        └── Optional decorative icon or visible ordinal marker
└── Optional enhanced previous/next controls in horizontal layout
```

**Currently implemented:** the list is an `<ol>`; each list item passes date, heading, and text to `timeline-item`, which renders an H3 when supplied. Horizontal mode adds `data-co-carousel`; native list output remains before enhancement.

## Required Blocks

The only implemented block type is `timeline_item`, capped at twelve, with `date`, `heading`, `text`, `image`, and `timeline_icon`. The schema does not force individual fields, but a canonical milestone requires an approved date/period and title; supporting text and image are optional. Use two to twelve complete milestones; omit incomplete events rather than create a decorative timeline.

## Optional Blocks

No optional block type is implemented. Supporting media and icon are fields on `timeline_item`. There are no founder, quotation, award, process-step, CTA, team-member, or link blocks.

## Block Composition

Timeline blocks are repeatable, reorderable, and capped at twelve. Their Shopify source order is the chronological reading order and must remain oldest-to-newest unless the merchant explicitly documents a different reading convention. Reordering requires merchant reapproval of chronology.

Use one Brand Timeline per page. It normally follows verified Founder Story or introductory brand context and precedes Brand Values, Team, Craftsmanship, or closing content. Do not place beside a second timeline, Manufacturing Process, or repeated founder history that creates conflicting chronology.

## Component Dependencies

The audited runtime composes `Section Heading`, `timeline-item`, `Responsive Image`, `Icon System`, `Button`, `section-spacing`, brand-storytelling CSS, and horizontal `ScrollCarousel` in `calinium-sections.js`. `ScrollCarousel` is a runtime controller; it is not a second timeline data source. No Rich Text component dependency is invoked directly by the section, though `timeline-item` uses the existing rich-text renderer.

## Content Rules

Every date, period, event title, milestone description, image, place, achievement, and chronology must be merchant-approved. Preserve the factual sequence and uncertainty: do not convert an approximate period into an exact date, infer launch or founding dates, add locations, invent causal links, or treat an image as historical proof.

Milestones must describe company chronology rather than a founder biography, generic philosophy, manufacturing workflow, award, or product campaign. Use icons as decoration only; the date and text carry the fact. No quotation, profile, or link field is implemented.

## Asset Requirements

Each `timeline_item.image` is optional and must be rights-cleared, accurately related to that milestone, and supplied with meaningful alternative text through the Shopify asset when informative. `image_ratio` supports square, portrait, and landscape; the current renderer lazy-loads responsive images. Omit media when it cannot be verified rather than use stock, generated, or decorative historical substitutes.

## Supported Variants

- **Vertical:** **Currently implemented** through `layout: vertical`; use as the default for long chronology and small screens.
- **Horizontal:** **Currently implemented** through `layout: horizontal`; use only when the number of complete milestones and visual media support horizontal browsing.
- **Text-led milestone:** **Currently implemented** without item image or icon.
- **Image-supported milestone:** **Currently implemented** with an approved item image.
- **Decorative icon or ordinal marker:** **Currently implemented** through `timeline_icon`; neither conveys the event meaning alone.

There is no biography, award, process, video, auto-rotating, filtered, data-sourced, or interactive timeline variant.

## Supported States

- **Fully configured:** two or more approved milestones render in verified order.
- **Partially configured:** image/icon/detail can be absent; date and title remain required canonically.
- **Incomplete milestone:** current runtime may render partial content; deterministic generation omits it.
- **No blocks:** design mode shows localized empty guidance; storefront omits the list.
- **No JavaScript:** the `<ol>` remains available; horizontal controls remain hidden and native reading/scrolling remains available.
- **Reduced motion:** enhanced carousel uses non-smooth scroll behavior.
- **Theme Editor:** section/block identities support editing; selected block is scrolled into view by the shared carousel when horizontal.

## Theme Editor Settings

**Currently implemented stable section IDs:** `eyebrow`, `heading`, `text`, `heading_size`, `text_alignment`, `layout`, `image_ratio`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

**Currently implemented `timeline_item` IDs:** `date`, `heading`, `text`, `image`, and `timeline_icon`; maximum twelve. Blocks can be added, removed, duplicated, and reordered. Horizontal mode initializes the shared carousel once on section load, destroys buttons/listeners/frame/observer on unload, and scrolls the selected block into view. There is no dedicated chronology validation, block-deselect behavior, app-block support, or current runtime reapproval prompt after reordering.

## Responsive Behaviour

The current layout is mobile-first. Vertical presentation stacks items; horizontal track styling begins at 48rem with native inline scrolling and scroll snap. Responsive images use a bounded card size. The contract requires 320 px support, readable dates/titles at 200%/400% zoom, long localization, RTL logical flow, touch-safe controls, landscape-mobile stability, no page-level overflow, and media that does not obscure chronology.

Dedicated RTL and high-zoom timeline tests are **Unknown**.

## Accessibility

The target is WCAG 2.2 AA. An ordered list preserves sequence; local heading is H2 and milestone titles H3. When `timeline_icon` is absent, a visible ordinal is `aria-hidden`, while list semantics provide sequence. Icons are decorative and dates/text must communicate the event. Horizontal controls have localized labels, use shared Button focus styles, and keyboard Arrow Left/Right behavior comes from `ScrollCarousel`.

Do not use position, icon, image, or motion alone for chronology. Verify control focus order, RTL arrow expectation, screen-reader date reading, long dates, zoom, and reduced motion manually. No autoplay is configured by this section.

## SEO and Structured Data

Brand Timeline may add truthful indexable historical text but owns no page H1, metadata, canonical URL, Organization, Person, Article, Product, Event, ItemList, or WebPage schema. Do not emit event or organization schema merely because a dated list exists. Dates and headings must not be manufactured for keyword or heritage claims.

## Performance Rules

The vertical list is server-rendered. Horizontal enhancement reuses the existing small `ScrollCarousel`, native scroll, lazy responsive media, and unload cleanup; it configures no auto-rotation. Keep milestones at twelve or fewer, avoid duplicate timelines, do not preload lower-page images, and preserve the ordered-list fallback. The timeline must not become LCP unless a page-level audit justifies it.

## Motion Rules

No autoplay, timer, parallax, or focus movement is configured. Horizontal arrows use smooth scroll only when reduced motion is not requested; the shared controller pauses any auto-rotation capability because this section supplies none. Do not animate historical progression or use movement to imply significance.

## AI Guidelines

AI may select Brand Timeline only when a permitted page has two or more merchant-approved dated milestones in a verified order. It must use only the `timeline_item` block, preserve dates and chronology, choose vertical by default, choose horizontal only when the content/media and accessibility conditions support it, and omit incomplete events.

AI must never invent founding dates, launches, places, achievements, people, quotations, images, event relationships, or chronology. It must not derive a timeline from Founder Story, Manufacturing Process, awards, product releases, or generic brand copy without approved factual milestones.

## Implementation Audit

**Source evidence inspected:** `docs/sections/brand-timeline.md` and `brand-storytelling-pack.md`; existing Founder Story was inspected as a related canonical boundary and remained unchanged.

**Runtime evidence inspected:** `apps/theme/sections/brand-timeline.liquid` schema/preset; `timeline-item`, Section Heading, Responsive Image, Icon, Button, spacing; `ScrollCarousel`, global lifecycle, brand-storytelling CSS, manifest/mapping/capability records, templates, and validation evidence.

**Currently implemented:** ordered list, twelve timeline blocks, vertical/horizontal layouts, optional media/icons, design-mode empty guidance, native fallback, labelled arrow controls, block-select scroll, and lifecycle teardown. **Partially implemented:** incomplete blocks may render and there is no chronology/order validation or reapproval after reorder. **Not implemented:** factual verification, date normalization, links, quotations, app blocks, timeline-specific controller, or direct template assignment. **Unknown:** full RTL, zoom, screen-reader, localization, and manual carousel QA.

## Quality Checklist

- [x] Owns verified dated chronology only.
- [x] Separates Founder Story, Team, Manifesto, awards, process, and product ownership.
- [x] Documents exact settings/block IDs, ordered semantics, chronology review, states, variants, and lifecycle.
- [x] Preserves no-JavaScript ordered-list fallback, reduced motion, responsive media, and SEO boundaries.
- [x] Requires deterministic omission rather than invented history.

## Future Compatibility

Preserve `brand-timeline`, `timeline_item`, all stable IDs, ordered source semantics, horizontal native-scroll fallback, carousel cleanup, preset, and existing merchant block IDs. Future hardening may add chronology validation, meaningful date guidance, reapproval after reorder, accessible carousel QA, and verified empty states without silently altering historical records.

Future generator, preset, localization, app-block, media, or schema changes must remain backward compatible and must never synthesize brand history from sparse inputs.
