# Sticky Add to Cart

## Purpose

The Sticky Add to Cart component keeps the primary purchase action visible while customers scroll through the product page.

It reduces the distance between product evaluation and purchase by providing continuous access to essential buying controls.

The Sticky Add to Cart should remain helpful—not intrusive.

---

## Responsibilities

The Sticky Add to Cart component is responsible for:

- keeping purchase actions accessible during scrolling
- displaying the selected product summary
- reflecting the current variant
- synchronizing purchase availability
- supporting responsive layouts
- remaining accessible

The Sticky Add to Cart is not responsible for:

- replacing the full product form
- displaying complete product information
- selecting variants (unless configured)
- managing checkout
- validating inventory

These responsibilities belong to other product components.

---

## User Goals

The Sticky Add to Cart should help customers:

- purchase without scrolling back
- confirm the selected product
- verify the selected variant
- recognize availability
- complete purchases faster

---

## Merchant Goals

The Sticky Add to Cart should help merchants:

- reduce purchase friction
- improve conversion
- shorten the buying journey
- maintain purchasing visibility
- support mobile commerce

Merchants should configure visibility—not interaction behavior.

---

## Structure

A Sticky Add to Cart consists of:

- Product Thumbnail — optional
- Product Title — required
- Selected Variant — optional
- Price — optional
- Quantity Selector — optional
- Primary Purchase Button — required

---

## Required Elements

Every Sticky Add to Cart requires:

- product identification
- primary purchase button
- current product state
- responsive layout
- accessible controls

Customers should immediately recognize which product they are purchasing.

---

## Optional Elements

The Sticky Add to Cart may include:

- product image
- selected color
- selected size
- quantity selector
- inventory message
- dynamic checkout button

Optional information should remain concise.

---

## Supported Variants

### Minimal

Displays:

- product title
- Add to Cart button

Recommended for luxury storefronts.

---

### Standard

Displays:

- thumbnail
- title
- price
- Add to Cart

Recommended for most storefronts.

---

### Commerce

Displays:

- thumbnail
- title
- selected variant
- quantity selector
- price
- Add to Cart

Suitable for stores with configurable products.

---

### Mobile Optimized

Displays only the most essential purchasing information.

Recommended for small screens.

---

## Component-Specific Rules

### Visibility Rules

The Sticky Add to Cart should appear only when:

- the primary purchase form has scrolled out of view
- purchasing is possible
- the product page remains active

The component should disappear when:

- the primary purchase form becomes visible again
- the customer reaches the footer (optional)
- purchasing is unavailable (merchant configurable)

The appearance should feel natural rather than sudden.

---

### Purchase Rules

The purchase button should:

- use the Buy Buttons specification
- remain immediately accessible
- reflect current availability
- update with variant changes

The Sticky Add to Cart should never display outdated purchasing information.

---

### Variant Integration

When variants change, the component should update:

- product title (if applicable)
- selected options
- price
- availability
- purchase button state

Updates should occur immediately without page refresh.

---

### Quantity Rules

If enabled:

- quantity should remain synchronized with the primary product form
- changes should update both interfaces
- invalid quantities should be prevented

Only one authoritative quantity should exist.

---

## Supported States

### Hidden

The component is not visible.

---

### Visible

The sticky bar is displayed while scrolling.

---

### Loading

Variant or purchase information is updating.

Layout dimensions should remain stable.

---

### Available

Purchasing is possible.

---

### Sold Out

Purchase actions adapt appropriately.

---

### Disabled

Purchasing is temporarily unavailable.

---

## Responsive Behaviour

The Sticky Add to Cart should:

- remain fixed to the viewport
- preserve safe-area spacing
- adapt gracefully across devices
- remain easy to reach with one hand
- avoid obscuring important content

Mobile layouts should prioritize the purchase button above all else.

---

## Accessibility

Every Sticky Add to Cart must support:

- semantic landmarks where appropriate
- keyboard navigation
- visible focus indicators
- accessible button labels
- sufficient contrast
- screen reader compatibility

Dynamic updates should be announced when necessary.

---

## Shopify Settings

Merchants may configure:

- enable sticky add to cart
- show product thumbnail
- show price
- show selected variant
- show quantity selector
- show inventory messaging
- mobile only
- desktop only

Merchants should not configure:

- positioning
- animation timing
- spacing
- typography
- transition behavior

These belong to the Design System.

---

## Design Tokens

The Sticky Add to Cart should use semantic tokens for:

- height
- spacing
- background
- borders
- shadows
- typography
- transitions

Example token categories:

- sticky-bar-height
- sticky-bar-background
- sticky-bar-border
- sticky-bar-shadow
- sticky-bar-spacing

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- slide-in
- slide-out
- opacity transition

Avoid:

- bouncing
- scaling
- elastic animations
- decorative effects

The component should appear calmly and predictably.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Sticky Add to Cart should:

- initialize only when needed
- avoid unnecessary scroll listeners
- throttle or observe scroll efficiently
- avoid layout shifts
- synchronize efficiently with Shopify product data

The component should have minimal impact on scrolling performance.

---

## AI Guidelines

When generating storefronts, AI should:

- enable Sticky Add to Cart on product pages where scrolling is substantial
- choose the appropriate variant based on product complexity
- preserve synchronization with the primary product form
- maintain accessibility
- reuse documented purchase components

AI should never duplicate purchasing logic or create conflicting product states.

---

## Quality Checklist

### Purpose

- Purchase action remains accessible while scrolling.
- Customers always know which product is selected.

### Design

- Purchase button receives highest emphasis.
- Layout remains clean and unobtrusive.
- Information hierarchy is consistent.

### Accessibility

- Keyboard navigation works.
- Focus indicators remain visible.
- Screen readers receive meaningful updates.

### Responsive

- Component remains easy to reach.
- Safe-area spacing is respected.
- Layout adapts correctly across devices.

### Performance

- No layout shifts occur.
- Scroll performance remains smooth.
- Product state stays synchronized.

### AI Compatibility

- Sticky behavior is deterministic.
- Product information remains synchronized.
- Existing purchase components are reused.

---

## Future Compatibility

Before extending the Sticky Add to Cart, ask:

- Does the feature reduce purchase friction?
- Can the existing variants support the requirement?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Sticky Add to Cart should evolve through refinement rather than expansion.

Every Sticky Add to Cart should provide immediate access to purchasing, remain synchronized with the product page, preserve accessibility and performance, and quietly support conversion without distracting from the product itself.
