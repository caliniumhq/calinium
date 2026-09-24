# 01 — Overview

Calinium exists to make Shopify storefront configuration deliberate, traceable, and safe. It combines an Online Store 2.0 theme with an offline decision pipeline that translates validated merchant input into a reviewable configuration proposal. The system does not treat section assembly as a substitute for design judgment: it first resolves industry, brand personality, visual language, layout, assets, and safety requirements.

## Goals

- Maintain one reusable theme system across editorial, commerce, and brand storytelling experiences.
- Produce a deterministic storefront strategy from a structured merchant profile and versioned knowledge catalogs.
- Keep merchant-supplied facts, resource references, and approvals explicit.
- Separate planning, configuration generation, review, deployment, verification, release candidacy, and rollback into independently validated stages.
- Preserve the source theme and merchant data while work is being proposed, reviewed, or validated.

## Design principles

### Deterministic AI planning

The Strategy Compiler uses local, versioned JSON catalogs and pure resolution modules. It has no model calls, external data source, random choice, timestamp-based decision, Shopify API access, or Liquid generation. Missing merchant information stays unresolved; it is never fabricated.

### Explainability and traceability

Strategies include resolutions, confidence, source catalogs, rejected alternatives, reasoning, and a decision trace. Downstream artifacts preserve these references through mappings, drafts, generated manifests, review sessions, approvals, deployments, preview verification, release manifests, and rollback records.

### Schema-first boundaries

Merchant profiles, storefront strategies, draft configurations, generated-theme manifests, approval manifests, deployment records, preview verification reports, release manifests, and rollback records each have a JSON Schema. Validators reject incomplete, malformed, incompatible, or unapproved inputs before a later stage can consume them.

### Progressive theme behavior

The theme follows Shopify Online Store 2.0 conventions. Liquid renders meaningful content and links first. CSS supplies responsive presentation, and JavaScript progressively enhances interactions while respecting reduced motion and Theme Editor lifecycle events.

### Merchant safety and source preservation

The compiler, mappings, and Draft Builder do not write Shopify files. The generator writes only to an isolated `output/` workspace. The deployment adapter allows only approved templates and `config/settings_data.json` to an unpublished/development theme; release candidacy never publishes. Source-runtime snapshots, checksums, backups, and append-only records protect the working theme and merchant evidence.

Continue with the [system architecture](02-system-architecture.md) and [security model](07-security.md).
