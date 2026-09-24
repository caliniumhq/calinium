# Calinium Core 2.0 Phase D3B — First human-approved repair

Phase D3B completes Calinium Core 2.0's first checksum-bound, human-approved bounded storefront repair. The repair removes unintended Current Calinium mobile Homepage root overflow while preserving the intended horizontally scrollable Featured Collection experience. Automatic repair remains disabled, no live merchant theme was published or modified, and no subsequent repair has started.

## Authority and final state

- Repair plan: `repair-plan-14559b4e96bcc7f1c602`
- Repair-plan checksum: `c10cf167b9b00dd3c7e4fc731273723ef2d2cc3155da8de12655a2625f7802d0`
- Plan approval: `repair-plan-approval-fa0bdfac9ef58cecb410`
- Repair execution: `repair-execution-ec47e02543cccc903fe6`
- Execution checksum: `3abdecab7964d1e986308f5304a94783cda05c176a2f384bacc5c422a8df4689`
- Human review: `repair-human-review-08cc6d9450ca3d8ddf8f`
- Human-review checksum: `fb505adc0beac29b8abf542266c0f63f2408cf894ea5dd4aca610eafa372cffe`
- Final state: `repair-final-state-493cfca8771566b437b3`
- Final status: `human_approved`

The checksum-bound human review accepted the repaired before/after result as visually acceptable and non-regressive. Runtime screenshots and JSON evidence remain ignored and are not committed.

## Exact bounded repair

- File: `apps/theme/assets/calinium-sections.css`
- Selector: `.co-featured-collection--mobile-swipe .co-featured-collection__grid`
- Change: add `position: relative;`

No other storefront source was modified. The declaration establishes the intended positioning context for absolutely positioned accessible price labels without globally clipping overflow or changing the local product rail.

## Objective and subjective result

Before repair, the 390px viewport had a 657px document and 267px root overflow. After repair, the viewport remains 390px, the document is 390px wide, and root overflow is 0px.

D1 confirms that `root_horizontal_overflow` is eliminated and the after-state finding count is zero. D2.7 found no material repair-caused visual regression, and the checksum-bound human before/after review approved the result.

## Regression and accessibility

- Current Calinium: 8/8 captures passed
- Editorial Discovery: 8/8 captures passed
- Full D1 matrix: 16/16 passed
- Editorial Discovery screenshots: byte-identical
- Screenshot changes: only Current Homepage mobile changed
- Hidden accessible price labels: preserved
- `.co-visually-hidden`: unchanged
- Product rail: 390px client width and 977px scroll width
- Cards: 78vw behavior preserved
- Scroll snapping: preserved
- Later products: reachable

Automatic repair and automatic approval remain disabled. No live merchant theme was published or modified.
