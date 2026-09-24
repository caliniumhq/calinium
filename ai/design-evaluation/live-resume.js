'use strict';

const { digest } = require('../storefront-render/contracts');
const {
  PROVIDER_RESPONSE_VERSION,
  assertDesignEvaluationRequest,
  assertDesignProviderResponse
} = require('./contracts');
const { verifyScreenshotEvidence } = require('./provider');
const { LiveDesignProviderError } = require('./openai-responses-client');

const RESUMABLE_SEMANTIC_FAILURE_CODES = Object.freeze([
  'live_design_incomplete_dimension_coverage',
  'live_design_incomplete_screenshot_coverage',
  'live_design_incomplete_profile_coverage',
  'live_design_missing_controlled_comparison'
]);

function fail(code, message) {
  throw new LiveDesignProviderError(code, message, { retryable: false });
}

function providerMetadata(configuration) {
  return {
    ...configuration.provider,
    model: {
      id: configuration.model.id,
      configuration_revision: configuration.model.configuration_revision,
      reasoning_effort: configuration.model.reasoning_effort,
      image_detail: configuration.model.image_detail
    }
  };
}

function configurationResumeBinding(configuration) {
  return {
    configuration_revision: configuration.configuration_revision,
    provider: configuration.provider,
    api_family: configuration.api.api_family,
    model: configuration.model,
    repeat_runs: configuration.calibration.repeat_runs,
    fixture_fallback_allowed: configuration.safety.fixture_fallback_allowed
  };
}

function recordedConfigurationBinding(configuration) {
  return {
    configuration_revision: configuration?.configuration_revision,
    provider: configuration?.provider,
    api_family: configuration?.api_family,
    model: configuration?.model,
    repeat_runs: configuration?.repeat_runs,
    fixture_fallback_allowed: configuration?.fixture_fallback_allowed
  };
}

function restoreAcceptedRun({ root, request, summary, expectedProvider }) {
  if (!summary || !Number.isInteger(summary.run_sequence) || !summary.response_id || !summary.response_checksum) {
    fail('live_design_resume_run_invalid', 'A preserved live calibration run is incomplete.');
  }
  const response = {
    schema_version: '1.0',
    contract_version: PROVIDER_RESPONSE_VERSION,
    response_id: summary.response_id,
    evaluation_request_id: request.request_id,
    status: 'evaluated',
    provider: summary.provider,
    run_sequence: summary.run_sequence,
    screenshot_evidence: verifyScreenshotEvidence(root, request),
    dimension_assessments: summary.dimension_assessments,
    findings: summary.findings,
    operation: summary.operation,
    diagnostics: summary.diagnostics,
    error: null
  };
  try { assertDesignProviderResponse(response, request, root); }
  catch (cause) { fail('live_design_resume_run_invalid', 'A preserved live calibration run no longer satisfies its bound provider contract.'); }
  if (digest(response) !== summary.response_checksum) {
    fail('live_design_resume_run_checksum_mismatch', 'A preserved live calibration run checksum no longer matches its accepted response.');
  }
  if (digest(response.provider) !== digest(expectedProvider)) {
    fail('live_design_resume_provider_mismatch', 'A preserved live calibration run uses different provider or model provenance.');
  }
  return response;
}

function loadLiveCalibrationResume({ root, currentRequest, configuration, failureReport }) {
  assertDesignEvaluationRequest(currentRequest, root);
  const prior = failureReport?.evaluation;
  if (failureReport?.status !== 'failed' || prior?.status !== 'failed') {
    fail('live_design_resume_state_invalid', 'Live calibration resume requires a failed calibration artifact.');
  }
  const failureCode = prior?.error?.provider_failure?.code;
  if (!RESUMABLE_SEMANTIC_FAILURE_CODES.includes(failureCode)) {
    fail('live_design_resume_failure_not_eligible', 'Only semantic-completeness calibration failures may be resumed.');
  }
  try { assertDesignEvaluationRequest(prior.request, root); }
  catch (cause) { fail('live_design_resume_request_invalid', 'The preserved calibration request no longer satisfies its contract.'); }
  if (prior.request.request_id !== currentRequest.request_id || digest(prior.request) !== digest(currentRequest)) {
    fail('live_design_resume_request_mismatch', 'Current screenshots, D1 evidence, architecture provenance, comparison, context, or policy differ from the preserved calibration request.');
  }
  if (digest(recordedConfigurationBinding(failureReport.configuration)) !== digest(configurationResumeBinding(configuration))) {
    fail('live_design_resume_configuration_mismatch', 'Current live provider or model configuration differs from the preserved calibration configuration.');
  }
  const summaries = prior.provider_runs || [];
  if (!summaries.length || summaries.length >= configuration.calibration.repeat_runs) {
    fail('live_design_resume_run_count_invalid', 'Preserved calibration runs are outside the resumable incomplete range.');
  }
  const expectedProvider = providerMetadata(configuration);
  const acceptedRuns = summaries.map((summary, index) => {
    if (summary.run_sequence !== index + 1) fail('live_design_resume_sequence_invalid', 'Preserved calibration run sequence is not contiguous.');
    return restoreAcceptedRun({ root, request: currentRequest, summary, expectedProvider });
  });
  return {
    acceptedRuns,
    acceptedRunBindings: summaries.map((run) => ({
      run_sequence: run.run_sequence,
      response_id: run.response_id,
      response_checksum: run.response_checksum
    })),
    previousFailureCode: failureCode,
    previousRejectedAttempts: prior.error.provider_failure.rejected_attempts || []
  };
}

module.exports = {
  RESUMABLE_SEMANTIC_FAILURE_CODES,
  providerMetadata,
  configurationResumeBinding,
  recordedConfigurationBinding,
  restoreAcceptedRun,
  loadLiveCalibrationResume
};
