#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  loadArchitectureRegistry,
  validateArchitectureCatalog,
  createStoreIntelligenceContract,
  createMerchantIntent,
  selectArchitecture,
  assertFrozenArchitectureSelection,
  solveArchitectureCompatibility,
  architectureProvenance,
  resolveArchitectureRuntime,
  assertSafeTarget
} = require('../ai/architecture');
const { createCreativeBrief } = require('../pipeline/create-creative-brief');
const { createStoreStrategy } = require('../pipeline/create-store-strategy');
const { createReviewState, approveAll } = require('../pipeline/review-state');
const { generateStorefront } = require('../pipeline/generate-storefront');
const { fixtureGenerationContext, removeGeneratedArtifacts } = require('./test-merchant-profile-integration');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');

const root = path.resolve(__dirname, '..');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function workspaceJson(result, relative) { return JSON.parse(fs.readFileSync(path.join(result.generated_theme.workspace, relative), 'utf8')); }

function testRegistryAndContracts() {
  const registry = loadArchitectureRegistry(root);
  assert.equal(validateArchitectureCatalog({ root }).valid, true);
  assert.equal(registry.profiles.default_profile_id, 'profile.current_calinium.v1');
  assert.equal(registry.profiles.profiles.length, 2, 'Core 2.0 must register current Calinium and the controlled Editorial Discovery proof.');
  assert.equal(registry.families.families.length, 11, 'Core 2.0 must register six current families and five Editorial Discovery families.');
  for (const family of registry.families.families) {
    assert.ok(family.presenters.length > 0);
    for (const runtimeFile of family.runtime_files) assert.ok(fs.existsSync(path.join(root, runtimeFile)), `${family.id} presenter file is unavailable.`);
  }

  const intelligence = createStoreIntelligenceContract({
    revisionId: 'miv_core_2_fixture',
    normalizationVersion: 'store-intelligence-v1',
    intelligence: {
      status: 'usable', category: { id: 'luxury_fashion', confidence: 'High' },
      catalog: { product_count: 12, collection_count: 3 }, navigation: { menu_count: 2, confidence: 'High' },
      media: { usable_image_count: 18, video_count: 1, confidence: 'High' }, store: { market_count: 1, theme_count: 2, unpublished_theme_count: 1 }
    }, root
  });
  const intent = createMerchantIntent({ storeIntelligence: intelligence, root });
  const intentAgain = createMerchantIntent({ storeIntelligence: intelligence, root });
  assert.deepEqual(intent, intentAgain, 'Merchant Intent serialization must be deterministic.');
  assert.equal(intent.inferred_shopify_facts.length, intelligence.facts.length);
  assert.deepEqual(intent.merchant_provided_answers, []);
  assert.deepEqual(intent.explicit_preferences, []);
  assert.deepEqual(intent.unresolved_material_decisions, []);

  const creativeBrief = createCreativeBrief({ merchantInput: readJson('fixtures/leather-travel-bags.json'), root });
  const storeStrategy = createStoreStrategy({ creativeBrief, root });
  const explicitIntent = createMerchantIntent({ creativeBrief, storeStrategy, storeIntelligence: intelligence, root });
  assert.ok(explicitIntent.merchant_provided_answers.length > 0);
  assert.ok(explicitIntent.explicit_preferences.length > 0);
  assert.ok(explicitIntent.provenance.some((entry) => entry.source_type === 'approved_creative_brief'));
  assert.ok(explicitIntent.provenance.some((entry) => entry.source_type === 'approved_store_strategy'));
  assert.throws(() => createMerchantIntent({ storeIntelligence: intelligence, unresolvedMaterialDecisions: [
    { id: 'one', question: 'First?', materiality: 'architecture_changing', status: 'unresolved' },
    { id: 'two', question: 'Second?', materiality: 'architecture_changing', status: 'unresolved' }
  ], root }), /at most one/);

  const selectionInputsBefore = JSON.stringify({ intent, intelligence });
  const selected = selectArchitecture({ merchantIntent: intent, storeIntelligence: intelligence, root });
  assert.equal(JSON.stringify({ intent, intelligence }), selectionInputsBefore, 'Architecture selection must not mutate Store Intelligence or Merchant Intent.');
  assert.equal(selected.profile_id, 'profile.current_calinium.v1');
  assert.equal(selected.selection_source, 'default_fallback');
  assert.equal(selected.compatibility_result.valid, true);
  assert.equal(selected.eligibility_result.eligible, true);
  assert.deepEqual(selected.eligibility_result.missing_signals, []);
  assert.deepEqual(selected.fit_result, { evaluator_version: 'architecture-fit-v1', candidate_count: 1, rank: 1, score: 1, reason_codes: ['only_registered_eligible_profile'] });
  assert.equal(selected.material_question, null);
  assert.deepEqual(selected.lifecycle.resolved_before, ['design_dna', 'composition']);
  assert.equal(assertFrozenArchitectureSelection(selected, root), selected);
  assert.equal(architectureProvenance(selected, root).store_intelligence_revision, 'miv_core_2_fixture');
  const explicit = selectArchitecture({ profileId: 'profile.current_calinium.v1', profileVersion: '1.0.0', merchantIntent: intent, storeIntelligence: intelligence, root });
  assert.equal(explicit.selection_source, 'explicit_profile');
  assert.equal(explicit.fallback, null);
  const phaseBBaseline = readJson('fixtures/storefront-render-current-calinium-baseline.json');
  assert.equal(phaseBBaseline.architecture.selection_revision_id, 'architecture-selection-ccbcab2a5f566e2b1b6f', 'The tracked Phase B current-Calinium selection revision must remain stable.');
  assert.equal(phaseBBaseline.architecture.profile_id, 'profile.current_calinium.v1');
  const currentRuntime = resolveArchitectureRuntime({ root, architecture: architectureProvenance(selected, root) });
  assert.equal(currentRuntime.applied, false, 'The current profile must remain a strict runtime no-op.');
  assert.deepEqual(currentRuntime.overlays, []);
  const editorial = selectArchitecture({ profileId: 'profile.editorial_discovery.v1', profileVersion: '1.0.0', merchantIntent: intent, storeIntelligence: intelligence, root });
  assert.equal(editorial.selection_source, 'explicit_profile');
  assert.deepEqual(editorial.fit_result.reason_codes, ['explicit_registered_profile_selected']);
  assert.equal(editorial.family_selections.find((family) => family.family === 'cart').family_id, 'family.cart.current_calinium.v1');
  assert.ok(editorial.family_selections.filter((family) => family.family !== 'cart').every((family) => family.family_id.includes('.editorial_discovery.')));
  const editorialRuntime = resolveArchitectureRuntime({ root, architecture: architectureProvenance(editorial, root) });
  assert.equal(editorialRuntime.applied, true);
  assert.equal(editorialRuntime.overlays.length, 14);
  assert.equal(new Set(editorialRuntime.overlays.map((overlay) => overlay.target)).size, editorialRuntime.overlays.length);
  const invalidFamilyVersion = clone(selected);
  invalidFamilyVersion.family_selections[0].family_version = '9.0.0';
  assert.throws(() => assertFrozenArchitectureSelection(invalidFamilyVersion, root), /invalid family version/);
  const invalidPresenters = clone(selected);
  invalidPresenters.family_selections[0].presenters = ['section.unregistered'];
  assert.throws(() => assertFrozenArchitectureSelection(invalidPresenters, root), /presenters do not match/);
}

function registryWithFamily(registry, family) {
  const familyById = new Map(registry.familyById);
  familyById.set(family.id, family);
  return { ...registry, familyById };
}

function testSafeFailures() {
  const registry = loadArchitectureRegistry(root);
  const profile = registry.profileById.get('profile.current_calinium.v1');
  const unknown = { ...profile.family_selections, cart: 'family.cart.unregistered.v9' };
  const unknownResult = solveArchitectureCompatibility({ profileId: profile.id, familySelections: unknown, registry, root });
  assert.equal(unknownResult.valid, false);
  assert.ok(unknownResult.errors.some((error) => error.includes('Unknown architecture family')));

  const header = registry.familyById.get(profile.family_selections.header_navigation);
  const incompatibleHeader = clone(header);
  incompatibleHeader.compatibility.incompatible_family_ids = [profile.family_selections.product_card];
  const incompatibleResult = solveArchitectureCompatibility({ profileId: profile.id, registry: registryWithFamily(registry, incompatibleHeader), root });
  assert.equal(incompatibleResult.valid, false);
  assert.ok(incompatibleResult.errors.some((error) => error.includes('incompatible')));

  const missingCapabilityRegistry = { ...registry, capabilityIds: new Set([...registry.capabilityIds].filter((id) => id !== 'cart')) };
  const missingCapability = solveArchitectureCompatibility({ profileId: profile.id, registry: missingCapabilityRegistry, root });
  assert.equal(missingCapability.valid, false);
  assert.ok(missingCapability.errors.some((error) => error.includes('unavailable capability cart')));

  const invalidVersion = solveArchitectureCompatibility({ profileId: profile.id, profileVersion: '2.0.0', registry, root });
  assert.equal(invalidVersion.valid, false);
  assert.ok(invalidVersion.errors.some((error) => error.includes('not 2.0.0')));
  const missingFamily = { ...profile.family_selections };
  delete missingFamily.header_navigation;
  const missingFamilyResult = solveArchitectureCompatibility({ profileId: profile.id, familySelections: missingFamily, registry, root });
  assert.equal(missingFamilyResult.valid, false);
  assert.ok(missingFamilyResult.errors.some((error) => error.includes('missing family type header_navigation')));
  assert.throws(() => selectArchitecture({ profileId: 'profile.unknown.v1', root }), /do not fall back/);
  assert.throws(() => assertSafeTarget(path.join(root, 'output', 'safe-theme'), '../sections/header.liquid'), /not a supported Shopify runtime file/);
  assert.throws(() => assertSafeTarget(path.join(root, 'output', 'safe-theme'), 'sections/header.js'), /invalid file type/);
  assert.throws(() => assertSafeTarget(path.join(root, 'output', 'safe-theme'), 'templates/product.json'), /not a supported Shopify runtime file/);
}

function testGenerationParity() {
  const creativeBrief = createCreativeBrief({ merchantInput: readJson('fixtures/leather-travel-bags.json'), root });
  const storeStrategy = createStoreStrategy({ creativeBrief, root });
  const review = approveAll(createReviewState());
  const blocked = generateStorefront({ creativeBrief, storeStrategy, review, root });
  assert.equal(blocked.architecture_selection.profile_id, 'profile.current_calinium.v1');
  assert.equal(blocked.architecture_selection.selection_source, 'default_fallback');
  const generation = fixtureGenerationContext(blocked.draft, 'core-2-current-calinium');
  const generationIds = [`generation-run-core-2-implicit-${process.pid}`, `generation-run-core-2-explicit-${process.pid}`, `generation-run-core-2-editorial-${process.pid}`];
  try {
    const implicit = generateStorefront({ creativeBrief, storeStrategy, review, generation, root, generationId: generationIds[0], outputRoot: path.join(root, 'output'), runThemeCheck: false });
    const explicit = generateStorefront({
      creativeBrief, storeStrategy, review, generation, root, generationId: generationIds[1], outputRoot: path.join(root, 'output'), runThemeCheck: false,
      architectureSelectionRevision: blocked.architecture_selection,
      merchantIntent: blocked.merchant_intent,
      storeIntelligence: blocked.store_intelligence
    });
    const editorialSelection = selectArchitecture({
      profileId: 'profile.editorial_discovery.v1',
      profileVersion: '1.0.0',
      merchantIntent: blocked.merchant_intent,
      storeIntelligence: blocked.store_intelligence,
      root
    });
    const editorial = generateStorefront({
      creativeBrief, storeStrategy, review, generation, root, generationId: generationIds[2], outputRoot: path.join(root, 'output'), runThemeCheck: false,
      architectureSelectionRevision: editorialSelection,
      merchantIntent: blocked.merchant_intent,
      storeIntelligence: blocked.store_intelligence
    });
    const implicitHomepage = workspaceJson(implicit, 'theme/templates/index.json');
    const implicitSettings = workspaceJson(implicit, 'theme/config/settings_data.json');
    assert.deepEqual(implicitHomepage, workspaceJson(explicit, 'theme/templates/index.json'));
    assert.deepEqual(implicitSettings, workspaceJson(explicit, 'theme/config/settings_data.json'));
    assert.doesNotMatch(JSON.stringify({ implicitHomepage, implicitSettings }), /architecture-selection|profile\.current_calinium|family\./, 'Architecture metadata must remain outside Shopify runtime JSON.');
    assert.deepEqual(
      implicit.generated_theme.manifest.generated_section_instances.map(({ section_id, instance_id, position }) => ({ section_id, instance_id, position })),
      explicit.generated_theme.manifest.generated_section_instances.map(({ section_id, instance_id, position }) => ({ section_id, instance_id, position }))
    );
    assert.equal(editorial.read_only_theme_package.manifest.architecture_runtime.profile_id, 'profile.editorial_discovery.v1');
    assert.equal(editorial.read_only_theme_package.manifest.architecture_runtime.applied, true);
    assert.equal(editorial.read_only_theme_package.manifest.architecture_runtime.overlays.length, 14);
    assert.notDeepEqual(
      fs.readFileSync(path.join(editorial.read_only_theme_package.theme_directory, 'sections/header.liquid')),
      fs.readFileSync(path.join(root, 'apps/theme/sections/header.liquid')),
      'Editorial Discovery must materialize its registered header presenter.'
    );
    assert.deepEqual(
      fs.readFileSync(path.join(editorial.read_only_theme_package.theme_directory, 'sections/main-cart.liquid')),
      fs.readFileSync(path.join(root, 'apps/theme/sections/main-cart.liquid')),
      'Editorial Discovery must preserve the shared current cart presenter.'
    );
    assert.doesNotMatch(
      JSON.stringify(workspaceJson(editorial, 'theme/templates/index.json')),
      /architecture-selection|profile\.editorial_discovery|family\./,
      'Architecture metadata must remain outside Shopify JSON.'
    );
    assert.deepEqual(implicit.generated_theme.manifest.architecture_selection, implicit.generation_approval.architecture_selection);
    assert.equal(implicit.theme_specification.architecture.profile_id, 'profile.current_calinium.v1');
    assert.deepEqual(implicit.generated_theme.manifest.architecture_selection.selected_families, explicit.generated_theme.manifest.architecture_selection.selected_families);
    assert.equal(implicit.read_only_theme_package.manifest.shopify_operations.write_operations, false);
    assert.equal(implicit.read_only_theme_package.manifest.architecture_runtime.applied, false);
    assert.deepEqual(implicit.read_only_theme_package.manifest.architecture_runtime.overlays, []);
    for (const relative of ['sections/header.liquid', 'sections/main-collection-product-grid.liquid', 'sections/main-product.liquid', 'snippets/product-card.liquid']) {
      assert.deepEqual(
        fs.readFileSync(path.join(implicit.read_only_theme_package.theme_directory, relative)),
        fs.readFileSync(path.join(root, 'apps/theme', relative)),
        `Current profile must preserve ${relative} byte-for-byte.`
      );
    }
    const historicalV1Manifest = clone(implicit.read_only_theme_package.manifest);
    delete historicalV1Manifest.architecture_runtime;
    assert.deepEqual(
      createSchemaValidator(root).validateFile(historicalV1Manifest, 'schemas/calinium-read-only-theme-package.schema.json', 'historical read-only package'),
      [],
      'Historical v1 package manifests without architecture runtime provenance must remain readable.'
    );
  } finally {
    removeGeneratedArtifacts(generationIds);
  }
}

function run() {
  testRegistryAndContracts();
  testSafeFailures();
  testGenerationParity();
  console.log('Calinium Core 2.0 architecture tests passed: catalog=valid; profiles=2; families=11; default=current; editorial=explicit-only; runtime-overlays=validated; generation parity=passed; read-only=preserved; cleanup=confirmed.');
}

if (require.main === module) {
  try { run(); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { run };
