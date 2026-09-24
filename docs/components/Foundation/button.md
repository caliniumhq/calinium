# Button

## Purpose

Button represents a clear, intentional storefront action. It gives customers a calm, predictable way to submit a Shopify form or initiate a verified client-side action without competing with the product or surrounding content.

## Responsibilities

Button owns action hierarchy, visible interaction feedback, accessible native-button semantics, and documented loading or disabled presentation.

It does not own navigation destinations, form validation, purchase eligibility, Shopify business logic, focus management for an overlay, or confirmation of an action that has not completed.

## User Goals

Customers should be able to identify the primary action, understand whether it is available, and activate it confidently by touch, pointer, or keyboard.

## Merchant Goals

Merchants should choose approved action labels, destinations supplied by the relevant Shopify object or section, visibility, and a documented hierarchy. They should not style individual controls or configure low-level interaction behavior.

## Structure

Button consists of a text label and may include one leading or trailing Icon System icon. A loading indicator replaces or supplements the label only while a real submitted action is pending.

## Required Elements

Every Button requires an accurate visible label, a native `<button>` when it performs an in-place action, an accessible name, sufficient contrast, visible focus, and a touch-friendly target.

## Optional Elements

An approved Icon System icon, loading indicator, and a concise status relationship may be included when they clarify the verified action. Decorative icons must not create a second accessible name.

## Supported Variants

### Primary

The single highest-priority action in a local decision area, such as adding an available product to cart or submitting a completed Shopify form.

### Secondary

A meaningful alternate action that remains visually quieter than the primary action.

### Tertiary

A low-emphasis action used sparingly where its relationship to the primary action is already clear.

## Component-Specific Rules

### Action Semantics

Use an anchor for navigation and Button for an in-place action. Do not simulate a link with a button, nest interactive elements, use an empty label, or turn a non-action heading into a button.

### Availability

Disabled presentation is permitted only for a verified unavailable state, such as an unavailable selected variant. A disabled control must not be the only explanation of a recoverable requirement; nearby verified guidance should explain the next step when needed.

### Loading

Loading begins only after a real request or form submission begins and ends only after a verified response. It must not fabricate progress, success, or checkout completion, and it must prevent duplicate submission when the underlying operation requires that protection.

### Composition

Button may compose Icon System and Loading Spinner. It must not duplicate Icon Button, Buy Buttons, Quantity Selector, or Link ownership. Product and cart components retain the decision about whether an action belongs in their flow.

## Supported States

### Default

The action is available and communicates its hierarchy clearly.

### Hover and Focus

Pointer feedback is subtle; keyboard focus remains clearly visible and never relies on hover.

### Disabled

The action is unavailable for a verified reason and remains legible without pretending it can be activated.

### Loading

The underlying action is pending and duplicate activation is safely prevented.

### Complete or Error

Button itself does not claim outcome. The owning component uses its appropriate factual feedback mechanism after a verified result.

## Responsive Behaviour

Buttons must wrap long localized labels, maintain minimum touch targets, preserve source order, and avoid horizontal overflow at 320 px, browser zoom, and large-text settings. Full-width presentation may be selected by an owning section’s approved mobile variant, not by ad hoc CSS.

## Accessibility

Use native button semantics, a stable accessible name, visible focus, keyboard activation, WCAG 2.2 AA contrast, and non-color-only disabled or loading meaning. Do not move focus unexpectedly, use a live region for unchanged labels, or remove a focused button without a safe focus destination.

## Shopify Settings

Merchants may supply approved action labels, Shopify-resolved destinations where a link is appropriate, feature visibility, and documented hierarchy options.

The Design System controls height, spacing, typography, focus treatment, state styling, breakpoints, loading behavior, and motion. Shopify or the owning component controls availability, form submission, cart state, and checkout routing.

## Design Tokens

Button uses semantic action-surface, action-foreground, action-border, action-focus-ring, action-height, action-padding, action-gap, and action-radius tokens. Variants select approved semantic token sets rather than arbitrary colors.

## Motion Rules

State changes may use a brief, restrained color or opacity transition. Button must not bounce, pulse, flash, delay activation, or imply progress. Reduced-motion preferences remove nonessential transition.

## Performance Rules

Button is server-rendered where possible and requires no library. Dynamic loading state uses minimal event handling, avoids duplicate listeners across Theme Editor rerenders, and preserves normal form submission when JavaScript is unavailable.

## AI Guidelines

AI may select Button only for a verified, supported action with merchant-approved content and a known destination or operation. It must choose the least prominent valid hierarchy, reuse this primitive, and omit unsupported actions when uncertain.

AI must not invent calls to action, destinations, consent, availability, loading, success, or merchant claims; create multiple competing primary actions; or replace a semantic link with a Button.

## Quality Checklist

- The action is factual, concise, and unique in its local hierarchy.
- Native element choice matches the action.
- Focus, keyboard operation, touch target, contrast, disabled, and loading states are clear.
- The control works without JavaScript where the Shopify form or link supports it.
- No merchant-specific data or unsupported action is introduced.

## Future Compatibility

Future work may add a documented variant only after a demonstrated storefront need and accessibility review. Extensions must preserve semantic token ownership, native behavior, localization, stable labels, and deterministic AI selection rather than creating per-section button systems.
