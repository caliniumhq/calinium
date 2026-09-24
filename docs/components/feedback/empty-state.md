# Empty State

## Purpose

Empty State explains that expected content loaded successfully but contains no items. It offers calm orientation and one relevant next action without concealing loading, error, or unavailable states.

## Responsibilities

Empty State owns clear empty heading, concise explanation, optional neutral illustration, and one primary recovery or discovery action.

Empty State is not responsible for loading feedback, error reporting, fake recommendations, customer blame, Placeholder Image geometry, or page-specific commerce logic.

## User Goals

Empty State should help customers understand why a region has no content and what they can do next.

## Merchant Goals

Empty State should help merchants present cart, wishlist, account, collection, search, or content absence consistently without invented products or urgency.

## Structure

Empty State consists of clear heading and concise explanation — required.

Optional: neutral icon or illustration, one primary action, and one secondary link.

## Required Elements

Every Empty State requires a verified successful-empty condition, clear language, and no misleading content or fabricated recommendation.

## Optional Elements

Illustration, action, and secondary link may appear only when they guide a real next step. Placeholder Image may support visual geometry but does not replace Empty State meaning.

## Supported Variants

### First Use

No items exist yet in a feature with a real creation or discovery path.

### Cleared Content

Previously expected content is absent after a verified customer action.

### Search No Results

Query completed with no matches; a clear revision or browse path may be shown.

### Cart, Account, Wishlist, Collection, or Content

Parent context determines accurate wording and action.

## Component-Specific Rules

Empty State must distinguish successful absence from loading, error, and unavailable state; keep its illustration subordinate; and use one real primary action.

Empty State must not hide a failure, fabricate products or recommendations, shame customers, create urgency, or show artwork that overwhelms the message.

## Supported States

### Empty

Verified empty content is explained.

### First Use

New customer or merchant context is explained without assumption.

### Search No Results

Completed search absence is shown with a real browse or revision path.

### Replaced

Empty State is removed when actual content becomes available.

## Responsive Behaviour

Empty State should preserve generous whitespace without becoming a void, maintain readable actions, wrap localized content safely, and avoid horizontal overflow at 320 px, zoom, and large text.

## Accessibility

Empty State must use semantic HTML and heading structure, text that conveys absence without illustration, WCAG 2.2 AA contrast, visible focus, keyboard actions, and no unnecessary live announcement for static content.

## Shopify Settings

Merchants may configure approved heading, explanation, neutral illustration, primary action label and destination, secondary link, and visibility where the parent context supports them.

The Design System controls illustration scale, spacing, hierarchy, focus, breakpoints, contrast, and motion.

## Design Tokens

Empty State should use empty-state-space, empty-state-heading, empty-state-text, empty-state-illustration, empty-state-action-gap, and empty-state-focus tokens.

## Motion Rules

Empty State should not animate decoratively. A restrained content transition is allowed when real content replaces it; reduced-motion preferences are respected.

## Performance Rules

Empty State should be server-rendered where possible, use no required JavaScript, preserve progressive enhancement, avoid heavy media and layout shift, and remain stable in Theme Editor contexts.

## AI Guidelines

AI should distinguish empty from loading, error, and unavailable state; use concise factual wording; select one verified next action; preserve localization and customer dignity; and generate deterministic context-led composition.

AI must not invent recommendations, cart contents, customer history, reasons for absence, or urgency.

## Quality Checklist

### State

- Content truly loaded successfully but has no items.
- Error and loading are not concealed.

### Recovery

- Primary action is real and context-appropriate.
- The customer is not blamed or pressured.

### Accessibility

- Heading and text remain meaningful without decorative media.
- Actions are keyboard accessible.

## Future Compatibility

Future Empty State refinement should improve demonstrated Shopify contexts without becoming a recommendation, promotion, loading, or error framework. New illustrations or actions require a real customer task and performance-safe fallback.
