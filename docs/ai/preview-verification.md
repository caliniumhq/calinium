# Preview Verification Engine

Milestone 8C verifies an approved development-theme deployment without generating, uploading, publishing, or altering configuration. It consumes only the approved review chain and deployment evidence created by earlier Calinium layers.

## Inputs and evidence

The engine requires the deployment package, deployment report, preview report, rollback metadata, append-only deployment-history event, approved review session, approval manifest, generated-theme manifest, generated reports, and the post-upload configuration snapshot captured by Milestone 8B.

`node verify-preview.js validate --deployment output/deployments/deployment-0001` performs no writes. `verify` creates a new immutable report only after those inputs are readable and traceable.

## Read-only Shopify option

By default, verification compares the approved package with the immutable post-upload snapshot. Supplying `--store` performs an additional Shopify CLI theme list and configuration pull into the new verification workspace. This is read-only: there is no push, publish, or configuration-generation command in this engine.

Browser automation is deliberately out of scope. URL validation checks HTTPS preview metadata and the recorded `preview_theme_id`; a later browser verification layer can add rendering checks without weakening this evidence chain.

## CLI

```sh
node verify-preview.js validate --deployment output/deployments/deployment-0001
node verify-preview.js verify \
  --deployment output/deployments/deployment-0001 \
  --id preview-verification-0001 \
  --verified-at 2026-07-20T00:00:00Z
node verify-preview.js explain --deployment output/deployments/deployment-0001
node verify-preview.js history
node verify-preview.js report --verification preview-verification-0001
```

`verify` returns a nonzero status when the immutable report is `failed`; failures remain recorded with remediation guidance.
