# Disclosure

## Purpose

Disclosure reveals or hides one small supplementary content region. It prefers native `<details>` and `<summary>` and remains distinct from coordinated Accordion groups, Tooltip labels, and Popover content.

## Responsibilities

Disclosure owns one trigger, one content region, collapsed/expanded state, optional icon, and native-first behavior.

Disclosure is not responsible for grouped expansion, large workflow content, brief hover label, or overlay behavior.

## User Goals

Disclosure should help customers reveal optional supporting information when they choose.

## Merchant Goals

Disclosure should help merchants keep secondary content available without clutter or custom behavior.

## Structure

Disclosure consists of one trigger and one supplementary region — required.

Optional: icon and concise summary label.

## Required Elements

Every Disclosure requires clear trigger text, one related region, accurate expanded state, and content that remains supplementary.

## Optional Elements

Icon may reinforce state but cannot be sole cue. Nested Disclosure is allowed only when hierarchy remains clear and shallow.

## Supported Variants

### Native

`details`/`summary` default.

### Enhanced

Optional progressive enhancement retaining native fallback.

## Component-Specific Rules

Disclosure must keep essential content continuously visible elsewhere when required and use Accordion for coordinated groups.

Disclosure must not hide purchase-critical information, replace Tooltip/Popover, or create nested interactive conflict.

## Supported States

### Collapsed or Expanded

State is native or programmatically accurate.

### Disabled or Unavailable

Only when real parent behavior supports it.

## Responsive Behaviour

Disclosure should wrap trigger text, preserve focus, and avoid clipped expanded content at narrow widths and zoom.

## Accessibility

Disclosure must use semantic HTML, keyboard operation, visible focus, expanded state, WCAG 2.2 AA contrast, and no color-only cue.

## Shopify Settings

Merchants may configure approved trigger and supplementary content and optional icon visibility.

The Design System controls semantics, spacing, icon treatment, focus, nesting limits, breakpoints, and motion.

## Design Tokens

Disclosure uses disclosure-gap, disclosure-trigger, disclosure-icon, disclosure-content-space, and disclosure-focus tokens.

## Motion Rules

Expansion may use a restrained transition that respects reduced-motion preferences and never delays content access.

## Performance Rules

Disclosure should use native server-rendered HTML, no required JavaScript, progressive enhancement, stable geometry, and no duplicate listeners after Theme Editor rerender.

## AI Guidelines

AI should use Disclosure only for one genuinely supplementary region, select deterministic collapsed state from context, and preserve essential content visibility.

AI must not use it to hide essential commerce information or imitate Accordion, Tooltip, or Popover.

## Quality Checklist

### Scope

- One trigger controls one supplementary region.

### Accessibility

- Native or equivalent expanded semantics and keyboard behavior exist.

### Content

- Essential information remains visible without expansion.

## Future Compatibility

Future Disclosure work should preserve native-first behavior; coordinated, overlay, or complex content requires the appropriate existing component.
