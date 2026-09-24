# Calinium Architecture v1.0

Calinium is a Shopify Online Store 2.0 theme and a deterministic configuration platform for planning, reviewing, deploying, verifying, and recovering a merchant storefront. It separates design reasoning from theme runtime: AI-facing engines produce reviewable data artifacts; the theme renders only the approved Shopify configuration.

The [Merchant Interview](../merchant-interview/README.md) is the official input layer. Its merchant-facing host is the [Calinium Dashboard](../dashboard/README.md), which collects Discovery context, confirmed intent, and tenant-isolated project assets through an adapter boundary before producing the canonical Merchant Profile consumed by the existing pipeline.

This directory is the architectural entry point for engineers, contributors, and future agents. It defines system boundaries, lifecycle contracts, and extension rules. Executable JSON schemas and source code remain the authoritative contracts when they differ from prose.

## Platform philosophy

- **Schema first.** Artifacts are validated at each boundary rather than inferred from untyped files.
- **Deterministic by default.** Equal validated inputs, knowledge catalogs, and versions produce equal planning outputs.
- **Explainable.** Decisions retain their catalog, mapping, approval, and checksum evidence.
- **Merchant safe.** No planning step invents merchant facts or mutates the source theme. Deployment is limited to approved configuration on an unpublished/development target.
- **Progressively enhanced.** Theme content remains useful without JavaScript; interaction adds to server-rendered Shopify content.
- **Composable.** Sections compose shared primitives instead of reimplementing cards, icons, media, prices, or controls.

## Reading paths

New engineers should read the documents in order:

1. [Overview](01-overview.md)
2. [System architecture](02-system-architecture.md)
3. [Data flow](03-data-flow.md)
4. [AI pipeline](04-ai-pipeline.md)
5. [Theme engine](05-theme-engine.md)
6. [Review and deployment](06-review-deployment.md)
7. [Security and merchant protection](07-security.md)
8. [Extensibility](08-extensibility.md)
9. [Development guide](09-development-guide.md)
10. [Roadmap](10-roadmap.md)
11. [Repository Restructure v1.0](repository-restructure.md)
12. [Dashboard documentation](../dashboard/README.md)
13. [Merchant Creative Director Dashboard](../dashboard/dashboard-architecture.md)
14. [Dashboard accounts and durable storage](../dashboard/accounts.md)
15. [Shopify connection and resource approval](../dashboard/shopify-connection.md)
16. [Current system audit](current-system-audit.md)
17. [AI Creative Director v1](ai-creative-director.md)
18. [Repository structure](repository-structure.md)
19. [Canonical Merchant Profile](merchant-profile.md)
20. [Theme generation pipeline](theme-generation-pipeline.md)
21. [Durable generated artifact and evidence storage](../launch/calinium-durable-generated-artifact-evidence-storage.md)
22. [Public durable storage real-provider acceptance](../launch/calinium-public-durable-storage-real-provider-acceptance.md)

## Diagrams

- [System architecture](diagrams/system-architecture.md)
- [AI pipeline](diagrams/ai-pipeline.md)
- [Data flow](diagrams/data-flow.md)
- [Review workflow](diagrams/review-workflow.md)
- [Deployment pipeline](diagrams/deployment-pipeline.md)
- [Release workflow](diagrams/release-workflow.md)
- [Rollback workflow](diagrams/rollback-workflow.md)
- [Folder structure](diagrams/folder-structure.md)
- [Dependency graph](diagrams/dependency-graph.md)

## Related implementation guides

The [AI documentation index](../ai/README.md) links to detailed engine contracts and operational commands. The root [README](../../README.md) documents theme primitives and section packs. This guide deliberately consolidates architecture rather than duplicating individual setting, block, or section APIs.
