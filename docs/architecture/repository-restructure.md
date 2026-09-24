# Repository Restructure v1.0

Calinium separates its Shopify runtime from the platform without changing storefront behavior.

## Boundary

`apps/theme/` is the complete Shopify upload root. It contains only `assets/`, `config/`, `layout/`, `locales/`, `sections/`, `snippets/`, `templates/`, and `blocks/` only when theme blocks exist. Shopify settings are `apps/theme/config/settings_schema.json` and `apps/theme/config/settings_data.json`.

The repository root retains the platform: `ai/`, root `config/` catalogs, `schemas/`, `scripts/`, `docs/`, `output/`, root CLI entry points, and `apps/dashboard/`. None of these platform paths belong in a Shopify ZIP.

## Commands

```sh
npm exec --yes --package @shopify/cli@latest -- shopify theme check --path apps/theme --config .theme-check.yml
node scripts/validate-repository-restructure.js
node scripts/test-repository-restructure.js
node scripts/export-shopify-theme.js
```

The export is written to `dist/shopify/calinium-one-theme.zip`. Its root contains the Shopify directories directly, has a SHA-256 sidecar, rejects hidden/forbidden files, and enforces Shopify’s 50 MB compressed package limit.

## Compatibility

Root CLI entry points remain at the repository root. `scripts/lib/repository-paths.js` is the canonical resolver used by platform modules to locate `apps/theme/`; callers do not need to change working directories. Generated workspaces and append-only history are not rewritten. Historical path strings remain historical evidence.

## Recovery procedure

Repository Restructure v1.0 is intentionally not an automatic rollback. To recover the exact pre-migration repository, first verify the checksum recorded in `output/repository-migrations/restructure-v1-20260720/migration-manifest.json`, then extract `.calinium-before-repository-restructure-20260720.tgz` into a new, empty sibling directory:

```sh
mkdir ../calinium-pre-restructure-recovery
tar -xzf .calinium-before-repository-restructure-20260720.tgz -C ../calinium-pre-restructure-recovery
```

Validate that recovered copy before choosing it as the working directory. If only the theme runtime must be recovered, compare the migration manifest’s file map and checksums first; do not overwrite current append-only `output/` histories or merchant data blindly. The archive is a complete pre-migration recovery point, and the migration manifest records the moved paths and integrity result.
