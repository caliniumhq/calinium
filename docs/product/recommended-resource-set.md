# Recommended Resource Set

## 1. Purpose

The Recommended Resource Set is the canonical product contract for how Calinium selects, ranks, explains, reviews, approves, refreshes, and safely omits the real merchant resources used to prepare a storefront direction.

Its purpose is to replace a long sequence of ordinary approvals—logo, hero, navigation, collection, product, theme, media—with one coherent recommendation:

> Calinium selected the strongest resources for your theme. Review anything you want to change.

The set reduces effort without hiding consequential choices or weakening truth. Ordinary, current, unambiguous recommendations can be reviewed and approved together. Sensitive evidence, ambiguous identity, consequential destinations, stale resources, and unresolved required choices remain separate.

The Recommended Resource Set sits between Automatic Merchant Intake and later design review:

```text
Merchant
→ Automatic Merchant Intake
→ Recommended Resource Set
→ approved inputs ready for design and preview
```

This is a product contract. It does not define interface code, ranking implementation, schemas, APIs, generation logic, or Shopify mutations.

## 2. Governing Documents

This contract is governed by:

- [Calinium Customer Journey](customer-journey.md)
- [Calinium AI Creative Director Interaction Design](ai-creative-director-interaction-design.md)
- [Calinium AI Behaviour](ai-behaviour.md)
- [Automatic Merchant Intake](automatic-merchant-intake.md)

Those documents remain authoritative. This contract may make resource behavior more precise, but it may not contradict their project scope, source authority, confidence, sensitive-content, approval, revision, payment, generation, or no-publish rules.

Shopify remains authoritative for connected Shopify resource identity and current store state. The merchant remains authoritative for intended role, brand meaning, sensitive truth, and approval. Public website observations may influence suitability but do not become selectable resources unless the content has a separate approved project or Shopify resource identity.

Store Resources and Content Plan remain authoritative internal systems. The Recommended Resource Set simplifies their merchant-facing review; it does not delete or bypass them.

## 3. Philosophy

Merchants should not have to approve every ordinary resource one at a time. Calinium should arrive with a coherent, defensible selection, make the selection easy to inspect, and ask the merchant only where identity, meaning, truth, or intent cannot be decided safely.

The permanent philosophy is:

1. **Recommend a complete set, not isolated winners.** Resources must work together across hierarchy, pages, responsive behavior, accessibility, and performance.
2. **Gate before ranking.** An unsafe, unavailable, unapproved, cross-project, or incompatible resource cannot win by scoring well.
3. **Explain the role, not the algorithm.** The merchant sees why a resource fits and what can replace it.
4. **Treat confidence as scoped.** Confidence belongs to one resource-role assignment, not the merchant or the whole brand.
5. **Prefer approved reality over visual inference.** Media appearance cannot prove meaning, ownership, product association, or evidence.
6. **Make absence easy.** A missing logo, hero, video, collection, or broad catalog should simplify the design, not punish the merchant.
7. **Keep bulk approval ordinary.** Sensitive claims and evidence never hide inside a one-click approval.
8. **Never swap silently.** Refresh or staleness creates a new recommendation for review, not an invisible replacement.
9. **Stay deterministic.** The same authoritative inputs and policy produce the same recommendation and order.
10. **Preserve merchant control.** One click approves a known current set; it does not authorize generation, payment, upload, update, or publication.

## 4. Product Goals

The Recommended Resource Set must:

- reduce ordinary resource review to one primary approval action in the target Quick Start journey;
- keep ordinary individual approvals between zero and three in the target beta scenario;
- recommend only eligible current project-scoped resources;
- cover every resource role required by the current approved strategy and preset;
- provide reason, source, confidence behavior, alternatives, fallback, approval requirement, and visibility for every slot;
- rank resources coherently rather than independently;
- account for accessibility, responsive suitability, performance, duplication, availability, and provenance;
- support safe omissions for optional roles;
- identify genuine blockers without turning optional absence into failure;
- keep sensitive evidence and factual claims individually confirmed;
- preserve deterministic ordering and tie-breaking;
- survive refresh, retry, resume, correction, and mode switching;
- create a current approved resource input for later Content Plan, preview, final review, and generation workflows.

Success is measured by merchant acceptance, low correction burden, truthful omissions, deterministic selection, and reduced time to a meaningful preview—not by filling every slot.

## 5. Scope and Boundaries

The set may recommend current eligible resources for roles including:

- logo;
- hero media;
- hero destination;
- homepage supporting media;
- featured collection;
- featured product;
- primary navigation;
- eligible preview theme;
- optional video;
- brand imagery;
- approved craftsmanship media;
- lifestyle media;
- trust or evidence media when separately verified.

The set owns role assignment, ranking, alternatives, fallback, omission, review grouping, and approval status for those assignments.

It does not own:

- Shopify resource creation or mutation;
- product, collection, menu, page, or theme editing;
- public-website copying;
- factual claim creation;
- evidence verification outside existing governance;
- product-relationship inference;
- generated copy, captions, alt text, or destinations;
- preset selection or page-composition ownership;
- theme generation, billing, upload, installation, update, or publication.

A resource assignment is not content approval beyond its defined role. Approving an image for a hero does not approve a caption, craft claim, product relationship, or geographic context.

## 6. Canonical Set Model

A Recommended Resource Set is one coherent candidate for one current project context. Conceptually it contains:

- project and canonical shop scope;
- source-intake revision;
- current strategy and preset context;
- applicable market and locale context where known;
- required, optional, omitted, unresolved, and unsupported slots;
- ranked eligible candidates per slot;
- one recommended assignment or safe fallback per slot;
- assignment confidence and reason;
- source and provenance status;
- accessibility, responsive, and performance suitability;
- set-level readiness;
- individual-review exclusions;
- warnings, conflicts, and omissions;
- current candidate or approved revision status.

The set contains semantic merchant resources and assignments, not runtime section settings, Shopify template JSON, generated block IDs, package paths, or theme output.

The set is complete when every applicable role is one of:

```text
Recommended
Approved
Explicitly omitted
Safely defaulted
Needs individual review
Blocked by a genuine requirement
```

Completeness does not require every possible slot to contain a resource.

## 7. Resource Recommendation Contract

Every resource-role recommendation must provide the following product information:

| Field | Meaning |
| --- | --- |
| **Confidence** | High, Medium, Low, or Unknown for this exact role assignment |
| **Reason** | Short explanation grounded in current intent and source evidence |
| **Alternatives** | Ranked compatible approved choices that materially differ |
| **Fallback** | Safe behavior if the recommendation is unavailable or declined |
| **Approval** | Set-level eligible, individual review required, already approved, omitted, or blocked |
| **Visibility** | How prominently the merchant must see the choice or issue |
| **Safety** | Truth, provenance, rights, scope, relationship, and sensitive-content constraints |
| **Ranking** | Relative position among eligible candidates for this role |
| **Source** | Shopify, approved project asset, approved content/evidence relationship, or other governed source |
| **Refresh** | How current source state is re-evaluated without silent replacement |
| **Retry** | How a failed evaluation can be attempted again without duplicate approval or mutation |

Additional required context includes current availability, resource revision, role compatibility, duplication status, accessibility readiness, responsive suitability, performance suitability, and omission safety.

No merchant-facing recommendation depends on a hidden unsupported source. If Calinium cannot explain why a resource is eligible and suitable, it cannot recommend it.

## 8. Recommendation Lifecycle

The lifecycle is:

```text
Observed source
→ eligible candidate
→ ranked candidate
→ recommended assignment
→ merchant review
→ approved assignment or omission
→ current approved set
→ stale or superseded when dependencies change
```

**Observed** means Calinium can see the resource in an authorized source. It does not mean the resource is eligible or approved.

**Eligible** means the resource passes source, scope, availability, role, safety, and compatibility gates.

**Ranked** means eligible candidates have a deterministic order for a specific role.

**Recommended** means Calinium proposes the highest coherent candidate or safe fallback. It is not approval.

**Approved** means the merchant explicitly accepts the current assignment under the applicable set-level or individual review.

**Stale** means a source revision or dependent decision changed. A stale assignment remains historical and cannot silently become current.

**Superseded** means a new approved set replaces it for future work. Existing paid orders retain their pinned set and resources.

## 9. Source Authority

Eligible source categories are ordered by what they can authoritatively establish, not by visual appeal.

### Shopify resources

Shopify is authoritative for current product, collection, menu, page, article, file, theme, market, and related resource identity within granted access. Shopify identity does not by itself establish intended design role, claim truth, product relationship, or media meaning.

### Approved project assets

Project assets may supply approved image or video resources when their project scope, revision, availability, category, rights status where governed, and intended role are current.

### Approved evidence relationships

Evidence media is eligible only when the factual content and resource relationship are separately approved. Media cannot create its own evidence.

### Merchant conversation

Conversation establishes preference and may establish merchant statements. It does not create a valid Shopify or project resource binding from a title, filename, URL, or description.

### Public website

Website analysis can inform aesthetic suitability or identify a resource the merchant may later import and approve. A website image, logo, video, menu, or destination is not directly eligible merely because it is public or appears to belong to the merchant.

### Prohibited sources

Calinium does not recommend arbitrary remote assets, stock imagery presented as merchant media, generated placeholders presented as merchant resources, cross-project resources, mutable local paths, inferred destinations, or visually guessed product associations.

## 10. Eligibility Gate

Ranking begins only after a resource passes every applicable hard gate:

1. **Project/shop scope:** It belongs to the current authorized project and canonical shop context.
2. **Source identity:** Its exact authoritative resource identity is known.
3. **Current revision:** The evaluated revision is current for the recommendation.
4. **Availability:** It exists and is eligible for use at evaluation time.
5. **Role compatibility:** Its type and semantic role match the slot.
6. **Approval eligibility:** It can lawfully and truthfully be offered for merchant review.
7. **Truth safety:** The assignment does not imply an unsupported fact, claim, association, or destination.
8. **Rights and provenance:** Required ownership or usage status is known under current governance.
9. **Accessibility viability:** Required accessible treatment exists or can be supplied truthfully by the merchant.
10. **Responsive viability:** The resource can serve the intended role or has an approved responsive alternative.
11. **Performance viability:** The resource can be used without an unacceptable unmitigated delivery cost.
12. **Strategy compatibility:** The current approved or candidate strategy actually needs and permits the role.

Failure at a hard gate excludes the candidate; it does not merely lower its score. Calinium identifies the affected gate in merchant language when the exclusion matters.

## 11. Confidence Model

Confidence follows the governing High, Medium, Low, and Unknown behavior.

### High

The resource has current authoritative identity, strong semantic fit, no material conflict, suitable presentation characteristics, and a clear reason for this role.

Behavior:

- recommend automatically;
- include in ordinary set-level approval when no individual-review rule applies;
- keep alternatives and fallback available;
- never treat confidence as evidence for a sensitive claim.

### Medium

The resource is eligible and plausible, but there is a meaningful tradeoff, incomplete role evidence, weaker presentation suitability, or more than one credible candidate.

Behavior:

- recommend with a concise uncertainty reason;
- make the tradeoff visible in set review;
- allow set-level approval only when the choice is ordinary, current, unambiguous enough to understand, and not sensitive;
- offer useful alternatives.

### Low

The resource is eligible only conditionally, has weak role evidence, significant tradeoff, or unresolved ambiguity.

Behavior:

- do not include it as a silently accepted ordinary assignment;
- require individual choice if the role is genuinely required;
- otherwise use a safe fallback or omission.

### Unknown

Suitability or source truth cannot be established.

Behavior:

- do not recommend the resource;
- ask only when the role is genuinely required;
- otherwise omit or use a safe structural fallback.

Confirmed and Approved remain separate from confidence. Whether confidence appears to merchants as bands, reasons, or an overall indicator remains open. A displayed percentage such as “94%” must not be introduced without a separately validated aggregation model.

## 12. Ranking Model

Eligible candidates are ranked for one specific role using this precedence:

1. Explicit current merchant role selection.
2. Exact semantic-role match from an approved source.
3. Alignment with current approved intent, strategy, and preset.
4. Source authority and revision currency.
5. Accessibility viability.
6. Responsive suitability.
7. Performance suitability.
8. Visual and content suitability for the role.
9. Availability across applicable market and locale context.
10. Non-duplication and coherence with the rest of the set.
11. Stable deterministic tie-break.

No lower-ranked aesthetic advantage can override an earlier safety, authority, or explicit merchant choice.

Ranking is relational. The strongest hero image may be a weaker supporting image if reusing it creates repetition. The best collection in isolation may be wrong if it conflicts with the merchant's priority product line. The best desktop crop may lose to a slightly weaker image with a truthful mobile treatment when no separate mobile source exists.

Ranking does not use private sales performance, guessed popularity, inferred conversion, filename attractiveness, upload recency, or random variation unless a future governed source explicitly authorizes the relevant factor.

## 13. Deterministic Tie-Breakers

When candidates remain equally suitable after substantive ranking, tie-breakers apply in this order:

1. Current explicit merchant priority.
2. Current approved role assignment from an earlier non-stale set.
3. Approved source-plan or merchant-curated order.
4. Better set-wide non-duplication.
5. Better fallback coverage across responsive contexts.
6. Stable authoritative source order when that order has merchant meaning.
7. Stable opaque resource identity only as the final deterministic mechanism.

Calinium never breaks a tie by alphabetizing merchant display names, comparing filenames, preferring the newest upload without meaning, inferring quality from price, or choosing randomly.

A final opaque-identity tie-break is not presented as creative rationale. The merchant-facing reason states that both options were equally suitable and preserves alternatives.

## 14. Set Readiness

Set readiness is not a simple average of resource confidence.

The canonical readiness states are:

- **Ready to review:** Every applicable required slot has a current eligible recommendation or governed fallback; ordinary optional omissions are safe.
- **Review one or more items:** The set is coherent, but ambiguous, Medium/Low, consequential, or individually governed choices need attention.
- **Needs a resource:** A genuinely required role has no eligible resource or fallback.
- **Needs truth confirmation:** A dependent sensitive claim or evidence relationship is unresolved.
- **Stale:** One or more approved assignments no longer match current source revisions or current strategy.
- **Approved and current:** All applicable assignments, omissions, and individual exclusions are approved for the current revision.

The set can be ready with no logo, hero image, video, collection, or broad catalog when compatible fallback and strategy exist. It cannot be ready by hiding a required invalid destination or sensitive evidence gap.

An overall numeric confidence is not canonical. If one is considered later, it must never mask a Low, Unknown, stale, or individually required slot.

## 15. Merchant Review

Review presents the set as one creative recommendation, not a sequence of technical resource forms.

The merchant should understand:

- what Calinium selected;
- which role each resource serves;
- why it was selected;
- where it came from;
- whether it is current and available;
- what alternatives exist;
- what happens if it is declined or unavailable;
- whether omission is safe;
- whether the item is included in set-level approval or needs individual review.

The primary message is:

> Calinium selected the strongest resources for your theme. Review anything you want to change.

The review leads with the coherent set and exceptions, not raw inventories. Approved ordinary items may appear compactly. Unresolved required items, ambiguous identity, sensitive evidence, and stale assignments receive prominence.

The merchant can approve the eligible set, review detail, change one item, omit an optional role, return to resource selection, or open Advanced. They never need to understand internal IDs, resource schemas, theme setting names, or ranking weights.

## 16. Set-Level Approval

One explicit action may approve all current ordinary assignments that are:

- eligible;
- current;
- project-scoped;
- High or acceptable Medium confidence under this contract;
- unambiguous in role and identity;
- non-sensitive;
- included visibly in the approval summary;
- backed by an identified fallback or omission policy.

Before approval, Calinium identifies:

- assignments included;
- optional omissions included;
- assignments excluded for individual review;
- unresolved blockers;
- current set revision.

Set-level approval does not approve:

- sensitive claims or evidence;
- ambiguous logo or brand identity;
- consequential destination changes requiring individual intent;
- stale or unavailable resources;
- cross-project resources;
- product associations;
- preset approval unless separately governed;
- content copy;
- payment or theme generation;
- upload, installation, update, or publication.

Sensitive claims and evidence remain individually confirmed and always outside ordinary bulk approval.

Approval applies to exact current resource-role assignments. A later refresh or merchant change creates a new candidate and never rewrites the approved set.

## 17. Individual Approval

Individual review is required when:

- brand identity is ambiguous;
- a destination changes merchant meaning;
- a resource has Low confidence but is genuinely required;
- a video needs rights or accessibility confirmation;
- a resource is tied to a sensitive claim or evidence;
- an image is proposed for an explicit product association;
- a market or locale variation materially changes the assignment;
- a current merchant choice conflicts with the recommendation;
- source revision or availability changed after prior approval;
- omission would materially alter an approved objective.

Individual approval states the exact resource, role, source, reason, fallback, and relevant consequence. It never asks the merchant to approve an entire hidden category.

The target Quick Start scenario should require zero to three individual ordinary resource decisions. Sensitive confirmations are measured separately and cannot be hidden to satisfy that target.

## 18. Logo Ranking

Logo eligibility requires an approved Shopify brand asset, eligible Shopify File, or approved project asset with a credible logo role. A general image that visually resembles a mark is not automatically a logo.

Ranking favors:

1. Explicit current merchant logo assignment.
2. Authoritative approved brand-logo identity.
3. Suitability for required light and dark contexts where applicable.
4. Legibility at small responsive sizes.
5. Sufficient technical quality without excessive delivery cost.
6. Available transparent or compatible background treatment.
7. Coherence with the recommended header and brand direction.

Calinium does not redesign, recolor, crop into, trace, or reconstruct a logo through recommendation. It does not select a favicon, product stamp, certification mark, or partner logo as the merchant logo without explicit identity.

Safe fallback is a text-based store identity where supported. No logo is not a blocker when that fallback is truthful. Ambiguous logo identity requires individual review.

## 19. Hero Media Ranking

Hero media ranking favors hierarchy, truth, and cross-device viability over visual drama alone.

Eligible sources are approved project images or video and approved Shopify media suitable for the role. Ranking considers:

- explicit hero assignment;
- alignment with priority product or brand objective;
- visual clarity and meaningful focal subject;
- safe space for approved text where required;
- desktop and mobile crop tolerance;
- available approved mobile alternative;
- technical quality and performance suitability;
- non-duplication elsewhere in the first view;
- accessibility treatment;
- absence of unsupported implied claims or product associations.

Calinium never infers a campaign, location, model, season, product identity, craft process, or merchant claim from hero imagery.

Fallback order is: another eligible hero candidate, approved product or collection media, a simpler product-led hero, a non-media composition, then omission where allowed. No hero media is not inherently a blocker.

## 20. Hero Destination Ranking

Hero destination is ranked independently from hero media. A visually relevant image does not create a destination.

Eligible destinations are current approved Shopify products, collections, articles, pages where supported by existing contracts, or explicitly approved external destinations. Exact resource type and binding must be known.

Ranking favors:

- explicit merchant primary objective;
- direct semantic relationship to approved hero content;
- current availability and page eligibility;
- consistency with homepage strategy;
- destination clarity;
- avoidance of duplicate primary calls to action.

Calinium never derives a handle, URL, page, collection, or product from visible text, title similarity, or image interpretation. When no destination is clearly approved, the fallback is no link or another supported composition—not a guessed URL.

Because destination meaning is consequential, a change may require individual review even when the media is set-level eligible.

## 21. Homepage Media Ranking

Homepage media includes supporting imagery for approved section roles beyond the hero.

Ranking considers the set as a sequence:

- role and section ownership;
- narrative progression;
- approved source and meaning;
- crop and aspect-ratio fit;
- visual diversity without incoherence;
- avoidance of repeated imagery;
- text legibility and accessible order;
- mobile and desktop suitability;
- performance cost across the full page;
- whether omission creates a cleaner composition.

Calinium does not fill every media slot. Repetition, weak fit, or missing truth can make omission the strongest recommendation.

Media associated with editorial, evidence, or commerce blocks must satisfy that block's truth model. A product image does not become lifestyle media automatically; a workshop image does not become craftsmanship evidence; an image containing several products does not become Shop the Look.

## 22. Collection Ranking

Eligible collections are current approved Shopify collections.

Ranking favors:

- explicit merchant priority;
- alignment with the primary storefront objective;
- representative catalog coverage;
- current availability and membership;
- coherent collection identity and approved destination;
- useful media where the composition benefits from it;
- navigation prominence when it reflects current merchant intent;
- fit with product-led or collection-led homepage strategy.

Calinium does not infer bestseller, profitability, popularity, seasonality, or strategic priority from position, price, product count, automation, or imagery alone.

No collections is a valid state. Fallback is a featured product, product grid, simpler commerce path, or omission. Duplicate or highly overlapping collections are surfaced as a clarity concern rather than reorganized silently.

## 23. Product Ranking

Eligible products are current approved Shopify products with exact identity and availability state.

Ranking favors:

- explicit merchant priority;
- alignment with primary objective and featured collection;
- representative value for the catalog;
- current availability under applicable policy;
- adequate approved media;
- suitability for the intended role and page context;
- non-duplication across the recommendation set;
- manageable variant and purchasing presentation;
- current merchant-curated relationship where the role requires one.

Calinium never infers popularity, “hero product” status, quality, margin, conversion, customer preference, complementary relationship, bundle relationship, or visual association from price, order, image, title, or category alone.

No eligible featured product is not inherently a blocker. Fallback is collection-led discovery, another explicit merchant priority, a neutral product grid where supported, or omission.

## 24. Navigation Ranking

Eligible navigation resources are current approved Shopify menus and destinations.

Ranking favors:

- explicit merchant menu selection;
- complete valid destinations;
- clear hierarchy and labels;
- fit with catalog and homepage strategy;
- shallow understandable discovery where appropriate;
- required product, collection, informational, and policy access;
- current market and locale compatibility;
- avoidance of duplicate or dead-end destinations.

Calinium may recommend an existing coherent menu automatically. It may not create an approved destination from a provisional label. **Shop**, **Our story**, and **Help** remain candidate labels until their exact destinations exist.

Fallback uses safe current navigation or a minimal set of current approved destinations. Calinium never edits the live Shopify menu through recommendation. A materially different primary-navigation assignment requires individual review.

## 25. Video Ranking

Eligible video must be a current approved project or supported Shopify media resource with known role and applicable usage status.

Ranking considers:

- explicit merchant preference;
- relevance to the approved section role;
- approved poster or fallback image;
- captions or transcript where required;
- audio dependence;
- duration and narrative fit;
- mobile behavior;
- reduced-motion expectations;
- delivery cost;
- whether the video adds information rather than decoration;
- no unsupported factual implication.

Calinium does not infer a video caption, transcript, location, person, product, process, or claim. It does not recommend autoplay, background use, or sound behavior merely because a file is available.

Fallback is an approved image or omission. Missing video never blocks a theme when an image or non-media composition is safe. Individual review is required when accessibility, rights, or role meaning is unresolved.

## 26. Preview Theme Ranking

An eligible preview theme is a current Shopify theme resource allowed under the existing preview policy. Theme ranking is about review compatibility, not live modification.

Ranking considers:

- explicit merchant preview preference;
- eligibility and current identity;
- compatibility with the recommendation and target review experience;
- safety of read-only use;
- absence of source mutation;
- whether the theme provides a meaningful comparison rather than inherited visual noise.

The merchant's current live theme is evidence of current expression, not automatic future direction. Calinium does not choose a theme merely because it is newest, published, or similarly named.

Fallback is the supported Calinium review foundation. Missing optional preview theme does not block recommendation, approval, or generation readiness. Selecting a preview theme does not authorize installation, update, or publication.

## 27. Brand Image Ranking

Brand images support identity and atmosphere outside a specific product, collection, or evidence role.

Eligibility requires approved source identity and a truthful intended brand-media role. Ranking considers:

- explicit merchant role assignment;
- consistency with approved brand direction;
- visual distinctiveness from product and collection media;
- crop and responsive viability;
- accessibility treatment;
- performance suitability;
- non-duplication;
- known usage status where governed.

Calinium never infers who appears, where the image was taken, what event it depicts, which campaign it belongs to, or what product is present. An aesthetic fit does not establish brand ownership or merchant meaning.

Fallback is approved product/collection media when semantically appropriate, a simpler design treatment, or omission.

## 28. Craftsmanship Media Ranking

Craftsmanship media is governed by evidence, not appearance.

Eligibility requires:

- an approved craftsmanship fact or step;
- an approved evidence relationship where required;
- current approved media explicitly associated with that content;
- accessible description appropriate to what is known;
- no cross-over into Manufacturing Process unless the approved semantic role actually represents ordered production stages.

Ranking considers exact evidence fit, merchant-approved order, visual clarity, media suitability, responsive behavior, and performance.

A workshop, hands, tools, materials, or production scene cannot prove handmade status, artisan identity, specialist skill, tradition, location, duration, quality, sustainability, or origin. Media never creates the claim it illustrates.

When evidence is absent, fallback is omission of the media or unsupported craft content. Craftsmanship media and evidence never enter ordinary bulk approval as proof.

## 29. Lifestyle Media Ranking

Lifestyle media presents products or brand context in use or atmosphere, but its meaning must remain bounded by approved truth.

Ranking considers:

- approved lifestyle role;
- relevance to brand direction;
- clear, non-deceptive composition;
- responsive crop and focal viability;
- diversity from studio product media;
- accessibility treatment;
- performance suitability;
- explicit product association when the section requires one.

Calinium never identifies products, people, models, locations, events, seasons, customer segments, or use cases from visual interpretation. It never generates marker coordinates or product relationships from an image.

Fallback is approved product media, brand media with the correct role, a non-media layout, or omission.

## 30. Trust Media Ranking

Trust media includes approved evidence assets whose purpose is to support a verified claim, certification, award, press reference, rights statement, or other governed proof.

Eligibility requires:

- exact approved claim or assertion;
- exact approved evidence reference;
- verified relationship between claim and resource;
- applicable availability and usage status;
- no implication beyond the approved scope.

Ranking favors direct evidence, current validity, clear source, legibility, accessibility, and appropriate restraint.

Logos, badges, seals, certificates, publication marks, reviews, and screenshots are never treated as trust media from visual appearance alone. Calinium does not infer endorsement, certification, award status, validity date, or usage rights.

When proof is missing or stale, fallback is omission of the claim and trust media. Trust media always remains outside ordinary bulk approval.

## 31. Fallback Hierarchy

Fallbacks apply in this order:

1. Another current eligible approved resource for the same semantic role.
2. An approved compatible resource type explicitly allowed for that role, such as image instead of optional video.
3. A structural design adjustment that removes dependence on the resource.
4. Omission of the optional role or section.
5. One focused merchant request when the resource is genuinely required.

A fallback must preserve truth, source authority, accessibility, responsive behavior, performance, and section ownership. It cannot make the storefront appear complete by using unrelated media or generic content.

Prohibited fallbacks include arbitrary stock media, generated merchant assets presented as real, guessed links, demo products, starter captions, copied website content, inferred claims, or cross-project resources.

Calinium explains fallback only when it materially affects the proposed storefront or requires merchant action.

## 32. Missing Resource Behaviour

Missing resources are expected and non-punitive:

```text
No logo
→ text identity

No hero media
→ product-led or non-media hero

No homepage imagery
→ typography, products, hierarchy, or safe omission

Only one product
→ focused product experience

No collections
→ product-led discovery

Incomplete navigation
→ safe current destinations and one genuine gap if required

No video
→ approved image or omission
```

The set records the selected fallback or omission so later preview and review do not interpret absence differently.

A missing optional resource cannot block the set. A missing required resource blocks only the dependent approved composition, and Calinium should first determine whether a simpler compatible composition removes the requirement.

Merchants are never encouraged to invent claims, upload weak filler, or create unnecessary resources merely to obtain a “complete” set.

## 33. Duplicate and Conflict Behaviour

The set avoids unnecessary duplication across roles while respecting legitimate repeated identity.

Duplicate handling considers:

- exact resource identity;
- same destination used repeatedly;
- same image crop across adjacent sections;
- same product or collection overemphasized;
- repeated video or heavy media cost;
- duplicated semantic purpose.

One resource may serve more than one role only when the reuse is intentional, compatible, and does not weaken hierarchy or performance. Calinium explains consequential reuse.

Conflicts are not averaged. Examples include two logo candidates with equal identity claims, a hero image tied to one product but a different destination, a market-specific menu conflicting with the base menu, or an approved media revision becoming unavailable.

When conflict affects truth or merchant meaning, individual review is required. When it affects only ordinary composition, Calinium recommends the stronger coherent assignment and preserves the alternative.

## 34. Staleness, Refresh, and Replacement

A resource assignment becomes stale when its source revision, availability, scope, applicable market, intended role, strategy dependency, or approval context changes.

Refresh behavior is:

1. Re-evaluate the affected source and eligibility.
2. Preserve the last approved assignment as historical.
3. Identify whether the assignment remains current, changed, unavailable, or conflicting.
4. Re-rank only affected slots and set-wide dependencies.
5. Present any new candidate as a recommendation for review.
6. Preserve unaffected approved assignments.

Calinium never silently replaces a stale resource with “latest,” even when the new candidate ranks first. Automatic re-ranking may prepare a candidate; it cannot create current approval.

If a stale optional resource has a previously approved omission fallback, Calinium may recommend that fallback but still records the change. If a required resource becomes unavailable, the set becomes Needs a resource or proposes a compatible strategy simplification for approval.

## 35. Retry, Recovery, and Resume

Retry attempts the same failed source evaluation or ranking operation with the same current context. It does not duplicate approval, import another resource, or change the set silently.

Recovery distinguishes:

- successfully evaluated slots;
- failed source categories;
- stale assignments;
- candidate recommendations not yet approved;
- approved assignments still current;
- required merchant actions.

Independent successful slots remain valid when another slot fails. A website-derived suitability failure cannot invalidate authoritative Shopify identity. A preview-theme inventory failure cannot block an otherwise ready set.

Resume returns to the current set revision, preserves merchant changes and individual confirmations, and summarizes only meaningful changes. It does not force reapproval of unchanged assignments or ask the merchant to repeat prior resource decisions.

No retry, refresh, recovery, or resume creates a duplicate set revision merely by being attempted. A revision is created only by a meaningful persisted candidate or approval change under existing governance.

## 36. Multi-Market Behaviour

The base set is market-neutral unless current authoritative market context establishes a required variation.

Each assignment may be:

- globally applicable;
- market-specific;
- unavailable in one or more markets;
- unresolved for market variation;
- safely inherited from the base set.

Calinium does not infer market eligibility, translation, product availability, policy applicability, audience, or legal suitability. Current Shopify Markets and approved merchant decisions govern those facts.

When a resource differs materially by market, the recommendation identifies the base assignment and explicit variations. A market-specific resource cannot silently replace the global resource. Missing optional variation inherits only when that inheritance is current and safe; otherwise it uses fallback or omission.

Whether the first release supports one base set or fully market-specific sets remains an open product decision. Multi-market complexity must not make the single-market Quick Start journey harder.

## 37. Localization Behaviour

Resource identity and content language are separate concerns.

Calinium evaluates:

- whether text embedded in media is locale-specific;
- whether approved alt text, captions, transcripts, labels, and destination context exist for the applicable locale;
- whether logo or brand marks vary by locale;
- whether navigation resources are locale-compatible;
- whether market inheritance is safe;
- whether layout remains viable with long translations and right-to-left presentation.

Calinium never translates merchant-visible resource text, claims, captions, or evidence automatically as approved content under this contract. Missing localized content may require a merchant-approved value, a language-neutral alternative, fallback, or omission.

A visually strong image with unapproved embedded language may rank below a more portable alternative.

## 38. Accessibility Suitability

Accessibility suitability is a ranking and eligibility concern, not post-selection decoration.

For applicable resources, Calinium evaluates:

- whether the media is meaningful or legitimately decorative;
- whether approved alt text or an exact merchant-provided description is needed;
- whether video needs captions, transcript, controls, or an image fallback;
- whether embedded text remains readable;
- whether the resource creates a color-contrast or legibility risk in its role;
- whether crop removes essential meaning;
- whether product identity is available outside visual markers;
- whether animation or audio creates an avoidable barrier.

Calinium never invents alt text by inferring unverified people, places, products, events, materials, or claims. If accessible meaning cannot be supplied truthfully, the resource is treated as decorative only when semantically valid; otherwise it requires review, fallback, or omission.

Accessibility suitability can exclude a visually preferred candidate. It is not a lower-weight aesthetic score.

## 39. Responsive Suitability

Responsive suitability asks whether a resource can preserve meaning and hierarchy across the intended contexts.

It considers:

- orientation and aspect ratio;
- focal subject and approved focal information;
- safe crop range;
- embedded text;
- desktop and mobile source availability;
- ability to preserve approved text legibility;
- destination and product association clarity;
- section-specific aspect-ratio requirements;
- zoom and reflow implications where relevant.

An approved dedicated mobile resource outranks an inferred crop when both are otherwise suitable. If no mobile alternative exists, Calinium recommends a truthful crop only when essential content remains. It does not invent mobile coordinates, focal points, or a separate resource.

A candidate that works only in one target context may remain an alternative but cannot be the universal recommendation without an explicit safe variation.

## 40. Performance Suitability

Performance suitability considers the set-wide cost of resources, not only individual file quality.

Relevant factors include:

- intrinsic dimensions relative to role;
- file and delivery cost where known;
- duplication across the page;
- video cost and poster availability;
- number of large above-the-fold resources;
- responsive-source availability;
- layout-stability potential;
- whether a simpler resource or omission preserves the objective;
- hidden-content cost where the current experience would still load it.

Calinium does not claim measured performance scores without measurement. It may prefer a sufficiently clear lighter resource over a marginally stronger heavy resource when the design consequence is small.

Performance never justifies lowering visual truth, substituting an unapproved asset, or discarding required accessibility support.

## 41. Truth, Safety, and Evidence

The Recommended Resource Set never invents or infers:

- founder identity or biography;
- handmade, artisan, heritage, or specialist status;
- material or geographic origin;
- sustainability or environmental benefit;
- certifications or awards;
- testimonials, reviews, publications, or endorsements;
- product performance, efficacy, quality, or customer results;
- revenue, conversion, popularity, or statistics;
- product associations, bundles, complements, or recommendations;
- campaign names, seasons, locations, people, events, or captions;
- destination identity from labels, filenames, or visual similarity;
- usage rights from public availability.

Evidence-bound media cannot enter the set unless the claim, evidence, relationship, source, revision, and scope are current under existing governance.

Set-level approval does not approve facts. A merchant can approve an image as hero media without approving what Calinium thinks the image depicts. Omission remains the required fallback when truth is absent.

## 42. Approval, Revisions, and Handoff

The Recommended Resource Set maintains strict candidate and approval separation:

```text
Recommended set candidate
≠
Current approved set revision
```

Merchant changes create a new candidate. Set-level or individual approval creates a current approved assignment under existing immutable revision conventions. Prior approved sets remain historical and reproducible.

Reapproving one changed slot preserves unchanged current assignments and their identities. A removed assignment remains only in history. A stale assignment cannot be renewed without current review.

The approved set hands exact semantic resources and role assignments into Store Resources and, where content composition is needed, Content Plan. It does not hand runtime settings, generated IDs, Shopify template structure, or unapproved alternatives into generation.

Paid orders later pin the exact approved resource snapshot under the existing production transport. A newer set cannot alter an older paid order.

## 43. Mode Behaviour

### Quick Start

Calinium presents one coherent set, compact reasons, safe omissions, and exceptions. **Approve recommendations** accepts all eligible ordinary assignments in one action. The merchant changes only what they care about. Sensitive and ambiguous items remain separate.

### Guided

Calinium shows more ranking rationale, alternatives, tradeoffs, fallback behavior, and the consequences of changing one resource. The same set and approval boundaries apply.

### Advanced

Calinium exposes detailed candidates, source authority, eligibility outcomes, confidence, ranking factors, revisions, market/locale context, omissions, and independent approvals through existing Store Resources and Content Plan capabilities.

Switching mode never changes ranking, selection, approval, or revision by itself. Quick Start hides detail but preserves every exception and pending decision.

## 44. Analytics and Success Measures

Measure whether the set reduces effort without hiding risk:

- time from Automatic Merchant Intake completion to set readiness;
- number of applicable slots;
- High, Medium, Low, and Unknown assignments by role;
- set-level approval rate;
- number of ordinary individual resource actions;
- slot change and alternative-selection rate;
- safe fallback and omission rate;
- stale-resource and refresh rate;
- retry and recovery success;
- merchant correction rate by slot category;
- time to current approved set;
- preview readiness after set approval;
- abandonment point;
- Advanced detail usage;
- sensitive-item count and outcome without content.

Do not collect resource payloads, image contents, filenames, private URLs, merchant copy, evidence content, customer data, secrets, or cross-project identifiers.

A safe omission is not failure. A merchant replacement is not necessarily poor ranking. Metrics must distinguish ordinary preference changes, ambiguous source identity, stale resources, and safety exclusions.

Beta targets remain under five resource-screen actions, zero to three ordinary individual approvals, one set-level approval for eligible ordinary resources, no optional-resource blockers, and no fabricated merchant facts.

## 45. Open Product Decisions

The following remain unresolved:

1. Should merchant-visible confidence use High/Medium/Low/Unknown, reasons only, or both?
2. Is any overall set confidence useful, and can it be represented without concealing weak or blocked slots?
3. Are Medium-confidence ordinary assignments included in one-click approval by default or called out for deliberate review?
4. What exact rights or usage evidence is required before project assets become set-eligible?
5. When alt text is absent, which resource roles require merchant text, which may be decorative, and which must be omitted?
6. What video accessibility requirements are mandatory for eligibility in the first release?
7. Should Preview theme remain a Recommended Resource Set slot or a separate preset/preview decision?
8. May a merchant import a resource discovered on an optional public website into the approval flow, and what provenance review is required?
9. What deterministic final tie-break is canonical when the authoritative source has no meaningful stable order?
10. Should refresh automatically prepare a changed candidate, or only report staleness until the merchant asks for re-ranking?
11. Is the first release one global set with variations or one independently approved set per Shopify Market?
12. How should locale-specific media and text-bearing images be handled in Quick Start?
13. What measured responsive and performance thresholds determine eligibility rather than preference?
14. Can a current approved navigation menu be included in set-level approval, or does every changed primary navigation require individual confirmation?
15. Which destination changes are consequential enough to require individual approval?
16. Should one resource be allowed to serve several homepage roles by default or only after review?
17. How is set-wide diversity balanced against explicit merchant desire to repeat a signature image or product?
18. What minimum set readiness is required before the first meaningful Provisional preview?
19. How should a merchant clear or replace one approved resource without reopening unrelated assignments?
20. Which trust-media source types can be supported safely in the first release?

These decisions require product evidence, merchant testing, accessibility and performance validation, architecture evidence, rights governance, or founder judgment. They must not be resolved silently through ranking behavior.

## 46. Implementation Readiness

This contract is ready to govern the next intelligence document and the later Live Preview product contract.

Before Live Preview is treated as an approved-input preview, the product must be able to demonstrate:

- role-based eligibility before ranking;
- deterministic ranking and tie-breaking;
- complete recommendation metadata for every slot;
- one coherent set rather than isolated resource winners;
- current project and shop scope;
- safe missing-resource fallbacks;
- explicit sensitive-item exclusion from bulk approval;
- stale-resource detection without silent replacement;
- accessibility, responsive, and performance suitability;
- immutable set approval and exact resource-snapshot handoff;
- no resource metadata or approval leakage into storefront output;
- no automatic Shopify mutation.

The next product-design document may define the broader Recommendation Engine that coordinates business, brand, audience, strategy, preset, and resource recommendations. Live Preview should follow only once its required real-resource inputs and revision semantics are sufficiently established.

This document introduces no implementation, schema, API, ranking code, model-provider behavior, interface component, Shopify scope, generation change, billing behavior, or deployment change.
