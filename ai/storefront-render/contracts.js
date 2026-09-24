'use strict';

const crypto = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { loadArchitectureRegistry } = require('../architecture/architecture-registry');
const { assertFrozenArchitectureSelection } = require('../architecture/select-architecture');
const { isPathInside } = require('../theme-generator/utils');
const { withoutShopifyStorefrontPassword } = require('./shopify-storefront-password-binding');

const REQUEST_SCHEMA = 'schemas/calinium-storefront-render-request.schema.json';
const RESULT_SCHEMA = 'schemas/calinium-storefront-render-result.schema.json';
const REQUEST_VERSION = 'storefront-render-request-v1';
const RESULT_VERSION = 'storefront-render-result-v1';
const RENDER_REVISION = 'storefront-render-v1';
const CAPTURE_POLICY_REVISION = 'storefront-capture-policy-v1';
const COMPARISON_CONTRACT_VERSION = 'storefront-architecture-comparison-v1';
const PRESENTER_EVIDENCE_SCHEMA = 'schemas/calinium-storefront-render-presenter-evidence.schema.json';
const PRESENTER_EVIDENCE_REGISTRY = 'config/storefront-render-presenter-evidence.json';
const PRESENTER_EVIDENCE_REVISION = 'storefront-architecture-evidence-v1';
const REQUIRED_CAPTURE_CHECKS = Object.freeze([
  'page_loaded',
  'requested_route_resolved',
  'expected_landmarks_exist',
  'no_fatal_page_error',
  'no_critical_asset_failure',
  'viewport_dimensions_correct',
  'architecture_provenance_present',
  'generated_artifact_binding_verified',
  'deterministic_readiness_complete',
  'screenshot_generated',
  'screenshot_dimensions_correct'
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function sha256File(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

function redactSensitiveText(value) {
  return String(value || '')
    .replace(/([?&](?:access[_-]?token|token|password|api[_-]?key|key|client[_-]?secret|secret|signature|authorization|session(?:[_-]?id)?|cookie)=)[^&#\s"']+/gi, '$1[redacted]')
    .replace(/(\b(?:access[_-]?token|token|password|api[_-]?key|client[_-]?secret|secret|signature|authorization|session(?:[_-]?id)?|set-cookie|cookie)\b\s*[:=]\s*)(?:(?:Bearer|Basic)\s+)?[^\s,;]+/gi, '$1[redacted]')
    .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '[credential redacted]');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function contractError(label, errors) {
  const error = new Error(`${label} validation failed: ${errors.join('; ')}`);
  error.name = 'StorefrontRenderContractError';
  error.validation = { valid: false, errors, warnings: [] };
  return error;
}

function loadViewportRegistry(root) {
  const registry = readJson(path.join(root, 'config/storefront-render-viewports.json'));
  const errors = [];
  if (registry.schema_version !== '1.0' || registry.registry_version !== '1.0.0') errors.push('Viewport registry version is unsupported.');
  if (!Array.isArray(registry.viewports) || registry.viewports.length < 2) errors.push('Viewport registry must include desktop and mobile profiles.');
  const ids = new Set();
  for (const viewport of registry.viewports || []) {
    if (!viewport.id || ids.has(viewport.id)) errors.push(`Viewport ID ${viewport.id || '<missing>'} is invalid or duplicated.`);
    ids.add(viewport.id);
    if (!Number.isInteger(viewport.width) || !Number.isInteger(viewport.height) || viewport.width < 1 || viewport.height < 1) errors.push(`Viewport ${viewport.id} has invalid dimensions.`);
    if (viewport.device_scale_factor !== 1) errors.push(`Viewport ${viewport.id} must use device scale factor 1 in version 1.`);
  }
  if (!ids.has('desktop-v1') || !ids.has('mobile-v1')) errors.push('Viewport registry must contain desktop-v1 and mobile-v1.');
  if (errors.length) throw contractError('Storefront render viewport registry', errors);
  return { ...registry, byId: new Map(registry.viewports.map((item) => [item.id, item])) };
}

function loadRouteRegistry(root) {
  const registry = readJson(path.join(root, 'config/storefront-render-routes.json'));
  const errors = [];
  const expected = ['homepage', 'collection', 'product', 'cart'];
  if (registry.schema_version !== '1.0' || registry.registry_version !== '1.0.0') errors.push('Route registry version is unsupported.');
  const ids = new Set();
  for (const route of registry.routes || []) {
    if (!expected.includes(route.id) || ids.has(route.id)) errors.push(`Route ID ${route.id || '<missing>'} is invalid or duplicated.`);
    ids.add(route.id);
    if (!String(route.path_template || '').startsWith('/')) errors.push(`Route ${route.id} has an invalid path template.`);
    if (!Array.isArray(route.expected_landmarks) || !route.expected_landmarks.length) errors.push(`Route ${route.id} has no readiness landmark.`);
  }
  if (expected.some((id) => !ids.has(id))) errors.push('Route registry must contain homepage, collection, product, and cart.');
  if (errors.length) throw contractError('Storefront render route registry', errors);
  return { ...registry, byId: new Map(registry.routes.map((item) => [item.id, item])) };
}

function loadTargetRegistry(root) {
  const registry = readJson(path.join(root, 'config/storefront-render-targets.json'));
  const errors = [];
  if (registry.schema_version !== '1.0' || registry.registry_version !== '1.0.0') errors.push('Render target registry version is unsupported.');
  if (!Array.isArray(registry.targets) || !registry.targets.length) errors.push('Render target registry must include at least one controlled target.');
  const ids = new Set();
  for (const target of registry.targets || []) {
    if (!target.id || ids.has(target.id)) errors.push(`Render target ID ${target.id || '<missing>'} is invalid or duplicated.`);
    ids.add(target.id);
    if (target.runtime_mode !== 'shopify_development_proxy') errors.push(`Render target ${target.id} uses an unsupported runtime mode.`);
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(target.shop_domain || '')) errors.push(`Render target ${target.id} has an invalid Shopify domain.`);
    if (!['development', 'unpublished'].includes(target.expected_theme_role)) errors.push(`Render target ${target.id} does not require a non-live theme role.`);
  }
  if (errors.length) throw contractError('Storefront render target registry', errors);
  return { ...registry, byId: new Map(registry.targets.map((item) => [item.id, item])) };
}

function loadPresenterEvidenceRegistry(root) {
  const registry = readJson(path.join(root, PRESENTER_EVIDENCE_REGISTRY));
  const errors = createSchemaValidator(root).validateFile(registry, PRESENTER_EVIDENCE_SCHEMA, PRESENTER_EVIDENCE_REGISTRY);
  let architectureRegistry;
  try { architectureRegistry = loadArchitectureRegistry(root); } catch (error) { errors.push(error.message); }
  const profileIds = new Set();
  for (const profileEvidence of registry.profiles || []) {
    if (profileIds.has(profileEvidence.profile_id)) errors.push(`Duplicate presenter-evidence profile ${profileEvidence.profile_id}.`);
    profileIds.add(profileEvidence.profile_id);
    const profile = architectureRegistry?.profileById.get(profileEvidence.profile_id);
    if (!profile) {
      errors.push(`Presenter evidence references unknown architecture profile ${profileEvidence.profile_id}.`);
      continue;
    }
    const routeIds = new Set();
    for (const route of profileEvidence.routes || []) {
      if (routeIds.has(route.route_id)) errors.push(`Duplicate presenter evidence for ${profileEvidence.profile_id}:${route.route_id}.`);
      routeIds.add(route.route_id);
      for (const assertion of route.assertions || []) {
        const familyId = profile.family_selections[assertion.family];
        const family = architectureRegistry.familyById.get(familyId);
        if (!family) errors.push(`Presenter evidence ${profileEvidence.profile_id}:${route.route_id} has no selected ${assertion.family} family.`);
        else if (!family.presenters.includes(assertion.presenter_id)) errors.push(`Presenter evidence ${assertion.presenter_id} is not registered by ${family.id}.`);
      }
    }
    for (const routeId of ['homepage', 'collection', 'product', 'cart']) {
      if (!routeIds.has(routeId)) errors.push(`Presenter evidence ${profileEvidence.profile_id} is missing route ${routeId}.`);
    }
  }
  for (const profile of architectureRegistry?.profiles.profiles || []) {
    if (!profileIds.has(profile.id)) errors.push(`Architecture profile ${profile.id} has no storefront presenter evidence.`);
  }
  if (errors.length) throw contractError('Storefront presenter-evidence registry', [...new Set(errors)]);
  return {
    ...registry,
    byProfileId: new Map(registry.profiles.map((profile) => [profile.profile_id, {
      ...profile,
      byRouteId: new Map(profile.routes.map((route) => [route.route_id, route]))
    }]))
  };
}

function readShopifyJsonFromArchive(archivePath, relativePath) {
  let source;
  try {
    source = execFileSync('unzip', ['-p', archivePath, relativePath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: withoutShopifyStorefrontPassword(process.env)
    });
  }
  catch { throw new Error(`Generated architecture artifact is missing ${relativePath}.`); }
  try { return JSON.parse(source); }
  catch { throw new Error(`Generated architecture artifact contains invalid JSON at ${relativePath}.`); }
}

function renderedSectionIdentities(archivePath, templateIdentity) {
  const template = readShopifyJsonFromArchive(archivePath, templateIdentity);
  const headerGroup = readShopifyJsonFromArchive(archivePath, 'sections/header-group.json');
  return [...new Set([
    ...Object.values(headerGroup.sections || {}).map((section) => section.type),
    ...Object.values(template.sections || {}).map((section) => section.type)
  ].filter(Boolean))];
}

function resolveRouteArchitectureEvidence({ root, request }) {
  const evidenceRegistry = loadPresenterEvidenceRegistry(root);
  const architectureRegistry = loadArchitectureRegistry(root);
  const profile = architectureRegistry.profileById.get(request.architecture.profile_id);
  const archivePath = assertOutputArtifact(root, request.generation.artifact.source_reference);
  const configured = evidenceRegistry.byProfileId.get(profile.id);
  if (!configured) throw new Error(`Architecture profile ${profile.id} has no registered storefront evidence.`);
  const selectedFamilies = Object.entries(profile.family_selections).map(([familyType, familyId]) => {
    const family = architectureRegistry.familyById.get(familyId);
    return {
      family: familyType,
      family_id: family.id,
      family_version: family.version,
      presenter_ids: [...family.presenters]
    };
  });
  return Object.fromEntries(request.routes.map((route) => {
    const routeEvidence = configured.byRouteId.get(route.id);
    if (!routeEvidence) throw new Error(`Architecture profile ${profile.id} has no registered evidence for ${route.id}.`);
    const familyByType = new Map(selectedFamilies.map((family) => [family.family, family]));
    const renderedSections = renderedSectionIdentities(archivePath, routeEvidence.template_identity);
    const missingSectionIdentities = routeEvidence.section_identities.filter((identity) => !renderedSections.includes(identity));
    if (missingSectionIdentities.length) throw new Error(`Generated architecture artifact is missing expected ${route.id} section identities: ${missingSectionIdentities.join(', ')}.`);
    return [route.id, {
      evidence_revision: evidenceRegistry.evidence_revision,
      profile_id: profile.id,
      profile_version: profile.version,
      selection_revision_id: request.architecture.selection_revision_id,
      route_id: route.id,
      template_identity: routeEvidence.template_identity,
      section_identities: [...routeEvidence.section_identities],
      rendered_section_identities: renderedSections,
      artifact_structure_verified: true,
      selected_families: selectedFamilies.map((family) => ({ ...family, presenter_ids: [...family.presenter_ids] })),
      assertions: routeEvidence.assertions.map((assertion) => {
        const family = familyByType.get(assertion.family);
        return {
          family: assertion.family,
          family_id: family.family_id,
          family_version: family.family_version,
          presenter_id: assertion.presenter_id,
          selector: assertion.selector
        };
      })
    }];
  }));
}

function normalizedEntity(kind, value) {
  if (!value || value.handle !== String(value.handle || '').toLowerCase()) throw new Error(`Render ${kind} binding requires a normalized lowercase handle.`);
  return {
    kind,
    resource_id: value.resource_id,
    remote_gid: value.remote_gid,
    handle: value.handle,
    source_revision: value.source_revision,
    resolution_source: value.resolution_source
  };
}

function resolveRoutes({ root, routeIds, entities = {} }) {
  const registry = loadRouteRegistry(root);
  const requested = new Set(routeIds || []);
  for (const id of requested) if (!registry.byId.has(id)) throw new Error(`Unknown storefront render route ${id}.`);
  if (requested.size !== (routeIds || []).length) throw new Error('Storefront render routes cannot be duplicated.');
  return registry.routes.filter((route) => requested.has(route.id)).map((route) => {
    const entity = route.entity_kind ? normalizedEntity(route.entity_kind, entities[route.entity_kind]) : null;
    const pathname = entity ? route.path_template.replace('{handle}', encodeURIComponent(entity.handle)) : route.path_template;
    if (pathname.includes('{handle}') || !pathname.startsWith('/')) throw new Error(`Storefront render route ${route.id} could not be resolved deterministically.`);
    return {
      id: route.id,
      path: pathname,
      expected_landmarks: [...route.expected_landmarks],
      safe_capture_state: route.safe_capture_state,
      entity
    };
  });
}

function resolveViewports({ root, viewportIds }) {
  const registry = loadViewportRegistry(root);
  const requested = new Set(viewportIds || []);
  for (const id of requested) if (!registry.byId.has(id)) throw new Error(`Unknown storefront render viewport ${id}.`);
  if (requested.size !== (viewportIds || []).length) throw new Error('Storefront render viewports cannot be duplicated.');
  return registry.viewports.filter((viewport) => requested.has(viewport.id)).map((viewport) => ({ ...viewport }));
}

function assertOutputArtifact(root, relativeReference) {
  const outputRoot = path.resolve(root, 'output');
  const absolute = path.resolve(root, relativeReference);
  if (!isPathInside(outputRoot, absolute)) throw new Error('Storefront render artifact must resolve inside output/.');
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) throw new Error(`Storefront render artifact is unavailable: ${relativeReference}.`);
  return absolute;
}

function comparisonFixtureRevision({ fixture, routeRegistry, viewportRegistry, targetRegistry }) {
  return `comparison-fixture-${digest({
    fixture_id: fixture.fixture_id,
    fixture_version: fixture.fixture_version,
    merchant_fixture_id: fixture.generation_fixture.fixture_id || null,
    preset_id: fixture.generation_fixture.preset_id,
    target: fixture.target,
    entities: fixture.entities,
    runtime_binding_policy: fixture.runtime_binding_policy,
    requested_routes: routeRegistry.routes.filter((route) => new Set(fixture.requested_routes).has(route.id)).map((route) => route.id),
    requested_viewports: viewportRegistry.viewports.filter((viewport) => new Set(fixture.requested_viewports).has(viewport.id)).map((viewport) => viewport.id),
    route_registry_version: routeRegistry.registry_version,
    viewport_registry_version: viewportRegistry.registry_version,
    target_registry_version: targetRegistry.registry_version,
    render_revision: RENDER_REVISION,
    capture_policy_revision: CAPTURE_POLICY_REVISION
  }).slice(0, 20)}`;
}

function architectureFromManifest(manifest) {
  const selection = manifest?.architecture_selection;
  return selection ? {
    profile_id: selection.profile_id,
    profile_version: selection.profile_version,
    selection_revision_id: selection.selection_revision_id
  } : null;
}

function expectedGenerationRevision({ generationId, artifactSha256, sourceArtifactSha256, manifest }) {
  return `generation-revision-${digest({
    generation_id: generationId,
    artifact_sha256: artifactSha256,
    source_artifact_sha256: sourceArtifactSha256,
    resource_binding_revision: manifest?.resource_binding_revision || null,
    generator_version: manifest?.generator_version || null,
    strategy_revision: manifest?.strategy_revision || null
  }).slice(0, 20)}`;
}

function assertReadOnlyManifest(manifest, label) {
  if (manifest?.shopify_operations && (manifest.shopify_operations.write_operations || manifest.shopify_operations.upload || manifest.shopify_operations.publish)) {
    throw new Error(`${label} crosses the read-only Shopify boundary.`);
  }
}

function verifyRenderArtifactProvenance(request, root) {
  const artifact = request.generation.artifact;
  if (request.provenance.artifact_manifest_reference !== artifact.manifest_reference) {
    throw new Error('Render artifact manifest provenance is inconsistent.');
  }
  if (request.provenance.store_fixture_id !== request.target.fixture_id) throw new Error('Render store-fixture provenance is inconsistent.');
  const artifactPath = assertOutputArtifact(root, artifact.source_reference);
  if (sha256File(artifactPath) !== artifact.sha256) throw new Error('Render artifact checksum differs from the Render Request.');
  if (!artifact.manifest_reference) throw new Error('Render artifact requires a trusted generation manifest.');
  const manifest = readJson(assertOutputArtifact(root, artifact.manifest_reference));
  if (manifest?.zip?.sha256 !== artifact.sha256) throw new Error('Render artifact checksum does not match its generation manifest.');
  if (manifest?.zip?.path && manifest.zip.path !== artifact.source_reference) throw new Error('Render artifact reference does not match its generation manifest.');
  assertReadOnlyManifest(manifest, 'Render artifact manifest');

  const manifestArchitecture = architectureFromManifest(manifest);
  if (!manifestArchitecture || JSON.stringify(manifestArchitecture) !== JSON.stringify(request.architecture)) {
    throw new Error('Render architecture provenance does not match the generated artifact manifest.');
  }
  if (manifest.preset_id !== request.provenance.preset_id) throw new Error('Render preset provenance does not match the generated artifact manifest.');
  if ((manifest.merchant_fixture || null) !== request.provenance.merchant_fixture_id) throw new Error('Render merchant-fixture provenance does not match the generated artifact manifest.');
  if ((manifest.resource_binding_revision || null) !== artifact.resource_binding_revision
    || artifact.resource_binding_revision !== request.provenance.resource_binding_revision) {
    throw new Error('Render resource-binding provenance does not match the generated artifact manifest.');
  }
  const fixtureProvenance = manifest.fixture_provenance;
  if (!fixtureProvenance
    || fixtureProvenance.fixture_id !== request.target.fixture_id
    || fixtureProvenance.fixture_version !== request.target.fixture_version
    || fixtureProvenance.comparison_fixture_revision !== request.provenance.comparison_fixture_revision) {
    throw new Error('Render fixture provenance does not match the generated artifact manifest.');
  }

  const sourceReference = manifest?.source_artifact?.reference || artifact.source_reference;
  const sourceManifestReference = manifest?.source_artifact?.manifest_reference || artifact.manifest_reference;
  if (artifact.source_artifact_reference !== sourceReference
    || request.provenance.source_artifact_manifest_reference !== sourceManifestReference) {
    throw new Error('Render source-artifact provenance does not match the generated artifact manifest.');
  }
  const sourcePath = assertOutputArtifact(root, sourceReference);
  const sourceSha256 = sha256File(sourcePath);
  if (sourceSha256 !== artifact.source_artifact_sha256
    || (manifest?.source_artifact?.sha256 && manifest.source_artifact.sha256 !== sourceSha256)) {
    throw new Error('Render source-artifact checksum does not match trusted provenance.');
  }
  const sourceManifest = readJson(assertOutputArtifact(root, sourceManifestReference));
  if (sourceManifest?.zip?.sha256 !== sourceSha256) throw new Error('Render source-artifact checksum does not match its generation manifest.');
  if (sourceManifest.preset_id !== request.provenance.preset_id) throw new Error('Render source-artifact preset provenance is inconsistent.');
  const sourceArchitecture = architectureFromManifest(sourceManifest);
  if (!sourceArchitecture || JSON.stringify(sourceArchitecture) !== JSON.stringify(request.architecture)) {
    throw new Error('Render source-artifact architecture provenance is inconsistent.');
  }
  assertReadOnlyManifest(sourceManifest, 'Render source-artifact manifest');

  const expectedArtifactId = `theme-artifact-${digest({ source_reference: artifact.source_reference, sha256: artifact.sha256 }).slice(0, 20)}`;
  if (artifact.artifact_id !== expectedArtifactId) throw new Error('Render artifact identity does not match its canonical contents.');
  const expectedGenerationId = manifest?.generation_id || sourceManifest?.generation_id || `generation-run-preset-demo-${request.provenance.preset_id}`;
  if (request.generation.generation_id !== expectedGenerationId) throw new Error('Render generation identity does not match preset provenance.');
  const generationRevision = expectedGenerationRevision({
    generationId: expectedGenerationId,
    artifactSha256: artifact.sha256,
    sourceArtifactSha256: sourceSha256,
    manifest
  });
  if (request.generation.generation_revision !== generationRevision) throw new Error('Render generation revision does not match trusted artifact provenance.');
  return { artifactPath, manifest, sourcePath, sourceManifest };
}

function createRenderRequest({ root, fixture, architectureSelection = null }) {
  const architectureRegistry = loadArchitectureRegistry(root);
  const targetRegistry = loadTargetRegistry(root);
  const routeRegistry = loadRouteRegistry(root);
  const viewportRegistry = loadViewportRegistry(root);
  const artifactReference = fixture.generation_fixture.artifact_reference;
  const artifactPath = assertOutputArtifact(root, artifactReference);
  const artifactSha256 = sha256File(artifactPath);
  const manifestReference = fixture.generation_fixture.artifact_manifest_reference || null;
  if (!manifestReference) throw new Error('Render artifact requires a trusted generation manifest.');
  const manifestPath = assertOutputArtifact(root, manifestReference);
  const manifest = readJson(manifestPath);
  if (manifest?.zip?.sha256 !== artifactSha256) throw new Error('Render artifact checksum does not match its generation manifest.');
  if (manifest?.preset_id && manifest.preset_id !== fixture.generation_fixture.preset_id) throw new Error('Render artifact preset does not match the controlled fixture.');
  assertReadOnlyManifest(manifest, 'Render artifact manifest');
  const sourceArtifactReference = manifest?.source_artifact?.reference || artifactReference;
  const sourceArtifactPath = assertOutputArtifact(root, sourceArtifactReference);
  const sourceArtifactSha256 = sha256File(sourceArtifactPath);
  if (manifest?.source_artifact?.sha256 && manifest.source_artifact.sha256 !== sourceArtifactSha256) throw new Error('Render source artifact checksum does not match the controlled materialization manifest.');
  const frozenSelection = architectureSelection ? assertFrozenArchitectureSelection(architectureSelection, root) : null;
  const manifestSelection = manifest?.architecture_selection || null;
  const selected = manifestSelection
    ? {
      profile_id: manifestSelection.profile_id,
      profile_version: manifestSelection.profile_version,
      selection_revision_id: manifestSelection.selection_revision_id
    }
    : frozenSelection
      ? {
        profile_id: frozenSelection.profile_id,
        profile_version: frozenSelection.profile_version,
        selection_revision_id: frozenSelection.revision_id
      }
      : null;
  if (!selected) throw new Error('Render artifact has no architecture selection provenance.');
  if (selected.profile_id !== fixture.architecture_profile_id) throw new Error('Render fixture and generated artifact use different architecture profiles.');
  if (frozenSelection && (frozenSelection.profile_id !== selected.profile_id || frozenSelection.profile_version !== selected.profile_version || frozenSelection.revision_id !== selected.selection_revision_id)) {
    throw new Error('Frozen architecture selection does not match the generated artifact manifest.');
  }
  const profile = architectureRegistry.profileById.get(selected.profile_id);
  if (!profile || profile.version !== selected.profile_version) throw new Error('Render request architecture profile is not registered at the selected version.');
  if (!/^architecture-selection-[a-f0-9]{20}$/.test(selected.selection_revision_id || '')) throw new Error('Render artifact architecture selection revision is invalid.');
  const configuredTarget = targetRegistry.byId.get(fixture.target.target_id);
  if (!configuredTarget) throw new Error(`Unknown controlled storefront render target ${fixture.target.target_id}.`);
  for (const key of ['runtime_mode', 'shop_domain', 'expected_theme_role']) {
    if (fixture.target[key] !== configuredTarget[key]) throw new Error(`Render fixture target ${fixture.target.target_id} does not match controlled target field ${key}.`);
  }
  const generationId = manifest?.generation_id || `generation-run-preset-demo-${fixture.generation_fixture.preset_id}`;
  const generationRevision = expectedGenerationRevision({ generationId, artifactSha256, sourceArtifactSha256, manifest });
  const artifactId = `theme-artifact-${digest({ source_reference: artifactReference, sha256: artifactSha256 }).slice(0, 20)}`;
  const fixtureRevision = comparisonFixtureRevision({ fixture, routeRegistry, viewportRegistry, targetRegistry });
  if (!manifest.fixture_provenance
    || manifest.fixture_provenance.fixture_id !== fixture.fixture_id
    || manifest.fixture_provenance.fixture_version !== fixture.fixture_version
    || manifest.fixture_provenance.comparison_fixture_revision !== fixtureRevision) {
    throw new Error('Generated artifact does not carry the controlled comparison-fixture provenance.');
  }
  const base = {
    schema_version: '1.0',
    contract_version: REQUEST_VERSION,
    render_revision: RENDER_REVISION,
    capture_purpose: fixture.capture_purpose,
    generation: {
      generation_id: generationId,
      generation_revision: generationRevision,
      artifact: {
        artifact_id: artifactId,
        source_kind: 'theme_zip',
        source_reference: artifactReference,
        sha256: artifactSha256,
        manifest_reference: manifestReference,
        source_artifact_reference: sourceArtifactReference,
        source_artifact_sha256: sourceArtifactSha256,
        resource_binding_revision: manifest?.resource_binding_revision || null
      }
    },
    architecture: { ...selected },
    target: {
      target_id: fixture.target.target_id,
      fixture_id: fixture.fixture_id,
      fixture_version: fixture.fixture_version,
      target_registry_version: targetRegistry.registry_version,
      runtime_mode: fixture.target.runtime_mode,
      shop_domain: fixture.target.shop_domain,
      expected_theme_role: fixture.target.expected_theme_role
    },
    routes: resolveRoutes({ root, routeIds: fixture.requested_routes, entities: fixture.entities }),
    viewports: resolveViewports({ root, viewportIds: fixture.requested_viewports }),
    safety: { shopify_write_boundary: 'development_theme_only', live_theme_allowed: false, publish_allowed: false, cart_mutation_allowed: false },
    provenance: {
      merchant_fixture_id: fixture.generation_fixture.fixture_id || null,
      store_fixture_id: fixture.fixture_id,
      preset_id: fixture.generation_fixture.preset_id,
      comparison_fixture_revision: fixtureRevision,
      route_registry_version: routeRegistry.registry_version,
      viewport_registry_version: viewportRegistry.registry_version,
      capture_policy_revision: CAPTURE_POLICY_REVISION,
      artifact_manifest_reference: manifestReference,
      source_artifact_manifest_reference: manifest?.source_artifact?.manifest_reference || manifestReference,
      resource_binding_revision: manifest?.resource_binding_revision || null
    }
  };
  const request = { ...base, request_id: `render-request-${digest(base).slice(0, 20)}` };
  return assertRenderRequest(request, root);
}

function expectedRequestId(request) {
  const base = { ...request };
  delete base.request_id;
  return `render-request-${digest(base).slice(0, 20)}`;
}

function assertRenderRequest(request, root) {
  const errors = createSchemaValidator(root).validateFile(request, REQUEST_SCHEMA, 'storefront_render_request');
  let registry;
  try { registry = loadArchitectureRegistry(root); } catch (error) { errors.push(error.message); }
  const profile = registry?.profileById.get(request?.architecture?.profile_id);
  if (!profile) errors.push(`Unknown architecture provenance ${request?.architecture?.profile_id || '<missing>'}.`);
  else if (profile.version !== request.architecture.profile_version) errors.push(`Architecture profile ${profile.id} version does not match the registry.`);
  if (request?.request_id && request.request_id !== expectedRequestId(request)) errors.push('Render Request ID does not match its canonical contents.');
  try {
    const targets = loadTargetRegistry(root);
    const configured = targets.byId.get(request?.target?.target_id);
    if (!configured) errors.push(`Unknown controlled storefront render target ${request?.target?.target_id || '<missing>'}.`);
    else {
      if (request.target.target_registry_version !== targets.registry_version) errors.push('Render Request target registry version is stale.');
      for (const key of ['runtime_mode', 'shop_domain', 'expected_theme_role']) {
        if (request.target[key] !== configured[key]) errors.push(`Render Request target ${request.target.target_id} does not match controlled target field ${key}.`);
      }
    }
  } catch (error) { errors.push(error.message); }
  try {
    const routes = resolveRoutes({ root, routeIds: request.routes.map((route) => route.id), entities: Object.fromEntries(request.routes.filter((route) => route.entity).map((route) => [route.entity.kind, route.entity])) });
    if (JSON.stringify(routes) !== JSON.stringify(request.routes)) errors.push('Render Request routes are not canonical registry resolutions.');
    const viewports = resolveViewports({ root, viewportIds: request.viewports.map((viewport) => viewport.id) });
    if (JSON.stringify(viewports) !== JSON.stringify(request.viewports)) errors.push('Render Request viewports are not canonical registry definitions.');
  } catch (error) { errors.push(error.message); }
  try { verifyRenderArtifactProvenance(request, root); } catch (error) { errors.push(error.message); }
  if (errors.length) throw contractError('Storefront Render Request', [...new Set(errors)]);
  return request;
}

function comparisonKeyFor(request) {
  return digest({
    comparison_contract_version: COMPARISON_CONTRACT_VERSION,
    comparison_fixture_revision: request.provenance.comparison_fixture_revision,
    target_id: request.target.target_id,
    shop_domain: request.target.shop_domain,
    target_registry_version: request.target.target_registry_version,
    route_registry_version: request.provenance.route_registry_version,
    viewport_registry_version: request.provenance.viewport_registry_version,
    capture_policy_revision: request.provenance.capture_policy_revision,
    render_revision: request.render_revision,
    routes: request.routes,
    viewports: request.viewports
  });
}

function renderIdFor(request, route, viewport) {
  return `render-${digest({ request_id: request.request_id, render_revision: request.render_revision, route_id: route.id, route_path: route.path, viewport_id: viewport.id }).slice(0, 20)}`;
}

function screenshotReference(request, route, viewport) {
  const renderId = renderIdFor(request, route, viewport);
  return `screenshots/${request.architecture.profile_id}/${route.id}/${viewport.id}--${renderId}.png`;
}

function assertRenderResult(result, request, root) {
  const errors = createSchemaValidator(root).validateFile(result, RESULT_SCHEMA, 'storefront_render_result');
  const route = request.routes.find((item) => item.id === result?.route?.id);
  const viewport = request.viewports.find((item) => item.id === result?.viewport?.id);
  if (result?.request_id !== request.request_id) errors.push('Render Result belongs to a different Render Request.');
  if (!route || JSON.stringify(route) !== JSON.stringify(result.route)) errors.push('Render Result route is not the requested canonical route.');
  if (!viewport || JSON.stringify(viewport) !== JSON.stringify(result.viewport)) errors.push('Render Result viewport is not the requested canonical viewport.');
  if (route && viewport && result?.render_id !== renderIdFor(request, route, viewport)) errors.push('Render Result ID does not match its canonical route and viewport.');
  if (route && viewport && result?.screenshot && result.screenshot.artifact_reference !== screenshotReference(request, route, viewport)) errors.push('Render Result screenshot reference is not canonical.');
  if (JSON.stringify(result?.architecture) !== JSON.stringify(request.architecture)) errors.push('Render Result architecture provenance differs from the request.');
  if (JSON.stringify(result?.generation) !== JSON.stringify(request.generation)) errors.push('Render Result generation provenance differs from the request.');
  if (result?.provenance?.capture_purpose !== request.capture_purpose) errors.push('Render Result capture-purpose provenance differs from the request.');
  if (JSON.stringify(result?.provenance?.entity) !== JSON.stringify(result?.route?.entity || null)) errors.push('Render Result entity provenance differs from its route.');
  if (result?.provenance?.artifact_sha256 !== request.generation.artifact.sha256) errors.push('Render Result artifact checksum provenance differs from the request.');
  if (result?.provenance?.request_checksum !== digest(request)) errors.push('Render Result request checksum provenance is invalid.');
  if (result?.provenance?.comparison_fixture_revision !== request.provenance.comparison_fixture_revision) errors.push('Render Result comparison-fixture provenance differs from the request.');
  if (result?.provenance?.capture_policy_revision !== request.provenance.capture_policy_revision) errors.push('Render Result capture-policy provenance differs from the request.');
  if (result?.status === 'passed' && (!result.screenshot || result.readiness?.ready !== true || result.deterministic_validation?.valid !== true || result.error !== null)) errors.push('Successful Render Result is missing trusted screenshot/readiness evidence.');
  if (result?.status === 'passed') {
    const checks = new Map((result.deterministic_validation?.checks || []).map((check) => [check.id, check]));
    for (const id of REQUIRED_CAPTURE_CHECKS) if (checks.get(id)?.passed !== true) errors.push(`Successful Render Result is missing passed deterministic check ${id}.`);
    if (checks.get('registered_presenters_rendered')?.passed !== true) errors.push('Successful Render Result did not prove that registered presenters rendered.');
    if (result.architecture_evidence?.valid !== true) errors.push('Successful Render Result is missing valid structural architecture evidence.');
  }
  if (result?.architecture_evidence) {
    try {
      const expected = resolveRouteArchitectureEvidence({ root, request })[result.route.id];
      const actualBase = {
        evidence_revision: result.architecture_evidence.evidence_revision,
        profile_id: result.architecture_evidence.profile_id,
        profile_version: result.architecture_evidence.profile_version,
        selection_revision_id: result.architecture_evidence.selection_revision_id,
        route_id: result.architecture_evidence.route_id,
        template_identity: result.architecture_evidence.template_identity,
        section_identities: result.architecture_evidence.section_identities,
        rendered_section_identities: result.architecture_evidence.rendered_section_identities,
        artifact_structure_verified: result.architecture_evidence.artifact_structure_verified,
        selected_families: result.architecture_evidence.selected_families,
        assertions: result.architecture_evidence.assertions.map(({ matched_count, passed, ...assertion }) => assertion)
      };
      if (JSON.stringify(actualBase) !== JSON.stringify(expected)) errors.push('Render Result structural architecture evidence differs from the registered presenter contract.');
      if (result.architecture_evidence.valid !== (result.architecture_evidence.artifact_structure_verified === true
        && result.architecture_evidence.assertions.every((assertion) => assertion.passed === true && assertion.matched_count > 0))) {
        errors.push('Render Result structural architecture evidence validity is inconsistent with its selector observations.');
      }
    } catch (error) { errors.push(error.message); }
  }
  if (result?.status === 'failed' && !result.error) errors.push('Failed Render Result must include a safe error.');
  if (errors.length) throw contractError('Storefront Render Result', [...new Set(errors)]);
  return result;
}

module.exports = {
  REQUEST_SCHEMA,
  RESULT_SCHEMA,
  REQUEST_VERSION,
  RESULT_VERSION,
  RENDER_REVISION,
  CAPTURE_POLICY_REVISION,
  COMPARISON_CONTRACT_VERSION,
  PRESENTER_EVIDENCE_SCHEMA,
  PRESENTER_EVIDENCE_REGISTRY,
  PRESENTER_EVIDENCE_REVISION,
  REQUIRED_CAPTURE_CHECKS,
  stable,
  digest,
  sha256File,
  redactSensitiveText,
  loadViewportRegistry,
  loadRouteRegistry,
  loadTargetRegistry,
  loadPresenterEvidenceRegistry,
  resolveRouteArchitectureEvidence,
  resolveRoutes,
  resolveViewports,
  comparisonFixtureRevision,
  assertOutputArtifact,
  verifyRenderArtifactProvenance,
  createRenderRequest,
  assertRenderRequest,
  comparisonKeyFor,
  renderIdFor,
  screenshotReference,
  assertRenderResult
};
