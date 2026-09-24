import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardServices } = require('../server/dashboard-services.cjs');
const { createDashboardApiHandler } = require('../server/dashboard-api.cjs');
const { CreativeDirectorService } = require('../server/services/creative-director-service.cjs');
const { DashboardError } = require('../server/lib/errors.cjs');
const { DeterministicShopifyAdapter } = require('../server/shopify/deterministic-shopify-adapter.cjs');
const { DISCOVERY_SCOPES } = require('../server/shopify/constants.cjs');

const root = path.resolve(process.cwd(), '../..');
const active = [];

function database() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-e5r-c-answer-')), 'dashboard.sqlite');
}

function runtime(file) {
  return {
    CALINIUM_SQLITE_PATH: file,
    APP_URL: 'https://dashboard.example',
    SHOPIFY_API_KEY: 'test-shopify-client',
    SHOPIFY_API_SECRET: 'test-shopify-session-secret',
    CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 27).toString('base64url'),
    CALINIUM_DASHBOARD_SESSION_SECRET: 'test-dashboard-session-secret-that-is-long-enough'
  };
}

function signedEmbeddedSession({ env, shop = 'fixture.myshopify.com', userId = 'gid://shopify/User/e5r-c-owner' }) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    aud: env.SHOPIFY_API_KEY,
    dest: `https://${shop}`,
    exp: Math.floor(Date.now() / 1000) + 60,
    iss: `https://${shop}/admin`,
    sub: userId
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', env.SHOPIFY_API_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function invoke(api, { method = 'GET', url, headers = {}, body = undefined }) {
  const request = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  Object.assign(request, { method, url, headers, socket: { remoteAddress: '127.0.0.1' } });
  const response = {
    status: null,
    headers: null,
    body: '',
    setHeader(name, value) { this.headers = { ...(this.headers || {}), [name.toLowerCase()]: value }; },
    writeHead(status, headers) { this.status = status; this.headers = { ...(this.headers || {}), ...headers }; },
    end(value = '') { this.body += value; }
  };
  await api(request, response);
  return { status: response.status, headers: response.headers || {}, payload: JSON.parse(response.body) };
}

async function fixture() {
  const env = runtime(database());
  const adapter = new DeterministicShopifyAdapter({ scopes: DISCOVERY_SCOPES });
  const services = await createDashboardServices({ root, env, shopifyAdapter: adapter });
  active.push(services);
  const api = createDashboardApiHandler({ services });
  const token = signedEmbeddedSession({ env });
  const embedded = await invoke(api, {
    method: 'POST',
    url: '/api/auth/embedded',
    headers: { host: 'dashboard.example', authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: {}
  });
  expect(embedded.status).toBe(200);
  const sessionCookie = embedded.headers['set-cookie']?.[0]?.split(';')[0] || null;
  expect(sessionCookie).toMatch(/^calinium_dashboard_session=/);
  const { user, project } = embedded.payload.result;
  const started = await services.creativeDirector.start({ userId: user.id, projectId: project.id });
  await services.store.updateCreativeDirector(project.id, { ...started.session, stage: 'resources' });
  const original = services.creativeDirector;
  services.creativeDirector = new CreativeDirectorService({
    root,
    store: services.store,
    projectService: services.projects,
    assetService: original.assetService,
    shopifyService: original.shopifyService,
    merchantIntakeService: original.merchantIntakeService,
    livePreviewService: original.livePreviewService,
    customThemeService: original.customThemeService,
    merchantFlowService: original.merchantFlowService,
    merchantFlowBetaEnabled: original.merchantFlowBetaEnabled,
    adapter: original.adapter,
    recommendationDesignService: {
      async refine() {
        throw new DashboardError('creative_refinement_unsupported', 'Not a bounded design refinement.', 422);
      }
    },
    recommendedResourceSetService: {
      async ensure() { return { revision_id: 'resource-revision-current' }; },
      async replaceFromConversation() {
        throw new DashboardError('resource_set_request_ambiguous', 'No exact resource matched.', 422);
      }
    },
    clock: () => new Date('2026-08-20T10:00:00.000Z')
  });
  return {
    env,
    services,
    api,
    token,
    user,
    project,
    started,
    sessionCookie,
    headers: { host: 'dashboard.example', authorization: `Bearer ${token}`, 'content-type': 'application/json' }
  };
}

function answerRequest(current, message, overrides = {}) {
  return {
    method: 'POST',
    url: `/api/projects/${current.project.id}/creative-director/respond`,
    headers: current.headers,
    body: {
      message,
      conversation_id: current.started.session.conversation_state.conversationId,
      expected_session_updated_at: current.started.session.updated_at,
      ...overrides
    }
  };
}

afterEach(async () => {
  await Promise.all(active.splice(0).map((services) => services.close()));
});

describe('E5R-C embedded Creative Director answer persistence', () => {
  it('persists a resolved shopping preference before post-conversation refinement routing', async () => {
    const current = await fixture();
    const response = await invoke(current.api, answerRequest(current, 'Customers should shop in a direct and efficient way.'));

    expect(response.status).toBe(200);
    expect(response.payload.result.session.conversation_state.architecturePreferences.shopping_mode).toMatchObject({
      value: 'information_led',
      source: 'merchant'
    });
    expect(response.payload.result.session.stage).toBe('resources');
    expect(response.payload.result.reused).toBe(false);
    expect(response.headers['x-request-id']).toMatch(/^req_/);
  });

  it('reuses retries and concurrent double submissions without duplicating the answer or transcript', async () => {
    const current = await fixture();
    const request = answerRequest(current, 'Customers should shop in a direct and efficient way.');
    const [first, second] = await Promise.all([invoke(current.api, request), invoke(current.api, request)]);
    expect([first.status, second.status]).toEqual([200, 200]);
    expect([first.payload.result.reused, second.payload.result.reused].sort()).toEqual([false, true]);
    const revisionIds = new Set([first, second].map((response) => response.payload.result.architecture_preference.revision_id));
    expect(revisionIds.size).toBe(1);

    const retried = await invoke(current.api, request);
    expect(retried).toMatchObject({ status: 200, payload: { result: { reused: true } } });
    const stored = await current.services.store.findCreativeDirectorForProject(current.project.id);
    expect(stored.transcript).toHaveLength(3);
    expect(stored.transcript.filter((entry) => entry.role === 'merchant')).toHaveLength(1);
    expect(await current.services.store.driver.get("SELECT COUNT(*) AS count FROM activity_events WHERE project_id = $1 AND type = 'creative_director_architecture_preference_saved'", [current.project.id])).toMatchObject({ count: 1 });
  });

  it('survives reload, rejects stale/conflicting answers, and never copies raw text into generation state', async () => {
    const current = await fixture();
    const accepted = await invoke(current.api, answerRequest(current, 'Customers should shop in a direct and efficient way.'));
    const saved = accepted.payload.result.session;
    const reloaded = await invoke(current.api, {
      url: `/api/projects/${current.project.id}/creative-director`,
      headers: current.headers
    });
    expect(reloaded.status).toBe(200);
    expect(reloaded.payload.result.session.conversation_state.architecturePreferences.shopping_mode.value).toBe('information_led');
    expect(JSON.stringify(reloaded.payload.result.session.generation_state)).not.toMatch(/direct and efficient/i);

    const stale = await invoke(current.api, answerRequest(current, 'Customers should shop in a direct and efficient way.', {
      expected_session_updated_at: '2026-01-01T00:00:00.000Z'
    }));
    expect(stale).toMatchObject({ status: 409, payload: { error: { code: 'creative_director_conversation_stale' } } });

    const conflict = await invoke(current.api, answerRequest(current, 'Customers should shop in a visual and story-led way.', {
      expected_session_updated_at: saved.updated_at
    }));
    expect(conflict).toMatchObject({ status: 409, payload: { error: { code: 'creative_director_shopping_mode_conflict' } } });
    const unchanged = await current.services.store.findCreativeDirectorForProject(current.project.id);
    expect(unchanged.conversation_state.architecturePreferences.shopping_mode.value).toBe('information_led');
    expect(unchanged.transcript).toHaveLength(3);
  });

  it('fails closed for missing bindings, malformed answers, unsupported values, wrong shops, and unbound projects', async () => {
    const current = await fixture();
    const missingBinding = await invoke(current.api, {
      ...answerRequest(current, 'Customers should shop directly.'),
      body: { message: 'Customers should shop directly.' }
    });
    expect(missingBinding).toMatchObject({ status: 422, payload: { error: { code: 'creative_director_answer_binding_required' } } });

    const malformed = await invoke(current.api, answerRequest(current, ''));
    expect(malformed).toMatchObject({ status: 422, payload: { error: { code: 'conversation_message_invalid' } } });

    const unsupported = await invoke(current.api, answerRequest(current, 'Yes, that sounds fine.'));
    expect(unsupported).toMatchObject({ status: 422, payload: { error: { code: 'resource_set_request_ambiguous' } } });
    expect((await current.services.store.findCreativeDirectorForProject(current.project.id)).conversation_state.architecturePreferences).toBeUndefined();

    const wrongShopToken = signedEmbeddedSession({ env: current.env, shop: 'other-store.myshopify.com' });
    const wrongShop = await invoke(current.api, {
      ...answerRequest(current, 'Customers should shop directly.'),
      headers: { ...current.headers, authorization: `Bearer ${wrongShopToken}` }
    });
    expect([401, 403]).toContain(wrongShop.status);

    const unbound = (await current.services.projects.createProject({
      userId: current.user.id,
      input: { name: 'Unbound project', business_name: 'Unbound project', country: 'US' }
    })).project;
    const unboundRequest = answerRequest(current, 'Customers should shop directly.');
    unboundRequest.url = `/api/projects/${unbound.id}/creative-director/respond`;
    const denied = await invoke(current.api, unboundRequest);
    expect(denied).toMatchObject({ status: 403, payload: { error: { code: 'shopify_project_access_denied' } } });
  });

  it('retains authentication, embedded request binding, CSRF, and active-membership enforcement', async () => {
    const current = await fixture();
    const request = answerRequest(current, 'Customers should shop in a direct and efficient way.');

    const unauthenticated = await invoke(current.api, { ...request, headers: { host: 'dashboard.example', 'content-type': 'application/json' } });
    expect(unauthenticated).toMatchObject({ status: 403, payload: { error: { code: 'csrf_invalid' } } });

    const standaloneWithoutCsrf = await invoke(current.api, {
      ...request,
      headers: { host: 'dashboard.example', origin: 'https://dashboard.example', cookie: current.sessionCookie, 'content-type': 'application/json' }
    });
    expect(standaloneWithoutCsrf).toMatchObject({ status: 403, payload: { error: { code: 'csrf_invalid' } } });

    const embeddedWithoutStandaloneCsrf = await invoke(current.api, request);
    expect(embeddedWithoutStandaloneCsrf.status).toBe(200);

    await current.services.store.driver.run(
      'UPDATE memberships SET status = $1 WHERE organization_id = $2 AND user_id = $3',
      ['suspended', current.project.organization_id, current.user.id]
    );
    const revoked = await invoke(current.api, request);
    expect(revoked).toMatchObject({ status: 403, payload: { error: { code: 'permission_denied' } } });
  });
});
