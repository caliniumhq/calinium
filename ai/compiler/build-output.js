'use strict';

function buildOutput(profile, knowledgeBase, decisions, orderedSections, assets, verification, safety, validation, explanations) {
  return {
    version: 1,
    compiler_version: '1.0.0',
    knowledge_base_versions: {
      design_intelligence: knowledgeBase.raw.designLanguages.version,
      section_manifest: knowledgeBase.raw.sectionManifest.version,
      setting_metadata: knowledgeBase.raw.settingMetadata.version,
      block_taxonomy: knowledgeBase.raw.blockTaxonomy.version
    },
    merchant_summary: {
      business_name: profile.business.name,
      industry: profile.industry,
      subcategory: profile.subcategory,
      page_type: profile.preferences.page_type,
      catalog_product_count: profile.catalog.product_count
    },
    resolutions: {
      industry: decisions.industry.selected,
      personality: decisions.personality.selected,
      design_language: decisions.design_language.selected,
      typography: decisions.typography.selected,
      spacing: decisions.spacing.selected,
      color_strategy: decisions.color_strategy.selected,
      image_strategy: decisions.image_strategy.selected,
      animation: decisions.animation.selected,
      conversion_strategy: decisions.conversion_strategy.selected,
      blueprint: decisions.blueprint.selected,
      homepage_recipe: decisions.homepage_recipe.selected
    },
    decisions,
    homepage_blueprint: decisions.blueprint.selected,
    homepage_recipe: decisions.homepage_recipe.selected,
    ordered_sections: orderedSections,
    merchant_assets: assets,
    merchant_verification: verification,
    content_safety: safety,
    validation_report: validation,
    explanations,
    decision_trace: explanations
  };
}

module.exports = { buildOutput };
