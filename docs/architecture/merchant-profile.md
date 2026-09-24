# Canonical Merchant Profile

The canonical Merchant Profile is the contract between Calinium’s Creative Director and the existing planning engines. Its schema is [`schemas/merchant-profile.schema.json`](../../schemas/merchant-profile.schema.json).

It is created only after the merchant has approved both the Brand Blueprint (the internal Creative Brief) and Store Strategy. It is a structured, serializable record—not a Shopify template, a Theme Editor settings file, or generated merchant copy.

## Boundary

```text
Creative Brief + Store Strategy + merchant review
                    ↓
          Canonical Merchant Profile
                    ↓
       Compatibility projection for Strategy Compiler
                    ↓
        Existing Strategy Compiler and Draft Builder
```

After the adapter has produced this profile, the Strategy Compiler and Draft Builder do not read the Creative Brief. This avoids two competing interpretations of the merchant’s information.

## Contract

| Area | Purpose | Source |
| --- | --- | --- |
| `business`, `audience`, `positioning`, `brand`, `goals`, `content` | Merchant understanding, with approved revisions applied | Creative Brief and merchant corrections |
| `strategy` | Approved creative recommendations: design direction, homepage, colour, type, navigation, product/collection guidance, motion | Store Strategy |
| `theme.compiler_context` | Stable IDs selected by the existing Strategy Compiler’s earlier grounded recommendation | Approved Store Strategy traceability |
| `generation` | Explicit merchant-selected resource references and confirmation records, if supplied | Merchant configuration workflow |
| `traceability` | The source for facts, revisions, recommendations, and compiler context | Adapter |

`generation` begins as `awaiting_configuration`. It changes to `ready_for_generation` only when the merchant supplies actual resource references, required asset references, confirmations, an approval reference, and an approval timestamp. Calinium never replaces missing values with invented product, collection, menu, media, or claim data.

## Approval gate

`pipeline/approval-gate.js` validates all of the following before profile creation:

- the Creative Brief is valid;
- the Store Strategy is valid;
- the Creative Brief status is `approved`;
- the Store Strategy status is `approved`;
- no individual review decision remains pending, rejected, or revision requested.

The review helpers support approve all, approve one recommendation, reject, and request revision. A rejection or revision request returns the Store Strategy to `revision_requested`, so generation remains blocked.

## Compatibility projection

`pipeline/map-merchant-profile.js` creates a narrow `calinium-merchant-profile` projection for the pre-existing Strategy Compiler. It projects only canonical profile fields and validates that projection with the compiler’s existing schema and knowledge base.

The projection preserves the legacy compiler’s stable input API while keeping the Creative Director’s richer profile as the source of truth. It does not read the Creative Brief.

## Merchant configuration context

The profile’s `generation` object holds opaque, merchant-supplied references only:

- `merchant_references` for selected Shopify resources or approved values;
- `asset_references` for required media;
- `completed_confirmations` for every protected selected field;
- `resolved_empty_fields` for fields intentionally left on their safe empty state.

`pipeline/resolve-approved-draft.js` applies this context to a draft after the Draft Builder has surfaced protected fields. It requires an explicit selection or explicit empty decision for every such field. A selected protected field must also carry its `field:<setting_ref>` confirmation. This post-approval resolver is intentionally separate from the Draft Builder: the builder remains conservative and continues to report unknown merchant input rather than automatically resolving it.

## Determinism and safety

The profile ID is derived deterministically from the business name. No timestamps, remote API calls, generated merchant copy, or Shopify calls participate in profile construction. Every array and reference map is normalized into stable order.

The profile’s source statuses and traceability make it clear which data was confirmed, revised, selected, or recommended. Inferences from the Creative Brief are never reclassified as confirmed merchant facts.

## Related documents

- [Theme generation pipeline](theme-generation-pipeline.md)
- [AI Creative Director](ai-creative-director.md)
- [Store Strategy schema](../schemas/store-strategy.md)
- [Theme generation guide](../guides/theme-generation.md)
