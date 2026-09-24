# Image Banner

## Purpose

The Image Banner combines visual media with concise messaging to create a strong editorial section that supports storytelling, product discovery, or promotional content.

Unlike the Hero, the Image Banner is intended to appear anywhere throughout a page and can be repeated without affecting document hierarchy.

Image Banner is a supporting editorial section, not a second homepage lead. It composes the canonical Hero hierarchy rather than competing with it.

The Image Banner should immediately communicate one clear message while maintaining the calm, premium visual language of Calinium.

---

## Responsibilities

The Image Banner is responsible for:

- presenting a featured image
- supporting brand storytelling
- highlighting products or collections
- communicating promotional messaging
- encouraging customer actions
- adapting across all devices
- remaining accessible

The Image Banner is not responsible for:

- acting as the page Hero
- replacing product pages
- displaying extensive product information
- presenting multiple competing promotions

These responsibilities belong to other components.

---

## User Goals

The Image Banner should help customers:

- discover featured content
- understand promotions quickly
- navigate confidently
- engage with important collections or products

---

## Merchant Goals

The Image Banner should help merchants:

- feature campaigns
- promote collections
- communicate seasonal messaging
- support conversion
- reinforce brand identity

Merchants should configure content—not component behavior.

---

## Structure

An Image Banner consists of:

- Background Image — required

Optional:

- Eyebrow
- Heading
- Supporting Text
- Button using the primary variant
- Button using the secondary variant
- Overlay
- Content Container

---

## Required Elements

Every Image Banner requires:

- responsive image
- accessible structure
- sufficient text contrast
- logical content hierarchy

The banner should communicate a single primary message.

---

## Optional Elements

The Image Banner may include:

- heading
- supporting paragraph
- one or two buttons
- overlay
- background color
- mobile image

Optional elements should reinforce—not compete with—the primary message.

---

## Supported Variants

### Editorial

Large photography with restrained typography.

Recommended for luxury brands.

---

### Collection

Highlights a featured collection.

Recommended for homepage merchandising.

---

### Promotion

Highlights seasonal campaigns or limited-time offers.

Messaging should remain concise.

---

### Lifestyle

Uses immersive lifestyle photography to reinforce brand identity.

Recommended for storytelling.

---

### Minimal

Uses restrained typography with generous whitespace.

Suitable for premium editorial experiences.

---

## Component-Specific Rules

### Image Rules

Images should:

- preserve aspect ratio
- remain responsive
- avoid distortion
- maintain visual quality
- preserve focal points across breakpoints

Images should communicate one clear idea.

---

### Content Rules

Content should:

- remain concise
- use clear hierarchy
- avoid excessive text
- maintain comfortable reading width

Long marketing copy should be avoided.

---

### Button Rules

The Image Banner may include:

- one primary button
- one optional secondary button

Buttons should follow the documented Button specification.

The primary action should receive greater visual emphasis.

---

### Overlay Rules

An overlay may be applied to:

- improve text readability
- improve contrast
- preserve image quality

Overlay opacity should remain subtle.

---

### Alignment Rules

Content may be aligned:

- left
- center
- right

Vertical positioning may be:

- top
- center
- bottom

Alignment should prioritize readability rather than symmetry.

---

## Supported States

### Default

Banner displays normally.

---

### Loading

Background image loads progressively.

Layout dimensions should remain stable.

---

### Error

If media cannot load, alternative styling should preserve layout integrity.

---

## Responsive Behaviour

The Image Banner should:

- adapt across all devices
- preserve image focal points
- maintain readable typography
- avoid horizontal scrolling
- support responsive media

Mobile layouts should prioritize readability over image coverage.

---

## Accessibility

Every Image Banner must support:

- semantic heading structure
- accessible buttons
- sufficient contrast
- descriptive image alternative text
- keyboard navigation
- reduced-motion preferences
- screen reader compatibility

Decorative images should be hidden from assistive technologies when appropriate.

---

## Shopify Settings

Merchants may configure:

- desktop image
- mobile image
- heading
- supporting text
- primary button
- secondary button
- content alignment
- vertical alignment
- overlay opacity
- color scheme
- section height
- content width

Merchants should not configure:

- typography scale
- spacing
- responsive breakpoints
- animation timing

These belong to the Design System.

---

## Design Tokens

The Image Banner should use semantic tokens for:

- spacing
- typography
- colors
- overlay opacity
- content width
- section height
- transitions

Example token categories:

- image-banner-spacing
- image-banner-overlay
- image-banner-heading
- image-banner-height
- image-banner-transition

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- fade transition
- subtle image reveal
- gentle content fade

Avoid:

- bouncing
- zoom effects
- aggressive parallax
- decorative animations

Motion should support the content rather than distract from it.

---

## Performance Rules

The Image Banner should:

- optimize responsive images
- lazy-load below-the-fold media
- avoid layout shifts
- minimize JavaScript
- contribute positively to Core Web Vitals

Critical banners above the fold should prioritize image loading performance.

---

## AI Guidelines

When generating storefronts, AI should:

- communicate one clear message
- choose imagery that supports the content
- maintain restrained typography
- preserve accessibility
- reuse Button components
- avoid excessive promotional messaging

AI should never overload the banner with unnecessary content.

AI must not use Image Banner as the canonical homepage Hero, create competing lead messaging, invent campaign content, or select media without approved merchant assets.

---

## Quality Checklist

### Purpose

- The message is immediately clear.
- The primary action is obvious.

### Design

- Typography remains the visual anchor.
- Images support—not dominate—the content.
- Whitespace remains generous.

### Accessibility

- Heading hierarchy is correct.
- Contrast meets accessibility standards.
- Interactive elements are keyboard accessible.

### Responsive

- Images preserve focal points.
- Layout adapts gracefully.
- Typography remains readable.

### Performance

- Images are optimized.
- No layout shifts occur.
- Media loads efficiently.

### AI Compatibility

- Component structure is deterministic.
- Existing design patterns are reused.
- Merchant content remains accurate.

---

## Future Compatibility

Before extending the Image Banner, ask:

- Does the addition strengthen the primary message?
- Can an existing banner variant satisfy the requirement?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Image Banner should evolve through refinement rather than expansion.

Every Image Banner should deliver focused visual storytelling, preserve accessibility and performance, and reinforce the timeless, premium design philosophy that defines Calinium.
