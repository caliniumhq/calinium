# Tooltip

## Purpose

The Tooltip provides brief contextual information about an interface element without interrupting the user's workflow.

It supplements existing controls by explaining functionality, terminology, or status when additional clarification is helpful.

A Tooltip should enhance understanding—not replace clear interface design.

---

## Responsibilities

The Tooltip is responsible for:

- providing contextual guidance
- explaining icons or controls
- clarifying unfamiliar terminology
- displaying short helper information
- remaining accessible across all devices

The Tooltip is not responsible for:

- displaying critical information
- replacing visible labels
- presenting long-form content
- requesting user decisions
- replacing onboarding

These responsibilities belong to other components.

---

## User Goals

The Tooltip should help customers:

- understand interface elements
- reduce uncertainty
- learn unfamiliar terminology
- complete tasks confidently

---

## Merchant Goals

The Tooltip should help merchants:

- improve usability
- reduce customer confusion
- simplify complex interfaces
- support self-guided exploration

Merchants should configure content—not interaction behavior.

---

## Structure

A Tooltip consists of:

- Trigger Element — required
- Tooltip Container — required
- Tooltip Message — required

Optional:

- Directional Arrow
- Status Icon

---

## Required Elements

Every Tooltip requires:

- a triggering element
- concise helper text
- accessible relationship with the trigger
- automatic positioning

Tooltips should describe one concept only.

---

## Optional Elements

The Tooltip may include:

- directional arrow
- contextual icon
- status indicator

Optional elements should remain subtle.

---

## Supported Variants

### Informational

Provides short contextual guidance.

Recommended for most interfaces.

---

### Helper

Explains how to use a control.

Recommended for advanced settings.

---

### Status

Explains the meaning of a visual indicator.

Recommended for badges, icons, and system states.

---

### Disabled Control

Explains why a control is unavailable.

Recommended only when users can reasonably expect the control to be interactive.

---

## Component-Specific Rules

### Trigger Rules

Tooltips may appear on:

- hover
- keyboard focus
- touch interaction where appropriate

They should never appear automatically without user interaction.

---

### Content Rules

Tooltip content should:

- remain concise
- explain one concept
- avoid technical language
- complement visible interface text

Content should generally fit within one or two short sentences.

---

### Placement Rules

The Tooltip should automatically position itself to remain visible.

Preferred placement order:

- top
- bottom
- right
- left

Placement should adapt to available viewport space.

---

### Visibility Rules

The Tooltip should:

- appear immediately after user intent
- disappear when interaction ends
- remain visible while hovered or focused
- never obstruct essential interface elements

Tooltips should not require explicit dismissal.

---

### Arrow Rules

If displayed, the arrow should:

- indicate the triggering element
- remain visually subtle
- adapt to placement automatically

The arrow should never interfere with readability.

---

## Supported States

### Hidden

The Tooltip is not visible.

---

### Visible

The Tooltip is displayed.

---

### Focused

The trigger receives keyboard focus.

The Tooltip becomes visible.

---

### Disabled

The Tooltip cannot be displayed because its trigger is unavailable.

---

## Responsive Behaviour

The Tooltip should:

- adapt across all devices
- remain readable
- avoid clipping
- reposition automatically
- preserve touch usability

On touch devices, helper information may appear through tap interactions.

---

## Accessibility

Every Tooltip must support:

- semantic tooltip role
- keyboard accessibility
- visible focus indicators
- accessible trigger relationship
- screen reader compatibility
- sufficient contrast

Tooltips should:

- appear on keyboard focus
- disappear on blur
- avoid trapping focus

The Tooltip itself should not receive keyboard focus.

---

## Shopify Settings

Merchants may configure:

- tooltip text
- icon visibility
- color scheme

Merchants should not configure:

- placement logic
- display timing
- accessibility behavior
- animation timing

These belong to the Design System.

---

## Design Tokens

The Tooltip should use semantic tokens for:

- spacing
- typography
- border radius
- background
- shadow
- colors
- transitions

Example token categories:

- tooltip-spacing
- tooltip-background
- tooltip-shadow
- tooltip-radius
- tooltip-text
- tooltip-transition

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- fade
- subtle opacity transition
- minimal vertical offset

Avoid:

- bouncing
- scaling
- rotation
- decorative animations

Motion should communicate appearance without distracting from the interface.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Tooltip should:

- render efficiently
- minimize JavaScript
- avoid layout shifts
- reuse shared positioning logic
- appear with minimal latency

Tooltip interactions should feel immediate.

---

## AI Guidelines

When generating storefronts, AI should:

- use Tooltips sparingly
- provide concise explanations
- avoid duplicating visible labels
- preserve accessibility
- reuse existing Tooltip patterns

AI should never place critical instructions or purchasing information inside a Tooltip.

---

## Quality Checklist

### Purpose

- The Tooltip improves understanding.
- Information is concise.

### Design

- Placement feels natural.
- Typography remains readable.
- Visual hierarchy is subtle.

### Accessibility

- Keyboard users can access the Tooltip.
- Screen readers receive appropriate relationships.
- Focus remains predictable.

### Responsive

- Placement adapts across devices.
- No clipping occurs.
- Touch interactions remain usable.

### Performance

- Tooltips appear immediately.
- Layout remains stable.
- Animations remain lightweight.

### AI Compatibility

- Component behavior is deterministic.
- Existing interaction patterns are reused.
- Merchant content remains accurate.

---

## Future Compatibility

Before extending the Tooltip, ask:

- Does the information require contextual assistance?
- Can the interface be made self-explanatory instead?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Tooltip should evolve through refinement rather than expansion.

Every Tooltip should provide subtle, contextual guidance while preserving accessibility, performance, and the calm, timeless design philosophy that defines Calinium.
