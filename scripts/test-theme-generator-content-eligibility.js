#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  POLICY_REVISION,
  evaluateSectionContentEligibility,
  omissionWarning,
  sectionAdmissionDecision
} = require('../ai/theme-generator/section-content-eligibility');
const { generateSectionInstances } = require('../ai/theme-generator/generate-section-instances');
const { loadGeneratorMappings } = require('../ai/theme-generator/load-mappings');
const { sameSnapshot, sourceSnapshot } = require('../ai/theme-generator/utils');

const root = path.resolve(__dirname, '..');
const fixturePath = path.join(root, 'fixtures/theme-generator-content-eligibility.json');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function loadFixture() { return JSON.parse(fs.readFileSync(fixturePath, 'utf8')); }

function expectedComparison(result, expected) {
  assert.equal(result.eligible, expected.eligible);
  assert.equal(result.reason_code, expected.reason_code);
  assert.equal(result.counts.configured_product_references, expected.configured);
  assert.equal(result.counts.resolved_product_references, expected.resolved);
  assert.equal(result.counts.unresolved_product_references, expected.unresolved);
  assert.deepStrictEqual(result.ordered_eligible_block_ids, expected.ordered_eligible_block_ids);
}

function expectedFaq(result, expected) {
  assert.equal(result.eligible, expected.eligible);
  assert.equal(result.reason_code, expected.reason_code);
  assert.equal(result.counts.complete_items, expected.complete);
}

function plannedSection(sectionId, position) {
  return {
    instance_id: `product-${String(position).padStart(2, '0')}-${sectionId}`,
    section_id: sectionId,
    position,
    mapped_settings: [],
    validation_status: 'valid',
    explanation: {
      source_mapping: 'page_blueprint.product',
      compiler_decision: 'blueprint',
      reasoning: 'D3C-B controlled generated-section admission fixture.',
      confidence: 'high'
    }
  };
}

function run() {
  const fixture = loadFixture();
  assert.equal(fixture.schema_version, '1.0');
  assert.equal(fixture.fixture_revision, 'theme-generator-content-eligibility-fixture-v1');
  assert.equal(fixture.policy_revision, POLICY_REVISION);
  const snapshot = fixture.trusted_resource_snapshot;
  const comparisons = new Map(fixture.comparison_cases.map((item) => [item.case_id, item]));
  const faqs = new Map(fixture.faq_cases.map((item) => [item.case_id, item]));
  const beforeSource = sourceSnapshot(root);

  for (const item of fixture.comparison_cases) {
    const input = clone(item.section_instance);
    const before = clone(input);
    const first = evaluateSectionContentEligibility({ sectionId: 'product-comparison', sectionInstance: input, resourceSnapshot: snapshot });
    const second = evaluateSectionContentEligibility({ sectionId: 'product-comparison', sectionInstance: input, resourceSnapshot: snapshot });
    expectedComparison(first, item.expected);
    assert.deepStrictEqual(first, second, `${item.case_id} is not deterministic.`);
    assert.deepStrictEqual(input, before, `${item.case_id} mutated its input.`);
  }

  for (const item of fixture.faq_cases) {
    const input = clone(item.section_instance);
    const before = clone(input);
    const first = evaluateSectionContentEligibility({ sectionId: 'faq', sectionInstance: input, resourceSnapshot: snapshot });
    const second = evaluateSectionContentEligibility({ sectionId: 'faq', sectionInstance: input, resourceSnapshot: snapshot });
    expectedFaq(first, item.expected);
    assert.deepStrictEqual(first, second, `${item.case_id} is not deterministic.`);
    assert.deepStrictEqual(input, before, `${item.case_id} mutated its input.`);
  }

  const positiveComparison = comparisons.get('comparison_two_resolved_products_ordered');
  const noSnapshot = evaluateSectionContentEligibility({ sectionId: 'product-comparison', sectionInstance: positiveComparison.section_instance });
  assert.equal(noSnapshot.eligible, false);
  assert.equal(noSnapshot.reason_code, 'comparison_unresolved_product_references');
  assert.equal(noSnapshot.counts.unresolved_product_references, 2);

  const untrustedSnapshot = clone(snapshot);
  untrustedSnapshot.resources.abprs_comparison_product_two.approval_eligible = false;
  const untrusted = evaluateSectionContentEligibility({ sectionId: 'product-comparison', sectionInstance: positiveComparison.section_instance, resourceSnapshot: untrustedSnapshot });
  assert.equal(untrusted.eligible, false);
  assert.equal(untrusted.reason_code, 'comparison_unresolved_product_references');
  assert.equal(untrusted.counts.resolved_product_references, 1);

  for (const scenario of fixture.mixed_scenarios) {
    const comparison = comparisons.get(scenario.comparison_case);
    const faq = faqs.get(scenario.faq_case);
    assert.ok(comparison && faq, `${scenario.scenario_id} references an unknown case.`);
    const comparisonDecision = sectionAdmissionDecision({
      origin: 'generated', pageRole: 'product_page', sectionId: 'product-comparison',
      sectionInstance: comparison.section_instance, resourceSnapshot: snapshot
    });
    const faqDecision = sectionAdmissionDecision({
      origin: 'generated', pageRole: 'product_page', sectionId: 'faq',
      sectionInstance: faq.section_instance, resourceSnapshot: snapshot
    });
    assert.equal(comparisonDecision.admitted, scenario.expected.comparison_admitted, `${scenario.scenario_id} comparison admission differs.`);
    assert.equal(faqDecision.admitted, scenario.expected.faq_admitted, `${scenario.scenario_id} FAQ admission differs.`);
  }

  const preservedComparison = sectionAdmissionDecision({
    origin: 'preserved', pageRole: 'product_page', sectionId: 'product-comparison',
    sectionInstance: comparisons.get('comparison_zero_blocks').section_instance, resourceSnapshot: snapshot
  });
  const preservedFaq = sectionAdmissionDecision({
    origin: 'preserved', pageRole: 'product_page', sectionId: 'faq',
    sectionInstance: faqs.get('faq_zero_blocks').section_instance, resourceSnapshot: snapshot
  });
  assert.equal(preservedComparison.admitted, true);
  assert.equal(preservedFaq.admitted, true);
  assert.equal(preservedComparison.reason_code, 'merchant_preserved_instance');
  assert.equal(preservedFaq.reason_code, 'merchant_preserved_instance');
  assert.equal(preservedComparison.eligibility, null);
  assert.equal(preservedFaq.eligibility, null);

  const homepageFaq = sectionAdmissionDecision({
    origin: 'generated', pageRole: 'homepage', sectionId: 'faq',
    sectionInstance: faqs.get('faq_zero_blocks').section_instance, resourceSnapshot: snapshot
  });
  const unrelatedProductSection = sectionAdmissionDecision({
    origin: 'generated', pageRole: 'product_page', sectionId: 'product-highlights',
    sectionInstance: { instance_id: 'unrelated', type: 'product-highlights', settings: {} }, resourceSnapshot: snapshot
  });
  assert.equal(homepageFaq.admitted, true);
  assert.equal(unrelatedProductSection.admitted, true);
  assert.equal(homepageFaq.reason_code, 'outside_bounded_product_target');
  assert.equal(unrelatedProductSection.reason_code, 'outside_bounded_product_target');

  const negativeDecision = sectionAdmissionDecision({
    origin: 'generated', pageRole: 'product_page', sectionId: 'product-comparison',
    sectionInstance: comparisons.get('comparison_zero_blocks').section_instance, resourceSnapshot: snapshot
  });
  assert.equal(
    omissionWarning({ instanceId: 'calinium_product_03_product_comparison', decision: negativeDecision }),
    'theme-section-content-eligibility-v1:product-comparison:calinium_product_03_product_comparison:omitted:comparison_insufficient_resolved_products'
  );
  assert.equal(omissionWarning({ instanceId: 'unused', decision: preservedComparison }), null);

  const positiveBefore = clone(positiveComparison.section_instance);
  const positiveDecision = sectionAdmissionDecision({
    origin: 'generated', pageRole: 'product_page', sectionId: 'product-comparison',
    sectionInstance: positiveComparison.section_instance, resourceSnapshot: snapshot
  });
  assert.equal(positiveDecision.admitted, true);
  assert.deepStrictEqual(positiveDecision.eligibility.ordered_eligible_block_ids, ['product_two', 'product_one']);
  assert.deepStrictEqual(positiveComparison.section_instance, positiveBefore, 'Eligible comparison configuration was rewritten or reordered.');
  assert.equal(omissionWarning({ instanceId: positiveComparison.section_instance.instance_id, decision: positiveDecision }), null);

  const positiveFaq = faqs.get('faq_one_complete_item');
  const positiveFaqBefore = clone(positiveFaq.section_instance);
  const positiveFaqDecision = sectionAdmissionDecision({
    origin: 'generated', pageRole: 'product_page', sectionId: 'faq',
    sectionInstance: positiveFaq.section_instance, resourceSnapshot: snapshot
  });
  assert.equal(positiveFaqDecision.admitted, true);
  assert.deepStrictEqual(positiveFaqDecision.eligibility.ordered_eligible_block_ids, ['question_one']);
  assert.deepStrictEqual(positiveFaq.section_instance, positiveFaqBefore, 'Eligible FAQ configuration was rewritten or reordered.');
  assert.equal(omissionWarning({ instanceId: positiveFaq.section_instance.instance_id, decision: positiveFaqDecision }), null);

  const generated = generateSectionInstances({
    root,
    templatePath: 'theme/templates/product.json',
    sourceTemplatePath: 'templates/product.json',
    pagePlan: {
      sections: [
        plannedSection('product-highlights', 2),
        plannedSection('product-comparison', 3),
        plannedSection('faq', 6)
      ]
    },
    approval: {
      approval_reference: 'd3c-b-content-eligibility-test',
      merchant_references: {},
      completed_confirmations: []
    },
    mappings: loadGeneratorMappings(root),
    pageRole: 'product_page',
    approvedBlockPlan: null,
    approvedBlockPlanResourceSnapshot: null
  });
  const generatedIds = generated.instances.map((instance) => instance.section_id);
  assert.deepStrictEqual(generatedIds, ['product-highlights']);
  assert.ok(!Object.values(generated.template.sections).some((section) => section.type === 'product-comparison' || section.type === 'faq'));
  assert.ok(!generated.template.order.some((instanceId) => /product_comparison|faq/.test(instanceId)));
  assert.ok(generated.warnings.includes('theme-section-content-eligibility-v1:product-comparison:calinium_product_03_product_comparison:omitted:comparison_insufficient_resolved_products'));
  assert.ok(generated.warnings.includes('theme-section-content-eligibility-v1:faq:calinium_product_06_faq:omitted:faq_no_complete_items'));
  assert.deepStrictEqual(generated.omissions.map((item) => item.reason), ['comparison_insufficient_resolved_products', 'faq_no_complete_items']);

  assert.ok(sameSnapshot(beforeSource, sourceSnapshot(root)), 'Content eligibility tests changed storefront source.');
  return {
    comparison_cases: fixture.comparison_cases.length,
    faq_cases: fixture.faq_cases.length,
    mixed_scenarios: fixture.mixed_scenarios.length,
    generated_warnings: generated.warnings.length
  };
}

if (require.main === module) {
  try {
    const result = run();
    console.log(`Theme Generator content-eligibility tests passed: comparison=${result.comparison_cases}/5; FAQ=${result.faq_cases}/6; mixed=${result.mixed_scenarios}/4; negative-integration=passed; trusted-resolution=passed; preserved-origin=passed; source-immutability=passed.`);
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

module.exports = { run };
