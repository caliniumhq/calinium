# 09 — Development Guide

This guide defines the minimum engineering process for work that changes Calinium. It complements the detailed validator and engine guides in [docs/ai](../ai/README.md).

## Folder conventions

- Shopify runtime: `apps/theme/layout/`, `apps/theme/templates/`, `apps/theme/sections/`, `apps/theme/snippets/`, `apps/theme/assets/`, `apps/theme/locales/`, and `apps/theme/config/settings_*.json`.
- Architecture metadata: root `config/` and `schemas/`; the root catalog directory is not part of a Shopify upload.
- Merchant Dashboard: `apps/dashboard/`, the Phase 9A.2/9B.1 React host for accounts, organization-scoped projects, durable Merchant Interview sessions, and canonical Merchant Profile ownership. See [`docs/dashboard/`](../dashboard/README.md).
- Offline engines: `ai/<engine>/`.
- Validation and fixtures: `scripts/` plus the owning engine’s `fixtures/` or tests.
- Human documentation: `docs/architecture/`, `docs/ai/`, `docs/components/`, and `docs/sections/`.
- Generated evidence: `output/`; never treat it as source theme input.

## Coding and naming

- Use descriptive, stable IDs such as `show_vendor`, `image_ratio`, `section_height`, and `color_scheme`.
- Keep one canonical renderer for shared concerns: icon, product card, price, product form, responsive image, button, and loading behavior.
- Scope JavaScript by section instance, use existing Shopify lifecycle events, and clean up listeners/observers on unload.
- Prefer server-rendered semantic HTML, native controls, CSS layout/scroll snapping, responsive Shopify images, and reduced-motion fallbacks.
- Do not create a second cart, quick-add, recommendation, icon, slider, or product-card system when a canonical system already exists.

## Schema and catalog changes

1. Audit existing contracts and source settings first.
2. Add or extend the smallest compatible schema/catalog surface.
3. Add source references and version metadata for mappings.
4. Add valid fixture coverage for positive and failure cases.
5. Add or extend the owning validator; never weaken unrelated checks to pass a change.
6. Document the change in the relevant canonical guide and this architecture guide if it changes system topology.

## Validation workflow

Run the validator nearest to the change, then dependent validators. For an architecture-wide release, run all design-intelligence, compiler, mapping, draft, generator, review, deployment, preview-verification, release-manager, section-pack, icon, and Theme Check validations. Behavioral tests must cover deterministic output, schema validation, safety gates, append-only records where relevant, and source-runtime preservation.

Run Theme Check with `npm exec --yes --package @shopify/cli@latest -- shopify theme check --path apps/theme --config .theme-check.yml`. Build the uploadable package with `node scripts/export-shopify-theme.js`; it emits only the runtime directories at the ZIP root and refuses forbidden files or a package over Shopify’s 50 MB compressed limit.

## Documentation standards

Architecture documents explain boundaries and lifecycle; API guides explain exact settings, blocks, commands, or schema fields. Use relative links, avoid duplicating long implementation lists, use Mermaid for relationships that are clearer visually, and state limitations honestly. When prose conflicts with executable schema or code, correct the prose or explicitly version the contract.

## Contribution checklist

- Confirm scope and merchant safety.
- Preserve templates, section IDs, settings data, and existing output evidence unless a migration is explicitly approved.
- Use `apply_patch` for repository edits and avoid destructive workspace commands.
- Run the relevant validation and report exact results.
- Record known limitations and the next safe extension point.

See [extensibility](08-extensibility.md) and [security](07-security.md).
