# Shopify Connection Adapter: Pre-implementation Audit

Date: 2026-07-21
Milestone: 13 — Shopify Connection and Resource Approval Adapter

## Existing boundaries

`apps/dashboard/` is a React/Vite application with a CommonJS server. Browser code uses `DashboardApiClient`; it does not import storage adapters or AI engines. Every existing project mutation is CSRF-protected and authenticated through the HTTP-only dashboard session. `ProjectService` enforces organization membership before services read or write a project.

The durable storage seam is `DashboardStore`, backed by the existing SQLite and PostgreSQL drivers. It already owns projects, activity events, project assets, Merchant Interview sessions, and one Creative Director session per project. Uploaded asset bytes are held by the Asset Service outside relational fields.

`CreativeDirectorService` is the sole lifecycle owner for the merchant-facing journey. It already stores a resource plan and blocks generation until resource references are supplied. Its current implementation accepts only uploaded project assets for image/video fields and deliberately marks Shopify resources as unavailable.

## Existing Shopify and pipeline behavior

The repository has an isolated Milestone 8B deployment adapter under `ai/deployment/`. It uses Shopify CLI credentials only for an approved configuration package and hard-rejects published targets. It is not a browser or dashboard OAuth implementation and must remain separate.

The Theme Generator, Review Session Engine, Preview Verification Engine, Deployment Adapter, and Release Manager consume approved artifacts in `output/`; they do not own dashboard projects or browser sessions. This adapter will pass only project-scoped, explicitly approved Shopify resource references into the existing Creative Director resource gate. It will not change those engines or weaken their approval requirements.

## Implementation decision

Milestone 13 adds a server-only OAuth/Admin GraphQL adapter, encrypted credential envelopes, an organization-owned store catalog, project-to-store assignments, normalized resource rows, project approval rows, and truthful preview-target records. The browser receives no access token, secret, raw GraphQL payload, or remote identifier. A deterministic injected adapter will cover tests and local development. The real adapter is configured only when required environment variables are present; otherwise connection actions fail safely.

The Shopify runtime baseline before this work is `apps/theme/`: 182 files, 1,051,281 bytes, SHA-256 `b513dbbd80de8a5dc7138ef66412c608bf1d2be31b9b437057bd5397481979b0`.

## Reused modules

- Dashboard authentication, CSRF, API error, storage, migration, project authorization, activity, and Asset Library services.
- Creative Director approval/state guards and the existing Merchant Profile/Draft/Generation façade.
- Existing isolated deployment and preview-verification safeguards.

## New seams

- Server-only OAuth lifecycle and AES-256-GCM credential envelope.
- Admin GraphQL client and deterministic test adapter.
- Resource synchronization/normalization, approval, and stale-resource policy.
- Project-scoped connection status and preview-preparation records.
