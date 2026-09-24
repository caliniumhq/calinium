# Search

## Purpose

The Search component enables customers to quickly discover products, collections, pages, and articles through direct input rather than navigation.

Search should reduce the time required to find relevant content while remaining fast, accurate, and unobtrusive.

The Search component should support discovery—not replace good navigation.

---

## Responsibilities

The Search component is responsible for:

- accepting search queries
- presenting predictive suggestions
- displaying search results
- supporting keyboard navigation
- improving product discovery
- adapting across all devices
- remaining accessible

The Search component is not responsible for:

- filtering collections
- sorting results
- merchandising campaigns
- modifying search relevance
- generating recommendations

These responsibilities belong to dedicated systems.

---

## User Goals

The Search component should help customers:

- find products quickly
- locate collections
- discover articles and pages
- recover from navigation mistakes
- browse large catalogs efficiently

---

## Merchant Goals

The Search component should help merchants:

- increase product discovery
- reduce abandonment
- improve conversion
- surface relevant products
- support large catalogs

Merchants should configure search behavior—not search algorithms.

---

## Structure

A Search component consists of:

- Search input — required
- Search button or icon — required
- Predictive results — optional
- Recent searches — optional
- Popular searches — optional
- Empty state — required
- Search results page — required

---

## Required Elements

Every Search component requires:

- search field
- accessible label
- submit action
- keyboard support
- clear placeholder
- empty state

The search field should always remain immediately understandable.

---

## Optional Elements

The Search component may include:

- predictive search
- product suggestions
- collection suggestions
- article suggestions
- recent searches
- trending searches
- search categories

Optional features should improve discovery without overwhelming customers.

---

## Supported Variants

### Standard

Displays a dedicated search page.

Recommended for every storefront.

---

### Predictive Search

Displays suggestions while the customer types.

Results should appear immediately and remain relevant.

---

### Search Drawer

Search opens inside a drawer.

Suitable for minimal storefronts.

---

### Full Screen Search

Search occupies the full viewport.

Suitable for editorial and luxury experiences.

---

### Inline Search

Search field remains permanently visible.

Recommended for stores where search is heavily used.

---

## Component-Specific Rules

### Search Input Rules

The search field should:

- accept natural language
- remain clearly visible
- display helpful placeholder text
- support keyboard shortcuts where appropriate

Recommended placeholder:

```
Search products
```

Avoid promotional placeholder text.

---

### Predictive Search Rules

Predictive search should:

- appear quickly
- update continuously
- prioritize relevant products
- remain keyboard accessible
- disappear predictably

Suggestions should be grouped by content type.

Examples:

- Products
- Collections
- Articles
- Pages

---

### Search Result Rules

Search results should:

- prioritize product relevance
- display product imagery
- display pricing
- highlight matching text
- communicate empty results clearly

Customers should immediately understand what was found.

---

### Empty State Rules

If no results are found:

- explain that nothing matched
- suggest checking spelling
- encourage broader search terms
- optionally recommend popular products

Avoid displaying an empty page.

---

### Keyboard Rules

The Search component should support:

- Tab navigation
- Enter to submit
- Arrow keys for suggestions
- Escape to close predictive results

Keyboard interaction should remain predictable.

---

## Supported States

### Closed

Search is inactive.

---

### Focused

Input is ready for typing.

---

### Typing

Suggestions update continuously.

---

### Loading

Search results are loading.

Layout should remain stable.

---

### Results

Relevant content is displayed.

---

### Empty

No results are found.

Helpful guidance should be presented.

---

## Responsive Behaviour

The Search component should:

- remain easy to access
- preserve readable results
- maintain touch-friendly controls
- adapt gracefully across viewport sizes

Predictive results should remain usable on mobile devices.

---

## Accessibility

Every Search component must support:

- semantic search landmark
- accessible input label
- keyboard navigation
- visible focus indicators
- accessible suggestion lists
- screen reader announcements
- reduced-motion preferences

Predictive suggestions should expose appropriate ARIA roles.

---

## Shopify Settings

Merchants may configure:

- enable predictive search
- show products
- show collections
- show pages
- show articles
- show recent searches
- show popular searches
- maximum suggestions

Merchants should not configure:

- spacing
- typography
- animation timing
- relevance ranking

These belong to Shopify and the Design System.

---

## Design Tokens

The Search component should use semantic tokens for:

- spacing
- typography
- colors
- borders
- shadows
- transitions
- input height
- result spacing

Example token categories:

- search-background
- search-border
- search-spacing
- search-shadow
- search-transition

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- fade
- gentle expansion
- opacity transition

Avoid:

- bouncing
- scaling
- decorative animations
- distracting loading effects

Search should always feel immediate.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Search component should:

- debounce predictive requests
- lazy-load non-essential content
- avoid layout shifts
- minimize JavaScript
- render efficiently
- cache repeated queries where appropriate

Search should remain responsive on all supported devices.

---

## AI Guidelines

When generating storefronts, AI should:

- enable predictive search by default
- prioritize products over secondary content
- keep suggestions concise
- preserve accessibility
- maintain responsive behavior
- reuse documented layouts

AI should never invent search results or alter Shopify search relevance.

---

## Quality Checklist

### Purpose

- Search is easy to discover.
- Product discovery is improved.

### Design

- Results remain uncluttered.
- Suggestions are grouped logically.
- Empty states are helpful.

### Accessibility

- Keyboard navigation works.
- Focus indicators are visible.
- Screen readers receive meaningful updates.

### Responsive

- Search works on all devices.
- Suggestions remain readable.
- Touch targets are accessible.

### Performance

- Predictive search is responsive.
- No layout shifts occur.
- JavaScript remains efficient.

### AI Compatibility

- Search behavior is deterministic.
- Existing search patterns are reused.
- Results remain customer-focused.

---

## Future Compatibility

Before extending the Search component, ask:

- Does the feature improve product discovery?
- Can Shopify already provide this functionality?
- Will merchants understand the setting?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing search pattern satisfies the requirement, reuse it.

The Search component should evolve through refinement rather than expansion.

Every search experience should help customers discover products quickly, reduce friction, improve confidence, and remain fast, accessible, and consistent with the Calinium design philosophy.
