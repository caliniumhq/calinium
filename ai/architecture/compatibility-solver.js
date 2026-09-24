'use strict';

const path = require('path');
const { loadArchitectureRegistry } = require('./architecture-registry');

const SOLVER_VERSION = 'architecture-compatibility-v1';
const REQUIRED_FAMILY_TYPES = Object.freeze(['header_navigation', 'product_card', 'collection_merchandising', 'product_detail', 'cart', 'responsive_behavior']);

function solveArchitectureCompatibility({ profileId, profileVersion = null, familySelections = null, registry = null, root = path.resolve(__dirname, '../..') } = {}) {
  const catalog = registry || loadArchitectureRegistry(root);
  const errors = [];
  const profile = catalog.profileById.get(profileId);
  if (!profile) return { valid: false, solver_version: SOLVER_VERSION, checked_capabilities: [], errors: [`Unknown architecture profile ${profileId || '(missing)'}.`] };
  if (profileVersion && profile.version !== profileVersion) errors.push(`Architecture profile ${profile.id} has version ${profile.version}, not ${profileVersion}.`);
  const selections = familySelections || profile.family_selections;
  const selectedIds = new Set(Object.values(selections));
  const checkedCapabilities = new Set(profile.capability_requirements);

  for (const familyType of REQUIRED_FAMILY_TYPES) {
    if (!Object.hasOwn(selections, familyType)) errors.push(`Architecture profile ${profile.id} is missing family type ${familyType}.`);
  }
  for (const familyType of Object.keys(selections)) {
    if (!REQUIRED_FAMILY_TYPES.includes(familyType)) errors.push(`Architecture profile ${profile.id} contains unknown family type ${familyType}.`);
  }

  for (const [familyType, familyId] of Object.entries(selections)) {
    const family = catalog.familyById.get(familyId);
    if (!family) {
      errors.push(`Unknown architecture family ${familyId}.`);
      continue;
    }
    if (family.family !== familyType) errors.push(`Architecture family ${familyId} cannot fill ${familyType}; it belongs to ${family.family}.`);
    for (const requiredType of family.compatibility.requires_family_types) {
      if (!Object.hasOwn(selections, requiredType)) errors.push(`Architecture family ${familyId} requires family type ${requiredType}.`);
    }
    for (const incompatibleId of family.compatibility.incompatible_family_ids) {
      if (selectedIds.has(incompatibleId)) errors.push(`Architecture families ${familyId} and ${incompatibleId} are incompatible.`);
    }
    for (const capability of family.capability_requirements) checkedCapabilities.add(capability);
  }
  for (const capability of checkedCapabilities) {
    if (!catalog.capabilityIds.has(capability)) errors.push(`Architecture profile ${profile.id} requires unavailable capability ${capability}.`);
  }
  return {
    valid: errors.length === 0,
    solver_version: SOLVER_VERSION,
    checked_capabilities: [...checkedCapabilities].sort(),
    errors: [...new Set(errors)].sort()
  };
}

function assertArchitectureCompatibility(options) {
  const validation = solveArchitectureCompatibility(options);
  if (!validation.valid) {
    const error = new Error(`Architecture compatibility validation failed: ${validation.errors.join(' ')}`);
    error.name = 'ArchitectureCompatibilityError';
    error.validation = validation;
    throw error;
  }
  return validation;
}

function assertArchitectureSupportsPreset(selection, presetId, root = path.resolve(__dirname, '../..')) {
  if (!presetId) return selection;
  const registry = loadArchitectureRegistry(root);
  const profile = registry.profileById.get(selection.profile_id);
  if (!profile?.compatibility.preset_ids.includes(presetId)) throw new Error(`Architecture profile ${selection.profile_id} is incompatible with preset ${presetId}.`);
  return selection;
}

function assertArchitectureSupportsDesignDna(selection, engineVersion, root = path.resolve(__dirname, '../..')) {
  if (!engineVersion) return selection;
  const registry = loadArchitectureRegistry(root);
  const profile = registry.profileById.get(selection.profile_id);
  if (!profile?.compatibility.design_dna_engine_versions.includes(engineVersion)) throw new Error(`Architecture profile ${selection.profile_id} is incompatible with Design DNA engine ${engineVersion}.`);
  return selection;
}

module.exports = {
  SOLVER_VERSION,
  REQUIRED_FAMILY_TYPES,
  solveArchitectureCompatibility,
  assertArchitectureCompatibility,
  assertArchitectureSupportsPreset,
  assertArchitectureSupportsDesignDna
};
