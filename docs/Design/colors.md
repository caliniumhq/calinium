# Calinium Color System

## Purpose

The Calinium Color System defines how color is used throughout every Calinium theme.

It is not a collection of colors.

It is a system of semantic roles designed to communicate information, create hierarchy, guide attention, and support human decision-making.

Colors should help customers understand interfaces—not decorate them.

Every color decision should reinforce clarity, trust, accessibility, and conversion.

---

# Design Principles

The color system is built on five core principles.

## Principle 01 — Color Communicates Meaning

Color is a communication tool.

Its purpose is to provide meaning, establish hierarchy, and guide attention.

Color should never exist purely for decoration.

### Implications

- Use color intentionally.
- Avoid decorative accents.
- Preserve consistency.
- Ensure every color has a defined purpose.

---

## Principle 02 — Products Own the Attention

The merchant's products are always the most important visual element.

Interface colors should support product photography rather than compete with it.

### Implications

- Neutral backgrounds.
- Calm surfaces.
- Restrained accents.
- Product imagery remains dominant.

---

## Principle 03 — One Accent Is Stronger Than Many

The more accent colors an interface contains, the less meaningful each becomes.

Every preset should define one primary accent color.

Secondary accents should be rare and purposeful.

### Implications

- One primary accent.
- One semantic success color.
- One semantic warning color.
- One semantic error color.

Avoid rainbow interfaces.

---

## Principle 04 — Contrast Builds Confidence

Readable interfaces reduce cognitive effort.

High contrast improves comprehension, accessibility, and trust.

Accessibility always takes priority over aesthetics.

### Implications

- Meet WCAG 2.2 AA contrast requirements.
- Never sacrifice readability for style.
- Text should remain legible in every preset.

---

## Principle 05 — Semantic Roles Over Hard-Coded Values

Components should never know actual colors.

Components should consume semantic roles.

Themes, presets, and merchants assign values to those roles.

This allows the entire visual identity to change without modifying component implementations.

---

# UX Foundations

The Calinium Color System is informed by established UX principles.

## Hick's Law

Too many colors increase cognitive load.

Reduce unnecessary color variation.

Customers should immediately recognize important actions.

---

## Miller's Law

Color categories should remain limited.

Too many semantic colors become difficult to remember.

Keep the system compact.

---

## Jakob's Law

Use colors in familiar ways.

Examples:

- Red indicates errors.
- Green indicates success.
- Blue or merchant accent indicates interactive elements.

Avoid redefining common expectations.

---

## Gestalt Principle — Similarity

Elements sharing the same semantic purpose should share the same color role.

Consistency helps users recognize patterns more quickly.

---

## Cognitive Load

Color should reduce thinking.

Customers should immediately recognize:

- Primary actions
- Secondary actions
- Warnings
- Success
- Errors

without conscious effort.

---

# Semantic Color Roles

## Background

Primary page background.

Used behind the majority of page content.

---

## Surface

Cards.

Inputs.

Containers.

Secondary sections.

---

## Surface Elevated

Drawers.

Dropdowns.

Modals.

Floating panels.

---

## Surface Inverse

Dark surfaces used inside otherwise light interfaces.

---

## Text Primary

Primary readable text.

Highest contrast.

---

## Text Secondary

Descriptions.

Supporting copy.

Metadata.

---

## Text Muted

Captions.

Labels.

Low-priority information.

---

## Border

Inputs.

Cards.

Dividers.

Separators.

---

## Border Strong

Higher-emphasis separators.

---

## Accent

Primary interactive color.

Used for:

- Primary buttons
- Links
- Selected controls
- Active navigation
- Pagination
- Focus highlights

---

## Accent Hover

Hover state.

---

## Accent Active

Pressed state.

---

## Success

Positive feedback.

Inventory available.

Successful operations.

Confirmation messages.

---

## Warning

Low inventory.

Shipping notices.

Merchant warnings.

Requires attention.

---

## Error

Validation failures.

Unavailable actions.

Critical notices.

---

## Information

Neutral informational messages.

Shipping updates.

Educational content.

General notices.

---

## Disabled

Unavailable controls.

Should remain clearly distinguishable without appearing broken.

---

## Overlay Light

Improves text readability over imagery.

Should remain subtle.

---

## Overlay Dark

Used only when stronger contrast is required.

Should never overpower photography.

---

# Interactive States

Every interactive component supports:

Default

Hover

Pressed

Focused

Disabled

Loading

Selected

Error

Success

States should derive from semantic roles.

Never create component-specific color systems.

---

# Component Rules

Buttons

Primary

- Accent

Secondary

- Surface

Ghost

- Transparent

Text

- Accent

---

Cards

- Surface
- Border
- Text Primary

---

Inputs

- Surface
- Border
- Accent Focus
- Error

---

Navigation

- Background
- Accent Active
- Text Primary

---

Badges

Success

Warning

Error

Information

Each badge consumes the corresponding semantic role.

---

# Accessibility

Color must never be the only method of communication.

Status should also use:

- Icons
- Labels
- Text
- Shape
- Position

Every preset must satisfy WCAG 2.2 AA.

Interactive elements must remain understandable for users with color-vision deficiencies.

---

# Merchant Customization

Merchants customize semantic roles—not components.

Changing Accent automatically updates:

- Buttons
- Links
- Active navigation
- Selected filters
- Pagination
- Interactive controls

without additional configuration.

---

# Presets

Every preset supplies concrete values for the semantic roles.

Examples include:

- Atelier
- Editorial
- Luxury
- Modern
- Technology
- Furniture
- Beauty
- Minimal

Components never change.

Only semantic values change.

---

# Future Compatibility

New semantic roles require clear justification.

Before introducing a new role, ask:

- Can an existing role be reused?
- Does this improve clarity?
- Does this reduce cognitive load?
- Does it support accessibility?
- Does it improve consistency?

If the answer is no, the new role should not be added.

The goal of the Calinium Color System is not flexibility through quantity.

It is flexibility through consistency.