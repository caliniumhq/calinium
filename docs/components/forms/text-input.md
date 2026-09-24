# Text Input

## Purpose

The Text Input component collects a short, single-line value through a native text-based control.

It supports ordinary storefront input such as a contact name, email address, telephone number, URL, customer address detail, or cart note title when the relevant Shopify form accepts that value.

The Text Input should make entry feel direct—not technical.

---

## Responsibilities

The Text Input component is responsible for:

- collecting one short value
- selecting an appropriate native input type
- exposing native autocomplete where it is meaningful
- preserving entered values during validation feedback
- working inside a Field component

The Text Input component is not responsible for:

- providing its visible label
- collecting long-form content
- selecting product variants
- collecting passwords
- defining Shopify form submission
- inventing customer information requirements

---

## User Goals

The Text Input component should help customers:

- enter information quickly
- understand the expected value
- use browser and device autofill where available
- correct input without losing prior work
- complete checkout-adjacent storefront forms confidently

---

## Merchant Goals

The Text Input component should help merchants:

- collect only necessary information through Shopify-native forms
- provide accurate labels, placeholders, and helper text
- preserve a premium, consistent form experience
- avoid custom input behavior that creates support burden

---

## Structure

A Text Input consists of:

- Native single-line input — required

Optional:

- Input type
- Autocomplete attribute
- Placeholder
- Prefix or suffix
- Character limit when backed by a real form constraint

The enclosing Field owns the visible label and feedback relationship.

---

## Required Elements

Every Text Input requires:

- a native input element
- an appropriate `type` value
- a stable ID supplied by Field
- an accessible name supplied by Field
- a sensible input mode when it improves mobile entry

Use `email`, `tel`, `url`, or `text` only when they match the actual value requested.

---

## Optional Elements

A Text Input may include:

- a placeholder that illustrates format
- autocomplete support
- an input prefix or suffix that clarifies a non-editable context
- a maximum length only when the receiving Shopify form enforces it
- browser spellcheck controls when appropriate for the field purpose

Optional details should improve accuracy without hiding the label.

---

## Supported Variants

### Standard Text

For short names, labels, and other ordinary text values.

---

### Email

For newsletter, contact, and customer email entry.

Should use email autocomplete and native email validation where applicable.

---

### Telephone

For a real optional or required telephone value.

Should use a telephone input mode without imposing a regional format unless Shopify provides one.

---

### URL

For a real website or reference URL when a storefront form accepts it.

---

### Compact

For concise contexts such as a single newsletter field. It preserves the same height, focus, and label requirements.

---

## Component-Specific Rules

A Text Input must:

- use a visible label supplied by Field
- use native browser semantics before adding enhancement
- preserve the customer's entered value after a validation error
- use placeholder text only as supplemental format guidance
- use `autocomplete` values only when accurate for the requested data

A Text Input must not:

- replace a visible label with a placeholder
- mask a password or act as an account-authentication control
- become a product option picker
- add arbitrary formatting that prevents ordinary text entry
- imply that a value is required when the relevant Shopify form does not require it

---

## Supported States

### Default

The input is empty or populated and ready for entry.

---

### Focus

The input has a visible focus indicator and no decorative movement.

---

### Filled

Customer-entered content remains readable.

---

### Invalid

The input reflects an actual validation result from its Field and Validation Message.

---

### Disabled

The input is unavailable for a real form reason and remains distinguishable.

---

## Responsive Behaviour

Text Inputs should:

- use the available inline width without overflowing
- maintain a touch-friendly minimum height
- support mobile keyboard types that match the input type
- keep prefixes and suffixes from obscuring entered content
- remain comfortable at 320 px and above

---

## Accessibility

Every Text Input must support:

- native input semantics
- semantic HTML
- an associated visible label
- keyboard entry and navigation
- visible focus styling
- WCAG 2.2 AA contrast
- accurate autocomplete where used
- validation feedback announced through the enclosing Field relationship

The input type must communicate the actual expected value.

---

## Shopify Settings

Merchants may configure:

- label
- placeholder text
- helper text
- required state where the Shopify form supports it
- visibility where the relevant storefront form allows it

The Design System controls:

- input height
- spacing
- typography
- border and focus treatment
- validation styling
- breakpoints
- motion timing

---

## Design Tokens

The Text Input component should use semantic tokens for:

- control height
- input padding
- input typography
- input foreground and surface colors
- border color
- focus indicator
- disabled appearance
- field spacing

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- brief border-color transition
- brief focus-surface transition

Avoid:

- animated placeholder replacement
- animated cursor effects
- scaling or bouncing
- delayed typing feedback

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Text Input component should:

- use native browser behavior
- preserve progressive enhancement as an optional layer over native entry
- use minimal JavaScript only for a demonstrated enhancement
- avoid JavaScript for ordinary entry
- avoid live formatting unless a demonstrated Shopify requirement needs it
- avoid layout shifts during validation
- reuse one control primitive across approved contexts

---

## AI Guidelines

When generating storefronts, AI should:

- choose Text Input only for short, single-line values
- apply the documented control choice deterministically from approved form requirements
- select an accurate native type and autocomplete value
- compose it inside Field rather than duplicating labels or feedback
- preserve merchant labels and real Shopify requirements
- prefer native browser behavior
- avoid inventing customer fields, placeholders, or constraints

AI should not use this component for search, passwords, variants, quantities, or file uploads.

---

## Quality Checklist

### Purpose

- The requested value is short and single-line.
- The native type matches the value.

### Design

- The input is quiet, legible, and consistently spaced.
- Placeholder text is supplemental.

### Accessibility

- A visible label is associated with the input.
- Focus, validation, and disabled states are clear.

### Responsive

- The input remains touch friendly and does not overflow.
- Mobile keyboard behavior is appropriate.

### AI Compatibility

- Existing Field and validation primitives are reused.
- No customer data requirement was invented.

---

## Future Compatibility

Future Text Input refinements should improve native autocomplete, localization, and accurate validation without adding presentation-only input types.

Before adding a variant, ask:

- Is the value genuinely single-line?
- Can a native input type already solve the need?
- Does the variant preserve the Field relationship?
- Is there a demonstrated Shopify storefront requirement?

The Text Input component should remain a simple, reusable native control.
