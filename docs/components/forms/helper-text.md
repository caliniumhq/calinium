# Helper Text

## Purpose

The Helper Text component provides concise, non-critical guidance that helps customers understand how to complete a nearby field or control.

It supports clarity before a customer makes an error.

Helper Text should reassure and orient—not carry essential instructions or validation feedback.

---

## Responsibilities

The Helper Text component is responsible for:

- explaining an input's expected format or purpose
- providing brief, calm guidance before submission
- remaining associated with the relevant field or group
- preserving reading hierarchy beneath the primary label

The Helper Text component is not responsible for:

- replacing a visible label
- communicating errors or success
- presenting legal, consent, or policy content unless merchant-provided and appropriate to the surrounding component
- creating form requirements
- replacing longer instructional content elsewhere on the page

---

## User Goals

The Helper Text component should help customers:

- understand what a control expects
- complete unfamiliar Shopify form fields confidently
- avoid avoidable formatting errors
- find guidance without leaving the task

---

## Merchant Goals

The Helper Text component should help merchants:

- clarify genuine form requirements
- improve completion without adding visual clutter
- localize field guidance accurately
- preserve a consistent, premium hierarchy

Merchants should supply only guidance that is accurate for the real form.

---

## Structure

Helper Text consists of:

- Short text content — required

Optional:

- Inline link to a real supporting destination
- Contextual icon when it adds meaning beyond the text

Helper Text is composed by Field or Radio Group. It does not own a control.

---

## Required Elements

Every Helper Text component requires:

- concise, factual text
- a clear association with one nearby field or group
- subordinate visual hierarchy to the label and control
- readable contrast

Guidance must be understandable without relying on an icon or color alone.

---

## Optional Elements

Helper Text may include:

- one real supporting link
- short format guidance
- a concise explanation of an optional field
- an icon that reinforces, but does not replace, the text

Optional content should remain brief enough that customers can scan the form.

---

## Supported Variants

### Standard

Short guidance below a label or control.

---

### Inline

Brief supporting text beside a short control when reading order remains clear.

---

### Linked

Guidance containing one real, clearly labelled supporting link.

The link should not interrupt entry or open unnecessary overlays.

---

## Component-Specific Rules

Helper Text must:

- remain non-critical
- be associated with its control or group through the enclosing primitive when needed
- use concise, factual language
- remain visible before and after input
- preserve merchant-approved content exactly

Helper Text must not:

- replace a visible label
- communicate validation errors
- imply a requirement that the form does not enforce
- contain invented privacy, consent, delivery, or legal claims
- become a multi-paragraph instructional section

Use Validation Message whenever feedback depends on a real validation result.

---

## Supported States

### Default

Guidance is visible and subordinate to the field label.

---

### Linked

An optional supporting link has visible hover and focus treatment.

---

### Suppressed

Helper text may be omitted when it adds no useful guidance. It should not be hidden merely to make room for an error.

---

## Responsive Behaviour

Helper Text should:

- wrap naturally below the associated control
- preserve a readable line length
- keep linked text touch friendly
- avoid horizontal overflow
- remain close enough to its field that the relationship is obvious

---

## Accessibility

Every Helper Text component must support:

- readable text at WCAG 2.2 AA contrast
- semantic HTML
- a programmatic field relationship where the guidance is needed to understand entry
- keyboard access to any interactive content
- visible focus for any link
- semantic links for real destinations
- screen-reader reading order that follows the label and control

Do not use helper text as the sole location of a required instruction.

---

## Shopify Settings

Merchants may configure:

- helper text
- optional supporting link label and destination
- field visibility where relevant

The Design System controls:

- helper typography
- spacing
- color treatment
- link styling
- responsive behavior
- motion timing

---

## Design Tokens

The Helper Text component should use semantic tokens for:

- helper typography
- muted foreground color
- field-to-helper gap
- link color
- focus indicator
- maximum readable line width

---

## Motion Rules

Motion should remain minimal.

Allowed motion:

- subtle link-color transition
- brief opacity transition when helper text is conditionally introduced

Avoid:

- motion that draws attention away from entry
- typewriter effects
- decorative icons in motion
- delayed visibility

---

## Performance Rules

The Helper Text component should:

- render as lightweight text
- preserve progressive enhancement as an optional layer over readable native content
- use minimal JavaScript only for a demonstrated enhancement
- require no JavaScript
- avoid changing the form layout after entry begins
- reuse Field and group relationships
- avoid unnecessary icons or remote content

---

## AI Guidelines

When generating storefronts, AI should:

- add Helper Text only when it reduces genuine uncertainty
- preserve merchant-provided guidance and links
- keep text concise, factual, and localized through the existing content system
- associate guidance with one documented control or group
- use Validation Message for errors instead
- avoid inventing merchant claims, legal language, or entry requirements

AI should omit Helper Text when the label and control are already self-explanatory.

AI must not use Helper Text as a visible label, validation result, legal consent, invented requirement, or substitute for a documented Field or Validation Message.

---

## Quality Checklist

### Purpose

- Helper Text explains non-critical guidance.
- It is associated with one nearby control or group.

### Design

- The text remains subordinate to the label.
- It adds clarity without visual noise.

### Accessibility

- Contrast and reading order are sufficient.
- Any link has an accessible name and visible focus.

### Responsive

- Text wraps without crowding the control.
- Linked guidance remains touch friendly.

### AI Compatibility

- Guidance is factual and merchant-approved.
- Validation responsibilities are not duplicated.

---

## Future Compatibility

Future Helper Text refinements should improve localization and field association without expanding into a general instruction system.

Before adding a variant, ask:

- Does the text reduce a real uncertainty?
- Can the label express the information more directly?
- Is the content non-critical and accurate?
- Can the relationship remain deterministic for AI generation?

The Helper Text component should remain concise, quiet, and supportive.
