# Drawer

## Purpose

The Drawer is an overlay component that reveals contextual content from the edge of the viewport without leaving the current page.

It enables customers to complete focused tasks while preserving browsing context.

The Drawer should feel lightweight, predictable, and unobtrusive.

---

## Responsibilities

The Drawer is responsible for:

- presenting contextual content
- supporting short workflows
- preserving page context
- providing secondary interactions
- trapping keyboard focus
- remaining accessible across all devices

The Drawer is not responsible for:

- replacing full-page experiences
- displaying unrelated content
- serving as primary navigation
- presenting lengthy documents

These responsibilities belong to other components.

---

## User Goals

The Drawer should help customers:

- complete contextual tasks
- review information quickly
- return to browsing without interruption
- maintain orientation within the storefront

---

## Merchant Goals

The Drawer should help merchants:

- reduce navigation interruptions
- improve workflow completion
- create faster shopping experiences
- maintain a premium interface

Merchants should configure content—not drawer behavior.

---

## Structure

A Drawer consists of:

- Overlay — required
- Drawer Container — required
- Content Area — required
- Close Button — required

Optional:

- Header
- Title
- Description
- Footer
- Primary Action
- Secondary Action
- Form
- Navigation
- Supporting Content

---

## Required Elements

Every Drawer requires:

- accessible container
- close action
- logical content hierarchy
- keyboard support
- focus management

Customers should immediately understand the purpose of the Drawer.

---

## Optional Elements

The Drawer may include:

- title
- description
- forms
- navigation
- buttons
- images
- filters
- recommendations

Optional content should remain focused on a single workflow.

---

## Supported Variants

### Cart Drawer

Displays the current shopping cart.

Recommended for ecommerce storefronts.

---

### Navigation Drawer

Displays mobile navigation.

Recommended for responsive layouts.

---

### Filter Drawer

Displays collection filters and sorting controls.

Recommended for collection pages.

---

### Information Drawer

Displays supporting information without leaving the page.

Suitable for product details and educational content.

---

### Form Drawer

Contains short forms.

Suitable for account creation, contact, or newsletter signup.

---

## Component-Specific Rules

### Layout Rules

The Drawer should:

- slide from the viewport edge
- remain fixed within the viewport
- preserve page context
- maintain generous spacing
- avoid excessive width

Content should remain easy to scan.

---

### Overlay Rules

The overlay should:

- dim background content
- prevent background interaction
- preserve page orientation
- remain visually subtle

Background content should remain visible but inactive.

---

### Header Rules

If displayed, the header may include:

- title
- close button
- optional description

The close button should always remain visible.

---

### Content Rules

Content should:

- focus on one task
- remain concise
- avoid unnecessary scrolling
- preserve comfortable reading width

Long-form content should use dedicated pages instead.

---

### Footer Rules

The footer may include:

- primary action
- secondary action
- cancel action

Primary actions should receive greater visual emphasis.

---

### Close Rules

The Drawer should close using:

- close button
- Escape key
- overlay click (when appropriate)
- successful task completion

Critical workflows may disable overlay dismissal when necessary.

---

## Supported States

### Closed

The Drawer is hidden.

---

### Open

The Drawer is visible.

Background interaction is disabled.

---

### Loading

Content is loading or synchronizing.

Layout dimensions should remain stable.

---

### Success

The requested workflow completed successfully.

Appropriate feedback should be displayed.

---

### Error

An issue prevented completion.

Customers should receive clear recovery guidance.

---

## Responsive Behaviour

The Drawer should:

- adapt across all devices
- occupy an appropriate viewport width
- support touch interaction
- preserve comfortable margins
- avoid horizontal scrolling

On mobile devices, the Drawer may occupy the full viewport width.

---

## Accessibility

Every Drawer must support:

- semantic dialog structure
- accessible title
- keyboard navigation
- focus trapping
- Escape key support
- visible focus indicators
- screen reader compatibility
- sufficient contrast

Focus should:

- move into the Drawer when opened
- remain trapped while active
- return to the triggering element when closed

---

## Shopify Settings

Merchants may configure:

- title
- description
- width
- color scheme
- content
- button labels

Merchants should not configure:

- keyboard behavior
- focus management
- animation timing
- overlay behavior
- accessibility features

These belong to the Design System.

---

## Design Tokens

The Drawer should use semantic tokens for:

- spacing
- typography
- width
- border radius
- background
- overlay opacity
- shadows
- transitions

Example token categories:

- drawer-spacing
- drawer-width
- drawer-background
- drawer-overlay
- drawer-shadow
- drawer-transition

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- horizontal slide
- fade
- opacity transition

Avoid:

- bouncing
- elastic movement
- rotating
- decorative animations

Motion should communicate orientation rather than attract attention.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Drawer should:

- render only when needed
- minimize JavaScript
- avoid layout shifts
- lazy-load optional content
- preserve smooth interaction

Opening and closing the Drawer should feel immediate.

---

## AI Guidelines

When generating storefronts, AI should:

- use Drawers only for contextual workflows
- keep content focused on one task
- preserve accessibility
- reuse Button, Form, and Navigation components
- avoid nested Drawers

AI should never place essential primary navigation or lengthy content inside a Drawer unless the workflow specifically requires it.

---

## Quality Checklist

### Purpose

- One clear workflow is presented.
- Customers remain oriented.

### Design

- Content hierarchy is clear.
- Actions are easy to distinguish.
- Whitespace remains generous.

### Accessibility

- Focus trapping functions correctly.
- Escape closes the Drawer when appropriate.
- Screen readers announce the Drawer properly.

### Responsive

- Layout adapts across devices.
- Touch interaction remains comfortable.
- No horizontal scrolling occurs.

### Performance

- Drawer opens immediately.
- Layout remains stable.
- Animations remain lightweight.

### AI Compatibility

- Component structure is deterministic.
- Existing patterns are reused.
- Merchant content remains accurate.

---

## Future Compatibility

Before extending the Drawer, ask:

- Does the interaction benefit from preserving page context?
- Can an existing Drawer variant satisfy the requirement?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Drawer should evolve through refinement rather than expansion.

Every Drawer should provide focused, contextual interactions while preserving accessibility, performance, and the calm, timeless design philosophy that defines Calinium.
