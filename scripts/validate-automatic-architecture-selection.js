#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  loadArchitectureSelectionPolicy,
  selectArchitecture,
  createStoreIntelligenceContract,
  createMerchantIntent,
  architectureProvenance
} = require('../ai/architecture');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');

const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/automatic-architecture-selection.json'), 'utf8'));

function contracts(entry) {
  const source = entry.store;
  const storeIntelligence = createStoreIntelligenceContract({
    revisionId: `miv_${entry.id}`, normalizationVersion: 'store-intelligence-v1', status: 'usable',
    intelligence: { status: 'usable', category: { id: null, confidence: 'Unknown' }, catalog: { product_count: source.products, active_product_count: source.products, variant_count: source.variants, collection_count: source.collections }, navigation: { menu_count: source.menus, link_count: source.links, confidence: 'High' }, media: { product_media_count: source.product_media, usable_image_count: source.usable_images, video_count: 0, confidence: 'High' }, store: { market_count: 1, theme_count: 1, unpublished_theme_count: 1 }, source_health: { unavailable_sources: [] } }, root
  });
  const merchantIntent = createMerchantIntent({ storeIntelligence, architecturePreferences: entry.intent, architecturePreferenceRevision: `merchant-preference-${entry.id}`, root });
  return { storeIntelligence, merchantIntent };
}

function run() {
  const policy = loadArchitectureSelectionPolicy(root);
  assert.equal(policy.safety.automatic_repair_allowed, false);
  const validator = createSchemaValidator(root);
  for (const schema of ['schemas/calinium-architecture-selection-policy.schema.json', 'schemas/calinium-architecture-selection-outcome.schema.json', 'schemas/calinium-architecture-selection.schema.json', 'schemas/calinium-architecture-provenance.schema.json', 'schemas/calinium-store-intelligence-contract.schema.json', 'schemas/calinium-merchant-intent.schema.json', 'schemas/calinium-generated-theme.schema.json']) JSON.parse(fs.readFileSync(path.join(root, schema), 'utf8'));
  const proof = fixture.controlled_proof;
  const outcomes = {};
  for (const [key, id] of Object.entries(proof)) {
    const input = contracts(fixture.cases.find((entry) => entry.id === id));
    outcomes[key] = selectArchitecture({ ...input, selectionMode: 'automatic_beta', root });
  }
  assert.equal(outcomes.merchant_store_a.profile_id, 'profile.current_calinium.v1');
  assert.equal(outcomes.merchant_store_b.profile_id, 'profile.editorial_discovery.v1');
  assert.equal(outcomes.merchant_store_c.status, 'material_question_required');
  assert.deepEqual(validator.validateFile(architectureProvenance(outcomes.merchant_store_a, root), 'schemas/calinium-architecture-provenance.schema.json', 'Current proof provenance'), []);
  assert.deepEqual(validator.validateFile(architectureProvenance(outcomes.merchant_store_b, root), 'schemas/calinium-architecture-provenance.schema.json', 'Editorial proof provenance'), []);
  console.log(`Automatic architecture-selection validation passed: policy=${policy.policy_revision}; profiles=2; Current=${outcomes.merchant_store_a.profile_id}; Editorial=${outcomes.merchant_store_b.profile_id}; ambiguity=${outcomes.merchant_store_c.status}; questions=1-max; automatic-repair=false; merchant-ui=false.`);
}

if (require.main === module) {
  try { run(); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { run };
