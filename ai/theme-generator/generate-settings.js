'use strict';

const { clone, readShopifyJson, traceFrom, sourcePath } = require('./utils');
const { approvedValue } = require('./resolve-resource-references');

function accepted(setting, value) {
  const acceptedValues = setting.accepted_values || {};
  if (acceptedValues.kind === 'boolean') return typeof value === 'boolean';
  if (acceptedValues.kind === 'options') return acceptedValues.values.includes(value);
  if (acceptedValues.kind === 'range') return typeof value === 'number' && value >= acceptedValues.minimum && value <= acceptedValues.maximum && ((value - acceptedValues.minimum) % acceptedValues.step === 0);
  return true;
}

function generateSettings({ root, draft, approval, mappings }) {
  const baseline = clone(readShopifyJson(sourcePath(root, 'config/settings_data.json')));
  const current = baseline.current || (baseline.current = {});
  const changes = [];
  for (const category of ['typography', 'spacing', 'colors', 'motion', 'layout']) {
    for (const planned of draft.global_theme_configuration[category] || []) {
      if (planned.status !== 'proposed') continue;
      const capability = mappings.index.global_settings.get(planned.setting_id);
      if (!capability) throw new Error(`Draft references unknown global setting ${planned.setting_id}.`);
      const explicitlyApproved = Object.hasOwn(approval.merchant_references || {}, planned.setting_ref)
        && approval.completed_confirmations.includes(`field:${planned.setting_ref}`);
      if ((!capability.ai_configurable || capability.merchant_only || capability.merchant_review_required) && !explicitlyApproved) continue;
      const resolved = approvedValue(planned, approval);
      if (!accepted(capability, resolved.value)) throw new Error(`Global setting ${planned.setting_id} has a value outside its documented accepted values.`);
      if (current[planned.setting_id] !== resolved.value) {
        current[planned.setting_id] = resolved.value;
        changes.push({
          setting_id: planned.setting_id,
          value: resolved.value,
          origin: resolved.origin,
          trace: traceFrom(planned.explanation, approval.approval_reference, planned.setting_ref)
        });
      }
    }
  }
  return { settingsData: baseline, changes };
}

module.exports = { generateSettings, accepted };
