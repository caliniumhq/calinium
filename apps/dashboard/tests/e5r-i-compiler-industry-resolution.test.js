import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardServices } = require('../server/dashboard-services.cjs');

const root = path.resolve(process.cwd(), '../..');
const password = 'correct-horse-battery-staple';
function testDatabase() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-e5r-i-')), 'dashboard.sqlite'); }
function clockFactory() { let tick = 0; const base = Date.parse('2026-08-27T09:00:00.000Z'); return () => new Date(base + (tick++ * 1000)); }

async function setup() {
  const services = await createDashboardServices({ root, env: { CALINIUM_SQLITE_PATH: testDatabase() }, clock: clockFactory() });
  const registered = await services.auth.register({ email: 'snowboard-e5r-i@example.com', password, fullName: 'Controlled Founder', organizationName: 'Controlled Staging', ipAddress: '127.0.0.1' });
  const created = await services.projects.createProject({ userId: registered.user.id, input: { name: 'Controlled Snowboard Store', business_name: 'Calinium Staging Store', country: 'US' } });
  return { services, registered, project: created.project };
}

async function reachPersistedRelease4Strategy(services, userId, projectId) {
  await services.creativeDirector.start({ userId, projectId });
  await services.creativeDirector.respond({ userId, projectId, message: 'Snowboards and snowboard wax.' });
  await services.creativeDirector.respond({ userId, projectId, message: 'Recreational snowboard shoppers.' });
  await services.creativeDirector.respond({ userId, projectId, message: 'Help customers discover products and buy confidently.' });
  await services.creativeDirector.respond({ userId, projectId, message: 'Clear and confident.' });
  await services.creativeDirector.createBrief({ userId, projectId });
  let { session } = await services.creativeDirector.approveBrief({ userId, projectId });

  const release4Strategy = structuredClone(session.store_strategy);
  release4Strategy.traceability.legacyCompilerStrategy = null;
  delete release4Strategy.traceability.compilerIndustryResolution;
  release4Strategy.homepage.sections = [
    { sectionId: 'hero-slideshow', purpose: 'Introduce the offer.', rationale: 'Release-4 sanitized fallback.', source: 'creative_director_fallback' },
    { sectionId: 'featured-collection', purpose: 'Support discovery.', rationale: 'Release-4 sanitized fallback.', source: 'creative_director_fallback' },
    { sectionId: 'newsletter', purpose: 'Support retention.', rationale: 'Release-4 sanitized fallback.', source: 'creative_director_fallback' }
  ];
  session = await services.store.updateCreativeDirector(projectId, { ...session, store_strategy: release4Strategy });
  for (const recommendation of session.store_strategy.recommendations) {
    ({ session } = await services.creativeDirector.decideRecommendation({ userId, projectId, recommendationPath: recommendation.id, status: 'approved' }));
  }
  return session;
}

describe('E5R-I compiler-supported industry resolution', () => {
  it('reuses the four release-4 approvals, advances once, and makes identical retry idempotent', async () => {
    const { services, registered, project } = await setup();
    const before = await reachPersistedRelease4Strategy(services, registered.user.id, project.id);
    expect(before.stage).toBe('strategy');
    expect(before.review.storeStrategyStatus).toBe('pending');
    expect(before.review.decisions).toHaveLength(4);
    expect(before.review.decisions.every((decision) => decision.status === 'approved')).toBe(true);

    const approved = await services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id });
    expect(approved.session.stage).toBe('preset');
    expect(approved.session.review.storeStrategyStatus).toBe('approved');
    expect(approved.session.review.decisions).toEqual(before.review.decisions);
    expect(approved.session.merchant_profile.business.offer.join(' and ')).toBe('Snowboards and snowboard wax.');
    expect(approved.session.merchant_profile.theme.compiler_context.industry).toBe('sports');
    expect(approved.session.merchant_profile.traceability.compiler_industry_resolution).toMatchObject({
      contract_version: 'compiler-supported-industry-resolution-v1',
      status: 'supported_profile',
      compiler_profile_id: 'sports'
    });
    expect(approved.session.preset_selection.status).toBe('draft');

    const activityAfterFirst = await services.store.listProjectActivity(project.id, 100);
    expect(activityAfterFirst.filter((event) => event.type === 'store_strategy_approved')).toHaveLength(1);
    const replay = await services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id });
    expect(replay.session.updated_at).toBe(approved.session.updated_at);
    expect(replay.session.preset_selection).toEqual(approved.session.preset_selection);
    const activityAfterReplay = await services.store.listProjectActivity(project.id, 100);
    expect(activityAfterReplay.filter((event) => event.type === 'store_strategy_approved')).toHaveLength(1);

    const changed = structuredClone(replay.session.store_strategy);
    changed.designDirection.name = 'conflicting stale revision';
    await services.store.updateCreativeDirector(project.id, { ...replay.session, store_strategy: changed, updated_at: '2026-08-27T10:00:00.000Z' });
    await expect(services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id })).rejects.toMatchObject({ code: 'store_strategy_stale', status: 409 });
    await services.close();
  });
});
