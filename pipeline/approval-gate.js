'use strict';

const { validateCreativeBrief } = require('../ai/creative-brief/validate-creative-brief');
const { validateStoreStrategy } = require('../ai/store-strategy/validate-store-strategy');
const { validateReviewState } = require('./review-state');

class MerchantApprovalRequiredError extends Error {
  constructor(validation) {
    super(`Merchant approval is required before generation: ${validation.errors.join(' ')}`);
    this.name = 'MerchantApprovalRequiredError';
    this.validation = validation;
  }
}

function validationErrors({ creativeBrief, storeStrategy, review, root }) {
  const errors = [];
  const brief = validateCreativeBrief(creativeBrief, { root });
  const strategy = validateStoreStrategy(storeStrategy, { root });
  const reviewValidation = validateReviewState(review, { root });
  if (!brief.valid) errors.push(...brief.errors.map((error) => `Creative Brief: ${error}`));
  if (!strategy.valid) errors.push(...strategy.errors.map((error) => `Store Strategy: ${error}`));
  if (!reviewValidation.valid) errors.push(...reviewValidation.errors.map((error) => `Review: ${error}`));
  if (review?.creativeBriefStatus !== 'approved') errors.push('Approve the Brand Blueprint before continuing.');
  if (review?.storeStrategyStatus !== 'approved') errors.push('Approve the Store Strategy before continuing.');
  for (const decision of review?.decisions || []) {
    if (!['approved', 'rejected'].includes(decision.status)) errors.push(`Resolve the ${decision.path} recommendation before generation.`);
  }
  return errors;
}

function validateCreativeApproval(input) {
  const errors = validationErrors(input);
  return { valid: errors.length === 0, errors, warnings: [] };
}

function assertCreativeApproval(input) {
  const validation = validateCreativeApproval(input);
  if (!validation.valid) throw new MerchantApprovalRequiredError(validation);
  return validation;
}

function createApprovalSummary({ creativeBrief, storeStrategy, review, root }) {
  const validation = validateCreativeApproval({ creativeBrief, storeStrategy, review, root });
  const recommendationRows = (storeStrategy?.recommendations || []).map((item) => {
    const paths = new Set([
      item.id,
      item.area,
      item.id === 'homepage-hero' ? 'homepage.hero' : null,
      item.id === 'design-direction' ? 'designDirection' : null,
      item.id === 'color-direction' ? 'colorDirection' : null,
      item.id === 'typography-direction' ? 'typographyDirection' : null
    ].filter(Boolean));
    const decision = (review?.decisions || []).find((candidate) => paths.has(candidate.path));
    return { id: item.id, recommendation: item.recommendation, rationale: item.rationale, requires_approval: item.requiresMerchantApproval, status: decision?.status || (review?.storeStrategyStatus === 'approved' ? 'approved' : 'pending') };
  });
  return {
    merchant_understanding: {
      business: creativeBrief?.business?.name || null,
      offer: creativeBrief?.business?.offer || [],
      audience: creativeBrief?.audience?.primary || null,
      primary_goal: creativeBrief?.goals?.primary || null,
      brand_feeling: creativeBrief?.brand?.desiredFeeling || []
    },
    creative_brief_status: review?.creativeBriefStatus || 'pending',
    store_strategy_status: review?.storeStrategyStatus || 'pending',
    recommendations: recommendationRows,
    approval_required: !validation.valid,
    approval_validation: validation
  };
}

module.exports = { MerchantApprovalRequiredError, validateCreativeApproval, assertCreativeApproval, createApprovalSummary };
