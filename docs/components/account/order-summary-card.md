# Order Summary Card
## Purpose
Order Summary Card presents a compact verified summary of one order, not order details or processing logic.
## Responsibilities
It owns order name, date, total, concise items, optional image, Order Status, and real view-order destination.
## User Goals
Customers can recognize an order and reach real detail safely.
## Merchant Goals
Merchants show Shopify order data without excessive line-item or payment exposure.
## Structure
Verified name/date/total and view-order link are required; status, item summary, image, and verified tracking destination are optional.
## Required Elements
Use Price, Order Status, and verified Shopify order data.
## Optional Elements
Image and tracking appear only when real and relevant.
## Supported Variants
Compact and standard variants support account lists.
## Component-Specific Rules
Order Summary Card must distinguish status types and preserve source ownership. It must not expose credentials, invent tracking/delivery, calculate refunds, determine returns, or imply completion from partial data.
## Supported States
Available, loading, unavailable, and error state are accurate; details remain a destination.
## Responsive Behaviour
Items remain concise and actions accessible without overflow.
## Accessibility
Use semantic HTML, named order link, Price semantics, text status, Responsive Image alternatives, focus, and WCAG 2.2 AA contrast.
## Shopify Settings
Merchants may configure approved density and order-image visibility; order data, routes, and state mappings are system controlled.
## Design Tokens
Use order-card-space, order-card-surface, order-card-image, order-card-status, and order-card-focus tokens.
## Motion Rules
No order urgency or tracking animation; reduced-motion preferences are respected.
## Performance Rules
Server render summary data, lazy-load non-critical image, use minimal JavaScript, progressive enhancement, and no full-detail loading in lists.
## AI Guidelines
AI should use verified order data, deterministic compact structure, and real route; it must not invent delivery, tracking, refund, or eligibility.
## Quality Checklist
- Summary has verified order identity, total, and destination.
- Private payment data is absent.
## Future Compatibility
Details, tracking, returns, and refunds require their own verified Shopify-capability specifications.
