# Calinium Core 2.0 Phase D1 — Objective Visual Evaluation

## Purpose and boundary

Phase D1 adds a deterministic observation layer after the Phase B/C Shopify render and capture harness. It evaluates existing trusted Render Results and produces evidence-backed findings plus a human-reviewed quality gate. It does not select, modify, or repair an architecture.

The evaluator answers measurable questions about containment, clipping, collision, media, target size, route landmarks, product purchase controls, mobile navigation, architecture presenters, and fatal runtime/resource failures. It does not decide whether a storefront is beautiful, premium, luxurious, tasteful, or on-brand. It has no aesthetic score and makes no AI or multimodal call.

No Phase D1 action uploads, publishes, or modifies a Shopify theme. The development-theme capture boundary remains read-only with respect to merchant content and live themes.

## Versioned contracts

Phase D1 introduces four primary contracts and one capture observation contract:

- `visual-evaluation-request-v1` binds one passed Render Result to its generation/artifact revision, architecture selection, trusted architecture-runtime application revision, comparison fixture, route, viewport, screenshot, and evaluation policy.
- `visual-evaluation-result-v1` contains deterministic findings, severity counts, the automatic gate, annotation policy, and safe failure state.
- `visual-finding-v1` contains a stable identity, versioned rule, category, severity, route/viewport/profile, screenshot/render evidence, selector or landmark where safe, measured values, expected boundary, confidence, and reproducibility provenance.
- `visual-human-review-v1` binds an immutable human decision to the exact evaluation checksum and finding identities. Stale or cross-evaluation decisions fail validation.
- `storefront-objective-observation-v1` extends a Render Result with bounded DOM geometry, landmarks, media state, target-size candidates, PDP controls, and mobile-navigation exercise results. Historical Render Results without it remain evaluable through existing screenshot and runtime evidence, with an informational evidence-completeness finding.

The policy is `storefront-visual-evaluation-policy-v1`; the deterministic evaluator is `storefront-visual-evaluator-v1`. Contract objects carry canonical content-derived IDs.

## Objective finding taxonomy

The Phase D1 policy contains exactly these versioned rules:

1. `root_horizontal_overflow` — root document width materially exceeds viewport width.
2. `element_outside_viewport` — a significant visible element exceeds the viewport outside an intentional scroll/crop context.
3. `important_content_clipped` — important text or control content is clipped by a clipping overflow boundary.
4. `important_elements_collide` — important painted elements overlap materially outside an intentional layer.
5. `critical_media_broken` — visible critical image/video/model evidence is incomplete or broken.
6. `touch_target_size_risk` — a mobile control is below the WCAG 2.2 AA 24 CSS-pixel target-size boundary without an inline-text or sufficient-spacing exception.
7. `major_structure_exceeds_viewport` — a major structure materially contributes to failed viewport containment.
8. `important_landmark_missing` — a stable route landmark is absent or not visible.
9. `product_purchase_interaction_missing` — the PDP lacks a connected product form, cart-add form, or visible primary purchase control.
10. `navigation_interaction_failed` — mobile menu trigger/open state/panel visibility/close state/reachable focus does not complete safely.
11. `architecture_presenter_mismatch` — captured presenters do not match trusted generated-artifact architecture runtime provenance.
12. `fatal_runtime_or_resource_issue` — a non-allowlisted fatal browser, critical resource, or critical HTTP diagnostic exists.
13. `detailed_observation_unavailable` — an older Render Result lacks the optional detailed browser observation contract.

Rules are limited to 25 candidates per category. They never persist DOM dumps, merchant copy, credentials, sessions, access tokens, or private browser state.

## Severity model

- `blocker`: the page's essential route structure, PDP purchase interaction, architecture provenance, or runtime integrity is invalid.
- `high`: a material root/major containment failure, critical media failure, or mobile navigation integrity failure exists.
- `medium`: a localized offscreen, clipping, collision, or target-size risk passes the conservative evidence threshold.
- `low`: a valid objective issue with limited impact; no Phase D1 rule currently emits low by default.
- `info`: evidence completeness or other non-defect observation that does not fail the gate.

Severity comes from the versioned policy, never from aesthetic preference or a generated score.

## Evidence model

Findings use compact, machine-readable evidence:

- render and screenshot reference;
- route, viewport, and architecture profile;
- architecture selection and trusted runtime application revision;
- viewport and document dimensions;
- bounded element rectangles and overflow measurements;
- selector or landmark where safely stable;
- media completion and intrinsic dimensions;
- target dimensions and exception state;
- PDP form/control counts and connection state;
- mobile navigation disclosure/open/close/focus booleans;
- safe diagnostic category/message/status;
- Render Result checksum, rule version, and policy revision.

The optional annotation contract permits a future separately derived diagnostic image, but annotations are neither produced nor required in Phase D1. The authoritative Phase B/C screenshots are never modified.

## False-positive controls

The evaluator deliberately prefers fewer high-confidence findings:

- children of horizontally scrollable tracks, carousels, sliders, marquees, drawers, and mobile navigation are excluded from offscreen findings;
- media extending beyond a clipped hero/banner/crop/mask/aspect container is treated as intentional containment;
- clipping requires a measured overflow delta plus a clipping overflow mode; font line-box differences under `overflow: visible` are not defects;
- line clamps, media crops, hero layers, visually hidden content, and drawer content are excluded where their component context shows intent;
- collision candidates must be visible, painted in the viewport, unrelated by ancestry, and exceed a 0.35 overlap ratio;
- fixed, sticky, absolute, overlay, dialog, localization, drawer, hero, media, badge, icon, pagination, and hotspot layers are excluded conservatively;
- mobile targets use the 24 CSS-pixel WCAG 2.2 AA minimum with inline-text, disabled-control, and non-overlapping spacing exceptions;
- optional or non-visible media does not become a critical-media finding;
- known Shopify development-runtime diagnostics are narrowly allowlisted by recognizable origin-trial, Shop Pay preview-frame, sandboxed service-worker, and analytics-preview signatures;
- route identity uses stable landmarks and presenter evidence rather than merchant text.

Early calibration exposed noisy line-box clipping and hidden localization-control collision candidates. Those were corrected in the observation policy—not marked as accepted defects—before approving the calibration. No storefront code or screenshot baseline changed.

## Human review and quality gate

Human review decisions are `accepted`, `accepted_with_known_issue`, `needs_fix`, `false_positive`, or `deferred`. A review binds to the evaluation checksum, individual finding IDs, reviewer reference, revision, timestamp, and optional notes. A different evaluation, changed finding, or stale checksum is rejected.

The gate has three statuses:

- `pass`: no unresolved blocker/high/medium/low finding exists.
- `pass_with_review`: material evidence was explicitly accepted as a known issue, or a low finding received the applicable review.
- `fail_review_required`: a blocker/high/medium finding is unreviewed, needs a fix, or is deferred.

`automatic_repair_allowed` is always `false`. A finding or review cannot modify architecture, presenters, screenshots, generated packages, Shopify, or merchant approvals.

## Determinism and provenance

The same Render Result, policy revision, route, viewport, architecture selection, and trusted architecture runtime produces the same evaluation request ID, finding IDs, categories, severities, measured values, result ID, and automatic quality gate. Repeated synthetic and stored-evidence evaluation is compared structurally.

Two complete approved 34-file evaluation trees were also byte-identical. Each produced tree SHA-256 `60be5049c8708cb441e89998051d0de1234698a7b90709385e6b959d54847a8f`.

Architecture consistency is bound to the source generation manifest's `architecture_runtime.application_revision_id`. Captured presenter families and successful selector assertions must agree with that trusted runtime plan. Registry evidence alone is not accepted as the full provenance boundary.

## Approved 16-cell calibration

The calibration uses:

- comparison fixture `comparison-fixture-0c881e4699c1cd3e33b0`;
- comparison key `d7413cc5957c06221d6426210f86ae7cfd081bc2e66d55dbdb98a13b12d417f6`;
- Current Calinium and Editorial Discovery;
- Homepage, Collection, Product, and Cart;
- 1440 × 900 desktop and 390 × 844 mobile;
- 16 total cells.

The approved screenshot hashes remain those recorded by Phase B/C. Current passed 8/8 unchanged, Editorial Discovery passed 8/8, the six primary architecture screenshots remained distinct, source `apps/theme` remained unchanged, and runtime workspaces were cleaned.

### Current Calinium results

| Route | Desktop | Mobile |
| --- | --- | --- |
| Homepage | `pass`, no finding | `pass_with_review`: `root_horizontal_overflow` (high), 657px document at 390px viewport |
| Collection | `pass`, no finding | `pass`, no finding |
| Product | `pass`, no finding | `pass`, no finding |
| Cart | `pass`, no finding | `pass`, no finding |

The Current mobile Homepage finding measures 267 CSS pixels of overflow. It is the previously approved Phase B/C baseline observation and is persisted as `accepted_with_known_issue`. Phase D1 does not repair it or rewrite the baseline.

### Editorial Discovery results

| Route | Desktop | Mobile |
| --- | --- | --- |
| Homepage | `pass`, no finding | `pass`, no finding; 390px document at 390px viewport |
| Collection | `pass`, no finding | `pass`, no finding |
| Product | `pass`, no finding | `pass`, no finding |
| Cart | `pass`, no finding | `pass`, no finding |

Editorial Discovery does not receive the Current mobile Homepage root-overflow finding. No difference is manufactured: the result follows the measured document geometry.

The automatic matrix result is 15 `pass`, one `fail_review_required`. Applying the immutable approved-known-issue review produces 15 `pass`, one `pass_with_review`, and zero unresolved review failures.

## Commands and artifacts

Focused commands:

```bash
npm run test:storefront-visual-evaluation
npm run validate:storefront-visual-evaluation
npm run evaluate:storefront-visuals -- --replace --human-review fixtures/storefront-visual-human-review-current-mobile-homepage.json
```

The live calibration is reproduced with:

```bash
npm run capture:editorial-discovery-comparison -- --execute-development-render --replace
npm run evaluate:storefront-visuals -- --replace --human-review fixtures/storefront-visual-human-review-current-mobile-homepage.json
```

Screenshots, evaluation requests/results, and runtime summaries remain under ignored `output/`. Small tracked calibration metadata retains all 16 screenshot hashes, dimensions, render/evaluation identities, findings, policy versions, and the human review reference without committing screenshot binaries.

## Known limitations

- Phase D1 is deterministic rules-based observation, not a full accessibility audit, Lighthouse audit, visual-regression diff engine, or subjective review.
- Geometry heuristics intentionally trade recall for precision. Some localized defects require human inspection even when no rule fires.
- Target-size validation implements the WCAG 2.2 AA minimum and exceptions; it does not claim comprehensive keyboard or screen-reader conformance.
- Navigation exercise covers the registered mobile drawer only and does not crawl merchant links.
- PDP validation proves form/control presence and connection without mutating a cart or attempting checkout.
- Annotation output is contractual but not generated.
- Historical Render Results remain evaluable but cannot support detailed DOM rules unless recaptured; they receive an informational completeness finding.
- The Phase C Editorial product-card presenter coverage limitation remains outside Phase D1. Phase D1 verifies the trusted registered runtime/presenter evidence supplied for each captured route and does not expand architecture presenters.

## Phase D2 boundary

The exact recommended Phase D2 step is a separately approved, finding-driven repair phase for the known `profile.current_calinium.v1` mobile Homepage root horizontal overflow. Phase D2 should reproduce the `root_horizontal_overflow` finding, identify its contributing presenter/layout source, implement the smallest Current-only responsive correction, add a regression test, recapture the same approved comparison fixture, prove the Current mobile Homepage becomes 390px without regressing the other 15 cells or Editorial Discovery, and submit the new evidence for human review.

Phase D2 must not begin automatically. It requires explicit approval and must not introduce aesthetic scoring, a third architecture, automatic architecture selection, merchant UI, or live-theme mutation.
