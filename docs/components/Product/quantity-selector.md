# Quantity Selector

## Purpose

The Quantity Selector allows customers to specify how many units of a product they wish to purchase before adding it to the cart.

It should make adjusting quantities fast, accurate, and effortless while preventing invalid values.

The Quantity Selector should reduce purchase friction—not introduce complexity.

---

## Responsibilities

The Quantity Selector is responsible for:

- displaying the current quantity
- increasing quantity
- decreasing quantity
- preventing invalid values
- supporting keyboard input
- synchronizing with Shopify cart logic
- remaining accessible across all devices

The Quantity Selector is not responsible for:

- validating inventory availability
- calculating pricing
- updating shipping costs
- applying discounts
- managing checkout

These responsibilities belong to Shopify's commerce engine.

---

## User Goals

The Quantity Selector should help customers:

- adjust quantities confidently
- understand the selected quantity
- avoid accidental purchases
- complete purchases efficiently

---

## Merchant Goals

The Quantity Selector should help merchants:

- reduce quantity selection errors
- improve purchasing efficiency
- maintain a familiar shopping experience
- support bulk purchases when appropriate

Merchants should configure purchasing rules—not interaction behavior.

---

## Structure

A Quantity Selector consists of:

- Decrease Button — required
- Quantity Input — required
- Increase Button — required

Optional:

- Maximum quantity message
- Inventory message
- Loading indicator

---

## Required Elements

Every Quantity Selector requires:

- decrease control
- numeric input
- increase control
- accessible labels
- minimum quantity
- current quantity

The current quantity should always remain visible.

---

## Optional Elements

The Quantity Selector may include:

- low inventory indicator
- maximum quantity notice
- purchase limit message
- loading state
- inline validation

Optional messaging should improve understanding without interrupting purchasing.

---

## Supported Variants

### Stepper

Displays minus and plus buttons around the quantity.

Recommended for nearly all storefronts.

---

### Input Only

Displays only a numeric input.

Suitable for wholesale or bulk purchasing.

---

### Compact

Uses reduced spacing for dense layouts.

Recommended inside cart drawers and mini carts.

---

## Component-Specific Rules

### Quantity Rules

The default quantity should be:

```
1
```

Quantity should never become:

- zero
- negative
- non-numeric
- invalid

Values should remain synchronized with Shopify inventory rules.

---

### Increase Rules

Selecting the increase button should:

- increase quantity by one
- update immediately
- remain responsive
- respect maximum purchase limits

---

### Decrease Rules

Selecting the decrease button should:

- decrease quantity by one
- stop at the minimum quantity
- avoid invalid values

When the minimum quantity is reached, the decrease control should become unavailable rather than allowing invalid values.

---

### Input Rules

The quantity field should:

- accept only numeric values
- support keyboard entry
- validate immediately
- reject invalid characters
- preserve cursor position during updates

---

### Inventory Rules

When inventory limits apply:

- customers should receive clear feedback
- invalid quantities should not be accepted
- the interface should explain the limitation

Inventory messaging should remain secondary to the selector itself.

---

## Supported States

### Default

Current quantity is displayed.

---

### Focus

Keyboard users receive visible focus indicators.

---

### Hover

Desktop users receive subtle interaction feedback.

---

### Disabled

Increase or decrease controls become unavailable when appropriate.

---

### Loading

Quantity updates are processing.

Layout should remain stable.

---

### Error

Invalid values should produce clear, accessible feedback.

The selector should return to a valid quantity whenever possible.

---

## Responsive Behaviour

The Quantity Selector should:

- remain touch friendly
- preserve comfortable spacing
- avoid accidental taps
- remain usable with one hand

Touch targets should remain large enough for reliable interaction.

---

## Accessibility

Every Quantity Selector must support:

- semantic form controls
- keyboard navigation
- visible focus indicators
- accessible labels
- screen reader announcements
- sufficient contrast

Increase and decrease controls should expose meaningful accessible names.

Examples:

- Increase quantity
- Decrease quantity

---

## Shopify Settings

Merchants may configure:

- show quantity selector
- minimum quantity
- maximum quantity
- purchase increments
- inventory messaging

Merchants should not configure:

- spacing
- typography
- animation timing
- interaction behavior

These belong to the Design System.

---

## Design Tokens

The Quantity Selector should use semantic tokens for:

- spacing
- typography
- borders
- colors
- border radius
- transitions
- control size

Example token categories:

- quantity-spacing
- quantity-border
- quantity-radius
- quantity-control-size
- quantity-transition

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- opacity transition
- border transition
- color transition

Avoid:

- bouncing
- scaling
- decorative animations

Quantity updates should feel immediate.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Quantity Selector should:

- update efficiently
- avoid layout shifts
- minimize JavaScript
- synchronize with Shopify cart updates
- remain responsive under rapid interaction

---

## AI Guidelines

When generating storefronts, AI should:

- use the Stepper variant by default
- preserve Shopify purchasing rules
- maintain accessibility
- provide meaningful labels
- reuse documented interaction patterns

AI should never invent inventory limits or purchasing rules.

---

## Quality Checklist

### Purpose

- Quantity adjustment is intuitive.
- Current quantity is always visible.

### Design

- Controls are balanced.
- Layout follows the Design System.

### Accessibility

- Keyboard navigation works.
- Accessible labels are present.
- Focus indicators remain visible.

### Responsive

- Touch targets remain accessible.
- Controls adapt correctly.
- Interaction remains comfortable.

### Performance

- Updates occur immediately.
- No layout shifts occur.
- Shopify data remains synchronized.

### AI Compatibility

- Stepper behavior is deterministic.
- Existing interaction patterns are reused.
- Purchasing rules come directly from Shopify.

---

## Future Compatibility

Before extending the Quantity Selector, ask:

- Does the feature improve quantity selection?
- Can the existing selector support it?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Quantity Selector should evolve through refinement rather than expansion.

Every Quantity Selector should help customers adjust quantities quickly, accurately, and confidently while preserving accessibility, consistency, and the calm shopping experience that defines Calinium.
