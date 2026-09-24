# Tax Note

## Purpose

Tax Note communicates verified pricing-related tax inclusion, exclusion, or checkout calculation context.

It supports transparent expectations across Shopify markets without calculating tax, providing legal advice, or contradicting checkout behavior.

## Responsibilities

Tax Note is responsible for presenting market-aware verified wording about tax inclusion, exclusion, or calculation and an optional policy link.

Tax Note is not responsible for tax calculation, duty calculation, legal interpretation, visitor tax-status inference, market configuration, or checkout messaging.

## User Goals

Tax Note should help customers understand what the displayed price does or does not include before checkout, without mistaking contextual information for a legal guarantee.

## Merchant Goals

Tax Note should help merchants present Shopify, market, or approved legal configuration accurately and consistently without manual tax claims.

## Structure

Tax Note consists of verified localized tax wording.

Optional:

- verified duties or import-charge context
- supporting policy link
- Product Information or Cart Summary context

## Required Elements

Every shown Tax Note requires verified Shopify, market, merchant, or legal configuration and wording that matches actual checkout behavior.

## Optional Elements

Duties context and policy link may appear only when verified for the active market. Localization controls remain authoritative for market selection.

## Supported Variants

### Tax Included

Explains that displayed pricing includes verified tax context.

### Tax Excluded

Explains that applicable tax is not included in the displayed price.

### Calculated at Checkout

Explains that tax will be determined through checkout context.

### Duties Context

Appears only when verified and carefully qualified.

### Hidden

The note is absent when no accurate contextual statement is available.

## Component-Specific Rules

Tax Note must use localized verified wording, remain consistent with Price, Product Information, Cart Summary, Shopify markets, and checkout, and distinguish tax from duties and shipping.

Tax Note must not calculate tax, offer legal advice, guess visitor tax status, promise duty-free delivery, expose raw market configuration, or contradict Shopify checkout behavior.

## Supported States

### Available

Verified market-aware wording is displayed.

### Market Change

The note updates when verified market context changes without stale text.

### Unavailable

The note hides rather than guessing.

### Error

Failure does not block price or checkout; inaccurate wording is not shown.

## Responsive Behaviour

Tax Note should accommodate localized text, long policy names, browser zoom, and large text without crowding price or checkout actions or changing source order.

## Accessibility

Tax Note must use semantic HTML, readable text, visible focus for policy links, WCAG 2.2 AA contrast, and no color-only tax state. Dynamic market updates should use restrained announcements only when useful.

## Shopify Settings

Merchants may configure tax-note visibility and a verified supporting policy link where active Shopify market configuration supports it.

The Design System controls wording presentation, spacing, typography, focus, responsive behavior, update announcements, motion, and integration-failure behavior.

## Design Tokens

Tax Note should use tax-note-text, tax-note-link, tax-note-gap, tax-note-muted, tax-note-focus-ring, and tax-note-loading-surface tokens.

## Motion Rules

Tax Note should not animate by default. A restrained text-state transition may accompany a real market update; no attention-seeking finance or checkout animation is permitted, and reduced-motion preferences are respected.

## Performance Rules

Tax Note should prefer server-rendered Shopify market context, use minimal JavaScript for real market updates, avoid duplicate tax fetching and polling, preserve progressive enhancement, stable geometry, and Theme Editor resilience.

## AI Guidelines

AI should use Tax Note only with verified Shopify, market, merchant, or legal configuration; preserve localization; choose deterministic qualified wording; and hide unavailable context.

AI must not invent tax treatment, duties, legal advice, duty-free claims, market rules, or checkout promises.

## Quality Checklist

### Data

- Wording matches verified active-market and checkout behavior.
- Duties and tax are not conflated.

### Accessibility

- Text is readable, localized, and not color dependent.
- Policy links are named and keyboard accessible.

### Integrity

- No tax calculation, legal advice, or unsupported guarantee appears.

## Future Compatibility

Future Tax Note refinement should remain market-aware and configuration-led. New duties, currency, or legal context requires verified Shopify support, localization review, legal approval where appropriate, and a safe unavailable state.
