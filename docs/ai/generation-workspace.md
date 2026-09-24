# Generation Workspace

A run is isolated at:

```text
output/
  generation-run-0001/
    theme/
      config/settings_data.json
      templates/*.json
    reports/
      change-manifest.json
      theme-diff.json
      preview.md
    manifests/
      source-runtime-backup.tar.gz
      generated-theme.json
```

The generator creates this directory only when it does not already exist. It never deletes or replaces a run. This provides a stable review artifact and prevents accidental overwrites.

Before writing configuration, the generator creates and validates `manifests/source-runtime-backup.tar.gz` containing the runtime from `apps/theme/`: templates, sections, snippets, assets, locales, `settings_schema.json`, and `settings_data.json`. It also snapshots those paths’ hashes before and after writing and fails if anything changed. The workspace validator rejects any runtime file inside `theme/` other than template JSON and copied `settings_data.json`.

Because this workspace is configuration only, it cannot run independently as a Shopify theme; preview tooling must combine it with an approved immutable theme source in a later, explicitly authorized process.
