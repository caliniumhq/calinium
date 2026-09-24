# Calinium Core 2.0 Phase D2.7 — Visual Observation Stabilization

## Status and boundary

Phase D2.7 stabilizes what the live visual evaluator observes before the checkpointed D2.6 classifier assigns dimension, importance, responsibility, recommendation, or root/symptom classification. It does not repair a storefront, change a theme, or begin Phase D3.

The implementation does not modify Liquid, CSS, storefront presenters, architecture profiles or families, Design DNA, presets, merchant content, screenshots, billing, deployment, Shopify configuration, or approval behavior. Human review remains mandatory and automatic repair remains forbidden.

## Cause analysis

The remaining D2.6 instability came from the Stage-1 representation and matching layer rather than the stabilized classifier:

1. D2.6 observations could aggregate several profiles and viewports into one record. Minor scope differences therefore became different observation keys.
2. `architecture_difference` was a cross-profile conclusion emitted as an observation rather than a controlled comparison derived from per-image evidence.
3. `comparison_friction` mixed visible grid geometry with an interpretation of its effect.
4. The same product presentation could be called a row or grid, and the same header proximity could be called crowding or dense grouping.
5. Legacy combined PDP-support evidence could be over-split from prose even when the historical record did not safely separate the modules.
6. Exact phenomenon labels did not normalize safe semantic variants such as internal word breaking versus an isolated final character.
7. A genuinely visible but single-run condition remained possible and needed explicit review-only support status rather than fabricated consensus.

### Disposition of the seven D2.6 unstable candidates

| Candidate | D2.7 disposition |
| --- | --- |
| Collection-hero architecture difference | Cross-profile comparison judgment; removed from Stage 1. |
| Broader Collection-page architecture difference | Cross-profile/cross-viewport comparison judgment; removed from Stage 1. |
| Broader Homepage architecture difference | Cross-profile/cross-viewport comparison judgment; removed from Stage 1. |
| Homepage product-grid architecture difference | Comparison-layer conclusion derived from separately bound grid-structure observations. |
| Editorial desktop comparison friction in product grid | Reclassified to concrete `asymmetrical_grid_structure`. |
| Editorial desktop comparison friction in product row | Overlapping representation of the same concrete asymmetric product presentation; normalized conservatively. |
| Editorial desktop product-row truncation | Concrete visible condition, but genuinely single-run/scope-sensitive in the D2.6 evidence and therefore review-only. |

No fixture IDs, screenshot hashes, or approved finding answers are encoded as classification rules.

## Concrete Stage-1 contract

`concrete-visual-observation-v1` binds exactly one:

- profile;
- route;
- viewport;
- screenshot cell and SHA-256 checksum;
- normalized phenomenon;
- component and visible region;
- concise evidence statement;
- confidence;
- optional D1 objective facts;
- presenter/family provenance;
- root, symptom, or independent relationship.

An observation cannot aggregate profiles or viewports. An unknown region requires a named presenter landmark or numeric bounded region. The contract rejects quality judgments, responsibility or causal attribution, recommendations, repair instructions, and code changes.

## Observation ontology

The bounded vocabulary contains 21 concrete phenomena:

- containment and visibility: `horizontal_overflow`, `visible_clipping`, `truncated_visible_content`;
- typography: `word_break`, `isolated_line_wrap`;
- proximity and grouping: `element_crowding`, `overlapping_elements`, `dense_local_grouping`, `weak_visual_separation`;
- empty or repeated surfaces: `empty_visible_module`, `missing_visible_supporting_content`, `excessive_local_whitespace`, `repeated_visible_module`, `repeated_media_content`;
- concrete structure: `uniform_grid_structure`, `multi_row_grid_structure`, `asymmetrical_grid_structure`, `featured_first_grid_structure`, `single_row_grouping`, `stacked_grouping`, `sequential_content_order`.

Stage 1 rejects expressions such as better/worse, premium/cheap, effective/ineffective, stronger/weaker architecture, comparison friction, insufficient differentiation, poor discovery, weak hierarchy, or more/less polished. Those belong to classification or controlled comparison.

## Three separated layers

1. Per-screenshot observation records what is visibly present in one screenshot.
2. Cross-viewport comparison compares separately frozen observations from the same profile and component.
3. Cross-profile comparison compares separately frozen Current and Editorial observations and binds the conclusion to Phase C presenter provenance.

The live model never emits a cross-profile architecture conclusion directly. The controlled comparison contract requires at least two checksum-bound source observations and remains human reviewed.

## Normalization, matching, and support

Deduplication requires a conservative match on phenomenon family, component, profile, route, viewport, and root evidence. Safe semantic families include visible word-wrap break, visible content loss, empty supporting content, local crowding, and visible repetition. Different components or screenshot scopes never merge.

The live evidence exposed one general structural alias: an equal-width mobile grid continuing to a second row and a stacked two-row grid can describe the same `multi_row_grid_structure` when the evidence explicitly names a second or next row. The saved accepted runs were recomputed with this generic rule; no additional model call was made.

Support states are:

- `repeated_across_runs`;
- `single_run_supported_by_d1`;
- `single_run_requires_review`;
- `unsupported`.

Only repeated or D1-supported observations enter the authoritative set. A root-linked truncation remains supporting symptom evidence and cannot independently authorize repair.

## Offline D2.7 reprocessing

The two accepted D2.6 runs were reprocessed with zero API calls.

| Metric | D2.6 live | D2.7 offline |
| --- | ---: | ---: |
| Observation agreement | 0.6667 | 0.9677 |
| Unsupported rate | 0.3333 | 0.0323 |
| High-impact agreement | 0.8000 | 0.9091 |
| Primary dimension | 1.0000 | 1.0000 |
| Importance | 1.0000 | 1.0000 |
| Responsibility | 1.0000 | 1.0000 |
| Recommendation | 1.0000 | 1.0000 |
| Root/symptom | 1.0000 | 1.0000 |
| D1 contradictions | 0 | 0 |

Across the two offline runs, eight duplicate concrete records were suppressed, four legacy architecture judgments were moved out of Stage 1, both root-linked child observations retained symptom status, and one concrete Editorial desktop clipping condition remained review-only. The offline live-call gate passed before credentials or network transport were loaded.

Offline reprocessing proves the normalization and matching layer; it does not by itself prove new live-model stability.

## Limited live validation

The live validation used:

- `gpt-5.6-sol`;
- Medium reasoning;
- Current Calinium and Editorial Discovery;
- Homepage, Collection, and Product;
- desktop and mobile;
- the exact 12 approved Phase C screenshot cells and existing checksums;
- two accepted repeats;
- no Cart, screenshot regeneration, fixture replay, repair, or mutation.

Accepted run checksums:

- run 1: `51a2529988b61fef9285e8ac1c3b1278928287229bd1c5344a0e8efaf19437bc`;
- run 2: `f1e2e24b461111ce504ea7a0f0bcb8bd75cb6e2745b29aa02bae3ea789f4df29`.

The accepted live evidence recorded two provider requests, zero retries, `106,739` total tokens (`96,394` input and `10,345` output), and `131,681 ms` combined latency. An earlier child session exited before producing an accepted-run or provider-failure artifact; it may have initiated one unaccepted provider request. Cost reporting therefore distinguishes two evidenced accepted paid calls from one possible abandoned paid attempt. No accepted call was repeated.

The final report was recomputed from the two saved accepted runs only, with zero additional API calls:

- report ID: `observation-stabilization-report-a4b2cf5ab6d0100f0ffa`;
- report checksum: `276d38c73181a394cf78af25228d3ea8e62d7b08e52850247a7bd1b64f074ca7`;
- live evidence checksum: `541ece86d34ecfe17910561ee9405d5999c7dc2dcdebd89c39d7fb85d45a14c1`.

| Metric | D2.7 live | Required | Result |
| --- | ---: | ---: | --- |
| Observation agreement | 0.9250 | >= 0.7500 | Pass |
| Unsupported observation rate | 0.0750 | <= 0.1000 | Pass |
| High-impact agreement | 1.0000 | >= 0.7500 | Pass |
| Primary dimension | 1.0000 | >= 0.8000 | Pass |
| Importance | 1.0000 | >= 0.8000 | Pass |
| Responsibility | 1.0000 | >= 0.8000 | Pass |
| Recommendation | 1.0000 | >= 0.8000 | Pass |
| Root/symptom | 1.0000 | >= 0.8000 | Pass |
| D1 contradictions | 0 | 0 | Pass |

Compared with D2.6 live evidence, observation agreement improved by `0.2583`, unsupported rate improved by a `0.2583` reduction, and high-impact agreement improved by `0.2000`. Classification agreement remained at `1.0000`.

## Remaining review-only observations

Three live observations appeared in only one of the two runs and remain non-authoritative review candidates:

1. Editorial mobile Homepage: `single_row_grouping` in the product row, run 2 only.
2. Current desktop Collection: visible footer identity word-wrap break, run 2 only.
3. Current desktop Homepage: visible footer identity word-wrap break, run 2 only.

No consensus is fabricated and none of these observations can trigger repair without explicit human authority.

## Reliability and next boundary

The D2.7 reliability status is `repair_planning_eligible`. Every published criterion passes, so `repair_planning_consumption_allowed` is `true` for a future bounded planner consuming human-reviewed findings.

This is not autonomous-repair approval. `human_review_required` remains `true` and `automatic_repair_allowed` remains `false`. Phase D3 has not started and still requires explicit approval.
