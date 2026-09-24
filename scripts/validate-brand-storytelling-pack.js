#!/usr/bin/env node

/* Development-only cross-file validation for the Brand Storytelling Pack. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { repositoryPaths } = require('./lib/repository-paths');
const { resolvePreservationBackup, archiveFile } = require('./lib/preservation-backup');

const root = path.resolve(__dirname, '..');
const paths = repositoryPaths(root);
const sectionIds = ['founder-story', 'brand-timeline', 'materials', 'craftsmanship', 'manufacturing-process', 'sustainability', 'brand-values', 'team', 'awards-certifications', 'behind-the-scenes'];
const schemaLocale = readThemeJson('locales/en.default.schema.json');
const storefrontLocale = readThemeJson('locales/en.default.json');
const manifest = readJson('config/calinium-section-manifest.json');
const metadata = readJson('config/calinium-setting-metadata.json');
const taxonomy = readJson('config/calinium-block-taxonomy.json');
const manifestSchema = readJson('schemas/calinium-section-manifest.schema.json');
const errors = [];

function readJson(file) { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
function readThemeJson(file) { return JSON.parse(fs.readFileSync(path.join(paths.themeRoot, file), 'utf8')); }
function fail(message) { errors.push(message); }
function valueAt(object, dotted) { return dotted.split('.').reduce((value, key) => value && value[key], object); }
function sectionSource(id) { return fs.readFileSync(path.join(paths.themeRoot, 'sections', `${id}.liquid`), 'utf8'); }
function schemaFor(id) {
  const source = sectionSource(id);
  const match = source.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  if (!match) { fail(`${id} has no section schema`); return { source, schema: {} }; }
  try { return { source, schema: JSON.parse(match[1]) }; } catch (error) { fail(`${id} schema is invalid JSON: ${error.message}`); return { source, schema: {} }; }
}
function walk(value, callback) {
  if (Array.isArray(value)) value.forEach((item) => walk(item, callback));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => walk(item, callback));
  else callback(value);
}
function settingsById(schema) {
  return new Map([...(schema.settings || []), ...(schema.blocks || []).flatMap((block) => block.settings || [])].filter((setting) => setting.id).map((setting) => [setting.id, setting]));
}
function checkSelects(settings, context) {
  const ids = new Set();
  for (const setting of settings || []) {
    if (ids.has(setting.id)) fail(`${context} has duplicate setting ID ${setting.id}`);
    ids.add(setting.id);
    if (setting.type === 'select') {
      const values = (setting.options || []).map((option) => option.value);
      if (!values.includes(setting.default)) fail(`${context}.${setting.id} default is not in its options`);
      if (new Set(values).size !== values.length) fail(`${context}.${setting.id} has duplicate options`);
    }
  }
}
function resolveSchema(reference) {
  if (!reference.startsWith('#/')) { fail(`Unsupported schema reference ${reference}`); return {}; }
  return reference.slice(2).split('/').reduce((value, key) => value && value[key], manifestSchema) || {};
}
function matchesType(value, type) {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  return typeof value === type;
}
function validateAgainstSchema(value, schema, location) {
  if (schema.$ref) return validateAgainstSchema(value, resolveSchema(schema.$ref), location);
  if (schema.type && !matchesType(value, schema.type)) { fail(`${location} must be a ${schema.type}`); return; }
  if (Object.hasOwn(schema, 'const') && value !== schema.const) fail(`${location} must equal ${schema.const}`);
  if (schema.enum && !schema.enum.includes(value)) fail(`${location} has an invalid enum value`);
  if (schema.pattern && typeof value === 'string' && !(new RegExp(schema.pattern).test(value))) fail(`${location} does not match ${schema.pattern}`);
  if (schema.minLength && typeof value === 'string' && value.length < schema.minLength) fail(`${location} is too short`);
  if (schema.minimum !== undefined && typeof value === 'number' && value < schema.minimum) fail(`${location} is below its minimum`);
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) fail(`${location} has too few items`);
    if (schema.items) value.forEach((item, index) => validateAgainstSchema(item, schema.items, `${location}[${index}]`));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required || []) if (!(key in value)) fail(`${location} is missing required field ${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties?.[key]) validateAgainstSchema(item, schema.properties[key], `${location}.${key}`);
      else if (schema.additionalProperties === false) fail(`${location} has unsupported field ${key}`);
    }
  }
}
function assertManifestShape(entry) {
  const required = manifestSchema.$defs.section.required;
  for (const field of required) if (!(field in entry)) fail(`manifest ${entry.id || '(unknown)'} is missing ${field}`);
  if (!sectionIds.includes(entry.id)) fail(`manifest has unexpected section ID ${entry.id}`);
  if (entry.category !== 'brand_storytelling') fail(`${entry.id} has an unrecognized category`);
  if (!manifest.enums.performance_costs.includes(entry.performance_cost)) fail(`${entry.id} has invalid performance cost`);
  if (!manifest.enums.content_safety_levels.includes(entry.content_safety_level)) fail(`${entry.id} has invalid content safety level`);
  for (const group of ['highly_suitable', 'conditionally_suitable', 'generally_unsuitable']) for (const industry of entry.industry_suitability?.[group] || []) if (!manifest.enums.industries.includes(industry)) fail(`${entry.id} has uncontrolled industry ${industry}`);
}

const schemas = new Map();
validateAgainstSchema(manifest, manifestSchema, 'manifest');
for (const id of sectionIds) {
  const { source, schema } = schemaFor(id);
  schemas.set(id, schema);
  if (!schema.name || !Array.isArray(schema.presets) || schema.presets.length === 0) fail(`${id} needs a localized name and preset`);
  if ((schema.max_blocks || 0) > 12) fail(`${id} has an unreasonable block limit`);
  checkSelects(schema.settings, id);
  for (const block of schema.blocks || []) checkSelects(block.settings, `${id}:${block.type}`);
  walk(schema, (item) => { if (typeof item === 'string' && item.startsWith('t:') && typeof valueAt(schemaLocale, item.slice(2)) !== 'string') fail(`${id} has missing schema translation ${item}`); });
  for (const item of source.matchAll(/'((?:sections|accessibility)\.[a-z0-9_.-]+)'\s*\|\s*t/g)) if (typeof valueAt(storefrontLocale, item[1]) !== 'string') fail(`${id} has missing storefront translation ${item[1]}`);
  for (const item of source.matchAll(/render\s+'([^']+)'/g)) if (!fs.existsSync(path.join(paths.themeRoot, 'snippets', `${item[1]}.liquid`))) fail(`${id} references missing snippet ${item[1]}`);
  for (const item of source.matchAll(/'([^']+)'\s*\|\s*asset_url/g)) if (!fs.existsSync(path.join(paths.themeRoot, 'assets', item[1]))) fail(`${id} references missing asset ${item[1]}`);
  if ((schema.blocks || []).length && !source.includes('block.shopify_attributes')) fail(`${id} does not emit Shopify block attributes`);
  for (const item of source.matchAll(/\sid="([^"]*)"/g)) if (!item[1].includes('section.id')) fail(`${id} has a fixed HTML ID ${item[1]}`);
  if (/<svg\b|co-product-card__|cart\/add\.js/.test(source)) fail(`${id} duplicates a canonical rendering system`);
}

const manifestIds = manifest.sections.map((entry) => entry.id);
if (new Set(manifestIds).size !== manifestIds.length) fail('manifest contains duplicate IDs');
if (manifestIds.length !== sectionIds.length || sectionIds.some((id) => !manifestIds.includes(id))) fail('manifest does not have exactly one entry per Brand Storytelling section');
const taxonomyIds = taxonomy.blocks.map((block) => block.id);
if (new Set(taxonomyIds).size !== taxonomyIds.length) fail('block taxonomy contains duplicate IDs');
const dependencyAliases = new Set(['scroll-carousel']);
for (const entry of manifest.sections) {
  assertManifestShape(entry);
  const schema = schemas.get(entry.id);
  const sectionBlockTypes = new Set((schema.blocks || []).map((block) => block.type));
  for (const block of entry.supported_blocks || []) {
    if (!sectionBlockTypes.has(block)) fail(`${entry.id} manifest block ${block} is not in its schema`);
    if (!taxonomyIds.includes(block)) fail(`${entry.id} manifest block ${block} is missing taxonomy`);
  }
  for (const dependency of entry.dependencies || []) if (!dependencyAliases.has(dependency) && !fs.existsSync(path.join(paths.themeRoot, 'snippets', `${dependency}.liquid`))) fail(`${entry.id} references missing dependency ${dependency}`);
}

const metadataIds = metadata.sections.map((entry) => entry.section_id);
if (new Set(metadataIds).size !== metadataIds.length || sectionIds.some((id) => !metadataIds.includes(id))) fail('setting metadata does not have one entry per section');
for (const entry of metadata.sections) {
  if (!sectionIds.includes(entry.section_id)) fail(`metadata has unexpected section ${entry.section_id}`);
  const sectionSettings = new Set((schemas.get(entry.section_id).settings || []).map((setting) => setting.id));
  for (const [id, item] of Object.entries(entry.settings || {})) {
    if (!sectionSettings.has(id)) fail(`metadata ${entry.section_id}.${id} is not a section setting`);
    for (const required of ['semantic_role', 'ai_populatable', 'merchant_confirmation', 'factual', 'content_type', 'content_safety_level', 'visual_impact', 'mobile_impact', 'required_assets', 'safe_fallback']) if (!(required in item)) fail(`metadata ${entry.section_id}.${id} missing ${required}`);
    if (!metadata.content_safety_levels.includes(item.content_safety_level)) fail(`metadata ${entry.section_id}.${id} has invalid safety level`);
  }
}

const examplesDirectory = path.join(root, 'docs', 'ai', 'examples', 'sections');
for (const id of sectionIds) {
  for (const mode of ['minimal', 'rich']) {
    const file = path.join(examplesDirectory, `${id}.${mode}.json`);
    if (!fs.existsSync(file)) { fail(`missing ${mode} example for ${id}`); continue; }
    let example;
    try { example = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`${path.basename(file)} is invalid JSON`); continue; }
    if (example.section_id !== id || example.mode !== mode) fail(`${path.basename(file)} has invalid identity`);
    const schema = schemas.get(id);
    const settings = new Map((schema.settings || []).map((setting) => [setting.id, setting]));
    for (const [key, value] of Object.entries(example.settings || {})) {
      const setting = settings.get(key);
      if (!setting) { fail(`${path.basename(file)} has unknown setting ${key}`); continue; }
      if (setting.type === 'select' && value !== null && !(setting.options || []).some((option) => option.value === value)) fail(`${path.basename(file)} has invalid ${key} value ${value}`);
    }
    for (const block of example.blocks || []) {
      const definition = (schema.blocks || []).find((item) => item.type === block.type);
      if (!definition) { fail(`${path.basename(file)} has unknown block type ${block.type}`); continue; }
      for (const [key, value] of Object.entries(block.settings || {})) {
        const setting = (definition.settings || []).find((item) => item.id === key);
        if (!setting) { fail(`${path.basename(file)} has unknown ${block.type} setting ${key}`); continue; }
        if (setting.type === 'select' && value !== null && !(setting.options || []).some((option) => option.value === value)) fail(`${path.basename(file)} has invalid ${block.type}.${key} value ${value}`);
      }
    }
  }
}

const backup = resolvePreservationBackup(root, '.calinium-before-brand-storytelling-pack-20260719.tgz');
if (!backup) fail('Brand Storytelling preservation backup archive is missing');
else for (const file of [...fs.readdirSync(path.join(paths.themeRoot, 'templates')).map((name) => `templates/${name}`), 'config/settings_data.json']) {
  try {
    const archived = archiveFile(backup, file, { theme: true });
    const current = fs.readFileSync(path.join(paths.themeRoot, file));
    if (!archived.equals(current)) fail(`${file} changed after the Pack 3 backup`);
  } catch (error) { fail(`could not verify ${file} against backup`); }
}

if (errors.length) { console.error(`Brand Storytelling Pack validation failed:\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`Brand Storytelling Pack validation passed: ${sectionIds.length} sections, manifest, metadata, taxonomy, examples, and merchant-data preservation.`);
