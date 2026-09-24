'use strict';

/**
 * Test-only Admin API substitute. Production services receive ShopifyAdminApiAdapter.
 * It intentionally returns only fixture data supplied to the constructor.
 */
class DeterministicShopifyAdapter {
  constructor({ token = 'deterministic-test-token', shop = { id: 'gid://shopify/Shop/1', name: 'Fixture Store', myshopify_domain: 'fixture.myshopify.com', primary_domain: 'fixture.myshopify.com', storefront_url: 'https://fixture.myshopify.com' }, scopes = [], resources = {}, preview = null, pages = {}, purchases = {} } = {}) {
    this.token = token; this.shop = shop; this.scopes = scopes; this.resources = resources; this.preview = preview; this.pages = pages; this.purchases = new Map(Object.entries(purchases)); this.calls = [];
  }
  async exchangeCode({ code }) {
    this.calls.push({ method: 'exchangeCode' });
    if (code !== 'valid-code') throw new Error('token exchange rejected');
    return { access_token: this.token, scopes: this.scopes };
  }
  async exchangeSessionToken({ sessionToken }) {
    this.calls.push({ method: 'exchangeSessionToken' });
    if (!sessionToken) throw new Error('session token exchange rejected');
    return { access_token: this.token, refresh_token: 'deterministic-refresh-token', expires_in: 3600, refresh_token_expires_in: 7776000, scopes: this.scopes };
  }
  async inspectConnection({ accessToken }) {
    this.calls.push({ method: 'inspectConnection' });
    if (accessToken !== this.token) { const error = new Error('token invalid'); error.code = 'shopify_connection_invalid'; throw error; }
    return { shop: this.shop, scopes: this.scopes };
  }
  async listResourcePage({ resourceType, after = null }) {
    this.calls.push({ method: 'listResourcePage', resourceType, after });
    const configured = this.pages[resourceType] || [this.resources[resourceType] || []];
    const index = after ? Number(after) : 0;
    const nodes = configured[index] || [];
    return { nodes, page_info: { hasNextPage: index + 1 < configured.length, endCursor: index + 1 < configured.length ? String(index + 1) : null } };
  }
  async preparePreview() {
    this.calls.push({ method: 'preparePreview' });
    return this.preview || { status: 'unavailable', warning: 'No fixture preview target is available.' };
  }
  async createOneTimePurchase({ name, amount, currency, returnUrl, test }) {
    this.calls.push({ method: 'createOneTimePurchase', name, amount, currency, returnUrl, test });
    const id = `gid://shopify/AppPurchaseOneTime/${this.purchases.size + 1}`;
    const purchase = { id, name, status: 'PENDING', test: Boolean(test), amount_cents: Math.round(Number(amount) * 100), currency, created_at: '2026-07-24T00:00:00.000Z', updated_at: '2026-07-24T00:00:00.000Z' };
    this.purchases.set(id, purchase);
    return { ...purchase, confirmation_url: `https://fixture.myshopify.com/admin/charges/${encodeURIComponent(id)}` };
  }
  async getOneTimePurchase({ purchaseId }) {
    this.calls.push({ method: 'getOneTimePurchase', purchaseId });
    const purchase = this.purchases.get(purchaseId);
    if (!purchase) { const error = new Error('purchase missing'); error.code = 'shopify_billing_purchase_missing'; throw error; }
    return { ...purchase };
  }
  setPurchaseStatus(id, status) {
    const purchase = this.purchases.get(id);
    if (!purchase) throw new Error('purchase missing');
    this.purchases.set(id, { ...purchase, status, updated_at: '2026-07-24T00:00:01.000Z' });
  }
}

module.exports = { DeterministicShopifyAdapter };
