'use strict';

const path = require('path');
const { digest } = require('../architecture');
const { STATES } = require('../merchant-flow');
const {
  JOURNEY_SCHEMA,
  PROJECTION_SCHEMA,
  JOURNEY_VERSION,
  PROJECTION_VERSION,
  clone,
  contractError,
  assertSchema,
  canonicalContract,
  assertChecksum,
  normalizeProjectBinding,
  loadCapability
} = require('./contracts');
const {
  VISIBLE_STAGES,
  DIRECTION_OPTIONS,
  ACTION_COPY,
  SAFE_BUILDING_STATUS,
  FORBIDDEN_MERCHANT_TERMS
} = require('./copy-contract');
const { assertMerchantVisualBriefing } = require('./visual-briefing');

const FLOW_STAGE = Object.freeze({
  intake_ready: 'analyzing_store',
  store_intelligence_ready: 'analyzing_store',
  merchant_intent_ready: 'analyzing_store',
  architecture_selection_running: 'analyzing_store',
  awaiting_material_answer: 'analyzing_store',
  architecture_frozen: 'building_storefront',
  design_dna_ready: 'building_storefront',
  composition_ready: 'building_storefront',
  generation_running: 'building_storefront',
  artifact_ready: 'building_storefront',
  render_qa_running: 'building_storefront',
  qa_review_required: 'building_storefront',
  repair_review_required: 'building_storefront',
  preview_ready: 'review_preview',
  merchant_action_required: 'review_preview',
  completed: 'review_preview'
});

const LEGACY_STAGE = Object.freeze({
  landing: 'analyzing_store',
  conversation: 'analyzing_store',
  understanding: 'analyzing_store',
  blueprint: 'analyzing_store',
  strategy: 'analyzing_store',
  preset: 'analyzing_store',
  resources: 'analyzing_store',
  'content-plan': 'analyzing_store',
  offer: 'analyzing_store',
  generation: 'building_storefront',
  delivery: 'review_preview',
  preview: 'review_preview',
  finish: 'review_preview'
});

const FAILURE_STAGE = Object.freeze({
  store_intelligence_unavailable: 'analyzing_store',
  architecture_selection_failed: 'analyzing_store',
  unresolved_merchant_answer: 'analyzing_store',
  stale_provenance: 'analyzing_store',
  merchant_action_not_authorized: 'review_preview',
  authorization_required: 'review_preview',
  merchant_flow_live_theme_target_forbidden: 'review_preview',
  merchant_flow_shop_target_mismatch: 'review_preview'
});

const BUILD_ELIGIBILITY_KEYS = Object.freeze([
  'analysis_complete',
  'direction_resolved',
  'architecture_ready',
  'mandatory_fact_resolved',
  'project_shop_authority_valid',
  'resource_content_eligible',
  'commercial_boundary_known',
  'no_conflicting_active_flow'
]);

function action(kind, { available = true, idempotencyKey = null, backendContract = 'projection_only', blockers = [] } = {}) {
  return {
    action_id: kind,
    kind,
    label: ACTION_COPY[kind],
    available: Boolean(available),
    requires_explicit_action: true,
    idempotency_key: idempotencyKey,
    backend_contract: backendContract,
    blocker_codes: [...new Set(blockers)].sort()
  };
}

function buildPreviewAction({ project, briefing, eligibility = {}, commercial = {} }) {
  const blockers = BUILD_ELIGIBILITY_KEYS.filter((key) => eligibility[key] !== true);
  if (!['known', 'not_required'].includes(commercial.status)) blockers.push('commercial_boundary_known');
  const unique = [...new Set(blockers)].sort();
  const identity = {
    project_id: project.project_id,
    shop: project.shop,
    briefing_checksum: briefing.checksum,
    commercial_revision: commercial.revision || null
  };
  return action('build_preview', {
    available: unique.length === 0,
    idempotencyKey: `analysis-first-build-${digest(identity).slice(0, 20)}`,
    backendContract: 'existing_e3_e4_merchant_flow',
    blockers: unique
  });
}

function priorFlowState(flow) {
  if (flow?.previous_state && FLOW_STAGE[flow.previous_state]) return flow.previous_state;
  const latest = Array.isArray(flow?.history) ? flow.history.at(-1) : null;
  return latest?.from_state && FLOW_STAGE[latest.from_state] ? latest.from_state : null;
}

function visibleStageFor({ flow, session, briefing }) {
  if (flow?.state && !STATES.includes(flow.state)) throw contractError('analysis_first_flow_state_invalid', 'Journey projection received an unsupported merchant-flow state.');
  if (flow?.state === 'failed_retryable' || flow?.state === 'failed_terminal' || flow?.state === 'cancelled') {
    const prior = priorFlowState(flow);
    return prior ? FLOW_STAGE[prior] : FAILURE_STAGE[flow?.failure?.category] || 'building_storefront';
  }
  if (flow?.state && FLOW_STAGE[flow.state]) return FLOW_STAGE[flow.state];
  if (briefing.state === 'build_in_progress') return 'building_storefront';
  if (briefing.state === 'preview_ready') return 'review_preview';
  return LEGACY_STAGE[session?.stage] || 'analyzing_store';
}

function visibleStatusFor({ stage, flow, briefing, buildAction }) {
  if (flow?.state === 'failed_retryable') return { code: 'needs_attention', headline: 'Something needs attention', explanation: 'Your saved progress is safe. Try again when you are ready.', tone: 'attention', progress_state: 'action_required' };
  if (flow?.state === 'failed_terminal' || flow?.state === 'cancelled') return { code: 'needs_attention', headline: 'Something needs attention', explanation: 'Your saved progress is safe. Open Advanced or contact support to continue.', tone: 'attention', progress_state: 'blocked' };
  if (stage === 'analyzing_store') {
    if (briefing.state === 'direction_choice_required') return { code: 'direction_choice_required', headline: 'Choose the direction that fits your store', explanation: 'Choose the experience that best matches how customers should browse.', tone: 'attention', progress_state: 'action_required' };
    if (briefing.state === 'essential_detail_required') return { code: 'essential_detail_required', headline: 'One essential detail is needed', explanation: 'Calinium needs one detail it could not safely infer before continuing.', tone: 'attention', progress_state: 'action_required' };
    if (briefing.state === 'blocked' || briefing.state === 'superseded' || buildAction?.available === false && ['recommendation_ready', 'accepted'].includes(briefing.state)) return { code: 'needs_attention', headline: 'Something needs attention', explanation: 'Review the current store details before building your preview.', tone: 'attention', progress_state: 'blocked' };
    if (['recommendation_ready', 'accepted'].includes(briefing.state)) {
      const option = DIRECTION_OPTIONS[briefing.direction.selected_direction || briefing.direction.recommended_direction];
      return { code: 'recommendation_ready', headline: `We recommend a ${option.title.toLowerCase()} storefront for your store.`, explanation: 'Review the reasons or build your private preview when you are ready.', tone: 'ready', progress_state: 'action_required' };
    }
    return { code: 'analyzing', headline: 'Analyzing your store', explanation: 'Calinium is reviewing the store information already available.', tone: 'working', progress_state: 'working' };
  }
  if (stage === 'building_storefront') {
    const headline = SAFE_BUILDING_STATUS[flow?.state] || (flow?.state === 'failed_retryable' ? 'Resuming safely' : 'Building your storefront');
    return { code: flow?.state === 'qa_review_required' || flow?.state === 'repair_review_required' ? 'final_checks' : 'building', headline, explanation: 'Your current theme remains unchanged while Calinium prepares the private preview.', tone: 'working', progress_state: 'working' };
  }
  if (flow?.state === 'merchant_action_required') return { code: 'merchant_authorization_required', headline: 'Your approval is recorded', explanation: 'The exact theme action remains separate and requires your explicit authorization.', tone: 'attention', progress_state: 'action_required' };
  if (flow?.state === 'completed') return { code: 'completed', headline: 'Your approved action is complete', explanation: 'The completed action remains recorded separately from your preview.', tone: 'ready', progress_state: 'complete' };
  return { code: 'preview_ready', headline: 'Review your preview', explanation: 'Explore the generated storefront before deciding what to do next.', tone: 'ready', progress_state: 'complete' };
}

function actionsFor({ stage, flow, briefing, buildAction, capabilities = {}, themeAction = {}, previewReady = false }) {
  let required = null;
  const optional = [];
  if (flow?.state === 'failed_retryable') required = action('retry', { backendContract: 'existing_merchant_flow_resume' });
  else if (flow?.state === 'failed_terminal' || flow?.state === 'cancelled') optional.push(action('contact_support'));
  else if (stage === 'analyzing_store' && briefing.state === 'direction_choice_required') required = action('choose_direction', { backendContract: 'existing_e2_material_question' });
  else if (stage === 'analyzing_store' && briefing.state === 'essential_detail_required') required = action('provide_essential_detail', { backendContract: 'existing_conversation_question' });
  else if (stage === 'analyzing_store' && ['recommendation_ready', 'accepted'].includes(briefing.state)) required = buildAction;
  else if (stage === 'review_preview' && flow?.state !== 'completed' && previewReady) {
    required = action('approve_design', { available: capabilities.approve_design === true, backendContract: 'existing_preview_approval_boundary' });
    optional.push(action('request_changes', { available: capabilities.request_changes === true, backendContract: 'optional_refinement' }));
    optional.push(action('compare_current_store', { available: capabilities.compare_current_store === true, backendContract: 'authoritative_comparison_evidence' }));
    if (flow?.state === 'merchant_action_required' && themeAction.available === true) {
      required = null;
    }
  }
  if (capabilities.adjust_direction === true && ['recommendation_ready', 'accepted'].includes(briefing.state) && briefing.direction.options.length > 1) {
    optional.push({ ...action('choose_direction', { backendContract: 'existing_intent_update_before_freeze' }), action_id: 'adjust_direction', kind: 'adjust_direction', label: 'Adjust direction' });
  }
  if (briefing.reasons.length && ['recommendation_ready', 'accepted'].includes(briefing.state)) {
    optional.unshift({ ...action('open_advanced'), action_id: 'see_why', kind: 'see_why', label: 'See why', backend_contract: 'briefing_reason_disclosure' });
  }
  optional.push(action('open_advanced', { backendContract: 'existing_creative_director' }));
  return { required, optional };
}

function sourceBinding({ session, flow, briefing, commercial, preview, buildEligibility, capabilities, themeAction }) {
  const state = {
    session_stage: session?.stage || null,
    session_revision: session?.revision || session?.updated_at || null,
    flow_state: flow?.state || null,
    flow_sequence: Number.isInteger(flow?.sequence) ? flow.sequence : null,
    flow_checksum: flow?.flow_checksum || flow?.checksum || null,
    briefing_id: briefing.briefing_id,
    briefing_checksum: briefing.checksum,
    commercial: clone(commercial),
    preview: clone(preview),
    build_eligibility: clone(buildEligibility),
    capabilities: clone(capabilities),
    theme_action: clone(themeAction)
  };
  return {
    authority: 'existing_project_session_merchant_flow',
    session_stage: state.session_stage,
    session_revision: state.session_revision,
    flow_state: state.flow_state,
    flow_sequence: state.flow_sequence,
    flow_checksum: state.flow_checksum,
    briefing_id: state.briefing_id,
    briefing_checksum: state.briefing_checksum,
    source_state_checksum: digest(state)
  };
}

function createAnalysisFirstJourney({
  projectBinding,
  session = null,
  flow = null,
  briefing,
  buildEligibility = {},
  commercial = { status: 'unavailable', paid_generation_required: true, revision: null },
  preview = { ready: false },
  capabilities = {},
  themeAction = { available: false, authorized: false, completed: false },
  root = path.resolve(__dirname, '../..')
} = {}) {
  const project = normalizeProjectBinding(projectBinding);
  const visualBriefing = assertMerchantVisualBriefing(briefing, root);
  if (JSON.stringify(project) !== JSON.stringify(visualBriefing.project_binding)) throw contractError('analysis_first_project_binding_mismatch', 'Journey and visual briefing belong to different projects.');
  const capability = loadCapability(root);
  const stage = visibleStageFor({ flow, session, briefing: visualBriefing });
  const buildAction = buildPreviewAction({ project, briefing: visualBriefing, eligibility: buildEligibility, commercial });
  const status = visibleStatusFor({ stage, flow, briefing: visualBriefing, buildAction });
  const previewReady = flow?.state === 'preview_ready' || visualBriefing.state === 'preview_ready' || preview.ready === true;
  const actions = actionsFor({ stage, flow, briefing: visualBriefing, buildAction, capabilities, themeAction, previewReady });
  const source = sourceBinding({ session, flow, briefing: visualBriefing, commercial, preview, buildEligibility, capabilities, themeAction });
  const base = {
    schema_version: '1.0',
    contract_version: JOURNEY_VERSION,
    project_binding: project,
    capability_binding: {
      capability_revision: capability.capability_revision,
      enabled: capability.analysis_first_merchant_experience_enabled,
      activation_scope: capability.activation_scope
    },
    visible_stage: stage,
    visible_status: status,
    progress: { kind: status.progress_state === 'working' ? 'indeterminate' : status.progress_state, percent: null, time_remaining: null },
    required_action: actions.required,
    optional_actions: actions.optional,
    advanced_mode_available: true,
    chat_refinement_available: stage === 'review_preview' && capabilities.request_changes === true,
    direction_briefing_available: visualBriefing.state !== 'analyzing',
    preview_ready: previewReady,
    commercial_boundary_pending: commercial.status === 'pending',
    theme_action_authorized: themeAction.authorized === true,
    source_binding: source,
    safety: {
      independent_state_machine: false,
      automatic_generation_allowed: false,
      automatic_paid_action_allowed: false,
      automatic_theme_action_allowed: false,
      automatic_repair_allowed: false,
      live_theme_changes_require_separate_authorization: true,
      internal_error_copy_exposed: false
    }
  };
  const journey = canonicalContract(base);
  assertSchema(journey, JOURNEY_SCHEMA, 'analysis-first merchant journey', root);
  assertChecksum(journey, 'Analysis-first merchant journey');
  return journey;
}

function stageProgress(currentStage) {
  const currentIndex = VISIBLE_STAGES.findIndex((stage) => stage.id === currentStage);
  return VISIBLE_STAGES.map((stage, index) => ({
    id: stage.id,
    label: stage.label,
    status: index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming'
  }));
}

function safeAction(value) {
  return value ? { id: value.action_id, label: value.label, enabled: value.available } : null;
}

function merchantDirection(briefing) {
  if (briefing.direction.mode === 'none' && !briefing.essential_detail) return null;
  const directionId = briefing.direction.selected_direction || briefing.direction.recommended_direction;
  const selected = directionId ? DIRECTION_OPTIONS[directionId] : null;
  return {
    state: briefing.state,
    headline: briefing.state === 'direction_choice_required'
      ? 'Choose the storefront direction that feels right for your customers.'
      : selected ? `${selected.title} is the recommended direction.` : null,
    choice_required: briefing.state === 'direction_choice_required',
    selected_direction: selected ? { id: selected.direction_id, title: selected.title, description: selected.description } : null,
    options: briefing.direction.options.map((option) => ({ id: option.direction_id, title: option.title, description: option.description })),
    reasons: briefing.reasons.map((reason) => reason.copy),
    essential_detail: briefing.essential_detail ? { prompt: briefing.essential_detail.prompt } : null
  };
}

function assertMerchantProjectionSafe(value) {
  const serialized = JSON.stringify(value);
  for (const pattern of FORBIDDEN_MERCHANT_TERMS) {
    if (pattern.test(serialized)) throw contractError('analysis_first_merchant_projection_leak', `Merchant projection contains forbidden internal terminology matched by ${pattern}.`);
  }
  if (/\b[a-f0-9]{64}\b/i.test(serialized)) throw contractError('analysis_first_merchant_projection_checksum_leak', 'Merchant projection contains an internal checksum-like value.');
  return value;
}

function projectMerchantJourney(journey, briefing, root = path.resolve(__dirname, '../..')) {
  assertSchema(journey, JOURNEY_SCHEMA, 'analysis-first merchant journey', root);
  assertChecksum(journey, 'Analysis-first merchant journey');
  const visualBriefing = assertMerchantVisualBriefing(briefing, root);
  if (journey.source_binding.briefing_id !== visualBriefing.briefing_id || journey.source_binding.briefing_checksum !== visualBriefing.checksum) {
    throw contractError('analysis_first_projection_stale', 'Merchant projection does not bind the current visual briefing.');
  }
  const stage = VISIBLE_STAGES.find((item) => item.id === journey.visible_stage);
  const projection = {
    schema_version: '1.0',
    contract_version: PROJECTION_VERSION,
    stages: stageProgress(journey.visible_stage),
    current_stage: { id: stage.id, label: stage.label },
    status: {
      tone: journey.visible_status.tone,
      headline: journey.visible_status.headline,
      explanation: journey.visible_status.explanation,
      progress: clone(journey.progress)
    },
    primary_action: safeAction(journey.required_action),
    secondary_actions: journey.optional_actions.map(safeAction),
    direction: merchantDirection(visualBriefing),
    advanced_mode_available: journey.advanced_mode_available,
    chat_refinement_available: journey.chat_refinement_available,
    preview_ready: journey.preview_ready,
    commercial_boundary_pending: journey.commercial_boundary_pending,
    theme_action_authorized: journey.theme_action_authorized,
    safety_reassurance: 'Your current theme will not change while you review this preview.'
  };
  assertSchema(projection, PROJECTION_SCHEMA, 'sanitized analysis-first merchant projection', root);
  return assertMerchantProjectionSafe(projection);
}

module.exports = {
  FLOW_STAGE,
  LEGACY_STAGE,
  BUILD_ELIGIBILITY_KEYS,
  buildPreviewAction,
  visibleStageFor,
  createAnalysisFirstJourney,
  projectMerchantJourney,
  assertMerchantProjectionSafe
};
