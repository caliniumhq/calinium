'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const clientPath = path.join(root, 'apps/dashboard/src/adapters/dashboard-api-client.js');
const apiPath = path.join(root, 'apps/dashboard/server/dashboard-api.cjs');
const sessionPath = path.join(root, 'apps/dashboard/server/shopify/embedded-session.cjs');
const shellPath = path.join(root, 'apps/dashboard/server/embedded-shell.cjs');
const stagingPath = path.join(root, 'apps/dashboard/server/legacyexample-staging-runtime.cjs');
const documentationPath = path.join(root, 'docs/architecture/calinium-core-2-phase-e5r-f-embedded-shopify-id-token-remediation.md');

const client = fs.readFileSync(clientPath, 'utf8');
const api = fs.readFileSync(apiPath, 'utf8');
const session = fs.readFileSync(sessionPath, 'utf8');
const shell = fs.readFileSync(shellPath, 'utf8');
const staging = fs.readFileSync(stagingPath, 'utf8');
const documentation = fs.readFileSync(documentationPath, 'utf8');

assert(client.includes('globalThis.window?.shopify?.idToken'), 'The client must acquire Shopify ID tokens from App Bridge.');
assert(client.includes('const token = await idToken()'), 'The client must acquire a token for the current request.');
assert(client.includes('merchantGenerationFlowOperatorReadiness(projectId)'), 'The normal client path must expose operator readiness.');
assert(client.includes('/merchant-generation-flow/operator/readiness`'), 'Operator readiness must remain project scoped.');
assert(!client.includes('new URLSearchParams(globalThis.window.location?.search || \'\').get(\'id_token\')'), 'The client must not use iframe query credentials for API authorization.');
assert(!client.includes('localStorage') && !client.includes('sessionStorage'), 'ID tokens must not be persisted in browser storage.');
assert(api.includes("operation === 'readiness' && request.method === 'GET'"), 'GET readiness must enforce embedded authentication.');
assert(api.includes('embeddedRequest(request, { required: true })'), 'Readiness must require a Bearer ID token.');
assert(api.includes("normalized.code === 'shopify_embedded_session_expired'"), 'Only expired ID tokens may request a fresh-token replay.');
assert(!api.includes("normalized.code === 'shopify_embedded_session_invalid' || normalized.code === 'shopify_embedded_session_expired'"), 'Non-refreshable invalid credentials must not request replay.');
for (const required of ['HS256', 'timingSafeMatch', 'payload.exp', 'payload.nbf', 'audience.includes(config.clientId)', 'payload.iss === `https://${shopDomain}/admin`']) {
  assert(session.includes(required), `Shopify ID-token verification is missing: ${required}`);
}
assert(shell.includes('name="shopify-api-key"') && shell.includes('app-bridge.js'), 'The embedded shell must initialize App Bridge with the public staging identity.');
assert(staging.includes("canonicalShopDomain: 'calinium-legacyexample.myshopify.com'"), 'The authoritative canonical shop identity changed unexpectedly.');
assert(staging.includes("shopDomain: 'calinium-legacy-admin-example.myshopify.com'"), 'The recorded custom-distribution shop identity changed unexpectedly.');

for (const phrase of [
  'Release-41 symptom',
  'Product path versus acceptance probe',
  'ACCEPTANCE_PROBE_AUTHENTICATION_DEFECT',
  'Token acquisition',
  'Backend verification boundary',
  'App identity',
  'Shop-domain result',
  'Retry behavior',
  'Security invariants',
  'Deployment and E5 resume remain pending'
]) assert(documentation.includes(phrase), `E5R-F documentation is missing: ${phrase}`);

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(packageJson.scripts['validate:e5r-f'], 'node scripts/validate-e5r-f-embedded-shopify-id-token-remediation.js');
assert(packageJson.scripts['test:e5r-f']?.includes('dashboard-api-client.test.js'));
assert(packageJson.scripts['test:e5r-f']?.includes('merchant-flow-founder-operations.test.js'));

const changed = [
  ...execFileSync('git', ['diff', '--name-only'], { cwd: root, encoding: 'utf8' }).trim().split('\n'),
  ...execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n')
].filter(Boolean);
const forbiddenPrefixes = [
  'apps/theme/',
  'ai/architecture/',
  'config/architecture-',
  'apps/dashboard/server/billing/',
  'deployment/'
];
assert.equal(changed.some((file) => forbiddenPrefixes.some((prefix) => file.startsWith(prefix))), false, 'E5R-F changed a forbidden source area.');

const controlledFiles = changed.filter((file) => /\.(?:js|cjs|mjs|json|md)$/.test(file));
const credentialLiteral = /(?:sk-[A-Za-z0-9_-]{20,}|shpat_[A-Za-z0-9]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|Bearer\s+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/;
for (const file of controlledFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.equal(credentialLiteral.test(source), false, `Credential literal detected in ${file}.`);
}

console.log(JSON.stringify({
  status: 'passed',
  classification: 'ACCEPTANCE_PROBE_AUTHENTICATION_DEFECT',
  normal_client_path: 'fresh App Bridge ID token per request',
  iframe_query_credential_allowed: false,
  cookie_only_operator_readiness_allowed: false,
  refresh_signal: 'expired token only; App Bridge bounded replay',
  non_refreshable_fail_closed: true,
  forbidden_scope_check: 'passed',
  credential_literal_scan: `${controlledFiles.length}/${controlledFiles.length} passed`,
  api_model_calls: 0,
  shopify_theme_mutations: 0
}, null, 2));
