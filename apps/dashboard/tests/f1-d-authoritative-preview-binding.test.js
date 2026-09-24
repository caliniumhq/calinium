import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { AnalysisFirstMerchantExperienceService } = require('../server/services/analysis-first-merchant-experience-service.cjs');
const { CreativeDirectorService } = require('../server/services/creative-director-service.cjs');
const { selectArchitecture } = require('../../../ai/architecture');
const { contractsForCase } = require('../../../scripts/test-automatic-architecture-selection');
const selectionFixture = require('../../../fixtures/automatic-architecture-selection.json');

const root = path.resolve(process.cwd(), '../..');
const project = { id: 'project-f1-d', organization_id: 'organization-f1-d' };
const shop = 'fixture.myshopify.com';
const connectionId = 'connection-f1-d';
const previewUrl = 'https://fixture.myshopify.com/?preview_theme_id=7';

function authoritativeFlow() {
  const entry = selectionFixture.cases.find((candidate) => candidate.id === 'commerce_dense_store');
  const { storeIntelligence, merchantIntent } = contractsForCase(entry);
  const selection = selectArchitecture({ storeIntelligence, merchantIntent, selectionMode: 'automatic_beta', root });
  return {
    flow_id: 'merchant-flow-f1-d', state: 'preview_ready', sequence: 27,
    checksum: 'a'.repeat(64), flow_checksum: 'a'.repeat(64),
    project_id: project.id, organization_id: project.organization_id,
    store_context: { shop, connection_id: connectionId },
    context: { store_intelligence: storeIntelligence, merchant_intent: merchantIntent, architecture_selection: selection, selection_outcome: selection, question_request: null },
    merchant_action: { authorized: false }, failure: null, history: []
  };
}

function session() {
  return {
    project_id: project.id, stage: 'preview', updated_at: '2026-09-05T12:00:00.000Z',
    conversation_state: {}, resource_plan: {}, generation_context: {}, content_plan: {}, generation_state: {},
    preview_state: { status: 'ready', available_views: ['home'], source_theme_unchanged: true }
  };
}

function analysisService(resolution) {
  const flow = authoritativeFlow();
  const store = {
    findProjectById: vi.fn(async () => project),
    findCreativeDirectorForProject: vi.fn(async () => session()),
    findProjectShopifyConnection: vi.fn(async () => ({ connection: { id: connectionId, shop_domain: shop } }))
  };
  const merchantFlowService = {
    flowFromSession: vi.fn(() => flow), assertFlowOwnership: vi.fn(async () => true),
    assertResourceReady: vi.fn(() => true), assertContentPlanReady: vi.fn(async () => true)
  };
  return new AnalysisFirstMerchantExperienceService({
    root, store, projectService: { requireMembership: vi.fn(async () => true) }, merchantFlowService,
    previewBindingResolver: { resolve: vi.fn(() => resolution) }, enabled: true,
    bindingSecret: 'f1-d-test-binding-secret-that-is-long-enough'
  });
}

describe('F1-D authoritative preview projection', () => {
  it('projects one merchant-safe preview reference from the authoritative resolver', async () => {
    const service = analysisService({ status: 'available', preview_url: previewUrl });
    const result = await service.project({ userId: 'user-f1-d', projectId: project.id });
    expect(result.preview_link).toEqual({ label: 'Open Calinium preview', url: previewUrl });
    expect(result.preview_availability).toEqual({ status: 'available' });
    expect(result.projection.primary_action).toMatchObject({ id: 'approve_design', enabled: true });
    const withoutNavigationReference = { ...result, preview_link: null };
    expect(JSON.stringify(withoutNavigationReference)).not.toMatch(/binding_checksum|render_request|theme_id|D2\.7|provider/i);
  });

  it('fails closed without claiming preparation when no authoritative work is active', async () => {
    const service = analysisService({ status: 'needs_attention', preview_url: null, reason_code: 'internal-only' });
    const result = await service.project({ userId: 'user-f1-d', projectId: project.id });
    expect(result.preview_link).toBeNull();
    expect(result.preview_availability).toEqual({ status: 'needs_attention' });
    expect(result.projection.primary_action).toMatchObject({ id: 'approve_design', enabled: false });
    expect(JSON.stringify(result)).not.toContain('internal-only');
  });

  it('gives Advanced the same resolver-backed preview without persisting session state', async () => {
    const savedSession = session();
    const flow = authoritativeFlow();
    const store = { findProjectById: vi.fn(async () => project), findCreativeDirectorForProject: vi.fn(async () => savedSession) };
    const service = new CreativeDirectorService({
      root, store,
      projectService: { requireMembership: vi.fn(async () => true) },
      assetService: { list: vi.fn(async () => ({ assets: [] })) },
      shopifyService: { projectConnection: vi.fn(async () => ({ connection: { id: connectionId, shop_domain: shop }, assignment: {} })) },
      adapter: {},
      merchantFlowService: { flowFromSession: vi.fn(() => flow), status: vi.fn(async () => ({ flow: { state: 'preview_ready' } })) },
      previewBindingResolver: { resolve: vi.fn(() => ({ status: 'available', preview_url: previewUrl })) },
      analysisFirstMerchantExperienceEnabled: true
    });
    const result = await service.load({ userId: 'user-f1-d', projectId: project.id });
    expect(result.session.preview_state.shopify_preview).toEqual({ status: 'ready', preview_url: previewUrl });
    expect(savedSession.preview_state.shopify_preview).toBeUndefined();
  });
});
