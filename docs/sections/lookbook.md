# Lookbook

**Purpose:** a sequence of image-led editorial entries, not an interactive shop-the-look component.

**Settings:** heading group, editorial or feature-first layout, item numbers, color scheme, and spacing.

**Block API:** 2–6 `item` blocks with desktop/mobile image, media ratio, title, short text, custom link, optional product, and optional collection. A custom link takes precedence; otherwise a selected product then collection supplies the destination.

**Use:** lookbooks, material stories, travel journals, and visual collections.

**Accessibility and performance:** each destination is one semantic link, never a nested action. Images use responsive sources and are lazy-loaded. It uses `section-heading`, `responsive-image`, and `section-spacing`.

**Limitation:** it deliberately has no hotspots, cart actions, or Quick Add.
