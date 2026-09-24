'use strict';

const {
  applyResourceConfirmationEligibility,
  buildDecisionSet
} = require('../../../../pipeline/resource-confirmation-eligibility');
const { applyContentPlanEligibility } = require('../../../../pipeline/content-plan-eligibility');

function omissionAwareFlowReadySession(session, at = '2026-08-18T00:00:00.000Z', shop = 'controlled-beta.myshopify.com') {
  const originalStoreStrategy = session.store_strategy || {};
  const resourcePlan = applyResourceConfirmationEligibility({
    resourcePlan: {
      status: 'ready',
      fields: [],
      groups: [],
      required_assets: [],
      required_confirmations: [],
      blocker: null
    },
    storeStrategy: originalStoreStrategy,
    at
  }).resourcePlan;
  const resourceDecisions = buildDecisionSet({ eligibility: resourcePlan.confirmation_eligibility, at });
  const generationContext = {
    status: 'ready_for_generation',
    approval_reference: `merchant-resource-approval-${session.id}`,
    approved_at: at,
    merchant_references: {},
    shopify_resource_references: {},
    asset_references: {},
    completed_confirmations: [],
    resolved_empty_fields: [],
    resource_confirmation_decisions: resourceDecisions
  };
  const content = applyContentPlanEligibility({
    previousContentPlan: {},
    materializedContentPlan: {},
    originalStoreStrategy,
    resourcePlan,
    generationContext,
    presetRevisionId: session.preset_selection?.approved_revision_id || null,
    sourceRevision: 'unattested-local-source',
    at,
    scope: { project_id: session.project_id, session_project_id: session.project_id, shop, approved_shop: shop }
  });
  return {
    ...session,
    stage: 'offer',
    resource_plan: resourcePlan,
    generation_context: generationContext,
    content_plan: content.contentPlan,
    preset_selection: session.preset_selection || null,
    updated_at: session.updated_at || at
  };
}

module.exports = { omissionAwareFlowReadySession };
