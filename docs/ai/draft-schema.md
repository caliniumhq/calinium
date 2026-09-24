# Draft configuration schema

`schemas/calinium-draft-configuration.schema.json` is the canonical contract for a Draft Configuration. A draft is explicitly not Shopify JSON and cannot be uploaded as a theme template.

## Root fields

- version and mapping-catalog version compatibility;
- merchant summary copied from the validated merchant profile;
- global theme configuration grouped into typography, spacing, colors, motion, layout, commerce behavior, and accessibility notes;
- one homepage plan and plans for Product, Collection, About, Contact, Blog, and Article;
- merchant-input, asset, review, and blocked-field queues;
- readiness, summary, explanations, and validation report.

## Setting record

Each resolved or unresolved setting has a fully qualified reference, a status, its safety level, and an explanation. The only allowed statuses are:

- `proposed` — an approved bounded mapping or schema default;
- `review_required` — a merchant must approve or supply it;
- `blocked` — a merchant-only field such as a Shopify picker, media, or Custom Liquid;
- `preserved` — an existing non-configurable behavior is deliberately retained.

The builder never substitutes an invented value for a review or blocked field.

## Section and page records

Each section record includes a stable instance ID, installed section ID, position, source mapping, mapped settings, unresolved fields, required assets, confirmations, fallback layout, validation status, and explanation. Page records may be `unsupported` only when the mapping layer lacks a real approved page-blueprint mapping; no substitute section is invented.
