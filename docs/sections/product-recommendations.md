# Product recommendations

## Purpose

Renders Shopify's related-product recommendations on product templates, without inventing a recommendation algorithm.

## Settings and behavior

Choose heading content, result limit, responsive columns, ratio, vendor/badges/secondary image/Quick Add, color scheme, and spacing. The section uses `routes.product_recommendations_url` with `intent=related`, its own `section_id`, the current product ID, and the configured limit. It makes one enhanced request only when Shopify has not already performed the request.

## Product, cart, and empty behavior

Every returned result is a canonical product card, so pricing, availability and Quick Add stay safe. The section preserves ordinary server output if Shopify has performed the request; otherwise it has a labelled loading state, then collapses cleanly when no recommendation is returned. The editor keeps an informative preview state.

## Accessibility, performance, and limitation

The request is aborted on section unload and deferred while the tab is hidden. Dynamic cards are passed to the existing product-form initializer. Shopify controls recommendation availability and relevance; this section does not guarantee results or use data outside the platform endpoint.
