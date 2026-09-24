# Divider

## Purpose

The Divider component creates visual separation between related pieces of content without introducing unnecessary visual weight.

A divider helps organize information, improve readability, and establish rhythm throughout the interface.

A divider should support content hierarchy—not become a decorative element.

---

## Responsibilities

The Divider component is responsible for:

- separating groups of related content
- improving visual organization
- creating consistent spacing rhythm
- reinforcing page hierarchy
- adapting across responsive layouts
- supporting accessible document structure

The Divider component is not responsible for:

- acting as decoration
- replacing whitespace
- creating emphasis
- communicating status
- serving as a border around components

---

## User Goals

The Divider component should help customers:

- distinguish related sections
- scan long pages comfortably
- understand content grouping
- navigate interfaces with less cognitive effort

---

## Merchant Goals

The Divider component should help merchants:

- organize page layouts consistently
- maintain visual rhythm
- improve readability
- avoid manually styled separator lines

Merchants should decide when separation is needed—not how it is drawn.

---

## Structure

A divider consists of:

- Divider line — required

Optional:

- Label
- Decorative spacing

---

## Required Elements

Every divider requires:

- semantic separation
- consistent thickness
- consistent spacing
- sufficient contrast

A divider should remain visually subtle.

---

## Optional Elements

A divider may include:

- centered label
- section title
- decorative spacing

Examples:

- OR
- Featured Products
- Continue Shopping

Labels should remain concise.

---

## Supported Variants

### Standard

The default horizontal divider used throughout the storefront.

---

### Strong

Used to separate major page sections.

Should be used sparingly.

---

### Subtle

Used inside cards, drawers, menus, or compact layouts.

---

### Vertical

Separates adjacent interface elements.

Examples:

- Navigation links
- Toolbar actions
- Product metadata

Vertical dividers should never dominate surrounding content.

---

### Labeled

Displays a short centered label within the divider.

Examples:

- OR
- Recommended
- Continue

---

## Component-Specific Rules

This component must apply only its documented variants and retain its single responsibility within the Calinium Design System. It must not absorb responsibilities owned by a related component or introduce merchant-controlled implementation behavior.

## Supported States

Dividers are static components.

No interaction states are required.

---

## Responsive Behaviour

Dividers should:

- scale naturally with container width
- preserve spacing rhythm
- avoid excessive margins on small screens
- remain visually balanced across breakpoints

Vertical dividers may disappear on stacked mobile layouts.

---

## Accessibility

Dividers should:

- avoid interfering with reading order
- use semantic markup where appropriate
- never communicate meaning through color alone

Decorative dividers should be ignored by assistive technologies.

---

## Shopify Settings

Merchants may configure:

- show divider
- variant
- optional label

Merchants should not configure:

- thickness
- colors
- spacing
- border styles
- opacity

These values belong to the Design System.

---

## Design Tokens

The Divider component should use semantic tokens for:

- thickness
- color
- spacing
- label spacing

Example token categories:

- divider-color
- divider-thickness
- divider-spacing
- divider-label-spacing

No hardcoded values should define divider appearance.

---

## Motion Rules

Dividers should not animate.

If revealed dynamically, only subtle opacity transitions are acceptable.

Avoid:

- scaling
- sliding
- pulsing
- decorative animations

---

## Performance Rules

The Divider component should:

- require minimal markup
- avoid JavaScript
- reuse design tokens
- render efficiently
- avoid layout shifts

---

## AI Guidelines

When generating storefronts, AI should:

- insert dividers only when they improve content organization
- prefer whitespace before introducing a divider
- maintain consistent spacing rhythm
- reuse documented variants
- avoid excessive separators

AI should never use dividers as decoration.

---

## Quality Checklist

### Purpose

- Divider separates related content.
- Divider improves readability.

### Design

- Correct semantic variant is used.
- Divider remains visually subtle.
- Spacing is consistent.

### Accessibility

- Divider does not interfere with reading order.
- Decorative dividers are hidden from assistive technology.

### Responsive

- Divider scales correctly.
- Vertical dividers adapt on mobile layouts.

### Performance

- No unnecessary markup.
- No JavaScript dependency.

### AI Compatibility

- Variant is documented.
- Divider placement is deterministic.
- Divider improves hierarchy rather than decoration.

---

## Future Compatibility

Before introducing a new divider variant, ask:

- Can whitespace solve the problem instead?
- Does the divider improve hierarchy?
- Is an existing variant sufficient?
- Will merchants understand when to use it?
- Can AI place it consistently?

If an existing variant satisfies the requirement, reuse it.

The Divider component should evolve through refinement rather than expansion.

Every divider should quietly organize content, reinforce hierarchy, and improve readability without drawing attention to itself.
