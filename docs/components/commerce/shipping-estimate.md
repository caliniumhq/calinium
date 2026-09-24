# Shipping Estimate

## Purpose

Shipping Estimate communicates a clearly qualified verified dispatch or delivery range.

It reduces uncertainty through transparent expectation-setting, never guessed location, unsupported arrival promise, or hidden fulfillment logic.

## Responsibilities

Shipping Estimate is responsible for distinguishing dispatch from delivery, presenting verified date or duration ranges, qualifying cutoff and business-day context, and handling unavailable, loading, and delayed states.

Shipping Estimate is not responsible for shipping-rate calculation, visitor geolocation, checkout fulfillment selection, tax calculation, carrier guarantees, or merchant policy creation.

## User Goals

Shipping Estimate should help customers understand what is known about dispatch or delivery without mistaking an estimate for a promise.

## Merchant Goals

Shipping Estimate should help merchants present approved Shopify, application, carrier, or service data without duplicating policy or making unsupported commitments.

## Structure

Shipping Estimate consists of a verified label and qualified date or duration range.

Optional:

- cutoff-time qualification
- business-day wording
- market or destination qualifier
- policy link
- delayed-state explanation

## Required Elements

Every shown Shipping Estimate requires a verified source, clear distinction between “ships in” and “estimated delivery,” and a known destination context where accuracy depends on it.

## Optional Elements

Cutoff time, market context, policy link, and delay details may appear only when verified. Pickup must remain a separate Pickup Availability message.

## Supported Variants

### Dispatch Range

Communicates when an order is expected to leave the merchant.

### Delivery Range

Communicates a qualified estimated arrival range.

### Unavailable

Neutral context explains that a precise estimate is not available.

### Delayed

Uses verified source context without making a new promise.

## Component-Specific Rules

Shipping Estimate must use qualified wording, business-day context when relevant, current selected-variant context where relevant, and verified destination data.

Shipping Estimate must not promise exact delivery dates without a guarantee, silently presume visitor location, conflate dispatch, delivery, and pickup, or invent carrier, shipping, or delay claims.

## Supported States

### Available

Verified qualified estimate is shown.

### Loading

Stable neutral context appears only when actual service data is resolving.

### Unavailable

The component hides or explains the limitation calmly.

### Delayed or Error

Verified delay context or a safe failure state appears without blocking checkout.

## Responsive Behaviour

Shipping Estimate should wrap long localized ranges safely, retain links and status readability, and preserve source order at narrow widths, zoom, and large text settings.

## Accessibility

Shipping Estimate must use semantic HTML, clear text rather than color-only status, visible focus for policy links, WCAG 2.2 AA contrast, and restrained announcements for material dynamic updates.

## Shopify Settings

Merchants may configure visibility, approved label wording, and a verified supporting policy link where an estimate source supports them.

The Design System controls range formatting presentation, spacing, typography, status styling, loading state, breakpoints, focus, and motion timing.

## Design Tokens

Shipping Estimate should use shipping-gap, shipping-text, shipping-status, shipping-link, shipping-loading-surface, and shipping-focus-ring tokens.

## Motion Rules

Motion is limited to restrained loading or state confirmation. No countdown, estimated-arrival animation, urgency cue, or automatic focus change is allowed; reduced-motion preferences are respected.

## Performance Rules

Shipping Estimate should prefer server-rendered verified state, defer non-critical services, use minimal JavaScript and event-driven updates, avoid duplicate fetching and polling, preserve progressive enhancement, and never block Product Information, Cart Summary, or Buy Buttons.

## AI Guidelines

AI should use Shipping Estimate only with verified source and destination context; choose deterministic qualified wording; preserve localization and market context; and hide unknown estimates.

AI must not invent shipping dates, delivery guarantees, visitor location, carrier services, or policy claims.

## Quality Checklist

### Data

- Dispatch, delivery, and pickup are distinct.
- Date or duration range has a verified source and qualifier.

### Accessibility

- Status and range are understandable without color or motion.
- Policy links are named and keyboard accessible.

### Integrity

- No estimate is presented as a guarantee.

## Future Compatibility

Future Shipping Estimate refinement should remain source-qualified and provider-neutral. New geolocation, carrier, or delivery capability requires consent, verified accuracy, localized rules, and safe failure behavior.
