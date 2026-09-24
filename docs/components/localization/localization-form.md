# Localization Form
## Purpose
Localization Form owns Shopify-native localization submission and shared country/language/market control structure.
## Responsibilities
It owns verified input values, hidden required values, explicit submit, fallback, and real submission feedback.
## User Goals
Customers understand and intentionally change available storefront context.
## Merchant Goals
Merchants expose Shopify Markets options without custom routing or conversion logic.
## Structure
Shopify localization form and supported selector inputs are required; submit button and enhancement are optional.
## Required Elements
Use verified Shopify action/values, visible labels, explicit submission, and operable server-rendered fallback.
## Optional Elements
Country, language, or market may share a form only when current implementation supports it.
## Supported Variants
Native submit and safely enhanced submit are supported.
## Component-Specific Rules
Localization Form must preserve current page where Shopify supports it. It must not calculate price, invent values/URLs, detect location, translate content, or depend entirely on JavaScript.
## Supported States
Current, submitting, error, unavailable, and single-option state are accurate.
## Responsive Behaviour
Controls stack safely and tolerate translated, RTL, zoomed, and long content.
## Accessibility
Use semantic HTML forms, labels, keyboard controls, visible focus, WCAG 2.2 AA contrast, errors, and clear navigation expectation after submit.
## Shopify Settings
Merchants may configure verified selector visibility and label; values, routes, semantics, and accessibility are system controlled.
## Design Tokens
Use localization-form-gap, localization-form-submit, localization-form-error, and localization-form-focus tokens.
## Motion Rules
Only restrained real loading/selection confirmation; reduced-motion preferences are respected.
## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.
Use Shopify-rendered state, native submission, minimal JavaScript, progressive enhancement, no polling or external databases, and rerender cleanup.
## AI Guidelines
AI should use verified Shopify data, deterministic form structure, translated labels, and explicit choice; it must not infer customer identity or create redirects.
## Quality Checklist
- Inputs and submission use real Shopify data.
- Form works without JavaScript.
## Future Compatibility
New controls require verified Shopify localization support, explicit customer choice, and safe route behavior.
