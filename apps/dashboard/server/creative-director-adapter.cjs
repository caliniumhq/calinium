'use strict';

const path = require('path');

const repositoryRoot = path.resolve(__dirname, '../../..');

class CreativeDirectorAdapter {
  constructor({ root = repositoryRoot, conversation = null, pipeline = null } = {}) {
    this.root = root;
    this.conversation = conversation || require(path.join(root, 'ai', 'conversation'));
    this.pipeline = pipeline || require(path.join(root, 'pipeline'));
  }

  initialMerchantInput(project) {
    const input = this.conversation.emptyMerchantInput();
    input.businessName = project.business_name || project.name || null;
    input.existingStoreUrl = project.website_url || project.shopify_store_url || null;
    return input;
  }

  start({ project, conversationId, context = null }) {
    return this.conversation.startConversation({
      merchantInput: this.initialMerchantInput(project),
      conversationId,
      context
    });
  }

  respond({ state, message, context = null }) { return this.conversation.respond({ state, message, context }); }
  correct({ state, path: factPath, value }) { return this.conversation.applyMerchantCorrection(state, factPath, value); }
  understanding(state) { return this.conversation.formatUnderstanding(state); }
  merchantInput(state) { return this.conversation.materializeMerchantInput(state); }
  createCreativeBrief({ state }) { return this.pipeline.createCreativeBrief({ merchantInput: this.merchantInput(state), conversationState: state, root: this.root }); }
  createStoreStrategy({ creativeBrief }) { return this.pipeline.createStoreStrategy({ creativeBrief, root: this.root }); }
  createReviewState() { return this.pipeline.createReviewState(); }
  setCreativeBriefStatus(review, status) { return this.pipeline.setCreativeBriefStatus(review, status); }
  setStoreStrategyStatus(review, status) { return this.pipeline.setStoreStrategyStatus(review, status); }
  approveRecommendation(review, recommendationPath, comment) { return this.pipeline.approveRecommendation(review, recommendationPath, comment); }
  rejectRecommendation(review, recommendationPath, comment) { return this.pipeline.rejectRecommendation(review, recommendationPath, comment); }
  requestRevision(review, recommendationPath, comment) { return this.pipeline.requestRevision(review, recommendationPath, comment); }
  createMerchantProfile({ creativeBrief, storeStrategy, review, generation }) { return this.pipeline.createMerchantProfile({ creativeBrief, storeStrategy, review, generation, root: this.root }); }
  generateStorefront({ creativeBrief, storeStrategy, review, generation, resourcePlan = null, approvedBlockPlanTransport = null, approvedPresetRevision = null, approvedRecommendationRevision = null, approvedDesignDnaRevision = null, architectureSelectionRevision = null, merchantIntent = null, storeIntelligence = null, generationId, runThemeCheck = true }) {
    return this.pipeline.generateStorefront({ creativeBrief, storeStrategy, review, generation, resourcePlan, approvedBlockPlanTransport, approvedPresetRevision, approvedRecommendationRevision, approvedDesignDnaRevision, architectureSelectionRevision, merchantIntent, storeIntelligence, root: this.root, generationId, outputRoot: path.join(this.root, 'output'), runThemeCheck });
  }
}

module.exports = { CreativeDirectorAdapter, repositoryRoot };
