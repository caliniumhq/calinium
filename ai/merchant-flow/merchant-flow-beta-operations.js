'use strict';

const crypto = require('crypto');
const { isTerminalD27RecoveryCandidate } = require('../design-evaluation/merchant-flow-d2-7-terminal-recovery');

const BETA_STATUS = Object.freeze({
  intake_ready: ['analyzing_store', 'Analyzing your store'],
  store_intelligence_ready: ['analyzing_store', 'Analyzing your store'],
  merchant_intent_ready: ['understanding_direction', 'Understanding your direction'],
  architecture_selection_running: ['understanding_direction', 'Understanding your direction'],
  awaiting_material_answer: ['action_needed', 'Action needed'],
  architecture_frozen: ['designing_storefront', 'Designing your storefront'],
  design_dna_ready: ['designing_storefront', 'Designing your storefront'],
  composition_ready: ['designing_storefront', 'Designing your storefront'],
  generation_running: ['building_theme', 'Building your theme'],
  artifact_ready: ['reviewing_result', 'Reviewing the result'],
  render_qa_running: ['reviewing_result', 'Reviewing the result'],
  qa_review_required: ['preparing_preview', 'Preparing preview'],
  repair_review_required: ['preparing_preview', 'Preparing preview'],
  preview_ready: ['ready_to_preview', 'Ready to preview'],
  merchant_action_required: ['action_needed', 'Action needed'],
  completed: ['ready_to_preview', 'Ready to preview'],
  failed_retryable: ['needs_attention', 'Something needs attention'],
  failed_terminal: ['needs_attention', 'Something needs attention'],
  cancelled: ['needs_attention', 'Preparation stopped']
});

const SAFE_FAILURES = Object.freeze({
  d2_7_provider_client_initialization_failed: ['The storefront review is temporarily unavailable.', false],
  store_intelligence_unavailable: ['Calinium could not finish learning from your store.', true],
  stale_provenance: ['This storefront changed. Reload the current status before continuing.', false],
  generation_failed: ['Calinium could not finish building the theme. Your approved inputs are saved.', true],
  artifact_failed: ['Calinium could not prepare the storefront package. Your approved inputs are saved.', true],
  shopify_render_failed: ['The private storefront preview could not be prepared.', true],
  qa_failed: ['The storefront review was interrupted.', true],
  d2_7_provider_configuration_failed: ['The storefront review is temporarily unavailable.', false],
  d2_7_provider_authentication_failed: ['The storefront review is temporarily unavailable.', false],
  d2_7_provider_access_failed: ['The storefront review is temporarily unavailable.', false],
  d2_7_provider_rate_limited: ['The storefront review was interrupted.', true],
  d2_7_provider_quota_failed: ['The storefront review is temporarily unavailable.', false],
  d2_7_provider_rate_or_quota_limited: ['The storefront review is temporarily unavailable.', false],
  d2_7_provider_timeout: ['The storefront review was interrupted.', true],
  d2_7_provider_network_failed: ['The storefront review was interrupted.', true],
  d2_7_provider_unavailable: ['The storefront review was interrupted.', true],
  d2_7_provider_rejected: ['The storefront review is temporarily unavailable.', false],
  d2_7_response_invalid: ['The storefront review is temporarily unavailable.', false],
  d2_7_schema_validation_failed: ['The storefront review is temporarily unavailable.', false],
  d2_7_semantic_validation_failed: ['The storefront review is temporarily unavailable.', false],
  d2_7_evaluation_failed: ['The storefront review is temporarily unavailable.', false],
  d2_7_unknown_provider_failure: ['The storefront review is temporarily unavailable.', false],
  review_required: ['Calinium is completing a required human review.', false],
  repair_declined: ['The proposed correction was not approved. Nothing else was changed.', false],
  repair_failed: ['The approved correction did not pass verification.', false],
  unresolved_merchant_answer: ['Choose the option that best matches how customers should shop.', true],
  authorization_required: ['Your authorization is required before continuing.', false],
  merchant_flow_live_theme_target_forbidden: ['Calinium rejected a live Shopify theme target. Nothing was changed.', false],
  merchant_flow_shop_target_mismatch: ['The private preview target does not belong to this storefront.', false],
  controlled_beta_target_verification_failed: ['The private preview target could not be verified safely. Nothing was changed.', false]
});

const LIVE_ROLES = new Set(['main', 'live', 'published', 'primary']);
const NON_LIVE_ROLES = new Set(['development', 'unpublished', 'demo', 'staging']);

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function betaStatusFor(flow) {
  const [code, label] = BETA_STATUS[flow?.state] || BETA_STATUS.failed_terminal;
  const failure = flow?.failure;
  const known = failure ? SAFE_FAILURES[failure.category] : null;
  return {
    code,
    label,
    message: known?.[0] || (failure ? 'Calinium stopped safely. Contact support with the flow ID if the issue continues.' : null),
    retry_available: Boolean(failure?.retryable && known?.[1] || isTerminalD27RecoveryCandidate(flow)),
    action_required: ['awaiting_material_answer', 'merchant_action_required'].includes(flow?.state),
    human_review_required: ['qa_review_required', 'repair_review_required'].includes(flow?.state)
  };
}

function safeOperationalDetails(details = {}) {
  const allowed = ['flow_id', 'project_id', 'organization_id', 'connection_id', 'order_id', 'generation_id', 'artifact_id', 'render_request_id', 'qa_id', 'job_id', 'job_kind', 'sequence', 'revision', 'status', 'failure_category', 'failure_stage', 'failure_id', 'error_code', 'http_status', 'retryable', 'operation_type', 'provider_http_status', 'provider_error_code', 'd2_7_request_id', 'retry_of', 'operation_id', 'resume_operation_id', 'trigger_kind', 'logical_attempt', 'lease_epoch', 'request_id', 'manifest_id', 'manifest_checksum', 'failure_evidence_id', 'failure_evidence_checksum', 'legacy_lineage_resolution_id', 'legacy_lineage_resolution_checksum', 'terminal_recovery_id', 'terminal_recovery_checksum', 'actor_user_id', 'evaluation_id', 'review_id', 'repair_plan_id', 'repair_execution_id', 'final_review_id', 'decision', 'reason_code'];
  return Object.fromEntries(allowed.filter((key) => details[key] !== undefined && details[key] !== null).map((key) => [key, String(details[key]).slice(0, 240)]));
}

function jobIdentity({ flowId, kind, orderId = null, generationId = null, artifactId = null, renderRequestId = null, qaId = null }) {
  if (!flowId || !['generation', 'render_qa'].includes(kind)) throw Object.assign(new Error('A supported flow job and flow identity are required.'), { code: 'merchant_flow_job_identity_invalid' });
  const binding = { flow_id: String(flowId), kind, order_id: orderId || null, generation_id: generationId || null, artifact_id: artifactId || null, render_request_id: renderRequestId || null, qa_id: qaId || null };
  return { job_id: `merchant-flow-job-${digest(binding).slice(0, 20)}`, identity_checksum: digest(binding), binding };
}

function assertNonLiveTarget(target, flow = null) {
  const role = String(target?.theme_role || '').toLowerCase();
  if (!target?.shop || !target?.theme_id || target?.is_live === true || LIVE_ROLES.has(role) || !NON_LIVE_ROLES.has(role)) throw Object.assign(new Error('Beta render and theme operations require an allowlisted non-live Shopify theme.'), { code: 'merchant_flow_live_theme_target_forbidden' });
  if (flow?.store_context?.shop && String(flow.store_context.shop).toLowerCase() !== String(target.shop).toLowerCase()) throw Object.assign(new Error('The Shopify target does not belong to this merchant flow.'), { code: 'merchant_flow_shop_target_mismatch' });
  return { shop: String(target.shop), theme_id: String(target.theme_id), theme_role: role, is_live: false };
}

function assertThemeActionSafety({ flow, target, explicitMerchantAction, paymentValid, ownershipValid, operationScope }) {
  if (!flow || !['preview_ready', 'merchant_action_required'].includes(flow.state)) throw Object.assign(new Error('The storefront must be ready to preview before a theme action can be considered.'), { code: 'merchant_flow_preview_not_ready' });
  if (flow.safety?.automatic_publish_allowed !== false || flow.safety?.live_theme_mutation_allowed !== false || flow.safety?.automatic_repair_allowed !== false) throw Object.assign(new Error('The merchant-flow safety boundary is invalid.'), { code: 'merchant_flow_safety_invalid' });
  if (explicitMerchantAction !== true) throw Object.assign(new Error('A separate explicit merchant action is required.'), { code: 'merchant_flow_merchant_authorization_required' });
  if (paymentValid !== true || ownershipValid !== true) throw Object.assign(new Error('Payment and ownership must be verified before a theme action.'), { code: 'merchant_flow_theme_action_authorization_invalid' });
  if (!['preview', 'download', 'approved_development_theme_operation'].includes(operationScope)) throw Object.assign(new Error('The requested theme operation is outside the beta allowlist.'), { code: 'merchant_flow_theme_operation_scope_forbidden' });
  return assertNonLiveTarget(target, flow);
}

module.exports = {
  BETA_STATUS,
  SAFE_FAILURES,
  betaStatusFor,
  safeOperationalDetails,
  jobIdentity,
  assertNonLiveTarget,
  assertThemeActionSafety
};
