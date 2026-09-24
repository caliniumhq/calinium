# Account Navigation
## Purpose
Account Navigation provides links between verified customer-account destinations without becoming storefront navigation.
## Responsibilities
It owns account landmark, destination list, current destination, and clear sign-out action where supported.
## User Goals
Customers can find verified account destinations and return to shopping.
## Merchant Goals
Merchants present only supported Shopify account routes.
## Structure
Navigation landmark and semantic list are required; compact, expanded, icons, and sign-out are optional.
## Required Elements
Every instance requires real destinations, current-page indication, and links for destinations versus buttons/forms for actions.
## Optional Elements
Icons and supporting text may clarify verified routes.
## Supported Variants
Compact and expanded variants support desktop and mobile contexts.
## Component-Specific Rules
Account Navigation must preserve active text state and real routes. It must not invent destinations, use Tabs for page navigation, or hide sign-out ambiguously.
## Supported States
Signed-in, current destination, unavailable route, and signed-out contexts are accurate.
## Responsive Behaviour
It wraps or uses existing mobile navigation without reordering source or hiding essential links.
## Accessibility
Use semantic HTML, navigation landmark, list semantics, `aria-current` where appropriate, keyboard operation, visible focus, and WCAG 2.2 AA contrast.
## Shopify Settings
Merchants may configure approved visibility and supported destinations; the system controls routes, focus, spacing, and breakpoints.
## Design Tokens
Use account-nav-gap, account-nav-current, account-nav-link, and account-nav-focus tokens.
## Motion Rules
Only restrained current-state transition is allowed; reduced-motion preferences are respected.
## Performance Rules
Server-render real routes, use minimal JavaScript, progressive enhancement, no polling, and Theme Editor-safe cleanup.
## AI Guidelines
AI should select verified routes and deterministic current state, preserve privacy, and reuse Header, Breadcrumbs, and navigation primitives.

AI must not invent routes, permissions, account capability, order links, or customer data; or use Account Navigation for storefront-wide navigation.
## Quality Checklist
- Destinations exist and active state is textual.
- No administrative or unsupported feature appears.
## Future Compatibility
New destinations require a verified Shopify route and account capability; navigation must remain customer-task-led.
