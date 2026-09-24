# Filters

## Purpose

The Filters component enables customers to narrow product listings based on meaningful product attributes.

It helps customers find relevant products more quickly without increasing cognitive load.

Filters should simplify browsing—not complicate it.

---

## Responsibilities

The Filters component is responsible for:

- presenting available filtering options
- refining visible products
- communicating active filters
- supporting filter removal
- remaining responsive
- maintaining accessibility

The Filters component is not responsible for:

- sorting products
- changing collection order
- managing pagination
- displaying product information
- generating filter values

These responsibilities belong to Shopify search and collection systems.

---

## User Goals

The Filters component should help customers:

- locate products faster
- narrow large collections
- understand available options
- remove filters easily
- browse confidently

---

## Merchant Goals

The Filters component should help merchants:

- improve product discovery
- reduce browsing friction
- increase conversion
- support large catalogs
- expose meaningful product attributes

Merchants should manage filter data—not filter behavior.

---

## Structure

A Filters component consists of:

- Filter Groups — required
- Filter Options — required
- Active Filters — optional
- Clear Filters Action — optional
- Product Count — optional

---

## Required Elements

Every Filters component requires:

- filter categories
- selectable filter values
- accessible controls
- responsive layout
- clear visual hierarchy

Customers should immediately understand how filtering works.

---

## Optional Elements

The Filters component may include:

- active filter chips
- product count
- color swatches
- price range
- availability filter
- vendor filter
- size filter
- rating filter
- collapsible groups

Optional features should improve browsing efficiency.

---

## Supported Variants

### Sidebar Filters

Displays filter groups in a vertical sidebar.

Recommended for desktop collection pages.

---

### Drawer Filters

Displays filters inside a slide-out drawer.

Recommended for mobile devices.

---

### Horizontal Filters

Displays primary filters above the collection grid.

Suitable for small product catalogs.

---

### Compact Filters

Displays only essential filter categories.

Recommended when screen space is limited.

---

## Component-Specific Rules

### Filter Group Rules

Each filter group should:

- include a clear heading
- group related options
- remain collapsible when appropriate
- preserve logical ordering

Examples:

- Category
- Size
- Color
- Price
- Brand
- Availability

---

### Filter Option Rules

Filter options should:

- remain easy to scan
- display meaningful labels
- communicate availability
- support keyboard interaction

Unavailable values may remain visible but should communicate their state clearly.

---

### Active Filter Rules

When filters are applied:

- active selections should remain visible
- customers should be able to remove individual filters
- all active filters should be easy to understand

Applied filters should never become hidden.

---

### Clear Filters Rules

A Clear Filters action should:

- remove all active filters
- update results immediately
- remain available only when filters are active

Customers should never need to remove filters individually unless they choose to.

---

### Price Filter Rules

Price filtering should:

- support minimum and maximum values
- validate numeric input
- communicate the selected range clearly

Displayed currency should follow the store's active currency.

---

### Color Filter Rules

Color filters may use:

- text labels
- color swatches
- image swatches

Swatches should include accessible labels.

Meaning should never rely solely on color.

---

## Supported States

### Default

No filters are applied.

---

### Active

One or more filters are selected.

---

### Expanded

A filter group is open.

---

### Collapsed

A filter group is closed.

---

### Loading

Products are updating.

The interface should remain stable during updates.

---

### Empty Results

No products match the selected filters.

Helpful guidance should be displayed.

---

## Responsive Behaviour

The Filters component should:

- use a sidebar on larger screens
- use a drawer on smaller screens
- preserve selected filters
- remain touch friendly
- avoid horizontal scrolling

Filter interactions should feel consistent across all devices.

---

## Accessibility

Every Filters component must support:

- semantic form controls
- keyboard navigation
- visible focus indicators
- accessible labels
- screen reader compatibility
- sufficient contrast

Expanded and collapsed groups should communicate their state using appropriate ARIA attributes.

---

## Shopify Settings

Merchants may configure:

- enable filtering
- filter position
- collapsible groups
- show product count
- show active filters
- show color swatches
- show price filter
- show availability filter

Merchants should not configure:

- spacing
- typography
- animation timing
- responsive behavior

These belong to the Design System.

---

## Design Tokens

The Filters component should use semantic tokens for:

- spacing
- typography
- borders
- divider spacing
- colors
- transitions

Example token categories:

- filter-spacing
- filter-group-gap
- filter-border
- filter-divider
- filter-transition

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- accordion expansion
- fade transition
- drawer transition

Avoid:

- bouncing
- scaling
- decorative animations

Filtering should feel immediate and predictable.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Filters component should:

- update efficiently
- preserve scroll position where appropriate
- avoid layout shifts
- minimize JavaScript
- reuse Shopify filtering APIs

Filtering should remain responsive even in large catalogs.

---

## AI Guidelines

When generating storefronts, AI should:

- expose only meaningful filter groups
- preserve Shopify filter data
- choose the appropriate layout for the viewport
- maintain accessibility
- reuse documented filter patterns

AI should never invent filter categories or modify Shopify filtering logic.

---

## Quality Checklist

### Purpose

- Products are easier to discover.
- Filtering feels intuitive.

### Design

- Filter groups are organized logically.
- Active filters are easy to recognize.
- Visual hierarchy remains clear.

### Accessibility

- Keyboard navigation works.
- Filter states are announced correctly.
- Focus indicators remain visible.

### Responsive

- Sidebar and drawer layouts adapt correctly.
- Touch interaction remains comfortable.
- Selected filters persist across layouts.

### Performance

- Results update efficiently.
- No layout shifts occur.
- Shopify filtering remains synchronized.

### AI Compatibility

- Filter layout is deterministic.
- Shopify filter data is preserved.
- Existing filter patterns are reused.

---

## Future Compatibility

Before extending the Filters component, ask:

- Does the feature improve product discovery?
- Can an existing filter pattern support it?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Filters component should evolve through refinement rather than expansion.

Every Filters component should help customers find the right products quickly while preserving clarity, accessibility, performance, and the calm premium browsing experience that defines Calinium.
