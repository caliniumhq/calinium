# Recently Viewed Products

## Purpose

Recently Viewed Products renders products recorded by the same browser’s local viewing history. It is browser-local discovery—not a Shopify account record, recommendation algorithm, personalization service, cross-device profile, or store popularity signal.

**Currently implemented:** `recently-viewed-products` stores validated product handles in `localStorage` under `calinium:recently-viewed:v1`, then requests its own section HTML with those handles.

## Customer Goals

Customers should be able to return to products they genuinely viewed in this browser, see real current Shopify product data, and encounter no fabricated history or misleading persistence claim. Clearing browser data may remove the list without affecting shopping access.

## Merchant Goals

Merchants can control local heading/card presentation and result count but cannot prepopulate, select, rank, recover, synchronize, or inspect a customer’s browser-local history. They should omit the section when local-history discovery is not appropriate.

## Shopify Context

The stable runtime ID is `recently-viewed-products`; its schema is enabled only on product templates, has no blocks, and the canonical `product.json` includes it after Product Recommendations. It has no authenticated customer or Admin API dependency.

It is not currently a Homepage, Cart, Collection, Standard Page, Search, Contact, Blog, Article, 404, account, checkout, or global-shell region. Cart may gain a separately approved local-history architecture later; this Product Page section must not be moved there automatically.

## Responsibilities

**Renderer contract:** owns heading, spinner shell, fetched Product Card list, responsive layout, no-result omission, and local lifecycle cleanup.

**Source-behaviour contract:** owns browser-local normalized handle history, insertion order, history cap, current-product exclusion, and a Section Rendering API-style HTML request. It does not own customer identity or recommendation relevance.

## Boundaries

It does not own account history, cross-device sync, server-side profiles, analytics, cookies, consent UI, recommendation ranking, product creation, recovery of cleared storage, merchant curation, cart behavior, or Personalization schema. The Product Card renderer does not grant access to a customer’s identity.

The section’s heading may say “Recently viewed” only while its source remains genuinely browser-local history. It must not imply that the store remembers a customer across browsers or devices.

## Section Structure

```text
Recently Viewed Products
├── Optional Section Heading (H2 or lower)
└── Local-history renderer
    ├── Browser history → normalized handles
    ├── Deferred HTML request → Product Card list
    ├── No valid handles/result/failure → hidden outside design mode
    └── Initial shell → labelled loading spinner
```

The controller records the current `product.handle`, prepends it after removing its prior occurrence, caps history at 24, then requests up to `products_to_show` prior handles. It requests `request.path` with `section_id=<section.id>` and `recently_viewed_handles=<comma-separated handles>`; Liquid resolves valid entries through `all_products`.

## Required Blocks

No blocks are implemented. A customer-visible list requires valid prior browser-local handles and real corresponding Shopify products. The `products_to_show` range is 2–8; controller request size is bounded to that configured limit.

## Optional Blocks

No optional blocks are implemented. Heading and Product Card presentation are settings, not product/fallback/history blocks. There is no merchant fallback list.

## Block Composition

Not applicable. The source order is newest browser-local handle first, excluding the current product before display. `readHistory` accepts only lower-case hyphenated-handle-shaped strings, removes duplicate values with `Set`, and retains at most 24; it does not perform an audited case-conversion step. Liquid rechecks valid products, de-duplicates rendered handles, and excludes the current product.

Use one Recently Viewed instance per Product Page, after `main-product` and any distinct related rail. Do not repeat it beside another recently-viewed renderer or use it to populate other rails. The product template contains one instance.

## Component Dependencies

- **Documented component dependencies:** `Section Heading`, `Product Card`, `Price`, `Responsive Image`, `Button`, `Icon System`, `Loading Spinner`, and `section-spacing`.
- **Behaviour/controller dependency:** `RecentlyViewedController`.
- **Runtime-only dependencies:** optional Product Form, Cart Drawer refresh, `requestIdleCallback` or timeout fallback, `AbortController`, `DOMParser`, localStorage, and `calinium:content:replace`.
- **Missing canonical dependency contract:** browser-local history/privacy and Section Rendering request lifecycle.

Quick Add has the shared bounded behavior only: an available single-variant product can use Product Form; multivariant products remain links to product selection; no multi-item add, dynamic checkout, or variant invention occurs.

## Content Rules

Use only real product data resolved from the current Section Rendering response. Product titles, URLs, media, prices, compare-at prices, availability, localization, and market formatting remain Shopify/Product Card truth. Do not author prior products into settings, infer a customer preference, explain viewing history beyond the browser-local source, or call results recommended/popular/personalized.

No timestamp, visit count, account identity, tracking identifier, or customer data is stored by the audited controller. Do not add persuasive copy about remembered history without evidence.

## Asset Requirements

Rendered product media comes from Shopify Product Cards and is responsive/lazy. Stable settings `image_ratio`, `show_vendor`, `show_badges`, and `show_secondary_image` affect presentation only. No section-owned asset or substitute media is implemented; deleted/missing products are omitted at render time.

## Supported Variants

- **Browser-local history response:** **Currently implemented** with localStorage and section HTML rendering.
- **Two to four desktop / one or two mobile columns:** **Currently implemented** through column settings.
- **Product Card treatments and optional safe Quick Add:** **Currently implemented**.
- **Server response to supplied handles:** **Currently implemented** after client request.

There is no server-profile, account-history, cross-device, merchant-fallback, recommendation, carousel, timestamp, or consent-manager variant.

## Supported States

- **Initial view:** controller records current handle, calculates prior handles, and schedules work during idle time.
- **Valid result:** fetched HTML replaces the content with a de-duplicated list.
- **Empty history / only current product:** root hides outside design mode; localized editor preview remains.
- **Malformed storage:** invalid JSON, non-array values, and invalid handles resolve to an empty in-memory list without throwing.
- **Storage unavailable/quota/private browsing:** read/write errors are caught; no result is produced and the root hides after initialization.
- **Deleted/unavailable/stale handle:** unresolved products are omitted from output; stale valid handles are not proactively removed from storage.
- **Aborted request:** section unload aborts the fetch and cancels pending idle work.
- **Request/malformed-response failure:** root hides outside design mode; no visible retry/error state exists.
- **No JavaScript:** current Liquid emits a labelled loading shell when no request parameters are present. Clean omission is target behavior; it is not proven by the current markup.

## Theme Editor Settings

**Currently implemented stable IDs:** `eyebrow`, `heading`, `description`, `heading_size`, `text_alignment`, `products_to_show`, `columns_desktop`, `columns_mobile`, `image_ratio`, `show_vendor`, `show_badges`, `show_secondary_image`, `enable_quick_add`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

There are no blocks or app blocks. On section load one controller is initialized per root; on unload it aborts fetch, cancels idle callback/timer, and removes its visibility listener. A hidden document defers work until visibility returns. The audited global block-select hook has no Recently Viewed-specific action. Duplicate section instances have separate local controllers and may repeat work.

## Responsive Behaviour

The Product Card grid is mobile-first with one/two mobile and two-to-four desktop columns. It must keep loading/empty layout stable, support 320 px, 200%/400% zoom, long localized product names, price/badge/CTA wrapping, touch and keyboard use, RTL, landscape mobile, and no horizontal page overflow. Dynamic insertion must preserve logical DOM order.

Dedicated RTL, high-zoom, storage-disabled, and dynamic-insertion QA is **Unknown**.

## Accessibility

The target is WCAG 2.2 AA. **Currently implemented:** a local H2-or-lower heading, semantic fetched list, labelled loading spinner, normal product links, shared Product Form feedback, and no automatic focus change after replacement. The local-history source must not be conveyed only through visual placement or decorative card treatment.

**Partially implemented:** no audited live announcement communicates newly inserted history results, and no-JavaScript leaves a loading shell rather than a clean omission. Storage/API failure must not trap focus; verify screen readers, zoom, RTL, and reduced-motion behavior manually.

## SEO and Structured Data

This section owns no H1, metadata, canonical URL, Product, Offer, Review, ItemList, recommendation, personalization, or customer-identity schema. Dynamically inserted local history must not be used for search manipulation. Product links remain real Shopify URLs, and the heading must not suggest a known account profile.

## Performance Rules

The controller schedules a single local-history load with `requestIdleCallback` or a timeout fallback, defers in a hidden document, requests at most the configured 2–8 prior handles, and aborts/cancels on unload. There is no polling, retry, timestamp storage, global request dedupe, cache contract, or response sequence token. Product images are lazy/responsive; optional Product Forms initialize after content replacement.

Avoid duplicate local-history regions, eager card images, repeated storage parsing, and use above the Product Page’s primary content. **Target behavior:** remove stale handles, expose a clean no-JavaScript omission, provide accessible result/failure feedback, and guard stale duplicate-instance responses.

## Motion Rules

No carousel, autoplay, forced smooth scroll, automatic focus movement, or motion used to imply customer preference is implemented. Spinner motion is shared and must respect reduced motion. Dynamic insertion remains useful with no transition.

## AI Guidelines

AI may select Recently Viewed only where Product Page context permits it, browser-local behavior exists, no nearby rail duplicates its source meaning, and no-JavaScript omission is acceptable after implementation hardening. It must never prepopulate, move, or fabricate history; it must preserve the local-only privacy meaning and omit the region when no valid history can be presented.

AI must not claim account or cross-device memory, personalization, analytics, recommendations, popularity, consent, or data recovery. It must not create fallback products, retain personal data, invent history, duplicate Main Product, or emit Product/personalization schema.

## Implementation Audit

**Source briefs inspected:** `recently-viewed-products.md`, `premium-product.md`, `commerce-merchandising-pack.md`, plus Cart and product-merchandising boundary briefs.

**Runtime inspected:** `recently-viewed-products.liquid` schema/preset/product enablement and `all_products` rendering; `RecentlyViewedController`; Product Card/Form/cart integration; commerce CSS; `product.json`; global lifecycle; mappings/capability catalog; commerce and premium-product tests.

**Currently implemented:** namespaced localStorage key, 24-handle cap, validation/deduplication, current-product exclusion, idle/visibility deferral, 2–8 request cap, Section Rendering HTML replacement, abort/idle/listener cleanup, responsive cards, and Product Form reinitialization. **Partially implemented:** local storage validates but does not normalize case, and dynamic results have no audited announcement. **Not implemented:** UI history deletion, stale-handle pruning, consent gate, clean no-JavaScript omission, visible failure/retry state, global dedupe, or response-version guard. **Unknown:** legal consent requirement, private-browsing semantics across browsers, cache behavior, market/RTL/assistive QA.

## Quality Checklist

- [x] Source meaning remains browser-local recently viewed history.
- [x] Renderer/source ownership, local key, stored values, cap, request, and privacy boundary are explicit.
- [x] Documents current exclusion, duplicate handling, malformed storage, stale/deleted products, failure, and no-JavaScript gaps.
- [x] Preserves real Product Cards and safe Quick Add without account or recommendation claims.
- [x] Requires deterministic omission and prohibits prepopulated history.

## Future Compatibility

Preserve `recently-viewed-products`, all listed setting IDs, `calinium:recently-viewed:v1`, array-of-handles format, 24-item retention cap, Section Rendering parameters, current-product exclusion, Product Card interface, and shared Product Form/Cart Drawer path. Future changes may add explicit history clearing, stale pruning, consent integration where legally required, no-JavaScript omission, accessibility feedback, and request versioning without converting local history into server-side customer data.

Browser storage, Shopify Section Rendering, market pricing, localization, privacy regulation, future block/preset/app-block, and generator changes require backward-compatible defaults and must preserve customer control over browser data.
