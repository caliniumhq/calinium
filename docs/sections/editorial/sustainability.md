# Sustainability

## Purpose

Sustainability is a verification-only editorial section for merchant-approved environmental initiatives, sourcing practices, material-lifecycle information, waste-reduction practice, repair or longevity programmes, packaging practice, production-impact initiatives, measurable commitments, and sustainability-relevant credentials. It gives customers factual context without converting brand values, material images, or generic ethical positioning into environmental achievements.

**Currently implemented:** `sustainability` is a server-rendered Shopify OS 2.0 section with separate initiative, metric, and certification block renderers, a verification note, optional CTA, and no section-specific JavaScript.

## Customer Goals

Customers should be able to read only specific claims the merchant can support, distinguish explanatory text from a metric or credential reference, and continue to one real destination when provided. They must not be pressured by implied urgency, decorative green imagery, unsupported badges, fabricated progress, or unmeasured environmental benefit.

## Merchant Goals

Merchants should be able to publish approved initiatives, metrics, and relevant credentials in a restrained layout; add a truthful verification note; and omit a block or field when its basis is unknown. They do not configure legal compliance, automatic impact calculation, data provenance, certification verification, external reporting links, or a broad ethical brand position through this section.

## Shopify Context

The stable runtime ID is `sustainability`, implemented by `apps/theme/sections/sustainability.liquid`. Its schema has a section-wide `max_blocks: 12` and three block types: `initiative` (limit 8), `metric` (limit 4), and `certification` (limit 4). The preset creates two `initiative` blocks. The audited schema has no `enabled_on` restriction and no app-block support.

No audited JSON template directly assigns Sustainability. It appears in the section manifest, capability catalog, safe-default/content-classification catalogs, and brand-storytelling validation scope. Manifest evidence recommends one merchant-verified instance in lower Homepage or Standard/About Page composition after Materials or Manufacturing Process and before Awards and Certifications or Newsletter. Technical Theme Editor availability is not permission to assert a claim.

Canonical contexts are Standard Page sustainability or sourcing content, Homepage only when verified evidence is concise and relevant, and Product Page only when the claim applies directly to that product and does not replace product data. It is not an ordinary section for Collection, Search, Collection List, Cart, Contact, Blog listing, Article, 404, account, checkout, or global shell surfaces. No direct JSON-template assignment has been audited.

## Responsibilities

Sustainability owns:

- local heading, explanatory text, and an optional truthful verification note;
- an ordered visual grouping of approved initiatives;
- bounded metric presentation where a real value, label, and explanation are available;
- sustainability-relevant credential presentation only within its local claim context;
- one optional verified continuation; and
- local responsive composition, static empty-state guidance, and no-JavaScript rendering.

It owns presentation of approved information, not the evidence store, certification verification, reporting calculation, or legal assessment behind it.

## Boundaries

Sustainability does not own broad Brand Values, generic material education, Manufacturing Process sequence, Craftsmanship narrative, biographies, company history, product purchase architecture, legal compliance promises, or unverified environmental benefits.

Materials owns factual composition/origin information; Craftsmanship owns skill evidence; Manufacturing Process owns ordered stages; and Behind the Scenes owns observational media. Sustainability may reference a verified certification only when it directly supports a sustainability claim and the current block model can present it accurately. Awards and Certifications remains the canonical owner of credential display, verification architecture, and general recognition. Do not duplicate certification galleries or turn a sustainability reference into a general proof system.

## Section Structure

```text
Sustainability
├── Optional Section Heading (H2)
│   ├── Optional eyebrow
│   ├── Heading and supporting text
│   ├── Optional verification note
│   └── Optional CTA only when label and destination exist
├── Initiative list when `initiative` blocks exist
│   └── initiative → image or decorative icon, H3, text, optional text reference
├── Metric grid when `metric` blocks exist
│   └── metric → optional icon, value, label, optional description
├── Certification cards when `certification` blocks exist
│   └── certification → optional logo, H3, issuer text, supporting text
└── Design-mode-only empty guidance when no blocks exist
```

**Currently implemented:** the Liquid groups blocks by type before rendering. Initiatives use a `role="list"` wrapper and `feature-item`; metrics use the `statistic` primitive; certifications use `logo-item`, an optional H3, and rich text. `certification_reference` is text, not a link. The current schema has no source, URL, date, reporting period, unit, progress value, disclaimer, evidence attachment, or claim-expiry field.

## Required Blocks

No block type is schema-required, but a live canonical Sustainability section requires at least one approved, sufficiently specific block. Use only one evidence category when it makes the claim clearer; mix categories only when their relationship is factual and non-duplicative.

- `initiative`: maximum eight; stable settings are `initiative_icon`, `image`, `heading`, `text`, and `certification_reference`.
- `metric`: maximum four; stable settings are `value`, `label`, `description`, and `metric_icon`.
- `certification`: maximum four; stable settings are `logo`, `heading`, `issuer`, and `text`.

The aggregate Shopify limit is twelve blocks. Canonical generation omits a sparse or unsupported block rather than using a generic environmental statement to fill it.

## Optional Blocks

All three implemented block types are optional. A claim does not require a metric; a metric does not imply a certification; and a certification block does not establish a verified certification without merchant evidence. Media, icon, explanatory text, issuer, reference, and description are optional block fields, not independent blocks.

Do not add progress, report, source-link, date, unit, policy, product, award, testimonial, map, video, or arbitrary evidence blocks without a separate schema, legal/content-governance, and accessibility audit.

## Block Composition

Blocks are addable, removable, duplicable, and reorderable in Shopify within the section and per-type limits. The Liquid outputs groups in fixed type order—initiatives, then metrics, then certifications—not the merchant’s interleaved Theme Editor order. This order must not imply evidence priority, chronology, or a causal relationship.

Use one Sustainability instance per template and page. It normally follows Materials or Manufacturing Process and precedes a restrained Awards and Certifications or Newsletter continuation. Do not put it adjacent to a second Sustainability section, a generic values statement that repeats the same claim, or a certification gallery that duplicates its entries. Omit it completely when approved operational evidence is unavailable.

## Component Dependencies

The audited runtime composes `Section Heading`, `Rich Text`, `Button`, `Icon System`, `feature-item`, `statistic`, `logo-item`, `Responsive Image`, `section-spacing`, and global `section-brand-storytelling-pack.css`.

Initiative images flow through `feature-item` and Responsive Image. Metrics use `statistic`’s `<dl>` structure. Certification logos use `logo-item` with an issuer passed as the company name, but no URL is supplied to that primitive. These dependencies control their own semantics and rendering; Sustainability owns only truthful grouping and claim boundaries. No Video, controller, external service, or calculation engine is implemented.

## Content Rules

Every initiative, practice, metric, value, label, reporting statement, issuer, credential reference, logo, quotation, CTA label, and CTA destination requires merchant-approved evidence appropriate to that wording. `verification_note` may explain an approved limitation or context; it cannot stand in for source data, legal advice, certification proof, or a public report.

Never casually claim that a merchant or product is sustainable, eco-friendly, ethical, carbon neutral, climate positive, zero waste, biodegradable, recyclable, recycled, responsibly sourced, organic, cruelty-free, fair trade, locally sourced, low impact, non-toxic, regenerative, or plastic-free. Each term may appear only when approved evidence supports the exact claim in its applicable market and product context. This specification creates no legal-compliance standard.

Do not transform a target, aspiration, value, material name, image, icon, supplier statement, or product description into an achievement. Do not state a number without its verified meaning. Because the schema has no source, unit, date/reporting period, calculation method, evidence URL, or disclaimer field, omit metrics and claims that cannot remain clear and accurate with the available `value`, `label`, and `description` fields.

## Asset Requirements

`initiative.image` and `certification.logo` are optional. Each must be a rights-cleared, merchant-approved asset that truthfully supports its adjacent block; initiative media is responsive/lazy through `feature-item`, while logos are responsive/lazy through `logo-item`. `initiative_icon` and `metric_icon` are decorative cues and cannot prove a claim.

Informative images need accurate alternatives through the source asset. A certification logo is not enough by itself: visible issuer and credential text must provide meaning. Do not use green imagery, stock landscapes, generated seals, recycled-symbol icons, supplier marks, or unverified logos as proof. There is no video, poster, or external-media setting in the current section.

## Supported Variants

- **Initiatives:** **Currently implemented** when at least one `initiative` block exists; it uses responsive media or a decorative icon with text.
- **Metrics:** **Currently implemented** when at least one `metric` block exists; it uses the shared statistic primitive but has no live unit/date/source field.
- **Certification context:** **Currently implemented** when at least one `certification` block exists; it renders a local logo/issuer/detail card without a verification link.
- **Mixed evidence:** **Currently implemented** when multiple valid block groups exist; fixed grouping order remains initiatives, metrics, certifications.
- **Text-led initiative:** **Currently implemented** when initiative media is absent and approved heading/text exists.

There is no implemented progress bar, calculated impact, reporting timeline, filter, carousel, external evidence-link, video, interactive certification verifier, or automatic claim-expiration variant.

## Supported States

- **Fully configured:** one or more approved blocks render server-side with a truthful local heading/context.
- **Initiative-only, metric-only, or certification-context-only:** valid when the selected category has adequate approved evidence.
- **Mixed blocks:** valid when each group is independently supported and non-duplicative.
- **Sparse block:** current primitives omit much empty content but the schema does not validate evidence completeness; canonical generation omits unsupported blocks.
- **No blocks:** only Theme Editor design mode renders the localized empty guidance; storefront output does not fabricate a fallback.
- **Optional verification note or CTA absent:** each omits cleanly; CTA needs both `button_label` and `button_link`.
- **No JavaScript / reduced motion:** all existing content is server-rendered and usable; no local interaction or motion is required.
- **Evidence unavailable, expired, or uncertain:** target governance omits the field/section; the current runtime has no expiry/status model.

## Theme Editor Settings

**Stable section settings, types, defaults, and dependencies:**

- `eyebrow` (`text`) defaults blank; `heading` (`inline_richtext`) defaults `Our commitments`; `text` (`richtext`) and `verification_note` (`textarea`) default blank.
- `button_label` (`text`) and `button_link` (`url`) default blank and render the secondary Button only as a complete pair.
- `heading_size` (`select`) defaults `large`, with `small`, `standard`, and `large`; `text_alignment` (`select`) defaults `left`, with `left` and `center`.
- `color_scheme` (`color_scheme`) defaults `scheme-1`.
- `padding_top` and `padding_bottom` are desktop range settings from 0–160 px in 4 px steps, default 80; `mobile_padding_top` and `mobile_padding_bottom` are mobile ranges from 0–120 px in 4 px steps, default 48.

**Stable block contracts:**

- `initiative` (limit 8): `initiative_icon` (`select`, default `leaf`; `leaf`, `recycle`, `globe`, `heart`), `image` (`image_picker`), `heading` (`inline_richtext`), `text` (`richtext`), `certification_reference` (`text`).
- `metric` (limit 4): `value` (`text`), `label` (`text`), `description` (`textarea`), `metric_icon` (`select`, default `leaf`; `leaf`, `recycle`, `globe`).
- `certification` (limit 4): `logo` (`image_picker`), `heading` (`inline_richtext`), `issuer` (`text`), `text` (`richtext`).

The aggregate `max_blocks` limit is 12. No app blocks, dynamic sources, evidence link, block-select controller, request, observer, or custom section-load/unload behavior is implemented. Shopify editing identity is provided through `block.shopify_attributes`. Any future enhancement must preserve server rendering, initialize safely on Theme Editor lifecycle events, and clean up listeners/observers on unload.

## Responsive Behaviour

The current CSS is mobile-first. Initiative, metric, and certification groups begin as two-column grids and become three columns at 48rem; the outer layout remains a stacked grid with token spacing. Optional initiative media uses landscape Responsive Image delivery; certification logos use natural contained logo delivery. The section has no carousel or touch-specific scripted behavior.

At 320 px, long translated sustainability terms, metric values, issuer names, and CTA labels need manual verification for wrapping and readable two-column density. At 200%/400% zoom, content may grow vertically but must not clip or create page-level overflow. Logical CSS supports RTL, but complete RTL, zoom, screen-reader, localized-term, and manual storefront QA is **Unknown**.

## Accessibility

The target is WCAG 2.2 AA. The local Section Heading is H2; initiative and certification headings are H3 when nonblank. Initiatives use list semantics. Metrics use the shared `<dl>` statistic primitive; its value/label/description must be meaningful without an icon. Certification logos must not be the only accessible identification; issuer and credential text are required for a live evidence claim.

Images require truthful alternatives when informative and empty alternatives when decorative. Icons are decorative and cannot convey claim status. No video, audio, carousel, or keyboard controller exists. CTA links need visible labels, keyboard access, focus visibility, contrast, touch-safe sizing, and real destinations. Verify screen-reader grouping, long metric values, zoom, RTL, and colour contrast manually. Do not claim captions, transcripts, evidence links, or certification verification are implemented.

## SEO and Structured Data

Sustainability may contribute truthful indexable explanatory text but owns no page title, meta description, canonical URL, primary H1, Organization, Product, Article, Certification, Review, Person, WebPage, or sustainability-specific structured data. It must not emit schema based on a badge, metric, logo, or unverified term.

Page-level SEO and schema belong to the relevant Page Specification and centralized runtime. Do not use environmental terminology merely to attract search traffic, duplicate claims across pages, hide claim text, or imply a third-party credential through a logo.

## Performance Rules

The section is server-rendered with no local JavaScript, endpoint, polling, timer, observer, or calculation. Initiative images and certification logos are responsive/lazy; lower-page evidence media must not be eager or high-priority without a page-level LCP reason. There is no video/poster cost in the current schema.

Keep initiatives, metrics, and certification context within their 8/4/4 and aggregate-12 limits. Avoid duplicate logo/image use across Sustainability and Awards and Certifications, preserve selected image geometry, and do not introduce external report embeds, animated progress, automatic measurement, or hidden-section preloads. Static content remains useful without JavaScript.

## Motion Rules

No section-specific animation, transition, autoplay, carousel, timer, or controller is implemented. No progress value is animated because the runtime does not have a progress model. Motion cannot imply improvement, certification status, or measurable impact. Any future motion must be optional, restrained, reduced-motion-safe, and never delay or alter factual reading.

## AI Guidelines

AI may select Sustainability only when a permitted page has merchant-approved operational evidence that fits the existing initiative, metric, or certification-context fields. It must preserve factual wording, omit unknown facts, use only approved assets, retain the section’s fixed group order, and omit the section when evidence cannot be stated accurately.

AI must never invent environmental benefit, ethical sourcing, recyclability, reduced emissions, carbon neutrality, certification, recycled content, biodegradability, sourcing details, artisan/labour claims, factory locations, metrics, dates, reporting periods, units, sources, quotes, logos, credentials, links, or CTA destinations. It must not turn values, aspirations, product description, imagery, or Materials/Craftsmanship/Manufacturing Process content into sustainability evidence.

## Implementation Audit

**Source evidence inspected:** `docs/sections/sustainability.md` and `brand-storytelling-pack.md`; Materials, Manufacturing Process, Behind the Scenes, Brand Values, Brand Manifesto, and Awards and Certifications were inspected only as canonical boundaries.

**Runtime evidence inspected:** `apps/theme/sections/sustainability.liquid` schema/preset; Section Heading, Rich Text, Button, Icon, Responsive Image, `feature-item`, `statistic`, `logo-item`, and section-spacing snippets; `section-brand-storytelling-pack.css`; localization; section manifest; capability, safe-default, and content-classification catalogs; audited template assignments; and `validate-brand-storytelling-pack.js`.

**Currently implemented:** the exact static schema contract, fixed grouped rendering, verification-note/CTA pair, responsive/lazy initiative and logo media, design-mode empty prompt, and no local JavaScript. **Partially implemented:** sparse blocks can leave empty group wrappers; `metric` fields have no inherent unit/source/date meaning; certification cards are presentational rather than independently verified. **Not implemented:** source/provenance, metric unit/date/reporting period, evidence URLs, disclaimer, certificate status/expiry, validation, claim expiration, external reporting, video, app blocks, direct template assignment, or dedicated lifecycle tests. **Unknown:** merchant evidence, legal suitability, logo rights, source accuracy, localization, RTL/zoom, and manual accessibility QA.

## Quality Checklist

- [x] Uses exactly one H1 and the 25 canonical H2 headings in order.
- [x] Documents every live section/block ID, type, default, dependency, block limit, aggregate limit, and preset.
- [x] Keeps Sustainability verification-only and separate from Values, Materials, Craftsmanship, Manufacturing Process, and Awards and Certifications.
- [x] Requires evidence for every initiative, metric, credential reference, asset, note, and CTA.
- [x] Prohibits unsupported environmental, ethical, sourcing, certification, and impact language.
- [x] Preserves H2/H3/list/definition-list semantics, responsive media, static fallback, restrained motion, and no-JavaScript use.

## Future Compatibility

Preserve the `sustainability` runtime ID; `initiative`, `metric`, and `certification` types; all listed stable IDs; 8/4/4 and aggregate-12 limits; two-initiative preset; fixed group order; and static no-JavaScript output. Future work may add stronger evidence/provenance fields, dated reports, units, reporting periods, approved source links, certificate references/expiry, accessible video transcripts, authoring warnings, claim validation, and generator-level truth checks only through backward-compatible migrations.

Future work must not redefine Awards and Certifications credential ownership or turn Sustainability into a generic value statement, materials catalogue, manufacturing workflow, or legal-compliance system.
