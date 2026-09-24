'use strict';

const { validateSchema } = require('../ai/shared/schema');

function createReviewState() {
  return { version: '1.0', creativeBriefStatus: 'pending', storeStrategyStatus: 'pending', decisions: [], factCorrections: [] };
}

function recordDecision(review, path, status, merchantComment = '') {
  const decisions = review.decisions.filter((decision) => decision.path !== path);
  return { ...review, decisions: [...decisions, { path, status, merchantComment }] };
}

function correctUnderstanding(review, path, value, merchantComment = '') {
  const factCorrections = review.factCorrections.filter((correction) => correction.path !== path);
  return { ...review, creativeBriefStatus: 'revision_requested', factCorrections: [...factCorrections, { path, value, merchantComment }] };
}

function setCreativeBriefStatus(review, status) {
  return { ...review, creativeBriefStatus: status };
}

function setStoreStrategyStatus(review, status) {
  return { ...review, storeStrategyStatus: status };
}

function approveAll(review) {
  return { ...review, creativeBriefStatus: 'approved', storeStrategyStatus: 'approved' };
}

function approveRecommendation(review, path, merchantComment = '') {
  return recordDecision(review, path, 'approved', merchantComment);
}

function rejectRecommendation(review, path, merchantComment = '') {
  return { ...recordDecision(review, path, 'rejected', merchantComment), storeStrategyStatus: 'revision_requested' };
}

function requestRevision(review, path, merchantComment = '') {
  return { ...recordDecision(review, path, 'revision_requested', merchantComment), storeStrategyStatus: 'revision_requested' };
}

function validateReviewState(review, options = {}) {
  const errors = validateSchema(review, 'schemas/creative-director-review.schema.json', { ...options, location: 'creative director review' });
  return { valid: errors.length === 0, errors };
}

module.exports = {
  createReviewState,
  recordDecision,
  correctUnderstanding,
  setCreativeBriefStatus,
  setStoreStrategyStatus,
  approveAll,
  approveRecommendation,
  rejectRecommendation,
  requestRevision,
  validateReviewState
};
