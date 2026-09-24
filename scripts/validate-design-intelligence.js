#!/usr/bin/env node

/* Development-only validation for Calinium's AI design intelligence foundation. */
const fs = require('fs');
const path = require('path');
const { repositoryPaths } = require('./lib/repository-paths');

const root = path.resolve(__dirname, '..');
const paths = repositoryPaths(root);
const schemaCache = new Map();
const errors = [];
const catalogs = {
  designLanguages: { config: 'config/design-language.json', schema: 'schemas/design-language.schema.json', collection: 'items' },
  industries: { config: 'config/industry-profiles.json', schema: 'schemas/industry-profiles.schema.json', collection: 'items' },
  recipes: { config: 'config/layout-recipes.json', schema: 'schemas/layout-recipes.schema.json', collection: 'items' },
  typography: { config: 'config/typography-profiles.json', schema: 'schemas/typography-profiles.schema.json', collection: 'items' },
  spacing: { config: 'config/spacing-profiles.json', schema: 'schemas/spacing-profiles.schema.json', collection: 'items' },
  colors: { config: 'config/color-strategies.json', schema: 'schemas/color-strategies.schema.json', collection: 'items' },
  images: { config: 'config/image-styles.json', schema: 'schemas/image-styles.schema.json', collection: 'items' },
  animation: { config: 'config/animation-profiles.json', schema: 'schemas/animation-profiles.schema.json', collection: 'items' },
  conversion: { config: 'config/conversion-strategies.json', schema: 'schemas/conversion-strategies.schema.json', collection: 'items' },
  personalities: { config: 'config/brand-personality.json', schema: 'schemas/brand-personality.schema.json', collection: 'items' },
  blueprints: { config: 'config/page-blueprints.json', schema: 'schemas/page-blueprints.schema.json', collection: 'items' },
  rules: { config: 'config/design-rules.json', schema: 'schemas/design-rules.schema.json', collection: 'rules' },
  compatibility: { config: 'config/compatibility-matrix.json', schema: 'schemas/compatibility-matrix.schema.json', collection: 'entries' }
};

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}
function fail(message) { errors.push(message); }
function loadSchema(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (!schemaCache.has(absolutePath)) schemaCache.set(absolutePath, JSON.parse(fs.readFileSync(absolutePath, 'utf8')));
  return schemaCache.get(absolutePath);
}
function pointerValue(object, fragment) {
  return fragment.replace(/^#\//, '').split('/').reduce((value, key) => value && value[key.replace(/~1/g, '/').replace(/~0/g, '~')], object);
}
function resolveReference(reference, schemaPath) {
  const [filePart, fragment = ''] = reference.split('#');
  const referencePath = filePart ? path.resolve(path.dirname(schemaPath), filePart) : schemaPath;
  const schema = loadSchema(path.relative(root, referencePath));
  return { schema: fragment ? pointerValue(schema, `#${fragment}`) : schema, schemaPath: referencePath };
}
function matchesType(value, type) {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  return typeof value === type;
}
function validateSchema(value, schema, schemaPath, location) {
  if (!schema || typeof schema !== 'object') { fail(`${location} has an unresolved schema reference`); return; }
  if (schema.$ref) {
    const resolved = resolveReference(schema.$ref, schemaPath);
    validateSchema(value, resolved.schema, resolved.schemaPath, location);
    return;
  }
  for (const part of schema.allOf || []) validateSchema(value, part, schemaPath, location);
  if (schema.type && !matchesType(value, schema.type)) { fail(`${location} must be a ${schema.type}`); return; }
  if (Object.hasOwn(schema, 'const') && value !== schema.const) fail(`${location} must equal ${schema.const}`);
  if (schema.enum && !schema.enum.includes(value)) fail(`${location} has an invalid enum value`);
  if (schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)) fail(`${location} does not match ${schema.pattern}`);
  if (schema.minLength && typeof value === 'string' && value.length < schema.minLength) fail(`${location} is too short`);
  if (schema.minimum !== undefined && typeof value === 'number' && value < schema.minimum) fail(`${location} is below its minimum`);
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) fail(`${location} has too few items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) fail(`${location} has too many items`);
    if (schema.items) value.forEach((item, index) => validateSchema(item, schema.items, schemaPath, `${location}[${index}]`));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required || []) if (!(key in value)) fail(`${location} is missing required field ${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties?.[key]) validateSchema(item, schema.properties[key], schemaPath, `${location}.${key}`);
      else if (schema.additionalProperties === false) fail(`${location} has unsupported field ${key}`);
    }
  }
}
function ids(items, catalogName) {
  const values = new Set();
  for (const item of items) {
    if (!item.id && !item.section_id) { fail(`${catalogName} has an entry without an ID`); continue; }
    const id = item.id || item.section_id;
    if (values.has(id)) fail(`${catalogName} has duplicate ID ${id}`);
    values.add(id);
  }
  return values;
}
function checkReferences(values, target, location) {
  for (const value of values || []) if (!target.has(value)) fail(`${location} references unknown ${value}`);
}
function checkReference(value, target, location) {
  if (!target.has(value)) fail(`${location} references unknown ${value}`);
}
function duplicates(values, location) {
  if (new Set(values || []).size !== (values || []).length) fail(`${location} has duplicate values`);
}

const data = {};
for (const [name, catalog] of Object.entries(catalogs)) {
  try {
    data[name] = readJson(catalog.config);
    const schemaPath = path.resolve(root, catalog.schema);
    validateSchema(data[name], loadSchema(catalog.schema), schemaPath, catalog.config);
    ids(data[name][catalog.collection], name);
  } catch (error) {
    fail(`${catalog.config} could not be parsed or validated: ${error.message}`);
    data[name] = { [catalog.collection]: [] };
  }
}

const known = Object.fromEntries(Object.entries(catalogs).map(([name, catalog]) => [name, ids(data[name][catalog.collection], name)]));
const knownSections = new Set(fs.readdirSync(path.join(paths.themeRoot, 'sections'))
  .filter((file) => file.endsWith('.liquid'))
  .map((file) => path.basename(file, '.liquid')));
const manifest = readJson('config/calinium-section-manifest.json');
for (const entry of manifest.sections || []) checkReference(entry.id, knownSections, `section manifest ${entry.id}`);

for (const item of data.designLanguages.items) {
  checkReference(item.recommended_spacing, known.spacing, `design language ${item.id}.recommended_spacing`);
  checkReference(item.recommended_typography, known.typography, `design language ${item.id}.recommended_typography`);
  checkReference(item.recommended_motion, known.animation, `design language ${item.id}.recommended_motion`);
  checkReference(item.recommended_image_style, known.images, `design language ${item.id}.recommended_image_style`);
  checkReference(item.recommended_color_strategy, known.colors, `design language ${item.id}.recommended_color_strategy`);
  checkReferences(item.compatible_personalities, known.personalities, `design language ${item.id}.compatible_personalities`);
}
for (const item of data.industries.items) {
  checkReferences(item.preferred_design_languages, known.designLanguages, `industry ${item.id}.preferred_design_languages`);
  checkReference(item.preferred_typography, known.typography, `industry ${item.id}.preferred_typography`);
  checkReference(item.spacing_profile, known.spacing, `industry ${item.id}.spacing_profile`);
  checkReference(item.color_strategy, known.colors, `industry ${item.id}.color_strategy`);
  checkReference(item.photography_style, known.images, `industry ${item.id}.photography_style`);
  checkReference(item.recommended_homepage_recipe, known.recipes, `industry ${item.id}.recommended_homepage_recipe`);
  checkReferences(item.recommended_sections, knownSections, `industry ${item.id}.recommended_sections`);
  checkReferences(item.preferred_personalities, known.personalities, `industry ${item.id}.preferred_personalities`);
  duplicates(item.recommended_sections, `industry ${item.id}.recommended_sections`);
}
for (const item of data.recipes.items) {
  checkReferences(item.appropriate_industries, known.industries, `recipe ${item.id}.appropriate_industries`);
  checkReference(item.design_language, known.designLanguages, `recipe ${item.id}.design_language`);
  checkReference(item.typography, known.typography, `recipe ${item.id}.typography`);
  checkReference(item.spacing, known.spacing, `recipe ${item.id}.spacing`);
  checkReference(item.color_strategy, known.colors, `recipe ${item.id}.color_strategy`);
  checkReference(item.image_style, known.images, `recipe ${item.id}.image_style`);
  checkReference(item.animation, known.animation, `recipe ${item.id}.animation`);
  checkReference(item.conversion_strategy, known.conversion, `recipe ${item.id}.conversion_strategy`);
  checkReferences(item.section_sequence, knownSections, `recipe ${item.id}.section_sequence`);
  duplicates(item.section_sequence, `recipe ${item.id}.section_sequence`);
  if (item.section_sequence.length > item.maximum_sections) fail(`recipe ${item.id} exceeds its maximum section count`);
}
for (const item of data.colors.items) checkReferences(item.compatible_design_languages, known.designLanguages, `color strategy ${item.id}.compatible_design_languages`);
for (const item of data.personalities.items) {
  checkReference(item.typography, known.typography, `personality ${item.id}.typography`);
  checkReference(item.spacing, known.spacing, `personality ${item.id}.spacing`);
  checkReference(item.animation, known.animation, `personality ${item.id}.animation`);
  checkReference(item.imagery, known.images, `personality ${item.id}.imagery`);
  checkReferences(item.section_selection_bias, knownSections, `personality ${item.id}.section_selection_bias`);
}
for (const item of data.blueprints.items) {
  checkReferences(item.recommended_sections, knownSections, `blueprint ${item.id}.recommended_sections`);
  checkReferences(item.default_layout_recipes, known.recipes, `blueprint ${item.id}.default_layout_recipes`);
  duplicates(item.recommended_sections, `blueprint ${item.id}.recommended_sections`);
}
for (const rule of data.rules.rules) {
  checkReferences(rule.applies_to_design_languages, known.designLanguages, `rule ${rule.id}.applies_to_design_languages`);
  checkReferences(rule.applies_to_industries, known.industries, `rule ${rule.id}.applies_to_industries`);
}
for (const entry of data.compatibility.entries) {
  checkReference(entry.section_id, knownSections, `compatibility ${entry.section_id}`);
  for (const [field, values] of Object.entries({ works_with: entry.works_with, avoid_directly_before: entry.avoid_directly_before, avoid_directly_after: entry.avoid_directly_after })) {
    checkReferences(values, knownSections, `compatibility ${entry.section_id}.${field}`);
    duplicates(values, `compatibility ${entry.section_id}.${field}`);
  }
  const incompatible = new Set([...entry.avoid_directly_before, ...entry.avoid_directly_after]);
  for (const section of entry.works_with) if (incompatible.has(section)) fail(`compatibility ${entry.section_id} both supports and avoids ${section}`);
}

for (const file of ['docs/ai/design-intelligence.md', 'docs/ai/design-decision-trees.md', 'docs/ai/prompt-guidelines.md', 'docs/ai/examples/design-intelligence-decisions.json']) {
  if (!fs.existsSync(path.join(root, file))) fail(`missing required documentation or example ${file}`);
}
try {
  const examples = readJson('docs/ai/examples/design-intelligence-decisions.json');
  if (examples.version !== 1 || !Array.isArray(examples.examples) || examples.examples.length < 3) fail('design intelligence examples need version 1 and at least three examples');
  const exampleIds = new Set();
  for (const example of examples.examples || []) {
    if (!example.id || exampleIds.has(example.id)) fail(`design intelligence examples have a missing or duplicate ID ${example.id || '(missing)'}`);
    exampleIds.add(example.id);
    const input = example.merchant_input || {};
    const selection = example.ai_selection || {};
    checkReference(input.industry, known.industries, `example ${example.id}.merchant_input.industry`);
    checkReferences(input.brand_personalities, known.personalities, `example ${example.id}.merchant_input.brand_personalities`);
    checkReference(selection.design_language, known.designLanguages, `example ${example.id}.ai_selection.design_language`);
    checkReference(selection.typography, known.typography, `example ${example.id}.ai_selection.typography`);
    checkReference(selection.spacing, known.spacing, `example ${example.id}.ai_selection.spacing`);
    checkReference(selection.color_strategy, known.colors, `example ${example.id}.ai_selection.color_strategy`);
    checkReference(selection.image_style, known.images, `example ${example.id}.ai_selection.image_style`);
    checkReference(selection.animation, known.animation, `example ${example.id}.ai_selection.animation`);
    checkReference(selection.conversion_strategy, known.conversion, `example ${example.id}.ai_selection.conversion_strategy`);
    checkReference(selection.layout_recipe, known.recipes, `example ${example.id}.ai_selection.layout_recipe`);
    checkReferences(selection.section_sequence, knownSections, `example ${example.id}.ai_selection.section_sequence`);
    if (!Array.isArray(example.merchant_confirmation_required) || example.merchant_confirmation_required.length === 0) fail(`example ${example.id} needs merchant confirmation requirements`);
  }
} catch (error) {
  fail(`design intelligence examples could not be parsed or validated: ${error.message}`);
}
if (!data.rules.rules.some((rule) => rule.id === 'truthful_urgency_only')) fail('design rules must include factual-claim protection');

if (errors.length) {
  console.error(`Design intelligence validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Design intelligence validation passed: ${data.designLanguages.items.length} languages, ${data.industries.items.length} industries, ${data.recipes.items.length} recipes, ${knownSections.size} available section IDs, and ${Object.keys(catalogs).length} validated catalogs.`);
