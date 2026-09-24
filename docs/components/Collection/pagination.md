# Pagination

## Purpose

The Pagination component allows customers to navigate through multiple pages of products, search results, articles, or other collections of content.

It organizes large datasets into manageable groups while preserving browsing context and reducing cognitive load.

Pagination should make navigation predictable—not disruptive.

---

## Responsibilities

The Pagination component is responsible for:

- navigating between pages
- communicating the current page
- preserving browsing context
- supporting keyboard navigation
- adapting across all devices
- maintaining accessibility

The Pagination component is not responsible for:

- loading products
- sorting content
- filtering content
- generating page counts
- managing collection logic

These responsibilities belong to Shopify collection and search systems.

---

## User Goals

The Pagination component should help customers:

- browse large collections comfortably
- understand their current position
- move efficiently between pages
- continue browsing without confusion

---

## Merchant Goals

The Pagination component should help merchants:

- support large product catalogs
- improve browsing efficiency
- maintain predictable navigation
- reduce interface complexity

Merchants should configure pagination style—not navigation behavior.

---

## Structure

A Pagination component consists of:

- Previous Button — required
- Current Page Indicator — required
- Next Button — required

Optional:

- Page Numbers
- First Page Button
- Last Page Button
- Ellipsis
- Results Summary

---

## Required Elements

Every Pagination component requires:

- previous navigation
- next navigation
- current page indication
- accessible controls
- responsive layout

Customers should always know where they are within the collection.

---

## Optional Elements

The Pagination component may include:

- numbered pages
- first page shortcut
- last page shortcut
- results summary
- ellipsis for long page ranges
- load progress indicator

Optional elements should simplify navigation rather than increase visual complexity.

---

## Supported Variants

### Numbered Pagination

Displays numbered page links.

Recommended for desktop collection pages.

---

### Previous / Next

Displays only previous and next navigation.

Recommended for simple browsing experiences.

---

### Load More

Displays a button that loads additional products.

Suitable for progressive browsing.

---

### Infinite Scroll

Loads additional products automatically as customers scroll.

Recommended only when continuous browsing improves the shopping experience.

---

## Component-Specific Rules

### Navigation Rules

Selecting a page should:

- update the displayed content
- preserve filters and sorting
- maintain browsing context
- update browser history appropriately

Customers should never lose their browsing state unnecessarily.

---

### Previous / Next Rules

The Previous button should:

- navigate to the previous page
- become unavailable on the first page

The Next button should:

- navigate to the next page
- become unavailable on the last page

Unavailable controls should remain visually distinguishable.

---

### Page Number Rules

Page numbers should:

- clearly indicate the current page
- remain easy to scan
- support keyboard navigation
- avoid excessive page links

For long page ranges, ellipses should reduce visual clutter.

---

### Results Summary

When displayed, a results summary may include:

- current result range
- total results
- current page
- total pages

Example:

```
Showing 25–48 of 312 products
```

The summary should remain visually secondary.

---

## Supported States

### Default

Pagination is available.

---

### Active

The current page is clearly indicated.

---

### Hover

Desktop users receive subtle interaction feedback.

---

### Focus

Keyboard users receive visible focus indicators.

---

### Disabled

Unavailable navigation controls are clearly communicated.

---

### Loading

New content is loading.

Layout dimensions should remain stable.

---

## Responsive Behaviour

The Pagination component should:

- simplify navigation on smaller screens
- preserve comfortable touch targets
- avoid horizontal scrolling
- remain easy to operate with one hand

Mobile layouts should prioritize Previous and Next controls over large page ranges.

---

## Accessibility

Every Pagination component must support:

- semantic navigation landmarks
- keyboard navigation
- visible focus indicators
- accessible labels
- screen reader compatibility
- sufficient contrast

Navigation controls should expose meaningful labels.

Examples:

- Previous Page
- Next Page
- Page 3

---

## Shopify Settings

Merchants may configure:

- products per page
- pagination style
- show page numbers
- show results summary
- enable load more
- enable infinite scroll

Merchants should not configure:

- spacing
- typography
- animation timing
- responsive behavior

These belong to the Design System.

---

## Design Tokens

The Pagination component should use semantic tokens for:

- spacing
- typography
- borders
- colors
- border radius
- transitions

Example token categories:

- pagination-spacing
- pagination-border
- pagination-radius
- pagination-current
- pagination-transition

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- fade transition
- opacity transition
- loading indicator

Avoid:

- bouncing
- scaling
- decorative animations

Navigation should feel immediate and predictable.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Pagination component should:

- preserve scroll performance
- avoid layout shifts
- minimize JavaScript
- reuse Shopify pagination data
- maintain browser history correctly

Page transitions should remain efficient even in large catalogs.

---

## AI Guidelines

When generating storefronts, AI should:

- use Numbered Pagination by default for desktop
- simplify navigation on mobile
- preserve Shopify pagination behavior
- maintain accessibility
- reuse documented pagination patterns

AI should never invent pagination logic or modify Shopify collection data.

---

## Quality Checklist

### Purpose

- Browsing large collections is easy.
- Current position is always clear.

### Design

- Navigation hierarchy is clear.
- Current page receives appropriate emphasis.
- Controls remain visually balanced.

### Accessibility

- Keyboard navigation works.
- Focus indicators remain visible.
- Navigation labels are meaningful.

### Responsive

- Mobile navigation remains simple.
- Touch targets are accessible.
- Layout adapts gracefully.

### Performance

- Navigation remains responsive.
- No layout shifts occur.
- Shopify pagination is preserved.

### AI Compatibility

- Pagination behavior is deterministic.
- Shopify navigation logic is reused.
- Existing interaction patterns are preserved.

---

## Future Compatibility

Before extending the Pagination component, ask:

- Does the feature improve browsing?
- Can an existing pagination variant support it?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Pagination component should evolve through refinement rather than expansion.

Every Pagination component should help customers navigate large collections confidently while preserving clarity, accessibility, performance, and the calm premium browsing experience that defines Calinium.
