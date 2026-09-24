import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { reconcileResourcePlan, founderPortraitPolicy } = require('../../../pipeline/strategy-section-policy');
const { createDashboardServices } = require('../server/dashboard-services.cjs');

const root = path.resolve(process.cwd(), '../..');

function testDatabase() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-founder-policy-')), 'dashboard.sqlite'); }
function clockFactory() { let second = 0; return () => new Date(`2026-07-24T17:40:${String(second++).padStart(2, '0')}.000Z`); }
async function servicesFor(database) { return createDashboardServices({ root, env: { CALINIUM_SQLITE_PATH: database }, clock: clockFactory() }); }

function recipeOnlyStrategy() {
  return {
    homepage: {
      sections: [
        { sectionId: 'editorial-hero', source: 'existing_strategy_compiler' },
        { sectionId: 'founder-story', source: 'existing_strategy_compiler' }
      ]
    }
  };
}

function founderPlan() {
  return {
    status: 'ready',
    required_assets: [
      { asset_id: 'hero_image', label: 'Hero image' },
      { asset_id: 'founder_portrait', label: 'Founder portrait' }
    ],
    fields: [
      { setting_ref: 'editorial-hero.image', section_id: 'editorial-hero', kind: 'image', required: true },
      { setting_ref: 'founder-story.image', section_id: 'founder-story', kind: 'image', required: true }
    ],
    groups: [],
    required_confirmations: ['review:verification:founder-story:founder_portrait', 'field:editorial-hero.image']
  };
}

async function completeConversation(services, userId, projectId) {
  await services.creativeDirector.start({ userId, projectId });
  await services.creativeDirector.respond({ userId, projectId, message: 'Handmade leather travel bags' });
  await services.creativeDirector.respond({ userId, projectId, message: 'Frequent travelers who value lasting materials' });
  await services.creativeDirector.respond({ userId, projectId, message: 'Present a more premium brand' });
  await services.creativeDirector.respond({ userId, projectId, message: 'Warm, refined, editorial' });
  await services.creativeDirector.createBrief({ userId, projectId });
  await services.creativeDirector.approveBrief({ userId, projectId });
  const strategyReview = await services.creativeDirector.load({ userId, projectId });
  for (const recommendation of strategyReview.session.store_strategy.recommendations || []) {
    if (recommendation.requiresMerchantApproval) await services.creativeDirector.decideRecommendation({
      userId,
      projectId,
      recommendationPath: recommendation.id,
      status: recommendation.id === 'founder-story' ? 'rejected' : 'approved'
    });
  }
}

describe('founder portrait requirement policy', () => {
  it('omits legacy Full Screen Hero video unless a video-led hero was explicitly approved', () => {
    const image = { setting_ref: 'full-screen-hero.image', setting_id: 'image', section_id: 'full-screen-hero', kind: 'image', required: true };
    const video = { setting_ref: 'full-screen-hero.video', setting_id: 'video', section_id: 'full-screen-hero', kind: 'video', required: true };
    const resourcePlan = { status: 'ready', required_assets: [], fields: [image, video], groups: [], required_confirmations: ['field:full-screen-hero.video'] };
    const storeStrategy = { homepage: { hero: { treatment: 'Image-led editorial introduction' }, sections: [{ sectionId: 'full-screen-hero' }] } };
    const review = { decisions: [{ path: 'homepage-hero', status: 'approved' }] };

    const result = reconcileResourcePlan({ resourcePlan, storeStrategy, review });

    expect(result.resourcePlan.fields).toEqual([image]);
    expect(result.resourcePlan.required_confirmations).toEqual([]);
    expect(result.changes).toEqual([expect.objectContaining({ setting_ref: video.setting_ref, reason: 'full_screen_hero_video_optional' })]);
  });

  it('retains Full Screen Hero video for an explicitly approved video-led treatment', () => {
    const video = { setting_ref: 'full-screen-hero.video', setting_id: 'video', section_id: 'full-screen-hero', kind: 'video', required: true };
    const resourcePlan = { status: 'ready', required_assets: [], fields: [video], groups: [], required_confirmations: [] };
    const storeStrategy = { homepage: { hero: { treatment: 'Video hero' }, sections: [{ sectionId: 'full-screen-hero' }] } };
    const review = { decisions: [{ path: 'homepage-hero', status: 'approved' }] };

    const result = reconcileResourcePlan({ resourcePlan, storeStrategy, review });

    expect(result.changed).toBe(false);
    expect(result.resourcePlan.fields).toEqual([video]);
  });

  it('keeps a recipe-only Founder Story optional and preserves every unrelated approved resource requirement', () => {
    const result = reconcileResourcePlan({
      resourcePlan: founderPlan(),
      storeStrategy: recipeOnlyStrategy(),
      review: { storeStrategyStatus: 'approved', decisions: [] }
    });

    expect(result.changed).toBe(true);
    expect(result.policy.portrait_required).toBe(false);
    expect(result.resourcePlan.required_assets.map((asset) => asset.asset_id)).toEqual(['hero_image']);
    expect(result.resourcePlan.fields.map((field) => field.setting_ref)).toEqual(['editorial-hero.image']);
    expect(result.resourcePlan.required_confirmations).toEqual(['field:editorial-hero.image']);
  });

  it('requires a portrait only after the merchant explicitly approves the founder-led direction', () => {
    const policy = founderPortraitPolicy({
      storeStrategy: recipeOnlyStrategy(),
      review: { storeStrategyStatus: 'approved', decisions: [{ path: 'founder-story', status: 'approved' }] }
    });
    const result = reconcileResourcePlan({ resourcePlan: founderPlan(), storeStrategy: recipeOnlyStrategy(), review: { decisions: [{ path: 'founder-story', status: 'approved' }] } });

    expect(policy.portrait_required).toBe(true);
    expect(result.changed).toBe(false);
    expect(result.resourcePlan.required_assets.map((asset) => asset.asset_id)).toContain('founder_portrait');
  });

  it('builds a Resource Plan without a Founder Portrait when the approved Store Strategy did not explicitly approve a founder-led section', async () => {
    const services = await servicesFor(testDatabase());
    const registered = await services.auth.register({ email: 'founder-policy@example.com', password: 'correct-horse-battery-staple', fullName: 'Founder policy', organizationName: 'Policy Studio', ipAddress: '127.0.0.1' });
    const project = (await services.projects.createProject({ userId: registered.user.id, input: { name: 'Travel Bags', business_name: 'Northline Atelier', country: 'GB' } })).project;

    await completeConversation(services, registered.user.id, project.id);
    const approved = await services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id });

    expect(approved.session.review.storeStrategyStatus).toBe('approved');
    expect(approved.session.review.decisions.find((decision) => decision.path === 'founder-story')?.status).toBe('rejected');
    expect(approved.session.resource_plan.required_assets.map((asset) => asset.asset_id)).not.toContain('founder_portrait');
    expect(approved.session.resource_plan.fields.some((field) => field.section_id === 'founder-story')).toBe(false);
    expect(approved.session.resource_plan.required_confirmations.some((entry) => entry.includes('founder'))).toBe(false);
    await services.close();
  });

  it('does not leave a recipe-only Founder Portrait as an eligibility blocker after the plan is re-evaluated', async () => {
    const services = await servicesFor(testDatabase());
    const registered = await services.auth.register({ email: 'founder-eligibility@example.com', password: 'correct-horse-battery-staple', fullName: 'Eligibility policy', organizationName: 'Policy Studio', ipAddress: '127.0.0.1' });
    const project = (await services.projects.createProject({ userId: registered.user.id, input: { name: 'Travel Bags', business_name: 'Northline Atelier', country: 'GB' } })).project;

    await completeConversation(services, registered.user.id, project.id);
    const approved = await services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id });
    await services.store.updateCreativeDirector(project.id, {
      ...approved.session,
      // Keep this regression narrowly about the historical recipe-only
      // Founder Story path. Evidence-plan eligibility is covered separately.
      store_strategy: recipeOnlyStrategy(),
      preset_selection: null,
      resource_plan: {
        ...founderPlan(),
        required_assets: [{ asset_id: 'founder_portrait', label: 'Founder portrait' }],
        fields: [{ setting_ref: 'founder-story.image', section_id: 'founder-story', kind: 'image', required: true }],
        required_confirmations: ['review:verification:founder-story:founder_portrait']
      },
      generation_context: {
        ...approved.session.generation_context,
        status: 'ready_for_generation',
        approval_reference: 'merchant-resource-approval-fixture',
        approved_at: '2026-07-24T17:45:00.000Z'
      }
    });

    const result = await services.customThemes.eligibility({ userId: registered.user.id, projectId: project.id });
    expect(result.eligibility.blocked.map((item) => item.id)).not.toContain('merchant_assets');
    expect(result.eligibility.blocked.map((item) => item.id)).toContain('preset_approval');
    await services.close();
  });
});
