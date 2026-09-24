import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { MerchantGenerationFlowService } = require('../server/services/merchant-generation-flow-service.cjs');
const { assertMerchantGenerationFlow } = require('../../../ai/merchant-flow');
const { omissionAwareFlowReadySession } = require('./helpers/omission-aware-flow-ready-session.cjs');

const root = path.resolve(process.cwd(), '../..');
const selectionFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/automatic-architecture-selection.json'), 'utf8'));
const flowFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/merchant-generation-flow.json'), 'utf8'));

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function caseById(id) { return selectionFixture.cases.find((entry) => entry.id === id); }
function intelligenceFor(id) {
  const source = caseById(id).store;
  return {
    status: 'usable', category: { id: null, confidence: 'Unknown' },
    catalog: { product_count: source.products, active_product_count: source.products, variant_count: source.variants, available_variant_count: source.variants, collection_count: source.collections },
    navigation: { menu_count: source.menus, link_count: source.links, confidence: 'High' },
    media: { product_media_count: source.product_media, usable_image_count: source.usable_images, video_count: 0, project_asset_count: 0, confidence: 'High' },
    store: { canonical_shop_domain: 'controlled-beta.myshopify.com', market_count: 1, theme_count: 1, unpublished_theme_count: 1 },
    source_health: { unavailable_sources: [] }
  };
}
function memoryStore(caseId, { intakeStatus = 'usable', architecturePreference = null } = {}) {
  const project = { id: 'project-e3-server', organization_id: 'organization-e3-server' };
  const intake = { project_id: project.id, connection_id: 'connection-e3-server', revision_id: `miv_${caseId}`, normalization_version: 'store-intelligence-v1', intake_status: intakeStatus, store_intelligence: intelligenceFor(caseId) };
  let session = omissionAwareFlowReadySession({
    id: 'creative-director-e3-server', project_id: project.id,
    creative_brief: { version: '1.0', business: { name: 'E3 Fixture', offer: ['Shopify products'] }, audience: { primary: 'Online shoppers' }, goals: { primary: 'Present the catalog clearly' }, brand: { personality: [], desiredFeeling: [], constraints: [] } },
    store_strategy: { version: '1.0' },
    conversation_state: {
      revision: 'conversation-e3-server',
      ...(architecturePreference ? {
        architecturePreferences: {
          shopping_mode: {
            value: architecturePreference,
            confidence: 'High',
            revision_id: 'conversation-preference-0123456789abcdef0123'
          }
        }
      } : {})
    },
    generation_state: {}
  });
  let beforeGenerationCas = null;
  return {
    project,
    async findProjectById(id) { return id === project.id ? clone(project) : null; },
    async findCreativeDirectorForProject(id) { return id === project.id ? clone(session) : null; },
    async updateCreativeDirector(id, value) { if (id !== project.id) return null; session = clone(value); return clone(session); },
    async updateCreativeDirectorGenerationStateIfMatch(id, expected, next, updatedAt, expectedUpdatedAt = null) {
      if (beforeGenerationCas) {
        const mutate = beforeGenerationCas;
        beforeGenerationCas = null;
        mutate();
      }
      if (id !== project.id
        || JSON.stringify(session.generation_state || {}) !== JSON.stringify(expected || {})
        || (expectedUpdatedAt && session.updated_at !== expectedUpdatedAt)) {
        return { updated: false, session: clone(session) };
      }
      session = { ...session, generation_state: clone(next), updated_at: updatedAt };
      return { updated: true, session: clone(session) };
    },
    async latestMerchantIntakeRevision(id) { return id === project.id ? clone(intake) : null; },
    async findMerchantIntakeRevision(revisionId, id) { return id === project.id && revisionId === intake.revision_id ? clone(intake) : null; },
    makeIntakeUsable() { intake.intake_status = 'usable'; },
    invalidateReadinessBeforeNextGenerationCas() {
      beforeGenerationCas = () => {
        session = {
          ...session,
          stage: 'content-plan',
          content_plan: { ...session.content_plan, target_eligibility: null },
          updated_at: '2026-08-18T00:00:01.000Z'
        };
      };
    },
    currentFlow() { return session.generation_state.merchant_flow ? clone(session.generation_state.merchant_flow) : undefined; }
  };
}
function clockFactory() { let tick = 0; const start = Date.parse('2026-08-17T12:00:00.000Z'); return () => new Date(start + (tick++ * 1000)); }
function serviceFor(store, runtime = null) {
  return new MerchantGenerationFlowService({ root, store, projectService: { async requireMembership() {} }, runtime, clock: clockFactory() });
}
function actor(store) { return { userId: 'user-e3-server', projectId: store.project.id }; }

describe('Merchant generation-flow server integration', () => {
  it.each([
    ['commerce_dense_store', 'profile.current_calinium.v1'],
    ['image_led_editorial_store', 'profile.editorial_discovery.v1']
  ])('starts and freezes direct %s selection without a material question', async (caseId, profileId) => {
    const store = memoryStore(caseId); const service = serviceFor(store);
    const result = await service.start(actor(store));
    expect(result.flow).toMatchObject({ state: 'architecture_frozen', question: null, architecture: { status: 'frozen' } });
    expect(JSON.stringify(result.flow)).not.toMatch(/profile\.|Current Calinium|Editorial Discovery|score/i);
    expect(store.currentFlow().context.architecture_selection.profile_id).toBe(profileId);
  });

  it('consumes a persisted Creative Director shopping preference without changing Store Intelligence or asking again', async () => {
    const store = memoryStore('ambiguous_store', { architecturePreference: 'information_led' });
    const service = serviceFor(store);
    const result = await service.start(actor(store));
    const flow = store.currentFlow();
    expect(result.flow).toMatchObject({ state: 'architecture_frozen', question: null });
    expect(flow.context.merchant_intent.explicit_preferences).toContainEqual(expect.objectContaining({
      path: 'storefront.shopping_mode',
      value: 'information_led',
      source_type: 'merchant_preference',
      source_revision: 'conversation-preference-0123456789abcdef0123'
    }));
    expect(flow.context.merchant_intent.provenance).toContainEqual({
      source_type: 'merchant_preference',
      source_revision: 'conversation-preference-0123456789abcdef0123'
    });
    expect(flow.context.store_intelligence.revision_id).toBe('miv_ambiguous_store');
    expect(flow.history.filter((entry) => entry.event === 'material_question_prepared')).toHaveLength(0);
  });

  it.each([
    ['Direct and efficient', 'profile.current_calinium.v1'],
    ['Visual and story-led', 'profile.editorial_discovery.v1']
  ])('persists one ambiguous question across restart and resolves %s', async (message, profileId) => {
    const store = memoryStore('ambiguous_store'); const first = serviceFor(store);
    const paused = await first.start(actor(store)); const pinned = store.currentFlow();
    expect(paused).toMatchObject({ prompt_delivery_required: true, flow: { state: 'awaiting_material_answer' } });

    const restarted = serviceFor(store); const reloaded = await restarted.status(actor(store));
    expect(reloaded.flow.flow_id).toBe(paused.flow.flow_id);
    expect(reloaded.flow.sequence).toBe(paused.flow.sequence);
    expect(reloaded.prompt_delivery_required).toBe(false);
    const resolved = await restarted.answer({ ...actor(store), flowId: paused.flow.flow_id, questionId: paused.flow.question.question_id, message, expectedFlowChecksum: pinned.checksum });
    const finalFlow = store.currentFlow();
    expect(resolved.flow.state).toBe('architecture_frozen');
    expect(finalFlow.flow_id).toBe(pinned.flow_id);
    expect(finalFlow.context.architecture_selection.profile_id).toBe(profileId);
    expect(finalFlow.context.merchant_intent.parent_revision_id).toBe(pinned.context.merchant_intent.revision_id);
    expect(finalFlow.context.store_intelligence).toEqual(pinned.context.store_intelligence);
    expect(finalFlow.history.filter((entry) => entry.event === 'material_question_prepared')).toHaveLength(1);
    expect(finalFlow.context.architecture_selection.material_clarification.rerun_count).toBe(1);
    await expect(restarted.answer({ ...actor(store), flowId: paused.flow.flow_id, questionId: paused.flow.question.question_id, message })).rejects.toMatchObject({ code: 'merchant_flow_answer_invalid' });
  });

  it('recovers the same flow after authoritative Store Intelligence becomes usable', async () => {
    const store = memoryStore('ambiguous_store', { intakeStatus: 'not_available' }); const service = serviceFor(store); const identity = actor(store);
    const failed = await service.start(identity);
    expect(failed.flow).toMatchObject({ state: 'failed_retryable', failure: { category: 'store_intelligence_unavailable', retryable: true } });
    store.makeIntakeUsable();
    const resumed = await service.resume({ ...identity, flowId: failed.flow.flow_id, expectedFlowChecksum: store.currentFlow().checksum });
    expect(resumed).toMatchObject({ resumed: true, prompt_delivery_required: true, flow: { flow_id: failed.flow.flow_id, state: 'awaiting_material_answer' } });
  });

  it('rejects flow creation when content readiness changes after the gate but before persistence', async () => {
    const store = memoryStore('commerce_dense_store');
    const service = serviceFor(store);
    store.invalidateReadinessBeforeNextGenerationCas();

    await expect(service.start(actor(store))).rejects.toMatchObject({ code: 'merchant_flow_stale' });
    expect(store.currentFlow()).toBeUndefined();
    const session = await store.findCreativeDirectorForProject(store.project.id);
    expect(session.stage).toBe('content-plan');
    expect(session.content_plan.target_eligibility).toBeNull();
  });

  it('continues the frozen paid flow through artifact render/QA to preview_ready', async () => {
    const store = memoryStore('commerce_dense_store');
    const runtime = { async runRenderQa() { return clone(flowFixture.qa_passed); } };
    const service = serviceFor(store, runtime); const identity = actor(store);
    await service.start(identity);
    await service.bindDesignAndComposition({ project: store.project, session: await store.findCreativeDirectorForProject(store.project.id), designDnaRevision: flowFixture.design_dna, compositionRevision: flowFixture.composition });
    const order = { id: flowFixture.paid_identity_frozen.order_id, purchase_intent_checksum: flowFixture.paid_identity_frozen.purchase_intent_checksum, snapshot_id: flowFixture.paid_identity_frozen.snapshot_id, snapshot_checksum: flowFixture.paid_identity_frozen.snapshot_checksum };
    await service.bindPaidOrder({ project: store.project, order });
    await expect(service.requirePreviewReady({ project: store.project, order })).rejects.toMatchObject({ code: 'merchant_flow_preview_not_ready' });
    await service.generationStarted({ project: store.project, order, generationId: flowFixture.generation_id });
    await service.artifactReady({ project: store.project, order, generationId: flowFixture.generation_id, artifact: flowFixture.artifact });
    const finalFlow = assertMerchantGenerationFlow(store.currentFlow(), root);
    expect(finalFlow).toMatchObject({ state: 'preview_ready', paid_identity: { order_id: order.id, snapshot_id: order.snapshot_id }, generation: { generation_id: flowFixture.generation_id, status: 'completed' }, render_qa: { status: 'passed' }, merchant_action: { authorized: false } });
    expect(finalFlow.safety).toMatchObject({ automatic_repair_allowed: false, live_theme_mutation_allowed: false, automatic_publish_allowed: false });
    await expect(service.requirePreviewReady({ project: store.project, order })).resolves.toMatchObject({ state: 'preview_ready' });
  });
});
