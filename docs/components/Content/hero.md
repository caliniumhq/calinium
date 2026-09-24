# Hero

## Purpose

The Hero is the primary storytelling component of a page.

For new homepage composition, Hero is the canonical lead experience. It may use one supported media, split, product, collection, text, video, or slideshow presentation without creating a competing homepage lead component.

It introduces the page's purpose, communicates the brand's identity, and directs customers toward the most important action.

The Hero should create an immediate emotional connection while remaining calm, elegant, and product-focused.

It should never compete with the content that follows.

---

## Responsibilities

The Hero is responsible for:

- establishing the page hierarchy
- communicating the primary message
- supporting brand storytelling
- introducing key products or collections
- encouraging primary actions
- adapting across all devices
- remaining accessible

The Hero is not responsible for:

- displaying extensive product information
- replacing product pages
- presenting multiple competing messages
- functioning as a promotional banner

These responsibilities belong to other components.

---

## User Goals

The Hero should help customers:

- immediately understand the page
- recognize the brand identity
- discover featured content
- navigate confidently
- take the next logical action

---

## Merchant Goals

The Hero should help merchants:

- communicate brand positioning
- highlight featured products or collections
- improve first impressions
- increase engagement
- support conversion

Merchants should configure content—not layout behavior.

---

## Structure

A Hero consists of:

- Background Media — required
- Primary Heading — required

Optional:

- Eyebrow
- Supporting Text
- Button using the primary variant
- Button using the secondary variant
- Overlay
- Content Container
- Scroll Indicator

---

## Required Elements

Every Hero requires:

- primary heading
- responsive media
- accessible structure
- sufficient contrast
- logical content hierarchy

The Hero should communicate a single clear message.

---

## Optional Elements

The Hero may include:

- image
- video
- background color
- eyebrow
- supporting paragraph
- one or two call-to-action buttons
- subtle overlay
- scroll indicator

Optional content should reinforce the primary message.

---

## Supported Variants

### Editorial

Large imagery with restrained typography.

Recommended for luxury brands.

---

### Product

Highlights a featured product.

Suitable for homepage launches and campaigns.

---

### Collection

Introduces a featured collection.

Recommended for merchandising.

---

### Minimal

Uses restrained typography with generous whitespace.

Suitable for premium editorial experiences.

---

### Split Layout

Displays content alongside imagery.

Recommended when both messaging and product visuals require equal emphasis.

---

## Component-Specific Rules

### Heading Rules

The Hero should contain one primary heading.

The heading should:

- communicate the page purpose
- remain concise
- wrap naturally
- avoid excessive length

Only one H1 should exist per page.

If multiple Hero sections appear, only the first eligible Hero may render an H1.

### Canonical Homepage Ownership

New homepage generation selects Hero for the first active visual section. Image Banner remains a supporting in-page editorial component, and a multi-slide lead uses Hero's documented slideshow presentation rather than a separate primary hierarchy.

---

### Supporting Text Rules

Supporting text should:

- expand the primary message
- remain concise
- maintain comfortable line length
- support scanning

Long paragraphs should be avoided.

---

### Button Rules

The Hero may include:

- one primary button
- one optional secondary button

Buttons should follow the documented Button specification.

The primary action should receive greater emphasis.

---

### Background Media Rules

Background media may include:

- photography
- illustration
- video
- subtle gradients
- solid colors

Media should:

- preserve quality
- remain responsive
- avoid distracting composition
- support content readability

The focal point should remain visible across breakpoints.

---

### Overlay Rules

An overlay may be applied to:

- improve text contrast
- improve readability
- preserve image quality

Overlays should remain subtle.

Heavy overlays should be avoided whenever possible.

---

### Content Width

Hero content should:

- maintain comfortable reading width
- preserve generous whitespace
- avoid spanning the full viewport unnecessarily

Typography should remain the primary visual anchor.

---

## Supported States

### Default

The Hero displays normally.

---

### Loading

Background media loads progressively.

Layout dimensions should remain stable.

---

### Video Playing

If video is used, playback should remain unobtrusive.

Motion should never distract from messaging.

---

## Responsive Behaviour

The Hero should:

- adapt gracefully across all devices
- preserve readable typography
- maintain media focal points
- stack content naturally
- avoid excessive viewport height on small devices

Primary messaging should remain visible without requiring horizontal scrolling.

---

## Accessibility

Every Hero must support:

- semantic heading structure
- accessible buttons
- sufficient contrast
- descriptive media alternatives
- keyboard navigation
- reduced-motion preferences
- screen reader compatibility

Decorative background media should be hidden from assistive technologies where appropriate.

---

## Shopify Settings

Merchants may configure:

- background image
- background video
- mobile image
- overlay opacity
- content alignment
- content width
- section height
- color scheme
- heading
- supporting text
- primary button
- secondary button

Merchants should not configure:

- typography scale
- spacing
- animation timing
- responsive breakpoints

These belong to the Design System.

---

## Design Tokens

The Hero should use semantic tokens for:

- spacing
- typography
- colors
- content width
- overlay opacity
- section height
- transitions

Example token categories:

- hero-spacing
- hero-heading
- hero-overlay
- hero-content-width
- hero-transition

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- fade-in
- subtle parallax
- media fade
- gentle content transition

Avoid:

- bouncing
- scaling
- aggressive parallax
- decorative animations

Motion should reinforce storytelling rather than attract attention.

---

## Performance Rules

The Hero should:

- prioritize Largest Contentful Paint (LCP)
- preload the primary background image when appropriate
- lazy-load non-critical media
- avoid layout shifts
- minimize JavaScript
- optimize responsive media

The Hero should contribute positively to Core Web Vitals.

---

## AI Guidelines

When generating storefronts, AI should:

- communicate one clear message
- prioritize strong visual hierarchy
- select the appropriate Hero variant
- preserve accessibility
- reuse documented button components
- maintain restrained content density

AI should never invent merchant messaging or overload the Hero with competing content.

AI must not select Image Banner or standalone Slideshow as a second competing homepage lead, invent media or calls to action, or introduce an unsupported hero mode.

---

## Quality Checklist

### Purpose

- The page purpose is immediately clear.
- The primary action is obvious.

### Design

- Typography leads the composition.
- Media supports the message.
- Whitespace remains generous.

### Accessibility

- Heading hierarchy is correct.
- Buttons are accessible.
- Contrast meets accessibility standards.

### Responsive

- Media focal points are preserved.
- Typography remains readable.
- Layout adapts gracefully.

### Performance

- LCP is optimized.
- No layout shifts occur.
- Media is loaded efficiently.

### AI Compatibility

- Hero structure is deterministic.
- Existing design patterns are reused.
- Merchant content is preserved.

---

## Future Compatibility

Before extending the Hero, ask:

- Does the addition strengthen the primary message?
- Can an existing Hero variant support the requirement?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Hero should evolve through refinement rather than expansion.

Every Hero should create a memorable first impression, communicate a clear message, preserve accessibility and performance, and establish the calm, premium visual identity that defines Calinium.
