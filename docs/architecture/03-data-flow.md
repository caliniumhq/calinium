# 03 — Data Flow

Every handoff produces a named, validated artifact. Artifacts are additive: downstream stages read prior records and do not rewrite their evidence. The [data-flow diagram](diagrams/data-flow.md) shows the high-level graph.

| Artifact | Producer | Consumer | Integrity and purpose |
| --- | --- | --- | --- |
| Creative Director Session | Dashboard Creative Director service. | Merchant review and existing pipeline façade. | Project-scoped durable conversation, Brand Blueprint, Store Strategy, review state, resource plan, and real generation/preview evidence. Forward progression requires explicit approval. |
| Merchant Interview and Session | Merchant Interview Engine. | Merchant confirmation and Merchant Profile builder. | Versioned catalog/session; records typed answers, visibility, lifecycle, discovery, and confirmation without Shopify persistence. |
| Project Asset | Dashboard Asset Service and storage provider. | Dashboard interview/profile host. | Project-scoped metadata, checksum, opaque storage key, controlled read URL, and activity evidence; bytes never enter relational fields. |
| Shopify Connection and Credential Envelope | Dashboard Shopify Connection Service. | Project resource review and safe preview preparation. | Organization-owned store identity, encrypted server-only access token envelope, requested/granted scopes, health, project assignment, and lifecycle events. No credential enters a browser, generated workspace, manifest, or activity payload. |
| Shopify Resource and Project Approval | Dashboard Shopify Connection Service. | Creative Director Store Resources and approved generation context. | Minimal normalized catalog metadata, source revision, availability, explicit project decision, approval timestamp, and approver. A stale, deleted, revoked, or cross-project resource cannot resolve as a generator input. |
| Shopify Preview Target | Dashboard Shopify Connection Service. | Merchant preview view and existing Preview Verification. | Project/connection/build-bound record for a merchant-approved existing unpublished/development theme; an HTTPS URL appears only when Shopify returns it. |
| Canonical Merchant Profile | Approved Creative Director handoff. | Merchant Profile adapter. | `merchant-profile`; separates approved merchant understanding, approved creative direction, configuration references, and traceability. |
| Compiler Merchant Profile | Merchant Profile adapter or Merchant Interview. | Strategy Compiler. | `calinium-merchant-profile`; unresolved fields remain unresolved. Optional `enrichment` retains traceable Discovery and asset context without changing core compiler fields. |
| Storefront Strategy | Strategy Compiler. | Draft Builder. | `calinium-storefront-strategy`; explains industry, language, visual system, section plan, assets, verification, and safety. |
| Mapping catalogs | Capability mapping audit. | Draft Builder and Theme Generator. | Source-trace real Theme Editor capabilities, permitted defaults, and field classification. |
| Draft Configuration | Draft Builder. | Approval process and Theme Generator. | `calinium-draft-configuration`; lists planned settings, section instances, missing input, assets, review queue, blocked fields, and readiness. |
| Generation Approval | Merchant/reviewer process. | Theme Generator. | `calinium-generation-approval`; proves a ready draft is approved with supplied resource references. |
| Generated Workspace | Theme Generator. | Review Session Engine. | Isolated `output/generation-run-*`; contains only generated JSON configuration plus reports and manifests. |
| Review Session and Approval Manifest | Review Session Engine. | Deployment Adapter. | Append-only audit events and approval evidence bind the generated workspace to a reviewer decision. |
| Deployment Package and Record | Deployment Adapter. | Preview Verification and Release Manager. | Approved JSON-only package, development target evidence, upload validation, preview URL, rollback preparation. |
| Preview Verification | Preview Verification Engine. | Release Manager. | Independent evidence of deployment, theme identity, JSON files, templates, settings, sections, checksums, and history. |
| Release Manifest | Release Manager. | Future release governance and rollback. | Immutable local release-candidate record; does not publish. |
| Rollback Record | Rollback Manager. | Audit/recovery operations. | Immutable evidence that a prior verified configuration was restored to the same development target. |

## Evidence propagation

1. A Creative Director session records merchant conversation, corrections, and explicit Brand Blueprint/Store Strategy approvals before identifying real resource needs.
2. An interview session records merchant answers and explicit summary confirmation before producing a profile.
3. A strategy names the applicable catalog versions and decisions.
4. A draft retains mapping and compiler explanations for every resolved setting or section plan.
5. The generated manifest retains the approved draft version, source strategy version, generated files, settings, merchant references, warnings, and unsupported items.
6. The review session binds the workspace fingerprint and audit-log head to an approval manifest.
7. Deployment records include the package’s review and approval checksums, target identity, configuration file checksums, and rollback metadata.
8. Preview, release, and rollback records carry references and checksums to their upstream evidence.

## Storage boundaries

- `config/`, `schemas/`, and `ai/` are source-controlled architecture and implementation inputs.
- Shopify runtime directories are under `apps/theme/`: `layout/`, `templates/`, `sections/`, `snippets/`, `assets/`, `locales/`, and the two Shopify settings files under `apps/theme/config/`. Root `config/` is platform metadata only.
- `output/` is an isolated artifact area for generation, review, deployment evidence, verification, releases, and rollbacks.

See [security](07-security.md) for integrity controls and [review and deployment](06-review-deployment.md) for lifecycle gates.
