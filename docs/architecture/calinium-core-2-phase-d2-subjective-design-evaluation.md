# Calinium Core 2.0 Phase D2 — Subjective Design Evaluation

## Purpose

Phase D2 evaluates whether immutable Calinium render evidence appears coherent, intentional, polished, and appropriate to the reliable intent supplied with that evidence. It is an evaluation and human-review system. It cannot edit a theme, select a different architecture, authorize a repair, or write to Shopify.

The approved calibration covers the same controlled 16-cell matrix used by Phases C and D1: Current Calinium and Editorial Discovery, each rendered for Homepage, Collection, Product, and Cart at desktop and mobile viewports.

## D1 and D2 boundary

Phase D1 remains authoritative for measurable runtime and geometry facts. Phase D2 does not reclassify those facts as opinions. For example, D1 records Current mobile Homepage's 390px viewport, 657px document width, and 267px root overflow. D2 records only the visual consequence: the page appears cropped and off-canvas.

The gates remain separate:

- D1 answers whether deterministic objective checks passed.
- D2 answers whether structured visual judgments have been reviewed by a human.
- The combined summary reports both results without averaging them or producing a magic score.

## Versioned contracts

Phase D2 introduces:

- `design-evaluation-request-v1`
- `design-dimension-assessment-v1`
- `design-finding-v1`
- `design-provider-response-v1`
- `design-evaluation-result-v1`
- `design-human-review-v1`

The request binds exact Render Results, PNG paths and SHA-256 hashes, architecture profile/version/selection, route, viewport, D1 evaluation evidence, the approved comparison fixture/key, available context, and evaluation policy. Available context files are checksum-bound. Missing context is represented explicitly instead of inferred. Stale screenshot, D1, architecture, or available-context provenance fails closed.

## Design-quality dimensions

Policy `storefront-design-evaluation-policy-v1` defines exactly 12 dimensions:

1. visual hierarchy;
2. spacing and rhythm;
3. typographic hierarchy;
4. image and media dominance;
5. composition;
6. product discovery;
7. PDP communication;
8. navigation and header clarity;
9. mobile adaptation quality;
10. Design DNA coherence;
11. perceived polish;
12. architecture differentiation.

Assessments use bounded judgments (`strong`, `acceptable`, `concern`, or `not_assessable`), importance, confidence, evidence cells, concise rationale, and context basis. There is no overall numeric design score.

## Trusted evaluation context

The calibration supplies only context supported by the generation and capture provenance:

- exact PNG bytes and hashes for all 16 cells;
- Current and Editorial architecture profile intent, profile version, family selections, and selection revision;
- `Essential@1.0` preset provenance;
- controlled catalog signals for products, a collection, navigation, and usable product media;
- D1 evaluation identity, gate, and findings per cell;
- a merchant-intent revision reference where the manifest exposes it.

The fixture does not contain a resolvable approved Design DNA payload, Store Intelligence payload, or merchant-intent payload. These dimensions are explicitly `not_available` or `reference_only`; Design DNA coherence is therefore `not_assessable`. Benchmark theme screenshots and source, inferred merchant facts, and inferred Design DNA are prohibited inputs.

## Multimodal provider boundary

`storefront-design-provider-v1` is modular and identifies provider, provider version, provider kind, and model metadata. A live provider must be declared as `live_multimodal` and return the versioned structured response. Its implementation must consume the actual screenshot evidence, not infer quality from Liquid or CSS.

The repository does not currently configure a live multimodal model. Phase D2 calibration therefore uses `approved_fixture_replay`: human visual judgments made against the actual 16 PNGs are stored as a versioned provider fixture, and runtime evaluation verifies every PNG SHA-256 before returning them through the same provider contract. This gives CI reproducibility without claiming a live model ran or pretending that subjective output is byte-deterministic.

## Findings and responsibility

Every finding identifies its dimension, importance, confidence, concise diagnosis, profile/route/viewport scope, exact screenshot evidence, affected region, context relation, recommendation category, D1 relation, responsibility class, and human-review state. Allowed responsibility classes are architecture, design token, composition, merchant content, data quality, and uncertain.

Findings store conclusions and evidence only. They do not store chain-of-thought, raw scoring weights, or unrestricted model reasoning. Merchant content is never silently rewritten.

## Evaluation scopes

The contracts support:

- per-cell evaluation, such as Editorial Product mobile;
- desktop/mobile route-pair evaluation;
- architecture-level evaluation across Homepage, Collection, Product, and Cart;
- controlled Current-versus-Editorial comparison on identical fixture inputs.

Cart similarity is not treated as a differentiation defect: both profiles intentionally select `family.cart.current_calinium.v1`.

## Approved calibration observations

Current Calinium has a clear primary hierarchy, a conventional scan-friendly Collection grid, and a sound PDP purchase sequence. Its known D1 mobile Homepage overflow has high design impact. Empty supporting modules, adjacent Homepage newsletter surfaces, and a desktop footer brand wrap reduce polish.

Editorial Discovery has strong image-led hierarchy, featured-first product discovery, a materially different desktop PDP, and a contained mobile Homepage that reprioritizes media and discovery. Its desktop Collection title column breaks “Hydrogen” inside the word. It shares the empty-module, duplicate-newsletter, and footer concerns because those are present in common generated composition or presentation. Its mobile PDP remains sound but converges closely with Current, a low-importance and medium-confidence preference finding.

Desktop Homepage, Collection, and Product are materially differentiated through hierarchy, navigation, discovery, and PDP composition. Mobile Homepage and Collection remain distinct; mobile PDP differentiation is weaker. Screenshot hash inequality is never used as a substitute for this judgment.

## Repeat consistency

The same 16 captures are evaluated twice. Consistency compares categorical dimension assessment, presence of high-impact finding categories, and responsibility classification. Prose may vary. The approved calibration produced 1.0 agreement for all three measures and no unstable items.

A future live provider is not expected to produce byte-identical prose. Disagreement must be recorded. Any high-impact unstable finding remains review-required.

## Human review and quality gate

No D2 finding is authoritative before human review. The review must decide every finding and is bound to the exact evaluation ID and checksum. Reusing a review after evidence or results change fails closed.

Review decisions are `accepted`, `needs_fix`, `false_positive`, `preference_only`, `merchant_content_issue`, or `deferred`. The approved calibration review accepted five findings as needing a future repair and classified mobile PDP convergence as preference only.

The D2 gate can be `approved`, `approved_with_notes`, `repair_recommended`, `repair_required`, or `review_required`. It only classifies evidence; it cannot modify a storefront. Before review, the approved calibration is `review_required`. After review, it is `repair_required`. Automatic repair remains false in policy, request, result, review summary, and output summary.

## Failure and safety behavior

Provider failure or malformed output creates a safe failed result with a merchant-safe error and a review-required gate. It does not expose provider internals, mutate evidence, or change project state. Screenshot integrity is checked immediately before each provider call. No code in the subsystem can upload, publish, edit Liquid/CSS, alter an architecture selection, or write to Shopify.

## Limitations and bias risks

- The approved fixture is a small controlled catalog and cannot establish universal design quality.
- Missing approved Design DNA and unresolved merchant-intent payload limit intent-coherence judgments.
- Human visual judgment and future multimodal providers may carry aesthetic bias.
- Full-page screenshots do not prove every interactive state or accessibility outcome.
- Confidence records evidence strength; it is not merchant truth.
- Human review remains necessary even when repeat agreement is high.
- The calibration provider is a replayable approved evaluation, not evidence of live-model availability.

## Phase D3 boundary

Phase D3 may consume accepted findings to propose a separately reviewed repair plan. Phase D2 does not create production edits. The first narrow repair candidate is the already objective, high-impact Current mobile Homepage overflow. Any D3 work must change only after separate approval, recapture affected evidence, rerun D1 and D2, and preserve both quality gates independently.
