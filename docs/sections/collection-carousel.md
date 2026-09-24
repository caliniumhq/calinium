# Collection carousel

## Purpose

Provides a visual category rail for two to twelve merchant-selected collections. It differs from a static collection grid by retaining native horizontal browsing and optional enhanced controls.

## Settings and block API

Section settings include heading content, desktop card columns, mobile swipe, ratio, text placement, product count, arrows, pagination, View all, color scheme, and spacing. Each `collection` block accepts a collection plus optional image, title, description, and link label. A custom image/title takes precedence within the existing `collection-card` API.

## Accessibility, performance, and empty state

Collection links are ordinary links without JavaScript; enhanced controls are real buttons and appear only after initialization. Responsive images reserve their ratio and are lazy loaded. Missing collection images use the existing card fallback; the editor has an add-block placeholder.

## Dependencies and limitation

Uses `collection-card`, responsive image, section heading, button/icon primitives, and the shared scroll carousel. It intentionally does not render product cards.
