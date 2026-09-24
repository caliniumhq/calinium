# Editorial grid

**Purpose:** a magazine-style grid of articles, collections, pages, or custom destinations.

**Settings:** heading group, 2–4 desktop columns, media ratio, featured first card, borders, color scheme, and spacing.

**Block API:** 2–8 `story` blocks with optional image, eyebrow, heading, excerpt, article, page, collection, and custom URL. Article/page/collection selection supplies missing title, summary, image, and URL; a manually entered URL is used when no content source is selected.

**Use:** journals, collection navigation, and editorial landing-page modules.

**Accessibility and performance:** cards are semantic articles; each linked card has exactly one link. Responsive images are lazy-loaded. The section uses `section-heading`, `responsive-image`, and `section-spacing`.

**Limitation:** it intentionally does not render product cards or commerce controls.
