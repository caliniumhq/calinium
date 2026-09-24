# Compiler output schema

`schemas/calinium-storefront-strategy.schema.json` validates the strategy. It includes merchant summary, catalog versions, selected resolutions, decision objects, ordered section IDs, asset requirements, verification checklist, content-safety status, validation report, explanations, and decision trace.

Every decision has `selected`, `confidence`, `sources`, `rule_ids`, `rejected_alternatives`, and `reasoning`. The output has no timestamp, random value, generated storefront content, Liquid, product data, or Shopify template data, which keeps identical input and knowledge versions deterministic.
