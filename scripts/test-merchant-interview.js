#!/usr/bin/env node
'use strict';

const path = require('path');
const { compileStorefrontStrategy, validateProfile } = require('../ai/compiler/compile-strategy');
const { loadMerchantInterview, inspectInterview, buildMerchantProfile, createInterviewSession, saveProgress, resumeInterviewSession, previewInterviewSummary, completeInterviewSession, abandonInterviewSession, validateAnswers } = require('../ai/merchant-interview/merchant-interview-engine');

const root = path.resolve(__dirname, '..');
const errors = [];
function fail(message) { errors.push(message); }
function visibleIds(result) { return new Set(result.visible_questions.map((question) => question.id)); }
function profileAnswers(overrides = {}) {
  return {
    discovery_business_stage: 'established_business', discovery_has_existing_website: 'no_existing_website', discovery_has_shopify_store: false, discovery_desired_outcomes: ['improve_brand_positioning'], discovery_creative_freedom: 'refine_existing_identity',
    business_brand_name: 'Interview Test Brand', business_model: 'direct_to_consumer', business_industry: 'luxury_fashion', business_product_category: 'bags', business_stage: 'operating', business_store_status: 'existing_store',
    brand_personality_primary: 'luxury', brand_personality_secondary: ['sophisticated'], audience_customer_type: 'Considered shoppers', audience_needs: ['material detail'], audience_market_model: 'b2c', audience_price_positioning: 'premium',
    product_types: ['bags'], product_sku_count: 16, product_delivery: ['physical'], product_has_variants: true,
    design_preferred_style: ['luxury'], design_content_density: 'low', design_page_type: 'homepage', content_logo_status: 'no_logo', content_color_source: 'let_calinium_suggest', content_typography_preference: 'no_preference', goals_primary: ['luxury'],
    ...overrides
  };
}

try {
  const { catalog } = loadMerchantInterview({ root });
  const fashion = inspectInterview({ root, answers: profileAnswers() });
  const fashionVisible = visibleIds(fashion);
  if (!fashionVisible.has('product_apparel_categories') || !fashionVisible.has('product_shipping_needs') || fashionVisible.has('product_room_context') || fashionVisible.has('product_digital_delivery_model')) fail('Fashion branch did not show only relevant apparel and physical-product questions.');
  if (!fashionVisible.has('discovery_desired_outcomes') || fashion.catalog.categories[0]?.id !== 'discovery') fail('Discovery questions are not first-class catalog questions.');

  const website = inspectInterview({ root, answers: profileAnswers({ discovery_has_existing_website: 'yes_existing_website', discovery_website_url: 'https://example.com', discovery_website_live: true }) });
  if (!visibleIds(website).has('discovery_website_preserve') || visibleIds(website).has('discovery_shopify_store_url')) fail('Discovery website branching did not expose only relevant follow-up questions.');

  const furniture = inspectInterview({ root, answers: profileAnswers({ business_industry: 'furniture', brand_personality_primary: 'modern', brand_personality_secondary: [], design_preferred_style: ['editorial'] }) });
  const furnitureVisible = visibleIds(furniture);
  if (!furnitureVisible.has('product_room_context') || furnitureVisible.has('product_apparel_categories')) fail('Furniture branch did not show room context and hide apparel context.');

  const digital = inspectInterview({ root, answers: profileAnswers({ business_industry: 'digital_products', business_model: 'software_subscription', business_product_category: 'software', brand_personality_primary: 'technical', brand_personality_secondary: ['modern'], product_types: ['software_plans'], product_delivery: ['digital'], design_preferred_style: ['technical'], design_content_density: 'medium', audience_price_positioning: 'mid_market' }) });
  const digitalVisible = visibleIds(digital);
  if (!digitalVisible.has('product_digital_delivery_model') || digitalVisible.has('product_shipping_needs')) fail('Digital-product branch did not hide shipping and show digital delivery context.');

  const invalid = validateAnswers({ catalog, answers: { business_website: 'not-a-url' }, requireComplete: false });
  if (invalid.valid || !invalid.errors.some((error) => error.includes('business_website'))) fail('Invalid URL answer was not rejected.');

  const input = profileAnswers({ content_available_assets: ['logo', 'product_media'], content_asset_notes: 'Approved studio photography is available.' });
  const inputSnapshot = JSON.stringify(input);
  const first = buildMerchantProfile({ root, catalog, answers: input });
  const second = buildMerchantProfile({ root, catalog, answers: input });
  if (JSON.stringify(first.profile) !== JSON.stringify(second.profile)) fail('Merchant Profile builder is not deterministic.');
  if (JSON.stringify(input) !== inputSnapshot) fail('Merchant Profile builder mutated interview answers.');
  const profileValidation = validateProfile(first.profile, { root });
  if (!profileValidation.valid) fail(`Generated Merchant Profile does not integrate with existing Strategy Compiler validation: ${profileValidation.errors.join('; ')}`);
  const strategy = compileStorefrontStrategy(first.profile, { root });
  if (!strategy.validation_report.valid) fail(`Strategy Compiler rejected the interview-generated profile: ${strategy.validation_report.errors.join('; ')}`);
  const unavailableAssets = buildMerchantProfile({ root, catalog, answers: profileAnswers({ content_available_assets: ['not_available'] }) });
  if (unavailableAssets.profile.assets.available.length !== 0) fail('Not available asset sentinel leaked into the canonical Merchant Profile.');
  if (first.profile.enrichment.discovery.business_stage !== 'established_business' || first.profile.enrichment.creative_direction.creative_freedom !== 'refine_existing_identity') fail('Discovery answers did not map to the enriched Merchant Profile.');
  const enriched = buildMerchantProfile({ root, catalog, answers: profileAnswers({ content_logo_status: 'upload_logo', content_logo_asset: 'ast_logo-test', content_color_source: 'choose_manually', content_manual_color_palette: { source: 'manual', approved: true, source_asset_id: null, colors: { primary: '#112233', secondary: '#445566', accent: null, background: '#FFFFFF', text: '#112233', additional: [] } }, references_inspiration_entries: [{ name: 'Reference', url: 'https://example.com', reason: 'Typography', traits: ['editorial'], specific_focus: '', screenshot_asset_id: null, market_relationship: '' }] }), enrichmentContext: { assets: [{ id: 'ast_logo-test', asset_type: 'logo', checksum_sha256: 'a'.repeat(64), upload_status: 'ready' }] } });
  if (enriched.profile.enrichment.brand_assets.logo_asset_id !== 'ast_logo-test' || enriched.profile.enrichment.brand_colors.palette?.colors.primary !== '#112233' || !enriched.profile.enrichment.traceability.length) fail('Asset, palette, or traceability enrichment was not mapped deterministically.');

  let session = createInterviewSession({ root, catalog, sessionId: 'merchant-interview-test-luxury', createdAt: '2026-07-20T11:00:00.000Z' });
  session = saveProgress({ root, catalog, session, answerPatch: { business_industry: 'luxury_fashion', product_delivery: ['physical'], product_shipping_needs: ['insured shipping'] }, savedAt: '2026-07-20T11:01:00.000Z' }).session;
  const switched = saveProgress({ root, catalog, session, answerPatch: { product_delivery: ['digital'] }, savedAt: '2026-07-20T11:02:00.000Z' });
  if (!switched.inactive_answers_removed.includes('product_shipping_needs') || Object.prototype.hasOwnProperty.call(switched.session.answers, 'product_shipping_needs')) fail('Branch change did not remove an irrelevant shipping answer.');
  session = saveProgress({ root, catalog, session: switched.session, answerPatch: input, savedAt: '2026-07-20T11:03:00.000Z' }).session;
  session = resumeInterviewSession({ root, catalog, session, resumedAt: '2026-07-20T11:04:00.000Z' });
  const preview = previewInterviewSummary({ root, catalog, session });
  if (!preview.summary.confirmation_required || preview.profile.business.name !== input.business_brand_name || session.confirmed_summary) fail('Summary preview did not remain separate from merchant confirmation.');
  try { completeInterviewSession({ root, catalog, session, confirmedSummary: false, completedAt: '2026-07-20T11:05:00.000Z' }); fail('Session completed without merchant summary confirmation.'); } catch (error) { if (!/confirmation/.test(error.message)) fail(`Unexpected completion gate error: ${error.message}`); }
  const completed = completeInterviewSession({ root, catalog, session, confirmedSummary: true, completedAt: '2026-07-20T11:06:00.000Z' });
  if (completed.session.status !== 'completed' || !completed.session.confirmed_summary || !completed.session.summary || !completed.session.merchant_profile) fail('Completed session did not retain the confirmed summary and merchant profile.');
  const abandoned = abandonInterviewSession({ root, catalog, session: createInterviewSession({ root, catalog, sessionId: 'merchant-interview-test-abandoned', createdAt: '2026-07-20T11:07:00.000Z' }), abandonedAt: '2026-07-20T11:08:00.000Z' });
  if (abandoned.status !== 'abandoned') fail('Abandoned session did not transition to abandoned state.');
  const legacy = { ...createInterviewSession({ root, catalog, sessionId: 'merchant-interview-test-legacy', createdAt: '2026-07-20T11:09:00.000Z' }), engine_version: '1.0.0', catalog_version: '1.0.0' };
  const migrated = resumeInterviewSession({ root, catalog, session: legacy, resumedAt: '2026-07-20T11:10:00.000Z' });
  if (migrated.catalog_version !== '1.1.0' || !migrated.events.some((event) => event.type === 'catalog_migrated')) fail('Legacy interview sessions are not migrated safely on resume.');
} catch (error) { fail(`Merchant Interview test failed: ${error.message}`); }

if (errors.length) { console.error(`Merchant Interview tests failed:\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log('Merchant Interview tests passed: Discovery and catalog branching, deterministic enriched profile building, Strategy Compiler compatibility, legacy-session migration, session lifecycle, and inactive-answer removal.');
