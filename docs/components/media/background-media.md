# Background Media

## Purpose

Background Media provides decorative or atmospheric image or video behind foreground content.

It supports a quiet, premium editorial setting while keeping meaningful media, product inspection, and narrative content in Responsive Image, Video, Product Gallery, Hero, Image Banner, or Slideshow.

## Responsibilities

Background Media is responsible for:

- rendering non-essential background image or video
- preserving full-bleed or contained background behavior
- supporting foreground separation through an approved overlay or surface
- managing focal positioning and optional mobile media alternatives
- providing a stable fallback background color and reserved geometry

Background Media is not responsible for:

- conveying essential product, instructional, or editorial information
- providing content alternatives for meaningful imagery
- foreground typography, layout, or action behavior
- Hero, Image Banner, or Slideshow content composition
- turning atmospheric video into an interactive player

## User Goals

Background Media should help customers:

- experience a calm visual atmosphere without reduced readability
- access all essential content without depending on the background asset
- browse without unexpected motion, audio, or layout movement

## Merchant Goals

Background Media should help merchants:

- apply an approved atmospheric asset only where it supports the brand story
- choose a controlled overlay or color scheme for readable foreground content
- retain a safe fallback when optional media is missing or replaced in the Theme Editor

## Structure

Background Media consists of:

- decorative image or video layer — optional
- fallback background color — required
- foreground content layer owned by the parent — required

Optional:

- overlay
- focal positioning
- real mobile asset override
- muted decorative video

## Required Elements

Every Background Media instance requires:

- a parent component with meaningful foreground content
- a stable background-color fallback
- preserved contrast for foreground text and controls
- reserved geometry supplied by the parent or Aspect Ratio
- confirmation that the media is decorative rather than essential

## Optional Elements

Background Media may include:

- Shopify-hosted image
- muted, playsinline decorative video
- subtle overlay or gradient
- focal position
- real mobile asset override
- full-bleed presentation controlled by the parent Section

## Supported Variants

### Image Background

Uses an approved decorative image behind foreground content.

### Video Background

Uses muted, playsinline decorative video only when motion is non-essential and reduced-motion fallback is available.

### Full-Bleed

The visual layer reaches the parent section edges while readable foreground content follows Container or Content Wrapper rules.

### Contained

Background Media remains inside an approved Surface or media region.

### Static Fallback

Uses a poster, image, or background color when media is unavailable or reduced motion is preferred.

## Component-Specific Rules

Background Media must:

- remain decorative and allow all essential information in foreground content
- use an overlay only when it improves WCAG 2.2 AA foreground contrast
- preserve focal subjects without irresponsible cropping
- use real responsive assets and stable geometry
- use a muted, playsinline, reduced-motion-safe video path when video is selected

Background Media must not:

- contain essential text, product detail, or action only inside imagery or motion
- use CSS background images for meaningful content
- autoplay audio or force motion
- invent an atmospheric image, video, or merchant story
- override Section, Container, Content Wrapper, or Hero responsibilities

## Supported States

### With Image

Approved decorative imagery appears behind readable foreground content.

### With Video

Decorative video remains muted and non-essential.

### Reduced Motion

Video is replaced by poster, static image, or fallback color.

### Missing Media

The parent retains its background color and foreground content without a misleading replacement.

### Theme Editor Update

Asset replacement preserves foreground hierarchy, contrast, and stable geometry.

## Responsive Behaviour

Background Media should:

- preserve foreground reading width and touch targets at every width
- use real mobile alternatives only when composition warrants them
- protect focal content through intentional object position
- avoid oversized downloads and fixed-position artifacts
- retain fallback color and readable content at 320 px, zoom, and large text settings

## Accessibility

Background Media must support:

- decorative treatment that does not create redundant screen-reader output
- foreground text and controls that meet WCAG 2.2 AA contrast
- no essential information embedded only in media
- reduced-motion fallback for decorative video
- no unexpected audio or keyboard-trapping interaction
- semantic HTML supplied by the parent foreground component

## Shopify Settings

Merchants may configure, where a parent supports it:

- approved image or video asset
- real mobile media override
- focal point
- approved overlay strength
- color scheme or fallback surface
- decorative video autoplay and loop where safe

The Design System controls:

- contrast thresholds
- responsive delivery candidates
- geometry and breakpoints
- video preload behavior
- overlay implementation
- motion timing and reduced-motion behavior

## Design Tokens

Background Media should use semantic tokens for:

- background-media-color
- background-media-overlay
- background-media-position
- background-media-ratio
- background-media-foreground
- background-media-radius

## Motion Rules

Background Media should remain still by default.

Decorative video may use muted, playsinline motion only when it supports an approved story, pauses when appropriate, and yields to reduced-motion preferences. Overlays and media should never animate merely for decoration.

## Performance Rules

Background Media should:

- reserve geometry and use a fallback color to prevent layout shift
- use responsive Shopify CDN image delivery
- lazy load non-critical media and avoid competing LCP candidates
- use poster and restrained preload behavior for video
- avoid duplicate requests, fixed attachment effects, and JavaScript layout measurement
- preserve progressive enhancement through static color, poster, or image fallback

## AI Guidelines

When generating storefronts, AI should:

- choose Background Media only for real approved decorative assets
- preserve foreground content and choose deterministic contrast-safe overlay settings
- prefer static imagery or color when media does not improve the customer task
- preserve focal subjects, responsive delivery, semantic HTML, and performance-first defaults
- defer essential media to Responsive Image or Video

AI must not fabricate atmosphere, hide information in media, or choose motion for novelty.

## Quality Checklist

### Purpose

- Background Media remains decorative.
- Foreground content carries all essential meaning and action.

### Accessibility

- Contrast is sufficient and motion has a static fallback.
- No redundant media announcement or unexpected audio occurs.

### Performance

- Geometry, fallback color, CDN delivery, and loading priority are deliberate.
- Background media does not create a competing LCP burden.

### AI Compatibility

- Approved merchant assets and focal subjects are preserved.
- No story, media, or overlay setting is fabricated.

## Future Compatibility

Future Background Media refinement should improve verified decorative presentation without becoming a Hero, Image Banner, video-player, or meaningful-image system.

Any new effect must preserve content independence, reduced-motion behavior, stable layout, and restrained visual noise.
