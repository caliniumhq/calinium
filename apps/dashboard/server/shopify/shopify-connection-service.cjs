'use strict';

const { createId, hashToken } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { isoNow } = require('../lib/serialization.cjs');
const { credentialEnvelopeFromEnv } = require('./credential-envelope.cjs');
const { ShopifyAdminApiAdapter } = require('./admin-api-adapter.cjs');
const { normalizeResourceNodes, resource, themePreviewEligibility } = require('./resource-normalizer.cjs');
const { normalizeShopDomain, oauthConfiguration, createOAuthState, verifyStateNonce, oauthAuthorizationUrl, embeddedAdminAppUrl, verifyShopifyHmac, validateCallbackTimestamp, OAUTH_STATE_TTL_MS } = require('./oauth.cjs');
const { DISCOVERY_SCOPES, DEPLOYMENT_SCOPES, SELECTABLE_RESOURCE_TYPES, requestedScopes, API_VERSION, WEBHOOK_API_VERSION } = require('./constants.cjs');
const { ShopifyWebhookService } = require('./webhook-service.cjs');
const { assertShopAllowed } = require('./runtime-configuration.cjs');

const SYNC_TYPES = Object.freeze(['product', 'collection', 'menu', 'file', 'market', 'theme']);
const RESOURCE_TYPE_BY_FIELD = Object.freeze({ product: ['product'], collection: ['collection'], menu: ['menu'], image: ['file', 'product_media'], video: ['file', 'product_media'], theme: ['theme'] });

function nowPlus(clock, duration) { return new Date(clock().getTime() + duration).toISOString(); }
function unique(values) { return [...new Set(values)].sort(); }
function missingScopes(required, granted) { const current = new Set(granted || []); return required.filter((scope) => !current.has(scope)); }
function unexpectedScopes(granted) { return unique((granted || []).filter((scope) => !DISCOVERY_SCOPES.includes(scope))); }
function publicConnection(connection) {
  return connection && {
    version: connection.version,
    id: connection.id,
    shop_domain: connection.shop_domain,
    display_name: connection.display_name,
    storefront_url: connection.storefront_url,
    primary_market: connection.primary_market && { name: connection.primary_market.name || null, enabled: Boolean(connection.primary_market.enabled), primary_domain: connection.primary_market.primary_domain || null },
    connection_status: connection.connection_status,
    granted_scopes: unique(connection.granted_scopes || []),
    health: { status: connection.health?.status || 'unknown', missing_scopes: connection.health?.missing_scopes || [], unexpected_scopes: connection.health?.unexpected_scopes || [], checked_at: connection.health?.checked_at || null, message: connection.health?.message || null, last_failed_sync_at: connection.health?.last_failed_sync_at || null, webhook_status: connection.health?.webhook_status || 'not_received', admin_api_version: connection.health?.admin_api_version || API_VERSION, webhook_api_version: connection.health?.webhook_api_version || WEBHOOK_API_VERSION },
    last_synced_at: connection.last_synced_at,
    connected_at: connection.connected_at,
    disconnected_at: connection.disconnected_at,
    created_at: connection.created_at,
    updated_at: connection.updated_at
  };
}
function publicResourceEntry(entry) {
  const item = entry.resource;
  return {
    resource: {
      version: item.version,
      id: item.id,
      resource_type: item.resource_type,
      display_title: item.display_title,
      handle: item.handle,
      resource_status: item.resource_status,
      preview_url: item.preview_url,
      remote_updated_at: item.remote_updated_at,
      last_synced_at: item.last_synced_at,
      availability_status: item.availability_status,
      approval_eligible: item.approval_eligible,
      ...(item.resource_type === 'theme' ? { preview_eligibility: item.metadata?.preview_eligibility || 'missing-theme' } : {})
    },
    approval: entry.approval && {
      version: entry.approval.version,
      approval_status: entry.approval.approval_status,
      merchant_note: entry.approval.merchant_note,
      approved_at: entry.approval.approved_at,
      rejected_at: entry.approval.rejected_at,
      revoked_at: entry.approval.revoked_at,
      updated_at: entry.approval.updated_at
    }
  };
}
function publicPreview(preview) {
  return preview && { version: preview.version, id: preview.id, theme_name: preview.theme_name, theme_role: preview.theme_role, preview_url: preview.preview_url, status: preview.status, generated_build_id: preview.generated_build_id, created_at: preview.created_at, updated_at: preview.updated_at };
}
function safeFailure(error) { return error instanceof DashboardError ? error.code : 'shopify_api_unavailable'; }

class ShopifyConnectionService {
  constructor({ store, projectService, adapter = new ShopifyAdminApiAdapter(), envelope = null, webhookService = null, authoritativeObjectService = null, env = process.env, clock = () => new Date() }) {
    this.store = store; this.projectService = projectService; this.adapter = adapter; this.env = env; this.clock = clock; this.envelope = envelope;
    this.webhooks = webhookService || new ShopifyWebhookService({ store, env, clock, authoritativeObjectService });
  }
  now() { return isoNow(this.clock); }
  credentialEnvelope() { return this.envelope || credentialEnvelopeFromEnv(this.env); }
  async authorize({ userId, projectId, permission = 'project:view' }) {
    const project = await this.store.findProjectById(projectId);
    if (!project) throw new DashboardError('project_not_found', 'Project not found.', 404);
    await this.projectService.requireMembership(project.organization_id, userId, permission);
    return project;
  }
  async activity(project, userId, type, payload = {}) { await this.store.createActivity({ id: createId('act'), organization_id: project.organization_id, project_id: project.id, actor_user_id: userId, type, payload, created_at: this.now() }); }

  async startConnection({ userId, projectId, shopDomain, purpose = 'discovery', embeddedHost = null }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    assert(purpose === 'discovery', 'shopify_deployment_scope_deferred', 'Shopify deployment permissions are not requested during store connection.', 409);
    const config = oauthConfiguration(this.env);
    this.credentialEnvelope();
    const normalizedDomain = normalizeShopDomain(shopDomain);
    assertShopAllowed(normalizedDomain, this.env);
    // This value originates from App Bridge's initial frame URL. Validate it
    // against the intended shop before persisting so it can never become an
    // open redirect after OAuth completes.
    const verifiedEmbeddedHost = embeddedAdminAppUrl({ host: embeddedHost, clientId: config.clientId, shopDomain: normalizedDomain, projectId: project.id }) ? String(embeddedHost) : null;
    const existing = await this.store.findShopifyConnectionByDomain(normalizedDomain);
    if (existing && existing.organization_id !== project.organization_id) throw new DashboardError('shopify_store_unavailable', 'This Shopify store cannot be connected to this workspace.', 403);
    const state = createOAuthState();
    const at = this.now(); const scopes = requestedScopes(purpose);
    await this.store.createShopifyOAuthState({ id: createId('sos'), organization_id: project.organization_id, project_id: project.id, created_by_user_id: userId, shop_domain: normalizedDomain, state_hash: state.state_hash, nonce_hash: state.nonce_hash, requested_scopes: scopes, purpose, embedded_host: verifiedEmbeddedHost, expires_at: nowPlus(this.clock, OAUTH_STATE_TTL_MS), created_at: at });
    await this.activity(project, userId, 'shopify_connection_started', { purpose });
    return { shop_domain: normalizedDomain, purpose, authorization_url: oauthAuthorizationUrl({ shopDomain: normalizedDomain, clientId: config.clientId, redirectUri: config.redirectUri, scopes, state: state.state, managedInstallation: config.managedInstallation }), expires_at: nowPlus(this.clock, OAUTH_STATE_TTL_MS) };
  }

  async completeOAuthCallback({ query }) {
    const parameters = query instanceof URLSearchParams ? query : new URLSearchParams(query || {});
    const config = oauthConfiguration(this.env);
    const shopDomain = normalizeShopDomain(parameters.get('shop'));
    assertShopAllowed(shopDomain, this.env);
    const code = String(parameters.get('code') || '');
    const state = String(parameters.get('state') || '');
    assert(code, 'shopify_oauth_code_missing', 'Shopify did not return a connection code. Start again from your project.', 422);
    verifyShopifyHmac(parameters, config.clientSecret);
    validateCallbackTimestamp(parameters.get('timestamp'), this.clock().getTime());
    const stateHash = hashToken(state);
    const pending = await this.store.findPendingShopifyOAuthState(stateHash, this.now());
    if (!pending) throw new DashboardError('shopify_oauth_state_invalid', 'This Shopify connection link is no longer valid. Start again from your project.', 403);
    verifyStateNonce(state, pending);
    assert(pending.shop_domain === shopDomain, 'shopify_oauth_shop_mismatch', 'The Shopify store does not match the connection you started.', 403);
    const envelope = this.credentialEnvelope();
    const consumed = await this.store.consumeShopifyOAuthState(stateHash, this.now());
    if (!consumed) throw new DashboardError('shopify_oauth_state_invalid', 'This Shopify connection link has already been used. Start again from your project.', 403);
    let token;
    try { token = await this.adapter.exchangeCode({ shopDomain, code, clientId: config.clientId, clientSecret: config.clientSecret }); }
    catch (error) { throw new DashboardError('shopify_token_exchange_failed', 'Shopify could not complete the connection. Try again from your project.', 502); }
    const accessToken = String(token?.access_token || '');
    assert(accessToken, 'shopify_token_exchange_failed', 'Shopify could not complete the connection. Try again from your project.', 502);
    let inspected;
    try { inspected = await this.adapter.inspectConnection({ shopDomain, accessToken }); }
    catch { throw new DashboardError('shopify_identity_unverified', 'Calinium could not verify this Shopify store. Try again.', 502); }
    const identityDomain = inspected?.shop?.myshopify_domain;
    assert(inspected?.shop?.id && identityDomain && normalizeShopDomain(identityDomain) === shopDomain, 'shopify_identity_unverified', 'Calinium could not verify this Shopify store. Try again.', 502);
    const granted = unique(inspected.scopes?.length ? inspected.scopes : token.scopes || []);
    const missing = missingScopes(consumed.requested_scopes, granted);
    const existing = await this.store.findShopifyConnectionByDomain(shopDomain);
    if (existing && existing.organization_id !== consumed.organization_id) throw new DashboardError('shopify_store_unavailable', 'This Shopify store cannot be connected to this workspace.', 403);
    const at = this.now();
    const record = {
      id: existing?.id || createId('shc'), organization_id: consumed.organization_id, shop_domain: shopDomain, shop_gid: inspected.shop.id, display_name: inspected.shop.name, storefront_url: inspected.shop.storefront_url, primary_market: null,
      granted_scopes: granted, connection_status: missing.length ? 'reauthorization_required' : 'sync_required', credential_status: 'active',
      health: { status: missing.length ? 'missing_scopes' : 'healthy', missing_scopes: missing, unexpected_scopes: unexpectedScopes(granted), checked_at: at, webhook_status: 'not_received', admin_api_version: API_VERSION, webhook_api_version: WEBHOOK_API_VERSION, message: missing.length ? 'Additional Shopify permission is needed before this connection can be used.' : null },
      last_synced_at: existing?.last_synced_at || null, connected_by_user_id: consumed.created_by_user_id, connected_at: at, disconnected_at: null, created_at: existing?.created_at || at, updated_at: at
    };
    const connection = existing ? await this.store.updateShopifyConnection(existing.id, consumed.organization_id, record) : await this.store.createShopifyConnection(record);
    const encrypted = envelope.encryptCredential(token);
    await this.store.saveShopifyCredentialEnvelope({ id: createId('sce'), connection_id: connection.id, ...encrypted, created_at: at, updated_at: at });
    await this.store.assignShopifyConnectionToProject({ id: createId('psc'), project_id: consumed.project_id, connection_id: connection.id, assigned_by_user_id: consumed.created_by_user_id, assignment_status: 'assigned', created_at: at, updated_at: at });
    const project = await this.store.findProjectForOrganization(consumed.project_id, consumed.organization_id);
    await this.activity(project, consumed.created_by_user_id, 'shopify_connection_completed', { connection_status: connection.connection_status });
    const fallbackPath = `/projects/${consumed.project_id}/design?shopify=connected`;
    const embeddedPath = embeddedAdminAppUrl({ host: consumed.embedded_host || parameters.get('host'), clientId: config.clientId, shopDomain, projectId: consumed.project_id });
    return { project_id: consumed.project_id, connection: publicConnection(connection), redirect_path: embeddedPath || fallbackPath };
  }

  async listEligibleStores({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId });
    const connections = await this.store.listShopifyConnectionsForOrganization(project.organization_id);
    return { connections: connections.map(publicConnection) };
  }
  async assignStore({ userId, projectId, connectionId }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const connection = await this.store.findShopifyConnectionForOrganization(connectionId, project.organization_id);
    assert(connection, 'shopify_connection_not_found', 'Choose a Shopify store from this workspace.', 404);
    assert(!['disconnected', 'revoked'].includes(connection.connection_status), 'shopify_connection_unavailable', 'Reconnect this Shopify store before using it.', 409);
    const at = this.now();
    await this.store.assignShopifyConnectionToProject({ id: createId('psc'), project_id: projectId, connection_id: connection.id, assigned_by_user_id: userId, assignment_status: 'assigned', created_at: at, updated_at: at });
    await this.activity(project, userId, 'shopify_connection_assigned', {});
    return { connection: publicConnection(connection) };
  }
  async projectConnection({ userId, projectId, connectionId = null }) {
    const project = await this.authorize({ userId, projectId });
    const assignment = await this.store.findProjectShopifyConnection(projectId, project.organization_id, connectionId);
    return { connection: publicConnection(assignment?.connection || null), assignment: assignment ? { status: assignment.assignment_status, updated_at: assignment.updated_at } : null };
  }
  async connectionCredential(connection) {
    assert(connection?.credential_status === 'active', 'shopify_connection_invalid', 'This Shopify connection needs to be reconnected.', 409);
    const envelope = await this.store.findShopifyCredentialEnvelope(connection.id);
    assert(envelope, 'shopify_connection_invalid', 'This Shopify connection needs to be reconnected.', 409);
    let credential = this.credentialEnvelope().decryptCredential(envelope);
    const expiry = credential.expires_at ? new Date(credential.expires_at).getTime() : null;
    if (expiry && expiry <= this.clock().getTime() + 120_000) {
      const config = oauthConfiguration(this.env);
      assert(credential.refresh_token && typeof this.adapter.refreshOfflineToken === 'function', 'shopify_connection_invalid', 'This Shopify connection needs to be reconnected.', 409);
      const renewed = await this.adapter.refreshOfflineToken({ shopDomain: connection.shop_domain, refreshToken: credential.refresh_token, clientId: config.clientId, clientSecret: config.clientSecret });
      credential = { ...renewed, refresh_token: renewed.refresh_token || credential.refresh_token, refresh_token_expires_at: renewed.refresh_token_expires_at || credential.refresh_token_expires_at };
      const encrypted = this.credentialEnvelope().encryptCredential(credential);
      await this.store.saveShopifyCredentialEnvelope({ id: createId('sce'), connection_id: connection.id, ...encrypted, created_at: envelope.created_at, updated_at: this.now() });
    }
    return credential;
  }
  async connectionAccess(connection) {
    return (await this.connectionCredential(connection)).access_token;
  }
  async checkHealth({ userId, projectId, connectionId = null }) {
    const project = await this.authorize({ userId, projectId });
    const assignment = await this.store.findProjectShopifyConnection(projectId, project.organization_id, connectionId);
    assert(assignment?.connection, 'shopify_connection_missing', 'Connect a Shopify store before continuing.', 409);
    const connection = assignment.connection; const at = this.now();
    try {
      const inspected = await this.adapter.inspectConnection({ shopDomain: connection.shop_domain, accessToken: await this.connectionAccess(connection) });
      assert(inspected?.shop?.id === connection.shop_gid, 'shopify_identity_unverified', 'This Shopify connection needs to be reconnected.', 409);
      const granted = unique(inspected.scopes || connection.granted_scopes);
      const missing = missingScopes(DISCOVERY_SCOPES, granted);
      const next = await this.store.updateShopifyConnection(connection.id, project.organization_id, { ...connection, granted_scopes: granted, connection_status: missing.length ? 'reauthorization_required' : connection.last_synced_at ? 'ready' : 'sync_required', credential_status: 'active', health: { status: missing.length ? 'missing_scopes' : 'healthy', missing_scopes: missing, unexpected_scopes: unexpectedScopes(granted), checked_at: at, webhook_status: connection.health?.webhook_status || 'not_received', admin_api_version: API_VERSION, webhook_api_version: WEBHOOK_API_VERSION, message: missing.length ? 'Additional Shopify permission is needed before this connection can be used.' : null }, updated_at: at });
      return { connection: publicConnection(next) };
    } catch (error) {
      const needsReauthorization = ['shopify_connection_invalid', 'shopify_credential_invalid', 'shopify_permissions_missing'].includes(error.code);
      const status = needsReauthorization ? 'reauthorization_required' : 'degraded';
      const next = await this.store.updateShopifyConnection(connection.id, project.organization_id, { ...connection, connection_status: status, credential_status: status === 'reauthorization_required' ? 'invalid' : connection.credential_status, health: { status: status === 'reauthorization_required' ? 'invalid' : 'unreachable', missing_scopes: [], unexpected_scopes: [], checked_at: at, webhook_status: connection.health?.webhook_status || 'not_received', admin_api_version: API_VERSION, webhook_api_version: WEBHOOK_API_VERSION, message: 'Shopify connection needs attention.' }, updated_at: at });
      return { connection: publicConnection(next) };
    }
  }

  async synchronize({ userId, projectId, connectionId = null }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const assignment = await this.store.findProjectShopifyConnection(projectId, project.organization_id, connectionId);
    assert(assignment?.connection, 'shopify_connection_missing', 'Connect a Shopify store before refreshing resources.', 409);
    const healthy = await this.checkHealth({ userId, projectId, connectionId: assignment.connection.id });
    assert(healthy.connection.connection_status !== 'reauthorization_required', 'shopify_permissions_missing', 'Reconnect Shopify with the required permissions before refreshing resources.', 409);
    const refreshed = await this.store.findProjectShopifyConnection(projectId, project.organization_id, assignment.connection.id);
    const connection = refreshed?.connection;
    assert(connection, 'shopify_connection_missing', 'Connect a Shopify store before refreshing resources.', 409);
    const accessToken = await this.connectionAccess(connection);
    const at = this.now(); const syncId = createId('ssr');
    await this.store.createShopifySyncRun({ id: syncId, connection_id: connection.id, initiated_by_user_id: userId, status: 'running', resource_counts: {}, errors: [], started_at: at });
    await this.store.updateShopifyConnection(connection.id, project.organization_id, { ...connection, connection_status: 'synchronizing', health: { ...connection.health, status: 'synchronizing', checked_at: at }, updated_at: at });
    const counts = {}; const errors = []; const successfulTypes = new Set(); let primaryMarket = connection.primary_market || null; let staleApprovalCount = 0;
    try {
      const identity = await this.adapter.inspectConnection({ shopDomain: connection.shop_domain, accessToken });
      const shopRecords = [resource({ connectionId: connection.id, type: 'shop', remoteGid: identity.shop.id, title: identity.shop.name, previewUrl: identity.shop.storefront_url, approvalEligible: false, metadata: { primary_domain: identity.shop.primary_domain, storefront_url: identity.shop.storefront_url } })];
      staleApprovalCount += await this.persistResources({ records: shopRecords, syncId, at }); counts.shop = shopRecords.length; successfulTypes.add('shop');
    } catch (error) { errors.push({ resource_type: 'shop', code: safeFailure(error) }); }
    for (const resourceType of SYNC_TYPES) {
      let cursor = null; let pages = 0; const records = [];
      try {
        do {
          const page = await this.adapter.listResourcePage({ shopDomain: connection.shop_domain, accessToken, resourceType, after: cursor, first: 100 });
          records.push(...normalizeResourceNodes(connection.id, resourceType, page.nodes));
          cursor = page.page_info?.hasNextPage ? page.page_info.endCursor : null;
          pages += 1;
          if (pages > 100) throw new DashboardError('shopify_pagination_invalid', 'Shopify returned an invalid resource page. Try again.', 502);
        } while (cursor);
        staleApprovalCount += await this.persistResources({ records, syncId, at });
        for (const type of resourceType === 'product' ? ['product', 'variant', 'product_media'] : [resourceType]) {
          await this.store.markShopifyResourcesUnavailable(connection.id, type, syncId, at);
          await this.store.invalidateShopifyApprovalsForUnavailableResources(connection.id, type, at);
        }
        counts[resourceType] = records.filter((record) => record.resource_type === resourceType).length;
        if (resourceType === 'market') {
          const selectedMarket = records.find((record) => record.metadata?.enabled) || records[0] || null;
          primaryMarket = selectedMarket ? { remote_gid: selectedMarket.remote_gid, name: selectedMarket.display_title, enabled: Boolean(selectedMarket.metadata?.enabled), primary_domain: selectedMarket.metadata?.primary_domain || null } : null;
        }
        if (resourceType === 'product') { counts.variant = records.filter((record) => record.resource_type === 'variant').length; counts.product_media = records.filter((record) => record.resource_type === 'product_media').length; }
        successfulTypes.add(resourceType);
      } catch (error) { errors.push({ resource_type: resourceType, code: safeFailure(error) }); }
    }
    const completedAt = this.now(); const status = errors.length === SYNC_TYPES.length + 1 ? 'failed' : errors.length ? 'partial' : 'completed';
    const run = await this.store.completeShopifySyncRun(syncId, { status, resource_counts: counts, errors, completed_at: completedAt });
    const nextStatus = status === 'failed' ? 'degraded' : 'ready';
    const updated = await this.store.updateShopifyConnection(connection.id, project.organization_id, { ...connection, primary_market: primaryMarket, connection_status: nextStatus, credential_status: 'active', last_synced_at: completedAt, health: { status: status === 'completed' ? 'healthy' : 'partial', missing_scopes: [], unexpected_scopes: unexpectedScopes(connection.granted_scopes), checked_at: completedAt, webhook_status: connection.health?.webhook_status || 'not_received', admin_api_version: API_VERSION, webhook_api_version: WEBHOOK_API_VERSION, last_failed_sync_at: errors.length ? completedAt : connection.health?.last_failed_sync_at || null, message: errors.length ? 'Some Shopify resources could not be refreshed.' : null }, updated_at: completedAt });
    await this.activity(project, userId, 'shopify_resources_synchronized', { status, resource_types: [...successfulTypes].sort(), stale_resource_count: staleApprovalCount });
    return { connection: publicConnection(updated), sync_run: run, resource_counts: counts };
  }
  async persistResources({ records, syncId, at }) {
    let staleApprovalCount = 0;
    for (const normalized of records) {
      const existing = await this.store.findShopifyResourceByRemote(normalized.connection_id, normalized.resource_type, normalized.remote_gid);
      if (existing && existing.source_revision !== normalized.source_revision) { await this.store.invalidateShopifyApprovalsForResource(existing.id, 'stale', at); staleApprovalCount += 1; }
      await this.store.upsertShopifyResource({ ...normalized, id: existing?.id || createId('shr'), last_synced_at: at, last_sync_run_id: syncId, deleted_at: null, created_at: existing?.created_at || at, updated_at: at });
    }
    return staleApprovalCount;
  }

  async listResources({ userId, projectId, connectionId = null, resourceType = null }) {
    const project = await this.authorize({ userId, projectId });
    const assignment = await this.store.findProjectShopifyConnection(projectId, project.organization_id, connectionId);
    assert(assignment?.connection, 'shopify_connection_missing', 'Connect a Shopify store before reviewing resources.', 409);
    assert(SELECTABLE_RESOURCE_TYPES.includes(resourceType) || resourceType === null, 'shopify_resource_type_invalid', 'Choose a valid Shopify resource type.', 422);
    const resources = await this.store.listProjectShopifyResources(projectId, assignment.connection.id, { resourceType });
    return { connection: publicConnection(assignment.connection), resources: resources.map(publicResourceEntry) };
  }
  async previewEligibility({ userId, projectId, resourceId = null }) {
    const project = await this.authorize({ userId, projectId });
    const assignment = await this.store.findProjectShopifyConnection(projectId, project.organization_id);
    if (!assignment?.connection) return { status: 'disconnected-store', theme: null };
    const connection = assignment.connection;
    if (!connection.granted_scopes.includes('read_themes')) return { status: 'missing-scope', theme: null };
    if (connection.connection_status !== 'ready') return { status: 'disconnected-store', theme: null };
    const item = resourceId ? await this.store.findShopifyResource(resourceId, connection.id) : null;
    if (resourceId && (!item || item.resource_type !== 'theme' || item.availability_status !== 'available')) return { status: 'missing-theme', theme: null };
    const theme = item || (await this.store.listShopifyResources(connection.id, { resourceType: 'theme', availability: 'available' }))[0] || null;
    return { status: themePreviewEligibility({ role: theme?.metadata?.role || theme?.resource_status, processing: theme?.metadata?.processing, processingFailed: theme?.metadata?.processing_failed }), theme: theme ? { id: theme.id, name: theme.display_title, role: theme.metadata?.role || theme.resource_status || null } : null, read_only: true };
  }
  async decideResource({ userId, projectId, resourceId, status, note = '' }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const assignment = await this.store.findProjectShopifyConnection(projectId, project.organization_id);
    assert(assignment?.connection, 'shopify_connection_missing', 'Connect a Shopify store before approving resources.', 409);
    assert(['approved', 'rejected'].includes(status), 'shopify_resource_decision_invalid', 'Choose an approval or revision for this Shopify resource.', 422);
    const item = await this.store.findShopifyResource(resourceId, assignment.connection.id);
    assert(item && item.approval_eligible && item.availability_status === 'available', 'shopify_resource_unavailable', 'This Shopify resource is no longer available. Refresh resources and choose another one.', 409);
    const at = this.now(); const current = await this.store.findShopifyResourceApproval(projectId, item.id);
    const approval = await this.store.upsertShopifyResourceApproval({ id: current?.id || createId('sra'), project_id: projectId, connection_id: assignment.connection.id, resource_id: item.id, approval_status: status, source_revision: item.source_revision, merchant_note: String(note || '').trim().slice(0, 1000) || null, approved_by_user_id: status === 'approved' ? userId : null, approved_at: status === 'approved' ? at : null, rejected_at: status === 'rejected' ? at : null, revoked_at: null, updated_at: at, created_at: current?.created_at || at });
    await this.activity(project, userId, status === 'approved' ? 'shopify_resource_approved' : 'shopify_resource_rejected', { resource_type: item.resource_type });
    return { approval, resource: item };
  }
  async revokeResource({ userId, projectId, resourceId, note = '' }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    const assignment = await this.store.findProjectShopifyConnection(projectId, project.organization_id);
    assert(assignment?.connection, 'shopify_connection_missing', 'Connect a Shopify store before revising resources.', 409);
    const item = await this.store.findShopifyResource(resourceId, assignment.connection.id);
    const current = item && await this.store.findShopifyResourceApproval(projectId, resourceId);
    assert(item && current, 'shopify_resource_approval_missing', 'This Shopify resource has not been approved for this project.', 404);
    const at = this.now(); const approval = await this.store.upsertShopifyResourceApproval({ ...current, approval_status: 'revoked', merchant_note: String(note || '').trim().slice(0, 1000) || current.merchant_note, approved_by_user_id: current.approved_by_user_id, approved_at: current.approved_at, rejected_at: current.rejected_at, revoked_at: at, updated_at: at });
    await this.activity(project, userId, 'shopify_resource_approval_revoked', { resource_type: item.resource_type });
    return { approval };
  }
  async resolveApprovedResource({ projectId, organizationId, resourceId, allowedTypes }) {
    const assignment = await this.store.findProjectShopifyConnection(projectId, organizationId);
    assert(assignment?.connection, 'shopify_connection_missing', 'Connect a Shopify store before using Shopify resources.', 409);
    const resource = await this.store.findApprovedShopifyResourceForProject(projectId, assignment.connection.id, resourceId, allowedTypes);
    assert(resource, 'shopify_resource_approval_required', 'Choose a current approved Shopify resource for this request.', 409);
    return { connection: assignment.connection, resource };
  }
  // Billing is intentionally server-only. It returns the assigned connection
  // record to a provider, never a credential or a browser-facing payload.
  async billingConnection({ projectId, organizationId, expectedConnectionId = null }) {
    const assignment = await this.store.findProjectShopifyConnection(projectId, organizationId, expectedConnectionId);
    const connection = assignment?.connection;
    assert(connection, 'shopify_billing_connection_missing', 'Connect the approved Shopify store before purchasing a storefront.', 409);
    assert(connection.connection_status === 'ready' && connection.credential_status === 'active', 'shopify_billing_connection_unready', 'Reconnect and refresh Shopify before purchasing a storefront.', 409);
    if (expectedConnectionId) assert(connection.id === expectedConnectionId, 'shopify_billing_connection_mismatch', 'The storefront purchase does not belong to this Shopify store.', 409);
    return connection;
  }
  async disconnect({ userId, projectId, connectionId = null }) {
    const project = await this.authorize({ userId, projectId, permission: 'organization:manage' });
    const assignment = await this.store.findProjectShopifyConnection(projectId, project.organization_id, connectionId);
    assert(assignment?.connection, 'shopify_connection_missing', 'Choose a connected Shopify store.', 404);
    const connection = assignment.connection; const at = this.now();
    await this.store.deleteShopifyCredentialEnvelope(connection.id);
    await this.store.invalidateShopifyApprovalsForConnection(connection.id, 'revoked', at);
    await this.store.disconnectShopifyConnectionFromProjects(connection.id, at);
    const updated = await this.store.updateShopifyConnection(connection.id, project.organization_id, { ...connection, connection_status: 'disconnected', credential_status: 'revoked', health: { status: 'disconnected', missing_scopes: [], checked_at: at, message: null }, disconnected_at: at, updated_at: at });
    await this.activity(project, userId, 'shopify_connection_disconnected', {});
    return { connection: publicConnection(updated) };
  }
  async processWebhook({ rawBody, headers }) { return this.webhooks.process({ rawBody, headers }); }
  async preparePreview({ userId, projectId, generatedBuildId = null }) {
    const project = await this.authorize({ userId, projectId, permission: 'interview:edit' });
    assert(typeof generatedBuildId === 'string' && generatedBuildId.length > 0, 'shopify_preview_build_missing', 'Generate an approved storefront before preparing a Shopify preview.', 409);
    const assignment = await this.store.findProjectShopifyConnection(projectId, project.organization_id);
    assert(assignment?.connection && assignment.connection.connection_status === 'ready', 'shopify_preview_connection_unready', 'Refresh the connected Shopify store before preparing a preview.', 409);
    const connection = assignment.connection;
    const resources = await this.store.listProjectShopifyResources(projectId, connection.id, { resourceType: 'theme' });
    const theme = resources.find(({ resource: candidate, approval }) => approval?.approval_status === 'approved' && approval.source_revision === candidate.source_revision && candidate.availability_status === 'available' && ['DEVELOPMENT', 'UNPUBLISHED'].includes(String(candidate.metadata?.role || candidate.resource_status || '').toUpperCase()));
    assert(theme, 'shopify_preview_target_unapproved', 'Approve an unpublished Shopify preview target before preparing a preview.', 409);
    const at = this.now(); const attemptId = createId('spa');
    await this.store.createShopifyPreviewAttempt({ id: attemptId, project_id: projectId, connection_id: connection.id, preview_target_id: null, generated_build_id: generatedBuildId, status: 'preparing', warning: null, created_at: at, completed_at: null });
    let result;
    try { result = await this.adapter.preparePreview({ shopDomain: connection.shop_domain, accessToken: await this.connectionAccess(connection), generatedBuildId, theme: { remote_gid: theme.resource.remote_gid, remote_id: theme.resource.remote_gid.split('/').pop(), name: theme.resource.display_title, role: theme.resource.metadata?.role || theme.resource.resource_status } }); }
    catch (error) { result = { status: 'failed', warning: 'Shopify could not prepare a preview target.' }; }
    const status = result?.status === 'ready' && /^https:\/\//.test(String(result.preview_url || '')) ? 'ready' : result?.status === 'deleted' ? 'deleted' : 'failed';
    const target = await this.store.upsertShopifyPreviewTarget({ id: createId('spt'), project_id: projectId, connection_id: connection.id, remote_theme_gid: result?.remote_theme_gid || theme.resource.remote_gid, remote_theme_id: result?.remote_theme_id || theme.resource.remote_gid.split('/').pop(), theme_name: result?.theme_name || theme.resource.display_title, theme_role: result?.theme_role || theme.resource.metadata?.role || theme.resource.resource_status, preview_url: status === 'ready' ? result.preview_url : null, status, generated_build_id: generatedBuildId, created_at: at, updated_at: this.now() });
    await this.store.completeShopifyPreviewAttempt(attemptId, { preview_target_id: target.id, status: status === 'ready' ? 'ready' : 'failed', warning: status === 'ready' ? null : String(result?.warning || 'Shopify did not return a valid preview URL.').slice(0, 1000), completed_at: this.now() });
    await this.activity(project, userId, status === 'ready' ? 'shopify_preview_ready' : 'shopify_preview_failed', {});
    return { preview: publicPreview(target), verification_required: status === 'ready', deployment_eligible: status === 'ready' && DEPLOYMENT_SCOPES.every((scope) => connection.granted_scopes.includes(scope)) };
  }
  async previewStatus({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId });
    const assignment = await this.store.findProjectShopifyConnection(projectId, project.organization_id);
    if (!assignment?.connection) return { preview: null, connection: null, deployment_eligible: false };
    const preview = await this.store.findShopifyPreviewTarget(projectId, assignment.connection.id);
    return { preview: publicPreview(preview), connection: publicConnection(assignment.connection), deployment_eligible: Boolean(preview?.status === 'ready' && DEPLOYMENT_SCOPES.every((scope) => assignment.connection.granted_scopes.includes(scope))) };
  }
}

module.exports = { ShopifyConnectionService, SYNC_TYPES, RESOURCE_TYPE_BY_FIELD, missingScopes, publicConnection, publicResourceEntry, publicPreview };
