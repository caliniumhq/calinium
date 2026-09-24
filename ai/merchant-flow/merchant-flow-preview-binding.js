'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest } = require('../storefront-render/contracts');

const PREVIEW_BINDING_VERSION = 'merchant-flow-preview-binding-v1';
const PREVIEW_BINDING_SCHEMA = 'schemas/calinium-merchant-flow-preview-binding.schema.json';
const PREVIEW_RESOLVER_REVISION = 'merchant-flow-preview-binding-resolver-v1';
const PREVIEW_READY_STATES = Object.freeze(['preview_ready', 'merchant_action_required', 'completed']);
const SENSITIVE_QUERY_NAME = /(?:password|token|secret|credential|authorization|access[_-]?key|signature|session|cookie)/i;

function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function normalizeShop(value) { return String(value || '').trim().toLowerCase(); }
function validChecksum(value) { return /^[a-f0-9]{64}$/.test(String(value || '')); }
function validSourceRevision(value) { return /^[a-f0-9]{40}$/.test(String(value || '')); }
function previewError(code, message) {
  const error = new Error(message);
  error.name = 'MerchantFlowPreviewBindingError';
  error.code = code;
  return error;
}

function withoutBindingIdentity(binding) {
  const value = clone(binding);
  delete value.binding_id;
  delete value.binding_checksum;
  return value;
}

function withoutBindingChecksum(binding) {
  const value = clone(binding);
  delete value.binding_checksum;
  return value;
}

function safePreviewReference(value, expectedShop, expectedThemeId = null) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    if (url.protocol !== 'https:' || url.username || url.password || normalizeShop(url.hostname) !== normalizeShop(expectedShop)) return null;
    for (const name of url.searchParams.keys()) if (SENSITIVE_QUERY_NAME.test(name)) return null;
    const declaredTheme = url.searchParams.get('preview_theme_id');
    if (!declaredTheme || String(declaredTheme) !== String(expectedThemeId || '')) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function createMerchantFlowPreviewBinding({
  organizationId,
  projectId,
  connectionId,
  canonicalShop,
  flowId,
  flowSequence,
  flowChecksum,
  artifactId,
  artifactChecksum,
  renderRequestId,
  renderRequestChecksum,
  renderEvidenceId,
  renderEvidenceChecksum,
  renderRevision,
  renderResultIds,
  renderChecksum,
  developmentThemeId,
  mainThemeId,
  runtimeConfigurationRevision,
  renderTargetConfigurationRevision,
  sourceRevision,
  previewUrl,
  createdAt,
  verifiedAt = createdAt,
  recovery = null,
  root = path.resolve(__dirname, '../..')
} = {}) {
  const shop = normalizeShop(canonicalShop);
  const themeId = String(developmentThemeId || '');
  const excludedMainThemeId = String(mainThemeId || '');
  if (!/^[1-9][0-9]*$/.test(excludedMainThemeId) || excludedMainThemeId === themeId) {
    throw previewError('merchant_flow_preview_main_target_forbidden', 'The verified Shopify DEVELOPMENT theme must differ from MAIN.');
  }
  const safeUrl = safePreviewReference(previewUrl, shop, themeId);
  if (!safeUrl) throw previewError('merchant_flow_preview_reference_unsafe', 'The Shopify preview reference is unavailable or unsafe.');
  const base = {
    schema_version: '1.0',
    contract_version: PREVIEW_BINDING_VERSION,
    binding_revision: PREVIEW_BINDING_VERSION,
    status: 'target_verified',
    organization_id: String(organizationId || ''),
    project_id: String(projectId || ''),
    connection_id: String(connectionId || ''),
    canonical_shop: shop,
    flow: { flow_id: String(flowId || ''), sequence: flowSequence, checksum: String(flowChecksum || '') },
    artifact: { artifact_id: String(artifactId || ''), checksum: String(artifactChecksum || '') },
    render: {
      request_id: String(renderRequestId || ''),
      request_checksum: String(renderRequestChecksum || ''),
      evidence_id: String(renderEvidenceId || ''),
      evidence_checksum: String(renderEvidenceChecksum || ''),
      render_revision: String(renderRevision || ''),
      result_ids: [...(renderResultIds || [])].map(String),
      checksum: String(renderChecksum || ''),
      source_theme_unchanged: true
    },
    target: {
      shop_domain: shop,
      theme_id: themeId,
      main_theme_id_at_verification: excludedMainThemeId,
      main_theme_excluded: true,
      theme_role: 'development',
      runtime_mode: 'shopify_development_proxy',
      configuration_revision: String(renderTargetConfigurationRevision || '')
    },
    provenance: {
      // In v1 this is the exact source revision of the runtime that performed
      // the accepted render and atomically created this binding. It is not an
      // artifact-generation revision and must never be backfilled with a later
      // validation or recovery revision.
      source_revision: String(sourceRevision || ''),
      runtime_configuration_revision: String(runtimeConfigurationRevision || ''),
      render_target_configuration_revision: String(renderTargetConfigurationRevision || '')
    },
    preview_reference: {
      kind: 'shopify_theme_preview_url',
      url: safeUrl,
      lifecycle: 'stable_while_target_exists',
      issued_from: 'verified_render_runtime'
    },
    recovery: recovery ? clone(recovery) : null,
    created_at: String(createdAt || ''),
    verified_at: String(verifiedAt || '')
  };
  const bindingId = `merchant-flow-preview-binding-${digest(base).slice(0, 20)}`;
  const binding = { ...base, binding_id: bindingId };
  binding.binding_checksum = digest(binding);
  return assertMerchantFlowPreviewBinding(binding, root);
}

function assertMerchantFlowPreviewBinding(binding, root = path.resolve(__dirname, '../..')) {
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    throw previewError('merchant_flow_preview_binding_missing', 'A valid merchant flow preview binding is required.');
  }
  const errors = createSchemaValidator(root).validateFile(binding, PREVIEW_BINDING_SCHEMA, 'merchant flow preview binding');
  if (binding?.binding_id !== `merchant-flow-preview-binding-${digest(withoutBindingIdentity(binding)).slice(0, 20)}`) errors.push('Preview Binding ID does not match canonical contents.');
  if (binding?.binding_checksum !== digest(withoutBindingChecksum(binding))) errors.push('Preview Binding checksum does not match canonical contents.');
  if (!safePreviewReference(binding?.preview_reference?.url, binding?.canonical_shop, binding?.target?.theme_id)) errors.push('Preview Binding reference is unavailable or unsafe.');
  if (binding?.target?.shop_domain !== binding?.canonical_shop) errors.push('Preview Binding target shop is not canonical.');
  if (binding?.target?.theme_id === binding?.target?.main_theme_id_at_verification || binding?.target?.main_theme_excluded !== true) errors.push('Preview Binding target does not exclude MAIN.');
  if (binding?.target?.configuration_revision !== binding?.provenance?.render_target_configuration_revision) errors.push('Preview Binding render-target provenance is inconsistent.');
  if (!validSourceRevision(binding?.provenance?.source_revision)) errors.push('Preview Binding source revision is invalid.');
  if (errors.length) throw previewError('merchant_flow_preview_binding_invalid', `Merchant flow preview binding validation failed: ${[...new Set(errors)].join('; ')}`);
  return binding;
}

function previewQaAccepted(flow) {
  const qa = flow?.render_qa;
  if (!qa || qa.d1?.status !== 'passed') return false;
  const d27Status = qa.d2_7?.status;
  const d27Passed = ['passed', 'accepted', 'not_required'].includes(d27Status);
  const reviewed = d27Status === 'review_required' && flow?.operator_provenance?.qa_review?.decision === 'accepted';
  const repaired = flow?.operator_provenance?.repair_resolution?.status === 'human_approved'
    && flow?.repair?.human_approved === true && flow?.repair?.post_repair_qa_passed === true
    && d27Status !== 'failed';
  return d27Passed || reviewed || repaired;
}

function assertMerchantFlowPreviewBindingForFlow(binding, {
  flow,
  project = null,
  canonicalShop = null,
  connectionId = null,
  mainThemeId = null,
  runtimeConfigurationRevision = null,
  renderTargetConfigurationRevision = null,
  requireAcceptedQa = true,
  root = path.resolve(__dirname, '../..')
} = {}) {
  const value = assertMerchantFlowPreviewBinding(binding, root);
  const artifact = flow?.artifact;
  const renderQa = flow?.render_qa;
  const runtime = artifact?.controlled_runtime_binding;
  const expectedShop = normalizeShop(canonicalShop || flow?.store_context?.shop);
  const expectedConnection = String(connectionId || flow?.store_context?.connection_id || '');
  const expectedOrganization = String(project?.organization_id || flow?.organization_id || '');
  const expectedProject = String(project?.id || flow?.project_id || '');
  const expectedRuntime = String(runtimeConfigurationRevision || runtime?.runtime_configuration_revision || '');
  const expectedTargetRevision = String(renderTargetConfigurationRevision || runtime?.render_target_configuration_revision || '');
  if (value.target.main_theme_id_at_verification === value.target.theme_id
    || mainThemeId && String(mainThemeId) === value.target.theme_id) throw previewError('merchant_flow_preview_main_target_forbidden', 'The Shopify MAIN theme cannot be used as a preview target.');
  const incompatible = !flow
    || value.organization_id !== expectedOrganization
    || value.project_id !== expectedProject
    || value.connection_id !== expectedConnection
    || value.canonical_shop !== expectedShop
    || value.flow.flow_id !== flow.flow_id
    || !Number.isInteger(value.flow.sequence) || value.flow.sequence > flow.sequence
    || !validChecksum(value.flow.checksum)
    || value.artifact.artifact_id !== artifact?.artifact_id
    || value.artifact.checksum !== artifact?.checksum
    || value.render.render_revision !== renderQa?.render_revision
    || value.render.checksum !== renderQa?.render_checksum
    || JSON.stringify(value.render.result_ids) !== JSON.stringify(renderQa?.render_result_ids || [])
    || value.target.shop_domain !== expectedShop
    || value.target.theme_id !== String(runtime?.theme_id || '')
    || mainThemeId && value.target.main_theme_id_at_verification !== String(mainThemeId)
    || value.target.theme_role !== 'development'
    || value.target.runtime_mode !== 'shopify_development_proxy'
    || value.provenance.runtime_configuration_revision !== expectedRuntime
    || value.provenance.render_target_configuration_revision !== expectedTargetRevision;
  if (incompatible) throw previewError('merchant_flow_preview_binding_scope_mismatch', 'The preview binding does not match the authoritative flow, artifact, render, shop, or runtime scope.');
  if (requireAcceptedQa && !previewQaAccepted(flow)) throw previewError('merchant_flow_preview_qa_unaccepted', 'The preview binding does not have accepted QA evidence.');
  return value;
}

function createMerchantFlowPreviewBindingFromRenderEvidence({
  flow,
  artifact,
  request,
  captureResult,
  renderChecksum,
  sourceRevision,
  mainThemeId,
  recovery = null,
  root = path.resolve(__dirname, '../..')
} = {}) {
  const results = captureResult?.results || [];
  const manifest = captureResult?.manifest;
  if (!flow || !artifact || !request || manifest?.status !== 'passed' || !results.length || results.some((result) => result.status !== 'passed')) {
    throw previewError('merchant_flow_preview_render_evidence_unaccepted', 'Passed render evidence is required before creating a preview binding.');
  }
  const urls = [...new Set(results.map((result) => safePreviewReference(result?.runtime?.remote_preview_url, request.target?.shop_domain, request.target?.theme_id)).filter(Boolean))];
  if (urls.length !== 1) throw previewError(urls.length > 1 ? 'merchant_flow_preview_reference_ambiguous' : 'merchant_flow_preview_reference_unavailable', 'The accepted render evidence does not contain one safe Shopify preview reference.');
  const expectedResultIds = results.map((result) => result.render_id);
  if (JSON.stringify(expectedResultIds) !== JSON.stringify(manifest.result_references.map((reference) => path.basename(reference, '.json')))) {
    throw previewError('merchant_flow_preview_render_evidence_mismatch', 'The render manifest and results do not identify the same evidence.');
  }
  return createMerchantFlowPreviewBinding({
    organizationId: request.flow.organization_id,
    projectId: request.flow.project_id,
    connectionId: artifact.controlled_runtime_binding?.connection_id || flow.store_context?.connection_id,
    canonicalShop: request.target.shop_domain,
    flowId: request.flow.flow_id,
    flowSequence: request.flow.flow_sequence,
    flowChecksum: request.flow.flow_checksum,
    artifactId: request.generation.artifact.artifact_id,
    artifactChecksum: request.generation.artifact.sha256,
    renderRequestId: request.request_id,
    renderRequestChecksum: digest(request),
    renderEvidenceId: manifest.manifest_id,
    renderEvidenceChecksum: digest(manifest),
    renderRevision: request.render_revision,
    renderResultIds: expectedResultIds,
    renderChecksum,
    developmentThemeId: request.target.theme_id,
    mainThemeId,
    runtimeConfigurationRevision: request.provenance.runtime_configuration_revision,
    renderTargetConfigurationRevision: request.target.configuration_revision,
    sourceRevision: sourceRevision || request.provenance.deployed_source_revision,
    previewUrl: urls[0],
    createdAt: manifest.generated_at,
    verifiedAt: manifest.generated_at,
    recovery,
    root
  });
}

function resolveMerchantFlowPreviewBinding({
  flow,
  explicitBinding = flow?.render_qa?.preview_binding || null,
  legacyCandidates = [],
  context = {},
  root = path.resolve(__dirname, '../..')
} = {}) {
  if (!PREVIEW_READY_STATES.includes(flow?.state)) return Object.freeze({ status: 'not_applicable', source: null, binding: null, preview_url: null, reason_code: 'flow_not_preview_ready' });
  const validate = (candidate) => assertMerchantFlowPreviewBindingForFlow(candidate, { ...context, flow, root });
  if (explicitBinding) {
    try {
      const binding = validate(explicitBinding);
      return Object.freeze({ status: 'available', source: 'explicit_binding', binding, preview_url: binding.preview_reference.url, reason_code: null });
    } catch {
      return Object.freeze({ status: 'needs_attention', source: 'explicit_binding', binding: null, preview_url: null, reason_code: 'explicit_binding_invalid' });
    }
  }
  const valid = [];
  for (const candidate of legacyCandidates) {
    try {
      const binding = validate(candidate);
      if (!valid.some((item) => item.binding_checksum === binding.binding_checksum)) valid.push(binding);
    } catch { /* Fail closed and continue evaluating the bounded candidate set. */ }
  }
  if (valid.length === 1) return Object.freeze({ status: 'available', source: 'legacy_read_only_recovery', binding: valid[0], preview_url: valid[0].preview_reference.url, reason_code: null });
  return Object.freeze({
    status: 'needs_attention', source: null, binding: null, preview_url: null,
    reason_code: valid.length > 1 ? 'legacy_binding_ambiguous' : 'preview_binding_unavailable'
  });
}

module.exports = {
  PREVIEW_BINDING_VERSION,
  PREVIEW_BINDING_SCHEMA,
  PREVIEW_RESOLVER_REVISION,
  PREVIEW_READY_STATES,
  safePreviewReference,
  createMerchantFlowPreviewBinding,
  assertMerchantFlowPreviewBinding,
  assertMerchantFlowPreviewBindingForFlow,
  createMerchantFlowPreviewBindingFromRenderEvidence,
  resolveMerchantFlowPreviewBinding,
  previewQaAccepted
};
