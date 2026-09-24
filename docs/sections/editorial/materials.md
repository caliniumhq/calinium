# Materials

## Purpose

Materials is a reusable editorial section for merchant-verified material, ingredient, fabric, component, or resource education. It helps customers understand factual product context in a calm, readable form without turning material description into unsupported sustainability, quality, origin, or certification marketing.

The section owns a bounded collection of material entries and their local hierarchy. It is used when those entries answer a genuine product or brand question. It is omitted when the merchant cannot support the facts or does not have material information that improves the decision.

**Current implementation:** `apps/theme/sections/materials.liquid` is a Shopify Online Store 2.0 section with one repeatable `material` block type, a preset, server-rendered list semantics, responsive lazy image delivery, and no section-specific JavaScript.

**Target behavior:** preserve that factual, product-education boundary while defining safe page use, instance governance, deterministic generation, and the separation of materials from craft, process, sustainability, certification, and product-option data.

## Customer Goals

Customers should be able to:

- identify real materials or ingredients relevant to a product or merchant story;
- understand only facts the merchant can support, including origin or properties when provided;
- scan material names, descriptions, optional media, and bounded factual metadata without a dense technical table;
- read the content comfortably on a small screen, at zoom, with large text, translated or RTL content, keyboard navigation, and reduced motion; and
- follow an optional verified action only when it offers a useful next step.

## Merchant Goals

Merchants should be able to:

- present verified material education in a restrained grid or editorial composition;
- provide a material name, explanation, optional origin, optional properties, image, and icon;
- choose image ratio, heading treatment, text alignment, color scheme, spacing, and a verified optional CTA; and
- omit a material image without losing its explanatory text.

Merchants do not set product variants, composition percentages, certification status, sustainability conclusions, arbitrary HTML/CSS/JavaScript, semantic heading levels, custom breakpoints, or unverified claims through this section.

## Shopify Context

Materials is implemented as `apps/theme/sections/materials.liquid`. Its schema declares one `material` block type, permits up to eight blocks, exposes a two-material preset, and does not declare app-block support. The audited schema has no template-specific `enabled_on` restriction. Technical availability remains distinct from canonical page eligibility.

The current section is not assigned in any audited JSON template. It is present as a Theme Editor preset and can be composed only through an approved page plan and real merchant inputs.

Valid canonical contexts are:

- Product Page, where the materials directly explain the product and do not conflict with Shopify product facts;
- Standard Page, particularly Materials, Care, Ingredient, or appropriately scoped brand-information pages;
- Homepage after primary orientation or discovery when material context is authentic and useful;
- Collection Page only when the information truthfully applies to the entire collection; and
- Article only when it is factual editorial content and is subordinate to the Article Page's body and H1.

It is prohibited as ordinary composition on Search, Collection List, Cart, Contact, Blog listing, 404, account, checkout, and global shell surfaces. It must not replace product information, product media, collection orientation, article body, policy content, or a factual product specification system.

## Responsibilities

Materials owns:

- a local optional heading group;
- merchant-verified material, ingredient, fabric, component, or resource entries;
- material name, explanation, optional image or icon, optional origin, and optional properties;
- local grouping, ordering, grid/editorial presentation, and responsive layout;
- a bounded optional CTA; and
- design-mode empty authoring feedback.

It communicates what the merchant has verified. It does not infer provenance, composition, performance, certification, ethical impact, or durability from an image, product title, category, or industry convention.

## Boundaries

Materials does not own:

- sustainability, environmental, ethical, sourcing, purity, rarity, safety, quality, durability, or performance claims without explicit merchant verification;
- awards, certifications, standards, memberships, or their verification;
- craftsmanship narrative, manufacturing workflow, behind-the-scenes media, or care instructions unless a separate approved section owns them;
- Shopify variant selection, SKU data, inventory, price, product form, or global product specifications;
- a page H1, page-level SEO, canonical URL, or structured-data ownership;
- products, collections, customer data, integrations, or arbitrary external content; or
- fabricated material names, composition, origins, images, links, or CTA destinations.

Craftsmanship and Manufacturing Process own process evidence. Sustainability owns verified social or environmental evidence. Awards and Certifications owns third-party proof. Product Information owns product truth and purchase context. Materials may link to one of these only when the destination and relationship are real.

## Section Structure

The canonical structure is:

```text
Materials section
├── Optional Section Heading
│   ├── Optional eyebrow
│   ├── H2 section title
│   └── Optional concise supporting text
├── Material list — required when the storefront section renders
│   └── Material block — one to eight
│       ├── Optional approved image
│       ├── Optional decorative icon when no image is selected
│       └── Details
│           ├── Material name
│           ├── Optional verified description
│           ├── Optional verified origin
│           └── Optional verified properties
└── Optional contextual CTA
```

The current Liquid implementation renders an H2 Section Heading, a `role="list"` wrapper, and `article` list items. Each item conditionally renders approved image media, a decorative icon, H3 heading, rich text, origin, and properties. The live section does not manufacture a fallback; Theme Editor design mode shows a localized empty prompt when blocks are absent.

## Required Blocks

**Currently implemented:** `material` is the only block type. The schema permits up to eight blocks and exposes `image`, `material_icon`, `heading`, `text`, `origin`, and `properties` settings.

A live Materials section requires at least one `material` block with a meaningful verified material name or explanatory text. A canonical composition normally uses two to six focused material entries. A single entry is valid for one key material; a larger set needs an explicit information-design rationale and must not become an uncontrolled technical specification list.

The current schema does not enforce a non-empty name, text, origin, or properties field. Generation and merchant review must verify the content prior to placement; an empty block is not a meaningful material entry.

## Optional Blocks

No optional block types are currently implemented or specified. Origin, properties, image, icon, and supporting text are optional settings of the `material` block, not independent blocks.

Do not add certification, comparison, care, process, metric, product, or testimonial blocks without a separate specification, implementation audit, and stable schema migration. A need for factual comparison does not authorize this section to become a generic product-comparison table.

## Block Composition

Material blocks are repeatable and merchant-reorderable. Their source order is the customer reading order. Current manifest evidence allows at most two Materials instances per template; the canonical default is one. A second instance is allowed only when it separates two non-overlapping, verified material groups with a clear heading and page role. It must not duplicate the same facts or create competing material narratives.

The manifest recommends placement after Editorial Hero or Brand Manifesto and before Craftsmanship, Manufacturing Process, or Product Carousel. On a Product Page, it follows core product orientation and purchase information unless material facts are essential to selecting a variant or use. It must not appear adjacent to a second Materials section or be used to repeat Sustainability evidence.

## Component Dependencies

The audited runtime composes:

- `Section Heading` through `snippets/section-heading.liquid` for the local H2 introduction;
- `Responsive Image` through `snippets/responsive-image.liquid` for real material images;
- `Rich Text` through `snippets/rich-text.liquid` for verified descriptions;
- `Icon System` through `snippets/icon.liquid` for the optional decorative material icon; and
- `Button` through `snippets/button.liquid` for the optional section CTA.

The section itself owns material-entry composition and factual boundaries. It must not duplicate Product Information, Price, Product Gallery, trust badge, structured table, or disclosure ownership. Shared component contracts remain authoritative for image delivery, link/action semantics, tokens, focus, and responsive behavior.

## Content Rules

Every material fact must have a verified merchant or authoritative Shopify source. This includes material composition, ingredient identity, origin, sourcing, properties, quality, durability, certification, environmental impact, purity, rarity, safety, technical behavior, and suitability.

Material names and descriptions should be concise, plain-language, and accurate. `origin` and `properties` are optional factual metadata, not decorative labels. Leave them blank when they are unknown. Do not convert subjective copy into an objective performance, environmental, ethical, or quality claim.

An optional CTA must have an approved label and a real destination. It may lead to a materially related care guide, factual Standard Page, or real collection/product only when that link is accurate. It must not be a generic “learn more” placeholder or an unsupported sustainability, certification, or warranty promise.

## Asset Requirements

Media is optional. Missing media must not remove a material's text, name, origin, or properties.

When used, an image must be a real approved merchant or Shopify asset that depicts the material or its truthful context. It follows the Responsive Image alternative-text, responsive-delivery, and stable-geometry contract. Decorative icons are permitted only as a supplementary cue and may not convey a material property that the text fails to state.

No AI-created material visual, generic stock substitute, logo, certification mark, or source-derived photo may be used without approval and rights. Use the selected image ratio consistently within an instance, load lower-page images lazily, and omit unavailable media rather than substituting invented content.

## Supported Variants

### Grid

**Currently implemented.** `grid` is the default `layout` setting. Current shared CSS presents material entries as a responsive three-column grid at the audited `48rem` breakpoint. Select Grid for short, similarly weighted material entries.

### Editorial

**Currently implemented as a schema class variant.** The Liquid emits `co-materials--editorial`; the audited shared CSS does not define a separate layout rule for that class. It remains a stable setting but needs implementation verification before AI treats it as a materially different composition.

### Text-led and image-supported

**Target behavior within the current `material` block.** Use text-led composition when no image adds factual clarity. Use image-supported composition only for real approved images. These are content choices, not new section or block types.

### Compact factual grouping

**Target behavior.** Use a smaller number of concise entries when product context needs quick reassurance. It is selected from verified content quantity and page role, not from a new unimplemented density setting.

## Supported States

- **Fully configured:** one or more material entries have verified meaning and render server-side.
- **Partially configured:** optional media/origin/properties may be omitted; incomplete factual claims require review before publication.
- **No material entries:** the live list does not render; current Theme Editor design mode shows a localized authoring prompt.
- **No media:** material text remains visible and complete.
- **Unavailable or uncertain fact:** omit the specific field or entire section; do not substitute a claim.
- **Localized or RTL:** text wraps and source order is preserved; factual terms require verified localization.
- **Reduced motion and no JavaScript:** the server-rendered section remains fully usable.
- **Theme Editor:** section and block attributes enable Shopify editing; no controller state exists to manage.

Product availability, variant changes, inventory, shipping, certification, and integration errors remain outside this section unless a future audited section contract explicitly adds them.

## Theme Editor Settings

**Currently implemented section settings:** `eyebrow`, `heading`, `text`, `heading_size`, `text_alignment`, `layout`, `image_ratio`, `button_label`, `button_link`, `color_scheme`, and desktop/mobile top and bottom spacing.

**Currently implemented block settings:** `image`, `material_icon`, `heading`, `text`, `origin`, and `properties` on `material` blocks. The section provides a two-block preset and does not support app blocks.

Merchants may add, remove, duplicate, and reorder material blocks within the schema limit. They may set only verified optional origin and property text. The design system controls semantic hierarchy, typography, spacing behavior, image delivery, focus treatment, icon rendering, colour tokens, and breakpoints.

No section-specific JavaScript lifecycle is currently implemented. Any future enhancement must safely respond to Shopify section load/unload, selection, deselection, block selection, block deselection, reorder, and setting refresh. It must be singleton-safe, clean listeners/observers on unload, and never make the factual material text depend on JavaScript.

## Responsive Behaviour

The section is mobile-first and must remain usable from 320 px. The current shared CSS uses a single-column grid below `48rem` and three columns at or above that breakpoint. Media uses Responsive Image with the current `sizes` value `(min-width: 48rem) 33vw, 50vw` and selected square, portrait, or landscape ratio.

Long material names, translations, origin, and property text must wrap without horizontal overflow. At zoom or large-text settings, cards may become taller or stack; content must not be clipped. Logical CSS properties preserve RTL. Images must keep stable space; mobile delivery must not request oversized media unnecessarily.

## Accessibility

The target is WCAG 2.2 AA.

- The section uses an optional labelled relationship when its H2 heading exists; it must never create the page H1.
- Current list and article semantics identify material entries; material titles render as H3 when supplied.
- Images require accurate alternative text when informative and empty alternative text when decorative. The optional icon is decorative and must not replace a material name or claim.
- Origin and properties must be understandable in context. Future implementation hardening may add explicit labels only if this improves reading rather than duplicating text.
- CTA links must have visible labels, focus, keyboard operation, sufficient contrast, and a real destination.
- The section must preserve reading order, support browser zoom, touch-safe action targets, reduced motion, no-JavaScript access, and RTL layout.

## SEO and Structured Data

Materials may contribute truthful, indexable content where it meaningfully explains the page. It does not own Product, Organization, Article, Collection, Review, certification, breadcrumb, or WebPage structured data. Product and Article schema remain centralized in the audited global layout and their owning page contexts.

Use H2/H3 semantics without duplicating the page H1. Do not repeat material text across many destinations for keywords, create hidden content, or turn a material image into a claim. Any future product specification, certification, or environmental schema requires centralized ownership and independently verified source data.

## Performance Rules

The current section is server-rendered and has no section-specific JavaScript. It must remain performance-first:

- use Shopify-responsive image candidates, selected ratio, lazy loading, and appropriate `sizes`;
- avoid eager or high-priority media unless a future page-level LCP audit makes a real exception;
- retain text-only rendering when media is absent;
- reuse global token-based CSS and shared primitives rather than introduce duplicate styles or libraries;
- avoid video, carousel, polling, external service, or observer dependencies; and
- avoid layout shift when images, text length, block count, or Theme Editor configuration changes.

## Motion Rules

No motion is currently implemented or required. Content is present in the server response.

Any future motion must be subtle, must not obscure factual information, must honor `prefers-reduced-motion`, and must not use parallax, autoplay, shimmer, pulsing icons, delayed text, or decorative movement to make a material claim appear stronger.

## AI Guidelines

AI may select Materials only when real merchant-approved material facts are available and the page strategy identifies a material-education role. It must use the current `material` block and documented setting IDs only.

AI selects deterministically:

- one instance by default, or a second only for truly separate verified material groups;
- Grid for concise peer entries and the existing Editorial setting only when its implementation-backed presentation is suitable;
- text-led composition without media when no approved image improves factual clarity;
- placement after core page orientation and before Craftsmanship, Manufacturing Process, or a product rail when that sequence matches the approved page plan.

AI must use only merchant-confirmed material names, descriptions, origin, properties, assets, and links. It must never infer or invent composition, origin, sourcing, durability, sustainability, purity, rarity, technical performance, certification, care, products, images, or destinations. It must omit unsupported fields and must not duplicate Manufacturing Process, Craftsmanship, Sustainability, Product Highlights, or Awards and Certifications.

## Implementation Audit

### Source evidence inspected

- **Currently implemented:** `docs/sections/materials.md` defines material education, `material` blocks, optional image/icon/name/description/origin/properties, responsive lazy media, and placement before Craftsmanship, Manufacturing Process, or a product rail.
- **Currently implemented:** `docs/sections/brand-storytelling-pack.md` classifies Materials as merchant-confirmed source material.
- **Currently implemented:** `config/calinium-section-manifest.json` records Materials as auto-add-unsafe, merchant-verification-before-publish, low-complexity factual education with at most two instances per template.

### Runtime evidence inspected

- **Currently implemented:** `apps/theme/sections/materials.liquid` exposes a `material` block, maximum eight blocks, two-block preset, listed setting IDs, H2 heading, list/article semantics, optional CTA, and design-mode empty feedback.
- **Currently implemented:** `apps/theme/assets/section-brand-storytelling-pack.css`, globally loaded by `apps/theme/layout/theme.liquid`, provides token-based material grid, item, media, detail, metadata, icon, and responsive styles.
- **Currently implemented:** `snippets/section-heading.liquid`, `responsive-image.liquid`, `rich-text.liquid`, `icon.liquid`, `button.liquid`, and `section-spacing.liquid` supply current rendering primitives.
- **Currently implemented:** localization exists in `apps/theme/locales/en.default.schema.json` and `apps/theme/locales/en.default.json`; `config/theme-section-capabilities.json` records the block, layouts, preset, and no-app-block posture.
- **Currently implemented:** no Materials assignment was found in audited JSON templates and no section-specific JavaScript reference was found.

### Accessibility, SEO, and performance evidence

- **Currently implemented:** H2/H3, list/article semantics, lazy responsive images, decorative icon treatment, stable ratio selection, and a no-JavaScript path.
- **Partially implemented:** `aria-labelledby` depends on a nonblank heading; the schema allows empty individual material fields, and metadata labels are visual rather than semantically labelled.
- **Currently implemented:** no independent structured data is emitted by the section. The global layout conditionally emits Product or Article structured data only.

### Current gaps

- **Not implemented:** canonical material-block documentation, page-eligibility enforcement, content-completeness validation, explicit runtime distinction between factual origin and properties, and Theme Editor protection against duplicate content.
- **Not implemented:** a distinct audited CSS layout for the `editorial` class and a section-specific lifecycle test, because no controller exists.
- **Unknown:** accuracy, rights, and alternative-text quality of merchant-selected material images; these depend on actual Shopify assets.

No founder decision is required. New material metadata, comparison behavior, care content, certifications, sustainability claims, dynamic source behavior, or additional block types require separate evidence and governance.

## Quality Checklist

- [x] A distinct factual-material responsibility and its boundaries are defined.
- [x] The exact current `material` block, settings, maximum, preset, and no-app-block posture are recorded.
- [x] Verified material truth is separated from sustainability, certification, process, and product-option ownership.
- [x] Current implementation, target behavior, gaps, and unknown merchant data are explicitly separated.
- [x] Valid/prohibited pages, two-instance limit, ordering, H1 constraints, and no-JavaScript behavior are documented.
- [x] 320 px, RTL, large text, responsive media, WCAG 2.2 AA, motion, SEO, and performance rules are present.
- [x] AI uses only approved facts and omits uncertain content rather than filling gaps.

## Future Compatibility

This specification preserves the stable `material` block and existing setting IDs. Future hardening may add validated merchant-truth workflows, explicit field labels where needed for context, formal block specifications, and an implementation-backed editorial variant.

Future work must not broaden this section into a sustainability dashboard, certification directory, manufacturing narrative, or generic product data system. Any new block, schema setting, structured-data contribution, dynamic source, comparison table, motion, or automatic placement requires a separate implementation audit, backward-compatible schema plan, page mapping, and deterministic AI rule.
