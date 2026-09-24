'use strict';

const { createSchemaValidator } = require('../compiler/schema-validator');

function validateApprovedDraft(draft, approval, root) {
  const validator = createSchemaValidator(root);
  const errors = [
    ...validator.validateFile(draft, 'schemas/calinium-draft-configuration.schema.json', 'draft'),
    ...validator.validateFile(approval, 'schemas/calinium-generation-approval.schema.json', 'approval')
  ];
  if (draft?.validation_report?.valid !== true) errors.push('Draft validation_report.valid must be true.');
  if (draft?.draft_readiness?.status !== 'Ready') errors.push('Draft readiness must be Ready.');
  if ((draft?.blocked_fields || []).length) errors.push('Draft has remaining blocked fields.');
  if (Object.values(draft?.merchant_input_requirements || {}).some((items) => items.length)) errors.push('Draft has unresolved merchant input requirements.');
  if ((draft?.required_assets?.missing || []).length) errors.push('Draft has missing required assets.');
  if ((draft?.merchant_review_queue || []).length) errors.push('Draft has incomplete merchant review items.');
  if (!approval?.approved) errors.push('A positive approval object is required.');
  if (approval?.draft_version !== draft?.version) errors.push('Approval draft version does not match the draft.');
  const requiredAssets = draft?.required_assets?.required || [];
  for (const asset of requiredAssets) {
    if (!approval?.asset_references?.[asset.asset_id]) errors.push(`Approval is missing the required merchant asset reference ${asset.asset_id}.`);
  }
  const requiredConfirmations = [draft?.homepage_plan, ...(draft?.other_pages || [])]
    .flatMap((page) => page?.sections || [])
    .flatMap((section) => section.merchant_confirmations || []);
  for (const confirmation of requiredConfirmations) {
    if (!approval?.completed_confirmations?.includes(confirmation)) errors.push(`Approval is missing the required merchant confirmation ${confirmation}.`);
  }
  if (errors.length) {
    const error = new Error(`Generation approval gate failed: ${errors.join(' ')}`);
    error.validation = { valid: false, errors, warnings: [] };
    throw error;
  }
  return { valid: true, errors: [], warnings: [] };
}

module.exports = { validateApprovedDraft };
