# Video hero

**Purpose:** a dedicated cinematic hero with reliable static poster behavior.

**Settings:** Shopify-hosted video, optional YouTube/Vimeo URL, desktop/mobile poster, title, muted autoplay/loop/controls, overlay content, two actions, alignment/position, color scheme, overlay, and animation.

**Block API:** none.

**Use:** editorial films, process videos, and seasonal motion.

**Accessibility and performance:** external providers render only after the customer activates the labelled play control. Hosted autoplay is always muted, receives a pause/resume control, stops when hidden or offscreen, and does not autoplay under reduced motion. Poster imagery is responsive and keeps the content functional when no video is selected. Dependencies are the canonical media/image, button, heading, rich-text, icon, and existing video lifecycle primitives.

**Limitation:** external video does not expose a custom in-theme pause control after the provider iframe loads.
