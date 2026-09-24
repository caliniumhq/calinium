const STAGES = Object.freeze([
  ['analyzing_store', 'Analyzing your store'],
  ['building_storefront', 'Building your storefront'],
  ['review_preview', 'Review your preview']
]);
const DIRECTIONS = Object.freeze({
  visual_story_led: { id: 'visual_story_led', title: 'Visual & story-led', description: 'Immersive imagery, editorial layouts, and discovery through storytelling.' },
  direct_efficient: { id: 'direct_efficient', title: 'Direct & efficient', description: 'Clear product access, practical navigation, and faster browsing.' }
});

function action(id, label, enabled = true) { return { id, label, enabled }; }
function stageList(current) {
  const index = STAGES.findIndex(([id]) => id === current);
  return STAGES.map(([id, label], itemIndex) => ({ id, label, status: itemIndex < index ? 'complete' : itemIndex === index ? 'current' : 'upcoming' }));
}
function fixture(id, options = {}) {
  const stage = options.stage || 'analyzing_store';
  const selected = options.direction ? DIRECTIONS[options.direction] : null;
  const projection = {
    schema_version: '1.0',
    contract_version: 'analysis-first-merchant-projection-v1',
    stages: stageList(stage),
    current_stage: { id: stage, label: STAGES.find(([key]) => key === stage)[1] },
    status: {
      tone: options.tone || (stage === 'review_preview' ? 'ready' : 'working'),
      headline: options.headline || (stage === 'analyzing_store' ? 'Analyzing your store' : stage === 'building_storefront' ? 'Building your storefront' : 'Review your preview'),
      explanation: options.explanation || (stage === 'review_preview' ? 'Explore the generated storefront before deciding what to do next.' : 'Your current theme remains unchanged while Calinium prepares the private preview.'),
      progress: { kind: options.progress || (stage === 'building_storefront' ? 'indeterminate' : stage === 'review_preview' ? 'complete' : 'action_required'), percent: null, time_remaining: null }
    },
    primary_action: options.primary || null,
    secondary_actions: options.secondary || (selected
      ? [action('see_why', 'See why'), action('open_advanced', 'Advanced')]
      : [action('open_advanced', 'Advanced')]),
    direction: options.choice ? {
      state: 'direction_choice_required', headline: 'Choose the storefront direction that feels right for your customers.', choice_required: true, selected_direction: null,
      options: [DIRECTIONS.visual_story_led, DIRECTIONS.direct_efficient], reasons: [], essential_detail: null
    } : options.essential ? {
      state: 'essential_detail_required', headline: null, choice_required: false, selected_direction: null, options: [], reasons: [], essential_detail: { prompt: 'What do you sell?' }
    } : selected ? {
      state: options.directionState || 'recommendation_ready', headline: `${selected.title} is the recommended direction.`, choice_required: false, selected_direction: selected,
      options: [selected], reasons: options.reasons || ['Your available product imagery can support visual discovery.'], essential_detail: null
    } : null,
    advanced_mode_available: true,
    chat_refinement_available: stage === 'review_preview',
    preview_ready: stage === 'review_preview',
    commercial_boundary_pending: false,
    theme_action_authorized: false,
    safety_reassurance: 'Your current theme will not change while you review this preview.'
  };
  return {
    id,
    experience: {
      contract_version: 'analysis-first-merchant-experience-response-v1', eligible: true, fallback: null, projection,
      projection_key: `f1b_${'A'.repeat(43)}`,
      action_bindings: options.choice ? { choose_direction: `f1b_${'B'.repeat(43)}` } : {},
      preview_link: stage === 'review_preview' ? { label: 'Open Calinium preview', url: 'https://fixture.myshopify.com/?preview_theme_id=7' } : null
    }
  };
}

export const ANALYSIS_FIRST_EXPERIENCE_FIXTURES = Object.freeze([
  fixture('a_confident_visual_story_led', { direction: 'visual_story_led', primary: action('build_preview', 'Build my preview') }),
  fixture('b_confident_direct_efficient', { direction: 'direct_efficient', primary: action('build_preview', 'Build my preview') }),
  fixture('c_material_ambiguity', { choice: true, primary: action('choose_direction', 'Choose a direction') }),
  fixture('d_existing_explicit_visual', { direction: 'visual_story_led', directionState: 'accepted', primary: action('build_preview', 'Build my preview') }),
  fixture('e_existing_explicit_direct', { direction: 'direct_efficient', directionState: 'accepted', primary: action('build_preview', 'Build my preview') }),
  fixture('f_single_eligible_direction', { direction: 'direct_efficient', primary: action('build_preview', 'Build my preview') }),
  fixture('g_store_analysis', { progress: 'indeterminate' }),
  fixture('h_essential_detail', { essential: true, primary: action('provide_essential_detail', 'Answer one detail') }),
  fixture('i_safe_analysis_blocker', { headline: 'Something needs attention', tone: 'attention', progress: 'blocked' }),
  fixture('j_build_in_progress', { stage: 'building_storefront' }),
  fixture('k_retryable_failure', { stage: 'building_storefront', headline: 'Something needs attention', tone: 'attention', progress: 'action_required', primary: action('retry', 'Try again') }),
  fixture('l_terminal_failure', { stage: 'building_storefront', headline: 'Something needs attention', tone: 'attention', progress: 'blocked', secondary: [action('contact_support', 'Contact support'), action('open_advanced', 'Advanced')] }),
  fixture('m_internal_review', { stage: 'building_storefront', headline: 'Completing final checks' }),
  fixture('n_preview_ready', { stage: 'review_preview', primary: action('approve_design', 'Approve design'), secondary: [action('request_changes', 'Request changes'), action('compare_current_store', 'Compare with current store'), action('open_advanced', 'Advanced')] }),
  fixture('o_legacy_advanced', { secondary: [action('open_advanced', 'Advanced')] }),
  fixture('p_completed_action', { stage: 'review_preview', headline: 'Your approved action is complete', secondary: [action('open_advanced', 'Advanced')] })
]);

export function fixtureExperience(id) { return ANALYSIS_FIRST_EXPERIENCE_FIXTURES.find((entry) => entry.id === id)?.experience || null; }
