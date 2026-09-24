#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { loadGeneratorMappings } = require('../ai/theme-generator/load-mappings');
const { generateTheme } = require('../ai/theme-generator/generate-theme');
const { approvedFixtureDraft, approvalFor, cleanupGeneratedArtifacts } = require('./test-theme-generator');
const { createFixtureApprovedBlockPlanTransport } = require('../pipeline/resolve-approved-block-plan-transport');
const {
  BlockMaterializationError,
  loadPolicy,
  materializeSectionBlocks,
  stableBlockId
} = require('../ai/theme-generator/materialize-section-blocks');

const root = path.resolve(__dirname, '..');

function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function checksum(relative) { return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex'); }

function pointerParts(pointer) {
  return pointer.slice(1).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function applyOperation(value, operation) {
  const parts = pointerParts(operation.path);
  const key = parts.pop();
  const parent = parts.reduce((current, part) => Array.isArray(current) ? current[Number(part)] : current[part], value);
  assert.notEqual(parent, undefined, `Fixture operation path ${operation.path} does not resolve.`);
  const index = Array.isArray(parent) ? Number(key) : key;
  if (operation.op === 'remove') {
    if (Array.isArray(parent)) parent.splice(index, 1);
    else delete parent[key];
  } else if (operation.op === 'replace') {
    parent[index] = clone(operation.value);
  } else if (operation.op === 'add') {
    if (Array.isArray(parent)) parent.splice(index, 0, clone(operation.value));
    else parent[index] = clone(operation.value);
  } else {
    throw new Error(`Unsupported fixture operation ${operation.op}.`);
  }
}

function derive(value, operations = []) {
  const next = clone(value);
  for (const operation of operations) applyOperation(next, operation);
  return next;
}

function reversedKeys(value) {
  if (Array.isArray(value)) return value.map(reversedKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).reverse().map((key) => [key, reversedKeys(value[key])]));
}

function materialize(plan, resourceSnapshot, options = {}) {
  return materializeSectionBlocks({
    root,
    approvedBlockPlan: plan,
    resourceSnapshot,
    pageRole: options.pageRole || 'homepage',
    sectionId: options.sectionId || 'editorial-grid',
    sectionInstanceId: options.sectionInstanceId || 'calinium_homepage_editorial_grid',
    mappings: loadGeneratorMappings(root),
    policy: options.policy,
    blockIdFactory: options.blockIdFactory
  });
}

function assertReject(operation, expression) {
  assert.throws(expression, (error) => error instanceof BlockMaterializationError && error.message.includes(operation), `Expected failure containing ${operation}.`);
}

function run() {
  const planFile = 'fixtures/approved-block-plan-editorial-grid.json';
  const fixtureFile = 'fixtures/block-materialization-editorial-grid.json';
  const invalidFile = 'fixtures/block-materialization-invalid.json';
  const checksums = { plan: checksum(planFile), fixture: checksum(fixtureFile), invalid: checksum(invalidFile) };
  const plan = readJson(planFile);
  const fixture = readJson(fixtureFile);
  const invalid = readJson(invalidFile);
  const snapshot = fixture.resource_snapshot;
  const originalPlan = clone(plan);
  const originalSnapshot = clone(snapshot);

  const first = materialize(plan, snapshot);
  assert.equal(first.applied, true, 'Approved Editorial Grid plan must materialize blocks.');
  assert.equal(Object.keys(first.blocks).length, fixture.expected.block_count, 'Approved plan must materialize two stories.');
  assert.equal(first.block_order.length, fixture.expected.block_count, 'Approved story order must be emitted.');
  assert.deepEqual(first.block_order, fixture.expected.block_orders.map((placementId) => stableBlockId({
    sectionInstanceId: 'calinium_homepage_editorial_grid', semanticBlockRole: 'editorial_story', placementId
  })), 'Block IDs must derive only from section instance, semantic role, and placement identity.');
  const firstBlock = first.blocks[first.block_order[0]];
  const secondBlock = first.blocks[first.block_order[1]];
  assert.deepEqual(firstBlock, {
    type: 'story',
    settings: {
      image: 'shopify://fixture-assets/oak-loom-rug-care-image',
      collection: 'shopify://fixture-resources/oak-loom-rug-care-collection',
      heading: 'Rug care guides',
      excerpt: 'Care guidance approved by Oak & Loom for its natural-fiber rugs.'
    }
  }, 'The collection story must preserve only approved content and its approved runtime resource value.');
  assert.deepEqual(secondBlock, {
    type: 'story',
    settings: {
      article: 'shopify://fixture-resources/oak-loom-natural-fiber-journal',
      heading: 'Natural-fiber journal'
    }
  }, 'The article story must preserve approved heading and exact resource snapshot value.');
  assert.ok(!JSON.stringify(first.blocks).match(/content_entity_id|placement_id|semantic_block_role|approval_id/), 'Semantic plan fields must not leak into Shopify JSON blocks.');

  const reordered = clone(plan);
  reordered.compositions[0].block_placements[0].order = 2;
  reordered.compositions[0].block_placements[1].order = 1;
  const reorderedResult = materialize(reordered, snapshot);
  assert.deepEqual(new Set(reorderedResult.block_order), new Set(first.block_order), 'Reordering approved placements must not change generated block IDs.');
  assert.deepEqual(reorderedResult.block_order, [...first.block_order].reverse(), 'Approved placement order must become generated block order.');

  const editedText = clone(plan);
  editedText.content_entities['abpc_rug-care-guides'].localized_values[0].value = 'Oak & Loom rug care guides';
  const editedTextResult = materialize(editedText, snapshot);
  assert.deepEqual(editedTextResult.block_order, first.block_order, 'Approved text changes must not change placement-derived block IDs.');

  const reorderedKeysResult = materialize(reversedKeys(plan), reversedKeys(snapshot));
  assert.deepEqual(reorderedKeysResult, first, 'Irrelevant object-key ordering must not change materialization.');

  const externalPlan = derive(plan, fixture.external_destination_case.plan_operations);
  const externalSnapshot = derive({ resource_snapshot: snapshot }, fixture.external_destination_case.resource_operations).resource_snapshot;
  const externalResult = materialize(externalPlan, externalSnapshot);
  assert.equal(externalResult.blocks[externalResult.block_order[1]].settings.link, 'https://oakandloom.example/journal/natural-fiber', 'A separately approved external destination must materialize only to link.');
  assert.equal(externalResult.blocks[externalResult.block_order[1]].settings.article, undefined, 'External destination must not be translated into an article reference.');

  const noPlan = materializeSectionBlocks({ root, approvedBlockPlan: null, resourceSnapshot: null, pageRole: 'homepage', sectionId: 'editorial-grid', sectionInstanceId: 'calinium_homepage_editorial_grid', mappings: loadGeneratorMappings(root) });
  assert.deepEqual(noPlan, { applied: false, blocks: null, block_order: null, warnings: [], omissions: [] }, 'No plan must preserve shell-only generation without adding blocks.');
  assert.equal(materialize(plan, snapshot, { sectionId: 'lookbook' }).applied, false, 'An Editorial Grid plan must never materialize blocks into Lookbook.');

  let omissions = 0;
  let rejections = 0;
  for (const testCase of invalid.cases) {
    const casePlan = derive(plan, testCase.plan_operations || []);
    const caseSnapshot = derive({ resource_snapshot: snapshot }, testCase.resource_operations || []).resource_snapshot;
    const options = testCase.context?.page_role ? { pageRole: testCase.context.page_role } : {};
    if (testCase.expected === 'omit') {
      const result = materialize(casePlan, caseSnapshot, options);
      assert.ok(result.warnings.some((warning) => warning.includes(testCase.expected_warning)), `${testCase.case_id} must produce its deterministic omission warning.`);
      omissions += 1;
    } else if (testCase.expected === 'materialize') {
      const result = materialize(casePlan, caseSnapshot, options);
      assert.equal(result.applied, true, `${testCase.case_id} must still materialize valid blocks.`);
      assert.equal(result.blocks[result.block_order[0]].settings.excerpt, undefined, `${testCase.case_id} must not invent an optional excerpt.`);
    } else {
      assertReject(testCase.expected_error, () => materialize(casePlan, caseSnapshot, options));
      rejections += 1;
    }
  }

  const policy = loadPolicy(root);
  const unknownSettingPolicy = clone(policy);
  unknownSettingPolicy.localized_value_mappings[0].runtime_setting_id = 'unknown_setting';
  assertReject('unknown runtime setting ID', () => materialize(plan, snapshot, { policy: unknownSettingPolicy }));
  const unknownBlockPolicy = clone(policy);
  unknownBlockPolicy.runtime_block_type = 'unknown';
  assertReject('unknown runtime block type', () => materialize(plan, snapshot, { policy: unknownBlockPolicy }));
  const oneBlockPolicy = clone(policy);
  oneBlockPolicy.max_blocks = 1;
  assertReject('placement count exceeds 1', () => materialize(plan, snapshot, { policy: oneBlockPolicy }));
  assertReject('Generated block ID collision', () => materialize(plan, snapshot, { blockIdFactory: () => 'calinium_b_aaaaaaaaaaaaaaaaaaaa' }));

  const invalidGenerationId = `generation-run-block-plan-invalid-${process.pid}`;
  const unapprovedPlan = clone(plan);
  unapprovedPlan.approval.approval_status = 'draft';
  const draft = approvedFixtureDraft();
  assert.throws(() => createFixtureApprovedBlockPlanTransport({ plan: unapprovedPlan, resourceSnapshot: snapshot, root }), /Approved Block Plan revision is invalid/, 'An unapproved plan must fail before transport creation.');
  assert.throws(() => generateTheme({
    root,
    draft,
    approval: approvalFor(draft),
    generationId: invalidGenerationId,
    outputRoot: path.join(root, 'output'),
    approvedBlockPlanTransport: { plan_revision: {}, resource_snapshot: {} }
  }), /resolved server-side/, 'Generator must reject arbitrary caller-provided transport objects before workspace creation.');
  assert.ok(!fs.existsSync(path.join(root, 'output', invalidGenerationId)), 'An invalid plan must be rejected before a generated workspace exists.');
  cleanupGeneratedArtifacts([invalidGenerationId]);

  const lookbookPlanFile = 'fixtures/approved-block-plan-lookbook.json';
  const lookbookFixtureFile = 'fixtures/block-materialization-lookbook.json';
  const lookbookInvalidFile = 'fixtures/block-materialization-lookbook-invalid.json';
  const lookbookChecksums = {
    plan: checksum(lookbookPlanFile),
    fixture: checksum(lookbookFixtureFile),
    invalid: checksum(lookbookInvalidFile)
  };
  const lookbookPlan = readJson(lookbookPlanFile);
  const lookbookSnapshot = readJson(lookbookFixtureFile).resource_snapshot;
  const lookbookInvalid = readJson(lookbookInvalidFile);
  const lookbookOriginalPlan = clone(lookbookPlan);
  const lookbookOriginalSnapshot = clone(lookbookSnapshot);
  const lookbookFirst = materialize(lookbookPlan, lookbookSnapshot, { sectionId: 'lookbook', sectionInstanceId: 'calinium_homepage_lookbook' });
  assert.equal(lookbookFirst.applied, true, 'Approved Lookbook plan must materialize item blocks.');
  assert.equal(lookbookFirst.block_order.length, 2, 'The Lookbook fixture must materialize two approved frames.');
  assert.deepEqual(lookbookFirst.block_order, [
    stableBlockId({ sectionInstanceId: 'calinium_homepage_lookbook', semanticBlockRole: 'lookbook_frame', placementId: 'abpl_oak-loom-lookbook-feature' }),
    stableBlockId({ sectionInstanceId: 'calinium_homepage_lookbook', semanticBlockRole: 'lookbook_frame', placementId: 'abpl_oak-loom-lookbook-care' })
  ], 'Lookbook IDs must use the shared placement-derived stable-ID convention.');
  assert.deepEqual(lookbookFirst.blocks[lookbookFirst.block_order[0]], {
    type: 'item', settings: {
      image: 'dashboard://fixture-assets/oak-loom-lookbook-primary',
      mobile_image: 'dashboard://fixture-assets/oak-loom-lookbook-mobile',
      product: 'oak-loom-loom-rug',
      title: 'The Loom Collection', text: 'Approved editorial detail for Oak & Loom.', media_ratio: 'portrait'
    }
  }, 'Lookbook must preserve the exact approved image, mobile image, product, title, text, and ratio.');
  assert.deepEqual(lookbookFirst.blocks[lookbookFirst.block_order[1]], {
    type: 'item', settings: {
      image: 'dashboard://fixture-assets/oak-loom-care', collection: 'oak-loom-care', title: 'Care and longevity', media_ratio: 'landscape'
    }
  }, 'Lookbook must preserve the approved collection destination without inventing optional text.');
  const lookbookReordered = clone(lookbookPlan);
  lookbookReordered.compositions[0].block_placements[0].order = 2;
  lookbookReordered.compositions[0].block_placements[1].order = 1;
  const lookbookReorderedResult = materialize(lookbookReordered, lookbookSnapshot, { sectionId: 'lookbook', sectionInstanceId: 'calinium_homepage_lookbook' });
  assert.deepEqual(new Set(lookbookReorderedResult.block_order), new Set(lookbookFirst.block_order), 'Lookbook reordering must not alter block IDs.');
  assert.deepEqual(lookbookReorderedResult.block_order, [...lookbookFirst.block_order].reverse(), 'Lookbook reordering must affect only block_order.');
  const lookbookKeysResult = materialize(reversedKeys(lookbookPlan), reversedKeys(lookbookSnapshot), { sectionId: 'lookbook', sectionInstanceId: 'calinium_homepage_lookbook' });
  assert.deepEqual(lookbookKeysResult, lookbookFirst, 'Lookbook output must ignore irrelevant object-key ordering.');
  for (const testCase of lookbookInvalid.cases) {
    const casePlan = derive(lookbookPlan, testCase.plan_operations || []);
    const caseSnapshot = derive(lookbookSnapshot, testCase.resource_operations || []);
    if (testCase.expected === 'omit') {
      const result = materialize(casePlan, caseSnapshot, { sectionId: 'lookbook', sectionInstanceId: 'calinium_homepage_lookbook' });
      assert.ok(result.warnings.some((warning) => warning.includes(testCase.expected_warning)), `${testCase.case_id} must have a deterministic Lookbook omission warning.`);
    } else if (testCase.expected === 'materialize') {
      const result = materialize(casePlan, caseSnapshot, { sectionId: 'lookbook', sectionInstanceId: 'calinium_homepage_lookbook' });
      assert.equal(result.applied, true, `${testCase.case_id} must keep a valid Lookbook frame.`);
      assert.equal(result.blocks[result.block_order[0]].settings.mobile_image, undefined, 'Optional mobile media must be omitted rather than invented.');
    } else {
      assertReject(testCase.expected_error, () => materialize(casePlan, caseSnapshot, { sectionId: 'lookbook', sectionInstanceId: 'calinium_homepage_lookbook' }));
    }
  }
  const lookbookPolicy = loadPolicy(root, 'lookbook');
  const lookbookUnknownSetting = clone(lookbookPolicy);
  lookbookUnknownSetting.localized_value_mappings[0].runtime_setting_id = 'unknown_setting';
  assertReject('unknown runtime setting ID', () => materialize(lookbookPlan, lookbookSnapshot, { sectionId: 'lookbook', sectionInstanceId: 'calinium_homepage_lookbook', policy: lookbookUnknownSetting }));
  const lookbookOverflow = clone(lookbookPlan);
  lookbookOverflow.compositions[0].block_placements = Array.from({ length: 7 }, (_, index) => ({ ...clone(lookbookPlan.compositions[0].block_placements[0]), placement_id: `abpl_oak-loom-lookbook-overflow-${index + 1}`, order: index + 1 }));
  assertReject('placement count exceeds 6', () => materialize(lookbookOverflow, lookbookSnapshot, { sectionId: 'lookbook', sectionInstanceId: 'calinium_homepage_lookbook' }));
  assert.deepEqual(lookbookPlan, lookbookOriginalPlan, 'Lookbook materialization must not mutate the Approved Block Plan input.');
  assert.deepEqual(lookbookSnapshot, lookbookOriginalSnapshot, 'Lookbook materialization must not mutate its approved resource snapshot.');
  assert.deepEqual(lookbookChecksums, {
    plan: checksum(lookbookPlanFile),
    fixture: checksum(lookbookFixtureFile),
    invalid: checksum(lookbookInvalidFile)
  }, 'Lookbook materialization must leave all source fixtures byte-for-byte unchanged.');

  const craftsmanshipPlanFile = 'fixtures/approved-block-plan-craftsmanship.json';
  const craftsmanshipFixtureFile = 'fixtures/block-materialization-craftsmanship.json';
  const craftsmanshipInvalidFile = 'fixtures/block-materialization-craftsmanship-invalid.json';
  const craftsmanshipChecksums = {
    plan: checksum(craftsmanshipPlanFile), fixture: checksum(craftsmanshipFixtureFile), invalid: checksum(craftsmanshipInvalidFile)
  };
  const craftsmanshipPlan = readJson(craftsmanshipPlanFile);
  const craftsmanshipFixture = readJson(craftsmanshipFixtureFile);
  const craftsmanshipSnapshot = craftsmanshipFixture.resource_snapshot;
  const craftsmanshipInvalid = readJson(craftsmanshipInvalidFile);
  const craftsmanshipOriginalPlan = clone(craftsmanshipPlan);
  const craftsmanshipOriginalSnapshot = clone(craftsmanshipSnapshot);
  const craftsmanshipFirst = materialize(craftsmanshipPlan, craftsmanshipSnapshot, { sectionId: 'craftsmanship', sectionInstanceId: 'calinium_homepage_craftsmanship' });
  assert.equal(craftsmanshipFirst.applied, true, 'Approved Craftsmanship evidence must materialize craft_step blocks.');
  assert.deepEqual(craftsmanshipFirst.block_order, craftsmanshipFixture.expected.block_orders.map((placementId) => stableBlockId({
    sectionInstanceId: 'calinium_homepage_craftsmanship', semanticBlockRole: 'craftsmanship_step', placementId
  })), 'Craftsmanship IDs must use the shared placement-derived stable-ID convention.');
  assert.deepEqual(craftsmanshipFirst.blocks[craftsmanshipFirst.block_order[0]], {
    type: 'craft_step', settings: {
      image: 'dashboard://fixture-assets/craftsmanship-edge', heading: 'Edge finishing', text: 'Fixture-only merchant evidence: each approved edge is finished after construction.', craft_icon: 'settings'
    }
  }, 'Craftsmanship must preserve only exact approved factual text, image binding, and bounded icon value.');
  assert.deepEqual(craftsmanshipFirst.blocks[craftsmanshipFirst.block_order[1]], {
    type: 'craft_step', settings: { heading: 'Hardware check', craft_icon: 'diamond' }
  }, 'Craftsmanship must permit an evidence-backed text-light step without inventing image or explanatory copy.');
  assert.ok(!JSON.stringify(craftsmanshipFirst.blocks).match(/content_entity_id|placement_id|semantic_block_role|approval_id|evidence_reference/), 'Craftsmanship semantic evidence must not leak into Shopify JSON blocks.');
  const craftsmanshipReordered = clone(craftsmanshipPlan);
  craftsmanshipReordered.compositions[0].block_placements[0].order = 2;
  craftsmanshipReordered.compositions[0].block_placements[1].order = 1;
  const craftsmanshipReorderedResult = materialize(craftsmanshipReordered, craftsmanshipSnapshot, { sectionId: 'craftsmanship', sectionInstanceId: 'calinium_homepage_craftsmanship' });
  assert.deepEqual(new Set(craftsmanshipReorderedResult.block_order), new Set(craftsmanshipFirst.block_order), 'Craftsmanship reordering must not alter generated block IDs.');
  assert.deepEqual(craftsmanshipReorderedResult.block_order, [...craftsmanshipFirst.block_order].reverse(), 'Craftsmanship reordering must affect only block_order.');
  const craftsmanshipKeysResult = materialize(reversedKeys(craftsmanshipPlan), reversedKeys(craftsmanshipSnapshot), { sectionId: 'craftsmanship', sectionInstanceId: 'calinium_homepage_craftsmanship' });
  assert.deepEqual(craftsmanshipKeysResult, craftsmanshipFirst, 'Craftsmanship output must ignore irrelevant object-key ordering.');
  for (const testCase of craftsmanshipInvalid.cases) {
    const casePlan = derive(craftsmanshipPlan, testCase.plan_operations || []);
    const caseSnapshot = derive(craftsmanshipSnapshot, testCase.resource_operations || []);
    if (testCase.expected === 'omit') {
      const result = materialize(casePlan, caseSnapshot, { sectionId: 'craftsmanship', sectionInstanceId: 'calinium_homepage_craftsmanship' });
      assert.ok(result.warnings.some((warning) => warning.includes(testCase.expected_warning)), `${testCase.case_id} must have a deterministic Craftsmanship omission warning.`);
    } else if (testCase.expected === 'materialize') {
      const result = materialize(casePlan, caseSnapshot, { sectionId: 'craftsmanship', sectionInstanceId: 'calinium_homepage_craftsmanship' });
      assert.equal(result.applied, true, `${testCase.case_id} must keep its valid evidence steps.`);
      assert.equal(result.blocks[result.block_order[0]].settings.image, undefined, 'Missing optional Craftsmanship media must be omitted rather than invented.');
    } else {
      assertReject(testCase.expected_error, () => materialize(casePlan, caseSnapshot, { sectionId: 'craftsmanship', sectionInstanceId: 'calinium_homepage_craftsmanship' }));
    }
  }
  const craftsmanshipPolicy = loadPolicy(root, 'craftsmanship');
  const craftsmanshipUnknownSetting = clone(craftsmanshipPolicy);
  craftsmanshipUnknownSetting.localized_value_mappings[0].runtime_setting_id = 'unknown_setting';
  assertReject('unknown runtime setting ID', () => materialize(craftsmanshipPlan, craftsmanshipSnapshot, { sectionId: 'craftsmanship', sectionInstanceId: 'calinium_homepage_craftsmanship', policy: craftsmanshipUnknownSetting }));
  const craftsmanshipOverflow = clone(craftsmanshipPlan);
  craftsmanshipOverflow.compositions[0].block_placements = Array.from({ length: 9 }, (_, index) => ({ ...clone(craftsmanshipPlan.compositions[0].block_placements[0]), placement_id: `abpl_fixture_craftsmanship_overflow_${index + 1}`, order: index + 1 }));
  assertReject('placement count exceeds 8', () => materialize(craftsmanshipOverflow, craftsmanshipSnapshot, { sectionId: 'craftsmanship', sectionInstanceId: 'calinium_homepage_craftsmanship' }));
  assert.deepEqual(craftsmanshipPlan, craftsmanshipOriginalPlan, 'Craftsmanship materialization must not mutate the Approved Block Plan input.');
  assert.deepEqual(craftsmanshipSnapshot, craftsmanshipOriginalSnapshot, 'Craftsmanship materialization must not mutate the approved resource snapshot.');
  assert.deepEqual(craftsmanshipChecksums, {
    plan: checksum(craftsmanshipPlanFile), fixture: checksum(craftsmanshipFixtureFile), invalid: checksum(craftsmanshipInvalidFile)
  }, 'Craftsmanship materialization must leave all source fixtures byte-for-byte unchanged.');

  const manufacturingProcessPlanFile = 'fixtures/approved-block-plan-manufacturing-process.json';
  const manufacturingProcessFixtureFile = 'fixtures/block-materialization-manufacturing-process.json';
  const manufacturingProcessInvalidFile = 'fixtures/block-materialization-manufacturing-process-invalid.json';
  const manufacturingProcessChecksums = {
    plan: checksum(manufacturingProcessPlanFile), fixture: checksum(manufacturingProcessFixtureFile), invalid: checksum(manufacturingProcessInvalidFile)
  };
  const manufacturingProcessPlan = readJson(manufacturingProcessPlanFile);
  const manufacturingProcessFixture = readJson(manufacturingProcessFixtureFile);
  const manufacturingProcessSnapshot = manufacturingProcessFixture.resource_snapshot;
  const manufacturingProcessInvalid = readJson(manufacturingProcessInvalidFile);
  const manufacturingProcessOriginalPlan = clone(manufacturingProcessPlan);
  const manufacturingProcessOriginalSnapshot = clone(manufacturingProcessSnapshot);
  const manufacturingProcessFirst = materialize(manufacturingProcessPlan, manufacturingProcessSnapshot, { sectionId: 'manufacturing-process', sectionInstanceId: 'calinium_homepage_manufacturing_process' });
  assert.equal(manufacturingProcessFirst.applied, true, 'Approved Manufacturing Process stages must materialize process_step blocks.');
  assert.deepEqual(manufacturingProcessFirst.block_order, manufacturingProcessFixture.expected.block_orders.map((placementId) => stableBlockId({
    sectionInstanceId: 'calinium_homepage_manufacturing_process', semanticBlockRole: 'manufacturing_process_step', placementId
  })), 'Manufacturing Process IDs must use the shared placement-derived stable-ID convention.');
  assert.deepEqual(manufacturingProcessFirst.blocks[manufacturingProcessFirst.block_order[0]], {
    type: 'process_step', settings: {
      image: 'dashboard://fixture-assets/process-preparation', heading: 'Preparation', text: 'Fixture-only merchant-approved description of the preparation stage.', process_icon: 'settings'
    }
  }, 'Manufacturing Process must preserve only approved ordered-stage text, image binding, and bounded icon value.');
  assert.deepEqual(manufacturingProcessFirst.blocks[manufacturingProcessFirst.block_order[1]], {
    type: 'process_step', settings: { heading: 'Packing', process_icon: 'package' }
  }, 'Manufacturing Process must permit a verified stage without invented optional media or explanation.');
  assert.ok(!JSON.stringify(manufacturingProcessFirst.blocks).match(/content_entity_id|placement_id|semantic_block_role|approval_id|evidence_reference/), 'Manufacturing Process semantic evidence must not leak into Shopify JSON blocks.');
  const manufacturingProcessReordered = clone(manufacturingProcessPlan);
  manufacturingProcessReordered.compositions[0].block_placements[0].order = 2;
  manufacturingProcessReordered.compositions[0].block_placements[1].order = 1;
  const manufacturingProcessReorderedResult = materialize(manufacturingProcessReordered, manufacturingProcessSnapshot, { sectionId: 'manufacturing-process', sectionInstanceId: 'calinium_homepage_manufacturing_process' });
  assert.deepEqual(new Set(manufacturingProcessReorderedResult.block_order), new Set(manufacturingProcessFirst.block_order), 'Manufacturing Process reordering must not alter generated block IDs.');
  assert.deepEqual(manufacturingProcessReorderedResult.block_order, [...manufacturingProcessFirst.block_order].reverse(), 'Manufacturing Process reordering must affect only block_order.');
  const manufacturingProcessTextEdit = clone(manufacturingProcessPlan);
  manufacturingProcessTextEdit.content_entities.abpc_fixture_process_preparation.localized_values[0].value = 'Revised preparation';
  assert.deepEqual(materialize(manufacturingProcessTextEdit, manufacturingProcessSnapshot, { sectionId: 'manufacturing-process', sectionInstanceId: 'calinium_homepage_manufacturing_process' }).block_order, manufacturingProcessFirst.block_order, 'Text edits must not change Manufacturing Process block IDs.');
  const manufacturingProcessKeysResult = materialize(reversedKeys(manufacturingProcessPlan), reversedKeys(manufacturingProcessSnapshot), { sectionId: 'manufacturing-process', sectionInstanceId: 'calinium_homepage_manufacturing_process' });
  assert.deepEqual(manufacturingProcessKeysResult, manufacturingProcessFirst, 'Manufacturing Process output must ignore irrelevant object-key ordering.');
  for (const testCase of manufacturingProcessInvalid.cases) {
    const casePlan = derive(manufacturingProcessPlan, testCase.plan_operations || []);
    const caseSnapshot = derive(manufacturingProcessSnapshot, testCase.resource_operations || []);
    if (testCase.expected === 'omit') {
      const result = materialize(casePlan, caseSnapshot, { sectionId: 'manufacturing-process', sectionInstanceId: 'calinium_homepage_manufacturing_process' });
      assert.ok(result.warnings.some((warning) => warning.includes(testCase.expected_warning)), `${testCase.case_id} must have a deterministic Manufacturing Process omission warning.`);
    } else if (testCase.expected === 'materialize') {
      const result = materialize(casePlan, caseSnapshot, { sectionId: 'manufacturing-process', sectionInstanceId: 'calinium_homepage_manufacturing_process' });
      assert.equal(result.applied, true, `${testCase.case_id} must keep valid Manufacturing Process stages.`);
      assert.equal(result.blocks[result.block_order[0]].settings.image, undefined, 'Optional Manufacturing Process media must be omitted rather than invented.');
    } else {
      assertReject(testCase.expected_error, () => materialize(casePlan, caseSnapshot, { sectionId: 'manufacturing-process', sectionInstanceId: 'calinium_homepage_manufacturing_process' }));
    }
  }
  const manufacturingProcessPolicy = loadPolicy(root, 'manufacturing_process');
  const manufacturingProcessUnknownSetting = clone(manufacturingProcessPolicy);
  manufacturingProcessUnknownSetting.localized_value_mappings[0].runtime_setting_id = 'unknown_setting';
  assertReject('unknown runtime setting ID', () => materialize(manufacturingProcessPlan, manufacturingProcessSnapshot, { sectionId: 'manufacturing-process', sectionInstanceId: 'calinium_homepage_manufacturing_process', policy: manufacturingProcessUnknownSetting }));
  const manufacturingProcessUnknownBlock = clone(manufacturingProcessPolicy);
  manufacturingProcessUnknownBlock.runtime_block_type = 'unknown';
  assertReject('unknown runtime block type', () => materialize(manufacturingProcessPlan, manufacturingProcessSnapshot, { sectionId: 'manufacturing-process', sectionInstanceId: 'calinium_homepage_manufacturing_process', policy: manufacturingProcessUnknownBlock }));
  const manufacturingProcessOverflow = clone(manufacturingProcessPlan);
  manufacturingProcessOverflow.compositions[0].block_placements = Array.from({ length: 11 }, (_, index) => ({ ...clone(manufacturingProcessPlan.compositions[0].block_placements[0]), placement_id: `abpl_fixture_process_overflow_${index + 1}`, order: index + 1 }));
  assertReject('placement count exceeds 10', () => materialize(manufacturingProcessOverflow, manufacturingProcessSnapshot, { sectionId: 'manufacturing-process', sectionInstanceId: 'calinium_homepage_manufacturing_process' }));
  assertReject('Generated block ID collision', () => materialize(manufacturingProcessPlan, manufacturingProcessSnapshot, { sectionId: 'manufacturing-process', sectionInstanceId: 'calinium_homepage_manufacturing_process', blockIdFactory: () => 'calinium_b_aaaaaaaaaaaaaaaaaaaa' }));
  assert.equal(materialize(manufacturingProcessPlan, manufacturingProcessSnapshot, { sectionId: 'craftsmanship', sectionInstanceId: 'calinium_homepage_craftsmanship' }).applied, false, 'Manufacturing Process content must not materialize into Craftsmanship.');
  assert.deepEqual(manufacturingProcessPlan, manufacturingProcessOriginalPlan, 'Manufacturing Process materialization must not mutate the Approved Block Plan input.');
  assert.deepEqual(manufacturingProcessSnapshot, manufacturingProcessOriginalSnapshot, 'Manufacturing Process materialization must not mutate the approved resource snapshot.');
  assert.deepEqual(manufacturingProcessChecksums, {
    plan: checksum(manufacturingProcessPlanFile), fixture: checksum(manufacturingProcessFixtureFile), invalid: checksum(manufacturingProcessInvalidFile)
  }, 'Manufacturing Process materialization must leave all source fixtures byte-for-byte unchanged.');

  const evidenceAdapters = [
    { label: 'Brand Timeline', plan: 'fixtures/approved-block-plan-brand-timeline.json', fixture: 'fixtures/block-materialization-brand-timeline.json', invalid: 'fixtures/block-materialization-brand-timeline-invalid.json', sectionId: 'brand-timeline', policyId: 'brand_timeline', instanceId: 'calinium_homepage_brand_timeline' },
    { label: 'Sustainability', plan: 'fixtures/approved-block-plan-sustainability.json', fixture: 'fixtures/block-materialization-sustainability.json', invalid: 'fixtures/block-materialization-sustainability-invalid.json', sectionId: 'sustainability', policyId: 'sustainability', instanceId: 'calinium_homepage_sustainability' },
    { label: 'Team', plan: 'fixtures/approved-block-plan-team.json', fixture: 'fixtures/block-materialization-team.json', invalid: 'fixtures/block-materialization-team-invalid.json', sectionId: 'team', policyId: 'team', instanceId: 'calinium_homepage_team' },
    { label: 'Awards and Certifications', plan: 'fixtures/approved-block-plan-awards-certifications.json', fixture: 'fixtures/block-materialization-awards-certifications.json', invalid: 'fixtures/block-materialization-awards-certifications-invalid.json', sectionId: 'awards-certifications', policyId: 'awards_certifications', instanceId: 'calinium_homepage_awards_certifications' }
  ];
  let evidenceBlocks = 0;
  for (const adapter of evidenceAdapters) {
    const sourceChecksums = { plan: checksum(adapter.plan), fixture: checksum(adapter.fixture), invalid: checksum(adapter.invalid) };
    const evidencePlan = readJson(adapter.plan); const evidenceFixture = readJson(adapter.fixture); const evidenceInvalid = readJson(adapter.invalid);
    const evidenceSnapshot = evidenceFixture.resource_snapshot; const originalEvidencePlan = clone(evidencePlan); const originalEvidenceSnapshot = clone(evidenceSnapshot);
    const result = materialize(evidencePlan, evidenceSnapshot, { sectionId: adapter.sectionId, sectionInstanceId: adapter.instanceId });
    assert.equal(result.applied, true, `${adapter.label} must materialize approved evidence blocks.`);
    assert.equal(result.block_order.length, evidenceFixture.expected.block_count, `${adapter.label} must preserve the approved block count.`);
    const semanticRole = evidencePlan.compositions[0].block_placements[0].semantic_block_role;
    assert.deepEqual(result.block_order, evidenceFixture.expected.block_orders.map((placementId) => stableBlockId({ sectionInstanceId: adapter.instanceId, semanticBlockRole: semanticRole, placementId })), `${adapter.label} IDs must use the shared stable placement convention.`);
    assert.ok(!JSON.stringify(result.blocks).match(/content_entity_id|placement_id|semantic_block_role|approval_id|evidence_reference/), `${adapter.label} must not leak semantic or approval metadata into Shopify JSON.`);
    const reorderedPlan = clone(evidencePlan);
    if (reorderedPlan.compositions[0].block_placements.length > 1) {
      reorderedPlan.compositions[0].block_placements[0].order = 2; reorderedPlan.compositions[0].block_placements[1].order = 1;
      const reorderedResult = materialize(reorderedPlan, evidenceSnapshot, { sectionId: adapter.sectionId, sectionInstanceId: adapter.instanceId });
      assert.deepEqual(new Set(reorderedResult.block_order), new Set(result.block_order), `${adapter.label} reordering must preserve block IDs.`);
      assert.deepEqual(reorderedResult.block_order, [...result.block_order].reverse(), `${adapter.label} reordering must affect only block order.`);
    }
    assert.deepEqual(materialize(reversedKeys(evidencePlan), reversedKeys(evidenceSnapshot), { sectionId: adapter.sectionId, sectionInstanceId: adapter.instanceId }), result, `${adapter.label} must ignore irrelevant JSON-key ordering.`);
    for (const testCase of evidenceInvalid.cases) {
      const casePlan = derive(evidencePlan, testCase.plan_operations || []);
      if (testCase.expected === 'omit') {
        const omitted = materialize(casePlan, evidenceSnapshot, { sectionId: adapter.sectionId, sectionInstanceId: adapter.instanceId });
        assert.ok(omitted.warnings.some((warning) => warning.includes(testCase.expected_warning)), `${adapter.label}:${testCase.case_id} must produce a deterministic omission.`);
      } else assertReject(testCase.expected_error, () => materialize(casePlan, evidenceSnapshot, { sectionId: adapter.sectionId, sectionInstanceId: adapter.instanceId }));
    }
    const policyWithUnknownSetting = clone(loadPolicy(root, adapter.policyId)); policyWithUnknownSetting.localized_value_mappings[0].runtime_setting_id = 'unknown_setting';
    assertReject('unknown runtime setting ID', () => materialize(evidencePlan, evidenceSnapshot, { sectionId: adapter.sectionId, sectionInstanceId: adapter.instanceId, policy: policyWithUnknownSetting }));
    assert.deepEqual(evidencePlan, originalEvidencePlan, `${adapter.label} materialization must not mutate the Approved Block Plan input.`);
    assert.deepEqual(evidenceSnapshot, originalEvidenceSnapshot, `${adapter.label} materialization must not mutate its approved resource snapshot.`);
    assert.deepEqual(sourceChecksums, { plan: checksum(adapter.plan), fixture: checksum(adapter.fixture), invalid: checksum(adapter.invalid) }, `${adapter.label} materialization must leave fixtures byte-for-byte unchanged.`);
    evidenceBlocks += result.block_order.length;
  }

  assert.deepEqual(plan, originalPlan, 'Materialization must not mutate the Approved Block Plan input.');
  assert.deepEqual(snapshot, originalSnapshot, 'Materialization must not mutate the approved resource snapshot.');
  assert.deepEqual(checksums, { plan: checksum(planFile), fixture: checksum(fixtureFile), invalid: checksum(invalidFile) }, 'Materialization tests must leave all source fixtures byte-for-byte unchanged.');
  return { blocks: first.block_order.length, lookbookBlocks: lookbookFirst.block_order.length, craftsmanshipBlocks: craftsmanshipFirst.block_order.length, manufacturingProcessBlocks: manufacturingProcessFirst.block_order.length, evidenceBlocks, omissions, rejections, determinism: 'passed' };
}

if (require.main === module) {
  try {
    const result = run();
    console.log(`Section block materialization tests passed: Editorial Grid blocks=${result.blocks}, Lookbook blocks=${result.lookbookBlocks}, Craftsmanship blocks=${result.craftsmanshipBlocks}, Manufacturing Process blocks=${result.manufacturingProcessBlocks}, evidence blocks=${result.evidenceBlocks}, omissions=${result.omissions}, hard-failures=${result.rejections}, determinism=${result.determinism}, and fixture immutability.`);
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

module.exports = { derive, materialize, run };
