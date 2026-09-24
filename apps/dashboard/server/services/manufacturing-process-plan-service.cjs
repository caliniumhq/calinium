'use strict';

const crypto = require('crypto');
const { createId } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { createSchemaValidator } = require('../../../../ai/compiler/schema-validator');
const { validatePlan } = require('../../../../scripts/validate-approved-block-plan');
const { checksum, expectedPlanChecksum, expectedSnapshotChecksum } = require('../../../../pipeline/resolve-approved-block-plan-transport');
const { homepageSections } = require('../../../../pipeline/strategy-section-policy');
const { merchantScopeId } = require('./editorial-grid-plan-service.cjs');

const CANDIDATE_SCHEMA = 'schemas/calinium-manufacturing-process-candidate.schema.json';
const MIN_STEPS = 2;
const MAX_STEPS = 10;
const ICONS = new Set(['none', 'settings', 'factory', 'check', 'package']);
const STEP_INPUT_FIELDS = new Set(['content_id', 'title', 'text', 'process_icon', 'image_asset_id', 'image_alt_text', 'decorative_media', 'evidence_note']);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function digest(value) { return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex'); }
function tidy(value, maximum) { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maximum); }
function manufacturingProcessPlanRequired(storeStrategy) { return homepageSections(storeStrategy).some((section) => section.section_id === 'manufacturing-process'); }
function nativeVisibility() { return { mode: 'always', conditions: [] }; }
function supportingIntent(mediaPriority = 'supporting') { return { emphasis: 'supporting', media_priority: mediaPriority, density: 'balanced' }; }

function defaultCandidate(at) {
  return { version: 1, status: 'not_required', candidate_version: 0, steps: [], warnings: [], updated_at: at };
}

function candidateForStrategy(contentPlan, storeStrategy, at) {
  const current = contentPlan && typeof contentPlan === 'object' ? clone(contentPlan) : {};
  const candidate = current.manufacturing_process && typeof current.manufacturing_process === 'object' ? current.manufacturing_process : defaultCandidate(at);
  if (!manufacturingProcessPlanRequired(storeStrategy)) return { ...current, manufacturing_process: { ...defaultCandidate(at), updated_at: candidate.updated_at || at } };
  const next = candidate.status === 'not_required'
    ? { ...defaultCandidate(at), status: 'draft', candidate_version: 1, updated_at: at }
    : candidate;
  return { ...current, plan_id: current.plan_id || createId('abp'), manufacturing_process: next };
}

function validateCandidate(candidate, root, label = 'manufacturing_process_candidate') {
  const errors = createSchemaValidator(root).validateFile(candidate, CANDIDATE_SCHEMA, label);
  if (errors.length) throw new DashboardError('manufacturing_process_candidate_invalid', 'Calinium could not validate this Manufacturing Process plan.', 422, { errors });
  return candidate;
}

function publicCandidate(candidate) { return clone(candidate || defaultCandidate(new Date(0).toISOString())); }

function clientSteps(steps, current) {
  assert(Array.isArray(steps), 'manufacturing_process_candidate_invalid', 'Provide an ordered list of Manufacturing Process stages.', 422);
  assert(steps.length <= MAX_STEPS, 'manufacturing_process_step_limit', `Manufacturing Process supports at most ${MAX_STEPS} stages.`, 422);
  const prior = new Map((current.steps || []).map((step) => [step.content_id, step]));
  const seen = new Set();
  return steps.map((input, index) => {
    assert(input && typeof input === 'object' && !Array.isArray(input), 'manufacturing_process_step_invalid', 'Each Manufacturing Process stage must be a simple approved-evidence entry.', 422);
    for (const key of Object.keys(input)) assert(STEP_INPUT_FIELDS.has(key), 'manufacturing_process_step_field_unsupported', 'Manufacturing Process stages cannot include unsupported media, runtime, or approval fields.', 422);
    const requested = typeof input.content_id === 'string' ? input.content_id : null;
    if (requested) assert(prior.has(requested), 'manufacturing_process_step_identity_invalid', 'A Manufacturing Process stage identity must belong to this saved candidate.', 409);
    const existing = requested ? prior.get(requested) : null;
    const contentId = existing?.content_id || createId('abpc');
    assert(!seen.has(contentId), 'manufacturing_process_step_identity_duplicate', 'Each Manufacturing Process stage may appear only once.', 422);
    seen.add(contentId);
    const icon = String(input.process_icon || 'none').trim();
    assert(ICONS.has(icon), 'manufacturing_process_icon_unsupported', 'Choose one of the supported Manufacturing Process icons.', 422);
    return {
      content_id: contentId,
      placement_id: existing?.placement_id || createId('abpl'),
      title: tidy(input.title, 240),
      text: tidy(input.text, 1200),
      process_icon: icon,
      image_asset_id: input.image_asset_id ? tidy(input.image_asset_id, 240) : null,
      image_alt_text: input.image_alt_text ? tidy(input.image_alt_text, 500) : null,
      decorative_media: Boolean(input.decorative_media),
      evidence_note: tidy(input.evidence_note, 1200),
      order: index + 1
    };
  });
}

function candidateWarnings(steps) {
  const warnings = [];
  const titles = new Set();
  if (steps.length > 0 && steps.length < MIN_STEPS) warnings.push('minimum_ordered_stages_required');
  for (const step of steps) {
    if (!step.title) warnings.push(`${step.content_id}:title_required`);
    if (!step.evidence_note) warnings.push(`${step.content_id}:evidence_required`);
    if (!Number.isInteger(step.order) || step.order < 1) warnings.push(`${step.content_id}:order_required`);
    if (step.image_asset_id && !step.decorative_media && !step.image_alt_text) warnings.push(`${step.content_id}:image_alt_text_required`);
    if (step.title) {
      const key = step.title.toLocaleLowerCase('en');
      if (titles.has(key)) warnings.push(`${step.content_id}:duplicate_semantic_item`);
      titles.add(key);
    }
  }
  return warnings.sort();
}

function saveCandidate({ current, expectedVersion, steps, root, at }) {
  assert(Number.isInteger(expectedVersion), 'manufacturing_process_candidate_version_required', 'Reload this Manufacturing Process plan before saving your changes.', 409);
  assert(expectedVersion === current.candidate_version, 'manufacturing_process_candidate_stale', 'This Manufacturing Process plan changed elsewhere. Reload it before saving.', 409);
  const nextSteps = clientSteps(steps, current);
  const next = { ...current, status: 'draft', candidate_version: current.candidate_version + 1, steps: nextSteps, warnings: candidateWarnings(nextSteps), updated_at: at };
  validateCandidate(next, root);
  return next;
}

async function resolveCandidateResources({ candidate, project, store }) {
  assert(candidate.steps.length >= MIN_STEPS, 'manufacturing_process_stage_minimum', 'Add at least two merchant-confirmed ordered stages before approving Manufacturing Process.', 422);
  const images = new Map();
  const titles = new Set();
  const orders = new Set();
  for (let index = 0; index < candidate.steps.length; index += 1) {
    const step = candidate.steps[index];
    assert(step.title, 'manufacturing_process_stage_title_required', 'Each Manufacturing Process stage needs a merchant-approved visible title.', 422);
    assert(step.evidence_note, 'manufacturing_process_evidence_required', 'Each Manufacturing Process stage needs a merchant-approved evidence record before approval.', 422);
    assert(Number.isInteger(step.order) && step.order === index + 1 && !orders.has(step.order), 'manufacturing_process_stage_order_invalid', 'Keep every Manufacturing Process stage in one explicit, unique approved order.', 422);
    orders.add(step.order);
    const key = step.title.toLocaleLowerCase('en');
    assert(!titles.has(key), 'manufacturing_process_stage_duplicate', 'Each Manufacturing Process stage needs a distinct approved stage title.', 422);
    titles.add(key);
    if (step.image_asset_id) {
      assert(step.decorative_media || step.image_alt_text, 'manufacturing_process_image_alt_required', 'Add accessible image text or mark the approved image decorative before approval.', 422);
      const asset = await store.findAssetForProject(step.image_asset_id, project.id, project.organization_id);
      assert(asset?.upload_status === 'ready' && asset.mime_type?.startsWith('image/'), 'manufacturing_process_image_unavailable', 'Choose a current approved project image for this Manufacturing Process stage.', 409);
      images.set(step.image_asset_id, asset);
    }
  }
  return { images };
}

function resourceReference({ resourceId, sourceReference, approvedRevision, approvalId, checksumSha256 = null }) {
  return { resource_id: resourceId, resource_type: 'project_image', source_type: 'project_asset', source_reference: sourceReference, approved_revision: approvedRevision, approval_id: approvalId, reference_role: 'supporting_media', checksum_sha256: checksumSha256 };
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

function pruneUnusedReferences(plan, snapshot) {
  const resources = new Set(Object.values(plan.content_entities || {}).flatMap((entity) => entity.resource_reference_ids || []));
  const evidence = new Set(Object.values(plan.content_entities || {}).flatMap((entity) => entity.evidence_reference_ids || []));
  for (const resourceId of Object.keys(plan.resource_references || {})) if (!resources.has(resourceId)) { delete plan.resource_references[resourceId]; delete snapshot.resources[resourceId]; }
  for (const evidenceId of Object.keys(plan.evidence_references || {})) if (!evidence.has(evidenceId)) delete plan.evidence_references[evidenceId];
}

function buildApprovedRecords({ candidate, project, userId, resources, at, root, existingPlanRevision = null, existingResourceSnapshot = null, planId = null }) {
  const revisionId = createId('abpr');
  const approvalId = createId('aba');
  const approval = { approval_id: approvalId, approval_reference: `manufacturing-process-plan:${planId || existingPlanRevision?.plan_id || createId('abp')}:${revisionId}`, approval_revision_id: createId('abar'), approved_at: at };
  const snapshotId = createId('abps');
  const snapshotRevisionId = createId('abpsr');
  const base = existingPlanRevision
    ? rebindApproval(existingPlanRevision.plan, existingResourceSnapshot, { revisionId, approval, at, snapshotId, snapshotRevisionId })
    : {
      plan: { schema_version: '1.0', plan_id: planId || createId('abp'), revision_id: revisionId, parent_revision_id: null, created_at: at, store_scope: { organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id) }, approval: { approval_id: approvalId, approval_reference: approval.approval_reference, approval_status: 'approved', approver_type: 'merchant', approved_at: at }, default_locale: 'en', content_entities: {}, resource_references: {}, evidence_references: {}, compositions: [], metadata: { immutable: true, source: 'merchant_approved', migration: { status: 'native', source_revision_id: null, migration_version: null } } },
      snapshot: { version: 1, snapshot_id: snapshotId, revision_id: snapshotRevisionId, plan_id: planId || createId('abp'), plan_revision_id: revisionId, organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id), approval, source_revision: '', snapshot_checksum: '', resources: {}, created_at: at }
    };
  const plan = base.plan;
  const snapshot = base.snapshot;
  if (!existingPlanRevision) snapshot.plan_id = plan.plan_id;
  const prior = plan.compositions.find((composition) => composition.page_role === 'homepage' && composition.section_role === 'manufacturing_process');
  if (prior) {
    const contentIds = new Set(prior.block_placements.map((placement) => placement.content_entity_id));
    plan.compositions = plan.compositions.filter((composition) => composition !== prior);
    for (const contentId of contentIds) delete plan.content_entities[contentId];
    pruneUnusedReferences(plan, snapshot);
  }
  const resourceByAsset = new Map();
  function bindImage(asset) {
    if (resourceByAsset.has(asset.id)) return resourceByAsset.get(asset.id);
    const resourceId = createId('abprs');
    plan.resource_references[resourceId] = resourceReference({ resourceId, sourceReference: asset.id, approvedRevision: asset.checksum_sha256, approvalId, checksumSha256: asset.checksum_sha256 });
    snapshot.resources[resourceId] = { resource_type: 'project_image', approved_revision: asset.checksum_sha256, runtime_value: `dashboard://projects/${project.id}/assets/${asset.id}`, source_reference: asset.id, approval_eligible: true, availability_at_snapshot: 'available' };
    resourceByAsset.set(asset.id, resourceId);
    return resourceId;
  }
  const placements = [];
  for (const step of candidate.steps) {
    const evidenceId = createId('abpe');
    const resourceIds = step.image_asset_id ? [bindImage(resources.images.get(step.image_asset_id))] : [];
    const values = [
      { locale: 'en', field: 'title', value: step.title, value_type: 'merchant_approved_text', approval_id: approvalId },
      { locale: 'en', field: 'icon', value: step.process_icon, value_type: 'merchant_approved_text', approval_id: approvalId }
    ];
    if (step.text) values.push({ locale: 'en', field: 'text', value: step.text, value_type: 'merchant_approved_text', approval_id: approvalId });
    plan.evidence_references[evidenceId] = { evidence_id: evidenceId, evidence_type: 'merchant_confirmed_fact', source_type: 'merchant_record', source_reference: `creative-director:${plan.plan_id}:manufacturing-process:${step.content_id}`, approved_revision: digest(`${plan.plan_id}|manufacturing-process|${step.content_id}|${step.evidence_note}|${userId}|${at}`), approval_id: approvalId };
    plan.content_entities[step.content_id] = {
      content_id: step.content_id, content_type: 'manufacturing_process_stage', localized_values: values, resource_reference_ids: resourceIds, evidence_reference_ids: [evidenceId],
      provenance: { source_type: 'evidence_backed', approval_id: approvalId, evidence_reference_ids: [evidenceId] },
      ...(step.image_asset_id ? { accessibility: { decorative_media: step.decorative_media, localized: [{ locale: 'en', alt_text: step.decorative_media ? null : step.image_alt_text, accessible_label: step.title }], transcript_resource_id: null } } : {})
    };
    placements.push({ placement_id: step.placement_id, content_entity_id: step.content_id, semantic_block_role: 'manufacturing_process_step', order: step.order, visibility: nativeVisibility(), presentation_intent: supportingIntent(step.image_asset_id ? 'supporting' : 'none') });
  }
  const order = prior?.order || Math.max(0, ...(plan.compositions || []).filter((composition) => composition.page_role === 'homepage').map((composition) => composition.order || 0)) + 1;
  plan.compositions.push({ composition_id: createId('abpcp'), page_role: 'homepage', section_role: 'manufacturing_process', order, visibility: nativeVisibility(), presentation_intent: supportingIntent(), block_placements: placements });
  snapshot.plan_id = plan.plan_id;
  snapshot.plan_revision_id = plan.revision_id;
  snapshot.source_revision = checksum(Object.fromEntries(Object.entries(snapshot.resources).sort(([left], [right]) => left.localeCompare(right))));
  snapshot.snapshot_checksum = expectedSnapshotChecksum(snapshot);
  const errors = validatePlan(plan, 'approved_manufacturing_process_plan', createSchemaValidator(root));
  if (errors.length) throw new DashboardError('manufacturing_process_approved_plan_invalid', 'Calinium could not create a valid approved Manufacturing Process revision.', 500, { errors });
  const planRevision = { version: 1, plan_id: plan.plan_id, revision_id: plan.revision_id, schema_version: plan.schema_version, parent_revision_id: plan.parent_revision_id, organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id), approval, approved_at: at, plan_checksum: checksum(plan), resource_snapshot_id: snapshot.snapshot_id, resource_snapshot_revision_id: snapshot.revision_id, plan, created_at: at };
  assert(planRevision.plan_checksum === expectedPlanChecksum(planRevision), 'manufacturing_process_checksum_invalid', 'Calinium could not secure the approved Manufacturing Process revision.', 500);
  return { planRevision, resourceSnapshot: snapshot };
}

module.exports = { CANDIDATE_SCHEMA, MIN_STEPS, MAX_STEPS, manufacturingProcessPlanRequired, defaultCandidate, candidateForStrategy, validateCandidate, publicCandidate, saveCandidate, candidateWarnings, resolveCandidateResources, buildApprovedRecords };
