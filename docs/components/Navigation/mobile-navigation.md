# Mobile Navigation

## Purpose

The Mobile Navigation component provides customers with a clear, touch-friendly way to browse the storefront on smaller devices.

It presents the store's navigation in a format optimized for touch interaction while preserving the same information architecture as the desktop experience.

Mobile Navigation should reduce effort—not increase it.

---

## Responsibilities

The Mobile Navigation component is responsible for:

- presenting the primary navigation on mobile devices
- organizing navigation into clear sections
- supporting touch interaction
- providing access to essential commerce actions
- maintaining accessibility
- adapting across all supported screen sizes

The Mobile Navigation component is not responsible for:

- displaying product listings
- replacing search
- managing account functionality
- displaying promotional campaigns
- changing the navigation structure

Those responsibilities belong to other components.

---

## User Goals

The Mobile Navigation should help customers:

- browse collections easily
- access important pages quickly
- navigate with one hand
- understand the store hierarchy
- return to shopping without confusion

---

## Merchant Goals

The Mobile Navigation should help merchants:

- improve mobile usability
- reduce navigation friction
- support large catalogs
- maintain a consistent brand experience
- preserve the same navigation structure across devices

Merchants should configure navigation—not drawer behavior.

---

## Structure

A Mobile Navigation consists of:

- Menu Toggle — required
- Navigation Drawer — required
- Primary Navigation — required

Optional:

- Logo
- Search
- Account
- Cart
- Wishlist
- Localization Selector
- Social Links
- Secondary Navigation

---

## Required Elements

Every Mobile Navigation requires:

- accessible menu toggle
- navigation drawer
- primary navigation
- keyboard support
- touch-friendly targets
- clear hierarchy

---

## Optional Elements

The Mobile Navigation may include:

- search
- customer account
- wishlist
- language selector
- country selector
- contact link
- store information
- social media links

Optional elements should remain secondary to navigation.

---

## Supported Variants

### Drawer

Slides in from the side of the viewport.

Recommended for most storefronts.

---

### Full Screen

Expands to occupy the full viewport.

Suitable for editorial or luxury experiences.

---

### Bottom Sheet

Appears from the bottom of the screen.

Recommended only for small navigation structures.

---

### Minimal

Displays only essential navigation links.

Suitable for focused storefronts with limited catalogs.

---

## Component-Specific Rules

### Navigation Rules

Navigation should:

- preserve desktop hierarchy
- avoid unnecessary nesting
- remain easy to scan
- group related destinations
- prioritize important pages

Recommended nesting:

- Maximum three levels

---

### Drawer Rules

The navigation drawer should:

- open predictably
- close easily
- trap keyboard focus
- prevent background interaction
- restore focus when closed

The drawer should never feel disconnected from the page.

---

### Menu Toggle Rules

The menu toggle should:

- remain visible
- display a familiar menu icon
- communicate open and closed states
- expose accessible labels
- remain reachable with one hand

Examples:

- Open menu
- Close menu

---

### Navigation Item Rules

Navigation items should:

- remain easy to tap
- display clear labels
- provide visible feedback
- support nested navigation where appropriate

Navigation labels should remain concise.

---

### Search Rules

If search is included:

- it should remain easy to discover
- it should open predictably
- it should support keyboard input
- it should never obscure navigation unexpectedly

---

## Supported States

### Closed

Navigation drawer is hidden.

---

### Open

Navigation drawer is fully visible.

---

### Expanded

Nested navigation group is expanded.

---

### Collapsed

Nested navigation group is collapsed.

---

### Active

Current page is indicated.

---

### Focus

Keyboard users receive visible focus indicators.

---

## Responsive Behaviour

The Mobile Navigation should:

- appear only below the mobile breakpoint
- preserve comfortable touch targets
- avoid horizontal scrolling
- support portrait and landscape orientations
- adapt to different screen sizes

Navigation should remain usable with one hand whenever possible.

---

## Accessibility

Every Mobile Navigation must support:

- semantic navigation landmarks
- keyboard navigation
- focus trapping
- visible focus indicators
- accessible menu toggle
- accessible expandable controls
- screen reader compatibility
- reduced-motion preferences

Expandable navigation items should expose appropriate ARIA attributes.

---

## Shopify Settings

Merchants may configure:

- navigation menu
- show search
- show account
- show wishlist
- show localization selector
- show social links
- drawer style

Merchants should not configure:

- breakpoints
- animation timing
- spacing
- focus styles

These belong to the Design System.

---

## Design Tokens

The Mobile Navigation should use semantic tokens for:

- drawer width
- spacing
- typography
- colors
- borders
- shadows
- transitions
- z-index

Example token categories:

- mobile-nav-background
- mobile-nav-spacing
- mobile-nav-transition
- mobile-nav-shadow
- mobile-nav-width

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- drawer slide
- opacity transition
- accordion expansion
- gentle fade

Avoid:

- bouncing
- overshooting
- large scaling
- decorative animations

Navigation should always feel predictable.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Mobile Navigation should:

- minimize JavaScript
- lazy-load optional content
- reuse shared navigation components
- avoid layout shifts
- render efficiently

Navigation should remain responsive even on lower-powered devices.

---

## AI Guidelines

When generating storefronts, AI should:

- preserve the desktop navigation hierarchy
- avoid unnecessary nesting
- prioritize important destinations
- maintain accessibility
- choose the appropriate drawer style
- reuse documented navigation patterns

AI should never generate overly complex mobile navigation.

---

## Quality Checklist

### Purpose

- Navigation is easy to understand.
- Product discovery is improved.

### Design

- Hierarchy is clear.
- Drawer remains uncluttered.
- Navigation labels are concise.

### Accessibility

- Keyboard navigation works.
- Focus is trapped correctly.
- ARIA attributes are correct.
- Screen readers receive meaningful navigation.

### Responsive

- Navigation adapts correctly.
- Touch targets remain accessible.
- No horizontal scrolling occurs.

### Performance

- No layout shifts.
- Minimal JavaScript.
- Efficient rendering.

### AI Compatibility

- Navigation hierarchy is deterministic.
- Existing navigation patterns are reused.
- Complexity matches catalog size.

---

## Future Compatibility

Before extending the Mobile Navigation component, ask:

- Does the feature improve mobile navigation?
- Can the existing drawer support this behavior?
- Will merchants understand the setting?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing navigation pattern satisfies the requirement, reuse it.

The Mobile Navigation component should evolve through refinement rather than expansion.

Every mobile navigation should guide customers effortlessly, preserve the storefront hierarchy, reduce navigation friction, and deliver a fast, accessible, and premium experience on every mobile device.
