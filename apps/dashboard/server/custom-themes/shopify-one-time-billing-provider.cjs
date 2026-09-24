'use strict';

const crypto = require('crypto');
const { PaymentProvider } = require('./payment-provider.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { environmentName, shopifyRuntimeConfiguration } = require('../shopify/runtime-configuration.cjs');

function centsToDecimal(amountCents) {
  assert(Number.isSafeInteger(amountCents) && amountCents > 0, 'custom_theme_price_invalid', 'Custom storefront pricing is not configured safely.', 503);
  return (amountCents / 100).toFixed(2);
}

function paymentStatus(providerStatus) {
  switch (String(providerStatus || '').toUpperCase()) {
    case 'ACTIVE': return 'paid';
    case 'PENDING': return 'pending';
    case 'DECLINED': return 'declined';
    case 'CANCELLED': return 'cancelled';
    case 'EXPIRED': return 'expired';
    default: return 'invalid';
  }
}

class ShopifyOneTimeBillingProvider extends PaymentProvider {
  constructor({ shopifyService, env = process.env } = {}) {
    super({ name: 'shopify_admin_graphql_one_time' });
    this.shopifyService = shopifyService;
    this.env = env;
  }
  checkoutRequired() { return true; }
  testMode() { return environmentName(this.env) !== 'production' && this.env.CALINIUM_SHOPIFY_BILLING_TEST_MODE !== 'false'; }
  isAvailable() {
    if (!this.shopifyService || typeof this.shopifyService.billingConnection !== 'function') return false;
    try {
      const config = shopifyRuntimeConfiguration(this.env, { requireCredentials: true });
      return Boolean(config.applicationUrl && config.clientId && config.clientSecret);
    } catch { return false; }
  }
  async connection(order) {
    if (!this.isAvailable()) throw new DashboardError('payment_provider_unavailable', 'Secure Shopify billing is not configured in this environment.', 503);
    return this.shopifyService.billingConnection({ projectId: order.project_id, organizationId: order.organization_id, expectedConnectionId: order.shopify_connection_id });
  }
  async createPurchase({ order, price, returnUrl }) {
    const connection = await this.connection(order);
    assert(typeof returnUrl === 'string' && /^https:\/\//.test(returnUrl), 'custom_theme_return_url_invalid', 'Calinium could not prepare the secure Shopify approval step.', 503);
    const result = await this.shopifyService.adapter.createOneTimePurchase({
      shopDomain: connection.shop_domain,
      accessToken: await this.shopifyService.connectionAccess(connection),
      name: price.display_name,
      amount: centsToDecimal(price.amount_cents),
      currency: price.currency,
      returnUrl,
      test: this.testMode()
    });
    assert(result?.id && result.confirmation_url, 'shopify_billing_purchase_invalid', 'Shopify could not prepare the secure approval step. Try again.', 502);
    return {
      provider: this.name,
      provider_purchase_id: result.id,
      provider_status: result.status || 'PENDING',
      amount_cents: price.amount_cents,
      currency: price.currency,
      test_mode: Boolean(result.test),
      confirmation_url: result.confirmation_url,
      confirmation_url_status: 'issued'
    };
  }
  async verifyPurchase({ order, purchase }) {
    const connection = await this.connection(order);
    const remote = await this.shopifyService.adapter.getOneTimePurchase({
      shopDomain: connection.shop_domain,
      accessToken: await this.shopifyService.connectionAccess(connection),
      purchaseId: purchase.provider_purchase_id
    });
    assert(remote?.id === purchase.provider_purchase_id, 'shopify_billing_purchase_mismatch', 'Shopify could not verify this storefront purchase.', 409);
    assert(remote.name === order.product_name, 'shopify_billing_purchase_mismatch', 'Shopify could not verify this storefront purchase.', 409);
    assert(remote.amount_cents === order.amount_cents, 'shopify_billing_amount_mismatch', 'Shopify could not verify the storefront purchase amount.', 409);
    assert(remote.currency === order.currency, 'shopify_billing_currency_mismatch', 'Shopify could not verify the storefront purchase currency.', 409);
    assert(Boolean(remote.test) === Boolean(purchase.test_mode), 'shopify_billing_purchase_mismatch', 'Shopify could not verify this storefront purchase.', 409);
    const status = paymentStatus(remote.status);
    return {
      provider: this.name,
      provider_purchase_id: remote.id,
      provider_event_id: `shopify-one-time-${crypto.createHash('sha256').update(`${remote.id}:${remote.status}:${remote.updated_at || remote.created_at || ''}`).digest('hex')}`,
      provider_status: String(remote.status || '').toUpperCase(),
      payment_status: status,
      amount_cents: remote.amount_cents,
      currency: remote.currency,
      test_mode: Boolean(remote.test),
      raw_event_digest: crypto.createHash('sha256').update(JSON.stringify({ id: remote.id, status: remote.status, amount_cents: remote.amount_cents, currency: remote.currency, test: Boolean(remote.test) })).digest('hex')
    };
  }
}

module.exports = { ShopifyOneTimeBillingProvider, centsToDecimal, paymentStatus };
