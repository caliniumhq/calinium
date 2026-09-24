# Section manifest schema

`schemas/calinium-section-manifest.schema.json` validates `config/calinium-section-manifest.json`.

## Required entry fields

Every entry needs a stable filename-matching `id`, integer `version`, `category`, `name`, purpose, use cases, template/position guidance, industry suitability, visual/content requirements, capabilities, supported blocks, layouts, complexity/density/media/conversion fields, dependencies, performance/JavaScript details, asset and verification requirements, a safety level, generation notes, and composition rules.

`industry_suitability` separates `highly_suitable`, `conditionally_suitable`, and `generally_unsuitable`. Values use the controlled vocabulary declared in the manifest root. Machine values use lowercase snake_case except section IDs, which match Shopify filenames and use kebab-case.

## Versioning and compatibility

Increment an entry `version` only for a breaking interpretation change. Additive fields require a schema version update. Never silently rename an ID, setting, or taxonomy type: retain compatibility metadata or create an explicit migration. Empty arrays are intentional and must remain arrays for deterministic consumers.

## Deprecation

Do not delete an entry consumed by AI. Mark it deprecated in a future manifest schema version, document a replacement, and retain the historical ID until consumers migrate.

## Extension workflow

1. Add the Shopify section with stable settings and taxonomy-aligned blocks.
2. Add one manifest entry and setting metadata.
3. Add/extend taxonomy only for a genuinely distinct block meaning.
4. Add minimal/rich fixtures and composition examples.
5. Run the Brand Storytelling validator and Theme Check.
