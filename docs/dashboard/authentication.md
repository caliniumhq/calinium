# Authentication

The Dashboard has two entry paths. It keeps a provider registry for standalone development access and uses a separate, server-only Shopify embedded identity bridge inside Shopify Admin. Neither path places credential behavior in React components or route handlers.

```text
Dashboard UI
  → DashboardApiClient (same-origin, credentialed requests)
  → Dashboard API (CSRF + authenticated actor)
  → AuthService
  → AuthProviderRegistry
  → PasswordAuthProvider
  → durable storage
```

```text
Shopify Admin iframe
  → App Bridge session token (transient)
  → /api/auth/embedded
  → verified shop + staff identity
  → managed-install token exchange when needed
  → encrypted offline credential + shop-scoped identity
  → existing HTTP-only Calinium session
```

## Embedded Shopify sign-in

Inside Shopify Admin, Calinium does not render email/password sign-in or sign-up controls. The dashboard obtains an App Bridge session token only for the current request and sends it to `/api/auth/embedded`. The server validates its HS256 signature, audience, expiry, issuer, destination shop, and Shopify user subject before using it.

The first authenticated launch for a shop creates a dedicated Calinium organization and workspace for that shop. The first Shopify identity becomes its owner. Later Shopify staff identities are mapped to the same organization as `editor` members, preserving existing Calinium owners and avoiding cross-shop access. Identity records are keyed by both shop domain and Shopify user ID; no Shopify access token or raw session token is stored in those records.

For a Shopify-managed installation, the server resumes a valid encrypted offline credential. If none is available, it exchanges the verified App Bridge token for an expiring offline access token, verifies the shop through the Admin GraphQL boundary, and stores only an AES-256-GCM credential envelope. The App Bridge token is never persisted or returned to the browser. An embedded request must match both the Calinium session identity and the current shop identity, so a cookie from one shop cannot authorize another shop.

Every embedded API request also resolves the current verified Shopify identity server-side. The HTTP-only Calinium cookie remains useful for continuity, but it is not a prerequisite for an embedded request: browsers that partition or decline third-party cookies do not fall into a sign-in loop. A valid App Bridge token is the request-binding protection for embedded mutations; standalone requests continue to use the existing double-submit CSRF check.

Embedded login fails closed if the application secret, dashboard-session secret, or token-encryption key is unavailable. In that state the merchant sees a retryable embedded-session message, never a password form. `CALINIUM_DASHBOARD_SESSION_SECRET` and `CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY` are therefore required in the private dashboard environment even when Shopify CLI provides the temporary app URL and client credentials.

## Standalone email and password

`PasswordAuthProvider` remains available only for non-embedded/local development routes.

- Email values are normalized to lowercase before lookup.
- Passwords require 12–128 characters.
- Password hashes use Node’s `crypto.scrypt` with a unique 16-byte salt and a constant-time verification comparison.
- Login error messages do not reveal whether an email exists.
- Failed attempts are persisted and limited to ten email-or-IP failures in a rolling 15-minute window.
- Successful sessions are opaque, server-side, and revoked by deleting the token digest on sign out.

## Request protection

State-changing requests use a same-origin double-submit CSRF token. The Dashboard first obtains a short-lived CSRF cookie, then sends the matching token in `X-CSRF-Token`. The API rejects missing, mismatched, or cross-origin mutation requests. Responses are `no-store` and include `X-Content-Type-Options: nosniff`.

Set `NODE_ENV=production` behind HTTPS so session and CSRF cookies receive the `Secure` attribute. Deploy the Dashboard behind a TLS-terminating reverse proxy that preserves the original host and applies standard transport security headers.

## Future providers

`AuthProviderRegistry` is the only provider selection point. Google, Shopify Login, and magic-link providers should implement the same credential-verification/identity handoff contract and be registered by configuration. They must not change Dashboard components, project authorization, or Merchant Interview Engine code.

The server-only [Shopify connection adapter](shopify-connection.md) owns resource authorization and never places Shopify credentials in a browser session. The embedded identity bridge is intentionally narrow: it uses Shopify Admin sessions only to authenticate the current app launch and map it to the same shop-scoped Calinium organization. Social sign-in remains future work.
