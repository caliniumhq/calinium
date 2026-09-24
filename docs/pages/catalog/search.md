# Search Page

## Purpose

The Search Page is the complete storefront destination for one submitted storefront search query. It keeps the query visible, presents Shopify's authoritative results, and gives customers a calm way to refine, interpret, and open them.

Search reduces effort; it does not manufacture relevance. Products remain the primary commerce focus when they are relevant, while article, page, and collection results remain visibly distinguishable. The page is not a second Homepage, and Predictive Search is an entry enhancement rather than a substitute for the complete result destination.

This specification owns query-specific hierarchy, query and form placement, result count, result-type composition, product-result priority, filters, sorting, active filters, result continuation, empty-query and no-results recovery, search SEO boundary, mobile priorities, Theme Editor composition, deterministic generation, and page performance. It does not own Shopify search indexing, ranking, result inclusion, predictive-search backend behavior, result records, filters, sort algorithms, cart, checkout, component internals, or integration infrastructure.

## Customer Goals

The Search Page should answer, without assuming prior browsing context:

1. What did I search for?
2. Were results found?
3. How many results are available?
4. Which result types are included?
5. How can I refine the results?
6. How can I change their order?
7. Which result should I open?
8. What can I do when nothing matches?

Customers can edit and submit a query, scan real results, use supported refinement, navigate to a real result, and recover from empty, malformed, or no-match conditions. Optional recommendations, promotions, and integrations never masquerade as organic results and never block native search.

## Merchant Goals

The Search Page helps merchants expose Shopify's catalog and editorial discovery without requiring them to configure ranking algorithms, query parsing, responsive behavior, accessibility, search semantics, or result-card internals.

Merchants approve search presentation, bounded product-card settings, and only verified optional integrations. Calinium recommends the smallest sufficient result composition, density, filtering threshold, and support content. It does not ask merchants to manually decide search implementation details or invent customer intent.

## Shopify Context

The Shopify template type is `search`. The current canonical template is `apps/theme/templates/search.json`, which assigns one active `main-search` section. Submitted `search.terms` and the Shopify `search` object form the current context. Shopify owns result truth, ranking, product/article/page/other resource data it returns, money, availability, filters, sorting, pagination, query parameter behavior, and Search & Discovery capability.

The submitted query is authoritative and remains safely escaped. The Search Page defines page roles and ordering, not raw section schemas. Filtering is conditional on supported, useful `search.filters`; sorting is conditional on Shopify-provided sort options. Product, article, page, and collection results must remain distinguishable where returned. Header, Footer, global Header search interaction, cart drawer, localization controls, and checkout are outside Search Page content regions.

Predictive Search remains a separate navigation enhancement: it can start search discovery before submission and link to the full results destination, but it neither owns nor replaces the Search Page. Application-enhanced or semantic search is omitted unless a verified integration takes responsibility for result truth. No alternate search template currently exists.

### Current implementation evidence

- `main-search` is the only assigned, single-instance search section. It renders the H1, native GET search form, current query in the input, optional Predictive Search container, result count, Shopify sort select, facets, Active Filters, mixed result grid, native pagination, no-results branch, and empty-query guidance.
- The form submits to Shopify `routes.search_url` with `q` and `options[prefix]=last`. The filter form preserves the submitted query and prefix setting. Sort and checkbox facet changes progressively submit that same GET form; price inputs retain the explicit Apply Filters fallback.
- When `search.performed` is true, the result-count heading includes the returned count and submitted terms. Search results render as one authoritative list: products use the shared Product Card; all other result types use `search-result-card`. Article and page cards receive visible type labels. Collection results can pass through Shopify result data but do not yet have an explicit current type label or dedicated collection card path.
- Product Cards preserve current safe behaviors: real media or placeholder, Shopify money, truthful sale/sold-out state, actual swatches, optional verified review metafield, and Quick Add only for a safe single-variant product. Multi-variant quick action remains a Product Page link. Quick View and wishlist are only integration hooks.
- Search filters render only when Shopify returns `search.filters`; Active Filters use Shopify removal URLs and clear to the base search route. Current Search Page filtering remains in flow: unlike the collection page, it has no mobile filter drawer. Current Search Page pagination is native only; it has no assigned Load More or Infinite Scroll mode.
- Empty query produces guidance below the search form. A performed zero-result query produces a no-results message and a real browse-collections link. The current implementation does not yet give different copy or recovery for no results after active filtering versus a query with no Shopify matches.
- Predictive Search is opt-in and enabled by default for the section. It waits for a two-character query, requests Shopify product/article/page results, debounces and aborts stale requests, supports keyboard traversal and Escape, and provides a Shopify search “view all” link. It does not currently request or present collection results, spell correction, semantic results, recent searches, or popular searches.
- Global `meta-tags` applies `noindex,follow` to search routes and uses generic canonical/title/social handling. The global layout emits structured data only for product and article routes, so no search JSON-LD or Breadcrumbs runtime is currently present. The first result card image is lazy loaded; in a result-led layout that requires future LCP review.
- The runtime attaches predictive-search and facets listeners on section load and removes them on unload. The canonical baseline is merchant-ready for ordinary Shopify search, while mixed-type grouping, mobile filter refinement, explicit filtered-no-results recovery, and advanced search integrations remain future work.

## Entry Conditions

A customer may enter through global Header search, Search Drawer, Predictive Search submission, a predictive “view all” link, direct search URL, browser history, corrected-query link, no-results recovery action, editorial/support link, applicable external search-engine referral, or localized search URL.

The page must work without Predictive Search use, query validity, query presence, result-taxonomy knowledge, filter/sort knowledge, knowledge of ranking, sign-in, cart contents, a known customer segment, prior browsing, or an assumption that only products are sought. It must not personalize results on unverified identity or behavior.

## Page Structure

The conceptual structure is:

1. Global Header.
2. One `main` landmark.
3. Search orientation: H1, visible submitted-query context, Search Input, submit action, and useful result count.
4. Optional result-type navigation, filters, sorting, and Active Filters.
5. One primary results region: products first when commerce intent is strongest, then clearly separated collection, article, or page results where meaningful.
6. Pagination or valid result continuation.
7. Empty-query or no-results recovery.
8. Optional low-pressure discovery.
9. Global Footer.

The first viewport prioritizes editable search context, result state, and early relevant results. Long editorial content, generic promotion, or newsletter capture must not sit above the first authoritative result region.

| Page density | Composition rule |
| --- | --- |
| Minimum valid | Query context, Search Input, accurate result state, and a result list or recovery state. |
| Standard | Query context, useful count and controls, results, pagination, and recovery. |
| Mixed-content | Query context plus clearly grouped result-type regions when multiple types are genuinely useful. |
| No results | Query context, concise message, editable correction path, and limited verified discovery only. |

Filter groups, result-type tabs, Active Filters, and pagination do not count as full page sections. Promotional regions are never forced into ordinary search results.

## Required Regions

| Required role | Customer outcome | Page rule |
| --- | --- | --- |
| Search Page identity | Understand the destination. | One authoritative H1 identifies Search or Search Results without pretending the query is merchant-authored content. |
| Query context | Understand the submitted or empty query state. | Current submitted terms are visible, safely escaped, and editable through one Search Input owner. |
| Search submission | Run a real storefront search. | Native Search Input and named submit action navigate through Shopify search. |
| Accurate result state | Understand whether Shopify returned results. | Empty query, match, no-match, filtered no-results, loading enhancement, and unavailable integration states remain distinct. |
| Results region | Open an authoritative result. | Results use verified Shopify resources; Product Cards render product matches and other result types remain clearly labeled. |
| Result continuation | Reach more authoritative results. | Pagination or another valid continuation exists when the result set spans pages. |
| Recovery | Continue after empty or no-match state. | Revise query, clear filters, or use a real catalog path without fabricated matches. |

The primary search region may compose current terms, input, submit Button, count, result-type controls, supported filters and sort, Active Filters, Product Cards, other real result cards, Pagination, and safe recovery. It must not hide the submitted query, fabricate counts or results, mix promotion into organic results without labels, expose unsupported filters/sort, require apps, or replace normal links with non-navigable controls.

## Optional Regions

Optional search regions require source truth and a specific recovery or discovery benefit. None is required for baseline search validity.

| Optional role | Select only when | Omit when |
| --- | --- | --- |
| Breadcrumbs | A stable truthful hierarchy helps navigation. | It duplicates Header navigation or runtime hierarchy is absent. |
| Result count, type tabs, chips, or product-only refinement | The returned result types and count make interpretation easier. | There is one obvious type or no reliable count/control source. |
| Filters, Active Filters, sidebar, or Filter Drawer | Shopify/integration data is meaningful and enough product results warrant narrowing. | Filters are unavailable, weak, or add friction to a small set. |
| Sort | Shopify or a verified integration exposes useful ordering. | Options are unsupported or not useful. |
| Spell correction or query suggestion | A verified search capability supplies it. | It would guess, rewrite, or infer customer intent. |
| Recent/popular searches or search tips | Privacy-safe stored data, verified analytics, or approved merchant content exists. | It exposes other customers' behavior, lacks proof, or is promotional noise. |
| Quick Buy, Quick View, swatches, ratings | The product and integration context supports them safely. | Variant complexity, data, or accessibility makes them unsuitable. |
| Collection, article, page cards, or excerpts | Returned resource types are meaningful and content is real. | They are empty, weak, or would be confused with product matches. |
| Related collections, recommendations, recently viewed, newsletter, or support path | A verified separate discovery/recovery purpose exists. | It interrupts results or could masquerade as a match. |
| Semantic search, app-enhanced search, merchandising or promoted results | A verified integration, labeled source, and safe failure path exist. | Truth, labeling, privacy, or failure behavior is not established. |

Recommended products in no-results recovery are always visually and semantically separate from actual matches. Promoted results require explicit labeling and may not be presented as relevance-ranked organic results.

## Section Composition

Search composition is query first and results first:

1. Search orientation.
2. Query refinement.
3. Result controls.
4. Primary results.
5. Result continuation.
6. Recovery or supporting discovery.
7. Low-pressure continuation.

A typical page is Search Header, Search Form, useful controls/count, results, pagination, optional verified discovery, then optional newsletter. Every role after the result set is conditional.

| Classification | Search Page rule |
| --- | --- |
| Globally required | Header, Footer, skip link, and main landmark remain global. |
| Page-functionally required | One H1, query context, one Search Input/submission owner, one authoritative results region, state recovery, and continuation when needed. |
| Recommended | Useful result count, clear type differentiation, and only the controls that reduce search effort. |
| Optional | Suggestions, tabs, filters, sort, quick actions, recommendations, support, newsletter, and roles listed above. |
| Repeatable | Clearly distinct result-type groups or recovery supports when each has a real source and heading. |
| Single-instance | H1, Search Input owner, primary result set, filter system, sort system, Active Filters owner, and pagination owner. |
| Integration-dependent | Predictive Search, semantic search, correction, recommendations, ratings, quick view, wishlist, promoted results, and app search. |
| Prohibited | Duplicate inputs/grids/counts/filters, Homepage-style promotion above results, unlabelled promoted content, fabricated result sections, countdowns, and Custom Liquid as a default search solution. |

The current query precedes result interpretation. Controls stay near results; product results normally carry the commerce emphasis; mixed types are grouped or labeled; no-results recovery appears in the primary result region; and pagination follows the authoritative result set. Recommendations never look like matches.

## Component Composition

The Search Page composes existing components without redefining their responsibilities:

| Component or family | Search Page relationship |
| --- | --- |
| Search Input and form | Own query entry and native submission; the page determines one canonical placement and query context. |
| Predictive Search | Owns pre-submission suggestions and remains an external navigation enhancement, not this destination. |
| Product Grid, Product Card, Collection Card, article/page/result card | Own result layout and individual presentation. The page owns result-type grouping and priority. |
| Price, Badge, Rating, Review Summary, swatches, Quick Buy, Quick View | Present bounded product facts or optional integrations only when verified. |
| Filters, filter groups, Filter Drawer, Sort, Active Filters, result count, Pagination, Load More | Own refinement and continuation mechanics. The page owns their order, clarity, and state boundary. |
| Empty State, Alert, Inline Message, Validation Message, Loading Spinner, Skeleton, Status Indicator | Communicate accurate local state with the least disruption. |
| Responsive Image, Aspect Ratio, Placeholder Image | Render real media and restrained no-media geometry. |
| Section Heading, Rich Text, Container, Section, Grid, Stack, Cluster, Split, Sidebar Layout, Surface, Content Wrapper, Newsletter Form | Support verified optional composition but never replace the result region. |

Shopify owns query/result truth, ranking, data, filters, sort, and pagination. Sections own merchant-editable composition. The Search Page owns hierarchy, required roles, state boundaries, and result-type composition.

## Content Rules

Search content is derived from the submitted query and verified Shopify or approved integration results. It is concise, clearly labeled, understandable, and free from fabricated relevance claims.

### Query, headings, and status

Display the submitted query safely, preserve meaningful characters, escape untrusted input, and never silently rewrite it. Distinguish the original query from a verified correction or suggestion. The H1 identifies the Search Page; query text may appear within it only where localization, length, and escaping remain safe. Result count uses real data only and must not imply complete-store coverage when result-type scope is limited.

There is one H1. Result-type groups normally begin with H2; nested result groups may use H3. Filter labels use form/disclosure semantics, result counts are not headings, Empty State headings remain subordinate, and Product Card titles remain subordinate links. Query visibility never depends on JavaScript, and long queries wrap naturally.

### Results, products, filters, and sorting

Results preserve verified resource titles, images, excerpts, prices, availability, and type. Product results follow Product Card truth rules. Article, page, and collection results must be identifiable where ambiguity exists. Excerpts are real source content, not generated claims. A recommendation is never described as a match.

Filters use verified labels, values, counts, active state, and removal URLs. They distinguish unavailable, disabled, and unselected values. Sorting uses supported options, preserves selected state, and distinguishes relevance from price/date/title order; it must not claim personalized or “best” ranking without a real system.

### Suggestions, recovery, and promotion

Query corrections and suggestions require verified capability. Recent or popular search content needs privacy-safe, approved source data and must never reveal another person's query. Recommendations remain separate from matches. The page must not fabricate result counts, relevance scores, best-match claims, trends, demand, discounts, stock, badges, ratings, urgency, exclusivity, delivery, collection relationships, or promotion.

## Supported Variants

Search Page variants are controlled compositions based on verified query/result state, type diversity, filter utility, and real resources. They are not decorative presets.

| Variant | Select when | Composition |
| --- | --- | --- |
| Product-first | Products are the meaningful majority and commerce discovery is primary. | Prominent Product Grid, product-oriented refinement, restrained non-product results. |
| Mixed-content | Product, collection, article, and page results are all meaningful. | Clearly labeled/grouped types; products remain prominent when commerce intent is strongest. |
| Filter-led | Many product results and useful filter dimensions make narrowing valuable. | One clear filter model, Active Filters, supported sort, and authoritative results. |
| Compact | Result set is small or controls add noise. | Query and concise result list with only helpful refinement. |
| Editorial-content | Guides, articles, or pages materially answer informational intent. | Clear non-product result treatment without displacing strong commerce matches. |
| No-results recovery | Shopify returned no authoritative matches. | Editable form, factual message, optional verified correction, and separately labeled discovery. |

The selected variant records source evidence and composition reason. Visual preset styling remains outside Search Page ownership.

## Supported States

| State | Required page behavior |
| --- | --- |
| Empty query | Explain the ready-to-search state without pretending results exist. |
| Submitted query with results; small or large set | Preserve query, truthful count/type context, and authoritative result links. |
| Product-only or mixed result types | Prioritize commerce where appropriate and clearly distinguish non-product types. |
| Submitted query without results | Provide factual no-match feedback and an editable recovery route. |
| Filtered results or no results after filtering | Retain query and active filters, distinguish filtering absence from no match, and provide clear-filter recovery. |
| Sort applied, filters applied, or filters unavailable | Preserve state and URL; omit unsupported controls rather than inventing them. |
| Pagination, final page, invalid page parameter, or unsupported result-type parameter | Use safe Shopify URL/routing behavior and maintain meaningful continuation context. |
| Malformed, very long, or special-character query | Escape safely, wrap resiliently, and avoid breaking rendering or leaking internal data. |
| Product result without media or result with missing optional metadata | Use restrained fallback or omit empty content without false result facts. |
| Predictive or application search unavailable | Preserve native submitted search; local enhancement failure never blocks it. |
| Theme Editor preview or localized expansion | Use safe design-mode treatment, translated wrapping, and RTL-safe source order. |

Loading is distinct from empty. Query correction is distinct from replacement. No empty/no-results state may fabricate a result merely to fill a grid.

## Navigation and Actions

Primary actions are editing/submitting the search query and opening a verified result. Search Input and submit Button own query submission; result links own navigation.

Secondary actions may apply/remove/clear filters, change sort, switch verified result type, open/close a Filter Drawer, continue through results, use safe Quick Buy/View, accept a verified suggestion, open a clearly labeled recommendation, contact support when useful, or return to catalog browsing. Links navigate and buttons operate. Nested interactive elements are prohibited.

Product Card links remain present when Quick Buy exists. Quick View cannot trap the customer. Clearing filters preserves the submitted query. Query suggestions are visibly identified and do not erase original query history unexpectedly. Mobile drawers manage and restore focus; sort should not unexpectedly move focus to the top; pagination preserves browser history; promoted destinations and recommendations remain labeled.

## Responsive Behaviour

The Search Page is mobile first. Search Input, query context, status, and first results remain early at 320 px, 375 px, tablet, desktop, wide desktop, browser zoom, large text, translated labels, and RTL.

- Results preserve logical source order; CSS does not create inaccessible visual ordering.
- Search Input and authoritative result region are not duplicated for desktop/mobile without a documented responsive reason.
- Grids adapt to viewport and content; Product Cards and non-product cards remain readable; long queries and excerpts wrap rather than force overflow.
- The input remains usable with the on-screen keyboard. Type controls, filters, Active Filters, sort, result counts, and pagination remain touch safe, readable, and discoverable.
- A Filter Drawer, if implemented, is accessible; sidebar controls never cause horizontal overflow; safe-area insets and browser UI are respected.
- Essential content never disappears because a viewport is narrow.

The page owns content priority; components and layout primitives own responsive mechanics.

## Accessibility

The Search Page targets WCAG 2.2 AA:

- One main landmark, valid skip-link target, meaningful document title, and one page H1.
- A visible or visually-hidden-but-associated Search Input label, clear submit action, and safely understandable query value.
- Logical headings, accessible result-type controls, filters, group labels, sort, Active Filters, current pagination state, and clear-filter action.
- Suitable list/grid semantics, meaningful result-link names, visible type distinction, useful media alternatives, non-colour-only badges, and distinct names for Quick Buy/View.
- Keyboard operation for query input, predictive suggestions, filters, drawer, sort, cards, and pagination; visible focus, minimum touch targets, and no nested interactive controls.
- Native-dialog focus trap/restoration where drawer/modal is used; no focus loss or automatic focus jump after dynamic updates.
- Restrained live-region updates for real result, predictive, loading, and recovery changes; no repeated interruption. Empty/no-results and corrected-query messages are announced in context rather than asserted indiscriminately.
- Reduced motion, browser zoom, large text, RTL, stable source order, unique IDs, and unfocusable skeleton/placeholder output.

## SEO

Search Page SEO is bounded more cautiously than Product or Collection SEO. It defines document title, safely escaped query-dependent title boundaries, meta-description boundaries, canonical strategy, parameter handling, pagination, internal result links, social metadata, and localization boundaries; it does not promise rankings or make internal search pages compete with canonical commerce destinations.

Internal search pages should normally use a cautious `noindex` policy unless merchant SEO policy and the platform establish an approved exception. Query, filter, sort, and pagination combinations must not create uncontrolled indexable duplicates. Empty, malformed, and no-results queries do not create fabricated metadata or doorway pages. There is one H1; no hidden keywords, keyword stuffing, or claim that internal search improves rankings by default.

Current evidence: `meta-tags` emits `noindex,follow` for `request.page_type == search`, along with global canonical/title/description/social output. It does not currently make a query-specific metadata claim or emit explicit search social metadata. Shopify, merchant, theme, structured-data, and application metadata remain separate ownership layers.

## Structured Data

Search schema is optional and requires a clear SEO purpose. A future architecture may use one authoritative `SearchResultsPage`, `WebPage`, `ItemList`, and contextually justified `BreadcrumbList` only where verified query and rendered result data exist.

Any ItemList must match the authoritative rendered set, keep positions valid through filtering and pagination, distinguish mixed result types, escape query text safely, and omit recommended/promoted content from organic matches. It must not invent results, price, availability, ratings, or positions. Product Cards do not emit competing full Product schema by default, and sections/apps cannot duplicate SearchResultsPage or ItemList output. Empty-query and no-results pages remain valid.

Current evidence: `layout/theme.liquid` emits JSON-LD only for product and article contexts. No SearchResultsPage, ItemList, or Breadcrumbs runtime exists today. A future implementation must define canonical/filter/sort/pagination schema behavior before adding it.

## Shopify Settings

Merchants may control, where supported, Search Page presentation, product-card density, results-per-page within safe bounds, image ratio, vendor/price/badge/swatches/verified ratings, safe Quick Buy, predictive-search enablement, compatible filter/sort/Active Filter visibility, no-results supporting discovery, verified recommendations, app blocks, and controlled layout variants.

The Search Page may recommend one Input owner, one authoritative results region, one Product Grid for product matches, one filter/sort/Active Filter/pagination owner, clear type labeling, bounded density, safe page size, integration verification, and role-based order. Architecture retains semantic hierarchy, search truth, query escaping, filter/sort/pagination correctness, type distinction, source order, accessibility, tokens, breakpoints, motion, focus, schema, SEO, performance, lifecycle, and integration boundaries.

Merchants must not receive controls for fake results/counts/relevance/prices/discounts/ratings/badges, arbitrary ranking/filter/sort claims, raw CSS/JavaScript, arbitrary headings/schema/ARIA/breakpoints, unsafe query interpolation, deceptive promoted-result behavior, cart mutation, or direct checkout manipulation.

## Theme Editor Behaviour

The page uses one JSON-template `main-search` section. It is page-functionally required and single-instance. Header Predictive Search remains global; the separate `predictive-search` section serves Shopify predictive response rendering rather than an additional Search Page region. Header, Footer, cart drawer, and checkout remain outside page composition. Duplicate H1s, Search Inputs with conflicting state, authoritative grids, filter systems/drawers, sort systems, Active Filters owners, and pagination owners are prohibited.

On section load, the current runtime initializes facets and optional Predictive Search. On unload, it removes listeners, timers, and pending requests. The current source does not implement a full search-page result-region controller because filtering and sort retain native GET navigation; no stale client-rendered grid should be created. Theme Editor preview uses the safe empty-query guidance path rather than fabricated results.

Optional settings omit safely. Current implementation has no `@app` block schema in `main-search`, no alternate template, no mobile filter drawer, and no dedicated filtered-no-results composition. Future controls must preserve merchant configuration, unique IDs, one viable native search path, and no duplicate submissions or results.

## Performance Rules

Likely LCP is the first visible product-result image when results lead, the Search Page heading for text-led/empty states, or the first prominent mixed result image. Prioritize only actual first-view media; do not preload all result images, lazy-load the real LCP media, duplicate desktop/mobile images, or prefetch the full catalog.

Search Input, query context, controls, and initial Shopify result set are server rendered. Predictive Search, filter/sort submits, and optional integrations progressively enhance that baseline. Results must not wait for ratings, Quick Buy, recommendations, semantic search, or application widgets. Defer no-results recommendations, avoid polling, repeated search/facet controllers, duplicate result fetching/grids, heavy carousel/masonry libraries, excessive result count, and unnecessary observers.

Reserve card geometry and avoid shifts from media, price, badges, ratings, count, filters, and application blocks. Use responsive result images and defer secondary images. Infinite scrolling is not a default; any future variant retains accessible pagination/history. Risk review is required for large/mixed result sets, high-resolution images, swatches, ratings, quick actions, semantic search, large facets, client-side ranking, app merchandising, oversized excerpts, and excessive no-results recommendations.

## AI Guidelines

AI generates Search Pages deterministically from verified search capabilities and submitted query/result context. It does not create a search index, rank results, or invent what a customer meant.

### Required sequence

1. Confirm valid Search Page context and safely normalize/escape the submitted query without rewriting intent.
2. Confirm authoritative count, result types, filter/sort capability, and current URL state.
3. Assign one Search Page H1, one Search Input owner, and one authoritative results region.
4. Classify query length, result count/type diversity, product-card/media quality, refinement utility, Quick Buy safety, ratings, verified correction/suggestion, recommendations, integrations, merchant goals, and mobile needs.
5. Select one documented variant; prioritize products when commerce intent and real results warrant it; clearly separate mixed types.
6. Add filters/sort only when useful, then configure empty-query, no-results, filtered-no-results, and pagination states.
7. Add optional verified suggestions/recommendations/integrations only with labels and safe failure behavior.
8. Validate links, actions, source order, accessibility, performance, SEO, structured-data boundaries, and remove duplicate controls, grids, claims, and promotion.

AI should preserve submitted query context and Shopify resource titles/money; select Compact for small sets, Product-first when products dominate, Mixed-content only when types are meaningful, Filter-led only with useful filters, and No-results recovery only after no authoritative match. It keeps query/results early, uses one result set, preserves URL/query state, distinguishes promotions/recommendations, and omits unsupported capability.

AI must never invent results, counts, matches, prices, discounts, ratings, badges, relevance/best-match claims, popular/trending searches, corrections/suggestions, filters, sort options, promotion relationships, recommendations as matches, app capability, or customer attributes. It must not silently rewrite query intent, expose internal search data, duplicate inputs/grids/H1s, hide current query, bury results, default to Custom Liquid, require JavaScript for initial results, replace accessible pagination, manipulate ranking, alter checkout, or create urgency/scarcity.

### Deterministic selection matrix

| Verified condition | Preferred variant | Query / result-type strategy | Filter / sort strategy | Grid / card emphasis | Recommended supports | Omission first | Normal supports | Major validation risks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Empty query | Compact | Explain ready state; retain one editable input | Omit refinement | No fabricated grid | Search tip only if approved | Recommendations, trends, promotion | 0–1 | Treating empty query as no-match; unsafe placeholder copy. |
| Small product-only set | Compact or Product-first | Products form one clear list | Omit filters; sort only if useful | Clear low-density cards | One precise count | Tabs, drawer, editorial modules | 0–1 | Hidden query, invented count, unnecessary controls. |
| Medium product set | Product-first | Product results dominant | Supported sort; filters only where useful | Balanced responsive Product Grid | Active Filters when used | Repeated grids, generic promotion | 0–2 | Card truth, URL state, duplicate counts. |
| Large product set with useful filters | Filter-led | Products stay primary | One accessible filter model, Active Filters, supported sort, pagination | Efficient scanable grid | Filter recovery | Editorial/banners above results | 0–2 | Inaccessible mobile refinement, stale query/filter URL, excessive page size. |
| Mixed products and editorial content | Mixed-content | Clearly labeled/grouped types | Refine product results only when source supports it | Product Grid plus distinct content cards | Count/type context | Unlabeled mixing, promoted content | 0–2 | Type ambiguity, duplicate schema, article/page treated as product. |
| Informational query with article/page results | Editorial-content | Content cards lead; product links stay distinct if present | Omit irrelevant product filters | Scannable excerpts/cards | Verified support path | Product-first assumptions, recommendations | 0–2 | Fabricated excerpts, misleading type/status. |
| One exact match | Compact | One clear result with query context | Omit refinement | One concise real card/link | Optional “open result” path | Recommendation carousel, fake certainty label | 0–1 | Claiming best match without source, hiding other results. |
| No results | No-results recovery | Factual no-match, editable query | Omit unavailable controls | No fake grid | Verified correction or separate catalog link | Recommended products as matches | 0–1 | Replacing query, fabricated suggestion, loss of context. |
| No results after filtering | No-results recovery | Preserve query and active filters | Clear all filters, retain sort context | No fake grid | Return-to-unfiltered action | Empty query guidance, hidden filters | 0–1 | Confusing it with no Shopify match; clear action drops query. |
| App-enhanced search unavailable | Product-first, Mixed-content, or Compact fallback | Preserve native Shopify types/results | Omit failed integration controls | Native cards/results remain usable | Local factual feedback | App placeholders or fake results | 0–1 | Integration blocks search or mislabels fallback. |

Current implementation does not provide result-type tabs, mobile filter drawer, Load More/Infinite Search Page continuation, semantic search, or explicit collection-result cards. AI must mark those cases unsupported or implementation-dependent until their architecture is approved.

## Quality Checklist

- One clear Search Page purpose, safely rendered query context, H1, Search Input owner, and authoritative results region exist.
- Result count, resources, titles, types, prices, availability, filters, sort, Active Filters, pagination, and URLs are source-backed and understandable.
- Empty query, no results, filtered no results, loading, malformed query, missing media, integration, localization, and Theme Editor states are distinct and recoverable.
- Result links are valid; Quick Buy is optional and safe; no duplicate H1/input/grid/filter/sort/pagination owner or unsupported integration exists.
- No result, count, relevance, correction, suggestion, rating, discount, badge, urgency, or promoted-result claim is fabricated. Recommendations are distinct and labelled.
- Query/result order is early; optional content has a documented purpose and cannot interrupt primary scanning.
- Mobile source order, 320 px layout, input, filters, sort, cards, pagination, drawer, keyboard, focus, live announcements, reduced motion, zoom, translation, RTL, and media alternatives are valid.
- SEO is noindex/canonical/query safe, avoids duplicate combinations and doorway patterns, and does not compete with Product/Collection ownership.
- Optional search schema has a clear owner and valid result-type/pagination boundaries before output; duplicate schema is absent.
- LCP media, responsive images, deferred integrations, stable layout, minimal above-fold JavaScript, native no-JavaScript results, and Theme Editor cleanup are preserved.
- Deterministic AI selected the smallest sufficient variant, preserved Shopify search truth, escaped query data, and omitted unsupported features.

## Future Compatibility

Safe future extensions include controlled alternate Search Page templates, result-type navigation, verified semantic search, typo tolerance, query suggestions, privacy-safe recent searches, verified popular searches, approved promoted results, market-specific behavior, richer Search & Discovery integration, approved personalization, improved Quick Buy, controlled editorial ranking, accessible infinite loading with pagination fallback, search-quality/recovery/type-utility/filter-utility scoring, integration validation, preset defaults, and enforcement for required search roles.

Future extensions must retain Shopify or verified-integration source truth, customer privacy, clear promotion labels, accessible pagination, one coherent result set, heading hierarchy, progressive enhancement, merchant approval, and deterministic output. They must not fabricate results/suggestions, mandate integrations, silently change merchant settings, auto-enable apps, expose scripts/schema, infer sensitive attributes, expose another person's queries, permit deceptive ranking, or override explicit merchant configuration.

### Future implementation-hardening recommendations

- Add explicit collection-result cards and result-type labels/grouping for all Shopify-supported result types before promoting the current mixed grid as fully type-complete.
- Add an accessible mobile filter drawer and a dedicated filtered-no-results state that preserves query, active filters, and clear recovery.
- Establish a SearchResultsPage/ItemList ownership and canonical query/filter/sort/pagination policy before adding JSON-LD.
- Make the first visible result eligible for LCP treatment where it is the actual first-view content, without preloading the whole result set.
- Define result-type navigation, query correction, semantic/app search, promotional placement, and application block contracts before enabling them in Search Page composition.
- Preserve the native GET form and server-rendered query/result path as the required fallback for every future enhancement.

The specification is ready to guide future section documentation, preset composition, deterministic AI Search Page generation, implementation hardening, and later Collection List Page documentation.
