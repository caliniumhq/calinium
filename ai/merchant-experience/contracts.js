'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest } = require('../architecture');

const CAPABILITY_PATH = 'config/calinium-analysis-first-merchant-experience.json';
const CAPABILITY_SCHEMA = 'schemas/calinium-analysis-first-merchant-experience.schema.json';
const JOURNEY_SCHEMA = 'schemas/calinium-analysis-first-merchant-journey.schema.json';
const PROJECTION_SCHEMA = 'schemas/calinium-analysis-first-merchant-projection.schema.json';
const VISUAL_BRIEFING_SCHEMA = 'schemas/calinium-merchant-visual-briefing.schema.json';
const DIRECTION_CHOICE_SCHEMA = 'schemas/calinium-analysis-first-direction-choice.schema.json';
const TELEMETRY_SCHEMA = 'schemas/calinium-analysis-first-telemetry-event.schema.json';

const CAPABILITY_REVISION = 'analysis-first-merchant-experience-capability-v1';
const JOURNEY_VERSION = 'analysis-first-merchant-journey-v1';
const PROJECTION_VERSION = 'analysis-first-merchant-projection-v1';
const VISUAL_BRIEFING_VERSION = 'merchant-visual-briefing-v1';
const DIRECTION_CHOICE_VERSION = 'analysis-first-direction-choice-v1';
const TELEMETRY_VERSION = 'analysis-first-merchant-telemetry-v1';

function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }

function contractError(code, message) {
  const error = new Error(message);
  error.name = 'AnalysisFirstMerchantExperienceError';
  error.code = code;
  return error;
}

function assertSchema(value, schema, label, root = path.resolve(__dirname, '../..')) {
  const errors = createSchemaValidator(root).validateFile(value, schema, label);
  if (errors.length) throw contractError('analysis_first_contract_invalid', `${label} validation failed: ${errors.join('; ')}`);
  return value;
}

function withoutChecksum(value) {
  const next = clone(value);
  delete next.checksum;
  return next;
}

function canonicalContract(base) {
  return { ...base, checksum: digest(base) };
}

function assertChecksum(value, label) {
  if (value?.checksum !== digest(withoutChecksum(value))) {
    throw contractError('analysis_first_checksum_mismatch', `${label} checksum is stale.`);
  }
  return value;
}

function normalizeProjectBinding(value) {
  const binding = {
    project_id: String(value?.project_id || '').trim(),
    organization_id: String(value?.organization_id || '').trim(),
    shop: value?.shop === null || value?.shop === undefined ? null : String(value.shop).trim().toLowerCase()
  };
  if (!binding.project_id || !binding.organization_id) {
    throw contractError('analysis_first_project_binding_invalid', 'Project and organization authority are required.');
  }
  if (binding.shop !== null && !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(binding.shop)) {
    throw contractError('analysis_first_shop_binding_invalid', 'A canonical Shopify shop binding is required.');
  }
  return binding;
}

function loadCapability(root = path.resolve(__dirname, '../..')) {
  const capability = JSON.parse(fs.readFileSync(path.resolve(root, CAPABILITY_PATH), 'utf8'));
  assertSchema(capability, CAPABILITY_SCHEMA, 'analysis-first merchant-experience capability', root);
  if (capability.analysis_first_merchant_experience_enabled !== false
    || capability.activation_scope !== 'disabled'
    || JSON.stringify(capability.visible_stages) !== JSON.stringify(['analyzing_store', 'building_storefront', 'review_preview'])
    || capability.automatic_generation_allowed !== false
    || capability.automatic_paid_action_allowed !== false
    || capability.automatic_theme_action_allowed !== false
    || capability.automatic_repair_allowed !== false) {
    throw contractError('analysis_first_capability_unsafe', 'F1-A capability configuration must remain disabled and non-mutating.');
  }
  return capability;
}

module.exports = {
  CAPABILITY_PATH,
  CAPABILITY_SCHEMA,
  JOURNEY_SCHEMA,
  PROJECTION_SCHEMA,
  VISUAL_BRIEFING_SCHEMA,
  DIRECTION_CHOICE_SCHEMA,
  TELEMETRY_SCHEMA,
  CAPABILITY_REVISION,
  JOURNEY_VERSION,
  PROJECTION_VERSION,
  VISUAL_BRIEFING_VERSION,
  DIRECTION_CHOICE_VERSION,
  TELEMETRY_VERSION,
  clone,
  contractError,
  assertSchema,
  withoutChecksum,
  canonicalContract,
  assertChecksum,
  normalizeProjectBinding,
  loadCapability
};
