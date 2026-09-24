# Brand Values

## Purpose

Brand Values is a reusable editorial section for concise, merchant-authored principles. It gives customers a calm way to understand the beliefs that meaningfully shape a brand without turning a short value statement into an unverified manifesto, policy, guarantee, or campaign.

The section owns a bounded collection of values and their local hierarchy. It is appropriate when those values clarify a real customer decision or give necessary brand context. It is not a default filler section and must be omitted when the merchant has not supplied verified values.

**Current implementation:** `apps/theme/sections/brand-values.liquid` is a Shopify Online Store 2.0 section with one repeatable `value` block type, a preset, server-rendered list semantics, and no section-specific JavaScript.

**Target behavior:** preserve that small, factual scope while governing when the section belongs on a page, how it composes with related brand sections, and how deterministic generation selects it.

## Customer Goals

Customers should be able to:

- understand a small number of authentic brand principles without reading a long manifesto;
- distinguish stated values from product facts, legal guarantees, certification, or proof;
- scan one meaningful title and supporting explanation for each value;
- use the section comfortably with keyboard navigation, browser zoom, translated text, RTL layout, large text, reduced motion, and a 320 px viewport; and
- continue to the next relevant page through an optional, verified action when one is genuinely useful.

## Merchant Goals

Merchants should be able to:

- present their own concise values in a quiet, premium layout;
- order values to reflect authentic priority without managing implementation detail;
- use an approved icon or real image only when it clarifies a value;
- choose a restrained layout, column count, heading treatment, color scheme, and optional contextual action; and
- omit the section entirely when the brand has no approved value content.

Merchants do not configure semantic levels, CSS, JavaScript, breakpoints, arbitrary colours, animation speed, generated claims, or legal meaning through this section.

## Shopify Context

Brand Values is implemented as `apps/theme/sections/brand-values.liquid`. Its schema declares the `value` block, permits up to eight blocks, exposes a three-value preset, and does not declare app-block support. It has no template-specific `enabled_on` restriction in the audited schema. That technical availability is not evidence that it belongs on every template.

The current section is not assigned in any audited JSON template. It is available as a Theme Editor preset and may be composed only where the Page Specification, approved merchant strategy, and verified inputs allow it.

Valid canonical page contexts are:

- Homepage, after primary orientation or discovery and only when values strengthen understanding;
- Standard Page, especially an authentic About, Values, or Brand Story page;
- Product Page only when the values are directly factual and relevant to the product decision; and
- Collection Page only when the values directly explain the collection's verified context.

It is prohibited as ordinary composition on Search, Collection List, Cart, Contact, Blog, Article, 404, account, checkout, and global shell surfaces. It must never replace a product title, collection title, page title, cart task, contact form, or article body.

## Responsibilities

Brand Values owns:

- a local, optional introductory heading group;
- concise merchant-authored value or principle entries;
- the title, supporting explanation, and optional visual support for each entry;
- local ordering, density, grid/list/editorial presentation, and responsive composition;
- section-local empty authoring feedback in Theme Editor design mode; and
- an optional, verified contextual CTA.

It must preserve the original meaning of merchant content and make no stronger implication than the supplied words support.

## Boundaries

Brand Values does not own:

- a full brand manifesto, founder biography, chronology, team story, or global brand strategy;
- sustainability, labour, donation, sourcing, environmental, quality, warranty, guarantee, or policy claims unless the merchant has explicitly provided and approved them for this section;
- awards, certifications, memberships, testimonials, ratings, or generic trust badges;
- product specifications, availability, price, collection data, or commerce actions;
- page-level H1, canonical URL, metadata, or structured-data ownership;
- global navigation, footer, cart, app integrations, or unsupported dynamic sources; or
- fabricated values, proof, links, media, people, dates, commitments, or destinations.

Brand Manifesto owns a broader statement of philosophy. Materials, Craftsmanship, Sustainability, and Awards and Certifications own their respective factual claims. Brand Values must not duplicate them simply to make a page appear more complete.

## Section Structure

The canonical structure is:

```text
Brand Values section
├── Optional Section Heading
│   ├── Optional eyebrow
│   ├── H2 section title
│   └── Optional concise supporting text
├── Value list — required when the storefront section renders
│   └── Value block — one to eight
│       ├── Optional approved image or decorative icon
│       ├── Meaningful value title
│       └── Optional supporting rich text
└── Optional contextual CTA
```

The current Liquid implementation renders the heading through `section-heading` at `h2`, a `role="list"` wrapper, and `role="listitem"` entries that call `feature-item`. It renders a design-mode empty message when no blocks exist. It does not render an invented storefront fallback.

## Required Blocks

**Currently implemented:** the only block type is `value`; the schema allows a maximum of eight blocks. Each block exposes `value_icon`, `image`, `heading`, and `text`.

For a live customer-facing instance, at least one `value` block must contain a meaningful merchant-authored title or explanation. The canonical composition should normally use two to six complete entries; one entry is allowed only when it is genuinely a single principle, and more than six requires a clear reason to avoid turning the section into a policy index.

The current schema does not enforce individual field completion. Generation and merchant review must therefore validate content truth before placement rather than treating an empty configured block as a valid value.

## Optional Blocks

No optional block types are currently implemented or specified. CTA, heading, image, and icon are settings within the section or `value` block; they are not independent blocks.

Future block types require a separate Section Specification governance change, implementation evidence, schema audit, and migration plan. Do not add a manifesto, statistic, certification, testimonial, policy, product, or founder block to this section merely because it is visually convenient.

## Block Composition

Value blocks are repeatable, merchant-reorderable Shopify blocks. Their source order is the reading order and must remain the visual order at every breakpoint. A value block may use either a real approved image or a decorative icon; it must not require media in order to communicate its content.

The current preset creates three empty `value` blocks. Current schema and manifest evidence permit one section instance per template. The section should appear once per page and must not be adjacent to another Brand Values instance. It is normally placed after Founder Story or Brand Manifesto and before Materials or Team, subject to the Page Specification and available evidence.

## Component Dependencies

The audited runtime composes:

- `Section Heading` through `snippets/section-heading.liquid` for the local H2 introduction;
- `Responsive Image` through `snippets/responsive-image.liquid` when a value uses an image;
- `Rich Text` through `snippets/rich-text.liquid` inside the runtime `feature-item` helper;
- `Icon System` through `snippets/icon.liquid` for approved decorative icons; and
- `Button` through `snippets/button.liquid` for the optional section CTA.

`feature-item` is a current runtime helper, not a separately documented canonical Component Specification. It must not be represented as a new component owner in this document. The owning section remains responsible for value composition; shared primitives retain their own semantics, tokens, focus, media, and action contracts.

## Content Rules

Use only concise merchant-authored values, principles, or philosophy that the merchant has approved. A value title states the principle; supporting text explains it without rephrasing it into a stronger promise.

Do not create or amplify:

- policies, commitments, guarantees, warranties, charitable donations, labour practices, sourcing promises, or service levels;
- environmental, ethical, quality, safety, or performance claims;
- founder stories, heritage assertions, awards, testimonials, or certifications; or
- slogans, promotions, urgency, or generic luxury language.

An optional CTA must have an approved label and a real destination. It must add a distinct next step, not repeat the page's primary commerce action. No empty link or button may render.

## Asset Requirements

Assets are optional. A value may be text-led and remains complete without media.

When media is used, it must be a real merchant-owned or approved Shopify image that supports the specific value. It must have accurate asset context and an appropriate alternative text treatment from the shared Responsive Image contract. Icons are decorative unless they carry information not present in nearby text; the current runtime treats icons as decorative.

No stock-like placeholder, fabricated illustration, logo, badge, person, or image-derived claim may be generated. Lazy loading is appropriate for value images because this section is not an above-the-fold default.

## Supported Variants

### Grid

**Currently implemented.** The default `layout` value is `grid`; the merchant may choose two, three, or four desktop columns and one or two mobile columns. Select it for short, similarly weighted values.

### List

**Currently implemented.** The `list` layout becomes one column on smaller screens and two columns at the audited wider-screen breakpoint. Select it when descriptions require more reading room.

### Editorial

**Currently implemented as a schema class variant.** The section emits `co-brand-values--editorial`; the shared CSS audit does not identify a distinct editorial layout rule beyond that class. Treat it as an available presentation setting whose visual differentiation requires implementation verification before a generator relies on it for a unique composition.

### Text-led, Icon-supported, and Image-supported

**Target behavior within the existing block model.** Select text-led when no approved visual adds meaning, icon-supported for a restrained decorative cue, and image-supported only when real media clarifies the principle. These are content-composition choices, not new block types.

### Featured first value

**Currently implemented.** When `featured_first` is enabled, the first value receives a surface treatment and spans two columns at the audited wider breakpoint. Use only when one verified value is genuinely primary; it must not imply a legal hierarchy or make other entries appear unavailable.

## Supported States

- **Fully configured:** heading and one or more meaningful values render server-side.
- **Partially configured:** some block fields are blank; incomplete blocks must be reviewed before generation or publication.
- **No values:** the live storefront renders no list; current Theme Editor design mode shows a localized authoring prompt.
- **No media:** text and optional icon remain available without a media wrapper.
- **Localized or RTL:** text, order, and logical layout must remain coherent; values must not be reordered solely for decoration.
- **Reduced motion and no JavaScript:** the static server-rendered list remains fully readable and operable.
- **Theme Editor:** Shopify block attributes support selection and reordering; no controller state exists to synchronize.

Loading, customer-specific, commerce, inventory, or integration-error states do not belong to this section.

## Theme Editor Settings

**Currently implemented section settings:** `eyebrow`, `heading`, `text`, `button_label`, `button_link`, `heading_size`, `text_alignment`, `layout`, `featured_first`, `columns_desktop`, `columns_mobile`, `image_ratio`, `color_scheme`, and desktop/mobile top and bottom spacing.

**Currently implemented block settings:** `value_icon`, `image`, `heading`, and `text` on `value` blocks. The section supports a three-block preset and no app blocks.

Merchants may add, remove, reorder, duplicate, and edit value blocks within Shopify's schema limit. They may not use settings to create a second H1, alter low-level accessibility semantics, insert arbitrary HTML/CSS/JavaScript, set unsupported breakpoints, or imply unsupported business behavior.

Current implementation has no section-specific JavaScript lifecycle. If enhancement is introduced later, section load, unload, select, deselect, block select, block deselect, setting refresh, and duplicate initialization must be safe; listeners, timers, and observers must be removed on unload. Empty authoring feedback must remain available in design mode without being shown as fabricated customer content.

## Responsive Behaviour

The section is mobile-first and must remain usable from 320 px upward. Current CSS uses a one- or two-column mobile grid and a controlled two-, three-, or four-column desktop grid at `48rem`. The list variant is single-column on smaller screens and two columns at the wider breakpoint; a featured first item spans two columns only at the wider breakpoint.

Long translated titles and descriptions must wrap without horizontal scrolling. Logical properties must preserve RTL behavior. Images use the selected ratio through Responsive Image and must reserve stable geometry. At large text and browser zoom, columns may reduce or stack rather than clip a value, its image, or its CTA.

## Accessibility

The target is WCAG 2.2 AA.

- The section belongs within the page `main` landmark and uses an optional `aria-labelledby` relationship only when a heading exists.
- Current section headings render as H2; the parent page retains the single H1. Value titles render as H3 through `feature-item` when present.
- The value collection uses list semantics; reading and visual order must match.
- Images require meaningful alternative text when informative and empty alternative text when decorative. Icons must not be the only representation of a value.
- The CTA must be a real labelled link or action with visible focus, keyboard operation, sufficient contrast, and a useful destination.
- Contrast, focus treatment, control targets, spacing, and colour treatment remain governed by the component and token layers. Featured status must never rely on colour alone.
- No motion, hover-only information, automatic focus movement, or JavaScript is required to read values.

## SEO and Structured Data

Brand Values may contribute truthful, indexable on-page text, but it does not own page metadata, canonical URLs, social metadata, Organization schema, Product schema, Review schema, award schema, certification schema, or WebPage schema.

Use H2/H3 structure that supports the page hierarchy without duplicating the page title. Avoid repeating values across multiple sections or pages solely for keywords. Links must use real destinations and descriptive labels. Any future structured data about an organization, policy, or claim requires a centralized ownership rule and verified evidence; it must not be emitted because an icon or value title appears.

## Performance Rules

The section is server-rendered and requires no section-specific JavaScript. It should remain low cost:

- load value images lazily with Shopify-responsive candidates and bounded `sizes`;
- reserve image geometry through the selected ratio to avoid layout shift;
- avoid LCP priority because this section is not an above-the-fold default;
- use the shared global brand-storytelling stylesheet and semantic tokens rather than duplicate CSS;
- avoid decorative video, carousel, webfont, third-party, or observer dependencies; and
- preserve stable layout when blocks are absent, reordered, or edited in Theme Editor.

## Motion Rules

No motion is currently implemented or required. Content must be visible immediately without animation.

Any future enhancement may use only a restrained opacity or transform transition that does not delay reading or change order. It must respect `prefers-reduced-motion`, use no scroll-driven motion, no pulsing or bouncing value cards, and no decorative motion that claims importance.

## AI Guidelines

AI may select Brand Values only when verified merchant values exist and the approved page strategy identifies a genuine trust or orientation role. It must select one implementation-backed layout deterministically from value count, text length, real asset availability, page context, and merchant goal:

- short peer values may use Grid;
- longer explanations may use List;
- `featured_first` may be used only when the merchant has identified a real primary value;
- imagery is used only when an approved asset clearly supports a value; otherwise text-led composition is preferred.

AI must preserve merchant wording and meaning, use documented setting IDs and the `value` block only, respect the one-instance rule, and place the section after authentic orientation and before related evidence when applicable.

AI must never invent or upgrade values into policies, guarantees, sustainability claims, labour commitments, donations, founder facts, awards, certifications, products, images, links, or CTAs. It must omit the section when reliable value content is unavailable and must not duplicate Brand Manifesto, Materials, Sustainability, or Awards and Certifications.

## Implementation Audit

### Source evidence inspected

- **Currently implemented:** `docs/sections/brand-values.md` defines values as a grid, list, or editorial presentation; identifies `value` blocks and its composition after Founder Story or Brand Manifesto and before Materials or Team.
- **Currently implemented:** `docs/sections/brand-storytelling-pack.md` classifies values as merchant-confirmed brand-storytelling content.
- **Currently implemented:** `config/calinium-section-manifest.json` records `brand-values` as an auto-add-unsafe, merchant-verification-before-publish section with one maximum instance per template.

### Runtime evidence inspected

- **Currently implemented:** `apps/theme/sections/brand-values.liquid` provides the `value` block, a maximum of eight blocks, a three-block preset, setting IDs listed above, H2 section heading, list semantics, optional CTA, and design-mode empty feedback.
- **Currently implemented:** `apps/theme/assets/section-brand-storytelling-pack.css`, loaded by `apps/theme/layout/theme.liquid`, provides token-based grid, list, responsive-column, and featured-first styles.
- **Currently implemented:** `snippets/section-heading.liquid`, `feature-item.liquid`, `responsive-image.liquid`, `rich-text.liquid`, `icon.liquid`, `button.liquid`, and `section-spacing.liquid` supply current rendering primitives.
- **Currently implemented:** localization exists in `apps/theme/locales/en.default.schema.json` and `apps/theme/locales/en.default.json`.
- **Currently implemented:** `config/theme-section-capabilities.json` records the `value` block, layouts, preset, no app blocks, and source references.
- **Currently implemented:** no `brand-values` section assignment was found in audited JSON templates; no section-specific JavaScript reference was found.

### Accessibility, SEO, and performance evidence

- **Currently implemented:** H2/H3, list roles, lazy image requests, responsive image candidates, decorative icon treatment, and a no-JavaScript server-rendered path.
- **Partially implemented:** `aria-labelledby` is emitted when the section heading exists; the schema does not require complete value content and image alternative quality depends on merchant asset metadata.
- **Currently implemented:** the global layout emits Product or Article structured data only; this section emits no independent structured data.

### Current gaps

- **Not implemented:** formal canonical block documentation, page-eligibility enforcement, content-completeness validation, duplicate-instance prevention at Theme Editor level, and a distinct audited visual rule for the `editorial` class.
- **Not implemented:** section-specific lifecycle testing, because no controller exists.
- **Unknown:** whether every merchant-supplied image has sufficiently accurate alternative text; this depends on real Shopify asset data.

No founder decision is required for this specification. Any future change to add new block types, automatic placement, policy claim behavior, or a distinct editorial layout requires separate governance.

## Quality Checklist

- [x] One bounded editorial responsibility is defined.
- [x] The implemented `value` block, settings, limits, preset, and no-app-block posture are recorded.
- [x] Current implementation is separated from target behavior and unknown merchant data.
- [x] One H2 section heading and H3 item hierarchy preserve page H1 ownership.
- [x] Valid and prohibited page contexts, single-instance rule, and ordering constraints are explicit.
- [x] Values, claims, media, links, and CTAs require merchant truth; no fallback copy is invented.
- [x] Responsive, RTL, 320 px, no-JavaScript, WCAG 2.2 AA, motion, SEO, and performance rules are defined.
- [x] AI uses only approved values and implementation-backed settings, or omits the section.

## Future Compatibility

This specification preserves the stable current setting IDs and `value` block type. Future work may harden block-content validation, formalize the `feature-item` helper or its equivalent component contract, and verify whether the editorial class warrants a distinct implementation-backed variant.

Any refinement must retain semantic hierarchy, merchant truth, the one-instance composition rule, and progressive enhancement. It must not expand Brand Values into a generic brand-story builder, silently migrate claims, or create uncontrolled variants. New settings, blocks, dynamic sources, structured data, or motion require separate evidence, schema compatibility review, implementation audit, and documentation governance.
