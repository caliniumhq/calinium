#!/usr/bin/env node

/*
 * Development-only generator for the Milestone 6A mapping catalogs.
 * It reads real Shopify schemas and existing Calinium metadata, then emits
 * traceable JSON. It has no storefront imports and never changes Shopify files.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { repositoryPaths } = require('./lib/repository-paths');

const root = path.resolve(__dirname, '..');
const paths = repositoryPaths(root);
const compatibility = ['1.0.0'];
const version = 1;
const nonSettings = new Set(['header', 'paragraph']);
const merchantResourceTypes = new Set(['image_picker', 'video', 'video_url', 'product', 'product_list', 'collection', 'article', 'page', 'blog', 'link_list']);
const factualFieldPattern = /(^|_)(quote|author|attribution|role|company|person|founder|team|award|certification|material|origin|location|date|year|metric|inventory|sku|review|guarantee|sustainability)(_|$)/;
const contentFieldPattern = /(^|_)(eyebrow|heading|title|text|description|caption|label|message|copy|statement|excerpt|answer|question|button)(_|$)/;

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
}

function readThemeJson(file) {
  return JSON.parse(fs.readFileSync(path.join(paths.themeRoot, file), 'utf8'));
}

function themeSource(file) {
  return path.posix.join('apps/theme', file.split(path.sep).join('/'));
}

function sourceFor(file, settingId, extras = {}) {
  return { file, setting_id: settingId, ...extras };
}

function schemaForSection(file) {
  const source = fs.readFileSync(path.join(paths.themeRoot, 'sections', file), 'utf8');
  const match = source.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  if (!match) throw new Error(`Missing Shopify schema in ${themeSource(`sections/${file}`)}`);
  return { source, schema: JSON.parse(match[1]) };
}

function settingValues(setting) {
  if (setting.type === 'select' || setting.type === 'radio') {
    return { kind: 'options', values: (setting.options || []).map((option) => option.value) };
  }
  if (setting.type === 'range') {
    return { kind: 'range', minimum: setting.min, maximum: setting.max, step: setting.step, unit: setting.unit || null };
  }
  if (setting.type === 'checkbox') return { kind: 'boolean', values: [true, false] };
  if (setting.type === 'color_scheme') return { kind: 'theme_color_scheme' };
  if (setting.type === 'color_scheme_group') return { kind: 'theme_color_scheme_group' };
  if (setting.type === 'font_picker') return { kind: 'shopify_font_picker' };
  return { kind: setting.type || 'unknown' };
}

function legacyMetadata(settingMetadata, sectionId, settingId) {
  return settingMetadata.get(sectionId)?.settings?.[settingId] || null;
}

function classify(setting, sectionId, settingMetadata) {
  const legacy = sectionId ? legacyMetadata(settingMetadata, sectionId, setting.id) : null;
  if (legacy) {
    return {
      safety_level: legacy.content_safety_level,
      ai_configurable: Boolean(legacy.ai_populatable),
      merchant_review_required: Boolean(legacy.merchant_confirmation),
      merchant_only: legacy.content_safety_level === 'merchant_only',
      rationale: 'Existing Calinium setting metadata is authoritative for this field.'
    };
  }
  if (setting.type === 'liquid') {
    return { safety_level: 'merchant_only', ai_configurable: false, merchant_review_required: true, merchant_only: true, rationale: 'Custom Liquid can execute merchant-authored storefront code.' };
  }
  if (merchantResourceTypes.has(setting.type)) {
    return { safety_level: 'merchant_only', ai_configurable: false, merchant_review_required: true, merchant_only: true, rationale: 'Shopify resource and media selection depends on real merchant-owned assets or records.' };
  }
  if (setting.type === 'url' || /(^|_)(link|url)(_|$)/.test(setting.id || '')) {
    return { safety_level: 'merchant_confirmation_required', ai_configurable: false, merchant_review_required: true, merchant_only: false, rationale: 'Destinations must be confirmed against real merchant navigation and offers.' };
  }
  if (factualFieldPattern.test(setting.id || '')) {
    return { safety_level: 'merchant_confirmation_required', ai_configurable: false, merchant_review_required: true, merchant_only: false, rationale: 'This field may communicate merchant-specific facts, proof, or attribution.' };
  }
  if (['checkbox', 'range', 'select', 'radio', 'color_scheme', 'font_picker'].includes(setting.type)) {
    return { safety_level: 'safe_to_generate', ai_configurable: true, merchant_review_required: false, merchant_only: false, rationale: 'This is a bounded presentation setting defined by the current Shopify schema.' };
  }
  if (contentFieldPattern.test(setting.id || '')) {
    return { safety_level: 'safe_to_generate', ai_configurable: true, merchant_review_required: false, merchant_only: false, rationale: 'This is non-factual presentation copy unless existing metadata assigns a stricter safety level.' };
  }
  return { safety_level: 'merchant_confirmation_required', ai_configurable: false, merchant_review_required: true, merchant_only: false, rationale: 'The setting has no existing semantic metadata and is held for merchant confirmation.' };
}

function normalizeSetting(setting, source, context, settingMetadata) {
  const classification = classify(setting, context.section_id || null, settingMetadata);
  return {
    setting_id: setting.id,
    setting_type: setting.type,
    default_value: Object.hasOwn(setting, 'default') ? setting.default : null,
    accepted_values: settingValues(setting),
    ai_configurable: classification.ai_configurable,
    merchant_configurable: true,
    merchant_review_required: classification.merchant_review_required,
    merchant_only: classification.merchant_only,
    safety_level: classification.safety_level,
    classification_rationale: classification.rationale,
    source
  };
}

function dependenciesFor(source) {
  const snippets = [...new Set([...source.matchAll(/\{%-?\s*render\s+['"]([^'"]+)/g)].map((match) => match[1]))].sort();
  const assets = [...new Set([...source.matchAll(/['"]([^'"]+\.(?:css|js))['"]\s*\|\s*asset_url/g)].map((match) => match[1]))].sort();
  return { snippets, assets };
}

function layoutsFor(settings) {
  const layoutPattern = /(^|_)(layout|position|alignment|ratio|height|width|style|columns|placement)(_|$)/;
  return settings
    .filter((setting) => layoutPattern.test(setting.setting_id) && setting.accepted_values.kind === 'options')
    .map((setting) => ({ setting_id: setting.setting_id, values: setting.accepted_values.values, source: setting.source }));
}

function fieldId(sectionId, blockType, settingId) {
  return blockType ? `${sectionId}.${blockType}.${settingId}` : `${sectionId}.${settingId}`;
}

function automaticDefault(setting) {
  if (setting.merchant_only || setting.merchant_review_required) return { classification: setting.merchant_only ? 'merchant_only' : 'merchant_review_required', value: null, reason: setting.classification_rationale };
  if (setting.setting_type === 'liquid') return { classification: 'prohibited_automatic_value', value: null, reason: setting.classification_rationale };
  return { classification: 'safe_automatic_default', value: setting.default_value, reason: 'Use the schema default or a validated bounded value from the strategy mapping.' };
}

function requirementFields(settings) {
  return settings.filter((setting) => setting.merchant_only || setting.merchant_review_required).map((setting) => setting.setting_id);
}

function main() {
  const settingsSchema = readThemeJson('config/settings_schema.json');
  const sectionManifest = new Map(readJson('config/calinium-section-manifest.json').sections.map((entry) => [entry.id, entry]));
  const settingMetadata = new Map(readJson('config/calinium-setting-metadata.json').sections.map((entry) => [entry.section_id, entry]));
  const recipes = readJson('config/layout-recipes.json').items;
  const blueprints = readJson('config/page-blueprints.json').items;

  const globalSettings = [];
  for (const group of settingsSchema) {
    for (const setting of group.settings || []) {
      if (!setting.id || nonSettings.has(setting.type)) continue;
      const source = sourceFor(themeSource('config/settings_schema.json'), setting.id, { group: group.name });
      globalSettings.push(normalizeSetting(setting, source, { scope: 'global' }, settingMetadata));
    }
  }
  globalSettings.sort((a, b) => a.setting_id.localeCompare(b.setting_id));

  const sectionCapabilities = [];
  const contentFields = [];
  const safeDefaults = [];
  for (const file of fs.readdirSync(path.join(paths.themeRoot, 'sections')).filter((entry) => entry.endsWith('.liquid')).sort()) {
    const sectionId = path.basename(file, '.liquid');
    const { source: liquid, schema } = schemaForSection(file);
    const manifest = sectionManifest.get(sectionId);
    const topSettings = (schema.settings || [])
      .filter((setting) => setting.id && !nonSettings.has(setting.type))
      .map((setting) => normalizeSetting(setting, sourceFor(themeSource(`sections/${file}`), setting.id), { section_id: sectionId }, settingMetadata));
    const blocks = (schema.blocks || []).map((block) => {
      const blockSettings = (block.settings || [])
        .filter((setting) => setting.id && !nonSettings.has(setting.type))
        .map((setting) => normalizeSetting(setting, sourceFor(themeSource(`sections/${file}`), setting.id, { block_type: block.type }), { section_id: sectionId, block_type: block.type }, settingMetadata));
      return {
        block_type: block.type,
        name: block.name || block.type,
        limit: block.limit || null,
        settings: blockSettings,
        source: { file: themeSource(`sections/${file}`), block_type: block.type }
      };
    });
    const allSettings = [...topSettings, ...blocks.flatMap((block) => block.settings)];
    const dependencies = dependenciesFor(liquid);
    const entry = {
      section_id: sectionId,
      name: schema.name,
      purpose: manifest?.purpose || 'No dedicated manifest purpose is currently cataloged; use the real schema and rendered section implementation.',
      supported_blocks: blocks.map((block) => ({ block_type: block.block_type, name: block.name, limit: block.limit, source: block.source })),
      supports_app_blocks: blocks.some((block) => block.block_type === '@app'),
      supported_layouts: layoutsFor(topSettings),
      presets: (schema.presets || []).map((preset) => ({ name: preset.name, blocks: (preset.blocks || []).map((block) => block.type), source: { file: themeSource(`sections/${file}`), preset: preset.name } })),
      available_settings: topSettings,
      blocks,
      required_settings: [],
      required_settings_basis: 'Shopify section schemas do not encode a general required-setting flag; merchant-required fields are classified separately from real setting types and existing safety metadata.',
      optional_settings: topSettings.map((setting) => setting.setting_id),
      dependencies,
      performance_cost: manifest?.performance_cost || 'unknown',
      merchant_required_fields: requirementFields(allSettings),
      ai_configurable_fields: allSettings.filter((setting) => setting.ai_configurable).map((setting) => setting.setting_id),
      merchant_only_fields: allSettings.filter((setting) => setting.merchant_only).map((setting) => setting.setting_id),
      source: { file: themeSource(`sections/${file}`), schema_name: schema.name }
    };
    sectionCapabilities.push(entry);
    for (const setting of topSettings) {
      const id = fieldId(sectionId, null, setting.setting_id);
      contentFields.push({ field_id: id, scope: 'section', section_id: sectionId, block_type: null, ...setting });
      safeDefaults.push({ field_id: id, scope: 'section', section_id: sectionId, block_type: null, ...automaticDefault(setting), source: setting.source });
    }
    for (const block of blocks) {
      for (const setting of block.settings) {
        const id = fieldId(sectionId, block.block_type, setting.setting_id);
        contentFields.push({ field_id: id, scope: 'block', section_id: sectionId, block_type: block.block_type, ...setting });
        safeDefaults.push({ field_id: id, scope: 'block', section_id: sectionId, block_type: block.block_type, ...automaticDefault(setting), source: setting.source });
      }
    }
  }

  for (const setting of globalSettings) {
    const id = `global.${setting.setting_id}`;
    contentFields.push({ field_id: id, scope: 'global', section_id: null, block_type: null, ...setting });
    safeDefaults.push({ field_id: id, scope: 'global', section_id: null, block_type: null, ...automaticDefault(setting), source: setting.source });
  }
  sectionCapabilities.sort((a, b) => a.section_id.localeCompare(b.section_id));
  contentFields.sort((a, b) => a.field_id.localeCompare(b.field_id));
  safeDefaults.sort((a, b) => a.field_id.localeCompare(b.field_id));

  const sectionMap = new Map(sectionCapabilities.map((entry) => [entry.section_id, entry]));
  const sectionMappings = [];
  const addMappings = (entries, type, file, key) => {
    for (const entry of entries) {
      const sectionIds = entry[key] || [];
      sectionMappings.push({
        mapping_id: `${type}.${entry.id}`,
        mapping_type: type,
        source: { file, id: entry.id },
        name: entry.name,
        sections: sectionIds.map((sectionId, index) => {
          const capability = sectionMap.get(sectionId);
          return {
            section_id: sectionId,
            priority: index + 1,
            recommended_position: index === 0 ? 'opening' : index === sectionIds.length - 1 ? 'closing' : 'middle',
            required: false,
            optional: true,
            fallback_section: null,
            dependencies: capability?.dependencies || { snippets: [], assets: [] },
            source: { file: themeSource(`sections/${sectionId}.liquid`), section_id: sectionId }
          };
        })
      });
    }
  };
  addMappings(recipes, 'layout_recipe', 'config/layout-recipes.json', 'section_sequence');
  addMappings(blueprints, 'page_blueprint', 'config/page-blueprints.json', 'recommended_sections');

  writeJson('config/theme-global-settings-map.json', {
    schema_version: version,
    catalog_version: version,
    compatible_compiler_versions: compatibility,
    catalog_id: 'theme_global_settings_map',
    description: 'Generated from apps/theme/config/settings_schema.json. Every entry retains its source setting ID and group.',
    global_settings: globalSettings
  });
  writeJson('config/theme-section-capabilities.json', {
    schema_version: version,
    catalog_version: version,
    compatible_compiler_versions: compatibility,
    catalog_id: 'theme_section_capabilities',
    description: 'Generated from every installed apps/theme/sections/*.liquid Shopify schema and enriched only with existing Calinium metadata.',
    sections: sectionCapabilities
  });
  writeJson('config/theme-content-classification.json', {
    schema_version: version,
    catalog_version: version,
    compatible_compiler_versions: compatibility,
    catalog_id: 'theme_content_classification',
    description: 'Generated safety classification for every real global, section, and block setting. Existing Calinium setting metadata takes precedence.',
    fields: contentFields
  });
  writeJson('config/theme-safe-defaults.json', {
    schema_version: version,
    catalog_version: version,
    compatible_compiler_versions: compatibility,
    catalog_id: 'theme_safe_defaults',
    description: 'Generated automation disposition for every real global, section, and block setting. Values are schema defaults only; no merchant content is generated.',
    fields: safeDefaults
  });
  writeJson('config/strategy-section-mapping.json', {
    schema_version: version,
    catalog_version: version,
    compatible_compiler_versions: compatibility,
    catalog_id: 'strategy_section_mapping',
    description: 'Traceable homepage recipe and blueprint mappings to currently installed section capabilities.',
    mappings: sectionMappings
  });

  const mappings = readJson('config/strategy-setting-mapping.json').mappings;
  const counts = { full: 0, partial: 0, unsupported: 0 };
  for (const mapping of mappings) counts[mapping.support_status] += 1;
  const mapped = counts.full + counts.partial;
  writeJson('config/theme-mapping-coverage.json', {
    schema_version: version,
    catalog_version: version,
    compatible_compiler_versions: compatibility,
    catalog_id: 'theme_mapping_coverage',
    compiler_decisions_total: mappings.length,
    fully_mapped: counts.full,
    partially_mapped: counts.partial,
    unsupported: counts.unsupported,
    global_settings_audited: globalSettings.length,
    section_settings_audited: contentFields.filter((field) => field.scope !== 'global').length,
    classified_settings: contentFields.length,
    coverage_percentage: Number(((mapped / mappings.length) * 100).toFixed(1)),
    source: { file: 'config/strategy-setting-mapping.json' }
  });
  writeJson('config/draft-builder-readiness.json', {
    schema_version: version,
    catalog_version: version,
    compatible_compiler_versions: compatibility,
    catalog_id: 'draft_builder_readiness',
    description: 'Readiness assessment for a future Strategy-to-Draft Configuration Builder. It does not create any storefront configuration.',
    decisions: mappings.map((mapping) => ({
      decision_id: mapping.decision_id,
      readiness: mapping.support_status === 'full' ? 'YES' : mapping.support_status === 'partial' ? 'PARTIAL' : 'NO',
      explanation: mapping.reason,
      source: mapping.source
    }))
  });

  console.log(`Generated mapping catalogs: ${globalSettings.length} global settings, ${sectionCapabilities.length} sections, ${contentFields.length} classified fields, ${mappings.length} compiler decisions.`);
}

main();
