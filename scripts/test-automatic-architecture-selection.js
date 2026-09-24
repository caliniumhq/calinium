#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  createStoreIntelligenceContract,
  createMerchantIntent,
  assertStoreIntelligenceContract,
  assertMerchantIntent,
  selectArchitecture,
  assertFrozenArchitectureSelection,
  assertArchitectureSelectionInputBindings,
  architectureProvenance,
  loadArchitectureSelectionPolicy,
  assertArchitectureSupportsPreset,
  assertArchitectureSupportsDesignDna
} = require('../ai/architecture');
const { ENGINE_VERSION } = require('../ai/design-dna/design-dna-engine');
const { createCreativeBrief } = require('../pipeline/create-creative-brief');
const { createStoreStrategy } = require('../pipeline/create-store-strategy');
const { createReviewState, approveAll } = require('../pipeline/review-state');
const { generateStorefront } = require('../pipeline/generate-storefront');
const { fixtureGenerationContext, removeGeneratedArtifacts } = require('./test-merchant-profile-integration');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/automatic-architecture-selection.json'), 'utf8'));
const tests = [];
function test(name, run) { tests.push({ name, run }); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function caseById(id) { return fixture.cases.find((item) => item.id === id); }

function contractsForCase(entry) {
  const source = entry.store;
  const storeIntelligence = createStoreIntelligenceContract({
    revisionId: `miv_${entry.id}`,
    normalizationVersion: 'store-intelligence-v1',
    status: 'usable',
    intelligence: {
      status: 'usable',
      category: { id: null, confidence: 'Unknown' },
      catalog: {
        product_count: source.products,
        active_product_count: source.products,
        variant_count: source.variants,
        available_variant_count: source.variants,
        collection_count: source.collections
      },
      navigation: { menu_count: source.menus, link_count: source.links, confidence: 'High' },
      media: { product_media_count: source.product_media, usable_image_count: source.usable_images, video_count: 0, project_asset_count: 0, confidence: 'High' },
      store: { market_count: 1, theme_count: 1, unpublished_theme_count: 1 },
      source_health: { unavailable_sources: [] }
    },
    root
  });
  const merchantIntent = createMerchantIntent({
    storeIntelligence,
    architecturePreferences: entry.intent,
    architecturePreferenceRevision: `merchant-preference-${entry.id}`,
    root
  });
  return { storeIntelligence, merchantIntent };
}

function automatic(entry, options = {}) {
  const contracts = contractsForCase(entry);
  return { ...contracts, result: selectArchitecture({ ...contracts, selectionMode: 'automatic_beta', root, ...options }) };
}

test('policy is versioned, bounded to two approved profiles, and repair-safe', () => {
  const policy = loadArchitectureSelectionPolicy(root);
  assert.equal(policy.policy_revision, 'architecture-selection-policy-v1');
  assert.deepEqual(policy.supported_profiles, ['profile.current_calinium.v1', 'profile.editorial_discovery.v1']);
  assert.equal(policy.safety.automatic_repair_allowed, false);
  assert.equal(policy.safety.maximum_material_questions, 1);
});

test('Store Intelligence validates trusted direct and derived signal provenance', () => {
  const { storeIntelligence } = contractsForCase(caseById('image_led_editorial_store'));
  assert.equal(assertStoreIntelligenceContract(storeIntelligence, root), storeIntelligence);
  assert.ok(storeIntelligence.facts.some((item) => item.path === 'catalog.variant_count' && item.provenance.source_revision === storeIntelligence.revision_id));
  assert.ok(storeIntelligence.derived_signals.every((item) => item.derivation_revision === 'architecture-store-signal-derivation-v1'));
  assert.equal(storeIntelligence.derived_signals.find((item) => item.path === 'selection.media_richness').value, 'strong');
});

test('unavailable Shopify sources remain unknown instead of becoming negative fit evidence', () => {
  const storeIntelligence = createStoreIntelligenceContract({
    revisionId: 'miv_partial_sources',
    normalizationVersion: 'store-intelligence-v1',
    status: 'partial',
    intelligence: {
      status: 'partial',
      category: { id: null, confidence: 'Unknown' },
      catalog: { product_count: 40, active_product_count: 40, variant_count: 80, collection_count: 8 },
      navigation: { menu_count: 0, link_count: 0, confidence: 'Unknown' },
      media: { product_media_count: 0, usable_image_count: 0, confidence: 'Unknown' },
      store: { market_count: 1, theme_count: 1, unpublished_theme_count: 1 },
      source_health: { unavailable_sources: ['navigation', 'media'] }
    },
    root
  });
  assert.equal(storeIntelligence.derived_signals.find((item) => item.path === 'selection.navigation_complexity').confidence, 'Unknown');
  assert.equal(storeIntelligence.derived_signals.find((item) => item.path === 'selection.media_richness').confidence, 'Unknown');
  const merchantIntent = createMerchantIntent({ storeIntelligence, root });
  const result = selectArchitecture({ storeIntelligence, merchantIntent, selectionMode: 'automatic_beta', allowMaterialQuestion: false, root });
  assert.ok(result.automatic_policy.candidate_results.every((candidate) => !candidate.positive_signals.some((item) => item.reason_code === 'media_weak')));
});

test('Merchant Intent validates explicit architecture preferences without inventing answers', () => {
  const { merchantIntent } = contractsForCase(caseById('image_led_editorial_store'));
  assert.equal(assertMerchantIntent(merchantIntent, root), merchantIntent);
  assert.equal(merchantIntent.explicit_preferences.find((item) => item.path === 'storefront.shopping_mode').value, 'image_led');
  assert.ok(merchantIntent.provenance.some((entry) => entry.source_type === 'merchant_preference'));
  const missing = contractsForCase(caseById('missing_intent_strong_inference')).merchantIntent;
  assert.equal(missing.explicit_preferences.some((item) => item.path.startsWith('storefront.')), false);
});

test('hard eligibility and compatibility are separate from soft-fit evidence', () => {
  const { result } = automatic(caseById('weak_media_store'));
  const editorial = result.automatic_policy.candidate_results.find((item) => item.candidate_id === 'profile.editorial_discovery.v1');
  assert.equal(editorial.eligibility.eligible, true, 'Weak media is a soft negative, not an invented hard requirement.');
  assert.equal(editorial.compatibility_result.valid, true);
  assert.ok(editorial.negative_signals.some((item) => item.reason_code === 'media_weak'));
});

test('fit scoring is deterministic and retains weighted explainable evidence', () => {
  const entry = caseById('commerce_dense_store');
  const first = automatic(entry).result;
  const second = automatic(entry).result;
  assert.deepEqual(first, second);
  assert.equal(first.automatic_policy.candidate_results.length, 2);
  assert.ok(first.automatic_policy.candidate_results.every((candidate) => candidate.explanation.summary && Number.isFinite(candidate.score)));
});

for (const id of ['image_led_editorial_store', 'commerce_dense_store', 'strong_imagery_complex_catalog', 'weak_media_store', 'missing_intent_strong_inference', 'explicit_trusted_editorial_direction']) {
  test(`fixture ${id} resolves the expected approved profile`, () => {
    const entry = caseById(id); const { result } = automatic(entry);
    assert.equal(result.profile_id, entry.expected.profile_id);
    assert.equal(result.selection_source, 'automatic_policy');
    assert.equal(result.material_question, null);
  });
}

test('strong imagery does not blindly override complex catalog and navigation evidence', () => {
  const { result } = automatic(caseById('strong_imagery_complex_catalog'));
  assert.equal(result.profile_id, 'profile.current_calinium.v1');
  const current = result.automatic_policy.candidate_results.find((item) => item.candidate_id === result.profile_id);
  assert.ok(current.positive_signals.some((item) => item.reason_code === 'catalog_large'));
  assert.ok(current.positive_signals.some((item) => item.reason_code === 'navigation_complex'));
});

test('missing intent is inferred only when trusted store evidence produces a decisive margin', () => {
  const { merchantIntent, result } = automatic(caseById('missing_intent_strong_inference'));
  assert.equal(merchantIntent.explicit_preferences.length, 0);
  assert.equal(result.profile_id, 'profile.current_calinium.v1');
  assert.ok(result.automatic_policy.ambiguity_result.score_margin > result.automatic_policy.ambiguity_result.threshold);
});

test('material ambiguity returns exactly one non-UI question intent without freezing', () => {
  const { result } = automatic(caseById('ambiguous_store'));
  assert.equal(result.status, 'material_question_required');
  assert.equal(result.frozen, false);
  assert.deepEqual(Object.keys(result.material_question).sort(), ['decision_to_resolve', 'intent_path', 'profiles_affected', 'topic', 'why_it_matters']);
  assert.equal(result.material_question.topic, 'shopping_mode');
  assert.equal(result.safety.maximum_material_questions, 1);
});

test('conservative fallback is used only when a material question cannot be consumed', () => {
  const { result } = automatic(caseById('ambiguous_store'), { allowMaterialQuestion: false });
  assert.equal(result.profile_id, 'profile.current_calinium.v1');
  assert.equal(result.selection_source, 'conservative_fallback');
  assert.equal(result.fallback.reason, 'question_unavailable');
});

test('conservative fallback remains valid when Current is second in raw soft-fit rank', () => {
  const products = 10;
  const storeIntelligence = createStoreIntelligenceContract({
    revisionId: 'miv_rank_two_fallback', normalizationVersion: 'store-intelligence-v1', status: 'usable',
    intelligence: {
      status: 'usable', category: { id: null, confidence: 'Unknown' },
      catalog: { product_count: products, active_product_count: products, variant_count: products, collection_count: 3 },
      navigation: { menu_count: 1, link_count: 80, confidence: 'High' },
      media: { product_media_count: 30, usable_image_count: 30, video_count: 0, project_asset_count: 0, confidence: 'High' },
      store: { market_count: 1, theme_count: 1, unpublished_theme_count: 1 }, source_health: { unavailable_sources: [] }
    }, root
  });
  const merchantIntent = createMerchantIntent({ storeIntelligence, root });
  const result = selectArchitecture({ storeIntelligence, merchantIntent, selectionMode: 'automatic_beta', allowMaterialQuestion: false, root });
  assert.equal(result.profile_id, 'profile.current_calinium.v1');
  assert.equal(result.automatic_policy.candidate_results.find((candidate) => candidate.candidate_id === result.profile_id).rank, 2);
  assert.equal(assertFrozenArchitectureSelection(result, root), result);
  assert.equal(architectureProvenance(result, root).selection_source, 'conservative_fallback');
});

test('invalid explicit architecture metadata fails closed without automatic fallback', () => {
  const entry = caseById('invalid_explicit_profile');
  const { storeIntelligence, merchantIntent } = contractsForCase(entry);
  assert.throws(() => selectArchitecture({ profileId: entry.explicit_profile_id, merchantIntent, storeIntelligence, root }), /do not fall back/);
  assert.throws(() => selectArchitecture({ profileId: 'profile.current_calinium.v1', merchantIntent, storeIntelligence, selectionMode: 'automatic_beta', root }), /cannot be combined/);
});

test('automatic selection freezes canonically and paid retries consume identical pinned inputs', () => {
  const { result, merchantIntent, storeIntelligence } = automatic(caseById('commerce_dense_store'));
  assert.equal(assertFrozenArchitectureSelection(result, root), result);
  assert.equal(assertArchitectureSelectionInputBindings(result, merchantIntent, storeIntelligence), result);
  assert.deepEqual(selectArchitecture({ merchantIntent, storeIntelligence, selectionMode: 'automatic_beta', root }), result);
  const changed = clone(storeIntelligence); changed.facts.find((item) => item.path === 'catalog.product_count').value += 1;
  assert.throws(() => assertArchitectureSelectionInputBindings(result, merchantIntent, changed), /does not match its pinned/);
});

test('tampered automatic candidate or family evidence is rejected', () => {
  const { result } = automatic(caseById('image_led_editorial_store'));
  const candidate = clone(result); candidate.automatic_policy.candidate_results.find((item) => item.candidate_id === candidate.profile_id).rank = 2;
  assert.throws(() => assertFrozenArchitectureSelection(candidate, root), /winning candidate/);
  const family = clone(result); family.family_selections[0].family_version = '9.0.0';
  assert.throws(() => assertFrozenArchitectureSelection(family, root), /invalid family version/);
});

test('architecture selection remains before preset, Design DNA, and composition', () => {
  const source = fs.readFileSync(path.join(root, 'pipeline/generate-storefront.js'), 'utf8');
  assert.ok(source.indexOf('selectArchitecture({') < source.indexOf('applyPresetToStrategy('));
  assert.ok(source.indexOf('selectArchitecture({') < source.indexOf('applyDesignDnaToDraft('));
  const { result } = automatic(caseById('image_led_editorial_store'));
  assert.deepEqual(result.lifecycle.resolved_before, ['design_dna', 'composition']);
  assert.equal(result.lifecycle.paid_retries_use_pinned_revision, true);
});

test('presets and Design DNA validate against but cannot replace frozen families', () => {
  const { result } = automatic(caseById('image_led_editorial_store'));
  const before = clone(result);
  for (const preset of ['atelier', 'maison', 'gallery', 'ritual', 'essential', 'signal']) assert.equal(assertArchitectureSupportsPreset(result, preset, root), result);
  assert.equal(assertArchitectureSupportsDesignDna(result, ENGINE_VERSION, root), result);
  assert.deepEqual(result, before);
});

test('legacy mode remains Current and preserves the Phase A contract', () => {
  const legacy = selectArchitecture({ root });
  assert.equal(legacy.profile_id, 'profile.current_calinium.v1');
  assert.equal(legacy.selection_engine_version, 'architecture-selection-v1');
  assert.equal(legacy.selection_source, 'default_fallback');
  assert.equal(legacy.automatic_policy, undefined);
});

test('selection provenance validates for generation approval, manifests, specifications, and paid snapshots', () => {
  const { result } = automatic(caseById('commerce_dense_store'));
  const provenance = architectureProvenance(result, root);
  assert.equal(provenance.automatic_policy.policy_revision, 'architecture-selection-policy-v1');
  assert.deepEqual(createSchemaValidator(root).validateFile(provenance, 'schemas/calinium-architecture-provenance.schema.json', 'automatic architecture provenance'), []);
  const snapshotSchema = fs.readFileSync(path.join(root, 'schemas/calinium-custom-theme-input-snapshot.schema.json'), 'utf8');
  const service = fs.readFileSync(path.join(root, 'apps/dashboard/server/custom-themes/custom-theme-service.cjs'), 'utf8');
  assert.match(snapshotSchema, /architecture_selection_revision/);
  assert.match(service, /architecture_selection_revision: clone\(assertFrozenArchitectureSelection/);
  assert.match(service, /architecture_selection: generatedManifest\.architecture_selection/);
});

test('controlled Current and Editorial selections survive normal generation provenance', () => {
  const creativeBrief = createCreativeBrief({ merchantInput: JSON.parse(fs.readFileSync(path.join(root, 'fixtures/leather-travel-bags.json'), 'utf8')), root });
  const storeStrategy = createStoreStrategy({ creativeBrief, root });
  const review = approveAll(createReviewState());
  const generationIds = [`generation-run-e1-current-${process.pid}`, `generation-run-e1-editorial-${process.pid}`];
  try {
    for (const [index, id] of ['commerce_dense_store', 'image_led_editorial_store'].entries()) {
      const entry = caseById(id); const { merchantIntent, storeIntelligence } = contractsForCase(entry);
      const blocked = generateStorefront({ creativeBrief, storeStrategy, review, merchantIntent, storeIntelligence, architectureSelectionMode: 'automatic_beta', root });
      assert.equal(blocked.architecture_selection.profile_id, entry.expected.profile_id);
      const generation = fixtureGenerationContext(blocked.draft, `e1-${id}`);
      const result = generateStorefront({ creativeBrief, storeStrategy, review, generation, merchantIntent, storeIntelligence, architectureSelectionMode: 'automatic_beta', root, generationId: generationIds[index], outputRoot: path.join(root, 'output'), runThemeCheck: false });
      assert.equal(result.generated_theme.manifest.architecture_selection.profile_id, entry.expected.profile_id);
      assert.deepEqual(result.generated_theme.manifest.architecture_selection, result.generation_approval.architecture_selection);
      assert.deepEqual(result.theme_specification.architecture, result.generated_theme.manifest.architecture_selection);
      assert.equal(result.generated_theme.manifest.architecture_selection.automatic_policy.policy_revision, 'architecture-selection-policy-v1');
      assert.equal(result.read_only_theme_package.manifest.architecture_runtime.profile_id, entry.expected.profile_id);
    }
  } finally { removeGeneratedArtifacts(generationIds); }
});

test('material-question outcome stops the pipeline before Design DNA and composition', () => {
  const creativeBrief = createCreativeBrief({ merchantInput: JSON.parse(fs.readFileSync(path.join(root, 'fixtures/leather-travel-bags.json'), 'utf8')), root });
  const storeStrategy = createStoreStrategy({ creativeBrief, root });
  const review = approveAll(createReviewState());
  const { merchantIntent, storeIntelligence } = contractsForCase(caseById('ambiguous_store'));
  assert.throws(() => generateStorefront({ creativeBrief, storeStrategy, review, merchantIntent, storeIntelligence, architectureSelectionMode: 'automatic_beta', root }), (error) => error.name === 'ArchitectureMaterialQuestionRequiredError' && error.outcome.material_question.topic === 'shopping_mode');
});

test('merchant-facing UI and repair activation remain disabled', () => {
  const policy = loadArchitectureSelectionPolicy(root);
  assert.equal(policy.safety.merchant_ui_activation, false);
  assert.equal(policy.safety.automatic_repair_allowed, false);
  assert.equal(policy.safety.live_theme_mutation_allowed, false);
  assert.equal(fs.readFileSync(path.join(root, 'config/storefront-bounded-repair-planning.json'), 'utf8').includes('"automatic_repair_allowed": true'), false);
});

function run() {
  for (const { name, run: execute } of tests) {
    execute();
    process.stdout.write(`✓ ${name}\n`);
  }
  process.stdout.write(`\n${tests.length}/${tests.length} automatic architecture-selection tests passed.\n`);
}

if (require.main === module) {
  try { run(); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { run, contractsForCase };
