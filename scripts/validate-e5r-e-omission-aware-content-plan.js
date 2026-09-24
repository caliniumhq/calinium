'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const {
  POLICY_VERSION,
  EFFECTIVE_COMPOSITION_VERSION,
  MATERIALIZATION_REVISION,
  applyContentPlanEligibility,
  contentPlanFlowEligibility,
  eligibilityIntegrity
} = require('../pipeline/content-plan-eligibility');
const { publicContentPlanProjection } = require('../apps/dashboard/server/dashboard-api.cjs');
const { resourceEligibilityIntegrity } = require('../pipeline/resource-confirmation-eligibility');

const root = path.resolve(__dirname, '..');
const fixturePath = path.join(root, 'fixtures/content-plan-eligibility.json');
const documentationPath = path.join(root, 'docs/architecture/calinium-core-2-phase-e5r-e-omission-aware-content-plan-materialization.md');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const release = fixture.release_state;
const validator = createSchemaValidator(root);

assert.equal(fixture.fixture_version, 'e5r-e-release-40-stale-content-plan-v1');
assert.equal(fixture.sanitization.production_project_identifiers_removed, true);
assert.equal(fixture.sanitization.production_shop_domain_removed, true);
assert.equal(fixture.sanitization.credentials_present, false);
assert.equal(release.deployment_release, 40);
assert.equal(release.resource_inventory_summary.total, 25);
assert.equal(release.resource_inventory_summary.verified_automatically, 1);
assert.equal(release.resource_inventory_summary.omitted_by_policy, 24);
assert.equal(release.resource_inventory_summary.merchant_action_count, 0);
assert.equal(release.store_resources_approval.authoritative, true);
assert.equal(release.store_resources_approval.must_be_reused, true);
assert.equal(release.merchant_intent.shopping_mode, 'information_led');
assert.equal(release.merchant_intent.must_remain_unchanged, true);
assert.equal(release.store_intelligence.must_remain_unchanged, true);
assert.equal(resourceEligibilityIntegrity(
  release.resource_plan.confirmation_eligibility,
  release.generation_context.resource_confirmation_decisions
).valid, true);

const result = applyContentPlanEligibility({
  previousContentPlan: structuredClone(release.stale_content_plan),
  materializedContentPlan: structuredClone(release.stale_content_plan),
  originalStoreStrategy: structuredClone(release.approved_preset.composition),
  resourcePlan: structuredClone(release.resource_plan),
  generationContext: structuredClone(release.generation_context),
  presetRevisionId: release.approved_preset.revision_id,
  sourceRevision: release.source_revision,
  at: release.observed_at,
  scope: structuredClone(release.scope)
});
const craftsmanship = result.eligibility.targets.find((target) => target.target_key === 'craftsmanship');
const publicProjection = publicContentPlanProjection(result.contentPlan);
const publicCraftsmanship = publicProjection.targets.find((target) => target.content_key === 'craftsmanship');
const flowEligibility = contentPlanFlowEligibility(result.contentPlan, {
  resourcePlan: release.resource_plan,
  generationContext: release.generation_context,
  presetRevisionId: release.approved_preset.revision_id,
  sourceRevision: release.source_revision
});

assert.equal(POLICY_VERSION, 'content-plan-eligibility-v1');
assert.equal(EFFECTIVE_COMPOSITION_VERSION, 'resource-resolved-effective-composition-v1');
assert.equal(MATERIALIZATION_REVISION, 'content-plan-materialization-v1');
assert.equal(eligibilityIntegrity(result.eligibility, result.contentPlan).valid, true);
assert.deepEqual(result.effectiveStoreStrategy, release.expected_effective_strategy);
assert.equal(result.contentPlan.craftsmanship.status, release.expected_after.craftsmanship_candidate_status);
assert.equal(result.contentPlan.craftsmanship.candidate_version, release.expected_after.craftsmanship_candidate_version);
assert.equal(craftsmanship.eligibility_state, release.expected_after.craftsmanship_eligibility_state);
assert.equal(result.eligibility.summary.actionable_count, 0);
assert.equal(result.eligibility.summary.blocked_count, 0);
assert.equal(result.eligibility.stage_resolution.status, 'resolved');
assert.equal(result.stage, 'offer');
assert.equal(flowEligibility.eligible, true);
assert.equal(publicProjection.summary.actionable_count, 0);
assert.equal(publicProjection.resolved, true);
assert.equal(publicCraftsmanship.state, 'optional_not_included');
assert.equal(publicCraftsmanship.actionable, false);
assert.equal(JSON.stringify(publicProjection).includes('checksum'), false);
assert.equal(JSON.stringify(publicProjection).includes(POLICY_VERSION), false);

assert.deepEqual(
  validator.validateFile(result.eligibility, 'schemas/calinium-content-plan-eligibility.schema.json', 'release-40 content-plan eligibility'),
  []
);
assert.deepEqual(
  validator.validateFile(publicProjection, 'schemas/calinium-content-plan-public-projection.schema.json', 'release-40 public content-plan projection'),
  []
);

assert.equal(fs.existsSync(documentationPath), true, 'E5R-E milestone documentation is missing.');
const documentation = fs.readFileSync(documentationPath, 'utf8');
for (const requiredPhrase of [
  'Release-40 symptom',
  'Source-of-truth mismatch',
  'Effective-composition model',
  'Content-plan eligibility states',
  'Stale-plan reconciliation',
  'Zero-action advancement',
  'Quick Start',
  'Advanced Mode',
  'Critical safeguards',
  'Controlled fixture',
  'F1 compatibility',
  'Deployment and E5 resume remain pending'
]) assert.equal(documentation.includes(requiredPhrase), true, `Documentation is missing: ${requiredPhrase}`);

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(packageJson.scripts['test:e5r-e'], 'node scripts/test-e5r-e-omission-aware-content-plan.js && npm --prefix apps/dashboard test -- --run tests/content-plan-reconciliation-service.test.js src/tests/content-plan-status-list.test.jsx');
assert.equal(packageJson.scripts['validate:e5r-e'], 'node scripts/validate-e5r-e-omission-aware-content-plan.js');

const changed = [
  ...execFileSync('git', ['diff', '--name-only'], { cwd: root, encoding: 'utf8' }).trim().split('\n'),
  ...execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n')
].filter(Boolean);
const forbiddenPrefixes = [
  'apps/theme/',
  'apps/dashboard/server/billing/',
  'deployment/',
  'ai/architecture/',
  'config/architecture-'
];
assert.equal(changed.some((file) => forbiddenPrefixes.some((prefix) => file.startsWith(prefix))), false, 'E5R-E changed a forbidden source area.');

const controlledFiles = [
  'fixtures/content-plan-eligibility.json',
  'scripts/test-e5r-e-omission-aware-content-plan.js',
  'scripts/validate-e5r-e-omission-aware-content-plan.js',
  'apps/dashboard/src/tests/content-plan-status-list.test.jsx',
  'apps/dashboard/tests/content-plan-reconciliation-service.test.js',
  'docs/architecture/calinium-core-2-phase-e5r-e-omission-aware-content-plan-materialization.md'
];
const credentialLiteral = /(?:sk-[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|shpat_[A-Za-z0-9]{16,})/;
for (const file of controlledFiles) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  assert.equal(credentialLiteral.test(text), false, `Credential literal detected in ${file}.`);
}

console.log(JSON.stringify({
  status: 'passed',
  fixture: fixture.fixture_version,
  policy_version: POLICY_VERSION,
  effective_composition_version: EFFECTIVE_COMPOSITION_VERSION,
  materialization_revision: MATERIALIZATION_REVISION,
  schema_validation: '2/2 passed',
  exact_release_40_result: {
    stale_plan_reconciled: true,
    actionable_count: 0,
    blocked_count: 0,
    stage: result.stage,
    merchant_flow_eligible: flowEligibility.eligible
  },
  merchant_projection: publicCraftsmanship.state,
  forbidden_scope_check: 'passed',
  credential_literal_scan: `${controlledFiles.length}/${controlledFiles.length} passed`,
  api_model_calls: 0,
  shopify_theme_mutations: 0
}, null, 2));
