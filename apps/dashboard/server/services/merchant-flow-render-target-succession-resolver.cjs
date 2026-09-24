'use strict';

const crypto = require('crypto');
const {
  assertMerchantGenerationFlow,
  createRenderTargetSuccessionSubmission
} = require('../../../../ai/merchant-flow');
const {
  canonicalThemeId,
  normalizeShopDomain,
  assertControlledBetaRuntimeConfiguration
} = require('./merchant-flow-controlled-runtime-configuration.cjs');
const { createControlledRenderArtifactBinding } = require('./merchant-flow-controlled-runtime.cjs');

const AUTHORITATIVE_THEME_SOURCE = 'shopify_admin_api';
const MAX_VERIFICATION_AGE_MS = 5 * 60 * 1000;
const TARGET_SUCCESSION_RESOLVER_REVISION = 'merchant-flow-render-target-succession-resolver-v1';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }

function resolverError(code, message) {
  return Object.assign(new Error(message), { code, retryable: false });
}

function targetSetChecksum(configuration) {
  return digest({
    render_target_configuration_revision: configuration?.render_target_configuration_revision || null,
    render_targets: (configuration?.render_targets || []).map((target) => ({
      shop_domain: target.shop_domain,
      theme_id: target.theme_id,
      expected_theme_role: target.expected_theme_role
    }))
  });
}

function configuredTargetFor(configuration, flow) {
  const shop = normalizeShopDomain(flow?.store_context?.shop);
  return configuration?.render_targets?.find((target) => target.shop_domain === shop) || null;
}

function successorBindingFor(configuration, flow) {
  const artifact = { ...flow.artifact };
  delete artifact.controlled_runtime_binding;
  return createControlledRenderArtifactBinding({ configuration, flow, artifact }).controlled_runtime_binding;
}

function readinessEvidence(readiness, clock = () => new Date()) {
  const checkedAt = Date.parse(String(readiness?.checked_at || ''));
  const validUntil = Date.parse(String(readiness?.valid_until || ''));
  if (readiness?.status !== 'READY'
    || !/^controlled-readiness-snapshot-[a-f0-9]{20}$/.test(String(readiness.snapshot_id || ''))
    || !/^[a-f0-9]{64}$/.test(String(readiness.snapshot_checksum || ''))
    || !/^[a-f0-9]{64}$/.test(String(readiness.binding_checksum || ''))
    || !readiness.checked_at || !readiness.valid_until
    || !Number.isFinite(checkedAt) || !Number.isFinite(validUntil)
    || validUntil <= clock().getTime()) return null;
  return {
    snapshot_id: readiness.snapshot_id,
    snapshot_checksum: readiness.snapshot_checksum,
    binding_checksum: readiness.binding_checksum,
    status: 'READY',
    checked_at: readiness.checked_at,
    valid_until: readiness.valid_until
  };
}

function normalizeTheme(theme) {
  const themeId = canonicalThemeId(theme?.id || theme?.remote_gid || theme?.theme_id || theme?.remote_id);
  const processingFailed = typeof theme?.processingFailed === 'boolean'
    ? theme.processingFailed
    : typeof theme?.processing_failed === 'boolean'
      ? theme.processing_failed
      : null;
  return themeId && typeof theme?.processing === 'boolean' && processingFailed !== null ? {
    theme_id: themeId,
    theme_gid: `gid://shopify/OnlineStoreTheme/${themeId}`,
    role: String(theme?.role || theme?.theme_role || '').trim().toLowerCase(),
    processing: theme.processing,
    processing_failed: processingFailed
  } : null;
}

function authoritativePageInfo(page) {
  if (!page || typeof page !== 'object' || Array.isArray(page) || page.page_info_explicit === false) {
    throw resolverError('merchant_flow_render_target_succession_inventory_incomplete', 'The authoritative Shopify theme inventory was incomplete.');
  }
  const pageInfo = page.page_info && typeof page.page_info === 'object' && !Array.isArray(page.page_info)
    ? page.page_info
    : page.pageInfo && typeof page.pageInfo === 'object' && !Array.isArray(page.pageInfo)
      ? page.pageInfo
      : null;
  if (!pageInfo || typeof pageInfo.hasNextPage !== 'boolean') {
    throw resolverError('merchant_flow_render_target_succession_inventory_incomplete', 'The authoritative Shopify theme inventory was incomplete.');
  }
  const endCursor = typeof pageInfo.endCursor === 'string' ? pageInfo.endCursor.trim() : '';
  if (pageInfo.hasNextPage && !endCursor) {
    throw resolverError('merchant_flow_render_target_succession_inventory_incomplete', 'The authoritative Shopify theme inventory was incomplete.');
  }
  return { hasNextPage: pageInfo.hasNextPage, endCursor: endCursor || null };
}

async function inspectThroughShopify({ shopifyService, flow, clock }) {
  const projectId = String(flow?.project_id || '');
  const organizationId = String(flow?.organization_id || '');
  const connectionId = String(flow?.store_context?.connection_id || '');
  const shopDomain = normalizeShopDomain(flow?.store_context?.shop);
  if (!projectId || !organizationId || !connectionId || !shopDomain) {
    throw resolverError('merchant_flow_render_target_succession_ownership_unverified', 'The controlled Shopify target ownership could not be verified.');
  }

  if (typeof shopifyService?.inspectControlledThemeInventory === 'function') {
    return shopifyService.inspectControlledThemeInventory({ projectId, organizationId, connectionId, shopDomain });
  }

  const store = shopifyService?.store;
  const adapter = shopifyService?.adapter;
  if (typeof store?.findProjectShopifyConnection !== 'function'
    || typeof shopifyService?.connectionAccess !== 'function'
    || typeof adapter?.listResourcePage !== 'function') {
    throw resolverError('merchant_flow_render_target_succession_verifier_unavailable', 'The authoritative Shopify target verifier is unavailable.');
  }
  const assignment = await store.findProjectShopifyConnection(projectId, organizationId, connectionId);
  const connection = assignment?.connection;
  if (!connection || String(connection.id) !== connectionId
    || normalizeShopDomain(connection.shop_domain) !== shopDomain
    || connection.connection_status !== 'ready'
    || connection.credential_status !== 'active') {
    throw resolverError('merchant_flow_render_target_succession_ownership_unverified', 'The controlled Shopify target ownership could not be verified.');
  }
  const accessToken = await shopifyService.connectionAccess(connection);
  const themes = [];
  let after = null;
  let complete = false;
  for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
    const page = await adapter.listResourcePage({
      shopDomain,
      accessToken,
      resourceType: 'theme',
      first: 100,
      after
    });
    themes.push(...(page?.nodes || []));
    const pageInfo = authoritativePageInfo(page);
    if (!pageInfo.hasNextPage) { complete = true; break; }
    after = pageInfo.endCursor;
  }
  if (!complete) throw resolverError('merchant_flow_render_target_succession_inventory_incomplete', 'The authoritative Shopify theme inventory was incomplete.');
  return {
    authoritative_source: AUTHORITATIVE_THEME_SOURCE,
    fresh: true,
    complete: true,
    verified_at: clock().toISOString(),
    shop_domain: connection.shop_domain,
    connection_id: connection.id,
    themes
  };
}

function assertInventory({ inventory, flow, configuredTarget, oldBinding, mainThemeId, clock }) {
  if (inventory?.authoritative_source !== AUTHORITATIVE_THEME_SOURCE
    || inventory?.fresh !== true
    || inventory?.complete !== true) {
    throw resolverError('merchant_flow_render_target_succession_target_unverified', 'The controlled Shopify themes were not verified through the authoritative Shopify path.');
  }
  const verifiedAt = Date.parse(String(inventory.verified_at || ''));
  const now = clock().getTime();
  if (!Number.isFinite(verifiedAt) || verifiedAt > now + 30_000 || now - verifiedAt > MAX_VERIFICATION_AGE_MS) {
    throw resolverError('merchant_flow_render_target_succession_verification_stale', 'The controlled Shopify theme verification is stale.');
  }
  if (normalizeShopDomain(inventory.shop_domain) !== configuredTarget.shop_domain
    || String(inventory.connection_id || '') !== String(flow.store_context.connection_id || '')) {
    throw resolverError('merchant_flow_render_target_succession_ownership_unverified', 'The controlled Shopify target ownership could not be verified.');
  }
  const rawThemes = Array.isArray(inventory.themes) ? inventory.themes : [];
  const themes = rawThemes.map(normalizeTheme);
  if (themes.some((theme) => !theme)) {
    throw resolverError('merchant_flow_render_target_succession_inventory_invalid', 'The authoritative Shopify theme inventory contained an invalid theme identity.');
  }
  themes.sort((left, right) => left.theme_id.length - right.theme_id.length
    || (left.theme_id < right.theme_id ? -1 : left.theme_id > right.theme_id ? 1 : 0));
  if (new Set(themes.map((theme) => theme.theme_id)).size !== themes.length) {
    throw resolverError('merchant_flow_render_target_succession_inventory_invalid', 'The authoritative Shopify theme inventory contained a duplicate theme identity.');
  }
  if (themes.some((theme) => theme.theme_id === oldBinding.theme_id)) {
    throw resolverError('merchant_flow_render_target_succession_old_target_present', 'The superseded Shopify development theme is still present.');
  }
  const successor = themes.find((theme) => theme.theme_id === configuredTarget.theme_id) || null;
  if (!successor || successor.role !== 'development' || successor.processing || successor.processing_failed) {
    throw resolverError('merchant_flow_render_target_succession_new_target_invalid', 'The successor Shopify target is not a ready development theme.');
  }
  const canonicalMainThemeId = canonicalThemeId(mainThemeId);
  const main = themes.find((theme) => theme.theme_id === canonicalMainThemeId) || null;
  if (!canonicalMainThemeId || !main || main.role !== 'main'
    || successor.theme_id === canonicalMainThemeId || oldBinding.theme_id === canonicalMainThemeId) {
    throw resolverError('merchant_flow_render_target_succession_main_exclusion_failed', 'MAIN theme exclusion could not be verified.');
  }
  const authorityBase = (themeId, status) => ({
    authoritative_source: AUTHORITATIVE_THEME_SOURCE,
    status,
    shop_domain: configuredTarget.shop_domain,
    connection_id: String(flow.store_context.connection_id),
    theme_id: themeId,
    theme_gid: `gid://shopify/OnlineStoreTheme/${themeId}`,
    checked_at: inventory.verified_at
  });
  const priorBase = authorityBase(oldBinding.theme_id, 'not_found');
  const successorBase = {
    ...authorityBase(successor.theme_id, 'verified'),
    theme_role: successor.role,
    processing: false,
    processing_failed: false
  };
  const inventoryBase = {
    authoritative_source: AUTHORITATIVE_THEME_SOURCE,
    completeness: 'complete',
    shop_domain: configuredTarget.shop_domain,
    connection_id: String(flow.store_context.connection_id),
    checked_at: inventory.verified_at,
    theme_count: themes.length,
    inventory_checksum: digest(themes)
  };
  const mainBase = {
    ...authorityBase(main.theme_id, 'verified'),
    theme_role: 'main',
    processing: main.processing,
    processing_failed: main.processing_failed
  };
  return Object.freeze({
    prior_authority: { ...priorBase, evidence_checksum: digest(priorBase) },
    successor_authority: { ...successorBase, evidence_checksum: digest(successorBase) },
    shopify_inventory: { ...inventoryBase, evidence_checksum: digest(inventoryBase) },
    main_authority: { ...mainBase, evidence_checksum: digest(mainBase) },
    main_target: { theme_id: main.theme_id, theme_gid: main.theme_gid, role: main.role },
    inventory_checksum: inventoryBase.inventory_checksum
  });
}

function createMerchantFlowRenderTargetSuccessionResolver({
  root,
  configuration,
  shopifyService,
  mainThemeId,
  sourceRevision,
  clock = () => new Date()
} = {}) {
  if (!root || !shopifyService) throw resolverError('merchant_flow_render_target_succession_verifier_unavailable', 'Render-target succession requires repository and Shopify authority.');
  assertControlledBetaRuntimeConfiguration(configuration);
  const renderTargetSetChecksum = targetSetChecksum(configuration);
  const source = Object.freeze({
    source_revision: sourceRevision,
    build_revision: sourceRevision,
    runtime_configuration_revision: configuration.configuration_revision,
    render_target_configuration_revision: configuration.render_target_configuration_revision,
    configuration_checksum: renderTargetSetChecksum
  });

  function prepare({ flow, readiness = null } = {}) {
    let current;
    try { current = assertMerchantGenerationFlow(flow, root); }
    catch { return { contract_version: 'merchant-flow-render-target-succession-submission-v1', available: false, reason_code: 'flow_invalid' }; }
    const oldBinding = current.artifact?.controlled_runtime_binding;
    const configuredTarget = configuredTargetFor(configuration, current);
    const boundReadiness = readinessEvidence(readiness, clock);
    if (current.state !== 'preview_ready' || !oldBinding || !configuredTarget) {
      return { contract_version: 'merchant-flow-render-target-succession-submission-v1', available: false, reason_code: 'not_eligible' };
    }
    if (oldBinding.theme_id === configuredTarget.theme_id) {
      return { contract_version: 'merchant-flow-render-target-succession-submission-v1', available: false, reason_code: 'target_current' };
    }
    if (configuredTarget.expected_theme_role !== 'development'
      || canonicalThemeId(mainThemeId) === configuredTarget.theme_id
      || canonicalThemeId(mainThemeId) === oldBinding.theme_id
      || !/^[a-f0-9]{40}$/.test(String(sourceRevision || ''))
      || !boundReadiness) {
      return { contract_version: 'merchant-flow-render-target-succession-submission-v1', available: false, reason_code: 'authority_invalid' };
    }
    const successorBinding = successorBindingFor(configuration, current);
    return {
      contract_version: 'merchant-flow-render-target-succession-submission-v1',
      available: true,
      reason_code: null,
      request: createRenderTargetSuccessionSubmission({
        flow: current,
        priorBinding: oldBinding,
        successorBinding,
        readiness: boundReadiness,
        source
      })
    };
  }

  async function verify({ flow, readiness = null } = {}) {
    const current = assertMerchantGenerationFlow(flow, root);
    const prepared = prepare({ flow: current, readiness });
    if (!prepared.available) throw resolverError('merchant_flow_render_target_succession_not_eligible', 'Render-target succession is not eligible for this flow.');
    const oldBinding = current.artifact.controlled_runtime_binding;
    const configuredTarget = configuredTargetFor(configuration, current);
    const inventory = await inspectThroughShopify({ shopifyService, flow: current, clock });
    return {
      prepared,
      configured_target: configuredTarget,
      successor_binding: successorBindingFor(configuration, current),
      target_set_checksum: renderTargetSetChecksum,
      verification: assertInventory({ inventory, flow: current, configuredTarget, oldBinding, mainThemeId, clock }),
      source,
      readiness: readinessEvidence(readiness, clock),
      resolver_revision: TARGET_SUCCESSION_RESOLVER_REVISION
    };
  }

  return Object.freeze({
    resolver_revision: TARGET_SUCCESSION_RESOLVER_REVISION,
    target_set_checksum: renderTargetSetChecksum,
    prepare,
    verify
  });
}

module.exports = {
  AUTHORITATIVE_THEME_SOURCE,
  TARGET_SUCCESSION_RESOLVER_REVISION,
  targetSetChecksum,
  configuredTargetFor,
  successorBindingFor,
  readinessEvidence,
  normalizeTheme,
  authoritativePageInfo,
  inspectThroughShopify,
  assertInventory,
  createMerchantFlowRenderTargetSuccessionResolver
};
