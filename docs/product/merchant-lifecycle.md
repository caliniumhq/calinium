# Calinium Merchant Lifecycle

## 1. Purpose

This document is the canonical product contract for how a merchant enters, progresses through, leaves, resumes, completes, and returns to Calinium. It connects the merchant-facing AI Creative Director experience to the durable identities, revisions, approvals, orders, generations, artifacts, and recovery behavior that already exist.

The lifecycle is outcome-oriented rather than screen-oriented. A merchant may move between Quick Start, Guided, and Advanced modes without creating a second project or a parallel source of truth. Closing the application never means abandoning the work, and generating a theme never erases the creative history that produced it.

This contract defines product behavior and ownership. It does not specify UI components, APIs, database tables, implementation code, or Shopify theme behavior.

## 2. Governing Product Contracts

This contract is subordinate to and must remain consistent with:

- `customer-journey.md`, which defines the end-to-end merchant experience;
- `ai-creative-director-interaction-design.md`, which defines the interaction model;
- `ai-behaviour.md`, which defines the Creative Director's conduct;
- `automatic-merchant-intake.md`, which defines automatic merchant understanding;
- `recommended-resource-set.md`, which owns resource recommendation and approval;
- `design-dna.md`, which owns normalized visual direction;
- `recommendation-engine.md`, which owns coherent storefront recommendation;
- `live-preview-engine.md`, which owns preview states and rendering behavior;
- `component-and-state-contract.md`, which owns UI state boundaries; and
- `conversation-engine.md`, which owns conversational routing and intent handling.

Existing Shopify authentication, canonical shop identity, project isolation, Creative Director data, immutable revisions, preset approvals, Approved Block Plans, resource snapshots, paid-order pinning, deterministic generation, read-only package generation, and merchant-initiated updates remain authoritative.

When contracts appear to overlap, the domain owner remains authoritative. This lifecycle coordinates those owners; it does not duplicate or replace them.

## 3. Merchant Lifecycle Definition

The Merchant Lifecycle is the durable progression of an authorized merchant through one Calinium creative engagement, from first entry through understanding, recommendation, preview, approval, payment, generation, delivery, and later refinement.

Its canonical relationship is:

Merchant identity → canonical Shopify shop identity → durable Calinium project → zero or more generation identities.

The current product already has the important durable foundations: authenticated actors, normalized Shopify connections, project-scoped Creative Director sessions, approvals, paid orders, generation runs, and authorized artifacts. This contract defines how those foundations should appear as one coherent merchant experience. It does not assume that a unified lifecycle orchestrator, automatic first-launch project routing, project archival, or a complete multi-project interface already exists.

## 4. Product Philosophy

Calinium should feel continuous. The merchant returns to a creative relationship, not to a discarded wizard state. Calinium should remember what was approved, distinguish current work from history, explain only consequential changes, and offer the smallest safe next action.

The lifecycle follows five principles:

- Start useful work as soon as identity and intent are sufficient.
- Preserve progress across navigation, refresh, session expiry, failure, and return.
- Treat approvals, payments, and generated outputs as durable historical facts.
- Apply changes prospectively; never rewrite paid or generated history.
- Keep every consequential action explicit, reversible where possible, and scoped to the authorized merchant, shop, and project.

## 5. Lifecycle Responsibilities

The Merchant Lifecycle owns the coherent sequence and readiness of the merchant engagement. It determines which project is active, what outcome is current, what can happen next, what must be resumed, and which domain owns any unresolved condition.

It coordinates:

- identity resolution and authorized project access;
- first entry, return, resume, and re-entry;
- mode continuity;
- domain readiness and stale-state presentation;
- approval, payment, generation, delivery, and successor-generation transitions;
- preservation of current state and immutable history; and
- safe recovery when one domain fails.

## 6. Lifecycle Non-Responsibilities

The lifecycle does not infer merchant facts, rank resources, normalize Design DNA, select presets, render previews, validate content claims, process payments, generate themes, or authorize Shopify writes. Those remain with their governing domains.

It must never:

- create a second approval or revision system;
- equate interface progress with canonical readiness;
- treat a preview as a generated theme;
- treat payment initiation as payment success;
- mutate a prior generation or artifact;
- silently replace an approved resource;
- publish, upload, install, or update a Shopify theme; or
- grant access based only on a browser hostname, storefront domain, or caller-supplied project identifier.

## 7. Merchant Identity

Merchant identity represents the authenticated human actor using Calinium. It may be established through the current Shopify embedded identity and Calinium account or organization conventions, but it is not interchangeable with a shop or a project.

The merchant identity determines who is acting and which organization memberships and permissions apply. It can be associated with more than one shop or project in the future. A merchant-facing name or email is descriptive, not the authorization boundary.

The lifecycle must preserve actor attribution for approvals, payment consent, corrections, and other consequential actions according to existing privacy and audit conventions. Session expiry may require reauthentication, but it must not delete the merchant's canonical work.

## 8. Shop Identity

Shop identity is the canonical Shopify `.myshopify.com` domain established by authenticated Shopify context and verified connection data. It is never inferred from a custom storefront domain, arbitrary URL, browser hostname, request text, or merchant-entered shop name.

When Calinium is embedded in an authenticated Shopify Admin context, the merchant must not be asked to provide the shop domain again. The current shop context should be stated in merchant-friendly language where disambiguation matters.

Shop identity scopes Shopify-authoritative catalog, files, menus, themes, markets, policies, approvals, and projects. A change of authenticated shop is a security boundary, not a casual UI preference.

## 9. Project Identity

A Calinium project is a durable creative engagement for one authorized shop. It contains the merchant conversation, Understanding, Recommendation, Design DNA, Recommended Resource Set, Preview, approvals, content plan, generation eligibility, paid orders, generation runs, artifacts, delivery history, and successor refinements relevant to that engagement.

Project identity is server-authoritative and stable. A display name may change without changing project identity. The merchant cannot gain access by supplying a project identifier, and one project's resources or revisions must never be resolved through another project.

A project can remain active before and after generation. Generation is a milestone within the project, not the project itself.

## 10. Merchant, Shop, and Project Relationship

The durable conceptual model is:

- one merchant may eventually be authorized for multiple shops;
- one shop may eventually contain multiple Calinium projects;
- one project may contain multiple approved revisions, paid orders, generations, and artifacts; and
- one generation consumes one exact immutable input set.

Beta may expose only one active shop context and may constrain project creation, but the underlying contract must not collapse these identities. Authorization requires the valid intersection of actor permission, canonical shop scope, organization scope where applicable, and project membership.

Switching shops must never carry project state, approvals, resources, or artifacts across the boundary. Switching projects must never create a duplicate project or silently merge their histories.

## 11. Lifecycle Overview

The normal lifecycle is:

Authenticate and resolve shop → select or create project → understand merchant → recommend direction → establish Design DNA and resources → show and refine Preview → obtain required approvals → confirm generation eligibility → obtain explicit payment consent → verify payment → pin immutable inputs → generate and validate → deliver artifact → support future refinement through successor revisions and, when required, a new paid generation.

This sequence is not a rigid screen list. Automatic work may overlap with conversation, Preview may appear before every internal domain is complete, and the merchant may revisit earlier decisions without restarting. Domain readiness and dependency rules determine what can proceed.

## 12. Entry Paths

The lifecycle must recognize distinct entry paths:

- first authorized launch after installation or connection;
- return to an unfinished project;
- return to a completed or generated project;
- authorized direct access to a delivery or artifact;
- return after generation to request refinement; and
- future creation or selection of another project.

Each entry begins by resolving actor, canonical shop, authorization, and project context server-side. Deep links may suggest a destination but cannot bypass those checks. If the requested destination is no longer available, Calinium should route to the nearest safe project state and explain briefly.

## 13. First Launch

On first authorized launch, Calinium should welcome the merchant as an AI Creative Director, acknowledge the connected Shopify store, and ask the first meaningful business question. It must not ask for the `.myshopify.com` domain or display the internal stage architecture.

The lifecycle should establish or select the durable project at the earliest point needed to save work reliably. Whether this occurs immediately on launch or after the first meaningful answer remains an open decision. In either case, duplicate clicks, refreshes, or repeated launch callbacks must not create duplicate projects.

Automatic Store Learning begins after sufficient merchant intent exists and runs without blocking the conversation. The first-launch experience must be recoverable if optional website analysis or a nonessential Shopify read fails.

## 14. Returning Merchant

A returning merchant should be recognized through authenticated context and taken to the most relevant authorized project outcome, not forced through first launch again.

Calinium should summarize only what matters: where the work paused, whether anything consequential became stale, whether a generation completed, or what action is required next. It should not replay every internal stage or diagnostic event.

If the merchant has an unfinished project, resume it. If the latest project has a ready artifact, emphasize delivery and possible refinement. If multiple plausible projects exist, use a safe project-selection experience rather than guessing.

## 15. Project Creation

Project creation establishes a durable, shop-scoped creative engagement. The server owns identity, scope, timestamps, membership, and initial lifecycle status. Client-provided names or business descriptions are editable merchant content, not authorization or identity claims.

Creation must be idempotent for one first-launch intent. It must initialize only the minimum canonical state and allow Automatic Merchant Intake and conversation to populate the rest. It must not fabricate answers to satisfy later readiness checks.

The current dashboard supports explicit project creation and project listings. The future balance between automatic Quick Start creation and manual project creation remains a product decision; this contract does not declare an unimplemented route to be current behavior.

## 16. Project Resume

Resume restores the same project and its authoritative current revisions. It does not clone, reset, or silently migrate the project.

At resume, Calinium resolves:

- current domain revisions and approvals;
- the last meaningful conversation position;
- current Preview state and whether it is stale;
- generation or payment status;
- recoverable failures;
- delivery artifacts; and
- the smallest valid next action.

Device, selected Preview page, and other noncritical preferences may also return, but their absence must not affect business state. Draft text may be best-effort; submitted merchant decisions and approvals are durable.

## 17. Project Selection

When one clearly relevant active project exists for the authenticated shop, Calinium may resume it directly. When more than one project could reasonably be intended, the merchant must choose from a scoped, merchant-friendly list.

Project selection should show name or purpose, last activity, lifecycle outcome, and generation status without exposing raw identifiers. It must not imply that selecting a project changes the authenticated shop.

Whether Beta exposes project selection or constrains each shop to one active project is unresolved. The data and authorization model must remain future-safe either way.

## 18. Quick Start Lifecycle

Quick Start is the default merchant lifecycle. It hides the internal stages, limits questions, begins automatic analysis quickly, recommends one coherent direction, presents a Recommended Resource Set, supports an evolving Preview, and combines review into the smallest trustworthy set of actions.

Quick Start does not weaken readiness, approval, truth, payment, or generation requirements. It reduces visible orchestration, not canonical validation. Sensitive facts still require individual confirmation, and the final paid generation remains explicit.

The target outcome is paid-generation readiness in under ten minutes for the Beta scenario, with ordinary optional resources omitted or safely defaulted rather than blocking progress.

## 19. Guided Lifecycle

Guided mode uses the same project and canonical state as Quick Start. It provides additional rationale, comparisons, and review opportunities without turning the journey into raw configuration.

The merchant may inspect alternatives, review more resource choices, ask why a recommendation was made, and see clearer readiness explanations. Guided mode must not create an independent recommendation, Preview, or approval history.

Returning to Quick Start hides extra detail while preserving all valid decisions made in Guided mode.

## 20. Advanced Lifecycle

Advanced mode exposes the existing detailed workflow: Understanding, Brand Blueprint, Store Strategy, Preset, Store Resources, and Content Plan, together with relevant revisions, omissions, and approval states.

It uses the same authoritative services, project, and current revisions as Quick Start and Guided. Advanced mode is inspection and control, not a separate product path.

Technical implementation details such as runtime setting IDs, checksums, raw snapshots, Shopify JSON, and internal schema names remain hidden even in Advanced mode unless a separately governed developer view is introduced.

## 21. Mode Changes

Mode changes are presentation changes over one durable project. They must not create a new project, restart intake, duplicate a revision, revoke an approval, or create a new payment or generation.

If Advanced mode introduces a consequential edit, the owning domain creates the appropriate new candidate or revision. Returning to Quick Start presents the updated summarized state. Pending approvals remain visible in every mode at the point they become consequential.

Panel preferences and chosen mode may persist as UI preferences, but canonical project state must not depend on a particular device or layout.

## 22. Automatic Store Learning

Automatic Store Learning is an early, resumable lifecycle activity that reads Shopify-authoritative information and, when offered and consented to, observes a public website. It may continue while the merchant talks.

Its progress should reflect real work. Required Shopify failures should be distinguished from optional website or media-analysis failures. Optional failure must not erase successful observations or block unrelated conversation.

New observations update only their owning intake state. They do not silently approve resources, rewrite merchant facts, or modify a paid generation. Sensitive claims remain untrusted until explicitly confirmed.

## 23. Conversation Start

Conversation starts with one clear, relevant question and creates the first merchant-authored intent. The merchant should not have to explain facts that Shopify already provides.

The Conversation Engine routes answers into canonical domains. A message is not itself an approval, payment, or direct Preview mutation. Consequential intent is normalized, validated, and represented through the owning domain before the lifecycle advances.

Conversation remains available throughout refinement and recovery. The merchant may change their mind without restarting the project.

## 24. Understanding Readiness

Understanding is ready when Calinium has enough approved or safely inferred information to form a useful business, audience, objective, and brand-direction hypothesis. Readiness is not a demand for every possible merchant fact.

Missing optional facts do not block. Conflicting or sensitive facts require resolution when they materially affect recommendations or claims. Confidence and unresolved questions follow the Automatic Merchant Intake and AI Behaviour contracts.

Understanding readiness is one domain status, not a global progress percentage. A Preview may begin structurally before it is fully ready, while final recommendation or generation may require additional normalized decisions.

## 25. Recommendation Readiness

Recommendation readiness means at least one candidate has passed eligibility, compatibility, runtime, evidence, resource, accessibility, and truth constraints, and a deterministic primary recommendation can be presented.

Low confidence may trigger one consequential question or a safe minimal fallback; it does not justify a menu of unfiltered options. Alternatives are optional and must be genuinely eligible.

Recommendation readiness is owned by the Recommendation Engine. The lifecycle consumes its status and routes the merchant to review; it does not recompute scores or bypass eligibility.

## 26. Design DNA Readiness

Design DNA is ready when its current normalized dimensions are coherent enough to guide the recommended storefront and can be represented by supported runtime capabilities. It may include confidence and provisional dimensions.

Readiness does not require every aesthetic preference to be explicit. High-confidence reversible presentation choices may remain recommended, while consequential conflicts require merchant input.

Design DNA revisions are independent from Preview revisions. A DNA change marks dependent recommendations or Preview regions stale; it does not rewrite history.

## 27. Resource Readiness

Resource readiness means every required slot for the current recommendation has a valid server-resolved resource, approved fallback, or explicitly safe omission, and every sensitive evidence resource has the required confirmation.

Ordinary optional resources must not block generation. The Recommended Resource Set owns ranking, alternatives, staleness, and approvals. The lifecycle presents set-level review where safe and separates sensitive confirmations.

Resource readiness is revision-specific. A deleted or changed Shopify resource can stale current dependents, but it must never silently replace an approved binding or alter an older paid input snapshot.

## 28. Preview Readiness

Preview readiness is state-specific:

- Thinking: canonical intent is still insufficient for meaningful representation.
- Provisional: a safe current recommendation can be rendered with clear provisional labeling.
- Approved: the merchant-approved recommendation, Design DNA, and resources can be represented coherently.
- Generated: an actual generated package or trusted rendering of it is available.

Preview readiness does not equal generation eligibility. Preview failure should not block conversation or destroy approved decisions, and a Provisional Preview must never be presented as a production theme.

## 29. Preview Refinement Lifecycle

Refinement follows a canonical path: merchant request, normalized intent, affected domain validation, new revision, dependency-scoped Preview update, and concise explanation.

Small changes should update the relevant region or design dimensions, not restart intake or rebuild unrelated project state. Undo and redo operate on canonical revisions where supported, never on DOM appearance alone.

Exploring an alternative recommendation is temporary until explicitly accepted. It must not supersede the approved direction or create duplicate approvals.

## 30. Approval Readiness

Approval readiness means the exact subject under review is valid, current, understandable, and attributable. The merchant must be able to see what is being accepted, what remains provisional, what will be omitted, and what requires separate confirmation.

Approval readiness is not a single project-wide Boolean. Recommendation, resources, sensitive claims, content plans, and generation inputs retain their own owners and rules.

If a reviewed revision changes, approval readiness expires for that subject. Calinium must request review of the consequential change rather than apply an approval to a different revision.

## 31. Approval Lifecycle

Approval is a server-authoritative event tied to the authenticated actor, project, shop, exact revision, timestamp, and owning domain. It creates or references immutable approved state according to the existing contract.

The lifecycle distinguishes:

- reversible design-direction acceptance;
- approval of ordinary resource recommendations;
- immutable content or plan approval;
- explicit sensitive-fact confirmation;
- final generation approval; and
- payment consent.

One interface action may coordinate related checks, but the underlying meanings remain distinct. Approval never authorizes fabricated content, future silent changes, Shopify publishing, or automatic updates.

## 32. Sensitive Confirmation Lifecycle

Sensitive facts and evidence are never bulk-approved with ordinary resources. Founder biography, handmade or artisan claims, origin, sustainability, certifications, awards, testimonials, performance claims, statistics, external proof, and similar content require explicit, item-specific merchant confirmation where used.

Each confirmation identifies the factual subject, evidence or source where governed, intended use, current revision, and merchant actor. Editing the fact or replacing consequential evidence requires a new confirmation.

Declining or omitting a sensitive claim should remove it from current compositions without preventing unrelated design work. Calinium prefers omission to persuasion or invention.

## 33. Generation Eligibility

Generation eligibility is a server-evaluated, revision-specific result. It requires the current approved storefront direction, required content and resources, current project and shop scope, required approvals, valid target theme context, paid-action readiness, and absence of blocking validation conditions.

The lifecycle presents eligibility as actionable domains, not an opaque percentage. It names the smallest merchant action needed when blocked and distinguishes optional omissions from hard blockers.

Eligibility can become stale before payment or generation if a governing input changes. It cannot authorize substitution into an already paid, pinned order.

## 34. Payment Readiness

Payment is ready only after the merchant can review the recommended design, important resources, omissions, sensitive confirmations, price, generation behavior, and delivery format, and generation eligibility has passed.

Payment readiness does not mean a charge exists or succeeded. The lifecycle remains provider-agnostic and relies on the active server-controlled payment provider and verified external or staging status.

The primary action must make clear that the merchant is initiating a paid generation. No conversational phrase, Preview interaction, or design approval may trigger payment implicitly.

## 35. Payment Lifecycle

The payment lifecycle is: merchant explicitly requests paid generation, Calinium creates or reuses an idempotent order or purchase intent, the provider handles checkout or a visibly non-production staging path, Calinium verifies the result server-side, and the paid order becomes eligible for input pinning and generation.

Initiated, pending, confirmed, failed, cancelled, and unavailable states must remain distinct. Calinium must never describe a staging bypass or simulated path as a successful Shopify charge.

Duplicate clicks, callback retries, browser refreshes, and return from the provider must not create duplicate orders or charges. If approved inputs change during payment, the original order must be blocked or remain bound to its reviewed inputs according to existing policy; it must never silently adopt the new state.

## 36. Generation Request

A generation request is an explicit merchant-initiated instruction associated with an authorized project and a paid or otherwise valid environment-specific order. It references the exact generation approval and input eligibility result.

The server resolves and pins authoritative revisions. The client cannot supply approved plan contents, resource snapshots, preset contents, checksums, artifact paths, or payment success.

Repeated equivalent requests return or resume the same eligible work when possible. A new successor generation requires a new explicit action and, where the commercial model requires, a new payment.

## 37. Generation Lifecycle

Generation begins only after verified payment status and immutable input pinning. Its real states may include preparing approved inputs, building the theme foundation, applying design, composing pages, applying approved content, validating Shopify output, running Theme Check, packaging, and ready.

Progress represents actual server work and may be streamed, polled, or resumed without fake percentages. A generation run is tied to one project, order, exact input snapshot, generator target, and attempt lineage.

Generation is read-only with respect to the merchant's Shopify theme. It creates a package; it never uploads, installs, publishes, or automatically updates a theme.

## 38. Generation Failure

Generation failure is local to the generation attempt. It must preserve the project, approvals, paid order, pinned inputs, prior artifacts, and recoverable status.

The merchant sees a calm explanation, whether retry is safe, and the next action. Stack traces, filesystem paths, credentials, and internal validation payloads remain hidden.

A failed attempt must not be described as delivered and must not produce a misleading successful artifact. Failure classification should distinguish retryable infrastructure issues from invalid pinned inputs or unrecoverable package validation failures.

## 39. Generation Recovery

Recovery reuses the same paid order and immutable pinned inputs unless a validated policy explicitly requires a successor order. Retry must not re-charge, duplicate the order, or consume current mutable project state.

Resume after refresh or process interruption reconnects to the existing run or creates an attempt within its established retry lineage. If the generation already completed, recovery returns the ready result instead of regenerating blindly.

When pinned inputs are invalid or unavailable in a way that cannot be repaired without change, the old order remains historical. Calinium explains the required successor approval or commercial action rather than mutating the snapshot.

## 40. Generated Artifact Lifecycle

A generated artifact is an immutable historical output of one generation identity. It is tied to its project, shop, order, pinned input snapshot, target theme and version, validation result, provenance, checksum where governed, and creation time.

Artifacts may be superseded by later artifacts but are not edited in place. A regenerated or refined theme creates a new generation and artifact identity.

Artifact metadata is merchant-readable only where useful. Approval records, resource snapshots, internal paths, secrets, and raw provenance do not belong inside Shopify templates or merchant downloads.

## 41. Delivery Lifecycle

Delivery begins when a generation has completed all required validation and a scoped artifact is ready. Calinium presents the theme package, a merchant-friendly summary, validation status, version identity, upload and preview guidance, and available next actions.

Delivery is not publication. Calinium must clearly state that it has not modified the live Shopify theme. Calinium never automatically uploads, installs, publishes, updates, or previews a theme on the merchant's behalf; every such merchant-side action remains explicit and outside the generation event.

If an artifact later becomes unavailable under a retention policy, the historical generation remains visible and the lifecycle explains the available recovery or regeneration path.

## 42. Download Lifecycle

Every download request revalidates authenticated actor, canonical shop context where applicable, project access, and artifact association. A guessed identifier, stale link, or direct filesystem path never grants access.

The downloaded package should have a stable merchant-friendly filename and integrity status. Repeated downloads do not create new generations, approvals, or charges.

Download success and failure may be recorded as low-sensitivity activity. URLs should be time-limited or otherwise protected according to the artifact storage model, and must not reveal internal storage layout.

## 43. Post-Generation Lifecycle

After delivery, the project remains available. The primary experience shifts from readiness and generation to artifact access, outcome review, and optional refinement.

Calinium should show which generation is current, what it was based on, and whether newer project decisions exist. It must not imply that a newer candidate has changed the downloaded artifact.

The optional subscription or paid refinement relationship may be introduced calmly, without implying automatic changes or hiding the need for explicit merchant action.

## 44. Refinement After Generation

Post-generation refinement starts from the current approved project state or a chosen historical revision and creates successor candidates in the affected domains. It never edits the generated ZIP or paid input snapshot.

The merchant may request changes conversationally. Calinium normalizes the request, identifies dependencies, updates a new Preview or recommendation revision, and obtains any required approvals.

The merchant can inspect the impact before initiating another generation. The commercial treatment of refinements and subscription entitlements remains an open decision.

## 45. Successor Generation

A successor generation is a new immutable generation derived from newly approved canonical revisions. It receives its own generation approval, payment or entitlement decision, pinned input snapshot, run identity, artifact, and provenance.

The prior generation and artifact remain reproducible history. Orders never silently migrate to newer plan, resource, preset, or Design DNA revisions.

When a requested change does not affect generated output, Calinium should explain that no successor generation is needed rather than creating unnecessary work or charges.

## 46. Repeat Purchase Behaviour

Every paid generation or update requires an explicit merchant action. Calinium must show what changed, what will be generated, the applicable price or entitlement, and whether the action creates a new artifact.

Repeat purchase behavior must be idempotent and must preserve old orders. A subscription may alter entitlement or price but must not authorize automatic generation, installation, update, or publication.

The exact relationship among one-time purchase, included corrections, subscription refinements, and additional paid generations is a founder decision and must not be inferred by lifecycle UI.

## 47. Project History

Project history is a merchant-readable timeline of meaningful outcomes: project creation, important decisions, approvals, payment and order states, generations, delivery, and successor refinements.

It should not reproduce every internal event, full conversation content, sensitive resource payload, or diagnostic log. Activity is summarized in merchant language and linked to the appropriate current or historical object.

History must distinguish the current working direction from delivered generations so merchants understand what has and has not changed.

## 48. Revision History

Revision history records the lineage of mutable candidates and immutable approvals across Understanding, Recommendation, Design DNA, resources, content plans, Preview, and other governed domains.

The lifecycle presents revisions when they help comparison, undo, audit, or recovery. It does not require merchants to manage raw revision IDs.

Parent-child lineage must remain intact. Harmless UI state changes do not create business revisions; consequential accepted changes do.

## 49. Immutable History

Approved revisions, resource snapshots, paid-order bindings, generation input snapshots, completed generations, and artifacts are immutable history. Corrections create successors rather than overwriting them.

Historical objects remain scoped to their original merchant, shop, project, and lineage. They may become superseded, expired, or unavailable for download, but their historical meaning must not be rewritten.

This boundary is essential for deterministic retry, auditability, trust, and truthful delivery.

## 50. Staleness Lifecycle

Staleness means a current canonical object no longer reflects one or more consequential dependencies. It is domain-scoped, reasoned, and revision-specific, not a global project failure.

Examples include a changed merchant decision, removed product, replaced resource, new approved Design DNA, updated preset version, or changed runtime capability. The owning domain determines whether the change is blocking, reviewable, or irrelevant.

Stale current work must not be silently reapproved. Historical paid inputs and artifacts remain valid records of their original state even when newer store data exists.

## 51. Resource Change Lifecycle

When a resource changes, Calinium identifies which current Resource Set slots, content plans, recommendations, Preview regions, and generation eligibility checks depend on it. It recalculates only those dependents where possible.

An unavailable optional resource may use an already governed fallback or omission. An approved resource must never be silently swapped for another item. Consequential replacement requires review and a new applicable snapshot or approval.

Past paid orders, generation snapshots, and artifacts retain the exact bindings they consumed.

## 52. Shopify Change Lifecycle

Shopify catalog, collection, menu, file, theme, market, and policy changes are authoritative observations for future work. The lifecycle must decide when to refresh them and how to present consequential differences without punishing normal merchant activity.

Shopify changes do not mutate Calinium history. They can make current recommendations or resources stale and can block a future generation when a required binding no longer resolves.

The exact automatic refresh frequency and re-entry refresh policy remain open. Calinium should avoid both silent drift and disruptive full rescans for irrelevant changes.

## 53. Merchant Correction Lifecycle

A merchant correction updates the owning canonical domain, preserves the original in history where governed, and recalculates only affected dependents. It does not require restarting the project.

Calinium acknowledges the correction without defensiveness, updates the Preview when possible, and briefly explains consequential effects. If the correction changes a sensitive claim, resource binding, or approved composition, the relevant approval must be renewed.

Corrections never rewrite paid-order inputs or generated artifacts. They prepare a successor state.

## 54. Project Abandonment

Closing a tab, inactivity, session expiry, a failed analysis, or leaving during payment is not abandonment. Canonical work remains resumable.

Abandonment is a product interpretation of prolonged non-completion, not automatic deletion. Calinium may offer a respectful reminder or resume entry if notification consent and channel rules allow.

Explicit archive or delete behavior is unresolved for Beta. Neither may erase immutable commercial or audit history where retention is required.

## 55. Project Re-Entry

Re-entry reestablishes authenticated actor and canonical shop, resolves the intended project, loads current revisions and approvals, assesses domain staleness, restores Preview context, and identifies active payment, generation, or delivery outcomes.

Calinium should explain only consequential changes since the last visit. It should not automatically refresh or overwrite approved state before the merchant can understand the impact.

If the prior session ended mid-operation, re-entry reconnects to the authoritative server state rather than replaying the action.

## 56. Project Completion

Completion is not merely a generated status. A project can have a delivered artifact and still remain available for download, evaluation, and refinement.

For merchant-facing summaries, a project may be described as delivered when a validated artifact is ready and accessible. Future refinement then creates a new active successor outcome without making the original delivery incomplete.

The exact lifecycle status model, including whether merchants can explicitly mark work complete, remains open. Completion must never trigger automatic publication or deletion.

## 57. Multiple Projects

The architecture must support multiple projects per shop without mixing conversations, resources, approvals, orders, or artifacts. Whether Beta exposes this capability is a product decision.

If multiple projects are available, each must have clear identity, purpose, current outcome, and last activity. Creating a new project must be explicit or idempotently tied to a clear new-project intent.

Project duplication, templates derived from prior projects, archival, and default-project selection are future behaviors requiring separate policy.

## 58. Multiple Shops

One merchant may eventually be authorized for multiple Shopify shops, but only one canonical shop context is active for a project interaction. Project and resource access remain bound to that shop.

Shop switching requires authenticated Shopify context or another explicitly authorized selection flow. Calinium must never carry a project or cached resource bindings from one shop into another.

Beta may operate only within the currently embedded shop and omit a shop switcher. Future multi-shop experience remains an open product and security decision.

## 59. Account and Session Recovery

Session expiry, sign-out, browser closure, and authentication interruption require reauthentication, not project recreation. After successful recovery, Calinium returns to the authorized project and current server state.

Unsaved composer text may be recoverable only on the same device, but submitted answers, revisions, approvals, orders, generation status, and artifacts are durable according to their domains.

Recovery must never accept a requested shop or project solely from client state. If actor permissions changed, access is denied safely while historical data remains protected.

## 60. Failure and Recovery Principles

Failures should be isolated to the smallest owning domain. Optional website analysis can fail while conversation continues; Preview can fail while recommendation remains valid; generation can fail while paid inputs and approvals remain intact.

Every failure should be classified as recoverable, retryable, blocking, or terminal for the affected operation. Merchant messages explain impact and next action without internal jargon or blame.

Recovery is idempotent, preserves successful work, avoids duplicate approval or payment, and rechecks authority and current dependencies. A broad project reset is a last resort and never the default recovery action.

## 61. Notifications

Notifications should communicate meaningful lifecycle outcomes: required merchant review, payment result, generation completion or failure, artifact readiness, consequential staleness, and time-sensitive access changes.

They must not narrate every background task or create urgency without cause. In-product status is primary; external channels require consent, channel policy, and a future product decision.

Notifications reveal no sensitive merchant content, secret, raw identifier, or unauthorized artifact link.

## 62. Security and Isolation

Every lifecycle action is authorized at the intersection of actor, organization where applicable, canonical Shopify shop, project, and target resource or artifact. Server-resolved state is authoritative.

The client may express intent and select visible options, but it cannot establish shop scope, actor authority, approval status, payment success, immutable snapshot contents, generation inputs, artifact paths, or provenance.

No lifecycle state grants Shopify theme-write authority. Calinium preserves read-only generation and never exposes tokens, secrets, session material, encryption data, internal storage paths, or private cross-project data.

## 63. Analytics

Lifecycle analytics should measure outcomes and friction without capturing message contents, sensitive claims, private Shopify data, resource payloads, or secrets.

Useful conceptual events include project started, project resumed, mode changed, readiness reached or blocked by domain, Preview approved, final review opened, payment initiated or resolved, generation started or completed or failed, artifact downloaded, refinement started, successor generation requested, project re-entered, and journey abandoned.

Event identity must be pseudonymous or appropriately scoped, deduplicated, and separated from authorization. Analytics failure never blocks merchant progress.

## 64. Beta Lifecycle Scope

Beta requires:

- an authenticated merchant in one active canonical Shopify shop context;
- one durable, project-scoped creative engagement;
- Quick Start as the primary path;
- resume across refresh and return;
- Automatic Merchant Intake and conversation;
- Recommendation, Design DNA, and Recommended Resource Set;
- homepage Preview with Thinking, Provisional, Approved, and Generated states;
- required approvals and sensitive confirmations;
- explicit payment and paid-generation gating;
- immutable input pinning, deterministic read-only generation, and artifact delivery;
- authorized return and download;
- successor refinement without historical mutation; and
- localized failure and recovery.

Beta may defer multi-project management UI, multi-shop switching, archive and delete, team collaboration, cross-project learning, broad external notifications, and automatic store-refresh sophistication. Automatic installation, upload, publication, and updates remain prohibited, not deferred assumptions.

## 65. Lifecycle Anti-Patterns

The lifecycle explicitly rejects:

- treating a merchant, shop, project, order, and generation as one identity;
- creating a new project on every visit;
- using the browser URL or merchant input as shop authority;
- displaying one misleading global completion percentage;
- making UI state the source of business truth;
- requiring restart after a correction or failure;
- silently reapproving stale revisions;
- silently replacing approved resources;
- treating payment initiation as success;
- charging again for an idempotent retry;
- mutating paid inputs or generated artifacts;
- losing work on session expiry;
- letting one failed domain destroy the project;
- mixing shops or projects through cached state;
- exposing internal paths or approval metadata;
- describing Provisional Preview as generated output; and
- automatically uploading, installing, publishing, or updating Shopify themes.

## 66. Open Product Decisions

The following decisions remain unresolved and must not be inferred during implementation:

1. Does Beta allow one project or multiple projects per shop?
2. How are projects named, and when can merchants rename them?
3. Can merchants manually create a project in Beta?
4. What is the exact first-launch visual and routing behavior?
5. Does Quick Start create a project immediately or after the first meaningful answer?
6. What constitutes merchant-facing project completion?
7. Is project archive available in Beta?
8. Is project deletion available in Beta, and what history must be retained?
9. How are post-generation refinements priced?
10. What is the commercial model for repeat generation?
11. Do generated artifacts expire?
12. How long are downloads retained and recoverable?
13. Are stale checks triggered automatically by Shopify changes?
14. How frequently is Shopify state refreshed?
15. Does project re-entry automatically refresh Shopify observations?
16. Are Guided and Advanced modes fully available in the initial Beta?
17. Can a merchant duplicate a project?
18. How will future multi-shop navigation work?
19. How will future team collaboration affect actor and approval semantics?
20. May future cross-project preferences influence new projects, with consent?
21. Which external notification channels, if any, are supported?
22. Does a high-confidence Quick Start recommendation still require explicit preset acceptance?
23. How are included corrections distinguished from a paid successor generation?
24. Which payment provider and staging semantics apply in each deployed environment?

## 67. Cross-Contract Lifecycle Invariants

The following invariants apply across every lifecycle domain:

1. Merchant identity, shop identity, project identity, order identity, and generation identity remain distinct.
2. The canonical Shopify shop is established from authenticated `.myshopify.com` identity.
3. An embedded merchant is never asked to re-enter the shop domain.
4. Every project is durably scoped to one authorized shop.
5. Every consequential action is actor- and project-authorized server-side.
6. Quick Start, Guided, and Advanced share one canonical project state.
7. Mode switching never creates duplicate revisions, approvals, orders, or projects.
8. Internal Creative Director stages remain authoritative even when hidden.
9. Readiness is domain-specific, not a single global percentage.
10. Preview states remain Thinking, Provisional, Approved, and Generated.
11. A Preview is not the approval authority or Theme Generator.
12. Conversation routes intent through canonical validation before state changes.
13. Ordinary optional resources do not block generation when safe omission exists.
14. Sensitive claims require explicit, item-specific merchant confirmation.
15. No merchant fact, claim, relationship, or evidence is fabricated.
16. Approved revisions and resource snapshots are immutable.
17. Approved resources are never silently replaced.
18. Final generation is an explicit merchant-initiated paid action.
19. Payment initiation is never treated as verified payment success.
20. Paid orders pin exact immutable generation inputs.
21. Retry and resume reuse pinned inputs and avoid duplicate charges.
22. Generated artifacts are immutable historical outputs.
23. Post-generation changes create successor revisions and, when needed, successor generations.
24. Old orders and artifacts never migrate silently to current revisions.
25. Staleness is domain-scoped and does not rewrite history.
26. Shopify changes affect current and future dependent work, not prior generated truth.
27. Closing, inactivity, or session expiry never deletes canonical progress.
28. Re-entry restores server-authoritative state and explains only consequential changes.
29. Failure is localized and successful work is preserved.
30. Downloads are authorized by actor, shop, project, order, and artifact association.
31. No secret, token, snapshot payload, internal path, or approval metadata leaks to merchant output.
32. Calinium generation remains read-only toward Shopify.
33. No theme is automatically uploaded, installed, published, or updated.
34. Every future theme update or regeneration requires explicit merchant action.

## 68. Implementation Readiness

This contract is ready to govern a Beta Specification. The repository already provides substantive foundations for authenticated actors, canonical Shopify connections, project-scoped sessions, revisioned approvals, payment/order state, immutable generation snapshots, retryable generation runs, and authorized artifacts.

Implementation planning must first map current routes and screens to this lifecycle without creating a second state machine. It should identify the narrow gaps between existing behavior and this contract, especially first-launch project routing, merchant-facing domain readiness, re-entry summaries, post-generation successor flow, and any constrained Beta project-selection policy.

Readiness does not authorize implementation choices for the open commercial, retention, multi-project, multi-shop, archive, notification, or renderer decisions. Those remain explicit product decisions. All future implementation must preserve the cross-contract invariants above.
