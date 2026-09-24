'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { readJson, contractError } = require('./contracts');
const { APPROVED_FIXTURE_REVISION, APPROVED_COMPARISON_KEY } = require('../storefront-render/architecture-comparison');

const LIVE_CONFIGURATION_FILE = 'config/storefront-live-design-evaluation.json';
const LIVE_CONFIGURATION_SCHEMA = 'schemas/calinium-live-design-evaluation-configuration.schema.json';

function configured(value) { return typeof value === 'string' && value.trim().length > 0; }

function assertLiveConfiguration(configuration, root) {
  const errors = createSchemaValidator(root).validateFile(configuration, LIVE_CONFIGURATION_SCHEMA, 'live_design_evaluation_configuration');
  if (configuration?.calibration?.comparison_fixture_revision !== APPROVED_FIXTURE_REVISION
    || configuration?.calibration?.comparison_key !== APPROVED_COMPARISON_KEY) errors.push('Live Design Evaluation configuration does not bind the approved Phase C comparison.');
  if (configuration?.provider?.provider_kind !== 'live_multimodal') errors.push('Live Design Evaluation provider must be live_multimodal.');
  if (configuration?.model?.id !== 'gpt-5.6-sol') errors.push('Live Design Evaluation configuration must pin the approved GPT-5.6 Sol model.');
  if (configuration?.safety?.fixture_fallback_allowed !== false) errors.push('Live Design Evaluation cannot silently fall back to fixture replay.');
  if (configuration?.safety?.automatic_repair_allowed !== false || configuration?.safety?.automatic_mutation_allowed !== false
    || configuration?.safety?.shopify_write_allowed !== false) errors.push('Live Design Evaluation configuration violates the no-mutation boundary.');
  if (errors.length) throw contractError('Live Design Evaluation Configuration', [...new Set(errors)]);
  return configuration;
}

function credentialStatus(configuration, env = process.env) {
  return {
    api_key_configured: configured(env[configuration.credentials.api_key_environment_variable]),
    organization_configured: configured(env[configuration.credentials.organization_environment_variable]),
    project_configured: configured(env[configuration.credentials.project_environment_variable])
  };
}

function resolveLiveCredentials(configuration, env = process.env, { required = true } = {}) {
  const status = credentialStatus(configuration, env);
  if (required && !status.api_key_configured) {
    const error = new Error('Live multimodal design evaluation credentials are not configured.');
    error.name = 'LiveDesignProviderError';
    error.code = 'live_design_credentials_missing';
    error.retryable = false;
    throw error;
  }
  return {
    apiKey: status.api_key_configured ? env[configuration.credentials.api_key_environment_variable].trim() : null,
    organization: status.organization_configured ? env[configuration.credentials.organization_environment_variable].trim() : null,
    project: status.project_configured ? env[configuration.credentials.project_environment_variable].trim() : null,
    status
  };
}

function loadLiveDesignConfiguration(root, { reference = LIVE_CONFIGURATION_FILE, env = process.env, requireCredentials = false } = {}) {
  const configuration = assertLiveConfiguration(readJson(path.resolve(root, reference)), root);
  const credentials = resolveLiveCredentials(configuration, env, { required: requireCredentials });
  return { configuration, credential_status: credentials.status };
}

module.exports = {
  LIVE_CONFIGURATION_FILE,
  LIVE_CONFIGURATION_SCHEMA,
  configured,
  assertLiveConfiguration,
  credentialStatus,
  resolveLiveCredentials,
  loadLiveDesignConfiguration
};
