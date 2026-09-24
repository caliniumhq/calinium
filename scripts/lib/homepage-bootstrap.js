'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_HOMEPAGE_SECTION_TYPES = Object.freeze([
  'full-screen-hero',
  'featured-collection',
  'image-with-text',
  'rich-text',
  'newsletter'
]);

function readJson(file, errors) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`Could not parse templates/index.json: ${error.message}`);
    return null;
  }
}

function validateHomepageBootstrap({ themeRoot, requiredSectionTypes = DEFAULT_HOMEPAGE_SECTION_TYPES }) {
  const errors = [];
  const indexPath = path.join(themeRoot, 'templates', 'index.json');
  if (!fs.existsSync(indexPath)) {
    return { valid: false, errors: ['templates/index.json is missing.'], section_ids: [], section_types: [] };
  }
  const template = readJson(indexPath, errors);
  if (!template || typeof template !== 'object') return { valid: false, errors, section_ids: [], section_types: [] };
  if (!template.sections || typeof template.sections !== 'object' || Array.isArray(template.sections)) errors.push('templates/index.json must contain a sections object.');
  if (!Array.isArray(template.order)) errors.push('templates/index.json must contain an order array.');
  const order = Array.isArray(template.order) ? template.order : [];
  const sections = template.sections && typeof template.sections === 'object' && !Array.isArray(template.sections) ? template.sections : {};
  if (new Set(order).size !== order.length) errors.push('templates/index.json has duplicate section IDs in order.');
  for (const sectionId of order) {
    const section = sections[sectionId];
    if (!section) { errors.push(`templates/index.json orders missing section ${sectionId}.`); continue; }
    if (!section.type || typeof section.type !== 'string') { errors.push(`Homepage section ${sectionId} has no section type.`); continue; }
    if (section.type === 'main-404' || /(^|-)404($|-)/.test(section.type)) errors.push(`Homepage section ${sectionId} cannot reference a 404 section.`);
    if (!fs.existsSync(path.join(themeRoot, 'sections', `${section.type}.liquid`))) errors.push(`Homepage section ${sectionId} references missing section ${section.type}.`);
  }
  const enabled = order.filter((sectionId) => sections[sectionId] && sections[sectionId].disabled !== true);
  if (enabled.length === 0) errors.push('templates/index.json cannot contain only disabled sections.');
  const types = order.map((sectionId) => sections[sectionId]?.type).filter(Boolean);
  for (const type of requiredSectionTypes) if (!types.includes(type)) errors.push(`Homepage bootstrap is missing ${type}.`);
  return { valid: errors.length === 0, errors, section_ids: order, section_types: types };
}

module.exports = { DEFAULT_HOMEPAGE_SECTION_TYPES, validateHomepageBootstrap };
