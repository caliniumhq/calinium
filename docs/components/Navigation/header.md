# Header

## Purpose

The Header component serves as the primary navigation landmark for the storefront.

It helps customers understand where they are, navigate the store efficiently, access important actions, and build trust from the first interaction.

The Header should remain calm, intuitive, and product-focused.

It should never compete with the content below it.

---

## Responsibilities

The Header component is responsible for:

- displaying the primary navigation
- presenting the store identity
- providing access to commerce actions
- adapting across viewport sizes
- supporting accessibility
- remaining visible and predictable throughout browsing

The Header component is not responsible for:

- merchandising campaigns
- promotional content
- page-specific navigation
- search results
- cart functionality
- account management

These responsibilities belong to dedicated components.

---

## User Goals

The Header component should help customers:

- identify the brand immediately
- navigate collections
- access search quickly
- reach the cart easily
- access their account
- browse confidently on every device

---

## Merchant Goals

The Header component should help merchants:

- reinforce brand identity
- improve navigation efficiency
- increase product discoverability
- reduce customer friction
- maintain consistent navigation across the storefront

Merchants should configure navigation structure—not layout implementation.

---

## Structure

A standard header consists of:

- Announcement Bar (optional)
- Logo
- Primary Navigation
- Search
- Account
- Cart
- Mobile Menu Toggle

Optional:

- Secondary Navigation
- Language Selector
- Country Selector

---

## Required Elements

Every header requires:

- primary navigation
- brand identity
- cart access
- mobile navigation
- semantic landmark
- accessible navigation

---

## Optional Elements

A header may include:

- announcement bar
- search field
- search icon
- account link
- wishlist
- localization selector
- utility navigation
- promotional message

Optional elements should not reduce navigation clarity.

---

## Supported Variants

### Standard

The default storefront header.

---

### Transparent

Displayed over hero imagery.

Should transition smoothly to a solid background when scrolling.

---

### Sticky

Remains visible during scrolling.

Sticky behavior should reduce navigation effort without obstructing content.

---

### Compact

Uses reduced spacing after scrolling.

The logo should remain recognizable.

---

### Centered Logo

Places navigation on both sides of the logo.

Suitable for editorial and luxury storefronts.

---

### Minimal

Contains only essential navigation.

Used for highly product-focused storefronts.

---

## Component-Specific Rules

### Navigation Rules

Primary navigation should:

- remain simple
- prioritize important destinations
- avoid excessive nesting
- support keyboard navigation
- remain predictable

Recommended maximum:

- 5–7 primary items

Mega menus should only be used when information architecture requires them.

---

### Logo Rules

The logo should:

- remain clearly visible
- link to the homepage
- preserve aspect ratio
- adapt to light and dark backgrounds
- remain recognizable at all viewport sizes

The logo should never become visually dominant.

---

### Search Rules

Search should:

- remain easy to discover
- support keyboard navigation
- open predictably
- avoid disrupting browsing

Search may appear as:

- icon
- expandable field
- persistent input

---

### Cart Rules

The cart entry should:

- remain consistently positioned
- communicate item count
- support accessibility
- remain available across all pages

The cart icon should not communicate quantity using color alone.

---

### Mobile Navigation

On mobile:

- primary navigation should collapse
- menu toggle should remain discoverable
- navigation should support touch comfortably
- drawer interactions should remain accessible

The mobile experience should prioritize simplicity.

---

## Supported States

### Default

Header displays normally.

---

### Sticky

Header remains attached during scrolling.

---

### Transparent

Displayed over hero imagery.

---

### Scrolled

Spacing may reduce while preserving usability.

---

### Menu Open

Navigation drawer is visible.

Focus should remain trapped within the drawer.

---

### Search Open

Search interface becomes active.

Keyboard focus should move into the search field.

---

## Responsive Behaviour

The Header component should:

- adapt gracefully across viewport sizes
- avoid overcrowding
- preserve logo visibility
- maintain accessible touch targets
- support responsive navigation

Desktop and mobile headers should feel like the same system.

---

## Accessibility

Every header must support:

- semantic `<header>`
- navigation landmark
- keyboard navigation
- visible focus indicators
- accessible menu controls
- accessible search
- accessible cart
- accessible logo link

Expandable controls should expose appropriate ARIA attributes.

---

## Shopify Settings

Merchants may configure:

- logo
- navigation menu
- sticky header
- transparent header
- announcement bar
- search visibility
- account visibility
- localization controls

Merchants should not configure:

- spacing
- breakpoints
- animation timing
- focus styles

These belong to the Design System.

---

## Design Tokens

The Header component should use semantic tokens for:

- height
- spacing
- typography
- colors
- borders
- shadows
- transitions
- z-index

Example token categories:

- header-height
- header-background
- header-border
- header-shadow
- header-spacing
- header-transition

---

## Motion Rules

Header motion should remain subtle.

Allowed motion:

- opacity
- background transition
- height reduction
- elevation transition

Avoid:

- bouncing
- large translations
- excessive animations
- decorative effects

Scrolling should never feel distracting.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Header component should:

- load immediately
- avoid layout shifts
- minimize JavaScript
- reuse shared navigation components
- lazy-load non-essential features when appropriate

The header should remain performant throughout the storefront.

---

## AI Guidelines

When generating storefronts, AI should:

- prioritize clear navigation
- preserve brand visibility
- avoid excessive menu items
- choose the appropriate header variant
- support accessibility
- maintain responsive behavior
- reuse documented navigation components

AI should never generate unnecessary navigation complexity.

---

## Quality Checklist

### Purpose

- Navigation is immediately understandable.
- Brand identity is clear.

### Design

- Header follows the design system.
- Navigation hierarchy is consistent.
- Logo remains balanced.

### Accessibility

- Keyboard navigation works.
- Focus is visible.
- Navigation landmarks are correct.
- ARIA attributes are present.

### Responsive

- Mobile navigation functions correctly.
- Desktop navigation remains uncluttered.
- Touch targets are accessible.

### Performance

- No layout shifts.
- Efficient rendering.
- Minimal JavaScript.

### AI Compatibility

- Header variant is deterministic.
- Navigation remains simple.
- Existing components are reused.

---

## Future Compatibility

Before extending the Header component, ask:

- Does the feature improve navigation?
- Can the existing header support this behavior?
- Will merchants understand the setting?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Header component should evolve through refinement rather than expansion.

Every header should guide customers confidently, reinforce the brand, reduce friction, and quietly support the shopping experience without becoming the center of attention.
