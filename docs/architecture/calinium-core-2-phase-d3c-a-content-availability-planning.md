# Calinium Core 2.0 Phase D3C-A — Content-Availability Repair Planning

Phase D3C-A establishes a bounded, human-gated repair candidate for the reviewed `needs_fix` finding “Empty PDP comparison/FAQ sections.” It does not execute a repair. No Liquid, CSS, storefront JavaScript, template source, architecture, Design DNA, preset, merchant content, or screenshot was changed.

## Authoritative boundary

- Finding: `design-finding-d12d4c4a803a64d1a6fc`
- Evaluation: `design-evaluation-ed8fa37a5aa523c9ff86`
- Evaluation checksum: `6b52362e1a1018695ab3864a0866ed9a34406b0eeb48ea2d607abe5e0837b90e`
- Human review: `design-review-bfc82d288460e1faa29c`
- Human-review checksum: `e4f420de93907ab473e9a1ff538cdc8dc3efac2e921ce6fc72f3888ba7eaceb9`
- Human decision: `needs_fix`
- Phase C fixture: `comparison-fixture-0c881e4699c1cd3e33b0`
- Phase C comparison key: `d7413cc5957c06221d6426210f86ae7cfd081bc2e66d55dbdb98a13b12d417f6`
- D2.7 report: `observation-stabilization-report-a4b2cf5ab6d0100f0ffa`
- D2.7 report checksum: `276d38c73181a394cf78af25228d3ea8e62d7b08e52850247a7bd1b64f074ca7`
- Reliability: `repair_planning_eligible`; repair-planning consumption is allowed; automatic repair remains false; human review remains mandatory.

The D2 contracts and checksums validate, the exact decision remains `needs_fix`, all four screenshot files exist with the bound checksums, and the four D1 Product evaluations report zero objective findings. D1 remains authoritative; the content-quality finding does not contradict it.

## Non-mutating runtime reproduction

The saved diagnostic `content-availability-diagnostic-16cc98d254a3afa01988`, checksum `63c04c074630be932805e5497379d0c3338f0585de2dc03372c1f6a837f41f7a`, inspected the controlled Shopify development runtime without capturing screenshots or publishing/modifying a live theme.

| Profile | Viewport | Compare Products | FAQ |
| --- | --- | --- | --- |
| Current Calinium | 1440×900 | Wrapper and heading visible; 0 cards; no table/rows | Wrapper and heading visible; 0 items/triggers/panels; no JSON-LD |
| Current Calinium | 390×844 | Wrapper and heading visible; 0 cards; no table/rows | Wrapper and heading visible; 0 items/triggers/panels; no JSON-LD |
| Editorial Discovery | 1440×900 | Wrapper and heading visible; 0 cards; no table/rows | Wrapper and heading visible; 0 items/triggers/panels; no JSON-LD |
| Editorial Discovery | 390×844 | Wrapper and heading visible; 0 cards; no table/rows | Wrapper and heading visible; 0 items/triggers/panels; no JSON-LD |

Neither module contains hidden descendants, editor block markers, app blocks, collapsed content, dynamically unavailable child content, or content below the captured boundary. Shopify design mode was false. The condition is a true visible empty shell, not a screenshot-boundary artifact.

## End-to-end trace

The controlled merchant fixture is `minimal-catalog`. It supplies the target product and catalog identity but no comparison product selections, comparison rows, FAQ questions, or FAQ answers. No Approved Block Plan is bound for these modules, and `config/theme-block-materialization-policy.json` has no `product-comparison` or `faq` policy.

The composition path is:

1. `config/page-blueprints.json` includes `product-comparison` and `faq` in every Product blueprint.
2. `config/strategy-section-mapping.json` calls both optional but provides no content-availability requirement.
3. `ai/draft-builder/resolve-sections.js` marks both valid and selects `schema_default_with_unconfigured_merchant_fields` as the fallback.
4. The Theme Specification carries Product layout direction but no Product section eligibility contract.
5. `ai/theme-generator/generate-section-instances.js` creates both sections because neither exists in the baseline Product template.
6. No target block policy populates blocks. Both output instances therefore have `block_ids: []` and generated block count 0.
7. Current and Editorial receive the same instances: `calinium_product_03_product_comparison` and `calinium_product_06_faq`.
8. The shared Liquid presenters suppress their meaningful child content but still emit the wrapper, spacing, and heading.

The preset manifest records FAQ as a `minimal_content_fallback` omission for preset composition, but Product blueprint materialization still creates the FAQ instance. That proves the existing content-awareness signal does not reach Product template generation.

## Independent root causes and predicates

Compare Products and FAQ have separate eligibility predicates but share one pipeline failure.

### Compare Products

The Product blueprint generates an optional zero-block `product-comparison` instance. The presenter counts product blocks whose Shopify product setting resolves nonblank and renders the product grid only when the count is at least two. It renders the feature table only when feature blocks exist. With zero blocks, the outer section and “Compare products” heading remain visible.

Deterministic generation predicate: configurationally eligible only when at least two ordered `product` blocks carry nonblank approved Shopify product references. D3C-B positive-runtime acceptance must additionally confirm that Shopify resolves at least two references to nonblank product objects. An unresolved reference is a verification failure, not permission for silent fallback. Feature blocks remain optional because the current implementation permits a meaningful two-product card grid without a feature table.

### FAQ

The Product blueprint generates an optional zero-block `faq` instance. The presenter considers an item visible only when the same `question` block has both a nonblank question and nonblank answer. With no complete item it suppresses the item list and FAQ structured data but still renders “Questions, answered.”

Deterministic predicate: eligible only when at least one ordered `question` block has both a nonblank `question` and nonblank `answer` after approved configuration materialization.

For both modules, merchant-content absence is a contributing input condition. The visible failure is `composition_level`: Calinium selected and materialized a module whose eligibility was known to be false. Current and Editorial use the same shared presenters and equal invalid Product configuration, so ownership is shared Core, not either architecture family.

## Correct intervention layer

The earliest reliable boundary is post-block-materialization Product template composition. Draft planning is too early because it lacks final blocks and resolved settings; Theme Specification is created after generation; Liquid-only suppression would preserve an invalid composition and risk reducing Theme Editor affordances; CSS cannot establish content validity.

The proposed helper evaluates only final, newly generated `product-comparison` and `faq` instances. When the relevant predicate is false, generation omits that instance before adding it to `template.sections`, `template.order`, or `generated_section_instances`, and emits a stable `ineligible_content_availability` warning. Non-target sections and baseline-preserved merchant sections pass through unchanged.

This preserves Theme Editor control: section schemas, presets, design-mode placeholders, and presenters remain unchanged; merchants can add an omitted section later; eligible configurations stay renderable and editable.

## Proposed bounded D3C-B allowlist

Production behavior may change only in:

- `ai/theme-generator/section-content-eligibility.js` (new pure helper)
- `ai/theme-generator/generate-section-instances.js` (post-materialization gate)

Verification and completion evidence may change only in:

- `fixtures/theme-generator-content-eligibility.json` (new positive/negative configurations)
- `scripts/test-theme-generator-content-eligibility.js` (new focused test)
- `scripts/validate-theme-generator.js` (register the new bounded components)
- `package.json` (one focused non-paid command)
- `docs/architecture/calinium-core-2-phase-d3c-b-content-availability-repair.md` (new completion record, only after execution and review)

Maximum future file count is seven. No Liquid, CSS, storefront JavaScript, source template JSON, architecture, Design DNA, preset, merchant content, generated copy, billing, deployment, or Shopify configuration is allowed. Unrelated repairs and refactors are forbidden.

## Required D3C-B proof

The negative fixture supplies no eligible target content. Both generated target instances and headings must be absent while the PDP purchase flow, recommendations, recently viewed content, app blocks, and architecture provenance remain intact.

The positive fixture supplies at least two nonblank approved comparison product references that resolve in Shopify and at least one complete FAQ pair. Both modules must remain in template order, render meaningful content in a real Shopify runtime, and remain merchant-editable. A partial fixture must prove the rules are independent: one product reference is insufficient for Compare; an incomplete pair is insufficient for FAQ; the eligible sibling module remains.

Because the repair would touch shared generation logic, D3C-B must run the focused tests plus the full approved 16-cell Current/Editorial desktop/mobile matrix, D1 16/16, Theme Check, architecture/render validation, and stabilized D2.7 before/after review. Final acceptance requires checksum-bound human review. No API/model call is authorized by this plan.

## Proposed plan

- Plan: `repair-plan-b1835a493b09b0bfb699`
- Checksum: `61b13fb2be70ae89d92c7689876568772f8baee08ebee53672f1f6b81a7cd543`
- Status: `proposed`
- Rollback checkpoint: `core-2-phase-d3b-first-repair-complete` / `1000000000000000000000000000000000000007`
- Human approval required: true
- Automatic repair allowed: false
- D3C-B started: false

The complete checksum-bound contract is `plans/core-2-phase-d3c-a-empty-pdp-content-availability.json`.
