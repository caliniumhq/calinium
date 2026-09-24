'use strict';

const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest } = require('../storefront-render/contracts');
const { loadEvaluationPolicy } = require('./contracts');
const { collectObjectiveFindingInputs } = require('./objective-rule-engine');
const { assertMerchantFlowRenderRequest, assertMerchantFlowRenderResult } = require('../storefront-render/merchant-flow-contracts');

const MERCHANT_D1_SCHEMA = 'schemas/calinium-merchant-flow-d1-evaluation.schema.json';
const MERCHANT_D1_VERSION = 'merchant-flow-d1-evaluation-v1';

function contractError(errors) {
  const error = new Error(`Merchant Flow D1 Evaluation validation failed: ${errors.join('; ')}`);
  error.name = 'MerchantFlowD1ContractError';
  error.validation = { valid: false, errors: [...errors] };
  return error;
}

function findingFor({ input, request, result, policy }) {
  const base = {
    rule_id: input.rule.id,
    rule_version: input.rule.version,
    category: input.rule.category,
    severity: input.rule.severity,
    route_id: result.route.id,
    viewport_id: result.viewport.id,
    architecture_profile_id: result.architecture.profile_id,
    evidence: {
      render_id: result.render_id,
      screenshot_reference: result.screenshot?.artifact_reference || null,
      selector: input.selector || null,
      landmark: input.landmark || null,
      diagnostic_code: input.diagnosticCode || null
    },
    measured: input.measured,
    expected: input.expectedBoundary,
    confidence: input.confidence || 'high',
    reproducibility: {
      render_result_checksum: digest(result),
      policy_revision: policy.policy_revision,
      architecture_selection_revision: request.architecture.selection_revision_id
    },
    human_review_status: 'unreviewed'
  };
  return { ...base, finding_id: `merchant-flow-d1-finding-${digest(base).slice(0, 20)}` };
}

function summarize(findings) {
  const summary = { total: findings.length, blocker: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of findings) summary[finding.severity] += 1;
  return summary;
}

function assertMerchantFlowD1Evaluation(evaluation, root) {
  const errors = createSchemaValidator(root).validateFile(evaluation, MERCHANT_D1_SCHEMA, 'merchant_flow_d1_evaluation');
  const base = { ...evaluation }; delete base.evidence_id;
  if (evaluation?.evidence_id !== `merchant-flow-d1-evaluation-${digest(base).slice(0, 20)}`) errors.push('Merchant D1 Evaluation ID does not match canonical evidence.');
  const findings = (evaluation?.cells || []).flatMap((cell) => cell.findings || []);
  const cellIds = (evaluation?.cells || []).map((cell) => cell.cell_id);
  const renderIds = (evaluation?.cells || []).map((cell) => cell.render_id);
  if (new Set(cellIds).size !== cellIds.length || new Set(renderIds).size !== renderIds.length) errors.push('Merchant D1 cells and render results must be unique.');
  if (JSON.stringify(evaluation?.summary) !== JSON.stringify(summarize(findings))) errors.push('Merchant D1 summary is inconsistent with objective findings.');
  const expectedStatus = findings.length ? 'review_required' : 'passed';
  if (evaluation?.status !== expectedStatus) errors.push('Merchant D1 status is inconsistent with objective findings.');
  if (evaluation?.safety?.human_review_required !== (findings.length > 0)) errors.push('Merchant D1 human-review requirement is inconsistent with objective findings.');
  if (errors.length) throw contractError([...new Set(errors)]);
  return evaluation;
}

function evaluateMerchantFlowD1({ root, request, results, architectureRuntime }) {
  assertMerchantFlowRenderRequest(request, root);
  const expectedCells = new Set(request.routes.flatMap((route) => request.viewports.map((viewport) => `${route.id}:${viewport.id}`)));
  const actualCells = results.map((result) => `${result.route?.id}:${result.viewport?.id}`);
  if (actualCells.length !== expectedCells.size || new Set(actualCells).size !== actualCells.length || actualCells.some((key) => !expectedCells.has(key))) {
    throw new Error('Merchant D1 requires the exact canonical render route/viewport matrix.');
  }
  const policy = loadEvaluationPolicy(root);
  const cells = results.map((result) => {
    assertMerchantFlowRenderResult(result, request, root);
    if (result.status !== 'passed') throw new Error('Merchant D1 requires a complete passed merchant render matrix.');
    const inputs = collectObjectiveFindingInputs({ root, renderRequest: request, renderResult: result, architectureRuntime });
    const findings = inputs.map((input) => findingFor({ input, request, result, policy }))
      .sort((left, right) => `${left.rule_id}:${left.evidence.selector || ''}:${left.finding_id}`.localeCompare(`${right.rule_id}:${right.evidence.selector || ''}:${right.finding_id}`));
    return {
      cell_id: `merchant-cell-${digest({ request_id: request.request_id, render_id: result.render_id }).slice(0, 20)}`,
      render_id: result.render_id,
      render_result_checksum: digest(result),
      profile_id: result.architecture.profile_id,
      route_id: result.route.id,
      viewport_id: result.viewport.id,
      screenshot: {
        artifact_reference: result.screenshot.artifact_reference,
        sha256: result.screenshot.sha256,
        width: result.screenshot.width,
        height: result.screenshot.height
      },
      findings
    };
  }).sort((left, right) => `${left.route_id}:${left.viewport_id}`.localeCompare(`${right.route_id}:${right.viewport_id}`));
  const findings = cells.flatMap((cell) => cell.findings);
  const base = {
    schema_version: '1.0',
    contract_version: MERCHANT_D1_VERSION,
    status: findings.length ? 'review_required' : 'passed',
    render_request_id: request.request_id,
    render_request_checksum: digest(request),
    policy_revision: policy.policy_revision,
    cells,
    summary: summarize(findings),
    provenance: {
      flow_id: request.flow.flow_id,
      flow_sequence: request.flow.flow_sequence,
      flow_checksum: request.flow.flow_checksum,
      generation_id: request.generation.generation_id,
      artifact_id: request.generation.artifact.artifact_id,
      artifact_sha256: request.generation.artifact.sha256,
      architecture_selection_revision: request.architecture.selection_revision_id
    },
    safety: {
      objective_findings_authoritative: true,
      human_review_required: findings.length > 0,
      automatic_repair_allowed: false,
      fixture_fallback_used: false
    }
  };
  return assertMerchantFlowD1Evaluation({ ...base, evidence_id: `merchant-flow-d1-evaluation-${digest(base).slice(0, 20)}` }, root);
}

module.exports = {
  MERCHANT_D1_SCHEMA,
  MERCHANT_D1_VERSION,
  findingFor,
  assertMerchantFlowD1Evaluation,
  evaluateMerchantFlowD1
};
