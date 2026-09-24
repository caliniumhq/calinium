# Copy Button

## Purpose

Copy Button copies one verified, expected value and gives compact local success or failure feedback. It never exposes hidden, sensitive, or unexpected content.

## Responsibilities

Copy Button owns explicit copy action, clipboard invocation, actual result feedback, accessible label, and safe fallback.

Copy Button is not responsible for value generation, customer data, secret management, global Toast feedback, or clipboard persistence.

## User Goals

Copy Button should help customers copy a clearly visible expected value confidently.

## Merchant Goals

Copy Button should help merchants offer a verified copy interaction without external libraries or misleading success claims.

## Structure

Copy Button consists of named button and verified source value — required.

Optional: Icon Button presentation and compact Inline Message result.

## Required Elements

Every Copy Button requires visible or clearly identified source value, explicit intent, secure-context-aware clipboard handling, and actual success/failure result.

## Optional Elements

Icon treatment and short copied feedback may appear when accessible and non-disruptive.

## Supported Variants

### Text Button or Icon Button

Clear copy action with accessible name.

### Available or Unavailable

Clipboard support and source availability are accurately represented.

## Component-Specific Rules

Copy Button must copy only verified expected content, confirm only after success, and use Inline Message rather than global Toast for compact local feedback.

Copy Button must not copy hidden content, secrets, tokens, internal IDs, or private customer data; it must not claim success before clipboard operation succeeds.

## Supported States

### Ready, Copying, Copied, Error, Unavailable

Current state is textual and accurate. Repeated copy remains supported.

## Responsive Behaviour

Copy Button should retain clear label, touch target, and source relationship at narrow widths and zoom.

## Accessibility

Copy Button must use semantic HTML and button behavior, keyboard access, visible focus, WCAG 2.2 AA contrast, named state feedback, and restrained `role="status"` announcement.

## Shopify Settings

Merchants may configure visible verified source and approved label where parent context supports it.

The Design System controls source association, button style, result timing, focus, touch size, breakpoints, and motion.

## Design Tokens

Copy Button uses copy-control-size, copy-gap, copy-success, copy-error, copy-focus-ring, and copy-feedback tokens.

## Motion Rules

Brief result confirmation is allowed; no repeated animation or reduced-motion violation is permitted.

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

Copy Button should use native clipboard API with progressive enhancement fallback, minimal JavaScript, no external library, no polling, and listener cleanup on rerender.

## AI Guidelines

AI should add Copy Button only for a verified non-sensitive value with real customer need, select deterministic feedback, and preserve privacy.

AI must not expose private data, secrets, tokens, or invent copyable content.

## Quality Checklist

### Integrity

- Source is expected, visible, and safe.

### Feedback

- Success follows actual clipboard result.

### Accessibility

- Control and result are named and keyboard accessible.

## Future Compatibility

Future Copy Button refinement requires a secure, privacy-safe source contract and must remain local feedback—not a general data export system.
