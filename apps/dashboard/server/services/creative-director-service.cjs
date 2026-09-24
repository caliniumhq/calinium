'use strict';

const { createId } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { isoNow } = require('../lib/serialization.cjs');
const { normalizeShoppingModeAnswer } = require('../../../../ai/conversation/shopping-mode-normalizer');
const {
  POLICY_VERSION: CONVERSATION_LIVENESS_POLICY_VERSION,
  LIVENESS_STATUS,
  assessConversationLiveness,
  materializeRecoveryQuestion
} = require('../../../../ai/conversation/conversation-liveness');
const { resolveShoppingModePreference } = require('./creative-director-architecture-preference.cjs');
const { reconcileResourcePlan } = require('../../../../pipeline/strategy-section-policy');
const {
  applyResourceConfirmationEligibility,
  buildDecisionSet,
  effectiveResourcePlan,
  confirmationBlockers,
  actionableConfirmationIds,
  resourceFlowEligibility
} = require('../../../../pipeline/resource-confirmation-eligibility');
const {
  POLICY_VERSION: CONTENT_PLAN_POLICY_VERSION,
  deriveEffectiveComposition,
  effectiveStoreStrategy,
  contentPlanWithoutEligibility,
  applyContentPlanEligibility,
  contentPlanFlowEligibility,
  digest: contentPlanDigest
} = require('../../../../pipeline/content-plan-eligibility');
const {
  contentPlanRequired: editorialGridPlanRequired,
  defaultCandidate,
  candidateForStrategy,
  validateCandidate,
  saveCandidate,
  resolveCandidateResources,
  buildApprovedRecords
} = require('./editorial-grid-plan-service.cjs');
const {
  lookbookPlanRequired,
  candidateForStrategy: lookbookCandidateForStrategy,
  validateCandidate: validateLookbookCandidate,
  saveCandidate: saveLookbookCandidate,
  resolveCandidateResources: resolveLookbookCandidateResources,
  buildApprovedRecords: buildLookbookApprovedRecords
} = require('./lookbook-plan-service.cjs');
const {
  craftsmanshipPlanRequired,
  candidateForStrategy: craftsmanshipCandidateForStrategy,
  validateCandidate: validateCraftsmanshipCandidate,
  saveCandidate: saveCraftsmanshipCandidate,
  resolveCandidateResources: resolveCraftsmanshipCandidateResources,
  buildApprovedRecords: buildCraftsmanshipApprovedRecords
} = require('./craftsmanship-plan-service.cjs');
const {
  manufacturingProcessPlanRequired,
  candidateForStrategy: manufacturingProcessCandidateForStrategy,
  validateCandidate: validateManufacturingProcessCandidate,
  saveCandidate: saveManufacturingProcessCandidate,
  resolveCandidateResources: resolveManufacturingProcessCandidateResources,
  buildApprovedRecords: buildManufacturingProcessApprovedRecords
} = require('./manufacturing-process-plan-service.cjs');
const brandTimelinePlan = require('./brand-timeline-plan-service.cjs');
const sustainabilityPlan = require('./sustainability-plan-service.cjs');
const teamPlan = require('./team-plan-service.cjs');
const awardsCertificationsPlan = require('./awards-certifications-plan-service.cjs');
const crossSellProductsPlan = require('./cross-sell-products-plan-service.cjs');
const productBundleShowcasePlan = require('./product-bundle-showcase-plan-service.cjs');
const shopTheLookPlan = require('./shop-the-look-plan-service.cjs');
const complementaryProductsFallbackPlan = require('./complementary-products-fallback-plan-service.cjs');
const { candidateFromRecommendation: presetCandidateFromRecommendation, publicCandidate: publicPresetCandidate, selectCandidate: selectPresetCandidate, buildApprovedPresetRevision, storeStrategyForPreset, strategyRevision: presetStrategyRevision } = require('./preset-service.cjs');
const { normalizeShopDomain } = require('./merchant-flow-controlled-runtime-configuration.cjs');

const STAGES = Object.freeze(['landing', 'conversation', 'understanding', 'blueprint', 'strategy', 'preset', 'resources', 'content-plan', 'offer', 'generation', 'delivery', 'preview', 'finish']);
const REVISITABLE_STAGES = Object.freeze({
  blueprint: ['understanding'],
  strategy: ['blueprint', 'understanding'],
  preset: ['strategy'],
  resources: ['preset', 'strategy'],
  'content-plan': ['resources'],
  offer: ['resources', 'content-plan'],
  generation: ['offer', 'content-plan', 'resources'],
  delivery: ['resources', 'content-plan', 'offer'],
  preview: ['delivery', 'content-plan', 'resources'],
  finish: ['preview']
});
const RESOURCE_SETTING_IDS = new Set(['collection', 'product', 'blog', 'link_list', 'menu', 'page', 'article', 'image', 'desktop_image', 'mobile_image', 'poster_image', 'video', 'video_url']);

const ADDITIONAL_EVIDENCE_PLANS = Object.freeze([brandTimelinePlan, sustainabilityPlan, teamPlan, awardsCertificationsPlan]);
const COMMERCE_PLANS = Object.freeze([crossSellProductsPlan, productBundleShowcasePlan, shopTheLookPlan, complementaryProductsFallbackPlan]);
function effectivePresetStrategy(session) { return storeStrategyForPreset(session?.store_strategy, session?.preset_selection); }
function contentPlanRequired(storeStrategy) { return editorialGridPlanRequired(storeStrategy) || lookbookPlanRequired(storeStrategy) || craftsmanshipPlanRequired(storeStrategy) || manufacturingProcessPlanRequired(storeStrategy) || ADDITIONAL_EVIDENCE_PLANS.some((adapter) => adapter.planRequired(storeStrategy)) || COMMERCE_PLANS.some((adapter) => adapter.planRequired(storeStrategy)); }
function editorialGridCandidate(contentPlan) {
  const candidate = { ...(contentPlan || {}) };
  delete candidate.target_eligibility;
  delete candidate.lookbook;
  delete candidate.craftsmanship;
  delete candidate.manufacturing_process;
  delete candidate.brand_timeline;
  delete candidate.sustainability;
  delete candidate.team;
  delete candidate.awards_certifications;
  delete candidate.cross_sell_products;
  delete candidate.product_bundle_showcase;
  delete candidate.shop_the_look;
  delete candidate.complementary_products_fallback;
  return candidate;
}
function normalizedContentPlanSourceRevision(value) {
  const revision = String(value || '').trim().toLowerCase();
  return /^[a-f0-9]{40,64}$/.test(revision) ? revision : 'unattested-local-source';
}
function contentPlanStrategy(session, at = new Date(0).toISOString(), sourceRevision = 'unattested-local-source') {
  const originalStoreStrategy = effectivePresetStrategy(session);
  const projection = deriveEffectiveComposition({
    originalStoreStrategy,
    resourcePlan: session?.resource_plan,
    generationContext: session?.generation_context,
    presetRevisionId: session?.preset_selection?.approved_revision_id || null,
    sourceRevision: normalizedContentPlanSourceRevision(sourceRevision),
    at
  });
  return effectiveStoreStrategy(originalStoreStrategy, projection);
}
function materializeContentPlanForSession(session, at, sourceRevision = 'unattested-local-source', scope = {}, previousContentPlan = session?.content_plan) {
  const originalStoreStrategy = effectivePresetStrategy(session);
  const projection = deriveEffectiveComposition({
    originalStoreStrategy,
    resourcePlan: session?.resource_plan,
    generationContext: session?.generation_context,
    presetRevisionId: session?.preset_selection?.approved_revision_id || null,
    sourceRevision: normalizedContentPlanSourceRevision(sourceRevision),
    at
  });
  const targetStrategy = effectiveStoreStrategy(originalStoreStrategy, projection);
  const materialized = contentPlanForStrategy(contentPlanWithoutEligibility(session?.content_plan), targetStrategy, at);
  return applyContentPlanEligibility({
    previousContentPlan,
    materializedContentPlan: materialized,
    originalStoreStrategy,
    resourcePlan: session?.resource_plan,
    generationContext: session?.generation_context,
    presetRevisionId: session?.preset_selection?.approved_revision_id || null,
    sourceRevision: normalizedContentPlanSourceRevision(sourceRevision),
    existingEligibility: previousContentPlan?.target_eligibility || null,
    at,
    scope: {
      project_id: session?.project_id,
      session_project_id: session?.project_id,
      shop: normalizeShopDomain(scope.shop) || normalizeShopDomain(session?.content_plan?.target_eligibility?.scope_binding?.shop) || null,
      approved_shop: normalizeShopDomain(scope.approved_shop) || normalizeShopDomain(scope.shop) || normalizeShopDomain(session?.content_plan?.target_eligibility?.scope_binding?.shop) || null
    }
  });
}
function preparedContentPlanForSession(session, at, sourceRevision = 'unattested-local-source') {
  const result = materializeContentPlanForSession(session, at, sourceRevision);
  return {
    strategy: result.effectiveStoreStrategy,
    contentPlan: contentPlanWithoutEligibility(result.contentPlan),
    eligibility: result.eligibility
  };
}
function contentPlanResultForCandidate(session, contentPlan, at, sourceRevision = 'unattested-local-source') {
  return materializeContentPlanForSession(
    { ...session, content_plan: { ...contentPlan, target_eligibility: session?.content_plan?.target_eligibility || null } },
    at,
    sourceRevision,
    {},
    session?.content_plan
  );
}
function monotonicRevisionAt(previous, candidate) {
  const previousTime = Date.parse(previous || '');
  const candidateTime = Date.parse(candidate || '');
  if (!Number.isFinite(previousTime)) return candidate;
  if (Number.isFinite(candidateTime) && candidateTime > previousTime) return candidate;
  return new Date(previousTime + 1).toISOString();
}
function newContentPlanReconciliationCount(previousContentPlan, eligibility) {
  const previousIds = new Set((previousContentPlan?.target_eligibility?.reconciliation_history || [])
    .map((entry) => entry.reconciliation_id)
    .filter(Boolean));
  return (eligibility?.reconciliation_history || [])
    .filter((entry) => entry.reconciliation_id && !previousIds.has(entry.reconciliation_id))
    .length;
}
function contentPlanApproved(contentPlan, storeStrategy) {
  const plan = contentPlan || {};
  const editorialApproved = !editorialGridPlanRequired(storeStrategy) || plan.status === 'approved';
  const lookbookApproved = !lookbookPlanRequired(storeStrategy) || plan.lookbook?.status === 'approved';
  const craftsmanshipApproved = !craftsmanshipPlanRequired(storeStrategy) || plan.craftsmanship?.status === 'approved';
  const manufacturingProcessApproved = !manufacturingProcessPlanRequired(storeStrategy) || plan.manufacturing_process?.status === 'approved';
  const additionalApproved = ADDITIONAL_EVIDENCE_PLANS.every((adapter) => !adapter.planRequired(storeStrategy) || plan[adapter.config.key]?.status === 'approved');
  const commerceApproved = COMMERCE_PLANS.every((adapter) => !adapter.planRequired(storeStrategy) || plan[adapter.config.key]?.status === 'approved');
  return editorialApproved && lookbookApproved && craftsmanshipApproved && manufacturingProcessApproved && additionalApproved && commerceApproved && Boolean(plan.approved_revision_id && plan.approved_resource_snapshot_revision_id);
}
function contentPlanForStrategy(contentPlan, storeStrategy, at) {
  const baseline = manufacturingProcessCandidateForStrategy(craftsmanshipCandidateForStrategy(lookbookCandidateForStrategy(candidateForStrategy(contentPlan, storeStrategy, at), storeStrategy, at), storeStrategy, at), storeStrategy, at);
  const evidence = ADDITIONAL_EVIDENCE_PLANS.reduce((plan, adapter) => adapter.candidateForStrategy(plan, storeStrategy, at), baseline);
  return COMMERCE_PLANS.reduce((plan, adapter) => adapter.candidateForStrategy(plan, storeStrategy, at), evidence);
}
function validateAdditionalEvidenceCandidates(contentPlan, root) {
  for (const adapter of ADDITIONAL_EVIDENCE_PLANS) if (contentPlan?.[adapter.config.key]) adapter.validateCandidate(contentPlan[adapter.config.key], root);
}
function validateCommerceCandidates(contentPlan, root) {
  for (const adapter of COMMERCE_PLANS) if (contentPlan?.[adapter.config.key]) adapter.validateCandidate(contentPlan[adapter.config.key], root);
}

function transcriptEntry(role, content, at) {
  return { id: createId('msg'), role, content: String(content || '').trim(), created_at: at };
}

function defaultGenerationContext() {
  return {
    status: 'awaiting_configuration',
    approval_reference: null,
    approved_at: null,
    merchant_references: {},
    shopify_resource_references: {},
    asset_references: {},
    completed_confirmations: [],
    resolved_empty_fields: [],
    resource_confirmation_decisions: null
  };
}

function defaultContentPlan(at = new Date(0).toISOString()) { return defaultCandidate(at); }

function defaultGenerationState() {
  return { status: 'not_started', stages: [], error: null, generated_at: null };
}

function defaultPreviewState() {
  return { status: 'not_available', generation_id: null, package_path: null, available_views: [], source_theme_unchanged: true, warning: null };
}

function approvedStrategyReplay(session) {
  return Boolean(
    session?.stage === 'preset'
    && session.review?.storeStrategyStatus === 'approved'
    && session.preset_selection?.status === 'draft'
    && session.preset_selection?.strategy_revision === presetStrategyRevision(session.store_strategy)
  );
}

function presetPlanningFailureReason(error) {
  if (typeof error?.reason_code === 'string' && error.reason_code) return error.reason_code;
  if (error?.name === 'CompilerIndustryResolutionError') return 'compiler_industry_unresolved';
  if (error?.name === 'CompilerStrategyResolutionError') return 'no_valid_strategy_fallback';
  if (error?.name === 'DraftInputError' || /strategy validation/i.test(String(error?.message || ''))) return 'strategy_validation_failed';
  return 'preset_planning_failed';
}

function defaultResourcePlan() {
  return { status: 'not_started', fields: [], groups: [], required_assets: [], required_confirmations: [], blocker: null, shopify_connection: { status: 'not_connected' } };
}

function clone(value) { return JSON.parse(JSON.stringify(value || {})); }

function resourceRequirementDetails(field, { selectedResourceId = null, selectedResourceKind = null, approvalStatus = 'missing', currentStatus = 'not_selected', exactValidationFailure = null } = {}) {
  return {
    requirementId: field.setting_ref,
    sectionId: field.section_id || null,
    fieldPath: field.setting_ref,
    displayLabel: field.label || null,
    expectedResourceKind: field.kind,
    selectedResourceId,
    selectedResourceKind,
    approvalStatus,
    currentStatus,
    exactValidationFailure: exactValidationFailure || `Select an approved ${field.kind} for ${field.section_id || 'this section'}.`
  };
}

function normalizeGenerationContextForResourcePlan(context, resourcePlan, { invalidateApproval = false } = {}) {
  const current = { ...defaultGenerationContext(), ...clone(context) };
  const effectivePlan = effectiveResourcePlan(resourcePlan);
  const fields = new Map((effectivePlan?.fields || []).map((field) => [field.setting_ref, field]));
  const assetIds = new Set((effectivePlan?.required_assets || []).map((asset) => asset.asset_id));
  const requiredConfirmations = new Set(actionableConfirmationIds(resourcePlan));
  const next = {
    ...current,
    merchant_references: Object.fromEntries(Object.entries(current.merchant_references || {}).filter(([key]) => fields.has(key))),
    shopify_resource_references: Object.fromEntries(Object.entries(current.shopify_resource_references || {}).filter(([key]) => fields.has(key))),
    asset_references: Object.fromEntries(Object.entries(current.asset_references || {}).filter(([key]) => assetIds.has(key))),
    completed_confirmations: (current.completed_confirmations || []).filter((value) => {
      const match = String(value).match(/^field:(.+)$/);
      return match ? fields.has(match[1]) : requiredConfirmations.has(value);
    }),
    // A reconciliation can remove optional legacy fields after the browser
    // has stored an empty decision. Keep only empty decisions that are still
    // valid optional fields in the effective, strategy-aware Resource Plan.
    resolved_empty_fields: (current.resolved_empty_fields || []).filter((fieldRef) => {
      const field = fields.get(fieldRef);
      return field && (!field.required || current.recommended_resource_set_approval?.omitted_field_refs?.includes(fieldRef));
    }),
    resource_confirmation_decisions: buildDecisionSet({
      eligibility: resourcePlan?.confirmation_eligibility,
      completedConfirmations: current.completed_confirmations,
      previous: current.resource_confirmation_decisions,
      at: resourcePlan?.confirmation_eligibility?.classified_at || new Date(0).toISOString()
    })
  };
  if (invalidateApproval) {
    next.status = 'awaiting_configuration';
    next.approval_reference = null;
    next.approved_at = null;
  }
  const changed = JSON.stringify(next) !== JSON.stringify(current);
  return { generationContext: next, changed };
}

function resourcePlanSelectionBlockers(resourcePlan, generationContext, approvedOmissionFieldRefs = []) {
  const generation = generationContext || defaultGenerationContext();
  const effectivePlan = effectiveResourcePlan(resourcePlan);
  const approvedOmissions = new Set(approvedOmissionFieldRefs || []);
  const blockers = [];
  for (const field of (effectivePlan?.fields || []).filter((item) => item.required)) {
    if (!Object.hasOwn(generation.merchant_references || {}, field.setting_ref) && !approvedOmissions.has(field.setting_ref)) {
      blockers.push(resourceRequirementDetails(field));
    }
  }
  for (const asset of effectivePlan?.required_assets || []) {
    if (!generation.asset_references?.[asset.asset_id]) {
      blockers.push({
        requirementId: asset.asset_id,
        sectionId: null,
        fieldPath: (asset.field_refs || [])[0] || null,
        displayLabel: asset.label || asset.asset_id,
        expectedResourceKind: 'asset',
        selectedResourceId: null,
        selectedResourceKind: null,
        approvalStatus: 'missing',
        currentStatus: 'not_selected',
        exactValidationFailure: `${asset.label || 'This required asset'} needs an approved selection.`
      });
    }
  }
  for (const confirmation of confirmationBlockers(resourcePlan, generation.resource_confirmation_decisions)) {
      blockers.push({
        requirementId: `confirmation:${confirmation.confirmation_id}`,
        sectionId: null,
        fieldPath: confirmation.confirmation_id,
        displayLabel: confirmation.merchant_state_copy || 'Merchant confirmation',
        expectedResourceKind: 'confirmation',
        selectedResourceId: null,
        selectedResourceKind: null,
        approvalStatus: 'missing',
        currentStatus: 'not_confirmed',
        exactValidationFailure: confirmation.classification === 'unresolved_review_required'
          ? 'Calinium must review this resource contract before generation can continue.'
          : 'Review and explicitly confirm this material fact before generation.'
      });
  }
  return blockers;
}
function requiredAssetSelection(value) {
  const selected = String(value || '').trim();
  if (!selected) return { source: null, id: null };
  const match = selected.match(/^(asset|shopify):([^:]+)$/);
  // Existing saved selections predate Shopify-file candidates and contain the
  // project asset ID directly. Preserve them as local project assets.
  return match ? { source: match[1], id: match[2] } : { source: 'asset', id: selected };
}

function resourceKind(field) {
  const settingId = field.setting_id || '';
  if (settingId === 'product') return 'product';
  if (settingId === 'collection') return 'collection';
  if (settingId === 'menu' || settingId === 'link_list') return 'menu';
  if (['image', 'desktop_image', 'mobile_image', 'poster_image'].includes(settingId)) return 'image';
  if (['video', 'video_url'].includes(settingId)) return 'video';
  if (settingId === 'blog' || settingId === 'article' || settingId === 'page') return 'content';
  return 'confirmation';
}

function draftFields(draft) {
  const fields = [];
  for (const page of [draft.homepage_plan, ...(draft.other_pages || [])]) {
    for (const section of page?.sections || []) {
      for (const field of section.unresolved_merchant_fields || []) {
        fields.push({
          setting_ref: field.setting_ref,
          setting_id: field.setting_id,
          section_id: section.section_id,
          instance_id: section.instance_id,
          kind: resourceKind(field),
          required: RESOURCE_SETTING_IDS.has(field.setting_id)
        });
      }
    }
  }
  return fields.sort((left, right) => left.setting_ref.localeCompare(right.setting_ref));
}

function draftConfirmations(draft) {
  const confirmations = [];
  // The paid Resource Plan configures only the approved homepage composition;
  // unconfigured page templates remain the untouched Calinium One baseline.
  // Requiring their review queue here forced merchants to confirm claims that
  // would never enter the generated package. Optional unresolved settings are
  // represented by approved empty decisions, so only active section-level
  // evidence confirmations belong in this gate.
  for (const section of draft.homepage_plan?.sections || []) {
    confirmations.push(...(section.merchant_confirmations || []));
  }
  return [...new Set(confirmations)].sort();
}

function resourceGroups(fields) {
  const grouped = new Map();
  for (const field of fields) {
    const key = field.kind;
    const current = grouped.get(key) || { kind: key, field_refs: [], section_ids: [], required: false };
    current.field_refs.push(field.setting_ref);
    current.section_ids.push(field.section_id);
    current.required = current.required || field.required;
    grouped.set(key, current);
  }
  return [...grouped.values()].map((group) => ({
    ...group,
    field_refs: [...new Set(group.field_refs)].sort(),
    section_ids: [...new Set(group.section_ids)].sort()
  })).sort((left, right) => left.kind.localeCompare(right.kind));
}

function generationTimeline(stage, state, at, detail = null) {
  const stages = (state.stages || []).filter((entry) => entry.id !== stage);
  return [...stages, { id: stage, status: 'complete', detail, completed_at: at }];
}

class CreativeDirectorService {
  constructor({ root, store, projectService, assetService, shopifyService = null, merchantIntakeService = null, recommendedResourceSetService = null, recommendationDesignService = null, livePreviewService = null, adapter, customThemeService = null, merchantFlowService = null, previewBindingResolver = null, merchantFlowBetaEnabled = false, analysisFirstMerchantExperienceEnabled = false, sourceRevision = 'unattested-local-source', clock = () => new Date() }) {
    this.root = root;
    this.store = store;
    this.projectService = projectService;
    this.assetService = assetService;
    this.shopifyService = shopifyService;
    this.merchantIntakeService = merchantIntakeService;
    this.recommendedResourceSetService = recommendedResourceSetService;
    this.recommendationDesignService = recommendationDesignService;
    this.livePreviewService = livePreviewService;
    this.adapter = adapter;
    this.customThemeService = customThemeService;
    this.merchantFlowService = merchantFlowService;
    this.previewBindingResolver = previewBindingResolver;
    this.merchantFlowBetaEnabled = merchantFlowBetaEnabled === true;
    this.analysisFirstMerchantExperienceEnabled = analysisFirstMerchantExperienceEnabled === true;
    this.contentPlanSourceRevision = normalizedContentPlanSourceRevision(sourceRevision);
    this.clock = clock;
    this.resourceUpdateLocks = new Map();
    this.recommendedResourceApprovalLocks = new Map();
    this.conversationLivenessLocks = new Map();
    this.contentPlanReconciliationLocks = new Map();
  }

  now() { return isoNow(this.clock); }

  async authorize({ userId, projectId, permission = 'project:view' }) {
    const project = await this.store.findProjectById(projectId);
    if (!project) throw new DashboardError('project_not_found', 'Project not found.', 404);
    await this.projectService.requireMembership(project.organization_id, userId, permission);
    return project;
  }

  async load({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId });
    const storeIntelligence = this.merchantIntakeService
      ? await this.merchantIntakeService.begin({ userId, projectId })
      : null;
    const [storedSession, assetResult, shopify] = await Promise.all([
      this.store.findCreativeDirectorForProject(projectId),
      this.assetService.list({ userId, projectId }),
      this.shopifyContext({ userId, projectId })
    ]);
    let conversationContext = null;
    if (storedSession?.stage === 'conversation' && this.merchantIntakeService) {
      try { conversationContext = await this.merchantIntakeService.conversationContext({ userId, projectId }); }
      catch { conversationContext = null; }
    }
    const liveSession = await this.reconcilePersistedConversationLiveness({
      project,
      session: storedSession,
      preferredShop: shopify?.connection?.shop_domain || null,
      context: conversationContext
    });
    const session = await this.reconcilePersistedResourcePlan(projectId, liveSession, shopify?.connection?.shop_domain || null);
    let recommendedResourceSet = null;
    if (this.recommendedResourceSetService) {
      try { recommendedResourceSet = await this.recommendedResourceSetService.ensure({ userId, projectId }); }
      catch { recommendedResourceSet = null; }
    }
    let customTheme = null;
    if (this.customThemeService) {
      try { customTheme = await this.customThemeService.summary({ userId, projectId }); }
      catch { customTheme = null; }
    }
    let creativeDirection = null;
    if (this.recommendationDesignService) {
      try { creativeDirection = await this.recommendationDesignService.ensure({ userId, projectId }); }
      catch { creativeDirection = null; }
    }
    let livePreview = null;
    if (this.livePreviewService) {
      try { livePreview = await this.livePreviewService.ensure({ userId, projectId }); }
      catch { livePreview = null; }
    }
    let merchantFlow = null;
    if (this.merchantFlowService && session) {
      try { merchantFlow = await this.merchantFlowService.status({ userId, projectId }); }
      catch { merchantFlow = null; }
    }
    let publicSession = session ? { ...session, preset_selection: publicPresetCandidate(session.preset_selection) } : null;
    if (publicSession && this.analysisFirstMerchantExperienceEnabled && this.previewBindingResolver && this.merchantFlowService) {
      const authoritativeFlow = this.merchantFlowService.flowFromSession(session);
      const provenanceRecoveries = authoritativeFlow && typeof this.store.listMerchantFlowPreviewProvenanceRecoveries === 'function'
        ? await this.store.listMerchantFlowPreviewProvenanceRecoveries(authoritativeFlow.flow_id, authoritativeFlow.project_id, authoritativeFlow.organization_id)
        : [];
      const resolution = authoritativeFlow ? this.previewBindingResolver.resolve({
        flow: authoritativeFlow,
        project,
        canonicalShop: shopify?.connection?.shop_domain || authoritativeFlow.store_context?.shop,
        connectionId: authoritativeFlow.store_context?.connection_id,
        provenanceRecoveries
      }) : null;
      publicSession = {
        ...publicSession,
        preview_state: {
          ...(publicSession.preview_state || {}),
          shopify_preview: resolution?.status === 'available'
            ? { status: 'ready', preview_url: resolution.preview_url }
            : null
        }
      };
    }
    return {
      project,
      session: publicSession,
      conversation_liveness: session ? assessConversationLiveness({ session }) : null,
      assets: assetResult.assets,
      shopify,
      store_intelligence: storeIntelligence,
      recommended_resource_set: recommendedResourceSet,
      creative_direction: creativeDirection,
      live_preview: livePreview,
      custom_theme: customTheme,
      merchant_flow: merchantFlow,
      merchant_flow_beta_enabled: this.merchantFlowBetaEnabled,
      analysis_first_merchant_experience_enabled: this.analysisFirstMerchantExperienceEnabled
    };
  }

  async shopifyContext({ userId, projectId }) {
    if (!this.shopifyService) return { connection: null, assignment: null };
    try { return await this.shopifyService.projectConnection({ userId, projectId }); }
    catch (error) { return { connection: null, assignment: null }; }
  }

  async contentPlanShop(project, preferredShop = null) {
    const preferred = normalizeShopDomain(preferredShop);
    if (typeof this.store.findProjectShopifyConnection !== 'function') return preferred;
    const assignment = await this.store.findProjectShopifyConnection(project.id, project.organization_id);
    const assigned = normalizeShopDomain(assignment?.connection?.shop_domain);
    if (preferred && assigned && preferred !== assigned) {
      throw new DashboardError('content_plan_reconciliation_shop_mismatch', 'This content plan does not belong to the current Shopify store.', 403);
    }
    return assigned || preferred;
  }

  async conversationLivenessShop(project, preferredShop = null) {
    const preferred = normalizeShopDomain(preferredShop);
    if (typeof this.store.findProjectShopifyConnection !== 'function') return preferred;
    const assignment = await this.store.findProjectShopifyConnection(project.id, project.organization_id);
    const assigned = normalizeShopDomain(assignment?.connection?.shop_domain);
    if (preferred && assigned && preferred !== assigned) {
      throw new DashboardError('conversation_liveness_shop_mismatch', 'This conversation does not belong to the current Shopify store.', 403);
    }
    return assigned || preferred;
  }

  async reconcilePersistedConversationLiveness({ project, session, preferredShop = null, context = null }) {
    if (!session) return session;
    const projectId = project.id;
    const previous = this.conversationLivenessLocks.get(projectId) || Promise.resolve();
    const operation = previous.catch(() => null).then(() => this.reconcilePersistedConversationLivenessUnlocked({ project, session, preferredShop, context }));
    this.conversationLivenessLocks.set(projectId, operation);
    try { return await operation; }
    finally { if (this.conversationLivenessLocks.get(projectId) === operation) this.conversationLivenessLocks.delete(projectId); }
  }

  async reconcilePersistedConversationLivenessUnlocked({ project, session, preferredShop = null, context = null }) {
    let current = session;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (!current || current.stage !== 'conversation') return current;
      assert(current.project_id === project.id, 'conversation_liveness_ownership_mismatch', 'This conversation does not belong to the current project.', 403);
      const shop = await this.conversationLivenessShop(project, preferredShop);
      const initialLiveness = assessConversationLiveness({ session: current });
      if (initialLiveness.status === LIVENESS_STATUS.EXPLICITLY_BLOCKED) return current;
      let state = current.conversation_state;
      if (!state?.currentQuestionId && context && this.adapter?.conversation?.applyConversationContext) {
        state = this.adapter.conversation.applyConversationContext(state, context);
      }
      const contextChanged = JSON.stringify(state) !== JSON.stringify(current.conversation_state);
      const candidate = contextChanged ? { ...current, conversation_state: state } : current;
      const liveness = assessConversationLiveness({ session: candidate });
      if (![LIVENESS_STATUS.INVALID_ACTIONLESS_STATE, LIVENESS_STATUS.READY_TO_ADVANCE].includes(liveness.status)) return current;

      const at = monotonicRevisionAt(current.updated_at, this.now());
      let next;
      let question = null;
      let activityType;
      if (liveness.status === LIVENESS_STATUS.READY_TO_ADVANCE) {
        next = { ...candidate, stage: 'understanding', updated_at: at };
        activityType = 'creative_director_conversation_advanced';
      } else {
        const recovery = materializeRecoveryQuestion(state);
        if (!recovery.question) return current;
        question = recovery.question;
        const promptAlreadyLast = current.transcript?.at(-1)?.role === 'calinium'
          && current.transcript.at(-1).content === question.prompt;
        next = {
          ...candidate,
          conversation_state: recovery.state,
          transcript: promptAlreadyLast
            ? current.transcript
            : [...(current.transcript || []), transcriptEntry('calinium', question.prompt, at)],
          updated_at: at
        };
        activityType = 'creative_director_conversation_recovered';
      }
      const validationErrors = this.adapter.conversation.validateConversationState(next.conversation_state, { root: this.root });
      assert(validationErrors.length === 0, 'conversation_liveness_state_invalid', 'The recovered conversation could not be verified.', 500);
      assert(typeof this.store.transaction === 'function' && typeof this.store.updateCreativeDirectorIfMatch === 'function', 'conversation_liveness_cas_unavailable', 'Conversation recovery is unavailable until durable concurrency protection is active.', 503);
      const result = await this.store.transaction(async (transaction) => {
        const fresh = await transaction.findCreativeDirectorForProject(project.id);
        if (!fresh || fresh.updated_at !== current.updated_at) return { stale: true, session: fresh };
        const saved = await transaction.updateCreativeDirectorIfMatch(project.id, current.updated_at, next);
        if (!saved.updated) return { stale: true, session: saved.session };
        await transaction.createActivity(this.conversationLivenessActivity({
          project,
          previous: current,
          session: saved.session,
          shop,
          question,
          type: activityType,
          authoritativeContextApplied: contextChanged
        }));
        return { stale: false, session: saved.session };
      });
      if (!result.stale) return result.session;
      current = result.session;
    }
    throw new DashboardError('conversation_liveness_reconciliation_stale', 'This conversation changed elsewhere. Reload before continuing.', 409);
  }

  conversationLivenessActivity({ project, previous, session, shop, question, type, authoritativeContextApplied }) {
    return {
      id: `act_${contentPlanDigest({ policy_version: CONVERSATION_LIVENESS_POLICY_VERSION, project_id: project.id, conversation_id: session.conversation_state?.conversationId, previous_updated_at: previous.updated_at, next_updated_at: session.updated_at, question_id: question?.id || null, type }).slice(0, 24)}`,
      organization_id: project.organization_id,
      project_id: project.id,
      actor_user_id: null,
      type,
      payload: {
        policy_version: CONVERSATION_LIVENESS_POLICY_VERSION,
        shop_binding: shop,
        previous_session_revision: previous.updated_at,
        next_session_revision: session.updated_at,
        question_id: question?.id || null,
        authoritative_context_applied: authoritativeContextApplied,
        automatic_advance: type === 'creative_director_conversation_advanced'
      },
      created_at: session.updated_at
    };
  }

  async reconcilePersistedResourcePlan(projectId, session, preferredShop = null) {
    const previous = this.contentPlanReconciliationLocks.get(projectId) || Promise.resolve();
    const operation = previous.catch(() => null).then(() => this.reconcilePersistedResourcePlanUnlocked(projectId, session, preferredShop));
    this.contentPlanReconciliationLocks.set(projectId, operation);
    try { return await operation; }
    finally { if (this.contentPlanReconciliationLocks.get(projectId) === operation) this.contentPlanReconciliationLocks.delete(projectId); }
  }

  async reconcilePersistedResourcePlanUnlocked(projectId, session, preferredShop = null) {
    let current = session;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (!current?.resource_plan || !current?.store_strategy) return current;
      assert(current.project_id === projectId, 'content_plan_reconciliation_ownership_mismatch', 'This content plan does not belong to the current project.', 403);
      const project = await this.store.findProjectById(projectId);
      if (!project) throw new DashboardError('project_not_found', 'Project not found.', 404);
      const shop = await this.contentPlanShop(project, preferredShop);
      const approvedPresetRevision = current.preset_selection?.approved_revision_id
        ? await this.store.findApprovedPresetRevision(current.preset_selection.approved_revision_id, projectId, project.organization_id)
        : null;
      const at = monotonicRevisionAt(current.updated_at, this.now());
      const originalStrategy = storeStrategyForPreset(current.store_strategy, current.preset_selection);
      const preview = reconcileResourcePlan({ resourcePlan: current.resource_plan, storeStrategy: originalStrategy, review: current.review, recordHistory: false });
      const reconciliation = preview.changed
        ? reconcileResourcePlan({ resourcePlan: current.resource_plan, storeStrategy: originalStrategy, review: current.review, recordHistory: true, at })
        : preview;
      const confirmationPolicy = applyResourceConfirmationEligibility({
        resourcePlan: reconciliation.resourcePlan,
        storeStrategy: originalStrategy,
        approvedPresetRevision,
        at
      });
      const normalized = normalizeGenerationContextForResourcePlan(
        current.generation_context,
        confirmationPolicy.resourcePlan,
        { invalidateApproval: preview.changed || confirmationPolicy.changed }
      );
      let next = { ...current, resource_plan: confirmationPolicy.resourcePlan, generation_context: normalized.generationContext };
      let contentResult = null;
      const resourceEligibility = resourceFlowEligibility(confirmationPolicy.resourcePlan, normalized.generationContext, { requireApproval: true });
      const resourcesApproved = resourceEligibility.eligible;
      if (resourcesApproved) {
        contentResult = materializeContentPlanForSession(next, at, this.contentPlanSourceRevision, { shop, approved_shop: shop });
        const contentStage = contentResult.stage;
        const stage = current.stage === 'content-plan'
          ? contentStage
          : current.stage === 'offer' && contentStage === 'content-plan'
            ? 'content-plan'
            : current.stage;
        next = {
          ...next,
          stage,
          content_plan: contentResult.contentPlan
        };
      } else if (['content-plan', 'offer'].includes(current.stage)) {
        next = { ...next, stage: 'resources' };
      }
      const changed = preview.changed || confirmationPolicy.changed || normalized.changed || Boolean(contentResult?.changed) || next.stage !== current.stage;
      if (!changed) return current;
      next.updated_at = at;
      const auditRequired = Boolean(contentResult && (newContentPlanReconciliationCount(current.content_plan, contentResult.eligibility) || (current.stage === 'content-plan' && next.stage === 'offer')));
      assert(typeof this.store.transaction === 'function' && typeof this.store.updateCreativeDirectorIfMatch === 'function', 'content_plan_reconciliation_cas_unavailable', 'Content-plan reconciliation is unavailable until durable concurrency protection is active.', 503);
      const result = await this.store.transaction(async (transaction) => {
        const fresh = await transaction.findCreativeDirectorForProject(projectId);
        if (!fresh || fresh.updated_at !== current.updated_at) return { stale: true, session: fresh };
        const saved = await transaction.updateCreativeDirectorIfMatch(projectId, current.updated_at, next);
        if (!saved.updated) return { stale: true, session: saved.session };
        if (auditRequired) {
          await transaction.createActivity(this.contentPlanReconciliationActivity(project, current, saved.session, contentResult));
        }
        return { stale: false, session: saved.session };
      });
      if (!result.stale) return result.session;
      current = result.session;
    }
    throw new DashboardError('content_plan_reconciliation_stale', 'This content plan changed elsewhere. Reload before continuing.', 409);
  }

  contentPlanReconciliationActivity(project, previous, session, contentResult) {
    const revisionId = contentResult.eligibility.revision_id;
    const transitionCount = newContentPlanReconciliationCount(previous.content_plan, contentResult.eligibility);
    return {
      id: `act_${contentPlanDigest({ project_id: project.id, revision_id: revisionId, previous_updated_at: previous.updated_at, next_updated_at: session.updated_at, previous_stage: previous.stage, next_stage: session.stage, type: 'content_plan_reconciled' }).slice(0, 24)}`,
      organization_id: project.organization_id,
      project_id: project.id,
      actor_user_id: null,
      type: 'content_plan_reconciled',
      payload: {
        policy_version: CONTENT_PLAN_POLICY_VERSION,
        eligibility_revision_id: revisionId,
        transition_count: transitionCount,
        previous_stage: previous.stage,
        next_stage: session.stage,
        stage_resolution_reference: contentResult.eligibility.stage_resolution?.reference || null
      },
      created_at: session.updated_at
    };
  }

  async recordContentPlanReconciliationActivity(project, previous, session, contentResult) {
    try { await this.store.createActivity(this.contentPlanReconciliationActivity(project, previous, session, contentResult)); }
    catch (error) {
      if (!String(error?.message || '').toLowerCase().includes('unique')) throw error;
    }
  }

  async start({ userId, projectId, restart = false }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.store.findCreativeDirectorForProject(projectId);
    if (current && !restart) {
      let context = null;
      if (this.merchantIntakeService) {
        try { context = await this.merchantIntakeService.conversationContext({ userId, projectId }); }
        catch { context = null; }
      }
      const session = await this.reconcilePersistedConversationLiveness({ project, session: current, context });
      return { session, resumed: true };
    }
    if (this.merchantIntakeService) await this.merchantIntakeService.begin({ userId, projectId });
    const context = this.merchantIntakeService ? await this.merchantIntakeService.conversationContext({ userId, projectId }) : null;
    const at = this.now();
    const conversation = this.adapter.start({ project, conversationId: `creative-director-${createId('session').slice(8)}`, context });
    const record = {
      id: current?.id || createId('cds'), project_id: projectId, stage: 'conversation', conversation_state: conversation.state,
      transcript: [transcriptEntry('calinium', conversation.message, at)], creative_brief: null, store_strategy: null,
      review: this.adapter.createReviewState(), merchant_profile: null, resource_plan: defaultResourcePlan(),
      generation_context: defaultGenerationContext(), generation_state: defaultGenerationState(), preview_state: defaultPreviewState(), content_plan: defaultContentPlan(at), preset_selection: null, created_at: current?.created_at || at, updated_at: at
    };
    const session = current ? await this.store.updateCreativeDirector(projectId, record) : await this.store.createCreativeDirector(record);
    await this.activity(project, userId, restart ? 'creative_director_restarted' : 'creative_director_started', {});
    return { session, resumed: false };
  }

  async persistShoppingModePreference({ project, userId, projectId, message, conversationId, expectedSessionUpdatedAt }) {
    if (normalizeShoppingModeAnswer(message).status !== 'resolved') return null;
    const at = this.now();
    const result = await this.store.transaction(async (transaction) => {
      const fresh = await transaction.findCreativeDirectorForProject(projectId);
      if (!fresh) throw new DashboardError('creative_director_missing', 'Start designing before continuing.', 409);
      assert(fresh.conversation_state?.conversationId === conversationId, 'creative_director_conversation_stale', 'This conversation changed. Reload before sending that answer.', 409);
      const existing = fresh.conversation_state?.architecturePreferences?.shopping_mode || null;
      if (existing) {
        const expectedIsReplay = expectedSessionUpdatedAt === fresh.updated_at || expectedSessionUpdatedAt === existing.parent_session_updated_at;
        assert(expectedIsReplay, 'creative_director_conversation_stale', 'This conversation changed. Reload before sending that answer.', 409);
      } else {
        assert(expectedSessionUpdatedAt === fresh.updated_at, 'creative_director_conversation_stale', 'This conversation changed. Reload before sending that answer.', 409);
        assert(!fresh.generation_state?.merchant_flow, 'creative_director_architecture_frozen', 'This storefront structure is already being prepared. Reload its current progress.', 409);
      }
      const resolved = resolveShoppingModePreference({
        conversationState: fresh.conversation_state,
        message,
        at,
        parentSessionUpdatedAt: expectedSessionUpdatedAt
      });
      if (resolved.reused) return { session: fresh, preference: resolved.preference, reused: true };
      const validationErrors = this.adapter.conversation.validateConversationState(resolved.conversationState, { root: this.root });
      assert(validationErrors.length === 0, 'creative_director_conversation_invalid', 'The saved conversation could not be verified.', 500);
      const session = await transaction.updateCreativeDirector(projectId, {
        ...fresh,
        conversation_state: resolved.conversationState,
        transcript: [
          ...fresh.transcript,
          transcriptEntry('merchant', message, at),
          transcriptEntry('calinium', 'I saved that shopping preference. Calinium will use it when preparing your storefront structure.', at)
        ],
        updated_at: at
      });
      await transaction.createActivity({
        id: createId('act'),
        organization_id: project.organization_id,
        project_id: project.id,
        actor_user_id: userId,
        type: 'creative_director_architecture_preference_saved',
        payload: { path: resolved.preference.path, revision_id: resolved.preference.revision_id },
        created_at: at
      });
      return { session, preference: resolved.preference, reused: false };
    });
    return {
      session: { ...result.session, preset_selection: publicPresetCandidate(result.session.preset_selection) },
      architecture_preference: {
        path: result.preference.path,
        value: result.preference.value,
        confidence: result.preference.confidence,
        revision_id: result.preference.revision_id
      },
      reused: result.reused
    };
  }

  async respond({ userId, projectId, message, conversationId = null, expectedSessionUpdatedAt = null }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    let current = await this.requireSession(projectId);
    const content = String(message || '').trim();
    assert(content.length > 0 && content.length <= 1200, 'conversation_message_invalid', 'Share a short answer before continuing.', 422);
    const boundConversationId = conversationId || current.conversation_state?.conversationId || null;
    const boundSessionUpdatedAt = expectedSessionUpdatedAt || current.updated_at;
    assert(boundConversationId && boundConversationId === current.conversation_state?.conversationId, 'creative_director_conversation_stale', 'This conversation changed. Reload before sending that answer.', 409);
    const at = this.now();
    const refinementStages = new Set(['resources', 'offer', 'generation', 'delivery', 'preview', 'finish']);
    if (refinementStages.has(current.stage)) {
      const preference = await this.persistShoppingModePreference({
        project,
        userId,
        projectId,
        message: content,
        conversationId: boundConversationId,
        expectedSessionUpdatedAt: boundSessionUpdatedAt
      });
      if (preference) return preference;
      assert(boundSessionUpdatedAt === current.updated_at, 'creative_director_conversation_stale', 'This conversation changed. Reload before sending that answer.', 409);
    }
    if (refinementStages.has(current.stage) && this.recommendedResourceSetService) {
      if (this.recommendationDesignService) {
        try {
          const refinement = await this.recommendationDesignService.refine({ userId, projectId, message: content });
          const session = await this.store.updateCreativeDirector(projectId, {
            ...current,
            transcript: [...current.transcript, transcriptEntry('merchant', content, at), transcriptEntry('calinium', refinement.message, at)],
            updated_at: at
          });
          await this.activity(project, userId, refinement.changed ? 'creative_direction_revised_conversationally' : 'creative_direction_explained', { kind: refinement.kind });
          return { session: { ...session, preset_selection: publicPresetCandidate(session.preset_selection) }, creative_direction: refinement.creative_direction };
        } catch (error) {
          if (!(error instanceof DashboardError) || error.code !== 'creative_refinement_unsupported') throw error;
        }
      }
      const currentSet = await this.recommendedResourceSetService.ensure({ userId, projectId });
      assert(currentSet.revision_id, 'recommended_resource_set_unavailable', 'Resource recommendations are not ready for conversational changes yet.', 409);
      const resourceSet = await this.recommendedResourceSetService.replaceFromConversation({ userId, projectId, expectedRevisionId: currentSet.revision_id, message: content });
      const session = await this.store.updateCreativeDirector(projectId, {
        ...current,
        transcript: [...current.transcript, transcriptEntry('merchant', content, at), transcriptEntry('calinium', 'I updated that resource choice. Review the current set before approving it.', at)],
        updated_at: at
      });
      await this.activity(project, userId, 'recommended_resource_set_revised_conversationally', {});
      return { session: { ...session, preset_selection: publicPresetCandidate(session.preset_selection) }, recommended_resource_set: resourceSet };
    }
    assert(current.stage === 'conversation', 'creative_director_stage_invalid', 'Return to the conversation before continuing.', 409);
    current = await this.reconcilePersistedConversationLiveness({ project, session: current });
    assert(boundConversationId === current.conversation_state?.conversationId, 'creative_director_conversation_stale', 'This conversation changed. Reload before sending that answer.', 409);
    assert(boundSessionUpdatedAt === current.updated_at, 'creative_director_conversation_stale', 'This conversation changed. Reload before sending that answer.', 409);
    const liveness = assessConversationLiveness({ session: current });
    assert(liveness.status === LIVENESS_STATUS.QUESTION_REQUIRED, 'creative_director_question_required', 'Reload the conversation before sending that answer.', 409);
    if (this.merchantIntakeService) await this.merchantIntakeService.begin({
      userId,
      projectId,
      // The three merchant-owned Quick Start questions can be answered before
      // Shopify learning finishes. Before falling back to the catalog question,
      // wait for the already-running intake so a known offer is not asked again.
      awaitCompletion: current.conversation_state.currentQuestionId === 'goal'
    });
    const context = this.merchantIntakeService ? await this.merchantIntakeService.conversationContext({ userId, projectId }) : null;
    const response = await this.adapter.respond({ state: current.conversation_state, message: content, context });
    assert(response.answerAccepted !== false, 'creative_director_question_required', 'Reload the conversation before sending that answer.', 409);
    const conversationAt = monotonicRevisionAt(current.updated_at, this.now());
    const next = {
      ...current,
      stage: response.state.readyForCreativeBrief && !response.state.currentQuestionId ? 'understanding' : 'conversation',
      conversation_state: response.state,
      transcript: [...current.transcript, transcriptEntry('merchant', content, conversationAt), transcriptEntry('calinium', response.message, conversationAt)],
      updated_at: conversationAt
    };
    const validationErrors = this.adapter.conversation.validateConversationState(next.conversation_state, { root: this.root });
    assert(validationErrors.length === 0, 'creative_director_conversation_invalid', 'The saved conversation could not be verified.', 500);
    assert(typeof this.store.transaction === 'function' && typeof this.store.updateCreativeDirectorIfMatch === 'function', 'creative_director_conversation_cas_unavailable', 'Conversation answers are unavailable until durable concurrency protection is active.', 503);
    const result = await this.store.transaction(async (transaction) => {
      const fresh = await transaction.findCreativeDirectorForProject(projectId);
      if (!fresh || fresh.updated_at !== current.updated_at || fresh.conversation_state?.conversationId !== boundConversationId) {
        throw new DashboardError('creative_director_conversation_stale', 'This conversation changed. Reload before sending that answer.', 409);
      }
      const saved = await transaction.updateCreativeDirectorIfMatch(projectId, current.updated_at, next);
      if (!saved.updated) throw new DashboardError('creative_director_conversation_stale', 'This conversation changed. Reload before sending that answer.', 409);
      await transaction.createActivity({
        id: createId('act'),
        organization_id: project.organization_id,
        project_id: project.id,
        actor_user_id: userId,
        type: 'creative_director_message_saved',
        payload: { stage: saved.session.stage, question_id: current.conversation_state.currentQuestionId },
        created_at: conversationAt
      });
      return saved.session;
    });
    const session = result;
    return { session: { ...session, preset_selection: publicPresetCandidate(session.preset_selection) } };
  }

  async correctUnderstanding({ userId, projectId, path, value }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    assert(['understanding', 'blueprint'].includes(current.stage), 'creative_director_stage_invalid', 'Review the understanding before revising it.', 409);
    const validPath = typeof path === 'string' && /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*$/.test(path);
    assert(validPath, 'understanding_path_invalid', 'Choose a valid detail to revise.', 422);
    const nextState = this.adapter.correct({ state: current.conversation_state, path, value });
    const at = this.now();
    const session = await this.store.updateCreativeDirector(projectId, {
      ...current,
      stage: 'understanding', conversation_state: nextState, creative_brief: null, store_strategy: null,
      review: this.adapter.createReviewState(), merchant_profile: null, resource_plan: defaultResourcePlan(), generation_context: defaultGenerationContext(), generation_state: defaultGenerationState(), preview_state: defaultPreviewState(), content_plan: defaultContentPlan(at), preset_selection: null,
      transcript: [...current.transcript, transcriptEntry('calinium', this.adapter.understanding(nextState), at)], updated_at: at
    });
    await this.activity(project, userId, 'creative_director_understanding_revised', { path });
    return { session };
  }

  async createBrief({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    assert(current.conversation_state?.readyForCreativeBrief, 'creative_brief_not_ready', 'Calinium needs a little more business context before preparing your Brand Blueprint.', 409);
    const creativeBrief = this.adapter.createCreativeBrief({ state: current.conversation_state });
    const at = this.now();
    const session = await this.store.updateCreativeDirector(projectId, { ...current, stage: 'blueprint', creative_brief: creativeBrief, review: this.adapter.createReviewState(), updated_at: at });
    await this.activity(project, userId, 'creative_brief_prepared', {});
    return { session };
  }

  async approveBrief({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    assert(current.creative_brief, 'creative_brief_missing', 'Prepare the Brand Blueprint before approving it.', 409);
    const review = this.adapter.setCreativeBriefStatus(current.review || this.adapter.createReviewState(), 'approved');
    const storeStrategy = current.store_strategy || this.adapter.createStoreStrategy({ creativeBrief: current.creative_brief });
    const at = this.now();
    const session = await this.store.updateCreativeDirector(projectId, { ...current, stage: 'strategy', store_strategy: storeStrategy, review, updated_at: at });
    await this.activity(project, userId, 'creative_brief_approved', {});
    return { session };
  }

  async requestBriefRevision({ userId, projectId, comment = '' }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    assert(current.creative_brief, 'creative_brief_missing', 'Prepare the Brand Blueprint before revising it.', 409);
    const review = this.adapter.setCreativeBriefStatus(current.review || this.adapter.createReviewState(), 'revision_requested');
    const at = this.now();
    const session = await this.store.updateCreativeDirector(projectId, { ...current, stage: 'understanding', review, transcript: [...current.transcript, transcriptEntry('calinium', this.adapter.understanding(current.conversation_state), at)], updated_at: at });
    await this.activity(project, userId, 'creative_brief_revision_requested', { comment: String(comment).slice(0, 1000) });
    return { session };
  }

  async decideRecommendation({ userId, projectId, recommendationPath, status, comment = '' }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    assert(current.store_strategy, 'store_strategy_missing', 'Approve the Brand Blueprint before reviewing the Store Strategy.', 409);
    const allowed = ['approved', 'rejected', 'revision_requested'];
    assert(allowed.includes(status), 'recommendation_decision_invalid', 'Choose an approval, revision, or rejection.', 422);
    const recommendation = (current.store_strategy.recommendations || []).find((item) => item.id === recommendationPath);
    assert(recommendation, 'recommendation_not_found', 'Choose a current recommendation.', 422);
    const review = status === 'approved'
      ? this.adapter.approveRecommendation(current.review, recommendationPath, comment)
      : status === 'rejected'
        ? this.adapter.rejectRecommendation(current.review, recommendationPath, comment)
        : this.adapter.requestRevision(current.review, recommendationPath, comment);
    const at = this.now();
    const session = await this.store.updateCreativeDirector(projectId, { ...current, stage: 'strategy', review, updated_at: at });
    await this.activity(project, userId, 'store_strategy_recommendation_reviewed', { recommendation: recommendationPath, status });
    return { session };
  }

  async approveStrategy({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    if (approvedStrategyReplay(current)) return { session: { ...current, preset_selection: publicPresetCandidate(current.preset_selection) } };
    if (current.stage === 'preset') throw new DashboardError('store_strategy_stale', 'The Store Strategy changed. Reload before approving it again.', 409);
    assert(current.stage === 'strategy', 'creative_director_stage_invalid', 'Review the Store Strategy before continuing.', 409);
    assert(current.store_strategy && current.creative_brief, 'store_strategy_missing', 'Prepare the Store Strategy before approving it.', 409);
    const decisions = new Map((current.review?.decisions || []).map((decision) => [decision.path, decision]));
    const unresolved = (current.store_strategy.recommendations || [])
      .filter((recommendation) => recommendation.requiresMerchantApproval)
      .map((recommendation) => ({ recommendation, decision: decisions.get(recommendation.id) || null }))
      .filter(({ decision }) => !['approved', 'rejected'].includes(decision?.status));
    assert(!unresolved.length, 'store_strategy_revision_open', 'One Store Strategy decision needs to be reviewed before a preset can be recommended.', 409, {
      recommendations: unresolved.map(({ recommendation, decision }) => ({ id: recommendation.id, status: decision?.status || 'missing' }))
    });
    const review = this.adapter.setStoreStrategyStatus(current.review, 'approved');
    const generation = defaultGenerationContext();
    let merchantProfile = null;
    let compilerStrategy = null;
    let presetSelection = null;
    const at = monotonicRevisionAt(current.updated_at, this.now());
    try {
      const result = this.adapter.generateStorefront({ creativeBrief: current.creative_brief, storeStrategy: current.store_strategy, review, generation, generationId: `generation-run-dashboard-plan-${createId('plan').slice(5)}` });
      merchantProfile = result.merchant_profile;
      compilerStrategy = result.compiler_strategy;
      presetSelection = presetCandidateFromRecommendation({ compilerStrategy, storeStrategy: current.store_strategy, creativeBrief: current.creative_brief, merchantProfile, at, root: this.root });
    } catch (error) {
      throw new DashboardError('preset_recommendation_unavailable', 'One Store Strategy decision needs to be reviewed before a preset can be recommended.', 409, { review_area: 'store_strategy', reason_code: presetPlanningFailureReason(error) });
    }
    const next = { ...current, stage: 'preset', review, merchant_profile: merchantProfile, resource_plan: defaultResourcePlan(), generation_context: generation, content_plan: defaultContentPlan(at), preset_selection: presetSelection, updated_at: at };
    assert(typeof this.store.transaction === 'function' && typeof this.store.updateCreativeDirectorIfMatch === 'function', 'store_strategy_cas_unavailable', 'Store Strategy approval is unavailable until durable concurrency protection is active.', 503);
    const session = await this.store.transaction(async (transaction) => {
      const fresh = await transaction.findCreativeDirectorForProject(projectId);
      if (!fresh || fresh.updated_at !== current.updated_at) {
        if (approvedStrategyReplay(fresh)) return fresh;
        throw new DashboardError('store_strategy_stale', 'The Store Strategy changed. Reload before approving it again.', 409);
      }
      const saved = await transaction.updateCreativeDirectorIfMatch(projectId, current.updated_at, next);
      if (!saved.updated) {
        if (approvedStrategyReplay(saved.session)) return saved.session;
        throw new DashboardError('store_strategy_stale', 'The Store Strategy changed. Reload before approving it again.', 409);
      }
      await transaction.createActivity({
        id: createId('act'), organization_id: project.organization_id, project_id: project.id, actor_user_id: userId,
        type: 'store_strategy_approved', payload: { preset_recommendation: presetSelection.recommended_preset_id }, created_at: at
      });
      return saved.session;
    });
    return { session: { ...session, preset_selection: publicPresetCandidate(session.preset_selection) } };
  }

  async selectPreset({ userId, projectId, presetId, expectedVersion }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    assert(current.stage === 'preset', 'creative_director_stage_invalid', 'Review the storefront preset before continuing.', 409);
    const generation = defaultGenerationContext();
    const result = this.adapter.generateStorefront({ creativeBrief: current.creative_brief, storeStrategy: current.store_strategy, review: current.review, generation, generationId: `generation-run-dashboard-preset-${createId('plan').slice(5)}` });
    const at = this.now();
    const presetSelection = selectPresetCandidate({ candidate: current.preset_selection, compilerStrategy: result.compiler_strategy, storeStrategy: current.store_strategy, presetId, expectedVersion, at, root: this.root });
    const session = await this.store.updateCreativeDirector(projectId, { ...current, stage: 'preset', preset_selection: presetSelection, updated_at: at });
    await this.activity(project, userId, 'storefront_preset_selected', { preset_id: presetSelection.selected_preset_id, selection_source: presetSelection.selection_source });
    return { session: { ...session, preset_selection: publicPresetCandidate(session.preset_selection) } };
  }

  async approvePreset({ userId, projectId, expectedVersion }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    assert(current.stage === 'preset', 'creative_director_stage_invalid', 'Review the storefront preset before continuing.', 409);
    assert(current.preset_selection?.candidate_version === expectedVersion, 'preset_selection_stale', 'This preset choice changed in another session. Refresh before approving it.', 409);
    const at = this.now();
    const approvedPresetRevision = buildApprovedPresetRevision({ candidate: current.preset_selection, project, userId, storeStrategy: current.store_strategy, at, root: this.root });
    const generation = defaultGenerationContext();
    const result = this.adapter.generateStorefront({ creativeBrief: current.creative_brief, storeStrategy: current.store_strategy, review: current.review, generation, approvedPresetRevision, generationId: `generation-run-dashboard-plan-${createId('plan').slice(5)}` });
    const appliedHomepageSections = result.draft.homepage_plan.sections.map((section) => section.section_id);
    const nextPresetSelection = { ...current.preset_selection, status: 'approved', approved_revision_id: approvedPresetRevision.revision_id, applied_homepage_sections: appliedHomepageSections, updated_at: at };
    const effectiveStrategy = storeStrategyForPreset(current.store_strategy, nextPresetSelection);
    const shopify = await this.shopifyContext({ userId, projectId });
    let resourcePlan = {
      status: 'ready', fields: draftFields(result.draft), groups: resourceGroups(draftFields(result.draft)), required_assets: result.draft.required_assets?.required || [], blocker: null,
      required_confirmations: draftConfirmations(result.draft), shopify_connection: shopify.connection ? { status: shopify.connection.connection_status, display_name: shopify.connection.display_name, last_synced_at: shopify.connection.last_synced_at } : { status: 'not_connected' }, draft_readiness: result.draft.draft_readiness
    };
    resourcePlan = reconcileResourcePlan({ resourcePlan, storeStrategy: effectiveStrategy, review: current.review, recordHistory: false }).resourcePlan;
    resourcePlan = applyResourceConfirmationEligibility({ resourcePlan, storeStrategy: effectiveStrategy, approvedPresetRevision, at }).resourcePlan;
    const session = await this.store.transaction(async (transaction) => {
      await transaction.createApprovedPresetRevision(approvedPresetRevision);
      return transaction.updateCreativeDirector(projectId, { ...current, stage: 'resources', merchant_profile: result.merchant_profile, resource_plan: resourcePlan, generation_context: generation, content_plan: defaultContentPlan(at), preset_selection: nextPresetSelection, updated_at: at });
    });
    await this.activity(project, userId, 'storefront_preset_approved', { preset_id: approvedPresetRevision.preset_id, preset_version: approvedPresetRevision.preset_version, preset_revision_id: approvedPresetRevision.revision_id });
    let creativeDirection = null;
    if (this.recommendationDesignService) {
      try { creativeDirection = await this.recommendationDesignService.ensure({ userId, projectId }); }
      catch { creativeDirection = null; }
    }
    return { session: { ...session, preset_selection: publicPresetCandidate(session.preset_selection) }, creative_direction: creativeDirection };
  }

  async approveCreativeDirection({ userId, projectId, expectedRecommendationRevisionId, expectedDnaRevisionId }) {
    assert(this.recommendationDesignService, 'creative_direction_unavailable', 'Creative direction review is not available in this environment.', 409);
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const approved = await this.recommendationDesignService.approve({ userId, projectId, expectedRecommendationRevisionId, expectedDnaRevisionId });
    await this.activity(project, userId, 'creative_direction_approved', { recommendation_revision_id: expectedRecommendationRevisionId, design_dna_revision_id: expectedDnaRevisionId });
    return approved;
  }

  async updateResources(args) {
    const projectId = args?.projectId;
    const previous = this.resourceUpdateLocks.get(projectId) || Promise.resolve();
    const operation = previous.catch(() => null).then(() => this.updateResourcesUnlocked(args));
    this.resourceUpdateLocks.set(projectId, operation);
    try { return await operation; }
    finally { if (this.resourceUpdateLocks.get(projectId) === operation) this.resourceUpdateLocks.delete(projectId); }
  }

  async updateResourcesUnlocked({ userId, projectId, assetSelections = {}, requiredAssetSelections = {}, shopifySelections = {}, resolvedEmptyFields = [], confirmedRequiredConfirmations = [], approvedOmissionFieldRefs = [], expectedResourceDecisionChecksum = null }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const contentPlanShop = await this.contentPlanShop(project);
    let current = await this.requireSession(projectId);
    current = await this.reconcilePersistedResourcePlan(projectId, current, contentPlanShop);
    assert(current.stage === 'resources', 'creative_director_stage_invalid', 'Review Store Resources before continuing.', 409);
    assert(current.resource_plan?.status === 'ready', 'resource_plan_unavailable', current.resource_plan?.blocker || 'Calinium could not prepare this resource plan yet.', 409);
    const effectivePlan = effectiveResourcePlan(current.resource_plan);
    if (expectedResourceDecisionChecksum) {
      assert(expectedResourceDecisionChecksum === current.generation_context?.resource_confirmation_decisions?.checksum, 'resource_confirmation_stale', 'These resource decisions changed. Reload before confirming them.', 409);
    }
    const fields = new Map((effectivePlan.fields || []).map((field) => [field.setting_ref, field]));
    const assets = await this.assetService.list({ userId, projectId });
    const ownedAssets = new Set(assets.assets.filter((asset) => asset.upload_status === 'ready').map((asset) => asset.id));
    const generation = defaultGenerationContext();
    const requiredConfirmations = new Set(actionableConfirmationIds(current.resource_plan));
    assert(Array.isArray(confirmedRequiredConfirmations), 'resource_confirmation_invalid', 'Review the required confirmations before continuing.', 422);
    for (const confirmation of confirmedRequiredConfirmations) {
      assert(typeof confirmation === 'string' && requiredConfirmations.has(confirmation), 'resource_confirmation_invalid', 'Review only the confirmations required by the current resource plan.', 422);
      generation.completed_confirmations.push(confirmation);
    }
    for (const [settingRef, assetId] of Object.entries(assetSelections || {})) {
      const field = fields.get(settingRef);
      // A browser can retain a legacy selection while a strategy reconciliation
      // removes that field. It is no longer part of this plan and must not
      // prevent the merchant from approving the current plan.
      if (!field) continue;
      assert(field && ['image', 'video'].includes(field.kind), 'resource_selection_invalid', 'Choose an approved image or video resource for this request.', 422);
      assert(ownedAssets.has(assetId), 'resource_asset_unavailable', 'Choose an asset from this project.', 422);
      generation.merchant_references[settingRef] = `dashboard://projects/${projectId}/assets/${assetId}`;
      generation.completed_confirmations.push(`field:${settingRef}`);
    }
    for (const [settingRef, resourceId] of Object.entries(shopifySelections || {})) {
      const field = fields.get(settingRef);
      if (!field) continue;
      const allowedTypes = field && ({ product: ['product'], collection: ['collection'], menu: ['menu'], image: ['file', 'product_media'], video: ['file', 'product_media'] }[field.kind]);
      assert(field && allowedTypes, 'shopify_resource_selection_invalid', 'Choose an approved Shopify resource for this request.', 422);
      assert(this.shopifyService, 'shopify_connection_missing', 'Connect a Shopify store before selecting Shopify resources.', 409);
      let selected;
      try {
        selected = await this.shopifyService.resolveApprovedResource({ projectId, organizationId: project.organization_id, resourceId, allowedTypes });
      } catch (error) {
        if (error instanceof DashboardError) {
          throw new DashboardError(
            error.code,
            `The selected resource no longer satisfies ${field.section_id || 'this section'}.`,
            error.status,
            { blockers: [resourceRequirementDetails(field, {
              selectedResourceId: resourceId || null,
              selectedResourceKind: 'shopify',
              approvalStatus: error.code === 'shopify_resource_approval_required' ? 'not_approved' : 'unavailable',
              currentStatus: error.code === 'shopify_resource_stale' ? 'stale' : 'unavailable',
              exactValidationFailure: error.message
            })] }
          );
        }
        throw error;
      }
      generation.merchant_references[settingRef] = `dashboard://projects/${projectId}/shopify-resources/${selected.resource.id}`;
      generation.shopify_resource_references[settingRef] = selected.resource.id;
      generation.completed_confirmations.push(`field:${settingRef}`);
    }
    for (const [requiredAssetId, selectedValue] of Object.entries(requiredAssetSelections || {})) {
      const requirement = (effectivePlan.required_assets || []).find((asset) => asset.asset_id === requiredAssetId);
      if (!requirement) continue;
      const selection = requiredAssetSelection(selectedValue);
      if (!selection.id) continue;
      if (selection.source === 'asset') {
        assert(ownedAssets.has(selection.id), 'resource_asset_unavailable', 'Choose an asset from this project.', 422);
        generation.asset_references[requiredAssetId] = `dashboard://projects/${projectId}/assets/${selection.id}`;
      } else {
        assert(selection.source === 'shopify' && this.shopifyService, 'shopify_resource_selection_invalid', 'Choose an approved Shopify file for this request.', 422);
        const resource = await this.shopifyService.resolveApprovedResource({ projectId, organizationId: project.organization_id, resourceId: selection.id, allowedTypes: ['file', 'product_media'] });
        generation.asset_references[requiredAssetId] = `dashboard://projects/${projectId}/shopify-resources/${resource.resource.id}`;
      }
    }
    const approvedOmissions = new Set(approvedOmissionFieldRefs || []);
    for (const fieldRef of resolvedEmptyFields || []) {
      const field = fields.get(fieldRef);
      // Ignore old optional selections which are absent from the effective
      // plan. Rejecting them produced a generic error even when every visible
      // current requirement was selected and approved.
      if (!field) continue;
      assert(!field.required || approvedOmissions.has(fieldRef), 'resource_empty_decision_invalid', `An approved selection is required for ${field.section_id || 'this section'}.`, 422, {
        blockers: [resourceRequirementDetails(field, {
          currentStatus: 'not_selected',
          exactValidationFailure: `An approved ${field.kind} is required for this field.`
        })]
      });
      generation.resolved_empty_fields.push(fieldRef);
    }
    for (const asset of effectivePlan.required_assets || []) {
      const fieldRef = (asset.field_refs || []).find((value) => Object.hasOwn(generation.merchant_references, value));
      if (fieldRef) generation.asset_references[asset.asset_id] = generation.merchant_references[fieldRef];
    }
    const optionalFields = (effectivePlan.fields || []).filter((field) => !field.required).map((field) => field.setting_ref);
    generation.resolved_empty_fields.push(...optionalFields);
    generation.resource_confirmation_decisions = buildDecisionSet({
      eligibility: current.resource_plan.confirmation_eligibility,
      completedConfirmations: generation.completed_confirmations,
      previous: current.generation_context?.resource_confirmation_decisions,
      actorUserId: userId,
      at: this.now()
    });
    const requiredFields = (effectivePlan.fields || []).filter((field) => field.required);
    const requiredAssets = effectivePlan.required_assets || [];
    const blockers = resourcePlanSelectionBlockers(current.resource_plan, generation, approvedOmissionFieldRefs);
    const complete = blockers.length === 0
      && requiredFields.every((field) => Object.hasOwn(generation.merchant_references, field.setting_ref) || generation.resolved_empty_fields.includes(field.setting_ref))
      && requiredAssets.every((asset) => generation.asset_references[asset.asset_id]);
    if (complete) {
      generation.status = 'ready_for_generation';
      generation.approval_reference = `merchant-resource-approval-${current.id}`;
      generation.approved_at = this.now();
    }
    generation.completed_confirmations = [...new Set(generation.completed_confirmations)].sort();
    generation.resolved_empty_fields = [...new Set(generation.resolved_empty_fields)].sort();
    const at = this.now();
    // Resource approval is the only forward transition from Store Resources.
    // Keep an incomplete plan in place for continued editing; a complete plan
    // goes to the paid storefront offer. The generator is deliberately not a
    // direct Creative Director action.
    let contentResult = complete ? materializeContentPlanForSession({ ...current, generation_context: generation }, at, this.contentPlanSourceRevision, { shop: contentPlanShop, approved_shop: contentPlanShop }) : null;
    const initialContentTransitions = contentResult?.transitions || [];
    const effectiveStrategy = contentResult?.effectiveStoreStrategy || contentPlanStrategy({ ...current, generation_context: generation }, at, this.contentPlanSourceRevision);
    let nextContentPlan = contentResult?.contentPlan || current.content_plan;
    let contentPlanCandidateReset = false;
    // Returning to Store Resources is an explicit request to review the
    // inputs. A prior immutable plan must never silently survive that review:
    // its existing revision remains reproducible, while the candidate becomes
    // a child revision that requires a fresh content approval.
    if (complete && contentPlanRequired(effectiveStrategy) && contentPlanApproved(nextContentPlan, effectiveStrategy)) {
      contentPlanCandidateReset = true;
      nextContentPlan = {
        ...nextContentPlan,
        status: 'draft',
        candidate_version: nextContentPlan.candidate_version + 1,
        approved_revision_id: null,
        approved_resource_snapshot_revision_id: null,
        warnings: [],
        ...(nextContentPlan.lookbook ? {
          lookbook: {
            ...nextContentPlan.lookbook,
            status: lookbookPlanRequired(effectiveStrategy) ? 'draft' : nextContentPlan.lookbook.status,
            candidate_version: lookbookPlanRequired(effectiveStrategy) ? nextContentPlan.lookbook.candidate_version + 1 : nextContentPlan.lookbook.candidate_version,
            updated_at: at
          }
        } : {}),
        ...(nextContentPlan.craftsmanship ? {
          craftsmanship: {
            ...nextContentPlan.craftsmanship,
            status: craftsmanshipPlanRequired(effectiveStrategy) ? 'draft' : nextContentPlan.craftsmanship.status,
            candidate_version: craftsmanshipPlanRequired(effectiveStrategy) ? nextContentPlan.craftsmanship.candidate_version + 1 : nextContentPlan.craftsmanship.candidate_version,
            updated_at: at
          }
        } : {}),
        ...(nextContentPlan.manufacturing_process ? {
          manufacturing_process: {
            ...nextContentPlan.manufacturing_process,
            status: manufacturingProcessPlanRequired(effectiveStrategy) ? 'draft' : nextContentPlan.manufacturing_process.status,
            candidate_version: manufacturingProcessPlanRequired(effectiveStrategy) ? nextContentPlan.manufacturing_process.candidate_version + 1 : nextContentPlan.manufacturing_process.candidate_version,
            updated_at: at
          }
        } : {}),
        updated_at: at
      };
      nextContentPlan = {
        ...nextContentPlan,
        ...Object.fromEntries(ADDITIONAL_EVIDENCE_PLANS.filter((adapter) => nextContentPlan[adapter.config.key]).map((adapter) => {
          const candidate = nextContentPlan[adapter.config.key];
          const required = adapter.planRequired(effectiveStrategy);
          return [adapter.config.key, { ...candidate, status: required ? 'draft' : candidate.status, candidate_version: required ? candidate.candidate_version + 1 : candidate.candidate_version, updated_at: at }];
        }))
      };
      nextContentPlan = {
        ...nextContentPlan,
        ...Object.fromEntries(COMMERCE_PLANS.filter((adapter) => nextContentPlan[adapter.config.key]).map((adapter) => {
          const candidate = nextContentPlan[adapter.config.key];
          const required = adapter.planRequired(effectiveStrategy);
          return [adapter.config.key, { ...candidate, status: required ? 'draft' : candidate.status, candidate_version: required ? candidate.candidate_version + 1 : candidate.candidate_version, updated_at: at }];
        }))
      };
      validateCandidate(editorialGridCandidate(nextContentPlan), this.root);
      if (nextContentPlan.lookbook) validateLookbookCandidate(nextContentPlan.lookbook, this.root);
      if (nextContentPlan.craftsmanship) validateCraftsmanshipCandidate(nextContentPlan.craftsmanship, this.root);
      if (nextContentPlan.manufacturing_process) validateManufacturingProcessCandidate(nextContentPlan.manufacturing_process, this.root);
      validateAdditionalEvidenceCandidates(nextContentPlan, this.root);
      validateCommerceCandidates(nextContentPlan, this.root);
    }
    if (complete && contentPlanCandidateReset) {
      const rematerialized = materializeContentPlanForSession({ ...current, generation_context: generation, content_plan: nextContentPlan }, at, this.contentPlanSourceRevision, { shop: contentPlanShop, approved_shop: contentPlanShop });
      contentResult = {
        ...rematerialized,
        transitions: [...initialContentTransitions, ...rematerialized.transitions]
      };
      nextContentPlan = rematerialized.contentPlan;
    }
    const revisionAt = monotonicRevisionAt(current.updated_at, at);
    const nextSession = {
      ...current,
      stage: complete ? contentResult.stage : current.stage,
      resource_plan: complete && current.resource_plan?.reconciliation?.requires_merchant_review
        ? {
          ...current.resource_plan,
          reconciliation: {
            ...current.resource_plan.reconciliation,
            requires_merchant_review: false,
            status: 'reviewed',
            reviewed_at: at
          },
          reconciliation_history: [
            ...(current.resource_plan.reconciliation_history || []),
            { type: 'merchant_resource_plan_reapproved', changed_at: at, change_signature: current.resource_plan.reconciliation.change_signature }
          ]
        }
        : current.resource_plan,
      generation_context: generation,
      content_plan: nextContentPlan,
      updated_at: revisionAt
    };
    assert(typeof this.store.transaction === 'function' && typeof this.store.updateCreativeDirectorIfMatch === 'function', 'store_resources_cas_unavailable', 'Store Resources cannot be saved until durable concurrency protection is active.', 503);
    const session = await this.store.transaction(async (transaction) => {
      const fresh = await transaction.findCreativeDirectorForProject(projectId);
      assert(fresh?.updated_at === current.updated_at, 'resource_confirmation_stale', 'These resource decisions changed. Reload before confirming them.', 409);
      const saved = await transaction.updateCreativeDirectorIfMatch(projectId, current.updated_at, nextSession);
      assert(saved.updated, 'resource_confirmation_stale', 'These resource decisions changed. Reload before confirming them.', 409);
      await transaction.createActivity({
        id: createId('act'), organization_id: project.organization_id, project_id: project.id, actor_user_id: userId,
        type: 'store_resources_updated', payload: { ready_for_generation: complete }, created_at: revisionAt
      });
      if (complete && (newContentPlanReconciliationCount(current.content_plan, contentResult.eligibility) || contentResult.stage === 'offer')) {
        await transaction.createActivity(this.contentPlanReconciliationActivity(project, current, saved.session, contentResult));
      }
      return saved.session;
    });
    return { session, resource_validation: { complete, blockers } };
  }

  async approveRecommendedResourceSet(args) {
    const projectId = args?.projectId;
    const previous = this.recommendedResourceApprovalLocks.get(projectId) || Promise.resolve();
    const operation = previous.catch(() => null).then(() => this.approveRecommendedResourceSetUnlocked(args));
    this.recommendedResourceApprovalLocks.set(projectId, operation);
    try { return await operation; }
    finally { if (this.recommendedResourceApprovalLocks.get(projectId) === operation) this.recommendedResourceApprovalLocks.delete(projectId); }
  }

  async approveRecommendedResourceSetUnlocked({ userId, projectId, expectedRevisionId }) {
    assert(this.recommendedResourceSetService, 'recommended_resource_set_unavailable', 'Resource recommendations are not available in this environment.', 409);
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    const approved = await this.recommendedResourceSetService.approve({ userId, projectId, expectedRevisionId });
    if (current.stage !== 'resources') {
      const binding = current.generation_context?.recommended_resource_set_approval;
      assert(approved.reused && binding?.revision_id === approved.approved_revision.revision_id, 'creative_director_stage_invalid', 'Review Store Resources before approving these recommendations.', 409);
      return { session: { ...current, preset_selection: publicPresetCandidate(current.preset_selection) }, recommended_resource_set: approved.resource_set, resource_validation: { complete: current.generation_context?.status === 'ready_for_generation', blockers: [] } };
    }
    const applied = await this.updateResources({
      userId,
      projectId,
      assetSelections: approved.handoff.asset_selections,
      requiredAssetSelections: approved.handoff.required_asset_selections,
      shopifySelections: approved.handoff.shopify_selections,
      resolvedEmptyFields: approved.handoff.resolved_empty_fields,
      // Only this server-resolved immutable recommendation may authorize an
      // omission for a field the legacy Resource Plan classified as required.
      approvedOmissionFieldRefs: approved.handoff.resolved_empty_fields
    });
    const at = this.now();
    const session = await this.store.updateCreativeDirector(projectId, {
      ...applied.session,
      generation_context: {
        ...applied.session.generation_context,
        recommended_resource_set_approval: {
          revision_id: approved.approved_revision.revision_id,
          candidate_revision_id: approved.approved_revision.candidate_revision_id,
          checksum: approved.approved_revision.approval_checksum,
          approved_at: approved.approved_revision.approval.approved_at,
          omitted_field_refs: approved.handoff.resolved_empty_fields
        }
      },
      updated_at: at
    });
    await this.activity(project, userId, 'recommended_resource_set_approved', {
      ready_for_generation: applied.resource_validation.complete,
      approved_slot_count: approved.approved_revision.assignments.length,
      individual_review_count: approved.resource_set.exceptions.length
    });
    return { session: { ...session, preset_selection: publicPresetCandidate(session.preset_selection) }, recommended_resource_set: approved.resource_set, resource_validation: applied.resource_validation };
  }

  async persistContentPlanChange({ project, userId, current, stage, contentPlan, at, activityType, activityPayload, approvedRecords = null }) {
    assert(typeof this.store.transaction === 'function' && typeof this.store.updateCreativeDirectorIfMatch === 'function', 'content_plan_mutation_cas_unavailable', 'Content-plan updates are unavailable until durable concurrency protection is active.', 503);
    const revisionAt = monotonicRevisionAt(current.updated_at, at);
    return this.store.transaction(async (transaction) => {
      const fresh = await transaction.findCreativeDirectorForProject(project.id);
      assert(fresh?.updated_at === current.updated_at, 'content_plan_candidate_stale', 'This content plan changed elsewhere. Reload before continuing.', 409);
      if (approvedRecords) {
        await transaction.createApprovedBlockPlanRevision(approvedRecords.planRevision);
        await transaction.createApprovedBlockPlanResourceSnapshot(approvedRecords.resourceSnapshot);
      }
      const saved = await transaction.updateCreativeDirectorIfMatch(project.id, current.updated_at, { ...current, stage, content_plan: contentPlan, updated_at: revisionAt });
      assert(saved.updated, 'content_plan_candidate_stale', 'This content plan changed elsewhere. Reload before continuing.', 409);
      await transaction.createActivity({
        id: createId('act'),
        organization_id: project.organization_id,
        project_id: project.id,
        actor_user_id: userId,
        type: activityType,
        payload: activityPayload,
        created_at: revisionAt
      });
      return saved.session;
    });
  }

  async saveEditorialGridPlan({ userId, projectId, expectedVersion, stories }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    const at = this.now();
    const prepared = preparedContentPlanForSession(current, at, this.contentPlanSourceRevision);
    assert(editorialGridPlanRequired(prepared.strategy), 'editorial_grid_plan_not_required', 'This approved storefront direction does not include Editorial Grid.', 409);
    assert(['content-plan', 'offer'].includes(current.stage), 'creative_director_stage_invalid', 'Review Store Resources before editing Editorial Grid content.', 409);
    const candidate = editorialGridCandidate(prepared.contentPlan);
    validateCandidate(candidate, this.root);
    const next = saveCandidate({ current: candidate, expectedVersion, stories, root: this.root, at });
    const result = contentPlanResultForCandidate(current, { ...prepared.contentPlan, ...next }, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: 'content-plan', contentPlan: result.contentPlan, at, activityType: 'editorial_grid_candidate_saved', activityPayload: { story_count: next.stories.length, candidate_version: next.candidate_version } });
    return { session };
  }

  async regenerateEditorialGridPlan({ userId, projectId, expectedVersion }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    const at = this.now();
    const prepared = preparedContentPlanForSession(current, at, this.contentPlanSourceRevision);
    assert(editorialGridPlanRequired(prepared.strategy), 'editorial_grid_plan_not_required', 'This approved storefront direction does not include Editorial Grid.', 409);
    const candidate = editorialGridCandidate(prepared.contentPlan);
    assert(Number.isInteger(expectedVersion) && expectedVersion === candidate.candidate_version, 'editorial_grid_candidate_stale', 'This Editorial Grid plan changed elsewhere. Reload it before refreshing.', 409);
    // This first slice intentionally performs a truth-preserving refresh. It
    // rechecks merchant-entered candidates but never invents stories or copy.
    const next = { ...candidate, status: 'draft', candidate_version: candidate.candidate_version + 1, warnings: candidate.stories.length ? candidate.warnings : ['no_merchant_authored_stories'], updated_at: at };
    validateCandidate(next, this.root);
    const result = contentPlanResultForCandidate(current, { ...prepared.contentPlan, ...next }, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: 'content-plan', contentPlan: result.contentPlan, at, activityType: 'editorial_grid_candidate_regenerated', activityPayload: { story_count: next.stories.length, candidate_version: next.candidate_version } });
    return { session };
  }

  async approveEditorialGridPlan({ userId, projectId, expectedVersion }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    assert(current.stage === 'content-plan', 'creative_director_stage_invalid', 'Review Editorial Grid content before approving it.', 409);
    const prepared = preparedContentPlanForSession(current, this.now(), this.contentPlanSourceRevision);
    assert(editorialGridPlanRequired(prepared.strategy), 'editorial_grid_plan_not_required', 'This approved storefront direction does not include Editorial Grid.', 409);
    assert(current.generation_context?.status === 'ready_for_generation', 'editorial_grid_resources_required', 'Approve the required Store Resources before approving Editorial Grid content.', 409);
    const candidate = editorialGridCandidate(prepared.contentPlan);
    validateCandidate(candidate, this.root);
    assert(Number.isInteger(expectedVersion) && expectedVersion === candidate.candidate_version, 'editorial_grid_candidate_stale', 'This Editorial Grid plan changed after review. Reload it before approving.', 409);
    assert(candidate.stories.length > 0, 'editorial_grid_story_required', 'Add at least one merchant-approved Editorial Grid story before approving this plan.', 422);
    assert(!candidate.warnings.length, 'editorial_grid_candidate_incomplete', 'Resolve the Editorial Grid warnings before approving this plan.', 422, { warnings: candidate.warnings });
    const resources = await resolveCandidateResources({ candidate, project, shopifyService: this.shopifyService, store: this.store });
    const at = this.now();
    let existingPlanRevision = null;
    let existingResourceSnapshot = null;
    if (current.content_plan?.approved_revision_id) {
      existingPlanRevision = await this.store.findApprovedBlockPlanRevision(current.content_plan.approved_revision_id, project.id, project.organization_id);
      existingResourceSnapshot = await this.store.findApprovedBlockPlanResourceSnapshot(current.content_plan.approved_resource_snapshot_revision_id, project.id, project.organization_id);
      assert(existingPlanRevision && existingResourceSnapshot, 'editorial_grid_parent_revision_missing', 'The previously approved content plan is unavailable. Reapprove the content plan before continuing.', 409);
    }
    const records = buildApprovedRecords({ candidate, project, userId, resources, at, root: this.root, existingPlanRevision, existingResourceSnapshot });
    const next = {
      ...prepared.contentPlan,
      ...candidate,
      status: 'approved',
      parent_revision_id: records.planRevision.revision_id,
      approved_revision_id: records.planRevision.revision_id,
      approved_resource_snapshot_revision_id: records.resourceSnapshot.revision_id,
      warnings: [],
      updated_at: at
    };
    validateCandidate(editorialGridCandidate(next), this.root);
    if (next.lookbook) validateLookbookCandidate(next.lookbook, this.root);
    if (next.craftsmanship) validateCraftsmanshipCandidate(next.craftsmanship, this.root);
    if (next.manufacturing_process) validateManufacturingProcessCandidate(next.manufacturing_process, this.root);
    const result = contentPlanResultForCandidate(current, next, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: result.stage, contentPlan: result.contentPlan, at, activityType: 'editorial_grid_plan_approved', activityPayload: { plan_id: records.planRevision.plan_id, revision_id: records.planRevision.revision_id, resource_snapshot_revision_id: records.resourceSnapshot.revision_id }, approvedRecords: records });
    return { session, approved_plan: { revision_id: records.planRevision.revision_id, resource_snapshot_revision_id: records.resourceSnapshot.revision_id } };
  }

  async saveLookbookPlan({ userId, projectId, expectedVersion, frames }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    const at = this.now();
    const preparedResult = preparedContentPlanForSession(current, at, this.contentPlanSourceRevision);
    assert(lookbookPlanRequired(preparedResult.strategy), 'lookbook_plan_not_required', 'This approved storefront direction does not include Lookbook.', 409);
    assert(['content-plan', 'offer'].includes(current.stage), 'creative_director_stage_invalid', 'Review Store Resources before editing Lookbook content.', 409);
    const prepared = preparedResult.contentPlan;
    const candidate = prepared.lookbook;
    validateLookbookCandidate(candidate, this.root);
    const nextCandidate = saveLookbookCandidate({ current: candidate, expectedVersion, frames, root: this.root, at });
    const next = { ...prepared, lookbook: nextCandidate };
    const result = contentPlanResultForCandidate(current, next, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: 'content-plan', contentPlan: result.contentPlan, at, activityType: 'lookbook_candidate_saved', activityPayload: { frame_count: nextCandidate.frames.length, candidate_version: nextCandidate.candidate_version } });
    return { session };
  }

  async regenerateLookbookPlan({ userId, projectId, expectedVersion }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    const at = this.now();
    const preparedResult = preparedContentPlanForSession(current, at, this.contentPlanSourceRevision);
    assert(lookbookPlanRequired(preparedResult.strategy), 'lookbook_plan_not_required', 'This approved storefront direction does not include Lookbook.', 409);
    const prepared = preparedResult.contentPlan;
    const candidate = prepared.lookbook;
    assert(Number.isInteger(expectedVersion) && expectedVersion === candidate.candidate_version, 'lookbook_candidate_stale', 'This Lookbook plan changed after review. Reload it before refreshing.', 409);
    const nextCandidate = { ...candidate, status: 'draft', candidate_version: candidate.candidate_version + 1, warnings: candidate.frames.length ? candidate.warnings : ['no_merchant_authored_frames'], updated_at: at };
    validateLookbookCandidate(nextCandidate, this.root);
    const result = contentPlanResultForCandidate(current, { ...prepared, lookbook: nextCandidate }, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: 'content-plan', contentPlan: result.contentPlan, at, activityType: 'lookbook_candidate_regenerated', activityPayload: { frame_count: nextCandidate.frames.length, candidate_version: nextCandidate.candidate_version } });
    return { session };
  }

  async approveLookbookPlan({ userId, projectId, expectedVersion }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    assert(current.stage === 'content-plan', 'creative_director_stage_invalid', 'Review Lookbook content before approving it.', 409);
    const preparedResult = preparedContentPlanForSession(current, this.now(), this.contentPlanSourceRevision);
    assert(lookbookPlanRequired(preparedResult.strategy), 'lookbook_plan_not_required', 'This approved storefront direction does not include Lookbook.', 409);
    assert(current.generation_context?.status === 'ready_for_generation', 'lookbook_resources_required', 'Approve the required Store Resources before approving Lookbook content.', 409);
    const prepared = preparedResult.contentPlan;
    const candidate = prepared.lookbook;
    validateLookbookCandidate(candidate, this.root);
    assert(Number.isInteger(expectedVersion) && expectedVersion === candidate.candidate_version, 'lookbook_candidate_stale', 'This Lookbook plan changed after review. Reload it before approving.', 409);
    assert(candidate.frames.length > 0, 'lookbook_frame_required', 'Add at least one merchant-approved Lookbook frame before approving this plan.', 422);
    assert(!candidate.warnings.length, 'lookbook_candidate_incomplete', 'Resolve the Lookbook warnings before approving this plan.', 422, { warnings: candidate.warnings });
    let existingPlanRevision = null;
    let existingResourceSnapshot = null;
    if (prepared.approved_revision_id) {
      existingPlanRevision = await this.store.findApprovedBlockPlanRevision(prepared.approved_revision_id, project.id, project.organization_id);
      existingResourceSnapshot = await this.store.findApprovedBlockPlanResourceSnapshot(prepared.approved_resource_snapshot_revision_id, project.id, project.organization_id);
      assert(existingPlanRevision && existingResourceSnapshot, 'lookbook_parent_revision_missing', 'The previously approved content plan is unavailable. Reapprove the content plan before continuing.', 409);
    }
    if (editorialGridPlanRequired(preparedResult.strategy)) {
      const editorialTarget = preparedResult.eligibility.targets.find((target) => target.target_key === 'editorial_grid');
      assert(editorialTarget?.eligibility_state === 'ready_from_authoritative_content' && existingPlanRevision, 'editorial_grid_plan_approval_required', 'Approve Editorial Grid before approving the combined editorial content plan.', 409);
    }
    const resources = await resolveLookbookCandidateResources({ candidate, project, shopifyService: this.shopifyService, store: this.store });
    const at = this.now();
    const records = buildLookbookApprovedRecords({ candidate, project, userId, resources, at, root: this.root, existingPlanRevision, existingResourceSnapshot, planId: prepared.plan_id });
    const next = {
      ...prepared,
      status: 'approved',
      parent_revision_id: records.planRevision.parent_revision_id,
      approved_revision_id: records.planRevision.revision_id,
      approved_resource_snapshot_revision_id: records.resourceSnapshot.revision_id,
      lookbook: { ...candidate, status: 'approved', warnings: [], updated_at: at },
      updated_at: at
    };
    validateCandidate(editorialGridCandidate(next), this.root);
    validateLookbookCandidate(next.lookbook, this.root);
    if (next.craftsmanship) validateCraftsmanshipCandidate(next.craftsmanship, this.root);
    if (next.manufacturing_process) validateManufacturingProcessCandidate(next.manufacturing_process, this.root);
    const result = contentPlanResultForCandidate(current, next, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: result.stage, contentPlan: result.contentPlan, at, activityType: 'lookbook_plan_approved', activityPayload: { plan_id: records.planRevision.plan_id, revision_id: records.planRevision.revision_id, resource_snapshot_revision_id: records.resourceSnapshot.revision_id }, approvedRecords: records });
    return { session, approved_plan: { revision_id: records.planRevision.revision_id, resource_snapshot_revision_id: records.resourceSnapshot.revision_id } };
  }

  async saveCraftsmanshipPlan({ userId, projectId, expectedVersion, steps }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    const at = this.now();
    const preparedResult = preparedContentPlanForSession(current, at, this.contentPlanSourceRevision);
    assert(craftsmanshipPlanRequired(preparedResult.strategy), 'craftsmanship_plan_not_required', 'This approved storefront direction does not include Craftsmanship.', 409);
    assert(['content-plan', 'offer'].includes(current.stage), 'creative_director_stage_invalid', 'Review Store Resources before editing Craftsmanship evidence.', 409);
    const prepared = preparedResult.contentPlan;
    const candidate = prepared.craftsmanship;
    validateCraftsmanshipCandidate(candidate, this.root);
    const nextCandidate = saveCraftsmanshipCandidate({ current: candidate, expectedVersion, steps, root: this.root, at });
    const next = { ...prepared, craftsmanship: nextCandidate };
    const result = contentPlanResultForCandidate(current, next, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: 'content-plan', contentPlan: result.contentPlan, at, activityType: 'craftsmanship_candidate_saved', activityPayload: { step_count: nextCandidate.steps.length, candidate_version: nextCandidate.candidate_version } });
    return { session };
  }

  async regenerateCraftsmanshipPlan({ userId, projectId, expectedVersion }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    const at = this.now();
    const preparedResult = preparedContentPlanForSession(current, at, this.contentPlanSourceRevision);
    assert(craftsmanshipPlanRequired(preparedResult.strategy), 'craftsmanship_plan_not_required', 'This approved storefront direction does not include Craftsmanship.', 409);
    const prepared = preparedResult.contentPlan;
    const candidate = prepared.craftsmanship;
    assert(Number.isInteger(expectedVersion) && expectedVersion === candidate.candidate_version, 'craftsmanship_candidate_stale', 'This Craftsmanship plan changed after review. Reload it before refreshing.', 409);
    const nextCandidate = { ...candidate, status: 'draft', candidate_version: candidate.candidate_version + 1, warnings: candidate.steps.length ? candidate.warnings : ['no_merchant_confirmed_evidence'], updated_at: at };
    validateCraftsmanshipCandidate(nextCandidate, this.root);
    const result = contentPlanResultForCandidate(current, { ...prepared, craftsmanship: nextCandidate }, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: 'content-plan', contentPlan: result.contentPlan, at, activityType: 'craftsmanship_candidate_regenerated', activityPayload: { step_count: nextCandidate.steps.length, candidate_version: nextCandidate.candidate_version } });
    return { session };
  }

  async approveCraftsmanshipPlan({ userId, projectId, expectedVersion }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    assert(current.stage === 'content-plan', 'creative_director_stage_invalid', 'Review Craftsmanship evidence before approving it.', 409);
    const preparedResult = preparedContentPlanForSession(current, this.now(), this.contentPlanSourceRevision);
    assert(craftsmanshipPlanRequired(preparedResult.strategy), 'craftsmanship_plan_not_required', 'This approved storefront direction does not include Craftsmanship.', 409);
    assert(current.generation_context?.status === 'ready_for_generation', 'craftsmanship_resources_required', 'Approve the required Store Resources before approving Craftsmanship evidence.', 409);
    const prepared = preparedResult.contentPlan;
    const candidate = prepared.craftsmanship;
    validateCraftsmanshipCandidate(candidate, this.root);
    assert(Number.isInteger(expectedVersion) && expectedVersion === candidate.candidate_version, 'craftsmanship_candidate_stale', 'This Craftsmanship plan changed after review. Reload it before approving.', 409);
    assert(candidate.steps.length > 0, 'craftsmanship_step_required', 'Add at least one merchant-confirmed Craftsmanship step before approving this plan.', 422);
    assert(!candidate.warnings.length, 'craftsmanship_candidate_incomplete', 'Resolve the Craftsmanship evidence warnings before approving this plan.', 422, { warnings: candidate.warnings });
    let existingPlanRevision = null;
    let existingResourceSnapshot = null;
    if (prepared.approved_revision_id) {
      existingPlanRevision = await this.store.findApprovedBlockPlanRevision(prepared.approved_revision_id, project.id, project.organization_id);
      existingResourceSnapshot = await this.store.findApprovedBlockPlanResourceSnapshot(prepared.approved_resource_snapshot_revision_id, project.id, project.organization_id);
      assert(existingPlanRevision && existingResourceSnapshot, 'craftsmanship_parent_revision_missing', 'The previously approved content plan is unavailable. Reapprove the content plan before continuing.', 409);
    }
    const resources = await resolveCraftsmanshipCandidateResources({ candidate, project, store: this.store });
    const at = this.now();
    const records = buildCraftsmanshipApprovedRecords({ candidate, project, userId, resources, at, root: this.root, existingPlanRevision, existingResourceSnapshot, planId: prepared.plan_id });
    const next = {
      ...prepared,
      status: 'approved',
      parent_revision_id: records.planRevision.parent_revision_id,
      approved_revision_id: records.planRevision.revision_id,
      approved_resource_snapshot_revision_id: records.resourceSnapshot.revision_id,
      craftsmanship: { ...candidate, status: 'approved', warnings: [], updated_at: at },
      updated_at: at
    };
    validateCandidate(editorialGridCandidate(next), this.root);
    if (next.lookbook) validateLookbookCandidate(next.lookbook, this.root);
    validateCraftsmanshipCandidate(next.craftsmanship, this.root);
    if (next.manufacturing_process) validateManufacturingProcessCandidate(next.manufacturing_process, this.root);
    const result = contentPlanResultForCandidate(current, next, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: result.stage, contentPlan: result.contentPlan, at, activityType: 'craftsmanship_plan_approved', activityPayload: { plan_id: records.planRevision.plan_id, revision_id: records.planRevision.revision_id, resource_snapshot_revision_id: records.resourceSnapshot.revision_id }, approvedRecords: records });
    return { session, approved_plan: { revision_id: records.planRevision.revision_id, resource_snapshot_revision_id: records.resourceSnapshot.revision_id } };
  }

  async saveManufacturingProcessPlan({ userId, projectId, expectedVersion, steps }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    const at = this.now();
    const preparedResult = preparedContentPlanForSession(current, at, this.contentPlanSourceRevision);
    assert(manufacturingProcessPlanRequired(preparedResult.strategy), 'manufacturing_process_plan_not_required', 'This approved storefront direction does not include Manufacturing Process.', 409);
    assert(['content-plan', 'offer'].includes(current.stage), 'creative_director_stage_invalid', 'Review Store Resources before editing Manufacturing Process stages.', 409);
    const prepared = preparedResult.contentPlan;
    const candidate = prepared.manufacturing_process;
    validateManufacturingProcessCandidate(candidate, this.root);
    const nextCandidate = saveManufacturingProcessCandidate({ current: candidate, expectedVersion, steps, root: this.root, at });
    const next = { ...prepared, manufacturing_process: nextCandidate };
    const result = contentPlanResultForCandidate(current, next, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: 'content-plan', contentPlan: result.contentPlan, at, activityType: 'manufacturing_process_candidate_saved', activityPayload: { step_count: nextCandidate.steps.length, candidate_version: nextCandidate.candidate_version } });
    return { session };
  }

  async regenerateManufacturingProcessPlan({ userId, projectId, expectedVersion }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    const at = this.now();
    const preparedResult = preparedContentPlanForSession(current, at, this.contentPlanSourceRevision);
    assert(manufacturingProcessPlanRequired(preparedResult.strategy), 'manufacturing_process_plan_not_required', 'This approved storefront direction does not include Manufacturing Process.', 409);
    const prepared = preparedResult.contentPlan;
    const candidate = prepared.manufacturing_process;
    assert(Number.isInteger(expectedVersion) && expectedVersion === candidate.candidate_version, 'manufacturing_process_candidate_stale', 'This Manufacturing Process plan changed after review. Reload it before refreshing.', 409);
    const nextCandidate = { ...candidate, status: 'draft', candidate_version: candidate.candidate_version + 1, warnings: candidate.steps.length ? candidate.warnings : ['no_merchant_confirmed_process_stages'], updated_at: at };
    validateManufacturingProcessCandidate(nextCandidate, this.root);
    const result = contentPlanResultForCandidate(current, { ...prepared, manufacturing_process: nextCandidate }, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: 'content-plan', contentPlan: result.contentPlan, at, activityType: 'manufacturing_process_candidate_regenerated', activityPayload: { step_count: nextCandidate.steps.length, candidate_version: nextCandidate.candidate_version } });
    return { session };
  }

  async approveManufacturingProcessPlan({ userId, projectId, expectedVersion }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    assert(current.stage === 'content-plan', 'creative_director_stage_invalid', 'Review Manufacturing Process stages before approving them.', 409);
    const preparedResult = preparedContentPlanForSession(current, this.now(), this.contentPlanSourceRevision);
    assert(manufacturingProcessPlanRequired(preparedResult.strategy), 'manufacturing_process_plan_not_required', 'This approved storefront direction does not include Manufacturing Process.', 409);
    assert(current.generation_context?.status === 'ready_for_generation', 'manufacturing_process_resources_required', 'Approve the required Store Resources before approving Manufacturing Process stages.', 409);
    const prepared = preparedResult.contentPlan;
    const candidate = prepared.manufacturing_process;
    validateManufacturingProcessCandidate(candidate, this.root);
    assert(Number.isInteger(expectedVersion) && expectedVersion === candidate.candidate_version, 'manufacturing_process_candidate_stale', 'This Manufacturing Process plan changed after review. Reload it before approving.', 409);
    assert(candidate.steps.length >= 2, 'manufacturing_process_stage_minimum', 'Add at least two merchant-confirmed ordered stages before approving Manufacturing Process.', 422);
    assert(!candidate.warnings.length, 'manufacturing_process_candidate_incomplete', 'Resolve the Manufacturing Process stage warnings before approving this plan.', 422, { warnings: candidate.warnings });
    let existingPlanRevision = null;
    let existingResourceSnapshot = null;
    if (prepared.approved_revision_id) {
      existingPlanRevision = await this.store.findApprovedBlockPlanRevision(prepared.approved_revision_id, project.id, project.organization_id);
      existingResourceSnapshot = await this.store.findApprovedBlockPlanResourceSnapshot(prepared.approved_resource_snapshot_revision_id, project.id, project.organization_id);
      assert(existingPlanRevision && existingResourceSnapshot, 'manufacturing_process_parent_revision_missing', 'The previously approved content plan is unavailable. Reapprove the content plan before continuing.', 409);
    }
    const resources = await resolveManufacturingProcessCandidateResources({ candidate, project, store: this.store });
    const at = this.now();
    const records = buildManufacturingProcessApprovedRecords({ candidate, project, userId, resources, at, root: this.root, existingPlanRevision, existingResourceSnapshot, planId: prepared.plan_id });
    const next = {
      ...prepared,
      status: 'approved',
      parent_revision_id: records.planRevision.parent_revision_id,
      approved_revision_id: records.planRevision.revision_id,
      approved_resource_snapshot_revision_id: records.resourceSnapshot.revision_id,
      manufacturing_process: { ...candidate, status: 'approved', warnings: [], updated_at: at },
      updated_at: at
    };
    validateCandidate(editorialGridCandidate(next), this.root);
    if (next.lookbook) validateLookbookCandidate(next.lookbook, this.root);
    if (next.craftsmanship) validateCraftsmanshipCandidate(next.craftsmanship, this.root);
    validateManufacturingProcessCandidate(next.manufacturing_process, this.root);
    const result = contentPlanResultForCandidate(current, next, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: result.stage, contentPlan: result.contentPlan, at, activityType: 'manufacturing_process_plan_approved', activityPayload: { plan_id: records.planRevision.plan_id, revision_id: records.planRevision.revision_id, resource_snapshot_revision_id: records.resourceSnapshot.revision_id }, approvedRecords: records });
    return { session, approved_plan: { revision_id: records.planRevision.revision_id, resource_snapshot_revision_id: records.resourceSnapshot.revision_id } };
  }

  evidenceAdapter(key) {
    const adapter = ADDITIONAL_EVIDENCE_PLANS.find((item) => item.config.key === key);
    assert(adapter, 'content_plan_adapter_unknown', 'This content plan adapter is not available.', 500);
    return adapter;
  }

  async saveEvidencePlan({ userId, projectId, expectedVersion, items, adapterKey }) {
    const adapter = this.evidenceAdapter(adapterKey);
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    const at = this.now(); const preparedResult = preparedContentPlanForSession(current, at, this.contentPlanSourceRevision);
    assert(adapter.planRequired(preparedResult.strategy), `${adapter.config.key}_plan_not_required`, `This approved storefront direction does not include ${adapter.config.singular}.`, 409);
    assert(['content-plan', 'offer'].includes(current.stage), 'creative_director_stage_invalid', `Review Store Resources before editing ${adapter.config.singular}.`, 409);
    const prepared = preparedResult.contentPlan; const candidate = prepared[adapter.config.key];
    adapter.validateCandidate(candidate, this.root);
    const nextCandidate = adapter.saveCandidate({ current: candidate, expectedVersion, items, root: this.root, at });
    const result = contentPlanResultForCandidate(current, { ...prepared, [adapter.config.key]: nextCandidate }, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: 'content-plan', contentPlan: result.contentPlan, at, activityType: `${adapter.config.key}_candidate_saved`, activityPayload: { item_count: nextCandidate[adapter.config.itemKey].length, candidate_version: nextCandidate.candidate_version } });
    return { session };
  }

  async regenerateEvidencePlan({ userId, projectId, expectedVersion, adapterKey }) {
    const adapter = this.evidenceAdapter(adapterKey);
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    const at = this.now(); const preparedResult = preparedContentPlanForSession(current, at, this.contentPlanSourceRevision);
    assert(adapter.planRequired(preparedResult.strategy), `${adapter.config.key}_plan_not_required`, `This approved storefront direction does not include ${adapter.config.singular}.`, 409);
    const prepared = preparedResult.contentPlan; const candidate = prepared[adapter.config.key];
    assert(Number.isInteger(expectedVersion) && expectedVersion === candidate.candidate_version, `${adapter.config.key}_candidate_stale`, `This ${adapter.config.singular} plan changed after review. Reload it before refreshing.`, 409);
    const count = candidate[adapter.config.itemKey].length;
    const nextCandidate = { ...candidate, status: 'draft', candidate_version: candidate.candidate_version + 1, warnings: count ? candidate.warnings : ['no_merchant_approved_evidence'], updated_at: at };
    adapter.validateCandidate(nextCandidate, this.root);
    const result = contentPlanResultForCandidate(current, { ...prepared, [adapter.config.key]: nextCandidate }, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: 'content-plan', contentPlan: result.contentPlan, at, activityType: `${adapter.config.key}_candidate_regenerated`, activityPayload: { item_count: count, candidate_version: nextCandidate.candidate_version } });
    return { session };
  }

  async approveEvidencePlan({ userId, projectId, expectedVersion, adapterKey }) {
    const adapter = this.evidenceAdapter(adapterKey);
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    assert(current.stage === 'content-plan', 'creative_director_stage_invalid', `Review ${adapter.config.singular} content before approving it.`, 409);
    const preparedResult = preparedContentPlanForSession(current, this.now(), this.contentPlanSourceRevision);
    assert(adapter.planRequired(preparedResult.strategy), `${adapter.config.key}_plan_not_required`, `This approved storefront direction does not include ${adapter.config.singular}.`, 409);
    assert(current.generation_context?.status === 'ready_for_generation', `${adapter.config.key}_resources_required`, 'Approve the required Store Resources before approving this content.', 409);
    const prepared = preparedResult.contentPlan; const candidate = prepared[adapter.config.key];
    adapter.validateCandidate(candidate, this.root);
    assert(Number.isInteger(expectedVersion) && expectedVersion === candidate.candidate_version, `${adapter.config.key}_candidate_stale`, `This ${adapter.config.singular} plan changed after review. Reload it before approving.`, 409);
    assert(candidate[adapter.config.itemKey].length >= adapter.config.minimumItems, `${adapter.config.key}_item_required`, `Add the required merchant-approved ${adapter.config.plural} before approval.`, 422);
    assert(!candidate.warnings.length, `${adapter.config.key}_candidate_incomplete`, `Resolve the ${adapter.config.singular} evidence warnings before approval.`, 422, { warnings: candidate.warnings });
    let existingPlanRevision = null; let existingResourceSnapshot = null;
    if (prepared.approved_revision_id) {
      existingPlanRevision = await this.store.findApprovedBlockPlanRevision(prepared.approved_revision_id, project.id, project.organization_id);
      existingResourceSnapshot = await this.store.findApprovedBlockPlanResourceSnapshot(prepared.approved_resource_snapshot_revision_id, project.id, project.organization_id);
      assert(existingPlanRevision && existingResourceSnapshot, `${adapter.config.key}_parent_revision_missing`, 'The previously approved content plan is unavailable. Reapprove the content plan before continuing.', 409);
    }
    const resources = await adapter.resolveCandidateResources({ candidate, project, store: this.store }); const at = this.now();
    const records = adapter.buildApprovedRecords({ candidate, project, userId, resources, at, root: this.root, existingPlanRevision, existingResourceSnapshot, planId: prepared.plan_id });
    const next = { ...prepared, status: 'approved', parent_revision_id: records.planRevision.parent_revision_id, approved_revision_id: records.planRevision.revision_id, approved_resource_snapshot_revision_id: records.resourceSnapshot.revision_id, [adapter.config.key]: { ...candidate, status: 'approved', warnings: [], updated_at: at }, updated_at: at };
    validateCandidate(editorialGridCandidate(next), this.root);
    if (next.lookbook) validateLookbookCandidate(next.lookbook, this.root);
    if (next.craftsmanship) validateCraftsmanshipCandidate(next.craftsmanship, this.root);
    if (next.manufacturing_process) validateManufacturingProcessCandidate(next.manufacturing_process, this.root);
    validateAdditionalEvidenceCandidates(next, this.root);
    const result = contentPlanResultForCandidate(current, next, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: result.stage, contentPlan: result.contentPlan, at, activityType: `${adapter.config.key}_plan_approved`, activityPayload: { plan_id: records.planRevision.plan_id, revision_id: records.planRevision.revision_id, resource_snapshot_revision_id: records.resourceSnapshot.revision_id }, approvedRecords: records });
    return { session, approved_plan: { revision_id: records.planRevision.revision_id, resource_snapshot_revision_id: records.resourceSnapshot.revision_id } };
  }

  async saveBrandTimelinePlan(args) { return this.saveEvidencePlan({ ...args, adapterKey: 'brand_timeline', items: args.milestones }); }
  async regenerateBrandTimelinePlan(args) { return this.regenerateEvidencePlan({ ...args, adapterKey: 'brand_timeline' }); }
  async approveBrandTimelinePlan(args) { return this.approveEvidencePlan({ ...args, adapterKey: 'brand_timeline' }); }
  async saveSustainabilityPlan(args) { return this.saveEvidencePlan({ ...args, adapterKey: 'sustainability', items: args.initiatives }); }
  async regenerateSustainabilityPlan(args) { return this.regenerateEvidencePlan({ ...args, adapterKey: 'sustainability' }); }
  async approveSustainabilityPlan(args) { return this.approveEvidencePlan({ ...args, adapterKey: 'sustainability' }); }
  async saveTeamPlan(args) { return this.saveEvidencePlan({ ...args, adapterKey: 'team', items: args.members }); }
  async regenerateTeamPlan(args) { return this.regenerateEvidencePlan({ ...args, adapterKey: 'team' }); }
  async approveTeamPlan(args) { return this.approveEvidencePlan({ ...args, adapterKey: 'team' }); }
  async saveAwardsCertificationsPlan(args) { return this.saveEvidencePlan({ ...args, adapterKey: 'awards_certifications', items: args.recognitions }); }
  async regenerateAwardsCertificationsPlan(args) { return this.regenerateEvidencePlan({ ...args, adapterKey: 'awards_certifications' }); }
  async approveAwardsCertificationsPlan(args) { return this.approveEvidencePlan({ ...args, adapterKey: 'awards_certifications' }); }

  commerceAdapter(key) {
    const adapter = COMMERCE_PLANS.find((item) => item.config.key === key);
    assert(adapter, 'commerce_plan_adapter_unknown', 'This commerce content-plan adapter is not available.', 500);
    return adapter;
  }

  async saveCommercePlan({ userId, projectId, expectedVersion, products, scene = {}, adapterKey }) {
    const adapter = this.commerceAdapter(adapterKey);
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId); const at = this.now(); const preparedResult = preparedContentPlanForSession(current, at, this.contentPlanSourceRevision); const strategy = preparedResult.strategy;
    assert(adapter.planRequired(strategy), `${adapter.config.key}_plan_not_required`, `This approved storefront direction does not include ${adapter.config.singular}.`, 409);
    assert(['content-plan', 'offer'].includes(current.stage), 'creative_director_stage_invalid', `Review Store Resources before editing ${adapter.config.singular}.`, 409);
    const prepared = preparedResult.contentPlan; const candidate = prepared[adapter.config.key];
    adapter.validateCandidate(candidate, this.root);
    const nextCandidate = adapter.saveCandidate({ current: candidate, expectedVersion, products, scene, root: this.root, at });
    const result = contentPlanResultForCandidate(current, { ...prepared, [adapter.config.key]: nextCandidate }, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: 'content-plan', contentPlan: result.contentPlan, at, activityType: `${adapter.config.key}_candidate_saved`, activityPayload: { product_count: nextCandidate[adapter.config.itemKey].length, candidate_version: nextCandidate.candidate_version } });
    return { session };
  }

  async regenerateCommercePlan({ userId, projectId, expectedVersion, adapterKey }) {
    const adapter = this.commerceAdapter(adapterKey);
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId); const at = this.now(); const preparedResult = preparedContentPlanForSession(current, at, this.contentPlanSourceRevision); const strategy = preparedResult.strategy;
    assert(adapter.planRequired(strategy), `${adapter.config.key}_plan_not_required`, `This approved storefront direction does not include ${adapter.config.singular}.`, 409);
    const prepared = preparedResult.contentPlan; const candidate = prepared[adapter.config.key];
    assert(Number.isInteger(expectedVersion) && expectedVersion === candidate.candidate_version, `${adapter.config.key}_candidate_stale`, `This ${adapter.config.singular} plan changed after review. Reload it before refreshing.`, 409);
    const nextCandidate = { ...candidate, status: 'draft', candidate_version: candidate.candidate_version + 1, warnings: adapter.candidateWarnings(candidate), updated_at: at };
    adapter.validateCandidate(nextCandidate, this.root);
    const result = contentPlanResultForCandidate(current, { ...prepared, [adapter.config.key]: nextCandidate }, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: 'content-plan', contentPlan: result.contentPlan, at, activityType: `${adapter.config.key}_candidate_regenerated`, activityPayload: { product_count: nextCandidate[adapter.config.itemKey].length, candidate_version: nextCandidate.candidate_version } });
    return { session };
  }

  async approveCommercePlan({ userId, projectId, expectedVersion, adapterKey }) {
    const adapter = this.commerceAdapter(adapterKey);
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId); const preparedResult = preparedContentPlanForSession(current, this.now(), this.contentPlanSourceRevision); const strategy = preparedResult.strategy;
    assert(current.stage === 'content-plan', 'creative_director_stage_invalid', `Review ${adapter.config.singular} before approving it.`, 409);
    assert(adapter.planRequired(strategy), `${adapter.config.key}_plan_not_required`, `This approved storefront direction does not include ${adapter.config.singular}.`, 409);
    assert(current.generation_context?.status === 'ready_for_generation', `${adapter.config.key}_resources_required`, 'Approve Store Resources before approving commerce relationships.', 409);
    const prepared = preparedResult.contentPlan; const candidate = prepared[adapter.config.key];
    adapter.validateCandidate(candidate, this.root);
    assert(Number.isInteger(expectedVersion) && expectedVersion === candidate.candidate_version, `${adapter.config.key}_candidate_stale`, `This ${adapter.config.singular} plan changed after review. Reload it before approving.`, 409);
    assert(candidate[adapter.config.itemKey].length >= adapter.config.minimumItems, `${adapter.config.key}_minimum_products`, `Add at least ${adapter.config.minimumItems} approved products before approval.`, 422);
    assert(!candidate.warnings.length, `${adapter.config.key}_candidate_incomplete`, `Resolve the ${adapter.config.singular} warnings before approval.`, 422, { warnings: candidate.warnings });
    let existingPlanRevision = null; let existingResourceSnapshot = null;
    if (prepared.approved_revision_id) {
      existingPlanRevision = await this.store.findApprovedBlockPlanRevision(prepared.approved_revision_id, project.id, project.organization_id);
      existingResourceSnapshot = await this.store.findApprovedBlockPlanResourceSnapshot(prepared.approved_resource_snapshot_revision_id, project.id, project.organization_id);
      assert(existingPlanRevision && existingResourceSnapshot, `${adapter.config.key}_parent_revision_missing`, 'The prior approved content revision is unavailable.', 409);
    }
    const resources = await adapter.resolveCandidateResources({ candidate, project, shopifyService: this.shopifyService, store: this.store }); const at = this.now();
    const records = adapter.buildApprovedRecords({ candidate, project, userId, resources, at, root: this.root, existingPlanRevision, existingResourceSnapshot, planId: prepared.plan_id });
    const next = { ...prepared, status: 'approved', parent_revision_id: records.planRevision.parent_revision_id, approved_revision_id: records.planRevision.revision_id, approved_resource_snapshot_revision_id: records.resourceSnapshot.revision_id, [adapter.config.key]: { ...candidate, status: 'approved', warnings: [], updated_at: at }, updated_at: at };
    validateCandidate(editorialGridCandidate(next), this.root);
    if (next.lookbook) validateLookbookCandidate(next.lookbook, this.root);
    if (next.craftsmanship) validateCraftsmanshipCandidate(next.craftsmanship, this.root);
    if (next.manufacturing_process) validateManufacturingProcessCandidate(next.manufacturing_process, this.root);
    validateAdditionalEvidenceCandidates(next, this.root); validateCommerceCandidates(next, this.root);
    const result = contentPlanResultForCandidate(current, next, at, this.contentPlanSourceRevision);
    const session = await this.persistContentPlanChange({ project, userId, current, stage: result.stage, contentPlan: result.contentPlan, at, activityType: `${adapter.config.key}_plan_approved`, activityPayload: { plan_id: records.planRevision.plan_id, revision_id: records.planRevision.revision_id, resource_snapshot_revision_id: records.resourceSnapshot.revision_id }, approvedRecords: records });
    return { session, approved_plan: { revision_id: records.planRevision.revision_id, resource_snapshot_revision_id: records.resourceSnapshot.revision_id } };
  }

  async saveCrossSellProductsPlan(args) { return this.saveCommercePlan({ ...args, adapterKey:'cross_sell_products' }); }
  async regenerateCrossSellProductsPlan(args) { return this.regenerateCommercePlan({ ...args, adapterKey:'cross_sell_products' }); }
  async approveCrossSellProductsPlan(args) { return this.approveCommercePlan({ ...args, adapterKey:'cross_sell_products' }); }
  async saveProductBundleShowcasePlan(args) { return this.saveCommercePlan({ ...args, adapterKey:'product_bundle_showcase' }); }
  async regenerateProductBundleShowcasePlan(args) { return this.regenerateCommercePlan({ ...args, adapterKey:'product_bundle_showcase' }); }
  async approveProductBundleShowcasePlan(args) { return this.approveCommercePlan({ ...args, adapterKey:'product_bundle_showcase' }); }
  async saveShopTheLookPlan(args) { return this.saveCommercePlan({ ...args, adapterKey:'shop_the_look' }); }
  async regenerateShopTheLookPlan(args) { return this.regenerateCommercePlan({ ...args, adapterKey:'shop_the_look' }); }
  async approveShopTheLookPlan(args) { return this.approveCommercePlan({ ...args, adapterKey:'shop_the_look' }); }
  async saveComplementaryProductsFallbackPlan(args) { return this.saveCommercePlan({ ...args, adapterKey:'complementary_products_fallback' }); }
  async regenerateComplementaryProductsFallbackPlan(args) { return this.regenerateCommercePlan({ ...args, adapterKey:'complementary_products_fallback' }); }
  async approveComplementaryProductsFallbackPlan(args) { return this.approveCommercePlan({ ...args, adapterKey:'complementary_products_fallback' }); }

  async generate({ userId, projectId }) {
    await this.authorize({ userId, projectId, permission: 'interview:edit' });
    throw new DashboardError('custom_theme_purchase_required', 'Review the custom storefront offer and complete payment before Calinium prepares your storefront.', 409);
  }

  async setStage({ userId, projectId, stage }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.requireSession(projectId);
    assert(STAGES.includes(stage), 'creative_director_stage_invalid', 'Choose a valid Creative Director stage.', 422);
    if (current.stage === 'content-plan' && stage === 'offer') {
      const shop = await this.contentPlanShop(project);
      const eligibility = contentPlanFlowEligibility(current.content_plan, {
        resourcePlan: current.resource_plan,
        generationContext: current.generation_context,
        presetRevisionId: current.preset_selection?.approved_revision_id || null,
        sourceRevision: this.contentPlanSourceRevision,
        scope: { project_id: current.project_id, shop }
      });
      assert(eligibility.eligible, 'content_plan_stage_unresolved', 'Review the remaining storefront content decisions before continuing.', 409);
      const at = this.now();
      const session = await this.persistContentPlanChange({ project, userId, current, stage: 'offer', contentPlan: current.content_plan, at, activityType: 'content_plan_zero_action_advanced', activityPayload: { actor: 'system_policy', stage_resolution_reference: eligibility.stage_resolution_reference } });
      return { session };
    }
    assert(
      (REVISITABLE_STAGES[current.stage] || []).includes(stage),
      'creative_director_transition_invalid',
      'Calinium can return to an earlier review stage, but it cannot skip an approval step.',
      409
    );
    const session = await this.store.updateCreativeDirector(projectId, { ...current, stage, updated_at: this.now() });
    await this.activity(project, userId, 'creative_director_stage_viewed', { stage });
    return { session };
  }

  async requireSession(projectId) {
    const session = await this.store.findCreativeDirectorForProject(projectId);
    if (!session) throw new DashboardError('creative_director_missing', 'Start designing before continuing.', 409);
    return session;
  }

  async activity(project, userId, type, payload) {
    await this.store.createActivity({ id: createId('act'), organization_id: project.organization_id, project_id: project.id, actor_user_id: userId, type, payload, created_at: this.now() });
  }
}

module.exports = { CreativeDirectorService, STAGES, REVISITABLE_STAGES, defaultGenerationContext, defaultGenerationState, defaultPreviewState, defaultResourcePlan, draftFields, draftConfirmations, resourceGroups, normalizeGenerationContextForResourcePlan, resourcePlanSelectionBlockers, resourceRequirementDetails, contentPlanRequired, contentPlanApproved };
