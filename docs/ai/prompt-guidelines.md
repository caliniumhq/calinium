# Prompt guidelines for Calinium AI workflows

## Required inputs

Ask for or derive only supported input: merchant industry, brand personality, product/catalog shape, available media, factual claims with evidence, visual preferences, target page type, and conversion goal. Missing information is a request for clarification, not permission to invent it.

## Required reading order

1. `config/industry-profiles.json`
2. `config/brand-personality.json` and `config/design-language.json`
3. Typography, spacing, color, image, animation, and conversion catalogs
4. `config/page-blueprints.json`, `config/layout-recipes.json`, `config/design-rules.json`, and `config/compatibility-matrix.json`
5. `config/calinium-section-manifest.json`, setting metadata, block taxonomy, and content-safety levels

## Output contract

An AI proposal should identify the selected IDs, explain the decision in plain language, list an ordered sequence of real section IDs, state required merchant assets/facts, mark every confirmation gate, and emit only valid setting/block IDs. It must preserve existing template composition unless the merchant explicitly authorizes a change.

## Non-invention rules

Never invent product availability, discounts, urgency, ratings, reviews, testimonials, people, biographies, historical dates, locations, certifications, sustainability facts, material origins, compatibility, or media. Use neutral placeholders or omit unverified fields. This rule applies even when a design profile recommends a proof or storytelling section.

## Prompt template

```text
Plan a [page blueprint] for a merchant in [industry] with [personality] and [catalog summary].
Use Calinium design-intelligence catalogs and only real section IDs.
Choose one primary design language and explain typography, spacing, color, imagery, animation, conversion, and recipe selections.
Respect compatibility and density rules. Do not alter templates or merchant content.
List all merchant-provided facts/assets required before publication and leave unverified fields blank.
Return a JSON-ready strategy followed by a concise rationale.
```

Run `node scripts/validate-design-intelligence.js` before treating a generated strategy as compatible with this knowledge layer.
