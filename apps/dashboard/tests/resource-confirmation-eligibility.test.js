import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = path.resolve(process.cwd(), '../..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/resource-confirmation-eligibility.json'), 'utf8'));
const {
  POLICY_VERSION,
  createEligibility,
  applyResourceConfirmationEligibility,
  buildDecisionSet,
  effectiveResourcePlan,
  confirmationBlockers,
  resourceFlowEligibility,
  validAuthoritativeEvidence
} = require('../../../pipeline/resource-confirmation-eligibility');
const { scopeDraftToApprovedResourcePlan } = require('../../../pipeline/resolve-approved-draft');
const { resourcePlanSelectionBlockers } = require('../server/services/creative-director-service.cjs');
const { createDashboardServices } = require('../server/dashboard-services.cjs');

const at = '2026-08-20T00:00:00.000Z';

function caseById(id) {
  const source = fixture.controlled_cases.find((entry) => entry.id === id);
  if (!source?.inherits) return structuredClone(source);
  return { ...caseById(source.inherits), ...structuredClone(source), expected: { ...caseById(source.inherits).expected, ...source.expected } };
}
function evidenceWithChecksum(item) {
  const base = { ...item };
  const { digest } = require('../../../pipeline/resource-confirmation-eligibility');
  return { ...base, checksum: digest({ source_type: base.source_type, source_identity: base.source_identity, source_revision: base.source_revision, extracted_value: base.extracted_value, derivation_revision: base.derivation_revision, confidence: base.confidence, verified_at: base.verified_at }) };
}
function evaluateCase(id, overrides = {}) {
  const current = caseById(id);
  const resourcePlan = { status: 'ready', fields: [], groups: [], required_assets: [], required_confirmations: current.contracts.map((item) => item.confirmation_id), confirmation_contracts: current.contracts };
  const storeStrategy = { homepage: { sections: current.active_sections } };
  const evidence = (current.evidence || []).map(evidenceWithChecksum);
  const eligibility = createEligibility({ resourcePlan, storeStrategy, authoritativeEvidence: overrides.evidence || evidence, existingEligibility: overrides.existingEligibility || null, at });
  const completed = overrides.completedConfirmations || current.merchant_confirmations || [];
  const decisions = buildDecisionSet({ eligibility, completedConfirmations: completed, previous: overrides.previous || null, actorUserId: completed.length ? 'usr_fixture' : null, at });
  return { current, resourcePlan: { ...resourcePlan, confirmation_eligibility: eligibility }, eligibility, decisions };
}

describe('E5R-D resource-confirmation eligibility policy', () => {
  it('classifies the exact 25-item release-39 LEGACY_EXAMPLE resource-plan regression', () => {
    const source = fixture.authoritative_legacyexample_plan;
    const applied = applyResourceConfirmationEligibility({ resourcePlan: source, storeStrategy: source.effective_store_strategy, approvedPresetRevision: source.approved_preset_revision, at });
    expect(source.required_confirmations).toHaveLength(25);
    expect(applied.eligibility.policy_version).toBe(POLICY_VERSION);
    expect(applied.eligibility.summary.counts).toEqual(source.expected.counts);
    expect(applied.eligibility.summary.merchant_action_count).toBe(0);
    expect(applied.eligibility.summary.omitted_section_ids).toEqual(['craftsmanship']);
  });

  it('auto-verifies only checksum-valid authoritative evidence and retains its provenance', () => {
    const result = evaluateCase('all_items_verifiable');
    expect(result.eligibility.items[0]).toMatchObject({ classification: 'auto_verifiable', policy_state: 'verified_automatically' });
    expect(result.eligibility.items[0].authoritative_provenance).toMatchObject({ source_type: 'shopify_store_intelligence', confidence: 1 });
    expect(validAuthoritativeEvidence(result.eligibility.items[0].authoritative_provenance)).toBe(true);
    expect(result.decisions.items[0].state).toBe('verified_automatically');
  });

  it('rejects unsupported or low-confidence evidence instead of silently confirming it', () => {
    const current = caseById('unsupported_content');
    const forged = evidenceWithChecksum({ confirmation_id: current.contracts[0].confirmation_id, source_type: 'inference', source_identity: 'guess', source_revision: 'untrusted', extracted_value: 'two weeks', derivation_revision: 'resource-confirmation-derivation-v1', confidence: 0.6, verified_at: at });
    const result = evaluateCase('unsupported_content', { evidence: [forged] });
    expect(result.eligibility.items[0].classification).toBe('merchant_confirmation_required');
    expect(result.decisions.items[0].state).toBe('awaiting_confirmation');
    expect(JSON.stringify(result.decisions)).not.toContain('merchant_confirmed');
  });

  it('omits optional unsupported content without marking it confirmed', () => {
    const result = evaluateCase('optional_content_unavailable');
    expect(result.eligibility.items[0]).toMatchObject({ classification: 'optional_omittable', policy_state: 'omitted_by_policy' });
    expect(result.decisions.items[0]).toMatchObject({ state: 'omitted_by_policy', actor: { type: 'system', user_id: null } });
    expect(result.decisions.items[0].state).not.toBe('merchant_confirmed');
    expect(confirmationBlockers(result.resourcePlan, result.decisions)).toEqual([]);
  });

  it('keeps a material unknown merchant fact explicit and blocking', () => {
    const result = evaluateCase('one_material_fact_unknown');
    expect(result.eligibility.items[0]).toMatchObject({ classification: 'merchant_confirmation_required', merchant_state_copy: 'Needs your confirmation' });
    expect(confirmationBlockers(result.resourcePlan, result.decisions)).toHaveLength(1);
  });

  it('keeps an unknown legal or commercial guarantee critical and blocking', () => {
    const result = evaluateCase('critical_commercial_fact_unknown');
    expect(result.eligibility.items[0]).toMatchObject({ classification: 'critical_confirmation_required', merchant_state_copy: 'Required before continuing' });
    expect(confirmationBlockers(result.resourcePlan, result.decisions)).toHaveLength(1);
  });

  it('fails closed for an unresolved resource contract', () => {
    const resourcePlan = { required_confirmations: ['unknown.contract'] };
    const eligibility = createEligibility({ resourcePlan, storeStrategy: { homepage: { sections: [] } }, at });
    const decisions = buildDecisionSet({ eligibility, at });
    expect(eligibility.items[0].classification).toBe('unresolved_review_required');
    expect(confirmationBlockers({ ...resourcePlan, confirmation_eligibility: eligibility }, decisions)).toHaveLength(1);
  });

  it('shows only the material required item in a mixed plan', () => {
    const result = evaluateCase('mixed_plan');
    expect(result.eligibility.summary.counts).toMatchObject(result.current.expected.counts);
    expect(result.eligibility.summary.merchant_action_count).toBe(1);
    expect(confirmationBlockers(result.resourcePlan, result.decisions).map((item) => item.confirmation_id)).toEqual(['operations.lead_time']);
  });

  it('reuses classification and decision revisions across reload and retry', () => {
    const first = evaluateCase('mixed_plan');
    const second = evaluateCase('mixed_plan', { existingEligibility: first.eligibility, previous: first.decisions });
    expect(second.eligibility).toEqual(first.eligibility);
    expect(second.decisions).toEqual(first.decisions);
  });

  it('records one merchant confirmation as one authoritative child decision revision', () => {
    const pending = evaluateCase('one_material_fact_unknown');
    const confirmed = evaluateCase('merchant_confirms_one', { previous: pending.decisions });
    expect(confirmed.decisions.items[0]).toMatchObject({ state: 'merchant_confirmed', actor: { type: 'merchant', user_id: 'usr_fixture' } });
    expect(confirmed.decisions.revision_id).not.toBe(pending.decisions.revision_id);
    const retried = evaluateCase('merchant_confirms_one', { previous: confirmed.decisions });
    expect(retried.decisions).toEqual(confirmed.decisions);
  });

  it('removes policy-omitted sections and fields from the effective resource contract', () => {
    const source = fixture.authoritative_legacyexample_plan;
    const applied = applyResourceConfirmationEligibility({ resourcePlan: source, storeStrategy: source.effective_store_strategy, approvedPresetRevision: source.approved_preset_revision, at });
    const effective = effectiveResourcePlan(applied.resourcePlan);
    expect(effective.fields.some((field) => field.section_id === 'craftsmanship')).toBe(false);
    expect(effective.fields.some((field) => field.setting_ref === 'full-screen-hero.badge')).toBe(false);
    expect(effective.fields.some((field) => field.setting_ref === 'full-screen-hero.image')).toBe(true);
  });

  it('excludes omitted modules and unsupported raw claims from generated composition scope', () => {
    const source = fixture.authoritative_legacyexample_plan;
    const resourcePlan = applyResourceConfirmationEligibility({ resourcePlan: source, storeStrategy: source.effective_store_strategy, approvedPresetRevision: source.approved_preset_revision, at }).resourcePlan;
    const section = (section_id, fields = [], confirmations = []) => ({ section_id, instance_id: `homepage-${section_id}`, unresolved_merchant_fields: fields, merchant_confirmations: confirmations, mapped_settings: [] });
    const draft = {
      homepage_plan: { page_id: 'homepage', sections: [
        section('full-screen-hero', [
          { setting_ref: 'full-screen-hero.image', section_id: 'full-screen-hero' },
          { setting_ref: 'full-screen-hero.collection', section_id: 'full-screen-hero' },
          { setting_ref: 'full-screen-hero.product', section_id: 'full-screen-hero' }
        ], ['review:review:full-screen-hero.badge']),
        section('craftsmanship', [{ setting_ref: 'craftsmanship.image', section_id: 'craftsmanship' }], ['artisan_claims']),
        section('featured-collection', [{ setting_ref: 'featured-collection.collection', section_id: 'featured-collection' }]),
        section('newsletter')
      ] },
      other_pages: [], global_theme_configuration: {}, required_assets: { required: [{ asset_id: 'hero_image', field_refs: ['full-screen-hero.image'] }], missing: [] }, merchant_input_requirements: {}, merchant_review_queue: [], blocked_fields: [], summary: {}
    };
    const scoped = scopeDraftToApprovedResourcePlan({ draft, resourcePlan, storeStrategy: source.effective_store_strategy, review: {} });
    expect(scoped.errors).toEqual([]);
    expect(scoped.draft.homepage_plan.sections.map((item) => item.section_id)).not.toContain('craftsmanship');
    expect(scoped.draft.homepage_plan.sections.find((item) => item.section_id === 'full-screen-hero').merchant_confirmations).toEqual([]);
    expect(JSON.stringify(scoped.draft)).not.toMatch(/artisan_claims|review:review/);
  });

  it('makes the exact LEGACY_EXAMPLE plan flow-eligible after ordinary resource approval with zero factual confirmations', () => {
    const source = fixture.authoritative_legacyexample_plan;
    const resourcePlan = applyResourceConfirmationEligibility({ resourcePlan: source, storeStrategy: source.effective_store_strategy, approvedPresetRevision: source.approved_preset_revision, at }).resourcePlan;
    const decisions = buildDecisionSet({ eligibility: resourcePlan.confirmation_eligibility, completedConfirmations: [], at });
    const generation = { ...source.saved_generation_context, status: 'ready_for_generation', approval_reference: 'resource-policy-approved-fixture', approved_at: at, resource_confirmation_decisions: decisions };
    expect(resourceFlowEligibility(resourcePlan, generation)).toMatchObject({ eligible: true, confirmation_blockers: [] });
    expect(generation.completed_confirmations.some((item) => !item.startsWith('field:'))).toBe(false);
  });

  it('keeps Store Intelligence and Merchant Intent separate from resource decisions', () => {
    const result = evaluateCase('mixed_plan');
    expect(result.decisions).not.toHaveProperty('store_intelligence');
    expect(result.decisions).not.toHaveProperty('merchant_intent');
    expect(JSON.stringify(result.decisions)).not.toMatch(/shopping_mode|architecture/);
  });

  it('feeds the Creative Director blocker contract from classifications rather than the legacy flat list', () => {
    const source = fixture.authoritative_legacyexample_plan;
    const resourcePlan = applyResourceConfirmationEligibility({ resourcePlan: source, storeStrategy: source.effective_store_strategy, approvedPresetRevision: source.approved_preset_revision, at }).resourcePlan;
    const decisions = buildDecisionSet({ eligibility: resourcePlan.confirmation_eligibility, at });
    const generation = { ...source.saved_generation_context, resource_confirmation_decisions: decisions };
    expect(resourcePlanSelectionBlockers(resourcePlan, generation)).toEqual([]);
  });

  it('rejects stale decision checksums and converges concurrent confirmation attempts', async () => {
    const database = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-e5rd-')), 'dashboard.sqlite');
    const services = await createDashboardServices({ root, env: { CALINIUM_SQLITE_PATH: database } });
    const registered = await services.auth.register({ email: 'e5rd@example.com', password: 'correct-horse-battery-staple', fullName: 'E5R-D', organizationName: 'E5R-D', ipAddress: '127.0.0.1' });
    const project = (await services.projects.createProject({ userId: registered.user.id, input: { name: 'Eligibility', business_name: 'Eligibility', country: 'US' } })).project;
    const started = await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
    const evaluated = evaluateCase('one_material_fact_unknown');
    await services.store.updateCreativeDirector(project.id, {
      ...started.session,
      stage: 'resources',
      creative_brief: { version: '1.0' },
      store_strategy: { version: '1.0', homepage: { sections: ['product-main'] } },
      resource_plan: evaluated.resourcePlan,
      generation_context: { status: 'awaiting_configuration', approval_reference: null, approved_at: null, merchant_references: {}, shopify_resource_references: {}, asset_references: {}, completed_confirmations: [], resolved_empty_fields: [], resource_confirmation_decisions: evaluated.decisions }
    });
    await expect(services.creativeDirector.updateResources({ userId: registered.user.id, projectId: project.id, confirmedRequiredConfirmations: ['operations.lead_time'], expectedResourceDecisionChecksum: 'f'.repeat(64) })).rejects.toMatchObject({ code: 'resource_confirmation_stale', status: 409 });
    const request = { userId: registered.user.id, projectId: project.id, confirmedRequiredConfirmations: ['operations.lead_time'], expectedResourceDecisionChecksum: evaluated.decisions.checksum };
    const results = await Promise.allSettled([services.creativeDirector.updateResources(request), services.creativeDirector.updateResources(request)]);
    expect(results.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((entry) => entry.status === 'rejected')).toHaveLength(1);
    await services.close();
  });
});
