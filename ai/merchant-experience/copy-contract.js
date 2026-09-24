'use strict';

const VISIBLE_STAGES = Object.freeze([
  Object.freeze({ id: 'analyzing_store', label: 'Analyzing your store' }),
  Object.freeze({ id: 'building_storefront', label: 'Building your storefront' }),
  Object.freeze({ id: 'review_preview', label: 'Review your preview' })
]);

const DIRECTION_OPTIONS = Object.freeze({
  visual_story_led: Object.freeze({
    direction_id: 'visual_story_led',
    title: 'Visual & story-led',
    description: 'Immersive imagery, editorial layouts, and discovery through storytelling.'
  }),
  direct_efficient: Object.freeze({
    direction_id: 'direct_efficient',
    title: 'Direct & efficient',
    description: 'Clear product access, practical navigation, and faster browsing.'
  })
});

const PROFILE_DIRECTION = Object.freeze({
  'profile.editorial_discovery.v1': 'visual_story_led',
  'profile.current_calinium.v1': 'direct_efficient'
});

const DIRECTION_INTENT = Object.freeze({
  visual_story_led: 'image_led',
  direct_efficient: 'information_led'
});

const REASON_COPY = Object.freeze({
  catalog_small: Object.freeze({ code: 'compact_catalog', text: 'Your compact catalog supports a more curated browsing path.', priority: 40 }),
  catalog_large: Object.freeze({ code: 'complex_catalog', text: 'Your broad catalog benefits from clearer, faster product access.', priority: 70 }),
  variants_complex: Object.freeze({ code: 'complex_catalog', text: 'Your product choices benefit from a direct information hierarchy.', priority: 75 }),
  navigation_minimal: Object.freeze({ code: 'compact_navigation', text: 'Your focused navigation supports a more immersive browsing experience.', priority: 35 }),
  navigation_complex: Object.freeze({ code: 'utility_navigation', text: 'Your navigation is broad, so a more direct structure is a better fit.', priority: 80 }),
  media_adequate: Object.freeze({ code: 'usable_product_media', text: 'Your available product imagery can support visual discovery.', priority: 45 }),
  media_strong: Object.freeze({ code: 'strong_product_media', text: 'Strong product imagery supports a more visual browsing experience.', priority: 90 }),
  media_weak: Object.freeze({ code: 'limited_product_media', text: 'A direct layout keeps products clear without depending on extensive imagery.', priority: 85 }),
  collections_small: Object.freeze({ code: 'compact_collection_structure', text: 'Your focused collection structure supports curated discovery.', priority: 30 }),
  collections_broad: Object.freeze({ code: 'broad_collection_structure', text: 'Your collection breadth benefits from practical browsing and navigation.', priority: 65 }),
  shopping_image_led: Object.freeze({ code: 'visual_discovery_preference', text: 'You asked for a more visual, story-led shopping experience.', priority: 100 }),
  shopping_information_led: Object.freeze({ code: 'information_led_preference', text: 'You asked for clear, direct, and efficient shopping.', priority: 100 }),
  discovery_priority: Object.freeze({ code: 'visual_discovery_preference', text: 'Your saved direction prioritizes discovery through browsing.', priority: 85 }),
  efficiency_priority: Object.freeze({ code: 'information_led_preference', text: 'Your saved direction prioritizes efficient product access.', priority: 85 }),
  storytelling_high: Object.freeze({ code: 'storytelling_preference', text: 'Your saved direction gives storytelling an important role.', priority: 80 }),
  storytelling_low: Object.freeze({ code: 'information_led_preference', text: 'Your saved direction keeps the shopping path practical and concise.', priority: 70 }),
  navigation_prominent: Object.freeze({ code: 'utility_navigation', text: 'You prefer navigation to remain prominent and practical.', priority: 75 }),
  navigation_minimal_intent: Object.freeze({ code: 'compact_navigation', text: 'You prefer a restrained navigation experience.', priority: 65 }),
  density_dense: Object.freeze({ code: 'product_density_preference', text: 'You prefer more products and information to be visible while browsing.', priority: 75 }),
  density_restrained: Object.freeze({ code: 'product_density_preference', text: 'You prefer a more restrained, spacious product presentation.', priority: 65 }),
  direction_editorial: Object.freeze({ code: 'explicit_direction', text: 'You explicitly chose a visual, story-led direction.', priority: 110 }),
  direction_current: Object.freeze({ code: 'explicit_direction', text: 'You explicitly chose a direct, efficient direction.', priority: 110 }),
  merchant_clarification: Object.freeze({ code: 'explicit_direction', text: 'This direction reflects the visual preference you selected.', priority: 105 })
});

const ACTION_COPY = Object.freeze({
  build_preview: 'Build my preview',
  choose_direction: 'Choose a direction',
  provide_essential_detail: 'Answer one detail',
  retry: 'Try again',
  resume: 'Resume',
  approve_design: 'Approve design',
  request_changes: 'Request changes',
  compare_current_store: 'Compare with current store',
  open_advanced: 'Advanced',
  contact_support: 'Contact support'
});

const SAFE_BUILDING_STATUS = Object.freeze({
  architecture_frozen: 'Preparing your design',
  design_dna_ready: 'Preparing your design',
  composition_ready: 'Preparing your design',
  generation_running: 'Building your storefront',
  artifact_ready: 'Reviewing the result',
  render_qa_running: 'Preparing your preview',
  qa_review_required: 'Completing final checks',
  repair_review_required: 'Completing final checks'
});

const FORBIDDEN_MERCHANT_TERMS = Object.freeze([
  /profile\.[a-z0-9_.-]+/i,
  /family\.[a-z0-9_.-]+/i,
  /current_calinium|editorial_discovery/i,
  /Current Calinium|Editorial Discovery/i,
  /architecture(?:\s|_|-)*(?:score|family|profile|selection|freeze)/i,
  /candidate(?:\s|_|-)*score|selection(?:\s|_|-)*margin/i,
  /Design DNA/i,
  /\bD1\b|D2\.7/i,
  /OpenAI|gpt-[0-9]|provider attempt/i,
  /checksum|policy revision|lineage|lease epoch|worker job/i,
  /repair class|automatic repair/i,
  /(?:^|["'\s])\/(?:Users|home|app|tmp)\//i,
  /stack trace/i
]);

const ACCESSIBILITY_CONTRACT = Object.freeze({
  keyboard_accessible_actions: true,
  visible_focus_required: true,
  semantic_buttons_required: true,
  direction_cards_keyboard_selectable: true,
  selected_state_announced: true,
  status_changes_announced: true,
  color_only_meaning_forbidden: true,
  minimum_target_height_px: 40,
  embedded_narrow_width_supported: true,
  required_horizontal_scrolling: false,
  reduced_motion_supported: true
});

module.exports = {
  VISIBLE_STAGES,
  DIRECTION_OPTIONS,
  PROFILE_DIRECTION,
  DIRECTION_INTENT,
  REASON_COPY,
  ACTION_COPY,
  SAFE_BUILDING_STATUS,
  FORBIDDEN_MERCHANT_TERMS,
  ACCESSIBILITY_CONTRACT
};
