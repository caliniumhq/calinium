# Section Library Classification

## Purpose

This document audits and classifies the complete existing Calinium section brief library before any Canonical Section Specification is created. It determines what each brief represents, how it relates to current Shopify runtime evidence, and how it should enter the future Section Specification phase.

The classification is deliberately not a conversion. It does not rename, move, merge, deprecate, or replace any existing brief. It creates no canonical Section Specification and makes no implementation change. Proposed destinations and canonical names in this document are future-facing labels, not files created by this task.

It preserves the governing distinction: `Brief ≠ Specification ≠ Implementation`.

## Classification Principles

Classification follows actual responsibility, source evidence, and page role—not filename, marketing language, visual novelty, or the existence of a similarly named Liquid file.

- A **Standalone Section** has a clear page-region responsibility, merchant configurability, bounded settings, and meaningful independent reuse.
- A **Section Family** represents several related section types or a canonical system with shared purpose, components, settings, or implementation patterns.
- A **Variant** changes presentation or behavior inside another canonical section or family rather than requiring a separate canonical section.
- A **Composition Pack** coordinates sections, variants, blocks, or page patterns and is not itself one merchant-editable page region.
- A **Global Architecture** candidate belongs to header, footer, cart, navigation, overlays, or another global theme system rather than ordinary page composition.
- A **Component Candidate** or **Block Candidate** is too small or too reusable to own an independent page region.
- A **Commerce Behaviour** describes data source, recommendation, curation, privacy, or merchandising logic rather than an independently reusable visual responsibility alone.
- A **Preset Input** informs curated theme composition but is not itself a section.
- **Source Material Only** remains useful requirement or inspiration evidence without becoming canonical documentation.
- A **Duplicate or Overlap** substantially repeats another brief’s responsibility and must be preserved without creating a parallel canonical owner.

No brief is forced into a canonical section. A direct runtime match establishes implementation evidence only; it does not automatically establish page eligibility, safe AI selection, or canonical documentation ownership.

## Evidence Sources

The classification inspected:

- all 42 existing Markdown briefs in `docs/sections/`;
- `docs/sections/README.md` and its Canonical Section Specification governance;
- `docs/pages/README.md` and all completed Homepage, Product, Collection, Search, Collection List, Cart, Standard Page, Contact, Blog, Article, and 404 specifications;
- relevant documented component contracts, including Section Heading, Button, Product Card, Product Gallery, fields, feedback, responsive media, navigation, layout, and overlays;
- current `apps/theme/sections/*.liquid` implementations and Shopify schemas;
- all current JSON template assignments and global header/footer groups;
- related snippets, section-scoped CSS, JavaScript lifecycle controllers, generated section-capability catalog, implementation rules, presets, and Theme Editor evidence.

Evidence labels in the authoritative table mean:

| Label | Meaning |
| --- | --- |
| Full | A matching runtime section/system and Shopify schema exist; the brief’s primary stated responsibility is materially represented. This does not mean a Canonical Section Specification already exists. |
| Partial | Relevant child sections or runtime behavior exist, but the brief itself is a pack/family or does not map to one runtime object. |
| None | No relevant runtime evidence was found. |
| Unclear | Evidence exists but is insufficient to determine whether the brief’s stated responsibility is implemented. |

## Classification Types

Only these primary classifications are used:

```text
Standalone Section
Section Family
Variant
Composition Pack
Global Architecture
Component Candidate
Block Candidate
Commerce Behaviour
Preset Input
Source Material Only
Duplicate or Overlap
Needs Further Evidence
```

Every brief receives exactly one primary classification in the authoritative table. A brief can also have secondary relationships, such as belonging to a family, sharing components, supplying a preset, or overlapping another responsibility.

## Existing Library Summary

All 42 existing briefs were inspected and classified exactly once. The classification total reconciles to the complete brief library.

| Primary classification | Count |
| --- | ---: |
| Standalone Section | 22 |
| Section Family | 3 |
| Variant | 4 |
| Composition Pack | 3 |
| Global Architecture | 3 |
| Component Candidate | 0 |
| Block Candidate | 0 |
| Commerce Behaviour | 5 |
| Preset Input | 1 |
| Source Material Only | 0 |
| Duplicate or Overlap | 1 |
| Needs Further Evidence | 0 |
| **Total** | **42** |

| Provisional category | Count |
| --- | ---: |
| `foundation/` | 1 |
| `content/` | 1 |
| `commerce/` | 14 |
| `media/` | 4 |
| `editorial/` | 12 |
| `marketing/` | 5 |
| `social/` | 1 |
| `navigation/` | 1 |
| `forms/` | 0 |
| `utility/` | 0 |
| `system/` | 3 |
| **Total** | **42** |

Implementation evidence is Full for 39 briefs and Partial for 3 composition packs. No brief has None or Unclear evidence. The three Partial records are packs whose listed child systems are implemented but which do not themselves correspond to one Shopify runtime section. No founder decision is required to begin classification or the recommended low-risk first conversion batch.

The following table is the authoritative per-file classification. Proposed destinations are planning labels only and do not create files.

| Existing brief | Primary classification | Proposed canonical destination | Category | Implementation evidence | Overlaps with | Recommended action | Priority |
| -------------- | ---------------------- | ------------------------------ | -------- | ----------------------- | ------------- | ------------------ | -------- |
| `awards-certifications.md` | Standalone Section | Proposed `social/awards-certifications.md` | `social/` | Full | `sustainability.md` | Convert | P2 |
| `behind-the-scenes.md` | Standalone Section | Proposed `editorial/behind-the-scenes.md` | `editorial/` | Full | `craftsmanship.md`, `manufacturing-process.md` | Convert | P2 |
| `brand-manifesto.md` | Standalone Section | Proposed `editorial/brand-manifesto.md` | `editorial/` | Full | `brand-values.md`, `story-banner.md` | Convert | P2 |
| `brand-storytelling-pack.md` | Composition Pack | Brand-storytelling preset and family input | `editorial/` | Partial | Its ten child briefs | Use as preset input | Deferred |
| `brand-timeline.md` | Standalone Section | Proposed `editorial/brand-timeline.md` | `editorial/` | Full | `founder-story.md`, `manufacturing-process.md` | Convert | P2 |
| `brand-values.md` | Standalone Section | Proposed `editorial/brand-values.md` | `editorial/` | Full | `brand-manifesto.md`, `sustainability.md` | Convert | P2 |
| `collection-carousel.md` | Standalone Section | Proposed `commerce/collection-carousel.md` | `commerce/` | Full | `collection-tabs.md`, `featured-categories.md` | Convert | P1 |
| `collection-tabs.md` | Standalone Section | Proposed `commerce/collection-tabs.md` | `commerce/` | Full | `collection-carousel.md` | Convert | P1 |
| `commerce-merchandising-pack.md` | Composition Pack | Commerce preset and family input | `commerce/` | Partial | Its twelve child briefs | Use as preset input | Deferred |
| `complementary-products.md` | Commerce Behaviour | Product complementary-data behavior plus renderer | `commerce/` | Full | `product-recommendations.md`, `cross-sell-products.md` | Split | P1 |
| `craftsmanship.md` | Standalone Section | Proposed `editorial/craftsmanship.md` | `editorial/` | Full | `materials.md`, `manufacturing-process.md`, `behind-the-scenes.md` | Convert | P2 |
| `cross-sell-products.md` | Commerce Behaviour | Curated cross-sell behavior plus renderer | `commerce/` | Full | `product-carousel.md`, `complementary-products.md`, `product-bundle-showcase.md` | Split | P1 |
| `editorial-grid.md` | Standalone Section | Proposed `content/editorial-grid.md` | `content/` | Full | `lookbook.md`, `featured-categories.md` | Convert | P2 |
| `editorial-hero-pack.md` | Composition Pack | Hero/editorial preset and family input | `marketing/` | Partial | Its listed hero and editorial briefs | Use as preset input | Deferred |
| `editorial-hero.md` | Variant | Proposed `marketing/hero-system.md#editorial` | `marketing/` | Full | `premium-hero.md`, `full-screen-hero.md`, `split-hero.md` | Treat as variant | P1 |
| `featured-categories.md` | Standalone Section | Proposed `navigation/featured-categories.md` | `navigation/` | Full | `collection-carousel.md`, `collection-tabs.md`, `editorial-grid.md` | Convert | P1 |
| `founder-story.md` | Standalone Section | Proposed `editorial/founder-story.md` | `editorial/` | Full | `brand-manifesto.md`, `brand-timeline.md`, `team.md` | Convert | P2 |
| `full-screen-hero.md` | Duplicate or Overlap | Stable-ID compatibility record under hero system | `marketing/` | Full | `premium-hero.md` | Deprecate after preservation | P0 |
| `homepage-bootstrap.md` | Preset Input | Homepage bootstrap/preset composition input | `foundation/` | Full | `premium-hero.md`, Homepage specification | Use as preset input | P0 |
| `image-mosaic.md` | Standalone Section | Proposed `media/image-mosaic.md` | `media/` | Full | `lookbook.md`, `behind-the-scenes.md` | Convert | P2 |
| `lookbook.md` | Standalone Section | Proposed `media/lookbook.md` | `media/` | Full | `image-mosaic.md`, `shop-the-look.md`, `editorial-grid.md` | Convert | P2 |
| `manufacturing-process.md` | Standalone Section | Proposed `editorial/manufacturing-process.md` | `editorial/` | Full | `craftsmanship.md`, `materials.md`, `brand-timeline.md` | Convert | P2 |
| `materials.md` | Standalone Section | Proposed `editorial/materials.md` | `editorial/` | Full | `craftsmanship.md`, `sustainability.md` | Convert | P2 |
| `premium-cart.md` | Global Architecture | Commerce architecture: cart page and global drawer | `system/` | Full | `premium-product.md`, `commerce-merchandising-pack.md` | Move to architecture phase | P0 |
| `premium-collection.md` | Section Family | Collection and search system family | `commerce/` | Full | `collection-carousel.md`, `collection-tabs.md`, `featured-categories.md` | Split | P0 |
| `premium-footer.md` | Global Architecture | Global shell/footer architecture | `system/` | Full | Footer component/global content system | Move to architecture phase | P0 |
| `premium-header.md` | Global Architecture | Global shell/navigation architecture | `system/` | Full | Announcement Bar, navigation components | Move to architecture phase | P0 |
| `premium-hero.md` | Section Family | Hero system with canonical `full-screen-hero` implementation | `marketing/` | Full | `full-screen-hero.md`, `editorial-hero.md`, `split-hero.md`, `video-hero.md` | Split | P0 |
| `premium-product.md` | Section Family | Product-detail and product-merchandising system family | `commerce/` | Full | `product-recommendations.md`, `recently-viewed-products.md`, `complementary-products.md` | Split | P0 |
| `product-bundle-showcase.md` | Commerce Behaviour | Curated bundle-showcase behavior plus renderer | `commerce/` | Full | `cross-sell-products.md`, `product-highlights.md`, `product-comparison.md` | Split | P2 |
| `product-carousel.md` | Standalone Section | Proposed `commerce/product-carousel.md` | `commerce/` | Full | `cross-sell-products.md`, `product-recommendations.md` | Convert | P1 |
| `product-comparison.md` | Standalone Section | Proposed `commerce/product-comparison.md` | `commerce/` | Full | `product-bundle-showcase.md`, `product-highlights.md` | Convert | P2 |
| `product-highlights.md` | Standalone Section | Proposed `commerce/product-highlights.md` | `commerce/` | Full | `premium-product.md`, `product-bundle-showcase.md` | Convert | P1 |
| `product-recommendations.md` | Commerce Behaviour | Shopify related-product behavior plus renderer | `commerce/` | Full | `complementary-products.md`, `recently-viewed-products.md`, `cross-sell-products.md` | Split | P1 |
| `quote-banner.md` | Standalone Section | Proposed `editorial/quote-banner.md` | `editorial/` | Full | `brand-manifesto.md`, `story-banner.md` | Convert | P2 |
| `recently-viewed-products.md` | Commerce Behaviour | Browser-local recently-viewed behavior plus renderer | `commerce/` | Full | `product-recommendations.md`, `complementary-products.md` | Split | P2 |
| `shop-the-look.md` | Standalone Section | Proposed `commerce/shop-the-look.md` | `commerce/` | Full | `lookbook.md`, `product-carousel.md` | Convert | P2 |
| `split-hero.md` | Variant | Proposed `marketing/hero-system.md#split` | `marketing/` | Full | `premium-hero.md`, `editorial-hero.md`, `story-banner.md` | Treat as variant | P1 |
| `story-banner.md` | Variant | Proposed `editorial/image-with-text.md#story-banner` | `editorial/` | Full | `brand-manifesto.md`, `quote-banner.md`, `split-hero.md` | Treat as variant | P2 |
| `sustainability.md` | Standalone Section | Proposed `editorial/sustainability.md` | `editorial/` | Full | `materials.md`, `brand-values.md`, `awards-certifications.md` | Convert | P2 |
| `team.md` | Standalone Section | Proposed `editorial/team.md` | `editorial/` | Full | `founder-story.md`, `brand-values.md` | Convert | P2 |
| `video-hero.md` | Variant | Proposed `marketing/hero-system.md#video` | `media/` | Full | `premium-hero.md`, `editorial-hero.md`, `split-hero.md` | Treat as variant | P1 |

## Standalone Section Candidates

The following briefs have a clear independent page-region responsibility, matching Liquid/schema evidence, merchant-configurable settings, reusable composition value, and a bounded block model where applicable. They are candidates only; no canonical specification is created here.

| Proposed canonical name and path | Source brief | Page responsibility | Likely block model | Relevant Page Specifications | Current implementation status | Independent ownership rationale |
| --- | --- | --- | --- | --- | --- | --- |
| `social/awards-certifications.md` | `awards-certifications.md` | Verified proof and recognition. | `award`, `certification`. | Homepage, Standard Page, Product only with verified claim relevance. | Matching section, schema, preset, and two block types. | Proof has a distinct source/verification contract and safe omission boundary. |
| `editorial/behind-the-scenes.md` | `behind-the-scenes.md` | Real process/team/event media gallery. | `gallery_item`. | Homepage, Standard Page, Article; restricted Product use. | Matching section, schema, preset, progressive gallery/video behavior. | Its factual, consent-governed observational narrative fits the editorial category while retaining a distinct media contract. |
| `editorial/brand-manifesto.md` | `brand-manifesto.md` | Typography-led values/philosophy statement. | `principle`. | Homepage, Standard Page. | Matching section, schema, preset, and principle blocks. | It owns a distinct high-level narrative hierarchy. |
| `editorial/brand-timeline.md` | `brand-timeline.md` | Verified chronological history. | `timeline_item`. | Standard Page, Homepage when brief, Article only with real editorial purpose. | Matching section, schema, preset, timeline blocks. | Dated fact ordering and scrolling/fallback behavior are unique. |
| `editorial/brand-values.md` | `brand-values.md` | Approved values or commitments. | `value`. | Homepage, Standard Page, Product only when factual relevance is direct. | Matching section, schema, preset, value blocks. | Its evidence and claim boundaries differ from manifesto copy. |
| `commerce/collection-carousel.md` | `collection-carousel.md` | Curated collection discovery rail. | `collection`. | Homepage, Collection, Standard Page landing-style. | Matching section, schema, preset, collection blocks, carousel enhancement. | Collection-card browsing is distinct from product and category navigation. |
| `commerce/collection-tabs.md` | `collection-tabs.md` | Compact multi-collection product discovery. | `collection`. | Homepage, Collection, Standard Page landing-style. | Matching section, schema, preset, tabs controller. | It has unique multi-panel, no-JavaScript, and keyboard tab behavior. |
| `editorial/craftsmanship.md` | `craftsmanship.md` | Verified craft/process explanation. | `craft_step`. | Homepage, Product, Standard Page, Article. | Matching section, schema, preset, media/video support. | It owns craft claim, media, and process-step boundaries. |
| `content/editorial-grid.md` | `editorial-grid.md` | Article/page/collection/custom-destination editorial navigation. | `story`. | Homepage, Standard Page, Blog, Article after body. | Matching section, schema, preset, story blocks. | It is a source-flexible editorial card system, not a product rail. |
| `navigation/featured-categories.md` | `featured-categories.md` | Editorial category navigation. | `category`. | Homepage, Collection List, Standard Page landing-style. | Matching section, schema, preset, category blocks. | It owns category-level discovery without product-card logic. |
| `editorial/founder-story.md` | `founder-story.md` | Merchant-confirmed founder/origin context. | `achievement`. | Homepage, Standard Page. | Matching section, schema, preset, achievement blocks. | Portrait/biography truth and omission rules justify a dedicated contract. |
| `media/image-mosaic.md` | `image-mosaic.md` | Curated asymmetric editorial media. | `image`. | Homepage, Standard Page, Article where media is factual. | Matching section, schema, preset, image blocks. | It has a distinct curated layout and media/focal-point contract. |
| `media/lookbook.md` | `lookbook.md` | Image-led visual editorial destinations. | `item`. | Homepage, Standard Page, Collection landing-style, Article. | Matching section, schema, preset, item blocks. | It preserves narrative links without becoming Shop the Look. |
| `editorial/manufacturing-process.md` | `manufacturing-process.md` | Verified numbered production/service workflow. | `process_step`. | Standard Page, Product, Homepage, Article. | Matching section, schema, preset, process blocks. | Ordered process facts and safe statistic handling are distinct. |
| `editorial/materials.md` | `materials.md` | Verified material/ingredient education. | `material`. | Product, Standard Page, Homepage, Article. | Matching section, schema, preset, material blocks. | Material fact and source-truth requirements are specific. |
| `commerce/product-carousel.md` | `product-carousel.md` | Curated collection product rail. | No merchant blocks; selected collection source. | Homepage, Collection, Product, Cart only when a real editorial need exists. | Matching section, schema, preset, scroll-carousel behavior. | It is a bounded discovery rail, not a collection page replacement. |
| `commerce/product-comparison.md` | `product-comparison.md` | Merchant-authored product decision comparison. | `product`, `feature`. | Product, Standard Page guide, Homepage only with strong need. | Matching section, schema, preset, table semantics. | Manual values, column limits, and table accessibility justify independence. |
| `commerce/product-highlights.md` | `product-highlights.md` | One product plus verified benefit highlights. | `highlight`. | Homepage, Product, Standard Page landing-style. | Matching section, schema, preset, highlight blocks. | It is a specific product narrative, not a product-detail replacement. |
| `editorial/quote-banner.md` | `quote-banner.md` | Focused verified statement or quotation. | None. | Homepage, Standard Page, Article; never a substitute for proof. | Matching section, schema, preset. | A bounded full-width quote treatment has a distinct semantic and claim contract. |
| `commerce/shop-the-look.md` | `shop-the-look.md` | Lifestyle media plus explicit product selection. | `product`. | Homepage, Collection landing-style, Standard Page campaign. | Matching section, schema, preset, marker controller. | It uniquely combines approved media with accessible product-list fallback. |
| `editorial/sustainability.md` | `sustainability.md` | Verified environmental/social evidence. | `initiative`, `metric`, `certification`. | Standard Page, Product, Homepage only with verified relevance. | Matching section, schema, preset, evidence blocks. | High-risk factual claims require a dedicated trust contract. |
| `editorial/team.md` | `team.md` | Merchant-approved people and roles. | `team_member`. | Standard Page, Homepage only when valuable. | Matching section, schema, preset, team blocks. | Personal data, consent, and public-contact boundaries are distinct. |

## Section Family Candidates

| Family | Member briefs | Likely canonical sections | Likely variants | Shared components/behaviours | Duplication risk |
| --- | --- | --- | --- | --- | --- |
| Hero system | `premium-hero.md`, `full-screen-hero.md`, `editorial-hero.md`, `split-hero.md`, `video-hero.md` | One canonical hero system backed by stable `full-screen-hero`; legacy specialist sections require compatibility audit. | Text, image, video, slideshow, split, product-led, collection-led, editorial. | Section Heading, Rich Text, Button, Responsive Image, Video, overlay, motion, hero lifecycle. | Multiple hero documents or H1 owners would fragment settings, media rules, and generator mapping. |
| Collection and search system | `premium-collection.md`, plus `collection-carousel.md`, `collection-tabs.md`, `featured-categories.md` | `collection-banner`, `main-collection-product-grid`, `main-search`; supporting discovery sections remain separate candidates. | Banner/media, grid/filter/pagination, search, carousel, tabbed discovery, category navigation. | Product Card, Collection Card, Filters, Sort, Pagination, Responsive Image, facets/controllers. | A family document must not absorb distinct reusable collection-discovery sections or duplicate Search Page ownership. |
| Product-detail and merchandising system | `premium-product.md`, `product-highlights.md`, recommendation/curation briefs | `main-product` plus bounded supporting product-merchandising sections/behaviours. | Gallery/purchase/trust presentation, highlights, curated rails, recommendation sources. | Product Information, Product Gallery, Variant Picker, Buy Buttons, Price, Product Card, form lifecycle. | Main Product, cards, recommendations, and sticky purchase controls must not become several competing product systems. |
| Brand storytelling | `brand-storytelling-pack.md`, `brand-manifesto.md`, `brand-values.md`, `founder-story.md`, `brand-timeline.md`, `materials.md`, `craftsmanship.md`, `manufacturing-process.md`, `sustainability.md`, `team.md`, `awards-certifications.md`, `behind-the-scenes.md` | Independent editorial/social/media sections listed in the Standalone candidates table. | Compact, evidence-led, narrative-led, media-supported variants within each own section. | Section Heading, Rich Text, Button, Icon, Responsive Image, video, list/timeline primitives. | A pack must not become a monolithic “brand story” section or blur differing fact/consent rules. |
| Product recommendation and cross-sell | `product-recommendations.md`, `complementary-products.md`, `cross-sell-products.md`, `recently-viewed-products.md`, `product-bundle-showcase.md`, `product-carousel.md` | Distinct renderer contracts plus shared recommendation/curation data behavior. | Shopify related, Shopify complementary, merchant-curated, browser-local, bundle display, collection rail. | Product Card, Price, Quick Add, carousel/recommendation/recently-viewed controllers. | Shared cards do not make data source, privacy, fallback, or page placement interchangeable. |
| Editorial media and navigation | `editorial-grid.md`, `image-mosaic.md`, `lookbook.md`, `quote-banner.md`, `story-banner.md`, `shop-the-look.md` | Editorial Grid, Image Mosaic, Lookbook, Quote Banner; Story Banner as an Image with Text variant; Shop the Look remains commerce/media. | Grid, mosaic, narrative link, quote, story bridge, product-marker treatment. | Responsive Image, Section Heading, Rich Text, Button, Product Card, media/scroll patterns. | Conflating image-led story, editorial navigation, and product discovery would create overloaded sections. |

## Variant Candidates

| Source brief | Parent canonical section/family | Proposed variant | Deterministic selection criteria | Settings or structure difference | Why a separate canonical section duplicates responsibility |
| --- | --- | --- | --- | --- | --- |
| `editorial-hero.md` | Hero system | Editorial | Approved narrative copy and media lead a campaign or collection introduction; no rotating slides or product-card need. | Typography-led static media/copy composition. | It shares hero lead, H1, overlay, media, CTA, responsive, and lifecycle responsibilities. |
| `split-hero.md` | Hero system | Split media/content | Approved media and narrative require equal visual weight with safe mobile stacking. | Side-by-side desktop media/content, stacked mobile. | It changes hero layout, not the customer task or primary hero ownership. |
| `video-hero.md` | Hero system | Video | Shopify-hosted or safely facaded video and poster are approved; reduced-motion fallback is available. | Video lifecycle, poster, controls, and visibility pause behavior. | Video already exists as a documented canonical hero mode; a second owner would split media rules. |
| `story-banner.md` | Image with Text/storytelling family | Story banner | A concise horizontal factual bridge needs one media/copy/action grouping, not a page lead. | Optional supporting quote, full-bleed/border treatment, no block model. | It remains an image-with-text narrative variant and does not need a parallel generic section contract. |

`full-screen-hero.md` is not listed as a Variant candidate because its primary classification is Duplicate or Overlap. It preserves the stable runtime ID and directs future work to the Premium Hero contract; it should not become a second canonical hero document.

## Composition Pack Candidates

| Brief | Included responsibilities | Likely child sections | Future role | Why it is not a standalone section |
| --- | --- | --- | --- | --- |
| `brand-storytelling-pack.md` | Factual brand narrative, proof, people, media, material/process, and sustainability composition. | Founder Story, Timeline, Materials, Craftsmanship, Manufacturing Process, Sustainability, Values, Team, Awards, Behind the Scenes. | Preset composition, page plan, and merchant-strategy evidence. | It coordinates ten distinct data, consent, media, and page-role contracts. |
| `commerce-merchandising-pack.md` | Product/collection discovery, recommendations, curation, quick-add safety, and lifecycle architecture. | Product/Collection Carousel, Collection Tabs, Featured Categories, Shop the Look, Comparison, Highlights, Bundle, recommendation behaviours. | Preset composition, commerce architecture, and generator validation input. | It indexes multiple sections and controllers; it is not one merchant-editable region. |
| `editorial-hero-pack.md` | Hero, media-led editorial, quote, story, and narrative composition. | Hero system, Lookbook, Mosaic, Story Banner, Editorial Grid, Quote Banner, Brand Manifesto. | Preset composition and page-plan input. | It coordinates distinct hero and editorial sections with different page roles and data requirements. |

Each pack is preserved as source evidence and future preset input. It belongs later in presets, page composition, and merchant strategy; it must not become a standalone section, its own schema, or a replacement for the child contracts.

## Global Architecture Candidates

| Brief | Classification rationale | Future architecture destination | Boundary |
| --- | --- | --- | --- |
| `premium-header.md` | Governs global Header, Announcement Bar, navigation, localization, search, cart entry, sticky state, and lifecycle. | Theme architecture and navigation architecture. | Global shell documentation; never an ordinary page section. |
| `premium-footer.md` | Governs global Footer group, newsletter, policy/navigation, localization, payment marks, blocks, and back-to-top behavior. | Theme architecture and global shell documentation. | Global shell documentation; never an ordinary page section. |
| `premium-cart.md` | Governs `main-cart`, global Cart Drawer, cart state, forms, checkout handoff, and shared cart snippets. | Commerce architecture and global overlay/documentation. | Cart Page and drawer architecture; not a generic addable page section. |

These candidates retain their existing source briefs. Their future architecture documentation must preserve current template/group placement and page ownership rather than recasting global systems as ordinary reusable content sections.

## Component or Block Candidates

No existing brief receives Component Candidate or Block Candidate as its primary classification. Each brief either has meaningful section-level scope, belongs to a family/pack/system, or describes a commerce behavior.

Several concepts inside briefs are future Block Specification candidates after their parent section is converted:

| Parent brief/section | Likely block candidates | Why they remain blocks |
| --- | --- | --- |
| Awards & Certifications | `award`, `certification` | Repeated evidence units within one proof region. |
| Behind the Scenes | `gallery_item` | One media/caption/context unit within a gallery. |
| Brand Manifesto, Values, Founder Story | `principle`, `value`, `achievement` | Repeated supporting content within a bounded narrative region. |
| Timeline, Process, Materials, Team | `timeline_item`, `process_step`, `material`, `team_member` | Repeated factual units whose order and quantity are section-owned. |
| Collection and product discovery | `collection`, `product`, `category`, `story`, `highlight`, `feature` | Repeated selected-resource or authoring units that cannot independently choose a page. |

Missing or under-documented reusable implementation concepts include Article Card, Collection Card, feature-item, timeline-item, logo-item, ScrollCarousel, CommerceTabsController, ShopTheLookController, CommerceRecommendationController, and RecentlyViewedController. They require component, behavior, or implementation documentation before a canonical section can claim their complete contract; none should be invented in a section specification.

## Commerce Behaviour Candidates

The following briefs have implemented visual renderers but their differentiating responsibility is primarily data/merchandising behavior. Future conversion should split renderer contract from source/selection behavior where that improves clarity.

| Brief | Actual behavior | Future treatment | Data/integration rule |
| --- | --- | --- | --- |
| `product-recommendations.md` | Requests Shopify related recommendations. | Section renderer plus Shopify-related recommendation behavior contract. | Shopify owns relevance and availability; omit when no result returns. |
| `complementary-products.md` | Requests Shopify complementary recommendations with merchant fallback products. | Section renderer plus complementary-data behavior contract. | Preserve `intent=complementary`, explicit fallback, deduplication, and current-product exclusion. |
| `cross-sell-products.md` | Renders explicitly merchant-curated selected products. | Curated product-list section with a curation behavior rule. | Never infer relationships or turn curation into an algorithm. |
| `recently-viewed-products.md` | Uses browser-local normalized product handles and Section Rendering API. | Browser-local behavior contract plus renderer. | Privacy, deletion handling, local-only scope, and no-JavaScript omission are mandatory. |
| `product-bundle-showcase.md` | Displays selected products and an available-items subtotal without a bundle transaction. | Curated bundle-showcase section plus explicit non-bundle commerce rule. | It cannot claim a discount, atomic multi-item add, inventory relationship, or Shopify bundle. |

Product Carousel is a Standalone Section because its primary responsibility is a reusable curated rail. Its selected-collection source and safe Quick Add rules remain dependencies, not a recommendation algorithm. Product Highlights, Comparison, and Shop the Look remain Standalone Sections because their page-region composition is the primary responsibility.

## Preset Input Candidates

| Brief | Preset/composition role | Future AI influence | Why it is not a section |
| --- | --- | --- | --- |
| `homepage-bootstrap.md` | Canonical resource-free Homepage baseline and initial ordered template composition. | Establishes approved bootstrap, safe defaults, merge precedence, and validation sequence. | It is an `index.json` composition/preset input, not an independently addable page region. |
| `brand-storytelling-pack.md` | Story-led composition source. | Can guide selection/order of verified child sections after merchant approval. | It is a pack of distinct sections, not one section. |
| `commerce-merchandising-pack.md` | Commerce composition source. | Can guide verified discovery/recommendation modes and shared validation. | It is a pack/index of renderer and behavior contracts. |
| `editorial-hero-pack.md` | Hero/editorial composition source. | Can guide approved lead, narrative, and media arrangements. | It coordinates several incompatible page-region responsibilities. |

Only `homepage-bootstrap.md` has Preset Input as its primary classification. The three packs retain Composition Pack as their primary classification and have a secondary preset-input relationship.

## Source Material Only

No brief receives Source Material Only as its primary classification at this stage. Every brief has a direct role as a standalone candidate, family, variant, composition pack, global architecture input, commerce behavior, preset input, or preserved overlap.

This does not elevate every brief to a future canonical file. Any brief may remain source evidence after later overlap, page-role, component, or founder review. Source Material Only remains the correct future classification if a later audit finds that a brief has no independently reusable responsibility after its evidence is absorbed elsewhere.

## Duplicate and Overlap Findings

| Files involved | Shared responsibility | Meaningful difference | Preferred canonical owner | Handling |
| --- | --- | --- | --- | --- |
| `premium-hero.md`, `full-screen-hero.md` | Canonical hero and stable `full-screen-hero` runtime ID. | Premium Hero contains the architecture; Full-screen Hero is a compatibility pointer. | Hero system with stable full-screen implementation. | Preserve the compatibility brief; do not create a second canonical hero specification; deprecate the duplicate documentation role only after preservation. |
| `premium-hero.md`, `editorial-hero.md`, `split-hero.md`, `video-hero.md` | Hero lead, media, copy, CTA, responsive behavior, and lifecycle. | Editorial, split, and video differ by functional layout/media mode. | Hero system. | Merge under one family as variants; retain legacy runtime compatibility where evidence requires it. |
| `brand-manifesto.md`, `brand-values.md`, `quote-banner.md`, `story-banner.md` | Values/statement/narrative presentation. | Manifesto and Values have repeated blocks; Quote is a singular statement; Story Banner is a media/copy bridge. | Separate Manifesto, Values, Quote sections; Story Banner as Image with Text variant. | Split by fact model and page role; do not make one generic “brand story” section. |
| `founder-story.md`, `brand-timeline.md`, `team.md` | People/origin/history storytelling. | Founder is one confirmed person, Timeline is dated facts, Team is multiple consented people. | Separate editorial sections. | Preserve distinct ownership; share dependencies only. |
| `materials.md`, `craftsmanship.md`, `manufacturing-process.md`, `behind-the-scenes.md`, `sustainability.md`, `awards-certifications.md` | Evidence-led brand/product trust. | Each has distinct claim, asset, privacy, and verification risk. | Separate editorial/social/media sections. | Preserve separate contracts; group only as a storytelling preset/family. |
| `collection-carousel.md`, `collection-tabs.md`, `featured-categories.md`, `editorial-grid.md` | Collection/category/destination discovery. | Carousel is a rail, Tabs renders collection product panels, Categories uses editorial links, Grid is source-flexible editorial navigation. | Separate candidates under commerce/navigation/content. | Preserve independently; share cards and heading components. |
| `product-carousel.md`, `cross-sell-products.md`, `product-recommendations.md`, `complementary-products.md`, `recently-viewed-products.md`, `product-bundle-showcase.md` | Product discovery and follow-on merchandising. | Sources differ: selected collection, manual curation, Shopify related, Shopify complementary, browser-local history, and non-transactional bundle display. | Product recommendation/cross-sell behavior family with distinct renderer contracts. | Split source behavior from shared Product Card presentation; do not merge data intent. |
| `product-highlights.md`, `premium-product.md` | Product narrative, trust, and purchase-adjacent content. | Main Product is a mandatory page architecture; Highlights is an optional selected-product region. | Main Product system plus separate Product Highlights section. | Preserve both; Product Highlights must not recreate product detail/purchase form. |
| `lookbook.md`, `image-mosaic.md`, `shop-the-look.md` | Image-led storytelling. | Lookbook links narrative items, Mosaic is visual grouping, Shop the Look exposes explicit product markers/list. | Separate media/commerce sections. | Preserve distinct interaction and data contracts. |
| `premium-header.md`, `premium-footer.md`, `premium-cart.md` | Global shell/system documentation. | Header/navigation, Footer/global content, and cart/drawer have different platform boundaries. | Separate architecture documents. | Move to architecture phase; do not convert to ordinary sections. |

## Naming Findings

Existing filenames are preserved. The following findings affect future canonical naming only:

| Existing name | Finding | Functional canonical recommendation |
| --- | --- | --- |
| `premium-hero.md` | “Premium” describes quality rather than responsibility. | `hero-system.md` or a canonical `full-screen-hero.md` specification after stable-ID audit. |
| `full-screen-hero.md` | Names a compatibility/runtime ID but duplicates the Premium Hero documentation role. | Stable-ID compatibility record inside `hero-system.md`; retain `full-screen-hero` as runtime identifier. |
| `premium-product.md` | Describes a mandatory product architecture, not a generic premium feature. | `product-detail-system.md` or `main-product.md` in commerce architecture. |
| `premium-collection.md` | Combines Collection and Search systems. | `collection-search-system.md`, then separate `collection-banner.md`, `main-collection-product-grid.md`, and `main-search.md` contracts if approved. |
| `premium-cart.md` | Combines Cart Page and global Cart Drawer. | `cart-system.md` in commerce/global architecture. |
| `premium-header.md`, `premium-footer.md` | “Premium” obscures global architecture responsibility. | `header-system.md` and `footer-system.md` in global architecture. |
| `*-pack.md` | “Pack” signals a composition/index, not one section. | Preserve as pack/preset source; do not use as canonical section name. |
| `featured-categories.md` | “Categories” uses merchant-facing terminology that can include collections, pages, and links. | `featured-categories.md` remains functional if its source-flexible navigation contract stays confirmed. |
| `cross-sell-products.md`, `complementary-products.md`, `product-recommendations.md` | Names overlap at the visual Product Card layer but differ in source intent. | Preserve behavior-specific names and document source explicitly. |
| `story-banner.md` | “Banner” is visually descriptive but overlaps Image with Text. | `image-with-text.md#story-banner` as a variant if later audit confirms shared schema. |

Singular/plural naming should follow the actual contract: a section name is singular when it owns one region, while blocks and source data may be plural. Future paths should use responsibility-led kebab case and avoid quality adjectives, campaign names, merchant names, template-instance IDs, or assumed Shopify data source names.

## Category Mapping

The provisional category mapping is:

| Category | Briefs/classifications |
| --- | --- |
| `foundation/` | `homepage-bootstrap.md` as Preset Input. |
| `content/` | `editorial-grid.md`. |
| `commerce/` | Collection Carousel, Collection Tabs, Commerce Merchandising Pack, Complementary Products, Cross-sell Products, Premium Collection, Premium Product, Product Bundle Showcase, Product Carousel, Product Comparison, Product Highlights, Product Recommendations, Recently Viewed Products, Shop the Look. |
| `media/` | Image Mosaic, Lookbook, Video Hero. |
| `editorial/` | Behind the Scenes, Brand Manifesto, Brand Storytelling Pack, Brand Timeline, Brand Values, Craftsmanship, Founder Story, Manufacturing Process, Materials, Quote Banner, Story Banner, Sustainability, Team. |
| `marketing/` | Editorial & Hero Pack, Editorial Hero, Full-screen Hero overlap, Premium Hero, Split Hero. |
| `social/` | Awards & Certifications. |
| `navigation/` | Featured Categories. |
| `forms/` | No primary brief; existing Contact and Newsletter runtime sections require separate source evidence when their Section Specification phase begins. |
| `utility/` | No primary brief. |
| `system/` | Premium Cart, Premium Footer, Premium Header as global architecture candidates. |

No new category is needed. Global architecture is represented provisionally by `system/` for classification only; its future documents may belong under a dedicated architecture path after separate governance approval rather than under ordinary `docs/sections/system/`.

## Page Responsibility Mapping

The following mapping applies to the likely standalone candidates, families, variants, and behavior renderers. “Prohibited” means prohibited as an ordinary selected region, not that a supporting global system cannot be present on the page.

| Candidate group | Valid pages | Prohibited pages | Typical ordering role | H1 constraint | SEO constraint |
| --- | --- | --- | --- | --- | --- |
| Hero system and hero variants | Homepage; Standard Page only when an intentional landing-style composition is approved; selected collection/campaign context where implementation supports it. | Product, Search, Cart, Contact, Blog, Article, 404 as ordinary lead. | First page lead or early approved campaign region. | Only the first eligible Homepage hero may own H1; otherwise H2 or lower. | No page canonical/schema ownership; no invented promotional metadata. |
| Brand Manifesto, Values, Founder, Timeline, Team | Homepage after discovery; Standard Page; Article only when editorial content is real. | Search, Cart, Contact, 404; Product except direct factual relevance. | Differentiation or story after primary orientation/discovery. | Never create a second page H1. | No Organization/Person/Review schema without centralized evidence. |
| Materials, Craftsmanship, Manufacturing Process, Sustainability, Awards, Behind the Scenes | Product when directly explanatory; Standard Page; Homepage after discovery; Article when factual. | Search, Cart, Contact, 404; Collection unless strategy/source supports it. | Product reassurance or evidence after core product/collection orientation. | H2 or lower. | Claims, certifications, dates, people, and images require verified source; no competing schema. |
| Collection Carousel, Collection Tabs, Featured Categories | Homepage; Collection; Collection List; Standard Page landing-style. | Product, Cart, Contact, Blog, Article, 404 unless a verified exception is documented. | Early discovery after lead; Tabs can follow a section heading. | H2 or lower. | Real collection/page destinations only; no collection-page canonical ownership. |
| Editorial Grid, Image Mosaic, Lookbook, Quote Banner, Story Banner | Homepage; Standard Page; Article after Article body; Collection landing-style where evidence supports it. | Search, Cart, Contact, 404; Product unless factual product-story support is direct. | Supporting editorial depth after essential customer task. | H2 or lower; Article H1 remains article-owned. | No duplicated Article/Page schema; links and media must be verified. |
| Product Carousel, Product Highlights, Product Comparison, Shop the Look | Homepage; Product; Collection/Standard Page landing-style when approved. | Search, Cart, Contact, Blog, Article, 404 unless separately documented. | Discovery or decision support after a clear page orientation. | H2 or lower; Product H1 remains `main-product`. | Real products/cards only; no Product schema emitted by section. |
| Recommendation/cross-sell behaviours | Product; Cart only where cart architecture explicitly permits an approved recommendation region; Homepage only for manual curation, not platform recommendation. | Search, Contact, Blog, Article, 404; Collection unless a future page contract permits it. | After primary product/cart decision content. | H2 or lower. | Shopify/merchant source truth only; no relevance/popularity claim or duplicate Product schema. |
| Homepage Bootstrap preset | Homepage only. | All other page types. | Establishes template baseline and merge precedence. | Preserves the bootstrap hero’s documented H1 rule. | Homepage specification owns page-level metadata. |
| Global Header, Footer, Cart | Global shell or Cart architecture. | Any ordinary page-section slot. | Outside page content; cart page/drawer follow their own architecture. | Never own page H1. | No page metadata/schema ownership. |

## Component Dependency Mapping

Likely canonical sections and families must reuse existing documented components rather than duplicate their implementation.

| Candidate/family | Documented dependencies | Runtime/behavior dependencies needing separate evidence | Documentation gap before conversion |
| --- | --- | --- | --- |
| Hero system | Section Heading, Button, Responsive Image, Video/Video Player, Aspect Ratio, layout primitives. | Hero lifecycle, slideshow controls, overlay logic, media pause behavior. | No generic Hero-system component is needed, but lifecycle and legacy-setting audit must be attached to the section family. |
| Brand storytelling | Section Heading, Rich Text, Button, Icon System, Responsive Image, Video, Timeline, Table/layout primitives. | `feature-item`, `timeline-item`, `logo-item`, shared scroll behavior. | Define future Block Specifications for factual repeated units; document runtime-only helper primitives before claiming them as components. |
| Collection discovery | Product Card, Collection Grid, Filters, Sort, Pagination, Responsive Image, Button, Icon Button, Tabs, Disclosure. | Collection Card, ScrollCarousel, CommerceTabsController, facets controller. | Collection Card and carousel/tab behavior need explicit component/behavior documentation. |
| Product merchandising | Product Card, Price, Product Information, Product Gallery, Variant Picker, Buy Buttons, Quantity Selector, Sticky Add to Cart, Responsive Image, Button. | Product-form lifecycle, CommerceRecommendationController, RecentlyViewedController, ShopTheLookController. | Behavior-controller contracts and shared recommendation data source need documentation. |
| Editorial media | Section Heading, Responsive Image, Aspect Ratio, Rich Text, Button, Icon System, Gallery/Video where applicable. | Mosaic/lookbook layout rules, marker behavior. | Gallery/Lookbook composition and marker-controller documentation may be required. |
| Global Header/Footer/Cart | Header, Footer, Announcement Bar, Navigation, Drawer, Toast, localization controls, Cart components, forms. | Header/footer/cart controllers, section groups, Shopify dynamic checkout. | These are architecture documents, not new component specifications. |

The existing component layer remains authoritative for reusable semantics, responsive behavior, accessibility, tokens, motion, and performance. A section conversion must list only dependencies that its audited runtime actually uses and must flag an undocumented dependency rather than redefine it.

## Implementation Coverage

| Classification group | Currently implemented | Partially implemented | Brief-only | Unknown |
| --- | --- | --- | --- | --- |
| Standalone Section candidates | 22 matching Liquid files, Shopify schemas, presets, section settings, and most documented block types are present. | Canonical ownership, page eligibility, formal block specifications, and some helper/controller contracts remain undocumented. | None. | None. |
| Section Families | Hero, Collection/Search, and Product systems have matching runtime sections, schemas, templates, generated capability catalogs, CSS, and JavaScript where needed. | Family-level canonical boundaries and legacy compatibility reconciliation remain to be documented. | None. | None. |
| Variants and overlap | Editorial, Split, Video, and stable Full-screen hero implementations exist. | Their future consolidation under one canonical hero/Image-with-Text contract is not yet documented or implemented as a schema migration. | None. | None. |
| Composition Packs | Child sections and shared architecture exist. | Packs themselves have no Shopify schema, Liquid file, template slot, or merchant configuration surface. | The pack classification/preset role requires future documentation. | None. |
| Global Architecture | Header, Footer, Cart Page, Cart Drawer, groups, settings, snippets, CSS, JS, templates, and QA briefs exist. | Cross-document architecture ownership still needs a dedicated phase. | None. | None. |
| Commerce Behaviours | Recommendation, complementary, curated cross-sell, recently viewed, and bundle renderer implementations exist. | Source-behavior contracts, data/privacy rules, and renderer separation need canonical documentation. | None. | None. |
| Preset Input | Homepage Bootstrap, `index.json`, generator precedence, and validation scripts exist. | Explicit preset artifact governance remains future work. | None. | None. |

Current implementation evidence does not authorize unsupported data. Shopify recommendation availability, product/collection selection, customer/browser data, dynamic sources, app blocks, factual claims, media, routes, and merchant-specific settings remain bounded by the relevant Page, Component, AI, approval, and Shopify contracts.

## Documentation Priority

Priority reflects deterministic storefront generation and architecture safety, not novelty or visual appeal.

| Priority | Likely canonical specifications or architecture work |
| --- | --- |
| P0 — required for core storefront generation | Hero system; Product-detail system; Collection/Search system; Homepage Bootstrap preset input; Header, Footer, and Cart architecture classification. |
| P1 — high-value reusable section | Collection Carousel, Collection Tabs, Featured Categories, Product Carousel, Product Highlights, related/complementary/curated cross-sell behavior contracts, and legacy Hero variants. |
| P2 — advanced merchandising or storytelling | Awards & Certifications, Behind the Scenes, Brand Manifesto, Brand Timeline, Brand Values, Craftsmanship, Editorial Grid, Founder Story, Image Mosaic, Lookbook, Manufacturing Process, Materials, Product Bundle Showcase, Product Comparison, Quote Banner, Recently Viewed, Shop the Look, Story Banner, Sustainability, Team. |
| P3 — optional or integration-dependent | No brief is primary P3 in this library; some optional capabilities inside P1/P2 candidates, including dynamic recommendations, video, app blocks, and external integrations, retain P3 implementation posture. |
| Deferred — insufficient evidence or belongs to another phase | All three packs as standalone documents; global systems as ordinary Section Specifications; duplicate Full-screen Hero documentation role. |

## Conversion Batches

Future prompts should use small batches of one to four closely related documents. No batch is created by this task.

### Batch 1 — Factual editorial foundations

- **Canonical files to create:** Proposed `editorial/brand-values.md`, `editorial/materials.md`, and `social/awards-certifications.md`.
- **Source briefs to inspect:** `brand-values.md`, `materials.md`, `awards-certifications.md`, and the relevant portions of `brand-storytelling-pack.md`.
- **Implementation files to inspect:** matching Liquid/schema files; Section Heading, Responsive Image, Icon, Button snippets/components; relevant CSS; generated capability entries; applicable Homepage, Standard Page, and Product Page contracts.
- **Dependencies:** verified merchant claims, media truth, list/block semantics, source classification, and no-JavaScript rendering.
- **Why first:** three small, server-rendered, bounded sections with clear block models and explicit no-fabrication rules. They establish the conversion method without introducing hero lifecycle, recommendation APIs, global shell, or cart complexity.

### Batch 2 — Hero family

- **Canonical files to create:** Proposed `marketing/hero-system.md` and variant documentation within its contract; no duplicate Full-screen Hero specification.
- **Source briefs to inspect:** `premium-hero.md`, `full-screen-hero.md`, `editorial-hero.md`, `split-hero.md`, `video-hero.md`, `editorial-hero-pack.md`.
- **Implementation files to inspect:** all hero Liquid files, shared hero content snippet, hero CSS/JS, `index.json`, header/announcement compatibility, lifecycle tests, generated mapping, and Homepage specification.
- **Dependencies:** H1 ownership, media truth, reduced motion, slideshow behavior, legacy setting IDs, and header compatibility.
- **Why second:** it is P0 but requires the lower-risk conversion method before reconciling variants and legacy contracts.

### Batch 3 — Collection merchandising

- **Canonical files to create:** Proposed `commerce/collection-carousel.md`, `commerce/collection-tabs.md`, `navigation/featured-categories.md`.
- **Source briefs to inspect:** the three source briefs plus `premium-collection.md` and relevant Commerce Pack entries.
- **Implementation files to inspect:** matching Liquid/schema/CSS, Product Card/Collection Card dependencies, ScrollCarousel/CommerceTabsController, collection/search templates, and Homepage/Collection/Collection List specifications.
- **Dependencies:** collection truth, Product Card contracts, tabs/carousel accessibility, safe empty states, and no-JavaScript fallback.
- **Why third:** these have clear runtime boundaries and benefit from prior hero/page hierarchy decisions.

### Batch 4 — Product merchandising regions

- **Canonical files to create:** Proposed `commerce/product-carousel.md`, `commerce/product-highlights.md`, `commerce/product-comparison.md`, `commerce/shop-the-look.md`.
- **Source briefs to inspect:** the four source briefs, `premium-product.md`, and relevant Commerce Pack entries.
- **Implementation files to inspect:** matching Liquid/schema/CSS/JS, Product Card, Product Page, Product Gallery, Price, Quick Add/form lifecycle, and applicable page specifications.
- **Dependencies:** product source truth, safe multi-variant path, table accessibility, marker/list fallback, and no duplicate Product schema.
- **Why fourth:** these are reusable visual regions but depend on P0 product architecture boundaries.

### Batch 5 — Recommendation and curation behavior

- **Canonical files to create:** Proposed behavior/renderer contracts for related recommendations, complementary products, curated cross-sell, recently viewed, and bundle showcase.
- **Source briefs to inspect:** `product-recommendations.md`, `complementary-products.md`, `cross-sell-products.md`, `recently-viewed-products.md`, `product-bundle-showcase.md`.
- **Implementation files to inspect:** matching Liquid/schema/JS, Section Rendering API paths, recommendation endpoints, Product Card/form lifecycle, privacy behavior, Cart/Product Page contracts, and AI resource rules.
- **Dependencies:** Shopify endpoint truth, manual curation, browser-local privacy, request abort/cleanup, fallback selection, and cart safety.
- **Why fifth:** source-behavior differences must be preserved before the shared visual product-card layer is documented as a section dependency.

### Batch 6 — Brand-story evidence sections

- **Canonical files to create:** Proposed `editorial/brand-manifesto.md`, `editorial/founder-story.md`, `editorial/brand-timeline.md`, `editorial/team.md`.
- **Source briefs to inspect:** the four briefs plus `brand-storytelling-pack.md`.
- **Implementation files to inspect:** matching Liquid/schema/CSS, media/list/timeline helpers, selected Pages, and content classification sources.
- **Dependencies:** people, dates, biographies, quotations, consent, merchant confirmation, accessibility, and source evidence.
- **Why sixth:** these sections share an evidence-led editorial posture but require strict human-fact governance.

### Batch 7 — Materials, craft, and media evidence

- **Canonical files to create:** Proposed `editorial/craftsmanship.md`, `editorial/manufacturing-process.md`, `editorial/sustainability.md`, `editorial/behind-the-scenes.md`.
- **Source briefs to inspect:** the four briefs plus Materials and Awards/Credentials for overlap audit.
- **Implementation files to inspect:** matching Liquid/schema/CSS/JS, hosted video behavior, media components, blocks, Product/Standard/Article Page rules, and claim classification.
- **Dependencies:** claim verification, captions, poster/media fallback, list/timeline semantics, and performance cost.
- **Why seventh:** high factual and media-risk areas should follow the initial evidence-led conversion examples.

### Batch 8 — Editorial media and navigation

- **Canonical files to create:** Proposed `content/editorial-grid.md`, `media/image-mosaic.md`, `media/lookbook.md`, `editorial/quote-banner.md`.
- **Source briefs to inspect:** the four briefs plus `story-banner.md` and `editorial-hero-pack.md` for boundary audit.
- **Implementation files to inspect:** matching Liquid/schema/CSS, responsive media, card/link semantics, applicable Page Specifications, and section mapping catalogs.
- **Dependencies:** source selection, image/alt truth, one-link card rule, responsive layout, and page content hierarchy.
- **Why eighth:** these benefit from established story/media and component dependency patterns.

### Batch 9 — Global architecture and preset reconciliation

- **Canonical files to create:** No ordinary section specifications; proposed Header System, Footer System, Cart System, and Homepage Bootstrap/preset governance documents in their future approved architecture locations.
- **Source briefs to inspect:** `premium-header.md`, `premium-footer.md`, `premium-cart.md`, `homepage-bootstrap.md`, all three packs.
- **Implementation files to inspect:** section groups, templates, global layout, header/footer/cart snippets and controllers, settings schema, generator mapping, Page Specifications, and package validators.
- **Dependencies:** global shell ownership, checkout boundary, localization, app blocks, lifecycle, preset precedence, and no theme-write operations.
- **Why ninth:** global architecture must not be forced into the ordinary section conversion workflow.

## Founder Decisions

None required for classification or Batch 1.

The current briefs, Page Specifications, implementation evidence, and Shopify conventions resolve the immediate classification: packs remain packs, global Header/Footer/Cart remain architecture, the Full-screen Hero brief remains a preserved overlap, and existing direct renderer contracts are not automatically converted without the documented batches.

A future founder decision is needed only if conversion evidence reveals that two materially different product-merchandising models cannot coexist under distinct source-behavior contracts, that a composition pack should become a formal preset artifact, or that global architecture requires a new documentation category. None of those decisions is required before the first batch.

## Risks and Constraints

- **Duplicate canonical sections:** Hero, story, collection discovery, and product discovery overlap can create competing settings, H1 owners, schema, and generator paths.
- **Variant explosion:** visual differences must not become separate sections when a documented variant preserves the same customer task and data model.
- **Decorative naming:** “premium,” “pack,” “hero,” and “banner” can obscure actual responsibility; future names must be functional.
- **Undocumented data dependencies:** Shopify recommendations, local browser history, selected resources, app blocks, facts, media, and routes require explicit source/approval/failure boundaries.
- **Unsupported commerce logic:** no section may claim discounts, bundles, recommendations, variant selection, inventory, or checkout behavior beyond audited Shopify/runtime evidence.
- **Brief/implementation confusion:** a requirement summary does not prove source support; a runtime file does not automatically authorize selection, content, or AI configuration.
- **Section/page ownership conflicts:** sections must not own page H1, canonical metadata, mandatory main-region behavior, or page-level conversion flow.
- **Schema ownership conflicts:** sections must not emit competing structured data, duplicate stable IDs, or confuse similarly named setting/block fields.
- **Theme Editor complexity:** excessive settings, hidden dependencies, unrestricted Custom Liquid, duplicate instances, and uncleared lifecycle behavior can harm merchant safety.
- **AI selection ambiguity:** AI must use the Page/Section/Block contracts, approved resources, and deterministic priorities rather than composing every available section.

All conversion work remains documentation-first and evidence-led. It must not alter Shopify theme runtime, templates, schema, generated packages, merchant records, or approvals unless a separately authorized implementation task follows a validated specification.

## Validation Summary

This classification validates that:

- all 42 briefs are included in the authoritative table;
- every brief has exactly one primary classification;
- classification totals reconcile to 42;
- no brief was modified, moved, renamed, or deleted;
- no Canonical Section Specification was created;
- no folders were created or moved;
- implementation claims are based on audited Liquid/schema/template/component/behavior evidence;
- duplicates and overlaps are identified without collapsing distinct data or customer responsibilities;
- priorities are assigned by deterministic generation and architecture need;
- future conversion batches are proposed without beginning conversion.

The next conversion prompt must validate exact Canonical Section Template headings, source-brief preservation, actual implementation evidence, ownership/boundary decisions, block/settings authority, page placement, accessibility, performance, Theme Editor lifecycle, and no-fabrication behavior for its selected batch.

## Readiness

The library is ready to begin controlled canonical conversion. The exact recommended first batch is **Batch 1 — Factual editorial foundations**:

```text
Proposed editorial/brand-values.md
Proposed editorial/materials.md
Proposed social/awards-certifications.md
```

It is small, low-risk, server-rendered, block-bounded, and evidence-led. It establishes the conversion process before the P0 Hero/Product/Collection systems, commerce behavior contracts, global architecture, packs, or legacy compatibility cases are addressed. No conversion begins until a future task explicitly authorizes it.
