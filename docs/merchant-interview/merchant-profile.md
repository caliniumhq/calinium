# Merchant Profile Mapping

The interview preserves the existing core `calinium-merchant-profile` object and its version-1 compiler contract. It can now add an optional `enrichment` object whose own version is `1`; profiles written before this addition remain valid.

## Direct mappings

| Merchant Profile field | Interview answer |
| --- | --- |
| `business.name` | `business_brand_name` |
| `business.model` | `business_model` |
| `industry` / `subcategory` | `business_industry` / `business_product_category` |
| `catalog.*` | Product SKU count, product types, variant answer, market positioning. |
| `audience.*` | Primary customer and customer needs. |
| `goals.*` | Primary and secondary goals. |
| `assets.*` | Merchant-declared asset identifiers and optional factual notes. |
| `enrichment.discovery` | Business stage and discovered merchant context. |
| `enrichment.existing_presence` | Merchant-confirmed website and Shopify references, never scraped or connected. |
| `enrichment.brand_assets`, `brand_colors`, `typography` | Tenant-validated asset references and merchant-approved preferences. |
| `enrichment.inspiration_references`, `competitor_references` | Separate research records; never design-copying instructions. |
| `preferences.*` | Page blueprint, design language, color strategy, image style, content density. |
| `brand_personality.*` | Primary and secondary personality answers. |

The builder validates all visible required answers, constructs this exact profile shape, then calls the existing `validateMerchantProfile` function with the existing knowledge base. A profile that fails existing compiler validation is rejected rather than adapted or guessed.

## Unresolved information

The canonical schema permits selected values to be `null`, but interview completion requires the current planning minimum. Enriched values include deterministic source traceability for answers, assets, and palette approval. Future versions may support an explicit incomplete handoff; they must preserve the compiler’s no-invention rule and distinguish unresolved from invalid values.

## Context deliberately excluded from the profile

Brand mission/story, values, tone, audience demographics, collections, hero-product names, average price, shipping/delivery details, visual references, requested features, contact details, and placeholders remain in the session. They have no safe field in the current profile schema and are not silently collapsed into compiler decisions.

## Confirmation gate

The summary presents a readable brand, industry, audience, style, and goal overview. The engine requires `confirmed_summary: true` before producing a completed session and profile. This is a merchant-intent confirmation, not approval to generate, deploy, or publish a theme.

See the existing [compiler input contract](../ai/compiler-input-schema.md) and [Merchant Interview architecture](architecture.md).
