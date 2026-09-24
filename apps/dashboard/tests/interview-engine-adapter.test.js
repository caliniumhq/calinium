import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { InterviewEngineAdapter } = require('../server/interview-engine-adapter.cjs');
const root = path.resolve(process.cwd(), '../..');

function completeAnswers(overrides = {}) {
  return {
    discovery_business_stage: 'established_business', discovery_has_existing_website: 'no_existing_website', discovery_has_shopify_store: false, discovery_desired_outcomes: ['improve_brand_positioning'], discovery_creative_freedom: 'refine_existing_identity',
    business_brand_name: 'Dashboard Test Brand', business_model: 'direct_to_consumer', business_industry: 'luxury_fashion', business_product_category: 'bags', business_stage: 'operating', business_store_status: 'existing_store',
    brand_personality_primary: 'luxury', brand_personality_secondary: ['sophisticated'], audience_customer_type: 'Considered shoppers', audience_needs: ['material detail'], audience_market_model: 'b2c', audience_price_positioning: 'premium',
    product_types: ['bags'], product_sku_count: 16, product_delivery: ['physical'], product_has_variants: true,
    design_preferred_style: ['luxury'], design_content_density: 'low', design_page_type: 'homepage', content_logo_status: 'no_logo', content_color_source: 'let_calinium_suggest', content_typography_preference: 'no_preference', goals_primary: ['luxury'],
    ...overrides
  };
}

describe('InterviewEngineAdapter', () => {
  it('uses the public engine façade for branching, autosave/resume, validation, and merchant-profile completion', () => {
    const adapter = new InterviewEngineAdapter({ root });
    expect(adapter.load().catalog.categories).toHaveLength(10);
    let session = adapter.create({ sessionId: 'merchant-interview-dashboard-adapter', createdAt: '2026-07-21T08:00:00.000Z' }).session;
    const firstSave = adapter.save({ session, answerPatch: { business_industry: 'luxury_fashion', product_delivery: ['physical'], product_shipping_needs: ['insured shipping'] }, savedAt: '2026-07-21T08:01:00.000Z' });
    expect(firstSave.session.visible_question_ids).toContain('product_apparel_categories');
    session = adapter.save({ session: firstSave.session, answerPatch: { product_delivery: ['digital'] }, savedAt: '2026-07-21T08:02:00.000Z' }).session;
    expect(session.answers.product_shipping_needs).toBeUndefined();
    expect(session.visible_question_ids).toContain('product_digital_delivery_model');
    session = adapter.save({ session, answerPatch: completeAnswers(), savedAt: '2026-07-21T08:03:00.000Z' }).session;
    session = adapter.resume({ session, resumedAt: '2026-07-21T08:04:00.000Z' }).session;
    expect(adapter.validate({ answers: session.answers, requireComplete: true }).valid).toBe(true);
    expect(adapter.preview({ session }).profile.business.name).toBe('Dashboard Test Brand');
    const completed = adapter.complete({ session, completedAt: '2026-07-21T08:05:00.000Z' });
    expect(completed.session.status).toBe('completed');
    expect(completed.profile.industry).toBe('luxury_fashion');
  });
});
