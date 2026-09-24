'use strict';

const crypto = require('crypto');
const { runtimeInventory } = require('../../../../scripts/lib/theme-runtime-integrity');
const { repositoryPaths } = require('../../../../scripts/lib/repository-paths');
const { reconcileResourcePlan } = require('../../../../pipeline/strategy-section-policy');
const { effectiveResourcePlan, resourceFlowEligibility } = require('../../../../pipeline/resource-confirmation-eligibility');
const { storeStrategyForPreset } = require('../services/preset-service.cjs');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function checksum(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function dashboardReferenceId(value, type) {
  const expression = type === 'shopify' ? /\/shopify-resources\/([^/?#]+)$/ : /\/assets\/([^/?#]+)$/;
  return typeof value === 'string' ? value.match(expression)?.[1] || null : null;
}
function requirement(id, label, valid, reason = null) { return { id, label, status: valid ? 'eligible' : 'blocked', reason }; }
function allowedTypesForField(field) {
  return ({ product: ['product'], collection: ['collection'], menu: ['menu'], image: ['file', 'product_media'], video: ['file', 'product_media'] })[field?.kind] || [];
}

function shopifyImageReference(resource) {
  const candidate = resource?.metadata?.image_url || resource?.preview_url || null;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.hostname !== 'cdn.shopify.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const filesIndex = parts.lastIndexOf('files');
    const filename = filesIndex >= 0 ? decodeURIComponent(parts[filesIndex + 1] || '') : '';
    if (!filename || filename.includes('/') || filename.includes('\\') || /[\u0000-\u001f]/.test(filename)) return null;
    return `shopify://shop_images/${filename}`;
  } catch {
    return null;
  }
}

function shopifyRuntimeValue(resource, field = {}) {
  if (!resource) return null;
  if (field.kind === 'product' && resource.resource_type === 'product') return resource.handle || null;
  if (field.kind === 'collection' && resource.resource_type === 'collection') return resource.handle || null;
  if (field.kind === 'menu' && resource.resource_type === 'menu') return resource.handle || null;
  if (field.kind === 'image' && ['file', 'product_media'].includes(resource.resource_type) && resource.metadata?.media_type !== 'VIDEO') return shopifyImageReference(resource);
  return null;
}

async function evaluateGenerationEligibility({ root, store, session, project, price, shopifyService = null }) {
  const generation = session?.generation_context || {};
  // Eligibility is evaluated against the same strategy-aware plan the
  // Resource stage presents. This keeps a recipe-only Founder Story from
  // becoming an implicit portrait requirement on historical sessions.
  const reconciledPlan = reconcileResourcePlan({
    resourcePlan: session?.resource_plan || {},
    storeStrategy: storeStrategyForPreset(session?.store_strategy, session?.preset_selection),
    review: session?.review
  }).resourcePlan || {};
  const plan = effectiveResourcePlan(reconciledPlan);
  const review = session?.review || {};
  const requirements = [];
  const briefApproved = Boolean(session?.creative_brief) && review.creativeBriefStatus === 'approved';
  requirements.push(requirement('creative_brief', 'Approved Creative Brief', briefApproved, briefApproved ? null : 'Approve the Creative Brief before purchasing.'));
  requirements.push(requirement('brand_blueprint', 'Approved Brand Blueprint', briefApproved, briefApproved ? null : 'Approve the Brand Blueprint before purchasing.'));
  const strategyApproved = Boolean(session?.store_strategy) && review.storeStrategyStatus === 'approved';
  requirements.push(requirement('store_strategy', 'Approved Store Strategy', strategyApproved, strategyApproved ? null : 'Approve the Store Strategy before purchasing.'));
  const needsReapproval = Boolean(plan.reconciliation?.requires_merchant_review);
  const resourceEligibility = resourceFlowEligibility(reconciledPlan, generation, { requireApproval: true });
  const planApproved = plan.status === 'ready' && !needsReapproval && resourceEligibility.eligible;
  requirements.push(requirement(
    'resource_plan',
    'Current approved Store Resources',
    planApproved,
    planApproved
      ? null
      : needsReapproval
        ? 'Review the updated Store Resources plan and save your choices again before purchasing.'
        : 'Select and explicitly approve every required Store Resource.'
  ));
  const noBlocker = !plan.blocker && !session?.generation_state?.error;
  requirements.push(requirement('strategy_blockers', 'No unresolved storefront blockers', noBlocker, noBlocker ? null : 'Resolve the current storefront blocker before purchasing.'));
  const approvedShopifyResources = [];
  let resourceSelectionsValid = true;
  const approvedOmissions = new Set(generation.recommended_resource_set_approval?.omitted_field_refs || []);
  const resolvedEmptyFields = new Set(generation.resolved_empty_fields || []);
  const plannedFields = plan.fields || [];
  for (const field of plannedFields) {
    if (approvedOmissions.has(field.setting_ref) && resolvedEmptyFields.has(field.setting_ref)) continue;
    const selected = generation.merchant_references?.[field.setting_ref];
    const resourceId = generation.shopify_resource_references?.[field.setting_ref] || dashboardReferenceId(selected, 'shopify');
    const assetId = dashboardReferenceId(selected, 'asset');
    if (!selected) {
      if (field.required) resourceSelectionsValid = false;
      continue;
    }
    if (assetId) {
      // Project assets are valid authoring resources, but the current read-only
      // package has no portable image-picker binding for them. Fail closed
      // instead of leaking a private dashboard:// reference into Shopify JSON.
      resourceSelectionsValid = false;
      continue;
    }
    const types = allowedTypesForField(field);
    if (!resourceId || !shopifyService || !types.length) { resourceSelectionsValid = false; continue; }
    try {
      const result = await shopifyService.resolveApprovedResource({ projectId: project.id, organizationId: project.organization_id, resourceId, allowedTypes: types });
      const runtimeValue = shopifyRuntimeValue(result.resource, field);
      if (!runtimeValue) { resourceSelectionsValid = false; continue; }
      approvedShopifyResources.push({ resource_id: result.resource.id, resource_type: result.resource.resource_type, source_revision: result.resource.source_revision, runtime_value: runtimeValue });
    } catch { resourceSelectionsValid = false; }
  }
  for (const asset of plan.required_assets || []) {
    const reference = generation.asset_references?.[asset.asset_id];
    const assetId = dashboardReferenceId(reference, 'asset');
    const shopifyResourceId = dashboardReferenceId(reference, 'shopify');
    if (assetId) {
      const current = await store.findAssetForProject(assetId, project.id, project.organization_id);
      if (!current || current.upload_status !== 'ready') resourceSelectionsValid = false;
      continue;
    }
    if (shopifyResourceId && shopifyService) {
      try {
        const result = await shopifyService.resolveApprovedResource({ projectId: project.id, organizationId: project.organization_id, resourceId: shopifyResourceId, allowedTypes: ['file', 'product_media'] });
        const runtimeValue = shopifyRuntimeValue(result.resource, { kind: 'image' });
        if (!runtimeValue) { resourceSelectionsValid = false; continue; }
        approvedShopifyResources.push({ resource_id: result.resource.id, resource_type: result.resource.resource_type, source_revision: result.resource.source_revision, runtime_value: runtimeValue });
      } catch { resourceSelectionsValid = false; }
      continue;
    }
    resourceSelectionsValid = false;
  }
  requirements.push(requirement('merchant_assets', 'Required merchant assets selected', resourceSelectionsValid, resourceSelectionsValid ? null : 'Select every required merchant asset and refresh any changed Shopify resource.'));
  requirements.push(requirement('price', 'Custom storefront price assigned', Boolean(price), price ? null : 'Custom storefront pricing is not configured yet.'));
  const source = runtimeInventory(repositoryPaths(root).themeRoot);
  const revision = checksum({ plan, generation });
  const result = {
    eligible: requirements.every((item) => item.status === 'eligible'),
    blocked: requirements.filter((item) => item.status === 'blocked'),
    requirements,
    resource_plan_revision: revision,
    source_theme: { id: 'calinium-one', version: '1.0', checksum: source.checksum, file_count: source.file_count },
    approved_shopify_resources: [...new Map(approvedShopifyResources.map((item) => [item.resource_id, item])).values()].sort((left, right) => left.resource_id.localeCompare(right.resource_id)),
    price: price || null
  };
  Object.defineProperty(result, 'effective_resource_plan', { value: plan, enumerable: false, writable: false });
  return result;
}

module.exports = { evaluateGenerationEligibility, stable, checksum, dashboardReferenceId, allowedTypesForField, shopifyImageReference, shopifyRuntimeValue };
