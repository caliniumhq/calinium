# Select

## Purpose

The Select component lets customers choose one value from a known, mutually exclusive set of options.

It uses a native select control by default so options remain predictable, keyboard accessible, and compatible with Shopify storefront behavior in a premium, quiet interface.

The Select should simplify a bounded choice—not make it feel like navigation.

---

## Responsibilities

The Select component is responsible for:

- presenting one bounded option list
- communicating the current selected value
- supporting native keyboard and screen-reader interaction
- preserving the submitted Shopify value
- working inside a Field component

The Select component is not responsible for:

- selecting product variants
- filtering or sorting collection results
- choosing a market or language when a dedicated localization component is available
- creating option data
- replacing Radio Group when all choices should be visible

---

## User Goals

The Select component should help customers:

- understand the available choices
- identify the current selection
- change a setting with minimal effort
- use familiar native control behavior
- avoid accidental or unavailable choices

---

## Merchant Goals

The Select component should help merchants:

- expose accurate Shopify-provided options
- configure concise option labels
- keep long option lists manageable
- preserve consistent form behavior without custom interaction logic

Merchants should provide real option text—not style controls individually.

---

## Structure

A Select consists of:

- Native select element — required
- Option elements — required

Optional:

- Prompt option
- Option group
- Helper Text
- Validation Message
- Decorative disclosure icon that does not replace native behavior

The enclosing Field owns the visible label and feedback relationship.

---

## Required Elements

Every Select requires:

- a native select control
- one or more meaningful options
- a stable ID supplied by Field
- an accessible name supplied by Field
- a visible selected state

Option labels must communicate actual merchant or Shopify data.

---

## Optional Elements

A Select may include:

- a non-selectable prompt when no initial choice is appropriate
- grouped options when a real hierarchy improves scanning
- concise helper text
- a decorative indicator aligned with the native control

Optional elements should not hide, reorder, or fabricate options.

---

## Supported Variants

### Standard

Native select with one visible selected value.

Recommended for most bounded storefront choices.

---

### Compact

Uses concise spacing for short controls such as a cart note preference or an approved address-related choice.

---

### Grouped

Uses native option groups when Shopify or merchant data has a meaningful hierarchy.

---

### Prompted

Includes an initial prompt only when the customer must make a real choice before continuing.

---

## Component-Specific Rules

A Select must:

- preserve native select semantics by default
- show the selected option clearly
- use option labels that match the submitted values
- keep the option order meaningful and stable
- use a prompt option only when it represents no selection

A Select must not:

- hide the visible label
- imitate a menu with unrelated navigation links
- redefine product-option selection documented by Variant Picker
- replace collection Sort or Filters behavior
- manufacture options that Shopify or the merchant did not provide

Progressive enhancement is permitted only when it preserves native submission, keyboard operation, and a no-JavaScript path.

---

## Supported States

### Default

The current selection is visible and the control is ready to open.

---

### Focus

Keyboard focus is clearly visible.

---

### Open

The browser or approved enhancement presents the available options.

---

### Invalid

The enclosing Field communicates an actual validation result.

---

### Disabled

The control is unavailable for a real reason and remains distinguishable.

---

## Responsive Behaviour

Select controls should:

- use the available inline width without overflow
- preserve readable selected text at small widths
- provide a touch-friendly minimum height
- avoid custom popovers that are less reliable on mobile
- keep helper and validation text below the control

Long option labels should wrap only where the platform allows; the selected value must remain understandable.

---

## Accessibility

Every Select must support:

- native select semantics
- semantic HTML
- an associated visible label
- keyboard and screen-reader operation
- visible focus styling
- WCAG 2.2 AA contrast
- clear selected, disabled, and invalid states
- concise option labels

Do not use a decorative icon as the only indication that a control opens.

---

## Shopify Settings

Merchants may configure:

- label
- prompt text where appropriate
- option text from accurate Shopify or merchant data
- helper text
- required state where the Shopify form supports it
- field visibility where appropriate

The Design System controls:

- spacing
- typography
- control height
- disclosure treatment
- focus styling
- validation styling
- breakpoints
- motion timing

---

## Design Tokens

The Select component should use semantic tokens for:

- select height
- select padding
- typography
- foreground and surface colors
- border color
- disclosure color
- focus indicator
- field gap

---

## Motion Rules

Motion should remain minimal.

Allowed motion:

- subtle focus border transition
- restrained disclosure-color transition

Avoid:

- animated option-list movement that conflicts with native behavior
- decorative rotation
- delayed selection updates
- custom physics

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Select component should:

- prefer the native browser control
- use minimal JavaScript only for a demonstrated progressive enhancement
- avoid JavaScript for standard option selection
- preserve server-rendered option values
- avoid duplicating large option lists in the DOM
- avoid layout shifts after selection

---

## AI Guidelines

When generating storefronts, AI should:

- use Select for one choice from a bounded option set
- retain the real Shopify or merchant option values and order
- select Radio Group instead when all few choices should remain visible
- compose Select inside Field
- preserve native behavior before proposing enhancement
- avoid inventing options, prompts, or required selections

AI should not use Select to duplicate Variant Picker, Sort, Filters, or localization components.

---

## Quality Checklist

### Purpose

- The customer chooses one value from a real bounded set.
- A select is more appropriate than visible radio choices.

### Design

- The selected value is legible and calm.
- Option labels are concise and meaningful.

### Accessibility

- The control retains native semantics and a visible label.
- Focus and invalid states are clear.

### Responsive

- Selected text remains understandable at small widths.
- The native mobile interaction remains available.

### AI Compatibility

- Real option data and order are preserved.
- No options or constraints were invented.

---

## Future Compatibility

Future Select refinements should improve option grouping and localization while preserving native behavior as the baseline.

Before adding a variant, ask:

- Is the option set genuinely bounded?
- Is a visible Radio Group clearer?
- Does native select behavior already meet the need?
- Can the option data be preserved deterministically?

The Select component should remain a dependable, Shopify-native choice control.
