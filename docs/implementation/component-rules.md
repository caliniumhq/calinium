# Component Implementation Rules

## Purpose

The Component Implementation Rules define the universal implementation standards that apply to every reusable component within the Calinium Design System.

These rules transform the Component System into predictable implementation decisions that ensure every component behaves consistently, remains accessible, performs efficiently, and supports long-term maintainability.

Regardless of its purpose, every component should feel like part of one coherent system.

Components are not isolated pieces of UI.

They are interconnected building blocks that together create the Calinium experience.

---

# Relationship to the Design System

These rules implement the principles defined in:

- Component System
- Layout System
- Typography System
- Spacing System
- Color System
- Motion System
- Accessibility System

Every component must inherit these systems.

Individual components must never redefine them.

---

# Core Principles

## Reuse Before Creation

Before creating a new component, determine whether an existing component already solves the problem.

The design system should evolve through refinement rather than duplication.

---

## Single Responsibility

Every component should solve one primary interface problem.

Components should not combine unrelated responsibilities.

Complex experiences should emerge through composition.

---

## Consistency

Components solving similar problems should behave identically.

Interaction patterns should remain predictable throughout every storefront.

---

## Progressive Enhancement

Every component should provide a functional experience before JavaScript enhancements are applied.

JavaScript should improve usability—not provide basic functionality.

---

## Merchant Simplicity

Components should expose meaningful customization while protecting visual consistency.

Merchants configure content and behavior—not implementation details.

---

# Component Architecture

Every component consists of four layers.

## Structure

Semantic HTML.

Logical document hierarchy.

Accessible markup.

---

## Behavior

Interaction.

State management.

Keyboard support.

Progressive enhancement.

---

## Presentation

Spacing.

Typography.

Color.

Motion.

Elevation.

Presentation should originate from the Design System.

---

## Content

Merchant-controlled.

Structured.

Independent from presentation.

---

# Required Characteristics

Every component must be:

- Reusable
- Predictable
- Accessible
- Responsive
- Performant
- Themeable
- Composable
- Documented
- Testable

No component should be introduced unless these characteristics can be satisfied.

---

# Composition Rules

Large interfaces should be composed from smaller components.

Components should never duplicate existing functionality.

Nested components should preserve clear hierarchy.

Composition should improve flexibility without increasing complexity.

---

# State Rules

Every interactive component must explicitly define its supported states.

Typical states include:

- Default
- Hover
- Focus
- Active
- Pressed
- Selected
- Expanded
- Collapsed
- Loading
- Success
- Error
- Disabled
- Empty

Unsupported states should be documented.

State transitions should remain predictable.

---

# Interaction Rules

Components should communicate interaction clearly.

Users should immediately understand:

- what is interactive
- what is selected
- what changed
- what action occurred

Interactions should remain consistent throughout the system.

---

# Layout Rules

Components must follow the Layout Implementation Rules.

Components should never introduce arbitrary alignment or spacing.

Every component should align naturally with the Grid System.

---

# Typography Rules

Components must use semantic typography roles.

Typography should communicate hierarchy—not decoration.

Components must never create custom typography styles.

---

# Color Rules

Components must reference semantic color roles.

Hardcoded colors should never define component behavior.

Semantic meaning must remain consistent across every component.

---

# Motion Rules

Components should reuse existing motion patterns.

Motion should communicate:

- interaction
- navigation
- state changes
- feedback

Components must never introduce decorative animations.

---

# Imagery Rules

Components displaying media should preserve:

- aspect ratio
- composition
- image quality
- accessibility

Media should support understanding rather than decoration.

---

# Responsive Rules

Every component must adapt naturally across viewport sizes.

Layouts may change.

Behavior should remain familiar.

Components should never lose functionality on smaller screens.

---

# Accessibility Requirements

Every component must support:

- Semantic HTML
- Keyboard navigation
- Screen reader compatibility
- Logical focus order
- Visible focus indicators
- WCAG 2.2 AA compliance

Interactive components must remain fully usable without a mouse.

Accessibility is mandatory.

---

# Performance Rules

Components should:

- Minimize JavaScript
- Prefer native browser behavior
- Avoid unnecessary rendering
- Prevent layout shifts
- Load progressively

Performance should remain a primary design objective.

---

# Merchant Considerations

Merchants should configure components through structured settings such as:

- Content
- Layout
- Visibility
- Variants
- Density
- Alignment

Merchants should not configure implementation logic.

The design system preserves consistency automatically.

---

# AI Guidelines

When generating storefronts, AI should:

- Reuse existing components.
- Avoid creating unnecessary variations.
- Preserve component hierarchy.
- Respect implementation rules.
- Match component variants to the selected preset.
- Maintain accessibility.
- Preserve consistency across every page.

AI should compose experiences—not invent components.

---

# Documentation Requirements

Every component specification must include:

- Purpose
- Responsibilities
- Structure
- Required Elements
- Optional Elements
- Supported States
- Accessibility
- Merchant Settings
- Responsive Behavior
- AI Rules
- Quality Checklist

No component should exist without documentation.

---

# Quality Checklist

Before approving a component, verify:

## Purpose

□ Solves one problem

□ Clearly defined responsibility

□ Reusable

---

## Design

□ Uses semantic design tokens

□ Preserves hierarchy

□ Matches existing visual language

---

## Interaction

□ Predictable behavior

□ Consistent states

□ Clear feedback

---

## Accessibility

□ Keyboard support

□ Screen reader support

□ Visible focus

□ Semantic HTML

---

## Performance

□ Lightweight

□ Progressive enhancement

□ Minimal layout shifts

---

## Merchant Experience

□ Easy to configure

□ Safe customization

□ No unnecessary settings

---

## AI Compatibility

□ Can be reused

□ Supports presets

□ Uses semantic tokens

□ Composable

---

# Future Compatibility

Before introducing a new component, ask:

- Does an existing component already solve this problem?
- Can the problem be solved through composition?
- Does the component preserve consistency?
- Does it improve the merchant experience?
- Does it improve the customer experience?
- Does it remain accessible?
- Will it still feel appropriate years from now?

If an existing component can satisfy the requirement, reuse it.

The Component Implementation Rules prioritize simplicity, consistency, accessibility, performance, composability, and long-term maintainability.

Every component should strengthen the design system rather than expand it unnecessarily.