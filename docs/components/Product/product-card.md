# Product Card

## Purpose

The Product Card is the primary reusable commerce component used to present a product consistently across collections, search results, recommendations, featured products, and promotional sections.

It provides customers with the essential information needed to evaluate a product quickly and decide whether to explore it further.

The Product Card should prioritize clarity, product imagery, and trust.

It should never compete with the product itself.

---

## Responsibilities

The Product Card is responsible for:

- presenting a product consistently
- displaying essential product information
- encouraging product discovery
- supporting merchandising
- adapting across responsive layouts
- remaining accessible
- supporting reusable storefront layouts

The Product Card is not responsible for:

- displaying full product details
- managing product variants
- displaying extensive descriptions
- replacing the product page
- handling checkout

---

## User Goals

The Product Card should help customers:

- recognize products quickly
- compare products efficiently
- identify pricing
- understand availability
- discover promotions
- navigate confidently to product pages

---

## Merchant Goals

The Product Card should help merchants:

- merchandise products consistently
- increase product discovery
- improve collection browsing
- reinforce brand quality
- support conversion

Merchants should configure product presentation—not card layout.

---

## Structure

A Product Card consists of:

- Product Image — required
- Product Title — required
- Price — required

Optional:

- Compare-at Price
- Badge
- Vendor
- Rating
- Color Swatches
- Secondary Image
- Quick Add
- Wishlist
- Product Labels

---

## Required Elements

Every Product Card requires:

- primary product image
- product title
- selling price
- product link
- accessible image
- accessible title

The entire card should communicate one product clearly.

---

## Optional Elements

The Product Card may include:

- sale badge
- new badge
- product vendor
- star rating
- review count
- inventory label
- color swatches
- quick add button
- wishlist button
- secondary hover image

Optional information should remain visually secondary.

---

## Supported Variants

### Standard

Displays image, title, and price.

Recommended for most collections.

---

### Editorial

Places greater emphasis on imagery.

Suitable for luxury and lifestyle brands.

---

### Commerce

Displays additional purchasing information.

May include:

- ratings
- quick add
- badges
- color swatches

---

### Minimal

Displays only:

- image
- title
- price

Suitable for premium editorial layouts.

---

## Component-Specific Rules

### Image Rules

Product imagery should:

- receive the greatest visual emphasis
- preserve aspect ratio
- avoid distortion
- load efficiently
- remain responsive

Hover images should only appear on devices that support hover.

---

### Title Rules

Product titles should:

- remain concise
- wrap gracefully
- preserve consistent height
- link to the product page

Long titles should never break the layout.

---

### Price Rules

Price should:

- remain immediately visible
- follow the Price component specification
- update correctly when required

The current selling price should receive greater emphasis than compare-at pricing.

---

### Badge Rules

Badges should follow the Badge component specification.

Examples:

- Sale
- New
- Sold Out
- Best Seller

Badges should never obscure product imagery.

---

### Quick Add Rules

Quick Add should:

- remain optional
- support accessibility
- avoid replacing the product page
- provide immediate feedback

Complex products requiring variant selection should navigate to the product page instead.

---

### Wishlist Rules

Wishlist controls should:

- remain visually secondary
- use the Icon Button specification
- expose accessible labels
- communicate current state

---

## Supported States

### Default

Displays product normally.

---

### Hover

May reveal:

- secondary image
- quick add
- subtle elevation

Hover should remain restrained.

---

### Focus

Keyboard users should receive visible focus indicators.

---

### Loading

Skeleton placeholders may be displayed.

Layout dimensions should remain stable.

---

### Sold Out

Availability should be communicated clearly.

Purchase actions should adapt appropriately.

---

## Responsive Behaviour

The Product Card should:

- adapt to different grid sizes
- preserve image proportions
- maintain readable typography
- support touch interaction
- avoid layout shifts

Cards should remain visually consistent across all breakpoints.

---

## Accessibility

Every Product Card must support:

- semantic HTML
- keyboard navigation
- accessible links
- descriptive image alt text
- visible focus indicators
- sufficient contrast

Interactive controls should remain individually accessible.

---

## Shopify Settings

Merchants may configure:

- show vendor
- show rating
- show badges
- show quick add
- show wishlist
- show secondary image
- image ratio
- image shape

Merchants should not configure:

- spacing
- typography
- animation timing
- hover behavior implementation

These belong to the Design System.

---

## Design Tokens

The Product Card should use semantic tokens for:

- spacing
- typography
- colors
- borders
- shadows
- border radius
- transitions

Example token categories:

- product-card-background
- product-card-border
- product-card-radius
- product-card-spacing
- product-card-shadow

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- image fade
- gentle elevation
- opacity transition
- quick add reveal

Avoid:

- bouncing
- scaling
- rotating
- decorative animations

Product imagery should remain the primary focus.

---

## Performance Rules

The Product Card should:

- lazy-load images
- avoid layout shifts
- minimize JavaScript
- reuse shared components
- render efficiently

Images should use responsive loading strategies.

---

## AI Guidelines

When generating storefronts, AI should:

- prioritize imagery
- maintain consistent card layouts
- reuse documented components
- preserve accessibility
- avoid excessive product metadata
- choose the appropriate card variant based on context

AI should never invent product information or alter Shopify product data.

---

## Quality Checklist

### Purpose

- Product is immediately recognizable.
- Information is easy to scan.

### Design

- Image remains dominant.
- Typography follows the design system.
- Card hierarchy is consistent.

### Accessibility

- Keyboard navigation works.
- Images include meaningful alt text.
- Focus indicators remain visible.

### Responsive

- Cards scale correctly.
- Images remain proportional.
- Touch interaction is comfortable.

### Performance

- Images lazy-load.
- No layout shifts occur.
- Shared components are reused.

### AI Compatibility

- Layout is deterministic.
- Product information comes from Shopify.
- Existing card variants are reused.

---

## Future Compatibility

Before extending the Product Card, ask:

- Does the addition improve product discovery?
- Can an existing variant support the requirement?
- Will merchants understand the setting?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Product Card should evolve through refinement rather than expansion.

Every Product Card should showcase the product clearly, encourage exploration, maintain consistency, and quietly support conversion without distracting from the product itself.
