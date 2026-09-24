'use strict';

const fs = require('fs');
const path = require('path');
const { digest } = require('../../../../ai/storefront-render/contracts');
const { loadExistingMerchantRender } = require('../../../../ai/storefront-render/merchant-flow-capture');
const { assertMerchantFlowD1Evaluation } = require('../../../../ai/visual-evaluation/merchant-flow-d1');
const { assertMerchantFlowD27Evaluation } = require('../../../../ai/design-evaluation/merchant-flow-d2-7');
const { renderEvidenceChecksum } = require('../../../../ai/design-evaluation/merchant-flow-production-qa-adapter');
const {
  PREVIEW_RESOLVER_REVISION,
  createMerchantFlowPreviewBindingFromRenderEvidence,
  resolveMerchantFlowPreviewBinding
} = require('../../../../ai/merchant-flow/merchant-flow-preview-binding');
const {
  PREVIEW_PROVENANCE_RECOVERY_VERSION,
  PREVIEW_PROVENANCE_RECOVERY_RESOLVER_REVISION,
  PREVIEW_PROVENANCE_RECOVERY_SUBMISSION_VERSION,
  createMerchantFlowPreviewProvenanceRecovery,
  resolveMerchantFlowPreviewProvenanceRecovery,
  previewProvenanceRecoveryIdempotencyKey
} = require('../../../../ai/merchant-flow/merchant-flow-preview-provenance-recovery');
const {
  normalizeShopDomain,
  canonicalThemeId
} = require('./merchant-flow-controlled-runtime-configuration.cjs');

const SOURCE_REVISION = /^[a-f0-9]{40}$/;

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function renderTargetIsSuperseded({ flow, canonicalShop, renderTargets }) {
  const artifactTarget = flow?.artifact?.controlled_runtime_binding;
  const shop = normalizeShopDomain(canonicalShop || flow?.store_context?.shop);
  if (!artifactTarget || !shop || normalizeShopDomain(artifactTarget.shop_domain) !== shop) return false;
  const configuredTarget = (Array.isArray(renderTargets) ? renderTargets : [])
    .find((target) => normalizeShopDomain(target?.shop_domain) === shop);
  const artifactThemeId = canonicalThemeId(artifactTarget.theme_id);
  const configuredThemeId = canonicalThemeId(configuredTarget?.theme_id);
  return Boolean(artifactThemeId && configuredThemeId && artifactThemeId !== configuredThemeId);
}

function selectedLegacyCandidate(flow) {
  const resolution = flow?.render_qa?.legacy_lineage_resolution;
  const selectedId = resolution?.selection?.selected_candidate_id;
  return selectedId ? resolution.candidates?.find((candidate) => candidate.candidate_id === selectedId) || null : null;
}

function legacySourceRevisions(flow, request) {
  const selected = selectedLegacyCandidate(flow);
  const candidates = [
    request?.provenance?.deployed_source_revision,
    selected?.render?.request_id === request?.request_id ? selected?.provenance?.deployed_source_revision : null,
    flow?.render_qa?.d2_7_failure?.binding?.render_request_id === request?.request_id
      ? flow.render_qa.d2_7_failure.binding.deployed_source_revision
      : null
  ];
  return [...new Set(candidates.filter((value) => SOURCE_REVISION.test(String(value || ''))).map(String))];
}

function legacySourceRevisionStatus(flow, request) {
  const selected = selectedLegacyCandidate(flow);
  const candidates = [
    request?.provenance?.deployed_source_revision,
    selected?.render?.request_id === request?.request_id ? selected?.provenance?.deployed_source_revision : null,
    flow?.render_qa?.d2_7_failure?.binding?.render_request_id === request?.request_id
      ? flow.render_qa.d2_7_failure.binding.deployed_source_revision
      : null
  ].filter((value) => value !== null && value !== undefined && String(value) !== '');
  const revisions = legacySourceRevisions(flow, request);
  if (candidates.some((value) => !SOURCE_REVISION.test(String(value)))) return 'invalid';
  if (revisions.length > 1) return 'conflict';
  return revisions.length === 1 ? 'exact' : 'unavailable';
}

function legacySourceRevision(flow, request) {
  const revisions = legacySourceRevisions(flow, request);
  return revisions.length === 1 ? revisions[0] : null;
}

function acceptedGateEvidenceMatches({ root, directory, flow }) {
  try {
    const d1 = assertMerchantFlowD1Evaluation(readJson(path.join(directory, 'd1-evaluation.json')), root);
    if (d1.status !== 'passed' || d1.evidence_id !== flow.render_qa?.d1?.evidence_id
      || digest(d1) !== flow.render_qa?.d1?.evidence_checksum) return false;
    const d27Binding = flow.render_qa?.d2_7;
    if (d27Binding?.status === 'not_required') return true;
    if (!d27Binding?.evidence_id || !d27Binding?.evidence_checksum) return false;
    const d27 = assertMerchantFlowD27Evaluation(readJson(path.join(directory, 'd2-7-evaluation.json')), root);
    return d27.evidence_id === d27Binding.evidence_id && digest(d27) === d27Binding.evidence_checksum;
  } catch {
    return false;
  }
}

function defaultLegacyEvidenceLoader({ root, flow }) {
  const renderRoot = path.resolve(root, 'output', 'merchant-flow-storefront-renders');
  if (!fs.existsSync(renderRoot) || !flow?.artifact?.controlled_runtime_binding || !flow?.render_qa) return [];
  const candidates = [];
  const selected = selectedLegacyCandidate(flow);
  const directories = fs.readdirSync(renderRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(renderRoot, entry.name))
    .sort();
  for (const directory of directories) {
    let request;
    try { request = readJson(path.join(directory, 'render-request.json')); }
    catch { continue; }
    if (selected?.render?.request_id && request.request_id !== selected.render.request_id) continue;
    if (request.flow?.flow_id !== flow.flow_id || request.flow?.project_id !== flow.project_id
      || request.flow?.organization_id !== flow.organization_id
      || request.generation?.artifact?.artifact_id !== flow.artifact.artifact_id
      || request.generation?.artifact?.sha256 !== flow.artifact.checksum) continue;
    try {
      const captureResult = loadExistingMerchantRender({ root, request });
      const renderChecksum = renderEvidenceChecksum(request, captureResult);
      const resultIds = captureResult.results.map((result) => result.render_id);
      const runtime = flow.artifact.controlled_runtime_binding;
      if (renderChecksum !== flow.render_qa.render_checksum
        || JSON.stringify(resultIds) !== JSON.stringify(flow.render_qa.render_result_ids)
        || request.target?.shop_domain !== runtime.shop_domain
        || request.target?.theme_id !== runtime.theme_id
        || request.target?.expected_theme_role !== 'development'
        || request.target?.configuration_revision !== runtime.render_target_configuration_revision
        || request.provenance?.runtime_configuration_revision !== runtime.runtime_configuration_revision
        || !acceptedGateEvidenceMatches({ root, directory, flow })) continue;
      const urls = [...new Set(captureResult.results.map((result) => result?.runtime?.remote_preview_url).filter(Boolean))];
      if (urls.length !== 1) continue;
      candidates.push({
        request,
        request_checksum: digest(request),
        manifest: captureResult.manifest,
        manifest_checksum: digest(captureResult.manifest),
        capture_result: captureResult,
        render_checksum: renderChecksum,
        preview_url: urls[0],
        source_revisions: legacySourceRevisions(flow, request),
        source_revision_status: legacySourceRevisionStatus(flow, request)
      });
    } catch { /* Invalid or partial retained evidence is never projected. */ }
  }
  return candidates;
}

function defaultLegacyCandidateLoader({ root, flow, mainThemeId, evidenceCandidates = null }) {
  const candidates = [];
  for (const evidence of evidenceCandidates || defaultLegacyEvidenceLoader({ root, flow })) {
    if (evidence.source_revisions.length !== 1) continue;
    try {
      candidates.push(createMerchantFlowPreviewBindingFromRenderEvidence({
        flow,
        artifact: flow.artifact,
        request: evidence.request,
        captureResult: evidence.capture_result,
        renderChecksum: evidence.render_checksum,
        sourceRevision: evidence.source_revisions[0],
        mainThemeId,
        recovery: {
          kind: 'legacy_read_only',
          reason: 'legacy_flow_missing_preview_binding',
          resolver_revision: PREVIEW_RESOLVER_REVISION
        },
        root
      }));
    } catch { /* Invalid or partial retained evidence is never projected. */ }
  }
  return candidates;
}

function createMerchantFlowPreviewBindingResolver({
  root,
  mainThemeId = null,
  runtimeConfigurationRevision = null,
  renderTargetConfigurationRevision = null,
  sourceRevision = null,
  renderTargets = [],
  legacyCandidateLoader = defaultLegacyCandidateLoader,
  legacyEvidenceLoader = defaultLegacyEvidenceLoader
} = {}) {
  if (!root) throw new Error('Merchant-flow preview resolution requires the repository root.');
  return Object.freeze({
    resolver_revision: PREVIEW_RESOLVER_REVISION,
    provenance_recovery_resolver_revision: PREVIEW_PROVENANCE_RECOVERY_RESOLVER_REVISION,
    resolve({ flow, project = null, canonicalShop = null, connectionId = null, provenanceRecoveries = [] } = {}) {
      if (renderTargetIsSuperseded({ flow, canonicalShop, renderTargets })) {
        return Object.freeze({
          status: 'needs_attention', source: null, binding: null, recovery: null, preview_url: null,
          reason_code: 'render_target_superseded'
        });
      }
      const evidenceCandidates = flow?.render_qa?.preview_binding ? [] : legacyEvidenceLoader({ root, flow });
      if (evidenceCandidates.some((candidate) => candidate.source_revision_status === 'conflict' || candidate.source_revisions.length > 1)) {
        return Object.freeze({ status: 'needs_attention', source: null, binding: null, recovery: null, preview_url: null, reason_code: 'source_revision_conflict' });
      }
      if (evidenceCandidates.some((candidate) => candidate.source_revision_status === 'invalid')) {
        return Object.freeze({ status: 'needs_attention', source: null, binding: null, recovery: null, preview_url: null, reason_code: 'source_revision_invalid' });
      }
      const legacyCandidates = flow?.render_qa?.preview_binding ? [] : legacyCandidateLoader({ root, flow, mainThemeId, evidenceCandidates });
      const bindingResolution = resolveMerchantFlowPreviewBinding({
        flow,
        legacyCandidates,
        context: {
          project,
          canonicalShop,
          connectionId,
          mainThemeId,
          runtimeConfigurationRevision,
          renderTargetConfigurationRevision
        },
        root
      });
      if (bindingResolution.status === 'available' || flow?.render_qa?.preview_binding) return bindingResolution;
      const recoveryResolution = resolveMerchantFlowPreviewProvenanceRecovery({
        records: provenanceRecoveries,
        context: { flow, project, canonicalShop, connectionId, mainThemeId, validatedEvidence: evidenceCandidates, root }
      });
      if (recoveryResolution.status !== 'available') return Object.freeze({
        status: 'needs_attention', source: null, binding: null, recovery: null, preview_url: null,
        reason_code: recoveryResolution.reason_code
      });
      return Object.freeze({
        status: 'available', source: 'legacy_provenance_recovery', binding: null,
        recovery: recoveryResolution.record,
        preview_url: recoveryResolution.record.preview_reference.url,
        reason_code: null
      });
    },
    prepareRecovery({ flow, project = null, canonicalShop = null, connectionId = null, provenanceRecoveries = [] } = {}) {
      const resolved = this.resolve({ flow, project, canonicalShop, connectionId, provenanceRecoveries });
      if (resolved.status === 'available') return { contract_version: PREVIEW_PROVENANCE_RECOVERY_SUBMISSION_VERSION, available: false };
      if (!SOURCE_REVISION.test(String(sourceRevision || '')) || resolved.reason_code !== 'source_revision_unavailable') {
        return { contract_version: PREVIEW_PROVENANCE_RECOVERY_SUBMISSION_VERSION, available: false };
      }
      const evidenceCandidates = legacyEvidenceLoader({ root, flow });
      if (evidenceCandidates.length !== 1 || evidenceCandidates[0].source_revision_status !== 'unavailable' || evidenceCandidates[0].source_revisions.length !== 0) {
        return { contract_version: PREVIEW_PROVENANCE_RECOVERY_SUBMISSION_VERSION, available: false };
      }
      return {
        contract_version: PREVIEW_PROVENANCE_RECOVERY_SUBMISSION_VERSION,
        available: true,
        request: {
          contract_version: PREVIEW_PROVENANCE_RECOVERY_SUBMISSION_VERSION,
          idempotency_key: previewProvenanceRecoveryIdempotencyKey({ flow, evidence: evidenceCandidates[0], recoverySourceRevision: sourceRevision })
        }
      };
    },
    createRecovery({ flow, project, canonicalShop, connectionId, operator, request, provenanceRecoveries = [], createdAt } = {}) {
      const prepared = this.prepareRecovery({ flow, project, canonicalShop, connectionId, provenanceRecoveries });
      const keys = Object.keys(request || {}).sort();
      if (!prepared.available) {
        const error = new Error('Preview provenance recovery is not eligible for the current flow.');
        error.code = 'merchant_flow_preview_provenance_recovery_not_eligible';
        throw error;
      }
      if (keys.join(',') !== 'contract_version,idempotency_key'
        || request.contract_version !== PREVIEW_PROVENANCE_RECOVERY_SUBMISSION_VERSION) {
        const error = new Error('Preview provenance recovery request is unavailable, stale, or invalid.');
        error.code = 'merchant_flow_preview_provenance_recovery_request_invalid';
        throw error;
      }
      if (request.idempotency_key !== prepared.request.idempotency_key) {
        const error = new Error('Preview provenance recovery request is stale.');
        error.code = 'merchant_flow_preview_provenance_recovery_stale';
        throw error;
      }
      const evidenceCandidates = legacyEvidenceLoader({ root, flow });
      return createMerchantFlowPreviewProvenanceRecovery({
        flow, project, connectionId, canonicalShop, evidence: evidenceCandidates[0], mainThemeId,
        recoverySourceRevision: sourceRevision, operator, createdAt, root
      });
    }
  });
}

function merchantSafePreview(resolution) {
  if (resolution?.status !== 'available' || !resolution.preview_url) return null;
  return Object.freeze({ status: 'ready', preview_url: resolution.preview_url });
}

module.exports = {
  legacySourceRevision,
  legacySourceRevisions,
  legacySourceRevisionStatus,
  acceptedGateEvidenceMatches,
  defaultLegacyEvidenceLoader,
  defaultLegacyCandidateLoader,
  createMerchantFlowPreviewBindingResolver,
  merchantSafePreview
};
