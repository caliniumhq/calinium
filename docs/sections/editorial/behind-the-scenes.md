# Behind the Scenes

## Purpose

Behind the Scenes is a reusable editorial media section for authentic workshop, studio, preparation, packaging, production, event, or verified team-activity imagery. It adds factual visual context without pretending that stock media, ambiguous photographs, or generic process imagery document the merchant's real operation.

The section owns a bounded gallery or sequence of approved media and concise factual captions. It is not a manufacturing manual, team directory, founder biography, product gallery replacement, or generic visual filler. Omit it when authentic, rights-cleared contextual media is unavailable.

**Currently implemented:** `apps/theme/sections/behind-the-scenes.liquid` is an OS 2.0 section with repeatable `gallery_item` blocks that support Shopify images, mobile image alternatives, hosted video, caption, location, and date. Grid and editorial modes are server-rendered; horizontal-scroll mode adds an audited progressive carousel controller.

**Target behavior:** retain this factual gallery boundary while governing captions, consent, media accessibility, no-JavaScript fallback, deterministic selection, and overlap with Manufacturing Process, Craftsmanship, Founder Story, Team, and product media.

## Customer Goals

Customers should be able to:

- view genuine contextual media that helps them understand the merchant's real environment or activity;
- read concise, truthful captions, locations, and dates when supplied;
- access images or hosted video without autoplay audio, hidden information, or inaccessible controls;
- use scroll controls by touch, pointer, or keyboard when enhancement is available; and
- retain an understandable experience at 320 px, browser zoom, large text, translated/RTL text, reduced motion, and without JavaScript.

## Merchant Goals

Merchants should be able to:

- select approved workshop, studio, production, event, packaging, or team media;
- provide factual captions, locations, and dates only where known and appropriate;
- select grid, editorial, or horizontal-scroll layout, desktop column count, image ratio, heading treatment, quote, color scheme, and spacing;
- use hosted video only where it conveys real context; and
- remove a scene when consent, rights, context, or accuracy can no longer be verified.

Merchants do not configure arbitrary carousels, external video URLs, autoplay, custom scripts, media claims, people/role inference, technical controls, or unsupported CTA behavior through this section.

## Shopify Context

Behind the Scenes is implemented as `apps/theme/sections/behind-the-scenes.liquid`. Its schema declares `gallery_item` as the only block type, permits up to twelve blocks, provides a two-item preset, and does not declare app-block support. The current schema has no template-specific `enabled_on` restriction.

The classification register records it as a P2 Standalone Section and originally maps it to `media/behind-the-scenes.md`. This requested canonical file resides under `editorial/`; that requested destination is documented here without modifying the classification register. Its factual media responsibility remains distinct from generic editorial navigation or commerce media.

No audited JSON template assigns the section directly. It is available through the Theme Editor preset and must be selected only where approved page strategy, media consent, and contextual evidence support it.

Valid canonical contexts are:

- Homepage, after primary orientation or an authentic craft/process context;
- Standard Page, particularly an approved About, Process, Studio, or Brand Story page;
- Product Page only when the media directly relates to the product and follows essential product information;
- Article Page when the media is editorially relevant and subordinate to the article body and H1; and
- Collection Page only when the real activity applies truthfully to the entire collection.

It is prohibited as ordinary composition on Cart, Search, Collection List, Contact, Blog listing, 404, account, checkout, and global shell surfaces. It must not replace a product gallery, manufacturing sequence, customer testimonial, or team directory.

## Responsibilities

Behind the Scenes owns:

- a local optional heading group, supporting text, and optional verified quote;
- a merchant-approved sequence of contextual image or hosted-video scenes;
- concise captions and optional factual location/date metadata;
- local gallery arrangement, optional progressive scroll controls, media ratio, and responsive layout;
- Theme Editor empty authoring feedback; and
- static server-rendered fallback for media entries and captions.

It describes only the scene that real evidence supports. It does not infer what a person is doing, how a tool is used, what a facility produces, or whether a workflow represents the merchant's standard process.

## Boundaries

Behind the Scenes does not own:

- formal manufacturing-stage explanation, chronological production workflow, detailed craftsmanship claims, or material education;
- founder biography, team identity directory, sustainability claims, awards, certifications, product specifications, or product-purchase media;
- external-video integrations, autoplay audio, analytics, customer data, app blocks, or global media architecture;
- page H1, canonical URL, page metadata, Product/Article/Organization schema, or caption-derived structured data; or
- fabricated facilities, people, roles, activities, dates, locations, captions, product context, media, or rights.

Manufacturing Process owns verified ordered stages. Craftsmanship owns verified craft explanation. Founder Story owns one real founder narrative. Team owns consented people. This section may provide adjacent evidence but must not duplicate their stories or turn visual suggestion into factual proof.

## Section Structure

The canonical structure is:

```text
Behind the Scenes section
├── Optional Section Heading
│   ├── Optional eyebrow
│   ├── H2 section title
│   └── Optional concise supporting text
├── Optional verified quotation
├── Scene collection — required when the storefront section renders
│   └── Gallery item block — one to twelve
│       ├── One approved image, mobile image, or hosted video
│       └── Optional figcaption
│           ├── Concise verified caption
│           ├── Optional verified location
│           └── Optional verified date
└── Optional scroll controls — current scroll variant only, when more than one scene exists
```

**Currently implemented:** each block prioritizes Shopify-hosted video over image, then renders responsive image media, or a design-mode-only placeholder. Captions, location, and date are conditionally emitted in a `figcaption`. Scroll mode adds a track, slides, and two previous/next buttons; grid and editorial modes require no JavaScript.

**Target behavior:** every live scene must have approved media or meaningful context. An incomplete scene must be safely omitted rather than leaving an empty `figure`; a video carrying essential spoken or visual information needs an adequate transcript or adjacent textual equivalent.

## Required Blocks

**Currently implemented:** `gallery_item` is the only block type. It exposes `image`, `mobile_image`, `video`, `caption`, `location`, and `date`; the schema allows a maximum of twelve blocks.

A live instance requires at least one gallery item with a real approved image or hosted video. A caption is optional only when the media is genuinely self-evident and does not communicate factual claims. Location and date are optional verified metadata, not decorative labels.

## Optional Blocks

No optional block types are currently implemented or specified. Quote, heading, supporting text, and layout are section settings. Current scroll controls are not Shopify blocks; they are conditionally rendered local controls.

Do not add team member, product, testimonial, process stage, video provider, CTA, location map, social feed, or external embed blocks without a separate evidence audit, specification, schema migration, and privacy/performance review.

## Block Composition

Gallery items are repeatable and merchant-reorderable; their source order is the reading and visual sequence. Current schema permits twelve blocks. Current manifest evidence permits one section instance per template. The canonical rule is one instance per page and no adjacent duplicate Behind the Scenes section.

Place it after genuine brand or product orientation, or after Craftsmanship/Manufacturing Process when the media provides a factual visual complement. Place it before a restrained newsletter, contact continuation, testimonial, or closing CTA only when it does not compete with the primary task. Avoid immediate duplication with Manufacturing Process, Craftsmanship, Founder Story, Team, Image Mosaic, Lookbook, or Product Gallery. It is never inserted solely to fill a visual gap.

## Component Dependencies

The audited runtime composes:

- `Section Heading` through `snippets/section-heading.liquid` for the local H2 introduction;
- `Responsive Image` through `snippets/responsive-image.liquid` for image and mobile-image scenes;
- Shopify native hosted video through `video_tag` with controls, muted output, and metadata preload;
- `Icon System` through `snippets/icon.liquid` for scroll-control icons; and
- the runtime `ScrollCarousel` controller in `assets/calinium-sections.js` for the scroll variant.

Documented Video and Video Player components provide relevant media guidance, but the current section uses native Shopify video directly rather than their audited section-level composition. `ScrollCarousel` is a runtime controller with no separate Component Specification found in the inspected library. This document does not redefine it. No CTA/Button dependency is currently implemented at section level.

## Content Rules

Every image, video, caption, location, date, quotation, person, activity, tool, facility, product context, and event must be merchant-approved and accurate. Captions state only what can be verified. Do not infer an occupation, production method, quality-control step, safety practice, material, location, date, or relationship from ambiguous media.

Use concise factual language. A quote requires a real attributable source and must not restate an unsupported manufacturing or craftsmanship claim. Do not use generic “made with care” language, stock imagery, staged simulation, unverified factory captions, or images of unrelated people as evidence. The current schema has no CTA settings; do not fabricate a section CTA.

## Asset Requirements

Each customer-facing scene requires a real rights-cleared merchant or Shopify asset. Image scenes may include a real mobile alternative. Hosted video must be a Shopify-supported video selected through the current `video` setting; external video URLs are not currently implemented.

Informative images require accurate alternative text through the approved asset context. Where a caption fully provides the information and image is decorative, empty alternative text is appropriate. Captions must remain adjacent to their media. Video uses current native controls and muted output; no autoplay audio is permitted. Provide a transcript, captions, or adjacent text when video sound or action is essential to the section's meaning.

Use no stock substitute, AI-invented workshop, copied brand media, unconsented person, fabricated location, or unverified date. The current video path has no poster setting; omit a video whose initial frame cannot safely represent the content until a supported fallback is available.

## Supported Variants

### Grid

**Currently implemented.** `grid` is the default layout. It uses a mobile two-column track and supports two, three, or four desktop columns. Select it for a modest set of similarly weighted verified scenes.

### Editorial

**Currently implemented.** The `editorial` layout gives the first scene a two-column/two-row emphasis at the audited wider breakpoint. Select it only when the first approved scene is genuinely primary and remains truthful without visual dominance.

### Horizontal scroll

**Currently implemented with progressive enhancement.** At the audited wider breakpoint, the track becomes a native horizontally scrollable, scroll-snap sequence. JavaScript adds previous/next controls, arrow-key navigation, block-selection reveal, controller deduplication, and cleanup. Without JavaScript, native scrolling remains available; at smaller widths the default two-column grid remains visible.

### Mixed-media gallery, single-feature scene, and compact strip

**Target behavior within the current block model.** Mixed image/video selection is currently possible per block but has no distinct schema variant. A single scene or compact sequence should be selected only from genuine media quantity and page role. Any new treatment must be backed by settings, accessibility, and performance evidence before generation depends on it.

## Supported States

- **Fully configured:** one or more approved scenes render server-side with truthful supporting context.
- **Image scene:** responsive image and optional caption render; mobile image is an optional real alternative.
- **Hosted-video scene:** native controlled muted video renders in preference to image; essential information requires a textual equivalent.
- **Partially configured:** optional caption, location, date, quote, or mobile image may be absent; unsupported context is omitted.
- **No scenes:** live media collection is absent; current Theme Editor design mode shows a localized empty prompt.
- **Incomplete scene:** current design mode can show a placeholder when media is blank; target behavior is to omit an incomplete live scene rather than render empty media.
- **Scroll enhanced:** controls are visible only after successful controller initialization; native scroll remains the fallback.
- **Reduced motion and no JavaScript:** no automatic movement occurs; grid/editorial content remains visible and scroll retains native access.
- **Localized or RTL:** caption meaning, dates, reading order, and horizontal control semantics must remain accurate.

Customer-specific, inventory, checkout, external-connection, and automatic media-generation states do not belong to this section.

## Theme Editor Settings

**Currently implemented section settings:** `eyebrow`, `heading`, `text`, `quote`, `heading_size`, `text_alignment`, `layout`, `columns_desktop`, `image_ratio`, `color_scheme`, and desktop/mobile top and bottom spacing.

**Currently implemented block settings:** `image`, `mobile_image`, `video`, `caption`, `location`, and `date` on `gallery_item` blocks. The preset supplies two gallery items and the section supports no app blocks.

Merchants may add, remove, reorder, duplicate, and edit blocks within the schema limit. They may disable the section when authentic contextual media is missing. They must not use settings to create a second H1, raw script, autoplay audio, unverified captions, external-media integration, or arbitrary carousel behavior.

Current scroll-mode lifecycle is implemented through `calinium-sections.js`: initialization is instance-scoped, checks the controller map before creating a carousel, runs on `shopify:section:load`, destroys on `shopify:section:unload`, and responds to `shopify:block:select` by revealing the selected slide. Its controller removes listeners, timers, animation frames, and observers on destruction. Grid and editorial variants have no controller. Future behavior must preserve unique Shopify section/block IDs, design-mode selection, disabled-section safety, and no-JavaScript fallback.

## Responsive Behaviour

The section is mobile-first and must work from 320 px. Current CSS uses a two-column mobile track, selected square/portrait/landscape ratio for images, and a two-, three-, or four-column grid at `48rem` and above. Editorial mode makes the first item span two columns and rows at that wider breakpoint.

At the same wider breakpoint, scroll mode becomes a horizontally scrollable sequence with 18rem–32vw auto columns and scroll snapping; controls appear only after enhancement. Captions, dates, locations, and long translations must wrap without overflow. Video must not exceed its container. Logical source order remains the reading order, and control direction must remain meaningful in RTL.

## Accessibility

The target is WCAG 2.2 AA.

- The local section heading is H2 when supplied and never replaces the page H1.
- Each scene uses `figure` and optional `figcaption`; captions must be factual and adjacent to the media they explain.
- Informative images require accurate alternative text; images are decorative only when adjacent text already conveys the same information.
- Current hosted video uses native controls, muted output, and metadata preload. Essential spoken or visual information requires captions, transcript, or adjacent equivalent text.
- Scroll controls have localized accessible names, use native buttons, support keyboard activation, and retain visible focus. The controller provides left/right arrow-key scrolling without removing native touch/pointer scroll.
- No meaning depends on carousel enhancement, motion, image recognition, colour, or video audio. The first and all static scenes remain available without JavaScript.
- Reading order, focus order, touch-target size, zoom, reduced motion, and RTL remain safe. The section must not autoscroll, autoplay audio, trap focus, or hide media content off-screen from assistive technology.

## SEO and Structured Data

Behind the Scenes may contribute truthful indexable captions and contextual text. It owns no page-level title, description, canonical URL, Open Graph output, Product, Article, Organization, VideoObject, ImageObject, Review, BreadcrumbList, or WebPage structured data.

No structured data should be emitted because a scene contains a video, a person, a facility, or a date. Future media schema requires centralized ownership, rights, descriptive metadata, and implementation evidence. Use H2 and factual captions without keyword stuffing, duplicate gallery copy, invented locations, or hidden text.

## Performance Rules

Behind the Scenes is media-heavy and must be treated as a lower-page, high-cost optional section:

- use Shopify-responsive images, real mobile alternatives, selected aspect ratios, lazy loading, and stable dimensions;
- do not assign LCP priority or eager loading by default;
- load hosted video only when justified; use metadata preload and avoid video when an image is sufficient;
- avoid external embeds, third-party gallery libraries, duplicated section instances, and unnecessary media blocks;
- use the existing instance-scoped controller only for scroll mode; native grid/editorial rendering requires no JavaScript;
- preserve browser-native horizontal scroll when JavaScript fails; and
- destroy scroll listeners, frames, timers, and observers after Theme Editor unload.

## Motion Rules

Grid and editorial modes need no motion. Scroll mode uses native scroll-snap and the existing controller requests smooth scroll only when reduced motion is not preferred; under `prefers-reduced-motion`, the shared CSS disables scroll-behavior enhancement and the controller uses automatic scrolling.

Autoplay, auto-advance, autoplay audio, parallax, animated captions, pulsing controls, flashing media, and decorative scroll effects are prohibited. Motion must not delay access to a scene, imply operational activity, or be required to understand the media sequence.

## AI Guidelines

AI may select Behind the Scenes only when approved authentic media exists and an evidence-led page strategy identifies its role. It must use the audited `gallery_item` block and stable settings only.

AI selects deterministically:

- Grid for a modest set of comparable authentic scenes;
- Editorial only when one approved first scene is genuinely primary;
- Scroll only when multiple media items, performance budget, and accessible captions justify horizontal browsing;
- image scenes when approved stills are sufficient;
- hosted-video scenes only when the video adds real context and an accessible textual equivalent is available;
- one instance after brand/product orientation or factual Craftsmanship/Manufacturing Process, before a restrained continuation when appropriate.

AI must never invent media, facilities, activities, roles, people, locations, dates, captions, product relationship, process context, usage rights, transcript, or CTA. It must not use stock imagery as merchant evidence, infer action from an image, duplicate Manufacturing Process, Founder Story, Team, Image Mosaic, or Product Gallery, or select the section as visual filler.

## Implementation Audit

### Source evidence inspected

- **Currently implemented:** `docs/sections/behind-the-scenes.md` defines real workshop/studio/production/event/team media, grid/editorial/scroll modes, `gallery_item` blocks, hosted video, captions/location/date, native controls, progressive scroll enhancement, and one-instance composition.
- **Currently implemented:** `docs/sections/brand-storytelling-pack.md` identifies Behind the Scenes as merchant-only authentic media.
- **Currently implemented:** `config/calinium-section-manifest.json` marks it P2, auto-add-unsafe, merchant-verification-before-publish, high performance cost, one instance per template, and not above the fold by default.

### Runtime evidence inspected

- **Currently implemented:** `apps/theme/sections/behind-the-scenes.liquid` exposes `gallery_item`, a maximum of twelve blocks, two-item preset, listed settings, H2 heading, quote, image/mobile image/video priority, figure/figcaption, and conditional scroll controls.
- **Currently implemented:** `apps/theme/assets/section-brand-storytelling-pack.css`, loaded globally by `apps/theme/layout/theme.liquid`, provides grid/editorial/scroll layout and reduced-motion scroll behavior.
- **Currently implemented:** `apps/theme/assets/calinium-sections.js` supplies instance-scoped ScrollCarousel initialization, duplicate prevention, section load/unload cleanup, and block-select reveal for scroll mode.
- **Currently implemented:** `section-heading.liquid`, `responsive-image.liquid`, `icon.liquid`, and Shopify native video output provide current rendering dependencies; localization and capability records exist.
- **Currently implemented:** no direct audited JSON-template assignment exists; no section-level CTA setting exists.

### Accessibility, SEO, and performance evidence

- **Currently implemented:** H2, `figure`/`figcaption`, native video controls, lazy responsive images, localized control labels, native scroll fallback, keyboard arrow support after enhancement, and reduced-motion scroll handling.
- **Partially implemented:** gallery track/items do not use explicit list semantics; video has no transcript/poster setting; and image alternative-text quality depends on merchant asset data.
- **Currently implemented:** no independent structured data is emitted; the audited global layout conditionally emits Product or Article schema only.

### Current gaps

- **Not implemented:** content-completeness validation, media-rights/consent verification, explicit live omission of incomplete scenes, transcript/poster settings, external-video support, page-eligibility enforcement, and formal ScrollCarousel documentation.
- **Not implemented:** a distinct current compact-strip or single-feature schema variant and a section-level CTA.
- **Unknown:** accuracy of every media caption, person/activity identity, location/date, asset usage rights, and video accessibility support.

No founder decision is required: the editorial file destination is explicitly specified by this batch request. A future taxonomy change to reconcile it with the existing `media/` classification entry requires a separate documentation-governance task.

## Quality Checklist

- [x] Authentic contextual-media ownership is distinct from process, craft, founder, team, and product-gallery ownership.
- [x] The exact current `gallery_item` block, settings, limit, preset, no-app-block posture, and progressive scroll controller are recorded.
- [x] Media, captions, locations, dates, people, activities, consent, and rights require verified merchant evidence.
- [x] Valid/prohibited pages, one-instance rule, ordering, no-JavaScript fallback, and page-H1 boundary are explicit.
- [x] Image/video accessibility, keyboard controls, reduced motion, 320 px, RTL, SEO/schema, performance, and lifecycle cleanup are defined.
- [x] Current runtime, target behavior, gaps, and merchant-dependent unknowns are separated.
- [x] AI selects authentic media or omits the section rather than fabricating visual proof.

## Future Compatibility

This specification preserves the existing `gallery_item` block and stable setting IDs. Future work may harden media completeness, consent/rights verification, textual video alternatives, list semantics, and ScrollCarousel controller documentation while preserving native no-JavaScript access.

No future change may turn this section into a generic stock gallery, auto-playing media rail, social feed, factory claim generator, or product-gallery substitute. New media types, external providers, CTA behavior, additional block types, dynamic sources, structured data, auto-placement, or taxonomy changes require separate evidence, performance/privacy audit, backward-compatible schema review, and deterministic AI rules.
