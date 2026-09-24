# Aspect Ratio

## Purpose

Aspect Ratio provides predictable media geometry and reserved layout space.

It supports stable, premium responsive presentation for real images and video without forcing all merchant assets into identical crops or duplicating Responsive Image delivery behavior.

## Responsibilities

Aspect Ratio is responsible for:

- reserving a stable inline-to-block media region
- providing approved semantic ratio variants
- coordinating intentional object-fit behavior with contained media
- preventing cumulative layout shift
- offering a safe fallback where native `aspect-ratio` support is unavailable

Aspect Ratio is not responsible for:

- image source delivery, alt text, or loading behavior
- media navigation, zoom, or playback
- setting page width, section spacing, or Grid gaps
- forcing merchant media into a crop without content justification

## User Goals

Aspect Ratio should help customers:

- browse media without disruptive layout movement
- view product and editorial imagery without distortion
- retain a stable visual rhythm across varied asset dimensions

## Merchant Goals

Aspect Ratio should help merchants:

- select a small set of understandable geometry variants where a parent supports it
- preserve real media proportions when that is the appropriate presentation
- avoid manual cropping, fixed heights, and layout adjustments

## Structure

Aspect Ratio consists of:

- ratio frame — required
- one media or placeholder child — required

Optional:

- object-fit intent supplied to the contained media
- focal position
- natural-ratio bypass for imagery that should not be framed

## Required Elements

Every Aspect Ratio requires:

- one semantic ratio or a verified intrinsic ratio
- stable reserved geometry before media loads
- an intentional fit relationship for media that may crop
- a child that remains responsive within the frame

## Optional Elements

Aspect Ratio may include:

- square, portrait, landscape, wide, or natural variant
- `cover` fit where crop is safe
- `contain` fit where complete product visibility matters
- focal-point-aware position
- a fallback implementation for browsers without native support

## Supported Variants

### Natural

Uses the asset’s intrinsic ratio. Recommended when product integrity or editorial composition must remain complete.

### Square

Provides a balanced repeated-media frame.

### Portrait

Supports fashion, editorial, and vertically composed content when the approved asset supports it.

### Landscape

Supports broad contextual media.

### Wide

Supports panoramic or video-oriented presentation.

## Component-Specific Rules

Aspect Ratio must:

- use native CSS `aspect-ratio` or an equivalent stable fallback
- preserve media proportions and never stretch an asset
- use `cover` only when focal content can remain visible
- use `contain` where complete product visibility is more important than edge fill
- allow natural ratio when no controlled crop is justified

Aspect Ratio must not:

- impose a uniform crop across unrelated media types
- use fixed pixel heights or JavaScript measurement
- nest ratio frames without a documented media reason
- determine alt text, source selection, or playback behavior
- create layout space without real media or Placeholder Image context

## Supported States

### Reserved

The frame reserves stable geometry before the child media loads.

### Filled

The media fills or contains within the frame according to its documented fit.

### Natural

The media follows intrinsic dimensions without an artificial crop.

### Missing Media

Placeholder Image may occupy the frame when a parent expects media. The frame must not imply a real asset exists.

## Responsive Behaviour

Aspect Ratio should:

- preserve semantic geometry from 320 px upward
- allow a parent to select approved responsive ratio changes only when composition genuinely requires them
- retain object-fit and focal positioning without distortion
- avoid overflow, fixed heights, and late layout recalculation
- support Theme Editor asset replacement and varying Shopify image proportions

## Accessibility

Aspect Ratio should:

- remain a non-interactive layout primitive with no unnecessary ARIA
- preserve semantic HTML and accessible media behavior from its child
- avoid clipping captions, controls, focus indicators, or meaningful media context
- support WCAG 2.2 AA outcomes through the contained media and foreground content
- retain logical DOM and reading order

## Shopify Settings

Merchants may configure, where a parent supports it:

- approved aspect-ratio variant
- fit intent
- focal point
- natural-ratio presentation

The Design System controls:

- exact ratio values
- fallback implementation
- responsive breakpoint behavior
- crop safety defaults
- focus and motion behavior

## Design Tokens

Aspect Ratio should use semantic tokens for:

- ratio-square
- ratio-portrait
- ratio-landscape
- ratio-wide
- ratio-natural
- media-fit
- media-position

## Motion Rules

Aspect Ratio should not animate geometry or crop position.

Contained media follows its own restrained motion rules. Ratio changes must not create layout shift, obscure content, or ignore reduced-motion preferences.

## Performance Rules

Aspect Ratio should:

- reserve space to prevent cumulative layout shift
- use native CSS with minimal markup
- require no JavaScript
- preserve progressive enhancement through intrinsic dimensions or a stable fallback
- avoid forced reflow, observers, and late geometry calculation

## AI Guidelines

When generating storefronts, AI should:

- choose natural ratio unless an approved content role justifies a semantic frame
- preserve merchant media integrity and focal subjects
- select deterministic ratio and fit settings from the documented variants
- reuse Responsive Image, Video, Placeholder Image, and layout primitives for their own roles
- avoid aggressive cropping, nesting, and arbitrary fixed heights

AI must not force a uniform crop or invent a media reason for a ratio frame.

## Quality Checklist

### Purpose

- Aspect Ratio owns geometry only.
- Source delivery, semantics, and playback remain with media primitives.

### Accessibility

- Child media semantics and focus remain intact.
- No content is clipped or reordered.

### Performance

- Geometry is reserved before load.
- No JavaScript measurement or layout shift is introduced.

### AI Compatibility

- Ratio and fit preserve real merchant media.
- Natural presentation remains the safe default.

## Future Compatibility

Future Aspect Ratio refinement should add only demonstrated semantic ratios and browser fallbacks without becoming an image crop, layout, or media-delivery system.

Any new ratio must preserve stable geometry, authentic asset presentation, responsive behavior, and deterministic AI selection.
