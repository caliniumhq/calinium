# AI Strategy Compiler overview

The Calinium AI Strategy Compiler converts a structured merchant profile into a deterministic storefront strategy. It is planning software, not a Shopify renderer: it does not call Shopify APIs, generate Liquid, write template JSON, alter merchant data, or create merchant copy.

Run it from the repository root:

```sh
node compile-storefront-strategy.js compile --input merchant.json --output /tmp/strategy.json --pretty
node compile-storefront-strategy.js validate --input merchant.json --pretty --stdout
node compile-storefront-strategy.js explain --input merchant.json --pretty --stdout
```

The compiler reads Calinium’s existing design-intelligence catalogs, section manifest, setting metadata, block taxonomy, composition matrix, and content-safety levels. It returns only recommendations and publication gates. Output paths inside `assets`, `config`, `layout`, `locales`, `sections`, `snippets`, and `templates` are rejected.
