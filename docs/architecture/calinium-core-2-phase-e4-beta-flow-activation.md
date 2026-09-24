# Calinium Core 2.0 — Phase E4 Beta Flow Activation and Operational Hardening

## Scope

Phase E4 activates the approved `merchant-generation-flow-v1` through the existing Creative Director and Quick Start experiences. It adds no architecture intelligence, profile, repair class, billing behavior, storefront presenter, theme source, or automatic Shopify operation.

Durable beta execution is enabled only when the controlled environment sets `CALINIUM_MERCHANT_FLOW_BETA_ENABLED=true`. This deliberate activation gate keeps E4 out of broad merchant distribution before E5. Without it, the prior paid-generation execution path remains available for existing non-beta deployments; with it, the server requires a frozen merchant flow before purchase and moves generation plus render/QA to durable jobs.

The UI change is deliberately narrow: the existing generation action starts or resumes the server-authoritative flow; the existing review panel shows one merchant question when needed; existing buttons submit, retry, preview, and download; and the existing progress language receives a nine-state merchant-safe projection. Architecture names, profile/family IDs, scores, weights, checksums, render terminology, D1/D2.7 labels, and repair internals remain absent from merchant copy.

## Merchant-visible lifecycle

The 18 internal E3 states project to:

- Analyzing your store
- Understanding your direction
- Designing your storefront
- Building your theme
- Reviewing the result
- Preparing preview
- Action needed
- Ready to preview
- Something needs attention

The only architecture-material question remains:

> When customers shop, should the experience feel more visual and story-led, or more direct and efficient?

The options remain “Visual and story-led” and “Direct and efficient.” A bound answer resumes the same flow. It cannot create a second question, Store Intelligence revision, purchase identity, or flow.

## Durable execution and concurrency

Migration 21 adds two narrow operational tables:

- `merchant_flow_jobs` stores stable generation and render/QA identities, safe payload IDs, state, attempt, lease, bounded failure, and safe result IDs.
- `merchant_flow_operational_events` stores support-safe events and timestamps.

Generation is queued after payment verification rather than held inside the browser request. Artifact completion queues render/QA. The runner claims work atomically, uses a bounded lease, and can reclaim an expired running job after restart. A completed stable identity is reused. A retryable identity is retried in place with an incremented attempt. The existing custom-theme order claim remains the second paid-generation idempotency wall.

Flow mutations use compare-and-swap against the exact prior Creative Director `generation_state`. Two tabs may calculate the same transition, but only one state write wins. Duplicate starts converge on the persisted flow. Stale answers fail safely. Duplicate resumes read the same authoritative state. Server state, not browser state, determines completion.

## Identity and ownership

Every long operation binds the flow, project, organization, and the relevant order/artifact/render/QA IDs. Each flow request rechecks project membership plus the persisted project/shop assignment. A flow whose store assignment no longer matches fails as unavailable. Order and artifact APIs retain their existing project/organization checks, and download also requires the bound order plus `preview_ready`.

## QA and provider-cost boundary

`MerchantFlowStagingRuntime` accepts only an allowlisted non-live target owned by the flow shop. It orders work as render, deterministic D1, then D2.7 only when the injected approved policy requires it. Failed D1 skips D2.7. A completed render/QA job and the flow’s accepted `render_qa` binding are authoritative on reload, so an accepted evaluation is not repeated.

The adapter contains no model client. Automated E4 validation makes zero OpenAI calls.

## Pause and review boundary

`qa_review_required` and `repair_review_required` pause the merchant flow and withhold preview/download readiness. For the first beta, checksum-bound review and the two already-approved bounded repair classes remain founder/admin operated. Automatic repair remains disabled. A repair is never planned or executed by E4.

## Preview and theme-action wall

`preview_ready` means the reviewed artifact may be inspected or downloaded. It never authorizes publishing, activation, replacement, or live-theme writes.

The beta safety contract requires all of the following before even an approved development-theme operation can be considered: `preview_ready`, a separate explicit merchant action, valid payment/approval state, verified ownership, an allowlisted operation scope, and a development/unpublished/demo/staging target. Main/live/published/primary targets fail closed. The existing live Shopify preview adapter remains read-only and only recognizes an already-approved non-live theme; it does not upload or publish.

The invariant remains:

- `automatic_repair_allowed = false`
- `automatic_publish_allowed = false`
- `automatic_theme_replacement_allowed = false`
- `live_theme_mutation_allowed = false`

## Controlled staging acceptance

The E4 acceptance harness uses safe fixture merchant data and a controlled Shopify development target descriptor. It exercises the production job, ownership, non-live target, D1-first, policy-gated D2.7, and flow contracts without publishing or modifying any theme.

The acceptance was also cross-checked against the retained real-Shopify Phase C manifests `render-request-75d31f88138d248861b4` (Current) and `render-request-a018fa3a3f4432900adc` (Editorial): each records a development-theme target, 8/8 passed captures, unchanged source theme, stopped runtime, and cleaned temporary workspace. E4 did not regenerate those screenshots. Its runtime adapter requires the same integrity/cleanup proof before D1 can run.

- Direct Current reaches `preview_ready` with zero material questions.
- Direct Editorial reaches `preview_ready` with zero material questions.
- Ambiguous input shows one question, preserves the flow, freezes from one answer, and reaches `preview_ready`.
- Reload preserves awaiting-answer, generation, QA, and preview identities.
- Duplicate start/enqueue/answer/resume paths produce one authoritative transition or a safe stale response.
- Injected generation, render, and safety failures persist bounded state; retryable work retains identity; live-target failure is terminal.

This acceptance does not claim a live merchant deployment and does not invite beta merchants. E5 must perform final beta verification before invitation.

## Scope evidence

Phase E4 changes dashboard/platform orchestration, schemas, fixtures, tests, and documentation only. It changes no `apps/theme` file, Liquid, storefront CSS/JavaScript, architecture profile/family, Design DNA, preset, billing price/provider semantics, deployment behavior, Shopify application configuration, approval behavior, or merchant content.
