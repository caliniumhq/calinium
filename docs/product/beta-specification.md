# Calinium Beta Specification

## 1. Purpose

This document is the final product contract for Calinium Beta. It defines what must be true before real external Shopify merchants can safely use the product, which capabilities are required, which are optional, which are deferred, and which current gaps block launch.

The specification reconciles the governing product contracts with narrowly inspected runtime evidence. Product intent remains authoritative when the current implementation is incomplete. Runtime evidence is used only to classify readiness and gaps; it does not reduce the Beta promise.

This is not an implementation plan, technical design, test plan implementation, or authorization to modify any existing system.

## 2. Governing Product Contracts

The following contracts govern this specification and remain authoritative in their respective domains:

- `customer-journey.md` governs the merchant journey and product promise.
- `ai-creative-director-interaction-design.md` governs the three-area interaction experience.
- `ai-behaviour.md` governs Creative Director behavior, truth, confidence, and correction.
- `automatic-merchant-intake.md` governs store and website understanding.
- `recommended-resource-set.md` governs resource ranking, eligibility, approval, and staleness.
- `design-dna.md` governs normalized visual intent.
- `recommendation-engine.md` governs eligibility-first storefront recommendations.
- `live-preview-engine.md` governs Preview ownership, fidelity, revisions, and states.
- `component-and-state-contract.md` governs component and canonical state ownership.
- `conversation-engine.md` governs bounded conversation, intent routing, and delegation.
- `merchant-lifecycle.md` governs identity, persistence, approvals, payment, generation, delivery, and return.

This specification reconciles but does not replace those contracts. Open decisions are classified in Section 75. No Beta shortcut may bypass their truth, approval, security, revision, payment, generation, or no-write boundaries.

## 3. Beta Definition

Calinium Beta is a controlled, private release of an AI Creative Director for supported Shopify merchants. It understands the connected store, develops a coherent storefront direction, shows that direction before purchase, accepts constrained conversational refinement, and produces a validated custom Shopify theme through an explicit paid generation action.

Beta is intentionally bounded to current supported presets, runtime capabilities, Approved Block Plan adapters, Calinium One 1.0, and controlled merchants. It is not an open-ended design agent, a theme editor replacement, a publishing service, or a universal Shopify-app compatibility guarantee.

## 4. Beta Product Promise

The Beta promise is:

> Calinium understands the merchant's Shopify store, develops a coherent storefront direction, shows that direction before purchase, allows conversational refinement, and produces a validated custom Shopify theme through an explicit paid generation action.

The promise is complete only when the merchant can leave and return without losing canonical work, understand what is provisional versus approved versus generated, download the authorized artifact, and refine successor state without mutating historical output.

## 5. Beta Design Principles

Beta must be conversational first, show Preview early, decide automatically where safe, and ask only consequential questions. It preserves merchant authority over facts, sensitive claims, approvals, payment, generation, and publication.

Truth outranks visual polish. Missing information produces omission, conservative structure, or a targeted question—never fabrication. Canonical server state outranks UI state. Corrections create revisions rather than destructive mutation. Payment and generation are explicit. Calinium never automatically writes to the merchant's Shopify store.

## 6. Beta Merchant

The target Beta merchant is authenticated through Shopify, operates a supported Shopify store, can review a generated theme before manual installation, is willing to participate in controlled validation, and can confirm sensitive facts when such content is desired.

Beta does not promise suitability for every catalog model, custom storefront architecture, market configuration, Shopify app ecosystem, or merchant workflow. Unsupported complexity must be identified honestly during intake rather than hidden by generic output.

## 7. Beta Shop

One active authenticated Shopify shop context is assumed per session. The canonical `.myshopify.com` identity established by verified Shopify authentication is authoritative. A public storefront domain, website URL, browser hostname, or merchant-entered value is never security identity.

An authenticated embedded merchant is not asked to re-enter the Shopify domain. Shopify-authoritative products, collections, media, menus, files, themes, and other supported resources remain scoped to the canonical shop.

## 8. Beta Project

Beta requires a durable, project-scoped creative engagement. It contains conversation, Understanding, Recommendation, Design DNA, Recommended Resource Set, Preview revisions, approvals, content plans, eligibility, payment and orders, generations, artifacts, and successor work.

The project survives refresh, browser closure, session expiry, temporary subsystem failure, and later return. Refinement does not create a new project. The Beta interface may constrain project selection, but the underlying merchant, shop, project, order, and generation identities remain distinct.

## 9. Beta Entry Conditions

Entry requires an authenticated supported merchant, a verified canonical Shopify shop, valid project authorization, required environment configuration, durable persistence, and safe artifact storage. A new or resumable project must be resolved server-side.

The application must refuse entry or consequential actions when shop authorization, actor identity, project scope, required persistence, or environment safety cannot be established. It must not compensate by trusting client identifiers or creating unscoped temporary work.

## 10. Beta Entry Experience

The first experience is deliberately simple: Calinium recognizes the connected store, begins eligible store learning, and opens a Creative Director conversation. The primary prompt asks what the merchant wants to create or change.

Entry must not require Shopify domain entry, manual catalog upload, manual collection setup, technical theme configuration, or a large onboarding form. The exact visual composition and whether the durable project is created on launch or after the first meaningful answer remain Beta-required decisions.

## 11. Beta Customer Journey

The required journey is:

Open Calinium → resolve the connected shop and project → learn the store → understand merchant intent conversationally → recommend a coherent direction → establish Design DNA and resources → show a truthful Homepage Preview → refine it conversationally → review required decisions → explicitly approve and pay → generate and validate → deliver an authorized theme artifact → resume later → create successor refinements without altering history.

Internal stages remain authoritative but do not become the primary Quick Start navigation.

## 12. Quick Start

Quick Start is the default and required Beta mode. Its primary merchant surfaces are Conversation, Preview, Decisions when required, and Generation when eligible. It targets five to seven essential questions maximum and fewer when Shopify or existing approved state supplies the answer.

Quick Start may combine review of ordinary reversible decisions, but it cannot combine away sensitive confirmation, generation approval, or payment consent. It uses the same canonical services and revisions as every other mode.

## 13. Guided Mode

Guided Mode is optional for initial private Beta. If included, it provides more explanation, alternatives, and comparison while using the same project and canonical revisions as Quick Start.

Its absence does not block private Beta if Quick Start offers sufficient explanation on request and Advanced access remains available for detailed inspection. Adding Guided later must not create a second recommendation or approval path.

## 14. Advanced Mode

Access to the existing detailed workflow is required as a safe escape and support surface, but a redesigned Advanced Mode experience is optional. The current stage-based Creative Director is an Advanced-like foundation and must remain consistent with Quick Start state.

Switching to or from Advanced must not create a project, duplicate revisions, revoke approvals, or reset work. Raw runtime IDs, schemas, checksums, and Shopify JSON remain hidden from ordinary merchants.

## 15. Automatic Merchant Intake

Automatic Merchant Intake is Beta-required. It starts after the first meaningful merchant intent and gathers eligible Shopify data without waiting for a later resource-configuration stage.

It produces project-scoped, confidence-aware understanding and questions only where source authority or merchant preference requires them. It never promotes observations into sensitive facts, approvals, or content claims.

## 16. Store Intelligence

At minimum, Beta intake uses available and authorized store identity, products, variants where relevant, collections, product media, Shopify Files, menus, theme context, and supported market or store information. It derives safe observations such as catalog shape, collection structure, media availability, navigation structure, and candidate resource slots.

Missing optional inventory does not punish the merchant. Large catalogs are summarized and paginated. Failed optional reads remain localized; required shop identity and authorization failures block safely.

## 17. Public Website Context

Public website context is optional for Beta and is not required to satisfy the core promise. When offered, it may inform visual language, tone, layout, brand presentation, and questions, but it never overrides Shopify-authoritative data or merchant-approved intent.

Website URLs are never identity. Factual website statements remain contextual leads unless independently confirmed. The consent model, screenshot retention, and import rights must be resolved before website analysis is enabled for private merchants; otherwise the capability remains disabled without blocking Beta.

## 18. Conversation Experience

Beta conversation covers business description, audience intent, brand and style direction, primary objective, priorities, avoidances, delegation, recommendation questions, resource changes, design refinements, corrections, and generation intent.

Conversation is project-scoped and resumable. Raw text is not canonical truth. Every consequential request is normalized, routed to its owning domain, validated, and represented as canonical state before affecting Preview, approval, payment, or generation.

## 19. Question Strategy

Quick Start asks at most five to seven essential questions, preferably fewer. Questions are singular, merchant-facing, nontechnical, adaptive, and consequential.

Calinium must not ask for information Shopify or current approved state already provides. It skips resolved topics, asks one targeted clarification when confidence is consequentially low, and allows optional unknowns to remain unknown.

## 20. Merchant Delegation

Beta supports statements such as “You decide,” “Choose for me,” and “I don't know.” Delegation authorizes bounded, reversible creative recommendations within the applicable confidence and safety rules.

Delegation never authorizes invented facts, sensitive claims, payment, generation, publication, destructive Shopify actions, or silent future changes. A delegated decision remains reviewable and attributable.

## 21. Merchant Understanding

Beta needs sufficient normalized understanding for a credible recommendation and Preview, not an exhaustive merchant profile. Business, audience, objective, brand direction, and important avoidances must be explicit or safely supported.

Unknown optional facts remain unknown. Conflicts are surfaced only when consequential. The merchant can correct Understanding without restarting, and affected dependents are recalculated through successor state.

## 22. Recommendation Experience

Beta presents one coherent primary recommendation and up to two genuinely eligible alternatives when useful. Eligibility precedes ranking. Recommendations reflect merchant intent, Shopify context, approved resources, preset compatibility, Design DNA, runtime capability, evidence sufficiency, accessibility, and truth constraints.

Reasons are concise and merchant-readable. Raw scores and hidden reasoning are not exposed. An ineligible direction cannot win because it looks preferable.

## 23. Preset Experience

Atelier, Maison, Gallery, Ritual, Essential, and Signal remain the six Beta design directions. Calinium recommends one; Quick Start does not open as a preset marketplace.

A merchant may explore eligible alternatives without approving them. Preset identity, version, constraints, and approval remain authoritative generation inputs. The exact combined-approval treatment for preset and Design DNA must be resolved before Quick Start approval is implemented.

## 24. Design DNA

Design DNA is a required canonical layer between intent, preset, recommendation, and Preview. It normalizes supported typography, spacing, hierarchy, media emphasis, motion, shape, density, commerce balance, editorial rhythm, and responsive direction.

Natural-language refinements update bounded DNA dimensions and dependent decisions; they do not generate arbitrary CSS. DNA must be versioned, coherent with fixed preset boundaries, runtime-capable, and reflected in generation provenance where governed.

## 25. Recommended Resource Set

The Recommended Resource Set is Beta-required. It prepares eligible ordinary resources such as logo, hero media and destination, featured collection or product, editorial or craftsmanship imagery, navigation, Preview theme context where retained, and optional video.

Each slot has a recommendation, source, reason, alternatives, fallback or omission, confidence, approval requirement, and stale state. Eligibility precedes ranking. The Recommendation Engine consumes this set and does not create a competing resource-ranking system.

## 26. Resource Approval

Eligible ordinary resource recommendations support set-level approval in one primary action, with the ability to inspect or change one slot. Medium- or low-confidence consequential slots are called out according to the eventual approved confidence policy.

Resource approval is server-authoritative, project- and shop-scoped, revision-specific, and availability-checked. Calinium never silently swaps an approved resource. Optional missing resources use an approved fallback or omission rather than block unnecessarily.

## 27. Sensitive Evidence and Claims

Handmade or artisan claims, founder biography, origin, sustainability, certifications, awards, testimonials, reviews, performance or comparison claims, customer counts, statistics, and other governed evidence require explicit item-specific confirmation.

They are excluded from bulk resource approval and delegation. Missing or declined evidence results in omission. Public availability, imagery, product type, or model inference is never sufficient confirmation.

## 28. Content Behaviour

Beta distinguishes Shopify-authoritative content, merchant-provided content, approved factual content, safe structural placeholders, and prohibited fabricated content. Existing Approved Block Plan contracts govern structured approved compositions.

Unrestricted copy generation is not a Beta requirement. Any current constrained copy behavior must preserve source authority and approval. Calinium never invents products, claims, testimonials, biographies, awards, prices, discounts, evidence, or product relationships to improve the Preview.

## 29. Live Preview

A truthful Homepage Live Preview before payment is Beta-required. It is the primary feedback surface for the recommended direction, approved or recommended resources, Design DNA, and conversational refinement.

The Preview Engine is distinct from Recommendation, approvals, payment, and the Theme Generator. Preview changes exist only after canonical decisions change. Preview failure does not erase project state or turn static cards into claimed storefront fidelity.

## 30. Preview States

Beta preserves exactly four states:

- Thinking communicates real work before a meaningful artifact exists.
- Provisional shows the current unapproved direction and is unmistakably labeled.
- Approved shows merchant-approved direction and resources but is not the packaged theme.
- Generated represents the trusted output of the real generation pipeline or an exact trusted rendering of that output.

State transitions are revision-aware. A stale artifact cannot remain presented as current.

## 31. Preview Rendering Scope

Required scope is Homepage, Desktop, and Mobile, with truthful structural, content-aware, resource-aware, and Design DNA-aware rendering. Generated Preview must be tied to the exact validated output.

Product, Collection, and Tablet Preview, alternative comparison, simulated commerce states, and broader page switching are optional. The exact renderer and fidelity/parity contract is a Beta-required decision before Preview implementation; static dashboard illustrations or unrelated Shopify themes cannot satisfy it.

## 32. Preview Refinement

Merchants can request bounded changes such as a shorter hero, less motion, more products, earlier craftsmanship, cleaner density, or a different approved image. Each request follows intent normalization, canonical validation, revision creation, Preview update, and a brief explanation.

Ambiguous or unsafe requests receive one focused clarification or the closest supported alternative. Free-form AI text never directly mutates DOM, CSS, Liquid, or theme JSON.

## 33. Partial Preview Updates

Dependency-scoped partial updates are Beta-required. A hero change updates hero dependents; typography updates affected typography regions; a resource swap updates sections consuming that resource; commerce density updates relevant commerce composition.

Stale work is cancelled or ignored. Meaningful submitted intent—not every keystroke—creates Preview work. The exact materiality threshold between partial and full rerender must be resolved during Preview technical design.

## 34. Responsive Preview

Desktop and Mobile Preview are required and share one canonical design state. Device switching is a UI preference, not a business revision.

Mobile must be usable rather than a scaled-down desktop screenshot. Tablet is optional for initial Beta, although the application itself must remain usable at tablet widths. Device controls must be labeled and preserve Preview revision identity.

## 35. Decision Experience

Decision surfaces appear only when merchant action is genuinely required: direction acceptance, ordinary resource review, sensitive confirmation, a consequential correction, generation readiness, and payment or generation consent.

They show the current choice, status, short reason, source category, change action, and whether approval is required without exposing schema names, raw IDs, checksums, or JSON. Ordinary AI decisions do not each become approval cards.

## 36. Approval Model

Beta preserves federated approval ownership. Reversible creative acceptance, preset and design-direction approval, resource approval, sensitive confirmation, content-plan approval, generation approval, and payment consent remain distinct meanings.

Approval is authenticated, server-authoritative, revision-scoped, attributable, and stale-safe. Navigation, silence, Preview viewing, delegation, or fluent conversation never implies approval. No global `approved` flag replaces domain owners.

## 37. Readiness Model

Beta uses domain-specific readiness: Understanding, Recommendation, Design DNA, Resource, Preview, Approval, and Generation eligibility. It does not show a fake universal completion percentage.

Each blocker names the owning domain and smallest useful merchant action. Optional omissions do not appear as failures. One domain may continue while an unrelated optional activity retries.

## 38. Generation Eligibility

Generation eligibility is evaluated server-side against exact current approved inputs, project and shop scope, resource availability and revisions, content-plan requirements, preset and Design DNA state, target theme, price, and blocking validations.

The UI consumes eligibility; it does not declare it. Changes before payment can stale eligibility. Changes after payment never substitute into the pinned order.

## 39. Payment Experience

Payment appears only after the merchant understands the selected direction, composition, important resources, omissions, sensitive confirmations, price, generation behavior, and delivery format.

The merchant explicitly initiates the paid action. Initiated, pending, verified, failed, cancelled, staging-authorized, and refunded states remain truthful and distinct. A staging bypass must be visibly non-production and never pretend that Shopify charged the merchant.

## 40. Generation Request

The merchant must explicitly request generation. Conversational intent may open final review but cannot bypass approval, eligibility, verified payment, or immutable input pinning.

The server resolves authoritative revisions and rejects caller-supplied approval status, snapshots, checksums, resource bindings, payment success, or artifact paths. Idempotent equivalent requests resume or return the existing order rather than duplicate it.

## 41. Theme Generation

Beta uses the real production generation path, not a fake or Beta-only generator. It consumes approved and versioned preset, strategy, content plan, resource snapshot, target theme, and other governed inputs.

Generation is deterministic where required, idempotent, revision-pinned, payment-gated, recoverable, and read-only toward Shopify. Retries reuse the same paid snapshot unless a successor order is explicitly created.

## 42. Generation Validation

Ready status requires the applicable existing package gates: generated JSON and section references, Shopify package structure, supported runtime shape, source preservation, read-only boundary, archive integrity, and Theme Check.

Validation failures remain failures and produce no misleading successful artifact. Beta does not promise a universal Lighthouse score without measured evidence, but accessibility, package validity, and core interaction quality remain launch criteria.

## 43. Generated Artifact

The generated artifact is immutable and associated with authorized merchant and shop scope, project, order, generation, exact input snapshot, target, validation result, provenance, and integrity value where governed.

Later refinement produces a successor artifact. Historical artifacts are not overwritten. Internal snapshots, approval payloads, filesystem paths, and secrets do not belong in Shopify output or the merchant download surface.

## 44. Delivery

Delivery clearly states that the theme is ready, provides authorized download and validation information, identifies the generated version, and explains manual Shopify upload, Preview, and installation steps.

Delivery never implies publication or live-store mutation. Optional refinement or subscription context may be introduced calmly only after the core artifact and its boundaries are clear.

## 45. Download Authorization

Every artifact request revalidates actor, organization where applicable, canonical shop context, project access, order association, artifact allowlist, path confinement, and artifact integrity.

Raw filesystem paths are never exposed. Repeated downloads do not create orders, generations, or charges. Merchant-safe artifacts are separated from internal generation metadata.

## 46. Post-Generation Experience

After delivery, the project remains resumable. The merchant can review and download the current generation, understand whether newer candidate decisions exist, and begin a successor refinement.

The product must not imply that a new Preview revision changed an already downloaded theme. Completion and continued refinement coexist within one durable project.

## 47. Successor Refinement

Post-generation changes create successor Recommendation, Design DNA, Resource Set, content, and Preview state as affected. The prior paid snapshot and artifact remain immutable.

The merchant reviews the successor direction before another generation. Whether that generation is included, subscription-entitled, or separately paid is a commercial decision, not an automatic permission inherited from the first payment.

## 48. Repeat Generation

Every new generated artifact requires an explicit allowed generation action under the current commercial policy. Prior payment never authorizes future automatic generation, installation, update, or publication.

Retries of the same failed paid run are distinct from a successor generation: retry reuses pinned inputs and does not recharge; successor generation uses newly approved inputs and its own order or entitlement lineage.

## 49. Persistence

Beta-critical canonical state is durable: conversation submissions, merchant Understanding, Recommendation, Design DNA, Recommended Resource Set, approvals, content plans, Preview revision identity and staleness, orders, payment records, generation state, and artifacts.

Business truth never exists only in React memory. Noncritical unsent drafts and panel preferences may use a lighter persistence tier, but their loss must not alter canonical outcomes.

## 50. Resume

Refresh, browser closure, sign-out, session expiry, and later return restore the latest authorized server state and smallest valid next action. On re-entry, Calinium resolves shop and project identity, current revisions, staleness, active payment or generation, and delivery outcome.

It does not restart onboarding when a resumable project exists or replay a completed transaction. Unsubmitted local edits may require explicit autosave if Beta chooses to preserve them across devices.

## 51. Revision History

Beta preserves enough revision lineage for safe correction, current-versus-approved distinction, Preview staleness, approval binding, generation provenance, and successor work.

The merchant does not need a Git-like interface. History surfaces meaningful versions and consequences while immutable approvals, orders, snapshots, generations, and artifacts remain auditable.

## 52. Undo and Redo

Beta requires revision-based undo for the most recent reversible change to the current mutable design candidate, with clear impact and stale-state handling. It never performs DOM-only reversal.

Undo and redo never alter payment records, approved historical revisions, paid snapshots, completed generations, or artifacts. Whether Beta supports multi-step project-wide undo, redo after divergent edits, or conversation-message editing remains a Beta-required decision before the refinement implementation is finalized.

## 53. Staleness

Meaningful staleness is domain-scoped and reasoned. Changed merchant intent, resources, Shopify inventory, preset or registry versions, runtime capability, and dependent approvals may stale only affected current objects.

A stale Preview is visibly stale and cannot be approved or presented as current. Historical paid snapshots and artifacts remain truthful records of their original inputs.

## 54. Shopify Change Handling

Changes to products, collections, files, menus, theme context, and other supported Shopify resources affect current or future dependent work, never past generation history.

Calinium recalculates affected slots and compositions or reports the required review. It never silently replaces an approved resource. Refresh frequency and whether project re-entry automatically refreshes Shopify observations must be decided before private Beta.

## 55. Failure Behaviour

Failures remain local. Preview failure leaves conversation and approved state usable; optional website failure leaves Shopify intake usable; resource refresh failure preserves prior valid state; analytics failure does not block; generation failure preserves project, payment, pinned inputs, and prior artifacts.

Merchant messages are calm, specific about impact, and actionable. They never expose stack traces, credentials, raw validator payloads, or internal paths.

## 56. Recovery Behaviour

Beta supports safe retry and resume without duplicate payment, order, approval, generation ownership, or loss of valid project state. Recovery rechecks authorization and authoritative server status.

Completed work is returned rather than repeated. Retry uses immutable pinned inputs. A failure that requires changed content creates successor approval or order state instead of mutating history.

## 57. Loading and Progress

Calinium communicates real statuses such as Learning your store, Thinking, Preparing your Preview, Updating your design, Generating your theme, and Validating your theme.

Conversation remains responsive during unrelated work. No fake percentage or artificial progress is shown. Streaming or polling events are ordered, deduplicated, resumable, bounded, and accessible; the exact transport is a technical decision required before implementation.

## 58. Accessibility

Beta targets WCAG 2.2 AA across the critical journey. It requires keyboard operation, logical focus, accessible composer and decision controls, labeled Preview and device controls, non-color-only status, restrained live regions, reduced motion, zoom and reflow, and mobile operability.

Streaming updates must not steal focus. Preview visual changes need accessible status or summaries. Automated checks supplement rather than replace manual keyboard and assistive-technology-oriented validation.

## 59. Responsive Application Behaviour

The application is required on Desktop and Mobile. Desktop follows Conversation, dominant Preview, and collapsible Decisions. Mobile uses Chat, Preview, and Review destinations rather than compressed columns.

Tablet must remain generally usable through responsive adaptation, but a dedicated Tablet Preview device is optional. Switching layout or device preserves conversation position, project state, current Preview revision, and reachable critical approvals.

## 60. Performance

Conversation input must remain responsive while intake or Preview work runs. Beta requires partial Preview updates, cancellation of stale work, bounded resource loading, catalog pagination, responsive image handling, lazy loading, and bounded concurrent revisions.

The application must not rebuild the whole Preview for every keystroke or block the shell on optional analysis. Numeric latency, memory, and fidelity gates require measured evidence and are not invented here.

## 61. Security

Launch requires authenticated merchant identity, verified canonical Shopify shop identity, project and organization isolation, server-authoritative approvals and eligibility, immutable input binding, protected artifact access, secret isolation, CSRF and embedded-session protections, and safe error handling.

Cross-shop or cross-project leakage, caller substitution, approval bypass, token exposure, or unverified payment success is a hard blocker. Analytics and UI state never grant authority.

## 62. Shopify Write Boundaries

Beta generation and Preview are read-only toward the merchant's Shopify store. Calinium does not automatically upload, install, publish, modify, or update a theme; change products, collections, inventory, menus, or policies; submit forms or checkout; or mutate a live cart.

Generating and downloading a validated ZIP is not a Shopify mutation. Any future write capability requires a separate approved contract, scope, consent, and security review.

## 63. Privacy

Beta never exposes Shopify access tokens, client secrets, encryption or session secrets, private filesystem paths, raw resource snapshots, unnecessary Admin API data, or another merchant's information.

Raw sensitive conversations, claims, website content, and resource payloads are not logged or sent to analytics by default. Public availability does not remove consent, rights, provenance, retention, or deletion obligations.

## 64. Analytics

Beta analytics measure journey outcomes rather than merchant content. Useful events include project start and resume, intake completion, first Preview, recommendation and Resource Set presentation, approval, refinement, eligibility, payment, generation, artifact download, return, and successor refinement.

No vendor is required by this contract. Events exclude raw messages, URLs, claims, resources, customer data, credentials, and chain-of-thought. Client intent is not counted as server-confirmed success.

## 65. Beta Commercial Boundaries

Custom theme generation requires an explicit merchant paid action. This specification does not establish a price, subscription entitlement, refund policy, included corrections, or successor-generation price.

Recurring subscription functionality is not required for initial Beta. Payment never grants permanent generation or automatic-update permission. Environment-specific providers and staging behavior must remain truthful, isolated, and validated before use.

## 66. Beta Required Capabilities

The definitive Must Ship set is:

- authenticated Shopify merchant and canonical shop identity;
- durable, correctly shop-bound project with resume;
- Quick Start with access to existing detailed decisions;
- automatic Shopify merchant intake and store intelligence;
- adaptive project-scoped conversation, bounded delegation, correction, and minimum revision-based undo;
- merchant Understanding;
- eligibility-first primary Recommendation using the six presets;
- normalized, versioned Design DNA;
- Recommended Resource Set with efficient ordinary approval and separate sensitive confirmation;
- truthful approved content and omission behavior;
- Homepage Live Preview in Desktop and Mobile;
- Thinking, Provisional, Approved, and Generated states;
- conversational refinement, Preview revisions, partial updates, and staleness;
- federated canonical approvals and domain readiness;
- server-authoritative generation eligibility;
- explicit verified payment and immutable paid-input pinning;
- real deterministic, idempotent, read-only generation;
- package validation and Theme Check;
- immutable authorized artifact and download;
- persistence, return, representative failure recovery, and post-generation successor refinement;
- WCAG 2.2 AA-oriented critical-flow validation; and
- security, privacy, project isolation, and no Shopify write boundary.

## 67. Beta Optional Capabilities

These improve private Beta but do not block it when the required path is coherent:

- a distinct Guided Mode;
- a polished redesigned Advanced shell beyond access to the current detailed flow;
- dedicated Tablet Preview;
- Product and Collection live Preview;
- alternative preset Preview and before/after comparison;
- simulated cart or search visual states without real mutation;
- rich multi-revision history UI beyond required correction and lineage;
- multi-step redo and broad project-wide undo;
- optional public website analysis when consent and rights are resolved;
- expanded analytics and external notifications; and
- subscription presentation after Delivery.

Optional capabilities must not weaken required state, approval, truth, performance, or accessibility behavior.

## 68. Explicitly Deferred Capabilities

Post-Beta scope includes automatic theme installation, publication, or update; real checkout or live cart mutation in Preview; full Shopify Theme Editor replacement; arbitrary Liquid, CSS, HTML, JavaScript, or code generation; unrestricted copywriting; generic attachments and image analysis; voice interaction; multi-user real-time collaboration; cross-project learning; broad multi-shop management; project duplication, archive, and deletion workflows; public marketplace checkout in the initial conversation; autonomous recommendations that self-modify; and support beyond approved runtime capabilities.

Deferral is not implied future authorization. Each capability requires its own contract and trust review.

## 69. Beta Prohibited Behaviours

Beta prohibits fabricated facts, products, resources, reviews, testimonials, biographies, claims, awards, certifications, prices, discounts, statistics, evidence, and product relationships; hidden or umbrella approvals; automatic payment or generation; automatic Shopify upload, installation, publication, or update; silent approved-resource replacement; cross-shop or cross-project leakage; stale Preview presented as current; Provisional or Approved Preview presented as Generated; UI-only canonical truth; free-form AI DOM or runtime mutation; duplicate charge or generation after retry; historical artifact mutation; forcing Quick Start through every internal stage; asking questions Shopify already answers; raw scoring or chain-of-thought exposure; and fake progress.

Any prohibited behavior observed in the core journey blocks launch.

## 70. Current Implementation Mapping

The following mapping is based on narrow repository inspection and does not substitute for executed Beta validation:

| Beta capability | Status | Evidence-based summary |
| --- | --- | --- |
| Embedded authentication and canonical shop identity | Implemented | App Bridge token, audience, expiry, destination, issuer, allow-list, and canonical `.myshopify.com` checks exist. |
| Actor, organization, project, and session isolation | Implemented | Durable memberships, project authorization, database-backed sessions, and project-scoped Creative Director state exist. |
| Durable project and committed-state resume | Implemented | Existing project sessions reload and committed actions persist across service instances. |
| Automatic project binding to authenticated shop | Partially implemented | Embedded shop connection is created or reused, but new project creation does not reliably bind it and later UI may ask for the domain. |
| Legacy Creative Director detailed workflow | Implemented | The visible stage wizard, stage guards, approvals, content plans, generation offer, and delivery exist. |
| Quick Start | Missing | No Quick Start state or Conversation/Preview/Decisions experience exists. |
| Guided and explicit Advanced modes | Partially implemented | No mode state or switch exists; the legacy wizard supplies an Advanced-like detailed foundation only. |
| Conversation | Partially implemented | One-at-a-time fixed questions, delegation phrases, transcript persistence, and corrections exist; Shopify-informed adaptive refinement does not. |
| Automatic Merchant Intake | Missing | Shopify synchronization is manual and late; no first-answer store-learning orchestration was found. |
| Preset recommendation | Partially implemented | Six deterministic presets, alternatives, selection, stale guards, and immutable approval exist; complete eligibility is not applied before ranking. |
| Recommendation Engine | Partially implemented | Compiler and recommendation foundations exist, but no canonical DNA/Resource Set-aware eligibility-first owner exists. |
| Design DNA | Missing | Registries exist, but no normalized versioned DNA object, approval lifecycle, or Preview/generation integration was found. |
| Recommended Resource Set | Missing | Secure individual resource approval exists; ranking, reasons, fallbacks, coherence, confidence, and bulk ordinary approval do not. |
| Approved content plans and resource snapshots | Implemented | Revisioned authoring, immutable approval, server resolution, paid-order pinning, and materialization foundations exist. |
| Homepage Live Preview | Missing | Current Preview uses static late-stage cards; no evolving truthful storefront Preview is populated. |
| Preview revisions, staleness, partial updates, and devices | Missing | No Preview dependency graph, partial patching, stale model, or Desktop/Mobile controls were found. |
| Approval and readiness | Partially implemented | Strong stage approvals and eligibility exist, but approved preset is not an unconditional service-level eligibility requirement. |
| Payment | Partially implemented | Server verification and idempotency are strong; no active staging or production catalog price exists, and live production billing remains unverified. |
| Immutable paid-input pinning | Implemented | Exact strategy, preset, plan, resource snapshot, target, price, purchase intent, and checksums are pinned. |
| Generation and retry | Partially implemented | Real read-only generation and concurrency claims exist; a workspace-producing failure leaves a path that blocks retry. |
| Package validation and Theme Check | Requires validation | Code gates for package, source preservation, runtime shape, archive, and Theme Check exist; private Beta must execute them in the deployed environment. |
| Artifact download | Partially implemented | Authorization, allowlist, path confinement, and no-store delivery exist; download-time checksum verification is missing and internal metadata is allowlisted. |
| Shopify no-write boundary | Implemented | Generation scopes and manifests preserve no upload, publish, or write behavior. |
| Accessibility, responsive behavior, and performance | Requires validation | Individual accessible patterns exist, but the new Quick Start and Live Preview journey does not yet exist to validate. |
| Website context, expanded analytics, and post-generation commercial flow | Intentionally deferred | None is required to begin the bounded core Beta if disabled or clearly limited; their unresolved policies remain explicit. |

## 71. Beta Gap Classification

| Priority | Product gap | Classification reason |
| --- | --- | --- |
| P0 | No active staging or production price in the current catalog | Blocks truthful payment eligibility and complete paid generation in those environments. |
| P0 | Retry after a workspace-producing generation failure reuses an uncleared workspace | Breaks required recovery and can permanently fail the paid run. |
| P0 | Artifact bytes are not integrity-verified at download | Data-integrity boundary is incomplete after generation validation. |
| P0 | Approved preset is not an unconditional service-level order eligibility requirement | Potential canonical-approval bypass must be closed or conclusively disproved before launch. |
| P1 | New embedded projects are not automatically bound to the authenticated shop | Core entry can ask for identity Shopify already established and risks inconsistent resource scope. |
| P1 | Quick Start and the Conversation/Preview/Decisions shell are missing | The core Creative Director experience cannot be completed credibly. |
| P1 | Automatic Merchant Intake is missing | Calinium does not yet learn the store at the promised lifecycle point. |
| P1 | Adaptive canonical Conversation behavior is partial | The fixed interview cannot support the required bounded refinement journey. |
| P1 | Eligibility-first Recommendation and executable Design DNA are missing | The required coherent deterministic direction cannot yet be represented canonically. |
| P1 | Recommended Resource Set and bulk ordinary approval are missing | The largest validated merchant-friction problem remains. |
| P1 | Truthful Homepage Live Preview, four states, partial updates, staleness, Desktop, and Mobile are missing | The merchant cannot see or refine the promised direction before purchase. |
| P1 | Generic Homepage fallback can produce a prohibited adjacency | A fallback must itself be compatibility-valid before recommendation use. |
| P1 | Required end-to-end Beta accessibility, security, payment, generation, and recovery validation has not run | Implementation evidence alone cannot establish private-Beta readiness. |
| P2 | Guided mode and polished Advanced switching are absent | Quick Start can ship without them if the existing detailed flow remains accessible. |
| P2 | Unsent conversation drafts and unsubmitted local edits do not resume | Canonical committed state is safe, but experience continuity is weaker. |
| P2 | Artifact download exposes allowlisted internal metadata and approval timestamps are imprecise | Scoped but unnecessary disclosure and provenance-quality issues should be narrowed. |
| P2 | Persistent-volume backup and recovery are unvalidated | Readiness checks exist, but operational recovery needs private-Beta evidence. |
| P2 | Store intelligence omits broader pages, blogs, policies, and optional website context | The bounded product/catalog path remains viable without these. |
| P3 | Tablet device Preview, comparison, simulated cart, rich history, external notifications, and subscription presentation | Valuable later improvements, not required for core private Beta. |
| P3 | Multi-shop management, multi-project tools, collaboration, cross-project learning, and public marketplace flow | Explicitly outside the bounded Beta. |

P0 and P1 items must be resolved before external private-Beta use. P2 items require an explicit risk decision and must not hide a safety issue. P3 items do not belong in the initial release.

## 72. Beta Acceptance Criteria

Beta acceptance requires evidence that an authorized target merchant can:

1. Open Calinium from a supported authenticated Shopify store.
2. Resolve or create the correct shop-bound project without re-entering Shopify identity.
3. Refresh, close, sign back in, and resume committed canonical work.
4. Trigger automatic authorized store learning after the first meaningful answer.
5. Continue conversation while nonblocking analysis runs.
6. Answer no more than seven essential Quick Start questions and skip already known topics.
7. Use bounded delegation without approving facts, payment, or generation.
8. Correct a prior assumption without restarting.
9. Receive one eligibility-valid coherent recommendation and no irrelevant alternatives.
10. Receive normalized Design DNA consistent with the selected preset and runtime.
11. Receive a Recommended Resource Set made only from eligible real resources.
12. Approve ordinary resources efficiently and change one slot without reopening unrelated slots.
13. Confirm sensitive facts individually or omit them safely.
14. See a truthful Homepage Preview before payment.
15. Distinguish Thinking, Provisional, Approved, and Generated states.
16. Switch Desktop and Mobile without changing canonical business state.
17. Refine the design conversationally through validated canonical decisions.
18. Observe dependency-scoped Preview updates and stale-state warnings.
19. Undo the most recent reversible current-candidate refinement without altering immutable history.
20. Review the exact direction, resources, omissions, price, generation behavior, and delivery boundary.
21. Explicitly approve every required canonical subject at its current revision.
22. Reach server-authoritative generation eligibility.
23. Explicitly initiate and complete the applicable verified payment flow.
24. Produce exactly one paid order and one owned generation despite duplicate clicks or callbacks.
25. Pin exact approved immutable inputs and reject caller substitution or drift.
26. Generate through the real read-only pipeline and recover from a representative retryable failure.
27. Pass generated-theme validation and Theme Check in the deployed Beta environment.
28. Receive one immutable merchant-safe artifact tied to the paid generation.
29. Download the artifact through current authorization and integrity verification.
30. Confirm Shopify theme source and live store remain unchanged.
31. Leave and return to the generated project and artifact.
32. Create successor refinement state without mutating the prior artifact or order.
33. Complete critical keyboard, screen-reader-oriented, reduced-motion, zoom, mobile, and responsive checks.
34. Reject unauthorized shops, cross-project resources, stale approvals, unverified payment, and unauthorized artifact access.
35. Observe truthful localized recovery for intake, Preview, resource, payment, generation, and analytics failures.

Acceptance is outcome-based. Passing isolated unit tests cannot replace the complete controlled merchant journey.

## 73. Beta Launch Blockers

Hard launch blockers are:

- failed or bypassable merchant, shop, organization, project, or artifact authorization;
- cross-shop or cross-project leakage;
- secrets or private runtime data exposed to the client or package;
- unreliable payment verification, absent purchasable environment price, duplicate-charge risk, or staging represented as a real charge;
- canonical preset, content, resource, approval, or eligibility bypass;
- duplicate or unrecoverable generation after a retryable paid failure;
- invalid, mutable, unscoped, or integrity-unverified generated artifacts;
- generator or Theme Check failure producing a ready status;
- fabricated or automatically approved sensitive facts;
- absence of the required automatic intake, Quick Start, Resource Set, or truthful Homepage Preview experience;
- Provisional or stale Preview represented as current generated truth;
- loss of committed work on normal refresh, session recovery, or return;
- live Shopify mutation by Preview or generation; and
- inability to download the validated artifact reliably.

Nonblocking polish includes richer animation, Tablet device Preview, comparison, expanded history, Guided explanations, optional website context, subscription presentation, and broad analytics—provided their absence does not obscure status, consent, recovery, or accessibility.

## 74. Private Beta Validation Plan

Use a small, controlled set of supported real Shopify stores and named merchant participants. Validate first entry, canonical shop and project resolution, automatic intake, adaptive conversation, recommendation, Design DNA, Resource Set, Homepage Preview, Desktop/Mobile switching, refinement, approval, payment, generation, validation, download, refresh/resume, representative failure/retry, return, and successor refinement.

Each journey records objective state outcomes, observed errors, validation artifacts, and merchant-safe qualitative feedback. Representative failure exercises include optional analysis failure, stale resource, stale Preview, payment cancellation, duplicate callback/click, workspace-producing generation failure, artifact-integrity failure, session expiry, and unauthorized cross-project access.

Ask merchants:

- Did Calinium understand your business and store?
- Did any step feel like technical configuration?
- Were the questions necessary?
- Did the Preview help you trust the direction?
- Could you tell what was provisional, approved, and generated?
- Were resource choices and sensitive confirmations clear?
- Did you understand what required approval and what you were paying for?
- Did the generated theme match the approved direction?
- Could you recover and resume without losing confidence or work?

Private Beta does not require arbitrary growth targets. It requires safe completion, truthful expectations, actionable qualitative evidence, and zero unresolved hard blockers.

## 75. Remaining Product Decisions

The governing contracts leave the following deduplicated decisions. **Must resolve before implementation** denotes a Beta-blocking architecture decision; **Must resolve before private Beta** denotes a Beta-required decision; **Can be decided during Beta** is non-blocking for Beta; and **Post-Beta** is outside initial scope.

| Resolution timing | Decision |
| --- | --- |
| Must resolve before implementation | Exact Beta Preview renderer, Approved/Generated fidelity boundary, and parity validation. |
| Must resolve before implementation | First Preview timing and minimum Recommendation, Design DNA, content, and Resource Set readiness. |
| Must resolve before implementation | Exact first-launch composition and when the durable Quick Start project is created. |
| Must resolve before implementation | Canonical pre-preset intent → preset → normalized DNA → Preview revision lifecycle. |
| Must resolve before implementation | Whether preset and Design DNA share one explicit Quick Start approval event and which ordinary Medium-confidence decisions may join it. |
| Must resolve before implementation | Minimum revision-based undo scope, divergent redo behavior, stale-response suppression, and multi-intent atomicity. |
| Must resolve before implementation | Authenticated resumable status transport and event-resume model. |
| Must resolve before private Beta | Active price and provider behavior for development, staging, and production; live verification requirements. |
| Must resolve before private Beta | One-versus-multiple project routing per shop, project naming, and safe resume selection. |
| Must resolve before private Beta | Shopify refresh cadence, re-entry refresh behavior, material staleness thresholds, and candidate reranking policy. |
| Must resolve before private Beta | Artifact retention, download lifetime, storage recovery, and integrity policy. |
| Must resolve before private Beta | Rights, alt text, video accessibility, responsive suitability, and performance eligibility for Resource Set assets. |
| Must resolve before private Beta | Accessibility and fidelity thresholds that constitute a Preview launch gate. |
| Can be decided during Beta | Guided Mode availability, polished Advanced mode, explanation depth, confidence visibility, alternatives shown by default, and Decisions-panel behavior. |
| Can be decided during Beta | Exact desktop proportions, resizable panels, device-control timing, Tablet Preview, Product/Collection Preview, alternative Preview, and comparison. |
| Can be decided during Beta | Included corrections, post-generation refinement pricing, repeat-generation commercial policy, and subscription presentation, provided successor generation remains explicit. |
| Can be decided during Beta | Expanded analytics implementation and external notification channels. |
| Can be decided during Beta | Optional public website analysis, screenshot retention, website resource import, and website-fact review remain disabled until consent and provenance are resolved. |
| Post-Beta | Unrestricted copy rewriting, generic attachments/image analysis, voice, simulated cart beyond visual-only needs, and broad page Preview. |
| Post-Beta | Project archive/delete/duplication, multi-shop UI, team collaboration, cross-project preference learning, and multi-market variants beyond current safe support. |
| Post-Beta | Public Premium Theme marketplace integration in the Creative Director flow. |
| Post-Beta | Automatic Shopify theme installation, upload, publication, or updates; these require a new explicit product and security contract. |

These decisions do not reopen settled truth, approval, payment, immutability, security, or no-write rules. Product architecture is sufficiently complete to start implementation while decision owners resolve the implementation-timed items.

## 76. Implementation Readiness

The canonical product contracts are sufficiently complete to stop broad product-architecture work and begin focused Beta implementation. The required merchant outcome, ownership boundaries, truth rules, state and revision model, payment and generation integrity, Preview states, security constraints, required/optional/deferred scope, blockers, and acceptance outcomes are explicit.

The first implementation domain should be **paid-generation integrity hardening**. It must clear the active-price, retry-workspace, preset-eligibility, and artifact-download integrity blockers before new merchant-facing orchestration depends on that completion path.

After that domain is safe, implementation can proceed against the P1 product-promise gaps without inventing new requirements. Open renderer and interaction decisions must be resolved at the point their domain begins, but they do not require another broad product-architecture phase.

**Readiness: Ready to begin Beta implementation with non-blocking product decisions**
