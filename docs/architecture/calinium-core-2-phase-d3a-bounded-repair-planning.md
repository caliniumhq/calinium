# Calinium Core 2.0 Phase D3A — Bounded Repair Planning

Phase D3A proves that one authoritative, checksum-bound, human-reviewed finding can become a minimal and reversible repair plan without changing the storefront. The plan remains `proposed`; human approval is mandatory, automatic repair is false, and D3B has not started.

## Authoritative target

- Design finding: `design-finding-f4d218150f4162a33544`
- Human review: `design-review-bfc82d288460e1faa29c`
- Human-review checksum: `e4f420de93907ab473e9a1ff538cdc8dc3efac2e921ce6fc72f3888ba7eaceb9`
- Decision: `needs_fix`
- Profile/route/viewport: `profile.current_calinium.v1` / Homepage / `mobile-v1` (`390 × 844`)
- D1 rule/severity: `root_horizontal_overflow` / `high`
- Before geometry: 390px viewport, 657px document, 267px overflow
- Render: `render-9cfd6df8592c4095bb16`
- Screenshot: `screenshots/profile.current_calinium.v1/homepage/mobile-v1--render-9cfd6df8592c4095bb16.png`
- Screenshot SHA-256: `578512decdd90eb4d7bd5f53e015b2ebb09b1a0d9e20ca18351065da275eae30`

The saved D1 run uses `visual-finding-fd438111aa5f9aa8d4f6`; the approved calibration consumed by D2–D2.7 uses `visual-finding-2093852270c8474f3079`. These IDs have different canonical request contexts but bind the same render, screenshot, rule, severity, architecture profile, route, viewport, and 390/657/267 geometry. The plan records both instead of hiding the lineage difference.

The separate product-row finding `design-finding-fdf6a3b6d99cb8c99f34` is not an independent target. Human review marked it `false_positive` only as a separate finding, while preserving its visible truncation as downstream evidence. D2.6 classification `design-classification-0705eb50abc43fe662f2` links it as `symptom_of` the root and sets `independent_repair_candidate` to false.

## Evidence binding

The repair plan rejects stale or mismatched evidence across:

- Phase C Render Result checksum `09a47bb1d0595b00b78e70f03ab8752402ec898acc9de17486bb6870d5bba276`
- D1 saved evaluation checksum `502e83881fcf3e32ebc4e8fa6ed1ff8351cbcc4e266e5a771cc2f0c481df3d64`
- D2 evaluation `design-evaluation-ed8fa37a5aa523c9ff86`, checksum `6b52362e1a1018695ab3864a0866ed9a34406b0eeb48ea2d607abe5e0837b90e`
- D2.6 root classification `design-classification-23fdc7db3cbe636bdbd8`
- D2.7 report `observation-stabilization-report-a4b2cf5ab6d0100f0ffa`, checksum `276d38c73181a394cf78af25228d3ea8e62d7b08e52850247a7bd1b64f074ca7`
- D2.7 evidence checksum `541ece86d34ecfe17910561ee9405d5999c7dc2dcdebd89c39d7fb85d45a14c1`
- D2.7 repeated root observations `concrete-visual-observation-d571a0d42b1d022e24e7` and `concrete-visual-observation-0f88730b154b463abd82`
- Architecture profile, selection revision, family registry, presenter evidence, and before-source checksums

D2.7 remains `repair_planning_eligible`, with `repair_planning_consumption_allowed=true`, `automatic_repair_allowed=false`, and mandatory human review.

## Root-cause analysis

The strong likely contributor is the Current Calinium featured-collection mobile swipe rule in `apps/theme/assets/calinium-sections.css`:

1. The approved capture stably reports a 657px document for a 390px viewport.
2. Its recorded offscreen descendants are featured-product images at approximately 320px and 640px inline offsets inside an intentional scroll context.
3. Homepage composition enables `mobile_swipe`; `featured-collection.liquid` emits the matching Current class.
4. The shared Current asset turns the list into a horizontal flex track, uses 78vw cards and negative page gutters, and relies on `overflow-x:auto` without the explicit 100% inline-size/layout containment used by Editorial Discovery.
5. The product-row truncation follows from the page-level containment failure.

Confidence is high that this is the owning contributor. The exact browser mechanism remains conditional on a minimal real-runtime, non-mutating diagnostic because an isolated local DOM using the same declarations correctly contained its scroll width. Before any D3B mutation, the same Shopify route and viewport must record computed width/min/max-inline-size, overflow, containment, margins, padding, bounds, client widths, and scroll widths for the featured-collection inner/content/grid and first three items. The first boundary contributing beyond 390px must be the Current mobile track or its immediate wrapper, and the active declaration must resolve to `calinium-sections.css`. Otherwise D3B stops without mutation and the plan must be revised and re-reviewed.

## Ownership and bounded intervention

- Responsibility: `architecture_level`
- Primary dimension: mobile adaptation quality
- Owning family: `family.responsive_behavior.current_calinium.v1`
- Source scope: shared Core asset with a Current-Calinium-specific selector
- Editorial Discovery: separate presenter/rules; it does not use the implicated selector
- Expected blast radius: Current featured collections with mobile swipe below 48rem

Only `apps/theme/assets/calinium-sections.css` may be modified in an approved D3B. The permitted change is a component-scoped zero-minimum/100%-maximum inline-size and layout containment boundary under the existing Current mobile-swipe media query. Local horizontal scrolling, 78vw product cards, snap behavior, desktop behavior, product links, and intended discovery must remain intact.

Global `html, body { overflow-x: hidden; }`, equivalent clipping, unrelated cleanup, and any second repair are forbidden.

## Acceptance and verification

The after target is a document/root width no greater than 390px plus at most 1px documented browser rounding tolerance, with no D1 `root_horizontal_overflow` finding. Success also requires the local product rail to remain functional and intentional. Clipping, crowding, broken layout, lost product visibility, damaged hierarchy, or any new objective finding fails the repair.

D3B verification must cover desktop/mobile Homepage, Collection, Product, and Cart for Current Calinium. All eight Editorial Discovery comparison cells are expected to remain byte-identical because the proposed selector is Current-specific. Required checks also include Theme Check, accessibility and D1 objective evaluation, navigation, product actions, responsive behavior, architecture provenance, Beta-critical generation, stabilized D2.7 evaluation, before/after comparison, and checksum-bound human review.

The required loop is:

`Apply approved bounded repair → materialize controlled artifact → Shopify real-runtime render → capture the same route/viewport → D1 → stabilized D2.7 → before/after comparison → human review`

## Rollback and safety

- Rollback checkpoint: `core-2-phase-d2-7-complete`
- Commit: `1000000000000000000000000000000000000009`
- Rollback boundary: only the future one-file repair commit; prior phase evidence and D3A planning infrastructure remain intact
- Repair-plan ID: `repair-plan-51818ae4d0b268572081`
- Repair-plan checksum: `347949a1448ce135f70ad2309f52fdeec29764fb84d00fa2f94df6b332320eea`
- State: `proposed`
- Mutation allowed: false
- Repair execution available: false
- Automatic repair: false
- D3B started: false
- API calls required: false

The plan’s forbidden scope explicitly includes Editorial Discovery, cart, typography redesign, section order, newsletter, empty-module suppression, footer wrapping, mobile header, Product Highlights, Design DNA, presets, architecture selection, merchant content, billing, deployment, and live publishing.
