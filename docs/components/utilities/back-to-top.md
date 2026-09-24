# Back to Top

## Purpose

Back to Top provides optional navigation to the beginning of a sufficiently long page. It supplements clear page navigation and never competes with commerce, accessibility, chat, or app controls.

## Responsibilities

Back to Top owns long-page eligibility, visible threshold, named link or button, destination, mobile-safe placement, and reduced-motion-safe movement.

Back to Top is not responsible for primary navigation, Header behavior, continuous scroll tracking, or forcing smooth scrolling.

## User Goals

Back to Top should help customers return to a real page beginning without losing orientation.

## Merchant Goals

Back to Top should help merchants support long content pages without adding decorative fixed controls to short pages.

## Structure

Back to Top consists of named page-fragment link or button and real top destination — required.

Optional: fixed presentation and controlled visibility threshold.

## Required Elements

Every Back to Top requires sufficiently long page, accessible label, safe top landmark or fragment, and non-overlapping placement.

## Optional Elements

Fixed positioning may appear only when it avoids Header, commerce controls, widgets, and safe areas.

## Supported Variants

### Inline

Visible within long-page content flow.

### Fixed

Appears after approved threshold where it remains non-obstructive.

### Fragment Link

Preferred native navigation when practical.

## Component-Specific Rules

Back to Top must appear only on long pages, point to a real top landmark, and preserve predictable focus behavior.

Back to Top must not appear on short pages, obscure controls, force smooth scrolling, compete with widgets, or substitute for navigation.

## Supported States

### Hidden or Visible

Threshold state is controlled and real.

### Focused

Visible focus remains unobstructed.

## Responsive Behaviour

Back to Top should respect safe areas, touch targets, zoom, and mobile overlap avoidance without horizontal overflow.

## Accessibility

Back to Top must use semantic HTML and link or button behavior, keyboard operation, visible focus, WCAG 2.2 AA contrast, named destination, and no unexpected focus movement. Fragment navigation is preferred where practical.

## Shopify Settings

Merchants may configure visibility only for approved long-page contexts and fixed or inline presentation where safe.

The Design System controls threshold presets, placement, safe-area offset, focus, breakpoints, and motion.

## Design Tokens

Back to Top uses back-to-top-size, back-to-top-offset, back-to-top-surface, back-to-top-foreground, and back-to-top-focus tokens.

## Motion Rules

Visibility may fade subtly. Smooth scrolling is optional only when customer preference permits; reduced-motion requests use immediate fragment navigation.

## Performance Rules

Back to Top should use native fragment behavior, minimal JavaScript, progressive enhancement, efficient visibility strategy, no continuous scroll work or polling, and Theme Editor-safe cleanup.

## AI Guidelines

AI should add Back to Top only to a verified sufficiently long page, select deterministic safe placement, preserve Header and controls, and prefer native fragment link.

AI must not add it to short pages, invent thresholds, or use it as a navigation substitute.

## Quality Checklist

### Eligibility

- Page is genuinely long and control does not overlap existing widgets.

### Accessibility

- Destination, focus, label, and reduced-motion behavior are correct.

### Performance

- Native navigation or efficient threshold behavior avoids continuous work.

## Future Compatibility

Future Back to Top refinement must remain long-page-specific, native-first, and non-obstructive. New scroll behavior requires accessibility and overlap validation.
