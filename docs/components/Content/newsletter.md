# Newsletter

## Purpose

The Newsletter component allows merchants to build long-term relationships with customers by collecting email subscriptions.

It provides a calm, trustworthy invitation to stay informed about new collections, product launches, editorial stories, and exclusive updates.

The Newsletter should feel like an invitation—not an interruption.

---

## Responsibilities

The Newsletter is responsible for:

- collecting email addresses
- encouraging newsletter subscriptions
- communicating subscription benefits
- displaying submission feedback
- remaining accessible across all devices

The Newsletter is not responsible for:

- displaying promotions
- replacing contact forms
- managing customer accounts
- sending marketing emails

These responsibilities belong to Shopify and integrated email platforms.

---

## User Goals

The Newsletter should help customers:

- understand why they should subscribe
- submit their email quickly
- trust how their information will be used
- receive clear submission feedback

---

## Merchant Goals

The Newsletter should help merchants:

- grow their email audience
- improve customer retention
- increase repeat purchases
- communicate future product launches
- strengthen customer relationships

Merchants should configure messaging—not form behavior.

---

## Structure

A Newsletter consists of:

- Heading — required
- Email Input — required
- Submit Button — required

Optional:

- Eyebrow
- Supporting Text
- Privacy Notice
- Success Message
- Background Image
- Background Color
- Illustration

---

## Required Elements

Every Newsletter requires:

- heading
- email field
- submit button
- accessible form labels
- submission feedback

The purpose of the subscription should be immediately clear.

---

## Optional Elements

The Newsletter may include:

- short description
- privacy reassurance
- promotional message
- illustration
- background image
- social links

Optional content should reinforce trust rather than create urgency.

---

## Supported Variants

### Minimal

Displays:

- heading
- email input
- button

Recommended for luxury storefronts.

---

### Editorial

Adds supporting copy with generous whitespace.

Suitable for premium brands.

---

### Lifestyle

Includes imagery alongside the subscription form.

Recommended for storytelling pages.

---

### Full Width

Uses a full-width background with centered content.

Suitable for homepage placement.

---

## Component-Specific Rules

### Heading Rules

The heading should:

- communicate the value of subscribing
- remain concise
- avoid promotional language
- support long-term engagement

Examples:

- Stay Updated
- Join Our Newsletter
- Discover New Collections

---

### Supporting Text Rules

Supporting text should explain:

- what subscribers receive
- how often emails are sent
- why subscribing is valuable

Text should remain concise and reassuring.

---

### Input Rules

The Newsletter requires:

- email input
- proper validation
- autocomplete support
- accessible labeling

Placeholder text should supplement—not replace—the label.

---

### Button Rules

The submit button should:

- use the Button component's primary variant
- clearly communicate the action
- remain visually prominent

Examples:

- Subscribe
- Join
- Sign Up

---

### Privacy Rules

Privacy messaging may include:

- unsubscribe anytime
- privacy assurance
- data protection statement

Privacy messaging should remain short and trustworthy.

---

### Submission Rules

After successful submission:

- display a confirmation message
- preserve layout stability
- avoid unnecessary page navigation

Example:

```
Thank you for subscribing.
```

---

### Validation Rules

Invalid email addresses should display:

- clear error messaging
- accessible feedback
- helpful correction guidance

Validation should never rely solely on color.

---

## Supported States

### Default

Form is ready for submission.

---

### Focus

The active field receives visible focus styling.

---

### Submitting

The form is processing.

Additional submissions should be temporarily disabled.

---

### Success

Confirmation messaging replaces or accompanies the form.

---

### Error

Clear guidance explains how to correct the issue.

---

### Disabled

Submission is temporarily unavailable.

The reason should be communicated where appropriate.

---

## Responsive Behaviour

The Newsletter should:

- adapt gracefully across all devices
- preserve readable spacing
- maintain accessible touch targets
- avoid horizontal scrolling

Inputs should remain comfortable on mobile devices.

---

## Accessibility

Every Newsletter must support:

- semantic form structure
- accessible labels
- keyboard navigation
- visible focus indicators
- screen reader compatibility
- autocomplete attributes
- sufficient contrast
- accessible validation messages

Error and success messages should be announced appropriately.

---

## Shopify Settings

Merchants may configure:

- heading
- supporting text
- placeholder text
- submit button label
- background image
- background color
- content alignment
- content width
- color scheme

Merchants should not configure:

- validation behavior
- typography scale
- spacing
- animation timing

These belong to the Design System.

---

## Design Tokens

The Newsletter should use semantic tokens for:

- spacing
- typography
- input height
- button spacing
- colors
- borders
- transitions

Example token categories:

- newsletter-spacing
- newsletter-input
- newsletter-button
- newsletter-background
- newsletter-transition

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- fade transition
- subtle success transition
- opacity transition

Avoid:

- bouncing
- scaling
- decorative animations

Motion should reinforce feedback rather than attract attention.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Newsletter should:

- minimize JavaScript
- avoid layout shifts
- load instantly
- validate efficiently
- preserve responsive performance

The component should contribute positively to Core Web Vitals.

---

## AI Guidelines

When generating storefronts, AI should:

- communicate a clear subscription benefit
- keep messaging concise
- prioritize accessibility
- reuse documented Button and Form Input components
- avoid aggressive marketing language

AI should never invent promises regarding discounts, email frequency, or subscriber benefits.

---

## Quality Checklist

### Purpose

- Subscription value is immediately clear.
- Form completion is effortless.

### Design

- Inputs remain visually balanced.
- Buttons receive appropriate emphasis.
- Whitespace remains generous.

### Accessibility

- Labels are accessible.
- Validation is understandable.
- Keyboard navigation functions correctly.

### Responsive

- Form adapts across devices.
- Touch targets remain comfortable.
- No horizontal scrolling occurs.

### Performance

- Form loads immediately.
- Validation is responsive.
- No layout shifts occur.

### AI Compatibility

- Form structure is deterministic.
- Existing components are reused.
- Merchant messaging is preserved.

---

## Future Compatibility

Before extending the Newsletter, ask:

- Does the addition improve the subscription experience?
- Can an existing form component provide the functionality?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Newsletter should evolve through refinement rather than expansion.

Every Newsletter should create a trustworthy invitation to stay connected, preserve accessibility and performance, and reflect the calm, timeless design philosophy that defines Calinium.
