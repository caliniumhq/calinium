# Cart Line Item

## Purpose

The Cart Line Item represents an individual product inside the shopping cart.

It provides customers with the essential information and controls needed to review, update, or remove a product before checkout.

The Cart Line Item should present information clearly while keeping purchasing friction as low as possible.

---

## Responsibilities

The Cart Line Item is responsible for:

- displaying product information
- displaying the selected variant
- updating quantities
- removing products
- displaying pricing
- communicating availability
- remaining accessible across all devices

The Cart Line Item is not responsible for:

- editing product variants
- displaying complete product descriptions
- calculating cart totals
- initiating checkout
- managing promotions

These responsibilities belong to other cart components.

---

## User Goals

The Cart Line Item should help customers:

- recognize the selected product
- verify the chosen variant
- update quantities
- remove unwanted products
- understand pricing
- continue confidently toward checkout

---

## Merchant Goals

The Cart Line Item should help merchants:

- reduce purchasing mistakes
- improve checkout confidence
- maintain product clarity
- support efficient cart management

Merchants should configure displayed information—not interaction behavior.

---

## Structure

A Cart Line Item consists of:

- Product Thumbnail — required
- Product Title — required
- Selected Variant — optional
- Quantity Selector — required
- Item Price — required
- Remove Button — required

Optional:

- Vendor
- SKU
- Selling Plan
- Subscription Badge
- Inventory Message
- Product Properties

---

## Required Elements

Every Cart Line Item requires:

- product image
- product title
- current quantity
- quantity selector
- price
- remove action
- product link

Customers should immediately understand which product they are reviewing.

---

## Optional Elements

The Cart Line Item may include:

- product vendor
- selected color
- selected size
- personalization
- subscription information
- inventory status
- shipping estimate

Optional information should remain visually secondary.

---

## Supported Variants

### Minimal

Displays:

- image
- title
- price
- remove action

Recommended for compact carts.

---

### Standard

Displays:

- image
- title
- selected variant
- quantity selector
- price
- remove action

Recommended for most storefronts.

---

### Commerce

Displays:

- image
- title
- variant
- quantity
- price
- inventory message
- subscription details
- product properties

Suitable for feature-rich stores.

---

## Component-Specific Rules

### Product Information Rules

Each Cart Line Item should display:

- recognizable product image
- clickable product title
- selected variant (if applicable)
- current quantity
- item price

Information should remain concise and easy to scan.

---

### Image Rules

Product images should:

- preserve aspect ratio
- remain responsive
- avoid distortion
- load efficiently

Images should clearly represent the selected product.

---

### Variant Rules

If the product contains variants, display only the selected values.

Examples:

- Color: Black
- Size: Medium
- Material: Leather

Variant information should remain secondary to the product title.

---

### Quantity Rules

Quantity controls should follow the Quantity Selector specification.

Changing quantity should:

- update immediately
- synchronize with Shopify
- update pricing automatically
- preserve cart position

---

### Remove Rules

The Remove action should:

- remain easy to locate
- require a single interaction
- update the cart immediately
- provide accessible feedback

Removing an item should never require a page refresh.

---

### Price Rules

Each line item should display:

- current item price

Optional:

- compare-at price
- discounts
- line total

Pricing should follow the Price component specification.

---

### Product Properties

If product properties exist, they may include:

- personalization
- engraving
- custom text
- uploaded assets

Properties should remain visually secondary.

---

### Inventory Rules

If inventory messaging is enabled, examples include:

- In Stock
- Only 2 Left
- Backordered
- Ships Soon

Inventory messaging should never replace the purchase controls.

---

## Supported States

### Default

The product is displayed normally.

---

### Updating

Quantity or pricing is synchronizing.

Layout should remain stable.

---

### Removing

The line item is being removed.

Customers should receive immediate feedback.

---

### Unavailable

The selected product is no longer available.

Appropriate messaging should explain the situation.

---

### Error

The requested update failed.

Customers should be able to retry easily.

---

## Responsive Behaviour

The Cart Line Item should:

- preserve readable spacing
- remain easy to scan
- prioritize touch interaction
- avoid horizontal scrolling
- adapt gracefully across devices

Controls should remain accessible on small screens.

---

## Accessibility

Every Cart Line Item must support:

- semantic structure
- keyboard navigation
- visible focus indicators
- accessible image alt text
- meaningful button labels
- sufficient contrast
- screen reader compatibility

Interactive controls should expose descriptive accessible names.

Examples:

- Remove Product
- Increase Quantity
- Decrease Quantity

---

## Shopify Settings

Merchants may configure:

- show product image
- show vendor
- show SKU
- show variant information
- show inventory messaging
- show product properties
- show line discounts

Merchants should not configure:

- spacing
- typography
- interaction behavior
- animation timing

These belong to the Design System.

---

## Design Tokens

The Cart Line Item should use semantic tokens for:

- spacing
- typography
- borders
- divider spacing
- colors
- transitions

Example token categories:

- cart-line-spacing
- cart-line-border
- cart-line-divider
- cart-line-price
- cart-line-transition

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- fade transition
- opacity transition
- loading indicator

Avoid:

- bouncing
- scaling
- decorative animations

Updates should feel immediate and predictable.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Cart Line Item should:

- update efficiently
- avoid layout shifts
- lazy-load product images
- synchronize with Shopify cart data
- reuse shared components

Interactions should remain responsive under rapid updates.

---

## AI Guidelines

When generating storefronts, AI should:

- reuse Product Card and Quantity Selector patterns
- preserve Shopify cart data
- maintain accessibility
- prioritize product clarity
- avoid unnecessary metadata

AI should never invent pricing, inventory, or product information.

---

## Quality Checklist

### Purpose

- Products are easy to identify.
- Cart updates are intuitive.

### Design

- Product hierarchy is clear.
- Pricing is immediately visible.
- Controls remain visually balanced.

### Accessibility

- Keyboard navigation works.
- Accessible labels are meaningful.
- Focus indicators remain visible.

### Responsive

- Layout adapts gracefully.
- Touch targets remain accessible.
- No horizontal scrolling occurs.

### Performance

- Images load efficiently.
- Updates occur immediately.
- No layout shifts occur.

### AI Compatibility

- Cart layout is deterministic.
- Shopify cart data is preserved.
- Existing components are reused.

---

## Future Compatibility

Before extending the Cart Line Item, ask:

- Does the feature improve cart management?
- Can an existing component provide the functionality?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Cart Line Item should evolve through refinement rather than expansion.

Every Cart Line Item should help customers review their selections confidently, manage their cart efficiently, preserve accessibility and performance, and provide a calm, premium shopping experience that reflects the Calinium design philosophy.
