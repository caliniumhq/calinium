# Hero System

## Purpose

Hero System is the single canonical Calinium Section Specification for a page-leading visual and narrative introduction. It governs the choice and composition of hero media, concise approved copy, real continuations, responsive presentation, motion, and the local lifecycle without turning every large image, story banner, or image-with-text region into a Hero.

It reconciles the existing hero family under one documentation owner. **Brief ≠ Specification ≠ Implementation**: the legacy briefs preserve intent, this document defines the canonical contract, and the Liquid, schema, CSS, JavaScript, templates, catalogs, and tests are runtime evidence. None may silently be treated as another.

**Currently implemented:** `full-screen-hero` is the active canonical runtime and generator target for the homepage bootstrap. It supports image, video, slideshow, split, text, product, and collection modes through one Shopify OS 2.0 section.

**Target behavior:** Hero System remains the only canonical documentation owner while retaining compatible runtime identities until a separately approved migration preserves merchant instances, settings, blocks, JSON references, and snapshots.

## Customer Goals

Customers should be able to:

- understand the first useful page message, its real destination, and the next action without waiting for JavaScript or motion;
- view approved media that supports rather than conceals the offer;
- use hero links, slideshow controls, video controls, and text alternatives with keyboard, touch, zoom, large text, reduced motion, RTL, and assistive technology;
- encounter one clear H1 on a normal Homepage rather than several competing campaign headings; and
- continue to product, collection, or other verified content without manufactured urgency, scarcity, claims, or inaccessible text embedded in an image.

## Merchant Goals

Merchants should be able to:

- select an approved page lead only where the relevant Page Specification permits it;
- choose an evidence-backed mode, real media, concise campaign content, valid destinations, bounded height, alignment, overlay, and responsive alternatives;
- use product-led or collection-led presentation only with real selected Shopify records;
- use a slideshow only when several distinct messages deserve equal lead status; and
- preserve existing Hero instances and stable configuration through Theme Editor changes and deterministic generation.

Merchants do not configure page metadata, canonical URLs, global Header behavior, raw CSS or JavaScript, a second H1, fake product data, unsupported external experiences, or arbitrary theme-wide tokens through Hero System.

## Shopify Context

Hero System is a Shopify Online Store 2.0 family. The current canonical runtime is `apps/theme/sections/full-screen-hero.liquid`, which is referenced first by `apps/theme/templates/index.json`, all audited homepage layout recipes, and strategy-section mappings. Its schema exposes the `full-screen-hero` section identity and one `slide` block type, with a maximum of six blocks.

The current homepage bootstrap configures `bootstrap_hero` as `full-screen-hero`; it is active and first in `index.json`. The default bootstrap heading is blank, `heading_tag` is `h1`, and the current Liquid falls back to the real `shop.name` rather than a fabricated slogan.

The following map preserves the difference between source evidence and runtime behavior:

| Source/runtime identity | Source brief role | Runtime section ID | Evidence status | Canonical relationship | Blocks | Independently addable now | Compatibility requirement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `premium-hero.md` | Section-family requirements and intended canonical architecture | No matching `premium-hero.liquid`; implemented by `full-screen-hero` | **Currently implemented** through the mapped runtime | Family source evidence; Hero System is the canonical document | `slide` on mapped runtime | Not an independent runtime ID | Preserve intent and stable IDs listed below |
| `full-screen-hero.md` | Stable canonical homepage runtime identity | `full-screen-hero` | **Currently implemented** | Current canonical runtime implementation of Hero System | `slide`, maximum 6 | Yes | Preserve ID, schema IDs, blocks, presets, JSON references, and generated snapshots |
| `editorial-hero.md` | Static editorial campaign or collection introduction | `editorial-hero` | **Currently implemented** as specialist runtime | Editorial variant and legacy-compatible runtime | None | Yes | Preserve runtime and stable schema IDs pending migration evidence |
| `split-hero.md` | Side-by-side content and media introduction | `split-hero` | **Currently implemented** as specialist runtime | Split variant and legacy-compatible runtime | None | Yes | Preserve runtime and stable schema IDs pending migration evidence |
| `video-hero.md` | Moving-image introduction | `video-hero` | **Currently implemented** as specialist runtime | Video variant and legacy-compatible runtime | None | Yes | Preserve runtime and stable schema IDs pending migration evidence |
| `editorial-hero-pack.md` | Coordinated hero composition guidance | No runtime section | **Partially implemented** as source/preset guidance | Composition and preset input, never an additional Section owner | None | No | Preserve as source material; do not convert into a duplicate section |

`hero-banner` and `hero-slideshow` are also audited legacy specialist runtimes. They remain functional compatibility identities, but they are not separate canonical Hero Specifications. `hero-slideshow` maps to the slideshow variant; `hero-banner` maps to a legacy single-image/text lead. Their existence does not authorize a generator to choose a competing Hero owner.

## Responsibilities

Hero System owns:

- the primary visual and narrative page lead where a Page Specification permits one;
- local hero media, fallback media, overlay, content hierarchy, eyebrow, heading, text, and valid CTA composition;
- hero height, content width, content position, alignment, focal position, mobile media override, and responsive stacking;
- static image, text-led, split, hosted-video, slideshow, product-led, and collection-led hero behavior where the active schema supports it;
- slideshow slides, arrows, pagination, counter, autoplay, interaction pausing, and local controller cleanup;
- local no-JavaScript usefulness, reduced-motion behavior, and H1 eligibility enforcement; and
- a compatibility record for legacy Hero runtime IDs, settings, blocks, and templates.

Hero System owns a section-local empty state and authoring guidance. It must not use a customer-facing placeholder as real campaign content.

## Boundaries

Hero System does not own:

- global Header, announcement bar, navigation, sticky positioning, cart, account, localization, or search;
- page title metadata, meta description, canonical URL, page-level schema, or global color and typography systems;
- a Product Page purchase form, Collection filtering/sorting/grid, recommendation logic, or mandatory commerce lead;
- generic image-with-text, Story Banner, Brand Manifesto, later-page editorial content, or arbitrary Custom Liquid;
- fabricated campaign copy, products, collections, discounts, stock claims, awards, certification, testimonials, urgency, scarcity, or CTA routes; or
- a site-wide animation policy or third-party app experience.

The Header may be transparent on the Homepage and may be sticky independently. Hero System must provide a contrast-safe lead underneath it but must not change header settings, calculate the announcement-bar height, or claim ownership of global offsets. The current `header_offset` field is preserved for compatibility; the audited canonical CSS does not consume it as a measured global Header or announcement-bar offset.

## Section Structure

The current canonical runtime has this bounded structure:

```text
Hero System (`full-screen-hero` runtime)
├── Single-stage mode
│   ├── Optional media: image, hosted video, product image, or collection image
│   ├── Optional overlay
│   └── Content region
│       ├── Optional badge and eyebrow
│       ├── Eligible heading
│       ├── Optional product vendor/price or collection description
│       ├── Optional rich text
│       └── Optional primary, secondary, and text-link continuations
└── Slideshow mode
    ├── Up to six valid `slide` blocks
    ├── First valid slide visible in server markup
    ├── Optional previous/next, pagination, pause, and counter controls
    └── Controller enhancement only after useful static content exists
```

**Currently implemented:** `full-screen-hero` adds the shared `premium-hero-content` primitive, `section-premium-hero.css`, and `premium-hero.js`. Image and poster paths use `responsive-image`; product price uses `price`; presentation remains server-rendered before the JavaScript controller enhances slides.

**Legacy compatibility:** `editorial-hero`, `split-hero`, `video-hero`, `hero-banner`, and `hero-slideshow` have their own server-rendered schema and markup. They must be understood as runtime mappings, not as additional canonical section owners.

## Required Blocks

**Currently implemented:** the canonical runtime has no required blocks. `hero_mode: slideshow` uses the exact `slide` block type and permits at most six. A slide is valid only when it has at least one of `desktop_image`, `mobile_image`, `heading`, or `text`; invalid and incomplete slide blocks are omitted from the rendered slideshow and its controls.

Each usable canonical `slide` block may contain `desktop_image`, `mobile_image`, `alt_text`, `decorative_media`, `badge`, `eyebrow`, `heading`, `heading_tag`, `text`, `text_alignment`, `content_panel`, `primary_button_label`, `primary_button_link`, `secondary_button_label`, `secondary_button_link`, `text_link_label`, and `text_link`.

The only block required for a slideshow is one valid `slide`. A non-slideshow Hero uses section settings, not a content block. `editorial-hero`, `split-hero`, and `video-hero` have no audited block types. The legacy `hero-slideshow` also has a `slide` block, but its schema is a compatibility implementation, not the canonical block owner.

## Optional Blocks

No optional canonical block type beyond `slide` is currently implemented. Badge, eyebrow, heading, rich text, media, product or collection resource, and action pairs are section or slide settings rather than independently reorderable block types.

**Target behavior:** any future content, video, product, collection, quote, or button block requires a distinct schema and Block Specification audit. It must not be introduced merely to expose every possible Hero control or duplicate shared Button, Responsive Image, Video, Price, or Section Heading ownership.

## Block Composition

For `hero_mode: slideshow`, source order is display order. Merchants may add, remove, duplicate, and reorder `slide` blocks within Shopify’s six-block maximum. The first valid slide is the useful static state; all later valid slides are server-rendered as `hidden inert` in the canonical runtime. A slide with no valid content or media is omitted rather than becoming empty visual noise.

The current Liquid gives a slide an H2 by default. Only the first valid slide of the first Homepage Hero may render H1, and only when its own `heading_tag` is `h1`. Every other slide is subordinate. A primary, secondary, or text link renders only when its label and destination are both present; actions cannot become empty anchors.

Canonical composition rule: use one Hero System as the page lead. A second Hero is allowed only where a Page Specification permits a distinct later role, has an H2-or-lower hierarchy, offers non-duplicative evidence, and has a safe static state. Do not stack multiple competing full-screen, video, or autoplaying leads.

## Component Dependencies

The audited canonical implementation depends on:

- `Section Heading` via `snippets/section-heading.liquid` for local eyebrow, heading, semantic level, and visual hierarchy;
- `Responsive Image` via `snippets/responsive-image.liquid` for desktop/mobile image and poster rendering;
- `Rich Text` via `snippets/rich-text.liquid` for approved supporting content;
- `Button` via `snippets/button.liquid` for primary and secondary links;
- `Price` via `snippets/price.liquid` for product-led price display;
- `Icon System` via `snippets/icon.liquid` for arrow and scroll-cue glyphs; and
- theme tokens and `section-spacing` for shared color, spacing, responsive, and focus behavior.

**Partially implemented:** the specialist video facade is driven by the theme’s generic `data-co-video` behavior rather than a separately documented Hero video controller. The canonical controller is `PremiumHeroController` in `assets/premium-hero.js`; legacy slideshow behavior is `HeroSlideshow` in `assets/hero-slideshow.js`.

Hero System orchestrates these primitives but does not redefine their component contracts.

## Content Rules

Hero content must be concise, merchant-approved, readable over its chosen media, and useful without motion. Heading, eyebrow, badge, body text, product or collection reference, and CTA destination must be real. A Hero must never rely on visual treatment alone to communicate the offer.

- Use a valid primary destination only when it helps the customer continue; omit a CTA when no honest destination exists.
- Use real Shopify product and collection data for product-led and collection-led modes. The canonical runtime can use selected product title, featured media, vendor, price, description, collection title, image, and description; merchant-entered text takes precedence over the collection description.
- Use a campaign label, promotion, pricing, inventory statement, award, certification, customer count, deadline, or scarcity language only when merchant-approved and verified.
- Do not put essential information only in images, create an H1 merely for SEO, use keyword stuffing, or repeat the same value proposition in multiple page-leading Heroes.
- Keep copy proportional to its lead role. Long translated strings and long heading text must wrap; move extended editorial information to an appropriate Standard Page section or Article rather than compressing it into the Hero.

**Currently implemented:** blank canonical heading falls back to the actual `shop.name`; the active implementation does not manufacture a CTA or marketing claim. Legacy specialist presets include editorial defaults. Those preset strings are runtime evidence, not permission for AI to manufacture equivalent merchant content.

## Asset Requirements

Desktop and mobile images must be approved merchant assets with rights to use them in the storefront. The canonical runtime provides `image`, `mobile_image`, `alt_text`, `decorative_media`, `image_focal_point`, `poster_image`, and `mobile_video_fallback`. It renders responsive image candidates with declared widths and first-Homepage priority; CSS reserves Hero height and uses `object-fit: cover` with the selected focal position.

- Use `mobile_image` or `mobile_video_fallback` when it is a genuine mobile composition, not a silent replacement that changes the meaning of the media.
- Describe informative media accurately. Use decorative treatment only when nearby text communicates the same content. A poster fallback in the canonical hosted-video path is currently `aria-hidden`, so essential information must remain in text and video alternatives.
- Verify image crop, text-safe area, contrast, intrinsic source quality, and focal location at 320 px, portrait and landscape mobile, tablet, desktop, and wide screens.
- Video requires an approved usable video, a suitable poster/fallback image, a real title or surrounding text, and accessible controls or equivalent explanation when the content is meaningful.
- Product-led and collection-led media must be tied to selected Shopify records or approved overrides; never infer a product/collection from a campaign heading.

**Currently implemented:** missing media falls back to a restrained text surface and the real shop name when the canonical Hero has no heading. **Target behavior:** validate text-safe areas and required video fallback assets before generation rather than relying only on Theme Editor configuration.

## Supported Variants

The following modes are supported by the current `full-screen-hero` schema. A mode is selected for responsibility and available evidence, never merely for a decorative name.

| Variant | Status and runtime evidence | Deterministic selection criteria | Do not select when |
| --- | --- | --- | --- |
| Image | **Currently implemented** through `hero_mode: image` and `media_type: image` | One approved image, concise lead, clear hierarchy, optional real CTA, and a text-safe crop exist | The image is unapproved, cannot preserve contrast, or has no meaningful lead role |
| Text-led | **Currently implemented** through `hero_mode: text` and canonical fallback | The Page permits a lead but no approved media is needed or available; real `shop.name`/approved copy maintains clarity | AI would invent a slogan, offer, or CTA to fill empty space |
| Editorial | **Currently implemented** by legacy `editorial-hero`; **Target behavior** as a direct canonical mode mapping | Intentional campaign or collection point of view, a restrained approved image, and short editorial copy exist | It is a generic story banner or duplicates a later editorial section |
| Split media and content | **Currently implemented** in canonical `hero_mode: split` and legacy `split-hero` | Copy needs a calm solid surface beside approved media, the page is large enough to benefit, and stacked mobile reading order remains clear | The information is too short, media is weak, or split presentation obscures the actual primary lead |
| Hosted video | **Currently implemented** in canonical `hero_mode: video` with Shopify-hosted video | Approved hosted video, poster/mobile fallback, muted autoplay eligibility, and performance/accessibility justification exist | Video is decorative, fallback is absent, or a still image communicates better |
| External video facade | **Legacy compatibility** in `video-hero` through Shopify `video_url` for YouTube/Vimeo | The legacy instance has a verified provider, poster, real title, and manual play rationale | A new canonical generation path would assume embed safety or autoplay support without validation |
| Slideshow | **Currently implemented** through `hero_mode: slideshow` and `slide` blocks; legacy `hero-slideshow` remains | Two to six distinct valid leads, each with a real purpose and accessible static first state, justify rotation | One strong lead is enough, content repeats, or animation/motion constraints are not met |
| Full-screen, near-full-screen, tall, standard, compact, custom | **Currently implemented** by `hero_height`, `mobile_height`, and custom-height settings | Page lead, approved media aspect ratio, header compatibility, content length, and mobile viewport risk support the chosen height | Viewport height clips content, hides controls, or adds immersive height without useful purpose |
| Product-led | **Currently implemented** through `hero_mode: product` and `product` | A selected real product is the appropriate discovery lead and its image/title/price support the goal | The Product Page purchase task should lead, the product is unselected, or data would be fabricated |
| Collection-led | **Currently implemented** through `hero_mode: collection` and `collection` | A selected real collection is the appropriate discovery lead and its data supports browsing | A Collection Page needs its mandatory browsing architecture or the collection is unselected |
| Media-only | **Not implemented** as a safe independent mode | None; the existing runtime requires content hierarchy or a text fallback | Essential context would be missing or media would become a decorative blank lead |

`full-screen-hero` is the active canonical runtime identity. `editorial-hero`, `split-hero`, `video-hero`, `hero-banner`, and `hero-slideshow` are still independently addable Shopify sections according to their audited schemas and presets. They are variants or legacy mappings here, not canonical generator targets unless a compatible snapshot explicitly requires the preserved runtime.

## Supported States

- **Fully configured:** approved media/content/actions and, when relevant, selected Shopify record render server-side.
- **Content-only:** the canonical text mode or no-resource fallback remains useful with `shop.name`; no invented CTA appears.
- **Media-only:** **Target behavior** is to omit the Hero or add verified content; media alone is not a sufficient canonical lead.
- **Partially configured:** optional secondary action, badge, mobile asset, poster, product details, or slide media may be absent. An incomplete CTA and invalid slide are omitted.
- **Slideshow with one valid slide:** static lead remains; controls are not enhanced as a multi-slide control set.
- **Slideshow with no valid slide:** the canonical section falls back to a text-led editable state; a Theme Editor author must supply an approved block or use another mode.
- **Product/collection unselected:** **Currently implemented** fallback does not fabricate a record; text/media logic remains bounded by actual selection.
- **Video unavailable or reduced motion:** hosted video is hidden under reduced motion and poster/text remains; unsupported external behavior is not assumed.
- **Theme Editor:** `request.design_mode` keeps an editable no-resource state and Shopify block attributes identify slides.
- **No JavaScript:** first valid canonical slide remains visible and its valid links work; later slides are intentionally hidden. Static Hero content remains readable.
- **Localized, RTL, zoom, and large text:** supported by target contract; current CSS uses logical alignment for much of the canonical layout, but complete locale and RTL regression coverage is **Unknown**.

## Theme Editor Settings

The following stable canonical setting records were inspected from `full-screen-hero.liquid`. IDs are immutable until a separate migration plan preserves templates, snapshots, generator mappings, and merchant configurations. “Section” scope means a setting belongs to the Hero instance; “Block” scope means it belongs only to a canonical `slide`.

| Scope and setting IDs | Type, default, and valid values | Dependency and effect | Accessibility, performance, and AI rule |
| --- | --- | --- | --- |
| Section: `hero_mode` | select; `image`; `image`, `video`, `slideshow`, `split`, `text`, `product`, `collection` | Selects the bounded runtime branch | AI selects only with enough approved evidence for that branch |
| Section: `hero_height`, `custom_height`; `mobile_height`, `mobile_custom_height` | select/range; desktop `full-screen`, 320–960 px default 680; mobile `tall`, 280–760 px default 540 | Controls responsive minimum height | Verify content/controls remain visible; avoid unjustified viewport-height use |
| Section: `media_width`, `contained_media_style`, `split_media_position` | selects; `full-bleed`, `square`, `right` | Controls contained/rounded media and split side | Presentation only; preserve logical source order and current split stack |
| Section: `content_width`, `content_position`, `text_alignment`, `mobile_content_position`, `mobile_text_alignment` | selects; `standard`, `center`, `left`, `bottom`, `left` | Controls readable content geometry and mobile override | AI selects for text length/contrast, not decorative variety |
| Section: `media_type`, `image`, `mobile_image`, `poster_image`, `mobile_video_fallback`, `video` | select/resource settings; `media_type: image` | Image or Shopify-hosted video source with responsive fallbacks | Resource IDs must be approved; first Homepage media gets priority only under current Liquid rule |
| Section: `autoplay`, `loop`, `muted`, `controls` | checkboxes; `false`, `true`, `true`, `false` | Configures hosted video; autoplay is emitted only when `autoplay` and `muted` are true | Never autoplay audio; require poster/fallback before AI selects video |
| Section: `image_focal_point`, `alt_text`, `decorative_media` | select/text/checkbox; `center`, blank, `false` | Object position and image text alternative intent | Informative media needs truthful text; decorative setting cannot hide essential content |
| Section: `product`, `collection`, `show_product_price`, `show_product_vendor`, `show_product_description`, `show_collection_description` | Shopify resource/checkboxes; price `true`, others `false` | Activates real product/collection-derived presentation | AI must use selected record only; CTA stays a normal link, not a fabricated purchase form |
| Section: `badge`, `eyebrow`, `heading`, `heading_tag`, `heading_size`, `text`, `content_panel`, `panel_opacity`, `panel_padding` | text/inline rich text/rich text/select/checkbox/range; `heading_tag: h1`, size `large`, panel `false`, opacity 90, padding 32 | Local content hierarchy and optional readable panel | Page H1 gate overrides merchant setting; no invented copy or panel needed solely for contrast |
| Section: `button_label`, `button_link`, `primary_button_style`, `secondary_button_label`, `secondary_button_link`, `secondary_button_style`, `text_link_label`, `text_link`, `button_size`, `mobile_full_width_buttons` | text/URL/select/checkbox; primary `primary`, secondary `secondary`, size `large`, mobile full-width `false` | Valid paired actions and mobile action layout | Render only label+URL pairs; real routes only; visible focus comes from Button primitive |
| Section: `overlay_style`, `overlay_opacity`, `mobile_overlay_opacity`, `gradient_direction`, `show_scroll_cue`, `text_treatment`, `text_shadow` | selects/ranges/checkboxes; style `gradient-bottom`, 45/55, legacy direction `bottom`, cue `false`, treatment `light`, shadow `false` | Contrast and optional visual cues | `gradient_direction` is retained as a stable legacy field; current canonical class behavior is driven by `overlay_style`. Never rely on shadow alone for contrast |
| Section: `slideshow_autoplay`, `slideshow_interval`, `show_arrows`, `show_pagination`, `show_slide_counter` | checkboxes/range; `false`, 4–10 s default 6, `true`, `true`, `false` | Multi-slide controls/timer | Autoplay is opt-in; controller pauses for interaction, focus, hover, document visibility, editor state, and reduced motion |
| Section: `motion_style`, `enable_animation` | select/checkbox; `none`, `false`; `none`, `fade`, `reveal`, `media-scale` | Local entrance/scale motion and legacy section entrance hook | CSS disables canonical motion under reduced motion; motion must not hide content |
| Section: `header_offset`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, `mobile_padding_bottom` | checkbox/color scheme/ranges; `false`, `scheme-1`, 48/48/32/32 | Shared color and spacing, plus preserved offset field | Do not use offset to assume Header/announcement measurements; AI respects approved token choices |
| Block: `desktop_image`, `mobile_image`, `alt_text`, `decorative_media` | image pickers/text/checkbox; decorative `false` | Slide media source and meaning | One valid media or text datum makes a slide renderable; informative alt text must be factual |
| Block: `badge`, `eyebrow`, `heading`, `heading_tag`, `text`, `text_alignment`, `content_panel` | text/inline rich text/rich text/select/checkbox; `heading_tag: h2`, `left`, panel `false` | Slide-local hierarchy and panel | Only the first valid first-Homepage slide can be H1 at runtime |
| Block: `primary_button_label`, `primary_button_link`, `secondary_button_label`, `secondary_button_link`, `text_link_label`, `text_link` | text/URL | Slide continuations | Each label/URL pair is independently required; no blank anchors |

**Legacy compatibility settings:** `editorial-hero` preserves its image/mobile image, heading hierarchy, two actions, alignment, height, width, overlay, color, and spacing IDs. `split-hero` preserves image/video, `media_position`, `desktop_ratio`, `media_ratio`, copy, actions, and layout IDs. `video-hero` preserves `video`, `video_url`, poster fields, video flags, copy, actions, overlay, and spacing IDs. `hero-banner` and `hero-slideshow` retain their audited stable schema settings and `slide` model. This document does not rename or remove any of them.

Theme Editor lifecycle requirements are bounded: add, remove, reorder, duplicate, select, deselect, and block select/deselect must preserve useful server markup, unique Shopify IDs, and instance isolation. **Currently implemented:** `premium-hero.js` binds once through `__caliniumPremiumHeroLifecycleV1`, initializes on `shopify:section:load`/select, destroys on unload, reacts to block selection/deselection, clears timer/listeners, and pauses video. **Partially implemented:** it has no explicit block add/delete event handler; section reload is its inspected refresh boundary. **Target behavior:** any future observer, app block, or setting-refresh behavior must be documented and cleaned on unload.

## Responsive Behaviour

Hero System is mobile-first and must remain usable from 320 px through tablet, desktop, and wide screens. The canonical CSS uses `svh` where available for Hero heights, desktop/mobile height selectors, page gutters, logical text alignment, a mobile image/video fallback path, and a `48rem` split-to-two-column breakpoint. Below that breakpoint split mode is one column; at or above it the selected split media side changes visual placement while source order remains stable.

- Use a genuine mobile asset where a desktop crop would hide the product, subject, or text-safe area. Otherwise preserve the same approved asset and focal point.
- Text alignment, content position, height, and CTA width have explicit mobile settings. CTA rows may become full-width only through `mobile_full_width_buttons`.
- Content must wrap without clipping at 320 px, 200%/400% zoom, long translations, RTL, landscape mobile, and browser UI changes. The current canonical CSS includes only an inline-start safe-area control inset; broader safe-area validation is **Target behavior**.
- Full-screen height uses `100vh` followed by `100svh`; it must not hide CTA controls or create a false claim that Header or announcement-bar height was measured.
- Wide layouts must not overextend text beyond `content_width`; contained media and rounded media remain bounded by page width and gutters.

## Accessibility

The target is WCAG 2.2 AA. Hero System requires:

- one effective H1 under page-level governance, logical H2-or-lower subordinate headings, semantic buttons/links, and no heading created only for visual or SEO purposes;
- meaningful alternatives for informative media, empty alternative text only for genuinely decorative media, video alternatives when video conveys essential information, and no information solely in an image;
- logical source order, visible focus from shared controls, keyboard-readable CTA order, and touch targets that remain usable on small screens;
- sufficient contrast over media through asset selection, overlay, panel, or text treatment—not text shadow alone;
- keyboard previous/next behavior, labelled controls, visible `aria-current` pagination, `aria-roledescription="carousel"`/`"slide"`, inactive canonical slides hidden and inert, and no focus in a hidden slide;
- automatic movement disabled under reduced motion, no autoplay audio, a user-operable pause/resume control when canonical autoplay is enabled, and pause on focus, hover, user interaction, document visibility, and Theme Editor selection as currently implemented; and
- useful no-JavaScript first state, 320 px/zoom/RTL resilience, and restrained live-region usage.

**Currently implemented:** canonical slides use `hidden inert`, labels, pagination state, arrow controls, pointer swipe, keyboard arrows, and a pause button when autoplay is configured. **Missing enforcement:** the canonical slideshow has no audited `aria-live` announcement for changed slide content, and the controller’s swipe threshold has no separate documented touch-target or direction test. Do not add assertive announcements by default; any future change must avoid repeated speech during autoplay.

## SEO and Structured Data

Hero System may render the eligible page heading, but it does not own page title metadata, meta descriptions, canonical URLs, or page-level WebPage, Product, CollectionPage, Article, Organization, or Breadcrumb structured data. That ownership stays with the relevant Page Specification and centralized theme architecture.

Only the first eligible Homepage Hero receives an H1. The current canonical Liquid enforces `request.page_type == 'index' and section.index == 1` before allowing `heading_tag: h1`; all remaining canonical Hero and slide headings are H2 by default. Product, Collection, Article, and Standard Page headings remain owned by their page contracts unless a later explicit contract changes that boundary.

Hero copy, alt text, selected product/collection references, and hidden slideshow content must not be keyword-stuffed or used to manipulate search visibility. A Hero must not emit schema merely because it displays a product image, a collection, video, or logo-like artwork.

## Performance Rules

Hero System is LCP-sensitive. The current canonical Liquid makes the first Homepage Hero’s initial image or poster `eager` with `fetchpriority="high"`; other canonical Hero images and slides are `lazy`/`auto`. Responsive image widths, reserved minimum height, object-fit media, and a server-rendered first valid slide reduce unnecessary transfer and layout shift.

- Apply high priority only to the actual first visible Homepage lead. Lower-page Heroes, inactive slides, unrelated image variants, and non-visible posters must not receive duplicate preloads or high priority.
- Preserve intrinsic source dimensions and text-safe crop; reserved CSS height is not a substitute for quality media or complete CLS testing.
- Canonical hosted video uses `preload: metadata`; reduce data and LCP cost by preferring still media where video adds no information. The legacy external video is a manual-play facade after poster rendering; do not treat it as a cost-free embed.
- The canonical controller is a small progressive enhancement. It must initialize only its own root, clear intervals/listeners and pause video on destroy, and avoid an observer/timer per unnecessary instance.
- **Currently implemented:** timer cleanup, visibility pause, hidden inactive canonical slides, and server-rendered static content. **Missing validation:** audited canonical controller has no offscreen `IntersectionObserver`, unlike legacy `hero-slideshow`; offscreen video/autoplay behavior must not be claimed until measured and tested.

## Motion Rules

Motion is restrained, optional, and never needed to reveal content. Current canonical `motion_style` defaults to `none`; `enable_animation` defaults to `false`; `slideshow_autoplay` defaults to `false`; and hosted video autoplay defaults to `false`. The supported canonical motion values are `none`, `fade`, `reveal`, and `media-scale`. CSS removes Hero video and animations under `prefers-reduced-motion: reduce`.

When canonical slideshow autoplay is explicitly enabled, the controller advances only with more than one slide and stops or remains paused for reduced motion, user pause, hover, focus, document invisibility, Theme Editor pause, or user interaction. It pauses inactive or hidden-slide video and clears its interval on teardown. It does not move focus automatically.

**Legacy compatibility:** `hero-slideshow.js` additionally uses an `IntersectionObserver` to pause its timer offscreen. This is not a guarantee for the canonical controller. Do not introduce parallax, continuous decorative motion, forced autoplay, autoplay audio, simulated progress, or movement that delays interaction without a separately approved implementation and accessibility audit.

## AI Guidelines

AI may select Hero System only when the applicable Page Specification permits a primary narrative/campaign lead; approved merchant content and media—or a valid text-only state—exist; CTA destinations are real; H1 hierarchy remains valid; and accessibility and performance requirements can be met.

AI must:

- choose one canonical Hero System instead of several overlapping hero types;
- select variants deterministically from page type, merchant strategy, approved media type/quality, copy length, CTA availability, product/collection selection, slideshow count, mobile media, reduced-motion needs, and Header compatibility;
- preserve the `full-screen-hero` generator target and all stable setting/block IDs;
- use only approved media, real Shopify records, valid routes, permitted schema settings, and documented blocks;
- preserve a useful no-JavaScript first state and use a static image or text mode when video/slideshow evidence is insufficient;
- keep first-Homepage H1 eligibility singular and configure all later Hero headings as H2 or lower;
- omit unsupported features, incomplete slides, fake action pairs, unselected commerce modes, and unjustified autoplay; and
- respect approved color schemes and global design tokens without trying to own them.

AI must not:

- invent campaign messages, products, collections, discounts, inventory, awards, quotations, urgency, scarcity, social proof, media, or destinations;
- convert Story Banner, Product Main, or a generic image-with-text section into a page Hero automatically;
- use stock or generated media as merchant evidence without an explicit approved workflow;
- create multiple page H1s, hidden SEO headings, duplicate lead messages, or arbitrary Hero blocks;
- assume transparent/sticky Header compatibility, autoplay safety, external video support, or legacy runtime status makes it a canonical generator target; or
- remove or rename legacy Hero runtime settings, IDs, blocks, or template references.

## Implementation Audit

| Audit area | Evidence and status |
| --- | --- |
| Source briefs | Inspected `premium-hero.md`, `full-screen-hero.md`, `editorial-hero.md`, `split-hero.md`, `video-hero.md`, `editorial-hero-pack.md`, `homepage-bootstrap.md`, and relevant `brand-storytelling-pack.md`/`commerce-merchandising-pack.md`. The packs remain source/composition material. |
| Canonical current implementation | **Currently implemented:** `apps/theme/sections/full-screen-hero.liquid`, `snippets/premium-hero-content.liquid`, `assets/section-premium-hero.css`, and `assets/premium-hero.js`. The homepage bootstrap and layout recipes map to `full-screen-hero`. |
| Variant implementation | **Currently implemented:** specialist `editorial-hero.liquid`, `split-hero.liquid`, and `video-hero.liquid`; shared legacy presentation CSS is `section-editorial-pack.css`. Canonical split mode is also present in the active runtime. |
| Legacy compatibility implementation | **Legacy compatibility:** `hero-banner.liquid`/`section-hero-banner.css` and `hero-slideshow.liquid`/`section-hero-slideshow.css`/`hero-slideshow.js` remain runtime identities. `hero-slideshow` supports `slide` blocks, max six, and controller lifecycle. |
| Schema and stable IDs | **Currently implemented:** audited canonical `hero_mode`, all settings listed in Theme Editor Settings, one `slide` block, max six, and preset `Premium hero`. Legacy schemas/presets remain independently present. |
| H1 behavior | **Currently implemented:** canonical full-screen, editorial, video, hero-banner, and hero-slideshow Liquid gate H1 eligibility to first Homepage section/first valid slide. The page contract remains the authority. |
| Media and video | **Currently implemented:** responsive image primitive, desktop/mobile assets, Shopify-hosted video, poster/mobile fallback fields, muted-only canonical autoplay, product/collection record use. **Legacy compatibility:** `video-hero` supports YouTube/Vimeo facade URLs. **Unknown:** complete cross-browser video/provider and data-saver validation. |
| Slideshow and lifecycle | **Currently implemented:** canonical first valid server-visible slide; arrows/pagination/counter/pause markup; keyboard/pointer controls; reduced-motion/visibility/editor pause; singleton lifecycle key; section load/unload/select/deselect and block selection/deselection handling; timer/listener cleanup. **Partially implemented:** no canonical offscreen observer or change-announcement live region. |
| Header/announcement compatibility | **Currently implemented:** Header has independent sticky/transparent settings and scroll solid-state behavior; announcement bar is a separate Header group section. **Missing enforcement:** Hero has no measured Header/announcement offset contract and `header_offset` is not a measured CSS integration. |
| Templates and generator | **Currently implemented:** `templates/index.json` begins with `full-screen-hero`; `scripts/test-premium-hero.js`, `scripts/test-homepage-bootstrap.js`, `config/layout-recipes.json`, `config/strategy-section-mapping.json`, and capability catalogs reference it. The focused test verifies approved product/mobile-image/heading merge and generated package retention. |
| Localization and accessibility | **Currently implemented:** localized control strings, Shopify section/block attributes, labelled controls, reduced-motion CSS, and semantic slide metadata. **Unknown:** full RTL, translated-string, high-zoom, screen-reader, and Theme Editor manual QA matrix coverage. |
| Duplicate documentation responsibility | **Resolved by this document:** source briefs and legacy runtime sections remain evidence/mappings; no additional canonical Full-screen, Editorial, Split, Video, or Premium Hero specification is created. |
| Missing validation | **Target behavior:** automated assertion of Header offset compatibility, contrast, image text-safe areas, video fallback completeness, offscreen canonical autoplay/video pause, screen-reader slide-change behavior, RTL, 400% zoom, and generated mapping rejection of every incompatible legacy variant. |

## Quality Checklist

- [x] Exactly one canonical Hero System specification owns the family.
- [x] No separate canonical Full-screen Hero specification is created.
- [x] Source briefs and Homepage Bootstrap are preserved as source evidence.
- [x] Current canonical runtime ID `full-screen-hero`, its `slide` block, and stable IDs are mapped.
- [x] Legacy `editorial-hero`, `split-hero`, `video-hero`, `hero-banner`, and `hero-slideshow` identities are documented without deletion or migration claims.
- [x] Homepage lead and one-H1 eligibility are bounded; later Hero headings are subordinate.
- [x] Page eligibility, prohibited contexts, CTA truth, media truth, product/collection truth, and no-JavaScript first state are defined.
- [x] Responsive mobile media, 320 px, RTL, zoom, safe-area, long-text, split stacking, contrast, and Header boundary expectations are documented.
- [x] Keyboard, focus, touch controls, reduced motion, pause behavior, no autoplay audio, inactive-slide access, and restraint of live regions are documented.
- [x] LCP, responsive image priority, CLS, video cost, lifecycle cleanup, duplicate-instance cost, and progressive enhancement are documented.
- [x] AI selection is deterministic and excludes fabricated content, unverified routes, duplicate Heroes, unsupported settings, and unsupported variants.
- [x] Current support, partial support, target behavior, legacy compatibility, unknown behavior, and implementation gaps are explicitly separated.

## Future Compatibility

`full-screen-hero` remains the stable current runtime identity. Future work must preserve existing merchant section instances, JSON template references, preset usage, legacy section IDs, stable setting IDs, `slide` block IDs, approved generation snapshots, and Theme Editor duplication behavior before consolidating any runtime file.

Any schema migration must supply backward-compatible defaults, a documented mapping, generated-package compatibility tests, and a reversible deprecation period. A specialist runtime may be mapped to a Hero System variant only after its content, action pairs, video provider behavior, H1 semantics, lifecycle, and accessibility constraints are proven equivalent or safely migrated. No immediate deletion or rename is authorized by this document.

Future generator mapping may target the canonical runtime while retaining explicit legacy mappings for old templates and paid immutable snapshots. Future preset composition may select a Hero System variant only from verified merchant inputs. Future video providers, app blocks, custom media types, and Header integrations require separate capability, performance, lifecycle, and accessibility contracts before they are treated as supported. Shopify platform and theme architecture changes must preserve useful server-rendered defaults, no-JavaScript access, merchant data, and deterministic output.
