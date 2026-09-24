#!/usr/bin/env node

/*
 * Canonical merchant-facing icon registry for static Shopify section schemas.
 * Shopify schemas cannot evaluate Liquid, so each selector copies this ordered
 * registry. This script prevents it from drifting away from icon.liquid.
 */
const fs = require('fs');
const path = require('path');
const { repositoryPaths } = require('./lib/repository-paths');

const root = path.resolve(__dirname, '..');
const paths = repositoryPaths(root);
const originalSix = ['truck', 'shield', 'leaf', 'heart', 'star', 'globe'];
const selectorIds = new Set(['icon', 'icon_name', 'selected_icon', 'feature_icon']);
const selectorsThatAllowNone = new Set([
  'marquee.liquid:block:item:icon',
  'multicolumn.liquid:block:column:icon'
]);

const iconOptions = [
  ['cart', 'Cart'], ['bag', 'Bag'], ['package', 'Package'], ['truck', 'Truck'], ['return', 'Return'], ['exchange', 'Exchange'], ['receipt', 'Receipt'], ['tag', 'Tag'], ['gift', 'Gift'], ['discount', 'Discount'], ['box', 'Box'], ['credit-card', 'Credit card'], ['storefront', 'Storefront'],
  ['shield', 'Shield'], ['shield-check', 'Shield check'], ['verified', 'Verified'], ['lock', 'Lock'], ['certificate', 'Certificate'], ['medal', 'Medal'], ['guarantee', 'Guarantee'], ['key', 'Key'],
  ['arrow-left', 'Arrow left'], ['arrow-right', 'Arrow right'], ['arrow-up', 'Arrow up'], ['arrow-down', 'Arrow down'], ['chevron-left', 'Chevron left'], ['chevron-right', 'Chevron right'], ['chevron-up', 'Chevron up'], ['chevron-down', 'Chevron down'], ['plus', 'Plus'], ['minus', 'Minus'], ['close', 'Close'], ['menu', 'Menu'], ['search', 'Search'], ['filter', 'Filter'], ['external-link', 'External link'], ['more-horizontal', 'More horizontal'], ['more-vertical', 'More vertical'], ['check', 'Check'], ['info', 'Info'], ['alert', 'Alert'], ['eye', 'Eye'], ['eye-off', 'Eye off'], ['trash', 'Trash'], ['edit', 'Edit'],
  ['heart', 'Heart'], ['star', 'Star'], ['chat', 'Chat'], ['phone', 'Phone'], ['email', 'Email'], ['share', 'Share'], ['account', 'Account'], ['bell', 'Bell'], ['bookmark', 'Bookmark'], ['thumbs-up', 'Thumbs up'], ['send', 'Send'],
  ['play', 'Play'], ['pause', 'Pause'], ['camera', 'Camera'], ['image', 'Image'], ['gallery', 'Gallery'], ['video', 'Video'], ['volume-high', 'Volume high'], ['volume-mute', 'Volume muted'], ['zoom-in', 'Zoom in'], ['zoom-out', 'Zoom out'], ['upload', 'Upload'], ['download', 'Download'],
  ['globe', 'Globe'], ['leaf', 'Leaf'], ['recycle', 'Recycle'], ['sparkle', 'Sparkle'], ['diamond', 'Diamond'], ['crown', 'Crown'], ['factory', 'Factory'], ['award', 'Award'],
  ['home', 'Home'], ['airplane', 'Airplane'], ['suitcase', 'Suitcase'], ['coffee', 'Coffee'], ['mountain', 'Mountain'], ['sun', 'Sun'], ['moon', 'Moon'], ['map-pin', 'Map pin'], ['calendar', 'Calendar'], ['clock', 'Clock'],
  ['lightning', 'Lightning'], ['ai', 'AI'], ['robot', 'Robot'], ['cloud', 'Cloud'], ['database', 'Database'], ['code', 'Code'], ['settings', 'Settings'], ['wifi', 'Wi-Fi'], ['mobile', 'Mobile'], ['desktop', 'Desktop'], ['link', 'Link'], ['spinner', 'Loading spinner']
].map(([value, label]) => ({ value, label }));

function fail(message) {
  throw new Error(`Icon schema validation failed: ${message}`);
}

function getTranslation(source, key) {
  return key.split('.').reduce((value, segment) => value && value[segment], source);
}

function schemaFrom(file) {
  const source = fs.readFileSync(path.join(paths.themeRoot, 'sections', file), 'utf8');
  const match = source.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  if (!match) fail(`missing schema in sections/${file}`);
  return JSON.parse(match[1]);
}

function findSelectors(schema, file) {
  const results = [];
  const inspect = (settings, context) => {
    for (const setting of settings || []) {
      if (selectorIds.has(setting.id)) {
        results.push({ file, context, setting });
      }
    }
  };

  inspect(schema.settings, 'section');
  for (const block of schema.blocks || []) inspect(block.settings, `block:${block.type}`);
  return results;
}

const rendererSource = fs.readFileSync(path.join(paths.themeRoot, 'snippets', 'icon.liquid'), 'utf8');
const rendererIcons = [...rendererSource.matchAll(/when '([^']+)'/g)].map((match) => match[1]);
const registryIcons = iconOptions.map((option) => option.value);
const uniqueRegistryIcons = new Set(registryIcons);
const schemaTranslations = JSON.parse(fs.readFileSync(path.join(paths.themeRoot, 'locales', 'en.default.schema.json'), 'utf8'));

if (registryIcons.length !== 98 || uniqueRegistryIcons.size !== 98) fail('the canonical registry must contain 98 unique icons');
if (rendererIcons.length !== new Set(rendererIcons).size) fail('icon.liquid contains duplicate icon values');
if (rendererIcons.length !== registryIcons.length || rendererIcons.some((value) => !uniqueRegistryIcons.has(value))) fail('icon.liquid and the canonical schema registry differ');

const sectionFiles = fs.readdirSync(path.join(paths.themeRoot, 'sections')).filter((file) => file.endsWith('.liquid'));
const selectors = sectionFiles.flatMap((file) => findSelectors(schemaFrom(file), file));
const expectedSelectorKeys = new Set([
  'icon-row.liquid:block:item:icon',
  'image-with-text.liquid:block:icon_text:icon',
  'marquee.liquid:block:item:icon',
  'multicolumn.liquid:block:column:icon'
]);

if (selectors.length !== expectedSelectorKeys.size) fail(`expected ${expectedSelectorKeys.size} merchant icon selectors, found ${selectors.length}`);

for (const { file, context, setting } of selectors) {
  const selectorKey = `${file}:${context}:${setting.id}`;
  if (!expectedSelectorKeys.has(selectorKey)) fail(`unexpected icon selector ${selectorKey}`);
  if (setting.type !== 'select') fail(`${selectorKey} must use a select setting`);

  const values = (setting.options || []).map((option) => option.value);
  const labels = (setting.options || []).map((option) => option.label);
  const expectedValues = selectorsThatAllowNone.has(selectorKey) ? ['none', ...registryIcons] : registryIcons;

  if (values.length !== new Set(values).size) fail(`${selectorKey} has duplicate option values`);
  if (values.length !== expectedValues.length || values.some((value, index) => value !== expectedValues[index])) fail(`${selectorKey} does not use the canonical ordered registry`);
  if (!values.includes(setting.default)) fail(`${selectorKey} default ${setting.default} is not an option`);
  if (labels.some((label) => typeof label !== 'string' || label.trim() === '')) fail(`${selectorKey} has an empty label`);
  if (originalSix.some((value) => !values.includes(value))) fail(`${selectorKey} no longer exposes an original icon value`);

  for (const option of setting.options) {
    const expectedLabel = `t:sections.shared.options.${option.value}`;
    if (option.label !== expectedLabel) fail(`${selectorKey} must use ${expectedLabel} for ${option.value}`);
    if (typeof getTranslation(schemaTranslations, expectedLabel.slice(2)) !== 'string') fail(`${expectedLabel} is missing from en.default.schema.json`);
  }
}

console.log(`Icon schema validation passed: ${registryIcons.length} canonical icons across ${selectors.length} merchant selectors.`);
