'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');

const root = path.resolve(__dirname, '..');
const schemas = [
  'schemas/calinium-user.schema.json',
  'schemas/calinium-organization.schema.json',
  'schemas/calinium-workspace.schema.json',
  'schemas/calinium-membership.schema.json',
  'schemas/calinium-project.schema.json',
  'schemas/calinium-project-interview-session.schema.json',
  'schemas/calinium-project-merchant-profile.schema.json'
];
const required = [
  'apps/dashboard/server/auth/auth-service.cjs', 'apps/dashboard/server/auth/auth-provider-registry.cjs', 'apps/dashboard/server/auth/password-auth-provider.cjs',
  'apps/dashboard/server/storage/dashboard-store.cjs', 'apps/dashboard/server/storage/sqlite-driver.cjs', 'apps/dashboard/server/storage/postgres-driver.cjs',
  'apps/dashboard/server/services/project-service.cjs', 'apps/dashboard/server/services/interview-persistence-service.cjs', 'apps/dashboard/server/dashboard-api.cjs',
  'apps/dashboard/src/adapters/dashboard-api-client.js', 'apps/dashboard/src/services/dashboard-service.js', 'apps/dashboard/src/services/interview-service.js',
  'apps/dashboard/tests/accounts-projects-storage.test.js', 'apps/dashboard/tests/dashboard-api-auth.test.js', 'docs/dashboard/accounts.md', 'docs/dashboard/projects.md', 'docs/dashboard/authentication.md', 'docs/dashboard/storage.md'
];
const errors = [];
const schemaValidator = createSchemaValidator(root);
for (const file of schemas.concat(required)) if (!fs.existsSync(path.join(root, file))) errors.push(`${file} is missing`);
for (const file of schemas) {
  try { JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); } catch (error) { errors.push(`${file} is invalid JSON: ${error.message}`); }
}
const examples = {
  'schemas/calinium-user.schema.json': { version: 1, id: 'usr_example', email: 'merchant@example.com', full_name: 'Merchant', status: 'active', created_at: '2026-07-21T00:00:00.000Z', updated_at: '2026-07-21T00:00:00.000Z', last_signed_in_at: null },
  'schemas/calinium-organization.schema.json': { version: 1, id: 'org_example', name: 'Studio', slug: 'studio-example', created_by_user_id: 'usr_example', created_at: '2026-07-21T00:00:00.000Z', updated_at: '2026-07-21T00:00:00.000Z' },
  'schemas/calinium-workspace.schema.json': { version: 1, id: 'wsp_example', organization_id: 'org_example', name: 'Studio', created_at: '2026-07-21T00:00:00.000Z', updated_at: '2026-07-21T00:00:00.000Z' },
  'schemas/calinium-membership.schema.json': { version: 1, id: 'mem_example', organization_id: 'org_example', user_id: 'usr_example', role: 'owner', status: 'active', created_at: '2026-07-21T00:00:00.000Z' },
  'schemas/calinium-project.schema.json': { version: 1, id: 'prj_example', organization_id: 'org_example', workspace_id: 'wsp_example', name: 'Brand', business_name: 'Brand', country: 'US', website_url: null, shopify_store_url: null, icon: null, status: 'active', created_by_user_id: 'usr_example', created_at: '2026-07-21T00:00:00.000Z', updated_at: '2026-07-21T00:00:00.000Z', current_merchant_profile_id: null }
};
for (const [file, value] of Object.entries(examples)) for (const error of schemaValidator.validateFile(value, file, file)) errors.push(error);
if (errors.length) { console.error(`Dashboard accounts validation failed:\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log('Dashboard accounts validation passed: schemas, storage/auth modules, durable project boundaries, docs, and test coverage are present.');
