# Validation Message

## Purpose

The Validation Message component communicates a real result from form validation and gives customers clear, actionable next steps.

It keeps form feedback precise, calm, and connected to the control or group that needs attention in a premium storefront experience.

Validation Message should explain a real result—not anticipate errors.

---

## Responsibilities

The Validation Message component is responsible for:

- communicating an actual invalid, warning, or accepted state
- identifying the affected field or group clearly
- providing concise correction guidance when available
- supporting screen-reader announcement at an appropriate level
- preserving the customer's entered values

The Validation Message component is not responsible for:

- providing visible field labels
- defining validation rules
- submitting a form
- replacing Helper Text
- inventing errors, consent language, customer data, or merchant requirements

---

## User Goals

The Validation Message component should help customers:

- understand what needs attention
- correct the issue quickly
- retain entered information
- distinguish an error from ordinary guidance
- complete the Shopify form with confidence

---

## Merchant Goals

The Validation Message component should help merchants:

- present Shopify-native form feedback consistently
- use accurate, localized messages
- reduce abandoned submissions
- avoid styling individual errors differently across forms

Merchants should control only approved message content where Shopify permits it; validation behavior remains system controlled.

---

## Structure

A Validation Message consists of:

- Status text — required

Optional:

- concise correction guidance
- status icon that reinforces, but does not replace, text
- summary link to the affected control when the form needs an error summary

The enclosing Field or Radio Group owns the relationship to a control. Validation Message does not own labels.

---

## Required Elements

Every Validation Message requires:

- a real validation or submission result
- clear text that identifies the issue or outcome
- a visible relationship to the affected field, group, or form
- semantic status communication appropriate to urgency
- color-independent meaning

Messages should state what customers can do next when a correction is possible.

---

## Optional Elements

A Validation Message may include:

- a field-specific correction suggestion
- a concise success confirmation
- a warning when the form can still continue
- an error-summary link for a multi-field form

Optional content must remain accurate to the actual Shopify response.

---

## Supported Variants

### Error

Communicates a submission or field issue that requires correction before the relevant action can succeed.

---

### Warning

Communicates a real condition that deserves attention but does not necessarily block progress.

---

### Success

Communicates a confirmed successful result, such as Shopify accepting a newsletter submission.

---

### Inline

Appears directly with the affected Field or Radio Group.

---

## Component-Specific Rules

A Validation Message must:

- render only after a real validation or submission result
- remain adjacent to the affected field or group when possible
- explain the correction without blaming the customer
- use `aria-describedby` through the owning Field or group when appropriate
- use an announced status mechanism that does not repeatedly interrupt typing

A Validation Message must not:

- replace the visible label
- use color or an icon as the only error signal
- erase entered content
- claim submission success before Shopify confirms it
- introduce generic warnings that do not reflect a real state

---

## Supported States

### Hidden

No validation result exists. Helper Text, if present, remains independent.

---

### Error

Correction is required. The affected control or group communicates invalid status.

---

### Warning

The customer can review a real non-blocking condition.

---

### Success

The relevant Shopify action has been confirmed.

---

### Summary

An optional form-level summary points to one or more real field errors.

---

## Responsive Behaviour

Validation Messages should:

- appear directly below the affected field or group
- wrap without horizontal overflow
- remain readable at small widths
- preserve the form's reading order
- avoid shifting unrelated controls more than necessary

Error summaries should remain above the form action and link to real invalid controls.

---

## Accessibility

Every Validation Message must support:

- clear text in addition to color or iconography
- WCAG 2.2 AA contrast
- programmatic relationship to the affected field or group
- visible invalid state on the control where appropriate
- suitable live announcement for confirmed status changes
- keyboard access to any summary link
- focus management that does not unexpectedly interrupt entry

Use `role="alert"` only for urgent new error feedback. Ordinary guidance should not announce repeatedly.

---

## Shopify Settings

Merchants may configure:

- approved, localized message text where the relevant Shopify form supports it
- optional field visibility that changes whether a message can occur

The Design System controls:

- error, warning, and success styling
- spacing
- typography
- icons
- focus treatment
- announcement behavior
- breakpoints
- motion timing

---

## Design Tokens

The Validation Message component should use semantic tokens for:

- validation foreground color
- validation surface color
- validation border
- status icon size
- feedback spacing
- message typography
- focus indicator

Each status variant should use semantic tokens rather than hardcoded colors.

---

## Motion Rules

Motion should reinforce feedback without increasing stress.

Allowed motion:

- brief opacity transition when a new result appears
- subtle color transition on the associated control

Avoid:

- shaking fields
- flashing surfaces
- repeating animation
- success motion before confirmation

---

## Performance Rules

The Validation Message component should:

- render only when a real result exists
- use server-rendered Shopify feedback where available
- avoid duplicate live regions
- preserve layout stability
- require minimal JavaScript for progressive enhancement only

---

## AI Guidelines

When generating storefronts, AI should:

- connect Validation Message to documented Field or Radio Group primitives
- preserve Shopify-provided errors and confirmed success states
- use concise, corrective language only when a real result exists
- distinguish non-critical Helper Text from validation feedback
- preserve semantic HTML, focus, and announcement behavior
- avoid inventing errors, success, consent requirements, or customer data rules

AI should not create a new validation pattern for each page context.

---

## Quality Checklist

### Purpose

- A real validation or submission result exists.
- The message identifies the affected field, group, or action.

### Design

- Feedback is clear, calm, and subordinate to the primary task.
- Status styling is semantic and color-independent.

### Accessibility

- Field relationships, contrast, announcements, and focus behavior are correct.
- Repeated typing does not trigger disruptive announcements.

### Responsive

- Feedback remains adjacent and readable at small widths.
- It does not cause horizontal overflow.

### AI Compatibility

- Shopify feedback is preserved.
- No validation rule or result was fabricated.

---

## Future Compatibility

Future Validation Message refinements should improve server-feedback mapping and localization while retaining one shared feedback model.

Before adding a variant, ask:

- Is the status real and actionable?
- Can Error, Warning, Success, or Inline already communicate it?
- Does the change preserve native Shopify form behavior?
- Can AI apply it deterministically from actual form state?

The Validation Message component should evolve through clearer feedback, not a larger catalog of alerts.
