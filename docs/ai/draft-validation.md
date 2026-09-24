# Draft Builder validation

Run the builder checks with:

```sh
node scripts/test-draft-builder.js
node scripts/validate-draft-builder.js
```

`validate-draft-builder.js` verifies:

- all required isolated modules and documents exist;
- Draft Builder modules contain no Liquid, storefront, cart, network, or file-write behavior;
- fixture identities and inputs are valid;
- a generated luxury-bags draft validates against `calinium-draft-configuration.schema.json`;
- all homepage sections and global settings come from approved mappings;
- duplicate instance IDs, unknown sections/settings, invalid mapped values, missing field plans, and incorrect readiness are rejected;
- the Milestone 6B backup confirms no Shopify runtime files, settings, catalogs, or compiler modules changed.

The fixture suite covers Luxury Bags, Electronics, Beauty, Jewelry, Furniture, Hospitality, Food, Digital Products, Minimal Merchant, Incomplete Merchant, Invalid Strategy, and Blocked Strategy. It checks deterministic output, profile/strategy input immutability, expected blocker behavior, and explanation coverage.

Also run the existing mapping, compiler, design-intelligence, section-pack, JSON/Liquid/JavaScript, and Shopify Theme Check validations before accepting a change.
