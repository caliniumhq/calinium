# Theme Generation from an Approved Merchant Profile

Calinium’s local integration command connects approved Creative Director work to the existing deterministic planning and isolated generation engines. It never deploys or publishes a Shopify theme.

## Prerequisites

You need:

1. a valid Creative Brief;
2. a valid Store Strategy;
3. a review state where both artifacts are approved and all individual decisions are resolved;
4. for actual configuration generation, explicit merchant resource references, asset references, confirmations, and a generation approval record.

Creative approval alone is intentionally insufficient. Collection pickers, product pickers, menus, merchant copy, videos, and media references remain merchant-controlled data.

## Review before generation

Use the approval helpers in `pipeline/review-state.js` to express a merchant’s decision:

```js
const { createReviewState, approveAll, approveRecommendation, rejectRecommendation, requestRevision } = require('./pipeline/review-state');

let review = approveAll(createReviewState());
review = approveRecommendation(review, 'homepage.hero', 'Approved.');
// rejectRecommendation or requestRevision reopens Store Strategy approval and blocks generation.
```

`pipeline/create-merchant-profile.js` will refuse to create a canonical profile until both statuses are approved. `pipeline/approval-gate.js` can create a concise summary for a merchant-facing review surface, including “approval required: Yes/No”.

## CLI

```sh
npm run generate-storefront -- \
  --brief output/creative-brief/example.json \
  --strategy output/store-strategy/example.json \
  --review output/creative-director-review/example.json
```

Without a `--generation` file, the command creates the validated canonical profile and Draft Configuration, then returns `awaiting_merchant_configuration` with the next safe action. This is expected and does not generate a workspace.

After a merchant has supplied every necessary reference and explicit empty decision, pass a generation context and a unique run ID:

```sh
npm run generate-storefront -- \
  --brief output/creative-brief/example.json \
  --strategy output/store-strategy/example.json \
  --review output/creative-director-review/example.json \
  --generation merchant-generation-context.json \
  --run-id generation-run-example
```

The generation context is part of the approved canonical profile contract. It contains only opaque merchant resource references and confirmation records; it is not an opportunity to place generated merchant copy or fake media in the storefront.

## Results

A successful run returns `generated_for_review` and writes:

- an isolated workspace at `output/generation-run-example/`;
- a checksumed review package at `output/preview/generation-run-example/`.

The workspace contains only configuration output. It does not modify `apps/theme/`. A review handoff is available, but the command does not automatically create an approved Review Session, deploy to Shopify, publish, or verify a remote preview.

## Validation

```sh
npm run validate:merchant-profile-integration
npm run test:merchant-profile-integration
```

The fixture test runs three distinct merchant contexts and removes the temporary isolated generation/preview workspaces it creates. It proves the integration path; fixture references are explicitly synthetic test data and are never used for a merchant.

## Related documentation

- [Canonical Merchant Profile](../architecture/merchant-profile.md)
- [Theme generation pipeline](../architecture/theme-generation-pipeline.md)
- [Creative Director CLI](creative-director-cli.md)
