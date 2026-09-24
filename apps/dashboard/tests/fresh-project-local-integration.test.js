import crypto from 'node:crypto';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardServices } = require('../server/dashboard-services.cjs');
const { createDashboardApiHandler } = require('../server/dashboard-api.cjs');
const { DeterministicShopifyAdapter } = require('../server/shopify/deterministic-shopify-adapter.cjs');
const { DISCOVERY_SCOPES } = require('../server/shopify/constants.cjs');
const { architectureProvenance } = require('../../../ai/architecture');

const root = path.resolve(process.cwd(), '../..');
const shop = 'fresh-project.myshopify.com';
const clientId = 'fresh-project-client';
const clientSecret = 'fresh-project-session-secret';
const offlineToken = 'fresh-project-deterministic-offline-token';
const generatedWorkspaces = [];

function workspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-fresh-project-'));
}

function clockFactory() {
  let tick = 0;
  const start = Date.parse('2026-09-09T09:00:00.000Z');
  return () => new Date(start + (tick++ * 1000));
}

function environment(directory) {
  return {
    NODE_ENV: 'test',
    CALINIUM_ENVIRONMENT: 'test',
    CALINIUM_SQLITE_PATH: path.join(directory, 'dashboard.sqlite'),
    CALINIUM_ASSET_STORAGE_PATH: path.join(directory, 'assets'),
    CALINIUM_APPLICATION_URL: 'https://dashboard.example',
    APP_URL: 'https://dashboard.example',
    CALINIUM_SHOPIFY_CLIENT_ID: clientId,
    CALINIUM_SHOPIFY_CLIENT_SECRET: clientSecret,
    SHOPIFY_API_KEY: clientId,
    SHOPIFY_API_SECRET: clientSecret,
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 53).toString('base64url'),
    CALINIUM_DASHBOARD_SESSION_SECRET: 'fresh-project-dashboard-session-secret-that-is-long-enough',
    CALINIUM_ALLOWED_SHOP_DOMAINS: shop,
    CALINIUM_SHOPIFY_BILLING_TEST_MODE: 'true',
    CALINIUM_MERCHANT_FLOW_BETA_ENABLED: 'false',
    CALINIUM_ANALYSIS_FIRST_MERCHANT_EXPERIENCE_ENABLED: 'false'
  };
}

function product(index) {
  const mediaCount = index <= 50 ? 2 : 1;
  return {
    id: `gid://shopify/Product/${index}`,
    title: `Leather Travel Bag ${index}`,
    handle: `leather-travel-bag-${index}`,
    status: 'ACTIVE',
    updatedAt: '2026-09-01T00:00:00Z',
    featuredMedia: { preview: { image: { url: `https://cdn.shopify.com/s/files/1/files/bag-${index}-1.jpg` } } },
    variants: {
      nodes: Array.from({ length: 3 }, (_, variant) => ({
        id: `gid://shopify/ProductVariant/${index}-${variant + 1}`,
        title: `Option ${variant + 1}`,
        availableForSale: true,
        price: { amount: `${200 + index}.00`, currencyCode: 'USD' }
      }))
    },
    media: {
      nodes: Array.from({ length: mediaCount }, (_, media) => ({
        id: `gid://shopify/MediaImage/${index}-${media + 1}`,
        alt: `Leather travel bag ${index} view ${media + 1}`,
        mediaContentType: 'IMAGE',
        preview: { image: { url: `https://cdn.shopify.com/s/files/1/files/bag-${index}-${media + 1}.jpg` } }
      }))
    }
  };
}

function deterministicAdapter() {
  const products = Array.from({ length: 100 }, (_, index) => product(index + 1));
  const collections = Array.from({ length: 10 }, (_, index) => ({
    id: `gid://shopify/Collection/${index + 1}`,
    title: `Travel Collection ${index + 1}`,
    handle: `travel-collection-${index + 1}`,
    updatedAt: '2026-09-01T00:00:00Z'
  }));
  const menus = Array.from({ length: 2 }, (_, menuIndex) => ({
    id: `gid://shopify/Menu/${menuIndex + 1}`,
    title: menuIndex === 0 ? 'Main menu' : 'Secondary menu',
    handle: menuIndex === 0 ? 'main-menu' : 'secondary-menu',
    items: Array.from({ length: 15 }, (_, itemIndex) => ({
      title: `Collection ${menuIndex * 15 + itemIndex + 1}`,
      type: 'COLLECTION',
      url: `/collections/travel-collection-${(itemIndex % 10) + 1}`
    }))
  }));
  return new DeterministicShopifyAdapter({
    token: offlineToken,
    shop: {
      id: 'gid://shopify/Shop/fresh-project',
      name: 'Fresh Project Fixture',
      myshopify_domain: shop,
      primary_domain: 'fresh-project.example',
      storefront_url: 'https://fresh-project.example'
    },
    scopes: DISCOVERY_SCOPES,
    pages: {
      product: [products.slice(0, 50), products.slice(50)],
      collection: [collections.slice(0, 5), collections.slice(5)],
      menu: [menus],
      file: [[
        { id: 'gid://shopify/MediaImage/file-logo', alt: 'Fresh Project wordmark', filename: 'wordmark.png', preview: { image: { url: 'https://cdn.shopify.com/s/files/1/files/wordmark.png' } }, updatedAt: '2026-09-01T00:00:00Z' },
        { id: 'gid://shopify/MediaImage/file-campaign', alt: 'Travel collection campaign', filename: 'campaign.jpg', preview: { image: { url: 'https://cdn.shopify.com/s/files/1/files/campaign.jpg' } }, updatedAt: '2026-09-01T00:00:00Z' }
      ]],
      market: [[{ id: 'gid://shopify/Market/1', name: 'Primary', enabled: true, webPresences: { nodes: [] } }]],
      theme: [[
        { id: 'gid://shopify/OnlineStoreTheme/100', name: 'Published storefront', role: 'MAIN', updatedAt: '2026-09-01T00:00:00Z' },
        { id: 'gid://shopify/OnlineStoreTheme/200', name: 'Development preview', role: 'DEVELOPMENT', updatedAt: '2026-09-01T00:00:00Z' }
      ]]
    }
  });
}

function signedEmbeddedSession({ userId = 'gid://shopify/User/fresh-owner', shopDomain = shop, secret = clientSecret } = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    aud: clientId,
    dest: `https://${shopDomain}`,
    exp: Math.floor(Date.now() / 1000) + 60,
    iss: `https://${shopDomain}/admin`,
    sub: userId
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function invoke(api, { method = 'GET', url, token = null, body = undefined }) {
  const request = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  const headers = { host: 'dashboard.example', 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  Object.assign(request, { method, url, headers, socket: { remoteAddress: '127.0.0.1' } });
  const response = {
    status: null,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    writeHead(status, values) { this.status = status; this.headers = { ...this.headers, ...(values || {}) }; },
    end(value = '') { this.body += value; }
  };
  await api(request, response);
  return { status: response.status, headers: response.headers, payload: response.body ? JSON.parse(response.body) : null };
}

function fakeGenerator(seen) {
  return (input) => {
    seen.push(JSON.parse(JSON.stringify(input)));
    const generationId = input.generationId;
    assert.match(generationId, /^generation-run-order-[A-Za-z0-9_-]+-attempt-\d+$/);
    const output = path.join(root, 'output', generationId);
    if (fs.existsSync(output)) throw new Error('Refusing to overwrite an existing generated workspace.');
    generatedWorkspaces.push(output);
    const packageRoot = path.join(output, 'fixture-theme');
    fs.mkdirSync(path.join(output, 'exports'), { recursive: true });
    fs.mkdirSync(path.join(output, 'manifests'), { recursive: true });
    fs.mkdirSync(path.join(output, 'reports'), { recursive: true });
    fs.mkdirSync(path.join(packageRoot, 'templates'), { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'templates', 'index.json'), JSON.stringify({ sections: {}, order: [] }));
    execFileSync('zip', ['-X', '-r', path.join(output, 'exports', 'calinium-storefront.zip'), 'templates'], { cwd: packageRoot, stdio: 'ignore' });
    const shopifyOperations = { write_operations: false, upload: false, publish: false, required_scope: 'none' };
    const packageManifest = { generation_id: generationId, shopify_operations: shopifyOperations };
    const validation = { valid: true, errors: [], warnings: [] };
    fs.writeFileSync(path.join(output, 'manifests', 'theme-specification.json'), JSON.stringify({ version: 1 }));
    fs.writeFileSync(path.join(output, 'manifests', 'read-only-theme-package.json'), JSON.stringify(packageManifest));
    fs.writeFileSync(path.join(output, 'reports', 'theme-package-validation.json'), JSON.stringify(validation));
    return {
      status: 'generated_for_review',
      generated_theme: {
        manifest: {
          generation_id: generationId,
          approved_preset_provenance: input.approvedPresetRevision ? {
            revision_id: input.approvedPresetRevision.revision_id,
            preset_id: input.approvedPresetRevision.preset_id,
            preset_version: input.approvedPresetRevision.preset_version,
            preset_checksum: input.approvedPresetRevision.preset_checksum
          } : null,
          approved_recommendation_provenance: input.approvedRecommendationRevision ? { revision_id: input.approvedRecommendationRevision.revision_id } : null,
          approved_design_dna_provenance: input.approvedDesignDnaRevision ? { revision_id: input.approvedDesignDnaRevision.revision_id } : null,
          architecture_selection: input.architectureSelectionRevision ? architectureProvenance(input.architectureSelectionRevision, root) : null,
          shopify_operations: shopifyOperations
        }
      },
      read_only_theme_package: {
        workspace: output,
        archive_path: path.join(output, 'exports', 'calinium-storefront.zip'),
        manifest: packageManifest,
        validation
      }
    };
  };
}

async function count(services, table, where = '', parameters = []) {
  const result = await services.store.driver.get(`SELECT COUNT(*) AS count FROM ${table}${where ? ` ${where}` : ''}`, parameters);
  return Number(result.count);
}

async function approveStrategyRecommendations(services, userId, projectId) {
  let { session } = await services.creativeDirector.load({ userId, projectId });
  for (const recommendation of session.store_strategy.recommendations || []) {
    if (!recommendation.requiresMerchantApproval) continue;
    ({ session } = await services.creativeDirector.decideRecommendation({
      userId,
      projectId,
      recommendationPath: recommendation.id,
      status: 'approved'
    }));
  }
}

async function prepareProject(services, { userId, projectId, shoppingMode = null }) {
  const intake = await services.merchantIntake.begin({ userId, projectId, awaitCompletion: true });
  expect(intake).toMatchObject({ status: 'usable', summary: { products: 100, collections: 10, media: 152, menus: 2 } });

  let result = await services.creativeDirector.start({ userId, projectId });
  expect(result.session.conversation_state.questionsAsked).not.toContain('products');
  for (const message of [
    'Clear, balanced, and approachable',
    'Everyday travelers choosing durable bags',
    'Help customers understand products and choose confidently'
  ]) result = await services.creativeDirector.respond({ userId, projectId, message });
  expect(result.session.stage).toBe('understanding');
  await services.creativeDirector.createBrief({ userId, projectId });
  await services.creativeDirector.approveBrief({ userId, projectId });
  await approveStrategyRecommendations(services, userId, projectId);
  result = await services.creativeDirector.approveStrategy({ userId, projectId });
  result = await services.creativeDirector.approvePreset({
    userId,
    projectId,
    expectedVersion: result.session.preset_selection.candidate_version
  });
  if (shoppingMode) {
    result = await services.creativeDirector.respond({
      userId,
      projectId,
      message: shoppingMode === 'information_led'
        ? 'Customers should shop in a direct and efficient way.'
        : 'Customers should shop in a visual and story-led way.'
    });
    expect(result.session.conversation_state.architecturePreferences.shopping_mode.value).toBe(shoppingMode);
  }
  const resources = await services.recommendedResources.ensure({ userId, projectId });
  const approvedResources = await services.creativeDirector.approveRecommendedResourceSet({
    userId,
    projectId,
    expectedRevisionId: resources.revision_id
  });
  expect(approvedResources.session.stage).toBe('offer');
  expect(approvedResources.resource_validation.complete).toBe(true);
  return approvedResources.session;
}

describe('fresh-project local production-adapter integration', () => {
  it('composes blank embedded bootstrap, discovery, architecture, billing, generation, QA, and durable reload without external transport', async () => {
    const directory = workspace();
    const env = environment(directory);
    const adapter = deterministicAdapter();
    const generatorCalls = [];
    const qaCalls = [];
    const qaResult = JSON.parse(fs.readFileSync(path.join(root, 'fixtures', 'merchant-generation-flow.json'), 'utf8')).qa_passed;
    const merchantFlowRuntime = {
      runtime_kind: 'local_external_transport_stub',
      async runRenderQa({ flow, artifact }) {
        qaCalls.push({ flow_id: flow.flow_id, artifact_id: artifact.artifact_id });
        return structuredClone(qaResult);
      }
    };
    let services = await createDashboardServices({
      root,
      env,
      clock: clockFactory(),
      shopifyAdapter: adapter,
      customThemeGenerator: fakeGenerator(generatorCalls),
      merchantFlowRuntime
    });
    const api = createDashboardApiHandler({ services });
    try {
      expect(await count(services, 'users')).toBe(0);
      expect(await count(services, 'organizations')).toBe(0);
      expect(await count(services, 'projects')).toBe(0);
      expect(await count(services, 'custom_theme_orders')).toBe(0);

      const token = signedEmbeddedSession();
      const firstLoads = await Promise.all(Array.from({ length: 4 }, () => invoke(api, {
        method: 'POST', url: '/api/auth/embedded', token, body: {}
      })));
      expect(firstLoads.every((response) => response.status === 200)).toBe(true);
      const firstIds = new Set(firstLoads.map((response) => response.payload.result.project.id));
      expect(firstIds.size).toBe(1);
      const owner = firstLoads[0].payload.result.user;
      const directProject = firstLoads[0].payload.result.project;
      const connection = await services.store.findShopifyConnectionByDomain(shop);
      const credential = await services.store.findShopifyCredentialEnvelope(connection.id);
      expect(await count(services, 'users')).toBe(1);
      expect(await count(services, 'organizations')).toBe(1);
      expect(await count(services, 'workspaces')).toBe(1);
      expect(await count(services, 'memberships')).toBe(1);
      expect(await count(services, 'shopify_connections')).toBe(1);
      expect(await count(services, 'shopify_embedded_identities')).toBe(1);
      expect(await count(services, 'shopify_credential_envelopes')).toBe(1);
      expect(await count(services, 'projects')).toBe(1);
      expect((await services.store.findMembership(connection.organization_id, owner.id)).role).toBe('owner');
      expect(credential.ciphertext).not.toContain(offlineToken);
      expect(owner.email).toMatch(/@embedded\.calinium\.invalid$/);

      const staffToken = signedEmbeddedSession({ userId: 'gid://shopify/User/fresh-staff' });
      const staff = await invoke(api, { method: 'POST', url: '/api/auth/embedded', token: staffToken, body: {} });
      expect(staff.status).toBe(200);
      expect((await services.store.findMembership(connection.organization_id, staff.payload.result.user.id)).role).toBe('editor');
      expect(await count(services, 'shopify_embedded_identities')).toBe(2);

      const invalid = await invoke(api, { method: 'POST', url: '/api/auth/embedded', token: signedEmbeddedSession({ secret: 'wrong-secret' }), body: {} });
      expect(invalid.status).toBe(401);
      const wrongShop = await invoke(api, { method: 'POST', url: '/api/auth/embedded', token: signedEmbeddedSession({ shopDomain: 'wrong-shop.myshopify.com' }), body: {} });
      expect([401, 403]).toContain(wrongShop.status);

      const outsider = await services.auth.register({
        email: 'fresh-project-outsider@example.com',
        password: 'fresh-project-outsider-password',
        fullName: 'Outside fixture',
        organizationName: 'Outside fixture',
        ipAddress: '127.0.0.9'
      });
      await expect(services.merchantIntake.get({ userId: outsider.user.id, projectId: directProject.id }))
        .rejects.toMatchObject({ code: 'permission_denied' });

      await prepareProject(services, { userId: owner.id, projectId: directProject.id, shoppingMode: 'information_led' });
      const direct = await services.merchantFlow.start({ userId: owner.id, projectId: directProject.id });
      expect(direct.flow).toMatchObject({ state: 'architecture_frozen', question: null });
      expect(JSON.stringify(direct.flow)).not.toMatch(/profile\.|Current Calinium|Editorial Discovery|score/i);
      const directInternal = (await services.store.findCreativeDirectorForProject(directProject.id)).generation_state.merchant_flow;
      expect(directInternal.context.architecture_selection.profile_id).toBe('profile.current_calinium.v1');

      const frozenDirection = await services.creativeDirection.ensure({ userId: owner.id, projectId: directProject.id });
      expect(frozenDirection.approvable).toBe(true);
      await services.creativeDirector.approveCreativeDirection({
        userId: owner.id,
        projectId: directProject.id,
        expectedRecommendationRevisionId: frozenDirection.revision_id,
        expectedDnaRevisionId: frozenDirection.design_dna.revision_id
      });

      const review = await services.customThemes.eligibility({ userId: owner.id, projectId: directProject.id });
      expect(review.eligibility).toMatchObject({ eligible: true, readiness: { status: 'ready' } });
      const orderResult = await services.customThemes.createOrder({
        userId: owner.id,
        projectId: directProject.id,
        idempotencyKey: 'fresh-project-paid-snapshot',
        expectedReadinessToken: review.eligibility.readiness_token
      });
      expect(orderResult).toMatchObject({ created: true, order: { payment_status: 'pending' }, checkout: { redirect_url: expect.stringMatching(/^https:\/\//) } });
      const billing = await services.store.findCustomThemeBillingPurchaseForOrder(orderResult.order.id);
      adapter.setPurchaseStatus(billing.provider_purchase_id, 'ACTIVE');
      const completed = await services.customThemes.verifyPayment({
        userId: owner.id,
        projectId: directProject.id,
        orderId: orderResult.order.id,
        idempotencyKey: 'fresh-project-payment-return'
      });
      const completedRecord = await services.store.findCustomThemeOrderForProject(orderResult.order.id, directProject.id, directProject.organization_id);
      expect(completed.order.generation_status, JSON.stringify(completedRecord.validation_result?.operation_failure || completed.order.validation_result)).toBe('ready');
      expect(completed.order.payment_status).toBe('paid');
      const finishedFlow = await services.merchantFlow.status({ userId: owner.id, projectId: directProject.id });
      expect(finishedFlow.flow).toMatchObject({ state: 'preview_ready', merchant_status: { code: 'ready_to_preview' } });
      expect(generatorCalls).toHaveLength(1);
      expect(qaCalls).toHaveLength(1);
      expect(await count(services, 'custom_theme_orders', 'WHERE project_id = $1', [directProject.id])).toBe(1);
      expect(await count(services, 'custom_theme_generation_runs')).toBe(1);
      const paidOrder = await services.store.findCustomThemeOrderForProject(orderResult.order.id, directProject.id, directProject.organization_id);
      expect(paidOrder.snapshot_id).toMatch(/^cts_/);
      expect(paidOrder.snapshot_checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(paidOrder.snapshot.generation_approval_binding.architecture_selection.selection_revision_id).toBe(directInternal.context.architecture_selection.revision_id);
      expect(JSON.stringify(paidOrder.snapshot)).not.toMatch(/direct and efficient|gid:\/\/shopify\/User/i);
      expect(paidOrder.validation_result.artifact_integrity.artifacts.theme_zip.sha256).toMatch(/^[a-f0-9]{64}$/);

      const replayed = await services.customThemes.verifyPayment({
        userId: owner.id,
        projectId: directProject.id,
        orderId: orderResult.order.id,
        idempotencyKey: 'fresh-project-payment-return-retry'
      });
      expect(replayed.order).toMatchObject({ payment_status: 'paid', generation_status: 'ready' });
      expect(generatorCalls).toHaveLength(1);
      expect(qaCalls).toHaveLength(1);

      const ambiguousProject = (await services.projects.createProject({
        userId: owner.id,
        input: { name: 'Fresh Project Ambiguous', business_name: 'Fresh Project Ambiguous', country: 'US' }
      })).project;
      const selected = await invoke(api, {
        method: 'POST',
        url: '/api/auth/embedded',
        token,
        body: { project_id: ambiguousProject.id }
      });
      expect(selected).toMatchObject({ status: 200, payload: { result: { project: { id: ambiguousProject.id } } } });
      await prepareProject(services, { userId: owner.id, projectId: ambiguousProject.id });
      const paused = await services.merchantFlow.start({ userId: owner.id, projectId: ambiguousProject.id });
      expect(paused).toMatchObject({ prompt_delivery_required: true, flow: { state: 'awaiting_material_answer' } });
      expect(paused.flow.question.prompt).toBe('When customers shop, should the experience feel more visual and story-led, or more direct and efficient?');
      const pinned = (await services.store.findCreativeDirectorForProject(ambiguousProject.id)).generation_state.merchant_flow;
      const resolved = await services.merchantFlow.answer({
        userId: owner.id,
        projectId: ambiguousProject.id,
        flowId: paused.flow.flow_id,
        questionId: paused.flow.question.question_id,
        message: 'Visual and story-led',
        expectedFlowChecksum: pinned.checksum
      });
      expect(resolved.flow).toMatchObject({ state: 'architecture_frozen', question: null });
      const ambiguousInternal = (await services.store.findCreativeDirectorForProject(ambiguousProject.id)).generation_state.merchant_flow;
      expect(ambiguousInternal.context.architecture_selection.profile_id).toBe('profile.editorial_discovery.v1');
      expect(ambiguousInternal.history.filter((entry) => entry.event === 'material_question_prepared')).toHaveLength(1);
      expect(ambiguousInternal.context.architecture_selection.material_clarification.rerun_count).toBe(1);
      await expect(services.merchantFlow.answer({
        userId: owner.id,
        projectId: ambiguousProject.id,
        flowId: paused.flow.flow_id,
        questionId: paused.flow.question.question_id,
        message: 'Direct and efficient'
      })).rejects.toMatchObject({ code: 'merchant_flow_answer_invalid' });

      const observedThemes = await services.store.listShopifyResources(connection.id, { resourceType: 'theme', availability: 'available' });
      expect(observedThemes.map((item) => item.metadata.role).sort()).toEqual(['DEVELOPMENT', 'MAIN']);
      expect(adapter.calls.filter((call) => call.method === 'listResourcePage' && call.resourceType === 'product').map((call) => call.after))
        .toEqual(expect.arrayContaining([null, '1']));
      expect(new Set(adapter.calls.filter((call) => call.method === 'listResourcePage').map((call) => call.resourceType)))
        .toEqual(new Set(['product', 'collection', 'menu', 'file', 'market', 'theme']));
      expect(adapter.calls.some((call) => call.method === 'preparePreview')).toBe(false);
      expect(DISCOVERY_SCOPES).not.toContain('write_themes');
      expect(adapter.calls.every((call) => ['exchangeSessionToken', 'inspectConnection', 'listResourcePage', 'createOneTimePurchase', 'getOneTimePurchase'].includes(call.method))).toBe(true);
      expect(await count(services, 'merchant_flow_preview_provenance_recoveries')).toBe(0);
      expect(await count(services, 'merchant_flow_render_target_successions')).toBe(0);

      const directProjectId = directProject.id;
      const ownerId = owner.id;
      await services.close();
      services = await createDashboardServices({
        root,
        env,
        clock: clockFactory(),
        shopifyAdapter: adapter,
        customThemeGenerator: fakeGenerator(generatorCalls),
        merchantFlowRuntime
      });
      const recovered = await services.merchantFlow.status({ userId: ownerId, projectId: directProjectId });
      expect(recovered.flow).toMatchObject({ state: 'preview_ready', merchant_status: { code: 'ready_to_preview' } });
      expect(await count(services, 'custom_theme_orders', 'WHERE project_id = $1', [directProjectId])).toBe(1);
      expect(await count(services, 'custom_theme_generation_runs')).toBe(1);
      expect(generatorCalls).toHaveLength(1);
      expect(qaCalls).toHaveLength(1);
    } finally {
      await services.close().catch(() => {});
      for (const output of generatedWorkspaces.splice(0)) {
        const outputRoot = path.resolve(root, 'output');
        const relative = path.relative(outputRoot, path.resolve(output));
        if (/^generation-run-order-[A-Za-z0-9_-]+-attempt-\d+$/.test(relative)) fs.rmSync(output, { recursive: true, force: true });
      }
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }, 60000);
});
