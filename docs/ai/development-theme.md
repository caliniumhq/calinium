# Development Theme Management

The adapter selects only targets with role `development` or `unpublished`; `main` and published targets are rejected even when explicitly named.

Selection priority is:

1. Explicit supplied target ID, after role validation.
2. An unpublished/development theme named `Calinium Development…`.
3. An existing development-role theme.

If none exists, creation is disabled by default. It requires `--allow-create` and an explicit immutable baseline theme directory. Provisioning creates a separate unpublished target from that baseline, then the approved deployment package uploads only configuration JSON. This avoids using the merchant’s published theme as a writable target.

Shopify’s API recognizes `DEVELOPMENT` and `UNPUBLISHED` theme roles and restricts theme creation to non-main roles. [OnlineStoreTheme](https://shopify.dev/docs/api/admin-graphql/latest/objects/onlinestoretheme)
