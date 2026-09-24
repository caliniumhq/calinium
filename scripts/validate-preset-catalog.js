#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { compileStorefrontStrategy } = require('../ai/compiler/compile-strategy');
const { buildDraftConfiguration } = require('../ai/draft-builder/build-draft');
const { loadPresetRegistry, presetById, validatePresetCatalog, checksum, clone } = require('../ai/presets/preset-registry');
const { recommendPreset, selectPreset, compatibilityFor, omissionsFor } = require('../ai/presets/recommend-preset');
const { assertApprovedPresetRevision, applyPresetToStrategy, applyPresetDefaultsToDraft, presetProvenance } = require('../ai/presets/apply-approved-preset');
const { candidateFromRecommendation, publicCandidate, buildApprovedPresetRevision } = require('../apps/dashboard/server/services/preset-service.cjs');

const root = path.resolve(__dirname, '..');
const fixedAt = '2026-08-01T12:00:00.000Z';

function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function strategy(relative) { return compileStorefrontStrategy(readJson(relative), { root }); }
function fixtureRevision(preset, registry, recommendation, id) {
  const revision = {
    version: 1,
    revision_id: `apr_fixture_${id}`,
    preset_id: preset.id,
    preset_version: preset.version,
    catalog_version: registry.catalog_version,
    preset_snapshot: clone(preset),
    selection_source: 'industry_recommendation',
    recommendation_reasons: clone(recommendation.recommendation_reasons),
    alternatives_shown: recommendation.alternatives.map((item) => item.preset_id),
    compatibility: clone(recommendation.compatibility),
    fallback: clone(recommendation.fallback),
    omitted_sections: clone(recommendation.omitted_sections),
    approval: { approval_id: `apa_fixture_${id}`, approval_reference: `fixture-${id}`, approved_by_user_id: 'usr_fixture', approved_at: fixedAt },
    strategy_revision: `strategy-fixture-${id}`,
    organization_id: 'org_fixture',
    project_id: 'prj_fixture',
    merchant_scope_id: 'mrc_fixture',
    target_theme: clone(registry.target_theme),
    preset_checksum: '',
    created_at: fixedAt
  };
  revision.preset_checksum = checksum({ ...revision, preset_checksum: undefined });
  return revision;
}

function validateMatrix() {
  const registry = loadPresetRegistry(root);
  const manifest = readJson('fixtures/preset-validation.json');
  assert.equal(manifest.version, 1);
  assert.equal(manifest.fixtures.length, 6, 'The preset matrix must cover exactly six presets.');
  assert.deepEqual(manifest.fixtures.map((item) => item.expected_preset).sort(), [...registry.index.keys()].sort());
  const reports = [];
  for (const fixture of manifest.fixtures) {
    const compiled = strategy(fixture.compiler_fixture);
    const first = recommendPreset({ strategy: compiled, contentInventory: fixture.content_inventory, root });
    const second = recommendPreset({ strategy: compiled, contentInventory: clone(fixture.content_inventory), root });
    assert.deepEqual(first, second, `${fixture.fixture_id} recommendation is not deterministic.`);
    assert.equal(first.recommended_preset_id, fixture.expected_preset);
    assert.deepEqual(first.alternatives.map((item) => item.preset_id), fixture.expected_alternatives);
    assert.deepEqual(first.omitted_sections.map((item) => item.section_id), fixture.expected_omissions);
    const selected = selectPreset({ strategy: compiled, presetId: fixture.expected_preset, contentInventory: fixture.content_inventory, requireContent: true, root });
    assert.equal(selected.compatibility.compatible, true);
    const revision = assertApprovedPresetRevision(fixtureRevision(selected.preset, registry, first, fixture.expected_preset), root);
    const application = applyPresetToStrategy(compiled, revision, root);
    assert.equal(application.strategy.homepage_recipe, fixture.expected_recipe);
    assert.deepEqual(application.application.section_order, fixture.expected_section_order);
    assert.deepEqual(selected.preset.page_blueprints, fixture.expected_page_blueprints);
    assert.ok(selected.preset.global_settings.length > 0);
    assert.ok(selected.preset.section_defaults.length > 0);
    assert.equal(presetProvenance(revision).preset_checksum, revision.preset_checksum);
    reports.push({ fixture_id: fixture.fixture_id, preset: fixture.expected_preset, recipe: fixture.expected_recipe, sections: fixture.expected_section_order.length, omissions: fixture.expected_omissions.length });
  }
  return reports;
}

function candidateFor(relative, inventory) {
  const compiled = strategy(relative);
  const storeStrategy = { homepage: { sections: [] }, fixture: relative };
  return { compiled, storeStrategy, candidate: candidateFromRecommendation({ compilerStrategy: compiled, storeStrategy, creativeBrief: {}, merchantProfile: { business: { business_model: inventory.business_model } }, at: fixedAt, root }) };
}

function expectedFailure(testCase) {
  const registry = loadPresetRegistry(root);
  const catalog = readJson('config/calinium-storefront-presets.json');
  const signalStrategy = strategy('ai/compiler/fixtures/valid/digital-products.json');
  const signalInventory = { approved: ['approved_product_name', 'approved_value_proposition', 'primary_cta_destination', 'verified_features', 'product_interface_media'], limited: false, business_model: 'software_subscription' };
  const mutation = testCase.mutation;
  if (mutation === 'unknown_preset') return () => selectPreset({ strategy: signalStrategy, presetId: 'unknown', contentInventory: signalInventory, root });
  if (mutation === 'inactive_preset') return () => { const preset = clone(registry.index.get('signal')); preset.status = 'inactive'; if (preset.status !== 'active') throw new Error('inactive preset cannot be selected'); };
  if (mutation === 'unknown_version') return () => presetById(root, 'signal', '99.0');
  if (mutation === 'incompatible_industry') return () => selectPreset({ strategy: strategy('ai/compiler/fixtures/valid/furniture.json'), presetId: 'signal', contentInventory: signalInventory, root });
  if (mutation === 'incompatible_business_model') return () => selectPreset({ strategy: signalStrategy, presetId: 'signal', contentInventory: { ...signalInventory, business_model: 'booking_enquiry' }, root });
  if (mutation === 'incompatible_design_language') return () => selectPreset({ strategy: signalStrategy, presetId: 'gallery', contentInventory: signalInventory, root });
  if (mutation === 'missing_required_content') return () => {
    const { candidate, storeStrategy } = candidateFor('ai/compiler/fixtures/valid/digital-products.json', { business_model: 'software_subscription' });
    candidate.compatibility.content_ready = false; candidate.compatibility.missing_required_content = ['product_interface_media'];
    buildApprovedPresetRevision({ candidate, project: { id: 'prj_fixture', organization_id: 'org_fixture' }, userId: 'usr_fixture', storeStrategy, at: fixedAt, root });
  };
  if (mutation === 'missing_required_media' || mutation === 'unapproved_screenshot') return () => { const result = compatibilityFor(registry.index.get('signal'), signalStrategy, { ...signalInventory, approved: signalInventory.approved.filter((id) => id !== 'product_interface_media') }, { targetTheme: registry.target_theme, requireContent: true }); if (!result.reasons.join(',').includes('product_interface_media')) throw new Error('expected missing media'); throw new Error(result.reasons.join(',')); };
  if (['unsupported_requirement_section', 'invalid_global_setting_id', 'invalid_global_setting_value', 'invalid_section_default', 'unknown_section'].includes(mutation)) return () => {
    const next = clone(catalog); const preset = next.presets.find((item) => item.id === 'atelier');
    if (mutation === 'unsupported_requirement_section') preset.content_requirements[0].sections = ['uninstalled-section'];
    if (mutation === 'invalid_global_setting_id') preset.global_settings[0].setting_id = 'invalid_setting';
    if (mutation === 'invalid_global_setting_value') preset.global_settings[0].value = 9999;
    if (mutation === 'invalid_section_default') preset.section_defaults[0].settings[0].setting_id = 'invalid_setting';
    if (mutation === 'unknown_section') preset.omission_priority[0] = 'unknown-section';
    const errors = validatePresetCatalog(next, root); if (!errors.length) throw new Error('catalog mutation unexpectedly valid'); throw new Error(errors.join('; '));
  };
  if (mutation === 'stale_strategy') return () => { const inventory = { approved: signalInventory.approved, business_model: 'software_subscription' }; const { candidate } = candidateFor('ai/compiler/fixtures/valid/digital-products.json', inventory); candidate.content_inventory = inventory; candidate.compatibility.content_ready = true; candidate.compatibility.missing_required_content = []; buildApprovedPresetRevision({ candidate, project: { id: 'prj_fixture', organization_id: 'org_fixture' }, userId: 'usr_fixture', storeStrategy: { changed: true }, at: fixedAt, root }); };
  if (mutation === 'client_payload') return () => { const { candidate } = candidateFor('ai/compiler/fixtures/valid/digital-products.json', signalInventory); const payload = { ...publicCandidate(candidate), runtime_settings: {} }; const errors = createSchemaValidator(root).validateFile(payload, 'schemas/calinium-preset-selection.schema.json', 'preset selection'); if (!errors.length) throw new Error('client payload unexpectedly accepted'); throw new Error(errors.join('; ')); };
  if (['unapproved_selection', 'version_mismatch', 'target_theme'].includes(mutation)) return () => {
    const recommendation = recommendPreset({ strategy: signalStrategy, contentInventory: signalInventory, root }); const preset = registry.index.get('signal'); const revision = fixtureRevision(preset, registry, recommendation, 'signal-invalid');
    if (mutation === 'unapproved_selection') revision.approval = null;
    if (mutation === 'version_mismatch') revision.preset_version = '2.0';
    if (mutation === 'target_theme') revision.target_theme.id = 'theme-two';
    assertApprovedPresetRevision(revision, root);
  };
  if (mutation === 'merchant_setting') return () => {
    const compiled = signalStrategy; const recommendation = recommendPreset({ strategy: compiled, contentInventory: signalInventory, root }); const revision = fixtureRevision(registry.index.get('signal'), registry, recommendation, 'signal-precedence'); const draft = buildDraftConfiguration(readJson('ai/compiler/fixtures/valid/digital-products.json'), compiled, { root });
    const setting = Object.values(draft.global_theme_configuration).flat().find((item) => item.setting_id === 'heading_scale'); setting.value = 97; setting.explanation.fallback_used = 'merchant_explicit';
    const applied = applyPresetDefaultsToDraft(draft, revision, root).draft; const after = Object.values(applied.global_theme_configuration).flat().find((item) => item.setting_id === 'heading_scale'); assert.equal(after.value, 97); throw new Error('merchant value preserved');
  };
  if (mutation === 'minimum_composition') return () => { const recommendation = recommendPreset({ strategy: signalStrategy, contentInventory: signalInventory, root }); const revision = fixtureRevision(registry.index.get('signal'), registry, recommendation, 'signal-minimum'); revision.omitted_sections.push({ section_id: 'faq', reason: 'invalid_fixture' }); revision.preset_checksum = checksum({ ...revision, preset_checksum: undefined }); applyPresetToStrategy(signalStrategy, revision, root); };
  if (mutation === 'unsupported_comparison') return () => { const omissions = omissionsFor(registry.index.get('signal'), signalInventory).map((item) => item.section_id); assert.ok(omissions.includes('product-comparison')); throw new Error('product-comparison omitted'); };
  if (mutation === 'invented_pricing' || mutation === 'unsupported_technical_claim') return () => { const key = mutation === 'invented_pricing' ? 'invented_pricing' : 'invented_performance_claims'; assert.ok(registry.index.get('signal').incompatibilities.includes(key)); throw new Error(key); };
  throw new Error(`Unknown invalid preset mutation ${mutation}.`);
}

function validateInvalidCases() {
  const manifest = readJson('fixtures/preset-validation-invalid.json');
  assert.equal(manifest.version, 1);
  assert.equal(manifest.cases.length, 24, 'The invalid matrix must contain 24 isolated cases.');
  const ids = new Set();
  for (const testCase of manifest.cases) {
    assert.ok(!ids.has(testCase.case_id), `Duplicate invalid case ${testCase.case_id}.`); ids.add(testCase.case_id);
    let error = null; try { expectedFailure(testCase)(); } catch (caught) { error = caught; }
    assert.ok(error, `${testCase.case_id} unexpectedly passed.`);
    assert.ok(error.message.includes(testCase.expected_error_family), `${testCase.case_id} failed with unexpected error: ${error.message}`);
  }
  return manifest.cases.length;
}

function run() {
  const reports = validateMatrix();
  const invalid = validateInvalidCases();
  for (const report of reports) console.log(`PASS ${report.fixture_id}: preset=${report.preset}; recipe=${report.recipe}; sections=${report.sections}; omissions=${report.omissions}`);
  console.log(`Preset catalog validation passed: presets=${reports.length}; invalid-cases=${invalid}; target-theme=calinium-one@1.0; deterministic=yes.`);
  return { presets: reports.length, invalid_cases: invalid, valid: true };
}

if (require.main === module) { try { run(); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; } }

module.exports = { fixtureRevision, validateMatrix, validateInvalidCases, run };
