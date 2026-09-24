# Order Status
## Purpose
Order Status presents concise verified financial, fulfillment, or overall order state.
## Responsibilities
It owns source status, clear financial/fulfillment distinction, localization, and relationship with Status Indicator and Badge.
## User Goals
Customers understand verified order state without false delivery progress.
## Merchant Goals
Merchants present Shopify-native states accurately.
## Structure
Textual verified status is required; optional icon or Status Indicator may reinforce it.
## Required Elements
Every state requires source type and text equivalent.
## Optional Elements
Multiple status types appear only with clear distinct labels.
## Supported Variants
Paid, pending, authorized, partially paid, refunded, partially refunded, fulfilled, partially fulfilled, unfulfilled, cancelled, and neutral unknown appear only when verified.
## Component-Specific Rules
Order Status must distinguish financial from fulfillment state. It must not invent delivery location/date, combine states misleadingly, infer refund completion, or calculate status.
## Supported States
Verified current, updating, unavailable, and error state are honest.
## Responsive Behaviour
Statuses wrap and retain text at narrow widths and zoom.
## Accessibility
Use semantic HTML, text not color alone, WCAG 2.2 AA contrast, visible focus for related link, and restrained updates.
## Shopify Settings
Merchants may configure visibility only; mappings, labels, localization, and state styling are system controlled.
## Design Tokens
Use order-status-paid, order-status-pending, order-status-fulfillment, order-status-error, and order-status-gap tokens.
## Motion Rules
No urgency, pulse, or tracking animation; reduced-motion preferences are respected.
## Performance Rules
Use Shopify-rendered state, minimal JavaScript, progressive enhancement, no polling, and stable geometry.
## AI Guidelines
AI should select deterministic verified source state and hide unknown context; it must not invent tracking, delivery, payment, or refund state.
## Quality Checklist
- Financial and fulfillment labels are distinct.
- Textual status is accurate and localized.
## Future Compatibility
New states require verified Shopify mapping and must preserve source-type distinction.
