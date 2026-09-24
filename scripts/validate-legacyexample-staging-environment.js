'use strict';

const fs = require('fs');
const path = require('path');
const { legacyStagingConfiguration, validateLegacyExampleStagingRuntime } = require('../apps/dashboard/server/legacyexample-staging-runtime.cjs');

const root = path.resolve(__dirname, '..');
const configFile = path.join(root, 'shopify.app.legacy-staging.toml.example');
const source = fs.readFileSync(configFile, 'utf8');
const referenceEnv = {
  CALINIUM_STAGING_APP_CLIENT_ID: '00000000000000000000000000000002',
  CALINIUM_STAGING_SHOP_DOMAIN: 'calinium-legacy-admin-example.myshopify.com',
  CALINIUM_STAGING_CANONICAL_SHOP_DOMAIN: 'calinium-legacyexample.myshopify.com',
  CALINIUM_APPLICATION_URL: 'https://calinium-legacy-staging.fly.dev'
};
const expectedConfiguration = legacyStagingConfiguration(referenceEnv);
const requiredConfig = [
  `client_id = "${expectedConfiguration.clientId}"`,
  'name = "Calinium LEGACY_EXAMPLE Staging"',
  `application_url = "${expectedConfiguration.applicationUrl}"`,
  `redirect_urls = [ "${expectedConfiguration.oauthRedirectUri}" ]`,
  'automatically_update_urls_on_dev = false',
  'uri = "/api/shopify/webhooks"'
];
for (const expected of requiredConfig) {
  if (!source.includes(expected)) throw new Error(`LEGACY_EXAMPLE staging Shopify configuration is missing: ${expected}`);
}
for (const scope of ['read_files', 'read_markets', 'read_online_store_navigation', 'read_products', 'read_content', 'read_themes']) {
  if (!source.includes(scope)) throw new Error(`LEGACY_EXAMPLE staging Shopify configuration is missing read-only scope ${scope}.`);
}
if (/\bwrite_[a-z_]+\b/.test(source)) throw new Error('LEGACY_EXAMPLE staging Shopify configuration must not request write scopes.');

const configOnly = process.argv.includes('--config-only');
const result = configOnly
  ? { environment: 'staging', application_url: expectedConfiguration.applicationUrl, oauth_redirect_uri: expectedConfiguration.oauthRedirectUri, shop_allowlist_source: 'CALINIUM_ALLOWED_SHOP_DOMAINS', config_only: true }
  : validateLegacyExampleStagingRuntime({ env: process.env, root, checkFilesystem: true, checkBuild: true, checkExecutables: true });

process.stdout.write(`${JSON.stringify({ status: 'passed', ...result }, null, 2)}\n`);
