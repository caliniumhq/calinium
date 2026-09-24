'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { validateProfile } = require('../compiler/compile-strategy');

class DraftInputError extends Error {
  constructor(message, validation) {
    super(message);
    this.name = 'DraftInputError';
    this.validation = validation;
  }
}

function validateStorefrontStrategy(strategy, root) {
  const errors = createSchemaValidator(root).validateFile(strategy, 'schemas/calinium-storefront-strategy.schema.json', 'storefront strategy');
  if (strategy?.version !== 1 || strategy?.compiler_version !== '1.0.0') errors.push('Storefront strategy uses an unsupported version.');
  if (strategy?.validation_report?.valid !== true) errors.push('Storefront strategy must have a valid compiler validation report.');
  return { valid: errors.length === 0, errors, warnings: [] };
}

function loadStrategy(profile, strategy, options = {}) {
  const root = options.root || path.resolve(__dirname, '../..');
  const profileValidation = validateProfile(profile, { root });
  if (!profileValidation.valid) throw new DraftInputError('Merchant profile validation failed.', profileValidation);
  const strategyValidation = validateStorefrontStrategy(strategy, root);
  if (!strategyValidation.valid) throw new DraftInputError('Storefront strategy validation failed.', strategyValidation);
  if (profile.industry !== strategy.merchant_summary.industry || profile.subcategory !== strategy.merchant_summary.subcategory) {
    throw new DraftInputError('Merchant profile and storefront strategy describe different industry or subcategory.', { valid: false, errors: ['Merchant profile and storefront strategy do not match.'], warnings: [] });
  }
  return { profile, strategy, profile_validation: profileValidation, strategy_validation: strategyValidation };
}

module.exports = { loadStrategy, validateStorefrontStrategy, DraftInputError };
