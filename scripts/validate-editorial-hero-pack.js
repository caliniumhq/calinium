#!/usr/bin/env node

/*
 * Development-only checks for the additive Editorial & Hero Pack. Shopify
 * section schemas are static JSON, so this guards the cross-file contracts
 * that Theme Check cannot fully compare: schema translations, IDs, presets,
 * names, and local asset/snippet references.
 */
const fs = require('fs');
const path = require('path');
const { repositoryPaths } = require('./lib/repository-paths');

const root = path.resolve(__dirname, '..');
const paths = repositoryPaths(root);
const sections = [
  'editorial-hero',
  'split-hero',
  'full-screen-hero',
  'video-hero',
  'lookbook',
  'image-mosaic',
  'story-banner',
  'editorial-grid',
  'quote-banner',
  'brand-manifesto'
];
const schemaLocale = JSON.parse(fs.readFileSync(path.join(paths.themeRoot, 'locales/en.default.schema.json'), 'utf8'));
const storefrontLocale = JSON.parse(fs.readFileSync(path.join(paths.themeRoot, 'locales/en.default.json'), 'utf8'));
const errors = [];

function translation(source, key) {
  return key.split('.').reduce((value, part) => value && value[part], source);
}

function schemaFor(file) {
  const source = fs.readFileSync(path.join(paths.themeRoot, 'sections', `${file}.liquid`), 'utf8');
  const match = source.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  if (!match) throw new Error(`sections/${file}.liquid has no schema`);
  return { source, schema: JSON.parse(match[1]) };
}

function walk(value, callback) {
  if (Array.isArray(value)) value.forEach((item) => walk(item, callback));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => walk(item, callback));
  else callback(value);
}

function checkSettingIds(settings, context) {
  const ids = (settings || []).map((setting) => setting.id).filter(Boolean);
  if (ids.length !== new Set(ids).size) errors.push(`${context} has duplicate setting IDs`);
}

const displayNames = new Set();

for (const name of sections) {
  let source;
  let schema;
  try {
    ({ source, schema } = schemaFor(name));
  } catch (error) {
    errors.push(error.message);
    continue;
  }

  if (!schema.name || !Array.isArray(schema.presets) || schema.presets.length === 0) errors.push(`${name} must include a name and at least one preset`);
  if (schema.max_blocks && schema.max_blocks > 8) errors.push(`${name} exceeds the editorial pack block limit`);
  checkSettingIds(schema.settings, `${name} section settings`);
  (schema.blocks || []).forEach((block) => checkSettingIds(block.settings, `${name}:${block.type}`));

  walk(schema, (value) => {
    if (typeof value !== 'string' || !value.startsWith('t:')) return;
    const key = value.slice(2);
    if (typeof translation(schemaLocale, key) !== 'string') errors.push(`${name} references a missing or non-string schema translation: ${key}`);
  });

  const sectionName = typeof schema.name === 'string' && schema.name.startsWith('t:') ? translation(schemaLocale, schema.name.slice(2)) : schema.name;
  if (displayNames.has(sectionName)) errors.push(`${name} has a duplicate section display name: ${sectionName}`);
  displayNames.add(sectionName);

  for (const snippet of source.matchAll(/\{%-?\s*render\s+['"]([^'"]+)['"]/g)) {
    if (!fs.existsSync(path.join(paths.themeRoot, 'snippets', `${snippet[1]}.liquid`))) errors.push(`${name} renders missing snippet ${snippet[1]}`);
  }
  for (const asset of source.matchAll(/\{\{\s*['"]([^'"]+)['"]\s*\|\s*asset_url/g)) {
    if (!fs.existsSync(path.join(paths.themeRoot, 'assets', asset[1]))) errors.push(`${name} references missing asset ${asset[1]}`);
  }
}

for (const key of [
  'sections.full_screen_hero.play', 'sections.full_screen_hero.pause',
  'sections.video_hero.play', 'sections.video_hero.pause',
  'sections.lookbook.empty', 'sections.image_mosaic.empty', 'sections.editorial_grid.empty'
]) {
  if (typeof translation(storefrontLocale, key) !== 'string') errors.push(`missing storefront translation: ${key}`);
}

if (errors.length) {
  console.error(`Editorial & Hero Pack validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(`Editorial & Hero Pack validation passed: ${sections.length} sections, unique display names, valid presets, translations, IDs, assets, and snippets.`);
