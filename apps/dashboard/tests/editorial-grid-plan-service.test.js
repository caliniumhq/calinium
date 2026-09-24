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
const password = 'editorial-grid-plan-test-password';
const oauthSecret = 'editorial-grid-oauth-secret';
const encryptionKey = Buffer.alloc(32, 37).toString('base64url');

function database() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-editorial-grid-plan-')), 'dashboard.sqlite'); }
function environment(file) { return { NODE_ENV: 'test', CALINIUM_SQLITE_PATH: file, CALINIUM_SHOPIFY_CLIENT_ID: 'editorial-grid-client', CALINIUM_SHOPIFY_CLIENT_SECRET: oauthSecret, CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI: 'https://dashboard.example/api/shopify/oauth/callback', CALINIUM_APPLICATION_URL: 'https://dashboard.example', CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: encryptionKey, CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY_ID: 'editorial-grid-key', CALINIUM_PAYMENT_MODE: 'development_simulator', CALINIUM_PAYMENT_PROVIDER: 'development_simulator' }; }
function adapter() { return new DeterministicShopifyAdapter({ scopes: DISCOVERY_SCOPES, resources: { product: [{ id: 'gid://shopify/Product/701', title: 'Atlas wool rug', handle: 'atlas-wool-rug' }], collection: [{ id: 'gid://shopify/Collection/501', title: 'Rug care guides', handle: 'rug-care-guides', image: { url: 'https://cdn.example/rug-care.jpg', altText: 'Rug care' } }, { id: 'gid://shopify/Collection/502', title: 'Natural fibres', handle: 'natural-fibres', image: { url: 'https://cdn.example/fibres.jpg', altText: 'Natural fibres' } }, { id: 'gid://shopify/Collection/503', title: 'Rugmakers journal', handle: 'rugmakers-journal', image: { url: 'https://cdn.example/journal.jpg', altText: 'Rugmakers journal' } }], menu: [], file: [], market: [], theme: [] } }); }
function callbackQuery(url) { const parameters = new URLSearchParams({ shop: 'fixture.myshopify.com', code: 'valid-code', state: new URL(url).searchParams.get('state'), timestamp: '1785585600' }); const source = [...parameters.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join('&'); parameters.set('hmac', crypto.createHmac('sha256', oauthSecret).update(source).digest('hex')); return parameters; }
async function setup({ includeLookbook = false, approvePreset = true, messages = ['Handmade wool rugs with approved product photography', 'Home owners seeking lasting materials', 'Build editorial product discovery', 'Warm and considered'] } = {}) {
  const services = await createDashboardServices({ root, env: environment(database()), shopifyAdapter: adapter(), clock: (() => { const start = Date.parse('2026-08-01T12:00:00.000Z'); let tick = 0; return () => new Date(start + (tick++ * 1000)); })() });
  const registered = await services.auth.register({ email: `rugs-${crypto.randomUUID()}@example.com`, password, fullName: 'Rug Merchant', organizationName: 'Oak and Loom', ipAddress: '127.0.0.1' });
  const project = (await services.projects.createProject({ userId: registered.user.id, input: { name: 'Oak and Loom', business_name: 'Oak and Loom', country: 'MA' } })).project;
  await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
  for (const message of messages) await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message });
  await services.creativeDirector.createBrief({ userId: registered.user.id, projectId: project.id });
  await services.creativeDirector.approveBrief({ userId: registered.user.id, projectId: project.id });
  const strategyReview = await services.creativeDirector.load({ userId: registered.user.id, projectId: project.id });
  for (const recommendation of strategyReview.session.store_strategy.recommendations || []) {
    if (recommendation.requiresMerchantApproval) await services.creativeDirector.decideRecommendation({ userId: registered.user.id, projectId: project.id, recommendationPath: recommendation.id, status: 'approved' });
  }
  let strategy = await services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id });
  if (approvePreset) strategy = await services.creativeDirector.approvePreset({ userId: registered.user.id, projectId: project.id, expectedVersion: strategy.session.preset_selection.candidate_version });
  const connection = await services.shopify.startConnection({ userId: registered.user.id, projectId: project.id, shopDomain: 'fixture.myshopify.com' });
  const completed = await services.shopify.completeOAuthCallback({ query: callbackQuery(connection.authorization_url) });
  await services.shopify.synchronize({ userId: registered.user.id, projectId: project.id, connectionId: completed.connection.id });
  const resources = await services.shopify.listResources({ userId: registered.user.id, projectId: project.id, connectionId: completed.connection.id, resourceType: 'collection' });
  const products = await services.shopify.listResources({ userId: registered.user.id, projectId: project.id, connectionId: completed.connection.id, resourceType: 'product' });
  for (const entry of [...resources.resources, ...products.resources]) await services.shopify.decideResource({ userId: registered.user.id, projectId: project.id, resourceId: entry.resource.id, status: 'approved' });
  const sessionStrategy = includeLookbook ? strategy.session : {
    ...strategy.session,
    store_strategy: {
      ...strategy.session.store_strategy,
      homepage: {
        ...strategy.session.store_strategy.homepage,
        sections: (strategy.session.store_strategy.homepage?.sections || []).filter((section) => (section.sectionId || section.section_id || section.id) !== 'lookbook')
      }
    }
  };
  await services.store.updateCreativeDirector(project.id, {
    ...sessionStrategy,
    stage: 'resources',
    resource_plan: { status: 'ready', fields: [], groups: [], required_assets: [], required_confirmations: [], blocker: null },
    generation_context: { status: 'awaiting_configuration', approval_reference: null, approved_at: null, merchant_references: {}, shopify_resource_references: {}, asset_references: {}, completed_confirmations: [], resolved_empty_fields: [] }
  });
  const ready = await services.creativeDirector.updateResources({ userId: registered.user.id, projectId: project.id });
  return { services, user: registered.user, project, resources: resources.resources.map((entry) => entry.resource), products: products.resources.map((entry) => entry.resource), session: ready.session };
}

async function createReadyImage(services, project, user, suffix) {
  const now = new Date().toISOString();
  const checksum = crypto.createHash('sha256').update(`lookbook-${suffix}`).digest('hex');
  return services.store.createAsset({
    id: `asset-lookbook-${suffix}`, organization_id: project.organization_id, project_id: project.id, asset_type: 'lifestyle_image', display_title: `Lookbook ${suffix}`, original_filename: `${suffix}.jpg`, safe_filename: `${suffix}.jpg`, mime_type: 'image/jpeg', size_bytes: 1, checksum_sha256: checksum, storage_key: `tests/${project.id}/${suffix}.jpg`, upload_status: 'ready', source_type: 'merchant_upload', processing_state: 'ready', width: 1200, height: 1600, alt_text: `Approved ${suffix} image`, notes: null, created_by_user_id: user.id, created_at: now, updated_at: now
  });
}

describe('Editorial Grid candidate authoring and approval', () => {
  it('persists a merchant-authored candidate, creates immutable child revisions, and pins only server-resolved records', async () => {
    const { services, user, project, resources, session } = await setup();
    expect(session.stage).toBe('content-plan');
    expect(session.content_plan).toMatchObject({ status: 'draft', candidate_version: 1, stories: [] });

    const saved = await services.creativeDirector.saveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: 1, stories: [
      { title: 'Care and maintenance', eyebrow: 'Guides', excerpt: 'Approved care guidance for your rug.', destination: { type: 'shopify_collection', resource_id: resources[0].id }, image_asset_id: null, image_alt_text: null },
      { title: 'Natural fibres', eyebrow: '', excerpt: '', destination: { type: 'shopify_collection', resource_id: resources[1].id }, image_asset_id: null, image_alt_text: null }
    ] });
    expect(saved.session.content_plan).toMatchObject({ status: 'draft', candidate_version: 2 });
    const identities = saved.session.content_plan.stories.map((story) => ({ content_id: story.content_id, placement_id: story.placement_id }));
    const approved = await services.creativeDirector.approveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: 2 });
    expect(approved.session.stage).toBe('offer');
    expect(approved.session.content_plan).toMatchObject({ status: 'approved', approved_revision_id: approved.approved_plan.revision_id, approved_resource_snapshot_revision_id: approved.approved_plan.resource_snapshot_revision_id });
    const storedRevision = await services.store.findApprovedBlockPlanRevision(approved.approved_plan.revision_id, project.id, project.organization_id);
    const storedSnapshot = await services.store.findApprovedBlockPlanResourceSnapshot(approved.approved_plan.resource_snapshot_revision_id, project.id, project.organization_id);
    expect(storedRevision.plan.compositions[0].block_placements.map((placement) => placement.content_entity_id)).toEqual(identities.map((item) => item.content_id));
    expect(Object.values(storedSnapshot.resources).every((resource) => resource.approval_eligible && resource.availability_at_snapshot === 'available')).toBe(true);
    const oldOrder = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'editorial-grid-r1' });
    expect((await services.store.findCustomThemeOrderForProject(oldOrder.order.id, project.id, project.organization_id)).approved_block_plan_revision_id).toBe(approved.approved_plan.revision_id);
    await expect(services.creativeDirector.approveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: 1 })).rejects.toMatchObject({ code: 'creative_director_stage_invalid' });

    await services.creativeDirector.setStage({ userId: user.id, projectId: project.id, stage: 'content-plan' });
    const revised = await services.creativeDirector.saveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: 2, stories: [
      { content_id: identities[1].content_id, title: 'Natural fibres', eyebrow: '', excerpt: '', destination: { type: 'shopify_collection', resource_id: resources[1].id }, image_asset_id: null, image_alt_text: null },
      { content_id: identities[0].content_id, title: 'Care and maintenance', eyebrow: 'Guides', excerpt: 'Approved care guidance for your rug.', destination: { type: 'shopify_collection', resource_id: resources[0].id }, image_asset_id: null, image_alt_text: null },
      { title: 'Rugmakers journal', eyebrow: 'Stories', excerpt: '', destination: { type: 'shopify_collection', resource_id: resources[2].id }, image_asset_id: null, image_alt_text: null }
    ] });
    expect(revised.session.content_plan.stories.slice(0, 2).map((story) => story.content_id)).toEqual([identities[1].content_id, identities[0].content_id]);
    expect(revised.session.content_plan.stories[2]).toMatchObject({ content_id: expect.stringMatching(/^abpc_/), placement_id: expect.stringMatching(/^abpl_/) });
    const child = await services.creativeDirector.approveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: 3 });
    const childRevision = await services.store.findApprovedBlockPlanRevision(child.approved_plan.revision_id, project.id, project.organization_id);
    expect(childRevision.parent_revision_id).toBe(approved.approved_plan.revision_id);
    expect(childRevision.plan.compositions[0].block_placements.slice(0, 2).map((placement) => placement.content_entity_id)).toEqual([identities[1].content_id, identities[0].content_id]);
    expect((await services.store.findApprovedBlockPlanRevision(approved.approved_plan.revision_id, project.id, project.organization_id)).plan.compositions[0].block_placements.map((placement) => placement.content_entity_id)).toEqual(identities.map((item) => item.content_id));
    const transport = await services.customThemes.resolveApprovedPlanForSession({ project, session: child.session });
    expect(transport.plan_revision.revision_id).toBe(child.approved_plan.revision_id);
    const newOrder = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'editorial-grid-r2' });
    expect((await services.store.findCustomThemeOrderForProject(newOrder.order.id, project.id, project.organization_id)).approved_block_plan_revision_id).toBe(child.approved_plan.revision_id);
    expect((await services.store.findCustomThemeOrderForProject(oldOrder.order.id, project.id, project.organization_id)).approved_block_plan_revision_id).toBe(approved.approved_plan.revision_id);
    await services.creativeDirector.setStage({ userId: user.id, projectId: project.id, stage: 'content-plan' });
    const removed = await services.creativeDirector.saveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: 3, stories: [
      { content_id: identities[1].content_id, title: 'Natural fibres', eyebrow: '', excerpt: '', destination: { type: 'shopify_collection', resource_id: resources[1].id }, image_asset_id: null, image_alt_text: null }
    ] });
    const finalRevision = await services.creativeDirector.approveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: removed.session.content_plan.candidate_version });
    expect((await services.store.findApprovedBlockPlanRevision(finalRevision.approved_plan.revision_id, project.id, project.organization_id)).plan.compositions[0].block_placements).toHaveLength(1);
    await services.close();
  });

  it('rejects incomplete, duplicate, stale, and caller-substituted candidate inputs', async () => {
    const { services, user, project, resources, session } = await setup();
    await expect(services.creativeDirector.saveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: 0, stories: [] })).rejects.toMatchObject({ code: 'editorial_grid_candidate_stale' });
    const incomplete = await services.creativeDirector.saveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: 1, stories: [{ title: '', destination: { type: 'shopify_collection', resource_id: resources[0].id } }] });
    await expect(services.creativeDirector.approveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: incomplete.session.content_plan.candidate_version })).rejects.toMatchObject({ code: 'editorial_grid_candidate_incomplete' });
    const duplicate = await services.creativeDirector.saveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: incomplete.session.content_plan.candidate_version, stories: [{ title: 'One', destination: { type: 'shopify_collection', resource_id: resources[0].id } }, { title: 'Two', destination: { type: 'shopify_collection', resource_id: resources[0].id } }] });
    await expect(services.creativeDirector.approveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: duplicate.session.content_plan.candidate_version })).rejects.toMatchObject({ code: 'editorial_grid_candidate_incomplete' });
    await expect(services.customThemes.resolveApprovedPlanForSession({ project, session, approvedBlockPlanRevisionId: 'abpr_forged' })).rejects.toMatchObject({ code: 'content_plan_approval_required' });
    await services.close();
  });
});

describe('Lookbook candidate authoring and approval', () => {
  it('creates a combined immutable revision after independently reviewed Editorial Grid and Lookbook plans', async () => {
    const { services, user, project, resources, products, session } = await setup({ includeLookbook: true });
    expect(session.content_plan.lookbook).toMatchObject({ status: 'draft', candidate_version: 1, frames: [] });
    const primary = await createReadyImage(services, project, user, 'primary');
    const mobile = await createReadyImage(services, project, user, 'mobile');
    const savedGrid = await services.creativeDirector.saveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: 1, stories: [{ title: 'Care and maintenance', eyebrow: '', excerpt: '', destination: { type: 'shopify_collection', resource_id: resources[0].id }, image_asset_id: null, image_alt_text: null }] });
    const gridApproved = await services.creativeDirector.approveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: savedGrid.session.content_plan.candidate_version });
    expect(gridApproved.session.stage).toBe('content-plan');
    expect(gridApproved.session.content_plan.lookbook.status).toBe('draft');
    const saved = await services.creativeDirector.saveLookbookPlan({ userId: user.id, projectId: project.id, expectedVersion: gridApproved.session.content_plan.lookbook.candidate_version, frames: [
      { image_asset_id: primary.id, mobile_image_asset_id: mobile.id, title: 'Atlas wool rug', text: 'Approved frame text.', destination: { type: 'shopify_product', resource_id: products[0].id }, media_ratio: 'portrait', image_alt_text: 'Approved Atlas wool rug image.', accessible_label: '', decorative_media: false },
      { image_asset_id: mobile.id, mobile_image_asset_id: null, title: 'Care and longevity', text: '', destination: { type: 'shopify_collection', resource_id: resources[1].id }, media_ratio: 'landscape', image_alt_text: 'Approved care image.', accessible_label: '', decorative_media: false }
    ] });
    expect(saved.session.content_plan.lookbook.frames).toHaveLength(2);
    const ids = saved.session.content_plan.lookbook.frames.map((frame) => ({ content_id: frame.content_id, placement_id: frame.placement_id }));
    const approved = await services.creativeDirector.approveLookbookPlan({ userId: user.id, projectId: project.id, expectedVersion: saved.session.content_plan.lookbook.candidate_version });
    expect(approved.session.stage).toBe('offer');
    expect(approved.session.content_plan.lookbook.status).toBe('approved');
    const revision = await services.store.findApprovedBlockPlanRevision(approved.approved_plan.revision_id, project.id, project.organization_id);
    expect(revision.parent_revision_id).toBe(gridApproved.approved_plan.revision_id);
    expect(revision.plan.compositions.map((composition) => composition.section_role).sort()).toEqual(['editorial_discovery_grid', 'editorial_lookbook']);
    const lookbook = revision.plan.compositions.find((composition) => composition.section_role === 'editorial_lookbook');
    expect(lookbook.block_placements.map((placement) => placement.content_entity_id)).toEqual(ids.map((item) => item.content_id));
    const oldOrder = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'lookbook-r1' });
    expect(oldOrder.created).toBe(true);
    await services.creativeDirector.setStage({ userId: user.id, projectId: project.id, stage: 'content-plan' });
    const revised = await services.creativeDirector.saveLookbookPlan({ userId: user.id, projectId: project.id, expectedVersion: approved.session.content_plan.lookbook.candidate_version, frames: [
      { content_id: ids[1].content_id, image_asset_id: mobile.id, mobile_image_asset_id: null, title: 'Care and longevity', text: '', destination: { type: 'shopify_collection', resource_id: resources[1].id }, media_ratio: 'landscape', image_alt_text: 'Approved care image.', accessible_label: '', decorative_media: false },
      { content_id: ids[0].content_id, image_asset_id: primary.id, mobile_image_asset_id: mobile.id, title: 'Atlas wool rug revised', text: 'Approved revised frame text.', destination: { type: 'shopify_product', resource_id: products[0].id }, media_ratio: 'portrait', image_alt_text: 'Approved Atlas wool rug image.', accessible_label: '', decorative_media: false }
    ] });
    expect(revised.session.content_plan.lookbook.frames.map((frame) => frame.content_id)).toEqual([ids[1].content_id, ids[0].content_id]);
    const child = await services.creativeDirector.approveLookbookPlan({ userId: user.id, projectId: project.id, expectedVersion: revised.session.content_plan.lookbook.candidate_version });
    const childRevision = await services.store.findApprovedBlockPlanRevision(child.approved_plan.revision_id, project.id, project.organization_id);
    expect(childRevision.parent_revision_id).toBe(approved.approved_plan.revision_id);
    expect((await services.store.findCustomThemeOrderForProject(oldOrder.order.id, project.id, project.organization_id)).approved_block_plan_revision_id).toBe(approved.approved_plan.revision_id);
    const newOrder = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'lookbook-r2' });
    expect((await services.store.findCustomThemeOrderForProject(newOrder.order.id, project.id, project.organization_id)).approved_block_plan_revision_id).toBe(child.approved_plan.revision_id);

    // Reapproving Editorial Grid after Lookbook approval must create a child
    // combined plan—not silently drop the independently approved frames.
    await services.creativeDirector.setStage({ userId: user.id, projectId: project.id, stage: 'content-plan' });
    const editorialStory = child.session.content_plan.stories[0];
    const revisedGrid = await services.creativeDirector.saveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: child.session.content_plan.candidate_version, stories: [
      { content_id: editorialStory.content_id, title: 'Care and maintenance revised', eyebrow: '', excerpt: '', destination: { type: 'shopify_collection', resource_id: resources[0].id }, image_asset_id: null, image_alt_text: null }
    ] });
    const revisedCombined = await services.creativeDirector.approveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: revisedGrid.session.content_plan.candidate_version });
    const revisedCombinedPlan = await services.store.findApprovedBlockPlanRevision(revisedCombined.approved_plan.revision_id, project.id, project.organization_id);
    expect(revisedCombinedPlan.parent_revision_id).toBe(child.approved_plan.revision_id);
    expect(revisedCombinedPlan.plan.compositions.map((composition) => composition.section_role).sort()).toEqual(['editorial_discovery_grid', 'editorial_lookbook']);
    expect(revisedCombinedPlan.plan.compositions.find((composition) => composition.section_role === 'editorial_lookbook').block_placements.map((placement) => placement.content_entity_id)).toEqual([ids[1].content_id, ids[0].content_id]);
    await services.close();
  });

  it('rejects unsupported, incomplete, duplicate, stale, and unapproved Lookbook inputs', async () => {
    const bypass = await setup();
    await expect(bypass.services.creativeDirector.saveLookbookPlan({ userId: bypass.user.id, projectId: bypass.project.id, expectedVersion: 0, frames: [] })).rejects.toMatchObject({ code: 'lookbook_plan_not_required' });
    await bypass.services.close();

    const { services, user, project, resources, session } = await setup({ includeLookbook: true });
    const image = await createReadyImage(services, project, user, 'validation');
    await expect(services.creativeDirector.saveLookbookPlan({ userId: user.id, projectId: project.id, expectedVersion: session.content_plan.lookbook.candidate_version, frames: [{ image_asset_id: image.id, title: 'Unsupported', text: '', destination: { type: 'external_url', resource_id: 'https://invalid.example' }, media_ratio: 'portrait', image_alt_text: 'Image', accessible_label: '', decorative_media: false }] })).rejects.toMatchObject({ code: 'lookbook_destination_unsupported' });
    const savedGrid = await services.creativeDirector.saveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: session.content_plan.candidate_version, stories: [{ title: 'Care', destination: { type: 'shopify_collection', resource_id: resources[0].id } }] });
    await services.creativeDirector.approveEditorialGridPlan({ userId: user.id, projectId: project.id, expectedVersion: savedGrid.session.content_plan.candidate_version });
    const incomplete = await services.creativeDirector.saveLookbookPlan({ userId: user.id, projectId: project.id, expectedVersion: savedGrid.session.content_plan.lookbook.candidate_version, frames: [{ image_asset_id: image.id, title: '', text: '', destination: { type: 'shopify_collection', resource_id: resources[0].id }, media_ratio: 'portrait', image_alt_text: 'Image', accessible_label: '', decorative_media: false }] });
    await expect(services.creativeDirector.approveLookbookPlan({ userId: user.id, projectId: project.id, expectedVersion: incomplete.session.content_plan.lookbook.candidate_version })).rejects.toMatchObject({ code: 'lookbook_candidate_incomplete' });
    const duplicate = await services.creativeDirector.saveLookbookPlan({ userId: user.id, projectId: project.id, expectedVersion: incomplete.session.content_plan.lookbook.candidate_version, frames: [{ image_asset_id: image.id, title: 'One', text: '', destination: { type: 'shopify_collection', resource_id: resources[0].id }, media_ratio: 'portrait', image_alt_text: 'Image', accessible_label: '', decorative_media: false }, { image_asset_id: image.id, title: 'Two', text: '', destination: { type: 'shopify_collection', resource_id: resources[0].id }, media_ratio: 'portrait', image_alt_text: 'Image', accessible_label: '', decorative_media: false }] });
    await expect(services.creativeDirector.approveLookbookPlan({ userId: user.id, projectId: project.id, expectedVersion: duplicate.session.content_plan.lookbook.candidate_version })).rejects.toMatchObject({ code: 'lookbook_candidate_incomplete' });
    await expect(services.creativeDirector.saveLookbookPlan({ userId: user.id, projectId: project.id, expectedVersion: 1, frames: [] })).rejects.toMatchObject({ code: 'lookbook_candidate_stale' });
    const unavailable = await services.creativeDirector.saveLookbookPlan({ userId: user.id, projectId: project.id, expectedVersion: duplicate.session.content_plan.lookbook.candidate_version, frames: [{ image_asset_id: 'asset-cross-project', title: 'No', text: '', destination: { type: null, resource_id: null }, media_ratio: 'portrait', image_alt_text: 'No', accessible_label: '', decorative_media: false }] });
    await expect(services.creativeDirector.approveLookbookPlan({ userId: user.id, projectId: project.id, expectedVersion: unavailable.session.content_plan.lookbook.candidate_version })).rejects.toMatchObject({ code: 'lookbook_image_unavailable' });
    await services.close();
  });
});

describe('Craftsmanship candidate authoring and approval', () => {
  it('preserves merchant-approved craft evidence through immutable child revisions and paid-order pinning', async () => {
    const { services, user, project, session } = await setup({
      messages: ['Leather travel bags and small leather goods with approved product photography', 'Considered travellers who value the story behind a piece', 'Strengthen luxury positioning and collection discovery', 'Refined, considered, and warm']
    });
    expect(session.store_strategy.homepage.sections.map((section) => section.section_id || section.sectionId || section.id)).toContain('craftsmanship');
    expect(session.content_plan.craftsmanship).toMatchObject({ status: 'draft', candidate_version: 1, steps: [] });
    const initialImage = await createReadyImage(services, project, user, 'craft-initial');
    const replacementImage = await createReadyImage(services, project, user, 'craft-replacement');
    const saved = await services.creativeDirector.saveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: 1, steps: [
      { title: 'Edge finishing', text: 'Merchant-approved evidence about the approved edge-finishing operation.', craft_icon: 'settings', image_asset_id: initialImage.id, image_alt_text: 'Approved close detail of the edge-finishing operation.', decorative_media: false, evidence_note: 'Merchant confirmation: the named edge-finishing operation is used for this collection.' },
      { title: 'Hardware check', text: '', craft_icon: 'diamond', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation: hardware is checked as a named operation.' }
    ] });
    const savedSteps = saved.session.content_plan.craftsmanship.steps;
    const identities = savedSteps.map((step) => ({ content_id: step.content_id, placement_id: step.placement_id }));
    expect(saved.session.content_plan.craftsmanship.candidate_version).toBe(2);
    const resumed = await services.creativeDirector.start({ userId: user.id, projectId: project.id });
    expect(resumed.resumed).toBe(true);
    expect(resumed.session.content_plan.craftsmanship.steps.map((step) => step.content_id)).toEqual(identities.map((item) => item.content_id));
    const approved = await services.creativeDirector.approveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: 2 });
    expect(approved.session.stage).toBe('offer');
    expect(approved.session.content_plan.craftsmanship).toMatchObject({ status: 'approved', warnings: [] });
    const firstRevision = await services.store.findApprovedBlockPlanRevision(approved.approved_plan.revision_id, project.id, project.organization_id);
    const firstCraftsmanship = firstRevision.plan.compositions.find((composition) => composition.section_role === 'craftsmanship_evidence');
    expect(firstCraftsmanship.block_placements.map((placement) => placement.content_entity_id)).toEqual(identities.map((item) => item.content_id));
    expect(Object.values(firstRevision.plan.content_entities).every((entity) => entity.content_type === 'craftsmanship_evidence')).toBe(true);
    const oldOrder = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'craftsmanship-r1' });
    expect((await services.store.findCustomThemeOrderForProject(oldOrder.order.id, project.id, project.organization_id)).approved_block_plan_revision_id).toBe(approved.approved_plan.revision_id);

    await services.creativeDirector.setStage({ userId: user.id, projectId: project.id, stage: 'content-plan' });
    const revised = await services.creativeDirector.saveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: 2, steps: [
      { content_id: identities[1].content_id, title: 'Hardware check', text: 'Merchant-approved correction for the same hardware check.', craft_icon: 'diamond', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation: hardware is checked as a named operation.' },
      { content_id: identities[0].content_id, title: 'Edge finishing', text: 'Merchant-approved correction for the same edge-finishing operation.', craft_icon: 'settings', image_asset_id: replacementImage.id, image_alt_text: 'Approved replacement close detail of the edge-finishing operation.', decorative_media: false, evidence_note: 'Merchant confirmation: the named edge-finishing operation is used for this collection.' },
      { title: 'Final inspection', text: '', craft_icon: 'sparkle', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation: final inspection is a named operation.' }
    ] });
    expect(revised.session.content_plan.craftsmanship.steps.slice(0, 2).map((step) => step.content_id)).toEqual([identities[1].content_id, identities[0].content_id]);
    expect(revised.session.content_plan.craftsmanship.steps[2]).toMatchObject({ content_id: expect.stringMatching(/^abpc_/), placement_id: expect.stringMatching(/^abpl_/) });
    const child = await services.creativeDirector.approveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: 3 });
    const childRevision = await services.store.findApprovedBlockPlanRevision(child.approved_plan.revision_id, project.id, project.organization_id);
    expect(childRevision.parent_revision_id).toBe(approved.approved_plan.revision_id);
    const childCraftsmanship = childRevision.plan.compositions.find((composition) => composition.section_role === 'craftsmanship_evidence');
    expect(childCraftsmanship.block_placements.slice(0, 2).map((placement) => placement.content_entity_id)).toEqual([identities[1].content_id, identities[0].content_id]);
    expect((await services.store.findCustomThemeOrderForProject(oldOrder.order.id, project.id, project.organization_id)).approved_block_plan_revision_id).toBe(approved.approved_plan.revision_id);
    const newOrder = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'craftsmanship-r2' });
    expect((await services.store.findCustomThemeOrderForProject(newOrder.order.id, project.id, project.organization_id)).approved_block_plan_revision_id).toBe(child.approved_plan.revision_id);

    await services.creativeDirector.setStage({ userId: user.id, projectId: project.id, stage: 'content-plan' });
    const removed = await services.creativeDirector.saveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: 3, steps: [
      { content_id: identities[1].content_id, title: 'Hardware check', text: '', craft_icon: 'diamond', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation: hardware is checked as a named operation.' }
    ] });
    const finalRevision = await services.creativeDirector.approveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: removed.session.content_plan.craftsmanship.candidate_version });
    const finalPlan = await services.store.findApprovedBlockPlanRevision(finalRevision.approved_plan.revision_id, project.id, project.organization_id);
    expect(finalPlan.plan.compositions.find((composition) => composition.section_role === 'craftsmanship_evidence').block_placements).toHaveLength(1);
    await services.close();
  });

  it('rejects non-required, incomplete, duplicate, stale, cross-project, and caller-substituted Craftsmanship inputs', async () => {
    const bypass = await setup();
    await expect(bypass.services.creativeDirector.saveCraftsmanshipPlan({ userId: bypass.user.id, projectId: bypass.project.id, expectedVersion: 0, steps: [] })).rejects.toMatchObject({ code: 'craftsmanship_plan_not_required' });
    await bypass.services.close();

    const { services, user, project, session } = await setup({
      messages: ['Leather travel bags and small leather goods with approved product photography', 'Considered travellers who value the story behind a piece', 'Strengthen luxury positioning and collection discovery', 'Refined, considered, and warm']
    });
    const version = session.content_plan.craftsmanship.candidate_version;
    await expect(services.creativeDirector.saveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: version, steps: [{ title: 'Unsupported icon', text: '', craft_icon: 'unsupported', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation.' }] })).rejects.toMatchObject({ code: 'craftsmanship_icon_unsupported' });
    await expect(services.creativeDirector.saveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: version, steps: [{ title: 'Unsupported video', text: '', craft_icon: 'sparkle', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation.', video_asset_id: 'asset_video' }] })).rejects.toMatchObject({ code: 'craftsmanship_step_field_unsupported' });
    const incomplete = await services.creativeDirector.saveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: version, steps: [{ title: '', text: '', craft_icon: 'sparkle', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: '' }] });
    await expect(services.creativeDirector.approveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: incomplete.session.content_plan.craftsmanship.candidate_version })).rejects.toMatchObject({ code: 'craftsmanship_candidate_incomplete' });
    const duplicate = await services.creativeDirector.saveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: incomplete.session.content_plan.craftsmanship.candidate_version, steps: [
      { title: 'Edge finishing', text: '', craft_icon: 'settings', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation one.' },
      { title: 'Edge finishing', text: '', craft_icon: 'diamond', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation two.' }
    ] });
    await expect(services.creativeDirector.approveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: duplicate.session.content_plan.craftsmanship.candidate_version })).rejects.toMatchObject({ code: 'craftsmanship_candidate_incomplete' });
    await expect(services.creativeDirector.saveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: version, steps: [] })).rejects.toMatchObject({ code: 'craftsmanship_candidate_stale' });
    const unavailable = await services.creativeDirector.saveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: duplicate.session.content_plan.craftsmanship.candidate_version, steps: [{ title: 'Cross-project image', text: '', craft_icon: 'sparkle', image_asset_id: 'asset-cross-project', image_alt_text: 'No image access.', decorative_media: false, evidence_note: 'Merchant confirmation.' }] });
    await expect(services.creativeDirector.approveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: unavailable.session.content_plan.craftsmanship.candidate_version })).rejects.toMatchObject({ code: 'craftsmanship_image_unavailable' });
    await expect(services.creativeDirector.saveCraftsmanshipPlan({ userId: user.id, projectId: project.id, expectedVersion: unavailable.session.content_plan.craftsmanship.candidate_version, steps: [{ content_id: 'abpc_forged', title: 'Forged identity', text: '', craft_icon: 'sparkle', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation.' }] })).rejects.toMatchObject({ code: 'craftsmanship_step_identity_invalid' });
    await services.close();
  });
});

describe('Manufacturing Process candidate authoring and approval', () => {
  const foodMessages = ['Small-batch pantry goods and food and beverage gifts', 'Ingredient-conscious shoppers who want product and process context', 'Help shoppers understand verified process stages and explore pantry collections', 'Warm, considered, and grounded'];

  it('preserves merchant-confirmed ordered stages through immutable revisions and blocks purchase without a compatible approved preset', async () => {
    const { services, user, project, session } = await setup({ approvePreset: false, messages: foodMessages });
    expect(session.store_strategy.homepage.sections.map((section) => section.section_id || section.sectionId || section.id)).toContain('manufacturing-process');
    expect(session.content_plan.manufacturing_process).toMatchObject({ status: 'draft', candidate_version: 1, steps: [] });
    const initialImage = await createReadyImage(services, project, user, 'process-initial');
    const replacementImage = await createReadyImage(services, project, user, 'process-replacement');
    const saved = await services.creativeDirector.saveManufacturingProcessPlan({ userId: user.id, projectId: project.id, expectedVersion: 1, steps: [
      { title: 'Preparation', text: 'Merchant-confirmed fixture explanation of the preparation stage.', process_icon: 'settings', image_asset_id: initialImage.id, image_alt_text: 'Approved fixture image for the preparation stage.', decorative_media: false, evidence_note: 'Merchant confirmation: Preparation is an approved ordered stage for this fixture-only plan.' },
      { title: 'Packing', text: '', process_icon: 'package', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation: Packing is an approved ordered stage for this fixture-only plan.' }
    ] });
    const identities = saved.session.content_plan.manufacturing_process.steps.map((step) => ({ content_id: step.content_id, placement_id: step.placement_id }));
    expect(saved.session.content_plan.manufacturing_process.steps.map((step) => step.order)).toEqual([1, 2]);
    const resumed = await services.creativeDirector.start({ userId: user.id, projectId: project.id });
    expect(resumed.resumed).toBe(true);
    expect(resumed.session.content_plan.manufacturing_process.steps.map((step) => step.content_id)).toEqual(identities.map((item) => item.content_id));
    const approved = await services.creativeDirector.approveManufacturingProcessPlan({ userId: user.id, projectId: project.id, expectedVersion: 2 });
    expect(approved.session.stage).toBe('offer');
    const firstRevision = await services.store.findApprovedBlockPlanRevision(approved.approved_plan.revision_id, project.id, project.organization_id);
    const firstProcess = firstRevision.plan.compositions.find((composition) => composition.section_role === 'manufacturing_process');
    expect(firstProcess.block_placements.map((placement) => placement.content_entity_id)).toEqual(identities.map((item) => item.content_id));
    expect(Object.values(firstRevision.plan.content_entities).every((entity) => entity.content_type === 'manufacturing_process_stage')).toBe(true);
    const oldOrder = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'manufacturing-process-r1' });
    expect(oldOrder.created).toBe(false);
    expect(oldOrder.eligibility.blocked.map((item) => item.id)).toContain('preset_approval');

    await services.creativeDirector.setStage({ userId: user.id, projectId: project.id, stage: 'content-plan' });
    const revised = await services.creativeDirector.saveManufacturingProcessPlan({ userId: user.id, projectId: project.id, expectedVersion: 2, steps: [
      { content_id: identities[1].content_id, title: 'Packing', text: 'Merchant-confirmed correction for the same packing stage.', process_icon: 'package', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation: Packing is an approved ordered stage for this fixture-only plan.' },
      { content_id: identities[0].content_id, title: 'Preparation', text: 'Merchant-confirmed correction for the same preparation stage.', process_icon: 'settings', image_asset_id: replacementImage.id, image_alt_text: 'Approved replacement image for the preparation stage.', decorative_media: false, evidence_note: 'Merchant confirmation: Preparation is an approved ordered stage for this fixture-only plan.' },
      { title: 'Dispatch', text: '', process_icon: 'check', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation: Dispatch is an approved ordered stage for this fixture-only plan.' }
    ] });
    expect(revised.session.content_plan.manufacturing_process.steps.slice(0, 2).map((step) => step.content_id)).toEqual([identities[1].content_id, identities[0].content_id]);
    expect(revised.session.content_plan.manufacturing_process.steps[2]).toMatchObject({ content_id: expect.stringMatching(/^abpc_/), placement_id: expect.stringMatching(/^abpl_/) });
    const child = await services.creativeDirector.approveManufacturingProcessPlan({ userId: user.id, projectId: project.id, expectedVersion: 3 });
    const childRevision = await services.store.findApprovedBlockPlanRevision(child.approved_plan.revision_id, project.id, project.organization_id);
    expect(childRevision.parent_revision_id).toBe(approved.approved_plan.revision_id);
    expect(childRevision.plan.compositions.find((composition) => composition.section_role === 'manufacturing_process').block_placements.slice(0, 2).map((placement) => placement.content_entity_id)).toEqual([identities[1].content_id, identities[0].content_id]);
    const newOrder = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'manufacturing-process-r2' });
    expect(newOrder.created).toBe(false);
    expect(newOrder.eligibility.blocked.map((item) => item.id)).toContain('preset_approval');
    await services.close();
  });

  it('rejects incomplete, unsupported, stale, cross-project, and caller-substituted Manufacturing Process inputs', async () => {
    const bypass = await setup();
    await expect(bypass.services.creativeDirector.saveManufacturingProcessPlan({ userId: bypass.user.id, projectId: bypass.project.id, expectedVersion: 0, steps: [] })).rejects.toMatchObject({ code: 'manufacturing_process_plan_not_required' });
    await bypass.services.close();

    const { services, user, project, session } = await setup({ approvePreset: false, messages: foodMessages });
    const version = session.content_plan.manufacturing_process.candidate_version;
    await expect(services.creativeDirector.saveManufacturingProcessPlan({ userId: user.id, projectId: project.id, expectedVersion: version, steps: [{ title: 'Unsupported icon', text: '', process_icon: 'unsupported', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation.' }] })).rejects.toMatchObject({ code: 'manufacturing_process_icon_unsupported' });
    await expect(services.creativeDirector.saveManufacturingProcessPlan({ userId: user.id, projectId: project.id, expectedVersion: version, steps: [{ title: 'Unsupported duration', text: '', process_icon: 'none', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation.', duration: 'One day' }] })).rejects.toMatchObject({ code: 'manufacturing_process_step_field_unsupported' });
    const incomplete = await services.creativeDirector.saveManufacturingProcessPlan({ userId: user.id, projectId: project.id, expectedVersion: version, steps: [{ title: 'Only stage', text: '', process_icon: 'none', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation.' }] });
    await expect(services.creativeDirector.approveManufacturingProcessPlan({ userId: user.id, projectId: project.id, expectedVersion: incomplete.session.content_plan.manufacturing_process.candidate_version })).rejects.toMatchObject({ code: 'manufacturing_process_stage_minimum' });
    const duplicate = await services.creativeDirector.saveManufacturingProcessPlan({ userId: user.id, projectId: project.id, expectedVersion: incomplete.session.content_plan.manufacturing_process.candidate_version, steps: [
      { title: 'Same stage', text: '', process_icon: 'none', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation one.' },
      { title: 'Same stage', text: '', process_icon: 'none', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation two.' }
    ] });
    await expect(services.creativeDirector.approveManufacturingProcessPlan({ userId: user.id, projectId: project.id, expectedVersion: duplicate.session.content_plan.manufacturing_process.candidate_version })).rejects.toMatchObject({ code: 'manufacturing_process_candidate_incomplete' });
    await expect(services.creativeDirector.saveManufacturingProcessPlan({ userId: user.id, projectId: project.id, expectedVersion: version, steps: [] })).rejects.toMatchObject({ code: 'manufacturing_process_candidate_stale' });
    const unavailable = await services.creativeDirector.saveManufacturingProcessPlan({ userId: user.id, projectId: project.id, expectedVersion: duplicate.session.content_plan.manufacturing_process.candidate_version, steps: [
      { title: 'Preparation', text: '', process_icon: 'none', image_asset_id: 'asset-cross-project', image_alt_text: 'No image access.', decorative_media: false, evidence_note: 'Merchant confirmation.' },
      { title: 'Packing', text: '', process_icon: 'none', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation.' }
    ] });
    await expect(services.creativeDirector.approveManufacturingProcessPlan({ userId: user.id, projectId: project.id, expectedVersion: unavailable.session.content_plan.manufacturing_process.candidate_version })).rejects.toMatchObject({ code: 'manufacturing_process_image_unavailable' });
    await expect(services.creativeDirector.saveManufacturingProcessPlan({ userId: user.id, projectId: project.id, expectedVersion: unavailable.session.content_plan.manufacturing_process.candidate_version, steps: [{ content_id: 'abpc_forged', title: 'Forged', text: '', process_icon: 'none', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation.' }] })).rejects.toMatchObject({ code: 'manufacturing_process_step_identity_invalid' });
    await services.close();
  });
});

describe('remaining evidence-plan candidate authoring and approval', () => {
  it('keeps four independently reviewed evidence compositions in one immutable approved revision', async () => {
    const { services, user, project, session } = await setup();
    const evidenceSections = ['brand-timeline', 'sustainability', 'team', 'awards-certifications'].map((section_id, index) => ({ section_id, instance_id: `homepage-${section_id}`, priority: index + 1 }));
    await services.store.updateCreativeDirector(project.id, {
      ...session,
      stage: 'content-plan',
      store_strategy: { ...session.store_strategy, homepage: { ...session.store_strategy.homepage, sections: evidenceSections } },
      content_plan: { ...session.content_plan, status: 'draft', candidate_version: 1 },
      generation_context: { ...session.generation_context, status: 'ready_for_generation' }
    });
    const timeline = await services.creativeDirector.saveBrandTimelinePlan({ userId: user.id, projectId: project.id, expectedVersion: 1, milestones: [
      { date: '2014', title: 'Studio founded', text: 'Merchant-confirmed fixture milestone.', timeline_icon: 'calendar', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation of the 2014 founding milestone.' },
      { date: '2019', title: 'First collection', text: '', timeline_icon: 'star', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation of the first collection milestone.' }
    ] });
    const sustainability = await services.creativeDirector.saveSustainabilityPlan({ userId: user.id, projectId: project.id, expectedVersion: timeline.session.content_plan.sustainability.candidate_version, initiatives: [
      { title: 'Packaging review', text: 'Merchant-confirmed fixture packaging practice.', initiative_icon: 'recycle', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant evidence record for this specific packaging practice.' }
    ] });
    const team = await services.creativeDirector.saveTeamPlan({ userId: user.id, projectId: project.id, expectedVersion: sustainability.session.content_plan.team.candidate_version, members: [
      { name: 'Riley Morgan', role: 'Studio lead', bio: 'Merchant-approved fixture biography.', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant confirmation of name, role, and biography.' }
    ] });
    const recognitions = await services.creativeDirector.saveAwardsCertificationsPlan({ userId: user.id, projectId: project.id, expectedVersion: team.session.content_plan.awards_certifications.candidate_version, recognitions: [
      { kind: 'award', title: 'Fixture design award', issuer: 'Fixture jury', year: '2025', text: '', award_icon: 'award', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant-provided verification record for this fixture award.' },
      { kind: 'certification', title: 'Fixture credential', issuer: 'Fixture verifier', year: '', text: '', award_icon: 'certificate', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Merchant-provided verification record for this fixture credential.' }
    ] });
    const timelineApproved = await services.creativeDirector.approveBrandTimelinePlan({ userId: user.id, projectId: project.id, expectedVersion: recognitions.session.content_plan.brand_timeline.candidate_version });
    expect(timelineApproved.session.stage).toBe('content-plan');
    const sustainabilityApproved = await services.creativeDirector.approveSustainabilityPlan({ userId: user.id, projectId: project.id, expectedVersion: timelineApproved.session.content_plan.sustainability.candidate_version });
    const teamApproved = await services.creativeDirector.approveTeamPlan({ userId: user.id, projectId: project.id, expectedVersion: sustainabilityApproved.session.content_plan.team.candidate_version });
    const approved = await services.creativeDirector.approveAwardsCertificationsPlan({ userId: user.id, projectId: project.id, expectedVersion: teamApproved.session.content_plan.awards_certifications.candidate_version });
    expect(approved.session.stage).toBe('offer');
    const revision = await services.store.findApprovedBlockPlanRevision(approved.approved_plan.revision_id, project.id, project.organization_id);
    expect(revision.plan.compositions.map((composition) => composition.section_role).sort()).toEqual(['brand_timeline', 'recognition_evidence', 'sustainability_evidence', 'team_directory']);
    expect(revision.plan.compositions.find((composition) => composition.section_role === 'brand_timeline').block_placements).toHaveLength(2);
    expect(revision.plan.compositions.find((composition) => composition.section_role === 'recognition_evidence').block_placements).toHaveLength(2);
    const order = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'remaining-evidence-r1' });
    expect((await services.store.findCustomThemeOrderForProject(order.order.id, project.id, project.organization_id)).approved_block_plan_revision_id).toBe(approved.approved_plan.revision_id);
    await services.creativeDirector.setStage({ userId: user.id, projectId: project.id, stage: 'content-plan' });
    await expect(services.creativeDirector.saveTeamPlan({ userId: user.id, projectId: project.id, expectedVersion: approved.session.content_plan.team.candidate_version, members: [{ name: 'Riley Morgan', role: 'Studio lead', bio: '', image_asset_id: null, image_alt_text: null, decorative_media: false, evidence_note: 'Approved fact.', section_id: 'forbidden' }] })).rejects.toMatchObject({ code: 'team_item_field_unsupported' });
    await services.close();
  });
});
