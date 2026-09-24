import { DashboardApiClient } from '../adapters/dashboard-api-client';

export class InterviewService {
  constructor({ client = new DashboardApiClient(), projectId } = {}) {
    this.client = client;
    this.projectId = projectId;
  }

  requireProject() { if (!this.projectId) throw new Error('A project is required for an interview.'); return this.projectId; }
  async load() { const result = await this.client.interview(this.requireProject()); return { catalog: result.catalog }; }
  async savedSession() {
    const result = await this.client.interview(this.requireProject());
    return result.record?.engine_session?.status === 'in_progress' ? { session: result.record.engine_session, activeCategoryId: result.record.active_category_id } : null;
  }
  persist() {}
  clearPersisted() {}
  async create() { const result = await this.client.createInterview(this.requireProject()); return { session: result.record.engine_session }; }
  async save(_session, answerPatch, _savedAt, activeCategoryId) {
    const result = await this.client.saveInterview(this.requireProject(), answerPatch, activeCategoryId);
    return { session: result.record.engine_session, inactive_answers_removed: result.inactive_answers_removed };
  }
  async savePosition(_session, activeCategoryId) { await this.client.saveInterviewPosition(this.requireProject(), activeCategoryId); }
  async resume() { const result = await this.client.resumeInterview(this.requireProject()); return { session: result.record.engine_session }; }
  inspect(answers) { return this.client.inspectInterview(this.requireProject(), answers); }
  validate(answers, requireComplete) { return this.client.validateInterview(this.requireProject(), answers, requireComplete); }
  preview() { return this.client.previewInterview(this.requireProject()); }
  async complete() { const result = await this.client.completeInterview(this.requireProject()); return { session: result.record.engine_session, profile: result.profile.profile, summary: result.summary, mappings: result.mappings }; }
  async abandon() { const result = await this.client.abandonInterview(this.requireProject()); return { session: result.record.engine_session }; }
  assets(assetType) { return this.client.assets(this.requireProject(), assetType); }
  uploadAsset(input) { return this.client.uploadAsset(this.requireProject(), input); }
  extractAssetPalette(assetId) { return this.client.extractAssetPalette(this.requireProject(), assetId); }
  assetDownloadUrl(assetId) { return this.client.assetDownloadUrl(this.requireProject(), assetId); }
}
