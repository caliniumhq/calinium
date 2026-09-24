'use strict';

function resolveResourceReferences(draft, approval) {
  const references = [];
  for (const asset of draft.required_assets.required || []) {
    references.push({
      reference_id: asset.asset_id,
      value: approval.asset_references[asset.asset_id],
      source: 'approval_asset_reference',
      field_refs: asset.field_refs
    });
  }
  for (const [referenceId, value] of Object.entries(approval.merchant_references || {})) {
    references.push({ reference_id: referenceId, value, source: 'approval_merchant_reference', field_refs: [] });
  }
  const seen = new Set();
  return references.filter((reference) => {
    if (seen.has(reference.reference_id)) return false;
    seen.add(reference.reference_id);
    return true;
  });
}

function approvedValue(setting, approval) {
  const value = approval.merchant_references?.[setting.setting_ref];
  if (value !== undefined) return { value, origin: 'approval' };
  return { value: setting.value, origin: 'draft' };
}

module.exports = { resolveResourceReferences, approvedValue };
