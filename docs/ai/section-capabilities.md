# Section capabilities

`config/theme-section-capabilities.json` is the exhaustive, generated capability profile for every installed `apps/theme/sections/*.liquid` file. It is produced from each real Shopify `{% schema %}` JSON block and enriches a section only with metadata already present in the Calinium section manifest.

For every section, the catalog records:

- stable `section_id`, schema-localized name, and a manifest-backed purpose when one exists;
- section settings, blocks, presets, app-block support, and layout-related select values;
- optional versus merchant-required fields (Shopify schemas do not supply a universal required-field flag);
- static snippet and asset dependencies found in the real Liquid source;
- existing performance metadata or `unknown` where no performance classification exists;
- AI-configurable and merchant-only field lists;
- source references for the section, every setting, and every block setting.

The generated field catalog includes section and block IDs in fully qualified form, for example:

```text
hero-slideshow.slide.desktop_image
editorial-hero.heading
product-carousel.enable_quick_add
```

This prevents a future builder from mistaking same-named settings in different blocks or sections for one shared Theme Editor control.

## Merchant safety

The capability profile describes what a section accepts. It does not authorize adding the section to a template or populating merchant-facing data. Media, Shopify resource pickers, navigation destinations, Custom Liquid, and factual fields retain their stricter classifications in `config/theme-content-classification.json`.

## Regeneration and validation

```sh
node scripts/generate-theme-mapping-catalogs.js
node scripts/validate-theme-mapping.js
```

The validator checks all installed sections, every generated setting reference, dependencies, source files, block types, and catalog coverage. It also compares storefront/runtime files to the Milestone 6A backup archive.
