# Article Page

## Purpose

The Article Page is Calinium’s reading-first editorial destination. It presents one real Shopify Article with its title, body, optional featured image, verified metadata, and carefully bounded discussion, sharing, or adjacent-article navigation.

It owns Article reading flow, featured image presentation, author and publication date context, Article body hierarchy, optional comments when Shopify enables them, and optional related or adjacent Article discovery. It does not own the Blog listing, Products, Collections, cart, checkout, or a separate publishing backend.

## Customer Goals

Customers should be able to:

- Understand the Article topic and source from one clear H1 and real metadata.
- Read long-form content without visual interruption, unsupported promotion, or unnecessary motion.
- View relevant featured and in-body media with stable layout and accessible context.
- Use real sharing, comments, previous/next Article, and related-reading routes when the merchant and Shopify support them.
- Return to the Blog or continue through a verified adjacent Article without losing reading orientation.
- Read comfortably with keyboard navigation, screen reader, zoom, translated text, RTL, reduced motion, and small screens.

## Merchant Goals

Merchants should be able to:

- Publish accurate Shopify Articles without redesigning a reading layout for each post.
- Show only real Article author, date, tags, featured image, content, comment configuration, and navigation data.
- Choose a quiet reading composition that supports stories, guides, journal entries, announcements, and editorial education.
- Add optional related-reading or sharing capability only when its source, consent, privacy, and fallback are known.
- Preserve Article content and immutable approved resources through deterministic generation without allowing AI to fabricate editorial facts.

## Shopify Context

The Article Page uses Shopify’s `article` template type. The current `apps/theme/templates/article.json` contains one active `main-article` section. Shopify owns Article title, body, author, publish date, tags, feature image, Blog relationship, previous/next Article relation, comments availability/moderation, comment submission and validation, routing, localization, and publication state.

The global Header, Footer, skip link, main landmark, cart drawer, predictive search, localization controls, and account entry remain global shell responsibilities. The Article Page owns reading hierarchy, metadata density, Article-level optional regions, the distinction between reading and Blog listing, and safe omission of unsupported editorial features.

### Current implementation evidence

`apps/theme/sections/main-article.liquid` renders an `<article>` with one H1 from `article.title`, a reusable article-meta block, optional eager/high-priority featured image through `responsive-image`, and the actual `article.content` inside a reading-first rich-text region. Current section settings control featured-image, author, date, tag, comment, social-sharing visibility, and color scheme.

When Shopify comments are enabled and the setting permits them, the section renders real comment count/list pagination and Shopify’s `new_comment` form. The form includes labelled name, email, and body fields, required markers, error summary, individual errors, submitted-success messaging, and moderated-comment messaging. It also renders native previous/next Article navigation when Shopify exposes an adjacent article. `social-sharing` is optional. The source has no current related-article section, explicit read-time calculation, table of contents, author biography, reading-progress indicator, or Article-specific app-block region.

`layout/theme.liquid` renders `structured-data-article` for an Article request and that snippet delegates to Shopify’s `article | structured_data`; this is the current single Article structured-data owner. The shared metadata snippet uses the Article context to set Open Graph type to `article` and prefers the real Article image where available. The current article CSS protects a reading measure for text elements, allows full-width media within the page, contains wide tables, and keeps comments/navigation constrained.

### Implementation audit

The current implementation is a strong quiet baseline: real Article data is server rendered, H1 ownership is clear, featured media has intentional loading treatment, comments retain Shopify form state, and Article JSON-LD is emitted once. Implementation hardening is still needed before claiming a table of contents, related-article algorithm, comments moderation UI beyond Shopify state, author profile, reading-time claim, caption policy, app-block composition, or Article-specific lifecycle controls. Those omissions are deliberate rather than missing information to generate.

## Entry Conditions

Valid entry conditions include:

- A real Blog Article Card or adjacent Article link.
- A verified Header, Footer, Blog, tag, search-result, collection, product, campaign, or external link that points to a published Article.
- A localized Article URL resolved by Shopify.
- A direct visit or shared editorial URL.
- Theme Editor preview of an assigned Article.

The Article Page must remain coherent without earlier Blog context, a customer account, a product view, personalized recommendations, a previous reading session, comment capability, or a social network. It must not show unpublished, private, or generated content as a real Article.

## Page Structure

The conceptual structure is:

```text
Global Header
        ↓
Main landmark
        ├── Article H1 and verified metadata
        ├── Optional featured image
        ├── Merchant-authored Article body
        ├── Optional sharing or related-reading support
        ├── Optional comments when Shopify enables them
        └── Optional adjacent Article navigation
        ↓
Global Footer
```

The Article body is the primary region. Every optional region must remain subordinate to reading and must not recreate the Blog index or a product page.

## Required Regions

| Required role | Customer outcome | Rule |
| --- | --- | --- |
| Article identity | Understand the content being read. | One visible H1 comes from the real `article.title`. |
| Reading context | Assess source and currency when Shopify supplies it. | Publication date and author may be displayed according to merchant setting; absent data is omitted, not invented. |
| Article body | Read the actual published material. | `article.content` is server rendered and remains meaningful without optional sections or JavaScript. |
| Reading layout | Read without distraction. | A controlled measure for text, stable media, global navigation, main landmark, and footer remain available. |
| Valid Article route | Continue safely. | Article links and normal storefront navigation remain functional even when sharing/comments/adjacent navigation are absent. |

## Optional Regions

| Optional region | Use when | Omit when |
| --- | --- | --- |
| Featured image | The real Article image adds meaningful context and is appropriately licensed/approved. | No Article image exists, it repeats essential text without value, or its role is purely decorative. |
| Author, date, tags | Shopify provides meaningful public metadata and the merchant’s editorial policy supports it. | Data is absent, private, misleading, or unnecessary for the Article type. |
| Social sharing | A compatible, privacy-aware sharing mechanism and real share URL exist. | The feature creates tracking, broken share routes, or a distraction without customer value. |
| Previous/next Article | Shopify exposes useful adjacent Articles in the same Blog. | The navigation is absent, arbitrary, or confusing for a standalone announcement. |
| Related Articles | A verified editorial relationship and source algorithm/selection exist. | Relevance is guessed, lists are empty, or it becomes product promotion disguised as reading. |
| Comments | Shopify enables comments and moderation/privacy expectations are understood. | Comments are disabled, cannot be moderated safely, or the Article does not benefit from discussion. |
| Table of contents | A long Article has real, well-structured headings that support navigation. | Headings are sparse, duplicate, unstable, or the component would create unreliable anchors. |
| Newsletter | A real consent-ready form is editorially appropriate and remains secondary. | It interrupts the body or treats readership as assumed consent. |
| Breadcrumbs | A visible stable hierarchy improves return navigation. | It duplicates the Blog link or represents a false hierarchy. |
| App Block or Custom Liquid | A reviewed capability has explicit ownership, accessibility/performance review, and fallback. | It becomes an unreviewed embed, replaces Article content, or makes reading dependent on JavaScript. |

## Section Composition

The Article Page follows a reading-first sequence:

1. Article H1 and concise verified metadata.
2. Optional real featured image.
3. Full Article body.
4. Optional sharing or a clearly separate related-reading path.
5. Optional comments when Shopify enables them.
6. Optional previous/next navigation.
7. Optional low-pressure continuation only after the reading flow.

| Classification | Article Page rule |
| --- | --- |
| Globally required | Header, Footer, skip link, and main landmark remain global. |
| Page-functionally required | One H1, real Article body, and readable reading layout. |
| Recommended | Verified author/date when useful and Article image when it improves context. |
| Optional | Tags, sharing, related reading, comments, table of contents, newsletter, Breadcrumbs, and reviewed integrations. |
| Single-instance | Article H1, Article body, canonical structured-data owner, comments region, adjacent navigation, and primary related-reading region. |
| Repeatable | In-body media, semantic Article headings, comments, and related Article cards with distinct source content. |
| Integration-dependent | Comments, social sharing, ratings, subscriptions, external embeds, recommendations, and app blocks. |
| Prohibited | Duplicate Article body, Blog listing as primary content, product grid as primary content, checkout, client-only article rendering, fabricated metadata, or unreviewed Custom Liquid. |

## Component Composition

| Component or family | Article Page relationship |
| --- | --- |
| Article Meta | Presents verified author/date/tags. It does not create authorship or taxonomies. |
| Responsive Image, Video, Gallery, Table, Rich Text | Render real Article media and body content with stable accessible behavior. |
| Social Sharing | Owns bounded sharing controls; the page decides whether sharing has an approved purpose. |
| Field, Text Input, Textarea, Validation Message, Button | Compose Shopify’s optional native comment form; they do not create a separate discussion platform. |
| Pagination | Owns comment-list continuation when Shopify returns comment pages; it does not paginate Article content. |
| Article Card | May support verified related-reading only after a real source and selection contract exist. |
| Breadcrumbs, Text Link, Newsletter, FAQ | Support optional navigation or continuation without competing with Article body. |

Components own local semantics, controls, media behavior, and feedback. Shopify owns Article/comment truth. The Article Page owns reading flow, hierarchy, and the safe boundary between editorial reading and optional continuation.

## Content Rules

Article content must remain merchant-authored, Shopify-published, and attributable to its real source.

- Do not invent article title, author, date, tag, reading time, quote, image caption, research source, product claim, certification, recommendation, comment, or related Article.
- Do not rewrite merchant editorial content into unsupported claims, add hidden keywords, copy competitor content, infer author expertise, or create false freshness/popularity signals.
- Article body heading hierarchy must be real and readable: the page H1 is unique; Article major topics use H2; subordinate topics use H3–H6 only when structurally justified.
- Images, video, embeds, tables, quotations, and links must have a factual relation to the Article and remain accessible. Essential video information needs captions, transcript, or equivalent text.
- A comment is customer content governed by Shopify/blog configuration. Do not present it as merchant endorsement, fabricate it, or imply immediate publication when moderation is enabled.
- Related Articles must have a real verified source and be clearly identified as separate reading, not as part of the current Article body.

## Supported Variants

| Variant | Select when | Composition |
| --- | --- | --- |
| Reading-first | The Article itself is complete with limited supporting context. | H1, metadata, optional image, body, optional adjacent navigation. |
| Illustrated editorial | Approved in-body/featured media is material to understanding the Article. | Reading-first baseline with responsibly delivered media and captions/context. |
| Guide | Real headings, instructions, tables, or care/process content support a practical customer task. | Reading-first baseline with structured body and optional real table of contents. |
| Journal entry | A concise timely merchant update benefits from author/date and nearby Article navigation. | H1, metadata, body, optional adjacent navigation. |
| Discussion-enabled | Shopify comments are enabled and moderation policy supports public discussion. | Reading-first baseline plus native comments after the body. |
| Related-reading | A verified relationship source offers genuinely useful next Articles. | Reading-first baseline plus clearly separate related Article cards. |

Variant selection is deterministic from Article content length and structure, approved media, Shopify comment configuration, merchant editorial goal, and verified related-content source. A visual desire for a richer page never replaces missing evidence.

## Supported States

| State | Required behavior |
| --- | --- |
| Published Article | Render real title, body, and selected verified metadata. |
| Article with featured image | Render it stably with the documented loading treatment and accessible context. |
| Article without optional image/author/date/tags | Omit unavailable details without placeholder facts. |
| Comments disabled | Omit comment region entirely. |
| Comments enabled and moderated | Preserve Shopify’s actual pending/success messaging; never claim publication before moderation. |
| Comment validation error | Show the real error summary and field errors while preserving safe entered values. |
| Previous/next Article unavailable | Omit adjacent navigation cleanly. |
| Related content unavailable | Preserve reading flow; do not fabricate cards or recommendations. |
| In-body media unavailable | Preserve textual body and use the relevant component’s safe fallback/omission. |
| Theme Editor, localization, RTL, zoom, or narrow viewport | Preserve reading order, body hierarchy, comments, and navigation. |

## Navigation and Actions

Reading and opening real Article links are the primary actions. Previous/next links navigate to the exact Shopify Articles that Shopify exposes. A Blog link, real tag link, safe share action, comment submission, table-of-contents anchor, related Article link, Newsletter Form, or verified support route may be secondary.

Links navigate; buttons submit comments or operate an in-place sharing/disclosure control. Do not make a social share action the only way to continue, auto-scroll a customer away from the body, auto-submit a comment, insert product purchase actions into the reading path, or use nested interactive elements.

## Responsive Behaviour

The Article Page is mobile first at 320 px, 375 px, tablet, desktop, wide desktop, browser zoom, large text, translated copy, and RTL.

- Text uses a controlled reading measure; images, video, figures, and tables may use more page width only when they remain contained and meaningful.
- Current table containment must retain horizontal access with readable headers. Long headings, links, citations, code-like strings, and translated text wrap without overflow.
- Metadata, sharing, comments, previous/next links, and related cards stack logically and remain touch-friendly.
- In-body media preserves source order and stable geometry. No visual rearrangement changes the Article’s narrative order for keyboard or screen-reader users.
- Motion, video, and interactive media remain optional and respect reduced-motion preferences.

## Accessibility

The Article Page targets WCAG 2.2 AA:

- One main landmark, one H1, logical Article heading structure, semantic `<article>` context, meaningful landmarks, and a working skip-link target.
- Real author/date/tag context, meaningful media alternatives, captions/transcript or equivalent for essential video, and no essential meaning embedded only in imagery.
- Keyboard operation and visible focus for Article links, sharing, comments, pagination, disclosure, related cards, and optional integrations.
- Native comment labels, required indicators, validation association, error summary, actual status messaging, safe moderation context, and no duplicate live-region announcement.
- Accessible tables, quotations, lists, images, controls, focus return from overlays, contrast, zoom, large text, RTL, localization, and reduced-motion support.
- No duplicated Article title or Article schema ownership from an optional component.

## SEO

Article SEO is based on the real published Article rather than generated editorial claims.

- Use the Article title as the one H1; maintain accurate Shopify title, description, canonical URL, article image, author/date, and visible heading hierarchy.
- Current `meta-tags` emits canonical/title/optional description and Article Open Graph type; it uses the actual Article image when available.
- Use real internal Blog, tag, adjacent Article, and related-Article links. Do not add keyword stuffing, duplicate Articles, false authorship, fake publication updates, artificial internal links, or unsupported product claims.
- Follow Shopify and merchant policy for drafts, publications, pagination, and duplicate URLs. Do not add robots directives without a verified editorial/SEO requirement.

## Structured Data

Article structured data has one current authoritative owner: `layout/theme.liquid` renders `structured-data-article`, which renders Shopify’s `article | structured_data` for a real Article request.

Future Article schema changes must extend or replace that one centralized owner rather than add competing JSON-LD to cards, comments, Rich Text, sharing, related-content, or app blocks. Fields must match real Article title, canonical URL, author, publish/modified dates, image, and body context. Do not emit Product, Collection, Blog, Search, Review, AggregateRating, Offer, FAQPage, or Event schema merely because an Article references those topics. BreadcrumbList is optional only when a visible truthful trail exists.

## Shopify Settings

Current `main-article` settings are featured-image visibility, author visibility, date visibility, tag visibility, comment visibility, social-sharing visibility, and color scheme.

Future settings may expose a verified table of contents, related-reading source, Breadcrumbs, Newsletter, or supporting sections only through dedicated implementation contracts. Shopify owns Article title/body/metadata/comments and adjacent Article relationships. The design system controls reading measure, typography, media delivery, focus, comment feedback, contrast, responsive behavior, and motion.

Do not expose generated author/date/read-time values, arbitrary schema, raw comment moderation control, unverified related Article IDs, performance-critical media behavior, animation speed, or arbitrary Article HTML in theme settings.

## Theme Editor Behaviour

The current `article.json` contains one `main-article` section. Theme Editor settings can change documented display visibility and colour scheme but must preserve actual Article body, H1 ownership, Shopify comments route, structured-data ownership, and normal Article navigation.

Optional sections may be added only after the Article body and only when they have a verified reading purpose. They may not add a second Article H1, duplicate Article body, replace native comments, or emit Article schema. Section reload, selection, reorder, and setting refresh must retain accessible media, unique IDs, comment state, and no duplicate controllers/listeners.

## Performance Rules

- Server-render the Article title, body, metadata, comment content/form, links, and current structured data. Core reading does not depend on JavaScript.
- The current featured image is an intentional leading-media LCP candidate when enabled; it uses responsive delivery and should remain eager/high priority only when it is genuinely early and meaningful.
- Lazy-load below-the-fold Article media, reserve geometry, contain tables, defer/facade external embeds, and avoid autoplay as a reading dependency.
- Keep sharing, comments enhancement, related-content, app blocks, table-of-contents behavior, and social integrations optional. They cannot block Article text or navigation.
- Avoid duplicate image requests, scroll-jacking, reading-progress scripts, repeated observers, heavy embeds, and layout shifts around comments or media.

## AI Guidelines

AI should classify the Article as Reading-first, Illustrated editorial, Guide, Journal entry, Discussion-enabled, or Related-reading from real Article structure, approved media, Shopify settings, merchant editorial goal, and verified adjacent/related sources. It should retain the native `main-article` path and one structured-data owner.

AI must not invent Article content, authors, dates, tags, reading time, captions, quotes, comments, facts, product claims, related articles, comment policy, social destinations, or SEO metadata. It must preserve merchant content and Shopify publication truth, choose the smallest sufficient composition, use documented components, meet WCAG 2.2 AA, preserve performance, and remain deterministic from identical approved inputs.

## Quality Checklist

- [ ] One Article H1, real Article body, and quiet reading-first source order are present.
- [ ] Author, date, tags, image, comments, sharing, and adjacent/related Article regions use only actual supported data.
- [ ] No Article body, author, read-time, comment, image caption, related Article, or editorial claim is fabricated.
- [ ] Comment success, moderation, validation, pagination, and disabled states reflect Shopify truth.
- [ ] Media, tables, headings, links, comments, keyboard navigation, focus, zoom, RTL, reduced motion, and screen-reader flow meet WCAG 2.2 AA.
- [ ] Article metadata and JSON-LD have a single owner and match canonical Shopify Article data.
- [ ] Theme Editor configuration preserves H1/body/schema ownership and lifecycle safety.
- [ ] Server-rendered reading remains available without JavaScript; optional enhancements do not delay it.

## Future Compatibility

Future work may document table of contents, captions, author profiles, related-reading selection, Article Card, comment moderation presentation, editorial app-block rules, and schema hardening after real source data and implementation evidence exist.

Every refinement must keep Article reading first, preserve Shopify Article/comment truth, retain a single Article schema owner, protect performance and accessibility, avoid fabricated editorial content, and remain deterministic across the same approved inputs.
