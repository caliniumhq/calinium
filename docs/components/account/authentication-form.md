# Authentication Form
## Purpose
Authentication Form provides reusable Shopify-native structure for login, registration, activation, password recovery, and reset contexts.
## Responsibilities
It owns supported form structure, native fields, autocomplete, server errors, submit, and secondary verified route.
## User Goals
Customers complete one authentication task without losing recoverable input.
## Merchant Goals
Merchants use Shopify authentication workflows without custom credential logic.
## Structure
Heading, Shopify form target, required fields, labels, submit, and server errors are required; secondary route and success context are optional.
## Required Elements
Use Field, Text Input with correct native type, Validation Message, Alert, Button, autocomplete, and verified Shopify action.
## Optional Elements
Name/password confirmation appear only in workflow requiring them.
## Supported Variants
Login, registration, activation, recovery, and reset appear only when supported route exists.
## Component-Specific Rules
Authentication Form must preserve valid input where Shopify permits and wait for Shopify confirmation. It must not store credentials, expose passwords, invent social login/2FA, reveal unrelated account existence, or use placeholder-only labels.
## Supported States
Default, submitting, server error, confirmed success, unavailable, and signed-in redirect are accurate.
## Responsive Behaviour
Fields stack safely with labels, errors, and touch targets intact.
## Accessibility
Use semantic HTML, form labels, autocomplete, keyboard operation, WCAG 2.2 AA contrast, error relationships, and safe focus after submission.
## Shopify Settings
Merchants may configure approved heading/text and real secondary destination; auth logic, password rules, autocomplete, and error behavior are system controlled.
## Design Tokens
Use authentication-form-gap, authentication-form-heading, authentication-form-error, and authentication-form-focus tokens.
## Motion Rules
Only restrained confirmed feedback; reduced-motion preferences are respected.
## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.
Use Shopify forms, minimal JavaScript, progressive enhancement, no credential persistence, no polling, and stable layout.
## AI Guidelines
AI should reuse verified Shopify form workflows and deterministic field sets; it must not invent auth method, password rule, success, or account state.
## Quality Checklist
- Native form action, labels, autocomplete, and server errors are correct.
- No password or sensitive state is exposed.
## Future Compatibility
Any social login, 2FA, security, or backend behavior requires verified Shopify support and security review.
