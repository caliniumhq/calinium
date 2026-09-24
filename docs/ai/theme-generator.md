# Theme Generator

The Theme Generator is Calinium’s first configuration-producing layer. It converts an **approved, Ready Draft Configuration** into a review-only Shopify configuration workspace. It is deliberately isolated from storefront runtime code.

## Inputs and approval gate

`generate-theme.js generate` accepts a Draft Configuration and a separate immutable approval record. Before any output directory is created it validates both schemas and refuses to proceed when any of the following are true:

- the Draft is not `Ready` or its validation report is not valid;
- a blocker, unresolved merchant input, missing required asset, or review item remains;
- the approval record is absent, invalid, negative, or for another draft version;
- a required asset has no merchant-supplied reference.

The approval record contains opaque merchant resource references. The generator never discovers, uploads, alters, or invents Shopify products, collections, menus, copy, images, or videos.

## Workspace and CLI

Generation is limited to `output/generation-run-*`; it refuses any path outside that directory and refuses to overwrite an existing run.

```sh
node generate-theme.js generate --draft approved-draft.json --approval approval.json --run-id generation-run-0001 --pretty
node generate-theme.js validate --workspace output/generation-run-0001 --pretty
node generate-theme.js diff --workspace output/generation-run-0001
node generate-theme.js preview --workspace output/generation-run-0001
node generate-theme.js explain --workspace output/generation-run-0001
```

The immutable approval timestamp becomes the manifest’s generation timestamp. This makes identical inputs deterministic; the generator deliberately does not read the clock.

## What it writes

The generated `theme/` directory contains only `templates/*.json` and `config/settings_data.json`. It does not contain Liquid, sections, snippets, assets, CSS, JavaScript, locales, or `settings_schema.json`.

Baseline templates and `settings_data.json` are read only. Existing section instances are preserved when they already satisfy a planned section type; only absent planned section types receive a generated instance. Existing baseline sections remain in the order after planned items. Proposed safe global settings are applied only to the copied `settings_data.json` in the review workspace. Merchant-only or review-gated values remain preserved unless the approval explicitly provides a reference for that exact field and records `field:<setting_ref>` as completed; the generator never substitutes a value by itself.

The generator records unsupported page plans rather than inventing configurations for them. Before configuration is written, it creates and validates a `source-runtime-backup.tar.gz` in the workspace; a source-runtime hash snapshot is also compared before and after every run, and a mismatch terminates generation.

## Module boundaries

- `load-draft.js`: draft/approval schema and readiness gate.
- `load-mappings.js`: approved capability catalog loader.
- `generate-settings.js`: copied global setting resolution.
- `generate-homepage.js`, `generate-pages.js`, `generate-section-instances.js`: JSON-only page assembly.
- `resolve-resource-references.js`: preserves approved opaque references.
- `validate-generated-theme.js`: schema, configuration, capability, and isolation validation.
- report modules: change manifest, diff, and preview.

No module calls Shopify, generates Liquid, or executes in the storefront.

## Limitations

The review workspace is not deployment. A future approval/deployment layer must decide how to apply it to Shopify. Content protected by the Draft Builder must be resolved before a Draft becomes Ready; this generator will not resolve it on the merchant’s behalf.
