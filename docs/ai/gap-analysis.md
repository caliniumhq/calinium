# Theme-mapping gap analysis and Draft Builder readiness

The machine-readable status is in:

- `config/theme-mapping-coverage.json`
- `config/draft-builder-readiness.json`

The current audited coverage is **92.3%**: 5 compiler decisions are fully mapped, 7 are partially mapped, and 1 has no direct theme setting.

## Fully supported mapping paths

- `spacing` maps to the real global layout controls.
- `blueprint`, `homepage_recipe`, `section_selection`, and `section_ordering` map to installed-section composition, existing page blueprints, layout recipes, and compatibility guidance.

These paths still respect field-level safety and do not modify templates in this milestone.

## Partially supported mapping paths

- `personality` and `design_language` influence downstream controls but have no atomic Shopify setting.
- `typography` maps to scale, line-height, and tracking; font selection requires merchant review.
- `color_strategy` maps to scheme selection; palette definitions remain merchant-owned.
- `image_strategy` maps to real media fields, but asset availability and photographic style require merchant assets.
- `animation` maps to global motion and selected section toggles, not a universal animation-profile control.
- `conversion_strategy` maps to commerce, proof, and newsletter composition but cannot create claims, urgency, or verification evidence.

## Unsupported mapping path

`industry` has no direct Theme Editor setting. This is intentional: a merchant’s industry remains compiler context rather than a theme value that could be guessed or written to the storefront.

## Readiness rule

`YES` means a future Draft Builder can construct a candidate only from the listed bounded controls. `PARTIAL` means it must produce a merchant-review item or safe fallback. `NO` means it must retain the decision in the strategy and avoid generating a Theme Editor change.

## Recommended Milestone 6B scope

Build an isolated Strategy-to-Draft Configuration Builder that consumes these catalogs, emits a non-destructive proposed configuration artifact, and requires explicit merchant confirmation before any theme mutation. It should not bypass `merchant_only`, `merchant_confirmation_required`, or partial-mapping statuses.
