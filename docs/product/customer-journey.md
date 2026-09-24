# Calinium Customer Journey

## 1. Purpose

This document is the canonical product contract for the merchant-facing Calinium journey. It defines how the existing Creative Director, approval, generation, and delivery systems should feel when presented as one coherent collaboration with an experienced creative director.

The contract separates the experience a merchant sees from the internal stages Calinium uses to produce safe, deterministic work. Quick Start and Guided may orchestrate or combine internal stages, but they do not remove, weaken, or replace them. Advanced preserves direct access to the detailed workflow.

The primary outcome is not simply a generated theme package. It is a storefront that reflects what the merchant intended, uses only approved merchant truth and resources, and remains under the merchant's control through payment, generation, installation, publication, and every later update.

This is a product-design document only. It does not authorize interface implementation, website crawling, preview rendering, generator changes, Shopify scope changes, or theme deployment.

## 2. Product Promise

Calinium acts as the merchant's AI Creative Director. The merchant explains the business in ordinary language; Calinium learns from the connected Shopify store, asks only the questions that matter, begins forming a visual direction early, recommends a coherent design, and makes every important decision reviewable.

The experience should deliver four promises:

1. **Understood:** Calinium reflects the merchant's business, audience, priorities, and taste accurately before asking for approval.
2. **Directed:** Calinium leads with a considered recommendation rather than presenting an empty settings interface.
3. **Truthful:** Every resource, relationship, and factual claim is either Shopify-owned, merchant-provided, or explicitly merchant-approved. Unsupported content is omitted.
4. **Controlled:** Payment and generation require explicit merchant action. Calinium delivers a read-only package and never automatically installs, uploads, publishes, or updates a Shopify theme.

The intended commercial moment is a one-time custom-theme purchase of approximately $80, presented only after the merchant understands the recommendation and delivery model. An optional relationship of approximately $10 per month may later support merchant-requested refinements, SEO guidance, and new layouts. These amounts are product context, not a pricing contract; the application must display the current server-authoritative offer at purchase time.

## 3. Experience Principles

1. **The merchant describes the business; Calinium understands Shopify.** The merchant should not repeat store identity or inventory data already available through the authenticated connection.
2. **Ask only what cannot be safely inferred.** Store facts can come from Shopify; subjective intent and sensitive truth must come from the merchant.
3. **Start working after the first meaningful answer.** Analysis and provisional design begin in the background while the conversation continues.
4. **Recommend first, then invite review.** Automatic decisions should form one coherent proposal, not a sequence of mandatory setup choices.
5. **Confirm sensitive facts explicitly.** Founder, origin, craft, sustainability, certification, award, testimonial, performance, and similar claims are never inferred or bulk-approved.
6. **Hide technical stages in Quick Start.** The merchant sees progress and decisions, not pipeline terminology.
7. **Preserve the full workflow in Advanced.** Existing capabilities and approval boundaries remain available; simplification is additive.
8. **Make the merchant feel understood.** Summaries use the merchant's language, distinguish confirmed facts from interpretation, and make correction easy.
9. **Execute vision, not settings.** Calinium translates desired outcomes into typography, composition, resources, and presets without asking the merchant to configure implementation details.
10. **Design the imagined storefront.** Success is measured by fit between merchant intent and the resulting storefront, not merely package completion.
11. **Never update or publish automatically.** A generated package does not grant permission to change a live Shopify theme.
12. **Require explicit paid generation.** Approval of a recommendation is not approval to charge or generate.
13. **Require explicit action for every update.** Subscription or prior purchase never authorizes automatic regeneration, installation, or publication.

When convenience and truth conflict, truth wins. When automation and merchant control conflict, merchant control wins. When an optional resource is absent, omission wins over invention.

## 4. Merchant Modes

The same authoritative project data and approval records support three presentation modes. A merchant may move to a more detailed mode without losing work.

| Mode | Intended merchant | Experience | Decision model | Target |
| --- | --- | --- | --- | --- |
| **Quick Start** | Most merchants | One conversation, background store learning, emerging preview, automatic preset and Recommended Resource Set, one combined review | Calinium recommends ordinary decisions; merchant corrects exceptions and confirms sensitive facts | Five to seven essential questions at most and under ten minutes to paid-generation readiness |
| **Guided** | Merchants who want context | The same journey with more explanations, comparisons, reasons, and deliberate checkpoints | Calinium still recommends first, but exposes alternatives and tradeoffs earlier | Confidence without requiring implementation knowledge |
| **Advanced** | Merchants or collaborators who want detailed control | The existing Understanding, Brand Blueprint, Store Strategy, Preset, Store Resources, and Content Plan stages | Each detailed decision and approval remains visible | Full existing capability with no loss of control |

Quick Start is the default. It may ask fewer than five questions when Shopify and prior merchant answers provide enough verified context; it must not force questions to meet a quota. Guided is a presentation choice, not a weaker safety model. Advanced is always reachable through a clearly labeled action such as **Review detailed decisions** and never requires restarting the project.

Mode changes affect presentation and review density. They do not change authentication, canonical shop identity, project scope, factual status, approval requirements, immutable revisions, payment eligibility, or generated output ownership.

## 5. Journey Overview

The primary Custom Theme journey is:

```text
Open Calinium
→ Describe the business
→ Calinium learns from Shopify and, optionally, a public website
→ Continue a short guided conversation
→ See a provisional design emerge
→ Review Calinium's understanding and recommendation
→ Review the Recommended Resource Set
→ Refine anything conversationally
→ Approve the final review
→ Initiate paid generation
→ Follow real generation progress
→ Download and manually install the validated Shopify theme
```

Three artifacts must remain visibly distinct:

| Artifact | Meaning | Merchant expectation |
| --- | --- | --- |
| **Provisional preview** | An evolving interpretation based on incomplete or not-yet-approved inputs | Directional, editable, and not final |
| **Approved preview** | A review representation of approved direction, resources, and content | The intended generation input, still not a generated theme |
| **Generated Shopify theme** | The validated package created after explicit payment and generation | Downloadable theme artifact for manual Shopify review and installation |

The journey is resumable. Every durable transition belongs to the authenticated project and canonical shop. Refreshing, leaving, or changing devices must return the merchant to the last server-authoritative state rather than recreating decisions from browser state.

## 6. Entry Points

Calinium has two distinct merchant-facing product paths.

**Custom Theme** is the primary path inside the Shopify app:

```text
Describe business
→ analyze store
→ recommend design
→ preview
→ approve
→ pay
→ generate
→ download
```

The primary action is **Design my custom theme**. Returning merchants see **Continue your theme** with the last durable state. A completed merchant sees the delivered project and may explicitly begin a new paid refinement; completion never starts an update automatically.

**Premium Themes** is a secondary commercial path, primarily discovered on `calinium.com`. It may present ready-made themes such as Atelier, Maison, Gallery, Ritual, Essential, and Signal. Inside the Shopify app, these identities appear only as recommended starting points or compatible alternatives within the Custom Theme recommendation. Marketplace browsing and checkout must not compete with the first conversational input.

A merchant entering from a Premium Theme page may carry non-authoritative interest in a preset into the app. Calinium still validates store compatibility and asks the merchant to review the resulting recommendation. A marketing referral is not an approval, generation order, or license purchase.

## 7. Screen 1 — Welcome and First Message

### Merchant sees

A calm first screen centered on one conversation. The primary copy is:

> Welcome to Calinium.
> I'm your AI Creative Director.
> I'll design a custom Shopify theme around your brand, products, and customers.
> I already have access to your connected Shopify store.
> What do you sell?

A large conversational input and **Continue** action hold the visual priority. A secondary optional field asks, **Do you have a public website I can learn from?** with **Add website** and **Skip for now**. The screen never asks for the `.myshopify.com` domain again, exposes technical onboarding, lists internal stages, or presents a Premium Themes checkout.

### Merchant does

The merchant describes what the business sells in ordinary language and may provide a public website URL. They can continue without a website.

### Calinium does

Calinium associates the answer with the authenticated, project-scoped Creative Director session. After the first meaningful answer, it persists the conversation state and starts eligible Shopify resource discovery and provisional understanding work without waiting for the entire interview.

### Merchant should feel

Welcomed, recognized, and relieved that Calinium already understands the connected-store context. The first interaction should feel like briefing a creative partner, not registering or configuring software.

### Information used

- Authenticated Shopify connection and canonical shop identity.
- Existing project and resumable Creative Director state.
- The merchant's first answer.
- Optional public website URL, when supplied and analysis is available.
- No unapproved store content or external claims.

### Automatic decisions

Calinium may normalize the response for understanding, decide which follow-up question is most useful, and begin store learning. It may not treat an inferred category, audience, origin, or claim as merchant-confirmed truth.

### Explicit merchant decisions

What the business sells, whether to provide a website, and whether the current project should resume or a new project should begin are explicit choices.

### Sensitive-content rules

The first answer does not authorize founder, handmade, artisan, origin, sustainability, certification, award, testimonial, performance, customer-result, revenue, conversion, statistical, or external-proof claims. Calinium records uncertainty rather than completing missing facts.

### Success state

A meaningful business description is durably saved. Calinium can begin store learning and select the next necessary question. A website is not required.

### Failure and recovery

If the answer cannot be saved, the input remains visible and editable, with a concise retry action. If Shopify access needs attention, Calinium identifies that issue without discarding the answer. Reloading resumes the persisted project and does not create a duplicate session.

### Advanced-mode escape

**Choose a more detailed setup** opens the mode explanation. Selecting Advanced reveals the existing detailed workflow after saving the first answer; it does not expose raw schemas or restart onboarding.

## 8. Screen 2 — Automatic Store Learning

### Merchant sees

The conversation remains usable while a compact, non-blocking learning panel reports real states such as **Reviewing your catalog**, **Finding your strongest imagery**, and **Preparing a first direction**. Completed discoveries appear progressively. A full-screen loader is reserved for a truly blocking authentication or project recovery event.

### Merchant does

The merchant may continue answering the next conversational question, inspect what Calinium is learning, correct the store connection if requested, or continue without website analysis.

### Calinium does

Within granted read scopes and existing resource contracts, Calinium reads products, collections, menus, Shopify Files, product media, and available themes; identifies logo candidates; evaluates catalog completeness; and prepares resource questions and a provisional visual direction. If the merchant supplied a public website and website analysis is enabled, it analyzes only accessible public material and records the source. These tasks run alongside the conversation and publish only actual progress.

### Merchant should feel

That useful work started immediately and that Calinium is reducing effort rather than creating another checklist.

### Information used

- Shopify-authoritative products, collections, menus, files, media, and eligible themes.
- Current resource availability and approval status.
- Optional public website data when explicitly supplied and supported.
- Merchant answers and existing approved project facts.

### Automatic decisions

Calinium may classify resource candidates, identify missing optional assets, rank likely logo or hero candidates, and decide which question to ask next. Candidate ranking is a recommendation, not resource approval.

### Explicit merchant decisions

The merchant decides whether a candidate represents the brand, whether public website information may be used, and how to resolve ambiguous or sensitive material.

### Sensitive-content rules

Media interpretation is not evidence. A workshop image does not prove handmade production; packaging does not prove origin or certification; product copy does not become an approved performance claim merely because it is present. Sensitive claims remain unselected pending individual confirmation.

### Success state

Calinium has enough store context to prepare the next relevant questions and a provisional structural preview. Missing optional resources do not block progress.

### Failure and recovery

Each learning task has an independent state. A failed website analysis can be skipped or retried without blocking Shopify analysis. A failed resource refresh explains what needs reconnection. Successful results remain persisted, and recovery does not repeat completed work unnecessarily.

### Advanced-mode escape

**Inspect store resources** opens the Advanced Store Resources view, where the merchant can see source, availability, approval state, and required-resource gaps using existing project-scoped controls.

## 9. Screen 3 — Guided Conversation

### Merchant sees

One question at a time, with a concise explanation only when useful. The conversation may ask about the main customer, desired feeling, primary objective, priority product line, and what to avoid. A mode preference is asked only when behavior suggests it would help. A small preview or learning summary can remain visible without competing with the question.

### Merchant does

The merchant answers, chooses **You decide**, chooses **I don't know**, corrects a prior answer, or continues later. They are not forced through questions Calinium can answer safely from Shopify or prior responses.

### Calinium does

Calinium updates Understanding, separates confirmed facts from inference, recalculates what is missing, and begins Brand Blueprint and Store Strategy candidates. It targets five to seven essential questions at most in Quick Start and stops early when sufficient information exists.

### Merchant should feel

Listened to and intelligently guided. Each question should have an obvious relationship to the storefront the merchant wants.

### Information used

- Merchant conversation and corrections.
- Shopify catalog and collection structure.
- Approved resource facts.
- Optional website findings with provenance.
- Existing Understanding confidence and missing-information records.

### Automatic decisions

Calinium may choose question order, omit redundant questions, recommend an audience or objective as an explicitly labeled interpretation, and translate subjective language into provisional design direction.

### Explicit merchant decisions

The merchant owns subjective intent: desired feeling, primary objective, priority product line, exclusions, and correction of Calinium's interpretation. **You decide** delegates a design choice, not factual truth.

### Sensitive-content rules

Calinium never turns silence, **You decide**, industry norms, product imagery, or website language into approved sensitive claims. Sensitive factual content requires a direct confirmation tied to the exact claim and evidence.

### Success state

Critical business, audience, goal, and design-intent information is either confirmed or deliberately delegated where delegation is safe. Calinium can present a useful understanding and recommendation.

### Failure and recovery

Every accepted response is saved before the next question. A network failure leaves the current answer available for retry. Corrections invalidate only dependent provisional recommendations and retain the transcript and unrelated approved work.

### Advanced-mode escape

**Review all answers and assumptions** opens Understanding and Brand Blueprint detail, including facts, assumptions, unknowns, confidence, and correction controls.

## 10. Screen 4 — Emerging Live Preview

### Merchant sees

A preview begins as soon as enough information exists. Initially it may show a structural outline such as Hero, Featured Collection, Craftsmanship, and Newsletter. It is labeled **Provisional direction** and includes a plain-language note that design and content will continue to change. As verified inputs arrive, the preview may gain approved imagery, typography direction, spacing, colors, real product cards, section order, navigation, and approved content blocks.

### Merchant does

The merchant observes, comments conversationally, selects an element to discuss, or continues answering questions. They do not edit Shopify setting IDs or mistake the preview for a live theme.

### Calinium does

Calinium renders the best available review representation from provisional or approved project decisions. It tracks the provenance and status of every visible resource, labels unresolved substitutions, and keeps the preview separate from generated Shopify files.

### Merchant should feel

Momentum and creative possibility. The merchant should see that their answers are shaping a real direction before being asked for final approval.

### Information used

- Provisional Brand Blueprint and Store Strategy.
- Shopify-authoritative product and collection data.
- Approved assets and resource candidates.
- Merchant design-language answers.
- Preset candidates, when available.

### Automatic decisions

Calinium may select a structural composition, provisional preset direction, representative approved products, and safe layout defaults. Automatic choices remain visibly reviewable and do not become immutable approvals merely by appearing.

### Explicit merchant decisions

The merchant confirms whether the direction feels right and requests changes to hierarchy, mood, density, emphasis, or resource choice. Approval of the final preview happens later.

### Sensitive-content rules

The preview contains no invented copy, captions, relationships, quotes, metrics, testimonials, claims, or provenance. Unapproved sensitive sections are omitted rather than shown as persuasive placeholders.

### Success state

The merchant can recognize a coherent direction and either continue toward review or give a specific correction. The preview's status is unambiguous.

### Failure and recovery

If preview rendering is unavailable, the conversation continues with a structural text summary; the merchant's work is not blocked or lost. A stale preview is marked and regenerated from the latest durable state rather than silently displayed as current.

### Advanced-mode escape

**Inspect composition** opens the detailed Store Strategy, Preset, and eligible section decisions while preserving the same underlying project state.

## 11. Screen 5 — Calinium’s Understanding

### Merchant sees

A concise statement beginning **Here is what I understand about your business**. It summarizes the offer, audience, primary objective, priority products, intended feeling, and avoidances. Confirmed facts, Calinium's interpretations, and unknowns are visually distinct. Each item supports a conversational correction.

### Merchant does

The merchant confirms the overall understanding, corrects an item, answers a remaining critical question, or opens detailed review.

### Calinium does

Calinium composes this screen from Understanding, Brand Blueprint, and Store Strategy without merging their persistence or approval contracts. A correction updates the authoritative source and invalidates dependent recommendations before another approval can occur.

### Merchant should feel

Accurately seen and safe to correct. The summary should sound like a thoughtful creative brief, not a database record.

### Information used

- Confirmed conversation facts.
- Explicit merchant corrections.
- Labeled inferences and confidence.
- Shopify catalog context.
- Optional website findings with provenance.
- Existing immutable approvals, where still current.

### Automatic decisions

Calinium may summarize, group, and prioritize information without changing its factual status. It may recommend resolving a high-impact unknown before design review.

### Explicit merchant decisions

The merchant confirms subjective positioning and any correction that changes business meaning. Calinium may not confirm its own inference on the merchant's behalf.

### Sensitive-content rules

Sensitive claims appear only as **Needs your confirmation** with their exact proposed wording and evidence, or remain omitted. Bulk confirmation of the general understanding does not approve them.

### Success state

The merchant confirms the understanding, no critical unknown blocks a truthful design recommendation, and all dependent recommendation inputs are current.

### Failure and recovery

If a correction conflicts with approved downstream work, Calinium explains which recommendation needs review and preserves the prior immutable revision. Autosaved edits remain resumable, and no stale approval is reused.

### Advanced-mode escape

**Open Brand Blueprint and Store Strategy** reveals the full existing cards, assumptions, recommendation rationales, and per-decision approval controls.

## 12. Screen 6 — Recommended Design

### Merchant sees

A decisive recommendation headed **This is the direction I recommend**. It includes the recommended preset, visual rationale, homepage composition, typography and color direction, product and collection treatment, motion approach, and an approved-preview update. Compatible preset alternatives may appear as secondary comparisons. Presets such as Atelier, Maison, Gallery, Ritual, Essential, and Signal are starting systems, not marketplace purchases in this screen.

### Merchant does

The merchant accepts the direction, compares a compatible alternative, asks why, or requests a conversational adjustment such as “make it warmer” or “show more product sooner.”

### Calinium does

Calinium deterministically recommends a compatible preset and translates approved strategy into a coherent composition. It records the recommendation separately from approval and recalculates affected choices after material corrections.

### Merchant should feel

Confident that a creative expert has made a considered decision, while remaining free to challenge or reshape it.

### Information used

- Approved or current Brand Blueprint and Store Strategy decisions.
- Preset compatibility rules and canonical preset catalog.
- Shopify catalog shape and available approved resources.
- Merchant corrections and avoidances.
- Current preview composition.

### Automatic decisions

Calinium may recommend one preset, compatible alternatives, safe global design direction, section order, and omission of unsupported sections. Recommendations remain reviewable and deterministic.

### Explicit merchant decisions

The merchant approves or changes the design direction. Whether Quick Start may treat continued acceptance as explicit preset approval remains an open decision; until decided, the authoritative preset approval boundary remains explicit.

### Sensitive-content rules

A preset never supplies merchant facts. Choosing Atelier cannot create craft, founder, or origin claims; choosing Ritual cannot create efficacy claims; choosing Gallery cannot create campaign context or product associations.

### Success state

A compatible design direction and preset are explicitly approved under the current approval contract, or all merchant-requested changes are incorporated into a new current recommendation.

### Failure and recovery

If compatibility validation fails, Calinium identifies the decision that needs review in merchant language and retains the current strategy. It never bypasses preset validation or silently changes an approved strategy. The merchant can revise the affected decision and retry.

### Advanced-mode escape

**Compare detailed design decisions** opens Store Strategy and Preset stages with canonical IDs hidden behind merchant-facing labels, explicit alternatives, and approval state.

## 13. Screen 7 — Recommended Content and Resources

### Merchant sees

One combined summary:

> Calinium selected the strongest resources for your theme.
> Review anything you want to change.

Each slot shows a recommendation, concise reason, alternatives, fallback, confidence, approval requirement, and whether omission is safe. Ordinary resources support **Approve recommended set**; sensitive evidence remains individually confirmed.

| Slot | Recommendation basis | Alternatives | Safe fallback | Confidence display | Individual approval | Omission allowed |
| --- | --- | --- | --- | --- | --- | --- |
| Logo | Best eligible approved logo candidate | Other approved project images or Shopify Files | Text-based store identity where supported | High/medium/needs review | Only when ambiguous | Yes if runtime supports the fallback |
| Hero media | Strongest suitable approved brand or product media | Other approved images or supported video | A simpler non-media composition | Shown with reason | Only when ambiguous or sensitive | Yes |
| Hero destination | Approved primary collection, product, or other supported destination | Compatible approved destinations | No link | Source certainty | Required when a destination is used | Yes |
| Featured collection | Approved priority collection aligned with the stated objective | Other approved collections | Omit the section or use another eligible section | Source and strategy fit | Ordinary bulk approval | Yes unless composition minimum requires it |
| Featured product | Approved priority product | Other approved products | Omit | Source and strategy fit | Ordinary bulk approval | Yes |
| Craftsmanship media | Media tied to separately approved craft evidence | Other approved evidence-linked media | Omit media or the unsupported block | Evidence status, not visual inference | Sensitive evidence confirmed separately | Yes |
| Primary navigation | Existing approved Shopify menu | Other approved menus | Existing safe navigation behavior | Shopify source status | Required if changing current selection | No when navigation is required |
| Preview theme | Eligible approved preview theme when the workflow supports it | Other eligible themes | Calinium One review representation | Compatibility status | Required under existing preview policy | Yes if no preview theme is required |
| Optional video | Approved hosted video with required accessibility support | Approved image | Image or omission | Availability and rights status | Required if selected | Yes |

### Merchant does

The merchant reviews the set, bulk-approves ordinary choices, changes any slot, confirms sensitive evidence individually, or returns to resource collection for a missing required item.

### Calinium does

Calinium resolves candidates from server-authoritative, project-scoped Shopify resources and project assets; preserves resource revisions; prepares Content Plan candidates where applicable; and distinguishes required, optional, unsupported, and omitted inputs. It never substitutes a mutable or cross-project resource.

### Merchant should feel

That Calinium has handled the tedious selection work while making every consequential choice easy to inspect and change.

### Information used

- Approved Shopify products, collections, menus, files, media, and eligible themes.
- Approved project images and videos.
- Current preset and Store Strategy.
- Approved facts and evidence.
- Resource availability and revision metadata.

### Automatic decisions

Calinium may rank ordinary resources, recommend safe omissions, choose non-content layout defaults, and assemble a Recommended Resource Set. It may not approve its own recommendations or infer evidence from media.

### Explicit merchant decisions

The merchant confirms ambiguous resource identity, destinations, sensitive evidence, factual content, and any replacement that changes meaning. Ordinary, unambiguous resources may be approved in bulk.

### Sensitive-content rules

Founder biography; handmade, artisan, material-origin, geographic-origin, sustainability, certification, award, testimonial, review, comparison, performance, result, revenue, conversion, statistical, and external-proof content always requires exact individual confirmation. Absence results in omission.

### Success state

All required resources are current, project-scoped, available, and approved; ordinary recommendations are accepted or replaced; sensitive items are individually confirmed; and optional gaps have safe omissions.

### Failure and recovery

A stale or missing resource identifies the affected slot and offers **Choose another**, **Refresh resources**, **Return to Shopify**, or **Omit**, when omission is allowed. Valid approvals remain intact. Refresh never silently swaps the recommended resource.

### Advanced-mode escape

**Manage all resources and content plans** opens Store Resources and Content Plan with detailed provenance, availability, revision, evidence, and independent approval controls.

## 14. Screen 8 — Conversational Refinement

### Merchant sees

The approved preview and a persistent conversational control with prompts such as **What would you like to change?** Selected preview regions can seed a plain-language request. A change summary distinguishes what will change, what remains approved, and what needs renewed review.

### Merchant does

The merchant requests refinements, accepts a proposed change, rejects it, reorders priorities, changes resources through approved selectors, or restores the last approved direction.

### Calinium does

Calinium translates intent into candidate changes at the appropriate internal layer. It preserves stable identities when meaning remains, creates child revisions when approved content changes, invalidates only dependent approvals, and updates the preview from current deterministic inputs.

### Merchant should feel

In control without needing design-system or Shopify-schema vocabulary. Changes should feel conversational yet precise and reversible.

### Information used

- Current approved and candidate design revisions.
- Preview selection context.
- Merchant request and conversation history.
- Approved resource inventory.
- Dependency and validation results.

### Automatic decisions

Calinium may interpret subjective adjustments into candidate design changes, preserve unaffected approvals, and propose the smallest coherent revision. It may not apply a factual rewrite, new destination, or unapproved resource silently.

### Explicit merchant decisions

The merchant accepts changes that alter approved direction, visible content, resource choice, or evidence. The merchant also decides when refinement is complete.

### Sensitive-content rules

Requests such as “make it feel artisanal” change visual direction only; they do not approve an artisan claim. Rewriting a direct quotation requires new merchant approval and cannot remain presented as the original quotation without verification.

### Success state

Requested changes are represented accurately, affected validations pass, required reapprovals are complete, and the merchant indicates readiness for final review.

### Failure and recovery

An unsupported request receives a plain explanation and safe alternatives. A failed revision leaves the last approved preview and inputs intact. Autosave and immutable parent revisions make refresh, undo, and resume safe.

### Advanced-mode escape

**Edit detailed decisions** opens the exact underlying stage affected by the request, without discarding the conversational request or the rest of the combined review.

## 15. Screen 9 — Final Review and Payment

### Merchant sees

A final, compact review of design direction, selected preset, homepage composition, important resources, intentional omissions, claims awaiting confirmation, current validation state, server-authoritative price, and delivery behavior. It states clearly that Calinium will generate a downloadable theme package and will not install, upload, publish, or update the live theme.

The primary action is **Purchase and generate theme**. Approval and payment are visually distinct from ordinary review actions.

### Merchant does

The merchant resolves remaining blockers, confirms the final approved inputs, reviews the current price and delivery boundary, and explicitly initiates paid generation.

### Calinium does

Calinium revalidates current approvals, resource revisions, project/shop scope, preset, Approved Block Plan, and generation eligibility server-side. It creates or reuses an idempotent pending order, redirects through the configured payment flow, verifies payment server-side, and pins immutable purchased inputs before queuing generation.

### Merchant should feel

Certain about what will be generated, what the payment covers, and what Calinium will not do to the live store.

### Information used

- Approved strategy and preset revisions.
- Approved Block Plan and resource snapshots.
- Current required-resource validation.
- Server-authoritative offer and price.
- Authenticated project, shop, and payment/order state.

### Automatic decisions

Calinium may summarize approved inputs, detect stale dependencies, calculate eligibility, and reuse an existing idempotent order. It cannot infer approval, payment, or consent from navigation or prior purchases.

### Explicit merchant decisions

The merchant confirms sensitive claims, accepts the final recommendation, agrees to the displayed purchase, and triggers generation. Each future refinement or update requires another explicit merchant action under its applicable offer.

### Sensitive-content rules

Unconfirmed sensitive content is listed as omitted or blocking only when genuinely required. Payment never converts provisional content into approved content. Calinium cannot hide a sensitive claim inside the package because it appeared in a preview.

### Success state

All required approvals and resources are current, the merchant initiates purchase, payment is verified by the authoritative server flow, immutable inputs are pinned, and exactly one generation order becomes eligible.

### Failure and recovery

An eligibility failure links to the exact merchant-facing decision needing review. A canceled or failed payment does not generate or duplicate a charge. Return and retry reuse durable order state. A stale input requires review and a new eligible snapshot rather than mutating the purchased one.

### Advanced-mode escape

**Review approval details** opens the detailed approved revisions, resource status, content plans, omissions, and delivery artifacts without exposing secrets or mutable snapshot payloads.

## 16. Screen 10 — Theme Generation

### Merchant sees

Streaming progress based on real server states, for example:

```text
Preparing theme foundation
Applying Atelier
Building homepage
Adding product pages
Adding collection pages
Applying approved content
Validating theme
Packaging ZIP
Ready
```

The interface shows completed, active, waiting, retryable, and blocked states without fabricated percentages or timers. It is safe to leave and return.

### Merchant does

The merchant watches, leaves the page, resumes later, retries an eligible failed attempt, or follows a specific recovery action. No further design input is silently incorporated into the already pinned order.

### Calinium does

Calinium consumes only pinned immutable inputs, generates in an isolated workspace, materializes approved content, validates Shopify structure and theme quality, writes provenance outside storefront content, packages the ZIP, and cleans temporary workspaces. Retry and resume use the same paid order and pinned revisions.

### Merchant should feel

Informed and reassured that the work is real, durable, and carefully validated rather than hidden behind an indefinite animation.

### Information used

- Paid generation order and immutable input snapshot.
- Approved preset, plan, and resource revisions pinned to that order.
- Target theme and generator version.
- Actual server execution and validation states.

### Automatic decisions

Calinium may execute deterministic generation, retry safe idempotent stages, clean task-created temporary files, and report warnings or omissions already allowed by approved policy. It may not adopt newer project inputs or “latest” resources.

### Explicit merchant decisions

The merchant explicitly starts generation through payment and chooses whether to retry a recoverable failure. The merchant must later choose whether to install or publish the delivered package.

### Sensitive-content rules

The generator cannot create content absent from pinned approvals. Starter copy, inferred associations, claims, captions, quotes, and evidence are not fallback material.

### Success state

The generated package passes required validation, the artifact is durably associated with the paid order, provenance is recorded, and the order reaches **Ready** exactly once.

### Failure and recovery

Failures identify the actual stage and whether retry is safe. Approvals and payment remain preserved. Idempotency prevents duplicate charge or duplicate completed generation. A changed source checksum, missing snapshot, or validation failure blocks safely for review.

### Advanced-mode escape

**View generation details** shows merchant-safe stage history, pinned revision identifiers, validation summaries, and warnings—not local paths, secrets, raw snapshots, or internal stack traces.

## 17. Screen 11 — Delivery

### Merchant sees

A clear completion screen with the theme ZIP, a merchant-friendly manifest or summary, validation status, upload/install instructions, preview guidance, and access to future paid refinements. It includes the notice:

> Calinium has not modified or published your Shopify theme. Download and install the generated package when you are ready.

### Merchant does

The merchant downloads the package and summary, follows instructions to add it as a new unpublished Shopify theme, reviews it, and independently decides whether to publish. They may begin a merchant-requested refinement later.

### Calinium does

Calinium authorizes artifact access by project and paid order, preserves download integrity and provenance, explains validation results, and retains resumable order state. It does not call theme upload, publish, or update APIs.

### Merchant should feel

Accomplished and fully in control of the transition from generated design to live storefront.

### Information used

- Authenticated project membership.
- Ready paid order.
- Stored package, manifest, specification, and validation artifacts.
- Target theme and source version.

### Automatic decisions

Calinium may select merchant-friendly instructions for the delivered artifact and show available next actions. It may not install, upload, activate, update, or publish the theme.

### Explicit merchant decisions

The merchant chooses when to download, add the package to Shopify, preview it, publish it, and initiate any later paid refinement or update.

### Sensitive-content rules

Artifacts expose no secrets, approval payloads, private resource snapshots, local paths, or unapproved merchant content. The summary describes omissions without revealing unnecessary internal evidence.

### Success state

The authorized merchant can download an intact, validated ZIP and understands manual installation, preview, and publication steps.

### Failure and recovery

An interrupted download can restart without regenerating or charging again. Missing or corrupt artifacts trigger controlled server recovery. Authorization failures reveal no artifact metadata. Delivery state survives refresh and sign-in changes.

### Advanced-mode escape

**View full delivery record** shows the Theme Specification, validation report, safe provenance manifest, source version, and generation history within existing authorization boundaries.

## 18. Ongoing Subscription Experience

The optional subscription is an ongoing creative relationship, not permission for background theme changes. It may eventually support merchant-requested refinements, SEO guidance, new layouts, and modifications at an intended context price of approximately $10 per month. Exact entitlement, limits, billing, and price remain separate product decisions and authoritative commercial configuration.

A subscribed merchant should return to the delivered project, describe a desired outcome, see the affected recommendation and preview, review any new resources or claims, and explicitly approve each update. If an update requires generation or payment under the active offer, the merchant initiates that action explicitly.

Subscription status must never:

- authorize automatic regeneration;
- select or approve new merchant content;
- upload or publish a theme;
- change the live theme;
- migrate an old paid order to newer inputs;
- convert general guidance into merchant-approved facts.

Every generated refinement preserves immutable revision lineage, project/shop scope, paid-order pinning where applicable, deterministic generation, read-only delivery, and a manual publication decision.

## 19. Advanced Mode Journey

Advanced mode exposes the current detailed journey without removing or reinterpreting any capability:

```text
Conversation
→ Understanding
→ Brand Blueprint
→ Store Strategy
→ Preset
→ Store Resources
→ Content Plan
→ Your Theme
→ Delivery
```

The merchant can inspect facts and assumptions, review each strategy recommendation, compare presets, manage resource provenance, approve content compositions independently, resolve required-resource gaps, and inspect immutable generation inputs. Existing stage guards and correction behavior remain authoritative.

Entering Advanced from Quick Start maps all saved work into the corresponding existing stages. The current stage opens at the most relevant decision; previously approved decisions remain approved unless a dependency changed. Returning to Quick Start recomposes current decisions into the combined review and does not bulk-approve outstanding items.

Advanced mode is not a developer mode. It continues to use merchant-facing terms and never exposes secrets, raw Shopify tokens, mutable snapshots, local paths, or editable runtime IDs.

## 20. Premium Theme Journey

Premium Themes is a separate commercial discovery journey, primarily on `calinium.com`:

```text
Browse themes
→ inspect theme details and demo
→ compare compatible themes
→ choose a commercial path
```

Atelier, Maison, Gallery, Ritual, Essential, and Signal can be presented as curated theme products on the public site. The public journey may explain visual character, supported merchant fit, and purchase terms when that marketplace is implemented.

Inside the Shopify app, the same preset identities act only as recommended foundations or compatible alternatives for a Custom Theme. They do not bring a marketplace checkout onto Screen 1. A merchant arriving with preset interest still receives Shopify analysis, truth-safe resource review, a compatible recommendation, explicit approval, and the normal paid-generation boundary.

Whether premium themes can ultimately be purchased inside the app as well as on `calinium.com` remains an open product decision. This document does not define or implement a public marketplace.

## 21. Internal Stage Mapping

The simplified journey is a presentation and orchestration model over the existing architecture:

| Merchant-facing concept | Existing authoritative stage or system | Simplification behavior |
| --- | --- | --- |
| Your business | Conversation | One opening brief and only necessary follow-up questions |
| Automatic store learning | Shopify connection, project resources, Store Resources discovery | Background discovery with real progress; approvals remain separate |
| Calinium's understanding | Understanding + Brand Blueprint + Store Strategy | One concise review with corrections routed to the owning stage |
| Emerging preview | Review representation derived from current strategy, preset, and approved resources | Provisional until inputs are approved; never presented as generated theme |
| Recommended design | Preset + approved Store Strategy | One lead recommendation with compatible alternatives |
| Content and resources | Store Resources + Content Plan | Recommended Resource Set and combined ordinary approval; sensitive confirmations stay individual |
| Conversational refinement | Corrections and child candidate revisions across owning systems | Intent translated to scoped candidate changes; immutable approvals preserved |
| Review and generate | Your Theme + eligibility + paid generation | Combined review followed by explicit purchase and generation action |
| Delivery | Delivery | Authorized ZIP, validation summary, and manual installation guidance |

No service is deleted because its standalone screen is hidden. Conversation, Understanding, Brand Blueprint, Store Strategy, Preset, Store Resources, Content Plan, Your Theme, and Delivery remain durable internal stages with their current guards and ownership.

The following remain authoritative across every mode: Shopify authentication, canonical shop identity, project isolation, Creative Director data, immutable strategy revisions, preset approvals, Approved Block Plans, resource snapshots, paid-order pinning, deterministic generation, read-only package generation, and merchant-initiated theme updates.

## 22. Loading, Progress, and Failure States

Progress communication follows four rules:

1. Show work beside the merchant's current task whenever possible; avoid blocking full-screen loaders.
2. Report actual server states, never fake percentages, fake countdowns, or optimistic completion.
3. Persist accepted input before advancing and make resume the default recovery behavior.
4. Explain failures in merchant language while retaining diagnostic correlation server-side.

| Situation | Merchant experience | Recovery contract |
| --- | --- | --- |
| Shopify learning still running | Compact progressive status; conversation remains usable | Completed tasks persist; failed tasks retry independently |
| Optional website unavailable | Website analysis marked unavailable | Skip without blocking and continue from Shopify plus merchant answers |
| Authentication/resource access needs attention | Clear reconnection action | Preserve project answers; refresh only server-authoritative resources |
| Preview unavailable | Structural text summary remains available | Retry preview from current durable state; do not block conversation |
| Validation needs review | Identify affected merchant decision, not schema jargon | Return to owning decision and invalidate only dependents |
| Payment canceled or failed | No generation and no claim of payment | Reuse durable pending order where valid; never duplicate charge |
| Generation interrupted | Actual stage and retry eligibility shown | Resume or idempotently retry pinned inputs |
| Package validation fails | Delivery blocked with a safe explanation | Preserve payment and approvals; fix/retry without substituting inputs |
| Download interrupted | Ready state remains | Restart authorized download without regeneration |

Errors must not expose tokens, secrets, cookies, private snapshots, customer data, stack traces, or filesystem paths. A failure never authorizes weaker validation or automatic substitution.

## 23. Trust, Approval, and Safety

Shopify remains authoritative for connected-store identity and store resources. Server-side project and shop scoping governs every read, approval, order, and artifact. Browser state and client-submitted identifiers never authorize access or immutable content.

Automatic recommendations may cover ordinary design and resource choices, but they remain reviewable. Sensitive content always receives exact, individual confirmation. Calinium never infers or automatically approves:

- founder biography;
- handmade or artisan claims;
- material or geographic origin;
- sustainability claims;
- certifications or awards;
- testimonials or reviews;
- comparison values;
- product-performance claims;
- customer results;
- revenue or conversion claims;
- statistics;
- external proof links.

Approved strategy revisions, preset revisions, Approved Block Plans, and resource snapshots are immutable. Corrections create new candidates and, after approval, new child revisions. Existing paid orders retain their pinned inputs.

Final generation is an explicit merchant-initiated paid action. Approval does not imply purchase; purchase does not imply installation; download does not imply publication; subscription does not imply update consent. Calinium has no authority in this journey to upload, publish, or automatically update a Shopify theme.

## 24. Accessibility and Responsive Behaviour

The journey targets WCAG 2.2 AA and must work at mobile, tablet, and desktop widths, browser zoom, keyboard-only operation, reduced motion, long translated text, and supported right-to-left presentation.

Core requirements include:

- one clear page heading and a logical heading hierarchy;
- persistent labels for conversational inputs, URL fields, selectors, and approvals;
- visible keyboard focus and predictable tab order between conversation, preview, and review;
- status messages conveyed in text, not color or animation alone;
- restrained live-region announcements for genuinely important progress changes;
- no focus theft when background analysis or preview updates complete;
- accessible names for recommended resources, preview regions, alternatives, warnings, and omissions;
- errors associated with the affected field or decision and summarized at the next useful focus point;
- drag-and-drop alternatives for any future ordering controls;
- reduced-motion support for preview transitions and progress;
- touch targets appropriate for compact screens;
- reflow without horizontal page scrolling at 400% zoom on critical forms and reviews.

On narrow screens, the conversation takes priority and the preview becomes a collapsible or separately reachable region without losing context. On wider screens, conversation and preview may share the viewport. The exact two- or three-panel composition remains open. Content order must remain meaningful to screen readers regardless of visual panel placement.

## 25. Analytics and Success Metrics

Analytics should measure whether Calinium reduces effort while preserving merchant intent and truth. Events must use project-safe identifiers and avoid storing sensitive free-form content unnecessarily.

Beta targets are:

```text
5–7 merchant questions maximum in Quick Start
Under 5 resource-screen actions
0–3 individual approvals for ordinary resources
Under 10 minutes to paid-generation readiness
No optional resource blocks generation
No fabricated merchant facts
No automatic theme update or publish
Resume after refresh
```

Measure:

- time from first meaningful answer to first meaningful preview;
- time to preset recommendation;
- time to Recommended Resource Set;
- total and per-stage merchant questions;
- number and type of merchant corrections;
- ordinary resource recommendation acceptance rate;
- preset acceptance and alternative-selection rates;
- time from combined review to payment readiness;
- payment initiation, verification, and cancellation rates;
- generation success, retry, and validation-failure rates;
- theme download rate;
- abandonment point and last durable state;
- resume success after refresh or return;
- Advanced mode entry, exit, and completion usage;
- sensitive-claim confirmation and omission counts, without capturing sensitive claim text in analytics.

Metrics must distinguish product friction from deliberate safety stops. A truthful omission is not a generation failure, and a merchant choosing Advanced is not a Quick Start failure.

## 26. Beta Acceptance Criteria

Quick Start is beta-ready when all of the following are demonstrated with real project-scoped behavior:

- The opening screen recognizes the connected Shopify store and never asks for its domain again.
- A meaningful first answer starts eligible background store learning.
- Public website input is optional and website failure does not block the journey.
- Quick Start asks no more than seven essential questions and skips safely inferred topics.
- The first meaningful provisional preview appears without being labeled final.
- Provisional preview, approved preview, and generated theme are unambiguous.
- A deterministic compatible preset recommendation appears and remains reviewable.
- A Recommended Resource Set reduces ordinary resource approval to at most three individual actions in the target path.
- No optional resource blocks paid-generation readiness.
- Sensitive content requires exact individual confirmation and unsupported content is omitted.
- The combined review accurately represents design, composition, resources, omissions, price, and delivery.
- Paid generation requires an explicit merchant action and verified server-side payment state.
- Retry and resume do not duplicate charges or completed generation.
- Refresh resumes the last durable state without losing approved work.
- Delivery provides a validated ZIP and clear manual installation guidance.
- No automatic theme installation, upload, publication, or update occurs.
- Advanced mode exposes all existing detailed stages without data loss.
- Accessibility and responsive requirements cover the complete critical journey.

Failure of a safety, authorization, payment, truth, immutability, or no-publish criterion blocks beta acceptance. Visual polish findings may be non-blocking only when they do not obscure status, consent, errors, or required actions.

## 27. Out of Scope

This document does not implement or authorize:

- coding the new interface;
- building website crawling;
- building live preview rendering;
- modifying the generator;
- modifying Shopify scopes;
- automatic theme upload;
- automatic theme publishing;
- Design DNA;
- style mixing;
- new presets;
- new theme sections;
- subscription implementation;
- public marketplace implementation.

It also does not define final pricing, subscription entitlements, premium-theme licensing, automatic Shopify theme updates, or support for every Shopify app. Those require separate product and technical contracts.

## 28. Open Product Decisions

The following require explicit product or founder decisions and are not resolved here:

1. What is the exact visual composition of the first screen?
2. At what minimum evidence threshold does the first preview become visible?
3. Do conversation and preview use two panels or three panels on large screens?
4. Can Quick Start skip a separate explicit preset-approval action while still producing an authoritative explicit approval event, or must the preset always have its own confirmation?
5. How much recommendation reasoning is shown by default versus on request?
6. Is optional public website analysis enabled by default after URL submission, or separately confirmed?
7. How and when is the approximately $10 subscription introduced without distracting from delivery?
8. Are Premium Themes purchased only on `calinium.com`, or also inside the Shopify app?

Additional implementation-specific decisions should be recorded in the future interaction or service contract rather than answered by silently changing this journey.

## 29. Implementation Readiness

This product contract is ready to guide a separate interaction-design specification and an implementation audit. Implementation should begin by mapping each proposed screen state and action to existing service capabilities, then identifying only the missing orchestration, analysis, preview, and presentation seams.

The current architecture remains the implementation foundation. Shopify authentication, canonical shop identity, project isolation, Creative Director data, immutable strategy revisions, preset approvals, Approved Block Plans, resource snapshots, paid-order pinning, deterministic generation, read-only package generation, and merchant-initiated theme updates remain authoritative.

Before interface work is approved, the next design artifact should define screen-level information architecture, responsive panel behavior, copy states, progressive preview status, combined-review interactions, accessibility behavior, and the exact boundary between Quick Start orchestration and Advanced stage navigation. It must preserve every approval, truth, payment, security, and read-only-generation guarantee in this document.
