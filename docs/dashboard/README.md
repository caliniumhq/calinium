# Calinium Dashboard

The Dashboard is the merchant experience layer introduced in Phase 9A.2 and expanded in Phase 9B.1. It is a React application under [`apps/dashboard`](../../apps/dashboard/) and the authenticated, organization-scoped host for the existing Merchant Interview Engine.

## Reading order

1. [Merchant Creative Director architecture](dashboard-architecture.md)
2. [Merchant Creative Director flow](merchant-flow.md)
3. [Merchant Creative Director state](state.md)
4. [Architecture](architecture.md)
5. [Interview UI](interview-ui.md)
6. [Discovery](discovery.md)
7. [Asset Library](assets.md)
8. [Brand colors](colors.md)
9. [References](references.md)
10. [Merchant Profile view](merchant-profile.md)
11. [State management](state-management.md)
12. [Components](components.md)
13. [Accessibility](accessibility.md)
14. [Accounts](accounts.md)
15. [Authentication](authentication.md)
16. [Projects](projects.md)
17. [Durable storage](storage.md)
18. [Shopify connection and approval](shopify-connection.md)
19. [Shopify security and environment](shopify-security.md)
20. [Shopify resource lifecycle](shopify-resources.md)
21. [Shopify preview boundary](shopify-preview.md)
22. [Shopify CLI and live development-store validation](shopify-live-validation.md)
23. [Paid custom-theme purchase](custom-theme-purchase.md)
24. [Shopify one-time billing](shopify-billing.md)
25. [Custom-theme delivery](custom-theme-delivery.md)

The Dashboard consumes the Merchant Interview and Creative Director public service surfaces; it does not replace any catalog, validation, branching, profile, compiler, generation, deployment, or theme logic. Its server-only Shopify adapter lets an organization assign a store to a project, synchronize a minimized resource catalog, and require current explicit project approvals. It never modifies the Shopify runtime or deploys a theme.

When Calinium opens inside Shopify Admin, App Bridge supplies a short-lived Shopify session token to the browser for each request. The dashboard exchanges that token only on the server, verifies the shop and staff identity, establishes an HTTP-only Calinium session, and opens the Creative Director directly. The email/password screen is reserved for standalone local development; see [Authentication](authentication.md) for the security and environment requirements.

## Commands

```sh
cd apps/dashboard
npm install
npm test
npm run build
npm run dev
```

The detailed engine contract remains in [Merchant Interview documentation](../merchant-interview/README.md). Architecture v1.0 describes the dashboard’s place in the platform [system architecture](../architecture/02-system-architecture.md).

The paid custom-theme flow creates an immutable approved-input snapshot and a read-only, manually installable Shopify theme package only after durable payment confirmation. It does not upload, modify, or publish a Shopify theme; see [Paid custom-theme purchase](custom-theme-purchase.md).
