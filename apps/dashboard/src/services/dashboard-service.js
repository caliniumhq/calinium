import { DashboardApiClient } from '../adapters/dashboard-api-client';

export class DashboardService {
  constructor({ client = new DashboardApiClient() } = {}) { this.client = client; }
  isEmbedded() { return this.client.isEmbedded(); }
  async bootstrap(projectId = null) {
    if (this.isEmbedded()) return this.client.bootstrapEmbedded(projectId);
    await this.client.ensureCsrf();
    try { return await this.client.me(); } catch (error) { if (error.status === 401) return null; throw error; }
  }
  signUp(input) { return this.client.signUp(input); }
  signIn(input) { return this.client.signIn(input); }
  signOut() { return this.client.signOut(); }
  overview() { return this.client.overview(); }
  createProject(input) { return this.client.createProject(input); }
  project(projectId) { return this.client.project(projectId); }
  account() { return this.client.account(); }
  updateAccount(input) { return this.client.updateAccount(input); }
  updateOrganization(input) { return this.client.updateOrganization(input); }
  preferences() { return this.client.preferences(); }
  updatePreferences(input) { return this.client.updatePreferences(input); }
  assets(projectId, assetType) { return this.client.assets(projectId, assetType); }
  uploadAsset(projectId, input) { return this.client.uploadAsset(projectId, input); }
  updateAsset(projectId, assetId, input) { return this.client.updateAsset(projectId, assetId, input); }
  deleteAsset(projectId, assetId, confirmed) { return this.client.deleteAsset(projectId, assetId, confirmed); }
  extractAssetPalette(projectId, assetId) { return this.client.extractAssetPalette(projectId, assetId); }
  categorizeShopifyFileCandidate(projectId, resourceId, assetCategory) { return this.client.categorizeShopifyFileCandidate(projectId, resourceId, assetCategory); }
  decideShopifyResource(projectId, resourceId, status, note = '') { return this.client.decideShopifyResource(projectId, resourceId, status, note); }
  revokeShopifyResource(projectId, resourceId, note = '') { return this.client.revokeShopifyResource(projectId, resourceId, note); }
  assetDownloadUrl(projectId, assetId) { return this.client.assetDownloadUrl(projectId, assetId); }
}
