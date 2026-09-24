# Cart Page

## Purpose

The Cart Page is the complete storefront destination for reviewing and updating the current Shopify cart before checkout. It keeps selected products, quantities, prices, and the Shopify checkout path clear, accurate, and easy to act on.

It owns page-level cart hierarchy, Cart Items and Cart Summary placement, quantity and removal placement, cart-note placement where enabled, empty/update/error states, restrained reassurance and recommendations, mobile checkout priority, Theme Editor composition, deterministic generation, and page-level performance review.

It does not own checkout, payment processing, tax, shipping-rate or discount calculation, inventory truth, product or variant records, Shopify cart persistence or routes, accelerated-checkout backend behavior, subscription or bundle backends, applications, Cart Drawer internals, a separate Cart Notification, or global Header and Footer behavior. Shopify owns cart and checkout truth. Luxury comes from calm review and transparent totals, not pressure, hidden fees, fake savings, or obstructive upsells.

## Customer Goals

The Cart Page should answer, without requiring previous browsing:

1. What is currently in my cart?
2. Which variant, option, property, or selling plan did I select?
3. How many units am I buying?
4. What does each item cost?
5. What is the current subtotal and cart total?
6. Can I update or remove an item?
7. Are there important purchase notes?
8. How do I proceed to checkout?

Customers must be able to review factual Shopify cart data, update a supported quantity, remove an item, understand shown discounts and tax/shipping context, and enter Shopify checkout. The page remains understandable when a customer arrives directly, returns through browser history, has no cart, has several items, is not signed in, does not remember selected options, or has not used the Cart Drawer.

## Merchant Goals

The Cart Page should let merchants offer a clear review and checkout handoff without making them configure totals, quantity logic, discounts, taxes, shipping, accessibility, synchronization, or payment behavior.

Merchants may provide approved reassurance, optional Cart Note visibility, safe recommendation sources, and restrained presentation choices where the current section supports them. Calinium recommends the smallest sufficient composition based on cart complexity and verified services. Merchants do not need to become cart-interface designers, configure technical update behavior, or create pressure to increase order value.

## Shopify Context

The Shopify template type is `cart`. The current canonical template is `apps/theme/templates/cart.json`; it assigns one enabled `main-cart` section in the `main` position and contains no disabled section instances. The current `cart` object, its items, quantities, properties, selling-plan allocations, money values, discount allocations, note, tax context, and checkout availability are authoritative.

Shopify owns cart persistence, line-item and cart-level pricing, discount calculation, tax/shipping behavior, inventory validation, cart routes, checkout routing, dynamic checkout availability, subscription/bundle behavior, and market/currency truth. Cart Page and Cart Drawer may coexist, but must use this same Shopify truth rather than competing client-side cart stores. Global Header, Footer, localization controls, skip link, `main` landmark, and checkout are outside Cart Page content regions.

### Current implementation evidence

- `main-cart` renders one localized `cart.title` H1. A populated cart uses Shopify’s native `{% form 'cart' %}` with one Cart Items list and one `aside` Cart Summary; an empty cart renders `cart-empty-state` and optional merchant-selected Product Cards.
- `cart-item` renders product title/link when available, selected option values except a sole default variant, selling-plan name, non-private non-empty line-item properties, final/unit/compare-at price data, line-level discounts, availability/error messages, supported quantity rules, remove link, and final line price. Missing item media is omitted rather than replaced by a Placeholder Image.
- Private line-item properties prefixed with `_` are intentionally not shown. Uploaded property values containing `/uploads/` render as links. The current implementation has no special gift-card treatment beyond normal line-item rendering.
- `cart-summary` renders item subtotal, Shopify cart-level discounts, current cart total, a tax/shipping-at-checkout message derived from Shopify cart flags, optional Cart Note, primary native Checkout submit, optional Update submit, accelerated checkout only when Shopify supplies it, optional payment icons, secure-checkout text, and a configurable free-shipping message.
- The free-shipping message is based on a section numeric threshold and `cart.total_price`; it is not currently validated against market-specific shipping rules or a provider response. It must therefore remain an implementation-hardening concern rather than a universally reliable shipping promise.
- Without JavaScript, numeric quantity fields, native cart form submits, remove URLs, note submission, and the Checkout submit remain usable. Quantity stepper buttons are initially hidden and become an enhancement.
- `cart.js` replaces rendered cart sections only after a successful `cart/change.js` response. It shares a single in-flight update, restores the prior quantity on a non-abort error, disables affected controls while pending, restores predictable focus, and announces factual success/error feedback. Repeated client updates abort the preceding request; Shopify’s confirmed response remains authoritative.
- The global Cart Drawer reuses the same Cart Items, Cart Summary, and cart-update controller. It receives rendered section updates and global cart-count events. Product add forms request a cart refresh and open the Drawer when the enhancement is available. There is no separate Cart Notification section or notification state architecture in the current runtime.
- Recommendations are optional. Merchant-selected products render server-side; Shopify recommendations are fetched from the current first cart-item product and hide when unavailable or the request fails. No recommendation is required for cart review or checkout.
- `main-cart` has no blocks or `@app` block schema. The Cart Drawer is a global section with its own settings. Both controllers initialize on section load and clean up on section unload.
- Global metadata emits canonical, title, description when available, and generic social output. It has no cart-specific robots rule or cart structured data. `layout/theme.liquid` emits JSON-LD only for product and article contexts.
- Cart item images are currently lazy loaded. The first visible cart image can therefore be LCP in image-led carts; the H1 or summary can lead in text-led carts. Localization uses Shopify routes and money/translation output; no separate cart market logic exists.

The current implementation is a capable, merchant-ready baseline for native cart review and checkout handoff. The target contract below adds guardrails and future hardening; it must not be described as already implemented unless verified again.

## Entry Conditions

A customer may arrive from the Header cart link, Cart Drawer View Cart action, product add-to-cart path, direct `/cart` URL, browser history, a saved Shopify cart session, a cart-recovery link where supported, or a localized cart URL. A dedicated Cart Notification is not a current entry condition.

The page must not assume that a customer used the Product Page or Drawer, remembers selected variants, understands line-item properties or selling plans, has only one item, is signed in, has a discount, knows final shipping/tax cost, or has confirmed inventory for every requested quantity. The page does not personalize cart actions from unverified identity or behavior.

## Page Structure

The conceptual page structure is:

1. Global Header.
2. One `main` landmark.
3. Optional Breadcrumbs.
4. Page orientation: one H1 and optional concise factual cart status.
5. One authoritative Cart Items region with local update/error feedback.
6. One Cart Summary region: subtotal, discounts, truthful tax/shipping note, optional Cart Note, checkout action, and only supported accelerated checkout.
7. Optional concise reassurance.
8. Optional secondary recommendations.
9. Empty-cart recovery when the cart has no items.
10. Global Footer.

The first viewport prioritizes cart identity, items, selected options, quantities, prices, subtotal, and checkout. On mobile, the summary must remain easy to reach without obscuring editing. Long editorial content, newsletters, and recommendations must never sit between Cart Items and the initial checkout path.

| Cart context | Smallest sufficient composition |
| --- | --- |
| Populated minimum | H1, Cart Items, quantity/remove controls, factual subtotal/total context, and Shopify checkout. |
| Standard | Required regions plus one concise verified reassurance only when it reduces uncertainty. |
| Recommendation-enabled | Required regions plus one clearly secondary discovery region after cart review. |
| Empty | H1, factual Empty State, and a verified return-to-shopping action. |

Line items are content within Cart Items, not page sections.

## Required Regions

| Required role | Customer outcome | Page rule |
| --- | --- | --- |
| Page identity | Recognize the destination. | One visible authoritative Cart H1. |
| Cart Items | Review current Shopify cart truth. | One authoritative list/table-like region renders every returned line item. |
| Line-item clarity | Understand what is being purchased. | Product identity, relevant variant/options, purchase-relevant properties, selling plan, price, and current quantity remain understandable. |
| Cart editing | Correct the cart. | Supported Quantity Selector and clear remove action remain available for each eligible item. |
| Financial summary | Understand current cart value. | One Cart Summary renders factual subtotal, applicable discounts, and clearly qualified total/tax/shipping context. |
| Checkout handoff | Continue purchase. | One dominant Shopify-native checkout action remains available unless Shopify returns a verified blocking state. |
| Accurate feedback | Understand change, pending state, or failure. | Updates and errors appear near their affected item/summary or in one factual feedback region. |
| Empty recovery | Recover when no items exist. | An Empty State does not show fake totals, recommendations-as-cart-items, or invented saved-cart data. |

The Cart Summary may compose Cart Note, qualified tax/shipping wording, accelerated checkout, and legally necessary acknowledgment only when supported. It must not hide items or subtotal, fabricate totals, discounts, savings, shipping, taxes, stock, or checkout eligibility; pre-add products; make removal difficult; require an app for checkout; or silently omit fulfillment-relevant properties.

## Optional Regions

No optional region is required for baseline Cart Page validity. Every optional role needs verified data, a clear customer benefit, and a safe omission path.

| Optional role | Select only when | Omit when |
| --- | --- | --- |
| Breadcrumbs | A truthful hierarchy helps orientation. | It duplicates global navigation or the hierarchy is unavailable. |
| Cart item count | Shopify current count improves orientation. | It repeats the Header without useful context. |
| Cart Note or gift message | Supported Shopify persistence and fulfillment purpose exist. | The information is unnecessary, sensitive, or cannot be preserved safely. |
| Terms acknowledgment | A real legal requirement and accessible implementation exist. | It is merely friction or unverifiable. |
| Free-shipping progress | Threshold, market, currency, and shipping rule are verified. | The message is a static assumption or cannot be made accurate. |
| Shipping, return, pickup, delivery, payment, or trust reassurance | A factual supported source resolves a real purchase uncertainty. | It is generic, unverified, or delays checkout. |
| Discount-code, gift wrap, donation, bundle, subscription, loyalty, or saved-cart features | A verified Shopify or approved integration contract exists. | Capability, consent, persistence, or fulfillment behavior is unavailable. |
| Recommendations, complementary products, or recently viewed | Relationships/history are verified and remain clearly secondary. | They are irrelevant, duplicate items, fail, or compete with checkout. |
| App blocks or support link | The integration/action is supported and safe. | It blocks cart review or checkout, exposes unavailable capability, or has no verified destination. |
| Continue shopping | A valid storefront destination exists. | It is visually competitive with checkout in a populated cart. |

Upsells are never preselected. A recommendation can be added only through normal, explicit Shopify cart behavior. Optional integration failure never blocks checkout.

## Section Composition

Cart Page composition is deterministic and review/checkout first:

1. Cart orientation.
2. Current cart contents.
3. Cart editing and feedback.
4. Cart totals.
5. Checkout action.
6. Supporting reassurance.
7. Optional secondary discovery.

A populated page is normally Cart header, Cart Items, Cart Summary, optional service reassurance, then optional recommendations. An empty page is Cart header, Empty State, Continue Shopping, then at most one restrained verified discovery role.

| Classification | Cart Page rule |
| --- | --- |
| Globally required | Header, Footer, skip link, and main landmark are global, not cart content. |
| Page-functionally required | One H1, one Cart Items owner, one Cart Summary, item editing, factual feedback, and one primary checkout action. |
| Recommended | Compact factual tax/shipping context and reassurance only when it reduces a real uncertainty. |
| Optional | The source-backed roles listed above. |
| Repeatable | Line items; carefully bounded reassurance or recommendation roles with distinct purpose. |
| Single-instance | Page H1, Cart Items, Cart Summary, authoritative subtotal/total presentation, Cart Note owner, Empty State owner, and primary checkout action. |
| Integration-dependent | Accelerated checkout, recommendations, shipping/pickup/delivery, subscriptions, bundles, loyalty, saved carts, and app blocks. |
| Prohibited | Duplicate Cart Items/Summaries/totals, conflicting checkout actions, preselected additions, hidden removal, cart-replacing promotions, several recommendation carousels, newsletter before checkout, countdowns, forced modal upsells, and Custom Liquid as a default cart solution. |

Subtotal and checkout remain close. Errors appear near the affected item or summary. Recommendations follow the current cart rather than interrupting it.

## Component Composition

The page composes existing components without taking their bounded responsibilities.

| Component or family | Cart Page relationship |
| --- | --- |
| Cart Items and Cart Line Item | Own the authoritative list and one line item’s presentation. The page owns one list, hierarchy, and states. |
| Quantity Selector and remove action | Own quantity input and removal interaction. The page decides placement and truthful update feedback. |
| Cart Summary, Cart Note, Price, Tax Note, and Shipping Estimate | Own totals presentation, note input, money display, and qualified contextual messages. The page owns one summary and checkout priority. |
| Button, Icon Button, Checkbox, Textarea, Field, Form Group, and Validation Message | Retain control/form responsibility. Links navigate; buttons operate. |
| Cart Drawer and global feedback | Drawer owns overlay lifecycle; Cart Page owns the full destination. Current product-form feedback and global live announcements are not a separate Cart Notification system. |
| Empty State, Alert, Inline Message, Loading Spinner, Skeleton, and Status Indicator | Communicate the least disruptive factual state. Empty State does not conceal error or loading. |
| Responsive Image, Aspect Ratio, Placeholder Image, Divider, Container, Section, Grid, Stack, Split, Sidebar Layout, Surface, and Content Wrapper | Own media and layout mechanics. The page owns content priority and source order. |
| Product Card, Trust Badge, Pickup Availability, and recommendations | Support optional secondary discovery/reassurance only with verified sources. |

Sections own merchant-editable presentation. Shopify owns cart data, money, discounts, state, routes, checkout, and dynamic checkout availability. Applications own their verified features, never baseline cart review.

## Content Rules

Cart content is verified, specific, concise, based on Shopify cart truth, and free from fabricated financial or fulfillment claims.

### Page H1 and item identity

The Cart Page has one authoritative H1: Cart or a verified localized equivalent. Cart Items, Cart Summary, checkout copy, and mobile/desktop duplicates must not add another H1. Supporting regions normally use H2; nested content may use H3. Product titles remain subordinate links. Totals and subtotal labels are not headings.

Use verified Shopify product and variant titles. Omit a meaningless sole default variant; preserve relevant options, selling-plan titles, and purchase-relevant line-item properties. Preserve valid product links when Shopify supplies them. Do not replace titles with promotional names, hide fulfillment-relevant properties, or expose private/internal properties.

### Quantity, removal, and update feedback

Show the current Shopify quantity and use only verified minimums, maximums, and increments. Pending changes are distinct from confirmed cart state. Do not silently alter a quantity, imply inventory confirmation before Shopify responds, or claim successful removal before confirmation. Errors preserve the previous confirmed cart where possible and provide a factual recovery path.

### Prices, discounts, tax, and shipping

Use Shopify money formatting. Distinguish original/final line prices, line-level discounts, cart-level discounts, item subtotal, and current cart total. Do not fabricate savings, estimate checkout total, or imply that shipping/taxes/duties are included unless Shopify or a verified market source confirms it.

Shipping and tax wording clearly distinguishes a current cart total from final checkout calculations. Free-shipping progress, delivery, pickup, duties, and discount-code messages appear only from verified source data. The page must not promise shipping rate, free-shipping qualification, delivery date, eligibility, or policy outcome that the cart cannot prove.

### Notes, properties, and promotion

Cart Note and property inputs have visible labels and a known Shopify fulfillment purpose. Customer-entered data is preserved and escaped safely; unnecessary sensitive data is not collected. Promotional claims must never fabricate subtotal, total, discounts, savings, shipping, taxes, duties, inventory urgency, stock count, delivery date, free-shipping qualification, checkout deadline, reserved-cart timer, bundle saving, loyalty reward, gift eligibility, or customer demand.

## Supported Variants

Variants are controlled strategic compositions based on actual cart complexity, verified services, and merchant-approved resources. They are not decorative presets.

| Variant | Select when | Composition |
| --- | --- | --- |
| Compact | The cart is simple, small, and needs no extra service context. | Items, one concise summary, checkout, and no filler. |
| Standard | A normal physical-product cart needs balanced item review and summary. | Items and summary are equally clear, with restrained factual notes. |
| Summary-led | Checkout completion is dominant and items are straightforward. | Summary is visible without obscuring cart editing or breaking mobile source order. |
| Item-led | Properties, variants, selling plans, or configurations need careful review. | Item details are prioritized before concise summary and checkout. |
| Service-rich | Verified shipping, pickup, return, gift, or service information reduces real uncertainty. | One concise source-backed service role follows the summary. |
| Empty-cart recovery | Shopify returns zero items. | Empty State and one verified return-to-shopping action; recommendations stay limited. |

AI selects the smallest valid variant. Visual presets remain outside Cart Page ownership.

## Supported States

| State | Required behavior |
| --- | --- |
| Empty, one-item, multiple-item, or high-count cart | Render the authoritative returned cart without filler or hidden items. |
| Variant, property, selling-plan, or gift-card line item | Preserve real relevant information; omit unsupported special treatment. |
| Missing image | Use restrained fallback or omit media without an empty decorative wrapper. |
| Quantity/update/removal pending | Lock only affected controls, retain confirmed context, and announce real pending state carefully. |
| Quantity/update/removal success or error | Replace/render only after Shopify confirmation; local errors do not erase confirmed cart truth. |
| Inventory adjustment, unavailable item, or price change | Use Shopify-returned state and provide factual recovery. |
| Line/cart discount or no discounts | Render Shopify-provided discount data only. |
| Cart Note enabled/disabled | Preserve the configured form behavior; omit absent control cleanly. |
| Accelerated checkout available/unavailable | Render only Shopify-provided buttons and retain normal checkout. |
| Integration unavailable or stale client state | Preserve Cart Items, normal checkout, and resolve to Shopify cart truth. |
| Theme Editor/localized/RTL/zoomed content | Preserve source order, wrapping, IDs, and usable controls without fake cart data. |

Empty is distinct from loading. Pending is distinct from confirmed state. Cart Drawer and Cart Page cannot maintain competing cart truth; a stale client view must refresh from Shopify rather than invent state.

## Navigation and Actions

The primary action is proceeding to Shopify checkout. It is visually dominant, uses verified Shopify form/route behavior, and remains accessible after confirmed cart state.

Required editing actions are quantity update and item removal. Secondary actions may open a valid product, continue shopping, edit configuration only where Shopify supports it, add a Cart Note, use accelerated checkout, open verified policy/service information, add a verified secondary recommendation, or contact support.

Links navigate; buttons operate. Remove controls remain clear but not visually dominant. Continue Shopping does not compete with checkout on populated carts. Accelerated checkout does not bypass Shopify-imposed review constraints. Recommendations use normal explicit cart behavior and are never preselected. Duplicate checkout controls cannot diverge. Focus remains predictable after a confirmed update or removal.

## Responsive Behaviour

The Cart Page is mobile first. Cart identity and Cart Items remain early, while checkout remains easy to reach from 320 px through tablet, desktop, wide desktop, browser zoom, large text, translated labels, and RTL.

- Line items reflow without losing associations among image, title, variant/options, property, quantity, removal, and price. Long titles and properties wrap naturally; prices never overlap.
- Quantity and removal controls remain visible, keyboard usable, and touch safe. Product media reserves stable geometry. No essential data disappears only because the viewport narrows.
- Cart Items and Cart Summary are never duplicated for desktop/mobile. CSS order preserves semantic source order and avoids JavaScript layout calculations where CSS suffices.
- A desktop sticky summary is allowed only when it does not obscure item editing or browser UI. Any mobile sticky checkout respects safe-area insets, on-screen keyboard, focus, and edit context.
- Recommendations remain secondary and must not push the initial checkout route excessively far down.

The page owns content priority; component and layout primitives own responsive mechanics.

## Accessibility

The Cart Page targets WCAG 2.2 AA:

- One `main` landmark, valid skip-link target, meaningful document title, one H1, and logical subordinate headings.
- Cart Items use suitable semantic list/table-like structure. Each line item remains programmatically understandable, with meaningful product link, image alternative, variant/property relationship, quantity label, current price, and remove name identifying the affected item.
- Quantity, remove, Update, Checkout, Cart Note, terms controls, accelerated checkout, and optional integration actions support keyboard use, visible focus, sufficient contrast, and touch targets.
- Pending, selected, disabled, update, removal, unavailable, price-change, discount, and error states use text rather than color alone. Local errors appear near controls; factual updates use restrained live regions without repeated announcements.
- Focus never moves automatically without cause. After removal, focus has a predictable valid destination; no nested interactive controls, hidden essential details, or inaccessible sticky checkout is permitted.
- Reduced motion, zoom, large text, RTL, translation resilience, stable source order, unique IDs, and non-focusable skeleton/placeholder output remain valid.

Cart, form, feedback, and overlay component specifications own detailed interaction contracts.

## SEO

Cart Page SEO is privacy-first and non-index-oriented. It owns meaningful destination-title, canonical cart URL, noindex policy recommendation, one H1, parameter/attribute boundaries, localization boundary, and separation from Product/Collection ownership. It does not claim search value, own checkout metadata, or expose customer cart state in social metadata.

Cart contents, properties, discounts, attributes, and customer-specific URLs must not become indexable metadata, Open Graph content, or canonical variants. No hidden SEO text, product-schema duplication, keyword-oriented content, ranking promise, or doorway behavior is allowed. Shopify emits platform data; merchants may supply approved broad metadata; the theme emits safe global metadata; any application metadata requires an explicit privacy review.

Current evidence: global `meta-tags` emits canonical/title/description/social output with no Cart Page-specific robots policy. A future implementation should establish an explicit `noindex` policy and parameter handling without exposing cart data.

## Structured Data

Cart Page normally emits no commerce-result structured data. It must not emit Product schema for every line item, Offer schema from customer state, Order or CheckoutPage schema, cart properties, discounts, or attributes in JSON-LD. Generic `WebPage` or Breadcrumb schema is optional only with an approved purpose, one owner, customer-state privacy protection, and validation.

Current evidence: `layout/theme.liquid` emits JSON-LD only for product and article contexts. No Cart Page structured data exists, avoiding current cart-data duplication. Applications and sections must not introduce competing cart schemas.

## Shopify Settings

Merchants may control, where supported and safe:

- Cart Note visibility, color scheme, desktop sticky-summary preference, accelerated-checkout visibility, secure-checkout text, payment-icon visibility, and verified free-shipping context;
- merchant-selected or Shopify-backed recommendations, recommendation heading, count, image ratio, and vendor visibility;
- optional empty-cart discovery products and controlled layout variants;
- approved reassurance, policy links, and compatible app blocks only when a supported section/integration exposes them.

The page specification recommends one Cart Items owner, Cart Summary, authoritative subtotal/total presentation, primary checkout action, Cart Note owner, Empty State owner, and a bounded number of recommendation regions. Architecture retains semantic hierarchy, cart/price/discount truth, update/remove correctness, checkout ownership, source order, accessibility, tokens, typography, breakpoints, motion, focus, SEO/schema/performance boundaries, lifecycle, and integration behavior.

Merchants must not receive controls for fake totals/discounts/shipping/taxes/stock, arbitrary checkout URLs or cart mutation, raw CSS/JavaScript/ARIA/schema, arbitrary headings/breakpoints, unrestricted sticky behavior, preselected upsells, forced add-ons, hidden removal, misleading checkout labels, unsupported urgency, or payment manipulation.

## Theme Editor Behaviour

The current `cart.json` template has one page-functionally required `main-cart` section, limited to one instance and with no blocks or app-block schema. The global Cart Drawer is separately configurable. Both cart controllers initialize once per rendered root, update from Shopify-rendered sections, and remove listeners/requests on section unload.

The target editor contract preserves merchant configuration while keeping essential cart roles safe:

- required: H1, one Cart Items region, one Cart Summary, normal checkout, factual update/error fallback, and empty-cart recovery;
- recommended: concise verified reassurance;
- optional: source-backed Cart Note, payment/service context, recommendations, and integrations;
- repeatable: cart line items and bounded distinct service/recommendation roles;
- single-instance: H1, Cart Items, Cart Summary, subtotal/total owner, Cart Note owner, Empty State owner, primary checkout action;
- integration-dependent: accelerated checkout, recommendations, subscriptions, bundles, shipping/pickup, loyalty, saved-cart, and apps;
- prohibited: duplicate cart submissions/quantity controllers/Cart Items/Summaries/checkout actions, stale competing Page/Drawer state, fake cart preview data outside design mode, and essential-role removal without fallback.

Future setting, line-item, app, or section rerenders must preserve unique IDs, native form fallback, note synchronization, action availability, focus, and merchant configuration. Design-mode placeholders may clarify empty configuration only in the editor. These are documented enforcement goals, not current full Theme Editor capabilities.

## Performance Rules

The likely LCP candidate is the first visible cart-item image in an image-led cart, the Cart H1, or the Cart Summary in a text-led composition.

- Prioritize only actual first-view item media. Do not preload every image or lazy-load the true LCP image; later images remain responsive and deferred with stable geometry.
- Server-render Cart Items, totals, note, normal checkout, and remove/update fallback. Quantity/removal AJAX progressively enhances the native cart form.
- Serialize or debounce rapid updates safely; no duplicate requests, polling, competing cart stores, repeated controllers, or duplicate cart JSON fetching. Confirmed Shopify responses remain authoritative.
- Recommendations, loyalty/shipping/bundle applications, service integrations, and below-fold cards defer and never block review or checkout. The Drawer must not duplicate Page initialization unnecessarily.
- Avoid layout shifts from media, properties, price/discount changes, errors, app blocks, recommendations, or sticky-summary behavior. Remove listeners, timers, observers, and fetches on Theme Editor rerender.

Risk review is required for many line items, high-resolution images, rapid quantity changes, Page/Drawer synchronization, free-shipping or delivery integrations, subscriptions, bundles, recommendation carousels, duplicated checkout actions, oversized properties, and price changes.

## AI Guidelines

AI generates Cart Pages deterministically from verified Shopify cart context, approved merchant resources, and supported runtime capabilities. It does not calculate totals, infer cart data, create an order, or replace Shopify checkout.

### Required sequence

1. Confirm valid Shopify cart context and whether it is populated or empty.
2. Classify item/line-item count, variant/properties/selling plans, media, discounts, Cart Note, tax/shipping/reassurance availability, accelerated checkout, recommendations, services, localization, and mobile needs.
3. Assign one Cart H1 and select one documented variant.
4. Configure one authoritative Cart Items region and render every verified line item.
5. Configure quantity and removal controls within Shopify rules.
6. Configure one Cart Summary with factual prices, discounts, subtotal/total context, and one checkout action.
7. Add Cart Note, accelerated checkout, reassurance, recommendations, and integrations only where verified and useful.
8. Configure pending, update, removal, inventory, price-change, empty, and error states.
9. Validate actions, Page/Drawer synchronization, mobile source order, accessibility, performance, SEO, structured data, and duplication.
10. Remove unsupported services, repeated totals/actions, and all promotional pressure.

### Deterministic selection matrix

| Verified condition | Preferred variant | Cart Items / Summary priority | Quantity and note strategy | Reassurance / recommendations | Omit first | Major validation risks |
| --- | --- | --- | --- | --- | --- | --- |
| Empty cart | Empty-cart recovery | Empty State replaces summary | No quantity/note | One real return path; recommendations limited | Totals, upsells, fake saved cart | Treating empty as loading or inventing items. |
| One simple item | Compact | Balanced concise item and summary | Normal quantity; no note unless useful | No support content by default | Recommendations, trust clutter | Checkout buried or repeated actions. |
| Several simple items | Standard | Items then nearby summary | Supported quantity; note optional | One short factual note if useful | Several carousels, upsells | Price/discount clarity and mobile summary reach. |
| Many line items | Item-led | Careful item review before summary | Serialized quantity updates; note optional | Omit nonessential content | Large recommendations | Performance, focus after removal, stale state. |
| Multiple properties | Item-led | Properties remain readable | Preserve property data; note remains distinct | No extra copy needed | Collapsing/omitting fulfillment data | Property privacy, long text, item association. |
| Selling-plan/subscription item | Item-led | Plan visible beside item identity | Preserve plan; normal cart rules only | Explain only verified plan data | Custom subscription claims | Integration/backend mismatch. |
| Discounted cart | Standard or Summary-led | Summary makes Shopify discount clear | Normal quantity; note independent | Qualified tax/shipping only | Fake savings, coupon prompts | Original/final/line/cart discount distinction. |
| Accelerated checkout available | Summary-led | Normal checkout remains clear | Normal editing before handoff | Render Shopify-provided accelerated button | Payment claims | Missing standard checkout or unsupported control. |
| Verified service integrations | Service-rich | Cart review remains first | Preserve native note and updates | One source-backed service role, optional secondary recommendation | Multiple integrations | Blocking checkout, misleading service promise. |
| Cart integration unavailable | Compact or Standard fallback | Native cart and summary stay authoritative | Native form fallback | Omit failed integration | Loading shells/placeholders | App failure blocks checkout or duplicates cart state. |

AI must preserve real Shopify titles, properties, variants, selling plans, money, discounts, and checkout truth; choose the smallest valid variant; make removal and checkout clear; use one Cart Items region, Summary, and H1; keep recommendations secondary; and omit unknown information.

AI must never invent cart items, products, variants, quantities, prices, totals, discounts, savings, shipping, taxes, duties, inventory, urgency, delivery dates, eligibility, timers, bundle/loyalty/gift claims, recommendations, properties, selling plans, integrations, or payment success; preselect or add products; hide removal; duplicate Cart Items/Summaries/H1s; bury checkout; require JavaScript for basic review; manipulate checkout/payment; or fabricate scarcity.

## Quality Checklist

- [ ] One Cart Page purpose, verified Shopify cart context, one H1, one Cart Items region, one Cart Summary, and one dominant Shopify checkout action exist.
- [ ] Every item uses verified identity, variant/options, properties, selling plan, quantity, price, applicable discounts, link, and removal behavior.
- [ ] Empty, populated, pending, confirmed, removal, update error, inventory/price change, discount, unavailable, integration, localization, and Theme Editor states are distinct and recoverable.
- [ ] Totals, discounts, tax/shipping notes, free-shipping messaging, Cart Note, accelerated checkout, reassurance, and recommendations are shown only when truthful and supported.
- [ ] No totals, savings, shipping, taxes, stock, urgency, eligibility, cart persistence, recommendation, or payment claim is fabricated; no upsell is preselected and no removal action is hidden.
- [ ] Checkout stays close to summary; secondary content follows cart review; no duplicate Cart Items, Summary, total, note owner, checkout action, or competing Drawer/Page state exists.
- [ ] Keyboard, focus, live feedback, touch targets, contrast, media alternatives, zoom, large text, RTL, reduced motion, logical source order, and sticky behavior are accessible.
- [ ] Cart privacy, canonical/indexability policy, social metadata, and structured-data boundaries avoid exposing customer cart state or competing with Product/Collection pages.
- [ ] LCP treatment, responsive media, native form fallback, cart-request discipline, stable layout, deferred recommendations, minimal above-fold JavaScript, and lifecycle cleanup are valid.
- [ ] AI selected a deterministic smallest sufficient variant and retained Shopify cart/checkout source truth.

## Future Compatibility

Safe future extensions include controlled alternate Cart Page templates, richer Shopify cart blocks, verified subscriptions, bundles, gift/donation options, approved loyalty and saved-cart integrations, verified delivery estimates, market-specific reassurance, checkout-readiness validation, accessible sticky summaries, approved recommendations, AI cart-complexity scoring, integration-readiness validation, completeness checks, preset defaults, and implementation enforcement for required cart roles.

Extensions must not weaken Shopify cart truth; move checkout or payment into the theme; fabricate cart data/totals; make integrations mandatory; silently update merchant themes; auto-enable apps; create competing cart stores or uncontrolled Cart Items; weaken headings; require JavaScript for basic review; expose scripts/schema or customer cart data; permit deceptive upsells/urgency; hide removal; override merchant configuration; or replace deterministic generation with subjective randomness.

### Future implementation-hardening recommendations

1. Establish an explicit Cart Page `noindex`/parameter policy that preserves privacy without creating competing cart metadata.
2. Add a source-verified, market-aware free-shipping rule contract before presenting the configured threshold as universally applicable.
3. Add a precise missing-media fallback and an LCP policy for the first visible cart image while keeping later images lazy.
4. Define explicit Cart Note preservation during asynchronous line-item updates and a safe stale-client conflict recovery message.
5. Formalize Cart Notification absence or introduce an approved notification contract only if it does not duplicate product-form feedback, Drawer behavior, or global live announcements.
6. Add page-level guardrails for one Summary/Checkout owner, Cart Page/Drawer synchronization, privacy-safe cart metadata, and app-block integration boundaries.

The specification is ready to guide future section documentation, preset composition, deterministic AI Cart Page generation, implementation hardening, and later Standard Page documentation.
