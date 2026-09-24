# Product carousel

## Purpose

Displays a deliberately limited collection selection in a native horizontally scrollable product rail. Use it for a curated product moment rather than a replacement for a collection page.

## Settings and product behavior

Select a collection, heading content, product limit, desktop columns, mobile swipe, controls, image ratio, card options, View all link, color scheme, and spacing. Every item uses `product-card`, including its localized price, badges, media behavior, and safe Quick Add rules.

## Accessibility, performance, and empty state

The product list and product links work without JavaScript. JavaScript only reveals carousel controls and adds keyboard-arrow/button scrolling. It uses responsive lazy images and caps output at twelve products. In the editor an unselected or empty collection explains what to configure; storefront output stays clean when there is no collection content.

## Dependencies and limitation

Depends on `section-heading`, `product-card`, button/icon primitives, `ScrollCarousel`, and `section-commerce-pack.css`. Multi-variant products link to their product page rather than choosing a variant automatically.
