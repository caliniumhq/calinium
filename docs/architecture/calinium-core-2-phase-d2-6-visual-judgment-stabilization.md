# Calinium Core 2.0 Phase D2.6 — Visual Judgment Stabilization

## Purpose and boundary

Phase D2.6 stabilizes the path from visible evidence to diagnosis without repairing storefront code. It separates screenshot observation from design classification, preserves Phase D1 facts as authoritative, binds classification to trusted Phase C architecture provenance, and represents evaluator reliability explicitly.

This phase does not edit Liquid, CSS, presenters, architecture profiles or families, Design DNA, presets, merchant content, screenshots, billing, deployment, Shopify configuration, merchant UI, or approval behavior. Human review remains mandatory and every contract keeps automatic repair, mutation, Shopify writes, and fixture fallback disabled.

## Root causes in the D2.5 ensemble

The saved three-run evidence shows useful visual perception but unstable diagnosis and classification:

1. The D2.5 model had to observe pixels and choose dimension, importance, responsibility, and recommendation in one response.
2. The 12 dimensions had names but no primary-dimension decision rules or counterexamples, so empty modules drifted among product discovery, spacing/rhythm, composition, and polish.
3. Responsibility labels lacked strict evidence thresholds. The same mobile header condition moved between architecture and composition, while absent merchant content obscured Calinium's responsibility for rendering an empty dependent module.
4. Recommendation categories mixed visible consequence, route purpose, and intervention class.
5. Broad finding scopes allowed unrelated conditions to merge across routes or components, including collection/PDP emptiness and separate text-wrap conditions.
6. Root overflow and its clipped product-row symptom could become two independent findings.
7. Architecture identity was available, but the classifier did not receive a minimal answer to whether the affected presenter was family-owned, profile-specific, shared between profiles, or shared Core.
8. Several single-run observations are legitimate possible conditions rather than automatic false positives. Their absence from other runs is observation-instability evidence.
9. The rejected historical D2.5 run demonstrated semantic-completeness ambiguity: schema validity alone did not guarantee complete required coverage.

These causes divide into model observation instability, taxonomy ambiguity, responsibility/recommendation ambiguity, insufficiently focused architecture context, overlapping findings, prompt ambiguity, and legitimate multi-causal conditions. D2.6 makes those categories measurable rather than collapsing them.

## Stage 1 — frozen visual observation

Contract: `visual-observation-v1`.

Stage 1 answers only: **What is visibly happening?** Each observation is atomic and contains:

- exactly one route;
- one or more bound profiles and viewports;
- a visible component/region;
- one observable phenomenon;
- concise evidence and confidence;
- checksum-bound screenshot cells;
- relevant authoritative D1 facts;
- immutable observation identity and checksum.

It contains no design dimension, importance, responsibility, recommendation, repair instruction, source-code inference, or merchant-ownership decision. Live Stage 1 also returns one inspection acknowledgement for every supplied cell. Completeness, scope, screenshot provenance, duplicate conditions, objective acknowledgements, and instruction-free evidence are validated before an observation can be frozen.

The observation-kind vocabulary is deliberately visual: page overflow, child truncation, visible empty module, repeated information, control crowding, awkward word break, duplicate surface, comparison friction, architecture difference, and an explicit other/unknown condition.

## Stage 2 — deterministic diagnosis and classification

Contract: `design-classification-v1`.

Stage 2 receives the exact observation ID and checksum. It does not receive or reinterpret the screenshot. It assigns:

- one primary design dimension and optional secondary dimensions;
- importance;
- responsibility;
- intervention-class recommendation;
- root/symptom/related/independent relationship;
- minimal architecture provenance;
- uncertainty reasons;
- whether the condition is an independent candidate for later human-reviewed planning.

A checksum change invalidates the classification. `uncertain` and `uncertain_requires_review` are first-class outcomes. Phase D2.6 classifications always require human review and cannot be consumed automatically by repair planning.

## Responsibility ontology

| Responsibility | Strict boundary |
|---|---|
| `architecture_level` | Structural presenter composition, information hierarchy, navigation/grid/PDP relationships, or responsive transformation proven by family provenance. An architecture profile's mere existence is insufficient. |
| `composition_level` | The architecture is valid, but local generated arrangement, grouping, repetition, ordering, or graceful empty-state/fallback behavior is defective. |
| `design_token_level` | Structure is sound and typography, measure, line-height, width, spacing, or breakpoint values primarily cause the condition. |
| `merchant_content_level` | The system handles input correctly and the merchant-provided input itself is absent, excessive, low-quality, or inappropriate. It does not absorb Calinium's failure to suppress an empty dependent module. |
| `data_quality_level` | Trusted structured-resource evidence proves invalid, incomplete, or unavailable data. |
| `uncertain` | Screenshots and trusted context cannot establish ownership reliably. This is preferred over an arbitrary label. |

## Primary-dimension rules

Every classification has exactly one primary dimension. Specific route-purpose and functional dimensions take precedence over generic effects:

- page-level mobile containment → `mobile_adaptation_quality`, not product discovery or polish;
- empty collection discovery module → `product_discovery`, with spacing/composition secondary;
- empty PDP explanatory module → `pdp_communication`, with composition secondary;
- identity/control crowding in a header → `navigation_header_clarity`;
- internal word breaking or measure failure → `typographic_hierarchy`;
- repeated/duplicated local surfaces → `composition`, unless the repeated information directly weakens PDP communication;
- `perceived_polish` is a last-resort primary dimension, not a catch-all;
- `architecture_differentiation` is used only for a controlled structural comparison.

The policy documents a positive rule and counterexample for all 12 dimensions. Secondary dimensions describe consequences without changing primary ownership.

## Recommendation taxonomy

Recommendations answer **what class of intervention is appropriate**, never how to edit code:

- `responsive_adaptation`
- `suppress_empty_module`
- `navigation_clarity`
- `typographic_containment`
- `composition_simplification`
- `content_omission`
- `hierarchy_adjustment`
- `no_action_preference_only`
- `uncertain_requires_review`

Each category maps to the closest existing D2 convention for downstream compatibility. No recommendation contains pixel values, selectors, implementation steps, Liquid, or CSS.

## Root cause and symptom handling

Classifications use `root_finding`, `symptom_of`, `related_finding`, or `independent`. An authoritative page-level overflow is the root. A clipped child linked to the same D1 fact becomes `symptom_of`, targets the frozen root observation, and has `independent_repair_candidate: false`. It remains visible evidence but cannot create a second repair action.

This rule is generic and uses observation kind, scope, and objective-fact relationship. It does not encode saved finding IDs or screenshot hashes as answers.

## Architecture context

Stage 2 receives only the architecture data needed for ownership:

- affected family type and selected family ID;
- registered presenter IDs;
- whether the family selection is shared between both profiles;
- whether the observation is profile-specific;
- whether the component belongs to an architecture family, shared Core, or unknown scope;
- a digest-bound provenance revision.

Runtime file contents and benchmark source are excluded. Shared footer/newsletter surfaces are identified as shared Core; route presenters and responsive/header/card systems bind to their selected families.

## Offline reclassification result

Input: the frozen evidence claims and findings from all three accepted D2.5 live runs. No model or API call is made.

Original D2.5 repeat metrics:

- dimension categorical agreement: `0.20`;
- high-impact finding agreement: `0.4286`;
- responsibility agreement: `0.1818`;
- recommendation agreement: `0.1818`;
- unstable items: `58`.

D2.6 offline metrics:

- observation agreement: `0.4545`;
- high-impact finding agreement: `1.0000`;
- primary-dimension agreement: `1.0000`;
- importance agreement: `1.0000`;
- responsibility agreement: `1.0000`;
- recommendation agreement: `1.0000`;
- root/symptom agreement: `1.0000`;
- D1 contradictions: `0`;
- unsupported single-run observation candidates: `8` (`0.5714` of unique observation keys).

The offline material-improvement gate passes because primary dimension, responsibility, and recommendation each improve by at least `0.20`, with zero D1 contradictions. This proves classification stability only. Observation agreement remains below the reliability threshold, so the offline reliability status is `not_reliable` and does not authorize repair planning.

## Limited live validation design

The approved live scope is exactly 12 existing Phase C screenshots:

- Current Calinium and Editorial Discovery;
- Homepage, Collection, and Product;
- desktop and mobile;
- Cart excluded;
- `gpt-5.6-sol`, medium reasoning;
- two accepted repeats, maximum two accepted live calls;
- at most two semantic-completeness attempts for an incomplete run;
- no fixture fallback;
- accepted-run checksum persistence and resume support so a successful call is not repeated.

Each paid repeat asks only for Stage-1 observations. Stage 2 is local and consumes the frozen observation checksum. Live metrics keep observation, high-impact, dimension, responsibility, recommendation, relationship, D1 contradiction, and unsupported-candidate measures separate.

## Reliability gate

Statuses are `not_reliable`, `human_review_only`, and `repair_planning_eligible`. Eligibility requires every published threshold to pass independently; no opaque composite score exists. D1 contradiction count must be zero and unsupported-finding rate must remain bounded.

Even if the metric status reaches `repair_planning_eligible`, the Phase D2.6 report keeps `repair_planning_consumption_allowed: false`, `human_review_required: true`, and `automatic_repair_allowed: false`. A later approval is required before D3 can consume subjective findings.

## Commands

Offline-only analysis and validation:

```bash
npm run evaluate:storefront-visual-judgment-stabilization
npm run test:storefront-visual-judgment-stabilization
npm run validate:storefront-visual-judgment-stabilization
```

Limited live validation, only after the offline gate passes and credentials are available:

```bash
npm run evaluate:storefront-visual-judgment-stabilization -- --live
```

If a later accepted run must be preserved after a failure, the saved `live-progress.json` can be supplied through `--resume`; its request and run checksums must match exactly.

## Live result

The limited live validation completed against request `visual-judgment-request-c3a82e7153fc0d9d53e8`. Reliability report `visual-judgment-report-18bbe2250062b9947063` was finalized from the two saved accepted runs without another provider call.

Accepted live scope and operation:

- model: `gpt-5.6-sol`;
- reasoning: medium;
- screenshots: `12/12` approved Homepage, Collection, and Product desktop/mobile cells for both profiles;
- accepted repeats: `2/2`;
- accepted-run provider requests: `2`;
- accepted-run retries: `0`;
- accepted-run combined latency: `131,313 ms`;
- accepted-run usage: `95,562` input, `10,865` output, `106,427` total tokens;
- fixture fallback: `false`;
- D1 contradictions: `0`;
- human review required: `true`;
- automatic repair: `false`.

One earlier paid attempt was rejected before acceptance with `visual_observation_duplicate_condition`. It produced zero accepted runs, used no fixture fallback, and changed no storefront state. The failure showed that two same-identity observations should be coalesced rather than fail the evaluation. The normalizer was hardened generically to merge same-scope/same-phenomenon evidence before freezing, with focused mock coverage. The subsequent two accepted calls were not repeated. Total paid provider calls during Phase D2.6 were therefore `3`: one rejected harness-validation call plus the two accepted repeats.

Limited live consistency:

- observation agreement: `0.6667`;
- high-impact finding agreement: `0.8000`;
- primary-dimension agreement: `1.0000`;
- importance agreement: `1.0000`;
- responsibility agreement: `1.0000`;
- recommendation agreement: `1.0000`;
- root/symptom agreement: `1.0000`;
- D1 contradiction count: `0`;
- unsupported single-run observation rate: `0.3333` (`7` scoped observation keys).

Compared with D2.5, high-impact agreement improved by `0.3714`, primary-dimension agreement by `0.8000`, responsibility agreement by `0.8182`, and recommendation agreement by `0.8182`. The result is **materially improved**, but D2.5 did not contain a separate observation-agreement metric, so no artificial baseline is invented for it.

The seven unsupported/unstable observations remain human-review candidates, not automatic false positives:

- controlled architecture difference in the collection hero (run 2 only);
- controlled architecture difference in the broader collection page (run 1 only);
- controlled architecture difference in the broader homepage (run 1 only);
- controlled architecture difference in the homepage product grid (run 2 only);
- Editorial desktop homepage comparison friction attributed to the product grid (run 2 only);
- Editorial desktop homepage comparison friction attributed to the product row (run 1 only);
- Editorial desktop homepage product-row truncation (run 1 only).

The final reliability status is `human_review_only`. Observation agreement remains below the `0.75` eligibility threshold and unsupported-finding rate remains above the `0.10` threshold. Classification is now stable for matched frozen observations, but visual-observation coverage is not yet reliable enough for autonomous or unreviewed repair planning.

Phase D2.6 has completed its stabilization experiment and is ready for a local checkpoint after approval. It does not approve D3: `repair_planning_consumption_allowed` remains `false`, subjective findings still require human authority, and no storefront repair has been performed.
