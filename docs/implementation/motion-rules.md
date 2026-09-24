# Motion Implementation Rules

## Purpose

The Motion Implementation Rules define how motion is implemented throughout every Calinium storefront.

These rules transform the Motion System into consistent implementation decisions that improve usability, communicate interface changes, reinforce hierarchy, and maintain a calm, premium experience.

Motion should provide feedback.

It should never become the focus of the interface.

Every animation must have a purpose.

---

# Relationship to the Design System

These rules implement the principles defined in:

- Motion System
- Layout System
- Component System
- Accessibility System
- Imagery System

If motion implementation conflicts with the Design System, the Design System takes precedence.

---

# Core Principles

## Purpose Before Animation

Every animation must communicate something meaningful.

Examples include:

- state change
- navigation
- feedback
- hierarchy
- continuity

Animations that exist only for decoration should be avoided.

---

## Calm Interaction

Motion should feel confident, controlled, and unobtrusive.

Animations should never surprise or distract customers.

The interface should feel responsive rather than theatrical.

---

## Consistency

Identical interactions should always use identical motion behavior.

Customers should learn interface behavior through repetition.

Avoid introducing unique animations for similar interactions.

---

## Continuity

Motion should preserve spatial relationships.

Users should understand where content comes from, where it moves, and where it goes.

Movement should reinforce orientation.

---

## Accessibility

Motion must respect user preferences.

Customers who request reduced motion should receive an equivalent experience without unnecessary animation.

Accessibility always takes priority over visual expression.

---

# Motion Categories

Motion should communicate one of the following:

- Feedback
- Navigation
- Transition
- Emphasis
- Loading
- State Change

Every animation should belong to one category.

---

# Feedback Rules

Motion should immediately acknowledge customer interaction.

Examples include:

- button activation
- form validation
- quantity updates
- wishlist changes
- add-to-cart confirmation

Feedback should be immediate and subtle.

---

# Navigation Rules

Motion should preserve orientation during navigation.

Examples include:

- drawers
- menus
- dialogs
- search overlays
- page transitions

Navigation animations should explain movement rather than decorate it.

---

# State Change Rules

Changes in interface state should be visually communicated.

Examples include:

- expanded sections
- collapsed content
- filters
- sorting
- variant selection

State changes should remain predictable and easy to follow.

---

# Loading Rules

Loading motion should reassure users that progress is occurring.

Loading indicators should remain simple and unobtrusive.

Avoid excessive visual complexity during loading states.

---

# Hover Rules

Hover effects should communicate interactivity.

Hover motion should never significantly reposition interface elements.

Products should remain visually stable.

---

# Scroll Rules

Scrolling should feel natural.

Scroll-triggered effects should support storytelling without interrupting browsing.

Avoid excessive parallax or dramatic scroll animations.

Content should remain the primary focus.

---

# Product Rules

Motion should support product understanding.

Examples include:

- gallery transitions
- image zoom
- variant changes
- media switching

Motion should improve product exploration rather than create distraction.

---

# Form Rules

Form motion should improve comprehension.

Examples include:

- focus changes
- validation feedback
- expanding helper text
- error messages

Animations should communicate progress rather than entertain.

---

# Modal Rules

Dialogs, drawers, and overlays should clearly communicate:

- opening
- closing
- focus movement

Transitions should preserve context.

Customers should never lose orientation.

---

# Responsive Rules

Motion behavior should remain consistent across all supported devices.

Animation intensity should not increase on smaller screens.

Touch interactions should feel immediate and responsive.

---

# Performance Rules

Motion should prioritize performance.

Implementations should:

- avoid unnecessary layout recalculation
- minimize visual instability
- favor hardware-accelerated transforms where appropriate
- preserve smooth interaction

Performance is part of the animation experience.

---

# Accessibility Requirements

Every motion implementation must support:

- Reduced Motion system preferences
- Keyboard navigation
- Visible focus states
- Motion-independent communication
- WCAG 2.2 AA requirements

Critical information must never rely solely on animation.

When motion is reduced or disabled, functionality and understanding must remain unchanged.

---

# Merchant Considerations

Merchants should customize motion through high-level controls such as:

- Motion intensity
- Autoplay behavior
- Animation enablement
- Preset selection

Merchants should not manually configure individual animation behaviors.

The system should preserve consistency automatically.

---

# AI Guidelines

When generating storefronts, AI should:

- Prefer subtle motion.
- Animate only meaningful interactions.
- Preserve interface stability.
- Respect accessibility preferences.
- Reuse existing animation patterns.
- Avoid decorative motion.
- Keep products as the visual focus.

Motion should explain interface behavior—not compete with the merchant's products.

---

# Quality Checklist

Before approving motion implementation, verify:

## Purpose

- Every animation communicates meaning.
- No unnecessary animations exist.
- Motion reinforces user understanding.

## Consistency

- Similar interactions animate consistently.
- Components share common motion patterns.
- Navigation behavior is predictable.

## Accessibility

- Reduced Motion is respected.
- Motion-independent communication exists.
- Keyboard interactions remain clear.

## Performance

- Motion remains smooth.
- Layout shifts are minimized.
- Rendering remains efficient.

## Commerce

- Products remain visually dominant.
- Purchase actions remain immediate.
- Motion supports product exploration.

---

# Future Compatibility

Before introducing a new animation, ask:

- Does it communicate useful information?
- Can an existing animation pattern be reused?
- Does it reduce cognitive load?
- Does it preserve accessibility?
- Does it support the merchant's products?
- Will it still feel appropriate years from now?

If the answer is no, do not introduce the animation.

The Motion Implementation Rules prioritize clarity, continuity, accessibility, performance, and purposeful interaction.

Motion should quietly communicate change, reinforce understanding, and support commerce without becoming the center of attention.