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
const { buildPreviewArtifact, previewTokens } = require('../../../ai/live-preview/live-preview-engine.js');
const { BASELINES } = require('../../../ai/design-dna/design-dna-engine.js');
const { contentRevision, trustedGeneratedBinding } = require('../server/services/live-preview-service.cjs');

const root = path.resolve(process.cwd(), '../..');
const password = 'correct-horse-battery-staple';
const oauthSecret = 'live-preview-oauth-secret';
const encryptionKey = Buffer.alloc(32, 53).toString('base64url');
function database() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-live-preview-')), 'dashboard.sqlite'); }
function clockFactory() { let tick = 0; const start = Date.parse('2026-08-09T20:00:00.000Z'); return () => new Date(start + (tick++ * 1000)); }
function environment(filename) {
  return {
    CALINIUM_SQLITE_PATH: filename,
    CALINIUM_SHOPIFY_CLIENT_ID: 'live-preview-client',
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
        { id: 'gid://shopify/Product/1', title: 'Nocturne Travel Bag', handle: 'nocturne', status: 'ACTIVE', updatedAt: '2026-08-01T00:00:00Z', featuredMedia: { preview: { image: { url: 'https://cdn.example/nocturne.jpg' } } }, variants: { nodes: [{ id: 'gid://shopify/ProductVariant/1', title: 'Default', price: '310.00', currencyCode: 'USD' }] }, media: { nodes: [{ id: 'gid://shopify/MediaImage/1', alt: 'Black leather travel bag', mediaContentType: 'IMAGE', preview: { image: { url: 'https://cdn.example/nocturne.jpg' } } }] } },
        { id: 'gid://shopify/Product/2', title: 'Weekender', handle: 'weekender', status: 'ACTIVE', updatedAt: '2026-08-01T00:00:00Z', variants: { nodes: [] }, media: { nodes: [] } }
      ],
      collection: [{ id: 'gid://shopify/Collection/1', title: 'Travel Bags', handle: 'travel-bags', updatedAt: '2026-08-01T00:00:00Z' }],
      menu: [{ id: 'gid://shopify/Menu/1', title: 'Main menu', handle: 'main-menu', items: [{ title: 'Shop', type: 'COLLECTION', url: '/collections/travel-bags' }] }],
      file: [
        { id: 'gid://shopify/MediaImage/2', alt: 'Travel bag campaign', filename: 'campaign.jpg', preview: { image: { url: 'https://cdn.example/campaign.jpg' } }, updatedAt: '2026-08-01T00:00:00Z' },
        { id: 'gid://shopify/MediaImage/3', alt: 'Leather bag detail', filename: 'detail.jpg', preview: { image: { url: 'https://cdn.example/detail.jpg' } }, updatedAt: '2026-08-02T00:00:00Z' }
      ],
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
  const registered = await services.auth.register({ email: `preview-${crypto.randomUUID()}@example.com`, password, fullName: 'Preview Merchant', organizationName: 'LEGACY_EXAMPLE Studio', ipAddress: '127.0.0.1' });
  const { project } = await services.projects.createProject({ userId: registered.user.id, input: { name: 'LEGACY_EXAMPLE', business_name: 'LEGACY_EXAMPLE', country: 'MA' } });
  await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
  for (const answer of ['Handmade leather travel bags with approved product photography', 'Frequent travelers who value durable design', 'Present a clear premium collection', 'Warm, refined, editorial']) {
    await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: answer });
  }
  await services.creativeDirector.createBrief({ userId: registered.user.id, projectId: project.id });
  await services.creativeDirector.approveBrief({ userId: registered.user.id, projectId: project.id });
  await approveStrategyRecommendations(services, registered.user.id, project.id);
  const preset = await services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id });
  await services.creativeDirector.approvePreset({ userId: registered.user.id, projectId: project.id, expectedVersion: preset.session.preset_selection.candidate_version });
  const startedConnection = await services.shopify.startConnection({ userId: registered.user.id, projectId: project.id, shopDomain: 'canonical-legacyexample.myshopify.com' });
  await services.shopify.completeOAuthCallback({ query: callbackQuery(startedConnection.authorization_url) });
  await services.merchantIntake.begin({ userId: registered.user.id, projectId: project.id, awaitCompletion: true });
  const resourceSet = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
  const direction = await services.creativeDirection.ensure({ userId: registered.user.id, projectId: project.id });
  return { services, registered, project, resourceSet, direction };
}

function pureInput(overrides = {}) {
  const base = {
    project: { name: 'LEGACY_EXAMPLE' },
    recommendation: { primary: { preset_id: 'atelier', preset_name: 'Atelier', homepage_recipe: 'luxury_story', section_order: ['full-screen-hero', 'featured-collection', 'newsletter'] } },
    designDna: { dimensions: { typography: { value: 'editorial-serif-led' }, spacing: { value: 'luxury' }, motion: { value: 'minimal' }, color: { value: 'warm-restrained' }, hero: { value: 'immersive' }, commerce_density: { value: 'balanced' } } },
    resources: [
      { slot_id: 'logo', resource: null },
      { slot_id: 'primary_navigation', resource: { display_title: 'Main menu', resource_type: 'menu', source_revision: 'menu-1', availability_status: 'available', metadata: { items: [{ title: 'Shop' }] } } },
      { slot_id: 'hero_media', resource: { display_title: 'Campaign', resource_type: 'file', preview_url: 'https://cdn.example/campaign.jpg', alt_text: 'Black travel bag', source_revision: 'hero-1', availability_status: 'available' } },
      { slot_id: 'hero_destination', resource: { display_title: 'Nocturne Travel Bag', resource_type: 'product', source_revision: 'product-1', availability_status: 'available' } },
      { slot_id: 'featured_collection', resource: { display_title: 'Travel Bags', resource_type: 'collection', source_revision: 'collection-1', availability_status: 'available' } }
    ],
    contentPlan: {}, recommendationRevisionId: 'rec-1', dnaRevisionId: 'dna-1', resourceSetRevisionId: 'rrs-1', contentRevision: null,
    runtimeCapabilityVersion: 'calinium-one-1.0', approvedDirection: false, approvedResources: false, generatedBinding: null
  };
  return { ...base, ...overrides };
}

describe('Live Preview Engine', () => {
  it('creates one durable truthful Provisional revision and reuses it on refresh', async () => {
    const { services, registered, project } = await setup();
    const first = await services.livePreview.ensure({ userId: registered.user.id, projectId: project.id });
    const second = await services.livePreview.ensure({ userId: registered.user.id, projectId: project.id });
    expect(first).toMatchObject({ state: 'provisional', label: 'Provisional', qualifier: 'current', model: { identity: 'LEGACY_EXAMPLE', page: 'homepage', state: 'provisional', preset: { id: 'atelier' } } });
    expect(second.revision_id).toBe(first.revision_id);
    expect(second.sequence).toBe(first.sequence);
    expect(await services.store.listLivePreviewRevisions(project.id)).toHaveLength(1);
    const serialized = JSON.stringify(first.model);
    expect(serialized).toMatch(/Nocturne|Travel Bags|Travel bag campaign|Main menu|Shop/);
    expect(serialized).not.toMatch(/testimonial|five-star|award|certification|discount|limited time/i);
    expect(first.model.sections.some((section) => section.type === 'craftsmanship')).toBe(false);
    expect(first.model.omissions).toEqual(expect.arrayContaining([expect.objectContaining({ section: 'craftsmanship' })]));
    expect(await services.store.listCustomThemeOrdersForProject(project.id, project.organization_id)).toEqual([]);
    expect(Number((await services.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_generation_runs')).count)).toBe(0);
    await services.close();
  }, 20000);

  it('uses explicit dependency scopes for hero, motion, typography, and commerce updates', () => {
    const base = buildPreviewArtifact(pureInput()).artifact;
    const heroResources = structuredClone(pureInput().resources);
    heroResources.find((item) => item.slot_id === 'hero_media').resource = { ...heroResources.find((item) => item.slot_id === 'hero_media').resource, preview_url: 'https://cdn.example/detail.jpg', source_revision: 'hero-2' };
    expect(buildPreviewArtifact(pureInput({ resources: heroResources, resourceSetRevisionId: 'rrs-2' })).artifact.region_fingerprints).toMatchObject({
      header: base.region_fingerprints.header, featured_collection: base.region_fingerprints.featured_collection, newsletter: base.region_fingerprints.newsletter, footer: base.region_fingerprints.footer
    });
    expect(buildPreviewArtifact(pureInput({ resources: heroResources, resourceSetRevisionId: 'rrs-2' })).artifact.region_fingerprints.hero).not.toBe(base.region_fingerprints.hero);

    const lessMotion = structuredClone(pureInput().designDna);
    lessMotion.dimensions.motion.value = 'none';
    const motion = buildPreviewArtifact(pureInput({ designDna: lessMotion, dnaRevisionId: 'dna-motion' })).artifact.region_fingerprints;
    expect(motion.hero).not.toBe(base.region_fingerprints.hero);
    for (const region of ['header', 'craftsmanship', 'featured_collection', 'newsletter', 'footer']) expect(motion[region]).toBe(base.region_fingerprints[region]);

    const typographyDna = structuredClone(pureInput().designDna);
    typographyDna.dimensions.typography.value = 'functional-sans';
    const typography = buildPreviewArtifact(pureInput({ designDna: typographyDna, dnaRevisionId: 'dna-type' })).artifact.region_fingerprints;
    for (const region of ['header', 'hero', 'craftsmanship', 'featured_collection', 'newsletter', 'footer']) expect(typography[region]).not.toBe(base.region_fingerprints[region]);

    const commerceDna = structuredClone(pureInput().designDna);
    commerceDna.dimensions.commerce_density.value = 'product-forward';
    const commerce = buildPreviewArtifact(pureInput({ designDna: commerceDna, dnaRevisionId: 'dna-commerce' })).artifact.region_fingerprints;
    expect(commerce.featured_collection).not.toBe(base.region_fingerprints.featured_collection);
    for (const region of ['header', 'hero', 'craftsmanship', 'newsletter', 'footer']) expect(commerce[region]).toBe(base.region_fingerprints[region]);
  });

  it('projects every Beta preset Design DNA through the same bounded token adapter', () => {
    for (const [presetId, baseline] of Object.entries(BASELINES)) {
      const tokens = previewTokens({ dimensions: Object.fromEntries(Object.entries(baseline).map(([id, value]) => [id, { value }])) });
      expect(Object.keys(tokens)).toHaveLength(15);
      expect(Object.values(tokens).every(Boolean)).toBe(true);
      expect(tokens.layout).toBe(baseline.layout.replace(/-/g, '_'));
      expect(tokens.responsive).toBe(baseline.responsive.replace(/-/g, '_'));
      if (presetId === 'signal') expect(tokens.motion).toBe('functional');
    }
  });

  it('creates an Approved child only after both canonical owners approve', async () => {
    const { services, registered, project, resourceSet, direction } = await setup();
    const provisional = await services.livePreview.ensure({ userId: registered.user.id, projectId: project.id });
    await services.recommendedResources.approve({ userId: registered.user.id, projectId: project.id, expectedRevisionId: resourceSet.revision_id });
    await services.creativeDirection.approve({ userId: registered.user.id, projectId: project.id, expectedRecommendationRevisionId: direction.revision_id, expectedDnaRevisionId: direction.design_dna.revision_id });
    const approved = await services.livePreview.ensure({ userId: registered.user.id, projectId: project.id });
    expect(approved).toMatchObject({ state: 'approved', label: 'Approved' });
    expect(approved.revision_id).not.toBe(provisional.revision_id);
    const revisions = await services.store.listLivePreviewRevisions(project.id);
    expect(revisions).toHaveLength(2);
    expect(revisions[1].parent_revision_id).toBe(provisional.revision_id);
    await services.close();
  }, 20000);

  it('keeps approved history immutable while a post-delivery conversation creates a Provisional successor', async () => {
    const { services, registered, project, resourceSet, direction } = await setup();
    await services.recommendedResources.approve({ userId: registered.user.id, projectId: project.id, expectedRevisionId: resourceSet.revision_id });
    await services.creativeDirection.approve({ userId: registered.user.id, projectId: project.id, expectedRecommendationRevisionId: direction.revision_id, expectedDnaRevisionId: direction.design_dna.revision_id });
    const approvedPreview = await services.livePreview.ensure({ userId: registered.user.id, projectId: project.id });
    expect(approvedPreview.state).toBe('approved');
    const approvedRecommendations = await services.store.listApprovedStorefrontRecommendationRevisions(project.id);
    const approvedDna = await services.store.listApprovedDesignDnaRevisions(project.id);
    const current = await services.store.findCreativeDirectorForProject(project.id);
    await services.store.updateCreativeDirector(project.id, { ...current, stage: 'delivery' });

    const refined = await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Less motion.' });
    expect(refined.session.stage).toBe('delivery');
    expect(refined.creative_direction).toMatchObject({ preview_readiness: 'provisional', design_dna: { summary: { motion: 'none' } } });
    expect(refined.creative_direction.status).not.toBe('approved');
    const successor = await services.livePreview.ensure({ userId: registered.user.id, projectId: project.id });
    expect(successor).toMatchObject({ state: 'provisional', model: { tokens: { motion: 'none' } } });
    expect(successor.revision_id).not.toBe(approvedPreview.revision_id);
    expect(await services.store.listApprovedStorefrontRecommendationRevisions(project.id)).toEqual(approvedRecommendations);
    expect(await services.store.listApprovedDesignDnaRevisions(project.id)).toEqual(approvedDna);
    await services.close();
  }, 20000);

  it('discards stale work, preserves the last stable revision on failure, and recovers idempotently', async () => {
    const { services, registered, project } = await setup();
    const first = await services.livePreview.ensure({ userId: registered.user.id, projectId: project.id });
    let refined = false;
    services.livePreview.beforeBuild = async () => {
      if (refined) return;
      refined = true;
      await services.creativeDirection.refine({ userId: registered.user.id, projectId: project.id, message: 'Less motion.' });
    };
    const current = await services.livePreview.ensure({ userId: registered.user.id, projectId: project.id });
    expect(current.revision_id).not.toBe(first.revision_id);
    expect(current.model.tokens.motion).toBe('none');
    expect(current.changed_regions).toEqual(['hero']);
    services.livePreview.beforeBuild = async () => { throw new Error('renderer unavailable'); };
    const failed = await services.livePreview.ensure({ userId: registered.user.id, projectId: project.id });
    expect(failed).toMatchObject({ qualifier: 'failed', revision_id: current.revision_id, error: { code: 'preview_refresh_failed' } });
    services.livePreview.beforeBuild = null;
    const recovered = await services.livePreview.ensure({ userId: registered.user.id, projectId: project.id, retry: true });
    expect(recovered).toMatchObject({ qualifier: 'current', revision_id: current.revision_id, error: null });
    expect(await services.store.listLivePreviewRevisions(project.id)).toHaveLength(2);
    await services.close();
  }, 20000);

  it('enforces project authorization and accepts Generated only for a trusted paid artifact binding', async () => {
    const { services, project } = await setup();
    const outsider = await services.auth.register({ email: `preview-outsider-${crypto.randomUUID()}@example.com`, password, fullName: 'Outsider', organizationName: 'Other Studio', ipAddress: '127.0.0.2' });
    await expect(services.livePreview.ensure({ userId: outsider.user.id, projectId: project.id })).rejects.toMatchObject({ code: 'permission_denied', status: 403 });

    const inputIds = { recommendationRevisionId: 'rec-1', dnaRevisionId: 'dna-1', resourceSetRevisionId: 'rrs-1', presetRevisionId: 'apr-1', contentRevision: 'abp-1' };
    const order = {
      id: 'order-1', payment_status: 'paid', generation_status: 'ready', generated_at: '2026-08-09T22:00:00.000Z', snapshot_checksum: 'snapshot-checksum',
      snapshot: { checksum: 'snapshot-checksum', approved_preset_revision: { revision_id: 'apr-1' }, approved_block_plan_transport: { plan_revision: { revision_id: 'abp-1' } }, approved_recommendation_revision: { candidate_revision_id: 'rec-1' }, approved_design_dna_revision: { candidate_revision_id: 'dna-1' }, approved_resource_set_revision: { candidate_revision_id: 'rrs-1' } },
      validation_result: { valid: true, artifact_integrity: { version: 1, order_id: 'order-1', generation_id: 'generation-1', artifacts: { theme_zip: { sha256: 'a'.repeat(64) }, package_manifest: { sha256: 'b'.repeat(64) } } } }
    };
    const binding = trustedGeneratedBinding(order, inputIds);
    expect(binding).toMatchObject({ order_reference: 'order-1', generation_reference: 'generation-1' });
    expect(buildPreviewArtifact(pureInput({ generatedBinding: binding })).state).toBe('generated');
    expect(trustedGeneratedBinding({ ...order, payment_status: 'pending' }, inputIds)).toBeNull();
    expect(trustedGeneratedBinding({ ...order, validation_result: { ...order.validation_result, valid: false } }, inputIds)).toBeNull();
    expect(trustedGeneratedBinding({ ...order, snapshot_checksum: 'different' }, inputIds)).toBeNull();
    expect(trustedGeneratedBinding(order, { ...inputIds, presetRevisionId: 'apr-successor' })).toBeNull();
    expect(trustedGeneratedBinding(order, { ...inputIds, contentRevision: 'abp-successor' })).toBeNull();
    await services.close();
  }, 20000);

  it('does not invent a content revision when the canonical content plan is not required', () => {
    expect(contentRevision({ status: 'not_required', craftsmanship: { status: 'not_required', candidate_version: 0, steps: [] } })).toBeNull();
    expect(contentRevision({ approved_revision_id: 'abp-1', craftsmanship: { status: 'not_required', candidate_version: 0, steps: [] } })).toBe('abp-1');
  });
});
