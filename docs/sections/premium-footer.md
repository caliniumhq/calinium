# Premium Footer and Global Content System

Calinium One has one canonical global footer: `sections/footer.liquid`, mounted through `sections/footer-group.json`. It is the only footer runtime. Existing storefronts retain the stable `color_scheme`, `show_newsletter`, `newsletter_heading`, `newsletter_description`, and `show_localization` setting IDs; the expanded system is additive.

## Layout and blocks

The section supports Compact, Editorial, Multi-column, Minimal, and Large layouts, plus contained or full-width content, optional upper/lower dividers, and independent desktop/mobile spacing. It reuses the global page-width, gutter, icon, responsive-image, button, focus, and color-scheme primitives rather than adding a competing design system.

Merchants can reorder Menu, Rich text, Brand description, Newsletter signup, Social links, Contact information, Store information, Payment icons, Trust badge, Custom Liquid, Image, and Logo blocks. Empty optional blocks do not render. Trust badges have no prefilled claims: their icon, heading, and supporting text are supplied and reviewed by the merchant.

The global store brand remains a lightweight default and uses the real `settings.logo` or `shop.name`; the Logo block is available when a different footer placement is preferred.

## Native Shopify data

- Newsletter forms use Shopify’s `customer` form, newsletter tag, native success state, and native validation errors. A Newsletter block replaces—rather than duplicates—the legacy footer newsletter setting fallback.
- Country/language selection uses Shopify’s native `localization` form and renders only when Shopify exposes more than one country or language.
- Payment marks come only from `shop.enabled_payment_types` and `payment_type_svg_tag`.
- Policy navigation renders only available Shopify privacy, terms, refund, and shipping policies. Contact is an optional merchant-selected Page setting because Shopify does not guarantee a universally named contact route.
- Social blocks accept merchant URLs for Instagram, Facebook, TikTok, Pinterest, X, YouTube, and LinkedIn. A platform with no URL is not rendered. Social URLs stay merchant-confirmed in the generated mapping catalog.
- Copyright uses the dynamic current year and actual shop name. Optional custom text can contain `[year]` and `[shop]` tokens.

## Back to top and lifecycle

`assets/premium-footer.js` is a small progressive enhancement for the optional back-to-top hash link. Without JavaScript the link remains visible and usable; after enhancement it hides near the top of the page, scrolls smoothly unless reduced motion is requested, and uses a request-animation-frame-throttled scroll listener. The controller is singleton-safe and cleans up its listener and animation frame on Shopify section unload, so Theme Editor reloads cannot accumulate instances.

## Accessibility and performance

- The footer is a semantic landmark with labelled navigation regions, unique form/control IDs derived from section and block IDs, keyboard-reachable controls, and visible focus styling.
- Newsletter validation/success, localization labels, social labels, native payment group labels, and trusted external-link protections are all server-rendered.
- Content is responsive from small screens upward; interactive targets are at least 2.75rem tall/wide where applicable.
- There are no external libraries, observers, polling timers, remote fetches, or scripted dependencies for content visibility. Images use the existing responsive-image primitive and lazy loading.

## Generator mapping and package behavior

`scripts/generate-theme-mapping-catalogs.js` discovers every footer setting and block from the actual Shopify schema. URLs, media, page selections, Custom Liquid, contact data, and merchant-specific trust claims remain confirmation-gated or merchant-only; no canonical source contains a merchant ID, URL, policy, payment method, or claim. The read-only generator continues to copy the canonical footer and global group into isolated packages; it does not create, upload, install, write, or publish Shopify themes.

Run `node scripts/test-premium-footer.js` after changing the system, then regenerate the mapping catalogs and validate packages through the existing read-only generation path.

## Manual QA matrix

Use an authorized unpublished theme to verify:

1. Compact, Editorial, Multi-column, Minimal, and Large layouts at 320 px, tablet, desktop, and wide desktop.
2. Contained/full-width content, both divider settings, desktop/mobile spacing, long menu labels, and empty optional blocks.
3. Each footer block, including reordered menus, rich text, brand/logo/image, and Custom Liquid supplied by the merchant.
4. Newsletter success/error states, keyboard submission, and exactly one form when a Newsletter block replaces the legacy fallback.
5. Every social platform with a real URL, blank-platform hiding, safe external links, and keyboard focus.
6. Real Shopify payment icons, available/missing policies, selected Contact page, country/language selectors, and unavailable selector hiding.
7. Trust badges with verified merchant claims only; no claim should appear until a merchant enters it.
8. Dynamic and custom copyright text, back-to-top behavior near/far from page top, keyboard activation, and reduced motion.
9. Theme Editor setting/block changes plus repeated section reload/unload with no duplicate back-to-top behavior.
