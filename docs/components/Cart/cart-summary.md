# Cart Summary

## Purpose

The Cart Summary provides customers with a concise overview of the financial details of their shopping cart before checkout.

It communicates totals clearly while reinforcing confidence in the purchasing process.

The Cart Summary should reduce uncertainty—not introduce complexity.

---

## Responsibilities

The Cart Summary is responsible for:

- displaying cart subtotal
- presenting discounts
- communicating estimated charges
- displaying checkout actions
- reinforcing trust
- remaining accessible across all devices

The Cart Summary is not responsible for:

- displaying cart items
- editing quantities
- applying discounts
- calculating shipping rates
- processing checkout

These responsibilities belong to Shopify and related cart components.

---

## User Goals

The Cart Summary should help customers:

- understand the current order value
- recognize applied savings
- estimate upcoming costs
- begin checkout confidently

---

## Merchant Goals

The Cart Summary should help merchants:

- improve checkout confidence
- reduce purchase hesitation
- communicate pricing transparently
- support trust throughout the purchasing journey

Merchants should configure displayed information—not pricing logic.

---

## Structure

A Cart Summary consists of:

- Subtotal — required
- Checkout Button — required

Optional:

- Discounts
- Shipping Notice
- Tax Notice
- Estimated Total
- Free Shipping Progress
- Payment Icons
- Trust Badges
- Terms Notice

---

## Required Elements

Every Cart Summary requires:

- subtotal
- checkout action
- accessible structure
- responsive layout

The subtotal should always remain immediately visible.

---

## Optional Elements

The Cart Summary may include:

- promotional discounts
- estimated shipping
- estimated taxes
- gift card deductions
- free shipping progress
- payment methods
- secure checkout messaging
- financing information

Optional information should remain visually secondary to the checkout action.

---

## Supported Variants

### Minimal

Displays:

- subtotal
- checkout button

Recommended for luxury storefronts.

---

### Standard

Displays:

- subtotal
- shipping notice
- taxes notice
- checkout button

Recommended for most storefronts.

---

### Commerce

Displays:

- subtotal
- discounts
- shipping estimate
- taxes estimate
- free shipping progress
- trust messaging
- payment icons
- checkout button

Suitable for feature-rich storefronts.

---

## Component-Specific Rules

### Subtotal Rules

The subtotal should:

- receive the greatest visual emphasis
- update immediately
- reflect Shopify pricing
- exclude estimated charges unless explicitly labeled

Customers should immediately understand the current order value.

---

### Discount Rules

When discounts exist, display:

- discount name
- discount value

Discounts should remain visually distinct from the subtotal.

Savings should never appear misleading.

---

### Shipping Rules

Shipping information may display:

- Calculated at Checkout
- Free Shipping
- Estimated Shipping

Shipping estimates should be clearly identified as estimates.

---

### Tax Rules

Tax messaging should communicate whether taxes are:

- included
- excluded
- calculated during checkout

The component should follow regional Shopify tax settings.

---

### Estimated Total Rules

If displayed, the estimated total should include:

- subtotal
- estimated shipping
- estimated taxes
- discounts

Estimated totals should always be labeled clearly.

---

### Checkout Rules

The Checkout button should:

- use the Button component's primary variant
- remain visually dominant
- initiate Shopify Checkout
- remain immediately accessible

The checkout action should always receive the greatest visual emphasis.

---

### Free Shipping Rules

If enabled, the component may display:

- current progress
- remaining amount
- qualification message

Example:

```
You're only $18 away from Free Shipping.
```

Progress messaging should encourage purchasing without creating pressure.

---

### Trust Messaging

Optional trust messaging may include:

- Secure Checkout
- SSL Encryption
- Easy Returns
- Fast Shipping
- Payment Protection

Trust messaging should reassure rather than compete with checkout.

---

## Supported States

### Default

Summary information is displayed normally.

---

### Updating

Totals are synchronizing with Shopify.

Layout dimensions should remain stable.

---

### Discount Applied

Savings update immediately.

The updated subtotal should remain clear.

---

### Empty Cart

No totals are available.

Helpful messaging should guide customers back to shopping.

---

### Error

Pricing information could not be updated.

Customers should receive clear, accessible feedback.

---

## Responsive Behaviour

The Cart Summary should:

- remain easy to scan
- preserve readable spacing
- prioritize checkout
- adapt gracefully across devices
- avoid horizontal scrolling

The checkout button should remain immediately accessible on mobile devices.

---

## Accessibility

Every Cart Summary must support:

- semantic structure
- keyboard navigation
- visible focus indicators
- accessible pricing labels
- screen reader compatibility
- sufficient contrast

Dynamic pricing updates should be announced appropriately.

---

## Shopify Settings

Merchants may configure:

- show discounts
- show taxes notice
- show shipping notice
- show estimated total
- show free shipping progress
- show payment icons
- show trust badges

Merchants should not configure:

- typography
- spacing
- animation timing
- pricing calculations

These belong to the Design System and Shopify.

---

## Design Tokens

The Cart Summary should use semantic tokens for:

- spacing
- typography
- colors
- borders
- divider spacing
- transitions

Example token categories:

- cart-summary-spacing
- cart-summary-divider
- cart-summary-subtotal
- cart-summary-background
- cart-summary-transition

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

Pricing updates should feel immediate and reliable.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Cart Summary should:

- synchronize efficiently with Shopify cart data
- avoid layout shifts
- minimize JavaScript
- reuse shared pricing components
- remain responsive during updates

Totals should update without unnecessary rendering.

---

## AI Guidelines

When generating storefronts, AI should:

- prioritize subtotal and checkout
- preserve Shopify pricing behavior
- maintain accessibility
- reuse documented pricing components
- avoid unnecessary financial information

AI should never invent totals, taxes, discounts, or shipping costs.

---

## Quality Checklist

### Purpose

- Order value is immediately understandable.
- Checkout is easy to initiate.

### Design

- Subtotal receives greatest emphasis.
- Checkout button remains dominant.
- Supporting information is clearly secondary.

### Accessibility

- Keyboard navigation works.
- Dynamic totals are announced.
- Focus indicators remain visible.

### Responsive

- Summary adapts gracefully.
- Checkout remains accessible.
- No horizontal scrolling occurs.

### Performance

- Totals update immediately.
- No layout shifts occur.
- Shopify pricing remains synchronized.

### AI Compatibility

- Pricing behavior is deterministic.
- Shopify calculations are preserved.
- Existing components are reused.

---

## Future Compatibility

Before extending the Cart Summary, ask:

- Does the feature improve checkout confidence?
- Can Shopify already provide the functionality?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Cart Summary should evolve through refinement rather than expansion.

Every Cart Summary should communicate pricing with clarity, reinforce customer confidence, preserve accessibility and performance, and provide a calm, trustworthy purchasing experience that reflects the Calinium design philosophy.
