import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { scopeDraftToApprovedResourcePlan } = require('../../../pipeline/resolve-approved-draft');

function explanation() {
  return {
    source_catalogs: ['test'], source_mapping: 'test', compiler_decision: 'test', confidence: 'high', reasoning: 'test', fallback_used: null
  };
}

function field(settingRef) {
  return {
    setting_ref: settingRef,
    setting_id: settingRef.split('.').at(-1),
    scope: 'section', block_type: null, value: null, status: 'review_required', safety_level: 'merchant_confirmation_required', explanation: explanation()
  };
}

function section(instanceId, sectionId, fields) {
  return {
    instance_id: instanceId,
    section_id: sectionId,
    position: 1,
    source_mapping: 'test',
    mapped_settings: [],
    unresolved_merchant_fields: fields.map(field),
    required_assets: [],
    merchant_confirmations: [],
    fallback_layout: { selected: 'omit_optional_content', reasoning: 'test' },
    validation_status: 'review_required',
    explanation: explanation()
  };
}

function page(pageId, sections) {
  return { page_id: pageId, plan_status: 'review_required', source_mapping: 'test', sections, explanation: explanation() };
}

const historicalFailureRefs = [
  'global.color_schemes', 'global.favicon', 'global.logo',
  'main-product.show_sku', 'main-product.show_inventory', 'main-product.low_inventory_threshold', 'main-product.low_inventory_message', 'main-product.information_row.content',
  'product-highlights.product', 'product-comparison.product.product', 'product-comparison.feature.value_1', 'product-comparison.feature.value_2', 'product-comparison.feature.value_3', 'product-comparison.feature.value_4', 'complementary-products.fallback_product.product',
  'main-collection-product-grid.show_inventory', 'collection-tabs.collection.collection', 'collection-carousel.collection.collection', 'collection-carousel.collection.image', 'collection-carousel.collection.link_label',
  'featured-categories.category.collection', 'featured-categories.category.page', 'featured-categories.category.link', 'featured-categories.category.image',
  'brand-timeline.timeline_item.date', 'brand-timeline.timeline_item.image', 'craftsmanship.image', 'craftsmanship.mobile_image', 'craftsmanship.video', 'craftsmanship.text', 'craftsmanship.quote', 'craftsmanship.button_link', 'craftsmanship.craft_step.image', 'craftsmanship.craft_step.text',
  'behind-the-scenes.quote', 'behind-the-scenes.gallery_item.image', 'behind-the-scenes.gallery_item.mobile_image', 'behind-the-scenes.gallery_item.video', 'behind-the-scenes.gallery_item.location', 'behind-the-scenes.gallery_item.date',
  'icon-row.item.image', 'icon-row.item.image_alt', 'icon-row.item.link', 'main-article.show_author', 'main-article.show_date', 'featured-blog.blog', 'featured-blog.show_date', 'featured-blog.show_author', 'featured-collection.collection', 'featured-collection.show_inventory', 'featured-collection.show_collection_link', 'featured-collection.collection_link_label'
];

function representativeDraft() {
  const home = [
    section('homepage-01-split-hero', 'split-hero', ['split-hero.image', 'split-hero.mobile_image', 'split-hero.video', 'split-hero.button_link']),
    section('homepage-02-brand-values', 'brand-values', ['brand-values.value.image']),
    section('homepage-03-team', 'team', ['team.team_member.image']),
    section('homepage-04-testimonials', 'testimonials', []),
    section('homepage-05-faq', 'faq', []),
    section('homepage-06-newsletter', 'newsletter', [])
  ];
  const legacy = historicalFailureRefs.filter((ref) => !ref.startsWith('global.'));
  const grouped = new Map();
  for (const ref of legacy) {
    const sectionId = ref.split('.').slice(0, -1).join('-') || 'legacy';
    const existing = grouped.get(sectionId) || [];
    existing.push(ref);
    grouped.set(sectionId, existing);
  }
  const productSections = [...grouped.entries()].map(([sectionId, refs], index) => section(`product-${index + 1}-${sectionId}`, sectionId, refs));
  const otherPages = ['product', 'collection', 'about', 'contact', 'blog', 'article'].map((pageId) => page(pageId, pageId === 'product' ? productSections : []));
  return {
    homepage_plan: page('homepage', home),
    other_pages: otherPages,
    global_theme_configuration: {
      typography: [field('global.type_heading_font')],
      spacing: [],
      colors: [field('global.color_schemes'), field('global.default_color_scheme')],
      motion: [],
      layout: [field('global.favicon'), field('global.logo')],
      commerce_behavior: [],
      accessibility_preferences: []
    },
    required_assets: { required: [{ asset_id: 'hero_image', field_refs: ['split-hero.image'] }, { asset_id: 'team_portraits', field_refs: ['team.team_member.image'] }], recommended: [], missing: [] },
    merchant_input_requirements: { required: [], high: [], medium: [], low: [] },
    merchant_review_queue: [],
    blocked_fields: [],
    summary: { section_count: 0, unresolved_input_count: 0, missing_asset_count: 0, review_item_count: 0, blocked_field_count: 0, reasoning: 'test' }
  };
}

describe('paid order Resource Plan draft scope', () => {
  it('does not turn the prior paid-order validation failure into unrelated merchant requirements', () => {
    const resourcePlan = {
      fields: [
        { setting_ref: 'split-hero.image', section_id: 'split-hero', instance_id: 'homepage-01-split-hero' },
        { setting_ref: 'split-hero.mobile_image', section_id: 'split-hero', instance_id: 'homepage-01-split-hero' },
        { setting_ref: 'split-hero.video', section_id: 'split-hero', instance_id: 'homepage-01-split-hero' },
        { setting_ref: 'split-hero.button_link', section_id: 'split-hero', instance_id: 'homepage-01-split-hero' },
        { setting_ref: 'brand-values.value.image', section_id: 'brand-values', instance_id: 'homepage-02-brand-values' },
        { setting_ref: 'team.team_member.image', section_id: 'team', instance_id: 'homepage-03-team' }
      ],
      required_assets: [{ asset_id: 'hero_image', field_refs: ['split-hero.image'] }, { asset_id: 'team_portraits', field_refs: ['team.team_member.image'] }],
      required_confirmations: []
    };
    const storeStrategy = { homepage: { sections: ['split-hero', 'brand-values', 'team', 'testimonials', 'faq', 'newsletter'].map((sectionId) => ({ sectionId })) } };
    const scoped = scopeDraftToApprovedResourcePlan({ draft: representativeDraft(), resourcePlan, storeStrategy, review: { decisions: [] } });

    expect(scoped.errors).toEqual([]);
    expect(scoped.draft.homepage_plan.sections.map((item) => item.section_id)).toEqual(['split-hero', 'brand-values', 'team', 'testimonials', 'faq', 'newsletter']);
    expect(scoped.draft.other_pages.every((item) => item.plan_status === 'unsupported' && item.sections.length === 0)).toBe(true);
    const retainedRefs = scoped.draft.homepage_plan.sections.flatMap((item) => item.unresolved_merchant_fields.map((entry) => entry.setting_ref));
    expect(retainedRefs).toEqual(resourcePlan.fields.map((item) => item.setting_ref));
    expect(historicalFailureRefs.every((ref) => !retainedRefs.includes(ref))).toBe(true);
    expect(scoped.draft.global_theme_configuration.colors.map((item) => item.setting_ref)).toEqual([]);
    expect(scoped.draft.global_theme_configuration.typography.map((item) => item.setting_ref)).toEqual([]);
    expect(scoped.draft.required_assets.required.map((item) => item.asset_id)).toEqual(['hero_image', 'team_portraits']);
  });

  it('does not reuse a similarly named field from an unapproved page instance', () => {
    const draft = representativeDraft();
    draft.other_pages[0].sections.push(section('product-team', 'team', ['team.team_member.image']));
    const scoped = scopeDraftToApprovedResourcePlan({
      draft,
      resourcePlan: {
        fields: [{ setting_ref: 'team.team_member.image', section_id: 'team', instance_id: 'homepage-03-team' }],
        required_assets: [], required_confirmations: []
      },
      storeStrategy: { homepage: { sections: [{ sectionId: 'team' }] } },
      review: { decisions: [] }
    });

    expect(scoped.errors).toEqual([]);
    expect(scoped.draft.other_pages[0]).toMatchObject({ page_id: 'product', plan_status: 'unsupported', sections: [] });
    expect(scoped.draft.homepage_plan.sections).toHaveLength(1);
  });
});
