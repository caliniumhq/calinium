# Slideshow

## Purpose

The Slideshow presents multiple pieces of featured content within a single section while maintaining a calm, editorial browsing experience.

For new homepage lead composition, its multi-slide behavior is selected through the canonical Hero rather than as a competing primary hierarchy. A standalone slideshow remains suitable only for a demonstrated supporting editorial need or compatibility use.

It allows merchants to showcase collections, campaigns, products, or brand stories without overwhelming customers.

The Slideshow should communicate one idea per slide and transition gracefully between them.

---

## Responsibilities

The Slideshow is responsible for:

- presenting multiple featured slides
- supporting visual storytelling
- highlighting products or collections
- providing intuitive navigation
- adapting across all devices
- remaining accessible

The Slideshow is not responsible for:

- replacing page navigation
- displaying large product catalogs
- serving as a promotional carousel
- rotating excessive marketing content

These responsibilities belong to other components.

---

## User Goals

The Slideshow should help customers:

- discover featured content
- browse effortlessly
- understand featured campaigns
- navigate slides confidently
- interact without confusion

---

## Merchant Goals

The Slideshow should help merchants:

- feature multiple campaigns
- promote collections
- tell brand stories
- increase engagement
- maintain a premium first impression

Merchants should configure slide content—not slideshow behavior.

---

## Structure

A Slideshow consists of:

- Slide Container — required
- One or More Slides — required

Optional:

- Previous Button
- Next Button
- Pagination
- Autoplay
- Progress Indicator
- Overlay
- Navigation Labels

---

## Required Elements

Every Slideshow requires:

- at least one slide
- accessible navigation
- responsive media
- logical reading order

If only one slide exists, navigation controls should be hidden automatically.

---

## Optional Elements

The Slideshow may include:

- arrows
- pagination dots
- autoplay
- autoplay progress
- pause control
- keyboard navigation
- swipe gestures

Optional controls should remain visually secondary.

---

## Supported Variants

### Editorial

Large imagery with restrained typography.

Recommended for luxury storefronts.

---

### Product

Highlights featured products.

Suitable for seasonal campaigns.

---

### Collection

Highlights multiple collections.

Recommended for homepage merchandising.

---

### Storytelling

Combines imagery and narrative across several slides.

Suitable for premium brands.

---

### Minimal

Uses subtle transitions with minimal interface controls.

Recommended for calm browsing experiences.

---

## Component-Specific Rules

### Slide Rules

Each slide should communicate one primary message.

A slide may contain:

- image
- video
- heading
- supporting text
- one or two buttons

Slides should avoid competing messages.

---

### Navigation Rules

Navigation may include:

- previous button
- next button
- pagination

Navigation should:

- remain predictable
- remain accessible
- avoid distracting animations

Navigation controls should never obscure important content.

---

### Autoplay Rules

Autoplay should:

- be disabled by default
- pause on interaction
- pause on hover when appropriate
- pause when the page becomes inactive
- respect reduced-motion preferences

Autoplay should never feel rushed.

---

### Pagination Rules

Pagination should:

- indicate the active slide
- remain keyboard accessible
- provide clear visual feedback

Pagination should support direct navigation between slides.

---

### Media Rules

Slides may use:

- photography
- illustration
- video
- subtle background color

Media should:

- preserve quality
- remain responsive
- maintain focal points
- support text readability

---

### Overlay Rules

Overlays may improve contrast between media and content.

They should remain subtle and preserve the underlying imagery.

---

## Supported States

### Default

Slides are displayed normally.

---

### Transitioning

Slides change smoothly without disrupting layout.

---

### Autoplay

Slides advance automatically according to merchant settings.

---

### Paused

Autoplay is temporarily suspended.

---

### Loading

Media loads progressively.

Layout dimensions should remain stable.

---

## Responsive Behaviour

The Slideshow should:

- preserve media focal points
- support touch gestures
- adapt slide height gracefully
- avoid horizontal scrolling
- maintain readable typography

Navigation should remain comfortable on touch devices.

---

## Accessibility

Every Slideshow must support:

- semantic structure
- keyboard navigation
- visible focus indicators
- screen reader announcements
- descriptive navigation labels
- reduced-motion preferences
- swipe alternatives

Automatic transitions should never reduce usability.

---

## Shopify Settings

Merchants may configure:

- slide blocks
- desktop image
- mobile image
- background video
- heading
- supporting text
- primary button
- secondary button
- content alignment
- content width
- section height
- overlay opacity
- color scheme
- show arrows
- show pagination
- enable autoplay
- autoplay interval

Merchants should not configure:

- transition duration
- animation curves
- responsive breakpoints
- spacing
- typography scale

These belong to the Design System.

---

## Design Tokens

The Slideshow should use semantic tokens for:

- spacing
- typography
- slide height
- navigation size
- overlay opacity
- transition duration
- pagination styling

Example token categories:

- slideshow-spacing
- slideshow-height
- slideshow-navigation
- slideshow-pagination
- slideshow-overlay
- slideshow-transition

---

## Motion Rules

Motion should remain calm.

Allowed motion:

- horizontal slide
- fade transition
- opacity transition
- subtle progress animation

Avoid:

- bouncing
- zooming
- rotating
- decorative effects

Motion should reinforce orientation rather than attract attention.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Slideshow should:

- preload the first slide
- lazy-load non-visible media
- avoid layout shifts
- minimize JavaScript
- optimize responsive images
- pause inactive media

The first slide should contribute positively to Largest Contentful Paint (LCP).

---

## AI Guidelines

When generating storefronts, AI should:

- use a slideshow only when multiple messages are genuinely valuable
- limit slides to meaningful content
- communicate one message per slide
- preserve accessibility
- prioritize calm transitions
- reuse Hero and Button patterns where appropriate

AI should never generate unnecessary slides simply because the component supports them.

AI must not select standalone Slideshow as a second homepage lead, invent slides, autoplay, media, or calls to action, or use it when one Hero message is clearer.

---

## Quality Checklist

### Purpose

- Each slide communicates one idea.
- Navigation is intuitive.

### Design

- Visual hierarchy remains clear.
- Media supports messaging.
- Controls remain secondary.

### Accessibility

- Keyboard navigation functions correctly.
- Screen readers announce changes appropriately.
- Reduced-motion preferences are respected.

### Responsive

- Slides adapt across devices.
- Media focal points remain visible.
- Touch gestures work reliably.

### Performance

- First slide loads immediately.
- Lazy loading functions correctly.
- No layout shifts occur.

### AI Compatibility

- Slide generation is deterministic.
- Existing components are reused.
- Merchant content remains accurate.

---

## Future Compatibility

Before extending the Slideshow, ask:

- Does the addition improve storytelling?
- Can an existing slide layout satisfy the requirement?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Slideshow should evolve through refinement rather than expansion.

Every Slideshow should deliver elegant visual storytelling, maintain accessibility and performance, and provide a calm browsing experience that reflects the timeless design philosophy of Calinium.
