# Durable Storage

Phase 9B.1 replaces browser-owned interview persistence with a server-owned storage boundary. The Merchant Interview Engine remains pure: it receives a serializable engine session through its existing public façade and does not know which database is in use.

Phase 9A.3 adds `project_assets` metadata to the same storage boundary. Binary files are never database blobs: the `AssetService` stores metadata and checksums in SQLite/PostgreSQL and delegates file bytes to a `StorageProvider`. The local provider is development-only and stores opaque keys below `.calinium-data/assets`; production object storage can be substituted through the provider contract.

The Public production storage integration adds a separate authoritative-object boundary for finalized generated artifacts and checksum-bound render, QA, founder, operator, repair, and repair-validation evidence. These bytes are not database blobs. Migration 28 stores normalized `calinium-durable-object-reference-v1` records, while `AuthoritativeObjectService` owns immutable write/read-back verification, scoped reads, restart materialization, lifecycle inventory, and explicitly authorized deletion. See [Durable Generated Artifact and Evidence Storage](../launch/calinium-durable-generated-artifact-evidence-storage.md).

## Storage adapters

`createDashboardStore` selects one adapter by environment:

| Driver | Configuration | Intended use |
| --- | --- | --- |
| SQLite | `CALINIUM_STORAGE_DRIVER=sqlite` (default), optional `CALINIUM_SQLITE_PATH` | Local development and a persistent single-node deployment. Defaults to `.calinium-data/dashboard.sqlite`, which is ignored by Git. |
| PostgreSQL | `CALINIUM_STORAGE_DRIVER=postgres`, required `DATABASE_URL`; Public also requires `DATABASE_SSL=true` and an accepted provider identity | Production multi-instance deployment and growth beyond a single application node. |

Binary providers are selected separately at composition time:

| Data | Local/staging | Public production |
| --- | --- | --- |
| Project media assets | `CALINIUM_ASSET_STORAGE_DRIVER=local` | `CALINIUM_ASSET_STORAGE_DRIVER=object` |
| Generated artifacts and authoritative evidence | `CALINIUM_ARTIFACT_STORAGE_DRIVER=local` | `CALINIUM_ARTIFACT_STORAGE_DRIVER=object` |

Public production rejects local authoritative storage. Provider configuration does not imply health: startup must construct the approved adapter and pass its durability/health check.

Both adapters satisfy the same asynchronous SQL-driver contract. The repository, service, API, and UI layers do not depend on a database implementation, so deployment can change from SQLite to managed PostgreSQL without a rewrite of accounts, projects, or the interview experience.

## Stored data

The migrations create users, organizations, workspaces, memberships, projects, engine-session envelopes, Merchant Profile revisions, opaque authentication sessions, login attempts, preferences, activity events, and normalized durable-object references. JSON payloads are versioned contracts, not unvalidated browser blobs.

Session and profile envelopes reference the unchanged [Merchant Interview schemas](../merchant-interview/README.md). Merchant Profiles are generated only after engine confirmation. The storage host never runs the Strategy Compiler, Draft Builder, Theme Generator, or Shopify runtime.

## Operations

Migrations are versioned in `apps/dashboard/server/storage/migrations.cjs` and recorded in `schema_migrations`. They are applied before the server accepts requests. A migration and its marker share one transaction; PostgreSQL also takes a transaction-scoped advisory lock so concurrent startup cannot interleave versions. Back up the selected database using the database platform’s normal encrypted backup facility; the source repository is not a substitute for merchant data backup.

Node’s built-in SQLite API is currently marked experimental by Node 22. Public production uses the included PostgreSQL adapter with bounded pool/timeouts, restricted database credentials, verified TLS, routine managed backups, and a managed secret provider for `DATABASE_URL`. Connection failures are sanitized before they can cross the storage boundary.

## Privacy and isolation

Every project query is scoped by the authenticated member’s organization. Asset and authoritative-object reads bind organization/project and canonical shop where present; clients cannot select arbitrary provider keys. Stored browser data contains no session token, password, engine catalog, provider credential, presigned URL, or Merchant Profile. Durable object inventory is available by project, shop, and lineage. Physical deletion is unavailable until a separate lifecycle action marks the exact reference `deletion_authorized`; retention durations remain `FOUNDER_DECISION_REQUIRED`.
