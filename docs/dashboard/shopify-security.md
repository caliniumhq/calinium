# Shopify connection security and environment

## Required server environment

The following values belong only in the server runtime environment. They must not be committed, emitted by API responses, written to activity payloads, added to a browser bundle, or copied into generated artifacts.

| Variable | Required | Purpose |
| --- | --- | --- |
| `CALINIUM_SHOPIFY_CLIENT_ID` | Yes for OAuth | Shopify app client identifier. |
| `CALINIUM_SHOPIFY_CLIENT_SECRET` | Yes for OAuth | Verifies the callback HMAC and exchanges the authorization code. |
| `CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI` | Yes for OAuth | Registered HTTPS callback URL; localhost is permitted only for local development. |
| `CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY` | Yes for credentials | Exactly 32 bytes encoded as 64 hex characters or base64url. Enables AES-256-GCM. |
| `CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY_ID` | Recommended | Identifies the active encryption key without revealing it. |
| `CALINIUM_SHOPIFY_ADMIN_API_VERSION` | Optional | Overrides the centralized Admin GraphQL API version. |
| `CALINIUM_SHOPIFY_WEBHOOK_API_VERSION` | Optional | Overrides the selected webhook API version. |
| `CALINIUM_DASHBOARD_SESSION_SECRET` | Required in production | Server-only HMAC secret for dashboard sessions; at least 32 characters. |
| `CALINIUM_PAYMENT_PROVIDER` | Required for paid generation | Selects Shopify one-time billing in production; the deterministic simulator is non-production only. |
| `CALINIUM_SHOPIFY_BILLING_TEST_MODE` | Development stores | Requests Shopify’s test-purchase mode outside production; it never authorizes client-side payment. |

When any required credential variable is unavailable, the adapter refuses to begin OAuth or persist credentials. It never falls back to a plaintext token record.

## OAuth protections

- A random opaque state and nonce are generated per connection attempt; only SHA-256 hashes are persisted.
- State has a ten-minute expiry and single-use consumption semantics.
- The callback requires a valid Shopify HMAC and current timestamp before an authorization code exchange.
- The callback shop must be a canonical `*.myshopify.com` domain and must equal the domain used to start the flow.
- After exchange, the adapter verifies the returned shop identity through Admin GraphQL before marking the connection usable.
- Token failure, permission failure, and identity failure are returned as merchant-safe error codes; no token, raw GraphQL payload, secret, or stack trace is exposed.

## Least-privilege scope policy

The discovery connection requests only the following read scopes:

- `read_products` — products, variants, and product media;
- `read_content` — eligible content metadata where Shopify grants it;
- `read_online_store_navigation` — menus;
- `read_files` — Shopify-hosted media/files;
- `read_markets` — market metadata;
- `read_themes` — theme identity and a safe non-live preview target.

It requests no customer, order, payment, or analytics permission. `write_themes` is deliberately deferred: Milestone 14 rejects a deployment-purpose connection rather than requesting it. A later, separately approved workflow may review that permission while preserving the existing Draft, Review, verification, deployment, and release checks.

The implementation follows Shopify’s [authorization-code grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant), its [access-scope model](https://shopify.dev/docs/api/usage/access-scopes), and the supported [Admin GraphQL API](https://shopify.dev/docs/api/admin-graphql/latest).

## Tenant isolation and audit trail

Every project route verifies the authenticated session, organization membership, project access, and required permission. A connection is organization-owned, then explicitly assigned to a project. Resource approvals also include project ID, connection ID, resource ID, approver, timestamp, and source revision. Relevant activity entries contain only safe lifecycle facts such as “resource approved” and its type.

The deterministic `DeterministicShopifyAdapter` is used only by automated tests. It supports no browser access and has no credentials. It lets local development validate lifecycle behavior without a Shopify store.

See [Shopify CLI and live development-store validation](shopify-live-validation.md) for the managed-installation lifecycle, expiring offline credentials, webhook verification, local tunnel recovery, and the exact read-only boundary.

For the paid custom-theme boundary, catalog pricing, provider verification, and no-write invariant, see [Shopify one-time billing](shopify-billing.md).
