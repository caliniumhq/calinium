# Toast

## Purpose

The Toast is a lightweight, non-blocking notification that briefly communicates the result of a user action.

It provides immediate feedback while allowing customers to continue interacting with the page uninterrupted.

A Toast should confirm actions—not demand attention.

---

## Responsibilities

The Toast is responsible for:

- confirming completed actions
- communicating short status updates
- reporting non-critical errors
- providing temporary feedback
- remaining accessible across all devices

The Toast is not responsible for:

- blocking workflows
- requesting confirmation
- displaying lengthy information
- replacing alerts or dialogs

These responsibilities belong to other components.

---

## User Goals

The Toast should help customers:

- understand the result of an action
- continue browsing without interruption
- recognize successful updates
- recover from minor errors

---

## Merchant Goals

The Toast should help merchants:

- improve customer confidence
- provide immediate feedback
- reduce uncertainty
- create a responsive interface

Merchants should configure messaging—not notification behavior.

---

## Structure

A Toast consists of:

- Status Icon — optional
- Message — required

Optional:

- Title
- Action Button
- Close Button
- Progress Indicator

---

## Required Elements

Every Toast requires:

- concise message
- accessible announcement
- appropriate status styling
- automatic dismissal or manual close

Messages should communicate a single outcome.

---

## Optional Elements

The Toast may include:

- title
- action button
- retry button
- dismiss button
- icon
- progress indicator

Optional elements should remain secondary to the message.

---

## Supported Variants

### Success

Confirms a completed action.

Examples:

- Item added to cart
- Changes saved
- Subscription successful

---

### Information

Communicates neutral status updates.

Examples:

- Settings updated
- Sync completed

---

### Warning

Communicates recoverable issues.

Examples:

- Network connection is unstable
- Inventory is limited

---

### Error

Communicates non-critical failures.

Examples:

- Unable to save changes
- Something went wrong

Critical failures should use a Modal or Alert instead.

---

## Component-Specific Rules

### Message Rules

Messages should:

- remain concise
- describe the outcome
- avoid technical language
- focus on one action

Examples:

- Added to Cart
- Changes Saved
- Unable to Complete Request

---

### Action Rules

If an action is provided, it should:

- resolve the current issue
- remain optional
- receive secondary emphasis

Examples:

- Undo
- Retry
- View Cart

---

### Dismiss Rules

The Toast should:

- dismiss automatically after a short duration
- allow manual dismissal
- remain visible long enough to be read

Auto-dismiss should pause while hovered or focused.

---

### Placement Rules

Toasts should appear in a consistent location.

Recommended positions:

- top right
- bottom right

Only one notification stack should exist per viewport.

---

### Stacking Rules

When multiple Toasts appear:

- preserve chronological order
- limit visible notifications
- avoid covering important interface elements

Older notifications should dismiss before newer ones exceed the maximum stack.

---

## Supported States

### Hidden

The Toast is not visible.

---

### Entering

The Toast is appearing.

---

### Visible

The Toast is displayed.

---

### Dismissing

The Toast is fading away.

---

### Paused

Automatic dismissal is temporarily suspended.

This occurs while hovered or keyboard focused.

---

## Responsive Behaviour

The Toast should:

- adapt across all devices
- avoid obstructing important content
- preserve readable spacing
- remain easy to dismiss

On mobile devices, Toasts should remain comfortably reachable.

---

## Accessibility

Every Toast must support:

- appropriate ARIA live regions
- semantic status roles
- keyboard-accessible actions
- visible focus indicators
- sufficient contrast
- screen reader compatibility

Status announcements should use:

- polite announcements for informational updates
- assertive announcements only for important failures

The Toast should never unexpectedly steal keyboard focus.

---

## Shopify Settings

Merchants may configure:

- success messages
- error messages
- information messages
- action labels
- color scheme

Merchants should not configure:

- display duration
- animation timing
- accessibility behavior
- placement logic

These belong to the Design System.

---

## Design Tokens

The Toast should use semantic tokens for:

- spacing
- typography
- border radius
- elevation
- colors
- shadows
- transitions

Example token categories:

- toast-spacing
- toast-background
- toast-border
- toast-shadow
- toast-status
- toast-transition

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- fade
- subtle slide
- opacity transition

Avoid:

- bouncing
- scaling
- elastic movement
- decorative animations

Motion should communicate appearance and dismissal naturally.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Toast should:

- render only when needed
- minimize JavaScript
- avoid layout shifts
- reuse shared notification infrastructure
- dismiss efficiently

Notifications should feel immediate without affecting page performance.

---

## AI Guidelines

When generating storefronts, AI should:

- use Toasts only for temporary feedback
- keep messages concise
- preserve accessibility
- prioritize successful workflow confirmation
- avoid excessive notifications

AI should never use Toasts for critical warnings that require user acknowledgment.

---

## Quality Checklist

### Purpose

- Feedback is immediate.
- The message is easy to understand.

### Design

- Status is recognizable.
- Actions remain secondary.
- Visual hierarchy is clear.

### Accessibility

- Screen readers announce notifications correctly.
- Focus remains predictable.
- Keyboard actions function properly.

### Responsive

- Toasts adapt across devices.
- Notifications avoid covering important content.
- No horizontal scrolling occurs.

### Performance

- Notifications appear immediately.
- Dismissal remains smooth.
- Layout remains stable.

### AI Compatibility

- Notification behavior is deterministic.
- Existing interaction patterns are reused.
- Merchant messaging remains accurate.

---

## Future Compatibility

Before extending the Toast, ask:

- Does the notification communicate temporary feedback?
- Can an existing Toast variant satisfy the requirement?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Toast should evolve through refinement rather than expansion.

Every Toast should provide clear, immediate feedback while preserving accessibility, performance, and the calm, premium interaction philosophy that defines Calinium.
