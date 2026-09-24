#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { sourceSnapshot, sameSnapshot, readShopifyJson } = require('../ai/theme-generator/utils');
const { PRESET_IDS, loadFixtureMatrix, parseArgs, runPresetDemoExport, archiveEntries } = require('./generate-preset-demos');

const root = path.resolve(__dirname, '..');
const testOutput = path.join(root, 'output', `preset-demo-test-${process.pid}`);

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function zipJson(zip, entry) {
  const source = execFileSync('unzip', ['-p', zip, entry], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(source.replace(/^\uFEFF?\s*\/\*[\s\S]*?\*\/\s*/, ''));
}

function semanticSnapshot(outputDirectory, presetId) {
  const directory = path.join(outputDirectory, presetId);
  const manifest = readJson(path.join(directory, 'manifest.json'));
  const report = readJson(path.join(directory, 'validation-report.json'));
  const zip = path.join(directory, `calinium-${presetId}-demo.zip`);
  const jsonEntries = archiveEntries(zip).filter((entry) => entry.endsWith('.json') && (entry === 'config/settings_data.json' || entry.startsWith('templates/'))).sort();
  return {
    preset_id: manifest.preset_id,
    preset_version: manifest.preset_version,
    merchant_fixture: manifest.merchant_fixture,
    homepage_recipe: manifest.homepage_recipe,
    generated_sections: manifest.generated_sections,
    generated_block_count: manifest.generated_block_count,
    approved_block_plan_revision: manifest.approved_block_plan_revision,
    resource_snapshot_revision: manifest.resource_snapshot_revision,
    omissions: manifest.omission_summary,
    warnings: manifest.warning_summary,
    homepage_section_order: report.homepage_section_order,
    configuration: Object.fromEntries(jsonEntries.map((entry) => [entry, zipJson(zip, entry)]))
  };
}

function assertPermanentMatrix(outputDirectory) {
  for (const presetId of PRESET_IDS) {
    const directory = path.join(outputDirectory, presetId);
    const zip = path.join(directory, `calinium-${presetId}-demo.zip`);
    for (const file of [zip, path.join(directory, 'manifest.json'), path.join(directory, 'validation-report.json')]) assert.ok(fs.existsSync(file), `${presetId} is missing ${path.basename(file)}.`);
    const manifest = readJson(path.join(directory, 'manifest.json'));
    const report = readJson(path.join(directory, 'validation-report.json'));
    assert.equal(manifest.status, 'passed');
    assert.equal(report.status, 'passed');
    assert.equal(report.package_validation.status, 'passed');
    assert.equal(report.theme_check.status, 'passed');
    assert.equal(report.source_theme_unchanged, true);
    assert.equal(report.temporary_workspace_cleaned, true);
    assert.equal(manifest.shopify_operations.upload, false);
    assert.equal(manifest.shopify_operations.publish, false);
    assert.equal(manifest.shopify_operations.write_operations, false);
    const entries = archiveEntries(zip);
    assert.ok(entries.includes('layout/theme.liquid'));
    assert.ok(entries.includes('config/settings_schema.json'));
    assert.ok(!entries.some((entry) => /^(docs|fixtures|scripts|tests|output|node_modules)\//.test(entry) || entry.endsWith('.DS_Store')), `${presetId} ZIP contains internal project files.`);
    const serializedConfiguration = JSON.stringify(semanticSnapshot(outputDirectory, presetId).configuration);
    assert.ok(!/approval_reference|approved_block_plan_provenance|resource_snapshot_revision_id|preset_checksum|plan_checksum/.test(serializedConfiguration), `${presetId} leaked approval metadata into Shopify JSON.`);
  }
  const summary = readJson(path.join(outputDirectory, 'summary.json'));
  assert.equal(summary.status, 'passed');
  assert.equal(summary.passed_presets, 6);
  assert.equal(summary.failed_presets, 0);
  assert.equal(summary.skipped_presets, 0);
  assert.equal(summary.overall_readiness_for_shopify_upload, 'ready');
}

function assertPresetTruth(outputDirectory) {
  const gallery = semanticSnapshot(outputDirectory, 'gallery');
  assert.deepEqual(gallery.homepage_section_order, ['full-screen-hero', 'lookbook', 'featured-collection', 'editorial-grid', 'newsletter']);
  assert.ok(gallery.generated_sections.find((section) => section.section_id === 'lookbook')?.block_ids.length === 2, 'Gallery must preserve two approved Lookbook frames.');
  assert.ok(gallery.generated_sections.find((section) => section.section_id === 'editorial-grid')?.block_ids.length === 2, 'Gallery must preserve two approved Editorial Grid stories.');
  const atelier = semanticSnapshot(outputDirectory, 'atelier');
  assert.ok(!atelier.homepage_section_order.includes('founder-story'), 'Atelier must omit unsupported founder evidence.');
  assert.ok(atelier.generated_sections.find((section) => section.section_id === 'craftsmanship')?.block_ids.length === 2, 'Atelier must preserve approved Craftsmanship evidence.');
  const essential = semanticSnapshot(outputDirectory, 'essential');
  assert.deepEqual(essential.homepage_section_order, ['full-screen-hero', 'featured-collection', 'newsletter']);
  const signal = JSON.stringify(semanticSnapshot(outputDirectory, 'signal')).toLowerCase();
  for (const claim of ['customer count', 'revenue gain', 'conversion increase', 'uptime statistic', 'security certification', 'pricing plan']) assert.ok(!signal.includes(claim), `Signal invented ${claim}.`);
}

function run() {
  const before = sourceSnapshot(root);
  const unrelated = path.join(testOutput, 'unrelated.keep');
  const firstSnapshots = new Map();
  const firstHashes = new Map();
  try {
    const matrix = loadFixtureMatrix(root);
    assert.ok(readShopifyJson(path.join(root, 'apps/theme/config/settings_data.json')).current, 'Shopify-commented settings_data.json must remain readable without source mutation.');
    assert.deepEqual([...matrix.byPreset.keys()].sort(), [...PRESET_IDS].sort());
    assert.throws(() => parseArgs(['--preset', 'unknown']), /Unknown preset ID/);
    assert.deepEqual(parseArgs(['--preset', 'gallery', '--verbose']), { preset: 'gallery', verbose: true });
    fs.mkdirSync(testOutput, { recursive: true });
    fs.writeFileSync(unrelated, 'preserve me\n');

    const first = runPresetDemoExport({ repositoryRoot: root, outputDirectory: testOutput });
    assert.equal(first.status, 'passed');
    assertPermanentMatrix(testOutput);
    assertPresetTruth(testOutput);
    for (const presetId of PRESET_IDS) {
      firstSnapshots.set(presetId, semanticSnapshot(testOutput, presetId));
      firstHashes.set(presetId, readJson(path.join(testOutput, presetId, 'validation-report.json')).zip_sha256);
    }

    const second = runPresetDemoExport({ repositoryRoot: root, outputDirectory: testOutput });
    assert.equal(second.status, 'passed');
    assertPermanentMatrix(testOutput);
    assertPresetTruth(testOutput);
    for (const presetId of PRESET_IDS) {
      assert.deepEqual(semanticSnapshot(testOutput, presetId), firstSnapshots.get(presetId), `${presetId} demo output is not semantically deterministic.`);
      const secondHash = readJson(path.join(testOutput, presetId, 'validation-report.json')).zip_sha256;
      console.log(`ZIP ${presetId}: first=${firstHashes.get(presetId)} second=${secondHash} byte-identical=${firstHashes.get(presetId) === secondHash}`);
    }
    assert.equal(fs.readFileSync(unrelated, 'utf8'), 'preserve me\n', 'Preset export changed unrelated output.');

    const atelierZip = path.join(testOutput, 'atelier', 'calinium-atelier-demo.zip');
    assert.ok(fs.existsSync(atelierZip));
    const failed = runPresetDemoExport({
      repositoryRoot: root,
      outputDirectory: testOutput,
      selectedPreset: 'gallery',
      presetRunner: () => { throw new Error('injected focused export failure'); }
    });
    assert.equal(failed.failed_presets, 1);
    assert.equal(failed.skipped_presets, 5);
    assert.ok(!fs.existsSync(path.join(testOutput, 'gallery', 'calinium-gallery-demo.zip')), 'Failed preset retained a misleading successful ZIP.');
    assert.equal(readJson(path.join(testOutput, 'gallery', 'validation-report.json')).status, 'failed');
    assert.ok(fs.existsSync(atelierZip), 'Another preset failure removed a successful preset output.');
    assert.equal(fs.readFileSync(unrelated, 'utf8'), 'preserve me\n');
    assert.ok(sameSnapshot(before, sourceSnapshot(root)), 'Preset export changed the source theme.');
    for (const presetId of PRESET_IDS) {
      const generationId = `generation-run-preset-demo-${presetId}`;
      assert.ok(!fs.existsSync(path.join(root, 'output', generationId)) && !fs.existsSync(path.join(root, 'output', 'preview', generationId)), `${presetId} left a temporary workspace.`);
    }
    console.log('Preset demo export tests passed: presets=6; permanent-packages=6; repeat-runs=2; semantic-determinism=passed; Theme-Check=passed; failure-isolation=passed; source-preservation=passed; cleanup=confirmed.');
  } finally {
    if (fs.existsSync(testOutput)) fs.rmSync(testOutput, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try { run(); }
  catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { assertPermanentMatrix, assertPresetTruth, semanticSnapshot, run };
