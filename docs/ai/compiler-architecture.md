# Compiler architecture

`ai/compiler/compile-strategy.js` orchestrates isolated modules in fixed order. No module mutates the merchant profile or a knowledge catalog.

| Responsibility | Module |
| --- | --- |
| Load catalogs and installed section IDs | `load-knowledge-base.js` |
| Validate merchant profile | `validate-profile.js` |
| Resolve each visual decision | `resolve-*.js` |
| Select and order sections | `resolve-sections.js`, `order-sections.js` |
| Inspect assets, verification, and safety | `detect-assets.js`, `detect-verification.js`, `validate-content-safety.js` |
| Validate composition and output | `validate-strategy.js`, `schema-validator.js` |
| Explain and assemble output | `build-explanations.js`, `build-output.js` |

The compiler uses Node’s standard library only. It runs outside the storefront bundle and has no browser, Liquid, cart, network, or Shopify API dependency.
