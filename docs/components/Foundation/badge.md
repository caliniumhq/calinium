# Badge

## Purpose

The Badge component communicates a short status, category, attribute, promotion, or supporting piece of information.

Badges help customers quickly recognize important information without interrupting the shopping experience.

A badge should communicate meaning—not decoration.

---

## Responsibilities

The Badge component is responsible for:

- displaying concise semantic information
- reinforcing product and interface status
- supporting visual scanning
- maintaining consistent semantic meaning
- remaining accessible across all color schemes
- adapting safely across responsive layouts

The Badge component is not responsible for:

- replacing descriptive text
- communicating complex messages
- acting as a call to action
- controlling business logic
- calculating promotions or inventory

---

## User Goals

The Badge component should help customers:

- recognize product status immediately
- identify promotions
- understand availability
- distinguish featured or new products
- scan products efficiently

---

## Merchant Goals

The Badge component should help merchants:

- highlight meaningful product attributes
- communicate promotions consistently
- reinforce merchandising strategy
- preserve accessibility automatically
- avoid manual styling

Merchants should choose semantic badge types rather than creating custom styles.

---

## Structure

A badge consists of:

- Label — required
- Optional icon
- Semantic style

---

## Required Elements

Every badge requires:

- concise label
- semantic meaning
- accessible contrast
- consistent spacing
- appropriate variant

Badge text should remain short.

Preferred examples:

- New
- Sale
- Sold Out
- Limited
- Best Seller
- Organic

Avoid long sentences.

---

## Optional Elements

A badge may include:

- leading icon
- numeric value

Optional elements should improve clarity.

---

## Supported Variants

### Default

General informational badge.

### New

Highlights recently introduced products.

### Sale

Communicates promotional pricing.

### Sold Out

Indicates unavailable inventory.

### Limited

Indicates limited availability.

### Best Seller

Highlights popular products.

### Custom Attribute

Communicates merchant-defined product attributes.

Examples:

- Handmade
- Vegan
- Organic
- Exclusive

---

## Component-Specific Rules

Badge communicates a compact category, attribute, promotion, or product label. It may use an icon only to support its concise label and must not represent a changing operational state; Status Indicator owns live current-state communication and Alert or Inline Message owns explanatory feedback.

## Supported States

- Default
- Hover (optional)
- Focus (if interactive)
- Disabled (rare)

Badges should remain visually stable across all states.

---

## Responsive Behaviour

Badges should:

- preserve readability
- avoid wrapping whenever possible
- remain aligned with related content
- adapt safely across viewport sizes

Badges should never overlap important content.

---

## Accessibility

Every badge must support:

- sufficient contrast
- readable typography
- semantic meaning
- color-independent communication

Meaning must never rely solely on color.

---

## Shopify Settings

Merchants may configure:

- label
- variant
- optional icon
- visibility

Merchants should not configure colors, spacing, borders, or typography individually.

---

## Design Tokens

The Badge component should use semantic tokens for:

- typography
- foreground color
- background color
- border color
- spacing
- border radius
- icon size

No hardcoded values should define badge appearance.

---

## Motion Rules

Badge motion should remain minimal.

Allowed motion:

- subtle opacity transition
- subtle color transition

Avoid:

- bouncing
- scaling
- pulsing
- decorative animation

---

## Performance Rules

The Badge component should:

- require minimal markup
- reuse design tokens
- avoid JavaScript
- avoid layout shifts

Badges should render efficiently.

---

## AI Guidelines

When generating storefronts, AI should:

- use badges only when meaningful
- preserve semantic variants
- avoid excessive badge usage
- prioritize commerce clarity
- maintain accessibility
- reuse documented variants

AI should not invent new badge styles.

---

## Quality Checklist

### Purpose

- Badge communicates one clear meaning.
- Label is concise.

### Design

- Semantic variant is correct.
- Consistent spacing is preserved.

### Accessibility

- Contrast requirements are satisfied.
- Meaning does not rely only on color.

### Responsive

- Badge remains readable.
- Badge does not overlap content.

### Performance

- No unnecessary JavaScript.
- No layout shifts.

### AI Compatibility

- Variant is documented.
- Semantic meaning is preserved.

---

## Future Compatibility

Before introducing a new badge variant, ask:

- Does an existing variant already communicate this meaning?
- Can the information be conveyed more clearly elsewhere?
- Does the badge improve product understanding?
- Will merchants understand when to use it?
- Can AI select it deterministically?

If an existing variant satisfies the requirement, reuse it.

The Badge component should evolve through refinement rather than expansion.

Every badge should communicate meaningful information quickly, consistently, accessibly, and without distracting from the merchant's products.
