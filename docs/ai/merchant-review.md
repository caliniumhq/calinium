# Merchant input, review, and blockers

The Draft Builder distinguishes between four queues instead of turning uncertain data into storefront content.

## Merchant input requirements

Fields classified by `config/theme-content-classification.json` are grouped into required, high, medium, and low priority. Shopify pickers, destination URLs, factual claims, images, videos, testimonials, product references, collection references, and Custom Liquid remain explicit inputs.

## Required assets

The builder combines the Strategy Compiler’s asset requirements with the opening hero’s primary merchant-only media field. It records approved/available state, affected section instances, source fields, and a safe unconfigured fallback. It never creates, selects, or claims to have supplied an asset.

## Review queue

Merchant-confirmation fields, global review settings, and existing verification requirements become review items. Examples include factual brand stories, credentials, typography/font choices, claims, links, and proof content.

## Blocked fields

Merchant-only settings cannot be filled automatically. The blocker queue makes those fields visible with their original fully qualified setting reference. A homepage collection, product, menu, page, article, or blog picker that is necessary to a planned section makes the draft `Blocked` until a merchant supplies it.

## Readiness

- `Ready` — every planned value is bounded and no merchant input remains.
- `Ready With Review` — configuration can proceed structurally, but merchant review or optional merchant-only fields remain.
- `Blocked` — core strategy inputs are unresolved, required assets are missing, or a required homepage Shopify picker has no merchant value.

Unsupported optional page mappings are reported transparently; they are not replaced with invented configuration.
