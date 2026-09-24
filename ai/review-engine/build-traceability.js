'use strict';

function firstTrace(manifest) {
  return manifest.generated_section_instances[0]?.trace || manifest.generated_settings[0]?.trace || manifest.generated_files[0]?.trace;
}

function buildTraceability(manifest) {
  const mappings = new Set();
  for (const item of [...manifest.generated_section_instances, ...manifest.generated_settings, ...manifest.merchant_references]) {
    if (item.trace?.source_mapping) mappings.add(item.trace.source_mapping);
  }
  return {
    strategy: { version: manifest.source_strategy_version, source: 'generated-theme.manifest.source_strategy_version' },
    draft: { version: manifest.draft_version, source: 'generated-theme.manifest.draft_version' },
    mapping_references: [...mappings].sort(),
    generated_theme: { generation_id: manifest.generation_id, source: 'manifests/generated-theme.json' }
  };
}

function requiredReviewItems(manifest) {
  const trace = firstTrace(manifest);
  const items = [
    ['generated-configuration', 'Generated configuration', 'Confirm the generated configuration remains schema-valid and isolated.'],
    ['change-scope', 'Change scope', 'Confirm the proposed change manifest and diff are acceptable.'],
    ['source-backup', 'Source backup', 'Confirm the generated workspace contains a validated source-runtime backup.'],
    ['merchant-references', 'Merchant references', 'Confirm every merchant resource reference is authorized and correctly preserved.']
  ];
  if (manifest.unsupported_items.length) items.push(['unsupported-items', 'Unsupported items', 'Acknowledge unsupported items before the configuration is eligible for deployment.']);
  return items.map(([id, label, reasoning]) => ({ id, label, required: true, reasoning, trace })).sort((left, right) => left.id.localeCompare(right.id));
}

module.exports = { buildTraceability, requiredReviewItems };
