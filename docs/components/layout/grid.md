# Grid

## Purpose

The Grid component organizes repeated or comparably weighted content in a two-dimensional layout.

It provides predictable columns, rows, and gaps for Shopify product, collection, article, logo, and promotional content while keeping the content itself responsible for its own rendering.

## Responsibilities

The Grid component is responsible for:

- arranging repeated items into rows and columns
- owning row and column gaps
- supporting intrinsic and explicitly approved column patterns
- preserving source order through responsive changes
- accommodating incomplete final rows and differing content length

The Grid component is not responsible for:

- rendering Product Cards, editorial cards, or media
- page-level horizontal gutters
- section-level vertical spacing
- filtering, sorting, pagination, or merchandising logic
- reordering Shopify resources

## User Goals

The Grid component should help customers:

- scan comparable content efficiently
- compare products, articles, logos, or promotions without clutter
- retain a clear reading order at every viewport
- browse comfortably at narrow widths and browser zoom

## Merchant Goals

The Grid component should help merchants:

- present Shopify content in a consistent, premium structure
- select approved grid density or column limits when a parent supports them
- retain predictable composition as product counts and translations change

## Structure

A Grid consists of:

- one grid container — required
- two or more related grid items — required

Optional:

- grid heading owned by a surrounding Section
- promotional or editorial item using the same grid placement rules
- empty state owned by the relevant content component

## Required Elements

Every Grid requires:

- logical source order
- semantic item structure appropriate to its content
- tokenized row and column gaps
- columns that can shrink and wrap without overflow
- a safe incomplete-final-row presentation

## Optional Elements

A Grid may include:

- equal-height item behavior when content supports it
- variable-height item behavior for editorial content
- an approved compact, standard, or spacious gap density
- a constrained promotional insertion that does not obscure browsing

## Supported Variants

### Intrinsic

Uses a minimum item width with `minmax()` or an equivalent intrinsic rule. Recommended default for dynamic Shopify content.

### Fixed Count

Uses an approved responsive column count for consistent merchandising grids.

### Equal Height

Aligns comparable cards when their content model supports a stable height.

### Variable Height

Allows items to follow their content or media proportions while preserving row and column gaps. It is not a masonry system.

### Feature Item

Allows one approved item to span a documented grid area without changing source order.

## Component-Specific Rules

A Grid must:

- use CSS Grid and `gap` rather than child margins where possible
- preserve Shopify resource ordering and DOM order
- handle missing optional content and incomplete final rows naturally
- use `minmax()` and intrinsic sizing before adding breakpoint-specific column rules
- keep an item's interactive content within its own documented component

A Grid must not:

- reorder items visually in a way that conflicts with keyboard or screen-reader order
- use masonry, absolute positioning, or JavaScript measurements without a demonstrated requirement
- set page width or child card visual treatment
- create a separate product-card implementation

## Supported States

### Default

Related items appear in their assigned grid pattern.

### Incomplete Final Row

Remaining items retain their natural source order and alignment without artificial filler.

### Empty

The relevant collection, search, article, or logo component owns the empty state. Grid itself does not fabricate items.

### Loading

When a parent has a real loading state, reserved item dimensions should reduce layout shift.

## Responsive Behaviour

Grids should:

- begin with one or two useful columns according to content and touch needs
- adapt through intrinsic sizing before explicit breakpoint changes
- preserve gaps, reading order, and item tap targets
- support product counts, long translations, varied media ratios, and large text
- avoid horizontal scrolling at 320 px and above

## Accessibility

The Grid component should:

- use semantic lists when presenting a list of peer items
- preserve semantic HTML appropriate to the item relationship
- preserve DOM, keyboard, and screen-reader order
- keep sufficient space between interactive descendants
- avoid ARIA grid roles unless the pattern truly requires grid interaction behavior
- support WCAG 2.2 AA contrast through child components and surrounding surfaces

## Shopify Settings

Merchants may configure, where a parent component supports it:

- approved desktop and mobile column limits
- gap density
- equal or variable item-height presentation
- an approved feature-item placement

The Design System controls:

- exact gap values
- grid algorithm
- minimum item widths
- breakpoint definitions
- responsive fallback behavior
- focus and motion behavior

## Design Tokens

The Grid component should use semantic tokens for:

- grid-gap-row
- grid-gap-column
- grid-gap-compact
- grid-gap-spacious
- grid-item-min-width
- grid-columns

## Motion Rules

Grid layout should not animate when responsive columns change.

Child components may use their own restrained interaction motion. Loading or content replacement must not create attention-seeking reflow, and reduced-motion preferences must be respected.

## Performance Rules

The Grid component should:

- use native CSS Grid with minimal markup
- require no JavaScript for responsive columns
- preserve progressive enhancement for Shopify-rendered content
- avoid observers, item measurement, and client-side reordering
- reserve dimensions through child media primitives where appropriate

## AI Guidelines

When generating storefronts, AI should:

- use Grid only for peer content requiring two-dimensional comparison or browsing
- select intrinsic layout as the default for dynamic Shopify content
- preserve merchant ordering, content, and resource availability
- reuse Product Card and other documented item primitives
- use semantic design tokens rather than one-off columns or gaps
- generate deterministic composition from the approved grid variants

AI should not create decorative grids, fake items, or novel column patterns without evidence.

## Quality Checklist

### Purpose

- Grid owns rows, columns, and gaps only.
- Child components own their content and states.

### Design

- Density remains restrained and scanning remains easy.
- Final rows and varied content look intentional.

### Accessibility

- Source, visual, focus, and reading order agree.
- Interactive descendants have adequate spacing.

### AI Compatibility

- Shopify ordering and merchant content are preserved.
- No separate card or masonry system is generated.

## Future Compatibility

Future Grid refinement should improve demonstrated merchandising patterns through tokenized intrinsic rules, not through uncontrolled column variants or visual reordering.

Any future feature-item or dense presentation must remain accessible, performance-first, and compatible with existing Shopify content components.
