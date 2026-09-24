# Logo

## Purpose

Logo renders an authentic merchant brand mark or a restrained text fallback at an appropriate size and proportion.

It supports clear brand recognition in premium header and footer contexts without inventing, redrawing, recoloring, or visually altering merchant-provided artwork.

## Responsibilities

Logo is responsible for:

- rendering an approved image logo or real text fallback
- preserving intrinsic proportions and transparent padding
- constraining maximum rendered dimensions through tokens
- supporting light and dark variants when real merchant assets exist
- providing accurate accessible brand naming and homepage-link behavior

Logo is not responsible for:

- creating a logo, brand name, or alternate mark
- defining Header, Footer, or navigation behavior
- modifying an SVG’s artwork, colors, or proportions
- replacing Icon System behavior
- using decorative effects to imply brand quality

## User Goals

Logo should help customers:

- recognize the merchant consistently
- navigate to the homepage when the logo is a home link
- understand the brand mark without redundant screen-reader content
- view the mark clearly without distortion or visual noise

## Merchant Goals

Logo should help merchants:

- use their approved logo consistently across Shopify storefront contexts
- provide an appropriate light or dark asset when it exists
- select a controlled display width without managing raw CSS or SVG behavior

## Structure

Logo consists of:

- merchant-approved logo image or real store-name text fallback — required

Optional:

- homepage link
- light or dark logo asset
- visually hidden brand name where image context requires it
- header or footer context supplied by the parent component

## Required Elements

Every Logo requires:

- an authentic merchant mark or real `shop.name` fallback
- preserved intrinsic aspect ratio
- a controlled maximum rendered dimension
- an accurate accessible name when meaningful
- a meaningful homepage link only when the parent context supports it

## Optional Elements

Logo may include:

- light and dark approved variants
- text fallback using the real store name
- a homepage link with an accessible name
- an appropriate transparent padding allowance from the source asset

## Supported Variants

### Image Logo

Uses the approved merchant-provided brand mark.

### Text Fallback

Uses the real Shopify store name when no logo asset is available. It must not invent a slogan or substitute mark.

### Light or Dark Variant

Uses a genuine approved alternative asset only where background contrast requires it.

### Linked Home Logo

Links to the storefront root through a clear accessible name. The current-home context remains understandable.

## Component-Specific Rules

Logo must:

- preserve original proportions, colors, and meaningful transparent space
- use a safe raster or SVG rendering path appropriate to the merchant asset
- use actual brand naming for accessible text and links
- fall back to real `shop.name` when no approved logo exists
- retain sufficient contrast against the surrounding header or footer surface

Logo must not:

- fabricate or regenerate a brand mark
- crop, stretch, recolor, filter, or overlay merchant artwork
- use filename-derived alt text
- duplicate the logo’s spoken brand name adjacent to an identically named link
- treat an untrusted SVG as executable markup

## Supported States

### Image Available

The approved mark renders at a controlled size with preserved proportions.

### Text Fallback

The real store name renders when an image logo is unavailable.

### Contrast Variant

An approved light or dark mark is selected for a documented background context.

### Linked

The logo links to the storefront root and has visible focus.

### Missing

The parent uses the real text fallback. Logo does not leave a misleading empty brand area.

## Responsive Behaviour

Logo should:

- use controlled tokenized maximum dimensions rather than fixed scaling
- preserve visible proportions at 320 px, zoom, and large text settings
- avoid crowding Header or Footer controls
- retain touch-friendly linked dimensions and focus visibility
- use the same authentic asset unless a real mobile variant is approved

## Accessibility

Logo must support:

- semantic `img` or text output
- accurate accessible brand naming
- an accessible name for a homepage link
- empty alt text only when equivalent nearby text already names the same mark
- visible focus for linked logos
- WCAG 2.2 AA contrast for text fallback and surrounding context

## Shopify Settings

Merchants may configure, where the parent supports it:

- approved logo asset
- approved light or dark variant
- logo width within controlled limits
- homepage-link visibility where appropriate

The Design System controls:

- maximum dimensions
- responsive scaling
- header and footer spacing
- focus styling
- SVG safety behavior
- motion timing

## Design Tokens

Logo should use semantic tokens for:

- logo-width-header
- logo-width-footer
- logo-max-height
- logo-foreground
- logo-focus-ring
- logo-clear-space

## Motion Rules

Logo should not animate, scale, shimmer, or reveal decoratively.

A linked Logo may inherit a restrained focus transition. Any change between approved contrast variants must not flash or obscure the brand mark and must respect reduced-motion preferences.

## Performance Rules

Logo should:

- use an appropriately sized Shopify asset or safe SVG reference
- preserve intrinsic dimensions to prevent layout shift
- avoid duplicate logo downloads and JavaScript measurements
- render a real text fallback without client-side dependency
- remain stable during Shopify Theme Editor updates
- preserve progressive enhancement when image media is unavailable

## AI Guidelines

When generating storefronts, AI should:

- preserve the exact merchant-provided logo and brand name
- select a deterministic approved variant based on verified surface context
- use text fallback only from the real Shopify store name
- preserve semantic HTML, accessible naming, and tokenized sizing
- avoid logo treatment when whitespace or a simple mark is sufficient

AI must not invent, redraw, alter, crop, or describe unverified brand artwork.

## Quality Checklist

### Purpose

- Logo renders a real brand mark or real store-name fallback.
- Header and Footer retain ownership of placement and navigation context.

### Accessibility

- Brand and link names are accurate without redundant announcements.
- Focus and contrast remain clear.

### Performance

- Geometry is stable and the asset is delivered efficiently.
- No runtime measurement or duplicate request is required.

### AI Compatibility

- Merchant artwork and identity remain unchanged.
- No invented logo or brand claim appears.

## Future Compatibility

Future Logo refinement should improve verified asset variants and Shopify Theme Editor resilience without introducing logo generation, icon behavior, or header-specific implementation rules.

Any new treatment must preserve merchant artwork, stable geometry, semantic HTML, and quiet luxury restraint.
