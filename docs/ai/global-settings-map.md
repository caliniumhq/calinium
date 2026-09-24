# Global settings map

`config/theme-global-settings-map.json` is generated from the real definitions in `apps/theme/config/settings_schema.json`. It currently audits every global Theme Editor setting, including brand media, color schemes, typography, layout, shapes, and motion.

Each entry records:

- `setting_id`, Shopify type, schema default, and accepted bounded values;
- `ai_configurable`, `merchant_configurable`, `merchant_review_required`, and `merchant_only` flags;
- the canonical content-safety level and classification rationale;
- an exact source reference containing the original setting ID and setting group.

The catalog is not a second settings schema. `apps/theme/config/settings_schema.json` remains the source of truth, and the mapping validator checks that every catalog ID exists there.

## Safe use by a future Draft Builder

Only settings classified as `safe_automatic_default` in `config/theme-safe-defaults.json` may receive a schema default or an independently validated bounded mapping value. Font-picker selections, color palette definitions, and merchant-owned images are intentionally held for review or merchant selection.

Do not infer raw colors, upload imagery, choose a licensed font, or alter `apps/theme/config/settings_data.json` from a strategy decision alone.

## Regeneration

Run `node scripts/generate-theme-mapping-catalogs.js` after editing global settings, then run `node scripts/validate-theme-mapping.js`. The validator rejects stale IDs, bad source references, unsupported versions, and incomplete global-setting coverage.
