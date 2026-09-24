# 08 — Extensibility

Future work must extend Calinium through versioned contracts and isolated modules, not by bypassing existing lifecycle gates. The [dependency graph](diagrams/dependency-graph.md) identifies the stable seams.

## Extension rules

1. Prefer an existing primitive, catalog, schema, validator, or lifecycle module before adding a parallel system.
2. Add a versioned schema before emitting a new cross-layer artifact.
3. Preserve prior artifact versions and saved merchant configuration; migrations must be explicit and backward compatible.
4. Keep planning engines deterministic and free of runtime Shopify mutation.
5. Propagate explanations and source references through every downstream artifact.
6. Add validator and fixture coverage with the same milestone that adds a contract.
7. Keep Shopify runtime changes separate from offline architecture changes.

## Supported extension points

| Future module | Integration point | Required boundary |
| --- | --- | --- |
| Merchant Interview | Produces confirmed Merchant Profiles through a versioned catalog and session lifecycle. | Must leave uncertain facts unresolved, retain richer context outside the profile, and validate the existing profile schema. |
| Dashboard | Reads append-only output artifacts and presents review/deployment status. | Must not rewrite history or bypass state machines. |
| Visual Builder | Edits a draft configuration or produces review decisions. | Must use mappings, classifications, validation, and approval gates. |
| Live AI Editing | Proposes draft changes against existing capabilities. | Must not modify runtime until normal generation/review/deployment gates pass. |
| Browser preview checks | Adds a verifier to Preview Verification. | Must be read-only, deterministic where possible, and write explainable results. |
| New Shopify sections | Extends Theme Engine, manifests, mappings, field classification, docs, and validators. | Must preserve merchant configurations and follow OS 2.0 conventions. |
| Hydrogen / WooCommerce / BigCommerce | Adds a platform adapter beneath common strategy/draft concepts. | Must define platform-specific capabilities and generator/deployment contracts; do not reuse Shopify assumptions. |
| Composable commerce | Supplies catalog/resource adapters to profile and draft layers. | Must preserve resource references and content-safety policy. |

## Agent and model integration

Future agents should consume the Architecture v1.0 documents first, then the exact schemas and catalogs for their stage. Agents may recommend or prepare artifacts, but they must not convert unresolved information into merchant facts or invoke a later lifecycle stage without its required approval evidence.

## Versioning

Catalogs and generated artifacts declare version metadata. A breaking extension requires a new compatible version, a migration strategy, fixtures for old and new data, and documentation updates. Existing validators must continue to pass before a new engine is relied on.

See the [development guide](09-development-guide.md) for contribution workflow and [AI extension guidance](../ai/compiler-extension-guide.md) for compiler-specific rules.
