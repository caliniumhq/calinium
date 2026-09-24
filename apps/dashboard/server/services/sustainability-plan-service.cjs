'use strict';
const { createEvidencePlanService } = require('./evidence-plan-service.cjs');
module.exports = createEvidencePlanService({
  key: 'sustainability', schemaPath: 'schemas/calinium-sustainability-candidate.schema.json', runtimeSectionId: 'sustainability', sectionRole: 'sustainability_evidence', blockRole: 'sustainability_initiative', contentType: 'sustainability_initiative', itemKey: 'initiatives', singular: 'Sustainability', plural: 'initiatives', minimumItems: 1, maximumItems: 8,
  requiredFields: ['title', 'text'], identityField: 'title', inputFields: new Set(['content_id', 'title', 'text', 'initiative_icon', 'image_asset_id', 'image_alt_text', 'decorative_media', 'evidence_note']), localizedFields: [{ input: 'title', semantic: 'title', maximum: 240 }, { input: 'text', semantic: 'text', maximum: 1200 }], iconField: 'initiative_icon', allowedIcons: ['leaf', 'recycle', 'globe', 'heart'], evidenceType: 'sustainability_proof', minimumContentMessage: 'Add at least one merchant-verified sustainability initiative before approving Sustainability.'
});
