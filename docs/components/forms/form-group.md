# Form Group

## Purpose

The Form Group component organizes related fields into a calm, readable unit without becoming a complete form system.

It helps customers understand which inputs belong together while preserving the responsibilities of Field, Radio Group, Helper Text, and Validation Message.

The Form Group should create hierarchy—not add a visual container by default.

---

## Responsibilities

The Form Group component is responsible for:

- arranging related fields with consistent spacing
- providing an optional group heading and supporting description
- preserving logical reading and tab order
- creating a responsive layout boundary
- making long Shopify forms easier to scan

The Form Group component is not responsible for:

- submitting a form
- replacing semantic fieldset and legend for one grouped question
- defining individual labels or validation
- creating card-like decoration by default
- combining unrelated inputs for visual convenience

---

## User Goals

The Form Group component should help customers:

- understand which inputs belong together
- complete longer forms in a logical sequence
- scan contact, address, and account fields without fatigue
- find associated guidance and validation feedback

---

## Merchant Goals

The Form Group component should help merchants:

- organize Shopify-native form fields consistently
- choose clear group headings and descriptions
- present only relevant customer fields
- retain a premium, spacious layout without custom grids

Merchants should define accurate group content—not layout mechanics.

---

## Structure

A Form Group consists of:

- Related Field, Radio Group, or Checkbox components — required

Optional:

- Group heading
- Group description
- Divider
- Responsive column arrangement

Use a semantic fieldset and legend instead when the controls together answer one question. Form Group is a layout primitive, not a replacement for that semantic relationship.

---

## Required Elements

Every Form Group requires:

- a clear relationship between its child controls
- logical visual and DOM order
- consistent group spacing
- a responsive layout that preserves field labels and feedback

A heading is required when the relationship is not already clear from the surrounding page structure.

---

## Optional Elements

A Form Group may include:

- concise heading
- short description
- divider between distinct groups
- two-column layout for compatible short fields
- group-level validation summary when the actual form requires it

Optional elements should improve hierarchy without turning the group into a panel by default.

---

## Supported Variants

### Stack

Fields appear in one vertical sequence.

Recommended default for calm, accessible storefront forms.

---

### Split

Two compatible short fields appear beside each other on wider screens and stack on narrow screens.

Suitable for real paired values such as first and last name when the Shopify form requires both.

---

### Sectioned

Adds a heading, description, or divider to distinguish a meaningful form section.

Suitable for customer addresses or account-related form areas.

---

## Component-Specific Rules

A Form Group must:

- group controls that share a clear task or subject
- preserve child component responsibilities
- keep DOM order aligned with visual order
- stack before columns become crowded
- use a fieldset and legend for a related single question

A Form Group must not:

- replace the native `form` element
- add labels, helper text, or validation messages on behalf of child fields
- use card decoration merely to create separation
- group unrelated fields to reduce page height
- invent address, account, contact, or cart requirements

---

## Supported States

### Default

Related fields are visible in their intended order.

---

### With Description

A concise group description explains a real section of the form.

---

### With Validation

One or more child fields have actual validation feedback. The group remains structurally stable.

---

### Disabled

Child controls may be unavailable for a real reason. The group itself should not obscure that reason.

---

## Responsive Behaviour

Form Groups should:

- default to a vertical stack on small screens
- use split layouts only when both labels, controls, and feedback remain readable
- preserve touch-friendly field spacing
- keep child validation messages with their associated controls
- avoid horizontal scrolling and visual reordering

Generous whitespace should make grouped fields easier to scan, not make forms feel sparse without purpose.

---

## Accessibility

Every Form Group must support:

- logical semantic and keyboard order
- semantic HTML
- headings that preserve page hierarchy
- native fieldset and legend semantics when required
- visible focus states supplied by child controls
- WCAG 2.2 AA contrast
- screen-reader reading order that matches the visible group
- no duplicate IDs or repeated group labels

Group descriptions must not replace individual field labels.

---

## Shopify Settings

Merchants may configure:

- group heading
- group description
- field visibility where the relevant Shopify form supports it
- approved split layout preference where compatible fields exist
- optional divider visibility

The Design System controls:

- group spacing
- column gap
- heading and description typography
- divider styling
- focus and validation styling through child components
- breakpoints
- motion timing

---

## Design Tokens

The Form Group component should use semantic tokens for:

- group spacing
- field gap
- column gap
- heading typography
- description color
- divider color
- responsive breakpoint

Form Group should inherit control tokens from its child primitives.

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- subtle opacity transition when an optional group becomes relevant through a real customer choice
- brief divider-color transition

Avoid:

- animated reordering
- expanding panels that displace focused controls
- decorative card transitions
- automatic movement unrelated to customer intent

---

## Performance Rules

The Form Group component should:

- use lightweight semantic markup
- preserve progressive enhancement as an optional layer over the logical native layout
- use minimal JavaScript only for a demonstrated enhancement
- require no JavaScript for layout or reading order
- use CSS layout primitives for responsive stacking
- avoid nested wrappers without structural value
- keep child control behavior independent

---

## AI Guidelines

When generating storefronts, AI should:

- group only controls with a clear shared task
- reuse Field, Radio Group, Checkbox, Helper Text, and Validation Message rather than duplicating their roles
- preserve Shopify form order and real field visibility
- choose Stack as the safe default
- use Split only for compatible, short fields
- avoid inventing customer data requirements or form sections

AI should not use Form Group as a substitute for a semantic form, fieldset, or page layout system.

---

## Quality Checklist

### Purpose

- Child controls share one clear task or subject.
- The group does not replace a semantic fieldset when one is needed.

### Design

- Spacing and hierarchy are restrained and intentional.
- Decoration is absent unless it communicates a real boundary.

### Accessibility

- DOM, visual, focus, and reading order agree.
- Individual labels and validation remain owned by child components.

### Responsive

- Split layouts stack before controls become crowded.
- Feedback remains attached to its field.

### AI Compatibility

- Existing primitives are composed rather than copied.
- No field, group, or requirement was invented.

---

## Future Compatibility

Future Form Group refinements should improve composition for demonstrated Shopify forms without becoming a page-specific form framework.

Before adding a variant, ask:

- Do the child controls share a meaningful task?
- Can Stack, Split, or Sectioned already solve the layout?
- Does the group preserve native field semantics?
- Can AI compose it deterministically from approved form data?

The Form Group component should remain a quiet organizational primitive.
