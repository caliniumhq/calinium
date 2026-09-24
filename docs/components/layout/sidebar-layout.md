# Sidebar Layout

## Purpose

The Sidebar Layout component composes a flexible main-content region with one secondary region.

It supports information-dense Shopify contexts such as collection filtering, customer account navigation, and support content while remaining calm, readable, and mobile first.

## Responsibilities

The Sidebar Layout component is responsible for:

- arranging one main region and one secondary region
- protecting a flexible, readable main-content width
- setting a minimum usable sidebar width
- collapsing to a stable source-ordered sequence
- supporting optional sticky behavior as a progressive implementation detail

The Sidebar Layout component is not responsible for:

- rendering filters, account navigation, support navigation, or drawer behavior
- defining sidebar links, controls, or selected states
- setting page-level widths or section spacing
- forcing sticky behavior
- creating a third primary page region

## User Goals

The Sidebar Layout component should help customers:

- browse or manage a focused main task with relevant secondary controls nearby
- retain an understandable reading order on every device
- access secondary content without crowding the main content
- use filters or account navigation with appropriate touch space

## Merchant Goals

The Sidebar Layout component should help merchants:

- present real collection filters, account links, or support content consistently
- choose an approved sidebar position where a parent supports it
- retain a premium, restrained content hierarchy as Shopify content changes

## Structure

A Sidebar Layout consists of:

- main-content region — required
- secondary region — required

Optional:

- sidebar before or after main content in source order when that reflects the customer task
- documented sticky sidebar enhancement
- a parent Container, Section, or Content Wrapper

## Required Elements

Every Sidebar Layout requires:

- one flexible main region
- one secondary region with a usable minimum width
- a tokenized region gap
- source order that remains useful when stacked
- a collapse behavior that does not hide secondary content

## Optional Elements

A Sidebar Layout may include:

- filter groups supplied by Filters
- account or support navigation supplied by its dedicated component
- an optional non-essential sticky sidebar enhancement on wider screens
- an optional Section-owned heading or background

## Supported Variants

### Sidebar Start

The secondary region appears before main content in source and visual order. Suitable when secondary navigation is needed before browsing.

### Sidebar End

The secondary region appears after main content in source and visual order. Suitable when it is supporting context rather than primary navigation.

### Collapsed

The secondary region follows its semantic source order in one column.

### Sticky Enhanced

Applies optional sticky positioning only when the available viewport and content length make it stable. It is never required to understand or use the layout.

## Component-Specific Rules

A Sidebar Layout must:

- reserve flexible width for the main region and a minimum usable width for the sidebar
- use CSS Grid or Flexbox with intrinsic sizing
- preserve DOM order during all responsive changes
- collapse before controls, text, or filters become cramped
- allow the sidebar's dedicated component to own its interaction behavior

A Sidebar Layout must not:

- replace the mobile Filter Drawer, account navigation, or a support-navigation component
- rely on sticky positioning to expose required controls
- use fixed pixel positioning, forced heights, or source-order reversal
- hide a secondary region only because available width is limited

## Supported States

### Default

Main and secondary regions appear together in their assigned arrangement.

### Collapsed

Regions stack in their semantic source order with a clear relationship.

### Sticky Enhanced

The sidebar may remain visible while the main region scrolls when the enhancement is supported and non-essential.

### Empty Secondary Region

The parent component should omit Sidebar Layout or render its documented alternative. An empty sidebar must not leave a vacant column.

## Responsive Behaviour

Sidebar Layouts should:

- favor the main task at narrow widths
- stack the secondary region without changing DOM order
- use intrinsic minimum widths and natural reflow before explicit breakpoints
- retain full filter, account, or support functionality after collapse
- avoid horizontal scrolling, clipped focus rings, and inaccessible sticky offsets

## Accessibility

The Sidebar Layout component should:

- preserve semantic landmarks defined by main and secondary content
- preserve semantic HTML appropriate to each contained region
- keep keyboard, focus, visual, and screen-reader order aligned
- ensure sticky enhancement does not obscure focused controls or landmarks
- provide adequate touch spacing inside both regions
- avoid ARIA additions to a non-interactive layout primitive
- support WCAG 2.2 AA outcomes through the contained components and surfaces

## Shopify Settings

Merchants may configure, where a parent supports it:

- sidebar start or end presentation
- optional sticky enhancement where stable
- visibility of real secondary content
- approved spacing density

The Design System controls:

- minimum sidebar width
- main-region flexibility
- collapse behavior and breakpoints
- gap values
- sticky offset safety
- focus behavior and motion timing

## Design Tokens

The Sidebar Layout component should use semantic tokens for:

- sidebar-min-width
- sidebar-layout-gap
- sidebar-layout-gap-compact
- sidebar-sticky-offset
- main-content-min-width

## Motion Rules

Sidebar Layout should not animate between side-by-side and stacked states.

Sticky behavior, when enabled, should not use decorative motion. Dedicated Filter Drawer or navigation components own any appropriate restrained transition and must respect reduced-motion preferences.

## Performance Rules

The Sidebar Layout component should:

- use CSS layout primitives and minimal markup
- require no JavaScript for collapse behavior
- treat sticky positioning as optional CSS enhancement
- preserve progressive enhancement when sticky support is unavailable
- avoid scroll listeners, viewport polling, and layout measurement

## AI Guidelines

When generating storefronts, AI should:

- choose Sidebar Layout only for one main task and one genuinely secondary region
- preserve real filter, account, and support content from Shopify
- select source order based on customer task priority
- use dedicated Filters and navigation components for interaction behavior
- use semantic tokens and intrinsic responsiveness
- select a deterministic source-ordered sidebar arrangement

AI should not create an empty sidebar, hide required content on mobile, or use sticky positioning as a substitute for hierarchy.

## Quality Checklist

### Purpose

- One flexible main region and one secondary region are present.
- Secondary content remains genuinely supportive.

### Design

- The main task retains visual priority.
- The sidebar remains calm and does not feel like an admin panel.

### Accessibility

- Source, visual, focus, and reading order agree after collapse.
- Sticky behavior remains optional and does not obscure content.

### AI Compatibility

- Real Shopify resources and dedicated interactive components are reused.
- No empty or invented secondary region is generated.

## Future Compatibility

Future Sidebar Layout refinement should improve demonstrated browsing, account, and support contexts without duplicating Filter Drawer or account-navigation behavior.

Any additional region, sticky rule, or collapse pattern requires evidence that it preserves mobile-first composition and semantic order.
