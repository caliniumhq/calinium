'use strict';

const { validateSchema } = require('../shared/schema');

function validateStoreStrategy(storeStrategy, options = {}) {
  const errors = validateSchema(storeStrategy, 'schemas/store-strategy.schema.json', { ...options, location: 'store strategy' });
  const bounded = [
    ['designDirection.confidence', storeStrategy?.designDirection?.confidence],
    ...((storeStrategy?.recommendations || []).map((recommendation, index) => [`recommendations[${index}].confidence`, recommendation.confidence]))
  ];
  bounded.forEach(([field, value]) => {
    if (typeof value !== 'number' || value < 0 || value > 1) errors.push(`store strategy.${field} must be between 0 and 1`);
  });
  return { valid: errors.length === 0, errors };
}

module.exports = { validateStoreStrategy };
