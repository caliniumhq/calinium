'use strict';

const crypto = require('crypto');
const { createId } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { isoNow } = require('../lib/serialization.cjs');
const { assertShopAllowed, dashboardSessionSecret, shopifyRuntimeConfiguration } = require('../shopify/runtime-configuration.cjs');
const { normalizeShopDomain } = require('../shopify/oauth.cjs');
const { DISCOVERY_SCOPES, API_VERSION, WEBHOOK_API_VERSION } = require('../shopify/constants.cjs');

function unique(values) { return [...new Set(values || [])].sort(); }
function missingScopes(granted) { const available = new Set(granted || []); return DISCOVERY_SCOPES.filter((scope) => !available.has(scope)); }
function safeSlug(name, suffix) {
  const normalized = String(name || 'Shopify workspace').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 42) || 'shopify-workspace';
  return `${normalized}-${suffix.slice(-8)}`;
}
function embeddedEmail(shopDomain, shopifyUserId) {
  const digest = crypto.createHash('sha256').update(`${shopDomain}\u0000${shopifyUserId}`).digest('hex').slice(0, 48);
  return `shopify-${digest}@embedded.calinium.invalid`;
}
function activeConnection(connection) { return connection && !['disconnected', 'revoked'].includes(connection.connection_status) && connection.credential_status === 'active'; }

class ShopifyEmbeddedAuthService {
  constructor({ store, auth, shopifyService, adapter, env = process.env, clock = () => new Date() }) {
    this.store = store;
    this.auth = auth;
    this.shopifyService = shopifyService;
    this.adapter = adapter;
    this.env = env;
    this.clock = clock;
  }

  now() { return isoNow(this.clock); }

  async exchangeCredential({ shopDomain, sessionToken }) {
    const config = shopifyRuntimeConfiguration(this.env, { requireCredentials: true });
    assert(typeof this.adapter.exchangeSessionToken === 'function', 'shopify_embedded_auth_unavailable', 'Embedded Shopify sign-in is not available in this environment.', 503);
    const credential = await this.adapter.exchangeSessionToken({ shopDomain, sessionToken, clientId: config.clientId, clientSecret: config.clientSecret });
    assert(credential?.access_token, 'shopify_embedded_token_exchange_failed', 'Calinium could not establish a secure Shopify session. Refresh the app and try again.', 502);
    return credential;
  }

  async inspect(shopDomain, accessToken) {
    let inspected;
    try { inspected = await this.adapter.inspectConnection({ shopDomain, accessToken }); }
    catch (error) { throw new DashboardError('shopify_embedded_identity_unverified', 'Calinium could not verify this Shopify store. Refresh the app and try again.', 502); }
    const identityDomain = inspected?.shop?.myshopify_domain;
    assert(inspected?.shop?.id && identityDomain && normalizeShopDomain(identityDomain) === shopDomain, 'shopify_embedded_identity_unverified', 'Calinium could not verify this Shopify store. Refresh the app and try again.', 502);
    return inspected;
  }

  connectionRecord({ existing = null, organizationId, shopDomain, inspected, credential, userId, at }) {
    const granted = unique(inspected.scopes?.length ? inspected.scopes : credential.scopes || []);
    const missing = missingScopes(granted);
    return {
      id: existing?.id || createId('shc'),
      organization_id: organizationId,
      shop_domain: shopDomain,
      shop_gid: inspected.shop.id,
      display_name: inspected.shop.name || shopDomain,
      storefront_url: inspected.shop.storefront_url || null,
      primary_market: existing?.primary_market || null,
      granted_scopes: granted,
      connection_status: missing.length ? 'reauthorization_required' : (existing?.last_synced_at ? 'ready' : 'sync_required'),
      credential_status: 'active',
      health: {
        status: missing.length ? 'missing_scopes' : 'healthy',
        missing_scopes: missing,
        unexpected_scopes: [],
        checked_at: at,
        webhook_status: existing?.health?.webhook_status || 'not_received',
        admin_api_version: API_VERSION,
        webhook_api_version: WEBHOOK_API_VERSION,
        message: missing.length ? 'Additional Shopify permission is needed before this connection can be used.' : null
      },
      last_synced_at: existing?.last_synced_at || null,
      connected_by_user_id: existing?.connected_by_user_id || userId,
      connected_at: existing?.connected_at || at,
      disconnected_at: null,
      created_at: existing?.created_at || at,
      updated_at: at
    };
  }

  async credentialFor({ connection, shopDomain, sessionToken }) {
    if (activeConnection(connection)) {
      try {
        const credential = await this.shopifyService.connectionCredential(connection);
        return { credential, exchanged: false };
      } catch {
        // An installed shop can safely restore an expired or invalid offline
        // credential from the current signed App Bridge session.
      }
    }
    return { credential: await this.exchangeCredential({ shopDomain, sessionToken }), exchanged: true };
  }

  async createWorkspace({ shopDomain, shopifyUserId, inspected, credential, at }) {
    const userId = createId('usr');
    const organizationId = createId('org');
    const workspaceId = createId('wsp');
    const connection = this.connectionRecord({ organizationId, shopDomain, inspected, credential, userId, at });
    const encrypted = this.shopifyService.credentialEnvelope().encryptCredential(credential);
    await this.store.transaction(async (transaction) => {
      await transaction.createUser({ id: userId, email: embeddedEmail(shopDomain, shopifyUserId), full_name: 'Shopify merchant', password_hash: 'shopify-embedded-only', status: 'active', created_at: at, updated_at: at });
      await transaction.createOrganization({ id: organizationId, name: connection.display_name, slug: safeSlug(connection.display_name, organizationId), created_by_user_id: userId, created_at: at, updated_at: at });
      await transaction.createWorkspace({ id: workspaceId, organization_id: organizationId, name: connection.display_name, created_at: at, updated_at: at });
      await transaction.createMembership({ id: createId('mem'), organization_id: organizationId, user_id: userId, role: 'owner', status: 'active', created_at: at });
      await transaction.createShopifyConnection(connection);
      await transaction.saveShopifyCredentialEnvelope({ id: createId('sce'), connection_id: connection.id, ...encrypted, created_at: at, updated_at: at });
      await transaction.createShopifyEmbeddedIdentity({ id: createId('sei'), connection_id: connection.id, organization_id: organizationId, shop_domain: shopDomain, shopify_user_id: shopifyUserId, user_id: userId, created_at: at, updated_at: at, last_authenticated_at: at });
      await transaction.createActivity({ id: createId('act'), organization_id: organizationId, actor_user_id: userId, type: 'shopify_embedded_workspace_created', payload: {}, created_at: at });
    });
    return { connection: await this.store.findShopifyConnectionForOrganization(connection.id, organizationId), user: await this.store.findUserById(userId) };
  }

  async provisionIdentity({ connection, shopDomain, shopifyUserId, at }) {
    const existing = await this.store.findShopifyEmbeddedIdentity(shopDomain, shopifyUserId);
    if (existing) {
      assert(existing.connection_id === connection.id && existing.organization_id === connection.organization_id, 'shopify_embedded_identity_invalid', 'This Shopify session is not authorized for the current workspace.', 403);
      const user = await this.store.findUserById(existing.user_id);
      assert(user?.status === 'active', 'shopify_embedded_identity_invalid', 'This Shopify session is not authorized for the current workspace.', 403);
      await this.store.touchShopifyEmbeddedIdentity(existing.id, at);
      return user;
    }
    const userId = createId('usr');
    try {
      await this.store.transaction(async (transaction) => {
        await transaction.createUser({ id: userId, email: embeddedEmail(shopDomain, shopifyUserId), full_name: 'Shopify merchant', password_hash: 'shopify-embedded-only', status: 'active', created_at: at, updated_at: at });
        // Shopify’s signed session proves the staff member belongs to this shop.
        // New staff identities get the least-privileged editable role; existing
        // Calinium owners retain organization-management control.
        await transaction.createMembership({ id: createId('mem'), organization_id: connection.organization_id, user_id: userId, role: 'editor', status: 'active', created_at: at });
        await transaction.createShopifyEmbeddedIdentity({ id: createId('sei'), connection_id: connection.id, organization_id: connection.organization_id, shop_domain: shopDomain, shopify_user_id: shopifyUserId, user_id: userId, created_at: at, updated_at: at, last_authenticated_at: at });
        await transaction.createActivity({ id: createId('act'), organization_id: connection.organization_id, actor_user_id: userId, type: 'shopify_embedded_member_authenticated', payload: {}, created_at: at });
      });
      return this.store.findUserById(userId);
    } catch (error) {
      // Two first-load requests may provision the same signed Shopify staff
      // identity concurrently. The unique identity is authoritative; the
      // losing transaction is rolled back and resumes that same identity.
      const concurrent = await this.store.findShopifyEmbeddedIdentity(shopDomain, shopifyUserId);
      if (!concurrent || concurrent.connection_id !== connection.id || concurrent.organization_id !== connection.organization_id) throw error;
      const user = await this.store.findUserById(concurrent.user_id);
      if (!user?.id) throw error;
      await this.store.touchShopifyEmbeddedIdentity(concurrent.id, at);
      return user;
    }
  }

  async bootstrap({ embeddedSession, sessionToken }) {
    const shopDomain = normalizeShopDomain(embeddedSession?.shop_domain);
    assertShopAllowed(shopDomain, this.env);
    const shopifyUserId = String(embeddedSession?.user_id || '');
    assert(shopifyUserId, 'shopify_embedded_user_missing', 'Shopify did not provide an administrator session. Refresh the app and try again.', 401);
    assert(typeof sessionToken === 'string' && sessionToken.length > 0, 'shopify_embedded_session_invalid', 'Your Shopify session could not be verified. Refresh the app and try again.', 401);
    // Embedded Shopify sign-in always creates an HTTP-only Calinium session;
    // never fall back to the legacy unhashed development-session behavior.
    dashboardSessionSecret(this.env, { required: true });
    const at = this.now();
    let connection = await this.store.findShopifyConnectionByDomain(shopDomain);
    let credential;
    try {
      ({ credential } = await this.credentialFor({ connection, shopDomain, sessionToken }));
    } catch (error) {
      if (error instanceof DashboardError) throw error;
      throw new DashboardError('shopify_embedded_token_exchange_failed', 'Calinium could not establish a secure Shopify session. Refresh the app and try again.', 502);
    }
    const inspected = await this.inspect(shopDomain, credential.access_token);
    let workspaceCreated = false;
    if (!connection) {
      try {
        const created = await this.createWorkspace({ shopDomain, shopifyUserId, inspected, credential, at });
        connection = created.connection;
        workspaceCreated = true;
      } catch (error) {
        // The canonical shop domain is globally unique. A concurrent first
        // launch may have completed the same workspace transaction first.
        connection = await this.store.findShopifyConnectionByDomain(shopDomain);
        if (!connection) throw error;
      }
    }
    if (!workspaceCreated) {
      const record = this.connectionRecord({ existing: connection, organizationId: connection.organization_id, shopDomain, inspected, credential, userId: connection.connected_by_user_id, at });
      connection = await this.store.updateShopifyConnection(connection.id, connection.organization_id, record);
      const encrypted = this.shopifyService.credentialEnvelope().encryptCredential(credential);
      const prior = await this.store.findShopifyCredentialEnvelope(connection.id);
      await this.store.saveShopifyCredentialEnvelope({ id: createId('sce'), connection_id: connection.id, ...encrypted, created_at: prior?.created_at || at, updated_at: at });
    }
    // A fresh signed Shopify installation may re-establish authority, but it
    // never revives an old Calinium browser session. Record the lifecycle
    // transition before issuing a new session from the current ID token.
    await this.store.markShopifyLifecycleReinstalled(connection, at);
    const user = await this.provisionIdentity({ connection, shopDomain, shopifyUserId, at });
    const signedIn = await this.store.updateUserSignIn(user.id, at);
    const session = await this.auth.issueSession(signedIn.id, at);
    const context = await this.auth.accountContext(signedIn.id);
    return { user: context.user, organizations: context.organizations, session, embedded: true, shop: { display_name: connection.display_name, shop_domain: connection.shop_domain }, connection };
  }

  async resolveActor({ shopDomain, shopifyUserId }) {
    const normalizedDomain = normalizeShopDomain(shopDomain);
    assertShopAllowed(normalizedDomain, this.env);
    const identity = await this.store.findShopifyEmbeddedIdentity(normalizedDomain, String(shopifyUserId || ''));
    assert(identity, 'shopify_embedded_identity_invalid', 'This Shopify session is not authorized for the current workspace.', 403);
    const connection = await this.store.findShopifyConnectionForOrganization(identity.connection_id, identity.organization_id);
    assert(activeConnection(connection), 'shopify_embedded_connection_unavailable', 'Reconnect Shopify before continuing.', 409);
    const actor = await this.auth.accountContext(identity.user_id);
    assert(actor?.user?.id === identity.user_id, 'shopify_embedded_identity_invalid', 'This Shopify session is not authorized for the current workspace.', 403);
    await this.store.touchShopifyEmbeddedIdentity(identity.id, this.now());
    return { ...actor, identity, connection };
  }

  async authorizeActor({ userId, shopDomain, shopifyUserId }) {
    const resolved = await this.resolveActor({ shopDomain, shopifyUserId });
    assert(resolved.user.id === userId, 'shopify_embedded_identity_invalid', 'This Shopify session is not authorized for the current workspace.', 403);
    return { identity: resolved.identity, connection: resolved.connection };
  }
}

module.exports = { ShopifyEmbeddedAuthService, embeddedEmail, activeConnection, missingScopes };
