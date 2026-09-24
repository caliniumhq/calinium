# Premium Header System

The canonical header is `apps/theme/sections/header.liquid`. It is an original Calinium Online Store 2.0 section, designed around native links, forms, and `<details>` disclosures. JavaScript adds refinement; it is not required for primary navigation, search submission, localization submission, or cart access.

## Stable compatibility surface

The existing `menu`, `sticky_header`, and `color_scheme` section setting IDs remain unchanged. The global `logo` and `logo_width` settings also remain valid fallback inputs. New options are additive and scoped to the Header section, including layout, logo variants, desktop/mobile sizing, optional utilities, transparent homepage state, and hide-on-scroll behavior.

`announcement-bar.liquid` keeps its original `show`, `text`, `link`, and `color_scheme` setting IDs. Its new announcement blocks are optional. A legacy single message still renders if no blocks are configured.

## Merchant configuration

- **Navigation** selects the desktop menu, optional mobile menu, and desktop submenu behavior.
- **Brand mark** can use a header-specific logo or inherit the existing global brand logo. A separate transparent-state logo is optional.
- **Layout** provides centered or left desktop logo placement, contained or full width, and independent desktop/mobile dimensions.
- **Header behavior** enables sticky availability, optional hide-on-scroll, and an optional homepage-hero overlay.
- **Customer tools** renders only available Shopify features: search, customer accounts, cart, and country/language selection.

The announcement bar can contain up to six messages. Rotation is off by default. When enabled, it pauses on hover, keyboard focus, and a hidden page; reduced-motion users receive the static server-rendered messages.

### Sticky and announcement behavior

When sticky header is enabled, the main header remains sticky and the announcement bar scrolls away. This is deliberate: Shopify renders each section inside a wrapper, so Calinium applies sticky positioning to the Header section wrapper rather than a height-constrained child. This preserves normal layout height, transparent-homepage transitions, and Theme Editor section reload behavior without making the announcement bar part of the sticky offset.

Announcement alignment is emitted as an explicit `data-announcement-alignment` value. Every message fills the configured full-width or contained announcement container before its text is aligned. This prevents a global readable-paragraph width from offsetting a visually centered message.

## Accessibility and enhancement

- Desktop and mobile nested navigation use native disclosure controls and preserve usable links without JavaScript.
- The mobile drawer receives focus trapping, Escape-to-close, focus restoration, and scroll locking only after JavaScript enhances it.
- Cart labels and visible counts update through the existing `calinium:cart:updated` integration.
- Predictive search retains a standard Shopify search form when its enhancement cannot run.
- Localization is not rendered until Shopify exposes more than one supported country or language.
- Theme Editor section load, unload, and select events initialize or dispose enhancement safely.

## Manual Shopify preview matrix

Run these checks in an unpublished theme preview after changing header settings:

1. Desktop: centered and left logo layouts; contained and full widths; long menu labels.
2. Desktop menus: keyboard disclosure, click mode, hover mode, active links, and touch-device tap behavior.
3. Homepage: transparent light/dark treatment, alternate logo, solid transition, sticky and hide-on-scroll states. With an announcement enabled, confirm the announcement scrolls away and the main header stays pinned.
4. Mobile at 320, 375, and 768 px: drawer focus trap, Escape, outside click, nested menu, and return focus.
5. Customer tools: unavailable localization/accounts remain absent; available localization submits; search suggestions and cart count update.
6. Announcement: test center, left, and right alignment in contained and full-width modes with both one and multiple blocks; then confirm paused rotation, reduced motion, and desktop/mobile visibility.
7. Theme Editor: reload, select, deselect, unload, reorder, empty logo, and empty menu states. Confirm sticky behavior does not create duplicate scroll listeners after a Header section reload.

Run Theme Check and the focused contract test before distribution:

```sh
node scripts/test-premium-header.js
npm exec --yes --package @shopify/cli@latest -- shopify theme check --path apps/theme --config .theme-check.yml
```
