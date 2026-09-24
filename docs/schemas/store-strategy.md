# Store Strategy schema

[`schemas/store-strategy.schema.json`](../../schemas/store-strategy.schema.json) defines the merchant-reviewable recommendations that follow a valid Creative Brief. It is a strategy, not an approved Draft Configuration or a Shopify theme.

The contract includes a design direction, color and typography direction, homepage structure, navigation, product and collection guidance, motion principles, fixed accessibility/performance requirements, recommendations, merchant approvals, traceability, and validation warnings.

## Grounding and approval

When the offer safely resolves to an existing Calinium industry catalog, the builder creates a temporary adapter profile and asks the established Strategy Compiler to select only installed sections. The complete compiler result is retained in `traceability.legacyCompilerStrategy` for inspection. No adapter value is promoted to a merchant fact.

`merchantApprovalsRequired` marks the design direction, hero treatment, color direction, and typography direction for review. This v1 contract never applies those recommendations to a theme. See [Creative Director architecture](../architecture/ai-creative-director.md) and [CLI guide](../guides/creative-director-cli.md).
