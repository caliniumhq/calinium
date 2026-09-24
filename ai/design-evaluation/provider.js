'use strict';

const fs = require('fs');
const path = require('path');
const { sha256File, assertOutputArtifact } = require('../storefront-render/contracts');
const {
  ASSESSMENT_VERSION,
  FINDING_VERSION,
  PROVIDER_RESPONSE_VERSION,
  readJson,
  withCanonicalId,
  assertDimensionAssessment,
  assertDesignFinding,
  assertDesignProviderResponse
} = require('./contracts');
const { cellKey } = require('./build-request');

const CALIBRATION_FIXTURE = 'fixtures/storefront-design-evaluation-provider-calibration.json';

function requestCellMaps(request) {
  const byId = new Map();
  const byKey = new Map();
  for (const cell of request.cells) {
    byId.set(cell.cell_id, cell);
    byKey.set(cellKey(cell.profile_id, cell.route_id, cell.viewport_id), cell);
  }
  return { byId, byKey };
}

function verifyScreenshotEvidence(root, request) {
  return request.cells.map((cell) => {
    const screenshotPath = assertOutputArtifact(root, cell.screenshot.artifact_reference);
    const actual = sha256File(screenshotPath);
    if (actual !== cell.screenshot.sha256) throw new Error(`Subjective evaluator screenshot integrity failed for ${cell.cell_id}.`);
    return { cell_id: cell.cell_id, sha256: actual };
  }).sort((left, right) => left.cell_id.localeCompare(right.cell_id));
}

function profileId(alias) {
  if (alias === 'current') return 'profile.current_calinium.v1';
  if (alias === 'editorial') return 'profile.editorial_discovery.v1';
  throw new Error(`Unsupported calibration profile alias ${alias}.`);
}

function createAssessment({ raw, runSequence, request, root, maps }) {
  const summary = runSequence === 2 && raw.alternate_summary ? raw.alternate_summary : raw.summary;
  const base = {
    schema_version: '1.0', contract_version: ASSESSMENT_VERSION, evaluation_request_id: request.request_id,
    dimension: raw.dimension, dimension_version: '1.0.0',
    scope: {
      level: raw.scope.level,
      profile_ids: raw.scope.profiles.map(profileId),
      route_ids: [...raw.scope.routes],
      viewport_ids: [...raw.scope.viewports]
    },
    judgment: raw.judgment, importance: raw.importance, confidence: raw.confidence,
    summary, rationale: raw.rationale,
    evidence_cell_ids: raw.evidence.map((key) => {
      const cell = maps.byKey.get(key);
      if (!cell) throw new Error(`Calibration assessment ${raw.key} references unknown cell ${key}.`);
      return cell.cell_id;
    }),
    context_basis: [...raw.context_basis]
  };
  return assertDimensionAssessment(withCanonicalId('design-assessment', base, 'assessment_id'), request, root);
}

function createFinding({ raw, runSequence, request, root, maps }) {
  const diagnosis = runSequence === 2 && raw.alternate_diagnosis ? raw.alternate_diagnosis : raw.diagnosis;
  const base = {
    schema_version: '1.0', contract_version: FINDING_VERSION, evaluation_request_id: request.request_id,
    policy_revision: request.policy.policy_revision, dimension: raw.dimension, importance: raw.importance, confidence: raw.confidence,
    diagnosis,
    scope: { profile_ids: raw.profiles.map(profileId), route_ids: [...raw.routes], viewport_ids: [...raw.viewports] },
    evidence: raw.evidence.map((item) => {
      const cell = maps.byKey.get(item.cell);
      if (!cell) throw new Error(`Calibration finding ${raw.key} references unknown cell ${item.cell}.`);
      return { cell_id: cell.cell_id, screenshot_sha256: cell.screenshot.sha256, region: item.region || null };
    }),
    context_relation: { architecture_intent: raw.architecture_intent, design_dna: raw.design_dna, merchant_intent: raw.merchant_intent },
    recommendation_category: raw.recommendation_category,
    responsibility: raw.responsibility,
    objective_relation: { mode: raw.objective_mode, objective_finding_ids: [...raw.objective_finding_ids] },
    human_review_status: 'unreviewed'
  };
  return assertDesignFinding(withCanonicalId('design-finding', base, 'finding_id'), request, root);
}

function createApprovedFixtureProvider({ root, fixtureReference = CALIBRATION_FIXTURE } = {}) {
  const fixture = readJson(path.resolve(root, fixtureReference));
  return {
    metadata: fixture.provider,
    async evaluate({ request, runSequence, screenshotEvidence }) {
      if (fixture.comparison_fixture_revision !== request.comparison.fixture_revision
        || fixture.comparison_key !== request.comparison.comparison_key
        || fixture.policy_revision !== request.policy.policy_revision) throw new Error('Approved design calibration fixture provenance does not match the request.');
      const maps = requestCellMaps(request);
      for (const [key, expectedHash] of Object.entries(fixture.screenshot_hashes)) {
        const cell = maps.byKey.get(key);
        if (!cell || cell.screenshot.sha256 !== expectedHash) throw new Error(`Approved design calibration screenshot mismatch for ${key}.`);
      }
      if (Object.keys(fixture.screenshot_hashes).length !== request.cells.length) throw new Error('Approved design calibration fixture must bind all 16 screenshots.');
      const assessments = fixture.assessments.map((raw) => createAssessment({ raw, runSequence, request, root, maps }));
      const findings = fixture.findings.map((raw) => createFinding({ raw, runSequence, request, root, maps }));
      const base = {
        schema_version: '1.0', contract_version: PROVIDER_RESPONSE_VERSION, evaluation_request_id: request.request_id,
        status: 'evaluated', provider: fixture.provider, run_sequence: runSequence,
        screenshot_evidence: screenshotEvidence,
        dimension_assessments: assessments,
        findings,
        error: null
      };
      return assertDesignProviderResponse(withCanonicalId('design-provider-response', base, 'response_id'), request, root);
    }
  };
}

function createProviderAdapter({ metadata, evaluate }) {
  if (!metadata || metadata.interface_version !== 'storefront-design-provider-v1') throw new Error('Design provider metadata is missing or incompatible.');
  if (!['live_multimodal', 'mock'].includes(metadata.provider_kind)) throw new Error('Custom Design provider must declare live_multimodal or mock kind.');
  if (typeof evaluate !== 'function') throw new Error('Design provider evaluate function is required.');
  return { metadata, evaluate };
}

async function invokeProvider({ root, request, provider, runSequence }) {
  if (!provider || typeof provider.evaluate !== 'function') throw new Error('No subjective multimodal design provider is configured.');
  const screenshotEvidence = verifyScreenshotEvidence(root, request);
  const response = await provider.evaluate({ request: JSON.parse(JSON.stringify(request)), runSequence, screenshotEvidence: JSON.parse(JSON.stringify(screenshotEvidence)) });
  const validated = assertDesignProviderResponse(response, request, root);
  if (validated.status !== 'evaluated') throw new Error('Subjective multimodal design provider did not complete evaluation.');
  return validated;
}

module.exports = {
  CALIBRATION_FIXTURE,
  requestCellMaps,
  verifyScreenshotEvidence,
  createAssessment,
  createFinding,
  createApprovedFixtureProvider,
  createProviderAdapter,
  invokeProvider
};
