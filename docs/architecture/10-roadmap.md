# 10 — Roadmap

Architecture v1.0 records the platform after the foundational theme, intelligence, configuration, and development-theme lifecycle milestones. It does not authorize future work automatically.

## Completed architecture

| Area | Current capability |
| --- | --- |
| Theme foundation | OS 2.0 theme, shared primitives, canonical product card, icon library, responsive media, token-based presentation, and localized sections. |
| Section library | Foundational, editorial/hero, commerce/merchandising, and brand/storytelling packs. |
| Knowledge and design intelligence | Section/setting/block metadata, safety taxonomy, design profiles, recipes, blueprints, compatibility, and rules. |
| Merchant intent | Versioned Merchant Interview catalog, branching, answer validation, confirmation summary, session lifecycle, and canonical profile mapping. |
| Planning | Deterministic Strategy Compiler and explainable merchant-aware strategy. |
| Mapping and drafting | Capability mapping, safety/default classification, and deterministic Draft Builder. |
| Generation | Isolated JSON-only Theme Generator with change manifest, diff, and preview report. |
| Governance | Review Session Engine with append-only audit and approval manifest. |
| Development lifecycle | Development Theme Deployment Adapter, Preview Verification, Release Candidate, and controlled verified rollback. |

## Current limits

- No automatic production publishing exists.
- The generator creates only supported JSON configuration, not Liquid/CSS/JS/theme features.
- The planner never invents merchant content, resource selections, claims, or media.
- Preview Verification is structural/logical; browser-based visual verification is a future extension.
- Mapping coverage includes explicitly unsupported decisions; unsupported work stays unresolved rather than guessed.

## Future phases

### Phase 9 — governed production release

Introduce only after a dedicated specification: human-confirmed production promotion, live-theme identity checks, independent backup, strict rollback controls, release governance, and audit requirements. It must not weaken v1.0’s development-target restriction.

### Merchant experience

Build a dashboard for artifact visibility, review queues, missing assets, approvals, preview links, deployment history, and recovery evidence. It should read current append-only records rather than create a parallel state store.

### Merchant Interview experience

Add an authenticated, localized host experience for the completed Merchant Interview architecture: durable session persistence, secure asset intake, accessibility-tested controls, and explicit privacy/retention policy. It must retain the current architecture’s distinction between facts, preferences, references, and unresolved information.

### Visual Builder and AI Store Designer

Enable visual planning and proposed edits against the Draft Builder and mapping catalogs. Any applied configuration must continue through approval, generation, deployment, and verification gates.

### Platform expansion and commercial release

Introduce platform adapters for Hydrogen, WooCommerce, BigCommerce, and composable stacks only after each platform has a separate capability map, generator contract, deployment adapter, and safety analysis. Public beta and commercial release should follow security, observability, support, privacy, and governance readiness work.

Return to the [overview](01-overview.md) or [extensibility](08-extensibility.md).
