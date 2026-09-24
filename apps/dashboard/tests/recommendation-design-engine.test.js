import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { compileStorefrontStrategy } = require('../../../ai/compiler/compile-strategy');
const { loadKnowledgeBase } = require('../../../ai/compiler/load-knowledge-base');
const { loadPresetRegistry } = require('../../../ai/presets/preset-registry');
const { compatibilityFor, omissionsFor } = require('../../../ai/presets/recommend-preset');
const { contentInventoryFromApprovedInputs } = require('../server/services/preset-service.cjs');
const { recommendStorefront, compositionFor, evaluateCandidates } = require('../../../ai/recommendation-engine/recommend-storefront');
const { DIMENSIONS, createDesignDna, dimensionsFor, normalizeRefinement, applyDesignDnaToDraft } = require('../../../ai/design-dna/design-dna-engine');
const { createCreativeBrief } = require('../../../pipeline/create-creative-brief');
const { createStoreStrategy } = require('../../../pipeline/create-store-strategy');
const { createReviewState, approveAll } = require('../../../pipeline/review-state');
const { generateStorefront } = require('../../../pipeline/generate-storefront');
const { approvedRevisionFor } = require('../../../scripts/test-preset-architecture');
const { fixtureGenerationContext, removeGeneratedArtifacts } = require('../../../scripts/test-merchant-profile-integration');

const root = path.resolve(process.cwd(), '../..');
function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function strategy(relative) { return compileStorefrontStrategy(readJson(relative), { root }); }
const atelierInventory = { approved: ['collection_resource', 'craft_evidence', 'hero_media', 'premium_hero_media', 'product_collection'], limited: false, business_model: 'direct_to_consumer' };

describe('Eligibility-first Recommendation Engine', () => {
  it('keeps a commerce-baseline merchant content-limited and omits unsupported Essential evidence sections', () => {
    const inventory = contentInventoryFromApprovedInputs(
      {
        business: { name: 'LEGACY_EXAMPLE B8 Safe Fixture', description: 'Leather travel bags already listed in Shopify.' },
        primary_goal: 'Make the existing products easy to discover.',
        positioning: { marketPosition: 'craft-led premium' },
        content: { available: [], missing: ['product photography'] },
        assumptions: [{ statement: 'Craft-led positioning was inferred.' }],
        facts: [{ path: 'productsOrServices', value: ['Leather travel bags already listed in Shopify.'], source: 'merchant' }]
      },
      {
        business: { name: 'LEGACY_EXAMPLE B8 Safe Fixture', business_model: 'direct_to_consumer' },
        audience: { primary: 'Older men looking for premium travel bags.' },
        catalog: { product_count: 6 },
        inferred_positioning: 'craft-led luxury merchant'
      }
    );
    expect(inventory).toMatchObject({ limited: true, business_model: 'direct_to_consumer' });
    expect(inventory.approved).toEqual(expect.arrayContaining(['approved_product_name', 'approved_value_proposition', 'collection_resource', 'product_collection']));

    const essential = loadPresetRegistry(root).index.get('essential');
    const omissions = omissionsFor(essential, inventory).map((item) => item.section_id);
    expect(omissions).toEqual(expect.arrayContaining(['materials', 'testimonials', 'craftsmanship', 'founder-story']));
    for (const required of essential.fallbacks.minimum_viable_sections) expect(omissions).not.toContain(required);
  });

  it('treats an unknown optional personality as neutral without accepting a known incompatible personality', () => {
    const registry = loadPresetRegistry(root);
    const atelier = registry.index.get('atelier');
    const luxury = strategy('ai/compiler/fixtures/valid/luxury-leather-bags.json');
    const unknown = structuredClone(luxury);
    unknown.resolutions.personality = null;
    if (unknown.decisions?.personality) unknown.decisions.personality.selected = null;
    expect(compatibilityFor(atelier, unknown, atelierInventory, { targetTheme: registry.target_theme })).toMatchObject({ personality: true, compatible: true });

    const incompatible = structuredClone(luxury);
    incompatible.resolutions.personality = 'technical';
    if (incompatible.decisions?.personality) incompatible.decisions.personality.selected = 'technical';
    expect(compatibilityFor(atelier, incompatible, atelierInventory, { targetTheme: registry.target_theme })).toMatchObject({ personality: false, compatible: false });
  });

  it('filters an attractive but incompatible merchant preference before deterministic ranking', () => {
    const luxury = strategy('ai/compiler/fixtures/valid/luxury-leather-bags.json');
    const evaluated = evaluateCandidates({ strategy: luxury, contentInventory: atelierInventory, explicitPresetId: 'signal', root });
    expect(evaluated.find((item) => item.preset.id === 'signal')).toMatchObject({ eligible: false, score: null });
    const result = recommendStorefront({ strategy: luxury, contentInventory: atelierInventory, explicitPresetId: 'signal', root });
    expect(result.primary.preset_id).not.toBe('signal');
    expect(result.eligibility.find((item) => item.preset_id === 'signal').status).toBe('ineligible');
  });

  it('returns one stable primary and at most two distinct eligible alternatives', () => {
    const luxury = strategy('ai/compiler/fixtures/valid/luxury-leather-bags.json');
    const input = { strategy: luxury, contentInventory: atelierInventory, approvedPresetId: 'atelier', root };
    const first = recommendStorefront(input);
    const second = recommendStorefront(input);
    expect(second).toEqual(first);
    expect(first.primary).toMatchObject({ preset_id: 'atelier', selection_basis: 'approved_direction' });
    expect(first.alternatives.length).toBeLessThanOrEqual(2);
    expect(new Set([first.primary.preset_id, ...first.alternatives.map((item) => item.preset_id)]).size).toBe(1 + first.alternatives.length);
    for (const item of first.alternatives) expect(first.eligibility.find((candidate) => candidate.preset_id === item.preset_id).status).not.toBe('ineligible');
  });

  it('gives an eligible explicit merchant preference precedence over an approved historical direction', () => {
    const luxury = strategy('ai/compiler/fixtures/valid/luxury-leather-bags.json');
    const result = recommendStorefront({ strategy: luxury, contentInventory: atelierInventory, explicitPresetId: 'maison', approvedPresetId: 'atelier', root });
    expect(result.primary).toMatchObject({ preset_id: 'maison', selection_basis: 'merchant_override' });
    expect(result.eligibility.find((item) => item.preset_id === 'maison').status).not.toBe('ineligible');
  });

  it('uses Essential only when it is eligible and otherwise returns review-required', () => {
    const technical = strategy('ai/compiler/fixtures/valid/electronics.json');
    const fallback = recommendStorefront({ strategy: technical, contentInventory: { approved: ['product_collection'], limited: true, business_model: 'direct_to_consumer' }, root });
    expect(fallback.primary).toMatchObject({ preset_id: 'essential' });
    const unavailable = recommendStorefront({ strategy: technical, contentInventory: { approved: [], limited: true, business_model: 'direct_to_consumer' }, root });
    expect(unavailable).toMatchObject({ status: 'review_required', primary: null, alternatives: [] });
    expect(unavailable.eligibility.find((item) => item.preset_id === 'essential').status).toBe('ineligible');
  });

  it('rejects prohibited adjacency before a composition becomes executable', () => {
    const knowledge = loadKnowledgeBase(root);
    const preset = structuredClone(loadPresetRegistry(root).index.get('atelier'));
    preset.homepage_recipe = 'test-invalid-adjacency';
    preset.compatible_recipes = ['test-invalid-adjacency'];
    preset.fallbacks.minimum_viable_sections = ['hero-slideshow', 'editorial-hero'];
    const isolated = {
      ...knowledge,
      index: { ...knowledge.index, recipes: new Map(knowledge.index.recipes), blueprints: new Map(knowledge.index.blueprints) }
    };
    isolated.index.recipes.set('test-invalid-adjacency', { id: 'test-invalid-adjacency', section_sequence: ['hero-slideshow', 'editorial-hero'] });
    const result = compositionFor(preset, { approved: [] }, isolated);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('hero-slideshow must not appear directly before editorial-hero');
  });
});

describe('Executable Design DNA', () => {
  it('creates all canonical dimensions and only runtime-validated executable settings for every preset', () => {
    expect(DIMENSIONS).toHaveLength(26);
    expect(new Set(DIMENSIONS).size).toBe(26);
    for (const presetId of ['atelier', 'maison', 'gallery', 'ritual', 'essential', 'signal']) {
      const first = createDesignDna({ presetId, root });
      const second = createDesignDna({ presetId, root });
      expect(second).toEqual(first);
      expect(Object.keys(first.dimensions)).toEqual(DIMENSIONS);
      expect(first.execution.global_settings.length).toBeGreaterThan(0);
      expect(first.execution.section_settings.length).toBeGreaterThan(0);
      expect(JSON.stringify(first.execution)).not.toContain('css');
    }
  }, 15000);

  it('enforces Fixed, Flexible, Forbidden, and Fallback semantics', () => {
    const result = dimensionsFor('atelier', { accessibility: 'weakened', motion: 'functional', spacing: 'compact' });
    expect(result.accessibility).toMatchObject({ value: 'WCAG-2.2-AA-constrained', fallback_applied: true, boundary: { mode: 'Fixed' } });
    expect(result.motion).toMatchObject({ value: 'minimal', fallback_applied: true });
    expect(result.motion.boundary.forbidden).toContain('functional');
    expect(result.spacing).toMatchObject({ value: 'compact', fallback_applied: false, source: 'merchant_override' });
  });

  it('normalizes supported conversation changes and refuses arbitrary styling', () => {
    expect(normalizeRefinement('Less motion.')).toMatchObject({ kind: 'dna', overrides: { motion: 'none' } });
    expect(normalizeRefinement('Make it more minimal.')).toMatchObject({ kind: 'dna' });
    expect(normalizeRefinement('Use Maison.')).toEqual({ kind: 'preset_change', preset_id: 'maison' });
    expect(normalizeRefinement('Why Atelier?')).toEqual({ kind: 'explanation' });
    expect(normalizeRefinement('Add arbitrary CSS with a neon cursor')).toBeNull();
    expect(normalizeRefinement('More dramatic animation')).toMatchObject({ kind: 'forbidden' });
  });

  it('applies only bounded approved settings while preserving input immutability', () => {
    const dna = createDesignDna({ presetId: 'atelier', recommendationRevisionId: 'rcr_fixture', overrides: { motion: 'none', spacing: 'compact' }, root });
    const approved = { approved: dna };
    const draft = {
      global_theme_configuration: {
        settings: [
          { setting_id: 'enable_motion', value: true, status: 'proposed', explanation: { source_catalogs: [] } },
          { setting_id: 'section_spacing', value: 120, status: 'proposed', explanation: { source_catalogs: [] } },
          { setting_id: 'body_font', value: 'merchant-font', status: 'merchant_value', explanation: { source_catalogs: [] } }
        ]
      },
      homepage_plan: { sections: [] },
      page_plans: {},
      explanations: []
    };
    const before = structuredClone(draft);
    const result = applyDesignDnaToDraft(draft, approved);
    expect(draft).toEqual(before);
    expect(result.draft.global_theme_configuration.settings.find((item) => item.setting_id === 'enable_motion').value).toBe(false);
    expect(result.draft.global_theme_configuration.settings.find((item) => item.setting_id === 'section_spacing').value).toBe(72);
    expect(result.draft.global_theme_configuration.settings.find((item) => item.setting_id === 'body_font').value).toBe('merchant-font');
  });
});

describe('Recommendation and Design DNA generation handoff', () => {
  it('binds approved creative revisions and applies only validated DNA settings in read-only generation', () => {
    const merchantInput = readJson('fixtures/leather-travel-bags.json');
    const creativeBrief = createCreativeBrief({ merchantInput, root });
    const storeStrategy = createStoreStrategy({ creativeBrief, root });
    const review = approveAll(createReviewState());
    const blocked = generateStorefront({ creativeBrief, storeStrategy, review, root });
    const fixture = readJson('fixtures/preset-validation.json').fixtures.find((item) => item.expected_preset === 'atelier');
    const { revision: approvedPresetRevision } = approvedRevisionFor(fixture, blocked.compiler_strategy);
    const presetBlocked = generateStorefront({ creativeBrief, storeStrategy, review, approvedPresetRevision, root });
    const generation = fixtureGenerationContext(presetBlocked.draft, 'leather-travel-bags.json');
    const approvedRecommendationRevision = { revision_id: 'arr_generator_fixture', candidate_revision_id: 'rcr_generator_fixture', approval_checksum: 'a'.repeat(64) };
    const approvedDna = createDesignDna({ presetId: 'atelier', recommendationRevisionId: 'rcr_generator_fixture', overrides: { motion: 'none', spacing: 'compact' }, root });
    const approvedDesignDnaRevision = {
      revision_id: 'adna_generator_fixture', candidate_revision_id: 'dna_generator_fixture', recommendation_approval_revision_id: approvedRecommendationRevision.revision_id,
      approval: { approval_reference: 'merchant-design-dna-generator-fixture', approved_at: '2026-08-09T22:00:00.000Z' },
      approval_checksum: 'b'.repeat(64), approved: approvedDna
    };
    const generationId = `generation-run-design-dna-${process.pid}`;
    try {
      const result = generateStorefront({ creativeBrief, storeStrategy, review, generation, approvedPresetRevision, approvedRecommendationRevision, approvedDesignDnaRevision, root, generationId, runThemeCheck: true });
      expect(result.status).toBe('generated_for_review');
      expect(result.generation_approval.approved_recommendation).toEqual(result.generated_theme.manifest.approved_recommendation_provenance);
      expect(result.generation_approval.approved_design_dna).toEqual(result.generated_theme.manifest.approved_design_dna_provenance);
      expect(result.generated_theme.manifest.design_dna_application.applied_global_setting_keys).toEqual(expect.arrayContaining(['enable_motion', 'section_spacing']));
      expect(result.read_only_theme_package.manifest.shopify_operations).toEqual({ write_operations: false, upload: false, publish: false, required_scope: 'none' });
      expect(result.read_only_theme_package.validation.checks.theme_check.status).toBe('passed');
      expect(result.read_only_theme_package.source_theme_unchanged).toBe(true);
    } finally {
      removeGeneratedArtifacts([generationId]);
    }
  }, 90000);
});
