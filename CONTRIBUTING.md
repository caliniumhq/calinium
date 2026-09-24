# Contributing to Calinium

Calinium is under active development. Contributions are welcome when they are narrowly scoped, tested, documented, and preserve the project's merchant-safety boundaries.

## Before contributing

- Search existing issues before proposing overlapping work.
- Open an issue before a large architecture change.
- Use synthetic fixtures. Do not contribute merchant data, live store identifiers, credentials, screenshots from private stores, or internal operational evidence.
- Do not run capture, provider, billing, deployment, or Shopify-write commands without understanding their external effects.

## Development setup

Use Node.js 20 or newer.

```sh
npm ci
```

The dashboard has its own dependency lockfile:

```sh
cd apps/dashboard
npm ci
cp .env.example .env
npm run dev
```

Use development-only placeholder replacements in `.env`; never commit that file.

## Validation

The canonical credential-free contributor check uses Node.js 20 and synthetic public data only:

```sh
npm run validate:public
```

It validates tracked JSON and JavaScript syntax, Core 2 architecture, merchant-generation flow, the F1-A merchant experience, storefront rendering, deterministic dashboard frontend/component tests, and the dashboard production build. Dashboard server persistence suites use Node's built-in SQLite module, which is not available in the required Node 20 public-CI runtime, so those suites remain available through the full dashboard test command but are explicitly outside `validate:public`. Live Shopify and Fly operations, provider/model calls, production-database acceptance, private staging checks, screenshot capture, deployment, and other mutation-capable workflows are intentionally excluded.

Run the smallest focused test and validator for the area you changed. Common repository-level checks include:

```sh
npm run test:core-2-architecture
npm run validate:core-2-architecture
npm run test:merchant-generation-flow
npm run test:storefront-render
```

For dashboard changes:

```sh
cd apps/dashboard
npm test
npm run build
```

Changes to Shopify theme source should also pass the repository's Theme Check configuration. Do not validate a contribution by publishing or changing a merchant's live theme.

## Pull requests

A useful pull request:

- explains the problem and the bounded solution;
- identifies affected contracts and safety boundaries;
- includes focused regression coverage;
- updates public documentation when behavior changes;
- avoids unrelated formatting or generated output; and
- confirms that no secret, merchant data, or private operational evidence was added.

Generated output, local databases, environment files, evidence captures, and dependency directories are ignored and should not be committed.

## Safety invariants

Contributions must not weaken:

- tenant, shop, project, or operator authorization;
- checksum, provenance, idempotency, or compare-and-swap protections;
- MAIN-theme exclusion and publication safeguards;
- separation between liveness and protected readiness;
- explicit merchant and human-review boundaries; or
- the default prohibition on automatic repair.

If a change requires real infrastructure, credentials, protected scopes, or merchant data to demonstrate, coordinate privately with the maintainers instead of placing those materials in the repository.

## License

Contributions are accepted under the repository's [GNU Affero General Public License version 3](LICENSE).
