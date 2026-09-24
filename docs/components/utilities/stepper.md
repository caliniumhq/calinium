# Stepper

## Purpose

Stepper presents ordered finite process stages. It distinguishes discrete verified steps from continuous measurable progress owned by Progress Indicator.

## Responsibilities

Stepper owns step order, labels, current/completed/upcoming state, optional description, orientation, and safe clickable-step rules.

Stepper is not responsible for continuous percentage, workflow validation, navigation logic, or marking steps complete without verified state.

## User Goals

Stepper should help customers understand their current place in a supported finite process.

## Merchant Goals

Stepper should help merchants present approved process stages without inventing completion or making unsupported future navigation available.

## Structure

Stepper consists of ordered labeled steps — required.

Optional: description, verified state icon, vertical orientation, supported prior-step link.

## Required Elements

Every Stepper requires finite ordered stages, verified current state, textual labels, and source order matching the process.

## Optional Elements

Clickable completed steps may appear only when returning safely is implemented. Future steps remain non-interactive unless supported.

## Supported Variants

### Horizontal

Compact wide-screen process overview.

### Vertical

Readable narrow-screen or descriptive process overview.

### Static or Navigable

Navigation appears only for real safe destinations.

## Component-Specific Rules

Stepper must distinguish current, complete, upcoming, unavailable, and error textually and preserve source order.

Stepper must not invent completion, use percentage, enable unsupported future navigation, or replace Progress Indicator for measurable work.

## Supported States

### Current, Completed, Upcoming

Verified discrete step state.

### Unavailable or Error

Real limitation is shown with context supplied by parent feedback.

## Responsive Behaviour

Stepper should collapse from horizontal to vertical before labels crowd, retain order, and preserve touch targets at narrow widths.

## Accessibility

Stepper must use semantic HTML, ordered-list structure where appropriate, WCAG 2.2 AA contrast, visible focus, keyboard access for real links, and text not color alone.

## Shopify Settings

Merchants may configure approved step labels, descriptions, orientation, and safe visibility.

The Design System controls spacing, state styling, focus, collapse thresholds, and motion.

## Design Tokens

Stepper uses stepper-gap, stepper-marker, stepper-current, stepper-complete, stepper-upcoming, and stepper-focus tokens.

## Motion Rules

Stepper may use brief verified current-step confirmation; no simulated progress or animated completion is allowed. Reduced-motion preferences are respected.

## Performance Rules

Stepper should server render initial state, use minimal JavaScript only for supported navigation, preserve progressive enhancement, and avoid polling or duplicate listeners.

## AI Guidelines

AI should use Stepper only for implemented finite process stages, select deterministic verified state, and keep future navigation unavailable when unsupported.

AI must not invent stages, completion, validation, or navigation.

## Quality Checklist

### State

- Step order and completion are verified.

### Accessibility

- Labels and state remain textual and keyboard safe.

### Scope

- Continuous progress remains with Progress Indicator.

## Future Compatibility

Future Stepper variants require a real process model, safe navigation, and preserved ordered semantics.
