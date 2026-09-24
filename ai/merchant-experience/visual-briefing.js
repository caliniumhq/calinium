'use strict';

const path = require('path');
const {
  digest,
  assertStoreIntelligenceContract,
  assertMerchantIntent,
  assertFrozenArchitectureSelection
} = require('../architecture');
const { assertQuestionRequest } = require('../conversation');
const { questionById } = require('../conversation/question-planner');
const { STATES } = require('../merchant-flow');
const {
  VISUAL_BRIEFING_SCHEMA,
  VISUAL_BRIEFING_VERSION,
  clone,
  contractError,
  assertSchema,
  canonicalContract,
  assertChecksum,
  normalizeProjectBinding
} = require('./contracts');
const { DIRECTION_OPTIONS, PROFILE_DIRECTION, REASON_COPY } = require('./copy-contract');

const BUILDING_FLOW_STATES = new Set([
  'architecture_frozen', 'design_dna_ready', 'composition_ready', 'generation_running',
  'artifact_ready', 'render_qa_running', 'qa_review_required', 'repair_review_required'
]);
const PREVIEW_FLOW_STATES = new Set(['preview_ready', 'merchant_action_required', 'completed']);
const EXPLICIT_DIRECTION_VALUES = Object.freeze({
  image_led: 'visual_story_led',
  editorial_discovery: 'visual_story_led',
  information_led: 'direct_efficient',
  current_calinium: 'direct_efficient'
});

function assertMaterialOutcome(value, root) {
  return assertSchema(value, 'schemas/calinium-architecture-selection-outcome.schema.json', 'architecture material-question outcome', root);
}

function explicitDirection(merchantIntent) {
  const values = (merchantIntent?.explicit_preferences || [])
    .filter((item) => item.confidence !== 'Unknown' && ['storefront.shopping_mode', 'storefront.architecture_direction'].includes(item.path))
    .map((item) => EXPLICIT_DIRECTION_VALUES[item.value])
    .filter(Boolean);
  const unique = [...new Set(values)];
  if (unique.length > 1) throw contractError('analysis_first_explicit_direction_conflict', 'Merchant Intent contains conflicting explicit storefront directions.');
  return unique[0] || null;
}

function directionOption(directionId, eligible = true) {
  const option = DIRECTION_OPTIONS[directionId];
  if (!option) throw contractError('analysis_first_direction_unsupported', 'The architecture selection cannot be mapped to an approved merchant direction.');
  return { ...option, eligible: Boolean(eligible) };
}

function candidateResults(selection) {
  return clone(selection?.automatic_policy?.candidate_results || selection?.candidate_results || []);
}

function eligibleDirections(selection) {
  const results = candidateResults(selection);
  const directions = [];
  for (const candidate of results) {
    const directionId = PROFILE_DIRECTION[candidate.candidate_id];
    if (!directionId || candidate.eligibility?.eligible !== true || candidate.compatibility_result?.valid !== true) continue;
    if (!directions.includes(directionId)) directions.push(directionId);
  }
  return directions;
}

function selectedCandidate(selection) {
  if (!selection?.profile_id) return null;
  return candidateResults(selection).find((candidate) => candidate.candidate_id === selection.profile_id) || null;
}

function reasonsFor(selection, merchantIntent, directionId) {
  const sourceCodes = [];
  const explicit = explicitDirection(merchantIntent);
  if (explicit === directionId) sourceCodes.push(directionId === 'visual_story_led' ? 'direction_editorial' : 'direction_current');
  for (const signal of selectedCandidate(selection)?.positive_signals || []) sourceCodes.push(signal.reason_code);
  for (const code of selection?.fit_result?.reason_codes || []) sourceCodes.push(code);
  if (selection?.material_clarification) sourceCodes.push('merchant_clarification');
  const candidates = sourceCodes
    .map((sourceReasonCode) => ({ sourceReasonCode, copy: REASON_COPY[sourceReasonCode] }))
    .filter((entry) => entry.copy)
    .sort((left, right) => right.copy.priority - left.copy.priority || left.copy.code.localeCompare(right.copy.code) || left.sourceReasonCode.localeCompare(right.sourceReasonCode));
  const seen = new Set();
  return candidates.filter((entry) => {
    if (seen.has(entry.copy.code)) return false;
    seen.add(entry.copy.code);
    return true;
  }).slice(0, 3).map((entry) => ({
    reason_code: entry.copy.code,
    copy: entry.copy.text,
    source_reason_code: entry.sourceReasonCode
  }));
}

function essentialDetailContract(value) {
  if (!value) return null;
  const question = questionById(value.question_id);
  if (!question || question.critical !== true || question.prompt !== value.prompt) {
    throw contractError('analysis_first_essential_detail_invalid', 'Essential-detail requests must reuse one current deterministic critical question.');
  }
  return { question_id: question.id, prompt: question.prompt };
}

function sourceBinding({ storeIntelligence, merchantIntent, selection, questionRequest, flow }) {
  return {
    store_intelligence_revision: storeIntelligence?.revision_id || null,
    store_intelligence_checksum: storeIntelligence ? digest(storeIntelligence) : null,
    merchant_intent_revision: merchantIntent?.revision_id || null,
    merchant_intent_checksum: merchantIntent ? digest(merchantIntent) : null,
    selection_kind: selection?.frozen === true ? 'frozen' : selection?.status === 'material_question_required' ? 'material_question_required' : 'none',
    selection_revision: selection?.revision_id || selection?.outcome_id || null,
    selection_checksum: selection ? digest(selection) : null,
    material_question_id: questionRequest?.question_id || null,
    material_question_checksum: questionRequest?.checksum || null,
    flow_state: flow?.state || null,
    flow_sequence: Number.isInteger(flow?.sequence) ? flow.sequence : null,
    flow_checksum: flow?.flow_checksum || flow?.checksum || null
  };
}

function createMerchantVisualBriefing({
  projectBinding,
  storeIntelligence = null,
  merchantIntent = null,
  selection = null,
  questionRequest = null,
  flow = null,
  essentialDetail = null,
  selectionBlocked = false,
  superseded = false,
  buildSelected = false,
  root = path.resolve(__dirname, '../..')
} = {}) {
  const project = normalizeProjectBinding(projectBinding);
  const intelligence = storeIntelligence ? assertStoreIntelligenceContract(storeIntelligence, root) : null;
  const intent = merchantIntent ? assertMerchantIntent(merchantIntent, root) : null;
  if (flow?.state && !STATES.includes(flow.state)) throw contractError('analysis_first_flow_state_invalid', 'Visual briefing received an unsupported merchant-flow state.');

  let selectedDirection = null;
  let recommendedDirection = null;
  let mode = 'none';
  let state = 'analyzing';
  let directions = [];
  let reasons = [];

  if (selection?.frozen === true) {
    assertFrozenArchitectureSelection(selection, root);
    selectedDirection = PROFILE_DIRECTION[selection.profile_id];
    if (!selectedDirection) throw contractError('analysis_first_profile_mapping_missing', 'The selected architecture has no approved merchant direction mapping.');
    recommendedDirection = selectedDirection;
    directions = eligibleDirections(selection);
    if (!directions.includes(selectedDirection)) directions.unshift(selectedDirection);
    const explicit = explicitDirection(intent);
    mode = explicit ? 'selected' : 'recommendation';
    state = explicit ? 'accepted' : 'recommendation_ready';
    reasons = reasonsFor(selection, intent, selectedDirection);
  } else if (selection?.status === 'material_question_required') {
    assertMaterialOutcome(selection, root);
    const eligible = eligibleDirections(selection);
    if (!eligible.length) {
      state = 'blocked';
    } else if (eligible.length === 1) {
      recommendedDirection = eligible[0];
      selectedDirection = eligible[0];
      directions = eligible;
      mode = 'recommendation';
      state = 'recommendation_ready';
    } else {
      if (!questionRequest) throw contractError('analysis_first_material_question_missing', 'A material ambiguity briefing requires the existing E2 question request.');
      const question = assertQuestionRequest(questionRequest, root);
      if (question.originating_selection.outcome_id !== selection.outcome_id || question.originating_selection.outcome_checksum !== digest(selection)) {
        throw contractError('analysis_first_material_question_stale', 'The direction choice does not bind the current architecture-selection outcome.');
      }
      directions = ['visual_story_led', 'direct_efficient'].filter((directionId) => eligible.includes(directionId));
      mode = 'choice_required';
      state = 'direction_choice_required';
    }
  }

  const detail = essentialDetailContract(essentialDetail);
  if (detail && !selection) state = 'essential_detail_required';
  if (selectionBlocked) state = 'blocked';
  if (superseded) state = 'superseded';
  if (buildSelected || BUILDING_FLOW_STATES.has(flow?.state)) state = 'build_in_progress';
  if (PREVIEW_FLOW_STATES.has(flow?.state)) state = 'preview_ready';

  const direction = {
    mode,
    recommended_direction: recommendedDirection,
    selected_direction: selectedDirection,
    options: directions.map((directionId) => directionOption(directionId, true))
  };
  const binding = sourceBinding({ storeIntelligence: intelligence, merchantIntent: intent, selection, questionRequest, flow });
  const identity = {
    project_binding: project,
    state,
    source_binding: binding
  };
  const briefingId = `merchant-visual-briefing-${digest(identity).slice(0, 20)}`;
  const base = {
    schema_version: '1.0',
    contract_version: VISUAL_BRIEFING_VERSION,
    briefing_id: briefingId,
    project_binding: project,
    state,
    direction,
    reasons,
    essential_detail: detail,
    source_binding: binding,
    behavior: {
      independently_selects_architecture: false,
      reuses_existing_e2_semantics: true,
      maximum_direction_choices: 2,
      recommendation_requires_choice: false
    },
    safety: {
      arbitrary_generated_copy_allowed: false,
      numeric_confidence_exposed: false,
      internal_architecture_identity_exposed: false,
      automatic_generation_allowed: false,
      automatic_theme_action_allowed: false
    }
  };
  const briefing = canonicalContract(base);
  assertSchema(briefing, VISUAL_BRIEFING_SCHEMA, 'merchant visual briefing', root);
  assertChecksum(briefing, 'Merchant visual briefing');
  if (briefing.state === 'direction_choice_required' && briefing.direction.options.length !== 2) {
    throw contractError('analysis_first_direction_count_invalid', 'Material ambiguity must expose exactly two eligible directions.');
  }
  if (briefing.state !== 'direction_choice_required' && briefing.direction.mode === 'choice_required') {
    throw contractError('analysis_first_direction_state_invalid', 'A direction choice may only appear for material ambiguity.');
  }
  return briefing;
}

function assertMerchantVisualBriefing(value, root = path.resolve(__dirname, '../..')) {
  assertSchema(value, VISUAL_BRIEFING_SCHEMA, 'merchant visual briefing', root);
  assertChecksum(value, 'Merchant visual briefing');
  return value;
}

module.exports = {
  BUILDING_FLOW_STATES,
  PREVIEW_FLOW_STATES,
  createMerchantVisualBriefing,
  assertMerchantVisualBriefing,
  eligibleDirections,
  explicitDirection,
  reasonsFor
};
