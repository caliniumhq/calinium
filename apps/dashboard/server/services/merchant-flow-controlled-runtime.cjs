'use strict';

const { MerchantFlowStagingRuntime } = require('./merchant-flow-staging-runtime.cjs');
const { digest } = require('../../../../ai/architecture');
const {
  CONTROLLED_BETA_RUNTIME_REVISION,
  CONTROLLED_RENDER_TARGETS_REVISION,
  canonicalThemeId,
  normalizeShopDomain,
  assertControlledBetaRuntimeConfiguration
} = require('./merchant-flow-controlled-runtime-configuration.cjs');

const AUTHORITATIVE_THEME_SOURCE = 'shopify_admin_api';
const MAX_TARGET_VERIFICATION_AGE_MS = 5 * 60 * 1000;
const CONTROLLED_RENDER_BINDING_REVISION = 'merchant-flow-controlled-render-binding-v1';
const CONTROLLED_RUNTIME_SAFETY = Object.freeze({
  fixture_fallback_allowed: false,
  approved_replay_allowed: false,
  automatic_repair_allowed: false,
  automatic_publish_allowed: false,
  shopify_write_allowed: false,
  live_theme_mutation_allowed: false
});

function runtimeError(code, message) {
  return Object.assign(new Error(message), { code, retryable: false });
}

function boundTargetRevision(flow, artifact) {
  return artifact?.controlled_runtime_binding?.render_target_configuration_revision
    || flow?.controlled_runtime_binding?.render_target_configuration_revision
    || null;
}

function renderBindingBase({ configuration, flow, artifact, target }) {
  return {
    schema_version: '2.0',
    binding_revision: CONTROLLED_RENDER_BINDING_REVISION,
    runtime_configuration_revision: configuration.configuration_revision,
    render_target_configuration_revision: configuration.render_target_configuration_revision,
    project_id: String(flow?.project_id || ''),
    organization_id: String(flow?.organization_id || ''),
    connection_id: String(flow?.store_context?.connection_id || ''),
    shop_domain: target.shop_domain,
    theme_id: target.theme_id,
    expected_theme_role: target.expected_theme_role,
    artifact_id: String(artifact?.artifact_id || ''),
    artifact_checksum: String(artifact?.checksum || artifact?.artifact_checksum || '')
  };
}

function bindingChecksum(binding) {
  return digest(binding);
}

function createControlledRenderArtifactBinding({ configuration, flow, artifact }) {
  assertControlledBetaRuntimeConfiguration(configuration);
  const shopDomain = normalizeShopDomain(flow?.store_context?.shop);
  const target = configuration.render_targets.find((candidate) => candidate.shop_domain === shopDomain);
  if (!target || !configuration.controlled_shop_domains.includes(shopDomain)) throw runtimeError('controlled_beta_render_target_missing', 'No controlled render target is configured for this shop.');
  const base = renderBindingBase({ configuration, flow, artifact, target });
  if (!base.project_id || !base.organization_id || !base.connection_id || !base.artifact_id || !/^[a-f0-9]{64}$/.test(base.artifact_checksum)) {
    throw runtimeError('controlled_beta_render_binding_invalid', 'The controlled render artifact cannot be bound to the runtime configuration.');
  }
  const binding = { ...base, binding_checksum: bindingChecksum(base) };
  if (artifact?.controlled_runtime_binding && digest(artifact.controlled_runtime_binding) !== digest(binding)) {
    throw runtimeError('controlled_beta_render_target_revision_stale', 'The controlled render target binding is stale.');
  }
  return { ...artifact, controlled_runtime_binding: binding };
}

function assertControlledRenderArtifactBinding({ configuration, flow, artifact }) {
  const binding = artifact?.controlled_runtime_binding;
  if (!binding || binding.binding_revision !== CONTROLLED_RENDER_BINDING_REVISION
    || binding.runtime_configuration_revision !== configuration.configuration_revision
    || binding.render_target_configuration_revision !== configuration.render_target_configuration_revision) {
    throw runtimeError('controlled_beta_render_target_revision_stale', 'The controlled render target binding is stale.');
  }
  const base = { ...binding };
  delete base.binding_checksum;
  if (binding.binding_checksum !== bindingChecksum(base)) throw runtimeError('controlled_beta_render_binding_invalid', 'The controlled render artifact binding is invalid.');
  const expected = createControlledRenderArtifactBinding({ configuration, flow, artifact: { ...artifact, controlled_runtime_binding: null } }).controlled_runtime_binding;
  if (digest(binding) !== digest(expected)) throw runtimeError('controlled_beta_render_binding_invalid', 'The controlled render artifact binding is invalid.');
  return binding;
}

function suppliedThemeIds(flow, artifact) {
  return [
    artifact?.theme_id,
    artifact?.target_theme_id,
    artifact?.shopify_target?.theme_id,
    flow?.target_theme_id,
    flow?.shopify_target?.theme_id
  ].filter(Boolean).map(canonicalThemeId);
}

function normalizeInspectionTheme(inspection) {
  const theme = inspection?.theme || inspection || {};
  const themeId = canonicalThemeId(theme.remote_id || theme.theme_id || theme.id || theme.remote_gid);
  return {
    theme_id: themeId,
    theme_gid: themeId ? `gid://shopify/OnlineStoreTheme/${themeId}` : null,
    role: String(theme.role || theme.theme_role || '').trim().toLowerCase(),
    processing: theme.processing === true,
    processing_failed: theme.processing_failed === true || theme.processingFailed === true
  };
}

async function inspectThroughShopifyService({ shopifyService, flow, configuredTarget, clock }) {
  const projectId = String(flow?.project_id || '');
  const organizationId = String(flow?.organization_id || '');
  const connectionId = String(flow?.store_context?.connection_id || '');
  if (!projectId || !organizationId || !connectionId) throw runtimeError('controlled_beta_shopify_ownership_unverified', 'The controlled Shopify target ownership could not be verified.');

  if (typeof shopifyService?.inspectControlledRenderTarget === 'function') {
    const inspection = await shopifyService.inspectControlledRenderTarget({
      projectId,
      organizationId,
      connectionId,
      shopDomain: configuredTarget.shop_domain,
      themeId: configuredTarget.theme_id,
      themeGid: configuredTarget.theme_gid
    });
    return inspection;
  }

  const store = shopifyService?.store;
  const adapter = shopifyService?.adapter;
  if (typeof store?.findProjectShopifyConnection !== 'function'
    || typeof shopifyService?.connectionAccess !== 'function'
    || typeof adapter?.listResourcePage !== 'function') {
    throw runtimeError('controlled_beta_shopify_verifier_unavailable', 'The authoritative Shopify target verifier is unavailable.');
  }
  const assignment = await store.findProjectShopifyConnection(projectId, organizationId, connectionId);
  const connection = assignment?.connection;
  if (!connection || String(connection.id) !== connectionId
    || normalizeShopDomain(connection.shop_domain) !== configuredTarget.shop_domain
    || connection.connection_status !== 'ready'
    || connection.credential_status !== 'active') {
    throw runtimeError('controlled_beta_shopify_ownership_unverified', 'The controlled Shopify target ownership could not be verified.');
  }
  const page = await adapter.listResourcePage({
    shopDomain: configuredTarget.shop_domain,
    accessToken: await shopifyService.connectionAccess(connection),
    resourceType: 'theme',
    first: 100
  });
  const theme = (page?.nodes || []).find((candidate) => canonicalThemeId(candidate.id) === configuredTarget.theme_id) || null;
  return {
    authoritative_source: AUTHORITATIVE_THEME_SOURCE,
    fresh: true,
    verified_at: clock().toISOString(),
    shop_domain: connection.shop_domain,
    connection_id: connection.id,
    theme
  };
}

function assertFreshInspection({ inspection, flow, configuredTarget, clock }) {
  if (inspection?.authoritative_source !== AUTHORITATIVE_THEME_SOURCE || inspection?.fresh !== true) {
    throw runtimeError('controlled_beta_shopify_target_unverified', 'The controlled Shopify target was not verified through the authoritative Shopify path.');
  }
  const verifiedAt = Date.parse(String(inspection.verified_at || ''));
  const now = clock().getTime();
  if (!Number.isFinite(verifiedAt) || verifiedAt > now + 30_000 || now - verifiedAt > MAX_TARGET_VERIFICATION_AGE_MS) {
    throw runtimeError('controlled_beta_shopify_target_verification_stale', 'The controlled Shopify target verification is stale.');
  }
  if (normalizeShopDomain(inspection.shop_domain) !== configuredTarget.shop_domain
    || String(inspection.connection_id || '') !== String(flow.store_context.connection_id || '')) {
    throw runtimeError('controlled_beta_shopify_ownership_unverified', 'The controlled Shopify target ownership could not be verified.');
  }
  const theme = normalizeInspectionTheme(inspection);
  if (!theme.theme_id || theme.theme_id !== configuredTarget.theme_id) throw runtimeError('controlled_beta_shopify_theme_mismatch', 'The configured controlled Shopify theme could not be verified.');
  if (theme.role !== configuredTarget.expected_theme_role || theme.role !== 'development') {
    throw runtimeError('controlled_beta_live_theme_target_forbidden', 'The configured Shopify theme is not the approved development target.');
  }
  if (theme.processing || theme.processing_failed) throw runtimeError('controlled_beta_shopify_theme_unavailable', 'The configured controlled Shopify theme is not ready.');
  return theme;
}

function createControlledRenderTargetResolver({ configuration, shopifyService, clock = () => new Date() } = {}) {
  assertControlledBetaRuntimeConfiguration(configuration);
  if (!shopifyService) throw runtimeError('controlled_beta_shopify_verifier_unavailable', 'The authoritative Shopify target verifier is unavailable.');
  const targets = new Map(configuration.render_targets.map((target) => [target.shop_domain, target]));
  return async function resolveControlledRenderTarget({ flow, artifact }) {
    const flowShop = normalizeShopDomain(flow?.store_context?.shop);
    if (!flowShop || !configuration.controlled_shop_domains.includes(flowShop)) {
      throw runtimeError('controlled_beta_shop_not_allowed', 'The merchant flow shop is not approved for the controlled beta.');
    }
    const configuredTarget = targets.get(flowShop);
    if (!configuredTarget) throw runtimeError('controlled_beta_render_target_missing', 'No controlled render target is configured for this shop.');
    const binding = assertControlledRenderArtifactBinding({ configuration, flow, artifact });
    if (boundTargetRevision(flow, artifact) !== CONTROLLED_RENDER_TARGETS_REVISION
      || binding.shop_domain !== configuredTarget.shop_domain
      || binding.theme_id !== configuredTarget.theme_id) throw runtimeError('controlled_beta_render_target_revision_stale', 'The controlled render target binding is stale.');
    const supplied = suppliedThemeIds(flow, artifact);
    if (supplied.some((themeId) => !themeId || themeId !== configuredTarget.theme_id)) {
      throw runtimeError('controlled_beta_shopify_theme_mismatch', 'A merchant-supplied Shopify theme target is not allowed.');
    }
    const inspection = await inspectThroughShopifyService({ shopifyService, flow, configuredTarget, clock });
    const theme = assertFreshInspection({ inspection, flow, configuredTarget, clock });
    return {
      shop: configuredTarget.shop_domain,
      theme_id: theme.theme_id,
      theme_role: theme.role,
      is_live: false
    };
  };
}

function assertEvaluationEvidence(result, kind, allowedStatuses) {
  if (!result || !allowedStatuses.includes(result.status)
    || typeof result.evidence_id !== 'string' || !result.evidence_id
    || typeof result.evidence_checksum !== 'string' || !/^[a-f0-9]{64}$/.test(result.evidence_checksum)) {
    throw runtimeError(`controlled_beta_${kind}_evidence_invalid`, `The controlled ${kind.toUpperCase()} evaluator did not return checksum-bound evidence.`);
  }
  return result;
}

function createControlledMerchantFlowRuntime({
  configuration,
  shopifyService,
  renderArtifact,
  evaluateD1,
  evaluateD27 = null,
  resumeD27 = null,
  validateTerminalD27Recovery = null,
  resolveLegacyD27Lineage = null,
  recoverLegacyD27Failure = null,
  clock = () => new Date()
} = {}) {
  assertControlledBetaRuntimeConfiguration(configuration);
  if (typeof renderArtifact !== 'function') throw runtimeError('controlled_beta_render_runtime_unavailable', 'The controlled Shopify render runtime is unavailable.');
  if (typeof evaluateD1 !== 'function') throw runtimeError('controlled_beta_d1_unavailable', 'The D1 evaluator is unavailable.');
  if (configuration.d2_7.required && typeof evaluateD27 !== 'function') throw runtimeError('controlled_beta_d2_7_provider_unavailable', 'The policy-required D2.7 evaluator is unavailable.');

  const resolveTarget = createControlledRenderTargetResolver({ configuration, shopifyService, clock });
  const context = Object.freeze({
    runtime_revision: CONTROLLED_BETA_RUNTIME_REVISION,
    render_target_configuration_revision: configuration.render_target_configuration_revision,
    d2_7_provider_revision: configuration.d2_7.provider_revision,
    d2_7_model_id: configuration.d2_7.model_id,
    safety: CONTROLLED_RUNTIME_SAFETY
  });
  const runtime = new MerchantFlowStagingRuntime({
    resolveTarget,
    renderArtifact: (input) => renderArtifact({ ...input, controlled_runtime: context }),
    evaluateD1: async (input) => assertEvaluationEvidence(
      await evaluateD1({ ...input, controlled_runtime: context }),
      'd1',
      ['passed', 'review_required', 'failed']
    ),
    evaluateD27: configuration.d2_7.required
      ? async (input) => {
        const result = assertEvaluationEvidence(
          await evaluateD27({ ...input, controlled_runtime: context }),
          'd2_7',
          ['passed', 'accepted', 'review_required', 'failed']
        );
        if (result.status === 'not_required') throw runtimeError('controlled_beta_d2_7_bypass_forbidden', 'Policy-required D2.7 evaluation cannot be skipped.');
        return result;
      }
      : null,
    resumeD27: configuration.d2_7.required && typeof resumeD27 === 'function'
      ? async (input) => assertEvaluationEvidence(
        await resumeD27({ ...input, controlled_runtime: context }),
        'd2_7',
        ['passed', 'accepted', 'review_required', 'failed']
      )
      : null,
    validateTerminalD27Recovery: configuration.d2_7.required && typeof validateTerminalD27Recovery === 'function'
      ? (input) => validateTerminalD27Recovery({ ...input, controlled_runtime: context })
      : null,
    resolveLegacyD27Lineage: configuration.d2_7.required && typeof resolveLegacyD27Lineage === 'function'
      ? (input) => resolveLegacyD27Lineage({ ...input, controlled_runtime: context })
      : null,
    recoverLegacyD27Failure: configuration.d2_7.required && typeof recoverLegacyD27Failure === 'function'
      ? (input) => recoverLegacyD27Failure({ ...input, controlled_runtime: context })
      : null,
    shouldEvaluateD27: () => configuration.d2_7.required
  });
  runtime.runtime_kind = 'production_controlled_shopify_render_qa';
  runtime.runtime_revision = CONTROLLED_BETA_RUNTIME_REVISION;
  runtime.render_target_configuration_revision = configuration.render_target_configuration_revision;
  runtime.safety = CONTROLLED_RUNTIME_SAFETY;
  return runtime;
}

module.exports = {
  AUTHORITATIVE_THEME_SOURCE,
  MAX_TARGET_VERIFICATION_AGE_MS,
  CONTROLLED_RENDER_BINDING_REVISION,
  CONTROLLED_RUNTIME_SAFETY,
  boundTargetRevision,
  createControlledRenderArtifactBinding,
  assertControlledRenderArtifactBinding,
  createControlledRenderTargetResolver,
  createControlledMerchantFlowRuntime
};
