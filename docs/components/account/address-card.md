# Address Card
## Purpose
Address Card presents one verified customer address with clear supported actions.
## Responsibilities
It owns formatted address display, default state, and edit/delete action context.
## User Goals
Customers can recognize and manage one real address.
## Merchant Goals
Merchants use Shopify-localized address formatting without duplicate fields.
## Structure
Formatted address is required; name, company, verified phone, default label, and actions are optional.
## Required Elements
Use verified Shopify address data and semantic address markup.
## Optional Elements
Phone and destructive action appear only when operationally necessary and supported.
## Supported Variants
Compact and standard variants support account context.
## Component-Specific Rules
Address Card must use localized formatting and explicit action labels. It must not guess missing geography, validate address, define edit form, or mark default without verification.
## Supported States
Default, editable, unavailable, loading, and error states are accurate.
## Responsive Behaviour
Long addresses wrap without clipping actions or exposing extra fields.
## Accessibility
Use semantic HTML and address markup, visible focus, keyboard actions, WCAG 2.2 AA contrast, and named destructive actions.
## Shopify Settings
Merchants may configure approved phone visibility, density, and supported actions; formatting and privacy are system controlled.
## Design Tokens
Use address-card-space, address-card-surface, address-card-default, and address-card-focus tokens.
## Motion Rules
No decorative address movement; reduced-motion preferences are respected.
## Performance Rules
Use Shopify-rendered data, minimal JavaScript, progressive enhancement, stable layout, and no duplicate customer requests.
## AI Guidelines
AI should use verified data and deterministic safe display; it must not invent address, default state, or actions.
## Quality Checklist
- Address formatting and default state are verified.
- Actions are explicit and safe.
## Future Compatibility
Edit/delete workflows require supported Shopify forms and privacy-safe confirmation behavior.
