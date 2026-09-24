# Surface

## Purpose

The Surface component provides neutral visual containment through documented background, border, radius, and elevation tokens.

It creates quiet separation where hierarchy or contrast requires it without becoming a Product Card, media card, alert, modal, or generic decorative panel.

## Responsibilities

The Surface component is responsible for:

- providing a neutral visual boundary
- applying semantic background, border, radius, and elevation tokens
- supporting contrast between related content regions
- distinguishing non-interactive and interactive containment
- preserving calm, premium visual restraint

The Surface component is not responsible for:

- product, media, alert, modal, or commerce-card behavior
- page-level layout, width, or spacing
- defining click, link, selection, or disclosure behavior
- conveying status through color alone
- adding decoration without a content relationship

## User Goals

The Surface component should help customers:

- distinguish related content without visual clutter
- understand where one contained task begins and ends
- read content with sufficient background contrast
- identify interactive containment when it has real behavior

## Merchant Goals

The Surface component should help merchants:

- use calm, consistent containment without selecting arbitrary borders or shadows
- choose an approved color scheme where the parent component supports it
- retain brand restraint as content and theme settings change

## Structure

A Surface consists of:

- one containing element — required
- contained content — required

Optional:

- documented background treatment
- border
- radius
- low elevation
- interactive treatment supplied by a dedicated interactive component

## Required Elements

Every Surface requires:

- a meaningful containment reason
- semantic background and foreground contrast
- tokenized border, radius, and elevation behavior when used
- internal content that remains readable at zoom and with large text

## Optional Elements

A Surface may include:

- a subtle border
- a restrained radius
- low elevation where depth clarifies hierarchy
- an approved color scheme
- a child Stack, Cluster, Grid, or Content Wrapper

## Supported Variants

### Plain

Uses a neutral background without additional visual treatment.

### Bordered

Uses a subtle border to clarify containment.

### Elevated

Uses the lowest appropriate elevation token for layering, not decoration.

### Tinted

Uses an approved semantic color scheme with verified foreground contrast.

### Interactive Foundation

Provides neutral containment beneath a dedicated interactive component. It does not independently define hover, press, or selected semantics.

## Component-Specific Rules

A Surface must:

- use semantic tokens rather than hardcoded colors, shadows, or radii
- provide sufficient contrast for contained content
- distinguish an interactive child from a non-interactive surface
- keep nesting shallow and visually purposeful
- allow contained content to determine its own semantics and behavior

A Surface must not:

- impersonate Product Card, Alert, Modal, Drawer, or media-card behavior
- add a click handler without a clear control or link
- nest multiple elevations merely to create visual richness
- communicate an error, warning, or success state without the relevant feedback component
- use surface treatment to compensate for weak content hierarchy

## Supported States

### Plain

Contained content is separated through background or spacing only.

### Bordered

A subtle border clarifies a meaningful boundary.

### Elevated

Low elevation establishes an approved layer relationship.

### Interactive Foundation

A child link or control owns interactive focus, hover, active, and disabled states.

### Disabled Context

If a contained control is disabled for a real reason, the control communicates that reason. Surface itself should not simulate a disabled state.

## Responsive Behaviour

Surfaces should:

- preserve safe inline padding at narrow widths
- allow dynamic Shopify content and translations to grow naturally
- avoid fixed heights, clipping, and horizontal scrolling
- retain background contrast and containment at browser zoom
- reduce decorative treatment before reducing content readability

## Accessibility

The Surface component should:

- use semantic HTML appropriate to its content
- avoid unnecessary ARIA because visual containment is not a role
- meet WCAG 2.2 AA contrast requirements for foreground and background
- preserve visible focus for interactive descendants
- avoid using color, border, or elevation as the sole communicator of meaning

## Shopify Settings

Merchants may configure, where a parent supports it:

- approved color scheme
- whether neutral containment is shown
- an approved border or elevation variant

The Design System controls:

- exact colors and contrast pairings
- radius
- border thickness
- elevation values
- internal spacing
- focus behavior and motion timing

## Design Tokens

The Surface component should use semantic tokens for:

- surface-background
- surface-foreground
- surface-border
- surface-radius
- surface-elevation
- surface-padding
- surface-focus-ring

## Motion Rules

Non-interactive Surfaces should not animate.

Interactive descendants may use their documented restrained focus or hover transitions. Elevation must not pulse, bounce, or imply a click where none exists; reduced-motion preferences must be respected.

## Performance Rules

The Surface component should:

- use CSS and minimal semantic markup
- require no JavaScript
- preserve progressive enhancement
- avoid heavy blur, large animated shadows, and costly filter effects
- keep nesting shallow to reduce rendering and visual complexity

## AI Guidelines

When generating storefronts, AI should:

- use Surface only when containment improves hierarchy, contrast, or task clarity
- select the least visually weighted approved variant
- preserve merchant content and existing component behavior
- use semantic HTML and design tokens
- reuse Product Card, Alert, Modal, and media primitives for their specific roles
- choose a deterministic containment variant from the documented semantic tokens

AI should not create decorative card stacks, status colors, or interactive surfaces without evidence.

## Quality Checklist

### Purpose

- Surface provides neutral containment with a clear reason.
- It does not replace a specialized card, feedback, or overlay component.

### Design

- Background, border, radius, and elevation remain restrained.
- Nesting is shallow and hierarchy remains clear.

### Accessibility

- Contrast is sufficient and focus remains visible.
- Meaning is not conveyed through containment styling alone.

### AI Compatibility

- Existing component responsibilities are preserved.
- No merchant content, status, or interaction is invented.

## Future Compatibility

Future Surface refinement should improve semantic token coverage and demonstrated containment needs without creating a competing card or overlay system.

Any new treatment must prove a hierarchy or contrast benefit, retain performance-first rendering, and preserve WCAG 2.2 AA outcomes.
