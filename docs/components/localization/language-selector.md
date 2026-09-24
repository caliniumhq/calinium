# Language Selector
## Purpose
Language Selector lets customers choose among published storefront languages actually available in Shopify.
## Responsibilities
It owns verified language options, current language, localized/native names, and Localization Form submission.
## User Goals
Customers can explicitly select available storefront language and understand navigation may reload context.
## Merchant Goals
Merchants expose published languages without claiming complete translation.
## Structure
Visible label and verified language input are required; native/translated language names are optional.
## Required Elements
Use published Shopify languages, current state, translated accessibility labels, and clear submit behavior.
## Optional Elements
Native language name and code may support clarity where appropriate.
## Supported Variants
Native Select, single-option summary, and unavailable state are supported.
## Component-Specific Rules
Language Selector must preserve explicit choice and handle RTL transition safely. It must not invent translation, offer unpublished language, use flags as language labels, infer preference, or alter customer-entered content.
## Supported States
Current, submitting, single-option, unavailable, and error state are accurate.
## Responsive Behaviour
Long labels, text expansion, Unicode, RTL, zoom, and logical layout remain safe.
## Accessibility
Use semantic HTML, translated label, keyboard native control, visible focus, WCAG 2.2 AA contrast, current-selection text, and clear reload/domain expectations.
## Shopify Settings
Merchants may configure visibility and approved label; language list, direction, routes, semantics, and accessibility are system controlled.
## Design Tokens
Use language-selector-gap, language-selector-label, language-selector-control, and language-selector-focus tokens.
## Motion Rules
No flag or language animation; navigation change has no unnecessary delay and respects reduced-motion preferences.
## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.
Use Shopify-rendered languages, native form, minimal JavaScript, progressive enhancement, no translation service or polling, and rerender cleanup.
## AI Guidelines
AI should use verified published languages, deterministic native-first choice, RTL-safe logical properties, and translated labels.

AI must not invent translations, infer language preference, force a redirect, expose unpublished languages, or replace Shopify localization ownership.
## Quality Checklist
- Language is distinct from country and market.
- No translation-completeness claim appears.
## Future Compatibility
New language behavior requires verified Shopify publication and accessible RTL/localization validation.
