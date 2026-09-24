# Release & Rollback Manager

Milestone 8D turns a terminally verified development-theme deployment into a local **release candidate** and, when needed, restores an earlier terminally verified configuration to that same unpublished/development theme. It never publishes a theme, changes a live theme, regenerates a draft, or edits a generated workspace.

The engine is isolated in `ai/release-manager/`. It consumes the approval and deployment evidence produced by earlier layers rather than repeating their reasoning:

`Strategy → Draft → Review Session → Approval Manifest → Deployment → Preview Verification → Release / Rollback`.

## Release candidate

`createReleaseCandidate` accepts only a `verified` M8C report with no failures or blocking warnings. It revalidates the deployment package, review session, approval manifest, preview evidence, development-theme role, append-only verification history, and Milestone 8B rollback preparation metadata. It then creates immutable local evidence under `output/releases/release-*/` and appends the exact manifest to `output/release-history/events/`.

A release candidate is an approval-ready record for an already verified development target. It is not a Shopify publication operation.

## Controlled rollback

`performRollback` requires a release candidate and explicit execution. It resolves the exact pre-deployment configuration snapshot recorded by M8B, then requires that this snapshot match exactly one earlier deployment on the same target and that this earlier deployment has a terminal `verified` preview report. It pulls the current configuration, uploads only approved JSON configuration through the M8B allowlisted transport, pulls it again, and checks every expected file checksum.

M8B's `rollback-metadata.json` remains immutable preparation evidence. M8D writes a separate `calinium-rollback-record` for the execution, preserving both the original snapshot and the action audit trail.

## Commands

```sh
node release-theme.js validate --verification output/preview-verifications/preview-verification-0001
node release-theme.js release --verification output/preview-verifications/preview-verification-0001 --id release-0001 --released-at 2026-07-20T00:00:00Z --notes "Verified candidate" --execute
node release-theme.js rollback --release output/releases/release-0001 --id rollback-0001 --rolled-back-at 2026-07-20T00:00:00Z --reason "Restore verified configuration" --store store.myshopify.com --execute
node release-theme.js history --type all
```

`--execute` is mandatory for release-record creation and rollback. Rollback additionally requires a real explicit development-theme target through the existing M8B authentication adapter. There is deliberately no publish command.

## Contracts and validation

- `schemas/calinium-release-manifest.schema.json` defines an immutable release candidate.
- `schemas/calinium-rollback-record.schema.json` defines an immutable rollback execution record.
- `scripts/validate-release-manager.js` checks file presence, JSON/JavaScript syntax, canonical dependency reuse, and prohibited publish/runtime behavior.
- `scripts/test-release-manager.js` runs the lifecycle against a fake development-theme service; it performs no network or Shopify mutation.

Every action creates a repository backup under its isolated output directory before recording the action. The source runtime snapshot must match before completion.
