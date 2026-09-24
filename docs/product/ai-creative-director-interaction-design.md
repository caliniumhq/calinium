# Calinium AI Creative Director Interaction Design

## 1. Purpose

This document translates Calinium's canonical customer journey into a concrete merchant-facing interaction model for AI Creative Director 2.0. It defines the information architecture, responsive panels, screen states, controls, feedback, accessibility, recovery, trust presentation, and review behavior needed to make the product feel like a collaboration with an experienced Creative Director rather than a configuration wizard.

The primary interaction loop is:

```text
Conversation
↔ Live Preview
↔ Reviewable Decisions
```

This loop is a presentation layer over the existing internal stages. It does not replace their data, services, validation, approvals, or revision history. The intended result is an experience in which merchants can speak naturally, see work emerge, inspect important decisions, correct Calinium without technical vocabulary, and explicitly approve paid read-only theme generation.

This is a product-design contract only. It does not authorize implementation or changes to code, APIs, schemas, generation, billing, Shopify scopes, theme behavior, or deployment.

## 2. Governing Product Contract

[Calinium Customer Journey](customer-journey.md) is authoritative. If this interaction design is ambiguous, the customer journey governs. This document may make the journey more concrete, but it may not contradict, replace, weaken, or silently reinterpret its product, truth, approval, payment, security, accessibility, or delivery boundaries.

The following internal stages remain authoritative and intact:

```text
Conversation
Understanding
Brand Blueprint
Store Strategy
Preset
Store Resources
Content Plan
Your Theme
Delivery
```

Quick Start and Guided may hide or combine the presentation of these stages. They may not merge ownership, bypass stage guards, invent approvals, or mutate immutable revisions. Advanced exposes the detailed workflow using the same project and authoritative state.

The following systems remain authoritative in every mode: Shopify authentication, canonical shop identity, project isolation, Creative Director data, immutable strategy revisions, preset approvals, Approved Block Plans, immutable resource snapshots, paid-order pinning, deterministic generation, read-only package generation, artifact authorization, and merchant-initiated theme updates.

## 3. Interaction Principles

1. **Conversation is the primary input.** The merchant describes outcomes; Calinium translates them into constrained reviewable decisions.
2. **Preview proves momentum, not completion.** It appears progressively and is always labeled Provisional, Approved, or Generated.
3. **Decisions remain visible without becoming a checklist.** The system summarizes what matters and offers detail on demand.
4. **Recommend before asking.** Calinium leads with a coherent recommendation and compatible alternatives rather than empty controls.
5. **Ask only unresolved questions.** Shopify-authoritative facts and prior confirmed answers are not requested again.
6. **Keep ordinary review compact.** Recommended resources can be accepted as a set; sensitive facts remain individually confirmed.
7. **Preserve merchant control.** Every consequential change can be inspected, corrected, and traced to a current revision.
8. **Use omission instead of invention.** Missing optional content does not become placeholder merchant content.
9. **Expose status, not machinery.** Merchants see useful progress without every internal operation becoming a chat message.
10. **Make recovery normal.** Accepted work is durable, refresh-safe, and resumable; failure never requires starting over unnecessarily.
11. **Keep commercial consent explicit.** Recommendation approval is not payment; payment is not upload; delivery is not publication.
12. **Progressively disclose complexity.** Quick Start is concise, Guided explains, and Advanced exposes detailed existing stages.

The experience should feel calm, confident, premium, direct, and transparent. It should never feel like Shopify expertise or technical configuration is required.

## 4. Information Architecture

The application has a persistent project shell and three functional areas.

### Persistent project shell

The shell owns:

- Calinium identity and a merchant-friendly project name;
- current project and connected-store context without repeatedly exposing the `.myshopify.com` domain;
- Quick Start, Guided, and Advanced mode access;
- save/resume status;
- real generation status when an order exists;
- help and safe exit actions;
- the primary journey action when one action governs the whole screen.

The old nine-stage progress navigation is not shown in Quick Start or Guided. Progress is expressed as outcomes such as **Learning your store**, **Design ready to review**, or **Theme ready**. Advanced may expose the existing stage navigation.

### Three functional areas

| Area | Primary question | Owns | Must not own |
| --- | --- | --- | --- |
| Conversation | “What should Calinium understand or change?” | Questions, answers, corrections, refinement requests, concise progress, recovery prompts | Technical settings, bulk activity logs, hidden approvals |
| Live Preview | “What is Calinium currently proposing?” | Provisional, approved, or generated visual representation and device context | Final-theme claims before generation, invented content, direct unsafe editing |
| Decisions | “What has Calinium decided, and what needs me?” | Design, content, resources, pages, claims, omissions, reasons, sources, status, review actions | Raw IDs, schemas, checksums, JSON, runtime terminology |

Conversation, Preview, and Decisions share one project state. They are not separate workflows. Selecting an item in one area may focus its representation in another, but it cannot create an approval merely through navigation.

## 5. Desktop Layout Model

The default desktop layout is:

```text
Left: Conversation
Center: Live Preview
Right: Decisions
```

The preview is visually dominant. A target proportion for design exploration is roughly 28% Conversation, 47% Preview, and 25% Decisions. These are relational proportions, not implementation tokens; exact values remain an open decision and must be validated against real content, localization, zoom, and the dashboard's layout system.

Three simultaneous areas are used only when the available application container can preserve usable text measure in Conversation and Decisions while leaving Preview dominant. There is no evidence-backed tablet breakpoint in the current dashboard; therefore the minimum usable three-panel width is defined by panel capability, not a new arbitrary pixel value. The implementation audit should map that capability to existing responsive tokens. The current dashboard's established mobile collapse at 720px remains evidence, not permission to make 721px a three-panel minimum.

### Hierarchy and shell

- A compact sticky header shows project identity, mode, durable save state, and generation state.
- The preview occupies the central visual field and receives the largest flexible share.
- Conversation and Decisions use bounded readable widths.
- The primary action appears at the point of decision and may also be summarized in the shell; duplicate actions must share one state and accessible name.
- Device controls belong to Preview, not the global header.

### Scroll ownership

Each area may scroll independently only when all three are visible and each has a persistent label. Conversation returns to the merchant's last reading position rather than always forcing the newest message into view. Preview scroll is contained within the simulated page. Decisions preserves the currently expanded group. The application shell must not create nested ambiguous page scrolling at browser zoom.

The conversation composer stays reachable at the bottom of its area. Preview state and device controls remain visible at the top of Preview. The current decision group's action remains reachable without covering content.

### Panel controls

- Decisions can collapse to a labeled rail with pending-count and status summary.
- Preview can expand, temporarily reducing Conversation and collapsing Decisions.
- Conversation focus mode expands Conversation and reduces Preview to a resumable summary.
- Preview-only mode hides editing surfaces temporarily but retains a persistent **Return to conversation** action and status label.
- Panel state persists per project and device class, but server-authoritative workflow state does not depend on that preference.
- Resizing, if implemented, must use keyboard-operable separators with bounds and announced values. Fixed responsive proportions are preferred if accessible resizing cannot be implemented reliably.

## 6. Tablet Layout Model

When three simultaneous areas no longer preserve useful content widths, the default tablet model is:

```text
Conversation + Preview
Decisions drawer
```

In landscape, Conversation and Preview share the workspace, with Preview receiving the larger share. In portrait, one may become the primary canvas with a persistent switcher for the other. The switch does not unmount or reset conversation, preview, or scroll state.

Decisions opens from a clearly labeled **Review** action that includes unresolved and approval-required counts. The drawer is modal only when it overlays both working areas; otherwise it may be a non-modal side sheet. A modal drawer traps focus, closes with Escape and its close control, restores focus to **Review**, prevents background interaction, and never closes merely because a streamed status arrives. A non-modal sheet remains in the normal focus order and does not trap focus.

Preview device controls remain available but use compact labels. Preview resizing favors **Fit**, **Desktop**, and **Mobile** choices rather than a freely resizable frame. Touch gestures are optional enhancements; every action has a visible control.

Orientation changes preserve:

- active area or drawer;
- current conversation position and unsent draft;
- preview revision, device, zoom, and scroll position;
- expanded decision group;
- pending approvals;
- real generation state.

The implementation should transition on available container space using existing responsive conventions. It should not infer “tablet” from user agent or device identity.

## 7. Mobile Layout Model

Mobile never compresses three columns. It uses three persistent destinations:

```text
Chat
Preview
Review
```

These are tabs or equivalent view switches, not separate routes or project states. Their order is meaningful: Chat is the primary input, Preview shows the current proposal, and Review holds decisions and approvals.

### Mobile shell

- A compact project header shows save or generation state.
- A labeled tab list exposes Chat, Preview, and Review; Review includes a text-accessible pending count.
- The current tab, project, preview revision, and unsent message survive refresh where safe.
- Real generation progress remains visible as a compact persistent status from every tab and opens the full progress view.
- A critical approval is never hidden only inside a badge; the current journey action states what remains.

### Chat

The composer remains above the software keyboard and safe-area inset. Opening the keyboard must not obscure the input, send action, error, or suggested replies. The merchant returns to the previous reading position after visiting another tab. A **Jump to latest** control appears when new content arrives below the current position.

### Preview

Preview uses the full content width. Device framing may switch between **Fit**, **Desktop overview**, and **Mobile**; it must not shrink a desktop page until text becomes meaningless. Pan and zoom are optional enhancements with button equivalents and a reset action.

### Review

Decision groups become an accordion or stacked list. The final primary action is sticky only when it does not cover the last decision, validation error, or system keyboard. Sensitive confirmations remain explicit and reachable.

The current dashboard already collapses major layouts at 720px. The implementation audit may reuse that established mobile threshold, subject to testing with this interaction model and embedded Shopify Admin constraints.

## 8. Panel Responsibilities

The three areas coordinate through stable, merchant-facing focus targets.

| Trigger | Conversation response | Preview response | Decisions response |
| --- | --- | --- | --- |
| Merchant selects a preview section | Composer receives optional context such as “Hero” | Section gains a non-color-only focus indicator | Related design/resource decisions move into view |
| Merchant selects a decision | Conversation offers **Ask Calinium about this** | Affected region is highlighted when present | Decision expands without changing status |
| Merchant submits a refinement | Request and interpretation appear | Current preview remains until a candidate update is ready | Affected decisions show **Updating**, then candidate changes |
| Calinium needs confirmation | Concise prompt links to the decision | Unconfirmed content is absent or clearly provisional | Exact confirmation card receives required status |
| Preview becomes stale | Conversation is not interrupted | Stale label and latest-revision action appear | Changed dependencies identify affected decisions |
| Approval succeeds | Short confirmation, not an activity dump | State may move from Provisional to Approved when all requirements pass | Status and revision update visibly |

Cross-panel focus must never imply approval. Hover synchronization is optional; keyboard focus and selection must provide the same understanding. If a preview element has no decision or a decision has no visual representation, the interface says so rather than creating a false connection.

## 9. Conversation Panel

### Message structure

Each message identifies Calinium, the merchant, or a concise system status. Calinium messages contain one primary idea or question. Merchant messages preserve their submitted wording. System status uses compact inline rows or a grouped progress card rather than impersonating Calinium or flooding the transcript.

Messages may include:

- plain text with semantic paragraphs and lists;
- one current question;
- suggested reply chips;
- a linked decision or preview context;
- an explicit confirmation control for a specific safe decision;
- error and recovery actions;
- source labels when factual provenance matters.

Internal stage names, activity logs, schema errors, and every resource scan event do not become chat messages.

### Composer

The composer supports multiline text. Enter sends only when the product convention is clearly communicated; Shift+Enter always inserts a newline. On touch devices, a visible Send control is primary. Empty or whitespace-only messages cannot send. During persistence, the submitted message is visibly pending and duplicate send is disabled. Failure restores the exact draft with **Retry** and **Edit**.

Suggested replies never replace free text. Contextual affordances include **I don't know**, **You decide**, **Skip for now** for optional questions, and **Edit my last answer**. **You decide** delegates a design choice only; it is unavailable for sensitive facts or required business truth.

### Website and attachments

The optional website URL appears as a secondary structured control associated with the first conversation, not a prerequisite. It supports **Skip**, later addition, retry, and removal from future analysis. Attachments appear only for resource types and approval flows the existing architecture can safely own. The interaction design does not authorize generic file interpretation or new upload capability.

### Corrections and history

Previous answers remain inspectable. Editing the last answer creates a correction with dependent-impact preview; it does not rewrite transcript history. **Revise direction** starts a scoped candidate change. Conversation history may be summarized for readability, but confirmed facts, decisions, and revision provenance remain server-authoritative.

## 10. Live Preview Panel

Preview has exactly three merchant-visible states.

### Provisional

**Label:** `Provisional — still taking shape`

It may contain section skeletons, structural placeholders, real approved Shopify products, approved images, provisional typography and spacing, and recommendation labels. It never contains invented merchant claims, fabricated captions, fake testimonials, invented product relationships, unsupported destinations, or starter content presented as real.

### Approved

**Label:** `Approved direction — ready for generation review`

It represents current merchant-approved design, resources, and content. It remains a review representation, not a Shopify package. The label includes the current approved preview revision and warns if a later candidate change exists.

### Generated

**Label:** `Generated theme — validated package`

It represents an actual generated Shopify package or a trusted render of that exact package. It identifies the generation/version relationship and does not silently show newer project edits. If trusted rendering is unavailable, Delivery must not imply that a design mockup is the generated package.

### Controls and behavior

- Device controls use **Fit**, **Desktop**, and **Mobile** with accessible pressed state.
- Zoom offers labeled steps and **Reset**, while browser zoom remains fully supported.
- Refresh requests the latest eligible preview and never changes approved data.
- Preview loading uses structural skeletons that match expected layout without invented text.
- Links and commerce actions are disabled by default in Provisional and Approved previews to prevent navigation, cart effects, or confusion; an explicit inspection mode may enable safe navigation later.
- Clicking a supported preview region selects it for cross-panel discussion. It never edits runtime settings directly.
- Unsupported sections are not faked. The preview shows a bounded explanation outside storefront content or omits the section with a link to Omissions.
- Omitted sections are explained in Decisions, not represented by persuasive empty placeholders.
- A stale preview displays its source revision and **Update preview**; stale content is never silently presented as current.
- Revision identity is merchant-friendly, such as **Preview updated after your hero change**, with technical identifiers available only in authorized Advanced detail where useful.

## 11. Decision and Review Panel

Decisions are grouped by merchant intent:

```text
Design
Content
Resources
Pages
Claims requiring confirmation
Omissions
```

Groups show a concise status and count, not a required checklist count when nothing needs action. Claims requiring confirmation and blocking issues sort ahead of ordinary approved items. Omissions remain visible but quiet when they are safe.

Each decision card shows:

- merchant-facing name;
- current choice or omission;
- status: Provisional, Recommended, Needs review, Approved, Changed, Omitted, or Blocked;
- one short reason;
- source such as **Your answer**, **Shopify collection**, **Approved image**, or **Calinium recommendation**;
- whether approval is required;
- **Change**, **Review**, **Confirm**, or **Ask Calinium** as appropriate.

The panel never exposes canonical enum IDs, database IDs, runtime section or block names, setting IDs, checksums, JSON, schema terminology, or raw confidence scores. If confidence is shown, it uses merchant-understandable language and reason, subject to the open product decision about confidence visibility.

Bulk approval is limited to ordinary, current recommendations. It cannot include ambiguous resources, factual content, evidence, claims, payment, or generation consent. A bulk action previews exactly which decisions it will approve.

## 12. Welcome State

The first experience is conversation-led and visually quiet. Exact art direction remains open, but the content hierarchy is fixed:

1. Calinium identity and **AI Creative Director** role.
2. A short promise to design around the merchant's brand, products, and customers.
3. Confirmation that the connected Shopify store is already available.
4. The primary question: **What do you sell?**
5. A large conversational input and clear **Continue** action.
6. Secondary optional website input with **Skip for now**.
7. A restrained note that Calinium will begin learning from Shopify after the first meaningful answer.
8. A low-emphasis mode action for merchants who want Guided or Advanced control.

The welcome state does not ask for the `.myshopify.com` domain, show OAuth or technical onboarding when authentication is already valid, expose presets as marketplace products, list nine internal stages, show payment, or compete with Premium Theme checkout.

Before entry, Preview may show a neutral empty canvas labeled **Your first direction will appear here** and Decisions may be collapsed or absent. This does not resolve whether all three desktop areas should be visible on the first screen; that remains an open decision.

Returning merchants see **Continue your theme** and a merchant-safe summary of the last durable state. They are never placed into a new project or duplicated journey without an explicit choice.

## 13. First Merchant Message

A first message is meaningful when it gives Calinium usable business context rather than only a greeting, punctuation, or an empty response. The client may guide, but the server determines accepted state and persists it before advancing.

### Interaction sequence

1. The merchant enters what the business sells.
2. They may add a public website URL or skip it.
3. **Continue** enters a pending state and prevents duplicate submission.
4. On server acceptance, the merchant message appears durably in Conversation.
5. Real store-learning tasks begin independently.
6. Calinium asks the next unresolved question while learning continues.
7. Preview remains waiting or becomes Provisional according to the future evidence threshold decision.

The interface must not optimistically claim Shopify analysis has begun until the server accepts the answer and starts or schedules eligible work. It may say **Saving your answer…** before acceptance.

If the website URL is invalid, the answer can still proceed. The URL field receives a local format message and remains optional. If the business description is too ambiguous, Calinium asks a concise clarification rather than fabricating a category.

Editing this message later creates a correction and may mark dependent understanding, recommendations, and preview as stale. It never mutates approved history in place.

## 14. Automatic Store Learning State

After the first accepted message, a compact progress surface appears without blocking Conversation:

```text
Reading your catalog
Reviewing your collections
Finding your strongest imagery
Learning your navigation
Analyzing your public website
Preparing your first design direction
```

Only tasks actually started by the server appear as active. Each item uses Waiting, In progress, Complete, Skipped, Needs attention, or Failed. Completed items condense into **Store learning complete** with an expandable detail. Optional website analysis appears only when a URL was supplied and the capability is enabled.

The merchant can continue answering during all non-blocking analysis. Conversation receives at most one concise start status and one outcome summary; individual task changes belong in the progress surface and restrained accessibility announcements.

Shopify remains authoritative for products, collections, menus, files, media, and eligible theme resources. Public website findings are supplemental and retain provenance. They cannot override Shopify identity or become approved sensitive truth.

An optional website failure offers **Retry** and **Skip website** and does not stop Shopify analysis, questioning, or a safe provisional design. A Shopify authorization failure explains the required reconnection and preserves merchant answers. Completed work is not restarted merely because one task failed.

## 15. Guided Question Flow

Questioning is adaptive rather than a fixed survey. Quick Start targets five to seven essential merchant questions at most, and fewer when confirmed context is sufficient. Only one primary question is visible at a time; the interface may indicate broad progress such as **A few details left** without promising a fixed count that adaptive skipping could change.

Potential topics are business offer, main customer, desired feeling, primary objective, priority product line, what to avoid, and mode preference when useful. A topic is skipped when an authoritative source or explicit prior answer resolves it. A skipped topic remains inspectable in Understanding with its source.

Suggested answer chips accelerate common responses but never constrain natural-language input. **I don't know** records an unknown. **You decide** is offered when Calinium can safely recommend a subjective design choice and records delegation, not merchant fact. Optional unanswered questions are marked omitted or delegated under policy; they do not silently receive fabricated answers.

Confidence guides follow-up priority internally. The merchant sees uncertainty in plain language, not raw scoring, unless confidence visibility is later approved. Calinium may say:

> I can choose a restrained motion direction based on the feeling you described. You can change it later.

It may not say that for founder history, handmade or artisan claims, material or geographic origin, sustainability, certifications, awards, testimonials, reviews, comparisons, performance, customer results, revenue, conversion, statistics, or external proof. Those require exact merchant confirmation and evidence where governed.

## 16. Emerging Preview State

The Preview area is present as a destination before the first meaningful render, but the trigger for first visual content remains an open decision. When the evidence threshold is met, the state changes to **Provisional** and announces once that a first direction is available without stealing focus.

The earliest useful preview may be structural:

```text
Hero
Featured Collection
Craftsmanship
Newsletter
```

It may progressively gain approved imagery, real Shopify product cards, typography direction, color direction, spacing, section order, navigation, and approved content. Each update is associated with a current source revision. Partial updates do not blank the existing preview; the old preview remains visible with **Updating** until the candidate is ready.

Structural placeholders describe function, not merchant content. For example, **Featured collection location** is acceptable; an invented collection title is not. Unsupported evidence sections are absent. Missing optional media uses a safe structural treatment only when runtime policy supports it.

The merchant can select a preview region and choose **Ask Calinium about this**, but no preview click directly mutates Shopify configuration. Links and commerce actions remain disabled in this state. A text summary remains available when rendering fails or is inaccessible.

## 17. Calinium Understanding Review

The merchant sees a concise review titled **Here's what I understand about your business**. It groups:

- what the merchant sells;
- main customer;
- primary objective;
- priority products or collections;
- intended feeling;
- what to avoid;
- confirmed facts;
- Calinium interpretations;
- unresolved questions.

Facts, interpretations, and unknowns have distinct text labels and icons, not color alone. Each item provides **Correct**, **Explain**, or **Review details**. A correction opens the Conversation composer with the item as context and previews dependent effects before saving.

The primary action confirms the understanding as current; it does not bulk-approve sensitive claims or downstream design. If a critical unknown remains, the action becomes **Answer one question** and moves focus to that prompt.

Calinium composes this review from Understanding, Brand Blueprint, and Store Strategy while those systems retain their own persistence and validation. The interface does not flatten their factual status. A correction creates a new candidate, marks affected recommendations and preview stale, preserves unrelated approved decisions, and never edits an immutable revision.

## 18. Recommended Design Review

The review leads with one recommendation:

- recommended preset;
- a short reason it fits;
- homepage structure;
- typography direction;
- color direction;
- motion approach;
- commerce emphasis;
- intentional content omissions;
- current Provisional preview.

Compatible alternatives appear only after **Show alternatives** or when the recommendation is blocked. The interface avoids a marketplace grid and raw scoring. Preset identities such as Atelier, Maison, Gallery, Ritual, Essential, and Signal are foundations within the Custom Theme journey.

Primary interactions are:

- **Use this direction** — creates the explicit current approval required by existing policy;
- **Show alternatives** — compares only compatible options and their meaningful tradeoffs;
- **Make it more…** — seeds a constrained conversational refinement;
- **Explain this choice** — reveals concise source and rationale;
- **Open Advanced mode** — exposes Store Strategy and Preset detail.

Until the open preset-auto-acceptance decision is resolved, continuing past this review must not silently approve the preset. A preset never provides merchant facts. Design review calls out omitted founder, craft, sustainability, testimonial, campaign, or efficacy content when evidence is absent, without pressuring the merchant to invent it.

## 19. Recommended Resource Set Review

The review begins:

> Calinium selected the strongest resources for your theme. Review anything you want to change.

Ordinary, current recommendations can be accepted with **Approve recommendations**. Before confirmation, the action lists the included slots and excludes sensitive evidence, ambiguous items, stale resources, and required unresolved choices.

| Slot | Card must show | Alternatives and fallback | Approval behavior |
| --- | --- | --- | --- |
| Logo | Thumbnail/name, source, reason, confidence, current availability | Other approved logo candidates; text identity where supported | Bulk when unambiguous; individual when identity is uncertain |
| Hero media | Preview, source, reason, suitability | Other approved media; simpler composition or omission | Bulk when ordinary and current |
| Hero destination | Destination name/type and exact source | Other approved compatible destinations; no link | Individual if destination meaning changes |
| Featured collection | Shopify collection, reason, availability | Other approved collections; omit eligible section | Bulk when aligned and current |
| Featured product | Shopify product, reason, availability | Other approved products; omit | Bulk when aligned and current |
| Craftsmanship media | Media plus evidence status | Other evidence-linked approved media; omit media/block | Evidence confirmed separately; never bulk-proves a claim |
| Primary navigation | Approved Shopify menu and summary | Other approved menus; existing safe menu where supported | Individual when changing the selected menu |
| Preview theme | Eligible theme identity and compatibility | Other eligible themes; safe review representation | Existing preview policy governs approval |
| Optional video | Approved video, rights/accessibility status | Approved image; omit | Individual if selected; omission safe |

Every slot shows recommended resource, short reason, source, alternative count, safe fallback, confidence language if enabled, omission safety, and explicit-approval requirement. **Review details**, **Change one item**, and **Use Advanced mode** provide progressive disclosure.

Founder, handmade, artisan, origin, sustainability, certification, award, testimonial, review, comparison, performance, customer-result, revenue, conversion, statistical, and external-proof content is never included in bulk approval. It remains under **Claims requiring confirmation** with exact wording, source, evidence, and an individual decision.

## 20. Conversational Refinement

Supported requests describe outcomes, for example:

```text
Make it darker
Use less motion
Remove the newsletter
Make the hero shorter
Show more products
Use the black bag first
Make it feel more editorial
```

Calinium resolves each request into constrained candidate decisions owned by existing systems. It does not translate free text directly into Liquid, JSON, CSS, runtime setting IDs, unvalidated resource references, or theme mutations.

### Request cycle

1. Preserve the merchant's exact request in Conversation.
2. Identify affected decisions and preview regions.
3. Ask one clarification when the request is materially ambiguous.
4. Reject or narrow unsupported or unsafe interpretations.
5. Show a concise proposed-change summary.
6. Update Preview as a new Provisional candidate.
7. Require confirmation when an approved decision, content, destination, resource, or evidence changes.
8. Preserve unaffected approvals and stable semantic identities.

Undo restores the previous candidate or approved state through revision-aware operations; it does not rewrite history. Redo reapplies an eligible undone candidate only if dependencies remain current. Whether undo/redo is global or conversation-scoped remains open. Revision history shows merchant-friendly summaries, time, author role, and status without raw payloads.

Conflicts identify the current authoritative value and explain what changed. A request like “make it artisanal” may alter visual character but cannot create an artisan claim. Product replacement uses an approved selector and cannot be inferred from image appearance.

## 21. Final Review and Payment

One final review surface contains:

- selected design and preset;
- homepage composition and page coverage;
- key resources and their current status;
- intentionally omitted sections or content;
- claims still requiring confirmation;
- validation blockers and warnings;
- server-authoritative price;
- explicit generation behavior;
- ZIP and summary delivery format;
- the statement that Calinium will not automatically upload, update, install, or publish a Shopify theme.

The primary action is **Purchase and generate theme — [current price]** or equivalent copy that clearly communicates payment and generation. A generic **Continue** is not sufficient. The action remains disabled only for genuine blockers; every blocker links to its merchant-facing decision.

The confirmation step distinguishes:

```text
Approve design and content
≠
Authorize payment and generation
≠
Install or publish theme
```

Server-side validation rechecks scope, approvals, resource revisions, preset, Approved Block Plan, payment eligibility, and immutable input readiness. Double activation is disabled on the client and rejected idempotently on the server. A prior subscription or order never implies consent for this generation or a later update.

## 22. Generation Progress

Generation displays only real server states, potentially:

```text
Preparing approved inputs
Building theme foundation
Applying design system
Creating homepage
Creating product and collection pages
Applying approved content
Validating Shopify JSON
Running Theme Check
Packaging theme
Ready
```

Each state has Waiting, Active, Complete, Retryable failure, or Blocked. The interface does not invent percentages, completion times, or background activity. Duration copy uses honest ranges only after measurement; otherwise it says the merchant may safely leave and return.

The progress surface includes:

- current real stage and completed-stage history;
- start time and last server update where useful;
- safe explanation of warnings or omissions;
- **Retry** only when the server marks retry eligible;
- **Continue elsewhere** or safe navigation without canceling work;
- persistent order identity in merchant-friendly form;
- an explicit note that the live Shopify theme is unchanged.

Streaming is resumable. Refresh resolves current order state before rendering and resumes after the last accepted event. Repeated clicks, reconnects, retries, and browser back/forward cannot create duplicate charges or completed generations. A retry uses the same paid order and pinned inputs. Changed project data never enters an in-flight order.

## 23. Delivery Experience

The successful theme card shows:

- theme name and target version;
- generated version identity and completion time;
- **Download theme ZIP** as the primary action;
- validation summary and Theme Check status where available;
- merchant-friendly generation and omission summary;
- manual Shopify upload and unpublished-preview instructions;
- download integrity or package details without local paths;
- explicitly merchant-initiated refinement options.

The required notice is:

> Calinium has not modified or published your Shopify theme. Download and install the generated package when you are ready.

Preview instructions explain that the merchant should add the ZIP as a new unpublished theme and inspect it before choosing whether to publish. Calinium does not upload, install, activate, update, or publish it.

A future subscription introduction may appear after successful delivery, but its timing and treatment remain open. It must not obscure the ZIP, imply automatic updates, or convert completion into recurring consent. Refinement begins a new explicit request and revision path. Regeneration uses approved new inputs and any required paid action; it never mutates the delivered package or old order.

Interrupted downloads can resume or restart through authorized artifact access without regeneration or another charge.

## 24. Quick Start Mode

Quick Start is the default merchant experience. It presents Conversation, progressive Preview, and one combined Decisions review while hiding the internal stage sequence.

Its interaction contract is:

- five to seven essential questions maximum, and fewer when safe;
- automatic Shopify analysis after the first meaningful answer;
- optional, non-blocking public website analysis;
- automatic compatible preset recommendation;
- automatic Recommended Resource Set;
- ordinary resources approved as a set where current and unambiguous;
- sensitive claims confirmed individually;
- one combined final review;
- target under ten minutes to paid-generation readiness;
- Advanced detail always available without restart.

Quick Start may collapse Decisions until there is something useful to inspect, subject to the open default-panel decision. It cannot hide a blocking approval, pretend a provisional preview is approved, approve a preset silently under current policy, or lower validation standards to meet the time target.

Optional resources do not block generation. Their card shows the safe fallback or omission. When genuinely required content is absent, Calinium asks for the minimum merchant action and explains why.

## 25. Guided Mode

Guided uses the same project, panels, data, and safety rules as Quick Start but adds context before consequential choices.

Differences include:

- short explanations for why a question matters;
- recommendation rationale visible by default;
- compatible alternatives and tradeoffs shown earlier;
- more deliberate Understanding, Design, and Resource checkpoints;
- optional preview annotations connecting decisions to outcomes;
- clearer advance notice when a correction will invalidate downstream approval;
- no increase in sensitive-content automation.

Guided does not become an exhaustive form. It still asks only unresolved questions and recommends first. The merchant may collapse explanations, ask Calinium to decide eligible subjective choices, or switch to Quick Start without losing detail.

The mode is useful for merchants who want confidence and education but do not want internal implementation stages. It never exposes raw scoring, schemas, runtime IDs, or technical settings.

## 26. Advanced Mode

Advanced exposes the existing detailed stages:

```text
Understanding
Brand Blueprint
Store Strategy
Preset
Store Resources
Content Plan
```

Conversation, Your Theme, and Delivery remain connected to the same project. The current stage navigation and granular approvals may be presented in the Decisions area or a dedicated detailed workspace, provided Conversation and Preview remain reachable.

Advanced allows merchants to inspect facts, assumptions, unknowns, strategy recommendations, preset compatibility, resource provenance, content placements, evidence, omissions, and current approval status. It does not expose secrets, tokens, internal file paths, mutable immutable-snapshot payloads, raw JSON, or editable runtime IDs.

No current capability is removed. Existing stage guards, server validation, project/shop scope, revision history, and approval ownership remain authoritative. Advanced is not a bypass for unsupported content or generation eligibility.

Entering Advanced focuses the most relevant underlying stage. It does not restart the conversation, create a new project, duplicate revisions, or invalidate unrelated approvals.

## 27. Mode Switching

Quick Start, Guided, and Advanced are views over one authoritative project.

### Allowed switching

Switching is allowed before paid generation whenever no blocking transactional confirmation is open. During payment redirection or an active modal approval, the interface first completes or safely cancels that interaction. During generation, mode changes may alter how history is displayed but cannot edit pinned inputs.

### State preservation

- Returning to Quick Start hides detailed stage presentation but preserves every decision, approval, unknown, and warning.
- Pending Advanced approvals reappear in the combined Review group; they cannot disappear merely because the mode changed.
- Guided explanation expansion is a view preference, not project data.
- Unsaved composer text and panel state are preserved locally where safe; accepted work is server-authoritative.
- Mode preference may persist per project and device class.

### Conflicts and revisions

If an Advanced edit changes a value summarized in Quick Start, the combined recommendation becomes Changed or Needs review. Quick Start never overwrites the detailed edit with an older recommendation. Conversational corrections route to the same owning record as Advanced changes.

A mode switch itself creates no strategy, preset, content-plan, resource-snapshot, or approval revision. Revisions arise only from actual persisted content or decision changes under existing rules.

## 28. Loading and Streaming Behaviour

Server-Sent Events are the preferred future interaction pattern for one-way progress because store learning, preview preparation, and generation primarily stream server-authoritative status to the client. This is a design preference, not an implementation decision; an architecture audit may retain another existing transport if it provides equivalent ordered, resumable, authenticated behavior. WebSockets are not required merely to appear real-time.

### Conceptual event types

```text
analysis.started
analysis.task.updated
analysis.completed
preview.started
preview.ready
preview.failed
decision.updated
approval.updated
generation.stage.updated
generation.completed
generation.failed
```

Each event conceptually carries project/order scope, monotonic server sequence or resumable cursor, entity revision, event type, non-sensitive status, and server time. The client treats the server as authoritative.

### Ordering and recovery

- Events apply only in sequence for the matching project and active entity revision.
- Duplicate event IDs are ignored idempotently.
- Older revision events cannot replace newer state.
- Gaps trigger authoritative state refresh before later events render.
- Reconnection resumes from the last accepted cursor where supported.
- If resume is unavailable, the client fetches current state before reopening a stream.
- Partial task failure updates that task without converting unrelated work to failed.
- Client retry uses bounded backoff and never restarts server work unless an explicit retry endpoint accepts it.

Streaming updates do not steal focus or force scroll. A restrained polite live region announces milestones, not every event. No UI displays fake progress while disconnected.

## 29. Error, Recovery, and Resume

Errors answer four merchant questions: **What happened? What is safe? What do I need to do? Was my work saved?** Technical detail stays in server diagnostics.

| Failure | Merchant message and action | Preserved state |
| --- | --- | --- |
| Answer save fails | “I couldn't save that answer yet.” **Retry** or **Edit** | Exact draft and prior durable conversation |
| Shopify learning fails | Identify affected source and **Reconnect** or **Retry** | Merchant answers and completed independent tasks |
| Website analysis fails | “I couldn't read that website.” **Retry** or **Skip website** | Shopify analysis and journey progress |
| Preview fails | Text structure remains; **Try preview again** | Current decisions and last valid preview marked stale |
| Recommendation validation fails | Identify merchant-facing decision to review | Approved source strategy and revision history |
| Resource becomes stale | **Refresh**, **Choose another**, or **Omit** when allowed | Other resource approvals and recommendation |
| Payment canceled/fails | Clear unpaid state and safe retry | Approved inputs and idempotent order state |
| Generation fails | Actual failed stage and eligible **Retry** | Payment, pinned inputs, completed safe stages |
| Download fails | **Download again** | Ready artifact and order; no regeneration |

Refresh first loads the server-authoritative project, then restores view preferences and unsent drafts only when they match the same project and current revision. Stale local edits require comparison rather than silent overwrite.

Resume returns to the last durable outcome and explains any work that continued in the background. It never creates a duplicate project, approval, payment, or generation. Errors reveal no secrets, stack traces, filesystem paths, raw snapshots, or cross-project existence.

## 30. Empty and Partial States

Empty states explain what Calinium needs without pressuring merchants to invent content.

- **No conversation yet:** Show the first question and connected-store acknowledgment.
- **Analysis not started:** Explain that it begins after the first meaningful answer.
- **No website:** Mark optional analysis skipped; do not show a warning.
- **No preview yet:** Show **Your first direction will appear here** and what Calinium is currently learning.
- **Partial preview:** Render verified structure and resources only; label unresolved areas without fake merchant copy.
- **No decisions yet:** Collapse Decisions or show **Nothing needs your review yet**.
- **No approved image:** Use an allowed structural fallback or omit media; never use an unrelated stock image.
- **No eligible optional video:** Offer approved image or omission.
- **No sensitive evidence:** Omit the claim or section and explain under Omissions.
- **No compatible resource:** Identify the required type and route to approved resource selection.
- **No generated package:** Keep Delivery unavailable and explain the required paid generation boundary.

Partial states distinguish Waiting, Optional, Omitted, Needs review, and Blocked. Optional absence never masquerades as an error or blocks paid-generation readiness unless the selected composition genuinely requires that resource.

## 31. Notifications and Status Messaging

Status belongs near the affected area first and in global notification only when it affects the whole journey.

- Inline status handles answer saving, resource refresh, individual decision validation, and preview staleness.
- Panel banners handle analysis summary, several related omissions, or a review group requiring attention.
- Toasts confirm reversible low-risk outcomes such as **Recommendation saved**; they never carry the only copy of an error or approval requirement.
- Global banners are reserved for authentication, project authorization, payment, generation, or system availability.
- Persistent generation status remains reachable from all panels and modes.

Status vocabulary is consistent: Saving, Saved, Updating, Provisional, Recommended, Needs review, Approved, Omitted, Blocked, Generating, Ready, and Failed. Color and icon reinforce but never carry status alone.

Background successes are quiet. Calinium does not announce every completed catalog page or preview fragment. A status message never claims approval, payment, or completion before server confirmation. Dismissal hides presentation only; it cannot resolve a blocker or approval.

## 32. Copy and Tone

Calinium sounds calm, confident, direct, premium, helpful, and non-technical. It avoids hype, excessive exclamation marks, internal jargon, schema terms, “AI magic,” false certainty, manipulative urgency, and promises unsupported by current state.

| Moment | Preferred copy |
| --- | --- |
| Welcome | “I'm your AI Creative Director. I already have access to your connected Shopify store. What do you sell?” |
| Analysis | “I'm reviewing your catalog and imagery while we continue.” |
| Recommendation | “I recommend Atelier because your direction is restrained, product-led, and craft-focused.” |
| Uncertainty | “I couldn't confirm who this collection is for. You can tell me, or I can leave that detail out.” |
| Omission | “I left out the craftsmanship claim because it hasn't been confirmed.” |
| Failure | “I couldn't refresh that collection. Your other choices are still saved.” |
| Recovery | “Try again, choose another approved collection, or leave this section out.” |
| Generation | “Your approved inputs are saved. I'm validating the theme package now.” |
| Delivery | “Your validated theme is ready to download. Calinium has not changed or published your live theme.” |

Reasons should be brief and specific. “Because it matches your answers” is weaker than naming the approved direction. Uncertainty should not sound apologetic or evasive. Omissions should be framed as protection of merchant truth, not product failure.

Button copy describes consequence: **Use this direction**, **Approve recommendations**, **Purchase and generate theme**, **Retry generation**, and **Download theme ZIP**. Avoid generic **Submit** or **Continue** at consequential boundaries.

## 33. Accessibility

The interaction targets WCAG 2.2 AA.

### Structure and labels

- The application has one page-level heading and labeled Conversation, Preview, and Decisions landmarks or regions.
- Tabs, drawers, dialogs, accordions, separators, status regions, and device controls use native semantics or equivalent complete patterns.
- Preview state and revision are available as text.
- Decision status, source, omission, and approval requirement never rely on color alone.
- Inputs retain visible labels; suggested replies do not replace the question or label.

### Focus and announcements

- DOM and focus order follow Conversation, Preview, then Decisions regardless of visual rearrangement, unless the active mobile tab limits content appropriately.
- Background analysis, preview updates, and streaming do not steal focus.
- One polite live region announces meaningful milestones such as first preview ready or generation completed; frequent task changes remain visually available without repetitive speech.
- Errors focus a summary only after an explicit submit failure and link to the affected control.
- Opening and closing modal drawers restores focus predictably.

### Perception and operation

- Text, controls, focus indicators, and meaningful graphics meet required contrast.
- Browser zoom and text resizing do not clip approvals, errors, composer, or primary actions.
- Reduced motion produces immediate or minimal transitions.
- Every drag, pan, resize, or swipe enhancement has buttons or keyboard equivalents.
- Preview device frames have meaningful accessible names and do not expose decorative frame chrome as content.
- Status, generated validation, and omitted content remain understandable to screen-reader users.

Automated checks complement, but do not replace, keyboard, zoom, reflow, and screen-reader-oriented manual QA.

## 34. Keyboard Interaction

Keyboard behavior is consistent across modes and widths.

| Area | Required behavior |
| --- | --- |
| Global shell | Tab reaches project/mode/status/help in logical order; skip links move to active work area |
| Conversation | Tab reaches history actions, suggestions, composer, and Send; Shift+Enter inserts newline; documented Enter behavior sends |
| Tabs | Arrow keys move among Chat, Preview, and Review according to the chosen tab pattern; activation behavior is consistent |
| Preview | Device and zoom buttons are operable; selectable regions use buttons or links, not clickable divs; Escape leaves preview focus mode |
| Decisions | Accordions and actions use native button behavior; group navigation follows DOM order |
| Drawer/dialog | Focus enters at heading or first action, remains contained when modal, Escape closes, trigger regains focus |
| Resizable panels | If implemented, separators are focusable, arrow-adjustable, bounded, and announce relative size |
| Generation | Retry and navigation remain reachable; status updates do not move focus |

No single-key shortcut activates a destructive, payment, approval, or generation action. Shortcuts, if added later, are discoverable, disableable, and inactive while typing. Sticky controls do not create duplicate tab stops for the same action unless both copies remain synchronized and clearly scoped.

## 35. Responsive Behaviour

Responsive behavior is based on available container capability, not device names alone.

| Capability | Layout | Decisions | Preview | Conversation |
| --- | --- | --- | --- | --- |
| Three useful panel widths | Desktop three-area | Visible or merchant-collapsed rail | Dominant center area | Persistent left area |
| Two useful panel widths | Tablet/two-area | Accessible drawer or side sheet | Larger paired area | Persistent paired area |
| One useful panel width | Mobile/single-area | Review tab/stack | Preview tab/full width | Chat tab/default |

The current dashboard has an established 720px mobile collapse. Implementation should test and reuse that convention where suitable rather than introducing unrelated values. The transition from three to two areas needs an implementation audit because no canonical tablet breakpoint currently exists.

At 200% and 400% browser zoom, the interface may move to a simpler capability mode. It must not preserve desktop columns at the cost of clipped text or hidden actions. Long translations, large product titles, and system font enlargement wrap without overlapping preview controls or badges. Right-to-left presentation mirrors appropriate layout and icons while preserving logical Conversation–Preview–Review reading order.

Panel, tab, drawer, preview device, scroll, and draft state survive non-destructive resize and orientation change. Critical validation and payment actions remain visible without fixed-position overlap.

## 36. Motion and Transitions

Motion is subtle, functional, and subordinate to merchant decisions.

Allowed motion includes:

- panel or drawer opening and closing;
- a short preview crossfade between complete candidate revisions;
- section insertion or removal that helps preserve spatial understanding;
- progress-state transitions;
- decision status changes;
- a restrained first-preview reveal.

Avoid:

- decorative continuous motion;
- bouncing attention cues;
- autoplay demonstrations;
- animated fake typing that delays real content;
- large layout shifts;
- repeated pulsing status indicators;
- motion that competes with confirmation or payment;
- animating every streamed event.

With `prefers-reduced-motion: reduce`, transitions are removed or shortened to near-immediate state changes while preserving status text and focus. Preview changes should not flash or erase the old state during loading.

Framer Motion is not mandated. Any animation dependency requires a later implementation and performance audit; native CSS and existing dashboard behavior may be sufficient.

## 37. Performance Boundaries

This document sets qualitative boundaries because no measured Interaction Design 2.0 baseline exists.

- The conversation composer remains responsive while analysis, preview preparation, or generation streaming runs.
- Preview rendering and image decode do not block typing, question navigation, or decision approval.
- The application shell and first conversational input load before heavy preview assets.
- Preview media uses responsive sizing, lazy loading where appropriate, and bounded decoded dimensions.
- Streamed status events are coalesced so high-frequency server work does not trigger unbounded rendering or announcements.
- Large Shopify catalogs are summarized and paginated or virtualized in selectors; they are never all rendered into Conversation.
- Optional website analysis runs off the primary request path and does not block Shopify learning or merchant input.
- New preview requests cancel or supersede stale client/render work where safe, while server state remains authoritative.
- Hidden panels do not continuously perform expensive visual work.
- Mobile preview history, images, and transcript rendering remain memory-bounded.
- Resume retrieves current state efficiently rather than replaying an unbounded event history to the UI.

Concrete load, interaction, memory, preview, and streaming budgets require implementation measurement and beta hardware testing. This document does not claim unmeasured performance scores.

## 38. Security and Trust Presentation

Trust boundaries should be understandable without displaying security machinery.

- The welcome screen says Calinium already has access to the connected Shopify store; it does not request the store domain again.
- Resource cards identify Shopify, project asset, public website, or merchant answer as source.
- Website analysis is optional and visibly separate from Shopify-authoritative data.
- Project/shop mismatch, authentication, and authorization failures use safe language and never reveal another project's existence.
- Client input cannot supply approval status, immutable snapshots, checksums, resource bindings, paid state, or artifact paths.
- Sensitive claims show exact confirmation and source; no bulk action includes them.
- Approved revisions are described as saved and protected; corrections create a new reviewable version.
- Payment is server-verified and generation uses pinned approved inputs.
- Delivery explains that the ZIP is read-only output and the live Shopify theme is unchanged.

Never expose access tokens, session tokens, cookies, secrets, customer data, raw approval records, immutable snapshot contents, internal filesystem paths, stack traces, runtime IDs, or cross-project metadata.

The interface must never use reassuring copy to mask uncertainty. **Approved**, **Paid**, **Generated**, **Validated**, and **Ready** appear only after authoritative server confirmation.

## 39. Analytics Events

Analytics measures journey behavior without recording merchant message contents, website contents, resource payloads, claims, evidence, customer data, secrets, or other sensitive data.

| Event | Safe properties |
| --- | --- |
| `project_started` | Project-safe pseudonymous ID, entry path, mode |
| `first_message_sent` | Time from project start, mode; no message text |
| `website_analysis_started` / `completed` / `skipped` / `failed` | Capability outcome and duration band; no URL |
| `first_preview_visible` | Preview state, elapsed duration, renderer category |
| `recommendation_ready` | Elapsed duration, compatible-alternative count |
| `preset_accepted` / `preset_changed` | Preset ID where policy permits, mode |
| `resource_set_ready` | Slot counts by status, not resource identities |
| `resource_set_approved` | Included/omitted/individual-review counts |
| `resource_slot_changed` | Slot category and change type, not resource value |
| `advanced_mode_opened` | Prior mode and journey outcome |
| `refinement_requested` | Affected decision category only; no request text |
| `final_review_opened` | Elapsed duration and blocker count |
| `generation_started` / `completed` / `failed` | Order-safe ID, stage, duration, retry count |
| `theme_downloaded` | Artifact category and version-safe identity |
| `journey_abandoned` | Last durable outcome, mode, elapsed duration |

Events are server-confirmed where they represent approval, payment, generation, or delivery. Client events are not evidence that those actions succeeded. Analytics consent, retention, pseudonymization, and environment separation follow existing governance and require implementation review.

## 40. Beta Acceptance Criteria

AI Creative Director 2.0 interaction design is beta-ready only when the implemented experience demonstrates:

- First meaningful preview appears without completing every internal stage.
- The merchant can continue chatting while real analysis runs.
- Quick Start hides internal workflow complexity without weakening stage guards.
- Guided provides explanations and alternatives without becoming a technical form.
- Advanced preserves all existing detailed capabilities and authoritative state.
- Desktop, tablet, and mobile use distinct usable models.
- Mobile uses Chat, Preview, and Review tabs or equivalent drawers rather than compressed columns.
- Conversation, Preview, and Decisions preserve state during switching and resize.
- Provisional, Approved, and Generated preview labels are always unambiguous.
- A stale preview cannot silently represent current decisions.
- Recommended Resource Set can approve eligible ordinary recommendations in one action.
- Ordinary optional resources do not block generation.
- Sensitive claims and evidence require exact individual confirmation.
- The merchant can refine direction conversationally without direct unsafe runtime mutation.
- All accepted work survives refresh and resume.
- No streamed status steals focus or creates fake progress.
- Generation retry is idempotent and duplicate clicks do not duplicate charge or generation.
- The target beta merchant reaches paid-generation readiness in under ten minutes.
- Payment and generation are explicit merchant actions.
- Delivery supplies an authorized ZIP and manual installation guidance.
- No automatic Shopify theme upload, installation, update, or publication occurs.
- Critical flows pass WCAG 2.2 AA-oriented automated and manual validation.

Any failure in authorization, project scope, truth, approval, payment, immutability, no-fabrication, read-only generation, artifact access, or no-publish behavior blocks beta acceptance.

## 41. Open Product Decisions

The governing customer journey leaves these decisions unresolved, and this interaction design does not answer them without evidence:

1. What is the exact first-screen visual composition?
2. What evidence threshold makes the first preview visible?
3. On the welcome and early-conversation desktop states, are all three functional areas visible, or do Conversation and Preview begin as two visible areas with Decisions collapsed?
4. Can Quick Start skip a separate preset confirmation while still producing an explicit authoritative approval event?
5. How much recommendation reasoning is visible by default?
6. Is public website analysis enabled immediately after URL submission or separately confirmed?
7. How is the approximately $10 subscription introduced without distracting from delivery?
8. Are Premium Themes purchased only on `calinium.com` or also inside the Shopify app?
9. What exact desktop panel proportions pass content, localization, zoom, and embedded-app testing?
10. Does Decisions default open or collapsed after the first recommendation?
11. Does Preview first show content after the first meaningful answer or after the first complete recommendation?
12. Does the first preview use a local review renderer or generated Shopify JSON?
13. Do device controls appear before design approval?
14. Are website screenshots shown to the merchant, and under what provenance and privacy rules?
15. Is resource confidence merchant-visible, and if so, as bands, reasons, or both?
16. Is undo/redo global across candidate decisions or scoped to the conversation/refinement sequence?
17. Does the subscription entry appear at Delivery or in a later relationship screen?
18. Does implementation use accessible fixed panel proportions or merchant-resizable panels?
19. Which existing transport, or SSE design, best satisfies resumable authenticated streaming?

These decisions require prototype testing, architecture evidence, merchant research, accessibility validation, or founder judgment. They must not be resolved implicitly during implementation.

## 42. Out of Scope

This document does not implement or authorize:

- coding the interface;
- adding dependencies;
- changing React components;
- changing APIs;
- implementing Server-Sent Events or WebSockets;
- building Playwright crawling;
- building the preview renderer;
- modifying theme generation;
- modifying billing;
- modifying Shopify scopes;
- Design DNA;
- style mixing;
- a public marketplace;
- subscription implementation;
- new presets, sections, adapters, or runtime settings;
- automatic Shopify theme upload, installation, update, or publication.

It also does not define final commercial prices, subscription entitlements, premium-theme licensing, or automatic theme management. Those require separate authoritative product and technical contracts.

## 43. Implementation Readiness

This interaction contract is ready to guide a focused implementation-readiness audit and a screen-state prototype. The next product-design document should define the component and state contract for the three-area shell, including route/state ownership, responsive transformations, panel and tab semantics, decision-card variants, preview status anatomy, conversation composer states, streaming-status normalization, and focus management.

Before implementation begins, the team must map each proposed interaction to existing Conversation, Understanding, Brand Blueprint, Store Strategy, Preset, Store Resources, Content Plan, Your Theme, and Delivery service capabilities. Missing orchestration or rendering seams should be identified explicitly rather than filled by client inference.

Implementation must preserve the governing journey and the authoritative architecture: Shopify identity, project scope, immutable revisions and snapshots, explicit approvals, deterministic recommendations, paid-order pinning, read-only generation, authorized artifacts, merchant-initiated updates, and no automatic upload or publication.
