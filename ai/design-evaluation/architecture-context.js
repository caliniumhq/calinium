'use strict';

const path = require('path');
const { digest } = require('../storefront-render/contracts');
const { readJson } = require('./contracts');

const FAMILY_REGISTRY = 'config/calinium-architecture-families.json';

const COMPONENT_FAMILIES = Object.freeze({
  page: ['responsive_behavior'],
  header: ['header_navigation', 'responsive_behavior'],
  product_row: ['product_card', 'responsive_behavior'],
  collection_discovery: ['collection_merchandising'],
  collection_hero: ['collection_merchandising'],
  product_supporting_content: ['product_detail'],
  product_highlights: ['product_detail', 'product_card'],
  product_grid: ['collection_merchandising', 'product_card'],
  footer: [],
  newsletter: [],
  other: []
});

function architectureContextForObservation({ observation, request, root }) {
  const registry = readJson(path.join(root, FAMILY_REGISTRY));
  const familyById = new Map(registry.families.map((family) => [family.id, family]));
  const profiles = new Map(request.architecture_profiles.map((profile) => [profile.profile_id, profile]));
  const familyTypes = COMPONENT_FAMILIES[observation.component] || [];
  const selectedIds = [];
  for (const profileId of observation.profile_ids) {
    const profile = profiles.get(profileId);
    for (const type of familyTypes) {
      const id = profile?.family_selections?.[type];
      if (id) selectedIds.push(id);
    }
  }
  const familyIds = [...new Set(selectedIds)].sort();
  const presenterIds = [...new Set(familyIds.flatMap((id) => familyById.get(id)?.presenters || []))].sort();
  const allSelections = familyTypes.flatMap((type) => request.architecture_profiles.map((profile) => profile.family_selections?.[type]).filter(Boolean));
  const sharedBetweenProfiles = familyTypes.length > 0 && familyTypes.every((type) => new Set(request.architecture_profiles.map((profile) => profile.family_selections?.[type])).size === 1);
  const systemScope = familyTypes.length ? 'architecture_family' : ['footer', 'newsletter'].includes(observation.component) ? 'shared_core' : 'unknown';
  const provenance = {
    registry: FAMILY_REGISTRY,
    family_types: familyTypes,
    selected_family_ids: familyIds,
    all_profile_family_ids: [...new Set(allSelections)].sort(),
    presenter_ids: presenterIds
  };
  return {
    system_scope: systemScope,
    family_types: familyTypes,
    family_ids: familyIds,
    presenter_ids: presenterIds,
    shared_between_profiles: systemScope === 'shared_core' || sharedBetweenProfiles,
    profile_specific: observation.profile_ids.length === 1,
    provenance_revision: `architecture-classification-context-${digest(provenance).slice(0, 20)}`
  };
}

module.exports = { FAMILY_REGISTRY, COMPONENT_FAMILIES, architectureContextForObservation };
