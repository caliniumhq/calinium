# Progress Indicator

## Purpose

Progress Indicator communicates real determinate or indeterminate task progress. It gives customers truthful orientation for a measurable operation without simulated percentages or decorative movement.

## Responsibilities

Progress Indicator owns linear or circular presentation, value/minimum/maximum semantics, optional textual percentage, step progress, completion, paused, and error states.

Progress Indicator is not responsible for localized short waiting, workflow navigation, Stepper behavior, loading skeleton geometry, or fabricated task timing.

## User Goals

Progress Indicator should help customers understand real task advancement, current state, and any verified next action.

## Merchant Goals

Progress Indicator should help merchants present real Shopify or integration-backed progress without manually configuring percentage, animation, or misleading completion claims.

## Structure

Progress Indicator consists of progress name and real state — required.

Optional: native progress element, textual value, minimum/maximum, step label, cancel or retry action when verified.

## Required Elements

Determinate progress requires a real measurable value and range. Indeterminate progress requires a genuine pending operation and concise label.

## Optional Elements

Linear, circular, percentage text, step label, paused status, completion state, error explanation, and recovery action may appear only when real task data supports them.

## Supported Variants

### Determinate Linear

Real continuous value across a known range.

### Determinate Circular

Compact measurable progress where text remains available.

### Indeterminate

Known operation with no measurable value.

### Step Progress

Discrete verified stages where continuous percentage is inappropriate.

## Component-Specific Rules

Progress Indicator must use actual value data, distinguish determinate from indeterminate state, and use Stepper when the task is discrete navigation rather than continuous work.

Progress Indicator must not invent percentage, completion, speed, retry success, or task duration; it must not replace Loading Spinner for a small localized wait.

## Supported States

### In Progress

Actual determinate or indeterminate work is represented.

### Paused

Verified work is paused with accurate contextual explanation.

### Complete

Confirmed completion appears.

### Error

Actual failure replaces false progress and may expose a real recovery action.

## Responsive Behaviour

Progress Indicator should retain readable name and value, adequate touch space for actions, stable geometry, and source order at narrow widths, zoom, and large text settings.

## Accessibility

Progress Indicator must use native `<progress>` where appropriate or equivalent semantic HTML, accessible name, correct min/max/value for determinate state, WCAG 2.2 AA contrast, and restrained live updates. It must not announce every minor percentage change.

## Shopify Settings

Merchants may configure visibility and approved task label only where a parent provides real progress data.

The Design System controls linear/circular presentation, sizing, status styling, announcements, motion, breakpoints, and focus.

## Design Tokens

Progress Indicator should use progress-track, progress-value, progress-label, progress-size, progress-gap, progress-complete, progress-error, and progress-focus tokens.

## Motion Rules

Progress movement must reflect real state. Indeterminate motion is restrained and simplified under reduced-motion preferences; no simulated acceleration, looping completion, or decorative ring animation is allowed.

## Performance Rules

Progress Indicator should prefer server-rendered state, use minimal event-driven JavaScript, avoid polling and repeated announcements, preserve progressive enhancement, stable geometry, and cleanup of listeners or timers on rerender.

## AI Guidelines

AI should select Progress Indicator only for verified measurable or genuinely pending work, choose deterministic variant, use concise factual labels, and show recovery only when real.

AI must not invent percentage, progress, completion, schedule, or retry outcome.

## Quality Checklist

### Data

- Determinate value and range are real.
- Step progress is used for discrete stages.

### Accessibility

- Name, semantics, and updates are accurate.
- Announcements are not excessive.

### Integrity

- Motion reflects actual progress and does not pressure customers.

## Future Compatibility

Future Progress Indicator refinement should remain data-backed and task-specific. New workflow, cancellation, or retry patterns require an implemented state model and must not imply progress that cannot be measured.
