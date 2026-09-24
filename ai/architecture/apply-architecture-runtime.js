'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { digest } = require('./contracts');
const { loadArchitectureRegistry } = require('./architecture-registry');

const APPLICATION_VERSION = 'architecture-runtime-v1';
const ALLOWED_TARGET_DIRECTORIES = new Set(['assets', 'sections', 'snippets']);

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function assertSafeTarget(themeRoot, target) {
  const normalized = target.split(path.sep).join('/');
  const parts = normalized.split('/');
  if (parts.length !== 2 || !ALLOWED_TARGET_DIRECTORIES.has(parts[0]) || parts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Architecture runtime overlay target ${target} is not a supported Shopify runtime file.`);
  }
  const extensionValid = (parts[0] === 'assets' && /\.(css|js)$/.test(parts[1]))
    || ((parts[0] === 'sections' || parts[0] === 'snippets') && parts[1].endsWith('.liquid'));
  if (!extensionValid) throw new Error(`Architecture runtime overlay target ${target} has an invalid file type.`);
  const absolute = path.resolve(themeRoot, normalized);
  if (!absolute.startsWith(`${path.resolve(themeRoot)}${path.sep}`)) throw new Error(`Architecture runtime overlay target ${target} escapes the generated theme.`);
  return absolute;
}

function resolveArchitectureRuntime({ root = path.resolve(__dirname, '../..'), architecture }) {
  if (!architecture || typeof architecture !== 'object') throw new Error('Architecture runtime application requires frozen architecture provenance.');
  if (!/^architecture-selection-[a-f0-9]{20}$/.test(architecture.selection_revision_id || '')) throw new Error('Architecture runtime application requires a valid frozen selection revision.');
  const registry = loadArchitectureRegistry(root);
  const profile = registry.profileById.get(architecture.profile_id);
  if (!profile || profile.version !== architecture.profile_version || profile.profile_schema_version !== architecture.profile_schema_version) {
    throw new Error(`Architecture runtime application cannot resolve profile ${architecture.profile_id || '(missing)'}.`);
  }
  const suppliedFamilies = new Map((architecture.selected_families || []).map((family) => [family.family, family]));
  const selectedFamilies = [];
  const overlays = [];
  const targetOwners = new Map();

  for (const [familyType, familyId] of Object.entries(profile.family_selections)) {
    const family = registry.familyById.get(familyId);
    const supplied = suppliedFamilies.get(familyType);
    if (!family || !supplied || supplied.family_id !== family.id || supplied.family_version !== family.version) {
      throw new Error(`Architecture provenance does not bind registered ${familyType} family ${familyId}.`);
    }
    if (supplied.presenters && JSON.stringify(supplied.presenters) !== JSON.stringify(family.presenters)) {
      throw new Error(`Architecture provenance presenters do not match registered family ${family.id}.`);
    }
    const familyProvenance = {
      family: familyType,
      family_id: family.id,
      family_version: family.version,
      presenters: [...family.presenters]
    };
    selectedFamilies.push(familyProvenance);
    for (const overlay of family.runtime_overlays || []) {
      if (targetOwners.has(overlay.target)) {
        throw new Error(`Architecture runtime families ${targetOwners.get(overlay.target)} and ${family.id} both target ${overlay.target}.`);
      }
      targetOwners.set(overlay.target, family.id);
      const sourcePath = path.resolve(root, overlay.source);
      const presenterRoot = path.resolve(root, 'ai/architecture/presenters');
      if (!sourcePath.startsWith(`${presenterRoot}${path.sep}`)) throw new Error(`Architecture runtime source ${overlay.source} is outside the presenter source root.`);
      const sourceKind = overlay.source.split('/').at(-2);
      const targetKind = overlay.target.split('/')[0];
      if (sourceKind !== targetKind) throw new Error(`Architecture runtime source ${overlay.source} cannot target ${overlay.target}.`);
      if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) throw new Error(`Architecture runtime source ${overlay.source} is unavailable.`);
      const realPresenterRoot = fs.realpathSync(presenterRoot);
      const realSourcePath = fs.realpathSync(sourcePath);
      if (!realSourcePath.startsWith(`${realPresenterRoot}${path.sep}`)) throw new Error(`Architecture runtime source ${overlay.source} resolves outside the presenter source root.`);
      if (path.extname(overlay.source) !== path.extname(overlay.target)) throw new Error(`Architecture runtime source ${overlay.source} has a different file type than ${overlay.target}.`);
      overlays.push({
        family: familyType,
        family_id: family.id,
        presenter_ids: [...family.presenters],
        source: overlay.source,
        target: overlay.target,
        sha256: sha256File(sourcePath)
      });
    }
  }
  if (suppliedFamilies.size !== selectedFamilies.length) throw new Error('Architecture provenance contains unregistered family selections.');
  overlays.sort((left, right) => left.target.localeCompare(right.target));
  const base = {
    application_version: APPLICATION_VERSION,
    profile_id: profile.id,
    profile_version: profile.version,
    selection_revision_id: architecture.selection_revision_id,
    applied: overlays.length > 0,
    selected_families: selectedFamilies,
    overlays
  };
  return { ...base, application_revision_id: `architecture-runtime-${digest(base).slice(0, 20)}` };
}

function applyArchitectureRuntime({ root = path.resolve(__dirname, '../..'), themeRoot, architecture }) {
  const application = resolveArchitectureRuntime({ root, architecture });
  for (const overlay of application.overlays) {
    const destination = assertSafeTarget(themeRoot, overlay.target);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.resolve(root, overlay.source), destination);
    if (sha256File(destination) !== overlay.sha256) throw new Error(`Architecture runtime overlay ${overlay.target} failed integrity verification.`);
  }
  return application;
}

module.exports = {
  APPLICATION_VERSION,
  ALLOWED_TARGET_DIRECTORIES,
  resolveArchitectureRuntime,
  applyArchitectureRuntime,
  assertSafeTarget
};
