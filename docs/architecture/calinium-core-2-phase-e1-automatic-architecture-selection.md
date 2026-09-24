# Calinium Core 2.0 — Phase E1 Automatic Architecture Selection

## Milestone boundary

Phase E1 adds a deterministic internal/beta selector for exactly two approved structural profiles:

- `profile.current_calinium.v1`
- `profile.editorial_discovery.v1`

The policy revision is `architecture-selection-policy-v1`; the automatic engine revision is `architecture-selection-v2`. Legacy generation remains on the Phase A `architecture-selection-v1` path and still defaults to Current Calinium unless `automatic_beta` is explicitly requested. An explicit invalid profile fails closed.

This milestone does not add a profile, repair class, merchant-facing control, question UI, paid model dependency, or live-theme mutation. Automatic repair remains disabled and human review remains mandatory.

## Existing infrastructure extended

Phase E1 extends the Phase A registry, compatibility solver, Store Intelligence and Merchant Intent contracts, frozen selection contract, pipeline ordering, and generation provenance. It does not replace those systems. The normal generation approval, paid input snapshot, generated-theme manifest, Theme Specification, and downloadable package metadata continue to carry the same architecture provenance object, now with optional versioned automatic-policy evidence.

## Trusted Store Intelligence

The current Shopify normalization can reliably project product, active-product, variant, available-variant, collection, menu, menu-link, product-media, usable-image, video, project-asset, market, theme, and unpublished-theme counts. Phase E1 deterministically derives:

| Signal | Derivation |
| --- | --- |
| `selection.catalog_scale` | active products, falling back to products: small 1–39, moderate 40–249, large 250+ |
| `selection.variant_complexity` | variants per product: simple ≤2, moderate ≤5, complex >5 |
| `selection.navigation_complexity` | maximum of link count and menu count ×10: minimal ≤20, moderate ≤60, complex >60 |
| `selection.media_richness` | product media per product: weak <0.75, adequate <2.5, strong ≥2.5 |
| `selection.collection_breadth` | collections: small ≤5, moderate ≤20, broad >20 |
| numeric evidence | average variants and product media per product |

Every direct and derived signal retains its value, confidence, source revision, normalization provenance, and derivation revision (`architecture-store-signal-derivation-v1`). Unknown data remains unknown and is excluded from scoring; it is not treated as negative.

Collection depth, menu depth, imagery consistency, description richness, pages/blogs/articles, promotional intensity, and option-level complexity are not reliably present in the current normalized intake and are therefore not invented or scored in E1.

## Merchant Intent

The existing `merchant-intent-v1` contract now admits only explicit, source-revision-bound architecture preferences on these internal paths:

- `storefront.shopping_mode`: image-led, information-led, or balanced
- `storefront.discovery_priority`: discovery, efficiency, or balanced
- `storefront.storytelling_emphasis`: high, low, or balanced
- `storefront.navigation_priority`: prominent, minimal, or balanced
- `storefront.product_density`: dense, restrained, or balanced
- `storefront.architecture_direction`: Current, Editorial, or no preference

Absent intent is unknown. Unsupported or conflicting trusted values fail closed. Phase E1 does not fabricate answers from generic brand language and does not expose these values in merchant UI.

## Profile fit definitions

Current Calinium is the conventional commerce architecture: a single-grid commerce header and disclosure navigation, uniform commerce card hierarchy, conventional faceted/paginated collection grid, and balanced media/purchase PDP. It fits broader or complex catalog exploration, utility/navigation prominence, denser discovery, and stores whose shopping path cannot depend on rich imagery.

Editorial Discovery is the image-led structural architecture: separate editorial masthead hierarchy, independent media-led cards, feature-first merchandising grid, and asymmetric media-led PDP. It fits stores able to support editorial rhythm, strong visual hierarchy, restrained catalog/navigation complexity, discovery, and storytelling.

Price, a generic “luxury” label, colors, typography, spacing, and presets never determine architecture.

## Eligibility and compatibility

Hard eligibility is evaluated before fit. A candidate must:

1. be one of the two policy-supported profiles;
2. be active in the architecture registry;
3. have every hard-required signal declared by its registered profile; and
4. pass the existing family/capability compatibility solver.

The current approved profiles declare no hard-required store-data signals, so both normally remain eligible. Weak imagery is intentionally a strong soft negative for Editorial, not an invented hard prohibition. A missing registered capability or incompatible family fails closed; if no profile is eligible, selection errors rather than falling back.

## Explainable soft fit

Each eligible candidate starts at 50 and is clamped to 0–100. The versioned policy applies explicit weights for catalog scale, variants per product, navigation complexity, media richness, collection breadth, and the six supported intent paths. Candidate records retain eligibility, compatibility, positive and negative evidence, signal path/value, source and derivation revisions, confidence, impact, weight, score, rank, and leading reason codes.

The largest store weights favor Current for large catalogs (+22), complex navigation (+18), complex variants (+15), and broad collections (+10); weak media favors Current (+8) and penalizes Editorial (−20). Strong media favors Editorial (+20). The largest intent weights are explicit compatible architecture direction (+40/−20), shopping mode (up to +25), discovery/efficiency (up to +18), storytelling (+16), and density/navigation preferences. The policy file is authoritative for every weight.

## Material ambiguity and fallback

Ambiguity is material only when both profiles remain eligible, their score margin is at most 10, a high-impact intent is unknown, and simulation proves one allowed answer can change the winner. Phase E1 returns at most one internal `material_question_required` result containing only topic, intent path, why it matters, affected profiles, and the decision to resolve. The sole approved topic is `shopping_mode`. No question is asked or rendered in this phase.

If the caller cannot consume a material question, the conservative Current profile may be frozen with reason `question_unavailable`. Current is also the deterministic tie-break/fallback for an exact tie after known intent or genuinely insufficient trusted signals. Fallback is never allowed for invalid explicit metadata or failed hard compatibility.

## Freeze, ordering, and traceability

Automatic selection validates Store Intelligence and Merchant Intent, evaluates both candidates, and then either stops with an unfrozen material-question result or freezes the selected profile. The frozen revision binds full Store Intelligence and Merchant Intent checksums and revisions, policy and evaluator revisions, candidate and compatibility results, selected family versions, structured explanation, confidence, ambiguity result, and observed signal paths.

The pipeline verifies those bindings before continuing. Selection occurs before preset application, Design DNA, and composition. Paid retries must consume the pinned selection revision; live Shopify changes cannot silently reselect. Presets and Design DNA may validate compatibility and change typography, color, spacing, visual tone, or motion, but cannot replace the selected structural families.

## Controlled proof

The deterministic fixture suite covers image-led, commerce-dense, mixed complex, weak-media, ambiguous, missing-intent, explicit-direction, and invalid-profile cases. Its controlled proof is:

- Merchant/Store A (`commerce_dense_store`) → `profile.current_calinium.v1`
- Merchant/Store B (`image_led_editorial_store`) → `profile.editorial_discovery.v1`
- Merchant/Store C (`ambiguous_store`) → `material_question_required` for `shopping_mode`

Controlled A and B generations traverse the normal generation path and retain identical frozen architecture provenance across generation approval, generated-theme manifest, Theme Specification, and read-only package metadata. Temporary proof artifacts are cleaned after testing.

## Safety state

- automatic-selection mode: internal/beta and opt-in
- legacy default: Current Calinium
- merchant UI activation: false
- live theme mutation: false
- automatic repair: false
- human repair review: required
- proven repair classes: frozen at responsive/layout and generated-content eligibility
- repair/QA findings: not architecture-selection inputs

The next phase may connect the existing conversation/question planner to the one-question outcome and write an explicit Merchant Intent revision. It must not change the scoring policy or expose architecture names/scores without separate approval.
