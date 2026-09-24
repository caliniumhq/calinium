import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardServices } = require('../server/dashboard-services.cjs');
const { draftConfirmations } = require('../server/services/creative-director-service.cjs');
const { mapMerchantProfile } = require('../../../pipeline/map-merchant-profile');

const root = path.resolve(process.cwd(), '../..');
const password = 'correct-horse-battery-staple';

function testDatabase() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-creative-director-')), 'dashboard.sqlite'); }
function clockFactory() { let tick = 0; const base = Date.parse('2026-07-21T13:10:00.000Z'); return () => new Date(base + (tick++ * 1000)); }
async function servicesFor(database) { return createDashboardServices({ root, env: { CALINIUM_SQLITE_PATH: database }, clock: clockFactory() }); }

async function createProject(services, email = 'creative@example.com') {
  const registered = await services.auth.register({ email, password, fullName: 'Creative Merchant', organizationName: 'Creative Studio', ipAddress: '127.0.0.1' });
  const created = await services.projects.createProject({ userId: registered.user.id, input: { name: 'Travel Bags', business_name: 'Northline Atelier', country: 'GB', website_url: 'https://northline.example' } });
  return { registered, project: created.project };
}

async function completeConversation(services, userId, projectId) {
  let result = await services.creativeDirector.start({ userId, projectId });
  expect(result.session.transcript[0].content).toContain('What do you sell?');
  result = await services.creativeDirector.respond({ userId, projectId, message: 'Handmade leather travel bags with approved product photography' });
  expect(result.session.stage).toBe('conversation');
  result = await services.creativeDirector.respond({ userId, projectId, message: 'Frequent travelers who value lasting materials' });
  result = await services.creativeDirector.respond({ userId, projectId, message: 'Present a more premium brand' });
  result = await services.creativeDirector.respond({ userId, projectId, message: 'Warm, refined, editorial' });
  expect(result.session.stage).toBe('understanding');
  return result.session;
}

async function approveCurrentRecommendations(services, userId, projectId) {
  let { session } = await services.creativeDirector.load({ userId, projectId });
  const approved = new Map((session.review?.decisions || []).map((decision) => [decision.path, decision.status]));
  for (const recommendation of session.store_strategy.recommendations || []) {
    if (!recommendation.requiresMerchantApproval || approved.get(recommendation.id) === 'approved') continue;
    ({ session } = await services.creativeDirector.decideRecommendation({
      userId,
      projectId,
      recommendationPath: recommendation.id,
      status: 'approved'
    }));
  }
  return session;
}

describe('Creative Director dashboard service', () => {
  it('requires confirmations only for active homepage evidence and omits unrelated page review queues', () => {
    const confirmations = draftConfirmations({
      homepage_plan: { sections: [{ section_id: 'full-screen-hero', merchant_confirmations: [] }, { section_id: 'craftsmanship', merchant_confirmations: ['methods'] }] },
      other_pages: [{ page_id: 'product', sections: [{ section_id: 'product-main', merchant_confirmations: ['product_claims'] }] }],
      merchant_review_queue: [{ id: 'review:full-screen-hero.button_link', field_refs: ['full-screen-hero.button_link'] }]
    });
    expect(confirmations).toEqual(['methods']);
  });

  it('persists a deterministic conversation, Brand Blueprint, Store Strategy, and resource gate across devices', async () => {
    const database = testDatabase();
    const services = await servicesFor(database);
    const { registered, project } = await createProject(services);
    await completeConversation(services, registered.user.id, project.id);
    let result = await services.creativeDirector.createBrief({ userId: registered.user.id, projectId: project.id });
    expect(result.session.creative_brief.business.offer).toEqual(['Handmade leather travel bags with approved product photography']);
    result = await services.creativeDirector.approveBrief({ userId: registered.user.id, projectId: project.id });
    expect(result.session.stage).toBe('strategy');
    expect(result.session.store_strategy.designDirection.name).toMatch(/editorial|luxury/);
    result = await services.creativeDirector.decideRecommendation({ userId: registered.user.id, projectId: project.id, recommendationPath: 'homepage-hero', status: 'approved' });
    expect(result.session.review.decisions).toHaveLength(1);
    await approveCurrentRecommendations(services, registered.user.id, project.id);
    result = await services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id });
    expect(result.session.stage).toBe('preset');
    expect(result.session.preset_selection.recommended_preset_id).toBe('atelier');
    result = await services.creativeDirector.approvePreset({ userId: registered.user.id, projectId: project.id, expectedVersion: result.session.preset_selection.candidate_version });
    expect(result.session.stage).toBe('resources');
    const approvedPreset = await services.store.findApprovedPresetRevision(result.session.preset_selection.approved_revision_id, project.id, project.organization_id);
    expect(approvedPreset).toMatchObject({ preset_id: 'atelier', preset_version: '1.0', project_id: project.id, organization_id: project.organization_id });
    await expect(services.store.createApprovedPresetRevision(approvedPreset)).rejects.toThrow(/immutable/);
    expect(['ready', 'blocked']).toContain(result.session.resource_plan.status);
    await services.close();

    const resumed = await servicesFor(database);
    const signedIn = await resumed.auth.signIn({ email: 'creative@example.com', password, ipAddress: '127.0.0.1' });
    const recovered = await resumed.creativeDirector.load({ userId: signedIn.user.id, projectId: project.id });
    expect(recovered.session.stage).toBe('resources');
    expect(recovered.session.transcript).toHaveLength(9);
    expect(recovered.session.creative_brief.business.name).toBe('Northline Atelier');
    expect(recovered.session.preset_selection).not.toHaveProperty('content_inventory');
    expect(recovered.session.preset_selection).not.toHaveProperty('applied_homepage_sections');
    await resumed.close();
  });

  it('does not allow an organization outsider to read another project creative session', async () => {
    const services = await servicesFor(testDatabase());
    const owner = await createProject(services, 'owner-creative@example.com');
    await services.creativeDirector.start({ userId: owner.registered.user.id, projectId: owner.project.id });
    const outsider = await services.auth.register({ email: 'outsider-creative@example.com', password, fullName: 'Outsider', organizationName: 'Other Studio', ipAddress: '127.0.0.2' });
    await expect(services.creativeDirector.load({ userId: outsider.user.id, projectId: owner.project.id })).rejects.toMatchObject({ code: 'permission_denied', status: 403 });
    await services.close();
  });

  it('persists only backwards revisits and never lets a client skip an approval stage', async () => {
    const services = await servicesFor(testDatabase());
    const { registered, project } = await createProject(services, 'transition-creative@example.com');
    await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
    await expect(services.creativeDirector.setStage({ userId: registered.user.id, projectId: project.id, stage: 'preview' })).rejects.toMatchObject({
      code: 'creative_director_transition_invalid', status: 409
    });
    await completeConversation(services, registered.user.id, project.id);
    await services.creativeDirector.createBrief({ userId: registered.user.id, projectId: project.id });
    const revisited = await services.creativeDirector.setStage({ userId: registered.user.id, projectId: project.id, stage: 'understanding' });
    expect(revisited.session.stage).toBe('understanding');
    await services.close();
  });

  it('moves from resources to required content review only after the resource plan is fully approved', async () => {
    const services = await servicesFor(testDatabase());
    const { registered, project } = await createProject(services, 'resources-creative@example.com');
    await completeConversation(services, registered.user.id, project.id);
    await services.creativeDirector.createBrief({ userId: registered.user.id, projectId: project.id });
    await services.creativeDirector.approveBrief({ userId: registered.user.id, projectId: project.id });
    await approveCurrentRecommendations(services, registered.user.id, project.id);
    let approved = await services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id });
    expect(approved.session.stage).toBe('preset');
    approved = await services.creativeDirector.approvePreset({ userId: registered.user.id, projectId: project.id, expectedVersion: approved.session.preset_selection.candidate_version });
    expect(approved.session.stage).toBe('resources');

    const incomplete = await services.creativeDirector.updateResources({ userId: registered.user.id, projectId: project.id });
    expect(incomplete.session.stage).toBe('resources');
    expect(incomplete.session.generation_context.status).toBe('awaiting_configuration');

    // This represents a completed merchant-approved plan. The separate Draft
    // Builder and generator remain responsible for validating its actual
    // resource references before a storefront can be produced.
    await services.store.updateCreativeDirector(project.id, {
      ...incomplete.session,
      resource_plan: { ...incomplete.session.resource_plan, fields: [], required_assets: [], required_confirmations: [] }
    });
    const complete = await services.creativeDirector.updateResources({ userId: registered.user.id, projectId: project.id });
    expect(complete.session.stage).toBe('content-plan');
    expect(complete.session.generation_context.status).toBe('ready_for_generation');
    await expect(services.creativeDirector.generate({ userId: registered.user.id, projectId: project.id })).rejects.toMatchObject({
      code: 'custom_theme_purchase_required', status: 409
    });
    await expect(services.creativeDirector.setStage({ userId: registered.user.id, projectId: project.id, stage: 'preview' })).rejects.toMatchObject({
      code: 'creative_director_transition_invalid', status: 409
    });
    await services.close();
  });

  it('normalizes the exact legacy LEGACY_EXAMPLE plural-bags strategy without mutating its approved revision', async () => {
    const services = await servicesFor(testDatabase());
    const { registered, project } = await createProject(services, 'legacyexample-strategy@example.com');
    await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
    await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'i sell handmade luxury bags' });
    await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'old people especially men' });
    await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Present a more premium brand' });
    await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Warm, refined, editorial' });
    await services.creativeDirector.createBrief({ userId: registered.user.id, projectId: project.id });
    let { session } = await services.creativeDirector.approveBrief({ userId: registered.user.id, projectId: project.id });

    const legacyStrategy = structuredClone(session.store_strategy);
    legacyStrategy.traceability.legacyCompilerStrategy = null;
    legacyStrategy.homepage.hero.treatment = 'Image-led editorial introduction';
    legacyStrategy.navigation.primaryItems = ['Shop', 'Our story', 'Help'];
    legacyStrategy.typographyDirection.style = 'luxury serif';
    legacyStrategy.colorDirection.paletteRole = 'neutral direction';
    legacyStrategy.productPage.galleryStyle = 'image-led gallery with supporting detail';
    legacyStrategy.collectionPage.layout = 'spacious editorial collection grid';
    legacyStrategy.motion.level = 'minimal';
    session = await services.store.updateCreativeDirector(project.id, { ...session, store_strategy: legacyStrategy });
    await approveCurrentRecommendations(services, registered.user.id, project.id);

    const approved = await services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id });
    expect(approved.session.stage).toBe('preset');
    expect(approved.session.preset_selection.recommended_preset_id).toBe('atelier');
    expect(approved.session.store_strategy.traceability.legacyCompilerStrategy).toBeNull();
    expect(approved.session.merchant_profile.theme.compiler_context).toMatchObject({
      industry: 'luxury_fashion',
      design_language: 'luxury',
      homepage_recipe: 'luxury_story'
    });
    expect(approved.session.merchant_profile.traceability.compiler_context_source).toBe('approved_creative_brief.compiler_context_normalization_v1');
    expect(approved.session.merchant_profile.strategy.typography_direction.style).toBe('luxury serif');
    expect(approved.session.merchant_profile.strategy.color_direction.paletteRole).toBe('neutral direction');

    const mapped = mapMerchantProfile(approved.session.merchant_profile, { root });
    expect(mapped.compiler_profile.industry).toBe('luxury_fashion');
    expect(mapped.compiler_profile.preferences.design_languages).toEqual(['luxury']);
    expect(mapped.compiler_profile).not.toHaveProperty('navigation');
    expect(approved.session.merchant_profile.strategy.navigation.primaryItems).toEqual(['Shop', 'Our story', 'Help']);
    await services.close();
  });

  it('requires every merchant-reviewable strategy decision before preset recommendation', async () => {
    const services = await servicesFor(testDatabase());
    const { registered, project } = await createProject(services, 'missing-strategy-decision@example.com');
    await completeConversation(services, registered.user.id, project.id);
    await services.creativeDirector.createBrief({ userId: registered.user.id, projectId: project.id });
    await services.creativeDirector.approveBrief({ userId: registered.user.id, projectId: project.id });

    await expect(services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id })).rejects.toMatchObject({
      code: 'store_strategy_revision_open',
      status: 409,
      message: 'One Store Strategy decision needs to be reviewed before a preset can be recommended.'
    });
    await services.creativeDirector.decideRecommendation({ userId: registered.user.id, projectId: project.id, recommendationPath: 'design-direction', status: 'rejected' });
    await expect(services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id })).rejects.toMatchObject({
      code: 'store_strategy_revision_open', status: 409
    });
    await services.close();
  });

  it('prevents unsupported persisted compiler values from leaking and rejects stale preset candidates', async () => {
    const services = await servicesFor(testDatabase());
    const { registered, project } = await createProject(services, 'invalid-strategy-context@example.com');
    await completeConversation(services, registered.user.id, project.id);
    await services.creativeDirector.createBrief({ userId: registered.user.id, projectId: project.id });
    let { session } = await services.creativeDirector.approveBrief({ userId: registered.user.id, projectId: project.id });
    const invalidStrategy = structuredClone(session.store_strategy);
    invalidStrategy.traceability.legacyCompilerStrategy.resolutions.industry = 'not_a_supported_industry';
    session = await services.store.updateCreativeDirector(project.id, { ...session, store_strategy: invalidStrategy });
    await approveCurrentRecommendations(services, registered.user.id, project.id);
    const preset = await services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id });
    expect(preset.session.stage).toBe('preset');
    expect(preset.session.merchant_profile.theme.compiler_context.industry).toBe('luxury_fashion');
    expect(preset.session.merchant_profile.traceability.compiler_industry_resolution).toMatchObject({
      contract_version: 'compiler-supported-industry-resolution-v1',
      status: 'supported_profile',
      compiler_profile_id: 'luxury_fashion'
    });
    expect(preset.session.store_strategy.traceability.legacyCompilerStrategy.resolutions.industry).toBe('not_a_supported_industry');
    const changed = structuredClone(preset.session.store_strategy);
    changed.designDirection.name = 'merchant revised direction';
    await services.store.updateCreativeDirector(project.id, { ...preset.session, store_strategy: changed });
    await expect(services.creativeDirector.selectPreset({ userId: registered.user.id, projectId: project.id, presetId: preset.session.preset_selection.selected_preset_id, expectedVersion: preset.session.preset_selection.candidate_version })).rejects.toMatchObject({
      code: 'preset_strategy_stale', status: 409
    });
    await services.close();
  });
});
