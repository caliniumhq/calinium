import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardApiHandler } = require('../server/dashboard-api.cjs');
const { DashboardError } = require('../server/lib/errors.cjs');

const env = { NODE_ENV: 'test', SHOPIFY_API_KEY: 'f1e-client', SHOPIFY_API_SECRET: 'f1e-secret' };
const projectId = 'prj_f1e';
const shop = 'controlled-f1e.myshopify.com';

function token(userId = 'usr_f1e_founder') {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ aud: env.SHOPIFY_API_KEY, dest: `https://${shop}`, exp: Math.floor(Date.now() / 1000) + 60, iss: `https://${shop}/admin`, sub: userId })).toString('base64url');
  const signature = crypto.createHmac('sha256', env.SHOPIFY_API_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function invoke(api, { method = 'POST', auth = null, body = {} } = {}) {
  const request = Readable.from(method === 'GET' ? [] : [Buffer.from(JSON.stringify(body))]);
  Object.assign(request, {
    method, url: `/api/projects/${projectId}/merchant-generation-flow/operator/recover-preview-provenance`,
    headers: { host: 'dashboard.test', ...(auth ? { authorization: `Bearer ${auth}` } : {}), ...(method === 'GET' ? {} : { 'content-type': 'application/json' }) },
    socket: { remoteAddress: '127.0.0.1' }
  });
  const response = { status: null, body: '', setHeader() {}, writeHead(status) { this.status = status; }, end(value = '') { this.body += value; } };
  await api(request, response);
  return { status: response.status, payload: JSON.parse(response.body) };
}

function services() {
  const recoverPreviewProvenance = vi.fn(async ({ userId, request }) => {
    if (userId !== 'usr_f1e_founder') throw new DashboardError('merchant_flow_operator_forbidden', 'This operator action is not authorized.', 403);
    return { operation: { status: 'applied' }, replayed: false, request };
  });
  return {
    env,
    auth: { authenticate: vi.fn(async () => null) },
    embeddedAuth: { resolveActor: vi.fn(async ({ shopifyUserId }) => ({ user: { id: shopifyUserId }, identity: { organization_id: 'org_f1e' }, connection: { id: 'shc_f1e' } })) },
    projects: { authorizeShopifyProjectContext: vi.fn(async () => true) },
    merchantFlow: { recoverPreviewProvenance }
  };
}

describe('F1-E preview provenance recovery API boundary', () => {
  it('requires embedded authentication, POST, and the server-bounded request', async () => {
    const scoped = services();
    const api = createDashboardApiHandler({ services: scoped, env });
    const request = { contract_version: 'merchant-flow-preview-provenance-recovery-submission-v1', idempotency_key: 'a'.repeat(64) };
    expect(await invoke(api, { body: request })).toMatchObject({ status: 403, payload: { error: { code: 'csrf_invalid' } } });
    expect(await invoke(api, { method: 'GET', auth: token() })).toMatchObject({ status: 405, payload: { error: { code: 'method_not_allowed' } } });
    const accepted = await invoke(api, { auth: token(), body: request });
    expect(accepted).toMatchObject({ status: 200, payload: { result: { operation: { status: 'applied' } } } });
    expect(scoped.merchantFlow.recoverPreviewProvenance).toHaveBeenCalledWith({
      projectId,
      userId: 'usr_f1e_founder',
      request,
      requestId: expect.any(String)
    });
  });

  it('rejects client-supplied source identity and a non-operator actor', async () => {
    const scoped = services();
    const api = createDashboardApiHandler({ services: scoped, env });
    const injected = await invoke(api, { auth: token(), body: { contract_version: 'merchant-flow-preview-provenance-recovery-submission-v1', idempotency_key: 'a'.repeat(64), source_revision: 'b'.repeat(40) } });
    expect(injected).toMatchObject({
      status: 422,
      payload: { error: {
        code: 'merchant_flow_preview_provenance_recovery_request_invalid',
        details: { category: 'request_invalid', stage: 'request_validation', retryable: false, recovery: 'refresh_required', request_id: expect.any(String) }
      } }
    });
    expect(scoped.merchantFlow.recoverPreviewProvenance).not.toHaveBeenCalled();
    expect(await invoke(api, { auth: token('usr_f1e_merchant'), body: { contract_version: 'merchant-flow-preview-provenance-recovery-submission-v1', idempotency_key: 'a'.repeat(64) } })).toMatchObject({ status: 403, payload: { error: { code: 'merchant_flow_operator_forbidden' } } });
  });
});
