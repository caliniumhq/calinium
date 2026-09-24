#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createCreativeBrief } = require('../pipeline/create-creative-brief');
const { createStoreStrategy } = require('../pipeline/create-store-strategy');
const { createReviewState, approveAll } = require('../pipeline/review-state');
const { generateStorefront } = require('../pipeline/generate-storefront');
const { sourceSnapshot, sameSnapshot } = require('../ai/theme-generator/utils');
const { loadPresetRegistry, checksum, clone } = require('../ai/presets/preset-registry');
const { recommendPreset, selectPreset } = require('../ai/presets/recommend-preset');
const { fixtureRevision } = require('./validate-preset-catalog');
const { fixtureGenerationContext, removeGeneratedArtifacts, generatedHomepageSections } = require('./test-merchant-profile-integration');

const root = path.resolve(__dirname, '..');

function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function workspaceJson(result, relative) { return JSON.parse(fs.readFileSync(path.join(result.generated_theme.workspace, relative), 'utf8')); }

function semanticSnapshot(result) {
  const manifest = result.generated_theme.manifest;
  const instances = manifest.generated_section_instances
    .filter((item) => item.template === 'templates/index.json')
    .sort((left, right) => left.position - right.position)
    .map((item) => ({ instance_id: item.instance_id, section_id: item.section_id, position: item.position, origin: item.origin }));
  return {
    recipe: result.compiler_strategy.homepage_recipe,
    section_order: instances.map((item) => item.section_id),
    instances,
    settings: workspaceJson(result, 'theme/config/settings_data.json'),
    homepage: workspaceJson(result, 'theme/templates/index.json'),
    approved_preset_provenance: clone(manifest.approved_preset_provenance),
    preset_application: clone(manifest.preset_application),
    warnings: [...manifest.warnings],
    approved_block_plan_provenance: manifest.approved_block_plan_provenance
  };
}

function blockCount(result) {
  const template = workspaceJson(result, 'theme/templates/index.json');
  return Object.values(template.sections || {}).reduce((total, section) => total + Object.keys(section.blocks || {}).length, 0);
}

function approvedRevisionFor(fixture, compilerStrategy) {
  const registry = loadPresetRegistry(root);
  const recommendation = recommendPreset({ strategy: compilerStrategy, contentInventory: fixture.content_inventory, root });
  const selection = selectPreset({ strategy: compilerStrategy, presetId: fixture.expected_preset, contentInventory: fixture.content_inventory, requireContent: true, root });
  const revision = fixtureRevision(selection.preset, registry, { ...recommendation, compatibility: selection.compatibility, omitted_sections: selection.omitted_sections }, fixture.expected_preset);
  revision.selection_source = recommendation.recommended_preset_id === fixture.expected_preset ? 'creative_director_recommendation' : 'merchant_selection';
  revision.preset_checksum = checksum({ ...revision, preset_checksum: undefined });
  return { revision, recommendation, selection };
}

function assertSignal(result) {
  const serialized = JSON.stringify(semanticSnapshot(result)).toLowerCase();
  const sections = generatedHomepageSections(result);
  for (const omitted of ['product-comparison', 'testimonials', 'product-carousel']) assert.ok(!sections.includes(omitted), `Signal must omit unsupported ${omitted}.`);
  for (const claim of ['customer count', 'revenue gain', 'conversion increase', 'uptime statistic', 'security certification', 'pricing plan']) assert.ok(!serialized.includes(claim), `Signal invented ${claim}.`);
  assert.equal(result.generated_theme.manifest.preset_application.recipe, 'technology_clarity');
}

function runFixture(fixture, index) {
  const merchantName = path.basename(fixture.merchant_fixture);
  const brief = createCreativeBrief({ merchantInput: readJson(fixture.merchant_fixture), root });
  const storeStrategy = createStoreStrategy({ creativeBrief: brief, root });
  const review = approveAll(createReviewState());
  const blocked = generateStorefront({ creativeBrief: brief, storeStrategy, review, root });
  assert.equal(blocked.status, 'awaiting_merchant_configuration');
  const { revision, recommendation, selection } = approvedRevisionFor(fixture, blocked.compiler_strategy);
  if (fixture.expected_preset !== 'maison') assert.equal(recommendation.recommended_preset_id, fixture.expected_preset, `${fixture.fixture_id} recommendation differs from its catalog fixture.`);
  else assert.equal(revision.selection_source, 'merchant_selection', 'Maison fixture must prove a compatible explicit merchant override.');
  assert.equal(selection.compatibility.compatible, true);
  const presetBlocked = generateStorefront({ creativeBrief: brief, storeStrategy, review, approvedPresetRevision: revision, root });
  const generation = fixtureGenerationContext(presetBlocked.draft, merchantName);
  const generationIds = [`generation-run-preset-${index + 1}-a-${process.pid}`, `generation-run-preset-${index + 1}-b-${process.pid}`];
  const before = sourceSnapshot(root);
  let first;
  let second;
  try {
    first = generateStorefront({ creativeBrief: brief, storeStrategy, review, generation, approvedPresetRevision: revision, root, generationId: generationIds[0], outputRoot: path.join(root, 'output'), runThemeCheck: true });
    second = generateStorefront({ creativeBrief: brief, storeStrategy, review, generation, approvedPresetRevision: revision, root, generationId: generationIds[1], outputRoot: path.join(root, 'output'), runThemeCheck: false });
    assert.equal(first.status, 'generated_for_review');
    assert.equal(second.status, 'generated_for_review');
    assert.deepEqual(generatedHomepageSections(first), fixture.expected_section_order);
    assert.deepEqual(generatedHomepageSections(second), fixture.expected_section_order);
    assert.deepEqual(semanticSnapshot(first), semanticSnapshot(second), `${fixture.fixture_id} preset output is not deterministic.`);
    assert.deepEqual(first.generation_approval.approved_preset, first.generated_theme.manifest.approved_preset_provenance, 'Generation approval must bind exact preset provenance.');
    assert.equal(first.generated_theme.manifest.approved_preset_provenance.preset_id, fixture.expected_preset);
    assert.equal(first.generated_theme.manifest.approved_preset_provenance.preset_version, '1.0');
    assert.equal(first.generated_theme.manifest.preset_application.recipe, fixture.expected_recipe);
    assert.deepEqual(first.generated_theme.manifest.preset_application.section_order, fixture.expected_section_order);
    assert.ok(first.generated_theme.manifest.preset_application.applied_global_setting_keys.length > 0, 'Preset must apply at least one safe global default.');
    assert.ok(first.generated_theme.manifest.preset_application.applied_section_default_keys.length > 0, 'Preset must apply at least one safe section default.');
    assert.deepEqual(first.generated_theme.manifest.preset_application.omissions.map((item) => item.section_id), fixture.expected_omissions);
    assert.equal(first.read_only_theme_package.validation.valid, true);
    assert.equal(first.read_only_theme_package.validation.checks.theme_check.status, 'passed');
    assert.deepEqual(first.read_only_theme_package.manifest.shopify_operations, { write_operations: false, upload: false, publish: false, required_scope: 'none' });
    assert.equal(first.read_only_theme_package.source_theme_unchanged, true);
    assert.equal(first.generated_theme.manifest.approved_block_plan_provenance, null, 'Preset tests must not invent Approved Block Plan content.');
    if (fixture.expected_preset === 'signal') assertSignal(first);
    return {
      fixture_id: fixture.fixture_id,
      preset: fixture.expected_preset,
      recipe: fixture.expected_recipe,
      pages: first.generated_theme.manifest.generated_files.filter((file) => file.kind === 'template').length,
      sections: fixture.expected_section_order,
      blocks: blockCount(first),
      omissions: fixture.expected_omissions,
      warnings: first.generated_theme.manifest.warnings.length,
      package_validation: 'passed',
      theme_check: 'passed',
      deterministic: 'passed'
    };
  } finally {
    removeGeneratedArtifacts(generationIds);
    assert.ok(sameSnapshot(before, sourceSnapshot(root)), `${fixture.fixture_id} changed the source theme.`);
    for (const generationId of generationIds) {
      assert.ok(!fs.existsSync(path.join(root, 'output', generationId)), `${fixture.fixture_id} left a generation workspace.`);
      assert.ok(!fs.existsSync(path.join(root, 'output', 'preview', generationId)), `${fixture.fixture_id} left a preview workspace.`);
    }
  }
}

function run() {
  const manifest = readJson('fixtures/preset-validation.json');
  const reports = manifest.fixtures.map(runFixture);
  for (const report of reports) console.log(`PASS ${report.fixture_id}: preset=${report.preset}; recipe=${report.recipe}; pages=${report.pages}; sections=${report.sections.join(',')}; blocks=${report.blocks}; omissions=${report.omissions.join(',')}; warnings=${report.warnings}; package=${report.package_validation}; theme-check=${report.theme_check}; determinism=${report.deterministic}`);
  console.log(`Preset architecture tests passed: fixtures=${reports.length}; packages=${reports.length}; theme-check=passed; repeat-runs=2; read-only=yes; cleanup=confirmed.`);
  return reports;
}

if (require.main === module) { try { run(); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; } }

module.exports = { approvedRevisionFor, semanticSnapshot, runFixture, run };
