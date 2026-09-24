'use strict';

const crypto = require('crypto');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { isoNow } = require('../lib/serialization.cjs');
const { compileStorefrontStrategy } = require('../../../../ai/compiler/compile-strategy');
const { mapMerchantProfile } = require('../../../../pipeline/map-merchant-profile');
const { contentInventoryFromApprovedInputs } = require('./preset-service.cjs');
const { recommendStorefront, ENGINE_VERSION: RECOMMENDATION_VERSION } = require('../../../../ai/recommendation-engine/recommend-storefront');
const { createDesignDna, normalizeRefinement, mergeOverrides, DIMENSIONS, ENGINE_VERSION: DNA_VERSION } = require('../../../../ai/design-dna/design-dna-engine');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }

function assertRecommendationCandidate(revision) {
  assert(revision && revision.engine_version === RECOMMENDATION_VERSION && revision.recommendation_checksum === digest(revision.recommendation), 'creative_direction_revision_invalid', 'The saved creative direction could not be verified.', 409);
  return revision;
}
function assertDnaCandidate(revision) {
  const dimensions = Object.keys(revision?.dna?.dimensions || {});
  assert(revision && revision.engine_version === DNA_VERSION && revision.dna_checksum === digest(revision.dna) && dimensions.length === 26, 'design_dna_revision_invalid', 'The saved Design DNA could not be verified.', 409);
  return revision;
}
function assertRecommendationApproval(revision) {
  assert(revision && revision.approval_checksum === digest({ candidate_revision_id: revision.candidate_revision_id, preset_revision_id: revision.preset_revision_id, recommendation_checksum: digest(revision.approved) }), 'creative_direction_approval_invalid', 'The approved creative direction could not be verified.', 409);
  return revision;
}
function assertDnaApproval(revision) {
  assert(revision && revision.approval_checksum === digest({ candidate_revision_id: revision.candidate_revision_id, recommendation_approval_revision_id: revision.recommendation_approval_revision_id, dna_checksum: digest(revision.approved) }), 'design_dna_approval_invalid', 'The approved Design DNA could not be verified.', 409);
  return revision;
}

const RESOURCE_REQUIREMENTS = Object.freeze({
  hero_media: ['hero_media'], premium_hero_media: ['hero_media'], hero_or_brand_media: ['hero_media', 'logo'], collection_imagery: ['hero_media', 'homepage_supporting_media'],
  campaign_media: ['hero_media', 'homepage_supporting_media'], product_interface_media: ['hero_media', 'homepage_supporting_media'],
  collection_resource: ['featured_collection'], product_collection: ['featured_collection'], primary_cta_destination: ['hero_destination'],
  editorial_destinations: ['hero_destination', 'featured_collection']
});

function publicPresetName(id) { return String(id || '').replace(/(^|[-_])([a-z])/g, (_match, _separator, letter) => letter.toUpperCase()); }
function activeDnaOverrides(value = {}) {
  return Object.fromEntries(DIMENSIONS.filter((dimension) => Object.prototype.hasOwnProperty.call(value, dimension)).map((dimension) => [dimension, value[dimension]]));
}
function undoCheckpoint(value = {}) {
  const checkpoint = value?.__last_refinement;
  if (!checkpoint || typeof checkpoint !== 'object') return null;
  return {
    explicit_preset_id: checkpoint.explicit_preset_id || null,
    dna_overrides: activeDnaOverrides(checkpoint.dna_overrides),
    target_recommendation_revision_id: checkpoint.target_recommendation_revision_id || null,
    target_dna_revision_id: checkpoint.target_dna_revision_id || null
  };
}

class RecommendationDesignService {
  constructor({ root, store, projectService, recommendedResourceSetService = null, clock = () => new Date() }) {
    this.root = root;
    this.store = store;
    this.projectService = projectService;
    this.recommendedResourceSetService = recommendedResourceSetService;
    this.clock = clock;
  }
  now() { return isoNow(this.clock); }
  async authorize({ userId, projectId, permission = 'project:view' }) {
    const project = await this.store.findProjectById(projectId);
    if (!project) throw new DashboardError('project_not_found', 'Project not found.', 404);
    await this.projectService.requireMembership(project.organization_id, userId, permission);
    return project;
  }
  waiting(status = 'waiting') {
    return { version: 1, status, label: 'Creative direction is not ready yet', revision_id: null, approved_revision_id: null, approvable: false, primary: null, alternatives: [], design_dna: null, preview_readiness: 'thinking' };
  }
  async context({ userId, projectId, permission = 'project:view' }) {
    const project = await this.authorize({ userId, projectId, permission });
    const [assignment, session, intakeState, resourceState, state] = await Promise.all([
      this.store.findProjectShopifyConnection(project.id, project.organization_id),
      this.store.findCreativeDirectorForProject(project.id),
      this.store.findMerchantIntakeState(project.id),
      this.store.findRecommendedResourceSetState(project.id),
      this.store.findCreativeDirectionState(project.id)
    ]);
    const intakeRevision = intakeState?.current_revision_id ? await this.store.findMerchantIntakeRevision(intakeState.current_revision_id, project.id) : null;
    const resourceRevision = resourceState?.current_revision_id ? await this.store.findRecommendedResourceSetRevision(resourceState.current_revision_id, project.id, project.organization_id) : null;
    return { project, assignment, session, intakeState, intakeRevision, resourceState, resourceRevision, state };
  }
  contentInventory(session, resourceRevision) {
    const inventory = session?.preset_selection?.content_inventory
      ? { ...session.preset_selection.content_inventory, approved: [...(session.preset_selection.content_inventory.approved || [])] }
      : contentInventoryFromApprovedInputs(session?.creative_brief, session?.merchant_profile);
    const approved = new Set(inventory.approved || []);
    const selectedSlots = new Set((resourceRevision?.slots || []).filter((slot) => slot.selected).map((slot) => slot.slot_id));
    for (const [requirement, slots] of Object.entries(RESOURCE_REQUIREMENTS)) if (slots.some((slot) => selectedSlots.has(slot))) approved.add(requirement);
    const contentPlan = session?.content_plan || {};
    if (contentPlan.craftsmanship?.status === 'approved' || contentPlan.manufacturing_process?.status === 'approved') approved.add('craft_evidence');
    if (contentPlan.lookbook?.status === 'approved') approved.add('lookbook_frames');
    if (contentPlan.status === 'approved') approved.add('editorial_destinations');
    return { ...inventory, approved: [...approved].sort(), limited: approved.size <= 2 };
  }
  compileStrategy(session) {
    if (!session?.merchant_profile) return null;
    try {
      const mapping = mapMerchantProfile(session.merchant_profile, { root: this.root });
      return compileStorefrontStrategy(mapping.compiler_profile, { root: this.root });
    }
    catch { return null; }
  }
  recommendationEvidence(context, strategy, inventory) {
    return {
      engine_version: RECOMMENDATION_VERSION,
      strategy: {
        resolutions: strategy?.resolutions || {},
        decision_status: strategy?.validation_report?.valid === false ? 'invalid' : 'valid'
      },
      content_inventory: inventory,
      store_intelligence: context.intakeRevision ? {
        category: context.intakeRevision.store_intelligence?.category || null,
        catalog: context.intakeRevision.store_intelligence?.catalog || null,
        media: context.intakeRevision.store_intelligence?.media || null
      } : null,
      approved_preset_revision_id: context.session?.preset_selection?.approved_revision_id || null,
      approved_preset_id: context.session?.preset_selection?.selected_preset_id || null,
      explicit_preset_id: context.state?.explicit_preset_id || null
    };
  }
  async ensure({ userId, projectId }) {
    const context = await this.context({ userId, projectId });
    const { project, assignment, session } = context;
    if (!assignment?.connection || !session?.preset_selection || !context.intakeRevision) return this.waiting(!context.intakeRevision ? 'waiting_for_store_learning' : 'waiting_for_store_strategy');
    const strategy = this.compileStrategy(session);
    if (!strategy || strategy.validation_report?.valid === false) return this.waiting('waiting_for_valid_strategy');
    const inventory = this.contentInventory(session, context.resourceRevision);
    const evidence = this.recommendationEvidence(context, strategy, inventory);
    const recommendationFingerprint = digest(evidence);
    const recommendationRevisionId = `rcr_${digest(`${project.id}|${RECOMMENDATION_VERSION}|${recommendationFingerprint}`).slice(0, 40)}`;
    let recommendationRevision = await this.store.findStorefrontRecommendationRevision(recommendationRevisionId, project.id, project.organization_id);
    if (!recommendationRevision) {
      const recommendation = recommendStorefront({
        strategy,
        contentInventory: inventory,
        intelligence: context.intakeRevision.store_intelligence,
        explicitPresetId: context.state?.explicit_preset_id || null,
        approvedPresetId: session.preset_selection?.status === 'approved' ? session.preset_selection.selected_preset_id : null,
        root: this.root
      });
      recommendationRevision = await this.store.createStorefrontRecommendationRevision({
        revision_id: recommendationRevisionId, project_id: project.id, organization_id: project.organization_id, connection_id: assignment.connection.id,
        parent_revision_id: context.state?.current_recommendation_revision_id === recommendationRevisionId ? null : context.state?.current_recommendation_revision_id || null,
        engine_version: RECOMMENDATION_VERSION, evidence_fingerprint: recommendationFingerprint, recommendation_checksum: digest(recommendation),
        status: recommendation.status, recommendation,
        provenance: { source_authority: ['merchant_approved_intent', 'shopify_store_intelligence', 'approved_preset_history', 'recommended_resource_set_state', 'runtime_capabilities'], input_fingerprint: recommendationFingerprint },
        created_at: this.now()
      });
    }
    assertRecommendationCandidate(recommendationRevision);
    if (!recommendationRevision.recommendation.primary) {
      const nextState = await this.store.upsertCreativeDirectionState({
        project_id: project.id, connection_id: assignment.connection.id, status: 'review_required', current_recommendation_revision_id: recommendationRevision.revision_id,
        current_approved_recommendation_revision_id: context.state?.current_approved_recommendation_revision_id || null, current_dna_revision_id: null,
        current_approved_dna_revision_id: context.state?.current_approved_dna_revision_id || null, explicit_preset_id: context.state?.explicit_preset_id || null,
        dna_overrides: context.state?.dna_overrides || {}, created_at: context.state?.created_at || this.now(), updated_at: this.now()
      });
      return this.publicResult({ context: { ...context, state: nextState }, recommendationRevision, dnaRevision: null, approvedRecommendation: null, approvedDna: null });
    }
    const dnaOverrides = activeDnaOverrides(context.state?.dna_overrides);
    const dnaEvidence = {
      engine_version: DNA_VERSION,
      recommendation_revision_id: recommendationRevision.revision_id,
      preset_id: recommendationRevision.recommendation.primary.preset_id,
      overrides: dnaOverrides,
      media_capability: { video_available: Number(context.intakeRevision.store_intelligence?.media?.video_count || 0) > 0 }
    };
    const dnaFingerprint = digest(dnaEvidence);
    const dnaRevisionId = `dna_${digest(`${project.id}|${DNA_VERSION}|${dnaFingerprint}`).slice(0, 40)}`;
    let dnaRevision = await this.store.findDesignDnaRevision(dnaRevisionId, project.id, project.organization_id);
    if (!dnaRevision) {
      const dna = createDesignDna({ presetId: recommendationRevision.recommendation.primary.preset_id, recommendationRevisionId: recommendationRevision.revision_id, overrides: dnaOverrides, root: this.root });
      dnaRevision = await this.store.createDesignDnaRevision({
        revision_id: dnaRevisionId, project_id: project.id, organization_id: project.organization_id, connection_id: assignment.connection.id,
        parent_revision_id: context.state?.current_dna_revision_id === dnaRevisionId ? null : context.state?.current_dna_revision_id || null,
        recommendation_revision_id: recommendationRevision.revision_id, engine_version: DNA_VERSION, evidence_fingerprint: dnaFingerprint, dna_checksum: digest(dna), dna,
        provenance: { source_authority: ['preset_baseline', 'merchant_creative_preference', 'runtime_capabilities'], input_fingerprint: dnaFingerprint }, created_at: this.now()
      });
    }
    assertDnaCandidate(dnaRevision);
    let [approvedRecommendation, approvedDna] = await Promise.all([
      context.state?.current_approved_recommendation_revision_id ? this.store.findApprovedStorefrontRecommendationRevision(context.state.current_approved_recommendation_revision_id, project.id, project.organization_id) : null,
      context.state?.current_approved_dna_revision_id ? this.store.findApprovedDesignDnaRevision(context.state.current_approved_dna_revision_id, project.id, project.organization_id) : null
    ]);
    if (approvedRecommendation) approvedRecommendation = assertRecommendationApproval(approvedRecommendation);
    if (approvedDna) approvedDna = assertDnaApproval(approvedDna);
    const approvedCurrent = approvedRecommendation?.candidate_revision_id === recommendationRevision.revision_id && approvedDna?.candidate_revision_id === dnaRevision.revision_id;
    const stale = Boolean((approvedRecommendation || approvedDna) && !approvedCurrent);
    const status = stale ? 'stale' : approvedCurrent ? 'approved' : 'recommended';
    const nextState = await this.store.upsertCreativeDirectionState({
      project_id: project.id, connection_id: assignment.connection.id, status, current_recommendation_revision_id: recommendationRevision.revision_id,
      current_approved_recommendation_revision_id: approvedRecommendation?.revision_id || null, current_dna_revision_id: dnaRevision.revision_id,
      current_approved_dna_revision_id: approvedDna?.revision_id || null, explicit_preset_id: context.state?.explicit_preset_id || null,
      dna_overrides: context.state?.dna_overrides || {}, created_at: context.state?.created_at || this.now(), updated_at: this.now()
    });
    return this.publicResult({ context: { ...context, state: nextState }, recommendationRevision, dnaRevision, approvedRecommendation, approvedDna });
  }
  publicResult({ context, recommendationRevision, dnaRevision, approvedRecommendation, approvedDna }) {
    const recommendation = recommendationRevision.recommendation;
    const primary = recommendation.primary;
    const approvedCurrent = Boolean(primary && dnaRevision && approvedRecommendation?.candidate_revision_id === recommendationRevision.revision_id && approvedDna?.candidate_revision_id === dnaRevision.revision_id);
    const historicalPresetId = context.session?.preset_selection?.status === 'approved' ? context.session.preset_selection.selected_preset_id : null;
    const sameAsHistorical = primary?.preset_id === historicalPresetId;
    return {
      version: 1,
      status: context.state?.status || recommendation.status,
      label: approvedCurrent ? 'Creative direction approved' : primary ? 'Creative direction ready' : 'Creative direction needs review',
      revision_id: recommendationRevision.revision_id,
      approved_revision_id: approvedRecommendation?.revision_id || null,
      approvable: Boolean(primary && dnaRevision && sameAsHistorical && !approvedCurrent),
      approval_note: !sameAsHistorical && primary ? `Review and approve ${primary.preset_name} through the existing preset workflow before using this direction.` : null,
      primary: primary ? { name: primary.preset_name, preset_id: primary.preset_id, confidence: primary.confidence, reasons: primary.reasons, homepage_recipe: primary.homepage_recipe, selection_basis: primary.selection_basis } : null,
      alternatives: (recommendation.alternatives || []).map((item) => ({ name: item.preset_name, preset_id: item.preset_id, differences: item.differences })),
      design_dna: dnaRevision ? {
        revision_id: dnaRevision.revision_id,
        approved_revision_id: approvedDna?.revision_id || null,
        summary: cloneSafe(dnaRevision.dna.summary),
        dimensions: Object.fromEntries(Object.entries(dnaRevision.dna.dimensions).map(([id, item]) => [id, { value: item.value, confidence: item.confidence, boundary: item.boundary.mode, fallback_applied: item.fallback_applied }])),
        executable: true
      } : null,
      historical_direction: historicalPresetId ? { name: publicPresetName(historicalPresetId), preset_id: historicalPresetId, approval_preserved: true, same_as_current: sameAsHistorical } : null,
      preview_readiness: !primary || !dnaRevision ? 'thinking' : approvedCurrent ? 'approved' : 'provisional'
    };
  }
  async refine({ userId, projectId, message }) {
    const current = await this.ensure({ userId, projectId });
    assert(current.revision_id && current.design_dna?.revision_id, 'creative_direction_unavailable', 'Calinium needs a current creative direction before refining it.', 409);
    const intent = normalizeRefinement(message);
    assert(intent, 'creative_refinement_unsupported', 'Try a bounded design change such as less motion, stronger typography, more products, or a named compatible direction.', 422);
    if (intent.kind === 'explanation') return { changed: false, kind: 'explanation', message: current.primary?.reasons?.[0] || 'This direction is based on your approved strategy and current executable store resources.', creative_direction: current };
    if (intent.kind === 'forbidden') throw new DashboardError('creative_refinement_outside_boundaries', intent.reason, 422, { dimension: intent.label });
    const context = await this.context({ userId, projectId, permission: 'interview:edit' });
    if (intent.kind === 'delegation') return { changed: false, kind: 'delegation', message: 'I will keep the strongest current eligible direction. This does not approve resources, claims, payment, or generation.', creative_direction: current };
    if (intent.kind === 'undo') {
      const checkpoint = undoCheckpoint(context.state?.dna_overrides);
      assert(checkpoint && checkpoint.target_recommendation_revision_id === current.revision_id && checkpoint.target_dna_revision_id === current.design_dna.revision_id, 'creative_refinement_undo_unavailable', 'There is no current reversible design adjustment to undo. Your approved history is unchanged.', 409);
      await this.store.upsertCreativeDirectionState({
        ...context.state,
        project_id: context.project.id,
        connection_id: context.assignment.connection.id,
        status: 'recommended',
        explicit_preset_id: checkpoint.explicit_preset_id,
        dna_overrides: checkpoint.dna_overrides,
        updated_at: this.now()
      });
      return { changed: true, kind: 'undo', message: 'I restored the direction from before your last reversible design adjustment. Approved and generated history is unchanged.', creative_direction: await this.ensure({ userId, projectId }) };
    }
    const checkpoint = {
      explicit_preset_id: context.state?.explicit_preset_id || null,
      dna_overrides: activeDnaOverrides(context.state?.dna_overrides),
      target_recommendation_revision_id: null,
      target_dna_revision_id: null
    };
    let refined;
    if (intent.kind === 'preset_change') {
      const currentRevision = await this.store.findStorefrontRecommendationRevision(current.revision_id, context.project.id, context.project.organization_id);
      const eligibility = currentRevision?.recommendation?.eligibility?.find((item) => item.preset_id === intent.preset_id);
      assert(eligibility && eligibility.status !== 'ineligible', 'creative_direction_ineligible', `That direction cannot safely execute with the current approved strategy and resources.`, 422, { preset_id: intent.preset_id });
      await this.store.upsertCreativeDirectionState({ ...context.state, project_id: context.project.id, connection_id: context.assignment.connection.id, status: 'recommended', explicit_preset_id: intent.preset_id, dna_overrides: { __last_refinement: checkpoint }, updated_at: this.now() });
      refined = await this.ensure({ userId, projectId });
      const state = await this.store.findCreativeDirectionState(projectId);
      await this.store.upsertCreativeDirectionState({ ...state, dna_overrides: { ...activeDnaOverrides(state.dna_overrides), __last_refinement: { ...checkpoint, target_recommendation_revision_id: refined.revision_id, target_dna_revision_id: refined.design_dna.revision_id } }, updated_at: this.now() });
      return { changed: true, kind: 'recommendation', message: `I prepared ${publicPresetName(intent.preset_id)} as a reviewable direction. Your approved ${publicPresetName(context.session.preset_selection.selected_preset_id)} history is unchanged.`, creative_direction: refined };
    }
    const dnaRevision = await this.store.findDesignDnaRevision(current.design_dna.revision_id, context.project.id, context.project.organization_id);
    const overrides = mergeOverrides(dnaRevision.dna, intent.overrides);
    await this.store.upsertCreativeDirectionState({ ...context.state, project_id: context.project.id, connection_id: context.assignment.connection.id, status: 'recommended', dna_overrides: { ...overrides, __last_refinement: checkpoint }, updated_at: this.now() });
    refined = await this.ensure({ userId, projectId });
    const state = await this.store.findCreativeDirectionState(projectId);
    await this.store.upsertCreativeDirectionState({ ...state, dna_overrides: { ...activeDnaOverrides(state.dna_overrides), __last_refinement: { ...checkpoint, target_recommendation_revision_id: refined.revision_id, target_dna_revision_id: refined.design_dna.revision_id } }, updated_at: this.now() });
    return { changed: true, kind: 'design_dna', message: `I updated the ${intent.label} within ${current.primary.name}’s supported design boundaries.`, creative_direction: refined };
  }
  async approve({ userId, projectId, expectedRecommendationRevisionId, expectedDnaRevisionId }) {
    const context = await this.context({ userId, projectId, permission: 'interview:edit' });
    const current = await this.ensure({ userId, projectId });
    assert(current.revision_id === expectedRecommendationRevisionId && current.design_dna?.revision_id === expectedDnaRevisionId, 'creative_direction_stale', 'This direction changed after it was reviewed. Refresh before approving it.', 409);
    assert(current.approvable, 'creative_direction_not_approvable', current.approval_note || 'Review the current preset direction before approving this creative revision.', 409);
    const [candidate, dnaCandidate] = await Promise.all([
      this.store.findStorefrontRecommendationRevision(expectedRecommendationRevisionId, context.project.id, context.project.organization_id),
      this.store.findDesignDnaRevision(expectedDnaRevisionId, context.project.id, context.project.organization_id)
    ]);
    assertRecommendationCandidate(candidate);
    assertDnaCandidate(dnaCandidate);
    const presetRevisionId = context.session.preset_selection.approved_revision_id;
    const at = this.now();
    const recommendationApprovalChecksum = digest({ candidate_revision_id: candidate.revision_id, preset_revision_id: presetRevisionId, recommendation_checksum: candidate.recommendation_checksum });
    const recommendationApproval = {
      revision_id: `arr_${digest(`${context.project.id}|${candidate.revision_id}|${recommendationApprovalChecksum}`).slice(0, 40)}`,
      project_id: context.project.id, organization_id: context.project.organization_id, connection_id: context.assignment.connection.id,
      candidate_revision_id: candidate.revision_id, parent_revision_id: context.state?.current_approved_recommendation_revision_id || null, preset_revision_id: presetRevisionId,
      approval: { approval_reference: `merchant-creative-direction-${candidate.revision_id}`, approved_by_user_id: userId, approved_at: at },
      approval_checksum: recommendationApprovalChecksum, approved: candidate.recommendation, created_at: at
    };
    const dnaApprovalChecksum = digest({ candidate_revision_id: dnaCandidate.revision_id, recommendation_approval_revision_id: recommendationApproval.revision_id, dna_checksum: dnaCandidate.dna_checksum });
    const dnaApproval = {
      revision_id: `adna_${digest(`${context.project.id}|${dnaCandidate.revision_id}|${dnaApprovalChecksum}`).slice(0, 40)}`,
      project_id: context.project.id, organization_id: context.project.organization_id, connection_id: context.assignment.connection.id,
      candidate_revision_id: dnaCandidate.revision_id, recommendation_approval_revision_id: recommendationApproval.revision_id, parent_revision_id: context.state?.current_approved_dna_revision_id || null,
      approval: { approval_reference: `merchant-design-dna-${dnaCandidate.revision_id}`, approved_by_user_id: userId, approved_at: at },
      approval_checksum: dnaApprovalChecksum, approved: dnaCandidate.dna, created_at: at
    };
    const stored = await this.store.transaction(async (transaction) => {
      const approvedRecommendation = await transaction.createApprovedStorefrontRecommendationRevision(recommendationApproval);
      const approvedDna = await transaction.createApprovedDesignDnaRevision({ ...dnaApproval, recommendation_approval_revision_id: approvedRecommendation.revision_id });
      await transaction.upsertCreativeDirectionState({ ...context.state, project_id: context.project.id, connection_id: context.assignment.connection.id, status: 'approved', current_recommendation_revision_id: candidate.revision_id, current_approved_recommendation_revision_id: approvedRecommendation.revision_id, current_dna_revision_id: dnaCandidate.revision_id, current_approved_dna_revision_id: approvedDna.revision_id, dna_overrides: context.state?.dna_overrides || {}, updated_at: at });
      return { approvedRecommendation, approvedDna };
    });
    return { creative_direction: await this.ensure({ userId, projectId }), approved_recommendation: stored.approvedRecommendation, approved_design_dna: stored.approvedDna };
  }
  async resolveApprovedForSession({ project, session }) {
    const state = await this.store.findCreativeDirectionState(project.id);
    if (!state) return { recommendation: null, designDna: null };
    if ((state.current_recommendation_revision_id || state.current_dna_revision_id) && !state.current_approved_recommendation_revision_id && !state.current_approved_dna_revision_id) {
      throw new DashboardError('creative_direction_approval_required', 'Review the current creative direction before purchasing generation.', 409);
    }
    if (!state.current_approved_recommendation_revision_id && !state.current_approved_dna_revision_id) return { recommendation: null, designDna: null };
    assert(state.current_approved_recommendation_revision_id && state.current_approved_dna_revision_id, 'creative_direction_approval_incomplete', 'Review the current creative direction before purchasing generation.', 409);
    const [recommendation, designDna] = await Promise.all([
      this.store.findApprovedStorefrontRecommendationRevision(state.current_approved_recommendation_revision_id, project.id, project.organization_id),
      this.store.findApprovedDesignDnaRevision(state.current_approved_dna_revision_id, project.id, project.organization_id)
    ]);
    if (recommendation) assertRecommendationApproval(recommendation);
    if (designDna) assertDnaApproval(designDna);
    assert(recommendation && designDna && recommendation.candidate_revision_id === state.current_recommendation_revision_id && designDna.candidate_revision_id === state.current_dna_revision_id, 'creative_direction_stale', 'Review the current creative direction before purchasing generation.', 409);
    assert(recommendation.preset_revision_id === session.preset_selection?.approved_revision_id, 'creative_direction_preset_mismatch', 'The approved creative direction no longer matches the approved storefront preset.', 409);
    assert(designDna.recommendation_approval_revision_id === recommendation.revision_id, 'design_dna_binding_mismatch', 'The approved Design DNA no longer matches the approved storefront direction.', 409);
    return { recommendation, designDna };
  }
  fromSnapshot({ project, snapshot }) {
    const recommendation = snapshot.approved_recommendation_revision || null;
    const designDna = snapshot.approved_design_dna_revision || null;
    if (!recommendation && !designDna) return { recommendation: null, designDna: null };
    if (!recommendation || !designDna || recommendation.project_id !== project.id || recommendation.organization_id !== project.organization_id || designDna.project_id !== project.id || designDna.organization_id !== project.organization_id || designDna.recommendation_approval_revision_id !== recommendation.revision_id) {
      throw new DashboardError('creative_direction_snapshot_invalid', 'The paid creative direction could not be verified.', 409);
    }
    assertRecommendationApproval(recommendation);
    assertDnaApproval(designDna);
    return { recommendation, designDna };
  }
}

function cloneSafe(value) { return value === undefined ? null : JSON.parse(JSON.stringify(value)); }

module.exports = { RecommendationDesignService, RECOMMENDATION_VERSION, DNA_VERSION, RESOURCE_REQUIREMENTS, stable, digest, activeDnaOverrides, undoCheckpoint, assertRecommendationCandidate, assertDnaCandidate, assertRecommendationApproval, assertDnaApproval };
