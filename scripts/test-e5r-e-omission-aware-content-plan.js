'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const {
  POLICY_VERSION,
  EFFECTIVE_COMPOSITION_VERSION,
  MATERIALIZATION_REVISION,
  TARGET_ELIGIBILITY_STATES,
  applyContentPlanEligibility,
  contentPlanFlowEligibility,
  eligibilityIntegrity
} = require('../pipeline/content-plan-eligibility');
const {
  applyResourceConfirmationEligibility,
  buildDecisionSet,
  resourceEligibilityIntegrity
} = require('../pipeline/resource-confirmation-eligibility');
const { publicContentPlanProjection } = require('../apps/dashboard/server/dashboard-api.cjs');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/content-plan-eligibility.json'), 'utf8'));
const release = fixture.release_state;
const at = '2026-08-20T00:00:00.000Z';
const tests = [];

function clone(value) { return structuredClone(value); }
function test(id, fn) { tests.push({ id, fn }); }
function craftsmanshipTarget(result) {
  const target = result.eligibility.targets.find((item) => item.target_key === 'craftsmanship');
  assert(target, 'Craftsmanship target must exist.');
  return target;
}
function baseOptions(overrides = {}) {
  return {
    previousContentPlan: clone(release.stale_content_plan),
    materializedContentPlan: clone(release.stale_content_plan),
    originalStoreStrategy: clone(release.approved_preset.composition),
    resourcePlan: clone(release.resource_plan),
    generationContext: clone(release.generation_context),
    presetRevisionId: release.approved_preset.revision_id,
    sourceRevision: release.source_revision,
    at,
    scope: clone(release.scope),
    ...overrides
  };
}
function materialize(options = {}) { return applyContentPlanEligibility(baseOptions(options)); }
function selectedCraftStrategy() {
  return {
    homepage: { sections: ['craftsmanship'] },
    productPage: { sections: [] },
    collectionPage: { sections: [] },
    standardPage: { sections: [] }
  };
}
function noResourcePolicy() {
  const resourcePlan = applyResourceConfirmationEligibility({
    resourcePlan: { status: 'ready', fields: [], groups: [], required_assets: [], required_confirmations: [], blocker: null },
    storeStrategy: selectedCraftStrategy(),
    at
  }).resourcePlan;
  return {
    resourcePlan,
    generationContext: { resource_confirmation_decisions: buildDecisionSet({ eligibility: resourcePlan.confirmation_eligibility, at }) }
  };
}
function blockingPolicy(classification) {
  assert.equal(classification, 'critical_confirmation_required');
  const confirmationId = `review:verification:craftsmanship:${classification}`;
  const resourcePlan = applyResourceConfirmationEligibility({
    resourcePlan: { status: 'ready', fields: [], groups: [], required_assets: [], required_confirmations: [confirmationId], blocker: null },
    storeStrategy: selectedCraftStrategy(),
    at
  }).resourcePlan;
  assert.equal(resourcePlan.confirmation_eligibility.items[0].classification, classification);
  return {
    resourcePlan,
    generationContext: { resource_confirmation_decisions: buildDecisionSet({ eligibility: resourcePlan.confirmation_eligibility, at }) }
  };
}

test('A omitted module with no prior plan creates no actionable plan', () => {
  const result = materialize({ previousContentPlan: {}, materializedContentPlan: clone(release.stale_content_plan) });
  assert.equal(craftsmanshipTarget(result).eligibility_state, TARGET_ELIGIBILITY_STATES.NOT_REQUIRED_OMITTED_BY_POLICY);
  assert.equal(craftsmanshipTarget(result).actionable, false);
  assert.equal(result.contentPlan.craftsmanship.status, 'not_required');
  assert.equal(result.eligibility.summary.actionable_count, 0);
});

test('B omitted stale zero-step draft reconciles safely', () => {
  const result = materialize();
  assert.equal(result.contentPlan.craftsmanship.status, 'not_required');
  assert.equal(result.contentPlan.craftsmanship.candidate_version, 2);
  assert.equal(result.transitions.length, 1);
  assert.equal(result.transitions[0].old_state.status, 'draft');
  assert.equal(result.transitions[0].new_state.status, 'not_required');
  assert.equal(result.transitions[0].actor, 'system_policy');
  assert.equal(result.eligibility.reconciliation_history.length, 1);
});

test('C omitted module with merchant-authored content requires review', () => {
  const authored = clone(release.stale_content_plan);
  authored.craftsmanship.steps = [{ title: 'Merchant-authored step', body: 'Preserve this content.' }];
  const result = materialize({ previousContentPlan: authored, materializedContentPlan: authored });
  assert.equal(craftsmanshipTarget(result).eligibility_state, TARGET_ELIGIBILITY_STATES.UNRESOLVED_REVIEW_REQUIRED);
  assert.equal(craftsmanshipTarget(result).blocked, true);
  assert.equal(result.contentPlan.craftsmanship.steps.length, 1);
  assert.equal(result.transitions.length, 0);
  assert.equal(result.stage, 'content-plan');

  const approved = clone(release.stale_content_plan);
  approved.craftsmanship = {
    ...approved.craftsmanship,
    status: 'approved',
    steps: [{ title: 'Merchant-approved step', body: 'Preserve this approved content.' }]
  };
  const approvedResult = materialize({ previousContentPlan: approved, materializedContentPlan: approved });
  assert.equal(craftsmanshipTarget(approvedResult).eligibility_state, TARGET_ELIGIBILITY_STATES.UNRESOLVED_REVIEW_REQUIRED);
  assert.equal(craftsmanshipTarget(approvedResult).actor, 'merchant');
  assert.equal(approvedResult.contentPlan.craftsmanship.status, 'approved');
  assert.equal(approvedResult.transitions.length, 0);

  const appProvided = clone(release.stale_content_plan);
  appProvided.craftsmanship = {
    ...appProvided.craftsmanship,
    actor_type: 'app',
    steps: [{ title: 'App-provided step', body: 'Preserve this app content.' }]
  };
  const appResult = materialize({ previousContentPlan: {}, materializedContentPlan: appProvided });
  assert.equal(craftsmanshipTarget(appResult).eligibility_state, TARGET_ELIGIBILITY_STATES.UNRESOLVED_REVIEW_REQUIRED);
  assert.equal(craftsmanshipTarget(appResult).actor, 'system_policy');
  assert.equal(appResult.contentPlan.craftsmanship.steps.length, 1);
  assert.equal(appResult.transitions.length, 0);
});

test('D module not selected by effective composition is not required', () => {
  const policy = noResourcePolicy();
  const result = materialize({
    previousContentPlan: {}, materializedContentPlan: {},
    originalStoreStrategy: { homepage: { sections: ['hero'] } },
    ...policy
  });
  assert.equal(craftsmanshipTarget(result).eligibility_state, TARGET_ELIGIBILITY_STATES.NOT_REQUIRED_NOT_SELECTED);
  assert.equal(craftsmanshipTarget(result).actionable, false);
});

test('E eligible module with required work remains actionable', () => {
  const policy = noResourcePolicy();
  const draft = { craftsmanship: { status: 'draft', candidate_version: 1, steps: [], warnings: [] } };
  const result = materialize({ previousContentPlan: draft, materializedContentPlan: draft, originalStoreStrategy: selectedCraftStrategy(), ...policy });
  assert.equal(craftsmanshipTarget(result).eligibility_state, TARGET_ELIGIBILITY_STATES.ACTION_REQUIRED);
  assert.equal(result.eligibility.summary.actionable_count, 1);
  assert.equal(result.stage, 'content-plan');

  const unsupportedPlacement = materialize({
    previousContentPlan: draft,
    materializedContentPlan: draft,
    originalStoreStrategy: { homepage: { sections: [] }, standardPage: { sections: ['craftsmanship'] } },
    ...policy
  });
  assert.equal(craftsmanshipTarget(unsupportedPlacement).eligibility_state, TARGET_ELIGIBILITY_STATES.UNRESOLVED_REVIEW_REQUIRED);
  assert.equal(craftsmanshipTarget(unsupportedPlacement).reason, 'unsupported_effective_placement');
  assert.equal(unsupportedPlacement.eligibility.summary.actionable_count, 0);
  assert.equal(unsupportedPlacement.eligibility.summary.blocked_count, 1);
});

test('F eligible module with authoritative approved content is ready', () => {
  const policy = noResourcePolicy();
  const approved = {
    approved_revision_id: 'bpr_authoritative_fixture',
    approved_resource_snapshot_revision_id: 'brs_authoritative_fixture',
    craftsmanship: { status: 'approved', candidate_version: 2, steps: [{ title: 'Approved evidence' }], warnings: [] }
  };
  const result = materialize({ previousContentPlan: approved, materializedContentPlan: approved, originalStoreStrategy: selectedCraftStrategy(), ...policy });
  assert.equal(craftsmanshipTarget(result).eligibility_state, TARGET_ELIGIBILITY_STATES.READY_FROM_AUTHORITATIVE_CONTENT);
  assert.equal(result.eligibility.summary.actionable_count, 0);
  assert.equal(result.stage, 'offer');

  const unbound = { craftsmanship: approved.craftsmanship };
  const rejected = materialize({ previousContentPlan: unbound, materializedContentPlan: unbound, originalStoreStrategy: selectedCraftStrategy(), ...policy });
  assert.equal(craftsmanshipTarget(rejected).eligibility_state, TARGET_ELIGIBILITY_STATES.UNRESOLVED_REVIEW_REQUIRED);
  assert.equal(craftsmanshipTarget(rejected).reason, 'approved_content_provenance_missing');
  assert.equal(rejected.stage, 'content-plan');
});

test('G critical unresolved module blocks the stage', () => {
  const policy = blockingPolicy('critical_confirmation_required');
  const result = materialize({ previousContentPlan: {}, materializedContentPlan: {}, originalStoreStrategy: selectedCraftStrategy(), ...policy });
  assert.equal(craftsmanshipTarget(result).eligibility_state, TARGET_ELIGIBILITY_STATES.BLOCKED_CRITICAL_CONFIRMATION);
  assert.equal(craftsmanshipTarget(result).blocked, true);
  assert.equal(result.stage, 'content-plan');
});

test('H zero actionable and zero blockers resolves and advances', () => {
  const result = materialize();
  assert.equal(result.eligibility.summary.actionable_count, 0);
  assert.equal(result.eligibility.summary.blocked_count, 0);
  assert.equal(result.eligibility.stage_resolution.status, 'resolved');
  assert.match(result.eligibility.stage_resolution.reference, /^cpsr_[a-f0-9]{24}$/);
  assert.equal(result.stage, 'offer');
});

test('I zero actionable with a critical blocker never advances', () => {
  const policy = blockingPolicy('critical_confirmation_required');
  const approved = { craftsmanship: { status: 'approved', candidate_version: 2, steps: [{ title: 'Approved copy' }] } };
  const result = materialize({ previousContentPlan: approved, materializedContentPlan: approved, originalStoreStrategy: selectedCraftStrategy(), ...policy });
  assert.equal(result.eligibility.summary.actionable_count, 0);
  assert.equal(result.eligibility.summary.blocked_count, 1);
  assert.equal(result.eligibility.stage_resolution, null);
  assert.equal(result.stage, 'content-plan');
});

test('J reload and retry are idempotent', () => {
  const first = materialize();
  const second = materialize({
    previousContentPlan: first.contentPlan,
    materializedContentPlan: first.contentPlan,
    existingEligibility: first.eligibility,
    at: '2026-08-20T00:01:00.000Z'
  });
  assert.equal(second.transitions.length, 0);
  assert.equal(second.eligibility.revision_id, first.eligibility.revision_id);
  assert.equal(second.eligibility.reconciliation_history.length, 1);
  assert.equal(second.changed, false);

  const editedMaterialization = clone(first.contentPlan);
  editedMaterialization.lookbook = { status: 'not_required', candidate_version: 1, frames: [], warnings: [], updated_at: '2026-08-20T00:02:00.000Z' };
  const afterDifferentTargetEdit = materialize({
    previousContentPlan: first.contentPlan,
    materializedContentPlan: editedMaterialization,
    existingEligibility: first.eligibility,
    at: '2026-08-20T00:02:00.000Z'
  });
  assert.equal(afterDifferentTargetEdit.eligibility.reconciliation_history.length, 1);
  assert.equal(afterDifferentTargetEdit.eligibility.reconciliation_history[0].reconciliation_id, first.eligibility.reconciliation_history[0].reconciliation_id);
});

test('K concurrent reconciliation produces one deterministic authoritative transition', async () => {
  const [left, right] = await Promise.all([Promise.resolve().then(() => materialize()), Promise.resolve().then(() => materialize())]);
  assert.equal(left.eligibility.revision_id, right.eligibility.revision_id);
  assert.equal(left.eligibility.checksum, right.eligibility.checksum);
  assert.equal(left.eligibility.reconciliation_history[0].reconciliation_id, right.eligibility.reconciliation_history[0].reconciliation_id);
  const committedRetry = materialize({
    previousContentPlan: left.contentPlan,
    materializedContentPlan: left.contentPlan,
    existingEligibility: left.eligibility
  });
  assert.equal(committedRetry.eligibility.reconciliation_history.length, 1);
  assert.equal(committedRetry.transitions.length, 0);
});

test('L stale revision fails closed', () => {
  assert.throws(
    () => materialize({ scope: { ...release.scope, expected_session_revision: 'different-revision' } }),
    (error) => error?.code === 'content_plan_reconciliation_stale'
  );
  const result = materialize();
  assert.equal(contentPlanFlowEligibility(result.contentPlan, {
    resourcePlan: release.resource_plan,
    generationContext: release.generation_context,
    presetRevisionId: release.approved_preset.revision_id,
    sourceRevision: 'different-source-revision'
  }).eligible, false);
  const forgedResourcePlan = clone(release.resource_plan);
  forgedResourcePlan.confirmation_eligibility.items[0].policy_state = 'merchant_confirmed';
  assert.throws(
    () => materialize({ resourcePlan: forgedResourcePlan }),
    (error) => error?.code === 'resource_eligibility_item_invalid'
  );
});

test('M cross-shop reconciliation is rejected', () => {
  assert.throws(
    () => materialize({ scope: { ...release.scope, shop: 'different-shop.myshopify.com' } }),
    (error) => error?.code === 'content_plan_reconciliation_shop_mismatch'
  );
});

test('N Quick Start counts only canonical actionable targets', async () => {
  const result = materialize();
  const projection = publicContentPlanProjection(result.contentPlan);
  const moduleUrl = pathToFileURL(path.join(root, 'apps/dashboard/src/lib/quick-start-projection.js')).href;
  const { buildQuickStartProjection } = await import(moduleUrl);
  const quickStart = buildQuickStartProjection({
    project: { name: 'Controlled release-40 fixture' },
    session: { stage: 'content-plan', content_plan: result.contentPlan, content_plan_projection: projection, review: {}, resource_plan: {}, generation_context: {} }
  });
  assert.equal(quickStart.summary.contentPlansAwaitingReview, 0);
  assert.equal(quickStart.decisions.some((item) => item.id === 'content-review'), false);
});

test('O Advanced projection exposes omission as safe non-actionable state', () => {
  const result = materialize();
  const projection = publicContentPlanProjection(result.contentPlan);
  const craftsmanship = projection.targets.find((item) => item.content_key === 'craftsmanship');
  assert.deepEqual(craftsmanship, {
    content_key: 'craftsmanship',
    label: 'Craftsmanship',
    state: 'optional_not_included',
    available_in_direction: true,
    actionable: false,
    blocked: false
  });
  assert.equal(projection.resolved, true);
  assert.equal(JSON.stringify(projection).includes('checksum'), false);
  assert.equal(JSON.stringify(projection).includes(POLICY_VERSION), false);
});

async function main() {
  assert.equal(fixture.fixture_version, 'e5r-e-release-40-stale-content-plan-v1');
  assert.equal(release.deployment_release, 40);
  assert.equal(release.before.quick_start_actionable_count, 1);
  assert.equal(release.before.advanced_content_plan_action_count, 0);
  assert.equal(release.before.merchant_flow_eligible, false);
  assert.equal(resourceEligibilityIntegrity(
    release.resource_plan.confirmation_eligibility,
    release.generation_context.resource_confirmation_decisions
  ).valid, true);
  assert.deepEqual(release.expected_effective_strategy.homepage.sections, ['hero', 'featured-collection', 'newsletter']);
  const immutableInputs = JSON.stringify({
    approval: release.store_resources_approval,
    merchantIntent: release.merchant_intent,
    storeIntelligence: release.store_intelligence
  });
  const results = [];
  for (const entry of tests) {
    await entry.fn();
    results.push(entry.id);
  }
  const exact = materialize();
  assert.deepEqual(exact.effectiveStoreStrategy, release.expected_effective_strategy);
  assert.equal(craftsmanshipTarget(exact).eligibility_state, release.expected_after.craftsmanship_eligibility_state);
  assert.equal(exact.eligibility.summary.actionable_count, release.expected_after.actionable_count);
  assert.equal(exact.eligibility.summary.blocked_count, release.expected_after.blocked_count);
  assert.equal(exact.stage, release.expected_after.stage);
  assert.equal(eligibilityIntegrity(exact.eligibility, exact.contentPlan).valid, true);
  assert.equal(contentPlanFlowEligibility(exact.contentPlan, {
    resourcePlan: release.resource_plan,
    generationContext: release.generation_context,
    presetRevisionId: release.approved_preset.revision_id,
    sourceRevision: release.source_revision
  }).eligible, true);
  assert.equal(JSON.stringify({ approval: release.store_resources_approval, merchantIntent: release.merchant_intent, storeIntelligence: release.store_intelligence }), immutableInputs);
  assert.equal(POLICY_VERSION, 'content-plan-eligibility-v1');
  assert.equal(EFFECTIVE_COMPOSITION_VERSION, 'resource-resolved-effective-composition-v1');
  assert.equal(MATERIALIZATION_REVISION, 'content-plan-materialization-v1');
  console.log(JSON.stringify({
    status: 'passed',
    fixture: fixture.fixture_version,
    policy_version: POLICY_VERSION,
    effective_composition_version: EFFECTIVE_COMPOSITION_VERSION,
    materialization_revision: MATERIALIZATION_REVISION,
    controlled_release_40: {
      before: release.before,
      after: release.expected_after,
      flow_eligible: true
    },
    controlled_cases: results,
    api_model_calls: 0,
    shopify_theme_mutations: 0
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
