'use strict';

const fs = require('fs');
const path = require('path');
const { result } = require('./utils');

function templateShape(template) {
  if (!template || typeof template !== 'object') return { valid: false, reason: 'not a JSON object' };
  if (!template.sections || typeof template.sections !== 'object' || Array.isArray(template.sections)) return { valid: false, reason: 'missing sections object' };
  if (!Array.isArray(template.order)) return { valid: false, reason: 'missing order array' };
  const duplicates = template.order.filter((id, index) => template.order.indexOf(id) !== index);
  const missing = template.order.filter((id) => !Object.hasOwn(template.sections, id));
  return { valid: duplicates.length === 0 && missing.length === 0, section_count: Object.keys(template.sections).length, order: template.order, duplicate_order_ids: duplicates, missing_order_sections: missing };
}

function parseTemplate(file) {
  try { return { value: JSON.parse(fs.readFileSync(file, 'utf8')), error: null }; } catch (error) { return { value: null, error: error.message }; }
}

function verifyTemplates({ packageData, generated, snapshotDirectory, origin }) {
  const results = [];
  const templates = {};
  const templateFiles = packageData.files.filter((file) => file.path.startsWith('templates/'));
  for (const file of templateFiles) {
    const generatedFile = path.join(generated.workspace, 'theme', file.path);
    const snapshotFile = path.join(snapshotDirectory, file.path);
    const expected = parseTemplate(generatedFile);
    const actual = parseTemplate(snapshotFile);
    const expectedShape = expected.error ? expected.error : templateShape(expected.value);
    const actualShape = actual.error ? actual.error : templateShape(actual.value);
    templates[file.path] = actual.value;
    results.push(result({
      id: `template:${file.path.replace(/[/.]/g, ':')}:json`, category: 'template', method: 'json_parse_and_template_shape_validation', expected: expectedShape, actual: actualShape,
      passed: !expected.error && !actual.error && expectedShape.valid === true && actualShape.valid === true,
      remediation: `Restore valid Shopify JSON template structure in ${file.path} from the approved package.`, origin: { ...origin, generated_file: `theme/${file.path}` }
    }));
    results.push(result({
      id: `template:${file.path.replace(/[/.]/g, ':')}:order`, category: 'template', method: 'section_order_comparison', expected: expectedShape.order || null, actual: actualShape.order || null,
      passed: !expected.error && !actual.error && JSON.stringify(expectedShape.order) === JSON.stringify(actualShape.order),
      remediation: `Restore the approved section order in ${file.path}; do not reorder a verified deployment manually.`, origin: { ...origin, generated_file: `theme/${file.path}` }
    }));
  }
  return { results, templates, valid: results.every((item) => item.result === 'passed') };
}

module.exports = { templateShape, parseTemplate, verifyTemplates };
