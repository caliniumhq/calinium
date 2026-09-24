'use strict';

// Shared server-side implementation for the bounded evidence-plan adapters.
// Runtime names stay in the policy catalog; candidates and approved plans use
// only portable semantic identities and merchant-approved evidence.
const crypto = require('crypto');
const { createId } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { createSchemaValidator } = require('../../../../ai/compiler/schema-validator');
const { validatePlan } = require('../../../../scripts/validate-approved-block-plan');
const { checksum, expectedPlanChecksum, expectedSnapshotChecksum } = require('../../../../pipeline/resolve-approved-block-plan-transport');
const { homepageSections } = require('../../../../pipeline/strategy-section-policy');
const { merchantScopeId } = require('./editorial-grid-plan-service.cjs');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function digest(value) { return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex'); }
function tidy(value, maximum = 1200) { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maximum); }
function visibility() { return { mode: 'always', conditions: [] }; }
function intent(media = 'supporting') { return { emphasis: 'supporting', media_priority: media, density: 'balanced' }; }

function createEvidencePlanService(config) {
  const {
    key, schemaPath, runtimeSectionId, sectionRole, blockRole, contentType,
    itemKey, singular, plural, minimumItems = 1, maximumItems, requiredFields,
    inputFields, localizedFields, iconField = null, allowedIcons = [],
    evidenceType = 'merchant_confirmed_fact', minimumContentMessage
  } = config;
  const isRequired = (strategy) => homepageSections(strategy).some((section) => section.section_id === runtimeSectionId);
  const blankCandidate = (at) => ({ version: 1, status: 'not_required', candidate_version: 0, [itemKey]: [], warnings: [], updated_at: at });

  function candidateForStrategy(contentPlan, strategy, at) {
    const root = contentPlan && typeof contentPlan === 'object' ? clone(contentPlan) : {};
    const current = root[key] && typeof root[key] === 'object' ? root[key] : blankCandidate(at);
    if (!isRequired(strategy)) return { ...root, [key]: { ...blankCandidate(at), updated_at: current.updated_at || at } };
    const candidate = current.status === 'not_required' ? { ...blankCandidate(at), status: 'draft', candidate_version: 1, updated_at: at } : current;
    return { ...root, plan_id: root.plan_id || createId('abp'), [key]: candidate };
  }

  function validateCandidate(candidate, root, label = `${key}_candidate`) {
    const errors = createSchemaValidator(root).validateFile(candidate, schemaPath, label);
    if (errors.length) throw new DashboardError(`${key}_candidate_invalid`, `Calinium could not validate this ${singular} plan.`, 422, { errors });
    return candidate;
  }

  function publicCandidate(candidate) { return clone(candidate || blankCandidate(new Date(0).toISOString())); }

  function normalizeItems(items, current) {
    assert(Array.isArray(items), `${key}_candidate_invalid`, `Provide an ordered list of ${plural}.`, 422);
    assert(items.length <= maximumItems, `${key}_item_limit`, `${singular} supports at most ${maximumItems} entries.`, 422);
    const prior = new Map((current[itemKey] || []).map((item) => [item.content_id, item]));
    const seen = new Set();
    return items.map((input, index) => {
      assert(input && typeof input === 'object' && !Array.isArray(input), `${key}_item_invalid`, `Each ${singular} entry must be simple merchant-approved evidence.`, 422);
      for (const field of Object.keys(input)) assert(inputFields.has(field), `${key}_item_field_unsupported`, `${singular} entries cannot include runtime, approval, or unsupported fields.`, 422);
      const requested = typeof input.content_id === 'string' ? input.content_id : null;
      if (requested) assert(prior.has(requested), `${key}_identity_invalid`, `This ${singular} identity does not belong to the current candidate.`, 409);
      const existing = requested ? prior.get(requested) : null;
      const contentId = existing?.content_id || createId('abpc');
      assert(!seen.has(contentId), `${key}_identity_duplicate`, `Each ${singular} entry may appear once.`, 422);
      seen.add(contentId);
      const next = { content_id: contentId, placement_id: existing?.placement_id || createId('abpl'), image_asset_id: input.image_asset_id ? tidy(input.image_asset_id, 240) : null, image_alt_text: input.image_alt_text ? tidy(input.image_alt_text, 500) : null, decorative_media: Boolean(input.decorative_media), evidence_note: tidy(input.evidence_note), order: index + 1 };
      for (const field of localizedFields) next[field.input] = tidy(input[field.input], field.maximum || 1200);
      if (config.kindField) next[config.kindField] = tidy(input[config.kindField], 64);
      if (iconField) {
        const icon = tidy(input[iconField], 64) || 'none';
        assert(allowedIcons.includes(icon), `${key}_icon_unsupported`, `Choose a supported ${singular} icon.`, 422);
        if (config.allowedIconsByKind && input[config.kindField]) assert((config.allowedIconsByKind[input[config.kindField]] || []).includes(icon), `${key}_icon_unsupported`, `Choose an icon supported by this ${singular} entry.`, 422);
        next[iconField] = icon;
      }
      return next;
    });
  }

  function titleOf(item) { return tidy(item[config.identityField || 'title'], 240); }
  function warningsFor(items) {
    const warnings = [];
    const identities = new Set();
    if (items.length > 0 && items.length < minimumItems) warnings.push('minimum_items_required');
    for (const item of items) {
      for (const field of requiredFields) if (!tidy(item[field])) warnings.push(`${item.content_id}:${field}_required`);
      if (!item.evidence_note) warnings.push(`${item.content_id}:evidence_required`);
      if (!Number.isInteger(item.order) || item.order < 1) warnings.push(`${item.content_id}:order_required`);
      if (item.image_asset_id && !item.decorative_media && !item.image_alt_text) warnings.push(`${item.content_id}:image_alt_text_required`);
      const identity = titleOf(item).toLocaleLowerCase('en');
      if (identity) { if (identities.has(identity)) warnings.push(`${item.content_id}:duplicate_semantic_item`); identities.add(identity); }
    }
    return warnings.sort();
  }

  function saveCandidate({ current, expectedVersion, items, root, at }) {
    assert(Number.isInteger(expectedVersion), `${key}_candidate_version_required`, `Reload this ${singular} plan before saving.`, 409);
    assert(expectedVersion === current.candidate_version, `${key}_candidate_stale`, `This ${singular} plan changed elsewhere. Reload it before saving.`, 409);
    const nextItems = normalizeItems(items, current);
    const next = { ...current, status: 'draft', candidate_version: current.candidate_version + 1, [itemKey]: nextItems, warnings: warningsFor(nextItems), updated_at: at };
    validateCandidate(next, root);
    return next;
  }

  async function resolveCandidateResources({ candidate, project, store }) {
    const items = candidate[itemKey] || [];
    assert(items.length >= minimumItems, `${key}_minimum_items`, minimumContentMessage || `Add at least ${minimumItems} merchant-confirmed ${plural} before approval.`, 422);
    const images = new Map(); const identities = new Set(); const orders = new Set();
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      for (const field of requiredFields) assert(tidy(item[field]), `${key}_${field}_required`, `Each ${singular} entry needs an approved ${field.replaceAll('_', ' ')}.`, 422);
      if (config.allowedKinds) assert(config.allowedKinds.includes(item[config.kindField]), `${key}_kind_unsupported`, `Choose a supported ${singular} kind.`, 422);
      assert(item.evidence_note, `${key}_evidence_required`, `Each ${singular} entry needs a merchant-approved evidence record.`, 422);
      assert(Number.isInteger(item.order) && item.order === index + 1 && !orders.has(item.order), `${key}_order_invalid`, `Keep every ${singular} entry in one explicit, unique approved order.`, 422);
      orders.add(item.order);
      const identity = titleOf(item).toLocaleLowerCase('en');
      assert(!identities.has(identity), `${key}_duplicate`, `Each ${singular} entry needs a distinct approved visible identity.`, 422); identities.add(identity);
      if (item.image_asset_id) {
        assert(item.decorative_media || item.image_alt_text, `${key}_image_alt_required`, 'Add accessible image text or mark the approved image decorative before approval.', 422);
        const asset = await store.findAssetForProject(item.image_asset_id, project.id, project.organization_id);
        assert(asset?.upload_status === 'ready' && asset.mime_type?.startsWith('image/'), `${key}_image_unavailable`, `Choose a current approved project image for this ${singular} entry.`, 409);
        images.set(item.image_asset_id, asset);
      }
    }
    return { images };
  }

  function rebindApproval(plan, snapshot, { revisionId, approval, at, snapshotId, snapshotRevisionId }) {
    const reboundPlan = clone(plan); reboundPlan.revision_id = revisionId; reboundPlan.parent_revision_id = plan.revision_id; reboundPlan.created_at = at;
    reboundPlan.approval = { approval_id: approval.approval_id, approval_reference: approval.approval_reference, approval_status: 'approved', approver_type: 'merchant', approved_at: at };
    for (const entity of Object.values(reboundPlan.content_entities || {})) { for (const value of entity.localized_values || []) value.approval_id = approval.approval_id; if (entity.provenance) entity.provenance.approval_id = approval.approval_id; }
    for (const resource of Object.values(reboundPlan.resource_references || {})) resource.approval_id = approval.approval_id;
    for (const evidence of Object.values(reboundPlan.evidence_references || {})) evidence.approval_id = approval.approval_id;
    const reboundSnapshot = clone(snapshot); reboundSnapshot.snapshot_id = snapshotId; reboundSnapshot.revision_id = snapshotRevisionId; reboundSnapshot.plan_revision_id = revisionId; reboundSnapshot.approval = approval; reboundSnapshot.created_at = at;
    return { plan: reboundPlan, snapshot: reboundSnapshot };
  }
  function prune(plan, snapshot) {
    const resources = new Set(Object.values(plan.content_entities || {}).flatMap((entity) => entity.resource_reference_ids || []));
    const evidence = new Set(Object.values(plan.content_entities || {}).flatMap((entity) => entity.evidence_reference_ids || []));
    for (const id of Object.keys(plan.resource_references || {})) if (!resources.has(id)) { delete plan.resource_references[id]; delete snapshot.resources[id]; }
    for (const id of Object.keys(plan.evidence_references || {})) if (!evidence.has(id)) delete plan.evidence_references[id];
  }
  function newBase({ project, planId, revisionId, approvalId, approvalReference, at, snapshotId, snapshotRevisionId }) {
    const id = planId || createId('abp');
    const approval = { approval_id: approvalId, approval_reference: approvalReference, approval_status: 'approved', approver_type: 'merchant', approved_at: at };
    return { plan: { schema_version: '1.0', plan_id: id, revision_id: revisionId, parent_revision_id: null, created_at: at, store_scope: { organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id) }, approval, default_locale: 'en', content_entities: {}, resource_references: {}, evidence_references: {}, compositions: [], metadata: { immutable: true, source: 'merchant_approved', migration: { status: 'native', source_revision_id: null, migration_version: null } } }, snapshot: { version: 1, snapshot_id: snapshotId, revision_id: snapshotRevisionId, plan_id: id, plan_revision_id: revisionId, organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id), approval: { approval_id: approvalId, approval_reference: approvalReference, approval_revision_id: createId('abar'), approved_at: at }, source_revision: '', snapshot_checksum: '', resources: {}, created_at: at } };
  }
  function buildApprovedRecords({ candidate, project, userId, resources, at, root, existingPlanRevision = null, existingResourceSnapshot = null, planId = null }) {
    const revisionId = createId('abpr'); const approvalId = createId('aba'); const snapshotId = createId('abps'); const snapshotRevisionId = createId('abpsr');
    const usePlanId = planId || existingPlanRevision?.plan_id || createId('abp');
    const approval = { approval_id: approvalId, approval_reference: `${key}-plan:${usePlanId}:${revisionId}`, approval_revision_id: createId('abar'), approved_at: at };
    const base = existingPlanRevision ? rebindApproval(existingPlanRevision.plan, existingResourceSnapshot, { revisionId, approval, at, snapshotId, snapshotRevisionId }) : newBase({ project, planId: usePlanId, revisionId, approvalId, approvalReference: approval.approval_reference, at, snapshotId, snapshotRevisionId });
    const { plan, snapshot } = base; snapshot.plan_id = plan.plan_id;
    const prior = plan.compositions.find((composition) => composition.page_role === 'homepage' && composition.section_role === sectionRole);
    if (prior) { const ids = new Set(prior.block_placements.map((placement) => placement.content_entity_id)); plan.compositions = plan.compositions.filter((composition) => composition !== prior); for (const id of ids) delete plan.content_entities[id]; prune(plan, snapshot); }
    const resourceByAsset = new Map();
    function bindImage(asset) {
      if (resourceByAsset.has(asset.id)) return resourceByAsset.get(asset.id);
      const resourceId = createId('abprs');
      plan.resource_references[resourceId] = { resource_id: resourceId, resource_type: 'project_image', source_type: 'project_asset', source_reference: asset.id, approved_revision: asset.checksum_sha256, approval_id: approvalId, reference_role: 'supporting_media', checksum_sha256: asset.checksum_sha256 };
      snapshot.resources[resourceId] = { resource_type: 'project_image', approved_revision: asset.checksum_sha256, runtime_value: `dashboard://projects/${project.id}/assets/${asset.id}`, source_reference: asset.id, approval_eligible: true, availability_at_snapshot: 'available' };
      resourceByAsset.set(asset.id, resourceId); return resourceId;
    }
    const placements = [];
    for (const item of candidate[itemKey]) {
      const evidenceId = createId('abpe'); const resourceIds = item.image_asset_id ? [bindImage(resources.images.get(item.image_asset_id))] : [];
      const values = [];
      for (const field of localizedFields) if (item[field.input]) values.push({ locale: 'en', field: field.semantic, value: item[field.input], value_type: 'merchant_approved_text', approval_id: approvalId });
      if (iconField && item[iconField] && item[iconField] !== 'none') values.push({ locale: 'en', field: 'icon', value: item[iconField], value_type: 'merchant_approved_text', approval_id: approvalId });
      if (config.kindField && item[config.kindField]) values.push({ locale: 'en', field: 'kind', value: item[config.kindField], value_type: 'merchant_approved_text', approval_id: approvalId });
      plan.evidence_references[evidenceId] = { evidence_id: evidenceId, evidence_type: evidenceType, source_type: 'merchant_record', source_reference: `creative-director:${plan.plan_id}:${key}:${item.content_id}`, approved_revision: digest(`${plan.plan_id}|${key}|${item.content_id}|${item.evidence_note}|${userId}|${at}`), approval_id: approvalId };
      plan.content_entities[item.content_id] = { content_id: item.content_id, content_type: contentType, localized_values: values, resource_reference_ids: resourceIds, evidence_reference_ids: [evidenceId], provenance: { source_type: 'evidence_backed', approval_id: approvalId, evidence_reference_ids: [evidenceId] }, ...(item.image_asset_id ? { accessibility: { decorative_media: item.decorative_media, localized: [{ locale: 'en', alt_text: item.decorative_media ? null : item.image_alt_text, accessible_label: titleOf(item) }], transcript_resource_id: null } } : {}) };
      placements.push({ placement_id: item.placement_id, content_entity_id: item.content_id, semantic_block_role: blockRole, order: item.order, visibility: visibility(), presentation_intent: intent(item.image_asset_id ? 'supporting' : 'none') });
    }
    const order = prior?.order || Math.max(0, ...(plan.compositions || []).filter((composition) => composition.page_role === 'homepage').map((composition) => composition.order || 0)) + 1;
    plan.compositions.push({ composition_id: createId('abpcp'), page_role: 'homepage', section_role: sectionRole, order, visibility: visibility(), presentation_intent: intent(), block_placements: placements });
    snapshot.plan_revision_id = plan.revision_id; snapshot.source_revision = checksum(Object.fromEntries(Object.entries(snapshot.resources).sort(([a], [b]) => a.localeCompare(b)))); snapshot.snapshot_checksum = expectedSnapshotChecksum(snapshot);
    const errors = validatePlan(plan, `approved_${key}_plan`, createSchemaValidator(root));
    if (errors.length) throw new DashboardError(`${key}_approved_plan_invalid`, `Calinium could not create a valid approved ${singular} revision.`, 500, { errors });
    const planRevision = { version: 1, plan_id: plan.plan_id, revision_id: plan.revision_id, schema_version: plan.schema_version, parent_revision_id: plan.parent_revision_id, organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id), approval, approved_at: at, plan_checksum: checksum(plan), resource_snapshot_id: snapshot.snapshot_id, resource_snapshot_revision_id: snapshot.revision_id, plan, created_at: at };
    assert(planRevision.plan_checksum === expectedPlanChecksum(planRevision), `${key}_checksum_invalid`, `Calinium could not secure the approved ${singular} revision.`, 500);
    return { planRevision, resourceSnapshot: snapshot };
  }
  return { config, planRequired: isRequired, defaultCandidate: blankCandidate, candidateForStrategy, validateCandidate, publicCandidate, saveCandidate, candidateWarnings: warningsFor, resolveCandidateResources, buildApprovedRecords };
}

module.exports = { createEvidencePlanService };
