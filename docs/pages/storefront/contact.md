# Contact Page

## Purpose

The Contact Page gives customers one calm, reliable way to contact the merchant. It presents an accessible Shopify contact form and only the business, support, location, opening-hours, map, or social information the merchant has verified.

It does not own customer accounts, a live-chat backend, ticketing systems, checkout, Products, Collections, Blogs, Article content, or any external support platform. Shopify owns form delivery; a verified integration owns any additional support workflow.

## Customer Goals

Customers should be able to:

- Understand whether this is the right route for a general question or support request.
- Find verified contact details, service availability, and location information when the merchant has supplied them.
- Complete a short contact form with clear required fields, validation feedback, and a truthful success or error state.
- Use the page by keyboard, touch, screen reader, zoom, translated text, RTL layout, and reduced motion.
- Continue shopping or return to normal storefront navigation without being trapped in a support flow.

## Merchant Goals

Merchants should be able to:

- Receive ordinary Shopify contact submissions without building a separate service system.
- Present only confirmed contact methods, opening hours, locations, social destinations, and service guidance.
- Keep the form concise and avoid collecting information Shopify does not need for the stated contact purpose.
- Choose a restrained support composition that remains useful when no map, store location, phone number, or social presence exists.
- Preserve approved contact details and support boundaries through deterministic generation.

## Shopify Context

The Contact Page uses the Shopify alternate `page.contact` template. The current `apps/theme/templates/page.contact.json` contains one active `contact-form` section. The global Header, Footer, skip link, `main` landmark, cart drawer, predictive search, localization, and account entry remain global shell responsibilities in `apps/theme/layout/theme.liquid`.

Shopify owns the Page assignment, `page.title`, contact-form submission and delivery, form values, server-side success and error state, routing, localization context, and platform spam protections that it provides. The Contact Page owns the customer-facing hierarchy, information boundaries, minimal form composition, recovery guidance, and safe optional support regions.

### Current implementation evidence

`apps/theme/sections/contact-form.liquid` renders a single H1 from the configured heading, then `page.title`, then a localized fallback. It uses Shopify’s native `{% form 'contact' %}` path with optional name, required email, optional phone controlled by `show_phone`, and required message fields. Visible labels, native email/tel/textarea controls, `autocomplete` attributes, `required`, `aria-invalid`, `aria-describedby`, field errors, an error summary with `role="alert"`, and a submitted-success message with `role="status"` are present.

The current section settings are heading, supporting rich text, phone visibility, and color scheme. Its stylesheet starts as a one-column form and becomes a two-column name/email/phone layout from the desktop breakpoint while the message, summary, required note, and submit action span both columns. It contains no current business-address, opening-hours, map, social-link, service-topic, consent, attachment, custom anti-spam, live-chat, or ticketing region.

The shared metadata path emits canonical, title, optional description, Open Graph, and Twitter metadata from Shopify page context. No ContactPage, Organization, LocalBusiness, or BreadcrumbList JSON-LD is currently emitted. The source does not expose a theme-owned CAPTCHA, honeypot, rate limit, or third-party anti-spam integration; this specification must not claim a protection mechanism beyond verified Shopify behavior.

### Implementation audit

The current implementation is a strong minimal Contact Page: it is server rendered, localized, uses Shopify form handling, preserves submitted values, and has concrete success and error states. It needs future evidence before it can safely support business-information cards, verified hours, map behavior, social links, privacy/consent copy, topic routing, analytics, spam controls, or structured data. Those are gaps to govern, not content to invent.

## Entry Conditions

Valid entry conditions include:

- A verified Header, Footer, policy, or contextual support link.
- A direct visit to a published Shopify Page assigned the `page.contact` template.
- A post-purchase, product, collection, article, or account-context link only when its label accurately describes general contact rather than a guaranteed support workflow.
- A localized or market-aware storefront route resolved by Shopify.
- Theme Editor preview of the assigned Page.

The page must not assume a customer is logged in, has an order, knows a support ticket number, consents to marketing, can call by phone, or is near a physical location. A payment, order, account, or product-specific issue may require a different Shopify-owned or verified support route; the Contact Page must not pretend to resolve it.

## Page Structure

The conceptual structure is:

```text
Global Header
        ↓
Main landmark
        ├── Contact Page H1 and concise orientation
        ├── Contact form and truthful form feedback
        ├── Optional verified business or support information
        └── Optional location, hours, map, or social routes
        ↓
Global Footer
```

The current default structure is smaller: one `contact-form` section within the global main landmark. A compact, form-led destination is the preferred baseline.

## Required Regions

| Required role | Customer outcome | Rule |
| --- | --- | --- |
| Contact Page identity | Understand the destination. | One visible H1 identifies the contact destination. The current `contact-form` owns it. |
| Contact orientation | Know what the form is for. | Concise, merchant-approved supporting text may clarify general use without promising response times or coverage. |
| Contact form | Send a real request. | One Shopify-native contact form has labeled required email and message controls, clear submit action, and preserved server feedback. |
| Form feedback | Understand submission or validation state. | Success, error summary, and field errors use Shopify’s actual response. Loading, success, and failure must never be fabricated. |
| Valid layout | Read and act safely. | Global navigation, main landmark, stable form geometry, and global footer remain available. |

## Optional Regions

| Optional region | Use when | Omit when |
| --- | --- | --- |
| Business information | A verified business name, customer-service address, or legal contact detail materially helps customers. | Details are private, outdated, uncertain, or not appropriate for public contact. |
| Support information | Merchant-approved guidance distinguishes general contact from a real policy, order, accessibility, wholesale, or press route. | It invents service coverage, response times, ticket status, or a backend workflow. |
| Phone or email display | The merchant has approved a monitored public channel. | A public channel is not monitored, cannot serve the stated audience, or duplicates the form without purpose. |
| Store location and opening hours | A verified customer-facing location and current hours exist. | Hours, accessibility details, holiday changes, or location status are unverified. |
| Map | A verified public location benefits from geographic orientation and has a safe fallback address/link. | It exposes a private address, needs a heavy/unverified embed, or supplies no customer benefit. |
| Social links | Approved, maintained social destinations support a customer need. | Links are dormant, unverified, promotional clutter, or duplicate core contact routes. |
| FAQ or service guidance | Real recurring contact questions can be answered before form submission. | Answers are incomplete, replace required support, or create a second support system. |
| Breadcrumbs | A truthful hierarchy improves return navigation. | It implies a hierarchy that does not exist or duplicates global navigation. |
| Newsletter | A separate, consent-ready subscription purpose exists. | It distracts from service contact or uses the contact form as marketing consent. |
| App Block | A verified Shopify-compatible service capability has a maintenance owner and fails safely. | It adds unsupported chat, ticketing, scheduling, tracking, or customer-data collection. |
| Custom Liquid | A reviewed technical requirement cannot use a native section and has accessibility/performance ownership. | It is an escape hatch for ordinary content, form behavior, or unreviewed third-party code. |

## Section Composition

The Contact Page is form-first and deliberately small:

1. Contact identity and concise orientation.
2. One canonical contact form.
3. Actual success, validation, or error feedback in the form context.
4. Optional verified business/support information.
5. Optional location, map, social, or low-pressure continuation only when useful.

| Classification | Contact Page rule |
| --- | --- |
| Globally required | Header, Footer, skip link, and main landmark remain global. |
| Page-functionally required | One H1, orientation, one native contact form, and real feedback. |
| Recommended | A short support boundary or relevant policy link when it reduces misdirected requests. |
| Optional | Regions listed above, each requiring verified content and a safe omission path. |
| Single-instance | H1, contact form, error summary, success status, primary submit action, and primary contact orientation. |
| Integration-dependent | Map embeds, live chat, scheduling, CRM, help desk, reviews, and app blocks. |
| Prohibited | Duplicate forms, customer-account logic, order lookup, product/collection grids, checkout, fake queue status, invented response time, or opaque custom submission logic. |

Do not place a map, social feed, testimonials, campaign hero, newsletter, or several competing support routes above the form unless an approved contact strategy explicitly requires it. Contact must remain the obvious primary task.

## Component Composition

| Component or family | Contact Page relationship |
| --- | --- |
| Field, Text Input, Textarea, Helper Text, Validation Message, Form Group | Compose the native contact form. Field owns label/control association; Validation Message owns real field feedback. |
| Button | Owns the form submit control. It must not imply a submitted state before Shopify confirms it. |
| Alert, Inline Message, Status Indicator | Communicate real contextual or submission feedback without duplicating the native error summary. |
| Address, map, social, and icon treatments | May present verified optional business data; they do not create a live service backend. |
| Breadcrumbs, Text Link, Footer | Provide real navigation without replacing the form. |
| Responsive Image, Video, Rich Text, FAQ, Newsletter | Support optional content only when it remains subordinate to the contact task. |

Components own local interaction and semantics. Shopify owns delivery and form response. The Contact Page owns one clear customer route and the decision to omit unsupported support capabilities.

## Content Rules

All contact information must be merchant-approved, public, current, and appropriate for the customer audience.

- Do not invent phone numbers, email addresses, physical locations, opening hours, response times, service-level commitments, support coverage, staffing, languages, social handles, escalation routes, or availability.
- Do not ask for passwords, card details, full payment data, unnecessary account data, or sensitive information through the general contact form.
- Do not present marketing consent as required for sending a contact request. Legal/privacy language needs merchant and legal approval; it must not be generated from a generic template.
- Explain where the form is unsuitable only when a real alternate route exists, such as an approved returns policy or accessibility contact channel.
- Map pins, addresses, hours, and social links must match the visible source. Do not use stock location imagery or location claims.
- Keep form labels direct and customer-friendly. Placeholder text may help but never replaces a visible label.
- Use calm copy. Avoid urgency, promises of immediate response, blame, technical errors, or wording that treats a customer inquiry as a ticket unless a verified system supports it.

## Supported Variants

| Variant | Select when | Composition |
| --- | --- | --- |
| Form-led | General inquiries are the only verified contact path. | H1, concise orientation, native form, real feedback. |
| Support-guided | Verified policy or service routes help customers choose the appropriate next step. | Form-led baseline plus concise route guidance and truthful links. |
| Location-led | A verified public retail, studio, or service location is important. | Form-led baseline plus address, hours, accessibility details, and optional safe map. |
| Wholesale or press-guided | A distinct approved contact audience and real route exist. | Form-led baseline with concise audience context; no invented qualification or routing. |
| Minimal | The merchant has no approved supplementary information. | H1, form, and essential feedback only. |

Variant selection must be deterministic from merchant goals, verified public contact data, page purpose, and supported integrations. It must not be chosen merely to make the page feel fuller.

## Supported States

| State | Required behavior |
| --- | --- |
| Ready | Labeled form, truthful required markers, and one submit action are available. |
| Validation error | Shopify error summary and affected field feedback are visible; entered safe values remain available for correction. |
| Submitted successfully | A factual success status is shown after Shopify confirms the submission. It must not imply a response time or ticket creation. |
| Submission unavailable or integration failure | Preserve the form or verified fallback where possible; use concise factual feedback only when a real state exists. |
| Optional phone hidden | The form remains valid without phone. |
| Optional business/location/map/social data absent | Omit the associated region cleanly. |
| Theme Editor preview | Show configuration controls and safe section placeholders without presenting sample data as real contact information. |
| Localized, RTL, zoom, or narrow viewport | Preserve field order, labels, errors, and actions without overflow or loss of context. |

## Navigation and Actions

Submitting the contact form is the primary operation. The native form and submit button remain the only canonical submission path. Links may navigate to an approved policy, verified support route, public address/map, social destination, Homepage, or catalog path.

Buttons operate the form, disclosure, or a supported map/app surface; links navigate. Do not use a button that merely opens an email client when a standard link is sufficient, do not nest interactive elements, and do not redirect automatically after an error or successful submission unless Shopify’s verified form behavior requires it.

## Responsive Behaviour

The Contact Page is mobile first at 320 px, 375 px, tablet, desktop, wide desktop, browser zoom, large text, translated copy, and RTL.

- The current form is one column first; its desktop grid must return to logical single-column reading and tab order when constrained.
- Labels, required notes, errors, long business details, opening hours, addresses, and CTA labels wrap without clipping or horizontal scrolling.
- Map and social regions remain optional and must not push the contact form below an excessive visual lead.
- All fields and actions remain touch-friendly, visible, and usable with an on-screen keyboard.
- Source order remains contact task first, then supporting information; CSS must not reorder meaning for screen-reader or keyboard users.

## Accessibility

The Contact Page targets WCAG 2.2 AA:

- One main landmark, one visible H1, visible labels, native form controls, programmatic label relationships, and meaningful required indicators.
- Clear error summary and associated field errors, `aria-invalid` only for actual invalid fields, restrained status announcement after real submission, and no duplicate alerting of the same event.
- Keyboard-accessible controls, visible focus, logical tab order, adequate target sizes, and no focus loss when Shopify rerenders error or success state.
- No color-only required, error, success, or availability communication.
- Accurate alternatives for maps, icons, and social destinations; a map never becomes the only way to obtain an address or opening-hours information.
- Zoom, localization, RTL, reduced motion, contrast, and privacy-sensitive reading requirements remain supported.
- Any embedded app, map, chat, or scheduling surface requires its own keyboard, focus, title, privacy, and failure-path review.

## SEO

Contact SEO describes a genuine public contact destination; it must not manufacture local-business relevance.

- Use one Contact Page H1, accurate Shopify Page title, concise verified meta description, canonical URL, and relevant internal links.
- The shared metadata implementation currently supplies canonical, title, optional description, Open Graph, and Twitter data from Shopify page context. It does not emit a contact-specific robots directive or special social metadata.
- Only publish location, opening-hours, local service, or support claims that the merchant has verified. Do not create doorway pages, keyword-stuffed city lists, duplicate contact routes, false service areas, fake addresses, or unsupported response-time claims.
- Follow the merchant’s verified indexing and privacy policy. Do not add `noindex` merely because the page contains a form, and do not expose customer-submitted content in metadata.

## Structured Data

The Contact Page may own one verified `ContactPage` representation in a future centralized structured-data layer. It may reference an existing authoritative Organization or LocalBusiness entity only when that entity is already verified and globally owned; this page must not emit a competing organization record.

Address, telephone, email, opening-hours, map URL, and social identifiers must be exact verified public facts. Omit uncertain fields. Do not emit Product, Collection, Article, Review, AggregateRating, FAQPage, Event, Offer, or local-business data merely because the page contains a form, FAQ, social link, or map.

The current theme emits no contact-specific JSON-LD. Any future ContactPage or BreadcrumbList output must be singular, match visible content, and be centralized to prevent duplication.

## Shopify Settings

Merchant-configurable settings include the current heading, supporting text, phone visibility, color scheme, Shopify Page title, and only approved optional-section content.

Future merchant settings may expose verified public business information, hours, location, map destination, support-route links, social links, and optional regions only when the corresponding Shopify-native or reviewed integration architecture exists.

The design system controls field spacing, control height, typography, focus styles, contrast, validation hierarchy, breakpoints, status behavior, motion, map fallback, and form semantics. Do not expose arbitrary form fields, raw ARIA attributes, fake status text, anti-spam switches without a real provider, animation speed, or unrestricted layout controls.

## Theme Editor Behaviour

The current `page.contact.json` contains one `contact-form` section. Theme Editor changes may adjust its heading, supporting text, phone visibility, and color scheme, but must preserve the native form’s fields, validation, delivery path, H1 ownership, and customer-submitted value recovery.

Optional sections may be added only when they satisfy this specification’s role rules and do not create a second form or obscure the contact task. Reordering must keep the form early. Section reload, select, deselect, reorder, and setting refresh must not duplicate event listeners, map instances, form submissions, errors, or success announcements.

Custom Liquid and App Blocks require a documented technical owner, privacy review, accessibility review, performance budget, and verified fallback. The Theme Editor is not authorization to add a live-chat backend, ticket system, or arbitrary data collection.

## Performance Rules

- Server-render the H1, form, labels, submit path, and actual Shopify error/success states. The page works without JavaScript.
- Keep the default form lightweight; do not block its first interaction with maps, social embeds, chat, animation, or decorative media.
- Load optional images responsively and lazily below the first viewport. A map uses a static address/link fallback and must not become the LCP by default.
- Avoid duplicate form handlers, polling, client-side spam logic, third-party trackers, and layout shifts from feedback or optional information.
- Preserve stable geometry for errors, required notes, and submit state. Theme Editor lifecycle cleanup applies to any enhancement.

## AI Guidelines

AI should select the smallest contact variant supported by approved merchant goals and verified public contact data. It should preserve Shopify’s native form, use the merchant’s supplied heading and service boundaries, and add optional business/location/social/support regions only when their data, ownership, and fallback are confirmed.

AI must not invent contact methods, office hours, locations, maps, social accounts, response times, privacy language, consent, service coverage, ticket systems, chat availability, anti-spam behavior, form fields, success messages, or support destinations. It must not repurpose customer data for marketing and must preserve deterministic output from the same approved inputs.

## Quality Checklist

- [ ] The page uses one H1 and one canonical Shopify contact form.
- [ ] Email and message requirements, labels, errors, required markers, and status feedback match actual Shopify form state.
- [ ] No contact, location, hours, social, map, support, privacy, or response-time information is invented.
- [ ] Optional regions have verified data, a customer purpose, and a safe omission path.
- [ ] The form remains usable without JavaScript, at 320 px, with zoom, RTL, keyboard, screen reader, and reduced motion.
- [ ] Map/app integrations have a real accessible fallback and do not block form completion.
- [ ] SEO and structured data use only verified public contact facts and have one authoritative owner.
- [ ] Theme Editor changes preserve form behavior, H1 ownership, and lifecycle safety.
- [ ] The page does not duplicate account, live-chat, ticketing, checkout, product, collection, or blog responsibility.

## Future Compatibility

Future refinement may document a verified business-information section, hours and location treatment, map integration, support routing, consent/privacy boundaries, anti-spam provider integration, appointment capability, or ContactPage structured-data implementation after real Shopify or integration evidence exists.

Those refinements must preserve one native contact form, merchant-owned public facts, customer privacy, progressive enhancement, WCAG 2.2 AA, performance-first behavior, and deterministic generation. They must never turn Contact into an unreviewed CRM, chat, ticketing, or data-collection surface.
