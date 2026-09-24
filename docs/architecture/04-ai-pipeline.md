# 04 — AI Pipeline

Calinium’s AI pipeline is an offline, deterministic configuration-planning system. The [Merchant Interview](../merchant-interview/README.md) is its approved input boundary, hosted for merchants by the authenticated, project-scoped [Dashboard](../dashboard/README.md): Discovery captures existing presence and creative constraints, and the Asset Library records merchant-provided files before a canonical Merchant Profile reaches the compiler. The Dashboard consumes the public interview façade through a narrow adapter, persists ownership/history, and does not add planning logic. The pipeline does not render Liquid, call Shopify from the compiler, invent copy, invent products, or select unavailable merchant resources. See the [AI pipeline diagram](diagrams/ai-pipeline.md).

## AI Creative Director v1

Creative Director v1 is an additive, local-first entry path for the product journey. It is not a replacement for the project-scoped Merchant Interview or the existing Strategy Compiler.

```text
Merchant conversation
  → confirmed facts, explicit inferences, and unknowns
  → Creative Brief / merchant-facing Brand Blueprint
  → merchant review
  → Store Strategy recommendations
  → approved canonical Merchant Profile
  → legacy-compatible compiler projection
  → existing Strategy Compiler / Draft Builder / isolated generator workflow
```

The conversation asks only about the merchant’s business, offer, audience, goals, existing brand, assets, and desired feeling. It deliberately does not ask merchants to choose a hero implementation, section order, font pairing, spacing, or accessibility mechanism. The initial provider is deterministic and rule-based; a future provider must implement the narrow `CreativeDirectorProvider` contract rather than bypass the state, confidence, schema, or review boundaries. The [canonical Merchant Profile](merchant-profile.md) keeps this richer Creative Director handoff distinct from the existing compiler input projection. Read the [Creative Director architecture](ai-creative-director.md), [generation pipeline](theme-generation-pipeline.md), and [CLI guide](../guides/creative-director-cli.md).

## Knowledge and intelligence inputs

The Knowledge Layer records installed sections, taxonomy, setting metadata, composition guidance, and content safety levels. The Design Intelligence catalogs model industry profiles, visual languages, typography, spacing, colors, imagery, animation, conversion, page blueprints, layout recipes, compatibility, and universal rules. These JSON files are versioned and schema validated.

The capability mapping catalog then connects that advice to actual Calinium settings and section schemas. Its coverage report explicitly identifies fully supported, partially supported, and unsupported decisions. The Draft Builder must consume these catalogs rather than bypass them.

## Strategy Compiler

The compiler validates a merchant profile and resolves, in fixed order:

1. Industry and personality
2. Design language
3. Typography, spacing, color, imagery, animation, and conversion
4. Page blueprint and homepage recipe
5. Installed section selection and ordering
6. Asset requirements, merchant verification requirements, and content-safety state
7. Explanations and final strategy validation

Each resolver is isolated. Decisions state a selected value, confidence, source catalogs, rejected alternatives, and reasoning. The detailed contracts are in the [AI documentation index](../ai/README.md), [compiler architecture](../ai/compiler-architecture.md), and [explainability guide](../ai/compiler-explainability.md).

## Mapping and Draft Builder

The Theme Capability Mapping audit reads real section schemas and global settings, then classifies fields as safe to configure, merchant review required, merchant only, or prohibited for automatic values. The Draft Builder transforms only valid strategy decisions through those mappings. It produces a plan—not Shopify files—with unresolved fields, required assets, blocked fields, review items, fallbacks, and `Ready`, `Ready With Review`, or `Blocked` readiness.

## Theme Generator

The generator accepts only an approved ready draft. It writes a new workspace under `output/`, never into the working theme. It emits only supported JSON configuration (`templates/*.json` and `config/settings_data.json`) plus manifests and reports. It does not create Liquid, CSS, JavaScript, sections, snippets, assets, locales, or merchant content.

## Guarantees and limits

- Equal input + equal catalog versions + equal engine version produce equal planning output.
- Every recommendation is traceable to an existing catalog or mapping source.
- Unknown or missing merchant information is surfaced, not inferred.
- AI-generated artifacts require human review and approval before deployment.
- Current mapping coverage is documented in [gap analysis](../ai/gap-analysis.md); unsupported decisions must remain unsupported.

Continue with [data flow](03-data-flow.md) and the [development guide](09-development-guide.md).
