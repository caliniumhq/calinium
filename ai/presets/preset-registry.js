'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { loadKnowledgeBase } = require('../compiler/load-knowledge-base');
const { loadMappings } = require('../draft-builder/load-mappings');
const { accepted } = require('../theme-generator/generate-settings');

const EXPECTED_IDS = Object.freeze(['atelier', 'maison', 'gallery', 'ritual', 'essential', 'signal']);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function checksum(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }

function validatePresetCatalog(catalog, root = path.resolve(__dirname, '../..')) {
  const errors = createSchemaValidator(root).validateFile(catalog, 'schemas/calinium-storefront-presets.schema.json', 'preset catalog');
  const knowledge = loadKnowledgeBase(root);
  const mappings = loadMappings({ root });
  const ids = new Set();
  const names = new Set();
  for (const preset of catalog.presets || []) {
    if (ids.has(preset.id)) errors.push(`preset catalog has duplicate preset ID ${preset.id}`);
    if (names.has(preset.name)) errors.push(`preset catalog has duplicate preset name ${preset.name}`);
    ids.add(preset.id); names.add(preset.name);
    if (!knowledge.index.recipes.has(preset.homepage_recipe)) errors.push(`${preset.id}.homepage_recipe references unknown ${preset.homepage_recipe}`);
    for (const recipe of preset.compatible_recipes) if (!knowledge.index.recipes.has(recipe)) errors.push(`${preset.id}.compatible_recipes references unknown ${recipe}`);
    for (const blueprint of preset.page_blueprints) if (!knowledge.index.blueprints.has(blueprint)) errors.push(`${preset.id}.page_blueprints references unknown ${blueprint}`);
    for (const industry of preset.compatible_industries) if (!knowledge.index.industries.has(industry)) errors.push(`${preset.id}.compatible_industries references unknown ${industry}`);
    for (const personality of preset.compatible_personalities) if (!knowledge.index.personalities.has(personality)) errors.push(`${preset.id}.compatible_personalities references unknown ${personality}`);
    for (const language of preset.compatible_design_languages) if (!knowledge.index.designLanguages.has(language)) errors.push(`${preset.id}.compatible_design_languages references unknown ${language}`);
    const seenGlobal = new Set();
    for (const setting of preset.global_settings) {
      const capability = mappings.index.global_settings.get(setting.setting_id);
      if (!capability) errors.push(`${preset.id}.global_settings references unknown ${setting.setting_id}`);
      else if (!accepted(capability, setting.value)) errors.push(`${preset.id}.${setting.setting_id} has an unsupported runtime value`);
      if (seenGlobal.has(setting.setting_id)) errors.push(`${preset.id}.global_settings duplicates ${setting.setting_id}`);
      seenGlobal.add(setting.setting_id);
    }
    const seenSections = new Set();
    for (const sectionDefault of preset.section_defaults) {
      const capability = mappings.index.sections.get(sectionDefault.section_id);
      if (!capability) errors.push(`${preset.id}.section_defaults references unknown ${sectionDefault.section_id}`);
      if (seenSections.has(sectionDefault.section_id)) errors.push(`${preset.id}.section_defaults duplicates ${sectionDefault.section_id}`);
      seenSections.add(sectionDefault.section_id);
      const available = new Map((capability?.available_settings || []).map((setting) => [setting.setting_id, setting]));
      const seenSettings = new Set();
      for (const setting of sectionDefault.settings) {
        const field = available.get(setting.setting_id);
        if (!field) errors.push(`${preset.id}.${sectionDefault.section_id} references unknown setting ${setting.setting_id}`);
        else if (!accepted(field, setting.value)) errors.push(`${preset.id}.${sectionDefault.section_id}.${setting.setting_id} has an unsupported runtime value`);
        if (seenSettings.has(setting.setting_id)) errors.push(`${preset.id}.${sectionDefault.section_id} duplicates ${setting.setting_id}`);
        seenSettings.add(setting.setting_id);
      }
    }
    for (const requirement of preset.content_requirements) for (const section of requirement.sections) if (!knowledge.installedSections.has(section)) errors.push(`${preset.id}.${requirement.id} references uninstalled section ${section}`);
    for (const section of [...preset.omission_priority, ...preset.fallbacks.minimum_viable_sections]) if (!knowledge.installedSections.has(section)) errors.push(`${preset.id} references uninstalled section ${section}`);
    if (!knowledge.index.recipes.has(preset.fallbacks.recipe)) errors.push(`${preset.id}.fallbacks.recipe references unknown ${preset.fallbacks.recipe}`);
  }
  if (EXPECTED_IDS.some((id) => !ids.has(id)) || ids.size !== EXPECTED_IDS.length) errors.push(`preset catalog must contain exactly ${EXPECTED_IDS.join(', ')}`);
  return [...new Set(errors)];
}

function loadPresetRegistry(root = path.resolve(__dirname, '../..')) {
  const file = path.join(root, 'config/calinium-storefront-presets.json');
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = validatePresetCatalog(catalog, root);
  if (errors.length) {
    const error = new Error(`Preset catalog validation failed: ${errors.join('; ')}`);
    error.validation = { valid: false, errors };
    throw error;
  }
  return Object.freeze({
    ...clone(catalog),
    checksum: checksum(catalog),
    index: new Map(catalog.presets.map((preset) => [preset.id, Object.freeze(clone(preset))]))
  });
}

function presetById(root, presetId, version = null) {
  const registry = loadPresetRegistry(root);
  const preset = registry.index.get(presetId);
  if (!preset) throw new Error(`Unknown Calinium preset ${presetId}.`);
  if (preset.status !== 'active') throw new Error(`Calinium preset ${presetId} is not active.`);
  if (version && preset.version !== version) throw new Error(`Calinium preset ${presetId} version ${version} is unavailable.`);
  return { registry, preset: clone(preset) };
}

module.exports = { EXPECTED_IDS, validatePresetCatalog, loadPresetRegistry, presetById, checksum, clone, stable };
