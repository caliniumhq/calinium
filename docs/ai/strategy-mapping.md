# Strategy-to-theme mapping

The Strategy Compiler returns 13 deterministic decisions. Milestone 6A maps each decision to a real Calinium capability, global setting, qualified section setting, or an explicit non-theme limitation.

The mapping lives in two catalogs:

- `config/strategy-setting-mapping.json` maps compiler decision keys to global and qualified section settings.
- `config/strategy-section-mapping.json` maps existing layout recipes and page blueprints to installed sections, with order, optionality, dependencies, fallback position, and source traces.

## Mapping statuses

`full` means a decision has an implemented, traceable Calinium control or installed-section composition path. `partial` means part of the strategy is represented but no unsafe implication should be made—such as choosing licensed fonts, real photography, color palette values, factual proof, or merchant copy. `unsupported` means Calinium intentionally has no corresponding Theme Editor control.

For example, spacing maps fully to the real layout settings. Typography maps partially because scale/line-height/tracking are real settings while a typography profile cannot safely select a particular licensed Shopify font. Industry is explicitly unsupported as a direct theme setting: it remains compiler context and influences later selection rather than becoming a fabricated merchant preference.

## Stable target formats

Global targets use their real Theme Editor ID:

```json
"global_setting_ids": ["section_spacing", "grid_gap"]
```

Section targets are qualified with the section and, when applicable, block type:

```json
"section_setting_refs": [
  "hero-slideshow.slide.desktop_image",
  "editorial-hero.enable_animation"
]
```

Every target is checked against the actual Shopify schema by `scripts/validate-theme-mapping.js`.

## Draft Builder contract

A future Draft Configuration Builder must consume the mapping status, safe-default disposition, content classification, and source trace together. It must not treat a `partial` mapping as permission to invent the missing content or write a setting that the mapping does not list.
