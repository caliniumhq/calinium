# Trust Badge

## Purpose

Trust Badge presents one concise, verifiable reassurance or policy statement.

It supports quiet confidence around a product or purchase decision without imitating certification, creating a wall of icons, or using unsupported guarantees.

## Responsibilities

Trust Badge is responsible for presenting verified merchant, policy, provider, warranty, shipping, returns, craftsmanship, or support context with an optional supporting link.

Trust Badge is not responsible for certification verification, payment security implementation, policy content, product claims, Badge status behavior, or Icon System rendering.

## User Goals

Trust Badge should help customers find a concise factual reassurance without distracting from product title, price, variants, and Buy Buttons.

## Merchant Goals

Trust Badge should help merchants select approved, policy-backed reassurance statements without manually styling claims or overstating trust.

## Structure

Trust Badge consists of a concise verified statement.

Optional:

- verified supporting icon
- supporting policy or provider link
- compact inline grouping

## Required Elements

Every Trust Badge requires a verifiable factual statement and a source or policy basis. If verification is unavailable, it is not shown.

## Optional Elements

An icon or link may appear when it improves understanding. Full policy text belongs at its destination, not inside the badge.

## Supported Variants

### Inline

Concise reassurance appears beside related commerce information.

### Compact

Small factual context supports a purchase area without visual dominance.

### Linked

A named link leads to the real policy or verified provider information.

### Grouped

A limited related group may appear when each claim is distinct and verified.

## Component-Specific Rules

Trust Badge must use concise factual wording, verified source context, and no more badges than the customer task needs.

Trust Badge must not imply independent certification without proof, claim “100% secure,” fabricate warranty or sustainability claims, repeat full policy text, bounce, pulse, or overpower primary product content.

## Supported States

### Available

Verified reassurance displays.

### Linked

Supporting policy or provider destination is available with visible focus.

### Unavailable

The claim is omitted when it cannot be verified.

## Responsive Behaviour

Trust Badge should wrap through a Cluster or Stack, preserve readable factual text, and keep links touch friendly without obscuring purchase controls.

## Accessibility

Trust Badge must use semantic HTML, text that communicates claim independently of icon or color, WCAG 2.2 AA contrast, accessible named links, and decorative icons hidden from screen readers where text is equivalent.

## Shopify Settings

Merchants may configure visibility, approved verified statement, compact or inline presentation, optional verified icon, and supporting link.

The Design System controls grouping limit, hierarchy, spacing, icon size, contrast, focus styling, breakpoints, and motion timing.

## Design Tokens

Trust Badge should use trust-gap, trust-text, trust-icon, trust-link, trust-border, and trust-focus-ring tokens.

## Motion Rules

Trust Badge should not animate by default. Brief focus or link-state transition is permitted; no pulsing, flashing, bouncing, or pressure-driven motion is allowed, and reduced-motion preferences are respected.

## Performance Rules

Trust Badge should use server-rendered merchant or policy data, minimal markup, no external badge scripts, stable geometry, and progressive enhancement for links. It must not block purchasing or duplicate messages across contexts.

## AI Guidelines

AI should select the smallest verified reassurance needed, preserve policy and provider source ownership, use deterministic calm wording, and omit unverified claims.

AI must not invent guarantees, certifications, secure-payment claims, sustainability claims, support promises, or badge groups.

## Quality Checklist

### Data

- Claim has an approved verifiable source.
- Link points to real supporting information when shown.

### Hierarchy

- Trust remains secondary to product decision controls.
- Grouping is limited and quiet.

### Accessibility

- Text, not icon or color, communicates meaning.
- Links remain accessible and focused.

## Future Compatibility

Future Trust Badge refinement should remain claim-safe and policy-backed. New category, icon, or group behavior requires verification, legal and merchant approval where appropriate, and no dark-pattern treatment.
