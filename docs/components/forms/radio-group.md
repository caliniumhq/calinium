# Radio Group

## Purpose

The Radio Group component lets customers choose exactly one value from a small, related set of mutually exclusive options.

It keeps the available choices visible when comparison is more useful than placing them inside a Select, with the restrained hierarchy expected in a premium storefront.

The Radio Group should make one clear choice easy—not recreate product-option selection.

---

## Responsibilities

The Radio Group component is responsible for:

- presenting a related exclusive choice set
- communicating the group question through a legend
- communicating the current selected value
- supporting native keyboard selection
- preserving the submitted Shopify value

The Radio Group component is not responsible for:

- selecting product variants
- rendering color or image swatches
- managing collection filters
- providing unrelated form layout
- generating option data or merchant rules

---

## User Goals

The Radio Group component should help customers:

- understand one question and all available answers
- compare a small set of choices quickly
- identify the selected answer
- change the choice using keyboard or touch
- avoid contradictory selections

---

## Merchant Goals

The Radio Group component should help merchants:

- present real, concise option text
- expose mutually exclusive preferences when Shopify forms support them
- avoid custom selection mechanics
- maintain consistent spacing and accessibility

Merchants should define actual option labels—not their interaction behavior.

---

## Structure

A Radio Group consists of:

- Fieldset — required
- Legend — required
- Native radio inputs — required
- Visible option labels — required

Optional:

- Helper Text for the group
- Validation Message for the group
- Short option descriptions

The Fieldset and Legend own the group question. Form Group may organize its placement beside related fields.

---

## Required Elements

Every Radio Group requires:

- a semantic fieldset
- a concise legend
- two or more radio options sharing one name
- visible labels for every option
- one clear selected state when a selection exists

The group should present only choices that are genuinely mutually exclusive.

---

## Optional Elements

A Radio Group may include:

- short helper text
- concise option descriptions
- real required state
- group-level validation feedback
- compact or stacked layout

Optional content should improve understanding without turning each choice into a card system.

---

## Supported Variants

### Stacked

Options appear vertically with generous reading space.

Recommended when labels or descriptions may wrap.

---

### Inline

Options appear in one row when choices are short and the layout remains clear at all supported widths.

---

### Descriptive

Each option includes concise supporting text.

Suitable only when the descriptions help customers make a real comparison.

---

## Component-Specific Rules

A Radio Group must:

- use native radio inputs with one shared name
- include a semantic fieldset and visible legend
- keep every option label visible
- communicate selected state without relying only on color
- use one group-level validation message when the group has a real validation result

A Radio Group must not:

- duplicate product variant selection documented by Variant Picker
- become a swatch, visual product selector, or collection filter UI
- contain unrelated questions
- allow multiple values to be selected
- invent option labels, defaults, or merchant policies

Use Select when the option list is long or when keeping every value visible is not useful.

---

## Supported States

### Default

No option is selected when the form permits an unselected state.

---

### Selected

One option is clearly selected.

---

### Focus

The focused option has a visible focus indicator distinct from its selected state.

---

### Invalid

The group shows an actual validation result when a selection is truly required.

---

### Disabled

Unavailable options remain distinguishable and their reason is communicated where needed.

---

## Responsive Behaviour

Radio Groups should:

- default to stacked options on narrow screens
- allow inline layout only while labels remain readable
- preserve touch-friendly option targets
- keep legend, helper text, and validation feedback above or below the full set
- avoid horizontal scrolling

The group should never split its question from its options.

---

## Accessibility

Every Radio Group must support:

- native fieldset, legend, and radio semantics
- semantic HTML
- visible labels for every option
- arrow-key navigation supplied by the browser
- keyboard selection with Space
- visible focus styling
- WCAG 2.2 AA contrast
- selection communicated without color alone
- screen-reader access to group helper and validation text

The legend must remain visible; it is not a placeholder for the first option label.

---

## Shopify Settings

Merchants may configure:

- group legend
- option text from accurate Shopify or merchant data
- optional short descriptions
- helper text
- required state where the Shopify form supports it
- stacked or inline preference where appropriate

The Design System controls:

- radio size
- spacing
- typography
- selected and focus styling
- validation styling
- responsive stacking
- motion timing

---

## Design Tokens

The Radio Group component should use semantic tokens for:

- group gap
- option gap
- radio size
- legend typography
- option typography
- selected color
- focus indicator
- disabled appearance
- validation color

---

## Motion Rules

Motion should remain minimal.

Allowed motion:

- subtle border or color transition on selection

Avoid:

- animated selection travel
- bouncing
- scaling
- delayed state changes

Selection should feel immediate and stable.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Radio Group component should:

- use native radio behavior
- preserve progressive enhancement as an optional layer over native selection
- use minimal JavaScript only for a demonstrated enhancement
- require no JavaScript for core selection
- avoid duplicate listeners
- preserve server-rendered selected values
- avoid shifting the option layout during selection

---

## AI Guidelines

When generating storefronts, AI should:

- use Radio Group only for a small, real exclusive choice set
- preserve real option labels, values, and default state
- use semantic fieldset and legend markup
- select Select when a longer list is more appropriate
- compose helper and validation feedback through existing primitives
- avoid inventing choices, default selections, or customer requirements

AI should not use this component for product variants, swatches, or filters.

---

## Quality Checklist

### Purpose

- The choices answer one clear question.
- Exactly one value can be selected.

### Design

- The legend establishes clear hierarchy.
- Options remain calm and easy to compare.

### Accessibility

- Fieldset, legend, radio semantics, keyboard behavior, and visible focus are present.
- State does not rely only on color.

### Responsive

- Inline options stack before they become crowded.
- Every option remains touch friendly.

### AI Compatibility

- Existing Variant Picker and Filters responsibilities are preserved.
- No merchant choices were invented.

---

## Future Compatibility

Future Radio Group refinements should improve descriptive option composition and localization without adding product-variant or visual-swatch behavior.

Before adding a variant, ask:

- Is the choice set small and mutually exclusive?
- Does a native Radio Group remain clearer than Select?
- Are all labels and values accurate merchant or Shopify data?
- Can the selection be generated deterministically?

The Radio Group component should remain a focused, semantic choice primitive.
