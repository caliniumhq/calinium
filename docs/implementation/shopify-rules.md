# Shopify Implementation Rules

## Purpose

The Shopify Implementation Rules define how the Calinium Design System is implemented within Shopify Online Store 2.0.

These rules establish a consistent architecture for sections, blocks, snippets, templates, assets, settings, and merchant customization while preserving performance, accessibility, maintainability, and long-term compatibility.

Shopify is the implementation platform.

The Design System remains the source of truth.

---

# Relationship to the Design System

These rules implement:

- Layout Implementation Rules
- Typography Implementation Rules
- Spacing Implementation Rules
- Color Implementation Rules
- Motion Implementation Rules
- Imagery Implementation Rules
- Component Implementation Rules

No Shopify implementation should override the Design System.

Shopify exists to express the Design System—not redefine it.

---

# Core Principles

## Design System First

Every Shopify feature should originate from the Design System.

No implementation decision should exist without a corresponding design rationale.

---

## Native Shopify

Prefer Shopify Online Store 2.0 capabilities whenever possible.

Examples include:

- Sections
- Blocks
- Theme settings
- Dynamic sources
- App blocks
- Theme editor

Avoid replacing native functionality without a clear benefit.

---

## Progressive Enhancement

Every storefront should remain functional without JavaScript.

JavaScript enhances interaction but should not provide core functionality.

Critical commerce flows must remain operational.

---

## Merchant Simplicity

Merchants should configure storefronts using meaningful settings.

Settings should describe business intent rather than technical implementation.

Avoid exposing unnecessary complexity.

---

## Long-Term Maintainability

Theme architecture should prioritize clarity and modularity.

Future development should extend existing patterns rather than introduce new ones.

---

# Theme Architecture

Every Calinium theme should follow a predictable structure.

Recommended organization includes:

- Layout
- Templates
- Sections
- Blocks
- Snippets
- Assets
- Configuration
- Locales

Files should remain logically organized and consistently named.

---

# Layout Rules

Layout files define global storefront structure.

Global elements such as headers, footers, drawers, and overlays should be implemented consistently.

Page layouts should avoid unnecessary duplication.

---

# Template Rules

Templates define page composition.

Templates should contain structure rather than business logic.

Reusable functionality belongs within sections and snippets.

---

# Section Rules

Sections are the primary merchant-editable building blocks.

Every section should:

- have one clear responsibility
- support meaningful customization
- remain independently reusable
- preserve accessibility
- maintain consistent spacing and layout

Sections should not become monolithic.

---

# Block Rules

Blocks extend sections.

Blocks should:

- remain lightweight
- solve one problem
- inherit section behavior
- preserve visual consistency

Block types should remain predictable across the system.

---

# Snippet Rules

Snippets encapsulate reusable implementation.

Snippets should:

- avoid duplicated code
- remain independent
- receive explicit inputs
- avoid hidden side effects

Business logic should remain minimal.

---

# Theme Settings Rules

Theme settings should expose merchant intent rather than implementation details.

Examples include:

- Content
- Layout
- Color scheme
- Typography choice
- Density
- Visibility
- Image selection

Avoid exposing low-level implementation controls.

---

# Dynamic Sources

Components should support Shopify Dynamic Sources whenever appropriate.

Merchant content should integrate naturally with Shopify resources.

Dynamic content should never compromise layout consistency.

---

# Asset Rules

Assets should remain organized and optimized.

Examples include:

- CSS
- JavaScript
- Fonts
- Icons
- Images

Unused assets should not remain in production.

---

# JavaScript Rules

JavaScript should:

- progressively enhance components
- remain modular
- minimize global state
- avoid unnecessary dependencies
- fail gracefully

Core storefront functionality should never depend entirely on JavaScript.

---

# CSS Rules

CSS should:

- use design tokens
- remain modular
- avoid specificity conflicts
- support theme customization
- preserve maintainability

Hardcoded presentation values should be minimized.

---

# Performance Rules

Every implementation should prioritize:

- fast loading
- minimal JavaScript
- responsive images
- lazy loading where appropriate
- minimal layout shifts
- efficient rendering

Performance is a core product feature.

---

# Accessibility Requirements

Every Shopify implementation must support:

- Semantic HTML
- Keyboard navigation
- Screen reader compatibility
- Visible focus indicators
- Accessible forms
- WCAG 2.2 AA compliance

Accessibility must never be optional.

---

# Internationalization Rules

Themes should support localization through Shopify locale files.

Customer-facing text should not be hardcoded.

Themes should support:

- multiple languages
- multiple currencies
- right-to-left layouts where appropriate
- regional formatting

Internationalization should be built into the architecture rather than added later.

---

# Commerce Rules

Every implementation should prioritize purchasing.

Product discovery should remain effortless.

Purchase actions should remain:

- visible
- understandable
- accessible
- consistent

Commerce should never be interrupted by decorative interface behavior.

---

# App Compatibility

Themes should integrate cleanly with Shopify applications.

Implementations should:

- support App Blocks
- avoid unnecessary conflicts
- preserve theme stability
- degrade gracefully when apps are unavailable

Third-party integrations should complement—not control—the storefront.

---

# Merchant Experience

Merchants should be able to:

- customize sections
- reorder content
- replace imagery
- manage typography
- adjust layouts
- configure branding

Merchants should not require technical knowledge to build professional storefronts.

---

# AI Guidelines

When generating Shopify themes, AI should:

- compose existing sections
- reuse documented components
- preserve architecture
- minimize custom logic
- prioritize merchant usability
- maintain accessibility
- optimize performance
- follow Shopify best practices

AI should generate maintainable Shopify themes—not isolated page designs.

---

# Quality Checklist

Before approving a Shopify implementation, verify:

## Architecture

- Clear file organization
- Modular implementation
- Reusable snippets
- Independent sections

---

## Merchant Experience

- Intuitive Theme Editor settings
- Safe customization
- Predictable behavior
- Meaningful configuration

---

## Accessibility

- WCAG 2.2 AA compliant
- Keyboard accessible
- Semantic markup
- Visible focus indicators

---

## Performance

- Optimized assets
- Minimal JavaScript
- Responsive images
- Stable layouts

---

## Maintainability

- Reusable code
- Minimal duplication
- Clear naming
- Consistent architecture

---

## Commerce

- Product-first presentation
- Clear purchasing flow
- Consistent interactions
- Reliable checkout journey

---

## AI Compatibility

- Components reused
- Architecture preserved
- Theme Editor supported
- Design System respected

---

# Future Compatibility

Before introducing a new Shopify implementation pattern, ask:

- Can an existing section solve this problem?
- Can an existing component be reused?
- Does it preserve merchant simplicity?
- Does it maintain accessibility?
- Does it improve performance?
- Does it align with Shopify Online Store 2.0 best practices?
- Will it remain maintainable over future Shopify platform updates?

If an existing implementation pattern satisfies the requirement, reuse it.

The Shopify Implementation Rules prioritize modular architecture, merchant usability, accessibility, performance, maintainability, and long-term compatibility.

Every Shopify implementation should faithfully express the Calinium Design System while leveraging the strengths of the Shopify platform.