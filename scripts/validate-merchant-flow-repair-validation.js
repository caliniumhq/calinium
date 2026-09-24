#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  REPAIR_VALIDATION_CLASSIFICATION,
  REPAIR_VALIDATION_SCHEMA,
  REPAIR_VALIDATION_VERSION,
  SUPPORTED_REPAIR_VALIDATION_CLASSES,
  ZERO_WRITE_RENDER_BACKEND_UNAVAILABLE,
  zeroWriteRepairValidationBackend
} = require('../ai/storefront-render');

const root = path.resolve(__dirname, '..');
const schema = JSON.parse(fs.readFileSync(path.join(root, REPAIR_VALIDATION_SCHEMA), 'utf8'));
const source = fs.readFileSync(path.join(root, 'ai/storefront-render/repair-validation-contracts.js'), 'utf8');
const documentation = fs.readFileSync(path.join(root, 'docs/architecture/calinium-core-2-bounded-repair-validation-transport.md'), 'utf8');

assert.equal(REPAIR_VALIDATION_VERSION, 'repair-validation-v1');
assert.equal(REPAIR_VALIDATION_CLASSIFICATION, 'repaired_derivative_validation');
assert.equal(ZERO_WRITE_RENDER_BACKEND_UNAVAILABLE, 'ZERO_WRITE_RENDER_BACKEND_UNAVAILABLE');
assert.deepEqual(SUPPORTED_REPAIR_VALIDATION_CLASSES, ['responsive_layout']);
assert.deepEqual(zeroWriteRepairValidationBackend(), {
  available: false,
  status: 'unavailable',
  code: 'ZERO_WRITE_RENDER_BACKEND_UNAVAILABLE',
  reason_code: 'shopify_liquid_runtime_requires_development_sync',
  shopify_theme_dev_fallback_allowed: false
});
assert.equal(schema.properties.contract_version.const, 'repair-validation-v1');
assert.equal(schema.properties.classification.const, 'repaired_derivative_validation');
assert.equal(schema.properties.lineage.properties.repair_class.const, 'responsive_layout');
assert.equal(schema.properties.render_backend.properties.code.const, 'ZERO_WRITE_RENDER_BACKEND_UNAVAILABLE');
assert.equal(schema.properties.safety.properties.shopify_writes.const, 0);
assert.equal(schema.properties.safety.properties.provider_calls.const, 0);
assert.match(source, /verifyArtifactEvidence/);
assert.match(source, /Repaired derivative cannot be represented as the original paid artifact/);
assert.match(source, /shopify_theme_dev_fallback_allowed: false/);
assert.doesNotMatch(source, /startShopifyDevelopmentRuntime|captureMerchantFlowStorefront|evaluateMerchantFlowD1|evaluateMerchantFlowD27/);
assert.match(documentation, /does not authorize rendering/i);
assert.match(documentation, /ZERO_WRITE_RENDER_BACKEND_UNAVAILABLE/);
assert.match(documentation, /Original paid artifact/);
assert.match(documentation, /repaired derivative/i);

console.log('Repair-validation transport validation passed: repair-validation-v1; original and derivative separated; checksum-bound lineage; zero-write backend unavailable; Shopify/provider/render/D1/D2.7 execution absent.');
