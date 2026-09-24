'use strict';

const { createSchemaValidator } = require('../compiler/schema-validator');
const { resolveResourceReferences } = require('./resolve-resource-references');
const { repositoryPaths } = require('../../scripts/lib/repository-paths');
const { runtimeInventory } = require('../../scripts/lib/theme-runtime-integrity');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function categoryFor(settingId) {
  if (/color|scheme/i.test(settingId)) return 'colors';
  if (/font|heading|body|letter|text_transform/i.test(settingId)) return 'typography';
  if (/motion|animation/i.test(settingId)) return 'motion';
  if (/width|gutter|spacing|gap|radius/i.test(settingId)) return 'layout';
  return 'other';
}

function compactSetting(setting) {
  return { setting_id: setting.setting_id, value: clone(setting.value), origin: setting.origin };
}

function sectionPlans(pagePlan, generatedInstances) {
  const instances = generatedInstances.filter((instance) => instance.template === 'templates/index.json');
  return [...(pagePlan?.sections || [])]
    .sort((left, right) => left.position - right.position)
    .filter((section) => section.validation_status !== 'unsupported')
    .map((section) => {
      const instance = instances.find((candidate) => candidate.trace?.source_draft === section.instance_id)
        || instances.find((candidate) => candidate.section_id === section.section_id && candidate.position === section.position);
      if (!instance) throw new Error(`Generated homepage is missing the approved ${section.section_id} section at position ${section.position}.`);
      return {
        position: section.position,
        section_id: section.section_id,
        instance_id: instance.instance_id,
        purpose: section.purpose || section.section_id.replace(/-/g, ' '),
        origin: instance.origin
      };
    });
}

function resourcePlan(draft, approval) {
  return resolveResourceReferences(draft, approval)
    .map((reference) => ({ reference_id: reference.reference_id, source: reference.source, value: reference.value }))
    .sort((left, right) => left.reference_id.localeCompare(right.reference_id));
}

function createThemeSpecification({ root, generationId, creativeBrief, storeStrategy, review, merchantProfile, draft, approval, generated }) {
  if (review?.creativeBriefStatus !== 'approved' || review?.storeStrategyStatus !== 'approved') {
    throw new Error('Theme Specification requires approved Brand Blueprint and Store Strategy reviews.');
  }
  if (!approval?.approved || !approval.approval_reference || !approval.approved_at) {
    throw new Error('Theme Specification requires an explicit approved Resource Plan.');
  }
  const paths = repositoryPaths(root);
  const inventory = runtimeInventory(paths.themeRoot);
  const allSettings = [...(generated.manifest.generated_settings || [])].map(compactSetting)
    .sort((left, right) => left.setting_id.localeCompare(right.setting_id));
  const homepageSections = sectionPlans(draft.homepage_plan, generated.manifest.generated_section_instances || []);
  const resources = resourcePlan(draft, approval);
  const specification = {
    version: 1,
    specification_id: `theme-spec-${generationId}`,
    generation_id: generationId,
    base_theme: {
      id: 'calinium-one',
      source: 'apps/theme',
      runtime_checksum: inventory.checksum,
      runtime_file_count: inventory.file_count
    },
    architecture: clone(generated.manifest.architecture_selection),
    approved_inputs: {
      brand_blueprint: { version: String(creativeBrief.version), approval_status: review.creativeBriefStatus },
      store_strategy: { version: String(storeStrategy.version), approval_status: review.storeStrategyStatus },
      resource_plan: {
        approval_id: approval.approval_id,
        approval_reference: approval.approval_reference,
        approved_at: approval.approved_at,
        references: resources
      }
    },
    design_language: {
      name: merchantProfile.strategy.design_direction.name,
      traits: [...merchantProfile.strategy.design_direction.traits],
      rationale: merchantProfile.strategy.design_direction.rationale
    },
    color_system: {
      palette_role: merchantProfile.strategy.color_direction.paletteRole,
      recommended_colors: [...merchantProfile.strategy.color_direction.recommendedColors],
      rationale: merchantProfile.strategy.color_direction.rationale,
      generated_settings: allSettings.filter((setting) => categoryFor(setting.setting_id) === 'colors')
    },
    typography: {
      style: merchantProfile.strategy.typography_direction.style,
      roles: clone(merchantProfile.strategy.typography_direction.recommendedRoles),
      rationale: merchantProfile.strategy.typography_direction.rationale,
      generated_settings: allSettings.filter((setting) => categoryFor(setting.setting_id) === 'typography')
    },
    homepage: {
      objective: merchantProfile.strategy.homepage.objective,
      hero: {
        treatment: merchantProfile.strategy.homepage.hero.treatment,
        rationale: merchantProfile.strategy.homepage.hero.rationale
      },
      sections: homepageSections
    },
    collection_layout: {
      layout: merchantProfile.strategy.collection_page.layout,
      filters: [...merchantProfile.strategy.collection_page.filters],
      sorting: merchantProfile.strategy.collection_page.sorting
    },
    product_layout: {
      gallery_style: merchantProfile.strategy.product_page.galleryStyle,
      purchase_experience: merchantProfile.strategy.product_page.purchaseExperience,
      trust_elements: [...merchantProfile.strategy.product_page.trustElements]
    },
    navigation: {
      primary_items: [...merchantProfile.strategy.navigation.primaryItems],
      recommend_mega_menu: merchantProfile.strategy.navigation.recommendMegaMenu,
      rationale: merchantProfile.strategy.navigation.rationale
    },
    components: homepageSections.map((section) => ({ section_id: section.section_id, instance_id: section.instance_id, purpose: section.purpose })),
    section_ordering: homepageSections,
    theme_settings: allSettings,
    resources,
    technical_requirements: {
      accessibility: storeStrategy.technicalRequirements.accessibility,
      performance: storeStrategy.technicalRequirements.performance,
      responsive: storeStrategy.technicalRequirements.responsive,
      progressive_enhancement: storeStrategy.technicalRequirements.progressiveEnhancement
    },
    traceability: {
      approval_reference: approval.approval_reference,
      approval_id: approval.approval_id,
      source_draft_version: draft.version,
      source_strategy_version: String(storeStrategy.version),
      reasoning: 'The specification is assembled only from merchant-approved Brand Blueprint, Store Strategy, Resource Plan, mapped configuration, and installed Calinium One capabilities.'
    }
  };
  const errors = createSchemaValidator(root).validateFile(specification, 'schemas/calinium-theme-specification.schema.json', 'theme_specification');
  if (errors.length) {
    const error = new Error(`Theme Specification validation failed: ${errors.join('; ')}`);
    error.validation = { valid: false, errors, warnings: [] };
    throw error;
  }
  return specification;
}

module.exports = { createThemeSpecification, categoryFor, sectionPlans, resourcePlan };
