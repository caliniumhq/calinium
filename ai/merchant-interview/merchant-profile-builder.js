'use strict';

const { loadKnowledgeBase } = require('../compiler/load-knowledge-base');
const { validateMerchantProfile } = require('../compiler/validate-profile');
const { validateAnswers } = require('./answer-validator');
const { profilePathValue, unique } = require('./utils');

function arrayAnswer(answers, id) {
  const value = profilePathValue(answers, id, []);
  return Array.isArray(value) ? value : [];
}

function stringArray(value) {
  if (typeof value !== 'string' || !value.trim()) return [];
  return [value.trim()];
}

function stringValue(answers, id) {
  const value = profilePathValue(answers, id, null);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function normalizedUrl(value, { allowDomain = false } = {}) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const supplied = value.trim();
  const candidate = allowDomain && !/^https?:\/\//i.test(supplied) ? `https://${supplied}` : supplied;
  try { return new URL(candidate).toString(); } catch { return null; }
}
function normalizedPalette(value) {
  if (!value || typeof value !== 'object') return null;
  const colors = value.colors || {};
  const normalizeColor = (color) => typeof color === 'string' ? color.toUpperCase() : null;
  return {
    source: value.source,
    approved: value.source === 'extracted' ? value.approved === true : true,
    source_asset_id: typeof value.source_asset_id === 'string' ? value.source_asset_id : null,
    colors: {
      primary: normalizeColor(colors.primary), secondary: normalizeColor(colors.secondary), accent: normalizeColor(colors.accent),
      background: normalizeColor(colors.background), text: normalizeColor(colors.text),
      additional: Array.isArray(colors.additional) ? colors.additional.map(normalizeColor).filter(Boolean) : []
    }
  };
}
function normalizedReferences(value) {
  if (!Array.isArray(value)) return [];
  return value.map((reference) => ({
    name: String(reference.name || '').trim(), url: normalizedUrl(reference.url), reason: stringValue(reference, 'reason'),
    traits: Array.isArray(reference.traits) ? reference.traits.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()) : [],
    specific_focus: typeof reference.specific_focus === 'string' && reference.specific_focus.trim() ? reference.specific_focus.trim() : null,
    screenshot_asset_id: typeof reference.screenshot_asset_id === 'string' ? reference.screenshot_asset_id : null,
    market_relationship: typeof reference.market_relationship === 'string' && reference.market_relationship.trim() ? reference.market_relationship.trim() : null
  }));
}
function assetContext(context = {}) {
  const assets = Array.isArray(context.assets) ? context.assets.filter((asset) => asset && typeof asset.id === 'string') : [];
  return new Map(assets.map((asset) => [asset.id, asset]));
}
function assertedAssetIds(answers, context) {
  const assets = assetContext(context);
  const referenced = [
    profilePathValue(answers, 'content_logo_asset', null),
    profilePathValue(answers, 'content_extracted_color_palette', null)?.source_asset_id,
    ...normalizedReferences(profilePathValue(answers, 'references_inspiration_entries', [])).map((reference) => reference.screenshot_asset_id),
    ...normalizedReferences(profilePathValue(answers, 'references_competitor_entries', [])).map((reference) => reference.screenshot_asset_id)
  ].filter(Boolean);
  for (const id of referenced) if (!assets.has(id)) throw new Error(`Merchant profile references an asset that is not available in the approved project context: ${id}.`);
  return { referenced: unique(referenced).sort(), available: [...assets.keys()].sort() };
}
function enrichmentTrace(catalog, answers, assetIds, palette) {
  const trace = catalog.questions.filter((question) => question.mapping_destination?.startsWith('enrichment.') && Object.prototype.hasOwnProperty.call(answers, question.id)).map((question) => ({ field: question.mapping_destination, source_type: 'interview_answer', source_id: question.id }));
  for (const id of assetIds.referenced) trace.push({ field: 'enrichment.brand_assets.assets', source_type: 'asset', source_id: id });
  if (palette?.source === 'extracted') trace.push({ field: 'enrichment.brand_colors.palette', source_type: 'merchant_approval', source_id: palette.source_asset_id });
  return trace.sort((left, right) => `${left.field}:${left.source_id}`.localeCompare(`${right.field}:${right.source_id}`));
}

function buildMerchantProfile({ root, catalog, answers, enrichmentContext = {} }) {
  const answerValidation = validateAnswers({ catalog, answers, requireComplete: true });
  if (!answerValidation.valid) throw new Error(`Interview answers cannot produce a merchant profile: ${answerValidation.errors.join(' ')}`);
  const assetIds = assertedAssetIds(answers, enrichmentContext);
  const paletteAnswer = profilePathValue(answers, 'content_manual_color_palette', profilePathValue(answers, 'content_extracted_color_palette', null));
  const palette = normalizedPalette(paletteAnswer);
  const profile = {
    version: 1,
    business: {
      name: profilePathValue(answers, 'business_brand_name'),
      model: profilePathValue(answers, 'business_model')
    },
    industry: profilePathValue(answers, 'business_industry'),
    subcategory: profilePathValue(answers, 'business_product_category'),
    catalog: {
      product_count: profilePathValue(answers, 'product_sku_count'),
      product_types: arrayAnswer(answers, 'product_types'),
      has_variants: profilePathValue(answers, 'product_has_variants'),
      price_positioning: profilePathValue(answers, 'audience_price_positioning')
    },
    audience: {
      primary: profilePathValue(answers, 'audience_customer_type'),
      needs: arrayAnswer(answers, 'audience_needs')
    },
    goals: {
      primary: arrayAnswer(answers, 'goals_primary'),
      secondary: arrayAnswer(answers, 'goals_secondary')
    },
    assets: {
      available: arrayAnswer(answers, 'content_available_assets').filter((asset) => asset !== 'not_available'),
      notes: stringArray(profilePathValue(answers, 'content_asset_notes', null))
    },
    preferences: {
      page_type: profilePathValue(answers, 'design_page_type'),
      design_languages: arrayAnswer(answers, 'design_preferred_style'),
      color_strategies: arrayAnswer(answers, 'design_color_strategy'),
      image_styles: arrayAnswer(answers, 'design_image_style'),
      content_density: profilePathValue(answers, 'design_content_density')
    },
    brand_personality: {
      primary: profilePathValue(answers, 'brand_personality_primary'),
      secondary: arrayAnswer(answers, 'brand_personality_secondary')
    },
    enrichment: {
      version: 1,
      discovery: { business_stage: profilePathValue(answers, 'discovery_business_stage') },
      existing_presence: {
        website: {
          status: profilePathValue(answers, 'discovery_has_existing_website'), url: normalizedUrl(profilePathValue(answers, 'discovery_website_url', null)),
          platform: stringValue(answers, 'discovery_website_platform'), is_live: profilePathValue(answers, 'discovery_website_live'),
          preserve: arrayAnswer(answers, 'discovery_website_preserve'), improve: arrayAnswer(answers, 'discovery_website_improve'), dislikes: stringValue(answers, 'discovery_website_dislikes')
        },
        shopify: {
          status: profilePathValue(answers, 'discovery_has_shopify_store'), url: normalizedUrl(profilePathValue(answers, 'discovery_shopify_store_url', null), { allowDomain: true }),
          is_live: profilePathValue(answers, 'discovery_shopify_store_live'), structure_preference: profilePathValue(answers, 'discovery_shopify_structure'), intent: profilePathValue(answers, 'discovery_shopify_intent')
        }
      },
      desired_outcomes: arrayAnswer(answers, 'discovery_desired_outcomes'),
      creative_direction: {
        creative_freedom: profilePathValue(answers, 'discovery_creative_freedom'), visual_personality: arrayAnswer(answers, 'design_visual_personality'),
        emotional_response: arrayAnswer(answers, 'design_emotional_response'), image_emphasis: profilePathValue(answers, 'design_image_emphasis'),
        motion_preference: profilePathValue(answers, 'design_motion_preference'), tradition_direction: profilePathValue(answers, 'design_tradition_direction')
      },
      brand_assets: { logo_status: profilePathValue(answers, 'content_logo_status'), logo_asset_id: profilePathValue(answers, 'content_logo_asset', null), assets: assetIds.referenced },
      brand_colors: { source: profilePathValue(answers, 'content_color_source'), palette },
      typography: {
        preference: profilePathValue(answers, 'content_typography_preference'), heading_styles: arrayAnswer(answers, 'content_heading_typography'),
        body_styles: arrayAnswer(answers, 'content_body_typography'), font_references: arrayAnswer(answers, 'content_font_references')
      },
      inspiration_references: normalizedReferences(profilePathValue(answers, 'references_inspiration_entries', [])),
      competitor_references: normalizedReferences(profilePathValue(answers, 'references_competitor_entries', [])),
      available_content_assets: { declared: arrayAnswer(answers, 'content_asset_readiness'), asset_ids: assetIds.available },
      asset_readiness: { next_step: profilePathValue(answers, 'content_asset_next_step') },
      traceability: enrichmentTrace(catalog, answers, assetIds, palette)
    }
  };
  const validation = validateMerchantProfile(profile, loadKnowledgeBase(root), root);
  if (!validation.valid) throw new Error(`Generated merchant profile is invalid: ${validation.errors.join(' ')}`);
  const mappings = catalog.questions.filter((question) => question.mapping_destination && Object.prototype.hasOwnProperty.call(answers, question.id)).map((question) => ({
    question_id: question.id,
    destination: question.mapping_destination,
    value: answers[question.id],
    reasoning: `Merchant answer ${question.id} maps directly to ${question.mapping_destination}.`
  }));
  const retainedContextQuestionIds = catalog.questions.filter((question) => question.mapping_destination === null && Object.prototype.hasOwnProperty.call(answers, question.id)).map((question) => question.id);
  return { profile, validation, mappings, retained_context_question_ids: unique(retainedContextQuestionIds), unresolved_question_ids: answerValidation.visible_question_ids.filter((id) => !Object.prototype.hasOwnProperty.call(answers, id)) };
}

module.exports = { buildMerchantProfile };
