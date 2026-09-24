'use strict';

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
function tidy(value, maximum = 240) { return String(value || '').trim().slice(0, maximum); }
function visibility() { return { mode: 'always', conditions: [] }; }
function intent(media = 'none') { return { emphasis: 'supporting', media_priority: media, density: 'balanced' }; }

function selectedSectionIds(strategy) {
  const ids = homepageSections(strategy).map((section) => section.section_id);
  for (const page of [strategy?.productPage, strategy?.collectionPage, strategy?.standardPage]) {
    for (const section of Array.isArray(page?.sections) ? page.sections : []) ids.push(typeof section === 'string' ? section : section.sectionId || section.section_id || section.id);
  }
  return new Set(ids.filter(Boolean));
}

function createCommercePlanService(config) {
  const { key, schemaPath, runtimeSectionId, sectionRole, blockRole, itemKey = 'products', singular, minimumItems, maximumItems, pageRole, shopTheLook = false } = config;
  const inputFields = new Set(['content_id', 'product_resource_id', ...(shopTheLook ? ['x_percent', 'y_percent'] : [])]);
  const isRequired = (strategy) => selectedSectionIds(strategy).has(runtimeSectionId);
  const blankCandidate = (at) => ({ version: 1, status: 'not_required', candidate_version: 0, ...(shopTheLook ? { scene_image_asset_id: null, mobile_image_asset_id: null, image_alt_text: null, decorative_media: false } : {}), [itemKey]: [], warnings: [], updated_at: at });

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

  function normalizeProducts(products, current) {
    assert(Array.isArray(products), `${key}_candidate_invalid`, 'Provide an ordered list of approved products.', 422);
    assert(products.length <= maximumItems, `${key}_product_limit`, `${singular} supports at most ${maximumItems} products.`, 422);
    const prior = new Map((current[itemKey] || []).map((item) => [item.content_id, item]));
    const identities = new Set();
    return products.map((input, index) => {
      assert(input && typeof input === 'object' && !Array.isArray(input), `${key}_product_invalid`, 'Each relationship must select one approved product.', 422);
      for (const field of Object.keys(input)) assert(inputFields.has(field), `${key}_field_unsupported`, 'Commerce candidates cannot include handles, GIDs, approvals, pricing, discounts, or runtime fields.', 422);
      const requested = typeof input.content_id === 'string' ? input.content_id : null;
      if (requested) assert(prior.has(requested), `${key}_identity_invalid`, 'This content identity does not belong to the current candidate.', 409);
      const existing = requested ? prior.get(requested) : null;
      const contentId = existing?.content_id || createId('abpc');
      assert(!identities.has(contentId), `${key}_identity_duplicate`, 'Each relationship identity may appear once.', 422);
      identities.add(contentId);
      const product = { content_id: contentId, placement_id: existing?.placement_id || createId('abpl'), product_resource_id: tidy(input.product_resource_id), order: index + 1 };
      if (shopTheLook) { product.x_percent = Number(input.x_percent); product.y_percent = Number(input.y_percent); }
      return product;
    });
  }

  function warningsFor(candidate) {
    const warnings = [];
    const products = candidate[itemKey] || [];
    if (products.length > 0 && products.length < minimumItems) warnings.push('minimum_products_required');
    if (shopTheLook && !candidate.scene_image_asset_id) warnings.push('scene_image_required');
    if (shopTheLook && candidate.scene_image_asset_id && !candidate.decorative_media && !candidate.image_alt_text) warnings.push('scene_image_alt_text_required');
    const resources = new Set();
    for (const product of products) {
      if (!product.product_resource_id) warnings.push(`${product.content_id}:product_required`);
      if (resources.has(product.product_resource_id)) warnings.push(`${product.content_id}:duplicate_product`);
      resources.add(product.product_resource_id);
      if (shopTheLook && (!Number.isInteger(product.x_percent) || product.x_percent < 0 || product.x_percent > 100)) warnings.push(`${product.content_id}:x_position_invalid`);
      if (shopTheLook && (!Number.isInteger(product.y_percent) || product.y_percent < 0 || product.y_percent > 100)) warnings.push(`${product.content_id}:y_position_invalid`);
    }
    return warnings.sort();
  }

  function saveCandidate({ current, expectedVersion, products, scene = {}, root, at }) {
    assert(Number.isInteger(expectedVersion) && expectedVersion === current.candidate_version, `${key}_candidate_stale`, `This ${singular} plan changed elsewhere. Reload it before saving.`, 409);
    const next = { ...current, status: 'draft', candidate_version: current.candidate_version + 1, [itemKey]: normalizeProducts(products, current), updated_at: at };
    if (shopTheLook) {
      const allowed = new Set(['scene_image_asset_id', 'mobile_image_asset_id', 'image_alt_text', 'decorative_media']);
      for (const field of Object.keys(scene || {})) assert(allowed.has(field), `${key}_field_unsupported`, 'Shop the Look scene data cannot include runtime or approval fields.', 422);
      Object.assign(next, { scene_image_asset_id: tidy(scene.scene_image_asset_id) || null, mobile_image_asset_id: tidy(scene.mobile_image_asset_id) || null, image_alt_text: tidy(scene.image_alt_text, 500) || null, decorative_media: Boolean(scene.decorative_media) });
    }
    next.warnings = warningsFor(next);
    validateCandidate(next, root);
    return next;
  }

  async function resolveCandidateResources({ candidate, project, shopifyService, store }) {
    assert(candidate[itemKey].length >= minimumItems, `${key}_minimum_products`, `${singular} requires at least ${minimumItems} approved products.`, 422);
    const products = new Map(); const handles = new Set();
    for (const item of candidate[itemKey]) {
      assert(item.product_resource_id, `${key}_product_required`, 'Select an approved Shopify product for every relationship.', 422);
      const selected = await shopifyService.resolveApprovedResource({ projectId: project.id, organizationId: project.organization_id, resourceId: item.product_resource_id, allowedTypes: ['product'] });
      assert(selected.resource?.handle && selected.resource?.source_revision, `${key}_product_binding_missing`, 'The approved product needs a current immutable Shopify handle binding.', 409);
      assert(!handles.has(selected.resource.handle), `${key}_duplicate_product`, 'Each approved product may appear once in this composition.', 422);
      handles.add(selected.resource.handle); products.set(item.product_resource_id, selected.resource);
    }
    const images = new Map();
    if (shopTheLook) {
      assert(candidate.scene_image_asset_id, `${key}_scene_required`, 'Choose an approved primary scene image.', 422);
      assert(candidate.decorative_media || candidate.image_alt_text, `${key}_scene_alt_required`, 'Add approved scene image text or mark the image decorative.', 422);
      for (const assetId of [candidate.scene_image_asset_id, candidate.mobile_image_asset_id].filter(Boolean)) {
        const asset = await store.findAssetForProject(assetId, project.id, project.organization_id);
        assert(asset?.upload_status === 'ready' && asset.mime_type?.startsWith('image/'), `${key}_image_unavailable`, 'Choose a current approved project image.', 409);
        images.set(assetId, asset);
      }
    }
    return { products, images };
  }

  function rebindApproval(plan, snapshot, { revisionId, approval, at, snapshotId, snapshotRevisionId }) {
    const nextPlan = clone(plan); nextPlan.revision_id = revisionId; nextPlan.parent_revision_id = plan.revision_id; nextPlan.created_at = at;
    nextPlan.approval = { approval_id: approval.approval_id, approval_reference: approval.approval_reference, approval_status: 'approved', approver_type: 'merchant', approved_at: at };
    for (const entity of Object.values(nextPlan.content_entities || {})) { for (const value of entity.localized_values || []) value.approval_id = approval.approval_id; entity.provenance.approval_id = approval.approval_id; }
    for (const resource of Object.values(nextPlan.resource_references || {})) resource.approval_id = approval.approval_id;
    for (const evidence of Object.values(nextPlan.evidence_references || {})) evidence.approval_id = approval.approval_id;
    const nextSnapshot = clone(snapshot); Object.assign(nextSnapshot, { snapshot_id: snapshotId, revision_id: snapshotRevisionId, plan_revision_id: revisionId, approval, created_at: at });
    return { plan: nextPlan, snapshot: nextSnapshot };
  }

  function newBase({ project, planId, revisionId, approval, at, snapshotId, snapshotRevisionId }) {
    return {
      plan: { schema_version: '1.0', plan_id: planId, revision_id: revisionId, parent_revision_id: null, created_at: at, store_scope: { organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id) }, approval: { approval_id: approval.approval_id, approval_reference: approval.approval_reference, approval_status: 'approved', approver_type: 'merchant', approved_at: at }, default_locale: 'en', content_entities: {}, resource_references: {}, evidence_references: {}, compositions: [], metadata: { immutable: true, source: 'merchant_approved', migration: { status: 'native', source_revision_id: null, migration_version: null } } },
      snapshot: { version: 1, snapshot_id: snapshotId, revision_id: snapshotRevisionId, plan_id: planId, plan_revision_id: revisionId, organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id), approval, source_revision: '', snapshot_checksum: '', resources: {}, created_at: at }
    };
  }

  function prune(plan, snapshot) {
    const resources = new Set([...Object.values(plan.content_entities).flatMap((entity) => entity.resource_reference_ids || []), ...plan.compositions.flatMap((composition) => composition.resource_reference_ids || [])]);
    const evidence = new Set(Object.values(plan.content_entities).flatMap((entity) => entity.evidence_reference_ids || []));
    for (const id of Object.keys(plan.resource_references)) if (!resources.has(id)) { delete plan.resource_references[id]; delete snapshot.resources[id]; }
    for (const id of Object.keys(plan.evidence_references)) if (!evidence.has(id)) delete plan.evidence_references[id];
  }

  function buildApprovedRecords({ candidate, project, userId, resources, at, root, existingPlanRevision = null, existingResourceSnapshot = null, planId = null }) {
    const revisionId = createId('abpr'); const approvalId = createId('aba'); const snapshotId = createId('abps'); const snapshotRevisionId = createId('abpsr'); const usePlanId = planId || existingPlanRevision?.plan_id || createId('abp');
    const approval = { approval_id: approvalId, approval_reference: `${key}-plan:${usePlanId}:${revisionId}`, approval_revision_id: createId('abar'), approved_at: at };
    const base = existingPlanRevision ? rebindApproval(existingPlanRevision.plan, existingResourceSnapshot, { revisionId, approval, at, snapshotId, snapshotRevisionId }) : newBase({ project, planId: usePlanId, revisionId, approval, at, snapshotId, snapshotRevisionId });
    const { plan, snapshot } = base;
    const prior = plan.compositions.find((composition) => composition.page_role === pageRole && composition.section_role === sectionRole);
    if (prior) { const ids = new Set(prior.block_placements.map((placement) => placement.content_entity_id)); plan.compositions = plan.compositions.filter((composition) => composition !== prior); for (const id of ids) delete plan.content_entities[id]; prune(plan, snapshot); }
    const productReferences = new Map();
    function bindProduct(source) {
      if (productReferences.has(source.id)) return productReferences.get(source.id);
      const resourceId = createId('abprs');
      plan.resource_references[resourceId] = { resource_id: resourceId, resource_type: 'shopify_product', reference_role: 'destination', source_type: 'shopify', source_reference: source.id, approved_revision: source.source_revision, approval_id: approvalId, checksum_sha256: source.checksum_sha256 || null };
      snapshot.resources[resourceId] = { resource_type: 'shopify_product', approved_revision: source.source_revision, runtime_value: source.handle, source_reference: source.id, approval_eligible: true, availability_at_snapshot: 'available' };
      productReferences.set(source.id, resourceId); return resourceId;
    }
    function bindImage(asset, role) {
      const resourceId = createId('abprs');
      plan.resource_references[resourceId] = { resource_id: resourceId, resource_type: 'project_image', reference_role: role, source_type: 'project_asset', source_reference: asset.id, approved_revision: asset.checksum_sha256, approval_id: approvalId, checksum_sha256: asset.checksum_sha256 };
      snapshot.resources[resourceId] = { resource_type: 'project_image', approved_revision: asset.checksum_sha256, runtime_value: `dashboard://projects/${project.id}/assets/${asset.id}`, source_reference: asset.id, approval_eligible: true, availability_at_snapshot: 'available' };
      return resourceId;
    }
    const placements = [];
    for (const item of candidate[itemKey]) {
      const source = resources.products.get(item.product_resource_id); const productResourceId = bindProduct(source); const evidenceId = createId('abpe');
      plan.evidence_references[evidenceId] = { evidence_id: evidenceId, evidence_type: 'merchant_confirmed_fact', source_type: 'merchant_record', source_reference: `creative-director:${plan.plan_id}:${key}:${item.content_id}`, approved_revision: digest(`${plan.plan_id}|${key}|${item.content_id}|${source.id}|${userId}|${at}`), approval_id: approvalId };
      plan.content_entities[item.content_id] = { content_id: item.content_id, content_type: 'curated_product_relationship', localized_values: [], resource_reference_ids: [productResourceId], evidence_reference_ids: [evidenceId], provenance: { source_type: 'evidence_backed', approval_id: approvalId, evidence_reference_ids: [evidenceId] } };
      placements.push({ placement_id: item.placement_id, content_entity_id: item.content_id, semantic_block_role: blockRole, order: item.order, visibility: visibility(), presentation_intent: intent(), ...(shopTheLook ? { marker_position: { x_percent: item.x_percent, y_percent: item.y_percent } } : {}) });
    }
    const compositionResources = [];
    if (shopTheLook) {
      compositionResources.push(bindImage(resources.images.get(candidate.scene_image_asset_id), 'primary_media'));
      if (candidate.mobile_image_asset_id) compositionResources.push(bindImage(resources.images.get(candidate.mobile_image_asset_id), 'mobile_media'));
    }
    const order = prior?.order || Math.max(0, ...plan.compositions.filter((composition) => composition.page_role === pageRole).map((composition) => composition.order || 0)) + 1;
    plan.compositions.push({ composition_id: createId('abpcp'), page_role: pageRole, section_role: sectionRole, order, visibility: visibility(), presentation_intent: intent(shopTheLook ? 'primary' : 'none'), ...(compositionResources.length ? { resource_reference_ids: compositionResources, accessibility: { decorative_media: candidate.decorative_media, localized: [{ locale: 'en', alt_text: candidate.decorative_media ? null : candidate.image_alt_text, accessible_label: null }], transcript_resource_id: null } } : {}), block_placements: placements });
    snapshot.plan_id = plan.plan_id; snapshot.plan_revision_id = plan.revision_id; snapshot.source_revision = checksum(Object.fromEntries(Object.entries(snapshot.resources).sort(([a], [b]) => a.localeCompare(b)))); snapshot.snapshot_checksum = expectedSnapshotChecksum(snapshot);
    const errors = validatePlan(plan, `approved_${key}_plan`, createSchemaValidator(root));
    if (errors.length) throw new DashboardError(`${key}_approved_plan_invalid`, `Calinium could not create a valid approved ${singular} revision.`, 500, { errors });
    const planRevision = { version: 1, plan_id: plan.plan_id, revision_id: plan.revision_id, schema_version: plan.schema_version, parent_revision_id: plan.parent_revision_id, organization_id: project.organization_id, project_id: project.id, merchant_scope_id: merchantScopeId(project.id), approval, approved_at: at, plan_checksum: checksum(plan), resource_snapshot_id: snapshot.snapshot_id, resource_snapshot_revision_id: snapshot.revision_id, plan, created_at: at };
    assert(planRevision.plan_checksum === expectedPlanChecksum(planRevision), `${key}_checksum_invalid`, `Calinium could not secure the approved ${singular} revision.`, 500);
    return { planRevision, resourceSnapshot: snapshot };
  }

  return { config: { ...config, itemKey }, planRequired: isRequired, defaultCandidate: blankCandidate, candidateForStrategy, validateCandidate, publicCandidate: (candidate) => clone(candidate || blankCandidate(new Date(0).toISOString())), saveCandidate, candidateWarnings: warningsFor, resolveCandidateResources, buildApprovedRecords };
}

module.exports = { createCommercePlanService, selectedSectionIds };
