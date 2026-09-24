# Compiler explainability

The compiler does not return opaque recommendations. Each stage identifies its selection, evidence-backed confidence, source files, applicable design-rule IDs, rejected candidates, and a deterministic explanation.

Sources name the exact catalog path, such as `config/industry-profiles.json` or `config/layout-recipes.json`. Rule IDs reference existing `design-rules.json` entries where a universal guardrail applies. A missing decision explicitly explains which merchant input or catalog relationship is unavailable.

Use `explain` mode to emit only the 13 stage explanations for review.
