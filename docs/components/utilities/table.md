# Table

## Purpose

Table presents genuinely tabular data with meaningful row and column relationships. It supports comparison clarity without becoming page layout, arbitrary card collection, or a replacement for product-comparison logic.

## Responsibilities

Table owns table semantics, caption, headers, row relationships, density, controlled overflow fallback, and empty/loading presentation.

Table is not responsible for general page layout, sorting unless implemented, comparison criteria, data calculation, or card transformation that destroys semantic relationships.

## User Goals

Table should help customers compare real related values across rows and columns accurately.

## Merchant Goals

Table should help merchants display verified structured Shopify or policy data without custom layout workarounds or misleading comparison.

## Structure

Table consists of table, meaningful header cells, and related data cells — required.

Optional: caption, row headers, sortable header only when implemented, Scroll Area, Empty State, and Skeleton.

## Required Elements

Every Table requires true tabular relationship, caption when context needs it, header associations, and responsive strategy that retains comparison clarity.

## Optional Elements

Row headers, dense variant, sort controls, horizontal Scroll Area, and loading or empty feedback may appear only when data and interaction exist.

## Supported Variants

### Simple

Clear small data set.

### Dense

More rows or columns while preserving readable touch and text space.

### Comparison

Real comparable attributes across items; comparison workflow remains separately owned.

### Overflow

Controlled horizontal Scroll Area when reflow would destroy relationships.

## Component-Specific Rules

Table must use `table`, `caption`, `th`, scope or header association appropriately, and preserve header-to-cell relationships under responsive presentation.

Table must not be used for page layout, visually turn into cards when comparison semantics are lost, invent rows or values, or expose sortable controls without implementation.

## Supported States

### Populated

Verified data is available.

### Empty

Parent shows Empty State or omits table.

### Loading

Skeleton reflects actual table geometry.

### Unavailable

Table does not guess missing values.

## Responsive Behaviour

Tables should reflow only when relationships remain clear; otherwise use a controlled Scroll Area with visible overflow cue, keyboard operation, and preserved headers. No horizontal page overflow is allowed.

## Accessibility

Table must use semantic HTML, caption and header association where needed, WCAG 2.2 AA contrast, logical reading order, keyboard-operable overflow, and no color-only comparison meaning.

## Shopify Settings

Merchants may configure verified caption, approved density, visible columns within controlled limits, and optional sorting only where implemented.

The Design System controls layout, overflow threshold, header styling, focus, scrollbar treatment, breakpoints, and motion.

## Design Tokens

Table should use table-gap, table-cell-padding, table-header-surface, table-border, table-row-hover, table-scroll-shadow, and table-focus-ring tokens.

## Motion Rules

Table should not animate sorting or reordering without clear implemented feedback. Reduced-motion preferences are respected.

## Performance Rules

Table should server render semantic data, use minimal JavaScript, progressive enhancement, no polling, stable column geometry, deferred non-critical sorting, and no heavy table library.

## AI Guidelines

AI should use Table only for verified true tabular data, choose deterministic semantic structure, preserve headers and values, and use Scroll Area only when reflow fails.

AI must not turn general content into a table, invent comparisons, or hide relation semantics.

## Quality Checklist

### Semantics

- Row/column relationships are genuine and header associations are accurate.
- Table is not used as layout.

### Responsive

- Overflow preserves comparison clarity and keyboard access.
- Page itself does not scroll horizontally.

### Integrity

- Values are verified and unavailable data is not guessed.

## Future Compatibility

Future Table refinement should remain data-led and accessible. New sorting, comparison, or responsive transformation requires implemented behavior, semantic preservation, and a demonstrated storefront need.
