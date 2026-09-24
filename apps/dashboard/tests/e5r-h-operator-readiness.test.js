import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardApiHandler } = require('../server/dashboard-api.cjs');
const { DashboardError } = require('../server/lib/errors.cjs');
const { MerchantGenerationFlowService } = require('../server/services/merchant-generation-flow-service.cjs');

const env = {
  NODE_ENV: 'test',
  SHOPIFY_API_KEY: 'e5rh-shopify-client',
  SHOPIFY_API_SECRET: 'e5rh-shopify-secret'
};
const projectId = 'prj_e5rh_operator';
const organizationId = 'org_e5rh_operator';
const connectionId = 'shc_e5rh_operator';
const shop = 'controlled-e5rh.myshopify.com';

function signedSession({ userId = 'usr_e5rh_founder', shopDomain = shop } = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ aud: env.SHOPIFY_API_KEY, dest: `https://${shopDomain}`, exp: Math.floor(Date.now() / 1000) + 60, iss: `https://${shopDomain}/admin`, sub: userId })).toString('base64url');
  const signature = crypto.createHmac('sha256', env.SHOPIFY_API_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function invoke(api, { method = 'GET', url, token = null, body } = {}) {
  const request = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  Object.assign(request, {
    method,
    url,
    headers: { host: 'dashboard.test', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    socket: { remoteAddress: '127.0.0.1' }
  });
  const response = {
    status: null, headers: {}, body: '',
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    writeHead(status, headers) { this.status = status; this.headers = { ...this.headers, ...(headers || {}) }; },
    end(value = '') { this.body += value; }
  };
  await api(request, response);
  return { status: response.status, payload: JSON.parse(response.body) };
}

function readiness() {
  const ready = { ready: true, reason_code: null };
  return {
    schema_version: '1.0', readiness_revision: 'merchant-flow-controlled-beta-readiness-v1',
    beta_source_version: '9'.repeat(40), runtime_configuration_revision: 'merchant-flow-controlled-beta-runtime-v1',
    beta_feature_flag_status: 'enabled', status: 'READY', reason_codes: [], checked_at: '2026-08-26T12:00:00.000Z',
    components: Object.fromEntries(['configuration', 'source_attestation', 'beta_allowlist', 'database', 'artifact_storage', 'durable_job_storage', 'generation_worker', 'render_qa_worker', 'shopify_cli_runtime', 'shopify_cli_runtime_state', 'shopify_runtime_credentials', 'controlled_shopify_target', 'd1', 'd2_7_provider', 'operator_authorization', 'telemetry'].map((key) => [key, ready]))
  };
}

describe('E5R-H protected operator readiness', () => {
  it('is authorization-gated, read-only, and idempotent at the service boundary', async () => {
    const session = { generation_state: {} };
    const store = {
      findCreativeDirectorForProject: vi.fn(async () => session),
      createActivity: vi.fn(),
      createMerchantFlowOperationalEvent: vi.fn(),
      createMerchantFlowJob: vi.fn()
    };
    const operatorAuthorization = { authorize: vi.fn(async () => ({ project: { id: projectId, organization_id: organizationId } })) };
    const service = new MerchantGenerationFlowService({ root: process.cwd(), store, projectService: {}, operatorAuthorization });
    const loader = vi.fn(async () => readiness());
    const before = JSON.stringify(session);

    expect(await service.operatorReadinessAvailable({ projectId, userId: 'usr_e5rh_founder' })).toBe(true);
    expect((await service.operatorReadiness({ projectId, userId: 'usr_e5rh_founder', readinessLoader: loader })).status).toBe('READY');
    expect((await service.operatorReadiness({ projectId, userId: 'usr_e5rh_founder', readinessLoader: loader })).status).toBe('READY');
    expect(JSON.stringify(session)).toBe(before);
    expect(store.createActivity).not.toHaveBeenCalled();
    expect(store.createMerchantFlowOperationalEvent).not.toHaveBeenCalled();
    expect(store.createMerchantFlowJob).not.toHaveBeenCalled();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('projects the diagnostics action only for the explicitly authorized embedded actor', async () => {
    const operatorReadinessAvailable = vi.fn(async ({ userId }) => userId === 'usr_e5rh_founder');
    const services = {
      env,
      auth: { authenticate: vi.fn(async () => null) },
      embeddedAuth: {
        bootstrap: vi.fn(async ({ embeddedSession }) => ({
          user: { id: embeddedSession.user_id }, organizations: [], session: { token: 'http-only-session', expires_at: new Date(Date.now() + 60000).toISOString() },
          shop: { shop_domain: shop }, connection: { id: connectionId, organization_id: organizationId, shop_domain: shop, display_name: 'E5R-H' }
        }))
      },
      projects: { bootstrapShopifyProject: vi.fn(async () => ({ project: { id: projectId }, project_status: 'resumed', entry_path: `/projects/${projectId}/design` })) },
      merchantFlow: { operatorReadinessAvailable }
    };
    const api = createDashboardApiHandler({ services, env });
    const founder = await invoke(api, { method: 'POST', url: '/api/auth/embedded', token: signedSession(), body: {} });
    const merchant = await invoke(api, { method: 'POST', url: '/api/auth/embedded', token: signedSession({ userId: 'usr_e5rh_merchant' }), body: {} });

    expect(founder).toMatchObject({ status: 200, payload: { result: { operator_diagnostics_available: true } } });
    expect(merchant).toMatchObject({ status: 200, payload: { result: { operator_diagnostics_available: false } } });
    expect(JSON.stringify(founder.payload)).not.toContain('http-only-session');
  });

  it('uses the one protected embedded GET route and rejects missing, merchant, and cross-shop identities', async () => {
    const authorizeProject = vi.fn(async () => true);
    const operatorReadiness = vi.fn(async ({ userId }) => {
      if (userId !== 'usr_e5rh_founder') throw new DashboardError('merchant_flow_operator_forbidden', 'This operator action is not authorized.', 403);
      return readiness();
    });
    const services = {
      env,
      auth: { authenticate: vi.fn(async () => null) },
      embeddedAuth: {
        resolveActor: vi.fn(async ({ shopDomain, shopifyUserId }) => {
          if (shopDomain !== shop) throw new DashboardError('shopify_embedded_identity_invalid', 'This Shopify session is not authorized for the current workspace.', 403);
          return { user: { id: shopifyUserId }, identity: { organization_id: organizationId }, connection: { id: connectionId } };
        })
      },
      projects: { authorizeShopifyProjectContext: authorizeProject },
      merchantFlow: { operatorReadiness },
      controlledBetaReadiness: vi.fn(async () => readiness())
    };
    const api = createDashboardApiHandler({ services, env });
    const path = `/api/projects/${projectId}/merchant-generation-flow/operator/readiness`;

    expect(await invoke(api, { url: path })).toMatchObject({ status: 401, payload: { error: { code: 'authentication_required' } } });
    const founder = await invoke(api, { url: path, token: signedSession() });
    expect(founder).toMatchObject({ status: 200, payload: { result: { status: 'READY' } } });
    expect(authorizeProject).toHaveBeenCalledWith({ userId: 'usr_e5rh_founder', projectId, organizationId, connectionId });
    expect(operatorReadiness).toHaveBeenCalledWith({ projectId, userId: 'usr_e5rh_founder', readinessLoader: services.controlledBetaReadiness });
    expect(await invoke(api, { url: path, token: signedSession({ userId: 'usr_e5rh_merchant' }) })).toMatchObject({ status: 403, payload: { error: { code: 'merchant_flow_operator_forbidden' } } });
    expect(await invoke(api, { url: `${path}?id_token=must-not-be-used`, token: signedSession({ shopDomain: 'other-e5rh.myshopify.com' }) })).toMatchObject({ status: 403, payload: { error: { code: 'shopify_embedded_identity_invalid' } } });
  });
});
