'use strict';

const { validateSchema } = require('../shared/schema');

function validateCreativeBrief(creativeBrief, options = {}) {
  const errors = validateSchema(creativeBrief, 'schemas/creative-brief.schema.json', { ...options, location: 'creative brief' });
  const bounded = [
    ['confidence', creativeBrief?.confidence],
    ...((creativeBrief?.facts || []).map((fact, index) => [`facts[${index}].confidence`, fact.confidence])),
    ...((creativeBrief?.assumptions || []).map((assumption, index) => [`assumptions[${index}].confidence`, assumption.confidence]))
  ];
  bounded.forEach(([field, value]) => {
    if (typeof value !== 'number' || value < 0 || value > 1) errors.push(`creative brief.${field} must be between 0 and 1`);
  });
  (creativeBrief?.assumptions || []).forEach((assumption, index) => {
    if (assumption.confidence >= 0.9) errors.push(`creative brief.assumptions[${index}] must remain below confirmed confidence`);
  });
  return { valid: errors.length === 0, errors };
}

module.exports = { validateCreativeBrief };
