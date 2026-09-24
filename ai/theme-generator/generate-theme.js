'use strict';

const crypto = require('crypto');
const path = require('path');
const { loadGeneratorMappings } = require('./load-mappings');
const { validateApprovedDraft } = require('./load-draft');
const { generateSettings } = require('./generate-settings');
const { generateHomepage } = require('./generate-homepage');
const { generatePages } = require('./generate-pages');
const { resolveResourceReferences } = require('./resolve-resource-references');
const { validateGeneratedTheme, validateGeneratedWorkspace } = require('./validate-generated-theme');
const { changeManifest } = require('./generate-change-manifest');
const { generateDiff } = require('./generate-diff');
const { generatePreviewReport } = require('./generate-preview-report');
const { approvedPlan, approvedResourceSnapshot } = require('./materialize-section-blocks');
const { assertApprovedBlockPlanTransport, provenance } = require('../../pipeline/resolve-approved-block-plan-transport');
const { GENERATOR_VERSION, assertOutputWorkspace, sourceSnapshot, createSourceRuntimeBackup, sameSnapshot, traceFrom, writeJson, writeText } = require('./utils');
const { assertApprovedPresetRevision, presetProvenance } = require('../presets/apply-approved-preset');
const { approvedDnaProvenance } = require('../design-dna/design-dna-engine');
const { selectArchitecture, assertFrozenArchitectureSelection, architectureProvenance } = require('../architecture');

function fileTrace(draft, approval, sourceDraft) {
  return traceFrom(draft.explanations[0], approval.approval_reference, sourceDraft);
}

function generatedFile(pathname, kind, trace) {
  return { path: pathname, kind, trace };
}

function portableRuntimeReferences(value) {
  if (Array.isArray(value)) return value.map(portableRuntimeReferences);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, portableRuntimeReferences(item)]));
  if (typeof value !== 'string' || !/^dashboard:\/\/projects\/[^/]+\/assets\/[^/?#]+$/.test(value)) return value;
  return `shopify://merchant-assets/${crypto.createHash('sha256').update(value).digest('hex').slice(0, 40)}`;
}

function generateTheme({ root, draft, approval, generationId, outputRoot, approvedBlockPlanTransport = null, approvedPresetRevision = null, approvedRecommendationRevision = null, approvedDesignDnaRevision = null, architectureSelectionRevision = null, merchantIntent = null, storeIntelligence = null, presetApplication = null, designDnaApplication = null }) {
  validateApprovedDraft(draft, approval, root);
  const mappings = loadGeneratorMappings(root);
  const transport = approvedBlockPlanTransport ? assertApprovedBlockPlanTransport(approvedBlockPlanTransport) : null;
  const transportProvenance = transport ? provenance(transport) : null;
  const presetRevision = approvedPresetRevision ? assertApprovedPresetRevision(approvedPresetRevision, root) : null;
  const approvedPresetProvenance = presetProvenance(presetRevision);
  const approvedRecommendationProvenance = approvedRecommendationRevision ? { revision_id: approvedRecommendationRevision.revision_id, candidate_revision_id: approvedRecommendationRevision.candidate_revision_id, approval_checksum: approvedRecommendationRevision.approval_checksum } : null;
  const approvedDesignDnaProvenance = approvedDnaProvenance(approvedDesignDnaRevision);
  const architectureSelection = architectureSelectionRevision
    ? assertFrozenArchitectureSelection(architectureSelectionRevision, root)
    : selectArchitecture({ merchantIntent, storeIntelligence, root });
  const approvedArchitectureProvenance = architectureProvenance(architectureSelection, root);
  if (JSON.stringify(approval.approved_block_plan || null) !== JSON.stringify(transportProvenance)) {
    throw new Error('Generation approval does not bind the resolved Approved Block Plan transport.');
  }
  if (JSON.stringify(approval.approved_preset || null) !== JSON.stringify(approvedPresetProvenance)) {
    throw new Error('Generation approval does not bind the resolved approved preset revision.');
  }
  if (JSON.stringify(approval.approved_recommendation || null) !== JSON.stringify(approvedRecommendationProvenance)) {
    throw new Error('Generation approval does not bind the resolved approved Recommendation revision.');
  }
  if (JSON.stringify(approval.approved_design_dna || null) !== JSON.stringify(approvedDesignDnaProvenance)) {
    throw new Error('Generation approval does not bind the resolved approved Design DNA revision.');
  }
  if (approval.architecture_selection && JSON.stringify(approval.architecture_selection) !== JSON.stringify(approvedArchitectureProvenance)) {
    throw new Error('Generation approval does not bind the resolved frozen architecture selection.');
  }
  const immutableApprovedBlockPlan = transport ? approvedPlan(transport.plan_revision.plan, root) : null;
  const immutableApprovedBlockPlanResourceSnapshot = immutableApprovedBlockPlan
    ? approvedResourceSnapshot(transport.resource_snapshot, immutableApprovedBlockPlan)
    : null;
  const workspace = assertOutputWorkspace(root, outputRoot, generationId);
  const beforeSnapshot = sourceSnapshot(root);
  createSourceRuntimeBackup(root, workspace);
  const { settingsData, changes: settingsChanges } = generateSettings({ root, draft, approval, mappings });
  const homepage = generateHomepage({
    root,
    draft,
    approval,
    mappings,
    approvedBlockPlan: immutableApprovedBlockPlan,
    approvedBlockPlanResourceSnapshot: immutableApprovedBlockPlanResourceSnapshot
  });
  const { pages, unsupported } = generatePages({
    root, draft, approval, mappings,
    approvedBlockPlan: immutableApprovedBlockPlan,
    approvedBlockPlanResourceSnapshot: immutableApprovedBlockPlanResourceSnapshot
  });
  const templates = portableRuntimeReferences({ 'templates/index.json': homepage.template });
  for (const page of pages) templates[page.target.output.replace(/^theme\//, '')] = portableRuntimeReferences(page.template);
  const instances = portableRuntimeReferences([...homepage.instances, ...pages.flatMap((page) => page.instances)]);
  const trace = fileTrace(draft, approval, 'draft');
  const generatedFiles = [
    ...Object.keys(templates).sort().map((relative) => generatedFile(`theme/${relative}`, 'template', trace)),
    generatedFile('theme/config/settings_data.json', 'settings', trace),
    generatedFile('reports/change-manifest.json', 'report', trace),
    generatedFile('reports/theme-diff.json', 'report', trace),
    generatedFile('reports/preview.md', 'report', trace),
    generatedFile('manifests/source-runtime-backup.tar.gz', 'manifest', trace),
    generatedFile('manifests/generated-theme.json', 'manifest', trace)
  ];
  const merchantReferences = resolveResourceReferences(draft, approval).map((reference) => ({
    reference_id: reference.reference_id,
    value: reference.value,
    trace: traceFrom(draft.explanations[0], approval.approval_reference, reference.reference_id)
  }));
  const manifest = {
    version: 1,
    generator_version: GENERATOR_VERSION,
    generation_id: generationId,
    draft_version: draft.version,
    source_strategy_version: draft.strategy_version,
    generation_timestamp: approval.approved_at,
    compatibility_version: '1.0.0',
    approval: { approval_id: approval.approval_id, approval_reference: approval.approval_reference },
    approved_block_plan_provenance: transportProvenance,
    approved_preset_provenance: approvedPresetProvenance,
    approved_recommendation_provenance: approvedRecommendationProvenance,
    approved_design_dna_provenance: approvedDesignDnaProvenance,
    architecture_selection: approvedArchitectureProvenance,
    preset_application: presetApplication ? {
      recipe: presetApplication.recipe,
      section_order: [...presetApplication.section_order],
      applied_global_setting_keys: [...presetApplication.applied_global_setting_keys],
      applied_section_default_keys: [...presetApplication.applied_section_default_keys],
      omissions: [...presetApplication.omissions],
      fallbacks: [...presetApplication.fallbacks]
    } : null,
    design_dna_application: designDnaApplication ? {
      applied_global_setting_keys: [...designDnaApplication.applied_global_setting_keys],
      applied_section_setting_keys: [...designDnaApplication.applied_section_setting_keys]
    } : null,
    workspace: `output/${generationId}`,
    generated_files: generatedFiles,
    generated_section_instances: instances,
    generated_settings: settingsChanges,
    merchant_references: merchantReferences,
    validation_status: { valid: true, errors: [], warnings: [] },
    warnings: [...(homepage.warnings || []), ...pages.flatMap((page) => page.warnings || []), ...unsupported.map((item) => `${item.page_id} is unsupported: ${item.reason}`)],
    unsupported_items: unsupported.map((item) => ({ id: item.page_id, reason: item.reason, trace: traceFrom(item.explanation, approval.approval_reference, item.page_id) }))
  };
  const preflight = validateGeneratedTheme({ root, mappings, manifest, templates, settingsData });
  if (!preflight.valid) {
    const error = new Error(`Generated configuration validation failed: ${preflight.errors.join(' ')}`);
    error.validation = preflight;
    throw error;
  }
  const changes = changeManifest({ homepage, pages, settingsChanges });
  const diff = generateDiff({ generatedFiles, generatedInstances: instances, settingsChanges, unsupported });
  const preview = generatePreviewReport({ draft, manifest, homepage, pages, unsupported, settingsChanges });
  for (const [relative, template] of Object.entries(templates)) writeJson(path.join(workspace, 'theme', relative), template);
  writeJson(path.join(workspace, 'theme/config/settings_data.json'), settingsData);
  writeJson(path.join(workspace, 'reports/change-manifest.json'), changes);
  writeJson(path.join(workspace, 'reports/theme-diff.json'), diff);
  writeText(path.join(workspace, 'reports/preview.md'), preview);
  writeJson(path.join(workspace, 'manifests/generated-theme.json'), manifest);
  const afterSnapshot = sourceSnapshot(root);
  if (!sameSnapshot(beforeSnapshot, afterSnapshot)) throw new Error('Source theme integrity check failed: generation altered the working theme.');
  const validation = validateGeneratedWorkspace({ root, workspace, mappings });
  if (!validation.valid) throw new Error(`Written workspace validation failed: ${validation.errors.join(' ')}`);
  return { workspace, manifest, changes, diff, preview, validation, source_theme_unchanged: true };
}

module.exports = { generateTheme, portableRuntimeReferences };
