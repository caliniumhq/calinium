# Icon Button

## Purpose

Icon Button provides one compact, recognizable action when a text Button would add unnecessary visual weight. It supports recurring utility actions such as search, close, menu, or media controls while remaining calm, accessible, and unambiguous.

## Responsibilities

Icon Button owns the compact native-button control, one approved icon, an accessible name, interaction states, and an optional factual indicator.

It does not own navigation structure, icon artwork, modal or drawer focus management, cart quantity changes, product-option selection, action confirmation, or a text Button’s primary-action hierarchy.

## User Goals

Customers should be able to recognize the action, activate it by keyboard or touch, and understand its available, selected, or pending state without relying on icon shape or color alone.

## Merchant Goals

Merchants should use a stable, approved Icon System value only where the action is already familiar or nearby text makes it clear. They should not create arbitrary icon actions, labels, or state behavior.

## Structure

Icon Button consists of one Icon System icon within a native `<button>` and one programmatic accessible name. It may include a concise factual count or status indicator when the owning Shopify state supplies it.

## Required Elements

Every Icon Button requires an approved icon, a visually available label or programmatic accessible name, visible focus, a touch-friendly target, and a native button action.

## Optional Elements

An adjacent visible label, supported count, selected state, or real loading indicator may be included only when they improve comprehension. The indicator must not duplicate a Badge’s categorical-label responsibility.

## Supported Variants

### Utility

For familiar header, media, or overlay actions such as search, menu, close, previous, or next.

### Quiet

For a secondary nearby action with low visual emphasis while preserving focus and touch affordance.

### Emphasized

For an important compact control whose action is still unmistakable from a nearby label or accessible name.

## Component-Specific Rules

### Labelling

An icon alone is never its accessible name. Use an accurate `aria-label`, visible adjacent text, or another native accessible-name mechanism. Tooltip may supplement an unfamiliar action but cannot replace its accessible name.

### Icon Selection

Use only Icon System registry values. The icon must represent one supported action and should not be a decorative substitute for a text Button, Badge, or Status Indicator.

### States

Selected or expanded state must be exposed through the appropriate native or ARIA state only when it is real. Loading starts only for an actual pending operation; success or error belongs to the owning component’s feedback mechanism.

### Composition

Icon Button may invoke an existing Drawer, Modal, gallery, or navigation component, but those owners manage focus, escape behavior, routing, and lifecycle cleanup. Do not nest it inside another interactive control.

## Supported States

### Default

The action is available with a clear accessible name.

### Hover and Focus

Pointer feedback remains restrained; focus is visible and keyboard operation matches native buttons.

### Selected or Expanded

The owning verified state is communicated semantically and visually without color alone.

### Disabled or Loading

These states occur only for a real unavailable or pending action and do not fabricate a result.

## Responsive Behaviour

Icon Button keeps its minimum touch target, clear spacing from adjacent controls, and source order at 320 px, zoom, and large-text settings. It must not disappear solely because hover is unavailable or rely on a mouse-only tooltip.

## Accessibility

Use native button semantics, a precise accessible name, keyboard activation, visible focus, WCAG 2.2 AA contrast, and text-equivalent state. Tooltips are supplementary; focus must not be trapped, moved unexpectedly, or obscured by adjacent UI.

## Shopify Settings

Merchants may select an approved Icon System value and show an Icon Button only in a documented, supported context.

The Design System controls target size, padding, focus, state styling, spacing, motion, and responsive visibility. The owning Shopify component controls cart count, menu state, media state, and action availability.

## Design Tokens

Icon Button uses compact-action-surface, compact-action-foreground, compact-action-border, compact-action-focus-ring, compact-action-size, compact-action-gap, and compact-action-radius tokens.

## Motion Rules

Hover, selected, and loading transitions are subtle and functional. No bouncing, indefinite pulsing, flashing, or decorative rotation is permitted; reduced-motion preferences simplify nonessential motion.

## Performance Rules

The control renders without a dependency. Any dynamic handler is initialized once, cleaned up on Theme Editor section unload, and does not duplicate requests or listeners after rerender. Its native action remains usable without JavaScript when the underlying destination or form supports it.

## AI Guidelines

AI may select Icon Button only for a verified, familiar action supported by the existing Icon System and owning component. It must provide an exact accessible name, reuse the primitive, and omit ambiguous compact actions.

AI must not invent icons, labels, counts, state, tooltip-only meaning, integrations, or competing primary actions; or use Icon Button to replace documented product-option, quantity, or navigation ownership.

## Quality Checklist

- One familiar action and one accurate accessible name are present.
- The icon comes from the canonical registry.
- Keyboard, focus, touch target, selected, disabled, and loading behavior are clear.
- The control is not nested or duplicated with a text Button.
- Dynamic initialization and Theme Editor lifecycle remain safe.

## Future Compatibility

Future compact actions require a demonstrated Shopify-native use case, a stable icon, and accessibility review. Extensions must preserve Icon System ownership, deterministic AI selection, native semantics, and the distinction from text Buttons, Badges, and Status Indicators.
