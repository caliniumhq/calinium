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
const { runtimeInventory } = require('../../../scripts/lib/theme-runtime-integrity.js');
const { repositoryPaths } = require('../../../scripts/lib/repository-paths.js');
const { checksum: presetChecksum } = require('../../../ai/presets/preset-registry.js');

const root = path.resolve(process.cwd(), '../..');
const password = 'commerce-plan-test-password';
const oauthSecret = 'commerce-plan-oauth-secret';
const encryptionKey = Buffer.alloc(32, 53).toString('base64url');

function database() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-commerce-plan-')), 'dashboard.sqlite'); }
function environment(file) { return { NODE_ENV: 'test', CALINIUM_SQLITE_PATH: file, CALINIUM_SHOPIFY_CLIENT_ID: 'commerce-plan-client', CALINIUM_SHOPIFY_CLIENT_SECRET: oauthSecret, CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI: 'https://dashboard.example/api/shopify/oauth/callback', CALINIUM_APPLICATION_URL: 'https://dashboard.example', CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: encryptionKey, CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY_ID: 'commerce-plan-key', CALINIUM_PAYMENT_MODE: 'development_simulator', CALINIUM_PAYMENT_PROVIDER: 'development_simulator' }; }
function shopifyAdapter() {
  return new DeterministicShopifyAdapter({
    scopes: DISCOVERY_SCOPES,
    resources: {
      product: [
        { id: 'gid://shopify/Product/801', title: 'Atlas rug', handle: 'atlas-rug' },
        { id: 'gid://shopify/Product/802', title: 'Cedar rug', handle: 'cedar-rug' },
        { id: 'gid://shopify/Product/803', title: 'Dune rug', handle: 'dune-rug' },
        { id: 'gid://shopify/Product/804', title: 'Loom care kit', handle: 'loom-care-kit' }
      ],
      collection: [
        { id: 'gid://shopify/Collection/901', title: 'Rug care guides', handle: 'rug-care-guides', image: { url: 'https://cdn.example/rug-care.jpg', altText: 'Approved rug care image' } },
        { id: 'gid://shopify/Collection/902', title: 'Natural fibres', handle: 'natural-fibres', image: { url: 'https://cdn.example/natural-fibres.jpg', altText: 'Approved natural fibres image' } }
      ], menu: [], file: [], market: [], theme: []
    }
  });
}
function callbackQuery(url) {
  const parameters = new URLSearchParams({ shop: 'fixture.myshopify.com', code: 'valid-code', state: new URL(url).searchParams.get('state'), timestamp: '1785585600' });
  const source = [...parameters.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join('&');
  parameters.set('hmac', crypto.createHmac('sha256', oauthSecret).update(source).digest('hex'));
  return parameters;
}
async function approvedImage(services, project, user, suffix) {
  const now = '2026-08-01T12:30:00.000Z'; const checksum = crypto.createHash('sha256').update(`commerce-${suffix}`).digest('hex');
  return services.store.createAsset({ id: `asset-commerce-${suffix}`, organization_id: project.organization_id, project_id: project.id, asset_type: 'lifestyle_image', display_title: `Approved ${suffix}`, original_filename: `${suffix}.jpg`, safe_filename: `${suffix}.jpg`, mime_type: 'image/jpeg', size_bytes: 1, checksum_sha256: checksum, storage_key: `tests/${project.id}/${suffix}.jpg`, upload_status: 'ready', source_type: 'merchant_upload', processing_state: 'ready', width: 1600, height: 1200, alt_text: `Approved ${suffix}`, notes: null, created_by_user_id: user.id, created_at: now, updated_at: now });
}
async function setup({ selectCommerce = true, selectedCommerce = ['cross-sell-products', 'product-bundle-showcase', 'shop-the-look', 'complementary-products'], approvePreset = true, retainPresetSections = null, messages = ['Natural skincare products with approved product photography', 'People building a simple routine', 'Make approved products easy to discover', 'Warm, calm, and modern'] } = {}) {
  let tick = 0; const services = await createDashboardServices({ root, env: environment(database()), shopifyAdapter: shopifyAdapter(), clock: () => new Date(Date.parse('2026-08-01T12:00:00.000Z') + (tick++ * 1000)) });
  const registered = await services.auth.register({ email: `commerce-${crypto.randomUUID()}@example.com`, password, fullName: 'Commerce Merchant', organizationName: 'Commerce Studio', ipAddress: '127.0.0.1' });
  const project = (await services.projects.createProject({ userId: registered.user.id, input: { name: 'Commerce plan', business_name: 'Commerce Studio', country: 'MA' } })).project;
  await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
  for (const message of messages) await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message });
  await services.creativeDirector.createBrief({ userId: registered.user.id, projectId: project.id });
  await services.creativeDirector.approveBrief({ userId: registered.user.id, projectId: project.id });
  const strategyReview = await services.creativeDirector.load({ userId: registered.user.id, projectId: project.id });
  for (const recommendation of strategyReview.session.store_strategy.recommendations || []) {
    if (recommendation.requiresMerchantApproval) await services.creativeDirector.decideRecommendation({ userId: registered.user.id, projectId: project.id, recommendationPath: recommendation.id, status: 'approved' });
  }
  let strategyResult = await services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id });
  if (approvePreset) {
    strategyResult = await services.creativeDirector.approvePreset({ userId: registered.user.id, projectId: project.id, expectedVersion: strategyResult.session.preset_selection.candidate_version });
    if (retainPresetSections) {
      const stored = await services.store.findApprovedPresetRevision(strategyResult.session.preset_selection.approved_revision_id, project.id, project.organization_id);
      const testRevision = JSON.parse(JSON.stringify(stored));
      testRevision.revision_id = `apr_test_${crypto.randomUUID()}`;
      testRevision.omitted_sections = [];
      testRevision.fallback = null;
      testRevision.preset_checksum = presetChecksum({ ...testRevision, preset_checksum: undefined });
      await services.store.createApprovedPresetRevision(testRevision);
      strategyResult = { session: await services.store.updateCreativeDirector(project.id, { ...strategyResult.session, preset_selection: { ...strategyResult.session.preset_selection, approved_revision_id: testRevision.revision_id, applied_homepage_sections: retainPresetSections } }) };
    }
  }
  const connection = await services.shopify.startConnection({ userId: registered.user.id, projectId: project.id, shopDomain: 'fixture.myshopify.com' });
  const completed = await services.shopify.completeOAuthCallback({ query: callbackQuery(connection.authorization_url) });
  await services.shopify.synchronize({ userId: registered.user.id, projectId: project.id, connectionId: completed.connection.id });
  const listed = await services.shopify.listResources({ userId: registered.user.id, projectId: project.id, connectionId: completed.connection.id, resourceType: 'product' });
  const listedCollections = await services.shopify.listResources({ userId: registered.user.id, projectId: project.id, connectionId: completed.connection.id, resourceType: 'collection' });
  for (const entry of [...listed.resources, ...listedCollections.resources]) await services.shopify.decideResource({ userId: registered.user.id, projectId: project.id, resourceId: entry.resource.id, status: 'approved' });
  const selectedStrategy = selectCommerce ? {
    ...strategyResult.session.store_strategy,
    homepage: { ...strategyResult.session.store_strategy.homepage, sections: [
      ...(strategyResult.session.store_strategy.homepage?.sections || []),
      ...selectedCommerce.filter((sectionId) => sectionId !== 'complementary-products').map((sectionId) => ({ sectionId, source: 'approved_fixture_strategy' }))
    ] },
    productPage: { ...strategyResult.session.store_strategy.productPage, sections: selectedCommerce.includes('complementary-products') ? [{ sectionId: 'complementary-products', source: 'approved_fixture_strategy' }] : [] }
  } : strategyResult.session.store_strategy;
  await services.store.updateCreativeDirector(project.id, { ...strategyResult.session, store_strategy: selectedStrategy, stage: 'resources', resource_plan: { status: 'ready', fields: [], groups: [], required_assets: [], required_confirmations: [], blocker: null }, generation_context: { status: 'awaiting_configuration', approval_reference: null, approved_at: null, merchant_references: {}, shopify_resource_references: {}, asset_references: {}, completed_confirmations: [], resolved_empty_fields: [] } });
  const ready = await services.creativeDirector.updateResources({ userId: registered.user.id, projectId: project.id });
  return { services, user: registered.user, project, products: listed.resources.map((entry) => entry.resource), collections: listedCollections.resources.map((entry) => entry.resource), session: ready.session };
}

describe('commerce content-plan authoring and approval', () => {
  it('creates one immutable revision chain for all four merchant-approved commerce relationships', async () => {
    const { services, user, project, products, session } = await setup();
    expect(session.stage).toBe('content-plan');
    for (const key of ['cross_sell_products', 'product_bundle_showcase', 'shop_the_look', 'complementary_products_fallback']) expect(session.content_plan[key]).toMatchObject({ status: 'draft', candidate_version: 1, products: [] });
    const primary = await approvedImage(services, project, user, 'scene-primary'); const mobile = await approvedImage(services, project, user, 'scene-mobile');

    const crossSaved = await services.creativeDirector.saveCrossSellProductsPlan({ userId: user.id, projectId: project.id, expectedVersion: 1, products: [{ product_resource_id: products[0].id }, { product_resource_id: products[1].id }] });
    const crossIds = crossSaved.session.content_plan.cross_sell_products.products.map((item) => ({ content_id: item.content_id, placement_id: item.placement_id }));
    const crossApproved = await services.creativeDirector.approveCrossSellProductsPlan({ userId: user.id, projectId: project.id, expectedVersion: 2 });
    const bundleSaved = await services.creativeDirector.saveProductBundleShowcasePlan({ userId: user.id, projectId: project.id, expectedVersion: crossApproved.session.content_plan.product_bundle_showcase.candidate_version, products: [{ product_resource_id: products[1].id }, { product_resource_id: products[2].id }] });
    const bundleApproved = await services.creativeDirector.approveProductBundleShowcasePlan({ userId: user.id, projectId: project.id, expectedVersion: bundleSaved.session.content_plan.product_bundle_showcase.candidate_version });
    const shopSaved = await services.creativeDirector.saveShopTheLookPlan({ userId: user.id, projectId: project.id, expectedVersion: bundleApproved.session.content_plan.shop_the_look.candidate_version, products: [{ product_resource_id: products[0].id, x_percent: 25, y_percent: 40 }, { product_resource_id: products[2].id, x_percent: 70, y_percent: 62 }], scene: { scene_image_asset_id: primary.id, mobile_image_asset_id: mobile.id, image_alt_text: 'Merchant-approved fixture room scene with two selected rugs.', decorative_media: false } });
    const shopApproved = await services.creativeDirector.approveShopTheLookPlan({ userId: user.id, projectId: project.id, expectedVersion: shopSaved.session.content_plan.shop_the_look.candidate_version });
    const fallbackSaved = await services.creativeDirector.saveComplementaryProductsFallbackPlan({ userId: user.id, projectId: project.id, expectedVersion: shopApproved.session.content_plan.complementary_products_fallback.candidate_version, products: [{ product_resource_id: products[2].id }, { product_resource_id: products[3].id }] });
    const approved = await services.creativeDirector.approveComplementaryProductsFallbackPlan({ userId: user.id, projectId: project.id, expectedVersion: fallbackSaved.session.content_plan.complementary_products_fallback.candidate_version });

    expect(approved.session.stage).toBe('offer');
    const stored = await services.store.findApprovedBlockPlanRevision(approved.approved_plan.revision_id, project.id, project.organization_id);
    expect(stored.plan.compositions.map((item) => item.section_role).sort()).toEqual(['complementary_products_fallback', 'cross_sell_products', 'product_bundle_showcase', 'shop_the_look']);
    expect(stored.parent_revision_id).toBe(shopApproved.approved_plan.revision_id);
    expect(stored.plan.compositions.find((item) => item.section_role === 'cross_sell_products').block_placements.map((item) => ({ content_id: item.content_entity_id, placement_id: item.placement_id }))).toEqual(crossIds);
    expect(Object.values(stored.plan.resource_references).every((resource) => ['shopify_product', 'project_image'].includes(resource.resource_type))).toBe(true);
    expect(JSON.stringify(stored.plan)).not.toMatch(/product_handle|remote_gid|section_id|block_type|settings/);
    const snapshot = await services.store.findApprovedBlockPlanResourceSnapshot(approved.approved_plan.resource_snapshot_revision_id, project.id, project.organization_id);
    expect(Object.values(snapshot.resources).map((item) => item.runtime_value)).toEqual(expect.arrayContaining(['atlas-rug', 'cedar-rug', 'dune-rug', 'loom-care-kit']));
    const order = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'commerce-plan-revision' });
    const pinned = await services.store.findCustomThemeOrderForProject(order.order.id, project.id, project.organization_id);
    expect(pinned.approved_block_plan_revision_id).toBe(approved.approved_plan.revision_id);
    expect(pinned.approved_resource_snapshot_revision_id).toBe(approved.approved_plan.resource_snapshot_revision_id);
    await services.close();
  });

  it('rejects unselected plans, stale edits, duplicates, unsupported commerce claims, and incomplete Shop the Look evidence', async () => {
    const absent = await setup({ selectCommerce: false, approvePreset: false });
    await expect(absent.services.creativeDirector.saveCrossSellProductsPlan({ userId: absent.user.id, projectId: absent.project.id, expectedVersion: 0, products: [] })).rejects.toMatchObject({ code: 'cross_sell_products_plan_not_required' });
    await absent.services.close();

    const { services, user, project, products, session } = await setup({ approvePreset: false });
    await expect(services.creativeDirector.saveCrossSellProductsPlan({ userId: user.id, projectId: project.id, expectedVersion: 0, products: [] })).rejects.toMatchObject({ code: 'cross_sell_products_candidate_stale' });
    await expect(services.creativeDirector.saveCrossSellProductsPlan({ userId: user.id, projectId: project.id, expectedVersion: 1, products: [{ product_resource_id: products[0].id, handle: 'caller-controlled' }] })).rejects.toMatchObject({ code: 'cross_sell_products_field_unsupported' });
    const duplicate = await services.creativeDirector.saveCrossSellProductsPlan({ userId: user.id, projectId: project.id, expectedVersion: 1, products: [{ product_resource_id: products[0].id }, { product_resource_id: products[0].id }] });
    await expect(services.creativeDirector.approveCrossSellProductsPlan({ userId: user.id, projectId: project.id, expectedVersion: duplicate.session.content_plan.cross_sell_products.candidate_version })).rejects.toMatchObject({ code: 'cross_sell_products_candidate_incomplete' });
    const bundle = await services.creativeDirector.saveProductBundleShowcasePlan({ userId: user.id, projectId: project.id, expectedVersion: session.content_plan.product_bundle_showcase.candidate_version, products: [{ product_resource_id: products[1].id }] });
    await expect(services.creativeDirector.approveProductBundleShowcasePlan({ userId: user.id, projectId: project.id, expectedVersion: bundle.session.content_plan.product_bundle_showcase.candidate_version })).rejects.toMatchObject({ code: 'product_bundle_showcase_minimum_products' });
    const shop = await services.creativeDirector.saveShopTheLookPlan({ userId: user.id, projectId: project.id, expectedVersion: session.content_plan.shop_the_look.candidate_version, products: [{ product_resource_id: products[1].id, x_percent: 101, y_percent: 50 }], scene: {} });
    await expect(services.creativeDirector.approveShopTheLookPlan({ userId: user.id, projectId: project.id, expectedVersion: shop.session.content_plan.shop_the_look.candidate_version })).rejects.toMatchObject({ code: 'shop_the_look_candidate_incomplete' });
    await expect(services.creativeDirector.saveComplementaryProductsFallbackPlan({ userId: user.id, projectId: project.id, expectedVersion: session.content_plan.complementary_products_fallback.candidate_version, products: [{ product_resource_id: products[2].id, api_result: true }] })).rejects.toMatchObject({ code: 'complementary_products_fallback_field_unsupported' });
    await services.close();
  });

  it('pins Gallery, one coherent content revision, its resource snapshot, and a paid deterministic read-only package', async () => {
    const before = runtimeInventory(repositoryPaths(root).themeRoot);
    const { services, user, project, products, collections, session } = await setup({
      approvePreset: true,
      retainPresetSections: ['full-screen-hero', 'lookbook', 'story-banner', 'featured-collection', 'editorial-grid', 'newsletter'],
      selectedCommerce: ['complementary-products'],
      messages: ['Handmade wool rugs with approved product photography', 'Home owners seeking lasting materials', 'Build editorial product discovery', 'Warm and considered']
    });
    expect(session.preset_selection).toMatchObject({ status: 'approved', selected_preset_id: 'gallery' });
    expect(session.content_plan).toMatchObject({ status: 'draft', lookbook: { status: 'draft' }, complementary_products_fallback: { status: 'draft' } });
    const primary = await approvedImage(services, project, user, 'gallery-primary'); const mobile = await approvedImage(services, project, user, 'gallery-mobile');
    const gridSaved = await services.creativeDirector.saveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: session.content_plan.candidate_version, stories: [{ title: 'Rug care guides', eyebrow: 'Approved guide', excerpt: '', destination: { type: 'shopify_collection', resource_id: collections[0].id }, image_asset_id: null, image_alt_text: null }] });
    const gridApproved = await services.creativeDirector.approveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: gridSaved.session.content_plan.candidate_version });
    const lookbookSaved = await services.creativeDirector.saveLookbookPlan({ userId: user.id, projectId: project.id, expectedVersion: gridApproved.session.content_plan.lookbook.candidate_version, frames: [{ image_asset_id: primary.id, mobile_image_asset_id: mobile.id, title: 'Atlas rug', text: '', destination: { type: 'shopify_product', resource_id: products[0].id }, media_ratio: 'portrait', image_alt_text: 'Merchant-approved Atlas rug campaign frame.', accessible_label: '', decorative_media: false }] });
    const lookbookApproved = await services.creativeDirector.approveLookbookPlan({ userId: user.id, projectId: project.id, expectedVersion: lookbookSaved.session.content_plan.lookbook.candidate_version });
    const fallbackSaved = await services.creativeDirector.saveComplementaryProductsFallbackPlan({ userId: user.id, projectId: project.id, expectedVersion: lookbookApproved.session.content_plan.complementary_products_fallback.candidate_version, products: [{ product_resource_id: products[3].id }] });
    const approved = await services.creativeDirector.approveComplementaryProductsFallbackPlan({ userId: user.id, projectId: project.id, expectedVersion: fallbackSaved.session.content_plan.complementary_products_fallback.candidate_version });
    expect(approved.session.stage).toBe('offer');

    // The first-slice Store Strategy schema does not serialize optional
    // product-page section choices. The approved content revision is the
    // authoritative opt-in for this optional fallback composition; remove the
    // test-only authoring selector before the paid generation contract is made.
    const validStoreStrategy = JSON.parse(JSON.stringify(approved.session.store_strategy));
    delete validStoreStrategy.productPage.sections;
    const generationSession = await services.store.updateCreativeDirector(project.id, { ...approved.session, store_strategy: validStoreStrategy });

    const created = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'gallery-commerce-cross-layer' });
    const pending = await services.store.findCustomThemeOrderForProject(created.order.id, project.id, project.organization_id);
    expect(generationSession.content_plan.complementary_products_fallback.status).toBe('approved');
    expect(pending).toMatchObject({ payment_status: 'pending', approved_block_plan_revision_id: approved.approved_plan.revision_id, approved_resource_snapshot_revision_id: approved.approved_plan.resource_snapshot_revision_id, approved_preset_revision_id: session.preset_selection.approved_revision_id });
    const paid = await services.customThemes.confirmDevelopmentPayment({ userId: user.id, projectId: project.id, orderId: created.order.id, idempotencyKey: 'gallery-commerce-cross-layer-payment' });
    if (paid.order.generation_status !== 'ready') throw new Error(`Combined generation failed: ${JSON.stringify(paid.order)}`);
    expect(paid.order).toMatchObject({ payment_status: 'paid', generation_status: 'ready' });
    const workspace = (attempt) => path.join(root, 'output', `generation-run-order-${created.order.id.slice(4)}-attempt-${attempt}`);
    const semanticOutput = (attempt) => {
      const currentWorkspace = workspace(attempt);
      const homepage = JSON.parse(fs.readFileSync(path.join(currentWorkspace, 'theme/templates/index.json'), 'utf8'));
      const product = JSON.parse(fs.readFileSync(path.join(currentWorkspace, 'theme/templates/product.json'), 'utf8'));
      const manifest = JSON.parse(fs.readFileSync(path.join(currentWorkspace, 'manifests/generated-theme.json'), 'utf8'));
      const packageManifest = JSON.parse(fs.readFileSync(path.join(currentWorkspace, 'manifests/read-only-theme-package.json'), 'utf8'));
      const selected = (template, type) => Object.entries(template.sections).find(([, section]) => section.type === type);
      const grid = selected(homepage, 'editorial-grid')?.[1]; const lookbook = selected(homepage, 'lookbook')?.[1]; const fallback = selected(product, 'complementary-products')?.[1];
      return { homepage_order: homepage.order, grid, lookbook, fallback, block_plan: manifest.approved_block_plan_provenance, preset: manifest.approved_preset_provenance, preset_application: manifest.preset_application, operations: packageManifest.shopify_operations };
    };
    const first = semanticOutput(1);
    expect(first.grid.block_order).toHaveLength(1); expect(first.lookbook.block_order).toHaveLength(1); expect(first.fallback.block_order).toHaveLength(1);
    expect(first.fallback.blocks[first.fallback.block_order[0]].settings.product).toBe('loom-care-kit');
    expect(first.block_plan).toMatchObject({ revision_id: approved.approved_plan.revision_id, resource_snapshot_revision_id: approved.approved_plan.resource_snapshot_revision_id });
    expect(first.preset).toMatchObject({ revision_id: session.preset_selection.approved_revision_id, preset_id: 'gallery' });
    expect(first.operations).toEqual({ write_operations: false, upload: false, publish: false, required_scope: 'none' });
    expect(JSON.stringify({ grid: first.grid, lookbook: first.lookbook, fallback: first.fallback })).not.toMatch(/approval|provenance|content_entity|placement_id|semantic_/);
    const validation = JSON.parse(fs.readFileSync(path.join(workspace(1), 'reports/theme-package-validation.json'), 'utf8'));
    expect(validation).toMatchObject({ valid: true, checks: { theme_check: { status: 'passed' } } });

    const storedReady = await services.store.findCustomThemeOrderForProject(created.order.id, project.id, project.organization_id);
    await services.store.updateCustomThemeOrder(created.order.id, project.id, project.organization_id, { ...storedReady, generation_status: 'generation_failed', failure_reason: 'Fixture retry to prove pinned-input determinism.', updated_at: '2026-08-01T13:30:00.000Z' });
    const replay = await services.customThemes.retryGeneration({ userId: user.id, projectId: project.id, orderId: created.order.id });
    if (replay.order.generation_status !== 'ready') throw new Error(`Combined retry failed: ${JSON.stringify(replay.order)}`);
    expect(replay.order.generation_status).toBe('ready');
    expect(semanticOutput(2)).toEqual(first);
    const runs = await services.store.driver.all('SELECT * FROM custom_theme_generation_runs WHERE order_id = $1 ORDER BY attempt ASC', [created.order.id]);
    expect(runs.map((run) => run.attempt)).toEqual([1, 2]);
    expect(runtimeInventory(repositoryPaths(root).themeRoot)).toEqual(before);
    await services.close();
    for (const attempt of [1, 2]) {
      fs.rmSync(workspace(attempt), { recursive: true, force: true });
      fs.rmSync(path.join(root, 'output', 'preview', `generation-run-order-${created.order.id.slice(4)}-attempt-${attempt}`), { recursive: true, force: true });
      expect(fs.existsSync(workspace(attempt))).toBe(false);
    }
  }, 120000);
});
