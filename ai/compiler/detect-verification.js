'use strict';

function detectVerification(orderedSections, knowledgeBase) {
  const required = [];
  const seen = new Set();
  for (const section of orderedSections) {
    const manifest = knowledgeBase.index.sectionManifest.get(section.id);
    if (!manifest) continue;
    for (const requirement of manifest.merchant_verification_required || []) {
      const key = `${section.id}:${requirement}`;
      if (!seen.has(key)) {
        required.push({ section_id: section.id, requirement, safety_level: manifest.content_safety_level });
        seen.add(key);
      }
    }
    const metadata = knowledgeBase.index.settingMetadata.get(section.id);
    for (const setting of Object.values(metadata?.settings || {})) {
      if (!setting.merchant_confirmation) continue;
      const key = `${section.id}:${setting.semantic_role}`;
      if (!seen.has(key)) {
        required.push({ section_id: section.id, requirement: setting.semantic_role, safety_level: setting.content_safety_level });
        seen.add(key);
      }
    }
  }
  return {
    required,
    publication_checklist: required.map((item) => `Confirm ${item.requirement.replace(/_/g, ' ')} for ${item.section_id} before publication.`)
  };
}

module.exports = { detectVerification };
