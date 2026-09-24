# Product highlights

## Purpose

Merchandises one selected product with a narrative excerpt and two to six icon-led benefits.

## Settings and block API

Select the product, media side, contained/full presentation, image ratio, vendor, secondary image, Quick Add, heading content, color scheme, and spacing. Each `highlight` block accepts canonical `icon`, heading, and short text.

## Product and cart behavior

The selected product is rendered through the canonical product card rather than a simplified product form. Price, availability, Quick Add, and variant safety therefore stay consistent across the theme. The description excerpt is informational only.

## Accessibility, performance, and empty state

Icons are decorative when paired with text. The section is server-rendered, keyboard-safe, responsive, and uses lazy responsive media. In the editor it clearly requests a product selection; storefront output is quiet when none exists.

## Dependencies and limitation

Uses product-card, icon, section-heading, rich-text/spacing conventions, and shared commerce CSS. It does not add a new variant selector.
