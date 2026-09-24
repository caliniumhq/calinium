import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
  createMerchantFlowPreviewBindingResolver
} = require('../server/services/merchant-flow-preview-binding-resolver.cjs');
const { createDashboardApiHandler } = require('../server/dashboard-api.cjs');
const { DashboardError } = require('../server/lib/errors.cjs');
const { MerchantGenerationFlowService } = require('../server/services/merchant-generation-flow-service.cjs');
const {
  inspectThroughShopify,
  normalizeTheme,
  readinessEvidence
} = require('../server/services/merchant-flow-render-target-succession-resolver.cjs');
const { ShopifyAdminApiAdapter } = require('../server/shopify/admin-api-adapter.cjs');

const shop = 'controlled-preview.myshopify.com';
const previousThemeId = '100000000006';
const activeThemeId = '100000000005';
const apiEnv = { NODE_ENV: 'test', SHOPIFY_API_KEY: 'f1ja-preview-client', SHOPIFY_API_SECRET: 'f1ja-preview-secret' };

function signedSession() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    aud: apiEnv.SHOPIFY_API_KEY,
    dest: `https://${shop}`,
    exp: Math.floor(Date.now() / 1000) + 60,
    iss: `https://${shop}/admin`,
    sub: 'user-f1-ja-preview'
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', apiEnv.SHOPIFY_API_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function invokePreview(api, { method = 'GET', body = {} } = {}) {
  const request = Readable.from(method === 'GET' ? [] : [Buffer.from(JSON.stringify(body))]);
  Object.assign(request, {
    method,
    url: '/api/projects/project-f1-ja/shopify/preview',
    headers: {
      host: 'dashboard.test',
      authorization: `Bearer ${signedSession()}`,
      ...(method === 'POST' ? { 'content-type': 'application/json' } : {})
    },
    socket: { remoteAddress: '127.0.0.1' }
  });
  const response = {
    status: null,
    body: '',
    setHeader() {},
    writeHead(status) { this.status = status; },
    end(value = '') { this.body += value; }
  };
  await api(request, response);
  return { status: response.status, payload: JSON.parse(response.body) };
}

function previewRouteServices(resolveDirectShopifyPreview) {
  return {
    env: apiEnv,
    merchantFlowBetaEnabled: true,
    auth: { authenticate: vi.fn(async () => null) },
    embeddedAuth: {
      resolveActor: vi.fn(async () => ({
        user: { id: 'user-f1-ja-preview' },
        identity: { organization_id: 'organization-f1-ja' },
        connection: { id: 'connection-f1-ja' }
      }))
    },
    projects: { authorizeShopifyProjectContext: vi.fn(async () => true) },
    merchantFlow: { resolveDirectShopifyPreview },
    shopify: {
      previewStatus: vi.fn(async () => ({ preview: { status: 'ready', preview_url: `https://${shop}/?preview_theme_id=${previousThemeId}` } })),
      preparePreview: vi.fn(async () => ({ preview: { status: 'ready', preview_url: `https://${shop}/?preview_theme_id=${previousThemeId}` } }))
    }
  };
}

function flow() {
  return {
    flow_id: 'merchant-flow-f1-ja',
    project_id: 'project-f1-ja',
    organization_id: 'organization-f1-ja',
    state: 'preview_ready',
    store_context: { shop, connection_id: 'connection-f1-ja' },
    artifact: {
      artifact_id: 'artifact-f1-ja',
      checksum: 'a'.repeat(64),
      controlled_runtime_binding: {
        shop_domain: shop,
        theme_id: previousThemeId,
        expected_theme_role: 'development'
      }
    },
    render_qa: {
      preview_binding: {
        preview_reference: { url: `https://${shop}/?preview_theme_id=${previousThemeId}` }
      }
    }
  };
}

function controlledPreviewService({ generationId = 'generation-f1-ja', artifactGenerationId = generationId } = {}) {
  const controlledFlow = {
    ...flow(),
    generation: { generation_id: generationId },
    artifact: { ...flow().artifact, generation_id: artifactGenerationId }
  };
  const resolver = { resolve: vi.fn(() => ({ status: 'available', preview_url: `https://${shop}/?preview_theme_id=${activeThemeId}` })) };
  const service = new MerchantGenerationFlowService({
    root: process.cwd(),
    store: {
      findProjectById: vi.fn(async () => ({ id: 'project-f1-ja', organization_id: 'organization-f1-ja' })),
      findCreativeDirectorForProject: vi.fn(async () => ({ generation_state: { merchant_flow: controlledFlow } })),
      findProjectShopifyConnection: vi.fn(async () => ({ connection: { shop_domain: shop } })),
      listMerchantFlowPreviewProvenanceRecoveries: vi.fn(async () => [])
    },
    projectService: { requireMembership: vi.fn(async () => true) },
    controlledRuntimeConfiguration: { enabled: true, controlled_shop_domains: [shop] },
    previewBindingResolver: resolver
  });
  service.flowFromSession = vi.fn(() => controlledFlow);
  return { service, resolver };
}

function fallbackInventoryService(listResourcePage) {
  return {
    store: {
      findProjectShopifyConnection: vi.fn(async () => ({
        connection: {
          id: 'connection-f1-ja',
          shop_domain: shop,
          connection_status: 'ready',
          credential_status: 'active'
        }
      }))
    },
    connectionAccess: vi.fn(async () => 'opaque-test-access'),
    adapter: { listResourcePage }
  };
}

describe('F1-JA stale preview suppression', () => {
  it('suppresses an existing preview before binding or legacy evidence resolution when the configured target has succeeded it', () => {
    const legacyEvidenceLoader = vi.fn(() => { throw new Error('legacy evidence must not be read'); });
    const legacyCandidateLoader = vi.fn(() => { throw new Error('legacy candidates must not be read'); });
    const resolver = createMerchantFlowPreviewBindingResolver({
      root: process.cwd(),
      renderTargets: [{ shop_domain: shop, theme_id: activeThemeId, expected_theme_role: 'development' }],
      legacyEvidenceLoader,
      legacyCandidateLoader
    });

    expect(resolver.resolve({ flow: flow(), canonicalShop: shop })).toEqual({
      status: 'needs_attention',
      source: null,
      binding: null,
      recovery: null,
      preview_url: null,
      reason_code: 'render_target_superseded'
    });
    expect(legacyEvidenceLoader).not.toHaveBeenCalled();
    expect(legacyCandidateLoader).not.toHaveBeenCalled();
  });

  it('does not prepare legacy recovery for a superseded target', () => {
    const legacyEvidenceLoader = vi.fn(() => { throw new Error('legacy evidence must not be read'); });
    const resolver = createMerchantFlowPreviewBindingResolver({
      root: process.cwd(),
      sourceRevision: 'b'.repeat(40),
      renderTargets: [{ shop_domain: shop, theme_id: activeThemeId, expected_theme_role: 'development' }],
      legacyEvidenceLoader
    });

    expect(resolver.prepareRecovery({ flow: flow(), canonicalShop: shop })).toEqual({
      contract_version: 'merchant-flow-preview-provenance-recovery-submission-v1',
      available: false
    });
    expect(legacyEvidenceLoader).not.toHaveBeenCalled();
  });

  it.each(['GET', 'POST'])('fails the direct %s preview route closed before stale legacy rows can be returned or written', async (method) => {
    const guard = vi.fn(async () => {
      throw new DashboardError('render_target_superseded', 'The controlled storefront preview target has been superseded.', 409);
    });
    const services = previewRouteServices(guard);
    const api = createDashboardApiHandler({ services, env: apiEnv });
    const response = await invokePreview(api, { method, body: { generated_build_id: 'generation-f1-ja' } });

    expect(response).toMatchObject({ status: 409, payload: { error: { code: 'render_target_superseded' } } });
    expect(guard).toHaveBeenCalledWith({
      userId: 'user-f1-ja-preview',
      projectId: 'project-f1-ja',
      operation: method === 'POST' ? 'prepare' : 'read',
      generatedBuildId: method === 'POST' ? 'generation-f1-ja' : null
    });
    expect(services.shopify.previewStatus).not.toHaveBeenCalled();
    expect(services.shopify.preparePreview).not.toHaveBeenCalled();
  });

  it('returns the authoritative current-target binding for controlled GET and POST without legacy persistence', async () => {
    const authoritative = {
      preview: { status: 'ready', preview_url: `https://${shop}/?preview_theme_id=${activeThemeId}` },
      authoritative_source: 'merchant_flow_preview_binding',
      write_performed: false,
      deployment_eligible: false
    };
    const services = previewRouteServices(vi.fn(async () => ({ applies: true, result: authoritative })));
    const api = createDashboardApiHandler({ services, env: apiEnv });

    expect(await invokePreview(api)).toMatchObject({ status: 200, payload: { ok: true, result: authoritative } });
    expect(await invokePreview(api, { method: 'POST', body: { generated_build_id: 'generation-f1-ja' } }))
      .toMatchObject({ status: 200, payload: { ok: true, result: authoritative } });
    expect(services.shopify.previewStatus).not.toHaveBeenCalled();
    expect(services.shopify.preparePreview).not.toHaveBeenCalled();
  });

  it('preserves direct legacy preview reads and writes only when no controlled merchant flow applies', async () => {
    const services = previewRouteServices(vi.fn(async () => ({ applies: false, result: null })));
    const api = createDashboardApiHandler({ services, env: apiEnv });

    expect(await invokePreview(api)).toMatchObject({ status: 200, payload: { result: { preview: { status: 'ready' } } } });
    expect(await invokePreview(api, { method: 'POST', body: { generated_build_id: 'legacy-generation' } }))
      .toMatchObject({ status: 200, payload: { result: { preview: { status: 'ready' } } } });
    expect(services.shopify.previewStatus).toHaveBeenCalledTimes(1);
    expect(services.shopify.preparePreview).toHaveBeenCalledTimes(1);
  });

  it('rejects embedded cross-project context before resolving or returning a preview', async () => {
    const guard = vi.fn(async () => ({ applies: true, result: {} }));
    const services = previewRouteServices(guard);
    services.projects.authorizeShopifyProjectContext.mockRejectedValueOnce(
      new DashboardError('shopify_project_access_denied', 'This project is not available for the current Shopify store.', 403)
    );
    const api = createDashboardApiHandler({ services, env: apiEnv });

    expect(await invokePreview(api)).toMatchObject({
      status: 403,
      payload: { error: { code: 'shopify_project_access_denied' } }
    });
    expect(guard).not.toHaveBeenCalled();
    expect(services.shopify.previewStatus).not.toHaveBeenCalled();
  });

  it('requires controlled POST to name the exact active generation and artifact generation', async () => {
    const missing = controlledPreviewService();
    await expect(missing.service.resolveDirectShopifyPreview({
      userId: 'user-f1-ja-preview', projectId: 'project-f1-ja', operation: 'prepare'
    })).rejects.toMatchObject({ code: 'merchant_flow_preview_build_required', status: 422 });
    expect(missing.resolver.resolve).not.toHaveBeenCalled();

    const wrong = controlledPreviewService();
    await expect(wrong.service.resolveDirectShopifyPreview({
      userId: 'user-f1-ja-preview', projectId: 'project-f1-ja', operation: 'prepare', generatedBuildId: 'generation-stale'
    })).rejects.toMatchObject({ code: 'merchant_flow_preview_build_mismatch', status: 409 });
    expect(wrong.resolver.resolve).not.toHaveBeenCalled();

    const internallyDiverged = controlledPreviewService({ artifactGenerationId: 'generation-stale' });
    await expect(internallyDiverged.service.resolveDirectShopifyPreview({
      userId: 'user-f1-ja-preview', projectId: 'project-f1-ja', operation: 'prepare', generatedBuildId: 'generation-f1-ja'
    })).rejects.toMatchObject({ code: 'merchant_flow_preview_build_mismatch', status: 409 });
    expect(internallyDiverged.resolver.resolve).not.toHaveBeenCalled();

    const exact = controlledPreviewService();
    await expect(exact.service.resolveDirectShopifyPreview({
      userId: 'user-f1-ja-preview', projectId: 'project-f1-ja', operation: 'prepare', generatedBuildId: 'generation-f1-ja'
    })).resolves.toMatchObject({ applies: true, result: { preview: { generated_build_id: 'generation-f1-ja' } } });
    expect(exact.resolver.resolve).toHaveBeenCalledTimes(1);
  });
});

describe('F1-JA authoritative theme-inventory pagination', () => {
  const malformedPages = [
    ['missing pagination object', { nodes: [] }],
    ['null pagination object', { nodes: [], page_info: null }],
    ['missing hasNextPage', { nodes: [], page_info: { endCursor: null } }],
    ['non-boolean hasNextPage', { nodes: [], page_info: { hasNextPage: 'false', endCursor: null } }],
    ['missing continuation cursor', { nodes: [], page_info: { hasNextPage: true, endCursor: null } }],
    ['adapter-defaulted pagination', { nodes: [], page_info: { hasNextPage: false, endCursor: null }, page_info_explicit: false }]
  ];

  it.each(malformedPages)('fails closed for %s', async (_label, page) => {
    const shopifyService = fallbackInventoryService(vi.fn(async () => page));
    await expect(inspectThroughShopify({ shopifyService, flow: flow(), clock: () => new Date('2026-09-09T21:00:00.000Z') }))
      .rejects.toMatchObject({ code: 'merchant_flow_render_target_succession_inventory_incomplete' });
  });

  it('proves complete inventory only after following explicit pagination to a terminal page', async () => {
    const listResourcePage = vi.fn(async ({ after }) => after === null
      ? {
          nodes: [{ id: 'gid://shopify/OnlineStoreTheme/main', role: 'MAIN' }],
          pageInfo: { hasNextPage: true, endCursor: 'theme-cursor-1' },
          page_info_explicit: true
        }
      : {
          nodes: [{ id: 'gid://shopify/OnlineStoreTheme/development', role: 'DEVELOPMENT' }],
          page_info: { hasNextPage: false, endCursor: null },
          page_info_explicit: true
        });
    const shopifyService = fallbackInventoryService(listResourcePage);

    await expect(inspectThroughShopify({ shopifyService, flow: flow(), clock: () => new Date('2026-09-09T21:00:00.000Z') }))
      .resolves.toMatchObject({ authoritative_source: 'shopify_admin_api', complete: true, themes: [{ role: 'MAIN' }, { role: 'DEVELOPMENT' }] });
    expect(listResourcePage).toHaveBeenNthCalledWith(1, expect.objectContaining({ after: null, resourceType: 'theme' }));
    expect(listResourcePage).toHaveBeenNthCalledWith(2, expect.objectContaining({ after: 'theme-cursor-1', resourceType: 'theme' }));
  });

  it('marks pagination synthesized by the live Admin adapter as non-authoritative', async () => {
    const adapter = new ShopifyAdminApiAdapter({ fetchImpl: null });
    adapter.graphql = vi.fn(async () => ({ themes: { nodes: [] } }));

    await expect(adapter.listResourcePage({ shopDomain: shop, accessToken: 'opaque-test-access', resourceType: 'theme' }))
      .resolves.toMatchObject({ page_info: { hasNextPage: false, endCursor: null }, page_info_explicit: false });
  });
});

describe('F1-JA readiness timestamp validation', () => {
  const current = new Date('2026-09-09T21:00:00.000Z');
  const valid = {
    status: 'READY',
    snapshot_id: `controlled-readiness-snapshot-${'a'.repeat(20)}`,
    snapshot_checksum: 'b'.repeat(64),
    binding_checksum: 'c'.repeat(64),
    checked_at: '2026-09-09T20:59:00.000Z',
    valid_until: '2026-09-09T21:05:00.000Z'
  };

  it.each([
    ['checked_at', 'not-a-date'],
    ['valid_until', 'not-a-date']
  ])('rejects an invalid %s before authority inspection', (field, value) => {
    expect(readinessEvidence({ ...valid, [field]: value }, () => current)).toBeNull();
  });

  it('retains valid evidence and the existing expiry boundary', () => {
    expect(readinessEvidence(valid, () => current)).toMatchObject({ status: 'READY', checked_at: valid.checked_at, valid_until: valid.valid_until });
    expect(readinessEvidence({ ...valid, valid_until: current.toISOString() }, () => current)).toBeNull();
  });
});

describe('F1-JA authoritative theme processing evidence', () => {
  const base = { id: 'gid://shopify/OnlineStoreTheme/100000000005', role: 'DEVELOPMENT' };

  it('rejects nodes missing either observed boolean processing field', () => {
    expect(normalizeTheme(base)).toBeNull();
    expect(normalizeTheme({ ...base, processing: false })).toBeNull();
    expect(normalizeTheme({ ...base, processingFailed: false })).toBeNull();
    expect(normalizeTheme({ ...base, processing: false, processingFailed: 'false' })).toBeNull();
  });

  it('retains explicit camel-case and normalized snake-case processing evidence', () => {
    expect(normalizeTheme({ ...base, processing: false, processingFailed: false })).toMatchObject({ processing: false, processing_failed: false });
    expect(normalizeTheme({ ...base, processing: true, processing_failed: false })).toMatchObject({ processing: true, processing_failed: false });
  });
});
