# Accordion

## Purpose

The Accordion is a disclosure component that progressively reveals content while minimizing visual complexity.

It allows customers to access additional information only when needed, improving readability and reducing cognitive load.

The Accordion should make dense information feel approachable without hiding essential content.

---

## Responsibilities

The Accordion is responsible for:

- organizing expandable content
- reducing visual clutter
- improving content scanning
- revealing information progressively
- remaining accessible across all devices

The Accordion is not responsible for:

- acting as page navigation
- replacing tabs
- displaying unrelated content
- hiding essential information required for task completion

These responsibilities belong to other components.

---

## User Goals

The Accordion should help customers:

- locate information quickly
- expand only relevant content
- avoid information overload
- navigate long sections comfortably

---

## Merchant Goals

The Accordion should help merchants:

- organize large amounts of content
- improve readability
- reduce page length
- create cleaner layouts

Merchants should configure content—not interaction behavior.

---

## Structure

An Accordion consists of:

- Accordion Container — required
- One or More Accordion Items — required

Each Accordion Item consists of:

- Trigger Button — required
- Content Panel — required

Optional:

- Leading Icon
- Supporting Label
- Divider

---

## Required Elements

Every Accordion requires:

- at least one item
- accessible trigger
- expandable content panel
- proper heading hierarchy

Each item should communicate one clear topic.

---

## Optional Elements

The Accordion may include:

- icons
- supporting labels
- dividers
- grouped sections

Optional elements should improve clarity without increasing visual noise.

---

## Supported Variants

### Single Expand

Only one panel remains open at a time.

Recommended for FAQs.

---

### Multi Expand

Multiple panels may remain open simultaneously.

Recommended for documentation.

---

### Minimal

Uses typography and subtle dividers.

Recommended for luxury storefronts.

---

### Card

Each item appears inside an individual card.

Suitable for educational or support content.

---

## Component-Specific Rules

### Trigger Rules

Every trigger should:

- use a button element
- clearly describe the hidden content
- display expanded state
- remain keyboard accessible

Triggers should never contain ambiguous labels.

---

### Content Rules

Accordion content should:

- answer one topic
- remain concise
- support scanning
- preserve comfortable reading width

Content should avoid unnecessary nesting.

---

### Expansion Rules

Expanding an item should:

- reveal content smoothly
- preserve layout stability
- update accessibility attributes
- maintain logical reading order

Collapsed content should remain unavailable to assistive technologies until expanded.

---

### Icon Rules

If icons are displayed:

- they should communicate expansion state
- rotate subtly during expansion
- remain visually secondary

Icons should never replace accessible labels.

---

### Divider Rules

Dividers may separate accordion items.

They should:

- remain subtle
- reinforce grouping
- avoid excessive visual weight

---

## Supported States

### Collapsed

Only the trigger is visible.

---

### Expanded

Content is visible.

---

### Focus

The trigger receives visible keyboard focus.

---

### Disabled

The item cannot be expanded.

Its disabled state should be communicated visually and programmatically.

---

## Responsive Behaviour

The Accordion should:

- adapt gracefully across all devices
- preserve readable spacing
- maintain generous touch targets
- avoid horizontal scrolling

Triggers should remain comfortable to tap on mobile devices.

---

## Accessibility

Every Accordion must support:

- semantic button elements
- keyboard navigation
- visible focus indicators
- ARIA expanded states
- ARIA controls relationships
- sufficient contrast
- screen reader compatibility

Keyboard interaction should support:

- Enter
- Space
- Tab
- Shift + Tab

Expanded state should always be announced correctly.

---

## Shopify Settings

Merchants may configure:

- accordion items
- title
- content
- icon visibility
- default expanded item
- allow multiple expanded items
- color scheme

Merchants should not configure:

- spacing
- typography
- transition timing
- interaction behavior

These belong to the Design System.

---

## Design Tokens

The Accordion should use semantic tokens for:

- spacing
- typography
- borders
- divider colors
- icon size
- transitions

Example token categories:

- accordion-spacing
- accordion-heading
- accordion-border
- accordion-divider
- accordion-icon
- accordion-transition

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- height transition
- fade transition
- subtle icon rotation

Avoid:

- bouncing
- scaling
- decorative animations

Motion should reinforce interaction rather than attract attention.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Accordion should:

- minimize JavaScript
- avoid layout shifts
- progressively enhance disclosure behavior
- render efficiently
- remain lightweight regardless of item count

The component should function correctly without unnecessary scripting.

---

## AI Guidelines

When generating storefronts, AI should:

- organize related information together
- avoid excessive nesting
- maintain accessibility
- choose the appropriate expansion mode
- reuse existing disclosure patterns

AI should never hide essential purchasing information inside an accordion unless appropriate for the page.

---

## Quality Checklist

### Purpose

- Content is easy to discover.
- Information overload is reduced.

### Design

- Triggers are immediately recognizable.
- Content hierarchy remains clear.
- Dividers remain subtle.

### Accessibility

- Keyboard navigation functions correctly.
- Screen readers announce expanded states.
- Focus indicators remain visible.

### Responsive

- Layout adapts across devices.
- Touch targets remain comfortable.
- No horizontal scrolling occurs.

### Performance

- Expansion feels immediate.
- Layout remains stable.
- Animations remain lightweight.

### AI Compatibility

- Component structure is deterministic.
- Existing patterns are reused.
- Merchant content remains accurate.

---

## Future Compatibility

Before extending the Accordion, ask:

- Does the addition improve information organization?
- Can an existing accordion pattern satisfy the requirement?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Accordion should evolve through refinement rather than expansion.

Every Accordion should organize information clearly, preserve accessibility and performance, and reinforce the calm, timeless design philosophy that defines Calinium.
