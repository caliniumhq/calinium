# 05 — Theme Engine

The Calinium theme is an Online Store 2.0 implementation rooted at `apps/theme/`. The AI lifecycle plans configuration for this runtime; it does not replace the runtime. See the [folder structure](diagrams/folder-structure.md) and [Repository Restructure v1.0](repository-restructure.md).

## Shopify structure

| Directory | Responsibility |
| --- | --- |
| `apps/theme/layout/` | The theme document shell and shared asset inclusion. |
| `apps/theme/templates/` | JSON templates for storefront routes and page composition. |
| `apps/theme/sections/` | Merchant-addable Shopify sections with schema, presets, and blocks. |
| `apps/theme/snippets/` | Shared Liquid primitives and lower-level components. |
| `apps/theme/assets/` | Token-based CSS and progressively enhanced JavaScript. |
| `apps/theme/locales/` | Storefront and schema translations. |
| `apps/theme/config/settings_schema.json` | Global Theme Editor settings contract. |
| `apps/theme/config/settings_data.json` | Merchant configuration data; never reset by the planning layers. |

The runtime contains 72 section files; the capability mapping catalog presently profiles 70 installed section IDs. The catalog’s explicit coverage and source tracing—not a file-count assumption—controls AI selection.

## Shared primitives

`apps/theme/snippets/product-card.liquid` is the canonical product-card implementation. It delegates image, price, product-form, badges, and quick-add behavior to existing components rather than allowing duplicated section markup. The canonical icon renderer is `apps/theme/snippets/icon.liquid`, with a validated 98-icon registry. Other shared primitives include button, responsive image, section heading, rich text, media item, loading spinner, feature, statistic, logo, testimonial, timeline, and hotspot support. See the root [primitive reference](../../README.md) and [icon system](../components/icon-system.md).

The [Premium Header System](../sections/premium-header.md) is the canonical OS 2.0 header and announcement implementation. It preserves navigation, cart, predictive-search, customer-account, localization, Theme Editor, and no-JavaScript boundaries while keeping its merchant settings traceable in the theme capability catalogs.

The [Homepage Bootstrap](../sections/homepage-bootstrap.md) supplies the canonical resource-free `templates/index.json` baseline. Generated packages begin from it, merge only approved configuration, and preserve the separate 404 template.

The stable `full-screen-hero` section is documented as the [Premium Hero](../sections/premium-hero.md). It is the canonical homepage hero for image, responsive-image, video, slideshow, split, text-only, product-led, and collection-led directions. Older hero section IDs remain compatibility surfaces for historical templates and snapshots; new bootstrap and generated hero configuration target the canonical section.

Approved runtime changes are pinned in a versioned archive and checksum manifest under `.calinium-checkpoints/`. Integrity validators compare every runtime file to that explicit baseline; the baseline is never advanced automatically by generation or validation.

## Editorial, commerce, and brand systems

The section library includes foundational sections plus additive editorial/hero, commerce/merchandising, and brand/storytelling packs. Each pack uses presets, localized schema labels, merchant-safe block structures, responsive images, color schemes, section spacing, and Theme Editor attributes. Pack-level documentation remains in [docs/sections](../sections/).

## Performance and progressive enhancement

Liquid renders semantic baseline content. Shared CSS uses Calinium tokens for color, typography, spacing, radius, motion, and responsive layout. JavaScript is event-driven, section-scoped where possible, and supports Shopify section load/unload/reorder/block selection conventions. Media uses Shopify image APIs and responsive sizing; below-the-fold media can lazy load. Motion-sensitive controls respect `prefers-reduced-motion`.

## Accessibility and SEO posture

The component system avoids nested interactive controls and uses semantic headings, links, buttons, labels, focus styles, accessible states, and meaningful media alternatives. Product cards, accordions, carousels, video controls, and visual comparisons are designed for keyboard and screen-reader use. Server-rendered, semantic Liquid and Shopify-native URLs/images provide the foundation for crawlable content; content claims remain merchant controlled.

## Merchant preservation

Existing template composition, section IDs, saved settings, and `settings_data.json` are merchant-owned. New sections are additive and available through presets; planning and review workflows do not change theme runtime. See [security](07-security.md) and [review/deployment](06-review-deployment.md).
