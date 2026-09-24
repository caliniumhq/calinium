# Complementary products

## Purpose

Displays Shopify-supported complementary products on a product template. It is separate from related recommendations because it requests `intent=complementary`.

## Settings and fallback block API

Configure heading content, result limit, responsive columns, ratio, vendor/badges/secondary image/Quick Add, color scheme, and spacing. Optional `fallback_product` blocks supply explicit products if the platform returns no complementary data. Fallback selections are de-duplicated and exclude the current product.

## Product, cart, and empty behavior

Both endpoint results and fallback products render canonical cards. Cards reuse standard single-variant Quick Add and safe multi-variant product-page fallback. The section requests Shopify once when necessary, otherwise preserves rendered results; it collapses cleanly if neither source produces items.

## Accessibility, performance, and limitation

The loading state is labelled, all content is a semantic list, requests abort during section unload, and hidden tabs defer work. Availability depends on Shopify's complementary-product data; the manual fallback is labelled/documented as a merchant fallback rather than an algorithm.
