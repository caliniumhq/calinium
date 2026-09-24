'use strict';

const { loadEvaluationPolicy, resolveArchitectureRuntimeProvenance } = require('./contracts');

function expected(boundary, operator, value, unit = null) { return { boundary, operator, value, unit }; }

function diagnosticText(item) {
  return [item.message, item.location, item.url, item.failure, item.status, item.resource_type]
    .filter((value) => value !== null && value !== undefined).join(' ');
}

function allowlistedDiagnostic(item, policy) {
  const value = diagnosticText(item).toLowerCase();
  return policy.diagnostic_allowlist.find((entry) => entry.contains_any.some((needle) => value.includes(needle.toLowerCase()))) || null;
}

function normalizedFamilies(families, presenterKey) {
  return (families || []).map((family) => ({
    family: family.family,
    family_id: family.family_id,
    family_version: family.family_version,
    presenters: [...(family[presenterKey] || [])].sort()
  })).sort((left, right) => left.family.localeCompare(right.family));
}

/*
 * The deterministic Phase D1 rules are intentionally evaluated here without
 * knowing whether the capture came from the historical Phase B fixture matrix
 * or a paid merchant-flow render. Each caller supplies its own contract and
 * evidence wrapper; the objective thresholds and rule behavior stay shared.
 */
function collectObjectiveFindingInputs({ root, renderRequest, renderResult, architectureRuntime = null }) {
  const policy = loadEvaluationPolicy(root);
  const rule = (id) => policy.ruleById.get(id);
  const findings = [];
  const add = (input) => findings.push(input);
  const observations = renderResult.objective_observations || null;
  const viewportWidth = renderResult.viewport.width;
  const rootWidth = observations?.geometry?.document_scroll_width || renderResult.screenshot?.width || viewportWidth;
  const rootOverflow = Math.max(0, rootWidth - viewportWidth);

  if (rootOverflow > policy.thresholds.root_horizontal_overflow_px) add({
    rule: rule('root_horizontal_overflow'), selector: 'html',
    measured: { viewport_width: viewportWidth, document_scroll_width: rootWidth, horizontal_overflow_px: rootOverflow },
    expectedBoundary: expected('root horizontal containment', 'less_than_or_equal', policy.thresholds.root_horizontal_overflow_px, 'css_px')
  });

  if (!observations) {
    add({
      rule: rule('detailed_observation_unavailable'),
      measured: { objective_observations_present: false, fallback_root_width_source: renderResult.screenshot ? 'screenshot' : 'none' },
      expectedBoundary: expected('versioned objective browser observations', 'present', true, null)
    });
  } else {
    for (const candidate of observations.offscreen_candidates) {
      const overflow = Math.max(candidate.overflow_left, candidate.overflow_right);
      if (candidate.intentional_scroll_context || overflow <= policy.thresholds.element_boundary_tolerance_px) continue;
      add({
        rule: rule('element_outside_viewport'), selector: candidate.selector,
        measured: { rect: candidate.rect, overflow_left: candidate.overflow_left, overflow_right: candidate.overflow_right },
        expectedBoundary: expected('visible element viewport boundary', 'less_than_or_equal', policy.thresholds.element_boundary_tolerance_px, 'css_px')
      });
      if (candidate.rect.width >= viewportWidth * 0.8) add({
        rule: rule('major_structure_exceeds_viewport'), selector: candidate.selector,
        measured: { rect: candidate.rect, viewport_width: viewportWidth, overflow_px: overflow },
        expectedBoundary: expected('major structure viewport containment', 'less_than_or_equal', policy.thresholds.element_boundary_tolerance_px, 'css_px')
      });
    }
    for (const candidate of observations.clipping_candidates) {
      const horizontal = candidate.scroll_width - candidate.client_width;
      const vertical = candidate.scroll_height - candidate.client_height;
      if (candidate.intentional_clip_context || Math.max(horizontal, vertical) <= policy.thresholds.clipping_tolerance_px) continue;
      add({
        rule: rule('important_content_clipped'), selector: candidate.selector,
        measured: { rect: candidate.rect, horizontal_clip_px: horizontal, vertical_clip_px: vertical, overflow_x: candidate.overflow_x, overflow_y: candidate.overflow_y },
        expectedBoundary: expected('important content clipping', 'less_than_or_equal', policy.thresholds.clipping_tolerance_px, 'css_px')
      });
    }
    for (const candidate of observations.collision_candidates) {
      if (candidate.intentional_layer_context || candidate.overlap_ratio < policy.thresholds.collision_overlap_ratio) continue;
      add({
        rule: rule('important_elements_collide'), selector: `${candidate.first_selector} <> ${candidate.second_selector}`,
        measured: { first_rect: candidate.first_rect, second_rect: candidate.second_rect, overlap_ratio: candidate.overlap_ratio },
        expectedBoundary: expected('important element overlap ratio', 'less_than_or_equal', policy.thresholds.collision_overlap_ratio, 'ratio'),
        confidence: 'medium'
      });
    }
    for (const candidate of observations.broken_media) {
      if (!candidate.visible || !candidate.critical) continue;
      add({
        rule: rule('critical_media_broken'), selector: candidate.selector,
        measured: { kind: candidate.kind, complete: candidate.complete, natural_width: candidate.natural_width, natural_height: candidate.natural_height },
        expectedBoundary: expected('visible critical media loaded', 'valid', true, null)
      });
    }
    for (const candidate of observations.touch_target_risks) {
      if (candidate.disabled || candidate.inline_text_exception || candidate.spacing_exception) continue;
      add({
        rule: rule('touch_target_size_risk'), selector: candidate.selector,
        measured: { tag: candidate.tag, role: candidate.role, width: candidate.rect.width, height: candidate.rect.height },
        expectedBoundary: expected('touch target width and height', 'greater_than_or_equal', policy.thresholds.touch_target_minimum_css_px, 'css_px'),
        confidence: 'medium'
      });
    }
    for (const selector of renderResult.route.expected_landmarks) {
      const landmark = observations.landmarks.find((item) => item.selector === selector);
      if (landmark?.visible_count > 0) continue;
      add({
        rule: rule('important_landmark_missing'), landmark: selector,
        measured: { count: landmark?.count || 0, visible_count: landmark?.visible_count || 0 },
        expectedBoundary: expected('required route landmark', 'present', true, null)
      });
    }
    const purchase = observations.purchase_interaction;
    if (purchase.applicable && (purchase.product_form_count < 1 || purchase.cart_add_form_count < 1
      || purchase.primary_control_count < 1 || purchase.visible_primary_control_count < 1 || !purchase.controls_connected)) add({
      rule: rule('product_purchase_interaction_missing'), selector: '[data-main-product] [data-product-form]',
      measured: { ...purchase },
      expectedBoundary: expected('PDP form, cart action, and visible connected purchase control', 'valid', true, null)
    });
    const navigation = observations.navigation_interaction;
    if (navigation.applicable && (!navigation.trigger_present || !navigation.trigger_visible || !navigation.opened
      || !navigation.expanded_state_updated || !navigation.controlled_panel_visible || !navigation.closed || !navigation.focus_remained_reachable)) add({
      rule: rule('navigation_interaction_failed'), selector: '[data-action="mobile-nav-toggle"]',
      measured: { ...navigation },
      expectedBoundary: expected('mobile navigation open, state, visibility, close, and reachable focus', 'valid', true, null)
    });
  }

  let runtime = null;
  try { runtime = resolveArchitectureRuntimeProvenance({ root, renderRequest, architectureRuntime }); }
  catch (error) {
    add({
      rule: rule('architecture_presenter_mismatch'),
      measured: { architecture_runtime_valid: false, reason: error.message },
      expectedBoundary: expected('trusted architecture runtime provenance', 'valid', true, null)
    });
  }
  if (runtime) {
    const evidence = renderResult.architecture_evidence;
    const evidenceFamilies = normalizedFamilies(evidence?.selected_families, 'presenter_ids');
    const runtimeFamilies = normalizedFamilies(runtime.selected_families, 'presenters');
    const consistent = evidence?.valid === true
      && evidence.profile_id === runtime.profile_id
      && evidence.profile_version === runtime.profile_version
      && evidence.selection_revision_id === runtime.selection_revision_id
      && JSON.stringify(evidenceFamilies) === JSON.stringify(runtimeFamilies)
      && evidence.assertions.every((assertion) => assertion.passed && assertion.matched_count > 0);
    if (!consistent) add({
      rule: rule('architecture_presenter_mismatch'),
      measured: {
        evidence_valid: evidence?.valid === true,
        evidence_profile_id: evidence?.profile_id || null,
        runtime_profile_id: runtime.profile_id,
        evidence_families: evidenceFamilies,
        runtime_families: runtimeFamilies
      },
      expectedBoundary: expected('captured presenters match trusted runtime architecture', 'valid', true, null)
    });
  }

  const diagnostics = [
    ...(renderResult.browser_observations?.page_errors || []),
    ...(renderResult.browser_observations?.failed_resources || []).filter((item) => item.critical),
    ...(renderResult.browser_observations?.http_failures || []).filter((item) => item.critical),
    ...(renderResult.browser_observations?.console_errors || [])
  ];
  for (const diagnostic of diagnostics) {
    const allowed = allowlistedDiagnostic(diagnostic, policy);
    if (allowed) continue;
    add({
      rule: rule('fatal_runtime_or_resource_issue'), diagnosticCode: 'unallowlisted_runtime_diagnostic',
      measured: { diagnostic_type: diagnostic.resource_type || (diagnostic.status ? 'http' : 'browser'), message: String(diagnostic.message || diagnostic.failure || 'runtime diagnostic').slice(0, 500), status: diagnostic.status || null },
      expectedBoundary: expected('fatal runtime and resource diagnostics', 'none', 0, 'count')
    });
  }
  return findings;
}

module.exports = { expected, diagnosticText, allowlistedDiagnostic, normalizedFamilies, collectObjectiveFindingInputs };
