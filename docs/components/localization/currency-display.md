# Currency Display
## Purpose
Currency Display presents verified monetary value using active Shopify currency and locale formatting rules.
## Responsibilities
It owns currency symbol/code clarity, separators, precision, zero-decimal support, and screen-reader context.
## User Goals
Customers understand displayed monetary value without assuming conversion or a selectable currency.
## Merchant Goals
Merchants preserve Shopify formatting without hard-coded symbols or precision.
## Structure
Shopify-formatted value is required; ISO code may be optional for ambiguity.
## Required Elements
Use active verified currency, locale money output, and clear context for range or compare-at values.
## Optional Elements
ISO code may disambiguate symbols only when useful.
## Supported Variants
Standard, range, compare-at, and unavailable value presentation are supported.
## Component-Specific Rules
Currency Display must reuse Price, Cart Summary, and Tax Note context. It must not convert currencies, fetch rates, calculate prices, override money filters, hard-code precision, or assume `$` means USD.
## Supported States
Available, range, compare-at, mixed-context error, and unavailable are accurate.
## Responsive Behaviour
Localized symbols, grouping, zero decimals, RTL, zoom, and long values remain readable without split currency context.
## Accessibility
Use semantic HTML, screen-reader clarity, WCAG 2.2 AA contrast, and text context distinguishing currency when symbol is ambiguous.
## Shopify Settings
Merchants may configure currency-code visibility only; currency, formatting, rate, and precision are Shopify controlled.
## Design Tokens
Use currency-display-value, currency-display-code, currency-display-compare, and currency-display-gap tokens.
## Motion Rules
No animated symbols or price-counting; reduced-motion preferences are respected.
## Performance Rules
Use Shopify-rendered money, no rate requests, minimal JavaScript, progressive enhancement, and stable geometry.
## AI Guidelines
AI should preserve Shopify-formatted verified value and deterministic context; it must not invent currency, conversion, rate, tax, or precision.
## Quality Checklist
- Currency display is presentation only.
- No mixed currencies or ambiguous symbol claim occurs.
## Future Compatibility
New monetary display needs verified Shopify market/locale support and must remain distinct from conversion.
