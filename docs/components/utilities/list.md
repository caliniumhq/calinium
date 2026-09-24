# List

## Purpose

List defines semantic ordered, unordered, description, or structured item presentation. It organizes real related content without becoming a spacing technique, card grid, or navigation system.

## Responsibilities

List owns list semantics, item grouping, density, optional Divider treatment, and safe nesting limits.

List is not responsible for page layout, pagination, navigation, card behavior, table relationships, or inventing list content.

## User Goals

List should help customers scan grouped, sequential, or term-value content in a clear reading order.

## Merchant Goals

List should help merchants present real Shopify content and rich text consistently without manual bullets, margins, or structural workarounds.

## Structure

List consists of semantic list container and related items — required.

Optional: item icon, Divider, description term/value pairing, nested list, and compact or relaxed density.

## Required Elements

Every List requires appropriate `ul`, `ol`, or `dl` semantics, related items, and visual cues that preserve sequence or grouping where meaningful.

## Optional Elements

Icons, dividers, nested lists, and density may appear when they clarify real content. Stack owns internal item spacing; Divider owns visual separation.

## Supported Variants

### Unordered

Peer items with no sequence.

### Ordered

Sequence where order matters.

### Description

Term-value or label-description relationship through `dl`.

### Divided

Related items separated through documented Divider treatment.

### Compact or Relaxed

Controlled density for content context.

## Component-Specific Rules

List must preserve semantic structure, source order, and visible grouping. Nested lists must remain limited and readable.

List must not exist merely for spacing, remove all structural cues where sequence matters, replace Table for tabular data, or turn ordinary list items into cards without a content component.

## Supported States

### Populated

Related content is shown.

### Empty

Parent renders appropriate Empty State or omission; List does not invent items.

### Loading

Parent may use Skeleton matching list geometry.

## Responsive Behaviour

Lists should wrap long translated text, retain markers or terms, preserve source order, and avoid horizontal overflow at narrow widths, zoom, and large text settings.

## Accessibility

List must use semantic HTML, logical reading order, WCAG 2.2 AA contrast, visible focus for child links, and no ARIA role that overrides native list semantics unnecessarily.

## Shopify Settings

Merchants may configure real item content, approved list type, density, optional icon visibility, and divider visibility where parent content supports it.

The Design System controls marker treatment, gaps, indentation, focus, breakpoints, and motion.

## Design Tokens

List should use list-gap-compact, list-gap-relaxed, list-marker, list-indent, list-divider-gap, and list-icon-size tokens.

## Motion Rules

List should not animate reordering or markers. Child interactions follow their own restrained motion and reduced-motion rules.

## Performance Rules

List should be semantic server-rendered content with no required JavaScript, progressive enhancement, stable geometry, and no observers, polling, or duplicate rendering.

## AI Guidelines

AI should select List only for real related, sequential, or term-value data; choose deterministic semantic type; preserve merchant content; and use Stack/Divider for their own roles.

AI must not fabricate list items, use lists as layout, or hide meaningful sequence.

## Quality Checklist

### Semantics

- `ul`, `ol`, or `dl` matches the content relationship.
- Source and visual order agree.

### Design

- Density and dividers clarify rather than decorate.
- Nesting remains shallow.

### Accessibility

- Structural cues remain available to all customers.

## Future Compatibility

Future List refinement should preserve semantic content grouping. New variants require a demonstrated data relationship and must not become navigation, table, or layout substitutes.
