# Merchant Creative Director State

The Creative Director keeps browser state intentionally small. `useCreativeDirector` holds the latest API result, pending state, and request error while the page is open. The canonical session is the authenticated project-scoped server record.

## State ownership

| State | Owner | Persistence | Notes |
| --- | --- | --- | --- |
| Conversation questions, facts, confidence, unknowns, and corrections | Existing conversation engine | `creative_director_sessions.conversation_state_json` | The browser renders it; it never duplicates planning rules. |
| Transcript | Creative Director service | `transcript_json` | Every accepted merchant answer and Calinium response is append-only within the session snapshot. |
| Brand Blueprint / Creative Brief | Existing pipeline façade | `creative_brief_json` | Replaced only after a merchant correction or revision. |
| Store Strategy | Existing pipeline façade | `store_strategy_json` | Reviewed recommendation by recommendation. |
| Approval decisions | Existing review-state helper | `review_json` | The service validates status before moving downstream. |
| Resources and assets | Existing Asset Service + Creative Director service | asset storage / `resource_plan_json` / `generation_context_json` | Asset bytes stay outside database columns; references remain project-owned. |
| Shopify connection and catalog | Server-only Shopify Connection Service | connection, encrypted credential envelope, sync, normalized-resource, and approval records | The browser sees only safe status and current approval views; it never receives a token, raw GraphQL payload, or remote ID. |
| Shopify preview state | Shopify Connection Service + existing Preview Verification boundary | `shopify_preview_targets`, preview attempts, and `preview_state_json` | A merchant-approved non-live target and an HTTPS URL returned by Shopify are required; no URL is fabricated. |
| Paid order and immutable input snapshot | Custom Theme Service | `custom_theme_orders` | Snapshot includes approved creative inputs, price, resource revisions, and Calinium One checksum. It is never rebuilt from later project edits. |
| Payment events and generation attempts | Payment provider boundary + Custom Theme Service | `custom_theme_payment_events` / `custom_theme_generation_runs` | A durable `paid` event is required before M15 generation. Retry reuses the same paid order. |
| Delivery artifacts | Existing isolated generation pipeline | safe relative references beneath `output/` | Download endpoints authorize the project member and never reveal absolute paths. |

## Network behavior

`CreativeDirectorService` wraps a project-scoped `DashboardApiClient`. Every mutation is CSRF-protected, authenticated, authorized by organization membership, and persisted before the React hook receives its new session. A failed request leaves the previous persisted session intact and is announced through the existing error treatment.

## Transition policy

Forward transitions occur only in service methods that validate their prerequisite (`respond`, `createBrief`, `approveBrief`, `approveStrategy`, `updateResources`, and Custom Theme order/payment processing). `setStage` is intentionally limited to documented backward revisits. A browser request cannot bypass review, resource approval, price configuration, payment confirmation, source-integrity checks, or package validation.

## Refresh and resume

On route load the hook calls `load()`, which returns the session and authorized ready assets. Continuing later merely leaves the route; no state is discarded. Restart is explicit and replaces only the project’s Creative Director session with a new deterministic conversation, recording activity history. Existing Merchant Interview sessions and Merchant Profiles are not deleted.

## Privacy boundary

The state contains merchant-supplied context and internal recommendations. It is tenant-isolated, never written to localStorage as canonical state, and does not grant browser code access to Shopify credentials, deployments, or runtime theme files. The server-only Shopify adapter may contact Shopify only after an explicit merchant connection and only through its narrowed resource/approval boundary.
