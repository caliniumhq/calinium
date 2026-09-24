# Featured Categories

## Purpose

Featured Categories is a reusable editorial navigation region for a merchant-selected set of category destinations. A category may resolve to a real collection, Standard Page, or approved custom URL; the section presents those destinations as concise visual cards without becoming a collection grid, product grid, filter, or recommendation system.

**Currently implemented:** `apps/theme/sections/featured-categories.liquid` renders up to eight category blocks with collection/page/custom-link precedence, optional responsive media, decorative canonical icons, subordinate headings, and no JavaScript dependency.

## Customer Goals

Customers should be able to recognize distinct browsing or informational destinations, understand optional concise category context, and open one real destination through a normal link. The section must remain calm and usable at 320 px, with keyboard, touch, zoom, RTL, reduced motion, and JavaScript disabled.

## Merchant Goals

Merchants should be able to select only genuine category destinations, choose approved imagery and concise labels, add optional decorative iconography, control grid density and text position, and highlight one leading category only when that priority is real.

## Shopify Context

The section ID is `featured-categories`; the schema permits up to eight `category` blocks and its preset includes four empty blocks. A block can select a Shopify `collection`, Shopify `page`, or a URL. Current Liquid precedence is `link`, then `collection`, then `page` for destination; title/media fall back from explicit fields to collection/page data as applicable.

Canonical contexts are Homepage, Collection List Page, and landing-style Standard Page. It is prohibited as an ordinary region on Collection, Product, Search, Cart, Contact, Blog, Article, 404, account, checkout, and global shell surfaces. Technical schema availability is not a page-composition recommendation.

## Responsibilities

Featured Categories owns local heading hierarchy, a bounded editorial category-card grid, category destination resolution, optional approved media, optional decorative icon, title, concise text, visual leading-card treatment, responsive grid composition, and editor-only empty guidance.

## Boundaries

Featured Categories does not own Product Cards, collection membership, product grids, collection filters, sort/pagination, Search, recommendations, Hero behavior, collection-page orientation, taxonomy inference, or URL validity outside Shopify’s selected records/merchant-approved URL input.

It must not fabricate categories, collections, pages, destination labels, text, media, product counts, promotions, collections hierarchy, or an unlabeled external experience. A custom URL does not prove a category is real; it must be merchant-approved.

## Section Structure

```text
Featured Categories
├── Optional Section Heading (H2 or lower)
└── Category grid (up to 8)
    └── Category block
        ├── Optional responsive image
        ├── Optional decorative icon
        ├── Subordinate category title
        ├── Optional concise text
        └── One optional normal destination link wrapping the card
```

**Currently implemented:** the grid uses list/listitem roles; a card becomes a single anchor only when its resolved destination is non-blank. `featured_first` visually enlarges the first card at the desktop breakpoint. No controller is required.

## Required Blocks

The only implemented block is `category`, with `collection`, `page`, `link`, `image`, `category_icon`, `heading`, and `text`. A useful customer-facing category requires both a truthful resolved title and a real destination. The schema does not enforce either; canonical generation must omit incomplete blocks.

At least two valid categories are recommended for a navigation grid. A single destination should normally be a regular button/link or a more appropriate single-purpose section.

## Optional Blocks

No optional block type is currently implemented. Media, icon, text, collection/page/custom-link inputs, and title are fields of `category`; they are not separate collection, image, icon, promotion, or CTA blocks.

## Block Composition

Category blocks are repeatable, reorderable, and capped at eight. Source order is reading order and determines the card that receives the optional `featured_first` visual emphasis. Each card may select one source; custom `link` wins over collection/page link, collection supplies the next fallback, and page is last. Explicit heading/image/text overrides use merchant content; collection/page fallbacks are used only as current Liquid defines.

Use one instance per page by default. On Homepage, place it after primary orientation and before lower-priority editorial content only when it gives a distinct browse path. On Collection List it may supplement—not replicate—the authoritative list. On Standard Page it must support the page’s actual information architecture. Do not stack it beside a duplicate Collection Carousel, Collection Tabs, Collection List, or navigation grid with the same destinations.

## Component Dependencies

The audited runtime uses `Section Heading`, `Responsive Image`, `Icon System`, `section-spacing`, Calinium color/layout tokens, and globally loaded `section-commerce-pack.css`. It does not use Collection Card, Product Card, ScrollCarousel, CommerceTabsController, or section-specific JavaScript.

The card wrapper is section-local rather than a separately documented Category Card component. This document does not create that component contract.

## Content Rules

Every title, text, media item, icon, and destination must be accurate for the selected category. A collection/page fallback must not be overwritten with a misleading label or description. Use concise explanatory text; category cards are navigation, not product claims, collection filters, marketing offers, or recommendations.

Use the exact current destination precedence deliberately: a custom link must be verified and should not silently redirect a collection card to an unrelated route. Never use a page-content excerpt or custom text to infer material claims, price, availability, sustainability, certification, urgency, or taxonomy. Do not use decorative names without a real destination.

## Asset Requirements

The current section prefers block `image`, then selected collection featured image. Page selections have no current image fallback. Media is lazy, responsive, and ratio-bound through Responsive Image. If media is absent, the card may remain text-led; do not substitute stock/generated imagery or an unrelated collection image.

`category_icon` is a bounded canonical icon choice (`none`, `tag`, `gift`, `sparkle`, `leaf`, `home`, or `diamond`) and is decorative in current markup. It cannot replace a text title or convey essential category meaning. For `text_style: overlay`, verify text contrast against the actual selected asset.

## Supported Variants

- **Below-media editorial cards:** **Currently implemented** through `text_style: below`; use as the default when clear text and media separation are needed.
- **Overlay category cards:** **Currently implemented** through `text_style: overlay`; use only with tested contrast and concise text.
- **One/two mobile columns and two/three/four desktop columns:** **Currently implemented** through `columns_mobile` and `columns_desktop`; choose from valid category count and label length.
- **Featured first card:** **Currently implemented** through `featured_first`; use only when the first real destination deserves visual priority and source order can remain logical.
- **Collection-led, page-led, or approved custom-link destination:** **Currently implemented** as source resolution, not visual variants; select the most truthful source.

There is no implemented product-preview, carousel, tab, filter, recommendation, autoplay, or Hero variant.

## Supported States

- **Fully configured:** a truthful resolved title and destination render one linked category card.
- **Collection-led:** collection URL/title/image provide current fallbacks.
- **Page-led:** page URL/title and truncated page content can provide current fallbacks; image requires a block asset.
- **Custom-link-led:** the approved URL is the destination; explicit content must still describe it accurately.
- **Text-led:** no media is selected or available; card remains valid when title/destination exist.
- **Partially configured/unlinked:** current Liquid can render card content without an anchor; canonical generation must omit it instead of presenting a non-navigable category.
- **No blocks:** an editor-only localized empty message renders; customer-facing output is absent.
- **No JavaScript/reduced motion:** the static grid and normal links remain fully usable.

## Theme Editor Settings

**Currently implemented section settings:** `eyebrow`, `heading`, `description`, `heading_size`, `text_alignment`, `columns_desktop`, `columns_mobile`, `text_style`, `image_ratio`, `featured_first`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

**Currently implemented block settings:** `collection`, `page`, `link`, `image`, `category_icon`, `heading`, and `text`. Merchants may add, remove, duplicate, and reorder blocks up to eight. Shopify block attributes provide editing identity. No section-specific controller, listener, timer, observer, section-load behavior, or block-selection behavior is currently required.

Future enhancements must remain server-rendered first, initialize safely on Theme Editor section load, clean up on unload, preserve one link per destination, and not introduce duplicate IDs or an app-block contract without separate evidence.

## Responsive Behaviour

The current CSS is mobile-first with one/two mobile columns and two/three/four desktop columns at `48rem`; `featured_first` spans two rows/columns only at the desktop breakpoint. Images are lazy and responsive, the media uses cover behavior, and card content follows media in source order.

From 320 px upward, titles and text must wrap without overflow, cards must preserve a usable tap target, and overlay text must not be clipped. RTL, long localized values, 400% zoom, and featured-first geometry require manual QA; current logical CSS supports but does not prove complete behavior.

## Accessibility

The target is WCAG 2.2 AA. Current markup uses a local labelled section, list/listitem roles, one normal link wrapping a linked card, subordinate H3 titles, Responsive Image, and decorative icons. The section must preserve visible link focus, semantic text labels even when media/icons appear, non-color-only category identification, contrast for overlay treatment, logical keyboard order, and touch-safe card targets.

Do not place an interactive element inside the card link, use icons as the only category label, or present an unlinked card as a working destination. There is no motion or dynamic state to announce. **Target behavior:** test external custom destinations, RTL focus order, 320 px overlay contrast, and 400% zoom with real content.

## SEO and Structured Data

Featured Categories contributes truthful internal navigation and subordinate H2/H3 structure. It does not own page H1, metadata, canonical URLs, CollectionPage/WebPage/ItemList/Product/Breadcrumb schema, collection hierarchy, or page content schema. Category text and image alternatives must not be used for keyword stuffing.

## Performance Rules

The section is server-rendered and has no JavaScript controller. Images are lazy, responsive, and ratio-bound. Keep the grid to a small number of legitimate categories, avoid expensive high-resolution decorative media, and do not preload all cards or add external icon/media libraries. Static content and normal links remain useful if CSS/JavaScript enhancements fail.

`featured_first` changes layout only; it must not cause a larger first asset to become a hidden LCP burden without a page-level LCP review.

## Motion Rules

No section-specific motion, carousel, autoplay, timer, observer, or controller is currently implemented. Overlay treatment is static. Any future hover effect must be decorative, nonessential, reduced-motion safe, and must not conceal the destination or change reading order.

## AI Guidelines

AI may select Featured Categories only when the Page Specification permits it, two or more approved destinations have distinct navigation value, titles/destinations are real, optional media exists or text-led cards remain useful, and the grid does not duplicate the primary Collection List or other collection-discovery region.

AI must use only the implemented `category` block and approved collection/page/link/image references, preserve current destination precedence, omit incomplete/unlinked cards, and select `featured_first` only for a verified priority. It must not fabricate taxonomy, categories, collection/page data, links, imagery, product discovery, filters, recommendations, or a Hero-like lead.

## Implementation Audit

**Source briefs inspected:** `featured-categories.md`, `premium-collection.md`, and `commerce-merchandising-pack.md`.

**Runtime inspected:** `featured-categories.liquid` schema/preset and destination resolution, `section-commerce-pack.css`, Responsive Image/Icon/Section Heading primitives, global `theme.liquid` asset loading, templates, strategy mapping, capability catalog, classification, and relevant Homepage/Collection/Collection List/Search page contracts.

**Currently implemented:** eight-block schema, collection/page/custom URL resolution, responsive media, bounded decorative icons, static grid, overlay/below presentation, featured-first desktop layout, no-JavaScript normal link behavior, and editor empty state. **Partially implemented:** unselected/non-design blocks can render non-navigable empty/content cards; custom URL accuracy is merchant-governed. **Unknown:** full RTL, zoom, external-link, and assistive-technology manual QA. No direct assignment was found in audited JSON templates.

## Quality Checklist

- [x] Owns editorial category navigation only.
- [x] Keeps product grids, collection filters, search, recommendations, and Collection List ownership separate.
- [x] Documents destination precedence, required block truth, valid pages, ordering, responsive behavior, and static fallback.
- [x] Requires semantic linked cards, real text labels, contrast, performance restraint, and deterministic AI selection.
- [x] Records current implementation gaps without inventing a Category Card or controller.

## Future Compatibility

Preserve the `featured-categories` runtime ID, `category` block, current setting IDs, preset, destination precedence, source order, and existing Shopify block IDs. Any change must retain static normal-link navigation and text-led fallback.

Future work may add validated category-card reuse, stronger incomplete-block validation, full RTL/zoom QA, or source-specific accessibility guidance only after a separate Component/implementation contract. It must not convert this bounded navigation region into a collection grid, product merchandising engine, filter system, Search result set, or Hero.
