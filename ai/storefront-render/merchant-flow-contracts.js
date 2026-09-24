'use strict';

const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { loadArchitectureRegistry } = require('../architecture/architecture-registry');
const {
  CAPTURE_POLICY_REVISION,
  REQUIRED_CAPTURE_CHECKS,
  digest,
  sha256File,
  loadRouteRegistry,
  loadViewportRegistry,
  resolveRoutes,
  resolveViewports,
  resolveRouteArchitectureEvidence
} = require('./contracts');
const { isPathInside } = require('../theme-generator/utils');

const MERCHANT_RENDER_REQUEST_SCHEMA = 'schemas/calinium-merchant-flow-storefront-render-request.schema.json';
const MERCHANT_RENDER_RESULT_SCHEMA = 'schemas/calinium-merchant-flow-storefront-render-result.schema.json';
const MERCHANT_RENDER_REQUEST_VERSION = 'merchant-flow-storefront-render-request-v1';
const MERCHANT_RENDER_RESULT_VERSION = 'merchant-flow-storefront-render-result-v1';
const MERCHANT_RENDER_REVISION = 'merchant-flow-storefront-render-v1';

function contractError(label, errors) {
  const error = new Error(`${label} validation failed: ${errors.join('; ')}`);
  error.name = 'MerchantFlowStorefrontRenderContractError';
  error.validation = { valid: false, errors: [...errors] };
  return error;
}

function outputReference(root, reference) {
  const raw = String(reference || '').replace(/\\/g, '/').replace(/^\.\//, '');
  const normalized = raw.startsWith('output/') ? raw : `output/${raw}`;
  const absolute = path.resolve(root, normalized);
  if (!isPathInside(path.resolve(root, 'output'), absolute)) throw new Error('Merchant render evidence must remain inside output/.');
  return { reference: normalized, absolute };
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function selectedArchitecture(flow, packageManifest, root) {
  const selection = flow?.context?.architecture_selection;
  const runtime = packageManifest?.architecture_runtime;
  const profileId = selection?.profile_id;
  const profileVersion = selection?.profile_version;
  const selectionRevisionId = selection?.revision_id || selection?.selection_revision_id;
  if (!profileId || !profileVersion || !selectionRevisionId) throw new Error('Merchant render requires the frozen flow architecture selection.');
  if (!runtime || runtime.profile_id !== profileId || runtime.profile_version !== profileVersion || runtime.selection_revision_id !== selectionRevisionId) {
    throw new Error('Paid package architecture runtime does not match the frozen merchant-flow selection.');
  }
  const profile = loadArchitectureRegistry(root).profileById.get(profileId);
  if (!profile || profile.version !== profileVersion) throw new Error('Merchant render architecture profile is not registered at the frozen version.');
  return { profile_id: profileId, profile_version: profileVersion, selection_revision_id: selectionRevisionId };
}

function verifyArtifactEvidence({ root, flow, artifact, artifactEvidence }) {
  const integrity = artifactEvidence?.artifact_integrity;
  const themeZip = integrity?.artifacts?.theme_zip;
  const manifestEntry = integrity?.artifacts?.package_manifest;
  if (integrity?.version !== 1 || !integrity.order_id || !integrity.generation_id || !themeZip || !manifestEntry) {
    throw new Error('Merchant render requires versioned paid artifact-integrity evidence.');
  }
  if (integrity.order_id !== flow?.paid_identity?.order_id || integrity.generation_id !== artifact?.generation_id
    || artifact.generation_id !== flow?.generation?.generation_id) throw new Error('Paid artifact integrity does not bind the active merchant flow.');
  if (artifact.artifact_id !== `theme-artifact-${String(artifact.checksum || '').slice(0, 20)}`
    || artifact.reference !== themeZip.reference || artifact.checksum !== themeZip.sha256) {
    throw new Error('Merchant render artifact identity differs from authoritative paid artifact integrity.');
  }
  const zip = outputReference(root, themeZip.reference);
  const manifest = outputReference(root, manifestEntry.reference);
  if (!fs.existsSync(zip.absolute) || !fs.statSync(zip.absolute).isFile() || sha256File(zip.absolute) !== themeZip.sha256) throw new Error('Paid merchant theme archive checksum is stale.');
  if (!fs.existsSync(manifest.absolute) || !fs.statSync(manifest.absolute).isFile() || sha256File(manifest.absolute) !== manifestEntry.sha256) throw new Error('Paid merchant package-manifest checksum is stale.');
  const packageManifest = readJson(manifest.absolute);
  const schemaErrors = createSchemaValidator(root).validateFile(packageManifest, 'schemas/calinium-read-only-theme-package.schema.json', 'paid_read_only_theme_package');
  if (schemaErrors.length) throw contractError('Paid read-only theme package', schemaErrors);
  if (packageManifest.generation_id !== integrity.generation_id || packageManifest.archive?.sha256 !== themeZip.sha256
    || packageManifest.source_theme_modified !== false || packageManifest.shopify_operations?.write_operations !== false
    || packageManifest.shopify_operations?.upload !== false || packageManifest.shopify_operations?.publish !== false) {
    throw new Error('Paid merchant package violates its read-only generation provenance.');
  }
  return { integrity, themeZip, manifestEntry, zip, manifest, packageManifest };
}

function createMerchantFlowRenderRequest({
  root,
  flow,
  artifact,
  artifactEvidence,
  target,
  runtimeConfigurationRevision,
  renderTargetConfigurationRevision,
  routeIds = ['homepage', 'collection', 'product', 'cart'],
  viewportIds = ['desktop-v1', 'mobile-v1']
}) {
  const verified = verifyArtifactEvidence({ root, flow, artifact, artifactEvidence });
  const architecture = selectedArchitecture(flow, verified.packageManifest, root);
  if (!target || target.is_live !== false || target.theme_role !== 'development'
    || !/^[1-9][0-9]*$/.test(String(target.theme_id || ''))) throw new Error('Merchant render target must be an exact verified non-live Shopify development theme.');
  if (String(target.shop || '').toLowerCase() !== String(flow.store_context?.shop || '').toLowerCase()) throw new Error('Merchant render target shop does not match the frozen flow shop.');
  const routeRegistry = loadRouteRegistry(root);
  const viewportRegistry = loadViewportRegistry(root);
  const routes = resolveRoutes({ root, routeIds, entities: artifactEvidence.route_entities || {} });
  const viewports = resolveViewports({ root, viewportIds });
  const routeBindingRevision = `merchant-route-binding-${digest({
    routes,
    route_registry_version: routeRegistry.registry_version,
    artifact_integrity: digest(verified.integrity)
  }).slice(0, 20)}`;
  const base = {
    schema_version: '1.0',
    contract_version: MERCHANT_RENDER_REQUEST_VERSION,
    render_revision: MERCHANT_RENDER_REVISION,
    capture_purpose: 'paid_merchant_flow_qa',
    flow: {
      flow_id: flow.flow_id,
      flow_sequence: flow.sequence,
      flow_checksum: flow.checksum,
      project_id: flow.project_id,
      organization_id: flow.organization_id,
      order_id: flow.paid_identity.order_id,
      snapshot_id: flow.paid_identity.snapshot_id,
      snapshot_checksum: flow.paid_identity.snapshot_checksum
    },
    generation: {
      generation_id: artifact.generation_id,
      artifact: {
        artifact_id: artifact.artifact_id,
        source_kind: 'paid_read_only_theme_zip',
        source_reference: verified.zip.reference,
        sha256: verified.themeZip.sha256,
        manifest_reference: verified.manifest.reference,
        manifest_sha256: verified.manifestEntry.sha256
      }
    },
    architecture,
    target: {
      configuration_revision: renderTargetConfigurationRevision,
      runtime_mode: 'shopify_development_proxy',
      shop_domain: String(target.shop).toLowerCase(),
      theme_id: String(target.theme_id),
      expected_theme_role: target.theme_role
    },
    routes,
    viewports,
    safety: {
      live_theme_allowed: false,
      publish_allowed: false,
      cart_mutation_allowed: false,
      fixture_fallback_allowed: false,
      approved_replay_allowed: false,
      automatic_repair_allowed: false,
      human_review_required: true
    },
    provenance: {
      source_kind: 'paid_merchant_generation',
      artifact_integrity_version: verified.integrity.version,
      artifact_integrity_checksum: digest(verified.integrity),
      route_binding_revision: routeBindingRevision,
      route_registry_version: routeRegistry.registry_version,
      viewport_registry_version: viewportRegistry.registry_version,
      capture_policy_revision: CAPTURE_POLICY_REVISION,
      runtime_configuration_revision: runtimeConfigurationRevision
    }
  };
  return assertMerchantFlowRenderRequest({ ...base, request_id: `merchant-render-request-${digest(base).slice(0, 20)}` }, root);
}

function expectedMerchantRenderRequestId(request) {
  const base = { ...request }; delete base.request_id;
  return `merchant-render-request-${digest(base).slice(0, 20)}`;
}

function assertMerchantFlowRenderRequest(request, root) {
  const errors = createSchemaValidator(root).validateFile(request, MERCHANT_RENDER_REQUEST_SCHEMA, 'merchant_flow_storefront_render_request');
  if (request?.request_id !== expectedMerchantRenderRequestId(request)) errors.push('Merchant Render Request ID does not match canonical contents.');
  try {
    const routes = resolveRoutes({ root, routeIds: request.routes.map((route) => route.id), entities: Object.fromEntries(request.routes.filter((route) => route.entity).map((route) => [route.entity.kind, route.entity])) });
    const viewports = resolveViewports({ root, viewportIds: request.viewports.map((viewport) => viewport.id) });
    if (JSON.stringify(routes) !== JSON.stringify(request.routes)) errors.push('Merchant Render Request routes are not canonical registry bindings.');
    if (JSON.stringify(viewports) !== JSON.stringify(request.viewports)) errors.push('Merchant Render Request viewports are not canonical registry bindings.');
  } catch (error) { errors.push(error.message); }
  try {
    const archive = outputReference(root, request.generation.artifact.source_reference);
    const manifest = outputReference(root, request.generation.artifact.manifest_reference);
    if (!fs.existsSync(archive.absolute) || sha256File(archive.absolute) !== request.generation.artifact.sha256) errors.push('Merchant Render Request archive checksum is stale.');
    if (!fs.existsSync(manifest.absolute) || sha256File(manifest.absolute) !== request.generation.artifact.manifest_sha256) errors.push('Merchant Render Request package-manifest checksum is stale.');
    const packageManifest = readJson(manifest.absolute);
    if (packageManifest.generation_id !== request.generation.generation_id || packageManifest.archive?.sha256 !== request.generation.artifact.sha256) errors.push('Merchant Render Request generation provenance is stale.');
    const runtime = packageManifest.architecture_runtime;
    if (!runtime || runtime.profile_id !== request.architecture.profile_id || runtime.profile_version !== request.architecture.profile_version
      || runtime.selection_revision_id !== request.architecture.selection_revision_id) errors.push('Merchant Render Request architecture runtime is stale.');
  } catch (error) { errors.push(error.message); }
  if (errors.length) throw contractError('Merchant Flow Storefront Render Request', [...new Set(errors)]);
  return request;
}

function merchantRenderIdFor(request, route, viewport) {
  return `merchant-render-${digest({ request_id: request.request_id, route_id: route.id, route_path: route.path, viewport_id: viewport.id }).slice(0, 20)}`;
}

function merchantScreenshotReference(request, route, viewport) {
  return `output/merchant-flow-storefront-renders/${request.request_id}/screenshots/${request.architecture.profile_id}/${route.id}/${viewport.id}--${merchantRenderIdFor(request, route, viewport)}.png`;
}

function assertMerchantFlowRenderResult(result, request, root) {
  const errors = createSchemaValidator(root).validateFile(result, MERCHANT_RENDER_RESULT_SCHEMA, 'merchant_flow_storefront_render_result');
  const route = request.routes.find((item) => item.id === result?.route?.id);
  const viewport = request.viewports.find((item) => item.id === result?.viewport?.id);
  if (result?.request_id !== request.request_id) errors.push('Merchant Render Result belongs to another request.');
  if (result?.runtime?.mode !== request.target.runtime_mode
    || result?.runtime?.shop_domain !== request.target.shop_domain
    || result?.runtime?.theme_id !== request.target.theme_id
    || result?.runtime?.theme_role !== request.target.expected_theme_role) {
    errors.push('Merchant Render Result runtime identity differs from its exact controlled development target.');
  }
  if (!route || JSON.stringify(route) !== JSON.stringify(result.route)) errors.push('Merchant Render Result route is not canonical.');
  if (!viewport || JSON.stringify(viewport) !== JSON.stringify(result.viewport)) errors.push('Merchant Render Result viewport is not canonical.');
  if (route && viewport && result?.render_id !== merchantRenderIdFor(request, route, viewport)) errors.push('Merchant Render Result ID is not canonical.');
  if (route && viewport && result?.screenshot?.artifact_reference !== merchantScreenshotReference(request, route, viewport)) errors.push('Merchant Render Result screenshot reference is not canonical.');
  if (JSON.stringify(result?.architecture) !== JSON.stringify(request.architecture) || JSON.stringify(result?.generation) !== JSON.stringify(request.generation)) errors.push('Merchant Render Result generation or architecture provenance differs from its request.');
  if (result?.provenance?.source_kind !== 'paid_merchant_generation' || result?.provenance?.flow_id !== request.flow.flow_id
    || result?.provenance?.flow_sequence !== request.flow.flow_sequence || result?.provenance?.flow_checksum !== request.flow.flow_checksum
    || result?.provenance?.artifact_sha256 !== request.generation.artifact.sha256
    || result?.provenance?.manifest_sha256 !== request.generation.artifact.manifest_sha256
    || result?.provenance?.request_checksum !== digest(request)
    || result?.provenance?.route_binding_revision !== request.provenance.route_binding_revision
    || result?.provenance?.capture_policy_revision !== request.provenance.capture_policy_revision
    || result?.provenance?.runtime_configuration_revision !== request.provenance.runtime_configuration_revision) errors.push('Merchant Render Result provenance is stale.');
  if (result?.status === 'passed') {
    const checks = new Map((result.deterministic_validation?.checks || []).map((check) => [check.id, check]));
    for (const id of REQUIRED_CAPTURE_CHECKS) if (checks.get(id)?.passed !== true) errors.push(`Merchant Render Result is missing passed deterministic check ${id}.`);
    if (checks.get('registered_presenters_rendered')?.passed !== true || result.architecture_evidence?.valid !== true) errors.push('Merchant Render Result did not prove its registered architecture presenters.');
    if (!result.screenshot || result.readiness?.ready !== true || result.deterministic_validation?.valid !== true || result.error !== null) errors.push('Merchant Render Result is missing successful capture evidence.');
    try {
      const screenshot = path.resolve(root, result.screenshot.artifact_reference);
      if (!isPathInside(path.resolve(root, 'output'), screenshot) || !fs.existsSync(screenshot) || sha256File(screenshot) !== result.screenshot.sha256) errors.push('Merchant Render Result screenshot checksum is stale.');
    } catch (error) { errors.push(error.message); }
  }
  if (result?.architecture_evidence && route) {
    try {
      const expected = resolveRouteArchitectureEvidence({ root, request })[route.id];
      const actual = {
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
      if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push('Merchant Render Result architecture evidence differs from the registered presenter contract.');
      const valid = result.architecture_evidence.artifact_structure_verified === true
        && result.architecture_evidence.assertions.every((assertion) => assertion.passed === true && assertion.matched_count > 0);
      if (result.architecture_evidence.valid !== valid) errors.push('Merchant Render Result architecture evidence validity is inconsistent.');
    } catch (error) { errors.push(error.message); }
  }
  if (result?.status === 'failed' && !result.error) errors.push('Failed Merchant Render Result requires a safe error.');
  if (errors.length) throw contractError('Merchant Flow Storefront Render Result', [...new Set(errors)]);
  return result;
}

module.exports = {
  MERCHANT_RENDER_REQUEST_SCHEMA,
  MERCHANT_RENDER_RESULT_SCHEMA,
  MERCHANT_RENDER_REQUEST_VERSION,
  MERCHANT_RENDER_RESULT_VERSION,
  MERCHANT_RENDER_REVISION,
  outputReference,
  verifyArtifactEvidence,
  createMerchantFlowRenderRequest,
  assertMerchantFlowRenderRequest,
  merchantRenderIdFor,
  merchantScreenshotReference,
  assertMerchantFlowRenderResult,
  resolveRouteArchitectureEvidence
};
