# Split

## Purpose

The Split component composes two primary regions with intentional proportional balance.

It supports calm media-and-content or content-and-content arrangements while preserving source order, responsive clarity, and the separate responsibilities of Hero, Image Banner, and other content components.

## Responsibilities

The Split component is responsible for:

- arranging exactly two primary regions
- defining their proportional balance
- supporting an approved media-first or content-first presentation
- collapsing to a clear single-column sequence
- preserving visual and semantic order across devices

The Split component is not responsible for:

- rendering media, product, or editorial content
- providing a complete image-and-text storytelling section
- setting page width or major section spacing
- creating a multi-column grid
- reversing source order in a way that harms accessibility

## User Goals

The Split component should help customers:

- understand the relationship between two pieces of content
- scan media and supporting information without competition
- retain a coherent reading sequence on mobile and desktop
- interact with either region comfortably

## Merchant Goals

The Split component should help merchants:

- present approved content and media with balanced emphasis
- select a simple media-left or media-right presentation when a parent supports it
- keep dynamic Shopify content resilient to translation and varied media proportions

## Structure

A Split consists of:

- primary region — required
- secondary region — required

Optional:

- equal or weighted proportion
- approved region order at wider widths
- a Stack, Cluster, Content Wrapper, or Surface within either region

## Required Elements

Every Split requires:

- two meaningful, related regions
- stable semantic source order
- a tokenized inter-region gap
- a single-column fallback
- content that can wrap, grow, or be absent safely within its own region

## Optional Elements

A Split may include:

- equal balance when both regions carry similar importance
- content-weighted or media-weighted balance
- visual reversal at wider widths only when source order remains the intended reading order
- a parent Section-owned background or Container-owned page width

## Supported Variants

### Equal

Both regions have comparable visual weight.

### Content Weighted

The content region receives greater width for reading, forms, or detail.

### Media Weighted

The media region receives greater width for product or editorial imagery.

### Media First

Media is first in source and visual order.

### Content First

Content is first in source and visual order.

## Component-Specific Rules

A Split must:

- contain only two primary regions
- use CSS Grid or Flexbox with intrinsic sizing
- preserve intended reading order in the DOM
- collapse to a vertical sequence before either region becomes cramped
- permit each region to use its own documented primitive

A Split must not:

- duplicate Image Banner, Hero, or a dedicated image-with-text section's content model
- use CSS `order` to make keyboard and screen-reader order differ from visual order
- force media to crop or text to overflow merely to preserve symmetry
- add a third primary column; use Grid when three or more peers are required

## Supported States

### Default

The two regions display with their assigned proportion.

### Collapsed

Regions stack in their stable source order.

### Missing Optional Content

The containing content component determines whether to omit its optional element, use its documented fallback, or omit the complete Split. Split does not fabricate a replacement.

### With Surface

One or both regions may sit on a documented neutral Surface without changing their content responsibility.

## Responsive Behaviour

Splits should:

- begin as a readable vertical sequence on narrow screens unless a demonstrated compact use supports side-by-side presentation
- use intrinsic minimum widths and gap tokens before adding breakpoint rules
- retain mobile source order, keyboard order, and screen-reader order
- accommodate long headings, translated copy, varied media ratios, and large text
- avoid horizontal scrolling, overlap, and clipped controls

## Accessibility

The Split component should:

- preserve semantic HTML defined by its regions
- maintain identical DOM, keyboard, visual, and screen-reader order
- retain sufficient inter-region space around interactive content
- avoid unnecessary ARIA because it is layout only
- support WCAG 2.2 AA contrast through the contained media, content, and Surface components

## Shopify Settings

Merchants may configure, where a parent section supports it:

- equal, content-weighted, or media-weighted composition
- approved media-first or content-first arrangement
- contained or full-bleed media presentation
- alignment within a region

The Design System controls:

- exact proportions
- minimum widths and collapse threshold
- gap values
- responsive behavior
- focus spacing and motion timing

## Design Tokens

The Split component should use semantic tokens for:

- split-gap
- split-gap-spacious
- split-ratio-equal
- split-ratio-content
- split-ratio-media
- split-collapse-minimum

## Motion Rules

Split should not animate responsive collapse or region reversal.

Individual content or media may use its own restrained motion. Any optional content reveal must preserve reduced-motion preferences and must not move a focused element unexpectedly.

## Performance Rules

The Split component should:

- use CSS Grid or Flexbox and minimal markup
- require no JavaScript layout calculation
- preserve progressive enhancement with source-ordered content
- avoid synchronous measurements and forced media resizing
- defer media behavior to the documented media primitive

## AI Guidelines

When generating storefronts, AI should:

- choose Split only for two related primary regions
- select proportions from content hierarchy and media importance
- preserve merchant content, real assets, and semantic source order
- use Stack, Content Wrapper, Surface, and media primitives within regions as needed
- choose Grid for peer columns and Section for page rhythm
- generate a deterministic source-ordered composition from the approved variants

AI should not reverse content for novelty or invent media, text, or a third region to fill a layout.

## Quality Checklist

### Purpose

- The composition has exactly two primary regions.
- Each region has a distinct, meaningful role.

### Design

- Proportions create quiet balance rather than rigid symmetry.
- The collapsed layout remains intentional.

### Accessibility

- Source, visual, keyboard, and reading order agree.
- No region becomes clipped or difficult to reach at zoom.

### AI Compatibility

- Existing content and media primitives are reused.
- No reversal or resource is generated without evidence.

## Future Compatibility

Future Split refinement should improve documented two-region composition without becoming an alternate Hero, Image Banner, or multi-column grid system.

Any new proportion or collapse behavior must remain source-order safe, Shopify-native, and driven by demonstrated content relationships.
