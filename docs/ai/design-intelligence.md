# Calinium AI design intelligence

This is Calinium's canonical strategy layer. It guides planning; it does not override Shopify settings, write storefront code, or authorize factual copy. The AI must use merchant input plus the files below to form a testable storefront strategy.

## Reasoning sequence

1. Classify the merchant with `industry-profiles.json`; use `general_retail` only when a more specific profile cannot be confirmed.
2. Select one primary design language from `design-language.json`, then validate that the merchant's stated personality is compatible.
3. Resolve typography, spacing, color, image, and animation profiles through the language and personality records. These are recommendations within the existing Calinium token and Theme Editor settings, not a license to add CSS values.
4. Choose a conversion strategy and a page blueprint. For a homepage, choose one `layout-recipes.json` recipe whose industry and content-density assumptions fit the catalog.
5. Select actual section IDs only from the recipe, blueprint, manifest, and `compatibility-matrix.json`. Check the real `/sections` directory before outputting a configuration.
6. Populate only settings allowed by `calinium-setting-metadata.json`; apply `content-safety-levels.md` before any factual text, proof, people, media, product, or sustainability content is published.
7. Validate JSON schemas, IDs, ordering, existing merchant data, accessibility, performance, and no-JavaScript behavior before handoff.

## Canonical catalogs

| File | What it teaches | Schema |
| --- | --- | --- |
| `config/design-language.json` | Visual language, density, and preferred supporting profiles. | `schemas/design-language.schema.json` |
| `config/industry-profiles.json` | Industry-specific priorities, homepage recipe, CTA tone, and product focus. | `schemas/industry-profiles.schema.json` |
| `config/layout-recipes.json` | Ordered homepage compositions and the reason each works. | `schemas/layout-recipes.schema.json` |
| `config/typography-profiles.json` | Theme-scale ranges, line heights, tracking, casing, measure, buttons, and labels. | `schemas/typography-profiles.schema.json` |
| `config/spacing-profiles.json` | Recommended ranges within Calinium’s spacing settings and whitespace philosophy. | `schemas/spacing-profiles.schema.json` |
| `config/color-strategies.json` | Semantic contrast, CTA, surface, accent, warning, and success guidance. | `schemas/color-strategies.schema.json` |
| `config/image-styles.json` | Composition, lighting, crop, representation, and grading direction. | `schemas/image-styles.schema.json` |
| `config/animation-profiles.json` | Motion intensity and reduced-motion fallback direction. | `schemas/animation-profiles.schema.json` |
| `config/conversion-strategies.json` | CTA density, proof, email timing, and truthful urgency guardrails. | `schemas/conversion-strategies.schema.json` |
| `config/brand-personality.json` | Personality-to-type, spacing, language, CTA, media, and section-selection bias. | `schemas/brand-personality.schema.json` |
| `config/page-blueprints.json` | Page-level flows, section limits, conversion goals, and storytelling balance. | `schemas/page-blueprints.schema.json` |
| `config/design-rules.json` | Cross-cutting composition and factual-claim rules. | `schemas/design-rules.schema.json` |
| `config/compatibility-matrix.json` | Section adjacency guidance using real section IDs. | `schemas/compatibility-matrix.schema.json` |

`schemas/design-intelligence.schema.json` owns the shared field definitions. Do not add a new version of a concept in another file; extend the appropriate catalog and update all affected references.

## Relationship with existing AI metadata

The existing section manifest determines what a section is, where it belongs, its dependencies, and its safety level. Setting metadata defines which fields may be populated. Block taxonomy gives repeated content a stable semantic name. This design layer determines why a composition fits a particular merchant before any section settings are drafted.

## Theme implementation boundaries

The database references Calinium’s existing `--co-*` tokens, Theme Editor typography/spacing/color controls, responsive-image system, icon library, focus states, and reduced-motion conventions. It deliberately stores ranges and directions rather than hard-coded CSS or merchant-specific fonts, colors, claims, imagery, or data.

Run `node scripts/validate-design-intelligence.js` after changing any catalog, schema, cross-reference, or design-intelligence example.
