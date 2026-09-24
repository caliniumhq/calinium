# Error Page

## Purpose

Error Page communicates a full-page unavailable or failed destination while preserving a calm route back into the storefront.

It is useful for 404, unavailable resource, and safe server-failure contexts; it never exposes infrastructure, stack traces, sensitive data, or unsupported technical explanations.

## Responsibilities

Error Page owns page-level heading, concise accurate explanation, primary recovery action, optional secondary navigation, optional search, and preserved storefront navigation.

Error Page is not responsible for inline operation failure, Empty State, Maintenance State, customer authentication, technical diagnosis, or collecting customer data.

## User Goals

Error Page should help customers understand that a destination is unavailable and continue shopping, return, search, or contact real support.

## Merchant Goals

Error Page should help merchants retain brand calm and navigation continuity without composing custom error pages or exposing internal operation details.

## Structure

Error Page consists of page-level heading, concise explanation, and one primary recovery action — required.

Optional: reference identifier, secondary navigation, search, support path, and restrained contextual illustration.

## Required Elements

Every Error Page requires an accurate destination-level state, semantic heading, real recovery path, and preserved storefront navigation.

## Optional Elements

Reference identifier, search, support link, and secondary action may appear only when accurate and usable. Reference identifiers must not expose sensitive or internal data.

## Supported Variants

### Not Found

Requested 404 destination does not exist or is unavailable.

### Unavailable Resource

Known product, collection, page, or content cannot be shown.

### Server Failure

Safe generic failure with no unsupported diagnosis.

### Access Restricted

Shows only when the storefront can accurately identify a restricted destination and a real next route.

## Component-Specific Rules

Error Page must preserve Header/Footer or suitable navigation, use factual concise language, and make its primary action useful for the active storefront.

Error Page must not show stack traces, internal infrastructure, sensitive IDs, customer data, unsupported claims, blame, or panic-inducing visuals. It must not use Empty State to conceal failure or Maintenance State for an unknown outage.

## Supported States

### Not Found

Calm 404 context and recovery are available.

### Failed

Safe failure context with a verified route back to storefront content.

### Recovered

Customer has chosen a real navigation or retry action.

## Responsive Behaviour

Error Page should retain semantic heading hierarchy, readable measure, visible actions, and storefront navigation without overflow at 320 px, zoom, and large text settings.

## Accessibility

Error Page must use semantic HTML and page-level headings, WCAG 2.2 AA contrast, visible focus, keyboard-accessible recovery actions, logical reading order, and no automatic focus movement unless navigation itself requires it.

## Shopify Settings

Merchants may configure approved heading, concise explanation, real primary action, secondary navigation, support link, and restrained illustration where the error context supports them.

The Design System controls error hierarchy, layout, focus, contrast, icon treatment, responsive behavior, and motion.

## Design Tokens

Error Page should use error-page-space, error-page-heading, error-page-text, error-page-action-gap, error-page-illustration, and error-page-focus tokens.

## Motion Rules

Error Page should not animate urgently. A restrained static presentation or brief non-blocking transition is sufficient; reduced-motion preferences are respected.

## Performance Rules

Error Page should server render, require no JavaScript for core navigation, preserve progressive enhancement, avoid heavy assets, retain stable geometry, and never delay recovery actions or core storefront navigation.

## AI Guidelines

AI should choose Error Page only for verified destination-level failure, use deterministic calm wording, preserve navigation, and offer one real recovery route.

AI must not invent a cause, outage duration, technical details, support availability, or customer account state.

## Quality Checklist

### State

- Failure is destination-level, not empty or inline.
- Description is accurate without technical disclosure.

### Recovery

- Primary action returns to a usable real storefront path.
- Header or other navigation remains available.

### Accessibility

- Page heading and actions are semantic and keyboard accessible.
- No sensitive content is exposed.

## Future Compatibility

Future Error Page refinement should improve real Shopify error routes and recovery paths without becoming an outage dashboard, technical error reporter, or promotional landing page.
