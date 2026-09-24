# Calinium Core 2.0 — Phase C Editorial Discovery

## Status and intent

Phase C introduces exactly one controlled architecture proof: `profile.editorial_discovery.v1`. It is designed for image-led, story-rich discovery in which navigation, catalog rhythm, product media, and supporting commerce form one coherent editorial journey. It is an architecture profile—not a visual preset—because it changes production Liquid presenter composition and responsive behavior while continuing to receive colors, typography, spacing, motion, and content decisions from Design DNA.

`profile.current_calinium.v1` remains the registry default and its approved Phase B baseline is immutable. Editorial Discovery is available only through an explicit internal architecture selection. Phase C adds no merchant questionnaire, automatic profile choice, billing change, approval change, Shopify write scope, upload, or publishing behavior.

## Architectural invariants

Editorial Discovery follows these invariants:

- Shopify product, collection, menu, media, price, variant, inventory, form, cart, localization, and account data remain authoritative.
- Shared pricing, product-form, variant, facets, media, accessibility, and commerce helpers remain shared; presenters do not fork Shopify truth.
- Merchant content is never invented. Missing content is omitted or represented by existing editor-safe structure.
- The current cart family remains selected and unchanged.
- Architecture owns structural composition. Design DNA owns compatible visual presentation.
- Every alternate runtime file is applied only inside the isolated generated package. `apps/theme/` remains the Current Calinium source baseline.
- Presenter metadata remains in trusted manifests and capture evidence, never in Shopify template settings or blocks.

## Profile and families

`profile.editorial_discovery.v1` selects:

| Domain | Family |
| --- | --- |
| Header/navigation | `family.header_navigation.editorial_discovery.v1` |
| Product card | `family.product_card.editorial_discovery.v1` |
| Collection/merchandising | `family.collection_merchandising.editorial_discovery.v1` |
| Product detail | `family.product_detail.editorial_discovery.v1` |
| Cart | `family.cart.current_calinium.v1` |
| Responsive behavior | `family.responsive_behavior.editorial_discovery.v1` |

The profile targets Calinium One 1.0 and the existing compiler, six-preset catalog, Design DNA engine, and capability registry. Its controlled Phase C eligibility is explicit-profile selection only. An omitted profile continues to resolve Current Calinium, and an invalid explicit profile fails closed.

## Structural differentiation

The header uses an editorial masthead and utility/navigation hierarchy rather than the Current Calinium single-grid composition. Its mobile transformation becomes a compact identity/action row with a disclosure navigation designed for touch and keyboard access.

The product card uses an independent editorial media/content composition and information hierarchy. It continues to delegate price and product-form correctness to shared snippets.

The collection presenter combines a stronger collection introduction, an editorial merchandising grid, and a distinct product-card presenter while preserving the shared collection, facets, sorting, and pagination contracts. Product density and featured rhythm transform deliberately on mobile rather than scaling desktop columns.

The product detail presenter uses a media-led asymmetric layout with a differently ordered information and purchase relationship. On mobile, product identity, media, and purchase controls are reprioritized into a linear, overflow-safe experience. Shared product media, variant, form, dynamic checkout, app-block, and accessibility behavior remain authoritative.

Responsive behavior is a registered family because the transformation rules cross header, card, collection, and PDP presenters. Editorial Discovery does not intentionally inherit the known Current Calinium mobile-homepage overflow.

## Theme Editor behavior

Generated packages retain the canonical Shopify section identities and schemas, so existing templates, merchant content, section settings, blocks, and app blocks stay editor-compatible. Alternate presenter source is mapped onto those canonical runtime targets only during isolated packaging. The profile does not hard-code controlled-fixture content, menu handles, products, collections, copy, colors, or media.

## Runtime application and provenance

The architecture registry owns family and presenter identities. An architecture runtime plan resolves only registered source-to-target overlays, rejects unknown paths and duplicate targets, verifies source digests, applies them inside the generated copy, and records the plan in the read-only package manifest. Current Calinium has an empty overlay plan, preserving its package bytes. Editorial Discovery has an explicit bounded overlay plan.

Generated-theme architecture selection remains the immutable paid-input boundary. Read-only package `architecture_runtime` provenance records applied presenter identities and target digests. Shopify JSON contains neither provenance nor approval metadata.

## Same-input comparison

Phase C reuses the exact approved Phase B comparison fixture and key:

```text
comparison-fixture-0c881e4699c1cd3e33b0
d7413cc5957c06221d6426210f86ae7cfd081bc2e66d55dbdb98a13b12d417f6
```

The current and Editorial source artifacts must match in merchant fixture, Essential preset, strategy revision, Approved Block Plan/resource snapshot provenance, recipe, generated section composition, warnings, omissions, settings data, and every generated template JSON document. Only architecture selection and registered runtime presenters differ.

Both profiles use the controlled Shopify development runtime and the same matrix: Homepage, Collection, Product, and Cart at 1440×900 and 390×844. Runtime output stays ignored under `output/`.

The capture driver validates registered DOM presenter markers and separately verifies actual template/section identities from the trusted ZIP. Screenshot hash inequality is diagnostic, not the source of architectural truth. All six Homepage/Collection/PDP cells must use distinct registered presenters and render distinct images. Cart may remain materially similar because its family is intentionally shared.

## Baseline protection

`fixtures/storefront-render-current-calinium-baseline.json` remains unchanged. The comparison command runs Current Calinium first and stops before Editorial capture if the approved architecture selection, comparison fixture/key, normalized controlled artifact SHA-256, capture dimensions, or any PNG SHA-256 changes. Request and render identities are still recorded as provenance, but they are derived from the current ignored source-ZIP package metadata and are not substituted for the protected controlled-artifact and image evidence. It preserves the known observation that the 390×844 Current Calinium homepage produces a 657-pixel-wide full-page PNG; Phase C does not repair that baseline defect.

Commands:

```bash
npm run generate:editorial-discovery-artifact
npm run capture:editorial-discovery-comparison -- --request-only --replace
npm run capture:editorial-discovery-comparison -- --execute-development-render --replace
npm run test:core-2-architecture
npm run validate:core-2-architecture
npm run test:storefront-render
npm run validate:storefront-render
```

The live capture command may alter only Shopify's non-live development theme through `shopify theme dev`; it cannot target the live theme and does not publish.

## Validated Phase C evidence

The approved real-runtime comparison completed on 2026-08-13 with Current request `render-request-75d31f88138d248861b4` and Editorial Discovery request `render-request-d388f2ca0f5da899d5d4`. Both requests resolved comparison fixture `comparison-fixture-0c881e4699c1cd3e33b0` and comparison key `d7413cc5957c06221d6426210f86ae7cfd081bc2e66d55dbdb98a13b12d417f6`. Non-architecture generation provenance and generated Shopify configuration were equal; registered architecture runtime plans were distinct.

| Profile | Route | Viewport | Full-page PNG | PNG SHA-256 |
| --- | --- | --- | --- | --- |
| Current Calinium | Homepage | 1440×900 | 1440×3072 | `e98b6fe53c7643b0503e379bf0183900f68d28a7f43204e1128ff8a8098a5597` |
| Current Calinium | Homepage | 390×844 | 657×2248 | `578512decdd90eb4d7bd5f53e015b2ebb09b1a0d9e20ca18351065da275eae30` |
| Current Calinium | Collection | 1440×900 | 1440×2511 | `4a3c1bff717929b28ec95d31c55fa4b8c6d46fff249a24fcc11de6946d8246d3` |
| Current Calinium | Collection | 390×844 | 390×2581 | `733b01bcb7cdf3654abaae4bcdc5de9922506198d15e530f178a8d2143e4b891` |
| Current Calinium | Product | 1440×900 | 1440×3867 | `fdcd3e93a31ab6acdfa2d6c38b199ee355e07e11356140fa46359dc5f8bb5618` |
| Current Calinium | Product | 390×844 | 390×3665 | `3f9c57276b1c823236caa4a97f88e62cd3bba798042a7ee0a19a13b4f5049ac0` |
| Current Calinium | Cart | 1440×900 | 1440×946 | `140f2144ec63dbcc929664d98bcc9b1fd736bc68f97f6bde1b38ac6512102b7d` |
| Current Calinium | Cart | 390×844 | 390×1048 | `4aa2ad54ddeb82f275a23586f2c3c386429f41d8c221e00b931d734013928057` |
| Editorial Discovery | Homepage | 1440×900 | 1440×3868 | `13debce9fae521ca393d29f3771d2791c72bb39ce2d3c6a4cb33563927f2d5ba` |
| Editorial Discovery | Homepage | 390×844 | 390×2184 | `3e0eece4daabe08f1308e7d2857dfc67cb28fba8b6454a9f46ea4bcde3bfa9d5` |
| Editorial Discovery | Collection | 1440×900 | 1440×3245 | `23364d16159a9790b57d6d037bba7f5c7a55e7e42925932f6a6453ad85c1f40a` |
| Editorial Discovery | Collection | 390×844 | 390×2623 | `edd6b6499490ba9ca6d2294aa07f50f33753ed551ecac03a3258cd988caf17a3` |
| Editorial Discovery | Product | 1440×900 | 1440×3940 | `7610c4d6853ab26beb7e13d9f8179d85aeb2cdc387a609951ff0d72ef70c0942` |
| Editorial Discovery | Product | 390×844 | 390×3647 | `9647dade2c86e1ae16e863c7a9cc0b6efe97511c4745901daa59cb75b13fa3a5` |
| Editorial Discovery | Cart | 1440×900 | 1440×995 | `dd5e549d5010eb43ee31d58b298da53175d73f0b2347c4fd417b0ff8714789cd` |
| Editorial Discovery | Cart | 390×844 | 390×1048 | `86799dff9dd561b3fb75c5224fd315aa9f2adfab4f584a6f03058959b157749c` |

The six primary Editorial Discovery cells rendered with distinct registered presenter evidence and distinct diagnostic PNG hashes. Both profiles retain `family.cart.current_calinium.v1`; their Cart screenshots differ only because the page-level header presenter differs. Editorial Discovery's initially observed mobile Homepage root overflow was isolated to the horizontal featured-collection track and corrected within the new collection presenter using an inline-size containment boundary. Its final mobile Homepage capture is 390 pixels wide. The protected Current Calinium 657-pixel mobile Homepage observation remains unchanged.

Theme Check inspected 135 files with zero errors and three existing orphaned-snippet warnings (`hotspot-item.liquid`, `icon-text.liquid`, and `testimonial-item.liquid`). Browser observations were limited to development-runtime infrastructure noise shared by both profiles: Shopify CDN origin-trial CORS, Shop Pay iframe CSP/403, sandboxed service-worker suppression, and aborted web-pixel/analytics requests. No fatal presenter JavaScript error or critical theme-asset failure was observed.

## Originality and deferred work

Editorial Discovery is an original Calinium implementation. Competitive themes informed capability categories only; no benchmark Liquid, JavaScript, CSS, assets, identifiers, or source structure is used.

Deferred work includes a third profile, automatic merchant-facing architecture selection, the optional material question, subjective visual scoring, visual repair, cart redesign, expanded viewport/browser matrices, and Phase D. A later approved phase may add evaluation on top of the deterministic evidence; it must not replace it.
