# Brand Manifesto

## Purpose

Brand Manifesto is a typography-led editorial section for an approved statement of brand philosophy, principles, values expressed as manifesto, and approved quotations. It gives a merchant a quiet place to state what the brand believes without turning generic positioning into company history, biography, sustainability proof, or product marketing.

**Currently implemented:** `brand-manifesto` renders a local H2 heading, rich text, optional media, optional CTA, and up to six `principle` blocks.

## Customer Goals

Customers should be able to understand an authentic, concise statement of brand intent, read real principles without decorative distraction, and follow one real continuation when supplied. The section must remain understandable without media, animation, or JavaScript.

## Merchant Goals

Merchants should be able to publish their approved narrative, concise principles, approved quotation within that narrative, optional approved media, and optional verified CTA without configuring technical layout or inventing supporting facts. They may omit the section when no factual brand statement is available.

## Shopify Context

The stable runtime ID is `brand-manifesto`. Its schema has a maximum of six `principle` blocks, a preset, and no audited `enabled_on` or app-block restriction. Technical availability is not canonical permission.

Canonical contexts are Homepage after orientation, and Standard Page for an About, philosophy, or values context. Article use is conditional only when the merchant-authored article makes the manifesto directly relevant and subordinate to the Article H1/body. Product and Collection pages are exceptional and require a direct verified relevance. It is prohibited as ordinary composition on Cart, Search, Collection List, Contact, Blog listing, 404, account, checkout, and global shell surfaces.

## Responsibilities

Brand Manifesto owns local philosophy narrative, an ordered set of approved principles, optional supporting image/media, optional principle numbering, local layout, and one optional verified continuation. It owns the presentation of merchant-approved belief, not proof that a belief has been implemented.

## Boundaries

It does not own founder biography, company chronology, Team profiles, Materials, Manufacturing Process, Sustainability claims, Awards and Certifications, product specifications, promises, guarantees, pricing, or global brand strategy. `Brand Values` owns concise reusable value entries; Brand Manifesto owns a broader manifesto composition only when it adds distinct approved narrative.

It must not transform an aspiration into a verified policy, a quotation into an attributed fact, or a visual into evidence. Founder Story remains an existing related canonical dependency and is not duplicated here.

## Section Structure

```text
Brand Manifesto
├── Optional Section Heading (H2)
├── Approved manifesto rich text
├── Optional verified CTA
├── Optional principle list
│   └── principle block → optional ordinal, H3, supporting text
└── Optional approved supporting image / mobile image
```

**Currently implemented:** media appears only when `image` is selected. Principle blocks use `role="list"` and `role="listitem"`; the existing `Section Heading` is explicitly rendered at H2.

## Required Blocks

The only implemented block type is `principle`, with `heading` and `text`, capped at six. The schema does not require blocks, but canonical use requires either an approved manifesto narrative or two to six verified principles. A live principle needs real merchant-approved content; placeholder defaults are not a public claim.

## Optional Blocks

No optional block type is implemented. Image, mobile image, CTA, layout, numbering, color, and animation are section settings. The runtime has no quotation, icon, testimonial, founder, timeline, award, or social-link block.

## Block Composition

`principle` blocks are repeatable, reorderable, and capped at six. Their source order is reading order; numbering, when enabled, is presentational and must not create a false chronology. Use one Brand Manifesto per page. It normally follows page orientation and precedes Founder Story, Brand Values, Brand Timeline, or related evidence. Do not repeat the same principle text in adjacent Brand Values, Sustainability, or awards sections.

## Component Dependencies

The audited runtime composes `Section Heading`, `Rich Text`, `Responsive Image`, `Button`, `section-spacing`, and editorial-pack CSS. Rich Text is an implementation primitive rather than a new ownership model; it does not validate claims. No section-specific JavaScript controller, timeline helper, portrait renderer, or Icon System dependency is implemented.

## Content Rules

Every philosophy statement, principle, quotation, title, CTA label, and CTA destination must be merchant-approved. A quotation in rich text must be an approved, accurately attributed statement; omit it if attribution or approval is unavailable. Do not invent values, history, achievements, labor practices, donations, quality guarantees, sustainability claims, product claims, origin claims, or evidence of compliance.

The current schema defaults—such as “A considered approach,” explanatory rich text, and principle placeholder copy—are authoring defaults, not merchant facts. They must be replaced with approved content or the section omitted before publication. Media must support rather than manufacture the manifesto meaning.

## Asset Requirements

`image` and `mobile_image` are optional and must be approved, rights-cleared, and contextually faithful; `media_ratio` supports square, portrait, and landscape. The existing Responsive Image primitive loads selected media lazily and responsively. A meaningful image needs accurate alternative text through the source asset; decorative media must be treated decoratively only when the manifesto text already conveys the required meaning.

Do not use stock, generated, or unrelated imagery as proof of a principle. No portrait, logo, video, or per-principle image is implemented.

## Supported Variants

- **Minimal:** **Currently implemented** through `layout: minimal`; use for text-led manifesto content.
- **Split:** **Currently implemented** through `layout: split`; use only when approved media adds real context.
- **Numbered / unnumbered principles:** **Currently implemented** through `show_numbers`; numbering remains non-chronological.
- **Restrained entry animation:** **Currently implemented** through `enable_animation`, CSS only, and only under `prefers-reduced-motion: no-preference`.

There is no founder-led, timeline, testimonial, video, evidence, product-led, or interactive variant.

## Supported States

- **Fully configured:** approved heading/narrative and optional verified principles/media render server-side.
- **Narrative-only:** valid; optional blocks and media omit cleanly.
- **Principles-only:** valid only when each principle is approved and the local heading gives honest context.
- **Incomplete/placeholder content:** technically renderable but invalid for publication; deterministic generation omits it.
- **No content:** no dedicated design-mode empty state is implemented; canonical composition omits the section.
- **No JavaScript / reduced motion:** content is readable; animation is absent under reduced-motion preference.

## Theme Editor Settings

**Currently implemented stable section IDs:** `eyebrow`, `heading`, `text`, `image`, `mobile_image`, `media_ratio`, `button_label`, `button_link`, `layout`, `show_numbers`, `enable_animation`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

**Currently implemented `principle` IDs:** `heading` and `text`; maximum six. Shopify permits block add/remove/duplicate/reorder. There is no section controller, request, observer, block-select behavior, app-block support, or current runtime enforcement of factual approval. Theme Editor preview must not treat generic defaults as publishable merchant content.

## Responsive Behaviour

The current layout is mobile-first and becomes a two-column split at 48rem when `layout: split`; principles also become two columns at that breakpoint. Minimal layout constrains the content width. The section must remain readable from 320 px through wide screens, at 200%/400% zoom, with long translations and RTL, no horizontal overflow, stable media ratio, and wrapping CTA text.

Complete RTL and high-zoom manual regression evidence is **Unknown**.

## Accessibility

The target is WCAG 2.2 AA. The local heading is H2, principle headings are H3 when supplied, and principles use list semantics. Text must remain meaningful without numbers, image, CTA, or animation. CTA links need visible labels, keyboard operation, focus visibility, contrast, touch-safe size, and real destinations.

Approved quotations in rich text require semantic authoring and factual attribution; no dedicated quote component is implemented. Do not rely on typography, number, color, image, or animation to communicate meaning. Verify image alternatives, zoom, RTL, reduced motion, and long-text reading manually.

## SEO and Structured Data

Brand Manifesto can contribute truthful indexable narrative but owns no H1, title metadata, meta description, canonical URL, Organization, Person, Product, Article, Review, ItemList, or WebPage schema. Do not create entity schema from brand language, a quotation, or image. Page-level SEO and structured-data ownership remain with the relevant Page Specification.

## Performance Rules

The section is server-rendered with no section JavaScript. Optional media is responsive/lazy and its ratio reserves space. Keep principles at six or fewer, avoid duplicate manifesto/value regions, do not give lower-page media LCP priority, and do not add embeds, polling, video, or a heavy animation framework. Animation is CSS-only and optional.

## Motion Rules

`enable_animation` applies a restrained CSS entry animation only when reduced motion is not requested. No timer, autoplay, scroll effect, parallax, forced focus movement, or motion required for comprehension is implemented. Disable rather than escalate motion when it competes with reading.

## AI Guidelines

AI may select Brand Manifesto only when a permitted page has merchant-approved philosophy or principles that add distinct meaning beyond Brand Values. It must preserve approved wording and quotation attribution, select split layout only with approved useful media, use the existing `principle` block and stable settings, and omit empty or default-only composition.

AI must never invent or embellish values, philosophy, quotation, history, people, achievements, policies, certifications, social impact, claims, CTA destinations, or media. It must not turn Brand Manifesto into Founder Story, Brand Timeline, Team, Sustainability, or product marketing.

## Implementation Audit

**Source evidence inspected:** `docs/sections/brand-manifesto.md` and `brand-storytelling-pack.md`; the existing Founder Story canonical specification was inspected as a boundary reference and not edited.

**Runtime evidence inspected:** `apps/theme/sections/brand-manifesto.liquid` schema/preset; Section Heading, Rich Text, Responsive Image, Button, section-spacing; editorial-pack CSS and reduced-motion rule; templates, manifest/mapping/capability evidence, and editorial-hero validation script.

**Currently implemented:** stable schema, H2 composition, six principle blocks, optional media/CTA, minimal/split layout, optional numbering, CSS-only reduced-motion-safe animation, and static no-JavaScript output. **Partially implemented:** generic defaults can render as live content and no explicit editor empty state exists. **Not implemented:** factual approval/quotation attribution enforcement, dedicated quote semantics, per-principle media/links, controller lifecycle, app blocks, or direct template assignment. **Unknown:** full RTL, zoom, assistive-technology, and localization QA.

## Quality Checklist

- [x] Owns approved manifesto narrative and principles only.
- [x] Separates Founder Story, Timeline, Team, Values, evidence, and product ownership.
- [x] Documents exact settings/block IDs, authoring defaults, truth rules, variants, states, and ordering.
- [x] Preserves H2/H3 hierarchy, native reading, reduced motion, responsive media, and SEO boundaries.
- [x] Requires deterministic omission rather than fabricated editorial content.

## Future Compatibility

Preserve `brand-manifesto`, the `principle` block, all listed stable IDs, preset, responsive-media behavior, CTA pair rule, and CSS reduced-motion fallback. Future work may add merchant-approval validation, truthful empty guidance, quote semantics, and accessibility QA without changing existing approved content or merging this section with Brand Values or Founder Story.

Any future block, app-block, generator, preset, localization, or schema evolution must retain backward-compatible defaults and never generate a brand history or factual claim from generic manifest language.
