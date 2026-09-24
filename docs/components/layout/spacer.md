# Spacer

## Purpose

The Spacer component provides exceptional structural empty space when Section, Stack, Grid, Cluster, Split, or parent spacing cannot express a real layout relationship.

It is a deliberate last-resort primitive, not the default method for creating whitespace in a premium Shopify storefront.

## Responsibilities

The Spacer component is responsible for:

- providing one documented semantic amount of exceptional structural space
- preserving an intentional visual pause when no relationship-based primitive applies
- remaining neutral to content, interaction, and assistive technology
- preventing one-off margins and arbitrary empty markup

The Spacer component is not responsible for:

- page-region spacing owned by Section
- related-child spacing owned by Stack, Grid, or Cluster
- horizontal gutters owned by Container
- text measure owned by Content Wrapper
- decorative separation or visual borders

## User Goals

The Spacer component should help customers:

- experience a clear visual pause only where it improves hierarchy or pacing
- avoid crowded transitions between unrelated content
- retain stable reading order without decorative interruption

## Merchant Goals

The Spacer component should help merchants:

- preserve an approved exceptional pause without manual margin edits
- use understandable semantic size choices only when a parent supports them
- avoid empty content blocks and arbitrary visual gaps

## Structure

A Spacer consists of:

- one presentation-neutral spacing element or tokenized parent gap — required

Optional:

- compact, standard, or spacious semantic size
- a documented contextual reason recorded by the containing component

## Required Elements

Every Spacer requires:

- a demonstrated structural reason
- a semantic spacing token
- no meaningful text, media, interactive control, or merchant content
- a parent context where relationship-based spacing is not available

## Optional Elements

A Spacer may include:

- a compact, standard, or spacious approved size
- a responsive token adjustment supplied by the Design System

It must not include decorative imagery, labels, controls, or hidden information.

## Supported Variants

### Compact

A limited exceptional pause for tightly bounded structural transitions.

### Standard

The default exceptional structural pause.

### Spacious

A larger pause for deliberate editorial pacing where a Section would be disproportionate.

## Component-Specific Rules

A Spacer must:

- be used only after relationship-based spacing primitives have been considered
- use a documented semantic token
- remain inert, empty, and invisible to assistive technology
- be omitted if it no longer communicates a real structural pause
- preserve the natural document order of surrounding content

A Spacer must not:

- create decorative blank markup
- replace Section, Stack, Grid, Cluster, or Divider
- carry merchant data, labels, or hidden instructions
- be inserted repeatedly to force a visual composition
- use arbitrary height values, negative margins, or JavaScript measurement

## Supported States

### Present

An exceptional structural pause is intentionally applied.

### Omitted

No space is rendered when the contextual reason does not exist.

### Responsive

The semantic token may adapt conservatively to available space without changing reading order or creating excess empty area.

## Responsive Behaviour

Spacers should:

- scale only through documented semantic tokens
- avoid excessive empty space at narrow widths
- remain neutral at browser zoom and large text settings
- never cause horizontal scrolling, overlap, or source-order changes
- be removed rather than compressed into meaningless gaps when the parent composition changes

## Accessibility

The Spacer component should:

- remain outside the accessibility tree when represented by an empty element
- preserve semantic HTML in surrounding content rather than introducing a role
- use no ARIA roles, labels, or live-region behavior
- preserve surrounding semantic, keyboard, and screen-reader order
- avoid becoming a focusable element
- never be used to imply a relationship that is absent semantically
- maintain WCAG 2.2 AA reading and focus outcomes by remaining neutral

## Shopify Settings

Merchants may configure, only where a parent has a demonstrated structural need:

- compact, standard, or spacious pause
- visibility of the documented spacing boundary

The Design System controls:

- exact spacer values
- responsive interpolation
- breakpoint definitions
- accessibility neutrality
- motion timing

## Design Tokens

The Spacer component should use semantic tokens for:

- spacer-compact
- spacer-standard
- spacer-spacious
- spacer-responsive-adjustment

## Motion Rules

Spacer must not animate.

It must not expand, collapse, fade, or create decorative movement. If surrounding content changes through a real interaction, that content owns any restrained motion and must respect reduced-motion preferences.

## Performance Rules

The Spacer component should:

- use no JavaScript
- preserve progressive enhancement
- use no media, observers, or layout calculations
- add minimal markup only when tokenized parent spacing cannot express the requirement
- avoid contributing to layout shift through late insertion

## AI Guidelines

When generating storefronts, AI should:

- prefer Section, Stack, Grid, Cluster, or parent spacing before Spacer
- add Spacer only for a documented exceptional structural pause
- use the smallest suitable semantic token
- preserve merchant content and semantic reading order
- avoid arbitrary margins, empty blocks, and decorative whitespace
- make deterministic use of only documented exceptional spacing tokens

AI should not use Spacer to imitate editorial quality, fill empty areas, or compensate for unclear hierarchy.

## Quality Checklist

### Purpose

- A real structural reason exists for the pause.
- A relationship-based primitive cannot express it more clearly.

### Design

- The space feels intentional, quiet, and restrained.
- It does not create unexplained emptiness.

### Accessibility

- Spacer is inert and absent from keyboard and screen-reader navigation.
- Surrounding content remains semantically connected.

### AI Compatibility

- No empty decorative markup or arbitrary values are generated.
- The smallest suitable existing primitive is preferred.

## Future Compatibility

Future Spacer refinement should remain tightly constrained to documented exceptional spacing needs.

Before expanding it, confirm that a semantic parent gap, Section, Stack, Grid, Cluster, or Divider cannot solve the requirement more clearly and accessibly.
