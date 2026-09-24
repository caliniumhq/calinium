# Collection Grid

## Purpose

The Collection Grid is the primary component used to present multiple products within a collection, search results, featured collections, and merchandising pages.

It organizes products into a consistent, responsive layout that encourages browsing while keeping the focus on the products themselves.

The Collection Grid should feel calm, structured, and effortless to navigate.

---

## Responsibilities

The Collection Grid is responsible for:

- displaying products consistently
- organizing products into a responsive grid
- supporting product discovery
- adapting to different collection sizes
- maintaining visual rhythm
- remaining accessible
- integrating with filtering and sorting

The Collection Grid is not responsible for:

- rendering product details
- displaying collection descriptions
- managing filters
- handling pagination logic
- displaying recommendations

These responsibilities belong to other components.

---

## User Goals

The Collection Grid should help customers:

- browse products efficiently
- compare products quickly
- discover relevant products
- navigate large collections comfortably
- maintain orientation while browsing

---

## Merchant Goals

The Collection Grid should help merchants:

- merchandise products consistently
- maximize product visibility
- improve product discovery
- support collection navigation
- increase product engagement

Merchants should manage collection content—not grid behavior.

---

## Structure

A Collection Grid consists of:

- Grid Container — required
- Product Cards — required

Optional:

- Collection Header
- Product Count
- Empty State
- Pagination
- Infinite Scroll
- Load More Button

---

## Required Elements

Every Collection Grid requires:

- responsive product grid
- Product Card components
- accessible structure
- consistent spacing
- responsive layout

Each product should use the documented Product Card component.

---

## Optional Elements

The Collection Grid may include:

- collection title
- collection description
- product count
- sorting controls
- filtering controls
- promotional cards
- merchandising banners
- pagination

Optional elements should never interrupt browsing.

---

## Supported Variants

### Standard Grid

Displays products in a balanced responsive grid.

Recommended for most storefronts.

---

### Editorial Grid

Uses larger imagery with increased spacing.

Suitable for luxury and premium brands.

---

### Dense Grid

Displays more products within the viewport.

Recommended for large catalogs.

---

### Masonry Grid

Displays products with varying image heights.

Recommended only when product photography benefits from an editorial presentation.

---

## Component-Specific Rules

### Grid Rules

The Collection Grid should:

- preserve consistent spacing
- maintain predictable alignment
- adapt column count responsively
- prioritize readability
- avoid visual clutter

Products should remain the primary visual focus.

---

### Product Card Rules

Every product should use the Product Card specification.

The grid should never introduce custom product layouts that conflict with documented Product Card variants.

---

### Product Ordering

Products should appear according to Shopify collection ordering.

The Collection Grid should never reorder products independently.

Supported ordering includes:

- Featured
- Best Selling
- Alphabetical
- Price
- Date
- Manual

---

### Empty State Rules

If no products exist, the Collection Grid should communicate this clearly.

An empty state may include:

- message
- search suggestion
- collection navigation
- return link

The empty state should remain helpful and reassuring.

---

### Pagination Rules

The Collection Grid may support:

- numbered pagination
- Load More
- infinite scrolling

Only one navigation pattern should be active at a time.

Pagination should preserve browsing context whenever possible.

---

### Promotional Content

Optional promotional blocks may appear within the grid.

Promotional content should:

- remain visually distinct
- avoid interrupting browsing
- preserve grid alignment
- appear at predictable intervals

Promotional content should never dominate product visibility.

---

## Supported States

### Default

Products are displayed normally.

---

### Loading

Skeleton Product Cards may appear.

Grid dimensions should remain stable.

---

### Empty

No products are available.

Helpful guidance should be displayed.

---

### Filtered

Only matching products are displayed.

---

### Paginating

Additional products are loading.

The browsing position should remain stable.

---

## Responsive Behaviour

The Collection Grid should:

- adjust column count responsively
- preserve consistent spacing
- maintain readable Product Cards
- avoid horizontal scrolling
- support comfortable touch interaction

Columns should adapt naturally without abrupt layout changes.

---

## Accessibility

Every Collection Grid must support:

- semantic list structure
- logical reading order
- keyboard navigation
- visible focus indicators
- accessible pagination controls
- screen reader compatibility

Product Cards should preserve their own accessibility requirements.

---

## Shopify Settings

Merchants may configure:

- products per page
- desktop columns
- mobile columns
- grid spacing
- pagination style
- enable infinite scrolling
- show product count
- show collection description

Merchants should not configure:

- typography
- animation timing
- responsive breakpoints
- Product Card layout

These belong to the Design System.

---

## Design Tokens

The Collection Grid should use semantic tokens for:

- spacing
- column gap
- row gap
- content width
- grid margins
- transitions

Example token categories:

- collection-grid-gap
- collection-grid-columns
- collection-grid-spacing
- collection-grid-content
- collection-grid-transition

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- fade-in
- pagination transition
- loading placeholder transition

Avoid:

- bouncing
- scaling
- decorative animations
- staggered effects that delay browsing

Motion should never distract from products.

---

## Performance Rules

The Collection Grid should:

- lazy-load Product Cards
- lazy-load images
- avoid layout shifts
- reuse Product Card components
- minimize JavaScript
- support efficient pagination

Scrolling should remain smooth regardless of collection size.

---

## AI Guidelines

When generating storefronts, AI should:

- reuse the Product Card specification
- choose the appropriate grid variant
- preserve Shopify product ordering
- maintain accessibility
- avoid custom layouts unless explicitly requested
- prioritize browsing efficiency

AI should never invent products or reorder Shopify collection data.

---

## Quality Checklist

### Purpose

- Products are easy to browse.
- Grid supports efficient comparison.

### Design

- Consistent spacing is maintained.
- Product Cards remain visually balanced.
- Products receive primary emphasis.

### Accessibility

- Reading order is logical.
- Keyboard navigation works.
- Focus indicators remain visible.

### Responsive

- Columns adapt correctly.
- Product Cards remain readable.
- Horizontal scrolling is avoided.

### Performance

- Images lazy-load efficiently.
- No layout shifts occur.
- Pagination performs smoothly.

### AI Compatibility

- Grid layout is deterministic.
- Product Cards are reused.
- Shopify collection ordering is preserved.

---

## Future Compatibility

Before extending the Collection Grid, ask:

- Does the feature improve product discovery?
- Can an existing grid variant support it?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Collection Grid should evolve through refinement rather than expansion.

Every Collection Grid should present products with clarity, consistency, and balance while preserving accessibility, performance, and the calm premium browsing experience that defines Calinium.
