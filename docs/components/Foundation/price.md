# Price

## Purpose

The Price component communicates the monetary value of a product, service, or variant clearly, accurately, and consistently throughout the storefront.

Price is one of the most important commerce elements. It should always prioritize clarity, trust, and readability over visual styling.

The Price component should help customers understand exactly what they will pay.

---

## Responsibilities

The Price component is responsible for:

- displaying the current selling price
- displaying compare-at prices when applicable
- communicating discounts
- formatting currency consistently
- adapting to different markets and currencies
- remaining readable across all devices
- updating when product variants change

The Price component is not responsible for:

- calculating discounts
- applying taxes
- determining currency conversion
- validating checkout totals
- displaying shipping costs

These responsibilities belong to Shopify's commerce engine.

---

## User Goals

The Price component should help customers:

- understand product pricing immediately
- recognize discounts
- compare prices confidently
- identify sale items
- avoid confusion during purchasing

---

## Merchant Goals

The Price component should help merchants:

- communicate pricing clearly
- increase customer trust
- present promotions consistently
- support international selling
- preserve a premium appearance

Merchants should manage pricing through Shopify rather than manual formatting.

---

## Structure

A Price component may contain:

- Current price — required
- Compare-at price — optional
- Discount amount — optional
- Discount percentage — optional
- Unit price — optional
- Tax or shipping note — optional

---

## Required Elements

Every Price component requires:

- current selling price
- correct currency formatting
- semantic markup
- accessible text
- consistent typography

The selling price should always be the most visually prominent value.

---

## Optional Elements

The Price component may display:

- compare-at price
- sale percentage
- amount saved
- unit price
- tax information
- subscription pricing
- payment installment messaging

Optional information should never overpower the primary selling price.

---

## Supported Variants

### Standard

Displays the current selling price.

---

### Sale

Displays:

- current price
- compare-at price
- optional savings

The discounted price should receive the highest emphasis.

---

### Compare At

Displays the original price for comparison.

Compare-at prices should appear visually secondary.

---

### Range

Displays a minimum and maximum price.

Example:

```
From $120
```

or

```
$120–$180
```

---

### Unit Price

Displays pricing by measurement.

Examples:

```
$8 / oz
$12 / kg
```

---

### Subscription

Displays recurring billing information.

Example:

```
$45 / month
```

---

## Component-Specific Rules

### Typography Rules

Price typography should:

- prioritize readability
- align with the design system
- maintain consistent sizing
- preserve hierarchy

The selling price should always receive greater emphasis than secondary pricing information.

---

### Currency Rules

The Price component should:

- use Shopify's localized currency formatting
- display the correct currency symbol
- respect market settings
- support international selling

Currency formatting should never be hardcoded.

---

### Discount Rules

When displaying a discount:

- current price should appear first
- compare-at price should remain readable
- discount information should remain secondary
- discount meaning should not rely solely on color

Example:

```
$95
$120
Save 21%
```

---

### Variant Updates

When a customer selects a different variant:

- the price should update immediately
- compare-at pricing should update
- unit pricing should update
- accessibility announcements should update when appropriate

Price changes should not create layout shifts.

---

## Supported States

### Default

Displays the current product price.

---

### Sale

Displays promotional pricing.

---

### Sold Out

Price may remain visible while purchase actions become unavailable.

---

### Loading

During asynchronous updates:

- layout should remain stable
- placeholders may be displayed

---

## Responsive Behaviour

The Price component should:

- remain readable on small screens
- avoid awkward wrapping
- preserve hierarchy
- adapt typography proportionally

Price information should never become difficult to scan.

---

## Accessibility

Every Price component should support:

- semantic HTML
- sufficient contrast
- readable typography
- accessible announcements during updates

Strikethrough formatting alone should not communicate discounts.

Assistive technologies should receive the same pricing information presented visually.

---

## Shopify Settings

Merchants may configure:

- show compare-at price
- show savings
- show percentage saved
- show unit price
- show tax note
- show payment information

Merchants should not manually configure:

- currency symbols
- number formatting
- decimal precision
- exchange rates

These values should always come from Shopify.

---

## Design Tokens

The Price component should use semantic tokens for:

- primary price typography
- secondary price typography
- spacing
- foreground color
- sale color
- compare-at color

Example token categories:

- price-color
- sale-price-color
- compare-price-color
- price-spacing
- price-font-size

---

## Motion Rules

Price updates should remain subtle.

Allowed motion:

- opacity transition
- gentle number replacement

Avoid:

- scaling
- bouncing
- flashing
- decorative animations

Price changes should feel immediate and trustworthy.

---

## Performance Rules

The Price component should:

- reuse Shopify pricing data
- avoid unnecessary JavaScript
- update efficiently
- avoid layout shifts
- minimize DOM updates

---

## AI Guidelines

When generating storefronts, AI should:

- prioritize the current selling price
- display compare-at pricing only when applicable
- preserve Shopify currency formatting
- maintain clear hierarchy
- support localization
- avoid decorative price styling

AI should never invent prices or perform pricing calculations.

---

## Quality Checklist

### Purpose

- Current price is clearly visible.
- Pricing hierarchy is correct.

### Design

- Typography follows the design system.
- Compare-at price is visually secondary.

### Accessibility

- Pricing remains readable.
- Discounts do not rely solely on color.
- Dynamic updates are announced appropriately.

### Responsive

- Prices remain readable on mobile.
- No awkward wrapping occurs.

### Performance

- No layout shifts.
- Efficient updates.
- Shopify pricing is reused.

### AI Compatibility

- Current price is prioritized.
- Currency formatting is localized.
- No pricing values are invented.

---

## Future Compatibility

Before extending the Price component, ask:

- Does Shopify already provide this pricing information?
- Does the feature improve pricing clarity?
- Will customers immediately understand it?
- Can merchants configure it easily?
- Can AI generate it deterministically?

If an existing pricing pattern satisfies the requirement, reuse it.

The Price component should evolve through refinement rather than expansion.

Every price should communicate value clearly, accurately, consistently, and with complete customer confidence.
