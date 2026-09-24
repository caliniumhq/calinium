#!/usr/bin/env node

/* Development-only structural and preservation checks for the AI Strategy Compiler. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { validateProfile } = require('../ai/compiler/compile-strategy');
const { repositoryPaths } = require('./lib/repository-paths');
const { resolvePreservationBackup, resolveThemeRuntimeBaseline, archiveFile } = require('./lib/preservation-backup');

const root = path.resolve(__dirname, '..');
const paths = repositoryPaths(root);
const errors = [];
const requiredModules = ['compile-strategy', 'compile-valid-strategy', 'compiler-industry-resolver', 'validate-profile', 'load-knowledge-base', 'resolve-industry', 'resolve-personality', 'resolve-design-language', 'resolve-typography', 'resolve-spacing', 'resolve-color', 'resolve-imagery', 'resolve-animation', 'resolve-conversion', 'resolve-blueprint', 'resolve-homepage', 'resolve-sections', 'order-sections', 'validate-strategy', 'detect-assets', 'detect-verification', 'validate-content-safety', 'build-explanations', 'build-output', 'schema-validator', 'decision'];
const requiredDocs = ['docs/ai/compiler-overview.md', 'docs/ai/compiler-architecture.md', 'docs/ai/compiler-input-schema.md', 'docs/ai/compiler-output-schema.md', 'docs/ai/compiler-resolution-order.md', 'docs/ai/compiler-explainability.md', 'docs/ai/compiler-validation.md', 'docs/ai/compiler-versioning.md', 'docs/ai/compiler-extension-guide.md', 'docs/ai/compiler-testing.md'];
const requiredFixtures = ['luxury-leather-bags.json', 'beauty.json', 'electronics.json', 'jewelry.json', 'furniture.json', 'food.json', 'hospitality.json', 'digital-products.json'];
// These derived mapping catalogs were added after the compiler baseline backup.
// They are checked by scripts/validate-theme-mapping.js; excluding them here
// keeps this preservation check focused on compiler-era knowledge catalogs.
const postCompilerMappingCatalogs = new Set([
  // Milestone 19 deliberately moves every newly planned homepage opening to
  // the canonical Premium Hero. The recipe catalog remains schema-validated
  // by Design Intelligence and contract-tested by test-premium-hero.js.
  'layout-recipes.json',
  // Commercial configuration was introduced after the compiler baseline. It
  // is independently schema-validated by validate-shopify-billing-flow.js and
  // is not compiler design intelligence.
  'custom-theme-price-catalog.json',
  'draft-builder-readiness.json',
  'strategy-section-mapping.json',
  'strategy-setting-mapping.json',
  'theme-capabilities.json',
  'theme-content-classification.json',
  'theme-global-settings-map.json',
  'theme-mapping-coverage.json',
  'theme-safe-defaults.json',
  'theme-section-capabilities.json'
]);

function fail(message) { errors.push(message); }
function readJson(file) { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }

for (const module of requiredModules) if (!fs.existsSync(path.join(root, 'ai/compiler', `${module}.js`))) fail(`missing compiler module ${module}`);
for (const file of ['compile-storefront-strategy.js', 'schemas/calinium-merchant-profile.schema.json', 'schemas/calinium-storefront-strategy.schema.json', 'scripts/test-ai-strategy-compiler.js', ...requiredDocs]) if (!fs.existsSync(path.join(root, file))) fail(`missing compiler artifact ${file}`);
for (const file of ['schemas/calinium-merchant-profile.schema.json', 'schemas/calinium-storefront-strategy.schema.json']) {
  try { readJson(file); } catch (error) { fail(`${file} is not valid JSON`); }
}

for (const file of requiredFixtures) {
  try {
    const validation = validateProfile(readJson(`ai/compiler/fixtures/valid/${file}`), { root });
    if (!validation.valid) fail(`valid fixture ${file} fails validation: ${validation.errors.join('; ')}`);
  } catch (error) { fail(`could not validate valid fixture ${file}: ${error.message}`); }
}
for (const file of ['unknown-industry.json', 'conflicting-personalities.json', 'missing-required-fields.json']) {
  try {
    const validation = validateProfile(readJson(`ai/compiler/fixtures/invalid/${file}`), { root });
    if (validation.valid) fail(`invalid fixture ${file} unexpectedly passes validation`);
  } catch (error) { fail(`could not validate invalid fixture ${file}: ${error.message}`); }
}
try {
  const validation = validateProfile(readJson('ai/compiler/fixtures/invalid/missing-required-asset.json'), { root });
  if (!validation.valid) fail('missing-required-asset fixture should be structurally valid so asset detection can handle it');
} catch (error) { fail(`could not validate missing-required-asset fixture: ${error.message}`); }

for (const module of requiredModules) {
  const source = fs.readFileSync(path.join(root, 'ai/compiler', `${module}.js`), 'utf8');
  if (/\{%-?|\{\{\s*|shopify:\w+|fetch\s*\(/.test(source)) fail(`${module} contains a storefront/runtime dependency`);
  if (/writeFileSync|appendFileSync|unlinkSync|rmSync/.test(source)) fail(`${module} writes or deletes files instead of compiling in memory`);
}

const backup = resolvePreservationBackup(root, '.calinium-before-ai-strategy-compiler-20260720.tgz');
const runtimeBaseline = resolveThemeRuntimeBaseline(root);
if (!backup && !runtimeBaseline) fail('AI Strategy Compiler preservation backup archive is missing');
else {
  const protectedFiles = [
    ...fs.readdirSync(path.join(paths.themeRoot, 'sections')).filter((file) => file.endsWith('.liquid')).map((file) => `sections/${file}`),
    ...fs.readdirSync(path.join(paths.themeRoot, 'templates')).map((file) => `templates/${file}`),
    ...fs.readdirSync(path.join(root, 'config')).filter((file) => file.endsWith('.json') && !postCompilerMappingCatalogs.has(file)).map((file) => `config/${file}`)
  ];
  for (const file of protectedFiles) {
    try {
      const isRuntime = !file.startsWith('config/');
      const useCurrentRuntimeBaseline = isRuntime && runtimeBaseline;
      const source = useCurrentRuntimeBaseline ? runtimeBaseline : backup;
      if (!source) throw new Error('No compatible archive is available.');
      const archived = archiveFile(source, file, { theme: isRuntime });
      const current = fs.readFileSync(path.join(file.startsWith('config/') ? root : paths.themeRoot, file));
      if (!archived.equals(current)) fail(`${file} changed after the ${useCurrentRuntimeBaseline ? runtimeBaseline.id : 'compiler'} backup`);
    } catch (error) { fail(`could not compare ${file} with the ${!file.startsWith('config/') && runtimeBaseline ? runtimeBaseline.id : 'compiler'} backup`); }
  }
}

if (errors.length) {
  console.error(`AI Strategy Compiler validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`AI Strategy Compiler validation passed: ${requiredModules.length} isolated modules, ${requiredFixtures.length} valid fixtures, schemas, docs, and storefront/knowledge preservation.`);
