# Review Summary

## Purpose

Review Summary combines verified aggregate Rating information with review count and, where available, one optional path to the reviews region.

It provides calm context without becoming a review system, fabricating social proof, or exposing customer identity.

## Responsibilities

Review Summary is responsible for:

- composing Rating and a verified review count
- offering an optional accessible “read reviews” link or anchor
- handling zero-review, unavailable-provider, and integration-loading states
- maintaining provider-neutral presentation boundaries

Review Summary is not responsible for individual reviews, review forms, moderation, sorting, provider branding unless required, or customer information.

## User Goals

Review Summary should help customers understand whether aggregate review data exists and reach the real review region when available.

## Merchant Goals

Review Summary should help merchants display verified provider or Shopify review aggregates without inventing reviews, counts, or provider capabilities.

## Structure

Review Summary consists of:

- Rating — required when review data is shown
- verified review count — required when available

Optional:

- read-reviews link
- anchor to an existing reviews region
- provider-required attribution

## Required Elements

Every shown Review Summary requires a verified aggregate rating and count, or a clearly qualified zero-review state from the provider.

## Optional Elements

Review Summary may include a concise review link and provider-required attribution. It should not show a link without a real destination.

## Supported Variants

### Standard

Rating and count appear with an optional review link.

### Compact

Concise aggregate context appears in Product Card or Product Information without competing with price.

### Zero Reviews

A neutral, verified zero-review state may appear where useful; it must not imply review quality.

### Unavailable

The summary is omitted or neutrally unavailable when the provider cannot supply data.

## Component-Specific Rules

Review Summary must reuse Rating, preserve provider data ownership, and make anchor navigation work without JavaScript.

Review Summary must not fabricate count, review excerpts, provider logos, customer names, or a reviews region. It must not repeat the same review message across product contexts without reason.

## Supported States

### Available

Verified aggregate data and optional destination render.

### Loading

An integration may use a restrained stable placeholder only when an actual asynchronous state exists.

### Zero Reviews

Neutral verified context is shown or the summary is omitted.

### Error or Unavailable

The component fails quietly without blocking Product Information or Buy Buttons.

## Responsive Behaviour

Review Summary should preserve text and link readability, stack safely when needed, and keep touch targets comfortable without changing reading order.

## Accessibility

Review Summary must use semantic HTML, Rating’s textual value, accessible link names, visible focus, WCAG 2.2 AA contrast, and restrained live updates. No count or state may rely on icons or color alone.

## Shopify Settings

Merchants may configure visibility, compact or standard presentation, and review-link display only when verified data and a real destination exist.

The Design System controls spacing, typography, icon sizing, focus styling, loading treatment, responsive behavior, and integration-failure behavior.

## Design Tokens

Review Summary should use review-summary-gap, review-count typography, review-link color, review-loading-surface, and review-focus-ring tokens.

## Motion Rules

Motion is limited to a restrained loading transition. Review counts, stars, and links must not pulse, count up, or animate as social pressure; reduced-motion preferences are respected.

## Performance Rules

Review Summary should prefer server-rendered initial data, defer non-critical provider work, avoid duplicate provider scripts and fetching, preserve stable geometry, and retain progressive enhancement for anchors and failure states.

## AI Guidelines

AI should use Review Summary only with verified aggregate data and a real review destination; preserve provider-neutral architecture; choose deterministic presentation; and hide unavailable data.

AI must not invent reviews, counts, activity, provider integration, or customer identity.

## Quality Checklist

### Data

- Aggregate value and count are verified.
- Link destination exists when shown.

### Accessibility

- Rating has textual parity and links are named.
- Loading and error messages are restrained.

### Hierarchy

- The summary remains secondary to product decision controls.

## Future Compatibility

Future Review Summary refinement should remain provider-neutral, privacy-aware, and aggregate-only. New capabilities require a verified integration, stable failure path, and no fabricated social proof.
