#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const errors = [];
const requiredFiles = [
  'apps/dashboard/.env.example',
  'apps/dashboard/shopify.web.toml',
  'apps/dashboard/server/dev-server.cjs',
  'apps/dashboard/server/embedded-shell.cjs',
  'apps/dashboard/server/auth/shopify-embedded-auth-service.cjs',
  'apps/dashboard/server/shopify/runtime-configuration.cjs',
  'apps/dashboard/server/shopify/webhook-service.cjs',
  'apps/dashboard/tests/shopify-live-validation.test.js',
  'apps/dashboard/tests/embedded-app-runtime.test.js',
  'apps/dashboard/tests/shopify-embedded-auth.test.js',
  'shopify.app.development.toml.example',
  'shopify.app.staging.toml.example',
  'shopify.app.production.toml.example',
  'docs/dashboard/shopify-live-validation.md'
];
for (const file of requiredFiles) if (!fs.existsSync(path.join(root, file))) errors.push(`Missing Milestone 14 file: ${file}`);
const forbidden = /\bwrite_themes\b/;
for (const file of ['shopify.app.development.toml.example', 'shopify.app.staging.toml.example', 'shopify.app.production.toml.example']) {
  const source = fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
  if (!/use_legacy_install_flow\s*=\s*false/.test(source)) errors.push(`${file} must retain managed installation.`);
  if (forbidden.test(source)) errors.push(`${file} must not request write_themes in Milestone 14.`);
  for (const scope of ['read_content', 'read_files', 'read_markets', 'read_online_store_navigation', 'read_products', 'read_themes']) if (!source.includes(scope)) errors.push(`${file} is missing ${scope}.`);
  if (!source.includes('api_version = "2026-07"')) errors.push(`${file} must use the declared webhook API version.`);
}
const envExample = fs.existsSync(path.join(root, 'apps/dashboard/.env.example')) ? fs.readFileSync(path.join(root, 'apps/dashboard/.env.example'), 'utf8') : '';
for (const key of ['CALINIUM_SHOPIFY_CLIENT_ID', 'CALINIUM_SHOPIFY_CLIENT_SECRET', 'CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY', 'CALINIUM_DASHBOARD_SESSION_SECRET']) if (!envExample.includes(`${key}=`)) errors.push(`.env.example is missing ${key}.`);
const source = fs.readFileSync(path.join(root, 'apps/dashboard/server/shopify/shopify-connection-service.cjs'), 'utf8');
if (!source.includes('encryptCredential(token)')) errors.push('OAuth callback does not persist a credential envelope.');
if (!source.includes('previewEligibility')) errors.push('Read-only preview eligibility is missing.');
if (!source.includes("shopify_deployment_scope_deferred")) errors.push('Deployment scope deferral is missing.');
const clientSource = fs.readFileSync(path.join(root, 'apps/dashboard/src/components/creative-director/ShopifyConnectionPanel.jsx'), 'utf8');
if (/CLIENT_SECRET|ACCESS_TOKEN|TOKEN_ENCRYPTION_KEY/.test(clientSource)) errors.push('A client component references a Shopify secret name.');
const webProcess = fs.readFileSync(path.join(root, 'apps/dashboard/shopify.web.toml'), 'utf8');
if (!/dev\s*=\s*"npm run dev"/.test(webProcess)) errors.push('Shopify CLI must start the existing dashboard development process.');
const developmentConfig = fs.readFileSync(path.join(root, 'shopify.app.development.toml.example'), 'utf8');
if (!/web_directories\s*=\s*\[\s*"apps\/dashboard"\s*\]/.test(developmentConfig)) errors.push('Development app config must discover the dashboard web process.');
if (!/automatically_update_urls_on_dev\s*=\s*true/.test(developmentConfig)) errors.push('Development app config must use Shopify CLI development URLs.');
const devServer = fs.readFileSync(path.join(root, 'apps/dashboard/server/dev-server.cjs'), 'utf8');
if (!devServer.includes('allowedHosts: allowedHosts()')) errors.push('Embedded Vite host validation is not configured for the Shopify CLI tunnel.');
if (/const host = process\.env\.HOST/.test(devServer)) errors.push('Dashboard server must not bind to Shopify CLI HOST.');
const embeddedShell = fs.readFileSync(path.join(root, 'apps/dashboard/server/embedded-shell.cjs'), 'utf8');
if (!embeddedShell.includes('shopifycloud/app-bridge.js') || !embeddedShell.includes('frame-ancestors https://admin.shopify.com')) errors.push('Embedded dashboard App Bridge or frame policy is missing.');
const embeddedAuth = fs.readFileSync(path.join(root, 'apps/dashboard/server/auth/shopify-embedded-auth-service.cjs'), 'utf8');
if (!embeddedAuth.includes('exchangeSessionToken') || !embeddedAuth.includes('shopify_embedded_identities') && !fs.readFileSync(path.join(root, 'apps/dashboard/server/storage/migrations.cjs'), 'utf8').includes('shopify_embedded_identities')) errors.push('Embedded Shopify identity and managed-install token exchange are missing.');
const apiSource = fs.readFileSync(path.join(root, 'apps/dashboard/server/dashboard-api.cjs'), 'utf8');
if (!apiSource.includes("'/api/auth/embedded'") || !apiSource.includes('shopify_embedded_login_not_available')) errors.push('Embedded sign-in route or embedded password-login guard is missing.');
const dashboardClient = fs.readFileSync(path.join(root, 'apps/dashboard/src/adapters/dashboard-api-client.js'), 'utf8');
if (!dashboardClient.includes('bootstrapEmbedded') || !dashboardClient.includes("'/api/auth/embedded'")) errors.push('Dashboard client does not bootstrap embedded Shopify sign-in.');
if (errors.length) { console.error(`Shopify live-integration validation failed:\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log('Shopify live-integration validation passed: managed-install config templates, dashboard web process, embedded App Bridge shell, verified embedded identity bridge, tunnel-safe host validation, read-only scopes, encrypted credentials, webhook boundary, and safe dashboard boundary are present.');
