# Placeholder Image

## Purpose

Placeholder Image provides an intentional, non-misleading fallback when expected media is unavailable.

It preserves stable geometry and Theme Editor clarity without appearing to be real merchant photography, product imagery, or generated storefront content.

## Responsibilities

Placeholder Image is responsible for:

- presenting an intentional missing-media fallback
- reserving predictable geometry through Aspect Ratio where appropriate
- distinguishing Theme Editor guidance from storefront fallback
- using neutral abstract shape, safe icon, or Shopify placeholder treatment
- preventing misleading product or editorial presentation

Placeholder Image is not responsible for:

- replacing approved merchant media in a finished storefront
- acting as a loading skeleton
- inventing a product, campaign, scene, or brand asset
- providing gallery, card, or layout behavior
- communicating an error without surrounding contextual content

## User Goals

Placeholder Image should help customers:

- understand that optional media is unavailable without being misled
- retain a stable page layout while content loads or is intentionally absent
- continue using the surrounding content without distraction

## Merchant Goals

Placeholder Image should help merchants:

- see predictable Theme Editor fallback geometry before selecting an asset
- avoid accidental publication of misleading default photography
- maintain a calm storefront when optional media is not provided

## Structure

Placeholder Image consists of:

- neutral placeholder frame — required

Optional:

- abstract non-product shape
- safe Icon System symbol when it improves editor clarity
- concise editor-only contextual label
- Aspect Ratio frame

## Required Elements

Every Placeholder Image requires:

- clear distinction from real merchant media
- stable geometry when a media region is expected
- neutral visual treatment
- appropriate decorative or contextual accessibility treatment
- no invented product or lifestyle imagery

## Optional Elements

Placeholder Image may include:

- Shopify-provided placeholder graphic
- abstract shape or non-semantic icon
- Theme Editor-only label explaining the missing asset
- background color aligned with the active color scheme

## Supported Variants

### Theme Editor Placeholder

Helps merchants identify an empty media setting while editing. It should not imply production content exists.

### Storefront Fallback

Provides a neutral, restrained region when optional media is absent but the surrounding component remains useful.

### Product-Safe Fallback

Uses an unmistakably non-product graphic. It must never resemble a real item for sale.

### Decorative Placeholder

Uses no accessible name when it is purely visual and surrounding text already explains the state.

## Component-Specific Rules

Placeholder Image must:

- remain visually distinct from authentic merchant photography
- preserve predictable media geometry
- distinguish loading skeletons from persistent missing-media states
- use a concise contextual label only when it provides real value
- allow a parent component to omit optional media instead when that is clearer

Placeholder Image must not:

- display fabricated product, lifestyle, or campaign imagery
- use a realistic photo, generated photography, or unverified brand mark
- imply inventory, product availability, or visual details
- replace a required product image without a clear customer-safe fallback policy
- become a permanent decorative asset in a finished premium presentation

## Supported States

### Theme Editor Empty

An editor-facing fallback makes a missing setting clear without fabricating storefront content.

### Storefront Optional Media Missing

A neutral fallback appears only when the surrounding content remains meaningful.

### Loading Skeleton Distinction

Placeholder Image is not used as a skeleton. Loading feedback belongs to the relevant content or feedback component.

### Replaced

The placeholder is removed cleanly when a merchant selects a real asset.

## Responsive Behaviour

Placeholder Image should:

- use Aspect Ratio or intrinsic fallback geometry to avoid layout shift
- remain legible and neutral at 320 px, zoom, and large text settings
- avoid text overflow or icon crowding
- preserve parent Container, Grid, and Surface behavior
- remain stable when Theme Editor media settings are added, removed, or replaced

## Accessibility

Placeholder Image must support:

- empty alt text when the placeholder is decorative
- concise contextual text outside the image when a missing state needs explanation
- no filename-derived, fabricated, or redundant alternative text
- semantic HTML supplied by the parent context
- WCAG 2.2 AA contrast for any visible editor or fallback label

## Shopify Settings

Merchants may configure, where a parent supports it:

- optional fallback visibility
- neutral color scheme
- editor-only guidance text when it is accurate

The Design System controls:

- placeholder geometry
- abstract treatment
- icon sizing
- contrast
- responsive behavior
- motion timing

## Design Tokens

Placeholder Image should use semantic tokens for:

- placeholder-background
- placeholder-foreground
- placeholder-border
- placeholder-radius
- placeholder-icon-size
- placeholder-label-gap

## Motion Rules

Placeholder Image should not animate decoratively.

When a real asset replaces it in the Theme Editor, a restrained state transition may occur without delaying content, shifting layout, or disregarding reduced-motion preferences.

## Performance Rules

Placeholder Image should:

- use lightweight CSS, Shopify placeholder output, or an existing safe icon
- reserve stable geometry without loading external media
- require no JavaScript
- preserve progressive enhancement
- avoid visual effects, observers, and layout measurement

## AI Guidelines

When generating storefronts, AI should:

- prefer omission of optional media when it creates a clearer customer experience
- use Placeholder Image only for an intentional documented fallback
- generate deterministic neutral fallback settings from approved context
- preserve merchant assets and never present placeholders as real content
- use semantic HTML, accessibility-safe labels, and design tokens

AI must not invent product imagery, lifestyle photography, claims, or brand artwork to fill a missing-media state.

## Quality Checklist

### Purpose

- Placeholder Image is unmistakably not real merchant media.
- It is distinct from a loading skeleton and from an error-message system.

### Accessibility

- Decorative placeholders are silent to screen readers.
- Contextual missing-media labels are accurate and sufficiently contrasted.

### Performance

- Geometry is stable without network media or JavaScript.
- Theme Editor replacement is resilient.

### AI Compatibility

- No asset, product, brand mark, or visual claim is fabricated.
- Omission remains preferred where appropriate.

## Future Compatibility

Future Placeholder Image refinement should improve Theme Editor clarity and documented fallback behavior without becoming a generated-image, skeleton, product-card, or error-state system.

Any new placeholder treatment must remain neutral, non-misleading, stable, Shopify-native, and performance-first.
