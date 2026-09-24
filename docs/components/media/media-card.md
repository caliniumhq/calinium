# Media Card

## Purpose

Media Card is a neutral reusable composition of media with concise supporting content and an optional action.

It supports calm, premium editorial or informational presentation without duplicating Product Card, collection card, article card, or promotion-card requirements.

## Responsibilities

Media Card is responsible for:

- composing Responsive Image or Video with concise supporting content
- presenting optional heading, text, metadata, and one action
- distinguishing static and interactive card variants
- maintaining readable contrast and stable media geometry
- coordinating Surface, Stack, and layout primitives without owning them

Media Card is not responsible for:

- product price, availability, variants, or commerce actions
- article, collection, promotion, or Product Card data models
- defining a full content section or media gallery
- making an entire card clickable when it contains multiple actions

## User Goals

Media Card should help customers:

- understand a concise visual story or informational item
- identify the primary action without accidental interaction
- read supporting text over or beside media comfortably
- browse equal or naturally sized card groups without distraction

## Merchant Goals

Media Card should help merchants:

- present approved editorial, service, or informational content consistently
- use authentic assets and concise supporting copy
- choose a simple static or linked presentation without managing card mechanics

## Structure

Media Card consists of:

- media region — required
- concise content region — required when media needs supporting context

Optional:

- eyebrow or metadata
- heading
- supporting text
- one link or action
- optional Surface containment
- documented overlay content only when contrast is reliable

## Required Elements

Every Media Card requires:

- real media or an intentional Placeholder Image
- stable media geometry through Responsive Image or Aspect Ratio
- a clear content relationship
- accurate text and accessible media treatment
- one unambiguous interaction model

## Optional Elements

Media Card may include:

- concise heading and supporting text
- metadata
- one action link or button
- a neutral Surface
- equal-height group behavior supplied by Grid
- overlay text only when contrast remains sufficient across the asset

## Supported Variants

### Static

Presents media and supporting information without a primary card interaction.

### Linked

Uses one clear primary link. The link must have an accessible name and must not wrap unrelated controls.

### Surface Contained

Uses Surface for a documented containment reason.

### Overlay Content

Places concise content over media only when an overlay or image treatment preserves WCAG 2.2 AA contrast.

### Split Content

Uses Split or Stack to present media beside supporting content. Split owns the regional balance.

## Component-Specific Rules

Media Card must:

- use Responsive Image, Video, Aspect Ratio, Surface, Stack, and layout primitives for their dedicated roles
- keep supporting content concise and connected to the media
- provide one clear click target or separate independent controls
- preserve media alt behavior and foreground contrast
- allow Grid to own equal-height or repeated-card layout

Media Card must not:

- duplicate Product Card, collection card, article card, or promotion-card content contracts
- nest links or place controls inside a card-wide link
- use overlay text where contrast cannot be maintained
- invent merchant media, metadata, stories, or actions
- use visual effects to compensate for weak hierarchy

## Supported States

### Static

Media and concise content display without a primary interaction.

### Interactive

One documented link or action is available with visible focus.

### Loading

Media geometry remains stable while the real asset loads.

### Missing Media

Placeholder Image or parent omission preserves an intentional non-misleading presentation.

### Disabled Context

An action may be unavailable only for a real reason, which its action component communicates.

## Responsive Behaviour

Media Card should:

- preserve media geometry and readable content from 320 px upward
- stack content before a side-by-side presentation becomes crowded
- let long merchant content and translations wrap naturally
- retain touch-friendly action spacing and visible focus
- avoid fixed heights unless Grid’s documented equal-height behavior supports the content model

## Accessibility

Media Card must support:

- semantic HTML appropriate to its content relationship
- accurate image or video alternatives
- accessible names for linked cards or actions
- visible focus and keyboard access for interactive variants
- WCAG 2.2 AA text contrast, especially for overlays
- no nested interactive elements or duplicated screen-reader output

## Shopify Settings

Merchants may configure, where a parent supports it:

- approved media asset and mobile override
- heading, concise text, metadata, and one action
- static or linked presentation
- Surface and color-scheme choice
- overlay use only where contrast is reviewed

The Design System controls:

- spacing
- media geometry
- typography hierarchy
- card interaction behavior
- focus styling
- breakpoints and motion timing

## Design Tokens

Media Card should use semantic tokens for:

- media-card-gap
- media-card-content-space
- media-card-background
- media-card-foreground
- media-card-radius
- media-card-overlay
- media-card-focus-ring

## Motion Rules

Media Card uses no motion by default.

Linked variants may inherit a restrained focus or hover transition without changing layout, obscuring media, or implying interaction on static cards. Reduced-motion preferences are respected.

## Performance Rules

Media Card should:

- use Responsive Image or Video delivery rules
- preserve stable geometry and avoid duplicate downloads
- require no JavaScript for static or linked behavior
- use minimal JavaScript only for a demonstrated accessible enhancement
- let Grid and layout primitives handle repeated composition efficiently
- preserve progressive enhancement and avoid cumulative layout shift

## AI Guidelines

When generating storefronts, AI should:

- use Media Card only for neutral editorial or informational media-content pairs
- preserve exact merchant assets, copy, and real actions
- select a deterministic static or linked variant from the approved content role
- use semantic HTML, accessible names, and design tokens
- defer product, collection, article, and promotion behavior to dedicated components

AI must not invent card copy, media, links, product data, or overlays.

## Quality Checklist

### Purpose

- Media Card remains a neutral composition, not a commerce or article card.
- Media and content have one clear relationship.

### Accessibility

- Media alternatives, links, focus, and overlay contrast are accurate.
- No nested interactive elements exist.

### Performance

- Geometry is stable and media delivery is responsive.
- No unnecessary JavaScript or duplicate download is introduced.

### AI Compatibility

- Merchant assets and content remain authentic.
- Dedicated card and layout primitives are reused.

## Future Compatibility

Future Media Card refinement should improve demonstrated neutral editorial composition without becoming a product, collection, article, or promotion-card system.

New variants require a distinct reusable content relationship, accessible interaction model, and stable media behavior.
