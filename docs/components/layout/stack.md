# Stack

## Purpose

The Stack component creates a consistent vertical flow between directly related elements.

It provides calm pacing for text, controls, metadata, and content blocks without setting page width, section rhythm, or two-dimensional layout.

## Responsibilities

The Stack component is responsible for:

- arranging related children vertically
- owning the gap between those children
- supporting semantic spacing sizes
- adapting to dynamic Shopify content and translated text
- preserving natural document order

The Stack component is not responsible for:

- page-level vertical spacing between major regions
- horizontal gutters or content width
- column behavior
- decorative separation
- form-specific labels, validation, or submission behavior

## User Goals

The Stack component should help customers:

- scan related information in a comfortable sequence
- distinguish headings, copy, actions, and metadata
- interact with controls without crowding
- follow a logical reading order

## Merchant Goals

The Stack component should help merchants:

- keep dynamic Shopify content readable without manual margins
- create consistent spacing inside approved components
- retain a premium, restrained rhythm as content changes

## Structure

A Stack consists of:

- a vertical container — required
- two or more directly related children — required

Optional:

- semantic gap size
- one nested Stack for a demonstrably distinct subrelationship
- an approved split-after boundary only when grouping needs a stronger pause

## Required Elements

Every Stack requires:

- a clear vertical relationship among children
- tokenized gap spacing
- source order that matches the intended reading order
- children that can wrap and grow naturally

## Optional Elements

A Stack may include:

- compact, standard, or spacious gap density
- nested Stack for grouped metadata or related actions
- a Divider only when whitespace does not adequately explain the boundary

## Supported Variants

### Compact

For tightly related metadata, short control groups, or compact content.

### Standard

The default vertical rhythm for related content.

### Spacious

For editorial pacing or clearly separated content within one component.

### Split After

Introduces one larger semantic gap after a meaningful child. It should be used only when a second Stack or Section would be unnecessary.

## Component-Specific Rules

A Stack must:

- use Flexbox column flow and `gap` where possible
- allow long merchant-entered text and translations to wrap naturally
- use one spacing token consistently within one relationship
- place nested Stacks only where they communicate a genuine hierarchy
- preserve child semantics and interaction behavior

A Stack must not:

- own a page's outer spacing
- set content width
- compensate for missing Section or Grid structure
- use per-child margins as its primary spacing method
- create empty elements solely for space

## Supported States

### Default

Related children appear in a stable vertical sequence.

### Compact or Spacious

The gap changes through semantic tokens only.

### Nested

A sub-group uses its own deliberate relationship without producing excessive wrapper depth.

### Dynamic Content

Added, removed, translated, or absent Shopify content changes the Stack naturally without leaving arbitrary gaps.

## Responsive Behaviour

Stacks should:

- preserve vertical flow at all widths
- retain touch-friendly separation for interactive children
- use tokenized gaps that adapt conservatively where appropriate
- avoid source-order changes, overlap, and horizontal overflow
- accommodate browser zoom and large text without clipping

## Accessibility

The Stack component should:

- preserve semantic HTML supplied by its children
- retain visual, keyboard, and screen-reader reading order
- avoid unnecessary ARIA because it is non-interactive layout
- maintain sufficient spacing around interactive children
- support WCAG 2.2 AA through the contained components' contrast and focus rules

## Shopify Settings

Merchants may configure, where a parent supports it:

- compact, standard, or spacious spacing density
- a demonstrated split-after boundary

The Design System controls:

- exact gap values
- breakpoint definitions
- responsive interpolation
- focus spacing
- motion timing

## Design Tokens

The Stack component should use semantic tokens for:

- stack-gap-compact
- stack-gap-standard
- stack-gap-spacious
- stack-gap-split
- interactive-separation

## Motion Rules

Stack should not animate layout spacing by default.

When a real merchant-controlled element is revealed, a brief opacity transition may be inherited from that element. Movement must remain subtle, respect reduced motion, and never disrupt a focused control.

## Performance Rules

The Stack component should:

- use CSS Flexbox and `gap`
- require no JavaScript
- preserve progressive enhancement
- avoid layout calculations, child measurements, and unnecessary wrappers
- remain stable as Shopify content changes

## AI Guidelines

When generating storefronts, AI should:

- select Stack for directly related vertical content
- use the smallest semantic spacing token that preserves hierarchy
- preserve merchant content, natural reading order, and existing child primitives
- avoid arbitrary margins, empty spacers, and excessive nesting
- choose Section for page pacing and Grid for two-dimensional relationships

AI must not use Stack to simulate page spacing, force visual order over source order, create empty layout nodes, or replace Grid, Cluster, Split, or Sidebar Layout ownership.

## Quality Checklist

### Purpose

- Stack owns only the vertical relationship of related children.
- Page spacing and content width remain outside its responsibility.

### Design

- Whitespace is calm, intentional, and tokenized.
- Nested Stacks communicate hierarchy rather than wrapper convenience.

### Accessibility

- Reading and focus order remain unchanged.
- Interactive descendants retain comfortable touch spacing.

### AI Compatibility

- No one-off margins or empty structural content is generated.
- Existing layout primitives are selected deterministically.

## Future Compatibility

Future Stack refinement should improve semantic gap scales and demonstrated component composition without becoming a general page-layout or animation system.

Any new variant must preserve natural flow, Shopify-native content resilience, and the smallest appropriate layout responsibility.
