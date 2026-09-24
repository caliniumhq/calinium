# Blog Page

## Purpose

The Blog Page is Calinium’s editorial index. It helps customers discover real published articles, understand their titles and context, and continue into a chosen Article without confusing an editorial list with catalog browsing or a standalone article.

It owns article listing, pagination, article cards, optional featured-article treatment, and verified categories or tags where Shopify exposes them. It does not own the full Article body, Products, Collections, product merchandising, or checkout.

## Customer Goals

Customers should be able to:

- Understand the editorial destination from one Blog H1.
- Scan real article titles, images, dates, authors, tags, and excerpts without mistaking a card for its full article.
- Open a specific Article through a normal link.
- Move through a longer editorial index with accurate pagination and, where supported, a real tag/category context.
- Recover gracefully from an empty blog or unavailable optional editorial enhancement.
- Read and navigate comfortably at small widths, keyboard, zoom, large text, RTL, localization, and reduced motion.

## Merchant Goals

Merchants should be able to:

- Publish Shopify Blog articles and have the index use Shopify’s real order, availability, pagination, tags, authors, dates, excerpts, and images.
- Choose a quiet editorial listing that protects readability and does not become a product grid or content marketing template.
- Configure sensible card metadata, image treatment, article count, and optional descriptive context.
- Feature an article only when a verified editorial decision, real source article, and distinct customer value exist.
- Preserve approved article information and deterministic listing composition without generating articles, authors, tags, or claims.

## Shopify Context

The Blog Page uses Shopify’s `blog` template type. The current `apps/theme/templates/blog.json` contains one active `main-blog` section. Shopify owns the Blog title, Article publication, chronological or configured order, article data, tags, URLs, pagination, article visibility, localization context, and tag-filter routing where available.

The global Header, Footer, skip link, main landmark, cart drawer, predictive search, localization, and account entry are global shell responsibilities. The Blog Page owns editorial-list hierarchy, card density, pagination intent, optional tag/category use, and safe omission of unsupported editorial regions.

### Current implementation evidence

`apps/theme/sections/main-blog.liquid` renders one H1 from `blog.title`, optional section-description rich text, and a native paginated `blog.articles` list. It supports 4–24 articles per page in increments of four, defaulting to 12. The section renders an article-card list when `blog.articles_count` is positive and a localized empty message with `role="status"` otherwise.

The reusable `article-card` renders a real article only when one exists. Its image is optional and uses the responsive-image primitive; title is an H2 link; excerpt is derived from the real excerpt or article content and truncated for the card; author, date, and tags are controlled by the current section settings. Tags use Shopify’s `link_to_tag` when enabled. The current grid is one column, then two at the tablet breakpoint, and three at wide desktop. There is no current featured-article slot, dedicated tag navigation, category taxonomy, search/filter control, related-product region, or Blog-specific JSON-LD.

The shared metadata path emits canonical URL, title, optional description, Open Graph, and Twitter output from Shopify page context. `layout/theme.liquid` emits structured data only for Product and Article request types, not Blog. The current theme does not establish a separate Blog schema, tag schema, or noindex rule for Blog pages.

### Implementation audit

The current path is a restrained, server-rendered editorial index with real card data, responsive imagery, semantic H1/H2 structure, pagination, and an empty state. It does not yet implement featured article composition, blog-level tag/category navigation, additional editorial sections, a first-class article-card component specification, or centralized Blog structured data. Those future capabilities require actual content/taxonomy/source ownership rather than generated filler.

## Entry Conditions

Valid entry conditions include:

- A verified Header or Footer editorial link.
- A direct visit to a published Shopify Blog URL.
- A real Article “back to journal” or tag link.
- A localized Blog route or valid Shopify pagination/tag route.
- Theme Editor preview of the assigned Blog template.

The Blog Page must remain useful without knowledge of a previous Article, product, collection, campaign, subscription, or customer account. It must not assume a visitor’s reading interests, create personalized recommendations, or expose unpublished content.

## Page Structure

The conceptual structure is:

```text
Global Header
        ↓
Main landmark
        ├── Blog H1 and optional verified description
        ├── Optional truthful editorial orientation or tag context
        ├── One authoritative article-card listing
        ├── Accurate pagination or empty state
        └── Optional low-pressure editorial continuation
        ↓
Global Footer
```

The current default has a Blog H1, optional description, Article Card grid, and pagination or empty state. The listing remains the primary region; promotional or commerce regions must not obscure it.

## Required Regions

| Required role | Customer outcome | Rule |
| --- | --- | --- |
| Blog identity | Understand the editorial destination. | One H1 is rendered from the real `blog.title`. |
| Article listing | Discover real published Articles. | One canonical card list uses Shopify article data and normal article links. |
| Accurate article-card context | Decide whether to open an Article. | Every card preserves a real title and may expose only verified image, excerpt, author, date, and tag data. |
| Continuation or empty state | Reach more Articles or understand their absence. | Native pagination appears for a paginated list; an accurate empty state appears when Shopify reports no articles. |
| Valid layout | Read and navigate safely. | Global navigation, main landmark, clear source order, and global footer remain present. |

## Optional Regions

| Optional region | Use when | Omit when |
| --- | --- | --- |
| Blog description | Merchant-approved editorial context clarifies a real journal purpose. | It repeats the Blog title or introduces unsupported brand claims. |
| Featured article | One real, published Article has a distinct approved editorial reason to lead. | Selection is arbitrary, duplicative, unpublished, or would displace the primary list without purpose. |
| Tag or category context | Shopify or an approved taxonomy provides meaningful, public, current grouping. | Tags are sparse, misleading, unapproved, or categories are not actually supported. |
| Breadcrumbs | A stable hierarchy helps a customer return to a real parent destination. | It merely repeats Header navigation or implies an untrue hierarchy. |
| Newsletter | A genuine subscription strategy and consent-ready Shopify form exist. | It interrupts article discovery or uses editorial interest as assumed marketing consent. |
| Related collections/products | A separately labeled, merchant-approved editorial-to-commerce relationship exists. | It looks like organic article content, lacks resource evidence, or turns the Blog into a catalog. |
| Editorial media, quote, or rich text | Real approved content adds useful Blog-level context. | It is generic filler, duplicates an Article, or delays the listing. |
| App Block or Custom Liquid | A reviewed integration has a clear customer outcome and fallback. | It replaces native listing/pagination, injects unverified content, or lacks accessibility/performance ownership. |

## Section Composition

The Blog Page is list-first:

1. Blog H1 and optional concise description.
2. Optional verified tag/category orientation or one featured Article.
3. One authoritative article-card listing.
4. Pagination or the accurate empty state.
5. Optional low-pressure continuation, such as newsletter, only after the list.

| Classification | Blog Page rule |
| --- | --- |
| Globally required | Header, Footer, skip link, and main landmark remain global. |
| Page-functionally required | H1, article listing, accurate cards, and pagination or empty state. |
| Recommended | Brief editorial orientation and real tag context when they improve discovery. |
| Optional | Featured Article, tags/categories, newsletter, restrained editorial/commerce continuation, and reviewed integrations. |
| Single-instance | Blog H1, primary listing, canonical pagination, empty state, and featured-article lead. |
| Repeatable | Article cards and clearly distinct optional editorial supports. |
| Integration-dependent | Ratings, comments counts, subscriptions, app search, external editorial feeds, or a related-commerce feed. |
| Prohibited | Full Article body, duplicate Article H1s, product/collection grid as primary content, checkout, fabricated cards, client-only pagination, and Custom Liquid as ordinary blog composition. |

## Component Composition

| Component or family | Blog Page relationship |
| --- | --- |
| Article Card and Article Meta | Present bounded real article data. The Blog Page owns list hierarchy, count, and ordering—not Article body. |
| Responsive Image and Placeholder Image | Render real article media or safe no-media treatment. |
| Pagination | Owns continuation mechanics; the Blog Page owns its single canonical placement and accurate state. |
| Tag, Chip, Text Link, Breadcrumbs | Present verified tag/category or navigation context without creating a taxonomy. |
| Empty State, Inline Message, Status Indicator | Communicate a real empty or unavailable context; they never fabricate an article list. |
| Newsletter, Button, Rich Text, Featured Article treatment | Support optional follow-up content after the listing. |

Components own local rendering, loading, semantics, and controls. Shopify owns Blog/article truth. The Blog Page owns one editorial-index purpose and the boundary between a card preview and Article reading.

## Content Rules

Blog content is merchant-authored and Shopify-sourced. It must preserve Article titles, excerpts, authors, dates, tags, images, publication status, and destinations exactly enough to remain truthful.

- Do not generate Articles, author names, publication dates, tags, categories, excerpts, editorial claims, read times, article counts, rankings, or featured status without approved source data.
- A card excerpt is a concise representation of real Article content. Do not transform it into a promise, result, product claim, or invented summary.
- Tags may be displayed only when Shopify provides them and their meaning is understandable. Do not call tags “categories” unless a verified taxonomy supports that terminology.
- Featured treatment requires a real published Article and merchant editorial approval. It must not imply popularity, recency, importance, or recommendation unless that fact is verified.
- Do not place hidden keywords, copied competitor content, false expertise, unverified research, fake quotes, or product claims in Blog-level content.
- Card images are approved article images, not unrelated stock imagery. When no article image exists, omit it or use the documented restrained placeholder behavior.

## Supported Variants

| Variant | Select when | Composition |
| --- | --- | --- |
| Chronological editorial index | The Blog has a regular real publishing cadence. | H1, optional description, ordered article cards, pagination. |
| Featured-led index | One verified, approved Article needs contextual prominence. | Featured Article followed by the canonical listing without duplicate semantic ownership. |
| Tag-guided index | Shopify tags or approved categories are meaningful and sufficient. | H1, concise taxonomy context, one active tag/category state, article listing. |
| Compact journal | A small number of concise Articles needs a quiet listing. | H1, limited card metadata, no redundant navigation. |
| Empty editorial index | No published Articles are available. | H1, accurate empty state, optional real return path. |

Selection is deterministic from actual Blog/article count, tag taxonomy, merchant editorial goals, approved featured selection, and resource availability. It must not be driven by an attempt to make a sparse Blog look busy.

## Supported States

| State | Required behavior |
| --- | --- |
| Published Blog with articles | Render actual cards and native pagination where the list spans pages. |
| Paginated Blog | Preserve page context and authoritative Shopify continuation links. |
| Tag-filtered or taxonomy context | Show only the current verified filter/context and provide a real route back when supported. |
| Empty Blog | Render a calm factual empty state; do not invent Articles or recommendations. |
| Article with missing image/excerpt/author/date/tags | Omit unavailable metadata or use a safe media placeholder without changing the Article’s truth. |
| Featured Article unavailable | Omit the lead and retain the standard list. |
| Optional integration unavailable | Preserve native list and pagination; do not show fabricated loading or feed content. |
| Theme Editor, localization, RTL, zoom, or narrow viewport | Preserve card hierarchy, grid source order, pagination, and readable text. |

## Navigation and Actions

Opening a real Article is the primary navigation action. Article-card titles and any supported card image link must lead to that exact Article. Pagination uses Shopify’s real URLs. Tag/category controls use verified Shopify or approved taxonomy routes.

Secondary actions may return to the Blog root, clear an active tag where supported, open a verified Newsletter Form, or follow clearly labeled related commerce paths. Buttons operate in-place controls only; links navigate. Do not use client-only card navigation, nested links, ambiguous “read more” controls without contextual names, or automatic redirects between articles.

## Responsive Behaviour

The Blog Page is mobile first at 320 px, 375 px, tablet, desktop, wide desktop, browser zoom, large text, translated copy, and RTL.

- The current card grid progresses from one to two to three columns; titles, excerpts, metadata, tags, and pagination must remain readable without horizontal overflow.
- Card source order remains chronological or Shopify-supplied order even when the visual grid changes.
- Image ratios reserve stable card geometry. Optional featured treatment must not deliver a large unnecessary image on small devices.
- Tag/category controls wrap and remain touch-friendly; they never push the actual listing below an inaccessible horizontal control strip.
- Pagination and article links remain keyboard and touch accessible. Motion is restrained and reduced-motion safe.

## Accessibility

The Blog Page targets WCAG 2.2 AA:

- One main landmark and one Blog H1; article-card titles begin below the H1 and have unique, meaningful link names.
- Semantic list/grid structure, accurate author/date/tag text, meaningful image alternatives, and no essential article identity conveyed by image alone.
- Keyboard-operable card links, tags, pagination, optional filters, newsletter, and reviewed integrations with visible focus and adequate touch targets.
- Current-page pagination state, active tag/category state, and empty state are communicated in text and not colour alone.
- No automatic focus movement after pagination or optional enhancement; loading, empty, and unavailable contexts remain distinct and use restrained announcements.
- Logical order, contrast, zoom, localization, RTL, reduced motion, and no-JavaScript article navigation are preserved.

## SEO

Blog SEO should describe a real editorial index without competing with individual Articles.

- Use the Shopify Blog title as the single H1, accurate merchant-managed title and meta description, canonical Blog URL, and real internal Article links.
- Current shared metadata emits canonical/title/optional description/Open Graph/Twitter output, but no Blog-specific social type, tag metadata, or robots directive.
- Pagination and tag/category URLs must avoid uncontrolled duplicate indexing according to the merchant’s verified SEO policy and Shopify behavior. Do not add index directives or canonical rewrites without evidence.
- Do not manufacture article summaries, categories, keywords, expertise, freshness, popularity, or product claims for search visibility.

## Structured Data

The Blog Page may own one centralized `Blog` or appropriate editorial-index structured-data representation when implementation evidence establishes it. An optional `BreadcrumbList` may be added only when it matches a visible, stable trail. Article Cards must not emit their own competing Article/BlogPosting schema; Article Page remains the sole current Article schema owner.

Any future ItemList must match the rendered card order, page, and visible Articles exactly. It must not include unpublished, recommended, or fabricated Articles. Do not emit Product, Collection, Search, Offer, Review, AggregateRating, or Article structured data simply because a card mentions those concepts.

The current theme emits no Blog-specific JSON-LD.

## Shopify Settings

The current `main-blog` settings are description, articles per page, image visibility, excerpt visibility, author visibility, date visibility, tag visibility, image ratio, and color scheme.

Future settings may expose a verified featured Article, taxonomy orientation, Breadcrumbs, optional Newsletter, or other supported regions only through dedicated section contracts. Shopify owns Blog/article publication, list truth, tags, and pagination data. The design system controls grid breakpoints, image delivery, typography, card spacing, focus styles, metadata hierarchy, motion, and empty-state presentation.

Do not expose arbitrary article ordering, fake editorial labels, raw schema, unverified tags/categories, generated excerpts, animation speed, or merchant-specific IDs in canonical settings.

## Theme Editor Behaviour

The current `blog.json` contains one `main-blog` section. Theme Editor adjustments may change its documented display settings but must preserve the Blog H1, native list/pagination path, real article links, and source order.

Optional sections can be added only after the mandatory listing and only when they have verified content and do not replace the main index. A featured Article may not be separately rendered in a way that creates duplicate cards, duplicate Article schema, or a second Blog H1. Section reload, selection, reorder, and setting refresh must preserve card navigation and avoid duplicate observers/listeners.

## Performance Rules

- Server-render the H1, card links, core card content, empty state, and pagination. The Blog remains useful without JavaScript.
- Article-card images use responsive output and lazy loading in the current list; do not eagerly load every card or add duplicate media fetches.
- Reserve image geometry, keep excerpt lengths bounded, and avoid layout shifts when optional metadata or a featured region appears.
- Keep tag/category, external feed, social, and recommendation enhancements optional; they must not block the native list or pagination.
- Avoid client-side resorting, infinite-scroll replacement, autoplay media, repeated observers, polling, and heavy embeds unless future implementation proves a benefit and fallback.

## AI Guidelines

AI should select a Blog variant from actual Blog/article count, merchant editorial goals, verified tags/categories, real featured-article approval, and available media. It should preserve Shopify article truth and the native listing/pagination contract.

AI must not invent Articles, titles, excerpts, authors, dates, tags, categories, read times, featured status, product links, testimonials, images, article rankings, or editorial claims. It must choose the smallest sufficient composition, omit unsupported enhancements, use documented components, preserve WCAG 2.2 AA and performance rules, and produce deterministic output from the same approved inputs.

## Quality Checklist

- [ ] One Blog H1, one authoritative article listing, and one canonical pagination/empty-state owner are present.
- [ ] Cards use only real published Article data and have meaningful individual Article links.
- [ ] Optional featured, tag/category, newsletter, commerce, and integration regions have verified source data and safe omission paths.
- [ ] Blog-level content does not become Article body, product browsing, checkout, or fabricated editorial content.
- [ ] Grid, images, metadata, tags, pagination, zoom, RTL, keyboard use, screen-reader order, and reduced motion are accessible.
- [ ] SEO and structured-data ownership do not compete with Article Page schema or create duplicate index paths.
- [ ] Theme Editor changes preserve native listing behavior and do not duplicate cards/controllers.
- [ ] Core browsing works server-side without JavaScript and optional enhancements do not delay it.

## Future Compatibility

Future refinement may introduce a documented Article Card component specification, verified featured-article treatment, Shopify-tag navigation, approved category taxonomy, related editorial composition, Blog structured data, and a safe progressive load-more path after implementation evidence and performance/accessibility validation exist.

All future work must preserve Blog as a quiet editorial index, keep Article Page responsible for full reading and Article schema, preserve Shopify list truth and pagination, avoid generated editorial content, and retain deterministic, merchant-approved composition.
