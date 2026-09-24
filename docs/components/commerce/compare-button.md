# Compare Button

## Purpose

Compare Button provides an explicit add-or-remove comparison control for products with meaningful comparable data.

It remains optional and integration-bound; it does not create a comparison experience merely because a reusable control is available.

## Responsibilities

Compare Button is responsible for add, added, remove, loading, error, maximum-item, and comparable-product eligibility feedback, plus its relationship with Icon Button.

Compare Button is not responsible for comparison table design, comparison criteria, product-comparison logic, storage, customer authentication, or account behavior.

## User Goals

Compare Button should help customers intentionally add or remove genuinely comparable products and understand any verified limit or unavailable state.

## Merchant Goals

Compare Button should help merchants enable an approved comparison integration only where product data supports a useful customer decision.

## Structure

Compare Button consists of an explicit add-or-remove control and current comparison state.

Optional:

- Icon Button treatment
- verified maximum-item feedback
- integration-provided comparison destination
- guest-session qualification

## Required Elements

Every Compare Button requires comparable-product eligibility, a real integration path, accessible state naming, and a clear maximum or error path where applicable.

## Optional Elements

Maximum count, guest-session explanation, and comparison destination may appear only when the approved integration supplies them.

## Supported Variants

### Add

The product is eligible and not in the active comparison set.

### Added

The product is in the active comparison set and may be removed.

### Maximum Reached

The integration reports a real limit with clear next action or explanation.

### Ineligible

The control is omitted or neutrally unavailable when comparison would not be meaningful.

### Error

Recoverable integration failure is communicated without blocking product purchase.

## Component-Specific Rules

Compare Button must appear only for products with meaningful comparable data, update after real integration results, and expose add/remove state accessibly.

Compare Button must not define comparison criteria, fabricate eligibility, persist data, claim cross-device behavior, compare unrelated product types, or interfere with Variant Picker and Buy Buttons.

## Supported States

### Add or Added

Action and current membership are clear.

### Loading

Duplicate activation is prevented while state remains understandable.

### Maximum Reached

Verified limit feedback appears without pressure.

### Error or Unavailable

The control fails safely or is absent; product purchase remains usable.

## Responsive Behaviour

Compare Button should retain touch-friendly dimensions, concise labels, visible focus, and stable placement through compact Product Card and Product Information contexts.

## Accessibility

Compare Button must use semantic HTML and button behavior, keyboard operation, visible focus, WCAG 2.2 AA contrast, accessible add/remove state, non-color-only feedback, and restrained live messages for meaningful changes.

## Shopify Settings

Merchants may configure approved integration enablement and label or Icon Button presentation where comparable data and integration exist.

The Design System controls touch target, focus, status styling, maximum feedback, breakpoints, motion, and integration-failure behavior.

## Design Tokens

Compare Button should use compare-control-size, compare-gap, compare-foreground, compare-added, compare-focus-ring, and compare-loading-surface tokens.

## Motion Rules

Only a brief restrained state transition is allowed. No comparison-count pulse, bounce, or pressure-driven animation may occur; reduced-motion preferences are respected.

## Performance Rules

Compare Button should use minimal JavaScript for actual integration updates, avoid duplicate requests, polling, and unnecessary storage access, preserve progressive enhancement, and never block Product Card, Product Information, Variant Picker, or Buy Buttons.

## AI Guidelines

AI should add Compare Button only when verified comparable data and approved integration exist; select deterministic eligible state; preserve customer choice; and omit ineligible products.

AI must not fabricate comparison data, limits, storage, customer state, or product suitability.

## Quality Checklist

### Integration

- A real comparison path and eligibility rule exist.
- Maximum feedback is verified and actionable.

### Accessibility

- Add/remove and limit states are textual and keyboard accessible.
- Focus and updates remain calm.

### Integrity

- Only genuinely comparable products expose the control.

## Future Compatibility

Future Compare Button refinement should remain dependent on demonstrated comparison architecture and meaningful product data. New persistence, table, or account features require separate privacy, data, and customer-experience specifications.
