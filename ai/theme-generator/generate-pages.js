'use strict';

const { generateSectionInstances } = require('./generate-section-instances');

const pageTemplates = {
  product: { output: 'theme/templates/product.json', source: 'templates/product.json' },
  collection: { output: 'theme/templates/collection.json', source: 'templates/collection.json' },
  about: { output: 'theme/templates/page.about.json', source: 'templates/page.json' },
  contact: { output: 'theme/templates/page.contact.json', source: 'templates/page.contact.json' },
  blog: { output: 'theme/templates/blog.json', source: 'templates/blog.json' },
  article: { output: 'theme/templates/article.json', source: 'templates/article.json' }
};

const pageRoles = {
  product: 'product_page', collection: 'collection_page', about: 'standard_page', contact: 'standard_page', blog: 'blog_page', article: 'article_page'
};

function generatePages({ root, draft, approval, mappings, approvedBlockPlan = null, approvedBlockPlanResourceSnapshot = null }) {
  const pages = [];
  const unsupported = [];
  for (const page of draft.other_pages) {
    const target = pageTemplates[page.page_id];
    if (!target) continue;
    if (page.plan_status === 'unsupported') {
      unsupported.push({ page_id: page.page_id, reason: 'The approved mapping layer marks this page plan unsupported; no page structure was invented.', explanation: page.explanation });
      continue;
    }
    if (page.plan_status !== 'valid') throw new Error(`${page.page_id} page plan is not valid for generation.`);
    pages.push({ page_id: page.page_id, target, ...generateSectionInstances({ root, templatePath: target.output, sourceTemplatePath: target.source, pagePlan: page, approval, mappings, pageRole: pageRoles[page.page_id], approvedBlockPlan, approvedBlockPlanResourceSnapshot }) });
  }
  return { pages, unsupported };
}

module.exports = { generatePages, pageTemplates, pageRoles };
