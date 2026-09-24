# Calinium Elevation & Shadow System

## Purpose

The Calinium Elevation & Shadow System defines how depth is communicated throughout every Calinium experience.

Shadows are not decorative effects.

They communicate hierarchy, elevation, interaction, and spatial relationships.

A well-designed interface should feel layered without appearing artificial.

Every component should derive its elevation from this system rather than defining custom shadow styles.

---

# Design Principles

## Principle 01 — Depth Communicates Hierarchy

Elevation helps users understand which elements exist above others.

Shadows should clarify relationships between interface layers.

Depth should never exist purely for visual decoration.

---

## Principle 02 — Less Is More

Luxury interfaces rarely rely on dramatic shadows.

Calinium favors subtle depth over visual effects.

When in doubt, reduce the shadow.

---

## Principle 03 — Elevation Should Feel Physical

Objects that appear closer to the user should cast slightly stronger shadows.

Objects resting on the page should appear almost flat.

Shadow intensity should follow a logical spatial model.

---

## Principle 04 — Consistency Builds Trust

Components with similar elevation should always share the same shadow style.

Customers should unconsciously understand the interface without interpreting every element individually.

---

## Principle 05 — Shadows Support Interaction

Shadows help indicate interaction.

Hovering, dragging, opening, and lifting may slightly increase elevation.

Motion and shadow should reinforce each other.

---

# UX Foundations

## Gestalt Principle — Figure and Ground

Users naturally distinguish foreground objects from the background.

Subtle shadows strengthen this separation and improve visual organization.

---

## Aesthetic-Usability Effect

Clean and restrained shadows increase perceived craftsmanship.

Interfaces that avoid excessive visual effects often appear more professional and easier to use.

---

## Jakob's Law

Modern users expect familiar elevation behavior.

Dialogs, dropdowns, drawers, tooltips, and floating elements should visually separate themselves from the page using subtle elevation.

---

## Law of Prägnanz

Simple visual structures reduce cognitive effort.

Shadows should simplify hierarchy rather than create visual complexity.

---

## Cognitive Load

Users should instantly recognize:

- what is clickable
- what is floating
- what is active
- what belongs to the page
- what temporarily appears above it

Shadows should communicate these relationships without requiring conscious thought.

---

# Elevation Levels

Every component should use semantic elevation tokens.

Avoid component-specific shadow definitions.

## Level 0 — Flat

No shadow.

Used for:

- Page backgrounds
- Sections
- Static content
- Editorial layouts

The default state of the interface.

---

## Level 1 — Resting

Very subtle elevation.

Used for:

- Cards
- Product tiles
- Inputs
- Secondary containers

Should remain almost imperceptible.

---

## Level 2 — Interactive

Slight elevation.

Used for:

- Hovered cards
- Buttons (when appropriate)
- Interactive panels

Communicates readiness for interaction.

---

## Level 3 — Floating

Clearly separated from surrounding content.

Used for:

- Dropdowns
- Popovers
- Sticky navigation
- Sticky Add to Cart

Should remain elegant rather than dramatic.

---

## Level 4 — Modal

Strongest standard elevation.

Used for:

- Dialogs
- Drawers
- Search overlays
- Mobile menus

Creates clear separation while preserving visual calm.

---

## Level 5 — Temporary Focus

Reserved for temporary interface states.

Examples:

- Drag previews
- Context menus
- Floating inspectors

Should be rare.

---

# Component Rules

## Buttons

Buttons should rely primarily on shape, color, and spacing.

Shadows should remain subtle.

Avoid skeuomorphic styling.

---

## Cards

Cards should communicate gentle separation from the page.

The product should remain the visual focus.

---

## Product Cards

Product imagery should dominate.

Shadows should define the container—not the image.

---

## Inputs

Inputs should rely primarily on borders.

Shadows should communicate focus rather than decoration.

---

## Dropdowns

Dropdowns require enough elevation to clearly separate them from surrounding content.

---

## Drawers

Drawers should feel above page content without appearing detached from the experience.

---

## Dialogs

Dialogs should become the highest standard layer within the interface.

Background content should visually recede.

---

# Interaction

Elevation may change during interaction.

Examples:

Hover

- Slightly increase elevation.

Pressed

- Reduce elevation slightly.

Dragging

- Increase elevation temporarily.

Opening

- Elevation should appear naturally with motion.

Closing

- Elevation should reduce as the element returns to the interface.

Movement and elevation should always feel synchronized.

---

# Accessibility

Shadows must never become the only indicator of interaction or focus.

Interactive states should also communicate through:

- Color
- Contrast
- Borders
- Motion
- Focus rings
- Labels (where appropriate)

The interface must remain usable even when shadows are difficult to perceive.

---

# Merchant Customization

Merchants should choose an overall elevation style rather than editing individual shadows.

Suggested styles include:

- Flat
- Subtle
- Balanced
- Elevated

Every component updates automatically while preserving semantic relationships.

---

# AI Guidelines

When generating storefronts, AI should:

- Prefer subtle elevation.
- Preserve consistent shadow language.
- Increase elevation only when hierarchy requires it.
- Avoid decorative shadow effects.
- Keep product imagery visually dominant.

Depth should improve comprehension—not attract attention.

---

# Future Compatibility

Before introducing a new elevation level, ask:

- Can an existing level communicate the same relationship?
- Does this improve hierarchy?
- Does it reduce cognitive load?
- Does it strengthen consistency?
- Is the additional elevation genuinely necessary?

If not, reuse an existing elevation level.

The Calinium Elevation & Shadow System values clarity, restraint, and timeless design over visual effects.

Depth should feel natural, purposeful, and almost invisible.