# Calinium Core 2.0 Phase D2.5 — Live Multimodal Calibration

## Purpose and status

Phase D2.5 adds a real multimodal provider path behind the existing Phase D2 subjective design-evaluation contract. It submits the exact approved Phase C PNG evidence to a pinned OpenAI Responses API model, validates structured output, measures three-run consistency, compares it with the approved human calibration, and requires a checksum-bound human review.

The provider implementation, mock-backed validation, three-run live calibration, and checksum-bound human review are complete. The original run 3 response was rejected by the all-dimensions semantic coverage gate; after harness hardening, the calibration resumed from the two checksum-validated accepted runs and obtained accepted run 3 with one additional paid request and no retry. Runs 1 and 2 were preserved without repeat API calls, the original failure artifact is retained, and fixture replay was not used as a live fallback. Human review finalized the Phase D2.5 gate as **repair_required**.

This remains evaluation-only. Automatic repair, automatic mutation, Shopify writes, architecture changes, storefront changes, and merchant-facing activation are prohibited.

## Provider and model contract

Configuration `openai-live-design-evaluation-gpt-5-6-sol-v1` declares:

- provider interface `storefront-design-provider-v1`;
- provider `calinium-openai-responses-multimodal@1.0.0` with kind `live_multimodal`;
- OpenAI Responses API;
- model `gpt-5.6-sol`;
- model configuration `gpt-5-6-sol-subjective-storefront-evaluator-v1`;
- medium reasoning effort;
- original-detail PNG inputs;
- strict JSON Schema structured output;
- three complete evaluation runs;
- provider-side response storage disabled;
- no fixture fallback.

The implementation uses Node's built-in HTTPS-capable `fetch` rather than adding an SDK dependency. The API key is read only from `OPENAI_API_KEY` and sent only in the authorization header. Optional OpenAI organization and project IDs may be supplied through `OPENAI_ORG_ID` and `OPENAI_PROJECT_ID`. Secret values are never written to configuration, output, logs, or errors.

## Exact visual evidence

Every live run verifies and sends all 16 approved full-page PNGs:

- Current Calinium and Editorial Discovery;
- Homepage, Collection, Product, and Cart;
- desktop at 1440×900 and mobile at 390×844;
- comparison fixture `comparison-fixture-0c881e4699c1cd3e33b0`;
- comparison key `d7413cc5957c06221d6426210f86ae7cfd081bc2e66d55dbdb98a13b12d417f6`.

Each data URL is created from the verified local PNG bytes after its SHA-256 matches the bound Render Result. A changed, missing, stale, out-of-scope, or unknown screenshot fails before the result can be accepted. Screenshot binaries remain runtime evidence under ignored output and are not tracked by this phase.

## Evaluation context

The model receives only bounded, trustworthy context:

- architecture profile identity, version, declared intent, and family selections;
- architecture selection revision for each capture;
- route identity and safe capture state;
- viewport identity and dimensions;
- exact render, screenshot, and D1 provenance identifiers;
- authoritative D1 findings;
- the available Essential preset revision;
- controlled catalog capability and content-constraint signals;
- availability status and revision identifiers for Design DNA, merchant intent, and Store Intelligence.

The controlled fixture has no approved Design DNA payload, only a merchant-intent revision reference, and no Store Intelligence payload. The provider must mark Design DNA coherence `not_assessable`; inferring unavailable Design DNA fails closed. Local paths, tokens, secrets, raw resource snapshots, benchmark theme evidence, unresolved merchant facts, Liquid, CSS, and source code are not supplied.

## Structured output and scope validation

The live model returns only `calinium-live-design-model-output` structured output. It contains concise summaries, dimension assessments, design findings, visible-evidence claims, and explicit acknowledgements of objective D1 facts. The server then creates canonical Phase D2 assessments, findings, and provider responses; the model cannot choose canonical IDs or screenshot hashes.

Semantic validation requires:

- all 12 policy dimensions;
- evidence coverage across all 16 screenshot cells;
- only bound profiles, routes, viewports, and cells;
- evidence contained within each finding's declared scope;
- canonical screenshot SHA-256 values injected by the server;
- known policy judgments, responsibilities, and recommendation categories;
- explicit acknowledgement of every authoritative D1 finding;
- no inference from unavailable Design DNA.

The request now includes a policy-derived `required_semantic_coverage` manifest listing all 12 dimensions, all 16 cell IDs, both profiles requiring independent assessment, and the required controlled architecture comparison. This makes completeness explicit to the model while retaining the same post-schema fail-closed validation; missing assessments are never synthesized locally.

Raw hidden reasoning is neither requested nor persisted. Only concise conclusions, rationale, evidence, confidence, and structured classifications are retained.

## D1 precedence

Phase D1 remains independently authoritative for objective geometry. In particular, Current mobile Homepage is bound to the existing `root_horizontal_overflow` finding: 390px viewport, 657px document, and 267px overflow. The live evaluator may describe its design impact but may not dispute or remeasure it. Missing, duplicated, or contradicted D1 acknowledgements fail the provider run.

The objective and subjective gates remain separate and are never merged into one score.

## Repeat consistency

A live calibration requires three complete model runs over the same 16 immutable PNGs and context. Consistency measures:

- dimension judgment, importance, and confidence;
- high-impact finding presence;
- responsibility classification;
- recommendation category.

Prose need not be identical. Disagreement is recorded as unstable evidence and remains human-review-required. The implementation does not claim byte determinism for subjective model output.

The accepted three-run ensemble records dimension categorical agreement `0.20`, high-impact finding agreement `0.4286`, responsibility agreement `0.1818`, recommendation agreement `0.1818`, and `58` unstable items. These low agreement values remain explicit unstable evidence and are not hidden by prose similarity or a combined score. The live evaluator is **not approved for autonomous repair planning** because repeat and classification consistency are insufficient.

## Human calibration comparison

The live result is structurally compared with the approved Phase D2 human calibration without treating that fixture as a live provider. Comparison reports:

- assessment and finding counts;
- judgment, importance, and confidence agreement;
- matched and missed human findings;
- unmatched live findings;
- responsibility and recommendation agreement;
- route and viewport agreement;
- scope similarity.

The human calibration is a reference, not a target design and not a substitute provider. Differences remain visible for review; they are not silently forced to match human wording or conclusions.

The accepted ensemble matched `15/22` approved-human assessments and `3/6` approved-human findings. The approved-human findings missed by the live evaluator remain calibration evidence only:

- duplicated Homepage newsletter surfaces;
- Editorial Collection title word-breaking;
- Editorial mobile-PDP convergence.

## Hallucination and evidence diagnostics

Mechanical safeguards reject invented profile, route, viewport, cell, checksum, policy category, or unavailable Design DNA context. Every finding carries a precise region and a concise claim about what is visibly present in the cited screenshot.

Whether a natural-language visible-evidence claim is genuinely supported by the pixels cannot be proven by schema validation. Therefore every claim and every unmatched live finding is explicitly marked for human visual verification. Reviewers must check for nonexistent elements, imagined content, unsupported merchant intent, incorrect region attribution, and confident claims unsupported by the screenshots.

## Human review and quality authority

A live model result is never authoritative on its own. Before review, the subjective gate remains `review_required`. A human review must decide every live finding and bind to the exact live evaluation ID and checksum. Stale review reuse fails closed.

Review finalization uses the existing Phase D2 review and quality-gate contracts. It may classify findings and produce an approved, approved-with-notes, repair-recommended, repair-required, or still-review-required gate. It never performs repair.

The completed evaluation is `design-evaluation-ed8fa37a5aa523c9ff86` with checksum `6b52362e1a1018695ab3864a0866ed9a34406b0eeb48ea2d607abe5e0837b90e`. Human review `design-review-bfc82d288460e1faa29c` binds that exact evaluation and has checksum `e4f420de93907ab473e9a1ff538cdc8dc3efac2e921ce6fc72f3888ba7eaceb9`.

The approved human decisions are:

- Current mobile Homepage overflow — `needs_fix`;
- empty Collection discovery sections — `needs_fix`;
- empty PDP comparison/FAQ sections — `needs_fix`;
- repetitive Product Highlights — `preference_only`;
- Editorial mobile-header crowding — `needs_fix`;
- desktop footer brand wrapping — `needs_fix`;
- separate product-row truncation finding — `false_positive` because the visible truncation is downstream evidence of the Homepage overflow, not an independent finding.

The final checksum-bound quality gate is `repair_required`. Human review is complete, automatic repair remains prohibited, and this phase performs no repair.

## Live operation evidence

- Live provider/model: `gpt-5.6-sol` through the OpenAI Responses API with actual screenshot input.
- Accepted repetitions: `3/3`.
- Screenshot coverage: all `16/16` approved Phase C cells in every accepted run.
- D1 contradiction checks: passed `3/3`; D1 objective findings remain authoritative.
- Resume behavior: accepted runs 1 and 2 were checksum-validated and reused without repeat API calls; one additional paid call obtained accepted run 3.
- Accepted-run usage total: `183,112` tokens.
- Accepted-run combined latency: `285,281 ms`.
- Fixture fallback: `false`.

## Resume, failure, and retry behavior

The client applies a five-minute per-request timeout and at most three attempts for rate limits, transient network errors, and supported provider 5xx responses. Retry delays are bounded. Authentication failure, rejected input, oversized input, refusal, incomplete response, malformed HTTP, malformed structured output, scope mismatch, unavailable-context inference, and D1 contradiction fail closed without semantic retry.

For a schema-valid response that fails only one of the four semantic-completeness gates—required dimensions, all screenshot cells, independent profile coverage, or the controlled comparison—the live run slot permits at most two semantic attempts total. The rejected response is not accepted and is not patched locally. Its response identity, structured-output checksum, usage, latency, and exact missing-coverage diagnostics are retained. A successful second attempt becomes the same run sequence with aggregate request, retry, latency, and token provenance. Exhaustion stops the calibration.

An incomplete calibration may resume only when the newly built request is byte-equivalent by canonical digest to the preserved request and the live configuration binding is unchanged. This binds screenshot hashes, D1 checksum, architecture provenance, comparison fixture/key, policy, context, provider, model, reasoning effort, image detail, and run count. Each accepted response is reconstructed, contract-validated, and checked against its stored canonical response checksum before reuse. Any mismatch fails closed. Final agreement and repeat metrics require exactly three accepted runs; rejected attempts are diagnostics only.

Merchant-facing failure text is generic and preserves evidence/project state. Internal result metadata may retain a safe failure code, HTTP status class, attempt count, and retry history. It never retains response bodies, API keys, authorization headers, stack traces, or local filesystem paths.

Successful runs retain provider/model/configuration revisions, Responses API response identity, response model, latency, attempts, retries, and token usage. The API does not return a billed currency amount, so no cost is invented; token usage is retained for operator-side calculation.

## Commands

Validate implementation without live credentials:

```bash
npm run test:storefront-live-design-evaluation
npm run validate:storefront-live-design-evaluation
```

Run a new three-repeat live evaluation once `OPENAI_API_KEY` is available:

```bash
npm run evaluate:storefront-design-live -- --replace
```

The approved recovery command used to resume the incomplete calibration without replacing accepted runs 1 and 2 was:

```bash
npm run evaluate:storefront-design-live -- \
  --resume output/storefront-design-evaluations/phase-d2-5-live-calibration/failure-report.json
```

That first run intentionally exits with a review-required status after writing immutable evaluation and calibration artifacts. After a human prepares a `design-human-review-v1` file bound to that exact result, finalize without calling the model again:

```bash
npm run evaluate:storefront-design-live -- \
  --replace \
  --evaluation output/storefront-design-evaluations/phase-d2-5-live-calibration/live-design-evaluation-result.json \
  --human-review path/to/live-human-review.json
```

Runtime outputs remain ignored evidence unless separately approved for tracking.

## Validation coverage

Mock-backed tests prove exact 16-PNG submission, explicit semantic coverage, model/configuration binding, strict structured parsing, three accepted repeats, semantic-only bounded retries, rejected-attempt diagnostics, provenance-bound two-run resume, accepted-run reuse without repeat calls, changed screenshot/policy rejection, rate-limit and timeout handling, authentication and D1 fail-closed behavior, malformed-response failure, screenshot tamper rejection, scope rejection, unavailable-context rejection, human-calibration comparison, exact-checksum human review, secret isolation, and the no-mutation/no-repair boundary.

Mocks validate the provider boundary; they do not count as live multimodal calibration.

## Limitations and Phase D3 boundary

- A single small controlled catalog cannot establish universal visual judgment quality.
- Full-page screenshots do not prove interaction, accessibility, or every responsive state.
- Model outputs may encode aesthetic bias and remain subject to human judgment.
- Missing Design DNA, full merchant intent, and Store Intelligence limit intent-coherence assessment.
- Natural-language evidence support requires human inspection.
- Provider token usage is recorded, but the API does not report a billed currency amount.
- Checksum-bound human review is complete, but the evaluator remains non-authoritative for autonomous repair planning because repeat and classification consistency are insufficient.

Phase D2.6 and Phase D3 have not started. Any repair or later-phase work requires separate approval; this phase does not edit the Current mobile Homepage overflow or any other storefront source.
