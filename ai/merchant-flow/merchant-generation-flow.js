'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const {
  digest,
  assertStoreIntelligenceContract,
  assertMerchantIntent,
  assertFrozenArchitectureSelection,
  assertArchitectureSelectionInputBindings
} = require('../architecture');
const { assertQuestionRequest, assertMaterialAnswer } = require('../conversation/architecture-material-question');
const { assertMerchantFlowD27Failure } = require('../design-evaluation/merchant-flow-d2-7-failure');
const { assertMerchantFlowD27TerminalRecovery } = require('../design-evaluation/merchant-flow-d2-7-terminal-recovery');
const { assertControlledBetaD27LegacyLineageResolution } = require('../design-evaluation/merchant-flow-d2-7-legacy-lineage-resolution');
const { assertMerchantFlowPreviewBindingForFlow } = require('./merchant-flow-preview-binding');
const {
  assertRenderTargetSuccessionRecord,
  supersededEvidenceGraph
} = require('./merchant-flow-render-target-succession');

const LEGACY_FLOW_VERSION = 'merchant-generation-flow-v1';
const FLOW_VERSION = 'merchant-generation-flow-v2';
const FLOW_SCHEMA = 'schemas/calinium-merchant-generation-flow.schema.json';
const REPAIR_CLASSES = Object.freeze(['responsive_layout', 'generated_content_eligibility']);
const CANCELLATION_REASONS = Object.freeze(['operator_requested', 'support_abort', 'safety_abort']);
const STATES = Object.freeze([
  'intake_ready', 'store_intelligence_ready', 'merchant_intent_ready', 'architecture_selection_running',
  'awaiting_material_answer', 'architecture_frozen', 'design_dna_ready', 'composition_ready',
  'generation_running', 'artifact_ready', 'render_qa_running', 'qa_review_required',
  'repair_review_required', 'preview_ready', 'merchant_action_required', 'completed',
  'failed_retryable', 'failed_terminal', 'cancelled'
]);

const CANCELLABLE_STATES = Object.freeze([
  'intake_ready', 'store_intelligence_ready', 'merchant_intent_ready', 'architecture_selection_running',
  'awaiting_material_answer', 'architecture_frozen', 'design_dna_ready', 'composition_ready',
  'generation_running', 'artifact_ready', 'render_qa_running', 'qa_review_required',
  'repair_review_required', 'preview_ready', 'failed_retryable'
]);

const TRANSITIONS = Object.freeze({
  intake_ready: Object.freeze({ store_intelligence_bound: 'store_intelligence_ready', fail: 'failed_retryable', flow_cancelled: 'cancelled' }),
  store_intelligence_ready: Object.freeze({ merchant_intent_bound: 'merchant_intent_ready', fail: 'failed_retryable', flow_cancelled: 'cancelled' }),
  merchant_intent_ready: Object.freeze({ architecture_selection_started: 'architecture_selection_running', fail: 'failed_terminal', flow_cancelled: 'cancelled' }),
  architecture_selection_running: Object.freeze({ material_question_prepared: 'awaiting_material_answer', architecture_frozen: 'architecture_frozen', fail: 'failed_terminal', flow_cancelled: 'cancelled' }),
  awaiting_material_answer: Object.freeze({ material_answer_unresolved: 'awaiting_material_answer', architecture_frozen: 'architecture_frozen', fail: 'failed_terminal', flow_cancelled: 'cancelled' }),
  architecture_frozen: Object.freeze({ design_dna_bound: 'design_dna_ready', fail: 'failed_retryable', flow_cancelled: 'cancelled' }),
  design_dna_ready: Object.freeze({ composition_bound: 'composition_ready', fail: 'failed_retryable', flow_cancelled: 'cancelled' }),
  composition_ready: Object.freeze({ paid_identity_bound: 'composition_ready', generation_started: 'generation_running', fail: 'failed_retryable', flow_cancelled: 'cancelled' }),
  generation_running: Object.freeze({ generation_interrupted: 'generation_running', generation_resumed: 'generation_running', artifact_generated: 'artifact_ready', fail: 'failed_retryable', flow_cancelled: 'cancelled' }),
  artifact_ready: Object.freeze({ paid_identity_bound: 'artifact_ready', render_qa_started: 'render_qa_running', fail: 'failed_retryable', flow_cancelled: 'cancelled' }),
  render_qa_running: Object.freeze({ qa_passed: 'preview_ready', qa_review_required: 'qa_review_required', repair_review_required: 'repair_review_required', fail: 'failed_retryable', fail_terminal: 'failed_terminal', flow_cancelled: 'cancelled' }),
  qa_review_required: Object.freeze({ qa_review_accepted: 'preview_ready', repair_review_required: 'repair_review_required', fail: 'failed_retryable', flow_cancelled: 'cancelled' }),
  repair_review_required: Object.freeze({ repair_human_approved: 'preview_ready', repair_declined: 'failed_retryable', repair_failed: 'failed_retryable', flow_cancelled: 'cancelled' }),
  preview_ready: Object.freeze({ merchant_action_authorized: 'merchant_action_required', render_target_succession_applied: 'artifact_ready', flow_cancelled: 'cancelled' }),
  merchant_action_required: Object.freeze({ theme_operation_completed: 'completed', fail: 'failed_retryable' }),
  failed_retryable: Object.freeze({ resume_previous: 'failed_retryable', store_intelligence_recovered: 'store_intelligence_ready', generation_retried: 'generation_running', render_qa_retried: 'render_qa_running', flow_cancelled: 'cancelled' }),
  failed_terminal: Object.freeze({ terminal_d2_7_recovered: 'render_qa_running' }),
  completed: Object.freeze({}),
  cancelled: Object.freeze({})
});

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function withoutChecksum(flow) { const value = clone(flow); delete value.checksum; return value; }
function flowError(code, message) { const error = new Error(message); error.name = 'MerchantGenerationFlowError'; error.code = code; return error; }
function binding(value, revisionId = null) {
  const id = revisionId || value?.revision_id || value?.design_dna_id || value?.composition_id || value?.version;
  if (!id) throw flowError('merchant_flow_revision_required', 'A versioned revision is required for this merchant-flow stage.');
  return { revision_id: String(id), checksum: digest(value) };
}
function canonical(flow) { const base = withoutChecksum(flow); return { ...base, checksum: digest(base) }; }

function upgradeMerchantGenerationFlow(flow) {
  if (flow?.contract_version !== LEGACY_FLOW_VERSION) return flow;
  const value = clone(flow);
  if (value.checksum !== digest(withoutChecksum(value))) throw flowError('merchant_flow_checksum_mismatch', 'Merchant generation flow checksum is stale.');
  value.contract_version = FLOW_VERSION;
  value.operator_provenance = { qa_review: null, repair_resolution: null };
  value.cancellation = null;
  return canonical(value);
}

function assertMerchantGenerationFlow(flow, root = path.resolve(__dirname, '../..')) {
  const current = upgradeMerchantGenerationFlow(flow);
  const errors = createSchemaValidator(root).validateFile(current, FLOW_SCHEMA, 'merchant generation flow');
  if (errors.length) throw flowError('merchant_flow_contract_invalid', `Merchant generation flow validation failed: ${errors.join('; ')}`);
  if (current.checksum !== digest(withoutChecksum(current))) throw flowError('merchant_flow_checksum_mismatch', 'Merchant generation flow checksum is stale.');
  if (current.store_context_checksum !== digest(current.store_context) || current.store_context.project_id !== current.project_id || current.store_context.organization_id !== current.organization_id) throw flowError('merchant_flow_store_context_mismatch', 'Merchant generation flow store identity is stale or belongs to a different project.');
  if (current.history.at(-1)?.sequence !== current.sequence || current.history.at(-1)?.to_state !== current.state) throw flowError('merchant_flow_history_mismatch', 'Merchant generation flow history is not aligned with its current state.');
  if (current.context.store_intelligence) assertStoreIntelligenceContract(current.context.store_intelligence, root);
  if (current.context.merchant_intent) assertMerchantIntent(current.context.merchant_intent, root);
  if (current.context.question_request) assertQuestionRequest(current.context.question_request, root);
  if (current.context.answer) assertMaterialAnswer(current.context.answer, root);
  if (current.context.architecture_selection) {
    assertFrozenArchitectureSelection(current.context.architecture_selection, root);
    assertArchitectureSelectionInputBindings(current.context.architecture_selection, current.context.merchant_intent, current.context.store_intelligence);
  }
  const needsArchitecture = new Set(['architecture_frozen', 'design_dna_ready', 'composition_ready', 'generation_running', 'artifact_ready', 'render_qa_running', 'qa_review_required', 'repair_review_required', 'preview_ready', 'merchant_action_required', 'completed']);
  if (needsArchitecture.has(current.state) && !current.context.architecture_selection) throw flowError('merchant_flow_architecture_missing', 'This merchant-flow state requires a frozen architecture selection.');
  const needsDesign = new Set(['design_dna_ready', 'composition_ready', 'generation_running', 'artifact_ready', 'render_qa_running', 'qa_review_required', 'repair_review_required', 'preview_ready', 'merchant_action_required', 'completed']);
  if (needsDesign.has(current.state) && !current.design_dna) throw flowError('merchant_flow_design_dna_missing', 'This merchant-flow state requires a frozen Design DNA revision.');
  const needsComposition = new Set(['composition_ready', 'generation_running', 'artifact_ready', 'render_qa_running', 'qa_review_required', 'repair_review_required', 'preview_ready', 'merchant_action_required', 'completed']);
  if (needsComposition.has(current.state) && !current.composition) throw flowError('merchant_flow_composition_missing', 'This merchant-flow state requires a frozen composition revision.');
  if (current.artifact?.controlled_runtime_binding) {
    const bound = current.artifact.controlled_runtime_binding;
    const checksumBase = clone(bound); delete checksumBase.binding_checksum;
    if (bound.binding_checksum !== digest(checksumBase)
      || bound.project_id !== current.project_id || bound.organization_id !== current.organization_id
      || bound.connection_id !== current.store_context.connection_id
      || String(bound.shop_domain).toLowerCase() !== String(current.store_context.shop || '').toLowerCase()
      || bound.artifact_id !== current.artifact.artifact_id || bound.artifact_checksum !== current.artifact.checksum) {
      throw flowError('merchant_flow_controlled_runtime_binding_invalid', 'The controlled runtime binding does not match the flow and artifact provenance.');
    }
  }
  if (current.render_qa?.preview_binding) {
    assertMerchantFlowPreviewBindingForFlow(current.render_qa.preview_binding, {
      flow: current,
      requireAcceptedQa: false,
      root
    });
  }
  if (current.target_succession) {
    const succession = current.target_succession;
    if (succession.successor_binding_checksum !== current.artifact?.controlled_runtime_binding?.binding_checksum
      || succession.successor_target_theme_id !== current.artifact?.controlled_runtime_binding?.theme_id
      || succession.prior_target_theme_id === succession.successor_target_theme_id) {
      throw flowError('merchant_flow_render_target_succession_binding_invalid', 'The render-target succession pointer does not bind the active controlled target.');
    }
  }
  if (current.render_qa?.d2_7_failure) {
    const failure = assertMerchantFlowD27Failure(current.render_qa.d2_7_failure, root);
    const bound = failure.binding;
    if (bound.flow_id !== current.flow_id || bound.project_id !== current.project_id || bound.organization_id !== current.organization_id
      || bound.artifact_id !== current.artifact?.artifact_id || bound.artifact_checksum !== current.artifact?.checksum
      || bound.development_shop !== String(current.store_context?.shop || '').toLowerCase()
      || bound.render_checksum !== current.render_qa.render_checksum
      || JSON.stringify(bound.render_result_ids) !== JSON.stringify(current.render_qa.render_result_ids)
      || bound.d1_evidence_id !== current.render_qa.d1?.evidence_id
      || bound.d1_evidence_checksum !== current.render_qa.d1?.evidence_checksum
      || current.render_qa.d2_7?.evidence_id !== failure.failure_id
      || current.render_qa.d2_7?.evidence_checksum !== failure.checksum) {
      throw flowError('merchant_flow_d2_7_failure_binding_invalid', 'The D2.7 failure evidence does not bind the current flow, artifact, render, and D1 graph.');
    }
    const runtime = current.artifact?.controlled_runtime_binding;
    if (runtime && (bound.runtime_configuration_revision !== runtime.runtime_configuration_revision
      || bound.render_target_configuration_revision !== runtime.render_target_configuration_revision
      || bound.development_shop !== runtime.shop_domain || bound.development_theme_id !== runtime.theme_id)) {
      throw flowError('merchant_flow_d2_7_failure_runtime_binding_invalid', 'The D2.7 failure evidence does not bind the frozen controlled runtime target.');
    }
  }
  if (current.render_qa?.legacy_lineage_resolution) {
    const resolution = assertControlledBetaD27LegacyLineageResolution(current.render_qa.legacy_lineage_resolution, root);
    const historicalFailure = current.render_qa.d2_7_failure?.classification?.failure_class === 'historical_detail_unavailable';
    const selected = resolution.candidates.find((candidate) => candidate.candidate_id === resolution.selection.selected_candidate_id);
    if (!['authoritative_match', 'unique_legacy_match'].includes(resolution.status) || !selected
      || resolution.scope.flow_id !== current.flow_id
      || resolution.scope.project_id !== current.project_id
      || resolution.scope.organization_id !== current.organization_id
      || resolution.scope.artifact_id !== current.artifact?.artifact_id
      || resolution.scope.artifact_checksum !== current.artifact?.checksum
      || historicalFailure && (selected.render?.render_checksum !== current.render_qa.render_checksum
        || selected.d1?.evidence_id !== current.render_qa.d1?.evidence_id
        || selected.d1?.evidence_checksum !== current.render_qa.d1?.evidence_checksum
        || selected.d2_7_parent?.request_id !== current.render_qa.d2_7_failure?.request?.request_id
        || selected.d2_7_parent?.request_checksum !== current.render_qa.d2_7_failure?.request?.request_checksum)) {
      throw flowError('merchant_flow_d2_7_legacy_lineage_binding_invalid', 'The authoritative historical D2.7 lineage does not bind the retained flow evidence.');
    }
  }
  if (current.terminal_recovery) {
    const recovery = assertMerchantFlowD27TerminalRecovery(current.terminal_recovery, root);
    const failure = current.render_qa?.d2_7_failure;
    const transitionRecord = current.history.at(-1);
    if (current.state !== 'render_qa_running'
      || transitionRecord?.event !== 'terminal_d2_7_recovered'
      || transitionRecord?.from_state !== 'failed_terminal'
      || recovery.flow.flow_id !== current.flow_id
      || recovery.flow.project_id !== current.project_id
      || recovery.flow.organization_id !== current.organization_id
      || recovery.flow.expected_sequence !== current.sequence - 1
      || recovery.flow.artifact_id !== current.artifact?.artifact_id
      || recovery.flow.artifact_checksum !== current.artifact?.checksum
      || recovery.source.failure_id !== failure?.failure_id
      || recovery.source.failure_checksum !== failure?.checksum) {
      throw flowError('merchant_flow_d2_7_terminal_recovery_binding_invalid', 'The terminal D2.7 recovery does not bind the exact failed flow, artifact, and provider-attempt evidence.');
    }
  }
  if ((current.state === 'cancelled') !== Boolean(current.cancellation)) throw flowError('merchant_flow_cancellation_mismatch', 'Cancellation evidence must exist exactly when the flow is cancelled.');
  if (current.safety.automatic_repair_allowed !== false || current.safety.live_theme_mutation_allowed !== false || current.safety.automatic_publish_allowed !== false || JSON.stringify(current.safety.repair_classes) !== JSON.stringify(REPAIR_CLASSES)) throw flowError('merchant_flow_safety_invalid', 'Merchant generation flow violates its mutation or repair boundary.');
  return current;
}

function transition(flow, event, at, mutate = (value) => value, root) {
  const current = assertMerchantGenerationFlow(flow, root);
  const toState = TRANSITIONS[current.state]?.[event];
  if (!toState) throw flowError('merchant_flow_transition_invalid', `Event ${event} is not allowed from ${current.state}.`);
  const sequence = current.sequence + 1;
  const next = mutate(clone(current));
  delete next.checksum;
  next.state = toState;
  next.sequence = sequence;
  next.updated_at = at;
  next.history = [...current.history, { sequence, from_state: current.state, to_state: toState, event, at }];
  return assertMerchantGenerationFlow(canonical(next), root);
}

function createMerchantGenerationFlow({ projectId, organizationId, conversationRevision, storeContext = {}, paidGenerationRequired = true, createdAt = new Date().toISOString(), root = path.resolve(__dirname, '../..') } = {}) {
  if (!projectId || !organizationId || !conversationRevision) throw flowError('merchant_flow_identity_required', 'Project, organization, and conversation revisions are required.');
  const resolvedStoreContext = { project_id: String(projectId), organization_id: String(organizationId), connection_id: storeContext?.connection_id ? String(storeContext.connection_id) : null, shop: storeContext?.shop ? String(storeContext.shop) : null };
  const storeContextChecksum = digest(resolvedStoreContext);
  const identity = { project_id: String(projectId), organization_id: String(organizationId), conversation_revision: String(conversationRevision), store_context_checksum: storeContextChecksum, created_at: createdAt };
  const base = {
    schema_version: '1.0', contract_version: FLOW_VERSION,
    flow_id: `merchant-flow-${digest(identity).slice(0, 20)}`,
    project_id: identity.project_id, organization_id: identity.organization_id,
    conversation_revision: identity.conversation_revision, store_context: resolvedStoreContext, store_context_checksum: storeContextChecksum,
    state: 'intake_ready', sequence: 0, created_at: createdAt, updated_at: createdAt,
    commercial: { paid_generation_required: Boolean(paidGenerationRequired), duplicate_charge_allowed: false },
    context: { store_intelligence: null, merchant_intent: null, selection_outcome: null, question_request: null, answer: null, architecture_selection: null },
    design_dna: null, composition: null, paid_identity: null, generation: null, artifact: null, render_qa: null, repair: null,
    operator_provenance: { qa_review: null, repair_resolution: null }, cancellation: null,
    merchant_action: { authorized: false, authorized_at: null, operation_completed: false, operation_reference: null },
    failure: null,
    history: [{ sequence: 0, from_state: null, to_state: 'intake_ready', event: 'flow_created', at: createdAt }],
    safety: { automatic_repair_allowed: false, live_theme_mutation_allowed: false, automatic_publish_allowed: false, merchant_ui_redesign: false, maximum_material_questions: 1, repair_classes: [...REPAIR_CLASSES] }
  };
  return assertMerchantGenerationFlow(canonical(base), root);
}

function bindStoreIntelligence(flow, storeIntelligence, at, root) {
  const intelligence = assertStoreIntelligenceContract(storeIntelligence, root);
  return transition(flow, 'store_intelligence_bound', at, (next) => { next.context.store_intelligence = clone(intelligence); next.failure = null; return next; }, root);
}
function retryStoreIntelligence(flow, storeIntelligence, at, root) {
  if (flow.state !== 'failed_retryable' || flow.failure?.category !== 'store_intelligence_unavailable') throw flowError('merchant_flow_store_intelligence_retry_invalid', 'Store Intelligence recovery requires the matching retryable failure.');
  const intelligence = assertStoreIntelligenceContract(storeIntelligence, root);
  return transition(flow, 'store_intelligence_recovered', at, (next) => { next.context.store_intelligence = clone(intelligence); next.failure = null; return next; }, root);
}
function bindMerchantIntent(flow, merchantIntent, at, root) {
  const intent = assertMerchantIntent(merchantIntent, root);
  if (!flow.context.store_intelligence || intent.inferred_shopify_facts.some((fact) => fact.source_revision !== flow.context.store_intelligence.revision_id)) throw flowError('merchant_flow_intent_binding_invalid', 'Merchant Intent is not bound to the pinned Store Intelligence revision.');
  return transition(flow, 'merchant_intent_bound', at, (next) => { next.context.merchant_intent = clone(intent); next.failure = null; return next; }, root);
}
function startArchitectureSelection(flow, at, root) { return transition(flow, 'architecture_selection_started', at, (next) => { next.failure = null; return next; }, root); }
function pauseForMaterialAnswer(flow, outcome, questionRequest, at, root) {
  const question = assertQuestionRequest(questionRequest, root);
  if (outcome?.status !== 'material_question_required' || question.originating_selection.outcome_id !== outcome.outcome_id || question.originating_selection.store_intelligence_checksum !== digest(flow.context.store_intelligence) || question.originating_selection.merchant_intent_checksum !== digest(flow.context.merchant_intent)) throw flowError('merchant_flow_material_question_binding_invalid', 'Material question does not bind this architecture-selection cycle.');
  return transition(flow, 'material_question_prepared', at, (next) => { next.context.selection_outcome = clone(outcome); next.context.question_request = clone(question); next.failure = null; return next; }, root);
}
function recordUnresolvedMaterialAnswer(flow, reason, at, root) {
  return transition(flow, 'material_answer_unresolved', at, (next) => { next.failure = { category: 'unresolved_merchant_answer', retryable: true, message: String(reason || 'The merchant answer could not be normalized confidently.').slice(0, 1000) }; return next; }, root);
}
function freezeArchitecture(flow, architectureSelection, at, { answer = null, merchantIntent = null } = {}, root) {
  const selection = assertFrozenArchitectureSelection(architectureSelection, root);
  const intent = merchantIntent ? assertMerchantIntent(merchantIntent, root) : flow.context.merchant_intent;
  assertArchitectureSelectionInputBindings(selection, intent, flow.context.store_intelligence);
  if (answer) assertMaterialAnswer(answer, root);
  return transition(flow, 'architecture_frozen', at, (next) => {
    next.context.merchant_intent = clone(intent);
    next.context.answer = answer ? clone(answer) : next.context.answer;
    next.context.architecture_selection = clone(selection);
    next.failure = null;
    return next;
  }, root);
}
function bindDesignDna(flow, designDnaRevision, at, root) { return transition(flow, 'design_dna_bound', at, (next) => { next.design_dna = binding(designDnaRevision); next.failure = null; return next; }, root); }
function bindComposition(flow, compositionRevision, at, root) { return transition(flow, 'composition_bound', at, (next) => { next.composition = binding(compositionRevision); next.failure = null; return next; }, root); }
function bindPaidIdentity(flow, paidIdentity, at, root) {
  if (!paidIdentity?.order_id || !/^[a-f0-9]{64}$/.test(String(paidIdentity.purchase_intent_checksum || ''))) throw flowError('merchant_flow_paid_identity_invalid', 'A valid paid-generation identity is required.');
  if (flow.paid_identity) {
    if (flow.paid_identity.order_id !== paidIdentity.order_id || flow.paid_identity.purchase_intent_checksum !== paidIdentity.purchase_intent_checksum) throw flowError('merchant_flow_paid_identity_mismatch', 'A merchant flow cannot adopt a different paid-generation identity.');
    if (flow.paid_identity.snapshot_id && flow.paid_identity.snapshot_id !== paidIdentity.snapshot_id) throw flowError('merchant_flow_paid_identity_mismatch', 'A merchant flow cannot replace its immutable paid snapshot identity.');
    if (flow.paid_identity.snapshot_checksum && flow.paid_identity.snapshot_checksum !== paidIdentity.snapshot_checksum) throw flowError('merchant_flow_paid_identity_mismatch', 'A merchant flow cannot replace its immutable paid snapshot checksum.');
  }
  const resolved = flow.paid_identity ? { ...clone(flow.paid_identity), ...clone(paidIdentity), snapshot_id: paidIdentity.snapshot_id || flow.paid_identity.snapshot_id, snapshot_checksum: paidIdentity.snapshot_checksum || flow.paid_identity.snapshot_checksum } : clone(paidIdentity);
  return transition(flow, 'paid_identity_bound', at, (next) => { next.paid_identity = resolved; return next; }, root);
}
function startGeneration(flow, generationId, at, root) {
  if (flow.commercial.paid_generation_required && !flow.paid_identity) throw flowError('merchant_flow_paid_identity_required', 'Paid generation cannot start before its immutable paid identity is bound.');
  if (!generationId) throw flowError('merchant_flow_generation_identity_required', 'A stable generation identity is required.');
  return transition(flow, 'generation_started', at, (next) => { next.generation = { generation_id: String(generationId), status: 'running' }; next.failure = null; return next; }, root);
}
function markGenerationInterrupted(flow, at, root) { return transition(flow, 'generation_interrupted', at, (next) => { next.generation.status = 'interrupted'; return next; }, root); }
function resumeInterruptedGeneration(flow, at, root) {
  if (flow.state !== 'generation_running' || flow.generation?.status !== 'interrupted') throw flowError('merchant_flow_generation_resume_invalid', 'Only an interrupted active generation can be resumed.');
  return transition(flow, 'generation_resumed', at, (next) => { next.generation.status = 'running'; next.failure = null; return next; }, root);
}
function retryGeneration(flow, generationId, at, root) {
  if (flow.state !== 'failed_retryable' || flow.failure?.category !== 'generation_failed') throw flowError('merchant_flow_generation_retry_invalid', 'A generation retry requires a retryable generation failure.');
  if (!flow.paid_identity || !flow.context.architecture_selection || !flow.design_dna || !flow.composition) throw flowError('merchant_flow_generation_retry_invalid', 'A generation retry requires the pinned paid and generation prerequisites.');
  if (!generationId) throw flowError('merchant_flow_generation_identity_required', 'A stable generation retry identity is required.');
  return transition(flow, 'generation_retried', at, (next) => {
    next.generation = { generation_id: String(generationId), status: 'running' };
    next.artifact = null;
    next.render_qa = null;
    next.repair = null;
    next.failure = null;
    return next;
  }, root);
}
function bindArtifact(flow, artifact, at, root) {
  if (!artifact?.artifact_id || !artifact?.reference || !/^[a-f0-9]{64}$/.test(String(artifact.checksum || '')) || artifact.generation_id !== flow.generation?.generation_id) throw flowError('merchant_flow_artifact_binding_invalid', 'Generated artifact does not bind the active generation identity.');
  return transition(flow, 'artifact_generated', at, (next) => { next.generation.status = 'completed'; next.artifact = clone(artifact); next.failure = null; return next; }, root);
}
function startRenderQa(flow, at, root) { return transition(flow, 'render_qa_started', at, (next) => { next.failure = null; return next; }, root); }
function applyRenderTargetSuccession(flow, succession, at, root) {
  const current = assertMerchantGenerationFlow(flow, root);
  const authorized = assertRenderTargetSuccessionRecord(succession, root);
  const prior = authorized.prior_target.binding;
  const successor = authorized.successor_target.binding;
  const currentBinding = current.artifact?.controlled_runtime_binding;
  if (current.state !== 'preview_ready'
    || authorized.flow.flow_id !== current.flow_id
    || authorized.flow.expected_state !== current.state
    || authorized.flow.expected_sequence !== current.sequence
    || authorized.flow.expected_checksum !== current.checksum
    || authorized.scope.project_id !== current.project_id
    || authorized.scope.organization_id !== current.organization_id
    || authorized.scope.connection_id !== current.store_context?.connection_id
    || authorized.scope.canonical_shop !== String(current.store_context?.shop || '').toLowerCase()
    || authorized.artifact.artifact_id !== current.artifact?.artifact_id
    || authorized.artifact.artifact_checksum !== current.artifact?.checksum
    || authorized.artifact.generation_id !== current.generation?.generation_id
    || authorized.artifact.generation_id !== current.artifact?.generation_id
    || digest(prior) !== digest(currentBinding)) {
    throw flowError('merchant_flow_render_target_succession_stale', 'Render-target succession does not bind the exact current preview revision and artifact.');
  }
  if (digest(authorized.superseded_evidence) !== digest(supersededEvidenceGraph(current))) {
    throw flowError('merchant_flow_render_target_succession_evidence_stale', 'Render-target succession does not bind the evidence being superseded.');
  }
  const preserved = digest({
    context: current.context,
    design_dna: current.design_dna,
    composition: current.composition,
    paid_identity: current.paid_identity,
    generation: current.generation,
    artifact: {
      artifact_id: current.artifact.artifact_id,
      reference: current.artifact.reference,
      checksum: current.artifact.checksum,
      generation_id: current.artifact.generation_id
    }
  });
  const next = transition(current, 'render_target_succession_applied', at, (value) => {
    value.artifact.controlled_runtime_binding = clone(successor);
    value.target_succession = {
      succession_id: authorized.succession_id,
      succession_checksum: authorized.succession_checksum,
      prior_target_theme_id: prior.theme_id,
      successor_target_theme_id: successor.theme_id,
      successor_binding_checksum: successor.binding_checksum,
      successor_job_id: authorized.successor_job.job_id
    };
    value.render_qa = null;
    value.repair = null;
    value.operator_provenance = { qa_review: null, repair_resolution: null };
    delete value.terminal_recovery;
    value.merchant_action = { authorized: false, authorized_at: null, operation_completed: false, operation_reference: null };
    value.failure = null;
    return value;
  }, root);
  const after = digest({
    context: next.context,
    design_dna: next.design_dna,
    composition: next.composition,
    paid_identity: next.paid_identity,
    generation: next.generation,
    artifact: {
      artifact_id: next.artifact.artifact_id,
      reference: next.artifact.reference,
      checksum: next.artifact.checksum,
      generation_id: next.artifact.generation_id
    }
  });
  if (after !== preserved) throw flowError('merchant_flow_render_target_succession_lineage_changed', 'Render-target succession cannot change pinned merchant, generation, or artifact identities.');
  return next;
}
function retryRenderQa(flow, at, root, { recoveredRenderQa = null } = {}) {
  const d27Failure = String(flow.failure?.category || '').startsWith('d2_7_');
  const historicalRecovery = recoveredRenderQa?.d2_7_failure?.classification?.failure_class === 'historical_detail_unavailable'
    && recoveredRenderQa.status === 'failed'
    && ['authoritative_match', 'unique_legacy_match'].includes(recoveredRenderQa.legacy_lineage_resolution?.status)
    && flow.failure?.category === 'shopify_render_failed';
  if (flow.state !== 'failed_retryable' || flow.failure?.retryable !== true
    || (!['shopify_render_failed', 'qa_failed'].includes(flow.failure?.category) && !d27Failure)
    || !flow.artifact || recoveredRenderQa && !historicalRecovery) {
    throw flowError('merchant_flow_render_qa_retry_invalid', 'A render/QA retry requires retained artifact evidence and an explicitly retryable render or QA failure.');
  }
  return transition(flow, 'render_qa_retried', at, (next) => {
    // A D2.7-only retry retains the accepted render and D1 graph. The runtime
    // must revalidate every binding before it may consume this evidence.
    if (historicalRecovery) next.render_qa = clone(recoveredRenderQa);
    else if (!d27Failure || !next.render_qa?.d2_7_failure) next.render_qa = null;
    next.failure = null;
    return next;
  }, root);
}
function recoverTerminalD27(flow, recovery, at, root) {
  const authorized = assertMerchantFlowD27TerminalRecovery(recovery, root);
  if (flow.state !== 'failed_terminal'
    || flow.failure?.retryable !== false
    || authorized.flow.flow_id !== flow.flow_id
    || authorized.flow.expected_sequence !== flow.sequence
    || authorized.flow.expected_checksum !== flow.checksum
    || authorized.source.failure_id !== flow.render_qa?.d2_7_failure?.failure_id
    || authorized.source.failure_checksum !== flow.render_qa?.d2_7_failure?.checksum) {
    throw flowError('merchant_flow_d2_7_terminal_recovery_invalid', 'Terminal D2.7 recovery requires the exact checksum-bound terminal flow revision.');
  }
  return transition(flow, 'terminal_d2_7_recovered', at, (next) => {
    next.terminal_recovery = clone(authorized);
    next.failure = null;
    return next;
  }, root);
}
function requireReadyPreviewBinding(flow, renderQa, root, acceptedFlow = null) {
  if (!flow?.artifact?.controlled_runtime_binding) return null;
  return assertMerchantFlowPreviewBindingForFlow(renderQa?.preview_binding, {
    flow: { ...(acceptedFlow || flow), render_qa: renderQa },
    requireAcceptedQa: true,
    root
  });
}

function completeRenderQa(flow, renderQa, at, root) {
  if (!renderQa || !['passed', 'review_required', 'repair_required', 'failed'].includes(renderQa.status)) throw flowError('merchant_flow_render_qa_invalid', 'A valid render/QA result is required.');
  if (renderQa.status === 'passed') requireReadyPreviewBinding(flow, renderQa, root);
  const d27Failure = renderQa.d2_7_failure?.classification;
  const event = renderQa.status === 'passed'
    ? 'qa_passed'
    : ['review_required', 'repair_required'].includes(renderQa.status)
      ? 'qa_review_required'
      : d27Failure && d27Failure.retryable !== true
        ? 'fail_terminal'
        : 'fail';
  return transition(flow, event, at, (next) => {
    next.render_qa = clone(renderQa);
    delete next.terminal_recovery;
    next.failure = renderQa.status === 'failed'
      ? {
        category: d27Failure?.category || 'shopify_render_failed',
        retryable: d27Failure ? d27Failure.retryable === true : true,
        message: d27Failure
          ? 'The policy-required visual evaluation did not complete.'
          : 'Controlled Shopify render or QA did not complete successfully.'
      }
      : ['review_required', 'repair_required'].includes(renderQa.status)
        ? { category: 'review_required', retryable: false, message: 'Human QA review is required before preview or bounded repair classification.' }
        : null;
    return next;
  }, root);
}

function evidenceBinding(value, label) {
  if (!value?.id || !/^[a-f0-9]{64}$/.test(String(value.checksum || ''))) throw flowError('merchant_flow_operator_provenance_invalid', `${label} requires a checksum-bound evidence identity.`);
  return { id: String(value.id), checksum: String(value.checksum) };
}

function qaReviewProvenance(flow, review, at) {
  if (!review.provenance) return null;
  const provenance = review.provenance;
  if (!provenance.operation_id || !provenance.actor_user_id) throw flowError('merchant_flow_operator_provenance_invalid', 'QA review provenance requires an operation and actor identity.');
  const evaluation = evidenceBinding(provenance.evaluation, 'QA evaluation');
  const currentEvaluation = flow.render_qa?.d2_7?.status !== 'not_required' && flow.render_qa?.d2_7?.evidence_id ? flow.render_qa.d2_7 : flow.render_qa?.d1;
  if (!currentEvaluation?.evidence_id || evaluation.id !== currentEvaluation.evidence_id || evaluation.checksum !== currentEvaluation.evidence_checksum) throw flowError('merchant_flow_qa_evaluation_mismatch', 'QA review provenance does not bind the current render/QA evaluation.');
  return {
    operation_id: String(provenance.operation_id), actor_user_id: String(provenance.actor_user_id),
    evaluation, review: { id: String(review.review_id), checksum: String(review.checksum) },
    decision: review.decision, at
  };
}

function repairResolutionProvenance(resolution, at) {
  if (!resolution.provenance) return null;
  const provenance = resolution.provenance;
  if (!provenance.operation_id || !provenance.actor_user_id) throw flowError('merchant_flow_operator_provenance_invalid', 'Repair resolution provenance requires an operation and actor identity.');
  return {
    operation_id: String(provenance.operation_id), actor_user_id: String(provenance.actor_user_id),
    repair_plan: evidenceBinding(provenance.repair_plan, 'Repair plan'),
    plan_approval: evidenceBinding(provenance.plan_approval, 'Repair-plan approval'),
    repair_execution: evidenceBinding(provenance.repair_execution, 'Repair execution'),
    post_repair_qa: evidenceBinding(provenance.post_repair_qa, 'Post-repair QA'),
    final_human_review: evidenceBinding(provenance.final_human_review, 'Final human review'),
    final_state: evidenceBinding(provenance.final_state, 'Final repair state'),
    status: resolution.status, at
  };
}

function recordQaReview(flow, review, at, root) {
  if (!review?.review_id || !/^[a-f0-9]{64}$/.test(String(review.checksum || ''))) throw flowError('merchant_flow_qa_review_invalid', 'A checksum-bound human QA review is required.');
  const provenance = qaReviewProvenance(flow, review, at);
  if (review.decision === 'accepted') {
    if (flow.artifact?.controlled_runtime_binding) {
      const acceptedFlow = clone(flow);
      acceptedFlow.operator_provenance.qa_review = provenance;
      requireReadyPreviewBinding(flow, flow.render_qa, root, acceptedFlow);
    }
    return transition(flow, 'qa_review_accepted', at, (next) => { next.operator_provenance.qa_review = provenance; next.failure = null; return next; }, root);
  }
  if (review.decision !== 'needs_fix' || !REPAIR_CLASSES.includes(review.repair_class)) throw flowError('merchant_flow_qa_review_invalid', 'Human QA review must accept the result or select one proven repair class.');
  return transition(flow, 'repair_review_required', at, (next) => {
    next.repair = { repair_class: review.repair_class, status: 'review_required', evidence_id: review.review_id, evidence_checksum: review.checksum, human_approved: false, post_repair_qa_passed: false, automatic_execution: false };
    next.operator_provenance.qa_review = provenance;
    next.failure = { category: 'review_required', retryable: false, message: 'A bounded repair requires explicit human planning and execution approval.' };
    return next;
  }, root);
}
function recordRepairResolution(flow, resolution, at, root) {
  if (!REPAIR_CLASSES.includes(resolution?.repair_class) || resolution.repair_class !== flow.repair?.repair_class || !resolution.evidence_id || !/^[a-f0-9]{64}$/.test(String(resolution.evidence_checksum || ''))) throw flowError('merchant_flow_repair_resolution_invalid', 'Repair resolution does not bind the approved repair class and evidence.');
  const provenance = repairResolutionProvenance(resolution, at);
  if (resolution.status === 'human_approved') {
    if (resolution.human_approved !== true || resolution.post_repair_qa_passed !== true || resolution.automatic_execution !== false) throw flowError('merchant_flow_repair_resolution_invalid', 'Repair completion requires human approval, passed post-repair QA, and disabled automatic execution.');
    if (flow.artifact?.controlled_runtime_binding) {
      const approvedFlow = clone(flow);
      approvedFlow.repair = clone(resolution); delete approvedFlow.repair.provenance;
      approvedFlow.operator_provenance.repair_resolution = provenance;
      requireReadyPreviewBinding(flow, flow.render_qa, root, approvedFlow);
    }
    return transition(flow, 'repair_human_approved', at, (next) => { next.repair = clone(resolution); delete next.repair.provenance; next.operator_provenance.repair_resolution = provenance; next.failure = null; return next; }, root);
  }
  const event = resolution.status === 'declined' ? 'repair_declined' : resolution.status === 'failed' ? 'repair_failed' : null;
  if (!event) throw flowError('merchant_flow_repair_resolution_invalid', 'Unsupported repair resolution status.');
  return transition(flow, event, at, (next) => { next.repair = clone(resolution); delete next.repair.provenance; next.operator_provenance.repair_resolution = provenance; next.failure = { category: event, retryable: event === 'repair_failed', message: event === 'repair_declined' ? 'The merchant or reviewer declined the bounded repair.' : 'The approved bounded repair did not pass verification.' }; return next; }, root);
}

function cancelMerchantGenerationFlow(flow, cancellation, at, root) {
  const current = assertMerchantGenerationFlow(flow, root);
  if (!cancellation?.operation_id || !cancellation?.actor_user_id || !CANCELLATION_REASONS.includes(cancellation.reason_code)) throw flowError('merchant_flow_cancellation_invalid', 'Cancellation requires an allowed reason plus stable operation and actor identities.');
  const requested = { operation_id: String(cancellation.operation_id), actor_user_id: String(cancellation.actor_user_id), reason_code: cancellation.reason_code, requested_at: at };
  if (current.state === 'cancelled') {
    const replay = current.cancellation.operation_id === requested.operation_id && current.cancellation.actor_user_id === requested.actor_user_id && current.cancellation.reason_code === requested.reason_code;
    if (replay) return current;
    throw flowError('merchant_flow_cancellation_conflict', 'The flow is already bound to a different cancellation operation.');
  }
  if (!CANCELLABLE_STATES.includes(current.state)) throw flowError('merchant_flow_cancellation_forbidden', `Cancellation is not allowed from ${current.state}.`);
  return transition(current, 'flow_cancelled', at, (next) => { next.cancellation = requested; next.failure = null; return next; }, root);
}
function authorizeMerchantAction(flow, authorization, at, root) {
  if (authorization?.authorized !== true) throw flowError('merchant_flow_merchant_authorization_required', 'Explicit merchant authorization is required.');
  return transition(flow, 'merchant_action_authorized', at, (next) => { next.merchant_action = { authorized: true, authorized_at: at, operation_completed: false, operation_reference: null }; return next; }, root);
}
function completeThemeOperation(flow, operationReference, at, root) {
  if (!flow.merchant_action.authorized || !operationReference) throw flowError('merchant_flow_theme_operation_forbidden', 'Theme operation completion requires prior explicit merchant authorization.');
  return transition(flow, 'theme_operation_completed', at, (next) => { next.merchant_action.operation_completed = true; next.merchant_action.operation_reference = String(operationReference); next.failure = null; return next; }, root);
}
function failFlow(flow, category, message, retryable, at, root) {
  if (!['intake_ready', 'store_intelligence_ready', 'merchant_intent_ready', 'architecture_selection_running', 'awaiting_material_answer', 'architecture_frozen', 'design_dna_ready', 'composition_ready', 'generation_running', 'artifact_ready', 'render_qa_running', 'qa_review_required', 'repair_review_required', 'merchant_action_required'].includes(flow.state)) throw flowError('merchant_flow_failure_transition_invalid', 'This merchant flow cannot transition to failure from its current state.');
  const event = flow.state === 'repair_review_required'
    ? category === 'repair_declined' ? 'repair_declined' : 'repair_failed'
    : retryable === false && TRANSITIONS[flow.state]?.fail_terminal
      ? 'fail_terminal'
      : 'fail';
  return transition(flow, event, at, (next) => { next.failure = { category, retryable: Boolean(retryable), message: String(message).slice(0, 1000) }; return next; }, root);
}
function resumeMerchantGenerationFlow(serialized, root) {
  const value = typeof serialized === 'string' ? JSON.parse(serialized) : clone(serialized);
  return assertMerchantGenerationFlow(value, root);
}
function publicFlowStatus(flow, root) {
  const current = assertMerchantGenerationFlow(flow, root);
  const question = current.state === 'awaiting_material_answer' && current.context.question_request ? { question_id: current.context.question_request.question_id, topic: current.context.question_request.topic, prompt: current.context.question_request.prompt, choices: clone(current.context.question_request.choices), allowance_consumed: true } : null;
  return { flow_id: current.flow_id, flow_checksum: current.checksum, contract_version: current.contract_version, state: current.state, sequence: current.sequence, question, architecture: current.context.architecture_selection ? { status: 'frozen', selection_revision: current.context.architecture_selection.revision_id } : { status: current.state === 'awaiting_material_answer' ? 'awaiting_material_answer' : 'not_frozen' }, preview_ready: current.state === 'preview_ready', merchant_action_authorized: current.merchant_action.authorized, cancelled: current.state === 'cancelled', failure: current.failure ? clone(current.failure) : null, updated_at: current.updated_at };
}
function flowProvenanceSummary(flow, root) {
  const current = assertMerchantGenerationFlow(flow, root);
  return {
    flow_id: current.flow_id, flow_checksum: current.checksum, state: current.state, store_context: clone(current.store_context),
    store_intelligence: current.context.store_intelligence ? { revision_id: current.context.store_intelligence.revision_id, checksum: digest(current.context.store_intelligence) } : null,
    merchant_intent: current.context.merchant_intent ? { revision_id: current.context.merchant_intent.revision_id, checksum: digest(current.context.merchant_intent), parent_revision_id: current.context.merchant_intent.parent_revision_id } : null,
    material_clarification: current.context.question_request ? { asked: true, question_id: current.context.question_request.question_id, answer_revision: current.context.answer?.answer_revision || null } : { asked: false, question_id: null, answer_revision: null },
    architecture: current.context.architecture_selection ? { selection_revision: current.context.architecture_selection.revision_id, profile_id: current.context.architecture_selection.profile_id, reason_codes: clone(current.context.architecture_selection.selection_reason.codes) } : null,
    design_dna: clone(current.design_dna), composition: clone(current.composition), paid_identity: clone(current.paid_identity), generation: clone(current.generation), artifact: clone(current.artifact), target_succession: clone(current.target_succession || null), render_qa: clone(current.render_qa), repair: clone(current.repair), operator_provenance: clone(current.operator_provenance), cancellation: clone(current.cancellation), merchant_action: clone(current.merchant_action)
  };
}

module.exports = {
  LEGACY_FLOW_VERSION, FLOW_VERSION, FLOW_SCHEMA, STATES, TRANSITIONS, REPAIR_CLASSES, CANCELLATION_REASONS, CANCELLABLE_STATES,
  upgradeMerchantGenerationFlow, assertMerchantGenerationFlow, createMerchantGenerationFlow, bindStoreIntelligence, retryStoreIntelligence, bindMerchantIntent,
  startArchitectureSelection, pauseForMaterialAnswer, recordUnresolvedMaterialAnswer, freezeArchitecture,
  bindDesignDna, bindComposition, bindPaidIdentity, startGeneration, markGenerationInterrupted,
  resumeInterruptedGeneration, retryGeneration, bindArtifact, startRenderQa, applyRenderTargetSuccession, retryRenderQa, recoverTerminalD27,
  requireReadyPreviewBinding, completeRenderQa, recordQaReview, recordRepairResolution, cancelMerchantGenerationFlow,
  authorizeMerchantAction, completeThemeOperation, failFlow, resumeMerchantGenerationFlow,
  publicFlowStatus, flowProvenanceSummary
};
