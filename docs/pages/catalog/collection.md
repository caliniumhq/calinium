# Collection Page

## Purpose

The Collection Page is the complete storefront destination for one verified Shopify collection. It orients a customer, presents the authoritative collection result set, and makes product discovery calm, clear, and useful.

Products remain the focus. Collection context helps customers understand what they are viewing; filtering and sorting reduce effort when they are meaningful. Luxury comes from restrained hierarchy, considered product-card density, and useful navigation—not excessive merchandising, fake badges, fabricated scarcity, hidden products, or promotional noise.

This specification owns collection hierarchy, orientation, grid and catalog-control placement, active-filter context, result continuation, collection empty and filtered no-results states, supporting content order, collection SEO and structured-data boundaries, mobile browsing priorities, Theme Editor composition, deterministic generation, and page-level performance. It does not own collection membership, product records, prices, inventory, filters, sort algorithms, recommendations, cart, checkout, component internals, or integration backends.

## Customer Goals

The Collection Page should answer, without requiring prior context:

1. What collection am I viewing?
2. What kinds of products are included?
3. How can I narrow the results?
4. How can I change their order?
5. What is available?
6. Which product should I open?
7. Are there more results?
8. How can I recover from no results?

Customers should be able to scan real Product Cards, understand the collection title and concise context, apply or remove meaningful filters, choose a supported sort, continue through real results, and open a verified product destination. Optional editorial or integration content must support discovery rather than delay it.

## Merchant Goals

The Collection Page should help merchants present authentic catalog organization and approved category context without requiring them to configure sorting logic, filter mechanics, responsive behavior, accessibility, pagination, or product-card internals.

Merchants manage Shopify collections, product membership, approved collection media, factual descriptions, and verified supporting content. Calinium recommends the smallest sufficient collection composition, card density, filtering threshold, sorting placement, and optional editorial support. Merchants approve meaningful merchandising and content decisions; they do not need to become catalog-interface designers.

## Shopify Context

The Shopify template type is `collection`. The current canonical template is `apps/theme/templates/collection.json`; it assigns `collection-banner` followed by `main-collection-product-grid`. One current `collection` object is authoritative for title, description, image, membership, storefront filtering, supported sort options, pagination, and the returned product result set. Product cards derive their prices, availability, images, and variants from Shopify product data and its localized money formatting.

The product grid is the primary functional region. Collection title and product discovery are not optional in a normal collection context. Filtering is conditional on meaningful Shopify filter data and catalog complexity; sorting is conditional on Shopify-provided options. Shopify Search & Discovery may supply filter data but remains outside page ownership. Query parameters, pagination, filters, and sort state remain Shopify-native through the collection URL and GET form. Global Header, Footer, skip link, `main` landmark, cart drawer, localization controls, and checkout remain outside Collection Page content regions.

The page defines roles and order, not raw section schemas. Unsupported integrations are omitted. Checkout is Shopify-owned; the page must never infer collection membership, availability, price, sort truth, or result count from visual presentation. No alternate collection template is currently present in the canonical theme.

### Current implementation evidence

- `collection-banner` is the first, single-instance collection section and renders the verified collection title as the H1. It can show the collection image or merchant image override, mobile image override, description, optional merchant editorial text, and a CTA only when label and destination exist. It can be contained or full width and has optional overlay treatment.
- `main-collection-product-grid` is the single primary browsing section. It server-renders a visually hidden H2 for the product result region, a GET filter/sort form, optional sidebar filters, result count, Shopify-provided sort select, active-filter links, Product Cards, native pagination, and an empty branch.
- Filters render only when `collection.filters` has values. Facets are server-rendered checkboxes, price inputs, and native disclosures. JavaScript progressively submits checkbox and sort changes; the normal GET form and visible Apply Filters action remain the fallback. Active filters use Shopify removal URLs and a collection URL clear-all destination.
- The current desktop filter layout can be sidebar or toolbar. On supported mobile browsers, the same panel moves into a native dialog and focus returns to the opener. Pagination defaults to server navigation; Load More and Infinite Scroll are progressive enhancements over the same links and push the next URL into browser history. Reduced motion keeps manual progression for infinite mode.
- Product Cards are shared with search, recommendations, and other collection contexts. They use real product media or a restrained placeholder, Shopify price, truthful sale or sold-out status, optional verified review metafield, actual Shopify swatches, tag-bound New/Limited labels, and Quick Add only for a single-variant available product. Multi-variant quick action is a product link; quick view and wishlist are hooks only, not implemented experiences.
- The template contains two active sections and no disabled template instances. The product cards are lazy loaded, including the first grid card. A banner image is eager/high-priority when present, making it the likely current LCP candidate; without one, the first visible card requires an LCP review.
- There is no collection Breadcrumbs runtime, no collection-specific JSON-LD, and no assigned app-block schema in the current template. Global metadata renders canonical URL, title, description when available, and collection image for social cards, but uses a generic Open Graph `website` type.
- The current zero-results branch uses one empty message and offers a clear-all link when filters exist; it does not yet give different customer-facing wording for an empty collection versus a completed filtered no-results state. Incremental pagination failures fall back to existing native pagination links with a restrained status message.

## Entry Conditions

A customer may arrive from global navigation, a mega menu, collection list, Homepage featured collection, Product Page collection link, search result, predictive search, Breadcrumbs, editorial content, direct URL, external campaign, search-engine result, social link, or localized collection URL.

The page must remain understandable without a Homepage visit, collection or brand knowledge, taxonomy knowledge, filter familiarity, knowledge of the default sort, sign-in, cart contents, prior browsing, known product count, or understanding of unavailable-product treatment. It must not personalize results from unverified identity or behavior.

## Page Structure

The conceptual structure is:

1. Global Header.
2. One `main` landmark.
3. Optional Breadcrumbs.
4. Collection orientation: title, optional concise description, and optional image or editorial media.
5. Catalog controls: useful result count, filtering, sorting, and active filters.
6. One primary Product Grid.
7. Pagination or another valid continuation model.
8. Optional collection education, related discovery, and low-pressure continuation.
9. Global Footer.

The first viewport prioritizes collection identity, concise orientation, useful controls, and visible product discovery. The grid must not sit below a long editorial introduction.

| Page density | Composition rule |
| --- | --- |
| Minimum valid | Collection orientation, one authoritative Product Grid, and an accurate result state. |
| Standard | Orientation, relevant controls, grid, pagination, and zero to two supporting regions. |
| Editorial | Orientation and grid first, then approximately one to three justified education or discovery regions. |
| More than three supports | Requires strong collection strategy, authentic resources, a customer purpose for each role, and a performance review. |

Filter groups, active-filter chips, sort controls, and pagination controls do not count as full page sections. A collection with no meaningful supporting content should remain compact.

## Required Regions

| Required role | Customer outcome | Page rule |
| --- | --- | --- |
| Collection identity | Recognize the destination. | One verified Shopify collection title is visible as the H1. |
| Primary product discovery | Browse the authoritative membership. | One Product Grid uses real Shopify result data and Product Cards. |
| Accurate result state | Understand what is currently shown. | Populated, empty, filtered no-results, pagination, and unavailable-product states remain distinct. |
| Product continuation | Open a product. | Each shown Product Card has a real, accessible product destination. |
| Result continuation | Reach more real results. | Native pagination or another valid, accessible continuation exists when results exceed one page. |
| Empty recovery | Understand no collection products. | A factual Empty State or equivalent explains successful absence without inventing products. |
| Filtered no-results recovery | Recover after active filtering. | When filters exist, the result region preserves collection identity and offers a clear real clear-filter path. |

The primary region may compose concise description or image, result count where useful, supported Sort, meaningful Filters, Active Filters, Product Grid, Product Cards, pagination or Load More when supported, and state-appropriate recovery. It must not hide the collection title or all result context; render filters only when meaningful data exists; render supported sort options only; fabricate counts, products, availability, badges, discounts, or cross-collection products; or require optional applications for basic browsing.

Core browsing, filters, sorting, and pagination must preserve Shopify-native URL and state behavior and remain useful without JavaScript wherever Shopify progressive enhancement permits it.

## Optional Regions

Every optional region needs a real discovery purpose and verified source content. None is required for basic collection validity.

| Optional role | Select only when | Omit when |
| --- | --- | --- |
| Breadcrumbs | A truthful, stable hierarchy improves orientation. | No runtime hierarchy is available or it duplicates global navigation. |
| Collection image, description, or editorial introduction | Approved media or concise category context clarifies browsing. | Media is weak, prose is filler, or it delays the first grid. |
| Subcollection navigation, tabs, or chips | Verified taxonomy supplies meaningful child destinations. | Relationships or destinations are unverified. |
| Filters, Active Filters, and Filter Drawer | Filter dimensions are meaningful and enough products benefit from narrowing. | The collection is small, values are weak, or source data is unavailable. |
| Sort and result count | Shopify exposes useful sort options or count meaningfully aids orientation. | Options are unsupported or count adds no clarity. |
| Quick Buy, Quick View, swatches, ratings, badges, or secondary image | The corresponding Shopify data or approved integration can safely support it. | They distract, are unsupported, or cannot remain truthful. |
| Collection story, image-with-text, category education, guide, FAQ, or comparison | Authentic collection education reduces a real product-discovery uncertainty. | It is generic, duplicated, unverified, or more appropriate after product discovery. |
| Related collections, recently viewed, or recommendations | Relationships, privacy-safe history, or Shopify results are verified and distinct. | Results are absent, repeated, irrelevant, or would fragment browsing. |
| Newsletter, trust reassurance, app blocks, or merchandising integration | A genuine approved strategy and compatible implementation exist. | It interrupts first browsing, lacks data, or makes a claim the page cannot verify. |

Promotional banners require a verified collection-wide offer and must not obscure or deceptively reorder the grid. Merchandising integrations must not hide products, change order, or create recommendations without an approved source. App failures remain local and never block catalog browsing.

## Section Composition

Collection composition is deterministic and discovery first:

1. Collection orientation.
2. Catalog controls.
3. Product discovery.
4. Result continuation.
5. Optional category education.
6. Related discovery.
7. Low-pressure continuation.

A typical page is optional Breadcrumbs, Collection Header or Banner, controls, Product Grid, pagination, optional story or guide, related collections, and optional newsletter. Every stage after the grid is conditional.

| Classification | Collection Page rule |
| --- | --- |
| Globally required | Header, Footer, skip link, and main landmark are global rather than collection content. |
| Page-functionally required | One orientation owner/H1, one Product Grid, accurate result state, and valid continuation when needed. |
| Recommended | Concise collection context and useful control model proportionate to catalog size. |
| Optional | Editorial, guides, media, related collections, newsletter, trust, promotion, and roles listed above. |
| Repeatable | Carefully bounded education or related-discovery regions, each with a distinct verified purpose. |
| Single-instance | Collection H1, primary orientation, Product Grid, filter system, sort system, Active Filters owner, and pagination owner. |
| Integration-dependent | Ratings, quick view, wishlist, advanced swatches, recommendations, app merchandising, and advanced filtering. |
| Prohibited | Duplicate titles/grids/filters, unrelated Homepage-style sections, several recommendation carousels, deceptive product ordering, unsupported Custom Liquid, and fabricated countdown or scarcity patterns. |

Collection identity precedes the grid semantically; discovery stays early. Controls remain near the results they affect, Active Filters near controls and results, no-results recovery in the result region, and pagination after the grid. Long editorial content, newsletter capture, and related collections never interrupt the first browsing sequence.

## Component Composition

The page composes existing components without taking their bounded responsibilities:

| Component or family | Collection Page relationship |
| --- | --- |
| Breadcrumbs and Collection Header/Banner role | Provide optional orientation; the page determines whether they are useful and who owns the H1. |
| Collection Grid and Product Card | Own result layout and individual product presentation. The page owns one authoritative result set and its placement. |
| Price, Badge, Rating, Review Summary, variant swatches, Quick Buy, Quick View | Remain bounded product-card information or integrations and require real source data. |
| Filters, filter groups, Filter Drawer, Sort, Active Filters, result count, Pagination, Load More | Own filtering, ordering, applied-state display, and navigation mechanics. The page owns their order and state clarity. |
| Empty State, Alert, Inline Message, Loading Spinner, Skeleton, Status Indicator | Communicate the least disruptive accurate state; an Empty State never conceals error or loading. |
| Responsive Image, Aspect Ratio, Placeholder Image | Render real product or collection media and restrained fallback geometry. |
| Section Heading, Rich Text, Accordion, FAQ, Newsletter Form | Support optional category education or continuation only when their content is verified. |
| Button, Icon Button, native links, Disclosure, Drawer, Modal | Present actions and interactions; links navigate, buttons operate. |
| Container, Section, Grid, Stack, Cluster, Split, Sidebar Layout, Surface, Content Wrapper, Collection Card | Own layout or related-collection mechanics. The page owns priority and source order. |

Sections own merchant-editable composition. Shopify owns membership, product data, money, availability, filtering, sorting, and pagination truth. The Collection Page owns overall hierarchy, required roles, state boundaries, and role selection.

## Content Rules

Collection content must be verified, specific, concise when orientation is sufficient, detailed only where category education improves discovery, and sourced from Shopify or approved merchant resources.

### Collection title and heading hierarchy

The verified Shopify collection title is the authoritative page H1 and normally belongs to the Collection Header or Banner role. Hero, Section Heading, app block, eyebrow, product count, or another region must not duplicate it. Major regions normally use H2; nested content may use H3. Filter-group labels use appropriate form or disclosure semantics rather than heading inflation. Product Card titles remain subordinate and link to real products. Long collection titles wrap naturally and remain visible without JavaScript.

### Description, product cards, and media

Collection description explains what the collection contains or a meaningful category distinction. It avoids generic filler, unsupported superlatives, keyword stuffing, copied competitor content, and hiding purchase-critical facts in a long introduction.

Product Cards preserve Shopify product title, money formatting, available compare-at price, availability, media, and real option relationships. Ratings require verified data; badges require verified sale, availability, or approved tag rules. Cards never display another product's media, fake savings, fabricated ratings, invented swatches, or unsupported best-seller, limited, or new claims. Their information remains consistent enough for comparison.

Collection and product media uses approved source media, meaningful alternatives, and honest colour representation. Decorative media must not delay product discovery without adding category context.

### Filters, sorting, and promotions

Filters use Shopify-provided labels, values, counts, and removal paths. They do not rename values without approved rules, invent dimensions, or hide active selections. Sorting uses supported Shopify options, preserves current state, and clearly distinguishes merchant order from price, date, or title ordering. Neither control implies personalized behavior without a verified system.

The page must not fabricate discounts, stock, low-stock urgency, best-seller or trending labels, customer/review counts, sustainability, certifications, awards, deadlines, delivery, exclusivity, limited edition, or product relationships.

## Supported Variants

Collection Page variants are controlled strategic compositions based on verified catalog size, similarity, resources, and browsing complexity. They are not decorative presets.

| Variant | Select when | Composition |
| --- | --- | --- |
| Grid-first | Efficient product discovery is primary, products are clear from cards, and editorial context is limited. | Concise header, early grid, restrained controls, minimal supports. |
| Editorial | Verified collection story or category education materially helps discovery and authentic media exists. | Grid remains early; one evidence-led story or guide supports it. |
| Filter-led | The collection is large and several meaningful Shopify filter dimensions reduce effort. | Clear sidebar/drawer, Active Filters, useful sort, and one grid. |
| Visual | Product imagery drives discovery and larger media remains practical for the catalog density. | Media-led cards with restrained controls and no loss of comparable facts. |
| Compact | Collection is small, filters add no value, or resources are limited. | One concise orientation region and one grid with minimal supports. |
| Launch-focused | A verified collection launch or seasonal release is active and has an approved transition. | Normal discovery stays available; any timing or promotion is factual and subordinate. |

The selected variant records the collection evidence and composition reason. “Trendy,” “premium,” or another aesthetic adjective is not a valid page variant; visual presets remain outside page ownership.

## Supported States

| State | Required page behavior |
| --- | --- |
| Collection with products; small or large collection | Render the authoritative product set with density and controls proportionate to real scale. |
| Empty collection | Preserve collection identity, explain successful absence honestly, and provide only a real next action. |
| Filtered results or no results after filtering | Keep collection context, reflect active filters, and provide an obvious clear-filter recovery path. Do not substitute recommendations for the authoritative grid. |
| Sort applied or filters applied | Preserve visible selected state, understandable result context, URL behavior, and pagination relationship. |
| Filters unavailable | Omit controls rather than inventing attributes or disabled-looking empty controls. |
| Loading enhancement | Preserve server-rendered results; loading is not empty and should not hide native controls. |
| Pagination, final page, or invalid page parameter | Identify current position and use safe Shopify URL/routing behavior without fabricated results. |
| Product unavailable, missing media, or missing optional metadata | Present real product status, restrained placeholder, or omit empty metadata without breaking card comparison. |
| Integration or app merchandising unavailable | Fail locally without blocking grid, filters, sorting, or product links. |
| Theme Editor preview, localized expansion, or unavailable/unpublished collection boundary | Use safe design-mode context, resilient text/direction, and Shopify publishing/routing behavior. |

State changes preserve keyboard and screen-reader clarity. No collection state may invent products merely to make a grid look populated.

## Navigation and Actions

The primary customer action is opening a verified product. Product Card links own product navigation and remain available when Quick Buy or Quick View is enabled.

Secondary actions may apply, remove, or clear filters; change sort; open or close Filter Drawer; navigate or load more results; Quick Buy or Quick View when safely supported; open a subcollection or related collection; continue browsing; or return to a broader catalog context. Every destination must be verified.

Filter controls own narrowing; sort controls own ordering; pagination links own page navigation; buttons own operations. A link must not carry a filter mutation that requires button semantics, and disabled links must not impersonate unavailable pagination. Mobile Filter Drawer opens, closes, traps focus through its native dialog behavior, and restores focus. Sorting must not unexpectedly send focus to the page top. Pagination and progressive result continuation preserve meaningful browser history.

## Responsive Behaviour

The Collection Page is mobile first. Collection title and Product Grid remain early at 320 px, 375 px, tablet, desktop, wide desktop, browser zoom, large text, translated labels, and RTL.

- Controls preserve logical source order; CSS does not visually reorder them into an inaccessible reading order.
- Product grids, collection headings, and essential filter capability are never duplicated into separate desktop/mobile destinations.
- Grid columns adapt to viewport and content; Product Card titles and prices wrap naturally; badges do not obscure images; image ratios remain stable.
- Filters collapse into an accessible drawer when appropriate; sorting remains clear within the chosen combined or separate control model; Active Filters and result counts wrap safely.
- Swatches, Quick Buy, pagination, drawer controls, and links stay touch safe. Sidebar filters never create horizontal overflow.
- Long collection description does not push the first grid beyond practical reach. Safe-area insets, browser UI, and source order remain respected. No content disappears merely because the viewport is narrow.

The page owns content priority; components and layout primitives own responsive mechanics.

## Accessibility

The Collection Page targets WCAG 2.2 AA and composes component contracts into one coherent browsing destination:

- One main landmark, valid skip-link target, meaningful document title, and one collection-title H1.
- Logical heading hierarchy and accessible Breadcrumbs when a truthful runtime trail exists.
- Associated filter labels, meaningful filter-group names, selected/disabled/unavailable state beyond colour, and understandable Active Filters with clear removal action.
- Keyboard-operable filters, native or accessible sort, mobile Filter Drawer, product links, Quick Buy/View where implemented, and pagination with an accessibly identified current page.
- Native dialog focus management and focus restoration; no focus loss from dynamic filtering and no automatic focus movement without a clear cause.
- Product grid list or grid semantics, meaningful Product Card link names, useful image alternatives, no nested interactive controls, non-colour-only badges, and distinct accessible names for card actions.
- Restrained result and progressive-loading announcements, state-appropriate empty/no-results feedback, visible focus, minimum touch targets, reduced motion, browser zoom, large text, RTL, and stable logical source order.
- Placeholders, hidden secondary images, and inactive controls must not create confusing focus targets.

## SEO

The Collection Page owns destination-level collection SEO boundaries, not product or category invention. It requires a unique verified collection title, merchant-authored or Shopify-managed meta description where available, canonical collection URL, one H1, authentic concise description, useful internal product and related-collection links, image alternatives, and careful localization boundaries.

Filter and sort parameters must not create uncontrolled duplicate-content ownership. Pagination needs a documented canonical strategy; collection-linked product URLs retain Product Page canonical ownership. Empty filtered states do not create fabricated metadata. The page must not use hidden keywords, keyword stuffing, copied competitor content, doorway collection pages, uncontrolled indexing of filter/sort combinations, or ranking promises.

Current evidence: `meta-tags` renders Shopify `canonical_url`, title, description when present, and collection image for social cards. It does not currently provide collection-specific Open Graph type or explicit alternate-language metadata. Shopify, merchant, theme, structured-data, and application-generated metadata remain distinct owners.

## Structured Data

The Collection Page may own one authoritative `CollectionPage` or `ItemList` output, with `BreadcrumbList` or `WebPage` only where source data and ownership are clear. Any schema uses verified Shopify collection and rendered product-result data.

Item positions, product references, price, availability, pagination, filtering, and sorting must remain consistent with the authoritative result set. The page never invents products, list positions, prices, availability, ratings, or review counts. Product Cards do not emit competing full Product schema unless a future architecture explicitly assigns that responsibility. Breadcrumb schema has one owner; sections and apps must not produce duplicate CollectionPage or ItemList output. JSON-LD remains valid for empty collections.

Current evidence: the global layout emits structured data only for product and article contexts. No collection JSON-LD or Breadcrumbs runtime currently exists, so a future implementation must establish canonical/filter/sort/pagination and duplicate-schema rules before adding it.

## Shopify Settings

Merchants may control section order and presence; collection image and description visibility; collection-header layout; controlled grid density and products per page; image ratio; secondary image, vendor, compare-at price, truthful badges, real swatches, Quick Buy, verified rating visibility; filter layout and visibility; sticky desktop filters; mobile drawer; pagination presentation; related collection content; approved editorial content; and compatible integration hooks.

The Collection Page may recommend one primary collection region, one H1, one Product Grid, one filter system, one sort system, one Active Filters owner, one pagination owner, bounded density, safe products-per-page ranges, bounded recommendation regions, integration verification, and role-based order. Architecture retains semantic hierarchy, Shopify catalog truth, pagination correctness, source order, accessibility, tokens, breakpoints, motion, focus, schema ownership, performance, Theme Editor lifecycle, and integration boundaries.

Merchants must not receive controls for fake counts, prices, discounts, stock, ratings, badges, arbitrary ordering claims, invented filters or sort algorithms, raw CSS/JavaScript, arbitrary headings/schema/ARIA/breakpoints, unrestricted page size, deceptive hiding, cart mutation, or direct checkout manipulation.

## Theme Editor Behaviour

The page uses JSON template composition. `collection-banner` is the current single orientation/H1 owner; `main-collection-product-grid` is the page-functionally required single grid owner. Additional content is optional or integration-dependent, while Header, Footer, cart drawer, and checkout are outside Collection Page composition. Duplicate H1s, Product Grids, filter drawers, filter systems, sort systems, Active Filters owners, and pagination owners are prohibited.

On section load, the current runtime initializes the facets form and the premium collection controller. On section unload, it removes listeners and observers, returns moved filter content to its home, and closes a mobile dialog safely. The controller is singleton-safe per section and retains native form/pagination behavior as the fallback. Collection media, product results, filters, sort, and pagination must not leave stale query state or duplicate rendering after rerender.

Theme Editor previews may show only design-mode-safe empty guidance. Published storefronts must not expose setup copy or invented products. Empty optional settings omit cleanly. Current implementation shows the canonical two-section baseline but does not yet enforce every ideal invalid-composition safeguard, such as preventing a merchant-enabled duplicate description or providing distinct empty-versus-filtered-no-results copy.

## Performance Rules

Likely LCP is the prominent collection image when shown, otherwise the first visible product image or collection title in a text-led layout. Prioritize only first-view real media. Do not preload every Product Card image or secondary image, lazy-load the actual LCP image, duplicate desktop/mobile downloads, or let editorial media delay the grid.

Collection title, controls, and initial results are server rendered. Filtering, sorting, mobile drawer movement, Load More, and Infinite Scroll progressively enhance the native GET form and pagination. The page must not download the full catalog into the browser, block discovery on ratings, Quick Buy, recommendations, or integrations, poll, duplicate controllers/grids/fetches, or use a heavy masonry/carousel library where CSS Grid suffices.

Maintain stable card media geometry and avoid layout shifts from badges, price, ratings, filter panels, app blocks, and loading. Defer below-fold media, related discovery, and integrations. Infinite scrolling is never the default; when used it preserves accessible pagination and history. Risk review is required for large product counts, high-resolution or secondary images, widespread swatches, reviews, quick actions, large filter sets, app merchandising, videos, repeated grids, client-side sorting, and excessive below-fold sections.

## AI Guidelines

AI generates Collection Pages deterministically from verified Shopify collection context, product result data, approved merchant resources, collection strategy, and the capability map. It never invents a catalog.

### Required sequence

1. Confirm current collection context, membership, result count, and available product data.
2. Preserve the verified collection title as the H1.
3. Classify catalog size, available-product count, coherence, visual similarity, informational complexity, collection media/description quality, filter/sort availability and utility, card resource quality, variants, swatches, Quick Buy safety, ratings, related collections, editorial strength, promotion timing, approved integrations, merchant goals, and mobile browsing needs.
4. Select one documented page variant, one orientation owner, and one authoritative Product Grid.
5. Add filters and sorting only when Shopify supports them and they reduce customer effort.
6. Configure truthful cards, result states, and valid pagination or continuation.
7. Add only verified supporting content and integrations, then validate links, actions, responsive behavior, accessibility, performance, SEO, structured data, and failure behavior.
8. Remove repeated controls, grids, claims, and promotional content.

AI should use real Shopify collection/product data and money formatting; keep discovery early; select Compact or Grid-first for simple collections; use Filter-led only when filters are meaningful; use Editorial only with authentic content; use Visual only when media merits larger cards; preserve active-filter recovery, source order, pagination URL state, and one H1/grid; and prefer omission over filler.

AI must never invent collections, membership, products, titles, prices, discounts, badges, best sellers, stock, availability, ratings, reviews, filters, sort options, counts, subcollections, relationships, swatches, Quick Buy compatibility, launch timing, campaign claims, or application capabilities. It must not duplicate the main region, grids, H1s, controls, or schema; bury the grid; default to Custom Liquid; require JavaScript for initial products; replace accessible pagination with inaccessible infinite loading; manipulate order deceptively; hide unavailable products without a verified rule; alter checkout; or create scarcity.

### Deterministic selection matrix

| Verified condition | Preferred variant | Orientation priority | Filter / sort strategy | Grid / card emphasis | Recommended supports | Omission first | Normal supports | Major validation risks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Small collection, fewer than about eight products | Compact | Concise title; description only if useful | Omit filters; show sort only if Shopify options add value | Two to four calm columns; clear card facts | One concise category note | Editorial, drawers, recommendations | 0–1 | Filler, missing empty state, deceptive density. |
| Medium collection | Grid-first | Brief orientation | Useful Shopify sort; filters only with meaningful attributes | Balanced responsive grid and comparable cards | Optional related collection | Repeated story and carousels | 0–2 | Grid buried, duplicate title/count, inconsistent card data. |
| Large collection with meaningful filters | Filter-led | Brief title and count | Sidebar/drawer filters, Active Filters, supported sort, native pagination | Efficient grid; cards prioritize scanability | Buying guide only if it solves a filter question | Decorative banner, irrelevant recommendations | 0–2 | Stale URL/state, inaccessible drawer, too many products or filters. |
| Visually driven collection | Visual | Media-led but concise orientation | Restrained controls proportional to scale | Larger imagery with title/price remaining clear | One approved collection image or story | Technical tables, crowded badges | 0–2 | Slow LCP, misleading colour, card facts hidden by imagery. |
| Technical or attribute-driven collection | Filter-led or Grid-first | Clarify meaningful category distinction | Verified filters and supported sort prioritized | Cards expose stable factual comparison | Guide, FAQ, or comparison only with verified facts | Decorative editorial content | 1–2 | Invented attributes, unclear filter labels, inaccessible comparison. |
| Editorial or craftsmanship-led collection | Editorial | Approved category story without delaying grid | Minimal controls unless catalog requires them | Calm grid with authentic visual support | One evidence-led story or guide | Generic brand narrative, fake proof | 1–3 | Story before discovery, unsupported craft or origin claims. |
| Limited content resources | Compact | Verified title only; no forced media | Omit unsupported filters/sort | Standard clear cards or restrained empty state | None unless real | Banner, story, reviews, recommendations | 0–1 | Empty wrappers, fake collection context, invented promotions. |
| Verified collection launch | Launch-focused | Product discovery and factual launch context | Normal filters/sort where useful | Grid remains primary | Fixed-date approved notice and transition plan | Rolling countdown, fake scarcity | 0–2 | Expired campaign, unsupported deadline, product order manipulation. |
| Empty collection | Compact state | Retain truthful collection identity | Omit unavailable controls | Empty State, not fake cards | One real broader-catalog action if available | Recommendations as replacement grid | 0–1 | Treating empty as error, fabricated products, lost orientation. |
| Sold-out or heavily unavailable collection | Grid-first or Compact | Title and truthful result context | Real filters/sort only | Cards retain factual unavailable status | Related collection only when verified | Fake restock timing or automatic replacement | 0–1 | Hiding availability, pressure language, inaccurate badges. |

## Quality Checklist

- One clear Collection Page purpose, verified Shopify collection context, authoritative H1, orientation owner, and Product Grid exist.
- Product membership, result count, price, availability, titles, images, compare-at pricing, badges, ratings, swatches, filters, sort options, Active Filters, and pagination are truthful and source-backed.
- Empty collection and filtered no-results are distinct, recoverable, and never filled with fabricated products.
- Product links are valid; Quick Buy is optional and safe; no duplicate title, Product Grid, filter/sort/Active Filter/pagination owner, conflicting card action, or unsupported integration exists.
- Discovery appears early; editorial, related, recommendation, promotion, and newsletter content has a documented customer purpose and cannot interrupt the primary browsing sequence.
- Mobile source order, 320 px layout, zoom, large text, translation, RTL, cards, filters, sorting, drawer, Active Filters, pagination, keyboard, focus, reduced motion, image alternatives, and result announcements are valid.
- SEO has authentic metadata, a canonical query/pagination strategy, internal links, no duplicate-content pattern, and no keyword stuffing.
- One valid CollectionPage/ItemList owner exists before schema is introduced; no duplicate collection, Product, or Breadcrumb schema is emitted.
- LCP media is prioritized correctly; later card media and integrations defer; responsive images, stable layout, minimal above-fold JavaScript, native browsing fallback, and Theme Editor lifecycle cleanup are preserved.
- Deterministic AI selected the smallest sufficient variant, preserved Shopify catalog truth, and omitted unsupported features and unverified claims.

## Future Compatibility

Safe future extensions include controlled alternate collection templates, product-type-specific variants, richer Shopify block nesting, subcollection navigation, verified merchandising and promotional product placement, controlled editorial inserts, richer filter presentation, advanced swatches, verified personalization, stronger recommendation strategies, market-specific collection content, improved Quick Buy, accessible infinite-loading with pagination fallback, completeness and filter-utility scoring, product-card density scoring, automated resource validation, preset defaults, and implementation enforcement for required roles.

These extensions must preserve Shopify source-of-truth ownership, one coherent Product Grid and result set, accessible pagination, heading hierarchy, progressive enhancement, merchant approval, and deterministic generation. They must not fabricate collection/product data, mandate integrations, silently update merchant settings, auto-enable applications, expose arbitrary scripts/schema, create deceptive sort or scarcity, hide products through unverified personalization, remove accessible continuation, or override explicit merchant configuration.

### Future implementation-hardening recommendations

- Add a controlled Breadcrumbs implementation and assign one BreadcrumbList owner before emitting breadcrumb schema.
- Establish one validated collection JSON-LD strategy for canonical, filtered, sorted, paginated, and empty states before adding CollectionPage or ItemList output.
- Differentiate current empty-collection and filtered no-results copy and recovery behavior; the current shared branch is serviceable but not sufficiently explicit.
- Make the first visible product card eligible for non-lazy LCP treatment when no prominent collection image exists, without preloading the entire grid.
- Prevent duplicate title/description output when Collection Banner and grid-description settings are both enabled, and enforce one viable product-discovery fallback if the main grid is misconfigured.
- Define explicit app-block, quick-view, wishlist, rating, and advanced merchandising contracts before promoting their page-level roles beyond current safe hooks.

The specification is ready to guide future section documentation, preset composition, deterministic AI Collection Page generation, implementation hardening, and later Search Page documentation.
