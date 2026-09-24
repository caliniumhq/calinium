'use strict';

const crypto = require('crypto');
const { createId } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { createSchemaValidator } = require('../../../../ai/compiler/schema-validator');
const { validatePlan } = require('../../../../scripts/validate-approved-block-plan');
const { checksum, expectedPlanChecksum, expectedSnapshotChecksum } = require('../../../../pipeline/resolve-approved-block-plan-transport');
const { homepageSections } = require('../../../../pipeline/strategy-section-policy');

const CANDIDATE_SCHEMA = 'schemas/calinium-editorial-grid-candidate.schema.json';
const MAX_STORIES = 8;

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function digest(value) { return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex'); }
function merchantScopeId(projectId) { return `mrc_${String(projectId).replace(/^prj_/, '')}`; }
function tidy(value, maximum) { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maximum); }
function contentPlanRequired(storeStrategy) { return homepageSections(storeStrategy).some((section) => section.section_id === 'editorial-grid'); }

function defaultCandidate(at) {
  return {
    version: 1,
    status: 'not_required',
    candidate_version: 0,
    plan_id: null,
    parent_revision_id: null,
    approved_revision_id: null,
    approved_resource_snapshot_revision_id: null,
    stories: [],
    warnings: [],
    updated_at: at
  };
}

function candidateForStrategy(candidate, storeStrategy, at) {
  const current = candidate && typeof candidate === 'object' ? clone(candidate) : defaultCandidate(at);
  // Content Plan is shared by independently approved semantic sections. If
  // Editorial Grid is absent, reset only its candidate fields and preserve
  // sibling candidates such as Lookbook and Craftsmanship.
  if (!contentPlanRequired(storeStrategy)) {
    const reset = defaultCandidate(at);
    return {
      ...current,
      version: reset.version,
      status: reset.status,
      candidate_version: reset.candidate_version,
      stories: reset.stories,
      warnings: reset.warnings,
      updated_at: current.updated_at || at
    };
  }
  if (current.status === 'not_required' || !current.plan_id) {
    return { ...defaultCandidate(at), status: 'draft', candidate_version: 1, plan_id: createId('abp'), updated_at: at };
  }
  return current;
}

function validateCandidate(candidate, root, label = 'editorial_grid_candidate') {
  const errors = createSchemaValidator(root).validateFile(candidate, CANDIDATE_SCHEMA, label);
  if (errors.length) throw new DashboardError('editorial_grid_candidate_invalid', 'Calinium could not validate this Editorial Grid plan.', 422, { errors });
  return candidate;
}

function publicCandidate(candidate) {
  // IDs are transport keys for safe edits only. The merchant UI deliberately
  // renders no runtime IDs, approval records, checksums, or Shopify settings.
  return clone(candidate || defaultCandidate(new Date(0).toISOString()));
}

function clientStories(stories, current) {
  assert(Array.isArray(stories), 'editorial_grid_candidate_invalid', 'Provide an ordered list of Editorial Grid stories.', 422);
  assert(stories.length <= MAX_STORIES, 'editorial_grid_story_limit', `Editorial Grid supports at most ${MAX_STORIES} stories.`, 422);
  const prior = new Map((current.stories || []).map((story) => [story.content_id, story]));
  const seen = new Set();
  return stories.map((input, index) => {
    assert(input && typeof input === 'object' && !Array.isArray(input), 'editorial_grid_story_invalid', 'Each Editorial Grid story must be a simple approved-content entry.', 422);
    const requested = typeof input.content_id === 'string' ? input.content_id : null;
    if (requested) assert(prior.has(requested), 'editorial_grid_story_identity_invalid', 'A story identity must belong to this saved Editorial Grid candidate.', 409);
    const existing = requested ? prior.get(requested) : null;
    const contentId = existing?.content_id || createId('abpc');
    assert(!seen.has(contentId), 'editorial_grid_story_identity_duplicate', 'Each Editorial Grid story may appear only once.', 422);
    seen.add(contentId);
    const destination = input.destination && typeof input.destination === 'object' ? input.destination : {};
    const destinationType = String(destination.type || '').trim();
    assert(!destinationType || destinationType === 'shopify_collection', 'editorial_grid_destination_unsupported', 'This first Editorial Grid workflow supports approved Shopify collections only.', 422);
    return {
      content_id: contentId,
      placement_id: existing?.placement_id || createId('abpl'),
      title: tidy(input.title, 240),
      eyebrow: tidy(input.eyebrow, 120),
      excerpt: tidy(input.excerpt, 1200),
      destination: { type: destinationType || 'shopify_collection', resource_id: tidy(destination.resource_id, 240) },
      image_asset_id: input.image_asset_id ? tidy(input.image_asset_id, 240) : null,
      image_alt_text: input.image_alt_text ? tidy(input.image_alt_text, 500) : null,
      order: index + 1
    };
  });
}

function candidateWarnings(stories) {
  const warnings = [];
  const destinations = new Set();
  for (const story of stories) {
    if (!story.title) warnings.push(`${story.content_id}:title_required`);
    if (!story.destination.resource_id) warnings.push(`${story.content_id}:destination_required`);
    if (story.destination.resource_id) {
      if (destinations.has(story.destination.resource_id)) warnings.push(`${story.content_id}:duplicate_destination`);
      destinations.add(story.destination.resource_id);
    }
    if (story.image_asset_id && !story.image_alt_text) warnings.push(`${story.content_id}:image_alt_text_required`);
  }
  return warnings.sort();
}

function saveCandidate({ current, expectedVersion, stories, root, at }) {
  assert(Number.isInteger(expectedVersion), 'editorial_grid_candidate_version_required', 'Reload this Editorial Grid plan before saving your changes.', 409);
  assert(expectedVersion === current.candidate_version, 'editorial_grid_candidate_stale', 'This Editorial Grid plan changed elsewhere. Reload it before saving.', 409);
  const nextStories = clientStories(stories, current);
  const next = {
    ...current,
    status: 'draft',
    candidate_version: current.candidate_version + 1,
    stories: nextStories,
    warnings: candidateWarnings(nextStories),
    updated_at: at
  };
  validateCandidate(next, root);
  return next;
}

async function resolveCandidateResources({ candidate, project, shopifyService, store }) {
  const destinations = new Map();
  const images = new Map();
  const destinationIds = new Set();
  for (const story of candidate.stories) {
    assert(story.title, 'editorial_grid_story_title_required', 'Each Editorial Grid story needs a merchant-approved visible title.', 422);
    assert(story.destination?.type === 'shopify_collection' && story.destination.resource_id, 'editorial_grid_story_destination_required', 'Each Editorial Grid story needs an approved collection destination.', 422);
    assert(!destinationIds.has(story.destination.resource_id), 'editorial_grid_story_destination_duplicate', 'Each Editorial Grid story must point to a different approved destination.', 422);
    destinationIds.add(story.destination.resource_id);
    const selected = await shopifyService.resolveApprovedResource({
      projectId: project.id,
      organizationId: project.organization_id,
      resourceId: story.destination.resource_id,
      allowedTypes: ['collection']
    });
    assert(selected.resource.handle, 'editorial_grid_collection_binding_missing', 'The approved collection needs a current Shopify handle before it can be used in Editorial Grid.', 409);
    destinations.set(story.destination.resource_id, selected.resource);
    if (story.image_asset_id) {
      assert(story.image_alt_text, 'editorial_grid_image_alt_required', 'Add accessible image text before approving this story image.', 422);
      const asset = await store.findAssetForProject(story.image_asset_id, project.id, project.organization_id);
      assert(asset?.upload_status === 'ready' && asset.mime_type?.startsWith('image/'), 'editorial_grid_image_unavailable', 'Choose a current project image for this story.', 409);
      images.set(story.image_asset_id, asset);
    }
  }
  return { destinations, images };
}

function resourceReference({ resourceId, resourceType, sourceType, sourceReference, approvedRevision, approvalId, checksumSha256 = null }) {
  return {
    resource_id: resourceId,
    resource_type: resourceType,
    source_type: sourceType,
    source_reference: sourceReference,
    approved_revision: approvedRevision,
    approval_id: approvalId,
    checksum_sha256: checksumSha256
  };
}

function nativeVisibility() { return { mode: 'always', conditions: [] }; }
function supportingIntent() { return { emphasis: 'supporting', media_priority: 'supporting', density: 'balanced' }; }

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

function pruneUnusedReferences(plan, snapshot) {
  const referencedResources = new Set(Object.values(plan.content_entities || {}).flatMap((entity) => entity.resource_reference_ids || []));
  const referencedEvidence = new Set(Object.values(plan.content_entities || {}).flatMap((entity) => entity.evidence_reference_ids || []));
  for (const resourceId of Object.keys(plan.resource_references || {})) {
    if (!referencedResources.has(resourceId)) {
      delete plan.resource_references[resourceId];
      delete snapshot.resources[resourceId];
    }
  }
  for (const evidenceId of Object.keys(plan.evidence_references || {})) {
    if (!referencedEvidence.has(evidenceId)) delete plan.evidence_references[evidenceId];
  }
}

function buildApprovedRecords({ candidate, project, userId, resources, at, root, existingPlanRevision = null, existingResourceSnapshot = null }) {
  const revisionId = createId('abpr');
  const approvalId = createId('aba');
  const approvalRevisionId = createId('abar');
  const snapshotId = createId('abps');
  const snapshotRevisionId = createId('abpsr');
  const approvalReference = `editorial-grid-plan:${existingPlanRevision?.plan_id || candidate.plan_id}:${revisionId}`;
  const approval = { approval_id: approvalId, approval_reference: approvalReference, approval_revision_id: approvalRevisionId, approved_at: at };
  const base = existingPlanRevision
    ? rebindApproval(existingPlanRevision.plan, existingResourceSnapshot, { revisionId, approval, at, snapshotId, snapshotRevisionId })
    : {
      plan: {
        schema_version: '1.0', plan_id: candidate.plan_id, revision_id: revisionId, parent_revision_id: candidate.parent_revision_id,
        created_at: at,
        store_scope: { organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id) },
        approval: { approval_id: approvalId, approval_reference: approvalReference, approval_status: 'approved', approver_type: 'merchant', approved_at: at },
        default_locale: 'en', content_entities: {}, resource_references: {}, evidence_references: {}, compositions: [],
        metadata: { immutable: true, source: 'merchant_approved', migration: { status: 'native', source_revision_id: null, migration_version: null } }
      },
      snapshot: { version: 1, snapshot_id: snapshotId, revision_id: snapshotRevisionId, plan_id: candidate.plan_id, plan_revision_id: revisionId, organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id), approval, source_revision: '', snapshot_checksum: '', resources: {}, created_at: at }
    };
  const plan = base.plan;
  const snapshot = base.snapshot;
  const priorEditorialGrid = (plan.compositions || []).find((composition) => composition.page_role === 'homepage' && composition.section_role === 'editorial_discovery_grid');
  if (priorEditorialGrid) {
    const priorContentIds = new Set(priorEditorialGrid.block_placements.map((placement) => placement.content_entity_id));
    plan.compositions = plan.compositions.filter((composition) => composition !== priorEditorialGrid);
    for (const contentId of priorContentIds) delete plan.content_entities[contentId];
    pruneUnusedReferences(plan, snapshot);
  }
  const evidenceId = createId('abpe');
  const placements = [];
  const resourceBySource = new Map();

  function bindCollection(source) {
    const key = `collection:${source.id}`;
    if (resourceBySource.has(key)) return resourceBySource.get(key);
    const id = createId('abprs');
    plan.resource_references[id] = resourceReference({ resourceId: id, resourceType: 'shopify_collection', sourceType: 'shopify', sourceReference: source.id, approvedRevision: source.source_revision, approvalId });
    snapshot.resources[id] = {
      resource_type: 'shopify_collection', approved_revision: source.source_revision,
      // Shopify collection settings use the approved collection handle; no title,
      // URL, or generated resource identifier is derived in this boundary.
      runtime_value: source.handle, source_reference: source.id, approval_eligible: true, availability_at_snapshot: 'available'
    };
    resourceBySource.set(key, id);
    return id;
  }
  function bindImage(asset) {
    const key = `image:${asset.id}`;
    if (resourceBySource.has(key)) return resourceBySource.get(key);
    const id = createId('abprs');
    plan.resource_references[id] = resourceReference({ resourceId: id, resourceType: 'project_image', sourceType: 'project_asset', sourceReference: asset.id, approvedRevision: asset.checksum_sha256, approvalId, checksumSha256: asset.checksum_sha256 });
    snapshot.resources[id] = {
      resource_type: 'project_image', approved_revision: asset.checksum_sha256,
      // The existing read-only generator carries project assets through a
      // project-scoped opaque reference. It never turns an uploaded file into
      // an inferred Shopify URL.
      runtime_value: `dashboard://projects/${project.id}/assets/${asset.id}`,
      source_reference: asset.id, approval_eligible: true, availability_at_snapshot: 'available'
    };
    resourceBySource.set(key, id);
    return id;
  }

  for (const story of candidate.stories) {
    const collection = resources.destinations.get(story.destination.resource_id);
    const ids = [bindCollection(collection)];
    const image = story.image_asset_id ? resources.images.get(story.image_asset_id) : null;
    if (image) ids.push(bindImage(image));
    const localizedValues = [{ locale: 'en', field: 'title', value: story.title, value_type: 'merchant_approved_text', approval_id: approvalId }];
    if (story.eyebrow) localizedValues.push({ locale: 'en', field: 'eyebrow', value: story.eyebrow, value_type: 'merchant_approved_text', approval_id: approvalId });
    if (story.excerpt) localizedValues.push({ locale: 'en', field: 'summary', value: story.excerpt, value_type: 'merchant_approved_text', approval_id: approvalId });
    plan.content_entities[story.content_id] = {
      content_id: story.content_id,
      content_type: 'editorial_story',
      localized_values: localizedValues,
      resource_reference_ids: ids,
      evidence_reference_ids: [evidenceId],
      provenance: { source_type: 'merchant_approved', approval_id: approvalId, evidence_reference_ids: [evidenceId] },
      ...(image ? { accessibility: { decorative_media: false, localized: [{ locale: 'en', alt_text: story.image_alt_text, accessible_label: story.title }], transcript_resource_id: null } } : {})
    };
    placements.push({ placement_id: story.placement_id, content_entity_id: story.content_id, semantic_block_role: 'editorial_story', order: story.order, visibility: nativeVisibility(), presentation_intent: supportingIntent() });
  }

  plan.evidence_references[evidenceId] = { evidence_id: evidenceId, evidence_type: 'merchant_confirmed_fact', source_type: 'merchant_record', source_reference: `creative-director:${plan.plan_id}:${candidate.candidate_version}`, approved_revision: digest(`${plan.plan_id}|${candidate.candidate_version}|${userId}|${at}`), approval_id: approvalId };
  const compositionOrder = priorEditorialGrid?.order || Math.max(0, ...(plan.compositions || []).filter((composition) => composition.page_role === 'homepage').map((composition) => composition.order || 0)) + 1;
  plan.compositions.push({ composition_id: createId('abpcp'), page_role: 'homepage', section_role: 'editorial_discovery_grid', order: compositionOrder, visibility: nativeVisibility(), presentation_intent: supportingIntent(), block_placements: placements });
  snapshot.plan_id = plan.plan_id;
  snapshot.plan_revision_id = plan.revision_id;
  snapshot.source_revision = checksum(Object.fromEntries(Object.entries(snapshot.resources).sort(([left], [right]) => left.localeCompare(right))));
  snapshot.snapshot_checksum = expectedSnapshotChecksum(snapshot);
  const errors = validatePlan(plan, 'approved_editorial_grid_plan', createSchemaValidator(root));
  if (errors.length) throw new DashboardError('editorial_grid_approved_plan_invalid', 'Calinium could not create a valid approved Editorial Grid revision.', 500, { errors });
  const planRevision = {
    version: 1, plan_id: plan.plan_id, revision_id: plan.revision_id, schema_version: plan.schema_version, parent_revision_id: plan.parent_revision_id,
    organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id), approval, approved_at: at,
    plan_checksum: checksum(plan), resource_snapshot_id: snapshotId, resource_snapshot_revision_id: snapshotRevisionId, plan, created_at: at
  };
  const resourceSnapshot = snapshot;
  assert(planRevision.plan_checksum === expectedPlanChecksum(planRevision), 'editorial_grid_checksum_invalid', 'Calinium could not secure the approved Editorial Grid revision.', 500);
  return { planRevision, resourceSnapshot };
}

module.exports = { CANDIDATE_SCHEMA, MAX_STORIES, contentPlanRequired, defaultCandidate, candidateForStrategy, validateCandidate, publicCandidate, saveCandidate, candidateWarnings, resolveCandidateResources, buildApprovedRecords, merchantScopeId };
