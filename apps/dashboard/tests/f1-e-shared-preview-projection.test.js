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
const project = { id: 'project-f1-e', organization_id: 'organization-f1-e' };
const shop = 'fixture-f1-e.myshopify.com';
const connectionId = 'connection-f1-e';
const previewUrl = 'https://fixture-f1-e.myshopify.com/?preview_theme_id=7';
const recovery = { contract_version: 'merchant-flow-preview-provenance-recovery-v1', recovery_id: 'merchant-flow-preview-provenance-recovery-test' };

function flow() {
  const entry = selectionFixture.cases.find((candidate) => candidate.id === 'commerce_dense_store');
  const { storeIntelligence, merchantIntent } = contractsForCase(entry);
  const selection = selectArchitecture({ storeIntelligence, merchantIntent, selectionMode: 'automatic_beta', root });
  return {
    flow_id: 'merchant-flow-f1-e', state: 'preview_ready', sequence: 27, checksum: 'a'.repeat(64),
    project_id: project.id, organization_id: project.organization_id,
    store_context: { shop, connection_id: connectionId },
    context: { store_intelligence: storeIntelligence, merchant_intent: merchantIntent, architecture_selection: selection, selection_outcome: selection, question_request: null },
    merchant_action: { authorized: false }, failure: null, history: []
  };
}
function session(current) {
  return { project_id: project.id, stage: 'preview', updated_at: '2026-09-05T12:00:00.000Z', conversation_state: {}, resource_plan: {}, generation_context: {}, content_plan: {}, generation_state: { merchant_flow: current }, preview_state: {} };
}

describe('F1-E shared F1 and Advanced preview recovery projection', () => {
  it('passes one retained recovery to the shared resolver and projects the same safe URL without GET mutation', async () => {
    const current = flow();
    const saved = session(current);
    const resolve = vi.fn(({ provenanceRecoveries }) => {
      expect(provenanceRecoveries).toEqual([recovery]);
      return { status: 'available', source: 'legacy_provenance_recovery', preview_url: previewUrl };
    });
    const store = {
      findProjectById: vi.fn(async () => project),
      findCreativeDirectorForProject: vi.fn(async () => saved),
      findProjectShopifyConnection: vi.fn(async () => ({ connection: { id: connectionId, shop_domain: shop } })),
      listMerchantFlowPreviewProvenanceRecoveries: vi.fn(async () => [recovery])
    };
    const merchantFlowService = {
      flowFromSession: vi.fn(() => current), assertFlowOwnership: vi.fn(async () => true),
      assertResourceReady: vi.fn(() => true), assertContentPlanReady: vi.fn(async () => true),
      status: vi.fn(async () => ({ flow: { state: 'preview_ready' } }))
    };
    const before = JSON.stringify(saved);
    const f1 = new AnalysisFirstMerchantExperienceService({
      root, store, projectService: { requireMembership: vi.fn(async () => true) }, merchantFlowService,
      previewBindingResolver: { resolve }, enabled: true, bindingSecret: 'f1-e-shared-preview-binding-secret'
    });
    const advanced = new CreativeDirectorService({
      root, store, projectService: { requireMembership: vi.fn(async () => true) },
      assetService: { list: vi.fn(async () => ({ assets: [] })) },
      shopifyService: { projectConnection: vi.fn(async () => ({ connection: { id: connectionId, shop_domain: shop }, assignment: {} })) },
      adapter: {}, merchantFlowService, previewBindingResolver: { resolve }, analysisFirstMerchantExperienceEnabled: true
    });
    const f1Result = await f1.project({ userId: 'user-f1-e', projectId: project.id });
    const advancedResult = await advanced.load({ userId: 'user-f1-e', projectId: project.id });
    expect(f1Result.preview_link?.url).toBe(previewUrl);
    expect(advancedResult.session.preview_state.shopify_preview?.preview_url).toBe(previewUrl);
    expect(resolve).toHaveBeenCalledTimes(2);
    expect(store.listMerchantFlowPreviewProvenanceRecoveries).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(saved)).toBe(before);
  });
});
