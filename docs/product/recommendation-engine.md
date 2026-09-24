# Calinium Recommendation Engine

## 1. Purpose

This document is the canonical product contract for the Calinium Recommendation Engine: the deterministic decision layer that turns approved merchant understanding into one coherent recommended storefront direction.

```text
Approved merchant understanding
+ Shopify-authoritative store context
+ approved strategy and resources
+ preset compatibility
+ Design DNA
+ runtime capability and safety constraints
→ Recommendation Engine
→ one primary storefront recommendation
  + zero to two meaningful alternatives
  + reasons, omissions, fallbacks, and necessary questions
```

The engine should arrive with a point of view. The merchant should experience, “I analyzed your business and recommend Atelier,” not “Choose one of six themes.” Recommendation comes first; review, correction, alternatives, and explicit approval remain available.

This document defines product behavior and ownership. It does not define an implementation, algorithm, schema, prompt, database record, UI component, API, model, weight table, or runtime configuration.

## 2. Governing Product Contracts

The Recommendation Engine must remain consistent with these authoritative product contracts:

- [Calinium Customer Journey](customer-journey.md) governs the merchant journey, modes, paid action, delivery, and prohibition on automatic theme publication or updates.
- [Calinium AI Creative Director Interaction Design](ai-creative-director-interaction-design.md) governs Conversation, Live Preview, Decisions, recommendation review, refinement, accessibility, and recovery.
- [Calinium AI Behaviour](ai-behaviour.md) governs questions, automatic recommendations, confidence, uncertainty, correction, truth, and merchant control.
- [Automatic Merchant Intake](automatic-merchant-intake.md) governs upstream source-aware understanding, normalization candidates, and questions remaining.
- [Recommended Resource Set](recommended-resource-set.md) governs resource eligibility, ranking, alternatives, fallbacks, approval, staleness, and immutable handoff.
- [Calinium Design DNA](design-dna.md) governs bounded visual intent, preset-contained variation, compatibility, provenance, and deterministic design normalization.

The inspected executable foundation constrains Beta behavior. Relevant current paths include `pipeline/create-merchant-profile.js`; `ai/compiler/`; `ai/draft-builder/`; `ai/presets/preset-registry.js`, `ai/presets/recommend-preset.js`, and `ai/presets/apply-approved-preset.js`; `apps/dashboard/server/services/preset-service.cjs`; the actual preset catalog at `config/calinium-storefront-presets.json`; and the named strategy, capability, compatibility, industry, personality, design-language, recipe, blueprint, and section registries.

These executable sources are evidence of present capability, not permission to collapse product ownership. If this contract appears to authorize an unsupported value, unsafe section, unapproved resource, or fabricated fact, the stricter governing contract and runtime capability win.

## 3. Recommendation Engine Definition

The Recommendation Engine is a versioned, deterministic coordinator. It evaluates complete candidate directions against source authority, eligibility, compatibility, sufficiency, safety, and runtime support; ranks only eligible candidates; selects one primary recommendation; and prepares bounded alternatives, explanations, omissions, fallbacks, and focused unresolved questions.

It may recommend:

- one of the six existing presets;
- an existing homepage recipe and page blueprints;
- eligible section composition and deterministic order;
- bounded global design and section-presentation direction;
- a compatible normalized Design DNA direction;
- adoption or revision of the canonical Recommended Resource Set without reranking resources itself;
- safe omissions, fallbacks, and up to two compatible alternatives.

It must not own or invent:

- merchant identity, facts, values, audience truth, claims, evidence, or approvals;
- product descriptions, founder stories, testimonials, reviews, awards, certifications, statistics, pricing, legal information, inventory, or product relationships;
- resource eligibility/ranking, Approved Block Plan content, or immutable snapshot construction;
- preset definitions, Design DNA definitions, page/section/runtime capabilities, or Shopify source data;
- free-form design generation, arbitrary settings, Liquid, CSS, JavaScript, HTML, Shopify JSON, or package files;
- payment, generation, installation, upload, publication, automatic updates, or mutation of Shopify.

## 4. Product Philosophy

1. **Recommend first.** Present one coherent direction before alternatives or configuration.
2. **Eligibility precedes ranking.** An unsafe or unbuildable candidate cannot win regardless of preference fit.
3. **Coherence beats isolated scores.** Preset, recipe, pages, sections, resources, and Design DNA must work together.
4. **Confidence is not truth.** Strong recommendation confidence never creates facts or approval.
5. **The merchant remains authoritative.** Valid explicit choices and corrections are preserved.
6. **Ask only when consequential.** Low uncertainty should not become a wizard.
7. **Omit rather than fabricate.** Missing evidence or content reduces the composition safely.
8. **Alternatives must be meaningful.** Zero alternatives is better than irrelevant choice.
9. **Fallbacks are candidates too.** They must pass every normal eligibility and compatibility gate.
10. **Explain the decision, not the machinery.** Merchant language is concise; internal reasons are structured, not chain-of-thought.
11. **Recalculate narrowly.** A local change should not churn unrelated approved decisions.
12. **Same inputs mean the same recommendation.** Final normalization and ordering are deterministic and versioned.

## 5. Engine Inputs

The engine consumes revision-pinned, source-aware input classes:

| Input class | Required meaning | Owning authority |
| --- | --- | --- |
| Merchant intent | Explicit approved goals, audience intent, desired feeling, priority, constraints, and corrections | Merchant through Creative Director approval lifecycle |
| Shopify store state | Canonical shop, product, collection, catalog, menu, file, theme, market, policy, and availability facts | Shopify and immutable approved snapshots where required |
| Creative understanding | Approved Creative Brief, Store Strategy, and canonical Merchant Profile projections | Existing Creative Director and compiler contracts |
| Industry/personality/language | Current bounded registry identities and their approved normalized selections | Strategy/compiler registries and approved strategy |
| Resources | Approved Recommended Resource Set and immutable resource snapshot, including suitability and staleness | Recommended Resource Set and resource approval systems |
| Presets | Current catalog/version, compatibility, requirements, fixed/flexible/forbidden/fallback boundaries | `config/calinium-storefront-presets.json` and approved preset lifecycle |
| Design DNA | Versioned normalized visual-intent dimensions, confidence, provenance, and constraints | Design DNA contract and future approved revision |
| Composition | Existing recipes, blueprints, section mappings, compatibility, content/evidence requirements | Current configuration and canonical page/section contracts |
| Runtime capabilities | Installed sections, live setting/block types and values, page eligibility, limits, performance and accessibility behavior | Theme capability catalogs and Shopify runtime schemas |
| Safety | Truth, evidence, privacy, accessibility, performance, commerce, authorization, and read-only constraints | Governing contracts and existing security/approval architecture |

No arbitrary caller object, latest mutable project state, or client-submitted approval metadata is an authoritative input.

## 6. Engine Outputs

A complete recommendation output conceptually contains:

- one primary candidate identity and status;
- selected preset ID/version and compatible recipe/blueprints;
- eligible page and section composition with deterministic order;
- global and section-presentation direction constrained to existing capabilities;
- Design DNA reference/summary and Recommended Resource Set reference/readiness;
- zero, one, or two genuinely compatible alternatives;
- concise merchant-facing reasons and structured internal reasons;
- confidence by material decision and a non-misleading overall summary;
- omissions, warnings, unresolved requirements, and safe fallbacks;
- input revision references, engine/version provenance, and staleness state;
- review and approval status.

The output contains no merchant-authored content graph, raw resource snapshot, hidden model reasoning, numeric score, runtime Shopify template, generated package, or approval fabricated by the engine.

## 7. Recommendation Lifecycle

```text
Collect revision-pinned inputs
↓
Validate scope, authority, approval, and version
↓
Normalize bounded inputs
↓
Resolve source conflicts and unknowns
↓
Generate candidate directions
↓
Apply preset and Design DNA boundaries
↓
Apply runtime, page, section, and adjacency capability gates
↓
Apply evidence, content, resource, accessibility, performance, and safety gates
↓
Discard ineligible candidates
↓
Rank coherent eligible candidates deterministically
↓
Select one primary and up to two meaningful alternatives
↓
Create reasons, omissions, fallbacks, confidence, and questions
↓
Merchant review and correction
↓
Explicit approval creates an immutable approved recommendation revision
```

The current executable flow already offers useful foundations: `createMerchantProfile()` validates approved Creative Director inputs; `compileStorefrontStrategy()` resolves strategy decisions and validates safety/adjacency; `buildDraftConfiguration()` maps only approved capabilities and detects blockers; the preset service produces a draft recommendation and immutable approved preset revision. This contract coordinates those responsibilities conceptually without replacing them.

## 8. Source Authority

Safety, truth, accessibility, authorization, platform eligibility, and verified runtime constraints are hard gates before source preference. Among eligible inputs, source conflicts resolve in this order:

```text
1. Merchant-approved explicit facts and preferences
2. Shopify-authoritative store data
3. Merchant-approved resources and immutable snapshots
4. Approved Creative Brief and Store Strategy
5. Approved preset constraints
6. Approved/normalized Design DNA
7. Public website observations
8. Deterministic safe fallback
```

The hierarchy is field-specific. Shopify governs product identity and availability; the merchant governs business meaning, audience, brand intent, and corrections. An approved resource governs its role only after resource eligibility. Preset and Design DNA govern design direction, never facts.

Public website observations remain supplemental even when consistent. They cannot override Shopify identity, approved merchant intent, or resource state; establish a sensitive claim; or become generation content without the applicable approval/evidence contract.

When two authoritative sources conflict and neither clearly owns the disputed meaning, the engine marks the conflict, preserves both provenance records, and asks one targeted question only when the answer is consequential. It does not resolve ambiguity through source count, model confidence, or website recency alone.

## 9. Merchant Intent Inputs

Merchant intent includes approved outcomes rather than technical settings: what the business sells, target customer, desired feeling, primary objective, priority line, constraints, what to avoid, preferred balance of product/story/proof, and later corrections.

The engine may translate “more editorial” into eligible Design DNA and composition candidates; it may not interpret it as permission to create stories. “More premium” may affect restraint and hierarchy; it does not establish quality, price, scarcity, or exclusivity. “Show more products” may change eligible commerce density; it does not create product relationships.

Explicit approved intent wins among eligible creative choices. Provisional, rejected, stale, or unreviewed answers do not silently become approved inputs. Missing optional intent uses a reversible fallback; missing consequential intent produces at most one focused question at a time.

## 10. Shopify Inputs

Shopify is authoritative for current store identity and supported store resources, including products, variants, collections, menus, files, pages/blogs where available, themes/settings, markets, policies, and availability. The engine consumes validated snapshots or server-resolved records according to existing persistence contracts; it never trusts caller-provided handles, GIDs, URLs, or payloads as authority.

Shopify inputs inform catalog maturity, browse structure, real destinations, product/collection presence, media availability, and runtime theme target. They do not answer merchant intent, approve content, establish product relationships, or authorize sensitive claims.

Deleted, unavailable, cross-project, cross-shop, stale, or revision-mismatched Shopify resources make affected candidates ineligible or stale. They are never silently replaced with “latest” state.

## 11. Website Observation Inputs

Optional public-website analysis may contribute observations about typography, hierarchy, spacing, navigation, photography, tone, visual density, color use, motion, accessibility symptoms, product positioning, and homepage structure.

Website observations are:

- contextual leads, not authoritative merchant facts;
- source-attributed and confidence-bounded;
- non-copying influences rather than pixel-level imitation;
- ignored when they conflict with approved intent or current Shopify identity;
- never sufficient evidence for founder, craft, origin, sustainability, certification, award, testimonial, performance, customer-result, pricing, legal, or product claims.

Failure, absence, or skipping of website analysis must not block a safe recommendation. The extent to which website direction may influence Design DNA and whether website facts may become review candidates remain open decisions.

## 12. Industry Inputs

The engine uses only current supported industry IDs from `config/industry-profiles.json`: `luxury_fashion`, `fashion`, `beauty`, `jewelry`, `furniture`, `home`, `food_beverage`, `electronics`, `technology`, `automotive`, `sports`, `pets`, `digital_products`, `hospitality`, `wellness`, `professional_services`, and `general_retail`.

Industry contributes compatible design languages, personality tendencies, recipe preference, spacing/color/image direction, density, trust/urgency posture, product focus, and section suitability. It is a compatibility and ranking signal—not a Shopify setting, merchant fact, preset approval, or permission to use industry stereotypes.

Strong industry fit may raise preference among already eligible candidates. It cannot rescue a preset with missing required content, incompatible recipe, inaccessible behavior, or unsupported runtime capability. Multi-domain merchant treatment remains an open product decision.

## 13. Audience Inputs

Audience inputs describe approved primary customers, needs, motivations, objections, expertise, purchase consideration, and intended customer task. They may influence explanation depth, hierarchy, information density, proof placement, browse versus direct-conversion emphasis, and responsive priority.

Audience inference must remain bounded. Catalog patterns or public language can suggest a candidate audience, but the engine may not infer protected traits, financial capacity, medical state, personal history, or sensitive targeting. It cannot turn a broad audience guess into approved personalization.

When audience uncertainty materially changes the primary direction, ask one natural question. Otherwise use an inclusive, readable, product-clear fallback.

## 14. Brand Personality Inputs

The current personality vocabulary is `luxury`, `confident`, `warm`, `minimal`, `friendly`, `playful`, `bold`, `technical`, `sophisticated`, `traditional`, and `modern`.

An approved personality influences compatible preset fit and downstream Design DNA such as typography direction, spacing, motion, image preference, hierarchy, and composition. It does not map to one standalone setting and cannot establish luxury, heritage, artisan, technical, community, or quality facts.

Conflicting personality signals reduce confidence or create a bounded alternative; they do not trigger random blending. Explicit approved merchant intent governs over website/model observations.

## 15. Design Language Inputs

The current design-language vocabulary is `editorial`, `luxury`, `minimalist`, `modern`, `expressive`, `playful`, `heritage`, `premium`, `bold`, `technical`, `artisan`, and `lifestyle`.

Each language provides current compatibility and tendency data across personalities, typography, spacing, motion, imagery, color, content density, best uses, and avoidances. The engine uses that data to filter and compare coherent candidates; Design DNA owns the normalized visual expression.

Heritage and artisan directions remain aesthetic until separately approved evidence supports history or craft claims. Design-language fit cannot override preset boundaries or fabricate the content needed by an editorial/evidence section.

## 16. Catalog Inputs

Catalog inputs include real product/variant count, collection structure, media completeness, product-type breadth, availability, and browse complexity. They influence Essential viability, commerce density, grid direction, collection/product emphasis, and whether product-led recipes are useful.

A large catalog does not automatically justify a dense design; a small catalog does not imply an incomplete business. One product, no collection, weak menus, or limited imagery should reduce complexity rather than punish the merchant.

Catalog data cannot create “best seller,” “frequently bought together,” comparison, bundle, complementary, regimen, or Shop the Look relationships. Those require their specific Shopify or merchant-approved source authority.

## 17. Resource Inputs

The engine consumes the canonical Recommended Resource Set and matching immutable approved resource snapshot. It uses role readiness, resource identity, availability, alternatives, fallback, rights, accessibility, responsive suitability, performance suitability, confidence, and staleness.

It does not independently rank logos, heroes, products, collections, navigation, videos, brand images, craft media, lifestyle media, or trust media. It may request the Resource Set engine to refresh an affected slot or determine whether a candidate's required roles are ready.

An approved resource is not silently substituted. If it becomes stale or unavailable, the engine uses the resource contract's canonical fallback, recalculates only dependent candidates, or marks the recommendation stale. Resource visual content is never evidence by itself.

## 18. Preset Inputs

The only Beta preset identities are `atelier`, `maison`, `gallery`, `ritual`, `essential`, and `signal` from `config/calinium-storefront-presets.json`, targeting Calinium One 1.0.

For each exact catalog version, the engine consumes status, fit signals, compatible industries/business models/personalities/design languages/recipes, homepage recipe, page blueprints, existing global and section defaults, content requirements, supported adapters, omission priorities, incompatibilities, performance budget, motion policy, and registered fallback.

Preset fixed/flexible/forbidden/fallback DNA remains authoritative. The engine can recommend and compare presets; it cannot edit their definitions, blend them during Beta, turn a conceptual design category into a seventh preset, or treat a preset as merchant content.

## 19. Design DNA Inputs

Design DNA supplies a versioned, normalized description of how the storefront should feel and behave: hierarchy, typography, spacing, layout, grid, color, media, image treatment, motion, shape/surface, page treatments, densities, rhythm, responsive behavior, accessibility, and performance constraints.

The engine decides which eligible storefront candidate best expresses that DNA. It does not recompute or overwrite fixed preset DNA, invent DNA states, or compile the DNA directly into arbitrary runtime values.

When merchant intent changes a DNA dimension, the engine recalculates affected preset compatibility, presentation, density, rhythm, and composition only. Missing content can lower editorial expression but cannot change factual truth.

## 20. Runtime Capability Inputs

The runtime capability gate uses installed section files, `config/theme-section-capabilities.json`, the section manifest, strategy-to-section and strategy-to-setting mappings, live Shopify schemas, page/template eligibility, setting/block types and accepted values, block/section limits, dependencies, accessibility, performance, and Theme Editor lifecycle evidence.

Current mapping support remains explicit:

- spacing and core composition decisions have direct supported relationships;
- design language, typography, color, imagery, motion, conversion, and personality are partial relationships;
- industry is context, not a global theme setting;
- merchant-only or confirmation-required fields cannot be populated as ordinary automatic settings.

A candidate may use only installed, validated capabilities. Runtime presence alone does not prove safe recommendation eligibility; canonical page/section ownership and content/resource requirements must also pass. The engine never creates a setting ID, section type, layout option, block type, template, controller, or theme capability.

## 21. Safety and Truth Inputs

Safety inputs are hard gates covering:

- merchant and Shopify source authority;
- approval state, project/shop scope, immutable revision, checksum, and paid-order boundaries;
- claim/evidence requirements and prohibited inference;
- current resource eligibility and rights;
- accessibility and responsive viability;
- performance budgets and progressive enhancement;
- commerce source distinctions and legal/platform ownership;
- read-only generation and prohibition on automatic installation, upload, publication, or updates.

The engine never invents founder biography, handmade/artisan status, origin, materials, sustainability, certification, awards, testimonials, reviews, statistics, performance, customer results, medical/efficacy claims, prices, discounts, inventory, product relationships, destinations, screenshots, features, integrations, security, or legal information.

Visual treatment, industry, preset, Design DNA, website content, and model confidence are never factual evidence. Missing sensitive truth produces omission or a focused confirmation request through the owning workflow.

## 22. Recommendation Eligibility

Eligibility is binary for a given candidate and input revision. It is evaluated before preference ranking.

A candidate is eligible only when:

- its preset, target theme, recipe, page blueprints, and Design DNA are mutually compatible;
- every required runtime section and setting capability exists with supported values;
- required content, evidence, destinations, and resources are approved, current, and scope-valid;
- page eligibility, section ownership, dependencies, block/section limits, and minimum viable composition pass;
- section order has no forbidden adjacency or duplicate/repetitive purpose;
- accessibility, responsive behavior, performance budget, and commerce boundaries pass;
- it respects explicit approved merchant intent and contains no fabricated content;
- any omission or fallback leaves a coherent, complete, truthful result.

Ineligible candidates are rejected, not down-scored. Reasons remain structured for debugging and safe merchant explanation. A candidate cannot become eligible because its industry fit, priority, aesthetic quality, or raw score is high.

Fallback candidates pass the same gate. In particular, the historical generic sequence `hero-slideshow → editorial-hero` is prohibited by the current compatibility matrix because it places two competing heroes together. The current homepage blueprint's generic `recommended_sections` list contains those entries consecutively, so it must never be treated as an already-valid fallback sequence. Any future use must select or omit compatible sections and revalidate the complete order before ranking or presentation.

## 23. Candidate Generation

Candidate generation builds a bounded set of coherent directions from current registry identities and approved inputs. It is enumeration and composition within known capabilities, not free-form design invention.

A candidate may represent:

- a preset direction;
- a homepage recipe and composition;
- a page-blueprint set;
- a section composition and order;
- a preset-contained Design DNA normalization;
- a global/section presentation direction;
- a resource-readiness/binding direction supplied by the canonical Resource Set.

Every candidate should eventually carry conceptual fields for stable identity, input/version references, eligibility, compatibility, confidence, structured reasons, required resources/content/evidence, warnings, omissions, fallbacks, provenance, and affected decision dependencies. This document does not define their schema.

Candidate generation follows declared registry order and stable identities. It may combine only compatible preset, recipe, blueprint, DNA, and capability values. It must not generate all theoretical combinations, use random sampling, create a seventh preset, or populate absent content to make a direction viable.

## 24. Candidate Filtering

Filtering removes candidates that fail any hard gate before ranking. It occurs in a deterministic sequence so the same failure cannot be alternately treated as a warning or penalty.

Filter categories are:

1. **Authority and revision:** scope, approval, checksum, version, and source lineage.
2. **Preset and DNA:** active preset, target theme, fixed/forbidden boundaries, compatible industry/personality/language/recipe.
3. **Composition:** supported blueprint, installed sections, page eligibility, dependencies, limits, order, adjacency, and minimum viable structure.
4. **Sufficiency:** required evidence, content, destinations, resources, accessibility metadata, and availability.
5. **Runtime:** live setting/block types and values, capability support, Theme Editor and no-JavaScript behavior.
6. **Safety:** truth, privacy, accessibility, performance, commerce, and read-only constraints.

Filtered candidates retain machine-readable rejection categories for tests and safe explanation. They are not shown as alternatives and their scores, if any existed during candidate construction, are irrelevant.

## 25. Compatibility Evaluation

Compatibility evaluation asks whether the candidate's parts can work together, not merely whether each part exists.

| Layer | Required evaluation |
| --- | --- |
| Preset | Exact current version; target theme; compatible industry, business model, personality, language and recipe; content requirements; incompatibilities; motion/performance budget. |
| Design DNA | Fixed preset identity preserved; flexible dimensions in bounds; forbidden combinations absent; fallback coherent. |
| Recipe and blueprint | Existing IDs; correct page role; maximum sections; ideal flow; conversion/storytelling balance; installed and eligible sections. |
| Sections | Semantic usefulness, data authority, required fields/blocks/assets, canonical page eligibility, dependencies, local variants, limits and empty state. |
| Order | No duplicate purpose, forbidden adjacency, conflicting source authority, repetitive density, invalid H1 ownership, or broken customer flow. |
| Resources | Correct role/type, immutable identity, current revision, scope, availability, rights, accessibility/responsive/performance suitability. |
| Runtime | Supported section/block/setting identity and exact accepted value; target Calinium One version; no prohibited leakage. |

The current matrix covers only part of the installed section catalog, and the current evidence manifest is narrower than all installed capabilities. Missing compatibility evidence must be treated conservatively; runtime presence is not an automatic compatibility pass.

## 26. Conflict Evaluation

Conflicts are classified before resolution:

- **source conflict:** two authorities disagree about a field or meaning;
- **goal conflict:** two approved outcomes compete, such as story depth versus immediate catalog access;
- **preset conflict:** merchant direction crosses fixed or forbidden preset DNA;
- **resource conflict:** preferred treatment has no eligible resource or one resource is assigned incompatibly;
- **composition conflict:** sections duplicate purpose, violate adjacency, or exceed page/performance limits;
- **runtime conflict:** desired intent has no validated capability/value;
- **safety conflict:** requested direction would weaken truth, accessibility, privacy, platform, or commerce boundaries.

Resolve through the source hierarchy and hard gates. Compatible goal conflicts should first be reconciled through hierarchy or sequencing. For example, a story-led hero can be followed by clear product discovery. If no safe coherent resolution exists, the engine asks which outcome governs or recommends the closest eligible alternative.

Conflicts are never averaged into synthetic facts, hidden behind a score, or resolved by making one source “more confident.” A rejected decision remains rejected.

## 27. Evidence Sufficiency

Evidence sufficiency is evaluated only for sections, claims, relationships, and presentation that require proof. It distinguishes:

- evidence is not required for the candidate;
- evidence is required and approved/current;
- evidence is optional and available;
- evidence is missing, stale, out of scope, or insufficient for the proposed claim;
- evidence supports only a narrower truthful presentation.

Founder, craft, manufacturing, sustainability, origin, awards/certifications, testimonials/reviews, metrics, technical proof, comparisons, health/efficacy, and trust claims follow their owning contracts. An image, website statement, industry, preset, Design DNA, or model interpretation never substitutes for evidence.

Missing optional evidence results in omission or reduced proof/editorial density. Missing required evidence makes that candidate ineligible. The engine may identify the minimum evidence class needed, but it does not verify or approve evidence itself.

## 28. Content Sufficiency

Content sufficiency asks whether every selected semantic role can be populated truthfully from approved merchant content, Approved Block Plans, or authoritative Shopify data.

A section is content-sufficient when its canonical required fields and minimum valid blocks are present and approved. Optional blank fields may be omitted where the section contract permits. A shell may remain only when the canonical/runtime empty state is explicitly safe and the preset minimum composition permits it.

The engine never fills a gap with generated headings, captions, summaries, excerpts, founder copy, testimonials, generic process steps, trust statements, or demo content. It must distinguish a visually attractive shell from a merchant-ready section.

Missing optional content reduces editorial/information density. Missing required content filters the section or candidate. Content sufficiency is separate from evidence sufficiency: approved text can still lack required proof, and strong evidence can still lack usable merchant-facing content.

## 29. Resource Sufficiency

Resource sufficiency asks whether the candidate has enough approved, current, role-compatible resources to remain coherent across desktop/mobile, accessibility, and performance contexts.

Each required role is evaluated against the canonical Resource Set's readiness and fallback hierarchy. Typical roles include logo, hero media and destination, primary collection/product, navigation, approved editorial/evidence media, preview theme, and optional video. Section-specific resources remain governed by their content-plan contracts.

Strong quantity does not equal sufficiency. Ten unsuitable images cannot support Gallery; one high-quality approved product image may support Essential. A desktop-only resource without a safe crop may be insufficient for an immersive hero but sufficient for contained product presentation.

If a required role is absent, the engine must use the Resource Set's approved fallback, choose an eligible lower-dependency candidate, ask for the minimum necessary resource, or block. It cannot independently choose a replacement or reinterpret another resource's role.

## 30. Preset Recommendation

Preset recommendation considers all six active Beta presets after eligibility. The table defines product behavior; the current catalog remains the executable authority.

### Atelier

- **Strongest fit:** tactile physical goods, craft-led intent, refined/editorial direction, storytelling priority, approved craft/process context, luxury-fashion/jewelry/furniture/home/food compatibility.
- **Acceptable fit:** strong approved product/detail media and an approved premium story direction even when optional craft sections are omitted.
- **Disqualifying conflicts:** unverified handmade/heritage/origin dependency, dense promotional intent, incompatible industry/recipe, or missing required safe hero/product path.
- **Minimum expectation:** coherent approved hero/product or collection resources; craft/founder/testimonial evidence remains optional or recommended exactly as cataloged, never assumed.
- **Fallback:** reduce evidence-led sections and commerce/story complexity; recommend the cataloged Essential path when Atelier cannot remain coherent.
- **Meaningful alternatives:** Maison for more collection-led polish; Essential for lower content dependency, when each is eligible.

### Maison

- **Strongest fit:** luxury fashion, jewelry, accessories, premium beauty/wellness, polished approved imagery, quiet-luxury intent, collection-led discovery.
- **Acceptable fit:** strong product/collection media and restrained hierarchy without founder or craftsmanship content.
- **Disqualifying conflicts:** weak required premium hero/collection support, loud promotional intent, invented campaign/lifestyle dependency, or incompatible recipe/language.
- **Minimum expectation:** approved premium lead media and collection resource under the current catalog contract.
- **Fallback:** omit optional Lookbook/testimonial/founder/craft content and move to restrained product-led presentation or eligible Essential.
- **Meaningful alternatives:** Atelier for verified craft/story emphasis; Gallery for strong image-led discovery; Essential for limited content.

### Gallery

- **Strongest fit:** rugs, furniture, interiors, art, ceramics, photography-led catalogs, strong coherent approved media, visual discovery, Editorial Grid or Lookbook readiness.
- **Acceptable fit:** image-led collection discovery with one strong visual story and moderate commerce.
- **Disqualifying conflicts:** insufficient approved visual media, inferred captions/associations, catalog-dense intent, or inaccessible/responsive image treatment.
- **Minimum expectation:** approved collection imagery; Lookbook and Editorial Grid remain recommended only when their resources/content are ready.
- **Fallback:** reduce asymmetry and editorial density, use contained uniform media, or recommend Essential/catalogue-first when visual support is insufficient.
- **Meaningful alternatives:** Maison for polished collection-led luxury; Essential for a truthful product-first composition.

### Ritual

- **Strongest fit:** beauty, skincare, personal care, wellness, calm product education, approved collection, FAQ/trust needs, verified ingredient/material context.
- **Acceptable fit:** product-first beauty/wellness with clear approved education and restrained proof.
- **Disqualifying conflicts:** clinical/medical/efficacy invention, unverified certification, unsupported ingredient claims, aggressive conversion, or incompatible industry/recipe.
- **Minimum expectation:** approved product/collection route; evidence-dependent Materials, Product Highlights, and Testimonials may be omitted.
- **Fallback:** calm product-first composition with only verified education, or eligible Essential.
- **Meaningful alternatives:** Maison for more premium collection/media emphasis; Essential for limited content.

### Essential

- **Strongest fit:** limited content/resources, small or new catalog, incomplete navigation/collections, speed, clarity, product-first objective, or no richer preset with sufficient support.
- **Acceptable fit:** any currently supported industry/business model where simplicity is an approved goal.
- **Disqualifying conflicts:** only a missing truthful minimum product/service identity or required customer path; Essential cannot fabricate even its baseline.
- **Minimum expectation:** enough authoritative business/product context for a clear safe destination; optional logo, hero, collections, and narrative must not block where runtime supports omission.
- **Fallback:** its own minimal viable product-first composition with neutral accessible treatment and no motion; block only if no truthful complete result exists.
- **Meaningful alternatives:** only richer eligible presets supported by approved intent/resources; no alternative is required.

### Signal

- **Strongest fit:** SaaS, applications, software, digital products, technical explanation, approved product name/value proposition, real CTA, verified features, and approved interface media.
- **Acceptable fit:** service/digital-product direction with structured explanation and real approved proof, provided current required content is satisfied.
- **Disqualifying conflicts:** invented features, integrations, security, pricing, metrics, screenshots, performance, or missing required product/value/CTA/feature/media support.
- **Minimum expectation:** the exact required content/resource set defined by the current Signal catalog and technology-clarity recipe.
- **Fallback:** simplify comparison/testimonial/carousel proof while retaining only verified features; if the minimum cannot be satisfied, do not fabricate or silently convert Signal.
- **Meaningful alternatives:** Essential or service-trust-compatible direction when truthful and eligible.

The primary recommendation must be the strongest **eligible** coherent preset, not merely the highest preference score. Required-content readiness must be resolved before approval and before a direction is presented as ready.

## 31. Homepage Recommendation

The engine chooses only from the eight current homepage recipes:

| Recipe | Current deterministic sequence |
| --- | --- |
| `luxury_story` | Full-screen Hero → Founder Story → Craftsmanship → Featured Collection → Testimonials → Newsletter |
| `technology_clarity` | Full-screen Hero → Product Highlights → Product Comparison → Product Carousel → Testimonials → FAQ → Newsletter |
| `food_story` | Full-screen Hero → Materials → Manufacturing Process → Featured Collection → Featured Blog → Newsletter |
| `beauty_discovery` | Full-screen Hero → Materials → Featured Collection → Testimonials → FAQ → Newsletter |
| `catalogue_first` | Full-screen Hero → Featured Categories → Collection Carousel → Product Carousel → Testimonials → Newsletter |
| `service_trust` | Full-screen Hero → Brand Values → Team → Testimonials → FAQ → Newsletter |
| `editorial_discovery` | Full-screen Hero → Lookbook → Story Banner → Featured Collection → Editorial Grid → Newsletter |
| `hospitality_escape` | Full-screen Hero → Story Banner → Behind the Scenes → Testimonials → FAQ → Newsletter |

Recipe fit considers approved preset, industry, merchant objective, catalog, approved content/evidence/resources, Design DNA hierarchy/density, conversion/editorial emphasis, page maximum, accessibility, performance, and installed capabilities.

The recipe is a baseline, not a mandate to populate every optional section. Evidence/content/resource-driven omissions must retain the preset's validated minimum composition and preserve page purpose. Section substitution is allowed only through an explicitly compatible documented candidate—not an arbitrary “similar” section.

Every chosen and fallback sequence is validated after omissions or substitutions. The generic homepage blueprint sequence containing `hero-slideshow → editorial-hero` is invalid under the current compatibility matrix and therefore cannot serve as a recommendation or safety fallback as written. A generic fallback must be fully eligibility-valid on its own.

## 32. Page Blueprint Recommendation

The current blueprint registry supports `homepage`, `product`, `collection`, `article`, `about`, `contact`, and `landing_page`. Each owns recommended sections, maximum section count, ideal flow, conversion goals, storytelling balance, and compatible recipe references.

The engine recommends only blueprints that exist, are mapped, and are supported by the target generation/runtime path. It must validate that a registry entry is actually consumed by the downstream Draft Builder before promising Beta support. For example, the current Draft Builder plans a `blog` page without a matching page-blueprint mapping and does not currently enumerate `landing_page`; this contract does not convert those gaps into support.

Search may have a page/runtime specification, but no `search` ID exists in the inspected page-blueprint registry. The Beta Recommendation Engine must not invent a Search blueprint. It may preserve existing safe Search runtime behavior outside the recommendation contract until a verified blueprint/mapping exists.

Design DNA influences presentation inside a selected blueprint; it cannot create unsupported template structures, page roles, H1/SEO ownership, or conversion goals.

## 33. Section Recommendation

Every section candidate is evaluated across:

```text
semantic usefulness
merchant goal and page task
catalog relevance
preset compatibility
Design DNA compatibility
content sufficiency
evidence sufficiency
resource sufficiency
page eligibility and dependencies
adjacency and repetition
runtime setting/block support
accessibility and responsive behavior
performance cost
safe empty/omission behavior
```

A section is recommended because it performs a useful approved role, not because it exists, appears in a personality bias list, or makes the storefront look richer. Runtime installation is necessary but insufficient.

Sections with distinct source authority remain distinct even when visually similar or built from the same Product Card. Lookbook, Image Mosaic, and Shop the Look are not interchangeable; curated cross-sell is not Shopify recommendations; Craftsmanship is not Manufacturing Process; a composition pack is not a runtime section.

If required content or evidence is unavailable, omit the section or reject the candidate. Never populate it with schema starter content, generic AI copy, inferred relationships, or media-derived claims.

## 34. Section Ordering

Ordering is recommendation-driven but deterministic. It begins with the selected eligible recipe/blueprint sequence, then applies only documented omissions or compatible substitutions, preserving explicit merchant priority and stable semantic order.

Required rules:

- one valid orientation/hero role and correct page heading ownership;
- no forbidden adjacency from the current compatibility matrix or canonical section contracts;
- no duplicate section identity or repeated semantic task without material justification;
- no three-section high-density run without an explicitly validated safe treatment;
- trust/proof appears where it supports the decision rather than after it is no longer useful;
- product discovery and conversion remain accessible without crushing editorial pacing;
- media and gallery sections do not repeat consecutively;
- product grids, comparisons, quotes, process sequences, and terminal newsletter actions are not duplicated adjacently;
- page maximum, preset performance budget, responsive order, and merchant-approved priority are preserved.

The engine does not ask a language model to improvise sequence. Deterministic source order and rule-based validation produce the candidate; incompatible candidates are regenerated from bounded eligible options or rejected.

## 35. Global Setting Recommendation

Global setting recommendations express approved Design DNA and strategy through existing validated setting families only.

Current supported relationships include typography scale/line-height/tracking and approved font choices; page/content width, gutters, section spacing, and grid gap; color-scheme selection; radius/text-transform; and global motion enablement/duration. The strategy mapping correctly treats typography, color, image, motion, conversion, personality, and design language as partial rather than atomic controls.

Precedence among eligible runtime values is:

```text
merchant-approved explicit setting
→ approved strategy/DNA-specific mapped value
→ approved preset default
→ verified live schema default
```

The engine recommends the conceptual direction and bounded value only through the mapping/capability layer. It does not choose an unlicensed font, fabricate a color palette, emit an unsupported value, or override an approved merchant value. Merchant-only and confirmation-required fields remain review items.

## 36. Section Presentation Recommendation

Section presentation recommendations cover only live, documented options such as validated layout variant, alignment, width, density, image ratio/treatment, media priority, animation toggle, columns, and other section-local settings that are safe to generate.

The engine must verify:

- the exact section schema exposes the setting and accepted value;
- the option supports the selected content/resource shape;
- canonical responsive, accessibility, performance, and empty states remain valid;
- the presentation preserves preset and Design DNA boundaries;
- the choice does not alter content truth, resource identity, semantic block order, or component ownership.

Presentation direction is not content. The engine cannot create headings, captions, links, claims, blocks, product associations, or evidence to satisfy a layout. Unsupported variants are omitted rather than approximated with CSS or hidden settings.

## 37. Resource Recommendation Integration

The Recommended Resource Set remains the single canonical resource-ranking and approval system. The Recommendation Engine integrates it through role requirements and readiness:

1. Declare which resource roles an eligible candidate requires or can optionally use.
2. Consume the Resource Set's current recommendation, alternatives, confidence, fallback, and approval status for those roles.
3. Evaluate candidate sufficiency without reranking individual resources.
4. Reflect safe resource omissions/fallbacks in composition and Design DNA.
5. Pin the approved Resource Set/snapshot revision in recommendation provenance.

If a resource becomes stale or unavailable, request the canonical fallback/refresh and recalculate affected dependencies only. Do not silently replace it, read mutable latest state, or introduce a second ranking heuristic.

The current dashboard preset path derives a lightweight content inventory from approved Brief/Profile text. That is executable evidence, not the future canonical resource trust boundary. The product contract requires actual Resource Set readiness and immutable snapshots before a resource-dependent recommendation is approved as generation-ready.

## 38. Design DNA Integration

Design DNA and preset selection have a phased relationship:

```text
Approved merchant/strategy intent
→ preset-independent visual constraints and candidate tendencies
→ eligible preset candidates
→ primary preset candidate
→ preset-contained candidate Design DNA normalization
→ coherent storefront candidate evaluation
→ merchant review
→ approved preset and approved Design DNA revisions
```

Before preset selection, the engine may use approved intent, personality, design language, and broad DNA constraints. It must not label those signals an approved preset-contained Design DNA revision. After a preset candidate is selected, the Design DNA contract normalizes variation inside that preset's fixed/flexible/forbidden/fallback boundaries.

The engine evaluates whether the resulting storefront candidate expresses the normalized DNA across recipe, hierarchy, density, rhythm, global settings, presentation, responsive behavior, accessibility, and performance. It cannot override fixed preset DNA, mutate the DNA normalizer, mix presets during Beta, or invent runtime controls.

The exact lifecycle and persistence boundary between provisional pre-preset DNA, candidate preset, and approved DNA remains an implementation/product decision. This phased boundary prevents circular authority without silently resolving the final record model.

## 39. Omission Recommendation

Omission is an intentional recommendation when optional content, evidence, resources, compatibility, accessibility, or performance support is absent.

Every omission includes:

- affected semantic role/section or optional treatment;
- deterministic reason category;
- source requirement that was not met;
- whether the omission is safe and reversible;
- effect on hierarchy, recipe, page rhythm, and preset minimum composition;
- what merchant action, if any, could make it eligible later.

Omission priority follows the selected preset and canonical section rules. It never removes a page's core purpose, hides a blocking requirement, or treats required content as optional. It does not silently replace omitted proof with vague trust copy or omitted media with fabricated imagery.

Merchant-facing language is calm: “I left out testimonials because no verified testimonials are approved,” not “Your store is incomplete.”

## 40. Fallback Recommendation

Fallbacks are fully evaluated candidate states, not shortcuts around validation.

Fallback order is:

1. preserve an eligible explicit merchant choice;
2. use the Recommended Resource Set's approved role fallback;
3. lower an affected Design DNA intensity within the preset;
4. omit optional content/media/motion/sections;
5. use the preset's validated minimum viable composition;
6. recommend an explicitly compatible preset change, commonly Essential;
7. block only if no truthful, accessible, complete minimum exists.

Essential is a preset recommendation, not a silent mutation or seventh “fallback” style. Switching from an approved preset requires the applicable review and new approval revision. Signal's self-fallback cannot bypass its required truthful product/value/CTA/feature/media minimum.

A fallback sequence must pass section adjacency, capability, evidence/resource, accessibility, and performance validation. The `hero-slideshow → editorial-hero` historical generic fallback is the canonical example of a fallback that must be rejected rather than trusted because it came from a blueprint.

## 41. Alternative Recommendations

The engine may present zero, one, or two alternatives. Each must:

- pass every eligibility gate;
- express the same approved merchant intent through a meaningfully different coherent emphasis;
- have sufficient required content and resources; any remaining review action must be explicitly non-blocking and concern only an optional or reversible choice;
- preserve source truth and runtime support;
- differ in merchant-understandable terms, not trivial setting changes;
- remain deterministic for the same input revisions.

Do not fill UI slots. Essential may be the only eligible direction. An alternative cannot be a filtered candidate, a preset with missing required content, or a direction that requires invented evidence.

Example:

```text
Recommended: Atelier
Emphasizes approved craft detail and editorial story.

Alternative: Maison
Emphasizes polished collection discovery with less process storytelling.
```

Raw scores, weight labels, and “second-best” language are not shown. The default number of alternatives remains an open product decision within the maximum of two.

## 42. Recommendation Confidence

Confidence is scoped to a conclusion—preset, recipe, composition, setting direction, or omission—not to the merchant or whole project.

| Level | Recommendation behavior |
| --- | --- |
| High | Present one strong ordinary reversible recommendation with minimal questioning. Keep it reviewable. Never bypass required preset, resource, sensitive-content, payment, or generation approval. |
| Medium | Present a usable primary recommendation with concise uncertainty and a meaningful alternative when one clarifies the trade-off. Ask one question only if consequential. |
| Low | Do not silently select a consequential direction. Use a conservative fallback, omit the affected optional feature, or ask one targeted question. |
| Unknown | Make no inference. Prefer an eligible safe minimal direction such as Essential where justified, or ask the minimum question required for completeness. |

`Confirmed` and `Approved` are lifecycle states, not confidence. Numeric percentages are prohibited unless a later implementation contract defines calibrated semantics and merchant research justifies them.

Current compiler decisions use `unresolved` where the newer product contracts use `Unknown`. A future normalization boundary must preserve unresolved meaning explicitly; it may not coerce it into Low or an approved selection. The precise evidence thresholds and merchant visibility of confidence remain open.

## 43. Recommendation Reasons

Every primary recommendation includes a small set of deterministic, grounded reasons. Reasons cite approved facts and outcomes without exposing internal IDs or scores.

Good:

> I recommend Atelier because your approved direction is craft-led, your product imagery supports tactile detail, and you want a premium story without a catalog-heavy opening.

Good with limitation:

> I recommend Gallery for its image-led discovery. I left out Shop the Look because no approved product associations are available.

Bad:

```text
Score: 87.3
industry_weight: 0.42
resource_bonus: 18
```

Reasons must be concise, source-grounded, non-technical, non-manipulative, and honest about omissions or uncertainty. They never present an inference as merchant truth or explain a sensitive omission in a way that pressures the merchant to fabricate it.

## 44. Merchant-Facing Explanation

The merchant explanation answers four questions:

1. What does Calinium recommend?
2. Why does it fit this business and objective?
3. What will it emphasize or omit?
4. What can the merchant change?

Quick Start shows a short primary reason, readiness summary, meaningful omissions, and one clear action. Guided adds trade-offs and alternatives. Advanced can expose more source categories, compatibility, confidence bands if approved for visibility, and dependent decisions.

Merchant explanations never expose raw scores, enum IDs, registry keys, section/runtime IDs, schema paths, checksums, stack traces, chain-of-thought, or hidden internal monologue. They use terms such as “image-led discovery,” “more product-focused,” and “needs approved craft evidence.”

If a requested candidate is ineligible, explain the concrete merchant consequence and nearest eligible alternative: “Gallery depends on several strong approved images; your current set has one. Essential is ready now, or you can add media before choosing Gallery.”

## 45. Internal Explanation

Internal explanation is structured decision provenance for validation, debugging, deterministic tests, and support. It is not free-form chain-of-thought.

Permitted categories include:

```text
merchant intent
merchant-approved fact
Shopify data
approved strategy
industry/personality/design language
preset rule
Design DNA decision
resource snapshot/readiness
page/section compatibility
runtime capability
evidence/content requirement
accessibility/performance constraint
safety fallback or omission
```

For each material decision, internal explanation may record selected candidate identity, source revision references, applied rule/category, eligibility result, rejected-alternative categories, confidence band, fallback/omission, and engine/registry versions. It must not store model chain-of-thought, secrets, tokens, unrestricted merchant conversation, or sensitive resource contents.

Structured reasons must be stable enough for repeat-run assertions and safe enough to transform into concise merchant explanations without leaking implementation detail.

## 46. Recommendation Review

Recommendation review is one coherent merchant decision surface, not a replay of every internal calculation. It presents:

- primary preset/direction and current recommendation status;
- concise fit reasons and material uncertainty;
- homepage structure and supported page direction;
- Design DNA summary in merchant language;
- Recommended Resource Set readiness and any consequential resource review;
- safe omissions and what would be required to restore them;
- zero to two meaningful eligible alternatives;
- blocking questions or approval requirements;
- whether the preview is Provisional, Approved, stale, or Generated.

The merchant can use the direction, explain a choice, show alternatives, change an affected item, refine conversationally, or open Advanced mode. Viewing, scrolling, previewing, silence, or continuing conversation is not approval.

Review uses one authoritative project and current candidate version. A stale candidate cannot be approved. Sensitive claims/resources and payment/generation consent remain separate even when ordinary design decisions are summarized together.

## 47. Merchant Override

The merchant may select another eligible preset or direction, change an outcome, remove an optional section, reorder a valid priority, or choose a different canonical resource through its owning selector.

An override must:

1. be current, project-scoped, attributable, and explicit;
2. pass the same eligibility and compatibility gates as the recommendation;
3. preserve the merchant's words and selection as provenance;
4. affect only dependent decisions;
5. create a new candidate/revision rather than mutate approved history;
6. preserve unrelated approved facts, resources, content, and decisions;
7. explain any safety or runtime constraint and offer the closest eligible alternative.

Explicit merchant choice wins among eligible creative options. It cannot override truth, accessibility, authorization, platform/runtime capability, evidence requirements, project scope, immutable history, or paid-order pinning.

The engine must not accept an incoherent override silently. If Gallery lacks sufficient approved media, it should explain the gap and offer Essential or a media-approval path. It does not quietly downgrade Gallery until the merchant no longer recognizes the choice.

## 48. Conversational Refinement

Conversational requests update bounded inputs and dependencies:

| Merchant request | Recalculate | Preserve |
| --- | --- | --- |
| “More minimal” | Affected Design DNA, preset compatibility if boundary is crossed, density, presentation, section rhythm | Industry, approved facts, resources, unrelated page/content decisions |
| “More editorial” | DNA hierarchy/media/editorial density, eligible recipe/sections, resource/content sufficiency | Facts and evidence; no stories are generated |
| “Show more products” | Commerce density, product discovery, grids, section rhythm, performance | Product identity/order unless explicitly changed |
| “Less storytelling” | Editorial density, optional narrative sections, page rhythm | Approved content history and unrelated resources |
| “More premium” | Typography/spacing/hierarchy/surface restraint and preset fit | No quality, price, scarcity, or exclusivity claim |
| “More technical” | Information density, hierarchy, presentation, Signal compatibility | No feature, metric, screenshot, security, or integration invention |

The engine resolves a clear request, shows the resulting Provisional candidate, and explains one material consequence. Ambiguous requests receive one proposed interpretation and, if consequential, one focused clarification. Unsupported requests receive a boundary and nearest eligible alternative.

Refinement never directly edits Liquid, CSS, runtime IDs, or immutable approved records. It preserves revision history and does not restart intake unless an upstream fact genuinely changed.

## 49. Recommendation Revision

```text
Recommendation candidate
→ merchant or dependency change
→ new candidate version
→ review
→ immutable approved recommendation revision
```

Candidate revisions are editable and may be recalculated. Approved revisions are immutable and retain parent lineage when superseded for future work.

Each approved recommendation revision should eventually pin:

- exact merchant/Creative Brief/Store Strategy revisions;
- preset catalog and approved preset revision;
- Design DNA version/revision;
- Recommended Resource Set and immutable snapshot revision;
- applicable recipe, blueprint, mapping, capability, and engine versions;
- primary candidate, alternatives shown, composition/order, reasons, confidence, omissions, fallbacks, and provenance;
- project/shop scope, approval reference, and timestamp.

Historical approvals remain reproducible. Removed candidates remain in revision history, not current output. Existing paid orders retain the exact approved recommendation/input revisions they already pin. A new revision never silently migrates them.

## 50. Recommendation Approval

Approval means the merchant accepts the proposed storefront direction at a specific candidate revision. It may make downstream content/resource planning or final-generation review eligible when all other gates pass.

Approval must be:

- explicit, informed, server-authoritative, project-scoped, attributable, current, and revision-specific;
- rejected when the candidate, strategy, preset, resources, DNA, capability versions, or required content changed after review;
- preserved as an immutable record with parent lineage where applicable;
- separate from content/evidence approval, ambiguous resource approval, payment, generation consent, installation, upload, publication, and update consent.

Approval does not create merchant facts, bless omissions as evidence, charge the merchant, generate a theme, modify Shopify, or authorize future automatic changes. Prior approval cannot authorize a later changed recommendation.

Until the existing open decision is resolved, preset acceptance remains an explicit approval event and is not silently inferred from a High-confidence recommendation or combined review.

## 51. Quick Start Behaviour

Quick Start presents the smallest useful recommendation surface:

```text
Recommended design
Atelier

Why it fits
Your approved direction is craft-led, your media supports product detail,
and you prefer a premium story over a dense catalog opening.

Resources ready  ✓
Homepage ready  ✓
Optional proof omitted: no verified testimonials

[Use this design]
```

It should:

- produce one strong eligible direction after as few questions as possible;
- show alternatives only on request or when they clarify a material trade-off;
- combine ordinary review where existing approval policy allows;
- make blockers and sensitive confirmations visible;
- preserve access to explanation, change, and Advanced mode;
- never lower eligibility, hide uncertainty, auto-approve under unresolved policy, or prioritize the under-ten-minute target over truth.

Quick Start uses the same engine, revisions, source authority, and approval gates as every mode.

## 52. Guided Mode Behaviour

Guided mode presents the same primary recommendation with more explanation and comparison. It may show:

- how approved merchant intent shaped the direction;
- the difference between one or two eligible alternatives;
- resource and composition trade-offs;
- why a section was omitted;
- how a Design DNA adjustment would change the storefront;
- which uncertainty would benefit from one answer.

Guided still recommends before asking the merchant to configure. It does not expose raw scoring, weight tables, runtime setting IDs, schemas, or an exhaustive preset grid. Additional explanation must help a decision rather than defend the engine.

## 53. Advanced Mode Behaviour

Advanced mode exposes the existing detailed stages and underlying approved decisions using the same Recommendation Engine and project state. It may show:

- Store Strategy and source-aware assumptions;
- preset compatibility and eligible alternatives;
- Resource Set slots, provenance, fallbacks, and approval status;
- content/evidence requirements and omissions;
- Design DNA dimensions and bounded overrides;
- homepage/page/section composition and ordering reasons;
- confidence bands, compatibility categories, revision history, and stale dependencies.

It does not expose secrets, tokens, raw immutable snapshots, checksums, internal filesystem paths, chain-of-thought, arbitrary weights, unsafe runtime IDs, editable Shopify JSON, or direct CSS/Liquid controls.

Advanced is not a separate recommendation path or a validation bypass. Switching modes changes presentation only and creates no recommendation, approval, snapshot, payment, or generation revision by itself.

## 54. Determinism

Identical normalized inputs must produce an identical recommendation:

```text
approved merchant and strategy revisions
+ Shopify/resource snapshot revisions
+ applicable registry and mapping versions
+ preset catalog/version
+ Design DNA version/revision
+ Recommended Resource Set revision
+ target theme/capability versions
+ Recommendation Engine version
→ identical eligibility results
  + primary recommendation
  + eligible alternatives and order
  + page/section composition and order
  + setting/presentation directions
  + confidence bands and reason categories
  + omissions, fallbacks, provenance, and questions
```

Canonical output must not depend on random choice, model sampling, object-key order, timestamps, filesystem paths, temporary workspaces, irrelevant wording order, or array position where stable identity/order exists.

AI may interpret free text into candidate merchant intent. Once normalized and approved, the engine uses bounded versioned rules. Stable declared source order and identity provide tie-breakers only after authority, eligibility, compatibility, and merchant intent are satisfied.

## 55. Provenance

Every material recommendation decision should eventually be traceable to one or more structured categories:

```text
merchant decision or correction
merchant-approved fact
Shopify-authoritative data
public website observation
Creative Brief
Store Strategy
industry/personality/design language
preset rule and version
Design DNA decision and version
Recommended Resource Set/resource snapshot
page/section compatibility rule
runtime capability
evidence/content sufficiency rule
safety/accessibility/performance fallback
```

Provenance identifies source and rule; it does not replace approval or confidence. It should reference immutable revisions where applicable and distinguish candidate observation from approved input.

Merchant-facing provenance is concise and useful. Advanced may reveal source categories and affected decisions. Full internal trace stays structured and access-controlled. No chain-of-thought, secret, token, sensitive conversation content, or complete resource snapshot is exposed in analytics, templates, or merchant-facing explanations.

## 56. Versioning

Versioning separates concerns:

- **Recommendation Engine version:** candidate generation, filtering, ranking, dependency, reason, and fallback behavior.
- **Preset catalog/preset version:** exact curated preset identity and constraints.
- **Design DNA version/revision:** normalized visual vocabulary and approved merchant-specific direction.
- **Resource Set/snapshot revision:** exact approved resources and bindings.
- **Strategy/compiler and mapping versions:** normalized merchant strategy and supported mapping semantics.
- **Capability/theme version:** exact runtime target and available section/setting behavior.
- **Approved recommendation revision:** immutable result tying the above inputs together.

A version change does not automatically stale every recommendation. It does so only when its declared dependency or eligibility result changes. Material migrations create a new candidate and review path; they never reinterpret an approved historical revision in place.

Whether the Recommendation Engine version appears in external generated-theme manifests is an open decision. Internal provenance must retain it for reproducibility.

## 57. Staleness

A recommendation becomes stale when a consequential pinned dependency changes, disappears, or no longer validates. Examples include:

- product, collection, menu, destination, or media deletion/unavailability;
- approved resource replacement, rights/accessibility change, or snapshot mismatch;
- merchant correction or approved Store Strategy revision;
- preset selection/version or catalog constraint change;
- Design DNA revision or changed fixed-boundary compatibility;
- Approved Block Plan/content/evidence change affecting selected sections;
- recipe, blueprint, mapping, section capability, compatibility, target-theme, or engine behavior change;
- authorization/project/shop scope mismatch.

Staleness is dependency-scoped and classified as blocking or non-blocking. A changed optional unused resource does not churn the recommendation. A missing primary hero or product destination may block approval/generation readiness.

Staleness never creates a newly approved result. Preserve the historical approved revision, mark the current candidate/preview stale, state the affected decision in merchant language, and require recalculation/review only where consequential.

## 58. Recalculation Rules

Recalculation follows an explicit dependency graph and prefers the smallest valid scope.

| Change | Recalculate | Do not recalculate by default |
| --- | --- | --- |
| Hero image replaced | Resource slot readiness, hero treatment/presentation, dependent performance/responsive checks, affected preview/composition | Industry, audience, unrelated pages, unrelated resources |
| Product deleted | Affected Resource Set role, sections/blocks using it, page sufficiency, relevant alternatives | Brand personality, Design DNA dimensions unrelated to commerce |
| Collection structure changed | Collection/product discovery, navigation dependencies, affected recipe/sections | Founder/evidence content and unrelated design dimensions |
| Brand personality changed | Design DNA, preset compatibility/ranking, presentation, possibly recipe/section candidates | Shopify product identity and approved content history |
| Primary merchant objective changed | Hierarchy, conversion/editorial balance, preset/recipe/composition candidates | Unaffected approved facts/resources |
| Preset changed | Preset-contained DNA, recipe, page/section composition, defaults, sufficiency and alternatives | Merchant facts and immutable prior approvals |
| Design DNA dimension changed | Compatible presentation, density/rhythm, affected preset boundary and sections | Unrelated DNA dimensions unless dependency rules require them |
| Runtime capability removed | Every candidate depending on it, associated fallback and eligibility | Candidates without that dependency |
| Irrelevant metadata/key order changed | Nothing semantic | All recommendation decisions |

A full recalculation is reserved for changes that invalidate core source authority, strategy, target theme, preset catalog semantics, engine normalization, or a broad dependency graph. The exact materiality threshold remains open, but implementation convenience is not sufficient reason to restart intake.

## 59. Failure Behaviour

Failures are categorized as input unavailable, authorization/scope invalid, approval stale, registry/capability invalid, no eligible rich candidate, required minimum missing, or internal recommendation failure.

If no rich candidate is eligible, the engine still seeks a truthful safe minimal direction:

```text
eligible Essential recommendation
+ validated minimum composition
+ approved product/business identity
+ accessible neutral presentation
+ explicit omissions
```

If even that minimum cannot be built, explain the smallest merchant action required—such as approving one real product destination—without blaming the merchant.

Merchant-facing errors avoid internal messages such as `Recommendation Engine validation error 42`, schema paths, stack traces, or score details. They preserve completed work and say what remains available, what failed, and what action can recover.

A failure before approval creates no approval. A failure after a prior approved revision does not corrupt it. No failure permits fabricated content, unsafe fallback, silent preset switching, automatic charge, or Shopify mutation.

## 60. Recovery Behaviour

The merchant can:

- retry failed optional analysis;
- skip nonessential website analysis;
- correct one input or approve one missing dependency;
- request a current Resource Set refresh;
- choose an eligible alternative;
- resume after refresh, navigation, sign-in, or process interruption;
- return to the last valid recommendation and review current changes.

Retry uses the same current input revisions and idempotency boundary. Resume loads server-authoritative state before local display preferences or drafts. Stale local edits require comparison, not silent overwrite.

Recovery preserves prior approved decisions and unaffected candidate work. It creates no duplicate project, strategy, preset candidate, resource snapshot, recommendation approval, paid order, charge, generation, or artifact. A recovered recommendation remains Provisional until explicitly approved.

## 61. Performance Boundaries

Recommendation performance is part of the merchant experience and storefront eligibility.

The engine should:

- reuse normalized Intake, Strategy, Resource Set, and Design DNA results instead of rescanning unchanged inputs;
- enumerate only bounded current registry candidates rather than open-ended design combinations;
- perform deterministic eligibility before expensive explanation/preview work;
- use dependency-scoped recalculation and cancel/supersede stale candidate work where safe;
- summarize and paginate large catalogs outside the critical recommendation path;
- avoid blocking conversation on optional website analysis;
- bound reasons, alternatives, warnings, and progress events;
- preserve responsive UI input while analysis runs;
- consider preset/section media, motion, section-count, and runtime cost before recommending a storefront.

No universal latency, Lighthouse, or resource-size claim is made without measurement. A fast invalid recommendation is not acceptable, and a visually rich candidate that breaches the current preset/section budget is ineligible.

## 62. Accessibility Considerations

Accessibility applies to both the recommendation experience and the recommended storefront.

The recommendation experience must provide semantic status, logical focus, keyboard access, visible focus, readable explanations, accessible alternatives, non-color-only confidence/readiness, restrained live regions, zoom/reflow, RTL/translation resilience, and stable focus during streaming/recalculation.

The storefront candidate must target WCAG 2.2 AA and pass applicable type/contrast, heading/source order, focus/control, touch target, reduced-motion, media alternative, responsive, and canonical component/section gates before ranking.

Accessibility is an eligibility constraint, not a score penalty or optional DNA preference. When it constrains merchant aesthetics, explain the smallest safe adaptation. The engine must not imply that recommendation validation alone is a complete legal compliance audit.

## 63. Analytics

Conceptual events include:

```text
recommendation_started
recommendation_ready
primary_recommendation_viewed
alternative_viewed
recommendation_accepted
recommendation_changed
recommendation_explanation_opened
recommendation_failed
recommendation_recovered
recommendation_became_stale
recommendation_recalculation_started
recommendation_recalculation_completed
```

Events may include project-safe pseudonymous scope, mode, preset ID where policy permits, engine/catalog versions, confidence band, number of eligible alternatives, reason category, omission/fallback category, stale dependency category, duration, and outcome.

Analytics must not include merchant conversation contents, sensitive facts/claims, access tokens, Shopify customer data, complete resource identifiers/snapshots, free-form internal reasoning, secrets, or raw error payloads. Analytics never changes ranking, approval, or future projects without a separate consented post-Beta learning contract.

## 64. Beta Recommendation Scope

Beta is bounded to:

- six presets: Atelier, Maison, Gallery, Ritual, Essential, Signal;
- the 17 current industry profiles, 11 personalities, and 12 design languages;
- eight current homepage recipes;
- current page blueprints that are actually mapped and consumed;
- current strategy compiler and Draft Builder decisions/mappings;
- current installed section capabilities, canonical specifications, and compatibility rules;
- current Approved Block Plan adapters and approved-content truth boundaries;
- the canonical Recommended Resource Set and immutable snapshots;
- the current Beta Design DNA scope;
- Calinium One 1.0, deterministic approved-input pinning, and read-only package generation.

Beta does not introduce an open-ended AI agent, new preset, cross-preset blending, new recipe/blueprint/section/setting, self-modifying weights, cross-merchant learning, automatic content generation, or Shopify mutation.

The inspected executable architecture is a foundation, not yet one unified canonical engine. Future implementation alignment must address these observed boundaries without this document changing code:

- the current preset recommender ranks before attempting compatible fallback rather than filtering all eligibility first;
- required content is currently a readiness/approval block rather than always recommendation eligibility;
- current dashboard content inventory is a text-derived heuristic, not the canonical Resource Set;
- current preset recommendation does not yet consume a Design DNA revision;
- compatibility/manifest coverage is narrower than the installed section-capability catalog;
- the generic homepage fallback can produce the invalid dual-hero adjacency documented above.

Beta acceptance requires:

- exactly one coherent primary recommendation;
- zero to two meaningful eligible alternatives;
- eligibility before ranking and fully valid fallbacks;
- preserved preset identity and Design DNA boundaries;
- actual resource/content/evidence availability respected;
- no fabricated content or invalid section adjacency;
- deterministic repeat output and stable ordering/reasons;
- merchant override and immutable revision history preserved;
- High-confidence Quick Start with minimal interaction but no silent approval;
- stale dependency detection and scoped recalculation;
- safe minimal fallback or one clear blocking action;
- no duplicate approval, payment, generation, or paid-order mutation;
- no automatic theme installation, upload, publication, or update.

## 65. Anti-Patterns

The Recommendation Engine explicitly rejects:

- a raw language model choosing an entire theme;
- random preset, recipe, section, resource, or setting selection;
- ranking or scoring before eligibility filtering;
- rescuing an invalid candidate with a score or confidence penalty;
- treating required content as optional merely to show a recommendation as ready;
- displaying irrelevant or ineligible alternatives to fill UI slots;
- exposing raw scores, weights, registry IDs, schemas, runtime IDs, or chain-of-thought;
- duplicating the Recommended Resource Set or Design DNA normalizer;
- using website observations as merchant truth or copying a website;
- recommendations dependent on fabricated content, evidence, product relationships, destinations, screenshots, or claims;
- using aesthetics, media, preset, or industry as evidence;
- silently accepting an incoherent merchant override;
- trusting a generic fallback without full compatibility validation;
- recommendation churn from irrelevant changes or full-project recomputation for every edit;
- mutating approved revisions or paid-order-pinned inputs;
- self-modifying weights or cross-merchant learning in Beta;
- automatic generation, installation, upload, publication, updates, or Shopify writes.

## 66. Open Product Decisions

These questions require founder judgment, merchant research, architecture evidence, accessibility/privacy review, or measured testing. This contract does not answer them.

### Recommendation presentation and approval

1. May Quick Start combine or auto-accept preset approval, and may High-confidence Design DNA share that explicit approval event?
2. Is confidence merchant-visible as bands, reasons, both, or neither?
3. Should one or two alternatives appear by default, or only on request?
4. How much explanation is visible before the experience becomes configuration?
5. When is “You decide” safe for a consequential ordinary direction?
6. Which Medium-confidence ordinary decisions qualify for combined review?
7. Should Advanced show bounded decision values, structured compatibility, or both?

### Eligibility, confidence, and ranking policy

8. What exact evidence combinations produce High, Medium, Low, or Unknown for each output family?
9. What is the final deterministic tie-break when authoritative inputs provide no meaningful order?
10. Does resource confidence directly influence preset preference, or only candidate sufficiency/eligibility?
11. Should an ineligible “not ready” future direction ever be shown as educational guidance outside the ranked primary and alternative recommendations, and how must that separation be labelled?
12. How should incomplete compatibility metadata constrain sections without making every unclassified capability unusable?
13. What exact minimum makes Essential eligible for non-product service/digital merchants?
14. How should genuinely multi-domain industries be represented?

### Design DNA and preset lifecycle

15. What is the final persisted lifecycle between pre-preset visual constraints, candidate preset, preset-contained candidate DNA, and approved DNA?
16. How much website observation may influence Design DNA and preset preference?
17. How much variation is allowed before the engine must recommend another preset?
18. Should the Recommendation Engine version and Design DNA provenance appear in external manifests?
19. How should current theme settings influence a new direction when the merchant wants change?

### Resources, preview, and website observations

20. Whether `Preview theme` remains a Recommended Resource Set slot or becomes a preset/preview decision.
21. What resource/evidence readiness threshold makes the first Provisional preview available?
22. Does the first preview appear after the first answer or a complete recommendation, and does it use a local renderer or generated Shopify JSON?
23. May website screenshots/resources be retained, shown, or enter approval, and under what consent/provenance rules?
24. Can website factual statements become review candidates or only contextual leads?
25. How are Shopify-versus-merchant and website-versus-merchant conflicts resolved when no source clearly owns the meaning?

### Recalculation, markets, learning, and accessibility

26. What dependency/materiality threshold triggers a full rather than partial recalculation?
27. Is undo/redo scoped to one refinement, the whole current candidate, or project history?
28. How should Markets, locales, B2B audiences, and regional catalogs affect one recommendation revision?
29. What measured responsive/performance thresholds become eligibility gates?
30. How much explanation should accompany an accessibility-driven constraint?
31. May generated-theme performance or merchant feedback influence recommendation post-Beta, and through what approved revision process?
32. May consented merchant preference history influence future projects post-Beta, and how is it viewed or cleared?

Interaction layout, streaming transport, subscription presentation, and Premium Theme purchase-channel questions remain in their owning contracts. They must not be resolved indirectly through recommendation implementation.

## 67. Implementation Readiness

This contract is ready to govern the Live Preview Engine product contract and a later Recommendation Engine implementation design. It establishes ownership, source authority, eligibility-before-ranking, six-preset behavior, composition, Design DNA and Resource Set boundaries, confidence, alternatives, explanation, approval, determinism, provenance, staleness, scoped recalculation, fallback, accessibility, and Beta limits.

Implementation is not authorized by this document. Before code changes, a separate architecture task must map the canonical lifecycle onto the current compiler, preset recommender, Resource Set, Design DNA, Draft Builder, approval persistence, and generator; define the versioned candidate/approved record boundary; and close the observed score-before-eligibility, heuristic-resource, Design-DNA-input, compatibility-coverage, and generic-fallback gaps without redesigning existing ownership.

The open decisions above do not block the next Live Preview product contract because Preview can consume a versioned recommendation state while preserving unresolved approval, visibility, and rendering choices explicitly.

**Readiness: Ready for Live Preview Engine product contract**
