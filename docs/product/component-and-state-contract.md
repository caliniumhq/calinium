# Calinium Component & State Contract

## 1. Purpose

This document is the canonical product architecture contract for Calinium's merchant-facing application components and state.

It answers how the application is organized, which component presents each responsibility, which canonical domain owns each fact or decision, how commands and events move between domains, and how the experience survives streaming, revision, failure, refresh, and responsive transformation.

This is not a React implementation, file tree, API, schema, database, event envelope, or dependency choice. Future implementation must conform to these ownership and state boundaries rather than treating existing component code as authoritative product architecture.

## 2. Governing Product Contracts

This contract remains subordinate to and consistent with:

- [Calinium Customer Journey](customer-journey.md);
- [Calinium AI Creative Director Interaction Design](ai-creative-director-interaction-design.md);
- [Calinium AI Behaviour](ai-behaviour.md);
- [Automatic Merchant Intake](automatic-merchant-intake.md);
- [Recommended Resource Set](recommended-resource-set.md);
- [Calinium Design DNA](design-dna.md);
- [Calinium Recommendation Engine](recommendation-engine.md);
- [Calinium Live Preview Engine](live-preview-engine.md).

Those contracts retain ownership of journey, behavior, intelligence, resources, design, recommendation, and preview meaning. This document defines their UI projection and coordination; it does not reinterpret their truth, approval, payment, generation, or no-write rules.

## 3. Product Philosophy

Calinium should feel calm, immediate, spatially understandable, and continuously alive in the useful sense demonstrated by products such as Cursor, Figma, Replit, and v0. “Alive” means real work appears progressively without blocking the merchant; it never means fake activity or unbounded animation.

The merchant should always understand:

- where they are in the project;
- what Calinium is doing now;
- what changed and why;
- what is Provisional, Approved, stale, Generated, or omitted;
- what needs their action;
- what Calinium will not do automatically.

Conversation leads. Preview makes consequences visible. Decisions explain and route review. The composer keeps collaboration available throughout.

## 4. Contract Scope and Existing Runtime Baseline

This contract covers the persistent project shell, three-area workspace, composer, review and transactional surfaces, state domains, commands, events, revisions, streaming, persistence, loading, errors, recovery, responsive transformations, accessibility, performance, security, and Beta boundaries.

The existing internal Creative Director stages remain authoritative. Quick Start and Guided may hide their detailed navigation, while Advanced exposes their merchant-facing detail. No component architecture deletes Conversation, Understanding, Brand Blueprint, Store Strategy, Preset, Store Resources, Content Plan, Your Theme, Generation, or Delivery services.

The current runtime does not yet implement this architecture. In particular, current Preview UI affordances are not populated by the paid-generation path, the read-only Shopify preview endpoint is separate, and the legacy Preview approval action merely advances interface stage. They are evidence to migrate from, not canonical approval or Preview foundations.

## 5. Architecture Boundaries

The application is one project with several synchronized projections—not several independent workflows.

Permanent boundaries are:

1. Components render state and issue typed merchant commands; they do not own business truth.
2. Canonical domains accept or reject commands server-authoritatively.
3. Domain events describe accepted outcomes; streamed text does not mutate canonical state.
4. Candidate state remains distinct from immutable approval.
5. Payment, generation, Preview, approval, and Delivery are distinct state machines.
6. UI preferences remain non-critical and cannot create business revisions.
7. No client state grants project access, resource authority, approval, payment, or artifact access.
8. No component uploads, installs, publishes, or automatically updates a Shopify theme.

## 6. Layout Architecture

The canonical workspace contains:

```text
Persistent project shell
├── Conversation
├── dominant Preview
└── Decisions

Persistent contextual Composer
Global/domain status access
Overlay root for bounded dialogs and drawers
```

The areas share one project and stable semantic focus targets. Layout changes presentation, not ownership or workflow state. The composer is always reachable when conversation is an eligible action, but it does not cover approval, errors, or transaction controls.

## 7. Desktop Layout

Desktop uses Conversation on the left, dominant Preview in the center, and Decisions on the right. Relational proportions may begin near the governing 28/47/25 exploration model, but exact dimensions remain open pending localization, zoom, embedded-app, and real-content testing.

Each panel has a visible label and bounded independent scroll only when nested scrolling remains understandable. Conversation retains reading position, Preview owns its simulated-page scroll, and Decisions retains expanded groups. The shell itself avoids ambiguous nested scrolling at zoom.

Decisions may collapse to a labelled rail, Preview may expand, and Conversation may enter focus mode. These are UI preferences; none creates or alters canonical decisions.

## 8. Tablet Layout

Tablet or any two-useful-area container uses Conversation and Preview together, with Decisions in a drawer or side sheet. Preview receives the larger share.

A modal drawer traps focus, closes with Escape and a visible control, restores the Review trigger, and ignores background stream events as closure signals. A non-modal sheet remains in normal focus order. Orientation change preserves active surface, draft, conversation position, preview revision/device/scroll, expanded decision group, and generation status.

The transition is capability-based rather than user-agent-based. No arbitrary new breakpoint is fixed by this contract.

## 9. Mobile Layout

Mobile uses three primary destinations:

```text
Chat
Preview
Review
```

Chat, Preview, and Review are tabs or equivalent view switches over one state, not separate workflows. When an order exists, Generation is a contextual status surface or drawer reachable from all three destinations; it is not a fourth peer workflow or tab. The current tab, unsent project-matched draft, preview revision, selected page/device, pending actions, and real generation status survive switching and resume.

The composer remains above the software keyboard and safe area. Critical approval cannot exist only in a badge. Preview receives full usable width instead of a compressed desktop frame.

## 10. Panel Coordination

Panels coordinate through stable semantic entity references and selection state:

| Trigger | Conversation | Preview | Decisions |
| --- | --- | --- | --- |
| Select Preview region | Composer gains optional semantic context | Region receives accessible focus | Related decisions scroll into view |
| Select decision | Offers **Ask Calinium about this** | Related region highlights when available | Card expands |
| Submit refinement | Shows request and accepted interpretation | Keeps last stable view until update | Affected decisions show Updating/Changed |
| Dependency becomes stale | Offers recovery only when useful | Marks affected revision/region stale | Identifies the owning dependency |
| Approval completes | Shows concise confirmation | Transitions only when all underlying owners approve | Displays new authoritative statuses |

Selection and focus never imply approval. A missing visual-to-decision link is stated honestly rather than fabricated.

## 11. Component Tree

The canonical conceptual tree is:

```text
<App>
  <ProjectProvider>
    <CreativeDirector>
      <AppShell>
        <TopBar />
        <ConversationPanel>
          <ConversationTranscript />
          <BottomComposer />
        </ConversationPanel>
        <PreviewPanel>
          <PreviewStatus />
          <PreviewControls />
          <PreviewSurface />
        </PreviewPanel>
        <DecisionPanel />
        <StatusBar />
        <HistoryDrawer />
        <GenerationDrawer />
        <ApprovalDialog />
        <NotificationRegion />
        <ModalRoot />
      </AppShell>
    </CreativeDirector>
  </ProjectProvider>
</App>
```

Names express product responsibilities, not required React filenames, nesting, provider count, or rendering technology.

## 12. Application Shell

**Purpose:** Maintain the stable project workspace and responsive arrangement.

**May own locally:** Active layout mode, shell disclosure, help visibility, and safe exit presentation.

**Renders:** Authorized project identity, mode, save/resume status, current journey outcome, global system status, and transactional status summaries.

**Must never own:** Authentication truth, workflow completion, recommendation, approval, payment, generation, artifact authorization, or Shopify state. The shell coordinates projections; it is not a “God component.”

## 13. Global Header and Journey Status

The header shows Calinium identity, merchant-friendly project identity, mode control, durable save status, generation status when relevant, help, and safe exit. It does not repeatedly expose technical shop identity or old stage navigation in Quick Start/Guided.

Journey status uses outcomes such as **Learning your store**, **Direction ready to review**, **Waiting for approval**, **Generating**, and **Theme ready**. Status is domain-qualified: “Preview ready” cannot imply approval, and “Approved design” cannot imply paid generation.

Primary actions may be summarized here only when the owning surface also exposes their scope and validation. Duplicate controls share one command and disabled/pending state.

## 14. Conversation Panel

**Purpose:** Present collaboration, questions, accepted answers, corrections, concise work status, and recovery prompts.

**Owns locally:** Reading position, selected cross-panel context, collapsed transcript summaries, and jump-to-latest visibility.

**Consumes:** Conversation, Intake question, refinement, and relevant status projections.

**Must never own:** Merchant-profile truth, recommendation, Preview state, resource approval, payment, generation, runtime settings, or raw activity logs.

Conversation remains operable while eligible background work runs. It is not flooded with every internal event.

## 15. Conversation Transcript

The transcript preserves submitted merchant wording, Calinium responses, and concise system-status entries as distinct roles. Corrections append or supersede current intent through revision history; they do not rewrite what was previously submitted.

The transcript may summarize older conversational material for usability, but canonical facts, decisions, and approval provenance remain in their owning domains. System messages never impersonate Calinium or claim progress not confirmed by server state.

Scroll is merchant-controlled. New messages do not force movement when the merchant is reading earlier content; **Jump to latest** becomes available instead.

## 16. Message Components

Message components may present semantic text, one current question, suggested replies, source context when useful, linked decision/Preview context, and scoped error/recovery actions.

They must not embed raw JSON, schemas, runtime IDs, hidden model reasoning, stack traces, secrets, or unrestricted activity logs. A message component cannot approve a decision merely through an inline button unless that button explicitly invokes the owning approval workflow and shows its scope.

Pending, accepted, failed, and superseded message states are visually and accessibly distinct.

## 17. Conversation Composer

**Purpose:** Capture one merchant message, correction, or bounded refinement request.

**Owns locally:** Project-scoped unsent draft, multiline editing state, optional structured URL/attachment presentation where governed, and pending-submit UI.

**Command behavior:** Send creates one idempotent submission command. Empty content cannot send; duplicate send is disabled; failure restores exact editable text. Enter/Shift+Enter behavior is communicated, and touch always has a visible Send action.

**Must never own:** Accepted message status, normalized intent, canonical decisions, direct Preview/DOM changes, or approval. A local draft is never displayed as submitted.

## 18. Suggested Actions and Answer Controls

Suggested replies, **I don't know**, **You decide**, **Skip for now**, **Edit my last answer**, and **Revise direction** are command shortcuts—not independent state.

They resolve through AI Behaviour and Intake rules. **You decide** delegates only eligible reversible creative judgment and cannot cover business identity, audience, sensitive facts, evidence, pricing, payment, generation, installation, or publication.

Selection focus belongs to UI state; the accepted answer and downstream effects belong to their canonical domains.

## 19. Background Work and Status Components

Background-work components summarize real source and operation states: Waiting, In progress, Complete, Skipped, Needs attention, Failed, and Stale.

They may group catalog, collection, media, menu, optional website, recommendation, resource, Preview, and generation work, but each item retains its owning domain and independent recovery. A website failure cannot convert Shopify learning to failed.

No fake percentage, timer, typing animation, or continuous decorative activity is permitted. Completed details collapse quietly; important failures remain discoverable.

## 20. Live Preview Panel

**Purpose:** Present Thinking status and Provisional, Approved, or Generated Preview artifacts.

**Owns locally:** Selected page, device, bounded zoom, scroll, focus mode, and comparison presentation as view preferences.

**Consumes:** Exact Preview revision and merchant-safe provenance from the Preview domain.

**Must never own:** Recommendation, Design DNA normalization, resources, merchant facts, approval, generation, runtime settings, or Shopify mutation. It is a projection, not a shadow editor.

## 21. Preview Surface

The surface renders the current truthful structural, content-aware, resource-aware, design-aware, or Generated representation supplied by the Preview domain.

It preserves the last stable view while a newer revision prepares. Selecting a semantic region creates focus/context only; it cannot edit DOM, Liquid, CSS, Shopify JSON, runtime settings, or canonical records.

If visual rendering fails or is inaccessible, a structural text summary preserves review without blocking otherwise eligible generation.

## 22. Preview Status and Fidelity Labels

Thinking is a work status, not an artifact. Provisional, Approved, and Generated are distinct artifact classes. Updating, stale, failed, and unavailable are qualifiers.

Every Preview shows its state, freshness, page/device context, and merchant-safe revision or generation relationship as text. Generated requires the actual theme rendered from the exact generated package, or another trusted exact-package render. Static illustrations, Markdown reports, internal review packages, ZIP availability alone, and unrelated unpublished-theme URLs cannot be labelled Generated.

## 23. Preview Controls

Controls include Fit, Desktop, Mobile, optional Tablet, page selection, bounded zoom, Reset, refresh, and focus mode where supported.

They are labelled, keyboard-operable, and expose pressed/selected state. Escape exits focus mode and restores its trigger. Browser zoom remains supported independently.

View controls update UI Preference state only. Refresh requests current eligible Preview state; it cannot approve or silently replace a dependency.

## 24. Preview Region Selection

A selectable region exposes semantic purpose, such as Hero or Featured collection, and a stable link to relevant decisions and conversation context.

The selection is a UI preference. It may highlight a region, focus a Decision card, or seed **Ask Calinium about this**. It never creates a design revision or writes runtime configuration.

Keyboard focus and selection provide the same relationship as pointer hover. When no owning decision exists, the interface states that instead of inventing one.

## 25. Decision and Review Panel

**Purpose:** Explain current design, content, resources, pages, claims, omissions, and required actions.

**Owns locally:** Expanded groups, drawer/tab state, scroll, and comparison disclosure.

**Consumes:** Read-only projections and command availability from owning domains.

**Must never own:** Recommendation scoring, approval records, resource bindings, facts, payment, or generation. One surface may orchestrate several approvals but cannot manufacture a universal approval where contracts require separation.

## 26. Decision Groups

Canonical groups are Design, Content, Resources, Pages, Claims requiring confirmation, and Omissions. Groups show status and genuine pending counts, not artificial completion debt.

Claims, stale dependencies, blockers, and consequential review sort ahead of ordinary approved details. Safe omissions remain visible but quiet.

Collapsing or dismissing a group changes presentation only. It cannot resolve a blocker, approve content, or hide a required action from final review.

## 27. Decision Cards

Each card shows merchant-facing name, current choice or omission, domain-qualified status, concise reason, source category, approval requirement, and eligible action.

Cards reference the exact owning entity/revision without exposing database IDs, enum keys, schemas, checksums, runtime names, JSON, or raw scores. **Change**, **Review**, **Confirm**, and **Ask Calinium** issue commands to the owner.

A card never assumes approval from viewing, expansion, positive language, or Preview selection.

## 28. Recommended Resource Set Review

Resource review presents a coherent set plus slot exceptions. Each slot shows recommended assignment, source, reason, fallback, alternatives, staleness, and approval requirement.

**Approve recommendations** may coordinate eligible ordinary assignments through the Resource Set owner. It excludes sensitive evidence, ambiguous or consequential resources, stale assignments, and anything requiring individual confirmation.

The component never reranks, constructs client resource bindings, imports website media, or silently swaps an approved resource.

## 29. Recommendation and Design Review

This surface presents the primary eligible recommendation, meaningful alternatives, preset direction, composition, Design DNA summary, omissions, and merchant-readable reasons.

Recommendation and Design DNA remain separate canonical domains even when summarized together. Exploring an alternative or viewing Preview creates no preset/DNA approval. High confidence means strong recommendation, not automatic approval under unresolved policy.

Advanced may expose bounded details and provenance without raw scoring, unsafe settings, or cross-preset mixing.

## 30. Claims, Evidence, and Omissions Review

Sensitive claims and evidence display exact proposed meaning, source, status, and individual confirmation. They never participate in ordinary bulk approval.

Omissions explain what Calinium deliberately left out and why, without pressuring the merchant to invent content. Missing optional truth is not an error.

The surface cannot infer evidence from imagery, website copy, filename, industry, preset, or model interpretation.

## 31. Final Review and Paid Generation Action

Final Review presents exact approved direction, preset, composition, resources, content, omissions, current blockers, server-authoritative price, generated delivery behavior, and the explicit no-upload/no-publish boundary.

The paid action is visually and semantically separate from design/resource approval. It is disabled unless server-authoritative eligibility passes. Duplicate clicks share an idempotency boundary.

The component cannot set paid state, select newer inputs after pinning, or combine installation/publication consent with generation.

## 32. Generation Progress

Generation Progress projects the durable paid-order run state: waiting, active stage, completed stages, retryable failure, blocked, validation failure, and Ready.

It reports real states only. Progress survives navigation/refresh, uses the same pinned inputs on retry/resume, and prevents duplicate order, charge, run, or completed artifact.

Generation is read-only package creation. No progress stage implies upload, installation, publication, or live update.

## 33. Delivery and Artifact Access

Delivery presents an authorized theme ZIP, merchant-friendly specification/summary, validation result, target/version, safe provenance, instructions, and refinement entry points.

Download commands are project/order authorized. A failed download retries the artifact transfer rather than regenerating or charging. Filesystem paths and internal storage details never enter UI state.

Delivery states clearly that Calinium has not modified the live theme and that the merchant controls installation and publication.

## 34. Component Responsibilities

Every major component contract includes:

- purpose and merchant outcome;
- canonical domains consumed;
- commands it may issue;
- local presentation state it may own;
- responsibilities it must never own;
- loading, empty, error, and recovery behavior;
- responsive transformation;
- accessibility/focus contract;
- analytics boundary.

New components must fit one clear responsibility. Shared visual primitives may be reused, but reuse does not merge semantic source authority.

### Shared shell and overlay contracts

- **Status Bar:** Projects current domain statuses into a concise cross-surface summary. It owns only disclosure and presentation preferences; it cannot advance a domain, synthesize progress, or declare readiness.
- **History Drawer:** Projects the revision graph and available restore actions. Restore is a command to the revision-owning domain; the drawer cannot rewrite history or own undo/redo authority.
- **Generation Drawer:** Projects payment/order and Generation state, including real progress, recovery, and artifact readiness. It cannot create an order, alter pinned inputs, or mark a run successful.
- **Approval Dialog:** Presents the exact revision and consequences supplied by the owning approval workflow, then routes an explicit approve/reject command back to that owner. It cannot create an umbrella approval or infer consent.
- **Notification Region:** Projects domain events and merchant-safe status messages. Dismissal changes presentation only; it cannot dismiss, resolve, or conceal a canonical failure or required action.
- **Modal Root:** Owns overlay stacking, focus containment/restoration, inert background behavior, and Escape handling. It owns no business state and cannot treat closing as approval or cancellation unless an explicit owning-domain command succeeds.

## 35. Component Ownership Rules

1. A canonical entity has one domain owner.
2. Components may cache projections, never competing truth.
3. A component cannot mutate a sibling; it issues a command to the owner.
4. Derived display state is recomputable from canonical state plus UI preferences.
5. Domain status is qualified and cannot imply another domain's status.
6. Local pending state cannot claim server acceptance.
7. Viewing, selection, navigation, resize, and mode change create no business revision.
8. Sensitive, approval, payment, generation, and artifact authority remains server-side.

## 36. Component Communication and Command Flow

Communication follows:

```text
merchant interaction
→ component emits semantic command
→ owning domain validates and persists
→ authoritative result/domain event
→ selectors/projectors update affected components
```

Components share stable semantic references, not copied mutable domain objects. Cross-panel selection uses a UI-focus reference. Business commands identify expected revision and scope.

No component invokes another component's internal mutation method. UI callbacks are command dispatch conveniences, not ownership transfer.

## 37. Event Flow, Ordering, and Idempotency

The canonical product flow is:

```text
Conversation
→ normalized intent
→ Intake/Strategy/Recommendation
→ Design DNA + Resources + Content
→ Preview
→ owning approvals
→ paid order
→ Generation
→ Artifacts
```

Each accepted event is project/entity/revision scoped and idempotent. Older revisions cannot replace newer state. Duplicate events are ignored; sequence gaps trigger authoritative refresh.

An event announces an accepted state transition; it is not a command to fabricate the transition client-side.

## 38. State Architecture

Calinium is revision-driven, never UI-driven.

State is divided into:

- durable canonical business domains;
- durable operational/transactional domains;
- derived read models for components;
- resumable project-matched drafts where safe;
- ephemeral or preference UI state.

Canonical state lives with its authoritative service and persists independently of component lifetime. The client may normalize/cache projections for responsiveness, but cache is disposable and never authority.

## 39. Server-Authoritative and Client State

Server-authoritative state includes project/shop authorization, accepted messages, facts and intent, strategy, preset, recommendation, DNA, resources, content, approvals, order/payment, generation, artifacts, and canonical revision history.

Client state includes unsent draft, active tab, panel disclosure, selection, scroll, device, zoom, focus mode, and transient pending presentation. Some preferences may be safely persisted per project/device.

On conflict, current authorized server state wins. A client draft is compared or restored as a draft; it never overwrites newer canonical state silently.

## 40. Canonical State and View State

Canonical state answers “what is true, proposed, approved, paid, generated, or available?” View state answers “how is the merchant looking at it?”

Examples:

| Canonical | View |
| --- | --- |
| Preview revision and available pages/devices | Selected page/device, zoom, scroll |
| Recommendation candidate and approval | Expanded reason/alternative |
| Resource assignment and staleness | Open slot selector |
| Generation stage | Open Generation drawer |
| Conversation messages | Reading position, collapsed summaries |

View state cannot alter canonical semantics.

## 41. State Domains

The state architecture contains canonical business and operational domains, distributed owner-specific approval records, derived projections, and non-canonical UI preferences. They are classified as follows:

```text
Canonical business and operational domains
Authentication and scope
Project and journey
Conversation
Merchant Intake and Understanding
Store Strategy
Preset
Recommendation
Design DNA
Recommended Resource Set
Content, evidence, and Approved Block Plan
Approved Resource Snapshot
Runtime capability
Preview
Payment and order
Generation
Artifact and Delivery

Federated owner-specific state
Approval records within each owning canonical domain

Derived, recomputable projections
History projection
Notifications/status projection

Non-canonical presentation state
UI preferences
```

Each canonical domain defines purpose, owner, persistence, dependencies, lifecycle/events, failure/recovery, and visibility. Approval is federated because each owning domain approves its own exact revision; there is no competing global approval truth. History and notification/status projections are rebuilt from authoritative records and events. UI preferences affect presentation only. Grouped sections below do not merge ownership.

## 42. Project and Journey State

**Purpose:** Identify the authorized project and current merchant journey outcome.

**Owner/persistence:** Existing authentication, canonical shop, project, and Creative Director session owners; durable server state.

**Dependencies:** Organization membership, canonical shop connection, internal stage guards, and current domain readiness.

**Lifecycle/events:** Created, resumed, mode/viewed, outcome advanced, blocked, recovered, completed. Advancement follows guards, not client route selection.

**Failure/recovery/visibility:** Authorization failure blocks safe access without revealing other projects. Resume returns the last durable outcome. Quick Start/Guided show merchant outcomes; Advanced may show detailed stages.

## 43. Mode State

Quick Start, Guided, and Advanced are presentation modes over one project. Mode state controls disclosure and review density, not validation, safety, recommendation, approval, or generation rules.

Mode preference may persist per project/device. Switching creates no canonical business revision and cannot hide pending approvals or overwrite detailed Advanced changes.

During payment or modal approval, switching waits for safe completion/cancellation. During generation, mode may change presentation but cannot edit pinned inputs.

## 44. Conversation and Intake State

### Conversation domain

**Owns:** Accepted messages, roles, current question, correction relationships, submission status, and conversation-local pagination position. Unsent draft is separate project-matched client state. Cross-domain streaming subscription cursors belong to the streaming transport projection described in Sections 57–58, not to Conversation.

**Lifecycle:** Draft → pending submission → accepted or failed; accepted correction creates history rather than rewriting prior text.

### Intake/Understanding domain

**Owns:** Facts, preferences, observations, interpretations, unknowns, conflicts, confidence, source, questions remaining, and profile/strategy candidates. Store Strategy remains its own candidate/approval owner.

Both are durable, project-scoped, and recover independently. Conversation never directly declares normalized fact; Intake never edits transcript. Failure preserves the other domain and scopes retry to the affected source.

## 45. Recommendation and Design DNA State

### Recommendation domain

**Owns:** Eligible primary direction, zero-to-two alternatives, composition, reasons, confidence, omissions, fallbacks, candidate revision, and approved revision.

### Preset domain

**Owns:** Preset candidate and explicit immutable preset approval under current policy.

### Design DNA domain

**Owns:** Bounded preset-contained dimensions, confidence, provenance, compatibility, candidate, and approved revision. Pre-preset visual tendencies are not approved DNA.

The domains depend on approved/current upstream inputs but never merge. Recommendation coordinates; it does not normalize DNA or approve Preset. Failure/staleness invalidates only dependent candidate outputs, while prior approved history remains.

## 46. Resource and Content Plan State

### Recommended Resource Set domain

**Owns:** Eligible assignments, ranking, alternatives, fallback, omission, confidence, set approval status, availability observations, set revision, and staleness. It references—but does not own or accept from the client—the immutable Approved Resource Snapshot created at approval.

### Content/evidence domain

**Owns:** Candidate content, exact factual meaning, evidence links, individual sensitive confirmation, composition candidates, immutable Approved Block Plan revisions, and their references to the matching Approved Resource Snapshot. It does not create a second snapshot model.

### Approved Resource Snapshot domain

**Owns:** The one server-resolved, project/shop-scoped immutable snapshot of exact approved resource bindings, resource revisions, approval lineage, integrity, and availability at approval time. The snapshot owner creates or reuses it only through the authoritative approval workflow; Resource Set and Approved Block Plan revisions reference its identity, and paid orders pin that same identity. Clients and presentation components may consume safe status projections but cannot submit, mutate, rerank, or replace snapshot contents.

### Runtime capability domain

**Owns:** Versioned, read-only knowledge of currently supported theme targets, sections, blocks, settings, compatibility constraints, and generator capabilities. Recommendation, Preview, approval validation, and Generation consume the same resolved capability version. A missing or incompatible capability blocks only dependent candidates or operations; components cannot mutate capabilities or create UI-only support.

Resource assignment does not approve content meaning; content approval does not rerank resources. Both persist server-side with project/shop scope and immutable histories. A stale resource cannot be silently replaced; a missing optional claim/content is omitted.

## 47. Preview State

**Purpose:** Represent current canonical decisions visually.

**Owner/persistence:** Live Preview Engine; derived revision referencing exact inputs. Provisional may be superseded; Approved and Generated are immutable. Thinking and stale/failed/updating are status qualifiers.

**Dependencies:** Recommendation, Preset, DNA, Resources, Content, runtime capability, and for Generated, paid-order artifacts.

**Events:** Started, revision created, region updated, ready, stale, failed, recovered, generated representation ready.

**Failure/recovery/visibility:** Retain last stable view and structural text fallback. Visual failure alone does not invalidate otherwise eligible generation. UI preferences select page/device but do not live in this canonical domain.

## 48. Approval State

Approval is owned separately by each canonical domain. It is explicit, informed, scoped, attributable, current, revision-specific, immutable, and server-authoritative.

The UI may orchestrate owning workflows but cannot create one umbrella approval when preset, resource, sensitive content/evidence, design, payment, or generation consent must remain separate.

Lifecycle is Candidate/Needs review → approval request → Approved or Rejected/Revision requested → Stale/Superseded when dependencies change. Viewing, silence, Preview interaction, mode switch, and payment never infer approval.

Failure creates no approval. Recovery revalidates current revision and prevents duplicates.

## 49. Payment, Order, and Generation State

### Payment/order domain

**Owns:** Offer, price, order identity, idempotency, payment status, exact approved-input pinning, cancellation/failure, and retry eligibility.

### Generation domain

**Owns:** Generation eligibility, queue/run identity, pinned inputs, real stages, warnings, validation, failure/retry/resume, and Ready status. It owns artifact references as outputs, not artifact storage/access authority.

Payment success does not imply generation completion. Generation never reads newer project state after pinning. Both persist server-side and recover without duplicate charge/run.

## 50. Delivery and Artifact State

**Purpose:** Expose validated generated outputs safely.

**Owner/persistence:** Artifact/Delivery service tied to project, paid order, generation, storage integrity, and retention policy.

**Owns:** Safe artifact identity, type, availability, validation summary, checksum/integrity internally, download authorization, target/version, and expiry/retention status. It never exposes filesystem paths.

**Lifecycle/events:** Preparing → available → download requested/completed/failed; unavailable/corrupt triggers controlled recovery. Download retry does not regenerate.

**Visibility:** Merchant-safe ZIP/specification/report/manifest details and manual-install guidance only.

## 51. View Preference and Ephemeral State

This domain owns nothing business-critical. It may include:

- active responsive destination/panel;
- panel collapse/size where supported;
- selected Preview page/device, zoom, scroll, focus mode;
- expanded Decision groups and alternative disclosure;
- Conversation reading position and project-matched unsent draft;
- open drawer/dialog and focus-return target;
- dismissed non-critical notification presentation;
- theme/layout preference where product-approved.

Preferences may persist per project/device when safe. They are discarded or compared on mismatch and never create revisions, resolve blockers, approve, pay, generate, or grant access.

## 52. State Lifecycles

Every domain defines states and transitions independently. Shared words are qualified:

- Conversation accepted;
- Intake current;
- Recommendation approved;
- Resource Set stale;
- Preview Provisional;
- Payment paid;
- Generation Ready;
- Artifact available.

One word cannot promote another domain. The project derives merchant journey outcomes from a validated combination of domain states rather than a mutable “current step” flag.

## 53. State Transitions and Guards

Transitions occur only after owning validation. A command includes expected project/entity revision and intent. The owner verifies authorization, scope, current version, eligibility, dependencies, and idempotency before accepting.

Guards include truth, evidence, resource currency, compatibility, accessibility, runtime capability, approval, payment, and paid-order pinning as applicable.

Rejected transitions leave canonical state unchanged and return merchant-safe recovery. The UI never advances optimistically into Approved, Paid, Generated, Validated, or Ready.

## 54. Revision Model

Canonical editable domains follow:

```text
candidate revision
→ merchant/system correction
→ child candidate
→ explicit approval
→ immutable approved revision
```

Revisions retain identity, parent lineage, source/version references, affected dependencies, provenance category, and status. Rendering, resize, selection, mode change, refresh, and retry with identical outcome create no business revision.

Approved historical revisions and paid-order pins are never edited or reinterpreted in place.

## 55. Staleness and Dependency Invalidation

A dependency graph links facts, strategy, preset, recommendation, DNA, resources, content, Preview, approval readiness, orders, and generation without merging ownership.

Consequential source change marks only dependents stale. It preserves unrelated messages, facts, resources, approvals, Preview regions, and history. Existing paid orders and Generated artifacts remain pinned historical truth.

Stale state is explicit and cannot silently consume “latest.” Recovery recalculates affected candidates and routes necessary review.

## 56. Partial Update Boundaries

Updates follow semantic dependencies:

| Change | Recalculate/update | Preserve |
| --- | --- | --- |
| Hero media | Resource role, hero presentation, affected Preview region | Audience, unrelated content, footer |
| Brand personality | DNA, preset/recommendation compatibility, affected Preview | Shopify product identity |
| Product deleted | Resource slot and sections using it | Unrelated strategy and content |
| Preview device | View preference/render context | All canonical decisions |
| Payment status | Order/final-action/progress surfaces | Approved inputs |

Components receive new projections for affected entities only. Full-application reset or full Preview regeneration after every change is prohibited.

## 57. Streaming

Streaming may update Conversation status, background work, Preview, Decisions, generation progress, and global status. It projects accepted server-authoritative events; it does not parse free-form streamed text into canonical Recommendation, DNA, Resource, approval, or payment state.

Transport remains open. Any solution must be authenticated, ordered, resumable or refreshable, project/entity/revision scoped, idempotent, and bounded.

Streaming never steals focus, forces scroll, floods live regions, displays fake progress while disconnected, or blocks unrelated UI.

## 58. Streaming Event Lifecycle

Conceptual lifecycle:

```text
server accepts work
→ emits scoped event with sequence/revision
→ client validates scope and order
→ domain projection updates
→ affected selectors rerender
→ meaningful milestone optionally announced
```

Duplicate event IDs are ignored. Older revisions cannot replace newer state. Gaps trigger authoritative refresh. Reconnect resumes from a cursor when supported or loads current state before subscribing.

An event may mark a task failed without failing unrelated domains. Client retry does not restart server work unless an explicit retry command accepts it.

## 59. Persistence, Resume, and Rehydration

Refresh/resume restores authoritative project, conversation, Intake, Strategy, Preset, Recommendation, DNA, Resources, Content, approvals, Preview revision, payment/order, generation, artifacts, and revision history.

Then safe UI preferences restore only when project/device and expected revisions match: draft, selected page/device, tab, panel, scroll, zoom, and disclosure.

Rehydration order is server state → reconcile local draft/preferences → establish streams → resume pending display. It never replays an unbounded history or creates duplicate records.

## 60. Loading

Loading is domain- and operation-scoped, never one application-wide boolean.

Examples include Thinking, Analyzing Shopify, Learning brand context, Preparing recommendation, Updating resources, Preparing Preview, Confirming payment, Generating, Validating, and Preparing download.

Last stable content remains visible where truthful. Loading one domain does not block Conversation or unrelated review. Full-screen blocking is reserved for authentication/project state that genuinely prevents all safe work.

No fake progress, timer, percentage, or premature completion label is allowed.

## 61. Errors and Recovery

Every domain classifies errors as Recoverable, Retryable, Blocking, or Fatal for the current operation—not necessarily the whole project.

Merchant-facing errors answer: what happened, what remains safe, what action is available, and whether work was saved. They never expose stack traces, schemas, tokens, paths, secrets, or cross-project existence.

Recovery is scoped and idempotent: retry source, reconnect Shopify, choose another approved resource, omit optional content, restore last stable Preview, verify payment, retry generation, or redownload artifact. It never silently substitutes data or weakens validation.

## 62. Undo

Undo is a command against editable canonical candidate history. It restores the prior eligible candidate state through the owning domains and creates the appropriate current candidate projection.

It can affect recommendation, DNA, content, or resource candidate changes only within the eventually approved scope. UI preference undo, if offered, remains separate.

Undo never edits immutable approvals, snapshots, paid-order pins, charges, generation runs, Generated Preview, or artifacts. Exact global versus refinement-scoped behavior remains open.

## 63. Redo

Redo reapplies an eligible undone candidate transition when its dependencies remain current. It is validation-aware, not a blind replay of UI mutations.

If source revisions, compatibility, or approvals changed, Redo explains the conflict and creates no invalid state. A new branch after Undo may invalidate the old redo path while preserving history.

Redo never replays payment, generation, download, upload, installation, publication, or other irreversible/transactional operations.

## 64. Responsive Behaviour

Responsive transformation maps one state to Desktop three-panel, Tablet two-area-plus-drawer, and Mobile destinations. Components may change container, disclosure, ordering, or density while preserving semantic reading and canonical state.

DOM/focus order follows Conversation → Preview → Decisions where all are present. Mobile tabs expose equivalent content without mounting a duplicate business workflow. Critical actions and errors remain reachable.

Resize and orientation preserve project-matched drafts, selections, Preview context, pending approval, and generation status. Long translations, RTL, large titles, browser zoom, and software keyboard cannot hide controls.

## 65. Accessibility

The component architecture targets WCAG 2.2 AA.

- Shell and major areas use labelled landmarks.
- Tabs, drawers, dialogs, accordions, toolbars, status regions, and separators use complete accessible patterns.
- Status and ownership never rely on color.
- Every pointer/drag/gesture action has a keyboard/button equivalent.
- Modal focus is contained and restored; non-modal surfaces do not trap focus.
- Streaming and rerendering do not steal focus or force scroll.
- A restrained polite live region announces meaningful milestones only.
- Reduced motion, contrast, touch targets, text resize, 200%/400% reflow, RTL, and screen-reader summaries are supported.

## 66. Performance

Conversation input remains responsive while Intake, Recommendation, Preview, and Generation work runs.

The architecture uses domain selectors and dependency-scoped projections so one event does not rerender the entire application. Preview updates partially; heavy media loads lazily and responsively; hidden surfaces avoid continuous work; large stores paginate/virtualize; stale work is canceled/superseded; streamed events are coalesced; histories and caches are bounded.

Concrete budgets require measurement. Performance optimization cannot bypass canonical validation, truth, accessibility, or state ownership.

## 67. Security

Every canonical read, command, event, and artifact request is authenticated, authorized, project-scoped, canonical-shop-scoped, and expected-revision-scoped. Browser IDs are locators only.

UI state never contains access tokens, session secrets, client secrets, encryption keys, private Admin data, customer data, raw snapshots, caller-controlled approvals/checksums, filesystem paths, or cross-project metadata.

Components cannot weaken authorization, resource scope, approval, paid-order pinning, artifact access, or read-only generation. Preview/forms/cart/search are side-effect-free in Beta. No automatic Shopify upload, installation, publication, or update is permitted.

## 68. Analytics

Conceptual events may include:

```text
surface_viewed
conversation_message_submitted
recommendation_viewed
preview_updated
decision_opened
approval_action_started
approval_completed
generation_started
generation_completed
artifact_downloaded
undo_requested
redo_requested
preview_device_changed
preview_page_changed
journey_resumed
```

Server-confirmed outcomes produce authoritative approval/payment/generation events. Analytics never becomes application state and never changes recommendations.

No merchant message content, resource payload, sensitive claim/evidence, screenshot, customer data, token, private URL, raw ID, snapshot, or chain-of-thought is collected.

## 69. Beta Scope

Beta requires the components and state needed for:

- authenticated project shell and resume;
- Conversation and composer;
- background Intake status;
- Recommendation/Design review;
- Recommended Resource Set review;
- Homepage Preview with Desktop/Mobile, revision, staleness, and partial update;
- a distinct Generated Preview representation tied to the exact validated generated output, while its renderer remains an explicit implementation decision;
- Decisions, ordinary combined review, and separate sensitive approval;
- final review and explicit paid generation;
- real generation progress and retry/resume;
- authorized ZIP/report download and manual-install guidance;
- responsive, accessible, performant, secure, project-scoped operation.

Advanced comparison tooling, Tablet Preview, multi-user collaboration, full Theme Editor replacement, arbitrary code editing, real cart/checkout Preview, automatic installation/publishing, and support beyond current Calinium One 1.0 capabilities are not required.

## 70. Anti-Patterns

Reject:

- God Context or one massive global store;
- UI-owned business logic or client-declared truth;
- duplicated canonical state across components;
- direct sibling/component mutation;
- Preview-only decisions or free-form DOM mutation;
- generic global loading/error flags;
- manual synchronization between panels;
- random refreshes and full-app resets;
- streamed text changing Recommendation directly;
- hidden, umbrella, or navigation-implied approvals;
- treating one domain's Approved/Ready as another's;
- local preferences creating revisions;
- DOM-based undo/redo;
- stale local state overwriting server state;
- exposing secrets, snapshots, runtime internals, or paths;
- fake progress, nested loading chaos, or focus-stealing updates;
- automatic Shopify mutation, upload, installation, publication, or update.

## 71. Open Product Decisions

These remain unresolved:

### Layout and component boundaries

1. What exact first-screen composition is shown before Preview and Decisions are ready?
2. What desktop proportions and minimum Preview width pass localization, zoom, and embedded-app testing?
3. Does Decisions default open or collapsed, and are panels fixed or accessibly resizable?
4. What exact container threshold produces Tablet and Mobile transformations?
5. Which cross-panel focus references persist, and for how long?

### State and persistence

6. Where are unsent drafts, scroll positions, panel sizes, alternative Preview, and device/page preferences persisted?
7. What exact pre-preset tendency → preset candidate → preset-contained DNA → approved DNA → Preview revision lifecycle is canonical?
8. How are Markets, locales, B2B audiences, and regional catalogs represented across one project and revision graph?
9. What dependency/materiality threshold triggers full rather than partial recalculation/rerender?
10. Does stale-resource refresh prepare a candidate automatically or await explicit reranking?

### Interaction and review

11. Can Quick Start combine preset/DNA acceptance with another explicit approval event?
12. Which Medium-confidence ordinary decisions may join combined review?
13. Is confidence visible, how many alternatives appear, and how much explanation is default?
14. What is the safe boundary for **You decide**?
15. Is undo/redo scoped to a refinement, whole current candidate, or project history?

### Preview and transport

16. What exact renderer and fidelity/parity contract serves Provisional, Approved, and Generated Preview?
17. When does first Preview appear, and what content/resource/DNA readiness is required?
18. May non-approved recommended resources appear as real Provisional content?
19. Which Preview pages/devices, links, simulation, alternatives, and comparison enter Beta?
20. Which authenticated resumable streaming transport and cursor model fits the server architecture?

### Measurement and future scope

21. What measured performance, memory, accessibility, and fidelity thresholds become Beta gates?
22. How much rationale accompanies accessibility-driven constraints?
23. What website-analysis consent, screenshot/resource retention, and import behavior is allowed?
24. When and where is the optional subscription introduced?
25. How may future cross-project preference learning be consented, viewed, and cleared?

No open decision may be answered silently through component convenience.

## 72. Implementation Readiness

This contract is ready to govern the Conversation Engine product contract and later technical architecture. It defines the canonical shell, component tree, component responsibilities, independent state domains, commands/events, revision graph, staleness, partial updates, streaming, persistence, recovery, responsive transformations, accessibility, performance, security, and bounded Beta scope.

Before implementation, technical architecture must map each conceptual component to existing or new surfaces without creating a second source of truth; define selectors/read models and typed command boundaries; select an authenticated resumable event transport; define persistence tiers and concurrency; and resolve or explicitly preserve the open decisions.

Implementation must demonstrate that component unmounting, responsive transformation, stream reconnect, Preview failure, mode change, and browser refresh cannot lose canonical work, duplicate transactions, weaken approvals, expose private data, or mutate Shopify.

**Readiness: Ready for Conversation Engine**
