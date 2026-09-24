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

const root = path.resolve(process.cwd(), '../..');
const oauthSecret = 'candidate-test-oauth-secret';
const encryptionKey = Buffer.alloc(32, 21).toString('base64url');
const password = 'correct-horse-battery-staple';

function database() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-shopify-files-')), 'dashboard.sqlite'); }
function environment(file) {
  return {
    CALINIUM_SQLITE_PATH: file,
    CALINIUM_SHOPIFY_CLIENT_ID: 'candidate-test-client',
    CALINIUM_SHOPIFY_CLIENT_SECRET: oauthSecret,
    CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI: 'https://dashboard.example/api/shopify/oauth/callback',
    CALINIUM_APPLICATION_URL: 'https://dashboard.example',
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: encryptionKey,
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY_ID: 'candidate-test-key'
  };
}
function adapter() {
  return new DeterministicShopifyAdapter({
    scopes: DISCOVERY_SCOPES,
    resources: {
      product: [{ id: 'gid://shopify/Product/201', title: 'Nova', handle: 'nova', status: 'ACTIVE', totalInventory: 5, vendor: 'Nova', media: { nodes: [{ id: 'gid://shopify/MediaImage/201', alt: 'Nova product image', mediaContentType: 'IMAGE', preview: { image: { url: 'https://cdn.example/nova.png', altText: 'Nova sunglasses' } } }] } }],
      collection: [{ id: 'gid://shopify/Collection/301', title: 'Summer Collection', handle: 'summer', productsCount: 1, image: { url: 'https://cdn.example/summer.png', altText: 'Summer' } }], menu: [], market: [], theme: [],
      file: [
        { id: 'gid://shopify/MediaImage/101', alt: 'logo.png', createdAt: '2026-07-24T00:00:00Z', updatedAt: '2026-07-24T00:00:00Z', preview: { image: { url: 'https://cdn.example/logo.png', altText: 'Nova logo' } } },
        { id: 'gid://shopify/MediaImage/102', alt: 'hero-image.png', createdAt: '2026-07-24T00:00:00Z', updatedAt: '2026-07-24T00:00:00Z', preview: { image: { url: 'https://cdn.example/hero-image.png', altText: 'Nova on the coast' } } },
        { id: 'gid://shopify/MediaImage/103', alt: 'product-image.png', createdAt: '2026-07-24T00:00:00Z', updatedAt: '2026-07-24T00:00:00Z', preview: { image: { url: 'https://cdn.example/product-image.png', altText: 'Nova sunglasses' } } }
      ]
    }
  });
}
async function projectFor(services, email = `merchant-${crypto.randomUUID()}@example.com`) {
  const registered = await services.auth.register({ email, password, fullName: 'Merchant', organizationName: 'Studio', ipAddress: '127.0.0.1' });
  const created = await services.projects.createProject({ userId: registered.user.id, input: { name: 'Nova', business_name: 'Nova', country: 'MA' } });
  return { registered, project: created.project };
}
function callbackQuery(authorizationUrl) {
  const parameters = new URLSearchParams({ shop: 'fixture.myshopify.com', code: 'valid-code', state: new URL(authorizationUrl).searchParams.get('state'), timestamp: String(Math.floor(Date.now() / 1000)) });
  const message = [...parameters.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join('&');
  parameters.set('hmac', crypto.createHmac('sha256', oauthSecret).update(message).digest('hex'));
  return parameters;
}
async function connectAndSync(services, registered, project) {
  const started = await services.shopify.startConnection({ userId: registered.user.id, projectId: project.id, shopDomain: 'fixture.myshopify.com' });
  const completed = await services.shopify.completeOAuthCallback({ query: callbackQuery(started.authorization_url) });
  await services.shopify.synchronize({ userId: registered.user.id, projectId: project.id, connectionId: completed.connection.id });
  return completed.connection;
}

describe('Shopify File candidates in the project Asset Library', () => {
  it('keeps every discovered Shopify File project-scoped, categorizable, and separately approved', async () => {
    const services = await createDashboardServices({ root, env: environment(database()), shopifyAdapter: adapter() });
    const { registered, project } = await projectFor(services);
    await connectAndSync(services, registered, project);

    let library = await services.assets.list({ userId: registered.user.id, projectId: project.id });
    expect(library.assets).toHaveLength(0);
    expect(library.shopify_file_candidates).toHaveLength(3);
    expect(library.shopify_file_candidates.map((candidate) => candidate.display_title)).toEqual(['hero-image.png', 'logo.png', 'product-image.png']);
    expect(library.shopify_file_candidates.every((candidate) => candidate.approval_status === 'pending' && candidate.asset_category === 'unclassified')).toBe(true);

    const logo = library.shopify_file_candidates.find((candidate) => candidate.display_title === 'logo.png');
    const hero = library.shopify_file_candidates.find((candidate) => candidate.display_title === 'hero-image.png');
    await services.assets.categorizeShopifyFile({ userId: registered.user.id, projectId: project.id, resourceId: logo.id, assetCategory: 'logo' });
    await services.assets.categorizeShopifyFile({ userId: registered.user.id, projectId: project.id, resourceId: hero.id, assetCategory: 'hero' });
    await services.shopify.decideResource({ userId: registered.user.id, projectId: project.id, resourceId: hero.id, status: 'approved' });

    library = await services.assets.list({ userId: registered.user.id, projectId: project.id });
    expect(library.shopify_file_candidates.find((candidate) => candidate.id === logo.id)).toMatchObject({ asset_category: 'logo', approval_status: 'pending' });
    expect(library.shopify_file_candidates.find((candidate) => candidate.id === hero.id)).toMatchObject({ asset_category: 'hero', approval_status: 'approved' });
    expect((await services.store.listAssetsForProject(project.id, project.organization_id))).toHaveLength(0);
    await services.close();
  });

  it('accepts only an explicitly approved Shopify File for a required Resource Plan asset', async () => {
    const services = await createDashboardServices({ root, env: environment(database()), shopifyAdapter: adapter() });
    const { registered, project } = await projectFor(services);
    await connectAndSync(services, registered, project);
    const hero = (await services.assets.list({ userId: registered.user.id, projectId: project.id })).shopify_file_candidates.find((candidate) => candidate.display_title === 'hero-image.png');
    await services.assets.categorizeShopifyFile({ userId: registered.user.id, projectId: project.id, resourceId: hero.id, assetCategory: 'hero' });

    const started = await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
    await services.store.updateCreativeDirector(project.id, {
      ...started.session,
      stage: 'resources',
      resource_plan: { status: 'ready', fields: [], groups: [], required_assets: [{ asset_id: 'hero_image', label: 'Hero image', field_refs: [] }], required_confirmations: [], blocker: null },
      generation_context: { status: 'awaiting_configuration', approval_reference: null, approved_at: null, merchant_references: {}, shopify_resource_references: {}, asset_references: {}, completed_confirmations: [], resolved_empty_fields: [] }
    });
    await expect(services.creativeDirector.updateResources({ userId: registered.user.id, projectId: project.id, requiredAssetSelections: { hero_image: `shopify:${hero.id}` } })).rejects.toMatchObject({ code: 'shopify_resource_approval_required' });
    await services.shopify.decideResource({ userId: registered.user.id, projectId: project.id, resourceId: hero.id, status: 'approved' });
    const selected = await services.creativeDirector.updateResources({ userId: registered.user.id, projectId: project.id, requiredAssetSelections: { hero_image: `shopify:${hero.id}` } });
    expect(selected.session.stage).toBe('offer');
    expect(selected.session.generation_context.asset_references.hero_image).toBe(`dashboard://projects/${project.id}/shopify-resources/${hero.id}`);
    await services.close();
  });

  it('saves every visible current requirement once, ignores a stale legacy empty decision, and clears review exactly once', async () => {
    const services = await createDashboardServices({ root, env: environment(database()), shopifyAdapter: adapter() });
    const { registered, project } = await projectFor(services, 'resource-plan-save@example.com');
    const connection = await connectAndSync(services, registered, project);
    const resources = await services.shopify.listResources({ userId: registered.user.id, projectId: project.id, connectionId: connection.id });
    const hero = resources.resources.find((entry) => entry.resource.resource_type === 'file' && entry.resource.display_title === 'hero-image.png').resource;
    const collection = resources.resources.find((entry) => entry.resource.resource_type === 'collection').resource;
    await services.shopify.decideResource({ userId: registered.user.id, projectId: project.id, resourceId: hero.id, status: 'approved' });
    await services.shopify.decideResource({ userId: registered.user.id, projectId: project.id, resourceId: collection.id, status: 'approved' });

    const started = await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
    const fields = [
      { setting_ref: 'editorial-hero.image', setting_id: 'image', section_id: 'editorial-hero', instance_id: 'homepage-01-editorial-hero', kind: 'image', required: true },
      { setting_ref: 'featured-collection.collection', setting_id: 'collection', section_id: 'featured-collection', instance_id: 'homepage-02-featured-collection', kind: 'collection', required: true },
      { setting_ref: 'editorial-hero.button_link', setting_id: 'button_link', section_id: 'editorial-hero', instance_id: 'homepage-01-editorial-hero', kind: 'confirmation', required: false }
    ];
    await services.store.updateCreativeDirector(project.id, {
      ...started.session,
      stage: 'resources',
      store_strategy: { homepage: { sections: [{ sectionId: 'editorial-hero' }, { sectionId: 'featured-collection' }] } },
      resource_plan: {
        status: 'ready', fields, groups: [
          { kind: 'image', required: true, field_refs: ['editorial-hero.image'], section_ids: ['editorial-hero'] },
          { kind: 'collection', required: true, field_refs: ['featured-collection.collection'], section_ids: ['featured-collection'] },
          { kind: 'confirmation', required: false, field_refs: ['editorial-hero.button_link'], section_ids: ['editorial-hero'] }
        ],
        required_assets: [{ asset_id: 'hero_image', label: 'Hero image', field_refs: ['editorial-hero.image'] }], required_confirmations: [], blocker: null,
        reconciliation: { policy_version: '1.1', change_signature: 'legacy-cleanup', requires_merchant_review: true, status: 'review_required' }, reconciliation_history: [{ type: 'resource_plan_reconciled' }]
      },
      generation_context: {
        status: 'awaiting_configuration', approval_reference: null, approved_at: null,
        merchant_references: { 'legacy.section.image': `dashboard://projects/${project.id}/shopify-resources/stale` }, shopify_resource_references: { 'legacy.section.image': 'stale' }, asset_references: {},
        completed_confirmations: ['field:legacy.section.image'], resolved_empty_fields: ['behind-the-scenes.quote', 'editorial-hero.button_link']
      }
    });

    const saved = await services.creativeDirector.updateResources({
      userId: registered.user.id, projectId: project.id,
      shopifySelections: { 'editorial-hero.image': hero.id, 'featured-collection.collection': collection.id },
      requiredAssetSelections: { hero_image: `shopify:${hero.id}` },
      // Simulates the state kept by an older browser session before strategy reconciliation.
      resolvedEmptyFields: ['behind-the-scenes.quote', 'editorial-hero.button_link']
    });
    expect(saved.resource_validation).toEqual({ complete: true, blockers: [] });
    expect(saved.session.stage).toBe('offer');
    expect(saved.session.generation_context.resolved_empty_fields).toEqual(['editorial-hero.button_link']);
    expect(saved.session.generation_context.shopify_resource_references).toEqual({ 'editorial-hero.image': hero.id, 'featured-collection.collection': collection.id });
    expect(saved.session.resource_plan.reconciliation).toMatchObject({ requires_merchant_review: false, status: 'reviewed' });
    expect(saved.session.resource_plan.reconciliation_history.filter((item) => item.type === 'merchant_resource_plan_reapproved')).toHaveLength(1);

    const reloaded = await services.creativeDirector.load({ userId: registered.user.id, projectId: project.id });
    expect(reloaded.session.generation_context.shopify_resource_references).toEqual(saved.session.generation_context.shopify_resource_references);
    expect(reloaded.session.resource_plan.reconciliation_history.filter((item) => item.type === 'merchant_resource_plan_reapproved')).toHaveLength(1);
    await services.close();
  });

  it('accepts an explicitly approved Product Media selection for an image field', async () => {
    const services = await createDashboardServices({ root, env: environment(database()), shopifyAdapter: adapter() });
    const { registered, project } = await projectFor(services, 'product-media-resource-plan@example.com');
    const connection = await connectAndSync(services, registered, project);
    const resources = await services.shopify.listResources({ userId: registered.user.id, projectId: project.id, connectionId: connection.id });
    const media = resources.resources.find((entry) => entry.resource.resource_type === 'product_media').resource;
    await services.shopify.decideResource({ userId: registered.user.id, projectId: project.id, resourceId: media.id, status: 'approved' });
    const started = await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
    await services.store.updateCreativeDirector(project.id, {
      ...started.session, stage: 'resources', store_strategy: { homepage: { sections: [{ sectionId: 'editorial-hero' }] } },
      resource_plan: { status: 'ready', fields: [{ setting_ref: 'editorial-hero.image', setting_id: 'image', section_id: 'editorial-hero', instance_id: 'homepage-01-editorial-hero', kind: 'image', required: true }], groups: [{ kind: 'image', required: true, field_refs: ['editorial-hero.image'], section_ids: ['editorial-hero'] }], required_assets: [], required_confirmations: [], blocker: null },
      generation_context: { status: 'awaiting_configuration', approval_reference: null, approved_at: null, merchant_references: {}, shopify_resource_references: {}, asset_references: {}, completed_confirmations: [], resolved_empty_fields: [] }
    });
    const saved = await services.creativeDirector.updateResources({ userId: registered.user.id, projectId: project.id, shopifySelections: { 'editorial-hero.image': media.id } });
    expect(saved.session.stage).toBe('offer');
    expect(saved.session.generation_context.shopify_resource_references['editorial-hero.image']).toBe(media.id);
    await services.close();
  });
});
