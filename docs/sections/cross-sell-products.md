# Cross-sell products

## Purpose

Presents two to eight manually curated complementary items for a campaign or product-story context. It is explicitly merchant-curated, never algorithmic.

## Settings and block API

Configure heading content, `card_style` (Product grid or Compact rows), responsive columns, image ratio, vendor, badges, secondary image, Quick Add, color scheme, and spacing. Compact rows are a CSS presentation of the same canonical card, not a second card template. Each `product` block selects one product. Duplicate products are omitted, and the current product can be excluded on product templates.

## Cart, accessibility, and performance

All product content uses the canonical card and existing safe Quick Add. Server-rendered cards preserve working links without JavaScript, responsive media is lazy loaded, and semantic list markup works on keyboard and touch. The editor displays an empty direction when nothing is selected.

## Limitation and dependencies

Uses section heading, product-card, price, button/icon, spacing, and commerce CSS. It does not use Shopify recommendations or infer relationships.
