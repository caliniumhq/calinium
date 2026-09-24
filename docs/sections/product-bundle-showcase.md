# Product bundle showcase

## Purpose

Shows two to five products commonly considered together. It is a curated merchandising display, not a discount engine or Shopify-native bundle claim.

## Settings and block API

Configure heading/description, responsive columns, image ratio, vendor, secondary image, standard Quick Add, optional destination link, color scheme, and spacing. Each `product` block selects one item; duplicate product selections are omitted.

## Product and cart behavior

Items use canonical cards. The displayed subtotal is labelled **Available items subtotal** and sums only first/default available variants used for display; it makes no inventory or discount promise. There is no multi-item add button. Single variants can use normal Quick Add; multi-variant products link to safe product-page selection.

## Accessibility, performance, and empty state

The product grid, subtotal label, and optional link are server-rendered. Cards retain their accessible price/status semantics and lazy responsive images. The editor gives an empty guidance state.

## Limitation and dependencies

Depends on `product-card`, price, button, section heading, and shared commerce CSS. It cannot apply a bundle discount or atomically add multi-variant products without a separate, supported cart/variant architecture.
