# Mega Menu

## Purpose

The Mega Menu component provides organized access to large navigation structures without overwhelming customers.

Unlike a standard dropdown, a Mega Menu presents multiple groups of links, featured collections, imagery, and promotional content within a structured layout.

A Mega Menu should reduce navigation complexity—not create it.

---

## Responsibilities

The Mega Menu is responsible for:

- organizing large navigation structures
- improving product discoverability
- grouping related destinations
- supporting visual navigation
- adapting to different storefront sizes
- remaining accessible across devices

The Mega Menu is not responsible for:

- replacing homepage merchandising
- displaying excessive promotional content
- acting as a product listing
- replacing search

---

## User Goals

The Mega Menu should help customers:

- find collections quickly
- understand store organization
- discover categories naturally
- navigate with confidence
- reach products using fewer interactions

---

## Merchant Goals

The Mega Menu should help merchants:

- organize large catalogs
- increase collection visibility
- feature important categories
- reinforce merchandising strategy
- improve navigation efficiency

Merchants should organize content—not design layouts.

---

## Structure

A Mega Menu may contain:

- Navigation groups — required
- Section headings
- Navigation links
- Featured collection
- Promotional image
- Featured product
- Call-to-action
- Footer links

---

## Required Elements

Every Mega Menu requires:

- grouped navigation
- clear hierarchy
- semantic headings
- accessible navigation
- consistent spacing

Navigation should remain immediately understandable.

---

## Optional Elements

A Mega Menu may include:

- collection image
- promotional banner
- featured product
- new arrivals
- seasonal campaign
- editorial content
- collection description

Optional content should support navigation rather than distract from it.

---

## Supported Variants

### Standard

Displays grouped navigation links only.

Recommended for medium-sized catalogs.

---

### Editorial

Includes navigation alongside imagery.

Suitable for luxury and lifestyle brands.

---

### Commerce

Includes featured collections and promotional content.

Best for larger product catalogs.

---

### Collection Focused

Prioritizes featured collections over individual links.

Useful for merchandising-driven stores.

---

### Minimal

Displays only categorized navigation links.

Ideal for clean, product-focused storefronts.

---

## Component-Specific Rules

### Navigation Rules

Navigation groups should:

- remain logically organized
- avoid excessive nesting
- contain related destinations
- use concise labels

Recommended limits:

- 3–6 columns
- 5–10 links per group

Avoid overwhelming customers with excessive choices.

---

### Heading Rules

Group headings should:

- describe their category clearly
- remain visually distinct
- avoid promotional wording

Examples:

- Men
- Women
- Accessories
- Collections
- New Arrivals

---

### Promotional Content Rules

Promotional content should:

- support navigation
- remain visually secondary
- occupy limited space
- relate directly to nearby navigation

Avoid multiple competing promotions.

---

### Image Rules

Images may be used to:

- highlight featured collections
- reinforce merchandising
- improve visual scanning

Images should:

- remain high quality
- maintain consistent aspect ratios
- avoid excessive text overlays

---

### Interaction Rules

Mega Menus should:

- open predictably
- remain open while navigating
- close naturally
- avoid accidental dismissal
- support keyboard navigation

Hover should never be the only interaction method.

---

## Supported States

### Closed

Menu is hidden.

---

### Open

Navigation is fully visible.

---

### Hover

Individual navigation items provide subtle feedback.

---

### Focus

Keyboard users should receive visible focus indicators.

---

### Active

Current navigation destination should be identifiable.

---

## Responsive Behaviour

On smaller screens:

- Mega Menus should transform into mobile navigation
- Columns should become stacked sections
- Images may be removed
- Navigation should remain easy to browse
- Touch targets should remain comfortable

Desktop and mobile should present the same information architecture.

---

## Accessibility

Every Mega Menu must support:

- semantic navigation landmarks
- keyboard navigation
- logical focus order
- visible focus indicators
- screen reader compatibility
- expandable navigation controls
- reduced-motion preferences

Expanded menus should expose appropriate ARIA attributes.

---

## Shopify Settings

Merchants may configure:

- navigation menu
- featured collection
- promotional image
- featured product
- call-to-action
- column layout
- show images
- show collection descriptions

Merchants should not configure:

- spacing
- typography
- animation timing
- responsive behavior

These belong to the Design System.

---

## Design Tokens

The Mega Menu should use semantic tokens for:

- spacing
- typography
- colors
- borders
- shadows
- transitions
- maximum width
- column gaps

Example token categories:

- mega-menu-background
- mega-menu-shadow
- mega-menu-spacing
- mega-menu-column-gap
- mega-menu-transition

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- fade
- subtle opacity
- gentle vertical reveal

Avoid:

- bouncing
- large translations
- scaling
- decorative animations

Navigation should feel calm and predictable.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Mega Menu should:

- lazy-load optional imagery
- minimize JavaScript
- reuse navigation components
- avoid layout shifts
- render efficiently

Navigation should remain responsive even with large catalogs.

---

## AI Guidelines

When generating storefronts, AI should:

- use Mega Menus only when catalog size justifies them
- group navigation logically
- feature only relevant collections
- avoid excessive promotional content
- preserve accessibility
- reuse documented layouts

AI should never generate unnecessarily complex navigation structures.

---

## Quality Checklist

### Purpose

- Navigation is organized logically.
- Product discovery is improved.

### Design

- Columns remain balanced.
- Hierarchy is clear.
- Promotional content remains secondary.

### Accessibility

- Keyboard navigation works.
- Focus order is logical.
- Screen readers receive correct navigation structure.

### Responsive

- Mobile navigation remains usable.
- Columns stack correctly.
- Images adapt appropriately.

### Performance

- Images load efficiently.
- No layout shifts.
- JavaScript remains minimal.

### AI Compatibility

- Navigation groups are deterministic.
- Existing navigation patterns are reused.
- Complexity matches catalog size.

---

## Future Compatibility

Before extending the Mega Menu, ask:

- Does the catalog actually require a Mega Menu?
- Can a standard dropdown solve the problem?
- Does the layout improve product discovery?
- Will merchants understand the configuration?
- Can AI generate it consistently?

If an existing navigation pattern satisfies the requirement, reuse it.

The Mega Menu should evolve through refinement rather than expansion.

Every Mega Menu should organize large catalogs clearly, reduce navigation effort, improve product discovery, and maintain the calm, premium experience that defines Calinium.
