# 07 — Security and Merchant Protection

Calinium’s security model is primarily a lifecycle-integrity and merchant-preservation model. It limits what each stage can write, verifies evidence before advancing, and retains an audit trail for later review.

## Approval gates

- The compiler validates only structured merchant input and does not mutate Shopify.
- The Draft Builder produces a plan and calculates readiness; blocked or unresolved merchant inputs remain visible.
- The generator rejects unapproved or non-ready drafts.
- Deployment rejects invalid review sessions, approval manifests, workspace fingerprints, package files, and unsupported targets.
- Release requires terminal preview verification with no failures or blocking warnings.
- Rollback requires exact, previously verified configuration evidence on the identical unpublished/development target.

## Integrity controls

| Control | Protection |
| --- | --- |
| JSON Schema | Rejects invalid artifact shape and version incompatibility. |
| Checksums/fingerprints | Bind files, manifests, review sessions, approvals, and configuration snapshots to their recorded state. |
| Append-only histories | Prevent silent replacement of review, deployment, verification, release, and rollback evidence. |
| Immutable manifests | Preserve a point-in-time record for each successful lifecycle boundary. |
| Source-runtime snapshots | Detect accidental modification of templates, sections, snippets, assets, locales, and theme settings during isolated operations. |
| Backup archives | Preserve recoverable source evidence before deployment, release, or rollback operations. |
| Project Asset Library | Keeps asset bytes behind an authorized provider boundary; records only safe metadata in relational storage. |
| Shopify OAuth and credential envelope | Validates callback state, nonce, HMAC, timestamp, and shop identity; encrypts access tokens with AES-256-GCM and keeps encryption keys outside durable records. |
| Project Shopify approval | Separates organization store ownership, project assignment, synchronization, current resource approval, and preview target approval. |

## Merchant data and content protection

The platform does not invent products, collections, menus, metafields, media, customer data, factual claims, testimonials, certifications, or merchant copy. Catalog field classifications distinguish safe automatic settings from merchant-review and merchant-only information. Generated configuration retains approved merchant resource references rather than replacing them.

Project-scoped discovery assets are checked against an explicit MIME and extension allowlist, content signatures, size limits, generated storage keys, checksum records, and organization/project membership before read, change, or removal. Asset URLs are controlled application routes rather than local filesystem paths. A confirmed profile preserves its traceability record if a referenced asset is later removed; the merchant receives a warning before that action. Local color extraction is deterministic and only becomes canonical after merchant approval.

## Deployment restrictions

The M8B adapter deploys only `templates/*.json` and `config/settings_data.json`. The staging copy exists solely because Shopify CLI expects a theme shape; the upload allowlist governs the remote mutation. Published/main themes are rejected. Release candidacy has no Shopify publication behavior, and rollback rejects a non-development/non-unpublished target.

## Secrets and access

Authentication is isolated in the deployment adapter. Secrets are not embedded in manifests, mapping catalogs, generated output, or documentation. The architecture supports Shopify CLI authentication and environment-based configuration, with future OAuth compatibility. Operators must still follow least-privilege account, filesystem, and credential practices.

The Dashboard’s Shopify connection adapter is server-only and uses a separate OAuth credential boundary. It requests discovery read scopes only by default, stores no customer/order/payment data, and never returns an access token to the browser. A connection needs explicit project assignment and explicit current resource approval before it can supply a Creative Director selection. Read [Shopify connection security](../dashboard/shopify-security.md) for the exact environment variables, callback checks, scopes, recovery behavior, and preview/deployment separation.

## Production safety boundary

v1.0 does not automatically publish themes. Any future production action must be a separately authorized feature with explicit human confirmation, target identity checks, additional backup/rollback controls, and independent audit evidence. See [review and deployment](06-review-deployment.md) and [roadmap](10-roadmap.md).
