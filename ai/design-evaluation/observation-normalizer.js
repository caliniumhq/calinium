'use strict';

const { architectureContextForObservation } = require('./architecture-context');
const { createVisualObservation } = require('./stabilization-contracts');
const { createConcreteObservation, loadObservationStabilizationPolicy } = require('./observation-stabilization-contracts');

const LEGACY_COMPONENTS = Object.freeze({
  page_root: 'page',
  header_identity_controls: 'header',
  navigation: 'header',
  hero: 'other',
  collection_hero: 'collection_hero',
  collection_discovery: 'collection_discovery',
  product_grid: 'product_grid',
  product_row: 'product_row',
  product_card: 'product_row',
  pdp_primary: 'other',
  product_highlights: 'product_highlights',
  comparison_module: 'product_supporting_content',
  faq_module: 'product_supporting_content',
  newsletter_module: 'newsletter',
  footer_newsletter: 'newsletter',
  footer_identity: 'footer',
  other_named_region: 'other'
});

function normalizedComponent(component, region = '', evidence = '', routeId = '') {
  const text = `${region} ${evidence}`;
  if (component === 'page' || /full (mobile )?(page|homepage)|page width|page-level/i.test(text)) return 'page_root';
  if (component === 'header' || /header|masthead|wordmark|identity.{0,40}(search|control)|search.{0,40}identity/i.test(text)) return 'header_identity_controls';
  if (component === 'footer' || /footer identity|footer brand|left footer/i.test(text)) return 'footer_identity';
  if (component === 'newsletter' || /newsletter|email.{0,30}subscribe/i.test(text)) return /footer/i.test(text) && !/followed by|another/i.test(text) ? 'footer_newsletter' : 'newsletter_module';
  if (component === 'collection_hero' || (routeId === 'collection' && /hero|collection (name|title)/i.test(text))) return 'collection_hero';
  if (component === 'collection_discovery' || /explore collections|shop collections|featured categories|discovery/i.test(text)) return 'collection_discovery';
  if (component === 'product_supporting_content') return 'comparison_module';
  if (component === 'product_highlights' || /product highlights/i.test(text)) return 'product_highlights';
  if (component === 'product_grid' || /product grid|archive grid/i.test(text)) return 'product_grid';
  if (component === 'product_row' || /product row|product presentation|product card/i.test(text)) return 'product_row';
  return 'other_named_region';
}

function normalizedPhenomenon(observation, component) {
  const text = `${observation.visible_region || ''} ${observation.evidence_summary || ''}`;
  switch (observation.phenomenon) {
    case 'page_overflow': return { phenomenon: 'horizontal_overflow', action: 'normalized' };
    case 'content_truncation': return { phenomenon: /container|boundary|image surface/i.test(text) ? 'visible_clipping' : 'truncated_visible_content', action: 'normalized' };
    case 'empty_module_visible': return { phenomenon: /heading|supporting|content beneath|without visible/i.test(text) ? 'missing_visible_supporting_content' : 'empty_visible_module', action: 'normalized' };
    case 'repeated_information': return { phenomenon: /media|image|product title|product identity/i.test(text) ? 'repeated_media_content' : 'repeated_visible_module', action: 'normalized' };
    case 'control_crowding': return { phenomenon: 'element_crowding', action: 'normalized' };
    case 'typographic_word_break': return { phenomenon: /isolat|final [“"']?[a-z]|third line/i.test(text) ? 'isolated_line_wrap' : 'word_break', action: 'normalized' };
    case 'duplicate_surface': return { phenomenon: 'repeated_visible_module', action: 'normalized' };
    case 'comparison_friction':
      if (/unequal|staggered|different image scales|widely separated|not aligned|single aligned/i.test(text)) return { phenomenon: 'asymmetrical_grid_structure', action: 'interpretation_reclassified' };
      return { phenomenon: null, action: 'interpretation_rejected', reason: 'comparison_judgment_without_concrete_structure' };
    case 'architecture_difference': return { phenomenon: null, action: 'comparison_reclassified', reason: 'cross_scope_architecture_judgment' };
    default: return { phenomenon: null, action: 'unsupported', reason: 'unbounded_or_nonconcrete_legacy_condition' };
  }
}

function matchingPhenomenon(phenomenon, component) {
  if (['visible_clipping', 'truncated_visible_content'].includes(phenomenon)) return 'visible_content_loss';
  if (['word_break', 'isolated_line_wrap'].includes(phenomenon)) return 'visible_word_wrap_break';
  if (['empty_visible_module', 'missing_visible_supporting_content', 'excessive_local_whitespace'].includes(phenomenon)) return `empty_support:${component}`;
  if (['element_crowding', 'dense_local_grouping', 'weak_visual_separation'].includes(phenomenon)) return `crowding:${component}`;
  if (['repeated_visible_module', 'repeated_media_content'].includes(phenomenon)) return `visible_repetition:${component}`;
  return phenomenon;
}

function observationMatchingPhenomenon(observation) {
  const evidence = observation.evidence_summary || '';
  if (observation.component === 'product_grid'
    && ['stacked_grouping', 'uniform_grid_structure', 'multi_row_grid_structure'].includes(observation.phenomenon)
    && /(second|next|two|multiple|additional) (?:aligned )?rows?|two rows|next row/i.test(evidence)) return 'multi_row_grid_structure';
  return matchingPhenomenon(observation.phenomenon, observation.component);
}

function strictObservationKey(observation) {
  const root = observation.relationship?.root_evidence_key || observation.objective_facts?.map((fact) => fact.rule_id).sort().join(',') || 'none';
  return [observationMatchingPhenomenon(observation), observation.component, observation.profile_id, observation.route_id, observation.viewport_id, root].join('|');
}

function presenterContext({ component, cell, request, root }) {
  const legacyComponent = LEGACY_COMPONENTS[component] || 'other';
  const context = architectureContextForObservation({
    observation: { component: legacyComponent, profile_ids: [cell.profile_id], viewport_ids: [cell.viewport_id], route_id: cell.route_id },
    request,
    root
  });
  return {
    system_scope: context.system_scope,
    family_ids: context.family_ids,
    presenter_ids: context.presenter_ids,
    provenance_revision: context.provenance_revision
  };
}

function objectiveFactsForCell(observation, cell, request) {
  const cited = new Set((observation.objective_facts || []).map((fact) => fact.finding_id));
  return request.objective_facts.filter((fact) => fact.cell_id === cell.cell_id && cited.has(fact.finding_id)).map((fact) => ({
    finding_id: fact.finding_id,
    rule_id: fact.rule_id,
    severity: fact.severity,
    authority: 'phase_d1_authoritative'
  }));
}

function confidenceRank(value) { return value === 'high' ? 3 : value === 'medium' ? 2 : 1; }

function normalizeDrafts(drafts) {
  const groups = new Map();
  for (const draft of drafts) {
    const key = [observationMatchingPhenomenon({ phenomenon: draft.phenomenon, component: draft.component, evidence_summary: draft.evidenceSummary }), draft.component, draft.cell.cell_id].join('|');
    if (!groups.has(key)) groups.set(key, draft);
    else {
      const existing = groups.get(key);
      existing.sourceObservationIds = [...new Set([...existing.sourceObservationIds, ...draft.sourceObservationIds])].sort();
      if (confidenceRank(draft.confidence) < confidenceRank(existing.confidence)) existing.confidence = draft.confidence;
      if (draft.objectiveFacts.length) existing.objectiveFacts = [...new Map([...existing.objectiveFacts, ...draft.objectiveFacts].map((fact) => [fact.finding_id, fact])).values()];
    }
  }
  return { drafts: [...groups.values()], duplicateRecordsSuppressed: drafts.length - groups.size };
}

function relationshipFor(draft, rootsByCell) {
  if (draft.phenomenon === 'horizontal_overflow' && draft.objectiveFacts.length) return { mode: 'root_finding', root_evidence_key: null };
  if (['visible_clipping', 'truncated_visible_content'].includes(draft.phenomenon) && rootsByCell.has(draft.cell.cell_id)) return { mode: 'symptom_of', root_evidence_key: rootsByCell.get(draft.cell.cell_id) };
  return { mode: 'independent', root_evidence_key: null };
}

function normalizeLegacyObservationRun({ run, request, root }) {
  const cellById = new Map(request.cells.map((cell) => [cell.cell_id, cell]));
  const policy = loadObservationStabilizationPolicy(root);
  const drafts = [];
  const rejected = [];
  for (const observation of run.observations) {
    const mapped = normalizedPhenomenon(observation);
    if (!mapped.phenomenon) {
      rejected.push({ source_observation_id: observation.observation_id, phenomenon: observation.phenomenon, disposition: mapped.action, reason: mapped.reason, run_sequence: run.run_sequence });
      continue;
    }
    for (const evidence of observation.evidence) {
      const cell = cellById.get(evidence.cell_id);
      if (!cell || cell.route_id === 'cart') continue;
      let component = normalizedComponent(observation.component, evidence.region, evidence.visible_evidence, cell.route_id);
      if (mapped.phenomenon === 'asymmetrical_grid_structure') component = 'product_grid';
      if (!policy.componentSet.has(component)) continue;
      drafts.push({
        phenomenon: mapped.phenomenon,
        component,
        cell,
        visibleRegion: evidence.region,
        evidenceSummary: evidence.visible_evidence,
        confidence: observation.confidence,
        objectiveFacts: objectiveFactsForCell(observation, cell, request),
        sourceObservationIds: [observation.observation_id],
        disposition: mapped.action
      });
    }
  }
  const normalized = normalizeDrafts(drafts);
  const rootsByCell = new Map(normalized.drafts.filter((draft) => draft.phenomenon === 'horizontal_overflow').map((draft) => [draft.cell.cell_id, `${draft.cell.cell_id}|horizontal_overflow|page_root`]));
  const observations = normalized.drafts.map((draft) => createConcreteObservation({
    run_sequence: run.run_sequence,
    profile_id: draft.cell.profile_id,
    route_id: draft.cell.route_id,
    viewport_id: draft.cell.viewport_id,
    cell_id: draft.cell.cell_id,
    screenshot_sha256: draft.cell.screenshot.sha256,
    phenomenon: draft.phenomenon,
    phenomenon_kind: policy.phenomenonById.get(draft.phenomenon).kind,
    component: draft.component,
    visible_region: draft.visibleRegion,
    region_reference: { kind: draft.component === 'other_named_region' ? 'described_region' : 'presenter_landmark', landmark_id: draft.component, bounds: null },
    evidence_summary: draft.evidenceSummary,
    confidence: draft.confidence,
    objective_facts: draft.objectiveFacts,
    source_observation_ids: draft.sourceObservationIds,
    relationship: relationshipFor(draft, rootsByCell),
    architecture_presenter: presenterContext({ component: draft.component, cell: draft.cell, request, root })
  }, request, root)).sort((left, right) => strictObservationKey(left).localeCompare(strictObservationKey(right)));
  return {
    run_sequence: run.run_sequence,
    observations,
    rejected_interpretations: rejected,
    diagnostics: {
      input_observations: run.observations.length,
      concrete_candidates: drafts.length,
      concrete_observations: observations.length,
      duplicate_records_suppressed: normalized.duplicateRecordsSuppressed,
      interpretive_records_removed_or_reclassified: rejected.length + drafts.filter((item) => item.disposition === 'interpretation_reclassified').length,
      root_symptom_observations: observations.filter((item) => item.relationship.mode === 'symptom_of').length
    }
  };
}

function projectConcreteObservation({ observation, request, root }) {
  const policy = loadObservationStabilizationPolicy(root);
  const phenomenon = policy.phenomenonById.get(observation.phenomenon);
  if (!phenomenon || (phenomenon.kind === 'structure' && phenomenon.legacy_phenomenon === 'architecture_difference')) return null;
  const legacyComponent = LEGACY_COMPONENTS[observation.component] || 'other';
  return createVisualObservation({
    run_sequence: observation.run_sequence,
    phenomenon: phenomenon.legacy_phenomenon,
    valence: phenomenon.kind === 'issue' ? 'issue' : 'neutral',
    profile_ids: [observation.profile_id],
    route_id: observation.route_id,
    viewport_ids: [observation.viewport_id],
    component: legacyComponent,
    visible_region: observation.visible_region,
    evidence_summary: observation.evidence_summary,
    confidence: observation.confidence,
    evidence: [{ cell_id: observation.cell_id, screenshot_sha256: observation.screenshot_sha256, region: observation.visible_region, visible_evidence: observation.evidence_summary }],
    objective_facts: observation.objective_facts,
    source_finding_ids: observation.source_observation_ids
  }, request, root);
}

module.exports = {
  LEGACY_COMPONENTS,
  normalizedComponent,
  normalizedPhenomenon,
  matchingPhenomenon,
  observationMatchingPhenomenon,
  strictObservationKey,
  presenterContext,
  normalizeDrafts,
  normalizeLegacyObservationRun,
  projectConcreteObservation
};
