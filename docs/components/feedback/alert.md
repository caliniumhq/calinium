# Alert

## Purpose

Alert communicates important persistent or contextual information requiring customer awareness. It provides calm, concise guidance without becoming a promotion, Toast, modal interruption, or field-validation message.

## Responsibilities

Alert owns sustained informational, success, warning, error, and neutral feedback at a section or task level; optional heading, action, icon, and safe dismissal.

Alert is not responsible for temporary global confirmation, field-level validation, overlay behavior, product promotion, or fabricated system state.

## User Goals

Alert should help customers understand what happened, whether action is needed, and one verified next step.

## Merchant Goals

Alert should help merchants present approved factual guidance without manually styling urgency, errors, or repeated messages.

## Structure

Alert consists of status text — required.

Optional: concise heading, meaningful icon, one recovery action, and dismiss control.

## Required Elements

Every Alert requires accurate state text, clear placement near its affected region, non-color-only meaning, and stable layout.

## Optional Elements

Heading, icon, action, and dismissal may appear only when they improve recovery. Dismissal must not conceal information essential to task completion.

## Supported Variants

### Information

Persistent neutral context.

### Success

Confirmed outcome only.

### Warning

Real condition requiring attention without panic.

### Error

Failure that materially affects the nearby task.

### Neutral

Non-urgent contextual state.

## Component-Specific Rules

Alert must use the least urgent accurate variant, avoid duplicate Alert/Toast/Inline Message announcements, and offer one real recovery action when available.

Alert must not act as an ordinary promotional banner, expose technical detail, invent a cause or recovery time, or use a dismissible state for an essential unresolved issue.

## Supported States

### Visible

Accurate context remains available while relevant.

### Dismissible

Customer may close non-essential context with a named keyboard-accessible control.

### Resolved

The alert is removed only when its underlying state actually changes.

## Responsive Behaviour

Alerts should wrap safely, retain action touch targets, preserve source order, and avoid covering product, cart, or form controls at 320 px, zoom, and large text settings.

## Accessibility

Alert must use semantic HTML, WCAG 2.2 AA contrast, clear text equivalents, visible focus, keyboard dismissal, and restrained `role="alert"` use only for urgent new information. Ordinary persistent context should use a suitable non-urgent status mechanism.

## Shopify Settings

Merchants may configure approved heading, message, visibility, icon visibility, safe dismissal, action label, and real action destination.

The Design System controls state colors, spacing, icon rules, roles, focus, touch size, breakpoints, and motion.

## Design Tokens

Alert should use alert-surface, alert-foreground, alert-border, alert-icon, alert-gap, alert-focus-ring, and alert-action tokens.

## Motion Rules

Alert may use a restrained appearance transition. It must not flash, shake, pulse, alarm customers, or delay access; reduced-motion preferences are respected.

## Performance Rules

Alert should prefer server-rendered initial state, use minimal JavaScript for dynamic updates, preserve progressive enhancement, avoid polling and duplicate listeners, and remain stable through Theme Editor rerenders.

## AI Guidelines

AI should select Alert only for sustained contextual information, use deterministic factual wording, preserve customer work, offer one verified recovery action, and hide unknown state.

AI must not invent completion, cause, recovery time, urgency, or promotional feedback.

## Quality Checklist

### State

- The message reflects a verified current condition.
- Alert is less disruptive than a Modal or Error Page.

### Accessibility

- Text, role, focus, and dismissal behavior are appropriate.
- Color and icon do not carry meaning alone.

### Recovery

- Any action is real and useful.

## Future Compatibility

Future Alert refinement should improve factual contextual communication without duplicating Toast, Validation Message, Banner, or overlay behavior. New variants require a demonstrated state and safe recovery path.
