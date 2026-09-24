# Image mosaic

**Purpose:** a controlled asymmetric image composition with intentional responsive fallbacks.

**Settings:** heading group, balanced/feature-left/feature-right/triptych layout, shared ratio, captions, color scheme, and spacing.

**Block API:** 2–6 `image` blocks with desktop/mobile image, optional link, caption, and focal position.

**Use:** brand worlds, material studies, and editorial image groupings.

**Accessibility and performance:** linked tiles remain one link each; unlinked media is not made artificially interactive. Focal position is applied through CSS rather than duplicate crops. Shopify responsive images reserve media geometry and are lazy-loaded. Dependencies: `section-heading`, `responsive-image`, and `section-spacing`.

**Limitation:** layouts are curated presets, not a free-form drag-and-drop canvas.
