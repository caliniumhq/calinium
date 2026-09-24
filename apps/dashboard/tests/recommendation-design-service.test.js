import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardServices } = require('../server/dashboard-services.cjs');
const { DeterministicShopifyAdapter } = require('../server/shopify/deterministic-shopify-adapter.cjs');
const { DISCOVERY_SCOPES } = require('../server/shopify/constants.cjs');
const { omissionAwareFlowReadySession } = require('./helpers/omission-aware-flow-ready-session.cjs');

const root = path.resolve(process.cwd(), '../..');
const password = 'correct-horse-battery-staple';
const oauthSecret = 'creative-direction-oauth-secret';
const encryptionKey = Buffer.alloc(32, 47).toString('base64url');
function database() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-creative-direction-')), 'dashboard.sqlite'); }
function clockFactory() { let tick = 0; const start = Date.parse('2026-08-09T20:00:00.000Z'); return () => new Date(start + (tick++ * 1000)); }
function environment(filename) {
  return {
    CALINIUM_SQLITE_PATH: filename,
    CALINIUM_SHOPIFY_CLIENT_ID: 'creative-direction-client',
    CALINIUM_SHOPIFY_CLIENT_SECRET: oauthSecret,
    CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI: 'https://dashboard.example/api/shopify/oauth/callback',
    CALINIUM_APPLICATION_URL: 'https://dashboard.example',
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: encryptionKey
  };
}
function adapter() {
  return new DeterministicShopifyAdapter({
    shop: { id: 'gid://shopify/Shop/1', name: 'LEGACY_EXAMPLE', myshopify_domain: 'canonical-legacyexample.myshopify.com', primary_domain: 'www.legacyexample.example', storefront_url: 'https://www.legacyexample.example' },
    scopes: DISCOVERY_SCOPES,
    resources: {
      product: [
        { id: 'gid://shopify/Product/1', title: 'Nocturne Travel Bag', handle: 'nocturne', status: 'ACTIVE', updatedAt: '2026-08-01T00:00:00Z', featuredMedia: { preview: { image: { url: 'https://cdn.shopify.com/s/files/1/files/nocturne.jpg' } } }, variants: { nodes: [] }, media: { nodes: [{ id: 'gid://shopify/MediaImage/1', alt: 'Black leather travel bag', mediaContentType: 'IMAGE', preview: { image: { url: 'https://cdn.shopify.com/s/files/1/files/nocturne.jpg' } } }] } },
        { id: 'gid://shopify/Product/2', title: 'Weekender', handle: 'weekender', status: 'ACTIVE', updatedAt: '2026-08-01T00:00:00Z', variants: { nodes: [] }, media: { nodes: [] } }
      ],
      collection: [{ id: 'gid://shopify/Collection/1', title: 'Travel Bags', handle: 'travel-bags', updatedAt: '2026-08-01T00:00:00Z' }],
      menu: [{ id: 'gid://shopify/Menu/1', title: 'Main menu', handle: 'main-menu', items: [{ title: 'Shop', type: 'COLLECTION', url: '/collections/travel-bags' }] }],
      file: [{ id: 'gid://shopify/MediaImage/2', alt: 'Travel bag campaign', filename: 'campaign.jpg', preview: { image: { url: 'https://cdn.shopify.com/s/files/1/files/campaign.jpg' } }, updatedAt: '2026-08-01T00:00:00Z' }],
      market: [{ id: 'gid://shopify/Market/1', name: 'Primary', enabled: true, webPresences: { nodes: [] } }],
      theme: [{ id: 'gid://shopify/OnlineStoreTheme/1', name: 'LEGACY_EXAMPLE staging preview', role: 'DEVELOPMENT', updatedAt: '2026-08-01T00:00:00Z' }]
    }
  });
}
function callbackQuery(authorizationUrl) {
  const state = new URL(authorizationUrl).searchParams.get('state');
  const parameters = new URLSearchParams({ code: 'valid-code', shop: 'canonical-legacyexample.myshopify.com', state, timestamp: String(Date.parse('2026-08-09T20:00:00.000Z') / 1000) });
  const message = [...parameters.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join('&');
  parameters.set('hmac', crypto.createHmac('sha256', oauthSecret).update(message).digest('hex'));
  return parameters;
}
async function approveStrategyRecommendations(services, userId, projectId) {
  let { session } = await services.creativeDirector.load({ userId, projectId });
  for (const recommendation of session.store_strategy.recommendations || []) {
    if (!recommendation.requiresMerchantApproval) continue;
    ({ session } = await services.creativeDirector.decideRecommendation({ userId, projectId, recommendationPath: recommendation.id, status: 'approved' }));
  }
}
async function setup() {
  const services = await createDashboardServices({ root, env: environment(database()), clock: clockFactory(), shopifyAdapter: adapter() });
  const registered = await services.auth.register({ email: `direction-${crypto.randomUUID()}@example.com`, password, fullName: 'Direction Merchant', organizationName: 'LEGACY_EXAMPLE Studio', ipAddress: '127.0.0.1' });
  const { project } = await services.projects.createProject({ userId: registered.user.id, input: { name: 'LEGACY_EXAMPLE', business_name: 'LEGACY_EXAMPLE', country: 'MA' } });
  await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
  await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Handmade leather travel bags with approved product photography' });
  await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Frequent travelers who value durable design' });
  await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Present a clear premium collection' });
  const response = await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Warm, refined, editorial' });
  expect(response.session.stage).toBe('understanding');
  await services.creativeDirector.createBrief({ userId: registered.user.id, projectId: project.id });
  await services.creativeDirector.approveBrief({ userId: registered.user.id, projectId: project.id });
  await approveStrategyRecommendations(services, registered.user.id, project.id);
  const preset = await services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id });
  expect(preset.session.preset_selection.recommended_preset_id).toBe('atelier');
  const approvedPreset = await services.creativeDirector.approvePreset({ userId: registered.user.id, projectId: project.id, expectedVersion: preset.session.preset_selection.candidate_version });
  expect(approvedPreset.session.stage).toBe('resources');
  const startedConnection = await services.shopify.startConnection({ userId: registered.user.id, projectId: project.id, shopDomain: 'canonical-legacyexample.myshopify.com' });
  await services.shopify.completeOAuthCallback({ query: callbackQuery(startedConnection.authorization_url) });
  await services.merchantIntake.begin({ userId: registered.user.id, projectId: project.id, awaitCompletion: true });
  const resourceSet = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
  const direction = await services.creativeDirection.ensure({ userId: registered.user.id, projectId: project.id });
  return { services, registered, project, resourceSet, direction };
}

describe('Recommendation and Design DNA service', () => {
  it('creates deterministic immutable candidates without silently approving Resource Set or creative direction', async () => {
    const { services, registered, project, resourceSet, direction } = await setup();
    const repeated = await services.creativeDirection.ensure({ userId: registered.user.id, projectId: project.id });
    expect(repeated).toEqual(direction);
    expect(direction).toMatchObject({ status: 'recommended', approvable: true, primary: { preset_id: 'atelier' }, preview_readiness: 'provisional' });
    expect(direction.alternatives.length).toBeLessThanOrEqual(2);
    expect(Object.keys(direction.design_dna.dimensions)).toHaveLength(26);
    expect(direction.design_dna.executable).toBe(true);
    expect(await services.store.listStorefrontRecommendationRevisions(project.id)).toHaveLength(1);
    expect(await services.store.listDesignDnaRevisions(project.id)).toHaveLength(1);
    expect(await services.store.listApprovedStorefrontRecommendationRevisions(project.id)).toEqual([]);
    expect(await services.store.listApprovedDesignDnaRevisions(project.id)).toEqual([]);
    expect(await services.store.listApprovedResourceSetRevisions(project.id)).toEqual([]);
    expect(resourceSet.approved_revision_id).toBeNull();
    const session = await services.store.findCreativeDirectorForProject(project.id);
    const generationEligibility = await services.customThemes.evaluate({ project, session });
    expect(generationEligibility.requirements).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'creative_direction', status: 'blocked' })]));
    expect(generationEligibility.eligible).toBe(false);
    expect(await services.store.listCustomThemeOrdersForProject(project.id, project.organization_id)).toEqual([]);
    const generations = await services.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_generation_runs');
    expect(Number(generations.count)).toBe(0);
    await services.close();
  });

  it('does not create a new recommendation or DNA revision for an irrelevant resource replacement', async () => {
    const { services, registered, project, resourceSet, direction } = await setup();
    const replaceable = resourceSet.slots.find((slot) => slot.alternatives.length > 0);
    expect(replaceable).toBeTruthy();
    const replacement = replaceable.alternatives[0];
    const revisedResources = await services.recommendedResources.replace({
      userId: registered.user.id,
      projectId: project.id,
      expectedRevisionId: resourceSet.revision_id,
      slotId: replaceable.slot_id,
      selectionId: replacement.selection_id
    });
    expect(revisedResources.revision_id).not.toBe(resourceSet.revision_id);
    const repeated = await services.creativeDirection.ensure({ userId: registered.user.id, projectId: project.id });
    expect(repeated.revision_id).toBe(direction.revision_id);
    expect(repeated.design_dna.revision_id).toBe(direction.design_dna.revision_id);
    expect(await services.store.listStorefrontRecommendationRevisions(project.id)).toHaveLength(1);
    expect(await services.store.listDesignDnaRevisions(project.id)).toHaveLength(1);
    await services.close();
  }, 15000);

  it('keeps explanations non-mutating and creates a DNA-only successor for a bounded refinement', async () => {
    const { services, registered, project, direction, resourceSet } = await setup();
    const recommendationCount = (await services.store.listStorefrontRecommendationRevisions(project.id)).length;
    const dnaCount = (await services.store.listDesignDnaRevisions(project.id)).length;
    const explained = await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Why Atelier?' });
    expect(explained.creative_direction.revision_id).toBe(direction.revision_id);
    expect(await services.store.listStorefrontRecommendationRevisions(project.id)).toHaveLength(recommendationCount);
    expect(await services.store.listDesignDnaRevisions(project.id)).toHaveLength(dnaCount);
    const refined = await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Less motion.' });
    expect(refined.creative_direction.revision_id).toBe(direction.revision_id);
    expect(refined.creative_direction.design_dna.revision_id).not.toBe(direction.design_dna.revision_id);
    expect(refined.creative_direction.design_dna.summary.motion).toBe('none');
    expect((await services.store.findDesignDnaRevision(direction.design_dna.revision_id, project.id, project.organization_id)).dna.summary.motion).not.toBe('none');
    expect((await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id })).revision_id).toBe(resourceSet.revision_id);
    expect(await services.store.listApprovedResourceSetRevisions(project.id)).toEqual([]);
    await services.close();
  });

  it('undoes only the current reversible refinement through canonical Design DNA state', async () => {
    const { services, registered, project, direction } = await setup();
    const refined = await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Less motion.' });
    expect(refined.creative_direction.design_dna.summary.motion).toBe('none');

    const undone = await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Undo that.' });
    expect(undone.creative_direction.revision_id).toBe(direction.revision_id);
    expect(undone.creative_direction.design_dna.revision_id).toBe(direction.design_dna.revision_id);
    expect(undone.creative_direction.design_dna.summary.motion).toBe(direction.design_dna.summary.motion);
    expect(await services.store.listApprovedDesignDnaRevisions(project.id)).toEqual([]);
    expect(await services.store.listCustomThemeOrdersForProject(project.id, project.organization_id)).toEqual([]);

    await expect(services.creativeDirection.refine({ userId: registered.user.id, projectId: project.id, message: 'Undo that.' })).rejects.toMatchObject({ code: 'creative_refinement_undo_unavailable', status: 409 });
    await services.close();
  });

  it('rejects stale approval and keeps historical Atelier when Maison is explored', async () => {
    const { services, registered, project, direction } = await setup();
    const refined = await services.creativeDirection.refine({ userId: registered.user.id, projectId: project.id, message: 'Make it more minimal.' });
    await expect(services.creativeDirection.approve({ userId: registered.user.id, projectId: project.id, expectedRecommendationRevisionId: direction.revision_id, expectedDnaRevisionId: direction.design_dna.revision_id })).rejects.toMatchObject({ code: 'creative_direction_stale', status: 409 });
    const approved = await services.creativeDirection.approve({ userId: registered.user.id, projectId: project.id, expectedRecommendationRevisionId: refined.creative_direction.revision_id, expectedDnaRevisionId: refined.creative_direction.design_dna.revision_id });
    expect(approved.creative_direction.preview_readiness).toBe('approved');
    const explored = await services.creativeDirection.refine({ userId: registered.user.id, projectId: project.id, message: 'Use Maison.' });
    expect(explored.creative_direction).toMatchObject({ primary: { preset_id: 'maison' }, historical_direction: { preset_id: 'atelier', approval_preserved: true }, approvable: false });
    const session = await services.store.findCreativeDirectorForProject(project.id);
    expect(session.preset_selection).toMatchObject({ status: 'approved', selected_preset_id: 'atelier' });
    expect(await services.store.listApprovedStorefrontRecommendationRevisions(project.id)).toHaveLength(1);
    await services.close();
  }, 15000);

  it('pins approved recommendation and DNA in the paid input snapshot without mutable lookup', async () => {
    const { services, registered, project, direction } = await setup();
    const approved = await services.creativeDirection.approve({ userId: registered.user.id, projectId: project.id, expectedRecommendationRevisionId: direction.revision_id, expectedDnaRevisionId: direction.design_dna.revision_id });
    const session = omissionAwareFlowReadySession(
      await services.store.findCreativeDirectorForProject(project.id),
      '2026-08-09T20:58:00.000Z',
      'canonical-legacyexample.myshopify.com'
    );
    const contentEligibility = services.customThemes.contentPlanEligibility(session, 'canonical-legacyexample.myshopify.com');
    expect(session.content_plan.target_eligibility.effective_composition.preset_revision_id).toBe(session.preset_selection.approved_revision_id);
    expect(contentEligibility).toMatchObject({ eligible: false, reason: 'content_plan_action_required' });
    const eligibility = await services.customThemes.evaluate({ project, session });
    const snapshot = services.customThemes.snapshot({
      project,
      session: { ...session, creative_brief: session.creative_brief || {}, store_strategy: session.store_strategy || {}, generation_context: { ...session.generation_context, approval_reference: 'resource-plan-approval-fixture', approved_at: '2026-08-09T20:59:00.000Z' } },
      eligibility,
      order: { id: 'cto_creative_direction_fixture' },
      at: '2026-08-09T21:00:00.000Z',
      approvedRecommendationRevision: approved.approved_recommendation,
      approvedDesignDnaRevision: approved.approved_design_dna
    });
    expect(snapshot.approved_recommendation_revision.revision_id).toBe(approved.approved_recommendation.revision_id);
    expect(snapshot.approved_design_dna_revision.revision_id).toBe(approved.approved_design_dna.revision_id);
    expect(snapshot.generation_approval_binding.approved_recommendation).toMatchObject({ revision_id: approved.approved_recommendation.revision_id, approval_checksum: approved.approved_recommendation.approval_checksum });
    expect(snapshot.generation_approval_binding.approved_design_dna).toMatchObject({ revision_id: approved.approved_design_dna.revision_id, approval_checksum: approved.approved_design_dna.approval_checksum });
    expect(services.creativeDirection.fromSnapshot({ project, snapshot })).toEqual({ recommendation: approved.approved_recommendation, designDna: approved.approved_design_dna });
    expect(() => services.creativeDirection.fromSnapshot({ project: { ...project, id: 'prj_other' }, snapshot })).toThrow(/could not be verified/);
    const tampered = structuredClone(snapshot);
    tampered.approved_design_dna_revision.approved.summary.motion = 'functional';
    expect(() => services.creativeDirection.fromSnapshot({ project, snapshot: tampered })).toThrow(/approved Design DNA could not be verified/);
    await services.close();
  });

  it('enforces organization/project authorization for every creative-direction operation', async () => {
    const { services, project } = await setup();
    const outsider = await services.auth.register({ email: `outsider-${crypto.randomUUID()}@example.com`, password, fullName: 'Outsider', organizationName: 'Other Studio', ipAddress: '127.0.0.2' });
    await expect(services.creativeDirection.ensure({ userId: outsider.user.id, projectId: project.id })).rejects.toMatchObject({ code: 'permission_denied', status: 403 });
    await expect(services.creativeDirection.refine({ userId: outsider.user.id, projectId: project.id, message: 'Less motion.' })).rejects.toMatchObject({ code: 'permission_denied', status: 403 });
    await services.close();
  });
});
