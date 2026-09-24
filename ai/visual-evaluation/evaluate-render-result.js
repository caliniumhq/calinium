'use strict';

const {
  FINDING_VERSION,
  RESULT_VERSION,
  assertVisualFinding,
  assertVisualEvaluationResult
} = require('./contracts');
const { digest } = require('../storefront-render/contracts');
const { initialQualityGate } = require('./quality-gate');
const {
  allowlistedDiagnostic,
  normalizedFamilies,
  collectObjectiveFindingInputs
} = require('./objective-rule-engine');

function createFinding({ root, evaluationRequest, renderResult, rule, selector = null, landmark = null, diagnosticCode = null, measured, expectedBoundary, confidence = 'high' }) {
  const base = {
    schema_version: '1.0',
    contract_version: FINDING_VERSION,
    evaluation_request_id: evaluationRequest.evaluation_request_id,
    rule_id: rule.id,
    rule_version: rule.version,
    category: rule.category,
    severity: rule.severity,
    route_id: renderResult.route.id,
    viewport_id: renderResult.viewport.id,
    architecture_profile_id: renderResult.architecture.profile_id,
    evidence: {
      render_id: renderResult.render_id,
      screenshot_reference: renderResult.screenshot?.artifact_reference || null,
      selector,
      landmark,
      diagnostic_code: diagnosticCode
    },
    measured,
    expected: expectedBoundary,
    confidence,
    reproducibility: {
      render_result_checksum: evaluationRequest.render.render_result_checksum,
      policy_revision: evaluationRequest.policy.policy_revision,
      architecture_selection_revision: evaluationRequest.architecture.selection_revision_id
    },
    human_review_status: 'unreviewed'
  };
  const finding = { ...base, finding_id: `visual-finding-${digest(base).slice(0, 20)}` };
  return assertVisualFinding(finding, root);
}

function summarize(findings) {
  const summary = { total: findings.length, blocker: 0, high: 0, medium: 0, low: 0, info: 0, unreviewed: 0 };
  for (const finding of findings) {
    summary[finding.severity] += 1;
    if (finding.human_review_status === 'unreviewed') summary.unreviewed += 1;
  }
  return summary;
}

function evaluateRenderResult({ root, evaluationRequest, renderRequest, renderResult, architectureRuntime = null }) {
  const inputs = collectObjectiveFindingInputs({ root, renderRequest, renderResult, architectureRuntime });
  const findings = inputs.map((input) => createFinding({ root, evaluationRequest, renderResult, ...input }));
  findings.sort((left, right) => `${left.rule_id}:${left.evidence.selector || ''}:${left.finding_id}`.localeCompare(`${right.rule_id}:${right.evidence.selector || ''}:${right.finding_id}`));
  const base = {
    schema_version: '1.0',
    contract_version: RESULT_VERSION,
    evaluation_request_id: evaluationRequest.evaluation_request_id,
    status: 'evaluated',
    request: JSON.parse(JSON.stringify(evaluationRequest)),
    findings,
    summary: summarize(findings),
    quality_gate: initialQualityGate(findings, evaluationRequest.policy.policy_revision),
    annotation: { supported: true, required: false, authoritative_screenshot_modified: false, derived_artifact_reference: null },
    error: null
  };
  const result = { ...base, evaluation_id: `visual-evaluation-${digest(base).slice(0, 20)}` };
  return assertVisualEvaluationResult(result, root);
}

module.exports = {
  createFinding,
  allowlistedDiagnostic,
  summarize,
  normalizedFamilies,
  evaluateRenderResult
};
