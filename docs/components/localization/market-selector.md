# Market Selector
## Purpose
Market Selector enables explicit verified Shopify market choice only when it is meaningfully distinct from country selection.
## Responsibilities
It owns verified customer-facing markets, current state, submission, and truthful destination context through Localization Form.
## User Goals
Customers can intentionally change a real market without surprise redirect or unsupported promise.
## Merchant Goals
Merchants expose customer-facing Markets without internal IDs or custom routing.
## Structure
Verified market input and current label are required; confirmation or destination explanation is optional.
## Required Elements
Use real Shopify market labels/values, explicit submit, and clear navigation expectation.
## Optional Elements
Confirmation appears only where market change has verified significant effect.
## Supported Variants
Explicit selector, single-market summary, unavailable, loading, and error states are supported.
## Component-Specific Rules
Market Selector must be omitted when Country Selector already determines market. It must not invent market names/URLs, expose IDs, infer residence, silently change market, promise catalog/price/tax/shipping parity, or redirect outside Shopify behavior.
## Supported States
Current, submitting, single market, unavailable, and error are accurate.
## Responsive Behaviour
Long market labels, RTL, zoom, and touch controls remain usable and source ordered.
## Accessibility
Use semantic HTML, label, keyboard control, visible focus, WCAG 2.2 AA contrast, current state, and clear navigation expectation.
## Shopify Settings
Merchants may configure visibility/label only when Shopify exposes meaningful market choice; values/routes are system controlled.
## Design Tokens
Use market-selector-gap, market-selector-label, market-selector-control, and market-selector-focus tokens.
## Motion Rules
No automatic redirect or animated globe; restrained real loading respects reduced-motion preferences.
## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.
Use Shopify data, native submission, minimal JavaScript, progressive enhancement, no polling/geolocation, and no external market database.
## AI Guidelines
AI should add Market Selector only with verified distinct market choice, deterministic data, explicit action, and privacy-safe behavior.

AI must not invent Markets, eligibility, pricing, availability, geolocation, or redirects; or render Market Selector when Shopify exposes no meaningful choice.
## Quality Checklist
- Country and market are not conflated.
- No internal data or unsupported promise appears.
## Future Compatibility
Market routing or suggestions require verified Shopify behavior, product approval, privacy review, and redirect-loop protection.
