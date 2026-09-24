'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest } = require('../storefront-render/contracts');
const { readJson, contractError } = require('./contracts');
const { assertStabilizationRequest, createVisualObservation, REPAIR_INSTRUCTION, loadStabilizationPolicy } = require('./stabilization-contracts');
const { assertLiveConfiguration, resolveLiveCredentials } = require('./live-configuration');
const { LiveDesignProviderError, requestOpenAiResponse } = require('./openai-responses-client');
const { extractResponseText, usageMetadata, mergeUsage } = require('./openai-live-provider');

const LIVE_OBSERVATION_OUTPUT_SCHEMA = 'schemas/calinium-live-visual-observation-output.schema.json';
const OBSERVATION_SEMANTIC_MAX_ATTEMPTS = 2;
const COMPLETENESS_RETRY_CODES = Object.freeze(['visual_observation_incomplete_cell_inspection', 'visual_observation_incomplete_objective_acknowledgement']);

function responseSchema(root) {
  const schema = readJson(path.join(root, LIVE_OBSERVATION_OUTPUT_SCHEMA));
  delete schema.$schema;
  delete schema.$id;
  delete schema.title;
  return schema;
}

function stageOneInstructions() {
  return [
    'You are Stage 1 of Calinium visual judgment stabilization.',
    'Answer only: what is visibly happening in the supplied screenshots?',
    'Do not assign a design dimension, importance, responsibility, ownership, recommendation, repair, or code change.',
    'Inspect each supplied screenshot and return exactly one cell_inspection for every cell ID.',
    'Observations must be atomic: one route and one visible phenomenon per observation; split merged collection, product, header, footer, or typography conditions.',
    'Use the supplied observation kinds only. Describe precise visible regions and evidence without inferring merchant intent or missing data ownership.',
    'D1 facts are frozen and authoritative. Acknowledge every fact; when a root page overflow is supplied, record the visible page_overflow and do not debate its existence.',
    'A clipped child may be observed separately from root overflow, but do not claim that it is an independent repair.',
    'Generic calibration examples: an empty titled module is observed as visible heading plus absent supporting content; a crowded mobile masthead is observed as identity/control proximity; a mid-word break is observed as the exact visible split.',
    'Do not invent content, hidden interaction, source behavior, architecture ownership, or merchant intent.',
    'Do not use words that instruct a fix, such as should, must, fix, repair, modify, or implement.',
    'Return only the strict structured output requested by the schema. Persist concise conclusions, not hidden reasoning.'
  ].join('\n');
}

function safeObservationContext(request, policy) {
  return {
    request_id: request.request_id,
    policy_revision: request.policy_revision,
    stage: 'visual_observation_only',
    observation_kinds: policy.observation_kinds,
    required_cell_ids: request.cells.map((cell) => cell.cell_id),
    cells: request.cells.map((cell) => ({
      cell_id: cell.cell_id,
      profile_id: cell.profile_id,
      route_id: cell.route_id,
      viewport_id: cell.viewport_id,
      screenshot_sha256: cell.screenshot.sha256,
      screenshot_width: cell.screenshot.width,
      screenshot_height: cell.screenshot.height,
      objective_evaluation: cell.objective_evaluation
    })),
    authoritative_objective_facts: request.objective_facts,
    safety: request.safety
  };
}

function buildObservationResponsesRequest({ root, request, configuration }) {
  assertStabilizationRequest(request, root);
  if (request.mode !== 'limited_live_validation') throw new Error('Live observation provider requires the limited-live 12-cell request.');
  assertLiveConfiguration(configuration, root);
  const policy = loadStabilizationPolicy(root);
  const content = [{ type: 'input_text', text: `Inspect the bounded 12-cell matrix. Context follows as JSON:\n${JSON.stringify(safeObservationContext(request, policy))}` }];
  for (const cell of request.cells) {
    content.push({ type: 'input_text', text: `Screenshot ${cell.cell_id}: profile=${cell.profile_id}; route=${cell.route_id}; viewport=${cell.viewport_id}; sha256=${cell.screenshot.sha256}.` });
    content.push({ type: 'input_image', image_url: `data:image/png;base64,${fs.readFileSync(path.resolve(root, cell.screenshot.artifact_reference)).toString('base64')}`, detail: configuration.model.image_detail });
  }
  return {
    model: configuration.model.id,
    reasoning: { effort: 'medium' },
    store: false,
    max_output_tokens: Math.min(configuration.model.max_output_tokens, 20000),
    input: [
      { role: 'developer', content: [{ type: 'input_text', text: stageOneInstructions() }] },
      { role: 'user', content }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'calinium_visual_observation_stage',
        description: 'Frozen screenshot observations without diagnosis, ownership, recommendation, or repair instructions.',
        strict: true,
        schema: responseSchema(root)
      }
    }
  };
}

function parseObservationOutput(payload, root) {
  let output;
  try { output = JSON.parse(extractResponseText(payload)); }
  catch (cause) {
    if (cause instanceof LiveDesignProviderError) throw cause;
    throw new LiveDesignProviderError('visual_observation_malformed_output', 'Live visual observation returned malformed structured output.');
  }
  const errors = createSchemaValidator(root).validateFile(output, LIVE_OBSERVATION_OUTPUT_SCHEMA, 'live_visual_observation_output');
  if (errors.length) throw contractError('Live Visual Observation Output', errors);
  return output;
}

function observationCompleteness(output, request) {
  const requiredCells = new Set(request.cells.map((cell) => cell.cell_id));
  const inspected = new Set(output.cell_inspections.map((item) => item.cell_id));
  const expectedFacts = new Set(request.objective_facts.map((fact) => fact.finding_id));
  const acknowledged = new Set(output.objective_fact_acknowledgements.filter((item) => item.status === 'acknowledged').map((item) => item.finding_id));
  return {
    missing_cell_ids: [...requiredCells].filter((id) => !inspected.has(id)).sort(),
    unknown_cell_ids: [...inspected].filter((id) => !requiredCells.has(id)).sort(),
    duplicate_cell_ids: output.cell_inspections.map((item) => item.cell_id).filter((id, index, values) => values.indexOf(id) !== index),
    missing_objective_finding_ids: [...expectedFacts].filter((id) => !acknowledged.has(id)).sort(),
    unknown_objective_finding_ids: output.objective_fact_acknowledgements.map((item) => item.finding_id).filter((id) => !expectedFacts.has(id)).sort()
  };
}

function semanticError(code, message, diagnostics) {
  return new LiveDesignProviderError(code, message, { retryable: false, diagnostics });
}

function normalizeObservationOutput({ output, request, root, runSequence }) {
  const completeness = observationCompleteness(output, request);
  if (completeness.missing_cell_ids.length || completeness.unknown_cell_ids.length || completeness.duplicate_cell_ids.length) {
    throw semanticError('visual_observation_incomplete_cell_inspection', 'Live visual observation did not inspect the exact 12 supplied cells.', completeness);
  }
  if (completeness.missing_objective_finding_ids.length || completeness.unknown_objective_finding_ids.length) {
    throw semanticError('visual_observation_incomplete_objective_acknowledgement', 'Live visual observation did not acknowledge every authoritative D1 fact.', completeness);
  }
  const cellById = new Map(request.cells.map((cell) => [cell.cell_id, cell]));
  const objectiveById = new Map(request.objective_facts.map((fact) => [fact.finding_id, fact]));
  const localKeys = new Set();
  const grouped = new Map();
  for (const raw of output.observations) {
    if (localKeys.has(raw.local_key)) throw semanticError('visual_observation_duplicate_local_key', 'Live visual observation reused a local observation key.', { local_key: raw.local_key });
    localKeys.add(raw.local_key);
    const identity = [raw.phenomenon, raw.valence, raw.component, raw.route_id, [...raw.profile_ids].sort().join(','), [...raw.viewport_ids].sort().join(',')].join('|');
    if (!grouped.has(identity)) grouped.set(identity, JSON.parse(JSON.stringify(raw)));
    else {
      const existing = grouped.get(identity);
      existing.visible_region = [...new Set([existing.visible_region, raw.visible_region])].join('; ');
      existing.evidence_summary = [...new Set([existing.evidence_summary, raw.evidence_summary])].join(' ');
      existing.evidence = [...new Map([...existing.evidence, ...raw.evidence].map((item) => [`${item.cell_id}|${item.region}|${item.visible_evidence}`, item])).values()];
      existing.objective_finding_ids = [...new Set([...existing.objective_finding_ids, ...raw.objective_finding_ids])].sort();
      if (raw.confidence === 'low' || (raw.confidence === 'medium' && existing.confidence === 'high')) existing.confidence = raw.confidence;
    }
  }
  const observations = [...grouped.values()].map((raw) => {
    const evidence = raw.evidence.map((item) => {
      const cell = cellById.get(item.cell_id);
      if (!cell) throw semanticError('visual_observation_scope_mismatch', 'Live visual observation cited an unknown screenshot cell.', { cell_id: item.cell_id });
      if (cell.route_id !== raw.route_id || !raw.profile_ids.includes(cell.profile_id) || !raw.viewport_ids.includes(cell.viewport_id)) throw semanticError('visual_observation_scope_mismatch', 'Live visual observation evidence falls outside its declared scope.', { cell_id: item.cell_id });
      return { cell_id: item.cell_id, screenshot_sha256: cell.screenshot.sha256, region: item.region, visible_evidence: item.visible_evidence };
    });
    const text = [raw.evidence_summary, raw.visible_region, ...raw.evidence.map((item) => item.visible_evidence)].join(' ');
    if (REPAIR_INSTRUCTION.test(text)) throw semanticError('visual_observation_contains_repair_instruction', 'Stage-1 live observation contained a repair or recommendation instruction.', { local_key: raw.local_key });
    const objectiveFacts = raw.objective_finding_ids.map((id) => {
      const fact = objectiveById.get(id);
      if (!fact) throw semanticError('visual_observation_objective_mismatch', 'Live visual observation cited an unknown D1 finding.', { finding_id: id });
      return { finding_id: fact.finding_id, rule_id: fact.rule_id, severity: fact.severity, authority: 'phase_d1_authoritative' };
    });
    return createVisualObservation({
      run_sequence: runSequence,
      phenomenon: raw.phenomenon,
      valence: raw.valence,
      profile_ids: [...new Set(raw.profile_ids)].sort(),
      route_id: raw.route_id,
      viewport_ids: [...new Set(raw.viewport_ids)].sort(),
      component: raw.component,
      visible_region: raw.visible_region,
      evidence_summary: raw.evidence_summary,
      confidence: raw.confidence,
      evidence,
      objective_facts: objectiveFacts,
      source_finding_ids: []
    }, request, root);
  });
  for (const fact of request.objective_facts) {
    if (fact.rule_id === 'root_horizontal_overflow' && !observations.some((item) => item.phenomenon === 'page_overflow' && item.objective_facts.some((objective) => objective.finding_id === fact.finding_id))) {
      throw semanticError('visual_observation_incomplete_objective_acknowledgement', 'Authoritative root overflow was acknowledged but not preserved as a frozen visual observation.', { missing_objective_finding_ids: [fact.finding_id] });
    }
  }
  return observations;
}

function failureWithOperation(cause, details) {
  if (cause instanceof LiveDesignProviderError) {
    cause.attempts = details.attempts;
    cause.retries = details.retries;
    cause.rejectedAttempts = details.rejectedAttempts;
  }
  return cause;
}

function createStabilizedObservationProvider({ root, configuration, env = process.env, fetchImpl, sleep, clock } = {}) {
  assertLiveConfiguration(configuration, root);
  const credentials = resolveLiveCredentials(configuration, env, { required: true });
  const metadata = {
    interface_version: 'storefront-design-provider-v1',
    provider_id: 'calinium-openai-responses-visual-observation',
    provider_version: '1.0.0',
    provider_kind: 'live_multimodal',
    model: { id: configuration.model.id, configuration_revision: 'gpt-5-6-sol-visual-observation-stage-v1', reasoning_effort: 'medium', image_detail: configuration.model.image_detail }
  };
  return {
    metadata,
    async evaluate({ request, runSequence }) {
      const body = buildObservationResponsesRequest({ root, request, configuration });
      const rejectedAttempts = [];
      const retries = [];
      const usages = [];
      let totalLatency = 0;
      let totalAttempts = 0;
      let totalRequests = 0;
      for (let semanticAttempt = 1; semanticAttempt <= OBSERVATION_SEMANTIC_MAX_ATTEMPTS; semanticAttempt += 1) {
        const response = await requestOpenAiResponse({ configuration, credentials, body, fetchImpl, sleep, clock });
        totalLatency += Math.round(response.operation.latency_ms);
        totalAttempts += response.operation.attempts;
        totalRequests += response.operation.request_count;
        retries.push(...response.operation.retries.map((item) => ({ ...item, semantic_attempt: semanticAttempt, kind: 'transport' })));
        usages.push(usageMetadata(response.payload));
        let output;
        try { output = parseObservationOutput(response.payload, root); }
        catch (cause) { throw failureWithOperation(cause, { attempts: totalAttempts, retries, rejectedAttempts }); }
        try {
          const observations = normalizeObservationOutput({ output, request, root, runSequence });
          return {
            run_sequence: runSequence,
            provider: metadata,
            observations,
            cell_inspections: output.cell_inspections,
            objective_fact_acknowledgements: output.objective_fact_acknowledgements,
            diagnostics: { rejected_attempts: rejectedAttempts, d1_contradiction_count: 0, duplicate_observations_merged: output.observations.length - observations.length },
            operation: {
              api_family: configuration.api.api_family,
              api_response_id: response.payload.id || null,
              response_model: response.payload.model || null,
              model_configuration_revision: metadata.model.configuration_revision,
              latency_ms: totalLatency,
              attempts: totalAttempts,
              retry_count: retries.length,
              request_count: totalRequests,
              retries,
              usage: mergeUsage(usages)
            }
          };
        } catch (cause) {
          if (!(cause instanceof LiveDesignProviderError) || !COMPLETENESS_RETRY_CODES.includes(cause.code)) throw failureWithOperation(cause, { attempts: totalAttempts, retries, rejectedAttempts });
          rejectedAttempts.push({ semantic_attempt: semanticAttempt, api_response_id: response.payload.id || null, output_checksum: digest(output), usage: usageMetadata(response.payload), latency_ms: response.operation.latency_ms, diagnostics: cause.diagnostics });
          retries.push({ attempt: semanticAttempt, code: cause.code, status: null, delay_ms: 0, kind: 'semantic_completeness', diagnostics: cause.diagnostics });
          if (semanticAttempt === OBSERVATION_SEMANTIC_MAX_ATTEMPTS) throw new LiveDesignProviderError(cause.code, cause.message, { retryable: false, attempts: totalAttempts, retries, rejectedAttempts, diagnostics: { ...cause.diagnostics, retry_exhausted: true } });
        }
      }
      throw new LiveDesignProviderError('visual_observation_semantic_retry_exhausted', 'Live visual observation exhausted its bounded completeness retry.');
    }
  };
}

module.exports = {
  LIVE_OBSERVATION_OUTPUT_SCHEMA,
  OBSERVATION_SEMANTIC_MAX_ATTEMPTS,
  COMPLETENESS_RETRY_CODES,
  responseSchema,
  stageOneInstructions,
  safeObservationContext,
  buildObservationResponsesRequest,
  parseObservationOutput,
  observationCompleteness,
  normalizeObservationOutput,
  createStabilizedObservationProvider
};
