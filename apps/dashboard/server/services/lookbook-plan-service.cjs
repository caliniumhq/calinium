'use strict';

const crypto = require('crypto');
const { createId } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { createSchemaValidator } = require('../../../../ai/compiler/schema-validator');
const { validatePlan } = require('../../../../scripts/validate-approved-block-plan');
const { checksum, expectedPlanChecksum, expectedSnapshotChecksum } = require('../../../../pipeline/resolve-approved-block-plan-transport');
const { homepageSections } = require('../../../../pipeline/strategy-section-policy');
const { merchantScopeId } = require('./editorial-grid-plan-service.cjs');

const CANDIDATE_SCHEMA = 'schemas/calinium-lookbook-candidate.schema.json';
const MAX_FRAMES = 6;

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function digest(value) { return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex'); }
function tidy(value, maximum) { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maximum); }
function lookbookPlanRequired(storeStrategy) { return homepageSections(storeStrategy).some((section) => section.section_id === 'lookbook'); }
function nativeVisibility() { return { mode: 'always', conditions: [] }; }
function supportingIntent() { return { emphasis: 'supporting', media_priority: 'supporting', density: 'balanced' }; }

function defaultCandidate(at) {
  return { version: 1, status: 'not_required', candidate_version: 0, frames: [], warnings: [], updated_at: at };
}

function candidateForStrategy(contentPlan, storeStrategy, at) {
  const current = contentPlan && typeof contentPlan === 'object' ? clone(contentPlan) : {};
  const candidate = current.lookbook && typeof current.lookbook === 'object' ? current.lookbook : defaultCandidate(at);
  if (!lookbookPlanRequired(storeStrategy)) return { ...current, lookbook: { ...defaultCandidate(at), updated_at: candidate.updated_at || at } };
  const next = candidate.status === 'not_required'
    ? { ...defaultCandidate(at), status: 'draft', candidate_version: 1, updated_at: at }
    : candidate;
  return { ...current, plan_id: current.plan_id || createId('abp'), lookbook: next };
}

function validateCandidate(candidate, root, label = 'lookbook_candidate') {
  const errors = createSchemaValidator(root).validateFile(candidate, CANDIDATE_SCHEMA, label);
  if (errors.length) throw new DashboardError('lookbook_candidate_invalid', 'Calinium could not validate this Lookbook plan.', 422, { errors });
  return candidate;
}

function publicCandidate(candidate) { return clone(candidate || defaultCandidate(new Date(0).toISOString())); }

function clientFrames(frames, current) {
  assert(Array.isArray(frames), 'lookbook_candidate_invalid', 'Provide an ordered list of Lookbook frames.', 422);
  assert(frames.length <= MAX_FRAMES, 'lookbook_frame_limit', `Lookbook supports at most ${MAX_FRAMES} frames.`, 422);
  const prior = new Map((current.frames || []).map((frame) => [frame.content_id, frame]));
  const seen = new Set();
  return frames.map((input, index) => {
    assert(input && typeof input === 'object' && !Array.isArray(input), 'lookbook_frame_invalid', 'Each Lookbook frame must be a simple approved-content entry.', 422);
    const requested = typeof input.content_id === 'string' ? input.content_id : null;
    if (requested) assert(prior.has(requested), 'lookbook_frame_identity_invalid', 'A Lookbook frame identity must belong to this saved candidate.', 409);
    const existing = requested ? prior.get(requested) : null;
    const contentId = existing?.content_id || createId('abpc');
    assert(!seen.has(contentId), 'lookbook_frame_identity_duplicate', 'Each Lookbook frame may appear only once.', 422);
    seen.add(contentId);
    const destination = input.destination && typeof input.destination === 'object' ? input.destination : {};
    const destinationType = destination.type === null || destination.type === undefined || destination.type === '' ? null : String(destination.type).trim();
    assert(!destinationType || ['shopify_product', 'shopify_collection'].includes(destinationType), 'lookbook_destination_unsupported', 'This first Lookbook workflow supports approved Shopify products or collections only.', 422);
    const resourceId = destination.resource_id === null || destination.resource_id === undefined ? null : tidy(destination.resource_id, 240);
    assert(Boolean(destinationType) === Boolean(resourceId), 'lookbook_destination_incomplete', 'Choose a complete approved destination or remove the destination.', 422);
    const ratio = String(input.media_ratio || 'portrait').trim();
    assert(['portrait', 'landscape'].includes(ratio), 'lookbook_media_ratio_invalid', 'Choose portrait or landscape for this Lookbook frame.', 422);
    return {
      content_id: contentId,
      placement_id: existing?.placement_id || createId('abpl'),
      image_asset_id: input.image_asset_id ? tidy(input.image_asset_id, 240) : null,
      mobile_image_asset_id: input.mobile_image_asset_id ? tidy(input.mobile_image_asset_id, 240) : null,
      title: tidy(input.title, 240),
      text: tidy(input.text, 1200),
      destination: { type: destinationType, resource_id: resourceId },
      media_ratio: ratio,
      image_alt_text: input.image_alt_text ? tidy(input.image_alt_text, 500) : null,
      accessible_label: input.accessible_label ? tidy(input.accessible_label, 500) : null,
      decorative_media: Boolean(input.decorative_media),
      order: index + 1
    };
  });
}

function candidateWarnings(frames) {
  const warnings = [];
  const destinations = new Set();
  for (const frame of frames) {
    if (!frame.image_asset_id) warnings.push(`${frame.content_id}:primary_image_required`);
    if (!frame.title && !frame.image_alt_text && !frame.accessible_label) warnings.push(`${frame.content_id}:accessible_context_required`);
    if (frame.destination.resource_id) {
      const key = `${frame.destination.type}|${frame.destination.resource_id}`;
      if (destinations.has(key)) warnings.push(`${frame.content_id}:duplicate_destination`);
      destinations.add(key);
      if (frame.decorative_media) warnings.push(`${frame.content_id}:linked_media_cannot_be_decorative`);
      if (!frame.title) warnings.push(`${frame.content_id}:linked_frame_title_required`);
    }
  }
  return warnings.sort();
}

function saveCandidate({ current, expectedVersion, frames, root, at }) {
  assert(Number.isInteger(expectedVersion), 'lookbook_candidate_version_required', 'Reload this Lookbook plan before saving your changes.', 409);
  assert(expectedVersion === current.candidate_version, 'lookbook_candidate_stale', 'This Lookbook plan changed elsewhere. Reload it before saving.', 409);
  const nextFrames = clientFrames(frames, current);
  const next = { ...current, status: 'draft', candidate_version: current.candidate_version + 1, frames: nextFrames, warnings: candidateWarnings(nextFrames), updated_at: at };
  validateCandidate(next, root);
  return next;
}

async function resolveCandidateResources({ candidate, project, shopifyService, store }) {
  const destinations = new Map();
  const images = new Map();
  const duplicateDestinations = new Set();
  for (const frame of candidate.frames) {
    assert(frame.image_asset_id, 'lookbook_primary_image_required', 'Each Lookbook frame needs an approved primary image.', 422);
    assert(frame.title || frame.image_alt_text || frame.accessible_label, 'lookbook_accessible_context_required', 'Each Lookbook frame needs approved title or accessible image context.', 422);
    if (frame.destination.resource_id) {
      assert(!frame.decorative_media, 'lookbook_linked_media_decorative', 'A linked Lookbook frame cannot use decorative media.', 422);
      assert(frame.title, 'lookbook_linked_frame_title_required', 'A linked Lookbook frame needs a merchant-approved title.', 422);
      const duplicateKey = `${frame.destination.type}|${frame.destination.resource_id}`;
      assert(!duplicateDestinations.has(duplicateKey), 'lookbook_destination_duplicate', 'Each Lookbook frame must point to a different approved destination.', 422);
      duplicateDestinations.add(duplicateKey);
      const allowedType = frame.destination.type === 'shopify_product' ? 'product' : 'collection';
      const selected = await shopifyService.resolveApprovedResource({ projectId: project.id, organizationId: project.organization_id, resourceId: frame.destination.resource_id, allowedTypes: [allowedType] });
      assert(selected.resource.handle, 'lookbook_destination_binding_missing', 'The approved Lookbook destination needs a current Shopify handle.', 409);
      destinations.set(frame.destination.resource_id, selected.resource);
    }
    for (const assetId of [frame.image_asset_id, frame.mobile_image_asset_id].filter(Boolean)) {
      const asset = await store.findAssetForProject(assetId, project.id, project.organization_id);
      assert(asset?.upload_status === 'ready' && asset.mime_type?.startsWith('image/'), 'lookbook_image_unavailable', 'Choose a current approved project image for this Lookbook frame.', 409);
      images.set(assetId, asset);
    }
  }
  return { destinations, images };
}

function resourceReference({ resourceId, resourceType, sourceType, sourceReference, approvedRevision, approvalId, referenceRole = null, checksumSha256 = null }) {
  return { resource_id: resourceId, resource_type: resourceType, source_type: sourceType, source_reference: sourceReference, approved_revision: approvedRevision, approval_id: approvalId, ...(referenceRole ? { reference_role: referenceRole } : {}), checksum_sha256: checksumSha256 };
}

function rebindApproval(plan, snapshot, { revisionId, approval, at, snapshotId, snapshotRevisionId }) {
  const reboundPlan = clone(plan);
  reboundPlan.revision_id = revisionId;
  reboundPlan.parent_revision_id = plan.revision_id;
  reboundPlan.created_at = at;
  reboundPlan.approval = { approval_id: approval.approval_id, approval_reference: approval.approval_reference, approval_status: 'approved', approver_type: 'merchant', approved_at: at };
  for (const entity of Object.values(reboundPlan.content_entities || {})) {
    for (const value of entity.localized_values || []) value.approval_id = approval.approval_id;
    if (entity.provenance) entity.provenance.approval_id = approval.approval_id;
  }
  for (const resource of Object.values(reboundPlan.resource_references || {})) resource.approval_id = approval.approval_id;
  for (const evidence of Object.values(reboundPlan.evidence_references || {})) evidence.approval_id = approval.approval_id;
  const reboundSnapshot = clone(snapshot);
  reboundSnapshot.snapshot_id = snapshotId;
  reboundSnapshot.revision_id = snapshotRevisionId;
  reboundSnapshot.plan_revision_id = revisionId;
  reboundSnapshot.approval = approval;
  reboundSnapshot.created_at = at;
  return { plan: reboundPlan, snapshot: reboundSnapshot };
}

function buildApprovedRecords({ candidate, project, userId, resources, at, root, existingPlanRevision = null, existingResourceSnapshot = null, planId = null }) {
  const revisionId = createId('abpr');
  const approvalId = createId('aba');
  const approval = { approval_id: approvalId, approval_reference: `lookbook-plan:${planId || existingPlanRevision?.plan_id || createId('abp')}:${revisionId}`, approval_revision_id: createId('abar'), approved_at: at };
  const snapshotId = createId('abps');
  const snapshotRevisionId = createId('abpsr');
  const base = existingPlanRevision
    ? rebindApproval(existingPlanRevision.plan, existingResourceSnapshot, { revisionId, approval, at, snapshotId, snapshotRevisionId })
    : {
      plan: {
        schema_version: '1.0', plan_id: planId || createId('abp'), revision_id: revisionId, parent_revision_id: null, created_at: at,
        store_scope: { organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id) },
        approval: { approval_id: approvalId, approval_reference: approval.approval_reference, approval_status: 'approved', approver_type: 'merchant', approved_at: at },
        default_locale: 'en', content_entities: {}, resource_references: {}, evidence_references: {}, compositions: [],
        metadata: { immutable: true, source: 'merchant_approved', migration: { status: 'native', source_revision_id: null, migration_version: null } }
      },
      snapshot: { version: 1, snapshot_id: snapshotId, revision_id: snapshotRevisionId, plan_id: planId || createId('abp'), plan_revision_id: revisionId, organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id), approval, source_revision: '', snapshot_checksum: '', resources: {}, created_at: at }
    };
  const plan = base.plan;
  const snapshot = base.snapshot;
  if (!planId && !existingPlanRevision) snapshot.plan_id = plan.plan_id;
  const priorLookbook = (plan.compositions || []).find((composition) => composition.page_role === 'homepage' && composition.section_role === 'editorial_lookbook');
  if (priorLookbook) {
    const priorContentIds = new Set(priorLookbook.block_placements.map((placement) => placement.content_entity_id));
    plan.compositions = plan.compositions.filter((composition) => composition !== priorLookbook);
    for (const contentId of priorContentIds) delete plan.content_entities[contentId];
  }
  const evidenceId = createId('abpe');
  const resourceBySource = new Map();
  function bindImage(asset, referenceRole) {
    const key = `image:${referenceRole}:${asset.id}`;
    if (resourceBySource.has(key)) return resourceBySource.get(key);
    const id = createId('abprs');
    plan.resource_references[id] = resourceReference({ resourceId: id, resourceType: 'project_image', sourceType: 'project_asset', sourceReference: asset.id, approvedRevision: asset.checksum_sha256, approvalId, referenceRole, checksumSha256: asset.checksum_sha256 });
    snapshot.resources[id] = { resource_type: 'project_image', approved_revision: asset.checksum_sha256, runtime_value: `dashboard://projects/${project.id}/assets/${asset.id}`, source_reference: asset.id, approval_eligible: true, availability_at_snapshot: 'available' };
    resourceBySource.set(key, id);
    return id;
  }
  function bindDestination(source, type) {
    const key = `${type}:${source.id}`;
    if (resourceBySource.has(key)) return resourceBySource.get(key);
    const id = createId('abprs');
    const resourceType = type === 'shopify_product' ? 'shopify_product' : 'shopify_collection';
    plan.resource_references[id] = resourceReference({ resourceId: id, resourceType, sourceType: 'shopify', sourceReference: source.id, approvedRevision: source.source_revision, approvalId, referenceRole: 'destination' });
    snapshot.resources[id] = { resource_type: resourceType, approved_revision: source.source_revision, runtime_value: source.handle, source_reference: source.id, approval_eligible: true, availability_at_snapshot: 'available' };
    resourceBySource.set(key, id);
    return id;
  }
  const placements = [];
  for (const frame of candidate.frames) {
    const resourceIds = [bindImage(resources.images.get(frame.image_asset_id), 'primary_media')];
    if (frame.mobile_image_asset_id) resourceIds.push(bindImage(resources.images.get(frame.mobile_image_asset_id), 'mobile_media'));
    if (frame.destination.resource_id) resourceIds.push(bindDestination(resources.destinations.get(frame.destination.resource_id), frame.destination.type));
    const localizedValues = [{ locale: 'en', field: 'media_ratio', value: frame.media_ratio, value_type: 'merchant_approved_text', approval_id: approvalId }];
    if (frame.title) localizedValues.push({ locale: 'en', field: 'title', value: frame.title, value_type: 'merchant_approved_text', approval_id: approvalId });
    if (frame.text) localizedValues.push({ locale: 'en', field: 'text', value: frame.text, value_type: 'merchant_approved_text', approval_id: approvalId });
    plan.content_entities[frame.content_id] = {
      content_id: frame.content_id, content_type: 'visual_frame', localized_values: localizedValues, resource_reference_ids: resourceIds, evidence_reference_ids: [evidenceId],
      provenance: { source_type: 'merchant_approved', approval_id: approvalId, evidence_reference_ids: [evidenceId] },
      accessibility: { decorative_media: frame.decorative_media, localized: [{ locale: 'en', alt_text: frame.image_alt_text, accessible_label: frame.accessible_label || frame.title || null }], transcript_resource_id: null }
    };
    placements.push({ placement_id: frame.placement_id, content_entity_id: frame.content_id, semantic_block_role: 'lookbook_frame', order: frame.order, visibility: nativeVisibility(), presentation_intent: supportingIntent() });
  }
  plan.evidence_references[evidenceId] = { evidence_id: evidenceId, evidence_type: 'merchant_confirmed_fact', source_type: 'merchant_record', source_reference: `creative-director:${plan.plan_id}:lookbook:${candidate.candidate_version}`, approved_revision: digest(`${plan.plan_id}|lookbook|${candidate.candidate_version}|${userId}|${at}`), approval_id: approvalId };
  const homepageOrder = Math.max(0, ...(plan.compositions || []).filter((composition) => composition.page_role === 'homepage').map((composition) => composition.order || 0));
  plan.compositions.push({ composition_id: createId('abpcp'), page_role: 'homepage', section_role: 'editorial_lookbook', order: homepageOrder + 1, visibility: nativeVisibility(), presentation_intent: supportingIntent(), block_placements: placements });
  snapshot.plan_id = plan.plan_id;
  snapshot.plan_revision_id = plan.revision_id;
  snapshot.source_revision = checksum(Object.fromEntries(Object.entries(snapshot.resources).sort(([left], [right]) => left.localeCompare(right))));
  snapshot.snapshot_checksum = expectedSnapshotChecksum(snapshot);
  const errors = validatePlan(plan, 'approved_lookbook_plan', createSchemaValidator(root));
  if (errors.length) throw new DashboardError('lookbook_approved_plan_invalid', 'Calinium could not create a valid approved Lookbook revision.', 500, { errors });
  const planRevision = { version: 1, plan_id: plan.plan_id, revision_id: plan.revision_id, schema_version: plan.schema_version, parent_revision_id: plan.parent_revision_id, organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id), approval, approved_at: at, plan_checksum: checksum(plan), resource_snapshot_id: snapshot.snapshot_id, resource_snapshot_revision_id: snapshot.revision_id, plan, created_at: at };
  assert(planRevision.plan_checksum === expectedPlanChecksum(planRevision), 'lookbook_checksum_invalid', 'Calinium could not secure the approved Lookbook revision.', 500);
  return { planRevision, resourceSnapshot: snapshot };
}

module.exports = { CANDIDATE_SCHEMA, MAX_FRAMES, lookbookPlanRequired, defaultCandidate, candidateForStrategy, validateCandidate, publicCandidate, saveCandidate, candidateWarnings, resolveCandidateResources, buildApprovedRecords };
