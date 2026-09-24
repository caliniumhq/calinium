# 02 — System Architecture

Calinium is organized into a theme runtime and a staged, offline configuration lifecycle. The runtime is intentionally not coupled to compiler execution. See the [system diagram](diagrams/system-architecture.md).

| Layer | Purpose | Primary inputs | Primary outputs | Contracts and validation | Dependencies |
| --- | --- | --- | --- | --- | --- |
| Theme Engine | Render merchant storefronts and Theme Editor controls. | Shopify objects, templates, settings, section blocks. | HTML, CSS, client-side enhancements. | Shopify schema, Theme Check, pack validators. | Liquid, Shopify OS 2.0, shared primitives. |
| Knowledge Layer | Describe real section, block, setting, and safety metadata. | `config/calinium-*.json`. | Selection/composition constraints. | Section manifest schema; pack validators. | Installed theme capabilities. |
| Design Intelligence | Describe design languages, industries, typography, spacing, imagery, motion, conversion, recipes, and rules. | Versioned `config/*-profiles.json` and related catalogs. | Resolution candidates and constraints. | Design-intelligence schemas and validator. | Knowledge Layer. |
| Dashboard | Authenticate merchants; host organization-scoped projects, durable sessions, the merchant-facing interview UI, Asset Library, Creative Director approvals, and server-only Shopify resource approval. | Account session, organization membership, project record, versioned interview catalog, project assets, Creative Director session, explicit Shopify assignment. | Durable sessions, Brand Blueprint, Store Strategy, canonical Merchant Profile revision, resource plan, asset metadata, normalized Shopify resources, scoped approvals, safe preview state, activity history. | Dashboard account/project/asset/Shopify tests/build; interview and pipeline contracts. | Public Merchant Interview and Creative Director façades; server-only OAuth/Admin API adapter; no browser credential access or Shopify runtime mutation. |
| Merchant Interview | Collect and validate merchant intent before planning. | Versioned question catalog and merchant answers. | Confirmed session and compiler-compatible Merchant Profile with optional enrichment. | Interview/session schemas; Merchant Interview validator. | Knowledge catalogs, asset context supplied by the host, and existing profile validator. |
| Merchant Profile Adapter | Convert approved Creative Director work into the canonical Merchant Profile, then a validated compiler-compatible projection. | Approved Creative Brief, Store Strategy, review state, optional merchant configuration references. | Canonical profile, compiler projection, and a conservative Draft handoff. | Canonical profile schema and integration validator. | Creative Director review gate, existing Strategy Compiler, Draft Builder. |
| Strategy Compiler | Resolve a merchant profile into an explainable storefront strategy. | Merchant profile, Knowledge Layer, Design Intelligence. | `calinium-storefront-strategy`. | Merchant-profile and strategy schemas; compiler tests. | Local catalogs only. |
| Theme Capability Mapping | Bridge compiler decisions to real theme sections and settings. | Section schemas, theme settings, strategy decisions. | Capability, setting, section, safe-default, and classification maps. | Mapping schemas and validator. | Theme Engine and Strategy Compiler contracts. |
| Draft Builder | Plan a reviewable theme configuration without writing theme JSON. | Valid strategy, merchant profile, mapping catalogs. | `calinium-draft-configuration`. | Draft schema and validator. | Mapping Layer. |
| Theme Generator | Produce configuration-only files inside an isolated workspace. | Approved ready draft and mapping catalogs. | Generated theme manifest, JSON templates/settings, change manifest, diff, preview report. | Generator schema and validator. | Draft approval, source runtime snapshot. |
| Review Session Engine | Gather review items and apply an append-only approval state machine. | Generated workspace and manifest. | Review session, audit events, approval manifest. | Review schemas and state-machine validation. | Generator output. |
| Deployment Adapter | Upload an approved package to an unpublished/development Shopify theme. | Approved session, manifests, generated workspace. | Deployment record, preview report, rollback preparation, deployment history. | Deployment schemas and adapter validator. | Shopify CLI/auth adapter; Review Engine. |
| Preview Verification | Read and compare deployed configuration evidence. | Deployment record, package, approval, generated workspace. | Preview verification report and history. | Verification schema and state machine. | Deployment Adapter. |
| Release & Rollback Manager | Create a local release candidate and restore a prior verified development configuration when eligible. | Verified preview, deployment history, release/rollback evidence. | Release manifest/history; rollback record/history. | Release and rollback schemas; manager validator. | Preview Verification and Deployment Adapter. |

## Lifecycle sequence

```text
Merchant → Dashboard → Merchant Interview → Merchant Profile → Strategy Compiler → Theme Mapping → Draft Builder
  → Approved Draft → Theme Generator → Review Session → Approval Manifest
  → Development Deployment → Preview Verification → Release Candidate → Controlled Rollback
```

There is no automatic production publishing step in v1.0. A release candidate is local evidence tied to a verified development target, not a live-theme action.

The next documents explain the [artifact flow](03-data-flow.md), [planning pipeline](04-ai-pipeline.md), and [review/deployment lifecycle](06-review-deployment.md).
