# Compiler input schema

`schemas/calinium-merchant-profile.schema.json` is the canonical merchant profile contract. It requires the structural fields `business`, `industry`, `subcategory`, `catalog`, `audience`, `goals`, `assets`, `preferences`, and `brand_personality`.

Values may be explicitly `null` where the merchant has not supplied them. `null` produces an unresolved decision; it is not replaced with an invented fact. Unknown supplied catalog IDs and incompatible personality combinations fail profile validation.

Assets are declared identifiers, not file paths. Declaring an asset tells the compiler only that the merchant says it is available; the compiler does not inspect or create media.
