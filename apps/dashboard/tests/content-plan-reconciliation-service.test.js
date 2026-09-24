import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { CreativeDirectorService } = require('../server/services/creative-director-service.cjs');
const {
  applyResourceConfirmationEligibility,
  buildDecisionSet
} = require('../../../pipeline/resource-confirmation-eligibility');

const root = path.resolve(process.cwd(), '../..');
const at = '2026-08-20T12:00:00.000Z';

function clone(value) { return structuredClone(value); }

function controlledStore({ initialStage = 'content-plan', includeActionableLookbook = false, resourcesApproved = true } = {}) {
  const project = { id: 'prj_release_40_fixture', organization_id: 'org_release_40_fixture' };
  const shop = 'controlled-release-40.myshopify.com';
  let assignedShop = shop;
  const approvedPreset = {
    revision_id: 'apr_release_40_fixture',
    preset_checksum: 'a'.repeat(64),
    approval: { approved_at: at },
    preset_snapshot: {
      omission_priority: ['craftsmanship'],
      content_requirements: [{ id: 'craft-evidence', kind: 'verified_evidence', level: 'recommended', sections: ['craftsmanship'] }]
    }
  };
  const strategy = { homepage: { sections: ['hero', 'featured-collection', 'craftsmanship', ...(includeActionableLookbook ? ['lookbook'] : []), 'newsletter'] } };
  const resourcePlan = applyResourceConfirmationEligibility({
    resourcePlan: {
      status: 'ready', fields: [], groups: [], required_assets: [],
      required_confirmations: ['review:verification:craftsmanship:craft_context'], blocker: null
    },
    storeStrategy: strategy,
    approvedPresetRevision: approvedPreset,
    at
  }).resourcePlan;
  const resourceDecisions = buildDecisionSet({ eligibility: resourcePlan.confirmation_eligibility, at });
  let session = {
    id: 'cds_release_40_fixture', project_id: project.id, stage: initialStage,
    conversation_state: {}, transcript: [], creative_brief: { version: '1.0' },
    store_strategy: strategy, review: {}, merchant_profile: { intent_revision_id: 'merchant-intent-release-40' },
    resource_plan: resourcePlan,
    generation_context: {
      status: resourcesApproved ? 'ready_for_generation' : 'awaiting_configuration',
      approval_reference: resourcesApproved ? 'merchant-resource-approval-release-40-fixture' : null,
      approved_at: resourcesApproved ? at : null,
      merchant_references: {}, shopify_resource_references: {}, asset_references: {}, completed_confirmations: [], resolved_empty_fields: [],
      resource_confirmation_decisions: resourceDecisions
    },
    generation_state: { pinned_store_intelligence_revision: 'store-intelligence-release-40' },
    preview_state: {},
    content_plan: {
      version: 1, status: 'not_required', candidate_version: 0, plan_id: null, parent_revision_id: null,
      approved_revision_id: null, approved_resource_snapshot_revision_id: null, stories: [], warnings: [], updated_at: at,
      craftsmanship: { version: 1, status: 'draft', candidate_version: 1, steps: [], warnings: [], updated_at: at }
    },
    preset_selection: {
      status: 'approved', approved_revision_id: approvedPreset.revision_id,
      applied_homepage_sections: ['hero', 'featured-collection', 'craftsmanship', ...(includeActionableLookbook ? ['lookbook'] : []), 'newsletter']
    },
    created_at: at,
    updated_at: at
  };
  const activities = [];
  const store = {
    async findProjectById(id) { return id === project.id ? clone(project) : null; },
    async findCreativeDirectorForProject(id) { return id === project.id ? clone(session) : null; },
    async findApprovedPresetRevision(id, projectId, organizationId) {
      return id === approvedPreset.revision_id && projectId === project.id && organizationId === project.organization_id ? clone(approvedPreset) : null;
    },
    async findProjectShopifyConnection(projectId, organizationId) {
      return projectId === project.id && organizationId === project.organization_id ? { connection: { id: 'shc_release_40_fixture', shop_domain: assignedShop } } : null;
    },
    async updateCreativeDirectorIfMatch(projectId, expectedUpdatedAt, next) {
      if (projectId !== project.id || session.updated_at !== expectedUpdatedAt) return { updated: false, session: clone(session) };
      session = clone(next);
      return { updated: true, session: clone(session) };
    },
    async createActivity(activity) {
      if (activities.some((entry) => entry.id === activity.id)) throw new Error('UNIQUE activity id');
      activities.push(clone(activity));
      return clone(activity);
    },
    async transaction(work) { return work(this); },
    session() { return clone(session); },
    activities() { return clone(activities); },
    changeShop(nextShop) { assignedShop = nextShop; }
  };
  return { store, project, approvedPreset, shop };
}

function serviceFor(store, tick) {
  return new CreativeDirectorService({
    root,
    store,
    projectService: { async requireMembership() {} },
    assetService: { async list() { return { assets: [] }; } },
    sourceRevision: '2000000000000000000000000000000000000002',
    adapter: {},
    clock: () => new Date(Date.parse(at) + tick)
  });
}

describe('E5R-E durable stale-plan reconciliation', () => {
  it('makes concurrent normal-application loads converge on one audited zero-action transition', async () => {
    const { store, project, shop } = controlledStore();
    const firstService = serviceFor(store, 1000);
    const secondService = serviceFor(store, 2000);
    const originalApproval = store.session().generation_context.approval_reference;
    const originalIntent = clone(store.session().merchant_profile);
    const originalIntelligence = clone(store.session().generation_state);

    const [first, second] = await Promise.all([
      firstService.load({ userId: 'founder-fixture', projectId: project.id }),
      secondService.load({ userId: 'founder-fixture', projectId: project.id })
    ]);

    for (const result of [first, second]) {
      expect(result.session.stage).toBe('offer');
      expect(result.session.content_plan.craftsmanship).toMatchObject({ status: 'not_required', candidate_version: 2, steps: [] });
      expect(result.session.content_plan.target_eligibility.summary).toMatchObject({ actionable_count: 0, blocked_count: 0 });
    }
    const persisted = store.session();
    expect(persisted.generation_context.approval_reference).toBe(originalApproval);
    expect(persisted.merchant_profile).toEqual(originalIntent);
    expect(persisted.generation_state).toEqual(originalIntelligence);
    expect(persisted.content_plan.target_eligibility.reconciliation_history).toHaveLength(1);
    expect(persisted.content_plan.target_eligibility.scope_binding).toEqual({ project_id: project.id, shop });
    expect(store.activities().filter((entry) => entry.type === 'content_plan_reconciled')).toHaveLength(1);
    expect(store.activities()[0].actor_user_id).toBeNull();
  });

  it('fails closed instead of rebinding persisted content eligibility to a different assigned shop', async () => {
    const { store, project } = controlledStore();
    const service = serviceFor(store, 1000);
    await service.load({ userId: 'founder-fixture', projectId: project.id });
    store.changeShop('different-controlled-shop.myshopify.com');
    await expect(service.load({ userId: 'founder-fixture', projectId: project.id })).rejects.toMatchObject({
      code: 'content_plan_reconciliation_shop_mismatch'
    });
  });

  it('retains and audits stale-plan transitions when Store Resources leaves another target actionable', async () => {
    const { store, project } = controlledStore({
      initialStage: 'resources',
      includeActionableLookbook: true,
      resourcesApproved: false
    });
    const service = serviceFor(store, 1000);

    const result = await service.updateResources({
      userId: 'founder-fixture',
      projectId: project.id
    });

    expect(result.session.stage).toBe('content-plan');
    expect(result.session.content_plan.craftsmanship).toMatchObject({ status: 'not_required', steps: [] });
    expect(result.session.content_plan.target_eligibility.summary).toMatchObject({ actionable_count: 1, blocked_count: 0 });
    const reconciliation = store.activities().find((entry) => entry.type === 'content_plan_reconciled');
    expect(reconciliation).toBeTruthy();
    expect(reconciliation.payload.transition_count).toBe(1);
    expect(result.session.content_plan.target_eligibility.reconciliation_history).toHaveLength(1);
  });
});
