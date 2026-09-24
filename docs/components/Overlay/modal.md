# Modal

## Purpose

The Modal is an overlay component that temporarily interrupts the current workflow to present focused content or request a user decision.

It creates a contained interaction without navigating away from the current page.

A Modal should only appear when customer attention is required.

---

## Responsibilities

The Modal is responsible for:

- presenting focused content
- requesting user confirmation
- displaying supplemental information
- supporting short workflows
- trapping keyboard focus
- remaining accessible across all devices

The Modal is not responsible for:

- replacing full pages
- displaying long-form content
- acting as permanent navigation
- presenting multiple unrelated tasks

These responsibilities belong to other components.

---

## User Goals

The Modal should help customers:

- complete short tasks
- confirm important actions
- understand contextual information
- return to the previous page without losing progress

---

## Merchant Goals

The Modal should help merchants:

- reduce navigation interruptions
- simplify short interactions
- improve workflow completion
- maintain a premium user experience

Merchants should configure modal content—not interaction behavior.

---

## Structure

A Modal consists of:

- Overlay — required
- Modal Container — required
- Content Area — required
- Close Button — required

Optional:

- Header
- Title
- Description
- Footer
- Primary Action
- Secondary Action
- Illustration
- Form
- Icon

---

## Required Elements

Every Modal requires:

- accessible dialog container
- close action
- visible content hierarchy
- keyboard support
- focus management

The purpose of the Modal should be immediately clear.

---

## Optional Elements

The Modal may include:

- title
- supporting description
- action buttons
- form controls
- media
- iconography
- additional information

Optional content should remain directly related to the primary task.

---

## Supported Variants

### Confirmation

Requests confirmation before completing an important action.

Examples:

- Delete Item
- Remove Address
- Cancel Order

---

### Informational

Displays concise contextual information.

Recommended for announcements and guidance.

---

### Form

Contains one short form.

Suitable for newsletter signup, login, or quick preferences.

---

### Media

Displays imagery or video.

Suitable for product previews and galleries.

---

### Minimal

Uses restrained typography and minimal interface controls.

Recommended for premium storefronts.

---

## Component-Specific Rules

### Layout Rules

The Modal should:

- appear centered within the viewport
- remain visually separated from the page
- maintain generous internal spacing
- avoid excessive width

Content should remain easy to scan.

---

### Overlay Rules

The overlay should:

- dim background content
- prevent background interaction
- preserve context
- remain visually subtle

The page beneath should remain visible but inactive.

---

### Header Rules

If displayed, the header may contain:

- title
- close button
- optional icon

The title should communicate the modal purpose immediately.

---

### Content Rules

Content should:

- remain concise
- focus on one task
- avoid excessive scrolling
- maintain comfortable reading width

Long-form documentation should be presented on dedicated pages.

---

### Footer Rules

The footer may include:

- primary action
- secondary action
- cancel action

The primary action should receive the greatest emphasis.

---

### Close Rules

The Modal should close using:

- close button
- Escape key
- overlay click (when appropriate)
- successful completion

Critical confirmation dialogs may disable overlay dismissal.

---

## Supported States

### Closed

The Modal is not visible.

---

### Open

The Modal is active.

Background interaction is disabled.

---

### Loading

Content is processing.

Primary actions should indicate progress.

---

### Success

The requested task completed successfully.

Appropriate feedback should be displayed.

---

### Error

An issue prevented completion.

Clear guidance should help the customer recover.

---

## Responsive Behaviour

The Modal should:

- adapt gracefully across all devices
- preserve comfortable margins
- remain centered when possible
- avoid horizontal scrolling
- support viewport height limitations

On smaller screens, the Modal may expand vertically while preserving usability.

---

## Accessibility

Every Modal must support:

- semantic dialog role
- accessible title
- keyboard navigation
- focus trapping
- Escape key support
- visible focus indicators
- screen reader compatibility
- sufficient contrast

Focus should:

- move into the Modal when opened
- remain trapped while active
- return to the triggering element when closed

---

## Shopify Settings

Merchants may configure:

- title
- description
- content
- button labels
- icon
- illustration
- width
- color scheme

Merchants should not configure:

- focus management
- keyboard behavior
- animation timing
- overlay behavior
- accessibility features

These belong to the Design System.

---

## Design Tokens

The Modal should use semantic tokens for:

- spacing
- typography
- border radius
- elevation
- overlay opacity
- colors
- transitions

Example token categories:

- modal-spacing
- modal-radius
- modal-background
- modal-overlay
- modal-shadow
- modal-transition

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- fade
- subtle scale
- opacity transition

Avoid:

- bouncing
- elastic movement
- rotating
- decorative animations

Motion should communicate appearance and dismissal without distraction.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Modal should:

- render only when needed
- minimize JavaScript
- avoid layout shifts
- lazy-load optional media
- preserve smooth interaction

Opening and closing the Modal should feel immediate.

---

## AI Guidelines

When generating storefronts, AI should:

- use Modals only when interruption is justified
- keep content focused on one task
- preserve accessibility
- reuse Button and Form components
- avoid nesting Modals

AI should never place essential navigation or long-form content inside a Modal.

---

## Quality Checklist

### Purpose

- One clear task is presented.
- The workflow is easy to understand.

### Design

- Content hierarchy is clear.
- Actions are easy to distinguish.
- Whitespace remains generous.

### Accessibility

- Focus trapping functions correctly.
- Escape closes the Modal when appropriate.
- Screen readers announce the dialog properly.

### Responsive

- Layout adapts across devices.
- No horizontal scrolling occurs.
- Actions remain easily accessible.

### Performance

- Modal opens immediately.
- Layout remains stable.
- Animations remain lightweight.

### AI Compatibility

- Component structure is deterministic.
- Existing patterns are reused.
- Merchant content remains accurate.

---

## Future Compatibility

Before extending the Modal, ask:

- Does the interaction require interrupting the user?
- Can an existing component satisfy the requirement?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Modal should evolve through refinement rather than expansion.

Every Modal should support focused interactions, preserve accessibility and performance, and reflect the calm, timeless design philosophy that defines Calinium.
