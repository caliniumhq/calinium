# Video Player

## Purpose

Video Player defines the interactive playback controls and playback state for a Video asset.

Native browser controls are the Calinium default. Custom controls are permitted only when they provide full accessibility parity and a demonstrated premium storefront need.

## Responsibilities

Video Player is responsible for:

- play and pause interaction
- mute and volume interaction where available
- progress or timeline interaction when custom controls are justified
- captions control and fullscreen where supported
- focus management, keyboard behavior, and playback announcements
- loading, buffering, playing, paused, ended, and error states

Video Player is not responsible for:

- choosing the video asset, poster, captions, transcript, or autoplay policy
- gallery navigation or slideshow behavior
- creating controls merely for visual novelty
- replacing native controls without accessible parity

## User Goals

Video Player should help customers:

- start, stop, mute, and inspect video predictably
- understand playback state without surprise
- use video controls with keyboard, touch, screen reader, and reduced motion
- recover from loading or playback failure calmly

## Merchant Goals

Video Player should help merchants:

- offer clear playback only where real approved video requires interaction
- preserve a quiet interface without excessive custom chrome
- rely on native browser behavior when custom controls add no customer value

## Structure

Video Player consists of:

- Video media element supplied by Video — required
- native controls or an accessible custom control set — required for informational playback

Optional:

- play/pause button
- mute/volume control
- timeline or progress display
- captions control
- fullscreen control
- concise loading or error feedback

## Required Elements

Every Video Player requires:

- a visible or programmatically available playback control for informational video
- keyboard operation
- visible focus states
- accurate control names and state communication
- stable controls that do not obstruct essential content

## Optional Elements

Video Player may include:

- native controls as the preferred option
- custom controls only with native-equivalent keyboard, focus, captions, and error behavior
- progress indication
- fullscreen where the platform supports it
- muted decorative playback with no custom interface when Video rules permit it

## Supported Variants

### Native Controls

Uses browser-provided controls. Recommended default for informational video.

### Minimal Trigger

Uses one accessible play trigger for an external-video facade or deliberately deferred player.

### Custom Accessible Controls

Allowed only when each control has complete keyboard, focus, captions, status, and reduced-motion behavior.

### Decorative Playback

No controls are shown only when the Video is truly decorative and no information depends on interaction.

## Component-Specific Rules

Video Player must:

- expose a play/pause control with an accurate accessible name and state
- preserve keyboard access to all custom controls
- keep focus visible and return it predictably after fullscreen or modal-like playback contexts
- pause when the page is hidden where appropriate
- report loading or failure without exposing technical error details

Video Player must not:

- hide native controls for informational video without accessible parity
- autoplay audio or override a customer’s mute choice
- trap focus in inline playback
- duplicate captions, transcript, or media-asset requirements owned by Video
- use autoplay animation as a substitute for customer intent

## Supported States

### Loading

Playback is preparing. The poster or stable frame remains visible.

### Buffering

The player communicates waiting state without visual disruption.

### Playing

Controls accurately offer pause and other available actions.

### Paused

The current frame or poster remains available with a clear play action.

### Ended

The video remains replayable where appropriate.

### Error

An accessible concise message and Video-owned fallback remain available.

## Responsive Behaviour

Video Player should:

- maintain touch-friendly control targets from 320 px upward
- avoid controls that overlap captions or critical poster content
- preserve keyboard order and visible focus at every width
- allow native browser controls to adapt naturally
- avoid fixed control bars that cause overflow or clip focus

## Accessibility

Video Player must support:

- keyboard play, pause, mute, captions, and fullscreen where those controls exist
- semantic native controls by default
- accessible names, pressed states, and progress values for custom controls
- visible focus and WCAG 2.2 AA contrast
- captions access and no unexpected audio
- reduced-motion behavior that does not force movement

## Shopify Settings

Merchants may configure, where Video supports it:

- controls visibility
- allowed minimal trigger presentation
- verified accessible video title

The Design System controls:

- native-controls-first policy
- custom control sizing and focus styling
- state feedback styling
- keyboard mapping
- responsive behavior and motion timing

## Design Tokens

Video Player should use semantic tokens for:

- player-control-size
- player-control-gap
- player-control-background
- player-control-foreground
- player-focus-ring
- player-progress-track
- player-progress-value

## Motion Rules

Controls may use short, restrained state transitions only.

Progress must reflect actual playback rather than decorative animation. Motion respects reduced-motion preferences; no control may bounce, flash, or obscure the media.

## Performance Rules

Video Player should:

- prefer native controls and media behavior
- use minimal JavaScript only for demonstrated accessible enhancement
- avoid repeated timers, observers, and duplicate listeners after Theme Editor reloads
- avoid measuring layout during playback
- preserve progressive enhancement through Video’s poster and fallback
- avoid control changes that cause cumulative layout shift

## AI Guidelines

When generating storefronts, AI should:

- choose native controls unless an approved requirement proves custom controls are necessary
- preserve Video-owned asset, caption, and fallback decisions
- generate deterministic control sets from documented variants
- retain semantic HTML, keyboard access, visible focus, and restrained motion
- avoid decorative player chrome or unnecessary autoplay

AI must not invent controls, captions, transcripts, media state, external provider capability, or playback progress; or replace Video’s source and fallback ownership.

## Quality Checklist

### Purpose

- Video Player owns interaction, not media-asset semantics.
- Native controls remain the safe default.

### Accessibility

- Every available action is keyboard-operable and visibly focused.
- State, captions, and errors are communicated accurately.

### Performance

- No duplicate listeners, layout measurements, or autoplay-heavy behavior exists.
- Fallback remains useful without JavaScript.

### AI Compatibility

- Existing media primitives are reused.
- No custom control is generated without accessibility parity.

## Future Compatibility

Future Video Player refinement should follow demonstrated interactive playback needs while preserving native-first behavior and complete accessibility parity.

Any custom control expansion requires keyboard, focus, captions, error, reduced-motion, and Theme Editor lifecycle evidence.
