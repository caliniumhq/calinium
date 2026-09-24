# Product Information

## Purpose

The Product Information component presents the essential information customers need to understand a product and make a confident purchasing decision.

It combines product identity, pricing, purchasing controls, and supporting information into a clear and consistent hierarchy.

The Product Information should communicate value—not overwhelm the customer.

---

## Responsibilities

The Product Information component is responsible for:

- presenting product identity
- displaying pricing
- supporting purchasing
- communicating availability
- presenting key product details
- organizing product information consistently
- remaining accessible across all devices

The Product Information is not responsible for:

- displaying the product gallery
- managing recommendations
- displaying reviews in full
- handling checkout
- managing related products

These responsibilities belong to other components.

---

## User Goals

The Product Information should help customers:

- understand what they are purchasing
- evaluate pricing
- choose the correct variant
- purchase confidently
- understand important product details
- find supporting information quickly

---

## Merchant Goals

The Product Information should help merchants:

- communicate product value
- improve conversion
- reduce customer uncertainty
- maintain brand consistency
- support merchandising

Merchants should manage product content—not layout.

---

## Structure

A Product Information component consists of:

- Product Title — required
- Price — required
- Variant Picker — optional
- Quantity Selector — optional
- Buy Buttons — required

Optional:

- Vendor
- Product Subtitle
- SKU
- Inventory Message
- Shipping Information
- Payment Information
- Product Description
- Trust Badges
- Product Accordion
- Share Button

---

## Required Elements

Every Product Information component requires:

- product title
- current price
- purchase controls
- responsive layout
- accessible structure

The purchasing flow should remain visually prominent.

---

## Optional Elements

The Product Information component may include:

- compare-at price
- vendor
- product subtitle
- ratings
- SKU
- inventory status
- shipping estimate
- payment methods
- trust indicators
- expandable content
- sharing controls

Optional information should remain secondary to purchasing.

---

## Supported Variants

### Minimal

Displays:

- title
- price
- purchase controls

Recommended for luxury storefronts.

---

### Standard

Displays:

- title
- pricing
- variants
- quantity
- purchase controls
- short description

Recommended for most storefronts.

---

### Commerce

Displays:

- title
- vendor
- pricing
- ratings
- variants
- quantity
- inventory
- purchase controls
- supporting information

Suitable for feature-rich stores.

---

### Editorial

Places greater emphasis on typography and storytelling while preserving a clear purchasing flow.

Recommended for premium brands.

---

## Component-Specific Rules

### Information Hierarchy

The recommended visual hierarchy is:

1. Product Title
2. Price
3. Variant Picker
4. Quantity Selector
5. Buy Buttons
6. Supporting Information
7. Product Description
8. Secondary Details

Customers should always encounter purchasing controls before long-form content.

---

### Title Rules

The product title should:

- clearly identify the product
- remain highly prominent
- wrap gracefully
- avoid truncation where possible

Only one product title should exist within the primary information area.

---

### Price Rules

Pricing should follow the Price component specification.

If applicable, display:

- current price
- compare-at price
- savings information

The selling price should always receive greater emphasis.

---

### Variant Rules

Variant selection should follow the Variant Picker specification.

Product Information should synchronize automatically with variant changes.

---

### Quantity Rules

Quantity selection should follow the Quantity Selector specification.

The selected quantity should remain synchronized with purchase actions.

---

### Purchase Rules

Purchase controls should follow the Buy Buttons specification.

The purchase action should remain the dominant interactive element.

---

### Product Description Rules

Descriptions should:

- remain readable
- support rich text
- preserve consistent spacing
- avoid excessive visual weight

Long descriptions should be organized using accordions or expandable sections where appropriate.

---

### Trust Information

Supporting trust information may include:

- secure checkout
- shipping information
- returns
- authenticity
- warranty
- payment methods

Trust information should reassure rather than compete with purchasing.

---

### Product Metadata

Additional product information may include:

- SKU
- Vendor
- Barcode
- Collections
- Tags
- Availability

Metadata should remain visually secondary.

---

## Supported States

### Default

All information is available.

---

### Loading

Product data is loading.

Skeleton placeholders may be displayed.

---

### Variant Changed

Relevant information updates automatically.

---

### Sold Out

Purchasing adapts to product availability.

---

### Error

Relevant messaging is displayed without disrupting layout.

---

## Responsive Behaviour

The Product Information should:

- preserve logical reading order
- prioritize purchasing controls
- maintain readable spacing
- adapt typography appropriately
- support one-handed purchasing on mobile

Content should remain easy to scan across all devices.

---

## Accessibility

Every Product Information component must support:

- semantic headings
- logical document structure
- keyboard navigation
- visible focus indicators
- accessible labels
- sufficient contrast
- screen reader compatibility

Interactive elements should follow their individual accessibility specifications.

---

## Shopify Settings

Merchants may configure:

- show vendor
- show SKU
- show ratings
- show inventory
- show shipping information
- show trust badges
- show payment methods
- show product description
- enable accordions

Merchants should not configure:

- spacing
- typography
- animation timing
- layout behavior

These belong to the Design System.

---

## Design Tokens

The Product Information should use semantic tokens for:

- spacing
- typography
- colors
- borders
- divider spacing
- content width
- transitions

Example token categories:

- product-info-spacing
- product-info-heading
- product-info-divider
- product-info-content
- product-info-transition

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- accordion expansion
- fade transition
- opacity transition

Avoid:

- decorative animations
- bouncing
- scaling
- excessive movement

Motion should reinforce comprehension.

---

## Performance Rules

The Product Information should:

- reuse shared components
- minimize JavaScript
- avoid layout shifts
- update efficiently with variant changes
- render progressively

Critical purchasing information should load first.

---

## AI Guidelines

When generating storefronts, AI should:

- preserve the documented information hierarchy
- prioritize purchasing controls
- reuse existing components
- maintain accessibility
- avoid duplicating product information
- organize supporting content logically

AI should never invent product details or modify Shopify product data.

---

## Quality Checklist

### Purpose

- Product information is easy to understand.
- Purchasing flow is immediately apparent.

### Design

- Information hierarchy is clear.
- Purchasing controls receive greatest emphasis.
- Supporting content remains secondary.

### Accessibility

- Heading structure is correct.
- Keyboard navigation works.
- Focus indicators remain visible.

### Responsive

- Reading order is preserved.
- Purchasing remains accessible.
- Layout adapts gracefully.

### Performance

- No layout shifts occur.
- Variant updates are immediate.
- Shared components are reused.

### AI Compatibility

- Layout is deterministic.
- Existing components are reused.
- Shopify product data is preserved.

---

## Future Compatibility

Before extending the Product Information component, ask:

- Does the addition improve customer understanding?
- Can an existing component provide the functionality?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Product Information component should evolve through refinement rather than expansion.

Every Product Information component should clearly communicate the product's value, support confident purchasing, preserve accessibility and performance, and provide a calm, premium shopping experience that reflects the Calinium design philosophy.
