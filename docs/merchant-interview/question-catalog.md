# Merchant Interview Question Catalog

The v1.1 catalog begins with Discovery and contains ten ordered categories. Every question has a stable ID, title, description, answer type, required flag, validation rules, options where relevant, dependency list, follow-up IDs, optional host rendering metadata, and a Merchant Profile mapping destination or explicit `null`.

## Categories

| Category | Collected intent | Profile mapping |
| --- | --- | --- |
| Business | Brand/business name, URLs, industry, category, model, stage, store status. | Name, model, industry, subcategory. |
| Brand | Mission, story, personality, values, perception, tone. | Primary and secondary personality only. |
| Target audience | Customer type, needs, demographics, markets, languages, B2B/B2C, positioning. | Primary audience, needs, price positioning. |
| Products | Product types, collections, SKU count, price, hero products, delivery, variants, industry follow-ups. | Product count, product types, variant flag. |
| Design | Existing Calinium design/color/image preferences, density, planned page, existing references. | Page type, design languages, colors, images, density. |
| Brand references | Favorite websites/brands, competitors, inspiration stores. | No direct mapping. Stored as separate context only. |
| Features | Desired commerce and storefront functions. | No direct mapping; this is future capability-review input. |
| Discovery | Business maturity, website and Shopify context, desired outcomes, creative freedom. | Versioned enriched discovery context. |
| Content | Asset declarations, secure logo reference, colors, typography, copy availability, contact email. | Available asset identifiers, palette preference, and factual notes. |
| Goals | Primary and secondary business/storefront outcomes. | Primary and secondary goals. |

## Answer types

Supported types are `text`, `textarea`, `number`, `currency`, `boolean`, `multiple_choice`, `single_choice`, `tags`, `url`, `email`, `upload_placeholder`, `color`, and `image_placeholder`.

Choice options are stable values. Industry, personality, design-language, color-strategy, image-style, and page-blueprint options are derived from Calinium’s existing knowledge catalogs so the interview cannot offer an identifier the compiler does not recognize. Content questions explicitly accept `not_available`; the profile builder excludes that sentinel from declared asset identifiers. `asset_reference`, `color_palette`, and `reference_list` are typed answer contracts; their host controls are declared as optional `ui` metadata, never as parallel branching rules.

## Required answers

Completion requires the fields necessary to construct the current canonical profile: business name/model/industry/category/stage/store status, personality, primary audience/needs/market positioning, product types/count/delivery/variants, design preferences/density/page type, and primary goals. Rich brand/context/reference content remains optional because Calinium must not force merchants to invent it.

## Mapping policy

`mapping_destination` is a declaration, not generic profile mutation. The builder has an explicit compatible mapping for every supported profile field. Questions that cannot map safely—references, optional uploaded material, requested features, and factual storytelling source material—remain in the interview session for future reviewed workflows.

See [Merchant Profile mapping](merchant-profile.md) and [branching](branching.md).
