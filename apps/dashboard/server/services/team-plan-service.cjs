'use strict';
const { createEvidencePlanService } = require('./evidence-plan-service.cjs');
module.exports = createEvidencePlanService({
  key: 'team', schemaPath: 'schemas/calinium-team-candidate.schema.json', runtimeSectionId: 'team', sectionRole: 'team_directory', blockRole: 'team_member', contentType: 'team_member', itemKey: 'members', singular: 'Team', plural: 'members', minimumItems: 1, maximumItems: 12,
  requiredFields: ['name', 'role'], identityField: 'name', inputFields: new Set(['content_id', 'name', 'role', 'bio', 'image_asset_id', 'image_alt_text', 'decorative_media', 'evidence_note']), localizedFields: [{ input: 'name', semantic: 'name', maximum: 240 }, { input: 'role', semantic: 'role', maximum: 240 }, { input: 'bio', semantic: 'bio', maximum: 1200 }], minimumContentMessage: 'Add at least one approved team member before approving Team.'
});
