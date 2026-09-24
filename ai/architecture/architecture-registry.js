'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');

const FAMILY_REGISTRY_PATH = 'config/calinium-architecture-families.json';
const PROFILE_REGISTRY_PATH = 'config/calinium-architecture-profiles.json';
const CAPABILITY_REGISTRY_PATH = 'config/theme-capabilities.json';

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(root, relativePath), 'utf8'));
}

function uniqueDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) seen.has(value) ? duplicates.add(value) : seen.add(value);
  return [...duplicates].sort();
}

function catalogValidationErrors({ root, families, profiles, capabilities }) {
  const errors = [];
  const familyById = new Map(families.families.map((family) => [family.id, family]));
  const capabilityIds = new Set(capabilities.capabilities.map((capability) => capability.id));
  const profileById = new Map(profiles.profiles.map((profile) => [profile.id, profile]));

  for (const duplicate of uniqueDuplicates(families.families.map((family) => family.id))) errors.push(`Duplicate architecture family ID ${duplicate}.`);
  for (const duplicate of uniqueDuplicates(profiles.profiles.map((profile) => profile.id))) errors.push(`Duplicate architecture profile ID ${duplicate}.`);
  if (!profileById.has(profiles.default_profile_id)) errors.push(`Default architecture profile ${profiles.default_profile_id} is not registered.`);
  else if (profileById.get(profiles.default_profile_id).eligibility.default_eligible !== true) errors.push(`Default architecture profile ${profiles.default_profile_id} must remain default-eligible.`);

  for (const family of families.families) {
    for (const relativePath of family.runtime_files) {
      if (!fs.existsSync(path.resolve(root, relativePath))) errors.push(`Architecture family ${family.id} references unavailable runtime file ${relativePath}.`);
    }
    for (const capability of family.capability_requirements) {
      if (!capabilityIds.has(capability)) errors.push(`Architecture family ${family.id} requires unknown capability ${capability}.`);
    }
    for (const incompatibleId of family.compatibility.incompatible_family_ids) {
      if (!familyById.has(incompatibleId)) errors.push(`Architecture family ${family.id} declares unknown incompatible family ${incompatibleId}.`);
    }
    const runtimeFiles = new Set(family.runtime_files);
    const overlayTargets = new Set();
    for (const overlay of family.runtime_overlays || []) {
      if (!runtimeFiles.has(overlay.source)) errors.push(`Architecture family ${family.id} overlay source ${overlay.source} is not registered as a runtime file.`);
      if (overlayTargets.has(overlay.target)) errors.push(`Architecture family ${family.id} declares duplicate runtime overlay target ${overlay.target}.`);
      overlayTargets.add(overlay.target);
    }
  }

  for (const profile of profiles.profiles) {
    if (profile.id !== profiles.default_profile_id && profile.eligibility.default_eligible) errors.push(`Non-default architecture profile ${profile.id} cannot be selected as an implicit fallback.`);
    const selected = new Map(Object.entries(profile.family_selections));
    const profileOverlayTargets = new Map();
    for (const [familyType, familyId] of selected) {
      const family = familyById.get(familyId);
      if (!family) {
        errors.push(`Architecture profile ${profile.id} selects unknown family ${familyId}.`);
        continue;
      }
      if (family.family !== familyType) errors.push(`Architecture profile ${profile.id} assigns ${familyId} to ${familyType}, but it belongs to ${family.family}.`);
      for (const overlay of family.runtime_overlays || []) {
        if (profileOverlayTargets.has(overlay.target)) errors.push(`Architecture profile ${profile.id} has conflicting runtime overlay target ${overlay.target} in ${profileOverlayTargets.get(overlay.target)} and ${family.id}.`);
        profileOverlayTargets.set(overlay.target, family.id);
      }
      for (const requiredType of family.compatibility.requires_family_types) {
        if (!selected.has(requiredType)) errors.push(`Architecture profile ${profile.id} is missing required family type ${requiredType} for ${familyId}.`);
      }
      for (const incompatibleId of family.compatibility.incompatible_family_ids) {
        if ([...selected.values()].includes(incompatibleId)) errors.push(`Architecture profile ${profile.id} selects incompatible families ${familyId} and ${incompatibleId}.`);
      }
    }
    for (const capability of profile.capability_requirements) {
      if (!capabilityIds.has(capability)) errors.push(`Architecture profile ${profile.id} requires unavailable capability ${capability}.`);
    }
    if (profile.compatibility.target_theme.id !== families.target_theme.id || profile.compatibility.target_theme.version !== families.target_theme.version) {
      errors.push(`Architecture profile ${profile.id} targets a different theme than the architecture-family registry.`);
    }
  }
  return [...new Set(errors)].sort();
}

function validateArchitectureCatalog({ root = path.resolve(__dirname, '../..'), families, profiles, capabilities } = {}) {
  const validator = createSchemaValidator(root);
  const familyCatalog = families || readJson(root, FAMILY_REGISTRY_PATH);
  const profileCatalog = profiles || readJson(root, PROFILE_REGISTRY_PATH);
  const capabilityCatalog = capabilities || readJson(root, CAPABILITY_REGISTRY_PATH);
  const errors = [
    ...validator.validateFile(familyCatalog, 'schemas/calinium-architecture-families.schema.json', FAMILY_REGISTRY_PATH),
    ...validator.validateFile(profileCatalog, 'schemas/calinium-architecture-profiles.schema.json', PROFILE_REGISTRY_PATH),
    ...catalogValidationErrors({ root, families: familyCatalog, profiles: profileCatalog, capabilities: capabilityCatalog })
  ];
  return { valid: errors.length === 0, errors: [...new Set(errors)].sort() };
}

function loadArchitectureRegistry(root = path.resolve(__dirname, '../..')) {
  const families = readJson(root, FAMILY_REGISTRY_PATH);
  const profiles = readJson(root, PROFILE_REGISTRY_PATH);
  const capabilities = readJson(root, CAPABILITY_REGISTRY_PATH);
  const validation = validateArchitectureCatalog({ root, families, profiles, capabilities });
  if (!validation.valid) {
    const error = new Error(`Calinium architecture catalog validation failed: ${validation.errors.join(' ')}`);
    error.name = 'ArchitectureCatalogValidationError';
    error.validation = validation;
    throw error;
  }
  return {
    root,
    families,
    profiles,
    capabilities,
    familyById: new Map(families.families.map((family) => [family.id, family])),
    profileById: new Map(profiles.profiles.map((profile) => [profile.id, profile])),
    capabilityIds: new Set(capabilities.capabilities.map((capability) => capability.id))
  };
}

module.exports = {
  FAMILY_REGISTRY_PATH,
  PROFILE_REGISTRY_PATH,
  CAPABILITY_REGISTRY_PATH,
  loadArchitectureRegistry,
  validateArchitectureCatalog
};
