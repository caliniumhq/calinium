# Container

## Purpose

The Container component establishes the contained horizontal region used by page content.

It gives storefront content a calm, premium measure, predictable alignment, and fluid side gutters without controlling the vertical rhythm of a page.

## Responsibilities

The Container component is responsible for:

- limiting horizontal content width
- centering contained content within available space
- providing fluid inline gutters
- aligning related page regions consistently
- adapting safely to Shopify section and app-block content

The Container component is not responsible for:

- section-level vertical spacing
- readable text line length inside broad layouts
- grid columns or item gaps
- visual containment, borders, or backgrounds
- page-specific content decisions

## User Goals

The Container component should help customers:

- read and scan content comfortably
- retain orientation across a storefront
- use controls without crowding at narrow widths
- view merchant content without horizontal scrolling

## Merchant Goals

The Container component should help merchants:

- keep page content aligned without managing arbitrary widths
- select an understandable content-width variant where a section supports it
- preserve a quiet, spacious storefront as content changes

Merchants should choose presentation intent—not exact gutter values or breakpoints.

## Structure

A Container consists of:

- one containing element — required
- one or more child content regions — required

Optional:

- narrow, standard, or wide width variant
- full-width exception for genuinely edge-to-edge content

## Required Elements

Every Container requires:

- one stable horizontal width rule
- fluid logical inline padding
- centered alignment when it is contained
- content that can shrink without overflow

## Optional Elements

A Container may include:

- a Content Wrapper for editorial measure
- a Grid, Stack, Cluster, or Split for internal composition
- a Section-owned full-width background outside the contained content

Optional layout primitives should solve a distinct relationship rather than add wrappers without purpose.

## Supported Variants

### Standard

The default contained width for most Shopify page content.

### Narrow

Used for focused editorial copy, account content, or form-related regions when Content Wrapper alone is not the appropriate boundary.

### Wide

Used for merchandising grids, broad media, or data-rich content that benefits from a larger measure.

### Full Width

Removes the maximum content width only when the surrounding section intentionally presents edge-to-edge content. It must retain safe inline gutters where content remains interactive or readable.

## Component-Specific Rules

A Container must:

- use logical inline properties and intrinsic sizing
- keep contained content centered unless an approved layout requires aligned content
- allow dynamic Shopify app blocks and translated content to wrap naturally
- retain fluid gutters at browser zoom and large text settings
- permit nested Containers only when the inner width communicates a real content hierarchy

A Container must not:

- own block spacing above or below itself
- nest repeatedly to simulate padding
- use fixed viewport widths or negative margins without a documented system reason
- contain store-specific resource assumptions

## Supported States

### Standard

Contained content uses its assigned width and fluid gutters.

### Full Width

Content intentionally reaches the available inline space while internal readable or interactive content retains protection from viewport edges.

### Nested

An inner contained region creates a deliberate narrower hierarchy. Repeated nesting is not a supported composition pattern.

## Responsive Behaviour

Containers should:

- begin mobile first with safe gutters
- use `clamp()` or equivalent token-driven fluid gutters where appropriate
- avoid horizontal scrolling from long merchant-entered text, app blocks, or media
- preserve the same DOM and reading order at every width
- prefer natural content resizing before adding breakpoint-specific variants

## Accessibility

The Container component should:

- use semantic HTML appropriate to its parent region
- avoid unnecessary ARIA because it is non-interactive
- preserve keyboard and screen-reader order
- support 200% zoom, large text, and reflow without clipped content
- maintain adequate space around interactive descendants
- support WCAG 2.2 AA outcomes through its contained content and surface tokens

No meaning may depend on a container's visual position alone.

## Shopify Settings

Merchants may configure, where a parent section supports it:

- contained, narrow, wide, or full-width presentation
- alignment when the content type supports it

The Design System controls:

- exact maximum widths
- gutters
- breakpoint definitions
- responsive sizing algorithm
- focus spacing and touch protection
- motion timing

## Design Tokens

The Container component should use semantic tokens for:

- content-width-standard
- content-width-narrow
- content-width-wide
- gutter-inline
- gutter-inline-mobile
- alignment

No hardcoded page width or gutter value should define a Container.

## Motion Rules

Containers should not animate as a layout effect.

Allowed motion is limited to a subtle inherited transition when a parent section changes an approved presentation state. Width changes must never create disorienting movement or delay content access.

## Performance Rules

The Container component should:

- use CSS layout primitives and minimal markup
- require no JavaScript
- preserve progressive enhancement by rendering a useful layout without scripts
- avoid runtime measurements and layout calculations
- prevent avoidable layout shift through stable width rules

## AI Guidelines

When generating storefronts, AI should:

- select the smallest suitable width variant from semantic content relationships
- reuse Container for horizontal page alignment
- preserve merchant content and Shopify app blocks
- use semantic HTML, logical properties, and design tokens
- select a deterministic composition from the approved width variants
- prefer intrinsic responsiveness over arbitrary breakpoints

AI should not add nested Containers, custom widths, or full-width exceptions merely for novelty.

## Quality Checklist

### Purpose

- The Container owns horizontal width and gutters only.
- Vertical spacing belongs to Section, Stack, or another documented primitive.

### Design

- Alignment is predictable and visually calm.
- Width supports the content type without creating noise.

### Accessibility

- DOM and visual order agree.
- Content reflows without horizontal scrolling at zoom and narrow widths.

### AI Compatibility

- No arbitrary width or store-specific content is generated.
- Existing layout primitives are reused.

## Future Compatibility

Future Container refinement should improve tokenized width behavior, app-block resilience, and localization without creating page-specific width systems.

Before adding a variant, confirm that Container still owns horizontal alignment rather than text measure, grid structure, or section spacing.
