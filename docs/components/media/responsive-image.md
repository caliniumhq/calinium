# Responsive Image

## Purpose

Responsive Image is Calinium’s reusable primitive for delivering a real merchant image at an appropriate size, with stable geometry and accurate accessible context.

It supports product-first imagery and editorial restraint for a premium storefront without owning gallery navigation, zoom, slideshow behavior, or surrounding narrative.

## Responsibilities

Responsive Image is responsible for:

- Shopify-native image delivery through `image_url` and `image_tag` patterns
- responsive source selection through `srcset` and `sizes`
- intrinsic dimensions or reserved aspect-ratio geometry
- loading, decoding, and fetch-priority decisions
- meaningful or decorative alt behavior
- focal-point-aware fit and object-position behavior

Responsive Image is not responsible for:

- Product Gallery navigation, zoom, or media sequencing
- Hero, Image Banner, Slideshow, Product Card, or layout composition
- inventing merchant alt text or visual claims
- runtime JavaScript source selection

## User Goals

Responsive Image should help customers:

- view accurate product and editorial imagery quickly
- inspect content without distortion or unexpected layout movement
- receive useful text alternatives when an image conveys information
- browse comfortably on any device and connection

## Merchant Goals

Responsive Image should help merchants:

- preserve authentic Shopify-hosted imagery and focal subjects
- use a mobile image override where a real alternative asset exists
- retain image integrity without managing delivery candidates or browser behavior

## Structure

Responsive Image consists of:

- a real Shopify image asset — required
- image element or `picture` source set — required

Optional:

- mobile image override
- meaningful alt text supplied by verified asset context
- decorative designation with empty alt text
- caption through a surrounding figure
- accessible image link with a real link name

## Required Elements

Every Responsive Image requires:

- an authentic merchant or Shopify asset
- stable intrinsic width and height or an Aspect Ratio wrapper
- context-appropriate `sizes` and width candidates
- loading behavior appropriate to its viewport role
- accurate meaningful or decorative treatment

## Optional Elements

Responsive Image may include:

- a mobile source override
- focal-point-aware crop behavior
- `contain` or `cover` fit when the content context supports it
- an image link only when an accessible link name exists
- a caption owned by the surrounding content component

## Supported Variants

### Natural

Uses the asset’s intrinsic ratio. Recommended for product imagery and editorial images that must preserve their full composition.

### Framed

Uses Aspect Ratio to reserve a documented region while preserving image integrity through intentional fit behavior.

### Responsive Source

Uses a real mobile asset through `picture` when the merchant provided one.

### Decorative

Uses empty alt text when surrounding content already conveys the image’s non-essential purpose.

## Component-Specific Rules

Responsive Image must:

- prefer Shopify CDN output, `srcset`, and `sizes` over one-size delivery
- use lazy loading below the fold and restrained eager loading for deliberate LCP candidates
- set high fetch priority only for a genuinely critical first-view image
- preserve focal subjects without aggressive cropping or stretching
- use an empty alt attribute for decorative imagery
- omit a link when no accessible link name is available

Responsive Image must not:

- use filename-derived alt text
- describe unseen people, materials, locations, or claims
- use CSS background images for meaningful imagery
- mark every image as eager or high priority
- fabricate an image when the merchant asset is missing

## Supported States

### Available

The image renders with stable geometry and appropriate delivery behavior.

### Loading

Reserved dimensions prevent cumulative layout shift while browser-native loading proceeds.

### Decorative

The image is removed from redundant screen-reader output through empty alt text.

### Missing

The parent component omits optional media or uses Placeholder Image. Responsive Image does not invent a replacement.

## Responsive Behaviour

Responsive Image should:

- choose suitable Shopify width candidates through `srcset` and `sizes`
- use a real mobile asset only when it improves the composition
- preserve natural ratio or documented Aspect Ratio from 320 px upward
- avoid oversized downloads, horizontal overflow, and distorted crops
- allow translated surrounding content and Shopify Theme Editor replacements to reflow safely

## Accessibility

Responsive Image must support:

- semantic HTML `img` or `picture` output
- meaningful, concise alt text from verified merchant data or context
- empty alt text for decorative imagery
- accessible names for linked images
- WCAG 2.2 AA context and contrast when media supports foreground text
- no essential information available only in the image without equivalent text

## Shopify Settings

Merchants may configure, where a parent supports it:

- image asset
- mobile image override
- focal point or fit intent
- decorative designation
- verified alt text when Shopify media data does not provide it

The Design System controls:

- width candidates
- `sizes`, loading, decoding, and fetch-priority defaults
- breakpoint logic
- fallback styling
- maximum delivery size

## Design Tokens

Responsive Image should use semantic tokens for:

- media-fit
- media-position
- media-radius
- media-background
- media-loading-surface
- media-caption-gap

## Motion Rules

Responsive Image should not animate by default.

Subtle opacity reveal is acceptable only when it does not conceal content, delay LCP, or conflict with reduced-motion preferences. Zoom, slideshow, and hover behavior belong to their dedicated components.

## Performance Rules

Responsive Image should:

- use Shopify CDN delivery, `srcset`, `sizes`, and browser-native decoding
- reserve geometry to prevent cumulative layout shift
- lazy load non-critical imagery and treat the LCP candidate deliberately
- avoid duplicate image downloads and JavaScript media measurement
- remain stable through Shopify Theme Editor rerenders
- preserve progressive enhancement when optional media behavior is unavailable

## AI Guidelines

When generating storefronts, AI should:

- preserve exact merchant-provided imagery, product color, proportions, texture, and craftsmanship
- choose meaningful or decorative treatment from verified content role
- generate deterministic responsive settings from approved layout context
- preserve focal subjects and prefer natural ratios when crop confidence is low
- use verified merchant data for alt text and reuse existing media primitives

AI must not invent images, visual details, certifications, or alt text claims.

## Quality Checklist

### Purpose

- Responsive Image owns delivery, geometry, and image semantics only.
- Gallery and content behavior remain with their dedicated components.

### Accessibility

- Alt text is accurate, or decorative media has empty alt text.
- Linked images have accessible names.

### Performance

- `srcset`, `sizes`, and stable geometry are present.
- LCP handling is deliberate; non-critical media is lazy loaded.

### AI Compatibility

- Merchant assets remain authentic and unmodified.
- No visual detail or fallback asset is fabricated.

## Future Compatibility

Future refinement should improve Shopify-native responsive delivery and verified media metadata without creating a gallery, card, or JavaScript image-selection system.

Any new variant must preserve image integrity, stable layout, semantic HTML, and deterministic AI selection.
