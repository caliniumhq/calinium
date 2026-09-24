# Calinium Conversation Engine

## 1. Purpose

This document is the canonical product contract for the Calinium Conversation Engine: the merchant-facing control layer that turns natural-language intent into safe, bounded, revision-aware work across the existing Creative Director architecture.

It defines conversational behavior, turn orchestration, intent handling, questioning, routing, correction, refinement, approval language, context, memory, streaming, persistence, recovery, safety, and Beta limits. It does not define prompts, model providers, APIs, schemas, components, storage tables, or implementation code.

The Conversation Engine exists so a merchant can describe outcomes in their own language while authoritative domain owners continue to govern facts, recommendations, resources, design, approvals, payment, generation, and delivery.

## 2. Governing Product Contracts

This contract is subordinate to and consistent with:

- `customer-journey.md` for the simplified merchant journey, modes, payment moment, and delivery boundary;
- `ai-creative-director-interaction-design.md` for Conversation, Preview, Decisions, message presentation, responsive interaction, and recovery;
- `ai-behaviour.md` for permanent Creative Director behavior, truth, confidence, questions, corrections, approval, and tone;
- `automatic-merchant-intake.md` for source-aware understanding and the Merchant Question Engine;
- `recommended-resource-set.md` for resource eligibility, ranking, approval, snapshots, and staleness;
- `design-dna.md` for bounded visual intent and conversational design normalization;
- `recommendation-engine.md` for eligibility, coherent recommendation, alternatives, approval, and recalculation;
- `live-preview-engine.md` for Preview ownership, revisions, partial updates, and fidelity labels;
- `component-and-state-contract.md` for component ownership, canonical state, commands, events, streaming, persistence, and responsive presentation.

Where this document describes an interaction with another domain, that domain's contract remains authoritative. Conversation routes intent; it does not absorb ownership.

## 3. Conversation Engine Definition

The Conversation Engine is a project-scoped, turn-based orchestrator. It preserves merchant wording, determines what kind of response or action the wording calls for, normalizes actionable intent into bounded meaning, assembles only relevant authorized context, and routes the result to the correct canonical owner.

Conceptually:

```text
merchant message
→ authenticated project context
→ intent understanding and ambiguity check
→ answer, ask, recommend, refine, correct, reject, approve, recover, or no-op
→ owning-domain validation
→ canonical revision when applicable
→ authoritative events
→ affected Recommendation, Design DNA, Resources, Content, or Preview projections
→ concise merchant response
```

The current executable foundation is narrower: a fixed one-question-at-a-time planner, a local message interpreter, project-scoped conversation state and transcript persistence, correction records, server authorization, and a dedicated Conversation stage. Those are useful foundations, not evidence that the complete product contract already exists. In particular, the current flow does not yet provide the general domain router, bounded project-changing intents, cross-domain revisions, or resumable conversation streaming defined here.

## 4. Product Philosophy

Calinium is not a general-purpose chatbot and not a text wrapper around settings. It behaves as an experienced Creative Director who is already studying the merchant's store, forming a point of view, and making useful progress.

It listens for the outcome beneath the words, acts confidently on safe reversible creative judgment, remains humble about uncertain truth, and protects the merchant from unsupported or incoherent changes. It recommends before asking for configuration and explains only what helps the merchant decide.

Conversation should reduce effort without hiding authority. The merchant does not need to know internal stage names, schemas, section types, setting IDs, runtime mappings, resource snapshots, or generator internals. They do need to know what Calinium understood, what changed, what remains provisional, and what requires explicit approval.

## 5. Engine Responsibilities

The Conversation Engine owns:

- receiving and orchestrating discrete merchant turns;
- preserving accepted merchant wording and conversational relationships;
- distinguishing informational, project-changing, approval, recovery, and no-change requests;
- classifying conceptual intent families;
- normalizing free-form language into bounded, source-aware intent candidates;
- estimating intent confidence and detecting consequential ambiguity;
- deciding whether a question is necessary or suppressible;
- recognizing safe delegation, correction, reversal, rejection, and refinement;
- assembling the minimum relevant authorized context;
- selecting the canonical domain owner or owners;
- sequencing compatible multi-intent work;
- presenting concise explanations, confirmations, limitations, and recovery;
- ensuring that accepted canonical outcomes—not free-form text—drive downstream updates.

It may coordinate several owners, but it cannot replace their validation, revision, or approval rules.

## 6. Engine Non-Responsibilities

The Conversation Engine does not own:

- Shopify identity, catalog truth, inventory, pricing, collections, menus, files, themes, or availability;
- merchant facts after normalization, Understanding, or Store Strategy authority;
- Recommendation Engine eligibility, ranking, preset selection, composition, or approval;
- Design DNA normalization or preset-boundary enforcement;
- Recommended Resource Set eligibility, ranking, bindings, approval, or snapshots;
- content/evidence truth, Approved Block Plans, or materialization;
- Preview rendering, Preview fidelity, or Preview approval;
- payment, orders, generation eligibility, generation, packaging, or artifacts;
- direct HTML, CSS, Liquid, JavaScript, Shopify JSON, setting, section, or DOM mutation;
- theme installation, upload, publication, or automatic update;
- cross-project learning or a general customer-support chatbot.

It never treats fluent language as authorization to bypass another system.

## 7. Conversation Lifecycle

The canonical lifecycle for an accepted merchant submission is:

```text
Authenticate actor, project, and canonical shop
→ accept one idempotent turn
→ persist merchant message as pending/accepted conversation state
→ assemble permitted dependency-scoped context
→ classify and normalize intent
→ assess confidence, ambiguity, source authority, and safety
→ decide whether to answer, ask, route, or preserve state
→ route any bounded intent to its canonical owner
→ owner validates scope, expected revision, eligibility, and consequences
→ commit a canonical candidate or approval only when accepted
→ emit authoritative events
→ update affected projections and Preview dependencies
→ respond with the outcome, uncertainty, or recovery path
```

A conversational response may complete without a business-domain revision. A domain rejection leaves canonical project state unchanged. No turn is considered applied because text streamed or the client displayed an optimistic change.

## 8. Conversation State

Conversation state owns the transcript and orchestration facts needed to understand the dialogue:

- accepted merchant, Calinium, and system-status messages;
- message role, order, status, and relationship to the current question or prior correction;
- current conversational question or clarification;
- pending turn status and conversation-local pagination position;
- links from a turn to resulting canonical commands, outcomes, or failures;
- correction, reversal, and supersession relationships;
- concise conversational summaries used for bounded context.

It does not own normalized merchant facts, recommendations, DNA, resources, content, Preview, approval, payment, generation, or cross-domain stream cursors. An unsent draft is project-matched client state until accepted. Raw transcript content is evidence of what was said, not automatically the current canonical truth.

## 9. Turn Model

Every merchant submission is one discrete turn with one identity, expected project context, submission status, and outcome. Conceptual turn outcomes are:

```text
conversation_only
question
clarification
recommendation
project_change
approval_request
refinement
rejection
no_op
error_recovery
```

One turn may contain several closely related intents only when they share compatible authority, can be validated together, and have a clear atomic outcome. “Make the hero shorter and remove the newsletter” may form one coordinated design/composition candidate. “Change the hero, buy the theme, and publish it” crosses design, payment, generation, and prohibited publication boundaries; the engine must separate or refuse those parts rather than grant a compound mutation.

A turn records whether it changed conversation only, proposed a candidate, committed a validated domain change, requested approval, or failed. This distinction prevents a friendly reply from masquerading as accepted work.

## 10. Message Types

Conversation presents four conceptual message types:

| Type | Purpose | Authority |
| --- | --- | --- |
| Merchant message | Preserve what the merchant submitted | Evidence of wording and intent; not automatically normalized truth |
| Calinium message | Ask, answer, recommend, explain, confirm, or recover | Conversational guidance; not canonical state by itself |
| System status message | Report concise authoritative work status | Projection of real domain state; never simulated personality |
| Structured decision message | Summarize a bounded current decision and available action | Projection and command surface; approval remains with the owner |

Messages never expose raw schemas, runtime IDs, JSON, checksums, internal paths, secrets, chain-of-thought, or unrestricted activity logs. Pending, accepted, failed, stale, and superseded states remain distinguishable.

## 11. Merchant Message

A merchant message preserves the submitted wording, project scope, order, and relationship to any question, selected Preview region, decision, or correction context. Whitespace-only input is not meaningful. A greeting can receive a conversational answer but does not become business understanding.

The engine interprets what the message establishes. “I sell handmade leather bags” contains a business-offer statement and a sensitive handmade claim candidate; it does not allow the claim to bypass confirmation. “Make it feel handmade” is a visual preference, not production evidence.

An accepted message remains in history even when corrected later. Whether an old message can be edited directly is open; until that is resolved, changes append a correction or successor turn rather than rewriting the transcript.

## 12. Calinium Message

A Calinium message has one useful purpose at a time: acknowledge a material answer, ask one necessary question, present one recommendation, explain one consequence, report one outcome, or offer one recovery path.

It is calm, concise, merchant-facing, and proportional to the moment. It does not narrate every internal action, display a settings dump, ask several unrelated questions, or claim that a candidate was accepted before the owner confirms it.

When a domain command succeeds, the message states what changed and what was preserved. When no mutation occurred, it avoids change language. When a request is unsafe or unsupported, it declines the unsafe interpretation and offers the nearest truthful alternative.

## 13. System Status Message

System status messages report real work such as store learning, recommendation preparation, Preview update, payment verification, or generation progress. They are projections of owning-domain events, not conversation-generated claims.

Status is restrained and qualified: Waiting, In progress, Complete, Skipped, Needs attention, Failed, Stale, Provisional, Approved, Generating, Ready. One domain's Complete never promotes another domain.

Frequent task events belong in compact status surfaces rather than flooding the transcript. Status never uses fake percentages, countdowns, typing indicators as work proof, or optimistic success while disconnected.

## 14. Structured Decision Message

A structured decision message makes one reviewable decision understandable without exposing implementation detail. It may show:

- the current merchant-facing choice;
- whether it is Provisional, Recommended, Needs review, Approved, Omitted, Stale, or Blocked;
- a concise grounded reason;
- the source category;
- what will change and remain unchanged;
- an eligible change, explain, approve, reject, or open-detail action.

The message is not a new decision owner. An inline approval action must identify the exact current revision and invoke the canonical approval workflow. Viewing, expanding, reacting positively, or continuing the conversation never constitutes approval.

## 15. Intent Understanding

Intent understanding determines what the merchant is trying to accomplish and what authority that purpose requires. It distinguishes explicit facts, subjective preferences, questions, delegations, corrections, approval language, rejection, status requests, and actions.

Understanding is context-aware but conservative. It uses the current question, recent relevant turns, selected decision/Preview context, canonical current state, and source authority. It does not rely on transcript volume, industry stereotypes, visual inference, or model fluency to promote a weak interpretation.

One sentence may establish more than one candidate meaning. Each meaning keeps its own source, confidence, sensitivity, affected domains, and validation requirement.

## 16. Intent Categories

The engine recognizes these conceptual behavioral families:

```text
business_information
audience_information
brand_preference
design_preference
resource_preference
layout_refinement
composition_refinement
content_correction
resource_correction
approval
rejection
delegation
explanation_request
status_request
generation_request
undo
redo
mode_change
general_question
```

These are product concepts, not a runtime enum or schema. A turn may contain related families, but each remains traceable to its proper owner and consequence. Unknown or unsupported intent does not fall through to arbitrary execution.

## 17. Intent Normalization

Normalization converts free-form language into bounded merchant intent without directly selecting implementation values.

For example:

```text
“Make it feel more premium.”
→ increase perceived premium character
→ candidate effects: hierarchy, spacing, typography emphasis, media restraint, motion restraint
→ owner: Design DNA, with Recommendation re-evaluation only if a preset boundary is crossed
```

```text
“Show more products.”
→ increase commerce emphasis in eligible areas
→ candidate effects: product/grid density, relevant composition, performance checks
→ preserve: product identity and unrelated content unless explicitly changed
```

Normalization records the merchant's original words, intended outcome, candidate scope, confidence, conflicts, sensitive implications, and required owners. Existing bounded domains choose valid values. No normalized intent is raw CSS, Liquid, JSON, section ID, setting ID, handle, or resource binding.

## 18. Intent Confidence

Intent confidence uses the governing deterministic bands:

| Level | Behavioral response |
| --- | --- |
| High | Proceed with a reversible validated interpretation; keep the outcome visible and reviewable |
| Medium | Proceed when safe with a brief interpretation, or ask one question when consequences are material |
| Low | Ask one concise clarification before consequential change; otherwise preserve current state or omit |
| Unknown | Do not guess; ask only if required, or take no project action |

Confidence concerns interpretation of this turn, not truth, approval, eligibility, or the merchant. Sensitive claims require confirmation at every confidence level. Exact thresholds and merchant visibility remain open; raw numeric confidence is not shown under this contract.

## 19. Ambiguity Detection

Ambiguity is material when two plausible interpretations would change different canonical decisions, produce meaningfully different storefront outcomes, affect approval, or cross a safety boundary.

“Make it darker” can proceed when current context clearly concerns the storefront's visual direction. “Change the product” usually needs clarification when hero, featured, bundle, and Preview product roles coexist. “Remove that” needs a referent unless a selected region or immediately preceding decision makes it unambiguous.

Imperfect grammar, brevity, or nontechnical language is not by itself ambiguity. The engine asks the minimum contrast needed and preserves current state while awaiting the answer. It does not present a broad settings menu as clarification.

## 20. Question Strategy

Calinium asks only when:

- consequential merchant intent remains materially ambiguous;
- a merchant-owned preference or business truth is genuinely unresolved;
- a sensitive claim requires exact confirmation;
- required information cannot be inferred from an authoritative source;
- authoritative inputs conflict and the merchant owns the disputed meaning;
- no safe reversible default, omission, or current answer permits progress;
- a required resource role needs an explicit eligible choice.

Questions are singular, concise, outcome-oriented, and ordered by consequence, information value, and merchant effort. A question should explain why it matters only when that is not obvious.

## 21. Question Suppression

The engine must not ask when:

- Shopify already provides the current store/resource fact;
- an approved answer already resolves the topic;
- a High-confidence ordinary reversible design recommendation is available;
- a Medium-confidence choice can be reviewed naturally later without risk;
- the topic is optional and omission is safe;
- the answer would not affect a current decision;
- the question exists only to fill a profile field or expose implementation.

It must not ask merchants to select theme IDs, section schemas, grid settings, image ratios, setting IDs, raw font values, internal stages, resource revisions, or generator behavior. Those are Calinium and runtime responsibilities.

## 22. Adaptive Questioning

Quick Start is not a fixed questionnaire. The engine recomputes Questions Remaining after each accepted answer, source update, correction, delegation, or omission. Resolved topics disappear; dependent new questions appear only when their consequence becomes real.

Quick Start targets five to seven essential questions at most and fewer when authoritative context is sufficient. Guided may add rationale and comparison, not unnecessary questions. Advanced may expose unresolved details but uses the same question policy.

Only one primary question is active at a time. Closely related answer choices may appear together, but audience, mood, navigation, resources, and content are not bundled into one prompt.

## 23. Merchant Delegation

Phrases such as **You decide**, **Choose for me**, **Whatever you think is best**, and **I don't know** require distinct treatment.

**You decide** delegates an eligible reversible creative judgment. It permits Calinium to select one safe recommendation within existing preset, DNA, resource, content, accessibility, performance, and runtime boundaries. The choice remains reviewable and does not become a fact merely because it was delegated.

**I don't know** records Unknown. It does not delegate and does not create a default factual answer.

Delegation never authorizes business identity, audience truth, factual or sensitive claims, evidence, legal information, pricing, payment, generation, destructive changes, installation, upload, publication, or future automatic updates. The precise boundary for consequential ordinary delegation remains open.

## 24. Inference Behaviour

The engine may infer safe candidate design or organizational intent when evidence supports a reversible interpretation. Examples include likely hierarchy, typography direction, spacing, hero presentation, featured-collection recommendation, layout rhythm, and minimal motion.

It never infers or confirms founder biography, handmade or artisan status, origin, materials, sustainability, certifications, awards, testimonials, reviews, performance, efficacy, customer results, statistics, guarantees, pricing, discounts, legal truth, or product relationships.

Inference remains labeled as interpretation or recommendation until its owner validates and, where required, the merchant approves it. Repetition, visual plausibility, website presence, or industry norms do not upgrade inference to fact.

## 25. Recommendation Behaviour

When a merchant asks Calinium to decide, compare, or improve direction, the engine routes normalized intent and current dependencies to the Recommendation Engine. It does not choose a preset, recipe, section order, or alternative itself.

The conversational response presents one coherent eligible primary recommendation and at most two meaningful alternatives supplied by that owner. It gives concise grounded reasons and material omissions without exposing scores or registry logic.

If a requested direction is ineligible, Calinium explains the practical constraint and nearest eligible alternative. It does not silently accept, randomly redesign, or ask the merchant to choose from every preset.

## 26. Explanation Behaviour

Explanations create informed confidence, not a display of internal reasoning. They answer what Calinium recommends or did, why it matters, what practical effect it has, and any material tradeoff or omission.

Calinium explains proactively when a decision is consequential, surprising, lower-confidence, constrained, stale, unsafe, or likely to invalidate approval. It explains ordinary choices on request. Quick Start stays concise; Guided and Advanced progressively disclose more structured rationale.

Explanations use grounded reason categories and source labels. They never reveal chain-of-thought, hidden scoring, confidential instructions, unrestricted model deliberation, raw schemas, or runtime details.

## 27. Informational Requests

Questions such as **Why did you choose Atelier?**, **What does Provisional mean?**, **What changed?**, or **What is still missing?** are informational. The engine answers from current authorized state and makes no project-domain revision.

The accepted transcript may gain a message, but Recommendation, DNA, Resources, Content, Preview inputs, approvals, payment, and generation remain unchanged. An explanation request cannot be treated as a hidden request to recompute or approve.

If the requested information is unavailable, private, or outside scope, Calinium says so and offers the relevant safe action. It does not fabricate a rationale after the fact.

## 28. Project-Changing Requests

A project-changing request seeks to alter current canonical intent or decisions: **Use Maison instead**, **Make the hero shorter**, **Choose a different image**, **Remove the newsletter**, or **Show craftsmanship earlier**.

The engine must:

1. normalize the intended outcome;
2. identify exact owning domains and expected revisions;
3. detect ambiguity, conflicts, sensitive implications, and stale dependencies;
4. request validation from each owner;
5. commit only accepted candidate changes;
6. preserve unaffected decisions and approvals;
7. explain material consequences;
8. trigger downstream recalculation and Preview updates only from authoritative changes.

Project change is never a direct mutation of the transcript, UI, or theme.

## 29. No-Change Requests

Acknowledgments, greetings, thanks, expressions without an actionable referent, unsupported commands, duplicate requests already satisfied, and requests whose validation fails may produce no project change.

The engine explicitly distinguishes **no action needed**, **no safe action identified**, **already current**, and **action rejected**. It may answer conversationally, ask one clarification, or explain a boundary. It must not manufacture a minor change merely to appear responsive.

A no-change outcome creates no business revision, approval, payment, generation, or Preview revision. It may still record a conversational message and safe outcome reference.

## 30. Conversational Refinement

Conversational refinement follows:

```text
merchant request
→ bounded intent
→ affected canonical owner(s)
→ validation and candidate revision
→ dependency-scoped recalculation
→ partial Preview revision
→ concise outcome explanation
```

The engine preserves stable semantic identities and unaffected approvals. Reordering changes order rather than identity; a media or wording correction preserves identity when meaning remains; genuinely new content or placement receives new identity through its owner.

A high-confidence safe interpretation may prepare a Provisional candidate. Whether some such changes apply immediately or require preview-first confirmation is open. No refinement mutates an immutable approved revision or paid-order pin.

## 31. Design Refinement

Design language routes through Design DNA. **Warmer**, **more premium**, **less busy**, **more technical**, **larger hero**, and **less motion** identify affected bounded visual dimensions; they never produce CSS or unsupported settings directly.

Design DNA decides the valid interpretation within the approved preset, strategy, accessibility, performance, and runtime constraints. The Recommendation Engine is reconsidered only when the requested outcome crosses preset or composition boundaries.

The response states the visible effect and material tradeoff. “More premium” can change restraint and hierarchy but cannot create luxury, quality, scarcity, or pricing claims.

## 32. Resource Refinement

Requests such as **Use this image instead**, **Show the black bag first**, or **Choose another collection** route to the Recommended Resource Set and relevant content/composition owners.

The engine may identify the intended role from current selection context. The resource owner resolves eligible project-scoped alternatives, exact identity, revision, availability, suitability, approval, fallback, and staleness. The client or conversation cannot supply a trusted binding through a filename, title, handle, URL, or free-form description.

Replacing an approved resource creates a candidate and affected review. It never silently swaps “latest,” reranks unrelated slots, or rewrites the immutable Approved Resource Snapshot used by an existing order.

## 33. Composition Refinement

Requests such as **Put craftsmanship before products**, **Remove the newsletter**, or **Make the homepage more product-focused** route to Recommendation/composition ownership.

The owner validates section availability, semantic purpose, evidence/content/resource sufficiency, preset compatibility, adjacency, order, accessibility, performance, and runtime capability. Calinium never creates an unsupported section, converts one semantic role into another, or rearranges sections arbitrarily.

If valid, only the affected composition and dependencies change. If invalid, Calinium explains the concrete conflict and offers the nearest safe sequence or omission.

## 34. Content Refinement

Content refinement distinguishes merchant-authored text from proposed AI assistance and factual truth. A merchant may provide or correct visible copy. The content/evidence owner preserves exact meaning, source, locale, sensitivity, evidence, identity, placement, and approval requirements.

Calinium does not fabricate titles, excerpts, founder stories, claims, testimonials, captions, alt text, destinations, or evidence to fill a section. Changed sensitive wording requires renewed exact confirmation. Ordinary wording help is not assumed to be authorized for Beta; whether the Conversation Engine may propose copy rewrites remains open.

Content changes create candidate Approved Block Plan work only through the existing content-plan architecture. Conversation never writes runtime block fields or generated theme JSON.

## 35. Merchant Corrections

A correction is a newer explicit statement that supersedes current intent or understanding while preserving history. For example, **Actually, my customers are mostly women** proposes an audience correction; it does not justify further demographic inference.

The engine acknowledges the correction, locates the smallest authoritative fact/preference owner, preserves the earlier message and approved history, and identifies dependent recommendations, DNA, resources, content, and Preview state. Only consequential dependents become stale or recalculate.

Correction does not restart the project or erase unrelated approvals. If a correction conflicts with Shopify truth in a field Shopify owns, Calinium identifies the conflict instead of overwriting the authoritative resource fact.

## 36. Merchant Reversals

A reversal asks to restore an earlier direction: **I changed my mind**, **Go back to the previous design**, or **Use the first hero again**.

When the referent is clear, the engine routes a restore request to the relevant revision owner. When it is unclear, it asks which decision should return. Restoration validates current dependencies and creates or selects an eligible successor candidate; it does not reconstruct state from visible UI or mutate old history.

An earlier candidate may no longer be eligible because resources or capabilities changed. Calinium then explains the constraint and offers the closest current equivalent.

## 37. Merchant Rejections

Rejection language may target a recommendation, resource, content item, Preview direction, or explanation. **I don't like this** is not permission for random redesign.

If context identifies the target, the engine records the rejection with the owner and asks only what is needed to choose a different outcome. If context is unclear, it asks a focused contrast such as **Is it the layout, imagery, or overall style?**

Rejected candidates remain historical and cannot silently return as approved/current. A rejection does not imply approval of an alternative, removal of factual history, payment cancellation, or generation cancellation unless the merchant explicitly requests and the owning workflow permits that action.

## 38. Undo and Redo Behaviour

**Undo that**, **Go back**, and **Redo** operate on editable canonical candidate history, never DOM history or transcript guesswork.

Undo requests restoration of the prior eligible candidate through the owning domains. Redo reapplies an undone transition only when dependencies remain current. A new branch may invalidate the redo path while preserving its history.

Undo/redo never replays or deletes immutable approvals, Approved Resource Snapshots, paid-order pins, charges, completed generation, Generated Preview, downloads, installations, or publications. Their exact conversational scope—one refinement, current candidate, or broader project history—remains open.

## 39. Approval Requests

The engine recognizes explicit approval candidates such as **Use this direction**, **Approve these recommendations**, **Looks good—approve it**, or **Approve the hero**, but it must resolve the exact referent and owning authority before presenting or submitting approval.

Recognition is not approval. The owner revalidates current revision, project/shop scope, eligibility, dependencies, omissions, and stale state. The merchant must see what is included and excluded. A casual **Nice**, **That helps**, silence, navigation, Preview viewing, or **You decide** is not approval.

Ordinary decisions may join an allowed combined review. Preset approval remains explicit under current policy; sensitive content, ambiguous resources, payment, and generation consent remain separate. Whether conversational approval language alone is sufficient or an explicit UI confirmation is always required remains open.

## 40. Sensitive Confirmation

Sensitive confirmation applies to exact factual meaning such as handmade, artisan, founder, origin, materials, sustainability, certification, award, testimonial, review, performance, efficacy, customer result, statistic, legal, guarantee, or external-proof claims.

The engine presents the exact claim, source, evidence status, intended use, and consequence. The merchant confirms or rejects that precise meaning through the governing content/evidence workflow. General design approval, bulk resource approval, payment, website presence, or positive conversation does not confirm it.

If wording changes materially, prior confirmation does not carry forward. If source/evidence is missing, the claim is omitted rather than softened into an implied assertion.

## 41. Truthfulness Rules

The Conversation Engine never invents or embellishes:

- merchant identity, audience, founder story, people, places, or history;
- handmade, artisan, material, origin, sustainability, quality, performance, or efficacy claims;
- testimonials, reviews, awards, certifications, proof, statistics, results, or guarantees;
- products, collections, availability, prices, discounts, scarcity, or inventory;
- product relationships, destinations, campaigns, captions, excerpts, alt text, or screenshots;
- legal, policy, privacy, warranty, or compliance information.

It preserves source and exact meaning, keeps inference separate from confirmation, and never treats imagery, filenames, website copy, preset, industry, or model confidence as evidence. Missing truth produces a question only when necessary; otherwise it produces Unknown or omission.

## 42. Source Authority

Safety, truth, authorization, accessibility, and runtime eligibility are hard gates. Within eligible context, conversational conflicts use field-specific source authority:

```text
merchant-approved explicit facts and preferences
→ Shopify-authoritative store/resource facts
→ approved project resources and immutable snapshots
→ approved Creative Brief and Store Strategy
→ approved preset and Design DNA constraints
→ public website observations
→ deterministic safe fallback
```

The merchant owns business meaning and corrections; Shopify owns current connected-resource identity and availability. Website observations are supplemental and cannot silently override either. When two legitimate sources disagree and ownership is unclear, the conflict remains explicit and receives one targeted question only if consequential.

## 43. Context Assembly

Each turn receives the minimum authorized context necessary for its likely intent. Relevant categories may include:

- authenticated project and canonical shop;
- current question and recent related conversation;
- confirmed merchant facts, preferences, unknowns, and conflicts;
- current recommendation, Design DNA, Resource Set, content, and Preview revision summaries;
- pending approval or generation status relevant to the request;
- exact Shopify facts required for the affected role;
- current expected revisions, permissions, and capability constraints.

Context is dependency-scoped rather than a full-project dump. Sensitive details, raw snapshots, full transcripts, unrelated resources, other projects, tokens, customer data, and internal runtime payloads are excluded. Context availability never changes source authority.

## 44. Conversation Memory

Conversation memory has four distinct layers:

```text
recent conversational context
canonical project facts and preferences
approved decisions and dependencies
historical transcript and revisions
```

Recent context helps resolve references. Canonical facts and approvals determine current truth. Historical material supports audit, correction, and recovery but does not override current state merely because it appeared earlier or more often.

Summaries may bound old conversational material, but they must retain source distinctions, unresolved conflicts, and links to authoritative revisions. A generated summary is not approval and cannot silently change meaning.

## 45. Project-Scoped Learning

Calinium may learn preferences, corrections, delegations, omissions, and interaction context only inside the current project. Repeated requests such as **less motion** may become a current project preference through the appropriate canonical owner.

It does not transfer facts or preferences between merchants or projects during Beta, reinterpret old approved revisions with new behavior, or use analytics as hidden memory. Old paid orders remain pinned to the inputs they purchased.

Future cross-project preference reuse would require transparent consent, inspectability, correction, clearing behavior, and strict exclusion of sensitive facts by default. It is not authorized here.

## 46. Conflict Resolution

Conflicts resolve according to authority, recency within the same authority, eligibility, and revision history—not majority language or model confidence.

Newer explicit merchant intent may supersede older merchant preference: **minimal** followed by **bold and energetic** creates a new preference candidate and affects dependents. It does not overwrite history. Unsupported conversation cannot supersede a current Shopify product identity, approved evidence rule, accessibility constraint, or runtime hard gate.

When eligible goals conflict, Calinium first proposes a coherent reconciliation, such as story-led opening followed by clear product discovery. When no reconciliation exists, it explains the tradeoff and asks which merchant-owned outcome governs. It never averages conflicts into a synthetic fact.

## 47. Domain Routing

Normalized intent routes to existing owners:

| Intent | Canonical owner |
| --- | --- |
| Business facts, audience, preferences, unknowns | Merchant Intake / Understanding |
| Strategy objective and approved strategic direction | Store Strategy |
| Preset, recipe, eligible composition, alternatives | Recommendation Engine and Preset owner |
| Visual character and bounded aesthetic change | Design DNA |
| Resource choice and role assignment | Recommended Resource Set |
| Factual content, evidence, semantic compositions | Content Plan / Approved Block Plan owners |
| Visual representation and selected region | Live Preview Engine; view preference for selection |
| Approval | The exact domain being approved |
| Payment/order | Payment and order owner |
| Generation request/status | Generation owner |
| Delivery/download | Artifact and Delivery owner |

The engine may coordinate dependencies but never duplicates validation or stores competing canonical truth.

## 48. Recommendation Engine Integration

Conversation supplies normalized approved/current merchant intent, corrections, constraints, and explanation requests. The Recommendation Engine determines eligibility, compatibility, primary direction, alternatives, composition, confidence, omissions, fallbacks, and revision impact.

**I want something more editorial** may cause recommendation and DNA recalculation. Conversation does not assume that a preset must change or that editorial content exists. The Recommendation Engine evaluates whether current resources, content, preset boundaries, and runtime capabilities support the request.

Recommendation events return structured outcomes that Conversation can explain. Streamed prose never writes Recommendation state.

## 49. Design DNA Integration

Aesthetic language routes through Design DNA's bounded dimensions. Conversation preserves the merchant phrase and normalized outcome; Design DNA resolves compatible dimension changes, confidence, provenance, fallback, and preset containment.

The engine cannot bypass DNA by authoring arbitrary settings. A request that crosses fixed preset boundaries routes back through Recommendation for a compatible preset candidate. Accessibility, performance, truth, and runtime constraints override aesthetic preference while preserving the merchant's underlying intent where possible.

Only accepted DNA candidates trigger affected Preview work. Approval and revision lineage remain with Design DNA.

## 50. Recommended Resource Set Integration

Conversation may ask to inspect, replace, omit, approve, or explain a resource role. The Recommended Resource Set owns eligibility-before-ranking, source identity, alternatives, fallback, confidence, set review, individual exceptions, staleness, and approval.

Conversation cannot create a resource from a name, filename, handle, GID, URL, or visual guess. It cannot silently replace a stale assignment or approve sensitive evidence through ordinary set approval.

The resource owner returns current role-level outcomes. Approved set revisions reference the single authoritative immutable resource snapshot; paid orders later pin that identity. Conversation exposes only safe merchant-facing status.

## 51. Live Preview Integration

Conversation supplies Preview context only after a canonical owner accepts a decision:

```text
merchant message
→ normalized intent
→ validated canonical candidate/revision
→ declared dependency change
→ Preview revision or partial update
```

Never:

```text
merchant text
→ direct DOM or style mutation
```

Conversation may focus a Preview region or ask about it through UI preference state. It does not own rendering, fidelity, staleness, device state, or Preview approval. Thinking, Provisional, Approved, and Generated remain distinct, and a failed Preview does not erase the accepted canonical change.

## 52. Generation Integration

**Generate it** is a generation intent, not authorization to skip the final review. The engine routes it to the generation eligibility and payment/order owners.

Generation still requires current required approvals, immutable resource/content/design/preset inputs, project/shop scope, explicit paid action, server-verified payment, and exact input pinning. If a prerequisite is missing, Calinium identifies the smallest merchant-facing action. It never silently approves, charges, or uses mutable latest state.

Conversation may report real generation status and offer an eligible retry. It cannot mutate pinned inputs, duplicate a charge/run, upload, install, publish, or update the Shopify theme.

## 53. Streaming Behaviour

Streaming may carry conversational response fragments and project safe status projections. It must never make unaccepted text canonical.

Canonical changes arrive as separate authenticated, project/entity/revision-scoped authoritative events. The client may display a provisional explanation while work continues, but Approved, Paid, Generated, Validated, and Ready appear only after owner confirmation.

Events are ordered, idempotent, bounded, and resumable or refreshable. Duplicate events are ignored; stale revisions cannot overwrite current state; gaps trigger authoritative refresh. Streaming does not steal focus, force scroll, flood live regions, or display fake progress. The exact transport remains open.

## 54. Persistence and Resume

Durable server state preserves accepted transcript messages, conversation orchestration state, normalized canonical outcomes in their owners, correction relationships, pending question, approvals, Preview revision, payment/order, and generation status.

Refresh loads authoritative project state first, then reconciles a project-matched unsent draft and view preferences. An unsent or unaccepted answer returns as an editable draft, never as saved truth. Previously accepted questions are not asked again unless the answer became stale, contradictory, or materially invalidated.

Resume summarizes only useful changes completed while away and restores the current question or review action. It creates no duplicate project, message, candidate, approval, payment, generation, or artifact. Whether drafts persist across devices remains open.

## 55. Concurrency and Stale Turns

Each project-changing turn is evaluated against expected current revisions. Two quick messages, a concurrent Advanced edit, an in-flight recommendation, or a late Preview result may produce overlapping work.

Older work must never overwrite newer authoritative state. The system may cancel stale work, reject it with comparison, or accept independent non-conflicting changes, but it must not silently merge incompatible outcomes. A late informational reply may appear only if still relevant and clearly related to its turn.

Compatible multi-intent operations commit atomically where their owners can guarantee it; otherwise they are sequenced with visible partial outcomes and rollback-free safety. Duplicate submissions are idempotent. Stale approval and generation requests fail before side effects.

## 56. Failure Behaviour

Failures are classified by the affected boundary:

```text
conversation acceptance failure
intent understanding failure
ambiguity or unsupported intent
owning-domain validation failure
dependency or staleness failure
Preview failure
payment or generation failure
```

Calinium says what failed, what remains safe, whether work was saved, and the smallest recovery action. It never blames the merchant, exposes technical errors, claims success to reduce anxiety, weakens validation, or converts an optional failure into whole-project failure.

If no reliable interpretation exists, the project remains unchanged. If a domain rejects a request, the last valid candidate remains current. Conversation failure does not roll back an already accepted owner-domain revision.

## 57. Recovery Behaviour

Recovery starts from current authorized project state, not from client assumptions. It identifies which message, command, revision, Preview update, approval, payment, or generation step actually succeeded.

The engine then offers the smallest safe action: retry message acceptance, clarify intent, retry one dependency, choose an eligible resource, restore the last valid candidate, omit optional content, refresh current state, verify payment, or retry an eligible generation.

Recovery preserves unrelated accepted work and immutable history. Retry means the same intended action with the same current authority and idempotency boundary; resume continues existing work; restart requires explicit merchant intent. No recovery silently substitutes data or duplicates side effects.

## 58. Accessibility

Conversation targets WCAG 2.2 AA.

- Merchant, Calinium, system, and structured-decision messages have distinguishable semantic roles.
- The transcript, current question, composer, suggestions, status, and errors have clear labels.
- Keyboard operation supports reading history, suggested replies, multiline entry, Send, retry, approval routing, and cross-panel context.
- Streaming and new messages do not steal focus or force scroll; **Jump to latest** is available when needed.
- A restrained polite live region announces meaningful milestones, not every token or task event.
- Status never relies on color; errors connect to recovery actions.
- Reduced motion, text resize, zoom/reflow, touch targets, RTL, localization, and screen-reader summaries are supported.
- Clarification and approval language remains understandable without visual Preview access.

## 59. Security and Privacy

Every turn, context read, domain command, event, and result is authenticated, authorized, project-scoped, canonical-shop-scoped, and expected-revision-scoped. Browser identifiers are locators, not authority.

Context and messages never expose access tokens, session secrets, client secrets, encryption keys, cookies, private credentials, customer data, other projects, raw snapshots, caller-controlled approvals/checksums, filesystem paths, stack traces, or hidden reasoning.

The engine follows least-context assembly and does not send unrelated project data to interpretation. Conversation cannot weaken authorization, resource scope, approval, payment, artifact access, or read-only generation. Analytics and support diagnostics exclude raw merchant text by default.

## 60. Analytics

Conceptual events include:

```text
conversation_started
merchant_message_submitted
merchant_message_accepted
question_asked
question_skipped
merchant_delegated
intent_normalized
clarification_requested
refinement_requested
refinement_applied
correction_applied
approval_detected
approval_completed
undo_requested
redo_requested
conversation_failed
conversation_recovered
conversation_resumed
```

Safe properties may include project-safe pseudonymous scope, mode, intent category, confidence band, affected domain category, clarification reason, outcome, latency band, stale/recovery category, and question count. Raw merchant messages, sensitive facts, website content/URL, resource payloads, customer data, tokens, IDs, snapshots, and chain-of-thought are excluded.

Client intent is not server-confirmed success. Analytics never becomes canonical memory or changes recommendations.

## 61. Beta Conversation Scope

Beta must support:

- first business description and project-scoped conversation;
- audience, brand/style intent, primary objective, priority, and avoidance input;
- adaptive questioning with five to seven essential Quick Start questions maximum;
- **I don't know** and bounded **You decide**;
- informational and status questions without project mutation;
- Recommendation explanation and eligible alternative requests;
- Design DNA refinement;
- approved resource replacement and omission;
- composition refinement;
- merchant corrections, rejection, and revision-based undo;
- exact approval-intent detection routed to owners;
- generation intent routed through final review, payment, and eligibility;
- canonical-state-driven Preview updates;
- durable resume, stale-turn protection, scoped failure, and recovery;
- Quick Start, Guided, and Advanced presentation over one project.

Beta does not require unrestricted chatbot behavior, voice, generic attachments or image analysis, AI image generation, autonomous copywriting, arbitrary code/Liquid/CSS editing, multi-agent conversations, cross-project personalization, live Shopify mutation, automatic generation, installation, upload, publication, or theme updates.

## 62. Anti-Patterns

The Conversation Engine rejects:

- asking for information Shopify or current approved state already provides;
- fixed long questionnaires or several unrelated questions at once;
- exposing internal stages, schemas, settings, IDs, or raw reasoning;
- treating every message as a project mutation or every message as informational;
- free-form text directly mutating UI, Preview, runtime, or theme code;
- arbitrary CSS, layout, section, resource, or content generation;
- storing delegation as factual confirmation;
- inferring approval from tone, silence, navigation, or Preview viewing;
- silently overwriting approved decisions or mutable-latest substitution;
- fabricating facts, claims, evidence, products, resources, or copy;
- repeated clarification loops and unnecessary permission asking;
- random redesign after rejection;
- whole-project restart after correction or scoped failure;
- raw transcript history overriding canonical current state;
- streamed prose mutating Recommendation or approval;
- duplicate payment/generation from conversation retries;
- automatic Shopify installation, upload, publication, or update.

## 63. Open Product Decisions

These questions remain unresolved and require product evidence, architecture evidence, merchant research, accessibility/privacy review, or founder judgment:

1. What deterministic thresholds define High, Medium, Low, and Unknown intent confidence by intent family?
2. Which High-confidence reversible conversational changes may prepare or apply a candidate immediately, and which must be previewed before acceptance?
3. How much rationale appears automatically in Quick Start, Guided, and Advanced?
4. Can merchants edit an old message, and does that action append a correction, fork candidate history, or create another successor relationship?
5. What exact scope governs conversational undo/redo: one refinement, the current candidate, or broader project history?
6. Can explicit conversational approval language complete an owning approval, or must a dedicated confirmation control always follow?
7. May Quick Start combine preset/DNA acceptance with another explicit approval action, and which Medium-confidence ordinary choices may join it?
8. What exact boundary makes **You decide** safe for consequential ordinary design decisions?
9. Does an unsent conversation draft persist across devices, and what revision comparison is required?
10. May website observations be discussed before merchant acceptance, and can website facts ever become review candidates?
11. May the Conversation Engine propose merchant-copy rewrites in Beta, and what approval/evidence rules would apply?
12. Do attachments or image analysis enter Beta, and under which resource, rights, privacy, and truth contracts?
13. Which authenticated resumable streaming transport and cursor model fits the existing server architecture?
14. How are atomic multi-intent turns represented when several domain owners participate?
15. How long should conversation-local context remain unsummarized, and what provenance must summaries retain?
16. How should stale late Calinium responses be presented or suppressed when newer intent has superseded them?
17. May future consented preference learning cross projects, and how is it viewed, corrected, or cleared?
18. Does voice enter post-Beta, and what confirmation/accessibility boundary would it require?

No open decision may be answered silently through model behavior, prompt changes, component convenience, or implementation defaults.

## 64. Implementation Readiness

This contract is ready to govern the Merchant Lifecycle product contract and a later focused Conversation Engine technical architecture. It defines turn and message models, bounded intent, adaptive questions, delegation, informational-versus-changing behavior, refinement, correction, approval language, truth, source authority, context, memory, routing, revisions, Preview/generation integration, streaming, persistence, concurrency, recovery, accessibility, security, analytics, and Beta limits.

The existing code provides a useful project-scoped foundation: a conversation state, one-question planner, message interpretation seam, transcript persistence, correction records, stage guards, server authorization, and a basic Conversation screen. It does not yet satisfy this complete contract. Future technical work must map the richer orchestration onto existing owners without turning the transcript into truth, duplicating domain logic, weakening immutable revisions, or replacing current approval paths.

Before implementation, technical architecture must preserve the unresolved confidence, approval-language, edit-history, undo, multi-intent, context, streaming, and attachment decisions explicitly. No implementation may infer authority from fluent text, mutate Shopify, bypass explicit paid generation, or claim that a Preview or generated result exists before its owner confirms it.

**Readiness: Ready for Merchant Lifecycle product contract**
