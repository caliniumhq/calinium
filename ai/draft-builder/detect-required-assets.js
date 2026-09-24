'use strict';

const { explanation, unique } = require('./utils');

function flattenPlans(homepagePlan, otherPages) {
  return [homepagePlan, ...otherPages].flatMap((page) => page.sections.map((section) => ({ page_id: page.page_id, section })));
}

function primaryHeroField(section) {
  if (!/(hero|banner)/.test(section.section_id) || section.position !== 1) return null;
  const candidates = section.unresolved_merchant_fields.filter((field) => field.scope === 'section' && ['image', 'desktop_image', 'poster_image', 'video', 'video_url'].includes(field.setting_id));
  return ['desktop_image', 'image', 'poster_image', 'video', 'video_url'].map((id) => candidates.find((field) => field.setting_id === id)).find(Boolean) || null;
}

function assetIdentity(section, field, primary) {
  if (primary) return field.setting_id.includes('video') ? { asset_id: 'hero_video', label: 'Hero video' } : { asset_id: 'hero_image', label: 'Hero image' };
  return { asset_id: field.setting_ref.replace(/\./g, '_'), label: `${section.section_id} ${field.setting_id.replace(/_/g, ' ')}` };
}

function aggregate(records) {
  const values = new Map();
  for (const record of records) {
    const existing = values.get(record.asset_id) || { ...record, sections: [], field_refs: [] };
    existing.sections.push(...record.sections);
    existing.field_refs.push(...record.field_refs);
    existing.present = existing.present && record.present;
    values.set(record.asset_id, existing);
  }
  return [...values.values()].map((item) => ({ ...item, sections: unique(item.sections).sort(), field_refs: unique(item.field_refs).sort() })).sort((left, right) => left.asset_id.localeCompare(right.asset_id));
}

function recordFor({ assetId, label, priority, present, sections, fieldRefs, reasoning }) {
  return {
    asset_id: assetId,
    label,
    priority,
    sections,
    field_refs: fieldRefs,
    present,
    explanation: explanation({
      sourceCatalogs: ['config/theme-section-capabilities.json', 'config/theme-content-classification.json'],
      sourceMapping: 'image_strategy',
      compilerDecision: 'image_strategy',
      confidence: 'medium',
      reasoning,
      fallbackUsed: present ? null : 'leave_merchant_field_unconfigured'
    })
  };
}

function detectRequiredAssets(profile, strategy, homepagePlan, otherPages) {
  const available = new Set(profile.assets.available || []);
  const required = [];
  const recommended = [];
  const plans = flattenPlans(homepagePlan, otherPages);
  const bySection = new Map();
  for (const entry of plans) {
    const values = bySection.get(entry.section.section_id) || [];
    values.push(entry.section);
    bySection.set(entry.section.section_id, values);
  }

  for (const asset of strategy.merchant_assets.required || []) {
    const instances = asset.sections.flatMap((sectionId) => (bySection.get(sectionId) || []).map((section) => section.instance_id));
    required.push(recordFor({
      assetId: asset.asset,
      label: asset.asset.replace(/_/g, ' '),
      priority: 'required',
      present: Boolean(asset.present),
      sections: instances,
      fieldRefs: [],
      reasoning: `The validated strategy marks ${asset.asset.replace(/_/g, ' ')} as required for its selected section plan.`
    }));
  }
  for (const asset of strategy.merchant_assets.recommended || []) {
    const instances = asset.sections.flatMap((sectionId) => (bySection.get(sectionId) || []).map((section) => section.instance_id));
    recommended.push(recordFor({
      assetId: asset.asset,
      label: asset.asset.replace(/_/g, ' '),
      priority: 'recommended',
      present: Boolean(asset.present),
      sections: instances,
      fieldRefs: [],
      reasoning: `The validated strategy recommends ${asset.asset.replace(/_/g, ' ')} for a selected section.`
    }));
  }
  for (const entry of plans) {
    const primary = entry.page_id === 'homepage' ? primaryHeroField(entry.section) : null;
    if (primary) {
      const identity = assetIdentity(entry.section, primary, true);
      required.push(recordFor({
        assetId: identity.asset_id,
        label: identity.label,
        priority: 'required',
        present: available.has(identity.asset_id) || available.has(primary.setting_ref),
        sections: [entry.section.instance_id],
        fieldRefs: [primary.setting_ref],
        reasoning: 'The opening hero’s primary media field is merchant-only and requires a real approved asset for a complete draft.'
      }));
    }
    for (const field of entry.section.unresolved_merchant_fields) {
      if (field.safety_level !== 'merchant_only' || !/(image|video|poster|media)/.test(field.setting_id)) continue;
      if (field === primary) continue;
      const identity = assetIdentity(entry.section, field, false);
      recommended.push(recordFor({
        assetId: identity.asset_id,
        label: identity.label,
        priority: 'recommended',
        present: available.has(identity.asset_id) || available.has(field.setting_ref),
        sections: [entry.section.instance_id],
        fieldRefs: [field.setting_ref],
        reasoning: 'This merchant-only media field can improve the planned section but is not asserted as required by its Shopify schema.'
      }));
    }
  }
  const requiredItems = aggregate(required);
  const recommendedItems = aggregate(recommended).filter((item) => !requiredItems.some((requiredItem) => requiredItem.asset_id === item.asset_id));
  return { required: requiredItems, recommended: recommendedItems, missing: requiredItems.filter((item) => !item.present) };
}

module.exports = { detectRequiredAssets, flattenPlans, primaryHeroField };
