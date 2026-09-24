# Country Selector
## Purpose
Country Selector lets customers choose country or region options provided by Shopify Markets.
## Responsibilities
It owns verified options, current selection, localized labels, and input semantics through Localization Form.
## User Goals
Customers can explicitly choose an available country without claims about shipping, tax, or identity.
## Merchant Goals
Merchants expose active Shopify country options without maintaining lists or flags.
## Structure
Visible label and verified country input are required; search or enhanced Popover is optional.
## Required Elements
Use native Select as baseline, localized country names, stable option values, and current selection.
## Optional Elements
Flags may supplement text; search is only for long lists with complete accessibility.
## Supported Variants
Native Select, enhanced justified list, single-option summary, and unavailable state are supported.
## Component-Specific Rules
Country Selector must preserve semantic option values and explicit choice. It must not infer nationality, use flag-only labels, invent countries, promise shipping/tax/duties, or auto-submit without clear reversible design.
## Supported States
Current, loading, submitting, single-option, unavailable, and error state are accurate.
## Responsive Behaviour
Long localized names, non-Latin scripts, RTL, zoom, and touch targets remain usable.
## Accessibility
Use semantic HTML, label, native Select where appropriate, keyboard operation, visible focus, WCAG 2.2 AA contrast, and no flag-only or color-only meaning.
## Shopify Settings
Merchants may configure visibility and approved label; option list, codes, filtering, route, and semantics are system controlled.
## Design Tokens
Use country-selector-gap, country-selector-label, country-selector-control, and country-selector-focus tokens.
## Motion Rules
No waving flags or automatic opening; restrained real loading respects reduced-motion preferences.
## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.
Use Shopify data, minimal JavaScript, progressive enhancement, no country database/geolocation, efficient long-list behavior, and no duplicate fetching.
## AI Guidelines
AI should use only Shopify options, deterministic native-first presentation, translated labels, and no inferred residence.

AI must not add countries, infer location, force a market, convert currency, or replace Shopify localization form ownership.
## Quality Checklist
- Options are verified and labels are understandable without flags.
- Country does not imply tax or shipping claim.
## Future Compatibility
Enhanced search requires full combobox accessibility and verified Shopify source; it must not replace native baseline.
