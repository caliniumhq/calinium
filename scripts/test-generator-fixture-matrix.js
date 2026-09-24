#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { compileStorefrontStrategy } = require('../ai/compiler/compile-strategy');
const { loadMappings } = require('../ai/draft-builder/load-mappings');
const { resolveMappedSections, resolveSectionPlan } = require('../ai/draft-builder/resolve-sections');
const { generateTheme } = require('../ai/theme-generator/generate-theme');
const { loadGeneratorMappings } = require('../ai/theme-generator/load-mappings');
const { approvedFixtureDraft, approvalFor, cleanupGeneratedArtifacts } = require('./test-theme-generator');
const { loadExpectations, runFixture } = require('./test-merchant-profile-integration');

const root = path.resolve(__dirname, '..');

function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }

function loadInvalidExpectations() {
  const manifest = readJson('fixtures/generator-validation-invalid.json');
  assert.equal(manifest.version, 1, 'Invalid generator expectation manifest must use version 1.');
  assert.ok(Array.isArray(manifest.fixtures) && manifest.fixtures.length > 0, 'Invalid generator expectation manifest must include fixtures.');
  for (const fixture of manifest.fixtures) {
    for (const key of ['fixture_id', 'handler', 'expected_failure_phase', 'expected_error_category', 'expected_error_family']) assert.equal(typeof fixture[key], 'string', `Invalid fixture requires ${key}.`);
    assert.equal(fixture.generation_permitted, false, `${fixture.fixture_id} must deny generation.`);
    assert.equal(fixture.package_creation_permitted, false, `${fixture.fixture_id} must deny package creation.`);
  }
  return manifest;
}

function fixtureStrategy() {
  return compileStorefrontStrategy(readJson('ai/compiler/fixtures/valid/luxury-leather-bags.json'), { root });
}

function invalidEnumDraft() {
  const draft = approvedFixtureDraft();
  const mappings = loadGeneratorMappings(root);
  for (const page of [draft.homepage_plan, ...draft.other_pages]) {
    for (const section of page.sections || []) {
      const capability = mappings.index.sections.get(section.section_id);
      const candidate = (section.mapped_settings || []).find((setting) => {
        const capabilitySetting = capability?.available_settings.find((item) => item.setting_id === setting.setting_id);
        return setting.scope === 'section'
          && setting.status === 'proposed'
          && capabilitySetting?.accepted_values?.kind === 'options'
          && capabilitySetting.ai_configurable
          && !capabilitySetting.merchant_only
          && !capabilitySetting.merchant_review_required;
      });
      if (candidate) {
        candidate.value = 'generator-fixture-invalid-enum';
        return draft;
      }
    }
  }
  throw new Error('Fixture could not find a safe generated select setting for invalid-enum validation.');
}

function executeInvalidFixture(fixture) {
  const generationId = `generation-run-fixture-matrix-invalid-${fixture.fixture_id}-${process.pid}`;
  const outputRoot = path.join(root, 'output');
  const mappings = loadMappings({ root });
  const mapping = mappings.index.strategy_sections.get('layout_recipe.luxury_story');
  let operation;
  if (fixture.handler === 'blocked_draft_readiness') {
    operation = () => {
      const draft = approvedFixtureDraft();
      return generateTheme({ root, draft: { ...draft, draft_readiness: { ...draft.draft_readiness, status: 'Blocked' } }, approval: approvalFor(draft), generationId, outputRoot });
    };
  } else if (fixture.handler === 'duplicate_mapped_section') {
    operation = () => resolveMappedSections({
      pageId: 'homepage',
      sectionIds: [...mapping.sections.map((section) => section.section_id), mapping.sections[0].section_id],
      mapping,
      strategy: fixtureStrategy(),
      mappings
    });
  } else if (fixture.handler === 'unknown_section_identity') {
    operation = () => resolveSectionPlan({
      pageId: 'homepage',
      position: 1,
      sectionId: 'unknown-generator-fixture-section',
      mapping,
      strategy: fixtureStrategy(),
      mappings
    });
  } else if (fixture.handler === 'invalid_section_enum') {
    operation = () => {
      const draft = invalidEnumDraft();
      return generateTheme({ root, draft, approval: approvalFor(draft), generationId, outputRoot });
    };
  } else if (fixture.handler === 'unapproved_generation_request') {
    operation = () => {
      const draft = approvedFixtureDraft();
      const approval = { ...approvalFor(draft), approved: false };
      return generateTheme({ root, draft, approval, generationId, outputRoot });
    };
  } else {
    throw new Error(`Unsupported invalid fixture handler ${fixture.handler}.`);
  }

  let error = null;
  try {
    operation();
  } catch (caught) {
    error = caught;
  } finally {
    cleanupGeneratedArtifacts([generationId]);
  }
  assert.ok(error, `${fixture.fixture_id} unexpectedly permitted ${fixture.expected_failure_phase}.`);
  assert.ok(error.message.includes(fixture.expected_error_family), `${fixture.fixture_id} failed with an unexpected error: ${error.message}`);
  assert.ok(!fs.existsSync(path.join(outputRoot, generationId)), `${fixture.fixture_id} left a generator workspace behind.`);
  assert.ok(!fs.existsSync(path.join(outputRoot, 'preview', generationId)), `${fixture.fixture_id} left a preview package behind.`);
  return {
    fixture_id: fixture.fixture_id,
    phase: fixture.expected_failure_phase,
    category: fixture.expected_error_category,
    generation: 'denied',
    package: 'denied'
  };
}

function validateValidManifest(manifest) {
  const ids = manifest.fixtures.map((fixture) => fixture.fixture_id);
  assert.equal(new Set(ids).size, ids.length, 'Generator expectation manifest contains duplicate fixture IDs.');
  for (const fixture of manifest.fixtures) {
    for (const key of ['fixture_id', 'merchant_fixture', 'expected_strategy', 'expected_compiler_strategy']) assert.equal(typeof fixture[key], 'string', `Fixture requires ${key}.`);
    assert.ok(Array.isArray(fixture.expected_homepage_section_order), `${fixture.fixture_id} requires an expected homepage section order.`);
    assert.ok(Array.isArray(fixture.required_sections), `${fixture.fixture_id} requires required sections.`);
    assert.ok(Array.isArray(fixture.forbidden_sections), `${fixture.fixture_id} requires forbidden sections.`);
    assert.ok(Array.isArray(fixture.required_omissions), `${fixture.fixture_id} requires omissions.`);
    assert.equal(fixture.determinism.repeat_runs, 2, `${fixture.fixture_id} must require two deterministic runs.`);
    assert.equal(fixture.read_only_assertions.write_operations, false, `${fixture.fixture_id} must preserve read-only generation.`);
    assert.equal(fixture.read_only_assertions.upload, false, `${fixture.fixture_id} must forbid upload.`);
    assert.equal(fixture.read_only_assertions.publish, false, `${fixture.fixture_id} must forbid publish.`);
    assert.ok(fs.existsSync(path.join(root, 'fixtures', fixture.merchant_fixture)), `${fixture.fixture_id} references a missing merchant fixture.`);
  }
}

function run() {
  const valid = loadExpectations();
  const invalid = loadInvalidExpectations();
  validateValidManifest(valid);
  const reports = [];
  const failures = [];
  for (const [index, fixture] of valid.fixtures.entries()) {
    try {
      const report = runFixture(fixture, index);
      reports.push({ kind: 'valid', ...report });
      console.log(`PASS ${report.fixture_id}: strategy=${report.strategy}; sections=${report.sections.join(',')}; omitted=${report.omitted_sections.join(',')}; warnings=${report.warnings.length}; package=${report.package_validation}; theme-check=${report.theme_check}; determinism=${report.determinism}`);
    } catch (error) {
      failures.push(`${fixture.fixture_id}: ${error.stack || error.message}`);
      console.error(`FAIL ${fixture.fixture_id}: ${error.message}`);
    }
  }
  for (const fixture of invalid.fixtures) {
    try {
      const report = executeInvalidFixture(fixture);
      reports.push({ kind: 'invalid', ...report });
      console.log(`PASS ${report.fixture_id}: phase=${report.phase}; category=${report.category}; generation=${report.generation}; package=${report.package}`);
    } catch (error) {
      failures.push(`${fixture.fixture_id}: ${error.stack || error.message}`);
      console.error(`FAIL ${fixture.fixture_id}: ${error.message}`);
    }
  }
  const deterministicFailures = failures.filter((failure) => /deterministic/i.test(failure)).length;
  const validCount = valid.fixtures.length;
  const invalidCount = invalid.fixtures.length;
  const passed = reports.length;
  console.log(`Fixture matrix summary: total=${validCount + invalidCount}; passed=${passed}; failed=${failures.length}; skipped=0; deterministic-failures=${deterministicFailures}; cleanup=confirmed.`);
  if (failures.length) throw new Error(`Generator fixture matrix failed:\n- ${failures.join('\n- ')}`);
  return { total: validCount + invalidCount, passed, failed: 0, skipped: 0, deterministic_failures: 0, cleanup: 'confirmed' };
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

module.exports = { executeInvalidFixture, loadInvalidExpectations, run, validateValidManifest };
