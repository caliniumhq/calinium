import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { reconcileResourcePlan } = require('../../../pipeline/strategy-section-policy');
const { evaluateGenerationEligibility } = require('../server/custom-themes/eligibility-evaluator.cjs');
const { normalizeGenerationContextForResourcePlan, resourcePlanSelectionBlockers } = require('../server/services/creative-director-service.cjs');
const root = path.resolve(process.cwd(), '../..');

function currentStrategy(sectionIds = ['editorial-hero', 'craftsmanship', 'featured-collection']) {
  return { homepage: { sections: sectionIds.map((sectionId) => ({ sectionId, source: 'existing_strategy_compiler' })) } };
}

function legacyPlan() {
  return {
    status: 'ready',
    fields: [
      { setting_ref: 'editorial-hero.image', setting_id: 'image', section_id: 'editorial-hero', instance_id: 'homepage-01-editorial-hero', kind: 'image', required: true },
      { setting_ref: 'behind-the-scenes.gallery_item.image', setting_id: 'image', section_id: 'behind-the-scenes', instance_id: 'about-06-behind-the-scenes', kind: 'image', required: true },
      { setting_ref: 'behind-the-scenes.gallery_item.video', setting_id: 'video', section_id: 'behind-the-scenes', instance_id: 'about-06-behind-the-scenes', kind: 'video', required: true },
      { setting_ref: 'craftsmanship.image', setting_id: 'image', section_id: 'craftsmanship', instance_id: 'homepage-03-craftsmanship', kind: 'image', required: true },
      { setting_ref: 'craftsmanship.video', setting_id: 'video', section_id: 'craftsmanship', instance_id: 'homepage-03-craftsmanship', kind: 'video', required: true },
      { setting_ref: 'craftsmanship.video', setting_id: 'video', section_id: 'craftsmanship', instance_id: 'about-05-craftsmanship', kind: 'video', required: true },
      { setting_ref: 'featured-blog.blog', setting_id: 'blog', section_id: 'featured-blog', instance_id: 'article-02-featured-blog', kind: 'content', required: true },
      { setting_ref: 'featured-categories.category.collection', setting_id: 'collection', section_id: 'featured-categories', instance_id: 'homepage-05-featured-categories', kind: 'collection', required: true },
      { setting_ref: 'featured-categories.category.page', setting_id: 'page', section_id: 'featured-categories', instance_id: 'homepage-05-featured-categories', kind: 'content', required: true }
    ],
    required_assets: [{ asset_id: 'hero_image', field_refs: ['editorial-hero.image'] }],
    required_confirmations: [
      'review:verification:craftsmanship:craft_video',
      'review:verification:craftsmanship:craft_media',
      'review:review:featured-blog.show_author',
      'review:review:behind-the-scenes.gallery_item.date'
    ]
  };
}

describe('Resource Plan strategy reconciliation', () => {
  it('removes legacy sections and preserves only the selected homepage instances', () => {
    const result = reconcileResourcePlan({
      resourcePlan: legacyPlan(),
      storeStrategy: currentStrategy(),
      review: { decisions: [] }
    });

    expect(result.resourcePlan.fields.map((field) => field.setting_ref)).toEqual([
      'editorial-hero.image',
      'craftsmanship.image'
    ]);
    expect(result.resourcePlan.required_assets.map((asset) => asset.asset_id)).toEqual(['hero_image']);
    expect(result.changes.some((change) => change.setting_ref === 'behind-the-scenes.gallery_item.video' && change.fallback === 'approved_still_imagery_or_omit_gallery_item')).toBe(true);
    expect(result.changes.filter((change) => change.setting_ref === 'craftsmanship.video')).toHaveLength(2);
    expect(result.changes.some((change) => change.setting_ref === 'featured-blog.blog' && change.fallback === 'omit_featured_blog_section')).toBe(true);
    expect(result.changes.some((change) => change.setting_ref === 'featured-categories.category.page' && change.fallback === 'approved_collection_or_omit_category_block')).toBe(true);
    expect(result.resourcePlan.required_confirmations).toEqual(['review:verification:craftsmanship:craft_media']);
  });

  it('uses an approved collection path before asking for a Featured Categories editorial page', () => {
    const result = reconcileResourcePlan({
      resourcePlan: legacyPlan(),
      storeStrategy: currentStrategy(['editorial-hero', 'featured-categories']),
      review: { decisions: [] }
    });

    expect(result.resourcePlan.fields.map((field) => field.setting_ref)).toContain('featured-categories.category.collection');
    expect(result.resourcePlan.fields.map((field) => field.setting_ref)).not.toContain('featured-categories.category.page');
  });

  it('keeps a Featured Blog only after an explicit merchant approval', () => {
    const plan = legacyPlan();
    plan.fields.find((field) => field.setting_ref === 'featured-blog.blog').instance_id = 'homepage-04-featured-blog';
    const result = reconcileResourcePlan({
      resourcePlan: plan,
      storeStrategy: currentStrategy(['editorial-hero', 'featured-blog']),
      review: { decisions: [{ path: 'featured-blog', status: 'approved' }] }
    });

    expect(result.resourcePlan.fields.map((field) => field.setting_ref)).toContain('featured-blog.blog');
  });

  it('records one review requirement for a persisted plan and remains idempotent on reload', () => {
    const first = reconcileResourcePlan({
      resourcePlan: legacyPlan(),
      storeStrategy: currentStrategy(),
      review: { decisions: [] },
      recordHistory: true,
      at: '2026-07-24T20:00:00.000Z'
    });
    const second = reconcileResourcePlan({
      resourcePlan: first.resourcePlan,
      storeStrategy: currentStrategy(),
      review: { decisions: [] },
      recordHistory: true,
      at: '2026-07-24T20:01:00.000Z'
    });

    expect(first.requiresMerchantReview).toBe(true);
    expect(first.resourcePlan.reconciliation.requires_merchant_review).toBe(true);
    expect(first.resourcePlan.reconciliation_history).toHaveLength(1);
    expect(second.changed).toBe(false);
    expect(second.resourcePlan.reconciliation_history).toHaveLength(1);
  });

  it('validates only resources still required by the reconciled plan, while preserving legacy selections for audit history', async () => {
    const calls = [];
    const result = await evaluateGenerationEligibility({
      root,
      store: { findAssetForProject: async () => null },
      project: { id: 'prj_active', organization_id: 'org_active' },
      price: { product_code: 'custom-theme', price_version: 'v1', amount_cents: 1000, currency: 'USD' },
      shopifyService: {
        resolveApprovedResource: async ({ resourceId }) => {
          calls.push(resourceId);
          if (resourceId !== 'active-image') throw new Error('legacy resource must not be checked');
          return { resource: { id: resourceId, resource_type: 'file', source_revision: 'revision-1', preview_url: 'https://cdn.shopify.com/s/files/1/files/active-image.jpg' } };
        }
      },
      session: {
        creative_brief: { version: '1.0' },
        store_strategy: currentStrategy(['editorial-hero']),
        review: { creativeBriefStatus: 'approved', storeStrategyStatus: 'approved', decisions: [] },
        resource_plan: {
          status: 'ready',
          fields: [{ setting_ref: 'editorial-hero.image', setting_id: 'image', section_id: 'editorial-hero', instance_id: 'homepage-01-editorial-hero', kind: 'image', required: true }],
          required_assets: [{ asset_id: 'hero_image', field_refs: ['editorial-hero.image'] }],
          required_confirmations: []
        },
        generation_context: {
          status: 'ready_for_generation', approval_reference: 'merchant-resource-approval', approved_at: '2026-07-24T20:00:00.000Z',
          merchant_references: {
            'editorial-hero.image': 'dashboard://projects/prj_active/shopify-resources/active-image',
            'legacy.section.image': 'dashboard://projects/prj_active/shopify-resources/stale-image'
          },
          shopify_resource_references: {
            'editorial-hero.image': 'active-image',
            'legacy.section.image': 'stale-image'
          },
          asset_references: { hero_image: 'dashboard://projects/prj_active/shopify-resources/active-image' }
        },
        generation_state: { error: null }
      }
    });

    expect(result.eligible).toBe(true);
    expect(calls).toEqual(['active-image', 'active-image']);
  });

  it('drops stale browser empty decisions while preserving current approved selections and exposes exact missing fields', () => {
    const plan = {
      status: 'ready',
      fields: [
        { setting_ref: 'editorial-hero.image', setting_id: 'image', section_id: 'editorial-hero', kind: 'image', required: true },
        { setting_ref: 'editorial-hero.button_link', setting_id: 'button_link', section_id: 'editorial-hero', kind: 'confirmation', required: false }
      ],
      required_assets: [{ asset_id: 'hero_image', label: 'Hero image', field_refs: ['editorial-hero.image'] }]
    };
    const current = {
      status: 'awaiting_configuration',
      merchant_references: {
        'editorial-hero.image': 'dashboard://projects/project-1/shopify-resources/file-current',
        'behind-the-scenes.gallery_item.image': 'dashboard://projects/project-1/shopify-resources/file-legacy'
      },
      shopify_resource_references: {
        'editorial-hero.image': 'file-current',
        'behind-the-scenes.gallery_item.image': 'file-legacy'
      },
      asset_references: { hero_image: 'dashboard://projects/project-1/shopify-resources/file-current', founder_portrait: 'dashboard://projects/project-1/assets/founder' },
      completed_confirmations: ['field:editorial-hero.image', 'field:behind-the-scenes.gallery_item.image'],
      resolved_empty_fields: ['editorial-hero.button_link', 'behind-the-scenes.quote']
    };

    const normalized = normalizeGenerationContextForResourcePlan(current, plan);
    expect(normalized.changed).toBe(true);
    expect(normalized.generationContext.merchant_references).toEqual({ 'editorial-hero.image': 'dashboard://projects/project-1/shopify-resources/file-current' });
    expect(normalized.generationContext.shopify_resource_references).toEqual({ 'editorial-hero.image': 'file-current' });
    expect(normalized.generationContext.asset_references).toEqual({ hero_image: 'dashboard://projects/project-1/shopify-resources/file-current' });
    expect(normalized.generationContext.resolved_empty_fields).toEqual(['editorial-hero.button_link']);
    expect(resourcePlanSelectionBlockers(plan, normalized.generationContext)).toEqual([]);

    const missing = resourcePlanSelectionBlockers(plan, { merchant_references: {}, asset_references: {} });
    expect(missing).toMatchObject([
      { requirementId: 'editorial-hero.image', sectionId: 'editorial-hero', expectedResourceKind: 'image', currentStatus: 'not_selected' },
      { requirementId: 'hero_image', expectedResourceKind: 'asset', displayLabel: 'Hero image', currentStatus: 'not_selected' }
    ]);
  });
});
