# Collection List Page

## Purpose

The Collection List Page is the complete storefront destination for discovering verified Shopify collections. It gives customers a calm, useful view of the catalog’s organization and one clear path into each real collection.

It owns page-level orientation, collection-discovery priority, one authoritative collection-list region, collection grouping decisions, continuation placement, empty-state boundaries, page-specific SEO and structured-data boundaries, mobile discovery priorities, Theme Editor composition, deterministic generation, and page-level performance review.

It does not own Shopify collection records, product membership, product data, collection ordering algorithms, Collection Card or collection-grid internals, cart mutation, checkout, app infrastructure, global Header or Footer behavior, or unapproved alternate collection-list styling. Shopify remains the source of collection truth. Luxury comes from restraint, clear titles, authentic imagery, and a hierarchy that makes the catalog easier to understand—not from promotional noise or a product-grid imitation.

## Customer Goals

The Collection List Page should answer, without requiring previous browsing:

1. What collections are available?
2. How is this catalog organized?
3. Which collection is relevant to me?
4. What kind of products does each collection contain?
5. Which collection should I open?
6. Are there more collections to explore?

Customers should be able to scan real Collection Cards, recognize each collection by its verified title and useful imagery, open a verified destination, and understand an empty or continued list without fabricated content. The page must remain understandable when a customer is not signed in, has no cart, has not visited the Homepage, does not know the brand taxonomy, or arrives from a direct, external, localized, or search-engine URL.

## Merchant Goals

The Collection List Page should let merchants expose their authentic Shopify catalog without requiring them to design taxonomy, responsive grids, pagination, accessibility, image delivery, SEO behavior, or Theme Editor mechanics.

Merchants manage collection names, visibility, approved media, factual descriptions, and any explicit taxonomy or featured priority. Calinium recommends the smallest sufficient page variant, density, grouping, and optional supporting roles. Merchants approve meaningful collection and editorial decisions; they do not need to configure raw layouts, breakpoints, schema, JavaScript, or artificial collection relationships.

## Shopify Context

The Shopify template type is `list-collections`. The current canonical template is `apps/theme/templates/list-collections.json`; it assigns one enabled `main-list-collections` section in the `main` position and contains no disabled section instances.

Shopify’s `collections` object supplies the visible collection set, title, URL, featured image, and `products_count` used by the current rendering path. Shopify controls collection visibility, destination URLs, product membership, resource availability, Markets behavior, and pagination data. The theme must not expose hidden or unavailable collections, infer relationships from names, or replace a missing collection with products or fabricated categories.

The global Header, Footer, localization controls, skip link, `main` landmark, cart drawer, and checkout are outside Collection List Page content regions. The page defines roles and ordering rather than raw section schemas. App-driven merchandising is integration-dependent and must be omitted when its capability, data, or customer-safe behavior is not verified.

### Current implementation evidence

- `main-list-collections` renders the localized `collections_list.title` as the sole page H1, then paginates Shopify collections by 24.
- Its populated branch renders one semantic list of `collection-card` snippets. The current Card receives the collection, optional product-count setting, image ratio, and lazy image-delivery inputs.
- The current Card uses a collection’s featured image when present, its title as an H2 link, and `collection.products_count` when the page setting enables it. It does not receive a collection description, badge, explicit featured status, grouping label, or merchant override from this template. A missing image omits the media region rather than rendering a Placeholder Image.
- `pagination` supplies native previous, numbered, current-page, and next links only when more than one page exists. The Collection List template has no Load More or infinite-scrolling enhancement.
- The section offers product-count visibility, one or two mobile columns, two to four desktop columns, image ratio, and color scheme. It has no blocks, `@app` block schema, page-introduction control, grouping, featured-collection control, or explicit continuation style setting.
- The current collection-list path has no list-specific JavaScript controller or Theme Editor lifecycle controller. `premium-collection.js` targets the separate product collection grid (`[data-main-collection]`), not this list.
- No Collection List Breadcrumbs runtime, CollectionPage/ItemList JSON-LD, or page-specific social metadata exists. The global metadata path renders canonical URL, title, description when available, and generic Open Graph/Twitter output.
- Localization uses the `collections_list` translation keys. Shopify Markets and locale routing remain Shopify-owned; the current section contains no market-specific ordering or visibility logic.
- All current Collection Card images are lazy loaded, so the first visible collection image is a likely LCP candidate when the page is image-led. In a text-led or empty state, the page H1 is more likely to be LCP.

This is a strong compact baseline for verified collection discovery, not a complete merchant-ready directory system. The required contract below is the target for future composition and hardening; it must not be described as current behavior unless verified again.

## Entry Conditions

A customer may arrive from global navigation, a mega menu, Homepage navigation, Footer navigation, a truthful Breadcrumb trail, editorial links, a direct URL, an external campaign, a search-engine result, a social link, or a localized collection-list URL.

The page must not assume that the customer knows the catalog taxonomy, collection names, collection ordering, brand, product overlap, or which category is relevant. It must not personalize visibility or ordering from unverified identity or browsing behavior.

## Page Structure

The conceptual page structure is:

1. Global Header.
2. One `main` landmark.
3. Optional Breadcrumbs.
4. Page orientation: one H1 and, only when useful, a concise catalog introduction.
5. One authoritative primary Collection Grid containing verified Collection Cards.
6. Optional verified grouping, featured treatment, or category education after primary discovery.
7. Pagination or another valid continuation when required.
8. Optional low-pressure continuation such as a newsletter.
9. Global Footer.

The first viewport prioritizes page identity, concise catalog orientation, and real collections. The primary Collection Grid must not be buried below long editorial material, promotion, or a featured treatment that prevents access to the broader catalog.

| Catalog context | Smallest sufficient composition |
| --- | --- |
| One collection | One H1 and one concise linked Collection Card; no filler. |
| Small catalog | Orientation and one primary Collection Grid; no forced grouping or supporting sections. |
| Standard catalog | Orientation, one primary Collection Grid, continuation when needed, and zero to two justified supporting roles. |
| Large or structured catalog | Orientation, one primary broader-discovery path, verified grouping when useful, and restrained continuation. |

Collection Cards are items within a region, not full page sections. More than three supporting regions requires verified taxonomy, authentic content, a documented customer purpose, and performance review.

## Required Regions

| Required role | Customer outcome | Page rule |
| --- | --- | --- |
| Page identity | Recognize this as the collection-discovery destination. | One visible authoritative H1 identifies Collections or a verified merchant-approved equivalent. |
| Primary collection discovery | Browse the real catalog structure. | One authoritative Collection Grid renders only visible verified Shopify collections. |
| Collection continuation | Open a collection. | Every rendered Collection Card has a valid, accessible Shopify collection destination. |
| Card clarity | Understand each destination. | Each Card retains a visible verified title and, where media is used, accurate image or restrained fallback treatment. |
| Accurate absence | Understand a successful empty result. | A factual Empty State or equivalent does not invent collections, categories, counts, or recommendations. |
| List continuation | Reach more real collections. | Native Pagination or another valid accessible continuation exists when the authoritative set exceeds one page. |

The primary region may compose a concise introduction, Collection Cards, useful verified descriptions, reliable product counts, and Pagination. It must not hide its H1, use products as substitutes for collections, require an optional application for basic navigation, fabricate collection descriptions or counts, or require JavaScript for initial card links.

## Optional Regions

No optional role is required for baseline collection discovery. Each needs a verified source and a distinct orientation or discovery purpose.

| Optional role | Select only when | Omit when |
| --- | --- | --- |
| Breadcrumbs | A truthful hierarchy improves orientation. | The hierarchy is unavailable, ambiguous, or duplicates global navigation. |
| Page introduction | Concise approved copy explains catalog organization. | It becomes generic filler or delays the primary grid. |
| Featured Collection | Merchant priority and destination are explicitly verified. | It obscures the broader catalog or duplicates the primary grid. |
| Grouped collections or subcollection clusters | Taxonomy or parent-child relationships are Shopify-backed or explicitly merchant-configured. | Relationships are inferred from names or too few collections exist. |
| Collection descriptions and counts | Descriptions are useful and counts are reliable for each card. | Copy is absent or a count risks being stale, misleading, or visually noisy. |
| Badges | A collection-level status is verified and explained by a supported source. | It is a popularity, trend, urgency, or promotional claim without evidence. |
| Editorial guide, image-with-text, FAQ, or related content | Approved content answers a genuine discovery uncertainty. | It repeats card content, is unrelated, or delays primary browsing. |
| Recently viewed or recommended collections | Privacy-safe behavior and real relationships are available. | Data, consent, relevance, or integration capability is unavailable. |
| Seasonal or launch group | Timing, merchant priority, and a post-event transition are verified. | It would create inaccurate seasonal relevance or stranded content. |
| Newsletter, app blocks, or merchandising integration | Approved strategy and compatible runtime behavior exist. | It blocks navigation, lacks data, or introduces an unsupported dependency. |

Promotional banners never masquerade as a collection and must not interrupt the primary Collection Grid. Optional integration failure is local and never blocks core collection discovery.

## Section Composition

Collection List Page composition is deterministic and discovery first:

1. Page orientation.
2. Primary collection discovery.
3. Optional verified grouping.
4. Optional category education.
5. Optional related discovery.
6. Low-pressure continuation.

A typical composition is optional Breadcrumbs, page header, an optional featured treatment only when justified, the primary Collection Grid, optional group or guide, then optional newsletter. Page identity precedes discovery; the grid stays early; groups have clear labels; supporting content follows primary navigation; newsletters do not interrupt browsing.

| Classification | Collection List Page rule |
| --- | --- |
| Globally required | Header, Footer, skip link, and main landmark are global rather than page regions. |
| Page-functionally required | One H1, one authoritative primary Collection Grid, accurate empty state, valid card destinations, and continuation when needed. |
| Recommended | Concise orientation and card density proportionate to real catalog breadth. |
| Optional | The roles in Optional Regions, each with verified purpose and source. |
| Repeatable | Carefully bounded category education or related discovery, each with distinct content and no repeated primary set. |
| Single-instance | Page H1, primary Collection Grid, primary broader-catalog path, and Pagination owner. |
| Integration-dependent | Recommendations, recently viewed, app merchandising, advanced taxonomy, and verified external enrichment. |
| Prohibited | Duplicate H1s, duplicate authoritative grids, arbitrary collection hierarchy, unrelated Product Grids, filler sections, deceptive ordering, countdowns without factual event data, and Custom Liquid as a default escape hatch. |

## Component Composition

The page composes existing components without taking their bounded responsibilities.

| Component or family | Collection List Page relationship |
| --- | --- |
| Breadcrumbs | Provides optional truthful hierarchy. The page decides whether hierarchy improves orientation. |
| Collection Grid role and Collection Card | Own repeated collection placement and individual collection presentation. The page owns one authoritative set, page hierarchy, group placement, and state boundaries. The current runtime uses `main-list-collections` and `collection-card`; a standalone Collection Card specification is still a documentation gap. |
| Responsive Image, Aspect Ratio, and Placeholder Image | Render genuine collection media, stable geometry, and restrained fallback behavior. |
| Section Heading, Rich Text, Image with Text, FAQ, and Newsletter Form | Support optional orientation or continuation only with approved useful content. |
| Badge, Button, Icon Button, and native links | Retain compact state or action ownership. Links navigate; buttons operate. |
| Pagination and future Load More | Own continuation mechanics. The page owns one continuation placement and browser-context requirement. |
| Empty State, Alert, Inline Message, Loading Spinner, Skeleton, and Status Indicator | Communicate the least disruptive accurate state; Empty State never conceals an error or loading state. |
| Container, Section, Grid, Stack, Cluster, Split, Surface, and Content Wrapper | Own layout mechanics. The page owns content priority, source order, and region relationships. |

Sections own merchant-editable rendering. Shopify owns collection records, visibility, URLs, images, product counts, and available pagination data. Cart and checkout remain outside page ownership.

## Content Rules

Collection List content is verified, concise, useful for catalog orientation, sourced from Shopify or approved merchant resources, and free from fabricated relationships or claims.

### Page title and heading hierarchy

The page has one authoritative H1: a verified merchant-approved Collections title or a localized accurate equivalent when the implementation owns the label. Breadcrumbs, eyebrow text, counts, featured treatment, and mobile/desktop duplicates must not replace or duplicate it. Grouped regions normally start at H2; nested group subsections may use H3. Collection Card titles remain subordinate linked headings and never render as H1. Visual size never determines semantic level, and long translated titles wrap naturally without JavaScript.

### Collection Cards

Cards use verified Shopify titles, URLs, images, descriptions, and counts. A description appears only when it helps customers distinguish the collection. A product count appears only when the source is reliable and the visible collection set makes it meaningful. Missing descriptions are omitted; missing images use a restrained fallback rather than unrelated product media; no empty wrapper remains.

Cards must not invent titles, images, descriptions, category purpose, badges, popularity, best-seller status, seasonal relevance, product counts, discounts, stock, urgency, exclusivity, review/customer counts, or collection relationships. Card information stays consistent enough for calm scanning.

### Grouping, featured treatment, and promotion

Groups use verified Shopify taxonomy or explicit merchant configuration. They must not infer parent-child relationships from collection names, duplicate collections merely to fill space, or create artificial importance among equal collections. A featured Collection requires real merchant priority and a verified destination; it never hides the complete discovery path.

Promotional content needs a factual approved catalog event and stays visibly distinct from Collection Cards. It cannot deceive customers about ordering, popularity, availability, or urgency.

## Supported Variants

Variants are controlled strategic compositions based on verified collection count, taxonomy complexity, image quality, and merchant resources. They are not decorative presets.

| Variant | Select when | Composition |
| --- | --- | --- |
| Compact | One or very few collections exist and additional sections would be filler. | One concise page header and low-density primary grid. |
| Grid-first | Catalog structure is straightforward and efficient discovery is primary. | Concise orientation, early grid, minimal supports. |
| Visual | Collection imagery is strong and consistent enough to improve navigation. | Larger, stable-image Cards while titles remain prominent. |
| Grouped | Many collections and verified taxonomy reduce browsing effort. | Labeled groups with one broader authoritative discovery path. |
| Editorial | Authentic approved category education materially helps orientation. | Grid stays early; one evidence-led guide follows it. |
| Launch-focused | Timing and merchant-approved featured priority are verified. | Factual featured treatment plus accessible broader catalog and approved transition. |

AI must choose the smallest valid variant. Visual presets remain outside page ownership.

## Supported States

| State | Required behavior |
| --- | --- |
| One collection | Remain useful without duplicating a Card or adding filler. |
| Small, medium, or large collection set | Use proportional density and continuation; do not change collection truth. |
| Grouped collections | Show only verified group labels and memberships. |
| Paginated or final page | Preserve real native navigation and identify current page. |
| Empty collection list | Distinguish successful absence from loading or error; do not invent categories. |
| Missing image, description, or reliable count | Use restrained fallback or omission; never leave empty decorative wrappers. |
| Hidden or unavailable collection | Keep Shopify visibility and destination behavior authoritative. |
| Integration unavailable | Preserve the primary grid and omit or locally explain the enhancement. |
| Localized, RTL, zoomed, or large-text content | Preserve meaning, wrapping, source order, and usable controls. |
| Theme Editor preview | Use safe design-mode treatment without fabricated storefront collections. |

An invalid page parameter must resolve through safe Shopify pagination behavior. Loading is distinct from empty; application or network failure is distinct from both and must not be concealed by an Empty State.

## Navigation and Actions

The primary customer action is opening a verified collection. Collection Card links own collection navigation; a full-card link is allowed only when it creates no nested interactive conflict. Links navigate and buttons operate.

Secondary actions may move between real groups, open an approved featured collection, use Pagination, open a verified editorial guide, return to broader navigation, or subscribe only after discovery. Pagination links preserve browser history and use no disabled links as substitutes for absent pages. Related or promotional destinations remain visibly distinct from the primary catalog. Unsupported app actions fail safely and must not interrupt collection links.

## Responsive Behaviour

The Collection List Page is mobile first. Page identity and the primary Collection Grid remain early from 320 px through tablet, desktop, wide desktop, browser zoom, large text, translated labels, and RTL contexts.

- The grid adapts to available width without horizontal page overflow; Collection Cards retain readable titles, stable media geometry, and touch-safe links.
- Logical source order remains meaningful. CSS ordering must not disconnect headings from their collections, and there must be no duplicated desktop/mobile grids or H1s.
- Grouped layouts stack clearly rather than becoming horizontal-only carousels. Card descriptions and badges remain secondary and never obscure names or imagery.
- Pagination remains visible, touch safe, and operable. Safe-area insets are respected where the global shell requires them.
- Editorial introductions must not push verified collection discovery excessively below the first viewport.

The page owns content priority; section, layout, and media components own responsive mechanics.

## Accessibility

The Collection List Page targets WCAG 2.2 AA:

- One `main` landmark, a valid skip-link target, meaningful document title, and one visible H1.
- Optional Breadcrumbs use truthful accessible hierarchy. Group labels use meaningful headings and landmarks only when their added navigation purpose justifies them.
- The primary collection list uses suitable list or grid semantics. Every Card link has a meaningful accessible name, visible title, visible focus, and no nested interactive controls.
- Collection media has accurate useful alternatives; decorative media uses empty alternatives. Text over media has sufficient contrast and never contains essential information only in imagery.
- Pagination is keyboard operable, labels current page accessibly, and preserves clear previous/next availability.
- Empty, unavailable, and dynamic states use appropriate restrained announcements; skeletons and placeholders never become focus targets.
- Keyboard access, focus visibility, reduced motion, touch targets, browser zoom, large text, RTL, translation resilience, logical source order, and unique IDs remain valid.

Component specifications remain authoritative for detailed interaction contracts.

## SEO

Collection List Page SEO owns the destination’s unique title and description boundaries, canonical collection-list URL, indexability policy, H1, authentic catalog orientation, internal collection links, optional Breadcrumb relationship, pagination policy, social metadata boundary, localization boundary, and duplicate-content prevention.

Metadata ownership remains divided: Shopify supplies collection data and canonical routing; merchants supply approved page metadata where available; the theme emits global metadata; any future application-generated metadata requires separate approval. The Collection List Page must remain distinct from individual Collection Page canonicals. Groups must not create duplicate standalone destinations without supported routing. Empty states must not manufacture metadata, hidden keyword text, doorway categories, keyword stuffing, or ranking promises.

Current evidence: the global `meta-tags` snippet emits canonical URL, title, description when available, Open Graph/Twitter fields, and a generic `website` type. It has no Collection List-specific meta policy or social image selection. Search alone receives the current `noindex,follow` rule; this document does not infer a Collection List robots policy.

## Structured Data

Collection List Page structured data is optional until it has a verified SEO purpose and one owner. A future implementation may use `CollectionPage`, `ItemList`, `BreadcrumbList`, or `WebPage` only from verified Shopify collection data.

An ItemList must match the authoritative rendered collection set, use stable positions through pagination, omit invented descriptions and counts, avoid treating Collection Cards as Product schema, and avoid competing group or section owners. Breadcrumb schema has one owner. Empty, paginated, and localized states remain valid, and emitted JSON-LD must be validated.

Current evidence: `layout/theme.liquid` emits structured data only for product and article contexts. No Collection List `CollectionPage`, `ItemList`, or BreadcrumbList runtime exists. This is an implementation gap, not a reason to fabricate schema.

## Shopify Settings

Merchants may control, where supported by assigned sections and verified data:

- section presence and order;
- concise approved page introduction;
- card density, safe collections-per-page range, image ratio, image visibility, description visibility, and reliable count visibility;
- approved featured treatment, grouping, editorial content, app blocks, and controlled layout variants.

The page specification recommends one H1, one authoritative primary Collection Grid, one Pagination owner, bounded repeated placement, verified grouping, and integration verification. The Design System, Shopify, and architecture retain semantic hierarchy, collection truth, URLs, responsive source order, typography, spacing, breakpoints, focus, motion, schema, performance, lifecycle, and integration behavior.

Merchants must not receive controls for fake collections or counts, popularity labels, arbitrary relationships, raw CSS/JavaScript/ARIA/schema, arbitrary heading levels or breakpoints, deceptive hidden-collection behavior, unsupported ordering claims, cart mutations, or checkout manipulation.

## Theme Editor Behaviour

The current JSON template has one `main-list-collections` section, which is page-functionally required and limited to one instance by its schema. It has no blocks, app-block support, or list-specific JavaScript lifecycle. Header, Footer, cart drawer, and checkout remain outside page composition.

The target editor contract preserves merchant configuration while making page roles safe:

- required: one page H1 and one primary Collection Grid with a safe empty fallback;
- recommended: concise orientation proportionate to catalog size;
- optional: the verified roles listed above;
- repeatable: bounded education or related-discovery roles with distinct content;
- single-instance: H1, primary grid, broader-catalog path, and Pagination owner;
- integration-dependent: application merchandising, recommendations, advanced taxonomy, and recently viewed behavior;
- prohibited: duplicate H1s/grids/cards without intent, hidden essential discovery, unsupported Custom Liquid, and an app block used as a core discovery replacement.

Future section additions, removal, reorder, block edits, setting refreshes, resource changes, and app-block rerenders must avoid duplicate IDs, listeners, observers, or Card/Grid instances. Design-mode placeholders may clarify empty configuration only in the editor; published storefronts must never show fabricated collections. Essential navigation cannot be removed without a safe fallback. These are documented enforcement goals, not current Theme Editor capabilities.

## Performance Rules

The likely LCP candidate is the first visible Collection Card image when the page is image-led, a prominent verified featured-collection image when added, or the page H1 in text-led and empty states.

- Prioritize only real first-view media; do not preload every collection image or lazy-load the actual LCP image.
- Later Card images are lazy loaded with responsive sizing and stable media geometry. Avoid duplicate desktop/mobile downloads.
- Server-render the H1, initial Collection Grid, and native links. Core navigation must not wait for applications, client-side grouping, or JavaScript.
- Native Pagination remains the default lightweight continuation. Any future Load More or infinite behavior preserves accessible Pagination and browser history.
- Defer below-fold editorial media, related collections, recently viewed features, and integrations. Do not poll, refetch the same collection data, or use heavy masonry/carousel libraries where CSS Grid is enough.
- Prevent layout shift from media, descriptions, counts, badges, application blocks, and group labels. Clean up listeners, timers, and observers during Theme Editor rerenders.

Risk review is required for very large collection sets, high-resolution or animated collection images, repeated placements, multiple grids, oversized featured imagery, large descriptions, app merchandising, carousels, and excessive below-fold content.

## AI Guidelines

AI generates Collection List Pages deterministically from verified Shopify collection-list context, approved merchant priorities, approved resources, and supported runtime capabilities. It does not create collections, choose hidden resources, infer taxonomy, or alter Shopify ordering without verified merchant or platform rules.

### Required sequence

1. Confirm valid Shopify collection-list context and visible verified collections.
2. Classify count, image availability and consistency, description quality, taxonomy, merchant priorities, count reliability, seasonal status, editorial resources, integration capability, localization, and mobile needs.
3. Assign one page H1 and select one documented variant.
4. Configure one authoritative primary Collection Grid and verified Collection Cards.
5. Apply restrained media fallbacks; include descriptions and counts only when useful and source-backed.
6. Add grouping only with verified taxonomy and featured treatment only with merchant-approved priority.
7. Configure accurate empty and Pagination states.
8. Add only verified supporting content and integrations that fail safely.
9. Validate all destinations, source order, accessibility, performance, SEO, structured-data boundaries, and repetition.
10. Remove unsupported, duplicate, promotional, or filler composition.

### Deterministic selection matrix

| Verified condition | Preferred variant | Orientation and density | Image / grouping strategy | Featured and supporting roles | Omit first | Major validation risks |
| --- | --- | --- | --- | --- | --- | --- |
| One collection | Compact | Minimal orientation; one low-density Card | Real image or restrained fallback; no group | No featured duplicate; zero supports | Editorial, grouping, counts when weak | Filler and repeated Card. |
| 2–6 collections | Compact or Grid-first | Concise H1; two-column mobile, restrained desktop density | Consistent Cards; no group unless verified | Introduction only if useful | Extra grids, carousel, newsletter-first | Artificial hierarchy and excessive whitespace. |
| 7–20 collections | Grid-first | Grid stays early; density supports scanning | Real Card media; native continuation if required | One concise guide only if it answers a real question | Repeated featured placement | Unclear titles, count noise, lazy LCP image. |
| Large collection set | Grid-first or Grouped | Clear orientation and efficient continuation | Group only with verified taxonomy | One broader catalog path; restrained group labels | Carousels and several grids | Duplicates, inaccessible continuation, misleading group membership. |
| Visually strong set | Visual | Larger Cards only when titles remain clear | Responsive images with stable ratio | No extra story required | Decorative media and unverified badges | Oversized media, weak contrast, delayed LCP. |
| Verified grouped taxonomy | Grouped | Group headings follow H1 | Explicit membership and no inferred nesting | Optional concise taxonomy guide | Generalized group claims | Duplicate Cards and conflicting hierarchy. |
| Limited image resources | Compact or Grid-first | Titles drive orientation | Omit media or use restrained supported fallback | No visual-only feature | Unrelated product/lifestyle images | Empty wrappers and fabricated imagery. |
| Limited content resources | Compact | One authoritative grid | Keep only real titles and links | No editorial supports | Intro, FAQ, newsletter, claims | Filler and overly sparse fake cards. |
| Verified seasonal or launch context | Launch-focused | Broader grid remains early | Normal verified Card treatment | One factual featured treatment with transition | Countdown and false urgency | Stale timing, inaccessible broader catalog. |
| Empty collection list | Compact empty state | H1 and factual empty explanation | No grid/card fabrication | One real broader-navigation link only if available | Recommendations and category invention | Treating empty as loading or error. |

AI should preserve real Shopify titles and URLs, select the smallest sufficient composition, keep discovery early, prefer omission over filler, and maintain deterministic order. AI must never invent collection data, images, descriptions, counts, hierarchy, parent-child relationships, priority, seasons, popularity, badges, recommendations, app capabilities, urgency, or scarcity; duplicate the authoritative grid; require JavaScript for initial links; replace accessible Pagination without an equivalent fallback; or override explicit merchant configuration.

## Quality Checklist

- [ ] The page has one clear collection-discovery purpose, verified Shopify context, one H1, and one authoritative primary Collection Grid.
- [ ] Every Collection Card uses a verified title, URL, image/fallback treatment, and any shown description or count is reliable.
- [ ] Empty, one-collection, small, large, grouped, paginated, missing-media, integration, localization, and Theme Editor states are distinct and safe.
- [ ] Grouping, featured treatment, badges, seasonal context, editorial content, and related discovery have verified sources and documented purpose.
- [ ] No collections, counts, hierarchy, popularity, best-seller claim, seasonal relevance, urgency, or duplicate placement is fabricated.
- [ ] Collection discovery is early; optional content is bounded; no duplicate H1, primary grid, Pagination owner, or inaccessible continuation exists.
- [ ] Card links, Pagination, Breadcrumbs, focus, keyboard access, touch targets, contrast, media alternatives, reduced motion, zoom, large text, RTL, and source order meet accessibility requirements.
- [ ] Page metadata, canonical, internal links, pagination policy, social boundary, and structured-data ownership are valid and non-duplicative.
- [ ] LCP treatment, responsive image delivery, later-image deferral, stable layout, minimal above-fold JavaScript, native no-JavaScript navigation, and rerender cleanup are preserved.
- [ ] AI selected a deterministic smallest sufficient variant, preserved Shopify truth and merchant approval, and omitted unsupported integrations.

## Future Compatibility

Safe future extensions include controlled alternate Collection List templates, richer verified taxonomy, approved parent-child relationships, enhanced subcollection navigation, Shopify-supported market-specific visibility, verified merchandising rules, featured-collection logic, editorial groups, accessibility-improved media, privacy-safe recently viewed behavior, approved personalization, resource validation, taxonomy/image/grouping utility scoring, preset defaults, and implementation enforcement for required roles.

Extensions must not weaken Shopify source-of-truth ownership, fabricate collection data or taxonomy, make integrations mandatory, silently update merchant themes, auto-enable applications, create uncontrolled grids, weaken heading hierarchy, require JavaScript for initial discovery, remove merchant approval, expose arbitrary scripts or schema, permit deceptive ordering, add fake popularity or unsupported claims, override explicit merchant configuration, replace deterministic selection with subjective randomness, or remove accessible Pagination without equivalent fallback.

### Future implementation-hardening recommendations

1. Add a dedicated Collection Card specification and align its heading-level, image-fallback, count-reliability, description, and card-link contract with this page-level specification.
2. Add a guarded first-visible Card LCP strategy, including an eager/fetch-priority decision only for real above-fold image-led pages; retain lazy loading for all later cards.
3. Define approved Breadcrumb rendering and Collection List structured-data ownership before adding either runtime output.
4. Add source-backed collection descriptions, restrained Placeholder Image behavior, optional verified grouping, and a contextual empty-state recovery path without inventing collection relationships.
5. Establish explicit list-level Theme Editor and integration contracts for app blocks, lifecycle cleanup, merchant-safe grouping, and one-authoritative-grid enforcement.

The specification is ready to guide future section documentation, preset composition, deterministic AI Collection List Page generation, implementation hardening, and later Cart Page documentation.
