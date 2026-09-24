#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  founderReviewReference,
  createMerchantFlowPreviewProvenanceRecovery,
  assertMerchantFlowPreviewProvenanceRecovery
} = require('../ai/merchant-flow/merchant-flow-preview-provenance-recovery');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');
const { digest } = require('../ai/storefront-render/contracts');

const root = path.resolve(__dirname, '..');
const binding = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/merchant-flow-preview-binding.json'), 'utf8')).controlled_legacy_shape;
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/f1-h-preview-provenance-recovery.json'), 'utf8'));
const tests = [];
function test(name, run) { tests.push({ name, run }); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }

function qaReview(value = fixture.canonical_live_shape) { return clone(value); }
function flow(value = fixture.canonical_live_shape) {
  return {
    flow_id: binding.flow_id,
    project_id: binding.project_id,
    organization_id: binding.organization_id,
    state: 'preview_ready',
    sequence: binding.flow_sequence,
    checksum: '0'.repeat(64),
    store_context: { connection_id: binding.connection_id, shop: binding.canonical_shop },
    artifact: {
      artifact_id: binding.artifact_id,
      checksum: binding.artifact_checksum,
      controlled_runtime_binding: {
        theme_id: binding.development_theme_id,
        runtime_configuration_revision: binding.runtime_configuration_revision,
        render_target_configuration_revision: binding.render_target_configuration_revision
      }
    },
    render_qa: {
      status: 'review_required',
      render_revision: binding.render_revision,
      render_result_ids: binding.render_result_ids,
      render_checksum: binding.render_checksum,
      d1: { status: 'passed', evidence_id: binding.d1_evidence_id, evidence_checksum: binding.d1_evidence_checksum },
      d2_7: { status: 'review_required', evidence_id: binding.d2_7_evidence_id, evidence_checksum: binding.d2_7_evidence_checksum },
      human_review_required: true
    },
    operator_provenance: { qa_review: qaReview(value), repair_resolution: null },
    repair: null
  };
}

function evidence() {
  const request = {
    request_id: binding.render_request_id,
    render_revision: binding.render_revision,
    target: { theme_id: binding.development_theme_id }
  };
  const manifest = { manifest_id: binding.render_evidence_id };
  return {
    request,
    request_checksum: digest(request),
    manifest,
    manifest_checksum: digest(manifest),
    preview_url: binding.preview_url
  };
}

function recovery(current = flow()) {
  return createMerchantFlowPreviewProvenanceRecovery({
    flow: current,
    project: { id: binding.project_id, organization_id: binding.organization_id },
    connectionId: binding.connection_id,
    canonicalShop: binding.canonical_shop,
    evidence: evidence(),
    mainThemeId: binding.main_theme_id,
    artifactSourceRevision: null,
    recoverySourceRevision: binding.recovery_source_revision,
    operator: { user_id: 'founder-operator-f1-h', role: 'owner', explicitly_allowlisted: true },
    createdAt: binding.created_at,
    root
  });
}

test('1. canonical nested live founder review resolves exact identity', () => {
  assert.deepEqual(founderReviewReference(flow()), {
    review_id: fixture.canonical_live_shape.review.id,
    review_checksum: fixture.canonical_live_shape.review.checksum,
    decision: 'accepted'
  });
});

test('2. deliberately supported historical flat founder review remains compatible', () => {
  assert.deepEqual(founderReviewReference(flow(fixture.supported_historical_flat_shape)), {
    review_id: fixture.supported_historical_flat_shape.review_id,
    review_checksum: fixture.supported_historical_flat_shape.checksum,
    decision: 'accepted'
  });
});

test('3. identical canonical and flat bindings converge deterministically', () => {
  const both = { ...qaReview(), ...qaReview(fixture.supported_historical_flat_shape) };
  assert.deepEqual(founderReviewReference(flow(both)), founderReviewReference(flow()));
});

test('4. conflicting canonical and flat bindings fail closed', () => {
  const both = { ...qaReview(), ...qaReview(fixture.supported_historical_flat_shape), checksum: 'c'.repeat(64) };
  assert.throws(() => founderReviewReference(flow(both)), (error) => error.code === fixture.expected.conflict_code);
});

test('5. missing founder-review binding fails before record construction', () => {
  assert.throws(() => founderReviewReference(flow({ decision: 'accepted' })), (error) => error.code === fixture.expected.invalid_code);
});

test('6. malformed checksum and non-accepted decision fail closed', () => {
  const malformed = qaReview(); malformed.review.checksum = 'not-a-checksum';
  assert.throws(() => founderReviewReference(flow(malformed)), (error) => error.code === fixture.expected.invalid_code);
  const undecided = qaReview(); undecided.decision = 'needs_fix';
  assert.throws(() => founderReviewReference(flow(undecided)), (error) => error.code === fixture.expected.invalid_code);
});

test('7. malformed and empty review IDs fail closed', () => {
  for (const id of ['', 'INVALID ID', '-review']) {
    const malformed = qaReview(); malformed.review.id = id;
    assert.throws(() => founderReviewReference(flow(malformed)), (error) => error.code === fixture.expected.invalid_code);
  }
});

test('8. canonical live shape constructs one checksum-bound schema-valid recovery', () => {
  const record = recovery();
  assert.equal(record.qa.founder_review.review_id, fixture.canonical_live_shape.review.id);
  assert.equal(record.qa.founder_review.review_checksum, fixture.canonical_live_shape.review.checksum);
  assert.equal(assertMerchantFlowPreviewProvenanceRecovery(record, root), record);
  assert.deepEqual(createSchemaValidator(root).validateFile(record, 'schemas/calinium-merchant-flow-preview-provenance-recovery.schema.json', 'F1-H recovery'), []);
});

test('9. unsupported aliases and historical-source substitution remain rejected', () => {
  assert.throws(() => founderReviewReference(flow({ provenance: { review_id: fixture.canonical_live_shape.review.id, review_checksum: fixture.canonical_live_shape.review.checksum }, decision: 'accepted' })), (error) => error.code === fixture.expected.invalid_code);
  const record = recovery();
  assert.equal(record.source_provenance.historical_render_source_revision_status, 'unavailable_legacy');
  assert.equal(record.source_provenance.historical_render_source_revision, null);
  assert.equal(record.target.main_theme_excluded, true);
});

async function run() {
  for (const item of tests) { await item.run(); process.stdout.write(`✓ ${item.name}\n`); }
  process.stdout.write(`\n${tests.length}/${tests.length} F1-H recovery-construction tests passed.\n`);
  return { valid: true, focused_tests: `${tests.length}/${tests.length}`, provider_calls: 0, shopify_calls: 0, shopify_writes: 0, theme_mutations: 0 };
}

if (require.main === module) run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { run };
