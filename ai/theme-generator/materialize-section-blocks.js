'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { validatePlan } = require('../../scripts/validate-approved-block-plan');

const POLICY_PATH = 'config/theme-block-materialization-policy.json';
const POLICY_SCHEMA_PATH = 'schemas/theme-block-materialization-policy.schema.json';

class BlockMaterializationError extends Error {
  constructor(message, category = 'block_materialization') {
    super(message);
    this.name = 'BlockMaterializationError';
    this.category = category;
  }
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) freeze(item);
  }
  return value;
}

function readJson(root, relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function stableBlockId({ sectionInstanceId, semanticBlockRole, placementId }) {
  const input = `${sectionInstanceId}|${semanticBlockRole}|${placementId}`;
  const digest = crypto.createHash('sha256').update(input, 'utf8').digest('hex').slice(0, 20);
  return `calinium_b_${digest}`;
}

function approvedPlan(plan, root) {
  const immutable = freeze(clone(plan));
  const errors = validatePlan(immutable, 'approved_block_plan', createSchemaValidator(root));
  if (errors.length) {
    throw new BlockMaterializationError(
      `Approved Block Plan validation failed: ${errors.map((item) => `${item.category}:${item.path}`).join(', ')}.`,
      'invalid_approved_plan'
    );
  }
  return immutable;
}

function approvedResourceSnapshot(snapshot, plan) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new BlockMaterializationError('Approved Block Plan resource snapshot is required for block materialization.', 'missing_resource_snapshot');
  }
  const approvalId = snapshot.approval?.approval_id || snapshot.approval_id;
  if (approvalId !== plan.approval.approval_id) {
    throw new BlockMaterializationError('Approved Block Plan resource snapshot approval does not match the plan approval.', 'resource_approval_mismatch');
  }
  if (!snapshot.resources || typeof snapshot.resources !== 'object' || Array.isArray(snapshot.resources)) {
    throw new BlockMaterializationError('Approved Block Plan resource snapshot has no resources object.', 'missing_resource_snapshot');
  }
  return freeze(clone(snapshot));
}

function loadPolicyCatalog(root) {
  const catalog = readJson(root, POLICY_PATH);
  const errors = createSchemaValidator(root).validateFile(catalog, POLICY_SCHEMA_PATH, POLICY_PATH);
  if (errors.length) throw new BlockMaterializationError(`Block materialization policy validation failed: ${errors.join('; ')}`, 'invalid_policy');
  return catalog;
}

function loadPolicy(root, policyId = 'editorial_grid') {
  const catalog = loadPolicyCatalog(root);
  const policy = (catalog.policies || []).find((item) => item.policy_id === policyId);
  if (!policy) throw new BlockMaterializationError(`No block materialization policy exists for ${policyId}.`, 'missing_policy');
  return policy;
}

function policyForRuntime(root, sectionId) {
  const catalog = loadPolicyCatalog(root);
  return (catalog.policies || []).find((item) => item.runtime_section_id === sectionId) || null;
}

function blockCapability(capability, type) {
  return (capability?.blocks || []).find((item) => item.block_type === type) || null;
}

function validatePolicyAgainstRuntime(policy, mappings) {
  const capability = mappings?.index?.sections?.get(policy.runtime_section_id);
  if (!capability) throw new BlockMaterializationError(`Policy references unknown runtime section ${policy.runtime_section_id}.`, 'unknown_runtime_section');
  const types = [...new Set([policy.runtime_block_type, ...Object.values(policy.runtime_block_type_by_semantic_kind || {})])];
  const blocks = new Map(types.map((type) => [type, blockCapability(capability, type)]));
  for (const [type, block] of blocks) if (!block) throw new BlockMaterializationError(`Policy references unknown runtime block type ${policy.runtime_section_id}.${type}.`, 'unknown_runtime_block_type');
  const availableByType = new Map([...blocks].map(([type, block]) => [type, new Map((block.settings || []).map((setting) => [setting.setting_id, setting]))]));
  const requiredIds = [
    ...(policy.localized_value_mappings || []).map((item) => item.runtime_setting_id),
    ...(policy.destination_mappings || []).map((item) => item.runtime_setting_id),
    ...(policy.optional_resource_mappings || []).map((item) => item.runtime_setting_id),
    ...(policy.placement_value_mappings || []).map((item) => item.runtime_setting_id)
  ];
  for (const [type, available] of availableByType) for (const settingId of requiredIds) if (!available.has(settingId)) throw new BlockMaterializationError(`${policy.runtime_section_id}.${type} has unknown runtime setting ID ${settingId}.`, 'unknown_runtime_setting_id');
  const sectionSettings = new Map((capability.available_settings || []).map((setting) => [setting.setting_id, setting]));
  for (const mapping of policy.section_resource_mappings || []) if (!sectionSettings.has(mapping.runtime_setting_id)) throw new BlockMaterializationError(`${policy.runtime_section_id} has unknown runtime section setting ID ${mapping.runtime_setting_id}.`, 'unknown_runtime_setting_id');
  return { capability, blocks, settingsByType: availableByType, sectionSettings };
}

function localizedValue(entity, field, locale) {
  const values = (entity.localized_values || []).filter((item) => item.locale === locale && item.field === field);
  return values.length === 1 ? values[0].value : null;
}

function visibilityAllows(visibility, locale) {
  if (!visibility || visibility.mode === 'always') return true;
  return (visibility.conditions || []).every((condition) => {
    if (condition.scope !== 'locale') return false;
    return condition.operator === 'equals'
      ? condition.values.length === 1 && condition.values[0] === locale
      : condition.operator === 'includes' && condition.values.includes(locale);
  });
}

function destinationFor({ entity, plan, snapshot, policy, required = true }) {
  const resources = plan.resource_references || {};
  const byType = new Map();
  for (const resourceId of entity.resource_reference_ids || []) {
    const resource = resources[resourceId];
    if (!resource) continue;
    if (resource.reference_role && resource.reference_role !== 'destination') continue;
    const values = byType.get(resource.resource_type) || [];
    values.push(resource);
    byType.set(resource.resource_type, values);
  }
  for (const resourceType of policy.destination_precedence || []) {
    const candidates = byType.get(resourceType) || [];
    if (!candidates.length) continue;
    if (candidates.length > 1) return { omit: 'ambiguous_destination' };
    const resource = candidates[0];
    const mapping = (policy.destination_mappings || []).find((item) => item.resource_type === resourceType);
    if (!mapping) return { omit: 'unsupported_resource_type' };
    const binding = snapshot.resources?.[resource.resource_id];
    if (!binding) return { omit: 'missing_resource_binding' };
    if (binding.resource_type !== resource.resource_type) {
      throw new BlockMaterializationError(`Approved resource ${resource.resource_id} has a mismatched runtime resource type.`, 'resource_type_mismatch');
    }
    if (binding.approved_revision !== resource.approved_revision) {
      throw new BlockMaterializationError(`Approved resource ${resource.resource_id} revision does not match the immutable approved reference.`, 'resource_revision_mismatch');
    }
    if (typeof binding.runtime_value !== 'string' || !binding.runtime_value) return { omit: 'missing_resource_binding' };
    return {
      runtime_setting_id: mapping.runtime_setting_id,
      runtime_value: binding.runtime_value,
      duplicate_key: `${mapping.runtime_setting_id}|${binding.runtime_value}`
    };
  }
  return required ? { omit: 'missing_destination' } : { runtime_setting_id: null, runtime_value: null, duplicate_key: null };
}

function optionalResourceSettings({ entity, plan, snapshot, policy, warningBase }) {
  const settings = {};
  const warnings = [];
  const omissions = [];
  for (const resourceId of entity.resource_reference_ids || []) {
    const resource = plan.resource_references[resourceId];
    const mapping = (policy.optional_resource_mappings || []).find((item) => {
      if (item.resource_type !== resource?.resource_type) return false;
      if (!item.reference_role) return true;
      // The first Editorial Grid revision predates portable resource roles.
      // Treat an unclassified project image as its legacy primary image only.
      return resource.reference_role === item.reference_role || (item.reference_role === 'primary_media' && !resource.reference_role);
    });
    if (!resource || !mapping) continue;
    const binding = snapshot.resources?.[resource.resource_id];
    if (!binding) {
      warnings.push(`${warningBase}:omitted:unsupported_optional_resource:${resource.resource_id}`);
      omissions.push({ resource_id: resource.resource_id, reason: 'unsupported_optional_resource' });
      continue;
    }
    if (binding.resource_type !== resource.resource_type) {
      throw new BlockMaterializationError(`Approved optional resource ${resource.resource_id} has a mismatched runtime resource type.`, 'resource_type_mismatch');
    }
    if (binding.approved_revision !== resource.approved_revision) {
      throw new BlockMaterializationError(`Approved optional resource ${resource.resource_id} revision does not match the immutable approved reference.`, 'resource_revision_mismatch');
    }
    if (typeof binding.runtime_value !== 'string' || !binding.runtime_value) {
      warnings.push(`${warningBase}:omitted:unsupported_optional_resource:${resource.resource_id}`);
      omissions.push({ resource_id: resource.resource_id, reason: 'unsupported_optional_resource' });
      continue;
    }
    settings[mapping.runtime_setting_id] = binding.runtime_value;
  }
  return { settings, warnings, omissions };
}

function isStringSetting(setting) {
  return ['text', 'textarea', 'inline_richtext', 'richtext', 'url', 'article', 'page', 'collection', 'image_picker', 'product'].includes(setting.setting_type);
}

function validateRuntimeValue(setting, value, pathLabel) {
  if (isStringSetting(setting) && (typeof value !== 'string' || !value)) {
    throw new BlockMaterializationError(`${pathLabel} has an invalid runtime setting value.`, 'invalid_runtime_setting_value');
  }
  if (setting.setting_type === 'select' && !setting.accepted_values?.values?.includes(value)) {
    throw new BlockMaterializationError(`${pathLabel} has an invalid runtime setting value.`, 'invalid_runtime_setting_value');
  }
  if (setting.setting_type === 'range') {
    const accepted = setting.accepted_values || {};
    if (typeof value !== 'number' || !Number.isFinite(value) || value < accepted.minimum || value > accepted.maximum || ((value - accepted.minimum) % accepted.step !== 0)) {
      throw new BlockMaterializationError(`${pathLabel} has an invalid runtime setting value.`, 'invalid_runtime_setting_value');
    }
  }
}

function validateMaterializedOutput({ blocks, blockOrder, policy, runtime }) {
  if (!blocks || typeof blocks !== 'object' || Array.isArray(blocks)) throw new BlockMaterializationError('Materialized blocks must be an object.', 'invalid_materialized_output');
  if (!Array.isArray(blockOrder)) throw new BlockMaterializationError('Materialized block_order must be an array.', 'invalid_materialized_output');
  const ids = Object.keys(blocks);
  if (ids.length !== blockOrder.length || new Set(blockOrder).size !== blockOrder.length) throw new BlockMaterializationError('Materialized block order must contain each block exactly once.', 'invalid_materialized_output');
  if (ids.length > policy.max_blocks) throw new BlockMaterializationError(`Materialized ${policy.runtime_section_id} block count exceeds ${policy.max_blocks}.`, 'block_limit_exceeded');
  for (const id of blockOrder) {
    const block = blocks[id];
    if (!block) throw new BlockMaterializationError(`Materialized block order references missing ${id}.`, 'invalid_materialized_output');
    if (!/^calinium_b_[a-f0-9]{20}$/.test(id)) throw new BlockMaterializationError(`Materialized block ID ${id} is invalid.`, 'invalid_materialized_output');
    if (!runtime.settingsByType?.has(block.type)) throw new BlockMaterializationError(`Materialized block ${id} has unknown block type ${block.type}.`, 'unknown_runtime_block_type');
    const settingsForBlock = runtime.settingsByType.get(block.type);
    for (const [settingId, value] of Object.entries(block.settings || {})) {
      const setting = settingsForBlock.get(settingId);
      if (!setting) throw new BlockMaterializationError(`Materialized block ${id} has unknown setting ID ${settingId}.`, 'unknown_runtime_setting_id');
      validateRuntimeValue(setting, value, `Materialized block ${id}.${settingId}`);
    }
  }
}

function accessibleContext(entity, locale) {
  const localized = entity.accessibility?.localized || [];
  const entry = localized.find((item) => item.locale === locale) || null;
  return Boolean(entry?.alt_text || entry?.accessible_label);
}

function hasApprovedEvidence(entity, plan) {
  const ids = entity.evidence_reference_ids || [];
  return ids.length > 0 && ids.every((evidenceId) => Boolean(plan.evidence_references?.[evidenceId]));
}

function compositionResourceSettings({ composition, plan, snapshot, policy, runtime, sectionInstanceId }) {
  const settings = {};
  const warnings = [];
  const mappings = policy.section_resource_mappings || [];
  for (const mapping of mappings) {
    const candidates = (composition.resource_reference_ids || []).map((id) => plan.resource_references[id]).filter((resource) => resource?.resource_type === mapping.resource_type && resource.reference_role === mapping.reference_role);
    if (candidates.length > 1) throw new BlockMaterializationError(`${policy.runtime_section_id} has multiple ${mapping.reference_role} resources.`, 'ambiguous_section_resource');
    if (!candidates.length) {
      if (mapping.required) throw new BlockMaterializationError(`${policy.runtime_section_id} requires approved ${mapping.reference_role}.`, 'missing_primary_image');
      continue;
    }
    const resource = candidates[0];
    const binding = snapshot.resources?.[resource.resource_id];
    if (!binding || typeof binding.runtime_value !== 'string' || !binding.runtime_value) {
      if (mapping.required) throw new BlockMaterializationError(`${policy.runtime_section_id} is missing the immutable ${mapping.reference_role} binding.`, 'missing_primary_image');
      warnings.push(`${policy.runtime_section_id}:${sectionInstanceId}:omitted:unsupported_optional_resource:${resource.resource_id}`);
      continue;
    }
    if (binding.resource_type !== resource.resource_type) throw new BlockMaterializationError(`Approved section resource ${resource.resource_id} has a mismatched runtime resource type.`, 'resource_type_mismatch');
    if (binding.approved_revision !== resource.approved_revision) throw new BlockMaterializationError(`Approved section resource ${resource.resource_id} revision does not match the immutable approved reference.`, 'resource_revision_mismatch');
    const setting = runtime.sectionSettings.get(mapping.runtime_setting_id);
    validateRuntimeValue(setting, binding.runtime_value, `Materialized section ${policy.runtime_section_id}.${mapping.runtime_setting_id}`);
    settings[mapping.runtime_setting_id] = binding.runtime_value;
  }
  return { settings, warnings };
}

function placementValue(placement, semanticField) {
  return semanticField.split('.').reduce((value, key) => value?.[key], placement);
}

function materializeComposition({ plan, snapshot, policy, runtime, pageRole, sectionInstanceId, blockIdFactory = stableBlockId }) {
  const compositions = (plan.compositions || []).filter((item) => item.page_role === pageRole && item.section_role === policy.semantic_section_role);
  if (!compositions.length) return { applied: false, blocks: null, block_order: null, section_settings: null, warnings: [`${policy.runtime_section_id}:${sectionInstanceId}:omitted:no_compatible_composition`], omissions: [] };
  if (compositions.length > 1) throw new BlockMaterializationError(`Approved Block Plan has multiple ${policy.semantic_section_role} compositions for ${pageRole}.`, 'duplicate_composition');
  const composition = compositions[0];
  if (!visibilityAllows(composition.visibility, plan.default_locale)) {
    return { applied: false, blocks: null, block_order: null, section_settings: null, warnings: [`${policy.runtime_section_id}:${sectionInstanceId}:omitted:composition_not_visible`], omissions: [] };
  }
  const sectionResources = compositionResourceSettings({ composition, plan, snapshot, policy, runtime, sectionInstanceId });
  const placements = [...composition.block_placements].sort((left, right) => left.order - right.order);
  if (placements.length > policy.max_blocks) throw new BlockMaterializationError(`Approved ${policy.runtime_section_id} placement count exceeds ${policy.max_blocks}.`, 'block_limit_exceeded');
  const blocks = {};
  const blockOrder = [];
  const warnings = [...sectionResources.warnings];
  const omissions = [];
  const duplicateKeys = new Set();
  for (const placement of placements) {
    const warningBase = `${policy.runtime_section_id}:${sectionInstanceId}:${placement.placement_id}`;
    if (!visibilityAllows(placement.visibility, plan.default_locale)) {
      warnings.push(`${warningBase}:omitted:placement_not_visible`);
      omissions.push({ placement_id: placement.placement_id, reason: 'placement_not_visible' });
      continue;
    }
    if (placement.semantic_block_role !== policy.semantic_block_role) {
      throw new BlockMaterializationError(`Approved placement ${placement.placement_id} requests unsupported semantic block role ${placement.semantic_block_role}.`, 'unsupported_semantic_block_role');
    }
    const entity = plan.content_entities[placement.content_entity_id];
    if (!entity) {
      warnings.push(`${warningBase}:omitted:missing_content_entity`);
      omissions.push({ placement_id: placement.placement_id, reason: 'missing_content_entity' });
      continue;
    }
    const visibleNameField = policy.visible_name_field || 'title';
    const title = localizedValue(entity, visibleNameField, plan.default_locale);
    const isLookbook = policy.policy_id === 'lookbook';
    const requiresVisibleName = (policy.minimum_content || []).includes('visible_name');
    const requiresDestination = (policy.minimum_content || []).includes('destination');
    const requiresEvidence = (policy.minimum_content || []).includes('evidence');
    const requiresMarkerPosition = (policy.minimum_content || []).includes('marker_position');
    if (requiresVisibleName && !title) {
      warnings.push(`${warningBase}:omitted:missing_visible_name`);
      omissions.push({ placement_id: placement.placement_id, reason: 'missing_visible_name' });
      continue;
    }
    const missingRequiredField = (policy.required_localized_fields || []).find((field) => !localizedValue(entity, field, plan.default_locale));
    if (missingRequiredField) {
      warnings.push(`${warningBase}:omitted:missing_${missingRequiredField}`);
      omissions.push({ placement_id: placement.placement_id, reason: `missing_${missingRequiredField}` });
      continue;
    }
    if (requiresEvidence && !hasApprovedEvidence(entity, plan)) {
      throw new BlockMaterializationError(`Approved placement ${placement.placement_id} has no required evidence reference.`, 'missing_required_evidence');
    }
    const destination = destinationFor({ entity, plan, snapshot, policy, required: requiresDestination });
    if (destination.omit) {
      warnings.push(`${warningBase}:omitted:${destination.omit}`);
      omissions.push({ placement_id: placement.placement_id, reason: destination.omit });
      continue;
    }
    const optional = optionalResourceSettings({ entity, plan, snapshot, policy, warningBase });
    warnings.push(...optional.warnings);
    omissions.push(...optional.omissions.map((item) => ({ placement_id: placement.placement_id, ...item })));
    if (isLookbook && !optional.settings.image) {
      warnings.push(`${warningBase}:omitted:missing_primary_image`);
      omissions.push({ placement_id: placement.placement_id, reason: 'missing_primary_image' });
      continue;
    }
    if (isLookbook && !title && !accessibleContext(entity, plan.default_locale)) {
      warnings.push(`${warningBase}:omitted:missing_accessible_context`);
      omissions.push({ placement_id: placement.placement_id, reason: 'missing_accessible_context' });
      continue;
    }
    const duplicateKey = destination.duplicate_key
      || (isLookbook ? `frame|${optional.settings.image}` : null)
      || (policy.duplicate_key === 'semantic_heading' ? `heading|${title}` : null);
    if (duplicateKey && duplicateKeys.has(duplicateKey)) {
      const reason = policy.duplicate_key === 'semantic_heading' ? 'duplicate_semantic_item' : 'duplicate_destination';
      warnings.push(`${warningBase}:omitted:${reason}`);
      omissions.push({ placement_id: placement.placement_id, reason });
      continue;
    }
    const settings = { ...optional.settings };
    if (destination.runtime_setting_id) settings[destination.runtime_setting_id] = destination.runtime_value;
    if (requiresMarkerPosition && (!placement.marker_position || !Number.isInteger(placement.marker_position.x_percent) || !Number.isInteger(placement.marker_position.y_percent))) {
      throw new BlockMaterializationError(`Approved placement ${placement.placement_id} has no valid marker position.`, 'invalid_marker_position');
    }
    for (const mapping of policy.placement_value_mappings || []) {
      const value = placementValue(placement, mapping.semantic_field);
      if (value !== undefined && value !== null) settings[mapping.runtime_setting_id] = value;
    }
    for (const mapping of policy.localized_value_mappings || []) {
      const value = localizedValue(entity, mapping.semantic_field, plan.default_locale);
      if (value) settings[mapping.runtime_setting_id] = value;
    }
    const blockId = blockIdFactory({ sectionInstanceId, semanticBlockRole: placement.semantic_block_role, placementId: placement.placement_id });
    if (!/^calinium_b_[a-f0-9]{20}$/.test(blockId)) throw new BlockMaterializationError(`Generated block ID ${blockId} does not use the approved stable format.`, 'invalid_block_id');
    if (blocks[blockId]) throw new BlockMaterializationError(`Generated block ID collision for ${blockId}.`, 'generated_block_id_collision');
    const semanticKind = localizedValue(entity, 'kind', plan.default_locale);
    if (policy.semantic_kind_values && !policy.semantic_kind_values.includes(semanticKind)) throw new BlockMaterializationError(`Approved placement ${placement.placement_id} has an unsupported semantic kind.`, 'unsupported_semantic_block_role');
    const runtimeBlockType = policy.runtime_block_type_by_semantic_kind?.[semanticKind] || policy.runtime_block_type;
    blocks[blockId] = { type: runtimeBlockType, settings };
    blockOrder.push(blockId);
    if (duplicateKey) duplicateKeys.add(duplicateKey);
  }
  if (!blockOrder.length) {
    warnings.push(`${policy.runtime_section_id}:${sectionInstanceId}:omitted:empty_section_preserve_shell`);
    return { applied: false, blocks: null, block_order: null, section_settings: null, warnings, omissions };
  }
  if (policy.min_blocks && blockOrder.length < policy.min_blocks) throw new BlockMaterializationError(`Materialized ${policy.runtime_section_id} requires at least ${policy.min_blocks} blocks.`, 'minimum_block_count');
  validateMaterializedOutput({ blocks, blockOrder, policy, runtime });
  return { applied: true, blocks, block_order: blockOrder, section_settings: sectionResources.settings, warnings, omissions };
}

function materializeSectionBlocks({ root, approvedBlockPlan, resourceSnapshot, pageRole, sectionId, sectionInstanceId, mappings, policy = null, blockIdFactory = stableBlockId }) {
  if (!approvedBlockPlan) return { applied: false, blocks: null, block_order: null, warnings: [], omissions: [] };
  const plan = approvedPlan(approvedBlockPlan, root);
  const activePolicy = policy || policyForRuntime(root, sectionId);
  if (!activePolicy) return { applied: false, blocks: null, block_order: null, warnings: [], omissions: [] };
  const eligiblePageRoles = activePolicy.page_roles || [activePolicy.page_role];
  if (!eligiblePageRoles.includes(pageRole)) throw new BlockMaterializationError(`${activePolicy.runtime_section_id} is ineligible page role ${pageRole}.`, 'ineligible_page_or_section');
  if (sectionId !== activePolicy.runtime_section_id) throw new BlockMaterializationError(`Policy ${activePolicy.policy_id} cannot target ${sectionId}.`, 'ineligible_page_or_section');
  const runtime = validatePolicyAgainstRuntime(activePolicy, mappings);
  const snapshot = approvedResourceSnapshot(resourceSnapshot, plan);
  return materializeComposition({ plan, snapshot, policy: activePolicy, runtime, pageRole, sectionInstanceId, blockIdFactory });
}

module.exports = {
  BlockMaterializationError,
  POLICY_PATH,
  POLICY_SCHEMA_PATH,
  approvedPlan,
  approvedResourceSnapshot,
  loadPolicyCatalog,
  loadPolicy,
  policyForRuntime,
  materializeSectionBlocks,
  stableBlockId,
  validateMaterializedOutput
};
