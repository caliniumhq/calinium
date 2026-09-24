# Calinium Core 2.0 Phase D3C-B — Content availability repair

Phase D3C-B is a bounded, human-authorized repair execution for `repair-plan-b1835a493b09b0bfb699` (checksum `61b13fb2be70ae89d92c7689876568772f8baee08ebee53672f1f6b81a7cd543`). It targets the checksum-bound `needs_fix` decision for `design-finding-d12d4c4a803a64d1a6fc` in review `design-review-bfc82d288460e1faa29c` (checksum `e4f420de93907ab473e9a1ff538cdc8dc3efac2e921ce6fc72f3888ba7eaceb9`). The rollback checkpoint is tag `core-2-phase-d3c-a-complete`, commit `2000000000000000000000000000000000000008`.

Automatic repair and automatic approval remain disabled. This execution does not publish or modify a live merchant theme and cannot be approved without checksum-bound human review.

## Bounded implementation

The production change is limited to:

- `ai/theme-generator/section-content-eligibility.js`
- `ai/theme-generator/generate-section-instances.js`

The eligibility decision runs after block and approved-resource materialization and before a newly generated section enters `template.sections`, `template.order`, or the authoritative generated-instance manifest. It is deterministic, side-effect free, and makes no network request.

The policy revision is `theme-section-content-eligibility-v1`.

- Product Comparison is eligible only when at least two ordered product blocks contain nonblank runtime product references, every configured reference matches a Shopify product binding in the approved resource snapshot, every matching binding is approval-eligible and available at that snapshot, and at least two references resolve.
- FAQ is eligible only when at least one ordered question block contains both a nonblank question and a nonblank answer.
- Ineligible newly generated Product instances are omitted before composition admission.
- Merchant-preserved instances, non-Product pages, and non-target sections are admitted unchanged.
- Eligible instances are admitted without rewriting settings, block content, or block order.

Deterministic omission warnings use:

- `theme-section-content-eligibility-v1:product-comparison:<instance>:omitted:comparison_insufficient_resolved_products`
- `theme-section-content-eligibility-v1:product-comparison:<instance>:omitted:comparison_unresolved_product_references`
- `theme-section-content-eligibility-v1:faq:<instance>:omitted:faq_no_complete_items`

## Controlled fixture evidence

Fixture revision `theme-generator-content-eligibility-fixture-v1` covers five Comparison cases, six FAQ cases, and four mixed cases. It proves zero, blank, incomplete, unresolved, positive, partial, and independent mixed eligibility behavior. Positive Comparison and FAQ instances remain admitted, and their configurations and ordering remain unchanged. Expected omissions are nonfatal and produce deterministic warnings.

The existing approved Product generation receives no eligible Product Comparison products and no complete FAQ item. Both `profile.current_calinium.v1` and `profile.editorial_discovery.v1` therefore omit `calinium_product_03_product_comparison` and `calinium_product_06_faq` through the same Shared-Core rule. Their generated `templates/product.json`, order arrays, and manifests contain neither target instance.

The controlled block-materialization catalog does not currently define a Product Comparison or FAQ semantic composition policy. A manually injected positive runtime package would not prove the approved generator path, so D3C-B does not fabricate one. Positive preservation is instead bound by the deterministic fixture, admission, schema, package, and Theme Check evidence. Both Liquid presenters and their Theme Editor schemas remain installed and unchanged.

## Runtime and regression evidence

The real Shopify development runtime completed eight Current captures under `render-request-819da889288cc32f9923` and eight Editorial captures under `render-request-4f39ddedc039935d3561`. All 16 captures passed with source preservation and temporary-workspace cleanup.

For Current and Editorial Product desktop/mobile, the empty Comparison and FAQ wrappers/headings are absent. Primary product media, purchase controls, architecture provenance, and remaining Product composition pass D1. Product page height decreases only through the expected omission.

The D1 after-state is 16/16 pass with zero findings and no high/blocker regression. Current mobile Homepage remains 390px wide with no `root_horizontal_overflow`, preserving the D3B repair.

Desktop Homepage, Collection, and Cart captures and both Cart mobile captures are byte-identical to the approved D3B/Phase C baselines. Four non-Product mobile PNGs (Homepage and Collection in both profiles) have equal dimensions and visually identical composition but are not byte-identical. Pixel diagnosis found only low-amplitude raster variation: maximum per-channel deltas of 19/255 or less, no geometry change, and no D1 finding. This is recorded as controlled renderer raster variance, not a baseline update or storefront regression.

The bounded Product-only D2.7 verification is `d3c-b-d2-7-verification-5f835fcfc3d72f22b008` with checksum `55345e7872a15d8effb4cbd947abfd446f600605c258cf9e20a9668de67183a1`. One `gpt-5.6-sol` Responses API request used Medium reasoning over exactly eight checksum-bound Product before/after screenshots. It completed without retry or fixture fallback in 49,618ms and used 33,235 input tokens, 1,443 output tokens, and 34,678 total tokens.

D2.7 observed empty Comparison and FAQ modules in all four before cells and neither condition in any after cell. Its bounded comparison reports that both unfinished surfaces disappeared, Product information flow is more coherent, no useful content was removed, no awkward spacing or transition degradation was created, neither architecture lost coherence, and the after state is visually non-regressive. It reports no new material visual regression. D1 remains authoritative, human review remains mandatory, and this assessment cannot authorize repair or approval.

## Validation and safety

Focused eligibility, generator, read-only packaging, six-preset, Core 2 architecture, storefront-render, D1, and D2.7 infrastructure checks pass. Theme Check inspects 133 source-theme files with no offenses. All six preset packages pass Theme Check twice, preserve source, and are semantically deterministic. Historical D3A bounded-plan validation remains valid at its bound checkpoint; when run directly on the current descendant it correctly rejects the already approved D3B CSS change as “changed since planning.” That historical assertion does not validate this D3C-B plan and is not altered.

No Liquid, CSS, storefront JavaScript, template baseline, Theme Editor schema, architecture, Design DNA, preset, merchant content, billing, deployment, Shopify configuration, merchant UI, or approval behavior is changed by D3C-B. Runtime evidence remains ignored under `output/` and must not be committed.

## Review state

The final repair execution and checksum-bound review packet are retained in ignored runtime evidence. Human review `repair-human-review-4ea98f7efb6c253ea2e1` (checksum `80af464451038593431dfac2cb5b1537143fb7f476fea198a71b27128353bfde`) explicitly approved the Product before/after result. Final state `repair-final-state-5153b6aa709268d54b4e` (checksum `acf111874b2806834a61b59082e90c897321a683dc3a1235583d42db130e7dd2`) is `human_approved`.

The checksum-bound completion evidence preserves:

- all eight Product before/after screenshot bindings passed;
- negative fixtures omit ineligible Product Comparison and FAQ modules;
- positive fixtures preserve eligible Product Comparison and FAQ modules unchanged;
- merchant-preserved instances remain untouched;
- Product Comparison and FAQ remain available and merchant-editable in the Theme Editor;
- Current and Editorial runtime capture matrices passed 8/8 each;
- D1 passed 16/16 with Current mobile Homepage remaining 390px wide and free of root horizontal overflow;
- the dedicated D2.7 Product comparison found no material repair-caused visual regression or useful-content loss;
- no Liquid or CSS presenter changed, and no live merchant theme was published or modified.

Automatic repair remains disabled: `automatic_repair_allowed = false`. Human review remains required. The two repair classes proven for beta are responsive/layout repair and generated content/composition eligibility repair; this checkpoint does not add or authorize another repair class.
