'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const {
  POLICY_VERSION,
  createEligibility,
  buildDecisionSet,
  resourceFlowEligibility,
  digest
} = require('../pipeline/resource-confirmation-eligibility');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/resource-confirmation-eligibility.json'), 'utf8'));
const validator = createSchemaValidator(root);
const at = '2026-08-20T00:00:00.000Z';

function inheritedCase(id) {
  const source = fixture.controlled_cases.find((item) => item.id === id);
  assert(source, `Missing controlled case ${id}.`);
  if (!source.inherits) return structuredClone(source);
  const parent = inheritedCase(source.inherits);
  return { ...parent, ...structuredClone(source), expected: { ...parent.expected, ...source.expected } };
}
function checkedEvidence(item) {
  const base = { ...item };
  return { ...base, checksum: digest({ source_type: base.source_type, source_identity: base.source_identity, source_revision: base.source_revision, extracted_value: base.extracted_value, derivation_revision: base.derivation_revision, confidence: base.confidence, verified_at: base.verified_at }) };
}
function evaluate(current) {
  const resourcePlan = { required_confirmations: current.contracts.map((item) => item.confirmation_id), confirmation_contracts: current.contracts, fields: [], required_assets: [] };
  const eligibility = createEligibility({ resourcePlan, storeStrategy: { homepage: { sections: current.active_sections } }, authoritativeEvidence: (current.evidence || []).map(checkedEvidence), at });
  const decisions = buildDecisionSet({ eligibility, completedConfirmations: current.merchant_confirmations || [], actorUserId: current.merchant_confirmations?.length ? 'usr_validator' : null, at });
  return { resourcePlan: { ...resourcePlan, confirmation_eligibility: eligibility }, eligibility, decisions };
}

assert.equal(fixture.policy_version, POLICY_VERSION);
assert.equal(fixture.authoritative_legacyexample_plan.required_confirmations.length, 25);
assert.equal(new Set(fixture.authoritative_legacyexample_plan.required_confirmations).size, 25);
assert.equal(fixture.controlled_cases.length, 8);

const legacyexample = fixture.authoritative_legacyexample_plan;
const legacyexampleEligibility = createEligibility({ resourcePlan: legacyexample, storeStrategy: legacyexample.effective_store_strategy, approvedPresetRevision: legacyexample.approved_preset_revision, at });
const legacyexampleDecisions = buildDecisionSet({ eligibility: legacyexampleEligibility, at });
assert.deepEqual(legacyexampleEligibility.summary.counts, legacyexample.expected.counts);
assert.equal(legacyexampleEligibility.summary.merchant_action_count, 0);
assert.deepEqual(legacyexampleEligibility.summary.omitted_section_ids, ['craftsmanship']);
assert.equal(legacyexampleDecisions.items.filter((item) => item.state === 'merchant_confirmed').length, 0);

const eligibilityErrors = validator.validateFile(legacyexampleEligibility, 'schemas/calinium-resource-confirmation-eligibility.schema.json', 'LEGACY_EXAMPLE eligibility');
const decisionErrors = validator.validateFile(legacyexampleDecisions, 'schemas/calinium-resource-confirmation-decisions.schema.json', 'LEGACY_EXAMPLE decisions');
assert.deepEqual(eligibilityErrors, []);
assert.deepEqual(decisionErrors, []);

for (const entry of fixture.controlled_cases) {
  const current = inheritedCase(entry.id);
  const result = evaluate(current);
  assert.deepEqual(validator.validateFile(result.eligibility, 'schemas/calinium-resource-confirmation-eligibility.schema.json', `${entry.id} eligibility`), []);
  assert.deepEqual(validator.validateFile(result.decisions, 'schemas/calinium-resource-confirmation-decisions.schema.json', `${entry.id} decisions`), []);
}

const verifiable = evaluate(inheritedCase('all_items_verifiable'));
assert.equal(verifiable.eligibility.items[0].classification, 'auto_verifiable');
assert.equal(resourceFlowEligibility(verifiable.resourcePlan, { status: 'ready_for_generation', approval_reference: 'fixture', approved_at: at, merchant_references: {}, asset_references: {}, resolved_empty_fields: [], resource_confirmation_decisions: verifiable.decisions }).eligible, true);
const optional = evaluate(inheritedCase('optional_content_unavailable'));
assert.equal(optional.decisions.items[0].state, 'omitted_by_policy');
const required = evaluate(inheritedCase('one_material_fact_unknown'));
assert.equal(required.eligibility.summary.merchant_action_count, 1);
const confirmed = evaluate(inheritedCase('merchant_confirms_one'));
assert.equal(confirmed.decisions.items[0].state, 'merchant_confirmed');
const critical = evaluate(inheritedCase('critical_commercial_fact_unknown'));
assert.equal(critical.eligibility.items[0].classification, 'critical_confirmation_required');

const forbiddenChanges = ['apps/theme/', 'ai/architecture/', 'config/architecture-', 'apps/dashboard/server/billing/', 'deployment/'];
const { execFileSync } = require('child_process');
const changed = [
  ...execFileSync('git', ['diff', '--name-only'], { cwd: root, encoding: 'utf8' }).trim().split('\n'),
  ...execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n')
].filter(Boolean);
assert.equal(changed.some((file) => forbiddenChanges.some((prefix) => file.startsWith(prefix))), false, 'E5R-D changed a forbidden source area.');

console.log(JSON.stringify({
  status: 'passed',
  policy_version: POLICY_VERSION,
  exact_inventory: legacyexampleEligibility.summary,
  controlled_fixtures: fixture.controlled_cases.map((item) => item.id),
  schema_validation: 'passed',
  forbidden_scope_check: 'passed'
}, null, 2));
