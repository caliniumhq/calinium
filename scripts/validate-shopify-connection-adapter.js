#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');

const root = path.resolve(__dirname, '..');
const errors = [];
const required = [
  'apps/dashboard/server/shopify/constants.cjs',
  'apps/dashboard/server/shopify/oauth.cjs',
  'apps/dashboard/server/shopify/credential-envelope.cjs',
  'apps/dashboard/server/shopify/admin-api-adapter.cjs',
  'apps/dashboard/server/shopify/resource-normalizer.cjs',
  'apps/dashboard/server/shopify/shopify-connection-service.cjs',
  'apps/dashboard/server/shopify/deterministic-shopify-adapter.cjs',
  'apps/dashboard/src/components/creative-director/ShopifyConnectionPanel.jsx',
  'apps/dashboard/src/components/creative-director/ShopifyResourceApprovalList.jsx',
  'apps/dashboard/tests/shopify-connection-service.test.js',
  'docs/dashboard/shopify-connection.md',
  'docs/dashboard/shopify-security.md',
  'docs/dashboard/shopify-resources.md',
  'docs/dashboard/shopify-preview.md',
  'schemas/calinium-shopify-connection.schema.json',
  'schemas/calinium-shopify-resource.schema.json',
  'schemas/calinium-project-shopify-resource-approval.schema.json',
  'schemas/calinium-shopify-preview.schema.json'
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required Shopify connection adapter file: ${file}`);

const schemaPaths = [
  'schemas/calinium-shopify-connection.schema.json',
  'schemas/calinium-shopify-resource.schema.json',
  'schemas/calinium-project-shopify-resource-approval.schema.json',
  'schemas/calinium-shopify-preview.schema.json'
];
for (const schemaPath of schemaPaths) {
  try {
    const schema = JSON.parse(fs.readFileSync(path.join(root, schemaPath), 'utf8'));
    if (!schema.$id || !schema.properties?.version || schema.properties.version.const !== 1) errors.push(`${schemaPath} lacks versioned schema metadata.`);
  } catch (error) { errors.push(`${schemaPath} does not parse: ${error.message}`); }
}

for (const file of required.filter((entry) => entry.endsWith('.cjs'))) {
  try { require(path.join(root, file)); } catch (error) { errors.push(`${file} cannot load: ${error.message}`); }
}

const service = fs.readFileSync(path.join(root, 'apps/dashboard/server/shopify/shopify-connection-service.cjs'), 'utf8');
for (const fragment of ['credentialEnvelope', 'verifyShopifyHmac', 'validateCallbackTimestamp', 'normalizeShopDomain', 'resolveApprovedResource', 'invalidateShopifyApprovalsForConnection', 'preparePreview']) {
  if (!service.includes(fragment)) errors.push(`Shopify connection service is missing required boundary ${fragment}.`);
}
const clientSources = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(?:js|jsx)$/.test(entry.name)) clientSources.push({ file: absolute, source: fs.readFileSync(absolute, 'utf8') });
  }
}
walk(path.join(root, 'apps/dashboard/src'));
for (const forbidden of ['CALINIUM_SHOPIFY_CLIENT_SECRET', 'CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY', 'X-Shopify-Access-Token', 'access_token']) {
  for (const source of clientSources) if (source.source.includes(forbidden)) errors.push(`${path.relative(root, source.file)} exposes forbidden Shopify credential material (${forbidden}).`);
}

const validator = createSchemaValidator(root);
const examples = [
  ['schemas/calinium-shopify-connection.schema.json', { version: 1, id: 'shc_example', organization_id: 'org_example', shop_domain: 'example.myshopify.com', shop_gid: 'gid://shopify/Shop/1', display_name: 'Example Store', storefront_url: 'https://example.myshopify.com', primary_market: null, granted_scopes: ['read_products'], connection_status: 'ready', credential_status: 'active', health: { status: 'healthy', missing_scopes: [], checked_at: '2026-07-21T00:00:00.000Z', message: null }, last_synced_at: null, connected_by_user_id: 'usr_example', connected_at: '2026-07-21T00:00:00.000Z', disconnected_at: null, created_at: '2026-07-21T00:00:00.000Z', updated_at: '2026-07-21T00:00:00.000Z' }],
  ['schemas/calinium-shopify-resource.schema.json', { version: 1, id: 'shr_example', connection_id: 'shc_example', resource_type: 'product', remote_gid: 'gid://shopify/Product/1', display_title: 'Example product', handle: 'example-product', resource_status: 'ACTIVE', preview_url: null, metadata: {}, source_revision: 'a'.repeat(64), remote_updated_at: null, last_synced_at: '2026-07-21T00:00:00.000Z', last_sync_run_id: 'ssr_example', availability_status: 'available', approval_eligible: true, deleted_at: null, created_at: '2026-07-21T00:00:00.000Z', updated_at: '2026-07-21T00:00:00.000Z' }],
  ['schemas/calinium-project-shopify-resource-approval.schema.json', { version: 1, id: 'sra_example', project_id: 'prj_example', connection_id: 'shc_example', resource_id: 'shr_example', approval_status: 'approved', source_revision: 'a'.repeat(64), merchant_note: null, approved_by_user_id: 'usr_example', approved_at: '2026-07-21T00:00:00.000Z', rejected_at: null, revoked_at: null, updated_at: '2026-07-21T00:00:00.000Z', created_at: '2026-07-21T00:00:00.000Z' }],
  ['schemas/calinium-shopify-preview.schema.json', { version: 1, id: 'spt_example', project_id: 'prj_example', connection_id: 'shc_example', remote_theme_gid: 'gid://shopify/OnlineStoreTheme/1', remote_theme_id: '1', theme_name: 'Preview', theme_role: 'development', preview_url: null, status: 'failed', generated_build_id: 'generation-example', created_at: '2026-07-21T00:00:00.000Z', updated_at: '2026-07-21T00:00:00.000Z' }]
];
for (const [schemaPath, example] of examples) errors.push(...validator.validateFile(example, schemaPath, `${schemaPath} example`));

if (errors.length) {
  process.stderr.write(`Shopify connection adapter validation failed:\n- ${errors.join('\n- ')}\n`);
  process.exitCode = 1;
} else process.stdout.write('Shopify connection adapter validation passed: schemas, secure server boundaries, client credential isolation, and required module contracts.\n');
