# Calinium Dashboard

Shopify connection is server-only and read-only in Milestone 14. Local Dev Dashboard linking, environment requirements, development-store validation, webhook recovery, and the future-preview boundary are documented in [Shopify live validation](../../docs/dashboard/shopify-live-validation.md).

The Dashboard is Calinium’s merchant-facing application boundary. It includes accounts, organization-scoped projects, durable interview persistence, cross-device recovery, Asset Library, canonical Merchant Profile ownership, and the Merchant Creative Director journey.

The Creative Director route can prepare a deterministic Brand Blueprint and Store Strategy, then use the existing profile/draft/generation handoff only after explicit approval and supplied resources. It never accesses Shopify automatically, modifies `apps/theme/`, or deploys a theme.

## Run locally

```sh
cd apps/dashboard
npm install
npm run dev
```

For a production-like local build:

```sh
npm run build
npm run start
```

`npm test` runs the dashboard unit/integration suite. `npm run validate` runs tests followed by a production build. The default local database is `.calinium-data/dashboard.sqlite`; set `CALINIUM_SQLITE_PATH` to choose a different local path.

For a production multi-instance deployment, configure `CALINIUM_STORAGE_DRIVER=postgres` and `DATABASE_URL`. See [storage](../../docs/dashboard/storage.md) before deploying.

## Boundary

```text
React UI → DashboardApiClient → authenticated same-origin API → dashboard services → Merchant Interview / Creative Director public façades
```

Browser code never imports `ai/merchant-interview/*`. The server adapter imports only `merchant-interview-engine.js`, the engine’s public façade. It preserves engine-owned catalog, validation, branching, session, summary, and Merchant Profile behavior.

The browser is no longer the source of truth for interview state. Authenticated project-scoped records are stored by the server, while `InterviewService` remains an adapter around the existing engine façade. The server-side Creative Director adapter uses existing deterministic pipeline surfaces only to prepare reviewed planning artifacts and a resource plan; source theme and deployment boundaries remain unchanged.

See [dashboard documentation](../../docs/dashboard/README.md) and the [Merchant Interview Architecture](../../docs/merchant-interview/README.md).
