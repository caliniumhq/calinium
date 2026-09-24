# Shopify preview and deployment boundary

The dashboard’s Shopify preview adapter is intentionally conservative. It does not upload theme files, create a theme, overwrite an existing theme, publish any theme, or claim a URL before Shopify supplies one.

## Current behavior

1. An isolated Calinium build must already exist.
2. The project must have a healthy, synchronized Shopify connection.
3. The merchant must explicitly approve a theme resource whose role is `DEVELOPMENT` or `UNPUBLISHED`.
4. The adapter asks Shopify only for that approved existing target.
5. A preview record is associated with project, connection, generated build, approved theme target, status, and any safe warning.
6. Only an HTTPS URL actually returned by Shopify is shown to the merchant.

If Shopify cannot provide a valid existing preview URL, the record is `failed` and the dashboard remains truthful: it does not fabricate a link or alter the main theme. Preview verification remains the existing downstream responsibility.

## Deployment boundary

Discovery uses read scopes. A deployment-capable workflow needs a separate, explicit `write_themes` authorization, an approved Draft, a verified generated build, existing review/approval artifacts, successful preview verification (or a documented downstream exception), and the existing deployment and release-manager checks. This adapter neither publishes nor adds a live-publication path.

Theme metadata and preview semantics use Shopify’s supported [Theme Admin GraphQL query](https://shopify.dev/docs/api/admin-graphql/latest/queries/theme?example=retrieves-a-single-theme-by-its-id). The wider Calinium deployment lifecycle is documented in [Architecture v1.0](../architecture/06-review-deployment.md).
