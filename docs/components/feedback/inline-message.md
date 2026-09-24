# Inline Message

## Purpose

Inline Message communicates compact feedback attached to nearby content or an action. It remains subordinate to the region it explains and never replaces validation, status labels, Toast, or Alert.

## Responsibilities

Inline Message owns concise informational, success, warning, and error context near an affected action or content region, with optional icon and one action link.

Inline Message is not responsible for field-level validation, global announcements, persistent section alerts, temporary Toast feedback, or product and commerce state logic.

## User Goals

Inline Message should help customers understand a nearby state and take one clear next step without losing context.

## Merchant Goals

Inline Message should help merchants communicate approved factual nearby guidance without creating visual noise or duplicate messages.

## Structure

Inline Message consists of concise message text — required.

Optional: meaningful icon and one named action link.

## Required Elements

Every Inline Message requires real contextual state, placement adjacent to the affected content, non-color-only meaning, and stable geometry.

## Optional Elements

Icon and action link may appear when they clarify recovery. A link must have a real destination or action.

## Supported Variants

### Information

Nearby factual context.

### Success

Confirmed local outcome.

### Warning

Real non-blocking condition.

### Error

Local failure with recovery where possible.

## Component-Specific Rules

Inline Message must stay near the affected content, retain concise factual language, and avoid announcing unchanged state repeatedly.

Inline Message must not replace Validation Message, Alert, Toast, Badge, inventory text, or a status label; it must not invent a success, error cause, or recovery action.

## Supported States

### Hidden

No relevant feedback exists.

### Visible

Current contextual feedback is shown.

### Updating

Real dynamic change updates without layout disruption.

### Resolved

The message is removed only after underlying state changes.

## Responsive Behaviour

Inline Message should wrap with its content, retain readable action links and touch spacing, and preserve DOM order at narrow widths, zoom, and large text settings.

## Accessibility

Inline Message must use semantic HTML, text equivalent, WCAG 2.2 AA contrast, visible link focus, and a suitable restrained status announcement only for meaningful dynamic updates. It must not move focus automatically.

## Shopify Settings

Merchants may configure approved message wording, visibility, icon visibility, action label, and action destination where a real state supports them.

The Design System controls spacing, hierarchy, status styling, live-region behavior, touch size, breakpoints, and motion.

## Design Tokens

Inline Message should use inline-message-gap, inline-message-text, inline-message-icon, inline-message-link, inline-message-surface, and inline-message-focus tokens.

## Motion Rules

Only brief restrained appearance or resolution transition is allowed. No shake, flash, urgency, or repeated animation is permitted; reduced-motion preferences are respected.

## Performance Rules

Inline Message should use server-rendered initial context where possible, minimal JavaScript for real updates, progressive enhancement, no polling, and no layout measurement or duplicate listeners.

## AI Guidelines

AI should choose Inline Message for nearby compact factual feedback, select deterministic wording from verified state, preserve customer work, and offer one real recovery action when available.

AI must not use it as generic validation, promotion, fake loading, or unsupported commerce assurance.

## Quality Checklist

### Context

- Message is adjacent to the affected region.
- A less or more disruptive feedback primitive is not more appropriate.

### Accessibility

- Meaning is textual and focus remains stable.
- Dynamic announcements remain restrained.

### Recovery

- Any action can actually resolve or navigate from the issue.

## Future Compatibility

Future Inline Message refinement should preserve its compact local role. New variants require a distinct verified contextual state and must not overlap Validation Message, Toast, Alert, or commerce-status behavior.
