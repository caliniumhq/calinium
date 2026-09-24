'use strict';

const { DashboardError, assert } = require('../lib/errors.cjs');
const { API_VERSION } = require('./constants.cjs');

// `currentAppInstallation` is the Admin GraphQL source of truth for the
// scopes actually granted to this installation. Configuration alone is never
// treated as proof of access.
const SHOP_QUERY = `query CaliniumShopIdentity { shop { id name myshopifyDomain primaryDomain { host url } } currentAppInstallation { accessScopes { handle } } }`;
const APP_PURCHASE_ONE_TIME_CREATE = `mutation CaliniumAppPurchaseOneTimeCreate($name: String!, $price: MoneyInput!, $returnUrl: URL!, $test: Boolean) { appPurchaseOneTimeCreate(name: $name, price: $price, returnUrl: $returnUrl, test: $test) { userErrors { field message } appPurchaseOneTime { id name status test createdAt price { amount currencyCode } } confirmationUrl } }`;
const APP_PURCHASE_ONE_TIME_QUERY = `query CaliniumAppPurchaseOneTime($id: ID!) { node(id: $id) { ... on AppPurchaseOneTime { id name status test createdAt price { amount currencyCode } } } }`;
const RESOURCE_QUERIES = Object.freeze({
  // In Admin API 2026-07, ProductVariant.price is the Money scalar rather
  // than a MoneyV2 object. Keep it scalar here and normalize it without
  // inventing a currency. A shop currency can be supplied separately later.
  product: `query CaliniumProducts($first: Int!, $after: String) { products(first: $first, after: $after) { nodes { id title handle status updatedAt featuredMedia { preview { image { url altText } } } variants(first: 100) { nodes { id title sku availableForSale updatedAt price } } media(first: 50) { nodes { id alt mediaContentType preview { image { url altText } } } } } pageInfo { hasNextPage endCursor } } }`,
  collection: `query CaliniumCollections($first: Int!, $after: String) { collections(first: $first, after: $after) { nodes { id title handle updatedAt image { url altText } } pageInfo { hasNextPage endCursor } } }`,
  menu: `query CaliniumMenus($first: Int!, $after: String) { menus(first: $first, after: $after) { nodes { id title handle items { id title type url resourceId } } pageInfo { hasNextPage endCursor } } }`,
  // The File interface does not expose a consistent filename field across all
  // concrete media types in the selected Admin API version. Merchant-facing
  // labels are therefore derived safely from alt text or a generic label.
  file: `query CaliniumFiles($first: Int!, $after: String) { files(first: $first, after: $after) { nodes { id alt createdAt updatedAt preview { image { url altText } } ... on MediaImage { image { url altText } } ... on GenericFile { url } ... on Video { sources { url mimeType } } } pageInfo { hasNextPage endCursor } } }`,
  market: `query CaliniumMarkets($first: Int!, $after: String) { markets(first: $first, after: $after) { nodes { id name enabled webPresences(first: 5) { nodes { domain { url host } } } } pageInfo { hasNextPage endCursor } } }`,
  // OnlineStoreTheme has no Admin GraphQL previewUrl field. Preview creation
  // remains a later, write-authorized workflow; this read-only milestone only
  // records eligibility based on the safe theme metadata Shopify provides.
  theme: `query CaliniumThemes($first: Int!, $after: String) { themes(first: $first, after: $after) { nodes { id name role updatedAt processing processingFailed themeStoreId } pageInfo { hasNextPage endCursor } } }`
});

function tokenCredential(payload, now = Date.now()) {
  if (!payload?.access_token) throw new DashboardError('shopify_token_exchange_failed', 'Shopify could not complete the connection. Try again.', 502);
  const seconds = Number(payload.expires_in);
  const refreshSeconds = Number(payload.refresh_token_expires_in);
  return {
    token_type: String(payload.token_type || 'offline'),
    access_token: String(payload.access_token),
    refresh_token: payload.refresh_token ? String(payload.refresh_token) : null,
    expires_at: Number.isFinite(seconds) && seconds > 0 ? new Date(now + seconds * 1000).toISOString() : null,
    refresh_token_expires_at: Number.isFinite(refreshSeconds) && refreshSeconds > 0 ? new Date(now + refreshSeconds * 1000).toISOString() : null,
    scopes: String(payload.scope || '').split(',').map((scope) => scope.trim()).filter(Boolean)
  };
}

function graphQLErrors(payload) {
  // Top-level GraphQL errors mean that Shopify could not execute the request.
  // Mutation user errors are intentionally handled by the owning operation so
  // the dashboard can give the merchant a precise, safe recovery message.
  return (payload?.errors || []).map((error) => String(error?.message || error?.code || 'Shopify rejected this request.'));
}

function safeUserErrors(value) {
  return (value?.userErrors || [])
    .map((error) => ({
      field: Array.isArray(error?.field) ? error.field.map((part) => String(part).replace(/[^A-Za-z0-9_.-]/g, '')).filter(Boolean).join('.') : null,
      message: String(error?.message || 'Shopify rejected this request.').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 240)
    }))
    .filter((error) => error.message)
    .slice(0, 5);
}

function moneyToCents(amount) {
  const match = String(amount ?? '').match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new DashboardError('shopify_billing_purchase_invalid', 'Shopify returned an invalid storefront purchase amount.', 502);
  const whole = Number(match[1]);
  const fraction = Number((match[2] || '').padEnd(2, '0'));
  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(fraction) || whole > Math.floor((Number.MAX_SAFE_INTEGER - fraction) / 100)) {
    throw new DashboardError('shopify_billing_purchase_invalid', 'Shopify returned an invalid storefront purchase amount.', 502);
  }
  return whole * 100 + fraction;
}

function normalizeOneTimePurchase(value) {
  if (!value?.id || !value?.price?.currencyCode) throw new DashboardError('shopify_billing_purchase_invalid', 'Shopify did not return a usable storefront purchase.', 502);
  return {
    id: String(value.id),
    name: String(value.name || ''),
    status: String(value.status || '').toUpperCase(),
    test: Boolean(value.test),
    amount_cents: moneyToCents(value.price.amount),
    currency: String(value.price.currencyCode).toUpperCase(),
    created_at: value.createdAt || null,
    updated_at: value.updatedAt || value.createdAt || null
  };
}

function boundedRequestSignal(signal, timeoutMs = 12_000) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!signal) return timeoutSignal;
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([signal, timeoutSignal]);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted || timeoutSignal.aborted) abort();
  else {
    signal.addEventListener('abort', abort, { once: true });
    timeoutSignal.addEventListener('abort', abort, { once: true });
  }
  return controller.signal;
}

function abortableDelay(duration, signal) {
  if (duration <= 0) return Promise.resolve();
  if (signal?.aborted) return Promise.reject(new DashboardError('shopify_network_unavailable', 'Shopify could not be reached. Try again shortly.', 503));
  return new Promise((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener?.('abort', abort);
    const timer = setTimeout(() => { cleanup(); resolve(); }, duration);
    const abort = () => {
      clearTimeout(timer);
      cleanup();
      reject(new DashboardError('shopify_network_unavailable', 'Shopify could not be reached. Try again shortly.', 503));
    };
    signal?.addEventListener?.('abort', abort, { once: true });
  });
}

class ShopifyAdminApiAdapter {
  constructor({ env = process.env, fetchImpl = globalThis.fetch?.bind(globalThis), clock = () => Date.now() } = {}) {
    this.env = env;
    this.fetchImpl = fetchImpl;
    this.clock = clock;
    this.apiVersion = String(env.CALINIUM_SHOPIFY_ADMIN_API_VERSION || API_VERSION);
  }

  async exchangeCode({ shopDomain, code, clientId, clientSecret }) {
    assert(this.fetchImpl, 'shopify_network_unavailable', 'Shopify connection is unavailable in this environment.', 503);
    const response = await this.fetchImpl(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      // New managed-install apps use expiring offline tokens. The refresh
      // token is encrypted with the access token and never leaves this adapter.
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, expiring: '1' }).toString()
    }).catch(() => null);
    if (!response?.ok) throw new DashboardError('shopify_token_exchange_failed', 'Shopify could not complete the connection. Try again.', 502);
    const payload = await response.json().catch(() => null);
    return tokenCredential(payload, this.clock());
  }

  async exchangeSessionToken({ shopDomain, sessionToken, clientId, clientSecret }) {
    assert(this.fetchImpl, 'shopify_network_unavailable', 'Shopify connection is unavailable in this environment.', 503);
    assert(shopDomain && sessionToken && clientId && clientSecret, 'shopify_embedded_session_invalid', 'Your Shopify session could not be verified. Refresh the app and try again.', 401);
    const response = await this.fetchImpl(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      // Shopify-managed installation exchanges the short-lived App Bridge
      // session for an expiring offline credential. The subject token is used
      // only for this request and is never persisted or returned to the UI.
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token: sessionToken,
        subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
        requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token',
        expiring: '1'
      }).toString()
    }).catch(() => null);
    if (!response?.ok) throw new DashboardError('shopify_embedded_token_exchange_failed', 'Calinium could not establish a secure Shopify session. Refresh the app and try again.', 502);
    return tokenCredential(await response.json().catch(() => null), this.clock());
  }

  async refreshOfflineToken({ shopDomain, refreshToken, clientId, clientSecret }) {
    assert(this.fetchImpl, 'shopify_network_unavailable', 'Shopify connection is unavailable in this environment.', 503);
    assert(shopDomain && refreshToken && clientId && clientSecret, 'shopify_connection_invalid', 'This Shopify connection needs to be reconnected.', 409);
    const request = () => this.fetchImpl(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }).toString()
    });
    // Shopify explicitly makes a refresh-token retry safe after a transient
    // interrupted response. Keep it bounded: a definitive authorization
    // failure requires the merchant to reconnect rather than a retry loop.
    let response = await request().catch(() => null);
    if (!response || response.status === 429 || response.status >= 500) response = await request().catch(() => null);
    if (response?.status === 401) throw new DashboardError('shopify_connection_invalid', 'This Shopify connection needs to be reconnected.', 409);
    if (!response?.ok) throw new DashboardError('shopify_network_unavailable', 'Shopify could not refresh this connection. Try again shortly.', 503);
    return tokenCredential(await response.json().catch(() => null), this.clock());
  }

  async graphql({ shopDomain, accessToken, query, variables = {}, signal = null }) {
    assert(this.fetchImpl, 'shopify_network_unavailable', 'Shopify connection is unavailable in this environment.', 503);
    if (signal?.aborted) throw new DashboardError('shopify_network_unavailable', 'Shopify could not be reached. Try again shortly.', 503);
    const request = async () => this.fetchImpl(`https://${shopDomain}/admin/api/${this.apiVersion}/graphql.json`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', 'X-Shopify-Access-Token': accessToken },
      body: JSON.stringify({ query, variables }), signal: boundedRequestSignal(signal)
    });
    let response;
    try { response = await request(); } catch { throw new DashboardError('shopify_network_unavailable', 'Shopify could not be reached. Try again shortly.', 503); }
    if (response.status === 429) {
      const wait = Math.min(Number(response.headers.get('retry-after') || 0) * 1000, 1000);
      if (wait > 0) await abortableDelay(wait, signal);
      try { response = await request(); } catch { throw new DashboardError('shopify_network_unavailable', 'Shopify could not be reached. Try again shortly.', 503); }
    }
    if (response.status === 401) throw new DashboardError('shopify_connection_invalid', 'This Shopify connection needs to be reconnected.', 409);
    if (response.status === 403) throw new DashboardError('shopify_permissions_missing', 'Shopify has not granted the permission needed for that step.', 409);
    if (!response.ok) throw new DashboardError('shopify_api_unavailable', 'Shopify could not complete that request. Try again shortly.', 502);
    const payload = await response.json().catch(() => null);
    const errors = graphQLErrors(payload);
    if (errors.length) throw new DashboardError('shopify_graphql_error', 'Shopify could not complete that request. Review the connection permissions and try again.', 409, { error_count: errors.length });
    return payload?.data || {};
  }

  async inspectConnection({ shopDomain, accessToken }) {
    const data = await this.graphql({ shopDomain, accessToken, query: SHOP_QUERY });
    return {
      shop: data.shop ? { id: data.shop.id, name: data.shop.name, myshopify_domain: data.shop.myshopifyDomain || null, primary_domain: data.shop.primaryDomain?.host || null, storefront_url: data.shop.primaryDomain?.url || null } : null,
      scopes: (data.currentAppInstallation?.accessScopes || []).map((scope) => scope.handle).filter(Boolean)
    };
  }

  async createOneTimePurchase({ shopDomain, accessToken, name, amount, currency, returnUrl, test = false }) {
    const data = await this.graphql({
      shopDomain,
      accessToken,
      query: APP_PURCHASE_ONE_TIME_CREATE,
      variables: { name, price: { amount: String(amount), currencyCode: String(currency).toUpperCase() }, returnUrl, test: Boolean(test) }
    });
    const payload = data.appPurchaseOneTimeCreate;
    const userErrors = safeUserErrors(payload);
    if (userErrors.length) {
      throw new DashboardError(
        'shopify_billing_purchase_rejected',
        'Shopify could not prepare the secure approval step. Review the requirement below and try again.',
        409,
        { stage: 'payment_preparation', reasons: userErrors }
      );
    }
    if (!payload?.confirmationUrl || !payload?.appPurchaseOneTime) throw new DashboardError('shopify_billing_purchase_invalid', 'Shopify could not prepare the secure approval step. Try again.', 502);
    return { ...normalizeOneTimePurchase(payload.appPurchaseOneTime), confirmation_url: String(payload.confirmationUrl) };
  }

  async getOneTimePurchase({ shopDomain, accessToken, purchaseId }) {
    const data = await this.graphql({ shopDomain, accessToken, query: APP_PURCHASE_ONE_TIME_QUERY, variables: { id: purchaseId } });
    if (!data.node) throw new DashboardError('shopify_billing_purchase_missing', 'Shopify could not find this storefront purchase.', 409);
    return normalizeOneTimePurchase(data.node);
  }

  async listResourcePage({ shopDomain, accessToken, resourceType, after = null, first = 100, signal = null }) {
    const query = RESOURCE_QUERIES[resourceType];
    if (!query) throw new DashboardError('shopify_resource_type_invalid', 'That Shopify resource cannot be synchronized.', 422);
    const data = await this.graphql({ shopDomain, accessToken, query, variables: { first, after }, signal });
    const key = resourceType === 'collection' ? 'collections' : resourceType === 'file' ? 'files' : resourceType === 'market' ? 'markets' : resourceType === 'theme' ? 'themes' : resourceType === 'menu' ? 'menus' : 'products';
    const collection = data[key] || null;
    const explicitPageInfo = Boolean(collection?.pageInfo && typeof collection.pageInfo === 'object' && !Array.isArray(collection.pageInfo));
    return {
      nodes: collection?.nodes || [],
      page_info: explicitPageInfo ? collection.pageInfo : { hasNextPage: false, endCursor: null },
      page_info_explicit: explicitPageInfo
    };
  }

  async preparePreview({ shopDomain, accessToken, theme: approvedTheme = null }) {
    const page = await this.listResourcePage({ shopDomain, accessToken, resourceType: 'theme', first: 100 });
    const theme = page.nodes.find((candidate) => candidate.id === approvedTheme?.remote_gid && ['DEVELOPMENT', 'UNPUBLISHED'].includes(String(candidate.role || '').toUpperCase()));
    if (!theme) return { status: 'unavailable', warning: 'No existing unpublished Shopify preview target is available for this store.' };
    // A deterministic test adapter may provide a safe fixture preview URL.
    // The live Admin API does not expose one, so do not construct or claim a
    // preview URL before a later write-authorized preview workflow verifies it.
    if (!/^https:\/\//.test(String(theme.previewUrl || ''))) return { status: 'unavailable', remote_theme_gid: theme.id, theme_name: theme.name, theme_role: String(theme.role || '').toLowerCase(), warning: 'Shopify did not provide a preview URL for this read-only theme check.' };
    return { status: 'ready', remote_theme_gid: theme.id, theme_name: theme.name, theme_role: String(theme.role || '').toLowerCase(), preview_url: theme.previewUrl };
  }
}

module.exports = { ShopifyAdminApiAdapter, SHOP_QUERY, RESOURCE_QUERIES, APP_PURCHASE_ONE_TIME_CREATE, APP_PURCHASE_ONE_TIME_QUERY, graphQLErrors, safeUserErrors, tokenCredential, moneyToCents, normalizeOneTimePurchase, boundedRequestSignal };
