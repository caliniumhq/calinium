'use strict';

const POLICY_REVISION = 'theme-section-content-eligibility-v1';
const PRODUCT_PAGE_ROLE = 'product_page';
const TARGET_SECTION_IDS = new Set(['product-comparison', 'faq']);

function nonblank(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function orderedBlocks(sectionInstance) {
  const blocks = sectionInstance?.blocks && typeof sectionInstance.blocks === 'object' && !Array.isArray(sectionInstance.blocks)
    ? sectionInstance.blocks
    : {};
  const order = Array.isArray(sectionInstance?.block_order) ? sectionInstance.block_order : [];
  return order
    .filter((blockId) => typeof blockId === 'string' && Object.hasOwn(blocks, blockId))
    .map((blockId) => ({ block_id: blockId, ...blocks[blockId] }));
}

function trustedProductRuntimeValues(resourceSnapshot) {
  const resources = resourceSnapshot?.resources;
  if (!resources || typeof resources !== 'object' || Array.isArray(resources)) return new Set();
  return new Set(Object.values(resources)
    .filter((binding) => binding?.resource_type === 'shopify_product'
      && binding.approval_eligible === true
      && binding.availability_at_snapshot === 'available'
      && nonblank(binding.runtime_value))
    .map((binding) => binding.runtime_value));
}

function comparisonEligibility(sectionInstance, resourceSnapshot) {
  const blocks = orderedBlocks(sectionInstance);
  const productBlocks = blocks.filter((block) => block.type === 'product');
  const trustedValues = trustedProductRuntimeValues(resourceSnapshot);
  const configured = productBlocks.filter((block) => nonblank(block.settings?.product));
  const resolved = configured.filter((block) => trustedValues.has(block.settings.product));
  const unresolved = configured.filter((block) => !trustedValues.has(block.settings.product));
  const eligible = configured.length >= 2 && resolved.length >= 2 && unresolved.length === 0;
  return {
    policy_revision: POLICY_REVISION,
    target_section_id: 'product-comparison',
    eligible,
    reason_code: eligible
      ? 'comparison_eligible_resolved_products'
      : unresolved.length
        ? 'comparison_unresolved_product_references'
        : 'comparison_insufficient_resolved_products',
    counts: {
      ordered_blocks: blocks.length,
      product_blocks: productBlocks.length,
      configured_product_references: configured.length,
      resolved_product_references: resolved.length,
      unresolved_product_references: unresolved.length,
      blank_product_references: productBlocks.length - configured.length
    },
    ordered_eligible_block_ids: resolved.map((block) => block.block_id),
    unresolved_resource_status: {
      present: unresolved.length > 0,
      count: unresolved.length,
      trusted_snapshot_available: trustedValues.size > 0
    }
  };
}

function faqEligibility(sectionInstance) {
  const blocks = orderedBlocks(sectionInstance);
  const questionBlocks = blocks.filter((block) => block.type === 'question');
  const complete = questionBlocks.filter((block) => nonblank(block.settings?.question) && nonblank(block.settings?.answer));
  const eligible = complete.length >= 1;
  return {
    policy_revision: POLICY_REVISION,
    target_section_id: 'faq',
    eligible,
    reason_code: eligible ? 'faq_eligible_complete_items' : 'faq_no_complete_items',
    counts: {
      ordered_blocks: blocks.length,
      question_blocks: questionBlocks.length,
      complete_items: complete.length,
      incomplete_items: questionBlocks.length - complete.length
    },
    ordered_eligible_block_ids: complete.map((block) => block.block_id),
    unresolved_resource_status: {
      present: false,
      count: 0,
      trusted_snapshot_available: false
    }
  };
}

function evaluateSectionContentEligibility({ sectionId, sectionInstance, resourceSnapshot = null }) {
  if (sectionId === 'product-comparison') return comparisonEligibility(sectionInstance, resourceSnapshot);
  if (sectionId === 'faq') return faqEligibility(sectionInstance);
  return {
    policy_revision: POLICY_REVISION,
    target_section_id: sectionId,
    eligible: true,
    reason_code: 'section_not_targeted',
    counts: { ordered_blocks: orderedBlocks(sectionInstance).length },
    ordered_eligible_block_ids: [],
    unresolved_resource_status: { present: false, count: 0, trusted_snapshot_available: false }
  };
}

function sectionAdmissionDecision({ origin, pageRole, sectionId, sectionInstance, resourceSnapshot = null }) {
  if (origin !== 'generated') {
    return {
      admitted: true,
      policy_revision: POLICY_REVISION,
      target_section_id: sectionId,
      reason_code: 'merchant_preserved_instance',
      eligibility: null
    };
  }
  if (pageRole !== PRODUCT_PAGE_ROLE || !TARGET_SECTION_IDS.has(sectionId)) {
    return {
      admitted: true,
      policy_revision: POLICY_REVISION,
      target_section_id: sectionId,
      reason_code: 'outside_bounded_product_target',
      eligibility: null
    };
  }
  const eligibility = evaluateSectionContentEligibility({ sectionId, sectionInstance, resourceSnapshot });
  return {
    admitted: eligibility.eligible,
    policy_revision: POLICY_REVISION,
    target_section_id: sectionId,
    reason_code: eligibility.reason_code,
    eligibility
  };
}

function omissionWarning({ instanceId, decision }) {
  if (!decision || decision.admitted) return null;
  return `${decision.policy_revision}:${decision.target_section_id}:${instanceId}:omitted:${decision.reason_code}`;
}

module.exports = {
  POLICY_REVISION,
  PRODUCT_PAGE_ROLE,
  TARGET_SECTION_IDS,
  evaluateSectionContentEligibility,
  nonblank,
  omissionWarning,
  orderedBlocks,
  sectionAdmissionDecision,
  trustedProductRuntimeValues
};
