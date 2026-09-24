# Customer Identity
## Purpose
Customer Identity presents the signed-in customer’s minimum necessary verified name, email, Avatar, or neutral fallback.
## Responsibilities
It owns privacy-conscious identity presentation and signed-in context.
## User Goals
Customers can confirm who is signed in without unnecessary data exposure.
## Merchant Goals
Merchants present Shopify identity data consistently and respectfully.
## Structure
Verified display name or neutral fallback is required; Avatar and contextually necessary email are optional.
## Required Elements
Use authenticated verified customer data and privacy-safe truncation.
## Optional Elements
Email appears only where needed; initials derive only from verified display data.
## Supported Variants
Compact and standard variants support account context.
## Component-Specific Rules
Customer Identity must reuse Avatar and minimize exposure. It must not infer gender, title, age, tier, status, address, phone, or order history.
## Supported States
Signed-in, missing-name, neutral fallback, and signed-out states are explicit.
## Responsive Behaviour
Names and email wrap or truncate safely without losing identity context.
## Accessibility
Use semantic HTML, accurate accessible name, WCAG 2.2 AA contrast, and no redundant private-data live announcement.
## Shopify Settings
Merchants may configure approved visibility; data selection, truncation, and privacy are system controlled.
## Design Tokens
Use customer-identity-gap, customer-identity-name, customer-identity-email, and customer-identity-focus tokens.
## Motion Rules
No decorative Avatar or identity motion; reduced-motion preferences are respected.
## Performance Rules
Use Shopify-rendered verified state, minimal JavaScript, progressive enhancement, and no duplicate identity fetching.
## AI Guidelines
AI should preserve verified data, select deterministic minimal variant, and never invent identity or personalization.
## Quality Checklist
- Minimum necessary data is shown.
- Signed-in state is verified.
## Future Compatibility
Any profile, preference, or account-status expansion requires verified Shopify support and privacy review.
