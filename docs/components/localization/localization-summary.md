# Localization Summary
## Purpose
Localization Summary presents current verified country, language, market where meaningful, and currency context without changing it.
## Responsibilities
It owns concise active-context presentation and optional change action to existing selectors.
## User Goals
Customers understand active storefront context and find real controls if they want change.
## Merchant Goals
Merchants show transparent localization context without duplicate selectors or claims.
## Structure
One concise verified active label is required; optional change action and compact/standard detail are supported.
## Required Elements
Use current Shopify country/language/currency/market data and expose only necessary dimensions.
## Optional Elements
Change action opens or navigates to existing localization control; market appears only when meaningful.
## Supported Variants
Compact and standard current-context variants are supported.
## Component-Specific Rules
Localization Summary must remain non-interactive except real change action. It must not infer identity, show internal market data, repeat obvious context, promise shipping/tax, or redefine selectors.
## Supported States
Current, partial context, single-option, unavailable, and error state are honest.
## Responsive Behaviour
Localized names, currency format, RTL, text expansion, zoom, and narrow placement remain readable.
## Accessibility
Use semantic HTML, clear text, named change action, visible focus, WCAG 2.2 AA contrast, logical order, and no color-only context.
## Shopify Settings
Merchants may configure approved placement, compact/standard detail, currency-code visibility, and real change action; state and routes are system controlled.
## Design Tokens
Use localization-summary-gap, localization-summary-text, localization-summary-code, and localization-summary-focus tokens.
## Motion Rules
No animated flags/currency; restrained real state update respects reduced-motion preferences.
## Performance Rules
Use Shopify-rendered context, minimal JavaScript, progressive enhancement, no geolocation/rate request, no duplicate selectors, and Theme Editor-safe rerender.
## AI Guidelines
AI should use verified current data, deterministic concise label, translated keys, RTL-safe logical layout, and no forced redirect.

AI must not infer geography or language, calculate conversion, promise market availability, or present the summary as an editable selector.
## Quality Checklist
- Summary is accurate and does not act as selector.
- Change action leads to real existing control.
## Future Compatibility
New summary dimension requires verified Shopify localization context and must preserve privacy and concise presentation.
