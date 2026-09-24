#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createCreativeBrief } = require('../pipeline/create-creative-brief');
const { createStoreStrategy } = require('../pipeline/create-store-strategy');
const { createReviewState, approveAll } = require('../pipeline/review-state');
const { generateStorefront } = require('../pipeline/generate-storefront');
const { sourceSnapshot, sameSnapshot, isPathInside, readShopifyJson, GENERATOR_VERSION } = require('../ai/theme-generator/utils');
const { loadPresetRegistry, checksum, clone } = require('../ai/presets/preset-registry');
const { recommendPreset, selectPreset } = require('../ai/presets/recommend-preset');
const { validateArchive } = require('../ai/theme-generator/validate-read-only-theme-package');
const { fixtureRevision } = require('./validate-preset-catalog');
const { fixtureGenerationContext, approvedBlockPlanInput } = require('./test-merchant-profile-integration');
const { selectArchitecture } = require('../ai/architecture');
const { withoutShopifyStorefrontPassword } = require('../ai/storefront-render/shopify-storefront-password-binding');

const COMMAND_VERSION = 1;
const PRESET_IDS = ['atelier', 'maison', 'gallery', 'ritual', 'essential', 'signal'];
const root = path.resolve(__dirname, '..');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
function sha256File(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function posixRelative(parent, child) { return path.relative(parent, child).split(path.sep).join('/'); }
function fixtureId(fixture) { return path.basename(fixture.merchant_fixture, '.json'); }

function isolatedGenerationRoot(repositoryRoot, workspaceId) {
  return path.join(repositoryRoot, 'output', `.preset-demo-workspace-${workspaceId}-${process.pid}`);
}

function createIsolatedGenerationRoot(repositoryRoot, workspaceId) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(workspaceId)) throw new Error('Preset demo workspace identity is invalid.');
  const isolatedRoot = isolatedGenerationRoot(repositoryRoot, workspaceId);
  if (fs.existsSync(isolatedRoot)) fs.rmSync(isolatedRoot, { recursive: true, force: true });
  fs.mkdirSync(isolatedRoot, { recursive: true });

  const excluded = new Set(['.git', 'apps', 'node_modules', 'output']);
  for (const entry of fs.readdirSync(repositoryRoot, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const source = path.join(repositoryRoot, entry.name);
    const destination = path.join(isolatedRoot, entry.name);
    fs.symlinkSync(source, destination, entry.isDirectory() ? 'dir' : 'file');
  }

  const isolatedTheme = path.join(isolatedRoot, 'apps', 'theme');
  fs.mkdirSync(path.dirname(isolatedTheme), { recursive: true });
  fs.cpSync(path.join(repositoryRoot, 'apps', 'theme'), isolatedTheme, { recursive: true, preserveTimestamps: true });

  // Shopify may add its standard generated-file banner to settings_data.json.
  // The packaged theme must contain strict JSON, so normalize only the isolated
  // export copy. The source theme remains byte-for-byte unchanged.
  const settingsData = path.join(isolatedTheme, 'config', 'settings_data.json');
  writeJson(settingsData, readShopifyJson(settingsData));
  fs.mkdirSync(path.join(isolatedRoot, 'output'), { recursive: true });
  return isolatedRoot;
}

function parseArgs(argv) {
  const options = { preset: null, verbose: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--verbose') options.verbose = true;
    else if (argument === '--preset') {
      const id = argv[index + 1];
      if (!id || id.startsWith('--')) throw new Error('--preset requires one preset ID.');
      options.preset = id;
      index += 1;
    } else throw new Error(`Unknown preset demo option ${argument}.`);
  }
  if (options.preset && !PRESET_IDS.includes(options.preset)) throw new Error(`Unknown preset ID ${options.preset}. Expected one of: ${PRESET_IDS.join(', ')}.`);
  return options;
}

function loadFixtureMatrix(repositoryRoot = root) {
  const registry = loadPresetRegistry(repositoryRoot);
  const manifest = readJson(path.join(repositoryRoot, 'fixtures', 'preset-validation.json'));
  if (manifest.version !== 1 || manifest.fixtures.length !== PRESET_IDS.length) throw new Error('Preset demo export requires the complete version 1 six-preset fixture matrix.');
  const byPreset = new Map(manifest.fixtures.map((fixture) => [fixture.expected_preset, clone(fixture)]));
  if (byPreset.size !== PRESET_IDS.length || PRESET_IDS.some((id) => !byPreset.has(id) || !registry.index.has(id))) throw new Error('Preset fixture matrix and preset registry do not contain the same six preset identities.');
  for (const id of PRESET_IDS) {
    const fixture = byPreset.get(id);
    for (const relative of [fixture.compiler_fixture, fixture.merchant_fixture]) {
      if (!fs.existsSync(path.join(repositoryRoot, relative))) throw new Error(`${id} references missing validated fixture ${relative}.`);
    }
  }
  return { registry, manifest, byPreset };
}

function approvedRevisionFor({ fixture, compilerStrategy, registry, repositoryRoot }) {
  const recommendation = recommendPreset({ strategy: compilerStrategy, contentInventory: fixture.content_inventory, root: repositoryRoot });
  const selection = selectPreset({ strategy: compilerStrategy, presetId: fixture.expected_preset, contentInventory: fixture.content_inventory, requireContent: true, root: repositoryRoot });
  if (!selection.compatibility.compatible) throw new Error(`${fixture.expected_preset} is incompatible with its validated demo fixture.`);
  const revision = fixtureRevision(selection.preset, registry, { ...recommendation, compatibility: selection.compatibility, omitted_sections: selection.omitted_sections }, fixture.expected_preset);
  revision.selection_source = recommendation.recommended_preset_id === fixture.expected_preset ? 'creative_director_recommendation' : 'merchant_selection';
  revision.preset_checksum = checksum({ ...revision, preset_checksum: undefined });
  return revision;
}

function generatedConfiguration(result) {
  const workspace = result.generated_theme.workspace;
  const manifest = result.generated_theme.manifest;
  const templates = manifest.generated_files.filter((file) => file.kind === 'template').map((file) => file.path.replace(/^theme\//, '')).sort();
  const parsedTemplates = Object.fromEntries(templates.map((relative) => [relative, readJson(path.join(workspace, 'theme', relative))]));
  const sections = [...manifest.generated_section_instances].sort((left, right) => left.template.localeCompare(right.template) || left.position - right.position).map((instance) => {
    const section = parsedTemplates[instance.template]?.sections?.[instance.instance_id] || {};
    return {
      template: instance.template,
      instance_id: instance.instance_id,
      section_id: instance.section_id,
      position: instance.position,
      block_ids: [...(section.block_order || [])]
    };
  });
  const blockCount = sections.reduce((total, section) => total + section.block_ids.length, 0);
  return { templates, parsedTemplates, sections, blockCount };
}

function assertNoMetadataLeak(parsedTemplates) {
  const serialized = JSON.stringify(parsedTemplates);
  for (const field of ['approval_reference', 'approved_block_plan_provenance', 'resource_snapshot_revision_id', 'preset_checksum', 'plan_checksum', 'semantic_block_role', 'content_entity_id', 'placement_id']) {
    if (serialized.includes(field)) throw new Error(`Generated Shopify JSON leaks internal field ${field}.`);
  }
}

function archiveEntries(archivePath) {
  return execFileSync('unzip', ['-Z1', archivePath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: withoutShopifyStorefrontPassword(process.env)
  })
    .split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
}

function validatePermanentArchive(archivePath) {
  const errors = [];
  const packageValidation = validateArchive({ archivePath, errors });
  const forbiddenTopLevels = new Set(['docs', 'fixtures', 'scripts', 'tests', 'output', 'node_modules']);
  for (const entry of archiveEntries(archivePath)) {
    const topLevel = entry.split('/')[0];
    if (forbiddenTopLevels.has(topLevel)) errors.push(`Permanent ZIP contains forbidden project path ${entry}.`);
    if (entry.endsWith('.map') || entry.endsWith('.DS_Store')) errors.push(`Permanent ZIP contains forbidden development file ${entry}.`);
  }
  if (errors.length) throw new Error(`Permanent package validation failed: ${errors.join(' ')}`);
  return packageValidation;
}

function cleanupGeneration(repositoryRoot, generationId) {
  const targets = [path.join(repositoryRoot, 'output', generationId), path.join(repositoryRoot, 'output', 'preview', generationId)];
  for (const target of targets) if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
  return targets.every((target) => !fs.existsSync(target));
}

function commitDirectory(staging, destination) {
  const backup = `${destination}.backup-${process.pid}`;
  if (fs.existsSync(backup)) fs.rmSync(backup, { recursive: true, force: true });
  if (fs.existsSync(destination)) fs.renameSync(destination, backup);
  try {
    fs.renameSync(staging, destination);
    if (fs.existsSync(backup)) fs.rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    if (fs.existsSync(destination)) fs.rmSync(destination, { recursive: true, force: true });
    if (fs.existsSync(backup)) fs.renameSync(backup, destination);
    throw error;
  }
}

function safeError(error, repositoryRoot) {
  return String(error?.message || error || 'Unknown preset export failure').replaceAll(repositoryRoot, '<repository>').slice(0, 4000);
}

function failureOutput({ fixture, presetId, error, repositoryRoot, outputDirectory }) {
  const staging = path.join(outputDirectory, `.staging-${presetId}-${process.pid}`);
  const destination = path.join(outputDirectory, presetId);
  if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  const message = safeError(error, repositoryRoot);
  const manifest = {
    version: 1,
    export_type: 'calinium_preset_demo',
    preset_id: presetId,
    preset_version: '1.0',
    merchant_fixture: fixtureId(fixture),
    status: 'failed',
    error: message
  };
  const report = {
    version: 1,
    preset_id: presetId,
    preset_version: '1.0',
    merchant_fixture: fixtureId(fixture),
    status: 'failed',
    errors: [message],
    warnings: [],
    package_validation: { status: 'failed' },
    theme_check: { status: 'not_run', offenses: null, warnings: null },
    zip_path: null,
    zip_sha256: null,
    source_theme_unchanged: true,
    temporary_workspace_cleaned: true
  };
  writeJson(path.join(staging, 'manifest.json'), manifest);
  writeJson(path.join(staging, 'validation-report.json'), report);
  commitDirectory(staging, destination);
  return { preset_id: presetId, status: 'failed', error: message, manifest, report, zip_path: null, zip_sha256: null };
}

function generatePresetDemo({
  fixture,
  registry,
  repositoryRoot,
  outputDirectory,
  verbose = false,
  architectureProfileId = null,
  artifactId = null,
  generationId: configuredGenerationId = null,
  zipName: configuredZipName = null
}) {
  const presetId = fixture.expected_preset;
  const outputId = artifactId || presetId;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(outputId)) throw new Error('Preset demo artifact identity is invalid.');
  const generationId = configuredGenerationId || `generation-run-preset-demo-${presetId}`;
  if (!/^generation-run-[a-z0-9-]+$/.test(generationId)) throw new Error('Preset demo generation identity is invalid.');
  const staging = path.join(outputDirectory, `.staging-${outputId}-${process.pid}`);
  const destination = path.join(outputDirectory, outputId);
  const zipName = configuredZipName || `calinium-${presetId}-demo.zip`;
  if (path.basename(zipName) !== zipName || !zipName.endsWith('.zip')) throw new Error('Preset demo ZIP name is invalid.');
  const finalZip = path.join(destination, zipName);
  cleanupGeneration(repositoryRoot, generationId);
  const generationRoot = createIsolatedGenerationRoot(repositoryRoot, outputId);
  cleanupGeneration(generationRoot, generationId);
  if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  const before = sourceSnapshot(repositoryRoot);
  let prepared;
  let caught;
  try {
    const merchantInput = readJson(path.join(generationRoot, fixture.merchant_fixture));
    const creativeBrief = createCreativeBrief({ merchantInput, root: generationRoot });
    const storeStrategy = createStoreStrategy({ creativeBrief, root: generationRoot });
    const review = approveAll(createReviewState());
    const blocked = generateStorefront({ creativeBrief, storeStrategy, review, root: generationRoot });
    if (blocked.status !== 'awaiting_merchant_configuration') throw new Error(`${presetId} fixture did not reach the approved configuration gate.`);
    const approvedPresetRevision = approvedRevisionFor({ fixture, compilerStrategy: blocked.compiler_strategy, registry, repositoryRoot });
    const architectureSelectionRevision = architectureProfileId
      ? selectArchitecture({
        profileId: architectureProfileId,
        merchantIntent: blocked.merchant_intent,
        storeIntelligence: blocked.store_intelligence,
        root: generationRoot
      })
      : blocked.architecture_selection;
    const generation = fixtureGenerationContext(blocked.draft, path.basename(fixture.merchant_fixture));
    const blockPlan = approvedBlockPlanInput({ fixture_id: fixtureId(fixture) });
    const result = generateStorefront({
      creativeBrief,
      storeStrategy,
      review,
      generation,
      approvedPresetRevision,
      root: generationRoot,
      generationId,
      outputRoot: path.join(generationRoot, 'output'),
      runThemeCheck: true,
      architectureSelectionRevision,
      merchantIntent: blocked.merchant_intent,
      storeIntelligence: blocked.store_intelligence,
      ...blockPlan
    });
    if (result.status !== 'generated_for_review') throw new Error(`${presetId} did not complete production generation.`);
    if (result.read_only_theme_package.validation.valid !== true) throw new Error(`${presetId} read-only package validation did not pass.`);
    if (result.read_only_theme_package.validation.checks.theme_check.status !== 'passed') throw new Error(`${presetId} Theme Check did not pass.`);
    if (result.read_only_theme_package.source_theme_unchanged !== true) throw new Error(`${presetId} did not preserve the source theme.`);
    const operations = result.read_only_theme_package.manifest.shopify_operations;
    if (operations.write_operations || operations.upload || operations.publish || operations.required_scope !== 'none') throw new Error(`${presetId} crossed the read-only Shopify boundary.`);
    const configuration = generatedConfiguration(result);
    assertNoMetadataLeak(configuration.parsedTemplates);
    if (configuration.sections.filter((section) => section.template === 'templates/index.json').map((section) => section.section_id).join('|') !== fixture.expected_section_order.join('|')) throw new Error(`${presetId} generated an unexpected homepage section order.`);
    fs.copyFileSync(result.read_only_theme_package.archive_path, path.join(staging, zipName));
    const permanentArchiveValidation = validatePermanentArchive(path.join(staging, zipName));
    const zipSha256 = sha256File(path.join(staging, zipName));
    const zipPath = posixRelative(repositoryRoot, finalZip);
    const presetProvenance = result.generated_theme.manifest.approved_preset_provenance;
    const blockPlanProvenance = result.generated_theme.manifest.approved_block_plan_provenance;
    const homepageSections = configuration.sections.filter((section) => section.template === 'templates/index.json');
    const omissions = clone(result.generated_theme.manifest.preset_application?.omissions || []);
    const warnings = [...result.generated_theme.manifest.warnings];
    const themeCheck = result.read_only_theme_package.validation.checks.theme_check;
    const manifest = {
      version: 1,
      export_type: 'calinium_preset_demo',
      status: 'passed',
      generation_id: generationId,
      preset_id: presetId,
      preset_version: presetProvenance.preset_version,
      merchant_fixture: fixtureId(fixture),
      strategy_revision: presetProvenance.strategy_revision,
      approved_block_plan_revision: blockPlanProvenance?.revision_id || null,
      resource_snapshot_revision: blockPlanProvenance?.resource_snapshot_revision_id || null,
      generator_version: result.generated_theme.manifest.generator_version,
      architecture_selection: clone(result.generated_theme.manifest.architecture_selection),
      architecture_runtime: clone(result.read_only_theme_package.manifest.architecture_runtime || null),
      target_theme: { id: approvedPresetRevision.target_theme.id, version: approvedPresetRevision.target_theme.version },
      homepage_recipe: result.generated_theme.manifest.preset_application.recipe,
      generated_templates: configuration.templates,
      generated_sections: configuration.sections,
      generated_block_count: configuration.blockCount,
      omission_summary: omissions,
      warning_summary: warnings,
      zip: { filename: zipName, path: zipPath, sha256: zipSha256, compressed_bytes: fs.statSync(path.join(staging, zipName)).size },
      shopify_operations: clone(operations)
    };
    const validationReport = {
      version: 1,
      preset_id: presetId,
      preset_version: presetProvenance.preset_version,
      merchant_fixture: fixtureId(fixture),
      status: 'passed',
      homepage_recipe: result.generated_theme.manifest.preset_application.recipe,
      homepage_section_order: homepageSections.map((section) => section.section_id),
      generated_page_count: configuration.templates.length,
      generated_section_count: configuration.sections.length,
      generated_block_count: configuration.blockCount,
      approved_block_plan_revision: blockPlanProvenance?.revision_id || null,
      resource_snapshot_revision: blockPlanProvenance?.resource_snapshot_revision_id || null,
      warnings,
      omissions,
      package_validation: {
        status: 'passed',
        errors: [...result.read_only_theme_package.validation.errors],
        warnings: [...result.read_only_theme_package.validation.warnings],
        archive_entries: permanentArchiveValidation.entry_count,
        compressed_bytes: permanentArchiveValidation.compressed_bytes
      },
      theme_check: { status: themeCheck.status, offenses: themeCheck.status === 'passed' ? 0 : null, warnings: themeCheck.warnings },
      zip_path: zipPath,
      zip_sha256: zipSha256,
      source_theme_unchanged: true,
      temporary_workspace_cleaned: false
    };
    prepared = { manifest, validationReport, zipSha256, zipPath, destination, staging, zipName };
    if (verbose) console.log(`${presetId}: generated ${configuration.templates.length} templates, ${configuration.sections.length} sections, and ${configuration.blockCount} blocks.`);
  } catch (error) {
    caught = error;
  } finally {
    cleanupGeneration(generationRoot, generationId);
    if (fs.existsSync(generationRoot)) fs.rmSync(generationRoot, { recursive: true, force: true });
  }
  const sourceUnchanged = sameSnapshot(before, sourceSnapshot(repositoryRoot));
  const temporaryWorkspaceCleaned = !fs.existsSync(generationRoot)
    && !fs.existsSync(path.join(repositoryRoot, 'output', generationId))
    && !fs.existsSync(path.join(repositoryRoot, 'output', 'preview', generationId));
  if (!sourceUnchanged && !caught) caught = new Error(`${presetId} changed the source Calinium One theme.`);
  if (!temporaryWorkspaceCleaned && !caught) caught = new Error(`${presetId} left a temporary generation workspace.`);
  if (caught) {
    if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
    throw caught;
  }
  prepared.validationReport.source_theme_unchanged = sourceUnchanged;
  prepared.validationReport.temporary_workspace_cleaned = temporaryWorkspaceCleaned;
  writeJson(path.join(staging, 'manifest.json'), prepared.manifest);
  writeJson(path.join(staging, 'validation-report.json'), prepared.validationReport);
  commitDirectory(staging, destination);
  return {
    preset_id: presetId,
    status: 'passed',
    manifest: prepared.manifest,
    report: prepared.validationReport,
    zip_path: prepared.zipPath,
    zip_sha256: prepared.zipSha256
  };
}

function atomicSummary(file, value) {
  const temporary = `${file}.tmp-${process.pid}`;
  writeJson(temporary, value);
  fs.renameSync(temporary, file);
}

function runPresetDemoExport({ repositoryRoot = root, outputDirectory = path.join(repositoryRoot, 'output', 'preset-demo-themes'), selectedPreset = null, verbose = false, presetRunner = generatePresetDemo } = {}) {
  const allowedOutput = path.join(repositoryRoot, 'output');
  if (!isPathInside(allowedOutput, outputDirectory)) throw new Error('Preset demo output must remain inside the repository output directory.');
  if (selectedPreset && !PRESET_IDS.includes(selectedPreset)) throw new Error(`Unknown preset ID ${selectedPreset}.`);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const { registry, byPreset } = loadFixtureMatrix(repositoryRoot);
  const selected = selectedPreset ? [selectedPreset] : PRESET_IDS;
  const before = sourceSnapshot(repositoryRoot);
  const results = new Map();
  for (const presetId of selected) {
    const fixture = byPreset.get(presetId);
    try {
      const result = presetRunner({ fixture, registry, repositoryRoot, outputDirectory, verbose });
      results.set(presetId, result);
      console.log(`PASS ${presetId}: ${result.zip_path}; sha256=${result.zip_sha256}; theme-check=passed; cleanup=confirmed.`);
    } catch (error) {
      const result = failureOutput({ fixture, presetId, error, repositoryRoot, outputDirectory });
      results.set(presetId, result);
      console.error(`FAIL ${presetId}: ${result.error}`);
    }
  }
  const sourceUnchanged = sameSnapshot(before, sourceSnapshot(repositoryRoot));
  const presets = PRESET_IDS.map((presetId) => {
    const result = results.get(presetId);
    if (!result) return { preset_id: presetId, status: 'skipped', output_directory: posixRelative(repositoryRoot, path.join(outputDirectory, presetId)), zip_path: null, zip_sha256: null, theme_check: 'not_run', package_validation: 'not_run' };
    return {
      preset_id: presetId,
      status: result.status,
      output_directory: posixRelative(repositoryRoot, path.join(outputDirectory, presetId)),
      zip_path: result.zip_path,
      zip_sha256: result.zip_sha256,
      theme_check: result.report.theme_check.status,
      package_validation: result.report.package_validation.status
    };
  });
  const passed = presets.filter((item) => item.status === 'passed').length;
  const failed = presets.filter((item) => item.status === 'failed').length;
  const skipped = presets.filter((item) => item.status === 'skipped').length;
  const cleanupPassed = selected.every((presetId) => {
    const generationId = `generation-run-preset-demo-${presetId}`;
    return !fs.existsSync(path.join(repositoryRoot, 'output', generationId))
      && !fs.existsSync(path.join(repositoryRoot, 'output', 'preview', generationId))
      && !fs.existsSync(isolatedGenerationRoot(repositoryRoot, presetId));
  });
  const complete = passed === PRESET_IDS.length && failed === 0 && skipped === 0 && sourceUnchanged && cleanupPassed;
  const summary = {
    version: 1,
    command_version: COMMAND_VERSION,
    command: 'npm run generate:preset-demos',
    generated_at: new Date().toISOString(),
    status: failed ? 'failed' : complete ? 'passed' : 'partial',
    target_theme: { id: registry.target_theme.id, version: registry.target_theme.version },
    total_presets: PRESET_IDS.length,
    passed_presets: passed,
    failed_presets: failed,
    skipped_presets: skipped,
    presets,
    theme_check_status: complete ? 'passed' : failed ? 'failed' : 'partial',
    package_validation_status: complete ? 'passed' : failed ? 'failed' : 'partial',
    source_theme_unchanged: sourceUnchanged,
    cleanup_status: cleanupPassed ? 'passed' : 'failed',
    overall_readiness_for_shopify_upload: complete ? 'ready' : 'not_ready'
  };
  atomicSummary(path.join(outputDirectory, 'summary.json'), summary);
  return summary;
}

function main() {
  let options;
  try { options = parseArgs(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; return; }
  try {
    const summary = runPresetDemoExport({ selectedPreset: options.preset, verbose: options.verbose });
    console.log(`Preset demo export summary: status=${summary.status}; passed=${summary.passed_presets}; failed=${summary.failed_presets}; skipped=${summary.skipped_presets}; source-unchanged=${summary.source_theme_unchanged}; cleanup=${summary.cleanup_status}.`);
    if (summary.failed_presets || summary.status === 'failed') process.exitCode = 1;
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  COMMAND_VERSION,
  PRESET_IDS,
  archiveEntries,
  createIsolatedGenerationRoot,
  generatePresetDemo,
  generatedConfiguration,
  loadFixtureMatrix,
  parseArgs,
  runPresetDemoExport,
  validatePermanentArchive
};
