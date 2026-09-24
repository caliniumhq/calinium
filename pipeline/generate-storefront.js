'use strict';

const { createMerchantProfile } = require('./create-merchant-profile');
const { mapMerchantProfile, buildGenerationApproval } = require('./map-merchant-profile');
const { resolveApprovedDraft } = require('./resolve-approved-draft');
const { createApprovalSummary } = require('./approval-gate');
const { compileStorefrontStrategy } = require('../ai/compiler/compile-strategy');
const { buildDraftConfiguration } = require('../ai/draft-builder/build-draft');
const { generateTheme } = require('../ai/theme-generator/generate-theme');
const { createThemeSpecification } = require('../ai/theme-generator/create-theme-specification');
const { generateReadOnlyThemePackage } = require('../ai/theme-generator/generate-read-only-theme-package');
const { assertApprovedBlockPlanTransport, provenance } = require('./resolve-approved-block-plan-transport');
const { buildReviewSession } = require('../ai/review-engine/create-review-session');
const { createPreviewPackage } = require('./preview-package');
const { applyStrategySectionPolicy } = require('./strategy-section-policy');
const { assertApprovedPresetRevision, applyPresetToStrategy, applyPresetDefaultsToDraft, presetProvenance } = require('../ai/presets/apply-approved-preset');
const { applyDesignDnaToDraft, approvedDnaProvenance } = require('../ai/design-dna/design-dna-engine');
const {
  createStoreIntelligenceContract,
  assertStoreIntelligenceContract,
  createMerchantIntent,
  assertMerchantIntent,
  selectArchitecture,
  assertFrozenArchitectureSelection,
  assertArchitectureSelectionInputBindings,
  architectureProvenance,
  assertArchitectureSupportsPreset,
  assertArchitectureSupportsDesignDna
} = require('../ai/architecture');
const blockMaterializationPolicies = require('../config/theme-block-materialization-policy.json');

function approvedBlockPlanSectionIds(transport) {
  if (!transport) return {};
  const byRole = new Map(blockMaterializationPolicies.policies.map((policy) => [policy.semantic_section_role, policy.runtime_section_id]));
  const result = {};
  for (const composition of transport.plan_revision.plan.compositions || []) {
    const sectionId = byRole.get(composition.section_role);
    if (!sectionId) continue;
    result[composition.page_role] = [...new Set([...(result[composition.page_role] || []), sectionId])];
  }
  return result;
}

function buildDraftFromMerchantProfile(merchantProfile, options = {}) {
  const storeIntelligence = options.storeIntelligence?.contract_version
    ? assertStoreIntelligenceContract(options.storeIntelligence, options.root)
    : options.storeIntelligence
      ? createStoreIntelligenceContract({ ...options.storeIntelligence, root: options.root })
    : createStoreIntelligenceContract({ root: options.root });
  const merchantIntent = options.merchantIntent
    ? assertMerchantIntent(options.merchantIntent, options.root)
    : createMerchantIntent({ merchantProfile, storeIntelligence, root: options.root });
  const architectureSelection = options.architectureSelectionRevision
    ? assertFrozenArchitectureSelection(options.architectureSelectionRevision, options.root)
    : selectArchitecture({
      merchantProfile,
      merchantIntent,
      storeIntelligence,
      selectionMode: options.architectureSelectionMode || 'legacy_default',
      allowMaterialQuestion: options.allowArchitectureMaterialQuestion !== false,
      root: options.root
    });
  if (architectureSelection.status === 'material_question_required') {
    const error = new Error('Automatic architecture selection requires one material clarification before Design DNA or composition can continue.');
    error.name = 'ArchitectureMaterialQuestionRequiredError';
    error.outcome = architectureSelection;
    throw error;
  }
  if (architectureSelection.merchant_intent_revision !== merchantIntent.revision_id || architectureSelection.store_intelligence_revision !== storeIntelligence.revision_id) {
    throw new Error('Frozen architecture selection does not bind the resolved Merchant Intent and Store Intelligence revisions.');
  }
  assertArchitectureSelectionInputBindings(architectureSelection, merchantIntent, storeIntelligence);
  assertArchitectureSupportsPreset(architectureSelection, options.approvedPresetRevision?.preset_snapshot?.id, options.root);
  const mapping = mapMerchantProfile(merchantProfile, { root: options.root });
  const compiled = compileStorefrontStrategy(mapping.compiler_profile, { root: options.root });
  const presetStrategy = applyPresetToStrategy(compiled, options.approvedPresetRevision, options.root);
  const generatedDraft = buildDraftConfiguration(mapping.compiler_profile, presetStrategy.strategy, { root: options.root });
  const presetDraft = applyPresetDefaultsToDraft(generatedDraft, options.approvedPresetRevision, options.root);
  assertArchitectureSupportsDesignDna(architectureSelection, approvedDnaProvenance(options.approvedDesignDnaRevision)?.engine_version, options.root);
  const dnaDraft = applyDesignDnaToDraft(presetDraft.draft, options.approvedDesignDnaRevision);
  const policy = applyStrategySectionPolicy({
    draft: dnaDraft.draft,
    storeStrategy: options.storeStrategy,
    review: options.review
  });
  const presetApplication = options.approvedPresetRevision ? { ...presetStrategy.application, ...presetDraft.application } : null;
  return {
    architecture_selection: architectureSelection,
    merchant_intent: merchantIntent,
    store_intelligence: storeIntelligence,
    mapping,
    compiler_strategy: presetStrategy.strategy,
    draft: policy.draft,
    strategy_section_policy: policy.policy,
    preset_application: presetApplication,
    design_dna_application: dnaDraft.application
  };
}

function configurationBlockedResult({ root, merchantProfile, architectureSelection, merchantIntent, storeIntelligence, mapping, compilerStrategy, draft, approvalSummary }) {
  return {
    status: 'awaiting_merchant_configuration',
    merchant_profile: merchantProfile,
    architecture_selection: architectureSelection,
    architecture_provenance: architectureProvenance(architectureSelection, root),
    merchant_intent: merchantIntent,
    store_intelligence: storeIntelligence,
    profile_mapping: mapping,
    compiler_strategy: compilerStrategy,
    draft,
    approval_summary: approvalSummary,
    next_step: 'Supply explicit merchant resource selections, required asset references, confirmation records, and a configuration approval before isolated theme generation.',
    preview_verification: { status: 'not_started', reason: 'Preview verification begins only after an approved Review Session is deployed to an unpublished development theme.' },
    deployment_package: { status: 'blocked', reason: 'A deployment package requires a separate approved Review Session. This pipeline has not created or approved one.' }
  };
}

function generateStorefront({ creativeBrief, storeStrategy, review, generation = {}, resourcePlan = null, approvedBlockPlanTransport = null, approvedPresetRevision = null, approvedRecommendationRevision = null, approvedDesignDnaRevision = null, architectureSelectionRevision = null, architectureSelectionMode = 'legacy_default', allowArchitectureMaterialQuestion = true, merchantIntent = null, storeIntelligence = null, root, generationId, outputRoot, runThemeCheck = true } = {}) {
  const presetRevision = approvedPresetRevision ? assertApprovedPresetRevision(approvedPresetRevision, root) : null;
  const merchantProfile = createMerchantProfile({ creativeBrief, storeStrategy, review, generation, root });
  const approvalSummary = createApprovalSummary({ creativeBrief, storeStrategy, review, root });
  const prepared = buildDraftFromMerchantProfile(merchantProfile, { root, storeStrategy, review, approvedPresetRevision: presetRevision, approvedDesignDnaRevision, architectureSelectionRevision, architectureSelectionMode, allowArchitectureMaterialQuestion, merchantIntent, storeIntelligence });
  const {
    architecture_selection: architectureSelection,
    merchant_intent: resolvedMerchantIntent,
    store_intelligence: resolvedStoreIntelligence,
    mapping,
    compiler_strategy: compilerStrategy,
    draft,
    strategy_section_policy: strategySectionPolicy,
    preset_application: presetApplication,
    design_dna_application: designDnaApplication
  } = prepared;
  if (merchantProfile.generation.status !== 'ready_for_generation') {
    return configurationBlockedResult({ root, merchantProfile, architectureSelection, merchantIntent: resolvedMerchantIntent, storeIntelligence: resolvedStoreIntelligence, mapping, compilerStrategy, draft, approvalSummary });
  }
  const transport = approvedBlockPlanTransport ? assertApprovedBlockPlanTransport(approvedBlockPlanTransport) : null;
  const resolvedDraft = resolveApprovedDraft({ draft, merchantProfile, resourcePlan, storeStrategy, review, approvedBlockPlanSectionIds: approvedBlockPlanSectionIds(transport), root });
  const approvedRecommendationProvenance = approvedRecommendationRevision ? { revision_id: approvedRecommendationRevision.revision_id, candidate_revision_id: approvedRecommendationRevision.candidate_revision_id, approval_checksum: approvedRecommendationRevision.approval_checksum } : null;
  const approvedDesignDnaProvenance = approvedDnaProvenance(approvedDesignDnaRevision);
  const approvedArchitectureProvenance = architectureProvenance(architectureSelection, root);
  const approval = buildGenerationApproval(merchantProfile, resolvedDraft, transport ? provenance(transport) : null, presetProvenance(presetRevision), approvedRecommendationProvenance, approvedDesignDnaProvenance, approvedArchitectureProvenance);
  const generated = generateTheme({
    root,
    draft: resolvedDraft,
    approval,
    generationId,
    outputRoot,
    approvedBlockPlanTransport: transport,
    approvedPresetRevision: presetRevision,
    approvedRecommendationRevision,
    approvedDesignDnaRevision,
    architectureSelectionRevision: architectureSelection,
    merchantIntent: resolvedMerchantIntent,
    storeIntelligence: resolvedStoreIntelligence,
    presetApplication,
    designDnaApplication
  });
  const themeSpecification = createThemeSpecification({
    root,
    generationId,
    creativeBrief,
    storeStrategy,
    review,
    merchantProfile,
    draft: resolvedDraft,
    approval,
    generated
  });
  const themePackage = generateReadOnlyThemePackage({ root, generated, specification: themeSpecification, runThemeCheck });
  const reviewHandoff = buildReviewSession({ root, generatedWorkspace: generated.workspace });
  const previewPackage = createPreviewPackage({
    root,
    generationId,
    creativeBrief,
    storeStrategy,
    merchantProfile,
    draft: resolvedDraft,
    generated,
    reviewHandoff,
    approvalSummary
  });
  return {
    status: 'generated_for_review',
    merchant_profile: merchantProfile,
    profile_mapping: mapping,
    compiler_strategy: compilerStrategy,
    draft: resolvedDraft,
    strategy_section_policy: strategySectionPolicy,
    approved_preset_provenance: presetProvenance(presetRevision),
    approved_recommendation_provenance: approvedRecommendationProvenance,
    approved_design_dna_provenance: approvedDesignDnaProvenance,
    architecture_selection: architectureSelection,
    architecture_provenance: approvedArchitectureProvenance,
    merchant_intent: resolvedMerchantIntent,
    store_intelligence: resolvedStoreIntelligence,
    preset_application: presetApplication,
    design_dna_application: designDnaApplication,
    generation_approval: approval,
    generated_theme: generated,
    theme_specification: themeSpecification,
    read_only_theme_package: themePackage,
    review_handoff: reviewHandoff,
    preview_package: previewPackage,
    preview_verification: { status: 'not_started', reason: 'The generated configuration must complete its independent Review Session and be deployed to an unpublished development theme before read-only preview verification.' },
    deployment_package: { status: 'blocked', reason: 'The Development Theme Deployment Adapter accepts only an approved Review Session and approval manifest. This local generation run intentionally stops before deployment.' }
  };
}

module.exports = { generateStorefront, buildDraftFromMerchantProfile, configurationBlockedResult, approvedBlockPlanSectionIds };
