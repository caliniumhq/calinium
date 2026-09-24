# Awards and Certifications

## Purpose

Awards and Certifications is a reusable social-proof section for merchant-verified awards, memberships, press recognition, standards, and certifications. It gives customers a calm way to inspect factual recognition without using logos, badges, or prestige language as unsupported decoration.

The section is present only when the merchant can substantiate each entry. It is not a generic trust strip, testimonial area, sustainability claim surface, or promotional badge shelf. When no verified recognition exists, it must be omitted.

**Current implementation:** `apps/theme/sections/awards-certifications.liquid` is a Shopify Online Store 2.0 section with `award` and `certification` blocks, a two-block preset, server-rendered list semantics, lazy responsive logos, optional visible verification links, and no section-specific JavaScript.

**Target behavior:** preserve the strict proof boundary while defining page use, recognition validity, instance and order governance, deterministic generation, and accessibility requirements for logo-led entries.

## Customer Goals

Customers should be able to:

- identify the exact recognition, issuing organization, and date when the merchant provides them;
- understand that an award, membership, press recognition, standard, or certification is factual evidence rather than a generic visual promise;
- use an optional, clearly labelled verification link when available;
- read an entry even when they do not recognize its logo; and
- access the content with keyboard navigation, browser zoom, translated or RTL text, large text, reduced motion, and a 320 px viewport.

## Merchant Goals

Merchants should be able to:

- present only active, verified recognition in a quiet responsive grid;
- choose the correct `award` or `certification` block, issuer, year, concise detail, approved logo/icon, and optional verification destination;
- control heading, alignment, column count, color scheme, and spacing without technical controls; and
- remove recognition promptly when it expires, is revoked, cannot be substantiated, or loses logo-use rights.

Merchants do not configure review scores, legal promises, sustainability conclusions, arbitrary badge styling, external-link behavior beyond a real URL and label, raw schema, CSS, JavaScript, or automatic verification.

## Shopify Context

Awards and Certifications is implemented as `apps/theme/sections/awards-certifications.liquid`. Its schema declares two block types, `award` and `certification`, permits up to twelve blocks, supplies a mixed two-block preset, and does not declare app-block support. The audited schema has no template-specific `enabled_on` restriction. Technical availability must not be confused with a decision to display proof on every page.

No audited JSON template assigns this section directly. It exists as a Theme Editor preset and must be selected only through an approved page plan and verified merchant records.

Valid canonical contexts are:

- Homepage, lower in the page after genuine orientation, values, commitments, or evidence;
- Standard Page, especially an authentic About, Standards, Certifications, Press, or Trust page;
- Product Page only where the recognition applies directly to that product and does not misrepresent a brand-level claim as product proof;
- Collection Page only where it applies directly to the entire collection; and
- Article only where the recognition is editorially material, verified, and subordinate to the Article Page's body and H1.

It is prohibited as ordinary composition on Search, Collection List, Cart, Contact, Blog listing, 404, account, checkout, and global shell surfaces. It must not be placed next to checkout as persuasive decoration or used to imply payment, delivery, safety, product availability, or legal guarantees.

## Responsibilities

Awards and Certifications owns:

- a local optional heading group;
- verified award, certification, membership, standard, or recognition entries;
- the exact recognition title, issuer, optional verified year, concise detail, approved logo/icon, and optional verification link;
- local ordering, responsive grid density, and quiet card presentation; and
- Theme Editor empty authoring feedback.

It communicates recognition already earned or held. It does not determine whether a recognition is valid; merchant verification and any future back-office evidence workflow retain that responsibility.

## Boundaries

Awards and Certifications does not own:

- invented recognition, self-awarded badges, unsupported press claims, reviews, testimonials, ratings, or generic trust icons;
- environmental, ethical, safety, quality, legal, warranty, guarantee, delivery, payment, inventory, or product-performance claims not established by the recognition's verified evidence;
- certification status, membership status, expiry management, logo licensing, or third-party verification workflow;
- sustainability storytelling, material education, product specs, founder narrative, or global brand strategy;
- Organization, Product, Review, certification, award, Breadcrumb, Article, or WebPage structured-data ownership;
- page-level H1, metadata, canonical URLs, global navigation, checkout, or app integrations; or
- fabricated issuer names, dates, logos, labels, URLs, destinations, or external-link claims.

Trust Badge owns compact categorical labels, and Testimonials owns customer opinion. Neither is an alternative to documented third-party recognition. Sustainability owns its own evidence and must not be restated here without a real separate recognition record.

## Section Structure

The canonical structure is:

```text
Awards and Certifications section
├── Optional Section Heading
│   ├── Optional eyebrow
│   ├── H2 section title
│   └── Optional concise supporting text
└── Recognition list — required when the storefront section renders
    └── Award or certification block — one to twelve
        ├── Optional approved logo or decorative icon
        ├── Recognition title
        ├── Optional verified issuer
        ├── Optional verified year or date
        ├── Optional concise verified detail
        └── Optional visible verification link
```

The current Liquid implementation uses a `role="list"` grid containing article list items. It renders a responsive image with empty alternative text when a logo is present, otherwise a decorative icon. A title, issuer, year, description, and text-style verification button render only when their matching fields are nonblank. Design mode shows a localized prompt when no blocks exist; no customer-facing fallback is invented.

## Required Blocks

**Currently implemented:** the schema provides two block types: `award` and `certification`. Both have `logo`, `award_icon`, `heading`, `issuer`, `year`, `text`, `verification_link`, and `verification_label`. `award` defaults to the `award` icon; `certification` defaults to `certificate` and has a narrower appropriate icon set.

The current Liquid renders the two block types through the same structural markup. Their difference is semantic intent and available icon defaults, not a different DOM layout. A live section requires at least one block whose recognition title and supporting evidence have been verified. A logo alone is never sufficient.

## Optional Blocks

No optional block types are currently implemented or specified. The two current block types are the complete block model. Issuer, year, detail, logo/icon, and verification link are optional settings, though a merchant should supply as much verified context as is necessary to make a claim understandable.

No testimonial, rating, generic trust, press-article, statistic, sustainability, product, or CTA block may be added without a separate specification, evidence audit, schema change, and migration plan.

## Block Composition

`award` and `certification` blocks are repeatable and merchant-reorderable. They share the same field structure but must retain their semantic distinction in content and AI selection. The source order is the reading order and must match the visual order at every breakpoint.

Current schema permits twelve blocks. Current manifest evidence sets one maximum section instance per template. Use one instance per page; do not place it beside another Awards and Certifications instance or generic trust-badge strip that repeats the same recognition.

The source brief and manifest recommend placing the section after verified values, commitments, sustainability evidence, material/process context, or other real proof and before a closing newsletter, contact invitation, or modest final CTA. It is not an above-the-fold default and must not crowd primary product, collection, cart, account, or checkout tasks.

## Component Dependencies

The audited runtime composes:

- `Section Heading` through `snippets/section-heading.liquid` for the local H2 introduction;
- `Responsive Image` through `snippets/responsive-image.liquid` for approved issuer logos;
- `Icon System` through `snippets/icon.liquid` for a decorative fallback icon; and
- `Button` through `snippets/button.liquid` for an optional text-style verification link with an external-link icon.

The section owns recognition composition and proof boundaries. It must not duplicate Badge, Trust Badge, Toast, product review, testimonial, footer-logo-list, or global schema ownership. Shared component contracts remain authoritative for image delivery, alternative text, external link safety, focus, interaction, tokens, and responsive behavior.

## Content Rules

Each entry requires merchant verification of the issuer, recognition or certification name, membership status where relevant, date or year when shown, current/active status where relevant, logo-use rights, and verification URL when provided. Press recognition must identify the real publication and must not imply endorsement beyond the verified record.

Use the issuer's title and recognition wording accurately. A concise detail may clarify scope but must not infer legal validity, performance, safety, quality, environmental benefit, or product-specific applicability. Do not present an expired, revoked, unverified, self-created, or generic badge as third-party recognition.

Verification links require a visible, descriptive label and a real destination. The current implementation renders the link only when both URL and label exist. Do not manufacture a label, use a bare URL as the visible label, or imply that a link proves more than it does.

## Asset Requirements

Logos are optional but must be real, approved assets with appropriate rights. The title and issuer remain required textual context because a logo alone is not universally recognizable.

The current runtime gives logo images empty alternative text and pairs them with nearby textual recognition content. That pattern is appropriate only when the nearby title/issuer fully identifies the recognition; otherwise future implementation must use an informative text alternative. Decorative icons are a fallback visual cue and must not imply a specific certification or award.

Use responsive Shopify-hosted logos with a natural, contained fit and lazy loading. Do not create a logo, pull a mark without rights, use a low-quality badge to simulate proof, or replace unavailable evidence with an icon.

## Supported Variants

### Responsive recognition grid

**Currently implemented.** The section uses merchant-selected two, three, or four desktop columns and one or two mobile columns. Use it for multiple verified recognitions with comparable content density.

### Logo-supported recognition cards

**Currently implemented.** A real approved logo renders above factual text with contained natural-ratio delivery. Select it only when the logo is available and has usage rights.

### Icon-supported recognition cards

**Currently implemented.** A decorative icon renders when no logo is selected and the appropriate icon is not `none`. It is not a substitute for real evidence.

### Text-led list, compact trust row, detailed verification cards, and mixed recognition grid

**Target behavior, not distinct current schema variants.** The source brief supports concise factual evidence, but the audited schema has one responsive grid with shared card markup. A future visual variant must be backed by implementation evidence, a stable setting, and proof that it does not weaken recognition context.

## Supported States

- **Fully configured:** one or more verified recognition blocks render server-side.
- **Partially configured:** optional logo, year, detail, or link may be absent; missing title or unsupported evidence blocks publication or requires omission.
- **No verified records:** omit the section. The current design-mode empty prompt is authoring guidance, not a storefront state.
- **Verification link unavailable:** render the factual text only if the recognition remains verified; do not invent a destination.
- **Expired, revoked, or inaccessible record:** remove or mark the entry unavailable through a future evidence workflow; never render it as current proof.
- **No logo:** render the text and, where appropriate, a decorative icon without pretending it is an issuer mark.
- **Localized or RTL:** preserve title/issuer meaning, source order, and accessible link labels; dates must remain factual.
- **Reduced motion and no JavaScript:** the static list and links remain usable.
- **Theme Editor:** Shopify attributes support block editing and selection; no controller state exists.

Loading, automatic validation, commerce status, checkout trust, customer-specific status, and integration errors do not belong to this section.

## Theme Editor Settings

**Currently implemented section settings:** `eyebrow`, `heading`, `text`, `heading_size`, `text_alignment`, `columns_desktop`, `columns_mobile`, `color_scheme`, and desktop/mobile top and bottom spacing.

**Currently implemented block settings:** `logo`, `award_icon`, `heading`, `issuer`, `year`, `text`, `verification_link`, and `verification_label` for both `award` and `certification` blocks. The section has one mixed preset and supports no app blocks.

Merchants may add, remove, reorder, and duplicate recognition blocks within the schema limit. They must use the correct semantic block type and supply only verified evidence. The design system controls typography, grid spacing, image containment, colour/tokens, focus, interaction, semantic hierarchy, breakpoints, and motion.

No section-specific JavaScript lifecycle is currently implemented. If a future enhancement is added, Shopify section load/unload, select/deselect, block select/deselect, reorder, setting refresh, and duplicate initialization must be safe. Listeners, timers, media hooks, and observers must be cleaned up on unload. JavaScript must never be required to reveal the evidence or operate a verification link.

## Responsive Behaviour

The section is mobile-first and must work from 320 px. Current CSS uses one or two mobile columns and two, three, or four columns at `48rem` and above. Recognition cards use token-based padding and natural, contained logo media. Long issuer names, translations, and verification labels must wrap without clipping or horizontal scrolling.

At browser zoom, large-text settings, and narrow devices, the grid may stack rather than compress logo, title, issuer, or link below readable size. Logical properties must preserve RTL behavior. The visible source order remains the accessible reading order. Verification links retain touch-safe space and visible focus.

## Accessibility

The target is WCAG 2.2 AA.

- The section uses an H2 heading when supplied and must never take the page H1.
- Current `role="list"`, list items, article grouping, and H3 block titles provide a clear hierarchy when complete content exists.
- A logo-only card is not sufficient: nearby text identifies the recognition and issuer. Empty logo alternative text is valid only where that nearby text is complete.
- Icons are decorative and must not be the only evidence, label, or status of recognition.
- Verification links must have a visible descriptive label, logical focus order, keyboard operation, visible focus, sufficient contrast, and safe external-link treatment through the shared Button contract.
- Year/date information must not be communicated by colour, placement, or logo alone.
- No hover-only, motion-only, JavaScript-only, or visual-status-only meaning is permitted. Reading order, large text, zoom, RTL, and reduced motion must remain safe.

## SEO and Structured Data

The section may contribute truthful, indexable recognition content. It owns no page-level metadata, canonical URLs, Open Graph output, Organization schema, Product schema, Review schema, award schema, certification schema, Article schema, BreadcrumbList, or WebPage schema.

A logo, issuer, or certification word does not authorize structured data. Any future Organization or certification-related structured data requires centralized ownership, verified evidence, and an explicit implementation contract. Do not manufacture external endorsement, review, or quality schema. Use H2/H3 hierarchy and descriptive verification links without keyword repetition or duplicate entries.

## Performance Rules

The current section is server-rendered with no section-specific JavaScript. It must remain low cost:

- use Shopify-responsive, natural-ratio, contained logo images with lazy loading;
- do not eager-load or assign high fetch priority to a lower-page trust region;
- preserve card geometry when logo assets differ in size;
- reuse the global brand-storytelling stylesheet and shared primitives;
- avoid remote logo scripts, verification widgets, polling, carousels, video, and third-party badge providers; and
- maintain stable rendering through Theme Editor edits and no-JavaScript storefront access.

## Motion Rules

No motion is currently implemented or required. Recognition content is visible immediately.

Future motion may use only a subtle nonessential transition that does not create urgency, prestige, validation, or a false active state. It must honor `prefers-reduced-motion`; pulsing badges, celebratory animation, flashing logos, auto-scrolling proof, and delayed content are prohibited.

## AI Guidelines

AI may include Awards and Certifications only when verified recognition records exist with sufficient merchant-approved textual evidence. It must use exactly the audited `award` and `certification` block types and stable setting IDs.

AI selects deterministically:

- `award` for an actual verified award, membership, standard, or press-recognition record that the merchant classifies appropriately;
- `certification` only for a verified certification record;
- one responsive grid for multiple comparable records, with the documented desktop/mobile columns based on record count and text length;
- logo-supported presentation only for an approved, rights-cleared logo; otherwise factual text or the implemented decorative icon fallback;
- one instance after values, commitments, material/process evidence, or sustainability evidence, and before a verified closing continuation where appropriate.

AI must never invent recognition, issuer, title, date, status, logo, membership, certification, press coverage, standards compliance, verification link, legal meaning, prestige, or CTA. It must omit the entire section when evidence is absent, stale, expired, revoked, inaccessible, or not merchant-approved. It must not duplicate generic Trust Badge, testimonials, Sustainability, or other proof sections.

## Implementation Audit

### Source evidence inspected

- **Currently implemented:** `docs/sections/awards-certifications.md` defines verified awards, memberships, press recognition, standards, certifications, two block types, optional visible verification links, lazy logos, no JavaScript, and recommended placement after commitments/values before a closing CTA.
- **Currently implemented:** `docs/sections/brand-storytelling-pack.md` identifies Awards and Certifications as merchant-only brand-storytelling content.
- **Currently implemented:** `config/calinium-section-manifest.json` marks this section merchant-only, auto-add-unsafe, merchant-verification-before-publish, low media priority, and limited to one instance per template.

### Runtime evidence inspected

- **Currently implemented:** `apps/theme/sections/awards-certifications.liquid` supplies `award` and `certification` blocks, a maximum of twelve blocks, a mixed preset, listed settings, H2 section heading, list/article semantics, conditional logo/icon, and conditional verification link.
- **Currently implemented:** the two block types use the same Liquid structural markup but distinct block names and icon defaults/options.
- **Currently implemented:** `apps/theme/assets/section-brand-storytelling-pack.css`, globally loaded by `apps/theme/layout/theme.liquid`, provides responsive grid, card, logo containment, icon, and muted metadata styles.
- **Currently implemented:** `snippets/section-heading.liquid`, `responsive-image.liquid`, `icon.liquid`, `button.liquid`, and `section-spacing.liquid` render current primitives.
- **Currently implemented:** localization exists in `apps/theme/locales/en.default.schema.json` and `apps/theme/locales/en.default.json`; `config/theme-section-capabilities.json` records both blocks, preset, layouts, and no app blocks.
- **Currently implemented:** no audited JSON template assigns this section and no section-specific JavaScript reference was found.

### Accessibility, SEO, and performance evidence

- **Currently implemented:** H2/H3, list/article semantics, decorative icon handling, empty logo alternative text, lazy responsive contained logos, and no-JavaScript evidence rendering.
- **Partially implemented:** verification links need both a label and URL before rendering, but the implementation does not independently validate issuer, status, logo rights, or external destination truth. It also relies on nearby text to make the empty logo alternative text appropriate.
- **Currently implemented:** no independent structured data is emitted. The audited global layout conditionally emits Product or Article schema only.

### Current gaps

- **Not implemented:** durable recognition-evidence validation, expiry/revocation state, logo-rights validation, page-eligibility enforcement, duplicate-proof prevention, and formal canonical block documentation.
- **Not implemented:** separate rendering differentiation between award and certification blocks beyond semantic type and icons, section-specific lifecycle tests, or a documented current external-link target convention.
- **Unknown:** current merchant records, recognition accuracy, active status, logo permissions, and verification-link availability; these must be supplied by the merchant.

No founder decision is required for this specification. A future decision is necessary only if the product should introduce an evidence-verification workflow, a new detailed-card layout, or a new standardized external-link policy.

## Quality Checklist

- [x] A distinct verified-recognition responsibility and strict proof boundary are documented.
- [x] Both exact current block types, shared structure, fields, maximum, preset, and no-app-block posture are recorded.
- [x] Real evidence, active status, logo rights, issuer, and verification links are required; no recognition is fabricated.
- [x] Valid/prohibited pages, one-instance rule, ordering, page-H1 boundary, and no-JavaScript operation are explicit.
- [x] Logo text equivalence, visible verification links, WCAG 2.2 AA, 320 px, RTL, motion, SEO, and performance rules are defined.
- [x] Current implementation, target behavior, gaps, and merchant-dependent unknowns are separated.
- [x] AI uses verified evidence or omits the section; it cannot convert a generic badge into proof.

## Future Compatibility

This specification preserves the stable `award` and `certification` block types and their existing setting IDs. Future work may add a verified evidence lifecycle, formal block specifications, explicit logo-rights checks, and an implementation-backed detailed recognition layout only after evidence and schema review.

No future change may turn this section into an unverified trust strip, a review component, a generic social-proof surface, or an automatic claim generator. New settings, block types, structured data, external integrations, automatic placement, link behavior, or motion require a separate backward-compatible implementation audit, documentation-governance update, and deterministic AI rule.
