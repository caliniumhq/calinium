# Premium Product System

## Purpose

`main-product` is Calinium One’s single canonical product-detail architecture. It composes the existing Shopify-native product form, price, variant picker, media primitive, recommendation sections, and structured-data snippet into one responsive product experience. It does not contact Shopify Admin APIs or change a theme outside the generated package.

The canonical product template is deliberately small and ordered as follows:

1. `main-product` — product decision, media, purchase, trust, and editorial detail.
2. `product-recommendations` — Shopify’s related-product response when available.
3. `recently-viewed-products` — browser-assisted discovery when available.

`complementary-products` remains an optional product-template section for an approved, merchant-selected fallback assortment. The generator does not invent products, recommendations, or content.

## Stable settings

The original setting IDs remain supported: `show_vendor`, `show_sku`, `show_inventory`, `low_inventory_threshold`, `low_inventory_message`, `variant_picker_type`, `gallery_layout`, `content_width`, and `color_scheme`.

M20 adds additive settings only:

| Group | IDs | Behavior |
| --- | --- | --- |
| Gallery | `thumbnail_position`, `mobile_gallery_layout`, `enable_image_zoom`, `enable_fullscreen` | Stacked, grid, or carousel media; responsive thumbnail placement; progressive zoom and fullscreen viewer. |
| Product information | `show_barcode`, `show_product_type` | Show a value only when the selected product or variant supplies it. |
| Purchase | `show_dynamic_checkout`, `enable_sticky_add_to_cart_mobile`, `enable_sticky_add_to_cart_desktop` | Native dynamic checkout where Shopify permits it, plus an optional purchase shortcut that submits the existing product form. |

`gallery_layout` retains `stacked` and `grid`; `carousel` is additive. `variant_picker_type` retains `buttons` and `dropdown`; `swatches` is additive and only shows actual Shopify option swatch data when the product provides it.

## Gallery and media

The gallery renders Shopify product media in merchant-defined ordering. Image media uses the canonical responsive image primitive, the first media item is the only eager/high-priority candidate, and later media is lazy. Video, external video, and 3D model media remain Shopify-native tags.

Desktop supports stacked, grid, or carousel presentation and thumbnail placement below, to the left, to the right, or hidden. Mobile supports an accessible scroll-snap swipe rail or a stacked presentation. Thumbnail navigation is ordinary anchors without JavaScript; JavaScript adds arrow-key navigation, selected-media state, and smooth scrolling unless reduced motion is preferred.

Fullscreen and zoom are progressive enhancements. The fullscreen dialog contains a cloned active media frame so the original gallery remains intact; keyboard Left and Right moves through multiple media items. Zoom is an explicit toggle, not hover-only behavior. If JavaScript is unavailable, the first media item and all thumbnail links remain usable.

## Variants and purchase

The native variant select is always present as the non-JavaScript fallback. The enhanced picker is layered on top and synchronizes back to that select. Variant changes update the URL with `history.replaceState`, price, SKU, barcode, inventory state, availability, gallery target, and sticky purchase summary without reloading the page.

Add to Cart remains the canonical Shopify product form. Its loading, success, and error states are owned by `product-form.js`; the sticky control only forwards to that same form. It never duplicates a variant form or implements a second cart contract. Dynamic checkout is optional and uses Shopify’s supplied payment button.

## Trust, storytelling, and recommendations

`information_row` is retained for existing templates. New `trust_block` blocks support accordion or expanded-panel presentation for merchant-supplied shipping, returns, warranty, materials, craftsmanship, care, dimensions, authenticity, or sustainability content. `highlight` blocks create a small, optional icon list from merchant-provided text. No fallback makes marketing claims.

The normal product description remains the main long-form storytelling surface. Existing editorial and commerce sections can be added through the Theme Editor and current approved mappings when a strategy requires them. Related, complementary, and recently viewed products use the existing resource-safe sections and show empty states rather than invented products.

## Accessibility and performance

- Product structured data remains emitted from `layout/theme.liquid` through `structured-data-product`.
- The page has one product H1, native product-form controls, visible focus states, labelled media controls, keyboard thumbnail and fullscreen navigation, and native `<details>` accordions.
- Media reserves space with existing aspect-ratio frames. Only the first media item is eagerly loaded; no third-party libraries or animation framework are introduced.
- Reduced motion removes media zoom transitions and keeps normal navigation behavior. The sticky purchase control has no decorative animation.
- Theme Editor `section:load` and `section:unload` lifecycle handling uses a singleton-safe controller and removes observers/listeners on unload.

## Generator mapping

`main-product` remains a real section capability discovered from the Shopify schema. Approved bounded settings merge into the preserved canonical product-template `main` instance through `generateSectionInstances`; all existing stable IDs retain their prior semantics. Resource settings remain merchant-only under the existing catalog rules. The product system neither introduces store-specific IDs nor alters immutable paid snapshots.

## Manual Shopify QA

Use an authorized unpublished test theme only. Confirm both normal storefront and Theme Editor behavior for:

1. A product with one image.
2. A product with several images.
3. Shopify-hosted video.
4. A Shopify 3D model.
5. Variant switching and deep-link variant URLs.
6. Color swatches supplied by Shopify option data.
7. Image swatches supplied by Shopify option data.
8. A sold-out variant and product.
9. A sale/compare-at price.
10. Inventory status changes.
11. Mobile sticky Add to Cart.
12. Optional desktop sticky Add to Cart.
13. Mobile swipe gallery at 320 px.
14. Desktop thumbnail positions.
15. Zoom toggle.
16. Fullscreen dialog and keyboard navigation.
17. Shopify related products.
18. Merchant-selected complementary products.
19. Recently viewed products.
20. Trust accordions and expanded panels.
21. Long rich descriptions and highlights.
22. Reduced-motion media interaction.
23. Keyboard traversal and focus visibility.
24. Theme Editor section reload and block editing.
25. Tablet layout.
26. Desktop layout.
27. Wide desktop layout.
28. No-JavaScript fallback, including variant select, thumbnail anchors, and Add to Cart.

No manual QA step authorizes upload, publication, or modification of a live Shopify theme.

## Known limitations

The canonical gallery uses Shopify’s selected media and does not implement a custom variant add-to-cart form. The fullscreen dialog presents the selected media frame and relies on Shopify’s rendered native video/model elements. Advanced app-specific product widgets continue to use Shopify app blocks; Calinium does not recreate their behavior.
