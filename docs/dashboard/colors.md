# Brand Colors

Merchants select a color source through the canonical Content questions. Manual palettes include primary, secondary, accent, background, text, and optional additional colors. Values are normalized to uppercase six-digit hexadecimal values in the enriched profile.

The dashboard presents WCAG contrast feedback for text on background, button text on the primary color, and primary on background. The feedback distinguishes acceptable, caution, and failing results without relying on color alone. It informs rather than silently blocks intentional creative choices.

For a PNG logo, the local palette extractor decodes supported non-interlaced 8-bit RGB/RGBA PNG data, ignores transparent pixels, quantizes the result deterministically, and ranks colors by prominence. No external API, AI call, or paid service is used. Selecting a suggestion creates an explicit merchant-approved `extracted` palette; extraction never changes the canonical palette by itself. JPEG and WebP remain valid asset uploads but are not palette-extraction sources in this release.
