# Founder Story

## Purpose

Founder Story is a reusable editorial section for a real, merchant-confirmed founder or originator and their relationship to the brand. It gives customers a calm, human-scale account of origin without converting generic brand copy into a biography or claiming credentials, history, or achievements that the merchant has not verified.

The section is appropriate only when a founder-led narrative materially improves understanding of the merchant, product, or collection. It must be omitted when no real founder story exists or when the page's primary informational or commercial task should remain uninterrupted.

**Currently implemented:** `apps/theme/sections/founder-story.liquid` is a Shopify Online Store 2.0, server-rendered split section with optional portrait, mobile portrait, biography, quote, signature, CTA, and repeatable `achievement` blocks.

**Target behavior:** retain the small, evidence-led scope while governing content truth, safe media-free composition, page placement, deterministic generation, and Theme Editor behavior.

## Customer Goals

Customers should be able to:

- understand who founded or originated the brand only when the merchant has supplied real context;
- read a concise, respectful narrative without mistaking it for a full company timeline, team directory, testimonial, or product promise;
- view an approved portrait or signature when it adds authentic context, without needing it to understand the story;
- distinguish founder achievements from awards, certifications, or generic social proof; and
- read and navigate the section comfortably at 320 px, browser zoom, large text, translated text, RTL, keyboard navigation, and reduced-motion settings.

## Merchant Goals

Merchants should be able to:

- present a verified founder narrative, portrait, quote, signature, optional achievements, and one real continuation;
- choose contained or full-width layout, image left or right, heading treatment, text alignment, color scheme, and responsive portrait assets;
- preserve the founder's intended tone and facts without managing technical layout or accessibility details; and
- leave portrait, signature, quote, CTA, or achievement blocks absent when they are not real or useful.

Merchants do not configure a second page H1, corporate history, arbitrary styling, raw HTML/CSS/JavaScript, animation, technical breakpoints, invented credentials, or claim verification through this section.

## Shopify Context

Founder Story is implemented as `apps/theme/sections/founder-story.liquid`. The schema declares `achievement` as its only block type, permits up to six blocks, provides a preset with no blocks, and does not declare app-block support. It has no audited template-specific `enabled_on` restriction. Technical editor availability does not establish canonical page eligibility.

The section is not assigned in the audited `index.json`, `page.json`, `product.json`, or `article.json` templates. It is available as a Theme Editor preset and may be composed only when the approved page strategy and merchant evidence support it.

Valid canonical contexts are:

- Homepage, after orientation or discovery rather than as a default lead;
- Standard Page, particularly a real About or Brand Story page; and
- Article Page only when a verified founder narrative is editorially relevant and remains subordinate to the article body and article H1.

It is conditionally valid on a Product or Collection Page only when the same verified founder story directly clarifies that product or collection and follows its primary orientation and purchase/discovery task. It is prohibited as ordinary composition on Cart, Search, Collection List, Contact, Blog listing, 404, account, checkout, and global shell surfaces.

## Responsibilities

Founder Story owns:

- a local optional heading group and supporting narrative;
- a verified founder portrait and mobile portrait when supplied;
- a merchant-authored founder biography or origin narrative;
- an optional verified quote, signature image, and one contextual CTA;
- optional concise, verified achievements;
- local split layout, image position, content density, and responsive hierarchy; and
- empty authoring guidance where the runtime currently provides it.

It preserves founder identity, wording, and intended tone. It does not make a founder appear more central, experienced, awarded, historic, or personally involved than the merchant's facts support.

## Boundaries

Founder Story does not own:

- a full company timeline, generic brand history, brand manifesto, team directory, or biography of multiple people;
- craftsmanship details, manufacturing stages, material education, sustainability claims, awards, certifications, testimonials, reviews, or product specifications;
- product price, availability, purchase controls, collection discovery, or page-level conversion flow;
- page H1, canonical URL, metadata, structured data, or person/organization schema ownership;
- external founder links, social profiles, credentials, dates, signatures, portraits, or milestones without verification; or
- fabricated founders, names, roles, biographies, quotations, achievements, media, or CTA destinations.

Brand Manifesto owns broad philosophy; Brand Timeline owns verified chronology; Team owns multiple real people; Awards and Certifications owns external proof. Founder Story must not absorb their responsibilities simply because it contains a human narrative.

## Section Structure

The canonical structure is:

```text
Founder Story section
├── Optional founder media region
│   └── Approved portrait with optional mobile alternative
└── Narrative region
    ├── Optional Section Heading
    │   ├── Optional eyebrow
    │   ├── H2 story heading
    │   └── Optional biography or narrative
    ├── Optional verified quotation
    ├── Optional decorative signature image
    ├── Optional achievement list
    │   └── Achievement block
    │       ├── Optional decorative icon
    │       ├── Achievement title
    │       └── Optional supporting text
    └── Optional verified CTA
```

**Currently implemented:** the Liquid always creates a media wrapper; it renders an approved portrait when one exists and a Shopify placeholder only in Theme Editor design mode. The narrative region renders Section Heading at H2, an escaped blockquote when provided, a decorative signature image, the achievement list when blocks exist, and a primary CTA only when both label and URL are present.

**Target behavior:** a media-free story remains coherent and does not present an empty visual region as meaningful content. The section should be omitted when neither a verified narrative nor a valid founder story heading exists.

## Required Blocks

**Currently implemented:** `achievement` is the only block type. It exposes `achievement_icon`, `heading`, and `text`; the schema allows a maximum of six blocks.

Founder Story does not require an achievement block. A live Founder Story requires a verified heading or narrative that identifies the real founder/origin context. When achievement blocks are used, each must contain a verified title or explanation; an empty configured block is not a valid achievement.

## Optional Blocks

No optional block types are currently implemented or specified. Portrait, mobile portrait, quote, signature, CTA, and biography are section settings, not blocks.

Do not add founder, quote, image, button, timeline, team member, award, testimonial, or social-link blocks without a separate Section Specification change, schema audit, migration plan, and evidence that they do not duplicate existing section ownership.

## Block Composition

Achievement blocks are repeatable and merchant-reorderable. Their source order is the reading order. They are optional and should be used sparingly for real, relevant milestones or responsibilities rather than decorative credentials.

Current manifest evidence permits one Founder Story instance per template. The canonical rule is one per page and no adjacent duplicate Founder Story. It normally follows an Editorial Hero or Brand Manifesto, then precedes Brand Values, Brand Timeline, Craftsmanship, or a modest closing CTA. It must not precede a page's essential product, collection, search, cart, contact, or policy task when it would distract from that purpose.

## Component Dependencies

The audited runtime composes:

- `Section Heading` through `snippets/section-heading.liquid` for the local H2 introduction;
- `Responsive Image` through `snippets/responsive-image.liquid` for portrait, mobile portrait, and signature media;
- `Rich Text` through `snippets/rich-text.liquid` for achievement text;
- `Icon System` through `snippets/icon.liquid` for decorative achievement icons; and
- `Button` through `snippets/button.liquid` for the optional CTA.

Rich Text is an audited runtime primitive but has no separate current Component Specification in the inspected component library. This document does not redefine it. Founder Story owns the narrative composition; the shared component layer retains media, action, icon, focus, token, and responsive behavior ownership.

## Content Rules

Founder name, role, biography, company origin, dates, quotation, signature, portrait, achievement, external link, and CTA must come from verified merchant input. The current schema does not provide dedicated founder-name, role, date, or external-link settings; they may be included in the merchant-authored heading, narrative, quote, or CTA only when true and appropriate.

Do not convert generic brand language into a founder account. Do not claim a founder's personal involvement, experience, title, status, award, heritage, origin, investment, charity, labour practice, or product contribution without evidence. A quote must be an actual attributed statement; a signature image must be authentic and rights-cleared.

The CTA must use an approved label and a real destination. It may lead to an authentic related page, never to a fabricated founder profile, unsupported social account, or generic promotional route.

## Asset Requirements

Portrait, mobile portrait, and signature media are optional but must be merchant-approved, rights-cleared, and contextually accurate. A portrait cannot imply the person is a founder if that fact is not verified. The mobile image may be used only as a real alternative asset, not as a cropped substitute that changes the context.

The current portrait uses Responsive Image with portrait ratio, lazy loading, and responsive candidates. The signature is rendered with empty alternative text and is therefore decorative; the surrounding text must already establish the founder identity. When no approved portrait exists, select text-led target composition or omit the section; never use stock imagery, an AI-invented person, a generic office photo, or a placeholder in the customer-facing storefront.

## Supported Variants

### Portrait left and portrait right

**Currently implemented.** `image_position` supports `left` and `right`; the shared CSS moves the media column at the audited `48rem` breakpoint. The current DOM order remains media before narrative in both positions. Select the position from approved portrait composition and surrounding page balance, not decorative novelty; any future source-order change requires an accessibility audit.

### Contained and full-width

**Currently implemented.** `layout` supports `contained` and `full-width`. Select contained for most readable editorial contexts and full-width only when the approved portrait and page composition benefit from broader media without compromising hierarchy.

### Portrait-led split editorial

**Currently implemented when approved portrait and narrative exist.** It is the current split layout with optional media and textual story.

### Text-led, quote-led, compact introduction, and long-form story

**Target behavior within the current setting model.** Text-led composition is appropriate when no portrait is approved. Quote-led composition requires a verified quote but must retain the narrative. Compact versus longer treatment is selected from verified text length and page role, not an unimplemented density setting. Long-form content may belong in a Standard Page body rather than this section.

## Supported States

- **Fully configured:** verified narrative and optional approved founder media render server-side.
- **Narrative-only:** a true founder story renders without portrait or signature; target presentation must avoid an empty media region.
- **Media-only or empty content:** omit the section rather than implying a story through portrait alone.
- **Partially configured:** optional quote, signature, CTA, or achievements may be absent; incomplete factual claims require review before publication.
- **No achievements:** the achievement list is absent; it is not an error state.
- **Theme Editor:** portrait placeholder appears only in current design mode when image is blank; Shopify block attributes support achievement editing.
- **Localized or RTL:** source order, names, quotations, and dates remain faithful to verified localization.
- **Reduced motion and no JavaScript:** static story content remains fully readable; no controller is required.

Customer-specific, inventory, checkout, integration-error, and dynamic-profile states do not belong to this section.

## Theme Editor Settings

**Currently implemented section settings:** `image`, `mobile_image`, `eyebrow`, `heading`, `text`, `quote`, `signature_image`, `button_label`, `button_link`, `image_position`, `layout`, `text_alignment`, `heading_size`, `color_scheme`, and desktop/mobile top and bottom spacing.

**Currently implemented block settings:** `achievement_icon`, `heading`, and `text` on `achievement` blocks. The preset contains no blocks and the section supports no app blocks.

Merchants may add, remove, duplicate, and reorder achievement blocks within the schema limit. They may disable the section when no genuine founder story exists. They must not use configuration to create an arbitrary biography builder, second H1, raw script, false founder history, or unsupported social profile.

No section-specific JavaScript controller currently initializes. Any future enhancement must react safely to section load/unload, select/deselect, block selection/deselection, reorder, settings refresh, disabled sections, and duplicate initialization. It must clean listeners and observers on unload and retain a complete no-JavaScript path. The current section and block attributes provide Shopify editing identity; future code must not generate duplicate IDs.

## Responsive Behaviour

The section is mobile-first and must work from 320 px. The current implementation renders its split layout as one column below `48rem` and two columns at or above that breakpoint. A right-positioned portrait moves visually at the wider breakpoint; contained layout uses page width and full-width applies page-gutter containment in the audited CSS.

Portrait media uses a mobile override, `sizes` appropriate to one or two columns, and portrait ratio. Long biographies, localized founder names, quotes, and CTA labels must wrap without overflow. At zoom and large-text settings, the story stacks rather than compressing media or content. Logical CSS properties and source order must remain RTL-safe.

## Accessibility

The target is WCAG 2.2 AA.

- The section heading renders at H2 when supplied; it must never replace the page H1.
- The narrative remains meaningful without portrait, signature, achievement icons, or CTA.
- Portrait media requires accurate alternative text when it identifies or informs; signature media is decorative only when nearby text already supplies identity.
- Current quote output uses `blockquote`; any future attribution must be factual and semantically connected without inventing a source.
- Achievement entries use list semantics and H3 where a heading exists. Decorative icons cannot be the sole representation of an achievement.
- CTA links require visible labels, keyboard operation, visible focus, sufficient contrast, a touch-safe target, and verified destination.
- No content, state, or identity depends on hover, motion, image recognition, or JavaScript. Zoom, reduced motion, logical reading order, and RTL must remain safe.

## SEO and Structured Data

Founder Story may contribute truthful indexable narrative content but owns no page-level metadata, canonical URL, Open Graph data, Person schema, Organization schema, Article schema, Product schema, Review schema, BreadcrumbList, or WebPage schema.

Use H2/H3 hierarchy without duplicate H1s or keyword repetition. Do not emit Person or Organization structured data merely because a portrait, quotation, name, or signature appears. Any future entity schema requires centralized ownership and verified evidence. Founder-related links must be real and descriptive.

## Performance Rules

The current section is server-rendered and has no section-specific JavaScript. It should remain low cost:

- portrait and signature images use Shopify-responsive candidates and lazy loading;
- media reserves portrait/natural geometry to prevent layout shift;
- this lower-page, non-default section must not receive LCP priority without a page-level audit;
- it reuses globally loaded token-based brand-storytelling CSS and shared primitives;
- no video, carousel, third-party profile embed, polling, or observer is required; and
- duplicate instances are prohibited to limit repeated media and narrative cost.

## Motion Rules

No motion is currently implemented or required. Founder content is available in the initial server response.

Any future motion must be restrained, must not delay biography reading, and must honor `prefers-reduced-motion`. Portrait reveal effects, signature drawing, parallax, quote animation, pulsing achievements, and motion that implies status or prestige are prohibited.

## AI Guidelines

AI may select Founder Story only for an explicitly founder-led merchant strategy with verified founder content. It must use only approved values in the current setting and `achievement` block model.

AI selects deterministically:

- portrait-led split composition only when an approved portrait exists;
- text-led target composition or omission when portrait media is absent;
- a verified quote only when it adds distinct meaning;
- achievements only when concise, factual, and not duplicate Awards and Certifications;
- one instance after brand orientation or product introduction, before Values, Timeline, Craftsmanship, or a restrained continuation when page context permits.

AI must preserve tone and must never invent names, roles, dates, quotations, signatures, portraits, credentials, awards, company origin, milestones, people, links, or CTAs. It must not transform generic brand story into a founder biography, overshadow essential product/collection content, or place the section merely because a page needs visual content.

## Implementation Audit

### Source evidence inspected

- **Currently implemented:** `docs/sections/founder-story.md` defines founder/origin use, portrait left/right, contained/full-width layouts, responsive portrait, quote, signature, CTA, `achievement` blocks, and no-JavaScript rendering.
- **Currently implemented:** `docs/sections/brand-storytelling-pack.md` classifies Founder Story as merchant-confirmed people/origin content.
- **Currently implemented:** `config/calinium-section-manifest.json` identifies Founder Story as auto-add-unsafe, merchant-verification-before-publish, one instance per template, and not above-the-fold by default.

### Runtime evidence inspected

- **Currently implemented:** `apps/theme/sections/founder-story.liquid` contains the single `achievement` block, six-block maximum, no-block preset, listed section settings, H2 section heading, optional quote/signature/CTA, and design-mode portrait placeholder.
- **Currently implemented:** `apps/theme/assets/section-brand-storytelling-pack.css`, loaded by `apps/theme/layout/theme.liquid`, provides the split, wider-screen positioning, contained/full-width, portrait, signature, and achievement layout rules.
- **Currently implemented:** `section-heading.liquid`, `responsive-image.liquid`, `rich-text.liquid`, `icon.liquid`, `button.liquid`, and `section-spacing.liquid` provide rendering dependencies; locale and capability records exist.
- **Currently implemented:** no direct audited JSON-template assignment and no section-specific JavaScript controller were found.

### Accessibility, SEO, and performance evidence

- **Currently implemented:** server-rendered H2/H3 structure, blockquote, responsive lazy portrait, list semantics for achievements, decorative signature treatment, and no-JavaScript rendering.
- **Partially implemented:** `aria-labelledby` requires a nonblank heading; the schema does not require a usable story or complete achievement content, and the live empty-portrait wrapper remains present.
- **Currently implemented:** no independent structured data is emitted; the audited global layout conditionally emits Product or Article schema only.

### Current gaps

- **Not implemented:** dedicated founder name, role, date, attribution, and external-link fields; content-completeness validation; and an explicit customer-facing empty state that removes blank media composition.
- **Not implemented:** canonical achievement-block documentation, page-eligibility enforcement, duplicate story prevention in Theme Editor, and lifecycle tests because no controller exists.
- **Unknown:** merchant permission, portrait rights, signature authenticity, biography accuracy, quote attribution, and achievement evidence.

No founder decision is required for this specification. Any future dedicated founder-identity fields, social links, multiple-founder support, automatic placement, or entity-schema behavior requires separate governance and implementation evidence.

## Quality Checklist

- [x] Founder/origin ownership is bounded and separate from timeline, team, manifesto, awards, craft, and product content.
- [x] The exact current `achievement` block, settings, limit, preset, and no-app-block posture are recorded.
- [x] Founder truth, media rights, quotations, signature, and CTA destinations require verified merchant input.
- [x] Valid/prohibited pages, one-instance rule, order, page-H1 boundary, and no-JavaScript behavior are explicit.
- [x] 320 px, RTL, zoom, WCAG 2.2 AA, SEO/schema boundaries, performance, and reduced-motion rules are defined.
- [x] Current runtime, target behavior, gaps, and merchant-dependent unknowns are separated.
- [x] AI selects verified founder evidence or omits the section.

## Future Compatibility

This specification preserves the existing `achievement` block and stable section setting IDs. Future work may harden verified founder facts, add a safe media-free layout, and formalize the runtime Rich Text dependency or achievement block contract.

No future change may turn Founder Story into a generic about page, social profile directory, testimonial rail, or automatic heritage generator. New identity fields, block types, dynamic sources, external integrations, entity schema, motion, or automatic placement require a separate backward-compatible schema plan, implementation audit, Page Specification mapping, and deterministic AI rule.
