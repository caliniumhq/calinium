# Manufacturing Process

## Purpose

Manufacturing Process is a reusable editorial section for a verified chronological or logical production or service workflow. It helps customers understand real stages of how an offering is made or delivered without converting broad craftsmanship copy, material information, sustainability messaging, or generic quality language into an invented technical process.

The section owns a bounded ordered sequence of verified process stages. It is used only when order is known and materially useful to customer understanding. It must be omitted when the process is unknown, generic, commercially sensitive, unsupported, or better explained by a different factual section.

**Currently implemented:** `apps/theme/sections/manufacturing-process.liquid` is a Shopify Online Store 2.0 server-rendered ordered list with repeatable `process_step` blocks, CSS-generated sequence markers, optional icon/media/duration/statistic metadata, and no section-specific JavaScript.

**Target behavior:** retain its factual sequence boundary while governing verified stage order, media, incomplete states, safe page placement, deterministic generation, and separation from Craftsmanship, Materials, Sustainability, Behind the Scenes, and product specifications.

## Customer Goals

Customers should be able to:

- understand a real process as an ordered sequence when that sequence improves confidence or correct product understanding;
- read the title, explanation, optional approved image, and verified metadata of each stage without relying on decorative numbers alone;
- distinguish a factual process from a quality guarantee, supply-chain claim, material claim, certification, or care instruction;
- follow the sequence comfortably on mobile, at zoom, with long/translated text, RTL, reduced motion, and without JavaScript; and
- continue to a related factual destination only where future verified CTA support exists.

## Merchant Goals

Merchants should be able to:

- present a merchant-confirmed production or service sequence with real stage titles and explanations;
- choose stage order, optional icon, image, duration, statistic, heading treatment, desktop step count, color scheme, and spacing;
- omit image, duration, or statistic where it is not verified; and
- remove the section when it would expose sensitive details or cannot be stated accurately.

Merchants do not configure arbitrary timeline behavior, hidden supply-chain assertions, product specifications, technical diagrams, raw HTML/CSS/JavaScript, custom semantic hierarchy, or unverified performance claims through this section.

## Shopify Context

Manufacturing Process is implemented as `apps/theme/sections/manufacturing-process.liquid`. Its schema declares `process_step` as the only block type, permits up to ten blocks, provides a two-step preset, and does not declare app-block support. The audited schema has no template-specific `enabled_on` restriction. Theme Editor availability is not an instruction to place it on every page.

The section is not assigned in the audited `index.json`, `page.json`, `product.json`, or `article.json` templates. It is available through the Theme Editor preset and may be used only when verified process facts, merchant strategy, and the relevant Page Specification support it.

Valid canonical contexts are:

- Product Page, after essential product orientation and purchase information when the process directly explains the product;
- Standard Page, especially a factual Process, How It Is Made, or service-workflow page;
- Homepage after initial orientation or discovery when process evidence is genuinely differentiating;
- Collection Page only when the same verified process applies to the whole collection; and
- Article Page when process education is real, editorially relevant, and subordinate to the article body and H1.

It is prohibited as ordinary composition on Cart, Search, Collection List, Contact, Blog listing, 404, account, checkout, and global shell surfaces. It must not replace Product Information, product media, care instructions, technical documentation, or legal/policy content.

## Responsibilities

Manufacturing Process owns:

- a local optional heading group;
- a verified ordered process or service workflow;
- stage title, explanatory text, optional decorative icon, optional approved image, optional duration, and optional statistic;
- local numbered progression, source ordering, responsive desktop sequence and mobile stack; and
- Theme Editor empty authoring feedback.

It must preserve verified stage order and wording. It does not infer omitted stages, duration, facility, person, method, tool, quality control, supply-chain detail, or outcome.

## Boundaries

Manufacturing Process does not own:

- broad craftsmanship narrative, material education, sustainability claims, certification proof, care guidance, or global product specification;
- supplier disclosure, origin assurance, quality guarantee, labour condition, environmental impact, safety claim, or performance promise without verified source;
- founder biography, behind-the-scenes gallery, team directory, product purchase controls, collection discovery, or app integrations;
- page H1, canonical URL, page metadata, Product, HowTo, Article, Organization, Review, Breadcrumb, or WebPage structured-data ownership; or
- fabricated stage names, order, duration, locations, methods, tools, people, images, diagrams, statistics, or CTA destinations.

Craftsmanship owns why or how a quality/craft story matters. Materials owns what is used. Behind the Scenes owns contextual media. Sustainability owns verified social/environmental evidence. Manufacturing Process owns only the factual ordered workflow.

## Section Structure

The canonical structure is:

```text
Manufacturing Process section
├── Optional Section Heading
│   ├── Optional eyebrow
│   ├── H2 section title
│   └── Optional concise supporting text
└── Ordered process list — required when the storefront section renders
    └── Process step block — two to ten in a meaningful sequence
        ├── Visible sequence marker
        ├── Optional decorative icon
        ├── Stage H3 title
        ├── Optional verified explanation
        ├── Optional approved image
        └── Optional verified duration or statistic
```

**Currently implemented:** the Liquid renders an `ol` of `li` elements. CSS increments and displays a circular sequence counter. `timeline-item` supplies the conditional H3 and rich text, `media-item` renders optional image media, and duration/statistic output appears only when populated. The live section has no CTA; Theme Editor design mode shows a localized empty prompt when blocks are absent.

**Target behavior:** a live process must contain at least two complete verified steps where a sequence is claimed. A single stage normally belongs in a different explanatory section. Incomplete, unverified, or out-of-order stages are omitted rather than rendered as a false workflow.

## Required Blocks

**Currently implemented:** `process_step` is the only block type. It exposes `process_icon`, `heading`, `text`, `image`, `duration`, and `statistic`; the schema permits up to ten blocks.

The canonical live sequence uses two to ten `process_step` blocks. Each requires a verified stage title and a stable ordinal position. Supporting text, image, duration, and statistic are optional only when their absence does not obscure the stage's meaning. The current schema does not enforce title/completion or stage order, so generation and merchant review must validate them before placement.

## Optional Blocks

No optional block types are currently implemented or specified. Image, icon, duration, and statistic are settings within `process_step`; heading and support copy are section settings. The current schema does not include a CTA.

Do not add diagram, certification, material, quality-control, supplier, CTA, video, person, or testimonial blocks without a separate specification, schema audit, data-truth policy, and proof that the responsibility does not belong to an existing section.

## Block Composition

Process-step blocks are repeatable and merchant-reorderable in Theme Editor, but their source order is semantically authoritative. Reordering requires merchant verification that chronological/logical order remains correct. Current schema permits ten blocks; the manifest permits one section instance per template.

Use one primary Manufacturing Process per page. Place it after Materials or Craftsmanship when those explain facts needed to understand the process, and before Behind the Scenes, Sustainability, recommendations, or a closing CTA where page context supports that sequence. Do not place it immediately alongside another process/timeline section that repeats the same stages. It must follow essential product or collection orientation and never displace purchase-critical information.

## Component Dependencies

The audited runtime composes:

- `Section Heading` through `snippets/section-heading.liquid` for the local H2 introduction;
- `Icon System` through `snippets/icon.liquid` for optional decorative process icons;
- the runtime `timeline-item` helper for H3 step title and rich-text explanation; and
- the runtime `media-item` helper, which composes Responsive Image for optional stage media.

The inspected component library includes a Timeline utility and Responsive Image documentation, but `timeline-item` and `media-item` are runtime helpers rather than separately documented canonical components. This specification does not create or redefine them. There is no current Button/CTA, Video, Gallery, or controller dependency.

## Content Rules

Stage titles, order, methods, facilities, locations, tools, people, duration, statistic, testing, quality-control facts, production claims, images, and diagrams must be verified by the merchant. The merchant may omit sensitive or unsupported details. A stage must describe what is known, not what customers expect a manufacturer to do.

Do not transform craftsmanship language into technical process steps. Do not infer hidden manufacturing stages, supplier relationships, origin, labour conditions, environmental impact, quality assurance, production capacity, safety practice, timing, or product performance. `duration` and `statistic` are facts only; leave them blank when they are unknown. The current section has no CTA settings, so no CTA may be generated.

## Asset Requirements

Stage images are optional. When selected, they must be real approved merchant or Shopify media that depicts the specified stage or its verified context. They use the current lazy responsive image path with landscape ratio. Informative images need accurate alternatives from the asset context; decorative images use empty alternative text only when nearby copy already communicates their purpose.

The current schema does not support diagrams, mobile image overrides, or video. Do not substitute a fabricated diagram, stock factory image, AI-made process scene, or unrelated product image. Omit media when it does not clarify a verified stage.

## Supported Variants

### Numbered desktop sequence

**Currently implemented.** At the audited `48rem` breakpoint, the ordered list becomes a grid of two to five columns based on `columns_desktop`; CSS provides a visual counter and connecting rule. Select it for short, clearly ordered stages.

### Mobile stack

**Currently implemented.** Below the wider breakpoint, the list is a vertical progression. Select it as the required mobile fallback for every current process composition.

### Image-supported stages

**Currently implemented within `process_step`.** A stage may render approved optional image media. Select it only when each image explains the corresponding verified stage.

### Timeline, alternating editorial, compact overview, and diagram-led process

**Target behavior, not distinct current variants.** The current runtime has one numbered-sequence system with desktop grid and mobile stack. Any new visual variant must first gain implementation, stable setting governance, semantic sequence preservation, accessible mobile fallback, and performance evidence.

## Supported States

- **Fully configured:** two or more verified ordered steps render server-side.
- **Partially configured:** optional image, icon, duration, statistic, or explanation may be absent; missing stage title/order requires review.
- **No steps:** the live list is absent; current Theme Editor design mode shows a localized authoring prompt.
- **One step:** target behavior is omission or reassessment because a single stage is not a process sequence.
- **No media:** step text and ordered semantics remain complete.
- **Unavailable or uncertain fact:** omit the field or entire section rather than infer it.
- **Localized or RTL:** stage order remains verified; numerical and directional treatment remains comprehensible in logical reading order.
- **Reduced motion and no JavaScript:** the server-rendered ordered list remains fully usable; no controller is required.
- **Theme Editor:** Shopify section/block attributes support editing and source-order review.

Product availability, inventory, checkout, customer state, certification verification, and external integration errors are outside this section.

## Theme Editor Settings

**Currently implemented section settings:** `eyebrow`, `heading`, `text`, `heading_size`, `text_alignment`, `columns_desktop`, `color_scheme`, and desktop/mobile top and bottom spacing.

**Currently implemented block settings:** `process_icon`, `heading`, `text`, `image`, `duration`, and `statistic` on `process_step` blocks. The preset supplies two process-step blocks and the section supports no app blocks.

Merchants may add, remove, duplicate, and reorder blocks within the schema limit. Any reorder must preserve verified process order. They may disable the section when the workflow is incomplete or unsuitable. They must not use settings to introduce raw technical content, a second H1, fake duration/metrics, unverified supplier claims, or unsupported diagrams/video/CTA.

No section-specific JavaScript lifecycle currently initializes. Future enhancement must safely support section load/unload, select/deselect, block select/deselect, reorder, setting refresh, disabled sections, and duplicate initialization. It must remove listeners/observers on unload, preserve unique IDs, and keep the ordered list complete without JavaScript.

## Responsive Behaviour

The section is mobile-first and must work from 320 px. Current CSS renders a vertical ordered sequence with connecting line on narrow screens. At `48rem` it uses two to five columns selected through `columns_desktop`, moves each step to a vertical grid, and changes the connector to horizontal. Optional media uses lazy responsive delivery with `(min-width: 48rem) 22vw, 100vw` sizes and landscape ratio.

Long stage titles, translated explanation, duration, and statistic must wrap without overflow. At zoom or large-text settings, the desktop grid may stack or grow; steps must not overlap or lose order. Logical CSS and list semantics retain RTL-safe reading order. No horizontal scrolling or positional meaning may be required on small screens.

## Accessibility

The target is WCAG 2.2 AA.

- The section uses H2 only for its local heading and preserves the parent page's H1.
- Current `ol`/`li` semantics communicate ordered stages even without CSS counters; no stage meaning depends on its visual number alone.
- `timeline-item` emits H3 only when stage heading exists. A complete generated process requires a meaningful stage title.
- Optional icons are decorative; optional images need accurate alternative text when informative and empty alternative text when already described.
- Duration and statistic must be comprehensible in their stage context; future implementation may add labels only where they improve clarity without inventing facts.
- The section requires logical source order, visible focus for any future interactive element, minimum touch targets, zoom resilience, reduced motion, no-JavaScript access, and RTL-safe progression.
- Any future horizontal, tabbed, diagram, or interactive variant must be keyboard-operable and preserve the full sequence in a stacked static fallback.

## SEO and Structured Data

Manufacturing Process may contribute truthful indexable explanatory content. It owns no page-level metadata, canonical URL, Product, HowTo, Article, Organization, Review, BreadcrumbList, or WebPage schema.

The presence of numbered stages does not authorize HowTo schema. HowTo schema can be considered only when the content genuinely meets eligibility, is verified, and has centralized ownership; it must not be emitted from this section by default. Use H2/H3 hierarchy without duplicate H1s, keyword stuffing, hidden process claims, or repeated stage text.

## Performance Rules

The current section is server-rendered with no section-specific JavaScript. It should remain medium-cost, lower-page explanatory content:

- use optional Shopify-responsive images, lazy loading, selected stable ratio, and accurate `sizes`;
- do not set eager loading or high fetch priority without a page-level LCP audit;
- preserve ordered text-only rendering when media is absent;
- reuse global token-based brand-storytelling CSS and existing helpers rather than add libraries or observers;
- avoid video, external diagrams, polling, animations, or duplicate process instances; and
- maintain stable geometry as media, text length, or Theme Editor configuration changes.

## Motion Rules

No motion is currently implemented or required. The ordered process is visible in the initial response.

Future motion must not animate a stage into apparent completion, imply elapsed duration, or hide the sequence. It must honor `prefers-reduced-motion`; animated connectors, auto-advancing steps, parallax, pulsing icons, count-up statistics, and scroll-jacking are prohibited.

## AI Guidelines

AI may select Manufacturing Process only when merchant-approved process stages, their correct order, and enough explanatory content are available. It must use the audited `process_step` block and stable settings only.

AI selects deterministically:

- one instance with two to ten verified stages;
- the current desktop sequence with its required mobile stack;
- optional image only when approved media directly clarifies that stage;
- optional duration/statistic only when it is factual and source-confirmed;
- placement after material/craft context and after primary page orientation, before supplementary media, recommendations, proof, or closing CTA where page strategy allows.

AI must preserve stage order and must never invent hidden stages, methods, facilities, tools, people, duration, statistics, testing, quality claim, certification, supply-chain fact, origin, image, diagram, video, or CTA. It must not turn Craftsmanship into a technical workflow, duplicate Materials/Sustainability/Behind the Scenes, or use a generic process merely to add visual structure.

## Implementation Audit

### Source evidence inspected

- **Currently implemented:** `docs/sections/manufacturing-process.md` defines a clear numbered production/service workflow, `process_step` blocks, optional image/duration/statistic, ordered-list semantics, mobile stack, no JavaScript, and composition after Materials/Craftsmanship before Behind the Scenes/Sustainability.
- **Currently implemented:** `docs/sections/brand-storytelling-pack.md` classifies Manufacturing Process as merchant-confirmed workflow content.
- **Currently implemented:** `config/calinium-section-manifest.json` records it as P2, auto-add-unsafe, merchant-verification-before-publish, one instance per template, and not above-the-fold by default.

### Runtime evidence inspected

- **Currently implemented:** `apps/theme/sections/manufacturing-process.liquid` exposes `process_step`, a maximum of ten blocks, two-step preset, listed section/block settings, H2 heading, `ol`/`li` sequence, optional media/meta, and design-mode empty feedback.
- **Currently implemented:** `apps/theme/assets/section-brand-storytelling-pack.css`, globally loaded by `apps/theme/layout/theme.liquid`, provides mobile ordered progression, wider-screen grid, counter, connector, and metadata styling.
- **Currently implemented:** `timeline-item.liquid`, `media-item.liquid`, `section-heading.liquid`, `responsive-image.liquid`, `icon.liquid`, and `section-spacing.liquid` provide current rendering helpers; localization and capability records exist.
- **Currently implemented:** no audited JSON-template assignment or section-specific JavaScript controller was found.

### Accessibility, SEO, and performance evidence

- **Currently implemented:** H2/H3, native ordered-list semantics, visible CSS counter, decorative icon treatment, lazy optional media, responsive grid/stack, and server-rendered no-JavaScript rendering.
- **Partially implemented:** `aria-labelledby` depends on a nonblank heading; block fields and sequence correctness are not schema-validated; duration/statistic have no explicit semantic labels.
- **Currently implemented:** no section structured data is emitted; audited global layout conditionally emits Product or Article schema only.

### Current gaps

- **Not implemented:** content/sequence validation, explicit incomplete-step omission, dedicated factual labels for duration/statistic, page-eligibility enforcement, formal runtime helper contracts, diagram/video support, and a CTA setting.
- **Not implemented:** Theme Editor lifecycle tests because no controller exists, and distinct timeline/editorial/diagram variants.
- **Unknown:** accuracy of merchant stage order, durations, statistics, facilities, tools, locations, images, and all process claims.

No founder decision is required for this specification. Future diagram, video, HowTo schema, detailed-stage metadata, or dynamic-source behavior requires separate governance, legal/content-truth review, and implementation evidence.

## Quality Checklist

- [x] Ordered workflow ownership is separate from materials, craftsmanship, sustainability, media gallery, product facts, and proof.
- [x] The exact `process_step` block, current settings, maximum, preset, and no-app-block posture are documented.
- [x] Stage order, names, methods, duration, statistics, media, and claims require verified merchant evidence.
- [x] Valid/prohibited pages, one-instance rule, ordering, H1 boundary, and no-JavaScript sequence are explicit.
- [x] Ordered-list semantics, 320 px, RTL, zoom, WCAG 2.2 AA, SEO/schema, performance, and reduced-motion rules are defined.
- [x] Current behavior, target behavior, gaps, and unknown merchant facts are explicitly separated.
- [x] AI uses verified ordered stages or omits the section.

## Future Compatibility

This specification preserves the existing `process_step` block and stable setting IDs. Future work may harden factual stage validation, duration/statistic labels, incomplete-step omission, and runtime-helper documentation while preserving native ordered-list semantics and no-JavaScript rendering.

No future change may turn Manufacturing Process into a fabricated how-to guide, supply-chain guarantee, generic quality claim, or automatic process generator. New block types, diagrams, video, CTA support, structured data, dynamic sources, interactive variants, motion, or automatic placement require separate evidence, accessibility/performance audit, backward-compatible schema review, and deterministic AI rules.
