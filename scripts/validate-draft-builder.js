#!/usr/bin/env node

/* Development-only structural, safety, and preservation validation for Milestone 6B. */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { compileStorefrontStrategy } = require('../ai/compiler/compile-strategy');
const { buildDraftConfiguration } = require('../ai/draft-builder/build-draft');
const { loadMappings } = require('../ai/draft-builder/load-mappings');
const { validateDraft } = require('../ai/draft-builder/validate-draft');
const { repositoryPaths } = require('./lib/repository-paths');
const { resolvePreservationBackup, resolveThemeRuntimeBaseline, archiveFile, isThemeRuntimePath } = require('./lib/preservation-backup');

const root = path.resolve(__dirname, '..');
const paths = repositoryPaths(root);
const errors = [];
const modules = ['build-draft', 'load-strategy', 'load-mappings', 'resolve-global-settings', 'resolve-homepage', 'resolve-pages', 'resolve-sections', 'resolve-settings', 'detect-missing-content', 'detect-required-assets', 'detect-review-items', 'detect-blockers', 'validate-draft', 'generate-summary', 'utils'];
const requiredDocs = ['docs/ai/draft-builder.md', 'docs/ai/draft-schema.md', 'docs/ai/homepage-planning.md', 'docs/ai/merchant-review.md', 'docs/ai/draft-validation.md'];
const runtimeDirectories = ['assets', 'layout', 'locales', 'sections', 'snippets', 'templates'];
const restructurePathMigrationCatalogs = new Set([
  // M19 updates the intentionally versioned homepage-recipe catalog so new
  // plans begin with the canonical Premium Hero. Its schema and mapping
  // contracts are validated independently from the historical Draft archive.
  'layout-recipes.json',
  // Commercial pricing is protected by the billing-flow validator and was
  // intentionally introduced after the Draft Builder archive.
  'custom-theme-price-catalog.json',
  'draft-builder-readiness.json',
  'strategy-setting-mapping.json',
  'strategy-section-mapping.json',
  'theme-capabilities.json',
  'theme-content-classification.json',
  'theme-global-settings-map.json',
  'theme-mapping-coverage.json',
  'theme-safe-defaults.json',
  'theme-section-capabilities.json'
]);

function fail(message) { errors.push(message); }
function readJson(file) { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
function checkExists(file, label) { if (!fs.existsSync(path.join(root, file))) fail(`missing ${label} ${file}`); }
function preservedCurrentPath(file) {
  if (file.startsWith('config/settings_')) return path.join(paths.themeRoot, file);
  if (file.startsWith('config/') || file.startsWith('ai/')) return path.join(root, file);
  return path.join(paths.themeRoot, file);
}

for (const module of modules) {
  const file = `ai/draft-builder/${module}.js`;
  checkExists(file, 'Draft Builder module');
  if (!fs.existsSync(path.join(root, file))) continue;
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (/\{%-?|\{\{\s*|shopify:\w+|fetch\s*\(|writeFileSync|appendFileSync|unlinkSync|rmSync|cart\/add\.js/.test(source)) fail(`${module} contains a prohibited storefront, network, cart, or write dependency`);
}
for (const file of ['build-draft-configuration.js', 'schemas/calinium-draft-configuration.schema.json', 'scripts/test-draft-builder.js', 'ai/draft-builder/fixtures/scenarios.json', 'ai/draft-builder/fixtures/invalid/invalid-strategy.json', ...requiredDocs]) checkExists(file, 'Draft Builder artifact');

try {
  const scenarios = readJson('ai/draft-builder/fixtures/scenarios.json');
  const requiredScenarioIds = ['luxury-bags', 'electronics', 'beauty', 'jewelry', 'furniture', 'hospitality', 'food', 'digital-products', 'minimal-merchant', 'incomplete-merchant', 'invalid-strategy', 'blocked-strategy'];
  if (scenarios.version !== 1 || !Array.isArray(scenarios.scenarios)) fail('Draft Builder scenarios must use version 1 and an array.');
  const ids = scenarios.scenarios.map((scenario) => scenario.id);
  if (new Set(ids).size !== ids.length) fail('Draft Builder scenarios contain duplicate IDs.');
  for (const id of requiredScenarioIds) if (!ids.includes(id)) fail(`Draft Builder scenario ${id} is missing.`);
  for (const scenario of scenarios.scenarios) {
    if (!scenario.profile_fixture || !fs.existsSync(path.join(root, scenario.profile_fixture))) fail(`Draft Builder scenario ${scenario.id} has a missing profile fixture.`);
    if (scenario.strategy_fixture && !fs.existsSync(path.join(root, scenario.strategy_fixture))) fail(`Draft Builder scenario ${scenario.id} has a missing strategy fixture.`);
  }
} catch (error) { fail(`Draft Builder fixtures could not be parsed: ${error.message}`); }

try {
  const profile = readJson('ai/compiler/fixtures/valid/luxury-leather-bags.json');
  const strategy = compileStorefrontStrategy(profile);
  const mappings = loadMappings({ root });
  const draft = buildDraftConfiguration(profile, strategy, { root });
  const validation = validateDraft(draft, { root, mappings, strategy });
  if (!validation.valid) fail(`Generated Draft Builder fixture fails validation: ${validation.errors.join('; ')}`);
  const instances = [draft.homepage_plan, ...draft.other_pages].flatMap((page) => page.sections).map((section) => section.instance_id);
  if (new Set(instances).size !== instances.length) fail('Generated draft has duplicate instance IDs.');
  for (const section of draft.homepage_plan.sections) if (!mappings.index.strategy_sections.get(section.source_mapping)?.sections.some((item) => item.section_id === section.section_id)) fail(`Homepage section ${section.section_id} bypasses the mapping layer.`);
  for (const setting of ['typography', 'spacing', 'colors', 'motion', 'layout'].flatMap((category) => draft.global_theme_configuration[category])) if (!mappings.index.global_settings.has(setting.setting_id)) fail(`Generated global setting ${setting.setting_id} is not in the global settings map.`);
} catch (error) { fail(`Draft Builder generation failed: ${error.message}`); }

const backup = resolvePreservationBackup(root, '.calinium-before-draft-configuration-builder-20260720.tgz');
const runtimeBaseline = resolveThemeRuntimeBaseline(root);
if (!backup && !runtimeBaseline) fail('Draft Builder preservation backup archive is missing.');
else {
  const preservedFiles = [
    ...runtimeDirectories.flatMap((directory) => fs.readdirSync(path.join(paths.themeRoot, directory)).filter((name) => fs.statSync(path.join(paths.themeRoot, directory, name)).isFile()).map((name) => `${directory}/${name}`)),
    'config/settings_data.json',
    'config/settings_schema.json',
    ...fs.readdirSync(path.join(root, 'config')).filter((name) => name.endsWith('.json') && !restructurePathMigrationCatalogs.has(name)).map((name) => `config/${name}`),
    ...fs.readdirSync(path.join(root, 'ai/compiler')).filter((name) => name.endsWith('.js') && name !== 'load-knowledge-base.js').map((name) => `ai/compiler/${name}`)
  ];
  for (const file of preservedFiles) {
    try {
      const useCurrentRuntimeBaseline = isThemeRuntimePath(file) && runtimeBaseline;
      const source = useCurrentRuntimeBaseline ? runtimeBaseline : backup;
      if (!source) throw new Error('No compatible archive is available.');
      const archived = archiveFile(source, file, { theme: isThemeRuntimePath(file) });
      const current = fs.readFileSync(preservedCurrentPath(file));
      if (!archived.equals(current)) fail(`${file} changed after the ${useCurrentRuntimeBaseline ? runtimeBaseline.id : 'Draft Builder'} backup.`);
    } catch (error) { fail(`could not compare ${file} with the ${isThemeRuntimePath(file) && runtimeBaseline ? runtimeBaseline.id : 'Draft Builder'} backup`); }
  }
}

if (errors.length) {
  console.error(`Draft Builder validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Draft Builder validation passed: ${modules.length} isolated modules, mapped draft generation, fixtures, schema, and Shopify/runtime preservation.`);
