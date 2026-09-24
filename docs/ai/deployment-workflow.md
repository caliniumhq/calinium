# Deployment Workflow

```text
Approved review session
  → package validation
  → checksum and fingerprint verification
  → select or explicitly provision non-live target
  → capture prior configuration metadata
  → upload approved JSON configuration only
  → pull configuration into isolated verification directory
  → compare checksums
  → create preview and deployment reports
  → append immutable history record
  → prepare rollback metadata
```

Each step is isolated. The source theme, generated workspace, approval manifest, and review session are read only. Before upload, the adapter creates an isolated staging directory with the local runtime shape required by Shopify CLI and overlays the approved JSON files. The push command is still allowlisted to `templates/*.json` and `config/settings_data.json`; runtime files in staging are never uploaded.

The Shopify CLI integration uses theme list, push, and pull with JSON/configuration allowlists. Shopify documents `--only` for selecting multiple files during theme push and pull, and a JSON response for machine-readable push output. [Theme push](https://shopify.dev/docs/api/shopify-cli/theme/theme-push), [theme pull](https://shopify.dev/docs/api/shopify-cli/theme/theme-pull)
