# Calinium

Calinium is an AI-powered Shopify storefront generation and design platform. It analyzes a merchant's store and intent, develops a tailored storefront direction, and produces a non-live preview before any merchant-authorized action.

Calinium is under active development. This repository is an engineering snapshot, not a claim of Shopify App Store approval, general production availability, or merchant adoption.

## What Calinium does

Calinium's workflow separates planning, generation, review, and publication:

1. Analyze store resources and merchant context.
2. Capture merchant intent and material design choices.
3. Select a compatible storefront architecture.
4. Generate an isolated storefront artifact.
5. Validate responsive behavior, accessibility, provenance, and visual quality.
6. Present a non-live preview for explicit human review.

The repository includes deterministic planning and generation components, a Shopify embedded dashboard, storefront theme source, validation contracts, and automated tests.

## Product principles

- **Preview first.** Generated storefront work is reviewed in a non-live environment.
- **Nothing changes without authorization.** Generation, preview, theme targeting, and publication are separate boundaries.
- **Fail closed.** Missing, stale, or contradictory authority and provenance block protected operations.
- **Preserve identity and lineage.** Durable project, flow, artifact, render, and review records support retries without silently changing the work under review.
- **Validate the real result.** Responsive layout, accessibility, architecture constraints, and visual quality are checked before acceptance.
- **Keep automatic repair disabled by default.** Findings require bounded planning and human review.

## Architecture

At a high level, Calinium contains:

- a Shopify embedded application for merchant-facing analysis, planning, and review;
- deterministic merchant-intent and storefront-architecture contracts;
- an isolated storefront generation runtime;
- durable state for projects, flows, artifacts, and QA evidence;
- a preview-first Shopify theme workflow; and
- D1 structural checks and D2.7 visual-evaluation contracts.

The public snapshot uses synthetic identifiers and example deployment configuration. It does not contain live store credentials, production configuration, or private operational evidence.

## Repository structure

| Path | Purpose |
| --- | --- |
| `ai/` | Architecture selection, generation, evaluation, and repair-planning contracts |
| `apps/dashboard/` | Shopify embedded dashboard, server runtime, services, and tests |
| `apps/theme/` | Shopify theme source generated and previewed by Calinium workflows |
| `config/` | Public catalogs, policies, and example-safe configuration |
| `pipeline/` | Deterministic orchestration and command-line entry points |
| `schemas/` | JSON schemas for durable contracts and evidence |
| `scripts/` | Test, validation, generation, and packaging commands |
| `fixtures/` | Synthetic fixtures and approved test baselines |
| `docs/` | Public architecture, product, dashboard, and development documentation |

## Local development

### Requirements

- Node.js 20 or newer
- npm

Install the root dependencies:

```sh
npm ci
```

Run a deterministic Creative Director fixture without Shopify credentials:

```sh
npm run creative-director -- --fixture fixtures/leather-travel-bags.json
```

To run the dashboard locally:

```sh
cd apps/dashboard
npm ci
cp .env.example .env
npm run dev
```

Replace the documented placeholders in the local `.env` with development-only values. Never commit `.env`, store credentials, access tokens, or merchant data.

Shopify-connected development requires a development app and store configured by the developer. The checked-in Shopify and Fly files are examples and must not be deployed unchanged.

## Testing

The repository exposes focused scripts rather than one mutation-capable end-to-end command. Useful non-provider checks include:

```sh
npm run test:core-2-architecture
npm run test:merchant-generation-flow
npm run test:f1-a
npm run test:storefront-render
npm run validate:core-2-architecture
```

Run the dashboard unit and integration suite and production build with:

```sh
cd apps/dashboard
npm test
npm run build
```

Some capture, live-evaluation, billing, storage-provider, and deployment commands require separately authorized infrastructure or credentials. Review a script before running it, and do not point development workflows at a live merchant theme.

## Security

Do not place credentials, access tokens, private merchant information, database contents, or live store identifiers in issues or pull requests. See [SECURITY.md](SECURITY.md) for reporting guidance and the repository's security boundaries.

## Contributing

Contributions should preserve Calinium's fail-closed authority, tenant isolation, provenance, preview, and merchant-approval boundaries. See [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request.

## License

Calinium is licensed under the [GNU Affero General Public License version 3](LICENSE).

Copyright (c) 2026 Naadra LLC.
