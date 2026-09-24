# Variant Picker

## Purpose

The Variant Picker enables customers to select the desired version of a product before purchasing.

It communicates available product options clearly while preventing invalid selections and reducing purchase friction.

The Variant Picker should make choosing a product effortless—not confusing.

---

## Responsibilities

The Variant Picker is responsible for:

- displaying available product options
- communicating availability
- updating the selected variant
- synchronizing product information
- supporting accessibility
- adapting across all devices

The Variant Picker is not responsible for:

- displaying product descriptions
- calculating pricing
- managing inventory
- handling checkout
- displaying recommendations

These responsibilities belong to other components or Shopify.

---

## User Goals

The Variant Picker should help customers:

- understand available options
- select the desired variant confidently
- recognize unavailable options
- avoid invalid selections
- complete purchases efficiently

---

## Merchant Goals

The Variant Picker should help merchants:

- present variants clearly
- reduce customer confusion
- improve conversion
- support products with multiple options
- maintain consistent product experiences

Merchants should configure variant options—not interaction behavior.

---

## Structure

A Variant Picker consists of:

- Option Label — required
- Option Values — required

Optional:

- Color Swatches
- Image Swatches
- Dropdown
- Size Guide
- Availability Indicator
- Low Stock Message

---

## Required Elements

Every Variant Picker requires:

- option name
- selectable values
- current selection
- availability state
- accessible controls

Selections should update immediately.

---

## Optional Elements

The Variant Picker may include:

- color swatches
- image swatches
- dropdown selectors
- size guide
- stock messaging
- back-in-stock messaging

Optional elements should improve product understanding.

---

## Supported Variants

### Buttons

Displays each option as a selectable button.

Recommended for:

- Size
- Material
- Style

---

### Color Swatches

Displays colors visually.

Recommended for color variants.

Each swatch should include an accessible text label.

---

### Image Swatches

Displays small product images representing each option.

Suitable for visual products.

---

### Dropdown

Displays options inside a native select element.

Recommended when many values exist.

---

### Mixed

Allows different option types within the same product.

Example:

- Color → Swatches
- Size → Buttons

---

## Component-Specific Rules

### Option Rules

Option labels should remain concise.

Examples:

- Color
- Size
- Material
- Finish

Avoid ambiguous labels.

---

### Selection Rules

Selecting a variant should update:

- product image
- price
- SKU
- availability
- media
- URL (where appropriate)
- Add to Cart state

Updates should occur immediately without unnecessary page reloads.

---

### Availability Rules

Unavailable options should remain visible whenever possible.

Unavailable values should:

- communicate their state clearly
- remain distinguishable
- avoid misleading customers

Hidden variants should only be used when required by the merchant.

---

### Swatch Rules

Color swatches should:

- represent actual colors
- remain large enough for touch
- communicate selection visually
- expose accessible labels

Image swatches should:

- represent the corresponding variant
- remain visually consistent
- preserve image quality

Meaning should never rely solely on color.

---

### Dropdown Rules

Dropdowns should:

- use native controls where appropriate
- remain keyboard accessible
- support screen readers
- display the selected option clearly

---

### Size Guide Rules

If available:

- the size guide should remain easy to access
- opening it should not reset selections
- focus should return after closing

The size guide belongs to a dedicated component.

---

## Supported States

### Default

No interaction is occurring.

---

### Selected

The chosen option is clearly indicated.

---

### Hover

Desktop users receive subtle feedback.

---

### Focus

Keyboard users receive visible focus indicators.

---

### Disabled

Unavailable options remain distinguishable.

---

### Loading

Variant information is updating.

Layout should remain stable.

---

## Responsive Behaviour

The Variant Picker should:

- remain easy to tap
- wrap options gracefully
- preserve readable spacing
- support horizontal scrolling only when appropriate

Selections should remain obvious across all viewport sizes.

---

## Accessibility

Every Variant Picker must support:

- semantic form controls
- keyboard navigation
- visible focus indicators
- accessible labels
- screen reader compatibility
- sufficient contrast

Selection must never rely solely on color.

---

## Shopify Settings

Merchants may configure:

- picker type
- show color swatches
- show image swatches
- show unavailable variants
- show size guide
- low stock messaging

Merchants should not configure:

- spacing
- animation timing
- typography
- responsive behavior

These belong to the Design System.

---

## Design Tokens

The Variant Picker should use semantic tokens for:

- spacing
- typography
- border radius
- borders
- colors
- focus indicators
- transitions

Example token categories:

- variant-spacing
- variant-border
- variant-selected
- variant-radius
- variant-transition

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- color transition
- border transition
- opacity transition

Avoid:

- bouncing
- scaling
- decorative animations
- delayed selection feedback

Selections should feel immediate.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Variant Picker should:

- update efficiently
- avoid layout shifts
- minimize JavaScript
- reuse Shopify variant data
- preserve responsive performance

Variant changes should feel instantaneous.

---

## AI Guidelines

When generating storefronts, AI should:

- choose the appropriate picker type for each option
- prioritize swatches for colors
- prioritize buttons for small option sets
- use dropdowns for long lists
- preserve accessibility
- reuse documented picker patterns

AI should never invent variants or modify Shopify product data.

---

## Quality Checklist

### Purpose

- Options are easy to understand.
- Variant selection is intuitive.

### Design

- Correct picker type is used.
- Selection is clearly visible.
- Layout remains balanced.

### Accessibility

- Keyboard navigation works.
- Labels are meaningful.
- Selection does not rely solely on color.

### Responsive

- Touch targets remain accessible.
- Options wrap correctly.
- Layout adapts gracefully.

### Performance

- Variant updates are immediate.
- No layout shifts occur.
- Shopify data is reused efficiently.

### AI Compatibility

- Picker type is deterministic.
- Existing variants are reused.
- Product data comes directly from Shopify.

---

## Future Compatibility

Before extending the Variant Picker, ask:

- Does the new feature improve variant selection?
- Can an existing picker type support the requirement?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Variant Picker should evolve through refinement rather than expansion.

Every Variant Picker should help customers choose confidently, reduce purchase friction, preserve accessibility, and provide a fast, intuitive, and trustworthy product selection experience.
