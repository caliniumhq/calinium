# Account Summary
## Purpose
Account Summary presents a concise verified overview of account information and relevant destinations, not a dashboard.
## Responsibilities
It composes Customer Identity, optional accurate counts or summaries, and one primary next action.
## User Goals
Customers confirm signed-in context and find a useful next task.
## Merchant Goals
Merchants show verified account context without promotions, rewards, or invented statistics.
## Structure
Heading and verified identity context are required; actions, order/address summary, and concise greeting are optional.
## Required Elements
Use only authenticated Shopify data and a real account destination.
## Optional Elements
Order count or address summary appears only when accurate and necessary.
## Supported Variants
Minimal and standard summary support available verified content.
## Component-Specific Rules
Account Summary must reuse Customer Identity, Account Action List, Order Summary Card, and Address Card. It must not become a full dashboard or invent recommendations, rewards, or value claims.
## Supported States
Signed-in, missing optional data, loading, unavailable, and error contexts are honest.
## Responsive Behaviour
Stack content naturally without repeating private information or overflowing at zoom.
## Accessibility
Use semantic HTML, headings, links, visible focus, WCAG 2.2 AA contrast, and no unnecessary private-data announcements.
## Shopify Settings
Merchants may configure approved heading, greeting, visibility, and primary destination; layout and privacy rules are system controlled.
## Design Tokens
Use account-summary-space, account-summary-heading, account-summary-action, and account-summary-focus tokens.
## Motion Rules
No decorative personalization motion; reduced-motion preferences are respected.
## Performance Rules
Use Shopify-rendered state, minimal JavaScript, progressive enhancement, and no unnecessary customer-data requests.
## AI Guidelines
AI should use verified minimal data, deterministic composition, real routes, and no marketing-first account content.

AI must not infer identity, order, loyalty, delivery, or account state; expose private data; or use Account Summary as a promotional module.
## Quality Checklist
- Summary is concise and authenticated.
- Statistics and destinations are verified.
## Future Compatibility
New summary content needs a verified account capability and must preserve privacy and source ownership.
