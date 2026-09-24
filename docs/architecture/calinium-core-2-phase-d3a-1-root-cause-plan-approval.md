# Calinium Core 2.0 Phase D3A.1 root-cause plan approval

Phase D3A.1 replaces the rejected sizing hypothesis with a real-runtime causal diagnosis. It remains planning-only: no theme source changed, no repair ran, no provider call occurred, and automatic repair remains forbidden.

## Confirmed causal chain

At the approved 390 × 844 Current Homepage target, the third offscreen product card contains an absolutely positioned accessible current-price label. Every ancestor through the Current mobile-swipe grid is statically positioned, so `body` becomes the label's containing block. The label occupies 656.375–657.375px and the document becomes 657px wide.

Fresh-reload runtime tests changed root width from 657px to 390px when the exact label was hidden, when grid price labels were hidden, when the grid became a containing block with `position: relative`, or when layout containment was applied. Hiding the card image or visible price text, changing inline sizing, clipping overflow, or suppressing pseudo-elements did not change root width.

The approved intervention is therefore one declaration—`position: relative`—inside the existing Current mobile-swipe grid rule in `apps/theme/assets/calinium-sections.css`. It must preserve the accessible label, 78vw cards, local scrolling, snap behavior, negative gutters, links/actions, desktop behavior, and Editorial Discovery.

## Human approval and execution boundary

The tracked `approved-bounded-repair-plan-v1` binds the explicit human approval, D1 `needs_fix` evidence, D3A.1 isolation artifacts, immutable rejected plan, one-file allowlist, minimum intervention, 16-cell regression, stabilized D2.7 verification, and post-execution human review.

Status `approved_for_bounded_execution` authorizes a future explicitly started bounded D3B execution. It does not execute the repair, allow automatic repair, permit scope expansion, or waive final human review. If `position: relative` alone fails the objective gate, execution must stop.

The future D3B preflight must resolve `core-2-phase-d3a-1-complete` as its immediate checkpoint and retain `core-2-phase-d3a-complete` / `1000000000000000000000000000000000000003` as the approved baseline.
