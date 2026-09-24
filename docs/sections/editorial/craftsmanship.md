# Craftsmanship

## Purpose

Craftsmanship is an evidence-led editorial section for merchant-approved explanation of real techniques, workmanship, specialist processes, construction detail, and verified craft traditions. It gives customers calm, factual context for how work is performed without turning product imagery, an aspiration, or a visual style into a claim of handmade production, artisan identity, heritage, quality, or origin.

**Currently implemented:** `craftsmanship` is a server-rendered Shopify OS 2.0 split section with optional Shopify-hosted video or responsive image media, approved narrative, optional quotation and CTA, and up to eight `craft_step` blocks.

## Customer Goals

Customers should be able to understand specific, supported evidence of skill or workmanship; view approved media where it clarifies that evidence; and continue to one real destination where supplied. The section must remain useful when optional media, quotation, CTA, or step imagery is absent, and must never imply a technique or quality level that the merchant has not verified.

## Merchant Goals

Merchants should be able to present a concise approved craft narrative, real supporting media, bounded technique entries, an approved quotation, and one verified next action. They should be able to omit uncertain information rather than complete a persuasive but unsupported story. They do not configure a manufacturing workflow, sustainability policy, material specification, person biography, or product purchase flow here.

## Shopify Context

The stable runtime identity is `craftsmanship`, implemented by `apps/theme/sections/craftsmanship.liquid`. Its schema has one `craft_step` block type and `max_blocks: 8`; the preset creates two craft steps. The audited schema has no `enabled_on` restriction and no app-block support. Technical availability does not establish canonical page eligibility.

No audited JSON template assigns this section directly. The section is present in the section manifest, capability catalog, safe-default/content-classification catalogs, strategy mappings, and the `luxury_story` layout recipe. Manifest evidence recommends the middle of Homepage, Standard/About Page, or lower Product Page composition, with merchant verification before publish and at most two instances per template.

Canonical contexts are Homepage after orientation, Standard Page craft or construction content, and Product Page only where the evidence applies directly to the selected product and remains subordinate to Main Product. Article use is conditional for a factual craft editorial context. It is not an ordinary section for Collection, Search, Collection List, Cart, Contact, Blog listing, 404, account, checkout, or global shell surfaces.

## Responsibilities

Craftsmanship owns:

- an optional local heading group and factual craft narrative;
- one optional approved media region;
- an optional approved quotation;
- a bounded, ordered set of verified craft techniques or evidence items;
- optional local CTA composition; and
- local split layout, media position, responsive media selection, and static no-JavaScript rendering.

It owns evidence of skill and workmanship, not the underlying truth source or a claim-validation system.

## Boundaries

Craftsmanship does not own an ordered manufacturing workflow, sustainability policy, generic materials education, founder or team biography, company history, awards/certifications, product price or purchase controls, or product-description ownership.

The related canonical boundaries are deliberate:

```text
Materials
= factual material information

Craftsmanship
= evidence of skill and workmanship

Manufacturing Process
= ordered production stages

Behind the Scenes
= observational production media

Sustainability
= verified environmental or sourcing initiatives
```

It must not infer handmade status, artisan identity, a craft tradition, heritage, geographic origin, workshop location, production duration, quality guarantee, or specialist technique from a product image, video, product title, industry category, or broad brand copy.

## Section Structure

```text
Craftsmanship
├── Media region
│   ├── Shopify-hosted video when `video` is selected
│   ├── Otherwise desktop image with optional `mobile_image`
│   └── Design-mode-only placeholder when neither is selected
└── Content region
    ├── Optional Section Heading (H2)
    ├── Optional approved quotation
    ├── Optional craft-step list
    │   └── `craft_step` → image or decorative icon, H3, supporting text
    └── Optional CTA only when label and destination exist
```

**Currently implemented:** the Liquid gives `video` priority over `image`; selected hosted video is rendered with controls, muted output, and `preload: 'metadata'`. Image media uses the shared Responsive Image primitive with optional mobile replacement. The media wrapper is still present when media is absent, but its placeholder is design-mode only. A step list renders only when blocks exist; there is no customer-facing empty-step fallback.

## Required Blocks

`craft_step` is the only implemented block type. Its stable settings are `craft_icon`, `image`, `heading`, and `text`. The section-wide `max_blocks` value is **8**; the block has no separate per-type limit.

The schema permits sparse blocks, but a canonical live craft step requires at least a real approved technique heading or supporting explanation. An image or icon is optional. Use two to six complete steps normally; use one only for a genuinely singular technique and omit blank or unsupported steps rather than presenting a decorative list.

## Optional Blocks

No additional block types are implemented. The main media, quotation, CTA, image placement, heading treatment, ratio, colour scheme, and spacing are section settings, not blocks.

Do not introduce material, process-stage, metric, certification, person, award, testimonial, product, or video blocks without a separately approved schema and ownership audit. The existing `craft_step` does not own a link, duration, place, artisan, proof source, or quotation field.

## Block Composition

Craft steps are repeatable, reorderable, duplicable, and removable through Shopify within the eight-block limit. Source order is reading order; it may group distinct verified techniques but must not imply chronology. A sequential workflow belongs to Manufacturing Process instead.

Use one Craftsmanship section per page by default. The manifest permits up to two instances per template, but a second is valid only for clearly separate, non-duplicative approved evidence with its own local heading. Place it after Materials or approved brand orientation and before Manufacturing Process or Behind the Scenes when each region adds distinct evidence. Do not place adjacent sections that repeat the same images, technique claims, quotation, or product narrative.

## Component Dependencies

The audited runtime composes `Section Heading`, `Responsive Image`, `Rich Text`, `Button`, `Icon System`, `feature-item`, `section-spacing`, and global `section-brand-storytelling-pack.css`.

Shopify native video is rendered directly by `video_tag`; there is no section-specific Video component/controller contract. `feature-item` renders an image before a decorative icon, then a local H3 and rich text. These primitives retain their own semantics, media, focus, and token responsibilities. Craftsmanship owns only their factual composition.

## Content Rules

Every technique name, construction statement, artisan reference, handmade claim, workshop claim, production-time statement, geographic claim, heritage claim, quality statement, quotation, caption, CTA label, and CTA destination requires merchant approval or repository-verifiable support appropriate to the statement.

Do not infer craftsmanship from lifestyle photography alone. Do not describe a process as handmade because workshop media exists. Do not convert subjective copy into a durability, quality, safety, origin, or superiority claim. A quotation must be exact, approved, and attributable; omit it when its speaker or approval is unknown. The current default heading, `Craftsmanship`, is authoring text, not evidence of a merchant practice.

## Asset Requirements

`image`, `mobile_image`, `video`, and `craft_step.image` must be rights-cleared, merchant-approved assets that factually support adjacent text. `video` accepts Shopify-hosted video only; external video URLs, a poster field, transcript field, or caption field are not implemented. Video has controls and muted output; it must not depend on autoplay or audio for the customer to understand an essential claim.

Informative images need accurate asset alternative text. Decorative step icons use the Icon System as supplementary presentation and cannot communicate a claim on their own. `image_ratio` supports `square`, `portrait`, and `landscape`; selected assets must tolerate the chosen crop. Omit unknown or misleading media rather than substitute stock, generated, unverified workshop, or unrelated product imagery.

## Supported Variants

- **Media left:** **Currently implemented** with `image_position: left`; this is the default split presentation.
- **Media right:** **Currently implemented** with `image_position: right`; desktop CSS moves the media column visually while the DOM source order stays media then content.
- **Image-supported:** **Currently implemented** when `image` is selected and `video` is blank; an approved `mobile_image` can replace it below 48rem.
- **Hosted-video-supported:** **Currently implemented** when `video` is selected; it takes precedence over image media.
- **Text-led:** **Partially implemented** because content may render without selected media, although the existing empty media wrapper remains in live markup.
- **Technique-led:** **Currently implemented** through the static `craft_step` list.

There is no implemented carousel, process-timeline, artisan-profile, external-video, autoplay, product-led, metric-led, certification, or evidence-link variant.

## Supported States

- **Fully configured:** approved content plus optional truthful media/steps render server-side.
- **Media absent:** content can render; a customer-facing placeholder is not implemented.
- **Video selected:** hosted video replaces image output and remains natively controllable.
- **Optional quote or CTA absent:** each omits cleanly; CTA requires both `button_label` and `button_link`.
- **Sparse craft step:** current `feature-item` omits its article when all block content is blank; the list wrapper can still exist. Canonical generation omits incomplete steps.
- **No craft steps:** the step list omits; no current dedicated editor empty prompt exists.
- **No JavaScript / reduced motion:** server-rendered content and native video controls remain available; no local scripted interaction or motion exists.
- **Theme Editor:** Shopify block attributes identify editable steps; no section-specific selected/deselected state exists.

## Theme Editor Settings

**Stable section settings, types, defaults, and dependencies:**

- `image` (`image_picker`), `mobile_image` (`image_picker`), and `video` (`video`) default blank. `video` takes rendering precedence; `mobile_image` applies only through the Responsive Image path.
- `eyebrow` (`text`) defaults blank; `heading` (`inline_richtext`) defaults `Craftsmanship`; `text` (`richtext`) and `quote` (`textarea`) default blank.
- `button_label` (`text`) and `button_link` (`url`) default blank and must both be present to render the primary Button.
- `image_position` (`select`) defaults `left`, with `left` and `right`; `image_ratio` (`select`) defaults `portrait`, with `square`, `portrait`, and `landscape`.
- `text_alignment` (`select`) defaults `left`, with `left` and `center`; `heading_size` (`select`) defaults `large`, with `small`, `standard`, and `large`.
- `color_scheme` (`color_scheme`) defaults `scheme-1`.
- `padding_top` and `padding_bottom` are desktop `range` settings from 0–160 px in 4 px steps, default 80; `mobile_padding_top` and `mobile_padding_bottom` are mobile ranges from 0–120 px in 4 px steps, default 48.

**Stable block contract:** `craft_step` has `craft_icon` (`select`, default `sparkle`; `sparkle`, `factory`, `settings`, `diamond`), `image` (`image_picker`), `heading` (`inline_richtext`), and `text` (`richtext`). There are no app blocks. The preset contains two `craft_step` blocks.

Shopify supports add, remove, duplicate, and reorder. No custom controller, fetch, observer, select/deselect handler, or section-load/unload behavior is implemented. Any future enhancement must preserve static content, respond safely to Shopify lifecycle events, and remove listeners/observers on unload.

## Responsive Behaviour

The current layout is mobile-first: media and content stack below 48rem, then become two columns at 48rem. `image_position: right` changes desktop grid placement, not DOM order. Responsive Image uses `(min-width: 48rem) 50vw, 100vw`, selected ratio, and lazy loading; hosted video fills the same media region with `object-fit: cover`.

From 320 px upward, long headings, translated copy, CTA labels, and technique text must wrap without page-level horizontal overflow. At 200%/400% zoom, the split must reflow safely and media must not obscure content. Logical CSS supports RTL, but complete RTL, high-zoom, assistive-technology, crop, and video QA is **Unknown** and remains a manual validation requirement.

## Accessibility

The target is WCAG 2.2 AA. The local heading uses H2; craft-step headings use H3 when present. The step wrapper uses `role="list"` and block wrappers use `role="listitem"`. Images need truthful alternatives when informative; decorative icons cannot replace text. The quotation is rendered as a `blockquote` only when supplied.

Native video controls are keyboard-operable, but captions and transcripts are not schema-supported. Essential spoken or action-based meaning therefore requires approved adjacent text and, where appropriate, a transcript/caption path outside the current section. CTA links require visible text, keyboard operation, focus visibility, sufficient contrast, touch-safe size, and a real destination. Verify source order, zoom, long text, RTL, video accessibility, and colour contrast manually.

## SEO and Structured Data

Craftsmanship may contribute truthful indexable explanatory content. It does not own the page title, meta description, canonical URL, page H1, Organization, Product, Article, Person, HowTo, Certification, Review, or WebPage schema. The section must not create technical-process or handmade structured data from imagery or prose.

Page-level SEO and schema remain with the relevant Page Specification and centralized runtime. Do not use craft, handmade, heritage, artisan, local, or quality keywords as SEO filler without evidence.

## Performance Rules

The section is server-rendered and has no local JavaScript, network request, timer, observer, or controller. Responsive images and step images are lazy; lower-page media must not receive eager/high-priority treatment without a page-level LCP justification. Hosted video uses metadata preload and no poster setting, so it should be chosen only when its first available frame and native controls are suitable.

Keep to eight or fewer blocks, avoid duplicate media across nearby evidence sections, preserve selected media ratios to reduce layout shift, and do not add autoplay, external embeds, polling, or a heavy media library. The section remains useful without JavaScript.

## Motion Rules

No section-specific animation, autoplay, carousel, timer, transition, observer, or JavaScript interaction is implemented. Native video does not receive autoplay arguments. Motion cannot carry craft meaning. Any future motion must be optional, restrained, reduced-motion-safe, and must not delay the text or move focus.

## AI Guidelines

AI may select Craftsmanship only on a permitted page when approved merchant evidence establishes a real craft technique, workmanship detail, or specialist process and every chosen image/video supports that fact. It must use the existing settings and `craft_step` structure, preserve verified wording, choose media position for readable composition, and omit unknown evidence.

AI must never infer handmade production, artisan identity, heritage, geographic tradition, production duration, specialist technique, workshop location, quality guarantee, quotation, person, place, date, product claim, or CTA destination. It must not turn Materials into Craftsmanship, a process sequence into craft evidence, Behind the Scenes media into proof, or product description into production evidence.

## Implementation Audit

**Source evidence inspected:** `docs/sections/craftsmanship.md` and `brand-storytelling-pack.md`; Materials, Manufacturing Process, Behind the Scenes, Brand Values, and Brand Manifesto canonical specifications were inspected as boundaries only.

**Runtime evidence inspected:** `apps/theme/sections/craftsmanship.liquid` schema/preset; `feature-item`, Section Heading, Responsive Image, Rich Text, Button, Icon, and section-spacing snippets; `section-brand-storytelling-pack.css`; localization; `calinium-section-manifest.json`; capability, safe-default, content-classification, strategy, and layout-recipe catalogs; audited template assignments; `validate-brand-storytelling-pack.js`; and resource-plan regression tests.

**Currently implemented:** the exact schema contract above, split CSS, native hosted video or responsive-image path, static craft-step list, optional quote/CTA, no direct template assignment, and no section controller. **Partially implemented:** content may render with an empty live media wrapper; sparse blocks are not validated before list composition. **Not implemented:** claim/provenance validation, evidence links, transcripts/posters, external video, media consent validation, app blocks, direct template placement, or dedicated lifecycle tests. **Unknown:** merchant truth, asset rights, alternative text, captions, video accessibility, complete RTL/zoom testing, and manual storefront QA.

## Quality Checklist

- [x] Uses the exact 25 canonical headings and one H1.
- [x] Documents every live section and block setting ID, defaults, dependencies, limits, and preset.
- [x] Separates evidence of skill from Materials, Manufacturing Process, Behind the Scenes, Sustainability, biographies, and credentials.
- [x] Requires approved factual wording, media, quotation, and CTA destinations.
- [x] Preserves H2/H3/list semantics, native video controls, responsive media, static fallback, and reduced-motion safety.
- [x] Prohibits unsupported handmade, heritage, origin, artisan, duration, quality, and production claims.

## Future Compatibility

Preserve the `craftsmanship` runtime ID, `craft_step` block type, all listed stable IDs, two-block preset, media priority, button-pair rule, split source order, and static no-JavaScript output. Future work may add verified evidence/provenance fields, authoring warnings, transcript/poster support, consent validation, accessible video metadata, stronger incomplete-block handling, and generator truth checks only through a backward-compatible schema and migration plan.

Future extensions must not absorb Manufacturing Process, Sustainability, Materials, Founder Story, Team, Awards and Certifications, or product-purchase ownership.
