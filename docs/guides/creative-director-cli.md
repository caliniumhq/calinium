# Creative Director CLI

The local CLI demonstrates the v1 journey without an external AI provider or a Shopify connection.

```sh
npm run creative-director
```

It starts with:

```text
Hi, I'm Calinium.
I'll help you design a Shopify storefront.
What do you sell?
```

The conversation asks one clear, non-technical question at a time. Type `I don't know` to record an unknown without an invented answer. Use `/correct field=value` before confirming to correct a known field; for example, `/correct productsOrServices=handmade bags, wallets`.

After Calinium displays **Here is what I understood**, type `yes` to confirm. It writes a Creative Brief, Store Strategy, and review state beneath `output/`. It does not call the Theme Generator.

## Fixtures

Run a deterministic fixture flow:

```sh
npm run creative-director -- --fixture fixtures/leather-travel-bags.json
npm run creative-director -- --fixture fixtures/handmade-rugs.json --output-id rugs-demo
npm run creative-director -- --fixture fixtures/skincare-brand.json
```

Fixtures are non-sensitive examples. The fixture path is treated as a confirmed merchant description for the demonstration; its resulting Store Strategy is still marked as a recommendation requiring merchant review.

## Compatibility command

To create a Store Strategy from an existing Creative Brief file through the established entry point:

```sh
node compile-storefront-strategy.js creative-director --input output/creative-brief/leather-travel-bags.json --pretty --stdout
```

The original compiler commands still expect the canonical Merchant Profile and are unchanged:

```sh
node compile-storefront-strategy.js compile --input ai/compiler/fixtures/valid/luxury-leather-bags.json --pretty --stdout
```

## Checks

```sh
npm run validate:creative-director
npm run test:creative-director
```

See [AI Creative Director v1](../architecture/ai-creative-director.md) for architecture, limitations, and review boundaries.
