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
const oauthSecret = 'automatic-intake-oauth-secret';
const encryptionKey = Buffer.alloc(32, 31).toString('base64url');
function database() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-intake-')), 'dashboard.sqlite'); }
function clockFactory() { let tick = 0; const start = Date.parse('2026-08-09T12:00:00.000Z'); return () => new Date(start + (tick++ * 1000)); }
function environment(filename) {
  return {
    CALINIUM_SQLITE_PATH: filename,
    CALINIUM_SHOPIFY_CLIENT_ID: 'automatic-intake-client',
    CALINIUM_SHOPIFY_CLIENT_SECRET: oauthSecret,
    CALINIUM_SHOPIFY_OAUTH_REDIRECT_URI: 'https://dashboard.example/api/shopify/oauth/callback',
    CALINIUM_APPLICATION_URL: 'https://dashboard.example',
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: encryptionKey
  };
}
function resources() {
  return {
    product: [
      { id: 'gid://shopify/Product/1', title: 'Leather Travel Bag', handle: 'travel-bag', status: 'ACTIVE', updatedAt: '2026-08-01T00:00:00Z', featuredMedia: { preview: { image: { url: 'https://cdn.example/bag.jpg' } } }, variants: { nodes: [{ id: 'gid://shopify/ProductVariant/1', title: 'Default', availableForSale: true, price: { amount: '320.00', currencyCode: 'USD' } }] }, media: { nodes: [{ id: 'gid://shopify/MediaImage/1', alt: 'Bag', mediaContentType: 'IMAGE', preview: { image: { url: 'https://cdn.example/bag.jpg' } } }] } },
      { id: 'gid://shopify/Product/2', title: 'Leather Weekender Bag', handle: 'weekender', status: 'ACTIVE', updatedAt: '2026-08-01T00:00:00Z', variants: { nodes: [] }, media: { nodes: [] } }
    ],
    collection: [{ id: 'gid://shopify/Collection/1', title: 'Leather Bags', handle: 'bags', updatedAt: '2026-08-01T00:00:00Z' }],
    menu: [{ id: 'gid://shopify/Menu/1', title: 'Main menu', handle: 'main-menu', items: [{ title: 'Shop', type: 'COLLECTION', url: '/collections/bags' }] }],
    file: [{ id: 'gid://shopify/MediaImage/2', alt: 'Handmade artisan sustainable certified award-winning made in Morocco five-star 10,000 customers family-owned clinically proven campaign', filename: 'campaign.jpg', preview: { image: { url: 'https://cdn.example/campaign.jpg' } }, updatedAt: '2026-08-01T00:00:00Z' }],
    market: [{ id: 'gid://shopify/Market/1', name: 'Primary', enabled: true, webPresences: { nodes: [] } }],
    theme: [{ id: 'gid://shopify/OnlineStoreTheme/1', name: 'Development theme', role: 'DEVELOPMENT', updatedAt: '2026-08-01T00:00:00Z' }]
  };
}
function adapter(input = {}) {
  return new DeterministicShopifyAdapter({
    shop: { id: 'gid://shopify/Shop/1', name: 'Northline', myshopify_domain: 'fixture.myshopify.com', primary_domain: 'www.example.com', storefront_url: 'https://www.example.com' },
    scopes: DISCOVERY_SCOPES,
    resources: resources(),
    ...input
  });
}
function callbackQuery(authorizationUrl) {
  const state = new URL(authorizationUrl).searchParams.get('state');
  const parameters = new URLSearchParams({ code: 'valid-code', shop: 'fixture.myshopify.com', state, timestamp: String(Date.parse('2026-08-09T12:00:00.000Z') / 1000) });
  const message = [...parameters.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join('&');
  parameters.set('hmac', crypto.createHmac('sha256', oauthSecret).update(message).digest('hex'));
  return parameters;
}
async function setup(controlled = adapter()) {
  const services = await createDashboardServices({ root, env: environment(database()), clock: clockFactory(), shopifyAdapter: controlled });
  const registered = await services.auth.register({ email: `intake-${crypto.randomUUID()}@example.com`, password, fullName: 'Intake Merchant', organizationName: 'Intake Studio', ipAddress: '127.0.0.1' });
  const { project } = await services.projects.createProject({ userId: registered.user.id, input: { name: 'Northline', business_name: 'Northline', country: 'GB' } });
  const started = await services.shopify.startConnection({ userId: registered.user.id, projectId: project.id, shopDomain: 'fixture.myshopify.com' });
  await services.shopify.completeOAuthCallback({ query: callbackQuery(started.authorization_url) });
  return { services, controlled, registered, project };
}

describe('Automatic Merchant Intake', () => {
  it('learns in the background, persists one immutable revision, and suppresses a redundant product question', async () => {
    const { services, registered, project } = await setup();
    const firstLoad = await services.creativeDirector.load({ userId: registered.user.id, projectId: project.id });
    expect(firstLoad.store_intelligence).toMatchObject({ status: 'learning', usable: false });
    await services.merchantIntake.drain();
    const learned = await services.merchantIntake.get({ userId: registered.user.id, projectId: project.id });
    expect(learned).toMatchObject({ status: 'usable', usable: true, confidence: 'High', summary: { products: 2, collections: 1, menus: 1 } });
    expect(JSON.stringify(learned)).not.toContain('gid://shopify');
    expect(JSON.stringify(learned)).not.toContain('Handmade artisan sustainable');

    const started = await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
    expect(started.session.transcript[0].content).toContain('How should the storefront feel');
    expect(started.session.conversation_state.inferredFacts).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'productsOrServices', confidence: 0.88 })]));
    expect(started.session.conversation_state.currentQuestionId).toBe('feeling');
    expect(started.session.conversation_state.questionsAsked).not.toContain('products');

    let response = await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Warm, refined, and quiet' });
    response = await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Frequent travelers who value durable design' });
    response = await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Present a clear premium collection' });
    expect(response.session.stage).toBe('understanding');
    expect(response.session.conversation_state.questionsAsked).not.toContain('products');
    const brief = await services.creativeDirector.createBrief({ userId: registered.user.id, projectId: project.id });
    expect(brief.session.creative_brief.business.offer).toEqual(['fashion and accessories']);
    expect(brief.session.creative_brief.facts.find((fact) => fact.path === 'productsOrServices')).toBeUndefined();
    expect(brief.session.creative_brief.assumptions).toEqual(expect.arrayContaining([expect.objectContaining({ statement: expect.stringContaining('productsOrServices') })]));

    const revisions = await services.store.listMerchantIntakeRevisions(project.id);
    expect(revisions).toHaveLength(1);
    expect(revisions[0].store_intelligence.sensitive_observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'handmade_or_artisan', status: 'requires_merchant_confirmation' }),
      expect.objectContaining({ kind: 'origin', status: 'requires_merchant_confirmation' }),
      expect.objectContaining({ kind: 'sustainability', status: 'requires_merchant_confirmation' }),
      expect.objectContaining({ kind: 'award_or_certification', status: 'requires_merchant_confirmation' }),
      expect.objectContaining({ kind: 'testimonial_or_result', status: 'requires_merchant_confirmation' })
    ]));
    await services.close();
  });

  it('reuses identical evidence and creates a linked child revision only when Shopify evidence changes', async () => {
    const controlled = adapter();
    const { services, registered, project } = await setup(controlled);
    await services.merchantIntake.begin({ userId: registered.user.id, projectId: project.id, awaitCompletion: true });
    const first = await services.store.listMerchantIntakeRevisions(project.id);
    await services.merchantIntake.refresh({ userId: registered.user.id, projectId: project.id });
    expect(await services.store.listMerchantIntakeRevisions(project.id)).toHaveLength(1);

    controlled.resources.product = [{ ...controlled.resources.product[0], title: 'Skincare Serum', handle: 'serum' }];
    controlled.resources.collection = [{ ...controlled.resources.collection[0], title: 'Skincare' }];
    await services.merchantIntake.refresh({ userId: registered.user.id, projectId: project.id });
    const changed = await services.store.listMerchantIntakeRevisions(project.id);
    expect(changed).toHaveLength(2);
    expect(changed[1].parent_revision_id).toBe(first[0].revision_id);
    expect(changed[1].store_intelligence.category).toMatchObject({ id: 'beauty', confidence: 'High' });
    expect(first[0].store_intelligence.category.id).toBe('luxury_fashion');
    await services.close();
  });

  it('preserves usable partial intelligence, supports safe retry, and isolates projects', async () => {
    const controlled = adapter();
    const original = controlled.listResourcePage.bind(controlled);
    let failCollections = true;
    controlled.listResourcePage = (input) => failCollections && input.resourceType === 'collection' ? Promise.reject(new Error('fixture collection unavailable')) : original(input);
    const { services, registered, project } = await setup(controlled);
    await Promise.all([
      services.merchantIntake.begin({ userId: registered.user.id, projectId: project.id, awaitCompletion: true }),
      services.merchantIntake.begin({ userId: registered.user.id, projectId: project.id, awaitCompletion: true })
    ]);
    expect(await services.store.listMerchantIntakeRevisions(project.id)).toHaveLength(1);
    expect(await services.merchantIntake.get({ userId: registered.user.id, projectId: project.id })).toMatchObject({ status: 'partial', usable: true, retry_available: true });

    failCollections = false;
    const recovered = await services.merchantIntake.refresh({ userId: registered.user.id, projectId: project.id });
    expect(recovered.status).toBe('usable');

    const outsider = await services.auth.register({ email: 'intake-outsider@example.com', password, fullName: 'Outsider', organizationName: 'Other', ipAddress: '127.0.0.2' });
    await expect(services.merchantIntake.get({ userId: outsider.user.id, projectId: project.id })).rejects.toMatchObject({ code: 'permission_denied' });
    await services.close();
  });

  it('keeps an explicit merchant correction authoritative over catalog inference', async () => {
    const { services, registered, project } = await setup();
    await services.merchantIntake.begin({ userId: registered.user.id, projectId: project.id, awaitCompletion: true });
    let { session } = await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
    session = await services.store.updateCreativeDirector(project.id, {
      ...session,
      conversation_state: services.creativeDirector.adapter.correct({ state: session.conversation_state, path: 'productsOrServices', value: ['Leather care services'] })
    });
    const context = await services.merchantIntake.conversationContext({ userId: registered.user.id, projectId: project.id });
    const responded = await services.creativeDirector.adapter.respond({ state: session.conversation_state, message: 'Warm and understated', context });
    expect(responded.state.knownFacts).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'productsOrServices', value: ['Leather care services'] })]));
    expect(responded.state.inferredFacts.find((fact) => fact.path === 'productsOrServices')).toBeUndefined();
    await services.close();
  });

  it('delegates only reversible creative choices and keeps merchant-owned audience facts unanswered', async () => {
    const { services, registered, project } = await setup();
    await services.merchantIntake.begin({ userId: registered.user.id, projectId: project.id, awaitCompletion: true });
    let result = await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
    expect(result.session.conversation_state.currentQuestionId).toBe('feeling');

    result = await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'You decide' });
    expect(result.session.conversation_state.currentQuestionId).toBe('audience');
    expect(result.session.conversation_state.knownFacts.find((fact) => fact.path === 'preferences.desiredFeeling')).toBeUndefined();
    expect(result.session.conversation_state.unknowns).toContainEqual(expect.objectContaining({
      path: 'preferences.desiredFeeling',
      reason: expect.stringContaining('reversible creative choice')
    }));

    result = await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'You decide' });
    expect(result.session.conversation_state.currentQuestionId).toBe('audience');
    expect(result.session.conversation_state.knownFacts.find((fact) => fact.path === 'targetAudience')).toBeUndefined();
    expect(result.session.transcript.at(-1).content).toContain('only you can answer this business question');
    expect(JSON.stringify(result.session.conversation_state)).not.toContain('you_decide');
    await services.close();
  });

  it('waits for active store learning before falling back to a redundant catalog question', async () => {
    const controlled = adapter();
    const original = controlled.listResourcePage.bind(controlled);
    let releaseLearning;
    const learningGate = new Promise((resolve) => { releaseLearning = resolve; });
    controlled.listResourcePage = async (input) => { await learningGate; return original(input); };
    const { services, registered, project } = await setup(controlled);
    let result = await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
    expect(result.session.conversation_state.currentQuestionId).toBe('feeling');
    result = await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Warm and understated' });
    result = await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Frequent travelers' });
    const completed = services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Make the catalog easier to discover' });
    releaseLearning();
    result = await completed;
    expect(result.session.stage).toBe('understanding');
    expect(result.session.conversation_state.questionsAsked).not.toContain('products');
    expect(result.session.conversation_state.inferredFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'productsOrServices', confidence: 0.88 })
    ]));
    await services.close();
  });

  it('resumes historical project and intake state without creating commercial side effects', async () => {
    const filename = database();
    const controlled = adapter();
    const env = environment(filename);
    const services = await createDashboardServices({ root, env, clock: clockFactory(), shopifyAdapter: controlled });
    const registered = await services.auth.register({ email: 'intake-resume@example.com', password, fullName: 'Resume Merchant', organizationName: 'Resume Studio', ipAddress: '127.0.0.1' });
    const { project } = await services.projects.createProject({ userId: registered.user.id, input: { name: 'Resume', business_name: 'Resume', country: 'GB' } });
    const oauth = await services.shopify.startConnection({ userId: registered.user.id, projectId: project.id, shopDomain: 'fixture.myshopify.com' });
    await services.shopify.completeOAuthCallback({ query: callbackQuery(oauth.authorization_url) });
    const firstSession = (await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id })).session;
    await services.merchantIntake.drain();
    const revision = (await services.merchantIntake.get({ userId: registered.user.id, projectId: project.id })).revision_id;
    expect(await services.store.listCustomThemeOrdersForProject(project.id, project.organization_id)).toEqual([]);
    await services.close();

    const reopened = await createDashboardServices({ root, env, clock: clockFactory(), shopifyAdapter: controlled });
    const loaded = await reopened.creativeDirector.load({ userId: registered.user.id, projectId: project.id });
    expect(loaded.session.id).toBe(firstSession.id);
    expect(loaded.session.transcript).toEqual(firstSession.transcript);
    expect(loaded.store_intelligence.revision_id).toBe(revision);
    expect(await reopened.store.listMerchantIntakeRevisions(project.id)).toHaveLength(1);
    expect(await reopened.store.listCustomThemeOrdersForProject(project.id, project.organization_id)).toEqual([]);
    await reopened.close();
  });
});
