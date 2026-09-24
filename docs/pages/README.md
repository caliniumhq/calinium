# Calinium Page Specifications

## Purpose

This directory will define the authoritative contracts for complete, customer-facing Calinium storefront destinations. A page specification explains why a destination exists, the customer outcome it must support, and how its template, sections, and reusable components compose without transferring implementation detail to the wrong layer.

The page system sits after the Design System, implementation rules, component specifications, and section contracts. It makes page-level composition deterministic for merchants, Theme Editor configuration, presets, and future Calinium generation.

Calinium pages should feel quiet, intentional, fast, and trustworthy. They keep product and merchant content central, use the smallest sufficient composition, and never turn a storefront into a demonstration of every available section.

This audit records implementation evidence as of the current canonical theme at `apps/theme/`. It does not assert that every implemented template is complete or that every future Shopify destination is within Calinium’s supported scope.

### Calinium page philosophy

- Every page has one primary customer purpose.
- Product and merchant content remain central; luxury comes from restraint rather than decoration.
- Page hierarchy is calm, obvious, and designed to reduce uncertainty before a customer acts.
- Conversion comes through trust and clarity. No page may use dark patterns, fake urgency, fabricated social proof, or decorative complexity without customer value.
- Sections must earn their place through a required commerce role, verified merchant content, or a clear comprehension benefit.
- Essential commerce information remains visible and usable, especially on mobile.
- Merchant control is powerful but bounded by safe defaults, the Design System, and Shopify source-of-truth behavior.
- AI selects the smallest sufficient composition, preserves verified content and approvals, and leaves unsupported integrations out.
- Pages should remain timeless rather than trend-driven, responsive rather than desktop-first, and understandable without JavaScript.

## Page Definition

A page specification is the authoritative contract for one complete customer-facing storefront destination or a defined destination-level state. It owns the composition and verification of that destination, not the detailed implementation of every part used inside it.

A page specification may own:

- The page purpose, customer intent, and merchant outcome.
- Entry conditions and Shopify context.
- Semantic page structure, page-level heading hierarchy, landmarks, and one meaningful page title.
- Required, optional, conditional, and prohibited page regions.
- Allowed section families, ordering constraints, content density, and safe omissions.
- Component composition at the responsibility level.
- Destination-level empty, unavailable, partial, error, authentication, and restricted states.
- Mobile content priority, source-order requirements, and page-level performance priorities.
- Page-level SEO, structured-data boundaries, Theme Editor expectations, AI selection rules, and verification criteria.

A page specification must not own:

- Reusable primitive behavior already owned by `docs/components/`.
- Complete section schemas, block schemas, section JavaScript, or arbitrary section instance IDs.
- Shopify’s checkout, payment processing, order processing, inventory, tax, shipping, Markets, or customer-account infrastructure.
- Application, integration, or backend contracts.
- Visual preset implementation, raw design tokens, or unsupported merchant page-builder behavior.

The distinction is deliberate:

| Layer | Authoritative responsibility |
| --- | --- |
| Design System and implementation rules | Global visual language and implementation standards. |
| Component specification | One reusable interface responsibility. |
| Section documentation | One merchant-editable content or commerce composition. |
| Page specification | One destination’s purpose, region composition, hierarchy, states, and validation. |
| Shopify template | Runtime placement and Theme Editor section composition. |
| Shopify platform | Commerce facts, checkout, account hosting, policies, Markets, and route behavior it controls. |
| Integration | Verified optional capabilities such as reviews, pickup availability, wishlist, or subscriptions. |

## Ownership Boundaries

Page documentation must prevent duplicated ownership before it prescribes composition.

| Overlap | Page owner | Component owner | Section owner | Shopify owner | Prohibited duplication |
| --- | --- | --- | --- | --- | --- |
| Homepage and Hero | Whether a leading hero is required, supplies the H1, and its role in the page flow. | `Hero` owns reusable content and control principles. | The selected hero owns its settings and rendering. | Template order and merchant content sources. | The homepage must not restate hero schema or a hero must not independently add a second page H1. |
| Product Page and Product Information | Product decision flow, required commerce regions, and product H1. | `Product Information`, `Product Gallery`, `Variant Picker`, `Buy Buttons`, and `Sticky Add to Cart` own their bounded responsibilities. | `main-product` composes the product experience. | Product, variants, availability, price, media, and purchase form behavior. | The page must not recreate product-form or variant logic. |
| Collection Page and Collection Grid | Collection discovery intent, collection H1, and hierarchy between banner and results. | `Collection Grid`, `Filters`, `Sort`, `Pagination`, and `Product Card` own their reusable behaviors. | `collection-banner` and `main-collection-product-grid` own concrete rendering. | Collection data, filters, sort options, and pagination data. | Do not repeat a visible collection title in banner and grid. |
| Search Page and Search | Search purpose, result-state hierarchy, and indexability boundary. | `Search` owns query entry and predictive-search guidance. | `main-search` owns the server-rendered search results composition. | Search query, result types, filters, and predictive-search response. | The page must not invent search suggestions or reimplement Shopify result logic. |
| Cart Page and Cart Drawer | Cart destination, page-level recovery, and checkout boundary. | `Cart Drawer`, `Cart Line Item`, and `Cart Summary` own local interactions. | `main-cart` and global `cart-drawer` own runtime composition. | Cart state, checkout, discounts, and dynamic checkout availability. | The cart page must not redefine drawer modal behavior or checkout implementation. |
| Standard Page and Rich Text | Page title, page-content destination, and editorial suitability. | `Section Heading`, layout primitives, and content components own reusable presentation. | `main-page` and optional editorial sections own their settings. | `page.title` and `page.content`. | Do not turn a rich-text section into a second page-title system. |
| Blog Page and Article Card | Blog destination, list hierarchy, and pagination intent. | Article-card behavior belongs to the reusable article-card implementation. | `main-blog` owns list rendering. | Blog and article data. | Do not duplicate a blog-level H1 in cards. |
| Article Page and Rich Text or Social Sharing | Article reading flow and article H1. | Rich-text, sharing, and feedback primitives own local behavior. | `main-article` owns article composition. | Article, author, comments, and article navigation data. | Do not emit article schema in several components. |
| Authentication Page and Authentication Form | A future account destination may define route-level variants only. | `Authentication Form` owns the reusable form primitive. | No current account section exists. | Shopify customer-account mode and authentication infrastructure. | Theme documentation must not claim control of Shopify-hosted account pages. |
| 404 Page and Error Page | The independent not-found destination, recovery path, and navigation preservation. | `Error Page` owns full-page failure communication rules. | `main-404` owns runtime rendering. | Invalid-route response. | Do not document a 404 as a generic empty state. |
| Password Page and Authentication Form | A future password-protected-store destination, if supported. | Authentication Form may be a local primitive only when applicable. | No current password section exists. | Shopify password protection and access rules. | Do not imply current support or replace Shopify access control. |
| Gift Card Page and Currency Display or Copy Button | A future gift-card destination, if supported. | `Currency Display` and `Copy Button` own presentation and copying. | No current gift-card section exists. | Gift-card balance, code, and redemption rules. | Do not invent balance, expiry, or redemption behavior. |
| Policy Page and Standard Page | Policy information can be a constrained standard-page variant only when theme-owned. | Content primitives own rendering details. | `main-page` can render ordinary page content. | Shopify policy route and legal policy content where platform-hosted. | Do not create or paraphrase legal content in a theme specification. |
| Collection List Page and Collection Card | Discovery destination and page-level H1. | `Collection Card` owns each reusable collection representation. | `main-list-collections` owns its collection grid. | Collection list and collection data. | Do not make the component a second destination specification. |
| Page title and Section Heading | Whether a page has an H1 and how major regions descend from it. | `Section Heading` owns reusable section introduction only. | A section renders its configured introduction. | Theme template and source objects supply title content. | A section heading must not become a duplicate page title. |
| SEO and structured data | Destination applicability, duplication boundaries, and validation. | A component may provide only data tightly coupled to its real content. | A section must not emit overlapping page schemas. | Shopify source data and metadata it supplies. | Do not duplicate Product, Article, BreadcrumbList, Organization, or review schema. |

Allowed composition is role based. Page specifications may name existing implementation evidence, but future documents should select a section by a role such as “primary product decision region” or “collection discovery region” before choosing a concrete compatible section. A concrete file name is only appropriate where the template requires it or where the canonical implementation has a single safe path.

## Documentation Hierarchy

The Page Specification Library follows the existing Calinium documentation hierarchy.

```text
Product philosophy
        ↓
Design principles and Design System
        ↓
Implementation rules
        ↓
Component specifications
        ↓
Section documentation
        ↓
Page specifications
        ↓
Shopify templates and section groups
        ↓
Theme presets and deterministic AI generation
```

Page documents inherit, rather than duplicate, these sources:

- `product/manifesto.md`, `product/principles.md`, `product/personality.md`, `product/terminology.md`, and `product/decision-matrix.md` for Calinium’s merchant-first, recommendation-first philosophy.
- `docs/Design/` for quiet luxury, typography, spacing, color, imagery, motion, accessibility, grid, and preset rules.
- `docs/implementation/` for Shopify-native, progressive-enhancement, component, layout, motion, imagery, typography, and spacing rules.
- `docs/components/README.md` and its 113 component specifications for reusable interaction and presentation responsibilities.
- `docs/sections/` for concrete section architecture and manual QA.
- `docs/ai/` and `docs/architecture/` for deterministic generation, approval, mapping, validation, package, and runtime boundaries.

No page document may override those sources. When a requirement belongs to another layer, the page document must link to or name that owner instead of restating its full contract.

## Page Categories

The proposed taxonomy matches the actual Shopify theme architecture and separates destinations by customer purpose rather than implementation convenience.

```text
docs/pages/
├── README.md
├── storefront/
├── catalog/
├── commerce/
├── editorial/
├── account/
└── system/
```

| Category | Purpose | Current implementation evidence | Documentation posture |
| --- | --- | --- | --- |
| `storefront/` | Entry and broad brand/product discovery. | `templates/index.json`. | Supported; begin here. |
| `catalog/` | Product, collection, collection-list, and search discovery. | `product.json`, `collection.json`, `list-collections.json`, and `search.json`. | Supported. |
| `commerce/` | Customer cart review before Shopify checkout. | `cart.json` plus global `cart-drawer`. | Supported; checkout remains outside theme ownership. |
| `editorial/` | Merchant-authored pages and publishing destinations. | `page.json`, `page.contact.json`, `blog.json`, and `article.json`. | Supported with controlled variants. |
| `account/` | Theme-owned customer account destinations only. | Header account entry link only; no customer templates or account sections. | Deferred and conditional. |
| `system/` | Independent platform or destination-level system states. | `404.json` only. | `404` supported; password and gift card deferred. |

Checkout must not receive a normal theme-page specification. Shopify owns checkout structure, payment, tax, shipping, order confirmation, and the checkout surface. A future document may describe the handoff from Cart Page to checkout without representing checkout as a Calinium page.

## Current Template Inventory

### Template evidence

The canonical storefront contains 11 JSON templates under `apps/theme/templates/`. There are no Liquid templates in that directory, no `templates/customers/` directory, no password template, no gift-card template, and no custom product or collection alternates. The only alternate is `page.contact.json`.

All templates render inside `layout/theme.liquid`, which supplies the skip link, one `main` landmark, the header and footer section groups, the global cart-drawer section, metadata, and product/article structured data. Header, footer, cart drawer, localization controls, and predictive search are global or page-like compositions; they are not separate Shopify destination templates.

| Template path | Shopify template type | Format | Purpose | Assigned sections | Important snippets or components | Implementation status | Documentation status | Merchant configurability | Page-level SEO and structured-data needs | States and dependencies | Independent specification? | Category and proposed file | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `apps/theme/templates/index.json` | Home page | JSON | Primary storefront entry, brand introduction, and early product discovery. | `full-screen-hero`, `featured-collection`, `image-with-text`, `rich-text`, `newsletter`. | Hero, Product Card, Responsive Image, Button, Section Heading, newsletter customer form. | Canonical resource-free bootstrap; five active sections. | `docs/sections/homepage-bootstrap.md`; no page specification. | JSON section order; editable content and selected collection; global header/footer. | One H1 supplied only by first eligible premium hero; canonical metadata; no page-specific JSON-LD in source. Resource-free hero and collection-placeholder states. | Yes. | `storefront/homepage.md` | High |
| `apps/theme/templates/product.json` | Product | JSON | Product decision, purchase, trust, and related discovery. | `main-product`, `product-recommendations`, `recently-viewed-products`. | Product Information, Product Gallery, Variant Picker, Quantity Selector, Buy Buttons, Sticky Add to Cart, Product Card, Price. | Canonical M20 product path. | `docs/sections/premium-product.md`; no page specification. | Product-section settings, blocks, optional app blocks, recommendations and recently viewed configuration. | Product H1 from `main-product`; Product JSON-LD is emitted once by layout for real product data. Product-without-media and unavailable variants are supported; reviews and complementary products are conditional. | Yes. | `catalog/product.md` | High |
| `apps/theme/templates/collection.json` | Collection | JSON | Collection discovery, filtering, sorting, and product browsing. | `collection-banner`, `main-collection-product-grid`. | Collection Grid, Filters, Sort, Pagination, Product Card, Responsive Image, Button. | Canonical M21 collection path. | `docs/sections/premium-collection.md`; no page specification. | Banner image and mobile override, description visibility, filters, sorting, grid, cards, and pagination mode. | Collection H1 belongs to banner; grid uses a visually-hidden H2. No CollectionPage JSON-LD is emitted in source. Empty collection, unavailable filter capability, and enhancement failure remain distinct. | Yes. | `catalog/collection.md` | High |
| `apps/theme/templates/list-collections.json` | Collection list | JSON | Broad collection discovery. | `main-list-collections`. | Collection Card, Pagination, Responsive Image, Empty State. | Single canonical implementation. | Component documentation exists; no page specification. | Product-count visibility, grid columns, image ratio, color scheme. | Localized H1; no collection-list JSON-LD in source. Empty list is rendered. | Yes; the implementation is distinct and reusable. | `catalog/collection-list.md` | High |
| `apps/theme/templates/search.json` | Search | JSON | Search entry, result discovery, filtering, sorting, and no-results recovery. | `main-search`. | Search, Product Card, Filters, Sort, Pagination, Search Result Card, Button. | Canonical M21 search path. | `docs/sections/premium-collection.md`; no page specification. | Results per page, grid/card settings, predictive-search toggle, color scheme. | Search H1; `meta-tags` sets `noindex,follow`; results, no-results, pre-search, predictive availability, and filter states exist. No SearchResultsPage JSON-LD is emitted. | Yes. | `catalog/search.md` | High |
| `apps/theme/templates/cart.json` | Cart | JSON | Cart review, line-item changes, and handoff to Shopify checkout. | `main-cart`. | Cart Line Item, Cart Summary, Quantity Selector, Product Card, Empty State, Button. | Canonical M22 cart-page path; uses global drawer as enhancement. | `docs/sections/premium-cart.md`; no page specification. | Cart-note, summary, recommendation, shipping-threshold, product-list, and presentation settings. | Cart H1; empty cart, cart update/error, recommendations unavailable, and loading states. No cart JSON-LD is emitted. Checkout is Shopify-owned. | Yes. | `commerce/cart.md` | High |
| `apps/theme/templates/page.json` | Standard page | JSON | General merchant-authored informational or editorial page. | `main-page`. | Section Heading boundary, content and layout primitives, Rich Text. | Single constrained page-content rendering path. | No page specification. | Title visibility, content width, alignment, color scheme; additional Theme Editor sections may be added where Shopify permits. | H1 is currently optional when `show_title` is disabled; no dedicated JSON-LD. Missing content renders no body region. Policy behavior is not explicitly implemented. | Yes. | `editorial/standard-page.md` | High |
| `apps/theme/templates/page.contact.json` | Page alternate: contact | JSON | Contact request destination using Shopify’s contact form. | `contact-form`. | Field, Text Input, Textarea, Validation Message, Button, Alert/Inline Message principles. | Distinct alternate implementation. | Contact-form section documentation only; no page specification. | Heading, supporting text, phone visibility, color scheme. | Contact form success and errors are server-rendered; visible H1 comes from configured heading or `page.title`. Shopify handles form delivery. No ContactPage JSON-LD is emitted. | Yes; the goal and form state differ materially from Standard Page. | `editorial/contact.md` | High |
| `apps/theme/templates/blog.json` | Blog | JSON | Article discovery and editorial index. | `main-blog`. | Article Card, Pagination, Responsive Image, Empty State. | Single canonical blog index. | No page specification. | Description, article count, metadata visibility, image ratio, color scheme. | Blog H1; empty blog state; pagination. No Blog JSON-LD is emitted. | Yes. | `editorial/blog.md` | High |
| `apps/theme/templates/article.json` | Article | JSON | Editorial reading, comment discussion where enabled, sharing, and adjacent article navigation. | `main-article`. | Responsive Image, article metadata, Social Sharing, Pagination, Field primitives, Button. | Single canonical article path. | No page specification. | Featured-image, metadata, sharing, comments, color scheme. | Article H1; Article JSON-LD is emitted once by layout for real article data. Comments are conditional on Shopify/blog configuration; next/previous navigation is conditional. | Yes. | `editorial/article.md` | High |
| `apps/theme/templates/404.json` | 404 | JSON | Invalid-destination recovery. | `main-404`. | Error Page, Search, Button. | Single canonical not-found page. | Error Page component documentation only; no page specification. | Collections-link visibility and color scheme. | Localized H1, search, root and optional collection recovery actions. No 404 JSON-LD is emitted. | Yes. | `system/404.md` | High |

### Page-like and global destinations

These are implementation evidence and must be referenced by the appropriate page specification. They must not be documented as independent destinations unless a future template or platform contract creates one.

| Page-like destination or state | Source evidence | Ownership and documentation treatment |
| --- | --- | --- |
| Header predictive-search results | `sections/header.liquid`, `sections/predictive-search.liquid`, `snippets/predictive-search-results.liquid`, and `assets/predictive-search.js`. | Search Page owns search intent and no-results recovery; Search component and predictive-search section own the enhanced inline results. It is not a separate page. |
| Global cart drawer | `sections/cart-drawer.liquid`, `assets/cart-drawer.js`, and `assets/cart.js`. | Cart Page owns destination-level cart and checkout handoff; Cart Drawer owns overlay behavior. The drawer is a progressive enhancement, not an independent page. |
| Header account entry | `sections/header.liquid` uses `routes.account_login_url` and `routes.account_url`. | Account destinations are Shopify/customer-account dependent. This is navigation evidence only, not an implemented account page. |
| Localization controls | Header and footer use Shopify localization data when multiple countries or languages are available. | Localization components own control mechanics; every page must preserve the configured locale and market context. This is not a localized duplicate page type. |
| Header and footer groups | `sections/header-group.json`, `sections/footer-group.json`, and `layout/theme.liquid`. | Global chrome belongs to Navigation and Content documentation. Page specifications may require its landmark relationship and may not redefine it. |
| Cart update, product recommendation, and recently-viewed states | `main-cart`, `product-recommendations`, and `recently-viewed-products`. | These remain regions or states of Cart and Product Page, never standalone destinations. |

### Absent, deferred, and Shopify-standard templates

The following Shopify-standard or commonly expected destinations have no canonical template or dedicated section in this repository. They are not missing content to invent; they are future implementation decisions.

| Destination | Repository evidence | Documentation decision |
| --- | --- | --- |
| Customer login, registration, account overview, addresses, order details, activation, password recovery, and password reset | No `apps/theme/templates/customers/` directory and no account sections. Only header links to Shopify account routes. | Defer all account page specifications. A future `account/authentication.md` may cover materially similar authentication variants after the selected customer-account architecture is verified. |
| Password-protected storefront | No `templates/password.*` or password section. | Defer `system/password.md` pending founder scope approval and implementation evidence. |
| Gift card | No `templates/gift_card.liquid`, JSON gift-card template, or gift-card section. | Defer `system/gift-card.md` pending founder scope approval and implementation evidence. |
| Policy-specific template | No dedicated policy template or route behavior in the theme. | Treat merchant-authored policy content as a constrained Standard Page variant only when theme-owned; defer a dedicated policy page specification. Shopify-hosted policy behavior remains Shopify-owned. |
| About or editorial alternate | No `page.about.json` or distinct about section assignment. | Treat as a Standard Page composition variant. Do not create an independent About Page specification until a distinct page purpose and architecture are implemented or approved. |
| Product and collection alternates | No alternate product or collection template files. | Do not create alternate specifications. Future alternates should be controlled variants of their canonical page specification unless their functional purpose differs. |
| Demo-only templates | No demo-only template or alternate is present. `settings_data.json` contains a `Calinium One` preset and global visual defaults, but no committed store-specific product, collection, or page references. | Do not document a demo page. Keep demo configuration distinct from canonical page contracts. |

## Proposed Page Specifications

The following are the proposed individual documents. This list is a documentation plan only; this milestone creates none of these files.

| Sequence | Proposed file | Status | Evidence and boundary |
| --- | --- | --- | --- |
| 1 | `docs/pages/storefront/homepage.md` | First specification to create. | Canonical bootstrap exists; it defines the most important page-level hierarchy, H1, leading media, and section-density rules. |
| 2 | `docs/pages/catalog/product.md` | Ready after Homepage. | Canonical product template and M20 system are implemented. |
| 3 | `docs/pages/catalog/collection.md` | Ready after Product. | Canonical collection banner and grid are implemented. |
| 4 | `docs/pages/catalog/search.md` | Ready after Collection. | Canonical search template is implemented; owns pre-search and no-results states. |
| 5 | `docs/pages/catalog/collection-list.md` | Ready after Search. | A distinct list-collections template and collection-card composition exist. |
| 6 | `docs/pages/commerce/cart.md` | Ready after Catalog. | Canonical cart page and global drawer composition exist; checkout boundary is explicit. |
| 7 | `docs/pages/editorial/standard-page.md` | Ready after Cart. | Canonical `page.json` exists; About and policy remain controlled variants. |
| 8 | `docs/pages/editorial/contact.md` | Ready after Standard Page. | `page.contact.json` and a dedicated contact-form section provide a materially distinct purpose and state model. |
| 9 | `docs/pages/editorial/blog.md` | Ready after Contact. | `blog.json` and `main-blog` exist. |
| 10 | `docs/pages/editorial/article.md` | Ready after Blog. | `article.json`, Article JSON-LD, comments, and social sharing exist. |
| 11 | `docs/pages/system/404.md` | Ready after Editorial. | A dedicated `404.json` and recovery design exist. |
| 12 | `docs/pages/account/authentication.md` | Deferred. | May group login, registration, activation, password recovery, and reset only after actual account implementation and Shopify account mode are confirmed. |
| 13 | `docs/pages/account/account-overview.md` | Deferred. | No current account overview template or section. |
| 14 | `docs/pages/account/addresses.md` | Deferred. | No current addresses template or section. |
| 15 | `docs/pages/account/order-details.md` | Deferred. | No current order template or section. |
| 16 | `docs/pages/system/password.md` | Deferred pending scope approval. | No password template or section. |
| 17 | `docs/pages/system/gift-card.md` | Deferred pending scope approval. | No gift-card template or section. |

The following concepts are variants or states, not independent planned files:

- About and policy content are controlled Standard Page variants until a distinct implementation proves a different page contract.
- Empty Collection belongs to Collection Page; No Search Results belongs to Search Page; Empty Cart belongs to Cart Page.
- Sold out is product availability within Product Page and Product Card, not a separate page.
- Predictive search is a Search Page enhancement, not a destination.
- Cart drawer is a Cart Page enhancement, not a page.
- Product recommendations, complementary products, recently viewed products, and merchant-selected recommendations are conditional regions, not pages.
- Account activation, recovery, reset, login, and registration may become Authentication Page variants only after account architecture is supported.
- Maintenance remains a verified operational state, not a template or planned page file.

## Standard Page Template

Every future individual page specification must use this exact heading order. A page may state that a heading is not applicable, but it must not omit the heading or invent a parallel structure.

```markdown
# Page Name

## Purpose

## Customer Goals

## Merchant Goals

## Shopify Context

## Entry Conditions

## Page Structure

## Required Regions

## Optional Regions

## Section Composition

## Component Composition

## Content Rules

## Supported Variants

## Supported States

## Navigation and Actions

## Responsive Behaviour

## Accessibility

## SEO

## Structured Data

## Shopify Settings

## Theme Editor Behaviour

## Performance Rules

## AI Guidelines

## Quality Checklist

## Future Compatibility
```

This template is deterministic by design. It separates page purpose from section and component implementation, makes SEO and structured-data ownership explicit, preserves Theme Editor composition rules, and supports implemented as well as deferred future destinations without silently expanding scope.

## Page-Level Heading Rules

Each page specification must calculate semantic hierarchy from the complete page composition before it selects sections.

1. A normal customer-facing page has one visible, meaningful H1. The page specification decides where it belongs.
2. Homepage may assign the first eligible premium hero as the H1. The current `full-screen-hero` only emits H1 when it is the first homepage hero and its `heading_tag` is `h1`; otherwise it safely emits H2. No later homepage section may add another H1.
3. Product Page assigns the product title in `main-product` as its H1. Product information, media, and purchase controls must not introduce another product-title H1.
4. Collection Page assigns the collection title in `collection-banner` as its H1. `main-collection-product-grid` currently provides an associated visually-hidden H2 for the product region; it must not repeat the visible collection title.
5. Search, Cart, Collection List, Blog, Article, Standard Page when title visibility is enabled, Contact, and 404 currently render their page-leading H1 in their canonical main section.
6. Article content owns the article H1. Blog cards and related content must start below it.
7. `Section Heading` owns reusable section introductions, not a page title. It should start with H2 unless the complete page specification explicitly establishes another valid level.
8. A page must not hide a necessary H1 merely for visual preference. The current Standard Page `show_title` setting demonstrates an implementation hardening requirement: a future Standard Page specification must require an authoritative H1 even if presentation changes.
9. AI must validate the final rendered page hierarchy, including dynamically selected sections, rather than validate each section in isolation.

## Section Composition Rules

Page specifications define roles, order, and constraints; sections define their own settings and implementation.

### Region classes

| Region class | Meaning | Page-specification treatment |
| --- | --- | --- |
| Mandatory functional | Required for the customer to complete the destination’s core purpose. | Must have a safe present implementation or explicit Shopify handoff. Examples: Product purchase region, collection results, cart summary, or a page-leading title. |
| Recommended content | Strongly useful for comprehension, trust, or discovery. | Select only when verified merchant content and the approved strategy support it. |
| Optional editorial | Brand storytelling that can improve a destination but is not necessary for core commerce. | Omit first when content is unavailable, duplicated, or weak. |
| Integration-dependent | Requires verified Shopify or third-party capability. | Omit cleanly unless the capability, resource, and merchant approval are verified. |
| Prohibited | Risks duplication, broken commerce, unsupported functionality, or an incoherent purpose. | Must never be selected. |

### Composition rules

- Use the smallest sufficient number of sections. Every section must earn its place through customer value, merchant content, or a required commerce role.
- Preserve required template regions such as `main-product`, `main-collection-product-grid`, `main-cart`, `main-search`, `main-blog`, `main-article`, `main-page`, `contact-form`, `main-list-collections`, and `main-404`.
- Treat global header, footer, cart drawer, and localization as global chrome. Page documents may state their required relationship to `main`, but must not duplicate their schemas.
- Prefer section families and composition roles. Do not hard-code a section instance ID in a page specification.
- Do not select a long editorial sequence merely because the theme contains related sections. Product discovery, cart review, and search must remain concise and commerce-first.
- Do not remove purchasing, navigation, search, selection, filter, or checkout-handoff functionality without a verified safe fallback.
- Do not duplicate products, collection descriptions, customer content, or calls to action across the banner, grid, card, and editorial regions.
- A resource-dependent region may appear only after the resource exists, belongs to the approved project or merchant configuration, and meets its section’s documented requirements.

## Component Composition Rules

Pages compose documented components; they do not redefine them.

- Use the `docs/components/` authoritative names when referring to reusable behavior.
- Product Page composes Product Gallery, Product Information, Variant Picker, Quantity Selector, Buy Buttons, Sticky Add to Cart, Price, and optional trust or recommendation components.
- Collection and Search Page compose Product Card, Collection Grid, Filters, Sort, Pagination, Search, Responsive Image, and appropriate Feedback states.
- Cart Page composes Cart Line Item, Quantity Selector, Cart Summary, Cart Drawer, Product Card, and Empty State. It never owns checkout behavior.
- Editorial pages compose content, media, layout, form, and feedback primitives without turning them into page-specific replacements.
- Header, Footer, Announcement Bar, Breadcrumbs, localization controls, Toast, Modal, Drawer, and Icon System retain their existing component ownership.
- A page may reference a component’s accessibility or performance contract, but must not copy its full keyboard, focus, motion, or schema rules.

## Supported Page States

All future page specifications must select only states that apply to the destination and identify the owner of each state.

| State | Meaning | Ownership rule |
| --- | --- | --- |
| Default | The destination has valid source data and core regions are ready. | Page owns composition; Shopify owns source data. |
| Loading | Content or an enhancement is not ready yet. | Never represent Loading as Empty. Prefer server-rendered content; enhancement loading must preserve a usable baseline. |
| Empty | Content loaded successfully but contains no items. | Belongs to its page: Empty Cart, Empty Collection, Empty Blog, Collection List empty, or no search results. |
| Unavailable | A real capability or resource cannot be provided. | Must not imply failure when an integration is intentionally unsupported or not configured. |
| Partial | Core destination remains available while optional content is absent or unavailable. | Integration failures must not block core content. |
| Error | A requested destination or action failed. | Must remain distinct from Empty and expose no internal detail. |
| Signed-out | A customer has not authenticated where an actual customer-account route requires it. | Do not fabricate it from header state; Shopify account architecture owns the route. |
| Signed-in | A verified account state is available. | Shopify/customer-account system owns the fact. |
| Restricted | The customer lacks verified access to a destination. | Do not infer account or policy restrictions. |
| Password-protected | Shopify has verified store access is required. | No current implementation; do not document as active support. |
| No-results | A completed search returned none. | A Search Page variant, not an Empty State substitute for a search failure. |
| Sold-out | A product or selected variant is unavailable. | Product availability state, not a page. |
| Unpublished | Merchant or Theme Editor preview state. | Theme Editor and Shopify own the preview context; content must remain safe. |
| Maintenance | A verified planned interruption. | Do not introduce a Maintenance State without an operational source of truth. |

## Accessibility Requirements

Every page specification must apply the authoritative Accessibility System and component rules at destination level.

- Render one `main` landmark; the current layout provides `#MainContent` and the skip-link target.
- Define one page-leading H1 and a logical, non-duplicated hierarchy through major regions.
- Preserve source order for reading, keyboard navigation, mobile layouts, browser zoom, large text, and RTL languages. Visual reordering must not obscure the logical sequence.
- Provide a meaningful document title through the existing metadata path and an understandable visible destination title.
- Identify page-level landmarks and navigation labels without replacing component-level accessible-name rules.
- Keep all required commerce content operable by keyboard, including pagination, filters, product selection, cart quantity changes, and checkout handoff.
- Place page-level error summaries before the affected action when the actual form or operation returns an error. Preserve entered data where Shopify returns it.
- Keep Empty, No-results, Unavailable, and Error states concise, distinct, and recovery oriented. Do not use color alone.
- Use live regions only for real dynamic changes. Do not duplicate an announcement in an Alert, Toast, inline feedback, and global status region without separate purpose.
- Do not move focus automatically after ordinary asynchronous updates. When a modal filter or overlay opens, its owning component manages focus; the page preserves the reading order around it.
- Respect reduced-motion preferences and never make essential content depend on animation, scrolling, a carousel, or JavaScript.

## Responsive Requirements

Page specifications own content priority and region order; layout sections and components own the CSS mechanics.

- Begin with the 320 px experience, then preserve the same core purpose at 375 px, 430 px, tablet portrait, tablet landscape, laptop, desktop, and wide desktop.
- Keep the most useful information and primary commerce action early in source order. Product media and purchase information, collection title and product results, search query and results, and cart line items and summary must remain understandable on smaller screens.
- Never hide a desktop-only essential region on mobile. Use safe progressive disclosure only for optional or repeated information.
- Prevent horizontal page overflow under translated copy, browser zoom, larger text, long product titles, long variant labels, and merchant-authored content.
- Preserve responsive media priorities, intrinsic aspect-ratio handling, and mobile-specific assets through the documented Media components.
- Use touch-safe controls and avoid hover-only information or actions. Sticky behavior must remain restrained and cannot obscure page titles, purchase controls, or checkout handoff.
- Prefer CSS for layout adaptation. JavaScript must not be required to establish a basic destination layout.
- Preserve locale and market state without duplicating pages for language or country selection.

## SEO Requirements

SEO is a page-level concern with clear limits. The current `snippets/meta-tags.liquid` supplies the canonical URL, title, description when present, Open Graph and Twitter metadata, and `noindex,follow` for search. Future page specifications must describe applicability, not claim control over Shopify behavior that the runtime does not implement.

| Requirement | Owner and rule |
| --- | --- |
| Meaningful page title | The page specification requires a meaningful title; the current metadata snippet renders `page_title` with `shop.name` when absent. |
| Meta description | Merchant or Shopify page description remains the source. A page must not invent copy or keyword-stuff a description. |
| Canonical URL | The current metadata snippet renders `canonical_url`. Page specifications must not add competing canonical tags. |
| Indexability and robots | Search explicitly renders `noindex,follow`. Other robot behavior is not altered by the current theme and must not be assumed. |
| Heading hierarchy | Page specification owns the visible H1 and hierarchy. Hidden or duplicate keyword headings are prohibited. |
| Internal links | Page documents may require genuine recovery or discovery links only when a verified destination exists. |
| Pagination | Collection, Collection List, Blog, Article comments, and Search use Shopify pagination. Future documentation must respect Shopify canonicalization and must not invent pagination metadata. |
| Filtered collection and search URLs | Shopify owns filter and search URL behavior. Do not create SEO hacks or duplicate canonical rules. |
| Social sharing metadata | `meta-tags` selects real product, collection, or article image when available. Components must not add competing social tags. |
| Image alt text | Media and content owners supply meaningful text from real merchant or Shopify content. Page documents require coverage but never invent descriptions. |
| Localization and alternate languages | Shopify locale and market context own URLs and alternate-language behavior. No current theme implementation adds hreflang tags; page documents must not promise them. |
| Merchant-content authenticity | Titles, descriptions, product information, articles, reviews, and claims must come from verified merchant or Shopify data. |

## Structured Data Requirements

Structured data must be valid, applicable, and emitted once. The current layout conditionally emits Shopify’s `product | structured_data` for real Product pages and `article | structured_data` for real Article pages through `structured-data-product.liquid` and `structured-data-article.liquid`.

| Destination | Current evidence | Future page-specification rule |
| --- | --- | --- |
| Homepage | No page-specific JSON-LD emitted in source. | Do not introduce `WebSite` or `Organization` schema until validated source data and one clear owner exist. |
| Product | Shopify Product structured data emitted once by layout for a real `product`. | Product Page may require validated Product data but must never duplicate it in gallery, price, card, or recommendation components. |
| Collection | No CollectionPage JSON-LD emitted in source. | A future CollectionPage schema requires evidence, valid data, and one page-level owner. |
| Collection List | No page-level JSON-LD emitted in source. | Do not create collection-list schema without a validated need. |
| Search | No SearchResultsPage JSON-LD emitted in source. | Search results must remain `noindex,follow`; evaluate schema only if it is applicable and validated. |
| Cart | No cart JSON-LD emitted. | Do not create commerce or checkout claims. |
| Standard, Contact, and policy variant | No WebPage, AboutPage, ContactPage, or policy JSON-LD emitted in source. | Add only after page type, source content, and duplication boundary are verified. |
| Blog | No Blog JSON-LD emitted in source. | Evaluate only when the merchant’s blog data is suitable and a page-level owner exists. |
| Article | Shopify Article structured data emitted once by layout for a real `article`. | Article Page must not duplicate it in Article Card, sharing, or content components. |
| 404, Password, Gift Card, Account | No structured data evidence. | Do not add schema for error, restricted, account, or unsupported destinations by default. |

Review schema requires verified review data from a real integration. BreadcrumbList requires a canonical breadcrumb source and one owner. Organization schema requires verified merchant organization data. No page or component may fabricate ratings, authors, prices, availability, organization details, or review facts merely to populate JSON-LD.

## Shopify Requirements

Future page specifications must remain Shopify Online Store 2.0 native.

- JSON templates define page composition; `apps/theme/templates/` is the current evidence base.
- Sections remain the merchant-editable composition layer. They must have one responsibility, documented settings, safe defaults, and progressive enhancement.
- Snippets receive explicit inputs and keep reusable behavior bounded. A page document must not turn a snippet into a hidden page controller.
- Dynamic sources, product, collection, blog, article, cart, search, localization, and customer data remain Shopify source-of-truth data.
- Header and footer section groups, the cart drawer, app blocks, and localization are global or integration surfaces. They must remain compatible without forcing a page-specific implementation.
- Checkout, payment, order, inventory, taxes, shipping, customer-account infrastructure, Markets configuration, and policy infrastructure remain Shopify-owned.
- Do not create unsupported templates, custom customer-account functionality, private data flows, or unverified integration behavior from documentation or generation output.
- Preserve useful no-JavaScript behavior: native links, forms, collection/search filters, sorting, pagination, product variant selection, Add to Cart, cart quantity controls, and checkout submission remain the baseline.

## Theme Editor Requirements

Page specifications must state the page-level composition rules that a merchant and the Theme Editor can safely support.

| Region classification | Page-documentation requirement |
| --- | --- |
| Shopify required | Identify Shopify source data and platform behavior that cannot be replaced by Theme Editor settings, such as product object data or checkout. |
| Theme required | Identify the canonical functional main section and any required safe fallback. Examples include `main-product`, `main-cart`, and `main-search`. |
| Merchant removable | Allow removal only when the destination remains understandable and functional. Optional editorial and recommendation regions must omit cleanly. |
| Merchant reorderable | State allowed ordering constraints. For example, a leading homepage hero may precede discovery; product decision content cannot move after a related-products region. |
| Single instance | Mark canonical leading or functional regions that may appear only once, such as the current main sections and collection banner. |
| Repeatable | Permit only content sections whose own schema supports repeatable instances and whose repetition does not duplicate purpose or headings. |
| Integration dependent | Make app blocks, reviews, pickup availability, wishlist, compare, subscriptions, loyalty, returns, shipping estimates, external video, and advanced account features conditional on verified capability. |

Theme Editor requirements for every page specification:

- Preserve valid merchant configuration, selected resources, and source content.
- Do not remove essential purchasing, navigation, search, filter, cart, or checkout-handoff functionality without a safe fallback.
- Define behavior for missing content in storefront and Theme Editor preview separately when appropriate. Preview placeholders must never become merchant-facing claims.
- Require section lifecycle safety: section reload, unload, selection, block selection, reorder, and settings refresh cannot create duplicate listeners, observers, timers, or media playback.
- Identify how alternate templates apply. The only current alternate is `page.contact`; no product or collection alternate may be assumed.
- Keep merchant configuration focused on content, visibility, and approved bounded choices. Design-system tokens, focus behavior, accessibility semantics, performance priorities, and implementation mechanics remain controlled by Calinium.

## Performance Requirements

Every page specification must identify likely LCP content, critical commerce interactions, optional integrations, deferrable regions, and page-specific risks before generation selects sections.

- Server-render core content and critical commerce controls. JavaScript may enhance but must not create a blank destination.
- Identify one likely LCP candidate from verified rendered content: the leading homepage hero, collection banner where present, product’s first media, or article featured image. Preload or high priority applies only to the verified primary candidate.
- Use responsive images, intrinsic dimensions or equivalent space reservation, and below-fold lazy loading. Avoid duplicating desktop and mobile media in the DOM when one responsive primitive can serve the source.
- Keep above-fold JavaScript minimal. Predictive search, filters, gallery behavior, cart drawer, and recommendation fetching are enhancements that must fail safely.
- Defer optional integrations, recommendations, external video, reviews, wishlist, comparison, pickup availability, subscriptions, loyalty, returns, and advanced account functions until their capability and data are verified.
- Avoid unnecessary section count, hidden duplicate sections, autoplay media, repeated layout measurement, and duplicated section initialization.
- Preserve stable layout when feedback, filters, cart updates, recommendation regions, or content states change.
- Clean up timers, observers, event listeners, and media behavior during Theme Editor rerenders.
- Never let application scripts block core commerce or make a storefront page depend on an application response.

## Integration Boundaries

Optional integrations are omission-first. A page remains useful when they are absent, fail, or are disabled.

| Integration or capability | Possible page contexts | Selection rule |
| --- | --- | --- |
| Reviews and ratings | Product Page, Product Card, collection/search/recommendation regions. | Render only from verified review data and avoid duplicate schema or invented social proof. |
| Wishlist and comparison | Product Card, Product Page, collection/search discovery. | Current code exposes integration hooks only where documented. Do not create a local list, count, or account state without a verified service. |
| Pickup availability | Product Page. | Render only when Shopify or a verified app supplies real location and availability data. |
| Shipping estimate, returns, loyalty, subscriptions | Product, Cart, and account-related contexts. | Require merchant-approved verified data and a supported integration. Do not invent policy or delivery claims. |
| Product recommendations and complementary products | Product and Cart. | Use real Shopify responses or explicit merchant selections. Hide unavailable regions rather than fabricate products. |
| Geolocation, currencies, and Markets | Global header/footer localization controls and all page contexts. | Shopify owns country, language, currency, and market state. Page documents preserve context but never reimplement Markets. |
| External video providers | Hero, editorial, product media where existing primitives support them. | Include only when a compatible source, fallback, privacy behavior, and merchant approval exist. |
| Customer accounts | Header entry and future account pages. | Defer theme-owned account specifications until the selected Shopify account architecture and templates are present. |

Integration failure must not block the core page. A page specification must define the safe omission and feedback boundary rather than pretending an optional capability is always present.

## AI Generation Rules

Future Calinium generation follows this deterministic page-composition flow:

```text
Merchant Profile
        ↓
Brand Blueprint
        ↓
Store Strategy
        ↓
Page Requirement
        ↓
Page Specification
        ↓
Required Functional Regions
        ↓
Optional Content Roles
        ↓
Section Selection
        ↓
Component Composition
        ↓
Content Mapping
        ↓
Responsive Validation
        ↓
Accessibility Validation
        ↓
Performance Validation
        ↓
SEO Validation
        ↓
Theme Output
```

AI must:

- Select a page specification from the Shopify destination and its verified implementation support.
- Preserve mandatory functional regions and Shopify source-of-truth behavior.
- Use the smallest sufficient section composition in deterministic order.
- Use verified merchant resources, approved Resource Plan selections, and actual Shopify objects only.
- Preserve page-level H1 ownership and valid section-heading hierarchy.
- Reuse documented components and compatible documented sections instead of creating parallel page widgets.
- Omit unsupported or integration-dependent regions when capability, data, approval, or fallback is absent.
- Preserve merchant strategy and approvals while retaining page-specific mobile, accessibility, performance, SEO, and structured-data rules.
- Validate default, empty, unavailable, partial, and error states relevant to the selected destination.
- Produce a traceable explanation for each selected, omitted, required, or blocked region.

AI must never:

- Invent products, collections, reviews, account data, navigation destinations, shipping claims, tax claims, policies, page purposes, or resource availability.
- Create unsupported templates or treat a global overlay as an independent page.
- Duplicate H1 headings, products, descriptions, structured data, or functionality across sections.
- Add fake urgency, fabricated social proof, deceptive scarcity, or made-up recovery actions.
- Hide essential commerce information, disrupt checkout ownership, or generate long editorial sequences unrelated to the merchant’s actual store need.
- Select integration-dependent sections without verified capability and merchant approval.
- Override immutable approved inputs, canonical Shopify source objects, or valid merchant configuration.

## Documentation Sequence

The approved creation sequence prioritizes core customer journeys and currently implemented page architecture.

1. Create `storefront/homepage.md` first. It establishes the page-system conventions for H1 ownership, leading media, section density, safe resource-free behavior, and global chrome relationship.
2. Create `catalog/product.md`, then `catalog/collection.md`, `catalog/search.md`, and `catalog/collection-list.md`.
3. Create `commerce/cart.md` with an explicit checkout and cart-drawer boundary.
4. Create `editorial/standard-page.md`, `editorial/contact.md`, `editorial/blog.md`, and `editorial/article.md`.
5. Create `system/404.md`.
6. Re-evaluate deferred Account, Password, and Gift Card specifications only after implementation and scope decisions provide evidence.

The sequence is intentionally not a mandate to document every possible Shopify destination. It should pause when an implementation gap, platform-owned surface, or founder scope decision makes a page contract speculative.

## Deferred Scope

The following scope remains deferred and must not be implied by future page specifications until implementation evidence and product scope support it:

- Full classic or new Shopify customer account pages, account authentication, addresses, orders, activation, recovery, and reset flows.
- Password-protected storefront and gift-card template support.
- Checkout, payment, order confirmation, order status, inventory calculations, tax calculations, shipping calculations, and Markets configuration.
- Dedicated About, policy, and product/collection alternate templates.
- Maintenance, offline, connection, and application-level system pages without a verified operational architecture.
- Reviews, wishlist, comparison, pickup availability, subscriptions, loyalty, returns, shipping estimates, external video, and advanced account functions without verified integrations.
- Arbitrary page-builder composition, fictional sample pages, demo-only destinations, and SEO or structured-data additions that lack verified source data.

## Founder Decisions

Only two future product-scope decisions remain genuinely unresolved by the repository. All other potential questions are resolved by implementation evidence: Contact is distinct, Collection List is implemented, About and Policy remain Standard Page variants, account documentation remains deferred, and no alternate product or collection templates exist.

| Issue | Evidence | Options | Recommendation | Consequence |
| --- | --- | --- | --- | --- |
| Password Page support | No `templates/password.*`, no password section, and no password-specific component composition exist. | (1) Keep outside the supported premium theme scope. (2) Add it as a supported future system page after a product decision and implementation. | Keep deferred until the supported storefront scope explicitly includes password-protected stores. | Option 1 avoids speculative documentation and runtime claims. Option 2 requires a canonical template, section, accessibility, SEO, Theme Editor, and QA contract before `system/password.md` is created. |
| Gift Card Page support | No gift-card template, section, or verified gift-card rendering contract exists. | (1) Keep outside current scope. (2) Support a Shopify-native gift-card destination in a later milestone. | Keep deferred until gift-card support is an explicit product promise. | Option 1 keeps page composition accurate. Option 2 requires verified Shopify balance, code, redemption, privacy, localization, accessibility, and no-JavaScript behavior before `system/gift-card.md` is created. |

No founder approval is required to begin the first Homepage Page Specification.

## Readiness Checklist

The page-documentation system is ready to create its first individual page specification when the author can confirm all of the following:

- [x] The canonical theme implementation has been inventoried: 11 JSON templates, two global section groups, and the relevant page-like enhancements.
- [x] Current template composition, key snippets, global layout behavior, metadata, product/article structured data, and demo configuration evidence have been reviewed.
- [x] All 113 component specifications and `docs/components/README.md` have been checked as the reusable responsibility source of truth.
- [x] Product philosophy, design principles, Design System, implementation rules, section documentation, AI generation documentation, accessibility, performance, preset, and Theme Editor constraints have been considered.
- [x] Supported categories, file names, deferred scope, variants, state model, composition boundaries, and heading ownership are defined.
- [x] SEO, structured-data, Shopify, Theme Editor, integration, performance, responsive, accessibility, and deterministic AI boundaries are explicit.
- [x] No individual page specification has been created in this audit milestone.

The next approved document should be `docs/pages/storefront/homepage.md`. It should use the exact Standard Page Template above, define the canonical homepage composition without duplicating the Premium Hero or Homepage Bootstrap documents, and preserve the resource-free Calinium One baseline.
