# Content Wrapper

## Purpose

The Content Wrapper component limits readable content width inside a larger Container or region.

It gives editorial copy, forms, structured information, and focused actions a calm line length without duplicating the Container's responsibility for page width and gutters.

## Responsibilities

The Content Wrapper component is responsible for:

- limiting readable inline measure
- aligning focused content within a larger region
- supporting narrow editorial and form-oriented content
- allowing headings to exceed body-copy measure when hierarchy requires it
- preserving readable rhythm across dynamic Shopify content

The Content Wrapper component is not responsible for:

- page-level maximum width or gutters
- section-level spacing and backgrounds
- grid columns or sidebar relationships
- typography selection or content writing
- constraining broad media that should remain in its own layout region

## User Goals

The Content Wrapper component should help customers:

- read long-form content comfortably
- complete focused forms without excessive line width
- follow headings, copy, and actions in a clear hierarchy
- use content at zoom and on small screens without horizontal scrolling

## Merchant Goals

The Content Wrapper component should help merchants:

- present real editorial copy, form content, and support text with premium restraint
- choose a clear aligned or centered presentation where a parent supports it
- retain readability when Shopify content, translations, and app blocks vary

## Structure

A Content Wrapper consists of:

- a measure-limiting content region — required
- focused text, form, or informational content — required

Optional:

- narrow, standard, or wide readable measure
- start-aligned or centered presentation
- a heading region that may exceed the body measure
- a Stack or Form Group for internal relationship spacing

## Required Elements

Every Content Wrapper requires:

- a clear readable-content purpose
- an approved maximum line-length rule
- fluid width below that maximum
- alignment that remains clear in its parent Container or Section
- content that can wrap at zoom, with large text, and in translated languages

## Optional Elements

A Content Wrapper may include:

- narrow editorial measure
- standard informational measure
- wide measure for structured but still readable content
- a heading that uses a broader measure than its supporting copy
- centered presentation when it reinforces page hierarchy

## Supported Variants

### Narrow

For long-form editorial copy, focused customer forms, or concise information requiring a calm measure.

### Standard

The default readable width for most supporting copy and structured content.

### Wide

For content that contains concise structured information, multiple actions, or larger headings while retaining comfortable reading.

### Start Aligned

Aligns with the surrounding content flow. Recommended default.

### Centered

Centers focused content when the page hierarchy supports it. It should not be used for long, dense reading content by default.

## Component-Specific Rules

A Content Wrapper must:

- be nested within a Container or another established horizontal region
- use tokenized readable measure rather than arbitrary widths
- allow headings to exceed body-copy measure only when the relationship stays clear
- preserve natural text wrapping and source order
- remain appropriate for dynamic merchant content and Shopify app blocks

A Content Wrapper must not:

- replace Container as the page-width primitive
- constrain a Grid, broad media, or page-level layout without a content reason
- set vertical page rhythm
- force manual line breaks, fixed heights, or ellipsis to maintain measure
- center long content merely for visual novelty

## Supported States

### Standard

Focused content uses its assigned readable measure.

### Heading Extended

The heading may be broader than supporting copy while preserving a clear shared alignment.

### Centered

Focused content is centered within its parent region.

### Dynamic Content

Translated, merchant-entered, or app-block content wraps and grows naturally without leaving the readable region.

## Responsive Behaviour

Content Wrappers should:

- use the available inline space below their maximum measure
- retain safe gutters supplied by the parent Container
- allow headings and copy to wrap naturally at 320 px, zoom, and large text settings
- avoid horizontal overflow, clipped actions, and fixed-height text regions
- preserve start alignment or a deliberate centered hierarchy across breakpoints

## Accessibility

The Content Wrapper component should:

- preserve semantic HTML supplied by the contained content
- maintain heading hierarchy and logical reading order
- avoid unnecessary ARIA because measure is not a role
- support WCAG 2.2 AA text contrast through the parent Surface or Section
- retain sufficient touch and focus space for contained controls

## Shopify Settings

Merchants may configure, where a parent supports it:

- narrow, standard, or wide content measure
- start-aligned or centered presentation
- whether an approved heading may use a broader measure

The Design System controls:

- exact line-length limits
- responsive width behavior
- parent gutters
- typography scale relationships
- breakpoints
- focus treatment and motion timing

## Design Tokens

The Content Wrapper component should use semantic tokens for:

- content-measure-narrow
- content-measure-standard
- content-measure-wide
- content-wrapper-alignment
- content-heading-measure
- content-wrapper-gap

## Motion Rules

Content Wrapper should not animate width, alignment, or text reflow.

Contained controls or disclosures may use their documented restrained motion. The wrapper must preserve reduced-motion preferences and never delay readable content visibility.

## Performance Rules

The Content Wrapper component should:

- use CSS sizing and minimal markup
- require no JavaScript
- preserve progressive enhancement
- avoid runtime text measurement, truncation, or width calculations
- allow the browser to manage natural line wrapping efficiently

## AI Guidelines

When generating storefronts, AI should:

- use Content Wrapper for readable text, focused forms, and structured information inside a broader region
- choose the smallest suitable semantic measure based on content density and customer reading behavior
- preserve merchant copy, headings, translations, and source order
- use Container for page width, Section for pacing, and Stack for internal vertical rhythm
- use semantic HTML and design tokens

AI should not invent copy, force line breaks, or create a separate page-width wrapper for every text block.

## Quality Checklist

### Purpose

- Content Wrapper owns readable measure, not page width.
- The contained content has a focused reading or completion task.

### Design

- Line length feels calm and intentional.
- Heading and body measures remain related and readable.

### Accessibility

- Text reflows without horizontal scrolling at zoom and narrow widths.
- Heading and reading order remain semantic.

### AI Compatibility

- Merchant content and translations are preserved.
- No arbitrary width, line break, or centered-long-copy pattern is generated.

## Future Compatibility

Future Content Wrapper refinement should improve tokenized measures and demonstrated Shopify content contexts without duplicating Container, Grid, or page-specific text systems.

Any new measure or alignment option must preserve readable line length, mobile-first behavior, semantic HTML, and deterministic AI selection.
