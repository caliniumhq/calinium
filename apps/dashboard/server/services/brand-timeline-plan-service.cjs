'use strict';
const { createEvidencePlanService } = require('./evidence-plan-service.cjs');
module.exports = createEvidencePlanService({
  key: 'brand_timeline', schemaPath: 'schemas/calinium-brand-timeline-candidate.schema.json', runtimeSectionId: 'brand-timeline', sectionRole: 'brand_timeline', blockRole: 'timeline_item', contentType: 'timeline_milestone', itemKey: 'milestones', singular: 'Brand Timeline', plural: 'milestones', minimumItems: 2, maximumItems: 12,
  requiredFields: ['date', 'title'], identityField: 'title', inputFields: new Set(['content_id', 'date', 'title', 'text', 'timeline_icon', 'image_asset_id', 'image_alt_text', 'decorative_media', 'evidence_note']), localizedFields: [{ input: 'date', semantic: 'date', maximum: 80 }, { input: 'title', semantic: 'title', maximum: 240 }, { input: 'text', semantic: 'text', maximum: 1200 }], iconField: 'timeline_icon', allowedIcons: ['none', 'sparkle', 'star', 'calendar', 'arrow-right'], minimumContentMessage: 'Add at least two merchant-confirmed dated milestones before approving Brand Timeline.'
});
