'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { readJson, listConfigurationFiles, sourcePath } = require('./utils');
const { loadPolicyCatalog } = require('./materialize-section-blocks');

const prohibitedPlanFields = new Set(['content_entity_id', 'placement_id', 'semantic_block_role', 'approval_id', 'approval_reference', 'resource_reference_ids', 'evidence_reference_ids', 'evidence_reference', 'provenance', 'accessibility', 'plan_id', 'revision_id', 'resource_snapshot_id']);

function validBlockSettingValue(setting, value) {
  if (['text', 'textarea', 'inline_richtext', 'richtext', 'url', 'article', 'page', 'collection', 'image_picker', 'product'].includes(setting.setting_type)) return typeof value === 'string' && value.length > 0;
  if (setting.setting_type === 'checkbox') return typeof value === 'boolean';
  if (setting.setting_type === 'range') return typeof value === 'number';
  return true;
}

function containsPlanField(value) {
  if (Array.isArray(value)) return value.some(containsPlanField);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => prohibitedPlanFields.has(key) || containsPlanField(item));
}

function validateBlocks(section, id, relative, capability, policies, errors) {
  const hasBlocks = Object.hasOwn(section, 'blocks');
  const hasOrder = Object.hasOwn(section, 'block_order');
  if (!hasBlocks && !hasOrder) return;
  if (!hasBlocks || !section.blocks || typeof section.blocks !== 'object' || Array.isArray(section.blocks)) {
    errors.push(`${relative} section ${id} has an invalid blocks object.`);
    return;
  }
  if (!hasOrder || !Array.isArray(section.block_order)) {
    errors.push(`${relative} section ${id} has no valid block_order array.`);
    return;
  }
  const blockIds = Object.keys(section.blocks);
  if (blockIds.length !== section.block_order.length || new Set(section.block_order).size !== section.block_order.length) errors.push(`${relative} section ${id} block_order must contain every block exactly once.`);
  for (const blockId of section.block_order) if (!section.blocks[blockId]) errors.push(`${relative} section ${id} orders missing block ${blockId}.`);
  const policy = (policies || []).find((item) => item.runtime_section_id === section.type) || null;
  if (policy && blockIds.length > policy.max_blocks) errors.push(`${relative} section ${id} exceeds ${policy.max_blocks} ${section.type} blocks.`);
  for (const [blockId, block] of Object.entries(section.blocks)) {
    const blockCapability = (capability.blocks || []).find((item) => item.block_type === block?.type);
    if (!blockCapability) { errors.push(`${relative} section ${id} block ${blockId} uses unknown block type ${block?.type}.`); continue; }
    if (!block || typeof block !== 'object' || Array.isArray(block)) { errors.push(`${relative} section ${id} block ${blockId} is invalid.`); continue; }
    if (!block.settings || typeof block.settings !== 'object' || Array.isArray(block.settings)) errors.push(`${relative} section ${id} block ${blockId} has invalid settings.`);
    const settings = new Map((blockCapability.settings || []).map((item) => [item.setting_id, item]));
    for (const [settingId, value] of Object.entries(block.settings || {})) {
      const setting = settings.get(settingId);
      if (!setting) errors.push(`${relative} section ${id} block ${blockId} has unknown setting ${settingId}.`);
      else if (!validBlockSettingValue(setting, value)) errors.push(`${relative} section ${id} block ${blockId}.${settingId} has an invalid value.`);
    }
    if (containsPlanField(block)) errors.push(`${relative} section ${id} block ${blockId} leaks Approved Block Plan fields into runtime JSON.`);
  }
}

function validateTemplate(template, relative, mappings, policies, errors) {
  if (!template || typeof template !== 'object') { errors.push(`${relative} is not a JSON object.`); return; }
  if (!template.sections || typeof template.sections !== 'object') errors.push(`${relative} has no sections object.`);
  if (!Array.isArray(template.order)) errors.push(`${relative} has no order array.`);
  const order = template.order || [];
  if (new Set(order).size !== order.length) errors.push(`${relative} contains duplicate section IDs in order.`);
  for (const id of order) if (!template.sections?.[id]) errors.push(`${relative} orders missing section ${id}.`);
  for (const [id, section] of Object.entries(template.sections || {})) {
    const capability = mappings.index.sections.get(section.type);
    if (!capability) { errors.push(`${relative} section ${id} uses unknown section type ${section.type}.`); continue; }
    const settings = new Map(capability.available_settings.map((item) => [item.setting_id, item]));
    for (const settingId of Object.keys(section.settings || {})) if (!settings.has(settingId)) errors.push(`${relative} section ${id} has unknown setting ${settingId}.`);
    validateBlocks(section, id, relative, capability, policies, errors);
  }
}

function validateGeneratedTheme({ root, mappings, manifest, templates, settingsData, workspace = null }) {
  const validator = createSchemaValidator(root);
  const errors = validator.validateFile(manifest, 'schemas/calinium-generated-theme.schema.json', 'generated_theme');
  const warnings = [];
  const policies = loadPolicyCatalog(root).policies || [];
  for (const [relative, template] of Object.entries(templates)) validateTemplate(template, relative, mappings, policies, errors);
  for (const setting of manifest.generated_settings) {
    if (!mappings.index.global_settings.has(setting.setting_id)) errors.push(`Generated setting ${setting.setting_id} is not a real global setting.`);
    if (settingsData.current?.[setting.setting_id] !== setting.value) errors.push(`Generated setting ${setting.setting_id} does not match generated settings_data.json.`);
  }
  if (workspace) {
    const theme = path.join(workspace, 'theme');
    for (const relative of listConfigurationFiles(theme)) {
      const normalized = relative.split(path.sep).join('/');
      const allowed = normalized === 'config/settings_data.json' || /^templates\/.+\.json$/.test(normalized);
      if (!allowed) errors.push(`Generated workspace contains prohibited runtime file theme/${normalized}.`);
    }
    for (const file of manifest.generated_files) {
      if (!fs.existsSync(path.join(workspace, file.path))) errors.push(`Manifest file ${file.path} is missing from workspace.`);
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}

function validateGeneratedWorkspace({ root, workspace, mappings, manifestPath = 'manifests/generated-theme.json' }) {
  const manifest = readJson(path.join(workspace, manifestPath));
  const themeRoot = path.join(workspace, 'theme');
  const templates = {};
  for (const file of listConfigurationFiles(path.join(themeRoot, 'templates'))) {
    templates[`templates/${file.split(path.sep).join('/')}`] = readJson(path.join(themeRoot, 'templates', file));
  }
  const settingsData = readJson(path.join(themeRoot, 'config/settings_data.json'));
  return validateGeneratedTheme({ root, mappings, manifest, templates, settingsData, workspace });
}

module.exports = { validateGeneratedTheme, validateGeneratedWorkspace };
