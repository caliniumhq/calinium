'use strict';

/*
 * A layout recipe can suggest a Founder Story for an industry, but that is not
 * evidence that the merchant has a founder portrait or has asked Calinium to
 * tell a founder-led story. Keep that distinction at the strategy boundary:
 * a portrait becomes required only when the merchant separately approves the
 * founder-story recommendation (or a future strategy carries the explicit
 * requiresFounderPortrait flag).
 */

const FOUNDER_SECTION_ID = 'founder-story';
const FOUNDER_DECISION_PATHS = new Set([
  'founder-story',
  'homepage.founder-story',
  'homepage.sections.founder-story'
]);

const RESOURCE_PLAN_POLICY_VERSION = '1.2';

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function sectionId(section) {
  return typeof section === 'string' ? section : section?.sectionId || section?.section_id || section?.id || null;
}

function founderStorySection(storeStrategy) {
  return (storeStrategy?.homepage?.sections || []).find((section) => sectionId(section) === FOUNDER_SECTION_ID) || null;
}

function founderPortraitPolicy({ storeStrategy, review } = {}) {
  const section = founderStorySection(storeStrategy);
  const decision = (review?.decisions || []).find((item) => FOUNDER_DECISION_PATHS.has(item?.path)) || null;
  const explicitlyApproved = Boolean(
    section
    && (section.requiresFounderPortrait === true || decision?.status === 'approved')
  );

  if (explicitlyApproved) {
    return {
      founder_story_present: true,
      portrait_required: true,
      reason: 'The approved Store Strategy explicitly includes a founder-led story, so Calinium needs a real merchant-approved portrait.'
    };
  }

  return {
    founder_story_present: Boolean(section),
    portrait_required: false,
    reason: section
      ? 'Founder Story is a recipe suggestion without a separate merchant approval. Calinium will use the documented omission fallback rather than require or invent a portrait.'
      : 'The approved Store Strategy does not include a founder-led section, so a founder portrait is optional.'
  };
}

function founderRelated(value) {
  return String(value || '').toLowerCase().includes('founder');
}

function isFounderSection(section) {
  return section?.section_id === FOUNDER_SECTION_ID || sectionId(section) === FOUNDER_SECTION_ID;
}

function filterDraftPage(page) {
  if (!page?.sections) return page;
  return { ...page, sections: page.sections.filter((section) => !isFounderSection(section)) };
}

function applyStrategySectionPolicy({ draft, storeStrategy, review } = {}) {
  const policy = founderPortraitPolicy({ storeStrategy, review });
  if (policy.portrait_required || !draft) return { draft, policy, changed: false };

  const next = clone(draft);
  const removed = (next.required_assets?.required || []).filter((asset) => asset.asset_id === 'founder_portrait');
  next.required_assets = {
    ...(next.required_assets || {}),
    required: (next.required_assets?.required || []).filter((asset) => asset.asset_id !== 'founder_portrait'),
    missing: (next.required_assets?.missing || []).filter((asset) => asset.asset_id !== 'founder_portrait'),
    recommended: [
      ...(next.required_assets?.recommended || []),
      ...removed.map((asset) => ({ ...asset, priority: 'recommended', explanation: { ...asset.explanation, reasoning: policy.reason, fallback_used: 'omit_founder_story' } }))
    ]
  };
  next.homepage_plan = filterDraftPage(next.homepage_plan);
  next.other_pages = (next.other_pages || []).map(filterDraftPage);
  next.merchant_input_requirements = Object.fromEntries(Object.entries(next.merchant_input_requirements || {}).map(([priority, items]) => [
    priority,
    (items || []).filter((item) => !founderRelated(item?.id || item?.field_id || item?.label || item?.reasoning))
  ]));
  next.merchant_review_queue = (next.merchant_review_queue || []).filter((item) => !founderRelated(item?.id || item?.field_id || item?.label || item?.reasoning));
  next.blocked_fields = (next.blocked_fields || []).filter((item) => !founderRelated(item?.id || item?.field_id || item?.label || item?.reasoning));
  if (next.summary) {
    next.summary.missing_asset_count = (next.required_assets.missing || []).length;
    next.summary.unresolved_input_count = Object.values(next.merchant_input_requirements || {}).reduce((total, items) => total + (items || []).length, 0);
    next.summary.review_item_count = next.merchant_review_queue.length;
    next.summary.blocked_field_count = next.blocked_fields.length;
  }
  return { draft: next, policy, changed: true };
}

function rebuildGroups(fields) {
  const groups = new Map();
  for (const field of fields || []) {
    const current = groups.get(field.kind) || { kind: field.kind, field_refs: [], section_ids: [], required: false };
    current.field_refs.push(field.setting_ref);
    current.section_ids.push(field.section_id);
    current.required = current.required || Boolean(field.required);
    groups.set(field.kind, current);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    field_refs: [...new Set(group.field_refs)].sort(),
    section_ids: [...new Set(group.section_ids)].sort()
  })).sort((left, right) => left.kind.localeCompare(right.kind));
}

function homepageSections(storeStrategy) {
  return (storeStrategy?.homepage?.sections || []).map((section) => ({
    section_id: sectionId(section),
    instance_id: section?.instanceId || section?.instance_id || null
  })).filter((section) => section.section_id);
}

function sectionApproval(review, id) {
  return (review?.decisions || []).some((decision) => (
    decision?.status === 'approved'
    && [id, `homepage.${id}`, `homepage.sections.${id}`].includes(decision?.path)
  ));
}

function explicitVideoHero(storeStrategy, review) {
  return /\bvideo\b/i.test(String(storeStrategy?.homepage?.hero?.treatment || ''))
    && sectionApproval(review, 'homepage-hero');
}

function isHomepageField(field, approvedSections) {
  const matchingSections = approvedSections.filter((section) => section.section_id === field?.section_id);
  if (!matchingSections.length) return false;
  if (!field?.instance_id) return true;
  return matchingSections.some((section) => (
    section.instance_id === field.instance_id
    || (!section.instance_id && field.instance_id.startsWith('homepage-'))
  ));
}

function reconciliationChange(field, reason, fallback) {
  return {
    setting_ref: field.setting_ref,
    section_id: field.section_id,
    instance_id: field.instance_id || null,
    reason,
    fallback
  };
}

function legacyFieldPolicy(field, { storeStrategy, review, founderPolicy, approvedSections }) {
  if (field.section_id === FOUNDER_SECTION_ID && !founderPolicy.portrait_required) {
    return { retain: false, reason: 'founder_story_not_explicitly_approved', fallback: 'omit_founder_story' };
  }

  // Full Screen Hero defaults to an image and renders safely without a hosted
  // video. A legacy recipe field must not turn video into a merchant blocker
  // unless the merchant explicitly approved a video-led hero treatment.
  if (field.section_id === 'full-screen-hero' && field.setting_id === 'video' && !explicitVideoHero(storeStrategy, review)) {
    return { retain: false, reason: 'full_screen_hero_video_optional', fallback: 'approved_hero_image_or_text_first_hero' };
  }

  // Both sections render safely without video. Craftsmanship first renders a
  // merchant-approved image; Behind the scenes uses its image branch or omits
  // an empty gallery item. A video is never an implied merchant requirement.
  if (field.section_id === 'craftsmanship' && field.setting_id === 'video') {
    return { retain: false, reason: 'craftsmanship_video_optional', fallback: 'approved_imagery_and_text_or_omit_video_block' };
  }
  if (field.section_id === 'behind-the-scenes' && field.setting_id === 'video') {
    return { retain: false, reason: 'behind_the_scenes_video_optional', fallback: 'approved_still_imagery_or_omit_gallery_item' };
  }

  // A blog has no safe source substitution. Keep it only when it is a
  // specifically approved storytelling choice, rather than a legacy recipe
  // section carried over from an automatically planned article page.
  if (field.section_id === 'featured-blog' && !sectionApproval(review, 'featured-blog')) {
    return { retain: false, reason: 'featured_blog_not_explicitly_approved', fallback: 'omit_featured_blog_section' };
  }

  // Featured Categories resolves a collection before a page in the canonical
  // Liquid section. A page is only needed for an explicit page-led editorial
  // story; ordinary category discovery uses the approved collection path.
  if (field.section_id === 'featured-categories' && field.setting_id === 'page') {
    const pageLedStory = Boolean((storeStrategy?.homepage?.sections || []).find((section) => (
      sectionId(section) === 'featured-categories' && section.requiresEditorialPage === true
    )));
    if (!pageLedStory) {
      return { retain: false, reason: 'featured_categories_page_optional', fallback: 'approved_collection_or_omit_category_block' };
    }
  }

  if (!isHomepageField(field, approvedSections)) {
    return { retain: false, reason: 'section_not_in_approved_homepage_strategy', fallback: 'omit_legacy_section_instance' };
  }

  return { retain: true };
}

function confirmationReferencesChange(confirmation, changes, retainedFields) {
  const value = String(confirmation || '').toLowerCase();
  return changes.some((change) => (
    value.includes(String(change.setting_ref || '').toLowerCase())
    || (!retainedFields.some((field) => field.section_id === change.section_id)
      && value.includes(String(change.section_id || '').toLowerCase()))
    || (change.reason === 'craftsmanship_video_optional' && value.includes('craft_video'))
  ));
}

function reconciliationSignature(changes) {
  return JSON.stringify(changes.map((change) => ({
    setting_ref: change.setting_ref,
    section_id: change.section_id,
    instance_id: change.instance_id,
    reason: change.reason,
    fallback: change.fallback
  })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))));
}

function reconcileResourcePlan({ resourcePlan, storeStrategy, review, recordHistory = false, at = null } = {}) {
  const policy = founderPortraitPolicy({ storeStrategy, review });
  if (!resourcePlan) return { resourcePlan, policy, changed: false, requiresMerchantReview: false, changes: [] };

  const next = clone(resourcePlan);
  const approvedSections = homepageSections(storeStrategy);
  const changes = [];
  next.fields = (next.fields || []).filter((field) => {
    const decision = legacyFieldPolicy(field, { storeStrategy, review, founderPolicy: policy, approvedSections });
    if (decision.retain) return true;
    changes.push(reconciliationChange(field, decision.reason, decision.fallback));
    return false;
  });
  const fieldRefs = new Set(next.fields.map((field) => field.setting_ref));
  next.required_assets = (next.required_assets || []).filter((asset) => {
    if (asset.asset_id === 'founder_portrait' && !policy.portrait_required) return false;
    const linkedFields = asset.field_refs || [];
    return !linkedFields.length || linkedFields.some((fieldRef) => fieldRefs.has(fieldRef));
  });
  next.required_confirmations = (next.required_confirmations || []).filter((item) => !confirmationReferencesChange(item, changes, next.fields));
  next.groups = rebuildGroups(next.fields);
  const changed = changes.length > 0 || JSON.stringify(next.required_assets || []) !== JSON.stringify(resourcePlan.required_assets || []);
  if (!changed) return { resourcePlan, policy, changed: false, requiresMerchantReview: false, changes: [] };

  const signature = reconciliationSignature(changes);
  const existing = resourcePlan.reconciliation || {};
  const alreadyRecorded = existing.policy_version === RESOURCE_PLAN_POLICY_VERSION && existing.change_signature === signature;
  const requiresMerchantReview = Boolean(recordHistory && !alreadyRecorded);
  if (requiresMerchantReview) {
    const event = {
      type: 'strategy_requirement_reconciled',
      policy_version: RESOURCE_PLAN_POLICY_VERSION,
      change_signature: signature,
      changed_at: at || null,
      changes
    };
    next.reconciliation = {
      policy_version: RESOURCE_PLAN_POLICY_VERSION,
      change_signature: signature,
      requires_merchant_review: true,
      status: 'review_required',
      changed_at: at || null,
      changes
    };
    next.reconciliation_history = [...(resourcePlan.reconciliation_history || []), event];
  } else if (existing.requires_merchant_review) {
    next.reconciliation = existing;
    next.reconciliation_history = resourcePlan.reconciliation_history || [];
  }
  return { resourcePlan: next, policy, changed: true, requiresMerchantReview, changes };
}

module.exports = {
  FOUNDER_SECTION_ID,
  RESOURCE_PLAN_POLICY_VERSION,
  founderPortraitPolicy,
  applyStrategySectionPolicy,
  reconcileResourcePlan,
  homepageSections,
  isHomepageField
};
