'use strict';

const DISCOVERY_SCOPES = Object.freeze([
  'read_products',
  'read_content',
  'read_online_store_navigation',
  'read_files',
  'read_markets',
  'read_themes'
]);
const DEPLOYMENT_SCOPES = Object.freeze(['write_themes']);
const API_VERSION = '2026-07';
const WEBHOOK_API_VERSION = '2026-07';
const WEBHOOK_TOPICS = Object.freeze([
  'app/uninstalled',
  'app/scopes_update',
  'themes/delete',
  'customers/data_request',
  'customers/redact',
  'shop/redact'
]);
const RESOURCE_TYPES = Object.freeze(['shop', 'product', 'variant', 'product_media', 'collection', 'menu', 'file', 'market', 'theme']);
const SELECTABLE_RESOURCE_TYPES = Object.freeze(['product', 'collection', 'menu', 'file', 'product_media', 'theme']);
const PREVIEW_ELIGIBILITY = Object.freeze([
  'eligible',
  'ineligible-main-theme',
  'ineligible-demo-theme',
  'ineligible-processing',
  'ineligible-processing-failed',
  'ineligible-unsupported-theme',
  'missing-theme',
  'missing-scope',
  'disconnected-store'
]);

function requestedScopes(purpose = 'discovery') {
  return purpose === 'deployment' ? [...new Set([...DISCOVERY_SCOPES, ...DEPLOYMENT_SCOPES])] : [...DISCOVERY_SCOPES];
}

module.exports = { DISCOVERY_SCOPES, DEPLOYMENT_SCOPES, API_VERSION, WEBHOOK_API_VERSION, WEBHOOK_TOPICS, RESOURCE_TYPES, SELECTABLE_RESOURCE_TYPES, PREVIEW_ELIGIBILITY, requestedScopes };
