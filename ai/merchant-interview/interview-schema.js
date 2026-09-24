'use strict';

const { createSchemaValidator } = require('../compiler/schema-validator');
const { loadKnowledgeBase } = require('../compiler/load-knowledge-base');
const { validateMerchantProfile } = require('../compiler/validate-profile');
const { unique } = require('./utils');

const PROFILE_DESTINATIONS = new Set([
  'business.name', 'business.model', 'industry', 'subcategory', 'catalog.product_count', 'catalog.product_types', 'catalog.has_variants',
  'catalog.price_positioning', 'audience.primary', 'audience.needs', 'goals.primary', 'goals.secondary', 'assets.available', 'assets.notes',
  'preferences.page_type', 'preferences.design_languages', 'preferences.color_strategies', 'preferences.image_styles', 'preferences.content_density',
  'brand_personality.primary', 'brand_personality.secondary',
  'enrichment.discovery.business_stage', 'enrichment.existing_presence.website.status', 'enrichment.existing_presence.website.url',
  'enrichment.existing_presence.website.platform', 'enrichment.existing_presence.website.is_live', 'enrichment.existing_presence.website.preserve',
  'enrichment.existing_presence.website.improve', 'enrichment.existing_presence.website.dislikes', 'enrichment.existing_presence.shopify.status',
  'enrichment.existing_presence.shopify.url', 'enrichment.existing_presence.shopify.is_live', 'enrichment.existing_presence.shopify.structure_preference',
  'enrichment.existing_presence.shopify.intent', 'enrichment.desired_outcomes', 'enrichment.creative_direction.creative_freedom',
  'enrichment.creative_direction.visual_personality', 'enrichment.creative_direction.emotional_response', 'enrichment.creative_direction.image_emphasis',
  'enrichment.creative_direction.motion_preference', 'enrichment.creative_direction.tradition_direction', 'enrichment.inspiration_references',
  'enrichment.competitor_references', 'enrichment.brand_assets.logo_status', 'enrichment.brand_assets.logo_asset_id',
  'enrichment.brand_colors.source', 'enrichment.brand_colors.palette', 'enrichment.typography.preference',
  'enrichment.typography.heading_styles', 'enrichment.typography.body_styles', 'enrichment.typography.font_references',
  'enrichment.available_content_assets.declared', 'enrichment.asset_readiness.next_step'
]);

function validateInterviewSchema(catalog, { root }) {
  const errors = createSchemaValidator(root).validateFile(catalog, 'schemas/calinium-merchant-interview.schema.json', 'merchant_interview');
  const categoryIds = catalog.categories.map((category) => category.id);
  const questionIds = catalog.questions.map((question) => question.id);
  if (unique(categoryIds).length !== categoryIds.length) errors.push('Interview categories contain duplicate IDs.');
  if (unique(questionIds).length !== questionIds.length) errors.push('Interview questions contain duplicate IDs.');
  if (new Set(catalog.categories.map((category) => category.order)).size !== catalog.categories.length) errors.push('Interview categories contain duplicate display orders.');
  for (const question of catalog.questions) {
    if (!categoryIds.includes(question.category_id)) errors.push(`Question ${question.id} references an unknown category.`);
    if (question.mapping_destination !== null && !PROFILE_DESTINATIONS.has(question.mapping_destination)) errors.push(`Question ${question.id} has an unsupported merchant-profile destination.`);
    if (new Set(question.options.map((option) => option.value)).size !== question.options.length) errors.push(`Question ${question.id} has duplicate option values.`);
    if (['single_choice', 'multiple_choice'].includes(question.answer_type) && !question.options.length) errors.push(`Choice question ${question.id} has no options.`);
    for (const dependency of question.dependencies) if (!questionIds.includes(dependency.question_id)) errors.push(`Question ${question.id} depends on unknown question ${dependency.question_id}.`);
    for (const followUp of question.follow_up_question_ids) if (!questionIds.includes(followUp)) errors.push(`Question ${question.id} has unknown follow-up ${followUp}.`);
  }
  return { valid: errors.length === 0, errors: unique(errors) };
}

function validateInterviewSessionSchema(session, { root }) {
  const errors = createSchemaValidator(root).validateFile(session, 'schemas/calinium-interview-session.schema.json', 'interview_session');
  if (session.status === 'completed' && (!session.confirmed_summary || !session.merchant_profile || !session.summary)) errors.push('Completed session requires a confirmed summary and merchant profile.');
  if (session.status !== 'completed' && (session.confirmed_summary || session.merchant_profile !== null || session.summary !== null)) errors.push('Unfinished or abandoned sessions cannot contain a confirmed summary or merchant profile.');
  if (new Set(session.visible_question_ids).size !== session.visible_question_ids.length) errors.push('Session has duplicate visible question IDs.');
  if (session.merchant_profile !== null) {
    const validation = validateMerchantProfile(session.merchant_profile, loadKnowledgeBase(root), root);
    errors.push(...validation.errors.map((error) => `merchant_profile: ${error}`));
  }
  return { valid: errors.length === 0, errors: unique(errors) };
}

module.exports = { PROFILE_DESTINATIONS, validateInterviewSchema, validateInterviewSessionSchema };
