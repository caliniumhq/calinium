# Chip

## Purpose

Chip presents a compact selected value, filter token, removable item, or concise interactive choice when Badge, Button, Filters, or form controls do not already own the need.

## Responsibilities

Chip owns compact token presentation, selected state, optional count, and explicit remove action where applicable.

Chip is not responsible for variants, filters logic, navigation, categorical labels, radio selection, checkbox selection, or nested action behavior.

## User Goals

Chip should help customers scan and adjust a compact real selection without ambiguity or accidental interaction.

## Merchant Goals

Chip should help merchants show approved selected values without manually creating token styles or commerce-specific controls.

## Structure

Chip consists of concise verified label — required.

Optional: leading icon, count, selected state, or separately named remove button.

## Required Elements

Every Chip requires a clear content role, truncation-safe text, and one unambiguous static, selectable, or removable interaction model.

## Optional Elements

Icon, count, and remove action may appear when verified. A remove action must be a clearly named control and must not be nested unsafely inside another interactive chip.

## Supported Variants

### Static

Compact information only when Badge is not more appropriate.

### Selectable

Explicit concise selection where form controls do not own the choice.

### Removable

Selected token with dedicated remove action.

### Filter Token

Active filter representation owned by Filters logic.

## Component-Specific Rules

Chip must use Button or form semantics when interactive, preserve real selection state, wrap through Cluster, and keep removal separate and named.

Chip must not duplicate Variant Picker, Radio Group, Checkbox, Badge, navigation links, or Filters logic; it must not use animation or count to create pressure.

## Supported States

### Default, Selected, or Removable

Current state is textual or programmatic as appropriate.

### Disabled or Unavailable

Appears only for a real supported reason.

### Loading or Error

Integration-owned state is shown only when a real update exists.

## Responsive Behaviour

Chips should wrap, truncate only with accessible full label, preserve touch targets, and avoid horizontal scrolling at narrow widths, zoom, and large text settings.

## Accessibility

Chip must use semantic HTML, visible focus, keyboard operation when interactive, WCAG 2.2 AA contrast, accessible selected state, and named removal. Color and icon cannot be the only state cue.

## Shopify Settings

Merchants may configure verified label, optional icon visibility, count visibility, and approved static/selectable/removable mode where a parent supports it.

The Design System controls spacing, truncation, touch targets, focus, selected styling, breakpoints, and motion.

## Design Tokens

Chip should use chip-gap, chip-padding, chip-surface, chip-foreground, chip-selected, chip-remove-size, and chip-focus-ring tokens.

## Motion Rules

Chip may use a brief factual selection or removal transition. No decorative chip animation, bounce, urgency, or reduced-motion violation is allowed.

## Performance Rules

Chip should use server-rendered labels, minimal JavaScript for real state change, progressive enhancement, event delegation where appropriate, and no duplicate listeners or polling.

## AI Guidelines

AI should choose Chip only for a demonstrated compact token need, select deterministic mode from verified state, preserve source order, and defer commerce and form behavior to existing components.

AI must not add interactive Chips for novelty or fabricate labels, counts, selection, or filters.

## Quality Checklist

### Scope

- Badge, Filters, Variant Picker, and form controls are not more appropriate.
- Interaction model is singular and clear.

### Accessibility

- Selected and remove states are named and keyboard accessible.
- Nested interactions are avoided.

### Responsive

- Groups wrap without clipped labels or controls.

## Future Compatibility

Future Chip refinement should remain compact and task-led. New interaction types require a distinct repeated need, semantic model, and no overlap with existing commerce or form controls.
