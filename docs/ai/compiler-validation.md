# Compiler validation

`validate` mode checks the merchant profile schema plus known industry, personality, preference, blueprint, and compatibility references. `compile` additionally validates selected sections, adjacency, duplicate sections, homepage limits, density warnings, trust placement, asset requirements, verification requirements, content safety, and the final output schema.

Run:

```sh
node scripts/validate-design-intelligence.js
node scripts/validate-ai-strategy-compiler.js
node scripts/test-ai-strategy-compiler.js
```

The compiler validator also verifies the pre-compiler backup: all sections, templates, and existing configuration JSON files remain byte-for-byte unchanged.
