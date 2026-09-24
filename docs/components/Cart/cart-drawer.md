# Cart Drawer

## Purpose

The Cart Drawer provides customers with immediate access to their shopping cart without interrupting their browsing experience.

It allows customers to review, update, and purchase products while remaining on the current page.

The Cart Drawer should feel fast, lightweight, and unobtrusive.

---

## Responsibilities

The Cart Drawer is responsible for:

- displaying cart contents
- updating product quantities
- removing products
- displaying pricing
- communicating cart totals
- initiating checkout
- remaining accessible across all devices

The Cart Drawer is not responsible for:

- editing product variants
- displaying full product details
- calculating shipping rates
- applying discount logic
- replacing the dedicated cart page

These responsibilities belong to Shopify and related components.

---

## User Goals

The Cart Drawer should help customers:

- review selected products
- adjust quantities
- remove unwanted items
- understand cart totals
- continue shopping
- begin checkout quickly

---

## Merchant Goals

The Cart Drawer should help merchants:

- reduce purchase friction
- improve checkout initiation
- increase average order value
- encourage additional purchases
- maintain a premium shopping experience

Merchants should configure available features—not interaction behavior.

---

## Structure

A Cart Drawer consists of:

- Drawer Header — required
- Cart Items — required
- Cart Summary — required
- Checkout Button — required

Optional:

- Continue Shopping Button
- Free Shipping Progress
- Cart Note
- Discount Summary
- Trust Badges
- Recommended Products
- Promotional Message

---

## Required Elements

Every Cart Drawer requires:

- close button
- cart item list
- quantity controls
- remove controls
- subtotal
- checkout button
- accessible structure

Customers should immediately understand the current contents of their cart.

---

## Optional Elements

The Cart Drawer may include:

- product thumbnails
- selected variants
- inventory messaging
- shipping messaging
- free shipping progress
- recommendations
- trust messaging
- payment icons
- cart notes

Optional information should remain secondary to checkout.

---

## Supported Variants

### Minimal

Displays:

- cart items
- subtotal
- checkout button

Recommended for luxury storefronts.

---

### Standard

Displays:

- cart items
- quantity controls
- subtotal
- continue shopping
- checkout

Recommended for most storefronts.

---

### Commerce

Displays:

- cart items
- recommendations
- free shipping progress
- promotional messaging
- trust information
- checkout

Suitable for feature-rich commerce experiences.

---

## Component-Specific Rules

### Drawer Rules

The Cart Drawer should:

- slide in from the viewport edge
- overlay page content
- prevent background interaction
- trap keyboard focus
- close predictably

Opening the drawer should never cause a page reload.

---

### Cart Item Rules

Each cart item should display:

- product image
- product title
- selected variant
- quantity selector
- item price
- remove action

Cart items should reuse the documented Product Card patterns where appropriate.

---

### Quantity Rules

Quantity controls should follow the Quantity Selector specification.

Updating quantity should:

- update immediately
- synchronize with Shopify
- refresh totals automatically
- preserve drawer position

Customers should never lose context while updating quantities.

---

### Remove Rules

Removing an item should:

- update immediately
- refresh totals automatically
- provide accessible feedback
- preserve remaining cart items

Removal should not require confirmation under normal circumstances.

---

### Summary Rules

The summary should include:

- subtotal
- checkout button

Optional:

- taxes notice
- shipping notice
- discounts
- estimated total

Subtotal should receive greater emphasis than supporting information.

---

### Checkout Rules

The Checkout button should:

- remain visually dominant
- remain immediately accessible
- use the Button component's primary variant
- initiate Shopify Checkout

The checkout action should always be the primary focus of the drawer.

---

### Recommended Products

If recommendations are displayed:

- they should appear below the cart summary
- remain visually secondary
- use Product Card patterns
- never distract from checkout

Recommendations should encourage additional purchases without interrupting the purchasing flow.

---

### Empty Cart Rules

When the cart is empty, the drawer should display:

- empty cart message
- continue shopping action

Optional:

- featured collection
- recommended products

The empty state should remain encouraging and informative.

---

## Supported States

### Closed

The drawer is hidden.

---

### Open

Cart contents are visible.

---

### Loading

Cart updates are processing.

Layout dimensions should remain stable.

---

### Empty

No products exist in the cart.

Helpful guidance should be displayed.

---

### Updating

Quantities or cart contents are synchronizing.

Customers should understand that updates are in progress.

---

### Error

Clear, accessible messaging should explain what happened.

Customers should be able to retry without losing progress.

---

## Responsive Behaviour

The Cart Drawer should:

- remain fixed to the viewport
- adapt width responsively
- preserve comfortable touch targets
- support one-handed interaction on mobile
- respect safe-area insets

The checkout button should remain easy to reach on all devices.

---

## Accessibility

Every Cart Drawer must support:

- semantic dialog structure
- keyboard navigation
- focus trapping
- Escape key to close
- visible focus indicators
- accessible labels
- screen reader compatibility
- sufficient contrast

Focus should return to the triggering element after the drawer closes.

---

## Shopify Settings

Merchants may configure:

- enable cart drawer
- show product thumbnails
- show variant information
- show cart notes
- show free shipping progress
- show recommendations
- show trust badges
- show payment icons

Merchants should not configure:

- animation timing
- spacing
- typography
- drawer behavior

These belong to the Design System.

---

## Design Tokens

The Cart Drawer should use semantic tokens for:

- width
- spacing
- typography
- borders
- shadows
- overlay colors
- transitions

Example token categories:

- cart-drawer-width
- cart-drawer-spacing
- cart-drawer-background
- cart-drawer-overlay
- cart-drawer-transition

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- drawer slide
- fade transition
- opacity transition
- loading indicator

Avoid:

- bouncing
- scaling
- elastic animations
- decorative effects

Motion should reinforce orientation rather than attract attention.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Cart Drawer should:

- initialize only when needed
- minimize JavaScript
- avoid layout shifts
- synchronize efficiently with Shopify cart data
- lazy-load optional recommendations

Opening the drawer should feel immediate.

---

## AI Guidelines

When generating storefronts, AI should:

- use the Standard variant by default
- preserve Shopify cart behavior
- reuse documented purchase components
- maintain accessibility
- prioritize checkout over promotional content

AI should never invent cart totals, pricing, or product information.

---

## Quality Checklist

### Purpose

- Cart contents are easy to review.
- Checkout is immediately accessible.

### Design

- Checkout receives greatest emphasis.
- Information hierarchy is clear.
- Drawer remains visually calm.

### Accessibility

- Focus trapping works correctly.
- Keyboard navigation functions properly.
- Focus indicators remain visible.

### Responsive

- Drawer adapts across devices.
- Touch interaction remains comfortable.
- Safe-area spacing is respected.

### Performance

- Cart updates occur immediately.
- No layout shifts occur.
- Shopify cart state remains synchronized.

### AI Compatibility

- Cart behavior is deterministic.
- Shopify data is preserved.
- Existing components are reused.

---

## Future Compatibility

Before extending the Cart Drawer, ask:

- Does the feature reduce purchase friction?
- Can an existing component provide the functionality?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Cart Drawer should evolve through refinement rather than expansion.

Every Cart Drawer should provide a fast, intuitive, and trustworthy purchasing experience while preserving accessibility, performance, and the calm premium design philosophy that defines Calinium.
