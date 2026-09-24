#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  buildDesignEvaluationRequest,
  createApprovedFixtureProvider,
  invokeProvider,
  loadLiveDesignConfiguration,
  createOpenAiLiveDesignProvider,
  buildResponsesRequest,
  evaluateDesign,
  providerRunSummary,
  loadLiveCalibrationResume,
  configurationResumeBinding,
  createDesignHumanReview,
  assertDesignHumanReview,
  createLiveCalibrationReport,
  assertLiveCalibrationReport,
  withCanonicalId,
  requestOpenAiResponse,
  assertLiveConfiguration
} = require('../ai/design-evaluation');

const root = path.resolve(__dirname, '..');
const clone = (value) => JSON.parse(JSON.stringify(value));
const tests = [];
function test(name, run) { tests.push({ name, run }); }

let request;
let configuration;
let canonicalHumanResponse;
let rawOutput;
let preservedRuns;
let preservedFailure;
let completedResumedEvaluation;

function rawFromCanonical(response) {
  return {
    schema_version: '1.0',
    summary: 'Bounded visual assessment of the exact Current and Editorial controlled capture matrix.',
    dimension_assessments: response.dimension_assessments.map((item) => ({
      dimension: item.dimension,
      scope: item.scope,
      judgment: item.judgment,
      importance: item.importance,
      confidence: item.confidence,
      summary: item.summary,
      rationale: item.rationale,
      evidence_cell_ids: item.evidence_cell_ids,
      context_basis: item.context_basis
    })),
    findings: response.findings.map((item) => ({
      dimension: item.dimension,
      importance: item.importance,
      confidence: item.confidence,
      diagnosis: item.diagnosis,
      scope: { level: item.scope.profile_ids.length > 1 ? 'controlled_comparison' : item.scope.route_ids.length > 1 ? 'architecture' : item.scope.viewport_ids.length > 1 ? 'route_pair' : 'per_cell', ...item.scope },
      evidence: item.evidence.map((evidence) => ({ cell_id: evidence.cell_id, region: evidence.region || 'visible page region', visible_evidence: `The stated issue is visible in the ${evidence.region || 'referenced page region'}.` })),
      context_relation: item.context_relation,
      recommendation_category: item.recommendation_category,
      responsibility: item.responsibility,
      objective_relation: item.objective_relation
    })),
    objective_fact_acknowledgements: request.cells.flatMap((cell) => cell.objective_evaluation.findings.map((finding) => ({
      finding_id: finding.finding_id,
      status: 'acknowledged',
      impact: 'The authoritative D1 geometry finding materially disrupts the Current mobile homepage composition.'
    })))
  };
}

function apiPayload(output = rawOutput, overrides = {}) {
  return {
    id: overrides.id || 'resp_live_design_test',
    object: 'response',
    status: overrides.status || 'completed',
    model: overrides.model || configuration.model.id,
    output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(output) }] }],
    usage: { input_tokens: 1200, output_tokens: 800, total_tokens: 2000, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 200 } },
    ...overrides
  };
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json', ...headers } });
}

function providerWith(fetchImpl) {
  return createOpenAiLiveDesignProvider({ root, configuration, env: { OPENAI_API_KEY: 'test-key-not-a-secret' }, fetchImpl, sleep: async () => {}, clock: (() => { let value = 1000; return () => (value += 10); })() });
}

function withoutDimension(output, dimension) {
  const changed = clone(output);
  changed.dimension_assessments = changed.dimension_assessments.filter((item) => item.dimension !== dimension);
  return changed;
}

function failedCalibrationArtifact(runs, overrides = {}) {
  return {
    schema_version: '1.0',
    status: 'failed',
    milestone_complete: false,
    configuration: {
      ...configurationResumeBinding(configuration),
      credential_status: { api_key_configured: true, organization_configured: false, project_configured: false },
      secrets_persisted: false
    },
    evaluation: {
      schema_version: '1.0',
      status: 'failed',
      request,
      provider_runs: runs.map(providerRunSummary),
      error: {
        provider_failure: {
          code: 'live_design_incomplete_dimension_coverage',
          rejected_attempts: []
        }
      },
      ...overrides
    }
  };
}

test('live configuration is versioned, GPT-5.6 bound, and cannot use fixture fallback', () => {
  const loaded = loadLiveDesignConfiguration(root, { env: {}, requireCredentials: false });
  configuration = loaded.configuration;
  assert.equal(configuration.model.id, 'gpt-5.6-sol');
  assert.equal(configuration.api.api_family, 'responses');
  assert.equal(configuration.calibration.repeat_runs, 3);
  assert.equal(configuration.safety.fixture_fallback_allowed, false);
  assert.equal(loaded.credential_status.api_key_configured, false);
});

test('missing live credentials fail explicitly without invoking fixture replay', () => {
  assert.throws(() => createOpenAiLiveDesignProvider({ root, configuration, env: {} }), (error) => error.code === 'live_design_credentials_missing');
});

test('model configuration cannot silently drift from the approved pinned model', () => {
  const changed = clone(configuration);
  changed.model.id = 'unapproved-model';
  assert.throws(() => assertLiveConfiguration(changed, root), /approved GPT-5.6 Sol model/);
});

test('exact approved request and human calibration source are available', async () => {
  request = buildDesignEvaluationRequest({ root });
  canonicalHumanResponse = await invokeProvider({ root, request, provider: createApprovedFixtureProvider({ root }), runSequence: 1 });
  rawOutput = rawFromCanonical(canonicalHumanResponse);
  assert.equal(request.cells.length, 16);
  assert.equal(new Set(rawOutput.dimension_assessments.map((item) => item.dimension)).size, 12);
  assert.equal(new Set(rawOutput.dimension_assessments.flatMap((item) => item.evidence_cell_ids)).size, 16);
});

test('Responses request includes all 16 verified PNG data URLs and safe bounded context', () => {
  const body = buildResponsesRequest({ root, request, configuration });
  const content = body.input[1].content;
  const images = content.filter((item) => item.type === 'input_image');
  assert.equal(images.length, 16);
  assert.equal(body.model, 'gpt-5.6-sol');
  assert.equal(body.text.format.type, 'json_schema');
  assert.equal(body.text.format.strict, true);
  assert.equal(body.store, false);
  const contextText = content[0].text;
  assert.doesNotMatch(contextText, /output\//);
  assert.doesNotMatch(contextText, /fixtures\//);
  assert.doesNotMatch(contextText, /benchmark/i);
  const requestContext = JSON.parse(contextText.slice(contextText.indexOf('\n') + 1));
  assert.equal(requestContext.required_semantic_coverage.required_dimensions.length, 12);
  assert.equal(requestContext.required_semantic_coverage.required_screenshot_cell_ids.length, 16);
  assert.deepEqual(requestContext.required_semantic_coverage.required_independent_profile_ids.sort(), ['profile.current_calinium.v1', 'profile.editorial_discovery.v1'].sort());
  const firstBytes = Buffer.from(images[0].image_url.split(',')[1], 'base64');
  assert.equal(crypto.createHash('sha256').update(firstBytes).digest('hex'), request.cells[0].screenshot.sha256);
});

test('one live provider run normalizes structured output and records operations safely', async () => {
  const response = await invokeProvider({ root, request, provider: providerWith(async () => jsonResponse(apiPayload())), runSequence: 1 });
  assert.equal(response.provider.provider_kind, 'live_multimodal');
  assert.equal(response.provider.model.id, 'gpt-5.6-sol');
  assert.equal(response.screenshot_evidence.length, 16);
  assert.equal(response.dimension_assessments.length, 22);
  assert.equal(response.findings.length, 6);
  assert.equal(response.operation.api_family, 'responses');
  assert.equal(response.operation.usage.total_tokens, 2000);
  assert.equal(response.diagnostics.objective_consistency.status, 'passed');
  assert.ok(response.diagnostics.evidence_support.every((item) => item.status === 'requires_human_review'));
});

test('semantic incompleteness retries only the rejected run and records exact diagnostics', async () => {
  let calls = 0;
  const incomplete = withoutDimension(rawOutput, 'typographic_hierarchy');
  const supplied = clone(rawOutput);
  supplied.dimension_assessments.find((item) => item.dimension === 'typographic_hierarchy').summary = 'The retry explicitly supplied the previously missing typographic assessment.';
  const response = await invokeProvider({
    root,
    request,
    provider: providerWith(async () => {
      calls += 1;
      return jsonResponse(apiPayload(calls === 1 ? incomplete : supplied, { id: `resp_semantic_${calls}` }));
    }),
    runSequence: 3
  });
  assert.equal(calls, 2);
  assert.equal(response.run_sequence, 3);
  assert.equal(response.operation.request_count, 2);
  assert.equal(response.operation.retry_count, 1);
  assert.equal(response.diagnostics.rejected_attempts.length, 1);
  assert.deepEqual(response.diagnostics.rejected_attempts[0].diagnostics.missing_dimensions, ['typographic_hierarchy']);
  assert.match(response.dimension_assessments.find((item) => item.dimension === 'typographic_hierarchy').summary, /retry explicitly supplied/);
});

test('semantic incompleteness exhausts at two attempts without accepting or fabricating a run', async () => {
  let calls = 0;
  const incomplete = withoutDimension(rawOutput, 'composition');
  const result = await evaluateDesign({
    root,
    request,
    provider: providerWith(async () => { calls += 1; return jsonResponse(apiPayload(incomplete, { id: `resp_incomplete_${calls}` })); }),
    repeatRuns: 3
  });
  assert.equal(calls, 2);
  assert.equal(result.status, 'failed');
  assert.equal(result.provider_runs.length, 0);
  assert.equal(result.error.provider_failure.code, 'live_design_incomplete_dimension_coverage');
  assert.equal(result.error.provider_failure.retryable, false);
  assert.equal(result.error.provider_failure.rejected_attempts.length, 2);
  assert.ok(result.error.provider_failure.rejected_attempts.every((item) => item.diagnostics.missing_dimensions.includes('composition')));
});

test('three live repeats record categorical and recommendation consistency', async () => {
  const liveProvider = providerWith(async () => jsonResponse(apiPayload()));
  const evaluation = await evaluateDesign({ root, request, provider: liveProvider, repeatRuns: 3 });
  assert.equal(evaluation.status, 'evaluated');
  assert.equal(evaluation.provider_runs.length, 3);
  assert.equal(evaluation.repeat_consistency.runs, 3);
  assert.equal(evaluation.repeat_consistency.dimension_categorical_agreement, 1);
  assert.equal(evaluation.repeat_consistency.high_impact_finding_agreement, 1);
  assert.equal(evaluation.repeat_consistency.responsibility_agreement, 1);
  assert.equal(evaluation.repeat_consistency.recommendation_agreement, 1);
  assert.ok(evaluation.provider_runs.every((run) => run.provider.provider_kind === 'live_multimodal'));
  assert.ok(evaluation.provider_runs.every((run) => run.dimension_assessments.length === 22 && run.findings.length === 6));
});

test('two accepted runs plus one incomplete state is provenance-bound and resumable', async () => {
  const provider = providerWith(async () => jsonResponse(apiPayload()));
  preservedRuns = [
    await invokeProvider({ root, request, provider, runSequence: 1 }),
    await invokeProvider({ root, request, provider, runSequence: 2 })
  ];
  preservedFailure = failedCalibrationArtifact(preservedRuns);
  const resume = loadLiveCalibrationResume({ root, currentRequest: request, configuration, failureReport: preservedFailure });
  assert.equal(resume.acceptedRuns.length, 2);
  assert.deepEqual(resume.acceptedRunBindings.map((item) => item.response_id), preservedRuns.map((item) => item.response_id));
  assert.deepEqual(resume.acceptedRunBindings.map((item) => item.response_checksum), preservedRuns.map((item) => providerRunSummary(item).response_checksum));
});

test('resume reuses accepted runs without provider calls and requests only run 3', async () => {
  const resume = loadLiveCalibrationResume({ root, currentRequest: request, configuration, failureReport: preservedFailure });
  let calls = 0;
  completedResumedEvaluation = await evaluateDesign({
    root,
    request,
    provider: providerWith(async () => { calls += 1; return jsonResponse(apiPayload(rawOutput, { id: 'resp_resumed_run_3' })); }),
    repeatRuns: 3,
    acceptedRuns: resume.acceptedRuns
  });
  assert.equal(calls, 1);
  assert.equal(completedResumedEvaluation.status, 'evaluated');
  assert.equal(completedResumedEvaluation.provider_runs.length, 3);
  assert.deepEqual(completedResumedEvaluation.provider_runs.slice(0, 2).map((item) => item.response_id), preservedRuns.map((item) => item.response_id));
  assert.deepEqual(completedResumedEvaluation.provider_runs.slice(0, 2).map((item) => item.response_checksum), preservedRuns.map((item) => providerRunSummary(item).response_checksum));
});

test('changed screenshot provenance prevents accepted-run reuse', () => {
  const changed = clone(request);
  changed.cells[0].screenshot.sha256 = '0'.repeat(64);
  changed.cells[0] = withCanonicalId('design-cell', changed.cells[0], 'cell_id');
  const changedRequest = withCanonicalId('design-evaluation-request', changed, 'request_id');
  assert.throws(
    () => loadLiveCalibrationResume({ root, currentRequest: changedRequest, configuration, failureReport: preservedFailure }),
    (error) => ['live_design_resume_request_mismatch', 'live_design_resume_run_invalid'].includes(error.code)
  );
});

test('changed evaluation policy prevents accepted-run reuse', () => {
  const changed = clone(preservedFailure);
  changed.evaluation.request.policy.policy_revision = 'changed-policy-revision';
  changed.evaluation.request = withCanonicalId('design-evaluation-request', changed.evaluation.request, 'request_id');
  assert.throws(
    () => loadLiveCalibrationResume({ root, currentRequest: request, configuration, failureReport: changed }),
    (error) => error.code === 'live_design_resume_request_invalid'
  );
});

test('final live calibration metrics reject fewer than three accepted runs', () => {
  const incomplete = clone(completedResumedEvaluation);
  incomplete.provider_runs = incomplete.provider_runs.slice(0, 2);
  incomplete.repeat_consistency.runs = 2;
  const human = { evaluation_id: 'approved-human-reference', request, provider_runs: [{ provider: canonicalHumanResponse.provider }], dimension_assessments: canonicalHumanResponse.dimension_assessments, findings: canonicalHumanResponse.findings };
  assert.throws(() => createLiveCalibrationReport({ root, liveEvaluation: incomplete, humanEvaluation: human }), /exactly three accepted live runs/);
});

test('rate limiting uses bounded retries and records retry metadata', async () => {
  let calls = 0;
  const response = await invokeProvider({
    root, request,
    provider: providerWith(async () => {
      calls += 1;
      return calls === 1 ? jsonResponse({ error: { message: 'rate limited' } }, 429, { 'retry-after': '0' }) : jsonResponse(apiPayload());
    }),
    runSequence: 1
  });
  assert.equal(calls, 2);
  assert.equal(response.operation.retry_count, 1);
  assert.equal(response.operation.retries[0].code, 'rate_limited');
});

test('provider server failure exhausts bounded retries and fails safely', async () => {
  let calls = 0;
  const result = await evaluateDesign({ root, request, provider: providerWith(async () => { calls += 1; return jsonResponse({ error: {} }, 503); }), repeatRuns: 3 });
  assert.equal(calls, 3);
  assert.equal(result.status, 'failed');
  assert.equal(result.error.provider_failure.code, 'live_design_provider_unavailable');
  assert.equal(result.error.provider_failure.attempts, 3);
  assert.doesNotMatch(result.error.message, /503|api|stack/i);
});

test('provider authentication rejection is not retried or exposed verbatim', async () => {
  let calls = 0;
  const result = await evaluateDesign({ root, request, provider: providerWith(async () => { calls += 1; return jsonResponse({ error: { message: 'private credential detail' } }, 401); }), repeatRuns: 3 });
  assert.equal(calls, 1);
  assert.equal(result.status, 'failed');
  assert.equal(result.error.provider_failure.code, 'live_design_authentication_failed');
  assert.doesNotMatch(result.error.message, /private credential detail|401/);
});

test('network timeout exhausts bounded retries and fails safely', async () => {
  let calls = 0;
  const timeout = new Error('private timeout detail'); timeout.name = 'AbortError';
  const result = await evaluateDesign({ root, request, provider: providerWith(async () => { calls += 1; throw timeout; }), repeatRuns: 3 });
  assert.equal(calls, 3);
  assert.equal(result.status, 'failed');
  assert.equal(result.error.provider_failure.code, 'live_design_timeout');
  assert.doesNotMatch(result.error.message, /private timeout detail/);
});

test('malformed structured output fails closed without leaking provider content', async () => {
  const payload = apiPayload(); payload.output[0].content[0].text = '{not-json';
  const result = await evaluateDesign({ root, request, provider: providerWith(async () => jsonResponse(payload)), repeatRuns: 3 });
  assert.equal(result.status, 'failed');
  assert.equal(result.error.provider_failure.code, 'live_design_malformed_output');
  assert.doesNotMatch(result.error.message, /not-json/);
});

test('model refusal fails closed without accepting partial findings', async () => {
  const payload = apiPayload();
  payload.output = [{ type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: 'private refusal detail' }] }];
  const result = await evaluateDesign({ root, request, provider: providerWith(async () => jsonResponse(payload)), repeatRuns: 3 });
  assert.equal(result.status, 'failed');
  assert.equal(result.error.provider_failure.code, 'live_design_provider_refusal');
  assert.equal(result.findings.length, 0);
  assert.doesNotMatch(result.error.message, /private refusal detail/);
});

test('unknown screenshot evidence is rejected as hallucinated scope', async () => {
  const changed = clone(rawOutput);
  changed.findings[0].evidence[0].cell_id = 'design-cell-invented';
  const result = await evaluateDesign({ root, request, provider: providerWith(async () => jsonResponse(apiPayload(changed))), repeatRuns: 3 });
  assert.equal(result.status, 'failed');
  assert.equal(result.error.provider_failure.code, 'live_design_evidence_mismatch');
});

test('unavailable Design DNA cannot be inferred by the live evaluator', async () => {
  const changed = clone(rawOutput);
  const item = changed.dimension_assessments.find((assessment) => assessment.dimension === 'design_dna_coherence');
  item.judgment = 'strong';
  const result = await evaluateDesign({ root, request, provider: providerWith(async () => jsonResponse(apiPayload(changed))), repeatRuns: 3 });
  assert.equal(result.status, 'failed');
  assert.equal(result.error.provider_failure.code, 'live_design_unavailable_context_inferred');
});

test('contradiction of authoritative D1 evidence fails closed', async () => {
  const changed = clone(rawOutput);
  changed.objective_fact_acknowledgements[0].status = 'contradicted';
  let calls = 0;
  const result = await evaluateDesign({ root, request, provider: providerWith(async () => { calls += 1; return jsonResponse(apiPayload(changed)); }), repeatRuns: 3 });
  assert.equal(calls, 1);
  assert.equal(result.status, 'failed');
  assert.equal(result.error.provider_failure.code, 'live_design_objective_contradiction');
  assert.equal(result.error.provider_failure.retryable, false);
});

test('tampered PNG fails integrity before a provider network call', async () => {
  const changed = clone(request);
  changed.cells[0].screenshot.sha256 = '0'.repeat(64);
  changed.cells[0] = withCanonicalId('design-cell', changed.cells[0], 'cell_id');
  const normalized = withCanonicalId('design-evaluation-request', changed, 'request_id');
  let calls = 0;
  const provider = providerWith(async () => { calls += 1; return jsonResponse(apiPayload()); });
  await assert.rejects(() => provider.evaluate({ request: normalized, runSequence: 1 }), /screenshot integrity failed/);
  assert.equal(calls, 0);
});

test('live result compares structurally with approved human calibration without treating replay as live', async () => {
  const evaluation = await evaluateDesign({ root, request, provider: providerWith(async () => jsonResponse(apiPayload())), repeatRuns: 3 });
  const human = { evaluation_id: 'approved-human-reference', request, provider_runs: [{ provider: canonicalHumanResponse.provider }], dimension_assessments: canonicalHumanResponse.dimension_assessments, findings: canonicalHumanResponse.findings };
  const report = createLiveCalibrationReport({ root, liveEvaluation: evaluation, humanEvaluation: human });
  assert.equal(report.status, 'human_review_required');
  assert.equal(report.human_calibration.treated_as_live_evaluation, false);
  assert.equal(report.human_agreement.assessments.judgment_agreement, 1);
  assert.equal(report.human_agreement.findings.responsibility_agreement, 1);
  assert.equal(report.objective_consistency.contradiction_count, 0);
  assert.equal(report.hallucination_diagnostics.invented_content_check, 'requires_human_review');
  assertLiveCalibrationReport(report, root);
});

test('human review binds to exact live evaluation checksum and remains no-repair authority', async () => {
  const evaluation = await evaluateDesign({ root, request, provider: providerWith(async () => jsonResponse(apiPayload())), repeatRuns: 3 });
  const review = createDesignHumanReview({
    evaluation,
    reviewerReference: 'phase-d2-5-live-calibration-reviewer',
    reviewedAt: '2026-08-14T12:00:00.000Z',
    decision: 'approved_with_notes',
    notes: 'Mock transport calibration review; no repair authorized.',
    findingDecisions: evaluation.findings.map((finding) => ({ finding_id: finding.finding_id, decision: 'false_positive', notes: 'Mock-only finding is not an authoritative live visual judgment.' })),
    root
  });
  assertDesignHumanReview(review, evaluation, root);
  const human = { evaluation_id: 'approved-human-reference', request, provider_runs: [{ provider: canonicalHumanResponse.provider }], dimension_assessments: canonicalHumanResponse.dimension_assessments, findings: canonicalHumanResponse.findings };
  const report = createLiveCalibrationReport({ root, liveEvaluation: evaluation, humanEvaluation: human, humanReview: review });
  assert.equal(report.status, 'reviewed');
  assert.equal(report.human_review.final_gate.status, 'approved_with_notes');
  assert.equal(report.safety.automatic_repair_allowed, false);
  const stale = clone(review); stale.evaluation_checksum = '0'.repeat(64);
  assert.throws(() => createLiveCalibrationReport({ root, liveEvaluation: evaluation, humanEvaluation: human, humanReview: stale }), /stale|ID does not match/);
});

test('Responses client never sends credentials inside request body', async () => {
  let serializedBody;
  await requestOpenAiResponse({
    configuration,
    credentials: { apiKey: 'header-secret', organization: null, project: null },
    body: { model: 'gpt-5.6-sol', input: [] },
    fetchImpl: async (_url, init) => { serializedBody = init.body; assert.equal(init.headers.Authorization, 'Bearer header-secret'); return jsonResponse({ id: 'resp', output: [] }); },
    sleep: async () => {}
  });
  assert.doesNotMatch(serializedBody, /header-secret/);
});

test('live evaluation source has no mutation, repair, or Shopify-write capability', () => {
  const files = ['openai-live-provider.js', 'openai-responses-client.js', 'live-configuration.js', 'live-resume.js', 'live-calibration.js', 'evaluator.js'];
  const source = files.map((file) => fs.readFileSync(path.join(root, 'ai/design-evaluation', file), 'utf8')).join('\n');
  assert.doesNotMatch(source, /write_themes|theme\s+push|theme\s+publish|admin\.graphql\s*\(|apps\/theme|\.liquid|\.css/i);
  assert.match(source, /automatic_repair_allowed:\s*false/);
});

(async () => {
  let passed = 0;
  for (const item of tests) {
    try { await item.run(); passed += 1; process.stdout.write(`✓ ${item.name}\n`); }
    catch (error) { process.stderr.write(`✗ ${item.name}\n${error.stack}\n`); process.exitCode = 1; }
  }
  process.stdout.write(`\n${passed}/${tests.length} live storefront design-evaluation tests passed.\n`);
})().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
