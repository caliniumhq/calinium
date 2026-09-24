'use strict';

const { explanation, decisionConfidence } = require('./utils');
const { resolveSectionSettings } = require('./resolve-settings');

function sourceMappingFor(sectionId, mapping) {
  const entry = mapping?.sections.find((section) => section.section_id === sectionId);
  if (!entry) throw new Error(`Section ${sectionId} is not present in required mapping ${mapping?.mapping_id || '(missing)'}.`);
  return entry;
}

function stableInstanceId(pageId, position, sectionId) {
  return `${pageId}-${String(position).padStart(2, '0')}-${sectionId}`;
}

function resolveSectionPlan({ pageId, position, sectionId, mapping, strategy, mappings }) {
  const sectionCapability = mappings.index.sections.get(sectionId);
  if (!sectionCapability) throw new Error(`Section ${sectionId} is not installed in theme-section-capabilities.json.`);
  const mappingSection = sourceMappingFor(sectionId, mapping);
  const settings = resolveSectionSettings(sectionCapability, strategy, mappings);
  return {
    instance_id: stableInstanceId(pageId, position, sectionId),
    section_id: sectionId,
    position,
    source_mapping: mapping.mapping_id,
    mapped_settings: settings.mapped_settings,
    unresolved_merchant_fields: settings.unresolved_merchant_fields,
    required_assets: [],
    merchant_confirmations: [],
    fallback_layout: {
      selected: 'schema_default_with_unconfigured_merchant_fields',
      reasoning: mappingSection.fallback_section
        ? `The mapping provides ${mappingSection.fallback_section} as a future fallback; until merchant-only input is supplied, preserve this section’s schema default layout.`
        : 'Preserve the installed section’s schema default layout and safe empty state until merchant input is supplied.'
    },
    validation_status: 'valid',
    explanation: explanation({
      sourceCatalogs: ['config/theme-section-capabilities.json', 'config/strategy-section-mapping.json'],
      sourceMapping: mapping.mapping_id,
      compilerDecision: pageId === 'homepage' ? 'section_ordering' : 'blueprint',
      confidence: decisionConfidence(strategy, pageId === 'homepage' ? 'section_ordering' : 'blueprint'),
      reasoning: `${sectionId} is planned at position ${position} only because it is present in the approved ${mapping.mapping_id} mapping.`,
      fallbackUsed: 'schema_default_with_unconfigured_merchant_fields'
    })
  };
}

function resolveMappedSections({ pageId, sectionIds, mapping, strategy, mappings }) {
  const seen = new Set();
  return sectionIds.map((sectionId, index) => {
    if (seen.has(sectionId)) throw new Error(`${pageId} mapping contains duplicate section ${sectionId}.`);
    seen.add(sectionId);
    return resolveSectionPlan({ pageId, position: index + 1, sectionId, mapping, strategy, mappings });
  });
}

module.exports = { resolveMappedSections, resolveSectionPlan, stableInstanceId };
