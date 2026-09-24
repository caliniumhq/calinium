# Theme capabilities

`config/theme-capabilities.json` is the canonical high-level inventory of what the current Calinium theme actually implements. It is a bridge catalog, not a storefront configuration and not a source of merchant content.

Each capability has a stable ID, a short implementation-bound description, automation/review posture, and one or more source references. The catalog covers typography, color schemes, spacing and layout, reduced-motion-safe behavior, responsive media, composition, heroes, canonical product cards, merchandising, navigation, cart, search, editorial content, factual brand storytelling, trust content, blog/article content, and newsletter capture.

The source list is deliberate: a capability is only present when it can be traced to a real file such as `apps/theme/config/settings_schema.json`, `apps/theme/sections/*.liquid`, a canonical snippet, or an existing asset. The catalog does not claim a capability merely because a strategy profile recommends it.

## Automation posture

`ai_configurable` identifies a bounded presentation or composition capability that can be considered by a future Draft Builder. `merchant_review_required` identifies a capability that can affect brand expression, content, or merchant-owned choices. It does not grant authority to create facts, select assets, or overwrite a theme setting.

Use the field-level catalogs for an actionable setting decision:

- [Global settings map](global-settings-map.md)
- [Section capabilities](section-capabilities.md)
- [Strategy mapping](strategy-mapping.md)

## Maintenance

When a canonical primitive, global setting, or major capability changes, update this high-level catalog together with its source trace. Then run:

```sh
node scripts/generate-theme-mapping-catalogs.js
node scripts/validate-theme-mapping.js
```

The generator deliberately does not inspect or change templates, section instances, `settings_data.json`, or storefront runtime files.
