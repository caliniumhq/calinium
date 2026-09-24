'use strict';

const fs = require('fs');
const path = require('path');
const { digest, sha256File, assertOutputArtifact } = require('../storefront-render/contracts');
const { loadRenderRun } = require('../visual-evaluation/evaluate-comparison');
const { APPROVED_FIXTURE_REVISION, APPROVED_COMPARISON_KEY } = require('../storefront-render/architecture-comparison');
const {
  REQUEST_VERSION,
  loadDesignEvaluationPolicy,
  withCanonicalId,
  assertDesignEvaluationRequest
} = require('./contracts');

const CONTEXT_FIXTURE = 'fixtures/storefront-design-evaluation-context.json';
const OBJECTIVE_CALIBRATION = 'fixtures/storefront-visual-evaluation-calibration.json';
const ARCHITECTURE_REGISTRY = 'config/calinium-architecture-profiles.json';

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function profileAlias(profileId) { return profileId === 'profile.current_calinium.v1' ? 'current' : profileId === 'profile.editorial_discovery.v1' ? 'editorial' : null; }
function cellKey(profileId, routeId, viewportId) { return `${profileAlias(profileId)}:${routeId}:${viewportId}`; }

function contextBinding(root, binding) {
  const reference = binding.reference;
  const checksum = binding.status === 'available' && reference ? sha256File(assertOutputArtifact(root, reference)) : null;
  return { status: binding.status, revision_id: binding.revision_id, checksum, reference, reason_code: binding.reason_code };
}

function buildDesignEvaluationRequest({
  root,
  comparisonSummaryReference = 'output/storefront-renders/phase-c-comparison-summary.json',
  contextReference = CONTEXT_FIXTURE,
  objectiveCalibrationReference = OBJECTIVE_CALIBRATION
}) {
  const policy = loadDesignEvaluationPolicy(root);
  const summary = readJson(path.resolve(root, comparisonSummaryReference));
  const contextFixture = readJson(path.resolve(root, contextReference));
  const objective = readJson(path.resolve(root, objectiveCalibrationReference));
  if (summary.comparison?.comparison_fixture_revision !== APPROVED_FIXTURE_REVISION
    || summary.comparison?.comparison_key !== APPROVED_COMPARISON_KEY
    || contextFixture.comparison_fixture_revision !== APPROVED_FIXTURE_REVISION
    || contextFixture.comparison_key !== APPROVED_COMPARISON_KEY
    || objective.comparison?.comparison_fixture_revision !== APPROVED_FIXTURE_REVISION
    || objective.comparison?.comparison_key !== APPROVED_COMPARISON_KEY) throw new Error('Subjective design evaluation requires the exact approved Phase C/D1 comparison provenance.');

  const runs = [loadRenderRun(root, summary.current_baseline.request_id), loadRenderRun(root, summary.editorial_discovery.request_id)];
  const objectiveByKey = new Map(objective.captures.map((capture) => [cellKey(capture.profile_id, capture.route_id, capture.viewport_id), capture]));
  const cells = [];
  for (const run of runs) {
    for (const result of run.results) {
      if (result.status !== 'passed' || !result.screenshot) throw new Error('Subjective design evaluation requires passed Render Results with screenshots.');
      const key = cellKey(result.architecture.profile_id, result.route.id, result.viewport.id);
      const approvedObjective = objectiveByKey.get(key);
      if (!approvedObjective || approvedObjective.screenshot.sha256 !== result.screenshot.sha256) throw new Error(`Render screenshot for ${key} does not match approved D1 calibration evidence.`);
      const screenshotReference = path.relative(root, path.join(run.directory, result.screenshot.artifact_reference));
      const screenshotPath = assertOutputArtifact(root, screenshotReference);
      if (sha256File(screenshotPath) !== result.screenshot.sha256) throw new Error(`Screenshot artifact integrity failed for ${key}.`);
      const objectiveGate = approvedObjective.findings.length && key === 'current:homepage:mobile-v1' ? 'pass_with_review' : approvedObjective.automatic_gate;
      const cellBase = {
        profile_id: result.architecture.profile_id,
        profile_version: result.architecture.profile_version,
        architecture_selection_revision: result.architecture.selection_revision_id,
        route_id: result.route.id,
        viewport_id: result.viewport.id,
        render_request_id: result.request_id,
        render_id: result.render_id,
        render_result_checksum: digest(result),
        screenshot: { artifact_reference: screenshotReference, sha256: result.screenshot.sha256, width: result.screenshot.width, height: result.screenshot.height },
        objective_evaluation: {
          evaluation_id: approvedObjective.evaluation_id,
          evidence_revision: objective.evidence_id,
          gate_status: objectiveGate,
          findings: approvedObjective.findings.map((finding) => ({ finding_id: finding.finding_id, rule_id: finding.rule_id, severity: finding.severity }))
        }
      };
      cells.push(withCanonicalId('design-cell', cellBase, 'cell_id'));
    }
  }
  cells.sort((left, right) => `${left.profile_id}:${left.route_id}:${left.viewport_id}`.localeCompare(`${right.profile_id}:${right.route_id}:${right.viewport_id}`));

  const architectureRegistryPath = path.join(root, ARCHITECTURE_REGISTRY);
  const architectureRegistry = readJson(architectureRegistryPath);
  const architectureProfiles = architectureRegistry.profiles.filter((profile) => ['profile.current_calinium.v1', 'profile.editorial_discovery.v1'].includes(profile.id)).map((profile) => ({
    profile_id: profile.id,
    profile_version: profile.version,
    name: profile.name,
    intent: profile.description,
    family_selections: profile.family_selections,
    registry_reference: ARCHITECTURE_REGISTRY,
    registry_sha256: sha256File(architectureRegistryPath)
  }));
  const requestBase = {
    schema_version: '1.0',
    contract_version: REQUEST_VERSION,
    policy: {
      policy_revision: policy.policy_revision,
      evaluator_version: policy.evaluator_version,
      provider_interface_version: policy.provider_interface_version,
      required_repeat_runs: policy.required_repeat_runs
    },
    comparison: {
      fixture_revision: APPROVED_FIXTURE_REVISION,
      comparison_key: APPROVED_COMPARISON_KEY,
      objective_calibration_reference: objectiveCalibrationReference,
      objective_calibration_sha256: sha256File(path.resolve(root, objectiveCalibrationReference))
    },
    cells,
    context: {
      context_revision: contextFixture.context_revision,
      preset: contextBinding(root, contextFixture.preset),
      design_dna: contextBinding(root, contextFixture.design_dna),
      merchant_intent: contextBinding(root, contextFixture.merchant_intent),
      store_intelligence: contextBinding(root, contextFixture.store_intelligence),
      catalog: contextFixture.catalog,
      architecture_profiles: architectureProfiles,
      source_authority: contextFixture.source_authority
    },
    evaluation_scopes: ['per_cell', 'route_pair', 'architecture', 'controlled_comparison'],
    safety: { automatic_mutation_allowed: false, automatic_repair_allowed: false, shopify_write_allowed: false, benchmark_reference_allowed: false }
  };
  return assertDesignEvaluationRequest(withCanonicalId('design-evaluation-request', requestBase, 'request_id'), root);
}

module.exports = {
  CONTEXT_FIXTURE,
  OBJECTIVE_CALIBRATION,
  ARCHITECTURE_REGISTRY,
  profileAlias,
  cellKey,
  buildDesignEvaluationRequest
};
