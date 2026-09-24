# Compiler testing guide

Fixtures cover luxury leather bags, beauty, electronics, jewelry, furniture, food, hospitality, and digital products. Negative fixtures cover unknown industry, conflicting personalities, missing required fields, and a structurally valid profile with a missing required asset.

`node scripts/test-ai-strategy-compiler.js` verifies deterministic repeated output, profile validation, recipe selection, ordered sections, asset detection, verification detection, explainability, output-schema validation, and CLI explain mode. Add one fixture and one targeted assertion for every new resolver branch or safety behavior.
