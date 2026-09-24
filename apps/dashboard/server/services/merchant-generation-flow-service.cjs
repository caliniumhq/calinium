'use strict';

const { DashboardError } = require('../lib/errors.cjs');
const { createId } = require('../lib/ids.cjs');
const { isoNow } = require('../lib/serialization.cjs');
const {
  digest,
  createStoreIntelligenceContract,
  createMerchantIntent,
  selectArchitecture,
  assertFrozenArchitectureSelection
} = require('../../../../ai/architecture');
const {
  prepareArchitectureMaterialQuestion,
  recordArchitectureMaterialAnswer,
  resolveArchitectureMaterialQuestion
} = require('../../../../ai/conversation');
const {
  assertMerchantGenerationFlow,
  createMerchantGenerationFlow,
  bindStoreIntelligence,
  retryStoreIntelligence,
  bindMerchantIntent,
  startArchitectureSelection,
  pauseForMaterialAnswer,
  recordUnresolvedMaterialAnswer,
  freezeArchitecture,
  bindDesignDna,
  bindComposition,
  bindPaidIdentity,
  startGeneration,
  resumeInterruptedGeneration,
  retryGeneration,
  bindArtifact,
  applyRenderTargetSuccession,
  startRenderQa,
  retryRenderQa,
  recoverTerminalD27,
  completeRenderQa,
  recordQaReview,
  recordRepairResolution,
  cancelMerchantGenerationFlow,
  createOperatorOperationRecord,
  assertOperatorOperationRequest,
  resumeMerchantGenerationFlow,
  publicFlowStatus,
  flowProvenanceSummary,
  betaStatusFor,
  jobIdentity,
  assertRenderTargetSuccessionSubmission,
  createRenderTargetSuccessionRecord,
  successorJobIdentity
} = require('../../../../ai/merchant-flow');
const { isTerminalD27RecoveryCandidate } = require('../../../../ai/design-evaluation/merchant-flow-d2-7-terminal-recovery');
const { normalizeShopDomain } = require('./merchant-flow-controlled-runtime-configuration.cjs');
const { merchantSafePreview } = require('./merchant-flow-preview-binding-resolver.cjs');
const { createControlledRenderArtifactBinding } = require('./merchant-flow-controlled-runtime.cjs');
const { merchantIntentArchitecturePreferences } = require('./creative-director-architecture-preference.cjs');
const { resourceFlowEligibility } = require('../../../../pipeline/resource-confirmation-eligibility');
const { contentPlanFlowEligibility, readyTargetCompositionIdentities } = require('../../../../pipeline/content-plan-eligibility');
const { createApprovedBlockPlanTransport } = require('../../../../pipeline/resolve-approved-block-plan-transport');
const { merchantScopeId } = require('./editorial-grid-plan-service.cjs');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function safeRequestId(value) {
  const id = String(value || '');
  return /^[A-Za-z0-9._:-]{1,128}$/.test(id) ? id : null;
}

const PREVIEW_RECOVERY_FAILURES = Object.freeze({
  merchant_flow_preview_provenance_recovery_request_invalid: { status: 422, category: 'request_invalid', stage: 'request_validation', retryable: false, recovery: 'refresh_required' },
  merchant_flow_preview_provenance_recovery_evidence_missing: { code: 'merchant_flow_preview_provenance_recovery_evidence_invalid', status: 422, category: 'evidence_invalid', stage: 'evidence_resolution', retryable: false, recovery: 'source_remediation_required' },
  merchant_flow_preview_provenance_recovery_reference_unsafe: { code: 'merchant_flow_preview_provenance_recovery_evidence_invalid', status: 422, category: 'evidence_invalid', stage: 'evidence_resolution', retryable: false, recovery: 'source_remediation_required' },
  merchant_flow_preview_provenance_recovery_scope_mismatch: { code: 'merchant_flow_preview_provenance_recovery_evidence_invalid', status: 422, category: 'evidence_invalid', stage: 'evidence_resolution', retryable: false, recovery: 'source_remediation_required' },
  merchant_flow_preview_provenance_recovery_qa_unaccepted: { code: 'merchant_flow_preview_provenance_recovery_evidence_invalid', status: 422, category: 'evidence_invalid', stage: 'evidence_resolution', retryable: false, recovery: 'source_remediation_required' },
  merchant_flow_preview_provenance_recovery_founder_review_invalid: { status: 422, category: 'founder_review_invalid', stage: 'evidence_resolution', retryable: false, recovery: 'source_remediation_required' },
  merchant_flow_preview_provenance_recovery_founder_review_conflict: { status: 409, category: 'founder_review_conflict', stage: 'evidence_resolution', retryable: false, recovery: 'source_remediation_required' },
  merchant_flow_preview_provenance_recovery_not_eligible: { status: 409, category: 'recovery_not_eligible', stage: 'eligibility', retryable: false, recovery: 'refresh_required' },
  merchant_flow_preview_provenance_recovery_stale: { status: 409, category: 'stale_flow', stage: 'concurrency', retryable: true, recovery: 'reload_required' },
  merchant_flow_preview_provenance_recovery_conflict: { status: 409, category: 'recovery_conflict', stage: 'persistence', retryable: false, recovery: 'operator_review_required' },
  merchant_flow_preview_provenance_recovery_post_write_invalid: { status: 409, category: 'post_write_verification_failed', stage: 'post_write_verification', retryable: false, recovery: 'operator_review_required' },
  merchant_flow_preview_provenance_recovery_persistence_unavailable: { status: 503, category: 'storage_unavailable', stage: 'persistence', retryable: true, recovery: 'retry_later' },
  merchant_flow_preview_provenance_recovery_unavailable: { status: 503, category: 'service_unavailable', stage: 'availability', retryable: true, recovery: 'retry_later' },
  merchant_flow_preview_provenance_recovery_invalid: { code: 'merchant_flow_preview_provenance_recovery_record_construction_failed', status: 500, category: 'record_construction_failed', stage: 'record_construction', retryable: false, recovery: 'source_remediation_required' }
});

function previewProvenanceRecoveryDashboardError(error, { stageHint = null, requestId = null } = {}) {
  const originalCode = String(error?.code || '');
  const classified = PREVIEW_RECOVERY_FAILURES[originalCode]
    || (stageHint === 'record_construction'
      ? { code: 'merchant_flow_preview_provenance_recovery_record_construction_failed', status: 500, category: 'record_construction_failed', stage: 'record_construction', retryable: false, recovery: 'source_remediation_required' }
      : stageHint === 'persistence'
        ? { code: 'merchant_flow_preview_provenance_recovery_persistence_failed', status: 503, category: 'storage_failure', stage: 'persistence', retryable: true, recovery: 'retry_later' }
        : null);
  if (!classified) return error instanceof DashboardError
    ? error
    : new DashboardError('merchant_flow_preview_provenance_recovery_failed', 'Preview recovery could not be completed.', 500);
  const code = classified.code || originalCode;
  const boundedRequestId = safeRequestId(requestId);
  const details = {
    category: classified.category,
    stage: classified.stage,
    retryable: classified.retryable,
    recovery: classified.recovery,
    ...(boundedRequestId ? { request_id: boundedRequestId } : {})
  };
  const message = classified.status >= 500
    ? 'Preview recovery could not be completed safely.'
    : classified.status === 409
      ? 'Preview recovery conflicts with the current authoritative state.'
      : 'Preview recovery evidence or request is invalid.';
  return new DashboardError(code, message, classified.status, details);
}

class MerchantGenerationFlowService {
  constructor({
    root,
    store,
    projectService,
    runtime = null,
    controlledRuntimeConfiguration = null,
    operatorAuthorization = null,
    operatorEvidenceResolver = null,
    previewBindingResolver = null,
    renderTargetSuccessionResolver = null,
    cancellationProjector = null,
    betaReadiness = null,
    clock = () => new Date()
  }) {
    this.root = root;
    this.store = store;
    this.projectService = projectService;
    this.runtime = runtime;
    this.controlledRuntimeConfiguration = controlledRuntimeConfiguration;
    this.operatorAuthorization = operatorAuthorization;
    this.operatorEvidenceResolver = operatorEvidenceResolver;
    this.previewBindingResolver = previewBindingResolver;
    this.renderTargetSuccessionResolver = renderTargetSuccessionResolver;
    this.cancellationProjector = cancellationProjector;
    this.betaReadiness = betaReadiness;
    this.controlledShopDomains = new Set(controlledRuntimeConfiguration?.controlled_shop_domains || []);
    this.clock = clock;
    this.jobRunner = null;
  }

  setJobRunner(jobRunner) { this.jobRunner = jobRunner || null; }

  async requireBetaReady() {
    if (!this.controlledRuntimeConfiguration?.enabled) return null;
    const readiness = typeof this.betaReadiness === 'function' ? await this.betaReadiness() : null;
    if (readiness?.status !== 'READY') throw new DashboardError('controlled_beta_runtime_not_ready', 'Storefront preparation is temporarily unavailable.', 503);
    return readiness;
  }

  assertControlledShopAllowed(shop) {
    if (!this.controlledRuntimeConfiguration?.enabled) return null;
    const domain = normalizeShopDomain(shop);
    if (!domain || !this.controlledShopDomains.has(domain)) throw new DashboardError('controlled_beta_shop_not_allowed', 'This store is not currently enabled for the controlled beta.', 403);
    return domain;
  }

  at() { return isoNow(this.clock); }
  async authorize({ userId, projectId, permission = 'project:view' }) {
    const project = await this.store.findProjectById(projectId);
    if (!project) throw new DashboardError('project_not_found', 'Project not found.', 404);
    await this.projectService.requireMembership(project.organization_id, userId, permission);
    return project;
  }
  async session(projectId) {
    const session = await this.store.findCreativeDirectorForProject(projectId);
    if (!session) throw new DashboardError('creative_director_missing', 'Start designing before preparing a merchant generation flow.', 409);
    return session;
  }
  flowFromSession(session) {
    const stored = session?.generation_state?.merchant_flow || null;
    return stored ? assertMerchantGenerationFlow(stored, this.root) : null;
  }
  async assertFlowOwnership(project, flow) {
    if (!flow) return;
    if (flow.project_id !== project.id || flow.organization_id !== project.organization_id) throw new DashboardError('merchant_flow_ownership_mismatch', 'This merchant generation flow is unavailable.', 404);
    if (flow.store_context?.connection_id && typeof this.store.findProjectShopifyConnection === 'function') {
      const assignment = await this.store.findProjectShopifyConnection(project.id, project.organization_id, flow.store_context.connection_id);
      if (!assignment?.connection || (flow.store_context.shop && assignment.connection.shop_domain !== flow.store_context.shop)) throw new DashboardError('merchant_flow_shop_ownership_mismatch', 'This merchant generation flow is unavailable.', 404);
    }
  }
  async recordTransitions(project, previous, current) {
    if (!this.jobRunner) return;
    const labels = {
      flow_created: 'flow_started', store_intelligence_bound: 'store_intelligence_ready', store_intelligence_recovered: 'store_intelligence_ready',
      material_question_prepared: 'material_question_requested', material_answer_unresolved: 'material_answer_received', architecture_frozen: 'architecture_selected',
      generation_started: 'generation_started', generation_retried: 'retry', artifact_generated: 'artifact_ready',
      render_qa_started: 'render_started', render_qa_retried: 'retry', terminal_d2_7_recovered: 'retry', qa_passed: 'qa_completed', qa_review_required: 'review_required',
      qa_review_accepted: 'preview_ready', repair_review_required: 'review_required', repair_human_approved: 'preview_ready',
      merchant_action_authorized: 'merchant_action_authorized', flow_cancelled: 'flow_cancelled', fail: 'failure'
    };
    const fromSequence = previous?.sequence ?? -1;
    for (const entry of current.history.filter((item) => item.sequence > fromSequence)) {
      const eventType = labels[entry.event]; if (!eventType) continue;
      const details = { flow_id: current.flow_id, project_id: project.id, organization_id: project.organization_id, sequence: entry.sequence, status: current.state, order_id: current.paid_identity?.order_id, generation_id: current.generation?.generation_id, artifact_id: current.artifact?.artifact_id };
      if (entry.event === 'architecture_frozen' && previous?.state === 'awaiting_material_answer') {
        await this.jobRunner.event({ flowId: current.flow_id, projectId: project.id, organizationId: project.organization_id, eventType: 'material_answer_received', sequence: entry.sequence, details });
      }
      await this.jobRunner.event({ flowId: current.flow_id, projectId: project.id, organizationId: project.organization_id, eventType, sequence: entry.sequence, details });
      if (entry.event === 'architecture_frozen') {
        await this.jobRunner.event({ flowId: current.flow_id, projectId: project.id, organizationId: project.organization_id, eventType: 'architecture_frozen', sequence: entry.sequence, details });
      }
      if (entry.event === 'qa_passed') {
        await this.jobRunner.event({ flowId: current.flow_id, projectId: project.id, organizationId: project.organization_id, eventType: 'preview_ready', sequence: entry.sequence, details });
      }
    }
  }
  async persist(project, session, flow) {
    const validated = assertMerchantGenerationFlow(flow, this.root);
    const previous = this.flowFromSession(session);
    const expected = session.generation_state || {};
    const nextGenerationState = { ...expected, merchant_flow: clone(validated) };
    if (typeof this.store.updateCreativeDirectorGenerationStateIfMatch !== 'function') {
      throw new DashboardError('merchant_flow_cas_unavailable', 'Storefront preparation is unavailable until durable concurrency protection is active.', 503);
    }
    if (typeof session.updated_at !== 'string' || !session.updated_at) {
      throw new DashboardError('merchant_flow_session_revision_missing', 'Reload the current storefront preparation state before continuing.', 409);
    }
    const saved = await this.store.updateCreativeDirectorGenerationStateIfMatch(project.id, expected, nextGenerationState, this.at(), session.updated_at);
    if (!saved.updated) throw new DashboardError('merchant_flow_stale', 'The merchant generation flow changed. Reload its current status before continuing.', 409);
    const current = this.flowFromSession(saved.session);
    await this.recordTransitions(project, previous, current);
    return current;
  }
  result(flow, { promptDeliveryRequired = false, resumed = false } = {}) {
    const status = publicFlowStatus(flow, this.root);
    return { flow: { ...status, merchant_status: betaStatusFor(flow) }, prompt_delivery_required: Boolean(promptDeliveryRequired), resumed: Boolean(resumed) };
  }
  conversationRevision(session) {
    return `conversation-flow-${digest({ session_id: session.id, conversation_state: session.conversation_state || null }).slice(0, 20)}`;
  }
  storeContext(project, intakeRevision = null) {
    return { project_id: project.id, organization_id: project.organization_id, connection_id: intakeRevision?.connection_id || null, shop: intakeRevision?.store_intelligence?.store?.canonical_shop_domain || null };
  }
  merchantContext(project, intakeRevision = null) {
    return { project_id: project.id, store_id: intakeRevision?.connection_id || project.id, merchant_id: project.organization_id };
  }

  async assertContentPlanReady(project, session, expectedShop = null) {
    if (!session?.resource_plan?.confirmation_eligibility) {
      throw new DashboardError('merchant_flow_content_plan_not_ready', 'Resolve the remaining storefront content decisions before starting storefront preparation.', 409, { actionable_count: null, blocked_count: null, stage_ready: false });
    }
    const boundShop = normalizeShopDomain(session.content_plan?.target_eligibility?.scope_binding?.shop);
    const shop = normalizeShopDomain(expectedShop);
    if (!boundShop || !shop || boundShop !== shop) {
      throw new DashboardError('merchant_flow_content_plan_shop_mismatch', 'Resolve storefront content from the Shopify store assigned to this project before starting storefront preparation.', 409);
    }
    const eligibility = contentPlanFlowEligibility(session.content_plan, {
      resourcePlan: session.resource_plan,
      generationContext: session.generation_context,
      presetRevisionId: session.preset_selection?.approved_revision_id || null,
      scope: { project_id: session.project_id, shop },
      ...(this.controlledRuntimeConfiguration?.deployment_source_revision
        ? { sourceRevision: this.controlledRuntimeConfiguration.deployment_source_revision }
        : {})
    });
    const stageReady = ['offer', 'generation', 'delivery', 'preview', 'finish'].includes(session.stage);
    if (!eligibility.eligible || !stageReady) {
      throw new DashboardError('merchant_flow_content_plan_not_ready', 'Resolve the remaining storefront content decisions before starting storefront preparation.', 409, {
        actionable_count: eligibility.actionable_count,
        blocked_count: eligibility.blocked_count,
        stage_ready: stageReady
      });
    }
    const readyTargets = (session.content_plan?.target_eligibility?.targets || []).filter((target) => target.eligibility_state === 'ready_from_authoritative_content');
    if (readyTargets.length) {
      const planRevisionId = session.content_plan?.approved_revision_id;
      const resourceSnapshotRevisionId = session.content_plan?.approved_resource_snapshot_revision_id;
      if (!planRevisionId || !resourceSnapshotRevisionId
        || typeof this.store.findApprovedBlockPlanRevision !== 'function'
        || typeof this.store.findApprovedBlockPlanResourceSnapshot !== 'function') {
        throw new DashboardError('merchant_flow_content_plan_provenance_missing', 'The approved storefront content revision is unavailable. Review the Content Plan before continuing.', 409);
      }
      const [planRevision, resourceSnapshot] = await Promise.all([
        this.store.findApprovedBlockPlanRevision(planRevisionId, project.id, project.organization_id),
        this.store.findApprovedBlockPlanResourceSnapshot(resourceSnapshotRevisionId, project.id, project.organization_id)
      ]);
      if (!planRevision || !resourceSnapshot) {
        throw new DashboardError('merchant_flow_content_plan_provenance_missing', 'The approved storefront content revision is unavailable. Review the Content Plan before continuing.', 409);
      }
      let transport;
      try {
        transport = createApprovedBlockPlanTransport({
          planRevision,
          resourceSnapshot,
          root: this.root,
          projectScope: { organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id) }
        });
      } catch {
        throw new DashboardError('merchant_flow_content_plan_provenance_invalid', 'The approved storefront content revision could not be verified. Review the Content Plan before continuing.', 409);
      }
      const expectedCompositions = readyTargetCompositionIdentities(readyTargets);
      const actualCompositions = [...new Set((transport.plan_revision.plan.compositions || [])
        .filter((composition) => composition.page_role && composition.section_role)
        .map((composition) => `${composition.page_role}|${composition.section_role}`))].sort();
      if (!expectedCompositions.length || JSON.stringify(expectedCompositions) !== JSON.stringify(actualCompositions)) {
        throw new DashboardError('merchant_flow_content_plan_provenance_invalid', 'The approved storefront content revision does not match the current effective composition. Review the Content Plan before continuing.', 409);
      }
    }
    return eligibility;
  }

  assertResourceReady(session) {
    const eligibility = resourceFlowEligibility(session.resource_plan, session.generation_context, { requireApproval: true });
    if (!eligibility.eligible) {
      throw new DashboardError('merchant_flow_resources_not_ready', 'Resolve the remaining Store Resources decisions before starting storefront preparation.', 409, {
        missing_field_count: eligibility.missing_fields.length,
        missing_asset_count: eligibility.missing_assets.length,
        confirmation_count: eligibility.confirmation_blockers.length,
        approval_missing: eligibility.approval_missing
      });
    }
    return eligibility;
  }

  async advanceArchitecture(project, session, intakeRevision, flow, { resumed = false } = {}) {
    const storeIntelligence = flow.context.store_intelligence;
    const architecturePreference = merchantIntentArchitecturePreferences(session);
    const merchantIntent = createMerchantIntent({
      creativeBrief: session.creative_brief,
      storeStrategy: session.store_strategy,
      storeIntelligence,
      architecturePreferences: architecturePreference.architecturePreferences,
      architecturePreferenceRevision: architecturePreference.architecturePreferenceRevision,
      root: this.root
    });
    let next = bindMerchantIntent(flow, merchantIntent, this.at(), this.root);
    next = startArchitectureSelection(next, this.at(), this.root);
    const architectureResult = selectArchitecture({ merchantIntent, storeIntelligence, selectionMode: 'automatic_beta', root: this.root });
    if (architectureResult.status === 'material_question_required') {
      const prepared = prepareArchitectureMaterialQuestion({
        architectureResult,
        merchantIntent,
        storeIntelligence,
        conversationRevision: next.conversation_revision,
        merchantContext: this.merchantContext(project, intakeRevision),
        createdAt: this.at(),
        root: this.root
      });
      next = pauseForMaterialAnswer(next, architectureResult, prepared.question_request, this.at(), this.root);
      next = await this.persist(project, session, next);
      return this.result(next, { promptDeliveryRequired: prepared.prompt_delivery_required, resumed });
    }
    next = freezeArchitecture(next, architectureResult, this.at(), {}, this.root);
    next = await this.persist(project, session, next);
    return this.result(next, { resumed });
  }

  async start({ userId, projectId }) {
    await this.requireBetaReady();
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    let session = await this.session(projectId);
    const existing = this.flowFromSession(session);
    if (existing) {
      await this.assertFlowOwnership(project, existing);
      this.assertControlledShopAllowed(existing.store_context?.shop);
      if (!existing.paid_identity) {
        this.assertResourceReady(session);
        await this.assertContentPlanReady(project, session, existing.store_context?.shop);
      }
      return this.result(existing, { promptDeliveryRequired: false, resumed: true });
    }
    if (!session.creative_brief || !session.store_strategy) throw new DashboardError('merchant_flow_intent_not_ready', 'Approve the Creative Brief and Store Strategy before starting generation orchestration.', 409);
    const intakeRevision = typeof this.store.latestMerchantIntakeRevision === 'function' ? await this.store.latestMerchantIntakeRevision(project.id) : null;
    this.assertResourceReady(session);
    await this.assertContentPlanReady(project, session, intakeRevision?.store_intelligence?.store?.canonical_shop_domain);
    const at = this.at();
    this.assertControlledShopAllowed(intakeRevision?.store_intelligence?.store?.canonical_shop_domain);
    let flow = createMerchantGenerationFlow({
      projectId: project.id,
      organizationId: project.organization_id,
      conversationRevision: this.conversationRevision(session),
      storeContext: this.storeContext(project, intakeRevision),
      paidGenerationRequired: true,
      createdAt: at,
      root: this.root
    });
    await this.assertFlowOwnership(project, flow);
    if (!intakeRevision || !['usable', 'partial'].includes(intakeRevision.intake_status)) {
      const { failFlow } = require('../../../../ai/merchant-flow');
      flow = failFlow(flow, 'store_intelligence_unavailable', 'Authoritative Shopify Store Intelligence is unavailable for this generation cycle.', true, this.at(), this.root);
      try { flow = await this.persist(project, session, flow); }
      catch (error) { if (error.code === 'merchant_flow_stale') { const current = this.flowFromSession(await this.session(projectId)); if (current) return this.result(current, { resumed: true }); } throw error; }
      return this.result(flow);
    }
    try {
      const storeIntelligence = createStoreIntelligenceContract({
        revisionId: intakeRevision.revision_id,
        normalizationVersion: intakeRevision.normalization_version,
        intelligence: intakeRevision.store_intelligence,
        status: intakeRevision.intake_status,
        root: this.root
      });
      flow = bindStoreIntelligence(flow, storeIntelligence, this.at(), this.root);
      try { return await this.advanceArchitecture(project, session, intakeRevision, flow); }
      catch (error) { if (error.code === 'merchant_flow_stale') { const current = this.flowFromSession(await this.session(projectId)); if (current) return this.result(current, { resumed: true }); } throw error; }
    } catch (error) {
      const { failFlow } = require('../../../../ai/merchant-flow');
      if (flow.state === 'architecture_selection_running') flow = failFlow(flow, 'architecture_selection_failed', 'Architecture selection failed closed because its pinned inputs could not be validated.', false, this.at(), this.root);
      flow = await this.persist(project, session, flow);
      if (error?.name === 'MerchantGenerationFlowError') throw error;
      return this.result(flow);
    }
  }

  async answer({ userId, projectId, flowId, questionId, message, expectedFlowChecksum = null }) {
    await this.requireBetaReady();
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const session = await this.session(projectId);
    let flow = this.flowFromSession(session);
    if (!flow || flow.flow_id !== flowId) throw new DashboardError('merchant_flow_not_found', 'This merchant generation flow is unavailable.', 404);
    await this.assertFlowOwnership(project, flow);
    this.assertControlledShopAllowed(flow.store_context?.shop);
    if (!flow.paid_identity) {
      this.assertResourceReady(session);
      await this.assertContentPlanReady(project, session, flow.store_context?.shop);
    }
    if (expectedFlowChecksum && expectedFlowChecksum !== flow.checksum) throw new DashboardError('merchant_flow_stale', 'The merchant generation flow changed. Reload its current status before answering.', 409);
    if (flow.state !== 'awaiting_material_answer') throw new DashboardError('merchant_flow_answer_invalid', 'This merchant generation flow is not awaiting an architecture clarification.', 409);
    const intakeRevision = await this.store.findMerchantIntakeRevision(flow.context.store_intelligence.revision_id, project.id);
    const recorded = await recordArchitectureMaterialAnswer({
      questionRequest: flow.context.question_request,
      message,
      questionId,
      originatingSelectionOutcomeId: flow.context.selection_outcome.outcome_id,
      intentPath: flow.context.question_request.intent_path,
      conversationRevision: flow.conversation_revision,
      merchantContext: this.merchantContext(project, intakeRevision),
      answeredAt: this.at(),
      root: this.root
    });
    if (recorded.status === 'unresolved_answer') {
      flow = recordUnresolvedMaterialAnswer(flow, 'The answer did not clearly indicate either supported shopping experience.', this.at(), this.root);
      flow = await this.persist(project, session, flow);
      return this.result(flow, { promptDeliveryRequired: false });
    }
    const resolution = resolveArchitectureMaterialQuestion({
      selectionOutcome: flow.context.selection_outcome,
      questionRequest: flow.context.question_request,
      answer: recorded.answer,
      merchantIntent: flow.context.merchant_intent,
      storeIntelligence: flow.context.store_intelligence,
      root: this.root
    });
    flow = freezeArchitecture(flow, resolution.architecture_selection, this.at(), { answer: recorded.answer, merchantIntent: resolution.merchant_intent }, this.root);
    flow = await this.persist(project, session, flow);
    return this.result(flow);
  }

  async status({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId });
    const flow = this.flowFromSession(await this.session(projectId));
    if (!flow) return { flow: null, jobs: [], events: [], prompt_delivery_required: false, resumed: false };
    await this.assertFlowOwnership(project, flow);
    if (this.jobRunner) await this.jobRunner.recover({ flowId: flow.flow_id, projectId: project.id, organizationId: project.organization_id });
    const [jobs, events] = this.jobRunner ? await Promise.all([this.store.listMerchantFlowJobs(flow.flow_id, project.id, project.organization_id), this.store.listMerchantFlowOperationalEvents(flow.flow_id, project.id, project.organization_id)]) : [[], []];
    const publicEvents = events.map((event) => ({
      event_type: event.event_type,
      sequence: event.sequence,
      status: event.details?.status || null,
      job_kind: event.details?.job_kind || null,
      failure_category: event.details?.failure_category || null,
      created_at: event.created_at
    }));
    return { ...this.result(flow, { resumed: true }), jobs: jobs.map((job) => ({ job_id: job.id, kind: job.job_kind, status: job.status, attempt: job.attempt, failure_category: job.failure_category, updated_at: job.updated_at })), events: publicEvents };
  }
  async inspect({ userId, projectId }) {
    await this.authorize({ userId, projectId });
    const flow = this.flowFromSession(await this.session(projectId));
    if (flow) await this.assertFlowOwnership(await this.authorize({ userId, projectId }), flow);
    return flow ? flowProvenanceSummary(flow, this.root) : null;
  }
  async generationProvenance({ project }) {
    const flow = this.flowFromSession(await this.session(project.id));
    return flow ? flowProvenanceSummary(flow, this.root) : null;
  }
  async requirePreviewReady({ project, order }) {
    const flow = this.flowFromSession(await this.session(project.id));
    if (!flow) return null;
    await this.assertFlowOwnership(project, flow);
    if (!flow.paid_identity || flow.paid_identity.order_id !== order.id) throw new DashboardError('merchant_flow_paid_identity_mismatch', 'This artifact does not belong to the active merchant generation flow.', 409);
    if (!['preview_ready', 'merchant_action_required', 'completed'].includes(flow.state)) throw new DashboardError('merchant_flow_preview_not_ready', 'The generated storefront is still completing controlled render, QA, or human review.', 409, { flow: publicFlowStatus(flow, this.root) });
    return flow;
  }
  renderQaIdentity(flow) {
    const legacyIdentity = () => jobIdentity({
      flowId: flow.flow_id,
      kind: 'render_qa',
      artifactId: flow.artifact.artifact_id,
      renderRequestId: `render-request-${flow.artifact.checksum.slice(0, 20)}`,
      qaId: `qa-${flow.artifact.checksum.slice(0, 20)}`
    });
    const succession = flow?.target_succession;
    if (!succession) {
      const identity = legacyIdentity();
      return {
        ...identity,
        render_request_id: identity.binding.render_request_id,
        qa_id: identity.binding.qa_id
      };
    }
    const identity = successorJobIdentity({
      flowId: flow.flow_id,
      artifactId: flow.artifact.artifact_id,
      successionId: succession.succession_id,
      successorBindingChecksum: succession.successor_binding_checksum
    });
    if (identity.job_id !== succession.successor_job_id) {
      throw new DashboardError('merchant_flow_render_target_succession_binding_invalid', 'The successor render job no longer matches the active preview target.', 409);
    }
    const stableSuffix = succession.succession_id.slice(-20);
    return {
      ...identity,
      binding: {
        flow_id: flow.flow_id,
        kind: 'render_qa',
        artifact_id: flow.artifact.artifact_id,
        target_succession_id: succession.succession_id,
        target_binding_checksum: succession.successor_binding_checksum
      },
      render_request_id: `render-target-succession-${stableSuffix}`,
      qa_id: `qa-target-succession-${stableSuffix}`
    };
  }

  async resumeRenderQa({ project, session, flow, userId, expectedFlowChecksum, expectedFlowSequence, idempotencyKey, requestId }) {
    if (!this.jobRunner || typeof this.store.applyMerchantFlowResumeOperation !== 'function') {
      throw new DashboardError('merchant_flow_resume_integrity_unavailable', 'Storefront preparation cannot be retried until durable retry protection is available.', 503);
    }
    if (!/^[a-f0-9]{64}$/.test(String(expectedFlowChecksum || '')) || !Number.isInteger(expectedFlowSequence)) {
      throw new DashboardError('merchant_flow_resume_revision_required', 'Reload the current storefront preparation state before retrying.', 409);
    }
    const expectedKey = `merchant-flow-resume-${expectedFlowChecksum}`;
    if (idempotencyKey !== expectedKey) {
      throw new DashboardError('merchant_flow_resume_idempotency_invalid', 'Reload the current storefront preparation state before retrying.', 409);
    }
    const identity = this.renderQaIdentity(flow);
    const terminalRecoveryRequested = isTerminalD27RecoveryCandidate(flow, this.root);
    const existing = typeof this.store.findMerchantFlowResumeOperation === 'function'
      ? await this.store.findMerchantFlowResumeOperation(flow.flow_id, 'render_qa_retry', idempotencyKey, project.id, project.organization_id)
      : null;
    if (existing) {
      if (existing.actor_user_id !== userId || existing.expected_flow_checksum !== expectedFlowChecksum
        || existing.expected_flow_sequence !== expectedFlowSequence || existing.job_id !== identity.job_id) {
        throw new DashboardError('merchant_flow_resume_operation_idempotency_conflict', 'This retry action is already bound to another storefront revision.', 409);
      }
      const currentSession = await this.session(project.id);
      const current = this.flowFromSession(currentSession);
      if (existing.status !== 'applied' || !current) throw new DashboardError('merchant_flow_resume_operation_pending', 'The retry action is already being applied.', 409);
      const replayJob = await this.store.findMerchantFlowJob(identity.job_id, project.id, project.organization_id);
      if (replayJob?.status === 'queued') this.jobRunner.schedule(replayJob);
      return this.result(current, { resumed: true });
    }
    if (expectedFlowChecksum !== flow.checksum || expectedFlowSequence !== flow.sequence) {
      throw new DashboardError('merchant_flow_stale', 'The merchant generation flow changed. Reload its current status before resuming.', 409);
    }
    const job = await this.store.findMerchantFlowJob(identity.job_id, project.id, project.organization_id);
    const expectedJobStatus = terminalRecoveryRequested ? 'terminal' : 'retryable';
    const successorIdentityInvalid = flow.target_succession && (job?.identity_checksum !== identity.identity_checksum
      || job?.payload?.artifact_id !== flow.artifact.artifact_id
      || job?.payload?.render_request_id !== identity.render_request_id
      || job?.payload?.qa_id !== identity.qa_id
      || job?.payload?.operation_id !== flow.target_succession.succession_id);
    if (!job || job.status !== expectedJobStatus || successorIdentityInvalid) throw new DashboardError('merchant_flow_resume_job_stale', 'The saved storefront retry is no longer available.', 409);
    const at = this.at();
    let recoveredRenderQa = null;
    let legacyLineageResolution = null;
    let terminalRecovery = null;
    const legacyGenericFailure = flow.failure?.category === 'shopify_render_failed'
      && !flow.render_qa?.d2_7_failure;
    if (legacyGenericFailure) {
      try {
        if (typeof this.runtime?.resolveLegacyD27Lineage !== 'function') {
          // The E5R-O recoverLegacyD27Failure hook is retained by the runtime
          // for compatibility tests, but cannot authorize a post-E5R-P resume.
          const deprecatedRecoveryAvailable = typeof this.runtime?.recoverLegacyD27Failure === 'function';
          throw Object.assign(new Error('Historical D2.7 lineage resolution is unavailable.'), {
            code: 'controlled_beta_d2_7_legacy_resolution_unavailable', retryable: false,
            deprecated_recovery_available: deprecatedRecoveryAvailable
          });
        }
        const legacy = await this.runtime.resolveLegacyD27Lineage({ flow: clone(flow), artifact: clone(flow.artifact), job: clone(job) });
        legacyLineageResolution = legacy?.resolution || null;
        if (!['authoritative_match', 'unique_legacy_match'].includes(legacyLineageResolution?.status)
          || !legacy?.recovered_render_qa) {
          const codes = {
            ambiguous_legacy_match: 'controlled_beta_d2_7_legacy_evidence_ambiguous',
            incompatible_legacy_evidence: 'controlled_beta_d2_7_legacy_evidence_incompatible',
            no_reusable_evidence: 'controlled_beta_d2_7_legacy_evidence_unavailable'
          };
          throw Object.assign(new Error('Historical D2.7 lineage is not authorized for reuse.'), {
            code: codes[legacyLineageResolution?.status] || 'controlled_beta_d2_7_legacy_evidence_unavailable',
            retryable: false
          });
        }
        recoveredRenderQa = legacy.recovered_render_qa;
      } catch (error) {
        if (String(error?.code || '').startsWith('controlled_beta_d2_7_')) {
          throw new DashboardError(error.code, 'The saved visual-review evidence no longer matches this storefront preparation attempt.', 409);
        }
        throw error;
      }
    }
    const operationId = `merchant-flow-resume-operation-${digest({ flow_id: flow.flow_id, operation_kind: 'render_qa_retry', idempotency_key: idempotencyKey }).slice(0, 20)}`;
    if (terminalRecoveryRequested) {
      if (typeof this.runtime?.validateTerminalD27Recovery !== 'function'
        || typeof this.store.findMerchantFlowLegacyD27LineageBinding !== 'function') {
        throw new DashboardError('merchant_flow_d2_7_terminal_recovery_unavailable', 'The saved storefront review cannot be recovered until bounded recovery validation is available.', 503);
      }
      let lineageBinding = await this.store.findMerchantFlowLegacyD27LineageBinding(
        flow.flow_id, job.id, job.attempt - 1, project.id, project.organization_id
      );
      if (!lineageBinding && typeof this.store.findLatestMerchantFlowLegacyD27LineageBinding === 'function') {
        lineageBinding = await this.store.findLatestMerchantFlowLegacyD27LineageBinding(
          flow.flow_id, job.id, job.attempt - 1, project.id, project.organization_id
        );
      }
      try {
        terminalRecovery = await this.runtime.validateTerminalD27Recovery({
          flow: clone(flow), artifact: clone(flow.artifact), job: clone(job), lineage_binding: clone(lineageBinding),
          resume_operation_id: operationId, actor_user_id: userId, idempotency_key: idempotencyKey, authorized_at: at
        });
      } catch (error) {
        if (String(error?.code || '').startsWith('controlled_beta_d2_7_')
          || String(error?.code || '').startsWith('merchant_flow_d2_7_')) {
          throw new DashboardError(error.code, 'The saved visual-review evidence no longer authorizes this recovery.', 409);
        }
        throw error;
      }
    }
    const next = terminalRecovery
      ? recoverTerminalD27(flow, terminalRecovery, at, this.root)
      : retryRenderQa(flow, at, this.root, { recoveredRenderQa });
    const request = {
      contract_version: terminalRecovery ? 'merchant-flow-terminal-recovery-operation-v1' : 'merchant-flow-resume-operation-v1',
      operation_kind: 'render_qa_retry',
      flow_id: flow.flow_id,
      job_id: job.id,
      actor_user_id: userId,
      idempotency_key: idempotencyKey,
      expected_flow_sequence: expectedFlowSequence,
      expected_flow_checksum: expectedFlowChecksum,
      expected_job_attempt: job.attempt,
      target_job_attempt: job.attempt + 1,
      legacy_lineage_resolution_id: legacyLineageResolution?.resolution_id || null,
      legacy_lineage_resolution_checksum: legacyLineageResolution?.resolution_checksum || null,
      legacy_lineage_candidate_set_checksum: legacyLineageResolution?.candidate_set_checksum || null,
      terminal_recovery_id: terminalRecovery?.recovery_id || null,
      terminal_recovery_checksum: terminalRecovery?.checksum || null
    };
    const record = {
      id: operationId,
      flow_id: flow.flow_id,
      job_id: job.id,
      project_id: project.id,
      organization_id: project.organization_id,
      actor_user_id: userId,
      operation_kind: request.operation_kind,
      idempotency_key: idempotencyKey,
      request_checksum: digest(request),
      request_id: requestId || null,
      expected_flow_sequence: expectedFlowSequence,
      expected_flow_checksum: expectedFlowChecksum,
      expected_job_attempt: job.attempt,
      target_job_attempt: job.attempt + 1,
      status: 'pending',
      result_flow_sequence: null,
      result_flow_checksum: null,
      result_flow_state: null,
      created_at: at,
      applied_at: null
    };
    const expectedGenerationState = session.generation_state || {};
    const nextGenerationState = { ...expectedGenerationState, merchant_flow: clone(next) };
    let applied;
    try {
      applied = await this.store.applyMerchantFlowResumeOperation({
        record,
        expectedGenerationState,
        nextGenerationState,
        resultFlow: next,
        at,
        expectedSessionUpdatedAt: session.updated_at,
        legacyD27LineageBinding: legacyLineageResolution ? {
          resolution: clone(legacyLineageResolution),
          resume_operation_id: record.id,
          created_at: at
        } : null,
        expectedJobStatus
      });
    } catch (error) {
      const conflict = String(error?.code || '').startsWith('merchant_flow_resume_operation_');
      throw conflict
        ? new DashboardError(error.code, 'The storefront retry changed. Reload its current status before continuing.', 409)
        : error;
    }
    const current = this.flowFromSession(applied.session);
    if (!applied.replayed && typeof this.jobRunner.event === 'function') {
      await this.jobRunner.event({
        flowId: flow.flow_id,
        projectId: project.id,
        organizationId: project.organization_id,
        eventType: 'resume_authorized',
        sequence: next.sequence,
        details: {
          job_id: job.id,
          job_kind: 'render_qa',
          resume_operation_id: record.id,
          operation_id: record.id,
          request_id: record.request_id,
          logical_attempt: record.target_job_attempt,
          legacy_lineage_resolution_id: legacyLineageResolution?.resolution_id,
          legacy_lineage_resolution_checksum: legacyLineageResolution?.resolution_checksum,
          terminal_recovery_id: terminalRecovery?.recovery_id,
          terminal_recovery_checksum: terminalRecovery?.checksum,
          trigger_kind: 'merchant_resume'
        }
      });
    }
    await this.recordTransitions(project, flow, current);
    if (applied.job?.status === 'queued') this.jobRunner.schedule(applied.job);
    return this.result(current, { resumed: true });
  }

  async resume({ userId, projectId, flowId, expectedFlowChecksum = null, expectedFlowSequence = null, idempotencyKey = null, requestId = null }) {
    await this.requireBetaReady();
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    let session = await this.session(projectId);
    let flow = this.flowFromSession(session);
    if (!flow || flow.flow_id !== flowId) throw new DashboardError('merchant_flow_not_found', 'This merchant generation flow is unavailable.', 404);
    await this.assertFlowOwnership(project, flow);
    this.assertControlledShopAllowed(flow.store_context?.shop);
    if (!flow.paid_identity) {
      this.assertResourceReady(session);
      await this.assertContentPlanReady(project, session, flow.store_context?.shop);
    }
    const renderRetry = flow.state === 'failed_retryable'
      && (['shopify_render_failed', 'qa_failed'].includes(flow.failure?.category) || String(flow.failure?.category || '').startsWith('d2_7_'));
    const terminalD27Recovery = isTerminalD27RecoveryCandidate(flow, this.root);
    if (renderRetry || terminalD27Recovery) {
      return this.resumeRenderQa({ project, session, flow, userId, expectedFlowChecksum, expectedFlowSequence, idempotencyKey, requestId });
    }
    if (expectedFlowChecksum && expectedFlowChecksum !== flow.checksum) throw new DashboardError('merchant_flow_stale', 'The merchant generation flow changed. Reload its current status before resuming.', 409);
    flow = resumeMerchantGenerationFlow(flow, this.root);
    if (flow.state === 'failed_retryable' && flow.failure?.category === 'store_intelligence_unavailable') {
      const intakeRevision = typeof this.store.latestMerchantIntakeRevision === 'function' ? await this.store.latestMerchantIntakeRevision(project.id) : null;
      if (intakeRevision && ['usable', 'partial'].includes(intakeRevision.intake_status)) {
        const storeIntelligence = createStoreIntelligenceContract({ revisionId: intakeRevision.revision_id, normalizationVersion: intakeRevision.normalization_version, intelligence: intakeRevision.store_intelligence, status: intakeRevision.intake_status, root: this.root });
        flow = retryStoreIntelligence(flow, storeIntelligence, this.at(), this.root);
        return this.advanceArchitecture(project, session, intakeRevision, flow, { resumed: true });
      }
    }
    if (flow.state === 'generation_running' && flow.generation?.status === 'interrupted') {
      flow = resumeInterruptedGeneration(flow, this.at(), this.root);
      flow = await this.persist(project, session, flow);
      session = await this.session(projectId);
    }
    if (flow.state === 'artifact_ready' && this.runtime?.runRenderQa) {
      flow = this.jobRunner ? await this.enqueueRenderQa(project, flow) : await this.runRenderQa(project, session, flow);
      session = await this.session(projectId);
    }
    return this.result(flow, { resumed: true });
  }

  async requireFrozenArchitecture({ project, session }) {
    const flow = this.flowFromSession(session);
    if (!flow) return null;
    if (flow.state === 'awaiting_material_answer') throw new DashboardError('merchant_flow_material_answer_required', 'Answer the one storefront shopping question before purchasing generation.', 409, { flow: publicFlowStatus(flow, this.root) });
    if (!flow.context.architecture_selection) throw new DashboardError('merchant_flow_architecture_not_frozen', 'Architecture selection must be frozen before Design DNA or generation can continue.', 409, { flow: publicFlowStatus(flow, this.root) });
    return {
      flow,
      architectureSelectionRevision: assertFrozenArchitectureSelection(flow.context.architecture_selection, this.root),
      merchantIntent: clone(flow.context.merchant_intent),
      storeIntelligence: clone(flow.context.store_intelligence)
    };
  }
  async bindDesignAndComposition({ project, session, designDnaRevision, compositionRevision }) {
    let currentSession = session;
    let flow = this.flowFromSession(currentSession);
    if (!flow) return null;
    if (flow.state === 'architecture_frozen') {
      flow = bindDesignDna(flow, designDnaRevision, this.at(), this.root);
      flow = await this.persist(project, currentSession, flow);
      currentSession = await this.session(project.id);
    }
    if (flow.state === 'design_dna_ready') {
      flow = bindComposition(flow, compositionRevision, this.at(), this.root);
      flow = await this.persist(project, currentSession, flow);
    } else if (flow.composition) {
      const expectedRevision = String(compositionRevision?.revision_id || compositionRevision?.composition_id || compositionRevision?.version || '');
      if (!expectedRevision || flow.composition.revision_id !== expectedRevision || flow.composition.checksum !== digest(compositionRevision)) {
        throw new DashboardError('merchant_flow_composition_mismatch', 'The frozen storefront composition no longer matches the current approved inputs.', 409);
      }
    }
    return flow;
  }
  async bindPaidOrder({ project, order }) {
    const session = await this.session(project.id);
    let flow = this.flowFromSession(session);
    if (!flow) return null;
    const paid = { order_id: order.id, purchase_intent_checksum: order.purchase_intent_checksum, snapshot_id: order.snapshot_id || null, snapshot_checksum: order.snapshot_checksum || null };
    if (flow.paid_identity && flow.paid_identity.order_id === paid.order_id && flow.paid_identity.snapshot_id === paid.snapshot_id && flow.paid_identity.snapshot_checksum === paid.snapshot_checksum) return flow;
    flow = bindPaidIdentity(flow, paid, this.at(), this.root);
    return this.persist(project, session, flow);
  }
  async generationStarted({ project, order, generationId }) {
    let session = await this.session(project.id);
    let flow = this.flowFromSession(session);
    if (!flow) return null;
    if (flow.state === 'cancelled') return flow;
    flow = await this.bindPaidOrder({ project, order });
    session = await this.session(project.id);
    if (flow.state === 'generation_running' && flow.generation?.generation_id === generationId) {
      if (flow.generation.status === 'interrupted') flow = resumeInterruptedGeneration(flow, this.at(), this.root);
      else return flow;
    } else if (flow.state === 'failed_retryable' && flow.failure?.category === 'generation_failed') flow = retryGeneration(flow, generationId, this.at(), this.root);
    else flow = startGeneration(flow, generationId, this.at(), this.root);
    return this.persist(project, session, flow);
  }
  async generationFailed({ project, generationId }) {
    const session = await this.session(project.id); let flow = this.flowFromSession(session);
    if (!flow || flow.state === 'failed_retryable' || flow.state === 'cancelled') return flow;
    if (flow.state !== 'generation_running' || flow.generation?.generation_id !== generationId) return flow;
    const { failFlow } = require('../../../../ai/merchant-flow');
    flow = failFlow(flow, 'generation_failed', 'The pinned generation attempt failed and may be retried without changing paid or architecture identity.', true, this.at(), this.root);
    return this.persist(project, session, flow);
  }
  async artifactReady({ project, order, generationId, artifact }) {
    let session = await this.session(project.id);
    let flow = this.flowFromSession(session);
    if (!flow) return null;
    if (flow.state === 'cancelled') return flow;
    if (flow.state === 'artifact_ready' && flow.artifact?.checksum === artifact.checksum) return flow;
    if (flow.state !== 'generation_running' || flow.generation?.generation_id !== generationId) throw new DashboardError('merchant_flow_generation_mismatch', 'Generated artifact does not belong to the active merchant flow.', 409);
    const boundArtifact = this.controlledRuntimeConfiguration?.enabled
      ? createControlledRenderArtifactBinding({ configuration: this.controlledRuntimeConfiguration, flow, artifact })
      : artifact;
    flow = bindArtifact(flow, boundArtifact, this.at(), this.root);
    flow = await this.persist(project, session, flow);
    if (this.runtime?.runRenderQa) {
      flow = this.jobRunner ? await this.enqueueRenderQa(project, flow) : await this.runRenderQa(project, await this.session(project.id), flow);
    }
    return flow;
  }
  async enqueueRenderQa(project, flow) {
    if (!this.jobRunner) return flow;
    const identity = this.renderQaIdentity(flow);
    await this.jobRunner.enqueue({ identity, projectId: project.id, organizationId: project.organization_id, sequence: flow.sequence, payload: { flow_id: flow.flow_id, project_id: project.id, organization_id: project.organization_id, artifact_id: flow.artifact.artifact_id, render_request_id: identity.render_request_id, qa_id: identity.qa_id } });
    return flow;
  }
  async executeRenderQaJob(job, control = null) {
    if (control) await control.checkpoint();
    const project = await this.store.findProjectById(job.project_id);
    if (!project || project.organization_id !== job.organization_id) throw Object.assign(new Error('Flow ownership no longer matches the render job.'), { code: 'merchant_flow_ownership_mismatch', retryable: false });
    let session = await this.session(project.id); let flow = this.flowFromSession(session);
    await this.assertFlowOwnership(project, flow);
    let activeIdentity;
    try { activeIdentity = this.renderQaIdentity(flow); }
    catch { throw Object.assign(new Error('The render job no longer matches the active storefront target.'), { code: 'stale_provenance', retryable: false }); }
    const successor = flow.target_succession;
    const successorPayloadInvalid = successor && (job.payload?.flow_id !== flow.flow_id
      || job.payload?.project_id !== flow.project_id
      || job.payload?.organization_id !== flow.organization_id
      || job.payload?.artifact_id !== flow.artifact.artifact_id
      || job.payload?.render_request_id !== activeIdentity.render_request_id
      || job.payload?.qa_id !== activeIdentity.qa_id
      || job.payload?.operation_id !== successor.succession_id);
    if (job.id !== activeIdentity.job_id
      || job.job_kind !== 'render_qa'
      || job.identity_checksum !== activeIdentity.identity_checksum
      || successorPayloadInvalid) {
      throw Object.assign(new Error('The render job no longer matches the active storefront target.'), { code: 'stale_provenance', retryable: false });
    }
    if (flow?.state === 'cancelled') throw Object.assign(new Error('The merchant flow was cancelled.'), { code: 'merchant_flow_job_cancelled', retryable: false });
    if (['preview_ready', 'qa_review_required', 'repair_review_required'].includes(flow.state) && flow.render_qa) return { flow_id: flow.flow_id, status: flow.state, job_id: job.id, artifact_id: flow.artifact?.artifact_id, qa_id: job.payload.qa_id };
    const alreadyStarted = flow.state === 'render_qa_running';
    if (!alreadyStarted && flow.state !== 'artifact_ready') throw Object.assign(new Error('The render job is stale for the current flow state.'), { code: 'stale_provenance', retryable: false });
    flow = await this.runRenderQa(project, session, flow, { alreadyStarted, control });
    if (flow.state === 'failed_retryable'
      || flow.state === 'failed_terminal' && String(flow.failure?.category || '').startsWith('d2_7_')) {
      const d27Failure = flow.render_qa?.d2_7_failure || null;
      throw Object.assign(new Error('Controlled render or QA failed.'), {
        code: flow.failure?.category || 'shopify_render_failed',
        retryable: flow.failure?.retryable === true,
        d2_7_failure: d27Failure,
        safe_failure_result: d27Failure ? {
          job_id: job.id,
          job_kind: job.job_kind,
          logical_attempt: job.attempt,
          lease_epoch: job.lease_epoch,
          resume_operation_id: job.authorized_resume_operation_id,
          request_id: job.payload?.request_id,
          render_request_id: d27Failure.binding?.render_request_id,
          qa_id: job.payload?.qa_id,
          failure_stage: d27Failure.stage,
          failure_id: d27Failure.failure_id,
          provider_http_status: d27Failure.transport?.http_status,
          provider_error_code: d27Failure.transport?.provider_error_code,
          d2_7_request_id: d27Failure.request?.request_id,
          failure_evidence_id: d27Failure.failure_id,
          failure_evidence_checksum: d27Failure.checksum,
          trigger_kind: job.authorized_resume_operation_id ? 'merchant_resume' : 'initial_execution'
        } : null
      });
    }
    if (flow.state === 'failed_terminal') throw Object.assign(new Error('Controlled render target failed a safety requirement.'), { code: flow.failure?.category || 'stale_provenance', retryable: false });
    return { flow_id: flow.flow_id, status: flow.state, job_id: job.id, artifact_id: flow.artifact?.artifact_id, qa_id: job.payload.qa_id };
  }
  async runRenderQa(project, session, flow, { alreadyStarted = false, control = null } = {}) {
    if (control) await control.checkpoint();
    let next = alreadyStarted ? flow : startRenderQa(flow, this.at(), this.root);
    if (!alreadyStarted) next = await this.persist(project, session, next);
    try {
      if (control) await control.checkpoint();
      const renderQa = await this.runtime.runRenderQa({ flow: clone(next), artifact: clone(next.artifact), root: this.root, control });
      if (control) await control.checkpoint();
      next = completeRenderQa(next, renderQa, this.at(), this.root);
    } catch (error) {
      if (error?.code === 'merchant_flow_job_cancelled') throw error;
      const targetSafetyFailure = ['merchant_flow_live_theme_target_forbidden', 'merchant_flow_shop_target_mismatch'].includes(error?.code)
        || (String(error?.code || '').startsWith('controlled_beta_') && error?.retryable === false);
      if (targetSafetyFailure) {
        const { failFlow } = require('../../../../ai/merchant-flow');
        const d27EvidenceFailure = String(error?.code || '').startsWith('controlled_beta_d2_7_');
        const category = d27EvidenceFailure
          ? 'stale_provenance'
          : ['merchant_flow_live_theme_target_forbidden', 'merchant_flow_shop_target_mismatch'].includes(error?.code)
            ? error.code
            : 'controlled_beta_target_verification_failed';
        const message = d27EvidenceFailure
          ? 'The saved render, D1, or D2.7 evidence no longer matches the frozen execution provenance.'
          : 'The controlled Shopify target failed the non-live ownership safety check.';
        next = failFlow(next, category, message, false, this.at(), this.root);
        return this.persist(project, await this.session(project.id), next);
      }
      if (error?.render_qa?.d2_7_failure) {
        next = completeRenderQa(next, error.render_qa, this.at(), this.root);
      } else {
      const failure = {
        status: 'failed', render_revision: 'merchant-flow-render-qa-v1', render_result_ids: ['render-unavailable'], render_checksum: digest({ flow_id: next.flow_id, status: 'failed' }),
        d1: { status: 'failed', evidence_id: null, evidence_checksum: null }, d2_7: { status: 'not_required', evidence_id: null, evidence_checksum: null }, human_review_required: false
      };
      next = completeRenderQa(next, failure, this.at(), this.root);
      }
    }
    if (control) await control.checkpoint();
    try {
      return await this.persist(project, await this.session(project.id), next);
    } catch (error) {
      if (error?.code === 'merchant_flow_stale') {
        const current = this.flowFromSession(await this.session(project.id));
        if (current?.state === 'cancelled') throw Object.assign(new Error('The merchant flow was cancelled.'), { code: 'merchant_flow_job_cancelled', retryable: false });
      }
      throw error;
    }
  }

  operatorResult(flow, operation, replayed = false) {
    return {
      operation: {
        operation_id: operation.id,
        operation_kind: operation.operation_kind,
        status: operation.status,
        result_flow_sequence: operation.result_flow_sequence,
        result_flow_checksum: operation.result_flow_checksum,
        result_flow_state: operation.result_flow_state,
        applied_at: operation.applied_at
      },
      flow: publicFlowStatus(flow, this.root),
      replayed: Boolean(replayed)
    };
  }

  async emitOperatorEvent({ project, flow, eventType, details = {} }) {
    if (!this.jobRunner || !project || !flow) return;
    await this.jobRunner.event({
      flowId: flow.flow_id,
      projectId: project.id,
      organizationId: project.organization_id,
      eventType,
      sequence: flow.sequence,
      details: { flow_id: flow.flow_id, project_id: project.id, organization_id: project.organization_id, sequence: flow.sequence, status: flow.state, ...details }
    });
  }

  async applyOperatorOperation({ projectId, userId, flowId, request }) {
    let operationRequest = null;
    let project = null;
    let flow = null;
    try {
      project = await this.store.findProjectById(projectId);
      if (!this.operatorAuthorization) throw new DashboardError('merchant_flow_operator_unavailable', 'The controlled beta operator service is unavailable.', 503);
      ({ project } = await this.operatorAuthorization.authorize({ userId, projectId }));
      const session = await this.session(projectId);
      flow = this.flowFromSession(session);
      if (!flow || flow.flow_id !== flowId) throw new DashboardError('merchant_flow_not_found', 'This merchant generation flow is unavailable.', 404);
      ({ project } = await this.operatorAuthorization.authorize({ userId, projectId, flow }));
      await this.assertFlowOwnership(project, flow);
      this.assertControlledShopAllowed(flow.store_context?.shop);
      operationRequest = assertOperatorOperationRequest(request, this.root);

      const existing = await this.store.findMerchantFlowOperatorOperation(
        flow.flow_id,
        operationRequest.operation_kind,
        operationRequest.idempotency_key,
        project.id,
        project.organization_id
      );
      if (existing) {
        if (existing.request_checksum !== digest(operationRequest) || existing.actor_user_id !== String(userId)) {
          throw Object.assign(new Error('The idempotency key is already bound to another operator request.'), { code: 'merchant_flow_operator_operation_idempotency_conflict' });
        }
        if (existing.status !== 'applied') throw Object.assign(new Error('The operator operation is still pending.'), { code: 'merchant_flow_operator_operation_pending' });
        if (operationRequest.operation_kind === 'cancel' && this.jobRunner) {
          await this.jobRunner.requestCancellation({ flowId: flow.flow_id, projectId: project.id, organizationId: project.organization_id, sequence: flow.sequence });
        }
        if (operationRequest.operation_kind === 'cancel' && this.cancellationProjector) {
          await this.cancellationProjector({ project, flow });
        }
        return this.operatorResult(flow, existing, true);
      }

      if (operationRequest.operation_kind !== 'cancel') {
        if (!this.operatorEvidenceResolver?.verify) {
          throw new DashboardError('merchant_flow_operator_evidence_resolver_unavailable', 'The checksum-bound operator evidence verifier is unavailable.', 503);
        }
        await this.operatorEvidenceResolver.verify({ flow, request: operationRequest });
      }

      const at = this.at();
      const record = createOperatorOperationRecord({ request: operationRequest, flow, projectId: project.id, organizationId: project.organization_id, actorUserId: userId, createdAt: at, root: this.root });
      let next;
      if (operationRequest.operation_kind === 'qa_review') {
        next = recordQaReview(flow, {
          review_id: operationRequest.evidence.review.id,
          checksum: operationRequest.evidence.review.checksum,
          decision: operationRequest.decision,
          repair_class: operationRequest.evidence.repair_class || null,
          provenance: {
            operation_id: record.id,
            actor_user_id: userId,
            evaluation: operationRequest.evidence.evaluation
          }
        }, at, this.root);
      } else if (operationRequest.operation_kind === 'repair_resolution') {
        next = recordRepairResolution(flow, {
          repair_class: operationRequest.evidence.repair_class,
          status: operationRequest.decision,
          evidence_id: operationRequest.evidence.final_state.id,
          evidence_checksum: operationRequest.evidence.final_state.checksum,
          human_approved: operationRequest.decision === 'human_approved',
          post_repair_qa_passed: operationRequest.decision === 'human_approved',
          automatic_execution: false,
          provenance: {
            operation_id: record.id,
            actor_user_id: userId,
            repair_plan: operationRequest.evidence.repair_plan,
            plan_approval: operationRequest.evidence.plan_approval,
            repair_execution: operationRequest.evidence.repair_execution,
            post_repair_qa: operationRequest.evidence.post_repair_qa,
            final_human_review: operationRequest.evidence.final_human_review,
            final_state: operationRequest.evidence.final_state
          }
        }, at, this.root);
      } else {
        next = cancelMerchantGenerationFlow(flow, {
          operation_id: record.id,
          actor_user_id: userId,
          reason_code: operationRequest.evidence.reason_code
        }, at, this.root);
      }

      const expectedGenerationState = session.generation_state || {};
      const nextGenerationState = { ...expectedGenerationState, merchant_flow: clone(next) };
      const applied = await this.store.applyMerchantFlowOperatorOperation({ record, expectedGenerationState, nextGenerationState, resultFlow: next, at });
      const current = this.flowFromSession(applied.session);
      if (!applied.replayed) await this.recordTransitions(project, flow, current);

      if (operationRequest.operation_kind === 'cancel' && this.jobRunner) {
        await this.jobRunner.requestCancellation({ flowId: current.flow_id, projectId: project.id, organizationId: project.organization_id, sequence: current.sequence });
      }
      if (operationRequest.operation_kind === 'cancel' && this.cancellationProjector) {
        await this.cancellationProjector({ project, flow: current });
      }
      const eventType = operationRequest.operation_kind === 'qa_review'
        ? 'founder_qa_review_submitted'
        : operationRequest.operation_kind === 'repair_resolution'
          ? 'repair_resolution_submitted'
          : 'flow_cancellation_requested';
      await this.emitOperatorEvent({ project, flow: current, eventType, details: { operation_id: applied.operation.id, actor_user_id: userId, decision: operationRequest.decision, reason_code: operationRequest.evidence.reason_code } });
      return this.operatorResult(current, applied.operation, applied.replayed);
    } catch (error) {
      if (project && flow) {
        const eventType = error?.code === 'merchant_flow_operator_forbidden' ? 'operator_authorization_failed' : 'invalid_operator_operation';
        await this.emitOperatorEvent({ project, flow, eventType, details: { actor_user_id: userId, status: flow.state } }).catch(() => {});
      } else if (project && error?.code === 'merchant_flow_operator_forbidden' && typeof this.store.createActivity === 'function') {
        await this.store.createActivity({
          id: createId('act'), organization_id: project.organization_id, project_id: project.id,
          actor_user_id: userId, type: 'merchant_flow_operator_authorization_failed', payload: {}, created_at: this.at()
        }).catch(() => {});
      }
      if (error instanceof DashboardError) throw error;
      const code = String(error?.code || 'merchant_flow_operator_operation_invalid');
      const authorizationFailure = code === 'merchant_flow_operator_forbidden';
      const conflict = code.includes('stale') || code.includes('conflict') || code.includes('state')
        || code === 'merchant_flow_cancellation_forbidden' || code === 'merchant_flow_operator_operation_pending'
        || code.includes('evidence_missing') || code.includes('checksum_mismatch') || code.includes('scope_mismatch');
      const status = authorizationFailure ? 403 : conflict ? 409 : 422;
      throw new DashboardError(code, status === 403 ? 'This operator action is not authorized.' : 'The operator decision could not be applied to the current flow.', status);
    }
  }

  async applyQaReview({ projectId, userId, flowId, request }) {
    return this.applyOperatorOperation({ projectId, userId, flowId, request: { ...request, operation_kind: 'qa_review' } });
  }

  async recoverQaReviewEvidence({ projectId, userId, flowId, request }) {
    let project = null;
    let flow = null;
    try {
      if (!this.operatorAuthorization || typeof this.operatorEvidenceResolver?.recoverQaReviewEvidence !== 'function') {
        throw new DashboardError('merchant_flow_founder_qa_recovery_unavailable', 'Founder-review evidence recovery is unavailable.', 503);
      }
      const session = await this.session(projectId);
      flow = this.flowFromSession(session);
      if (!flow || flow.flow_id !== flowId) throw new DashboardError('merchant_flow_not_found', 'This merchant generation flow is unavailable.', 404);
      const authorized = await this.operatorAuthorization.authorize({ userId, projectId, flow });
      project = authorized.project;
      await this.assertFlowOwnership(project, flow);
      this.assertControlledShopAllowed(flow.store_context?.shop);
      const before = { state: flow.state, sequence: flow.sequence, checksum: flow.checksum };
      const recovered = await this.operatorEvidenceResolver.recoverQaReviewEvidence({ flow, request, operator: authorized.operator });
      const current = this.flowFromSession(await this.session(projectId));
      if (!current || current.flow_id !== flow.flow_id || current.state !== before.state
        || current.sequence !== before.sequence || current.checksum !== before.checksum) {
        throw Object.assign(new Error('The merchant flow changed while founder-review evidence was being recovered.'), { code: 'merchant_flow_founder_qa_recovery_stale' });
      }
      if (!recovered.replayed) {
        await this.emitOperatorEvent({
          project,
          flow: current,
          eventType: 'founder_qa_evidence_recovered',
          details: { recovery_id: recovered.record.recovery_id, actor_user_id: userId, status: current.state }
        });
      }
      return {
        operation: {
          operation_id: recovered.record.recovery_id,
          operation_checksum: recovered.record.recovery_checksum,
          status: 'applied',
          applied_at: recovered.record.created_at
        },
        flow: publicFlowStatus(current, this.root),
        replayed: Boolean(recovered.replayed)
      };
    } catch (error) {
      if (error instanceof DashboardError) throw error;
      const code = String(error?.code || 'merchant_flow_founder_qa_recovery_invalid');
      const conflict = code.includes('stale') || code.includes('conflict') || code.includes('mismatch') || code.includes('ambiguous');
      throw new DashboardError(code, 'The saved founder-review evidence could not be recovered.', conflict ? 409 : 422);
    }
  }

  async previewProvenanceRecoveries(flow) {
    if (!flow || typeof this.store.listMerchantFlowPreviewProvenanceRecoveries !== 'function') return [];
    return this.store.listMerchantFlowPreviewProvenanceRecoveries(flow.flow_id, flow.project_id, flow.organization_id);
  }

  async resolveDirectShopifyPreview({ userId, projectId, operation = 'read', generatedBuildId = null } = {}) {
    if (!this.controlledRuntimeConfiguration?.enabled) return { applies: false, result: null };
    const project = await this.authorize({ userId, projectId });
    const session = await this.store.findCreativeDirectorForProject(projectId);
    const storedFlow = session?.generation_state?.merchant_flow || null;
    if (!storedFlow) return { applies: false, result: null };
    let flow;
    try { flow = this.flowFromSession(session); }
    catch {
      throw new DashboardError('merchant_flow_preview_binding_invalid', 'The controlled storefront preview is unavailable.', 409);
    }
    await this.assertFlowOwnership(project, flow);
    const canonicalShop = this.assertControlledShopAllowed(flow.store_context?.shop);
    if (!this.previewBindingResolver || typeof this.previewBindingResolver.resolve !== 'function') {
      throw new DashboardError('merchant_flow_preview_binding_unavailable', 'The controlled storefront preview is unavailable.', 503);
    }
    if (!['preview_ready', 'merchant_action_required', 'completed'].includes(flow.state)) {
      throw new DashboardError('merchant_flow_preview_not_ready', 'The controlled storefront preview is not ready.', 409);
    }
    if (operation === 'prepare') {
      const requestedBuildId = String(generatedBuildId || '').trim();
      const generationId = String(flow.generation?.generation_id || '').trim();
      const artifactGenerationId = String(flow.artifact?.generation_id || '').trim();
      if (!requestedBuildId) {
        throw new DashboardError('merchant_flow_preview_build_required', 'The active controlled storefront build is required.', 422);
      }
      if (!generationId || !artifactGenerationId || generationId !== artifactGenerationId || requestedBuildId !== generationId) {
        throw new DashboardError('merchant_flow_preview_build_mismatch', 'The requested storefront build is not the active controlled artifact.', 409);
      }
    }
    const provenanceRecoveries = await this.previewProvenanceRecoveries(flow);
    const resolution = this.previewBindingResolver.resolve({
      flow,
      project,
      canonicalShop,
      connectionId: flow.store_context?.connection_id,
      provenanceRecoveries
    });
    if (resolution?.reason_code === 'render_target_superseded') {
      throw new DashboardError('render_target_superseded', 'The controlled storefront preview target has been superseded.', 409);
    }
    const preview = merchantSafePreview(resolution);
    if (!preview) {
      throw new DashboardError('merchant_flow_preview_binding_unavailable', 'The controlled storefront preview is unavailable.', 409);
    }
    return {
      applies: true,
      result: {
        preview: {
          ...preview,
          generated_build_id: flow.generation?.generation_id || flow.artifact?.generation_id || null
        },
        connection: {
          id: flow.store_context.connection_id,
          shop_domain: canonicalShop
        },
        authoritative_source: 'merchant_flow_preview_binding',
        write_performed: false,
        verification_required: false,
        deployment_eligible: false
      }
    };
  }

  async recoverPreviewProvenance({ projectId, userId, request, requestId = null }) {
    let project = null;
    let flow = null;
    let failureStage = 'availability';
    try {
      if (!this.operatorAuthorization || !this.previewBindingResolver || typeof this.previewBindingResolver.createRecovery !== 'function') {
        throw new DashboardError('merchant_flow_preview_provenance_recovery_unavailable', 'Preview recovery is unavailable.', 503);
      }
      if (typeof this.store.createMerchantFlowPreviewProvenanceRecovery !== 'function'
        || typeof this.store.applyMerchantFlowPreviewProvenanceRecovery !== 'function') {
        throw new DashboardError('merchant_flow_preview_provenance_recovery_persistence_unavailable', 'Preview recovery is unavailable.', 503);
      }
      await this.requireBetaReady();
      failureStage = 'flow_resolution';
      let session = await this.session(projectId);
      flow = this.flowFromSession(session);
      if (!flow) throw new DashboardError('merchant_flow_not_found', 'This merchant generation flow is unavailable.', 404);
      failureStage = 'authorization';
      const authorized = await this.operatorAuthorization.authorize({ userId, projectId, flow });
      project = authorized.project;
      await this.assertFlowOwnership(project, flow);
      this.assertControlledShopAllowed(flow.store_context?.shop);
      const before = { flow_id: flow.flow_id, sequence: flow.sequence, checksum: flow.checksum, state: flow.state };
      failureStage = 'evidence_resolution';
      const records = await this.previewProvenanceRecoveries(flow);
      const freshSession = await this.session(projectId);
      const freshFlow = this.flowFromSession(freshSession);
      if (!freshFlow || freshFlow.flow_id !== flow.flow_id || freshFlow.sequence !== before.sequence
        || freshFlow.checksum !== before.checksum || freshFlow.state !== before.state) {
        throw new DashboardError('merchant_flow_preview_provenance_recovery_stale', 'Reload the current preview before recovering it.', 409);
      }
      failureStage = 'record_construction';
      const record = this.previewBindingResolver.createRecovery({
        flow: freshFlow,
        project,
        canonicalShop: freshFlow.store_context?.shop,
        connectionId: freshFlow.store_context?.connection_id,
        operator: authorized.operator,
        request,
        provenanceRecoveries: records,
        createdAt: this.at()
      });
      failureStage = 'persistence';
      const persisted = await this.store.applyMerchantFlowPreviewProvenanceRecovery({
        record,
        expectedFlow: before,
        expectedSessionUpdatedAt: freshSession.updated_at
      });
      failureStage = 'post_write_verification';
      session = await this.session(projectId);
      const current = this.flowFromSession(session);
      if (!current || current.flow_id !== flow.flow_id || current.sequence !== before.sequence
        || current.checksum !== before.checksum || current.state !== before.state) {
        throw new DashboardError('merchant_flow_preview_provenance_recovery_stale', 'The preview changed while provenance was being recovered.', 409);
      }
      const retained = await this.previewProvenanceRecoveries(current);
      const resolved = this.previewBindingResolver.resolve({
        flow: current,
        project,
        canonicalShop: current.store_context?.shop,
        connectionId: current.store_context?.connection_id,
        provenanceRecoveries: retained
      });
      if (resolved.status !== 'available' || resolved.source !== 'legacy_provenance_recovery') {
        throw new DashboardError('merchant_flow_preview_provenance_recovery_post_write_invalid', 'The recovered preview could not be verified.', 409);
      }
      if (typeof this.emitOperatorEvent === 'function' && persisted.created) {
        await this.emitOperatorEvent({
          project,
          flow: current,
          eventType: 'preview_provenance_recovered',
          details: { recovery_id: record.recovery_id, actor_user_id: userId, status: current.state }
        });
      }
      return {
        operation: { operation_id: record.recovery_id, operation_checksum: record.recovery_checksum, status: 'applied', applied_at: record.created_at },
        flow: publicFlowStatus(current, this.root),
        replayed: !persisted.created
      };
    } catch (error) {
      const normalized = previewProvenanceRecoveryDashboardError(error, { stageHint: failureStage, requestId });
      const boundedRequestId = safeRequestId(requestId);
      if (project && flow && String(normalized?.code || '').startsWith('merchant_flow_preview_provenance_recovery_')) {
        await this.emitOperatorEvent({
          project,
          flow,
          eventType: 'preview_provenance_recovery_rejected',
          details: {
            operation_type: 'preview_provenance_recovery',
            failure_stage: normalized.details?.stage || failureStage,
            error_code: normalized.code,
            http_status: normalized.status,
            retryable: normalized.details?.retryable === true,
            ...(boundedRequestId ? { request_id: boundedRequestId } : {})
          }
        }).catch(() => {});
      }
      throw normalized;
    }
  }

  async succeedRenderTarget({ projectId, userId, request }) {
    if (!this.operatorAuthorization || !this.renderTargetSuccessionResolver
      || typeof this.renderTargetSuccessionResolver.verify !== 'function'
      || typeof this.store.applyMerchantFlowRenderTargetSuccession !== 'function') {
      throw new DashboardError('merchant_flow_render_target_succession_unavailable', 'Preview-target revalidation is unavailable.', 503);
    }
    let submission;
    try { submission = assertRenderTargetSuccessionSubmission(request); }
    catch (error) { throw new DashboardError(error.code || 'merchant_flow_render_target_succession_submission_invalid', 'Reload the current preview-target status before continuing.', 422); }

    let session = await this.session(projectId);
    let flow = this.flowFromSession(session);
    if (!flow || flow.flow_id !== submission.flow_id) throw new DashboardError('merchant_flow_not_found', 'This merchant generation flow is unavailable.', 404);
    const authorized = await this.operatorAuthorization.authorize({ userId, projectId, flow });
    const project = authorized.project;
    await this.assertFlowOwnership(project, flow);
    this.assertControlledShopAllowed(flow.store_context?.shop);

    const existing = typeof this.store.findMerchantFlowRenderTargetSuccession === 'function'
      ? await this.store.findMerchantFlowRenderTargetSuccession(flow.flow_id, submission.idempotency_key, project.id, project.organization_id)
      : null;
    if (existing) {
      const retained = existing.record;
      if (!retained || retained.operator.actor_user_id !== String(userId)
        || retained.flow.expected_sequence !== submission.expected_flow_sequence
        || retained.flow.expected_checksum !== submission.expected_flow_checksum
        || retained.submission.request_checksum !== digest(submission)) {
        throw new DashboardError('merchant_flow_render_target_succession_idempotency_conflict', 'This preview-target action belongs to another authoritative revision.', 409);
      }
      if (existing.status !== 'applied') throw new DashboardError('merchant_flow_render_target_succession_pending', 'The preview target is already being revalidated.', 409);
      const currentSession = await this.session(project.id);
      const currentFlow = this.flowFromSession(currentSession);
      if (!currentFlow || currentFlow.flow_id !== retained.flow.flow_id
        || currentFlow.sequence !== existing.result_flow_sequence
        || currentFlow.checksum !== existing.result_flow_checksum
        || currentFlow.state !== existing.result_flow_state) {
        throw new DashboardError('merchant_flow_render_target_succession_replay_stale', 'The applied preview-target result has advanced. Reload its current status.', 409);
      }
      const job = await this.store.findMerchantFlowJob(retained.successor_job.job_id, project.id, project.organization_id);
      if (job?.status === 'queued') this.jobRunner?.schedule(job);
      return {
        operation: { operation_id: retained.succession_id, operation_checksum: retained.succession_checksum, status: 'applied', applied_at: existing.applied_at },
        flow: publicFlowStatus(currentFlow, this.root),
        replayed: true
      };
    }

    if (flow.state !== 'preview_ready'
      || flow.sequence !== submission.expected_flow_sequence
      || flow.checksum !== submission.expected_flow_checksum) {
      throw new DashboardError('merchant_flow_render_target_succession_stale', 'Reload the current preview-target status before continuing.', 409);
    }
    const readiness = await this.requireBetaReady();
    let verified;
    try { verified = await this.renderTargetSuccessionResolver.verify({ flow, readiness }); }
    catch (error) {
      const code = String(error?.code || 'merchant_flow_render_target_succession_verification_failed');
      const status = code.endsWith('_not_eligible') || code.endsWith('_old_target_present') ? 409
        : code.endsWith('_verifier_unavailable') ? 503 : 422;
      throw new DashboardError(code, 'The successor preview target could not be verified safely.', status);
    }
    if (digest(verified.prepared.request) !== digest(submission)) {
      throw new DashboardError('merchant_flow_render_target_succession_stale', 'Reload the current preview-target status before continuing.', 409);
    }
    const at = this.at();
    const record = createRenderTargetSuccessionRecord({
      flow,
      successorBinding: verified.successor_binding,
      priorAuthority: verified.verification.prior_authority,
      successorAuthority: verified.verification.successor_authority,
      mainThemeId: verified.verification.main_target.theme_id,
      shopifyInventory: verified.verification.shopify_inventory,
      mainAuthority: verified.verification.main_authority,
      source: verified.source,
      readiness: verified.readiness,
      operator: authorized.operator,
      submission,
      createdAt: at,
      root: this.root
    });
    const nextFlow = applyRenderTargetSuccession(flow, record, at, this.root);
    const expectedGenerationState = clone(session.generation_state || {});
    const nextGenerationState = { ...expectedGenerationState, merchant_flow: nextFlow };
    const identity = this.renderQaIdentity(nextFlow);
    const job = {
      id: identity.job_id,
      flow_id: flow.flow_id,
      project_id: project.id,
      organization_id: project.organization_id,
      job_kind: 'render_qa',
      identity_checksum: identity.identity_checksum,
      status: 'queued',
      attempt: 0,
      lease_epoch: 0,
      payload: {
        flow_id: flow.flow_id,
        project_id: project.id,
        organization_id: project.organization_id,
        artifact_id: flow.artifact.artifact_id,
        render_request_id: identity.render_request_id,
        qa_id: identity.qa_id,
        operation_id: record.succession_id
      },
      result: null,
      lease_token: null,
      lease_expires_at: null,
      failure_category: null,
      failure_message: null,
      created_at: at,
      updated_at: at,
      completed_at: null
    };
    let applied;
    try {
      applied = await this.store.applyMerchantFlowRenderTargetSuccession({
        record,
        expectedGenerationState,
        nextGenerationState,
        resultFlow: nextFlow,
        job,
        at,
        expectedSessionUpdatedAt: session.updated_at
      });
    } catch (error) {
      const code = String(error?.code || 'merchant_flow_render_target_succession_persistence_failed');
      const status = code.includes('stale') || code.includes('conflict') || code.includes('pending') ? 409 : 503;
      throw new DashboardError(code, 'The preview target could not be changed safely.', status);
    }
    if (applied.job?.status === 'queued') this.jobRunner?.schedule(applied.job);
    if (!applied.replayed && typeof this.emitOperatorEvent === 'function') {
      await this.emitOperatorEvent({
        project,
        flow: nextFlow,
        eventType: 'render_target_succession_applied',
        details: { operation_id: record.succession_id, job_id: record.successor_job.job_id, job_kind: 'render_qa', status: nextFlow.state }
      });
    }
    return {
      operation: { operation_id: record.succession_id, operation_checksum: record.succession_checksum, status: 'applied', applied_at: applied.operation.applied_at },
      flow: publicFlowStatus(nextFlow, this.root),
      replayed: Boolean(applied.replayed)
    };
  }

  async applyRepairResolution({ projectId, userId, flowId, request }) {
    return this.applyOperatorOperation({ projectId, userId, flowId, request: { ...request, operation_kind: 'repair_resolution' } });
  }

  async cancel({ projectId, userId, flowId, request }) {
    return this.applyOperatorOperation({ projectId, userId, flowId, request: { ...request, operation_kind: 'cancel' } });
  }

  async operatorReadiness({ projectId, userId, readiness = null, readinessLoader = null }) {
    if (!this.operatorAuthorization) throw new DashboardError('merchant_flow_operator_unavailable', 'The controlled beta operator service is unavailable.', 503);
    const session = await this.store.findCreativeDirectorForProject(projectId);
    const flow = this.flowFromSession(session);
    await this.operatorAuthorization.authorize({ userId, projectId, flow });
    const resolved = readiness || (typeof readinessLoader === 'function' ? await readinessLoader() : null);
    if (!resolved) throw new DashboardError('controlled_beta_readiness_unavailable', 'Controlled beta readiness is unavailable.', 503);
    const qaReviewSubmission = typeof this.operatorEvidenceResolver?.prepareQaReviewSubmission === 'function'
      ? await this.operatorEvidenceResolver.prepareQaReviewSubmission({ flow })
      : { contract_version: 'merchant-flow-founder-qa-submission-v1', available: false };
    const qaReviewRecovery = typeof this.operatorEvidenceResolver?.prepareQaReviewRecoverySubmission === 'function'
      ? await this.operatorEvidenceResolver.prepareQaReviewRecoverySubmission({ flow })
      : { contract_version: 'merchant-flow-founder-qa-evidence-recovery-submission-v1', available: false };
    const provenanceRecoveries = await this.previewProvenanceRecoveries(flow);
    const previewProvenanceRecovery = this.previewBindingResolver?.prepareRecovery
      ? this.previewBindingResolver.prepareRecovery({
        flow,
        project: (await this.store.findProjectById(projectId)),
        canonicalShop: flow?.store_context?.shop,
        connectionId: flow?.store_context?.connection_id,
        provenanceRecoveries
      })
      : { contract_version: 'merchant-flow-preview-provenance-recovery-submission-v1', available: false };
    const renderTargetSuccession = this.renderTargetSuccessionResolver?.prepare
      ? this.renderTargetSuccessionResolver.prepare({ flow, readiness: resolved })
      : { contract_version: 'merchant-flow-render-target-succession-submission-v1', available: false };
    return { ...resolved, qa_review_recovery: qaReviewRecovery, qa_review_submission: qaReviewSubmission, preview_provenance_recovery: previewProvenanceRecovery, render_target_succession: renderTargetSuccession };
  }

  async operatorReadinessRefresh({ projectId, userId, refresh = null }) {
    if (!this.operatorAuthorization) throw new DashboardError('merchant_flow_operator_unavailable', 'The controlled beta operator service is unavailable.', 503);
    const session = await this.store.findCreativeDirectorForProject(projectId);
    const flow = this.flowFromSession(session);
    await this.operatorAuthorization.authorize({ userId, projectId, flow });
    if (typeof refresh !== 'function') throw new DashboardError('controlled_beta_readiness_refresh_unavailable', 'Controlled beta readiness refresh is unavailable.', 503);
    const operation = refresh({ trigger: 'operator' });
    if (!operation || !operation.operation_id) throw new DashboardError('controlled_beta_readiness_refresh_unavailable', 'Controlled beta readiness refresh is unavailable.', 503);
    return {
      schema_version: '1.0',
      refresh_revision: 'controlled-beta-readiness-refresh-v1',
      status: operation.status === 'running' ? 'ACCEPTED' : 'NOT_ACCEPTED',
      operation_id: operation.operation_id,
      trigger: 'operator',
      started_at: operation.started_at,
      reused: operation.reused === true
    };
  }

  async operatorReadinessAvailable({ projectId, userId }) {
    if (!this.operatorAuthorization) return false;
    const session = await this.store.findCreativeDirectorForProject(projectId);
    const flow = this.flowFromSession(session);
    try {
      await this.operatorAuthorization.authorize({ userId, projectId, flow });
      return true;
    } catch (error) {
      if (['merchant_flow_operator_forbidden', 'merchant_flow_operator_scope_not_found'].includes(error?.code)) return false;
      throw error;
    }
  }
}

module.exports = { MerchantGenerationFlowService, previewProvenanceRecoveryDashboardError };
