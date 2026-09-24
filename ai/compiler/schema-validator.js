'use strict';

const fs = require('fs');
const path = require('path');

function createSchemaValidator(root) {
  const cache = new Map();

  function load(schemaPath) {
    const absolutePath = path.resolve(root, schemaPath);
    if (!cache.has(absolutePath)) cache.set(absolutePath, JSON.parse(fs.readFileSync(absolutePath, 'utf8')));
    return cache.get(absolutePath);
  }

  function pointerValue(object, fragment) {
    if (!fragment || fragment === '#') return object;
    return fragment.replace(/^#\//, '').split('/').reduce((value, key) => value && value[key.replace(/~1/g, '/').replace(/~0/g, '~')], object);
  }

  function resolve(reference, schemaPath) {
    const [filePart, fragment = ''] = reference.split('#');
    const targetPath = filePart ? path.resolve(path.dirname(schemaPath), filePart) : schemaPath;
    const target = load(path.relative(root, targetPath));
    return { schema: pointerValue(target, fragment ? `#${fragment}` : '#'), schemaPath: targetPath };
  }

  function matchesType(value, type) {
    if (type === 'null') return value === null;
    if (type === 'array') return Array.isArray(value);
    if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
    if (type === 'integer') return Number.isInteger(value);
    return typeof value === type;
  }

  function validate(value, schema, schemaPath, location, errors) {
    if (!schema || typeof schema !== 'object') { errors.push(`${location} has an unresolved schema reference`); return; }
    if (schema.$ref) {
      const resolved = resolve(schema.$ref, schemaPath);
      validate(value, resolved.schema, resolved.schemaPath, location, errors);
      return;
    }
    for (const part of schema.allOf || []) validate(value, part, schemaPath, location, errors);
    const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
    if (types.length && !types.some((type) => matchesType(value, type))) { errors.push(`${location} must be ${types.join(' or ')}`); return; }
    if (Object.hasOwn(schema, 'const') && value !== schema.const) errors.push(`${location} must equal ${schema.const}`);
    if (schema.enum && !schema.enum.includes(value)) errors.push(`${location} has an invalid enum value`);
    if (schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)) errors.push(`${location} does not match ${schema.pattern}`);
    if (schema.minLength && typeof value === 'string' && value.length < schema.minLength) errors.push(`${location} is too short`);
    if (schema.minimum !== undefined && typeof value === 'number' && value < schema.minimum) errors.push(`${location} is below its minimum`);
    if (Array.isArray(value)) {
      if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${location} has too few items`);
      if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${location} has too many items`);
      if (schema.items) value.forEach((item, index) => validate(item, schema.items, schemaPath, `${location}[${index}]`, errors));
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const key of schema.required || []) if (!(key in value)) errors.push(`${location} is missing required field ${key}`);
      for (const [key, item] of Object.entries(value)) {
        if (schema.properties?.[key]) validate(item, schema.properties[key], schemaPath, `${location}.${key}`, errors);
        else if (schema.additionalProperties === false) errors.push(`${location} has unsupported field ${key}`);
      }
    }
  }

  function validateFile(value, schemaPath, location = schemaPath) {
    const absolutePath = path.resolve(root, schemaPath);
    const errors = [];
    validate(value, load(schemaPath), absolutePath, location, errors);
    return errors;
  }

  function validateSchema(value, schema, location = 'inline_schema', schemaPath = 'schemas/inline.schema.json') {
    const absolutePath = path.resolve(root, schemaPath);
    const errors = [];
    validate(value, schema, absolutePath, location, errors);
    return errors;
  }

  return { validateFile, validateSchema };
}

module.exports = { createSchemaValidator };
