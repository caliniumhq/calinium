# Calinium Merchant Interview

The Merchant Interview is Calinium’s official input architecture. It collects merchant-provided discovery, business, brand, audience, product, design, reference, feature, content, and goal information; validates typed answers; branches away from irrelevant questions; and creates a confirmed canonical Merchant Profile for the existing Strategy Compiler.

It is an independent, offline layer inside the repository’s platform boundary. It does not generate a storefront, invoke the Strategy Compiler, modify the Shopify runtime in `apps/theme/`, select Shopify resources, persist to a Shopify store, or invent merchant facts.

## Reading order

1. [Architecture](architecture.md)
2. [Question catalog](question-catalog.md)
3. [Branching and sessions](branching.md)
4. [Merchant Profile mapping](merchant-profile.md)

## Core contract

```text
Merchant answers → Interview session → Summary preview → Confirmed summary → Merchant Profile → Strategy Compiler
```

The complete profile validates against the existing [canonical merchant-profile schema](../../schemas/calinium-merchant-profile.schema.json). Phase 9A.3 adds an optional, versioned `enrichment` extension to that same contract. Core compiler fields and their `version: 1` identifier are unchanged; existing profiles without enrichment remain valid, while downstream compiler logic continues to consume its established fields.

## Modules

| Module | Responsibility |
| --- | --- |
| `merchant-interview-engine` | Public loading, inspection, validation, build, summary, and session surface. |
| `question-catalog` | Versioned nine-category question definition; derives catalog choices from existing knowledge data. |
| `interview-schema` | Validates catalog/session contracts and reuses the canonical profile validator. |
| `branching-engine` | Resolves visible and next questions from deterministic dependencies. |
| `answer-validator` | Validates typed answers, choice options, and completion requirements. |
| `merchant-profile-builder` | Maps only supported answers into the canonical profile. |
| `interview-session` | Serializable create/save/resume/complete/abandon lifecycle. |
| `summary-generator` | Generates a merchant-readable confirmation summary without generating merchant copy. |

Run `node scripts/validate-merchant-interview.js` and `node scripts/test-merchant-interview.js` after changing this layer.

## Merchant-facing host

Phase 9A.2 adds the [Calinium Dashboard](../dashboard/README.md). Its React UI renders this existing catalog dynamically and reaches this engine only through the server-side public façade adapter. It does not modify the catalog, branching rules, validator, session lifecycle, profile builder, or compiler contract.
