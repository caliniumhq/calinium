# Calinium Implementation Rules

## Purpose

The Implementation Rules define how the Calinium Design System is translated into consistent, deterministic interface behavior.

While the Design System explains the philosophy, principles, and visual language of Calinium, the Implementation Rules describe how those principles are applied during design, development, AI generation, and quality assurance.

These documents bridge the gap between design theory and implementation.

They ensure that every storefront, component, preset, and generated theme behaves consistently regardless of who—or what—builds it.

---

# Relationship to the Design System

The Calinium documentation is organized into four layers.

```
Philosophy
        ↓
Design System
        ↓
Implementation Rules
        ↓
Component Specifications
        ↓
Shopify Theme
```

Each layer builds upon the previous one.

- **Philosophy** defines why Calinium exists.
- **Design System** defines how Calinium should look and feel.
- **Implementation Rules** define how those ideas become repeatable decisions.
- **Component Specifications** define how individual interface elements are built.
- **The Shopify theme** is the final implementation of all previous layers.

---

# Objectives

The Implementation Rules exist to ensure that every Calinium storefront is:

- Consistent
- Predictable
- Accessible
- Performant
- Maintainable
- AI-compatible
- Merchant-friendly

These rules remove ambiguity from the design process.

Whenever multiple interpretations are possible, the Implementation Rules provide the canonical answer.

---

# Design Philosophy

Implementation should never introduce new design decisions.

Every implementation must originate from the Design System.

If a required behavior is not defined by the Design System, the Design System should be updated before implementation proceeds.

Implementation follows design.

It never replaces it.

---

# Scope

The Implementation Rules define:

- Layout behavior
- Typography usage
- Spacing relationships
- Color application
- Motion behavior
- Imagery presentation
- Component composition
- Shopify implementation standards

They do not define visual identity or business strategy.

Those belong to the Design System.

---

# Principles

Every implementation should follow the same core principles.

## Consistency

Identical problems should produce identical solutions.

---

## Simplicity

Choose the simplest implementation that satisfies the design requirements.

Avoid unnecessary complexity.

---

## Accessibility

Accessibility requirements are mandatory.

No implementation should compromise usability for visual preference.

---

## Performance

Performance is part of the user experience.

Prefer lightweight, native, and progressively enhanced solutions.

---

## Predictability

Customers should never have to learn how Calinium behaves.

Interfaces should remain familiar, stable, and reliable.

---

## Maintainability

Implementations should remain understandable and reusable.

Avoid unnecessary customization or duplicated logic.

---

# Relationship to Component Specifications

Implementation Rules describe general behavior.

Component Specifications describe specific implementations.

For example:

```
Implementation Rule

↓

Buttons communicate primary actions.

↓

Button Specification

↓

Primary button
Secondary button
Ghost button
Loading state
Disabled state
Focus state
Accessibility
Shopify settings
```

Implementation Rules always apply to every component.

Component Specifications may introduce additional requirements for individual components.

---

# AI Compatibility

The Implementation Rules serve as the primary behavioral reference for Calinium's AI generation engine.

AI should use these rules to:

- Select appropriate layouts.
- Apply design tokens consistently.
- Preserve accessibility.
- Maintain visual hierarchy.
- Reuse existing interaction patterns.
- Avoid introducing inconsistent behaviors.

The AI should compose storefronts using these rules rather than inventing new ones.

---

# Rule Structure

Every implementation document should follow a consistent structure.

1. Purpose
2. Design Principles
3. Implementation Rules
4. Accessibility Requirements
5. Merchant Considerations
6. AI Guidelines
7. Quality Checklist

This structure ensures consistency throughout the documentation.

---

# Rule Hierarchy

When multiple rules appear to conflict, follow this order of precedence:

1. Philosophy
2. Design Foundation
3. Design System
4. Implementation Rules
5. Component Specifications
6. Theme Code

Lower layers must never contradict higher layers.

---

# Future Development

Before introducing a new implementation rule, ask:

- Does the Design System already define this behavior?
- Can an existing rule be reused?
- Will this improve consistency?
- Will it reduce ambiguity?
- Will it improve the merchant experience?
- Will it preserve accessibility and performance?

If not, the rule should not be introduced.

---

# Our Goal

The Implementation Rules exist to make Calinium predictable.

They transform design principles into repeatable implementation decisions.

They provide a common language shared by designers, developers, AI systems, and quality assurance.

By removing ambiguity, they ensure that every Calinium storefront reflects the same standards of clarity, craftsmanship, performance, and timeless design.