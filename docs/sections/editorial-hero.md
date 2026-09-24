# Editorial hero

**Purpose:** a cinematic, typography-led campaign or collection introduction. It is a static hero, not a slideshow.

**Settings:** desktop/mobile image, eyebrow, heading and safe heading level, rich text, two actions, desktop/mobile alignment, vertical position, height, content width, overlay, color scheme, animation, and spacing.

**Block API:** none. The section has one editorial narrative, keeping hierarchy predictable.

**Use:** campaign openers and collection introductions. The first homepage section may render the requested H1; otherwise the heading is H2.

**Accessibility and performance:** text and CTAs remain native HTML above the image. The primary homepage image is eager only when this is section one; other images are lazy-loaded. Decorative overlay has no accessible content. It depends on `section-heading`, `rich-text`, `button`, `responsive-image`, and `section-spacing`.

**Limitation:** it does not include rotation, hotspots, or product-card behavior.
