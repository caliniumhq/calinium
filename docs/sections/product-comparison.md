# Product comparison

## Purpose

Lets merchants compare two to four explicitly selected products with authored values. It does not infer product specifications or make metafield assumptions.

## Settings and block API

Configure heading content, card media ratio, vendor/Quick Add display, optional highlighted column, mobile sticky row heading, color scheme, and spacing. Add `product` blocks for columns. Add two to ten `feature` blocks with a row label, a value type (`text`, `check`, or `cross`), and one text value per product column.

## Product and cart behavior

The product overview uses canonical product cards. The table repeats only product names, prices, and merchant-authored comparison values for structural context; it does not recreate card controls. Any Quick Add remains the canonical safe action.

## Accessibility, performance, and empty state

Uses a real `table`, `thead`, `tbody`, scoped headers, and a labelled horizontal scroll wrapper on narrow screens. Check/cross values include localized text as well as an icon. The editor explains that at least two products are needed. There is no JavaScript.

## Limitation and dependencies

Uses product-card, price/icon primitives, section heading, and the commerce stylesheet. Values are intentionally manual so they remain accurate and merchant-controlled.
