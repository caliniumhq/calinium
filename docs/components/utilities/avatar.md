# Avatar

## Purpose

Avatar presents a verified person, organization, or account identity through approved image, initials, or neutral fallback. It remains a small identity cue, not a profile-card, account-status, or customer-data system.

## Responsibilities

Avatar owns identity image rendering, initials or neutral fallback, person versus organization context, controlled size, and meaningful or decorative accessible naming.

Avatar is not responsible for identity verification, account status, profile actions, customer identification, or inferring sensitive or unverified personal data.

## User Goals

Avatar should help customers recognize a verified identity where that context is genuinely useful.

## Merchant Goals

Avatar should help merchants show approved organization or contributor identity without inventing personal imagery or profile behavior.

## Structure

Avatar consists of verified image, initials, or neutral fallback — required.

Optional: accessible name, group context, and decorative treatment when adjacent text already names identity.

## Required Elements

Every Avatar requires verified identity context, preserved aspect ratio, controlled size, and a neutral fallback when approved data is unavailable.

## Optional Elements

Image, verified initials, and small group presentation may appear when useful. Groups must remain limited and each identity must remain understandable.

## Supported Variants

### Image

Verified person or organization image.

### Initials

Verified non-sensitive initials when appropriate.

### Neutral

No identity claim when data is unavailable.

### Compact, Standard, or Large

Controlled size based on context.

## Component-Specific Rules

Avatar must reuse Responsive Image and Aspect Ratio rules, preserve authentic identity data, and use neutral fallback where verification is unavailable.

Avatar must not invent images, infer initials, identify anonymous customers, imply status, or become an interactive profile control.

## Supported States

### Available

Verified image or initials render.

### Missing

Neutral fallback renders without identity claim.

### Decorative

Avatar is silent when adjacent text provides equivalent identity.

## Responsive Behaviour

Avatar should retain intrinsic geometry, readable group spacing, and no overflow at narrow widths, zoom, and large text settings.

## Accessibility

Avatar must use semantic HTML, accurate accessible naming when meaningful, empty alt treatment when decorative, WCAG 2.2 AA surrounding contrast, and no color-only identity distinction.

## Shopify Settings

Merchants may configure approved image, verified display name, organization context, and controlled size where the parent has real identity data.

The Design System controls dimension, crop, fallback appearance, spacing, focus context, and breakpoints.

## Design Tokens

Avatar should use avatar-size-compact, avatar-size-standard, avatar-size-large, avatar-radius, avatar-surface, and avatar-group-gap tokens.

## Motion Rules

Avatar should not animate decoratively. Image replacement may use a restrained transition that respects reduced-motion preferences.

## Performance Rules

Avatar should use responsive Shopify CDN delivery, stable geometry, lazy loading when non-critical, minimal JavaScript, and progressive enhancement through neutral fallback.

## AI Guidelines

AI should use Avatar only with verified identity data, select deterministic image/initial/neutral state, preserve privacy, and reuse Responsive Image.

AI must not invent people, organization marks, initials, account state, or customer data.

## Quality Checklist

### Data

- Identity is verified or neutral.
- No sensitive inference occurs.

### Accessibility

- Meaningful and decorative alternatives are distinct.
- Image does not provide the sole identity context when text is required.

### Scope

- Avatar is not a profile or account component.

## Future Compatibility

Future Avatar refinement should remain identity-presentation-only. Any group, account, or user-data expansion requires verified source, privacy review, and a demonstrated storefront need.
