# Accounts

Phase 9B.1 makes an authenticated Calinium account the entry point to the Dashboard. An account is intentionally separate from every Shopify identity and from every offline AI engine.

## Account contract

[`calinium-user.schema.json`](../../schemas/calinium-user.schema.json) is the canonical non-secret user record. It contains identity and lifecycle data only; password hashes, opaque session tokens, login attempts, and CSRF tokens are storage concerns and are never returned through the Dashboard API.

Every account registration atomically creates:

1. One active user.
2. One organization owned by that user.
3. One default workspace for that organization.
4. One active `owner` membership.

This gives a new merchant a private workspace without needing a separate onboarding mutation. The default organization is selected by the authenticated server session, never by a browser-supplied organization ID.

## Roles

The membership schema supports `owner`, `administrator`, `editor`, and `viewer`. Phase 9B.1 provisions only an owner, while the authorization service already enforces the following capability boundary:

| Capability | Owner | Administrator | Editor | Viewer |
| --- | --- | --- | --- | --- |
| View projects | Yes | Yes | Yes | Yes |
| Edit interview | Yes | Yes | Yes | No |
| Create projects | Yes | Yes | No | No |
| Manage organization | Yes | Yes | No | No |

Invitations and member management are deliberately future work. They can add memberships through the existing schema and permission service without changing project or interview ownership.

## Session model

The server creates an opaque random session token, stores only its SHA-256 digest, and sends the raw token in an `HttpOnly`, `SameSite=Lax` cookie. Sessions expire after 30 days; expired rows are pruned when a new session is issued. No password or session token is stored in browser storage.

See [authentication](authentication.md) for controls and provider extension points, and [projects](projects.md) for account-owned work.
