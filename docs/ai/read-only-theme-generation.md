# Read-Only Theme Generation Engine

Milestone 15 adds the assembly layer between an approved Calinium project and a complete, local Calinium One storefront package. It is deliberately isolated from Shopify: it has no store credentials, no Admin API client, no upload command, and no publication path.

## Input boundary

The engine runs only after the existing pipeline has validated all three approved inputs:

1. Brand Blueprint (the Creative Brief);
2. Store Strategy; and
3. Resource Plan (the ready Draft plus explicit generation approval).

Products, collections, menus, media, and other merchant resources remain opaque approved references. The engine neither discovers nor invents them.

## Output

For a successful run, `output/generation-run-*/` contains two intentionally separate artifacts:

- `theme/` — the existing deployment-compatible configuration-only output (`templates/*.json` and `config/settings_data.json`);
- `storefront-theme/` — a complete copy of the Calinium One runtime with only the approved configuration overlaid;
- `manifests/theme-specification.json` — the canonical, schema-validated design specification;
- `manifests/read-only-theme-package.json` — the package manifest and read-only Shopify boundary;
- `reports/theme-package-validation.json` — Liquid-preservation, JSON, accessibility baseline, internal-consistency, ZIP, and Theme Check results;
- `exports/calinium-one-generation-run-*.zip` — a Shopify-shaped ZIP with runtime folders directly at its root.

The package is a local review artifact. It is not a deployed theme, a Shopify preview, or a release candidate.

## Theme Specification

`calinium-theme-specification` is created from approved inputs and records:

- design language;
- color system and applied color settings;
- typography direction and applied text settings;
- homepage composition and section order;
- collection and product presentation;
- navigation recommendation;
- installed component instances;
- applied theme settings;
- only approved merchant resource references; and
- source and approval traceability.

The specification validates against [calinium-theme-specification.schema.json](../../schemas/calinium-theme-specification.schema.json). It contains recommendations and opaque references, never generated merchant copy, product data, or a Shopify access token.

## Validation

The generator validates the package internally when it is assembled, including Theme Check through the locally installed Shopify CLI. The explicit command below reruns that independent final gate when a package needs revalidation.

```sh
node generate-theme.js validate-package \
  --workspace output/generation-run-example \
  --pretty
```

This command runs Shopify Theme Check against `storefront-theme/` using the repository `.theme-check.yml`, updates the isolated validation report, and never contacts or writes to Shopify.

Use these development checks after changes:

```sh
npm run validate:read-only-theme-generation
npm run test:merchant-profile-integration
```

## Safety guarantees

- Calinium One under `apps/theme/` is copied, never edited.
- Every copied Liquid file is checksum-compared with Calinium One. The engine does not create or change Liquid, CSS, JavaScript, sections, snippets, assets, locales, or `settings_schema.json`.
- Only the approved JSON configuration overlays `storefront-theme/templates/` and `storefront-theme/config/settings_data.json`.
- The ZIP permits only Shopify runtime folders at its root and rejects hidden/system files and oversized archives.
- The manifest asserts `write_operations: false`, `upload: false`, `publish: false`, and `required_scope: none`.

An actual upload remains blocked until a separate, explicitly authorized deployment workflow has a verified build, a valid Shopify connection, the appropriate permissions, and all existing review gates.

## Current project readiness

A project with an incomplete Resource Plan stays blocked before this engine. Calinium does not substitute a product image for a required founder portrait, manufacture copy, or choose an unapproved Shopify resource. The merchant may provide the missing real asset or approve a strategy revision that removes the requirement.
