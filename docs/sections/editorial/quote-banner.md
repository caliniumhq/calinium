# Quote Banner

## Purpose

Quote Banner is Calinium’s bounded editorial emphasis region for one approved direct quotation or one clearly identified approved brand assertion. It gives that single statement quiet typographic space without becoming a testimonial system, review surface, Brand Manifesto, founder biography, proof gallery, or product-claim component.

**Current implementation:** `apps/theme/sections/quote-banner.liquid` renders the `quote-banner` Shopify section with no blocks and no section-specific JavaScript.

## Customer Goals

Customers should be able to read one clear, accurately attributed statement in normal source order, distinguish it from a review system or product promise, and continue without animation, carousel behavior, or a hidden interaction.

## Merchant Goals

Merchants should be able to present one verified statement, optional attribution and role, an approved supporting image, a restrained decorative icon, and local width/alignment treatment. They do not configure ratings, customer-review aggregation, schema, multiple rotating quotes, quote-source links, or unverified proof.

## Shopify Context

The runtime section ID is `quote-banner`; its implementation is `apps/theme/sections/quote-banner.liquid`. It has no block types, no `max_blocks`, and the localized preset `t:sections.quote_banner.preset`.

The current canonical Homepage, Standard Page, Blog, Article, and Collection JSON templates have no direct Quote Banner assignment. Capability, safe-default, and content-classification catalogs contain this section’s stable IDs; no strategy-section-mapping entry currently names it.

Canonical contexts are Homepage after primary orientation, a Standard Page with an approved editorial statement, or an Article where the quotation is relevant to the body. It is not an ordinary Collection, Product, Blog-index, Cart, Search, Contact, 404, account, checkout, or global-shell region. It must not substitute for verified awards, testimonials, reviews, product evidence, or required policy content.

## Responsibilities

Quote Banner owns one statement, its local visual hierarchy, optional attribution and role, optional supporting image, decorative quote mark/icon treatment, and local width/alignment/entrance setting. It does not own whether a claim is true: merchant evidence remains authoritative.

## Boundaries

It does not own testimonial collection, review aggregation, social proof systems, founder biography, Brand Manifesto, long-form content, awards, certifications, product claims, customer-review schema, aggregate ratings, a carousel, a call to action, or a source-link model.

Founder Story owns approved founder context; Brand Manifesto owns sustained philosophy; Awards and Certifications owns verifiable credentials. Quote Banner is one approved statement only.

## Section Structure

```text
Quote Banner
└── Local content wrapper
    ├── optional decorative icon
    ├── optional decorative quotation mark
    ├── optional blockquote text
    ├── optional cite → attribution and optional role
    └── optional Responsive Image
```

**Current implementation:** the decorative icon is rendered through `icon` with `decorative: true`; the quotation mark is `aria-hidden`. `quote` renders in a `blockquote` when nonblank. `cite` renders only when `attribution` or `role` is nonblank. The optional image uses `attribution` as its explicit `alt` value. There is no heading, CTA, customer empty state, or Theme Editor empty-state placeholder.

When no approved `quote` or approved assertion exists, canonical composition must omit this section. The schema’s default sentence is an implementation starter value, not merchant evidence and not approved publishable quote content.

## Required Blocks

No block type is implemented. Quote Banner has no repeatable content model, no `max_blocks`, and must not be treated as a one-block carousel or testimonial list.

## Optional Blocks

No optional block type is implemented. `quote`, `attribution`, `role`, `image`, `quote_icon`, and all presentation controls are section settings, not quote, testimonial, image, author, CTA, or review blocks.

## Block Composition

The section has no blocks. Use one Quote Banner instance per page by default and normally only one statement. Place it after related factual context and before a distinct continuation, never directly after a testimonial/review region or beside another quotation treatment merely to create emphasis.

On a Homepage it follows orientation or approved story/proof; on an Article it follows or interrupts a directly relevant passage only when the quotation remains meaningful in context. It must not displace the page’s H1, primary commerce, main body, or required product/collection systems.

## Component Dependencies

**Currently implemented:** `Responsive Image`, `Icon System`, `section-spacing`, `component-image.css`, and shared editorial-pack CSS. The section uses native `blockquote` and `cite` semantics. It does not render Section Heading, Rich Text, Button, Product Card, review component, carousel, controller, observer, request, or source-link helper.

## Content Rules

The acceptable semantic categories are governed by evidence, not schema labels:

- **Direct quotation:** exact approved wording and verified speaker/source are required.
- **Approved brand assertion:** must be expressly approved as a statement; it must not be presented as a customer, press, or founder quotation.
- **Customer, press, or founder quotation:** may appear only with verified wording, identity/publication permissions, and attribution appropriate to that source.
- **Unattributed assertion:** may appear only as a merchant-approved brand statement, never as an implied testimonial or third-party endorsement.

`quote` stores the displayed statement; `attribution` and `role` render visible citation text. The current schema has no date, source URL, publication, customer identity, verification record, or quote-type setting. Do not invent any of those facts, and do not use a role label to imply a source that cannot be confirmed.

## Asset Requirements

`image` is optional and uses Responsive Image with lazy loading, square ratio, `sizes: 160px`, and widths `96, 160, 240`. The current render passes `attribution` as the image alternative; if attribution is blank, the image alternative is blank. Use an image only when it is approved, rights-cleared, and the attribution accurately supplies its meaningful alternative text. Otherwise omit it rather than implying an unverified portrait or source.

`quote_icon` is limited to `none`, `sparkle`, `diamond`, `crown`, `star`, `leaf`, `globe`, or `verified` and is decorative only. The quotation mark is likewise decorative. Neither may imply certification, award, environmental status, customer verification, or legal proof.

## Supported Variants

- **Centered or left-aligned statement:** **Currently implemented** through `text_alignment`.
- **Narrow or wide reading measure:** **Currently implemented** through `content_width`.
- **With or without approved supporting image:** **Currently implemented** through `image`.
- **With or without decorative icon/quotation mark:** **Currently implemented** through `quote_icon` and `show_quote_mark`.
- **Restrained entrance:** **Currently implemented** through `enable_animation`, only when `prefers-reduced-motion: no-preference` matches.

There is no quote carousel, testimonial list, rating, source link, press-card, background-video, or CTA variant.

## Supported States

**Currently implemented:** statement with or without citation, role, image, icon, quotation mark, local alignment, content width, color scheme, and optional reduced-motion-respecting entrance. It also renders a shell if settings are blank.

**Implementation gap:** no schema-level statement type or evidence field, no source URL/date, no quote validation, no customer-facing empty state, and no duplicate-quote detection exist. The implementation cannot distinguish a direct quote from a brand assertion; merchant governance and generation must do so.

## Theme Editor Settings

All current stable section setting IDs are listed below. There are no blocks and no `visible_if` schema dependencies.

| ID | Type and verified default | Meaning |
| --- | --- | --- |
| `quote` | `textarea`; `A clear statement can give a page its point of view.` | Displayed statement; default is starter copy, not merchant truth. |
| `attribution` | `text`; blank | Visible citation and current image-alt source. |
| `role` | `text`; blank | Optional visible citation role/source line. |
| `image` | `image_picker`; blank | Optional square supporting image. |
| `quote_icon` | `select`; `none` | Decorative `none`, `sparkle`, `diamond`, `crown`, `star`, `leaf`, `globe`, or `verified` icon. |
| `show_quote_mark` | `checkbox`; `true` | Shows decorative `aria-hidden` quote mark. |
| `text_alignment` | `select`; `center` | `left` or `center` alignment. |
| `content_width` | `select`; `narrow` | `narrow` or `wide` reading measure. |
| `enable_animation` | `checkbox`; `false` | Adds the CSS entrance class; motion still respects reduced motion. |
| `color_scheme` | `color_scheme`; `scheme-1` | Approved local color scheme. |
| `padding_top`, `padding_bottom` | `range`; `80`; 0–160px in steps of 4 | Desktop spacing. |
| `mobile_padding_top`, `mobile_padding_bottom` | `range`; `48`; 0–120px in steps of 4 | Mobile spacing. |

The Theme Editor can add, remove, duplicate, reorder, and disable the section as a whole. It has no blocks. No scoped JavaScript, listener, timer, observer, or media session is initialized, so section load, unload, select, and deselect do not require local cleanup. No design-mode placeholder or authoring warning exists; merchants must review blank and starter-copy states.

## Responsive Behaviour

The current CSS keeps the content width within the page gutters, applies narrow/wide max width, stacks the content in normal source order, and constrains the image to 10rem. It uses logical `inline-size` and spacing variables; no mobile-specific image setting, viewport motion, or horizontal layout is implemented.

At 320px, browser zoom, long translated statements, long attribution, and RTL, the statement and citation must remain readable without clipping. Section-specific RTL and large-text tests are not present in the audited evidence and require manual QA. Long statements should be moved to a more appropriate long-form editorial region.

## Accessibility

The current implementation uses `blockquote` for nonblank statement text and `cite` for nonblank attribution/role. Decorative icon and quotation mark are hidden from assistive technologies. The optional image alternative is currently based on `attribution`, which is suitable only when that text accurately names the pictured person or source.

Do not rely on typography, icon, color, or quotation marks to establish source truth. Preserve normal reading order, adequate contrast, visible shared focus for surrounding links, touch-safe controls where the Theme Editor provides them, and readable 200%/400% zoom and RTL. There is no interactive control, live region, autoplay, or keyboard controller. The absence of an image must not remove the statement’s meaning.

## SEO and Structured Data

Quote Banner owns no page title, meta description, canonical URL, page H1, Product, Article, Organization, Review, AggregateRating, testimonial, or quotation structured data. It must not emit review semantics merely because a statement has an attribution, nor create external authority through a decorative icon or image.

Visible quote text must remain truthful, concise, and non-keyword-stuffed. The relevant Page Specification owns page-level SEO and structured data.

## Performance Rules

Quote Banner is server-rendered, has no blocks or JavaScript, and uses one optional lazy-loaded small Responsive Image. The optional CSS entrance is stylesheet-only. Do not load a large portrait merely for decoration, use it as a hidden LCP asset, or duplicate the same source image across adjacent story sections.

The section has no video, carousel, hidden content, fetch, polling, or controller cleanup cost. Verify image dimensions and layout stability when an image is selected.

## Motion Rules

When `enable_animation` is true, shared editorial-pack CSS applies a single opacity/translate entrance only under `prefers-reduced-motion: no-preference`. With reduced motion, the content is immediately visible. No autoplay, pulse, marquee, shake, rotating quote, or scripted motion is implemented or permitted.

## AI Guidelines

AI may select Quote Banner only when one approved statement has a verified source context or is explicitly approved as a merchant brand assertion. It must preserve direct quotations exactly, set attribution and role only from approved facts, and omit the section when evidence is unavailable. It should prefer a related factual source section where a quote alone could mislead.

AI must never invent, paraphrase as a quote, strengthen, or misattribute quote text; invent speakers, titles, publications, dates, customer identities, images, certification, testimonials, ratings, or endorsements; or use icons to imply proof. It must not convert product copy, a review, a founder biography, or a generic marketing assertion into a quote.

## Implementation Audit

- **Source brief inspected:** `docs/sections/quote-banner.md`.
- **Current implementation:** `apps/theme/sections/quote-banner.liquid`; no blocks, one preset, and all 14 stable setting IDs recorded above.
- **Dependencies inspected:** `responsive-image.liquid`, `icon` rendering, `section-spacing.liquid`, `component-image.css`, and `section-editorial-pack.css`.
- **JavaScript and lifecycle:** no Quote Banner controller or matching section lifecycle listener is present; all behavior is server-rendered/CSS-only.
- **Page/template evidence:** no direct canonical JSON-template assignment; capability, safe-default, and content-classification catalogs record the section. No strategy mapping currently references it.
- **Test evidence:** `scripts/validate-editorial-hero-pack.js` validates its schema, translations, IDs, preset, assets, and snippets. No focused test validates quote provenance, citation semantics, starter-copy omission, image alternative accuracy, or reduced-motion manual behavior.
- **Implementation gaps:** no evidence/source schema, type discriminator, source link, customer empty state, validation, or duplicate detection; blank settings can render a shell.

## Quality Checklist

- One `quote-banner` owner at `editorial/quote-banner.md`; no testimonial or review owner is duplicated.
- All 14 stable setting IDs are documented; no nonexistent blocks or CTAs are claimed.
- Exactly one approved statement is shown, with accurate source treatment or clear merchant-assertion status.
- Starter copy, unverified attribution, ambiguous portrait, decorative proof icon, and blank shell are omitted before publication.
- `blockquote`, `cite`, image alternative text, reading order, contrast, zoom, RTL, reduced motion, and layout stability are reviewed.
- No quote, caption, customer identity, publication, rating, structured data, claim, or product association is invented.

## Future Compatibility

Future work may add a governed statement-type field, source URL, date, provenance, source-verification warnings, image-alt separation, duplicate checks, authoring validation, and automated semantic/reduced-motion tests. Any extension must preserve `quote-banner` and its stable setting IDs, maintain a no-JavaScript static statement, and keep Quote Banner distinct from testimonial, review, manifesto, and founder-story systems.
