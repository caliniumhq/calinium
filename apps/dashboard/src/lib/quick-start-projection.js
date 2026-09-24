const CONTENT_PLAN_KEYS = Object.freeze([
  'lookbook',
  'craftsmanship',
  'manufacturing_process',
  'brand_timeline',
  'sustainability',
  'team',
  'awards_certifications',
  'cross_sell_products',
  'product_bundle_showcase',
  'shop_the_look',
  'complementary_products_fallback'
]);

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function selectedResourceCount(session) {
  const generation = session?.generation_context || {};
  return [
    ...Object.values(generation.merchant_references || {}),
    ...Object.values(generation.shopify_resource_references || {}),
    ...Object.values(generation.asset_references || {})
  ].filter(Boolean).length;
}

function requiredResourceCount(session) {
  const plan = session?.resource_plan || {};
  const omittedSections = new Set(plan.confirmation_eligibility?.summary?.omitted_section_ids || []);
  const omittedFields = new Set(plan.confirmation_eligibility?.summary?.omitted_field_refs || []);
  const fields = (plan.fields || []).filter((field) => !omittedSections.has(field.section_id) && !omittedFields.has(field.setting_ref));
  const retained = new Set(fields.map((field) => field.setting_ref));
  const confirmations = plan.confirmation_eligibility?.items
    ? plan.confirmation_eligibility.items.filter((item) => ['merchant_confirmation_required', 'critical_confirmation_required', 'unresolved_review_required'].includes(item.classification)).length
    : (plan.required_confirmations || []).length;
  return fields.filter((field) => field.required).length
    + (plan.required_assets || []).filter((asset) => !(asset.field_refs || []).length || (asset.field_refs || []).some((fieldRef) => retained.has(fieldRef))).length
    + confirmations;
}

function contentPlansAwaitingReview(session) {
  const canonical = session?.content_plan_projection?.summary;
  if (canonical && Number.isInteger(canonical.actionable_count)) return canonical.actionable_count;
  const plan = session?.content_plan || {};
  const candidates = [];
  if (plan.status && plan.status !== 'not_required') candidates.push(plan);
  for (const key of CONTENT_PLAN_KEYS) {
    if (plan[key]?.status && plan[key].status !== 'not_required') candidates.push(plan[key]);
  }
  return candidates.filter((candidate) => candidate.status !== 'approved').length;
}

function generatedArtifactReady(customTheme, merchantFlow = undefined, merchantFlowBetaEnabled = false) {
  const order = customTheme?.order;
  return Boolean(
    order?.generation_status === 'ready'
    && order?.artifacts?.theme_zip
    && order?.validation_result?.valid === true
    && (!merchantFlowBetaEnabled || merchantFlow?.flow?.preview_ready === true)
  );
}

function previewFor(data) {
  if (data?.live_preview && ['thinking', 'provisional', 'approved', 'generated'].includes(data.live_preview.state)) return data.live_preview;
  const session = data?.session || {};
  if (generatedArtifactReady(data?.custom_theme, data?.merchant_flow, data?.merchant_flow_beta_enabled === true)) {
    return {
      state: 'generated',
      label: 'Generated',
      title: 'Your validated Shopify theme is ready.',
      description: 'The generated package is complete. This host does not simulate a storefront render; open Delivery to download the trusted result.',
      limitation: 'Generated means the validated package exists. Calinium has not installed or published it.'
    };
  }
  if (data?.creative_direction?.preview_readiness === 'approved') {
    return {
      state: 'approved', label: 'Approved', title: 'Your storefront direction is approved.',
      description: 'The approved recommendation and Design DNA are preserved as canonical inputs for generation.',
      limitation: 'This is an approved direction, not a generated Shopify theme.'
    };
  }
  if (data?.creative_direction?.preview_readiness === 'provisional') {
    return {
      state: 'provisional', label: 'Provisional', title: 'Your executable storefront direction is ready for review.',
      description: 'Calinium has a compatible recommendation and bounded Design DNA. The storefront renderer remains a later milestone.',
      limitation: 'Provisional work can change and is not approved or generated.'
    };
  }
  if (session.preset_selection?.status === 'approved' && session.preset_selection?.approved_revision_id) {
    return {
      state: 'approved',
      label: 'Approved',
      title: 'Your storefront direction is approved.',
      description: 'Calinium is preserving the approved design and resources while a truthful live storefront renderer is prepared.',
      limitation: 'This is an approved direction, not a generated Shopify theme.'
    };
  }
  if (session.preset_selection || session.store_strategy || session.creative_brief) {
    return {
      state: 'provisional',
      label: 'Provisional',
      title: 'Your storefront direction is taking shape.',
      description: 'Current recommendations are reflected here as a review state. No storefront content is invented while the live renderer is unavailable.',
      limitation: 'Provisional work can change and is not approved or generated.'
    };
  }
  return {
    state: 'thinking',
    label: 'Thinking',
    title: 'Preparing your first direction.',
    description: 'Calinium needs enough saved business context before it can show a truthful storefront direction.',
    limitation: 'No preview artifact exists yet.'
  };
}

function decision(id, type, title, description, action) {
  return { id, type, title, description, status: 'Needs review', action };
}

function conversationLivenessFor(data) {
  if (data?.conversation_liveness?.status) return data.conversation_liveness;
  const state = data?.session?.conversation_state;
  if (!state) return { status: 'question_required', current_question: null, reason: 'legacy_projection' };
  if (state.currentQuestionId) {
    const lastPrompt = [...(data?.session?.transcript || [])].reverse().find((entry) => entry.role === 'calinium')?.content || null;
    return { status: 'question_required', current_question: { question_id: state.currentQuestionId, prompt: lastPrompt }, reason: 'active_question_bound' };
  }
  if (state.readyForCreativeBrief && !(state.missingCriticalFacts || []).length) return { status: 'ready_to_advance', current_question: null, reason: 'required_facts_resolved' };
  if ((state.missingCriticalFacts || []).length) return { status: 'invalid_actionless_state', current_question: null, reason: 'merchant_answerable_fact_has_no_bound_question' };
  return { status: 'merchant_correction_available', current_question: null, reason: 'conversation_requires_review' };
}

function conversationRecoveryDescription(liveness) {
  if (liveness.status === 'explicitly_blocked') {
    return 'The saved conversation conflicts with its current required details. Open Advanced to review it; Calinium has not overwritten your answers.';
  }
  if (liveness.status === 'merchant_correction_available') {
    return 'The saved details need merchant review before the conversation can continue. Open Advanced to use the supported correction workflow.';
  }
  return 'There is no current question to answer. Open Advanced to review the saved details or retry the conversation safely.';
}

function strategyDecisions(session) {
  const decisions = new Map((session.review?.decisions || []).map((item) => [item.path, item]));
  const required = (session.store_strategy?.recommendations || []).filter((item) => item.requiresMerchantApproval);
  const pending = required.filter((item) => decisions.get(item.id)?.status !== 'approved');
  if (pending.length) {
    return pending.map((item) => decision(
      `strategy-${item.id}`,
      'direction_review',
      item.recommendation,
      item.rationale || 'Review this current Store Strategy recommendation.',
      { kind: 'approve_strategy_recommendation', label: 'Approve recommendation', recommendationId: item.id }
    ));
  }
  if (session.review?.storeStrategyStatus !== 'approved') {
    return [decision(
      'strategy-approval',
      'direction_review',
      'Use this storefront direction',
      'Confirm the current Store Strategy before Calinium prepares a compatible preset recommendation.',
      { kind: 'approve_strategy', label: 'Approve Store Strategy' }
    )];
  }
  return [];
}

function decisionsFor(data) {
  const session = data?.session || {};
  const stage = session.stage || 'conversation';
  const customTheme = data?.custom_theme || {};
  const order = customTheme.order || null;
  const merchantFlow = data?.merchant_flow?.flow || null;
  if (merchantFlow?.state === 'awaiting_material_answer') return [];
  // Paid-order delivery and recovery remain reachable while a merchant
  // revisits an earlier stage to explore a successor version.
  if (generatedArtifactReady(customTheme, data?.merchant_flow, data?.merchant_flow_beta_enabled === true)) {
    return [decision(
      'delivery-ready',
      'delivery',
      'Download your generated theme',
      'Your validated Shopify theme is ready. Calinium will verify the exact file again before downloading it.',
      { kind: 'download_theme', label: 'Download theme', orderId: order.id }
    )];
  }
  if (order?.payment_status === 'pending') {
    const checkoutRequired = Boolean(customTheme.payment?.checkout_required);
    return [decision(
      'generation-commercial-confirmation',
      'generation_consent',
      checkoutRequired ? 'Confirm your Shopify purchase' : customTheme.payment?.staging ? 'Authorize staging generation' : 'Confirm generation',
      checkoutRequired
        ? 'Shopify must confirm the purchase before Calinium can pin and generate this theme.'
        : customTheme.payment?.staging
          ? 'This validates the complete commercial lifecycle without creating a Shopify charge.'
          : 'Confirm the configured commercial step before generation begins.',
      { kind: checkoutRequired ? 'verify_generation_payment' : 'confirm_generation_payment', label: checkoutRequired ? 'Check Shopify approval' : customTheme.payment?.staging ? 'Authorize staging generation — no Shopify charge' : 'Confirm and generate', orderId: order.id }
    )];
  }
  if (order && ['queued', 'specification_building', 'package_generating', 'validating', 'running'].includes(order.generation_status)) return [];
  if (order && ['generation_failed', 'validation_failed', 'blocked'].includes(order.generation_status)) {
    return [decision(
      'generation-recovery',
      'generation_recovery',
      'Generation needs attention',
      order.payment_status === 'paid'
        ? 'Your commercial authorization and exact approved inputs are preserved. Retry will use a new isolated execution attempt.'
        : 'The current order is not authorized for generation. Review the commercial state before continuing.',
      order.payment_status === 'paid'
        ? { kind: 'retry_generation', label: 'Try generation again', orderId: order.id }
        : { kind: 'open_advanced', label: 'Review generation' }
    )];
  }
  if (stage === 'conversation') {
    const liveness = conversationLivenessFor(data);
    if (liveness.status === 'ready_to_advance') {
      return [decision(
        'conversation-ready',
        'direction_review',
        'Review what Calinium understood',
        'The required business context is saved. Prepare it as a reviewable Brand Blueprint.',
        { kind: 'prepare_understanding', label: 'Prepare my Brand Blueprint' }
      )];
    }
    if (liveness.status !== 'question_required') {
      return [decision(
        'conversation-recovery',
        'conversation_recovery',
        'Review the saved conversation',
        conversationRecoveryDescription(liveness),
        { kind: 'open_advanced', label: 'Open Advanced' }
      )];
    }
    const prompt = liveness.current_question?.prompt;
    return [decision(
      'conversation-answer',
      'answer_required',
      'Continue the conversation',
      prompt
        ? `Answer the active question: ${prompt}`
        : 'Answer the active question so Calinium can keep shaping your direction.',
      { kind: 'focus_conversation', label: 'Answer in Chat' }
    )];
  }
  if (stage === 'understanding') {
    return [decision(
      'understanding-review',
      'direction_review',
      'Review what Calinium understood',
      'Prepare the current saved understanding as a reviewable Brand Blueprint.',
      { kind: 'prepare_understanding', label: 'Prepare my Brand Blueprint' }
    )];
  }
  if (stage === 'blueprint') {
    return [decision(
      'blueprint-approval',
      'direction_review',
      'Confirm Calinium’s understanding',
      'Approve the current Brand Blueprint so Calinium can prepare Store Strategy recommendations.',
      { kind: 'approve_brief', label: 'Approve Brand Blueprint' }
    )];
  }
  if (stage === 'strategy') return strategyDecisions(session);
  if (stage === 'preset') {
    const preset = titleCase(session.preset_selection?.selected_preset_id || session.preset_selection?.recommended_preset_id);
    return [decision(
      'preset-approval',
      'direction_review',
      preset ? `Use ${preset} as the storefront direction` : 'Review the storefront direction',
      'This explicit approval preserves the current preset recommendation and its compatible composition.',
      { kind: 'approve_preset', label: preset ? `Approve ${preset}` : 'Review direction', expectedVersion: session.preset_selection?.candidate_version }
    )];
  }
  if (stage === 'resources') {
    const direction = data?.creative_direction;
    const directionDecisions = direction?.approvable ? [decision(
      'creative-direction-approval',
      'direction_review',
      `Use ${direction.primary?.name || 'this'} creative direction`,
      direction.primary?.reasons?.[0] || 'Confirm the current executable recommendation and Design DNA.',
      { kind: 'approve_creative_direction', label: 'Use this direction', recommendationRevisionId: direction.revision_id, designDnaRevisionId: direction.design_dna?.revision_id }
    )] : direction?.status === 'stale' ? [decision(
      'creative-direction-stale',
      'direction_review',
      'Review the updated creative direction',
      'A relevant approved input changed. Historical approvals are preserved until you review the current revision.',
      { kind: 'open_advanced', label: 'Review direction' }
    )] : direction?.approval_note ? [decision(
      'creative-direction-preset-review',
      'direction_review',
      `Review ${direction.primary?.name || 'the alternative direction'}`,
      direction.approval_note,
      { kind: 'open_advanced', label: 'Review preset direction' }
    )] : [];
    const resourceSet = data?.recommended_resource_set;
    if (resourceSet?.revision_id) {
      const recommended = resourceSet.summary?.recommended || 0;
      const exceptions = resourceSet.summary?.needs_individual_review || 0;
      return [...directionDecisions, {
        ...decision(
          'resource-review',
          'resource_review',
          resourceSet.status === 'approved' ? 'Recommended resources approved' : 'Review recommended storefront resources',
          resourceSet.status === 'approved'
            ? `${recommended} ordinary resource choice${recommended === 1 ? '' : 's'} approved.${exceptions ? ` ${exceptions} item${exceptions === 1 ? '' : 's'} still need individual review.` : ''}`
            : `Calinium selected ${recommended} truthful resource${recommended === 1 ? '' : 's'} from your store and project. Review anything you want to change.`,
          resourceSet.approvable
            ? { kind: 'approve_resource_set', label: 'Approve recommendations', revisionId: resourceSet.revision_id }
            : { kind: 'open_advanced', label: exceptions ? 'Review individual items' : 'Review resources' }
        ),
        resourceSet
      }];
    }
    const required = requiredResourceCount(session);
    const selected = selectedResourceCount(session);
    return [...directionDecisions, decision(
      'resource-review',
      'resource_review',
      'Review your storefront resources',
      required
        ? `${selected} resource choice${selected === 1 ? '' : 's'} saved. Review the remaining current requirements without changing existing approvals.`
        : 'Review the real Shopify and project resources Calinium may use.',
      { kind: 'open_advanced', label: 'Review resources' }
    )];
  }
  if (stage === 'content-plan') {
    const count = contentPlansAwaitingReview(session);
    const blocked = session.content_plan_projection?.summary?.blocked_count || 0;
    if (count === 0 && blocked === 0 && session.content_plan_projection?.resolved) return [];
    return [decision(
      'content-review',
      'content_review',
      'Review approved storefront content',
      count
        ? `${count} selected content composition${count === 1 ? '' : 's'} still need review.`
        : 'A required storefront content decision still needs review before continuing.',
      { kind: 'open_advanced', label: 'Review content' }
    )];
  }
  if (stage === 'delivery') {
    return [decision(
      'delivery-review',
      'delivery',
      'Review theme delivery',
      'Open the existing Delivery workflow to review the current trusted artifact status.',
      { kind: 'open_advanced', label: 'Open Delivery' }
    )];
  }
  if (stage === 'offer' || stage === 'generation' || stage === 'preview' || stage === 'finish') {
    const eligible = customTheme.eligibility?.eligible;
    const readinessToken = customTheme.eligibility?.readiness_token;
    const item = decision(
      'generation-review',
      'generation_readiness',
      eligible && readinessToken ? 'Ready to generate' : 'Complete the final generation review',
      eligible
        ? 'Your current approved direction, resources, and generation inputs are ready. Generation starts only when you choose the action below.'
        : 'Review the current server-authoritative blockers before purchase or generation.',
      eligible && readinessToken
        ? { kind: 'start_generation', label: customTheme.payment?.staging ? 'Generate theme in staging — no Shopify charge' : 'Generate my theme', readinessToken }
        : { kind: 'open_advanced', label: 'Review what is needed' }
    );
    item.blockers = (customTheme.eligibility?.blocked || []).map((blocker) => ({ id: blocker.id, reason: blocker.reason || 'This decision needs review.' }));
    return [item];
  }
  return [];
}

function intakeDecision(data) {
  const intake = data?.store_intelligence;
  if (!intake?.retry_available) return null;
  return decision(
    'store-intelligence-refresh',
    'store_learning',
    intake.status === 'stale' ? 'Refresh what Calinium knows about your store' : 'Finish learning from your store',
    intake.status === 'partial'
      ? 'Some optional Shopify information was unavailable. Your saved work remains usable, and you can retry the missing sources.'
      : intake.status === 'refresh_failed'
        ? 'Calinium kept the last trusted store understanding. Retry without losing your conversation or approvals.'
        : 'Your saved store understanding is still usable. Refresh it when you want Calinium to check for catalog changes.',
    { kind: 'refresh_store_intelligence', label: 'Retry store learning' }
  );
}

function statusFor(data, decisions) {
  const session = data?.session || {};
  const order = data?.custom_theme?.order || null;
  const merchantFlow = data?.merchant_flow?.flow || null;
  if (generatedArtifactReady(data?.custom_theme, data?.merchant_flow, data?.merchant_flow_beta_enabled === true)) return { label: 'Theme ready', tone: 'ready' };
  if (merchantFlow?.merchant_status) return { label: merchantFlow.merchant_status.label, tone: ['needs_attention', 'action_needed'].includes(merchantFlow.merchant_status.code) ? 'attention' : merchantFlow.merchant_status.code === 'ready_to_preview' ? 'ready' : 'working' };
  if (order && ['generation_failed', 'validation_failed', 'blocked'].includes(order.generation_status)) return { label: 'Generation needs attention', tone: 'attention' };
  if (order && ['queued', 'specification_building', 'package_generating', 'validating', 'running'].includes(order.generation_status)) return { label: 'Generating your theme', tone: 'working' };
  if (data?.store_intelligence?.status === 'learning') return { label: 'Learning from your Shopify store', tone: 'working' };
  if (['partial', 'refresh_failed'].includes(data?.store_intelligence?.status)) return { label: 'Store learning needs attention', tone: 'attention' };
  if (session.stage === 'conversation') return { label: 'Learning about your business', tone: 'working' };
  if (session.stage === 'offer' && data?.custom_theme?.eligibility?.eligible) return { label: 'Ready for final review', tone: 'ready' };
  if (decisions.length) return { label: 'Waiting for your review', tone: 'attention' };
  return { label: 'Preparing your direction', tone: 'working' };
}

export function buildQuickStartProjection(data) {
  const session = data?.session || {};
  const conversationLiveness = conversationLivenessFor(data);
  const storeDecision = intakeDecision(data);
  const decisions = [...(storeDecision ? [storeDecision] : []), ...decisionsFor(data)];
  const presetId = data?.creative_direction?.primary?.preset_id || session.preset_selection?.selected_preset_id || session.preset_selection?.recommended_preset_id || null;
  return {
    project: {
      name: data?.project?.name || data?.project?.business_name || 'Your storefront',
      savedAt: session.updated_at || null
    },
    lifecycle: {
      internalStage: session.stage || 'conversation',
      status: statusFor(data, decisions)
    },
    conversation: {
      replyAllowed: (session.stage === 'conversation' && conversationLiveness.status === 'question_required') || (['resources', 'offer', 'generation', 'delivery', 'preview', 'finish'].includes(session.stage) && Boolean(data?.recommended_resource_set?.revision_id || data?.creative_direction?.revision_id)),
      liveness: conversationLiveness,
      transcriptCount: (session.transcript || []).length
    },
    preview: previewFor(data),
    decisions,
    summary: {
      preset: presetId ? titleCase(presetId) : null,
      presetApproved: session.preset_selection?.status === 'approved',
      selectedResources: data?.recommended_resource_set?.summary?.recommended ?? selectedResourceCount(session),
      contentPlansAwaitingReview: contentPlansAwaitingReview(session),
      pendingDecisions: decisions.length,
      storeIntelligence: data?.store_intelligence || null
    },
    creativeDirection: data?.creative_direction ? {
      name: data.creative_direction.primary?.name || null,
      reason: data.creative_direction.primary?.reasons?.[0] || null,
      alternatives: (data.creative_direction.alternatives || []).map((item) => item.name),
      status: data.creative_direction.status,
      dna: data.creative_direction.design_dna?.summary || null
    } : null,
    generation: {
      paymentStatus: data?.custom_theme?.order?.payment_status || 'not_started',
      generationStatus: data?.custom_theme?.order?.generation_status || 'not_started',
      staging: Boolean(data?.custom_theme?.payment?.staging),
      stagingLabel: data?.custom_theme?.payment?.label || null,
      validationPassed: data?.custom_theme?.order?.validation_result?.valid === true,
      generatedAt: data?.custom_theme?.order?.generated_at || null,
      failure: data?.custom_theme?.order?.failure_reason || null
    }
  };
}

export { generatedArtifactReady };
