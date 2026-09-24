'use strict';

const crypto = require('crypto');
const { createId } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { isoNow } = require('../lib/serialization.cjs');
const { effectiveResourcePlan, actionableConfirmationIds } = require('../../../../pipeline/resource-confirmation-eligibility');

const RECOMMENDATION_VERSION = 'recommended-resource-set-v2';
const CONFIDENCE = Object.freeze({ HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low', UNKNOWN: 'Unknown' });
const MAX_ALTERNATIVES = 3;
const SENSITIVE = /founder|artisan|handmade|origin|sustainab|eco[- ]?friendly|certif|award|testimonial|customer review|product review|customer result|claim|guarantee|statistic|clinically proven|best[- ]?sell(?:er|ing)?|(?:five|5)[- ]?star|\b[\d,]+\s+customers?|family[- ]?owned/i;
const SENSITIVE_CONFIRMATION = /founder|artisan|handmade|origin|sustainab|certif|award|testimonial|customer[_ :-]?review|product[_ :-]?review|result|claim|guarantee|statistic|verification:craftsmanship/i;
const ALWAYS_OPTIONAL_SLOTS = new Set(['logo', 'homepage_supporting_media', 'craftsmanship_or_editorial_media', 'preview_theme_context', 'optional_video']);

const SLOT_DEFINITIONS = Object.freeze([
  { id: 'logo', label: 'Logo', fallback: 'Use the store name as a text identity.', types: ['file', 'asset'] },
  { id: 'hero_media', label: 'Hero media', fallback: 'Use a product-first hero without separate campaign media.', types: ['file', 'product_media', 'asset'] },
  { id: 'hero_destination', label: 'Hero destination', fallback: 'Keep the hero without a destination.', types: ['product', 'collection'] },
  { id: 'homepage_supporting_media', label: 'Homepage media', fallback: 'Omit unsupported media placements.', types: ['file', 'product_media', 'asset'] },
  { id: 'featured_collection', label: 'Featured collection', fallback: 'Use a product-first composition when no collection is available.', types: ['collection'] },
  { id: 'featured_product', label: 'Featured product', fallback: 'Omit the featured-product placement.', types: ['product'] },
  { id: 'craftsmanship_or_editorial_media', label: 'Editorial media', fallback: 'Omit evidence-led media until suitable approved evidence exists.', types: ['file', 'asset'] },
  { id: 'primary_navigation', label: 'Primary navigation', fallback: 'Use a truthful minimal navigation structure.', types: ['menu'] },
  { id: 'preview_theme_context', label: 'Preview theme', fallback: 'Use Calinium’s validated local review foundation.', types: ['theme'] },
  { id: 'optional_video', label: 'Optional video', fallback: 'Continue without video.', types: ['file', 'asset'] }
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function normalizeText(value) { return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
function refId(value, kind) {
  const match = typeof value === 'string' && value.match(new RegExp(`/(${kind === 'asset' ? 'assets' : 'shopify-resources'})/([^/?#]+)$`));
  return match?.[2] || null;
}
function fieldSlot(field) {
  if (field.kind === 'product') return 'featured_product';
  if (field.kind === 'collection') return 'featured_collection';
  if (field.kind === 'menu') return 'primary_navigation';
  if (field.kind === 'video') return 'optional_video';
  if (field.kind !== 'image') return null;
  const identity = `${field.setting_ref || ''} ${field.setting_id || ''} ${field.section_id || ''}`.toLowerCase();
  if (identity.includes('logo')) return 'logo';
  if (identity.includes('hero') || identity.includes('banner') || identity.includes('slideshow')) return 'hero_media';
  if (identity.includes('craftsmanship') || identity.includes('lookbook') || identity.includes('editorial')) return 'craftsmanship_or_editorial_media';
  return 'homepage_supporting_media';
}
function assetSlot(asset) {
  if (['logo', 'alternate_logo'].includes(asset.asset_type)) return ['logo'];
  if (asset.asset_type === 'video') return ['optional_video'];
  if (['lifestyle_image', 'campaign_image'].includes(asset.asset_type)) return ['hero_media', 'homepage_supporting_media', 'craftsmanship_or_editorial_media'];
  if (asset.asset_type === 'product_image') return ['hero_media', 'homepage_supporting_media'];
  return [];
}
function fileSlots(resource, metadata) {
  const category = metadata?.asset_category || 'unclassified';
  const mediaType = String(resource.metadata?.media_type || '').toUpperCase();
  if (mediaType === 'VIDEO') return ['optional_video'];
  if (category === 'logo') return ['logo'];
  if (category === 'hero') return ['hero_media', 'homepage_supporting_media'];
  if (['lifestyle', 'campaign'].includes(category)) return ['hero_media', 'homepage_supporting_media', 'craftsmanship_or_editorial_media'];
  if (category === 'product') return ['hero_media', 'homepage_supporting_media'];
  return ['homepage_supporting_media'];
}
function publicSelection(candidate) {
  if (!candidate) return null;
  return {
    selection_id: candidate.id,
    name: candidate.title,
    type: candidate.type,
    source: candidate.source === 'shopify' ? 'Shopify' : 'Project assets',
    preview_url: candidate.preview_url || null,
    alt_text: candidate.alt_text || null
  };
}
function candidateEligible(candidate) {
  if (candidate.source === 'asset') {
    return candidate.availability === 'available'
      && !SENSITIVE.test(`${candidate.title || ''} ${candidate.alt_text || ''}`);
  }
  if (candidate.availability !== 'available' || !candidate.approval_eligible) return false;
  if (candidate.approval_status && ['rejected', 'revoked', 'stale', 'unavailable'].includes(candidate.approval_status)) return false;
  if (candidate.type === 'product' && String(candidate.resource_status || '').toUpperCase() !== 'ACTIVE') return false;
  if (candidate.type === 'menu' && Number(candidate.metadata?.item_count || 0) < 1) return false;
  if (candidate.type === 'theme' && candidate.metadata?.preview_eligibility !== 'eligible') return false;
  if (['file', 'product_media'].includes(candidate.type) && !candidate.preview_url) return false;
  if (candidate.type === 'file' && SENSITIVE.test(`${candidate.title || ''} ${candidate.alt_text || ''}`)) return false;
  return true;
}
function candidateScore(candidate, { selectedIds, approvedIds, slotId, candidateCount }) {
  let score = 150;
  const reasons = [];
  if (selectedIds.has(candidate.id)) { score += 1000; reasons.push('It is already part of your saved storefront choices.'); }
  if (approvedIds.has(candidate.id) || candidate.approval_status === 'approved') { score += 600; reasons.push('You previously approved it for this project.'); }
  if (candidate.explicit_slots?.includes(slotId)) { score += 300; reasons.push('Its approved resource category matches this placement.'); }
  if (slotId === 'primary_navigation') {
    const identity = normalizeText(`${candidate.title || ''} ${candidate.metadata?.handle || ''}`);
    if (identity.includes('main menu')) { score += 350; reasons.push('It is the store’s main navigation menu.'); }
    if (identity.includes('customer account')) score -= 250;
  }
  if (candidate.alt_text) score += 25;
  if (candidate.preview_url) score += 20;
  if (candidateCount === 1) score += 50;
  return { score, reason: reasons[0] || 'It is the strongest currently eligible resource for this placement.' };
}
function confidenceFor(ranked) {
  if (!ranked.length) return CONFIDENCE.UNKNOWN;
  if (ranked[0].score >= 600) return CONFIDENCE.HIGH;
  if (ranked[0].score >= 150 || ranked.length === 1) return CONFIDENCE.MEDIUM;
  return CONFIDENCE.LOW;
}

class RecommendedResourceSetService {
  constructor({ store, projectService, clock = () => new Date() }) {
    this.store = store;
    this.projectService = projectService;
    this.clock = clock;
  }
  now() { return isoNow(this.clock); }
  async authorize({ userId, projectId, permission = 'project:view' }) {
    const project = await this.store.findProjectById(projectId);
    if (!project) throw new DashboardError('project_not_found', 'Project not found.', 404);
    await this.projectService.requireMembership(project.organization_id, userId, permission);
    return project;
  }
  async context({ userId, projectId, permission = 'project:view' }) {
    const project = await this.authorize({ userId, projectId, permission });
    const assignment = await this.store.findProjectShopifyConnection(project.id, project.organization_id);
    const session = await this.store.findCreativeDirectorForProject(project.id);
    return { project, assignment, session };
  }
  waiting(status = 'waiting_for_store_resources') {
    return { version: 1, status, label: 'Resource recommendations are not ready yet', revision_id: null, approved_revision_id: null, approvable: false, slots: [], exceptions: [], summary: { recommended: 0, omitted: SLOT_DEFINITIONS.length, needs_individual_review: 0 } };
  }
  async evidence({ project, assignment, session, state }) {
    const [resourcesWithApproval, fileMetadata, assets, intakeState] = await Promise.all([
      this.store.listProjectShopifyResources(project.id, assignment.connection.id),
      this.store.listShopifyFileCandidateMetadata(project.id, assignment.connection.id),
      this.store.listAssetsForProject(project.id, project.organization_id),
      this.store.findMerchantIntakeState(project.id)
    ]);
    const intakeRevision = intakeState?.current_revision_id ? await this.store.findMerchantIntakeRevision(intakeState.current_revision_id, project.id) : null;
    const approvedRevision = state?.current_approved_revision_id
      ? await this.store.findApprovedResourceSetRevision(state.current_approved_revision_id, project.id, project.organization_id)
      : null;
    return { resourcesWithApproval, fileMetadata, assets, intakeState, intakeRevision, approvedRevision, session };
  }
  candidates({ resourcesWithApproval, fileMetadata, assets }) {
    const metadata = new Map(fileMetadata.map((item) => [item.resource_id, item]));
    const candidates = [];
    for (const entry of resourcesWithApproval) {
      const resource = entry.resource;
      const candidate = {
        id: resource.id,
        source: 'shopify',
        type: resource.resource_type,
        title: resource.display_title,
        preview_url: resource.preview_url,
        alt_text: metadata.get(resource.id)?.alt_text || resource.metadata?.alt_text || null,
        source_revision: resource.source_revision,
        availability: resource.availability_status,
        approval_eligible: resource.approval_eligible,
        approval_status: entry.approval?.approval_status || null,
        resource_status: resource.resource_status,
        metadata: resource.metadata || {},
        explicit_slots: resource.resource_type === 'file' ? fileSlots(resource, metadata.get(resource.id)) : []
      };
      if (candidateEligible(candidate)) candidates.push(candidate);
    }
    for (const item of assets) {
      const candidate = {
        id: item.id,
        source: 'asset',
        type: 'asset',
        title: item.display_title,
        preview_url: `/api/projects/${encodeURIComponent(item.project_id)}/assets/${encodeURIComponent(item.id)}/download`,
        alt_text: item.alt_text || null,
        source_revision: item.checksum_sha256,
        availability: item.upload_status === 'ready' && item.processing_state === 'ready' ? 'available' : 'unavailable',
        approval_eligible: true,
        approval_status: 'project_owned',
        metadata: { asset_type: item.asset_type },
        explicit_slots: assetSlot(item)
      };
      if (candidateEligible(candidate)) candidates.push(candidate);
    }
    return candidates.sort((left, right) => left.id.localeCompare(right.id));
  }
  selectedIds(session) {
    const generation = session?.generation_context || {};
    return new Set([
      ...Object.values(generation.shopify_resource_references || {}),
      ...Object.values(generation.merchant_references || {}).map((value) => refId(value, 'shopify') || refId(value, 'asset')),
      ...Object.values(generation.asset_references || {}).map((value) => refId(value, 'shopify') || refId(value, 'asset'))
    ].filter(Boolean));
  }
  slotBindings(session) {
    const resourcePlan = effectiveResourcePlan(session?.resource_plan || {});
    const bindings = Object.fromEntries(SLOT_DEFINITIONS.map((slot) => [slot.id, { field_refs: [], required_asset_ids: [], required: false }]));
    for (const field of resourcePlan.fields || []) {
      const slotId = fieldSlot(field);
      if (!slotId) continue;
      bindings[slotId].field_refs.push(field.setting_ref);
      bindings[slotId].required = bindings[slotId].required || Boolean(field.required);
    }
    for (const item of resourcePlan.required_assets || []) {
      const identity = `${item.asset_id || ''} ${(item.field_refs || []).join(' ')}`.toLowerCase();
      const slotId = identity.includes('video') ? 'optional_video' : identity.includes('logo') ? 'logo' : identity.includes('craft') || identity.includes('editorial') || identity.includes('lookbook') ? 'craftsmanship_or_editorial_media' : 'hero_media';
      bindings[slotId].required_asset_ids.push(item.asset_id);
      bindings[slotId].required = true;
    }
    return bindings;
  }
  eligibleForSlot(slotId, candidate) {
    if (slotId === 'logo' || slotId === 'hero_media' || slotId === 'homepage_supporting_media' || slotId === 'craftsmanship_or_editorial_media' || slotId === 'optional_video') return candidate.explicit_slots.includes(slotId) || (candidate.type === 'product_media' && ['hero_media', 'homepage_supporting_media'].includes(slotId));
    if (slotId === 'hero_destination') return ['product', 'collection'].includes(candidate.type);
    return ({ featured_collection: 'collection', featured_product: 'product', primary_navigation: 'menu', preview_theme_context: 'theme' })[slotId] === candidate.type;
  }
  makeSlots({ candidates, overrides, session, approvedRevision }) {
    const selectedIds = this.selectedIds(session);
    const approvedAssignments = new Map((approvedRevision?.assignments || []).map((item) => [item.slot_id, item]));
    const approvedIds = new Set((approvedRevision?.assignments || []).map((item) => item.resource_id));
    const bindings = this.slotBindings(session);
    const slots = [];
    for (const definition of SLOT_DEFINITIONS) {
      let eligible = candidates.filter((candidate) => this.eligibleForSlot(definition.id, candidate));
      const approved = approvedAssignments.get(definition.id);
      if (approved && eligible.some((candidate) => candidate.id === approved.resource_id)) approvedIds.add(approved.resource_id);
      const ranked = eligible.map((candidate) => ({ candidate, ...candidateScore(candidate, { selectedIds, approvedIds, slotId: definition.id, candidateCount: eligible.length }) }))
        .sort((left, right) => right.score - left.score || left.candidate.id.localeCompare(right.candidate.id));
      const overrideId = overrides?.[definition.id] || null;
      const selected = (overrideId && ranked.find((item) => item.candidate.id === overrideId)) || ranked[0] || null;
      if (selected) {
        const remaining = ranked.filter((item) => item.candidate.id !== selected.candidate.id);
        ranked.splice(0, ranked.length, selected, ...remaining);
      }
      const confidence = confidenceFor(ranked);
      const approvalRequirement = selected && definition.id === 'hero_destination' && selected.score < 600
        ? 'individual'
        : selected && confidence !== CONFIDENCE.LOW ? 'set_level' : selected ? 'individual' : 'not_required';
      const requiredByPlan = bindings[definition.id].required;
      const requiredForSet = requiredByPlan && !ALWAYS_OPTIONAL_SLOTS.has(definition.id);
      slots.push({
        slot_id: definition.id,
        label: definition.label,
        applicability: requiredForSet ? 'required' : 'optional',
        required: requiredForSet,
        downstream_review_required: requiredByPlan && !requiredForSet && !selected,
        field_refs: [...new Set(bindings[definition.id].field_refs)].sort(),
        required_asset_ids: [...new Set(bindings[definition.id].required_asset_ids)].sort(),
        selected: selected?.candidate || null,
        alternatives: ranked.slice(1, MAX_ALTERNATIVES + 1).map((item) => item.candidate),
        confidence,
        reason: overrideId && selected ? 'You selected this eligible resource for this placement.' : selected?.reason || 'No eligible resource is currently available for this optional placement.',
        fallback: definition.fallback,
        omission_allowed: !requiredForSet,
        approval_requirement: approvalRequirement,
        source: selected?.candidate?.source || null
      });
    }
    return slots;
  }
  fingerprint({ project, assignment, session, evidence, state }) {
    const resourcePlan = effectiveResourcePlan(session.resource_plan || {});
    return digest({
      version: RECOMMENDATION_VERSION,
      project_id: project.id,
      connection_id: assignment.connection.id,
      intake_revision_id: evidence.intakeRevision?.revision_id || null,
      preset_revision_id: session.preset_selection?.approved_revision_id || null,
      resource_plan: {
        fields: resourcePlan.fields || [],
        required_assets: resourcePlan.required_assets || [],
        required_confirmations: actionableConfirmationIds(session.resource_plan),
        confirmation_policy_checksum: session.resource_plan?.confirmation_eligibility?.checksum || null,
        blocker: resourcePlan.blocker || null
      },
      resources: evidence.resourcesWithApproval.map(({ resource, approval }) => [resource.id, resource.source_revision, resource.availability_status, resource.approval_eligible, ['rejected', 'revoked', 'stale', 'unavailable'].includes(approval?.approval_status) ? approval.approval_status : null]).sort(),
      file_metadata: evidence.fileMetadata.map((item) => [item.resource_id, item.asset_category, item.alt_text || null]).sort(),
      assets: evidence.assets.map((item) => [item.id, item.asset_type, item.checksum_sha256, item.upload_status, item.processing_state]).sort(),
      overrides: state?.overrides || {}
    });
  }
  readiness(slots, session) {
    const missingRequired = slots.filter((slot) => slot.required && !slot.selected);
    if (missingRequired.length) return 'blocked';
    const sensitiveConfirmations = actionableConfirmationIds(session.resource_plan).filter((item) => SENSITIVE_CONFIRMATION.test(item));
    if (sensitiveConfirmations.length || slots.some((slot) => slot.approval_requirement === 'individual')) return 'review_required';
    return 'ready';
  }
  staleSlots(current, approvedRevision, overrides = {}) {
    if (!approvedRevision || approvedRevision.candidate_revision_id === current.revision_id) return new Set();
    const currentSlots = new Map(current.slots.map((slot) => [slot.slot_id, slot]));
    return new Set((approvedRevision.assignments || []).filter((assignment) => {
      const selected = currentSlots.get(assignment.slot_id)?.selected;
      if (!selected) return true;
      if (selected.id !== assignment.resource_id && overrides[assignment.slot_id] === selected.id) return false;
      return selected.id !== assignment.resource_id || selected.source_revision !== assignment.source_revision;
    }).map((item) => item.slot_id));
  }
  publicResult({ state, revision, approvedRevision }) {
    const stale = this.staleSlots(revision, approvedRevision, state?.overrides || {});
    const slots = revision.slots.map((slot) => ({
      slot_id: slot.slot_id,
      label: slot.label,
      applicability: slot.applicability,
      required: slot.required,
      recommendation: publicSelection(slot.selected),
      alternatives: slot.alternatives.map(publicSelection),
      confidence: slot.confidence,
      reason: slot.reason,
      fallback: slot.fallback,
      omission_allowed: slot.omission_allowed,
      approval_requirement: slot.approval_requirement,
      stale: stale.has(slot.slot_id),
      status: stale.has(slot.slot_id) ? 'needs_review' : slot.selected ? 'recommended' : 'omitted'
    }));
    const exceptions = [
      ...slots.filter((slot) => slot.approval_requirement === 'individual').map((slot) => ({ slot_id: slot.slot_id, label: slot.label, reason: 'Review this choice individually before generation.' })),
      ...revision.slots.filter((slot) => slot.downstream_review_required).map((slot) => ({ slot_id: slot.slot_id, label: slot.label, reason: 'Your detailed Store Resources plan still needs an individual selection or a compatible omission for this item.' })),
      ...(revision.provenance.sensitive_confirmations || []).map((label) => ({ slot_id: null, label: 'Claim confirmation', reason: label }))
    ];
    const approvedCurrent = Boolean(approvedRevision && approvedRevision.candidate_revision_id === revision.revision_id);
    return {
      version: 1,
      status: stale.size ? 'stale' : approvedCurrent ? 'approved' : revision.readiness === 'blocked' ? 'blocked' : revision.readiness === 'review_required' ? 'review_required' : 'recommended',
      label: stale.size ? 'Resource recommendations need review' : approvedCurrent ? 'Recommended resources approved' : 'Recommended resources ready',
      revision_id: revision.revision_id,
      approved_revision_id: approvedRevision?.revision_id || null,
      approvable: revision.readiness !== 'blocked' && !approvedCurrent && stale.size === 0,
      slots,
      exceptions,
      summary: {
        recommended: slots.filter((slot) => slot.recommendation).length,
        omitted: slots.filter((slot) => !slot.recommendation).length,
        needs_individual_review: exceptions.length
      }
    };
  }
  async ensure({ userId, projectId }) {
    const { project, assignment, session } = await this.context({ userId, projectId });
    if (!assignment?.connection || !session?.preset_selection?.approved_revision_id || !session?.resource_plan?.fields) return this.waiting();
    const state = await this.store.findRecommendedResourceSetState(project.id);
    const evidence = await this.evidence({ project, assignment, session, state });
    if (!evidence.intakeRevision) return this.waiting('waiting_for_store_learning');
    const candidates = this.candidates(evidence);
    const evidenceFingerprint = this.fingerprint({ project, assignment, session, evidence, state });
    const revisionId = `rrs_${digest(`${project.id}|${RECOMMENDATION_VERSION}|${evidenceFingerprint}`).slice(0, 40)}`;
    let revision = await this.store.findRecommendedResourceSetRevision(revisionId, project.id, project.organization_id);
    if (!revision) {
      const slots = this.makeSlots({ candidates, overrides: state?.overrides || {}, session, approvedRevision: evidence.approvedRevision });
      const sensitiveConfirmations = actionableConfirmationIds(session.resource_plan).filter((item) => SENSITIVE_CONFIRMATION.test(item)).map((item) => String(item).slice(0, 240));
      const readiness = this.readiness(slots, session);
      revision = await this.store.createRecommendedResourceSetRevision({
        revision_id: revisionId,
        project_id: project.id,
        organization_id: project.organization_id,
        connection_id: assignment.connection.id,
        parent_revision_id: state?.current_revision_id === revisionId ? null : state?.current_revision_id || null,
        intake_revision_id: evidence.intakeRevision.revision_id,
        preset_revision_id: session.preset_selection.approved_revision_id,
        recommendation_version: RECOMMENDATION_VERSION,
        evidence_fingerprint: evidenceFingerprint,
        recommendation_checksum: digest(slots),
        readiness,
        slots,
        provenance: { source_authority: ['merchant_approved_choices', 'shopify_authoritative_resources', 'project_assets', 'approved_preset', 'store_intelligence'], merchant_override_slots: Object.keys(state?.overrides || {}).sort(), sensitive_confirmations: sensitiveConfirmations },
        created_at: this.now()
      });
    }
    const approvedRevision = state?.current_approved_revision_id
      ? await this.store.findApprovedResourceSetRevision(state.current_approved_revision_id, project.id, project.organization_id)
      : null;
    const stale = this.staleSlots(revision, approvedRevision, state?.overrides || {});
    const status = stale.size ? 'stale' : approvedRevision?.candidate_revision_id === revision.revision_id ? 'approved' : revision.readiness === 'blocked' ? 'blocked' : revision.readiness === 'review_required' ? 'review_required' : 'recommended';
    const nextState = await this.store.upsertRecommendedResourceSetState({ project_id: project.id, connection_id: assignment.connection.id, status, current_revision_id: revision.revision_id, current_approved_revision_id: approvedRevision?.revision_id || null, overrides: state?.overrides || {}, created_at: state?.created_at || this.now(), updated_at: this.now() });
    return this.publicResult({ state: nextState, revision, approvedRevision });
  }
  async replace({ userId, projectId, expectedRevisionId, slotId, selectionId }) {
    await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const current = await this.ensure({ userId, projectId });
    assert(current.revision_id === expectedRevisionId, 'recommended_resource_set_stale', 'These resource recommendations changed. Review the current set before making this change.', 409);
    const slot = current.slots.find((item) => item.slot_id === slotId);
    assert(slot, 'resource_set_slot_invalid', 'Choose a current resource slot.', 422);
    const eligible = [slot.recommendation, ...slot.alternatives].filter(Boolean);
    assert(eligible.some((item) => item.selection_id === selectionId), 'resource_set_selection_invalid', 'Choose one of the current eligible alternatives for this resource.', 422);
    const state = await this.store.findRecommendedResourceSetState(projectId);
    await this.store.upsertRecommendedResourceSetState({ ...state, status: 'recommended', overrides: { ...(state.overrides || {}), [slotId]: selectionId }, updated_at: this.now() });
    return this.ensure({ userId, projectId });
  }
  async replaceFromConversation({ userId, projectId, expectedRevisionId, message }) {
    const current = await this.ensure({ userId, projectId });
    assert(current.revision_id === expectedRevisionId, 'recommended_resource_set_stale', 'These resource recommendations changed. Review the current set before revising it.', 409);
    const text = normalizeText(message).replace(/^(please\s+)?(use|choose|replace|switch to)\s+/, '').replace(/\s+(instead|please)$/g, '').trim();
    if (/^you decide(?:\s+(?:the\s+)?)?/.test(text)) {
      const requested = text.replace(/^you decide(?:\s+(?:the\s+)?)?/, '').trim();
      const eligibleSlots = current.slots.filter((slot) => slot.recommendation && slot.approval_requirement === 'set_level' && (!requested || normalizeText(slot.label) === requested || normalizeText(slot.label).includes(requested)));
      assert(eligibleSlots.length > 0, 'resource_set_request_ambiguous', 'Tell me which ordinary resource slot you want Calinium to decide, or review the current recommendations.', 422);
      const state = await this.store.findRecommendedResourceSetState(projectId);
      const overrides = { ...(state.overrides || {}) };
      for (const slot of eligibleSlots) overrides[slot.slot_id] = slot.recommendation.selection_id;
      await this.store.upsertRecommendedResourceSetState({ ...state, status: 'recommended', overrides, updated_at: this.now() });
      return this.ensure({ userId, projectId });
    }
    const matches = [];
    for (const slot of current.slots) for (const option of [slot.recommendation, ...slot.alternatives].filter(Boolean)) {
      const optionName = normalizeText(option.name);
      const slotName = normalizeText(slot.label);
      if (optionName === text || text.endsWith(optionName) || (text.includes(optionName) && text.includes(slotName))) matches.push({ slot, option });
    }
    assert(matches.length === 1, 'resource_set_request_ambiguous', 'I need one exact resource name from the current recommendations before I can make that change.', 422);
    return this.replace({ userId, projectId, expectedRevisionId, slotId: matches[0].slot.slot_id, selectionId: matches[0].option.selection_id });
  }
  async approve({ userId, projectId, expectedRevisionId }) {
    const { project, assignment } = await this.context({ userId, projectId, permission: 'interview:edit' });
    const publicCurrent = await this.ensure({ userId, projectId });
    assert(publicCurrent.revision_id === expectedRevisionId, 'recommended_resource_set_stale', 'These resource recommendations changed. Review the current set before approving it.', 409);
    if (publicCurrent.approved_revision_id && publicCurrent.status === 'approved') {
      const approvedRevision = await this.store.findApprovedResourceSetRevision(publicCurrent.approved_revision_id, project.id, project.organization_id);
      return { resource_set: publicCurrent, approved_revision: approvedRevision, handoff: approvedRevision.handoff, reused: true };
    }
    assert(publicCurrent.approvable, 'recommended_resource_set_not_approvable', 'Review the current required resource choices before approving this set.', 409);
    const candidate = await this.store.findRecommendedResourceSetRevision(expectedRevisionId, project.id, project.organization_id);
    const state = await this.store.findRecommendedResourceSetState(project.id);
    const at = this.now();
    const approvedAssignments = [];
    const approvalRecords = [];
    const handoff = { asset_selections: {}, required_asset_selections: {}, shopify_selections: {}, resolved_empty_fields: [] };
    for (const slot of candidate.slots) {
      if (!slot.selected) {
        if (!slot.required) handoff.resolved_empty_fields.push(...slot.field_refs);
        continue;
      }
      if (slot.approval_requirement !== 'set_level') continue;
      const selected = slot.selected;
      if (selected.source === 'shopify') {
        const currentApproval = await this.store.findShopifyResourceApproval(project.id, selected.id);
        approvalRecords.push({
          id: currentApproval?.id || createId('sra'), project_id: project.id, connection_id: assignment.connection.id, resource_id: selected.id,
          approval_status: 'approved', source_revision: selected.source_revision, merchant_note: currentApproval?.merchant_note || null,
          approved_by_user_id: userId, approved_at: at, rejected_at: null, revoked_at: null, updated_at: at, created_at: currentApproval?.created_at || at
        });
      }
      for (const fieldRef of slot.field_refs) {
        if (selected.source === 'asset') handoff.asset_selections[fieldRef] = selected.id;
        else handoff.shopify_selections[fieldRef] = selected.id;
      }
      for (const requiredAssetId of slot.required_asset_ids) handoff.required_asset_selections[requiredAssetId] = `${selected.source === 'asset' ? 'asset' : 'shopify'}:${selected.id}`;
      approvedAssignments.push({ slot_id: slot.slot_id, resource_id: selected.id, resource_type: selected.type, source: selected.source, source_revision: selected.source_revision, approval_basis: state?.overrides?.[slot.slot_id] ? 'merchant_override_or_delegation' : 'recommended_set', field_refs: slot.field_refs, required_asset_ids: slot.required_asset_ids });
    }
    handoff.resolved_empty_fields = [...new Set(handoff.resolved_empty_fields)].sort();
    const approvalChecksum = digest({ candidate_revision_id: candidate.revision_id, assignments: approvedAssignments, handoff });
    const revisionId = `arrs_${digest(`${project.id}|${candidate.revision_id}|${approvalChecksum}`).slice(0, 40)}`;
    const approvalRecord = {
      revision_id: revisionId, project_id: project.id, organization_id: project.organization_id, connection_id: assignment.connection.id,
      candidate_revision_id: candidate.revision_id, parent_revision_id: state?.current_approved_revision_id || null,
      approval: { approval_id: createId('rsa'), approval_reference: `merchant-resource-set-approval-${candidate.revision_id}`, approved_by_user_id: userId, approved_at: at },
      approval_checksum: approvalChecksum, assignments: approvedAssignments, handoff, created_at: at
    };
    const approvedRevision = await this.store.transaction(async (transaction) => {
      for (const approval of approvalRecords) await transaction.upsertShopifyResourceApproval(approval);
      const stored = await transaction.createApprovedResourceSetRevision(approvalRecord);
      await transaction.upsertRecommendedResourceSetState({ ...state, status: 'approved', current_revision_id: candidate.revision_id, current_approved_revision_id: stored.revision_id, overrides: state?.overrides || {}, updated_at: at });
      return stored;
    });
    return { resource_set: this.publicResult({ state: { ...state, status: 'approved', current_revision_id: candidate.revision_id, current_approved_revision_id: approvedRevision.revision_id }, revision: candidate, approvedRevision }), approved_revision: approvedRevision, handoff };
  }
  async verifyBinding({ project, binding, session = null }) {
    if (!binding?.revision_id) return { present: false, valid: true, revision: null };
    const [state, revision] = await Promise.all([
      this.store.findRecommendedResourceSetState(project.id),
      this.store.findApprovedResourceSetRevision(binding.revision_id, project.id, project.organization_id)
    ]);
    const generation = session?.generation_context || {};
    const handoffMatches = !revision || (
      Object.entries(revision.handoff.shopify_selections || {}).every(([field, id]) => generation.shopify_resource_references?.[field] === id)
      && Object.entries(revision.handoff.asset_selections || {}).every(([field, id]) => refId(generation.merchant_references?.[field], 'asset') === id)
      && (revision.handoff.resolved_empty_fields || []).every((field) => generation.resolved_empty_fields?.includes(field))
      && Object.entries(revision.handoff.required_asset_selections || {}).every(([assetId, value]) => {
        const [source, id] = String(value).split(':');
        return refId(generation.asset_references?.[assetId], source === 'asset' ? 'asset' : 'shopify') === id;
      })
    );
    const valid = Boolean(revision && revision.approval_checksum === binding.checksum && state?.current_approved_revision_id === revision.revision_id && state.current_revision_id === revision.candidate_revision_id && state.status === 'approved' && handoffMatches);
    return { present: true, valid, revision };
  }
}

module.exports = { RecommendedResourceSetService, RECOMMENDATION_VERSION, SLOT_DEFINITIONS, CONFIDENCE, stable, digest, fieldSlot };
