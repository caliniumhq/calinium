# Development Theme Deployment Adapter

Milestone 8B deploys an approved configuration package to an unpublished or development theme only. It is isolated from the Strategy Compiler, Draft Builder, Theme Generator, Review Session Engine, source theme, and generated workspace.

## Approval and integrity gate

The adapter accepts only a review session that is both `approved` and deployment eligible. Before any remote command, it validates:

- the review session, append-only audit chain, and approval manifest;
- the generated-workspace fingerprint and generated-manifest checksum;
- the approval-manifest checksum and audit head;
- change manifest, diff, preview report, and generated source backup;
- an allowlist containing only `templates/*.json` and `config/settings_data.json`.

Any mismatch terminates the operation before upload.

## Commands

```sh
node deploy-theme.js validate --session output/review-sessions/review-session-0001
node deploy-theme.js deploy \
  --session output/review-sessions/review-session-0001 \
  --id deployment-0001 \
  --deployed-at 2026-07-20T00:00:00Z \
  --reason "Approved development preview" \
  --store example.myshopify.com \
  --theme-id 123 \
  --execute
node deploy-theme.js preview --deployment output/deployments/deployment-0001
node deploy-theme.js history
node deploy-theme.js explain --session output/review-sessions/review-session-0001
```

`--execute` is required. Without it, the adapter returns only validation and cannot contact Shopify.

## Authentication

`shopify-auth.js` supports Shopify CLI interactive authentication, `SHOPIFY_FLAG_STORE`, and an optional `SHOPIFY_CLI_THEME_TOKEN` sourced only from the environment. Values are never written to reports. The abstraction preserves a future OAuth adapter boundary without implementing OAuth here.

## Safety

The adapter never calls a publish command, never passes a live-theme flag, and rejects target roles other than `unpublished` or `development`. It creates a validated local repository backup in each deployment directory before remote work. Shopify describes development themes as temporary and unpublished themes as persistent preview targets. [Shopify CLI theme documentation](https://shopify.dev/docs/storefronts/themes/tools/cli)
