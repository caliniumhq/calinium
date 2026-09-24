# Dashboard Architecture

## Stack

The Dashboard uses React 18 with Vite 8. React provides durable, component-oriented rendering; Vite provides a small, conventional build and test toolchain. A Node HTTP host serves the built single-page application and the authenticated same-origin API.

```text
Merchant browser
  → localized React dashboard
  → DashboardApiClient (credentialed + CSRF protected)
  → Dashboard API
  → Auth / Project / Interview persistence / Asset services
  → durable storage
  → StorageProvider (local filesystem now; object storage later)
  → InterviewEngineAdapter
  → ai/merchant-interview/merchant-interview-engine.js
```

The server adapter imports only the engine’s public façade. The React bundle cannot import engine files, question catalog source, branching modules, validators, or the Merchant Profile Builder. This prevents UI and engine logic from drifting into parallel implementations.

## Runtime responsibilities

| Layer | Responsibility |
| --- | --- |
| `src/app` and `src/components` | Accessible account, project, settings, and interview presentation. |
| `src/hooks/use-interview-session.js` | UI orchestration, server autosave status, and focus transitions. |
| `src/services` | UI-facing account, project, and project-interview use cases. |
| `src/adapters/dashboard-api-client.js` | Credentialed same-origin HTTP transport and CSRF token handling. |
| `server/dashboard-api.cjs` | Request limits, CSRF, authentication, authorization, and route dispatch. |
| `server/auth`, `server/services`, `server/storage` | Provider-based authentication, organization authorization, durable project and asset metadata persistence. |
| `server/assets` | File allowlist/signature validation, checksums, palette extraction, and storage-provider isolation. |
| `server/interview-engine-adapter.cjs` | Unchanged public Merchant Interview façade adapter. |

## Production hosting boundary

The host now supports password authentication, ownership-scoped organizations, durable storage, login throttling, project history, and tenant-isolated assets. SQLite is the local default; PostgreSQL is the production multi-instance target. Local file storage is a development provider; a future object-storage provider can be introduced without changing the UI or Interview Engine. Shopify connections, invitations, billing, SSO, observability, and hosted deployment configuration remain outside the current phase.

The Dashboard never contacts Shopify, and it never changes the source theme.
