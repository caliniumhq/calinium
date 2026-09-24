#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createCreativeBrief } = require('../pipeline/create-creative-brief');
const { createStoreStrategy } = require('../pipeline/create-store-strategy');
const { createReviewState, approveAll, approveRecommendation, rejectRecommendation } = require('../pipeline/review-state');
const { createMerchantProfile } = require('../pipeline/create-merchant-profile');
const { mapMerchantProfile } = require('../pipeline/map-merchant-profile');
const { generateStorefront } = require('../pipeline/generate-storefront');
const { sourceSnapshot, sameSnapshot } = require('../ai/theme-generator/utils');
const { createFixtureApprovedBlockPlanTransport } = require('../pipeline/resolve-approved-block-plan-transport');

const root = path.resolve(__dirname, '..');

function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function fixture(name) { return readJson(path.join('fixtures', name)); }

function loadExpectations() {
  const manifest = readJson('fixtures/generator-validation-expectations.json');
  assert.equal(manifest.version, 1, 'Generator expectation manifest must use version 1.');
  assert.ok(Array.isArray(manifest.fixtures) && manifest.fixtures.length > 0, 'Generator expectation manifest must include merchant fixtures.');
  return manifest;
}

function draftFieldRefs(draft) {
  const values = [];
  for (const page of [draft.homepage_plan, ...draft.other_pages]) {
    for (const section of page.sections || []) {
      for (const field of section.unresolved_merchant_fields || []) values.push(field);
    }
  }
  return values;
}

function fixtureGenerationContext(draft, name) {
  const merchantReferences = {};
  const assetReferences = Object.fromEntries((draft.required_assets.required || []).map((asset) => [asset.asset_id, `shopify://fixture-assets/${name.replace(/\.json$/, '')}-${asset.asset_id}`]));
  const completed = new Set();
  const empty = new Set();
  const requiredFieldRefs = new Set((draft.required_assets.required || []).flatMap((asset) => asset.field_refs || []));
  for (const field of draftFieldRefs(draft)) {
    const requiresReference = requiredFieldRefs.has(field.setting_ref) || [
      'collection', 'product', 'blog', 'link_list', 'menu', 'page', 'article',
      'image', 'desktop_image', 'mobile_image', 'poster_image', 'video', 'video_url'
    ].includes(field.setting_id);
    if (requiresReference) {
      merchantReferences[field.setting_ref] = `shopify://fixture-resources/${name.replace(/\.json$/, '')}-${field.setting_ref.replace(/[^a-z0-9]+/gi, '-')}`;
      completed.add(`field:${field.setting_ref}`);
    } else empty.add(field.setting_ref);
  }
  for (const category of ['typography', 'spacing', 'colors', 'motion', 'layout']) {
    for (const setting of draft.global_theme_configuration[category] || []) {
      if (setting.status !== 'proposed') empty.add(setting.setting_ref);
    }
  }
  for (const page of [draft.homepage_plan, ...draft.other_pages]) {
    for (const section of page.sections || []) for (const confirmation of section.merchant_confirmations || []) completed.add(confirmation);
  }
  for (const item of draft.merchant_review_queue || []) completed.add(`review:${item.id}`);
  return {
    status: 'ready_for_generation',
    approval_reference: `fixture-merchant-configuration-${name.replace(/\.json$/, '')}`,
    approved_at: '2026-07-21T00:00:00.000Z',
    merchant_references: merchantReferences,
    asset_references: assetReferences,
    completed_confirmations: [...completed].sort(),
    resolved_empty_fields: [...empty].sort()
  };
}

function removeGeneratedArtifacts(generationIds) {
  for (const generationId of generationIds) {
    for (const relative of [path.join('output', generationId), path.join('output', 'preview', generationId)]) {
      const target = path.join(root, relative);
      if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
    }
  }
}

function generatedHomepageSections(generated) {
  return generated.generated_theme.manifest.generated_section_instances
    .filter((instance) => instance.template === 'templates/index.json')
    .sort((left, right) => left.position - right.position)
    .map((instance) => instance.section_id);
}

function semanticSnapshot(generated) {
  const theme = generated.generated_theme.workspace;
  const instances = generated.generated_theme.manifest.generated_section_instances
    .filter((instance) => instance.template === 'templates/index.json')
    .sort((left, right) => left.position - right.position)
    .map((instance) => ({ instance_id: instance.instance_id, section_id: instance.section_id, position: instance.position, origin: instance.origin }));
  return {
    strategy: generated.compiler_strategy.homepage_recipe,
    selected_preset: null,
    homepage_section_order: instances.map((instance) => instance.section_id),
    section_identities: instances.map((instance) => instance.section_id),
    stable_ids: instances.map((instance) => instance.instance_id),
    settings: readWorkspaceJson(theme, 'theme/config/settings_data.json'),
    generated_configuration: {
      index: readWorkspaceJson(theme, 'theme/templates/index.json'),
      settings: readWorkspaceJson(theme, 'theme/config/settings_data.json')
    },
    warnings: [...generated.generated_theme.manifest.warnings],
    read_only_flags: { ...generated.read_only_theme_package.manifest.shopify_operations },
    package_valid: generated.read_only_theme_package.validation.valid,
    theme_check: generated.read_only_theme_package.validation.checks.theme_check.status
  };
}

function readWorkspaceJson(workspace, relative) {
  return JSON.parse(fs.readFileSync(path.join(workspace, relative), 'utf8'));
}

function approvedBlockPlanInput(expectation) {
  if (expectation.fixture_id === 'leather-travel-bags') {
    const materialization = fixture('block-materialization-craftsmanship.json');
    return {
      approvedBlockPlanTransport: createFixtureApprovedBlockPlanTransport({
        plan: fixture('approved-block-plan-craftsmanship.json'),
        resourceSnapshot: materialization.resource_snapshot,
        root
      })
    };
  }
  if (expectation.fixture_id === 'food-process') {
    const materialization = fixture('block-materialization-manufacturing-process.json');
    return {
      approvedBlockPlanTransport: createFixtureApprovedBlockPlanTransport({
        plan: fixture('approved-block-plan-manufacturing-process.json'),
        resourceSnapshot: materialization.resource_snapshot,
        root
      })
    };
  }
  if (expectation.fixture_id !== 'handmade-rugs') return {};
  const materialization = fixture('block-materialization-editorial-grid.json');
  const plan = fixture(materialization.plan_fixture);
  const resourceSnapshot = materialization.resource_snapshot;
  const lookbookPlan = fixture('approved-block-plan-lookbook.json');
  const lookbookSnapshot = fixture('block-materialization-lookbook.json').resource_snapshot;
  const approvalId = plan.approval.approval_id;
  const rebindApproval = (value) => {
    for (const entity of Object.values(value.content_entities || {})) {
      for (const localized of entity.localized_values || []) localized.approval_id = approvalId;
      entity.provenance.approval_id = approvalId;
    }
    for (const resource of Object.values(value.resource_references || {})) resource.approval_id = approvalId;
    for (const evidence of Object.values(value.evidence_references || {})) evidence.approval_id = approvalId;
  };
  rebindApproval(lookbookPlan);
  plan.compositions[0].order = 2;
  const lookbookComposition = lookbookPlan.compositions[0];
  lookbookComposition.order = 1;
  plan.compositions.unshift(lookbookComposition);
  Object.assign(plan.content_entities, lookbookPlan.content_entities);
  Object.assign(plan.resource_references, lookbookPlan.resource_references);
  Object.assign(plan.evidence_references, lookbookPlan.evidence_references);
  Object.assign(resourceSnapshot.resources, lookbookSnapshot.resources);
  return {
    approvedBlockPlanTransport: createFixtureApprovedBlockPlanTransport({
      plan,
      resourceSnapshot,
      root
    })
  };
}

function assertEditorialGridMaterialization(generated) {
  const template = readWorkspaceJson(generated.generated_theme.workspace, 'theme/templates/index.json');
  const editorialInstance = generated.generated_theme.manifest.generated_section_instances.find((item) => item.template === 'templates/index.json' && item.section_id === 'editorial-grid');
  assert.ok(editorialInstance, 'Handmade Rugs must include the selected Editorial Grid shell.');
  const section = template.sections[editorialInstance.instance_id];
  assert.ok(section?.blocks && section?.block_order, 'Only the approved Editorial Grid instance must receive materialized blocks.');
  assert.equal(section.block_order.length, 2, 'Approved Editorial Grid plan must produce two story blocks.');
  assert.ok(section.block_order.every((id) => /^calinium_b_[a-f0-9]{20}$/.test(id)), 'Editorial Grid must use stable generated block IDs.');
  const first = section.blocks[section.block_order[0]];
  const second = section.blocks[section.block_order[1]];
  assert.equal(first.type, 'story');
  assert.equal(first.settings.image, 'shopify://fixture-assets/oak-loom-rug-care-image');
  assert.equal(first.settings.collection, 'shopify://fixture-resources/oak-loom-rug-care-collection');
  assert.equal(first.settings.heading, 'Rug care guides');
  assert.equal(first.settings.excerpt, 'Care guidance approved by Oak & Loom for its natural-fiber rugs.');
  assert.equal(second.type, 'story');
  assert.equal(second.settings.article, 'shopify://fixture-resources/oak-loom-natural-fiber-journal');
  assert.equal(second.settings.heading, 'Natural-fiber journal');
  for (const [id, candidate] of Object.entries(template.sections)) {
    if (id === editorialInstance.instance_id || candidate.type === 'lookbook') continue;
    assert.ok(!Object.hasOwn(candidate, 'blocks') && !Object.hasOwn(candidate, 'block_order'), `Only approved Editorial Grid and Lookbook sections may receive generated blocks; ${candidate.type} was changed.`);
  }
  assert.ok(!Object.values(template.sections).some((candidate) => candidate.type === 'image-mosaic' || candidate.type === 'quote-banner'), 'Unsupported Batch 8 sections must remain omitted.');
  assert.ok(!generated.generated_theme.manifest.warnings.some((warning) => warning.includes('unsupported_optional_resource')), 'A supplied approved image binding must not be omitted.');
  return section;
}

function assertLookbookMaterialization(generated) {
  const template = readWorkspaceJson(generated.generated_theme.workspace, 'theme/templates/index.json');
  const instance = generated.generated_theme.manifest.generated_section_instances.find((item) => item.template === 'templates/index.json' && item.section_id === 'lookbook');
  assert.ok(instance, 'Handmade Rugs must include the selected Lookbook shell.');
  const section = template.sections[instance.instance_id];
  assert.equal(section.block_order.length, 2, 'Approved Lookbook plan must produce two item blocks.');
  const first = section.blocks[section.block_order[0]];
  const second = section.blocks[section.block_order[1]];
  assert.equal(first.type, 'item');
  assert.equal(first.settings.image, 'dashboard://fixture-assets/oak-loom-lookbook-primary');
  assert.equal(first.settings.mobile_image, 'dashboard://fixture-assets/oak-loom-lookbook-mobile');
  assert.equal(first.settings.product, 'oak-loom-loom-rug');
  assert.equal(first.settings.title, 'The Loom Collection');
  assert.equal(second.settings.collection, 'oak-loom-care');
  assert.ok(!JSON.stringify(section).match(/approval_id|placement_id|content_entity_id|semantic_block_role/), 'Lookbook Shopify JSON must not leak plan metadata.');
  return section;
}

function assertCraftsmanshipMaterialization(generated) {
  const template = readWorkspaceJson(generated.generated_theme.workspace, 'theme/templates/index.json');
  const instance = generated.generated_theme.manifest.generated_section_instances.find((item) => item.template === 'templates/index.json' && item.section_id === 'craftsmanship');
  assert.ok(instance, 'Leather travel bags must include the selected Craftsmanship shell.');
  const section = template.sections[instance.instance_id];
  assert.ok(section?.blocks && section?.block_order, 'The approved Craftsmanship instance must receive materialized evidence blocks.');
  assert.equal(section.block_order.length, 2, 'Approved Craftsmanship evidence must produce two craft_step blocks.');
  assert.ok(section.block_order.every((id) => /^calinium_b_[a-f0-9]{20}$/.test(id)), 'Craftsmanship must use stable generated block IDs.');
  const first = section.blocks[section.block_order[0]];
  const second = section.blocks[section.block_order[1]];
  assert.deepEqual(first, {
    type: 'craft_step',
    settings: {
      image: 'dashboard://fixture-assets/craftsmanship-edge',
      heading: 'Edge finishing',
      text: 'Fixture-only merchant evidence: each approved edge is finished after construction.',
      craft_icon: 'settings'
    }
  });
  assert.deepEqual(second, {
    type: 'craft_step',
    settings: {
      heading: 'Hardware check',
      craft_icon: 'diamond'
    }
  });
  assert.ok(!JSON.stringify(section).match(/approval_id|placement_id|content_entity_id|semantic_block_role|evidence_reference/), 'Craftsmanship Shopify JSON must not leak plan or evidence metadata.');
  for (const [id, candidate] of Object.entries(template.sections)) {
    if (id === instance.instance_id) continue;
    assert.ok(!Object.hasOwn(candidate, 'blocks') && !Object.hasOwn(candidate, 'block_order'), `Only the approved Craftsmanship section may receive blocks in the leather fixture; ${candidate.type} was changed.`);
  }
  return section;
}

function assertManufacturingProcessMaterialization(generated) {
  const template = readWorkspaceJson(generated.generated_theme.workspace, 'theme/templates/index.json');
  const instance = generated.generated_theme.manifest.generated_section_instances.find((item) => item.template === 'templates/index.json' && item.section_id === 'manufacturing-process');
  assert.ok(instance, 'Food Process must include the selected Manufacturing Process shell.');
  const section = template.sections[instance.instance_id];
  assert.ok(section?.blocks && section?.block_order, 'The approved Manufacturing Process instance must receive materialized process_step blocks.');
  assert.equal(section.block_order.length, 2, 'Approved Manufacturing Process stages must produce two process_step blocks.');
  assert.ok(section.block_order.every((id) => /^calinium_b_[a-f0-9]{20}$/.test(id)), 'Manufacturing Process must use stable generated block IDs.');
  assert.deepEqual(section.blocks[section.block_order[0]], {
    type: 'process_step',
    settings: {
      image: 'dashboard://fixture-assets/process-preparation',
      heading: 'Preparation',
      text: 'Fixture-only merchant-approved description of the preparation stage.',
      process_icon: 'settings'
    }
  });
  assert.deepEqual(section.blocks[section.block_order[1]], { type: 'process_step', settings: { heading: 'Packing', process_icon: 'package' } });
  assert.ok(!JSON.stringify(section).match(/approval_id|placement_id|content_entity_id|semantic_block_role|evidence_reference/), 'Manufacturing Process Shopify JSON must not leak plan or evidence metadata.');
  for (const [id, candidate] of Object.entries(template.sections)) {
    if (id === instance.instance_id) continue;
    assert.ok(!Object.hasOwn(candidate, 'blocks') && !Object.hasOwn(candidate, 'block_order'), `Only the approved Manufacturing Process section may receive blocks in the food fixture; ${candidate.type} was changed.`);
  }
  return section;
}

function assertExpectation(generated, strategy, expectation) {
  assert.equal(strategy.designDirection.name, expectation.expected_strategy, `${expectation.fixture_id} selected an unexpected Store Strategy direction.`);
  assert.equal(generated.compiler_strategy.homepage_recipe, expectation.expected_compiler_strategy, `${expectation.fixture_id} selected an unexpected compiler strategy.`);
  assert.equal(expectation.expected_selected_preset, null, `${expectation.fixture_id} expectation must not claim a generator preset that does not exist.`);
  const sections = generatedHomepageSections(generated);
  assert.deepEqual(sections, expectation.expected_homepage_section_order, `${expectation.fixture_id} homepage section order differs from the semantic expectation: expected=${JSON.stringify(expectation.expected_homepage_section_order)} actual=${JSON.stringify(sections)}.`);
  for (const sectionId of expectation.required_sections) assert.ok(sections.includes(sectionId), `${expectation.fixture_id} omitted required section ${sectionId}.`);
  for (const sectionId of expectation.forbidden_sections) assert.ok(!sections.includes(sectionId), `${expectation.fixture_id} generated forbidden section ${sectionId}.`);
  for (const sectionId of expectation.required_omissions) assert.ok(!sections.includes(sectionId), `${expectation.fixture_id} failed to intentionally omit ${sectionId}.`);
  for (const warning of expectation.expected_warnings.must_include || []) assert.ok(generated.generated_theme.manifest.warnings.some((value) => value.includes(warning)), `${expectation.fixture_id} is missing expected warning ${warning}.`);
  for (const warning of expectation.expected_warnings.must_not_include || []) assert.ok(!generated.generated_theme.manifest.warnings.some((value) => value.includes(warning)), `${expectation.fixture_id} emitted forbidden warning ${warning}.`);
  assert.equal(generated.read_only_theme_package.validation.valid, expectation.package_assertions.valid, `${expectation.fixture_id} package validation differs from expectation.`);
  assert.equal(generated.read_only_theme_package.validation.checks.theme_check.status, expectation.package_assertions.theme_check, `${expectation.fixture_id} Theme Check differs from expectation.`);
  if (expectation.package_assertions.archive_required) assert.ok(fs.existsSync(generated.read_only_theme_package.archive_path), `${expectation.fixture_id} package archive is missing.`);
  for (const [key, value] of Object.entries(expectation.read_only_assertions)) {
    if (key === 'source_theme_unchanged') assert.equal(generated.read_only_theme_package.source_theme_unchanged, value, `${expectation.fixture_id} source-theme assertion failed.`);
    else assert.equal(generated.read_only_theme_package.manifest.shopify_operations[key], value, `${expectation.fixture_id} read-only assertion failed for ${key}.`);
  }
}

function assertGeneratedPackage(generated, name) {
  assert.equal(generated.status, 'generated_for_review');
  assert.equal(generated.draft.draft_readiness.status, 'Ready');
  assert.ok(fs.existsSync(path.join(generated.preview_package.directory, 'merchant-profile.json')));
  assert.ok(fs.existsSync(path.join(generated.preview_package.directory, 'generated-theme', 'templates', 'index.json')));
  assert.ok(generated.theme_specification, 'Approved generation must create a canonical Theme Specification.');
  assert.ok(generated.read_only_theme_package?.validation?.valid, 'Approved generation must create an internally validated read-only theme package.');
  assert.ok(fs.existsSync(path.join(generated.read_only_theme_package.theme_directory, 'layout', 'theme.liquid')));
  assert.ok(fs.existsSync(path.join(generated.read_only_theme_package.theme_directory, 'sections', 'product-carousel.liquid')));
  assert.ok(fs.existsSync(generated.read_only_theme_package.archive_path));
  assert.equal(generated.read_only_theme_package.manifest.shopify_operations.write_operations, false);
  assert.equal(generated.read_only_theme_package.manifest.shopify_operations.upload, false);
  assert.equal(generated.read_only_theme_package.manifest.shopify_operations.publish, false);
  for (const [file, checksum] of Object.entries(generated.preview_package.manifest.checksums)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(generated.preview_package.directory, file))).digest('hex');
    assert.equal(actual, checksum, `Preview package checksum must validate for ${name}: ${file}.`);
  }
  assert.equal(generated.preview_verification.status, 'not_started', 'Generation must not imply a remote preview verification before development deployment.');
  assert.equal(generated.deployment_package.status, 'blocked', 'Generation must not manufacture a deployment approval.');
}

function runFixture(expectation, index) {
  const name = expectation.merchant_fixture;
  const brief = createCreativeBrief({ merchantInput: fixture(name), root });
  const strategy = createStoreStrategy({ creativeBrief: brief, root });
  const individual = approveRecommendation(createReviewState(), 'homepage.hero', 'Approved individually.');
  assert.equal(individual.decisions[0].status, 'approved', 'Individual recommendation approval must remain representable before final approval.');
  assert.throws(
    () => createMerchantProfile({ creativeBrief: brief, storeStrategy: strategy, review: createReviewState(), root }),
    /Merchant approval is required/,
    'Generation must be blocked until both creative artifacts are approved.'
  );
  const rejected = rejectRecommendation(approveAll(createReviewState()), 'homepage.hero', 'Please revise this.');
  assert.throws(
    () => createMerchantProfile({ creativeBrief: brief, storeStrategy: strategy, review: rejected, root }),
    /Merchant approval is required/,
    'A rejected recommendation must reopen the strategy approval gate.'
  );
  const review = approveAll(createReviewState());
  const profile = createMerchantProfile({ creativeBrief: brief, storeStrategy: strategy, review, root });
  assert.deepEqual(profile, createMerchantProfile({ creativeBrief: brief, storeStrategy: strategy, review, root }), 'Canonical Merchant Profile output must be deterministic.');
  assert.equal(profile.source.creative_brief_status, 'approved');
  assert.equal(profile.source.store_strategy_status, 'approved');
  const mapping = mapMerchantProfile(profile, { root });
  assert.equal(mapping.compiler_profile.version, 1, 'The canonical profile must project into the established compiler contract.');
  const blocked = generateStorefront({ creativeBrief: brief, storeStrategy: strategy, review, root });
  assert.equal(blocked.status, 'awaiting_merchant_configuration', 'Approved creative work must still wait for real configuration references.');
  const generation = fixtureGenerationContext(blocked.draft, name);
  const blockPlan = approvedBlockPlanInput(expectation);
  const generationIds = [`generation-run-profile-integration-${index + 1}-a-${process.pid}`, `generation-run-profile-integration-${index + 1}-b-${process.pid}`];
  const before = sourceSnapshot(root);
  let first;
  let second;
  try {
    first = generateStorefront({ creativeBrief: brief, storeStrategy: strategy, review, generation, root, generationId: generationIds[0], outputRoot: path.join(root, 'output'), ...blockPlan });
    second = generateStorefront({ creativeBrief: brief, storeStrategy: strategy, review, generation, root, generationId: generationIds[1], outputRoot: path.join(root, 'output'), ...blockPlan });
    assertGeneratedPackage(first, name);
    assertGeneratedPackage(second, name);
    assertExpectation(first, strategy, expectation);
    assertExpectation(second, strategy, expectation);
    if (expectation.fixture_id === 'handmade-rugs') {
      assert.deepEqual(first.generation_approval.approved_block_plan, first.generated_theme.manifest.approved_block_plan_provenance, 'Generation approval and generated manifest must share the exact Approved Block Plan provenance.');
      assert.equal(first.generated_theme.manifest.approved_block_plan_provenance?.revision_id, 'abpr_oak-loom-editorial-r1', 'Handmade Rugs must record the resolved Approved Block Plan revision in the generated manifest.');
      assert.equal(first.generated_theme.manifest.approved_block_plan_provenance?.resource_snapshot_revision_id, 'abpsr_oak-loom-editorial-r1', 'Handmade Rugs must record the resolved approved resource snapshot revision in the generated manifest.');
      assert.deepEqual(assertEditorialGridMaterialization(first), assertEditorialGridMaterialization(second), 'Handmade Rugs Editorial Grid block materialization must be deterministic.');
      assert.deepEqual(assertLookbookMaterialization(first), assertLookbookMaterialization(second), 'Handmade Rugs Lookbook block materialization must be deterministic.');
    }
    if (expectation.fixture_id === 'leather-travel-bags') {
      assert.deepEqual(first.generation_approval.approved_block_plan, first.generated_theme.manifest.approved_block_plan_provenance, 'Generation approval and generated manifest must share Craftsmanship provenance.');
      assert.equal(first.generated_theme.manifest.approved_block_plan_provenance?.revision_id, 'abpr_fixture_craftsmanship_r1', 'Leather travel bags must record the resolved Craftsmanship revision.');
      assert.equal(first.generated_theme.manifest.approved_block_plan_provenance?.resource_snapshot_revision_id, 'abpsr_fixture_craftsmanship_r1', 'Leather travel bags must record the resolved Craftsmanship resource snapshot revision.');
      assert.deepEqual(assertCraftsmanshipMaterialization(first), assertCraftsmanshipMaterialization(second), 'Leather Craftsmanship block materialization must be deterministic.');
    }
    if (expectation.fixture_id === 'food-process') {
      assert.deepEqual(first.generation_approval.approved_block_plan, first.generated_theme.manifest.approved_block_plan_provenance, 'Generation approval and generated manifest must share Manufacturing Process provenance.');
      assert.equal(first.generated_theme.manifest.approved_block_plan_provenance?.revision_id, 'abpr_fixture_manufacturing_process_r1', 'Food Process must record the resolved Manufacturing Process revision.');
      assert.equal(first.generated_theme.manifest.approved_block_plan_provenance?.resource_snapshot_revision_id, 'abpsr_fixture_manufacturing_process_r1', 'Food Process must record the resolved approved resource snapshot revision.');
      assert.deepEqual(assertManufacturingProcessMaterialization(first), assertManufacturingProcessMaterialization(second), 'Food Process Manufacturing Process block materialization must be deterministic.');
    }
    assert.deepEqual(semanticSnapshot(first), semanticSnapshot(second), `${expectation.fixture_id} produced non-deterministic semantic configuration.`);
  } finally {
    removeGeneratedArtifacts(generationIds);
  }
  assert.ok(sameSnapshot(before, sourceSnapshot(root)), 'The integration must not alter the Shopify theme runtime.');
  assert.ok(generationIds.every((id) => !fs.existsSync(path.join(root, 'output', id)) && !fs.existsSync(path.join(root, 'output', 'preview', id))), `${expectation.fixture_id} left a generated workspace behind.`);
  return {
    fixture_id: expectation.fixture_id,
    strategy: first.compiler_strategy.homepage_recipe,
    sections: generatedHomepageSections(first),
    omitted_sections: expectation.required_omissions,
    warnings: [...first.generated_theme.manifest.warnings],
    package_validation: first.read_only_theme_package.validation.valid ? 'passed' : 'failed',
    theme_check: first.read_only_theme_package.validation.checks.theme_check.status,
    determinism: 'passed'
  };
}

function run() {
  const expectations = loadExpectations();
  const knownFixtures = ['leather-travel-bags.json', 'handmade-rugs.json', 'skincare-brand.json', 'food-process.json'];
  assert.deepEqual(expectations.fixtures.map((expectation) => expectation.merchant_fixture).sort(), [...knownFixtures].sort(), 'Expectation manifest must cover each supported merchant fixture exactly once.');
  const reports = expectations.fixtures.map(runFixture);
  assert.equal(new Set(reports.map((report) => report.strategy)).size, reports.length, 'The merchant fixtures must produce distinct compiler strategies.');
  return reports;
}

if (require.main === module) {
  try {
    const reports = run();
    for (const report of reports) console.log(`PASS ${report.fixture_id}: strategy=${report.strategy}; sections=${report.sections.join(',')}; omitted=${report.omitted_sections.join(',')}; package=${report.package_validation}; theme-check=${report.theme_check}; determinism=${report.determinism}`);
    console.log(`Merchant Profile integration tests passed: ${reports.length} fixtures, approval gates, semantic expectations, repeat generation, read-only packages, Theme Check, and cleanup.`);
  } catch (error) {
    console.error(`${error.stack || error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  assertExpectation,
  assertEditorialGridMaterialization,
  assertLookbookMaterialization,
  assertCraftsmanshipMaterialization,
  assertManufacturingProcessMaterialization,
  approvedBlockPlanInput,
  fixtureGenerationContext,
  generatedHomepageSections,
  loadExpectations,
  removeGeneratedArtifacts,
  run,
  runFixture,
  semanticSnapshot
};
