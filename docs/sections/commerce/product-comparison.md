# Product Comparison

## Purpose

Product Comparison is a bounded, merchant-authored comparison of two to four real Shopify products using manually verified feature values. It supports a deliberate product decision without inferring specifications, replacing Main Product, or becoming a generic data-table platform.

**Currently implemented:** `product-comparison` renders selected Product Cards and a semantic table when at least two product blocks are selected.

## Customer Goals

Customers should be able to identify the compared products, understand factual differences by feature, recognize unavailable information, and follow a normal product link or the shared safe Quick Add path where it is offered. The table must remain readable on small screens, keyboard accessible, factual, and calm.

## Merchant Goals

Merchants should select two to four real products, define up to ten verified comparison features, maintain the exact column order, choose a truly relevant highlighted product, and omit the table when it does not answer a customer decision. They do not derive values automatically from product descriptions, variants, metafields, competitors, or images.

## Shopify Context

The runtime section ID is `product-comparison`, with up to four `product` blocks and up to ten `feature` blocks. Canonical contexts are a Product Page after `main-product`, a Standard Page buying guide, and a Homepage only when a specific comparison is central to the merchant’s strategy. Collection Page use is exceptional and must not compete with browse architecture.

It is prohibited as a normal Cart, Search, Contact, Blog index, Article, 404, account, checkout, or global-shell region. It must not replace `main-product`, Product Page specifications, a collection grid, filters, sort, pagination, search, or recommendation behavior.

## Responsibilities

Product Comparison owns selected product columns, merchant-authored comparison rows, local feature hierarchy, an optional visually highlighted selected column, horizontal-table containment, and Product Card presentation. It owns factual comparison presentation, not fact discovery.

## Boundaries

It does not own product data authority, product gallery, variant selection, SKU/inventory management, full product specification architecture, Product Page purchase form, related products, recommendations, cross-sell, bundles, collection browsing, or product-review claims. Product Card owns product route, price, availability, and optional shared Quick Add.

It must not infer a value from an absent field, turn subjective copy into a check mark, use a dash to conceal unknown facts, or use a highlighted column to imply recommendation, best value, certification, or superior performance without verified merchant content elsewhere.

## Section Structure

```text
Product Comparison
├── Optional Section Heading (H2 or lower)
├── Product blocks → Product Cards
└── Optional comparison table
    ├── Details column heading
    └── Feature blocks → row label + one value/type per rendered product column
```

**Currently implemented:** customer-facing output requires at least two selected products. The table is emitted only when feature blocks exist. Values may be text, a labelled check, a labelled cross, or a visible dash with visually hidden “not available” text.

## Required Blocks

The implemented `product` block has the `product` setting and is limited to four. A canonical comparison requires two to four distinct, real selected products. The implemented `feature` block is limited to ten and has `label`, `value_1` through `value_4`, and `value_type_1` through `value_type_4`.

Each product product-block needs a selected product; each rendered feature needs a verified label and a verified value or intentionally documented unavailable state for every rendered column. The schema does not currently deduplicate selected products; canonical authoring must.

## Optional Blocks

No optional block type is implemented. Feature rows are optional as a group, but a product-card-only comparison is usually insufficient for this section’s purpose; omit the section or add verified rows instead of rendering a nominal comparison.

## Block Composition

Product blocks are repeatable to four and feature blocks to ten. Their source order determines product display order and the feature-table row order. Critically, `value_1`–`value_4` map to the **rendered selected-product index**, not an immutable product-block ID; adding, removing, or leaving a product unselected can change a feature value’s displayed column. Merchants must review every row after product-block changes.

Use one primary comparison per page. Place it after primary product orientation and before deeper proof, recommendations, or closing CTA. Do not place another comparison table adjacent to it or duplicate its rows in Product Highlights, main product content, Materials, or FAQ.

## Component Dependencies

The audited runtime uses `Section Heading`, `Product Card`, `Responsive Image`, `Price`, `Icon System`, `Button`, `section-spacing`, and optional shared `product-form.js`/quantity-input styling when `enable_quick_add` is enabled. It has no dedicated comparison JavaScript controller.

The current table is section-owned markup; Product Card and Product Form remain shared primitives and runtime owners.

## Content Rules

Every label and value must reflect verified merchant information for the exact selected product. Use comparable units, parallel wording, and consistent scope. Use text for meaningful distinctions; use `check` or `cross` only when the binary statement is factually supportable. A blank value renders unavailable, not “no” or “included.”

Do not invent specifications, values, compatibility, certifications, savings, environmental claims, stock, ratings, or product superiority. Do not compare products that are not materially comparable, and do not use a manual feature table to mask variant-level differences that require the Product Page.

## Asset Requirements

Selected products supply their own Shopify media through Product Card. The stable `image_ratio` setting supports `square`, `portrait`, and `landscape`; no comparison-row image, logo, badge, diagram, or uploaded data source is implemented. Media must be real product media and must not be used as proof of an unverified comparison claim.

## Supported Variants

- **Two, three, or four product columns:** **Currently implemented** through repeatable product blocks; choose only distinct products that customers can meaningfully compare.
- **Text, included, or not-included feature values:** **Currently implemented** through `value_type_1`–`value_type_4`; choose the exact verified representation.
- **Highlighted product column:** **Currently implemented** through `highlighted_product`; use only as visual orientation, not as an unsupported endorsement.
- **Sticky first feature column:** **Currently implemented** through `sticky_first_column`; use for long horizontal tables after small-screen testing.
- **Card image treatments and optional safe Quick Add:** **Currently implemented** through section settings.

There is no implemented automatic-spec, variant-comparison, sortable table, filter, recommendation, or dynamic data variant.

## Supported States

- **Fully configured:** two to four distinct products and verified feature rows render cards and a table.
- **Products selected, no feature blocks:** Product Cards render, but the table does not; canonical generation should normally omit this incomplete comparison.
- **Fewer than two selected products:** Theme Editor shows a localized empty message; storefront output is quiet.
- **Missing feature value:** current output communicates not available; it must never imply a negative claim.
- **Duplicate product selection:** technically possible in current schema; invalid canonical authoring and a review requirement.
- **Sold out or unavailable product:** Product Card presents Shopify-derived state; manual rows must not contradict it.
- **No JavaScript / reduced motion:** table and normal product links work without a local controller or motion.

## Theme Editor Settings

**Currently implemented stable section IDs:** `eyebrow`, `heading`, `description`, `heading_size`, `text_alignment`, `first_column_heading`, `highlighted_product`, `sticky_first_column`, `image_ratio`, `show_vendor`, `enable_quick_add`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

**Currently implemented `product` block ID:** `product`. **Currently implemented `feature` block IDs:** `label`, `value_1`, `value_type_1`, `value_2`, `value_type_2`, `value_3`, `value_type_3`, `value_4`, and `value_type_4`. The Theme Editor allows add/remove/reorder/duplicate up to the schema limits. It has no dedicated controller, app-block support, or automatic feature validation. Block reordering requires a complete value-column review.

## Responsive Behaviour

The audited table is inside a horizontal scroll container with a minimum table width of 46rem; its visual product-card row uses the count of selected products. CSS can make body-row headers sticky with `inset-inline-start` when enabled. The contract requires a visible, operable horizontal scroll path at 320 px, no page-level overflow, logical reading order, readable cells at zoom, long translation resilience, touch-safe product controls, and RTL QA.

The header’s first column is not evidenced as sticky in the audited CSS. Complete RTL, 400% zoom, and screen-reader table navigation remain **Target behavior** pending manual QA.

## Accessibility

The target is WCAG 2.2 AA. **Currently implemented:** semantic `table`, column and row `scope` headers, a focusable scroll wrapper with local label, decorative icons inside labelled `role="img"` spans, visual/unavailable text pairing, Product Card links, and shared focus styles. The local heading is H2 or lower.

**Implementation gap:** the table itself has no audited caption or explicit programmatic name. Future hardening must establish a table-name pattern without duplicating the section heading. Do not rely on a check, cross, highlight color, or column position alone. Verify keyboard scroll, table reading, sticky-column behavior, RTL, and zoom manually.

## SEO and Structured Data

The section may add factual comparative text and real product links. It does not own page H1, metadata, canonical URL, Product, Offer, Review, Comparison, ItemList, Organization, or WebPage schema. Do not create schema merely because a table appears, and do not turn values into keyword-stuffed or unsupported comparative claims.

## Performance Rules

Product Card images are lazy and responsive. The table has no local JavaScript, so it progressively renders as HTML; horizontal containment avoids forcing a compressed unreadable grid. Keep products at four or fewer and feature rows at ten or fewer, use no extra controllers, and avoid duplicate comparison tables. Optional Quick Add must retain the shared bounded product-form lifecycle.

## Motion Rules

No local animation, autoplay, timer, or controller is implemented. Sticky behavior is positional, not motion. Do not add animated column changes, pulsing highlighted products, or movement that makes comparison values harder to read. Shared primitive motion must honor reduced motion.

## AI Guidelines

AI may select Product Comparison only when a page permits it, two to four approved distinct products serve a real decision, and verified comparison values exist for the rendered columns. It must preserve product order, populate every feature row deliberately, use `check`/`cross` only for verified binary facts, and revalidate the value mapping after any block change.

AI must not infer values from imagery, descriptions, variants, or competitor data; fabricate unavailable values; duplicate products; generate a product ranking; create a new purchase form; or replace Main Product, product specs, collection browsing, recommendations, or Search.

## Implementation Audit

**Source evidence inspected:** `product-comparison.md`, `premium-product.md`, `commerce-merchandising-pack.md`, and relevant merchandising behavior briefs.

**Runtime evidence inspected:** `apps/theme/sections/product-comparison.liquid` schema/preset; Product Card, Product Form, icon, image, price, and button dependencies; `section-commerce-pack.css`; global assets; strategy/capability mappings; compatibility recipes; and relevant Page Specifications.

**Currently implemented:** two-product threshold, blocks and schema limits, Product Card row, manual feature values, semantic table/header scopes, binary icon labels, unavailable fallback, horizontal containment, and optional safe Quick Add. **Partially implemented:** the schema allows duplicate products and column values are coupled to rendered order. **Not implemented:** automatic facts, dynamic variant comparison, sortable behavior, table caption pattern, and controller lifecycle. **Unknown:** full RTL, zoom, and screen-reader table QA. No direct audited JSON-template assignment was found.

## Quality Checklist

- [x] Owns manual factual comparison only.
- [x] Keeps Product Page, products, product data, recommendations, and bundles outside its authority.
- [x] Documents real product/feature blocks, rendered-order value mapping, limits, states, and authoring safeguards.
- [x] Preserves semantic table, native fallback, responsive containment, and shared Product Card/Form boundaries.
- [x] Requires deterministic, verified, non-inferential AI generation.

## Future Compatibility

Preserve the `product-comparison` runtime ID, `product` and `feature` block types, all listed setting and value IDs, schema limits, rendered product order, Product Card interface, and static table fallback. Future changes may introduce validation against duplicate products, safer stable column identity, a caption pattern, and accessibility QA without altering existing merchant values silently.

It must not evolve into an auto-generated specification engine, recommendation model, shopping cart workflow, or substitute for Main Product architecture.
