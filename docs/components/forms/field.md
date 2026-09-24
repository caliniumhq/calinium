# Field

## Purpose

The Field component establishes the complete, understandable relationship between one visible label, one form control, optional guidance, and validation feedback.

It gives customers a calm, premium, consistent way to understand what information is requested before they interact with a control.

The Field should clarify input—not decorate it.

---

## Responsibilities

The Field component is responsible for:

- associating a visible label with one control
- communicating whether an input is required when that requirement is real
- placing helper text and validation feedback in a predictable order
- preserving a stable accessible name and description
- maintaining consistent spacing around a control

The Field component is not responsible for:

- defining the control's input behavior
- validating customer data
- replacing a semantic `fieldset` and `legend`
- submitting a form
- generating merchant requirements or legal language

---

## User Goals

The Field component should help customers:

- understand what information is requested
- identify required information before submission
- find guidance without searching the page
- correct a real validation issue confidently
- complete Shopify forms with minimal friction

---

## Merchant Goals

The Field component should help merchants:

- present contact, newsletter, account, address, cart-note, and localization controls consistently
- provide accurate labels and guidance
- show only fields required by the relevant Shopify form
- avoid one-off styling or duplicate accessibility decisions

Merchants should define content and visibility—not interaction mechanics.

---

## Structure

A Field consists of:

- Label — required
- Control — required

Optional:

- Required indicator
- Helper Text
- Validation Message
- Input prefix or suffix supplied by a dedicated control primitive

The label, helper text, and validation message must reference the same control through stable, unique IDs.

---

## Required Elements

Every Field requires:

- a visible label
- exactly one primary control
- a programmatic label relationship
- a stable control ID
- sufficient surrounding space for reading and touch interaction

Placeholder text must supplement—not replace—the visible label.

---

## Optional Elements

A Field may include:

- concise helper text
- a required indicator when the underlying form requires completion
- validation feedback after an actual validation result
- a short contextual prefix or suffix

Optional elements should clarify the control without increasing visual noise.

---

## Supported Variants

### Standard

Label above one control.

Recommended for the majority of storefront forms.

---

### Compact

Uses reduced vertical spacing while preserving the same label relationship.

Suitable for a short cart note or compact localization control.

---

### Inline

Places the label and control beside each other only when the relationship remains clear at narrow widths.

Suitable for simple, short controls. It should not be used for long labels or error-prone input.

---

## Component-Specific Rules

A Field must:

- keep the label visible in every state
- connect helper text and validation feedback through `aria-describedby` only when those elements are present
- communicate required status in text or a clearly explained indicator
- use a `fieldset` and `legend` instead when a set of related controls forms one question
- preserve the control's native semantics

A Field must not:

- contain multiple unrelated controls
- use helper text as validation feedback
- hide a label inside a placeholder
- infer a customer requirement from a design preference
- duplicate form submission or server feedback behavior

---

## Supported States

### Default

The field is ready for entry with label and optional guidance visible.

---

### Focus

The control receives the Design System focus indicator without moving surrounding content.

---

### Filled

Entered content remains legible and the label remains visible.

---

### Invalid

A real validation result is shown through the Validation Message component. The field communicates its invalid state programmatically and visually.

---

### Disabled

The control is unavailable for a real product or form reason. The reason should be communicated when it is not apparent.

---

## Responsive Behaviour

Fields should:

- remain single-column by default on small screens
- preserve labels above controls when width is constrained
- keep controls touch friendly
- avoid horizontal scrolling and clipped validation messages
- allow inline variants to stack before their relationship becomes unclear

Whitespace should remain generous enough to separate adjacent fields.

---

## Accessibility

Every Field must support:

- semantic HTML labels and controls
- keyboard operation through the native control
- visible focus states
- WCAG 2.2 AA contrast
- unique IDs
- screen-reader access to required status, helper text, and validation feedback
- touch-friendly control dimensions

The visual order and reading order must remain the same.

---

## Shopify Settings

Merchants may configure:

- label
- helper text
- required state when the Shopify form supports it
- field visibility where the relevant form supports an optional field

The Design System controls:

- spacing
- label and helper typography
- focus styling
- validation styling
- control height
- responsive behavior
- animation timing

---

## Design Tokens

The Field component should use semantic tokens for:

- field spacing
- label typography
- helper text color
- validation color
- control gap
- focus indicator
- minimum control height

No hardcoded spacing, colors, or type scales should define a Field.

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- subtle border or color transition on focus
- brief opacity transition when feedback appears

Avoid:

- animated label movement that obscures meaning
- shaking controls
- delayed error feedback
- decorative animation

Feedback should feel immediate and calm.

---

## Performance Rules

The Field component should:

- render with native HTML
- preserve progressive enhancement when a control has an optional enhanced state
- use minimal JavaScript only when enhancement has a demonstrated purpose
- require no JavaScript for its core relationship
- avoid layout shifts when feedback appears
- reuse existing form primitives and tokens
- keep validation rendering close to the associated control

---

## AI Guidelines

When generating storefronts, AI should:

- reuse Field for one labeled control relationship
- preserve merchant-provided labels, helper text, and real required states
- use semantic HTML and unique IDs
- select native controls before proposing enhancement
- avoid inventing consent language, customer data, or validation requirements
- compose Helper Text and Validation Message rather than duplicating their responsibilities

AI should not create a new field pattern when this primitive satisfies the requirement.

---

## Quality Checklist

### Purpose

- Field contains one primary control relationship.
- The label explains the requested information.

### Design

- Spacing and hierarchy are calm and consistent.
- Optional guidance does not compete with the control.

### Accessibility

- Label and control are programmatically associated.
- Helper and validation relationships are accurate.
- Focus is visible and controls are touch friendly.

### Responsive

- Labels, controls, and feedback remain readable at small widths.
- Inline layouts stack safely.

### AI Compatibility

- Merchant content is preserved.
- No requirement or validation rule was invented.

---

## Future Compatibility

Future field refinements should improve composition, localization, and semantic feedback without creating a separate form system.

Before adding a Field variant, ask:

- Does one control still have one clear label relationship?
- Can the existing spacing or layout variant solve the need?
- Does the change preserve native Shopify form behavior?
- Can AI select it deterministically without merchant-data assumptions?

The Field component should evolve through refinement rather than expansion.
