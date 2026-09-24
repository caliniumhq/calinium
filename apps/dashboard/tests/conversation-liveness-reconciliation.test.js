import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { CreativeDirectorService } = require('../server/services/creative-director-service.cjs');
const { CreativeDirectorAdapter } = require('../server/creative-director-adapter.cjs');
const { assessConversationLiveness } = require('../../../ai/conversation/conversation-liveness');

const root = path.resolve(process.cwd(), '../..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/e5r-g-dedicated-staging-actionless-session.json'), 'utf8'));
const assignedShop = 'calinium-example.myshopify.com';
const clone = (value) => structuredClone(value);

function controlledStore(initialSession = fixture.session) {
  const project = clone(fixture.project);
  let session = clone(initialSession);
  let shop = assignedShop;
  const activities = [];
  const store = {
    async findProjectById(id) { return id === project.id ? clone(project) : null; },
    async findCreativeDirectorForProject(id) { return id === project.id ? clone(session) : null; },
    async findProjectShopifyConnection(projectId, organizationId) {
      return projectId === project.id && organizationId === project.organization_id
        ? { connection: { id: 'shc_e5r_g_fixture', shop_domain: shop } }
        : null;
    },
    async updateCreativeDirectorIfMatch(projectId, expectedUpdatedAt, next) {
      if (projectId !== project.id || session.updated_at !== expectedUpdatedAt) return { updated: false, session: clone(session) };
      session = clone(next);
      return { updated: true, session: clone(session) };
    },
    async updateCreativeDirector(projectId, next) {
      if (projectId !== project.id) return null;
      session = clone(next);
      return clone(session);
    },
    async createActivity(activity) {
      if (activities.some((entry) => entry.id === activity.id)) throw new Error('UNIQUE activity id');
      activities.push(clone(activity));
      return clone(activity);
    },
    async transaction(work) { return work(this); },
    session() { return clone(session); },
    activities() { return clone(activities); },
    setSession(next) { session = clone(next); },
    setShop(next) { shop = next; }
  };
  return { store, project };
}

function serviceFor(store, { tick = 1000, preferredShop = assignedShop } = {}) {
  return new CreativeDirectorService({
    root,
    store,
    projectService: { async requireMembership() {} },
    assetService: { async list() { return { assets: [] }; } },
    shopifyService: {
      async projectConnection() { return { connection: { shop_domain: preferredShop }, assignment: { purpose: 'theme_access' } }; }
    },
    adapter: new CreativeDirectorAdapter({ root }),
    clock: () => new Date(Date.parse(fixture.session.updated_at) + tick)
  });
}

describe('E5R-G durable conversation liveness reconciliation', () => {
  it('makes concurrent actionless-session loads converge on one question, transcript entry, and audit event', async () => {
    const { store, project } = controlledStore();
    const firstService = serviceFor(store, { tick: 1000 });
    const secondService = serviceFor(store, { tick: 2000 });

    const [first, second] = await Promise.all([
      firstService.load({ userId: 'founder-e5r-g', projectId: project.id }),
      secondService.load({ userId: 'founder-e5r-g', projectId: project.id })
    ]);

    for (const result of [first, second]) {
      expect(result.session.conversation_state.currentQuestionId).toBe('products');
      expect(result.conversation_liveness).toMatchObject({
        policy_version: 'creative-director-conversation-liveness-v1',
        status: 'question_required',
        current_question: { question_id: 'products', prompt: 'What do you sell?' }
      });
    }
    expect(store.session().conversation_state.questionsAsked.filter((id) => id === 'products')).toHaveLength(1);
    expect(store.session().transcript.filter((entry) => entry.content === 'What do you sell?')).toHaveLength(1);
    expect(store.activities().filter((entry) => entry.type === 'creative_director_conversation_recovered')).toHaveLength(1);
    expect(store.activities()[0]).toMatchObject({ actor_user_id: null, payload: { shop_binding: assignedShop, question_id: 'products' } });
  });

  it('preserves an existing valid question and idempotently reloads it', async () => {
    const existing = clone(fixture.session);
    existing.conversation_state.currentQuestionId = 'audience';
    existing.conversation_state.stage = 'audience';
    existing.transcript.push({ id: 'msg_audience_fixture', role: 'calinium', content: 'Who do you most want to serve?', created_at: existing.updated_at });
    const { store, project } = controlledStore(existing);
    const service = serviceFor(store);

    const first = await service.load({ userId: 'founder-e5r-g', projectId: project.id });
    const second = await service.load({ userId: 'founder-e5r-g', projectId: project.id });
    expect(first.session.conversation_state.currentQuestionId).toBe('audience');
    expect(second.session.updated_at).toBe(existing.updated_at);
    expect(store.activities()).toHaveLength(0);
  });

  it('advances a ready actionless conversation instead of manufacturing a recovery question', async () => {
    const ready = clone(fixture.session);
    ready.conversation_state = {
      ...ready.conversation_state,
      stage: 'confirmation',
      knownFacts: [
        { path: 'productsOrServices', value: ['Home goods'], source: 'merchant', confidence: 0.9 },
        { path: 'targetAudience', value: 'Design-conscious customers', source: 'merchant', confidence: 0.9 },
        { path: 'primaryGoal', value: 'Clear product discovery', source: 'merchant', confidence: 0.9 }
      ],
      unknowns: [],
      missingCriticalFacts: [],
      currentQuestionId: null,
      readyForCreativeBrief: true
    };
    const { store, project } = controlledStore(ready);
    const result = await serviceFor(store).load({ userId: 'founder-e5r-g', projectId: project.id });
    expect(result.session.stage).toBe('understanding');
    expect(result.session.conversation_state.currentQuestionId).toBeNull();
    expect(store.activities().filter((entry) => entry.type === 'creative_director_conversation_advanced')).toHaveLength(1);
  });

  it('persists an answer and computes the next question once, then rejects a stale revision', async () => {
    const { store, project } = controlledStore();
    const service = serviceFor(store);
    const loaded = await service.load({ userId: 'founder-e5r-g', projectId: project.id });
    const revision = loaded.session.updated_at;
    const conversationId = loaded.session.conversation_state.conversationId;

    const answered = await service.respond({
      userId: 'founder-e5r-g',
      projectId: project.id,
      message: 'Handmade home goods',
      conversationId,
      expectedSessionUpdatedAt: revision
    });
    expect(answered.session.conversation_state.currentQuestionId).toBe('audience');
    expect(answered.session.conversation_state.knownFacts.find((fact) => fact.path === 'productsOrServices').value).toEqual(['Handmade home goods']);
    expect(store.session().transcript.filter((entry) => entry.role === 'merchant')).toHaveLength(1);

    await expect(service.respond({
      userId: 'founder-e5r-g',
      projectId: project.id,
      message: 'A stale duplicate answer',
      conversationId,
      expectedSessionUpdatedAt: revision
    })).rejects.toMatchObject({ code: 'creative_director_conversation_stale', status: 409 });
    expect(store.session().transcript.filter((entry) => entry.role === 'merchant')).toHaveLength(1);
  });

  it('fails closed without overwriting merchant-authored conflict state', async () => {
    const conflict = clone(fixture.session);
    conflict.conversation_state.knownFacts.push({ path: 'productsOrServices', value: ['Merchant-owned products'], source: 'merchant', confidence: 0.9 });
    const before = clone(conflict);
    const { store, project } = controlledStore(conflict);
    const result = await serviceFor(store).load({ userId: 'founder-e5r-g', projectId: project.id });
    expect(result.conversation_liveness).toMatchObject({ status: 'explicitly_blocked', reason: 'merchant_authored_state_conflict' });
    expect(store.session()).toEqual(before);
    expect(store.activities()).toHaveLength(0);
    expect(assessConversationLiveness({ session: store.session() }).status).toBe('explicitly_blocked');
  });

  it('rejects a different preferred shop before recovery mutation', async () => {
    const { store, project } = controlledStore();
    const service = serviceFor(store, { preferredShop: 'different-store.myshopify.com' });
    await expect(service.load({ userId: 'founder-e5r-g', projectId: project.id })).rejects.toMatchObject({
      code: 'conversation_liveness_shop_mismatch',
      status: 403
    });
    expect(store.session()).toEqual(fixture.session);
  });
});
