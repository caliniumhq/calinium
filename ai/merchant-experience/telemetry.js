'use strict';

const path = require('path');
const { digest } = require('../architecture');
const {
  TELEMETRY_SCHEMA,
  TELEMETRY_VERSION,
  contractError,
  assertSchema
} = require('./contracts');

const TELEMETRY_EVENTS = Object.freeze([
  'analysis_first_journey_viewed',
  'store_analysis_started',
  'visual_briefing_ready',
  'direction_recommendation_shown',
  'direction_choice_required',
  'direction_selected',
  'recommendation_reason_opened',
  'build_preview_selected',
  'build_started',
  'build_resumed',
  'preview_ready',
  'compare_selected',
  'request_changes_selected',
  'design_approved',
  'advanced_mode_opened',
  'journey_failure_shown'
]);

const PRODUCT_METRICS = Object.freeze([
  'installation_to_analysis_ms',
  'analysis_to_build_click_ms',
  'build_click_to_preview_ms',
  'visible_merchant_question_count',
  'direction_choice_required',
  'merchant_action_count_before_preview',
  'preview_ready_rate',
  'retry_count',
  'advanced_mode_usage',
  'request_changes_usage',
  'approve_design_rate',
  'founder_intervention_count'
]);

function boundedIdentifier(value, label) {
  const result = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(result)) throw contractError('analysis_first_telemetry_identity_invalid', `${label} is not a safe telemetry identifier.`);
  return result;
}

function count(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function createTelemetryEvent(input = {}) {
  const allowed = new Set([
    'eventName', 'occurredAt', 'projectId', 'journeyStage', 'capabilityRevision',
    'visibleMerchantQuestionCount', 'directionChoiceRequired', 'merchantActionCount',
    'retryCount', 'advancedModeUsed', 'founderInterventionCount', 'root'
  ]);
  const extras = Object.keys(input).filter((key) => !allowed.has(key));
  if (extras.length) throw contractError('analysis_first_telemetry_field_forbidden', 'Telemetry input contains a non-allowlisted field.');
  const {
    eventName,
    occurredAt,
    projectId,
    journeyStage,
    capabilityRevision = 'analysis-first-merchant-experience-capability-v1',
    visibleMerchantQuestionCount = 0,
    directionChoiceRequired = false,
    merchantActionCount = 0,
    retryCount = 0,
    advancedModeUsed = false,
    founderInterventionCount = 0,
    root = path.resolve(__dirname, '../..')
  } = input;
  if (!TELEMETRY_EVENTS.includes(eventName)) throw contractError('analysis_first_telemetry_event_invalid', 'Telemetry event is not allowlisted.');
  if (!['analyzing_store', 'building_storefront', 'review_preview'].includes(journeyStage)) throw contractError('analysis_first_telemetry_stage_invalid', 'Telemetry requires one approved visible stage.');
  if (!Number.isFinite(Date.parse(occurredAt))) throw contractError('analysis_first_telemetry_time_invalid', 'Telemetry requires an explicit event timestamp.');
  const subject = { project_id: boundedIdentifier(projectId, 'Project'), capability_revision: boundedIdentifier(capabilityRevision, 'Capability revision') };
  const dimensions = {
    visible_merchant_question_count: count(visibleMerchantQuestionCount),
    direction_choice_required: Boolean(directionChoiceRequired),
    merchant_action_count: count(merchantActionCount),
    retry_count: count(retryCount),
    advanced_mode_used: Boolean(advancedModeUsed),
    founder_intervention_count: count(founderInterventionCount)
  };
  const identity = { event_name: eventName, occurred_at: occurredAt, subject, journey_stage: journeyStage, dimensions };
  const event = {
    schema_version: '1.0',
    contract_version: TELEMETRY_VERSION,
    event_id: `analysis-first-event-${digest(identity).slice(0, 20)}`,
    event_name: eventName,
    occurred_at: occurredAt,
    subject,
    journey_stage: journeyStage,
    dimensions,
    redaction: {
      raw_conversation_included: false,
      customer_data_included: false,
      screenshots_included: false,
      provider_payload_included: false,
      internal_scores_included: false,
      secrets_included: false,
      stack_traces_included: false
    }
  };
  assertSchema(event, TELEMETRY_SCHEMA, 'analysis-first telemetry event', root);
  return event;
}

module.exports = { TELEMETRY_EVENTS, PRODUCT_METRICS, createTelemetryEvent };
