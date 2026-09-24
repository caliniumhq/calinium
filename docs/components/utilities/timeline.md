# Timeline

## Purpose

Timeline presents a verified chronological sequence of events or milestones without simulating live tracking, progress, or future certainty.

## Responsibilities

Timeline owns ordered event title, localized date or timestamp, description, and optional verified Status Indicator.

Timeline is not responsible for tracking logic, order fulfillment, customer data, status calculation, or decorative progress animation.

## User Goals

Timeline should help customers understand verified event order and current context.

## Merchant Goals

Timeline should help merchants present approved factual history or milestones without inventing dates or progress.

## Structure

Timeline consists of chronologically ordered events — required.

Optional: timestamp, description, Status Indicator, compact presentation.

## Required Elements

Every Timeline requires verified event order, meaningful title, localized date when available, and textual current/past/future context.

## Optional Elements

Status and supporting description may appear only from verified source data.

## Supported Variants

### Standard

Vertical ordered event sequence.

### Compact

Condensed factual event history.

### Incomplete or Delayed

Verified limitation or delay appears without invented completion time.

## Component-Specific Rules

Timeline must preserve chronological source order and reuse Status Indicator for concise state.

Timeline must not invent dates, milestones, real-time tracking, delivery progress, or decorative simulated movement.

## Supported States

### Past, Current, Future

Only verified temporal state is shown.

### Incomplete or Unavailable

Unknown events remain absent or neutrally qualified.

## Responsive Behaviour

Timeline should remain vertical, wrap localized dates safely, preserve reading order, and avoid overflow at narrow widths and zoom.

## Accessibility

Timeline must use semantic HTML, logical ordered-list structure where appropriate, WCAG 2.2 AA contrast, text not color alone, and visible focus for links.

## Shopify Settings

Merchants may configure approved verified event content, density, and optional status visibility.

The Design System controls spacing, connector treatment, date formatting presentation, focus, and breakpoints.

## Design Tokens

Timeline uses timeline-gap, timeline-marker, timeline-line, timeline-date, timeline-current, and timeline-status tokens.

## Motion Rules

Timeline should not animate progress or event arrival; reduced-motion preferences are respected.

## Performance Rules

Timeline should server render verified events, require no JavaScript, preserve progressive enhancement, use stable geometry, and avoid polling or observers.

## AI Guidelines

AI should select Timeline only for verified chronological content, choose deterministic ordering, localize dates, and omit unknown events.

AI must not invent events, dates, status, tracking, or completion.

## Quality Checklist

### Data

- Chronology and state are verified.

### Accessibility

- Order and current state are textual.

### Scope

- Timeline is not an order-tracking or progress system.

## Future Compatibility

Future Timeline work requires a verified event source and must preserve chronological semantics, privacy, and calm factual presentation.
