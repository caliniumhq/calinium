# Compiler extension guide

Extend knowledge before extending code. Add a new industry, profile, recipe, design rule, or section-manifest entry to its canonical catalog and update its schema and validator. Add a compiler resolver only when a genuinely new resolution stage is needed.

Keep resolver inputs and outputs narrow, deterministic, and side-effect-free. Do not copy catalog knowledge into conditional code. Every new output field needs a schema update, fixture coverage, a deterministic test, and explainability sources. Never introduce storefront imports, Liquid generation, or write access to theme runtime directories.
