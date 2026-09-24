# Shopify App Linking & Live Validation: Pre-implementation Audit

Date: 2026-07-22
Milestone: 14 — Shopify App Linking and Live Development-Store Validation

## Evidence reviewed

- Product direction in `product/manifesto.md`, `principles.md`, `personality.md`,
  `merchant-journey.md`, `decision-matrix.md`, `terminology.md`, `vision.md`, and
  `roadmap.md`.
- Dashboard React/Vite client, CommonJS HTTP server, authenticated API boundary,
  durable SQLite/PostgreSQL storage seam, project authorization, and activity log.
- Milestone 13 Shopify connection service, AES-256-GCM credential envelope,
  OAuth state records, Admin GraphQL adapter, resource normalizer, deterministic
  adapter, project approvals, and preview target records.
- Existing Creative Director resource and generation guards, plus the isolated
  generator, review, verification, deployment, and release systems.
- Shopify runtime inventory at `apps/theme/`.

## Existing architecture

`ShopifyConnectionService` is already the correct server-only coordination
boundary. It uses `ProjectService` membership checks, `DashboardStore` records,
an injected Admin adapter, and a credential envelope. The browser uses
`DashboardApiClient` and receives safe connection/resource views only.

The existing connection flow is intentionally separate from the Milestone 8B
Shopify CLI deployment adapter. The latter consumes approved generated
configuration packages; it does not own merchant dashboard connections and is
not changed by this milestone.

The current adapter already has:

- OAuth state/nonce records and callback HMAC verification;
- encrypted credential storage with no plaintext fallback;
- a real Admin GraphQL fetch adapter and a deterministic injected test adapter;
- cursor-based resource synchronization and project-scoped approvals;
- read-only theme metadata selection for the earlier preview boundary; and
- Creative Director generation checks that resolve approved resource references
  again before generation.

## Gaps identified

1. No Shopify CLI app configuration file is currently linked in this checkout.
   `shopify app config validate --path .` correctly reports that no app TOML
   exists. Shopify CLI 4.5.2 is available.
2. No local `.env` file, Shopify client ID, client secret, tunnel URL, or
   development-store identity is present. A real app link, install, OAuth
   callback, webhook delivery, and live integration test cannot be performed
   safely without merchant/developer authorization.
3. The live adapter needs the current `currentAppInstallation` scope query,
   expiring offline-token metadata and rotation, richer theme metadata, and
   explicit API-version validation.
4. Webhook delivery verification and idempotent durable processing are not yet
   implemented.
5. The dashboard currently exposes simple connection health and resource review;
   it does not yet present API/webhook versions, unexpected granted permissions,
   last failed synchronization, or read-only preview eligibility.

## Milestone 14 approach

This work extends the existing service instead of replacing it. It adds Shopify
CLI configuration templates and a safe link command, a strict runtime
configuration seam, expiring offline credential handling, webhook processing,
read-only preview eligibility, and deterministic/live-test separation.

No Shopify theme, product, collection, navigation resource, deployment record,
or generated workspace will be changed. In the absence of explicitly supplied
development-store credentials, live tests will be skipped and reported as such.
