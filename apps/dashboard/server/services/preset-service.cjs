'use strict';

const { createId } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { createSchemaValidator } = require('../../../../ai/compiler/schema-validator');
const { loadPresetRegistry, presetById, checksum, clone } = require('../../../../ai/presets/preset-registry');
const { recommendPreset, selectPreset } = require('../../../../ai/presets/recommend-preset');

function merchantScopeId(projectId) { return `mrc_${String(projectId).replace(/^prj_/, '')}`; }
function text(value) { return typeof value === 'string' && value.trim().length > 0; }
function flattened(value) { return JSON.stringify(value || {}).toLowerCase(); }

function contentInventoryFromApprovedInputs(creativeBrief, merchantProfile) {
  // Evidence sufficiency must come from merchant-approved intake, never from
  // descriptive terms the compiler later inferred into a merchant profile.
  // Otherwise an inferred phrase such as "craft-led" can be mistaken for
  // approved craftsmanship evidence and enable evidence sections.
  const source = flattened({
    business: creativeBrief?.business,
    audience: creativeBrief?.audience,
    brand: creativeBrief?.brand ? {
      desiredFeeling: creativeBrief.brand.desiredFeeling,
      existingAssets: creativeBrief.brand.existingAssets,
      constraints: creativeBrief.brand.constraints
    } : null,
    goals: creativeBrief?.goals,
    availableContent: creativeBrief?.content?.available,
    merchantFacts: (creativeBrief?.facts || []).filter((fact) => fact?.source === 'merchant')
  });
  const approved = new Set();
  if (/logo|product photography|lifestyle photography|campaign|maker photography|craft media|process photography|screenshot|interface/.test(source)) approved.add('hero_media');
  if (/product photography|lifestyle photography|campaign|maker photography/.test(source)) approved.add('collection_imagery');
  if (/campaign|lifestyle photography/.test(source)) approved.add('campaign_media');
  if (/craft|handwoven|handmade|maker|workmanship/.test(source)) approved.add('craft_evidence');
  const profile = merchantProfile || {};
  if (text(profile.business?.name) || text(creativeBrief?.business?.name) || text(creativeBrief?.business_name)) approved.add('approved_product_name');
  if (text(creativeBrief?.business?.description) || text(creativeBrief?.business_description) || text(creativeBrief?.primary_goal) || text(profile.audience?.primary)) approved.add('approved_value_proposition');
  if (/screenshot|interface|product photography|technical/.test(source)) approved.add('product_interface_media');
  if (/feature|software|application|productivity|outcome/.test(source)) approved.add('verified_features');
  if (text(creativeBrief?.existing_store_url) || text(creativeBrief?.website_url) || text(creativeBrief?.existingStoreUrl)) approved.add('primary_cta_destination');
  if ((profile.catalog?.product_count || 0) > 0 || /products|collection|catalog/.test(source)) {
    approved.add('product_collection'); approved.add('collection_resource');
  }
  // Business identity, a value proposition, and a product/collection are the
  // minimum truthful commerce baseline. They do not prove that a merchant has
  // the richer editorial evidence required by sections such as Materials,
  // Testimonials, Craftsmanship, or Founder Story. Treat the inventory as
  // content-rich only when an approved higher-signal source exists; otherwise
  // Essential must retain its omission-first composition.
  const richEvidence = ['campaign_media', 'craft_evidence', 'product_interface_media', 'verified_features'];
  return {
    approved: [...approved].sort(),
    limited: !richEvidence.some((item) => approved.has(item)),
    business_model: profile.business?.business_model || null
  };
}

function strategyRevision(storeStrategy) { return checksum(storeStrategy || {}); }

function candidateFromRecommendation({ compilerStrategy, storeStrategy, creativeBrief, merchantProfile, at, root }) {
  const contentInventory = contentInventoryFromApprovedInputs(creativeBrief, merchantProfile);
  const recommendation = recommendPreset({ strategy: compilerStrategy, contentInventory, root });
  return {
    version: 1,
    candidate_version: 1,
    status: 'draft',
    recommended_preset_id: recommendation.recommended_preset_id,
    selected_preset_id: recommendation.recommended_preset_id,
    preset_version: recommendation.preset_version,
    selection_source: 'creative_director_recommendation',
    recommendation_reasons: recommendation.recommendation_reasons,
    alternatives: recommendation.alternatives,
    compatibility: recommendation.compatibility,
    fallback: recommendation.fallback,
    omitted_sections: recommendation.omitted_sections,
    content_inventory: contentInventory,
    strategy_revision: strategyRevision(storeStrategy),
    target_theme: loadPresetRegistry(root).target_theme,
    approved_revision_id: null,
    updated_at: at
  };
}

function publicCandidate(candidate) {
  if (!candidate) return null;
  const result = clone(candidate);
  delete result.content_inventory;
  delete result.omitted_sections;
  delete result.applied_homepage_sections;
  return result;
}

function validateCandidate(candidate, root) {
  const value = publicCandidate(candidate);
  const errors = createSchemaValidator(root).validateFile(value, 'schemas/calinium-preset-selection.schema.json', 'preset selection');
  if (errors.length) throw new DashboardError('preset_selection_invalid', 'Calinium could not validate this preset selection.', 422, { errors });
  return candidate;
}

function selectCandidate({ candidate, compilerStrategy, storeStrategy, presetId, expectedVersion, at, root }) {
  assert(candidate && candidate.status === 'draft', 'preset_selection_unavailable', 'Review the recommended preset before changing it.', 409);
  assert(candidate.candidate_version === expectedVersion, 'preset_selection_stale', 'This preset choice changed in another session. Refresh before continuing.', 409);
  assert(candidate.strategy_revision === strategyRevision(storeStrategy), 'preset_strategy_stale', 'The Store Strategy changed. Review a fresh preset recommendation.', 409);
  let selection;
  try { selection = selectPreset({ strategy: compilerStrategy, presetId, contentInventory: candidate.content_inventory, root }); }
  catch (error) { throw new DashboardError(error.code || 'preset_incompatible', 'That preset is not compatible with the approved Store Strategy.', 422, { reasons: error.compatibility?.reasons || [] }); }
  const preset = selection.preset;
  const next = {
    ...candidate,
    candidate_version: candidate.candidate_version + 1,
    selected_preset_id: preset.id,
    preset_version: preset.version,
    selection_source: preset.id === candidate.recommended_preset_id ? 'creative_director_recommendation' : 'merchant_selection',
    compatibility: selection.compatibility,
    fallback: null,
    omitted_sections: selection.omitted_sections,
    approved_revision_id: null,
    updated_at: at
  };
  return validateCandidate(next, root);
}

function buildApprovedPresetRevision({ candidate, project, userId, storeStrategy, at, root }) {
  validateCandidate(candidate, root);
  assert(candidate.status === 'draft', 'preset_already_approved', 'This preset revision is already approved.', 409);
  assert(candidate.compatibility?.compatible, 'preset_incompatible', 'Choose a compatible preset before approval.', 422);
  assert(candidate.compatibility?.content_ready, 'preset_required_content_missing', 'Add or approve the required content for this preset before approval.', 422, { missing: candidate.compatibility?.missing_required_content || [] });
  assert(candidate.strategy_revision === strategyRevision(storeStrategy), 'preset_strategy_stale', 'The Store Strategy changed. Review a fresh preset recommendation.', 409);
  const { registry, preset } = presetById(root, candidate.selected_preset_id, candidate.preset_version);
  const record = {
    version: 1,
    revision_id: createId('apr'),
    preset_id: preset.id,
    preset_version: preset.version,
    catalog_version: registry.catalog_version,
    preset_snapshot: clone(preset),
    selection_source: candidate.selection_source,
    recommendation_reasons: clone(candidate.recommendation_reasons),
    alternatives_shown: candidate.alternatives.map((item) => item.preset_id),
    compatibility: clone(candidate.compatibility),
    fallback: clone(candidate.fallback),
    omitted_sections: clone(candidate.omitted_sections || []),
    approval: { approval_id: createId('apa'), approval_reference: `preset-approval-${project.id}-${candidate.candidate_version}`, approved_by_user_id: userId, approved_at: at },
    strategy_revision: candidate.strategy_revision,
    organization_id: project.organization_id,
    project_id: project.id,
    merchant_scope_id: merchantScopeId(project.id),
    target_theme: clone(registry.target_theme),
    preset_checksum: '',
    created_at: at
  };
  record.preset_checksum = checksum({ ...record, preset_checksum: undefined });
  const errors = createSchemaValidator(root).validateFile(record, 'schemas/calinium-approved-preset-revision.schema.json', 'approved preset revision');
  if (errors.length) throw new DashboardError('approved_preset_revision_invalid', 'Calinium could not preserve this preset approval.', 500, { errors });
  return record;
}

function storeStrategyForPreset(storeStrategy, presetSelection) {
  if (!presetSelection?.approved_revision_id || !Array.isArray(presetSelection.applied_homepage_sections)) return storeStrategy;
  const next = clone(storeStrategy);
  next.homepage = { ...(next.homepage || {}), sections: presetSelection.applied_homepage_sections.map((sectionId) => ({ sectionId, purpose: 'Support the approved storefront preset using an installed Calinium section.', rationale: 'Selected by the merchant-approved preset revision.', source: 'existing_strategy_compiler' })) };
  return next;
}

module.exports = { contentInventoryFromApprovedInputs, strategyRevision, candidateFromRecommendation, publicCandidate, validateCandidate, selectCandidate, buildApprovedPresetRevision, storeStrategyForPreset };
