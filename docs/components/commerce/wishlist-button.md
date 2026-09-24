# Wishlist Button

## Purpose

Wishlist Button provides an explicit save-or-remove product control with a clear integration boundary.

It remains optional, customer-controlled, and honest about persistence; it does not imply account synchronization, personalization, or marketing capability that does not exist.

## Responsibilities

Wishlist Button is responsible for save, saved, remove, loading, error, guest, and signed-in presentation states; accessible state communication; and its relationship with Icon Button.

Wishlist Button is not responsible for wishlist page design, customer authentication, database storage, provider behavior, cross-device synchronization, email reminders, or personalized marketing.

## User Goals

Wishlist Button should help customers intentionally save or remove a product and understand whether the action is currently available or persisted.

## Merchant Goals

Wishlist Button should help merchants enable an approved wishlist integration without exposing implementation details or making unsupported persistence claims.

## Structure

Wishlist Button consists of an explicit button control with accurate current state.

Optional:

- Icon Button presentation
- verified saved count
- sign-in explanation when account synchronization is actually required
- integration-provided destination link

## Required Elements

Every Wishlist Button requires an available integration path, accessible save/remove names, state feedback, and a usable failure or unavailable path.

## Optional Elements

A verified count, account-specific explanation, or Icon Button treatment may appear only when an approved integration supports it.

## Supported Variants

### Save

The product is not saved and the button offers save action.

### Saved

The product is saved and the button offers remove action.

### Guest Local

Local-only saving is clearly qualified and must not promise cross-device persistence.

### Account Synced

Appears only when verified account-backed synchronization exists.

### Unavailable

The optional control hides or explains integration unavailability without disrupting purchase.

## Component-Specific Rules

Wishlist Button must use an explicit control, update state only after a real integration result, and expose save/remove state through accessible naming and pressed or selected semantics where appropriate.

Wishlist Button must not create a wishlist merely because the primitive exists, imply persistence across devices without synchronization, require sign-in without integration reason, expose customer data, or block Buy Buttons.

## Supported States

### Save or Saved

Current action and state are explicit.

### Loading

Interaction is temporarily guarded against duplicate requests while geometry remains stable.

### Error

Concise recoverable feedback is available without technical detail.

### Guest or Signed In

State reflects verified integration behavior, not assumption.

## Responsive Behaviour

Wishlist Button should retain minimum touch-target size, visible focus, concise labels, and stable placement without competing with purchase controls at narrow widths.

## Accessibility

Wishlist Button must use semantic HTML and button behavior, keyboard operation, visible focus, WCAG 2.2 AA contrast, accessible state name changes, non-color-only feedback, and restrained live announcements. Focus must not move automatically.

## Shopify Settings

Merchants may configure integration enablement, approved label treatment, and Icon Button presentation only when an approved integration exists.

The Design System controls touch target, focus styling, loading treatment, state announcements, typography, breakpoints, motion, and integration-failure behavior.

## Design Tokens

Wishlist Button should use wishlist-control-size, wishlist-gap, wishlist-foreground, wishlist-saved, wishlist-focus-ring, and wishlist-loading-surface tokens.

## Motion Rules

State confirmation may use a brief restrained icon or text transition. No repeated save animation, heart burst, pulse, or attention-seeking motion is permitted; reduced-motion preferences are respected.

## Performance Rules

Wishlist Button should render a safe initial state, use minimal JavaScript for real integration changes, avoid duplicate requests and polling, defer non-critical provider work, preserve progressive enhancement, and remain safe after Theme Editor rerenders.

## AI Guidelines

AI should add Wishlist Button only when an approved integration and meaningful customer purpose exist; preserve verified persistence boundaries; select deterministic state wording; and hide it when unavailable.

AI must not invent wishlist storage, account synchronization, saved counts, customer data, reminders, or personalized marketing.

## Quality Checklist

### Integration

- A real save/remove path exists.
- Guest and account persistence claims are accurate.

### Accessibility

- Current action and saved state are exposed clearly.
- Loading and errors do not trap focus or duplicate announcements.

### Hierarchy

- Wishlist remains secondary to Buy Buttons and product evaluation.

## Future Compatibility

Future Wishlist Button refinement should follow approved privacy, account, and storage architecture. Any persistence or customer-data expansion requires explicit integration, consent, security, and failure-recovery design.
