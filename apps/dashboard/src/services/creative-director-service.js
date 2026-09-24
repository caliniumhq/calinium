import { DashboardApiClient } from '../adapters/dashboard-api-client';

export class CreativeDirectorService {
  constructor({ client = new DashboardApiClient(), projectId } = {}) {
    this.client = client;
    this.projectId = projectId;
  }

  requireProject() {
    if (!this.projectId) throw new Error('A project is required before Calinium can start designing.');
    return this.projectId;
  }

  load() { return this.client.creativeDirector(this.requireProject()); }
  start() { return this.client.startCreativeDirector(this.requireProject()); }
  restart() { return this.client.restartCreativeDirector(this.requireProject()); }
  respond(message, context) { return this.client.respondCreativeDirector(this.requireProject(), message, context); }
  correct(path, value) { return this.client.correctCreativeDirector(this.requireProject(), path, value); }
  createBrief() { return this.client.createCreativeBrief(this.requireProject()); }
  approveBrief() { return this.client.approveCreativeBrief(this.requireProject()); }
  requestBriefRevision(comment) { return this.client.requestCreativeBriefRevision(this.requireProject(), comment); }
  decideRecommendation(path, status, comment) { return this.client.reviewCreativeRecommendation(this.requireProject(), path, status, comment); }
  approveStrategy() { return this.client.approveStoreStrategy(this.requireProject()); }
  selectPreset(expectedVersion, presetId) { return this.client.selectStorefrontPreset(this.requireProject(), expectedVersion, presetId); }
  approvePreset(expectedVersion) { return this.client.approveStorefrontPreset(this.requireProject(), expectedVersion); }
  updateResources(assetSelections, requiredAssetSelections, shopifySelections, resolvedEmptyFields, confirmedRequiredConfirmations = [], expectedResourceDecisionChecksum = null) { return this.client.updateCreativeResources(this.requireProject(), assetSelections, requiredAssetSelections, shopifySelections, resolvedEmptyFields, confirmedRequiredConfirmations, expectedResourceDecisionChecksum); }
  saveEditorialGridPlan(expectedVersion, stories) { return this.client.saveEditorialGridPlan(this.requireProject(), expectedVersion, stories); }
  regenerateEditorialGridPlan(expectedVersion) { return this.client.regenerateEditorialGridPlan(this.requireProject(), expectedVersion); }
  approveEditorialGridPlan(expectedVersion) { return this.client.approveEditorialGridPlan(this.requireProject(), expectedVersion); }
  saveLookbookPlan(expectedVersion, frames) { return this.client.saveLookbookPlan(this.requireProject(), expectedVersion, frames); }
  regenerateLookbookPlan(expectedVersion) { return this.client.regenerateLookbookPlan(this.requireProject(), expectedVersion); }
  approveLookbookPlan(expectedVersion) { return this.client.approveLookbookPlan(this.requireProject(), expectedVersion); }
  saveCraftsmanshipPlan(expectedVersion, steps) { return this.client.saveCraftsmanshipPlan(this.requireProject(), expectedVersion, steps); }
  regenerateCraftsmanshipPlan(expectedVersion) { return this.client.regenerateCraftsmanshipPlan(this.requireProject(), expectedVersion); }
  approveCraftsmanshipPlan(expectedVersion) { return this.client.approveCraftsmanshipPlan(this.requireProject(), expectedVersion); }
  saveManufacturingProcessPlan(expectedVersion, steps) { return this.client.saveManufacturingProcessPlan(this.requireProject(), expectedVersion, steps); }
  regenerateManufacturingProcessPlan(expectedVersion) { return this.client.regenerateManufacturingProcessPlan(this.requireProject(), expectedVersion); }
  approveManufacturingProcessPlan(expectedVersion) { return this.client.approveManufacturingProcessPlan(this.requireProject(), expectedVersion); }
  saveBrandTimelinePlan(expectedVersion, milestones) { return this.client.saveBrandTimelinePlan(this.requireProject(), expectedVersion, milestones); }
  regenerateBrandTimelinePlan(expectedVersion) { return this.client.regenerateBrandTimelinePlan(this.requireProject(), expectedVersion); }
  approveBrandTimelinePlan(expectedVersion) { return this.client.approveBrandTimelinePlan(this.requireProject(), expectedVersion); }
  saveSustainabilityPlan(expectedVersion, initiatives) { return this.client.saveSustainabilityPlan(this.requireProject(), expectedVersion, initiatives); }
  regenerateSustainabilityPlan(expectedVersion) { return this.client.regenerateSustainabilityPlan(this.requireProject(), expectedVersion); }
  approveSustainabilityPlan(expectedVersion) { return this.client.approveSustainabilityPlan(this.requireProject(), expectedVersion); }
  saveTeamPlan(expectedVersion, members) { return this.client.saveTeamPlan(this.requireProject(), expectedVersion, members); }
  regenerateTeamPlan(expectedVersion) { return this.client.regenerateTeamPlan(this.requireProject(), expectedVersion); }
  approveTeamPlan(expectedVersion) { return this.client.approveTeamPlan(this.requireProject(), expectedVersion); }
  saveAwardsCertificationsPlan(expectedVersion, recognitions) { return this.client.saveAwardsCertificationsPlan(this.requireProject(), expectedVersion, recognitions); }
  regenerateAwardsCertificationsPlan(expectedVersion) { return this.client.regenerateAwardsCertificationsPlan(this.requireProject(), expectedVersion); }
  approveAwardsCertificationsPlan(expectedVersion) { return this.client.approveAwardsCertificationsPlan(this.requireProject(), expectedVersion); }
  saveCommercePlan(identity, expectedVersion, products, scene = {}) { return this.client.saveCommercePlan(this.requireProject(), identity, expectedVersion, products, scene); }
  regenerateCommercePlan(identity, expectedVersion) { return this.client.regenerateCommercePlan(this.requireProject(), identity, expectedVersion); }
  approveCommercePlan(identity, expectedVersion) { return this.client.approveCommercePlan(this.requireProject(), identity, expectedVersion); }
  saveCrossSellProductsPlan(expectedVersion, products, scene) { return this.saveCommercePlan('cross-sell-products', expectedVersion, products, scene); }
  regenerateCrossSellProductsPlan(expectedVersion) { return this.regenerateCommercePlan('cross-sell-products', expectedVersion); }
  approveCrossSellProductsPlan(expectedVersion) { return this.approveCommercePlan('cross-sell-products', expectedVersion); }
  saveProductBundleShowcasePlan(expectedVersion, products, scene) { return this.saveCommercePlan('product-bundle-showcase', expectedVersion, products, scene); }
  regenerateProductBundleShowcasePlan(expectedVersion) { return this.regenerateCommercePlan('product-bundle-showcase', expectedVersion); }
  approveProductBundleShowcasePlan(expectedVersion) { return this.approveCommercePlan('product-bundle-showcase', expectedVersion); }
  saveShopTheLookPlan(expectedVersion, products, scene) { return this.saveCommercePlan('shop-the-look', expectedVersion, products, scene); }
  regenerateShopTheLookPlan(expectedVersion) { return this.regenerateCommercePlan('shop-the-look', expectedVersion); }
  approveShopTheLookPlan(expectedVersion) { return this.approveCommercePlan('shop-the-look', expectedVersion); }
  saveComplementaryProductsFallbackPlan(expectedVersion, products, scene) { return this.saveCommercePlan('complementary-products-fallback', expectedVersion, products, scene); }
  regenerateComplementaryProductsFallbackPlan(expectedVersion) { return this.regenerateCommercePlan('complementary-products-fallback', expectedVersion); }
  approveComplementaryProductsFallbackPlan(expectedVersion) { return this.approveCommercePlan('complementary-products-fallback', expectedVersion); }
  generate() { return this.client.generateCreativeStorefront(this.requireProject()); }
  setStage(stage) { return this.client.setCreativeDirectorStage(this.requireProject(), stage); }
  customThemeEligibility() { return this.client.customThemeEligibility(this.requireProject()); }
  customThemeOrder() { return this.client.customThemeOrder(this.requireProject()); }
  createCustomThemeOrder(idempotencyKey, readinessToken) { return this.client.createCustomThemeOrder(this.requireProject(), idempotencyKey, readinessToken); }
  confirmDevelopmentCustomThemePayment(orderId, idempotencyKey) { return this.client.confirmDevelopmentCustomThemePayment(this.requireProject(), orderId, idempotencyKey); }
  verifyCustomThemePayment(orderId, idempotencyKey) { return this.client.verifyCustomThemePayment(this.requireProject(), orderId, idempotencyKey); }
  retryCustomThemeGeneration(orderId) { return this.client.retryCustomThemeGeneration(this.requireProject(), orderId); }
  merchantGenerationFlow() { return this.client.merchantGenerationFlow(this.requireProject()); }
  analysisFirstExperience() { return this.client.analysisFirstExperience(this.requireProject()); }
  selectAnalysisFirstDirection(directionId, actionBinding) { return this.client.selectAnalysisFirstDirection(this.requireProject(), directionId, actionBinding); }
  recordAnalysisFirstTelemetry(input) { return this.client.recordAnalysisFirstTelemetry(this.requireProject(), input); }
  operatorReadiness() { return this.client.merchantGenerationFlowOperatorReadiness(this.requireProject()); }
  refreshOperatorReadiness() { return this.client.merchantGenerationFlowOperatorReadinessRefresh(this.requireProject()); }
  recoverFounderQaEvidence(submission) { return this.client.merchantGenerationFlowOperatorRecoverQaReviewEvidence(this.requireProject(), submission); }
  recoverPreviewProvenance(submission) { return this.client.merchantGenerationFlowOperatorRecoverPreviewProvenance(this.requireProject(), submission); }
  succeedRenderTarget(submission) { return this.client.merchantGenerationFlowOperatorSucceedRenderTarget(this.requireProject(), submission); }
  submitFounderQa(submission) { return this.client.merchantGenerationFlowOperatorQaReview(this.requireProject(), submission); }
  startMerchantGenerationFlow() { return this.client.startMerchantGenerationFlow(this.requireProject()); }
  answerMerchantGenerationFlow(flowId, questionId, message, expectedFlowChecksum) { return this.client.answerMerchantGenerationFlow(this.requireProject(), flowId, questionId, message, expectedFlowChecksum); }
  resumeMerchantGenerationFlow(flowId, expectedFlowChecksum, expectedFlowSequence) { return this.client.resumeMerchantGenerationFlow(this.requireProject(), flowId, expectedFlowChecksum, expectedFlowSequence); }
  downloadCustomThemeArtifact(orderId, artifact) { return this.client.downloadCustomThemeArtifact(this.requireProject(), orderId, artifact); }
  startShopifyConnection(shopDomain, purpose = 'discovery') { return this.client.startShopifyConnection(this.requireProject(), shopDomain, purpose); }
  shopifyConnections() { return this.client.shopifyConnections(this.requireProject()); }
  assignShopifyConnection(connectionId) { return this.client.assignShopifyConnection(this.requireProject(), connectionId); }
  checkShopifyConnection(connectionId = null) { return this.client.checkShopifyConnection(this.requireProject(), connectionId); }
  syncShopifyResources(connectionId = null) { return this.client.syncShopifyResources(this.requireProject(), connectionId); }
  merchantIntake() { return this.client.merchantIntake(this.requireProject()); }
  refreshMerchantIntake() { return this.client.refreshMerchantIntake(this.requireProject()); }
  livePreview() { return this.client.livePreview(this.requireProject()); }
  retryLivePreview() { return this.client.retryLivePreview(this.requireProject()); }
  recommendedResourceSet() { return this.client.recommendedResourceSet(this.requireProject()); }
  refreshRecommendedResourceSet() { return this.client.refreshRecommendedResourceSet(this.requireProject()); }
  approveRecommendedResourceSet(expectedRevisionId) { return this.client.approveRecommendedResourceSet(this.requireProject(), expectedRevisionId); }
  replaceRecommendedResource(expectedRevisionId, slotId, selectionId) { return this.client.replaceRecommendedResource(this.requireProject(), expectedRevisionId, slotId, selectionId); }
  creativeDirection() { return this.client.creativeDirection(this.requireProject()); }
  refreshCreativeDirection() { return this.client.refreshCreativeDirection(this.requireProject()); }
  approveCreativeDirection(recommendationRevisionId, designDnaRevisionId) { return this.client.approveCreativeDirection(this.requireProject(), recommendationRevisionId, designDnaRevisionId); }
  disconnectShopifyConnection(connectionId = null) { return this.client.disconnectShopifyConnection(this.requireProject(), connectionId); }
  shopifyResources(options = {}) { return this.client.shopifyResources(this.requireProject(), options); }
  decideShopifyResource(resourceId, status, note = '') { return this.client.decideShopifyResource(this.requireProject(), resourceId, status, note); }
  revokeShopifyResource(resourceId, note = '') { return this.client.revokeShopifyResource(this.requireProject(), resourceId, note); }
  prepareShopifyPreview(generatedBuildId) { return this.client.prepareShopifyPreview(this.requireProject(), generatedBuildId); }
  shopifyPreview() { return this.client.shopifyPreview(this.requireProject()); }
}
