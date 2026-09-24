# Premium Cart and Cart Drawer System

Calinium One has one canonical cart architecture: `main-cart` is the cart-page section and the global `cart-drawer` section supplies the optional drawer. Both use the same `cart-item`, `quantity-input`, `cart-summary`, and `cart-empty-state` snippets. The header keeps its existing normal cart link; JavaScript only opens the drawer when it is available.

## Architecture and compatibility

Existing setting IDs are preserved: `main-cart` retains `show_cart_note` and `color_scheme`; `cart-drawer` retains `enable_cart_drawer` and `color_scheme`. The existing native cart forms, `cart/change.js` enhancement, item keys, line-item properties, selling plans, discount allocations, and standard checkout submission remain the canonical contract.

The additive cart-page settings are `enable_sticky_summary`, `show_dynamic_checkout`, `show_secure_checkout`, `show_payment_icons`, `free_shipping_threshold`, `enable_recommendations`, `recommendation_source`, `recommendation_products`, `recommendations_heading`, `recommendation_intent`, `recommendations_to_show`, `recommendation_image_ratio`, `show_recommendation_vendor`, and `empty_products`.

The additive drawer settings are `drawer_position`, `show_cart_note`, `show_dynamic_checkout`, `show_secure_checkout`, `show_payment_icons`, and `free_shipping_threshold`. All recommendation and empty-cart products are explicit Theme Editor selections. Shopify recommendations are loaded only when a cart has a real first product and Shopify returns results. Calinium never creates, chooses, or presents a made-up product, threshold, payment method, shipping offer, or recommendation.

## Drawer behavior

The drawer is a server-rendered `<aside>` that becomes a modal dialog only after `cart-drawer.js` initializes it. It supports either edge, overlay dismissal, Escape, focus trapping, focus restoration, body scroll locking, and a reduced-motion close path. It stays hidden without JavaScript, so the regular header cart link continues to open `/cart`.

Opening the drawer refreshes only its server-rendered cart content. The controller aborts an obsolete refresh, cleans up on Theme Editor section unload, and uses one delayed close operation at a time. Repeated Theme Editor reloads initialize only the newly rendered drawer.

## Line items, quantities, and summary

`cart-item` renders real Shopify item data only: image, title, selected options, selling-plan label, public line-item properties, item and line prices, discounts, quantity, and removal link. The shared quantity primitive supplies native numeric input first. Cart JavaScript then reveals decrement and increment controls, constrains them to Shopify quantity rules, sends exactly one active `cart/change.js` request, and replaces Shopify-confirmed section markup. A failed request restores the prior quantity and exposes an announced error instead of assuming a cart update succeeded.

`cart-summary` retains subtotal, cart-level discounts, total, tax/shipping notice, and checkout. Where Shopify enables them, accelerated checkout buttons and real payment methods can be shown. A free-shipping progress message is rendered only when a merchant configures a non-zero threshold. The threshold is entered in the store’s primary currency; stores that use a zero-decimal or unusual presentment currency should manually confirm the result in Shopify before enabling it.

## Recommendations and empty state

The page can show a merchant-selected product list or Shopify’s related/complementary product recommendation response for the first real cart item. Both use the canonical `product-card` snippet and its existing responsive image, price, availability, and accessibility behavior. Shopify recommendations are progressive: a failed request hides the otherwise empty region and leaves the cart usable. The empty cart has a native continue-shopping action and may show only merchant-selected products.

## Accessibility and performance

- Native cart forms, item links, remove links, checkout, and continue-shopping actions work without JavaScript.
- The drawer has an accessible name, modal semantics after enhancement, keyboard focus containment, Escape dismissal, and focus restoration.
- Quantity controls retain visible labels for assistive technology, use buttons with accessible names, and report update/error state through existing live regions.
- Dynamic checkout remains Shopify-provided markup; payment icons are labelled as a group.
- The drawer and cart respect `prefers-reduced-motion`; no animation is needed to access cart content.
- The code uses browser-native fetch, `AbortController`, `DOMParser`, and a small number of delegated event listeners. It has no dependency, observer, or interval timer.
- Product imagery continues through the responsive `product-card` primitive and is lazy-loaded.

## Generator mapping

The generated section capability catalog discovers the cart settings directly from the canonical Shopify schemas. `generateSectionInstances` merges approved bounded cart settings into the preserved `templates/cart.json`; merchant resource settings such as selected products remain confirmation-gated. The paid immutable snapshot and read-only package validator stay unchanged. No mapping includes merchant IDs in canonical source.

## Manual QA matrix

Use an authorized unpublished theme to verify:

1. Empty cart, a single item, multiple items, discounts, selling plans, and line-item properties.
2. Quantity input, increment/decrement, minimum/maximum rules, remove, request failure recovery, and no duplicate rapid requests.
3. Drawer opened from the header, left/right positions, overlay click, Escape, focus trap, focus restoration, and a normal cart link with JavaScript disabled.
4. Desktop sticky summary, cart note, tax/shipping notice, configured free-shipping progress, accelerated checkout where Shopify supplies it, and real payment icons.
5. Merchant-selected recommendations, Shopify related recommendations, Shopify complementary recommendations, unavailable recommendations, and empty-cart selections.
6. 320 px mobile, tablet, desktop, and wide desktop layouts; drawer scroll lock; long product and property values.
7. Keyboard-only operation, screen-reader announcements, visible focus, and reduced-motion behavior.
8. Theme Editor reloads, setting changes, and cart drawer section unload/reload without duplicated handlers.

Run `node scripts/test-premium-cart.js` after changing this system.
