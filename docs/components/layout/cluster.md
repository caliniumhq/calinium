# Cluster

## Purpose

The Cluster component arranges related inline items in a wrapping horizontal group.

It supports calm, compact relationships such as actions, tags, metadata, and icon-text pairs without becoming a navigation, filter, or product-option system.

## Responsibilities

The Cluster component is responsible for:

- arranging related inline items horizontally
- allowing items to wrap naturally
- owning inline and block gaps between children
- supporting intentional alignment and justification
- preventing minor groups from becoming visually crowded

The Cluster component is not responsible for:

- primary or mobile navigation behavior
- filter, sorting, or variant-selection logic
- page-level width or vertical spacing
- individual button, badge, or icon behavior
- truncating merchant content to preserve a row

## User Goals

The Cluster component should help customers:

- scan short related actions or metadata comfortably
- understand a group without visual clutter
- use links and controls at narrow widths without overlap
- retain a predictable keyboard order

## Merchant Goals

The Cluster component should help merchants:

- present real tags, actions, metadata, and icon-text groups consistently
- choose an understandable alignment where a parent supports it
- preserve quiet visual density across dynamic Shopify content

## Structure

A Cluster consists of:

- an inline wrapping container — required
- two or more related inline children — required

Optional:

- start, center, end, or distributed alignment
- compact or standard gap density
- an icon paired with concise text

## Required Elements

Every Cluster requires:

- a clear relationship among its items
- natural wrapping behavior
- tokenized gaps
- DOM order that matches the intended reading and keyboard order

## Optional Elements

A Cluster may include:

- buttons or links that follow their own component specifications
- badges or tags supplied by their dedicated primitives
- concise metadata items
- icons with accompanying accessible text

## Supported Variants

### Start Aligned

The default for most metadata, tags, and action groups.

### Center Aligned

Suitable for short, balanced groups where centered presentation supports the surrounding hierarchy.

### End Aligned

Suitable for secondary actions in a bounded component, not for essential content that should remain first in source order.

### Distributed

Uses available space carefully for a small, stable set of items. It should not be used for unpredictable merchant-entered content.

### Compact

Reduces gaps for closely related metadata while retaining touch-friendly spacing around interactive elements.

## Component-Specific Rules

A Cluster must:

- use Flexbox with wrapping and `gap`
- allow translated text and merchant-entered labels to wrap instead of clip
- keep related items concise and semantically similar
- preserve source order when visual alignment changes
- allow overflow only through documented wrapping, scrolling, or omission behavior owned by another component

A Cluster must not:

- replace Header, Mega Menu, Mobile Navigation, Filters, Variant Picker, or pagination controls
- rely on absolute positioning or manual line breaks
- force a single line that causes touch targets or text to overlap
- use visual position as the only indicator of meaning

## Supported States

### Default

Items appear in an aligned, wrapping inline group.

### Wrapped

Items move naturally to subsequent lines while retaining their source order.

### Compact

Visual gap density is reduced only for short, non-crowded relationships.

### With Interactive Items

Buttons and links preserve their own focus, disabled, and active states.

## Responsive Behaviour

Clusters should:

- wrap before items become crowded
- retain source order at every width
- align with the parent Container or Content Wrapper rather than creating custom gutters
- maintain touch-friendly separation around controls
- avoid horizontal scrolling unless a dedicated component documents it

## Accessibility

The Cluster component should:

- preserve semantic HTML from its child items
- retain logical keyboard and screen-reader order
- ensure visible focus is not clipped by overflow rules
- use list semantics when the items are peer metadata or links
- avoid ARIA role additions solely because items appear in a row
- support WCAG 2.2 AA outcomes through child contrast, focus, and target rules

## Shopify Settings

Merchants may configure, where a parent supports it:

- approved alignment
- compact or standard gap density
- visibility of real actions or metadata

The Design System controls:

- exact gap values
- wrapping behavior
- touch spacing
- focus styling
- breakpoints and motion timing

## Design Tokens

The Cluster component should use semantic tokens for:

- cluster-gap-inline
- cluster-gap-block
- cluster-gap-compact
- cluster-alignment
- interactive-separation

## Motion Rules

Cluster should not animate wrapping or alignment changes.

Child controls may use their documented restrained interaction motion. Reduced-motion preferences must not affect the availability or visibility of cluster content.

## Performance Rules

The Cluster component should:

- use native Flexbox wrapping and minimal markup
- require no JavaScript
- preserve progressive enhancement
- avoid measuring children or scripting overflow behavior
- render dynamic Shopify content without client-side reordering

## AI Guidelines

When generating storefronts, AI should:

- use Cluster for small, related inline groups only
- preserve merchant labels, actions, metadata, and source order
- choose start alignment by default unless hierarchy supports another choice
- reuse Button, Badge, Icon Button, and other existing primitives
- use semantic HTML and design tokens
- select a deterministic arrangement from the documented alignment variants

AI should not create navigation-like, filter-like, or variant-like clusters for novelty.

## Quality Checklist

### Purpose

- Cluster owns inline wrapping and gaps for a small related group.
- Navigation and selection systems remain separate.

### Design

- The group feels compact but not crowded.
- Wrapping preserves a calm visual rhythm.

### Accessibility

- Focus, reading, and source order agree.
- Interactive elements retain touch-friendly spacing.

### AI Compatibility

- Existing child primitives are reused.
- No labels, tags, or actions are fabricated.

## Future Compatibility

Future Cluster refinement should improve demonstrated metadata and action grouping without becoming a navigation framework, overflow carousel, or selection control system.

New alignment or overflow behavior requires evidence that natural wrapping cannot serve the customer task accessibly.
