# Homepage

## Purpose

The Homepage is Calinium’s primary storefront entry destination. It helps a first-time visitor understand what the merchant offers, why it matters, which products or collections deserve attention, why the merchant can be trusted, and where to continue.

It is not a theme demonstration, a generic campaign landing page, or a catalog of every available section. The Homepage should make a real merchant’s products, collections, and approved story easier to discover. Luxury comes from restraint: calm hierarchy, generous whitespace, authentic media, useful information, and one clear next step.

The Homepage must remain useful when optional integrations, videos, reviews, social feeds, or editorial assets are absent. A short, confident composition is better than filler.

## Customer Goals

Customers should be able to:

- Understand the store’s offer without prior brand, advertising, or account context.
- Recognize a relevant product, collection, or catalog path early.
- Learn only the amount of merchant story, proof, and reassurance needed to continue with confidence.
- Reach real products, collections, search, cart, and navigation without relying on a carousel, hover state, or personalization.
- Read, browse, and act comfortably on a small screen, with keyboard navigation, browser zoom, translated text, large text, and reduced motion.
- Receive honest empty, unavailable, and optional-integration behavior rather than fabricated content or urgency.

## Merchant Goals

Merchants should be able to:

- Present an approved first impression that reflects the business without becoming a designer or a page-builder specialist.
- Prioritize real products, collections, media, and story content through meaningful section choices and order.
- Preserve the global Header and Footer while composing the Homepage through Shopify’s Theme Editor.
- Use a compact Homepage when resources are limited and add editorial depth only when genuine content supports it.
- Keep approved merchant claims, resources, destinations, and strategy intact through preset composition and deterministic generation.
- Receive clear guidance when a desired section needs verified content, an integration, or a safe fallback.

## Shopify Context

The Homepage uses Shopify’s `index` template type. The current canonical template is `apps/theme/templates/index.json`; it is a JSON template whose section composition is editable through the Theme Editor.

Header and Footer are global shell regions rendered outside homepage content by `apps/theme/layout/theme.liquid` through `apps/theme/sections/header-group.json` and `apps/theme/sections/footer-group.json`. The global cart drawer, header predictive search, localization controls, and account entry are enhancements or global navigation surfaces. They are not Homepage content regions and this specification does not own their schemas or behavior.

Homepage content is composed through sections. Section documentation owns schema, blocks, rendering, settings, lifecycle, and progressive enhancement. This page specification owns allowed roles, required roles, order, density, heading hierarchy, and safe omission.

One Homepage template assignment is expected per storefront context. This specification does not create alternate home, campaign, collection-landing, or editorial-landing templates. Those require a future explicit page category and implementation evidence.

### Current implementation evidence

`apps/theme/templates/index.json` currently contains five active, ordered bootstrap sections:

1. `full-screen-hero` as `bootstrap_hero`.
2. `featured-collection` as `bootstrap_featured_collection`.
3. `image-with-text` as `bootstrap_image_with_text`.
4. `rich-text` as `bootstrap_brand_statement`.
5. `newsletter` as `bootstrap_newsletter`.

No template section is disabled. The current global header group contains a sticky `header`; the footer group contains a multi-column `footer` with brand, newsletter, localization, and policy links enabled. `settings_data.json` has `content_for_index: []` and no homepage product, collection, image, or page reference. It therefore represents a resource-free Calinium One baseline, not a completed merchant Homepage.

The bootstrap hero is configured as the first Homepage section with `heading_tag: "h1"`. When its heading is blank, the current premium-hero implementation falls back to the real `shop.name`; it has no default call to action. The initial featured-collection region has no selected collection and shows non-interactive onboarding placeholders. Image-with-text and rich-text contain clearly replaceable starter copy. These are safe setup defaults, not merchant facts or a publish-ready brand narrative.

The current theme emits canonical metadata through `snippets/meta-tags.liquid`, but does not emit Homepage-specific JSON-LD. Product and Article JSON-LD are the only structured data conditionally emitted by `layout/theme.liquid`.

## Entry Conditions

Valid entry conditions include:

- A direct visit to the storefront root.
- The logo or a Home destination in global navigation.
- Return from a product, collection, cart, account, search, or editorial destination.
- A localized storefront root.
- Campaign, social, advertising, or search-engine traffic that intentionally lands on the storefront root.

The Homepage must remain understandable without prior context. It must not assume that a visitor knows the brand, understands the category, is signed in, has items in the cart, belongs to a known market segment, accepted marketing, or visited previously.

The Homepage must not create personalization from unverified identity, behavior, or market assumptions.

## Page Structure

The Homepage has this conceptual structure:

```text
Global Header
        ↓
Main landmark
        ├── Primary homepage lead
        ├── Primary discovery region
        ├── Supporting commerce or differentiation regions
        ├── Optional trust and editorial depth
        └── Optional low-pressure continuation or subscription opportunity
        ↓
Global Footer
```

The Header, Footer, announcement continuity, cart drawer, predictive search, and localization remain global shell or enhancement responsibilities. The `main` landmark contains the Homepage content regions only.

The Homepage should use a restrained number of meaningful regions:

| Composition | Guidance | Appropriate use |
| --- | --- | --- |
| Minimum viable | 3–4 meaningful regions. | A small catalog or merchant with limited approved resources. |
| Standard | 5–8 meaningful regions. | Most complete merchant storefronts. |
| Content-rich | Up to approximately 10 carefully justified regions. | A verified editorial or story-led brand with enough distinct, approved content. |
| More than 10 | Requires strong content evidence and a dedicated performance review. | Exceptional cases only; page length is not a mark of quality. |

Global shell elements, small utility strips, and app infrastructure do not count as Homepage regions. The source order must remain meaningful when layouts stack on mobile.

## Required Regions

Every valid Homepage requires these role-based regions:

| Required role | Customer outcome | Allowed composition | Rules |
| --- | --- | --- | --- |
| Primary homepage lead | Understand the merchant or offer and recognize the primary path. | Hero; Slideshow using Hero semantics; a restrained Image Banner only when it fully meets the lead contract. | Owns the authoritative Homepage H1. Uses meaningful media or a strong text-led composition. Shows one primary action only when a verified destination exists. |
| Primary product or collection discovery | Reach real merchandise early. | Featured Collection, Featured Product, Collection List, a curated product grid, or another verified commerce-led section role. | Must use real Shopify products or collections. A Homepage must not be visually attractive yet leave customers without a clear catalog path. |
| Clear continuation path | Continue into an actual store destination. | Primary lead action, discovery cards, collection link, or both. | Destinations must be verified. The Header remains authoritative for global navigation; the Homepage must not recreate it. |

The current `full-screen-hero` and `featured-collection` sections are implementation evidence for the lead and primary-discovery roles. They do not make those raw section IDs the only valid future composition.

Testimonials, logos, newsletters, videos, FAQs, promotions, and long-form story sections are never required merely to make a Homepage look complete.

## Optional Regions

Optional regions are selected only when their content makes the Homepage clearer, more useful, or more trustworthy. Omit them when the prerequisite is absent, weak, duplicated, or not relevant to the merchant strategy.

| Optional role | Existing compatible section evidence | Select only when | Omit when |
| --- | --- | --- | --- |
| Secondary discovery | `featured-collection`, `featured-product`, `collection-list`, `collection-carousel`, `product-carousel`, `featured-categories`, `collection-tabs`, `shop-the-look`, `product-bundle-showcase`. | A second real discovery path helps a customer navigate a broader catalog. | It repeats the same product or collection without a different customer purpose. |
| Merchant story or philosophy | `image-with-text`, `rich-text`, `brand-manifesto`, `brand-values`, `founder-story`, `story-banner`, `quote-banner`. | Approved merchant story, values, founder facts, quote, or supported visual evidence explain a meaningful differentiator. | Copy would be generic, unverified, or delay primary discovery. |
| Craft, material, or process | `craftsmanship`, `materials`, `manufacturing-process`, `behind-the-scenes`, `brand-timeline`, `team`. | Real approved facts, appropriate consented media, and a genuine commerce-relevant reason exist. | The required facts, portrait, video, dates, origins, or process evidence are unavailable. |
| Trust or service reassurance | `testimonials`, `logo-list`, `awards-certifications`, `icon-row`, `sustainability`. | Testimonials, affiliations, certifications, service terms, or commitments are verified and merchant-approved. | Proof, consent, issuer, policy, or claim verification is absent. |
| Editorial depth | `editorial-grid`, `image-mosaic`, `lookbook`, `featured-blog`, `video`, `video-hero`, `before-after`. | The brand has approved editorial media or content that supports product understanding. | Media is decorative only, inaccessible, unapproved, or more useful on another destination. |
| Conversion support | `newsletter`, `faq`, `promotion-cards`, concise `rich-text`. | A real subscription strategy, recurring questions, or verified promotion supports a customer decision. | It introduces unsupported promises, repeated calls to action, or unnecessary data capture. |
| Controlled motion or emphasis | `marquee`, `countdown-timer`, `hero-slideshow`. | Content remains useful without movement; a deadline is real, fixed, and approved; or several distinct lead messages deserve equal prominence. | Motion is decorative, creates urgency, repeats content, or competes with the primary lead. |
| Technical extension | `custom-liquid`. | A verified technical owner, maintenance plan, accessibility review, and performance review exist. | AI is selecting it as an escape hatch or normal content solution. |

Specific omission rules:

- Testimonials require real, approved testimonial content; never create reviews, customer counts, or quotations.
- Logo List requires approved real affiliations, stockists, press, or partners; never use decorative or unverifiable logos as proof.
- Newsletter requires a real Shopify customer form and an intentional email-capture strategy. It belongs near the end by default.
- FAQ requires recurring, merchant-approved customer questions. It is not a substitute for product details or a policy page.
- Video requires useful approved media, a fallback, and a performance justification. It must not block the lead or primary discovery.
- Countdown requires a real, fixed deadline and must never create fake scarcity or a rolling urgency pattern.
- Comparison and Before/After content require accurate comparable information and applicable, verified claims.
- Social Gallery requires approved content and a resilient implementation; fragile external embeds must not block core discovery.

## Section Composition

The Homepage uses role-based, deterministic composition. It may select the smallest compatible set of sections, but it may not use all currently homepage-assignable sections merely because they are available.

### Recommended flow

1. Orientation: primary homepage lead with one authoritative H1.
2. Primary discovery: real product or collection path.
3. Differentiation: concise approved value, material, process, or story evidence when useful.
4. Supporting discovery: a different real product, collection, or browsing path only when it reduces customer uncertainty.
5. Trust or reassurance: verified proof or service context near the decision it supports.
6. Optional editorial depth: only after enough product context exists.
7. Final low-pressure continuation: a relevant product path, useful editorial route, or newsletter opportunity.

Not every stage is mandatory. A resource-limited merchant should stop after a compact, coherent composition rather than add placeholder sections.

### Ordering rules

- Lead with the clearest value and surface product or collection discovery early.
- Place critical commerce before long editorial storytelling.
- Do not repeat the same collection, product, value proposition, or primary action without a distinct documented purpose.
- Use contrast in content rhythm only when it helps comprehension; do not place back-to-back visually heavy regions without breathing room.
- Avoid several consecutive text-only regions that repeat one idea.
- Place newsletter near the end unless the approved strategy has a stronger, verified reason.
- Place FAQ after enough product, service, or policy context exists.
- Keep trust content near the product or decision it supports.
- Do not bury primary discovery beneath a founder story, craft narrative, or social feed.
- Avoid repeated full-width banners, consecutive carousels or slideshows, several auto-moving regions, and duplicate primary CTAs.
- Preserve the current canonical bootstrap until explicitly approved generation adds or changes regions; generation must not remove valid merchant configuration silently.

### Region classification

| Classification | Homepage rule |
| --- | --- |
| Globally required | Header, Footer, skip link, and `main` landmark remain outside editable Homepage content. |
| Page-functionally required | Primary lead, primary discovery, and a verified continuation path. |
| Recommended | Differentiation, one supporting discovery role, and evidence-based reassurance when available. |
| Optional | Editorial story, FAQ, newsletter, social, video, promotions, and other roles listed above. |
| Repeatable | Carefully bounded discovery or storytelling sections when every instance has a distinct purpose and heading. |
| Single instance | Primary lead; authoritative H1 owner; one primary discovery role; any section whose schema or page role is canonical. |
| Integration-dependent | Ratings, Review Summary, wishlist, compare, pickup, social feed, subscriptions, loyalty, advanced shipping, or external video. |
| Prohibited | Main product, collection, cart, search, page, blog, article, customer-account, or 404 sections; global `cart-drawer` and `predictive-search` as homepage content; unsupported app sections; unverified Custom Liquid. |

The current schema inventory exposes 53 sections that are technically homepage-assignable because they have no conflicting `enabled_on` restriction. That technical eligibility is not a recommendation. `cart-drawer` and `predictive-search` are examples of technically assignable sections that remain prohibited as Homepage content because they are global enhancements.

## Component Composition

The Homepage composes authoritative components without redefining their behavior:

| Component or family | Homepage relationship |
| --- | --- |
| Hero, Slideshow, Image Banner | Provide the selected primary lead. The Homepage determines whether the role is allowed and which one owns the H1. |
| Section Heading | Introduces a meaningful section only. It never owns the Homepage H1. |
| Featured Collection, Featured Product, Collection List, Product Card, Price | Support verified merchandise discovery. Product Card owns tile presentation; Price owns money display. |
| Product Gallery | May appear only within a compatible Featured Product composition; it does not replace the Product Page. |
| Responsive Image, Video, Video Player, Background Media | Render approved media and its fallbacks according to their own accessibility and performance contracts. |
| Rich Text, Accordion, FAQ, Testimonials, Logo List, Icon Row, Multicolumn, Promotion Cards, Social Gallery, Before/After, Comparison Table | Support optional editorial, proof, or conversion roles when their prerequisites are met. |
| Newsletter | Owns customer-form behavior; the Homepage decides whether and where subscription opportunity is useful. |
| Button and Icon Button | Present actions; links own navigation and buttons own operations. |
| Badge, Rating, Review Summary, Trust Badge | Require verified commerce, review, or proof data. They must never become fabricated social proof. |
| Container, Section, Grid, Stack, Cluster, Split, Content Wrapper, Surface | Own layout mechanics and token use. The Homepage owns content priority and source order, not layout implementation. |

Components own interaction, rendering, keyboard behavior, motion, and local accessibility. Sections own merchant-editable composition. The Homepage owns which roles are required, recommended, optional, integration-dependent, or prohibited.

## Content Rules

Homepage content must be specific, concise, merchant-authentic, commercially relevant, visually supportable, and understandable without prior context.

The primary lead should answer:

1. What the merchant offers.
2. Why that offer matters to the intended customer.
3. Where to continue when a verified destination exists.

A slogan is not required. The safe text-led fallback may use the real `shop.name` only when the implementation needs a non-empty H1 and no approved homepage heading exists. AI should prefer merchant clarification or omission over invented promotional copy.

Product and collection names, prices, availability, product media, and collection data must come from Shopify. Merchant story, materials, origin, founder, craft, sustainability, testimonial, partnership, certification, shipping, returns, and delivery content must come from approved merchant resources or verified sources.

The Homepage must not contain:

- Generic luxury filler, copied competitor language, or excessive superlatives.
- Invented awards, customer counts, reviews, press, stockists, partners, logos, or testimonials.
- Unsupported sustainability, material, delivery, return, inventory, pricing, or service claims.
- Fake scarcity, fake deadlines, countdowns without a real fixed date, or manipulative urgency.
- Repeated value propositions, duplicate commerce destinations, keyword stuffing, hidden SEO text, or inaccessible text embedded only in images.
- A slogan, CTA, badge, promotion, or article title that is not merchant-approved or Shopify-sourced.

## Supported Variants

Homepage variants are strategic composition choices, not arbitrary visual styles. Presets may influence tokens and mood, but visual preset styling remains outside this specification.

| Variant | Select when | Preferred composition | Do not select when |
| --- | --- | --- | --- |
| Product-first | One flagship product drives the business, product resources are strong, or immediate product understanding is essential. | Product-led Hero or concise Hero; Featured Product or tightly curated product discovery; relevant trust near purchase path. | A broad catalog needs category discovery first. |
| Collection-first | Several meaningful collections exist and browsing by category is the main customer path. | Hero or text-led lead; Featured Collection or Collection List early; one secondary collection or product path if distinct. | There is no verified collection structure. |
| Brand-story-first | Origin, craft, founder, or process is a material differentiator with strong authentic evidence. | Lead, early product/collection discovery, then one concise story or process region. | Storytelling would bury commerce or relies on unverified founder/process claims. |
| Editorial-commerce | Approved photography and editorial material can make product discovery clearer. | Strong lead, curated discovery, one editorial story region, then a controlled second discovery path. | The catalog, media, or approved story is too limited to support it. |
| Launch-focused | A real product or collection launch is active, destination is verified, and any urgency is factual. | Launch-aware lead, early launch discovery, concise supporting proof, safe post-launch replacement state. | The launch, date, collection, or claim is not verified. |
| Compact storefront | Resources are limited, catalog is small, or three to five strong regions meet the need. | Text- or image-led lead, one real discovery region, one concise differentiation or continuation region. | Filler would be used only to imitate a larger site. |

The selected variant must be recorded with the merchant strategy, verified resources, and section-order reason. “Cool,” “trendy,” “dynamic,” or other aesthetic labels are not page variants.

## Supported States

The Homepage supports only states that can be represented honestly:

| State | Required behavior |
| --- | --- |
| Complete | Approved lead, discovery, optional supporting regions, and verified actions render in the selected order. |
| Minimal but valid | The lead, primary discovery, and continuation path remain present in a compact composition. |
| Incomplete merchant setup | Theme Editor may show clear design-mode guidance; published storefront must not present setup instructions as merchant content. |
| No approved hero media | Use a restrained text-led lead or a documented safe image fallback. Do not fabricate lifestyle imagery. |
| No approved homepage heading | Use the real `shop.name` only for the implementation’s non-empty H1 requirement; do not invent a slogan. |
| No featured collection or product | Select another verified discovery role or retain a design-mode-only onboarding placeholder. Do not publish a fake grid. |
| Empty catalog | Show an honest merchant setup state, not a customer-facing pretend catalog. Primary navigation may remain available if real destinations exist. |
| Missing optional content | Omit the affected section cleanly and preserve the surrounding hierarchy. |
| Integration unavailable | Omit or degrade the integration region without blocking core lead or discovery. |
| Isolated section error | Preserve the main destination and core commerce; surface accurate local feedback only where a verified error exists. |
| Theme Editor preview | Preserve safe placeholders, selection, reload, and missing-resource behavior without turning placeholders into storefront claims. |
| Localized content expansion | Preserve source order, spacing, CTA wrapping, and legibility for translated and longer text. |
| Password-protected storefront boundary | Shopify controls access. The Homepage does not claim a password-page implementation. |

Loading must never masquerade as Empty. The Homepage does not own generic Maintenance, 404, account, sold-out, or search no-results states.

## Navigation and Actions

Homepage actions should reduce uncertainty and lead only to verified destinations:

- A verified product, collection, catalog destination, approved story page, or other meaningful storefront destination may be a primary action.
- Prefer one clear primary action in the lead. Allow one secondary lead action only when it represents a genuinely distinct customer path.
- Use links for navigation and buttons for operations. Do not create dead, disabled, or generic promotional links.
- Avoid repeated “Shop now” labels across adjacent regions. Product and Collection Cards retain their own meaningful links.
- Do not use scroll-only movement as the sole route to commerce.
- Header navigation remains authoritative for global movement. Footer remains authoritative for secondary and legal navigation. Homepage regions must not recreate the full navigation system.
- External links must be deliberate and must not interrupt a primary commerce path without a clear reason.

## Responsive Behaviour

The Homepage is mobile-first. It owns content priority and source order; sections and layout primitives own responsive mechanics.

- Keep primary value and verified discovery early from 320 px upward.
- Preserve essential content on every viewport. Do not maintain separate desktop and mobile homepage section stacks.
- Prevent horizontal overflow under long product titles, translated text, browser zoom, large text, and merchant-authored content.
- Maintain touch-safe controls, visible focus, natural section stacking, CTA wrapping, and no artificially shrunken text to hold a single line.
- Delegate responsive media crops, focal points, aspect ratio, and source selection to Media and section contracts. Avoid duplicate downloads where responsive image markup can solve the need.
- Preserve meaningful order when columns and splits stack. Split layouts must retain logical source order.
- Use sticky behavior sparingly; it must not obscure the lead, product discovery, or global navigation.
- Keep long editorial content below primary discovery unless the selected strategic variant has a documented reason.
- Slideshows and carousels must be usable without autoplay. No JavaScript-driven layout may be necessary for page comprehension.
- Support safe-area handling where the underlying section or global shell requires it.

## Accessibility

The Homepage follows the authoritative Accessibility System and component specifications. At page level it must provide:

- One `main` landmark and a valid skip-link destination. The current layout provides `#MainContent`.
- One authoritative H1 and logical H2/H3 hierarchy through major regions.
- A meaningful document title, clear global Header and Footer relationships, and no indistinguishable duplicate landmark labels.
- Full keyboard access, visible focus, reachable discovery controls, accessible product grids, and logical source order.
- Reduced-motion behavior. No auto-advancing content may run without a pause control; no important content may require motion.
- Meaningful media alternatives, no essential information only in imagery, and no color-only meaning.
- No hover-only access to products or commerce actions.
- Restrained live regions that report real updates only. Do not announce unchanged state repeatedly.
- No automatic focus movement on load, no focus trap in inline content, and no hidden essential content behind optional interactions.
- Correct handling of inactive slideshow slides so they do not create a misleading heading outline or receive focus.
- Resilience at browser zoom and larger text, plus RTL and translated-text review.

Hero, Slideshow, Button, Product Card, Media, Feedback, Form, Drawer, and other component specifications remain authoritative for complete interaction patterns.

### Homepage heading ownership

1. The Homepage requires one authoritative H1.
2. The primary lead normally owns it.
3. Only the first meaningful Homepage lead may receive H1 responsibility.
4. Subsequent `Section Heading` instances normally begin at H2; nested section content may use H3 when semantically appropriate.
5. Visual size never determines heading level. Eyebrow text never replaces an H1.
6. Repeated collection, product, hero, and section titles must not create duplicate page-leading headings.
7. A slideshow’s first visible authoritative slide may own the H1; later and inactive slides must use H2 or lower.
8. AI must validate the final composition rather than trust an individual section’s default alone.

Current implementation evidence: `full-screen-hero` sets an H1 only when it is the first `index` section and its `heading_tag` is `h1`. Its slideshow mode assigns the H1 only to its first valid slide under the same condition. The legacy `hero-slideshow` follows the same first-valid-slide pattern. This is a strong current baseline; future composition validation must additionally prevent an extra first-position hero section or edited heading configuration from producing a duplicate H1.

## SEO

The Homepage requires clear, authentic metadata but must not promise rankings or use SEO manipulation.

- Use one unique storefront title. The current `meta-tags` snippet renders `page_title` and appends `shop.name` when needed.
- Use a merchant-authored or Shopify-managed meta description when available. Do not generate generic keyword paragraphs or invented claims.
- Use the canonical storefront URL emitted by the existing metadata path. Do not add a competing canonical tag.
- Keep the normal Homepage indexable unless Shopify or a verified deployment configuration sets a different policy. The current source adds no Homepage-specific robots tag.
- Maintain one meaningful H1, descriptive genuine internal links, and restrained keyword use.
- Keep product and collection titles authentic; do not duplicate collection text, add hidden SEO text, create doorway content, or treat visual media as a substitute for meaningful text.
- Media components own individual alt text. The Homepage verifies that meaningful lead and discovery media have authentic alternatives.
- The existing metadata snippet owns Open Graph and Twitter tags, using real collection, product, or article media where applicable. Homepage sections must not emit competing social metadata.
- Shopify owns localization URLs and alternate-language behavior. The current source does not emit Homepage hreflang tags, so this specification must not promise them.
- Do not add review or rating markup without verified review data.
- Homepage pagination is not a current concept and must not be introduced to manufacture indexable content.

## Structured Data

The Homepage currently has no page-specific JSON-LD. `layout/theme.liquid` emits Shopify structured data only for Product and Article pages. This is an implementation fact, not an omission to conceal.

Potential Homepage schemas are limited to `WebSite`, `Organization` when verified merchant organization data exists, `WebPage`, and `SearchAction` only when it is correctly implemented. `BreadcrumbList` is normally unnecessary for the storefront root.

If future implementation adds Homepage structured data, it must:

- Assign one authoritative owner per schema responsibility.
- Use canonical URLs and validate emitted JSON-LD.
- Use verified merchant organization name, logo, contact information, social profiles, and search behavior only.
- Avoid adding Product schema for every Homepage card or duplicating Product, Article, Organization, review, price, or availability data already owned elsewhere.
- Never create Review, LocalBusiness, organization, contact, social-profile, logo, or rating facts merely to populate a schema.
- Keep section-level code from emitting competing Homepage-level schemas.

## Shopify Settings

Merchants may control Homepage composition through assigned sections, including:

- Presence and order of compatible sections.
- Approved content, media, product and collection references, links, and bounded section variants.
- Visibility of optional content.
- App blocks where the section, integration, and merchant approval support them.

The Homepage specification may recommend a required lead role, a required discovery role, maximum repeated patterns, safe fallback behavior, and role-based order. It does not expose raw section schemas.

Calinium controls heading-hierarchy safeguards, global typography, spacing, color, breakpoints, motion, accessibility behavior, responsive source order, performance priorities, schema ownership, integration verification, and Header/Footer ownership.

The Homepage must not expose settings for raw CSS, raw JavaScript, arbitrary schema markup, arbitrary heading levels, unrestricted spacing, fake review values, fake deadlines, unsupported badges, raw application configuration, internal identifiers, page-level z-index, or accessibility-critical behavior.

## Theme Editor Behaviour

The Homepage uses JSON-template composition. Theme Editor behavior must preserve valid merchant configuration while making page roles intelligible.

- Section ordering, addition, removal, duplication, and block selection should update the affected section safely without requiring a full-page reload.
- Required page roles must be documented even where current Shopify schema cannot technically enforce them. The editor must never imply that a visually pleasing but commerce-empty configuration is complete.
- The primary lead and its H1 owner are single-instance page roles. Supporting sections may repeat only when their roles, headings, content, and destinations are distinct.
- Optional sections may be removed cleanly. Integration-dependent sections may appear only when their capability is verified.
- Merchant-visible placeholders belong in design mode only. A published storefront must not show onboarding copy, fake cards, or setup instructions as merchant content.
- Section load, unload, select, deselect, block select, block deselect, reorder, setting refresh, and product/collection reassignment must not create duplicate listeners, stale slideshow state, duplicate observers, or duplicate media initialization.
- App-block compatibility must stay within the chosen section’s documented scope. Unsupported app sections must not be inserted to satisfy a page role.
- The current Homepage has no alternate template boundary. Future alternate Homepage templates require a separate approved page category and migration-safe implementation.
- No hidden desktop/mobile duplicate section stacks are allowed. Responsive behavior must come from the selected sections and documented media settings.

### Current enforcement gap

The current `index.json` is a strong safe bootstrap but does not itself enforce every ideal page-role rule: it cannot guarantee that an approved collection is selected, that a merchant replaces starter copy before publication, that only one lead is added, or that every technically available section has verified prerequisites. These are documentation, review, generator, and future Theme Editor hardening responsibilities; they are not claims of current runtime enforcement.

## Performance Rules

The likely Homepage LCP candidate is the primary Hero image, the first visible slideshow image, or a text-led lead when no major image exists.

- Prioritize only verified first-view media. Current `full-screen-hero` eagerly loads and assigns high fetch priority only to its first Homepage image or first valid slide.
- Do not preload every slideshow image. Later slides and below-fold media remain deferred.
- Do not lazy-load the actual LCP image. Reserve stable media geometry and avoid duplicate desktop/mobile downloads where responsive markup can select an appropriate source.
- Server-render critical lead text, actions, and discovery. JavaScript progressively enhances slideshow, media, and interactive sections but must not create a blank Homepage.
- Minimize above-fold JavaScript and avoid a heavy Homepage-only dependency bundle, polling, duplicate product-data requests, unnecessary observers, and hidden duplicate page compositions.
- Defer optional integrations. Social feeds, reviews, external video, recommendations, and app blocks must not block core lead or discovery.
- Use restrained animations and avoid several autoplaying or video-heavy regions.
- Preserve layout stability when media, app blocks, feedback, or optional regions load. Clean up timers, listeners, observers, and media during Theme Editor rerenders.
- Keep the section count within the documented range. The main Homepage performance risks are oversized lead media, multiple sliders, many product grids, background video, social embeds, review applications, logo-image collections, excessive animation, unbounded Custom Liquid, duplicate media, and too many sections.

## AI Guidelines

Homepage generation is deterministic and approval-bound. It begins with verified merchant inputs, approved Shopify resources, Brand Blueprint, Store Strategy, Resource Plan, and the current supported section capability map.

AI must follow this sequence:

1. Confirm verified merchant resources and approved destinations.
2. Classify catalog size, collection structure, flagship-product presence, product and collection imagery, story strength, craft/founder relevance, trust evidence, editorial media, video, review integration, newsletter strategy, launch state, and merchant priorities.
3. Select one supported Homepage variant.
4. Assign one authoritative H1 owner.
5. Select one primary lead and one primary discovery region.
6. Add only regions that serve a documented merchant or customer goal.
7. Order commerce before unnecessary editorial depth.
8. Verify every action destination and resource reference.
9. Omit unsupported integrations and incomplete optional regions.
10. Validate mobile order, heading hierarchy, accessibility, performance, SEO, and structured data.
11. Remove duplicated messages, destinations, sections, and media.

AI should preserve merchant-approved content, use real Shopify products and collections, prefer compact composition when resources are weak, prefer Hero over Slideshow when one message is sufficient, and place Newsletter late by default. It should use Section Heading only for meaningful section introductions, select editorial sections only when content is authentic, and use Custom Liquid only for a verified technical requirement.

AI must never invent merchant copy presented as fact; products; collections; reviews; awards; press; logos; shipping, sustainability, or founder claims; deadlines; sale urgency; social posts; integrations; or app sections. It must never add every available Homepage section, choose a Slideshow for visual novelty, create competing primary CTAs or duplicate H1s, hide commerce beneath excessive storytelling, duplicate desktop/mobile sections, use Custom Liquid as a default escape hatch, or treat page length as quality.

### Deterministic section-selection matrix

| Verified merchant condition | Preferred lead | Preferred first discovery | Recommended supporting roles | Omission-first or prohibited roles | Normal region range |
| --- | --- | --- | --- | --- | --- |
| One-product store | Product-led Hero or concise Hero with real product context. | Featured Product or direct verified product path. | One trust/detail role; optional concise story. | Collection List unless it adds real navigation; slideshow without distinct messages; repeated product grids. | 3–5 |
| Small catalog | Image- or text-led Hero. | Featured Collection or small curated product grid. | One merchant-value or trust role; newsletter only if real strategy exists. | Several discovery grids, carousels, or repeated collection sections. | 4–6 |
| Multi-collection catalog | Hero with clear catalog orientation. | Featured Collection or Collection List. | A distinct secondary collection path; concise story or trust role. | Product-first lead without flagship evidence; duplicate collection cards; long story before discovery. | 5–8 |
| Story-led artisan brand | Hero with approved craft, origin, or product context. | Featured Collection or curated product path immediately after lead. | One verified founder, material, craft, or process role; evidence-based trust. | Founder portrait without consent; unverified timeline, material, origin, or sustainability claims; commerce buried below story. | 5–8 |
| Image-rich editorial brand | Editorial Hero or Hero with approved media. | Featured Collection or curated product grid. | One image-with-text, lookbook, or editorial role; a distinct discovery path. | Multiple full-width banners, consecutive carousels, decorative video, or repeated editorial messages. | 5–8 |
| Resource-limited merchant | Text-led Hero or restrained Hero fallback using real `shop.name`. | One real collection, product, or catalog path. | One concise rich-text or trust role only if verified. | Slideshow, video, social gallery, testimonials, logo list, custom liquid, filler sections, or fake catalog cards. | 3–4 |
| Verified product launch | Launch-focused Hero with factual date or release context. | Verified launch product or collection. | Concise proof, launch-specific editorial context, and safe post-launch replacement state. | Countdown without fixed verified deadline; rolling urgency; launch copy or destinations after the launch becomes invalid. | 4–6 |

## Quality Checklist

- [ ] The Homepage has one clear customer purpose.
- [ ] One authoritative H1 exists and belongs to the first meaningful lead.
- [ ] The lead communicates the real offer and, when applicable, one verified next action.
- [ ] Primary product or collection discovery appears early.
- [ ] Every selected section serves a documented goal and the total region count remains restrained.
- [ ] No value proposition, product, collection, media asset, or primary CTA is duplicated without a distinct purpose.
- [ ] No fabricated merchant claims, fake urgency, unsupported integration, or empty optional section appears.
- [ ] No competing sliders, autoplaying regions, or visually heavy sequences compromise clarity.
- [ ] Mobile source order is meaningful at 320 px; CTA groups, translated text, browser zoom, large text, and RTL layouts remain resilient.
- [ ] Landmarks, heading hierarchy, keyboard access, visible focus, reduced motion, slideshow behavior, and meaningful media alternatives are valid.
- [ ] SEO title, description, canonical, internal-link, social-metadata, and image-alt ownership are clear.
- [ ] Structured data has one verified owner and does not duplicate Product, Article, Organization, or review schema.
- [ ] LCP media is prioritized correctly; below-fold media and integrations are deferred; no duplicate media download or avoidable layout shift occurs.
- [ ] Theme Editor rerenders safely; required-role deletion is handled safely; merchant configuration and approved resources are preserved.
- [ ] AI variant selection and section ordering are deterministic; compact composition is chosen when content is limited.
- [ ] The page remains useful without JavaScript, reviews, social feeds, video, or optional integrations.
- [ ] The composition serves real merchant and customer goals rather than demonstrating theme capability.

## Future Compatibility

Safe future extensions may include approved alternate Homepage templates, campaign-specific landing pages as a separate future page category, market-specific composition where Shopify architecture supports it, richer structured content sources, Shopify block nesting, approved personalization with explicit privacy boundaries, stronger page-role validation, automated resource scoring, AI section recommendations, preset-specific defaults, analytics-informed optimization, controlled A/B testing under separate architecture, and future section families.

Future extensions must not weaken heading hierarchy, permit fabricated content, force automatic personalization, make integrations mandatory, turn the Homepage into an unrestricted page builder, move checkout or backend logic into the theme, allow arbitrary scripts, break valid merchant templates, auto-update merchant themes, create silent structural changes, override explicit merchant approval, or replace deterministic generation with subjective randomness.

### Future implementation-hardening recommendations

The current Homepage implementation is a safe baseline, not the complete enforcement of this contract. A future implementation milestone should consider:

1. Page-role validation that detects a missing approved discovery resource, a duplicate lead, duplicate H1, excessive section density, and technically assignable global enhancements added as homepage content.
2. Publication-safe onboarding behavior that prevents generic starter copy and placeholder discovery cards from reaching a customer-facing merchant Homepage without explicit approval.
3. An approved Homepage structured-data implementation with one clear owner, verified merchant organization data, and JSON-LD validation.
4. Theme Editor guidance or guardrails for primary-lead uniqueness, section-role prerequisites, duplicate section patterns, and safe resource reassignment.
5. Page-level automated checks for mobile order, no-JavaScript lead/discovery behavior, LCP selection, section lifecycle cleanup, and valid final heading hierarchy.

These are recommendations only. They do not authorize a theme change, mutation, upload, publication, or automatic merchant-template modification.
