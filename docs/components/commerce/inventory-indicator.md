# Inventory Indicator

## Purpose

Inventory Indicator communicates verified availability or carefully qualified urgency for the currently selected product variant.

It reduces uncertainty through calm factual wording, never artificial scarcity, purchasing control, or inventory management.

## Responsibilities

Inventory Indicator is responsible for:

- presenting in-stock, low-stock, out-of-stock, unavailable, preorder, or incoming states only when verified
- synchronizing its presentation with selected-variant changes
- communicating status through text as well as visual treatment
- coordinating with Badge and Product Information without duplicating them

Inventory Indicator is not responsible for purchase availability, variant selection, stock calculation, inventory policy, threshold creation, or product-form logic.

## User Goals

Inventory Indicator should help customers understand the verified availability context relevant to their selected variant.

## Merchant Goals

Inventory Indicator should help merchants present Shopify inventory state without exposing exact quantity by default or creating misleading urgency.

## Structure

Inventory Indicator consists of:

- verified availability state — required
- concise textual status — required

Optional:

- non-semantic decorative indicator
- verified low-stock wording
- verified preorder or incoming context

## Required Elements

Every Inventory Indicator requires variant-aware verified data, text that communicates the state, and a stable place in Product Information or Product Card context.

## Optional Elements

Inventory Indicator may include low-stock, preorder, or incoming messages only when Shopify or approved merchant rules verify them. Exact inventory quantity remains hidden by default.

## Supported Variants

### In Stock

Communicates verified availability without pressure.

### Low Stock

Appears only when a documented threshold is tied to actual inventory logic.

### Sold Out

Communicates unavailable inventory; Buy Buttons remain authoritative for purchasing state.

### Unavailable

Communicates that the selected variant cannot currently be purchased.

### Preorder or Incoming

Appears only when explicitly supported and verified.

## Component-Specific Rules

Inventory Indicator must update from the currently selected variant, use text in addition to color, and announce a meaningful change without repeated disruption.

Inventory Indicator must not disclose exact quantity by default, create artificial scarcity thresholds, promise restock dates, control Buy Buttons, or infer stock from product popularity.

## Supported States

### Available

Verified in-stock context is shown.

### Low Stock

Verified urgency appears with restrained factual wording.

### Sold Out or Unavailable

Text clearly communicates the state while purchasing controls follow their own rules.

### Updating

Variant change updates are event-driven and stable.

### Unknown

The indicator hides or presents neutral unavailable context rather than guessing.

## Responsive Behaviour

Inventory Indicator should wrap safely, retain legible text and touch spacing near related controls, and preserve visual and DOM order at 320 px, zoom, and large text settings.

## Accessibility

Inventory Indicator must use semantic HTML, non-color-only text, WCAG 2.2 AA contrast, and restrained live-region announcements where a selected-variant change materially changes availability. Focus must not move automatically.

## Shopify Settings

Merchants may configure visibility, approved wording, and a low-stock threshold only when it is connected to actual inventory logic.

The Design System controls status styling, spacing, icon treatment, announcements, focus, breakpoints, motion, and failure behavior.

## Design Tokens

Inventory Indicator should use inventory-gap, inventory-available, inventory-caution, inventory-unavailable, inventory-text, and inventory-focus tokens.

## Motion Rules

State confirmation may use a brief restrained change. No pulsing, flashing, countdown, or repeated urgency motion is allowed; reduced-motion preferences are respected.

## Performance Rules

Inventory Indicator should render verified initial state server-side, update event-driven with variant changes, use minimal JavaScript, avoid polling and duplicate fetches, preserve stable geometry and progressive enhancement, and fail without blocking purchase controls.

## AI Guidelines

AI should use Inventory Indicator only with verified Shopify or approved inventory data; choose deterministic factual state; preserve hierarchy; and omit uncertain status.

AI must not invent stock, scarcity, restock timing, thresholds, or purchasing rules.

## Quality Checklist

### Data

- State comes from the active variant and verified inventory logic.
- Low-stock wording has a documented real threshold.

### Accessibility

- Text communicates state independently of color.
- Dynamic updates are useful, not disruptive.

### Hierarchy

- Price, variants, and Buy Buttons remain authoritative.

## Future Compatibility

Future Inventory Indicator refinement should remain presentation-only and Shopify-native. New states require verified source data, variant-safe updates, honest wording, and no dark-pattern urgency.
