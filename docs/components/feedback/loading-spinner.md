# Loading Spinner

## Purpose

Loading Spinner communicates indeterminate waiting for a small localized operation. It is a concise state signal, not a substitute for content structure, measurable progress, or a loading overlay.

## Responsibilities

Loading Spinner owns localized indeterminate waiting, compact and standard size, accessible loading label, button-adjacent presentation, and minimum-display timing to avoid flicker.

Loading Spinner is not responsible for long-operation progress, expected-content geometry, global blocking, error explanation, or hiding preventable slow rendering.

## User Goals

Loading Spinner should help customers understand that a nearby operation is in progress without losing access to surrounding content.

## Merchant Goals

Loading Spinner should help merchants communicate real short waits without adding decorative loading behavior or manual animation controls.

## Structure

Loading Spinner consists of an indeterminate visual indicator and accessible loading label — required.

Optional: button-adjacent context or compact inline placement.

## Required Elements

Every Loading Spinner requires a real pending operation, non-color-only loading communication, stable reserved space, and a safe completion or failure path.

## Optional Elements

Button-adjacent text may clarify the specific action. It must not duplicate a nearby Status Indicator or Progress Indicator.

## Supported Variants

### Inline

Small localized wait beside content.

### Button Adjacent

Wait state replaces or accompanies an action label without changing button geometry.

### Standard

Visible in a bounded content region where progress cannot be measured.

## Component-Specific Rules

Loading Spinner must appear only while a real operation is pending, use minimum timing to avoid flicker, and yield to Skeleton or Progress Indicator when those explain the wait better.

Loading Spinner must not appear repeatedly in one region, simulate progress, replace long expected content, block commerce actions unnecessarily, or remain after an error or completion state.

## Supported States

### Hidden

No pending operation exists.

### Loading

Real indeterminate waiting is shown.

### Complete

Spinner is replaced by actual result or Status Indicator.

### Error

Spinner is removed and accurate Inline Message or Alert feedback appears.

## Responsive Behaviour

Loading Spinner should retain its label, touch-safe button placement, and stable geometry without crowding content at narrow widths, zoom, or large text settings.

## Accessibility

Loading Spinner must use semantic HTML, an accessible loading label, WCAG 2.2 AA contrast, and suitable restrained `role="status"` behavior. It must not repeatedly announce unchanged loading text or move focus.

## Shopify Settings

Merchants may configure visibility only where a parent has a real loading state.

The Design System controls size, label treatment, minimum timing, rotation, focus, spacing, breakpoints, and reduced-motion behavior.

## Design Tokens

Loading Spinner should use spinner-size-compact, spinner-size-standard, spinner-track, spinner-value, spinner-label-gap, and spinner-surface tokens.

## Motion Rules

Controlled rotation is permitted only during real loading. It must simplify or become static under reduced motion; no decorative loading animation or simulated completion is allowed.

## Performance Rules

Loading Spinner should use minimal CSS, no polling, no repeated timers, stable geometry, progressive enhancement, and cleanup of any timer or listener during Theme Editor rerenders or unmount.

## AI Guidelines

AI should use Loading Spinner only for verified short indeterminate operations, choose deterministic placement, preserve surrounding work, and replace it with actual result feedback.

AI must not show fake loading, invent wait duration, or use spinners where Skeleton or Progress Indicator is more informative.

## Quality Checklist

### State

- A real pending operation exists.
- Spinner disappears on completion or error.

### Accessibility

- Loading is named without repetitive announcements.
- Motion has reduced-motion fallback.

### Hierarchy

- Spinner remains localized and does not block core commerce interaction.

## Future Compatibility

Future Loading Spinner refinement should remain localized and indeterminate. New overlay, global, or long-operation behavior requires a demonstrated implementation and separate accessibility review.
