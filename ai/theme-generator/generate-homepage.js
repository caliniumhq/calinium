'use strict';

const { generateSectionInstances } = require('./generate-section-instances');

function generateHomepage({ root, draft, approval, mappings, approvedBlockPlan = null, approvedBlockPlanResourceSnapshot = null }) {
  return generateSectionInstances({
    root,
    templatePath: 'theme/templates/index.json',
    sourceTemplatePath: 'templates/index.json',
    pagePlan: draft.homepage_plan,
    approval,
    mappings,
    pageRole: 'homepage',
    approvedBlockPlan,
    approvedBlockPlanResourceSnapshot,
    preserveUnplannedSections: false
  });
}

module.exports = { generateHomepage };
