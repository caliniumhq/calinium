#!/usr/bin/env node

/* Development-only validation for Calinium Milestone 6A theme capability mapping. */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { repositoryPaths, themePath } = require('./lib/repository-paths');
const { resolvePreservationBackup, resolveThemeRuntimeBaseline, archiveFile } = require('./lib/preservation-backup');
const { runtimeInventory } = require('./lib/theme-runtime-integrity');

const root = path.resolve(__dirname, '..');
const paths = repositoryPaths(root);
const errors = [];
const compilerVersion = '1.0.0';
const mappingCatalogs = [
  ['config/theme-capabilities.json', 'schemas/theme-capabilities.schema.json'],
  ['config/theme-global-settings-map.json', 'schemas/theme-global-settings-map.schema.json'],
  ['config/theme-section-capabilities.json', 'schemas/theme-section-capabilities.schema.json'],
  ['config/strategy-setting-mapping.json', 'schemas/strategy-setting-mapping.schema.json'],
  ['config/strategy-section-mapping.json', 'schemas/strategy-section-mapping.schema.json'],
  ['config/theme-safe-defaults.json', 'schemas/theme-safe-defaults.schema.json'],
  ['config/theme-content-classification.json', 'schemas/theme-content-classification.schema.json'],
  ['config/theme-mapping-coverage.json', 'schemas/theme-mapping-coverage.schema.json'],
  ['config/draft-builder-readiness.json', 'schemas/draft-builder-readiness.schema.json']
];

function fail(message) { errors.push(message); }
function readJson(file) { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
function readThemeJson(file) { return JSON.parse(fs.readFileSync(themePath(root, file), 'utf8')); }
function unique(values, location) { if (new Set(values).size !== values.length) fail(`${location} contains duplicate IDs`); }
function exists(relativePath) { return fs.existsSync(path.join(root, relativePath)); }

function schemaFromSection(file) {
  const source = fs.readFileSync(path.join(paths.themeRoot, 'sections', file), 'utf8');
  const match = source.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  if (!match) throw new Error(`apps/theme/sections/${file} has no schema`);
  return JSON.parse(match[1]);
}

function sourceExists(source, context) {
  if (!source || typeof source.file !== 'string') { fail(`${context} has no source.file`); return; }
  if (!exists(source.file)) { fail(`${context} references missing source ${source.file}`); return; }
  if (source.file === 'apps/theme/config/settings_schema.json' && source.setting_id && !globalSettings.has(source.setting_id)) fail(`${context} source setting ${source.setting_id} is not a real global setting`);
  if (source.file.startsWith('apps/theme/sections/') && source.setting_id) {
    const sectionId = path.basename(source.file, '.liquid');
    const expected = source.block_type ? `${sectionId}.${source.block_type}.${source.setting_id}` : `${sectionId}.${source.setting_id}`;
    if (!sectionSettings.has(expected)) fail(`${context} source setting ${expected} is not a real section setting`);
  }
}

const allGlobalSchema = readThemeJson('config/settings_schema.json');
const globalSettings = new Map();
for (const group of allGlobalSchema) for (const setting of group.settings || []) if (setting.id && !['header', 'paragraph'].includes(setting.type)) globalSettings.set(setting.id, setting);
const installedSections = new Map();
const sectionSettings = new Map();
for (const file of fs.readdirSync(path.join(paths.themeRoot, 'sections')).filter((entry) => entry.endsWith('.liquid')).sort()) {
  const id = path.basename(file, '.liquid');
  let schema;
  try { schema = schemaFromSection(file); } catch (error) { fail(error.message); continue; }
  installedSections.set(id, { file, schema });
  for (const setting of schema.settings || []) if (setting.id && !['header', 'paragraph'].includes(setting.type)) sectionSettings.set(`${id}.${setting.id}`, setting);
  for (const block of schema.blocks || []) for (const setting of block.settings || []) if (setting.id && !['header', 'paragraph'].includes(setting.type)) sectionSettings.set(`${id}.${block.type}.${setting.id}`, setting);
}
const decisionKeys = Object.keys(readJson('schemas/calinium-storefront-strategy.schema.json').properties.decisions.properties);
const validator = createSchemaValidator(root);
const catalogData = new Map();

for (const [catalogFile, schemaFile] of mappingCatalogs) {
  let data;
  try { data = readJson(catalogFile); } catch (error) { fail(`${catalogFile} is not valid JSON: ${error.message}`); continue; }
  catalogData.set(catalogFile, data);
  for (const error of validator.validateFile(data, schemaFile, catalogFile)) fail(error);
  if (data.schema_version !== 1 || data.catalog_version !== 1) fail(`${catalogFile} uses unsupported catalog/schema version`);
  if (!Array.isArray(data.compatible_compiler_versions) || !data.compatible_compiler_versions.includes(compilerVersion)) fail(`${catalogFile} is incompatible with compiler ${compilerVersion}`);
}

const capabilities = catalogData.get('config/theme-capabilities.json');
const globals = catalogData.get('config/theme-global-settings-map.json');
const sections = catalogData.get('config/theme-section-capabilities.json');
const settingMapping = catalogData.get('config/strategy-setting-mapping.json');
const sectionMapping = catalogData.get('config/strategy-section-mapping.json');
const safeDefaults = catalogData.get('config/theme-safe-defaults.json');
const classifications = catalogData.get('config/theme-content-classification.json');
const coverage = catalogData.get('config/theme-mapping-coverage.json');
const readiness = catalogData.get('config/draft-builder-readiness.json');

if (capabilities) {
  unique(capabilities.capabilities.map((entry) => entry.id), 'theme capabilities');
  for (const capability of capabilities.capabilities) {
    for (const source of capability.source || []) {
      sourceExists(source, `capability ${capability.id}`);
      for (const id of source.setting_ids || []) if (!globalSettings.has(id)) fail(`capability ${capability.id} references unknown global setting ${id}`);
    }
  }
}

const globalMap = new Map();
if (globals) {
  unique(globals.global_settings.map((entry) => entry.setting_id), 'global settings map');
  for (const entry of globals.global_settings) {
    globalMap.set(entry.setting_id, entry);
    if (!globalSettings.has(entry.setting_id)) fail(`global settings map contains unknown ${entry.setting_id}`);
    sourceExists(entry.source, `global setting ${entry.setting_id}`);
  }
  if (globalMap.size !== globalSettings.size) fail(`global settings audit has ${globalMap.size} settings but the source schema has ${globalSettings.size}`);
  for (const id of globalSettings.keys()) if (!globalMap.has(id)) fail(`global settings audit is missing ${id}`);
}

const sectionMap = new Map();
const expectedFieldIds = new Set([...globalSettings.keys()].map((id) => `global.${id}`));
if (sections) {
  unique(sections.sections.map((entry) => entry.section_id), 'section capability catalog');
  for (const entry of sections.sections) {
    sectionMap.set(entry.section_id, entry);
    const actual = installedSections.get(entry.section_id);
    if (!actual) { fail(`section capability catalog contains uninstalled ${entry.section_id}`); continue; }
    sourceExists(entry.source, `section capability ${entry.section_id}`);
    const topIds = entry.available_settings.map((setting) => setting.setting_id);
    unique(topIds, `${entry.section_id} available settings`);
    for (const setting of entry.available_settings) {
      const ref = `${entry.section_id}.${setting.setting_id}`;
      if (!sectionSettings.has(ref)) fail(`${entry.section_id} has unknown setting ${setting.setting_id}`);
      sourceExists(setting.source, `${entry.section_id}.${setting.setting_id}`);
      expectedFieldIds.add(ref);
    }
    for (const block of entry.blocks || []) {
      const actualBlock = (actual.schema.blocks || []).find((candidate) => candidate.type === block.block_type);
      if (!actualBlock) { fail(`${entry.section_id} includes unknown block ${block.block_type}`); continue; }
      sourceExists(block.source, `${entry.section_id}.${block.block_type}`);
      unique((block.settings || []).map((setting) => setting.setting_id), `${entry.section_id}.${block.block_type} settings`);
      for (const setting of block.settings || []) {
        const ref = `${entry.section_id}.${block.block_type}.${setting.setting_id}`;
        if (!sectionSettings.has(ref)) fail(`${entry.section_id} block ${block.block_type} has unknown setting ${setting.setting_id}`);
        sourceExists(setting.source, `${entry.section_id}.${block.block_type}.${setting.setting_id}`);
        expectedFieldIds.add(ref);
      }
    }
    for (const snippet of entry.dependencies?.snippets || []) if (!fs.existsSync(themePath(root, `snippets/${snippet}.liquid`))) fail(`${entry.section_id} references missing snippet ${snippet}`);
    for (const asset of entry.dependencies?.assets || []) if (!fs.existsSync(themePath(root, `assets/${asset}`))) fail(`${entry.section_id} references missing asset ${asset}`);
  }
  if (sectionMap.size !== installedSections.size) fail(`section capability catalog has ${sectionMap.size} profiles but ${installedSections.size} sections are installed`);
  for (const id of installedSections.keys()) if (!sectionMap.has(id)) fail(`section capability catalog is missing ${id}`);
}

function checkFieldCatalog(catalog, label, callback) {
  if (!catalog) return;
  unique(catalog.fields.map((entry) => entry.field_id), label);
  const ids = new Set(catalog.fields.map((entry) => entry.field_id));
  for (const id of expectedFieldIds) if (!ids.has(id)) fail(`${label} is missing ${id}`);
  for (const entry of catalog.fields) {
    if (!expectedFieldIds.has(entry.field_id)) fail(`${label} contains orphan field ${entry.field_id}`);
    sourceExists(entry.source, `${label} ${entry.field_id}`);
    callback(entry);
  }
  if (ids.size !== expectedFieldIds.size) fail(`${label} has ${ids.size} fields; expected ${expectedFieldIds.size}`);
}

checkFieldCatalog(classifications, 'content classification', (entry) => {
  if (entry.merchant_only && entry.safety_level !== 'merchant_only') fail(`content classification ${entry.field_id} has merchant_only without merchant_only safety`);
  if (entry.ai_configurable && entry.merchant_only) fail(`content classification ${entry.field_id} cannot be AI configurable and merchant only`);
});
checkFieldCatalog(safeDefaults, 'safe defaults', (entry) => {
  if (entry.classification === 'safe_automatic_default' && entry.value === undefined) fail(`safe default ${entry.field_id} has no value field`);
});

if (settingMapping && capabilities && globals && sections) {
  unique(settingMapping.mappings.map((entry) => entry.id), 'strategy setting mapping');
  unique(settingMapping.mappings.map((entry) => entry.decision_id), 'strategy decision mapping');
  const capabilityIds = new Set(capabilities.capabilities.map((entry) => entry.id));
  const mappedDecisions = new Set();
  for (const mapping of settingMapping.mappings) {
    mappedDecisions.add(mapping.decision_id);
    if (!decisionKeys.includes(mapping.decision_id)) fail(`strategy setting mapping has unknown compiler decision ${mapping.decision_id}`);
    if (mapping.id !== mapping.decision_id) fail(`strategy setting mapping ${mapping.id} must use its decision ID as the stable ID`);
    sourceExists(mapping.source, `strategy decision ${mapping.decision_id}`);
    for (const id of mapping.target.capability_ids || []) if (!capabilityIds.has(id)) fail(`${mapping.decision_id} maps unknown capability ${id}`);
    for (const id of mapping.target.global_setting_ids || []) if (!globalMap.has(id)) fail(`${mapping.decision_id} maps unknown global setting ${id}`);
    for (const id of mapping.target.section_setting_refs || []) if (!sectionSettings.has(id)) fail(`${mapping.decision_id} maps unknown section setting ${id}`);
    for (const id of mapping.target.section_ids || []) if (!sectionMap.has(id)) fail(`${mapping.decision_id} maps uninstalled section ${id}`);
    if (mapping.support_status === 'full' && ![...(mapping.target.capability_ids || []), ...(mapping.target.global_setting_ids || []), ...(mapping.target.section_ids || [])].length) fail(`${mapping.decision_id} is marked full without a theme target`);
  }
  for (const decision of decisionKeys) if (!mappedDecisions.has(decision)) fail(`compiler decision ${decision} has no theme mapping`);
}

if (sectionMapping && sections) {
  unique(sectionMapping.mappings.map((entry) => entry.mapping_id), 'strategy section mappings');
  const recipeIds = new Set(readJson('config/layout-recipes.json').items.map((entry) => entry.id));
  const blueprintIds = new Set(readJson('config/page-blueprints.json').items.map((entry) => entry.id));
  for (const mapping of sectionMapping.mappings) {
    sourceExists(mapping.source, `strategy section mapping ${mapping.mapping_id}`);
    const expectedId = mapping.mapping_type === 'layout_recipe' ? mapping.mapping_id.slice('layout_recipe.'.length) : mapping.mapping_id.slice('page_blueprint.'.length);
    if (mapping.mapping_type === 'layout_recipe' && !recipeIds.has(expectedId)) fail(`${mapping.mapping_id} does not reference a real recipe`);
    if (mapping.mapping_type === 'page_blueprint' && !blueprintIds.has(expectedId)) fail(`${mapping.mapping_id} does not reference a real blueprint`);
    unique(mapping.sections.map((entry) => entry.section_id), `${mapping.mapping_id} sections`);
    mapping.sections.forEach((entry, index) => {
      if (!sectionMap.has(entry.section_id)) fail(`${mapping.mapping_id} references uninstalled ${entry.section_id}`);
      if (entry.priority !== index + 1) fail(`${mapping.mapping_id}.${entry.section_id} has non-deterministic priority`);
      sourceExists(entry.source, `${mapping.mapping_id}.${entry.section_id}`);
      for (const snippet of entry.dependencies?.snippets || []) if (!fs.existsSync(themePath(root, `snippets/${snippet}.liquid`))) fail(`${mapping.mapping_id}.${entry.section_id} has missing snippet ${snippet}`);
      for (const asset of entry.dependencies?.assets || []) if (!fs.existsSync(themePath(root, `assets/${asset}`))) fail(`${mapping.mapping_id}.${entry.section_id} has missing asset ${asset}`);
    });
  }
}

if (coverage && settingMapping && globals && classifications) {
  const count = (status) => settingMapping.mappings.filter((entry) => entry.support_status === status).length;
  const expectedCoverage = Number((((count('full') + count('partial')) / settingMapping.mappings.length) * 100).toFixed(1));
  const expectedSectionSettings = expectedFieldIds.size - globalSettings.size;
  if (coverage.compiler_decisions_total !== decisionKeys.length) fail('coverage compiler decision total does not match compiler schema');
  if (coverage.fully_mapped !== count('full') || coverage.partially_mapped !== count('partial') || coverage.unsupported !== count('unsupported')) fail('coverage mapping status totals are stale');
  if (coverage.coverage_percentage !== expectedCoverage) fail('coverage percentage is stale');
  if (coverage.global_settings_audited !== globalSettings.size || coverage.section_settings_audited !== expectedSectionSettings || coverage.classified_settings !== expectedFieldIds.size) fail('coverage audited-setting metrics are stale');
}

if (readiness && settingMapping) {
  unique(readiness.decisions.map((entry) => entry.decision_id), 'draft builder readiness');
  const statusToReadiness = { full: 'YES', partial: 'PARTIAL', unsupported: 'NO' };
  for (const mapping of settingMapping.mappings) {
    const entry = readiness.decisions.find((candidate) => candidate.decision_id === mapping.decision_id);
    if (!entry) fail(`draft builder readiness is missing ${mapping.decision_id}`);
    else if (entry.readiness !== statusToReadiness[mapping.support_status]) fail(`draft builder readiness ${mapping.decision_id} is inconsistent with mapping status`);
  }
}

const baseline = resolveThemeRuntimeBaseline(root);
const backup = baseline || resolvePreservationBackup(root, '.calinium-before-theme-capability-mapping-20260720.tgz');
if (!backup) fail('No validated theme runtime preservation baseline is available');
else {
  if (baseline) {
    const inventory = runtimeInventory(paths.themeRoot);
    if (inventory.file_count !== baseline.runtime.file_count || inventory.byte_count !== baseline.runtime.byte_count || inventory.checksum !== baseline.runtime.checksum) {
      fail(`theme runtime does not match approved ${baseline.id} baseline`);
    }
  }
  const preservedRoots = ['assets', 'layout', 'locales', 'sections', 'snippets', 'templates'];
  const preservedFiles = [
    ...preservedRoots.flatMap((directory) => fs.readdirSync(path.join(paths.themeRoot, directory)).filter((name) => fs.statSync(path.join(paths.themeRoot, directory, name)).isFile()).map((name) => `${directory}/${name}`)),
    'config/settings_data.json',
    'config/settings_schema.json'
  ];
  for (const file of preservedFiles) {
    try {
      const archived = archiveFile(backup, file, { theme: true });
      const current = fs.readFileSync(path.join(paths.themeRoot, file));
      if (!archived.equals(current)) fail(`${file} changed after the Milestone 6A backup`);
    } catch (error) { fail(`could not compare ${file} with the Milestone 6A backup`); }
  }
}

if (errors.length) {
  console.error(`Theme capability mapping validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Theme capability mapping validation passed: ${globalSettings.size} global settings, ${installedSections.size} sections, ${expectedFieldIds.size} classified fields, ${decisionKeys.length} compiler decisions, and ${coverage.coverage_percentage}% mapping coverage.`);
