# Draft Configuration Builder

The Draft Configuration Builder is Calinium’s isolated planning layer between the Strategy Compiler and a future non-destructive Theme Generator. It consumes a validated merchant profile, a validated Storefront Strategy, and the existing capability-mapping catalogs. It returns a reviewable JSON draft only.

It never emits Liquid, Shopify templates, section-instance JSON, `settings_data.json`, merchant copy, products, collections, assets, or remote API requests.

## Architecture

The builder is composed of small CommonJS modules under `ai/draft-builder/`:

1. `load-strategy` validates profile/strategy compatibility.
2. `load-mappings` validates the approved 6A catalogs and supporting bounded design profiles.
3. `resolve-global-settings` proposes only safe, bounded global settings.
4. `resolve-homepage`, `resolve-pages`, `resolve-sections`, and `resolve-settings` build traceable page plans.
5. Detection modules identify missing content, assets, reviews, and merchant-only blockers.
6. `validate-draft` validates schema, mapping, values, instance IDs, required field plans, and readiness.

Every proposal carries source catalogs, mapping ID, compiler decision, confidence, reasoning, and fallback behavior.

## CLI

First compile a merchant profile into a Strategy Compiler output. Then build the draft:

```sh
node compile-storefront-strategy.js compile \
  --input merchant.json \
  --output /tmp/strategy.json

node build-draft-configuration.js build \
  --profile merchant.json \
  --strategy /tmp/strategy.json \
  --output /tmp/draft.json \
  --pretty
```

Supported Draft Builder commands:

- `build` — produce a complete draft.
- `validate --draft draft.json` — validate a draft structurally; pass `--profile` and `--strategy` as well to recalculate readiness from source inputs.
- `explain` — print only the decision trace.
- `pretty` — alias of `build` with formatted JSON output.

The CLI refuses to write outputs into Shopify runtime directories such as `sections`, `templates`, `assets`, `config`, or `locales`.

## Determinism and safety

Identical profile, strategy, and catalogs produce identical JSON. There are no timestamps, random IDs, network requests, model calls, or external state. Instance IDs use stable page, position, and section IDs, for example `homepage-01-editorial-hero`.

Use [draft-schema.md](draft-schema.md) for the output contract, [homepage-planning.md](homepage-planning.md) for section planning, [merchant-review.md](merchant-review.md) for safety queues, and [draft-validation.md](draft-validation.md) for checks.
