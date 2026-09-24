# Address Form
## Purpose
Address Form composes Shopify-native address fields and actions for create or edit context.
## Responsibilities
It owns supported field composition, verified initial values, submit/cancel, server errors, and address-mode presentation.
## User Goals
Customers can create or edit an address without losing valid input after recoverable errors.
## Merchant Goals
Merchants rely on Shopify country and province behavior without custom address rules.
## Structure
Supported Shopify address fields and submit action are required; cancel, default control, and delete in supported edit mode are optional.
## Required Elements
Use Field, Text Input, Select, Checkbox, Form Group, Validation Message, native autocomplete, labels, and Shopify form target.
## Optional Elements
Company, phone, default, province, and delete appear only when Shopify context supports them.
## Supported Variants
Create and edit modes are supported.
## Component-Specific Rules
Address Form must preserve valid input, use Shopify country/province logic, and wait for confirmation before success. It must not guess field structure, force optional data, use placeholder-only labels, or invent validation.
## Supported States
Default, submitting, server error, confirmed success, unavailable, and supported delete state are accurate.
## Responsive Behaviour
Fields stack before crowding and preserve labels, errors, touch targets, and input order.
## Accessibility
Use semantic HTML, labels, autocomplete, keyboard controls, WCAG 2.2 AA contrast, field-error relationships, and safe focus after real submission result.
## Shopify Settings
Merchants may configure approved heading and supported visibility; input behavior, autocomplete, validation, and country logic are system controlled.
## Design Tokens
Use address-form-gap, address-form-section, address-form-error, and address-form-focus tokens.
## Motion Rules
Only restrained real feedback is allowed; reduced-motion preferences are respected.
## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.
Use Shopify form submission, minimal JavaScript, progressive enhancement, no polling, event-driven country updates, and cleanup on rerender.
## AI Guidelines
AI should reuse forms primitives, preserve verified input, select deterministic create/edit mode, and never invent address rules or success.
## Quality Checklist
- Labels, autocomplete, country logic, and errors are correct.
- Customer input survives recoverable errors.
## Future Compatibility
New address capability needs verified Shopify support, localization, privacy, and form-validation review.
