import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { AnalysisFirstMerchantExperienceService, safePreviewUrl, essentialDetailFor } = require('../server/services/analysis-first-merchant-experience-service.cjs');
const { createSchemaValidator } = require('../../../ai/compiler/schema-validator');
const { selectArchitecture } = require('../../../ai/architecture');
const { prepareArchitectureMaterialQuestion, recordArchitectureMaterialAnswer, resolveArchitectureMaterialQuestion } = require('../../../ai/conversation');
const { contractsForCase } = require('../../../scripts/test-automatic-architecture-selection');
const selectionFixture = require('../../../fixtures/automatic-architecture-selection.json');
const root = path.resolve(process.cwd(), '../..');

const project = { id: 'project-f1-b', organization_id: 'organization-f1-b' };
const merchantContext = { project_id: project.id, store_id: 'connection-f1-b', merchant_id: project.organization_id };

function ambiguity() {
  const entry = selectionFixture.cases.find((candidate) => candidate.id === 'ambiguous_store');
  const { storeIntelligence, merchantIntent } = contractsForCase(entry);
  const selection = selectArchitecture({ storeIntelligence, merchantIntent, selectionMode: 'automatic_beta', root });
  const questionRequest = prepareArchitectureMaterialQuestion({
    architectureResult: selection,
    merchantIntent,
    storeIntelligence,
    conversationRevision: 'conversation-f1-b-v1',
    merchantContext,
    createdAt: '2026-09-05T12:00:00.000Z',
    root
  }).question_request;
  return { storeIntelligence, merchantIntent, selection, questionRequest };
}

function serviceFixture({ enabled = true, shop = 'fixture.myshopify.com', session = null } = {}) {
  const source = ambiguity();
  let flow = {
    flow_id: 'merchant-flow-f1-b', state: 'awaiting_material_answer', sequence: 4,
    checksum: 'a'.repeat(64), flow_checksum: 'a'.repeat(64), store_context: { shop, connection_id: 'connection-f1-b' },
    context: { store_intelligence: source.storeIntelligence, merchant_intent: source.merchantIntent, selection_outcome: source.selection, question_request: source.questionRequest, architecture_selection: null },
    failure: null, history: []
  };
  const savedSession = session || {
    project_id: project.id, stage: 'offer', updated_at: '2026-09-05T12:00:00.000Z',
    conversation_state: {}, resource_plan: {}, generation_context: {}, content_plan: {}, generation_state: {}, preview_state: {}
  };
  const store = {
    findProjectById: vi.fn(async () => project),
    findCreativeDirectorForProject: vi.fn(async () => savedSession),
    findProjectShopifyConnection: vi.fn(async () => ({ connection: { id: 'connection-f1-b', shop_domain: 'fixture.myshopify.com' } })),
    findMerchantIntakeRevision: vi.fn(async () => ({ revision_id: source.storeIntelligence.revision_id, connection_id: 'connection-f1-b' })),
    createActivity: vi.fn(async () => {})
  };
  const projectService = { requireMembership: vi.fn(async () => true) };
  const merchantFlowService = {
    flowFromSession: vi.fn(() => flow),
    assertFlowOwnership: vi.fn(async () => true),
    assertResourceReady: vi.fn(() => ({ eligible: true })),
    assertContentPlanReady: vi.fn(async () => ({ eligible: true })),
    merchantContext: vi.fn(() => merchantContext),
    answer: vi.fn(async ({ message }) => {
      const normalizedValue = message.startsWith('Visual') ? 'image_led' : 'information_led';
      const recorded = await recordArchitectureMaterialAnswer({
        questionRequest: source.questionRequest,
        questionId: source.questionRequest.question_id,
        originatingSelectionOutcomeId: source.selection.outcome_id,
        intentPath: source.questionRequest.intent_path,
        conversationRevision: 'conversation-f1-b-v1',
        normalizedValue,
        merchantContext,
        answeredAt: '2026-09-05T12:01:00.000Z',
        root
      });
      const resolution = resolveArchitectureMaterialQuestion({
        selectionOutcome: source.selection,
        questionRequest: source.questionRequest,
        answer: recorded.answer,
        merchantIntent: source.merchantIntent,
        storeIntelligence: source.storeIntelligence,
        root
      });
      flow = {
        ...flow,
        state: 'architecture_frozen',
        sequence: 5,
        checksum: 'b'.repeat(64),
        flow_checksum: 'b'.repeat(64),
        context: { ...flow.context, merchant_intent: resolution.merchant_intent, architecture_selection: resolution.architecture_selection }
      };
      return { flow: { state: flow.state } };
    })
  };
  const service = new AnalysisFirstMerchantExperienceService({
    root, store, projectService, merchantFlowService, enabled,
    bindingSecret: 'f1-b-test-binding-secret-that-is-long-enough',
    clock: () => new Date('2026-09-05T12:02:00.000Z')
  });
  return { service, store, projectService, merchantFlowService, source, getFlow: () => flow };
}

describe('AnalysisFirstMerchantExperienceService', () => {
  it('keeps the approved F1-A capability disabled and rejects a runtime-disabled endpoint', async () => {
    const { service, store } = serviceFixture({ enabled: false });
    await expect(service.project({ userId: 'user-f1-b', projectId: project.id })).rejects.toMatchObject({ code: 'analysis_first_experience_disabled', status: 404 });
    expect(store.findProjectById).not.toHaveBeenCalled();
  });

  it('projects material ambiguity through the actual F1-A contract and exposes only an opaque action binding', async () => {
    const { service } = serviceFixture();
    const result = await service.project({ userId: 'user-f1-b', projectId: project.id });
    expect(result.eligible).toBe(true);
    expect(result.projection.direction.options).toHaveLength(2);
    expect(result.projection.primary_action).toMatchObject({ id: 'choose_direction', enabled: true });
    expect(result.action_bindings.choose_direction).toMatch(/^f1b_[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(result)).not.toMatch(/[a-f0-9]{64}/i);
    expect(createSchemaValidator(root).validateFile(result, 'schemas/calinium-analysis-first-merchant-experience-response.schema.json', 'F1-B response')).toEqual([]);
  });

  it('delegates one selected card through the F1-A direction adapter and existing E2 answer operation', async () => {
    const { service, merchantFlowService } = serviceFixture();
    const before = await service.project({ userId: 'user-f1-b', projectId: project.id });
    const after = await service.selectDirection({ userId: 'user-f1-b', projectId: project.id, directionId: 'visual_story_led', actionBinding: before.action_bindings.choose_direction });
    expect(merchantFlowService.answer).toHaveBeenCalledTimes(1);
    expect(merchantFlowService.answer.mock.calls[0][0].message).toBe('Visual and story-led');
    expect(after.projection.direction.selected_direction.title).toBe('Visual & story-led');
  });

  it('converges simultaneous duplicate card submissions on one E2 mutation', async () => {
    const { service, merchantFlowService } = serviceFixture();
    const before = await service.project({ userId: 'user-f1-b', projectId: project.id });
    const input = { userId: 'user-f1-b', projectId: project.id, directionId: 'direct_efficient', actionBinding: before.action_bindings.choose_direction };
    const [first, second] = await Promise.all([service.selectDirection(input), service.selectDirection(input)]);
    expect(merchantFlowService.answer).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it('rejects stale and conflicting direction submissions without changing the saved flow', async () => {
    const { service, merchantFlowService } = serviceFixture();
    await expect(service.selectDirection({ userId: 'user-f1-b', projectId: project.id, directionId: 'visual_story_led', actionBinding: 'f1b_stale' })).rejects.toMatchObject({ code: 'analysis_first_direction_stale' });
    expect(merchantFlowService.answer).not.toHaveBeenCalled();
  });

  it('fails closed when the authoritative flow belongs to another Shopify shop', async () => {
    const { service } = serviceFixture({ shop: 'other.myshopify.com' });
    await expect(service.project({ userId: 'user-f1-b', projectId: project.id })).rejects.toMatchObject({ code: 'analysis_first_shop_mismatch', status: 404 });
  });

  it('records only allowlisted, current-stage telemetry without arbitrary fields', async () => {
    const { service, store } = serviceFixture();
    await expect(service.telemetry({ userId: 'user-f1-b', projectId: project.id, input: { event_name: 'direction_choice_required', journey_stage: 'analyzing_store', raw_text: 'never' } })).rejects.toMatchObject({ code: 'analysis_first_telemetry_invalid' });
    const recorded = await service.telemetry({ userId: 'user-f1-b', projectId: project.id, input: { event_name: 'direction_choice_required', journey_stage: 'analyzing_store', visible_merchant_question_count: 1, direction_choice_required: true } });
    expect(recorded).toEqual({ recorded: true, event_name: 'direction_choice_required' });
    expect(store.createActivity).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(store.createActivity.mock.calls[0][0].payload.redaction)).not.toContain('never');
    expect(store.createActivity.mock.calls[0][0].payload.redaction.secrets_included).toBe(false);
  });

  it('permits only same-shop HTTPS preview links and reuses one critical deterministic prompt', () => {
    expect(safePreviewUrl('https://fixture.myshopify.com/?preview_theme_id=7', 'fixture.myshopify.com')).toContain('preview_theme_id=7');
    expect(safePreviewUrl('https://fixture.myshopify.com/?password=secret', 'fixture.myshopify.com')).toBeNull();
    expect(safePreviewUrl('https://other.myshopify.com/?preview_theme_id=7', 'fixture.myshopify.com')).toBeNull();
    expect(essentialDetailFor({ stage: 'conversation', conversation_state: { currentQuestionId: 'products' } })).toEqual({ question_id: 'products', prompt: 'What do you sell?' });
    expect(essentialDetailFor({ stage: 'conversation', conversation_state: { currentQuestionId: 'feeling' } })).toBeNull();
  });
});
