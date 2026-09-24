# Rating

## Purpose

Rating presents one verified normalized rating value visually and textually.

It supports product-first evaluation with quiet confidence, never fabricated social proof, review content, provider behavior, or conversion pressure.

## Responsibilities

Rating is responsible for:

- presenting a verified value and scale
- representing partial values consistently
- providing an accessible textual equivalent
- coordinating decorative star or symbol output with Icon System
- supporting compact and standard presentation

Rating is not responsible for review count, review content, submission, moderation, sorting, provider integration, or customer identity.

## User Goals

Rating should help customers understand a verified aggregate evaluation without needing to interpret icons alone.

## Merchant Goals

Rating should help merchants present approved Shopify or review-provider data consistently without choosing arbitrary scales, symbols, or claims.

## Structure

Rating consists of:

- verified normalized value — required
- verified maximum scale — required
- textual equivalent — required

Optional:

- decorative star or symbol row
- compact context label

## Required Elements

Every Rating requires a real value, maximum scale, consistent rounding rule, and accessible equivalent such as “4.6 out of 5.”

## Optional Elements

Rating may include partial visual symbols and a compact presentation where surrounding Product Information already establishes context.

## Supported Variants

### Standard

Textual value and optional decorative symbols appear together.

### Compact

A concise value supports Product Card or secondary commerce context.

### Unavailable

No rating renders when no verified provider or Shopify data exists.

## Component-Specific Rules

Rating must use the provider’s verified scale, round consistently, and hide decorative symbols from assistive technology when textual equivalent is present.

Rating must not render an unverified default, imply a five-point scale without data, expose review count, or use animated stars to create urgency.

## Supported States

### Available

Verified value and scale are displayed.

### Partial

The visual representation accurately reflects the normalized partial value.

### Unavailable

The component is omitted or uses neutral unavailable context when the parent has a real reason to show it.

## Responsive Behaviour

Rating should wrap or retain a compact format without clipping, preserve source order, and maintain readable text at 320 px, zoom, and large text settings.

## Accessibility

Rating must use semantic HTML, a text equivalent, WCAG 2.2 AA contrast, and no color-only meaning. Decorative icons must not create repetitive screen-reader output.

## Shopify Settings

Merchants may configure visibility and compact or standard presentation where verified rating data exists.

The Design System controls icon size, spacing, rounding display, focus context, contrast, and responsive behavior.

## Design Tokens

Rating should use rating-icon-size, rating-gap, rating-foreground, rating-muted, and rating-text typography tokens.

## Motion Rules

Rating should not animate. No star fill, pulse, count-up, or review activity animation may create pressure; reduced-motion preferences remain respected.

## Performance Rules

Rating should use server-rendered verified data where possible, minimal markup, no blocking provider script, stable geometry, and progressive enhancement when an optional integration is unavailable.

## AI Guidelines

AI should use Rating only with verified merchant, Shopify, or provider data; preserve the supplied scale; choose deterministic approved presentation; use semantic HTML; and hide it when data is absent.

AI must not invent ratings, popularity, review activity, or social proof.

## Quality Checklist

### Data

- Value and scale have a verified source.
- Rounding is consistent and no default value appears.

### Accessibility

- Text communicates value and scale.
- Icons are decorative when equivalent text exists.

### Hierarchy

- Rating remains secondary to title, price, variants, and Buy Buttons.

## Future Compatibility

Future Rating refinement should remain provider-neutral and presentation-only. New variants require verified source data, accessible text parity, performance-safe loading, and no pressure-driven behavior.
