# Status Indicator

## Purpose

Status Indicator communicates one concise current state such as active, pending, complete, unavailable, delayed, paused, error, or neutral.

It supports factual orientation without becoming a categorical Badge, full explanatory feedback, commerce pressure signal, or pulsing urgency device.

## Responsibilities

Status Indicator owns short state label, optional meaningful icon or decorative dot, current-state styling, and relationship to a nearby item or process.

Status Indicator is not responsible for category labels, promotions, detailed explanation, recovery workflow, inventory logic, delivery logic, or status calculation.

## User Goals

Status Indicator should help customers identify a verified current state quickly and find fuller context when needed.

## Merchant Goals

Status Indicator should help merchants display approved real state consistently without selecting arbitrary colors, urgency, or category labels.

## Structure

Status Indicator consists of concise text state — required.

Optional: meaningful icon, decorative dot, and nearby explanatory link or Inline Message.

## Required Elements

Every Status Indicator requires verified current state, textual meaning independent of color, and a clear relationship to the item it describes.

## Optional Elements

Icon or dot may reinforce text. A separate explanatory link or Inline Message may appear when state needs more context.

## Supported Variants

### Active

Verified currently active state.

### Pending or Paused

Verified waiting or stopped work.

### Complete

Confirmed completed state.

### Unavailable, Delayed, or Error

Factual current limitation; fuller feedback appears when needed.

### Neutral

Non-urgent current context.

## Component-Specific Rules

Status Indicator must use concise factual text, preserve state source ownership, and defer detail or recovery to Inline Message, Alert, Error Page, or the parent task.

Status Indicator must not replace Badge category behavior, create urgency through pulsing, imply availability, completion, inventory, delivery, or payment state without verification, or use color alone.

## Supported States

### Current

State is accurate and shown.

### Updating

A real change updates once with restrained announcement if useful.

### Unknown

Indicator hides or uses neutral unavailable state rather than guessing.

## Responsive Behaviour

Status Indicator should retain text, icon alignment, source order, and sufficient touch spacing for any related link at narrow widths, zoom, and large text settings.

## Accessibility

Status Indicator must use semantic HTML, WCAG 2.2 AA contrast, text equivalents, visible focus for related links, and restrained `role="status"` use for meaningful dynamic updates. Dots and icons alone cannot communicate state.

## Shopify Settings

Merchants may configure visibility and approved state label only where a real parent data source supports them.

The Design System controls status colors, icon rules, spacing, typography, live-region behavior, breakpoints, and motion.

## Design Tokens

Status Indicator should use status-text, status-icon, status-active, status-pending, status-complete, status-unavailable, status-error, and status-gap tokens.

## Motion Rules

Status Indicator should not pulse, flash, bounce, or animate indefinitely. A brief factual state transition is permitted and must respect reduced-motion preferences.

## Performance Rules

Status Indicator should prefer server-rendered state, use minimal event-driven JavaScript, preserve progressive enhancement, avoid polling and duplicate listeners, and maintain stable geometry through Theme Editor rerenders.

## AI Guidelines

AI should use Status Indicator for one verified concise state, select deterministic wording and semantic token, and add fuller feedback only when the customer needs it.

AI must not invent state, urgency, availability, success, failure cause, or commerce claims.

## Quality Checklist

### State

- Current label is verified and concise.
- Badge or explanatory feedback is not more appropriate.

### Accessibility

- Text—not color or dot—communicates state.
- Dynamic updates are restrained.

### Hierarchy

- Indicator remains secondary to primary product or task content.

## Future Compatibility

Future Status Indicator refinement should remain concise and source-led. New state categories require a real domain model and must not duplicate Badge, Alert, Inline Message, or commerce-state systems.
