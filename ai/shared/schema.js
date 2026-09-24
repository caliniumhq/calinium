'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');

function repositoryRoot(options = {}) {
  return options.root || path.resolve(__dirname, '../..');
}

function validateSchema(value, schemaPath, options = {}) {
  const root = repositoryRoot(options);
  return createSchemaValidator(root).validateFile(value, schemaPath, options.location || schemaPath);
}

function assertSchema(value, schemaPath, options = {}) {
  const errors = validateSchema(value, schemaPath, options);
  if (errors.length) {
    const error = new Error(`Validation failed for ${schemaPath}: ${errors.join('; ')}`);
    error.name = 'SchemaValidationError';
    error.errors = errors;
    throw error;
  }
  return value;
}

module.exports = { repositoryRoot, validateSchema, assertSchema };
