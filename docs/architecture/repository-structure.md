# Repository structure

Calinium maintains a strict boundary between its Shopify runtime and platform code. The target is not a cosmetic rename: each directory has an ownership and safety role.

```text
apps/
  theme/                 Shopify upload source only
  dashboard/             existing merchant-facing React application
ai/
  compiler/              existing Merchant Profile strategy compiler
  merchant-interview/    existing project-scoped interview engine
  conversation/          Creative Director dialogue state and planner
  understanding/         fact, inference, confidence, and unknown handling
  creative-brief/        Brand Blueprint contract and builder
  recommendations/       merchant-facing creative recommendation adapters
  store-strategy/        Creative Director Store Strategy builder
  providers/             narrow local/future provider seam
  shared/                schema and normalization helpers
config/                  canonical knowledge and theme-capability catalogs
schemas/                 versioned artifact contracts
pipeline/                stable Creative Director orchestration boundary
product/                 product principles and decision rules
fixtures/                non-sensitive Creative Director examples
scripts/                 validators, tests, export, and repository utilities
output/                  generated evidence and review artifacts; never source
dist/                    generated Shopify export; excluded from source control
docs/                    architecture and operational documentation
```

## Deliberate deviations from the illustrative target

The working dashboard remains at `apps/dashboard/`, rather than being duplicated or renamed to `apps/web/`. It is already the established merchant application and changing it would create an unnecessary compatibility risk. The Shopify source remains at `apps/theme/`, which is already the repository’s validated upload boundary; moving it to `theme/calinium-one/` would disrupt Theme Check, source preservation, generator snapshots, and deployment tools without a functional gain.

`ai/knowledge/` is not duplicated: canonical knowledge lives in `config/` and is loaded by the existing `ai/compiler/load-knowledge-base.js`. No empty `ai/prompts/` directory is added because Creative Director v1 does not depend on prompts or an LLM provider.

## Product documentation migration

The controlled migration moved the eight byte-verified product documents from the malformed `product:` directory to `product/`. This is the sole source-tree relocation in this milestone. The Shopify theme did not move or change.

## Runtime rules

- Only `apps/theme/` is eligible for a Shopify ZIP.
- AI, dashboard, schemas, docs, scripts, fixtures, `output/`, and `dist/` are forbidden from a theme upload.
- Root CLI entry points remain in place for backwards compatibility.
- `output/` holds generated artifacts and append-only lifecycle evidence. It is not a workspace for source code.

Read [Repository Restructure v1.0](repository-restructure.md) for export and path-resolution rules, and [AI Creative Director v1](ai-creative-director.md) for the new reasoning boundary.
