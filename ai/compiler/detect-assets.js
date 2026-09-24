'use strict';

function fallbackFor(asset, sectionId) {
  if (asset === 'founder_portrait') return 'Use Founder Story in a text-first variation or omit it; never invent a founder portrait.';
  if (asset === 'team_portraits') return 'Use a people-free trust or values section until real portraits and consent are supplied.';
  if (asset === 'authentic_gallery_media') return 'Replace the gallery with a non-media supporting section or leave it unconfigured; never create purported behind-the-scenes media.';
  if (asset.includes('media') || asset.includes('video')) return 'Use the section’s safe empty state or a merchant-supplied non-video variation.';
  return `Keep ${sectionId} structurally planned but leave the unprovided asset blank until the merchant supplies it.`;
}

function aggregate(records) {
  const values = new Map();
  for (const record of records) {
    const existing = values.get(record.asset) || { asset: record.asset, sections: [], present: record.present };
    existing.sections.push(record.section_id);
    existing.present = existing.present && record.present;
    values.set(record.asset, existing);
  }
  return [...values.values()].map((record) => ({ ...record, sections: [...new Set(record.sections)] }));
}

function detectAssets(profile, orderedSections, knowledgeBase) {
  const available = new Set(profile.assets.available);
  const requiredRecords = [];
  const recommendedRecords = [];
  for (const section of orderedSections) {
    const manifest = knowledgeBase.index.sectionManifest.get(section.id);
    for (const asset of manifest?.merchant_assets_required || []) requiredRecords.push({ asset, section_id: section.id, present: available.has(asset) });
    for (const item of manifest?.content_requirements?.recommended || []) {
      if (/(image|media|portrait|logo|video)/.test(item)) recommendedRecords.push({ asset: item, section_id: section.id, present: available.has(item) });
    }
  }
  const required = aggregate(requiredRecords);
  const recommended = aggregate(recommendedRecords).filter((item) => !required.some((requiredItem) => requiredItem.asset === item.asset));
  const missing = required.filter((item) => !item.present);
  const fallbacks = missing.flatMap((item) => item.sections.map((sectionId) => ({ asset: item.asset, section_id: sectionId, strategy: fallbackFor(item.asset, sectionId) })));
  return { required, recommended, missing, fallbacks };
}

module.exports = { detectAssets };
