# Textarea

## Purpose

The Textarea component collects customer or merchant-provided multi-line text where a short Text Input would reduce clarity.

It supports focused storefront contexts such as a contact message, customer address instruction, or cart note when the relevant Shopify form accepts longer text while preserving a premium, calm entry experience.

The Textarea should give customers room to explain—not create a writing task.

---

## Responsibilities

The Textarea component is responsible for:

- collecting one multi-line value
- preserving readable entry space
- supporting native keyboard and assistive-technology behavior
- retaining entered content during validation feedback
- working inside a Field component

The Textarea component is not responsible for:

- providing a visible label
- replacing structured address or product-option controls
- collecting rich text or media
- defining a complete contact form
- inventing prompts, legal statements, or required content

---

## User Goals

The Textarea component should help customers:

- provide context in their own words
- review entered text comfortably
- understand whether longer input is optional or required
- correct a real error without losing content

---

## Merchant Goals

The Textarea component should help merchants:

- collect only meaningful longer responses
- use accurate labels and concise guidance
- support Shopify contact forms and cart notes consistently
- avoid custom editors for ordinary plain text

---

## Structure

A Textarea consists of:

- Native multi-line control — required

Optional:

- Placeholder
- Rows hint
- Character limit and count when backed by a real constraint
- Resize behavior within the Design System

The enclosing Field owns the visible label, guidance, and validation relationship.

---

## Required Elements

Every Textarea requires:

- a native `textarea` element
- a stable ID supplied by Field
- an accessible name supplied by Field
- a comfortable default visible height
- readable entered text at all supported widths

The default height should invite a concise response without making the page feel dense.

---

## Optional Elements

A Textarea may include:

- placeholder text that illustrates the kind of response expected
- short helper text
- a character count only when a real character limit exists
- vertical resizing where it does not destabilize the surrounding layout

Optional elements should clarify the request without turning it into a prompt-writing interface.

---

## Supported Variants

### Standard

For concise contact messages, cart notes, and ordinary multi-line input.

---

### Compact

Uses fewer visible rows for a short optional note.

---

### Expanded

Uses more visible rows for a message where customers reasonably need context.

It should be chosen deliberately, not as a default.

---

## Component-Specific Rules

A Textarea must:

- preserve line breaks entered by the customer
- keep a visible label outside the control
- use plain text entry unless a separate documented editor is required
- show a count only when it reflects an enforced limit
- preserve the customer's text after validation feedback

A Textarea must not:

- use placeholder text as the only label
- prefill merchant claims, customer information, or suggested legal text
- silently truncate text
- become a replacement for an accessible rich-text editor
- expand automatically in a way that causes disruptive page movement

---

## Supported States

### Default

The textarea is ready for entry with its label and any helper text visible.

---

### Focus

The textarea receives a visible focus indicator without suppressing its native editing behavior.

---

### Filled

Multiple lines remain readable and preserve the intended line breaks.

---

### Invalid

An actual validation result is displayed by the enclosing Field and Validation Message.

---

### Disabled

The textarea is unavailable for a real reason and remains clearly distinguishable.

---

## Responsive Behaviour

Textareas should:

- occupy the available inline width
- remain readable without horizontal scrolling
- provide a practical minimum height on mobile
- allow vertical resizing only when it remains usable on touch devices
- keep validation messages below the control

The component should remain stable from 320 px upward.

---

## Accessibility

Every Textarea must support:

- native textarea semantics
- semantic HTML
- an associated visible label
- keyboard entry, selection, and navigation
- visible focus styling
- WCAG 2.2 AA contrast
- screen-reader access to helper text and real limits
- validation feedback through the Field relationship

Do not use a contenteditable element for ordinary textarea input.

---

## Shopify Settings

Merchants may configure:

- label
- helper text
- placeholder text
- required state where the Shopify form supports it
- visible row preference where the context supports it
- visibility where the relevant form allows it

The Design System controls:

- spacing
- control height range
- typography
- borders and focus treatment
- validation styling
- breakpoint behavior
- animation timing

---

## Design Tokens

The Textarea component should use semantic tokens for:

- textarea minimum height
- control padding
- text typography
- surface and foreground colors
- border color
- focus indicator
- field gap
- validation color

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- subtle focus border transition
- brief feedback opacity transition

Avoid:

- auto-expanding animation
- animated text insertion
- pulsing error states
- decorative movement

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Textarea component should:

- use native browser editing behavior
- preserve progressive enhancement as an optional layer over native text entry
- use minimal JavaScript only for a demonstrated enhancement
- require no JavaScript for core entry
- avoid expensive live character processing
- avoid layout shifts during feedback
- reuse the Field, Helper Text, and Validation Message primitives

---

## AI Guidelines

When generating storefronts, AI should:

- use Textarea only when a customer reasonably needs multiple lines
- retain merchant-provided labels and real form requirements
- keep prompts concise and factual
- compose it through Field rather than creating custom feedback markup
- prefer native plain-text behavior
- avoid inventing prefilled responses, customer details, or mandatory text

AI should not replace structured Shopify controls with a textarea.

---

## Quality Checklist

### Purpose

- The requested response benefits from multiple lines.
- The field is not used for structured data that has a dedicated control.

### Design

- The visible height feels calm and intentional.
- Guidance remains concise.

### Accessibility

- A visible label and native semantics are present.
- Focus, validation, and any limit are communicated clearly.

### Responsive

- Text does not overflow on small screens.
- Resizing behavior remains safe and useful.

### AI Compatibility

- Merchant content is preserved.
- No response requirement or placeholder copy was fabricated.

---

## Future Compatibility

Future Textarea refinements should improve localization and accurate limits without turning plain storefront input into an editor framework.

Before adding a variant, ask:

- Does the customer need multiple lines?
- Does a native textarea already meet the requirement?
- Is any limit enforced by the destination form?
- Can AI select the variant deterministically?

The Textarea component should remain focused, semantic, and quiet.
