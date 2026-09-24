# Account Empty State
## Purpose
Account Empty State specializes Empty State for verified authenticated absence of account content.
## Responsibilities
It owns no-orders, no-addresses, unavailable-account-content, and one relevant next action.
## User Goals
Customers understand verified absence without being shamed or misled.
## Merchant Goals
Merchants offer relevant account recovery without promotions.
## Structure
Heading and concise explanation are required; one primary action and secondary destination are optional.
## Required Elements
Every instance requires verified signed-in account context and successful-empty state.
## Optional Elements
Action appears only when real and appropriate to authenticated user.
## Supported Variants
No orders, no addresses, and unavailable content are distinct variants.
## Component-Specific Rules
Account Empty State must reuse generic Empty State behavior and distinguish signed-out, loading, error, and empty. It must not fabricate products, claim data deletion, or offer create-account action to signed-in customer.
## Supported States
Empty, loading, error, unavailable, and signed-out contexts remain distinct.
## Responsive Behaviour
Content and actions remain readable and touch safe at narrow widths and zoom.
## Accessibility
Use semantic HTML, heading, WCAG 2.2 AA contrast, keyboard actions, and no unnecessary private-data announcements.
## Shopify Settings
Merchants may configure approved empty text and primary destination; data state and accessibility are system controlled.
## Design Tokens
Use account-empty-space, account-empty-heading, account-empty-text, and account-empty-focus tokens.
## Motion Rules
No decorative empty-state motion; reduced-motion preferences are respected.
## Performance Rules
Server render verified state, require no JavaScript, preserve progressive enhancement, and avoid extra account requests.
## AI Guidelines
AI should use deterministic verified account state, one real action, and no promotions or fabricated recommendations.

AI must not use this component for loading, error, or unknown account state; invent content, recommendations, or actions; or replace the global Empty State outside account context.
## Quality Checklist
- Empty is not loading/error/signed-out.
- Action is real for the authenticated context.
## Future Compatibility
New account-empty contexts require verified Shopify capability and privacy-safe behavior.
