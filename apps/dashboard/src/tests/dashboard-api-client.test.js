import { describe, expect, it, vi } from 'vitest';
import { DashboardApiClient, DashboardApiError } from '../adapters/dashboard-api-client';

function response(payload, status = 200) { return { ok: status >= 200 && status < 300, status, json: async () => payload }; }

describe('DashboardApiClient', () => {
  it('establishes a CSRF token before sending an authenticated mutation', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ ok: true, result: { csrf_token: 'csrf-token' } }))
      .mockResolvedValueOnce(response({ ok: true, result: { project: { id: 'prj_test' } } }));
    const client = new DashboardApiClient({ fetchImpl });
    await client.createProject({ name: 'Bags' });
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/auth/csrf');
    expect(fetchImpl.mock.calls[1][0]).toBe('/api/projects');
    expect(fetchImpl.mock.calls[1][1].headers['x-csrf-token']).toBe('csrf-token');
    expect(fetchImpl.mock.calls[1][1].credentials).toBe('include');
  });

  it('uses an App Bridge session token only for the in-flight embedded API request', async () => {
    const idToken = vi.fn().mockResolvedValue('temporary-app-bridge-token');
    window.shopify = { idToken };
    const fetchImpl = vi.fn().mockResolvedValue(response({ ok: true, result: { project: { id: 'prj_test' } } }));
    try {
      const client = new DashboardApiClient({ fetchImpl });
      await client.createProject({ name: 'Bags' });
      expect(idToken).toHaveBeenCalledTimes(1);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(fetchImpl.mock.calls[0][0]).toBe('/api/projects');
      expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe('Bearer temporary-app-bridge-token');
      expect(fetchImpl.mock.calls[0][1].headers['x-csrf-token']).toBeUndefined();
      expect(client).not.toHaveProperty('sessionToken');
    } finally {
      delete window.shopify;
    }
  });

  it('retrieves a fresh App Bridge token for every embedded read and mutation', async () => {
    const idToken = vi.fn()
      .mockResolvedValueOnce('fresh-read-token')
      .mockResolvedValueOnce('fresh-write-token');
    window.shopify = { idToken };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ ok: true, result: { projects: [] } }))
      .mockResolvedValueOnce(response({ ok: true, result: { project: { id: 'prj_test' } } }));
    try {
      const client = new DashboardApiClient({ fetchImpl });
      await client.overview();
      await client.createProject({ name: 'Bags' });
      expect(idToken).toHaveBeenCalledTimes(2);
      expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe('Bearer fresh-read-token');
      expect(fetchImpl.mock.calls[1][1].headers.authorization).toBe('Bearer fresh-write-token');
      expect(fetchImpl.mock.calls[1][1].headers['x-csrf-token']).toBeUndefined();
    } finally {
      delete window.shopify;
    }
  });

  it('uses the normal App Bridge client path for protected operator readiness instead of an iframe query credential', async () => {
    const originalUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState({}, '', '/projects/prj_controlled/design?embedded=1&id_token=stale-navigation-credential');
    const idToken = vi.fn().mockResolvedValue('fresh-app-bridge-token');
    window.shopify = { idToken };
    const fetchImpl = vi.fn().mockResolvedValue(response({
      ok: true,
      result: { status: 'READY', readiness_revision: 'merchant-flow-controlled-beta-readiness-v1' }
    }));
    try {
      const client = new DashboardApiClient({ fetchImpl });
      const result = await client.merchantGenerationFlowOperatorReadiness('prj_controlled');
      expect(result).toMatchObject({ http_status: 200, status: 'READY' });
      expect(idToken).toHaveBeenCalledTimes(1);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(fetchImpl.mock.calls[0][0]).toBe('/api/projects/prj_controlled/merchant-generation-flow/operator/readiness');
      expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe('Bearer fresh-app-bridge-token');
      expect(fetchImpl.mock.calls[0][1].headers.authorization).not.toContain('stale-navigation-credential');
      expect(client).not.toHaveProperty('sessionToken');
    } finally {
      delete window.shopify;
      window.history.replaceState({}, '', originalUrl);
    }
  });

  it('uses a fresh App Bridge token and an immediate 202 for protected readiness refresh', async () => {
    const idToken = vi.fn().mockResolvedValue('fresh-refresh-token');
    window.shopify = { idToken };
    const fetchImpl = vi.fn().mockResolvedValue(response({
      ok: true,
      result: { status: 'ACCEPTED', refresh_revision: 'controlled-beta-readiness-refresh-v1', operation_id: 'controlled-readiness-refresh-1234567890abcdef1234' }
    }, 202));
    try {
      const client = new DashboardApiClient({ fetchImpl });
      const result = await client.merchantGenerationFlowOperatorReadinessRefresh('prj_controlled');
      expect(result).toMatchObject({ http_status: 202, status: 'ACCEPTED' });
      expect(idToken).toHaveBeenCalledTimes(1);
      expect(fetchImpl.mock.calls[0][0]).toBe('/api/projects/prj_controlled/merchant-generation-flow/operator/readiness/refresh');
      expect(fetchImpl.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include' });
      expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe('Bearer fresh-refresh-token');
      expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({});
    } finally {
      delete window.shopify;
    }
  });

  it('preserves bounded recovery status, code, and details as DashboardApiError', async () => {
    window.shopify = { idToken: vi.fn().mockResolvedValue('fresh-recovery-error-token') };
    const fetchImpl = vi.fn().mockResolvedValue(response({
      ok: false,
      error: {
        code: 'merchant_flow_preview_provenance_recovery_record_construction_failed',
        message: 'Preview recovery could not be completed safely.',
        details: { category: 'record_construction_failed', stage: 'record_construction', retryable: false }
      }
    }, 500));
    try {
      const client = new DashboardApiClient({ fetchImpl });
      let caught;
      try {
        await client.merchantGenerationFlowOperatorRecoverPreviewProvenance('prj_controlled', { idempotency_key: 'bounded-recovery-error' });
      } catch (error) { caught = error; }
      expect(caught).toBeInstanceOf(DashboardApiError);
      expect(caught).toMatchObject({
        status: 500,
        code: 'merchant_flow_preview_provenance_recovery_record_construction_failed',
        details: { category: 'record_construction_failed', stage: 'record_construction', retryable: false }
      });
    } finally {
      delete window.shopify;
    }
  });

  it('submits the saved founder review through the existing protected route with a fresh App Bridge token', async () => {
    const idToken = vi.fn().mockResolvedValue('fresh-founder-qa-token');
    window.shopify = { idToken };
    const fetchImpl = vi.fn().mockResolvedValue(response({
      ok: true,
      result: { operation: { status: 'applied' }, flow: { state: 'preview_ready' }, replayed: false }
    }));
    const submission = {
      flow_id: 'merchant-flow-e5rs', expected_flow_sequence: 26, expected_flow_checksum: 'a'.repeat(64),
      evidence: {
        evaluation: { id: 'evaluation-e5rs', checksum: 'b'.repeat(64), reference: 'output/evaluation.json' },
        review: { id: 'review-e5rs', checksum: 'c'.repeat(64), reference: 'output/review.json' }
      },
      decision: 'accepted', idempotency_key: 'merchant-flow-founder-qa-e5rs-fixed'
    };
    try {
      const client = new DashboardApiClient({ fetchImpl });
      const result = await client.merchantGenerationFlowOperatorQaReview('prj_controlled', submission);
      expect(result).toMatchObject({ operation: { status: 'applied' }, flow: { state: 'preview_ready' } });
      expect(idToken).toHaveBeenCalledTimes(1);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(fetchImpl.mock.calls[0][0]).toBe('/api/projects/prj_controlled/merchant-generation-flow/operator/qa-review');
      expect(fetchImpl.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include' });
      expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe('Bearer fresh-founder-qa-token');
      expect(fetchImpl.mock.calls[0][1].headers['idempotency-key']).toBe(submission.idempotency_key);
      expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual(submission);
      expect(client).not.toHaveProperty('sessionToken');
    } finally {
      delete window.shopify;
    }
  });

  it('recovers saved founder-review evidence through a fresh App Bridge request without supplying replacement content', async () => {
    const idToken = vi.fn().mockResolvedValue('fresh-founder-recovery-token');
    window.shopify = { idToken };
    const fetchImpl = vi.fn().mockResolvedValue(response({
      ok: true,
      result: { operation: { status: 'applied' }, flow: { state: 'qa_review_required', sequence: 26 }, replayed: false }
    }));
    const submission = {
      schema_version: '1.0',
      contract_version: 'merchant-flow-founder-qa-evidence-recovery-request-v1',
      organization_id: 'org_controlled', project_id: 'prj_controlled', flow_id: 'merchant-flow-e5ru',
      shop_domain: 'controlled.myshopify.com', expected_flow_sequence: 26, expected_flow_checksum: 'a'.repeat(64),
      evaluation: { id: 'evaluation-e5ru', checksum: 'b'.repeat(64), reference: 'output/merchant-flow-storefront-renders/e5ru/d2-7-evaluation.json' },
      review: { id: 'review-e5ru', checksum: 'c'.repeat(64) },
      corrupted_artifact: { reference: 'output/merchant-flow-storefront-renders/e5ru/d2-7-human-review-attempt-8.json', storage_sha256: 'd'.repeat(64) },
      idempotency_key: 'merchant-flow-founder-qa-recovery-e5ru-fixed'
    };
    try {
      const client = new DashboardApiClient({ fetchImpl });
      const result = await client.merchantGenerationFlowOperatorRecoverQaReviewEvidence('prj_controlled', submission);
      expect(result).toMatchObject({ operation: { status: 'applied' }, flow: { state: 'qa_review_required', sequence: 26 } });
      expect(idToken).toHaveBeenCalledTimes(1);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(fetchImpl.mock.calls[0][0]).toBe('/api/projects/prj_controlled/merchant-generation-flow/operator/recover-qa-review-evidence');
      expect(fetchImpl.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include' });
      expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe('Bearer fresh-founder-recovery-token');
      expect(fetchImpl.mock.calls[0][1].headers['idempotency-key']).toBe(submission.idempotency_key);
      expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual(submission);
      expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).not.toHaveProperty('recovered_json');
      expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).not.toHaveProperty('review_body');
      expect(client).not.toHaveProperty('sessionToken');
    } finally {
      delete window.shopify;
    }
  });

  it('binds a Creative Director answer to the loaded conversation and session revision', async () => {
    const idToken = vi.fn().mockResolvedValue('temporary-app-bridge-token');
    window.shopify = { idToken };
    const fetchImpl = vi.fn().mockResolvedValue(response({ ok: true, result: { session: {} } }));
    try {
      const client = new DashboardApiClient({ fetchImpl });
      await client.respondCreativeDirector('prj_test', 'Customers should shop directly.', {
        conversationId: 'creative-director-session',
        expectedSessionUpdatedAt: '2026-08-20T10:00:00.000Z'
      });
      expect(fetchImpl.mock.calls[0][0]).toBe('/api/projects/prj_test/creative-director/respond');
      expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe('Bearer temporary-app-bridge-token');
      expect(fetchImpl.mock.calls[0][1].headers['x-csrf-token']).toBeUndefined();
      expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
        message: 'Customers should shop directly.',
        conversation_id: 'creative-director-session',
        expected_session_updated_at: '2026-08-20T10:00:00.000Z'
      });
    } finally {
      delete window.shopify;
    }
  });

  it('bootstraps an embedded dashboard through Shopify instead of password endpoints', async () => {
    const idToken = vi.fn().mockResolvedValue('temporary-app-bridge-token');
    window.shopify = { idToken };
    const fetchImpl = vi.fn().mockResolvedValue(response({ ok: true, result: { user: { id: 'usr_embedded' }, organizations: [], embedded: true } }));
    try {
      const client = new DashboardApiClient({ fetchImpl });
      const result = await client.bootstrapEmbedded('prj_route-hint');
      expect(result).toMatchObject({ embedded: true, user: { id: 'usr_embedded' } });
      expect(fetchImpl).toHaveBeenCalledWith('/api/auth/embedded', expect.objectContaining({ method: 'POST', credentials: 'include' }));
      expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe('Bearer temporary-app-bridge-token');
      expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ project_id: 'prj_route-hint' });
      expect(fetchImpl.mock.calls[0][0]).not.toContain('sign-in');
      expect(fetchImpl.mock.calls[0][0]).not.toContain('sign-up');
    } finally {
      delete window.shopify;
    }
  });

  it('retains the initial embedded host for a later Shopify authorization callback', async () => {
    const host = btoa('admin.shopify.com/store/fixture').replace(/=/g, '');
    const originalUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState({}, '', `/?host=${host}&shop=fixture.myshopify.com&embedded=1`);
    const fetchImpl = vi.fn().mockResolvedValue(response({ ok: true, result: { authorization_url: 'https://fixture.myshopify.com/admin/oauth/authorize' } }));
    try {
      const client = new DashboardApiClient({ fetchImpl });
      await client.startShopifyConnection('prj_test', 'fixture.myshopify.com');
      expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({ shop_domain: 'fixture.myshopify.com', embedded_host: host });
    } finally {
      window.history.replaceState({}, '', originalUrl);
    }
  });

  it('uses project-scoped preset selection and approval endpoints without accepting a preset payload', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ ok: true, result: { csrf_token: 'csrf-token' } }))
      .mockResolvedValueOnce(response({ ok: true, result: { session: {} } }))
      .mockResolvedValueOnce(response({ ok: true, result: { session: {} } }));
    const client = new DashboardApiClient({ fetchImpl });
    await client.selectStorefrontPreset('prj_test', 3, 'gallery');
    await client.approveStorefrontPreset('prj_test', 4);
    expect(fetchImpl.mock.calls[1][0]).toBe('/api/projects/prj_test/creative-director/preset-selection');
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({ method: 'PUT' });
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({ expected_version: 3, preset_id: 'gallery' });
    expect(fetchImpl.mock.calls[2][0]).toBe('/api/projects/prj_test/creative-director/approve-preset');
    expect(fetchImpl.mock.calls[2][1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(fetchImpl.mock.calls[2][1].body)).toEqual({ expected_version: 4 });
  });

  it('sends only current resource-set revision and bounded selection identifiers', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ ok: true, result: { csrf_token: 'csrf-token' } }))
      .mockResolvedValueOnce(response({ ok: true, result: { recommended_resource_set: {} } }))
      .mockResolvedValueOnce(response({ ok: true, result: { recommended_resource_set: {} } }));
    const client = new DashboardApiClient({ fetchImpl });
    await client.replaceRecommendedResource('prj_test', 'rrs_current', 'featured_product', 'shr_weekender');
    await client.approveRecommendedResourceSet('prj_test', 'rrs_next');
    expect(fetchImpl.mock.calls[1][0]).toBe('/api/projects/prj_test/recommended-resource-set/slots/featured_product/replace');
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({ expected_revision_id: 'rrs_current', selection_id: 'shr_weekender' });
    expect(fetchImpl.mock.calls[2][0]).toBe('/api/projects/prj_test/recommended-resource-set/approve');
    expect(JSON.parse(fetchImpl.mock.calls[2][1].body)).toEqual({ expected_revision_id: 'rrs_next' });
  });

  it('submits only explicit current resource-plan confirmations', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ ok: true, result: { csrf_token: 'csrf-token' } }))
      .mockResolvedValueOnce(response({ ok: true, result: { session: {}, resource_validation: {} } }));
    const client = new DashboardApiClient({ fetchImpl });
    await client.updateCreativeResources('prj_test', {}, {}, {}, [], ['review:verification:craftsmanship:methods'], 'd'.repeat(64));
    expect(fetchImpl.mock.calls[1][0]).toBe('/api/projects/prj_test/creative-director/resources');
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({
      asset_selections: {},
      required_asset_selections: {},
      shopify_selections: {},
      resolved_empty_fields: [],
      confirmed_required_confirmations: ['review:verification:craftsmanship:methods'],
      expected_resource_decision_checksum: 'd'.repeat(64)
    });
  });

  it('binds custom-theme order creation to the exact reviewed readiness token', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ ok: true, result: { csrf_token: 'csrf-token' } }))
      .mockResolvedValueOnce(response({ ok: true, result: { order: { id: 'cto_1' } } }));
    const client = new DashboardApiClient({ fetchImpl });
    await client.createCustomThemeOrder('prj_test', 'purchase-once', 'b'.repeat(64));
    expect(fetchImpl.mock.calls[1][0]).toBe('/api/projects/prj_test/custom-theme/orders');
    expect(fetchImpl.mock.calls[1][1].headers['idempotency-key']).toBe('purchase-once');
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({ idempotency_key: 'purchase-once', expected_readiness_token: 'b'.repeat(64) });
  });

  it('binds Merchant Flow resume to one deterministic flow-revision idempotency key', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ ok: true, result: { csrf_token: 'csrf-token' } }))
      .mockResolvedValueOnce(response({ ok: true, result: { flow: { state: 'render_qa_running' } } }));
    const checksum = 'c'.repeat(64);
    const client = new DashboardApiClient({ fetchImpl });
    await client.resumeMerchantGenerationFlow('prj_test', 'merchant-flow-test', checksum, 23);
    const request = fetchImpl.mock.calls[1][1];
    expect(request.headers['idempotency-key']).toBe(`merchant-flow-resume-${checksum}`);
    expect(JSON.parse(request.body)).toEqual({
      flow_id: 'merchant-flow-test',
      expected_flow_checksum: checksum,
      expected_flow_sequence: 23,
      idempotency_key: `merchant-flow-resume-${checksum}`
    });
  });

  it('uses the project-scoped Lookbook content-plan endpoints without exposing runtime data', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ ok: true, result: { csrf_token: 'csrf-token' } }))
      .mockResolvedValueOnce(response({ ok: true, result: { session: {} } }))
      .mockResolvedValueOnce(response({ ok: true, result: { session: {} } }))
      .mockResolvedValueOnce(response({ ok: true, result: { session: {} } }));
    const client = new DashboardApiClient({ fetchImpl });
    const frames = [{ image_asset_id: 'asset_approved', title: 'Approved frame', destination: { type: 'shopify_product', resource_id: 'spr_approved' } }];
    await client.saveLookbookPlan('prj_test', 3, frames);
    await client.regenerateLookbookPlan('prj_test', 4);
    await client.approveLookbookPlan('prj_test', 5);
    expect(fetchImpl.mock.calls[1][0]).toBe('/api/projects/prj_test/creative-director/lookbook-plan');
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({ method: 'PUT' });
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({ expected_version: 3, frames });
    expect(fetchImpl.mock.calls[2][0]).toBe('/api/projects/prj_test/creative-director/regenerate-lookbook-plan');
    expect(fetchImpl.mock.calls[2][1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(fetchImpl.mock.calls[2][1].body)).toEqual({ expected_version: 4 });
    expect(fetchImpl.mock.calls[3][0]).toBe('/api/projects/prj_test/creative-director/approve-lookbook-plan');
    expect(fetchImpl.mock.calls[3][1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(fetchImpl.mock.calls[3][1].body)).toEqual({ expected_version: 5 });
  });

  it('uses the project-scoped Craftsmanship content-plan endpoints without exposing runtime data', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ ok: true, result: { csrf_token: 'csrf-token' } }))
      .mockResolvedValueOnce(response({ ok: true, result: { session: {} } }))
      .mockResolvedValueOnce(response({ ok: true, result: { session: {} } }))
      .mockResolvedValueOnce(response({ ok: true, result: { session: {} } }));
    const client = new DashboardApiClient({ fetchImpl });
    const steps = [{ title: 'Edge finishing', evidence_note: 'Merchant-confirmed evidence.', craft_icon: 'settings' }];
    await client.saveCraftsmanshipPlan('prj_test', 3, steps);
    await client.regenerateCraftsmanshipPlan('prj_test', 4);
    await client.approveCraftsmanshipPlan('prj_test', 5);
    expect(fetchImpl.mock.calls[1][0]).toBe('/api/projects/prj_test/creative-director/craftsmanship-plan');
    expect(fetchImpl.mock.calls[1][1]).toMatchObject({ method: 'PUT' });
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({ expected_version: 3, steps });
    expect(fetchImpl.mock.calls[2][0]).toBe('/api/projects/prj_test/creative-director/regenerate-craftsmanship-plan');
    expect(fetchImpl.mock.calls[2][1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(fetchImpl.mock.calls[2][1].body)).toEqual({ expected_version: 4 });
    expect(fetchImpl.mock.calls[3][0]).toBe('/api/projects/prj_test/creative-director/approve-craftsmanship-plan');
    expect(fetchImpl.mock.calls[3][1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(fetchImpl.mock.calls[3][1].body)).toEqual({ expected_version: 5 });
  });
});
