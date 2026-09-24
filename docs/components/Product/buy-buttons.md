# Buy Buttons

## Purpose

The Buy Buttons component provides customers with the primary actions required to purchase a product.

It represents the final step between product evaluation and entering the purchase flow.

Buy Buttons should inspire confidence, communicate availability clearly, and minimize purchase friction.

The primary purchase action should always be the most prominent interactive element on the product page.

---

## Responsibilities

The Buy Buttons component is responsible for:

- initiating the purchase flow
- adding products to the cart
- supporting accelerated checkout
- communicating product availability
- responding to variant selection
- remaining accessible across all devices

The Buy Buttons component is not responsible for:

- selecting product variants
- displaying pricing
- validating inventory
- calculating shipping
- handling checkout logic

These responsibilities belong to Shopify's commerce engine and related components.

---

## User Goals

The Buy Buttons component should help customers:

- purchase products confidently
- understand available purchase actions
- recognize unavailable products
- complete purchases with minimal effort

---

## Merchant Goals

The Buy Buttons component should help merchants:

- maximize conversion
- reduce purchase friction
- support accelerated checkout
- communicate product availability clearly
- maintain a premium purchasing experience

Merchants should configure purchasing options—not interaction behavior.

---

## Structure

A Buy Buttons component consists of:

- Primary Purchase Button — required

Optional:

- Dynamic Checkout Button
- Availability Message
- Inventory Message
- Back-in-Stock Action
- Payment Information

---

## Required Elements

Every Buy Buttons component requires:

- primary purchase action
- accessible button label
- product availability state
- responsive layout
- loading state

The primary purchase action should always receive the greatest visual emphasis.

---

## Optional Elements

The Buy Buttons component may include:

- Buy Now button
- Shop Pay
- Apple Pay
- Google Pay
- PayPal
- Express checkout
- Back-in-stock notification
- Payment messaging

Optional actions should remain visually secondary to the primary purchase button.

---

## Supported Variants

### Standard

Displays only the Add to Cart button.

Recommended for most storefronts.

---

### Accelerated Checkout

Displays:

- Add to Cart
- Dynamic Checkout Button

Suitable for stores using Shopify accelerated checkout.

---

### Minimal

Displays only the primary purchase action.

Recommended for luxury and editorial storefronts.

---

### Unavailable

Displays an unavailable purchase state.

Examples:

- Sold Out
- Unavailable
- Coming Soon

Purchase actions should adapt accordingly.

---

## Component-Specific Rules

### Primary Purchase Button Rules

The primary button should:

- remain immediately visible
- span the available width when appropriate
- use the Button component's primary variant
- communicate product availability clearly

Recommended label:

```
Add to Cart
```

The primary purchase button should never compete with secondary actions.

---

### Dynamic Checkout Rules

If enabled:

- dynamic checkout should appear below the primary button
- supported payment methods should be displayed automatically by Shopify
- the button should remain visually secondary

Dynamic Checkout should only appear when supported.

---

### Availability Rules

The purchase interface should respond automatically to product availability.

Available:

```
Add to Cart
```

Sold Out:

```
Sold Out
```

Unavailable:

```
Unavailable
```

Preorder:

```
Pre-Order
```

Backorder:

```
Backorder
```

Customers should immediately understand whether purchasing is possible.

---

### Variant Integration

The Buy Buttons component should update automatically when the selected variant changes.

Updates may include:

- purchase availability
- inventory messaging
- dynamic checkout visibility
- button state

The interface should never require a page refresh.

---

### Inventory Messaging

Inventory messaging should remain concise.

Examples:

- Only 3 Left
- In Stock
- Out of Stock

Inventory messaging should remain secondary to the purchase action.

---

## Supported States

### Available

The product can be purchased.

---

### Loading

Purchase request is processing.

Repeated submissions should be prevented.

---

### Added

Product has been successfully added to the cart.

Confirmation should remain subtle.

---

### Sold Out

Purchase is unavailable.

Alternative actions may be presented.

---

### Disabled

Purchase is temporarily unavailable.

The reason should be understandable.

---

### Error

The purchase request failed.

Clear, accessible feedback should be provided.

---

## Responsive Behaviour

The Buy Buttons component should:

- remain easy to reach
- preserve comfortable touch targets
- adapt gracefully across screen sizes
- avoid layout shifts
- maintain consistent spacing

Purchase actions should remain highly visible on mobile devices.

---

## Accessibility

Every Buy Buttons component must support:

- semantic buttons
- keyboard navigation
- visible focus indicators
- accessible labels
- loading announcements
- error announcements
- sufficient contrast

Dynamic updates should be communicated appropriately to assistive technologies.

---

## Shopify Settings

Merchants may configure:

- enable dynamic checkout
- show inventory messaging
- show payment information
- show back-in-stock option
- button width
- sticky add-to-cart integration

Merchants should not configure:

- typography
- spacing
- animation timing
- loading behavior

These belong to the Design System.

---

## Design Tokens

The Buy Buttons component should use semantic tokens for:

- spacing
- typography
- colors
- borders
- border radius
- transitions
- button spacing

Example token categories:

- buy-button-spacing
- buy-button-radius
- buy-button-primary
- buy-button-secondary
- buy-button-transition

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- opacity transition
- loading indicator
- color transition

Avoid:

- bouncing
- scaling
- decorative animations
- delayed purchase feedback

Purchase interactions should feel immediate.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Buy Buttons component should:

- minimize JavaScript
- avoid layout shifts
- synchronize with Shopify product data
- reuse shared button components
- remain responsive during checkout initiation

Purchase actions should remain reliable under all conditions.

---

## AI Guidelines

When generating storefronts, AI should:

- prioritize the primary purchase button
- enable accelerated checkout when appropriate
- preserve Shopify purchasing behavior
- maintain accessibility
- reuse documented button components

AI should never invent purchasing methods or modify Shopify checkout behavior.

---

## Quality Checklist

### Purpose

- Primary purchase action is obvious.
- Purchase flow is easy to understand.

### Design

- Primary button receives greatest emphasis.
- Secondary actions remain visually subordinate.
- Layout follows the Design System.

### Accessibility

- Keyboard navigation works.
- Loading and errors are announced.
- Focus indicators remain visible.

### Responsive

- Purchase actions remain easy to reach.
- Touch targets are accessible.
- Layout adapts correctly.

### Performance

- No layout shifts occur.
- Purchase actions respond immediately.
- Shopify data remains synchronized.

### AI Compatibility

- Purchase flow is deterministic.
- Shopify checkout behavior is preserved.
- Existing button patterns are reused.

---

## Future Compatibility

Before extending the Buy Buttons component, ask:

- Does the feature improve the purchasing experience?
- Can Shopify already provide this functionality?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Buy Buttons component should evolve through refinement rather than expansion.

Every Buy Buttons component should guide customers confidently from product selection to purchase while preserving clarity, accessibility, performance, and the calm premium experience that defines Calinium.
