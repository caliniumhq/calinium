import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { MerchantGenerationFlowService } = require('../server/services/merchant-generation-flow-service.cjs');
const { omissionAwareFlowReadySession } = require('./helpers/omission-aware-flow-ready-session.cjs');
const root = path.resolve(process.cwd(), '../..');
const selection = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/automatic-architecture-selection.json'), 'utf8'));

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function intelligenceFor(id) {
  const source = selection.cases.find((entry) => entry.id === id).store;
  return {
    status: 'usable', category: { id: null, confidence: 'Unknown' },
    catalog: { product_count: source.products, active_product_count: source.products, variant_count: source.variants, available_variant_count: source.variants, collection_count: source.collections },
    navigation: { menu_count: source.menus, link_count: source.links, confidence: 'High' },
    media: { product_media_count: source.product_media, usable_image_count: source.usable_images, video_count: 0, project_asset_count: 0, confidence: 'High' },
    store: { canonical_shop_domain: 'controlled-beta.myshopify.com', market_count: 1, theme_count: 2, unpublished_theme_count: 1 },
    source_health: { unavailable_sources: [] }
  };
}
function storeFor(caseId) {
  const project = { id: 'project-e4-concurrency', organization_id: 'organization-e4-concurrency' };
  const intake = { project_id: project.id, connection_id: 'connection-e4-concurrency', revision_id: `miv_${caseId}`, normalization_version: 'store-intelligence-v1', intake_status: 'usable', store_intelligence: intelligenceFor(caseId) };
  let session = omissionAwareFlowReadySession({ id: 'creative-e4-concurrency', project_id: project.id, creative_brief: { version: '1.0', business: { name: 'E4', offer: ['Products'] }, audience: { primary: 'Shoppers' }, goals: { primary: 'Sell' }, brand: { personality: [], desiredFeeling: [], constraints: [] } }, store_strategy: { version: '1.0' }, conversation_state: {}, generation_state: {} });
  let shop = 'controlled-beta.myshopify.com';
  return {
    project,
    async findProjectById(id) { return id === project.id ? clone(project) : null; },
    async findCreativeDirectorForProject(id) { return id === project.id ? clone(session) : null; },
    async latestMerchantIntakeRevision(id) { return id === project.id ? clone(intake) : null; },
    async findMerchantIntakeRevision(id, projectId) { return id === intake.revision_id && projectId === project.id ? clone(intake) : null; },
    async findProjectShopifyConnection(projectId, organizationId, connectionId) { return projectId === project.id && organizationId === project.organization_id && connectionId === intake.connection_id ? { connection: { id: intake.connection_id, shop_domain: shop } } : null; },
    async updateCreativeDirectorGenerationStateIfMatch(projectId, expected, next, updatedAt, expectedUpdatedAt = null) { if (projectId !== project.id || JSON.stringify(session.generation_state) !== JSON.stringify(expected) || (expectedUpdatedAt && session.updated_at !== expectedUpdatedAt)) return { updated: false, session: clone(session) }; session = { ...session, generation_state: clone(next), updated_at: updatedAt }; return { updated: true, session: clone(session) }; },
    currentFlow() { return clone(session.generation_state.merchant_flow); },
    changeShop(next) { shop = next; }
  };
}
function clock() { let tick = 0; return () => new Date(Date.parse('2026-08-18T11:00:00.000Z') + tick++); }
function service(store) { return new MerchantGenerationFlowService({ root, store, projectService: { async requireMembership() {} }, clock: clock() }); }
function actor(store) { return { userId: 'merchant-e4', projectId: store.project.id }; }
function observe(current) { const events = []; current.setJobRunner({ async event(value) { events.push(value); } }); return events; }

describe('Merchant flow beta concurrency and ownership', () => {
  it('makes two simultaneous starts converge on one authoritative flow', async () => {
    const store = storeFor('commerce_dense_store'); const current = service(store);
    const results = await Promise.all([current.start(actor(store)), current.start(actor(store))]);
    expect(results[0].flow.flow_id).toBe(results[1].flow.flow_id);
    expect(store.currentFlow().history.filter((entry) => entry.event === 'flow_created')).toHaveLength(1);
  });

  it('allows only one simultaneous material-answer transition', async () => {
    const store = storeFor('ambiguous_store'); const current = service(store); const paused = await current.start(actor(store));
    const input = { ...actor(store), flowId: paused.flow.flow_id, questionId: paused.flow.question.question_id, message: 'Direct and efficient', expectedFlowChecksum: paused.flow.flow_checksum };
    const results = await Promise.allSettled([current.answer(input), current.answer(input)]);
    expect(results.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((entry) => entry.status === 'rejected')).toHaveLength(1);
    expect(store.currentFlow().history.filter((entry) => entry.event === 'architecture_frozen')).toHaveLength(1);
  });

  it('makes duplicate resume requests read the same authoritative paused state', async () => {
    const store = storeFor('ambiguous_store'); const current = service(store); const paused = await current.start(actor(store));
    const input = { ...actor(store), flowId: paused.flow.flow_id, expectedFlowChecksum: paused.flow.flow_checksum };
    const [first, second] = await Promise.all([current.resume(input), current.resume(input)]);
    expect(first.flow.flow_id).toBe(second.flow.flow_id);
    expect(first.flow.question.question_id).toBe(second.flow.question.question_id);
    expect(store.currentFlow().history.filter((entry) => entry.event === 'material_question_prepared')).toHaveLength(1);
  });

  it('fails closed when the project no longer owns the flow shop', async () => {
    const store = storeFor('commerce_dense_store'); const current = service(store); await current.start(actor(store)); store.changeShop('other-beta.myshopify.com');
    await expect(current.status(actor(store))).rejects.toMatchObject({ code: 'merchant_flow_shop_ownership_mismatch', status: 404 });
  });

  it('does not expose architecture names or scores in merchant status', async () => {
    const store = storeFor('image_led_editorial_store'); const result = await service(store).start(actor(store));
    expect(JSON.stringify(result)).not.toMatch(/Editorial Discovery|Current Calinium|profile\.|candidate_results|score|weight/i);
  });

  it('records support-safe direct-selection telemetry through architecture freeze', async () => {
    const store = storeFor('commerce_dense_store'); const current = service(store); const events = observe(current);
    await current.start(actor(store));
    expect(events.map((entry) => entry.eventType)).toEqual(expect.arrayContaining(['flow_started', 'store_intelligence_ready', 'architecture_selected', 'architecture_frozen']));
  });

  it('records one material question and answer without duplicating the flow', async () => {
    const store = storeFor('ambiguous_store'); const current = service(store); const events = observe(current); const paused = await current.start(actor(store));
    await current.answer({ ...actor(store), flowId: paused.flow.flow_id, questionId: paused.flow.question.question_id, message: 'Visual and story-led', expectedFlowChecksum: paused.flow.flow_checksum });
    const types = events.map((entry) => entry.eventType);
    expect(types.filter((type) => type === 'material_question_requested')).toHaveLength(1);
    expect(types.filter((type) => type === 'material_answer_received')).toHaveLength(1);
    expect(types.filter((type) => type === 'architecture_selected')).toHaveLength(1);
    expect(types.filter((type) => type === 'architecture_frozen')).toHaveLength(1);
  });
});
