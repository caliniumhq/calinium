# FAQ

## Purpose

The FAQ component provides clear answers to common customer questions before they become purchase barriers.

It helps reduce uncertainty, improve confidence, and decrease support requests while maintaining a calm and trustworthy shopping experience.

The FAQ should answer genuine customer concerns—not serve as promotional content.

---

## Responsibilities

The FAQ component is responsible for:

- presenting frequently asked questions
- providing concise, accurate answers
- reducing customer uncertainty
- improving purchasing confidence
- remaining accessible across all devices

The FAQ component is not responsible for:

- replacing customer support
- displaying legal policies
- presenting product specifications in detail
- acting as long-form documentation

These responsibilities belong to dedicated pages.

---

## User Goals

The FAQ component should help customers:

- find answers quickly
- understand products and services
- reduce purchasing hesitation
- avoid contacting support unnecessarily

---

## Merchant Goals

The FAQ component should help merchants:

- reduce repetitive support requests
- improve customer confidence
- increase conversions
- communicate important purchasing information

Merchants should configure questions and answers—not component behavior.

---

## Structure

An FAQ section consists of:

- Section Heading — optional
- Introductory Text — optional
- Question List — required

Each FAQ Item consists of:

- Question — required
- Answer — required

---

## Required Elements

Every FAQ section requires:

- at least one FAQ item
- accessible disclosure controls
- clear question hierarchy
- concise answers

Questions should address genuine customer concerns.

---

## Optional Elements

The FAQ component may include:

- category headings
- icons
- contact support link
- related documentation link
- expandable groups

Optional elements should improve navigation without increasing complexity.

---

## Supported Variants

### Accordion

Displays one expandable question at a time.

Recommended for most storefronts.

---

### Multi-Expand

Allows multiple answers to remain open simultaneously.

Suitable for documentation-style pages.

---

### Category

Groups related questions into logical sections.

Recommended for larger FAQ collections.

---

### Minimal

Uses simple typography with restrained dividers.

Recommended for luxury storefronts.

---

## Component-Specific Rules

### Question Rules

Questions should:

- reflect real customer concerns
- use natural language
- remain concise
- avoid marketing language

Questions should be easy to scan.

---

### Answer Rules

Answers should:

- provide clear information
- remain concise
- use simple language
- avoid unnecessary repetition

When possible, answers should link to more detailed documentation rather than duplicate it.

---

### Accordion Rules

Accordion behavior should:

- animate subtly
- preserve layout stability
- remain keyboard accessible
- support screen readers

If only one answer may remain open, opening a new item should close the previous one.

---

### Expansion Rules

Expanding an item should:

- reveal content smoothly
- preserve surrounding layout
- update accessibility attributes
- maintain reading order

Answers should never overlap adjacent content.

---

### Content Rules

FAQ topics commonly include:

- shipping
- returns
- delivery
- sizing
- materials
- warranties
- payments
- care instructions
- availability

Questions should remain relevant to the page or business.

---

## Supported States

### Collapsed

Only the question is visible.

---

### Expanded

The answer is visible.

---

### Focus

The active question receives visible focus styling.

---

### Disabled

Questions temporarily unavailable should remain non-interactive.

---

## Responsive Behaviour

The FAQ component should:

- adapt gracefully across all devices
- preserve comfortable reading width
- maintain generous spacing
- avoid horizontal scrolling

Questions should remain easy to tap on mobile devices.

---

## Accessibility

Every FAQ component must support:

- semantic heading hierarchy
- accessible disclosure controls
- keyboard navigation
- visible focus indicators
- ARIA expanded states
- sufficient contrast
- screen reader compatibility

Questions should announce whether they are expanded or collapsed.

---

## Shopify Settings

Merchants may configure:

- section heading
- introductory text
- FAQ blocks
- category headings
- layout style
- allow multiple expanded items
- default expanded item
- color scheme

Merchants should not configure:

- typography scale
- spacing
- transition timing
- responsive breakpoints

These belong to the Design System.

---

## Design Tokens

The FAQ component should use semantic tokens for:

- spacing
- typography
- dividers
- borders
- colors
- icon size
- transitions

Example token categories:

- faq-spacing
- faq-heading
- faq-question
- faq-answer
- faq-divider
- faq-transition

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- height transition
- fade transition
- icon rotation

Avoid:

- bouncing
- scaling
- decorative animations

Motion should reinforce interaction rather than attract attention.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The FAQ component should:

- minimize JavaScript
- avoid layout shifts
- progressively enhance disclosure behavior
- remain fully functional without excessive scripting

The component should remain lightweight regardless of question count.

---

## AI Guidelines

When generating storefronts, AI should:

- include only relevant questions
- prioritize clarity over quantity
- maintain accessibility
- organize questions logically
- avoid duplicate content

AI should never invent business policies, shipping times, warranties, or legal information.

---

## Quality Checklist

### Purpose

- Questions answer genuine customer concerns.
- Answers reduce purchasing uncertainty.

### Design

- Questions are easy to scan.
- Answers remain readable.
- Whitespace is generous.

### Accessibility

- Disclosure controls function correctly.
- Keyboard navigation works.
- Screen readers announce expanded states.

### Responsive

- Layout adapts across devices.
- Touch targets remain comfortable.
- No horizontal scrolling occurs.

### Performance

- Layout remains stable.
- Animations are lightweight.
- Expansion feels immediate.

### AI Compatibility

- Component structure is deterministic.
- Existing patterns are reused.
- Merchant content remains accurate.

---

## Future Compatibility

Before extending the FAQ component, ask:

- Does the addition answer a genuine customer question?
- Can an existing FAQ pattern support the requirement?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The FAQ component should evolve through refinement rather than expansion.

Every FAQ component should reduce customer uncertainty, strengthen purchasing confidence, preserve accessibility and performance, and reflect the calm, timeless design philosophy that defines Calinium.
