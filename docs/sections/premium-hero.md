# Premium Hero

`full-screen-hero` is the canonical Calinium One homepage hero. It is a single, resource-safe OS 2.0 section that supports premium visual directions without creating store-specific templates or separate implementations.

## Architecture

The section uses three shared primitives:

- `sections/full-screen-hero.liquid` — stable section ID, data binding, and progressive HTML.
- `snippets/premium-hero-content.liquid` — shared heading, product, collection, and CTA composition.
- `assets/section-premium-hero.css` and `assets/premium-hero.js` — responsive presentation and optional enhancement.

The legacy `hero-banner`, `hero-slideshow`, `split-hero`, `video-hero`, and `editorial-hero` sections remain installed only for existing templates, compatible generated snapshots, and deliberate specialised layouts. Every current homepage layout recipe leads with `full-screen-hero`; a legacy hero is no longer selected for new homepage plans.

## Modes

`hero_mode` is additive; legacy `media_type`, `image`, `mobile_image`, `video`, content, overlay, spacing, and button IDs remain supported.

| Mode | Real resource requirement | Empty-state behavior |
| --- | --- | --- |
| `image` | Optional desktop/mobile images | Calm text-only surface using the real shop name. |
| `video` | Shopify-hosted video; poster is recommended | Poster or text-only surface; no forced motion. |
| `slideshow` | Up to six valid slide blocks | First valid slide is visible without JavaScript. |
| `split` | Optional image/video | Content and media form a responsive two-column treatment. |
| `text` | None | Uses the real shop name when no heading is supplied. |
| `product` | A selected Shopify product | Falls back safely when no product is selected. |
| `collection` | A selected Shopify collection | Falls back safely when no collection is selected. |

Product and collection modes never invent data. A product CTA links to the selected product only when the merchant supplies a label; the hero never creates an incomplete product form.

## Stable setting IDs

The pre-M19 IDs stay available: `media_type`, `image`, `mobile_image`, `video`, `autoplay`, `loop`, `muted`, `controls`, `eyebrow`, `heading`, `heading_tag`, `text`, `button_label`, `button_link`, `secondary_button_label`, `secondary_button_link`, `text_alignment`, `content_position`, `overlay_opacity`, `gradient_direction`, `header_offset`, `enable_animation`, `heading_size`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

New controls are additive. They are grouped in the Theme Editor as Layout, Media, Content, Buttons, Overlay, Slideshow, and Motion. The section deliberately avoids exposing browser or implementation terminology.

## Responsive and media behavior

- The first homepage hero requests its selected image eagerly; all other hero media stays lazy.
- `responsive-image` provides desktop/mobile source selection, responsive `srcset`, and `sizes`.
- A stable hero height reserves space before media loads, avoiding content shift.
- Desktop and mobile height, content position, text alignment, overlay strength, and media can differ.
- Mobile layouts are constrained by page gutters and never rely on fixed inline widths.
- Hosted video can autoplay only when muted. A poster/fallback image is used for reduced-motion presentation.

## Accessibility and progressive enhancement

- Only the first eligible homepage hero can render an H1. Every later hero and slide uses H2.
- The text-only fallback uses `shop.name`, without invented promotion, slogan, or CTA.
- Slideshow autoplay is off by default. It pauses on hover, focus, page hiding, and after merchant interaction; reduced-motion disables automatic movement.
- The first valid slide is visible in HTML before JavaScript. Other slides are hidden from both visual and keyboard navigation until enhanced.
- Arrows, dots, counter, pause control, swipe, and keyboard navigation are optional enhancements. Links remain normal anchors.
- Media can be marked decorative. Otherwise the source image alt text or a merchant-provided description is used.

## Generator mapping

The existing `generate-section-instances` merge path recognises the bootstrap `full-screen-hero` by type. Approved settings merge into `bootstrap_hero`; approved merchant-only references require the normal confirmation records. The generated catalog is refreshed from the real section schema with:

```sh
node scripts/generate-theme-mapping-catalogs.js
```

Generation remains deterministic and read-only. The hero adds no Shopify write, upload, or publish operation.

## Theme Editor lifecycle

`premium-hero.js` uses one controller per section and a single document lifecycle binding. It initializes on section load/select, destroys listeners, timers, and media playback on section unload, pauses editor motion on deselect, and selects the matching slide on block select. It must be safe to reload, reorder, or refresh a section repeatedly without duplicate timers or listeners.

## Manual QA matrix

Use an authorized unpublished theme only. This matrix does not authorize upload,
publication, or modification of a merchant's live theme.

1. Verify the text-only fallback with no media uses the real shop name and no invented CTA.
2. Set distinct desktop and mobile images; verify the mobile source at 320 px and 375 px.
3. Check full-screen and compact heights on desktop and mobile.
4. Check full-bleed and contained media treatments.
5. Check overlay content in each common top/centre/bottom and left/centre/right placement.
6. Check split layout with media on the left and then on the right.
7. Check one-button, two-button, and no-button compositions.
8. Check a long heading and long rich text for clipping or horizontal overflow.
9. Check a bright image with the dark text treatment and appropriate overlay/panel.
10. Check a dark image with the light text treatment and appropriate overlay/panel.
11. Check Shopify-hosted video with a poster image, muted autoplay, loop, and controls settings.
12. Enable reduced motion and confirm video resolves to its poster/static fallback.
13. Check a one-slide slideshow has no unnecessary controls.
14. Check a multi-slide slideshow, arrows, dots, counter, and optional pause control.
15. Operate slideshow controls using keyboard focus and Left/Right keys.
16. Test swipe navigation on a touch device.
17. Verify autoplay pauses on hover, focus, document hiding, and user interaction.
18. Select a slide block in the Theme Editor and verify the matching slide is shown.
19. Check product-led mode with a real selected product.
20. Check collection-led mode with a real selected collection and a merchant text override.
21. Clear the product and collection selections to verify safe empty states.
22. Check the 320 px mobile layout for clipped text, CTA overflow, and horizontal scrolling.
23. Check portrait and landscape tablet layouts.
24. Check laptop and wide-desktop layout balance.
25. Disable JavaScript and verify the first valid slide, copy, media/poster, and links remain usable.
26. Inspect homepage heading hierarchy and confirm there is one effective H1.
27. Check the transparent sticky header transition above the hero after scrolling.
28. Check announcement-bar spacing with the hero below it.
29. Repeatedly reload/reorder the section in Theme Editor and confirm no duplicate controls, timers, or listeners.
30. Check the storefront root and a separate 404 route.

## Known limitation

The first canonical version supports Shopify-hosted video. It intentionally does not add a second external-video provider path. Product-led CTA is a normal product link, not a duplicated add-to-cart form.
