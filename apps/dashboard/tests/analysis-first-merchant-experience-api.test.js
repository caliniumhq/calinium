import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardApiHandler } = require('../server/dashboard-api.cjs');
const env = { SHOPIFY_API_KEY: 'f1b-shopify-client', SHOPIFY_API_SECRET: 'f1b-shopify-secret' };

function signedSession() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ aud: env.SHOPIFY_API_KEY, dest: 'https://fixture.myshopify.com', exp: Math.floor(Date.now() / 1000) + 60, iss: 'https://fixture.myshopify.com/admin', sub: 'user-f1-b' })).toString('base64url');
  const signature = crypto.createHmac('sha256', env.SHOPIFY_API_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function invoke(api, { method = 'GET', path, body, authenticated = true, cookieOnly = false } = {}) {
  const request = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  Object.assign(request, {
    method,
    url: path,
    headers: {
      host: 'dashboard.test',
      origin: 'http://dashboard.test',
      ...(authenticated && !cookieOnly ? { authorization: `Bearer ${signedSession()}` } : {}),
      ...(cookieOnly ? { cookie: 'calinium_dashboard_session=session-test; calinium_dashboard_csrf=csrf-test', 'x-csrf-token': 'csrf-test' } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' })
    },
    socket: { remoteAddress: '127.0.0.1' }
  });
  const response = { status: 0, headers: {}, body: '', setHeader(name, value) { this.headers[name] = value; }, writeHead(status, headers) { this.status = status; this.headers = { ...this.headers, ...headers }; }, end(value = '') { this.body += value; } };
  await api(request, response);
  return { status: response.status, payload: JSON.parse(response.body) };
}

function handler() {
  const experience = {
    project: vi.fn(async () => ({ eligible: false, fallback: 'existing_interface', projection: null })),
    selectDirection: vi.fn(async () => ({ eligible: true })),
    telemetry: vi.fn(async () => ({ recorded: true, event_name: 'analysis_first_journey_viewed' }))
  };
  const services = {
    env,
    auth: { authenticate: vi.fn(async (token) => token === 'session-test' ? { user: { id: 'user-f1-b' } } : null) },
    embeddedAuth: { resolveActor: vi.fn(async () => ({ user: { id: 'user-f1-b' }, identity: { organization_id: 'organization-f1-b' }, connection: { id: 'connection-f1-b' } })) },
    projects: { authorizeShopifyProjectContext: vi.fn(async () => true) },
    analysisFirstExperience: experience
  };
  return { api: createDashboardApiHandler({ services, env }), experience };
}

describe('analysis-first project API', () => {
  it('requires an embedded, authenticated, project-scoped actor for projection GET', async () => {
    const { api, experience } = handler();
    const denied = await invoke(api, { path: '/api/projects/project-f1-b/analysis-first-experience', cookieOnly: true });
    expect(denied.status).toBe(401);
    expect(denied.payload.error.code).toBe('shopify_embedded_session_missing');
    const allowed = await invoke(api, { path: '/api/projects/project-f1-b/analysis-first-experience' });
    expect(allowed.status).toBe(200);
    expect(experience.project).toHaveBeenCalledWith({ userId: 'user-f1-b', projectId: 'project-f1-b' });
  });

  it('requires the embedded session and delegates one bounded direction mutation', async () => {
    const { api, experience } = handler();
    const denied = await invoke(api, { method: 'POST', path: '/api/projects/project-f1-b/analysis-first-experience/direction', body: {}, cookieOnly: true });
    expect(denied.status).toBe(401);
    const allowed = await invoke(api, { method: 'POST', path: '/api/projects/project-f1-b/analysis-first-experience/direction', body: { direction_id: 'visual_story_led', action_binding: 'f1b_opaque' } });
    expect(allowed.status).toBe(200);
    expect(experience.selectDirection).toHaveBeenCalledWith({ userId: 'user-f1-b', projectId: 'project-f1-b', directionId: 'visual_story_led', actionBinding: 'f1b_opaque' });
  });

  it('delegates telemetry only through the authenticated mutation route', async () => {
    const { api, experience } = handler();
    const body = { event_name: 'analysis_first_journey_viewed', journey_stage: 'analyzing_store' };
    const response = await invoke(api, { method: 'POST', path: '/api/projects/project-f1-b/analysis-first-experience/telemetry', body });
    expect(response.status).toBe(200);
    expect(experience.telemetry).toHaveBeenCalledWith({ userId: 'user-f1-b', projectId: 'project-f1-b', input: body });
  });
});
