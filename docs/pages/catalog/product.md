# Product Page

## Purpose

The Product Page is the complete storefront destination for one verified Shopify product. It helps a customer understand the product, select a purchasable option, assess its truthful price and availability, and add it to the cart with confidence.

The product remains the centre of attention. Luxury comes from media clarity, calm hierarchy, generous whitespace, and only the supporting information that reduces a real purchase uncertainty. It never comes from fabricated scarcity, fabricated social proof, hidden fees, unsupported claims, or pressure.

This specification owns the page-level hierarchy, product-media and product-information relationship, purchase-region placement, supporting-content order, states, SEO, structured-data boundary, mobile priority, Theme Editor composition, deterministic generation, integration placement, and performance priorities. It does not own Shopify product, variant, price, inventory, cart, checkout, subscription, review, wishlist, comparison, or application backend truth; reusable component internals remain owned by their component specifications.

## Customer Goals

The Product Page should answer, without assumed prior context:

1. What is this product?
2. Is it right for me?
3. Which option should I choose?
4. What does it cost?
5. Is it available?
6. What should I expect?
7. Can I trust this purchase?
8. How do I add it to the cart?

Customers should be able to inspect real product media, understand essential facts, choose an available variant, adjust quantity when the purchase model supports it, and continue to Shopify-native cart and checkout paths. Optional material, size, fit, care, compatibility, review, pickup, shipping, or recommendation information should reduce a specific uncertainty; it must never obscure the essential purchase path.

## Merchant Goals

The Product Page should help merchants present verified product information and approved resources with quiet confidence, without needing to choose technical layout mechanics, accessibility behavior, breakpoints, schema, gallery interaction, or cart logic.

Merchants provide Shopify product records, variant values, media, and approved factual supporting content. Calinium recommends the smallest sufficient composition, gallery emphasis, supporting-region order, and optional sticky purchase access; the merchant approves meaningful content and strategy decisions. A Product Page must not become a demonstration of every available commerce feature simply because a merchant can enable it.

## Shopify Context

The Shopify template type is `product`. The current canonical template is `apps/theme/templates/product.json`; it supplies one current `product` object as the page context and assigns `main-product`, `product-recommendations`, and `recently-viewed-products` in that order. Global Header, Footer, skip link, `main` landmark, cart drawer, localization controls, and checkout handoff remain outside the Product Page content regions.

Shopify is the source of truth for the current product, variants, money formatting, media, availability and inventory policy, product form, cart routes, and accelerated checkout where available. Selling-plan, pickup, shipping-estimate, review, wishlist, comparison, bundle, and subscription behavior may appear only where a verified supported integration supplies it. Checkout remains Shopify-owned. Product availability must never be inferred from a visual treatment.

Product Information is the primary functional region. Product Gallery and valid purchasing controls are page-functionally required for a normal purchasable product, while additional storytelling is composed through compatible sections and blocks. This specification defines their roles and ordering, not raw section schemas or alternate-template styling. No alternate product template is currently present in the canonical theme.

### Current implementation evidence

- `main-product` is the single template `main` section and is limited to `product` templates. It renders the verified product title as the normal-page H1, optional vendor, Shopify media, primary product form, description, highlights, information rows, trust blocks, and compatible app blocks.
- The current gallery supports stacked, grid, or carousel presentation; thumbnails below, left, right, or hidden; mobile swipe or stacked media; explicit zoom and fullscreen. Its first Shopify media item is eager with high fetch priority; later items are lazy. Images, video, external video, and model media use Shopify-native rendering.
- The primary form is a native Shopify product form. It renders price, a native variant-select fallback with enhanced buttons, dropdowns, or actual Shopify swatches, inventory context, quantity input, Add to Cart, and optional Shopify payment button. Progressive enhancement updates price, SKU, barcode, availability, quantity constraints, gallery target, and the variant query parameter without a page reload.
- Unavailable or sold-out selected variants disable the primary purchase button. Cart enhancement posts to Shopify's cart endpoint, supplies localized success or error feedback, and asks the existing global cart system to refresh. The normal form remains the no-JavaScript path.
- Mobile sticky Add to Cart is enabled by the current template; desktop sticky purchase is disabled. The sticky control forwards to the one primary form rather than creating a second form.
- The current template enables related recommendations and browser-assisted recently viewed products. `complementary-products` is product-template compatible but is not assigned by default; it uses Shopify complementary recommendations or merchant-selected fallback products. Review, pickup, and shipping-estimate components have no dedicated primary-product integration in the assigned template.
- There is no current Breadcrumbs region in the product template. `layout/theme.liquid` renders one Product JSON-LD block for real product context through `product | structured_data`. `meta-tags` renders canonical URL, title, description when available, and product featured image for social metadata; it currently uses a generic Open Graph `website` type rather than explicit product social metadata.
- Theme Editor initialization is instance-scoped and listens for section load/unload and selected block/section refresh. Product-form, variant-picker, gallery, and premium-product controllers remove their owned listeners and observers on unload. This is evidence of a merchant-ready canonical baseline for ordinary Shopify products, not proof that every optional integration or future page role is implemented.

## Entry Conditions

A customer may arrive through a direct product URL, Product Card, Featured Product or Featured Collection, collection browsing, search results, predictive search, related or recommended products, editorial content, an external campaign link, a search-engine result, a social link, or a localized product URL.

The page must remain understandable without having seen the Homepage, knowing the brand or category, selecting a variant, signing in, adding an item to cart, accepting marketing, or reading reviews. It must not assume material knowledge, sizing knowledge, fit, compatibility, care requirements, or a known customer segment. No identity- or behavior-based personalization is permitted without a verified, approved capability.

## Page Structure

The conceptual structure is:

1. Global Header.
2. One `main` landmark.
3. Optional Breadcrumbs.
4. One primary Product Information region, composed of Product Gallery and product summary/purchase content.
5. Optional details, story, reassurance, proof, and related-discovery regions.
6. Global Footer.

The first viewport prioritizes product identity, primary media, price, selected or selectable variant, availability, purchase action, and concise essential context. It must not depend on a long scroll, a review widget, or an optional integration before a customer can understand and purchase the product.

| Page density | Composition rule |
| --- | --- |
| Minimum valid | One complete primary Product Information region with real product context. |
| Standard | Primary region plus two to four justified supporting regions. |
| Content-rich | Primary region plus approximately four to seven justified supporting regions. |
| More than seven supports | Requires real product complexity, authentic resources, a clear customer purpose for every region, and a performance review. |

Accordions, disclosure blocks, or tabs inside Product Information are not separate page sections. Page length follows real product complexity; a simple product must not receive filler merely to look complete.

## Required Regions

For a normal purchasable product, the following roles are page-functionally required:

| Required role | Customer outcome | Page rule |
| --- | --- | --- |
| Product identity | Recognize the exact item. | One verified Shopify product title is visible as the H1; vendor or eyebrow remains optional. |
| Product media | Inspect the item. | One authoritative Product Gallery owns the product's real media or a restrained valid no-media fallback. |
| Price | Understand current cost. | Shopify-formatted current price is visible; compare-at presentation must be truthful. |
| Meaningful option selection | Choose a purchasable version. | Variant Picker appears only when multiple meaningful purchasable variants exist. |
| Availability | Understand purchase possibility. | Selected-variant state is factual, distinct, and synchronized with the purchase action. |
| Quantity | Choose units when the purchase model supports it. | Quantity Selector is present only where its source rules permit it. |
| Purchase action | Add the selected product to cart or take another verified Shopify purchase action. | It is early, clearly named, native to the product form, and never enabled for an unavailable selection. |
| Essential product context | Make a basic decision. | Concise verified description, summary, or equivalent core context appears without forcing long editorial content. |
| Error and unavailable feedback | Recover from an invalid state. | Errors remain near affected controls; unavailable and sold-out states stay clear without false urgency. |

The primary Product Information region composes Product Gallery, title, Price, optional vendor, verified Rating or Review Summary, concise description, Variant Picker when relevant, Quantity Selector when relevant, Buy Buttons, verified Inventory Indicator where useful, Tax Note only where active market context supports it, verified shipping or pickup context only when integrated, restrained Trust Badge, and optional share or sticky purchase support.

The page must not hide the product title or normal purchasable price, create fake availability or inventory counts, fabricate delivery estimates, make optional apps necessary for purchase, or replace the native product form. Core content and a normal form submission must remain usable before JavaScript enhancement wherever Shopify permits it.

## Optional Regions

Optional regions earn their place through an explicit product decision need and verified source content. None is required for baseline Product Page validity.

| Optional role | Select only when | Omit when |
| --- | --- | --- |
| Detailed description, specifications, materials, dimensions, care, usage, or compatibility | The fact is verified and materially affects confidence or correct use. | The content is absent, generic, duplicated, or not purchase-relevant. |
| Size or fit guidance | Product sizing is meaningfully complex. | A simple size label is sufficient or verified guidance is unavailable. |
| Craft, process, or product story | Approved origin, craft, founder, or process evidence genuinely differentiates the product. | It would bury product facts or rely on unsupported claims. |
| Image-with-text or video | Approved media clarifies the product, not merely decorates the page. | Media is weak, inaccessible, unrelated, or unnecessary. |
| FAQ or service reassurance | Recurring product-specific uncertainty exists and answers are merchant-approved. | It repeats product facts, policies, or generic brand language. |
| Verified reviews or Review Summary | A real review integration and verified data exist. | Review data or moderation path is absent. |
| Pickup Availability or Shipping Estimate | Shopify or an approved integration supplies selected-variant, location, market, or delivery data. | It would guess a location, date, cost, or fulfillment promise. |
| Selling-plan, bundle, upsell, wishlist, compare, or app block | A verified, approved architecture and meaningful customer purpose exist. | The capability is unsupported or would interrupt product selection and purchase. |
| Related, complementary, or recently viewed products | Real Shopify recommendations, approved relationships, or privacy-safe browser history exists. | Results are unavailable, irrelevant, repeated, or would distract from a high-consideration decision. |
| Collection context, comparison, sharing, or secondary promotion | It provides a real next step or accurate comparable information. | It adds pressure, duplicates navigation, or lacks a verified destination. |

An optional app block fails safely and must never displace the product title, price, variant selection, or primary purchase action. Social sharing should be omitted when it adds no clear customer value.

## Section Composition

Product Page composition is deterministic and role based:

1. Product orientation and purchase.
2. Essential clarification.
3. Differentiation, materials, or craftsmanship.
4. Risk reduction.
5. Verified supporting proof.
6. Related discovery.

A typical page may be optional Breadcrumbs, Product Information, essential details or specifications, approved story/material/process, FAQ/care/fit/service reassurance, verified proof, and related discovery. It must not require every stage.

| Classification | Product Page rule |
| --- | --- |
| Globally required | Header, Footer, skip link, and main landmark remain global. |
| Page-functionally required | One Product Information region, one Product Gallery owner, one title H1, and one primary product form for a purchasable product. |
| Recommended | Essential details proportionate to complexity; one relevant reassurance or discovery region where verified. |
| Optional | Story, FAQ, video, reviews, pickup, shipping, selling plans, bundles, comparison, sharing, and other roles in Optional Regions. |
| Repeatable | Concise detail, disclosure, or story regions only when each has a distinct verified purpose. |
| Single-instance | Primary Product Information, authoritative Gallery, H1, primary form, and canonical Product structured-data owner. |
| Integration-dependent | Reviews, pickup, shipping, subscriptions, bundles, wishlist, compare, app blocks, and advanced media. |
| Prohibited | Duplicate product forms, duplicate H1/title/price systems, repeated galleries, several competing recommendation carousels, unrelated Homepage sections, unsupported Custom Liquid, invented countdowns, and newsletters before the purchase decision. |

Purchase controls remain near product identity and media. Sizing, compatibility, dimensions, or care precede broad brand content when purchase-critical. Trust belongs near the uncertainty it resolves; recommendations normally follow sufficient product understanding. Sticky Add to Cart may provide condensed synchronized access, but it must not establish a competing product state.

## Component Composition

The page composes authoritative components without redefining their contracts:

| Component or family | Product Page relationship |
| --- | --- |
| Breadcrumbs | Provides optional context; it does not compete with the product H1. |
| Product Information | Owns primary summary composition: identity, Price, Variant Picker, Quantity Selector, Buy Buttons, and tightly related facts. |
| Product Gallery | Owns product-media presentation, navigation, zoom, fullscreen, and media interaction. |
| Variant Picker, Quantity Selector, Buy Buttons, Sticky Add to Cart | Own selection, quantity, primary purchase actions, and condensed synchronized purchase access respectively. |
| Price, Badge, Rating, Review Summary, Inventory Indicator, Pickup Availability, Shipping Estimate, Tax Note, Trust Badge | Present bounded verified commerce information; none calculates or invents the underlying fact. |
| Wishlist Button and Compare Button | Remain optional integration controls and never block Buy Buttons. |
| Responsive Image, Video, Video Player, Aspect Ratio, Placeholder Image | Render approved media and fallback behavior. |
| Section Heading, Rich Text, Accordion, FAQ, Table, Tabs, Disclosure | Support optional verified details and storytelling; they do not create a second product-title system. |
| Alert, Inline Message, Validation Message, Loading Spinner, Skeleton, Status Indicator | Communicate local page state using the least disruptive appropriate feedback. |
| Button, Icon Button, Divider, Container, Section, Grid, Stack, Cluster, Split, Sidebar Layout, Surface, Content Wrapper | Provide interactions and layout mechanics; the page owns order and content priority, not their implementation. |
| Product Card and Collection Grid | Present related discovery only; they never replace the Product Page. |

Sections own merchant-editable region composition. Shopify owns product, variant, money, availability, cart, and checkout truth. The Product Page owns overall hierarchy, required roles, state boundaries, and role selection.

## Content Rules

All product content must be verified, specific, clear, concise where purchase-critical, detailed only where complexity requires it, and sourced from Shopify or approved merchant resources.

### Title and heading hierarchy

The verified Shopify product title is the one authoritative page H1 and normally belongs to Product Information. Hero, Image Banner, Section Heading, app blocks, product type, vendor, badge, variant name, or Sticky Add to Cart must not create another H1. Major later regions normally begin at H2 and nested content at H3. Visual scale never selects semantic level. Long titles wrap naturally, remain visible without JavaScript, and are never rewritten into a fabricated marketing claim.

### Description, claims, and media

Description explains what the product is and why its verified facts matter. It avoids generic luxury filler, unsupported superlatives, keyword stuffing, and copied competitor language. Materials, origin, craftsmanship, sustainability, certification, awards, dimensions, weight, compatibility, care, warranty, guarantees, returns, delivery, and stock claims require a verified merchant or Shopify source.

Approved Shopify product media remains tied to the current product and sequenced to improve inspection. Meaningful alternative text is preserved; decorative imagery is treated as decorative. The page must not use another product's media, fake product details through generated imagery without explicit approval, or misrepresent colour, finish, material, scale, or condition.

### Variants, price, and availability

Verified Shopify option names and values remain intact unless an approved transformation rule exists. Unavailable values remain distinguishable from unselected values. Price uses Shopify-formatted money; current and compare-at prices are clearly distinct, with no fabricated saving or inconsistent discount calculation. Availability uses the active variant's verified state. Preorder, backorder, incoming, and low-stock language exists only where source capability verifies it; exact inventory counts are not a default.

## Supported Variants

Page variants are controlled composition choices, not arbitrary decorative presets. Calinium selects one from verified product complexity and merchant resources.

| Variant | Select when | Composition |
| --- | --- | --- |
| Visual-first | Appearance and strong approved media materially drive the decision; option complexity is manageable. | Prominent Gallery, concise summary, early purchase, restrained supporting details. |
| Information-first | Features, dimensions, use, or compatibility are necessary to buy correctly. | Concise summary and early specifications or guidance near purchase. |
| Story-led | Verified origin, craft, founder, or process materially differentiates the product and authentic resources exist. | Early purchase remains intact; one concise evidence-led story follows essential facts. |
| Technical | Configuration, compatibility, materials, or specifications drive the decision. | Structured details, disclosures, or tables clarify selection before broad editorial content. |
| Compact | The product is simple or available content is limited. | Primary region plus only the few supports that solve a real question. |
| Launch-focused | A verified launch, release, or supported preorder state is active with an approved transition after it ends. | Fundamentals remain visible; any urgency is factual, fixed, and subordinate. |

Visual preset styling is outside page ownership. A selected variant must record its source evidence and composition reason. Vague labels such as “dynamic” or “cool” are not valid page variants.

## Supported States

| State | Required page behavior |
| --- | --- |
| Available or selected variant available | Current price, availability, media relationship, and purchase action are coherent and actionable. |
| Selected variant unavailable or partially unavailable variants | Values remain distinguishable; action is disabled or truthful; no availability is invented. |
| Sold out | The product remains understandable; Buy Buttons communicate the factual unavailable state without urgency. |
| No variant selected or invalid variant URL | Resolve to a safe product state, preserve option clarity, and do not fabricate availability. |
| Product unavailable or unpublished boundary | Follow Shopify route and publishing behavior; do not turn it into a fabricated storefront page. |
| No media, one media item, or multiple media items | Use restrained valid fallback, simple media, or Gallery navigation appropriate to actual media count. |
| Missing description or optional content | Omit empty wrappers and preserve hierarchy. |
| Cart submission pending, successful, or error | Keep purchase context, prevent duplicate submission, communicate accurately near the form, and do not rely on colour alone. |
| Quantity validation error | Explain the real constraint near Quantity Selector and preserve a usable current selection. |
| Integration or recommendations unavailable | Omit or fail locally without blocking product evaluation or purchase. |
| Theme Editor preview | Use design-mode guidance only; no fabricated storefront data outside design mode. |
| Localized expansion or RTL | Preserve readable wrapping, logical source order, valid labels, and correct direction. |
| Selling-plan state | Render only when a verified supported selling-plan architecture supplies it. |

Loading is not empty, and empty is not error. State transitions preserve keyboard and screen-reader clarity. The page must not fabricate preorder or backorder states.

## Navigation and Actions

The visually dominant action is Add to Cart or another verified Shopify purchase action. It reflects the selected variant and remains near product identity, price, and option selection.

Secondary actions may include accelerated checkout, choose options, a verified notify-me integration, wishlist, compare, share, size guide, pickup details, collection navigation, continue browsing, or a related product. They must be genuine, clearly named, and visually subordinate. Links navigate; buttons perform operations. Cart mutation is never a link or a disabled-link placeholder.

Variant selection precedes dependent purchase actions. Accelerated checkout cannot replace required option selection. Sticky Add to Cart stays synchronized with the one primary form, uses no independent variant state, and never produces a conflicting label or duplicate cart submission. Wishlist, comparison, notification, size-guide, pickup, and sharing actions require a verified destination or persistence capability.

## Responsive Behaviour

The Product Page is mobile first. Product identity, media, price, variant choice, availability, and purchase action remain early and practical at 320 px, 375 px, tablet, desktop, wide desktop, browser zoom, large text, localization expansion, and RTL.

- Media and information retain logical source order; CSS must not visually reorder them into an inaccessible reading order.
- There is no duplicated mobile or desktop Product Information region. Long product titles, values, prices, labels, and translated text wrap rather than shrink merely to preserve one line.
- Gallery controls remain touch- and keyboard-operable. Thumbnails may adapt or collapse only when access to every actual media item remains available.
- Variant choices wrap safely; swatches have text equivalents; quantity controls and buttons stay touch safe; purchase controls stack when needed.
- Tables reflow or become safely scrollable, disclosures keep content reachable, and no essential content is desktop-only.
- Sticky purchase controls respect safe-area insets and must not obscure content, browser UI, cart drawer, consent controls, or the primary form. They are not a substitute for an accessible initial purchase region.

The page owns content priority; components and layout primitives own their responsive mechanics.

## Accessibility

The Product Page targets WCAG 2.2 AA and composes component-level contracts into one coherent destination:

- One main landmark, a valid skip-link target, meaningful document title, and one visible product-title H1.
- Logical H2/H3 hierarchy, accessible Breadcrumbs where present, and no duplicate title or product forms with conflicting accessible names or IDs.
- Keyboard-operable gallery, thumbnails, zoom, fullscreen, variant selection, quantity controls, purchase actions, and any disclosed content.
- Meaningful media alternatives, captions or alternatives where video requires them, no autoplay video with sound, and no inaccessible hover-only zoom.
- Associated field labels, visible focus, selected and unavailable states communicated beyond colour, touch targets, and localized validation near affected controls.
- Restrained live regions for real cart, price, and availability changes; no repeated announcements or automatic focus movement without cause.
- Reduced-motion support, browser-zoom resilience, large-text resilience, RTL support, logical DOM order, and accessible sticky purchase controls.
- Inactive media must not create confusing focus targets. Drawers and dialogs delegate focus trap and restoration to their authoritative components.

## SEO

The Product Page owns destination-level product SEO boundaries, not product-data invention. It requires a unique verified product title, merchant-authored or Shopify-managed meta description where available, canonical product URL, one product H1, authentic description, meaningful internal links, accurate image alternative text, and careful localization boundaries.

Selected variant parameters and collection-context URLs must not create uncontrolled duplicate product ownership. Invalid or unavailable variant states do not become distinct products or receive fabricated metadata. Product descriptions must not be copied without rights, hidden for keywords, or stuffed with keywords. The page does not promise rankings.

Current evidence: `meta-tags` renders the Shopify `canonical_url`, title, description when present, and product featured image for social cards. It does not currently emit a dedicated product Open Graph type or explicit alternate-language product metadata. Shopify, merchant, theme, structured-data, and application-generated metadata must stay distinguishable.

## Structured Data

The Product Page owns one authoritative Product structured-data output. Valid supporting schema may include `Offer` or `AggregateOffer`, `BreadcrumbList`, `WebPage`, and verified `AggregateRating` or `Review` only when their data and ownership are real.

Prices, currency, availability, URL, SKU, GTIN, MPN, brand, images, and variant treatment must derive from verified Shopify data. The page must not invent identifiers, brand values, reviews, ratings, shipping details, return policy, or fulfillment claims. Product Cards, recommendation sections, and app blocks must not emit competing full Product schema; Breadcrumb schema likewise has one owner. JSON-LD must remain valid for sold-out products and must be validated after output.

Current evidence: the global layout emits exactly one Product JSON-LD block for a nonblank product through Shopify's `product | structured_data`. The current assigned product template has no Breadcrumbs output. A future review of app blocks and future Breadcrumb implementation is needed to prevent duplicate Product or BreadcrumbList schema.

## Shopify Settings

Merchants may control section order and presence, approved Product Information blocks, Gallery layout and media behavior, vendor/SKU/barcode/product-type visibility, variant-picker presentation, inventory-message visibility, dynamic checkout visibility, sticky purchase visibility, compatible trust or disclosure blocks, product recommendations, complementary products, app blocks, related editorial sections, and approved content or media where the assigned section supports them.

The Product Page may recommend one primary Product Information region, one Gallery owner, one title H1, one primary form, safe purchase fallback, bounded recommendation regions, integration verification, and role-based order. The design system and architecture retain semantic hierarchy, form correctness, price and availability truth, responsive source order, accessibility, typography, tokens, breakpoints, focus, motion, schema ownership, performance priorities, and integration boundaries.

Merchants must not receive controls for arbitrary HTML around the form, raw CSS or JavaScript, arbitrary heading levels, fake prices, discounts, stock, reviews, shipping, or unsupported purchase states; unrestricted sticky behavior, autoplay, breakpoints, ARIA, cart-mutation logic, direct checkout manipulation, and arbitrary schema markup are also prohibited.

## Theme Editor Behaviour

The Product Page uses JSON template composition. `main-product` is page-functionally required and single-instance; its blocks are safely addable, removable, and reorderable within their documented limits. Product recommendations, recently viewed, complementary products, verified product-detail sections, and compatible app blocks are optional or integration-dependent. Header, Footer, cart drawer, and checkout are outside editable product-page composition. Duplicate Product Information, Gallery, H1, or primary form instances are prohibited.

On section load, the current runtime initializes product-form, variant-picker, Gallery, and premium-product controllers. On unload, each removes its listener, observer, or request state. Selected block and section events resynchronize the existing product state rather than establish a second one. Product media, variants, and blocks must refresh without stale form, gallery, sticky, or cart-submission state.

Theme Editor preview may use safe design-mode placeholders for a blank product context. Published storefront output must not expose setup guidance or invented data. Optional missing settings omit cleanly. Essential purchase roles require a safe fallback when merchants remove a supporting block; an individual section rerender should not require a full-page reload where avoidable. Current implementation is evidence of this lifecycle approach, while future enforcement should prevent removal of all viable core purchase paths.

## Performance Rules

The likely LCP candidate is the first product media item; in text-led cases it may be the product title or summary. Prioritize only the real first-view media. Do not preload every gallery item or lazy-load the actual LCP media. Reserve stable media geometry, defer later media and integrations, and avoid duplicate desktop/mobile downloads.

Title, price, availability, and core form are server-rendered. Gallery, variant updates, zoom, fullscreen, cart enhancement, and sticky purchase progressively enhance that baseline. Reviews, recommendations, pickup, shipping estimates, subscriptions, and app blocks must not delay the core purchase path. Avoid polling, repeated controllers, duplicate product JSON fetches, hidden galleries, several carousels, duplicate forms, heavy media libraries, unnecessary observers, or layout shifts from media, price, inventory, app blocks, or recommendations.

Risk review is required for high-resolution galleries, models, external videos, many variants or swatches, review and recommendation widgets, pickup/shipping services, subscription applications, many app blocks, zoom tools, oversized descriptions, and excessive below-fold sections. Theme Editor reloads must remove listeners, timers, observers, and request state.

## AI Guidelines

AI generates Product Pages deterministically from verified Shopify product context, approved merchant resources, product strategy, and the existing capability map. It does not invent a product experience.

### Required sequence

1. Confirm valid Shopify product context, availability, and option structure.
2. Preserve the verified Shopify product title as the H1.
3. Classify product type, variant count and complexity, media quality, catalog context, price level, dimensions, sizing, compatibility, materials, craft/story strength, care, selling plans, inventory, pickup, shipping, reviews, recommendations, app blocks, approved trust resources, and merchant goals.
4. Select one documented page variant and one Product Information region with one Gallery owner.
5. Include only relevant purchase controls, then essential clarification, verified supporting content, and verified optional integrations.
6. Validate actions, form behavior, mobile purchase order, accessibility, performance, SEO, structured data, and integration failure behavior.
7. Remove repeated facts, media, forms, and calls to action.

AI should use real Shopify product and variant names, Shopify money formatting, real media, the smallest valid page, early purchase controls, Gallery complexity proportional to real media, and omission over filler. It should select compact structure for simple products, information-first or technical structure where facts drive the decision, and story-led content only with genuine evidence. It must preserve source order and merchant approval.

AI must never invent products, variants, options, prices, compare-at prices, discounts, stock, low-stock pressure, preorder/backorder, ratings, reviews, shipping, pickup, delivery dates, tax, materials, dimensions, care, warranties, guarantees, certifications, compatibility, sustainability, recommendations, complementary relationships, subscriptions, or app capability. It must never duplicate Product Information, product forms, H1s, or primary CTAs; hide normal purchasable price or title; bury purchase below story; default to Custom Liquid; make JavaScript necessary for core information; alter checkout ownership; or use manipulation.

### Deterministic selection matrix

| Verified condition | Preferred page variant | Gallery priority | Required purchase controls | Recommended supports | Integration opportunities | Omission first | Normal supports | Major validation risks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Simple single-variant product | Compact | One clear image or real no-media fallback | Price, availability, one Shopify form, Add to Cart; quantity only when supported | Concise description, one relevant detail | Related products only when real | Story, video, comparison, complex gallery | 0–2 | Hidden price, unnecessary picker, filler. |
| Multi-variant visual product | Visual-first | Strong gallery and variant-linked media | Variant Picker, price, availability, one form, Add to Cart | Fit or material detail where verified | Actual Shopify swatches, recommendations | Long story, technical tables | 1–3 | Variant/media/URL/price synchronization and unavailable values. |
| Size-dependent apparel or wearable | Information-first | Clear fit and detail imagery | Variant Picker, size guidance when verified, price, availability, form | Fit, dimensions, care, returns only when approved | Generic story, unsupported recommendation widgets | 2–4 | Ambiguous size, missing unavailable state, unverified fit claim. |
| Technical or compatibility-dependent product | Technical | Media supports facts; not necessarily dominant | Variant or configuration controls, price, availability, form | Specifications, compatibility, use, dimensions, FAQ | Decorative lifestyle modules | 2–4 | Incorrect compatibility, buried required facts, invalid option combinations. |
| Artisan or craftsmanship-led product | Story-led | Authentic process and product media | Price, availability, relevant option controls, form | Materials, process, care, restrained proof | Generic founder story, unverified sustainability | 2–5 | Fabricated origin/craft claims and story before essentials. |
| High-consideration product | Information-first or Technical | Inspection-quality media | Complete verified options, price, availability, form | Specifications, service reassurance, comparison only with facts | Several carousel/review modules | 3–5 | Performance, missing risk-reduction facts, unsupported guarantees. |
| Digital or non-physical product where supported | Compact or Information-first | Product-relevant approved media if any | Only controls supported by the verified product and fulfillment model | Use, compatibility, access expectations where verified | Physical shipping, pickup, quantity if not supported | 1–3 | Unsupported fulfillment or delivery promises. |
| Limited content resources | Compact | One real image or no-media fallback | Real form, price, availability, meaningful options | Concise verified description | Video, reviews, story, recommendations without data | 0–2 | Filler, invented claims, empty wrappers. |
| Verified product launch | Launch-focused | Approved launch/product media | Real availability and form; preorder only if supported | Factual date, launch detail, approved post-launch state | Rolling countdown, fake scarcity, unverified social proof | 1–3 | Expired campaign state, pressure, unsupported timing claims. |
| Sold-out product | Compact or existing selected variant | Real media remains useful | Truthful unavailable state; notify action only with verified integration | Product facts, related alternatives if real | Urgency, fake restock date, automatic redirection | 0–2 | Treating sold out as preorder or hiding product truth. |

The digital/non-physical row is implementation-dependent: the current product template can preserve Shopify product context but does not itself document a specialized digital-delivery architecture. AI must omit unsupported product-type behavior instead of assuming it exists.

## Quality Checklist

- One clear Product Page purpose and one verified Shopify product context exist.
- One product-title H1, Product Information region, authoritative Gallery, primary product form, and synchronized purchase path exist.
- Price, variants, availability, quantity, and purchase action are accurate for the active state.
- Sold-out, unavailable, unselected, invalid variant, cart, quantity, integration, media, and Theme Editor states are distinct and truthful.
- No stock, urgency, review, pickup, shipping, material, dimension, care, policy, or commerce claim is fabricated.
- Essential details appear before nonessential storytelling; optional regions have a documented decision purpose and no repeated title, price, form, Gallery, CTA, or recommendation role exists.
- Mobile source order, 320 px layout, zoom, large text, translation, RTL, gallery, variants, quantity, focus, validation, live-region restraint, media alternatives, and reduced motion are valid.
- SEO has one verified H1, canonical variant handling, authentic metadata, useful internal links, and no duplicate-content or keyword-stuffing pattern.
- One valid Product schema owner exists; review schema is verified and no duplicate Product or Breadcrumb schema is emitted.
- LCP media is prioritized correctly, later media and integrations defer safely, layout remains stable, and above-fold JavaScript remains minimal.
- Theme Editor rerenders cleanly; Sticky Add to Cart remains synchronized; optional integrations do not block purchase; the page works before enhancement.
- Deterministic AI selected the smallest sufficient variant and preserved Shopify-native purchase and checkout ownership.

## Future Compatibility

Safe future extensions include controlled alternate Product Page templates, product-type-specific composition, richer Shopify block nesting, enhanced 3D/AR media, verified subscriptions, bundles, preorder and back-in-stock architecture, customization, size recommendation, personalization, pickup and delivery information, comparison, recommendations, market-specific content, review architecture, media accessibility tooling, product-content completeness scoring, automated resource validation, preset-specific defaults, and implementation enforcement for required purchase roles.

These extensions must preserve Shopify source-of-truth ownership, one coherent purchase form, heading hierarchy, progressive enhancement, merchant approval, and deterministic generation. They must not move checkout into the theme, fabricate product facts, mandate integrations, silently update merchant configuration, auto-enable applications, expose arbitrary scripts/schema, weaken accessibility, or introduce deceptive urgency or unsupported fulfillment promises.

### Future implementation-hardening recommendations

- Add a controlled Breadcrumbs region with a single BreadcrumbList ownership decision before emitting breadcrumb schema.
- Define product-specific Open Graph and alternate-language metadata only when verified Shopify data and canonicalization rules support it.
- Add explicit integration contracts for reviews, pickup, shipping estimate, and selling plans before exposing their page-level roles in the primary region.
- Let the Theme Editor enforce a safe core purchase fallback when a merchant removes or rearranges essential purchase blocks; current implementation provides the stable primary form but does not yet document automated enforcement of every invalid composition.
- Make quantity visibility conditional on verified purchase-model support rather than only a form-level default when a future product type requires it.
- Establish validation for app-block schema duplication, cart-event resilience, gallery media accessibility, and alternate product templates before those capabilities expand.

The specification is ready to guide future section documentation, preset composition, deterministic AI Product Page generation, and implementation hardening. It also establishes the Product Page boundaries later Collection Page documentation must respect.
