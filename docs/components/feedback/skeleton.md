# Skeleton

## Purpose

Skeleton reserves expected content geometry while a known layout is loading. It reduces layout shift without pretending to be real product, review, price, or merchant content.

## Responsibilities

Skeleton owns text-line, media, card, and list geometry placeholders; count consistency; restrained shimmer; and transition to actual content.

Skeleton is not responsible for indeterminate action waiting, measurable progress, error state, Empty State, fake product detail, or dynamic data claims.

## User Goals

Skeleton should help customers perceive that expected page structure is loading while preserving orientation and stable layout.

## Merchant Goals

Skeleton should help merchants maintain a calm loading presentation without exposing fake products, ratings, prices, names, or content.

## Structure

Skeleton consists of geometry placeholders corresponding to expected real content — required.

Optional: text lines, media block, card group, list group, and restrained non-semantic shimmer.

## Required Elements

Every Skeleton requires an expected real content structure, stable reserved dimensions, realistic item count, and a completion or failure path.

## Optional Elements

Text, media, card, and list shapes may appear only when they reflect the actual layout. Shimmer remains optional and non-essential.

## Supported Variants

### Text

Reserves expected heading or body-line geometry.

### Media

Reserves real media ratio through Aspect Ratio.

### Card

Mirrors neutral expected card geometry without fake details.

### List

Mirrors a bounded repeated list or grid count.

## Component-Specific Rules

Skeleton must resemble expected layout geometry, maintain count consistency, and stop when content, Empty State, or error becomes known.

Skeleton must not include fake ratings, prices, product names, images, review counts, progress values, or long-running shimmer that conceals preventable slow rendering.

## Supported States

### Loading

Expected geometry is reserved.

### Reduced Motion

Static placeholder treatment replaces shimmer.

### Resolved

Actual content replaces skeleton without unnecessary layout shift.

### Error or Empty

Skeleton is replaced by accurate error or Empty State; it must not conceal either.

## Responsive Behaviour

Skeleton should mirror responsive layout, preserve Container/Grid/Aspect Ratio rules, and avoid overflow or changed item counts at 320 px, zoom, and large text settings.

## Accessibility

Skeleton must use semantic HTML context from the parent, remain non-descriptive to assistive technology when decorative, preserve reading order, support WCAG 2.2 AA contrast where visible, and avoid repeated live announcements. Any real loading label belongs to the parent or Loading Spinner.

## Shopify Settings

Merchants may configure no skeleton content values. A parent may enable its documented loading state only when real asynchronous content exists.

The Design System controls geometry, count, tone, shimmer, contrast, breakpoints, and reduced-motion behavior.

## Design Tokens

Skeleton should use skeleton-surface, skeleton-highlight, skeleton-radius, skeleton-line-height, skeleton-media-ratio, skeleton-gap, and skeleton-motion tokens.

## Motion Rules

Subtle shimmer is optional and must stop or become static under reduced motion. No flashing, fake progress, or prolonged decorative animation is allowed.

## Performance Rules

Skeleton should use lightweight CSS, stable geometry, minimal JavaScript, no heavy assets, no polling, progressive enhancement, and Theme Editor-safe cleanup. It must not delay actual content rendering.

## AI Guidelines

AI should use Skeleton only when real expected structure is known, generate deterministic geometry from existing components, and replace it promptly with verified content, Empty State, or error.

AI must not fabricate merchant content, product data, review data, or a loading state.

## Quality Checklist

### Geometry

- Placeholder structure matches expected real content.
- Layout shift is prevented.

### Integrity

- No fake prices, names, ratings, or imagery appear.
- Empty and error states replace skeleton accurately.

### Accessibility

- Decorative placeholders do not create noisy announcements.
- Reduced motion removes shimmer.

## Future Compatibility

Future Skeleton refinement should remain geometry-led and content-honest. New shape families require a demonstrated corresponding component and must not become an alternate content or progress system.
