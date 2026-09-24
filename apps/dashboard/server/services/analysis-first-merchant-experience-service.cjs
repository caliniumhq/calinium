'use strict';

const crypto = require('crypto');
const { DashboardError } = require('../lib/errors.cjs');
const { isoNow } = require('../lib/serialization.cjs');
const { questionById } = require('../../../../ai/conversation/question-planner');
const { merchantSafePreview } = require('./merchant-flow-preview-binding-resolver.cjs');
const {
  loadCapability,
  createMerchantVisualBriefing,
  createAnalysisFirstJourney,
  projectMerchantJourney,
  createDirectionChoiceRequest,
  submitDirectionChoice,
  createTelemetryEvent,
  TELEMETRY_EVENTS
} = require('../../../../ai/merchant-experience');

const RESPONSE_VERSION = 'analysis-first-merchant-experience-response-v1';
const SUPPORTED_SESSION_STAGES = new Set([
  'landing', 'conversation', 'understanding', 'blueprint', 'strategy', 'preset',
  'resources', 'content-plan', 'offer', 'generation', 'delivery', 'preview', 'finish'
]);
const COMMERCIAL_STAGES = new Set(['offer', 'generation', 'delivery', 'preview', 'finish']);
const PREVIEW_STATES = new Set(['preview_ready', 'merchant_action_required', 'completed']);
const DIRECTION_ANSWERS = Object.freeze({
  visual_story_led: 'Visual and story-led',
  direct_efficient: 'Direct and efficient'
});

function normalizeShop(value) {
  return String(value || '').trim().toLowerCase();
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function safePreviewUrl(value, expectedShop) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || normalizeShop(url.hostname) !== normalizeShop(expectedShop)) return null;
    for (const name of url.searchParams.keys()) {
      if (/(?:password|token|secret|credential|authorization|access[_-]?key)/i.test(name)) return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function essentialDetailFor(session) {
  if (session?.stage !== 'conversation') return null;
  const question = questionById(session?.conversation_state?.currentQuestionId);
  if (!question?.critical) return null;
  return { question_id: question.id, prompt: question.prompt };
}

function selectedDirectionId(selection) {
  if (selection?.profile_id === 'profile.editorial_discovery.v1') return 'visual_story_led';
  if (selection?.profile_id === 'profile.current_calinium.v1') return 'direct_efficient';
  return null;
}

class AnalysisFirstMerchantExperienceService {
  constructor({
    root,
    store,
    projectService,
    merchantFlowService,
    previewBindingResolver = null,
    enabled = false,
    bindingSecret = null,
    clock = () => new Date()
  }) {
    this.root = root;
    this.store = store;
    this.projectService = projectService;
    this.merchantFlowService = merchantFlowService;
    this.previewBindingResolver = previewBindingResolver;
    this.enabled = enabled === true;
    this.bindingSecret = String(bindingSecret || '');
    this.clock = clock;
    this.directionLocks = new Map();
    // Loading the F1-A capability verifies that the approved source boundary
    // remains disabled and non-mutating. Runtime activation is a later,
    // separately controlled environment decision.
    this.capability = loadCapability(root);
    if (this.enabled && this.bindingSecret.length < 32) {
      throw new DashboardError('analysis_first_binding_secret_missing', 'The simplified merchant experience is not configured safely.', 503);
    }
  }

  now() { return isoNow(this.clock); }

  requireEnabled() {
    if (!this.enabled) throw new DashboardError('analysis_first_experience_disabled', 'The simplified merchant experience is not enabled.', 404);
  }

  async authorize({ userId, projectId, permission = 'project:view' }) {
    const project = await this.store.findProjectById(projectId);
    if (!project) throw new DashboardError('project_not_found', 'Project not found.', 404);
    await this.projectService.requireMembership(project.organization_id, userId, permission);
    return project;
  }

  opaqueBinding(kind, projectId, source) {
    return `f1b_${crypto.createHmac('sha256', this.bindingSecret).update(JSON.stringify({ kind, project_id: projectId, source })).digest('base64url')}`;
  }

  bindingMatches(actual, expected) {
    const left = Buffer.from(String(actual || ''));
    const right = Buffer.from(String(expected || ''));
    return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
  }

  async resourceContentEligible(project, session, shop) {
    if (!this.merchantFlowService) return false;
    try {
      this.merchantFlowService.assertResourceReady(session);
      await this.merchantFlowService.assertContentPlanReady(project, session, shop);
      return true;
    } catch {
      return false;
    }
  }

  async authoritativeContext({ userId, projectId, permission = 'project:view' }) {
    this.requireEnabled();
    const project = await this.authorize({ userId, projectId, permission });
    const [session, assignment] = await Promise.all([
      this.store.findCreativeDirectorForProject(project.id),
      this.store.findProjectShopifyConnection(project.id, project.organization_id)
    ]);
    if (!session || !SUPPORTED_SESSION_STAGES.has(session.stage) || !assignment?.connection) {
      return { project, session, assignment, eligible: false };
    }
    const shop = normalizeShop(assignment.connection.shop_domain);
    if (!shop || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
      return { project, session, assignment, eligible: false };
    }
    const flow = this.merchantFlowService?.flowFromSession(session) || null;
    if (flow) {
      await this.merchantFlowService.assertFlowOwnership(project, flow);
      if (normalizeShop(flow.store_context?.shop) !== shop) {
        throw new DashboardError('analysis_first_shop_mismatch', 'This simplified experience is unavailable for the current store.', 404);
      }
    }
    return { project, session, assignment, shop, flow, eligible: true };
  }

  async buildResponse(context) {
    if (!context.eligible) {
      return {
        contract_version: RESPONSE_VERSION,
        eligible: false,
        fallback: 'existing_interface',
        projection: null,
        projection_key: null,
        action_bindings: {},
        preview_link: null,
        preview_availability: { status: 'not_applicable' }
      };
    }
    const { project, session, shop, flow } = context;
    const selection = flow?.context?.architecture_selection || flow?.context?.selection_outcome || null;
    const questionRequest = flow?.context?.question_request || null;
    const essentialDetail = !selection ? essentialDetailFor(session) : null;
    const projectBinding = { project_id: project.id, organization_id: project.organization_id, shop };
    const briefing = createMerchantVisualBriefing({
      projectBinding,
      storeIntelligence: flow?.context?.store_intelligence || null,
      merchantIntent: flow?.context?.merchant_intent || null,
      selection,
      questionRequest,
      flow,
      essentialDetail,
      selectionBlocked: flow?.state === 'failed_terminal' && !selection,
      root: this.root
    });
    const resourceContentEligible = await this.resourceContentEligible(project, session, shop);
    const directionResolved = selection?.frozen === true;
    const commercialKnown = COMMERCIAL_STAGES.has(session.stage);
    const previewReady = PREVIEW_STATES.has(flow?.state);
    let previewResolution = null;
    if (previewReady && this.previewBindingResolver) {
      const provenanceRecoveries = typeof this.store.listMerchantFlowPreviewProvenanceRecoveries === 'function'
        ? await this.store.listMerchantFlowPreviewProvenanceRecoveries(flow.flow_id, flow.project_id, flow.organization_id)
        : [];
      previewResolution = this.previewBindingResolver.resolve({
        flow,
        project,
        canonicalShop: shop,
        connectionId: flow?.store_context?.connection_id,
        provenanceRecoveries
      });
    }
    const authoritativePreview = merchantSafePreview(previewResolution);
    const previewCandidate = authoritativePreview || (!this.previewBindingResolver ? session.preview_state?.shopify_preview : null);
    const previewUrl = previewReady && previewCandidate?.status === 'ready' ? safePreviewUrl(previewCandidate.preview_url, shop) : null;
    const previewAvailability = previewUrl
      ? 'available'
      : previewReady
        ? 'needs_attention'
        : 'not_applicable';
    const journey = createAnalysisFirstJourney({
      projectBinding,
      session: { stage: session.stage, revision: session.updated_at },
      flow,
      briefing,
      buildEligibility: {
        analysis_complete: Boolean(selection),
        direction_resolved: directionResolved,
        architecture_ready: directionResolved,
        mandatory_fact_resolved: essentialDetail === null,
        project_shop_authority_valid: true,
        resource_content_eligible: resourceContentEligible,
        commercial_boundary_known: commercialKnown,
        no_conflicting_active_flow: true
      },
      commercial: {
        status: commercialKnown ? 'known' : 'unavailable',
        paid_generation_required: true,
        revision: commercialKnown ? 'existing-commercial-boundary-v1' : null
      },
      preview: { ready: previewReady },
      capabilities: {
        approve_design: Boolean(previewUrl),
        request_changes: Boolean(previewUrl),
        compare_current_store: Boolean(previewUrl && session.preview_state?.comparison?.available === true),
        adjust_direction: false
      },
      themeAction: {
        available: false,
        authorized: flow?.merchant_action?.authorized === true,
        completed: flow?.state === 'completed'
      },
      root: this.root
    });
    const projection = projectMerchantJourney(journey, briefing, this.root);
    const projectionSource = journey.source_binding.source_state_checksum;
    const actionBindings = {};
    if (projection.primary_action?.id === 'choose_direction' && questionRequest) {
      actionBindings.choose_direction = this.opaqueBinding('choose_direction', project.id, {
        briefing_checksum: briefing.checksum,
        flow_checksum: flow?.checksum || flow?.flow_checksum || null
      });
    }
    return {
      contract_version: RESPONSE_VERSION,
      eligible: true,
      fallback: null,
      projection,
      projection_key: this.opaqueBinding('projection', project.id, projectionSource),
      action_bindings: actionBindings,
      preview_link: previewUrl ? { label: 'Open Calinium preview', url: previewUrl } : null,
      preview_availability: { status: previewAvailability },
      _internal: { briefing, questionRequest, flow, project }
    };
  }

  sanitize(response) {
    const value = clone(response);
    delete value._internal;
    return value;
  }

  async project({ userId, projectId }) {
    const context = await this.authoritativeContext({ userId, projectId });
    return this.sanitize(await this.buildResponse(context));
  }

  async selectDirection({ userId, projectId, directionId, actionBinding }) {
    const key = `${projectId}:${directionId}:${actionBinding}`;
    const active = this.directionLocks.get(key);
    if (active) return active;
    const operation = this.selectDirectionOnce({ userId, projectId, directionId, actionBinding });
    this.directionLocks.set(key, operation);
    try { return await operation; }
    finally { if (this.directionLocks.get(key) === operation) this.directionLocks.delete(key); }
  }

  async selectDirectionOnce({ userId, projectId, directionId, actionBinding }) {
    if (!DIRECTION_ANSWERS[directionId]) {
      throw new DashboardError('analysis_first_direction_invalid', 'Choose one available storefront direction.', 422);
    }
    let context = await this.authoritativeContext({ userId, projectId, permission: 'interview:edit' });
    let response = await this.buildResponse(context);
    const internal = response._internal;
    if (internal?.flow?.context?.architecture_selection) {
      if (selectedDirectionId(internal.flow.context.architecture_selection) !== directionId) {
        throw new DashboardError('analysis_first_direction_conflict', 'The storefront direction has already been resolved.', 409);
      }
      return this.sanitize(response);
    }
    const expected = response.action_bindings.choose_direction;
    if (!expected || !this.bindingMatches(actionBinding, expected)) {
      throw new DashboardError('analysis_first_direction_stale', 'Reload the current direction before choosing.', 409);
    }
    const request = createDirectionChoiceRequest({
      briefing: internal.briefing,
      questionRequest: internal.questionRequest,
      root: this.root
    });
    const intakeRevision = await this.store.findMerchantIntakeRevision(
      internal.flow.context.store_intelligence.revision_id,
      internal.project.id
    );
    const merchantContext = this.merchantFlowService.merchantContext(internal.project, intakeRevision);
    const submission = submitDirectionChoice({
      request,
      currentBriefing: internal.briefing,
      directionId,
      merchantContext,
      root: this.root
    });
    await this.merchantFlowService.answer({
      userId,
      projectId,
      flowId: internal.flow.flow_id,
      questionId: submission.material_answer_input.question_id,
      message: DIRECTION_ANSWERS[directionId],
      expectedFlowChecksum: internal.flow.checksum
    });
    context = await this.authoritativeContext({ userId, projectId });
    response = await this.buildResponse(context);
    return this.sanitize(response);
  }

  async telemetry({ userId, projectId, input = {} }) {
    const allowed = new Set([
      'event_name', 'journey_stage', 'visible_merchant_question_count',
      'direction_choice_required', 'merchant_action_count', 'retry_count',
      'advanced_mode_used', 'founder_intervention_count'
    ]);
    if (Object.keys(input).some((key) => !allowed.has(key))) {
      throw new DashboardError('analysis_first_telemetry_invalid', 'The experience event could not be recorded.', 422);
    }
    if (!TELEMETRY_EVENTS.includes(input.event_name)) {
      throw new DashboardError('analysis_first_telemetry_invalid', 'The experience event could not be recorded.', 422);
    }
    const context = await this.authoritativeContext({ userId, projectId });
    const response = await this.buildResponse(context);
    if (!response.eligible || response.projection.current_stage.id !== input.journey_stage) {
      throw new DashboardError('analysis_first_telemetry_stale', 'The experience changed before this event was recorded.', 409);
    }
    const event = createTelemetryEvent({
      eventName: input.event_name,
      occurredAt: this.now(),
      projectId,
      journeyStage: input.journey_stage,
      capabilityRevision: this.capability.capability_revision,
      visibleMerchantQuestionCount: input.visible_merchant_question_count,
      directionChoiceRequired: input.direction_choice_required,
      merchantActionCount: input.merchant_action_count,
      retryCount: input.retry_count,
      advancedModeUsed: input.advanced_mode_used,
      founderInterventionCount: input.founder_intervention_count,
      root: this.root
    });
    await this.store.createActivity({
      id: `act_${crypto.randomUUID()}`,
      organization_id: context.project.organization_id,
      project_id: context.project.id,
      actor_user_id: userId,
      type: 'analysis_first_merchant_experience_event',
      payload: event,
      created_at: event.occurred_at
    });
    return { recorded: true, event_name: event.event_name };
  }
}

module.exports = {
  RESPONSE_VERSION,
  SUPPORTED_SESSION_STAGES,
  AnalysisFirstMerchantExperienceService,
  safePreviewUrl,
  essentialDetailFor
};
