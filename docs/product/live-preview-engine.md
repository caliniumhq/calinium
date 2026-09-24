# Calinium Live Preview Engine

## 1. Purpose

This document is the canonical product contract for Calinium's Live Preview Engine: the bounded review projection that lets a merchant see a storefront direction develop before paid theme generation.

The Preview Engine sits between approved or provisional canonical decisions and visual merchant feedback. It makes progress visible, supports conversational refinement, and preserves a truthful distinction between an evolving direction, an approved direction, and the generated Shopify theme.

This is product architecture only. It defines behavior, ownership, state, safety, and Beta boundaries; it does not authorize a renderer, API, component, schema, storage model, theme mutation, or deployment change.

## 2. Governing Product Contracts

The Preview Engine must remain consistent with:

- [Calinium Customer Journey](customer-journey.md), which governs the simplified journey, paid action, delivery, and merchant control;
- [Calinium AI Creative Director Interaction Design](ai-creative-director-interaction-design.md), which governs the Conversation–Preview–Decisions experience, responsive panels, controls, recovery, and accessibility;
- [Calinium AI Behaviour](ai-behaviour.md), which governs truth, confidence, correction, approval, failure, and project-scoped learning;
- [Automatic Merchant Intake](automatic-merchant-intake.md), which governs source-aware business understanding and questions remaining;
- [Recommended Resource Set](recommended-resource-set.md), which governs resource eligibility, ranking, approval, fallback, and staleness;
- [Calinium Design DNA](design-dna.md), which governs bounded visual intent and preset-contained variation;
- [Calinium Recommendation Engine](recommendation-engine.md), which governs eligible composition, preset direction, omissions, alternatives, revisions, and determinism.

Existing authentication, canonical shop identity, project isolation, immutable approvals and snapshots, paid-order pinning, deterministic generation, artifact authorization, read-only package generation, and merchant-initiated updates remain authoritative.

The inspected runtime establishes an important Beta baseline. The current dashboard contains static preview-card and HTTPS-link UI affordances, while a separate read-only endpoint can report an approved existing unpublished Shopify theme. The paid-generation path does not currently populate the session Preview state or connect that endpoint to the Preview screen. The dashboard therefore does not yet provide an emergent storefront renderer or streaming preview. The generator creates validated templates and settings in an isolated workspace, then packages them with the unchanged Calinium One runtime. Its Markdown preview report and internal preview package are review artifacts, not rendered storefront previews.

## 3. Live Preview Definition

The Live Preview Engine is a versioned, project-scoped visual projection of current canonical storefront decisions.

```text
Merchant conversation
+ normalized intake
+ current recommendation revision
+ Recommended Resource Set revision
+ Design DNA revision or bounded provisional direction
+ approved content and runtime capabilities
→ Live Preview Engine
→ truthful visual review representation
```

It renders what Calinium currently knows and recommends; it does not decide those things itself. A preview revision references its owning input revisions and describes only the visual consequence of those inputs.

## 4. Product Philosophy

The merchant should see useful progress while still talking with Calinium:

```text
Describe the business
→ see truthful structure
→ see approved products and media appear
→ see a coherent design direction
→ refine conversationally
→ approve the direction
→ generate the actual theme
```

The Preview Engine favors momentum without theatricality. It must not delay all feedback until generation, and it must not fill an early preview with invented polish. A smaller truthful preview is better than a persuasive false one.

Preview is collaboration, not proof. Looking at, interacting with, or liking a preview never creates approval, payment, generation consent, or permission to modify Shopify.

## 5. Preview Responsibilities

The Preview Engine owns:

- rendering the current storefront direction as a review representation;
- creating and identifying preview revisions;
- projecting current recommendation, Design DNA, resources, and approved content;
- structural, content-aware, resource-aware, and design-aware rendering;
- homepage and bounded page representations;
- section order and visual hierarchy;
- desktop, tablet, and mobile preview modes;
- dependency-scoped partial updates;
- status, loading, stale, failure, and recovery presentation;
- merchant-safe provenance and current-versus-previous comparison;
- preserving a last stable representation while a newer revision prepares.

The engine should provide visual evidence that a canonical decision had the expected consequence. It must surface divergence rather than concealing it.

## 6. Preview Non-Responsibilities

The Preview Engine does not own:

- merchant facts, claims, copy, evidence, or product relationships;
- Automatic Merchant Intake conclusions;
- preset, recipe, page, section, or resource recommendation;
- resource eligibility, ranking, approval, or silent replacement;
- Design DNA normalization or preset-boundary decisions;
- content-plan or Approved Block Plan authoring and approval;
- canonical approval authority;
- payment, paid-order creation, or generation eligibility;
- theme generation, packaging, validation, upload, installation, publication, or update;
- inventory, cart, order, menu, product, collection, theme, or other Shopify mutation;
- arbitrary HTML, CSS, Liquid, JavaScript, Shopify JSON, or runtime-setting authoring.

A preview-only visual change that has no canonical decision behind it is invalid. The engine cannot use presentation state as a shadow configuration system.

## 7. Preview Lifecycle

The canonical lifecycle is:

```text
Thinking
→ Provisional preview revision
→ refinement and validated partial revisions
→ Approved preview revision
→ explicit paid generation
→ Generated preview tied to the exact output
```

Thinking is a lifecycle status before a meaningful preview artifact exists. Provisional, Approved, and Generated are distinct preview artifact classes. Updating, stale, unavailable, and failed qualify one of those states or the rendering work; they do not create extra approval states.

Transitions require server-authoritative input status. Rendering alone does not promote a state. A material correction moves the affected direction back to Provisional; it never rewrites an Approved or Generated historical revision.

This is the ideal representation sequence, not a rule that successful visual rendering is a prerequisite for payment or generation. When the Preview renderer is unavailable, a truthful structural/text review of the same approved canonical inputs may preserve generation eligibility if every actual approval, resource, content, payment, and generation gate passes.

## 8. Preview States

| State | Owner and inputs | Output and stability | Merchant visibility | Transition and limitation |
| --- | --- | --- | --- | --- |
| **Thinking** | Preview orchestration using incomplete current inputs | Status or structural skeleton; no canonical preview artifact | Clearly described as preparation | Moves to Provisional only when a meaningful truthful projection exists |
| **Provisional** | Current eligible recommendation candidate, truthful resources/content, and provisional bounded design direction | Editable revision; may change as inputs resolve | Always labelled **Provisional** | Cannot imply approval, package fidelity, or generated truth |
| **Approved** | Exact current approved recommendation, preset, Design DNA, resources, and visible content dependencies | Stable review representation pinned to approved revisions | Always labelled **Approved preview** | Remains distinct from generation; material changes create a new Provisional revision |
| **Generated** | Exact paid-order-pinned inputs and trusted generation result | Actual generated package representation or trusted render of that exact result | Always labelled **Generated theme** with generation identity | Cannot include newer project edits or be claimed before required validation succeeds |

Every state exposes its status without relying on color. The state label, revision or generation identity in merchant-safe form, freshness, and relevant limitations remain available wherever the preview is shown.

## 9. Thinking State

**Ownership:** Preview orchestration owns the status; the upstream systems still own all inputs.

**Inputs:** The first merchant answer, in-progress Shopify learning, candidate intake findings, and any already-approved resources that are safe to display.

**Output:** A calm empty state, truthful section boundaries, or skeleton anatomy such as Header, Hero, Product discovery, and Footer. Thinking is not itself a preview artifact.

**Stability and visibility:** The merchant may continue chatting. Status communicates real work such as reading the catalog or preparing a first direction. Completed work is summarized compactly; there is no fake percentage, timer, or simulated AI typing.

**Transition and limitations:** Thinking becomes Provisional when a recognizable, truthful direction can be projected. It contains no invented brand copy, demo product, testimonial, claim, destination, or persuasive fake visual. If meaningful rendering remains unavailable, a structural text summary is the fallback.

## 10. Provisional Preview

**Ownership:** The Preview Engine owns the representation; Recommendation, Resource Set, Design DNA, content, and runtime systems own its meaning.

**Inputs:** A current eligible recommendation candidate, current approved resources used as real merchant content, approved Shopify product/collection data, approved content where available, and bounded provisional visual decisions.

**Output:** A deterministic, editable visual direction with current composition, section order, real eligible resources, and truthful structural placeholders. Pre-preset tendencies must not be labelled an approved Design DNA revision.

**Stability and visibility:** It is always visibly labelled **Provisional**. A revision may be replaced by a newer candidate, but the last stable view remains visible while the update prepares. Its reasons and unresolved decisions are reviewable outside raw runtime terminology.

**Transition and limitations:** It moves to Approved only through explicit server-authoritative approval of the underlying revisions. It never contains fabricated copy or facts, never represents final package fidelity, and never becomes approved merely because the merchant views or edits it.

The threshold for the first Provisional preview and whether non-approved resource candidates can ever appear with unmistakable treatment remain open. Until resolved, real merchant content in Preview uses approved resources; earlier work remains structural.

## 11. Approved Preview

**Ownership:** The Preview Engine projects the exact current approved direction; each owning system remains authority for its approved revision.

**Inputs:** Approved recommendation and preset revisions, approved Design DNA, current approved Resource Set/snapshot, approved content plans, current runtime-capability versions, and explicit omissions.

**Output:** A stable review representation of what Calinium intends to generate. It shows approved composition, hierarchy, resources, visible content, and responsive direction.

**Stability and visibility:** It is labelled **Approved preview** and identifies freshness. Irrelevant background changes do not alter it. A consequential dependency change marks the affected preview stale rather than silently refreshing approval.

**Transition and limitations:** It can become Generated only after explicit paid generation produces and validates the corresponding output. A merchant correction creates a new Provisional child revision while the prior Approved preview remains reproducible. Approved does not mean packaged, uploaded, installed, or published.

## 12. Generated Preview

**Ownership:** The generation pipeline owns the output; the Preview Engine only presents a trusted representation.

**Inputs:** The exact paid-order-pinned approved revisions, target theme/version, generator version, generated package, safe manifest, and validation result.

**Output:** The actual generated theme rendered from the package, or a trusted rendered copy proven to correspond to that exact package. A Markdown summary, static conceptual mockup, unrelated unpublished theme, or locally approximated candidate cannot be labelled Generated.

**Stability and visibility:** It is labelled **Generated theme**, includes merchant-safe generation/version identity, and remains immutable for that generation. New project changes appear separately as Provisional, never blended into the Generated view.

**Transition and limitations:** Generated follows successful required validation. It does not mean the theme is installed, live, or published. Current production code can deliver a validated ZIP but does not yet provide a generated-package live renderer or upload it to a preview theme; the exact generated-preview mechanism remains open.

## 13. Preview Inputs

Preview inputs are references to canonical, versioned states—not copied mutable payloads supplied by the browser:

- authenticated project and canonical shop scope;
- current conversation/intake revision;
- current recommendation candidate or approved revision;
- approved preset and catalog version where applicable;
- Design DNA candidate or approved revision;
- Recommended Resource Set and immutable snapshot revision;
- approved content/Approved Block Plan revisions;
- runtime capability, mapping, compatibility, and target-theme versions;
- selected page/device/view preferences;
- for Generated, exact paid order and generated artifact identity.

The engine records which input versions produced each preview revision. Missing optional inputs create omission or safe structure; missing required inputs prevent the affected rich representation.

## 14. Merchant Conversation Inputs

Conversation supplies submitted merchant intent and refinement requests only after they are normalized by the owning behavioral/recommendation layer.

Free-form text never mutates a preview directly. A statement such as “make it darker” first becomes a bounded candidate decision with scope, conflicts, validation, and revision provenance. Conversation selection context may identify the affected hero or section, but it does not grant authority to edit runtime fields.

Unsent drafts, typing, silence, suggested replies, “I don't know,” and “You decide” do not create preview decisions unless their owning contract accepts them.

## 15. Merchant Intake Inputs

Automatic Merchant Intake may supply project-scoped business, industry, audience, catalog, personality, design-language, website-observation, confidence, conflict, and questions-remaining candidates.

Only normalized current outputs influence Preview. Shopify observations remain authoritative for connected-store resource facts; merchant intent remains authoritative for subjective direction; website observations remain optional and supplemental.

An intake candidate can shape structure or a provisional visual tendency but cannot introduce a merchant claim, approve a resource, or appear as factual preview copy. Failed optional website analysis does not block Preview.

## 16. Recommendation Engine Inputs

The Recommendation Engine supplies the eligible coherent storefront direction: preset candidate, homepage recipe, page blueprints, sections, ordering, global direction, local presentation, omissions, fallbacks, and alternatives.

Preview renders that result; it does not rerank or repair it. An ineligible section, invalid adjacency, missing required resource, or unsupported runtime value cannot be made visually plausible in Preview.

Preview may render one primary recommendation and a temporary eligible alternative. It preserves recommendation identity, confidence behavior, reasons, and revision status without exposing raw scores.

## 17. Recommended Resource Set Inputs

The Resource Set supplies exact eligible resource-role assignments, alternatives, safe fallbacks, omissions, approval status, availability, accessibility treatment, responsive suitability, performance suitability, and staleness.

Preview does not choose a different logo, hero, product, collection, menu, image, or video because it looks better. If a resource becomes stale, the last approved view is marked stale while the Resource Set prepares or awaits a replacement candidate.

Preview Theme ownership remains unresolved between the Resource Set and preview/preset lifecycle. This document does not settle it.

## 18. Design DNA Inputs

Design DNA supplies bounded typography, spacing, layout, grid, hierarchy, color, media treatment, motion, shape, density, rhythm, commerce/editorial balance, responsive, accessibility, and performance decisions inside the selected preset.

Preview expresses these dimensions through verified conceptual states and available runtime capabilities. It cannot normalize DNA, cross preset boundaries, invent unsupported styling, or present a provisional tendency as approved DNA.

When one DNA dimension changes, the Preview Engine uses declared dependencies to update affected visual regions rather than rebuild unrelated content and state.

## 19. Runtime Capability Inputs

Current runtime capability catalogs, layout recipes, page blueprints, section manifests, compatibility rules, setting mappings, block policies, and live Shopify schemas define what Preview may claim is representable.

Beta targets Calinium One 1.0 and its installed capabilities. Preview must not imply that an arbitrary setting, section, block, page, animation, crop mode, or interaction exists. Unsupported conceptual states use canonical fallback or omission.

Current generation validates section types, setting IDs and values, block types/order/limits, templates, and metadata leakage. Preview fidelity claims must be no broader than that validated runtime boundary.

## 20. Preview Revision Model

A preview revision is a derived, project-scoped representation referencing exact canonical input revisions.

```text
canonical candidate inputs
→ preview revision
→ optional successor preview revision
```

It records semantic dependencies, state, page/device coverage, freshness, and render outcome. It does not duplicate full resource snapshots or become approval authority.

Meaningful canonical change creates a new preview revision. A device switch, zoom adjustment, panel collapse, scroll position, retry with identical output, or irrelevant key ordering does not. Approved and Generated revisions are immutable; Provisional revisions may be superseded but remain traceable where needed for comparison or recovery.

## 21. Preview Provenance

Internal provenance should trace visible regions to source categories such as merchant intent, Shopify data, recommendation revision, preset, Design DNA, Resource Set, Approved Block Plan, runtime capability, omission, or fallback.

Merchant-facing provenance is concise: “From your approved Featured collection” or “Provisional spacing direction.” Advanced may expose more source context without exposing raw IDs, checksums, runtime field names, complete snapshots, chain-of-thought, or internal paths.

For Generated, provenance ties the view to the exact paid order, generation, target theme/version, generator version, and safe artifact manifest. Provenance never replaces approval or truth.

## 22. Preview Staleness

A preview becomes stale when a consequential dependency changes or no longer validates, including resource deletion/revision drift, recommendation or DNA revision, content approval change, preset/version change, capability change, or generated artifact mismatch.

Staleness behavior is scoped:

1. mark the affected view or region as stale in merchant language;
2. retain the last stable representation;
3. prevent stale content from appearing current or Approved;
4. recalculate only affected dependencies;
5. request review when approval is consequential;
6. preserve historical Approved and Generated revisions.

Staleness never silently swaps to mutable “latest” state and never creates a new approval.

## 23. Preview Rendering Strategy

The product recognizes four bounded strategies:

| Strategy | Fidelity | Speed/complexity | Security and dependency | Determinism, maintenance, and cost |
| --- | --- | --- | --- | --- |
| **Local React Renderer** | Directional; parity must be maintained separately | Fast partial updates; substantial component work | Can remain isolated from Shopify; must protect server data | Deterministic with canonical props, but risks drift from Liquid/runtime and duplicate maintenance |
| **Generated JSON Preview** | Higher configuration parity; still needs a shell that interprets theme sections | Moderate; can reuse generator semantics but should not run full package generation per edit | Low Shopify dependency; must sandbox resource loading | Deterministic when tied to versions, but shell/runtime parity and mapping cost remain |
| **Generated Shopify Preview** | Potentially highest actual-theme fidelity | Slowest and operationally complex | Depends on safe unpublished-theme workflow and may require writes not allowed in Beta | Costly, stale-prone, and currently unavailable through the read-only production path |
| **Hybrid Renderer** | Structural/local speed early and higher fidelity later | Most lifecycle coordination; can stage complexity | Must make boundaries and state labels unmistakable | Can reduce early latency and late fidelity risk, but requires parity tests between layers |

The product direction may be staged: local structural representation for early Provisional work, a higher-fidelity approved representation, and actual generated output for Generated. This is not an implementation choice. The exact Beta renderer, approved-preview fidelity boundary, and whether generated output uses local or Shopify rendering remain open.

Current evidence rules out claiming that the existing static cards, Markdown report, internal preview package, or optional pre-existing-theme URL already satisfy this contract.

## 24. Structural Preview

Structural Preview communicates layout anatomy before rich approved content exists. It may show Header, Hero, Featured Collection, Craftsmanship, Newsletter, and Footer as section-shaped skeletons or neutral role labels.

Placeholders describe function, not merchant content. “Featured collection location” is acceptable; a made-up collection title, founder story, testimonial, product, image, price, or CTA is not.

Structural order must already come from an eligible recommendation or safe bounded candidate. It cannot show invalid adjacency or sections that necessarily require missing evidence as if they are ready.

## 25. Content-Aware Preview

As approved content becomes available, Preview replaces neutral structure with exact approved titles, excerpts, labels, destinations, and Approved Block Plan material.

Content status remains visible through the review experience. Approved text is preserved exactly. Provisional merchant-authored edits may appear only as explicitly Provisional candidate content; sensitive facts remain individually confirmed under their owning contract.

Missing content leads to omission, lower density, or structural treatment. Preview never drafts copy merely to complete a composition.

## 26. Resource-Aware Preview

Resource-aware Preview uses only current, role-eligible resources supplied by the Recommended Resource Set and content/resource snapshots:

- Shopify-authoritative product and collection media;
- approved Shopify Files and menus;
- approved project images and supported video;
- approved products, collections, articles, and other currently supported bindings.

The preview respects exact identity, source revision, responsive alternative, accessibility status, performance suitability, duplication policy, and approved fallback. It never imports a public website image, uses an arbitrary URL, guesses a destination, or silently substitutes a stale resource.

## 27. Design-Aware Preview

Design-aware Preview makes the current DNA visible through hierarchy, typography direction, spacing, width, grid, color relationships, media emphasis, surface treatment, motion restraint, density, commerce balance, editorial rhythm, and responsive adaptation.

The representation must stay inside preset boundaries and verified capability. It can approximate a conceptual direction only when the state is labelled Provisional and the approximation does not imply unsupported runtime parity.

Accessibility and performance are constraints on the design, not optional display toggles or lower-weight aesthetic preferences.

## 28. Section Rendering

Each rendered section has an internal semantic identity, preview revision, recommendation source, dependency set, resource/content status, approval state, stale state, and runtime-capability reference.

Merchant-facing selection identifies the section by purpose—Hero, Featured collection, Craftsmanship—not runtime section type, instance ID, block ID, setting ID, or schema field. Selecting it may seed a conversational request or open its owning decision.

Section rendering honors canonical minimum content, empty behavior, block order, limits, adjacency, omissions, accessibility, responsive behavior, and performance. Empty demo blocks are prohibited.

## 29. Page Rendering

The Preview Engine recognizes page roles already relevant to generated themes: Homepage, Product, Collection, Search, Cart, 404, and supported Content/Page roles.

Homepage is the primary live-preview surface. Other pages may be represented as structural, content-aware, or Generated views only when their canonical blueprint/runtime behavior and data are supported. The engine does not invent a page blueprint—current Recommendation architecture notes that Search lacks a registered page blueprint even though runtime behavior may exist.

Page navigation preserves the same preview revision and state. A page not available in the current state is explained as unavailable, not rendered through fabricated structure.

## 30. Header Preview

Header Preview reflects approved logo or text identity, approved navigation, current Design DNA, verified header settings, and responsive behavior.

It does not fabricate a menu or convert provisional labels into destinations. When navigation is incomplete, use safe approved destinations, a truthful minimal structure, or a visible Provisional gap.

Sticky, drawer, localization, search, and account behavior are shown only when the current runtime supports them. Preview controls never obscure header accessibility or become confused with storefront controls.

## 31. Footer Preview

Footer Preview reflects approved menus, brand identity, supported newsletter/contact/policy presence, Design DNA, and current runtime structure.

It does not draft policy text, legal claims, contact details, social destinations, trust marks, or newsletter promises. Missing optional groups collapse cleanly; required navigation remains governed by approved destinations.

Footer Preview should demonstrate long labels, responsive stacking, and the page transition without pretending form submissions are active.

## 32. Hero Preview

Hero Preview may show approved hero media, current presentation direction, approved destination, and approved text. Product or collection identity may be shown when Shopify-authoritative and semantically approved for that role.

If no approved headline exists, Preview uses no headline, a neutral structural label outside the merchant content, or an authoritative product/collection identity where allowed. It never invents luxury, urgency, quality, origin, campaign, or founder copy.

Hero height, content width, alignment, crop, motion, focal treatment, and mobile behavior must stay within current DNA and runtime capability. Missing hero media uses the Resource Set fallback or a non-media/product-led hero.

## 33. Product Preview

Product Preview uses current Shopify-authoritative product title, media, price, variants, and availability only where the source and preview policy safely support them.

It never invents a discount, compare-at price, rating, review, badge, scarcity, urgency, feature, material, result, or recommendation relationship. Approved badges or evidence remain governed separately.

Purchase controls are visually representative in Provisional and Approved states and cannot affect a live cart. Generated behavior may be interactive only in an explicitly isolated trusted environment.

## 34. Collection Preview

Collection Preview uses real approved Shopify collection identity and current product membership. It shows supported banner, grid, sorting/filter anatomy, and product cards according to page state and runtime capability.

If no collection exists, recommendation must adapt to a product-first composition or omit the dependent section; Preview does not create a fictional collection.

Catalog pagination or bounded sampling prevents large inventories from overloading Preview while preserving truthful order and identity.

## 35. Editorial Preview

Editorial Preview uses only approved factual content, destinations, media, evidence, and Approved Block Plan placements.

Unsupported founder, craft, manufacturing, sustainability, timeline, team, award, certification, testimonial, or other evidence content is omitted. Structural labels may explain a potential role outside the storefront composition, but cannot simulate persuasive content.

Approved block order and stable semantic identity are preserved. Preview does not rewrite or summarize Shopify articles, collections, pages, or merchant copy.

## 36. Commerce Preview

Commerce Preview may represent approved product cards, collection links, curated relationships, Shop the Look associations, bundle showcase presentation, and complementary fallback only within their distinct source-authority contracts.

It never infers relationships, replaces Shopify recommendation authority, turns a showcase into a transactional bundle, fabricates API results, or claims recommendation/personalization behavior.

Commerce interaction in Provisional and Approved Preview is side-effect-free. Price, inventory, variant, and availability treatment remains source-aware and clearly bounded by preview freshness.

## 37. Navigation Preview

Preview navigation stays inside an isolated preview context. Links are disabled by default in Provisional and Approved states, or may switch among supported preview pages without leaving Calinium when that safe behavior is explicitly provided.

Disabled links remain understandable and keyboard-safe. They do not appear broken or submit real requests. External destinations never open accidentally from section interaction.

Generated Preview may use actual theme links only inside an explicitly controlled rendered result, with clear escape back to Calinium and no implication that the destination is live.

## 38. Mobile Preview

Mobile Preview is required for Beta and represents a mobile storefront viewport, not a desktop page scaled into a small frame.

It reflects responsive hierarchy, source order, navigation, crop, card density, touch targets, text wrapping, sticky behavior, motion reduction, and approved mobile-specific resources where available. It must not invent mobile coordinates, focal points, images, or content.

In the merchant interface, Mobile Preview appears in a full-width Preview tab or equivalent focused surface. Device chrome is decorative; the preview has an accessible name and reachable controls.

## 39. Tablet Preview

Tablet Preview evaluates the intermediate responsive composition, orientation change, navigation density, grids, media crops, and interaction spacing.

It is optional for Beta unless the selected renderer and current runtime can support it faithfully and performantly. If unavailable, Desktop and Mobile remain the declared tested preview contexts; Calinium must not imply tablet validation.

Tablet selection and orientation are view preferences, not canonical design revisions unless they reveal and lead to an accepted design change.

## 40. Desktop Preview

Desktop Preview is required for Beta and is the dominant visual area in the three-area interaction model.

It shows the full hierarchy, widths, section pacing, media scale, grids, header/footer, and page composition at a representative bounded viewport. It is not proof of every desktop resolution.

Preview resizing must not write arbitrary layout values. It may test the current responsive result across approved device presets or a bounded fit mode.

## 41. Device Controls

Controls may include Fit, Desktop, Mobile, optional Tablet, bounded zoom steps, Reset, refresh, page selection, and Preview focus mode.

Every control has a visible label or accessible name, keyboard operation, and pressed/selected state. `Escape` leaves Preview focus mode and returns focus to the control that opened it. Closing any modal Preview drawer or dialog likewise restores its trigger predictably. Browser zoom remains supported; preview zoom is not a substitute for 200%/400% browser reflow testing.

Device selection, zoom, page, and focus mode persist as user view preferences. They do not create recommendation, DNA, resource, content, approval, or payment revisions.

## 42. Interaction Boundaries

Provisional and Approved Preview are primarily visual review surfaces. Safe interaction may include scrolling, device switching, page switching, selecting a region for conversation, inspecting provenance/status, and controlled visual-state demonstrations.

Preview never exposes Theme Editor controls, raw settings, drag-to-create unsupported layouts, editable Liquid/CSS, or arbitrary DOM editing. Selecting a visual element only identifies an owning canonical decision.

Viewing, clicking, scrolling, hovering, choosing a device, or continuing the conversation is never approval.

## 43. Preview Links

Links in Provisional and Approved Preview are disabled by default. If internal preview navigation is enabled, it is explicit, sandboxed to supported preview pages, and does not navigate the containing dashboard.

External links, Shopify Admin links, checkout, account, policy, and other consequential destinations require deliberate controls outside incidental preview clicking.

A disabled link remains identifiable by text and does not trap keyboard focus. Generated Preview link behavior depends on the unresolved trusted-render environment and must be labelled accordingly.

## 44. Preview Forms

Newsletter, contact, search, account, localization, product, cart, and other forms do not submit to live merchant systems from Provisional or Approved Preview.

The interface states **Preview only—submission disabled** where the disabled behavior could otherwise confuse. Visual error/success states may be demonstrated only through bounded test states, not real requests or fabricated merchant/customer data.

Generated Preview may exercise actual form behavior only in a separately approved isolated environment. The current read-only architecture does not establish that capability.

## 45. Preview Cart Behaviour

Provisional and Approved Preview never mutates the live Shopify cart, checkout, order, or inventory.

Beta may show cart anatomy or a local ephemeral simulation when it is useful and unmistakably labelled. A simulated cart cannot claim live availability, tax, shipping, discount, payment, or checkout behavior.

An isolated cart session for Generated Preview remains conditional on renderer architecture and verified Shopify boundaries. It is not assumed by this contract and is not required for Beta.

## 46. Preview Search Behaviour

Search may be represented as header affordance, search page anatomy, empty/query/result visual state, or Generated runtime behavior when safely supported.

Provisional and Approved Preview must not query live customer data, save search history, or fabricate results. Any demonstration uses bounded current product data and states clearly that it is a preview.

Because the current page-blueprint registry does not define a Search blueprint, Beta must not claim recommendation-driven live Search-page editing until that executable gap is resolved through its owning architecture.

## 47. Preview Media Behaviour

Preview media uses responsive sources where available, bounded decoded dimensions, lazy loading below the visible area, stable aspect-ratio space, and approved fallback/omission.

Video begins with an approved poster or neutral supported state. It has no autoplay audio, no unnecessary autoplay, appropriate controls/captions/transcript where required, and a reduced-motion-safe alternative.

Missing or failed media does not reveal a broken private URL. The section uses its approved fallback, remains structural, or is omitted. Video absence never blocks Preview when a safe image or non-media composition exists.

## 48. Preview Motion Behaviour

Motion reflects Design DNA only through supported runtime-capable behavior. It remains subtle, functional, and subordinate to merchant review.

During rapid revisions, entrance motion does not replay repeatedly. Updating uses a restrained crossfade or region transition only when it preserves spatial understanding. The last stable preview is not blanked while new work loads.

`prefers-reduced-motion` removes or shortens transitions and suppresses unnecessary autoplay. Preview controls must permit evaluation without forcing motion.

## 49. Loading Behaviour

Loading is local to the affected region wherever possible. The conversation and Decisions remain usable while Preview prepares.

Use skeletons for structure, retained last-stable content for updates, and concise status for blocked or slow dependencies. Avoid full-screen loaders unless authentication or project state genuinely prevents all work.

Loading communicates real server state. No fake percentage, countdown, typing animation, or optimistic “Ready” status appears before authoritative completion.

## 50. Streaming Updates

Preview update events conceptually include:

```text
intake_updated
recommendation_updated
resource_set_updated
design_dna_updated
preview_revision_created
preview_section_updated
preview_ready
preview_stale
preview_failed
```

Events are authenticated, project-scoped, revision-scoped, ordered, idempotent, and bounded. Duplicate events are ignored; older revisions cannot replace newer state; a sequence gap triggers authoritative refresh. Reconnection resumes from a cursor where supported or fetches current server state first.

The interaction contract prefers resumable server events unless architecture evidence favors another transport, but this product contract does not choose SSE, WebSockets, polling, or an API design. There is no fake progress while disconnected.

## 51. Partial Updates

Dependency-scoped partial updates are mandatory.

| Merchant change | Required preview effect | Unaffected examples |
| --- | --- | --- |
| Shorter hero | Hero height/layout and dependent page rhythm | Product identity, footer, unrelated content |
| More products | Relevant product/grid sections and dependent performance checks | Industry, approved copy, unrelated evidence |
| Different approved hero image | Hero resource, crop, mobile treatment, LCP-related presentation | Preset identity and unrelated resources |
| More minimal | Affected DNA density, spacing, motion, surfaces, and dependent sections | Merchant facts and content history |
| Typography correction | Typography hierarchy and text-dependent layout | Product/resource identity and unrelated approvals |

The engine maintains a declared dependency graph from canonical decisions to pages, sections, regions, and presentation dimensions. It cancels or supersedes stale render work and reuses unaffected stable output. Full rebuild is reserved for material changes whose dependency boundary genuinely spans the preview.

## 52. Conversational Refinement

The canonical refinement flow is:

```text
Merchant request
→ intent normalization
→ affected canonical decision(s)
→ eligibility and compatibility validation
→ candidate revision
→ dependency-scoped preview revision
→ short consequence explanation
```

The Preview Engine receives the validated candidate; it never interprets free-form text into direct DOM or style mutation. Ambiguous consequential requests receive one focused clarification. Unsupported requests produce a boundary and nearest safe alternative.

Unrelated approvals and identities remain intact. A change to approved direction is Provisional until the owning approval is renewed.

## 53. Undo and Redo

Undo and redo restore canonical candidate state and then render that state. They do not merely repaint the browser.

Preview-only view preferences such as device, zoom, page, and scroll may have local restoration separate from canonical revisions. Recommendation, DNA, content, and resource changes follow their own candidate/revision lineage and approval dependencies.

Undo never rewrites an immutable approved revision, paid-order snapshot, generation, charge, or Generated preview. The exact scope—single refinement, whole current candidate, or broader project history—remains open.

## 54. Preview Comparison

Useful comparison modes may include Current/Previous, Before/After, Recommended/Alternative, and Desktop/Mobile.

Comparison must identify both revisions/states, use the same truthful input classes, and avoid implying that an unapproved alternative is approved. It should focus on meaningful visual consequences rather than raw setting differences.

Comparison is optional for Beta. If implemented, it must be accessible without a purely visual slider and must not double-load unbounded media or autoplay motion.

## 55. Alternative Recommendation Preview

An eligible alternative may be explored without approving it. The preview is labelled, for example, **Exploring Maison**, and references the alternative recommendation candidate.

Opening, closing, or comparing an alternative creates no preset approval, resource replacement, content approval, payment, or duplicate canonical revision. Returning to the primary direction restores its state and view preferences.

Only genuinely eligible alternatives may be previewed. Alternative Preview is optional for Beta and remains subject to the unresolved renderer and comparison decisions.

## 56. Preview Approval

Preview is not the approval authority. **Use this direction** references the exact underlying recommendation, preset, Design DNA, resource, and content revisions and routes the merchant through their existing server-authoritative owning workflow or workflows. It cannot combine approvals that an owning contract requires to remain separate; sensitive content, ambiguous resources, preset approval under the current unresolved policy, payment, and generation consent retain their own boundaries.

Each applicable approval request identifies what is included, what remains omitted or separately confirmed, and which preview revision represented it. The owning server authority revalidates scope, currency, eligibility, and dependencies.

Viewing or approving design direction never approves sensitive content, payment, generation, upload, installation, publication, or future updates. A stale preview cannot be approved.

## 57. Preview Failure Behaviour

Preview failure does not destroy or roll back the project. Conversation, canonical decisions, approvals, and the last stable Preview remain available.

Merchant-facing behavior is calm and specific:

> I couldn't refresh the preview just now. Your design decisions are saved, and you can retry without losing anything.

Failures distinguish unavailable input, stale dependency, renderer failure, media failure, authorization/scope rejection, and generated-artifact mismatch. They expose no stack trace, raw schema error, token, internal path, or another project's existence.

Generation is blocked only when a canonical required validation is invalid—not merely because the optional early renderer is temporarily unavailable.

## 58. Preview Recovery Behaviour

Recovery begins by loading authoritative project, input-revision, preview, approval, and generation state. It distinguishes completed, in-progress, stale, failed, and superseded work.

The engine can retry the same render, refresh an affected source through its owner, restore the last stable revision, choose an eligible alternative, or fall back to a structural text representation.

Retry is idempotent and does not duplicate canonical candidates, approvals, orders, charges, generations, or artifacts. Recovery never silently substitutes a resource or promotes a Provisional view.

## 59. Preview Resume Behaviour

After refresh, browser close, sign-in return, or device change, Resume restores:

- current authoritative preview state and revision;
- last stable rendered revision and any stale qualifier;
- selected page and device;
- safe zoom/focus/panel preferences;
- conversation position and current review action through their owning experience;
- temporary alternative only when deliberately persisted and still eligible;
- approval and generation status.

Server state loads before local preferences. Stale local state requires comparison and cannot overwrite current project state. The merchant never repeats accepted answers merely because Preview restarted.

## 60. Performance Boundaries

Preview must never make Conversation feel slow.

- The shell and composer load before heavy preview resources.
- Rendering, image decoding, validation, and background analysis remain asynchronous to typing.
- Meaningful submitted intent—not every keystroke—triggers canonical recalculation.
- Stale work is canceled or superseded where safe.
- Partial updates reuse unchanged regions.
- Images use responsive sizing and bounded decode dimensions.
- Hidden views avoid continuous expensive work.
- Large catalogs are sampled, paginated, or virtualized without changing semantic order.
- Stream events and revision history are coalesced and bounded.
- Mobile memory and concurrent preview revisions remain bounded.

Concrete latency, memory, image, and interaction budgets require prototype measurement. This contract makes no untested performance claim.

## 61. Accessibility

The Live Preview experience targets WCAG 2.2 AA.

- Preview is a labelled landmark/region with state, page, device, and freshness available as text.
- State, approval, stale, omission, and failure never rely on color alone.
- Device, page, zoom, refresh, region, comparison, and focus controls are keyboard-operable with visible focus.
- Streaming and partial updates never steal focus, force scroll, or replace the focused element unexpectedly.
- A restrained polite live region announces meaningful milestones such as first preview ready, stale, recovered, or Generated—not every fragment.
- Device chrome is decorative to assistive technology; the preview surface has a meaningful accessible name.
- Visual-only changes have a text summary or decision description.
- Reduced motion, long translations, RTL, screen readers, touch targets, browser zoom, and 200%/400% reflow remain usable.
- Any iframe has an accessible title and does not create an unexplained focus trap.

Preview validation does not constitute a complete legal accessibility audit. Accessibility remains an eligibility gate for what Calinium recommends and presents.

## 62. Responsive Behaviour

Responsive behavior applies both to the represented storefront and to the merchant-facing Preview surface.

On a wide desktop, Preview remains the dominant center area beside Conversation and Decisions. On tablet/two-area layouts, Preview pairs with Conversation while Decisions becomes an accessible drawer. On mobile/one-area layouts, Preview is a full-width tab or focused surface alongside Chat and Review; three columns are never compressed together.

State, page, device, scroll, and revision context survive tab changes, resize, and orientation change. The on-screen keyboard must not make the preview controls or conversation composer unreachable.

Within the storefront representation, responsive behavior is an adaptive Design DNA/runtime decision—not merely scaling. Source order, crop, grid, navigation, hierarchy, text, commerce controls, and approved mobile resources remain truthful.

## 63. Security and Isolation

Every preview read, event, resource, and generated artifact is authenticated, authorized, project-scoped, canonical-shop-scoped, and revision-scoped. Browser-provided IDs are locators, not authority.

Preview never exposes access tokens, session tokens, client secrets, encryption keys, cookies, private Admin API data, customer data, raw approvals, complete resource snapshots, internal API credentials, filesystem paths, stack traces, or cross-project metadata.

If an iframe or rendered document is used, it should conceptually isolate origin/navigation, scripts, forms, downloads, popups, storage, and top-level navigation using the minimum permissions necessary. The exact sandbox policy belongs to later technical architecture.

No Preview action writes to Shopify during Beta. The current optional Shopify preview path is read-only and can only surface an existing approved unpublished/development target when Shopify provides a safe URL; it does not apply Calinium's generated package.

## 64. Truthfulness Rules

Preview never improves visual polish by inventing:

- products, collections, relationships, destinations, or menus;
- testimonials, reviews, ratings, customers, or results;
- founder stories, people, locations, campaigns, or quotations;
- handmade, artisan, material, origin, sustainability, quality, performance, or efficacy claims;
- certifications, awards, press, integrations, screenshots, or technical features;
- prices, discounts, scarcity, guarantees, or urgency;
- captions, summaries, excerpts, alt text, or statistics absent from approved content.

Missing truth produces omission, neutral structural treatment, or one necessary merchant request. Website observation, image interpretation, filenames, preset identity, industry, or model fluency never become evidence.

Preview preserves exact approved meaning and source. A polished visual treatment cannot silently expand that meaning.

## 65. Analytics

Conceptual events include:

```text
preview_started
first_preview_visible
preview_revision_created
preview_updated
preview_stale
preview_failed
preview_recovered
preview_device_changed
preview_page_changed
preview_alternative_opened
preview_comparison_opened
preview_approved
```

Events may record pseudonymous project scope, preview state, page/device category, revision relationship, update category, duration, failure/recovery category, and renderer/version where governance permits.

Analytics never contains merchant message contents, preview text/content, resource payloads, private URLs, Shopify customer data, tokens, full identifiers/snapshots, sensitive claims/evidence, or screenshots. Analytics cannot change recommendations or approvals.

`preview_approved` records that Preview transitioned after the required underlying authoritative approvals completed. It never means that viewing Preview or a Preview-owned action created approval by itself.

## 66. Beta Preview Scope

Required Beta capability:

- Homepage live preview;
- Desktop and Mobile views;
- Thinking status plus clearly distinct Provisional, Approved, and Generated artifacts;
- current Recommended Resource Set inputs;
- bounded Design DNA presentation;
- truthful structural and approved-resource rendering;
- dependency-scoped partial updates;
- conversational refinement through canonical decisions;
- preview revisions and staleness;
- retry, recovery, and resume;
- trusted generated-theme result or representation tied to the exact output;
- accessibility, security, performance, and no-write boundaries.

Optional when safely supported: Product and Collection pages, Tablet view, alternative comparison, bounded visual cart/search states, and richer page switching.

Not required or authorized: full Theme Editor replacement, live Liquid editing, arbitrary HTML/CSS, real cart/checkout mutation, live form submission, automatic upload/install/publish, arbitrary code execution, multi-user realtime collaboration, or support beyond Calinium One 1.0 and current validated capabilities.

The exact renderer is a Beta architecture decision, not silently settled by this scope.

## 67. Anti-Patterns

The Live Preview Engine rejects:

- a screenshot-only mockup presented as a real storefront;
- calling Thinking an artifact, Provisional approved, or Approved generated;
- using static dashboard cards or a Markdown report as claimed storefront fidelity;
- regenerating the complete theme after every message or keystroke;
- unrestricted model-generated HTML, CSS, JavaScript, Liquid, or Shopify JSON;
- fabricated merchant copy, products, claims, evidence, prices, imagery, or relationships for polish;
- live-store, cart, inventory, menu, product, collection, theme, form, checkout, upload, or publish mutation;
- silently showing stale output as current;
- preview-only edits that do not exist in canonical state;
- silent resource replacement or use of mutable latest data;
- irrelevant alternative previews or duplicate approvals caused by exploration;
- focus-stealing streaming, autoplay-heavy media, fake progress, or blocking Conversation;
- runtime IDs, raw schemas, internal paths, secrets, or chain-of-thought in merchant UI;
- claiming Shopify preview fidelity when only an unrelated existing unpublished theme is available.

## 68. Open Product Decisions

The following require founder judgment, prototype testing, architecture evidence, merchant research, accessibility/security review, or measured performance evidence:

### Renderer and fidelity

1. What exact Beta renderer architecture is used?
2. Is early Preview a Local React Renderer, Generated JSON Preview, another bounded local shell, or a hybrid?
3. What representation makes Approved Preview sufficiently faithful without being called Generated?
4. Does Generated Preview use a local render of the package, a Shopify preview URL, or another trusted exact-package renderer?
5. What parity tests and divergence thresholds are required between local/approved representation and generated Liquid runtime?
6. May the current read-only model ever support an actual Shopify generated-package preview without a separately approved write capability?

### Timing, readiness, and inputs

7. Does Preview begin after the first meaningful answer or after the first eligible recommendation?
8. What exact evidence, content, Resource Set, and DNA readiness threshold permits the first Provisional preview?
9. May a current but not yet approved recommended resource appear as real content in Provisional Preview, and with what unmistakable consent/status treatment?
10. Does `Preview theme` remain a Recommended Resource Set slot or become a preset/preview decision?
11. How is the lifecycle persisted between pre-preset visual constraints, candidate preset, preset-contained candidate DNA, Approved DNA, and Preview revision?
12. May website-derived visual observations affect Preview before merchant acceptance?
13. May website screenshots or resources be retained or shown, under what consent, privacy, rights, and provenance rules?

### Pages, devices, and interaction

14. When do Product and Collection pages enter Beta live Preview?
15. Is Tablet Preview required for Beta?
16. Do device controls appear before design approval?
17. Are Preview links clickable, and in which states?
18. Is a simulated cart useful enough for Beta to justify its complexity and risk?
19. Is Search represented only after a canonical page-blueprint gap is resolved?
20. Does alternative preset Preview exist in Beta?
21. Is comparison included in Beta, and which comparison mode has priority?

### Revision, explanation, and presentation

22. Is preview revision identity merchant-visible, and at what level of detail?
23. How much reasoning appears beside a preview update?
24. Is undo/redo scoped to one refinement, the whole current candidate, or project history?
25. What dependency/materiality threshold triggers full rather than partial rerendering?
26. Does refreshing a stale resource automatically prepare a new candidate or wait for explicit reranking?
27. How are market, locale, B2B, and regional-catalog variations represented in one preview/revision?

### Experience, transport, and measurement

28. What exact desktop panel proportions and Preview minimum width pass embedded-app, localization, and zoom testing?
29. Does Decisions default open or collapsed when the first Preview appears?
30. Is panel sizing fixed or accessibly resizable?
31. Which authenticated resumable streaming transport best fits the existing server architecture?
32. What measured rendering latency, memory, image, responsive, and fidelity thresholds become Beta gates?
33. How much explanation accompanies an accessibility-driven visual constraint?

Related unresolved Quick Start preset/DNA approval, confidence visibility, subscription presentation, and future cross-project preference learning remain governed by their owning contracts and are not resolved here.

## 69. Implementation Readiness

This contract is ready to govern the next Component and State Contract. It establishes the Preview lifecycle, artifact/status distinction, ownership, canonical inputs, revision/provenance/staleness model, rendering options, page/section behavior, side-effect-free interactions, partial updates, conversational refinement, accessibility, security, truth, performance, and bounded Beta scope.

Before implementation, the next architecture phase must map these product states to component ownership, server-authoritative state, route and panel behavior, revision events, renderer isolation, dependency invalidation, artifact fidelity, and recovery. It must explicitly close or preserve the renderer, first-preview threshold, Generated rendering, streaming, and undo/redo decisions rather than hiding them in client code.

The current runtime offers valuable foundations—durable project state, exact approval transport, deterministic configuration generation, validated read-only packages, artifact authorization, and optional read-only metadata for existing unpublished themes—but it does not yet implement this Live Preview Engine. The legacy Preview screen's **Approve** button only advances the interface stage; it is not a server-authoritative preview or underlying-revision approval. Implementation must not mislabel that action or the existing artifacts, and it must not weaken the no-write boundary.

**Readiness: Ready for Component and State Contract**
