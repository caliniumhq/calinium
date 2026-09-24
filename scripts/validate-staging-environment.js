'use strict';

const fs = require('fs');
const path = require('path');
const {
  controlledStagingConfiguration,
  validateControlledStagingRuntime
} = require('../apps/dashboard/server/controlled-staging-runtime.cjs');

const root = path.resolve(__dirname, '..');
const configFile = path.join(root, 'shopify.app.staging.toml.example');
const source = fs.readFileSync(configFile, 'utf8');
const referenceEnv = {
  CALINIUM_STAGING_APP_NAME: 'Calinium Staging',
  CALINIUM_STAGING_APP_CLIENT_ID: '00000000000000000000000000000001',
  CALINIUM_STAGING_SHOP_DOMAIN: 'calinium-example.myshopify.com',
  CALINIUM_STAGING_CANONICAL_SHOP_DOMAIN: 'calinium-example.myshopify.com',
  CALINIUM_APPLICATION_URL: 'https://calinium-example-staging.fly.dev'
};
const expected = controlledStagingConfiguration(referenceEnv);
for (const value of [
  `client_id = "${expected.clientId}"`,
  'name = "Calinium Staging"',
  `application_url = "${expected.applicationUrl}"`,
  `redirect_urls = [ "${expected.oauthRedirectUri}" ]`,
  'automatically_update_urls_on_dev = false',
  'uri = "/api/shopify/webhooks"'
]) {
  if (!source.includes(value)) throw new Error(`Controlled staging Shopify configuration is missing: ${value}`);
}
for (const scope of ['read_files', 'read_markets', 'read_online_store_navigation', 'read_products', 'read_content', 'read_themes']) {
  if (!source.includes(scope)) throw new Error(`Controlled staging Shopify configuration is missing read-only scope ${scope}.`);
}
if (/\bwrite_[a-z_]+\b/.test(source)) throw new Error('Controlled staging Shopify configuration must not request write scopes.');

const configOnly = process.argv.includes('--config-only');
const result = configOnly
  ? { environment: 'staging', app_name: expected.appName, application_url: expected.applicationUrl, oauth_redirect_uri: expected.oauthRedirectUri, shop_allowlist_source: 'CALINIUM_ALLOWED_SHOP_DOMAINS', config_only: true }
  : validateControlledStagingRuntime({ env: process.env, root, checkFilesystem: true, checkBuild: true, checkExecutables: true });

process.stdout.write(`${JSON.stringify({ status: 'passed', ...result }, null, 2)}\n`);
