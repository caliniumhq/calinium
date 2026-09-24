# Merchant Interview Architecture

## Boundary

The interview sits before the Merchant Profile and is the only Phase 9A.1 input layer. It reuses the existing design-intelligence catalog values and canonical profile validation; it does not replace the compiler, Draft Builder, generator, review engine, deployment adapter, verification engine, or Release Manager.

```text
Question Catalog
  → typed answer validation
  → dependency-based branching
  → serializable interview session
  → confirmed summary
  → canonical Merchant Profile
```

## Versioned contracts

- `calinium-merchant-interview.schema.json` validates the catalog: category ordering, question IDs, answer types, choices, validation rules, dependencies, follow-ups, and profile mapping declarations.
- `calinium-interview-session.schema.json` validates the serializable lifecycle record.
- `calinium-merchant-profile.schema.json` is the existing compiler contract. It is reused unchanged and is separately validated when a session completes.

The question catalog has catalog and branching version `1.0.0`; sessions preserve that version. This lets a future host identify the exact question model that collected an answer.

## Determinism

The host supplies session IDs and timestamps explicitly. The engine does not call a clock, use randomness, access a network, or make a model call. Given the same catalog, answer object, session state, and explicit timestamps, it returns the same visible questions, validation report, summary, and Merchant Profile.

## Storage and localization boundaries

Session records are serializable JSON. Phase 9A.1 deliberately does not choose a database, browser storage strategy, authentication model, upload provider, or UI. A future host can persist and resume these records while preserving the session schema and lifecycle rules.

Question IDs and choice values are stable machine-readable identifiers; titles, descriptions, and labels are centralized catalog strings that a future localization layer can translate without changing stored values.

## Safety

Brand references are retained as interview context only; they are not copied into design-language decisions. Upload/image answers are placeholders, not files. Asset availability records merchant declarations only. Completion requires the merchant-confirmation flag before the profile can be handed to a later workflow.

See [branching](branching.md), [profile mapping](merchant-profile.md), and [Architecture v1.0](../architecture/04-ai-pipeline.md).
