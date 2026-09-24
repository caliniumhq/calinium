# Compiler resolution order

The resolution order is fixed:

1. Merchant profile validation
2. Industry
3. Brand personality
4. Design language
5. Typography, spacing, color, imagery, and animation
6. Conversion strategy
7. Page blueprint
8. Homepage recipe
9. Section selection and ordering
10. Compatibility, density, trust-position, and page-length checks
11. Asset, verification, and content-safety detection
12. Explainability, output assembly, and output-schema validation

Industry and explicit merchant preferences take precedence over fallback behavior. When no supported evidence exists, the selected value is `null` with `unresolved` confidence.
