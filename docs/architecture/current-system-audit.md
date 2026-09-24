# Current System Audit

Audited: 2026-07-21
Scope: repository state before AI Creative Director v1

## Product source

The pre-implementation audit found the product documentation in a directory named `product:` (including the trailing colon). Its eight files were checksum-recorded, then moved byte-for-byte into the intended `product/` directory as part of this controlled structure correction; `Manifesto.md` was renamed to `manifesto.md` to match the documented product contract. The files contain the merchant journey, manifesto, principles, decision matrix, personality, terminology, vision, and roadmap. They establish that merchants describe their business; Calinium recommends design and technical decisions; merchants approve meaningful creative recommendations.

## Repository layout

| Path | Current responsibility |
| --- | --- |
| `apps/theme/` | Shopify Online Store 2.0 runtime. Contains only `assets`, `config`, `layout`, `locales`, `sections`, `snippets`, and `templates`. |
| `apps/dashboard/` | React 18 / Vite 8 merchant application with a Node same-origin API, durable storage, accounts, projects, Merchant Interview UI, and Asset Library. |
| `ai/compiler/` | Deterministic strategy compiler driven by the knowledge and design-intelligence catalogs. |
| `ai/merchant-interview/` | Catalog-driven interview, branching, validation, session lifecycle, summaries, and canonical Merchant Profile builder. |
| `ai/draft-builder/` | Validated strategy-to-draft planner. It does not write Shopify configuration. |
| `ai/theme-generator/` | Approved-draft generator that writes configuration only into isolated `output/generation-run-*` workspaces. |
| `ai/review-engine/` | Append-only review session, decision, approval, and deployment-eligibility workflow. |
| `ai/deployment/`, `ai/preview-verification/`, `ai/release-manager/` | Development-theme deployment, read-only preview verification, local release candidate, and controlled rollback lifecycle. |
| `config/` | Knowledge, design-intelligence, theme-capability, mapping, safety, and composition catalogs. |
| `schemas/` | Versioned JSON schemas for profiles, strategies, draft/generation/review/deployment artifacts, mapping catalogs, and dashboard records. |
| `scripts/` | Structural validators, behavioral tests, theme export, mapping catalog generation, and repository-path utilities. |
| `output/` | Generated workspaces, append-only review/deployment/verification/release/rollback evidence, exports, and validated backups. It is not source code. |
| `dist/` | Generated Shopify ZIP export and report. It is excluded by `.gitignore`. |

Before this milestone there was no root `package.json`. Node CommonJS is used by the platform engines, root command-line tools, and validators. The dashboard is an isolated ESM package (`apps/dashboard/package.json`) using React, Vite, and Vitest. Creative Director v1 adds a minimal dependency-free root package script only for its local CLI; it does not change the dashboard package or module system.

## Current entry-point relationship

```text
compile-storefront-strategy.js
  -> ai/compiler/compile-strategy.js
  -> validated Merchant Profile + local catalogs
  -> calinium-storefront-strategy

build-draft-configuration.js
  -> ai/draft-builder/build-draft.js
  -> Merchant Profile + Storefront Strategy + mapping catalogs
  -> calinium-draft-configuration

generate-theme.js
  -> ai/theme-generator/generate-theme.js
  -> approved Draft Configuration
  -> isolated output/generation-run-*/theme configuration

review-theme.js
  -> ai/review-engine/*
  -> append-only Review Session + Approval Manifest

deploy-theme.js
  -> ai/deployment/*
  -> development-theme deployment only, with explicit execution

verify-preview.js
  -> ai/preview-verification/*
  -> read-only verification report and history

release-theme.js
  -> ai/release-manager/*
  -> local release candidate or controlled verified-development rollback
```

The existing compiler resolves industry, personality, design language, typography, spacing, color, imagery, animation, conversion, blueprint, homepage recipe, sections, ordering, asset requirements, verification requirements, and content safety. The dashboard deliberately uses only the public Merchant Interview façade and does not invoke the compiler.

## Existing safety boundaries

- `apps/theme/` is the canonical Shopify source and is checked by Theme Check and repository integrity tooling.
- The generator snapshots the source theme and refuses a run that changes it.
- The generator writes only configuration into an isolated workspace.
- Review and lifecycle histories are append-only.
- The deployment adapter targets only unpublished/development themes and requires explicit execution.
- Dashboard project, interview, profile, and asset access is organization scoped.

## Audit conclusions for Creative Director v1

1. The Shopify theme is already safely separated at `apps/theme/`; moving it again would add risk without product value.
2. `apps/dashboard/` is the existing merchant-facing web application. Replacing it with `apps/web/` would break a working application and is not justified for this milestone.
3. The new deterministic conversation, business-understanding, Creative Brief, recommendation, review, and Store Strategy layers should be additive under `ai/` and exposed through a small `pipeline/` boundary.
4. The existing `compile-storefront-strategy.js` must remain available for the current Merchant Profile compiler. Creative Director v1 should add an explicit compatibility mode rather than replacing the established deterministic strategy compiler.
5. `output/` and `dist/` are generated-artifact boundaries, not locations for application source. Fixture-driven Creative Director output may be written under `output/creative-brief/` and `output/store-strategy/`.

## Backup before changes

`output/backups/calinium-before-creative-director-v1-20260721.tgz` was created and archive-validated before implementation. It excludes reproducible dashboard dependencies/build output, the generated `dist/` export, and prior backup archives; source, catalogs, schemas, documentation, and lifecycle evidence are included.

## Merchant Profile and generation integration audit

Audited: 2026-07-21
Scope: pre-implementation state for the Merchant Profile Adapter and Theme Generation Integration

The Creative Director previously ended at a reviewable Store Strategy. It could ground recommendations by using `ai/store-strategy/legacy-profile-adapter.js`, but it had no canonical approved profile contract for the established Strategy Compiler, Draft Builder, or Theme Generator.

The actual existing generation contracts are:

| Engine | Required input | Existing guard |
| --- | --- | --- |
| Strategy Compiler | `schemas/calinium-merchant-profile.schema.json` profile and knowledge catalogs | Profile and catalog validation |
| Draft Builder | Compiler profile plus a valid `calinium-storefront-strategy` | Profile/strategy validation and mapping validation |
| Theme Generator | `Ready` draft plus `calinium-generation-approval` | No blocks, missing assets, unresolved input, review items, or absent approvals |
| Review Session Engine | Generated workspace | Snapshot fingerprint and append-only audit validation |
| Deployment Adapter | Approved review session and approval manifest | Development-theme-only deployment package validation |
| Preview Verification | Deployment record and remote development target | Read-only identity, checksum, structure, and history validation |

The Draft Builder intentionally leaves merchant-only settings, required media, product/collection pickers, and verification claims unresolved. Its defaults come only from `config/theme-safe-defaults.json`; it does not accept a Creative Brief directly and does not manufacture merchant content. Theme generation writes only an isolated `output/generation-run-*` configuration workspace after source snapshot checks. A local generated workspace is not a deployment, preview verification, or release.

The integration therefore adds a canonical profile adapter and an explicit post-draft merchant-configuration resolver. It preserves all existing engines and the lifecycle ordering: compiler strategy precedes Draft Builder because the Draft Builder consumes that compiler output. It does not alter the Shopify runtime, deployment records, or append-only histories.

`output/backups/calinium-before-merchant-profile-integration-20260721.tgz` was created and archive-validated before this work. SHA-256: `9a7f12b243eacb8857b7522fc4744f3799d9bef64e25147a6533687122c6acc1`.

## Merchant Creative Director Dashboard audit

Audited: 2026-07-21
Scope: existing dashboard and pipeline before Milestone 12 implementation

| Concern | Existing implementation and reuse decision |
| --- | --- |
| Routing | `apps/dashboard/src/app/DashboardApp.jsx` already owns authenticated SPA routing, account bootstrap, dashboard shell routes, projects, legacy interview, profile, and Asset Library. The Creative Director is additive at `/projects/:projectId/design`; the root route becomes a deliberately quiet landing. |
| Client state | React 18 hooks and `DashboardApiClient` already separate view state from durable state. `useCreativeDirector` follows that pattern and retains only request/display state. |
| Styling | The dashboard already has a tokenized CSS file, standard buttons, focus treatment, responsive breakpoints, localization, and reduced-motion rules. The new experience extends it with component-scoped `creative-director-*` and `cd-*` selectors. |
| Server boundary | `dashboard-api.cjs`, `dashboard-services.cjs`, CSRF middleware, authentication, `ProjectService`, and durable SQLite/PostgreSQL storage already enforce organization membership. A new server-only Creative Director adapter consumes `ai/conversation` and `pipeline` rather than exposing AI internals to React. |
| Conversation and review | `ai/conversation` already starts with the required greeting, plans one question at a time, supports unknown/delegated answers and corrections, and tracks facts/confidence. The existing pipeline already creates a Creative Brief, Store Strategy, review state, Merchant Profile, Draft, and isolated generation handoff. |
| Resources | The pre-existing Asset Service already supplies tenant-isolated asset metadata and controlled storage. The existing Draft Builder identifies unresolved merchant resource fields and required assets. The dashboard groups those requests for merchant presentation instead of copying product, collection, image, or menu logic. |
| Build and tests | The dashboard is a React 18 / Vite 8 ESM package with Vitest; its Node server is CommonJS. Existing dashboard tests cover account/project/interview/asset persistence. New tests extend the same framework for Creative Director lifecycle, presentation, recovery, tenant isolation, and prohibited forward stage jumps. |

The Shopify source remains at `apps/theme/`. It is not imported by dashboard code, and no Milestone 12 implementation changes theme runtime files. `output/` remains the isolated artifact boundary for an already approved generation workflow; `dist/` remains the Shopify export boundary.

`output/backups/calinium-before-merchant-creative-director-dashboard-20260721.tgz` was created and archive-validated before Milestone 12. SHA-256: `b10ed086d1fb54012ec8415e6463118be17843945a8467c68e5fdd3236e93401`.
