# Product Gallery

## Purpose

The Product Gallery is the primary visual component of the product page. It showcases product imagery and media in a way that helps customers confidently evaluate the product before purchasing.

The Product Gallery should prioritize the product itself—not interface controls.

Every interaction should make inspecting the product easier.

---

## Responsibilities

The Product Gallery is responsible for:

- displaying product media
- presenting images in the correct order
- supporting image exploration
- supporting multiple media types
- adapting across all devices
- maintaining accessibility
- loading media efficiently

The Product Gallery is not responsible for:

- selecting product variants
- displaying product information
- handling purchasing
- managing recommendations
- editing product media

---

## User Goals

The Product Gallery should help customers:

- inspect product quality
- examine product details
- understand colors and materials
- view multiple angles
- zoom confidently
- browse media naturally

---

## Merchant Goals

The Product Gallery should help merchants:

- present products beautifully
- improve customer confidence
- increase conversion
- showcase craftsmanship
- support rich product storytelling

Merchants should manage media—not gallery behavior.

---

## Structure

A Product Gallery consists of:

- Primary Media — required
- Media Navigation — required
- Thumbnail Navigation — optional
- Zoom Control — optional
- Fullscreen Viewer — optional
- Video — optional
- 3D Model — optional

---

## Required Elements

Every Product Gallery requires:

- primary product image
- media navigation
- responsive media
- accessible controls
- loading optimization

The first image should represent the product clearly.

---

## Optional Elements

The Product Gallery may include:

- thumbnails
- zoom
- fullscreen
- product video
- 3D model
- AR support
- image captions

Optional features should improve inspection—not distract from it.

---

## Supported Variants

### Standard

Displays one primary image with navigation.

Recommended for most storefronts.

---

### Thumbnail Gallery

Displays thumbnails alongside the primary image.

Suitable for products with multiple photographs.

---

### Carousel

Supports horizontal image browsing.

Recommended on mobile devices.

---

### Grid Gallery

Displays multiple images simultaneously.

Suitable for editorial product presentations.

---

### Fullscreen Gallery

Allows immersive product viewing.

Recommended for premium and luxury products.

---

## Component-Specific Rules

### Image Rules

Images should:

- remain high quality
- preserve aspect ratio
- avoid distortion
- load progressively
- maintain consistent cropping

The gallery should never crop important product details.

---

### Thumbnail Rules

Thumbnails should:

- represent each media item accurately
- indicate the active image
- remain easy to select
- support keyboard navigation

Thumbnails should remain visually secondary.

---

### Zoom Rules

Zoom should:

- activate predictably
- preserve image quality
- remain smooth
- support touch gestures
- support mouse interaction

Zoom should help customers inspect details rather than impress them.

---

### Fullscreen Rules

Fullscreen viewing should:

- occupy the viewport
- preserve image quality
- support keyboard navigation
- allow easy closing
- maintain logical image order

Focus should return to the triggering control after closing.

---

### Media Types

The gallery may support:

- Images
- Video
- 3D Models
- Shopify AR

Different media types should behave consistently within the same gallery.

---

### Navigation Rules

Navigation should support:

- previous
- next
- thumbnail selection
- swipe gestures
- keyboard navigation

Navigation controls should remain unobtrusive.

---

## Supported States

### Default

Gallery displays the primary image.

---

### Hover

Optional hover effects may appear on desktop.

---

### Zoomed

Image inspection is active.

---

### Fullscreen

Media occupies the viewport.

---

### Loading

Skeleton placeholders may appear.

Layout dimensions should remain stable.

---

## Responsive Behaviour

The Product Gallery should:

- prioritize vertical scrolling on mobile
- support swipe gestures
- adapt thumbnail placement
- preserve image quality
- avoid layout shifts

Desktop and mobile galleries should share the same content.

---

## Accessibility

Every Product Gallery must support:

- semantic media structure
- keyboard navigation
- visible focus indicators
- descriptive image alt text
- accessible controls
- screen reader compatibility
- reduced-motion preferences

Media controls should expose appropriate ARIA attributes.

---

## Shopify Settings

Merchants may configure:

- gallery layout
- image ratio
- thumbnail position
- show thumbnails
- enable zoom
- enable fullscreen
- enable videos
- enable 3D models

Merchants should not configure:

- animation timing
- spacing
- focus styles
- responsive behavior

These belong to the Design System.

---

## Design Tokens

The Product Gallery should use semantic tokens for:

- spacing
- border radius
- navigation size
- thumbnail spacing
- transitions
- overlay colors

Example token categories:

- gallery-spacing
- gallery-radius
- gallery-thumbnail-size
- gallery-overlay
- gallery-transition

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- fade
- image transition
- fullscreen transition
- zoom interpolation

Avoid:

- bouncing
- spinning
- decorative animations
- excessive scaling

Motion should reinforce inspection rather than entertainment.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Product Gallery should:

- lazy-load off-screen media
- preload the primary image
- optimize responsive images
- avoid layout shifts
- minimize JavaScript
- defer non-essential media

Gallery performance should remain excellent even with many images.

---

## AI Guidelines

When generating storefronts, AI should:

- prioritize high-quality imagery
- preserve logical media order
- enable zoom for products requiring detail
- support accessibility
- reuse documented gallery layouts
- avoid unnecessary effects

AI should never invent product media or reorder images without merchant intent.

---

## Quality Checklist

### Purpose

- Product is clearly presented.
- Media supports purchase decisions.

### Design

- Images remain dominant.
- Navigation is unobtrusive.
- Gallery hierarchy is clear.

### Accessibility

- Keyboard navigation works.
- Images include meaningful alt text.
- Focus indicators remain visible.

### Responsive

- Swipe gestures work.
- Images remain proportional.
- Layout adapts correctly.

### Performance

- Images load efficiently.
- No layout shifts occur.
- Media is lazy-loaded appropriately.

### AI Compatibility

- Gallery layout is deterministic.
- Media order is preserved.
- Existing gallery variants are reused.

---

## Future Compatibility

Before extending the Product Gallery, ask:

- Does the feature improve product inspection?
- Can an existing gallery variant support it?
- Will merchants understand the setting?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Product Gallery should evolve through refinement rather than expansion.

Every Product Gallery should showcase products beautifully, encourage confident purchasing, preserve performance, and deliver a premium inspection experience that remains calm, intuitive, and accessible.
