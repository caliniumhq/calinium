# Section

## Purpose

The Section component establishes a meaningful vertical page region with intentional spacing, semantic grouping, and optional section-level background treatment.

It gives Shopify storefront pages a calm rhythm while allowing contained, full-bleed, editorial, and merchandising content to remain distinct.

## Responsibilities

The Section component is responsible for:

- grouping a meaningful page region
- owning spacing before and after major page content
- providing an optional semantic heading relationship
- coordinating full-width background and contained content
- preserving Shopify section and Theme Editor boundaries

The Section component is not responsible for:

- arranging repeated items into columns
- setting readable body-copy measure
- defining page-specific component behavior
- becoming a generic wrapper around every element
- replacing a landmark when a more precise element is required

## User Goals

The Section component should help customers:

- understand content hierarchy
- scan a page without visual fatigue
- distinguish adjacent stories, product groups, or actions
- retain orientation across long Shopify pages

## Merchant Goals

The Section component should help merchants:

- organize independent Shopify content blocks predictably
- choose understandable spacing density and presentation intent
- retain premium whitespace without manual margin adjustments
- edit a section safely in the Theme Editor

Merchants should control content and approved presentation choices—not raw layout values.

## Structure

A Section consists of:

- a meaningful section boundary — required
- section content — required

Optional:

- section heading and description
- full-width background layer
- contained Container
- optional Divider
- section-level color scheme

## Required Elements

Every Section requires:

- a clear content purpose
- tokenized block spacing
- semantic markup appropriate to the page hierarchy
- content that remains useful when optional media or blocks are absent

## Optional Elements

A Section may include:

- a heading that follows the page hierarchy
- a background color or media treatment
- contained content within a Container
- full-bleed media with separately contained text
- an optional Divider when whitespace alone cannot explain the boundary

## Supported Variants

### Standard

Contained content with standard section rhythm.

### Spacious

Increases pacing around primary storytelling or featured commerce content.

### Compact

Reduces spacing for closely related functional content without becoming dense.

### Full-Bleed Background

Allows background treatment to reach the viewport while content remains contained unless the content itself is intentionally edge to edge.

### Edge-to-Edge Media

Allows selected media to reach the section edges while preserving a clear content relationship.

## Component-Specific Rules

A Section must:

- represent a real content or functional region
- preserve source order when responsive presentation changes
- keep background treatment separate from readable content width
- remain editable as a stable Shopify section boundary
- render an intentional empty state or omit itself when it has no meaningful content

A Section must not:

- wrap isolated text merely to create spacing
- use empty markup as decorative whitespace
- duplicate Hero, Image Banner, Collection Grid, or another content component's behavior
- place section heading semantics out of sequence

## Supported States

### Default

The Section presents its content with standard spacing and hierarchy.

### Compact or Spacious

Spacing changes through approved semantic density tokens only.

### With Background

The background improves grouping or contrast without reducing content readability.

### Empty

The Section is safely omitted or shows a documented useful state. It must not leave unexplained blank space.

### Theme Editor Selected

The section remains structurally stable and editable without changing storefront semantics.

## Responsive Behaviour

Sections should:

- use mobile-first spacing that grows with available space through semantic tokens
- retain their semantic and DOM order
- allow full-width background while contained content preserves gutters
- adapt to translated headings, missing blocks, varied media, and large text
- avoid horizontal overflow and abrupt spacing changes

## Accessibility

The Section component should:

- use a `section` element with an accessible name when sectioning semantics are useful
- use a `div` when a landmark would be redundant
- preserve heading hierarchy and keyboard reading order
- support WCAG 2.2 AA contrast for section backgrounds and content
- avoid unnecessary ARIA on non-interactive layout

## Shopify Settings

Merchants may configure, where relevant:

- section spacing density
- contained or full-width presentation
- approved color scheme
- heading and description content
- optional divider visibility

The Design System controls:

- exact spacing values
- gutters and breakpoints
- heading scale relationships
- background contrast behavior
- focus treatment and motion timing

## Design Tokens

The Section component should use semantic tokens for:

- section-space-block
- section-space-block-compact
- section-space-block-spacious
- section-background
- section-foreground
- section-divider-gap

## Motion Rules

Sections should not animate into place by default.

When an approved content block becomes visible through merchant interaction, motion may use a short, restrained opacity transition. Motion must respect reduced-motion preferences and never conceal content until JavaScript runs.

## Performance Rules

The Section component should:

- use lightweight semantic HTML and CSS
- require no JavaScript for spacing or background behavior
- preserve progressive enhancement in the Theme Editor and storefront
- avoid layout measurements, visual effects that trigger costly repaints, and late spacing changes
- keep optional background media controlled by its dedicated media primitive

## AI Guidelines

When generating storefronts, AI should:

- create a Section only for a meaningful merchant or customer task
- select compact, standard, or spacious rhythm based on hierarchy and density
- preserve merchant content, source order, and existing Shopify section boundaries
- use Containers, Grids, Stacks, and Content Wrappers for their distinct responsibilities
- avoid inventing empty sections, headings, promotions, or backgrounds

AI must not use Section as a substitute for page architecture, create repeated wrapper-only sections, alter merchant section order without approved strategy, or embed implementation-specific behavior.

## Quality Checklist

### Purpose

- The Section represents a meaningful page region.
- It owns vertical pacing, not repeated-item layout or text measure.

### Design

- Whitespace communicates hierarchy and pacing.
- Full-width and contained behavior are clearly distinguished.

### Accessibility

- Landmark and heading semantics are appropriate.
- Reading order remains stable across responsive states.

### AI Compatibility

- The composition is deterministic and content-led.
- No merchant content or page region is fabricated.

## Future Compatibility

Future Section refinement should improve Theme Editor composition and tokenized pacing without becoming a catch-all wrapper or duplicating page-specific section systems.

New variants require a demonstrated content hierarchy need and must preserve Shopify-native editing, semantic HTML, and restrained visual rhythm.
