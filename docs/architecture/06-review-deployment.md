# 06 — Review & Deployment

The review and deployment stages are deliberately separate from planning and theme generation. They turn immutable configuration evidence into a verified development-theme state, never an automatic live publication. Refer to the [review workflow](diagrams/review-workflow.md), [deployment pipeline](diagrams/deployment-pipeline.md), [release workflow](diagrams/release-workflow.md), and [rollback workflow](diagrams/rollback-workflow.md).

## Review Session and Approval

The Review Session Engine opens an append-only review record for a generated workspace. Its state machine enforces legal transitions and records reviewer decisions as immutable audit events. Deployment eligibility depends on validated generated evidence, completed required review items, a valid audit chain, and approval evidence. The resulting approval manifest binds the session, generation, workspace fingerprint, audit head, confirmations, and merchant references.

## Development deployment

The Deployment Adapter accepts only an approved package. It verifies approval and workspace integrity, targets an existing unpublished/development theme or safely creates one when explicitly permitted, records the previous configuration for rollback preparation, and uploads only approved JSON configuration. It does not publish or replace the merchant’s main theme.

Authentication is isolated behind the deployment adapter and supports Shopify CLI authentication/environment input without embedding secrets. The adapter writes deployment reports, preview metadata, checksums, and append-only deployment history.

## Preview verification

The Preview Verification Engine is read-only. It validates deployment identity, target role, preview metadata, package and approval references, uploaded files, configuration checksums, templates, settings, sections, and history. Verification reports use a constrained state machine: `pending → running → verified|failed`. Browser automation is not required for v1.0; a remote read-only snapshot may be used when configured.

## Release candidate and rollback

The Release Manager revalidates a terminal verified development deployment and creates a local immutable release candidate. This is evidence for future governance, not a production release action.

The Rollback Manager requires an exact prior configuration snapshot that matches exactly one earlier terminally verified deployment on the same development target. It reuses the deployment adapter’s configuration-only transport, verifies restored checksums, and records append-only rollback evidence. It rejects main/published targets.

## Operational commands

The detailed CLI contracts and execution gates are documented in [Review Session](../ai/review-session-engine.md), [Deployment Adapter](../ai/deployment-adapter.md), [Preview Verification](../ai/preview-verification.md), and [Release & Rollback Manager](../ai/release-manager.md). All state-changing commands require explicit execution flags; no command in v1.0 publishes a live theme.
