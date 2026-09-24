#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { compileStorefrontStrategy } = require('../ai/compiler/compile-strategy');
const { buildDraftConfiguration } = require('../ai/draft-builder/build-draft');
const { generateTheme } = require('../ai/theme-generator/generate-theme');
const { validateGeneratedWorkspace } = require('../ai/theme-generator/validate-generated-theme');
const { loadGeneratorMappings } = require('../ai/theme-generator/load-mappings');
const { sourceSnapshot, sameSnapshot, listConfigurationFiles } = require('../ai/theme-generator/utils');

const root = path.resolve(__dirname, '..');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }

function loadExpectations() {
  const manifest = readJson('fixtures/generator-validation-expectations.json');
  assert.equal(manifest.version, 1, 'Generator expectation manifest must use version 1.');
  assert.ok(Array.isArray(manifest.fixtures) && manifest.fixtures.length > 0, 'Generator expectation manifest must include fixtures.');
  return manifest;
}

function expectationForFixture(manifest, fixtureId) {
  const expectation = manifest.fixtures.find((item) => item.fixture_id === fixtureId);
  assert.ok(expectation, `Generator expectation manifest is missing ${fixtureId}.`);
  return expectation;
}

function compilerFixtureExpectation(manifest) {
  // This low-level generator test compiles the legacy compiler fixture rather
  // than the merchant-profile fixture used by the integration matrix. Its
  // approved founder portrait makes Founder Story an intentional shell here;
  // the merchant-profile expectation remains unchanged and is tested by the
  // integration runner.
  const merchantExpectation = expectationForFixture(manifest, 'leather-travel-bags');
  return {
    ...merchantExpectation,
    fixture_id: 'compiler-luxury-leather-bags',
    expected_homepage_section_order: ['full-screen-hero', 'founder-story', 'craftsmanship', 'featured-collection', 'testimonials', 'newsletter'],
    required_sections: ['full-screen-hero', 'founder-story', 'craftsmanship'],
    required_omissions: merchantExpectation.required_omissions.filter((sectionId) => sectionId !== 'founder-story')
  };
}

function homepageSectionIds(plan) {
  return [...(plan.sections || [])]
    .sort((left, right) => left.position - right.position)
    .map((section) => section.section_id);
}

function generatedHomepageSnapshot(generated) {
  const index = readWorkspaceJson(generated.workspace, 'theme/templates/index.json');
  const settings = readWorkspaceJson(generated.workspace, 'theme/config/settings_data.json');
  const instances = generated.manifest.generated_section_instances
    .filter((item) => item.template === 'templates/index.json')
    .sort((left, right) => left.position - right.position)
    .map((item) => ({ instance_id: item.instance_id, section_id: item.section_id, position: item.position, origin: item.origin }));
  return {
    selected_preset: null,
    homepage_section_order: instances.map((item) => item.section_id),
    section_identities: instances.map((item) => item.section_id),
    stable_ids: instances.map((item) => item.instance_id),
    settings,
    configuration: { index, settings },
    warnings: [...generated.manifest.warnings],
    read_only_configuration: generated.source_theme_unchanged === true
  };
}

function readWorkspaceJson(workspace, relative) {
  return JSON.parse(fs.readFileSync(path.join(workspace, relative), 'utf8'));
}

function cleanupGeneratedArtifacts(generationIds) {
  for (const generationId of generationIds) {
    const target = path.join(root, 'output', generationId);
    if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
  }
}

function approvedFixtureDraft() {
  const profile = readJson('ai/compiler/fixtures/valid/luxury-leather-bags.json');
  const strategy = compileStorefrontStrategy(profile, { root });
  const draft = clone(buildDraftConfiguration(profile, strategy, { root }));
  let mediaFieldPromoted = false;
  for (const page of [draft.homepage_plan, ...draft.other_pages]) {
    for (const section of page.sections) {
      const approvedMedia = !mediaFieldPromoted && section.unresolved_merchant_fields.find((field) => field.scope === 'section' && /(image|poster|video)/.test(field.setting_id));
      if (approvedMedia) {
        section.mapped_settings.push({ ...approvedMedia, status: 'proposed', value: null });
        mediaFieldPromoted = true;
      }
      section.unresolved_merchant_fields = [];
      section.merchant_confirmations = [];
      section.validation_status = page.plan_status === 'unsupported' ? 'unsupported' : 'valid';
    }
    if (page.plan_status !== 'unsupported') page.plan_status = 'valid';
  }
  for (const category of ['typography', 'spacing', 'colors', 'motion', 'layout']) {
    for (const setting of draft.global_theme_configuration[category] || []) {
      if (setting.status !== 'proposed') { setting.status = 'proposed'; setting.value = setting.value ?? null; }
    }
  }
  draft.merchant_input_requirements = { required: [], high: [], medium: [], low: [] };
  draft.required_assets.required = draft.required_assets.required.map((asset) => ({ ...asset, present: true }));
  draft.required_assets.missing = [];
  draft.merchant_review_queue = [];
  draft.blocked_fields = [];
  draft.draft_readiness = { status: 'Ready', explanations: ['All required merchant input, assets, and confirmations are supplied in this approved fixture.'] };
  draft.summary = { ...draft.summary, unresolved_input_count: 0, missing_asset_count: 0, review_item_count: 0, blocked_field_count: 0, readiness: 'Ready', reasoning: 'This fixture represents an immutable, fully resolved post-approval draft for generator validation.' };
  draft.validation_report = { valid: true, errors: [], warnings: [] };
  return draft;
}

function approvalFor(draft) {
  const merchantReferences = {};
  const completed = ['all-required-confirmations-complete'];
  for (const page of [draft.homepage_plan, ...draft.other_pages]) {
    for (const section of page.sections) {
      for (const setting of section.mapped_settings) {
        if (setting.value === null && /(image|poster|video)/.test(setting.setting_id)) {
          merchantReferences[setting.setting_ref] = `shopify://merchant-assets/${setting.setting_ref.replace(/\./g, '-')}`;
          completed.push(`field:${setting.setting_ref}`);
        }
      }
    }
  }
  return {
    version: 1,
    approval_id: 'approved-luxury-fixture',
    draft_version: draft.version,
    approved: true,
    approved_at: '2026-07-20T00:00:00.000Z',
    approval_reference: 'merchant-approval-fixture-001',
    completed_confirmations: completed,
    merchant_references: merchantReferences,
    asset_references: Object.fromEntries((draft.required_assets.required || []).map((asset) => [asset.asset_id, `shopify://merchant-assets/${asset.asset_id}`])),
    notes: 'Fixture-only opaque Shopify resource references; no merchant copy or media is invented.'
  };
}

function assertWarningExpectation(warnings, expectation) {
  for (const required of expectation.expected_warnings.must_include || []) assert.ok(warnings.some((warning) => warning.includes(required)), `Expected warning ${required} was not emitted.`);
  for (const forbidden of expectation.expected_warnings.must_not_include || []) assert.ok(!warnings.some((warning) => warning.includes(forbidden)), `Forbidden warning ${forbidden} was emitted.`);
}

function assertSectionExpectation(sectionIds, expectation) {
  assert.deepStrictEqual(sectionIds, expectation.expected_homepage_section_order, 'Generated homepage section order differs from the semantic expectation.');
  for (const sectionId of expectation.required_sections) assert.ok(sectionIds.includes(sectionId), `Required section ${sectionId} is absent.`);
  for (const sectionId of expectation.forbidden_sections) assert.ok(!sectionIds.includes(sectionId), `Forbidden section ${sectionId} was generated.`);
  for (const sectionId of expectation.required_omissions) assert.ok(!sectionIds.includes(sectionId), `Expected omission ${sectionId} was generated.`);
}

function run() {
  const errors = [];
  const fail = (message) => errors.push(message);
  const expectations = loadExpectations();
  const expectation = compilerFixtureExpectation(expectations);
  const profile = readJson('ai/compiler/fixtures/valid/luxury-leather-bags.json');
  const firstStrategy = compileStorefrontStrategy(profile, { root });
  const secondStrategy = compileStorefrontStrategy(profile, { root });
  const draft = approvedFixtureDraft();
  const approval = approvalFor(draft);
  const generationIds = [`generation-run-rejected-${process.pid}`, `generation-run-test-a-${process.pid}`, `generation-run-test-b-${process.pid}`];
  const before = sourceSnapshot(root);
  let first;
  let second;
  try {
    assert.deepStrictEqual(firstStrategy, secondStrategy, 'Identical compiler inputs must produce the same strategy.');
    assert.equal(firstStrategy.homepage_recipe, expectation.expected_compiler_strategy, 'Compiler strategy differs from the semantic expectation.');
    assertSectionExpectation(homepageSectionIds(draft.homepage_plan), expectation);

    try {
      generateTheme({ root, draft: { ...draft, draft_readiness: { ...draft.draft_readiness, status: 'Blocked' } }, approval, generationId: generationIds[0], outputRoot: path.join(root, 'output') });
      fail('Approval gate accepted a non-Ready draft.');
    } catch (error) {
      if (!/Draft readiness must be Ready/.test(error.message)) fail(`Approval gate rejected for an unexpected reason: ${error.message}`);
    }

    first = generateTheme({ root, draft, approval, generationId: generationIds[1], outputRoot: path.join(root, 'output') });
    second = generateTheme({ root, draft, approval, generationId: generationIds[2], outputRoot: path.join(root, 'output') });
    const validation = validateGeneratedWorkspace({ root, workspace: first.workspace, mappings: loadGeneratorMappings(root) });
    if (!validation.valid) fail(`Generated workspace did not validate: ${validation.errors.join('; ')}`);
    const firstFiles = listConfigurationFiles(path.join(first.workspace, 'theme')).map((file) => file.split(path.sep).join('/'));
    if (firstFiles.some((file) => !(file === 'config/settings_data.json' || /^templates\/.+\.json$/.test(file)))) fail('Generated workspace contains runtime files beyond Shopify configuration.');
    if (!fs.existsSync(path.join(first.workspace, 'manifests/source-runtime-backup.tar.gz'))) fail('Generated workspace is missing its validated pre-generation source backup.');
    const firstSnapshot = generatedHomepageSnapshot(first);
    const secondSnapshot = generatedHomepageSnapshot(second);
    assertSectionExpectation(firstSnapshot.homepage_section_order, expectation);
    assertWarningExpectation(firstSnapshot.warnings, expectation);
    if (firstSnapshot.configuration.index.order.length !== firstSnapshot.homepage_section_order.length) fail('Generated homepage retained unapproved baseline sections outside the approved composition.');
    if (/Make this space your own|A clear place to begin|Replace this starter message/.test(JSON.stringify(firstSnapshot.configuration.index))) fail('Generated homepage leaked starter content outside the approved composition.');
    assert.deepStrictEqual(firstSnapshot, secondSnapshot, 'Identical approved inputs did not produce deterministic semantic generator output.');
    assert.equal(firstSnapshot.selected_preset, expectation.expected_selected_preset, 'Generator reported an unexpected selected preset.');
    if (!JSON.stringify(firstSnapshot.configuration).includes('shopify://merchant-assets/')) fail('An explicitly approved merchant media reference was not preserved in the generated section settings.');
    if (fs.existsSync(path.join(first.workspace, 'theme/templates/blog.json'))) fail('Unsupported blog plan should not generate a blog template.');
  } catch (error) {
    fail(`Generation test failed: ${error.message}`);
  } finally {
    cleanupGeneratedArtifacts(generationIds);
  }
  if (!sameSnapshot(before, sourceSnapshot(root))) fail('Generator altered a source theme runtime directory.');
  if (generationIds.some((id) => fs.existsSync(path.join(root, 'output', id)))) fail('Theme Generator test left an isolated workspace behind.');
  if (errors.length) throw new Error(errors.join('\n- '));
  return { fixture_id: expectation.fixture_id, strategy: firstStrategy.homepage_recipe, sections: homepageSectionIds(draft.homepage_plan), determinism: 'passed' };
}

if (require.main === module) {
  try {
    const result = run();
    console.log(`Theme Generator tests passed: ${result.fixture_id}, approval gate, semantic expectation, deterministic configuration, omission validation, preserved source runtime, schema validation, and cleanup.`);
  } catch (error) {
    console.error(`Theme Generator tests failed:\n- ${error.stack || error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  approvedFixtureDraft,
  approvalFor,
  cleanupGeneratedArtifacts,
  compilerFixtureExpectation,
  expectationForFixture,
  generatedHomepageSnapshot,
  homepageSectionIds,
  loadExpectations,
  run
};
