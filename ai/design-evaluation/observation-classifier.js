'use strict';

const { digest } = require('../storefront-render/contracts');
const { withCanonicalId } = require('./contracts');
const {
  CLASSIFICATION_VERSION,
  createVisualObservation,
  assertDesignClassification,
  loadStabilizationPolicy
} = require('./stabilization-contracts');
const { architectureContextForObservation } = require('./architecture-context');

function includesAny(text, expressions) { return expressions.some((expression) => expression.test(text)); }

function detectComponent(text, routeId, region = '') {
  if (/header|wordmark|search (icon|glyph)|utility (control|placement)|masthead/i.test(region)) return 'header';
  if (/footer (left|brand|column|lockup|block)|inside (the )?footer/i.test(region)) return 'footer';
  if (/newsletter|acquisition/i.test(region)) return 'newsletter';
  if (routeId === 'collection' && /collection hero|left panel|large title|split across lines|mid-word|word break/i.test(text)) return 'collection_hero';
  if (routeId === 'collection' && /explore collections|shop collections|featured categories|same three headings|isolated.*heading|headings?.{0,60}(without|no visible)|without (cards|links|images|imagery|media)|empty section|supporting content|blank (area|space)|dead zone/i.test(text)) return 'collection_discovery';
  if (routeId === 'product' && /compare products|questions,? answered|comparison|question-and-answer|faq|supporting content|isolated.*heading|blank interval|no visible (detail|content)/i.test(text)) return 'product_supporting_content';
  if (routeId === 'product' && /product highlights|repeated (image|media|product)|descriptive|product identity/i.test(text)) return 'product_highlights';
  if (/header|wordmark|search (icon|glyph)|utility (control|placement)|masthead/i.test(text)) return 'header';
  if (/newsletter|acquisition/i.test(text)) return 'newsletter';
  if (/footer|brand column|brand lockup/i.test(text)) return 'footer';
  if (/product row|product card|second card|horizontal product|assortment/i.test(text)) return 'product_row';
  if (routeId === 'collection' && /product grid|card scale|assortment|archive grid|compare as a set/i.test(text)) return 'product_grid';
  if (/page|document|viewport|layout containment|full capture/i.test(text)) return 'page';
  return 'other';
}

function detectPhenomenon(text, component) {
  const rootOverflow = /(page|document|layout|container).{0,80}(overflow|exceed|beyond|wider|viewport)|horizontal overflow|document width/i;
  const clippedChild = /(truncat|cut off|clipp|incomplete).{0,100}(card|row|title|identity|content)|(card|row|title|identity|content).{0,100}(truncat|cut off|clipp|incomplete)/i;
  if (rootOverflow.test(text) && (component === 'page' || /page-level|full document|layout within|document (extends|width)|exceeds the viewport/i.test(text))) return 'page_overflow';
  if (clippedChild.test(text)) return 'content_truncation';
  const repeated = includesAny(text, [/repeats? (the )?(same|primary|product)/i, /repeated (image|media|information|identity)/i, /without adding/i, /adds almost no/i]);
  const empty = includesAny(text, [/without (any )?visible/i, /no visible/i, /empty section/i, /isolated.{0,40}heading/i, /heading.{0,80}blank space/i, /supporting content.{0,40}(absent|missing|unavailable)/i]);
  if (repeated && !['collection_discovery', 'product_supporting_content'].includes(component)) return 'repeated_information';
  if (includesAny(text, [/crowd/i, /collid/i, /touches? the end/i, /immediately against/i, /insufficient separation/i, /overlap.{0,40}(brand|wordmark|control)/i])) return 'control_crowding';
  if (includesAny(text, [/word break/i, /mid-word/i, /split across lines/i, /broken into/i, /isolat.{0,30}(letter|character|final)/i, /final.{0,40}isolat/i, /\blone [“\"']?[a-z][”\"']?/i])) return 'typographic_word_break';
  if (includesAny(text, [/presented twice/i, /duplicates? prior/i, /same role in (close|immediate) succession/i, /again in the footer/i])) return 'duplicate_surface';
  if (empty) return 'empty_module_visible';
  if (repeated) return 'repeated_information';
  if (includesAny(text, [/slower to compare/i, /harder to compare/i, /comparison friction/i, /varied.{0,30}scale.{0,60}compare/i])) return 'comparison_friction';
  if (includesAny(text, [/successfully changes/i, /visibly (different|distinct)/i, /distinguish(es|ed)? the (collection|profile|presenter)/i, /replace(s|d)? the current.{0,80}(row|grid|composition)/i])) return 'architecture_difference';
  return 'other_visible_condition';
}

function valenceFor(text, phenomenon) {
  if (phenomenon === 'architecture_difference' && /success|strong|distinct|different/i.test(text)) return 'positive';
  if (phenomenon === 'other_visible_condition') return 'neutral';
  return 'issue';
}

function objectiveFactsFor(finding, request) {
  const ids = new Set(finding.objective_relation?.objective_finding_ids || []);
  const byId = new Map(request.objective_facts.map((fact) => [fact.finding_id, fact]));
  return [...ids].filter((id) => byId.has(id)).map((id) => {
    const fact = byId.get(id);
    return { finding_id: fact.finding_id, rule_id: fact.rule_id, severity: fact.severity, authority: 'phase_d1_authoritative' };
  });
}

function extractFrozenObservations({ run, request, root }) {
  const cellById = new Map(request.cells.map((cell) => [cell.cell_id, cell]));
  const supportByFinding = new Map((run.diagnostics?.evidence_support || []).map((item) => [item.finding_id, item.claims || []]));
  const groups = new Map();
  for (const finding of run.findings) {
    const support = supportByFinding.get(finding.finding_id) || finding.evidence.map((item) => ({ cell_id: item.cell_id, region: item.region || 'Visible region', visible_evidence: finding.diagnosis }));
    for (const claim of support) {
      const cell = cellById.get(claim.cell_id);
      if (!cell) continue;
      const claimText = `${claim.region || ''} ${claim.visible_evidence || ''}`;
      const text = `${claimText} ${finding.diagnosis}`;
      let component = detectComponent(claimText, cell.route_id, claim.region || '');
      let phenomenon = detectPhenomenon(claimText, component);
      if (phenomenon === 'other_visible_condition') phenomenon = detectPhenomenon(text, component);
      const objectiveRoot = finding.objective_relation?.objective_finding_ids?.some((id) => request.objective_facts.some((fact) => fact.finding_id === id && fact.rule_id === 'root_horizontal_overflow'));
      if (objectiveRoot && /(page|homepage|layout).{0,30}(exceeds|does not contain|does not fit)|exceeds the viewport|page-level horizontal overflow/i.test(finding.diagnosis)) phenomenon = 'page_overflow';
      if (component === 'product_highlights' && /repeat|same (image|product)|product identity|repeated product/i.test(text)) phenomenon = 'repeated_information';
      if (phenomenon === 'empty_module_visible' && component === 'other') component = cell.route_id === 'collection' ? 'collection_discovery' : cell.route_id === 'product' ? 'product_supporting_content' : component;
      if (phenomenon === 'page_overflow') component = 'page';
      const key = `${phenomenon}|${component}|${cell.route_id}`;
      if (!groups.has(key)) groups.set(key, { phenomenon, component, route_id: cell.route_id, findings: [], claims: [] });
      const group = groups.get(key);
      group.findings.push(finding);
      group.claims.push({ claim, cell });
    }
  }
  return [...groups.values()].map((group) => {
    const uniqueFindings = [...new Map(group.findings.map((finding) => [finding.finding_id, finding])).values()];
    const uniqueClaims = [...new Map(group.claims.map((item) => [item.claim.cell_id, item])).values()];
    const profiles = [...new Set(uniqueClaims.map((item) => item.cell.profile_id))].sort();
    const viewports = [...new Set(uniqueClaims.map((item) => item.cell.viewport_id))].sort();
    const evidence = uniqueClaims.map(({ claim, cell }) => ({
      cell_id: cell.cell_id,
      screenshot_sha256: cell.screenshot.sha256,
      region: claim.region || 'Visible region',
      visible_evidence: claim.visible_evidence || 'The cited visible region supports this observation.'
    }));
    const summary = [...new Set(evidence.map((item) => item.visible_evidence))].join(' ');
    const objectiveFacts = uniqueFindings.flatMap((finding) => objectiveFactsFor(finding, request));
    const deduplicatedFacts = [...new Map(objectiveFacts.map((fact) => [fact.finding_id, fact])).values()];
    return createVisualObservation({
      run_sequence: run.run_sequence,
      phenomenon: group.phenomenon,
      valence: valenceFor(summary, group.phenomenon),
      profile_ids: profiles,
      route_id: group.route_id,
      viewport_ids: viewports,
      component: group.component,
      visible_region: [...new Set(evidence.map((item) => item.region))].join('; '),
      evidence_summary: summary,
      confidence: uniqueFindings.some((finding) => finding.confidence === 'low') ? 'low' : uniqueFindings.some((finding) => finding.confidence === 'medium') ? 'medium' : 'high',
      evidence,
      objective_facts: deduplicatedFacts,
      source_finding_ids: uniqueFindings.map((finding) => finding.finding_id).sort()
    }, request, root);
  }).sort((left, right) => observationKey(left).localeCompare(observationKey(right)));
}

function observationKey(observation) {
  const persistent = ['header', 'footer'].includes(observation.component) ? 'persistent'
    : observation.phenomenon === 'architecture_difference' ? 'controlled_comparison'
      : observation.route_id;
  return `${observation.phenomenon}|${observation.component}|${persistent}`;
}

function observationScopedKey(observation) {
  return [
    observation.phenomenon,
    observation.component,
    observation.route_id,
    [...observation.profile_ids].sort().join(','),
    [...observation.viewport_ids].sort().join(',')
  ].join('|');
}

function classificationValues(observation, architectureContext) {
  switch (observation.phenomenon) {
    case 'page_overflow':
      return { primary: 'mobile_adaptation_quality', secondary: ['product_discovery'], importance: 'high', responsibility: architectureContext.family_ids.length ? 'architecture_level' : 'uncertain', recommendation: 'responsive_adaptation' };
    case 'content_truncation':
      return { primary: 'mobile_adaptation_quality', secondary: ['product_discovery', 'composition'], importance: 'high', responsibility: architectureContext.family_ids.length ? 'architecture_level' : 'uncertain', recommendation: 'responsive_adaptation' };
    case 'empty_module_visible':
      return { primary: observation.route_id === 'product' ? 'pdp_communication' : observation.route_id === 'collection' ? 'product_discovery' : 'composition', secondary: ['spacing_and_rhythm', 'composition'], importance: 'high', responsibility: 'composition_level', recommendation: 'suppress_empty_module' };
    case 'repeated_information':
      return { primary: observation.route_id === 'product' ? 'pdp_communication' : 'composition', secondary: ['composition'], importance: 'medium', responsibility: 'composition_level', recommendation: 'composition_simplification' };
    case 'control_crowding':
      return { primary: 'navigation_header_clarity', secondary: ['mobile_adaptation_quality'], importance: 'medium', responsibility: architectureContext.system_scope === 'architecture_family' ? 'architecture_level' : 'uncertain', recommendation: 'navigation_clarity' };
    case 'typographic_word_break':
      return { primary: 'typographic_hierarchy', secondary: ['perceived_polish'], importance: 'medium', responsibility: 'design_token_level', recommendation: 'typographic_containment' };
    case 'duplicate_surface':
      return { primary: 'composition', secondary: ['visual_hierarchy'], importance: 'medium', responsibility: 'composition_level', recommendation: 'composition_simplification' };
    case 'comparison_friction':
      return { primary: 'product_discovery', secondary: ['composition'], importance: 'low', responsibility: architectureContext.system_scope === 'architecture_family' ? 'architecture_level' : 'uncertain', recommendation: 'no_action_preference_only' };
    case 'architecture_difference':
      return { primary: 'architecture_differentiation', secondary: [], importance: 'note', responsibility: 'architecture_level', recommendation: 'no_action_preference_only' };
    default:
      return { primary: 'perceived_polish', secondary: [], importance: 'note', responsibility: 'uncertain', recommendation: 'uncertain_requires_review' };
  }
}

function intersects(left, right) { const set = new Set(left); return right.some((item) => set.has(item)); }

function rootForObservation(observation, observations) {
  if (observation.phenomenon !== 'content_truncation') return null;
  const objectiveIds = observation.objective_facts.map((fact) => fact.finding_id);
  return observations.find((candidate) => candidate.phenomenon === 'page_overflow'
    && candidate.route_id === observation.route_id
    && intersects(candidate.profile_ids, observation.profile_ids)
    && (objectiveIds.length === 0 || intersects(candidate.objective_facts.map((fact) => fact.finding_id), objectiveIds))) || null;
}

function rationaleFor(observation, values, context, relationship) {
  const ownership = values.responsibility === 'composition_level' && observation.phenomenon === 'empty_module_visible'
    ? 'Merchant-content absence may contribute, but visibly rendering the dependent empty module is Calinium fallback/composition behavior.'
    : `The strict ${values.responsibility} boundary is supported by ${context.system_scope} provenance.`;
  const relation = relationship.mode === 'symptom_of' ? 'It is downstream evidence of a page-level root and cannot create a separate repair action.' : 'It remains an independently reviewable classification.';
  return `${ownership} ${relation}`;
}

function classifyFrozenObservations({ observations, request, root }) {
  const policy = loadStabilizationPolicy(root);
  return observations.map((observation) => {
    const architectureContext = architectureContextForObservation({ observation, request, root });
    const values = classificationValues(observation, architectureContext);
    const rootObservation = rootForObservation(observation, observations);
    const relationship = observation.phenomenon === 'page_overflow' && observation.objective_facts.length
      ? { mode: 'root_finding', target_observation_id: null, objective_finding_ids: observation.objective_facts.map((fact) => fact.finding_id) }
      : rootObservation
        ? { mode: 'symptom_of', target_observation_id: rootObservation.observation_id, objective_finding_ids: observation.objective_facts.map((fact) => fact.finding_id) }
        : { mode: 'independent', target_observation_id: null, objective_finding_ids: observation.objective_facts.map((fact) => fact.finding_id) };
    const recommendation = policy.recommendationById.get(values.recommendation);
    const uncertaintyReasons = values.responsibility === 'uncertain' ? ['trusted_context_does_not_establish_ownership'] : [];
    const base = {
      schema_version: '1.0',
      contract_version: CLASSIFICATION_VERSION,
      observation_id: observation.observation_id,
      observation_checksum: digest(observation),
      primary_dimension: values.primary,
      secondary_dimensions: [...new Set(values.secondary.filter((dimension) => dimension !== values.primary))],
      importance: values.importance,
      responsibility: values.responsibility,
      recommendation_category: values.recommendation,
      legacy_recommendation_category: recommendation.legacy_category,
      relationship,
      architecture_context: architectureContext,
      classification_rationale: rationaleFor(observation, values, architectureContext, relationship),
      uncertainty_reasons: uncertaintyReasons,
      independent_repair_candidate: relationship.mode !== 'symptom_of' && observation.valence === 'issue' && values.recommendation !== 'no_action_preference_only',
      human_review_required: true,
      automatic_repair_allowed: false
    };
    return assertDesignClassification(withCanonicalId('design-classification', base, 'classification_id'), observation, root);
  });
}

function independentClassifications(classifications) {
  const seen = new Set();
  return classifications.filter((classification) => {
    if (!classification.independent_repair_candidate || classification.relationship.mode === 'symptom_of') return false;
    const key = `${classification.primary_dimension}|${classification.observation_checksum}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = {
  detectComponent,
  detectPhenomenon,
  valenceFor,
  observationKey,
  observationScopedKey,
  extractFrozenObservations,
  classificationValues,
  rootForObservation,
  classifyFrozenObservations,
  independentClassifications
};
