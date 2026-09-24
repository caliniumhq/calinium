# Checkbox

## Purpose

The Checkbox component lets customers make one independent, explicit boolean choice.

It is appropriate when a choice can be selected or cleared without changing other choices, such as an optional cart note preference or a real form preference supported by Shopify, while retaining a premium, quiet presentation.

The Checkbox should communicate one clear choice—not simulate a product option system.

---

## Responsibilities

The Checkbox component is responsible for:

- presenting one independent choice
- communicating checked, unchecked, and disabled states
- supporting native keyboard operation
- associating concise visible text with the control
- preserving the submitted value

The Checkbox component is not responsible for:

- selecting one option from a related group
- selecting product variants
- accepting consent without merchant-provided language
- managing cart or account logic
- replacing a Switch where an immediate setting change is demonstrated and appropriate

---

## User Goals

The Checkbox component should help customers:

- understand what will happen when they select a choice
- select or clear the choice confidently
- identify the current state at a glance
- use the control with keyboard or touch

---

## Merchant Goals

The Checkbox component should help merchants:

- expose real, optional Shopify form choices consistently
- provide concise and accurate choice labels
- preserve customer clarity without custom styling
- avoid adding unsupported preferences or consent claims

---

## Structure

A Checkbox consists of:

- Native checkbox input — required
- Visible label — required

Optional:

- Helper Text
- Validation Message
- Group legend when the checkbox belongs inside a semantic fieldset

Checkbox owns its control and label. Field may provide surrounding composition when the checkbox is a standalone form field.

---

## Required Elements

Every Checkbox requires:

- a native checkbox input
- concise visible label text
- a programmatic label relationship
- clear checked and unchecked states
- touch-friendly hit area

The entire label should activate the control where native HTML permits.

---

## Optional Elements

A Checkbox may include:

- short helper text
- a real required indicator where the destination form supports it
- validation feedback after a real validation result
- a fieldset and legend when part of a related set

Optional content should clarify the individual choice without duplicating legal or policy content.

---

## Supported Variants

### Standard

Native checkbox with label.

Recommended for most independent choices.

---

### Compact

Uses reduced spacing while retaining the same touch target and label relationship.

---

### Descriptive

Adds concise helper text below the label when a real choice needs explanation.

---

## Component-Specific Rules

A Checkbox must:

- represent one independent choice
- use a native checkbox input
- retain visible label text
- make checked status clear without relying only on color
- use a fieldset and legend for a related set of choices

A Checkbox must not:

- act as a product variant or color swatch
- replace Radio Group for exclusive choices
- contain invented consent, terms, or marketing language
- change a Shopify preference before the customer submits or confirms where submission is required
- hide unavailable choices without communicating why

---

## Supported States

### Unchecked

The choice is available and not selected.

---

### Checked

The selected state is visible through more than color alone.

---

### Focus

Keyboard focus is visibly distinct from checked state.

---

### Invalid

The enclosing Field communicates a real validation result where a checkbox is genuinely required.

---

### Disabled

The choice is unavailable for a real reason and remains readable.

---

## Responsive Behaviour

Checkbox controls should:

- preserve a generous combined control-and-label touch area
- align label text beside or below the control without overlap
- wrap long real labels safely
- keep helper and validation text readable at small widths
- avoid horizontal scrolling

---

## Accessibility

Every Checkbox must support:

- native checkbox semantics
- semantic HTML
- visible label text
- keyboard toggling with Space
- visible focus styling
- WCAG 2.2 AA contrast
- checked status communicated without color alone
- screen-reader access to helper and validation text
- touch-friendly activation area

Do not replace a native checkbox with a non-semantic visual control.

---

## Shopify Settings

Merchants may configure:

- choice label
- helper text
- visibility where the relevant Shopify form supports it
- required state only where the underlying form genuinely requires the choice

The Design System controls:

- control size
- spacing
- label typography
- checked and focus styling
- validation styling
- breakpoints
- motion timing

---

## Design Tokens

The Checkbox component should use semantic tokens for:

- checkbox size
- label gap
- label typography
- control border
- checked surface
- focus indicator
- disabled appearance
- field spacing

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- subtle color or border transition on state change

Avoid:

- animated checkmark drawing that delays feedback
- bouncing
- scaling
- pulsing

Selection must feel immediate.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Checkbox component should:

- use native input behavior
- preserve progressive enhancement as an optional layer over native selection
- use minimal JavaScript only for a demonstrated enhancement
- require no JavaScript for selection
- avoid duplicate click handlers
- preserve server-rendered submitted values
- avoid layout shifts between checked states

---

## AI Guidelines

When generating storefronts, AI should:

- use Checkbox only for independent, real choices
- select this primitive deterministically from approved form requirements
- preserve merchant-provided labels and actual form requirements
- use native semantics and a visible label
- reuse Field, Helper Text, and Validation Message where needed
- select Radio Group for exclusive choices
- avoid inventing consent, preferences, or customer data collection

AI should not use Checkbox to duplicate Variant Picker behavior.

---

## Quality Checklist

### Purpose

- The choice is independent of other choices.
- The label explains the real effect of selection.

### Design

- Checked and unchecked states are quiet but clear.
- The label remains the primary explanation.

### Accessibility

- Native semantics, keyboard toggling, and visible focus are present.
- State does not rely only on color.

### Responsive

- The activation area remains touch friendly.
- Long labels wrap without overlap.

### AI Compatibility

- No consent or requirement was fabricated.
- Existing variant controls are not duplicated.

---

## Future Compatibility

Future Checkbox refinements should improve group composition and Shopify form integration without introducing separate product-option behavior.

Before adding a variant, ask:

- Is the choice truly independent?
- Can the Standard or Descriptive variant solve the need?
- Does native checkbox behavior remain sufficient?
- Does the label come from an accurate merchant or Shopify source?

The Checkbox component should remain a clear, trustworthy boolean control.
