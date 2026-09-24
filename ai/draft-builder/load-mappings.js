'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');

const mappingFiles = [
  ['theme_capabilities', 'config/theme-capabilities.json', 'schemas/theme-capabilities.schema.json'],
  ['global_settings', 'config/theme-global-settings-map.json', 'schemas/theme-global-settings-map.schema.json'],
  ['section_capabilities', 'config/theme-section-capabilities.json', 'schemas/theme-section-capabilities.schema.json'],
  ['strategy_settings', 'config/strategy-setting-mapping.json', 'schemas/strategy-setting-mapping.schema.json'],
  ['strategy_sections', 'config/strategy-section-mapping.json', 'schemas/strategy-section-mapping.schema.json'],
  ['safe_defaults', 'config/theme-safe-defaults.json', 'schemas/theme-safe-defaults.schema.json'],
  ['content_classification', 'config/theme-content-classification.json', 'schemas/theme-content-classification.schema.json']
];
const designFiles = [
  ['typography_profiles', 'config/typography-profiles.json', 'schemas/typography-profiles.schema.json'],
  ['spacing_profiles', 'config/spacing-profiles.json', 'schemas/spacing-profiles.schema.json'],
  ['animation_profiles', 'config/animation-profiles.json', 'schemas/animation-profiles.schema.json']
];

function readJson(root, file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function indexBy(items, key) {
  return new Map((items || []).map((item) => [item[key], item]));
}

function loadMappings(options = {}) {
  const root = options.root || path.resolve(__dirname, '../..');
  const validator = createSchemaValidator(root);
  const errors = [];
  const data = {};
  for (const [key, file, schema] of [...mappingFiles, ...designFiles]) {
    const value = readJson(root, file);
    errors.push(...validator.validateFile(value, schema, file));
    if (value.schema_version !== undefined && value.schema_version !== 1) errors.push(`${file} uses an unsupported schema version.`);
    if (value.catalog_version !== undefined && value.catalog_version !== 1) errors.push(`${file} uses an unsupported catalog version.`);
    if (Array.isArray(value.compatible_compiler_versions) && !value.compatible_compiler_versions.includes('1.0.0')) errors.push(`${file} is incompatible with compiler 1.0.0.`);
    data[key] = value;
  }
  if (errors.length) {
    const error = new Error(`Theme mapping catalog validation failed: ${errors.join('; ')}`);
    error.validation = { valid: false, errors, warnings: [] };
    throw error;
  }
  return {
    ...data,
    index: {
      global_settings: indexBy(data.global_settings.global_settings, 'setting_id'),
      sections: indexBy(data.section_capabilities.sections, 'section_id'),
      strategy_settings: indexBy(data.strategy_settings.mappings, 'decision_id'),
      strategy_sections: indexBy(data.strategy_sections.mappings, 'mapping_id'),
      safe_defaults: indexBy(data.safe_defaults.fields, 'field_id'),
      content_classification: indexBy(data.content_classification.fields, 'field_id'),
      typography_profiles: indexBy(data.typography_profiles.items, 'id'),
      spacing_profiles: indexBy(data.spacing_profiles.items, 'id'),
      animation_profiles: indexBy(data.animation_profiles.items, 'id'),
      capabilities: indexBy(data.theme_capabilities.capabilities, 'id')
    }
  };
}

module.exports = { loadMappings, mappingFiles };
