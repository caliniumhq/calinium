# Calinium Core 2.0 — Phase F1-A Analysis-First Merchant Journey and Visual Briefing Contract

- Status: local contract candidate; disabled; not deployed
- Baseline commit: `2000000000000000000000000000000000000004`
- Baseline tag: `core-2-phase-e5-controlled-staging-go`

## Decision

F1-A defines a simpler merchant presentation over the accepted Core 2.0 system. It does not replace the Creative Director, architecture selection, Merchant Intent, generation, QA, billing, or Shopify theme-action systems.

The approved default journey for a later F1-B activation is:

1. **Analyzing your store**
2. **Building your storefront**
3. **Review your preview**

The experience is analysis-first and recommendation-first. Calinium uses facts already available from Shopify and the project before asking the merchant anything. A confident result produces one plain-language recommendation. A genuinely material E1/E2 ambiguity produces exactly two plain-language direction choices. Paid generation begins only after the merchant explicitly selects **Build my preview**. The live/current Shopify theme remains unchanged until a separate exact theme operation is explicitly authorized.

The F1-A capability is disabled by default. No dashboard route, component, Fly configuration, deployment, or public activation changes in this phase.

## Why the default is changing

The deployed dashboard already has Quick Start and Advanced modes, but Quick Start initially selects its **Chat** destination. The detailed Creative Director retains a long sequence of conversation and approvals. Those controls are useful for exceptions, corrections, and expert work, but they make the primary path feel like setup work before the merchant understands Calinium's recommendation or sees a preview.

F1 changes only the presentation priority:

- analyze existing evidence first;
- state a recommendation before requesting refinement;
- ask one material question only when the frozen E1/E2 policy proves it is needed;
- keep generation and commercial actions explicit;
- make detailed conversation optional through Advanced or post-preview refinement.

## Existing merchant-experience audit

The audit traced the current experience without changing it.

| Current surface | Current role | F1 simplified-path treatment | Explicit merchant action? |
| --- | --- | --- | --- |
| Shopify embedded bootstrap | Authenticates shop/user, maps organization/project, establishes operator authority | Reuse unchanged before projection | Only Shopify installation/authentication boundaries |
| Project creation | Creates the authoritative project binding | Reuse unchanged | As required by existing application behavior |
| Quick Start | Default shell with Chat, Preview, and Review destinations | Later F1-B host candidate; not changed in F1-A | Decisions remain explicit |
| Conversation | Collects missing facts and supports refinement | Advanced by default; compact existing critical question only when mandatory | Only for a material or mandatory unanswered fact |
| Understanding / Brand Blueprint | Reviews inferred and stated merchant intent | Advanced; its saved facts remain authoritative | Corrections and approvals remain explicit where required |
| Store Strategy / preset | Detailed recommendation and storefront-direction approvals | Advanced; E1 frozen selection becomes the source for the visual briefing | Direction input only for proven ambiguity or voluntary pre-freeze adjustment |
| Store Resources | Confirms eligible merchant/Shopify assets and facts | Reused eligibility gate; detailed selection remains Advanced | Material resource confirmations remain explicit |
| Content Plan | Reviews eligible editorial/commerce modules | Reused eligibility gate; detailed editors remain Advanced | Merchant content approvals remain explicit |
| Offer / payment | Creates and verifies the commercial boundary | Reused unchanged | Purchase/payment stays explicit |
| Merchant-generation flow | E3 state machine and E4 durable operations | Reused as the only generation authority | **Build my preview** registers one idempotent start/resume action |
| Progress | Exposes granular generation and QA activity | Projected to one calm Building stage | Retry only when backend authorizes it |
| QA / review pauses | D1, D2.7, and protected founder decisions | Remain internal; merchant sees **Completing final checks** | Founder/operator action stays protected and separate |
| Preview | Shows the authoritative generated result | Becomes the Review stage | Approval/refinement/comparison remain explicit |
| Download / delivery | Provides generated artifact delivery | Retained through existing capabilities, normally Advanced | Download remains explicit |
| Merchant theme action | Applies an exact merchant-authorized operation with target protections | Kept after preview approval and commercial boundary | Always explicit; MAIN/live safeguards unchanged |
| Advanced | Full Creative Director and protected details | Always reachable; never resets progress | Opening it does not approve or start work |

The existing Quick Start projection contains granular decision copy and internal lifecycle concepts. The existing merchant-flow public status can carry revisions, checksums, flow identities, and selection detail. F1-A deliberately introduces a separate allowlisted merchant projection so those values remain server-side.

### Required versus automatic behavior

Safe automatic behavior is limited to bootstrap recovery, store analysis, deterministic projection, evidence reuse, and already-authorized durable recovery. Merchant direction input is required only for material ambiguity or a mandatory fact that cannot be inferred. **Build my preview**, purchase/payment, preview approval, requested changes, download, and any Shopify theme action remain explicit. Internal QA may proceed under its existing operator policies but is never described as merchant approval.

## Contracts

### Analysis-first journey

Contract: `analysis-first-merchant-journey-v1`

The internal journey is a checksum-bound projection derived from the authoritative project binding, Creative Director session, E3 merchant flow, visual briefing, commercial state, preview state, capability set, and theme-action state. It records server-side source provenance and a projection checksum. It is not a state machine and cannot advance the source flow.

Invariants:

- exactly one visible stage at a time;
- deterministic output for identical inputs;
- no fake percent or time remaining;
- no optimistic preview transition;
- retry is available only for an authoritative retryable state;
- internal retries do not create new stages;
- generation, payment, repair, and theme application are never automatic;
- Advanced is always available;
- chat refinement is available only where the current capability supports it.

### Sanitized merchant projection

Contract: `analysis-first-merchant-projection-v1`

The browser-facing projection includes only the stage label, safe status copy, indeterminate/action/complete progress, allowlisted actions, safe direction option copy, up to three safe reasons, the compact essential-detail request when present, preview availability, Advanced/chat availability, and the live-theme reassurance.

It omits project/profile/family identities, candidate scores, margins, Design DNA identifiers, D1/D2.7 terms, provider/model information, attempts, checksums, revisions, lineage, jobs, lease epochs, repair terminology, raw errors, paths, and stack traces. A leak scan rejects rather than redacts an invalid projection.

### Visual briefing

Contract: `merchant-visual-briefing-v1`

The briefing consumes already-authoritative Store Intelligence, Merchant Intent, architecture eligibility/selection, the E2 material-question request/result, saved direction preference, and flow state. It cannot score or select architecture. Its supported states are:

- `analyzing`
- `recommendation_ready`
- `direction_choice_required`
- `essential_detail_required`
- `blocked`
- `accepted`
- `superseded`
- `build_in_progress`
- `preview_ready`

Its source binding and checksum support stable reloads and stale-submission rejection without exposing that provenance to the merchant.

### Direction choice

Contract: `analysis-first-direction-choice-v1`

The choice request binds the current briefing ID/checksum to the current existing E2 material-question ID/checksum and selection outcome. It requires exactly one of exactly two eligible options. Submission maps through the existing `shopping_mode` material-answer contract. It does not write a profile ID, start generation, or store raw merchant text.

An identical duplicate submission converges to the existing submission. A changed, stale, cross-shop, or conflicting submission fails closed. E2 remains responsible for the child Merchant Intent revision, exactly one selection rerun, preventing a second architecture question, and freezing architecture.

### Telemetry

Contract: `analysis-first-merchant-telemetry-v1`

Only the following events are allowlisted:

- `analysis_first_journey_viewed`
- `store_analysis_started`
- `visual_briefing_ready`
- `direction_recommendation_shown`
- `direction_choice_required`
- `direction_selected`
- `recommendation_reason_opened`
- `build_preview_selected`
- `build_started`
- `build_resumed`
- `preview_ready`
- `compare_selected`
- `request_changes_selected`
- `design_approved`
- `advanced_mode_opened`
- `journey_failure_shown`

Events contain a bounded project identifier, capability revision, timestamp, one of the three stage IDs, and aggregate counters/booleans. The builder rejects non-allowlisted input fields. Raw conversation, customer data, screenshots, provider payloads, internal scores, secrets, and stack traces are forbidden.

The contract supports measuring installation-to-analysis time, analysis-to-build-click time, build-click-to-preview time, question count, whether a direction choice was needed, actions before preview, preview-ready rate, retries, Advanced usage, request-changes usage, approval rate, and founder interventions. F1-A adds no third-party analytics.

## Visible-stage mapping

These are presentation stages over the existing E3 states, not replacements.

| Authoritative E3 merchant-flow state | Merchant-visible stage | Safe presentation |
| --- | --- | --- |
| `intake_ready` | Analyzing your store | Analyzing available store information |
| `store_intelligence_ready` | Analyzing your store | Preparing a direction |
| `merchant_intent_ready` | Analyzing your store | Preparing a direction |
| `architecture_selection_running` | Analyzing your store | Analyzing your store |
| `awaiting_material_answer` | Analyzing your store | Two directions or one essential detail, as applicable |
| `architecture_frozen` | Building your storefront | Preparing your design |
| `design_dna_ready` | Building your storefront | Preparing your design |
| `composition_ready` | Building your storefront | Preparing your design |
| `generation_running` | Building your storefront | Building your storefront |
| `artifact_ready` | Building your storefront | Reviewing the result |
| `render_qa_running` | Building your storefront | Preparing your preview |
| `qa_review_required` | Building your storefront | Completing final checks |
| `repair_review_required` | Building your storefront | Completing final checks |
| `preview_ready` | Review your preview | Review your preview |
| `merchant_action_required` | Review your preview | Explicit exact theme authorization remains pending |
| `completed` | Review your preview | Approved action is recorded complete |
| `failed_retryable` | Source stage from prior/history state, otherwise Building | Something needs attention; **Try again** only when permitted |
| `failed_terminal` / `cancelled` | Source stage from prior/history state, otherwise bounded failure stage | Something needs attention; Advanced/support only |

Legacy Creative Director stages map deterministically without migration:

| Legacy stage | Merchant-visible stage |
| --- | --- |
| `landing`, `conversation`, `understanding`, `blueprint`, `strategy`, `preset`, `resources`, `content-plan`, `offer` | Analyzing your store |
| `generation` | Building your storefront |
| `delivery`, `preview`, `finish` | Review your preview |

An exception remains attached to its source stage. It never becomes a fourth stage.

## Recommendation and direction behavior

When the existing frozen selection requires no material question, the briefing shows one recommendation and does not force a two-card choice. Approved labels are:

- **Visual & story-led** — “Immersive imagery, editorial layouts, and discovery through storytelling.”
- **Direct & efficient** — “Clear product access, practical navigation, and faster browsing.”

The internal adapter maps:

- **Visual & story-led** → `image_led`
- **Direct & efficient** → `information_led`

Those internal values and the selected Core 2.0 profile remain server-side. The adapter never bypasses E2 or writes a profile ID.

For material ambiguity, both currently eligible direction cards appear and exactly one must be selected. If only one direction is hard-eligible, an impossible alternative is not shown; the result is a recommendation with a factual explanation. An existing explicit merchant direction is retained and not asked again. It can change only through existing pre-freeze intent-update semantics. Architecture is never silently reselected after freeze.

### “See why”

Reasons come only from the allowlisted mapping of existing selection evidence. The mapping covers compact/broad catalog and collection structure, navigation complexity, usable/strong/limited media, storytelling/discovery/efficiency preferences, density, and explicit direction. Reasons are prioritized deterministically, deduplicated, and capped at three. Missing or unrecognized evidence yields no invented reason. Price and “luxury” are not reason inputs. Arbitrary generated text never reaches the merchant projection.

### Essential-detail exception

If an actually mandatory business fact is unavailable and cannot be inferred, F1 may surface one compact question inside **Analyzing your store**. It must be an existing deterministic critical question with the exact current prompt. Only one appears at a time. This is not a questionnaire; Advanced remains the full correction path.

## Action contracts

### Build my preview

**Build my preview** is available only when all current gates affirm:

- analysis is complete enough;
- direction is resolved;
- architecture is frozen or ready through existing semantics;
- no mandatory fact remains unresolved;
- project/shop authority is valid;
- resource/content eligibility is valid;
- commercial state is known;
- no conflicting active flow exists.

The action binds the project, briefing, and commercial revision into one deterministic idempotency key and delegates to the existing E3/E4 start/resume path. It does not create a second order, flow, job, or pipeline. Analysis completion alone cannot register the action, create a purchase intent/order, execute generation, or begin billable provider work.

### Building-stage status

The only allowlisted progress messages are **Preparing your design**, **Building your storefront**, **Reviewing the result**, **Preparing your preview**, **Completing final checks**, and **Resuming safely**. Internal architecture, Design DNA, artifact, render, objective/visual QA, provider, founder review, lease, and worker details stay server-side.

### Failure and retry

The default error heading is **Something needs attention**. **Try again** is projected only for an authoritative `failed_retryable` flow. Terminal, configuration, authorization, or source-remediation conditions offer Advanced/support, not a false retry. Raw error codes and text never enter the browser projection.

### Preview actions

Only an authoritative preview-ready state can enable:

- **Approve design**
- **Request changes**
- **Compare with current store**

Each can be unavailable when its backend capability/evidence is absent. Comparison requires authoritative current-store and generated-preview evidence, labelled **Current store** and **Calinium preview**. The preview is never called live.

**Request changes** is the entry to optional guided refinement, optional chat, or Advanced. F1-A defines the action only.

**Approve design** records design approval only. It does not publish, activate, replace, or modify a Shopify theme. The permanent sequence remains preview → explicit merchant approval → commercial/theme boundary → exact target authorization → existing target safeguards → operation. Merchant copy can truthfully state: **Your current theme will not change while you review this preview.**

## Advanced and chat

Advanced keeps the existing Creative Director and detailed approvals. Opening or leaving Advanced cannot reset or duplicate the authoritative facts, intent, resources, content plans, flow, preview, paid identities, or actions. Returning to the simple projection is a read of the same state.

Chat is not the default onboarding surface in the later F1 experience. It remains available through Advanced, Request changes, optional refinement, or a genuine nuanced exception. F1-A does not delete, migrate, or modify current conversation UI.

## Reload, resume, and legacy compatibility

Journey, briefing, and direction choice are deterministic checksum-bound projections. The same canonical source data produces the same canonical output. Reload restores the same stage, recommendation/choice, selection, active build, preview readiness, and safe failure state. Bound action IDs and current E2/E3/E4 idempotency prevent duplicate questions, analysis, payment intent/order, generation, or retry.

Existing pre-F1 projects are projected from their current Creative Director/E3 state. No project is destructively migrated or restarted. Legacy detailed work stays available in Advanced.

## Accessibility contract for F1-B

The later UI must provide keyboard-accessible semantic buttons, visible focus, keyboard-selectable direction cards, announced selection and status changes, no color-only meaning, a minimum 40-pixel target height, embedded narrow-width support without required horizontal scrolling, and reduced-motion compatibility. F1-A records and tests these requirements; it does not implement components or styling.

## Activation boundary

- Capability revision: `analysis-first-merchant-experience-capability-v1`
- Flag: `analysis_first_merchant_experience_enabled`
- Default: `false`
- Activation scope: `disabled`

Checkpointing F1-A changes no current behavior. F1-B, if separately approved, may add an explicit dedicated-staging opt-in and UI adapter. Until then Quick Start and Advanced behave exactly as they did at controlled-staging GO.

## Core 2.0 freeze and safety boundaries

F1-A does not modify E1 scoring/policy, E2 question/answer semantics, E3 state transitions, E4 durable jobs, Store Intelligence, architecture profiles/families, Design DNA, composition, generation, storefront rendering, D1, D2.7, founder review, repair, billing, theme authorization, Shopify target safety, dashboard UI, or storefront/theme files.

Automatic repair remains disabled. No provider or Shopify client exists in the F1-A runtime contract. No API/model call, Shopify call/write, theme mutation, billing/distribution change, deployment, Fly change, public-app preparation, merchant invitation, or landing-page work is part of this phase.

## Fixtures and validation

The fixture set contains sixteen synthetic, non-private cases:

- A. confident Visual & story-led recommendation
- B. confident Direct & efficient recommendation
- C. material ambiguity with exactly two choices
- D. saved explicit visual direction
- E. saved explicit direct direction
- F. one hard-ineligible direction
- G. Store Intelligence still analyzing
- H. mandatory fact unavailable
- I. selection blocked
- J. build in progress
- K. retryable failure
- L. terminal failure
- M. internal founder review
- N. preview ready
- O. legacy Advanced project
- P. completed explicit merchant theme action

Focused tests cover the three-stage invariant, full E3 and legacy mappings, byte-stable projections, recommendation/ambiguity/eligibility behavior, allowlisted reasons, essential question reuse, full E2 answer compatibility and freeze semantics, stale/conflicting/duplicate submissions, explicit build/payment/theme boundaries, preview actions, reload/resume, failure copy, internal-term rejection, Advanced/chat behavior, accessibility requirements, telemetry redaction, and unsupported-promise rejection.

The phase validator also enforces the controlled-staging GO tag/commit, main branch, exact file scope, unchanged frozen Core 2.0 paths, disabled capability, schema/fixture validity, lack of provider/Shopify/network execution in runtime contract code, package commands, and focused tests with provider and Shopify credentials removed from the child environment.

Deployment has not started. F1-B has not started.

## Recommended F1-B scope

If approved after this contract review, F1-B should be limited to a dedicated-staging UI adapter and server endpoint that consume the F1-A projections, behind the disabled-by-default capability. It should:

1. preserve the existing authoritative E1–E5 services and endpoints;
2. render exactly the three approved stages in the embedded dashboard;
3. use the bound E2 choice and E3/E4 build actions without recreating them;
4. retain Advanced and current progress across mode switches;
5. implement and test the accessibility contract at Shopify embedded widths;
6. emit only the allowlisted first-party telemetry events;
7. verify no merchant projection leaks internal terms;
8. activate only on dedicated staging after a separate review;
9. run a controlled merchant usability/acceptance pass before any Public Calinium preparation.

It must not change selection, architecture, generation, QA, billing, repair, or theme safety merely to implement the new presentation.
