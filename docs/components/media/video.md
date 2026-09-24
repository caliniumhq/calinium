# Video

## Purpose

Video defines the media asset and its semantic presentation for a Shopify storefront.

It supports a real merchant story or product context through hosted Shopify video, and compatible external references where the theme already supports them, for a premium storefront without defining a custom playback interface.

## Responsibilities

Video is responsible for:

- selecting the video asset and poster image
- distinguishing informational from decorative video
- defining captions, transcript, fallback, and accessible context requirements
- setting safe autoplay, loop, muted, playsinline, controls, and preload intent
- preserving stable video geometry

Video is not responsible for:

- custom play, mute, timeline, fullscreen, or focus behavior
- Product Gallery media navigation
- Hero or Slideshow composition
- inventing captions, transcripts, or merchant claims

## User Goals

Video should help customers:

- understand useful product or brand context without unexpected audio
- access essential information without relying solely on motion
- control informational playback predictably
- retain a stable, performant page experience

## Merchant Goals

Video should help merchants:

- use authentic hosted video and an appropriate poster image
- choose restrained playback options for a real storytelling purpose
- retain clear fallback behavior when optional video is absent or unavailable

## Structure

Video consists of:

- real hosted Shopify video or supported external reference — required
- poster image or stable media geometry — required when the video is not immediately visible

Optional:

- captions track
- transcript or equivalent nearby text
- muted autoplay
- loop
- native controls
- static-image fallback

## Required Elements

Every Video requires:

- a real merchant-approved media source
- a meaningful or decorative designation
- stable geometry
- no unexpected audio
- fallback content when video conveys essential information

## Optional Elements

Video may include:

- poster image
- native browser controls
- captions for spoken content
- transcript or equivalent text where video communicates essential information
- muted, playsinline autoplay for an atmospheric, non-essential loop
- loop behavior where a brief cycle does not obscure understanding

## Supported Variants

### Informational

Video communicates product, craft, instruction, or brand information. It requires accessible context and controls.

### Decorative

Video supports atmosphere only. It must be muted, non-essential, and absent from redundant assistive output.

### Hosted Shopify Video

Uses Shopify-hosted video with native media behavior.

### Compatible External Reference

Uses an existing supported external source only when its accessible title, poster, fallback, and privacy behavior are appropriate.

## Component-Specific Rules

Video must:

- use muted and `playsinline` behavior for autoplay
- respect reduced-motion preferences by showing poster or static fallback instead of forced movement
- use `preload="metadata"` or a more restrained setting unless immediate playback is necessary
- provide captions for spoken informational video and transcript support where appropriate
- keep essential information available through text, captions, or equivalent content

Video must not:

- autoplay audio
- use video merely for novelty or as a substitute for missing merchant imagery
- hide essential text only inside moving imagery
- invent a transcript, speaker, product claim, or visual detail
- define custom control behavior owned by Video Player

## Supported States

### Available

The approved video and its poster or geometry are ready to render.

### Poster

The poster image represents an unloaded, paused, or reduced-motion video state.

### Reduced Motion

Autoplay is disabled and static context remains available.

### Missing or Unavailable

The parent omits optional video or uses an intentional static fallback. Video does not fabricate media.

### Error

A concise fallback preserves the surrounding content without exposing technical failure details.

## Responsive Behaviour

Video should:

- retain intrinsic or Aspect Ratio geometry at every width
- use a real mobile poster or media alternative only when justified
- preserve controls, captions, and foreground contrast at narrow widths
- avoid automatic video download or playback when it is not needed
- remain resilient to Theme Editor asset replacement and missing optional fields

## Accessibility

Video must support:

- semantic native video where supported
- semantic HTML for the video, captions, and equivalent surrounding context
- captions for spoken content
- transcript or equivalent content where appropriate
- keyboard-operable native controls for informational playback
- no unexpected audio
- reduced-motion fallback
- WCAG 2.2 AA contrast for overlays, posters, and controls

## Shopify Settings

Merchants may configure, where a parent supports it:

- hosted video or supported external reference
- poster image
- autoplay, loop, muted, and controls visibility
- verified title or accessible context
- decorative designation

The Design System controls:

- preload defaults
- responsive delivery logic
- control dimensions
- reduced-motion behavior
- fallback styling and motion timing

## Design Tokens

Video should use semantic tokens for:

- video-ratio
- video-background
- video-poster-surface
- video-control-contrast
- video-overlay-strength
- video-radius

## Motion Rules

Video motion must be restrained and content-led.

Autoplay is off by default, must be muted when enabled, pauses or stops when appropriate, and must never be the sole way to receive essential information. Reduced-motion preferences take priority.

## Performance Rules

Video should:

- use optimized poster images and stable geometry
- prevent cumulative layout shift through reserved video geometry
- use restrained preload behavior
- avoid autoplay-heavy pages and duplicate downloads
- defer external playback through the existing supported facade when appropriate
- require no JavaScript for the core hosted-media fallback
- preserve progressive enhancement when playback enhancement is unavailable

## AI Guidelines

When generating storefronts, AI should:

- select video only when an approved merchant asset supports a real product or story purpose
- preserve the exact media asset and use verified captions or context
- choose deterministic, performance-safe playback defaults
- prefer a static image when movement is not necessary
- preserve product appearance and never infer unseen visual details

AI must not fabricate video, transcripts, claims, or autoplay rationale.

## Quality Checklist

### Purpose

- Video owns asset semantics and requirements, not player controls.
- Essential information remains available without motion.

### Accessibility

- Spoken information has captions and appropriate transcript support.
- Autoplay has no unexpected audio and reduced-motion fallback exists.

### Performance

- Poster, preload, and geometry are deliberate.
- Video does not create an avoidable LCP or bandwidth burden.

### AI Compatibility

- Only approved merchant media is used.
- No unseen details, captions, or claims are invented.

## Future Compatibility

Future Video refinement should follow demonstrated Shopify media support and accessibility needs without creating an external-embed system or duplicating Video Player controls.

New playback options require an accessible fallback, stable geometry, and a clear merchant purpose.
