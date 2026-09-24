# Sort

## Purpose

The Sort component allows customers to change the order in which products are displayed within a collection or search results.

It helps customers browse products according to their preferences while preserving a predictable shopping experience.

Sorting should make browsing more efficient—not more complicated.

---

## Responsibilities

The Sort component is responsible for:

- presenting available sorting options
- updating product order
- communicating the active sort
- synchronizing with collection results
- remaining responsive
- maintaining accessibility

The Sort component is not responsible for:

- filtering products
- generating product rankings
- displaying product information
- managing pagination
- changing collection content

These responsibilities belong to Shopify search and collection systems.

---

## User Goals

The Sort component should help customers:

- find products more efficiently
- browse according to personal preference
- understand the current product order
- change sorting with minimal effort

---

## Merchant Goals

The Sort component should help merchants:

- support different shopping behaviors
- improve product discovery
- increase customer satisfaction
- maintain consistent collection experiences

Merchants should configure available sorting options—not sorting behavior.

---

## Structure

A Sort component consists of:

- Sort Label — required
- Sort Control — required

Optional:

- Current Selection
- Sort Icon
- Product Count

---

## Required Elements

Every Sort component requires:

- sort label
- selectable sort options
- current selection
- accessible control
- responsive layout

The current sorting method should always be visible.

---

## Optional Elements

The Sort component may include:

- dropdown icon
- product count
- active sort label
- descriptive helper text

Optional information should remain visually secondary.

---

## Supported Variants

### Dropdown

Displays sorting options in a native select element.

Recommended for most storefronts.

---

### Menu

Displays sorting options inside a popover menu.

Suitable for premium storefronts.

---

### Segmented Control

Displays a limited number of sorting options as horizontal buttons.

Recommended only when very few sorting options exist.

---

### Mobile Drawer

Displays sorting options inside a bottom sheet or drawer.

Recommended for mobile devices.

---

## Component-Specific Rules

### Supported Sort Options

Supported Shopify sorting options may include:

- Featured
- Best Selling
- Alphabetically (A–Z)
- Alphabetically (Z–A)
- Price (Low to High)
- Price (High to Low)
- Date (Newest First)
- Date (Oldest First)

Only meaningful sorting options should be displayed.

---

### Selection Rules

Selecting a sort option should:

- update product order immediately
- preserve the selected collection
- synchronize with pagination
- maintain accessibility

The current selection should remain clearly indicated.

---

### Default Sort Rules

The default sorting option should follow the Shopify collection configuration.

The Sort component should never override the merchant's configured default.

---

### Product Ordering

Sorting should only affect display order.

It should never:

- modify products
- change inventory
- affect filtering
- alter product information

Sorting must remain deterministic.

---

## Supported States

### Default

The current sorting option is displayed.

---

### Expanded

Sorting options are visible.

---

### Selected

The active sorting option is clearly indicated.

---

### Loading

Collection products are updating.

The interface should remain stable.

---

### Disabled

Sorting is temporarily unavailable.

Customers should understand why interaction is unavailable.

---

## Responsive Behaviour

The Sort component should:

- remain compact
- adapt gracefully across devices
- use native controls where appropriate
- avoid horizontal overflow
- remain easy to tap

Sorting should remain accessible without dominating the collection interface.

---

## Accessibility

Every Sort component must support:

- semantic form controls
- keyboard navigation
- visible focus indicators
- accessible labels
- screen reader compatibility
- sufficient contrast

The selected option should be announced appropriately.

---

## Shopify Settings

Merchants may configure:

- enable sorting
- available sorting options
- default sort
- desktop position
- mobile position

Merchants should not configure:

- spacing
- typography
- animation timing
- interaction behavior

These belong to the Design System.

---

## Design Tokens

The Sort component should use semantic tokens for:

- spacing
- typography
- borders
- colors
- border radius
- transitions

Example token categories:

- sort-spacing
- sort-border
- sort-radius
- sort-control
- sort-transition

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- dropdown transition
- drawer transition
- fade transition

Avoid:

- bouncing
- scaling
- decorative animations

Sorting should feel immediate and predictable.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Sort component should:

- minimize JavaScript
- synchronize efficiently with Shopify collection data
- avoid layout shifts
- preserve browsing context
- remain responsive during updates

Sorting should not negatively impact scrolling or navigation performance.

---

## AI Guidelines

When generating storefronts, AI should:

- use the Dropdown variant by default
- expose only meaningful Shopify sorting options
- preserve merchant-defined default sorting
- maintain accessibility
- reuse documented interaction patterns

AI should never invent sorting methods or modify Shopify collection ordering.

---

## Quality Checklist

### Purpose

- Product ordering is easy to understand.
- Changing sort order is intuitive.

### Design

- Current selection is clearly visible.
- Layout remains compact.
- Sorting integrates naturally with collections.

### Accessibility

- Keyboard navigation works.
- Focus indicators remain visible.
- Selected options are announced correctly.

### Responsive

- Controls remain touch friendly.
- Layout adapts correctly.
- No horizontal overflow occurs.

### Performance

- Product order updates efficiently.
- No layout shifts occur.
- Shopify sorting remains synchronized.

### AI Compatibility

- Sorting behavior is deterministic.
- Shopify sorting options are preserved.
- Existing interaction patterns are reused.

---

## Future Compatibility

Before extending the Sort component, ask:

- Does the feature improve product discovery?
- Can an existing sort pattern support it?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Sort component should evolve through refinement rather than expansion.

Every Sort component should help customers browse products in the order that best suits their needs while preserving clarity, accessibility, performance, and the calm premium shopping experience that defines Calinium.
