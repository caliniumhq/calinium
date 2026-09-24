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
const password = 'correct-horse-battery-staple';
const oauthSecret = 'recommended-resources-oauth-secret';
const encryptionKey = Buffer.alloc(32, 41).toString('base64url');
function database() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-resource-set-')), 'dashboard.sqlite'); }
function clockFactory() { let tick = 0; const start = Date.parse('2026-08-09T16:00:00.000Z'); return () => new Date(start + (tick++ * 1000)); }
function environment(filename) {
  return {
    CALINIUM_SQLITE_PATH: filename,
    CALINIUM_SHOPIFY_CLIENT_ID: 'recommended-resources-client',
    CALINIUM_SHOPIFY_CLIENT_SECRET: oauthSecret,
    CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI: 'https://dashboard.example/api/shopify/oauth/callback',
    CALINIUM_APPLICATION_URL: 'https://dashboard.example',
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: encryptionKey
  };
}
function fixtureResources() {
  return {
    product: [
      { id: 'gid://shopify/Product/1', title: 'Nocturne Travel Bag', handle: 'nocturne', status: 'ACTIVE', updatedAt: '2026-08-01T00:00:00Z', featuredMedia: { preview: { image: { url: 'https://cdn.shopify.com/s/files/1/files/nocturne.jpg' } } }, variants: { nodes: [] }, media: { nodes: [{ id: 'gid://shopify/MediaImage/1', alt: 'Black leather travel bag', mediaContentType: 'IMAGE', preview: { image: { url: 'https://cdn.shopify.com/s/files/1/files/nocturne.jpg' } } }] } },
      { id: 'gid://shopify/Product/2', title: 'Weekender', handle: 'weekender', status: 'ACTIVE', updatedAt: '2026-08-01T00:00:00Z', variants: { nodes: [] }, media: { nodes: [] } },
      { id: 'gid://shopify/Product/3', title: 'Archived Sample', handle: 'archived', status: 'DRAFT', updatedAt: '2026-08-01T00:00:00Z', variants: { nodes: [] }, media: { nodes: [] } }
    ],
    collection: [{ id: 'gid://shopify/Collection/1', title: 'Travel Bags', handle: 'travel-bags', updatedAt: '2026-08-01T00:00:00Z' }],
    menu: [{ id: 'gid://shopify/Menu/1', title: 'Main menu', handle: 'main-menu', items: [{ title: 'Shop', type: 'COLLECTION', url: '/collections/travel-bags' }] }],
    file: [
      { id: 'gid://shopify/MediaImage/2', alt: 'LEGACY_EXAMPLE wordmark', filename: 'logo.png', preview: { image: { url: 'https://cdn.shopify.com/s/files/1/files/logo.png' } }, updatedAt: '2026-08-01T00:00:00Z' },
      { id: 'gid://shopify/MediaImage/3', alt: 'Travel bag campaign', filename: 'campaign.jpg', preview: { image: { url: 'https://cdn.shopify.com/s/files/1/files/campaign.jpg' } }, updatedAt: '2026-08-01T00:00:00Z' },
      { id: 'gid://shopify/MediaImage/4', alt: 'Founder award handmade certification best-selling five-star 10,000 customers family-owned clinically proven', filename: 'claims.jpg', preview: { image: { url: 'https://cdn.shopify.com/s/files/1/files/claims.jpg' } }, updatedAt: '2026-08-01T00:00:00Z' }
    ],
    market: [{ id: 'gid://shopify/Market/1', name: 'Primary', enabled: true, webPresences: { nodes: [] } }],
    theme: [{ id: 'gid://shopify/OnlineStoreTheme/1', name: 'LEGACY_EXAMPLE staging preview', role: 'DEVELOPMENT', updatedAt: '2026-08-01T00:00:00Z' }]
  };
}
function adapter(resources = fixtureResources()) {
  return new DeterministicShopifyAdapter({
    shop: { id: 'gid://shopify/Shop/1', name: 'LEGACY_EXAMPLE', myshopify_domain: 'canonical-legacyexample.myshopify.com', primary_domain: 'www.legacyexample.example', storefront_url: 'https://www.legacyexample.example' },
    scopes: DISCOVERY_SCOPES,
    resources
  });
}
function callbackQuery(authorizationUrl) {
  const state = new URL(authorizationUrl).searchParams.get('state');
  const parameters = new URLSearchParams({ code: 'valid-code', shop: 'canonical-legacyexample.myshopify.com', state, timestamp: String(Date.parse('2026-08-09T16:00:00.000Z') / 1000) });
  const message = [...parameters.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join('&');
  parameters.set('hmac', crypto.createHmac('sha256', oauthSecret).update(message).digest('hex'));
  return parameters;
}
async function setup(controlled = adapter()) {
  const services = await createDashboardServices({ root, env: environment(database()), clock: clockFactory(), shopifyAdapter: controlled });
  const registered = await services.auth.register({ email: `resources-${crypto.randomUUID()}@example.com`, password, fullName: 'Resource Merchant', organizationName: 'LEGACY_EXAMPLE Studio', ipAddress: '127.0.0.1' });
  const { project } = await services.projects.createProject({ userId: registered.user.id, input: { name: 'LEGACY_EXAMPLE', business_name: 'LEGACY_EXAMPLE', country: 'MA' } });
  const started = await services.shopify.startConnection({ userId: registered.user.id, projectId: project.id, shopDomain: 'canonical-legacyexample.myshopify.com' });
  await services.shopify.completeOAuthCallback({ query: callbackQuery(started.authorization_url) });
  await services.merchantIntake.begin({ userId: registered.user.id, projectId: project.id, awaitCompletion: true });
  let { session } = await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
  const resources = await services.store.listShopifyResources((await services.store.findProjectShopifyConnection(project.id, project.organization_id)).connection.id);
  const logo = resources.find((item) => item.display_title === 'LEGACY_EXAMPLE wordmark');
  const hero = resources.find((item) => item.display_title === 'Travel bag campaign');
  await services.assets.categorizeShopifyFile({ userId: registered.user.id, projectId: project.id, resourceId: logo.id, assetCategory: 'logo' });
  await services.assets.categorizeShopifyFile({ userId: registered.user.id, projectId: project.id, resourceId: hero.id, assetCategory: 'hero' });
  session = await services.store.updateCreativeDirector(project.id, {
    ...session,
    stage: 'resources',
    preset_selection: { status: 'approved', approved_revision_id: 'apr_fixture', selected_preset_id: 'atelier', preset_version: '1.0' },
    store_strategy: null,
    resource_plan: {
      status: 'ready', blocker: null, required_assets: [], required_confirmations: [],
      fields: [
        { setting_ref: 'homepage.hero.image', setting_id: 'image', section_id: 'hero', kind: 'image', required: true },
        { setting_ref: 'homepage.featured.collection', setting_id: 'collection', section_id: 'featured-collection', kind: 'collection', required: true },
        { setting_ref: 'homepage.featured.product', setting_id: 'product', section_id: 'featured-product', kind: 'product', required: true },
        { setting_ref: 'header.menu', setting_id: 'menu', section_id: 'header', kind: 'menu', required: false },
        { setting_ref: 'header.logo', setting_id: 'image', section_id: 'header', kind: 'image', required: false }
      ]
    }
  });
  return { services, controlled, registered, project, session };
}

describe('Recommended Resource Set', () => {
  it('ranks only eligible authoritative resources and is deterministic without leaking internal truth metadata', async () => {
    const { services, registered, project } = await setup();
    const first = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    const second = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    expect(second).toEqual(first);
    expect(first.slots).toHaveLength(10);
    expect(first.slots.find((slot) => slot.slot_id === 'logo').recommendation.name).toBe('LEGACY_EXAMPLE wordmark');
    expect(first.slots.find((slot) => slot.slot_id === 'hero_media').recommendation.name).toBe('Travel bag campaign');
    expect(first.slots.find((slot) => slot.slot_id === 'featured_product').recommendation.name).not.toBe('Archived Sample');
    expect(first.slots.find((slot) => slot.slot_id === 'primary_navigation').recommendation.name).toBe('Main menu');
    expect(first.slots.find((slot) => slot.slot_id === 'optional_video')).toMatchObject({ recommendation: null, omission_allowed: true });
    const serialized = JSON.stringify(first);
    expect(serialized).not.toContain('gid://shopify');
    expect(serialized).not.toContain('source_revision');
    expect(serialized).not.toContain('checksum');
    expect(serialized).not.toContain('Founder award handmade certification best-selling five-star 10,000 customers family-owned clinically proven');
    expect(await services.store.listRecommendedResourceSetRevisions(project.id)).toHaveLength(1);
    await services.close();
  });

  it('makes an existing Resource Set candidate a server-side generation blocker until its exact revision is approved', async () => {
    const { services, registered, project } = await setup();
    const candidate = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    const beforeSession = await services.store.findCreativeDirectorForProject(project.id);
    const before = await services.customThemes.evaluate({ project, session: beforeSession });
    expect(before.blocked).toContainEqual(expect.objectContaining({ id: 'recommended_resource_set' }));
    expect(before.requirements).toContainEqual(expect.objectContaining({ id: 'recommended_resource_set', status: 'blocked' }));

    const approved = await services.creativeDirector.approveRecommendedResourceSet({
      userId: registered.user.id,
      projectId: project.id,
      expectedRevisionId: candidate.revision_id
    });
    const after = await services.customThemes.evaluate({ project, session: approved.session });
    expect(after.requirements).toContainEqual({ id: 'recommended_resource_set', label: 'Current approved resource recommendations', status: 'eligible', reason: null });
    expect(after.blocked).not.toContainEqual(expect.objectContaining({ id: 'recommended_resource_set' }));
    await services.close();
  });

  it('bulk-approves ordinary slots once, creates an immutable handoff, and creates no content snapshot, order, or generation', async () => {
    const { services, registered, project } = await setup();
    const candidate = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    const [first, concurrent] = await Promise.all([
      services.creativeDirector.approveRecommendedResourceSet({ userId: registered.user.id, projectId: project.id, expectedRevisionId: candidate.revision_id }),
      services.creativeDirector.approveRecommendedResourceSet({ userId: registered.user.id, projectId: project.id, expectedRevisionId: candidate.revision_id })
    ]);
    const second = await services.creativeDirector.approveRecommendedResourceSet({ userId: registered.user.id, projectId: project.id, expectedRevisionId: candidate.revision_id });
    expect(second.session.generation_context.recommended_resource_set_approval.revision_id).toBe(first.session.generation_context.recommended_resource_set_approval.revision_id);
    expect(concurrent.session.generation_context.recommended_resource_set_approval.revision_id).toBe(first.session.generation_context.recommended_resource_set_approval.revision_id);
    const approvals = await services.store.listApprovedResourceSetRevisions(project.id);
    expect(approvals).toHaveLength(1);
    expect(approvals[0]).toMatchObject({ candidate_revision_id: candidate.revision_id, project_id: project.id, organization_id: project.organization_id });
    expect(approvals[0].assignments.length).toBeGreaterThan(2);
    const paidInputSession = await services.store.findCreativeDirectorForProject(project.id);
    const paidInputEligibility = await services.customThemes.evaluate({ project, session: paidInputSession });
    const snapshotSession = {
      ...paidInputSession,
      creative_brief: paidInputSession.creative_brief || {},
      store_strategy: paidInputSession.store_strategy || {},
      generation_context: {
        ...paidInputSession.generation_context,
        merchant_references: Object.fromEntries(Object.keys(paidInputSession.generation_context.merchant_references || {}).map((field) => [field, `shopify://merchant-assets/${field.replace(/[^a-z0-9]+/gi, '-')}`])),
        asset_references: {}
      }
    };
    const paidInputSnapshot = services.customThemes.snapshot({
      project,
      session: snapshotSession,
      eligibility: paidInputEligibility,
      order: { id: 'cto_resource_set_fixture' },
      at: '2026-08-09T18:00:00.000Z',
      approvedResourceSetRevision: approvals[0]
    });
    expect(paidInputSnapshot.approved_resource_set_revision).toEqual(approvals[0]);
    expect(paidInputSnapshot.generation_approval_binding.approved_resource_set).toEqual({
      revision_id: approvals[0].revision_id,
      candidate_revision_id: approvals[0].candidate_revision_id,
      approval_checksum: approvals[0].approval_checksum
    });
    const snapshotCount = await services.store.driver.get('SELECT COUNT(*) AS count FROM approved_block_plan_resource_snapshots WHERE project_id = $1', [project.id]);
    expect(Number(snapshotCount.count)).toBe(0);
    expect(await services.store.listCustomThemeOrdersForProject(project.id, project.organization_id)).toEqual([]);
    const generations = await services.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_generation_runs');
    expect(Number(generations.count)).toBe(0);
    await services.close();
  });

  it('adopts valid historical individual approvals as preference without fabricating aggregate consent', async () => {
    const { services, registered, project } = await setup();
    const assignment = await services.store.findProjectShopifyConnection(project.id, project.organization_id);
    const resources = await services.store.listShopifyResources(assignment.connection.id);
    const weekender = resources.find((item) => item.display_title === 'Weekender');
    await services.shopify.decideResource({ userId: registered.user.id, projectId: project.id, resourceId: weekender.id, status: 'approved' });
    const before = await services.store.listShopifyResourceApprovals(project.id);
    const recommended = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    expect(recommended.slots.find((slot) => slot.slot_id === 'featured_product')).toMatchObject({ recommendation: { name: 'Weekender' }, confidence: 'High' });
    expect(recommended.approved_revision_id).toBeNull();
    expect(await services.store.listShopifyResourceApprovals(project.id)).toEqual(before);
    expect(await services.store.listApprovedResourceSetRevisions(project.id)).toEqual([]);
    await services.close();
  });

  it('keeps optional video omittable even when a legacy plan marked its field required', async () => {
    const { services, registered, project } = await setup();
    const current = await services.store.findCreativeDirectorForProject(project.id);
    await services.store.updateCreativeDirector(project.id, {
      ...current,
      resource_plan: { ...current.resource_plan, fields: [...current.resource_plan.fields, { setting_ref: 'homepage.video.video', setting_id: 'video', section_id: 'video', kind: 'video', required: true }] }
    });
    const result = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    expect(result.status).not.toBe('blocked');
    expect(result.approvable).toBe(true);
    expect(result.slots.find((slot) => slot.slot_id === 'optional_video')).toMatchObject({ required: false, recommendation: null, omission_allowed: true });
    expect(result.exceptions).toEqual(expect.arrayContaining([expect.objectContaining({ slot_id: 'optional_video' })]));
    await services.close();
  });

  it('applies a server-approved ordinary evidence-media omission without trusting a client omission', async () => {
    const { services, registered, project } = await setup();
    const candidate = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    const current = await services.store.findCreativeDirectorForProject(project.id);
    await services.store.updateCreativeDirector(project.id, {
      ...current,
      resource_plan: {
        ...current.resource_plan,
        fields: [...current.resource_plan.fields, { setting_ref: 'homepage.craftsmanship.image', setting_id: 'image', section_id: 'craftsmanship', kind: 'image', required: true }]
      }
    });
    const refreshed = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    expect(refreshed.slots.find((slot) => slot.slot_id === 'craftsmanship_or_editorial_media')).toMatchObject({ required: false, recommendation: null, omission_allowed: true });
    const approved = await services.creativeDirector.approveRecommendedResourceSet({ userId: registered.user.id, projectId: project.id, expectedRevisionId: refreshed.revision_id });
    expect(approved.session.generation_context.resolved_empty_fields).toContain('homepage.craftsmanship.image');
    expect(approved.resource_validation.complete).toBe(true);

    const unrelated = await setup();
    const unrelatedSession = await unrelated.services.store.findCreativeDirectorForProject(unrelated.project.id);
    await unrelated.services.store.updateCreativeDirector(unrelated.project.id, {
      ...unrelatedSession,
      resource_plan: {
        ...unrelatedSession.resource_plan,
        fields: [...unrelatedSession.resource_plan.fields, { setting_ref: 'homepage.craftsmanship.image', setting_id: 'image', section_id: 'craftsmanship', kind: 'image', required: true }]
      }
    });
    await expect(unrelated.services.creativeDirector.updateResources({
      userId: unrelated.registered.user.id,
      projectId: unrelated.project.id,
      resolvedEmptyFields: ['homepage.craftsmanship.image']
    })).rejects.toMatchObject({ code: 'resource_empty_decision_invalid' });
    await unrelated.services.close();
    await services.close();
  });

  it('bulk approval never silently confirms sensitive merchant facts', async () => {
    const { services, registered, project } = await setup();
    const current = await services.store.findCreativeDirectorForProject(project.id);
    await services.store.updateCreativeDirector(project.id, {
      ...current,
      resource_plan: {
        ...current.resource_plan,
        required_confirmations: ['review:verification:craftsmanship:artisan_claims']
      }
    });
    const candidate = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    const approved = await services.creativeDirector.approveRecommendedResourceSet({
      userId: registered.user.id,
      projectId: project.id,
      expectedRevisionId: candidate.revision_id
    });
    expect(approved.resource_validation.complete).toBe(false);
    expect(approved.session.stage).toBe('resources');
    expect(approved.session.generation_context.completed_confirmations).not.toContain('review:verification:craftsmanship:artisan_claims');
    expect(approved.resource_validation.blockers).toContainEqual(expect.objectContaining({
      requirementId: 'confirmation:review:verification:craftsmanship:artisan_claims',
      currentStatus: 'not_confirmed'
    }));
    await expect(services.creativeDirector.updateResources({
      userId: registered.user.id,
      projectId: project.id,
      confirmedRequiredConfirmations: ['review:verification:craftsmanship:invented_claim']
    })).rejects.toMatchObject({ code: 'resource_confirmation_invalid', status: 422 });
    await services.close();
  });

  it('blocks when a genuinely required commerce slot has no eligible resource', async () => {
    const resources = fixtureResources();
    resources.collection = [];
    const { services, registered, project } = await setup(adapter(resources));
    const result = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    expect(result).toMatchObject({ status: 'blocked', approvable: false });
    expect(result.slots.find((slot) => slot.slot_id === 'featured_collection')).toMatchObject({ required: true, recommendation: null });
    await services.close();
  });

  it('keeps workflow review identifiers out of sensitive-claim exceptions', async () => {
    const { services, registered, project } = await setup();
    const current = await services.store.findCreativeDirectorForProject(project.id);
    await services.store.updateCreativeDirector(project.id, {
      ...current,
      resource_plan: { ...current.resource_plan, required_confirmations: ['review:global:global.color_schemes', 'review:verification:craftsmanship:artisan_claims'] }
    });
    const result = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    expect(result.exceptions.filter((item) => item.label === 'Claim confirmation')).toEqual([
      expect.objectContaining({ reason: 'review:verification:craftsmanship:artisan_claims' })
    ]);
    expect(JSON.stringify(result.exceptions)).not.toContain('global.color_schemes');
    await services.close();
  });

  it('creates a child recommendation for one replacement, preserves other slot identities, and rejects stale edits', async () => {
    const { services, registered, project } = await setup();
    const first = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    const product = first.slots.find((slot) => slot.slot_id === 'featured_product');
    expect(product.alternatives.length).toBeGreaterThan(0);
    const replacement = product.alternatives[0];
    const changed = await services.recommendedResources.replace({ userId: registered.user.id, projectId: project.id, expectedRevisionId: first.revision_id, slotId: 'featured_product', selectionId: replacement.selection_id });
    expect(changed.revision_id).not.toBe(first.revision_id);
    expect(changed.slots.find((slot) => slot.slot_id === 'featured_product').recommendation.selection_id).toBe(replacement.selection_id);
    expect(changed.slots.find((slot) => slot.slot_id === 'logo').recommendation.selection_id).toBe(first.slots.find((slot) => slot.slot_id === 'logo').recommendation.selection_id);
    const revisions = await services.store.listRecommendedResourceSetRevisions(project.id);
    expect(revisions.at(-1).parent_revision_id).toBe(first.revision_id);
    await expect(services.recommendedResources.replace({ userId: registered.user.id, projectId: project.id, expectedRevisionId: first.revision_id, slotId: 'featured_product', selectionId: replacement.selection_id })).rejects.toMatchObject({ code: 'recommended_resource_set_stale' });
    await services.close();
  });

  it('routes an exact conversational replacement but refuses ambiguous or invented choices', async () => {
    const { services, registered, project } = await setup();
    const first = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    const product = first.slots.find((slot) => slot.slot_id === 'featured_product');
    const replacement = product.alternatives[0];
    const changed = await services.recommendedResources.replaceFromConversation({ userId: registered.user.id, projectId: project.id, expectedRevisionId: first.revision_id, message: `Use ${replacement.name} for Featured product` });
    expect(changed.slots.find((slot) => slot.slot_id === 'featured_product').recommendation.name).toBe(replacement.name);
    await expect(services.recommendedResources.replaceFromConversation({ userId: registered.user.id, projectId: project.id, expectedRevisionId: changed.revision_id, message: 'Use something more premium' })).rejects.toMatchObject({ code: 'resource_set_request_ambiguous' });
    const delegated = await services.recommendedResources.replaceFromConversation({ userId: registered.user.id, projectId: project.id, expectedRevisionId: changed.revision_id, message: 'You decide the Logo' });
    expect(delegated.slots.find((slot) => slot.slot_id === 'logo').reason).toBe('You selected this eligible resource for this placement.');
    await services.close();
  });

  it('detects source staleness without mutating the approved revision or silently approving a replacement', async () => {
    const controlled = adapter();
    const { services, registered, project } = await setup(controlled);
    const candidate = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    const approved = await services.creativeDirector.approveRecommendedResourceSet({ userId: registered.user.id, projectId: project.id, expectedRevisionId: candidate.revision_id });
    const approvedRevisionId = approved.session.generation_context.recommended_resource_set_approval.revision_id;
    controlled.resources.product[0] = { ...controlled.resources.product[0], title: 'Nocturne Travel Bag — Revised', updatedAt: '2026-08-09T18:00:00Z' };
    await services.shopify.synchronize({ userId: registered.user.id, projectId: project.id });
    await services.merchantIntake.rebuildFromCurrentEvidence({ userId: registered.user.id, projectId: project.id });
    const refreshed = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    expect(refreshed.status).toBe('stale');
    expect(refreshed.slots.filter((slot) => slot.stale).map((slot) => slot.slot_id)).toEqual(expect.arrayContaining(['featured_product']));
    expect(refreshed.approved_revision_id).toBe(approvedRevisionId);
    expect(await services.store.listApprovedResourceSetRevisions(project.id)).toHaveLength(1);
    const projectState = await services.store.findCreativeDirectorForProject(project.id);
    const verification = await services.recommendedResources.verifyBinding({ project, binding: projectState.generation_context.recommended_resource_set_approval, session: projectState });
    expect(verification.valid).toBe(false);
    const eligibility = await services.customThemes.evaluate({ project, session: projectState });
    expect(eligibility.requirements).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'recommended_resource_set', status: 'blocked' })]));
    expect(eligibility.eligible).toBe(false);
    await services.close();
  });

  it('rejects cross-project access and foreign selection identifiers', async () => {
    const { services, registered, project } = await setup();
    const candidate = await services.recommendedResources.ensure({ userId: registered.user.id, projectId: project.id });
    const outsider = await services.auth.register({ email: `outsider-${crypto.randomUUID()}@example.com`, password, fullName: 'Outsider', organizationName: 'Other Studio', ipAddress: '127.0.0.2' });
    await expect(services.recommendedResources.ensure({ userId: outsider.user.id, projectId: project.id })).rejects.toMatchObject({ code: 'permission_denied' });
    await expect(services.recommendedResources.replace({ userId: registered.user.id, projectId: project.id, expectedRevisionId: candidate.revision_id, slotId: 'logo', selectionId: 'shr_foreign' })).rejects.toMatchObject({ code: 'resource_set_selection_invalid' });
    await services.close();
  });
});
