# Calinium AI knowledge layer

The Shopify runtime referenced by these engines is `apps/theme/`; root `config/` remains the platform catalog location. See [Repository Restructure v1.0](../architecture/repository-restructure.md) for the upload boundary, canonical path resolver, validation, and export workflow.

The AI knowledge layer is external metadata; it never adds unsupported properties to Shopify section schemas. Its canonical files are:

- `config/calinium-section-manifest.json` — section selection, composition, dependency, industry, and safety guidance.
- `config/calinium-setting-metadata.json` — semantic/safety details for important Shopify settings.
- `config/calinium-block-taxonomy.json` — stable repeatable block names and field meanings.
- `schemas/calinium-section-manifest.schema.json` — machine-readable manifest contract.

## Design intelligence foundation

The design intelligence foundation teaches the AI how to form a storefront strategy before it configures a section. Read [design-intelligence.md](design-intelligence.md) for the catalog map and reasoning sequence, [design-decision-trees.md](design-decision-trees.md) for constrained decision flows, and [prompt-guidelines.md](prompt-guidelines.md) for the required AI input/output contract.

Its 13 additive `config/*.json` catalogs cover visual language, industry, recipes, typography, spacing, color, photography, animation, conversion, personality, page flow, universal rules, and section compatibility. Every catalog has a local schema under `schemas/` and is checked with `node scripts/validate-design-intelligence.js`.

## Strategy compiler

The [AI Strategy Compiler](compiler-overview.md) consumes the knowledge layer and a merchant profile to produce a deterministic, explainable strategy only. Start with the [architecture](compiler-architecture.md), [input contract](compiler-input-schema.md), [output contract](compiler-output-schema.md), and [resolution order](compiler-resolution-order.md). Validation, safety, versioning, extension, and fixture guidance are documented in the companion compiler guides.

Use `node scripts/validate-brand-storytelling-pack.js` after extending the layer. Examples in `docs/ai/examples/sections/` are test fixtures, not deployable Shopify templates.

AI must treat merchant verification rules as publication gates. The knowledge layer enables planning and draft configuration; it does not authorize factual claims or asset creation.

## AI Creative Director v1

The deterministic [AI Creative Director v1](../architecture/ai-creative-director.md) is a pre-compiler reasoning boundary: it turns merchant-qualified input into a reviewable Creative Brief and Store Strategy without changing the established Merchant Profile compiler, theme generator, or runtime theme. Its local conversation engine, understanding layer, and recommendation adapters live under `ai/conversation/`, `ai/understanding/`, `ai/creative-brief/`, `ai/recommendations/`, and `ai/store-strategy/`. Run `npm run creative-director -- --fixture fixtures/leather-travel-bags.json`, then `npm run validate:creative-director` and `npm run test:creative-director`.

## Theme capability and strategy mapping

Milestone 6A adds the offline bridge from the compiler’s decisions to the real Calinium Theme Editor surface. The generated catalogs audit every global setting and installed section without altering any Shopify runtime file:

- [Theme capabilities](theme-capabilities.md)
- [Global settings map](global-settings-map.md)
- [Section capabilities](section-capabilities.md)
- [Strategy mapping](strategy-mapping.md)
- [Gap analysis and Draft Builder readiness](gap-analysis.md)

Run `node scripts/generate-theme-mapping-catalogs.js` after an intentional schema change, then `node scripts/validate-theme-mapping.js`. The mapping validator checks schemas, source traces, real setting and section references, compiler-decision coverage, readiness metrics, and Milestone 6A storefront-preservation checks.

## Draft Configuration Builder

Milestone 6B adds an isolated deterministic planner between an approved strategy and any future theme generator. It never writes Shopify configuration. Read the [Draft Builder overview](draft-builder.md), [draft schema](draft-schema.md), [homepage planning](homepage-planning.md), [merchant safety queues](merchant-review.md), and [validation guide](draft-validation.md).

Run `node scripts/test-draft-builder.js` and `node scripts/validate-draft-builder.js` after changing the builder. Draft outputs must be written outside Shopify runtime directories and remain review artifacts until a future separately authorized generator translates approved work into theme configuration.

## Non-Destructive Theme Generator

Milestone 7 turns an approved, `Ready` draft into an isolated configuration-only review workspace. It never writes the working theme and never deploys to Shopify. Read the [generator overview](theme-generator.md), [generated manifest schema](generated-theme-schema.md), [change manifest](change-manifest.md), [theme diff](theme-diff.md), and [workspace contract](generation-workspace.md).

Run `node scripts/test-theme-generator.js` and `node scripts/validate-theme-generator.js` after changing it. Use `node generate-theme.js --help` for the review-workspace CLI.

## Read-Only Theme Generation Engine

Milestone 15 assembles the complete Calinium One runtime only after Brand Blueprint, Store Strategy, and Resource Plan approvals have passed. It preserves the existing configuration-only workspace for the established review/deployment engines, then creates a sibling full package, canonical Theme Specification, ZIP, and isolated validation report. It has no Shopify write capability. Read the [engine guide](read-only-theme-generation.md), run `npm run validate:read-only-theme-generation`, and execute `node generate-theme.js validate-package --workspace output/generation-run-example --pretty` to run Theme Check against a completed local package.

## Review & Approval Session Engine

Milestone 8A adds an append-only, deterministic review workflow over an existing generated workspace. It does not alter that workspace, the source theme, or Shopify. Read the [engine guide](review-session-engine.md), [session and audit schemas](review-session-schema.md), [state machine](review-state-machine.md), and [approval manifest contract](approval-manifest.md).

Run `node scripts/test-review-session-engine.js` and `node scripts/validate-review-session-engine.js` after changes. Use `node review-theme.js --help` for the review CLI.

## Development Theme Deployment Adapter

Milestone 8B deploys only an approved configuration package to an unpublished/development Shopify theme. It never publishes a theme or changes the source/generation/review artifacts. Read the [adapter guide](deployment-adapter.md), [workflow](deployment-workflow.md), [development target policy](development-theme.md), [history](deployment-history.md), [preview report](preview-report.md), and [rollback preparation](rollback-preparation.md).

Run `node scripts/test-deployment-adapter.js` and `node scripts/validate-deployment-adapter.js` after changes. Use `node deploy-theme.js --help` for the explicit-execution deployment CLI.

## Preview Verification Engine

Milestone 8C validates a development-theme deployment against the approved package without changing Shopify, deployment evidence, or generated workspaces. Read the [verification overview](preview-verification.md), [workflow](verification-workflow.md), [report contract](verification-report.md), [append-only history](verification-history.md), and [state machine](verification-state-machine.md).

Run `node scripts/test-preview-verification.js` and `node scripts/validate-preview-verification.js` after changes. Use `node verify-preview.js --help` for the read-only verification CLI.

## Release & Rollback Manager

Milestone 8D creates immutable local release candidates from terminally verified development-theme deployments, then supports controlled restoration of a previously verified configuration to that same development target. It never publishes a theme and does not change generated workspaces, drafts, strategies, or source runtime files. Read the [manager overview](release-manager.md), [release workflow](release-workflow.md), [release history](release-history.md), [rollback workflow](rollback-workflow.md), and [rollback history](rollback-history.md).

Run `node scripts/test-release-manager.js` and `node scripts/validate-release-manager.js` after changes. Use `node release-theme.js --help` for the explicit-execution release/rollback CLI.
