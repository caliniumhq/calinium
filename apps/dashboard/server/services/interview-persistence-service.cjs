'use strict';

const { createId } = require('../lib/ids.cjs');
const { DashboardError } = require('../lib/errors.cjs');
const { isoNow } = require('../lib/serialization.cjs');

class InterviewPersistenceService {
  constructor({ store, projectService, assetService, adapter, clock = () => new Date() }) {
    this.store = store;
    this.projectService = projectService;
    this.assetService = assetService;
    this.adapter = adapter;
    this.clock = clock;
  }
  now() { return isoNow(this.clock); }
  catalog() { return this.adapter.load().catalog; }
  async authorize({ userId, projectId, permission = 'interview:edit' }) {
    const project = await this.store.findProjectById(projectId);
    if (!project) throw new DashboardError('project_not_found', 'Project not found.', 404);
    await this.projectService.requireMembership(project.organization_id, userId, permission);
    return project;
  }
  async load({ userId, projectId }) {
    await this.authorize({ userId, projectId, permission: 'project:view' });
    return { catalog: this.catalog(), record: await this.store.findInterviewForProject(projectId) };
  }
  async create({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId });
    const existing = await this.store.findInterviewForProject(projectId);
    if (existing?.engine_session?.status === 'in_progress') return { record: existing, resumed: true };
    const at = this.now();
    const created = this.adapter.create({ sessionId: `merchant-interview-${createId('session').slice(8)}`, createdAt: at }).session;
    const record = existing
      ? await this.store.updateInterview(projectId, { engine_session: created, active_category_id: this.catalog().categories[0]?.id || null, updated_at: at })
      : await this.store.createInterview({ id: createId('pis'), project_id: projectId, engine_session: created, active_category_id: this.catalog().categories[0]?.id || null, created_at: at, updated_at: at });
    await this.activity(project, userId, 'interview_created', {});
    return { record, resumed: false };
  }
  async resume({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId });
    const record = await this.requireRecord(projectId);
    const at = this.now();
    const resumed = this.adapter.resume({ session: record.engine_session, resumedAt: at }).session;
    const updated = await this.store.updateInterview(projectId, { engine_session: resumed, active_category_id: record.active_category_id, updated_at: at });
    await this.activity(project, userId, 'interview_resumed', {});
    return { record: updated };
  }
  async inspect({ userId, projectId, answers }) {
    await this.authorize({ userId, projectId });
    return this.adapter.inspect({ answers: answers || {} });
  }
  async validate({ userId, projectId, answers, requireComplete = false }) {
    await this.authorize({ userId, projectId });
    return this.adapter.validate({ answers: answers || {}, requireComplete });
  }
  async save({ userId, projectId, answerPatch, activeCategoryId }) {
    const project = await this.authorize({ userId, projectId });
    const record = await this.requireRecord(projectId);
    if (record.engine_session.status !== 'in_progress') throw new DashboardError('interview_not_editable', 'Start a new interview before editing answers.', 409);
    const at = this.now();
    const result = this.adapter.save({ session: record.engine_session, answerPatch: answerPatch || {}, savedAt: at });
    const updated = await this.store.updateInterview(projectId, { engine_session: result.session, active_category_id: activeCategoryId ?? record.active_category_id, updated_at: at });
    const questionIds = Object.keys(answerPatch || {});
    await this.activity(project, userId, 'interview_progress_saved', { question_ids: questionIds });
    await this.recordDiscoveryActivity(project, userId, questionIds);
    return { record: updated, inactive_answers_removed: result.inactive_answers_removed };
  }
  async setActiveCategory({ userId, projectId, activeCategoryId }) {
    await this.authorize({ userId, projectId });
    const record = await this.requireRecord(projectId);
    const updated = await this.store.updateInterview(projectId, { engine_session: record.engine_session, active_category_id: activeCategoryId || null, updated_at: this.now(), completed_at: record.engine_session.status === 'completed' ? record.updated_at : null });
    return { record: updated };
  }
  async preview({ userId, projectId }) {
    await this.authorize({ userId, projectId });
    const record = await this.requireRecord(projectId);
    const enrichmentContext = await this.assetService.assetsForProfileContext({ userId, projectId });
    return this.adapter.preview({ session: record.engine_session, enrichmentContext });
  }
  async complete({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId });
    const record = await this.requireRecord(projectId);
    const at = this.now();
    const enrichmentContext = await this.assetService.assetsForProfileContext({ userId, projectId });
    const completed = this.adapter.complete({ session: record.engine_session, completedAt: at, enrichmentContext });
    let savedProfile;
    await this.store.transaction(async (transaction) => {
      await transaction.updateInterview(projectId, { engine_session: completed.session, active_category_id: record.active_category_id, updated_at: at, completed_at: at });
      savedProfile = await transaction.saveMerchantProfile({ id: createId('mpr'), project_id: projectId, interview_session_id: record.id, profile: completed.profile, created_at: at });
      await transaction.updateProjectProfilePointer(projectId, savedProfile.id, at);
      await transaction.createActivity({ id: createId('act'), organization_id: project.organization_id, project_id: projectId, actor_user_id: userId, type: 'merchant_profile_created', payload: { merchant_profile_id: savedProfile.id }, created_at: at });
    });
    return { record: await this.store.findInterviewForProject(projectId), profile: savedProfile, summary: completed.summary, mappings: completed.mappings };
  }
  async abandon({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId });
    const record = await this.requireRecord(projectId);
    const at = this.now();
    const abandoned = this.adapter.abandon({ session: record.engine_session, abandonedAt: at }).session;
    const updated = await this.store.updateInterview(projectId, { engine_session: abandoned, active_category_id: record.active_category_id, updated_at: at });
    await this.activity(project, userId, 'interview_abandoned', {});
    return { record: updated };
  }
  async requireRecord(projectId) {
    const record = await this.store.findInterviewForProject(projectId);
    if (!record) throw new DashboardError('interview_missing', 'Start the interview before continuing.', 409);
    return record;
  }
  async activity(project, userId, type, payload) {
    await this.store.createActivity({ id: createId('act'), organization_id: project.organization_id, project_id: project.id, actor_user_id: userId, type, payload, created_at: this.now() });
  }
  async recordDiscoveryActivity(project, userId, questionIds) {
    const activityRules = [
      ['website_reference_updated', ['discovery_existing_website_url', 'discovery_existing_website_platform', 'discovery_existing_website_live']],
      ['shopify_store_reference_updated', ['discovery_shopify_store_url', 'discovery_shopify_store_live', 'discovery_shopify_structure']],
      ['colors_confirmed', ['content_manual_colors', 'content_extracted_colors']],
      ['typography_updated', ['content_typography_preference', 'content_heading_style', 'content_body_style', 'content_existing_font_names']],
      ['inspiration_reference_updated', ['references_inspiration_entries']],
      ['competitor_reference_updated', ['references_competitor_entries']]
    ];
    for (const [type, ids] of activityRules) {
      const matched = questionIds.filter((id) => ids.includes(id));
      if (matched.length) await this.activity(project, userId, type, { question_ids: matched });
    }
  }
}

module.exports = { InterviewPersistenceService };
