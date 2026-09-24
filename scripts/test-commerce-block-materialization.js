#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { loadGeneratorMappings } = require('../ai/theme-generator/load-mappings');
const { BlockMaterializationError, loadPolicy, materializeSectionBlocks, stableBlockId } = require('../ai/theme-generator/materialize-section-blocks');

const root = path.resolve(__dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const planFile = 'fixtures/approved-block-plan-commerce.json';
const materializationFile = 'fixtures/block-materialization-commerce.json';
const invalidFile = 'fixtures/block-materialization-commerce-invalid.json';

function materialize(plan, snapshot, { policyId, sectionId, instanceId, pageRole = 'homepage', policy = null, blockIdFactory = stableBlockId }) {
  return materializeSectionBlocks({ root, approvedBlockPlan: plan, resourceSnapshot: snapshot, pageRole, sectionId, sectionInstanceId: instanceId, mappings: loadGeneratorMappings(root), policy: policy || loadPolicy(root, policyId), blockIdFactory });
}

function reject(category, work) {
  assert.throws(work, (error) => error instanceof BlockMaterializationError && error.category === category, `Expected ${category}.`);
}

function run() {
  const before = [planFile, materializationFile, invalidFile].map(hash);
  const plan = read(planFile); const fixture = read(materializationFile); const snapshot = fixture.resource_snapshot; const invalid = read(invalidFile);
  const originalPlan = clone(plan); const originalSnapshot = clone(snapshot);
  const cases = [
    { policyId:'cross_sell_products', sectionId:'cross-sell-products', instanceId:'calinium_home_cross_sell', role:'curated_cross_sell_product', expected:fixture.expected.cross_sell, type:'product' },
    { policyId:'product_bundle_showcase', sectionId:'product-bundle-showcase', instanceId:'calinium_home_bundle', role:'bundle_product', expected:fixture.expected.bundle, type:'product' },
    { policyId:'complementary_products_fallback', sectionId:'complementary-products', instanceId:'calinium_product_complementary', role:'fallback_product', expected:fixture.expected.fallback, type:'fallback_product', pageRole:'product_page' }
  ];
  for (const item of cases) {
    const result = materialize(plan,snapshot,item); assert.equal(result.applied,true); assert.deepEqual(result.block_order.map((id)=>result.blocks[id].settings.product),item.expected); assert.ok(result.block_order.every((id)=>result.blocks[id].type===item.type));
    const composition = plan.compositions.find((entry)=>entry.section_role===loadPolicy(root,item.policyId).semantic_section_role);
    assert.deepEqual(result.block_order,composition.block_placements.map((placement)=>stableBlockId({sectionInstanceId:item.instanceId,semanticBlockRole:item.role,placementId:placement.placement_id})));
  }
  const look = materialize(plan,snapshot,{policyId:'shop_the_look',sectionId:'shop-the-look',instanceId:'calinium_home_shop_look'});
  assert.equal(look.applied,true); assert.deepEqual(look.section_settings,{image:'dashboard://fixture-assets/rug-room-scene',mobile_image:'dashboard://fixture-assets/rug-room-scene-mobile'});
  assert.deepEqual(look.block_order.map((id)=>look.blocks[id].settings),fixture.expected.shop_the_look);
  assert.ok(!/approval|provenance|content_id|placement_id|semantic_/.test(JSON.stringify({settings:look.section_settings,blocks:look.blocks})),'Shopify JSON materialization must not leak approval metadata.');

  const reordered=clone(plan); const shop=reordered.compositions.find((entry)=>entry.section_role==='shop_the_look'); [shop.block_placements[0].order,shop.block_placements[1].order]=[2,1];
  const reorderedResult=materialize(reordered,snapshot,{policyId:'shop_the_look',sectionId:'shop-the-look',instanceId:'calinium_home_shop_look'});
  assert.deepEqual(reorderedResult.block_order,[...look.block_order].reverse()); assert.deepEqual(new Set(reorderedResult.block_order),new Set(look.block_order));

  const duplicate=clone(plan); duplicate.content_entities.abpc_cross_two.resource_reference_ids=['abprs_product_one'];
  const omitted=materialize(duplicate,snapshot,{policyId:'cross_sell_products',sectionId:'cross-sell-products',instanceId:'calinium_home_cross_sell'});
  assert.equal(omitted.block_order.length,1); assert.ok(omitted.warnings.some((warning)=>warning.includes('duplicate_destination')));
  const tooSmall=clone(plan); tooSmall.content_entities.abpc_bundle_two.resource_reference_ids=['abprs_product_two'];
  reject('minimum_block_count',()=>materialize(tooSmall,snapshot,{policyId:'product_bundle_showcase',sectionId:'product-bundle-showcase',instanceId:'calinium_home_bundle'}));
  const noScene=clone(plan); delete noScene.compositions.find((entry)=>entry.section_role==='shop_the_look').resource_reference_ids;
  reject('missing_primary_image',()=>materialize(noScene,snapshot,{policyId:'shop_the_look',sectionId:'shop-the-look',instanceId:'calinium_home_shop_look'}));
  const noMarker=clone(plan); delete noMarker.compositions.find((entry)=>entry.section_role==='shop_the_look').block_placements[0].marker_position;
  reject('invalid_marker_position',()=>materialize(noMarker,snapshot,{policyId:'shop_the_look',sectionId:'shop-the-look',instanceId:'calinium_home_shop_look'}));
  const drift=clone(snapshot); drift.resources.abprs_product_one.approved_revision='9999999999999999999999999999999999999999999999999999999999999999';
  reject('resource_revision_mismatch',()=>materialize(plan,drift,{policyId:'cross_sell_products',sectionId:'cross-sell-products',instanceId:'calinium_home_cross_sell'}));
  const badBlock=clone(loadPolicy(root,'cross_sell_products')); badBlock.runtime_block_type='unknown'; reject('unknown_runtime_block_type',()=>materialize(plan,snapshot,{policyId:'cross_sell_products',sectionId:'cross-sell-products',instanceId:'calinium_home_cross_sell',policy:badBlock}));
  const badSetting=clone(loadPolicy(root,'cross_sell_products')); badSetting.destination_mappings[0].runtime_setting_id='unknown'; reject('unknown_runtime_setting_id',()=>materialize(plan,snapshot,{policyId:'cross_sell_products',sectionId:'cross-sell-products',instanceId:'calinium_home_cross_sell',policy:badSetting}));
  reject('generated_block_id_collision',()=>materialize(plan,snapshot,{policyId:'cross_sell_products',sectionId:'cross-sell-products',instanceId:'calinium_home_cross_sell',blockIdFactory:()=> 'calinium_b_aaaaaaaaaaaaaaaaaaaa'}));
  assert.equal(invalid.cases.length,30,'Invalid commerce manifest must retain thirty isolated cases.'); assert.equal(new Set(invalid.cases.map((item)=>item.case_id)).size,30);
  assert.deepEqual(plan,originalPlan); assert.deepEqual(snapshot,originalSnapshot); assert.deepEqual([planFile,materializationFile,invalidFile].map(hash),before);
  console.log('Commerce block materialization passed: adapters=4, deterministic IDs/order=passed, section media=passed, isolated invalid cases=30, metadata leakage=none.');
}

run();
