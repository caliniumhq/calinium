# Calinium Core 2.0 — Phase E3 End-to-End Merchant Flow Orchestration

## Milestone boundary

Phase E3 connects the approved intake, intent, architecture, generation, render/QA, human repair, and merchant-action systems through one deterministic and resumable lifecycle. It adds sequencing and provenance; it does not add intelligence, a storefront architecture, a repair class, a merchant UI, a billing behavior, or a theme mutation capability.

The authoritative contract is `merchant-generation-flow-v1`. Its record is checksum-bound and stored inside the existing Creative Director session `generation_state.merchant_flow`. That is the narrowest durable boundary already shared by conversation, generation, paid snapshots, and delivery. No database migration or parallel workflow store is introduced.

## Versioned state machine

The contract defines 18 explicit states:

1. `intake_ready`
2. `store_intelligence_ready`
3. `merchant_intent_ready`
4. `architecture_selection_running`
5. `awaiting_material_answer`
6. `architecture_frozen`
7. `design_dna_ready`
8. `composition_ready`
9. `generation_running`
10. `artifact_ready`
11. `render_qa_running`
12. `qa_review_required`
13. `repair_review_required`
14. `preview_ready`
15. `merchant_action_required`
16. `completed`
17. `failed_retryable`
18. `failed_terminal`

Each mutation is an allowed event in the transition registry. A transition increments the flow sequence, records its source state, destination state, event, and timestamp, and recomputes the whole-flow checksum. State is never inferred from a dashboard page or visual stage.

The normal path is:

`intake_ready → store_intelligence_ready → merchant_intent_ready → architecture_selection_running → architecture_frozen → design_dna_ready → composition_ready → generation_running → artifact_ready → render_qa_running → preview_ready`

The ambiguity branch pauses at `awaiting_material_answer`. QA can pause at `qa_review_required` or `repair_review_required`. Explicit merchant authorization moves `preview_ready` to `merchant_action_required`; only a separately reported completed operation moves the flow to `completed`.

## Stable identity and provenance

The flow ID is content-derived from the project, organization, conversation revision, store-context checksum, and creation time. Every flow retains:

- project, organization, conversation, and store-context identity;
- complete validated Store Intelligence plus its revision and checksum;
- complete Merchant Intent plus parent revision and checksum;
- the E1 selection outcome and, if used, the E2 question and answer revisions;
- the frozen architecture-selection revision and reason codes;
- Design DNA and composition revision/checksum bindings;
- one paid order and immutable snapshot identity;
- the active generation identity and generated artifact identity/checksum;
- real-render, D1, D2.7, and human-review evidence;
- bounded repair class/evidence when applicable; and
- merchant authorization and operation-completion state.

`flowProvenanceSummary` provides the internal inspectable audit object. The merchant-facing status deliberately omits profile IDs, architecture family names, candidate scores, weights, and reason codes. No public `inspect` route exposes internal selection details.

The generation metadata manifest receives the safe internal flow provenance summary. The storefront runtime JSON does not receive the flow, raw merchant answer, internal scores, or question text.

## Store Intelligence and Merchant Intent

The server reads the latest authoritative usable or partial Merchant Intake revision once when a new E3 flow starts. `createStoreIntelligenceContract` validates and freezes that evidence for the selection cycle. Reload, pause, answer, paid snapshot creation, generation retry, and render retry all reuse it. A deliberate new intake cycle remains a separate revision and does not rewrite an existing flow.

The existing `merchant-intent-v1` builder combines the approved Creative Brief and Store Strategy with the frozen Shopify facts. Inferred facts remain distinguishable from explicit merchant answers and preferences. The flow rejects a Merchant Intent whose inferred facts do not cite the pinned Store Intelligence revision.

## E1 selection and E2 clarification

E3 invokes `architecture-selection-policy-v1` in `automatic_beta` mode.

- A decisive Current or Editorial result freezes immediately and asks zero architecture questions.
- `material_question_required` creates the approved E2 `shopping_mode` request, persists it, consumes the one-question allowance, and moves the flow to `awaiting_material_answer`.
- A reload returns the same question ID without marking it for redelivery.
- A valid answer is provenance-checked and normalized by E2, creates a child Merchant Intent, preserves Store Intelligence byte-for-byte, reruns E1 exactly once with further material questions disabled, and freezes Current or Editorial.
- Conflicting or insufficient input stays unresolved. The flow does not guess and cannot ask a second architecture question.
- Invalid or incompatible selection evidence fails closed.

The merchant-facing wording remains:

> When customers shop, should the experience feel more visual and story-led, or more direct and efficient?

## Architecture, Design DNA, and composition gates

`architecture_frozen` is a hard prerequisite for Design DNA binding. `design_dna_ready` is a hard prerequisite for composition binding, and `composition_ready` plus a paid identity are prerequisites for generation.

The existing custom-theme service consumes the flow's frozen architecture instead of selecting again whenever an E3 flow is present. Existing Design DNA, preset, Approved Block Plan, and D3C-B content-eligibility systems remain unchanged. The composition revision binds the architecture selection, approved composition inputs, and `theme-generator-content-eligibility-v1`. No downstream system can reselect architecture.

The E3 server API starts or resumes the flow before a beta client asks for paid generation. The existing legacy flow remains unchanged until that minimal beta client wiring is enabled; E3 does not silently force a new question into the current merchant UI.

## Paid boundary and retry behavior

Clarification occurs before order creation in the E3 lifecycle. Therefore a material-question pause does not initialize billing or a generation attempt.

Once an order exists, the flow binds its order ID and purchase-intent checksum. Payment verification enriches the same binding with the immutable snapshot ID/checksum. A different order, purchase intent, snapshot ID, or snapshot checksum is rejected. Existing billing amount, provider, idempotency, verification, and retry semantics are not modified.

Generation interruption can resume the same active generation ID. A failed existing custom-theme generation attempt may create the normal next attempt ID, but it remains inside the same merchant-flow ID and must reuse the same paid order/snapshot, frozen architecture, Store Intelligence, Merchant Intent, Design DNA, and composition. Render/QA retry reuses the same artifact.

## Artifact, render, and QA orchestration

The standard read-only custom-theme generator remains the artifact producer. The flow verifies that the artifact cites the active generation ID before it advances to `artifact_ready`.

The dashboard service accepts the approved controlled render/QA worker through `merchantFlowRuntime.runRenderQa`. This is an asynchronous server boundary, not model logic inside the state machine. A worker receives the checksum-valid flow and artifact, invokes the real non-live Shopify render harness, runs authoritative D1, and supplies stabilized D2.7/human-review status where required. Automated E3 tests use deterministic injected results and make no API calls.

- passed render + D1/D2.7 gates → `preview_ready`;
- subjective or objective review required → `qa_review_required`;
- a human-reviewed eligible finding → `repair_review_required`;
- render or QA interruption → `failed_retryable`, retaining the artifact for retry.

`preview_ready` requires frozen architecture, Design DNA, composition, paid identity, generated artifact, successful controlled rendering, and all required QA/human decisions. Merely generating a ZIP cannot produce `preview_ready`.

## Human repair boundary

The only admitted repair classes are the two proven beta classes:

- `responsive_layout`
- `generated_content_eligibility`

E3 can preserve an authoritative finding, review decision, and bounded repair result. It cannot plan, invent, approve, or execute a repair. A repair resolution reaches `preview_ready` only when it records explicit human approval, passed post-repair QA, checksum-bound evidence, and `automatic_execution: false`.

`automatic_repair_allowed`, `live_theme_mutation_allowed`, and `automatic_publish_allowed` are invariantly `false` and are revalidated on every transition.

## Merchant action boundary

`preview_ready` means the approved artifact is eligible for the existing controlled preview/download flow. It never means publish, apply, replace, or activate a Shopify theme.

Only explicit merchant authorization can produce `merchant_action_required`. Only a separately executed and reported theme operation can produce `completed`. The flow has no Shopify write or publish primitive, and operation completion is rejected before authorization.

## Failure and recovery model

The contract distinguishes:

| Category | Recovery |
| --- | --- |
| `stale_provenance` | reject stale request; reload checksum-valid state |
| `store_intelligence_unavailable` | retry after authoritative intake becomes usable |
| `architecture_selection_failed` | terminal fail-closed selection cycle |
| `unresolved_merchant_answer` | preserve same question; await a clear answer; never ask a second question |
| `generation_failed` | retry normal generation inside the same paid flow |
| `shopify_render_failed` | retry render/QA with the same artifact |
| `qa_failed` | retry approved QA path or require review |
| `review_required` | wait for checksum-bound human decision |
| `repair_declined` | remain stopped; no automatic alternative |
| `repair_failed` | retry only through the existing human-controlled repair lifecycle |
| `merchant_action_not_authorized` | wait for explicit merchant action |

Serialized flows validate their schema, checksum, state prerequisites, nested contracts, input bindings, safety flags, and history alignment before resume. Resume never recreates Store Intelligence, Merchant Intent, question, selection, paid identity, Design DNA, composition, or artifact.

## Controlled proofs

The deterministic E3 fixture and tests prove:

- Direct Current: `commerce_dense_store` freezes Current, asks zero questions, and reaches `preview_ready`.
- Direct Editorial: `image_led_editorial_store` freezes Editorial Discovery, asks zero questions, and reaches `preview_ready`.
- Ambiguous → Current: one information-led answer creates one child intent, executes one E1 rerun, freezes Current, and reaches `preview_ready`.
- Ambiguous → Editorial: one image-led answer creates one child intent, executes one E1 rerun, freezes Editorial, and reaches `preview_ready`.
- Pause/resume: serialized `awaiting_material_answer` returns the same flow and question, then resolves once without a duplicate identity.
- Retry: architecture-frozen and generation-interrupted flows resume without reselection or requestion; generation and render failures reuse the pinned paid and artifact inputs.
- QA/repair: QA pauses for human review, automatic repair remains false, and the approved D3 repair-state evidence can resolve the same flow to `preview_ready`.
- Merchant action: preview remains unapproved for any Shopify theme operation until a separate explicit authorization.

## Server and UI integration

`MerchantGenerationFlowService` is created with the existing dashboard services and shares project membership, session, Store Intelligence, and custom-theme services. Authenticated project routes provide:

- `POST /api/projects/:id/merchant-generation-flow/start`
- `GET /api/projects/:id/merchant-generation-flow`
- `POST /api/projects/:id/merchant-generation-flow/answer`
- `POST /api/projects/:id/merchant-generation-flow/resume`

Mutations retain existing CSRF protections. Status is merchant-safe. The full provenance summary remains an internal service capability rather than a merchant endpoint.

No merchant UI file changes in E3. Minimal beta wiring still required is limited to calling `start` before the paid action, rendering the returned generic material question, posting its bound answer/checksum, calling `resume` after a reload, and mapping flow status to the existing progress/preview surfaces. No visual redesign is required.

## Safety and scope summary

- architecture profiles: exactly two existing profiles
- new repair classes: zero
- automatic repair: false
- automatic publish/apply/replace: false
- live merchant theme mutation: false
- merchant UI changes: zero
- storefront Liquid/CSS/JavaScript changes: zero
- billing/deployment configuration changes: zero
- paid model/API calls in E3 validation: zero

The recommended next milestone is **Phase E4 — Beta Flow Activation and Operational Hardening**: add the minimal existing-UI wiring, bind a production-controlled render/QA job adapter and queue recovery, add concurrency/idempotency and operational telemetry tests, and run a non-live staging acceptance flow. It must not expand architecture, repair, billing, or theme-mutation scope without separate approval.
