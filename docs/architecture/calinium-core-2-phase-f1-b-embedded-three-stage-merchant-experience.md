# Calinium Core 2.0 Phase F1-B — Embedded Three-Stage Merchant Experience

Status: local implementation candidate; not deployed or activated

Parent: `1000000000000000000000000000000000000008` / `core-2-phase-f1-a-complete`
Controlled-staging baseline: `2000000000000000000000000000000000000004`

## Scope and invariants

F1-B adds a presentation and server-projection layer over the approved F1-A contracts. It does not introduce another merchant-flow state machine and does not change Store Intelligence, architecture selection, Merchant Intent, Design DNA, generation, render, D1, D2.7, founder review, repair, billing, or Shopify theme-action policy.

The F1-A capability source remains disabled (`analysis_first_merchant_experience_enabled: false`, `activation_scope: disabled`). A separate server runtime flag, `CALINIUM_ANALYSIS_FIRST_MERCHANT_EXPERIENCE_ENABLED`, is false unless explicitly set to `true` in a later approved activation. No environment has been changed in F1-B.

## Existing dashboard integration audit

The existing embedded route authenticates the Shopify App Bridge ID token, resolves the installed shop to the existing user, organization, and project, and then loads `CreativeDirectorApp`. The app currently defaults to `QuickStartShell`, whose Chat, Preview, and Review destinations use the existing Creative Director hook and client service.

F1-B reuses these boundaries:

- Project/session data continues to come from `CreativeDirectorService.load` and the existing authoritative polling/refresh behavior in `useCreativeDirector`.
- Essential-detail answers continue through `CreativeDirectorService.respond` and the authenticated conversation endpoint.
- Material direction answers use the F1-A direction-choice adapter and delegate to `MerchantGenerationFlowService.answer`, preserving the E2 question identity, Merchant Intent child revision, one E1 rerun, architecture freeze, and stale-check semantics.
- Build uses the existing merchant-flow start/resume and custom-theme eligibility/order services. It does not create a generation, purchase, order, job, or payment state by rendering the UI.
- Retry uses the existing merchant-flow resume operation with the current flow identity, checksum, and sequence.
- Existing preview state and the existing same-shop Shopify preview URL are reused; no second artifact or comparison image is created.
- Advanced mode is the existing detailed Creative Director. Switching modes does not fork project, conversation, resource, flow, payment, job, or preview state.
- Operator readiness, founder review, recovery, and technical evidence controls remain in the existing protected Quick Start/operator surfaces and are never passed into the F1 merchant component.

No existing endpoint was duplicated for conversation, flow start/resume, eligibility, ordering, preview, or Advanced. F1-B adds only the missing sanitized projection, direction-card adapter, and telemetry routes.

## Server-authoritative experience adapter

`AnalysisFirstMerchantExperienceService`:

1. requires the runtime feature flag;
2. resolves the project and active membership;
3. reads the saved Creative Director session and Shopify project assignment;
4. verifies canonical shop and merchant-flow ownership;
5. builds the F1-A visual briefing, journey, and sanitized projection;
6. returns only merchant-safe projection fields, opaque HMAC bindings, and an optional safe preview link.

Projection GET is read-only. It does not create Merchant Intent, choose architecture, start generation, create commerce state, mutate a session, call a provider, or contact Shopify. Unsupported or unsafe legacy state returns `eligible: false` with `fallback: existing_interface`.

The authenticated project route is:

`GET /api/projects/:projectId/analysis-first-experience`

Direction selection and telemetry use CSRF-protected project routes:

- `POST /api/projects/:projectId/analysis-first-experience/direction`
- `POST /api/projects/:projectId/analysis-first-experience/telemetry`

Both the API router and service authorize the actor. The service also verifies project membership, flow ownership, and exact Shopify shop binding. The response schema is `analysis-first-merchant-experience-response-v1`.

The response never includes architecture/profile identities, intent values, scores, checksums, worker/job identities, D1/D2.7 details, provider/model data, local paths, stack traces, or raw failure codes. Mutation provenance stays server-side behind an opaque binding.

## Eligibility and disabled behavior

The F1 surface is used only when the runtime flag is enabled and the server returns an eligible projection. Eligibility requires a supported session, valid project/shop assignment, canonical shop, safe flow ownership, and a projectable F1-A state. Ineligible projects keep the existing interface without migration or reset.

When disabled, `CreativeDirectorApp` renders the existing `QuickStartShell` exactly as before. The client does not request the F1 endpoint, emit F1 telemetry, auto-redirect, or perform a mutation.

## Exactly three visible stages

The merchant shell always renders the F1-A stage list:

1. Analyzing your store
2. Building your storefront
3. Review your preview

Only the authoritative current stage is marked with `aria-current="step"`. Earlier stages are complete and later stages remain upcoming. Internal flow states never become additional merchant stages. No percentage or duration estimate is fabricated.

## Analyzing your store

The analyzing surface supports analysis in progress, a confident recommendation, a material direction choice, one essential-detail exception, or a safe blocker.

For confident results it shows exactly one `Visual & story-led` or `Direct & efficient` recommendation. It displays only the F1-A description and at most three allowlisted reasons. `See why` expands those reasons in place without a provider call; it is dismissible, announces `aria-expanded`, and restores focus to the trigger when closed. `Adjust direction` appears only when projected as available.

Material ambiguity shows exactly two keyboard-accessible radio cards and an explicit Continue action. The client submits only the direction ID plus the opaque current binding. The server converts that through the F1-A adapter into the existing E2-compatible answer. The UI never displays `image_led`, `information_led`, candidate scores, or architecture names.

One critical unanswered conversation fact may be shown as a compact essential-detail form. It reuses the exact deterministic existing question, submits through the current conversation service, preserves typed text after failure, and never expands into a setup questionnaire.

## Build and commercial boundary

`Build my preview` appears only when F1-A projects that action. The click is explicit and locally locked. Its existing order idempotency key is deterministically derived from the opaque current projection, so a reload of the same authoritative source converges rather than inventing a second purchase identity. It uses the existing merchant-generation-flow start plus custom-theme eligibility/order path when controlled merchant flow is enabled; the pre-existing custom-theme eligibility/order path remains the non-beta fallback. Existing server readiness, content/resource, architecture-freeze, conflict, billing, and idempotency protections remain authoritative.

The UI does not start on recommendation render, hard-code pricing, imply a free operation, or skip the commercial boundary. After a mutation it refreshes the authoritative Creative Director data and F1 projection before visually advancing.

## Building your storefront

All generation, artifact, render, objective QA, visual evaluation, and founder-review states map to one calm indeterminate surface. Only F1-A allowlisted status copy is rendered, including `Completing final checks` for internal review. The component never exposes D1, D2.7, founder review, model/provider attempts, checksums, worker leases, or repair details.

Reload and reconnect reuse the existing Creative Director polling and merchant-flow recovery. They do not create a new polling system, order, flow, job, retry, or build. Retry is visible only when the authoritative projection enables it and delegates to the existing current-checksum/current-sequence resume operation. Terminal blockers expose Advanced and support, never a false retry.

## Review your preview

The preview stage reuses the authoritative safe DEVELOPMENT preview link and may expose only projected actions:

- Approve design
- Request changes
- Compare with current store

The reassurance `Your current theme will not change while you review this preview.` remains visible. The link is accepted only when it is HTTPS, belongs to the assigned canonical Shopify shop, and contains no password/token/secret-like query parameter.

Approve design uses the existing Creative Director finish/approval boundary and does not authorize, publish, replace, or mutate a Shopify theme. Request changes and Compare route to the existing Advanced/refinement surface; comparison is absent when the server does not project authoritative availability. No comparison artifact is invented.

## Advanced and legacy behavior

Advanced is always keyboard reachable from F1. It uses the same project and saved state. Chat is not shown by default while F1 is active; it becomes available through Advanced, Request changes, or a supported exception. Returning to the simple mode reconstructs the projection from authoritative state.

The adapter covers current legacy Creative Director stages and all Core merchant-flow stages through the F1-A mapping. Safe legacy states receive deterministic projections without migration. Unsupported states fall back to the existing Quick Start interface, with Advanced remaining the complete correction path.

## Accessibility and responsive behavior

The shell uses a semantic ordered stage list, headings, fieldset/radio direction choice, labels, native buttons, associated errors, `aria-current`, `aria-expanded`, `role=status`, `aria-live`, and deliberate focus after projection changes. Actions have at least a 40px target; visible focus is retained; selected state is expressed in text/semantics as well as styling.

Component CSS prevents page-level horizontal overflow, uses zero-minimum grid tracks, stacks direction cards and actions at embedded widths up to 720px, and supports long copy. The 390×844 fixture assertion covers a single-column direction layout, reachable actions, stage-label wrapping, reduced motion, and no required horizontal scrolling. No document-level auto-scroll was added.

## Safe telemetry

Only F1-A event names and fixed scalar dimensions are accepted. The server rejects arbitrary fields and stale stage events, builds the F1-A telemetry contract, and persists only the redacted event. Raw merchant text, customer data, screenshots, provider content, scores, secrets, stack traces, and arbitrary payloads are excluded.

Impressions and mutation events are keyed by the opaque projection identity and event name in session storage, so React re-render, double interaction, or same-session remount does not create false duplicates. Mutation telemetry is emitted only after explicit successful actions; the underlying operation retains its durable server idempotency identity. Telemetry failure never changes the authoritative merchant operation.

## Deterministic fixture harness and tests

`AnalysisFirstMerchantExperienceHarness` renders the actual production component with 16 sanitized local states: confident visual/direct recommendations, ambiguity, accepted directions, single eligible direction, analyzing, essential detail, safe blocker, building, retryable/terminal failure, internal review, preview, legacy fallback, and completed action.

The focused matrix has 40 tests across server service, authenticated routes, real app-host integration, UI components, action locks, E2 binding, commercial Build binding, reload/refetch behavior, failure policy, preview actions, Advanced, all 16 fixtures, accessibility/responsive rules, telemetry, and rendered internal-term leak scanning.

## Security and Core freeze

F1-A contract files are byte-unchanged from `core-2-phase-f1-a-complete`. Frozen Core 2 paths, `apps/theme`, billing semantics, deployment, Shopify configuration, public app surfaces, provider code, and theme-action safeguards are unchanged. No model/API call, Shopify call/write, theme mutation, deployment, or capability activation is part of F1-B.

## F1-C boundary

F1-C requires separate approval. Its bounded scope should activate the runtime flag only in the dedicated embedded staging environment, then perform founder-controlled acceptance for disabled fallback, confident Current and Editorial projections, one-question ambiguity, Build/commercial handoff, reload/recovery, failures, preview actions, Advanced round-trip, telemetry redaction, 390×844 behavior, cross-shop denial, and MAIN/theme-action safety. Activation must stop on any blocker and must not change F1-A/Core policy merely to pass acceptance.
