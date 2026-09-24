# Pickup Availability

## Purpose

Pickup Availability communicates verified local pickup context for the currently selected purchasable variant.

It helps customers evaluate a real fulfillment option without inventing locations, distance, collection time, or checkout behavior.

## Responsibilities

Pickup Availability is responsible for verified selected-variant availability, concise location summary, unavailable/loading/error states, and a trigger to real expanded details.

Pickup Availability is not responsible for fulfillment configuration, location creation, distance calculation, collection-time promises, or checkout fulfillment selection.

## User Goals

Pickup Availability should help customers understand whether a selected variant may be collected locally and reach verified instructions when available.

## Merchant Goals

Pickup Availability should help merchants present Shopify-native pickup data without manually maintaining duplicate location or hours information.

## Structure

Pickup Availability consists of a verified selected-variant status and concise summary.

Optional:

- verified location name
- details trigger
- verified distance or hours context
- existing Drawer or Modal for expanded details

## Required Elements

Every shown Pickup Availability instance requires a selected purchasable variant, verified Shopify pickup data, clear status text, and accurate connection to expanded details when offered.

## Optional Elements

Location, distance, hours, pickup instructions, and detail triggers may appear only from verified data. Expanded details reuse Drawer or Modal rather than creating a new overlay.

## Supported Variants

### Available

Verified pickup summary and optional details trigger are shown.

### Unavailable

Neutral context states that pickup is unavailable for the selected variant.

### Loading

A restrained stable state appears while real data is resolving.

### Error

Technical failure is communicated safely without blocking product purchase.

## Component-Specific Rules

Pickup Availability must update when selected variant changes, distinguish pickup from shipping, and use verified location and instruction data.

Pickup Availability must not invent locations, infer distance, promise readiness time, modify fulfillment settings, or replace checkout selection.

## Supported States

### Available

Verified variant and location context render.

### Unavailable

Clear factual status remains visible or the component is omitted.

### Updating

Variant changes refresh the state without stale availability.

### Error

The component fails quietly while Buy Buttons remain usable.

## Responsive Behaviour

Pickup Availability should retain readable status, accessible trigger spacing, and stable DOM order at narrow widths, zoom, and large text settings.

## Accessibility

Pickup Availability must use semantic HTML, visible focus, keyboard-operable details trigger, WCAG 2.2 AA contrast, non-color-only status, and restrained live announcements for meaningful variant updates.

## Shopify Settings

Merchants may configure visibility and verified details-trigger wording where Shopify pickup data is available.

The Design System controls spacing, status treatment, trigger sizing, overlay behavior, updates, breakpoints, and motion timing.

## Design Tokens

Pickup Availability should use pickup-gap, pickup-status, pickup-link, pickup-icon-size, pickup-focus-ring, and pickup-loading-surface tokens.

## Motion Rules

Loading and status changes may use brief restrained transitions. No map animation, urgency signal, or automatic overlay opening is permitted; reduced-motion preferences are respected.

## Performance Rules

Pickup Availability should prefer server-rendered initial content, use event-driven variant updates, defer expanded-detail work, avoid polling and duplicate requests, preserve progressive enhancement, and remain stable through Theme Editor rerenders.

## AI Guidelines

AI should use Pickup Availability only with verified Shopify data, preserve selected-variant dependency, choose deterministic factual wording, and omit uncertain information.

AI must not invent locations, distances, hours, pickup times, or fulfillment guarantees.

## Quality Checklist

### Data

- Selected variant and pickup data are verified.
- Shipping and pickup are clearly distinguished.

### Accessibility

- Status is textual and detail trigger is keyboard accessible.
- Updates are calm and non-disruptive.

### Resilience

- Missing or failed pickup data never blocks purchasing.

## Future Compatibility

Future Pickup Availability refinement should follow verified Shopify capability and reuse existing Overlay components. New location detail, timing, or map behavior requires data accuracy, privacy review, and graceful failure handling.
